#!/usr/bin/env python3
"""Dynamic de-harsh for phone recordings of singing.

Turns the 2-5.5 kHz presence band down only while it spikes above its usual level relative to the body of the
sound (hard consonants, a vocal mic coming through a room speaker), and leaves everything else alone. A dynamic EQ
with a measured threshold: the threshold is the clip's own median presence-to-body ratio plus --over-db.

  python3 deharsh.py in.wav out.wav [--ratio 3] [--max-db 8] [--over-db 3]

16-bit PCM WAV in and out, any channel count; numpy only.
"""
import sys, wave
import numpy as np


def opt(name, default):
    return float(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default


src, dst = sys.argv[1], sys.argv[2]
ratio, max_db, over_db = opt("--ratio", 3.0), opt("--max-db", 8.0), opt("--over-db", 3.0)

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


# Detection on the mono mix: presence (2-5.5 kHz) against body (200-1500 Hz), per frame
M = np.abs(stft(xp.mean(1))) ** 2
pres, body = M[:, (f >= 2000) & (f < 5500)].sum(1), M[:, (f >= 200) & (f < 1500)].sum(1)
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

# Gain curve over frequency: flat 2.2-5 kHz, raised-cosine shoulders out to 1.6 and 7 kHz
lf = np.log2(np.maximum(f, 1))
shape = np.zeros_like(f)
shape[(f >= 2200) & (f <= 5000)] = 1
lo = (f >= 1600) & (f < 2200); shape[lo] = 0.5 - 0.5 * np.cos(np.pi * (lf[lo] - np.log2(1600)) / (np.log2(2200) - np.log2(1600)))
hi = (f > 5000) & (f <= 7000); shape[hi] = 0.5 + 0.5 * np.cos(np.pi * (lf[hi] - np.log2(5000)) / (np.log2(7000) - np.log2(5000)))
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
