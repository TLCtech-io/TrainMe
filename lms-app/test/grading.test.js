// Headless tests for Sprint 2: per-item gating, assignment submission and
// resubmission, rubric evaluation with the four-level scale, instructor
// scope, file access, rubric authoring, due dates, and the grading queue.
// Run with: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStore, keys } from '../src/api/mockStore.js';
import { makeApi } from '../src/api/mockApi.js';

const C = 'c-msg-101';
const LESSONS = 'i-msg-101-lessons';
const DRAFT = 'i-msg-101-draft';
const CHECK = 'i-msg-101-check';
const DONE = { 'cmi.core.lesson_status': 'completed' };
const ALL = (level) => ({ 'crit-elements': level, 'crit-action': level, 'crit-plain': level });

function harness() {
  let session = null;
  const store = makeStore();
  const api = makeApi(store, () => session);
  const as = async (email) => {
    session = await api.signIn(email, 'demo');
    return session.profile;
  };
  const fileFor = (name = 'draft.pdf', size = 1200) =>
    new File([new Uint8Array(size)], name, { type: 'application/pdf' });
  const statusOf = async (itemId) =>
    (await api.getCourseProgress(C)).items.find((i) => i.itemId === itemId).state;
  // Learner finishes the lessons and submits a draft.
  const submitDraft = async (note = 'first draft') => {
    const f = await api.uploadFile(C, DRAFT, fileFor());
    return api.submitAssignment(C, DRAFT, { note, files: [f] });
  };
  return { store, api, as, fileFor, statusOf, submitDraft };
}

async function learnerReadyToSubmit(h) {
  const me = await h.as('student@demo.test');
  await h.api.enroll(C);
  await h.api.commitCmi(C, DONE, 'sco-main');
  return me;
}

test('gating: after_previous opens on submission, after_approval only on approval', async () => {
  const h = harness();
  await h.as('student@demo.test');
  await h.api.enroll(C);

  assert.equal((await h.statusOf(LESSONS)).status, 'available');
  assert.equal((await h.statusOf(DRAFT)).status, 'locked');
  assert.equal((await h.statusOf(CHECK)).status, 'locked');
  await assert.rejects(() => h.submitDraft(), /locked/);

  await h.api.commitCmi(C, DONE, 'sco-main');
  assert.equal((await h.statusOf(LESSONS)).status, 'complete');
  assert.equal((await h.statusOf(DRAFT)).status, 'available');
  assert.equal((await h.statusOf(CHECK)).status, 'locked');

  await h.submitDraft();
  assert.equal((await h.statusOf(DRAFT)).status, 'submitted');
  // Submitted is not approved: the knowledge check stays locked
  assert.equal((await h.statusOf(CHECK)).status, 'locked');
  await assert.rejects(() => h.api.commitCmi(C, DONE, 'sco-check'), /locked/);
});

