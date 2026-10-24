#!/usr/bin/env python3
"""Take the lettering off chosen bottle labels in a plate and letter them again as faded old apothecary labels.

  python tools/fade_labels.py <in.png> <out.png> "x0,y0,x1,y1=AQUA MORTIS" [...]

Each box closely bounds the lettering, in plate pixels. The paper under it is rebuilt column by column from the clean
strips of paper just above and just below the box (so the label keeps its curve and shading), the paper's fine grain is
put back, and a small faded name in old typewriter type is printed in its place.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage as ndi

FONT = "../shared/fonts/special-elite-latin-400-normal.woff2"
im = Image.open(sys.argv[1]).convert("RGB")
a = np.asarray(im, np.float32)
rng = np.random.default_rng(11)
for spec in sys.argv[3:]:
    box, name = spec.split("=", 1)
    x0, y0, x1, y1 = [int(v) for v in box.split(",")]
    gap, band, fx = 4, 10, 14
    top = np.median(a[y0 - gap - band:y0 - gap, x0 - fx:x1 + fx], axis=0)          # per column
    bot = np.median(a[y1 + gap:y1 + gap + band, x0 - fx:x1 + fx], axis=0)
    top, bot = ndi.gaussian_filter1d(top, 3, axis=0), ndi.gaussian_filter1d(bot, 3, axis=0)
    Y0, Y1 = y0 - gap, y1 + gap
    t = ((np.arange(Y0, Y1) - Y0) / (Y1 - Y0 - 1))[:, None, None]
    paper = top[None] * (1 - t) + bot[None] * t
    reg = a[Y0:Y1, x0 - fx:x1 + fx]
    grain = np.clip(reg - ndi.gaussian_filter(reg, (1.5, 1.5, 0)), -5, 5)
    clean = paper + rng.normal(0, 2.2, paper.shape) + grain * 0.15
    # the faded name, centred, in brown ink that has mostly gone
    h, w = clean.shape[:2]
    ink = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(ink)
    size = int((y1 - y0) * 0.42)
    font = ImageFont.truetype(FONT, size)
    tw = d.textlength(name, font=font)
    if tw > w - 2 * fx - 10:
        font = ImageFont.truetype(FONT, int(size * (w - 2 * fx - 10) / tw)); tw = d.textlength(name, font=font)
    d.text(((w - tw) / 2, h * 0.5), name, font=font, fill=255, anchor="lm")
    ink = np.asarray(ink.filter(ImageFilter.GaussianBlur(1.1)), np.float32)[..., None] / 255
    wear = ndi.gaussian_filter(rng.random((h, w)), 3)[..., None]
    ink *= 0.35 + 0.35 * (wear > np.median(wear))
    clean = clean * (1 - ink) + np.array([62, 42, 26], np.float32) * ink
    # feather left and right into the untouched label, hard top and bottom (they match the clean strips already)
    m = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / fx, 0, 1)[None, :, None]
    a[Y0:Y1, x0 - fx:x1 + fx] = reg * (1 - m) + clean * m
Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(sys.argv[2], compress_level=3)
print("relabelled", len(sys.argv) - 3)
