"""Render one tile per material slot (slot highlighted, rest grey) so each slot can be identified.

Run: blender -b --python slots.py -- <raw dir> <out dir> [name filter]
Writes <out>/<char>/<idx>_{f,b}.jpg plus <out>/<char>/slots.json (faces per slot).
"""
import bpy
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_rivals as L  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
raw, out = argv[0], argv[1]
flt = argv[2] if len(argv) > 2 else ""


def flat(mat, color, emit):
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = 0.85
    b.inputs["Emission Color"].default_value = (*color, 1)
    b.inputs["Emission Strength"].default_value = emit
    nt.links.new(b.outputs["BSDF"], o.inputs["Surface"])
    try:
        mat.surface_render_method = "DITHERED"
    except Exception:  # noqa: BLE001
        pass
    mat.use_backface_culling = False


for char in sorted(os.listdir(raw)):
    if flt and flt not in char:
        continue
    src_dir = os.path.join(raw, char, "source", "_x")
    fbxs = [f for f in os.listdir(src_dir) if f.lower().endswith(".fbx")]
    if not fbxs:
        continue
    L.reset()
    L.import_fbx(os.path.join(src_dir, fbxs[0]))
    meshes = L.mesh_objects()
    lo, hi = L.world_bounds(meshes)
    od = os.path.join(out, char)
    os.makedirs(od, exist_ok=True)
    scn = bpy.context.scene

    info = {}
    mats = []
    for ob in meshes:
        counts = {}
        for p in ob.data.polygons:
            counts[p.material_index] = counts.get(p.material_index, 0) + 1
        for i, slot in enumerate(ob.material_slots):
            if slot.material is None or slot.material in mats:
                continue
            mats.append(slot.material)
            info[slot.material.name] = {"faces": counts.get(i, 0), "object": ob.name}

    cams = {}
    for view in ("front", "back"):
        for ob in list(bpy.data.objects):
            if ob.type == "LIGHT":
                bpy.data.objects.remove(ob, do_unlink=True)
        cams[view] = L.studio(lo, hi, res=(300, 430), view=view, samples=6)
    scn.render.film_transparent = False
    scn.render.image_settings.file_format = "JPEG"
    scn.render.image_settings.color_mode = "RGB"
    scn.render.image_settings.quality = 85
    bg = scn.world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.02, 0.02, 0.025, 1)
    bg.inputs[1].default_value = 1.0

    for m in mats:
        flat(m, (0.16, 0.17, 0.19), 0.0)
    for i, m in enumerate(mats):
        flat(m, (1.0, 0.62, 0.0), 1.2)
        for view, tag in (("front", "f"), ("back", "b")):
            scn.camera = cams[view]
            scn.render.filepath = os.path.join(od, f"{i:02d}_{tag}.jpg")
            bpy.ops.render.render(write_still=True)
        flat(m, (0.16, 0.17, 0.19), 0.0)
        info[m.name]["index"] = i
    with open(os.path.join(od, "slots.json"), "w") as fh:
        json.dump(info, fh, indent=1)
    print("DONE", char, len(mats))
