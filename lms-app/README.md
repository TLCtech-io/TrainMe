# TLC_TRNG LMS (v0.4, Sprint 2: instructor grading and gated progression)

The TLC TRNG, LLC Learning Management System as a Vite + React project. Sprint 1 turned the Sprint 0 single-file scaffold (`../lms_vertical_slice.jsx`) into this tree with a config module. Sprint 2 adds the core differentiator: ordered course items with per-item gating, assignments as forms (written answers and file uploads, each field with its own rubric) that instructors build in the app, submission and resubmission, rubric evaluation by instructors (four-level scale, a comment per criterion plus overall comments), a grading queue and roster scoped to each instructor's courses, and the approval-to-advance lock. Playbook Section 8.3 describes the model.

Status: a working iterative slice on the mock data layer. No AWS yet (that is Sprint 4). See `../LMS_Build_Playbook_v1.md` for the architecture and roadmap.

## One-time setup

```bash
node --version    # 20.x or 22.x (Node 18 lacks the global Web Crypto the credential ID uses)
cd lms-app
npm install
npm run dev
```

Open http://localhost:5173. The dev server listens on localhost only. To try it on a phone or tablet on the same network, run `npm run dev -- --host` for that session (see Security notes).

## Headless tests

```bash
npm test
```

Uses Node's built-in test runner (no extra dependencies). It proves, without a browser:

- **Contract:** the `api` object exposes exactly the contract methods in `src/api/index.js` (`API_CONTRACT`), no more and no fewer.
- **Student vertical:** enroll, bookmark commit, leave and resume from `cmi.suspend_data`, completion, certificate with identity from the session, SES stand-in email, the Review path (no re-issue, no hang), and one transcript line per course.
- **Identity isolation:** one learner never sees another's enrollments, CMI, certificates, or email.
- **SCORM runtime:** `window.API` defaults, commit copies, `snapshot()` surviving teardown (playbook 10.1), and StrictMode double-install safety.
- **Grading and gating (Sprint 2):** each unlock rule, assignment forms (required fields, text limits, per-field rubrics), assignment building, the submit / return / resubmit / approve loop, per-criterion comments, form snapshots on every attempt, an assignment with no rubric, completion by approval (certifying the learner), instructor scope and admin reach, file limits and access, due dates and late flags, the GSI1 grading queue, and the roster.
- **Credentials:** Open Badges fields on every certificate, credential ID format and uniqueness, the GSI3 lookup by ID, expiry from `validityMonths`, and the per-course certificate switch.
- **Single table:** records land under the playbook's PK/SK keys, the roster (GSI1) and catalog (GSI2) are index queries, the store has no scan, and reads return copies.
- **Config:** required sections, hex tokens, the TLC_TRNG palette, and every sandbox account shown on sign-in actually signing in.

## Browser tests

```bash
npx playwright install chromium   # first run on a machine only
npm run e2e        # against the dev server (React StrictMode on)
npm run e2e:prod   # builds, then runs against the production build
```

Playwright starts the server itself (or reuses one already on the port) and walks the single-SCO student path, the whole Sprint 2 loop across student and instructor (answer the form, return with per-criterion feedback, resubmit, approve, unlock, certify, and attachments opening in a new tab), instructor scope with assignment building, and a phone-width sign-in. Failures leave a trace in `test-results/` (gitignored); open it with `npx playwright show-trace <path>`.

## Smoke test (by hand)

`npm run e2e` automates this. To walk it yourself with `npm run dev` running (the mock data resets on page reload; switch users with Sign out):

1. Sign-in card shows "Learning platform - sandbox - v0.4". A wrong password shows "Incorrect email or password."
2. **Student** (`student@demo.test` / `demo`): enroll in Effective Message Writing and open it. Three items: the lessons (open), "Draft an alert message" (locked until the lessons are done), and the knowledge check (locked until the instructor approves the draft).
3. Finish the lessons. Open the draft. It has two fields: type an alert message in "Your alert message", then attach any file (and a comment if you like) in "Formatted for your alerting system". Open "How this is evaluated" under a field to see its criteria. Submit. It shows "Awaiting review"; the knowledge check stays locked.
4. **Instructor** (`instructor@demo.test`): the Teaching tab lists Effective Message Writing only (the EOP course appears only in the catalog). Open it, then Review. Each field shows the learner's answer with its criteria under it. Click the attachment: it opens in a new tab. Rate each criterion, add a comment on one, pick an outcome below Competent, record. It is returned.
5. **Student**: the draft shows "Returned: revise" with each criterion's rating and comment under its field. Your written answer is filled in from last time; attach the file again and resubmit.
6. **Instructor**: review attempt 2, rate Competent, record. It is approved. The roster shows 2 of 3 required.
7. **Student**: the knowledge check is open. Finish it: the course completes and the certificate appears with its credential ID.
8. **Instructor**: Teaching, then Effective Message Writing, then the **Assignments** tab: add a field, give it a criterion, and save. New submissions use the new version; earlier ones keep the form they answered.
9. **Admin** (`admin@demo.test`): Teaching lists both courses.

