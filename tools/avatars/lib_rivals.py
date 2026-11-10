"""Shared Blender helpers for the Rivals character pipeline.

The FBX files arrive as ONE skinned mesh with ~14 material slots named
MI_<id>_<Part> and no texture links, so every material is rebuilt here from the
texture files that sit beside the FBX (T_<id>_<Part>_<Kind>.png).

Texture kinds (Unreal naming):
    D    base colour            N   normal (DirectX, green flipped for Blender)
    ORM  R=AO G=rough B=metal    S   specular / skin params
    M    hair = opacity mask     E   emissive
    Mask misc region mask       AO  hair ambient occlusion
"""
import bpy
import os
import re
from mathutils import Vector

KINDS = ("D", "N", "ORM", "S", "M", "E", "MASK", "AO", "ID", "AN")


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_fbx(path):
    for op in ("wm.fbx_import", "import_scene.fbx"):
        mod, name = op.split(".")
        fn = getattr(getattr(bpy.ops, mod), name, None)
        try:
            fn(filepath=path)
            return op
        except Exception as exc:  # noqa: BLE001
            print("import via", op, "failed:", exc)
    raise RuntimeError("could not import " + path)


def _strip_ids(rest):
    """Drop the leading id tokens: T_1061001_Body, T_10600_1060500_Body, T_WP_1039001_Hammer."""
    toks = rest.split("_")
    while toks and (toks[0].isdigit() or toks[0].upper() in ("WP", "T", "MI", "SK")):
        toks.pop(0)
    return "_".join(toks)


def index_textures(folder):
    """{ part_key: { KIND: filepath } } from T_<id>_<Part>_<Kind>.png names."""
    out = {}
    for f in os.listdir(folder):
        if not f.lower().endswith((".png", ".jpg", ".jpeg", ".tga")):
            continue
        stem = os.path.splitext(f)[0]
        if not stem.upper().startswith("T_"):
            continue
        rest = _strip_ids(stem[2:])
        kind = None
        for k in sorted(KINDS, key=len, reverse=True):
            if rest.upper().endswith("_" + k):
                kind = k
                rest = rest[: -(len(k) + 1)]
                break
        if kind is None:
            continue
        out.setdefault(norm(rest), {})[kind] = os.path.join(folder, f)
    return out


def part_of(material_name):
    name = re.sub(r"\.\d+$", "", material_name)
    # some exports append a content hash: MI_10600_1060500_Body_01_3d9f8bc5
    name = re.sub(r"_[0-9a-f]{6,8}$", "", name)
    if name.upper().startswith("MI_"):
        name = name[3:]
    return norm(_strip_ids(name))


def find_tex(tex_index, part):
    """Exact part match, else progressively looser (Eyes_01 -> Eyes, Hair_03 -> Hair)."""
    if part in tex_index:
        return tex_index[part]
    base = re.sub(r"\d+$", "", part)
    if base in tex_index:
        return tex_index[base]
    cands = [k for k in tex_index if k.startswith(base)]
    if cands:
        return tex_index[sorted(cands)[0]]
    return {}


def img(path, non_color=False):
    im = bpy.data.images.load(path, check_existing=True)
    if non_color:
        im.colorspace_settings.name = "Non-Color"
    return im