test('full loop: submit, return with feedback, resubmit, approve, unlock, complete, certify', async () => {
  const h = harness();
  const learner = await learnerReadyToSubmit(h);
  const first = await h.submitDraft('v1');
  assert.equal(first.attempt, 1);
  await assert.rejects(() => h.submitDraft('again'), /awaiting review/);

  // Instructor sees it in the queue
  await h.as('instructor@demo.test');
  let queue = await h.api.listGradingQueue(C);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].learnerName, 'Jordan Avery');
  assert.equal(queue[0].itemTitle, 'Draft an alert message');

  // Returning requires comments
  await assert.rejects(
    () => h.api.evaluateSubmission(C, learner.sub, DRAFT, 1, { ratings: ALL('approaching'), outcome: 'approaching' }),
    /comments/
  );
  const back = await h.api.evaluateSubmission(C, learner.sub, DRAFT, 1, {
    ratings: { ...ALL('competent'), 'crit-action': 'approaching' },
    outcome: 'approaching',
    comments: 'Lead with the protective action.',
  });
  assert.equal(back.submission.status, 'returned');
  assert.equal(back.submission.evaluation.outcomeLabel, 'Approaching Competency');
  assert.equal(back.completed, false);
  assert.deepEqual(await h.api.listGradingQueue(C), []);

  // Learner sees the feedback and resubmits
  await h.as('student@demo.test');
  assert.equal((await h.statusOf(DRAFT)).status, 'returned');
  const history = await h.api.listSubmissions(C, DRAFT);
  assert.equal(history[0].evaluation.comments, 'Lead with the protective action.');
  assert.equal(history[0].evaluation.ratings['crit-action'], 'approaching');
  assert.equal(history[0].evaluation.evaluatorName, 'Sam Rivera');
  const mail = await h.api._outbox();
  assert.equal(mail.at(-1).subject, 'Returned for revision: Draft an alert message');
  const second = await h.submitDraft('v2');
  assert.equal(second.attempt, 2);
  assert.equal((await h.statusOf(CHECK)).status, 'locked');

  // Instructor approves: Competent passes
  await h.as('instructor@demo.test');
  await assert.rejects(
    () => h.api.evaluateSubmission(C, learner.sub, DRAFT, 1, { ratings: ALL('competent'), outcome: 'competent' }),
    /already been evaluated/
  );
  const ok = await h.api.evaluateSubmission(C, learner.sub, DRAFT, 2, { ratings: ALL('competent'), outcome: 'competent' });
  assert.equal(ok.submission.status, 'approved');
  assert.equal(ok.completed, false, 'the knowledge check is still required');

  // Knowledge check unlocks; finishing it completes the course
  await h.as('student@demo.test');
  assert.equal((await h.statusOf(DRAFT)).status, 'complete');
  assert.equal((await h.statusOf(CHECK)).status, 'available');
  const done = await h.api.commitCmi(C, { ...DONE, 'cmi.core.score.raw': '88' }, 'sco-check');
  assert.equal(done.completed, true);
  assert.equal(done.certificate.learnerName, 'Jordan Avery');
  assert.equal(done.certificate.score, 88, 'the course score is the assessment score');
  const p = await h.api.getCourseProgress(C);
  assert.equal(p.enrollment.status, 'completed');
  assert.deepEqual(p.summary, { required: 3, complete: 3, allRequiredComplete: true });
});

test('approval can be the step that completes the course, certifying the learner (not the instructor)', async () => {
  const h = harness();
  const learner = await learnerReadyToSubmit(h);
  // Make the assignment the last required item: the check becomes optional
  const check = h.store.table.get(keys.course(C), keys.item(CHECK));
  h.store.table.put({ ...check, required: false });
  await h.submitDraft();

  await h.as('instructor@demo.test');
  const res = await h.api.evaluateSubmission(C, learner.sub, DRAFT, 1, { ratings: ALL('advanced'), outcome: 'advanced' });
  assert.equal(res.completed, true);
  assert.equal(res.certificate.sub, learner.sub);
  assert.equal(res.certificate.learnerName, 'Jordan Avery');
  assert.equal(res.certificate.score, null, 'no assessment was completed, so no numeric score');
  assert.equal(await h.api.getCertificate(C), null, 'the instructor received no certificate');

  await h.as('student@demo.test');
  assert.equal((await h.api.getCertificate(C)).credentialId, res.certificate.credentialId);
  assert.ok((await h.api._outbox()).some((m) => m.subject === 'Your certificate: Effective Message Writing'));
});

test('rubric evaluation: every criterion rated, a valid outcome, both passing levels pass', async () => {
  const h = harness();
  const learner = await learnerReadyToSubmit(h);
  await h.submitDraft();
  await h.as('instructor@demo.test');
  await assert.rejects(
    () => h.api.evaluateSubmission(C, learner.sub, DRAFT, 1, { ratings: { 'crit-elements': 'advanced' }, outcome: 'advanced' }),
    /Rate every rubric criterion/
  );
  await assert.rejects(
    () => h.api.evaluateSubmission(C, learner.sub, DRAFT, 1, { ratings: ALL('advanced'), outcome: 'excellent' }),
    /overall outcome/
  );
  const res = await h.api.evaluateSubmission(C, learner.sub, DRAFT, 1, { ratings: ALL('advanced'), outcome: 'advanced' });
  assert.equal(res.submission.status, 'approved');
  assert.equal(res.submission.evaluation.passing, true);

  // Additional Learning Required does not pass
  const h2 = harness();
  const l2 = await learnerReadyToSubmit(h2);
  await h2.submitDraft();
  await h2.as('admin@demo.test');
  const r2 = await h2.api.evaluateSubmission(C, l2.sub, DRAFT, 1, {
    ratings: ALL('additional_learning'),
    outcome: 'additional_learning',
    comments: 'Revisit the five elements.',
  });
  assert.equal(r2.submission.status, 'returned');
});

