"""Compose the per-slot tiles written by slots.py into one labelled sheet per character.

Run: py slots_sheet.py <slots dir> [name filter]
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

root = sys.argv[1]
flt = sys.argv[2] if len(sys.argv) > 2 else ""
try:
    font = ImageFont.truetype("arialbd.ttf", 15)
except OSError:
    font = ImageFont.load_default()

for char in sorted(os.listdir(root)):
    d = os.path.join(root, char)
    if not os.path.isdir(d) or (flt and flt not in char):
        continue
    info = json.load(open(os.path.join(d, "slots.json")))
    items = sorted(info.items(), key=lambda kv: kv[1].get("index", 0))
    tw, th = 300, 430
    cols = min(8, len(items))
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + 26)), (12, 12, 14))
    draw = ImageDraw.Draw(sheet)
    for n, (name, meta) in enumerate(items):
        i = meta.get("index", n)
        f = Image.open(os.path.join(d, f"{i:02d}_f.jpg")).resize((tw // 2, th // 2))
        b = Image.open(os.path.join(d, f"{i:02d}_b.jpg")).resize((tw // 2, th // 2))
        x, y = (n % cols) * tw, (n // cols) * (th + 26)
        tile = Image.open(os.path.join(d, f"{i:02d}_f.jpg"))
        sheet.paste(tile, (x, y))
        sheet.paste(b, (x + tw - tw // 2, y + th - th // 2))
        short = name.split("_", 2)[-1] if name.count("_") >= 2 else name
        draw.text((x + 6, y + th + 4), f"{i}: {short}  ({meta['faces']})", fill=(255, 210, 60), font=font)
    out = os.path.join(root, f"{char}.jpg")
    sheet.save(out, quality=86)
    print(out, sheet.size)
