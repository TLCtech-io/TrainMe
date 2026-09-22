# DST Build Playbook

**Purpose.** This document provides operating instructions for any LLM (Claude or otherwise) tasked with building a customized Decision Support Tool (DST) for a new client organization. It is written in the second person, addressed to the LLM. The user is the consultant initiating the build (typically Travis Cryan of TLC TRNG, LLC).

**How this playbook is used.** A user will start a new chat or project, attach this playbook, then say something like "I want to build a DST for the Port of Houston." From that point, you drive the build conversationally: ask the user for inputs, produce files, walk them through the AWS deployment, and deliver a working live URL. This playbook tells you what to ask, when to ask it, what to produce, and what to watch for.

**Single source of truth.** Everything organization-specific lives in `src/dst.config.js`, the data files in `src/data/`, and the assets in `public/`. The codebase architecture, business logic, and rendering have been refactored so customization is mechanical: edit one config file plus replace data and brand assets.

**Sequence at a glance.**

1. Confirm what the user wants and what they have.
2. Get the starter template from the user.
3. Gather organization details, branding, and seed users.
4. Process logos and generate favicons.
5. Generate data files from the client's BIA Workbook CSVs.
6. Produce `src/dst.config.js`.
7. Package the customized codebase as a ZIP for the user.
8. Walk the user through local install, dev smoke test, build, and AWS deploy.
9. Verify live, hand off documentation.

Each step is detailed below.

---

## 0. Before you start: critical principles

These are the design philosophies that informed every architectural decision in the existing PCCA build. Internalize them before producing anything for a new client. They will inform a hundred small decisions you will make during the build.

**The independence principle.** The DST is designed for use during operational disruptions, including disruptions to the client's own infrastructure. It must therefore not depend on the client's network, email gateway, identity systems, or other internal services. This is why hosting is on AWS in a consultant-owned account, why authentication is standalone (not federated to client SSO), and why data is locally bundled at build time rather than fetched live. Do not propose architectural changes that violate this principle without explicitly flagging the trade-off to the user.

**Known cost of bundling, and the direction of travel (September 2026).** Build-time bundling means the dataset ships inside the public JavaScript bundle. A security assessment confirmed it is retrievable with three unauthenticated requests: load the site, read the script tag, fetch the bundle. The login screen is a UI gate, not a data gate. Nothing else is exposed (self-registration is disabled, admin routes reject anonymous and forged tokens, the bucket is locked to CloudFront), so this is data disclosure rather than a way in. Bundling is also buying no offline capability yet, because there is no service worker. The planned remedy keeps independence intact: fetch the dataset over an authenticated channel after sign-in and cache it on the device, so after first load the tool runs locally. See `DST_Foundation_Architecture_and_Phasing.md` and `DST_Phase2_Layout.md` at the project root. Until that ships, treat bundled data as readable by anyone with the URL, and make sure the user knows this before real client data is deployed in a new build.

**The BIA Workbook is the source of truth.** Asset catalogs, dependency graphs, and Restoration Scores all originate in the client's BIA Workbook. The DST visualizes this data; it does not generate, modify, or recompute it. Updates flow from the workbook to the DST, never the reverse. This means: do not propose features that would let users edit asset records in-app (that's a v3 conversation). Do not recompute Restoration Scores using a different formula. Do not invent dependency relationships. If something is wrong with the data, the fix is in the workbook.

**The three-category model.** The DST organizes critical assets into three categories: Processes (operational activities), Systems (technology), and Facilities (physical locations). For most engagements these labels stay as-is. The labels are configurable in `dst.config.js`, but the underlying type strings (`'Process'`, `'System'`, `'Facility'`) match the data file conventions and should not be changed lightly. If a client genuinely needs different categories (rare), confirm with the user before customizing.

