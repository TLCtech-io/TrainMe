# LMS Build Playbook (v1)

**Purpose.** This document provides operating instructions for any LLM (Claude or otherwise) tasked with building a custom Learning Management System (LMS) for TLC_TRNG, LLC, or one of its clients. It is written in the second person, addressed to the LLM. The user is the consultant initiating the build (typically Travis Cryan of TLC_TRNG, LLC).

**How this playbook is used.** A user will start a new chat or project, attach this playbook, then say something like "let's pick up the LMS build" or "build out the instructor grading slice." From that point, you drive the build conversationally: ask the user for inputs, produce files, walk them through local testing and (later) AWS deployment, and deliver working iterations. This playbook tells you what to ask, when to ask it, what to produce, and what to watch for.

**Relationship to the DST playbook.** This LMS build is a sibling of the DST (Decision Support Tool) program documented in `DST_Build_Playbook_v2.md`. It deliberately reuses the DST's architectural spine: a React single-page app on S3 + CloudFront, a parameterized CloudFormation auth stack (Cognito User Pool with `custom:role` and `custom:status`, admin Lambdas behind an HTTP API with a JWT authorizer), and the same config-driven, iterative build philosophy. Where the DST and LMS diverge, this playbook says so explicitly. If you have not read the DST playbook, read it first; most of the AWS, branding, and deployment conventions there apply here unchanged.

**Single source of truth.** Everything organization-specific lives in one config module, `lms-app/src/lms.config.js` (the LMS analog of `dst.config.js`): org identity, brand mark, brand tokens, fonts, client-facing copy, and feature flags. Content and data stay out of components. The backend contract lives in `lms-app/src/api/mockApi.js`, whose method signatures the backend must satisfy, with the method list pinned in `API_CONTRACT` (`lms-app/src/api/index.js`). Sprint 1 (v0.2.0) broke the Sprint 0 single-file scaffold (`lms_vertical_slice.jsx`, kept at the repo root as the historical artifact) into this project tree; see Section 8.2 for the tree and the config shape.

**Sequence at a glance.**

1. Confirm what the user wants and where the build currently stands.
2. Re-ground in the architecture (this document, the scaffold, the DST spine).
3. Pick the active sprint and confirm its scope.
4. Build the slice against the mock data layer first; prove it headlessly.
5. Wire the corresponding AWS resources only after the front end proves out.
6. Test locally against real AWS, then deploy.
7. Capture lessons back into this playbook.

Each step is detailed below.

---

## 0. Before you start: critical principles

These are the design philosophies that should inform every architectural decision in the LMS build. Internalize them before producing anything.

**The passion.io gap is the reason this exists.** TLC_TRNG already builds courses in Articulate Rise360 (SCORM) and already hosts content via passion.io and an S3 embed. What those platforms do NOT provide, and what justifies a custom build, is: separate instructor access with grading, gated progression (a learner cannot advance until an instructor approves), true prerequisite enforcement with a path to upload external proof, and a real system of record for enrollments, attempts, and transcripts. When you are deciding what to build or how, optimize for the things passion.io and Reach360 cannot do. Do not spend effort re-creating generic content playback that already works elsewhere; spend it on the gap.

**SCORM is the load-bearing content standard; design for xAPI later.** Rise360 exports SCORM, and SCORM 1.2 is still the dominant compliance standard. Ship SCORM 1.2 support first because it covers TLC_TRNG's existing content and certificate records. Design the data model so an xAPI / Learning Record Store layer can be added later (cmi5 is the future-readiness flag), but do not build the LRS in v1. Treat "SCORM now, xAPI later" as settled unless the user explicitly reopens it.

**The mock data layer is the API contract.** Every data operation goes through a single `api` object (built in `lms-app/src/api/mockApi.js`, obtained through `createApi()` in `lms-app/src/api/index.js`) whose method signatures are exactly what the real Lambda endpoints will be (`signIn`, `listCatalog`, `listEnrollments`, `enroll`, `getCmi`, `commitCmi`, `getCertificate`). To go live, replace each method *body* with a `fetch()` to the corresponding endpoint, JWT in the Authorization header. Components never change. When you add a feature, add its method to this object first, with the signature the backend will honor, then implement the mock body, then add its name to `API_CONTRACT`; the contract test (`npm test`) fails if the object and the list drift apart in either direction. This discipline is what keeps the front end and the eventual backend in lockstep.

**The mock store mirrors the DynamoDB single-table keys.** The in-memory store keys items the way the planned single table will: `USER#`, `COURSE#`, `ITEM#`, `ENROLL#`, `CMI#`, `CERT#`. Keep this mirroring exact. When you design a new access pattern, design the key first, confirm it falls out of the single-table model (or a defined GSI) without a scan, then implement it. This is the DST's "BIA Workbook is the source of truth" discipline, adapted: here the discipline is that the key design is the source of truth for what queries are cheap.

*Status at Sprint 1: not yet exact.* A Sprint 1 read of the code found that the Sprint 0 store, carried unchanged into `lms-app/src/api/mockStore.js`, does not actually use PK/SK items. It keys records `${sub}::${courseId}` across three maps (enrollments, CMI, certificates); users and courses are seed constants rather than `USER#`/`COURSE#` items; there are no `ITEM#` records; and CMI is keyed per course, not `CMI#<courseId>#<scoId>`. Re-keying to real PK/SK items, with a GSI1 emulation for the roster, is the recommended first step before Sprint 2, because the instructor roster and grading queue need those access patterns. The api signatures do not change, and the change is contained in `lms-app/src/api/` (`mockStore.js` and the method bodies in `mockApi.js`); no component changes. Settle the open design points first (how `scoId` enters the `getCmi`/`commitCmi` contract for multi-SCO packages, and the catalog GSI shape).

**Identity comes from the session, never from a table scan.** In the scaffold, the learner's `sub`, `name`, and `email` come from the session profile (the real backend reads them from the verified JWT). Never reverse-look-up a user by scanning the seed table; that pattern caused a hard crash in an early version (a `.find()` returned `undefined`, and destructuring `undefined` threw). If you need the caller's identity, read it from the normalized session.

