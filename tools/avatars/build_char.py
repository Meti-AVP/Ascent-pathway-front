"""Turn one source model into an ASCENT avatar: edit, re-texture, animate, export.

Run: blender -b --python build_char.py -- <raw dir> <cast key> <work dir> [--glb <out.glb>] [--still] [--strip]

    --still   render front / three-quarter stills of the idle pose into <work>/still/
    --strip   render a filmstrip of every baked clip into <work>/strip/
    --glb     export a web-ready GLB (WebP textures, clips as separate animations)
"""
import bpy
import bmesh
import json
import numpy as np
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_rivals as L  # noqa: E402
import retarget as R  # noqa: E402
import tex as T  # noqa: E402
from chars import CAST  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
raw, key, work = argv[0], argv[1], argv[2]
flags = argv[3:]
glb_out = flags[flags.index("--glb") + 1] if "--glb" in flags else None
cfg = dict(CAST[key])
if "--anims" in flags:  # explore: --anims Lobby_Half_Idle,HoverIdle  (clip name = action name)
    cfg["anims"] = [(n.lower(), n, {"step": 3}) for n in flags[flags.index("--anims") + 1].split(",")]
if "--lite" in flags:  # supporting cast: smaller textures, idle only
    cfg.update(d_size=1024, n_size=512, webp_q=88)
    cfg["anims"] = [a for a in cfg.get("anims", []) if a[0] == "idle"]
RAW = "--raw" in flags
if RAW:
    for k in ("delete", "recolor", "fabric", "delete_islands", "soften"):
        cfg.pop(k, None)
    key = key + "_raw"
FOX = "white-fox-yoon-ji-woo-the-leader"

tex_dir = os.path.join(work, "tex", key)
os.makedirs(tex_dir, exist_ok=True)

# ---------------------------------------------------------------- import
L.reset()
src_dir = os.path.join(raw, cfg["src"], "source", "_x")
fbx = [f for f in os.listdir(src_dir) if f.lower().endswith(".fbx")][0]
L.import_fbx(os.path.join(src_dir, fbx))
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
meshes = L.mesh_objects()
for a in list(bpy.data.actions):  # the target's own takes are not used
    bpy.data.actions.remove(a)
tex_index = L.index_textures(src_dir)
report = {"key": key, "src": cfg["src"], "materials": {}, "deleted": [], "anims": {}}


def tex_for(part):
    mapped = cfg.get("tex_map", {}).get(part)
    if mapped:
        return mapped, tex_index.get(mapped, {})
    found = L.find_tex(tex_index, part)
    for k, v in tex_index.items():
        if v is found:
            return k, found
    return part, found


# ---------------------------------------------------------------- remove parts
def delete_slots(parts):
    removed = 0
    for ob in meshes:
        idx = {i for i, s in enumerate(ob.material_slots) if s.material and L.part_of(s.material.name) in parts}
        if not idx:
            continue
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        faces = [f for f in bm.faces if f.material_index in idx]
        removed += len(faces)
        bmesh.ops.delete(bm, geom=faces, context="FACES")
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.update()
    return removed


def delete_islands(rule):
    """Remove loose pieces of one slot (chains, brooches, pendants) picked by size and position.

    rule: part, max_faces, and optional x / y / z (lo, hi) ranges for the island's centre, in metres.
    """
    removed = 0
    for ob in meshes:
        idx = {i for i, s in enumerate(ob.material_slots) if s.material and L.part_of(s.material.name) == rule["part"]}
        if not idx:
            continue
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bm.faces.ensure_lookup_table()
        seen, kill = set(), []
        for f in bm.faces:
            if f.index in seen or f.material_index not in idx:
                continue
            stack, faces = [f], []
            seen.add(f.index)
            while stack:
                cur = stack.pop()
                faces.append(cur)
                for e in cur.edges:
                    for nb in e.link_faces:
                        if nb.index not in seen and nb.material_index in idx:
                            seen.add(nb.index)
                            stack.append(nb)
            if len(faces) > rule.get("max_faces", 300):
                continue
            cos = [ob.matrix_world @ v.co for fc in faces for v in fc.verts]
            c = [(min(p[a] for p in cos) + max(p[a] for p in cos)) / 2 for a in range(3)]
            ok = all(rule[k][0] <= c[a] <= rule[k][1] for a, k in enumerate("xyz") if k in rule)
            if ok:
                kill.extend(faces)
        removed += len(kill)
        bmesh.ops.delete(bm, geom=kill, context="FACES")
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.update()
    return removed


