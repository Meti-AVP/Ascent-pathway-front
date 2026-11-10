"""Retarget White Fox's lobby animations onto any other Rivals character.

Every character shares the Unreal mannequin bone names, so the transfer is done
in WORLD space: each shared bone on the target copies the world rotation of the
same-named bone on the source, the pelvis follows a height-scaled copy of the
source pelvis, and the result is baked to plain keyframes on the target.

World-space copy (rather than reusing the action directly) is what makes it
survive different proportions: a pose-space delta applied to a different rest
pose lands the arm somewhere else, whereas a world orientation is the pose.
"""
import bpy
import math
import re
from mathutils import Matrix, Vector

SKIP = re.compile(r"(?i)(^ik_|^fx_|_end$|socket|^emote|^root$|cloth|tail|hair|skirt|cape|accessor|weapon|^vb_)")


def assign_action(arm, action):
    """Assign an action and, on the slotted-action API (4.4+), the slot meant for objects."""
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = action
    slots = getattr(action, "slots", None)
    if not slots:
        return
    for slot in slots:
        if getattr(slot, "target_id_type", "OBJECT") in ("OBJECT", "UNSPECIFIED"):
            try:
                arm.animation_data.action_slot = slot
                return
            except Exception as exc:  # noqa: BLE001
                print("slot assign:", exc)


def find_action(name_part):
    cands = [a for a in bpy.data.actions if name_part.lower() in a.name.lower()]
    cands.sort(key=lambda a: len(a.name))
    # prefer the "SK_…|Name" take over a bare duplicate
    for a in cands:
        if "|" in a.name and a.name.lower().endswith(name_part.lower()):
            return a
    return cands[0] if cands else None


def shared_bones(src, dst):
    return [b.name for b in dst.data.bones if b.name in src.data.bones and not SKIP.search(b.name)]


def bake(src, dst, action, name="retarget", step=1, arm_out=0.0, leg_out=0.0, lift=0.0, frame_range=None):
    """Bake `action` (playing on src) onto dst as a new action called `name`.

    arm_out / leg_out  degrees to swing the whole arm / leg away from the body
                       (bulkier characters need room the source body never needed)
    lift               extra metres added to the pelvis after ground correction
    """
    scn = bpy.context.scene
    assign_action(src, action)
    f0, f1 = (int(action.frame_range[0]), int(action.frame_range[1])) if frame_range is None else frame_range
    names = shared_bones(src, dst)

    src_rest = src.matrix_world @ src.data.bones["pelvis"].head_local
    dst_rest = dst.matrix_world @ dst.data.bones["pelvis"].head_local
    ratio = dst_rest.z / max(src_rest.z, 1e-6)

    if dst.animation_data:
        dst.animation_data.action = None
    for pb in dst.pose.bones:
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)

    cons = []
    for n in names:
        pb = dst.pose.bones[n]
        c = pb.constraints.new("COPY_ROTATION")
        c.target = src
        c.subtarget = n
        c.target_space = "WORLD"
        c.owner_space = "WORLD"
        cons.append((pb, c))

    swing = {}
    for side, sign in (("l", 1.0), ("r", -1.0)):
        if arm_out:
            swing["upperarm_" + side] = Matrix.Rotation(math.radians(arm_out) * -sign, 3, "Y")
        if leg_out:
            swing["thigh_" + side] = Matrix.Rotation(math.radians(leg_out) * -sign, 3, "Y")

    feet = [n for n in ("foot_l", "foot_r") if n in dst.pose.bones]
    feet_rest = {n: (dst.matrix_world @ dst.data.bones[n].head_local).z for n in feet}

    frames = list(range(f0, f1 + 1, step))
    if frames[-1] != f1:
        frames.append(f1)
    samples = {n: [] for n in names}
    targets, ground = [], []
    dst_pelvis = dst.pose.bones["pelvis"]
    src_pelvis = src.pose.bones["pelvis"]
    for f in frames:
        scn.frame_set(f)
        bpy.context.view_layer.update()
        delta = (src.matrix_world @ src_pelvis.head) - src_rest
        target_world = dst_rest + delta * ratio
        targets.append(target_world)
        for n in names:
            pb = dst.pose.bones[n]
            local = dst.convert_space(pose_bone=pb, matrix=pb.matrix, from_space="POSE", to_space="LOCAL")
            q = local.to_quaternion()
            if n in swing:
                world_rot = (dst.matrix_world @ pb.matrix).to_3x3().normalized()
                basis = q.to_matrix()
                m = world_rot @ basis.inverted()
                q = (m.inverted() @ swing[n] @ m @ basis).to_quaternion()
            samples[n].append(q)
        # how far the lower foot ends up from the floor once the pelvis is moved
        dz = target_world.z - dst_rest.z
        low = min(((dst.matrix_world @ dst.pose.bones[n].head).z + dz) - feet_rest[n] for n in feet) if feet else 0.0
        ground.append(low)

    for pb, c in cons:
        pb.constraints.remove(c)

    ground_sorted = sorted(ground)
    fix = -ground_sorted[len(ground_sorted) // 2] + lift  # constant, so the idle keeps its own bounce
    base = dst_pelvis.matrix.copy()

    new = bpy.data.actions.new(name)
    assign_action(dst, new)
    for i, f in enumerate(frames):
        key = f - f0 + 1
        for n in names:
            pb = dst.pose.bones[n]
            q = samples[n][i]
            if i > 0 and q.dot(samples[n][i - 1]) < 0:  # stay on one hemisphere, no long-way slerps
                q.negate()
                samples[n][i] = q
            pb.rotation_quaternion = q
            pb.keyframe_insert("rotation_quaternion", frame=key)
        m = base.copy()
        m.translation = dst.matrix_world.inverted() @ (targets[i] + Vector((0, 0, fix)))
        local = dst.convert_space(pose_bone=dst_pelvis, matrix=m, from_space="POSE", to_space="LOCAL")
        dst_pelvis.location = local.translation
        dst_pelvis.keyframe_insert("location", frame=key)
    new = dst.animation_data.action
    new.name = name
    new.use_fake_user = True

    # loop seam: how different are the first and last sampled poses
    seam = max(1.0 - abs(samples[n][0].dot(samples[n][-1])) for n in names)
    return new, {"bones": len(names), "ratio": round(ratio, 3), "frames": f1 - f0 + 1,
                 "ground_fix": round(fix, 4), "seam": round(seam, 5)}


def stash(arm, action, track_name):
    """Park an action on its own NLA track so the glTF exporter writes it as a separate clip."""
    ad = arm.animation_data or arm.animation_data_create()
    track = ad.nla_tracks.new()
    track.name = track_name
    strip = track.strips.new(track_name, 1, action)
    strip.name = track_name
    slots = getattr(action, "slots", None)
    if slots:
        for slot in slots:
            if getattr(slot, "target_id_type", "OBJECT") in ("OBJECT", "UNSPECIFIED"):
                try:
                    strip.action_slot = slot
                except Exception as exc:  # noqa: BLE001
                    print("strip slot:", exc)
                break
    track.mute = False
    return track
