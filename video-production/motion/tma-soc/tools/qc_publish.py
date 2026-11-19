#!/usr/bin/env python3
"""QC a private Descript publish of the VISUAL composition.

Usage: qc_publish.py <publish.mp4> <shots.csv> <outdir> [working_audio] [words.json]

shots.csv rows: label,start,end (timeline seconds). For each shot it grabs frames 0.25 s after the start, at the
middle and 0.2 s before the end, and makes labelled contact sheets (outdir/sheet_N.jpg) to check matches, black
frames and clips that run short. With the WORKING audio and the word timing, it also compares the narration
pauses inside the shot range: stock that kept its sound shows up as a pause louder than in WORKING.
Note: the publish download is a 10.5 fps preview, so judge timing to about 0.1 s.
"""
import csv, json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

video, shots_csv, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
shots = [(r[0], float(r[1]), float(r[2])) for r in csv.reader(open(shots_csv)) if r and not r[0].startswith("#")]

frames = []
for i, (lab, a, b) in enumerate(shots):
    for tag, t in (("a", a + 0.25), ("m", (a + b) / 2), ("z", b - 0.2)):
        f = f"{out}/{i:03d}{tag}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1", "-vf", "scale=640:-2", f], check=True)
        frames.append((f, f"{lab} {tag} {t:.1f}"))
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
W, H, per = 640, 360, 24
for k in range(0, len(frames), per):
    chunk = frames[k:k + per]
    sheet = Image.new("RGB", (3 * W, ((len(chunk) + 2) // 3) * (H + 26)), "white")
    d = ImageDraw.Draw(sheet)
    for j, (f, lab) in enumerate(chunk):
        x, y = (j % 3) * W, (j // 3) * (H + 26)
        sheet.paste(Image.open(f).resize((W, H)), (x, y + 26))
        d.text((x + 6, y + 3), lab, fill="black", font=font)
    sheet.save(f"{out}/sheet_{k // per}.jpg", quality=80)
    print(f"{out}/sheet_{k // per}.jpg")

if len(sys.argv) > 5:
    work, words = sys.argv[4], json.load(open(sys.argv[5]))
    t0, t1 = min(s[1] for s in shots) - 1, max(s[2] for s in shots) + 1
    def pcm(src):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t0), "-t", str(t1 - t0), "-i", src, "-vn", "-ac", "1",
                              "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
        return np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    v, w = pcm(video), pcm(work)
    db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
    loud = 0
    for x, y in zip(words, words[1:]):
        g0, g1 = x["e"] + 0.05, y["s"] - 0.05
        if g1 - g0 < 0.1 or not (t0 < g0 and g1 < t1):
            continue
        s, e = int((g0 - t0) * 16000), int((g1 - t0) * 16000)
        dv, dw = db(v[s:e]), db(w[s:e])
        if dv - dw > 6:
            loud += 1
            print(f"pause {g0:.2f}-{g1:.2f}: publish {dv:.1f} dB vs WORKING {dw:.1f} dB  << extra sound")
    print("audio: no extra sound in the narration pauses" if not loud else f"audio: {loud} pauses louder than WORKING")
