// Headless tests for the mock single table (src/api/mockStore.js): the
// records land under the playbook's keys, every access pattern is a get or a
// query, and the roster and catalog come from their indexes.
// Run with: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStore, keys } from '../src/api/mockStore.js';
import { makeApi } from '../src/api/mockApi.js';

function harness() {
  let session = null;
  const store = makeStore();
  const api = makeApi(store, () => session);
  return {
    store,
    api,
    async signInAs(email) {
      session = await api.signIn(email, 'demo');
      return session.profile;
    },
  };
}

test('the table offers get, put, query, and queryIndex, and no scan', () => {
  const { table } = makeStore();
  assert.deepEqual(Object.keys(table).sort(), ['get', 'put', 'query', 'queryIndex']);
});

test('seed data lands as USER#, COURSE#/META, and COURSE#/ITEM# items', () => {
  const { table } = makeStore();
  const profile = table.get('USER#u-student-001', 'PROFILE');
  assert.equal(profile.role, 'student');
  assert.equal(profile.password, undefined, 'passwords belong to Cognito, never the table');
  assert.equal(table.get('COURSE#c-msg-101', 'META').title, 'Effective Message Writing');
  const items = table.query('COURSE#c-msg-101', 'ITEM#');
  assert.equal(items.length, 1);
  assert.equal(items[0].type, 'scorm');
  assert.equal(items[0].scoId, 'sco-main');
});

test('catalog is the GSI2 query CATALOG#published / COURSE#', () => {
  const { table } = makeStore();
  const ids = table.queryIndex('GSI2', 'CATALOG#published', 'COURSE#').map((c) => c.courseId);
  assert.deepEqual(ids, ['c-eop-pwc', 'c-msg-101']);
});

test('learner records land under the playbook keys', async () => {
  const h = harness();
  const me = await h.signInAs('student@demo.test');
  const pk = keys.user(me.sub);
  await h.api.enroll('c-msg-101');
  await h.api.commitCmi('c-msg-101', { 'cmi.core.lesson_status': 'completed', 'cmi.core.score.raw': '92' });

  const t = h.store.table;
  assert.equal(t.get(pk, 'ENROLL#c-msg-101').status, 'completed');
  assert.equal(t.get(pk, 'CMI#c-msg-101#sco-main').cmi['cmi.core.score.raw'], '92');
  assert.equal(t.get(pk, 'CERT#c-msg-101').score, 92);
  // The whole learner partition, in SK order
  assert.deepEqual(
    t.query(pk).map((i) => i.SK),
    ['CERT#c-msg-101', 'CMI#c-msg-101#sco-main', 'ENROLL#c-msg-101', 'PROFILE']
  );
});

test('roster is the GSI1 query COURSE#<courseId> / ENROLL#, across learners', async () => {
  const h = harness();
  const a = await h.signInAs('student@demo.test');
  await h.api.enroll('c-eop-pwc');
  const b = await h.signInAs('instructor@demo.test');
  await h.api.enroll('c-eop-pwc');
  await h.api.enroll('c-msg-101');

  const roster = h.store.table.queryIndex('GSI1', 'COURSE#c-eop-pwc', 'ENROLL#');
  assert.deepEqual(roster.map((e) => e.sub).sort(), [a.sub, b.sub].sort());
  assert.equal(h.store.table.queryIndex('GSI1', 'COURSE#c-msg-101', 'ENROLL#').length, 1);
});

test('reads return copies: mutating a result never changes the table', () => {
  const { table } = makeStore();
  const course = table.get('COURSE#c-msg-101', 'META');
  course.title = 'tampered';
  assert.equal(table.get('COURSE#c-msg-101', 'META').title, 'Effective Message Writing');
});
