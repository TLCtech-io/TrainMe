// Headless tests for the SCORM 1.2 runtime mock (src/scorm/runtime.js).
// Run with: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installScormApi } from '../src/scorm/runtime.js';

// The runtime installs itself on window.API, as SCORM content expects.
globalThis.window = globalThis;

test('installs window.API with SCORM 1.2 defaults', () => {
  const rt = installScormApi(null, () => {});
  assert.equal(window.API, rt.api);
  assert.equal(rt.api.LMSInitialize(''), 'true');
  assert.equal(rt.api.LMSGetValue('cmi.core.lesson_status'), 'not attempted');
  assert.equal(rt.api.LMSGetValue('cmi.suspend_data'), '');
  assert.equal(rt.api.LMSGetValue('cmi.core.score.max'), '100');
  assert.equal(rt.api.LMSGetValue('cmi.unknown.element'), '');
  assert.equal(rt.api.LMSGetLastError(), '0');
  rt.teardown();
});

test('saved CMI overrides the defaults (the resume path)', () => {
  const rt = installScormApi({ 'cmi.suspend_data': '4', 'cmi.core.lesson_status': 'incomplete' }, () => {});
  assert.equal(rt.api.LMSGetValue('cmi.suspend_data'), '4');
  assert.equal(rt.api.LMSGetValue('cmi.core.lesson_status'), 'incomplete');
  rt.teardown();
});

test('LMSCommit and LMSFinish hand a copy of the bag to onCommit', () => {
  const commits = [];
  const rt = installScormApi(null, (bag) => commits.push(bag));
  rt.api.LMSSetValue('cmi.suspend_data', '2');
  rt.api.LMSCommit('');
  rt.api.LMSSetValue('cmi.suspend_data', '3');
  rt.api.LMSFinish('');
  assert.equal(commits.length, 2);
  assert.equal(commits[0]['cmi.suspend_data'], '2'); // not mutated by the later set
  assert.equal(commits[1]['cmi.suspend_data'], '3');
  rt.teardown();
});

test('snapshot() is a copy and survives teardown (playbook 10.1)', () => {
  const rt = installScormApi(null, () => {});
  rt.set('cmi.core.lesson_status', 'completed');
  const snap = rt.snapshot();
  snap['cmi.core.lesson_status'] = 'tampered';
  assert.equal(rt.snapshot()['cmi.core.lesson_status'], 'completed');

  rt.teardown();
  assert.equal(window.API, undefined);
  // Completion reads through snapshot(), so a torn-down global cannot strand it.
  assert.equal(rt.snapshot()['cmi.core.lesson_status'], 'completed');
});

test('StrictMode double install: stale teardown leaves the live API alone', () => {
  const first = installScormApi(null, () => {});
  const second = installScormApi(null, () => {});
  first.teardown(); // cleanup from the first (discarded) mount
  assert.equal(window.API, second.api);
  second.teardown();
  assert.equal(window.API, undefined);
});
