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

// ITEM# records: the ordered content items of each course (COURSE#<id> /
// ITEM#<itemId>). Every item carries:
//   order     position in the course (the learner sees items in this order)
//   required  whether the item must be complete for the course to complete
//   unlock    per-item gating rule (playbook Section 4, Sprint 2):
//               'open'            always available
//               'after_previous'  once the previous item is done (a SCORM
//                                 item completed, or an assignment submitted)
//               'after_approval'  once the previous item is approved (a SCORM
//                                 item completed, or an assignment evaluated
//                                 at a passing evaluation level)
//   dueDays   days after enrollment the item is due (self-paced); null = none
// SCORM items: scoId is the SCO's identifier from imsmanifest.xml (CMI is
// stored per SCO, CMI#<courseId>#<scoId>); assessment: true marks a quiz or
// test, the only items that record a numeric score.
// Assignment items are forms (playbook Section 8.3):
//   instructions  what the learner is asked to do, shown above the fields
//   fields        the questions the learner answers, in order. Each field:
//                   fieldId, label, prompt (optional guidance), required,
//                   type 'text' (a written answer) or 'file' (one or more
//                   uploads plus an optional comment to the instructor),
//                   criteria: the field's rubric, zero or more criteria, each
//                   with a descriptor per level of the evaluation scale in
//                   lms.config.js. A field with no criteria is not rated on
//                   its own; the overall outcome still applies.
// Admins and the course's instructors edit all of this in the app
// (Teaching > course > Assignments).
export const seedItems = [
  {
    courseId: 'c-eop-pwc',
    itemId: 'i-eop-pwc-scorm',
    type: 'scorm',
    title: 'PWC EOP: New Team Member Training',
    order: 1,
    required: true,
    unlock: 'open',
    dueDays: null,
    scoId: 'sco-main',
    assessment: true, // the package ends in the Course Quiz
    launchPath: 'MOCK', // real build: S3 key of the launch file, e.g. eop-pwc/scormdriver/indexAPI.html
  },
  {
    courseId: 'c-msg-101',
    itemId: 'i-msg-101-lessons',
    type: 'scorm',
    title: 'Lessons: Effective Message Writing',
    order: 1,
    required: true,
    unlock: 'open',
    dueDays: 7,
    scoId: 'sco-main',
    assessment: false,
    launchPath: 'MOCK',
  },
  {
    courseId: 'c-msg-101',
    itemId: 'i-msg-101-draft',
    type: 'assignment',
    title: 'Draft an alert message',
    order: 2,
    required: true,
    unlock: 'after_previous',
    dueDays: 14,
    instructions:
      'Sandbox sample assignment. Write a public alert message for a flash flood ' +
      'warning in your jurisdiction, using the five elements from the lessons: ' +
      'source, hazard, location, protective action, and time. Answer each field ' +
      'below. Open "How this is evaluated" under a field to see what your ' +
      'instructor looks for.',
    fields: [
      {
        fieldId: 'f-message',
        label: 'Your alert message',
        prompt: 'Type the message exactly as the public would receive it.',
        type: 'text',
        required: true,
        criteria: [
          {
            criterionId: 'crit-elements',
            title: 'Five elements',
            description: 'Source, hazard, location, protective action, and time are all present.',
            levels: {
              advanced: 'All five elements, each specific and unambiguous.',
              competent: 'All five elements present.',
              approaching: 'One element missing or vague.',
              additional_learning: 'Two or more elements missing.',
            },
          },
          {
            criterionId: 'crit-action',
            title: 'Leads with the protective action',
            description: 'The reader knows what to do from the first sentence.',
            levels: {
              advanced: 'Action first, specific, and achievable.',
              competent: 'Action appears early and is clear.',
              approaching: 'Action present but buried or unclear.',
              additional_learning: 'No clear protective action.',
            },
          },
        ],
      },
      {
        fieldId: 'f-formatted',
        label: 'Formatted for your alerting system',
        prompt:
          'Upload the message as it would go out (for example a screenshot of your alerting ' +
          'tool or a Word document). Use the comments box to explain your choices.',
        type: 'file',
        required: true,
        criteria: [
          {
            criterionId: 'crit-plain',
            title: 'Plain language',
            description: 'No jargon, acronyms, or agency-internal terms.',
            levels: {
              advanced: 'Reads clearly for any member of the public.',
              competent: 'Mostly plain; minor jargon.',
              approaching: 'Jargon gets in the way of meaning.',
              additional_learning: 'Written for responders, not the public.',
            },
          },
        ],
      },
    ],
  },
  {
    courseId: 'c-msg-101',
    itemId: 'i-msg-101-check',
    type: 'scorm',
    title: 'Knowledge check',
    order: 3,
    required: true,
    unlock: 'after_approval',
    dueDays: 21,
    scoId: 'sco-check',
    assessment: true,
    launchPath: 'MOCK',
  },
];

// TEACH# records: which instructors are assigned to which courses
// (USER#<sub> / TEACH#<courseId>). An instructor gets the instructor view of
// exactly these courses and the student view of everything else. Admins get
// the instructor view of every course without an assignment.
export const seedTeaching = [
  { sub: 'u-instr-001', courseId: 'c-msg-101' },
];
