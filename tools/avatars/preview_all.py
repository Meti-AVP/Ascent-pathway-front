"""Render a front + back preview of every character, untouched, and dump structure.

Run:  blender -b --python preview_all.py -- <raw dir> <out dir> [name filter]
"""
import bpy
import json
import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_rivals as L  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
raw_dir, out_dir = argv[0], argv[1]
flt = argv[2] if len(argv) > 2 else ""
os.makedirs(out_dir, exist_ok=True)

for name in sorted(os.listdir(raw_dir)):
    if flt and flt not in name:
        continue
    src = os.path.join(raw_dir, name, "source", "_x")
    if not os.path.isdir(src):
        continue
    fbx = [f for f in os.listdir(src) if f.lower().endswith(".fbx")]
    if not fbx:
        print("NO FBX in", name)
        continue
    try:
        L.reset()
        L.import_fbx(os.path.join(src, fbx[0]))
        report = L.rebuild_materials(src)
        meshes = L.mesh_objects()
        lo, hi = L.world_bounds(meshes)
        info = {
            "name": name, "fbx": fbx[0],
            "bounds": [[round(v, 3) for v in lo], [round(v, 3) for v in hi]],
            "meshes": [{"name": m.name, "verts": len(m.data.vertices), "polys": len(m.data.polygons),
                        "slots": [s.material.name if s.material else None for s in m.material_slots],
                        "shape_keys": len(m.data.shape_keys.key_blocks) if m.data.shape_keys else 0}
                       for m in meshes],
            "armature_bones": [len(o.data.bones) for o in bpy.data.objects if o.type == "ARMATURE"],
            "materials": report,
            "actions": [a.name for a in bpy.data.actions],
        }
        with open(os.path.join(out_dir, name + ".json"), "w", encoding="utf-8") as fh:
            json.dump(info, fh, indent=1)
        for view in ("front", "back"):
            for ob in list(bpy.data.objects):
                if ob.type in ("CAMERA", "LIGHT"):
                    bpy.data.objects.remove(ob, do_unlink=True)
            L.studio(lo, hi, res=(700, 1000), view=view, samples=24)
            bpy.context.scene.render.filepath = os.path.join(out_dir, f"{name}_{view}.png")
            bpy.ops.render.render(write_still=True)
        print("DONE", name)
    except Exception:  # noqa: BLE001
        print("FAILED", name)
        traceback.print_exc()
