# TrainMe: TLC_TRNG Learning Management System

A custom LMS for TLC TRNG, LLC, built front-end-first against a mock data layer, then wired to AWS.

## Where things are

| Path | What it is |
|---|---|
| `lms-app/` | **The application** (Vite + React). Start here: `lms-app/README.md`. |
| `LMS_Build_Playbook_v1.md` | The authoritative build guide: architecture, data model, SCORM runtime, sprint roadmap. |
| `lms_vertical_slice.jsx` | Sprint 0 artifact (single-file scaffold), superseded by `lms-app/` and kept for history. |
| `DST_Build_Playbook.md`, `tlc-trng-dst/` | Reference only: the sibling DST build's AWS, branding, and deployment conventions. |
| `Basic_LMS_reqs.docx` | The scoping requirements the build serves. |
| `TLC_TRNG *.pdf` | Client-facing framing. |

SCORM packages are gitignored (they belong in S3, not Git).

## Quick start

```bash
cd lms-app
npm install
npm run dev     # http://localhost:5173 (sandbox accounts: student@, instructor@, admin@demo.test / demo)
npm test        # headless proof of the contract, the single table, and the student vertical
npm run e2e     # browser walkthrough (first run: npx playwright install chromium)
```
