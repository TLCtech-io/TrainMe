#!/usr/bin/env python3
"""Track one feature through a frame range (normalised cross-correlation at half resolution).

  python3 track.py <frames_dir> <first> <last> <ref_frame> <x> <y> <out.json> [--box 180]

The patch around (x, y) in ref_frame is followed forwards and backwards to cover first..last; writes
{"first": n, "xy": [[x, y], ...]} in full-resolution pixels, lightly smoothed.
"""
import sys, json
import numpy as np
from PIL import Image

frames_dir, first, last, ref, x0, y0, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
box = int(sys.argv[sys.argv.index("--box") + 1]) if "--box" in sys.argv else 180
S, R = 2, 40                                     # half resolution; search radius (half-res px) per frame

def load(n):
    im = Image.open(f"{frames_dir}/f_{n:05d}.jpg").convert("L")
    return np.asarray(im.resize((im.width // S, im.height // S)), np.float32)

def ncc(img, tpl, cx, cy):
    h, w = tpl.shape
    t = (tpl - tpl.mean()) / (tpl.std() + 1e-6)
    best, bx, by = -2, cx, cy
    for dy in range(-R, R + 1, 2):
        for dx in range(-R, R + 1, 2):
            x, y = cx + dx - w // 2, cy + dy - h // 2
            if x < 0 or y < 0 or x + w > img.shape[1] or y + h > img.shape[0]: continue
            p = img[y:y + h, x:x + w]
            v = float(((p - p.mean()) / (p.std() + 1e-6) * t).mean())
            if v > best: best, bx, by = v, cx + dx, cy + dy
    for dy in (-1, 0, 1):                        # refine to 1 px
        for dx in (-1, 0, 1):
            x, y = bx + dx - w // 2, by + dy - h // 2
            if x < 0 or y < 0 or x + w > img.shape[1] or y + h > img.shape[0]: continue
            p = img[y:y + h, x:x + w]
            v = float(((p - p.mean()) / (p.std() + 1e-6) * t).mean())
            if v > best: best, bx, by = v, bx + dx, by + dy
    return bx, by

b = box // S
img = load(ref)
cx, cy = x0 // S, y0 // S
tpl = img[cy - b // 2:cy + b // 2, cx - b // 2:cx + b // 2].copy()
pos = {ref: (cx, cy)}
for rng in (range(ref + 1, last + 1), range(ref - 1, first - 1, -1)):
    px, py = cx, cy
    for n in rng:
        px, py = ncc(load(n), tpl, px, py)
        pos[n] = (px, py)
xy = np.array([pos[n] for n in range(first, last + 1)], np.float32) * S
k = np.array([1, 2, 3, 2, 1], np.float32); k /= k.sum()
sm = np.stack([np.convolve(np.pad(xy[:, i], 2, mode="edge"), k, mode="valid") for i in (0, 1)], 1)
json.dump({"first": first, "xy": np.round(sm, 1).tolist()}, open(out, "w"))
print("tracked", first, last, "range x", sm[:, 0].min(), sm[:, 0].max(), "y", sm[:, 1].min(), sm[:, 1].max())
