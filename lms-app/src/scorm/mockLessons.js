/* ============================================================================
   MOCK SCO CONTENT
   A few local slides per course standing in for a Rise360 SCORM package.
   The real build replaces the player's viewport with
   <iframe src={course.scormLaunch}> and this module goes away.
   ============================================================================ */

const lessonSets = {
  'c-eop-pwc': [
    ['Course Overview', 'What this training covers and how completion is recorded.'],
    ['Introduction', 'Purpose and scope of the Emergency Operations Plan.'],
    ['Plan Organization', 'How the EOP is structured and how to navigate it.'],
    ['Delegation of Authority', 'Who can act, and when authority transfers.'],
    ['Plan Activation', 'Triggers and steps that put the plan into effect.'],
    ['Concept of Operations', 'How the jurisdiction coordinates a response.'],
    ['Assignment of Responsibilities', 'Roles each department and partner holds.'],
    ['Emergency Declarations', 'Local, state, and federal declaration pathways.'],
    ['Training and Exercise', 'How the program builds and validates competency.'],
    ['Course Quiz', 'Confirm understanding to record your completion certificate.'],
  ],
  // Effective Message Writing is two SCOs: the lessons, then the knowledge
  // check, which unlocks only after the instructor approves the assignment.
  'c-msg-101': [
    ['Why messaging matters', 'Clear alerts drive protective action. Vague ones cost time.'],
    ['The five elements', 'Source, hazard, location, protective action, and time.'],
    ['Write for action', 'Lead with what to do. Plain language. No jargon.'],
  ],
  'c-msg-101#sco-check': [
    ['Knowledge check', 'Mark the check complete to record your score.'],
  ],
};

// Slides for a SCO as [{ h, b }]. A course's primary SCO (sco-main) is keyed
// by courseId; any other SCO by `${courseId}#${scoId}`. Generic fallback set.
export function lessonsFor(courseId, scoId = 'sco-main') {
  const set = (scoId !== 'sco-main' && lessonSets[`${courseId}#${scoId}`]) || lessonSets[courseId];
  return (set || lessonSets['c-msg-101']).map(([h, b]) => ({ h, b }));
}
