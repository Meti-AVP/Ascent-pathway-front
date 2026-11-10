"""Texture processing inside Blender (numpy only — Blender's Python has no PIL).

All edits keep the painted value structure: a recolour moves hue / saturation and
scales value, it never flat-fills, so the brush strokes survive.
Arrays are float32, shape (h, w, 4), values 0..1 in the file's own encoding (sRGB for colour maps).
"""
import bpy
import numpy as np
import os


def load(path, size=None):
    im = bpy.data.images.load(path, check_existing=False)
    if size and max(im.size) > size:
        im.scale(size, size)
    w, h = im.size
    a = np.empty(w * h * 4, dtype=np.float32)
    im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    return a.reshape(h, w, 4)


def resize(a, size):
    """Nearest-neighbour up/down to a square size (only used to line masks up with colour maps)."""
    h, w = a.shape[:2]
    if h == size and w == size:
        return a
    ys = (np.arange(size) * (h / size)).astype(np.int32)
    xs = (np.arange(size) * (w / size)).astype(np.int32)
    return a[ys][:, xs]


def save(a, path, non_color=False, name=None):
    h, w = a.shape[:2]
    im = bpy.data.images.new(name or os.path.splitext(os.path.basename(path))[0], w, h, alpha=True)
    im.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    im.alpha_mode = "STRAIGHT"
    im.pixels.foreach_set(np.ascontiguousarray(a, dtype=np.float32).ravel())
    im.filepath_raw = path
    im.file_format = "PNG"
    im.save()
    return im


def rgb2hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0)
    gc = np.where(m, (mx - g) / np.where(m, d, 1), 0)
    bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2.0 + rc - bc, 4.0 + gc - rc))
    h = (h / 6.0) % 1.0
    h = np.where(m, h, 0.0)
    s = np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0)
    return np.stack([h, s, mx], -1)


def hsv2rgb(hsv):
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    i = np.floor(h * 6.0)
    f = h * 6.0 - i
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))
    i = i.astype(np.int32) % 6
    r = np.choose(i, [v, q, p, p, t, v])
    g = np.choose(i, [t, v, v, q, p, p])
    b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)


def _band(x, lo, hi, feather):
    """1 inside [lo, hi], falling to 0 over `feather` outside it."""
    if feather <= 0:
        return ((x >= lo) & (x <= hi)).astype(np.float32)
    return np.clip((x - (lo - feather)) / feather, 0, 1) * np.clip(((hi + feather) - x) / feather, 0, 1)


def select(hsv, h=None, s=None, v=None, feather_h=10.0, feather_s=0.06, feather_v=0.06):
    """Soft selection weight 0..1. `h` is (lo, hi) in degrees and may wrap past 360."""
    w = np.ones(hsv.shape[:2], dtype=np.float32)
    if h is not None:
        deg = hsv[..., 0] * 360.0
        lo, hi = h
        if lo <= hi:
            w = w * _band(deg, lo, hi, feather_h)
        else:  # wraps, e.g. (340, 20)
            w = w * np.maximum(_band(deg, lo, 360.0 + feather_h, feather_h), _band(deg, -feather_h, hi, feather_h))
    if s is not None:
        w = w * _band(hsv[..., 1], s[0], s[1], feather_s)
    if v is not None:
        w = w * _band(hsv[..., 2], v[0], v[1], feather_v)
    return w


def recolor(a, rules, mask=None):
    """Apply HSV rules to an RGBA array in place-ish; returns a new array.

    rule keys: h, s, v (selection)  ·  to_h (deg), h_shift (deg), s_mul, s_set, v_mul, v_gamma, v_add
               tint (r,g,b)  multiply after the HSV move  ·  amount 0..1
    `mask` optionally limits every rule (h, w floats).
    """
    out = a.copy()
    for rule in rules:
        hsv = rgb2hsv(out[..., :3])
        w = select(hsv, rule.get("h"), rule.get("s"), rule.get("v"),
                   rule.get("feather_h", 10.0), rule.get("feather_s", 0.06), rule.get("feather_v", 0.06))
        if mask is not None:
            w = w * mask
        w = w * rule.get("amount", 1.0)
        new = hsv.copy()
        if "to_h" in rule and rule["to_h"] is not None:
            new[..., 0] = (rule["to_h"] / 360.0) % 1.0
        if "h_shift" in rule:
            new[..., 0] = (new[..., 0] + rule["h_shift"] / 360.0) % 1.0
        if "s_set" in rule:
            new[..., 1] = rule["s_set"]
        if "s_mul" in rule:
            new[..., 1] = np.clip(new[..., 1] * rule["s_mul"], 0, 1)
        if "v_gamma" in rule:
            new[..., 2] = np.power(np.clip(new[..., 2], 0, 1), rule["v_gamma"])
        if "v_mul" in rule:
            new[..., 2] = np.clip(new[..., 2] * rule["v_mul"], 0, 1)
        if "v_add" in rule:
            new[..., 2] = np.clip(new[..., 2] + rule["v_add"], 0, 1)
        rgb = hsv2rgb(new)
        if "tint" in rule:
            rgb = np.clip(rgb * np.array(rule["tint"], dtype=np.float32), 0, 1)
        out[..., :3] = out[..., :3] * (1.0 - w[..., None]) + rgb * w[..., None]
    return out


def flip_green(a):
    out = a.copy()
    out[..., 1] = 1.0 - out[..., 1]
    out[..., 3] = 1.0
    return out


def to_fabric(a, target=0.16, contrast=0.5, tint=(1.0, 1.0, 1.0), keep_sat=0.06):
    """Turn painted skin into painted cloth.

    The brush strokes are kept as value variation around a new mid value: the picture stays
    hand-painted, it just stops reading as skin. `target` is the cloth's mid value (0..1),
    `contrast` scales how much of the original light/shadow modelling survives.
    """
    out = a.copy()
    hsv = rgb2hsv(out[..., :3])
    v = hsv[..., 2]
    mean = float(v[v > 0.02].mean()) if (v > 0.02).any() else 0.5
    new_v = np.clip(target + (v - mean) * contrast, 0.0, 1.0)
    hsv[..., 1] = hsv[..., 1] * keep_sat
    hsv[..., 2] = new_v
    rgb = hsv2rgb(hsv) * np.array(tint, dtype=np.float32)
    out[..., :3] = np.clip(rgb, 0, 1)
    return out


def flatten_normal(a, amount=0.75):
    """Pull a (already Blender-oriented) normal map toward flat: skin detail must not show through cloth."""
    out = a.copy()
    flat = np.array([0.5, 0.5, 1.0], dtype=np.float32)
    out[..., :3] = out[..., :3] * (1.0 - amount) + flat * amount
    return out


def set_rough(a, rough=0.82, metal=0.0):
    out = a.copy()
    out[..., 1] = np.maximum(out[..., 1], rough)
    out[..., 2] = metal
    return out
