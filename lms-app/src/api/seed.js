/* ============================================================================
   MOCK SEED DATA
   Stands in for what the real backend holds: Cognito users (with the
   `custom:role` attribute), COURSE# items, and their ITEM# content items.
   makeStore() (mockStore.js) loads the courses and items into the table and
   mirrors each user as a USER#/PROFILE item. Lives with the mock api, not
   in lms.config.js, because it is backend data, not org config.
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
//
// Credential policy, per course (playbook Section 4):
//   certificateEnabled  false = completion is recorded but no certificate is
//                       issued or emailed (the scoping doc's "turn off
//                       certificates for a course")
//   credential.criteria        what the learner did to earn it (Open Badges criteria)
//   credential.skills          skills or competencies it recognizes
//   credential.validityMonths  months until it expires; null = no expiry
// The criteria, skills, and validity below are PLACEHOLDER language pending
// the real course policies. Search for "PLACEHOLDER" to find them.
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
    certificateEnabled: true,
    credential: {
      criteria:
        'PLACEHOLDER: Completed all required lessons of PWC Emergency Operations Plan: New Team Member Training and ' +
        'passed the course assessment with a score of 80 or higher.',
      skills: ['PLACEHOLDER: skill or competency this course recognizes'],
      validityMonths: null, // PLACEHOLDER: no expiry until a recertification policy is set
    },
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
    certificateEnabled: true,
    credential: {
      criteria:
        'PLACEHOLDER: Completed all required lessons of Effective Message Writing and ' +
        'passed the course assessment with a score of 80 or higher.',
      skills: ['PLACEHOLDER: skill or competency this course recognizes'],
      validityMonths: null, // PLACEHOLDER: no expiry until a recertification policy is set
    },
  },
];

// ITEM# records: the content items attached to each course (COURSE#<id> /
// ITEM#<itemId>). Each Sprint 0 course is one SCORM package with one SCO,
// which is how Rise360 exports. scoId is the SCO's identifier from
// imsmanifest.xml; CMI is stored per SCO (CMI#<courseId>#<scoId>).
export const seedItems = [
  {
    courseId: 'c-eop-pwc',
    itemId: 'i-eop-pwc-scorm',
    type: 'scorm',
    title: 'PWC EOP: New Team Member Training (SCORM 1.2)',
    order: 1,
    scoId: 'sco-main',
    launchPath: 'MOCK', // real build: S3 key of the launch file, e.g. eop-pwc/scormdriver/indexAPI.html
  },
  {
    courseId: 'c-msg-101',
    itemId: 'i-msg-101-scorm',
    type: 'scorm',
    title: 'Effective Message Writing (SCORM 1.2)',
    order: 1,
    scoId: 'sco-main',
    launchPath: 'MOCK',
  },
];
