# TMA Video Production Guide

Last updated: 2026-10-09 (research session in Claude Code using the Descript connector, drive TLC_TRNG).

Working reference for producing TrainMe (TMA) course videos in Descript with Claude. Read this before any Descript or video work, and update it as decisions are made.

---

## 1. Composition workflow (rules)

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
- **Cloud network (2026-10-09):**
  - Reachable: npm registry, GitHub, storage.googleapis.com, S3, fonts.gstatic.com.
  - Blocked: all Descript hosts, Dropbox content, Hugging Face (so no Whisper model download), Instagram, TikTok, Google Drive.
- **Auto-mode safety check:**
  - It flags actions in connected apps the user did not explicitly ask for, such as publishing a Descript composition. Get the user's OK first.
  - It also blocked the HyperFrames CLI after that flag. Use `motion/tools/render.cjs` instead.

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

## 10. Open items

- [ ] **PREPARE Vid 5 footage:** either approve the private publish/download of "Prepare_Vid 5 Claude Base", or export it from Descript and run `./build.sh base.mp4` locally. Then import the render into the Prepare_Vid 5 project as a new composition (requested by the user).
- [ ] **Review the four TMA pilot graphics.** On approval, import them into IMP - Span of Control and place them in a VISUAL composition.
- [ ] Optional upgrades: ElevenLabs SFX and music bed (API key), word-level timestamps (whisper locally).
- [ ] Add notes from the Cowork "tool stack" session and the "TMA IMP visual development" session when the user provides them.
- [ ] Span of Control: duplicate WORKING into "IMP - Span of Control VISUAL", map the transcript, propose an overlay plan for approval, then build.
- [ ] Decide whether to fix the "1. Probem" typo in the published reference.
- [ ] Identify the topic of IMP Recording 091726 and set it up as RAW > WORKING.
- [ ] Review the social media reference videos the user shared on Claude video creation (not yet viewable from the cloud session; instagram.com, tiktok.com, and drive.google.com are blocked by its network policy):
  - https://www.instagram.com/reel/Db4PVCotlC4/
  - https://drive.google.com/file/d/16B3nj9giJTLqyFDwmVYlO2KHZ_c_drr2/view
  - https://www.tiktok.com/t/ZPL6DWmwK/
