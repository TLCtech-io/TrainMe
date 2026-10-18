#!/usr/bin/env python3
"""One-color (knockout) version of a flat vector logo.

Input: an SVG from `pdftocairo -svg logo.pdf` (absolute path coords, no transforms).
Every white shape becomes a hole in the coloured shape that contains it (merged into
that path as an even-odd subpath), every other shape takes the new colour, and the
viewBox is cropped to the artwork. Output is plain paths: no masks, imports anywhere.

  python3 logo_mono.py in.svg out.svg [--color #FFFFFF] [--pad 0]
"""
import re, sys

args = sys.argv[1:]
src, dst = args[0], args[1]
color = args[args.index("--color") + 1] if "--color" in args else "#FFFFFF"
pad = float(args[args.index("--pad") + 1]) if "--pad" in args else 0.0

svg = open(src).read()
paths = []
for m in re.finditer(r"<path ([^>]*)/>", svg):
    attrs = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(1)))
    nums = list(map(float, re.findall(r"-?\d+(?:\.\d+)?", attrs["d"])))
    xs, ys = nums[0::2], nums[1::2]
    attrs["bbox"] = (min(xs), min(ys), max(xs), max(ys))
    attrs["white"] = attrs["fill"].replace(" ", "") == "rgb(100%,100%,100%)"
    paths.append(attrs)

def inside(a, b):  # bbox a inside bbox b
    return a[0] >= b[0] and a[1] >= b[1] and a[2] <= b[2] and a[3] <= b[3]

def area(b):
    return (b[2] - b[0]) * (b[3] - b[1])

solid = [p for p in paths if not p["white"]]
for w in (p for p in paths if p["white"]):
    hosts = [p for p in solid if inside(w["bbox"], p["bbox"])]
    if not hosts:
        sys.exit(f"white shape at {w['bbox']} has no containing shape")
    host = min(hosts, key=lambda p: area(p["bbox"]))
    host["d"] += " " + w["d"]
    host["fill-rule"] = "evenodd"

x0 = min(p["bbox"][0] for p in solid) - pad
y0 = min(p["bbox"][1] for p in solid) - pad
x1 = max(p["bbox"][2] for p in solid) + pad
y1 = max(p["bbox"][3] for p in solid) + pad
w, h = x1 - x0, y1 - y0
out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.2f}" height="{h:.2f}" '
       f'viewBox="{x0:.3f} {y0:.3f} {w:.3f} {h:.3f}">', f'<g fill="{color}">']
out += [f'<path fill-rule="{p["fill-rule"]}" d="{p["d"]}"/>' for p in solid]
out += ["</g>", "</svg>", ""]
open(dst, "w").write("\n".join(out))
print(f"{len(solid)} shapes, {sum(p['white'] for p in paths)} knockouts, {w:.2f}x{h:.2f}pt -> {dst}")