def soften(rule):
    """Pull the vertices that follow some bones toward a pivot bone — a small sculpt, done on the rest mesh.

    rule: groups (regex over vertex-group names), pivot (bone name), amount 0..1
    """
    import re as _re
    rx = _re.compile(rule["groups"])
    moved = 0
    for ob in meshes:
        gids = {g.index for g in ob.vertex_groups if rx.search(g.name)}
        bone = arm.data.bones.get(rule["pivot"])
        if not gids or bone is None:
            continue
        pivot = ob.matrix_world.inverted() @ (arm.matrix_world @ bone.head_local)
        for v in ob.data.vertices:
            w = sum(g.weight for g in v.groups if g.group in gids)
            if w > 0.001:
                v.co = v.co.lerp(pivot, min(w, 1.0) * rule["amount"])
                moved += 1
        ob.data.update()
    return moved


for rule in cfg.get("delete_islands", []):
    print("ISLANDS REMOVED", rule["part"], delete_islands(rule), "faces")
for rule in cfg.get("soften", []):
    print("SOFTENED", rule["pivot"], soften(rule), "verts")

doomed = set(cfg.get("delete", []))
for mat in bpy.data.materials:
    if not mat.name.startswith("MI_"):
        continue
    part = L.part_of(mat.name)
    _, tex = tex_for(part)
    if not tex and part not in cfg.get("flat", {}) and part not in cfg.get("glass", []):
        doomed.add(part)  # FX shells and rim meshes that ship without textures
if doomed:
    n = delete_slots(doomed)
    report["deleted"] = sorted(doomed)
    print("DELETED", sorted(doomed), n, "faces")

# ---------------------------------------------------------------- textures + materials
cache = {}


def processed(tpart, kind, tex, variant=""):
    """Write the processed PNG for one texture and return the Blender image (cached)."""
    ck = (tpart, kind, variant)
    if ck in cache:
        return cache[ck]
    path = os.path.join(tex_dir, f"{key}_{tpart}_{kind}{variant}.png")
    fabric = cfg.get("fabric", {}).get(tpart)
    if kind == "D":
        a = T.load(tex["D"], cfg.get("d_size", 2048))
        if fabric:
            a = T.to_fabric(a, fabric.get("target", 0.16), fabric.get("contrast", 0.5), fabric.get("tint", (1, 1, 1)))
        rules = cfg.get("recolor", {}).get(tpart)
        if rules:
            a = T.recolor(a, rules)
        a[..., 3] = 1.0
        im = T.save(a, path)
    elif kind == "HAIR":
        a = T.load(tex["D"], 1024)
        hair = cfg.get("hair", {})
        tint = np.array(hair.get("tint", (1, 1, 1)), dtype=np.float32) * hair.get("gain", 1.0)
        rgb = a[..., :3] * tint
        if "AO" in tex and hair.get("ao", 0) > 0:
            ao = T.resize(T.load(tex["AO"], 1024), a.shape[0])[..., 0:1]
            rgb = rgb * (1.0 - hair["ao"] + hair["ao"] * ao)
        a[..., :3] = np.clip(rgb, 0, 1)
        a[..., 3] = T.resize(T.load(tex["M"], 1024), a.shape[0])[..., 0] if "M" in tex else 1.0
        im = T.save(a, path)
    elif kind == "GLASS":
        m = T.load(tex["M"], 512)
        a = np.ones_like(m)
        a[..., 3] = np.clip(m[..., 0] * 0.9, 0, 1)
        im = T.save(a, path)
    elif kind == "N":
        a = T.flip_green(T.load(tex["N"], cfg.get("n_size", 1024)))
        if fabric:
            a = T.flatten_normal(a, fabric.get("n_flat", 0.75))
        im = T.save(a, path, non_color=True)
    elif kind == "ORM":
        a = T.load(tex["ORM"], 1024)
        if fabric:
            a = T.set_rough(a, fabric.get("rough", 0.82))
        a[..., 3] = 1.0
        im = T.save(a, path, non_color=True)
    elif kind == "E":
        a = T.load(tex["E"], 1024)
        a[..., 3] = 1.0
        im = T.save(a, path)
    cache[ck] = im
    return im


