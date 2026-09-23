// Browser tests: the single-SCO student path, the Sprint 2 grading and
// gating loop across student and instructor, instructor scope, rubric
// editing, and a phone-width sign-in.
// Run with: npm run e2e (dev server) or npm run e2e:prod (build).
//
// Selector rule (playbook 10.6): Playwright's text= is a case-insensitive
// substring match, so every state assertion uses an exact :text-is() or a
// role-scoped locator. innerText honors text-transform, so text reads are
// lowercased before comparing.
//
// The mock store lives in page memory, so each test runs in one page load
// and switches users by signing out and in.

import { test, expect } from '@playwright/test';

const bodyText = async (page) => (await page.locator('body').innerText()).toLowerCase();

async function signIn(page, email) {
  await page.locator('input:not([type=password])').fill(email);
  await page.locator('input[type=password]').fill('demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('h1:text-is("Available training")')).toBeVisible();
}
async function signOut(page) {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
}
const courseCard = (page, title) =>
  page.locator('div', { has: page.locator('h3', { hasText: title }) }).filter({ has: page.locator('button') }).last();
const itemRow = (page, itemId) => page.getByTestId(`item-${itemId}`);
const tab = (page, name) => page.locator('nav button', { hasText: name });

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
const expectClean = (watch) => {
  expect(watch.errors).toEqual([]);
  expect(watch.failed).toEqual([]);
};

test('single-SCO course: enroll, resume, complete, certificate, transcript', async ({ page }) => {
  const watch = watchErrors(page);
  await page.goto('/');

  // Sign-in card, driven by lms.config.js
  await expect(page).toHaveTitle('TLC_TRNG Learning Platform');
  let t = await bodyText(page);
  expect(t).toContain('learning platform - sandbox - v0.3');
  expect(t).toContain('student@demo.test - instructor@demo.test - admin@demo.test');
  await page.locator('input[type=password]').fill('nope');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator(':text-is("Incorrect email or password.")')).toBeVisible();

  await signIn(page, 'student@demo.test');
  await expect(page.locator(':text-is("Not enrolled")')).toHaveCount(2);
  await expect(tab(page, 'Teaching')).toHaveCount(0);

  const card = courseCard(page, 'PWC Emergency Operations Plan');
  await card.getByRole('button', { name: 'Enroll' }).click();
  await card.getByRole('button', { name: 'Open course' }).click();

  // Course page: one item; start it and move to slide 3
  const row = itemRow(page, 'i-eop-pwc-scorm');
  await expect(row.locator(':text-is("Not started")')).toBeVisible();
  await row.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator(':text-is("Slide 1 of 10")')).toBeVisible();
  expect(await page.evaluate(() => typeof window.API?.LMSInitialize)).toBe('function');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator(':text-is("Slide 3 of 10")')).toBeVisible();

  // Leave (runtime torn down) and resume on slide 3
  await page.getByRole('button', { name: '← Back to course' }).click();
  await expect(row.locator(':text-is("In progress")')).toBeVisible();
  expect(await page.evaluate(() => window.API === undefined)).toBe(true);
  await row.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator(':text-is("Slide 3 of 10")')).toBeVisible();

  // Finish: the course page shows completion and the certificate
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.locator('h2:text-is("Course complete")')).toBeVisible();
  await expect(page.locator('text=Email sent')).toBeVisible();
  t = await bodyText(page);
  expect(t).toContain('certificate of completion');
  expect(t).toContain('jordan avery');
  expect(t).toContain('score of 92');
  expect(t).toMatch(/credential id [0-9a-hjkmnp-tv-z]{4}-[0-9a-hjkmnp-tv-z]{4}-[0-9a-hjkmnp-tv-z]{4}/);
  await expect(page.getByTestId('progress-summary')).toHaveText('1 of 1 required complete');

  // Transcript
  await tab(page, 'Transcript').click();
  await expect(page.locator('h1:text-is("Transcript")')).toBeVisible();
  t = await bodyText(page);
  expect(t).toContain('pwc emergency operations plan');
  await expect(page.locator(':text-is("92")')).toBeVisible();
  expectClean(watch);
});

