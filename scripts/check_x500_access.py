"""Sample straight-line access in nominal X500 reference geometry."""
import hashlib
import json
from pathlib import Path
import sys

import FreeCAD as app
import Import
import Part

step, reference = map(Path, sys.argv[1:])
geometry = json.loads(reference.read_text())
if hashlib.sha256(step.read_bytes()).hexdigest() != geometry["source_sha256"]:
    raise ValueError("STEP differs from the source used for the joint map")

doc = app.newDocument()
Import.insert(str(step), doc.Name)
root, = [obj for obj in doc.RootObjects if obj.TypeId == "App::Part"]
arms = [obj for obj in root.Group if obj.Label.startswith("HMX5V-ARM-V1_ASM")]


def world_shape(obj):
    shape = obj.Shape.copy()
    shape.Placement = obj.getGlobalPlacement().multiply(obj.Placement.inverse()).multiply(shape.Placement)
    return shape


def structural_arm_members(arm):
    for obj in arm.Group:
        if obj.TypeId != "Part::Feature":
            continue
        shape = world_shape(obj)
        is_frame_nut = obj.Label.startswith("ZSLM-M3-FALAN")
        is_frame_screw = obj.Label.startswith("GB70-M3-") and 40 < shape.BoundBox.YLength < 42
        if not (is_frame_nut or is_frame_screw):
            yield obj.Name, obj.Label, shape


def hits(probe, targets):
    bounds = probe.BoundBox
    return [
        {"feature": name, "label": label, "overlap_mm3": round(volume, 6)}
        for name, label, target in targets
        if bounds.intersect(target.BoundBox)
        and (volume := probe.common(target).Volume) > 0.00001
    ]


top, = [obj for obj in root.Group if obj.Label == "TOP-PLATE-X500-V5"]
plate = world_shape(top)
structure = [member for arm in arms for member in structural_arm_members(arm)]
# Only upper plate versus prepositioned reference arm geometry. The
# downloaded CAD does not describe the actual cable installation envelope.
closure = []
for offset in [50, 25, 10, 5, 2, 1, 0]:
    moving_plate = plate.copy()
    moving_plate.translate(app.Vector(0, offset, 0))
    closure.append({"offset_above_final_mm": offset, "hits": hits(moving_plate, structure)})

approaches = []
obstacles = structure + [(top.Name, top.Label, plate)]
for joint in geometry["joints"]:
    x, z = joint["axis_xz_mm"]
    radius = 5
    start = joint["screw_y_range_mm"][1] + 0.001
    probe = Part.makeCylinder(radius, 50, app.Vector(x, start, z), app.Vector(0, 1, 0))
    approaches.append({"joint": joint["id"], "hits": hits(probe, obstacles)})

print(json.dumps({
    "source_sha256": geometry["source_sha256"],
    "plate_closure_samples": closure,
    "approach_probe_radius_mm": 5,
    "approach_probe_length_mm": 50,
    "approach_samples": approaches,
    "notes": "Nominal STEP. Upper plate and arm solids only. Main frame screws and nuts excluded as obstacles. Discrete not swept closure. Probe is a hypothetical cylinder above the screw envelope, without tool, robot, bit engagement, wiring, clamps, nearby equipment or operator.",
}, indent=2))
