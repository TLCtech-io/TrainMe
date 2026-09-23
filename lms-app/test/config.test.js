// Headless tests for the config module (src/lms.config.js).
// Run with: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import LMS_CONFIG from '../src/lms.config.js';
import { createApi } from '../src/api/index.js';

test('has the sections the app and index.html injection read', () => {
  for (const section of ['org', 'brand', 'theme', 'fonts', 'copy', 'features', 'sandbox']) {
    assert.ok(LMS_CONFIG[section], `missing config section: ${section}`);
  }
  for (const key of ['fullName', 'shortName', 'titleLong', 'metaDescription', 'resourcePrefix']) {
    assert.ok(LMS_CONFIG.org[key], `missing org.${key}`);
  }
  for (const key of ['heading', 'body', 'googleFontsHref']) {
    assert.ok(LMS_CONFIG.fonts[key], `missing fonts.${key}`);
  }
  assert.equal(typeof LMS_CONFIG.features.sandboxHints, 'boolean');
});

test('every theme token is a 6-digit hex color', () => {
  for (const [name, value] of Object.entries(LMS_CONFIG.theme)) {
    assert.match(value, /^#[0-9A-F]{6}$/i, `theme.${name} is not a hex color: ${value}`);
  }
});

test('carries the TLC_TRNG brand palette from the playbook', () => {
  const t = LMS_CONFIG.theme;
  assert.equal(t.neutral900, '#0F172A'); // Slate-900
  assert.equal(t.neutral800, '#1E293B'); // Slate-800
  assert.equal(t.neutral700, '#334155'); // Slate-700
  assert.equal(t.neutral500, '#64748B'); // Slate-500
  assert.equal(t.accent500, '#F59E0B'); // Amber-500
  assert.equal(t.accent600, '#D97706'); // Amber-600
  assert.match(LMS_CONFIG.fonts.heading, /Zilla Slab/);
  assert.match(LMS_CONFIG.fonts.body, /Poppins/);
});

test('every sandbox account shown on sign-in actually signs in', async () => {
  const { accounts, password, prefillEmail } = LMS_CONFIG.sandbox;
  assert.ok(accounts.includes(prefillEmail), 'prefillEmail must be one of the listed accounts');
  const api = createApi(() => null);
  const roles = [];
  for (const email of accounts) {
    const { profile } = await api.signIn(email, password);
    assert.equal(profile.email, email);
    roles.push(profile.role);
  }
  assert.deepEqual(roles.sort(), ['admin', 'instructor', 'student']);
});
