"""Fetch one pinned SimReady package and inspect a metric composed USD stage.

Requires usd-core. Vendor files stay under assets/local-source/ (ignored by Git).
No native physics or robotics qualification is implied by this inspection.
"""
import concurrent.futures
import hashlib
import json
import subprocess
from pathlib import Path, PurePosixPath
import urllib.request

from pxr import Gf, Sdf, Usd, UsdGeom, UsdPhysics, UsdUtils

ROOT = Path(__file__).resolve().parents[1]
REVISION = "dde58cf7c1d74896c2116a6c14a3a851bc5b58a7"
BASE = f"https://huggingface.co/datasets/nvidia/simready-assets/resolve/{REVISION}/crate_black_a02/"
DESTINATION = ROOT / "assets/local-source/simready-crate"
ROOT_USD = "simready_usd/sm_crate_black_a02_01.usd"


def download(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def acquire(item):
    relative = PurePosixPath(item["relative_path"])
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("Unsafe package path")
    target = DESTINATION.joinpath(*relative.parts)
    target.parent.mkdir(parents=True, exist_ok=True)
    expected = item["hash"]["sha256"]
    data = target.read_bytes() if target.exists() else download(BASE + str(relative))
    if len(data) != item["size"] or hashlib.sha256(data).hexdigest() != expected:
        raise ValueError(f"Vendor hash or size mismatch for {relative}")
    target.write_bytes(data)
    return {"path": str(relative), "sha256": expected, "bytes": len(data)}


def export_browser(source, units, axis):
    vertices, faces = [], []
    transform = UsdGeom.XformCache()
    for prim in Usd.PrimRange(source.GetPseudoRoot(), Usd.TraverseInstanceProxies()):
        if not prim.IsA(UsdGeom.Mesh):
            continue
        mesh = UsdGeom.Mesh(prim)
        offset = len(vertices)
        matrix = transform.GetLocalToWorldTransform(prim)
        for point in mesh.GetPointsAttr().Get():
            x, y, z = matrix.Transform(Gf.Vec3d(point)) * units
            vertices.append([x, z, -y] if axis == UsdGeom.Tokens.z else [x, y, z])
        indices = list(mesh.GetFaceVertexIndicesAttr().Get())
        cursor = 0
        for count in mesh.GetFaceVertexCountsAttr().Get():
            faces.append([offset + index for index in indices[cursor:cursor + count]])
            cursor += count
    intermediate = DESTINATION / "browser-input.json"
    intermediate.write_text(json.dumps({"vertices": vertices, "faces": faces}))
    output = ROOT / "public/models/simready-crate.json"
    candidate = DESTINATION / "browser-output.json"
    candidate.unlink(missing_ok=True)
    subprocess.run(["blender", "--background", "--python-exit-code", "1", "--python", str(ROOT / "scripts/convert-native-mesh.py"),
                    "--", str(intermediate), str(DESTINATION / "browser-output.json")], check=True, stdout=subprocess.DEVNULL)
    candidate = DESTINATION / "browser-output.json"
    data = json.loads(candidate.read_text())
    axes = [data["positions"][axis::3] for axis in range(3)]
    bounds = {"min": [min(values) for values in axes], "max": [max(values) for values in axes]}
    source_bounds = {"min": [min(point[axis] for point in vertices) for axis in range(3)],
                     "max": [max(point[axis] for point in vertices) for axis in range(3)]}
    error = max(abs(bounds[key][axis] - source_bounds[key][axis])
                for key in ("min", "max") for axis in range(3))
    if error > .002:
        raise ValueError("Simplification exceeded the 2 mm display-envelope error limit")
    output.write_bytes(candidate.read_bytes())
    manifest_path = ROOT / "data/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["browser"].update(
        sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
        bytes=output.stat().st_size, vertices=len(data["positions"]) // 3,
        triangles=len(data["indices"]) // 3, bounds=bounds, conversionReproducible=True,
        changes=["native world transform", "Z-up to Y-up basis rotation",
                 "Blender decimation ratio 0.5", "triangulation", "replacement display material"],
        dimensionEvidence="Vendor-authored native geometry in metres; physical measurements pending",
        converter="scripts/native_asset.py + scripts/convert-native-mesh.py",
        sourceEnvelopeErrorMetres=error)
    manifest["nativeValidation"] = {
        "status": "cpu-composition-checked",
        "report": "data/native-asset-report.json",
        "pending": ["NVIDIA schema/profile checks", "contact simulation", "physical validation"]}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    return {"bounds": bounds, "sourceEnvelopeErrorMetres": error,
            "sha256": manifest["browser"]["sha256"], "blenderDecimationRatio": .5, "blenderVersion": data["conversion"]["blenderVersion"]}


