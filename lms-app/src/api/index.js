/* ============================================================================
   API ENTRY POINT
   The one place the app obtains its data layer. Today it wires the mock api
   to a fresh in-memory store. Sprint 4 points this at the live implementation
   (same method names and signatures, fetch() bodies); nothing that imports
   createApi changes.
   ============================================================================ */

import { makeApi } from './mockApi.js';
import { makeStore } from './mockStore.js';

// The backend contract: every public method the api object exposes. The
// contract test (test/api.test.js) fails if the implementation drifts from
// this list in either direction. `_outbox` is sandbox-only (SES stand-in).
export const API_CONTRACT = [
  // auth and catalog
  'signIn',
  'listCatalog',
  'getCourseOutline',
  // learner
  'listEnrollments',
  'enroll',
  'getCourseProgress',
  'getCmi',
  'commitCmi',
  'getCertificate',
  'uploadFile',
  'getFileUrl',
  'submitAssignment',
  'listSubmissions',
  // instructor and admin
  'listTeaching',
  'getRoster',
  'listGradingQueue',
  'getReview',
  'evaluateSubmission',
  'saveAssignment',
  // sandbox only
  '_outbox',
];

// getSession: () => { token, profile } | null, owned by the app shell.
export function createApi(getSession) {
  return makeApi(makeStore(), getSession);
}
