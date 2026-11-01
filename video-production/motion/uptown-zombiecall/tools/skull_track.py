#!/usr/bin/env python3
"""Follow the reaper's skull through the clip and place its eye sockets.

  python tools/skull_track.py <frames_dir> <out.json> [--seed 132]

The skull is the pale, yellowish shape inside the black hood: bone-coloured pixels (fairly bright, G/R high, a little
yellow) are closed and hole-filled into blobs. Starting from a close-up where the skull is the only candidate (seed
frame), each frame takes the candidate blob nearest the skull in the frame before (forwards and backwards), so the
bony hands on the guitar and the lit brick are never picked. The hood hides the sides of the skull, so the visible
blob is a tall strip from the brow to the jaw; the sockets sit at its upper corners (measured on the close-ups:
x0 + 0.23 w and x0 + 0.79 w, y0 + 0.38 h). Gaps are interpolated and the track is smoothed.
Writes {"first": n, "last": n, "eyes": [[lx, ly, rx, ry, w] | null per frame]} in full-resolution pixels.
"""
import sys, json, glob
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

frames = sorted(glob.glob(f"{sys.argv[1]}/f_*.jpg"))
seed = int(sys.argv[sys.argv.index("--seed") + 1]) if "--seed" in sys.argv else 132
S = 2

def candidates(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im.resize((im.width // S, im.height // S)), np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    sat = (mx - mn) / (mx + 1e-4)
    pale = (L > 0.36) & (sat > 0.06) & (sat < 0.5) & (g > 0.78 * r) & (b < g * 0.98)
    pale[:, :90] = False; pale[:, 450:] = False
    blob = ndi.binary_fill_holes(ndi.binary_closing(pale, iterations=3))
    lab, n = ndi.label(blob)
    out = []
    for k, sl in enumerate(ndi.find_objects(lab), 1):
        m = lab[sl] == k
        A = int(m.sum())
        if A < 250: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        w, h = x1 - x0, y1 - y0
        if not (0.9 < h / w < 5.0): continue
        out.append(np.array([x0, y0, x1, y1], float) * S)
    return out

C = [candidates(p) for p in frames]
N = len(frames)
box = [None] * N
def centre(b): return np.array([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2])
def pick(i, prev):
    if not C[i]: return None
    best = min(C[i], key=lambda b: np.linalg.norm(centre(b) - centre(prev)))
    w = prev[2] - prev[0]
    jump = np.linalg.norm(centre(best) - centre(prev))
    size = (best[2] - best[0]) / w
    return best if jump < 0.9 * w + 30 and 0.6 < size < 1.6 else None
s = seed - 1
box[s] = max(C[s], key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
for rng in (range(s + 1, N), range(s - 1, -1, -1)):
    prev, miss = box[s], 0
    for i in rng:
        b = pick(i, prev)
        if b is None:
            miss += 1
            if miss > 12: break                      # lost it for half a second: the skull has left the frame
            continue
        box[i], prev, miss = b, b, 0

ok = np.array([b is not None for b in box])
idx = np.arange(N)
first, last = idx[ok].min(), idx[ok].max()
B = np.array([b if b is not None else [np.nan] * 4 for b in box])
for j in range(4): B[:, j] = np.interp(idx, idx[ok], B[ok, j])
k = np.ones(5) / 5
pad = np.pad(B, ((2, 2), (0, 0)), mode="edge")
B = np.stack([np.convolve(pad[:, j], k, mode="valid") for j in range(4)], 1)
# when the skull is cut off by the top of the frame or smeared by the tilts at the start and end, the blob's height
# is wrong, so the brow is placed from the jaw with the usual height-to-width ratio instead
R = np.array([b[3] - b[1] for b in box if b is not None and b[1] > 8]) / np.array([b[2] - b[0] for b in box if b is not None and b[1] > 8])
ratio = float(np.median(R))
eyes = []
for i in range(N):
    if i < first or i > last: eyes.append(None); continue
    x0, y0, x1, y1 = B[i]; w, h = x1 - x0, y1 - y0
    if y0 < 12 or h < 2.4 * w: h = ratio * w; y0 = y1 - h      # cut off by the frame edge, or blurred by the tilt
    eyes.append([round(float(v), 1) for v in (x0 + 0.23 * w, y0 + 0.38 * h, x0 + 0.79 * w, y0 + 0.38 * h, w)])
json.dump({"first": int(first) + 1, "last": int(last) + 1, "eyes": eyes, "found": [bool(v) for v in ok]}, open(sys.argv[2], "w"))
print(f"{N} frames; skull followed over frames {first + 1}-{last + 1}, seen in {int(ok.sum())}; h/w {ratio:.2f}")
