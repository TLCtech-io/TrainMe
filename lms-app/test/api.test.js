// Headless tests for the mock api: the backend contract and the full Sprint 0
// student vertical, driven the same way the app drives it.
// Run with: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, API_CONTRACT } from '../src/api/index.js';
import { installScormApi } from '../src/scorm/runtime.js';

globalThis.window = globalThis; // the SCORM runtime installs window.API

// Mirrors App.jsx: the api reads identity through a session getter the shell
// owns, so switching `session` switches who the api acts for.
function harness() {
  let session = null;
  const api = createApi(() => session);
  return {
    api,
    async signInAs(email) {
      session = await api.signIn(email, 'demo');
      return session.profile;
    },
    signOut() {
      session = null;
    },
  };
}

test('api exposes exactly the contract methods', () => {
  const { api } = harness();
  assert.deepEqual(Object.keys(api).sort(), [...API_CONTRACT].sort());
  for (const name of API_CONTRACT) assert.equal(typeof api[name], 'function', name);
});

test('signIn: returns token + profile, never the password; rejects bad credentials', async () => {
  const { api } = harness();
  const res = await api.signIn('  Student@Demo.TEST ', 'demo');
  assert.ok(res.token);
  assert.deepEqual(Object.keys(res.profile).sort(), ['email', 'name', 'role', 'sub']);
  assert.equal(res.profile.role, 'student');
  await assert.rejects(() => api.signIn('student@demo.test', 'wrong'), /Incorrect email or password/);
  await assert.rejects(() => api.signIn('nobody@demo.test', 'demo'), /Incorrect email or password/);
});

test('student vertical: enroll -> play -> resume -> complete -> certificate -> transcript', async () => {
  const h = harness();
  const { api } = h;
  const me = await h.signInAs('student@demo.test');
  const courseId = 'c-eop-pwc'; // single-SCO course: the Sprint 0 path

  // Catalog and a clean slate
  const catalog = await api.listCatalog();
  assert.deepEqual(catalog.map((c) => c.courseId).sort(), ['c-eop-pwc', 'c-msg-101']);
  assert.deepEqual(await api.listEnrollments(), []);

  // Enroll (idempotent), keyed to the session's sub (playbook 10.2)
  const enr = await api.enroll(courseId);
  assert.equal(enr.status, 'enrolled');
  assert.equal(enr.sub, me.sub);
  assert.deepEqual(await api.enroll(courseId), enr);

  // Open the course: nothing saved yet; install the runtime like the player
  assert.equal(await api.getCmi(courseId), null);
  let rt = installScormApi(null, () => {});
  rt.api.LMSInitialize('');
  rt.set('cmi.core.lesson_status', 'incomplete');

  // Move to slide 3: bookmark commit marks the enrollment in progress
  rt.set('cmi.suspend_data', '3');
  rt.api.LMSCommit('');
  const mid = await api.commitCmi(courseId, rt.snapshot());
  assert.deepEqual(mid, { completed: false, certificate: null });
  assert.equal((await api.listEnrollments())[0].status, 'in_progress');

  // Leave and reopen: the bookmark comes back (the resume mechanism)
  rt.teardown();
  const saved = await api.getCmi(courseId);
  assert.equal(saved['cmi.suspend_data'], '3');
  assert.equal(saved['cmi.core.lesson_status'], 'incomplete');
  rt = installScormApi(saved, () => {});
  assert.equal(rt.api.LMSGetValue('cmi.suspend_data'), '3');

  // Finish: the bag is built from snapshot() with overrides, as the player does
  const bag = { ...rt.snapshot(), 'cmi.core.score.raw': '92', 'cmi.core.lesson_status': 'completed' };
  rt.teardown(); // even with the global gone, the bag is intact (10.1)
  const done = await api.commitCmi(courseId, bag);
  assert.equal(done.completed, true);
  assert.equal(done.certificate.learnerName, me.name); // identity from the session
  assert.equal(done.certificate.courseId, courseId);
  assert.equal(done.certificate.score, 92);

  // Enrollment, certificate, and the SES stand-in
  const [row] = await api.listEnrollments();
  assert.equal(row.status, 'completed');
  assert.equal(row.score, 92);
  assert.ok(row.completedAt);
  assert.deepEqual(await api.getCertificate(courseId), done.certificate);
  const mail = await api._outbox();
  assert.equal(mail.length, 1);
  assert.equal(mail[0].to, me.email);

  // Review path: re-completing does not re-issue; the existing cert is returned
  const again = await api.commitCmi(courseId, bag);
  assert.deepEqual(again, { completed: false, certificate: null });
  assert.deepEqual(await api.getCertificate(courseId), done.certificate);
  assert.equal((await api._outbox()).length, 1);

  // Transcript: one line per course
  const transcript = await api.listEnrollments();
  assert.equal(transcript.length, 1);
});

