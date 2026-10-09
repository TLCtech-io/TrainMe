# Motion graphics pipeline

HTML + GSAP compositions rendered frame by frame in local headless Chrome, encoded with ffmpeg.
Same model as HyperFrames (one paused, seekable GSAP timeline per composition), with a small local renderer
(`tools/render.cjs`) because the HyperFrames CLI was blocked in the cloud session. Everything is local: fonts and
GSAP live in `shared/`, and the renderer refuses any network request.

```
shared/            fonts (Roboto, Lato), gsap.min.js, tma.css (TMA tokens), motion.js (helpers)
tools/render.cjs   renderer: --in page.html --out clip.mp4 [--out-width 3840] [--stills t1,t2 --stills-dir dir] [--alpha]
tma-pilots/        IMP Span of Control concept graphics (16:9, rendered at 3840x2160)
prepare-vid5/      PREPARE Vid 5 recut per the Claude Edit Playbook (9:16) - see its storyboard.md and build.sh
```

Setup (once per machine): `npm install puppeteer-core@24 gsap` somewhere and point `NODE_PATH` at its `node_modules`;
a Chrome / chrome-headless-shell binary (set `CHROME_PATH` if it is not auto-detected); ffmpeg.

Render a TMA graphic at 4K:

```bash
NODE_PATH=... node tools/render.cjs --in tma-pilots/04-deputy.html --out deputy.mp4 --out-width 3840
```

Retiming: each composition keeps its beat times in a `T = {...}` block at the top of its script (seconds from clip start).
PREPARE cards key off transcript words instead, so they retime themselves when `data/` changes.