test('grading and gating: submit, return with feedback, resubmit, approve, unlock, certify', async ({ page }) => {
  const watch = watchErrors(page);
  await page.goto('/');
  const C = 'Effective Message Writing';
  const openMsgCourse = async () => {
    await courseCard(page, C).getByRole('button', { name: /Open course|Review/ }).click();
    await expect(page.locator(`h1:text-is("${C}")`)).toBeVisible();
  };

  // --- Student: lessons, then the assignment unlocks; the check stays locked
  await signIn(page, 'student@demo.test');
  await courseCard(page, C).getByRole('button', { name: 'Enroll' }).click();
  await openMsgCourse();
  await expect(itemRow(page, 'i-msg-101-draft').locator(':text-is("Locked")')).toBeVisible();
  await expect(itemRow(page, 'i-msg-101-check')).toContainText('Unlocks when your instructor approves "Draft an alert message".');
  await itemRow(page, 'i-msg-101-lessons').getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(itemRow(page, 'i-msg-101-lessons').locator(':text-is("Complete")')).toBeVisible();
  await expect(itemRow(page, 'i-msg-101-draft').locator(':text-is("Not started")')).toBeVisible();
  await expect(itemRow(page, 'i-msg-101-check').locator(':text-is("Locked")')).toBeVisible();

  // Submit the draft with a file and a note; the rubric is visible to the learner
  await itemRow(page, 'i-msg-101-draft').getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('h3:text-is("How this is evaluated")')).toBeVisible();
  await page.getByLabel('Files').setInputFiles({ name: 'alert-v1.pdf', mimeType: 'application/pdf', buffer: Buffer.from('draft one') });
  await page.getByLabel('Note to your instructor').fill('First try.');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByTestId('attempt-1')).toBeVisible();
  await expect(page.locator(':text-is("Awaiting review")').first()).toBeVisible();
  await page.getByRole('button', { name: '← Back to course' }).click();
  await expect(itemRow(page, 'i-msg-101-check').locator(':text-is("Locked")')).toBeVisible();
  await signOut(page);

  // --- Instructor: Teaching shows only their course; return the draft
  await signIn(page, 'instructor@demo.test');
  await tab(page, 'Teaching').click();
  await expect(page.locator('h3', { hasText: 'Effective Message Writing' })).toBeVisible();
  await expect(page.locator('h3', { hasText: 'PWC Emergency Operations Plan' })).toHaveCount(0);
  await expect(page.locator(':text-is("1 awaiting review")')).toBeVisible();
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('td:text-is("Jordan Avery")')).toBeVisible();
  await page.getByRole('button', { name: 'Review' }).click();
  await expect(page.locator('h1:text-is("Jordan Avery")')).toBeVisible();
  await expect(page.getByRole('button', { name: '📎 alert-v1.pdf' })).toBeVisible();
  await page.getByLabel('Five elements: Competent').check();
  await page.getByLabel('Leads with the protective action: Approaching Competency').check();
  await page.getByLabel('Plain language: Competent').check();
  // The overall outcome is prefilled with the lowest rating
  await expect(page.getByLabel('Overall outcome')).toHaveValue('approaching');
  await page.getByRole('button', { name: 'Record evaluation' }).click();
  await expect(page.getByRole('alert')).toHaveText('Add comments explaining what to revise.');
  await page.getByLabel('Comments to the learner').fill('Lead with the protective action.');
  await page.getByRole('button', { name: 'Record evaluation' }).click();
  await expect(page.locator('h1:text-is("Evaluation recorded")')).toBeVisible();
  expect(await bodyText(page)).toContain('returned: jordan avery can revise and resubmit');
  await page.getByRole('button', { name: 'Back to grading queue' }).click();
  await expect(page.locator(':text-is("Nothing awaiting review.")')).toBeVisible();
  await signOut(page);

  // --- Student: sees the feedback and resubmits
  await signIn(page, 'student@demo.test');
  await openMsgCourse();
  await expect(itemRow(page, 'i-msg-101-draft').locator(':text-is("Returned: revise")')).toBeVisible();
  await itemRow(page, 'i-msg-101-draft').getByRole('button', { name: 'Revise and resubmit' }).click();
  const first = page.getByTestId('attempt-1');
  await expect(first).toContainText('Approaching Competency');
  await expect(first).toContainText('Lead with the protective action.');
  await expect(first).toContainText('Sam Rivera');
  await page.getByLabel('Files').setInputFiles({ name: 'alert-v2.pdf', mimeType: 'application/pdf', buffer: Buffer.from('draft two') });
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByTestId('attempt-2')).toBeVisible();
  await signOut(page);

  // --- Instructor: approves attempt 2 (Competent passes)
  await signIn(page, 'instructor@demo.test');
  await tab(page, 'Teaching').click();
  await page.getByRole('button', { name: 'Open' }).click();
  await page.getByRole('button', { name: 'Review' }).click();
  await expect(page.locator('h3:text-is("Earlier attempts")')).toBeVisible();
  for (const c of ['Five elements', 'Leads with the protective action', 'Plain language']) {
    await page.getByLabel(`${c}: Competent`).check();
  }
  await expect(page.getByLabel('Overall outcome')).toHaveValue('competent');
  await page.getByRole('button', { name: 'Record evaluation' }).click();
  await expect(page.locator('h1:text-is("Evaluation recorded")')).toBeVisible();
  expect(await bodyText(page)).toContain('approved: jordan avery');
  await page.getByRole('button', { name: 'Back to grading queue' }).click();
  await page.getByRole('tab', { name: 'Roster' }).click();
  await expect(page.locator(':text-is("2 of 3 required")')).toBeVisible();
  await signOut(page);

  // --- Student: the knowledge check is unlocked; finishing it completes the course
  await signIn(page, 'student@demo.test');
  await openMsgCourse();
  await expect(itemRow(page, 'i-msg-101-draft').locator(':text-is("Complete")')).toBeVisible();
  await itemRow(page, 'i-msg-101-check').getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.locator('h2:text-is("Course complete")')).toBeVisible();
  const t = await bodyText(page);
  expect(t).toContain('score of 92');
  expect(t).toContain('jordan avery');
  await expect(page.getByTestId('progress-summary')).toHaveText('3 of 3 required complete');
  expectClean(watch);
});