test('identity isolation: one learner never sees another learner\'s records', async () => {
  const h = harness();
  const { api } = h;

  await h.signInAs('student@demo.test');
  await api.enroll('c-eop-pwc');
  await api.commitCmi('c-eop-pwc', { 'cmi.core.lesson_status': 'completed', 'cmi.core.score.raw': '88' });

  const other = await h.signInAs('instructor@demo.test');
  assert.deepEqual(await api.listEnrollments(), []);
  assert.equal(await api.getCmi('c-eop-pwc'), null);
  assert.equal(await api.getCertificate('c-eop-pwc'), null);
  assert.deepEqual(await api._outbox(), []);

  // The second user's own enrollment lands under their own sub
  const theirs = await api.enroll('c-eop-pwc');
  assert.equal(theirs.sub, other.sub);
  assert.equal(theirs.status, 'enrolled');

  // And the first learner's record is untouched
  await h.signInAs('student@demo.test');
  const [mine] = await api.listEnrollments();
  assert.equal(mine.status, 'completed');
  assert.equal(mine.score, 88);
});

test('SCORM commits are refused without an enrollment', async () => {
  const h = harness();
  const { api } = h;
  await h.signInAs('student@demo.test');
  await assert.rejects(
    () => api.commitCmi('c-eop-pwc', { 'cmi.core.lesson_status': 'completed', 'cmi.core.score.raw': '90' }),
    /Not enrolled/
  );
  assert.equal(await api.getCertificate('c-eop-pwc'), null);
  assert.deepEqual(await api.listEnrollments(), []);
});

test('scoId: omitted means the course\'s first SCO; each SCO keeps its own runtime record', async () => {
  const h = harness();
  const { api } = h;
  await h.signInAs('student@demo.test');
  await api.enroll('c-msg-101');
  await api.commitCmi('c-msg-101', { 'cmi.suspend_data': '2', 'cmi.core.lesson_status': 'incomplete' });
  // Default and explicit first SCO read the same record
  assert.equal((await api.getCmi('c-msg-101'))['cmi.suspend_data'], '2');
  assert.equal((await api.getCmi('c-msg-101', 'sco-main'))['cmi.suspend_data'], '2');
  // The second SCO has its own (empty) record, and is gated
  assert.equal(await api.getCmi('c-msg-101', 'sco-check'), null);
  await assert.rejects(() => api.commitCmi('c-msg-101', { 'cmi.suspend_data': '9' }, 'sco-check'), /locked/);
  // A SCO the course does not have is refused
  await assert.rejects(() => api.commitCmi('c-msg-101', {}, 'sco-nope'), /Unknown SCO/);
});

test('returned records carry no table key attributes', async () => {
  const h = harness();
  const { api } = h;
  await h.signInAs('student@demo.test');
  const leaks = (o) => Object.keys(o).filter((k) => /^(PK|SK|GSI\d(PK|SK)|entity)$/.test(k));
  for (const c of await api.listCatalog()) assert.deepEqual(leaks(c), []);
  assert.deepEqual(leaks(await api.enroll('c-eop-pwc')), []);
  for (const e of await api.listEnrollments()) assert.deepEqual(leaks(e), []);
  const done = await api.commitCmi('c-eop-pwc', { 'cmi.core.lesson_status': 'passed', 'cmi.core.score.raw': '85' });
  assert.deepEqual(leaks(done.certificate), []);
  assert.deepEqual(leaks(await api.getCertificate('c-eop-pwc')), []);
  const progress = await api.getCourseProgress('c-eop-pwc');
  for (const i of progress.items) assert.deepEqual(leaks(i), []);
});