def inspect():
    bom = json.loads(download(BASE + ".metadata/com.nvidia.simready.packaging.bom.json"))
    items = [item for item in bom["items"] if "/.thumbs/" not in item["relative_path"]]
    if sum(item["size"] for item in items) > 100_000_000:
        raise ValueError("Selected package exceeds the 100 MB acquisition limit")
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        files = list(executor.map(acquire, items))
    source_path = DESTINATION / ROOT_USD
    source = Usd.Stage.Open(str(source_path))
    if not source or not source.GetDefaultPrim():
        raise ValueError("Source has no valid default prim")
    authored_units = source.HasAuthoredMetadata("metersPerUnit")
    authored_axis = source.HasAuthoredMetadata("upAxis")
    units = UsdGeom.GetStageMetersPerUnit(source)
    axis = UsdGeom.GetStageUpAxis(source)
    if not authored_units or not authored_axis:
        raise ValueError("Source metrics must be authored before this layout can be checked")
    stage_path = DESTINATION / "station.usda"
    if stage_path.exists():
        stage_path.unlink()
    stage = Usd.Stage.CreateNew(str(stage_path))
    UsdGeom.SetStageMetersPerUnit(stage, 1)
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.z)
    station = UsdGeom.Xform.Define(stage, "/Station")
    stage.SetDefaultPrim(station.GetPrim())
    placed = UsdGeom.Xform.Define(stage, "/Station/SupplyBin")
    placed.AddTranslateOp().Set(Gf.Vec3d(-2.93, 1.12, 0))
    if axis == UsdGeom.Tokens.y:
        placed.AddRotateXOp().Set(90)
    elif axis != UsdGeom.Tokens.z:
        raise ValueError(f"Unsupported source axis {axis}")
    placed.AddScaleOp().Set(Gf.Vec3f(units))
    vendor = stage.DefinePrim("/Station/SupplyBin/Vendor")
    vendor.GetReferences().AddReference("./" + ROOT_USD)
    if not stage.GetPrimAtPath("/Station/SupplyBin/Vendor").IsValid():
        raise ValueError("Reference composition failed")
    prims = list(Usd.PrimRange(stage.GetPseudoRoot(), Usd.TraverseInstanceProxies()))
    geometries = [prim for prim in prims if prim.IsA(UsdGeom.Mesh)]
    if not geometries:
        raise ValueError("Composed package has no mesh")
    cache = UsdGeom.BBoxCache(Usd.TimeCode.Default(), ["default", "render", "proxy"], useExtentsHint=False)
    bounds = cache.ComputeWorldBound(placed.GetPrim()).ComputeAlignedRange()
    if bounds.IsEmpty():
        raise ValueError("Composed world bounds are empty")
    lo, hi = list(bounds.GetMin()), list(bounds.GetMax())
    # Same assumed gate-access envelope as the browser, transformed to Z-up.
    access_min, access_max = [-.85, -3.05, 0], [.85, -1.65, 1.7]
    def gap(low, high):
        deltas = [max(0, access_min[i] - high[i], low[i] - access_max[i]) for i in range(3)]
        return sum(value * value for value in deltas) ** .5
    rear_gap = gap(lo, hi)
    placed.GetOrderedXformOps()[0].Set(Gf.Vec3d(0, -2.14, 0))
    cache.Clear()
    blocked = cache.ComputeWorldBound(placed.GetPrim()).ComputeAlignedRange()
    blocked_gap = gap(list(blocked.GetMin()), list(blocked.GetMax()))
    if rear_gap <= .1 or blocked_gap != 0:
        raise ValueError("Native layout positive/obstruction controls failed")
    placed.GetOrderedXformOps()[0].Set(Gf.Vec3d(-2.93, 1.12, 0))
    vendor.CreateAttribute("project:role", Sdf.ValueTypeNames.Token).Set("replenishment_bin")
    for prim in prims:
        if prim.HasAPI(UsdPhysics.RigidBodyAPI) and not prim.IsInstanceProxy():
            UsdPhysics.RigidBodyAPI(prim).CreateRigidBodyEnabledAttr(False)
    stage.GetRootLayer().Save()
    used = [layer.identifier for layer in stage.GetUsedLayers()]
    if len(used) < 2:
        raise ValueError("Vendor layers were not composed")
    dependency_layers, dependency_assets, unresolved = UsdUtils.ComputeAllDependencies(Sdf.AssetPath(str(stage_path)))
    if unresolved:
        raise ValueError("Unresolved native dependencies: " + str(unresolved))
    browser_export = export_browser(source, units, axis)
    report = {
        "sourceRevision": REVISION,
        "unresolvedDependencies": list(unresolved),
        "resolvedLayerCount": len(dependency_layers),
        "resolvedAssetCount": len(dependency_assets),
        "browserExport": browser_export,
        "rootUsd": ROOT_USD,
        "usdVersion": list(Usd.GetVersion()),
        "sourceMetrics": {"metersPerUnit": units, "upAxis": str(axis), "authored": True},
        "stationMetrics": {"metersPerUnit": 1, "upAxis": "Z"},
        "meshCount": len(geometries),
        "layerCount": len(used),
        "schemas": sorted({schema for prim in prims for schema in prim.GetAppliedSchemas()}),
        "collisionPrims": sum(prim.HasAPI(UsdPhysics.CollisionAPI) for prim in prims),
        "rigidBodyPrims": sum(prim.HasAPI(UsdPhysics.RigidBodyAPI) for prim in prims),
        "rearWorldBoundsMetres": {"min": lo, "max": hi},
        "rearAccessGapMetres": rear_gap,
        "obstructionGapMetres": blocked_gap,
        "files": files,
        "scope": "Pinned package integrity, native root-reference composition, authored metrics and static bounding-box controls.",
        "pending": ["NVIDIA schema/profile validation", "renderer/material runtime", "contact physics", "physical dimensions", "robot and tool clearances"],
    }
    (ROOT / "data/native-asset-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in ["usdVersion", "meshCount", "layerCount", "rearAccessGapMetres", "obstructionGapMetres"]}))


if __name__ == "__main__":
    inspect()
