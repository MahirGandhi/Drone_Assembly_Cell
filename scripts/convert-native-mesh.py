"""Run with Blender --background --python this_file -- INPUT OUTPUT."""
import json
from pathlib import Path
import sys
import bpy

source_path, output_path = sys.argv[sys.argv.index("--") + 1:]
source = json.loads(Path(source_path).read_text())
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
mesh = bpy.data.meshes.new("native-crate")
mesh.from_pydata(source["vertices"], [], source["faces"])
mesh.update()
obj = bpy.data.objects.new("native-crate", mesh)
bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
modifier = obj.modifiers.new("Browser simplification", "DECIMATE")
modifier.ratio = .5
bpy.ops.object.modifier_apply(modifier=modifier.name)
obj.data.calc_loop_triangles()
result = {
    "positions": [float(value) for vertex in obj.data.vertices for value in vertex.co],
    "indices": [int(index) for triangle in obj.data.loop_triangles for index in triangle.vertices],
    "conversion": {"blenderVersion": bpy.app.version_string, "decimationRatio": .5},
}
Path(output_path).write_text(json.dumps(result, separators=(",", ":")) + "\n")
