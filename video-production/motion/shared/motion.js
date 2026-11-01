// Shared helpers for TMA / PREPARE motion compositions. Deterministic: values depend only on t.
window.M = {
  // Piecewise ease-in-out interpolation through [[t, v], ...] keyframes.
  keys(frames, t) {
    if (t <= frames[0][0]) return frames[0][1];
    for (let i = 1; i < frames.length; i++) {
      const [t1, v1] = frames[i];
      const [t0, v0] = frames[i - 1];
      if (t <= t1) {
        const p = (t - t0) / Math.max(1e-6, t1 - t0);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        return v0 + (v1 - v0) * e;
      }
    }
    return frames[frames.length - 1][1];
  },
  // Registers the composition for the renderer. `update(t)` handles per-frame text such as counters.
  register(tl, meta, update) {
    window.__tl = tl;
    window.__meta = meta;
    window.__seek = (t) => { tl.seek(t, false); if (update) update(t); };
    window.__seek(0);
  },
};
