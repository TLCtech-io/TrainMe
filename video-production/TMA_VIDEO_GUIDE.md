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

---

## 8. Open items

- [ ] Add notes from the Cowork "tool stack" session and the "TMA IMP visual development" session when the user provides them.
- [ ] Span of Control: duplicate WORKING into "IMP - Span of Control VISUAL", map the transcript, propose an overlay plan for approval, then build.
- [ ] Decide whether to fix the "1. Probem" typo in the published reference.
- [ ] Identify the topic of IMP Recording 091726 and set it up as RAW > WORKING.
- [ ] Review the social media reference videos the user shared on Claude video creation (not yet viewable from the cloud session; instagram.com, tiktok.com, and drive.google.com are blocked by its network policy):
  - https://www.instagram.com/reel/Db4PVCotlC4/
  - https://drive.google.com/file/d/16B3nj9giJTLqyFDwmVYlO2KHZ_c_drr2/view
  - https://www.tiktok.com/t/ZPL6DWmwK/