def build_material(mat, tex, hair_tint=None):
    """Principled material from an Unreal texture set."""
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (500, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (200, 0)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    part = part_of(mat.name)
    is_hair = part.startswith("hair") or "eyelash" in part or "brow" in part
    is_eye = part.startswith("eye")

    if "D" in tex:
        d = nt.nodes.new("ShaderNodeTexImage")
        d.image = img(tex["D"])
        d.location = (-500, 200)
        if is_hair and hair_tint is not None:
            mix = nt.nodes.new("ShaderNodeMixRGB")
            mix.blend_type = "MULTIPLY"
            mix.inputs[0].default_value = 1.0
            mix.inputs[2].default_value = (*hair_tint, 1.0)
            mix.location = (-200, 200)
            nt.links.new(d.outputs["Color"], mix.inputs[1])
            nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
        else:
            nt.links.new(d.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = (0.25, 0.25, 0.27, 1)

    if "ORM" in tex and not is_hair:
        o = nt.nodes.new("ShaderNodeTexImage")
        o.image = img(tex["ORM"], non_color=True)
        o.location = (-500, -100)
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        sep.location = (-200, -100)
        nt.links.new(o.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
        nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    else:
        bsdf.inputs["Roughness"].default_value = 0.55 if not is_eye else 0.08

    if "N" in tex:
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = img(tex["N"], non_color=True)
        n.location = (-800, -400)
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        sep.location = (-520, -400)
        inv = nt.nodes.new("ShaderNodeMath")
        inv.operation = "SUBTRACT"
        inv.inputs[0].default_value = 1.0
        inv.location = (-360, -460)
        comb = nt.nodes.new("ShaderNodeCombineColor")
        comb.location = (-200, -400)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.location = (0, -400)
        nt.links.new(n.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Red"], comb.inputs["Red"])
        nt.links.new(sep.outputs["Green"], inv.inputs[1])
        nt.links.new(inv.outputs[0], comb.inputs["Green"])
        nt.links.new(sep.outputs["Blue"], comb.inputs["Blue"])
        nt.links.new(comb.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])

    if "E" in tex:
        e = nt.nodes.new("ShaderNodeTexImage")
        e.image = img(tex["E"])
        e.location = (-500, -700)
        nt.links.new(e.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 1.5

    if is_hair and "M" in tex:
        a = nt.nodes.new("ShaderNodeTexImage")
        a.image = img(tex["M"], non_color=True)
        a.location = (-500, 500)
        nt.links.new(a.outputs["Color"], bsdf.inputs["Alpha"])
        try:
            mat.surface_render_method = "DITHERED"
        except Exception:  # noqa: BLE001
            pass
        mat.use_backface_culling = False
    return mat


def rebuild_materials(tex_folder, hair_tint=None):
    idx = index_textures(tex_folder)
    report = {}
    for mat in bpy.data.materials:
        if not mat.name.startswith("MI_"):
            continue
        tex = find_tex(idx, part_of(mat.name))
        build_material(mat, tex, hair_tint=hair_tint)
        report[mat.name] = sorted(tex.keys())
    return report


def mesh_objects():
    return [o for o in bpy.data.objects if o.type == "MESH"]


def world_bounds(objs):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for ob in objs:
        for corner in ob.bound_box:
            p = ob.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
    return lo, hi


def studio(lo, hi, res=(900, 1300), view="front", fill=1.12, engine=None, samples=48):
    """Camera + three area lights framed on the bounds; transparent film."""
    scn = bpy.context.scene
    engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    for cand in ([engine] if engine else []) + ["BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"]:
        if cand in engines:
            scn.render.engine = cand
            break
    scn.render.film_transparent = True
    scn.render.resolution_x, scn.render.resolution_y = res
    scn.render.resolution_percentage = 100
    scn.render.image_settings.file_format = "PNG"
    scn.render.image_settings.color_mode = "RGBA"
    try:
        scn.eevee.taa_render_samples = samples
    except Exception:  # noqa: BLE001
        pass
    try:
        scn.view_settings.view_transform = "Standard"
    except Exception:  # noqa: BLE001
        pass

    center = (lo + hi) / 2
    size = hi - lo
    height = size.z
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    aspect = res[0] / res[1]
    cam_data.ortho_scale = max(height * fill, size.x * fill / aspect * 1.0)
    cam = bpy.data.objects.new("cam", cam_data)
    scn.collection.objects.link(cam)
    dist = max(size) * 4
    if view == "front":
        cam.location = center + Vector((0, -dist, 0))
        cam.rotation_euler = (1.5708, 0, 0)
    elif view == "q":
        import math
        ang = math.radians(28)
        cam.location = center + Vector((math.sin(ang) * dist, -math.cos(ang) * dist, 0))
        cam.rotation_euler = (1.5708, 0, ang)
    elif view == "back":
        cam.location = center + Vector((0, dist, 0))
        cam.rotation_euler = (1.5708, 0, 3.14159)
    scn.camera = cam

    def area(name, loc, energy, size_m, color=(1, 1, 1)):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = energy
        ld.size = size_m
        ld.color = color
        lo_ = bpy.data.objects.new(name, ld)
        lo_.location = loc
        scn.collection.objects.link(lo_)
        direction = center - Vector(loc)
        lo_.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        return lo_

    s = max(height, 1.0)
    area("key", center + Vector((-1.6 * s, -2.4 * s, 1.2 * s)), 260 * s * s, 2.2 * s)
    area("fill", center + Vector((2.0 * s, -1.8 * s, 0.3 * s)), 90 * s * s, 3.0 * s, (0.9, 0.95, 1.0))
    area("rim", center + Vector((0.6 * s, 2.4 * s, 1.5 * s)), 420 * s * s, 2.0 * s, (1.0, 0.96, 0.9))

    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.55, 0.57, 0.62, 1)
        bg.inputs[1].default_value = 0.32
    scn.world = world
    return cam
