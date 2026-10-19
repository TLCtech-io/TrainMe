#!/usr/bin/env python3
"""Fit a firequalizer curve so the finished audio has a target tonal shape compared with the original.

The finished audio is what soften_audio.sh makes from DRY (the dereverbed audio): curve EQ, de-harsh, compression,
-14 LUFS. Targets are dB changes per band versus REF (the untouched audio), measured at equal loudness and relative
to the 900-1300 Hz anchor, so they describe shape (more bass, less box, less bite), not level. Iterates until every
band is within 1 dB, then writes the filter string for soften_audio.sh CURVE=...

  python3 fit_eq.py dry.wav ref.wav curve.txt [--targets "80-200:10,200-330:5,330-500:-5,500-900:-4,900-1300:0,1300-2000:-2,2000-3200:-3,3200-5000:-3"]
     [--band 1300,3500] [--comp "acompressor=..."]
"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np

DRY, REF, OUT = sys.argv[1:4]
opt = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
TARGETS = opt("--targets", "80-200:10,200-330:5,330-500:-5,500-900:-4,900-1300:0,1300-2000:-2,2000-3200:-3,3200-5000:-3")
BANDS = [(*map(float, b.split(":")[0].split("-")), float(b.split(":")[1])) for b in TARGETS.split(",")]
ANCHOR = next(i for i, (a, b, _) in enumerate(BANDS) if a <= 1000 < b)
BAND = opt("--band", "1300,3500")
COMP = opt("--comp", "acompressor=threshold=-22dB:ratio=3:attack=10:release=160:knee=6:makeup=2")
HERE = os.path.dirname(os.path.abspath(__file__))
TMP = tempfile.mkdtemp()


def sh(c):
    return subprocess.run(c, shell=True, check=True, capture_output=True, text=True)


def spec(p):
    w = wave.open(p); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32).reshape(-1, ch).mean(1) / 32768
    win = 8192; fr = np.lib.stride_tricks.sliding_window_view(x, win)[::2048] * np.hanning(win)
    return (np.abs(np.fft.rfft(fr, axis=1)) ** 2).mean(0), np.fft.rfftfreq(win, 1 / sr)


def finish(src, out):
    """compression + two-pass loudnorm to -14 LUFS, as soften_audio.sh does"""
    j = sh(f"ffmpeg -v info -y -i {src} -af \"{COMP},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json\" -f null - 2>&1 || true").stdout
    d = json.loads(j[j.rindex("{"):j.rindex("}") + 1])
    m = f"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}"
    sh(f"ffmpeg -v error -y -i {src} -af \"{COMP},loudnorm=I=-14:TP=-1.5:LRA=11:{m}:linear=true,aresample=48000\" -c:a pcm_s16le {out}")


finish(REF, f"{TMP}/ref14.wav")          # the reference at the same loudness
Po, f = spec(f"{TMP}/ref14.wav")
CENT = [float(np.sqrt(a * b)) for a, b, _ in BANDS]


def curve(g):
    # control points on a log-frequency axis, sent as a dense 1/6-octave grid
    # (firequalizer interpolates linearly in Hz, and its loglog scale ignores the entries)
    cx = np.log2([50] + CENT + [6300]); cy = [g[0] - 3] + list(g) + [g[-1]]
    fs = 20 * 2 ** (np.arange(0, 60) / 6); fs = fs[fs < 24000]
    gy = np.interp(np.log2(fs), cx, cy)
    return "firequalizer=delay=0.05:gain_entry='entry(0," + f"{gy[0]:.2f})" + "".join(f";entry({a:.1f},{b:.2f})" for a, b in zip(fs, gy)) + "'"


def run(g):
    sh(f"ffmpeg -v error -y -i {DRY} -af \"highpass=f=60:poles=2,{curve(g)},atrim=start_sample=2400,asetpts=N/SR/TB\" -c:a pcm_s16le {TMP}/eq.wav")
    sh(f"{sys.executable} -I {HERE}/deharsh.py {TMP}/eq.wav {TMP}/dh.wav --band {BAND} --over-db 2 --ratio 4 --max-db 9")
    finish(f"{TMP}/dh.wav", f"{TMP}/fit.wav")
    P, _ = spec(f"{TMP}/fit.wav")
    d = [10 * np.log10(P[(f >= a) & (f < b)].sum() / Po[(f >= a) & (f < b)].sum()) for a, b, _ in BANDS]
    return [v - d[ANCHOR] for v in d]


g = [t for _, _, t in BANDS]
for it in range(6):
    got = run(g)
    err = [t - x for (_, _, t), x in zip(BANDS, got)]
    print(f"iter {it}: shape " + " ".join(f"{x:+5.1f}" for x in got) + f"  | worst miss {max(map(abs, err)):.1f} dB")
    if max(map(abs, err)) < 1.0:
        break
    g = [a + 0.9 * e for a, e in zip(g, err)]
open(OUT, "w").write(curve(g))
print("wrote", OUT)