def build(mat):
    part = L.part_of(mat.name)
    tpart, tex = tex_for(part)
    is_hair = part.startswith("hair") or "brow" in part or "lash" in part
    is_glass = part in cfg.get("glass", [])
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    kinds = []

    def image_node(im):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = im
        return n

    if is_glass:
        n = image_node(processed(tpart, "GLASS", tex))
        nt.links.new(n.outputs["Color"], bsdf.inputs["Base Color"])
        nt.links.new(n.outputs["Alpha"], bsdf.inputs["Alpha"])
        bsdf.inputs["Roughness"].default_value = 0.08
        bsdf.inputs["Emission Color"].default_value = (1, 1, 1, 1)
        bsdf.inputs["Emission Strength"].default_value = 0.6
        mat.surface_render_method = "BLENDED"
        mat.use_backface_culling = False
        mat.name = f"{key}_{part}__glass"
        report["materials"][mat.name] = ["GLASS"]
        return

    if "D" in tex:
        n = image_node(processed(tpart, "HAIR" if is_hair else "D", tex))
        nt.links.new(n.outputs["Color"], bsdf.inputs["Base Color"])
        kinds.append("D")
        if is_hair:
            nt.links.new(n.outputs["Alpha"], bsdf.inputs["Alpha"])
            mat.surface_render_method = "DITHERED"
            mat.use_backface_culling = False
    else:
        flat = cfg.get("flat", {}).get(part, (0.5, 0.5, 0.5))
        bsdf.inputs["Base Color"].default_value = (*flat, 1)

    if "ORM" in tex and not is_hair:
        n = image_node(processed(tpart, "ORM", tex))
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(n.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
        nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
        kinds.append("ORM")
    else:
        bsdf.inputs["Roughness"].default_value = 0.62 if is_hair else (0.12 if part.startswith("eye") else 0.6)

    if "N" in tex:
        n = image_node(processed(tpart, "N", tex))
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(n.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
        kinds.append("N")

    if "E" in tex and part not in cfg.get("no_emissive", []):
        n = image_node(processed(tpart, "E", tex))
        nt.links.new(n.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 1.0
        kinds.append("E")

    is_skin = part in ("head", "body") and tpart not in cfg.get("fabric", {})
    suffix = "__hair" if is_hair else ("__eye" if part.startswith("eye") else ("__skin" if is_skin else ""))
    mat.name = f"{key}_{part}{suffix}"
    report["materials"][mat.name] = kinds


for mat in list(bpy.data.materials):
    if mat.name.startswith("MI_") and L.part_of(mat.name) not in doomed:
        build(mat)

# drop slots that no longer have faces
for ob in meshes:
    used = {p.material_index for p in ob.data.polygons}
    bpy.context.view_layer.objects.active = ob
    for i in reversed(range(len(ob.material_slots))):
        if i not in used:
            ob.active_material_index = i
            bpy.ops.object.material_slot_remove()

# ---------------------------------------------------------------- animation
scn = bpy.context.scene
scn.render.fps = 30
before = set(bpy.data.objects)
fox_dir = os.path.join(raw, FOX, "source", "_x")
L.import_fbx(os.path.join(fox_dir, [f for f in os.listdir(fox_dir) if f.lower().endswith(".fbx")][0]))
fox_objs = [o for o in bpy.data.objects if o not in before]
fox = next(o for o in fox_objs if o.type == "ARMATURE")
for o in fox_objs:
    if o.type == "MESH":
        o.hide_viewport = True
        o.hide_render = True
for m in meshes:
    m.hide_viewport = True

baked = []
for clip, action_name, opt in cfg.get("anims", []):
    act = R.find_action(action_name)
    if act is None:
        print("NO ACTION", action_name)
        continue
    new, info = R.bake(fox, arm, act, name=clip, step=opt.get("step", 1),
                       arm_out=opt.get("arm_out", cfg.get("arm_out", 0.0)),
                       leg_out=opt.get("leg_out", cfg.get("leg_out", 0.0)),
                       lift=opt.get("lift", 0.0),
                       frame_range=(1, 1) if "--quick" in flags else None)
    report["anims"][clip] = info
    baked.append((clip, new))
    print("BAKED", clip, info)

for o in fox_objs:
    bpy.data.objects.remove(o, do_unlink=True)
keep = {a for _, a in baked}
for a in list(bpy.data.actions):
    if a not in keep:
        bpy.data.actions.remove(a)
for m in meshes:
    m.hide_viewport = False

arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)
for clip, act in baked:
    R.stash(arm, act, clip)


def show(clip, frame):
    """Pose the armature at `frame` of one clip (solo its NLA track)."""
    for tr in arm.animation_data.nla_tracks:
        tr.mute = tr.name != clip  # (is_solo = False on any track clears the solo flag for all)
    scn.frame_set(frame)
    bpy.context.view_layer.update()


def clear_rig():
    for ob in list(bpy.data.objects):
        if ob.type in ("CAMERA", "LIGHT"):
            bpy.data.objects.remove(ob, do_unlink=True)


# ---------------------------------------------------------------- previews
CORE = ("pelvis", "head", "hand_l", "hand_r", "foot_l", "foot_r", "ball_l", "ball_r", "upperarm_l", "upperarm_r", "lowerarm_l", "lowerarm_r")


def body_bounds():
    """Bounds of the skeleton's core joints, padded.

    Taken from bones, not meshes, so an edited and an unedited build of the same character
    (and every character, roughly) are framed identically — before/after renders line up.
    """
    from mathutils import Vector
    pts = []
    for n in CORE:
        pb = arm.pose.bones.get(n)
        if pb:
            pts.append(arm.matrix_world @ pb.head)
            pts.append(arm.matrix_world @ pb.tail)
    lo = Vector((min(p.x for p in pts) - 0.34, min(p.y for p in pts) - 0.3, 0.0))
    hi = Vector((max(p.x for p in pts) + 0.34, max(p.y for p in pts) + 0.3, max(p.z for p in pts) + 0.30))
    return lo, hi


if "--still" in flags and baked:
    od = os.path.join(work, "still")
    os.makedirs(od, exist_ok=True)
    show(baked[0][0], 1)
    lo, hi = body_bounds()
    for view in ("front", "q"):
        clear_rig()
        L.studio(lo, hi, res=(900, 1300), view=view, samples=32, fill=1.04)
        scn.render.filepath = os.path.join(od, f"{key}_{view}.png")
        bpy.ops.render.render(write_still=True)

if "--strip" in flags:
    od = os.path.join(work, "strip", key)
    os.makedirs(od, exist_ok=True)
    for clip, act in baked:
        n = int(act.frame_range[1])
        show(clip, 1)
        lo, hi = L.world_bounds(meshes)
        for i in range(8):
            f = 1 + round(i * (n - 1) / 7)
            show(clip, f)
            clear_rig()
            L.studio(lo, hi, res=(360, 520), view="q", samples=8, fill=1.35)
            scn.render.filepath = os.path.join(od, f"{clip}_{i}.png")
            bpy.ops.render.render(write_still=True)

# ---------------------------------------------------------------- export
if glb_out:
    clear_rig()
    for tr in arm.animation_data.nla_tracks:
        tr.mute = False
    scn.frame_set(1)
    for ob in meshes:  # only UV0 is used by the materials
        while len(ob.data.uv_layers) > 1:
            ob.data.uv_layers.remove(ob.data.uv_layers[-1])
    os.makedirs(os.path.dirname(glb_out), exist_ok=True)
    want = dict(
        filepath=glb_out, export_format="GLB",
        export_image_format="WEBP", export_image_quality=cfg.get("webp_q", 92),
        export_texcoords=True, export_normals=True, export_tangents=False,
        export_materials="EXPORT", export_vertex_color="NONE",
        export_skins=True, export_all_influences=False, export_influence_nb=4,
        export_morph=False,
        export_animations=True, export_animation_mode="NLA_TRACKS",
        export_force_sampling=True, export_frame_step=cfg.get("frame_step", 2),
        export_optimize_animation_size=True, export_anim_single_armature=True,
        export_reset_pose_bones=True, export_yup=True, export_apply=False,
        use_selection=False, export_cameras=False, export_lights=False,
        export_extras=False, export_def_bones=False,
    )
    props = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    skipped = [k for k in want if k not in props]
    if skipped:
        print("EXPORT OPTIONS NOT AVAILABLE", skipped)
    bpy.ops.export_scene.gltf(**{k: v for k, v in want.items() if k in props})
    report["glb"] = {"path": glb_out, "bytes": os.path.getsize(glb_out)}
    print("GLB", glb_out, round(os.path.getsize(glb_out) / 1e6, 2), "MB")

lo, hi = L.world_bounds(meshes)
report["height"] = round(hi.z - lo.z, 3)
report["polys"] = sum(len(m.data.polygons) for m in meshes)
report["bones"] = len(arm.data.bones)
with open(os.path.join(work, f"{key}.json"), "w") as fh:
    json.dump(report, fh, indent=1)
print("REPORT", json.dumps(report)[:1500])
print("OK")