**Email dependency is acceptable here; it is NOT for the DST.** The DST is an incident-time tool and must not depend on email. The LMS is not an incident-time tool, so depending on email (certificate delivery, registration confirmations, waitlist approvals) is correct. SES is the natural fit. This is a deliberate, documented divergence from the DST's independence principle. Do not import the DST's "no email" rule into the LMS.

**Match the working surface to the phase, and prompt the move at the right time.** Design and decision work (architecture, debugging a single artifact, working through this playbook) belongs in Chat, where the user can see your reasoning and redirect. Hands-on building of a real multi-file project tree, running the dev server, headless tests, and AWS deploys, belongs in Claude Code, which works inside the repo on disk and runs commands directly. The transition point is the start of Sprint 1: the moment the single-file scaffold becomes a real project tree is the moment Code becomes the better tool. When you reach that point, proactively prompt the user to move to Code rather than continuing to hand them files to save manually (see Section 7, Sprint 1, and Section 8.1). Do not switch everything to one tool; sequence them. Keep using Chat for the design conversations that precede and punctuate each sprint.

**Iterative, vertical slices, not horizontal layers.** Build one thin path all the way through (sign in -> enroll -> complete -> certificate) before widening. Each subsequent sprint widens already-tested rails rather than laying new untested ones. The first deliverable proved the full student vertical; everything after extends that spine.

**Brand identity carries from TLC_TRNG.** Use the TLC_TRNG slate-and-amber palette and the Zilla Slab / Poppins type pairing (same as the DST builds). Slate-900 `#0F172A`, Slate-800 `#1E293B`, Slate-700 `#334155`, Slate-500 `#64748B`, Amber-500 `#F59E0B`, Amber-600 `#D97706`. Do not introduce a new visual identity without reason.

---

## 1. Confirm what the user wants and where the build stands

Start by establishing where in the roadmap the build currently is. Do not assume the user is starting fresh; this is an ongoing program with a scaffold already built.

**Ask (in natural prose, not all at once):**

1. Which sprint are we working on, or is this a new direction?
2. Is the working copy current? Since Sprint 1 the code is the `lms-app/` tree in the GitHub repo `TLCtech-io/TrainMe`; in Claude Code, read it from the repo. In Chat, ask the user to share the files the session needs.
3. Are we still in localhost / mock-data mode, or have AWS resources been stood up yet?
4. Do you have new content (SCORM packages) or test data to fold in?
5. Is there a new domain yet, or are we still sandboxing on localhost?

**Proceed when:** You know the current sprint, have the latest code in your working environment, and understand whether AWS exists yet. Accept partial answers and make gaps visible.

---

## 2. Re-ground in the architecture

Before producing anything, confirm the shared mental model. The LMS reuses the DST spine with two notable additions and one divergence.

**Reused from the DST, essentially unchanged:**

- React SPA, built with Vite, deployed to a per-client S3 bucket fronted by CloudFront.
- The CloudFormation auth stack pattern from `dst-auth-cloudformation.yaml`: a Cognito User Pool with `custom:role` and `custom:status` attributes, admin-only user creation, optional TOTP MFA, no SMS or email-magic-link flows, admin Lambdas behind an HTTP API with a JWT authorizer.
- AWS account, region (`us-east-2` for most resources, `us-east-1` for ACM certs), and GoDaddy DNS conventions.
- Branding, logo processing, and favicon generation (Sections 3 to 4 of the DST playbook apply directly).

**New for the LMS (not present in the DST):**

- **A real persistence layer (DynamoDB single-table).** The DST only visualizes a static workbook and needs no system of record. The LMS is fundamentally a system of record (enrollments, attempts, grades, transcripts). This is the single biggest architectural addition. See Section 5.
- **A SCORM runtime that captures and persists CMI data.** The DST has no content playback. The LMS must host SCORM content from S3 and capture the runtime (completion status, score, `suspend_data` bookmark) keyed to the logged-in user. See Section 6.

**The one divergence:** the LMS adds an `instructor` role (the DST has only `user` and `admin`) and depends on outbound email (SES). Both are deliberate.

---

## 3. The role model

