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
tools/audio_features.py   per-frame loudness envelope + onsets from a 16 kHz wav (drives audio-reactive layers)
tools/transcribe_words.py whisper word timestamps (needs faster-whisper; the session venv has it)
tools/soften_audio.sh     gentle edge-off for a phone recording of singing: small EQ moves, deharsh.py, light
                          compression, -14 LUFS. ./soften_audio.sh in.mov out.wav. This is the ceiling for audio work:
                          no AI dereverb/separation and no big EQ moves (see TMA_VIDEO_GUIDE.md, tooling notes)
tools/deharsh.py          dynamic EQ: turns a band (default 2.2-5 kHz) down only while it spikes above the clip's norm
tools/logo_mono.py one-colour knockout logo from a flat vector logo: pdftocairo -svg logo.pdf in.svg, then
                   logo_mono.py in.svg out.svg [--color #FFFFFF]. White shapes become holes in the shape under them.
tma-pilots/        IMP Span of Control concept graphics (16:9, rendered at 3840x2160)
prepare-vid5/      PREPARE Vid 5 recut per the Claude Edit Playbook (9:16) - see its storyboard.md and build.sh
uptown-toxic/      Uptown Sound "Pick Your Poison" show reel, "Poison Preview: Toxic" (9:16, phone footage at 24000/1001 fps).
                   Toxic liquid layer driven by the vocal loudness (data/features.js); lyric hits from a whisper pass.
                   QCPA logo (logoState in index.html): surfaces in the slime at 1.5s and floats under the surface
                   (rides the surges, bubbles pass in front, dips under the date label); at the end card it pops out
                   to the dark wall, then from 17.5s zooms (ease-in) to fill the space above the slime as the
                   footage fades to black (the source clip itself ends on black).
                   Build: ./build.sh path/to/clip.mp4
                   3:4 cover: render.cjs --in index.html --query thumb --stills 19.00 (bottom 1440px of the frame, webs
                   and vignette redrawn for 3:4, QCPA logo moved into the slime under the ticket line)
uptown-et/         Uptown Sound "Pick Your Poison" reel, "Poison Preview: E.T." (9:16, 24000/1001 fps). The ensemble band
                   of the phone frame plays inside a flying-saucer window (WebGL shader: dreamy soft focus, ripple,
                   colour fringing, scanlines, static on the sung accents); stars streak out from the centre; the QCPA
                   logo floats in the tractor beam. Key words only. Build: ./build.sh path/to/clip.MOV
                   Stills, re-laid out per shape (LAY in index.html; the reel is unaffected):
                     3:4 cover        render.cjs --in index.html --query thumb --stills 17.2   (1080x1440)
                     Facebook 4:5     render.cjs --in index.html --query fb --stills 17.2      (1080x1350)
uptown-zombie/     Uptown Sound "Pick Your Poison" reel, "Poison Preview: Zombie" (9:16, 24 fps). Clip used as delivered
                   (starts on the chorus; grey grade, vignette and audio fades are the user's; audio stream copied).
                   1960s B-movie zombie theme: old-film dust/scratches/flicker, floor fog, rigged decayed zombie hands
                   that climb out of the fog (one per ZOMBIE) and never leave, clawing and clenching on the hits;
                   IN YOUR HEAD echoes at head height; the last hand lifts the logo out of the fog for the end card.
                   Stills (end-card graphics over the soloist's opening close-up, LAY in index.html):
                     3:4 cover        render.cjs --in index.html --query thumb --stills 19   (1080x1440)
                     Facebook 4:5     render.cjs --in index.html --query fb --stills 19      (1080x1350)
                   Build: ./build.sh path/to/clip.MP4
uptown-silence/    Uptown Sound "Pick Your Poison" reel, "Poison Preview: Sound of Silence" (9:16, 30 fps). Clip used as
                   delivered (trim, end fade, greyscale, vignette, audio). Dreamy blur fade-in, then a white hand-drawn
                   night scene keyed to the verse: rain from the upper left, a cobblestone street, a street lamp with a
                   faint warm cone, the QCPA logo on a poster on the lamp post, and a man in hat and coat walking away up
                   the street past the lamp; the neon-light flash brings on the end card. Line work boils at 10 fps.
                   Stills (the 0:05 scene with the end card's show name, date and tickets plus the one-line Poison
                   Preview card, LAY in index.html):
                     3:4 cover        render.cjs --in index.html --query thumb --stills 1   (1080x1440)
                     Facebook 4:5     render.cjs --in index.html --query fb --stills 1      (1080x1350)
                   Build: ./build.sh path/to/clip.MP4
```

Setup (once per machine): `npm install puppeteer-core@24 gsap` somewhere and point `NODE_PATH` at its `node_modules`;
a Chrome / chrome-headless-shell binary (set `CHROME_PATH` if it is not auto-detected); ffmpeg.

Render a TMA graphic at 4K:

```bash
NODE_PATH=... node tools/render.cjs --in tma-pilots/04-deputy.html --out deputy.mp4 --out-width 3840
```

Retiming: each composition keeps its beat times in a `T = {...}` block at the top of its script (seconds from clip start).
PREPARE cards key off transcript words instead, so they retime themselves when `data/` changes.
