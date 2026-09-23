/* ============================================================================
   MOCK SEED DATA
   Stands in for what the real backend holds: Cognito users (with the
   `custom:role` attribute) and published COURSE# items. Lives with the mock
   api, not in lms.config.js, because it is backend data, not org config.
   ============================================================================ */

// Cognito stand-in. Keyed by email; the password check happens in signIn().
// The sandbox accounts listed in lms.config.js must match these.
export const seedUsers = {
  'student@demo.test': {
    sub: 'u-student-001',
    email: 'student@demo.test',
    name: 'Jordan Avery',
    role: 'student',
    password: 'demo',
  },
  'instructor@demo.test': {
    sub: 'u-instr-001',
    email: 'instructor@demo.test',
    name: 'Sam Rivera',
    role: 'instructor',
    password: 'demo',
  },
  'admin@demo.test': {
    sub: 'u-admin-001',
    email: 'admin@demo.test',
    name: 'Pat Morgan',
    role: 'admin',
    password: 'demo',
  },
};

// COURSE# items. scormLaunch would be an S3 URL to imsmanifest's launch file.
export const seedCourses = [
  {
    courseId: 'c-eop-pwc',
    title: 'PWC Emergency Operations Plan: New Team Member Training',
    subtitle: 'Self-paced - 16 lessons - contact hour certificate',
    description:
      'Onboarding for new team members on the Prince William County Emergency ' +
      'Operations Plan: organization, activation, concept of operations, and ' +
      'assignment of responsibilities. Built in Articulate Rise360.',
    status: 'published',
    type: 'scorm',
    scormVersion: '1.2',
    scormLaunch: 'MOCK', // real build: https://<bucket>/eop-pwc/content-3/index.html
    durationMin: 45,
    certTemplate: 'ct-contact-hour',
    passingScore: 80,
  },
  {
    courseId: 'c-msg-101',
    title: 'Effective Message Writing',
    subtitle: 'Self-paced - approx. 20 min - contact hour certificate',
    description:
      'Turn alerts and warnings into clear, actionable public messaging. ' +
      'Built from your plans and processes, designed for retention, not fluff.',
    status: 'published',
    type: 'scorm',
    scormVersion: '1.2',
    scormLaunch: 'MOCK', // real build: https://<bucket>/<prefix>/index_lms.html
    durationMin: 20,
    certTemplate: 'ct-contact-hour',
    passingScore: 80,
  },
];
