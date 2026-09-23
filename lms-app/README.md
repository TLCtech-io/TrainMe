# TLC_TRNG LMS (v0.2, Sprint 1: project structure and config module)

The TLC TRNG, LLC Learning Management System as a real Vite + React project. Sprint 1 breaks the Sprint 0 single-file scaffold (`../lms_vertical_slice.jsx`) into this tree and extracts the config module. It adds no features: the student path (sign in, catalog, enroll, SCORM playback with resume, completion, certificate, transcript) behaves and renders exactly as in Sprint 0.

Status: a working iterative slice on the mock data layer. No AWS yet (that is Sprint 4). See `../LMS_Build_Playbook_v1.md` for the architecture and roadmap.

## One-time setup

```bash
node --version    # 18.x, 20.x, or 22.x
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
- **Config:** required sections, hex tokens, the TLC_TRNG palette, and every sandbox account shown on sign-in actually signing in.

## Smoke test (browser)

With `npm run dev` running, walk:

1. Sign-in card shows the TLC_TRNG wordmark, "Learning platform - sandbox - v0.2", and the sandbox accounts.
2. A wrong password shows "Incorrect email or password."
3. Sign in as `student@demo.test` / `demo`. The catalog shows two courses, both "Not enrolled".
4. Enroll in Effective Message Writing, open it, click Next twice (Slide 3 of 4).
5. Back to catalog (pill reads "In progress"), reopen: it resumes on Slide 3.
6. Finish and Mark complete: certificate for Jordan Avery, score 92, "Email sent" notice.
7. Back to catalog, Review, Re-issue certificate: the existing certificate shows again.
8. Transcript tab: one row, Completed, score 92.
9. Sign out, sign in as `instructor@demo.test`: Catalog tab only, none of the student's records.

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
      mockStore.js        in-memory tables and the record key format
      seed.js             mock Cognito users and COURSE# items
    scorm/
      runtime.js          SCORM 1.2 window.API mock (scorm-again stand-in)
      mockLessons.js      stand-in SCO slides (replaced by an S3 iframe in Sprint 4)
    components/
      primitives.jsx      Btn, Pill, StatusPill, SectionHead, Loading, Empty
      Shell.jsx           top bar and tabs
    screens/
      SignIn.jsx  Catalog.jsx  CoursePlayer.jsx  CompletionPanel.jsx  Transcript.jsx
  test/                   headless tests (npm test)
```

## Where things go

- **Anything org-specific** (names, colors, fonts, client-facing copy, flags): `src/lms.config.js`. Components never hardcode it.
- **A new data operation:** add the method to `src/api/mockApi.js` with the signature the backend will honor, add its name to `API_CONTRACT` in `src/api/index.js`, and cover it in `test/api.test.js`. Components call it through the `api` prop.
- **Record keys:** the store layout lives in `src/api/mockStore.js`, and only `src/api/` touches the store. Components go through the `api` object, never the store.
- **Plain JS stays Node-safe:** `lms.config.js`, `api/`, and `scorm/runtime.js` use no JSX or Vite-only imports, so the headless tests can import them directly.

## Feature flags

`features.sandboxHints` (default `true`) shows the sandbox-only helpers: the demo accounts and prefilled credentials on sign-in, the SCORM runtime note in the player, and the SES stand-in notice on completion. Set it to `false` for any client-facing build.

## Known gaps (carried from Sprint 0, not changed in Sprint 1)

- The mock store is not yet keyed like the DynamoDB single table (see the header of `src/api/mockStore.js`). Re-keying is recommended before Sprint 2.
- The certificate record does not yet carry the Open Badges forward-compatible fields (issuer, criteria, skill, evidence URL, expires) that playbook Section 4 calls for.

## Security notes

- Vite is pinned to 5.4.21, the latest 5.4 patch, rather than the DST's 5.4.10: it closes the dev-server file-access advisories that affect 5.4.10. `npm audit` still reports dev-server-only advisories that need Vite 7 or later (one is Windows-only). None affect the production build, which is static files. Keeping the dev server on localhost by default limits exposure.
