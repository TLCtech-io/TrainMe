# Per-output-frame loudness envelope (0..1) and onset times, from a 16 kHz mono wav.
import sys, wave, json
import numpy as np
fps = float(sys.argv[3]) if len(sys.argv) > 3 else 24000 / 1001
with wave.open(sys.argv[1]) as w:
    sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
dur = len(x) / sr
n = int(np.floor(dur * fps))
hop = sr / fps
rms = np.array([np.sqrt(np.mean(x[int(i*hop):int((i+1)*hop)]**2) + 1e-12) for i in range(n)])
db = 20*np.log10(rms); lo, hi = np.percentile(db, 10), np.percentile(db, 98)
env = np.clip((db - lo) / (hi - lo), 0, 1)
env_s = np.convolve(env, np.ones(5)/5, mode="same")  # light smoothing
# Spectral-flux onsets
win = 1024; h = 256
frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (0, win)), win)[::h] * np.hanning(win)
mag = np.abs(np.fft.rfft(frames, axis=1))
flux = np.maximum(0, np.diff(np.log1p(mag), axis=0)).sum(axis=1)
flux = (flux - flux.mean()) / (flux.std() + 1e-9)
t = (np.arange(len(flux)) + 1) * h / sr
peaks = [t[i] for i in range(2, len(flux)-2) if flux[i] > 1.6 and flux[i] == flux[i-2:i+3].max()]
onsets = []
for p in peaks:
    if not onsets or p - onsets[-1] > 0.18: onsets.append(round(float(p), 3))
iv = np.diff(onsets); 
bpm = 60/np.median(iv) if len(iv) else 0
json.dump({"fps": fps, "duration": round(dur, 3), "env": [round(float(v), 3) for v in env_s], "onsets": onsets}, open(sys.argv[2], "w"))
print(f"duration {dur:.2f}s, {n} frames, {len(onsets)} onsets, median IOI bpm ~{bpm:.0f}")
print("loudness by second:", " ".join(f"{env_s[int(s*fps):int((s+1)*fps)].mean():.2f}" for s in range(int(dur))))
print("onsets:", onsets[:60])