test('instructor scope: assigned courses only; admins everywhere; learners nowhere', async () => {
  const h = harness();
  await learnerReadyToSubmit(h);
  await h.submitDraft();
  await h.api.enroll('c-eop-pwc');

  // A learner cannot use instructor methods
  await assert.rejects(() => h.api.listGradingQueue(C), /Not authorized/);
  await assert.rejects(() => h.api.getRoster(C), /Not authorized/);
  assert.deepEqual(await h.api.listTeaching(), []);

  // The instructor teaches c-msg-101 only
  await h.as('instructor@demo.test');
  const teaching = await h.api.listTeaching();
  assert.deepEqual(teaching.map((c) => c.courseId), [C]);
  assert.equal(teaching[0].pendingCount, 1);
  assert.equal(teaching[0].learnerCount, 1);
  await assert.rejects(() => h.api.getRoster('c-eop-pwc'), /Not authorized/);
  await assert.rejects(() => h.api.listGradingQueue('c-eop-pwc'), /Not authorized/);
  // ...but sees the full catalog and can take courses as a student
  assert.equal((await h.api.listCatalog()).length, 2);
  await h.api.enroll('c-eop-pwc');

  // Admins see every course
  await h.as('admin@demo.test');
  assert.deepEqual((await h.api.listTeaching()).map((c) => c.courseId).sort(), ['c-eop-pwc', C]);
  assert.equal((await h.api.getRoster('c-eop-pwc')).length, 2);
});

test('nobody evaluates their own submission', async () => {
  const h = harness();
  const instr = await h.as('instructor@demo.test');
  await h.api.enroll(C);
  await h.api.commitCmi(C, DONE, 'sco-main');
  await h.submitDraft();
  await assert.rejects(
    () => h.api.evaluateSubmission(C, instr.sub, DRAFT, 1, { ratings: ALL('advanced'), outcome: 'advanced' }),
    /own submission/
  );
});

test('files: size limit, owner and instructors may open, other learners may not', async () => {
  const h = harness();
  await learnerReadyToSubmit(h);
  await assert.rejects(() => h.api.uploadFile(C, DRAFT, h.fileFor('huge.pdf', 26 * 1024 * 1024)), /too large/);
  await assert.rejects(() => h.api.uploadFile(C, LESSONS, h.fileFor()), /does not take uploads/);
  const f = await h.api.uploadFile(C, DRAFT, h.fileFor('my/draft.pdf'));
  assert.equal(f.name, 'my_draft.pdf', 'path separators are neutralized');
  assert.ok(f.fileKey.startsWith('uploads/u-student-001/c-msg-101/i-msg-101-draft/'));
  assert.equal(typeof (await h.api.getFileUrl(f.fileKey)), 'string');

  // A submission may only reference the learner's own uploads for this item
  await assert.rejects(
    () => h.api.submitAssignment(C, DRAFT, { files: [{ ...f, fileKey: 'uploads/u-admin-001/c-msg-101/i-msg-101-draft/x/a.pdf' }] }),
    /not uploaded/
  );
  await assert.rejects(() => h.api.submitAssignment(C, DRAFT, { files: [] }), /at least one file/);
  await h.api.submitAssignment(C, DRAFT, { files: [f] });

  await h.as('instructor@demo.test');
  assert.equal(typeof (await h.api.getFileUrl(f.fileKey)), 'string');
  await h.as('admin@demo.test');
  assert.equal(typeof (await h.api.getFileUrl(f.fileKey)), 'string');

  // Someone who neither owns the file nor teaches its course is refused:
  // the instructor, for a file under c-eop-pwc (a course they do not teach)
  await h.as('instructor@demo.test');
  await assert.rejects(() => h.api.getFileUrl('uploads/u-student-001/c-eop-pwc/x/y/z.pdf'), /Not authorized/);
});