## Production build

```bash
npm run build     # outputs dist/
npm run preview   # serves dist/ at http://localhost:4173
```

The build injects `lms.config.js` values into `index.html` and fails if any `%LMS_*%` placeholder is left unresolved.

## Project layout

```
lms-app/
  index.html              page shell; %LMS_*% placeholders filled from the config at build time
  vite.config.js          build config and the lms-html-inject plugin (no per-org edits)
  public/                 favicons (TLC_TRNG brand set)
  src/
    lms.config.js         THE config module: org identity, brand mark, tokens, fonts, copy, feature flags
    theme.js              T (tokens) and F (font stacks) for components
    version.js            display version derived from package.json
    main.jsx              entry; React StrictMode on
    App.jsx               root: session, navigation, role-scoped shell
    api/
      index.js            createApi() (the single swap point) and API_CONTRACT
      mockApi.js          the backend contract: method signatures + mock bodies
      mockStore.js        the in-memory single table: key builders, get/put/query/queryIndex, no scan
      seed.js             mock Cognito users, COURSE# items (with credential policy), and ITEM# content items
      credentialId.js     random public credential IDs (4-4-4 Crockford base32)
    scorm/
      runtime.js          SCORM 1.2 window.API mock (scorm-again stand-in)
      mockLessons.js      stand-in SCO slides (replaced by an S3 iframe in Sprint 4)
    components/
      primitives.jsx      Btn, Pill, StatusPill, SectionHead, Loading, Empty
      assignment.jsx      rubric table, new-tab file links, answers, attempt card
      Shell.jsx           top bar and tabs
    screens/
      SignIn.jsx  Catalog.jsx  Transcript.jsx
      CourseHome.jsx        learner course page: ordered items, status, locks, due dates
      CoursePlayer.jsx      one SCORM item
      AssignmentView.jsx    instructions, the form (fields with collapsible criteria), attempt history
      CompletionPanel.jsx   completion and certificate
      Teaching.jsx          instructor/admin: courses they teach
      TeachCourse.jsx       grading queue, roster, assignments for one course
      ReviewSubmission.jsx  field-by-field evaluation of one submission
      AssignmentEditor.jsx  assignment builder: instructions, fields, per-field rubrics
  test/                   headless tests (npm test)
  e2e/                    browser tests (npm run e2e)
  playwright.config.js    e2e server setup (dev or production preview)
```

## Where things go

- **Anything org-specific** (names, colors, fonts, client-facing copy, flags): `src/lms.config.js`. Components never hardcode it.
- **A new data operation:** add the method to `src/api/mockApi.js` with the signature the backend will honor, add its name to `API_CONTRACT` in `src/api/index.js`, and cover it in `test/api.test.js`. Components call it through the `api` prop.
- **Record keys:** the table design and key builders live in `src/api/mockStore.js`, and only `src/api/` touches the store. A new access pattern must be a key or an index (the store has no scan). Components go through the `api` object, never the store.
- **Plain JS stays Node-safe:** `lms.config.js`, `api/`, and `scorm/runtime.js` use no JSX or Vite-only imports, so the headless tests can import them directly.

## Feature flags

`features.sandboxHints` (default `true`) shows the sandbox-only helpers: the demo accounts and prefilled credentials on sign-in, the SCORM runtime note in the player, and the SES stand-in notice on completion. Set it to `false` for any client-facing build.

## Credentials and placeholders

Certificates carry the Open Badges fields (playbook Section 4): a random public `credentialId` (e.g. `7KQ2-M9XD-P4TA`), the issuer from `credentials.issuer` in the config, and the course's criteria, skills, and expiry. Each course in `src/api/seed.js` has `certificateEnabled` (off: completion is recorded, no certificate or email) and a `credential` policy. The criteria, skills, and validity there are **placeholder language**, as is the sample assignment (and its rubric) for Effective Message Writing; search for `PLACEHOLDER` (and "Sandbox sample") to replace them.

## Security notes

- Vite is pinned to 5.4.21, the latest 5.4 patch, rather than the DST's 5.4.10: it closes the dev-server file-access advisories that affect 5.4.10. `npm audit` still reports dev-server-only advisories that need Vite 7 or later (one is Windows-only). None affect the production build, which is static files. Keeping the dev server on localhost by default limits exposure.
