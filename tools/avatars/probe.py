"""Probe a source model: bone names matching a pattern, and the mesh islands of chosen material slots.

Run: blender -b --python probe.py -- <raw dir> <char folder> <bone regex> <slot part,slot part>
"""
import bpy
import bmesh
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_rivals as L  # noqa: E402

raw, char, bone_re, parts = sys.argv[sys.argv.index("--") + 1:][:4]
L.reset()
src_dir = os.path.join(raw, char, "source", "_x")
L.import_fbx(os.path.join(src_dir, [f for f in os.listdir(src_dir) if f.lower().endswith(".fbx")][0]))
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
ob = L.mesh_objects()[0]

rx = re.compile(bone_re, re.I)
hits = [(b.name, [round(v, 3) for v in (arm.matrix_world @ b.head_local)]) for b in arm.data.bones if rx.search(b.name)]
print("BONES", json.dumps(hits))

# vertex-group weight totals for those bones
names = {h[0] for h in hits}
tot = {}
for v in ob.data.vertices:
    for g in v.groups:
        n = ob.vertex_groups[g.group].name
        if n in names and g.weight > 0.01:
            tot[n] = tot.get(n, 0) + 1
print("WEIGHTED", json.dumps(tot))

want = set(parts.split(",")) if parts else set()
idx = {i: L.part_of(s.material.name) for i, s in enumerate(ob.material_slots) if s.material and L.part_of(s.material.name) in want}
bm = bmesh.new()
bm.from_mesh(ob.data)
bm.faces.ensure_lookup_table()
seen = set()
islands = []
for f in bm.faces:
    if f.index in seen or f.material_index not in idx:
        continue
    stack = [f]
    seen.add(f.index)
    faces = []
    while stack:
        cur = stack.pop()
        faces.append(cur)
        for e in cur.edges:
            for nb in e.link_faces:
                if nb.index not in seen and nb.material_index == cur.material_index:
                    seen.add(nb.index)
                    stack.append(nb)
    xs = [v.co.x for fc in faces for v in fc.verts]
    ys = [v.co.y for fc in faces for v in fc.verts]
    zs = [v.co.z for fc in faces for v in fc.verts]
    islands.append({"part": idx[f.material_index], "faces": len(faces),
                    "c": [round((min(xs) + max(xs)) / 2, 3), round((min(ys) + max(ys)) / 2, 3), round((min(zs) + max(zs)) / 2, 3)],
                    "size": [round(max(xs) - min(xs), 3), round(max(ys) - min(ys), 3), round(max(zs) - min(zs), 3)]})
islands.sort(key=lambda d: -d["faces"])
print("ISLANDS", len(islands))
for d in islands[:60]:
    print("  ", d["part"], d["faces"], "c", d["c"], "size", d["size"])
