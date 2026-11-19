#!/usr/bin/env python3
"""Mock the wall image up on the venue screen in a photo (perspective warp), optionally keeping a matted foreground
(the ensemble) in front of it.

  python tools/mockup.py <photo> <wall.png> <out.jpg> TLx,TLy,TRx,TRy,BRx,BRy,BLx,BLy [matte.png box_x,box_y]

Screen corners used on 2026-10-24: the empty-stage photo 658,990,1340,990,1340,1395,658,1395; the photo with the
ensemble 608,828,1280,752,1280,1152,608,1230 (bottom edge estimated, it is behind the singers), with an RVM person matte
of the crop (0,950)-(1450,1950) at downsample 0.6.
"""
import sys, numpy as np
from PIL import Image, ImageFilter
photo = Image.open(sys.argv[1]).convert("RGB")
wall = Image.open(sys.argv[2]).convert("RGB")
quad = [float(v) for v in sys.argv[4].split(",")]
dst = [(quad[i], quad[i + 1]) for i in range(0, 8, 2)]
W, H = wall.size
src = [(0, 0), (W, 0), (W, H), (0, H)]
# coefficients mapping output (photo) pixels back to wall pixels
A, b = [], []
for (x, y), (u, v) in zip(dst, src):
    A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; b += [u, v]
coef = np.linalg.solve(np.array(A), np.array(b))
warped = wall.transform(photo.size, Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
mask = Image.new("L", photo.size, 0)
from PIL import ImageDraw
ImageDraw.Draw(mask).polygon(dst, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(0.8))
# an LED wall in a lit room: blacks lift a touch, a faint glow spills past the edges
w = np.asarray(warped, np.float32) / 255
w = w * 0.94 + 0.03
out = np.asarray(photo, np.float32) / 255
m = np.asarray(mask, np.float32)[..., None] / 255
comp = out * (1 - m) + w * m
glow = np.asarray(Image.fromarray((w * m[..., 0:1] * 255).astype(np.uint8).repeat(1, 2)).filter(ImageFilter.GaussianBlur(40)), np.float32) / 255
comp = 1 - (1 - comp) * (1 - glow * 0.18 * (1 - m))
if len(sys.argv) > 5:
    fg = Image.open(sys.argv[5]).convert("L")
    bx, by = [int(v) for v in sys.argv[6].split(",")]
    a = np.zeros(out.shape[:2], np.float32)
    fa = np.asarray(fg, np.float32) / 255
    a[by:by + fa.shape[0], bx:bx + fa.shape[1]] = fa
    a = a[..., None]
    comp = comp * (1 - a) + out * a
Image.fromarray((np.clip(comp, 0, 1) * 255 + 0.5).astype(np.uint8)).save(sys.argv[3], quality=92)
print("ok", sys.argv[3])
