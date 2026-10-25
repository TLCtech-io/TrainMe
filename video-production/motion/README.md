# Motion graphics pipeline

HTML + GSAP compositions rendered frame by frame in local headless Chrome, encoded with ffmpeg.
Same model as HyperFrames (one paused, seekable GSAP timeline per composition), with a small local renderer
(`tools/render.cjs`) because the HyperFrames CLI was blocked in the cloud session. Everything is local: fonts and
GSAP live in `shared/`, and the renderer refuses any network request.

```
shared/            fonts (Roboto, Lato, Montserrat, Open Sans, display faces; all OFL), gsap.min.js, tma.css (TMA
                   tokens), motion.js (helpers)
shared/brand/      qcpa-logo-white.svg: Queen City Performing Arts (Uptown Sound's parent org) one-colour white logo.
                   The diamonds and ball dots are knockouts (holes), so it reads on black, toxic green or footage.
                   tlc-trng-horizontal-white.png: 2026 TLC_TRNG master (ds-bundle/guidelines/logos), for photos and dark.
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
prepare-vid6/      PREPARE Vid 6 "Do you know what heats your apartment?" (9:16, 30 fps) - storyboard.md, build.sh.
                   PREPARE palette and V4/V5 cards, burned-in word captions, tracked thermostat ring, the test card
                   with a temperature graph, disclaimer card, full-frame building section (heat rises), and from beat
                   4 on the presenter cut out (tools/prep_footage.py: Robust Video Matting) over graphics. The seated
                   shot is relit there too (soft key from the matte). SFX kit synthesized by tools/make-sfx.sh.
                   Covers (thumb.html, cut-out frame FRAME):
                     3:4 TikTok          render.cjs --in thumb.html --stills 0             (1080x1440)
                     9:16 Instagram      render.cjs --in thumb.html --query ig --stills 0  (1080x1920; IG's grid shows
                                         the middle 3:4, so the design sits in y 240-1680)
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
uptown-tickets/    Uptown Sound ticket push on "10.23 Fri ET Clip" (dress rehearsal, house lights up; 9:16, 24000/1001 fps).
                   Night treatment in a WebGL grade: darker, moonlit blue, a stage light that follows the singers, the
                   concrete sunk into the dark, the venue's lime webbing glowing like blacklight. Floor fog, bats, cobwebs,
                   the work light (tools/glare_track.py) turned moon. A saucer crosses the moon, parks over stage right and
                   beams up a pile of show tickets (in bursts on the sung hits) until none are left; LAST CALL badge,
                   three headlines, end card. Clip and audio used as delivered. Build: ./build.sh path/to/clip.MOV
                   24 s cut (?cut24): tighter heist, end card by 21.5 s, picture and sound fade out over the last second.
                   Covers (the scene just after "abduction", LAY in index.html):
                     3:4 TikTok          render.cjs --in index.html --query thumb --stills 0   (1080x1440)
                     9:16 Instagram      render.cjs --in index.html --query ig --stills 0      (1080x1920, design in y 240-1680)
uptown-getover/    Uptown Sound ticket push on "10.23 Fri Get Over" (dress rehearsal, house lights up; 9:16, 24 fps).
                   Haunted countdown: the uptown-tickets night grade; the opening floor shot splits along its real crack
                   (tracked with ../prepare-vid6/tools/track.py) with fire light and a burst of bats; foreground
                   jack-o'-lanterns light on the beat; a haunted clock steps toward midnight on the beat and strikes on
                   the second "tonight"; ghosts drift through; lightning on both "tonight"s; the "bye"s blow the pumpkins
                   out as the end card comes on. Clip and audio used as delivered. Build: ./build.sh path/to/clip.MOV
                   Covers (clock, two posed ghosts, lit pumpkins; LAY in index.html):
                     3:4 TikTok          render.cjs --in index.html --query thumb --stills 0   (1080x1440)
                     9:16 Instagram      render.cjs --in index.html --query ig --stills 0      (1080x1920, design in y 240-1680)
uptown-teeth/      Uptown Sound ticket push on "10.23 Fri Teeth" (dress rehearsal, house lights up; 9:16, 24000/1001 fps).
                   From inside a vampire's mouth: SVG jaws (aged teeth, wet gum, long fangs) open on the floor shot with
                   saliva strands snapping, chomp on the strongest beats (BITES: red flash, shake, a blood drop off each
                   fang, the fangs redder every bite), shut to black for the last bite and open on the end card. Cold,
                   nearly colourless WebGL grade with a flickering stage light on the soloist and the lime wig glowing
                   mint. Title in the first Teeth reel's look. Clip and audio used as delivered. Build: ./build.sh
                   Covers (her face between the bloody fangs, the hook and date under her; frame from the 4K source):
                     3:4 TikTok          render.cjs --in index.html --query thumb --stills 0   (1080x1440)
                     9:16 Instagram      render.cjs --in index.html --query ig --stills 0      (1080x1920, design in y 240-1680)
uptown-zombiecall/ Uptown Sound ticket push on "10.23 Fri Zombie" (the venue's guitar-playing reaper prop under the ZOMBIE
                   chorus; 9:16, 24 fps). User's asks: bottom third fades to black, side vignette hides the background.
                   Cold colourless WebGL grade that also keys the brick wall to black; graveyard fog over the faded bottom
                   third; the reaper's eye sockets (tools/skull_track.py, data/eyes.js) ignite red on the first ZOMBIE and
                   flare with lightning on each one. DEAD / LAST / CHANCE and GET / YOUR / TICKETS slam in on the ZOMBIEs,
                   ONLY THE DEAD / MISS THIS SHOW on "what's in your head"; the series' zombie hands climb out of the fog
                   and drag TICKETS under before the end card. Clip and audio used as delivered. Build: ./build.sh
                   Covers (the skull close-up with the eyes lit, DEAD LAST CHANCE, POSE in index.html):
                     3:4 TikTok          render.cjs --in index.html --query thumb --stills 0   (1080x1440)
                     9:16 Instagram      render.cjs --in index.html --query ig --stills 0      (1080x1920, design in y 240-1680)
uptown-airguitar/  Uptown Sound ticket push on "10.23 Fri Air Guitar Zombie" (the reaper prop under the riff the ensemble
                   air-guitars; 9:16, 24000/1001 fps). User's asks: darken the edges only, look different from the Zombie
                   post. A rock show: stage washes that change with the music (magenta, ice, then cycling every two beats
                   after the 7.4 s kick-in), moving-head beams, a horns-up crowd in the foreground, zaps down the guitar
                   strings on the riff notes (pinned to the tracked skull), pyro on the stabs, sparks on the kick-in.
                   Chrome Metal Mania lettering (shared/fonts, OFL): ROCK ISN'T DEAD (he just looks like it), LAST CALL
                   FOR TICKETS, end card. Clip and audio used as delivered. Build: ./build.sh
                   Covers (the show frozen at the kick-in, POSE in index.html; the hook up top, series and date over the crowd):
                     3:4 TikTok          render.cjs --in index.html --query thumb --stills 0   (1080x1440)
                     9:16 Instagram      render.cjs --in index.html --query ig --stills 0      (1080x1920, design in y 240-1680)
uptown-dogdays/    Uptown Sound last-show push on "10.24 2nd Show Dog Days" (the Saturday show from the house; 9:16,
                   30 fps). The verse is "...like a train on a track", so it is a haunted railway: split-flap tiles flip
                   into ONE LAST SHOW in the dark opening; a phantom 4-4-0 steam train (skeleton conductor with a lantern,
                   jack-o'-lantern on the front, bats in the green smoke, UPTOWN SOUND on the tender) rolls into the rafters
                   on "like a train", stops in a blast of steam (ALL ABOARD!) and pulls out on DON'T MISS OUT; the old
                   station board (PLATFORM 13) lists PICK YOUR POISON / SUN 10/25 1:00 PM / FINAL CALL; "don't let missing
                   the show / RUIN YOUR DAY"; then everything turns over to the end card. Flaps land on the vocal onsets
                   (T in index.html, the train's moves in TR).
                   Clip and audio used as delivered; the frames are tone mapped from the iPhone HLG original (a plain
                   extract left the stage washed out). Build: ./build.sh
uptown-wall/       Video wall backdrop for the Pick Your Poison shows: a dusty apothecary bar (UPTOWN SOUND sign, labelled
                   bottles, alchemy rig, PICK YOUR POISON plaque on the wall above the bottles so it clears the singers'
                   heads, the poison list). The plate is an OpenArt Nano Banana Pro render plus one edit (prompt.txt has
                   both prompts and the fixes; assets/ is not committed). tools/fade_labels.py re-letters labels,
                   tools/find_medallions.py finds the brass medallions, index.html engraves the QCPA logo into them and
                   frames the plate: ?r=169 (3840x2160) or ?r=1610 (3840x2400, top and bottom carried on).
                     render.cjs --in index.html --query r=169 --stills 0 --stills-dir <dir>
                   tools/mockup.py puts a render on the venue screen in a photo (with the ensemble matted in front).
                   loop.html: the seamless 20 s loop of the still (flames sway and flicker with moving light, liquids
                   glow and bubble, vapour rises, dust drifts; every motion makes
                   whole cycles in the loop). ./build.sh renders the stills and the loop at 3840x2400, 3840x2160,
                   1920x1200 and 1920x1080 (the 4K render takes about an hour here; HD about 15 minutes).
                   tools/patch_frames.py swaps re-rendered frame ranges into a lossless loop render, for changes that
                   only touch a few seconds.
```

Setup (once per machine): `npm install puppeteer-core@24 gsap` somewhere and point `NODE_PATH` at its `node_modules`;
a Chrome / chrome-headless-shell binary (set `CHROME_PATH` if it is not auto-detected); ffmpeg.

Render a TMA graphic at 4K:

```bash
NODE_PATH=... node tools/render.cjs --in tma-pilots/04-deputy.html --out deputy.mp4 --out-width 3840
```

Retiming: each composition keeps its beat times in a `T = {...}` block at the top of its script (seconds from clip start).
PREPARE cards key off transcript words instead, so they retime themselves when `data/` changes.
