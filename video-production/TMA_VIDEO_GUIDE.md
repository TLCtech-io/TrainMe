# TMA Video Production Guide

Last updated: 2026-10-26 (Pick Your Poison social posts; guidelines, not rules). First written 2026-10-09 (research session in Claude Code using the Descript connector, drive TLC_TRNG).

Working reference for producing TrainMe (TMA) course videos in Descript with Claude. Read this before any Descript or video work, and update it as decisions are made.

**Guidelines, not rules (from the user, 2026-10-26).** Everything creative in this guide records what has worked so
far: layouts, safe areas, hooks, grades, how clips are cut. Platforms and their algorithms keep changing, so treat
these as starting points to test and refine, not absolutes. Break one when there is a reason, and say why. Firm lines
are only the ones that protect the user's work and accounts: RAW compositions stay untouched (section 1), and nothing
is published, posted or imported without the user's OK. "As delivered" in the notes below describes how a clip was
used then, not a ban on trimming.

---

## 1. Composition workflow (firm: protects the recordings)

1. **Composition 1 in every project is the RAW recording. Never edit, trim, or delete it.**
2. Duplicate RAW into a working composition for basic edits (cuts, retakes, filler removal).
3. Duplicate the working composition into a visual composition for cutaways, overlays, titles, captions, intro and outro.
4. Optionally duplicate into a Publish composition.
5. Claude does not publish, delete compositions, or touch any composition other than the one it was asked to work in without explicit approval.

**Naming going forward:** `<Series> - <Title> VISUAL` for the visual pass. First use: `IMP - Span of Control VISUAL`.

Naming observed so far:

| Project | Compositions, in order |
|---|---|
| IMP - Establishing/Transferring Command and Unified Command | RAW (14:13) > Working Draft (12:20) > Draft (12:20, published) |
| IMP - Management By Objectives | RAW (37:54) > WORKING Draft (26:46) > Draft Lessons 1.1, 1.2, 1.3, 1.4 (5:20 to 8:03 each) |
| IMP - Span of Control | RAW (18:11) > WORKING (17:15) |
| Prepare_Vid 5 | RAW > Edits > TLC Edits > Publish |
| Prepare_Vid 6 RAW | RAW (1:21) > Edits (1:05; user's cleanup: word gaps, Studio Sound, eye contact, light filters) |

Long IMP recordings may be split into lesson-length drafts (MBO became four lessons).

---

## 2. Reference example: what "done" looks like

- **Project:** IMP - Establishing/Transferring Command and Unified Command (folder `IMP - RIck/Complete`), id `d2d7847c-6f90-4625-bd42-d36ab0b377cc`
- **Reference composition:** "Draft: IMP - Establishing, Transferring, and Unified Command", id `34a46334-5d7e-4d5d-af56-40340fd98a82`, published unlisted at https://share.descript.com/view/9AaAfgeOEDP
- The Working Draft (`531e7fc6-422e-4cb4-9aaa-fb445886d07c`) is structurally identical; the visual pass was done there and then duplicated.
- Source of this breakdown: Agent Underlord read-only inventory of track and scene data (not rendered frames).

### Format and pacing
- 3840x2160 (4K), 12:20 runtime, 73 scenes (1 intro, 71 body, 1 outro).
- The visual changes about every 8 to 10 seconds.

### Structure
- **Intro (0:00 to 0:06):** layout "IMP Intro" from the TMA Templates pack.
  - Amber background (255,203,115).
  - TrainMe-11.png logo, top center, from 0:00.
  - Lesson title, Roboto, white, lower third (y about 74%), from 0:02.6.
  - TrainMe-14.png banner, bottom center, from 0:03.6.
  - "Laser Ray" sound effect for the full 6 s, gain 1.0.
- **Body:** Rick is mostly voice-over.
  - About 55 to 60 of the 71 body scenes are full-screen cutaways.
  - About 7 scenes are speaker plus a graphic overlay.
  - Rick alone on camera only in short gaps (under 1 s).
- **Outro (12:13.5 to 12:20.6):** layout "TMA Outro".
  - Amber background, TrainMe-11-1.png logo center.
  - "Thank You" title at right from 12:18, TrainMe-12.png banner at right from 12:18.3.
  - "Lunar Orbit" music at gain 0.316 (about -10 dB).
- 0.4 s smart transitions at the intro and outro edges.

### Visual vocabulary (body)
- **Literal stock cutaways** matched to what Rick is saying: firefighters for first responders, relay baton for transfer, dispatch center for "operator", hospital lobby for healthcare stakeholders.
- **Humor beats** with GIFs and stickers: clowns for "not quite so qualified", Spider-Verse for "maybe that someone is you", Obama "change", "with great power" GIF, Yes/No sticker.
- **AI-generated cinematic clips and stills** for the running scenario (the loading dock chemical spill). Muted.
- **Custom "IMP Images" graphics** (png and mp4) for concepts.
- **Concept text that builds in sync with speech:**
  - "Training + Exercise = Prepared", one word per line at right, image card at left.
  - Side-by-side cards: "Incident Command" vs "Project Management".
  - **Objectives > Strategies > Tactics tree** at 4:21, appearing row by row in a 1-2-4 layout. Intentional: one objective breaks down into multiple strategies, and each strategy may have several tactics.
  - Numbered list building item by item: the transfer-of-command briefing "1. Problem, 2. Priorities, 3. Accomplished, 4. Urgent Needs" (10:09 to 10:33) over footage, image card at left.
  - End recap list in blue, one line at a time, Recap sticker at left, light grey background.
- **Section titles at topic changes:** "Your Mission?", "UNIFIED COMMAND", "Transferring Command".
- **Cross-reference callout:** blue rectangle with "Future Unit: Comprehensive Resource Management Dispatch and Deployment".
- **Status beats:** "Problem Solved!" then "Command Terminated" in blue.
- Several titles and cards start off-canvas, so they slide in.

### Captions
- On for the full body, off in intro and outro.
- Roboto, white, box about 88% wide, centered at y about 84%.
- Black gradient scrim behind the captions (y about 89%).
- Captions and scrim move to the top (y about 17%) when a graphic occupies the bottom of the frame.

### Typography and color
- Roboto for titles and captions. Manrope used once ("UNIFIED COMMAND").
- White text over footage. Blue (44,126,244) for accents, recap text, and callout boxes.
- Backgrounds: amber (255,203,115) for intro and outro, white, light grey (239,239,237).
- The "TMA Templates" layout pack also has TMA layouts in blue, yellow, and grey variants.

### Audio
- Voice at gain 1.0. No music bed under the body. No ducking.
- Intro sound effect Laser Ray (1.0). Outro music Lunar Orbit (0.316).
- AI-generated clips are muted. Default going forward: mute cutaway audio unless it is intentional.

### Branding assets (in the reference project's media)
TrainMe-11.png, TrainMe-11-1.png, TrainMe-12.png, TrainMe-13.png, TrainMe-14.png, TrainMe Dark w Shadow.png

---

## 3. Known issues in the published reference

- **On-screen typo:** the title reads "1. Probem" at 10:09 in the published Draft composition.
- **Cutaway clips with their own audio still on (gain 1.0):** Authority Text Highlight Animation; hand of businessman signing document; Athletes relay race; Social Network People Icon; Problem Solving Handwriting; IMP Images-2.mp4; People of different nationality; Corporate business structure animation. Check for stray sound.
- **Stale layer names (cosmetic):** "Incident Command" on the Project Management title, "1. Probem" on all four list items, "Establishing" on the recap items.

---

## 4. Content context: IMP series

- **Instructor:** Rick Christ. Recorded in Descript Rooms with Travis (separate tracks for Rick, Travis, and Rick's screen).
- **Audience:** leaders who run projects or crises in any setting (business, healthcare, municipal, nonprofit), not only first responders. Incident command principles taught as general management practice.
- **Tone:** practical, plain spoken, light humor, concrete scenarios (loading dock chemical spill, "Martha, put together a team", Mission Impossible).
- **Units referenced so far:** Establishing, Transferring, Unified, and Terminating Command; Management by Objectives; Span of Control; Modular Organization; Comprehensive Resource Management, Dispatch, and Deployment. Separate course: Continuous Improvement.
- **Reference lesson outline:** establishing command (no-notice vs assigned) > delegation of authority and its limits > serving stakeholders > unified command > control centers > transferring command (4-part briefing) > terminating command (demobilize, announce, after-action review) > recap.

---

## 5. Project status (2026-10-09)

Folder `IMP - RIck`:

| Project | Project id | Compositions | Status |
|---|---|---|---|
| IMP - Span of Control | `ef5c9feb-d4c2-40f3-805b-8ccd00d1d811` | RAW `b92bcb95-ee49-4ead-9b06-300c7eb1ac7b` (18:11); WORKING `0bc559be-4ee4-4311-bd21-bf4471e1c905` (17:15) | **Next up.** Some assets already imported (s1.png, s8b/s9b/s10b.mp4, B03.png, an OpenArt image, a Regenerate audio patch). No visual composition yet. |
| IMP - Management By Objectives RAW | `4ca04f93-f200-426f-ba15-80399c9a113f` | RAW; WORKING Draft; Draft Lessons 1.1 to 1.4 | Split into four lesson drafts. No overlay media in the project yet. |
| IMP Recording 091726 | `820ef294-30f6-47ac-a8b9-4d8f32809b12` | Recording 1 (28:11); Recording 2 (1:47); Copy of Recording 2 (0:44); Untitled (0:07) | New Sep 17 session with Travis and Rick. Topic not yet identified. Not yet in the RAW/WORKING structure. |

- `IMP - RIck/Complete`: Establishing/Transferring Command (the reference above).
- `IMP - RIck/In Dev`: empty.

---

## 6. PREPARE series (separate style)

- **PREPARE/Social Media Posts:** "Two-Minute Tuesday" urban preparedness series.
  - "Prepare Batch: 09/20/26" holds one 12:53 batch recording cut into topic videos with two hook variants each (V0 Intro, V1 Water, V2 Alerts, V3 Apartment; Hook A and Hook B).
  - Per-video projects "Prepare_Vid 0" to "Prepare_Vid 5 RAW" follow RAW > Edits > TLC Edits > Publish.
  - Uses Lato and custom per-video graphics (for example V5_01_laundry.png).
  - The full batch master ("preapre_batch_1 DO NOT USE.MP4") is in each project.
- **PREPARE/Audio Book Chapters:** 2024-25 audiobook (opening credits, intro, Chapters 1 to 12, conclusion, credits).
- **PREPARE look (design system):** Dropbox `/2_TLC_TRNG/4_Branding/ds-bundle/guidelines/brand-design-system.md` §4.1.
  - Palette `--prep-*`: storm #3F6A72 (dominant), harbor #1A2A33, gold #E3BE6A (the one accent), gold-deep #7A5A12,
    dawn #F1E5BD, fog #E4EAE8, grid #8C94A6 (linework only). Ratio 60-70% storm + harbor, 20-30% fog/dawn, 5-10% gold.
  - Sign-off lockup: `[TLC_TRNG logo] | PREPARE`, logo cap height equal to the PREPARE letters.
  - Typography (working): Montserrat 600-900 heads, Open Sans 400/600 body.
- **PREPARE card system** (Batch 1 Graphics V4 and V5 PNGs, 1080x1920 with transparency): card 920 px wide at x 80,
  harbor at 96%, 9 px gold top edge on 30 px corners, big soft shadow. Montserrat 800 header (white), Open Sans 600
  dawn subtitle, rows of Open Sans 600 with 58 px grid-grey outline icon rings, gold letter-spaced Montserrat 800 labels
  ("ALSO YOURS", "NOT ON IT").
- **Published PREPARE videos (V4, V5):** Descript captions in the upper part of the frame (V4 blue word box, V5
  uppercase with yellow highlight on a dark band); cards low over the torso; stickers; loudness about -24 LUFS, peaks
  -6 to -7 dBFS (Descript publish default). Keep new videos at the same level.

---

## 7. Tooling notes for Claude sessions

- **Descript drive:** TLC_TRNG (`2b2b711e-5ac0-4f70-aef7-808cc0120e0f`). The folder is spelled "IMP - RIck".
- **Layout pack:** "TMA Templates" (`97a12106-fb91-44ee-9745-cfb73ab9b7fe`). The API cannot open template projects. Layout names known so far: "IMP Intro", "TMA Outro".
- **Agent Underlord:**
  - For read-only questions, say READ-ONLY explicitly and tell it not to change anything.
  - A full inventory of a 12-minute composition cost about 7.7 AI credits.
  - Its result can report `project_changed: true` even when nothing changed. Confirm with `get_project` (`updated_at`).
  - It reads timeline data, not pixels. Text baked into images or GIFs is invisible to it.
- **wait_for_job:** pass `wait_seconds` of 50 or less. The client times out at 60 s.
- **Cloud sessions:** `share.descript.com` is blocked by the default network policy, so published videos can't be downloaded for frame review. Allow it under the environment's Network access settings, or run Claude Code locally. Descript's media upload host may also need allowing (not yet confirmed).
- **Cloud container tools:** ffmpeg 6.1, Node 22, Python 3, headless Chromium.
- **Cloud network (2026-10-23):** full network access. Dropbox downloads work (single-use links from the Dropbox
  connector). `share.descript.com` pages are reachable, and a publish with downloads enabled carries a direct MP4 link
  (`api.descript.com/v2/published_projects/<id>/download?...` in the page) and a subtitles VTT, so footage can come from
  the user's own publish without Claude publishing anything. GitHub release downloads work (Robust Video Matting model).
- **Cloud network (2026-10-09):**
  - Reachable: npm registry, GitHub, storage.googleapis.com, S3, fonts.gstatic.com.
  - Blocked: all Descript hosts, Dropbox content, Hugging Face (so no Whisper model download), Instagram, TikTok, Google Drive.
- **Auto-mode safety check:**
  - It flags actions in connected apps the user did not explicitly ask for, such as publishing a Descript composition. Get the user's OK first.
  - It also blocked the HyperFrames CLI after that flag. Use `motion/tools/render.cjs` instead.
- **Audio: Claude cannot listen. Do not repeat the E.T. "draft 3" approach (user verdict 2026-10-19: "terrible, don't ever do that again").**
  - That pass ran AI dereverb (UVR-DeEcho-DeReverb via audio-separator) and a large fitted EQ (+10 dB bass, deep mid scoop) on a phone recording of a cappella. The measurements looked right; the result sounded terrible.
  - Never run AI separation or dereverb models, or make big EQ moves, on performance audio again.
  - The most Claude does unprompted is the gentle `motion/tools/soften_audio.sh` chain (E.T. draft 2): small EQ moves, dynamic de-harsh, light compression, -14 LUFS.
  - For anything stronger ("studio sound", less room, more bass), the user processes the audio where they can hear it (for example Descript Studio Sound with its intensity slider) and Claude swaps the exported audio into the reel.

---

## 8. Reference: "The Claude Edit Playbook" (Mr. Paid Social)

13-page PDF by Caleb Kruse (Mr. Paid Social), shared by the user on 2026-10-09. It is the method behind the social media videos about Claude editing video. The PDF itself is not committed (third-party, gated content).

**What it does:** turns one raw talking-head take into a branded 9:16 motion-graphics ad: a designed card for every spoken line, word-synced karaoke captions, about 40 sound-effect hits, a music bed, and A/B hook variants. Claude Code runs every step.

**Stack:**
- Claude Code (runs the whole playbook)
- HyperFrames (npm `hyperframes`, HeyGen, Apache-2.0): renders video from one HTML file driven by a paused GSAP timeline. It also transcribes (Whisper), lints, and snapshots.
- ffmpeg / ffprobe: probe, crop, cut, verify
- ElevenLabs API: SFX kit and music bed (needs an API key)
- Puppeteer: scripted screen capture of a website for B-roll
- GSAP, bundled locally

**Phases:**
1. Probe and crop (a wide "band" crop plus a tight 9:16 crop from a 4K 16:9 source).
2. Transcribe with word timestamps. The transcript drives everything.
3. Pull brand tokens (palette, logo, real screenshots) into one CSS token block.
4. Record site B-roll.
5. Storyboard one card per spoken line, written as a file. Framing modes: split, solo, fullhim, full. Card archetypes: count-up, stamp, before/after, strike-through list, one-word takeover, social proof, guarantee, CTA.
6. Build: hand-design about 18 cards and generate the repetitive 90% (captions, SFX markup) from the transcript.
7. Sound design: a 12-sound kit reused across about 40 hits. Music bed 18 to 20 dB under the voice.
8. QA with snapshot contact sheets, render, verify the file with ffprobe. Hook A/B variants are cut from one master.

**Gotchas worth keeping:**
- Re-encode all media with a keyframe every second (`-g 30 -keyint_min 30`).
- Every video and audio element needs a unique id.
- End each caption chunk at the next chunk's start minus 0.04 s.
- All assets local, no CDN.
- About a third of generated SFX come back near-silent. Audit them.
- Verify duration and audio on the rendered file, not the render log.
- Never overwrite an approved cut.

**Fit for TMA (draft, not yet decided):**
- **PREPARE "Two-Minute Tuesday":** a near-direct fit. Short, vertical, and the team already cuts Hook A/B variants.
- **IMP lessons:** adapt rather than copy. Lessons are 12 to 18 minutes, 16:9 4K, and teaching rather than selling.
  - Use "one visual per idea", not one card per sentence, and keep the TMA look from section 2.
  - **Option A:** Claude builds the concept cards as rendered clips and they are imported into the VISUAL composition. Descript keeps cuts, stock cutaways, captions, and the intro and outro layouts.
  - **Option B:** Claude renders the whole visual pass with HyperFrames, and the finished MP4 is imported back into Descript.
- **Candidate training card archetypes:**
  - hierarchy tree (Objectives > Strategies > Tactics)
  - numbered build list
  - side-by-side comparison
  - equation card ("Training + Exercise = Prepared")
  - scenario dialogue card (radio call)
  - section title
  - cross-reference callout ("Future Unit")
  - key-term definition
  - recap list
- **Unknowns:**
  - whether Descript keeps transparency on imported video
  - ElevenLabs key and budget
  - stock footage sourcing outside Descript

---

## 9. Motion pipeline and first builds (2026-10-09)

Source lives in `video-production/motion/` (see its README). HTML + GSAP compositions, rendered frame by frame in local headless Chrome by `motion/tools/render.cjs`, encoded with ffmpeg. This is the HyperFrames model; the HyperFrames CLI itself was blocked in the cloud session (see tooling notes), so the renderer is a small local stand-in. Fonts and GSAP are bundled; no network at render time.

**TMA pilot graphics: IMP Span of Control (Option A from section 8)**
- Four 3840x2160 30fps MP4s, full-frame cutaways, timed to the WORKING composition transcript:

  | Clip | Place at (WORKING) | Length | Shows |
  |---|---|---|---|
  | SoC pilot 1 - Three topics | 0:08 | 20s | Agenda builds one topic at a time |
  | SoC pilot 2 - Burner limit | 0:40 | 22s | Rick's range: 6 burners, span of 3, the 4th burner overloads |
  | SoC pilot 3 - 1 to 5 ratio | 6:44 | 39s | NIMS 1:5 org chart, then search and rescue: 12 on level ground vs 4 in rough terrain |
  | SoC pilot 4 - Deputy math | 13:41 | 40s | +1 deputy, -3 positions = 2 fewer reports; then +3 support, -9 = 6 fewer |

- **Style:** TMA light grey background, Roboto, blue/amber/red accents, white cards.
- **Captions:** the bottom 22% of the frame stays clear for Descript's captions.
- **Timing:** comes from paragraph timecodes. Each file's `T = {...}` block retimes it.
- **Status:** awaiting the user's review. Not imported into Descript yet.

**PREPARE Vid 5: Claude Edit Playbook version**
- **Storyboard:** `motion/prepare-vid5/storyboard.md`, 11 cards for 14 transcript lines.
- **Framing:** all four modes (split, solo, fullhim, full).
- **Captions:** word-synced, Lato Black, PREPARE yellow highlight.
- **Retention layer:** progress bar plus zoom punches.
- **Sound:** about 40 SFX hits from a locally synthesized kit (stand-in for ElevenLabs). No music bed yet.
- **Cut:** pauses are tightened from 50s to 43.1s by `data/cuts.json`.
- **Build:** `./build.sh path/to/base.mp4`.
  - Without footage it builds with placeholder footage (silhouette plus source timecode), so the cards and timing can be reviewed.
  - The real build needs a download of the "Prepare_Vid 5 Claude Base" composition (= Edits).
- **Word timing:** spread across Descript SRT phrases by word length (no word-level timestamps available in the cloud session). Close, but a whisper or word-level pass would tighten it.
- **PREPARE style (from Agent Underlord, Publish composition):**
  - 1080x1920 canvas, from 4K vertical source footage.
  - Captions "Bold: Yellow highlight" (Lato 900, active word #FFD02B / #FFCB73, dark translucent box).
  - "YOURS" title in Roboto 900 red #E62324.
  - Amber gradient panels fading from slate to #FFCB73.

**Descript changes made this session (PREPARE/Social Media Posts/Prepare_Vid 5 RAW, `2d388f1a-...`):**
- New composition "Prepare_Vid 5 Claude Base" (`68291c95-39c2-4a46-9ec5-78fe80f63e4f`), a duplicate of "Prepare_Vid 5 Edits", made by Agent Underlord. No other composition was touched.
- A **private** publish of "Prepare_Vid 5 Claude Base" was started to download the footage. The auto-mode safety check then flagged it as an unrequested action in a connected app, so the job was not followed up. A private share page may exist for that composition. Delete it in Descript if unwanted.
- Agent Underlord credits used this session: about 21 (two read-only inventories at 7.7 each, one duplicate at 5.8).

---

## 10. PREPARE Vid 6: "Do you know what heats your apartment?" (2026-10-23)

- **Source:** `PREPARE/Social Media Posts/Prepare_Vid 6 RAW` (`3651677d-a832-482b-b947-e6a69a4e789d`), composition
  "Prepare_Vid 6 Edits" (`66768f19-...`, 64.6s), downloaded from the user's own unlisted publish. Nothing was changed
  in Descript.
- **Beat sheet:** Cowork, 10/22 (the .docx is the latest). Brief from the user: a disclaimer card in PREPARE colors;
  the heat-rising animation may go full frame and replace him; from beat 4 on he can be cut out over graphics or
  moved; better lighting on the seated shot (no portable light that day); captions added as part of the pass this
  time (normally the user adds them in Descript).
- **Build:** `motion/prepare-vid6/` (see its storyboard.md). Cards follow the V4/V5 spec in section 6. Captions are
  burned in: Montserrat 800 uppercase on a harbor pill, active word gold, low in frame. Cards sit high.
- **Presenter cut-out:** Robust Video Matting (MobileNetV3 TorchScript, CPU, about 0.25 s a frame) gives a clean matte,
  hair included.
- **Relight:** a soft key that follows the head (from the matte), a small lift, slightly cooler white balance, and the
  room eased down 14%. Gentle by design.
- **Captions and timing:** whisper medium.en word times, checked against Descript's subtitle VTT. Whisper skipped one
  sentence on the first pass; that window was re-run on its own.
- **Audio:** the voice is untouched (the residual of mix minus voice is -138 dBFS outside the SFX cues). The SFX are
  synthesized and sit 5-8 dB under the voice peaks. Loudness matches V4/V5 (about -23.5 LUFS).
- **Covers:** TikTok takes the 3:4 (1080x1440) as-is. The Instagram Reels cover is 9:16 (1080x1920); IG center-crops
  a 3:4 upload to 9:16 (cutting the sides), and its profile grid shows the middle 3:4 of the 9:16. So make a 9:16 for
  IG with the whole design inside y 240-1680 (user found this out on 2026-10-23). Make both for every PREPARE video.
- **Open decision:** the beat sheet's pipes sentence on the disclaimer card is off (`DISCLAIMER_PIPES` in
  index.html).

## 11. Safe area for Reels and TikTok (guideline from 2026-10-25)

The user flagged that text in the bottom third sits in the IG/TikTok "danger zone". Neither platform publishes one
official organic spec, and third-party guides disagree, so we use the overlap of the most-cited numbers for a
1080x1920 frame:

| Edge | Keep clear | Why |
|---|---|---|
| Top | 0-250 px | Instagram's header (guides give 108-250); TikTok's top bar is about 130-150. |
| Bottom | 1400-1920 px (bottom 520) | TikTok's caption, music and profile block is about 484 px and grows with a long caption; Instagram is about 320-450. Meta's ad guidance is stricter (bottom 35%, i.e. above y 1248); use that for ads. |
| Right | x 940-1080, below y 840 | TikTok's like/comment/share column (Instagram's sits lower on the right too). |
| Left | 0-60 px | A small margin both platforms suggest. |

So by default every word, date, logo and CTA lives in **x 60-940 (to 1020 above y 840), y 250-1400**. Footage, effects and art can
run edge to edge. Each composition can draw the zone with `?safe` (first in `motion/uptown-dogdays/index.html`).
Sources checked: outfy.com, campaignswift.com, adchecklab.com, reelsafezone.com, postplanify.com, bevyl.ai,
imagevideofit.com (Instagram and TikTok safe-zone guides, 2026).

### iPhone HDR clips (from 2026-10-25)

The venue clips come off iPhones as 10-bit HDR (HLG transfer, BT.2020, Dolby Vision). Extracting frames with a plain
`scale` reads them as SDR, which leaves the stage grey and washed out (the user flagged it on "10.24 2nd Show Dog
Days"). Check with `ffprobe -show_entries stream=color_transfer`; for `arib-std-b67` (HLG) tone map when extracting:

```
-vf "zscale=tin=arib-std-b67:pin=bt2020:min=bt2020nc:t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,scale=1080:1920"
```

Hable at 100 nits kept faces and costume colours best of hable/mobius/reinhard at 100-203 nits. After this, a grade
only needs a touch (the Dog Days post uses `contrast(1.03) saturate(1.05)`). Every Uptown clip so far except
uptown-toxic is HLG; only uptown-dogdays has been redone this way.

## 12. Social performance and hook guidelines (from 2026-10-26)

Instagram was the main outreach channel for Pick Your Poison (collab posts, cross-posted to Facebook). The goal before
the next show is to grow a TikTok audience. The user asked that every new post draw on platform feedback and on
ongoing analysis of the FB, TikTok and IG algorithms.

### Performance log

The numbers are 24-hour insights from the IG Edits app's "Edits Assistant", compared with the account's recent average.
Add every post here.

| Post | Posted | Views | Likes | Shares | Comments | Skip rate (first 3 s) | First 3 seconds |
|---|---|---|---|---|---|---|---|
| One Last Show (uptown-dogdays) | Sat 10/24 PM | 282 (-11%) | 2 (-60%) | 3 (avg) | ? | 60.6% | Dark rafters (the camera finds the stage at 3.4 s); split-flap tiles flip in on black and land ONE LAST SHOW at 2.7 s |
| Rock Isn't Dead (uptown-airguitar) | Sun 10/25 AM | 265 (-15%) | 4 (-80%) | 3 (avg) | 2 (avg) | 78.4% | ROCK ISN'T at 0.2 s, DEAD at 2.2 s, the joke at 2.75 s; tickets only at 4.7 s; the light show kicks in at 7.4 s |

The assistant's descriptions are AI summaries and can be wrong: it named "Austin City Arts" and a "Don't miss the
train" line, and neither is in our video. Trust its numbers more than its descriptions.

### What the numbers say

- **Both posts lost most viewers in the first 3 seconds.** People who kept watching still shared at the usual rate,
  so the content works once it is seen. The weak point is stopping the scroll.
- **Our openings made people wait.** The message took 2-3 s to animate in. The faces and the payoff (the stage, the
  harmony, the light show) came later still. The user hands over clips already trimmed to what has worked before, and
  I built each post on the clip as delivered, so it opened wherever the clip did (One Last Show opened on the camera
  still finding the stage). Trimming was never off the table; I didn't suggest it.

### Guidelines for new posts

These are starting points from two posts' worth of data. Test them, and let the numbers move them.

1. **Faces and sound by the first second.** Open on the group singing. If a clip opens on dead footage, trim it or cut
   a cold open (the best 1-1.5 s of faces and harmony first, then the clip), and say so when delivering.
2. **The hook is readable in frame 0.** Big, plain words that state the stakes ("FINAL SHOW SUNDAY 1PM"), in the safe
   area (section 11), legible with the sound off. Animate around the text, not into it: no split-flap or letter-by-letter
   reveals that leave frame 0 empty.
3. **Say why to watch, then what to do.** The date and the ticket line come within the first 3 s. Jokes and set pieces
   come after.
4. **Keep the stakes true.** It was the last show of this run, not the group's "last show ever" (the assistant
   suggested that wording).
5. **Comment prompts should be real questions** ("Which song do you want to hear?"). Meta has long demoted engagement
   bait such as "comment YES if...", and an emoji-on-command prompt ("Drop a 🚂 if you're coming") is close to that.
   This matters most on the Facebook cross-post.
6. **3-second QA before delivery.** Look at the frames at 0, 1 and 2 s. A muted viewer should know what it is and why
   to stay. Report this check with every draft.
7. Keep what worked: the themed concept (the departure board was called memorable and on-brand), the covers, and the
   safe area.

## 13. DST commercial: a new video type (planning, from 2026-10-30)

A 30-60 s commercial-style highlight of the TLC_TRNG Decision Support Tool (DST), for a conference booth loop and the
website. 16:9, narrated with a Descript AI voice.

### The demo site

- **URL:** https://tlctrng.demo-dst.com (HTTPS only). It is reachable from the cloud session, and Playwright's Chromium
  loads it (launch with `proxy: { server: process.env.HTTPS_PROXY }`).
- **Login:** a plain email and password form, with no Microsoft or Google sign-in buttons. Whether a phone code follows
  sign-in is not known yet.
- **The data is simulated.** The public overview PDF (linked from the login page, `/overview.pdf`, 10 pages) says so,
  and says the demo works the same way as the live tool. It is safe to show in a public video.
- **Credentials** come from environment secrets, never chat: `DST_USER` and `DST_PASSWORD` (set in the cloud
  environment's settings, under Network secrets or as environment variables). Only a new session picks them up.
- **Capture size:** at a 1920 px wide viewport the login card stretches edge to edge. A 1280x720 viewport with
  `deviceScaleFactor` 1.5 (1920x1080) or 3 (3840x2160, for zooms) looks like a laptop screen and reads on a booth TV.

### What the tool does (from the overview PDF)

- **Critical Assets:** processes, systems and facilities. Each has a **Restoration Score**: a formula that combines the
  operational category, the priority within that category, and the number of downstream dependencies. Higher scores
  are addressed first.
- **Asset Details:** score, priority, department, program office, contact, description, impact statement, clickable
  dependencies, and Critical Questions with Short-Term Options.
- **Scenarios:** compare several disrupted assets, ranked by Restoration Score.
  - Each asset shows its **Direct Downstream** and **Total Cascade** impacts.
  - Short-Term Options are ranked by asset.
  - What-if toggles show what changes if a workaround applies or something can't be fixed.
  - Notes are time-stamped.
  - Scenarios can be saved.
- **Report:** a PDF that leads with Critical Questions and Initial Actions, plus an Executive Summary. **Share Summary**
  opens the phone's share sheet.
- **Map and weather:**
  - facilities on a map, with NWS current conditions and a 24-hour forecast;
  - a radar loop, and an alert icon that turns red when an NWS alert is active nearby;
  - a circle-radius or polygon tool that finds the facilities inside an area and adds them to a scenario.
- **Home:** Current Scenario, Saved Scenarios, Map, Critical Contacts, and tiles for each asset type.

### From the public page (https://tlctrng.com/dst)

- **Lines worth reusing:**
  - "Prioritization reference for TLC_TRNG leadership during disruptions to critical processes, systems, and
    facilities." This is the tool's own home-screen tagline.
  - "Higher score, addressed first."
  - The report "is the artifact a duty officer actually hands to leadership."
  - "A real build uses your assets, your dependencies, and your contacts."
- **Call to action:** "Ready to operationalize your own plans?", then Book a Live Demo, or info@TLCTRNG.com. The
  public demo itself is behind a short access form at tlctrng.com/dst.
- **The page's suggested demo path:**
  1. Open Systems & Technology and pick an asset near the top. Read its Impact Statement, then click the dependency
     block.
  2. Add it to a scenario, then Multi-Select three or four more and watch the ranking and cascade change.
  3. Generate the report.
  4. Optionally, draw a radius on Map / Weather and add the facilities it captures.
- **Built mobile-first.** Phone shots (home screen, the Share Summary share sheet) belong in the spot alongside the
  desktop views.
- **The demo is a fictional organization with sample data.** Put a small "Demo data" note on screen wherever the
  tool appears, so nobody reads it as a real client's plan.
- **Look:**
  - The UI is navy with amber and mustard accents, a green Map tile, and red DISRUPTED chips.
  - The page's own screenshots sit in a Mac browser frame and an iPhone frame.
  - Use the TLC_TRNG brand design system (section 6) and `motion/shared/brand/tlc-trng-horizontal-white.png` for the
    end card.
- **Screen names seen in those screenshots:**
  - the Home tiles: Processes, Systems & Technology, Facilities, Scenario Builder, TLC_TRNG Map, Critical Contacts,
    Current Scenario, My Scenarios;
  - What-If Analysis states: Disrupted, Being Fixed, Manual Ops, Unable to Repair;
  - the report title: "Scenario Impact Report".

### A possible story spine (to check against the DST session's brief)

Storm warning on the map → draw the impact area → the facilities inside drop into a scenario → the tool ranks what to
restore first and shows the cascade → a what-if toggle changes the plan → one tap shares the summary with leadership.

### Working plan

- **The DST Code session writes a fact brief.** It covers:
  - the users and the problem;
  - the top features, with exact screen names;
  - the best demo workflow;
  - terms to use and avoid;
  - anything not shipped.
- **I write the narration and storyboard from it,** and the DST session fact-checks them. At about 150 words a minute,
  30 s is about 75 words and 60 s about 150.
- **Built to work muted.** Booth screens usually play without sound, so on-screen text carries the message and the
  narration supports it. The ending loops back into the opening. Export 30 s and 60 s cuts from the same shots.
- **Voice first.** Make the Descript AI voice from the final script, then time the picture to it (word timings).
- **Capture with Playwright:** high-resolution stills for zooms and callouts, plus short scripted clips of clicks,
  typing and scrolling. Capture from a shot list matched to the script.

## 14. Open items

- [ ] **DST commercial:**
  - The user adds `DST_USER` and `DST_PASSWORD` as environment secrets, then starts a new session for the capture.
  - The DST Code session writes the fact brief.
  - Then: script, voice, shot list, capture, build.

- [ ] **Before planning content for the next Uptown Sound show:**
  - Research the current FB, TikTok and IG ranking signals (hook and retention, shares and saves, TikTok search
    keywords, original audio, posting cadence) and fold the findings into section 12.
  - Collect the 24-hour and 7-day insights for the other posts (ET, Get Over, Teeth, Zombie, Zombie Last Call, Tickets,
    Silence, Toxic) so their openings can be compared.
  - Try opening variations (cold open, trim, text-first) and log which hold viewers past 3 s.
- [ ] **PREPARE Vid 5 footage:** either approve the private publish/download of "Prepare_Vid 5 Claude Base", or export it from Descript and run `./build.sh base.mp4` locally. Then import the render into the Prepare_Vid 5 project as a new composition (requested by the user).
- [ ] **Review the four TMA pilot graphics.** On approval, import them into IMP - Span of Control and place them in a VISUAL composition.
- [ ] Optional upgrades: ElevenLabs SFX and music bed (API key), word-level timestamps (whisper locally).
- [ ] PREPARE Vid 6 draft 1: user review. On approval, import into Prepare_Vid 6 RAW as a new composition (needs an OK).
- [ ] Add notes from the Cowork "tool stack" session and the "TMA IMP visual development" session when the user provides them.
- [ ] Span of Control: duplicate WORKING into "IMP - Span of Control VISUAL", map the transcript, propose an overlay plan for approval, then build.
- [ ] Decide whether to fix the "1. Probem" typo in the published reference.
- [ ] Identify the topic of IMP Recording 091726 and set it up as RAW > WORKING.
- [ ] Review the social media reference videos the user shared on Claude video creation (not yet viewable from the cloud session; instagram.com, tiktok.com, and drive.google.com are blocked by its network policy):
  - https://www.instagram.com/reel/Db4PVCotlC4/
  - https://drive.google.com/file/d/16B3nj9giJTLqyFDwmVYlO2KHZ_c_drr2/view
  - https://www.tiktok.com/t/ZPL6DWmwK/
  - https://www.instagram.com/p/Ded-wGdmOio/ (@claudetipsandtricks; the user flagged it for its motion graphic examples, 2026-10-15)
- **Status (2026-10-15, after the environment was set to Full network access):**
  - **Instagram (both posts):** still not viewable. Instagram returns no media without a logged-in account. Workaround: the user screen-records or saves the clip to Dropbox, which can now be downloaded.
  - **Google Drive link:** an 8-page short version of the Mr. Paid Social Claude Edit Playbook (section 8). Nothing new. The user does not use Google Drive; Dropbox and OneDrive are their file connectors.
  - **TikTok (@dominiccapaci, 43s):** "Claude edited this whole video and every layer is still mine in CapCut."
    - Raw footage with bad takes goes in, and an edited video comes out about 20 minutes later.
    - The style switches with one sentence ("aesthetic": warm grade, floating thumbnails, magazine-cover titles; "moody": darker grade, big titles).
    - His key point: most people get a flat video back. His system delivers a fully editable project in CapCut, so small tweaks are done by hand. The skill itself is gated behind "comment EDIT."
    - **Takeaway for TMA:** the same principle applies to Descript. Deliver editable layers (separate graphic clips placed on the timeline, captions as Descript captions) rather than only a baked MP4, so the user can nudge timing and text without re-rendering. Named style presets map to swapping a token set (see `motion/shared/tma.css`).
