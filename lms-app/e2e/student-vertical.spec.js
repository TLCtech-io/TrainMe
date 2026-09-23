// Browser walkthrough of the full student vertical, plus role and layout
// checks. Run with: npm run e2e (dev server) or npm run e2e:prod (build).
//
// Selector rule (playbook 10.6): Playwright's text= is a case-insensitive
// substring match, so every state assertion uses an exact :text-is() or a
// role-scoped locator. innerText honors text-transform, so text reads are
// lowercased before comparing.

import { test, expect } from '@playwright/test';

const bodyText = async (page) => (await page.locator('body').innerText()).toLowerCase();

async function signIn(page, email) {
  await page.locator('input:not([type=password])').fill(email);
  await page.locator('input[type=password]').fill('demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('h1:text-is("Available training")')).toBeVisible();
}

// Collect console errors and failed requests. Google Fonts is the one
// allowed failure: cloud sandboxes block it for headless Chromium (10.5).
function watchErrors(page) {
  const errors = [];
  const failed = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  page.on('requestfailed', (r) => {
    if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(r.url())) failed.push(r.url());
  });
  page.on('dialog', (d) => d.dismiss());
  return { errors, failed };
}

test('student vertical: sign in, enroll, resume, complete, certificate, review, transcript', async ({ page }) => {
  const watch = watchErrors(page);
  await page.goto('/');

  // Sign-in card, driven by lms.config.js
  await expect(page).toHaveTitle('TLC_TRNG Learning Platform');
  let t = await bodyText(page);
  expect(t).toContain('learning platform - sandbox - v0.2');
  expect(t).toContain('student@demo.test - instructor@demo.test - admin@demo.test');

  // Wrong password
  await page.locator('input[type=password]').fill('nope');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator(':text-is("Incorrect email or password.")')).toBeVisible();

  // Student (email is prefilled with sandboxHints on)
  await signIn(page, 'student@demo.test');
  t = await bodyText(page);
  expect(t).toContain('jordan avery');
  await expect(page.locator('nav button', { hasText: 'Transcript' })).toBeVisible();
  await expect(page.locator(':text-is("Not enrolled")')).toHaveCount(2);

  // Enroll in Effective Message Writing
  const card = page
    .locator('div', { has: page.locator('h3', { hasText: 'Effective Message Writing' }) })
    .filter({ has: page.locator('button') })
    .last();
  await card.getByRole('button', { name: 'Enroll' }).click();
  await expect(card.locator(':text-is("Enrolled")')).toBeVisible();

  // Open and move to slide 3; the SCORM runtime is on window.API
  await card.getByRole('button', { name: 'Open course' }).click();
  await expect(page.locator(':text-is("Slide 1 of 4")')).toBeVisible();
  expect(await page.evaluate(() => typeof window.API?.LMSInitialize)).toBe('function');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator(':text-is("Slide 2 of 4")')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator(':text-is("Slide 3 of 4")')).toBeVisible();

  // Leave (runtime torn down) and reopen: resumes on slide 3
  await page.getByRole('button', { name: '← Back to catalog' }).click();
  await expect(card.locator(':text-is("In progress")')).toBeVisible();
  expect(await page.evaluate(() => window.API === undefined)).toBe(true);
  await card.getByRole('button', { name: 'Open course' }).click();
  await expect(page.locator(':text-is("Slide 3 of 4")')).toBeVisible();

  // Complete: certificate from the session identity, SES stand-in notice
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.locator('h2:text-is("Course complete")')).toBeVisible();
  await expect(page.locator('text=Email sent')).toBeVisible();
  t = await bodyText(page);
  expect(t).toContain('certificate of completion');
  expect(t).toContain('jordan avery');
  expect(t).toContain('score of 92');
  expect(t).toContain('to student@demo.test');

  // Review path: re-shows the existing certificate, no hang (10.2)
  await page.getByRole('button', { name: 'Back to catalog', exact: true }).click();
  await expect(card.locator(':text-is("Completed")')).toBeVisible();
  await card.getByRole('button', { name: 'Review' }).click();
  await page.getByRole('button', { name: 'Re-issue certificate' }).click();
  await expect(page.locator('h2:text-is("Course complete")')).toBeVisible();

  // Transcript: one row, completed, score 92
  await page.getByRole('button', { name: '← Back to catalog' }).click();
  await page.locator('nav button', { hasText: 'Transcript' }).click();
  await expect(page.locator('h1:text-is("Transcript")')).toBeVisible();
  t = await bodyText(page);
  expect(t).toContain('jordan avery - completed and in-progress courses');
  expect(t).toContain('effective message writing');
  await expect(page.locator(':text-is("92")')).toBeVisible();

  expect(watch.errors).toEqual([]);
  expect(watch.failed).toEqual([]);
});

test('instructor sees the catalog only, and none of a student\'s records', async ({ page }) => {
  const watch = watchErrors(page);
  await page.goto('/');

  // A student enrolls first, in the same app session
  await signIn(page, 'student@demo.test');
  await page.getByRole('button', { name: 'Enroll' }).first().click();
  await expect(page.locator(':text-is("Enrolled")')).toHaveCount(1);
  await page.getByRole('button', { name: 'Sign out' }).click();

  await signIn(page, 'instructor@demo.test');
  const t = await bodyText(page);
  expect(t).toContain('sam rivera');
  expect(t).toContain('instructor');
  await expect(page.locator('nav button', { hasText: 'Transcript' })).toHaveCount(0);
  await expect(page.locator(':text-is("Not enrolled")')).toHaveCount(2);

  expect(watch.errors).toEqual([]);
  expect(watch.failed).toEqual([]);
});

test('sign-in fits a phone viewport without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
