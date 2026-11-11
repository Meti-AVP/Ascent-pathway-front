"""Turn the rig stills into the shipped hero files.

  py -I heropost.py <stills dir> <public/img/cast dir> key [key ...]

For each key, from <key>-dark.png and <key>-light.png (1400 x 2200, RGBA, 2x of the 700 x 1100 u box):
  <key>-hero-dark.webp      2x   (quality 90)
  <key>-hero-dark-1x.webp   1x
  <key>-hero-light.webp     2x
  <key>-hero-light-1x.webp  1x
  <key>-hero-rim.webp       2x   the sticker outline: the silhouette dilated by ~6 u, white + alpha (a CSS mask)
  <key>-hero-rim-1x.webp    1x
Never overwrites a file that is not a hero file.
"""
import os
import sys
from PIL import Image, ImageFilter

src, dst, *keys = sys.argv[1:]


def half(im: Image.Image) -> Image.Image:
    # premultiplied, so the edge pixels do not pick up the black of the empty canvas
    return im.convert('RGBa').resize((im.width // 2, im.height // 2), Image.LANCZOS).convert('RGBA')


def rim(alpha: Image.Image) -> Image.Image:
    """The silhouette grown by ~12 px (6 u at 2x), with round corners and a soft 1-2 px edge."""
    solid = alpha.point(lambda a: 255 if a > 96 else 0)
    grown = solid.filter(ImageFilter.GaussianBlur(8))
    lo, hi = 14, 30
    return grown.point(lambda v: 0 if v <= lo else 255 if v >= hi else (v - lo) * 255 // (hi - lo))


def save(im: Image.Image, name: str, **kw):
    path = os.path.join(dst, name)
    assert '-hero-' in name, name
    im.save(path, 'WEBP', method=6, **kw)
    print(f'{name:34s} {im.size[0]}x{im.size[1]}  {os.path.getsize(path) / 1024:6.1f} KB')


for key in keys:
    for look in ('dark', 'light'):
        im = Image.open(os.path.join(src, f'{key}-{look}.png')).convert('RGBA')
        save(im, f'{key}-hero-{look}.webp', quality=90, alpha_quality=100)
        save(half(im), f'{key}-hero-{look}-1x.webp', quality=90, alpha_quality=100)
    a = Image.open(os.path.join(src, f'{key}-dark.png')).getchannel('A')
    r = rim(a)
    white = Image.new('RGBA', r.size, (255, 255, 255, 0))
    white.putalpha(r)
    save(white, f'{key}-hero-rim.webp', lossless=True)
    small = white.resize((white.width // 2, white.height // 2), Image.LANCZOS)
    save(small, f'{key}-hero-rim-1x.webp', lossless=True)
