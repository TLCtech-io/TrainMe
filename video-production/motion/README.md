# Motion graphics pipeline

HTML + GSAP compositions rendered frame by frame in local headless Chrome, encoded with ffmpeg.
Same model as HyperFrames (one paused, seekable GSAP timeline per composition), with a small local renderer
(`tools/render.cjs`) because the HyperFrames CLI was blocked in the cloud session. Everything is local: fonts and
GSAP live in `shared/`, and the renderer refuses any network request.

```
shared/            fonts (Roboto, Lato, display faces), gsap.min.js, tma.css (TMA tokens), motion.js (helpers)
shared/brand/      qcpa-logo-white.svg: Queen City Performing Arts (Uptown Sound's parent org) one-colour white logo.
                   The diamonds and ball dots are knockouts (holes), so it reads on black, toxic green or footage.
tools/render.cjs   renderer: --in page.html --out clip.mp4 [--out-width 3840] [--stills t1,t2 --stills-dir dir] [--alpha]
                   [--query thumb] (passes ?thumb etc. to the page)
tools/logo_mono.py one-colour knockout logo from a flat vector logo: pdftocairo -svg logo.pdf in.svg, then
                   logo_mono.py in.svg out.svg [--color #FFFFFF]. White shapes become holes in the shape under them.
tma-pilots/        IMP Span of Control concept graphics (16:9, rendered at 3840x2160)
prepare-vid5/      PREPARE Vid 5 recut per the Claude Edit Playbook (9:16) - see its storyboard.md and build.sh
uptown-toxic/      Uptown Sound "Pick Your Poison" show reel, "Poison Preview: Toxic" (9:16, phone footage at 24000/1001 fps).
                   Toxic liquid layer driven by the vocal loudness (data/features.js); lyric hits from a whisper pass.
                   End card: QCPA logo on the dark wall at the top (clear of the Reels header), then the show lockup.
                   Build: ./build.sh path/to/clip.mp4
                   3:4 cover: render.cjs --in index.html --query thumb --stills 19.00 (bottom 1440px of the frame, webs
                   and vignette redrawn for 3:4, QCPA logo moved into the slime under the ticket line)
```

Setup (once per machine): `npm install puppeteer-core@24 gsap` somewhere and point `NODE_PATH` at its `node_modules`;
a Chrome / chrome-headless-shell binary (set `CHROME_PATH` if it is not auto-detected); ffmpeg.

Render a TMA graphic at 4K:

```bash
NODE_PATH=... node tools/render.cjs --in tma-pilots/04-deputy.html --out deputy.mp4 --out-width 3840
```

Retiming: each composition keeps its beat times in a `T = {...}` block at the top of its script (seconds from clip start).
PREPARE cards key off transcript words instead, so they retime themselves when `data/` changes.
