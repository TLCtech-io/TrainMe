#!/usr/bin/env python3
"""Dynamic de-harsh for phone recordings of singing.

Turns the 2-5.5 kHz presence band down only while it spikes above its usual level relative to the body of the
sound (hard consonants, a vocal mic coming through a room speaker), and leaves everything else alone. A dynamic EQ
with a measured threshold: the threshold is the clip's own median presence-to-body ratio plus --over-db.

  python3 deharsh.py in.wav out.wav [--ratio 3] [--max-db 8] [--over-db 3] [--band 2200,5000]

--band is the flat part of the cut (Hz); it is detected over 10% either side and faded out over shoulders.

16-bit PCM WAV in and out, any channel count; numpy only.
"""
import sys, wave
import numpy as np


def opt(name, default):
    return float(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default


src, dst = sys.argv[1], sys.argv[2]
ratio, max_db, over_db = opt("--ratio", 3.0), opt("--max-db", 8.0), opt("--over-db", 3.0)
B_LO, B_HI = map(float, sys.argv[sys.argv.index("--band") + 1].split(",")) if "--band" in sys.argv else (2200.0, 5000.0)

with wave.open(src) as w:
    sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
    x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32).reshape(-1, ch) / 32768

N, H = 2048, 512
win = np.hanning(N + 1)[:-1]
xp = np.pad(x, ((N, N), (0, 0)))
starts = np.arange(0, len(xp) - N + 1, H)
f = np.fft.rfftfreq(N, 1 / sr)


def stft(sig):
    return np.fft.rfft(np.stack([sig[s:s + N] * win for s in starts]), axis=1)


# Detection on the mono mix: the band (widened 10% either side) against the body below it, per frame
M = np.abs(stft(xp.mean(1))) ** 2
pres, body = M[:, (f >= B_LO / 1.1) & (f < B_HI * 1.1)].sum(1), M[:, (f >= 200) & (f < min(1500, B_LO * 0.7))].sum(1)
rd = 10 * np.log10((pres + 1e-12) / (body + 1e-12))
level = 10 * np.log10(M.sum(1) + 1e-12)
active = level > np.percentile(level, 20)            # ignore near-silent frames when setting the threshold
thr = np.median(rd[active]) + over_db
gr = np.clip((rd - thr) * (1 - 1 / ratio), 0, max_db) * active

# Fast attack, 80 ms release
rel = np.exp(-H / (sr * 0.08))
gs = np.zeros_like(gr)
for i in range(len(gr)):
    gs[i] = gr[i] if i == 0 or gr[i] >= gs[i - 1] else gs[i - 1] * rel + gr[i] * (1 - rel)

# Gain curve over frequency: flat across the band, raised-cosine shoulders (about half an octave) either side
lf = np.log2(np.maximum(f, 1))
S_LO, S_HI = B_LO / 1.375, B_HI * 1.4
shape = np.zeros_like(f)
shape[(f >= B_LO) & (f <= B_HI)] = 1
lo = (f >= S_LO) & (f < B_LO); shape[lo] = 0.5 - 0.5 * np.cos(np.pi * (lf[lo] - np.log2(S_LO)) / (np.log2(B_LO) - np.log2(S_LO)))
hi = (f > B_HI) & (f <= S_HI); shape[hi] = 0.5 + 0.5 * np.cos(np.pi * (lf[hi] - np.log2(B_HI)) / (np.log2(S_HI) - np.log2(B_HI)))
G = 10 ** (-(gs[:, None] * shape[None, :]) / 20)

# Apply per channel, overlap-add back
out = np.zeros_like(xp)
norm = np.zeros(len(xp))
for s in starts:
    norm[s:s + N] += win ** 2
for c in range(ch):
    Y = np.fft.irfft(stft(xp[:, c]) * G, n=N, axis=1) * win
    for k, s in enumerate(starts):
        out[s:s + N, c] += Y[k]
out = out / np.maximum(norm, 1e-8)[:, None]
out = out[N:N + len(x)]

with wave.open(dst, "wb") as w:
    w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
print(f"threshold {thr:+.1f} dB; turned down in {100 * (gs > 0.5).mean():.0f}% of frames, mean {gs[gs > 0.5].mean() if (gs > 0.5).any() else 0:.1f} dB, max {gs.max():.1f} dB")