test('instructor scope and rubric editing; admins see every course', async ({ page }) => {
  const watch = watchErrors(page);
  await page.goto('/');

  // The instructor takes a course they do not teach, as a learner
  await signIn(page, 'instructor@demo.test');
  await expect(page.locator(':text-is("Not enrolled")')).toHaveCount(2);
  await courseCard(page, 'PWC Emergency Operations Plan').getByRole('button', { name: 'Enroll' }).click();
  await expect(courseCard(page, 'PWC Emergency Operations Plan').locator(':text-is("Enrolled")')).toBeVisible();

  // ...and edits the rubric of the course they do teach
  await tab(page, 'Teaching').click();
  await expect(page.getByRole('button', { name: 'Open' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Open' }).click();
  await page.getByRole('tab', { name: 'Rubrics' }).click();
  await expect(page.getByTestId('rubric-criterion')).toHaveCount(3);
  await page.getByLabel('Rubric title').fill('Alert message rubric');
  await page.getByRole('button', { name: 'Add criterion' }).click();
  await page.getByLabel('Criterion 4 title').fill('Timing');
  await page.getByLabel('Criterion 4 Competent').fill('Says when to act.');
  await page.getByRole('button', { name: 'Save rubric' }).click();
  await expect(page.locator(':text-is("Saved.")')).toBeVisible();
  await expect(page.getByTestId('rubric-criterion')).toHaveCount(4);
  await signOut(page);

  // Admin: every course in Teaching, including the instructor's enrollment
  await signIn(page, 'admin@demo.test');
  await tab(page, 'Teaching').click();
  await expect(page.getByRole('button', { name: 'Open' })).toHaveCount(2);
  await page.locator('div', { has: page.locator('h3', { hasText: 'PWC Emergency Operations Plan' }) })
    .filter({ has: page.locator('button') }).last().getByRole('button', { name: 'Open' }).click();
  await page.getByRole('tab', { name: 'Roster' }).click();
  await expect(page.locator(':text-is("Sam Rivera")')).toBeVisible();
  expectClean(watch);
});

test('sign-in fits a phone viewport without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
