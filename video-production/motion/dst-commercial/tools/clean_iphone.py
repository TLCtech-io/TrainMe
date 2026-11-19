#!/usr/bin/env python3
"""Clean the iPhone Share Summary screen recording for the DST commercial.

  python3 tools/clean_iphone.py assets/iphone_share_raw.mp4 out/

  1. Blurs the share sheet's contacts row (frequent contacts, names, the AirDrop device name) in every frame it shows.
     The sheet grows out of the middle of the screen, so on the way in its box comes from the difference against the
     still page before it (REF), and the row sits inside that box at the same relative spot. Once the sheet has
     settled the row box is fixed. On the way out the Messages draft slides up over it, so the box is clipped at the
     draft's top edge.
  2. Paints out the red screen-recording dot in the Dynamic Island.
  3. Writes the full clip (iphone-share-clean-full.mp4) and a trimmed edit (iphone-share-edit.mp4):
     Report Preview and the Share Summary tap, then the share sheet (the still page between the tap and the sheet is
     cut), then the Messages draft scrolling back up to the top of the summary at 1.75x, with a short hold on the end.
     Both are 60 fps, silent, BT.709.
Frame numbers are for this recording (1206x2622, 554 frames at 60 fps).
"""
import subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2].rstrip("/")
W, H, FPS = 1206, 2622, 60
REF = 200                                   # the page, still, just before the sheet appears (frame 204)
SETTLED = 231                               # the sheet's grow-in and overshoot are done
SHEET = (27, 1074, 1180, 2593)              # the sheet at rest
ROW = (27, 1364, 1180, 1828)                # the contacts row at rest, with a margin; the sheet's sides bound it
DOT = (389.5, 96.5, 30)                     # the recording dot (centre x, y, radius covering its glow)
EDIT = [(112, 180, 1.0), (200, 285, 1.0), (285, 553, 1.75)]   # (first, last frame, speed): tap, sheet, the draft
HOLD = 30                                   # frames of hold on the last frame of the edit


def sheet_box(a, ref):
    m = np.abs(a - ref).max(2) > 45
    m[:200] = False
    xs, ys = np.where(m.sum(0) > 25)[0], np.where(m.sum(1) > 25)[0]
    if len(xs) < 20 or len(ys) < 20:
        return None
    return xs[0], ys[0], xs[-1], ys[-1]


def draft_top(a):
    """Top edge of the Messages draft (near-black) rising over the sheet, or None."""
    dark = (a[:, 100:1100] < 45).all(2).mean(1)
    run = np.convolve(dark > 0.85, np.ones(30), "valid") == 30
    hits = np.where(run[1150:])[0]
    return 1150 + hits[0] if len(hits) else None


def row_box(i, a, ref):
    if i < REF:
        return None
    if i >= SETTLED:
        top = draft_top(a)
        if top is None:
            return ROW
        return (ROW[0], ROW[1], ROW[2], min(ROW[3], top - 2)) if top - 2 > ROW[1] else None
    b = sheet_box(a, ref)
    if b is None:
        return None
    sx, sy = (b[2] - b[0]) / (SHEET[2] - SHEET[0]), (b[3] - b[1]) / (SHEET[3] - SHEET[1])
    x0, x1 = b[0] + (ROW[0] - SHEET[0]) * sx, b[0] + (ROW[2] - SHEET[0]) * sx
    y0, y1 = b[1] + (ROW[1] - SHEET[1]) * sy, b[1] + (ROW[3] - SHEET[1]) * sy
    pad = 0.06 * (y1 - y0) + 6
    return (max(b[0], x0 - pad), y0 - pad, min(b[2], x1 + pad), y1 + pad)


def blur_box(img, box):
    """Pixelate then blur the box, blended in with a soft rounded edge, so nothing in it can be read."""
    x0, y0, x1, y1 = (int(round(v)) for v in box)
    m = 60
    cx0, cy0, cx1, cy1 = max(0, x0 - m), max(0, y0 - m), min(W, x1 + m), min(H, y1 + m)
    crop = img.crop((cx0, cy0, cx1, cy1))
    k = max(4, int((x1 - x0) / 60))
    crop = crop.resize((max(1, crop.width // k), max(1, crop.height // k)), Image.BILINEAR).resize(crop.size, Image.BILINEAR)
    crop = crop.filter(ImageFilter.GaussianBlur(max(8, 36 * (x1 - x0) / (ROW[2] - ROW[0]))))
    mask = Image.new("L", crop.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((x0 - cx0, y0 - cy0, x1 - cx0, y1 - cy0), radius=24, fill=255)
    img.paste(crop, (cx0, cy0), mask.filter(ImageFilter.GaussianBlur(6)))


def encoder(path):
    return subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "12",
         "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-movflags", "+faststart", path],
        stdin=subprocess.PIPE)


dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-vf", "scale=in_range=full:in_color_matrix=bt709,format=rgb24",
                        "-vsync", "passthrough", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
full, edit = encoder(f"{OUT}/iphone-share-clean-full.mp4"), encoder(f"{OUT}/iphone-share-edit.mp4")
want = {}                                    # source frame -> how many times it goes into the edit
for first, last, speed in EDIT:
    n = int((last - first) / speed) + 1
    for j in range(n):
        f = first + int(round(j * speed))
        want[f] = want.get(f, 0) + 1
ref, i, blurred, last_frame = None, 0, [], None
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3:
        break
    a = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    if i == REF:
        ref = a.astype(np.int16)
    box = row_box(i, a.astype(np.int16), ref) if ref is not None else None
    img = Image.fromarray(a.copy())
    if box is not None:
        blur_box(img, box)
        blurred.append(i)
    cx, cy, r = DOT
    ImageDraw.Draw(img).ellipse((cx - r, cy - r, cx + r, cy + r), fill=(0, 0, 0))
    out = img.tobytes()
    full.stdin.write(out)
    for _ in range(want.get(i, 0)):
        edit.stdin.write(out)
    last_frame = out
    i += 1
for _ in range(HOLD):
    edit.stdin.write(last_frame)
for p in (full, edit):
    p.stdin.close(); p.wait()
print(f"{i} frames; contacts blurred in frames {blurred[0]}-{blurred[-1]} ({len(blurred)} frames)")