**Operational independence at the auth layer.** Authentication uses AWS Cognito with password-only flows. No email-dependent flows like magic links or self-service password reset (admins reset passwords on a user's behalf and communicate the temp out-of-band). Email-based MFA, SSO, and SAML are not used because they create dependencies on the client's email gateway or identity provider, which may be unavailable during the disruptions the DST is designed for. See Section 8.5 for the auth deployment pattern.

**Desktop responsiveness is part of Sprint 1.** The DST is built mobile-first, but as of PCCA v16 (June 2026) the production build also supports a full desktop layout: persistent left sidebar at the 1024px breakpoint, two-column tab content on asset detail screens, modal overlays in place of bottom sheets, and at-a-glance home tile counts preserved. Treat desktop responsiveness as part of the v1 deliverable, not a future sprint. See Section 8.6 for the implementation pattern and `DST_Desktop_Responsiveness_Plan.md` for the underlying decisions document.

**Iterative deployment, not one-and-done.** The first deployment is a working demo, not a production rollout. Expect the user (consultant) and the client to iterate on content, scoring, descriptions, and seed scenarios after first delivery. Build for revision, not for finality.

**Version control is the baseline, not ZIPs.** As of September 2026 both the sandbox (TLC_TRNG) and the client flagship (PCCA) are git repositories with tagged releases. Put every new client build under git before the first deploy — see Section 7.1. ZIPs are still produced as delivery artifacts and restore points, but they are no longer the checkpointing mechanism. The old `-v22b`, `-v22c` lettered-iteration pattern existed only because there was no other way to checkpoint; use branches and commits instead.

**Sandbox first, then port.** Feature development happens in the TLC_TRNG sandbox (Meridian sample data, safe to break), is verified there, and only then ports to a client build. Never develop a new feature directly in a client's production codebase. Because every component reads from `dst.config.js` rather than hardcoding org specifics, porting is block extraction between the section-comment banners in `src/App.jsx` — see Section 7.2.

**Reference data does not move during an incident.** The BIA baseline changes on a data cycle, never mid-incident. What changes during an incident is scenario state, through the what-if selector. The data layer encodes this: reference sources are resolved once per session, are not polled, and are held steady for the life of an active scenario, so an analysis never shifts underneath the person doing it. Live external sources, when added, poll and always fall back. See 8.8.

**Never substitute data silently.** Wherever data is shown, show where it came from and how old it is. During a disruption, a stale facility location presented as current is worse than no data. The `DataProvenance` component exists for this, and any view that renders source-backed data should render it. See 8.8.

---

## 1. Confirm what the user wants and what they have

Start the conversation by establishing scope and what materials the user has ready. Don't begin gathering details until you understand the broader picture.

**Ask:**

1. What organization is this for? (full legal name, common short name)
2. Have they engaged you for a full DST build, or is this a demo only at this stage?
3. Do you have the starter template? (v14 or later, ZIP or GitHub repo)
4. Do you have the client's three BIA Workbook CSV exports? (Critical Assets, Dependencies, Process Details)
5. Do you have the client's brand guide, logo files (stacked color preferred), and any departmental contact roster?
6. Are you ready to deploy to AWS today, or is this build-and-review only?

Use the `ask_user_input_v0` tool sparingly here — questions 3, 4, and 5 are best asked as natural prose because the answers are often partial ("I have the brand guide but no logo files yet") and the conversation needs to handle that gracefully. If the user is missing data files, you can still proceed with placeholder data and produce a customizable shell; flag this clearly.

**Proceed when:** You have at minimum the starter template and enough organization information to populate `dst.config.js`. You can accept partial data and assets, but make the gaps visible.

---

## 2. Get the starter template

The starter template is the v14 (or later) PCCA-derived codebase, refactored so all org-specific values are centralized. The user maintains this template and provides it at the start of each build.

**Ask the user:**

> "How would you like to provide the starter template? You can either upload the v14+ ZIP file directly, or share the GitHub URL if you've moved it there."

Possible responses and how to handle each:

- **ZIP upload.** Once uploaded, use file tools to read it from `/mnt/user-data/uploads/`. Unzip to a working directory in `/home/claude/work/`. Verify it contains `src/dst.config.js`, `src/App.jsx`, `src/data/`, `public/`, `vite.config.js`, `index.html`, and `package.json`. If any of these are missing, the template is wrong or corrupted; ask the user to reupload.

- **GitHub URL.** Tell the user you can't clone a repo from this environment, but they can either download the ZIP from GitHub's interface and upload it, or paste the contents of key files directly into chat. The ZIP path is faster.

- **"I don't have it yet" or "use the version from the previous chat".** This means the user has lost context. Ask them: "Do you have any version of the PCCA DST codebase saved locally? If so, please upload the most recent ZIP — even if it's v13, I can work with it." If they truly have nothing, you can still proceed by producing a fresh codebase from scratch, but flag this to the user explicitly: "I'll need to recreate the codebase from scratch. This will take longer and may miss some refinements from the original build. Is that OK, or would you like to find a saved copy first?"

**Proceed when:** You have the template files in your working environment and have verified the structure.

---

## 3. Gather organization details, branding, and seed users

This is the longest information-gathering step. Be patient, structured, and don't skip parts. The user may not have all answers immediately, and that's fine — collect what you can, flag the rest, and proceed.

### 3.1 Organization identity

Ask for these values. Default to the user's common-sense answer if they don't specify.

- **Full legal name** (e.g., "Port of Corpus Christi Authority"). Used in document footers and the home screen footer line.
- **Short name / abbreviation** (e.g., "PCCA"). Used as a prefix in titles, the map tile label, and as the URL subdomain seed.
- **Tool name suffix.** Default to "Decision Support Tool" — this is consistent across builds. Some clients may want "Continuity Tool" or similar; ask if they have a preference.
- **Tagline** (one sentence describing the tool's purpose). Default: `"Prioritization reference for {short name} leadership during disruptions to critical processes, systems, and facilities."` Confirm with the user; substitute the short name accordingly.
- **Email domain** (the domain used in user emails, e.g., `pocca.com` for PCCA). Used in form placeholders. Ask for this explicitly because it's not always obvious from the org name.
- **Demo access code** (the password gate code, e.g., `pcca-2026`). Suggest a default like `{shortname-lowercase}-{current year}` and ask the user to confirm or override.

### 3.2 Brand colors

Ask the user to upload the brand guide PDF, or paste the hex codes directly. You need:

- **Primary brand color** (the equivalent of PCCA's #004E98 — typically the darkest blue or whatever the org's primary is). This becomes `theme.darkBlue` in config.
- **Accent color** (PCCA's #00A3C9 teal). This becomes `theme.teal`.
- **Secondary blue** (PCCA's #114E7B navy). This becomes `theme.navy`.
- **Light accent** (PCCA's #6FC8DF light teal). Optional.
- **Neutral gray** (PCCA's #808285). Used for muted text and rules. Most brand guides have a similar gray.

If the brand guide has more colors than these slots, ask which colors map to which roles. If it has fewer, fill missing slots with reasonable defaults (e.g., navy = darkest blue + 10% darker; light teal = primary teal + 30% lighter).

**Score band colors and ink colors stay default unless the user objects.** These are tuned for accessibility and rarely need adjustment.

### 3.3 Department colors

Ask the user for the list of departments that appear in the client's data, and a color preference for each. For PCCA, the departments are: Operations, Channel Infrastructure, Port Security, Engineering Services, Asset Management, Information Technology, Finance, Human Resources, Procurement, Planning. For other organizations, the list will differ.

If the user doesn't have specific colors per department, propose darker/muted variants of the brand palette. The PCCA examples are good models: `#0E5F6E`, `#3D2B5A`, `#7A4A14`, `#2B4D2B`, `#5A4118`, `#5A1F4A`, `#3A3A1F`, `#1F4A55`. The point is each department gets a distinct, muted, professional color so chips are visually separable.

Check the actual department names in the client's `personnel.json` after data extraction (step 5) and reconcile any discrepancies with what the user told you. The keys in `deptColors` must match the `dept` field values exactly; mismatches default to gray.

### 3.4 Logos and brand assets

Ask the user to upload:

- **Stacked color logo** (preferred, used at all logo positions). This is the version with the brand mark on top and wordmark below.
- **Horizontal color logo** (optional, may be useful for future TopNav placements).
- **Brand guide PDF** (optional but useful for reference and color extraction).

If the user only has a horizontal logo and not a stacked version, you can use the horizontal — but flag that it may look cramped on the login screen where vertical space is generous. If they have neither, ask them to find one before proceeding; the logo is too central to the visual identity to skip.

### 3.5 Seed users

The mockup authentication uses a hardcoded list of seed users. After Sprint 1 (Cognito), this is replaced by real auth. For now, the seed list determines who can sign in to the demo.

Ask the user for:

- The consultant's account (typically Travis at travis@TLCTRNG.com or similar — admin role)
- The client's primary admin contacts (typically 2-4 people: emergency management lead, IT lead, key sponsor)
- Optional: a regular user account (non-admin) for demonstrating role differences
- Optional: a pending-status account (demonstrates the "blocked at login" message for unapproved users)
- Optional: a deactivated account (demonstrates the "deactivated" message)

For the pending and deactivated demo accounts, use plausible but clearly-not-real names. PCCA used "Dan Koesema" (pending) and "J. Schmidt" (deactivated). The point is to demonstrate the auth flow, not to represent specific people.

Each user record needs: id (e.g., `u-1` through `u-7`), email, name, role (`admin` or `user`), status (`active`, `pending`, or `deactivated`), authMode (`passwordless` or `password`), lastLogin (ISO timestamp or null), invitedAt (ISO timestamp).

### 3.6 Copy strings

Most copy strings can be derived from the org info above. Confirm or customize:

- `acceptableUseNotice`: shown on login. Default: `"By signing in you agree to use this tool consistent with {short name} acceptable-use policy."`
- `portFooter`: shown on login footer and report PDF footer. Default: `"{full name} · Decision Support Tool"`. Note: if the client is not a port, replace "port" semantics naturally — `portFooter` is just a variable name, not a literal "port" reference.
- `contactsSourceNote`: shown on Critical Contacts. Default: `"Contact data sourced from {short name} personnel records and the public Key Personnel directory."`
- `mapHeaderTitle`: shown above the map. Default: the client's location, e.g., "Port of Corpus Christi" → for a non-port, use whatever describes the geographic scope.
- `adminPortalBlurb`: shown on Admin Portal. Default: `"Invite, update, and manage access for {short name} DST users. Only signed-in admins can see this portal."`
- `mapPinLabel`: tooltip on map pins. Default: `"{short name} facility"`.
- `reportFooter`: bottom of generated PDF reports. Default: `"Generated by {short name} Decision Support Tool"`.

---

## 4. Process logos and generate favicons

**Rewritten in v23. Do not rasterize the client's logo.** The previous version of this
section instructed a flood-fill background knockout on a raster export. That technique
produced the defect that shipped in the PCCA build from v14 through v22, and it will
reproduce it for any client. Read section 4.0 before doing anything else here.

### 4.0 Why the old approach failed

The flood fill cleared only pixels passing `r,g,b < 25` and wrote them to alpha 0.
Anti-aliased edge pixels are dark but not that dark, so they failed the test and were left
**fully opaque at their dark value**. Measured on the shipped PCCA asset versus the brand
master:

| | shipped `pcca-logo-stacked.png` | brand master PNG |
|---|---|---|
| Alpha values present | only 0-31 and 224-255 | full spread, ~3,800 px at intermediate alpha |
| Wordmark ink, "PORT" | (88, 88, 90) | (129, 130, 133) |
| Wordmark ink, rest | (119, 119, 122) | (129, 130, 133) |
| Pure black pixels | 2,602 | 0 |

The result was a 1-bit alpha channel with no anti-aliasing at all, plus a ring of near-black
residue around every letterform. That residue is why the logotype read as muddy and why
"PORT" measured 32% darker than the rest of the wordmark.

Two failures compounded it. The old 4.1 measured the aspect ratio off the damaged bitmap
(1204 x 1008, ratio 1.20) when the vector source is 324 x 273.6pt, ratio **1.1842**, so the
logo shipped stretched about 0.9% horizontally for nine versions. And the old 4.2 cropped
favicons out of the already-damaged PNG, so every icon inherited the same 1-bit edges.

Even a clean raster cannot win here. The stacked lockup renders around 121px wide in this
app, so any PNG large enough to survive a high-DPI display must be downscaled about 7x by
the browser, which smears fine detail regardless of source quality. Vector removes the
problem permanently and the asset gets smaller: PCCA went from a 193KB PNG to a 13KB SVG,
3.5KB gzipped.

### 4.1 Convert vector to SVG

Client brand packages almost always ship vector alongside raster. **Always prefer the
vector.** Look for `.pdf`, `.eps`, or `.ai` in the brand folder. A vector logo has no
background to remove, so the entire knockout problem disappears.

Confirm the PDF is genuinely vector before converting:

```bash
python3 - <<'PY'
import re
d = open("BrandLogo-stacked-color.pdf", "rb").read()
print("has raster image:", b'/Image' in d)     # want False
print("has live text   :", b'/Font'  in d)     # want False (type outlined)
print("MediaBox        :", re.findall(rb'/MediaBox\s*\[[^\]]*\]', d)[:1])
PY
```

`/Image: False` and `/Font: False` means pure outlined vector, which converts losslessly.
If the client supplied only raster, ask for vector before proceeding. It is a one-line
request and it prevents this entire class of problem.

Convert with poppler (`brew install poppler`):

```bash
pdftocairo -svg BrandLogo-stacked-color.pdf public/{shortname}-logo-stacked.svg
```

Then strip the fixed `width`/`height` attributes so the SVG scales to whatever box the
component gives it, leaving `viewBox` to carry the geometry.

**Aspect ratio comes from the viewBox, never from a measured bitmap.** Read
`viewBox="0 0 W H"` and set `logo.stackedAspectRatio = W / H` in `dst.config.js`.

### 4.2 Derive the logomark

The stacked lockup is the mark above the logotype. For favicons, app icons, and any tight
placement you need the mark alone. Rather than cropping by a guessed fraction, separate it
by fill colour: in a typical lockup the logotype is a single flat grey and the mark carries
the brand colours, so the wordmark is exactly the set of paths sharing that one fill.

Inspect the fills, confirm the split, then write a mark-only SVG with the viewBox tightened
to the mark's own bounds.

### 4.3 Generate icons from the vector

Rasterize from the **PDF**, never from a PNG, then downsample with Lanczos onto a padded
square canvas:

- `favicon-16.png`, `favicon-32.png`: transparent background
- `favicon.ico`: multi-size 16/32/48, not a single 32
- `apple-touch-icon.png`: 180x180 on a **solid** background; iOS does not honour
  transparency and will composite it against black

Register the SVG as a favicon ahead of the raster fallbacks so modern browsers get a mark
that is sharp at any size:

```html
<link rel="icon" type="image/svg+xml" href="/{shortname}-logomark.svg" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

**Reference implementation.** `pcca-dst-demo/scripts/build_logo_assets.py` does all of
4.1 through 4.3 from the vector source in one run, and asserts the expected logomark path
count so a changed source fails loudly instead of silently producing a wrong icon. Copy it
into new builds and adjust the paths.

### 4.4 Respect the client's minimum size rules

Brand guidelines specify minimum sizes, usually **by width**, and usually different per
lockup. Read them; do not assume. From the Port of Corpus Christi Brand Guidelines 2024-25,
p.10:

| Lockup | Appropriate | Minimum | Too small |
|---|---|---|---|
| Horizontal | 2" | 1.625" | < 1" |
| Logomark alone | 0.8125" | 0.5" | < 0.375" |
| Vertical | 1.625" | 1.25" | < 0.875" |
| Stacked | 1.5" | 1.25" | < 0.75" |

Convert at the CSS reference of **96px = 1 inch** and encode the result in `dst.config.js`
rather than scattering magic numbers through the UI:

```js
minWidthPx: { stacked: 120, mark: 48, horizontal: 156 },
```

Then have the logo component treat those as a hard floor, clamping a too-small request up
instead of rendering off-brand. Every one of PCCA's four placements was below the stacked
minimum before v23, the smallest at 0.60" against a 1.25" floor, which is why the logotype
was illegible even once the asset itself was fixed.

When a placement genuinely cannot afford the stacked minimum, use the logomark alone
(0.5" floor) rather than shrinking the full lockup below spec. The `PCCALogo` component
takes a `showWordmark` prop for exactly this.

### 4.5 Logo path naming

Prefix with the client's short name in lowercase: `{shortname}-logo-stacked.svg`,
`{shortname}-logomark.svg`, `{shortname}-logo-horizontal.svg`. Update the matching
`logo.*Src` entries in `dst.config.js`.

**Note about referenced filenames.** Whatever filename you settle on must be referenced consistently in `dst.config.js`, in `public/`, and nowhere else. The Vite build will fail if `dst.config.js` references a file that doesn't exist in `public/`.

---

## 5. Generate data files from the client's BIA Workbook CSVs

The DST consumes five JSON files in `src/data/`. These are produced from three source CSVs by the extraction script. You must run the extraction every time the client provides updated data.

### 5.1 Source CSVs

The client provides three CSVs exported from their BIA Workbook:

- **CriticalAssets.csv** (300+ rows expected). Columns include `RowID`, `Name`, `Department`, `ProgramOffice`, `AssetType`, `OperationalCategory`, `Description`, `Priority`, `RestorationScore`, plus cascade counts and personnel fields.
- **Dependencies.csv** (1000+ rows). Columns include `ProcessID`, `Department`, `Process`, `DependencyCategory`, `Dependency`, `DependencyDescription`, `DependentID`, `OperationalCategory`, `Priority`, `RestorationScore`.
- **ProcessDetails.csv** (4000+ rows). Long-form text content. Columns: `ProcessID`, `Section`, `SortOrder`, `Level`, `Text`, `Bold`.

Ask the user to upload all three. If the user has only some, you can produce a partial build — but the cascade graph requires both Critical Assets and Dependencies, and the asset detail pages require Process Details. A build missing any of these will be visibly incomplete.

### 5.2 The extraction script

The starter template includes `extract_data.py` at the root level. It reads the three CSVs (expected to be in the same directory or a configurable path) and produces five JSON files in `src/data/`:

- **assets.json** (~500KB): One record per asset, joined with description, impacts, and short-term action lists.
- **edges.json** (~10KB): Dependency graph as `{source: [downstream_ids]}`.
- **depLookup.json** (~30KB): Quick lookup `{id: {name, type, dept, score}}`.
- **personnel.json** (~30KB): Personnel directory.
- **directors.json** (~5KB): Department heads (sourced from a curated list, not the CSVs).

**Critical extraction details to preserve:**

- Each asset record carries both `restorationScore` AND `score` (alias) fields. The legacy code paths use `score`; new code uses `restorationScore`. Keep both.
- Personnel records use `office` for the program-office name (a sub-department descriptor), and `officePhone` for the phone number. Do not confuse these — the original PCCA build had a bug where these were swapped.
- Directors are not in the CSV; they're maintained as a separate source (for PCCA, scraped from `portofcc.com/about/port/key-personnel`). For new clients, ask the user to provide the directors list as a JSON file or a structured paste; do not invent it.
- Some directors will be cross-referenced with the personnel file (matched by email); others are website-only. Mark website-only entries with `_websiteOnly: true` so the UI knows. Known vacancies take `_vacant: true` instead, so an empty seat is not misread as "we have a director, just not in the CSV."

**The directors trap (learned the hard way in v23).** `directors.json` is *not* derived
from the CSVs. It is seeded from a hardcoded `WEBSITE_DIRECTORS` dict inside
`extract_data.py`, and the CSV only enriches entries that match by email. Two consequences
that will bite you:

1. **A personnel change in the workbook does not propagate to the directors list.** When
   PCCA's Harbormaster was replaced, the CSV update alone left the departed employee as the
   displayed point of contact for all six assets in his program office, while the contacts
   list correctly showed his replacement. That is precisely the kind of contradiction the
   tool exists to prevent.
2. **Anything hand-added to `directors.json` is silently deleted by the next regenerate.**
   Two departments added during v23 vanished on the first clean regenerate, 18 entries
   becoming 16, with no error.

So: anything org-specific that must survive a regenerate belongs in `WEBSITE_DIRECTORS`,
never in the generated JSON. And after any personnel change, grep `src/App.jsx` for
hardcoded fallbacks as well; PCCA had one naming the Harbormaster directly, a third place
the same person lived.

**Never hand-edit the JSON in `src/data/`.** Fix the CSV or the script, regenerate, then
diff every output against the previous version before applying. A regenerate that silently
drops records looks identical to a successful one at the command line.

**Script paths.** `extract_data.py` originally hardcoded its input and output directories
to the web-chat sandbox (`/mnt/user-data/`), so it could not run on a local machine at all.
It now defaults to repo-relative local paths and honours `DST_UPLOAD_DIR` / `DST_OUT_DIR`,
and its loader matches the `_MMDDYY` cycle suffix on exports (`CriticalAssets_082126.csv`)
so files need no renaming. Preserve that behaviour when adapting for a new client.

### 5.3 Verifying extraction

After running the script, sanity-check:

```bash
python3 -c "
import json
for f in ['assets.json', 'edges.json', 'depLookup.json', 'personnel.json', 'directors.json']:
    with open(f'src/data/{f}') as fh:
        d = json.load(fh)
    if isinstance(d, list):
        print(f'{f}: {len(d)} items')
    elif isinstance(d, dict):
        print(f'{f}: {len(d)} keys')
"
```

Record the counts. Tell the user "Your DST will have N processes, M systems, and K facilities" so they can sanity-check that the extraction caught everything. For PCCA at v23 this is 30/131/57 (it was 30/133/57 through v22, before two retired systems were folded into their successors) — different orgs will have different counts.

On any *update* cycle, counts alone are not enough. Diff the regenerated files against the
currently deployed ones and report what actually moved: which records were added, removed,
or changed field by field. Files that come back byte-identical are a useful signal too;
for the v23 personnel correction, `assets.json`, `edges.json`, and `depLookup.json` were
byte-identical, which confirmed the change really was personnel-only before anything
shipped.

If the count seems implausibly low (e.g., 2 processes), the extraction probably failed silently — look at column-name mismatches between the CSV and the script's expectations. Most CSV-export tools modify column names slightly; verify exact spelling.

---

## 6. Produce src/dst.config.js

This is the centerpiece of the customization. Use the values gathered in step 3 to produce a fully-populated config. Reference the PCCA version in the starter template as the structural model — your output should have the same shape, with values swapped.

### 6.1 Structure to produce

```javascript
const config = {
  org: { fullName, shortName, toolName, toolShort, titleLong, titleShort, homeTitle, tagline, metaDescription, emailDomain },
  demo: { accessCode },
  theme: { darkBlue, navy, teal, lightTeal, turquoise, lightGreen, gray, bg, bgAlt, surface, surfaceAlt, ink, ink2, ink3, rule, ruleSoft, critical, criticalSoft, high, highSoft, moderate, moderateSoft, low, lowSoft },
  deptColors: { /* department name → hex */ },
  fonts: { heading, body },
  logo: { stackedSrc, stackedAspectRatio, horizontalSrc, altText },
  categories: [ /* three category objects */ ],
  seedUsers: [ /* user records */ ],
  copy: { acceptableUseNotice, portFooter, contactsSourceNote, mapHeaderTitle, adminPortalBlurb, mapPinLabel, reportFooter },
  data: { sources },   // optional source registry (8.8); omit to use the defaults in src/dataLayer.js
};
export default config;
```

The live builds also carry `mapbox`, `weather`, `cognito`, `adminApi` and `overviewPdf` sections. Use the current sandbox `dst.config.js` as the structural reference, since it is the most complete.

### 6.2 What to confirm before writing

Before producing the file, confirm with the user:

> "Here's the configuration I'm about to generate. Before I write the file, please confirm:
>
> - Organization full name: [value]
> - Short name: [value]
> - Tool name: [value]
> - Tagline: [value]
> - Email domain: [value]
> - Access code: [value]
> - Brand colors: dark blue [hex], teal [hex], navy [hex], gray [hex]
> - Departments and colors: [list]
> - Categories: [list of three with labels]
> - Seed users: [list of names and roles]
>
> Anything to change?"

This single checkpoint catches most mistakes before they ship into a built artifact.

### 6.3 Heavy commenting

Every section of `dst.config.js` should be commented in plain English. The PCCA version is a good model. Future readers (other LLMs, the user, or a maintainer) need to understand what each value does without reading App.jsx.

---

## 7. Package the customized codebase

Once `dst.config.js` is written, data files are in place, and logos and favicons are populated, package the codebase as a ZIP for the user.

```bash
cd /home/claude/work
rm -f client-dst-demo.zip
zip -r client-dst-demo.zip client-dst-demo/ \
  -x "*.DS_Store" \
  -x "client-dst-demo/node_modules/*" \
  -x "client-dst-demo/dist/*"
ls -lh client-dst-demo.zip
```

Use `present_files` to deliver the ZIP. The user will download, unzip on their Mac, and proceed with build and deploy. Use a clear filename like `houston-dst-v1.zip` or `pocha-dst-v1.zip`.

**Update `package.json`** to reflect the new client. The `name` field should be the lowercase short name plus `-dst` (e.g., `pocha-dst`); the `description` should reflect the org. This affects nothing functional, just makes the codebase identify itself correctly to npm. If you change `name` on an existing build, update the two mirrored `name` fields in `package-lock.json` at the same time, or the next `npm install` rewrites the lock and creates noise in the diff. (PCCA was normalized from `dst-demo` to `pcca-dst` in September 2026; the rebuild produced an identical asset hash, confirming the field is not embedded in the bundle and no redeploy was needed.)

### 7.1 Put the build under version control

Do this before the first deploy, not after.

**Create `.gitignore` first.** `node_modules/` and `dist/` are usually already on disk by the time you think of this, and a single careless `git add -A` bakes 150MB into the history:

```
node_modules/
dist/
dist-ssr/
.vite/
.DS_Store
*.local
.env
.env.*
```

Then initialize, verify, and tag:

```bash
git init
git add -A
git diff --cached --name-only | grep -E "node_modules|^dist/|\.DS_Store|\.env"   # must return nothing
git commit -m "Baseline: {CLIENT} DST v{version}"
git tag v{version}
```

**Do commit** the data pipeline: the transform script (`extract_data.py`) and, where the repo holds them, the source CSVs. The transform is not reproducible without its inputs. **Do not commit** `node_modules/` or `dist/`. A clean repo is roughly 1-4MB depending on whether an overview PDF is bundled; if it is hundreds of MB, `node_modules` leaked in — stop and fix before committing.

**Identity.** Git may refuse to commit with `unable to auto-detect email address` if the machine hostname has no domain. Set it repo-locally rather than globally:

```bash
git config --local user.name "Travis Cryan"
git config --local user.email "tech@tlctrng.com"
```

**Tag the deployed state.** Tag the baseline commit at exactly what is live, so the tag is a true restore point. Do follow-on cleanups (renames, cosmetics) as separate commits after the tag.

### 7.2 Porting a feature from the sandbox to a client build

Features are developed in TLC_TRNG and ported. Because the components are org-agnostic and read from `DST_CONFIG`, the sandbox's section is usually a strict superset of the client's — verify that before hand-splicing anything:

```bash
sed -n 'START,ENDp' sandbox/src/App.jsx > /tmp/a.txt
sed -n 'START,ENDp' client/src/App.jsx  > /tmp/b.txt
diff /tmp/b.txt /tmp/a.txt | grep -c '^<'   # client-only lines: if ~0, transplant the whole section
```

If the client-only count is zero or near-zero, replace the whole section between banners rather than hand-editing. It is far safer. Where the client has a genuine customization (PCCA's report-header logo props, for example), note it before the swap and restore it after.

Two things the diff will not catch, both of which have bitten:

- **Imports.** A transplanted block may reference icons or helpers the client's import list lacks. The build still succeeds; you get a runtime `ReferenceError`. See 10.13.
- **Caller wiring.** New props and any app-level state the feature needs (new `useState`, handlers, reset paths) must be threaded by hand.

Always build **and** load the app in a browser after a port. A passing build only proves it parses.

---

## 8. Walk the user through local install, smoke test, build, and deploy

### 8.1 Local install and smoke test

Tell the user:

> "On your Mac, replace your local working folder with the new build:
>
> ```
> cd ~/Documents/DST\ Demo\ Build\ Local/Demo-dst-files
> mv client-dst-demo client-dst-demo-backup-$(date +%Y%m%d)
> # then unzip the new ZIP into this folder, naming the unzipped folder client-dst-demo
> cd client-dst-demo
> npm install
> npm run dev
> ```
>
> Then open http://localhost:5173 in your browser. Walk through:
> - Password gate accepts [access code]
> - Login screen with the correct logo and org branding
> - Home screen tile counts match what we expect (X processes, Y systems, Z facilities)
> - Tap into Processes — see the list, tap one, asset detail page renders
> - Build a scenario from one or two assets, view cascade analysis, generate report
> - Critical Contacts shows the directors
> - Map shows facility pins (if facilities have lat/lng coordinates)
>
> Send back any issues."

If the user hits an issue, troubleshoot before proceeding to deploy. Common issues:

- **Build error: "Cannot find module './dst.config.js'"**: The extension is required in the import path. The starter template's import is correct as `./dst.config.js`. If you see this error, something modified the import.
- **Runtime error: "Cannot read property of undefined"**: A config key is referenced in App.jsx but missing in `dst.config.js`. Look at the error stack trace, identify the missing key, add it.
- **Visual issues with logo or colors**: Re-check `dst.config.js` values, re-check that `public/` contains the expected files.
- **Empty home screen**: Data files probably failed to load. Check that `src/data/*.json` exists and has content.

### 8.2 Production build

Once smoke test passes:

```bash
npm run build
```

This produces `dist/`. Expected output: an `index.html` (~6KB), one or more `assets/index-*.js` files (about 2.2MB minified, most of it Mapbox GL), favicons, logos, and a Vite warning about chunk size that can be ignored.

Verify build worked by checking `dist/` contents.

### 8.3 AWS deployment

This is the part that most reliably bites because AWS UIs change. The conceptual sequence is stable; the clicks may differ.

**One-time setup per client (skip if already done for this client):**

1. **AWS account.** The consultant uses their own AWS account. Resources for each client live alongside but separately (different bucket, different CloudFront, different cert). At handover, resources migrate to a client-owned account. Do not create a new AWS account unless the user explicitly asks; reuse the existing consultant account.

2. **Domain.** The user purchased `demo-dst.com` for shared demo use, and prefers per-client domains for production (e.g., `client-dst.com`). For demo deployments, use a subdomain or path of `demo-dst.com`; for production, register or have the user register the client's preferred domain. Confirm with the user which domain to deploy to before proceeding.

3. **TLS certificate (ACM).** Cert MUST be in `us-east-1` (CloudFront requirement). All other resources can be in any region; the consultant uses `us-east-2` (Ohio).

   In AWS Console, switch region to N. Virginia. Search for "Certificate Manager." Click Request, select Public certificate, add domains (`client-dst.com` and `www.client-dst.com`), validation method DNS, click Request.

   On the cert detail page, copy the two CNAME validation records. Add them to the domain's DNS at GoDaddy (or wherever DNS is managed). When the user adds them, the values from ACM include the full domain suffix (e.g., `_xxx.client-dst.com.`); GoDaddy expects only the prefix portion (e.g., `_xxx`), so trim before pasting. Save.

   Wait 5-30 minutes for ACM to validate. Status changes to "Issued."

4. **S3 bucket.** Switch region to Ohio. Search for S3, create bucket named `client-dst-prod` (use the lowercase short name). Region `us-east-2`. Block all public access ON (default). Other settings default. Click Create.

5. **CloudFront distribution.** CloudFront is global; region selector doesn't matter.

   Click Create distribution. The wizard has 4-5 steps depending on AWS's current UI:

   - **Step 1: Get started.** Distribution name `client-dst-prod`. Description `{Client} DST production distribution`. Distribution type "Single website or app". Domain section: leave blank (your domain is at GoDaddy, not Route 53). Click Next.

   - **Step 2: Specify origin.** Origin type Amazon S3. S3 origin: click Browse S3, select `client-dst-prod` bucket. Origin path blank. Settings: leave "Allow private S3 bucket access to CloudFront" CHECKED (the new wizard auto-creates the OAC and bucket policy for you). Origin settings and cache settings: use recommended defaults. Click Next.

   - **Step 3: Enable security.** Click "Do not enable security protections" (WAF is overkill for password-gated demo; ~$5-10/month minimum if enabled). Click Next.

   - **Step 4: Review.** Don't click Create yet. The new wizard collapsed two important settings: alternate domain names and SSL certificate. Click Create distribution to land on the detail page, then we'll add those two settings via Edit.

   On the distribution detail page, click Edit on the Settings card. Add:

   - **Alternate domain names**: `client-dst.com` and `www.client-dst.com` (both items)
   - **Custom SSL certificate**: select the cert from the dropdown. If it doesn't appear, the cert is in the wrong region (must be us-east-1). Stop and fix.
   - **Default root object**: type `index.html`
   - **Price class**: Use only North America and Europe (cheaper, fine for client base in US)

   Click Save changes. Distribution returns to "Deploying" status while changes propagate (~10-15 minutes more).

6. **DNS at GoDaddy.** Two records:

   - **www CNAME**: name `www`, value `{distribution-domain-name}` (the `*.cloudfront.net` URL, e.g., `d1a2b3c4d5e6f7.cloudfront.net`), TTL 1 hour.
   - **Apex domain forwarding**: in GoDaddy's Forwarding section (separate from DNS records), forward `client-dst.com` to `https://www.client-dst.com`, type Permanent (301), forward only, do NOT update nameservers (keeps existing DNS intact).

   If `www` already exists as a CNAME pointing to the apex domain (a default GoDaddy setup), edit it in place rather than creating a new record. GoDaddy will reject duplicate CNAMEs.

   Don't delete the ACM validation CNAMEs after the cert issues; ACM uses them for automatic renewal.

**Per-deployment (every time you build a new version):**

```bash
npm run build
aws s3 sync dist/ s3://client-dst-prod --delete
aws cloudfront create-invalidation --distribution-id E1XXXXXXXXX --paths "/*"
```

The CloudFront distribution ID is shown on the distribution detail page. Save it somewhere for the user. PCCA's was `E1LEZM0X55WJ6A`.

After invalidation, wait ~30-60 seconds. Test in an incognito window (bypasses local browser cache) at `https://www.client-dst.com`.

**If you are running inside Claude Code in auto permission mode**, `aws s3 sync` may be refused by the permission classifier, with and without `--delete`, because it is a bulk/recursive write. The refusal is not consistent: it blocked every attempt in August 2026 and passed without intervention on the September 8, 2026 sandbox deploy, so attempt the documented command first and react to the result. Single-file `aws s3 cp`, a single `aws s3 rm`, `create-invalidation`, and `aws s3 sync --dryrun` all pass. Two ways through, in order of preference:

1. **Tell the user to switch permission mode** (Manual or Accept-edits), approve the sync, and switch back. This is the fastest fix and keeps the documented workflow intact. Surface the block immediately rather than silently working around it — the user needs to know why the documented command did not run.
2. **Fall back to per-file copies.** Run `aws s3 sync dist/ s3://bucket --delete --dryrun` first (read-only, always allowed) to see exactly what would change, then `aws s3 cp` each changed file with an explicit `--content-type`, and `aws s3 rm` the one orphaned hashed bundle the dry run lists under `delete:`. Content types: `.html`→`text/html`, `.js`→`application/javascript`, `.css`→`text/css`, `.png`→`image/png`, `.ico`→`image/x-icon`, `.pdf`→`application/pdf`. Getting these wrong serves files as `binary/octet-stream` and the browser will not render them.

**Swapping a single static asset** (a PDF, a logo) needs neither a rebuild nor a full sync: one `aws s3 cp` plus an invalidation scoped to that path. But update the file in `public/` and commit it too, or the next real build reverts the live change.

**Verify by checksum, not by eye.** After deploying, confirm the live bytes match what you built:

```bash
curl -s https://www.client-dst.com/<file> | md5     # compare to: md5 -q public/<file>
curl -s https://www.client-dst.com/index.html | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'
```

The second command confirms the deployed HTML references the bundle you just built, which is the failure a visual check misses.

**Confirm what is live against what is committed.** To answer "is the latest commit deployed?", build HEAD and compare the hashed bundle name with the one the live `index.html` references. Identical names mean identical bundles:

```bash
rm -rf node_modules/.vite && npm run build >/dev/null
ls dist/assets/*.js                                                                  # built from HEAD
curl -s https://www.client-dst.com/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'     # live
```

### 8.4 First-deployment verification checklist

Walk the user through:

1. Visit `https://d{...}.cloudfront.net` directly (the auto-generated CloudFront URL). Confirms AWS plumbing is correct independent of DNS.
2. Visit `https://www.client-dst.com`. Confirms DNS routes correctly.
3. Visit `https://client-dst.com` (no www). Should 301-redirect to www.
4. Password gate accepts the access code.
5. Sign in as the consultant's seed user. Home screen renders with correct logo, tile counts.
6. Sign in as a pending user (e.g., `dan@pocca.com` for PCCA). Should be blocked with "pending activation" message.
7. Sign in as a deactivated user. Should be blocked with "deactivated" message.
8. Mobile test: open the URL on iPhone, walk same flows. Layout adapts cleanly.
9. Browser tab favicon: visible as the client's brand mark.

---

## 8.5 Deploy the auth backend (Cognito + Lambda + API Gateway)

After the static site is live (8.1-8.4) but before real user cutover, deploy the auth backend stack. This is the equivalent of PCCA's Sprint 1 work, captured as a reusable CloudFormation template.

**Artifact:** `dst-auth-cloudformation.yaml` plus the deployment guide `dst-auth-deployment-guide.md`. Both live alongside this playbook in the project files.

**Sequence:**

1. **Deploy the CFN stack** using the values gathered earlier (org short name, production origin URL). Detailed steps in `dst-auth-deployment-guide.md`. One AWS CLI command, ~3 minutes.

2. **Capture the stack outputs**: User Pool ID, App Client ID, API Invoke URL, region. Save these for step 3.

3. **Integrate the codebase**: apply the changes documented in `dst-auth-codebase-integration.md` to the React codebase. Edit `src/dst.config.js` with the stack outputs, create `src/auth.js`, replace the LoginScreen, replace the auth state and admin handlers in App.jsx, add the Cognito SDK to package.json, add the global polyfill (critical — without it, the app loads to a blank screen), remove the demo password gate, clean up `InviteUserForm` and `UserActions`.

4. **Build, test, deploy** the updated codebase to the existing S3 bucket and invalidate CloudFront.

5. **Create the real admin users** in Cognito via CLI (`aws cognito-idp admin-create-user` for each, with `--message-action SUPPRESS`). Set their `custom:role=admin` and `custom:status=active` attributes. Generate temp passwords using safe characters (avoid `!` due to zsh history expansion; use `@`, `#`, `&`, or `%` instead).

6. **Communicate temp passwords out-of-band** to each admin (text, phone, in person). Each admin signs in once, completes the force-change-password flow, and confirms they reach the home screen.

7. **Backup before cutover**: keep the pre-cutover ZIP saved at the user's working folder as a rollback point. If anything goes wrong during cutover, redeploying the pre-cutover version restores the mockup auth flow (the Cognito User Pool stays in place but is harmlessly unused).

**Estimated time per client build:** ~3 hours total. CFN deploy ~15 min, codebase integration ~2 hr (the bulk of the work, but mechanical), cutover ~30 min.

---

## 8.6 Apply desktop responsiveness

After Sprint 1 auth ships (8.5), apply the desktop responsiveness layer. This is the equivalent of PCCA's Sprint 1 Sessions 1.6 through 1.9, shipped as PCCA v16 in June 2026.

**Artifact:** `DST_Desktop_Responsiveness_Plan.md` (the decisions document) plus the implementation patterns captured in PCCA's v16 codebase, which is the reference build for desktop layout.

**Why this is a distinct phase.** The auth work changes how users get in; desktop responsiveness changes what they see once in. They are independent workstreams with separate verification flows. Doing them together creates two simultaneous moving parts during debugging; doing them sequentially makes each verifiable on its own. Order matters: auth first (because it underpins user identification on multi-user features), then desktop (UI polish).

**Sequence:**

1. **Confirm the responsive plan still applies.** Read `DST_Desktop_Responsiveness_Plan.md` and walk the user through the 12 confirmed decisions. Most will hold for any client; some (sidebar item order, modal vs sheet preferences) may need a per-client confirmation. Resolve any deltas before writing code.

2. **Add the `useIsDesktop` hook** that watches `window.innerWidth >= 1024`. This is the single source of truth for layout switching. Every responsive decision elsewhere in the codebase depends on this hook returning a stable boolean.

3. **Build the `Sidebar` component** containing the items per decision 3 of the plan. 240px wide, persistent (no collapse toggle), with the logo at top, primary navigation in the middle, and the user menu pinned to the bottom. Style with the brand palette and match the existing visual language.

4. **Wrap the app in an `AppShell`** that switches between mobile (current) and desktop (sidebar + main content area) layouts based on the hook. Verify routing works from sidebar clicks for each nav item. Test browser resize across the breakpoint.

5. **Refactor asset detail tabs to render conditionally based on `useIsDesktop`.** Mobile keeps the existing single-column stack; desktop renders the two-column treatments per decision 6 of the plan (Overview tab: Description + Impacts on left, Downstream + Upstream Dependencies on right; Critical Questions tab: Critical Questions on left, Short-Term Options on right). At the desktop breakpoint, the Critical Questions tab is labeled `"Critical Questions / Short-Term Options"`.

6. **Build a `Modal` component** (centered, darkened backdrop, close button, Escape key support) and refactor the existing `Sheet` primitive to switch between Modal and BottomSheet based on the breakpoint. Test each affected sheet — Configure Report, View Report, Critical Questions sheet, Initial Actions sheet — in both layouts.

7. **Surface upstream dependencies** via a small utility function in App.jsx that, given an asset ID, returns all assets that have THIS asset in their downstream edges. The data already supports this; only a new lookup and UI display are needed.

8. **Confirm per-asset Critical Questions** are present in extracted data. If `asset.criticalQuestions` is absent, update the extraction script and regenerate `src/data/assets.json` before adding the UI surfacing.

9. **Cross-browser test** on Chrome, Safari, Firefox at both mobile and desktop widths. Walk through every screen at both widths: Home, Processes list, Process detail (each tab), Systems list, System detail, Facilities list, Facility detail, Scenarios, Scenario detail, Map, Contacts, Admin Portal.

10. **Build and deploy.** Standard sequence: `npm run build`, `aws s3 sync dist/ s3://<bucket-name> --delete`, `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`. Verify in production at both desktop and mobile widths.

**Risk profile.** UI-only, no auth or data layer impact. Mobile experience unchanged so phone-using users see no difference. Rollback is just redeploying the prior ZIP (typically v15b for an auth-shipped-but-pre-desktop state).

**Estimated time per client build:** ~5-7 hours across the four implementation sessions. Sidebar shell ~1.5 hr, multi-column tab content + upstream dependencies ~2 hr, modal overlays ~1.5 hr, polish + deploy ~1.5-2 hr.

**Reference implementation:** PCCA v16 codebase. When uncertain about a styling decision or layout edge case, the v16 codebase is the canonical reference.

---

## 8.7 Back up the repositories and turn on access logging

Shipped September 8, 2026 as Phase 0 of the foundation work. Neither changes the app. Do both for any build that holds real client data.

### 8.7.1 Git backup to versioned S3

A local git repository on one laptop is not a backup. Bundle each repository into a single file that carries its complete history, and push it to a private, versioned bucket:

- Bucket: `s3://tlctrng-dst-git-backup` (us-east-2). Versioning on, AES256, all public access blocked, noncurrent versions expire after 365 days.
- Objects: one stable key per repository (`tlc-trng-dst.bundle`, `pcca-dst.bundle`), so versioning stacks one restore point per run.
- Script: `backup-repos.sh` at the project root. It verifies each bundle before upload, refuses to upload one that fails verification, and warns when a repository has uncommitted work, because a bundle only captures commits. Run it after every meaningful commit.

```bash
./backup-repos.sh

# restore the latest
aws s3 cp s3://tlctrng-dst-git-backup/pcca-dst.bundle .
git clone pcca-dst.bundle restored-repo

# restore an earlier point in time
aws s3api list-object-versions --bucket tlctrng-dst-git-backup --prefix pcca-dst.bundle
aws s3api get-object --bucket tlctrng-dst-git-backup --key pcca-dst.bundle --version-id <VersionId> pcca-dst.bundle
```

A bundle was chosen over a push/pull git remote because the need is disaster recovery, not collaboration: one file, full history, no third-party helper. **Test the restore; do not assume it.** The first backup was verified by pulling the bundle back from S3, cloning it, and confirming the history, the tag, the file count, and a HEAD identical to the live repository.

For a new client, add a line to the `REPOS` array in the script.

### 8.7.2 CloudFront access logging (standard logging v2)

Without logging there is no way to know whether anyone has requested the site or its bundle. Enabled for PCCA on September 8, 2026:

- Log bucket: `s3://tlctrng-cf-logs` (us-east-2), private, AES256, objects expire after 90 days. The bucket policy grants `delivery.logs.amazonaws.com` write access, scoped to the account and to delivery sources in us-east-1.
- Delivery source `pcca-dst-access-logs`, destination `pcca-dst-s3-dest`, delivery `v12cWMFRtqAoj9g2`. Path: `AWSLogs/<account>/CloudFront/pcca-dst/{yyyy}/{MM}/{dd}/`.

Three things that will trip you up:

1. **Create the delivery source, destination and delivery in `us-east-1`**, even when the log bucket lives elsewhere. CloudFront is a global service and its distribution ARN has no region.
2. **Use logging v2, not legacy logging.** Legacy logging writes through S3 ACLs, which new buckets disable by default, so it fails against a freshly created bucket. v2 goes through CloudWatch Logs vended delivery and needs no ACLs.
3. **`DistributionConfig.Logging.Enabled` reads `false` when v2 is on, and that is correct.** That field is the legacy toggle. Check v2 with `aws logs describe-deliveries --region us-east-1`.

The sandbox distribution was not included in Phase 0; it serves fictional data. For a new client, create a delivery source and delivery per distribution with its own prefix. The log bucket can be shared.

---

## 8.8 Scenario persistence and the data access layer

Shipped to the TLC_TRNG sandbox on September 8, 2026 as Phase 1 of the foundation work (commits `ef25de4` and `622c870`). **Not yet in any client build.** Per the product direction, the whole foundation block is worked out in the sandbox and ships to PCCA together as v4.0.0, not phase by phase. Design record: `DST_Phase1_Design_Proposal.md` at the project root.

### 8.8.1 What it fixed

- **Saved scenarios vanished on reload.** The save, load and delete UI was fully built but backed by in-memory state. The My Scenarios screen already told users their scenarios persisted between sessions; that copy was false until this shipped.
- **Drawn geometry was lost, and leaked between scenarios.** See 10.16.

### 8.8.2 Scenario persistence

Two modules, no new npm dependency:

- `src/db.js`: a small promise wrapper over IndexedDB. Creates four stores up front (`scenarios`, `workspace`, `dataCache`, `meta`). `dataCache` stays empty until the authenticated data channel lands, so that change needs no database migration. Falls back to an in-memory store when IndexedDB is blocked (private browsing, storage policy) and exposes `isPersistent()` so the app can say so, rather than let a user believe their work is saved. Requests durable storage with `navigator.storage.persist()` on first load.
- `src/scenarioStore.js`: the stored schema, the conversion between it and app state, legacy migration, and CRUD.

Stored schema, version 1:

```javascript
{
  schemaVersion: 1,
  id, name, createdAt, updatedAt, createdBy,
  status:      'draft' | 'active' | 'closed',
  dataVersion,                        // which reference dataset it was built on
  items:    [{ assetId, state }],     // replaces scenario[] + scenarioStates{}
  geometry: [ ... ],                  // drawn radius / polygon shapes
  notes:    [{ id, text, timestamp, author }],
  incident: null,                     // reserved for the EM layer
}
```

**Clean schema, adapt at the boundary.** The running app still holds `scenario` (an id array) and `scenarioStates` (a map). Rather than refactor every screen that reads them, `toStored()` and `fromStored()` convert at the storage edge. The persisted shape is future-proof, and a later refactor of app state needs no data migration. Every read passes through `upgradeRecord()`, so a future schema 2 is a function rather than an archaeology exercise.

The schema is **multi-instance from day one** (a `Workspace` record holds `activeScenarioIds`), even though the UI still shows one scenario at a time, so multi-scenario analysis will not need a migration.

**Field renames break the UI silently.** The schema renamed `created`/`updated` to `createdAt`/`updatedAt`. Three UI reads still used the old names; the build passed, and dates would have rendered as invalid. Grep for every old field name after any rename.

**Demo seeds are written once.** `seedIfFirstRun()` records a marker in `meta`, so a user who deletes the demo scenarios does not get them back on reload. Seeds are written in the legacy shape on purpose, so the migration path runs on every fresh install. As a consequence, seeded scenarios carry `dataVersion: null`, because migration refuses to invent a version it cannot know. Every seed must reference assets that exist in that build's dataset; see 10.18.

### 8.8.3 Data access layer

`src/dataLayer.js` is now the only place that knows where data comes from:

- **Source registry.** Five built-in sources (`assets`, `edges`, `depLookup`, `directors`, `personnel`), overridable from `data.sources` in `dst.config.js`. A client build can subset or add sources without touching the module.
- **`resolve(sourceKey)`** returns `{ data, origin, state, degraded, fetchedAt, ageSeconds, error, volatility, dataVersion }`, with precedence live, then cache, then baseline. Only the `baseline` adapter exists today (the bundled JSON), so behaviour is unchanged. The authenticated channel will be one more adapter.
- **Two source classes.** `reference` sources are resolved once per session, not polled, and flagged past `maxAgeSeconds` (24 hours). `live` sources poll and always fall back. See the principle in Section 0.
- **`degraded`** is true only when data came from somewhere other than the source's configured primary. A source configured as baseline-only is not degraded when it resolves from baseline, and it renders neutrally. Otherwise every screen shows a warning, people learn to ignore it, and it means nothing on the day a live source genuinely fails.
- **`hydrate()` owns every derived view.** Processes, systems and facilities, the id lookup, map pins and the Harbormaster fallback used to be separate module-level constants computed at import. They are now recomputed together on a single `DATA` object, so they cannot drift from the payloads they come from.

**`DataGate`** resolves and hydrates before the app renders, so every screen keeps its existing assumption that the dataset is present and synchronous. That held the change to about 37 call sites (`FACILITIES` to `DATA.facilities`) instead of converting every consumer to a hook. A required source that cannot resolve stops with a plain message rather than rendering a half-populated app. When the dataset moves behind authentication, `DataGate` has to move inside the signed-in region, because it will need a token.

**`DataProvenance`** renders origin and age. It appears on Critical Contacts and in the report header, which reads "Reference data · build 3.0.1", so a printed report states the dataset it was built on.

### 8.8.4 Verifying this kind of change

- **Test post-login screens locally without credentials** by temporarily forcing the initial `screen` and `currentUser` state, with a `TEMP-AUTH-BYPASS` comment on each changed line. Revert before committing, grep for the marker (it must return zero), then rebuild. Never enter real credentials to test.
- **Import store and data modules directly from the Vite dev server** in the browser console (`await import('/src/scenarioStore.js')`) to test adapters and migrations against real data. Production bundles are minified, so this only works on the dev server.
- **IndexedDB is per origin.** Test data written on `localhost:5173` is invisible to the live site, and the reverse. To replay first-run seeding locally, run `indexedDB.deleteDatabase('dst')` and reload.
- **Verify on the live site after deploying**, not only on localhost. On the live origin the stores should exist and the seeds should be present on first load, before sign-in.

---

## 9. Hand off, document, and prepare for iteration

### 9.1 Deliverables to summarize

After successful deployment, give the user a concise wrap-up message containing:

- Live URL
- Access code
- AWS distribution ID (for future invalidations)
- AWS bucket name
- The five files saved to project location (the codebase ZIP, the docx handover doc if produced, the build script outputs)
- Anything pending or flagged during the build (data gaps, missing colors, etc.)

### 9.2 Optional: handover document

If the user wants a handover document (similar to the PCCA "Initial System Overview & Roadmap"), produce one based on the PCCA template at `/home/claude/work/build_doc.py` from the prior engagement, or produce a fresh one from scratch. The template lives at the user's Hazmat-style template (`/mnt/user-data/uploads/1LS1_Field_Incident_Response.docx` for PCCA — every client's template will differ). Six-page target, sections: About the DST, Demo Access, How the DST Uses BIA Data, System Architecture, Development Roadmap, Recommendations for Transfer.

The roadmap section has been settled at seven sprints:

1. Real authentication and desktop responsiveness (Cognito, password-only, admin-mediated reset) — **shipped**
2. Persistence and shared scenarios, split in two. **2a, local persistence: shipped to the sandbox, September 2026** (IndexedDB, see 8.8), not yet in a client build. **2b, server sync for team sharing: pending**, to be built offline-first on top of 2a.
2.5. Weather overlay (NOAA radar, NWS forecast and alert polygons) — **shipped**, interstitial, not in the original seven
3. Real map — **shipped** via Mapbox GL, not Google Maps, and expanded well past "swap the SVG": spatial selection (radius and polygon drawing, in-shape facility picker, bulk add to scenario) plus two report sections (Affected Area Map, Weather Conditions & Forecast)
4. Progressive web app and offline support — **pending**
5. Dashboard / EOC display view — **pending**
6. Content polish and feedback — **pending**
7. Operational hardening and admin data update portal (CSV upload form replacing consultant-run extraction) — **pending**

Sprint numbering reflects the original roadmap, not build order. Sprint 3 was prioritized ahead of Sprint 2, and 2.5 was inserted, because the map and weather work plugged into each other and needed no backend.

**A sequencing note worth raising if the user asks.** Sprint 2 introduces a runtime dependency on a server, which is in tension with the independence principle in Section 0 — the disruptions the DST exists for are exactly when a server round-trip is least reliable. Build it offline-first: local persistence as the source of truth, server as replication and sharing. Splitting it into 2a (make saved scenarios survive a reload) and 2b (server sync for team sharing) gets real value early and sets up Sprint 4 naturally. 2a shipped in the sandbox in September 2026.

**From September 2026, build order follows the foundation plan.** The remaining work (authenticated data channel, durable offline, live data sources, multi-scenario analysis, the EM layer sketch, the EOC dashboard) is sequenced as Phases 0 through 7 in `DST_Foundation_Architecture_and_Phasing.md` at the project root. Phases 0 and 1 are complete. The block is built and validated in the sandbox, then ships to PCCA as v4.0.0. Keep the sprint numbering for client-facing roadmap documents; use the phase plan for build order.

If asked about timing, do not provide calendar dates. The user controls their own time and availability; sprints emerge at their pace.

### 9.3 Inform the user of next steps

Suggest:

- Send the demo to the client (use a similar email template to the one drafted for PCCA — explicit framing as "iterative working demo, not final production")
- Collect feedback from the client review
- Begin Sprint 1 (Cognito) when the client has reviewed and approved direction

---

## 10. Critical bugs to watch for

These are bugs encountered during the original PCCA build. Each is documented as symptom → cause → fix so future occurrences are recognizable.

### 10.1 Map screen renders blank

**Symptom**: Map view shows no pins, just empty space.
**Cause**: `PCCA_FACILITY_PINS` (or whatever the renamed equivalent is) was removed during code refactoring. The map component requires this derived list.
**Fix**: Verify the constant exists near the top of App.jsx, derived from `FACILITIES.filter(f => f.lat && f.lng)`. The variable name retains the `PCCA_` prefix in v14+ for historical reasons; that's fine, it's an internal identifier not a user-facing string.

### 10.2 Cascade scores all show 0 / LOW

**Symptom**: In the cascade report, every downstream item shows score 0 and "LOW" band.
**Cause**: The CascadeReportRow component reads `item.score`, but extracted data carries `restorationScore` only. They're the same value but different field names.
**Fix**: The extraction script must add `score` as an alias of `restorationScore` for every asset record. This is a known requirement; verify it in the extraction output.

### 10.3 Print-to-PDF only produces one page

**Symptom**: User clicks Print on the report, gets a one-page PDF showing only the first section.
**Cause**: Print CSS doesn't override the `height: 100%; overflow-y: auto` on the DSTApp container. Browser thinks the printable area is one viewport.
**Fix**: Print CSS must include:

```css
@media print {
  .dst-app-root, .pcca-app-shell, .dst-report-wrap, .dst-report {
    height: auto !important;
    overflow: visible !important;
  }
  .dst-no-print { display: none !important; }
}
```

The `dst-no-print` class is on TopNav and BottomNav components so they're hidden in print.

### 10.4 Pending or deactivated users can sign in

**Symptom**: A user with status `pending` (or `deactivated`) successfully reaches the home screen.
**Cause**: The login validation only checks for `deactivated` status, not `pending`.
**Fix**: After the email continue handler, before setting the found user, add a check for `u.status === 'pending'` with appropriate error message. Both pending and deactivated must be blocked.

### 10.5 Bullet points in document generation render flat

**Symptom**: Lists in generated Word docs appear as flat paragraphs instead of bulleted.
**Cause**: python-docx requires manual XML construction for bullet numbering, and the numId must match the source template's bullet style. PCCA template's bullet numId is `8`.
**Fix**: When using python-docx with the Hazmat-style template, every bullet paragraph must include:

```python
pPr = p._p.get_or_add_pPr()
numPr = OxmlElement('w:numPr')
ilvl = OxmlElement('w:ilvl'); ilvl.set(qn('w:val'), str(level))
numId = OxmlElement('w:numId'); numId.set(qn('w:val'), '8')
numPr.append(ilvl); numPr.append(numId)
pPr.append(numPr)
```

For non-Hazmat templates, inspect the template to find the correct numId (use a different value if needed).

### 10.6 Logo shows as black square on home screen

**Symptom**: The brand logo on the home screen appears with a thick black border.
**Cause**: A raster logo export with a non-transparent background. It hides on the login screen, where the logo sits on a white panel, and only shows up on the home screen against the natural background.
**Fix**: Rebuild the logo from the vector brand source per section 4. Vector has no background to remove, so this cannot recur. Do **not** knock the background out of the raster; that is what caused bug 10.11.

### 10.7 Cert doesn't appear in CloudFront SSL dropdown

**Symptom**: When configuring CloudFront, the Custom SSL certificate dropdown is empty or doesn't show the cert you just created.
**Cause**: ACM cert was created in the wrong region. CloudFront only sees certs from `us-east-1`.
**Fix**: Delete the misplaced cert (or just ignore it), switch AWS console to N. Virginia, request a new cert. DNS validation records already added to GoDaddy will validate the new cert too if the domain matches.

### 10.8 Cognito SDK causes blank white screen on app load (Vite + amazon-cognito-identity-js)

**Symptom**: After integrating `amazon-cognito-identity-js`, the app loads to a blank white screen. Console error: `ReferenceError: Can't find variable: global` or similar, with stack trace pointing into `node_modules/buffer/index.js`.
**Cause**: `amazon-cognito-identity-js` bundles its own copy of the Node-style `buffer` module, which references the `global` symbol at module load time. Vite does not provide `global` in the browser. The module throws on load and React never mounts.
**Fix**: Three-part polyfill, all required:

1. In `index.html` `<head>`, before any module script:
   ```html
   <script>
     window.global = window;
     if (typeof globalThis !== 'undefined') globalThis.global = globalThis;
   </script>
   ```

2. In `vite.config.js` `defineConfig({})`:
   ```javascript
   define: { global: 'globalThis' },
   optimizeDeps: { esbuildOptions: { define: { global: 'globalThis' } } },
   ```

3. Clear Vite's pre-bundle cache: `rm -rf node_modules/.vite`, then restart `npm run dev`.

Step 3 is critical and easily forgotten. Vite caches pre-bundled CommonJS dependencies on first run; without clearing, the cached version still has the unsubstituted `global` reference, even after you add the polyfill.

### 10.9 zsh history expansion mangles AWS CLI password arguments with `!`

**Symptom**: `aws cognito-idp admin-create-user --temporary-password "MyPass!2026" ...` returns `zsh: no such event: 2026` and the command never reaches AWS.
**Cause**: zsh treats `!` followed by digits or text as history expansion (`!2026` means "command number 2026"). Double-quoting doesn't disable this in zsh. Single-quoting does, but is awkward for variable substitution.
**Fix**: Use a different symbol in temp passwords for CLI commands. `@`, `#`, `&`, `%` all count as "special character" for Cognito's password policy and don't trigger zsh expansion. Examples: `Firstuser@2026`, `Setup#2026`. Or use single quotes around the entire password argument: `--temporary-password 'MyPass!2026'`. Or temporarily disable history expansion with `set +H` before the command.

### 10.10 Sign-in succeeds via CLI but fails via SDK with cryptic "BadRequest" error

**Symptom**: A user can sign in via `aws cognito-idp admin-initiate-auth` but fails via `amazon-cognito-identity-js`'s `authenticateUser` with the error: `BadRequest: The server did not understand the operation that was requested.`
**Cause**: The email entered into the React app doesn't match any user in the User Pool. "Prevent user existence errors" is enabled on the User Pool (a security best practice), so Cognito's response is intentionally vague. The SDK's error parser sometimes returns this generic message rather than a clear "user not found."
**Fix**: Verify the email being entered exactly matches a real user in Cognito (`aws cognito-idp list-users --user-pool-id <id>`). Case is preserved in storage but not in matching, so `admin@example.com` and `Admin@example.com` both match the same user.

### 10.11 Logo looks soft, muddy, or blurry, especially the logotype

**Symptom**: The client's logo reads fuzzy on a high-DPI screen. The wordmark under the mark is smeared or illegible. Letter strokes look uneven or ringed with dark fringing.
**Cause**: Two independent problems that usually appear together.

1. **The asset was damaged in processing.** A flood-fill or magic-wand background knockout clears only pixels below a darkness threshold, leaving anti-aliased edge pixels fully opaque at their dark value. The result is a 1-bit alpha channel with no anti-aliasing and near-black residue around every letterform. Diagnose it by bucketing the alpha channel: a healthy asset has a spread of intermediate values, a damaged one has only 0 and 255.
2. **Extreme browser downscale.** The lockup renders around 121px wide, so a PNG sized for high-DPI gets downscaled roughly 7x at paint time, smearing fine detail no matter how clean the source.

**Fix**: Convert from the vector brand source to SVG per section 4, which resolves both at once. Then check section 4.4: if the logotype is still hard to read, the placement is probably below the brand minimum size, which is a separate problem no asset change will fix.

### 10.12 A regenerate silently drops records

**Symptom**: After rerunning `extract_data.py`, something that used to appear in the app is gone. No error was printed.
**Cause**: `directors.json` is seeded from the hardcoded `WEBSITE_DIRECTORS` dict, not from the CSVs, so any entry hand-added to the generated JSON is overwritten. See the directors trap in section 5.2.
**Fix**: Move the entry into `WEBSITE_DIRECTORS`. More generally, diff every regenerated file against the deployed version before applying; the script's own output looks identical whether or not it dropped records.

### 10.13 Ported feature throws `ReferenceError: X is not defined` although the build passed

**Symptom**: After porting a component block from the sandbox into a client build, `npm run build` succeeds cleanly, but the app renders blank and the console shows `ReferenceError: Target is not defined` (or any other identifier) inside the ported component.
**Cause**: The transplanted JSX references a `lucide-react` icon (or any import) that exists in the sandbox's import list but not the client's. Vite compiles JSX without resolving free identifiers, so an unimported component is only caught when React tries to render it.
**Fix**: After any port, diff the import lists and add what's missing:

```bash
# compare the lucide-react import blocks of both files, then check which
# missing names are actually referenced in the ported code
```

The real PCCA case was `Target`, `Square`, and `CheckSquare`, all used by the spatial-selection UI. **A passing build is not verification.** Always load the app in a browser after a port; this class of bug is invisible until render.

### 10.14 Displayed version marker is stale and does not match the build

**Symptom**: The footer reads an old version (PCCA displayed `v2.0` while production was package `0.22`, then `0.23`) even though releases have shipped.
**Cause**: The marker was a hardcoded string in `App.jsx`, decoupled from `package.json`. Nobody remembered to edit it, for nine releases.
**Fix**: Derive it, so it cannot drift:

```javascript
import { version as PKG_VERSION } from '../package.json';

const DISPLAY_VERSION = (() => {
  const parts = String(PKG_VERSION || '0.0.0').split('.');
  return `v${parts[0] || '0'}.${parts[1] || '0'}`;   // 3.0.1 -> "v3.0"
})();
```

Render `{DISPLAY_VERSION}` in the footer. Major and minor show; patch does not. This is now baseline in both builds — verify a new client build has it rather than a literal.

### 10.15 Dev server returns 504 "Outdated Optimize Dep" and the app goes blank

**Symptom**: A running `npm run dev` suddenly serves a blank page; console shows `504 (Outdated Optimize Dep)` on dependency requests.
**Cause**: `node_modules/.vite` was deleted (usually by a `rm -rf node_modules/.vite && npm run build` in another terminal) while the dev server was running. The server's in-memory map of pre-bundled deps now points at files that no longer exist.
**Fix**: Restart the dev server. Nothing is wrong with the code. Related to 10.8 step 3 — clearing the cache is correct, just do it with the dev server stopped.

### 10.16 Drawn map shapes vanish from a saved scenario, or appear on the wrong scenario's report

**Symptom**: Draw a radius or polygon, save the scenario, reload it, and the shape is gone. Or: work in scenario A, load scenario B, generate B's report, and its Affected Area Map shows A's shape.
**Cause**: `saveCurrentScenario` never wrote geometry, and `loadScenario` never touched geometry, so shapes drawn under the previous scenario stayed in state and rendered on the next scenario's report.
**Fix**: Persist geometry on save. On load, set geometry from the record, and set it to `[]` when the record has none; that second half is what stops the leak. Fixed in the sandbox by 8.8 and verified end to end (a scenario with a shape shows the Affected Area Map; loading one without a shape immediately afterwards does not). PCCA v3.0.1 still carries this defect; it is fixed there when the foundation block ships as v4.0.0.

### 10.17 A screen opens scrolled partway down

**Symptom**: Generate a report after scrolling down the Scenario Builder and the report opens in the middle of Critical Questions, with Configure Report, Share Summary and Print / Save PDF off screen above.
**Cause**: Screens render inside one scrolling container that persists across navigation (`<main>` on desktop, `.dst-app-root` on mobile), so each screen inherits the previous one's scroll position.
**Fix**: Put a ref on the scroll container and reset `scrollTop` to 0 in an effect keyed on `screen` and `detailId`. Only one of the two containers renders at a time, so one ref serves both. Verify at both breakpoints by scrolling to the bottom of one screen and navigating. Fixed in the sandbox in commit `b87a931`. PCCA v3.0.1 still has this behaviour.

### 10.18 Demo scenarios load empty

**Symptom**: Loading a seeded demo scenario shows "No scenario yet" while the asset badge counts several assets.
**Cause**: The seeds reference asset ids from a different build's dataset. The sandbox's original seeds came down from PCCA lineage and pointed at PCCA ids (`T2-01`, `2CO07`) that do not exist in the Meridian data. That was invisible while nothing persisted, and very visible once persistence wrote the seeds into every visitor's browser on a demo site that prospects are given accounts for.
**Fix**: Write seeds against the build's own dataset and confirm every id resolves before shipping. The sandbox now has three: a ransomware scenario across six systems (with `manual` and `unable` states in use), `090826 - Production Outage` spanning systems, facilities and processes, and a flash flood scenario covering power and facilities, with a polygon that encloses exactly its five facilities.

---

## 11. Skill ergonomics (how to be a good build partner)

When you're driving a build for the user, think about flow and respect their time. A few patterns from the PCCA engagement that worked well:

**Confirm before producing.** Before writing `dst.config.js`, summarize the values you'll use and ask the user to confirm. This catches typos and misunderstandings cheaply. Same for any document or email draft — show the structure first, then produce after approval.

**Iterate openly when something breaks.** Bugs are normal in a build like this. When the user reports an issue, don't be defensive; trace the symptom, name the likely cause, propose a fix. The PCCA build had several real bugs caught in production (map blanking, cascade scores zero, pending users signing in) — each was found, traced, fixed, and shipped within minutes.

**Don't refuse to estimate, but be honest about uncertainty.** Time estimates, page counts, complexity assessments — give your best answer and flag where the variance is. The user will respect a clear "between 2-4 hours, leaning toward 3" more than "I can't say."

**Suggest next steps after each deliverable.** Don't just hand back artifacts and stop. After the codebase ZIP is delivered, suggest the npm install + smoke test sequence. After the deployment, suggest the verification checklist. After the wrap-up, suggest the follow-up email to the client. The user is moving from one task to the next; smooth handoffs save mental load.

**State deployment status explicitly.** "Verified in the browser" is ambiguous when the browser was pointed at localhost. After any change, say plainly whether it is local only, committed, backed up, or deployed, and to which site. In September 2026 a Phase 1 summary described the work as verified, and the user reasonably checked the live demo, where none of it existed yet. Before claiming something is live, compare the live bundle name with a fresh build of HEAD (8.3).

**Don't oversell or undersell what's working.** The PCCA demo is a working demo, not a finished product. When framing it for stakeholders, the right phrase is "iterative working demo." Avoid "production-ready" until Sprints 1-7 are done. Avoid "rough mockup" because it understates how much real work is in there.

**Maintain identity discipline.** This document is the product of a specific engagement and a specific consultant (Travis Cryan, TLC TRNG). Don't introduce other framings, tools, or providers when starting a new build. The PCCA build's architecture choices (AWS, standalone Cognito, no SSO, no Microsoft tenant integration) are deliberate; future builds default to the same posture unless the new client has a clearly different need.

---

## 12. What this playbook does not cover

For honesty: this playbook covers building a v1-equivalent demo plus the full Sprint 1 deliverable (Cognito auth backend + desktop responsiveness), Sprint 2.5 (weather overlay), and Sprint 3 in its full delivered scope (Mapbox map, spatial selection, the two report sections, overview PDF), along with version control (7.1), the sandbox-to-client port pattern (7.2), repository backup and access logging (8.7), and local scenario persistence with the data access layer (8.8). It does not yet cover:

- **Server-side persistence (Sprint 2b).** Shared scenarios, edit history, sync across devices. Local persistence (2a) is covered in 8.8, but only the sandbox has it: client builds on v3.0.x still hold saved scenarios in memory, so they do not survive a reload there.
- **The authenticated data channel (foundation Phase 2).** Planned in `DST_Phase2_Layout.md`, not yet built. Until it ships, bundled data is publicly retrievable (see Section 0).
- **Sprint 4 (PWA / offline support).** Service worker, offline scenario caching. No service worker exists yet in either build, so the footer's "Offline Ready" label overstates what the app can do.
- **Sprint 5 (Dashboard / EOC view).** Kiosk mode, large-screen presentation.
- **Sprint 6 (Polish and feedback).** Content refinement pass.
- **Sprint 7 (Operational hardening + admin data portal).** Logging, backup, cost monitoring, in-app data updates.
- **Real handover to the client.** The transfer of AWS account ownership, domain, and operational responsibility is a separate process.
- **Multi-tenant deployments.** Each client gets their own AWS resources and domain; no multi-tenant URLs.

When the user asks about any of the above, refer to this playbook's Section 9.2 (the seven-sprint roadmap) and the foundation phase plan, and acknowledge the playbook does not yet include execution detail for those sprints.

---

## Appendix A: Reference values from the PCCA build

For sanity-check during a new build. The PCCA build's known-good values, for comparison.

**Static site infrastructure:**
- Asset counts (v23): 30 processes, 131 systems, 57 facilities, 218 total operational assets, 561 cascade edges from 135 sources, 84 personnel, 18 directors
- Asset counts (v22, for comparison): 30 processes, 133 systems, 57 facilities, 220 total operational assets, 547 cascade edges, 85 personnel, 17 directors
- Brand colors: Dark Blue `#004E98`, Teal `#00A3C9`, Light Teal `#6FC8DF`, Navy `#114E7B`, Gray `#808285`
- Fonts: Zilla Slab (heading), Poppins (body), Aptos / Aptos Display (documents)
- CloudFront distribution ID: `E1LEZM0X55WJ6A` (PCCA only)
- CloudFront distribution domain: `d3u9be9mylzxku.cloudfront.net` (PCCA only)
- AWS bucket: `pcca-dst-prod` in `us-east-2` (PCCA only)
- Domain: `pcca-dst.com` registered at GoDaddy under Travis (PCCA only, dedicated-domain deploy)
- Access code (pre-Sprint-1, now unused): `pcca-2026`
- Bullet numId for python-docx: `8` (template-specific to the Hazmat template; verify per new template)

**Logo (v23, vector):**
- Assets: `pcca-logo-stacked.svg` (13KB), `pcca-logomark.svg` (1.8KB), `pcca-logo-horizontal.svg` (12.8KB), all generated from the brand PDFs by `scripts/build_logo_assets.py`
- Stacked aspect ratio: `324 / 273.6` = **1.1842**, from the source viewBox
- Logomark aspect ratio: `314.54 / 212.16` = 1.4826
- Horizontal aspect ratio: `432 / 72` = 6.0
- Brand minimum widths (Brand Guidelines 2024-25, p.10, at 96px = 1in): stacked 120px (1.25"), logomark 48px (0.5"), horizontal 156px (1.625")
- Logotype fill: uniform `#7B7979`, fully opaque
- All four in-app placements render at 120.8px wide (1.258"), via the `LOGO_H` constant
- **Superseded:** v22 and earlier used `pcca-logo-stacked.png` at 1204 x 1008, ratio 1.20. Both the asset and that ratio were wrong; see section 4.0.

**Sprint 1 auth stack (manually managed, not from CFN):**
- AWS Account: `290046508760` (TLC_TRNG, LLC)
- Region: `us-east-2`
- Cognito User Pool ID: `us-east-2_0wbfDAlGy`
- Cognito User Pool ARN: `arn:aws:cognito-idp:us-east-2:290046508760:userpool/us-east-2_0wbfDAlGy`
- Cognito App Client ID: `4dsl8jp0vdr7n3uoac173cn2ds`
- API Gateway ID: `k8n58qwkbj`
- API Gateway Invoke URL: `https://k8n58qwkbj.execute-api.us-east-2.amazonaws.com/`
- JWT Authorizer ID: `ytvbup`
- Lambda admin role ARN: `arn:aws:iam::290046508760:role/dst-lambda-admin-role`
- Lambda functions: `dst-admin-invite`, `dst-admin-deactivate`, `dst-admin-reactivate`, `dst-admin-reset-password`, `dst-admin-change-role`
- Real admin users: Travis (travis@TLCTRNG.com), Danielle Hale (dhale@pocca.com), Peggy Fonseca (pfonseca@pocca.com), Brooks Lobingier (blobingier@pocca.com)
- Token durations: access 8h, ID 8h, refresh 30 days
- Temp password validity: 90 days
- MFA: optional, TOTP only (no SMS)

**Note:** PCCA's auth stack was deployed manually via AWS Console click-through during Sessions 1.1 and 1.2 of the May 2026 sprint. Future client auth stacks deploy via `dst-auth-cloudformation.yaml` instead (one command). PCCA's stack is not managed by that CFN template and would require a separate "import to CFN" operation to bring it under template management. Out of scope for now.

**Sprint 1 desktop responsiveness (shipped June 2026):**
- Breakpoint: 1024px (mobile below, desktop at and above)
- Sidebar: persistent, 240px wide, no collapse toggle
- Sidebar items (top to bottom): Logo, Home, Scenarios, Map, Critical Contacts, Admin Portal (admin-only), spacer, User menu
- Asset detail tabs: same structure on both breakpoints; two-column content on desktop
- Sheets on desktop: render as centered modal overlays with darkened backdrop
- Critical Questions tab label on desktop: `"Critical Questions / Short-Term Options"` (truth-in-labeling because both sets render side-by-side)
- Map screen on desktop: single-column full-width (no facility-list sidebar)
- Home screen tiles preserved at both breakpoints
- Mobile experience: unchanged from v15b

**Version history:**
- v14 (April 2026): refactor to single source of truth (`dst.config.js`); mockup auth
- v15 (May 2026): Sprint 1 auth integration with AWS Cognito
- v15b (May 2026): Cognito SDK + Vite global polyfill fix; live production with auth verified
- v16 (June 2026): Sprint 1 desktop responsiveness layer
- v22 (July 2026): Sprint 3 real map (Mapbox GL) + Sprint 2.5 weather overlay (NOAA radar, NWS forecast strip, NWS alert polygons)
- v23 (August 21, 2026): data cycle 081826 + logo rebuild
  - Data: T2-14 MaintainX retired into T2-09 Trimble Unity, T3-16 MailChimp folded into T4-03 SalesForce (zero residue verified across assets, edges, depLookup); 12 personnel reassigned; three new departments (Business Development, Commercial & Marketing, International Business)
  - Logo: all assets rebuilt from vector as SVG, replacing a raster set damaged by the old flood-fill knockout; all four placements raised to the 1.25" brand minimum; favicons and app icon regenerated from the logomark; `public/` dropped from 240KB to 43KB
  - Personnel (cycle 082126): Harbormaster role change; the Assistant Harbormaster seat is intentionally unlisted pending backfill
  - `extract_data.py` made runnable outside the web-chat sandbox
- **v3.0.0 (August 2026): parity port from the TLC_TRNG sandbox, and the move to semantic versioning.** Spatial selection (radius and polygon drawing, in-shape facility picker, bulk add), report Affected Area Map, report Weather Conditions & Forecast, overview PDF in three placements. Ported as whole-section transplants from the sandbox rather than hand-written code. Version scheme moved from the `0.x` / `vNN` track to `3.x` to match the sandbox — a client-facing build reading `v0.23` reads as pre-release. The hardcoded `v2.0` footer marker was replaced with the `DISPLAY_VERSION` derivation (see 10.14).
- **v3.0.1 (August 2026): current live production state.** Patch on top of the parity port, verified live serving `3.0.1`.
- **September 2026 (no version bump):** repository brought under git — baseline commit tagged `v3.0.1` at exactly the deployed state, package `name` normalized `dst-demo` → `pcca-dst` as a follow-on commit. Metadata only; the rebuild produced an identical asset hash so no redeploy was required.

**Version scheme.** Both builds now use semantic `major.minor.patch` in `package.json`, with the footer showing `major.minor` only (`3.0.1` → `v3.0`). Patch for fixes and cosmetics (footer unchanged), minor for new capability (footer changes), major by explicit decision only.

**Repositories (September 2026).** Both are local git repositories with no git remote. Full history is backed up as bundles to versioned S3 (8.7.1); the tag marks the deployed baseline.
- Sandbox: `TLC Demo DST/tlc-trng-dst`, package `tlc-trng-dst`, tagged `v3.0.1`. Several commits ahead of the tag as of September 11, 2026, all deployed; see Appendix C
- Client flagship: `PCCA DST Build/pcca-dst-live/pcca-dst-demo`, package `pcca-dst`, tagged `v3.0.1`
- The PCCA repo holds `extract_data.py` but **not** its input CSVs, which live outside the repo in `pcca-dst-live/pcca-dst-current csv/`. The transform is therefore not reproducible from a clone alone. The sandbox does not have this gap — its `source-data/` is committed. Decision (September 2026): move the CSVs into the repository as `source-data/` with stable filenames at the next PCCA data cycle, and repoint `UPLOAD_DIR`.

**Overview PDF (v3.0.0+).** Config key `overviewPdf` in `dst.config.js`, surfaced in three placements, all reading the same config value: the login screen link, the desktop sidebar "Instructions" nav item (always last, pushed after the admin item, using the sentinel screen key `__overview__`), and the full-width button at the bottom of the home screen. PCCA serves its own `public/overview.pdf`, and the bucket also serves it at the extensionless `/overview`.

These are PCCA-specific. New builds will have their own versions of each.

---

## Appendix B: Future maintenance of this playbook

When the user develops new capability that should become the starter template's baseline, update both the starter template and this playbook so the next build benefits.

**Status of past triggers:**

- ~~When Sprint 1 ships~~ → **Done June 2026.** Section 0's auth principle updated to reflect Cognito as standard. Section 8.5 added for auth backend deployment. Section 8.6 added for desktop responsiveness. Section 10 expanded with the four Sprint 1 critical bugs (Cognito + Vite global polyfill, zsh `!` history expansion, BadRequest SDK error, first-admin chicken-and-egg bootstrap). Appendix A populated with PCCA's working auth stack values and the desktop responsiveness decisions.

- ~~When Sprint 3 (map) ships~~ → **Done July 2026.** Real map implemented via Mapbox GL (not Google Maps as originally planned; Mapbox chosen for pricing and no-key-required government radar overlay compatibility). Requires `mapbox` config section in `dst.config.js` with `token`, `defaultStyle`, and `styles`. Public/publishable token (`pk.*`) is safe for browser bundling but should be scoped to accepted URL referrers on the Mapbox dashboard.

- ~~When Sprint 2.5 (weather overlay) ships~~ → **Done July 2026.** An interstitial sprint not in the original roadmap, added because it plugs directly into the map and uses no-key government data. Requires `weather` config section in `dst.config.js` with three sub-sections: `radar` (NOAA base-reflectivity WMS animated loop), `forecast` (NWS current + horizon strip), `alerts` (NWS warning polygons with proximity filter). NWS requires a User-Agent identifying the app.

- ~~When the logo pipeline is proven wrong~~ → **Done August 2026 (v23).** Section 4 rewritten end to end around vector-to-SVG conversion, replacing the flood-fill raster knockout that had been producing damaged assets since v14. Section 4.0 records the measured evidence, 4.4 adds brand minimum sizes as an enforced floor rather than a guideline, and Section 10 gained 10.11 (blurry logo) and 10.12 (silent record loss on regenerate). Section 5.2 documents the `WEBSITE_DIRECTORS` seeding trap. Appendix A's logo block replaced; the old 1204/1008 ratio was measured off the damaged bitmap and was wrong by 0.9%.

  **Carry-forward lesson:** the defect shipped for nine versions because the playbook told the builder to do it. When a technique here produces a bad result, fix the playbook in the same pass as the code, or the next client inherits it.

- ~~When the full Sprint 3 suite ships to the client~~ → **Done September 2026 (v3.0.0/v3.0.1).** Section 9.2's roadmap corrected (Sprint 3 was Mapbox, not Google Maps, and grew well past "swap the SVG"). Section 12's coverage updated. Section 10 gained 10.13 (missing imports after a port), 10.14 (stale version marker), and 10.15 (Vite 504 after clearing the dep cache mid-run). Appendix A gained the v3.0.x entries, the semantic version scheme, and the overview PDF pattern.

- ~~When the builds come under version control~~ → **Done September 2026.** Section 0 gained the version-control and sandbox-first principles. Section 7.1 added (git init pattern, `.gitignore` first, what to commit, tagging the deployed state, the repo-local identity fix). Section 7.2 added (the diff-before-splice port pattern). Section 8.3 gained the Claude Code permission-classifier constraint on `aws s3 sync` and the per-file fallback, plus checksum verification.

  **Carry-forward lesson:** two of the three new bugs in Section 10 were invisible to a passing build — an unimported icon and a hardcoded version string. Build success is not verification. Load the app.

- ~~When foundation Phase 0 (backup and logging) ships~~ → **Done September 8, 2026.** Section 8.7 added: git bundle backup to versioned S3 with a tested restore, and CloudFront standard logging v2 with its region and legacy-toggle traps.

- ~~When Sprint 2a / foundation Phase 1 (local persistence and data layer) ships to the sandbox~~ → **Done September 8, 2026; recorded September 11.** Section 0 gained the reference-data and provenance principles and the known cost of bundling. Section 8.8 added (IndexedDB persistence, schema v1 with boundary adapters, the data access layer, DataGate, DataProvenance, verification practice). Section 8.3 gained the live-versus-HEAD deploy check and a corrected classifier note. Section 10 gained 10.16 (geometry lost and leaked), 10.17 (screens open scrolled down) and 10.18 (demo seeds load empty). Section 11 gained the deploy-status rule. Appendix C added for sandbox reference values.

  **Carry-forward lesson:** "verified" is not "deployed". Say which, every time.

**Pending triggers:**

- **When foundation Phase 2 (authenticated data channel) ships:** Rewrite Section 0's note on the cost of bundling, since data will no longer ship in the bundle. Update 8.8: DataGate moves inside the signed-in region, provenance wording changes once there is no bundled baseline, and `dataVersion` comes from the data manifest. Document the data bucket, manifest Lambda and route, and add the data publish step to 8.3. Re-run the anonymous bundle test and record the result.
- **When the foundation block ships to PCCA as v4.0.0:** Move the relevant parts of Appendix C into Appendix A, and update 10.16 and 10.17 to record PCCA as fixed.
- **When Sprint 2b (server sync) ships:** Local persistence (2a) is already documented in 8.8. Update Section 0's "BIA Workbook is the source of truth" to acknowledge a server-side scenario store; update the architecture references in handover docs; extend 8.8 with the sync layer. Capture whichever shape it takes — the offline-first split described in 9.2 (local store first, server sync second) or a straight server-backed store — and if it is the latter, revisit Section 0's independence principle honestly rather than quietly. Note: Sprint 2 was deferred in PCCA's actual build sequence; Sprints 2.5 and 3 shipped first.
- **When Sprint 4 (PWA / offline) ships:** Add a section on service worker setup and offline-first scenario caching pattern, and correct the footer's "Offline Ready" label to reflect real state.
- **When Sprint 5 (EOC dashboard) ships:** Add a section on kiosk-mode considerations and large-screen presentation patterns.
- **When Sprint 6 (polish) ships:** Mostly content-side work; lightweight playbook update.
- **When Sprint 7 (hardening + admin data portal) ships:** Update Section 5 to mention that data refreshes can happen through the admin portal rather than through the Python extraction script. Add operational hardening notes (logging, backup, cost monitoring, deployment runbook).

The playbook is a living document. Outdated content is worse than missing content, so revisions should happen at the same time as code changes, not after.

**Last updated:** September 11, 2026, after foundation Phases 0 and 1 shipped: repository backup and access logging, and local scenario persistence with the data access layer deployed to the sandbox, plus the demo seed and scroll fixes. The playbook moved to the project root the same day, because it is organization-agnostic. Prior revisions: September 8, 2026 after the v3.0.x parity port and git; August 21, 2026 after v23; July 5, 2026 after v22.

---

## Appendix C: Reference values from the TLC_TRNG sandbox

The sandbox is the capability platform: new work is built and validated here before any client build receives it. Values verified September 11, 2026.

**Deployment:**
- URL: `https://tlctrng.demo-dst.com`
- S3 bucket: `tlctrng-demo-dst` (us-east-2)
- CloudFront distribution: `E2VY0OWWUSRNM1`
- Live bundle: `index-DUEfuGYb.js`, identical to a fresh build of HEAD (`b87a931`)
- Access logging: not part of Phase 0 (PCCA only)

**Auth stack (separate from PCCA's):**
- Cognito user pool `us-east-2_3tqzC2SvO`, app client `7cesdcbto1faommuccf1bns09t`
- API Gateway `2f26y4pt1d` (`tlctrng-dst-admin-api`), JWT authorizer `uyvqf3` trusting exactly that pool and client
- Admin Lambdas `tlctrng-dst-admin-invite`, `tlctrng-dst-admin-deactivate`, `tlctrng-dst-admin-reactivate`, `tlctrng-dst-admin-reset-password`, `tlctrng-dst-admin-change-role`, all behind the authorizer

**Dataset (Meridian sample data):**
- 25 processes, 35 systems, 15 facilities (75 assets); 15 map pins; 40 personnel; 46 edge source entries
- Facility coordinates cluster in Washington, DC

**Repository:**
- `TLC Demo DST/tlc-trng-dst`, package `tlc-trng-dst`, version `3.0.1`, tag `v3.0.1` on the July 23 baseline
- Since the tag: logo and overview PDF updates (August 12), then `ef25de4` and `622c870` (Phase 1), `613625f` (demo seeds) and `b87a931` (scroll reset), all deployed September 8
- Version not yet bumped. Phase 1 adds capability, which under the version scheme is a minor bump (`3.1.0`, footer v3.1). Pending the user's decision.

**Demo scenarios (seeded on first run):**
- Ransomware, identity and file services: `S005`, `S004`, `S017`, `S011` (manual), `S027`, `S028` (unable)
- Production Outage (`090826`): `S001`, `S018`, `F003`, `F005`, `2CO01`, `2CO08`
- Flash flooding, logistics corridor: `S001`, `S002` (fixing), `F005`, `F006`, `F008`, `F013`, `F014`, plus one polygon over the corridor

**Foundation documents (project root):** `DST_Foundation_Architecture_and_Phasing.md`, `DST_Phase1_Design_Proposal.md`, `DST_Phase2_Layout.md`. `DST_Code_Session_Setup.md` is superseded and archived in `TLC Demo DST/Supporting Info/`.

---

*End of playbook. Hand this to a future LLM at the start of a new DST build.*
