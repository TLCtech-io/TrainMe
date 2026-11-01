#!/usr/bin/env python3
"""Footage prep for the seated office shot: a person matte (Robust Video Matting) and a virtual key light.

  python3 prep_footage.py <frames_dir> <first_frame> <last_frame> <rvm.torchscript> [--only 900,960]

Reads frames_dir/f_%05d.jpg (30 fps, 1-based). For frames first..last it writes
  frames_dir/../alpha/a_%05d.png   8-bit person matte, used for the cut-out scenes
  frames_dir/../lit/f_%05d.jpg     the relit frame
The relight is deliberately gentle (the shoot had no portable light): a soft front key on the face that follows the
head, a small lift on the person, a slightly cooler white balance, and the room behind eased down so the face reads
first. RAMP frames at the start fade the effect in across the shot's dissolve. --only renders a test range.
"""
import sys, os
import numpy as np
import torch
from PIL import Image, ImageFilter

frames_dir, first, last, model_path = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
only = [int(v) for v in sys.argv[sys.argv.index("--only") + 1].split(",")] if "--only" in sys.argv else None
root = os.path.dirname(os.path.abspath(frames_dir.rstrip("/")))
alpha_dir, lit_dir = os.path.join(root, "alpha"), os.path.join(root, "lit")
os.makedirs(alpha_dir, exist_ok=True); os.makedirs(lit_dir, exist_ok=True)

RAMP = 12                        # frames over which the relight fades in (the shot opens on a dissolve)
KEY = dict(gain=0.34, lift=0.07, dx=-90, dy=330, sx=320, sy=430)   # key light, in linear light, relative to the head top
WB = np.array([0.97, 1.0, 1.045], np.float32)                       # a touch cooler than the warm overhead light
BG = 0.14                        # how much the room behind is eased down

torch.set_num_threads(os.cpu_count() or 4)
model = torch.jit.load(model_path).eval()
rec = [None] * 4
head = None                      # smoothed (cx, top) of the head, from the matte
H = W = None
yy = xx = None

def relight(rgb, a, k):
    """rgb uint8 HxWx3, a float HxW in 0..1, k = effect strength 0..1."""
    lin = (rgb.astype(np.float32) / 255.0) ** 2.2
    cx, top = head
    key = np.exp(-0.5 * (((xx - (cx + KEY["dx"])) / KEY["sx"]) ** 2 + ((yy - (top + KEY["dy"])) / KEY["sy"]) ** 2))
    gain = 1 + (KEY["gain"] * key + KEY["lift"]) * a
    gain *= 1 - BG * (1 - a)
    out = lin * (1 + (gain[..., None] * WB - 1) * k)
    return (np.clip(out, 0, 1) ** (1 / 2.2) * 255 + 0.5).astype(np.uint8)

idx = range(first, last + 1)
for n in idx:
    img = Image.open(os.path.join(frames_dir, f"f_{n:05d}.jpg")).convert("RGB")
    rgb = np.asarray(img)
    if H is None:
        H, W = rgb.shape[:2]
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    src = torch.from_numpy(rgb).permute(2, 0, 1)[None].float() / 255
    with torch.no_grad():
        fgr, pha, *rec = model(src, *rec, downsample_ratio=0.25)
    a = pha[0, 0].numpy()
    # head position from the matte: the top of the silhouette, and the centre of the band below it
    rows = np.where((a > 0.5).sum(1) > 40)[0]
    if len(rows):
        top = rows[0]
        band = a[top:top + 600] > 0.5
        cols = np.where(band.any(0))[0]
        cx = float(np.average(np.arange(W), weights=band.sum(0) + 1e-6)) if len(cols) else W / 2
        head = (cx, float(top)) if head is None else (head[0] * 0.85 + cx * 0.15, head[1] * 0.85 + top * 0.15)
    if head is None: head = (W / 2, H * 0.3)
    if only and not (only[0] <= n <= only[1]): continue
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), "L").save(os.path.join(alpha_dir, f"a_{n:05d}.png"), optimize=False, compress_level=3)
    soft = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4)), np.float32) / 255
    k = min(1.0, (n - first + 1) / RAMP)
    Image.fromarray(relight(rgb, soft, k)).save(os.path.join(lit_dir, f"f_{n:05d}.jpg"), quality=94)
    if n % 60 == 0: print(f"frame {n} head=({head[0]:.0f},{head[1]:.0f})", flush=True)
print("done", first, last)
