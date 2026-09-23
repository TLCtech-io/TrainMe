// Headless tests for certificates as credentials: the Open Badges fields,
// the public credential ID, per-course expiry, and the per-course
// certificate switch. Run with: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import LMS_CONFIG from '../src/lms.config.js';
import { makeStore, keys } from '../src/api/mockStore.js';
import { makeApi } from '../src/api/mockApi.js';
import { newCredentialId, CREDENTIAL_ID_PATTERN } from '../src/api/credentialId.js';

const COMPLETE = { 'cmi.core.lesson_status': 'completed', 'cmi.core.score.raw': '92' };

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
    // Change a course's credential policy in the table, as an admin would.
    setCourse(courseId, patch) {
      const meta = store.table.get(keys.course(courseId), keys.meta());
      store.table.put({ ...meta, ...patch });
    },
  };
}

test('credential IDs are 4-4-4 Crockford base32 and do not repeat', () => {
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const id = newCredentialId();
    assert.match(id, CREDENTIAL_ID_PATTERN);
    seen.add(id);
  }
  assert.equal(seen.size, 5000);
});

test('a certificate carries the Open Badges fields', async () => {
  const h = harness();
  await h.signInAs('student@demo.test');
  await h.api.enroll('c-msg-101');
  const { certificate: c } = await h.api.commitCmi('c-msg-101', COMPLETE);

  assert.match(c.credentialId, CREDENTIAL_ID_PATTERN);
  assert.ok(!c.credentialId.includes('c-msg-101'), 'the public ID must not reveal the course');
  assert.deepEqual(c.issuer, LMS_CONFIG.credentials.issuer);
  assert.match(c.criteria, /^PLACEHOLDER: /);
  assert.equal(c.skills.length, 1);
  assert.equal(c.evidenceUrl, null);
  assert.ok(Date.parse(c.issuedAt));
  assert.equal(c.expiresAt, null, 'seed courses have no expiry yet');
  assert.equal(c.certId, undefined, 'the guessable Sprint 0 ID is gone');
});

test('the issuer is snapshotted: a later config change does not rewrite issued certificates', async () => {
  const h = harness();
  await h.signInAs('student@demo.test');
  await h.api.enroll('c-msg-101');
  const { certificate } = await h.api.commitCmi('c-msg-101', COMPLETE);
  certificate.issuer.name = 'tampered'; // mutate the returned copy
  assert.equal((await h.api.getCertificate('c-msg-101')).issuer.name, LMS_CONFIG.credentials.issuer.name);
});

test('a credential is found by its public ID with one GSI3 query', async () => {
  const h = harness();
  const me = await h.signInAs('student@demo.test');
  await h.api.enroll('c-msg-101');
  const { certificate } = await h.api.commitCmi('c-msg-101', COMPLETE);
  const hits = h.store.table.queryIndex('GSI3', keys.credential(certificate.credentialId));
  assert.equal(hits.length, 1);
  assert.equal(hits[0].sub, me.sub);
  assert.equal(hits[0].courseId, 'c-msg-101');
});

test('validityMonths sets expiresAt from issuedAt', async () => {
  const h = harness();
  h.setCourse('c-msg-101', { credential: { criteria: 'x', skills: [], validityMonths: 24 } });
  await h.signInAs('student@demo.test');
  await h.api.enroll('c-msg-101');
  const { certificate: c } = await h.api.commitCmi('c-msg-101', COMPLETE);
  const issued = new Date(c.issuedAt);
  const expires = new Date(c.expiresAt);
  const months = (expires.getUTCFullYear() - issued.getUTCFullYear()) * 12 + (expires.getUTCMonth() - issued.getUTCMonth());
  assert.equal(months, 24);
});

test('certificateEnabled false: completion is recorded, no certificate and no email', async () => {
  const h = harness();
  h.setCourse('c-eop-pwc', { certificateEnabled: false });
  await h.signInAs('student@demo.test');
  await h.api.enroll('c-eop-pwc');
  const res = await h.api.commitCmi('c-eop-pwc', COMPLETE);
  assert.deepEqual(res, { completed: true, certificate: null });
  const [enr] = await h.api.listEnrollments();
  assert.equal(enr.status, 'completed');
  assert.equal(enr.score, 92);
  assert.equal(await h.api.getCertificate('c-eop-pwc'), null);
  assert.deepEqual(await h.api._outbox(), []);
});
