/* ============================================================================
   MOCK STORE
   The in-memory tables behind the mock api. The record layout lives here
   and the method bodies in mockApi.js read and write it; nothing outside
   src/api/ touches the store, so re-keying never reaches a component.

   KNOWN GAP (carried unchanged from Sprint 0): these maps do not yet mirror
   the DynamoDB single-table design in the playbook (Section 5). Records are
   keyed `${sub}::${courseId}` across three maps; users and courses are seed
   constants rather than USER#/COURSE# items; there are no ITEM# records; and
   CMI is keyed per course, not CMI#<courseId>#<scoId>. Re-keying to PK/SK
   items (with a GSI1 roster emulation) is the recommended first step before
   Sprint 2, because the instructor roster and grading queue need it. The api
   method signatures do not change when that happens.
   ============================================================================ */

export function makeStore() {
  return {
    enrollments: {}, // `${sub}::${courseId}` -> enrollment item
    cmi: {}, // `${sub}::${courseId}` -> raw CMI bag (suspend_data, status, score)
    certs: {}, // `${sub}::${courseId}` -> cert item
    outbox: [], // stand-in for SES; certificate "emails" land here
  };
}

// The composite key every per-learner, per-course record uses today.
export const learnerCourseKey = (sub, courseId) => `${sub}::${courseId}`;