Three roles, carried on the Cognito `custom:role` attribute (extending the DST's two-role model):

- **student**: enrolls, consumes content, submits work, views own transcript and certificates.
- **instructor**: scoped to their own courses: builds course shells, grades submissions, sends work back with comments, approves gated progression, manages rosters and attendance.
- **admin**: full access: user management, course publishing, programs/learning paths, reporting, certificate templates.

The Lambda authorizers extend the DST's `custom:role === "admin"` check to recognize `instructor` where appropriate. Instructor access is the specific capability passion.io cannot provide, so it is a first-class concern, not an afterthought.

---

## 4. The course and content model

Settled abstractions, chosen to avoid the "three copies of one course" trap:

- **Course**: a shell with metadata (title, description, status, passing score, certificate template reference, and an optional `contentSource` flag of `self-hosted` | `articulate-connected` per Section 6). One course, one catalog entry, whether a learner is taking it fresh or claiming prior credit.
- **ContentItem**: a piece of content attached to a course: SCORM package, native video, downloadable document, or quiz. Carries type, launch path (an S3 URL for SCORM), and order.
- **Offering**: a course delivered in a specific modality (self-paced, hybrid, instructor-led virtual, instructor-led in person) on a schedule, with its own roster. A per-offering setting controls which content items are required for that modality. This is how one course shell serves in-person, hybrid, and online delivery without duplication.
- **Enrollment**: a learner in an offering (or a self-paced course), with status (`enrolled` -> `in_progress` -> `completed`), timestamps, and score.
- **Attempt / CMI record**: per-learner, per-SCO runtime state: `suspend_data` (the resume bookmark), `lesson_status`, `score`, attempt count.
- **Submission**: uploaded work awaiting instructor grading (the gated-progression and grading path).
- **Program / Learning Path**: an ordered bundle of courses, assignable individually or as a program, one-time or on a recurring/recertification schedule.
- **Prerequisite**: a course that blocks enrollment until completed, with a learner-facing "challenge / upload external proof" path.
- **Certificate / Credential**: generated PDF (stored in S3), issued on completion, emailed via SES. The entity is designed forward-compatible with the self-hosted digital-credential path (Section 6.5 and the credential sprints): it carries, or has room to carry, a stable public credential ID, issuer identity, the achievement criteria, the skill or competency recognized, an optional evidence URL, and issued/expires timestamps. These are the Open Badges fields; populating them costs nothing in the PDF-only phase and means the verification page and later badge layer need no data-model migration.

The v0.1 scaffold implements Course, ContentItem (implicitly, as the SCORM launch), Enrollment, CMI record, and Certificate. The rest arrive in later sprints.

---

## 5. The persistence layer (DynamoDB single-table)

**Decision: DynamoDB single-table.** Chosen for AWS-native fit, lowest cost at sandbox scale, and alignment with the DST's "Sprint 2" roadmap. The escape hatch: keys are designed so that if reporting outgrows Dynamo, the data can be mirrored to Athena or Postgres without reworking the app layer. Aurora/Postgres was the runner-up (easier transcript and reporting joins) and remains the documented fallback if relational reporting becomes the dominant need.

**The table design for the student vertical (extend, do not rewrite, as sprints add entities):**

| Entity | PK | SK | Notes |
|---|---|---|---|
| User profile | `USER#<sub>` | `PROFILE` | Mirror of Cognito sub; role cached for queries |
| Course | `COURSE#<courseId>` | `META` | Title, status (draft/published), SCORM S3 prefix, cert template ref |
| Content item | `COURSE#<courseId>` | `ITEM#<itemId>` | Type (scorm/video/doc/quiz), launch path, order |
| Enrollment | `USER#<sub>` | `ENROLL#<courseId>` | Status, enrolledAt, completedAt, score |
| CMI runtime | `USER#<sub>` | `CMI#<courseId>#<scoId>` | suspend_data, lesson_status, score, attempt count |
| Certificate | `USER#<sub>` | `CERT#<courseId>` | S3 key of generated PDF, issuedAt |

**GSIs:** GSI1 inverts the enrollment key (`COURSE#<courseId>` / `ENROLL#<sub>`) so an instructor or admin can pull a course **roster** without a scan. A published-courses query (status as the partition on a second GSI, or a filtered query on a known set) serves the **catalog**. The **transcript** is "query all `ENROLL#` items under `USER#<sub>` where status = completed." Roster, catalog, transcript, and the resume bookmark all fall out of this without table scans.

**When adding a new entity:** design the PK/SK first, confirm the access patterns it needs are covered by the table or an existing GSI, and only then write the Lambda. If a new access pattern would require a scan, add a GSI rather than scanning.

---

## 6. The SCORM runtime

**What the scaffold proves.** The v0.1 scaffold exposes a faithful mock of the SCORM 1.2 runtime surface: it installs a `window.API` object so embedded content's `LMSInitialize / LMSGetValue / LMSSetValue / LMSCommit / LMSFinish` calls are captured, and it persists the CMI bag (notably `cmi.suspend_data`, `cmi.core.lesson_status`, `cmi.core.score.raw`) through the `commitCmi` path. The resume bookmark is real: leaving and reopening a course returns the learner to where they left off.

**The real-content path.** In production, the inner viewport becomes `<iframe src={course.scormLaunch}>` pointing at the SCORM launch file in S3, and the runtime wraps the `scorm-again` library (a modern TypeScript SCORM 1.2/2004/AICC runtime) instead of the hand-rolled mock. The same `window.API` discovery and the same commit path serve real content unchanged.

**Critical content-type distinction (a real trap):**

- A Rise360 **"Web" export** has NO `imsmanifest.xml` and NO SCORM API calls. It renders but cannot report completion or score. This is almost certainly what TLC_TRNG has been embedding in passion.io, which is exactly why those embeds cannot gate, grade, or track. Do not expect a Web export to drive the runtime.
- A Rise360 **"SCORM 1.2" export** has the `imsmanifest.xml` and a `scormdriver/` directory. The Articulate `scormdriver.js` uses the standard `GetAPI`/`FindAPI` frame walk that looks for `window.API` on parent/opener frames. This IS what the runtime captures. The verified reference package is `pwc-mass-care-framework-training.zip` (SCORM 1.2, launch file `scormdriver/indexAPI.html`, title "PWC Mass Care Framework Training").

When the user provides a course, check for `imsmanifest.xml` first. If it is missing, tell the user to re-export from Rise360 as SCORM 1.2 rather than Web.

**Framing constraint.** The SCORM driver expects the API to already exist on a parent frame when the launch page loads, so the content iframe must be a child of the page that installed `window.API`. Same-origin on the S3/CloudFront domain means no cross-origin issue.

**Rise360 Connected Packages (supported for free; no special integration needed).** Connected Packages is a Rise360 feature (Labs/Beta as of mid-2026) that lets an author publish a course once, then push content updates from Rise without re-exporting and re-uploading to the LMS. The mechanism: instead of bundling the full course into the SCORM zip, Rise uploads a lightweight SCORM 1.2 or 2004 package whose content assets are hosted on Articulate's servers and streamed to the learner at launch; editing the course in Rise updates the hosted content, and the LMS never sees a new file. The key fact for this build: a Connected Package is still a standard, spec-compliant SCORM package from the LMS's point of view. Its launch file exposes the same `window.API`, makes the same `LMSInitialize / LMSSetValue / LMSCommit / LMSFinish` calls, and reports completion and score exactly like any other SCORM package. Therefore our LMS needs NO special Rise integration, API, webhook, or auth handshake to support it. If the SCORM runtime plays a normal SCORM 1.2 package (which Sprint 0 proves), it plays a Connected Package unchanged. The update-from-Rise behavior happens entirely between Rise and Articulate's hosting, without our system's involvement or knowledge.

There is exactly one thing to verify, and it is a test, not a design change: because the content loads from Articulate's servers inside the SCORM iframe, our Content Security Policy and iframe sandbox settings must not block that cross-origin fetch. Confirm this when hosting the first real Connected Package (Sprint 4). It is a CSP allowance, not an architecture problem.

Two trade-offs make Connected Packages a per-course choice, not a default, and both should be surfaced to the user:

1. **Dependency inversion.** A Connected Package reintroduces exactly the external dependency the platform philosophy otherwise avoids. If Articulate's servers are down, the subscription lapses, or the source course is permanently deleted in Rise, the course stops functioning in the LMS. A standard SCORM export has no such dependency; its content lives in the client's S3 bucket and works indefinitely.
2. **No version audit trail.** Connected Packages passes no version information to the LMS, and Articulate explicitly recommends against it for content requiring strict audit trails, enhanced compliance procedures, or LMS version history. For public-safety and emergency-management clients, "which version of the plan did this person certify on" is often a real compliance question, and for that content a static SCORM export (which freezes the version) is the correct choice.

Guidance: support both, treat the choice as per-course. Frequently-updated, low-stakes content (onboarding, overviews, anything iterated post-launch) benefits from Connected Packages. Compliance and certification content that needs a frozen, auditable version, or that must survive independent of Articulate's hosting, stays a static SCORM export. The LMS does nothing different for the two at runtime; both are SCORM packages it hosts and plays identically. The only model addition is an optional per-course `contentSource` flag (`self-hosted` | `articulate-connected`) so the admin UI can display which courses depend on Articulate's hosting and reporting can warn that a connected course has no frozen version. That is a metadata field and a badge, not a subsystem.

### 6.5 Digital credentials: the build-not-integrate path

TLC_TRNG issues certificates. The next evolution is shareable, independently verifiable digital credentials, the kind of thing Credly and Accredible sell. A digital credential is three things bundled: a visual badge or certificate, a public verification page where anyone can confirm authenticity without contacting the issuer, and embedded machine-readable metadata following the Open Badges standard (who earned it, what skill, when, against what criteria, who issued it). The metadata is what lets a credential be added to LinkedIn, shared in an email signature, and verified by a third party.

**Decision: build, do not integrate.** The commercial platforms are priced for enterprise volume (roughly $45/month for 50 recipients, rising into the thousands per year, plus onboarding fees up to five figures), and much of what the premium ones sell is a network effect tied to their own verification domain. For TLC_TRNG's public-safety and emergency-management market, those prices are not justified, and there is a real strategic opportunity to build a market-specific credential network under the TLC_TRNG brand and verification URL rather than renting space in a generic one. Self-hosting also fits the platform philosophy: no per-badge fees, no vendor lock-in, credentials that survive independent of any third party's subscription. Do not default to an integration (Credly/Accredible/Sertifier API) unless a specific client explicitly needs an established third-party network; treat that as the exception, not the path.

**The standard.** Open Badges, maintained by 1EdTech. Two versions matter. Open Badges 2.0 is a defined JSON-LD structure (Issuer Profile, BadgeClass, Assertion) verified by URL lookup; in 2026 it is still the most widely used and accepted version, and it is achievable on our stack. Open Badges 3.0 aligns with the W3C Verifiable Credentials model, adding cryptographic signing, issuer key management, and digital-wallet compatibility; its interoperability promise depends on a wallet/DID ecosystem that is not yet mature. Build 2.0 first; design so 3.0 signing can be layered on later. This mirrors the "SCORM now, xAPI later" posture: ship the proven standard, keep the door open for the emerging one.

**The two-phase credential path (short term and long term).** These are deliberately separated because the two halves have very different weights and very different value-to-effort ratios:

- **Short term, the public verification page.** Every issued certificate already lives in DynamoDB with a unique ID. Exposing a public read-only route (for example `verify.<domain>/c/<credentialId>`) that renders "[learner] completed [course] on [date], issued by TLC_TRNG" plus a QR code on the PDF is a small Lambda and a public page. This is low effort and high perceived value: it delivers the "scan to confirm it is real" capability that is most of what clients actually want, and it makes the existing PDF certificates meaningfully more credible. It is worth doing largely independent of the full badge question. Because the Certificate/Credential entity already carries a stable public credential ID (Section 4), this needs no data-model change.
- **Long term, self-hosted Open Badges 2.0 and the market network.** Serve the three Open Badges object types (Issuer Profile, BadgeClass, Assertion) as hosted JSON-LD, bake the assertion into the badge image, and make each credential portable and verifiable by any Open Badges-compliant consumer, including LinkedIn. On top of that, build the TLC_TRNG-branded credential directory: a market-specific network for emergency-management professionals to hold and display credentials, which is the strategic asset the generic platforms cannot offer this audience. Open Badges 3.0 cryptographic signing is a later addition on top of this, pursued when the wallet ecosystem and client demand justify it.

**Forward-compatibility now, at zero cost.** The Certificate/Credential entity (Section 4) is already specified to carry the Open Badges fields (credential ID, issuer, criteria, skill/competency, evidence URL, issued/expires). Populate them from the start even in the PDF-only phase. This means the verification page and the later badge layer require no data-model migration, and the integrate-vs-build decision for any single credential stays open without rework.

---

## 7. The sprint roadmap

The LMS build is organized into defined sprints. Sprint 0 is complete. The ordering reflects dependency (each sprint widens tested rails) and value (the passion.io gap comes early). As with the DST, do not attach calendar dates; sprints emerge at the user's pace.

### Sprint 0: Student vertical slice (COMPLETE)

The full student path against the mock data layer: sign in (three-role model), catalog, enroll, SCORM-style playback with a real resume bookmark, completion with certificate issuance and an SES-stand-in email, and a transcript that rolls up to one line per course. Proven headlessly end to end. Artifact: `lms_vertical_slice.jsx`. The mock `api` object is the backend contract; the mock store mirrors the DynamoDB keys.

### Sprint 1: Project structure and the config module (COMPLETE, v0.2.0)

Break the single-file scaffold into a real Vite project tree (mirroring the DST template layout). Extract a single config module (the LMS analog of `dst.config.js`) for org name, brand tokens, copy strings, and feature flags. Establish the folder conventions, the build, and a local dev smoke test. No new features; this is the structural foundation everything else builds on.

**Shipped.** Built in Claude Code on the GitHub repo `TLCtech-io/TrainMe`, so the deliverable is the pushed branch, not a ZIP. The tree lives in `lms-app/`, the config module is `lms-app/src/lms.config.js`, and Section 8.2 documents both. Proof: `npm test` (headless Node tests for the contract, the full student vertical, identity isolation, the SCORM runtime, and the config), a browser walkthrough of the full student path on both the dev server (React StrictMode on) and the production build, and a DOM and computed-style parity check against the Sprint 0 file across ten screen states (identical apart from the intended version marker and font-stack strings).

**This is the surface-transition point. Before producing the project tree, prompt the user to move to Claude Code.** Sprint 0 lived as a single artifact in Chat, which was right for it. Sprint 1 creates a multi-file project that needs a dev server, headless test runs, and (from Sprint 4) AWS deploy commands, all of which Code does inside the repo and Chat cannot. If the user is still in a Chat session when Sprint 1 begins, do not silently start emitting a file tree for them to save by hand. Stop and walk them through the move (see Section 8.1). If the user explicitly prefers to stay in Chat for this sprint, respect that, but make the trade-off visible: in Chat you will hand them files to save and commands to paste, whereas Code would run them.

### Sprint 2: Instructor grading and gated progression (the passion.io gap)

The highest-value feature work and the core differentiator. Add: the instructor role's scoped view, a grading queue, submission upload by students, send-back-with-comments, student resubmission, and the approval-to-advance lock (a learner cannot proceed past a gated item until an instructor approves). This is the capability passion.io and Reach360 cannot provide and the one the scoping document leans on hardest. Build each piece against the mock `api` first.

### Sprint 3: Prerequisites and external-credit

Prerequisite enforcement (cannot enroll until required courses are complete), the learner-facing "challenge the prerequisite / upload external proof" path, and admin/instructor verification of uploaded proof. Includes the "mark a course already completed and upload a certificate" flow, with a single catalog entry whether taking fresh or claiming prior credit.

### Sprint 4: Real AWS backend (auth + data + content + email)

Stand up the production spine: extend the DST CloudFormation auth stack to add the DynamoDB table and its GSIs, the three-role authorizers, the content/certificate S3 bucket, SES sending permission, and the Lambdas (enroll, commit-CMI, complete-and-certify, transcript, grade, approve). Replace the mock `api` method bodies with `fetch()` calls. Unzip the verified SCORM package to S3 and swap the mock viewport for a live iframe. This is where "faithful mock" becomes "proven against real content and real persistence." SES starts in sandbox mode (verified addresses only); request production access before any real rollout.

### Sprint 5: Programs, learning paths, and scheduling

Bundle courses into ordered programs, assignable individually or as a program, one-time or on a recurring/recertification schedule. Recurrence drives renewal-forecast reporting (what expires in 30/60/90 days). Includes the "coming up next" learner dashboard.

### Sprint 6: Collaboration and discussion

Per-course discussion boards and learner-to-learner / learner-to-instructor interaction. Start with a threaded board per course; group/team spaces, shared documents, and wikis are later additions within or after this sprint.

### Sprint 7: Reporting, analytics, and admin polish (includes the credential verification page)

Customizable admin dashboards: completion rates, enrollment and activity data, renewal forecasts, exportable records. Transcript PDF generation. Per-question exam analytics (a documented "nice to have" in the scoping doc). Bulk CSV import of external completions (e.g., FEMA transcripts) matched to learner IDs.

**Also in this sprint: the short-term half of the digital-credential path (Section 6.5), the public verification page.** Expose a public read-only route (`verify.<domain>/c/<credentialId>`) that renders the credential's core facts (learner, course, date, issuer) and add a QR code linking to it on the generated PDF. This is low effort and high value, and it does not require the full Open Badges build. It slots here because it is certificate/reporting polish and reuses the credential ID the data model already carries. The full self-hosted badge layer is a later, separate sprint (Sprint 9).

### Sprint 8: Deployment, domain, and hardening

Acquire the production domain, deploy to it (same S3 + CloudFront + GoDaddy pattern as the DST), move SES to production, and harden (rate limits, error handling, operational runbook). Event/calendar management and Outlook calendar invites, if pursued, land here or as a defined post-v1 addition.

### Sprint 9: Self-hosted digital credentials and the market network

The long-term half of the digital-credential path (Section 6.5). Build self-hosted Open Badges 2.0: serve the three object types (Issuer Profile, BadgeClass, Assertion) as hosted JSON-LD, bake the assertion into the badge image, and make each credential portable and verifiable by any Open Badges-compliant consumer, including LinkedIn. Then build the TLC_TRNG-branded credential directory, the market-specific network for emergency-management professionals to hold and display their credentials, which is the strategic asset the generic platforms cannot offer this audience. Open Badges 3.0 cryptographic signing and digital-wallet support are a later addition on top of this, pursued when the wallet ecosystem and client demand justify it. This sprint depends on the verification page (Sprint 7) and the forward-compatible credential fields already in the data model, so no migration is required to start it.

---

## 8. Ordered development and deployment plan

This is the concrete, near-term execution order. It assumes Sprint 0 is done.

1. **Sprint 1: structure.** (Done, v0.2.0.) Break the scaffold into a project tree, extract the config module, confirm local build and dev server. The user pulls the branch and runs locally. (No AWS yet.) Before Sprint 2 begins, re-key the mock store to the single-table design (see Section 0, the mock-store principle).
2. **Sprint 2: the differentiator.** Build instructor grading and gated progression against the mock layer. Prove each path headlessly. This is the feature that justifies the whole build, so it comes before any AWS spend.
3. **Sprint 3: prerequisites and external credit.** Round out the academic-integrity features, still on mock data.
4. **Decision gate, backend.** Once the front end demonstrates the full differentiated feature set on mock data, the mock `api` object is a complete, tested specification. Now build the backend to match it (Sprint 4). Building the backend after the front end means the API contract is fully known before a single Lambda is written.
5. **Sprint 4: AWS.** Deploy the CloudFormation stack (auth + DynamoDB + S3 + SES). Wire the `api` bodies to real endpoints. Host the verified SCORM package and prove real CMI capture. Test locally against real AWS (Cognito, DynamoDB, S3, SES in sandbox).
6. **Sprints 5 to 7, widen.** Programs/scheduling, collaboration, reporting, each built front-end-first on the now-live spine. Sprint 7 also ships the public credential verification page (the short-term half of the digital-credential path), which is low effort and high value.
7. **Sprint 8: ship.** Acquire the domain, deploy, move SES to production, harden, document.
8. **Sprint 9: credentials and network.** Build self-hosted Open Badges 2.0 and the TLC_TRNG-branded market credential directory (the long-term half of the digital-credential path). Depends on the Sprint 7 verification page and the forward-compatible credential fields already in the data model.

**The governing rule:** front end first against mock data, prove headlessly, then wire AWS. The mock layer is not throwaway; it is the executable specification the backend must satisfy.

### 8.1 Moving from Chat to Claude Code (do this at the start of Sprint 1)

Sprint 0 was a single artifact and belonged in Chat. From Sprint 1 on, the work is a real project tree with a dev server, headless tests, and eventually AWS deploy commands. That work belongs in Claude Code, which operates inside the repo on disk and runs commands directly, rather than handing the user files to save and commands to paste. When Sprint 1 begins, prompt the user to make the move and walk them through it.

**What to tell the user (adapt to their setup):**

Claude Code runs in one of four places, all equivalent for this build: the terminal, VS Code, JetBrains, or the Code tab inside the Claude desktop app. If they have no preference, the desktop app's Code tab is the gentlest start; if they live in an editor, the VS Code or JetBrains extension keeps Code beside their files. On the web, choosing Code installs the desktop app.

**The move, step by step:**

1. **Pick a project folder.** Establish the LMS working folder, analogous to the DST's `/Users/traviscryan/Documents/DST Demo Build Local/...`. Suggest something like `/Users/traviscryan/Documents/LMS Build Local/lms-app/` and confirm the user's preferred path. Match their convention; do not invent a generic placeholder.
2. **Put the project files in that folder.** The user copies the project-folder contents into it: the LMS playbook, `lms_vertical_slice.jsx`, the DST playbook and DST reference version, the LMS requirements doc, the SCORM zip, and the LMS overview material. These are the same files from the project; Code reads them from disk the way a Chat session reads them from the project.
3. **Open Code in that folder.** In the terminal: `cd` into the folder and run `claude`. In VS Code or JetBrains: open the folder, then open the Claude Code panel. In the desktop app: open the Code tab and point it at the folder.
4. **Hand Code the playbook.** The user's first message to Code should be essentially the same as the Chat starter prompt: read the LMS playbook first, confirm the build stands at Sprint 0 complete, and begin Sprint 1 following this section's ordering. Code reads the playbook from the folder, so it picks up the same context this Chat session has.
5. **Let Code scaffold Sprint 1.** From here, Code creates the Vite project tree, extracts the config module, installs dependencies, and runs the dev server and headless tests directly, rather than producing a ZIP for manual install.

**What stays in Chat.** The design conversations that open and punctuate each sprint, deciding how grading and gating should work before building them, for instance, are still better in Chat, where the user reasons through choices with you. The pattern is: decide in Chat, build in Code. When a sprint's design questions are settled, the user moves to Code to build; when a new design question arises, a Chat session is the place to think it through. Both surfaces read the same playbook from the same project, so context carries across.

**If the user wants to stay in Chat anyway.** Respect it, but be honest about the trade-off: in Chat you produce files for them to save by hand and commands for them to paste and run, and you cannot see the result of a build or test except by their report. Code removes that friction. State this once, then proceed however they choose.

**As it happened.** Sprint 1 moved to Claude Code working on the GitHub repo `TLCtech-io/TrainMe`. The repo root holds the reference material (this playbook, the DST playbook and `tlc-trng-dst/` reference tree, the requirements doc, the client PDFs, and the Sprint 0 file); the application lives in `lms-app/`. The verified SCORM package (`pwc-mass-care-framework-training.zip`, 318 MB) is gitignored and stays on the user's disk until it goes to S3 in Sprint 4; ask the user for its local path when you need to inspect it.

### 8.2 The project tree and the config module (Sprint 1)

```
lms-app/
  index.html              page shell; %LMS_*% placeholders filled from the config at build time
  vite.config.js          build config and the lms-html-inject plugin (no per-org edits)
  public/                 favicons (TLC_TRNG brand set, copied from the DST)
  src/
    lms.config.js         the config module
    theme.js              T (tokens) and F (font stacks) for components
    version.js            display version derived from package.json (DST playbook 10.14)
    main.jsx              entry; React StrictMode on, so dev keeps proving 10.1
    App.jsx               root: session ref, navigation, role-scoped shell
    api/
      index.js            createApi() (the single swap point) and API_CONTRACT
      mockApi.js          the backend contract: method signatures + mock bodies
      mockStore.js        in-memory tables and the record key format
      seed.js             mock Cognito users and COURSE# items
    scorm/
      runtime.js          SCORM 1.2 window.API mock (scorm-again stand-in)
      mockLessons.js      stand-in SCO slides (replaced by an S3 iframe in Sprint 4)
    components/           primitives.jsx (Btn, Pill, StatusPill, SectionHead, Loading, Empty), Shell.jsx
    screens/              SignIn, Catalog, CoursePlayer, CompletionPanel, Transcript
  test/                   headless tests: config, scorm, api (npm test)
```

**Config shape.** `lms.config.js` exports one object with these sections:

- `org`: `fullName`, `shortName`, `productName`, `titleLong`, `metaDescription`, `emailDomain`, `resourcePrefix` (the `lms` placeholder).
- `brand`: `mark` and `wordmark` (Sprint 0's emoji mark plus "TLC_TRNG" text; swap for a processed logo per DST playbook Section 4 when wanted).
- `theme`: hue-neutral token names on purpose. A `neutral` scale (`neutral900` to `neutral50`, holding Slate-900 to Slate-50), an `accent` scale (`accent600`, `accent500`, `accent400`, `accent100`, holding the ambers), and status colors (`successSoft`, `successInk`, `danger`), plus `white`. A client re-skin (the scoping document asks for district or department branding) swaps values without leaving misleading names behind, which is exactly the debt the DST carries in its PCCA-era `darkBlue`/`teal` slots.
- `fonts`: `heading`, `body` (CSS stacks), and `googleFontsHref` (injected into `index.html`, so the stylesheet and the stacks are edited in one place).
- `copy`: client-facing strings (sign-in tagline, catalog and transcript headings, completion and certificate text). Generic control labels stay in components.
- `features`: `sandboxHints` (the demo accounts panel and prefill on sign-in, the SCORM runtime note, and the SES stand-in notice; turn off for client-facing builds).
- `sandbox`: the demo accounts and password shown on sign-in. A test signs in with each, so the hint cannot drift from the mock users.

Not in the config: seed users and courses (mock backend data, in `src/api/seed.js`), stand-in lesson content (`src/scorm/mockLessons.js`), and AWS values (Sprint 4 adds `cognito` and `api` sections, mirroring `dst.config.js`).

**Node-safe modules.** `lms.config.js`, everything in `src/api/`, and `src/scorm/runtime.js` are plain JS with no JSX and no Vite-only imports, so `npm test` imports them directly. Seed data is JS modules rather than JSON for the same reason. Keep it that way; it is what makes "prove it headlessly" a one-command habit rather than a bespoke extraction each sprint.

**Deliberately not carried from the DST:** the Cognito `global` polyfill (add it in Sprint 4 only if `amazon-cognito-identity-js` is used), Mapbox and weather, and the monolithic `App.jsx` with section banners (the LMS uses one module per screen instead). Vite is pinned to 5.4.21 rather than the DST's 5.4.10 to close dev-server file-access advisories, and the dev server binds to localhost by default (`npm run dev -- --host` exposes it for tablet testing).

---

## 9. Working conventions

**Build front-end-first, always.** Every feature is built against the mock `api` and proven (ideally headlessly with a small Node simulation, as in Sprint 0) before any backend work. The mock layer is the contract.

**Prove it headlessly.** Before declaring a slice done, run its logic in Node to confirm behavior, especially completion, grading, and gating paths where a thrown exception or a stuck state would otherwise only surface in the browser. Sprint 0's hang and crash were both caught and fixed this way. Since Sprint 1 this is `npm test` in `lms-app/` (Node's built-in runner, no extra dependencies): add a test for every new api method and every new path through it, alongside the code, and keep the modules it imports Node-safe (Section 8.2). Then walk the path in a real browser on both `npm run dev` (StrictMode on) and the production build.

**Match the user's path conventions.** When local install commands are needed, follow the user's established folder pattern (the DST builds live under `/Users/traviscryan/Documents/DST Demo Build Local/...`). The LMS lives in the GitHub repo `TLCtech-io/TrainMe`, with the app in `lms-app/`; local commands run from the user's clone of that repo (`cd lms-app && npm install && npm run dev`). Do not invent generic placeholders if a convention exists.

**Use the `lms` short-name placeholder until the user names it.** The sandbox uses `lms` as the resource prefix (the DST convention is `${ShortName}`). Rename when the user picks a real short name or domain.

**Suggest next steps after each deliverable.** Do not hand back an artifact and stop. After a slice, suggest testing it; after the backend, suggest the verification flow; after deployment, the handoff.

**Don't oversell.** The scaffold is a working iterative demo, not production. Use "working iterative slice" framing. Avoid "production-ready" until Sprint 8 is done.

**Maintain identity discipline.** This is a TLC_TRNG build by Travis Cryan. Keep the architectural posture (AWS, standalone Cognito, DynamoDB, SCORM-now-xAPI-later, SES email) unless the user deliberately changes direction.

---

## 10. Bugs and traps already encountered

Documented as symptom / cause / fix so future occurrences are recognizable.

### 10.1 Completion hangs on "Recording..."

**Symptom:** After the last slide, the completion button sits on "Recording..." forever; the certificate panel never appears.
**Cause:** The completion path read CMI data through the live `window.API` global and a ref into it. Under React 18 StrictMode, the mount effect runs twice (mount / cleanup / mount), and the cleanup deletes `window.API`, so the `await`ed commit could resolve against a torn-down object, leaving `saving` stuck `true`.
**Fix:** Make completion independent of the global. `installScormApi` returns a `snapshot()` accessor that hands back a fresh copy of the CMI bag regardless of whether `window.API` is still mounted, plus a `set()` for writes. `finish()` builds its bag from the snapshot with explicit overrides, so a teardown cannot strand it.

### 10.2 Completion crashes (TypeError) and the Review path hangs

**Symptom:** Course completion throws and takes down the app; separately, re-completing an already-finished course (the Review path) hangs because it returned `completed: false`.
**Cause (crash):** Certificate issuance looked up the learner by scanning the seed table: `seedUsers[Object.keys(seedUsers).find(...)]`. When `.find()` missed, it returned `undefined`, and `const { name, email } = undefined` throws a TypeError. The outbox render had the same pattern.
**Cause (the deeper bug it exposed):** `getSession()` returns `{ token, profile }`, but call sites destructured `const { sub } = getSession()`, reading `sub` off the top level where it does not exist. So `sub` was `undefined` everywhere; enrollment keys were `undefined::courseId`. It only appeared to work because a single user collided with itself consistently.
**Fix:** Add a session normalizer in `makeApi` that flattens `sub` out of the profile once, so all `const { sub } = getSession()` calls read a real value. Rewrite certificate issuance and the outbox to read name/email straight from the session profile (the real backend reads identity from the JWT), eliminating the table scan entirely. The Review path now falls back to `getCertificate` so it shows the existing certificate instead of hanging.

### 10.3 Wrong Rise360 export type

**Symptom:** A provided course package renders but reports no completion or score; the runtime captures nothing.
**Cause:** The package is a Rise360 "Web" export, which has no `imsmanifest.xml` and makes no SCORM API calls.
**Fix:** Check for `imsmanifest.xml` before assuming a package is SCORM. If absent, instruct the user to re-export from Rise360 as SCORM 1.2 (Export -> SCORM 1.2, not Web). The verified-good reference is `pwc-mass-care-framework-training.zip`.

### 10.4 Vite build fails with "URI malformed" on index.html

**Symptom:** `npm run build` stops at `[vite:build-html] URI malformed` pointing at `index.html`.
**Cause:** A `%LMS_*%` placeholder sits inside a URL attribute (the Google Fonts `href`). Vite's HTML build step URI-decodes attribute URLs before a default-order `transformIndexHtml` hook runs, and `%LM` is not a valid percent escape.
**Fix:** The `lms-html-inject` plugin runs with `order: 'pre'`, so substitution happens before Vite parses the HTML. The DST never hit this because its placeholders are only in text and `content` attributes. Keep the `order: 'pre'` if the plugin is ever rewritten. The plugin also fails the build on any unresolved placeholder rather than shipping the literal text.

### 10.5 Headless browser in a Claude Code cloud session cannot load Google Fonts

**Symptom:** Headless Chromium runs in a cloud session log `Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID` for `fonts.googleapis.com`, and screenshots render in fallback fonts.
**Cause:** The cloud session's egress proxy re-terminates TLS, and the Playwright Chromium build does not trust its CA. This is environment-only; on the user's machine the fonts load normally.
**Fix:** None needed in the app. In browser checks, allow a failed request only when its URL is Google Fonts and fail on anything else. Do not compare layout sizes between builds whose font stacks fall back differently; compare structure, text, and design tokens.

### 10.6 A browser test step passes or fails on the wrong element

**Symptom:** A Playwright walkthrough reported the completion panel before the app had finished "Recording...", and a status-pill check passed even though it should not have.
**Cause:** Playwright's `text=` selector is a case-insensitive substring match. `text=Course complete` matched the slide copy "Mark the course complete...", and `text=Enrolled` matched "Not enrolled".
**Fix:** Use exact matchers (`h2:text-is("Course complete")`, `:text-is("Enrolled")`) for any state assertion. Also note `innerText` honors `text-transform`, so the role label reads "Student", not "student"; compare case-insensitively.

---

## 11. What this playbook does not yet cover

For honesty, v1 of this playbook covers the philosophy, architecture, role/content/data models, the SCORM runtime, the sprint roadmap, and the ordered plan. It does not yet contain execution detail for:

- **The instructor grading and gating data model and UI (Sprint 2).** The single most important feature work; gets its own detailed section once built.
- **The CloudFormation extension for DynamoDB + SES + the LMS Lambdas (Sprint 4).** Will extend `dst-auth-cloudformation.yaml`; documented when built.
- **Certificate PDF template production.** TLC_TRNG already has strong brand design (see the Silent Auction flyer); the template approach is settled in Sprint 4.
- **The real AWS deployment walkthrough.** Reuses the DST playbook's Section 8 (S3, CloudFront, ACM, GoDaddy); LMS-specific deltas documented at Sprint 8.
- **The Open Badges 2.0 object schemas and the credential directory (Sprint 9).** The strategy is settled in Section 6.5 (build, not integrate; verification page short term, self-hosted badges and a market network long term); the JSON-LD object shapes and directory UI are documented when built.

When the user asks about any of the above, point to the relevant sprint and acknowledge the detail is not yet written.

---

## 12. Appendix A: Reference values (current through Sprint 1)

For sanity-check during continued work.

- **Repository:** GitHub `TLCtech-io/TrainMe`. App in `lms-app/` (package `tlc-trng-lms`, version `0.2.0`, sign-in shows `v0.2`).
- **Config module:** `lms-app/src/lms.config.js` (sections: `org`, `brand`, `theme`, `fonts`, `copy`, `features`, `sandbox`). See Section 8.2.
- **Commands (from `lms-app/`):** `npm install`, `npm run dev` (http://localhost:5173), `npm test` (headless), `npm run build` (to `dist/`), `npm run preview` (http://localhost:4173).
- **Stack:** React 18.3.1, Vite 5.4.21, `@vitejs/plugin-react` 4.3.1, exact pins. No runtime dependencies beyond React.
- **Sprint 0 artifact:** `lms_vertical_slice.jsx` at the repo root (single-file React, ~1300 lines), superseded by `lms-app/` and kept for history.
- **Roles:** student, instructor, admin (on Cognito `custom:role`).
- **Sandbox accounts** (password `demo`): `student@demo.test`, `instructor@demo.test`, `admin@demo.test`.
- **Brand palette:** Slate + Amber (same as the TLC_TRNG DST build). Slate-900 `#0F172A`, Slate-800 `#1E293B`, Slate-700 `#334155`, Slate-500 `#64748B`, Amber-500 `#F59E0B`, Amber-600 `#D97706`.
- **Fonts:** Zilla Slab (heading), Poppins (body).
- **Resource short-name placeholder:** `lms` (rename when the user picks a real one).
- **Persistence decision:** DynamoDB single-table; Aurora/Postgres is the documented fallback.
- **Mock `api` methods (the backend contract):** `signIn`, `listCatalog`, `listEnrollments`, `enroll`, `getCmi`, `commitCmi`, `getCertificate`, plus the sandbox-only `_outbox`. Pinned in `API_CONTRACT` (`lms-app/src/api/index.js`). Certificate issuance is internal to the mock (not on the api object), as it will be server-side.
- **Mock store keys (mirror the DynamoDB single table):** `USER#`, `COURSE#`, `ITEM#`, `ENROLL#`, `CMI#`, `CERT#`. Not yet exact in code; see the status note under the mock-store principle in Section 0.
- **Verified SCORM reference package:** `pwc-mass-care-framework-training.zip` (SCORM 1.2, launch `scormdriver/indexAPI.html`, title "PWC Mass Care Framework Training").
- **Known content trap:** Rise360 "Web" exports are not SCORM; the `EOP_Demo.zip` package was a Web export (no manifest). Always require a SCORM 1.2 export for runtime capture.

---

## 13. Appendix B: Future maintenance of this playbook

When a sprint ships, update this playbook at the same time, not after. Outdated content is worse than missing content.

- **When Sprint 1 ships:** (Done at v0.2.0.) Replace the "single-file scaffold" framing in the intro and Section 0 with the real project tree and config module. Update Appendix A.
- **When Sprint 2 ships:** Add the grading and gated-progression data model and UI as a full section. This is the differentiator; document it thoroughly.
- **When Sprint 4 ships:** Add the CloudFormation extension detail, the live `api` wiring, and the SCORM-from-S3 walkthrough. Add an Appendix C with the concrete AWS resource values (table name, bucket, API URL, distribution ID), mirroring the DST playbook's Appendix C.
- **When Sprint 8 ships:** Add the production domain, the SES production move, and the deployment deltas from the DST Section 8.
- **When the Sprint 7 verification page ships:** Document the public verify route and the QR-on-PDF approach; confirm the credential ID is stable and public-safe.
- **When Sprint 9 ships:** Add the Open Badges 2.0 object schemas (Issuer Profile, BadgeClass, Assertion), the badge-image baking approach, and the credential directory UI. Note whether Open Badges 3.0 signing has been scoped yet.

This document is a living artifact and an instance of the same principle the DST playbook follows: lessons get baked in as they are learned, not left as tribal knowledge.

---

*End of LMS playbook v1. Hand this to a future LLM at the start of, or to continue, the LMS build. Read alongside `DST_Build_Playbook_v2.md` for the shared AWS, branding, and deployment conventions.*
