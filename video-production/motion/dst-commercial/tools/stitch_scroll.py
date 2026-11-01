#!/usr/bin/env python3
"""Stitch two shots of one scrolling page into a single tall page, so the camera can scroll down it.

  python3 tools/stitch_scroll.py <upper shot.png> <lower shot.png> <out.png> [<header px>]

The lower shot is the same page scrolled further down (the app scrolls inside its own panel, and its header and
sidebar stay put). The scroll distance is found by matching a band of the lower shot, below its sticky header,
against the upper shot (content columns only, right of the sidebar). The output is the upper shot, continued with
the lower shot's rows that it doesn't already show. Prints the scroll distance, which maps the lower shot's
coordinates onto the stitched page (page y = lower y + distance).
"""
import sys
import numpy as np
from PIL import Image

up_path, lo_path, out_path = sys.argv[1:4]
HEADER = int(sys.argv[4]) if len(sys.argv) > 4 else 160      # the sticky header's height in shot pixels
SIDEBAR = 730                                                 # the sidebar's width in shot pixels
up = Image.open(up_path).convert("RGB"); lo = Image.open(lo_path).convert("RGB")
a = np.asarray(up.convert("L"), np.float32)[:, SIDEBAR:]
b = np.asarray(lo.convert("L"), np.float32)[:, SIDEBAR:]
band = b[HEADER + 10: HEADER + 110]      # a short band just below the lower shot's header (the shots may overlap little)
best, best_d = None, None
for d in range(1, a.shape[0] - band.shape[0] - HEADER - 10):
    win = a[HEADER + 10 + d: HEADER + 110 + d]
    if win.shape != band.shape:
        break
    err = float(np.mean(np.abs(win - band)))
    if best is None or err < best:
        best, best_d = err, d
if best is None or best > 2.0:
    sys.exit(f"no clean match (best mean difference {best})")
h = up.height
page = Image.new("RGB", (up.width, best_d + lo.height), (255, 255, 255))
page.paste(up, (0, 0))
page.paste(lo.crop((0, h - best_d, lo.width, lo.height)), (0, h))
page.save(out_path)
print(f"scroll distance {best_d} px (mean difference {best:.2f}); page {page.width}x{page.height}")
