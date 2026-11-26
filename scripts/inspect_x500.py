"""Inspect the manufacturer STEP in headless FreeCAD.

Run with FreeCAD's Python environment, passing the path to the STEP.
Outputs nominal reference dimensions only, without exporting source geometry.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

import FreeCAD
import Import


def world_bounds(obj):
    shape = obj.Shape.copy()
    parent_placement = obj.getGlobalPlacement().multiply(obj.Placement.inverse())
    shape.Placement = parent_placement.multiply(shape.Placement)
    return shape.BoundBox


def rounded(values):
    return [round(value, 3) for value in values]


step = Path(sys.argv[1])
doc = FreeCAD.newDocument()
Import.insert(str(step), doc.Name)
features = [obj for obj in doc.Objects if obj.TypeId == "Part::Feature"]
arms = [obj for obj in doc.Objects if obj.TypeId == "App::Part"
        and obj.Label.startswith("HMX5V-ARM-V1_ASM")]
assert len(arms) == 4
plates = {}
for position in ("BOTTOM", "TOP"):
    plate, = [obj for obj in features if obj.Label == f"{position}-PLATE-X500-V5"]
    bounds = world_bounds(plate)
    plates[position.lower()] = {
        "size_xyz_mm": rounded((bounds.XLength, bounds.YLength, bounds.ZLength)),
        "y_range_mm": rounded((bounds.YMin, bounds.YMax)),
    }

rows = []
for arm in arms:
    parts = [(obj, world_bounds(obj)) for obj in arm.Group if obj.TypeId == "Part::Feature"]
    nuts = [bounds for obj, bounds in parts if obj.Label.startswith("ZSLM-M3-FALAN")]
    # FreeCAD renames repeated screw instances. Identify by the M3 label,
    # the length of this screw family and its coaxial mate.
    screws = [bounds for obj, bounds in parts
              if obj.Label.startswith("GB70-M3-") and 40 < bounds.YLength < 42]
    assert len(nuts) == len(screws) == 4
    arm_rows = []
    for nut in nuts:
        screw, = [candidate for candidate in screws
                  if math.hypot(candidate.Center.x - nut.Center.x,
                                candidate.Center.z - nut.Center.z) < 0.01]
        assert screw.YMax > plates["top"]["y_range_mm"][1]
        assert nut.Center.y < plates["bottom"]["y_range_mm"][0]
        arm_rows.append({
            "axis_xz_mm": rounded((nut.Center.x, nut.Center.z)),
            "nut_y_range_mm": rounded((nut.YMin, nut.YMax)),
            "screw_y_range_mm": rounded((screw.YMin, screw.YMax)),
        })
    rows.extend(arm_rows)

rows.sort(key=lambda row: tuple(row["axis_xz_mm"]))
assert len({tuple(row["axis_xz_mm"]) for row in rows}) == 16
for index, row in enumerate(rows, 1):
    row["id"] = f"J{index:02}"

print(json.dumps({
    "source_sha256": hashlib.sha256(step.read_bytes()).hexdigest(),
    "source_bytes": step.stat().st_size,
    "freecad_version": ".".join(FreeCAD.Version()[:3]),
    "part_features": len(features),
    "arm_assemblies": len(arms),
    "plates": plates,
    "joints": rows,
}, indent=2))