test('rubrics: instructors of the course edit them; evaluations keep their snapshot', async () => {
  const h = harness();
  const learner = await learnerReadyToSubmit(h);
  await h.submitDraft();

  // Learners can read the rubric of a course they are enrolled in, not edit it
  const rubric = await h.api.getRubric(C, 'r-msg-101-draft');
  assert.equal(rubric.criteria.length, 3);
  await assert.rejects(() => h.api.saveRubric(C, rubric), /Not authorized/);

  await h.as('instructor@demo.test');
  await h.api.evaluateSubmission(C, learner.sub, DRAFT, 1, {
    ratings: ALL('approaching'),
    outcome: 'approaching',
    comments: 'Revise.',
  });
  await assert.rejects(() => h.api.saveRubric(C, { ...rubric, title: '' }), /title/);
  await assert.rejects(() => h.api.saveRubric(C, { ...rubric, criteria: [] }), /at least one criterion/);
  const saved = await h.api.saveRubric(C, {
    ...rubric,
    title: 'Alert message rubric v2',
    criteria: [...rubric.criteria.slice(0, 2), { title: 'Timing', description: 'Says when.', levels: {} }],
  });
  assert.equal(saved.criteria.length, 3);
  assert.match(saved.criteria[2].criterionId, /^crit-/);
  assert.deepEqual(Object.keys(saved.criteria[2].levels), ['advanced', 'competent', 'approaching', 'additional_learning']);
  await assert.rejects(() => h.api.saveRubric('c-eop-pwc', { ...saved, rubricId: 'r-x' }), /Not authorized/);

  // The recorded evaluation still names the criteria it was scored against
  const review = await h.api.getReview(C, learner.sub, DRAFT);
  assert.equal(review.attempts[0].evaluation.rubric.title, 'PLACEHOLDER rubric: Draft an alert message');
  assert.equal(review.attempts[0].evaluation.rubric.criteria[2].title, 'Plain language');
  assert.equal(review.rubric.title, 'Alert message rubric v2');
});

test('due dates count from enrollment; overdue and late are flagged', async () => {
  const h = harness();
  const me = await learnerReadyToSubmit(h);
  let draft = await h.statusOf(DRAFT);
  const enrolledAt = (await h.api.getCourseProgress(C)).enrollment.enrolledAt;
  assert.equal(Date.parse(draft.dueAt) - Date.parse(enrolledAt), 14 * 24 * 60 * 60 * 1000);
  assert.equal(draft.overdue, false);

  // Move the enrollment 30 days into the past
  const enr = h.store.table.get(keys.user(me.sub), keys.enroll(C));
  h.store.table.put({ ...enr, enrolledAt: new Date(Date.now() - 30 * 86400000).toISOString() });
  draft = await h.statusOf(DRAFT);
  assert.equal(draft.overdue, true);
  assert.equal((await h.statusOf(LESSONS)).overdue, false, 'complete items are never overdue');

  const sub = await h.submitDraft();
  assert.equal(sub.late, true);
  assert.equal((await h.statusOf(DRAFT)).overdue, false, 'submitted work awaits review, not overdue');
  await h.as('instructor@demo.test');
  assert.equal((await h.api.listGradingQueue(C))[0].late, true);
});

test('the queue is GSI1 QUEUE#; evaluation moves the record to EVAL#', async () => {
  const h = harness();
  const learner = await learnerReadyToSubmit(h);
  await h.submitDraft();
  const t = h.store.table;
  assert.equal(t.queryIndex('GSI1', 'COURSE#c-msg-101', 'QUEUE#').length, 1);
  assert.equal(t.queryIndex('GSI1', 'COURSE#c-msg-101', 'ENROLL#').length, 1, 'the roster is unaffected');
  await h.as('instructor@demo.test');
  await h.api.evaluateSubmission(C, learner.sub, DRAFT, 1, { ratings: ALL('competent'), outcome: 'competent' });
  assert.equal(t.queryIndex('GSI1', 'COURSE#c-msg-101', 'QUEUE#').length, 0);
  assert.equal(t.queryIndex('GSI1', 'COURSE#c-msg-101', 'EVAL#').length, 1);
  assert.ok(t.get(keys.user(learner.sub), 'SUB#c-msg-101#i-msg-101-draft#001'));
});

test('roster reports each learner\'s progress', async () => {
  const h = harness();
  await learnerReadyToSubmit(h);
  await h.submitDraft();
  await h.as('instructor@demo.test');
  const [row] = await h.api.getRoster(C);
  assert.equal(row.name, 'Jordan Avery');
  assert.equal(row.status, 'in_progress');
  assert.equal(row.complete, 1);
  assert.equal(row.required, 3);
  assert.equal(row.awaitingReview, 1);
});
