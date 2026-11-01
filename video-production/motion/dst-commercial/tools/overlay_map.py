#!/usr/bin/env python3
"""Lay the user's map crops (radar frames, warning popup) over the map panel of an app capture.

  python3 tools/overlay_map.py <app shot.png> <map-box.json> <out dir> <crop> [<crop> ...]

Each crop is a screenshot of the DST map panel, taken by hand because the radar has to load before it is shot. For each:
  1. find the map panel's border inside the crop, coming in from the white page (the page's thin rules above and
     below the panel are skipped);
  2. line it up with the first crop by phase correlation, on the map only (the popup, the radar timeline bar and the
     controls are masked out), so the crops cross-fade without jitter;
  3. scale it to cover the app shot's map box (map-box.json, shot pixels), trimming the slight aspect difference
     evenly, and paste it in.
Writes <out dir>/<crop name>.png at the app shot's size and prints the edges, shift and scale it used.
"""
import json, os, sys
import numpy as np
from PIL import Image

shot_path, box_path, out_dir, crops = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
os.makedirs(out_dir, exist_ok=True)
X0, Y0, X1, Y1 = json.load(open(box_path))["map"]
BW, BH = X1 - X0, Y1 - Y0


def panel_edges(a):
    """The map panel inside a crop, inside its 1 px gray border. Each edge is found coming in from outside: past any
    thin rule of the page, then past a white gap of at least 8 px; the first non-white line after that is the border.
    The median over several sample lines is used."""
    g = a.mean(2)
    def edge(line):
        white = 0
        for i, v in enumerate(line):
            if v >= 250: white += 1
            elif white >= 8: return i
            else: white = 0
        return None
    h, w = g.shape
    cols, rows = [int(w * f) for f in (0.15, 0.3, 0.5, 0.7, 0.85)], [int(h * f) for f in (0.2, 0.35, 0.5, 0.65, 0.8)]
    med = lambda vals: int(np.median([v for v in vals if v is not None]))
    t = med([edge(g[:, c]) for c in cols])
    b = h - 1 - med([edge(g[::-1, c]) for c in cols])
    l = med([edge(g[r]) for r in rows])
    r = w - 1 - med([edge(g[r][::-1]) for r in rows])
    return l, t, r, b                                      # the border lines themselves


def shift_to(ref, img):
    """Sub-pixel (dy, dx) that moves img onto ref, by phase correlation with a parabolic peak fit."""
    f = np.fft.fft2(ref) * np.conj(np.fft.fft2(img))
    r = np.fft.ifft2(f / (np.abs(f) + 1e-9)).real
    py, px = np.unravel_index(np.argmax(r), r.shape)
    def sub(c, m, p):
        a, b, d = r[(p[0] - 1) % m if c == 0 else p[0], (p[1] - 1) % m if c == 1 else p[1]], r[p], \
                  r[(p[0] + 1) % m if c == 0 else p[0], (p[1] + 1) % m if c == 1 else p[1]]
        den = a - 2 * b + d
        return 0.0 if den == 0 else 0.5 * (a - d) / den
    dy, dx = py + sub(0, r.shape[0], (py, px)), px + sub(1, r.shape[1], (py, px))
    if dy > r.shape[0] / 2: dy -= r.shape[0]
    if dx > r.shape[1] / 2: dx -= r.shape[1]
    return dy, dx


def match_view(c):
    """Grayscale edges of the map, with the parts that differ between crops (popup, timeline bar, controls) masked."""
    g = c.convert("L").resize((c.width // 2, c.height // 2), Image.BILINEAR)
    a = np.asarray(g, np.float32)
    e = np.abs(np.diff(a, axis=0, prepend=a[:1])) + np.abs(np.diff(a, axis=1, prepend=a[:, :1]))
    h, w = e.shape
    e[: int(h * 0.48), int(w * 0.33): int(w * 0.64)] = 0      # popup
    e[int(h * 0.86):, :] = 0                                  # radar timeline bar
    e[:, int(w * 0.93):] = 0                                  # map controls
    e[:, : int(w * 0.06)] = 0
    return e * np.hanning(h)[:, None] * np.hanning(w)[None, :]


shot = Image.open(shot_path).convert("RGB")
ref_view = None
panels = []                                                # (name, aligned panel) for every crop
for path in crops:
    im = Image.open(path).convert("RGB")
    a = np.asarray(im)
    l, t, r, b = panel_edges(a)
    panel = im.crop((l + 2, t + 2, r - 1, b - 1))             # inside the border and its soft edge
    view = match_view(panel)
    if ref_view is None:
        ref_view, ref_size, dy, dx = view, panel.size, 0.0, 0.0
    else:
        if panel.size != ref_size:                            # a pixel or two off: trim or pad, never stretch
            fit = Image.new("RGB", ref_size, (238, 238, 236)); fit.paste(panel, (0, 0))
            panel = fit; view = match_view(panel)
        dy, dx = (2 * v for v in shift_to(ref_view, view))   # match_view is at half size
        panel = panel.transform(panel.size, Image.AFFINE, (1, 0, -dx, 0, 1, -dy), Image.BICUBIC)
    name = os.path.splitext(os.path.basename(path))[0]
    panels.append((name, panel))
    print(f"{name}: panel {l},{t},{r},{b} ({r - l}x{b - t}), shift dx {dx:+.2f} dy {dy:+.2f}")

# light, untinted patches in a radar frame are gaps in the rain, not missing tiles: they stay as shot
for name, panel in panels:
    # cover the map box: scale to fill it, trim the overflow evenly
    s = max(BW / panel.width, BH / panel.height)
    big = panel.resize((round(panel.width * s), round(panel.height * s)), Image.LANCZOS)
    ox, oy = (big.width - BW) // 2, (big.height - BH) // 2
    out = shot.copy()
    out.paste(big.crop((ox, oy, ox + BW, oy + BH)), (X0, Y0))
    out.save(os.path.join(out_dir, name + ".png"))
print(f"scale {s:.3f}, trim {ox},{oy}; wrote {len(panels)} shots")
