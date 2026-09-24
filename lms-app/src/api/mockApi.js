/* ============================================================================
   MOCK API: THE BACKEND CONTRACT
   Every data operation goes through the object makeApi() returns. Its method
   SIGNATURES are the contract the real backend must satisfy; the route each
   method becomes is noted above it. To go live (Sprint 4), each method body
   becomes a fetch() to the corresponding Lambda endpoint with the JWT in the
   Authorization header. Components never change.

   Rules live here, not in components: gating, submission lifecycle,
   assignment forms and rubric validation, instructor authorization, and
   course completion are enforced by the api, exactly as the Lambdas will
   enforce them server-side. The UI only reflects what the api reports.

   When you add a feature, add its method here first, with the signature the
   backend will honor, then implement the mock body, then add it to
   API_CONTRACT in ./index.js (the contract test enforces the list).
   ============================================================================ */

import LMS_CONFIG from '../lms.config.js';
import { seedUsers } from './seed.js';
import { keys, stripKeys } from './mockStore.js';
import { newCredentialId } from './credentialId.js';

const LEVELS = LMS_CONFIG.evaluation.levels;
const levelById = (id) => LEVELS.find((l) => l.id === id);
const DAY_MS = 24 * 60 * 60 * 1000;

// issuedAt plus a whole number of months, as an ISO string (UTC).
function addMonths(iso, months) {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

const randomToken = () => {
  const b = new Uint8Array(8);
  globalThis.crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
};

export function makeApi(store, rawGetSession) {
  const { table } = store;
  const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));
  const urlCache = new Map(); // fileKey -> object URL (mock only)

  // Normalize the session so callers can read `sub`, `profile`, and `token`
  // uniformly. The raw session is { token, profile }; profile carries the
  // sub. This flattening is why no call site has to know that shape, and it
  // mirrors the real backend, where `sub` comes from the verified JWT.
  // (Playbook 10.2: the caller's identity comes from the session, never a
  // table scan. Another user's identity is a keyed get of USER#<sub>/PROFILE.)
  const getSession = () => {
    const s = rawGetSession() || {};
    return { token: s.token, profile: s.profile, sub: s.profile?.sub, role: s.profile?.role };
  };

  const profileOf = (sub) => stripKeys(table.get(keys.user(sub), keys.profile()));

  function courseOrThrow(courseId) {
    const course = stripKeys(table.get(keys.course(courseId), keys.meta()));
    if (!course) throw new Error('Course not found.');
    return course;
  }

  const itemsOf = (courseId) =>
    table.query(keys.course(courseId), 'ITEM#').map(stripKeys).sort((a, b) => a.order - b.order);

  function itemOrThrow(courseId, itemId) {
    const item = stripKeys(table.get(keys.course(courseId), keys.item(itemId)));
    if (!item) throw new Error('Course item not found.');
    return item;
  }

  function enrollmentOrThrow(sub, courseId) {
    const enr = table.get(keys.user(sub), keys.enroll(courseId));
    if (!enr) throw new Error('Not enrolled in this course.');
    return enr;
  }

  // Instructor authorization (the Lambda authorizer plus a keyed check):
  // admins may act on any course; instructors only on courses they are
  // assigned to (USER#<sub>/TEACH#<courseId>). Everyone else is refused.
  function requireTeacher(courseId) {
    const { sub, role } = getSession();
    if (role === 'admin') return;
    if (role === 'instructor' && table.get(keys.user(sub), keys.teach(courseId))) return;
    throw new Error('Not authorized for this course.');
  }
  function isTeacher(courseId) {
    try {
      requireTeacher(courseId);
      return true;
    } catch {
      return false;
    }
  }

  // The SCO a CMI call addresses. Callers may omit scoId: the default is the
  // course's first SCORM item (lowest order). Query COURSE#<id> / ITEM#.
  function resolveScoId(courseId, scoId) {
    if (scoId) return scoId;
    const sco = itemsOf(courseId).find((i) => i.type === 'scorm');
    if (!sco) throw new Error(`Course ${courseId} has no SCORM item.`);
    return sco.scoId;
  }

  function sendEmail(to, subject, extra = {}) {
    store.outbox.push({ to, subject, sentAt: new Date().toISOString(), ...extra });
  }

  /* --------------------------------------------------------------------------
     PROGRESS AND GATING
     One function computes every item's state for one learner, so the course
     page, the gate checks, the roster, and completion all agree.

     Item status: locked | available | in_progress (SCORM started) |
     submitted (awaiting review) | returned (resubmit) | complete.
     "done" opens an 'after_previous' gate (SCORM completed, or an assignment
     submitted at least once); "approved" opens an 'after_approval' gate
     (SCORM completed, or an assignment evaluated at a passing level).
     -------------------------------------------------------------------------- */
  function progressFor(sub, courseId) {
    const course = courseOrThrow(courseId);
    const enr = table.get(keys.user(sub), keys.enroll(courseId));
    const now = Date.now();
    let prev = null;

    const items = itemsOf(courseId).map((item, idx) => {
      let status = 'available';
      let done = false;
      let approved = false;
      let latestSubmission = null;
      let attempts = 0;
      let score = null;

      if (item.type === 'scorm') {
        const rec = table.get(keys.user(sub), keys.cmi(courseId, item.scoId));
        const ls = rec?.cmi?.['cmi.core.lesson_status'];
        const complete = ls === 'completed' || ls === 'passed';
        status = complete ? 'complete' : rec ? 'in_progress' : 'available';
        done = approved = complete;
        const raw = rec?.cmi?.['cmi.core.score.raw'];
        if (item.assessment && complete && raw !== undefined && raw !== '') score = Number(raw);
      } else if (item.type === 'assignment') {
        const subs = table.query(keys.user(sub), keys.submissions(courseId, item.itemId)).map(stripKeys);
        attempts = subs.length;
        latestSubmission = subs[subs.length - 1] || null;
        status = !latestSubmission
          ? 'available'
          : latestSubmission.status === 'approved'
          ? 'complete'
          : latestSubmission.status === 'returned'
          ? 'returned'
          : 'submitted';
        done = attempts > 0;
        approved = status === 'complete';
      }

      const unlocked =
        idx === 0 ||
        item.unlock === 'open' ||
        (item.unlock === 'after_approval' ? prev.approved : prev.done);
      if (!unlocked && status === 'available') status = 'locked';

      const dueAt =
        enr && item.dueDays != null ? new Date(Date.parse(enr.enrolledAt) + item.dueDays * DAY_MS).toISOString() : null;
      const overdue = !!dueAt && now > Date.parse(dueAt) && !['complete', 'submitted'].includes(status);

      prev = { done, approved };
      return { ...item, state: { status, locked: !unlocked, dueAt, overdue, attempts, latestSubmission, score } };
    });

    const required = items.filter((i) => i.required !== false);
    const allRequiredComplete = required.every((i) => i.state.status === 'complete');
    // Course score: the last required assessment (quiz or test) with a score.
    const scored = required.filter((i) => i.type === 'scorm' && i.assessment && i.state.score != null);
    const score = scored.length ? scored[scored.length - 1].state.score : null;

    return {
      course,
      enrollment: enr ? stripKeys(enr) : null,
      items,
      summary: {
        required: required.length,
        complete: required.filter((i) => i.state.status === 'complete').length,
        allRequiredComplete,
      },
      score,
    };
  }

  function markActive(sub, courseId) {
    const enr = table.get(keys.user(sub), keys.enroll(courseId));
    if (enr && enr.status === 'enrolled') table.put({ ...enr, status: 'in_progress' });
  }

  // Completes the course (and issues the certificate) the moment every
  // required item is complete. Called after any learner commit and after any
  // passing evaluation. Returns what the COMPLETE+CERTIFY Lambda returns.
  function completeIfDone(sub, courseId) {
    const enr = table.get(keys.user(sub), keys.enroll(courseId));
    if (!enr || enr.status === 'completed') return { completed: false, certificate: null };
    const p = progressFor(sub, courseId);
    if (!p.summary.allRequiredComplete) return { completed: false, certificate: null };
    table.put({ ...enr, status: 'completed', completedAt: new Date().toISOString(), score: p.score });
    const certificate = p.course.certificateEnabled === false ? null : issueCertificate(sub, p.course, p.score);
    return { completed: true, certificate };
  }

  // Stands in for the COMPLETE+CERTIFY Lambda (PDF -> S3 -> SES). Internal:
  // not part of the contract; the backend issues certificates server-side.
  // The learner's name and email come from a keyed get of their profile
  // (USER#<sub>/PROFILE), because the trigger may be an instructor's
  // evaluation rather than the learner's own session. Never a scan.
  //
  // The record carries the Open Badges fields from day one (playbook
  // Section 4): a public credentialId, the issuer (snapshotted from
  // lms.config.js), the course's criteria and skills, an evidence URL slot,
  // and expiresAt from the course's validityMonths.
  function issueCertificate(sub, course, score) {
    const learner = profileOf(sub) || {};
    const learnerName = learner.name || 'Learner';
    const learnerEmail = learner.email || 'unknown@demo.test';
    const policy = course.credential || {};
    const issuedAt = new Date().toISOString();

    // Unique public ID: GSI3 lookup, regenerate on the (vanishing) chance of a clash
    let credentialId = newCredentialId();
    while (table.queryIndex('GSI3', keys.credential(credentialId)).length) credentialId = newCredentialId();

    const cert = {
      credentialId,
      sub,
      courseId: course.courseId,
      courseTitle: course.title,
      learnerName,
      score,
      issuer: { ...LMS_CONFIG.credentials.issuer },
      criteria: policy.criteria ?? null,
      skills: [...(policy.skills || [])],
      evidenceUrl: null, // e.g. an uploaded proof or graded submission, later sprints
      issuedAt,
      expiresAt: policy.validityMonths ? addMonths(issuedAt, policy.validityMonths) : null,
      s3Key: `certs/${sub}/${course.courseId}.pdf`, // where the real PDF lands
    };
    // USER#<sub> / CERT#<courseId>, findable by credential ID on GSI3
    table.put({
      PK: keys.user(sub), SK: keys.cert(course.courseId), entity: 'cert',
      GSI3PK: keys.credential(credentialId), GSI3SK: 'CERT',
      ...cert,
    });
    sendEmail(learnerEmail, `Your certificate: ${course.title}`, { kind: 'certificate', courseId: course.courseId, cert });
    return cert;
  }

  // Files a learner may attach: their own uploads for this course item.
  const uploadPrefix = (sub, courseId, itemId) => `uploads/${sub}/${courseId}/${itemId}/`;

  // Every rubric criterion of an assignment form, in field order.
  const criteriaOf = (fields = []) => fields.flatMap((f) => f.criteria || []);

  const FIELD_TYPES = ['text', 'file'];
  const TEXT_LIMIT = 20000;
  const COMMENT_LIMIT = 4000;
  const newId = (prefix) => `${prefix}-${randomToken().slice(0, 8)}`;

  // Cleans an assignment form from the editor into what is stored on the
  // ITEM#: ids assigned, text trimmed, one descriptor slot per level.
  function normalizeFields(fields) {
    const out = (fields || []).map((f) => ({
      fieldId: f.fieldId || newId('f'),
      label: String(f.label || '').trim(),
      prompt: String(f.prompt || '').trim(),
      type: f.type,
      required: f.required !== false,
      criteria: (f.criteria || []).map((c) => ({
        criterionId: c.criterionId || newId('crit'),
        title: String(c.title || '').trim(),
        description: String(c.description || '').trim(),
        levels: Object.fromEntries(LEVELS.map((l) => [l.id, String(c.levels?.[l.id] || '').trim()])),
      })),
    }));
    if (!out.length) throw new Error('Add at least one field.');
    for (const [i, f] of out.entries()) {
      if (!f.label) throw new Error(`Field ${i + 1} needs a label.`);
      if (!FIELD_TYPES.includes(f.type)) throw new Error(`Field ${i + 1} needs a type (text or file).`);
      if (f.criteria.some((c) => !c.title)) throw new Error(`Every criterion in "${f.label}" needs a title.`);
    }
    const ids = criteriaOf(out).map((c) => c.criterionId);
    if (new Set(ids).size !== ids.length || new Set(out.map((f) => f.fieldId)).size !== out.length) {
      throw new Error('Field and criterion ids must be unique.');
    }
    return out;
  }

  return {
    /* ======================================================================
       AUTH AND CATALOG
       ====================================================================== */

    // POST /auth/signin  ->  { token, profile }
    async signIn(email, password) {
      await delay();
      const u = seedUsers[email.toLowerCase().trim()];
      if (!u || u.password !== password) {
        throw new Error('Incorrect email or password.');
      }
      // Real build: Cognito returns IdToken; we cache the decoded profile.
      return {
        token: `mock-jwt-${u.sub}`,
        profile: { sub: u.sub, email: u.email, name: u.name, role: u.role },
      };
    },

    // GET /courses  ->  published catalog
    // Query GSI2: CATALOG#published / begins_with COURSE#
    async listCatalog() {
      await delay();
      return table.queryIndex('GSI2', keys.catalog('published'), 'COURSE#').map(stripKeys);
    },

    // GET /courses/{courseId}  ->  { course, items }  (the public outline)
    async getCourseOutline(courseId) {
      await delay(80);
      return { course: courseOrThrow(courseId), items: itemsOf(courseId) };
    },

    /* ======================================================================
       LEARNER
       ====================================================================== */

    // GET /me/enrollments  ->  this user's enrollments (transcript source)
    // Query USER#<sub> / begins_with ENROLL#
    async listEnrollments() {
      await delay();
      const { sub } = getSession();
      return table.query(keys.user(sub), 'ENROLL#').map(stripKeys);
    },

    // POST /me/enrollments { courseId }  ->  enrollment item
    // Put USER#<sub> / ENROLL#<courseId>, indexed on GSI1 for the roster.
    async enroll(courseId) {
      await delay();
      const { sub } = getSession();
      courseOrThrow(courseId);
      const existing = table.get(keys.user(sub), keys.enroll(courseId));
      if (existing) return stripKeys(existing);
      const item = {
        sub,
        courseId,
        status: 'enrolled', // enrolled -> in_progress -> completed
        enrolledAt: new Date().toISOString(),
        completedAt: null,
        score: null,
      };
      table.put({
        PK: keys.user(sub), SK: keys.enroll(courseId), entity: 'enrollment',
        GSI1PK: keys.course(courseId), GSI1SK: keys.enrollee(sub),
        ...item,
      });
      return item;
    },

    // GET /me/courses/{courseId}/progress
    //   ->  { course, enrollment, items[] with state, summary, score, certificate }
    // The learner's course page: every item with its status, lock, due date.
    async getCourseProgress(courseId) {
      await delay(120);
      const { sub } = getSession();
      const p = progressFor(sub, courseId);
      const certificate = stripKeys(table.get(keys.user(sub), keys.cert(courseId)));
      return { ...p, certificate };
    },

    // GET /me/cmi/{courseId}?sco={scoId}  ->  saved runtime bag (for resume)
    // Get USER#<sub> / CMI#<courseId>#<scoId>. scoId is optional; omitted, it
    // is the course's first SCORM item.
    async getCmi(courseId, scoId) {
      await delay(80);
      const { sub } = getSession();
      const rec = table.get(keys.user(sub), keys.cmi(courseId, resolveScoId(courseId, scoId)));
      return rec ? rec.cmi : null;
    },

    // PUT /me/cmi/{courseId}?sco={scoId}  { cmi }  ->  { completed, certificate }
    // Persists the runtime (the Commit path). Refused when the learner is not
    // enrolled or the SCO's item is locked. `completed` is true when this
    // commit completed the whole course (every required item), and then
    // `certificate` is the issued certificate (null if the course issues none).
    async commitCmi(courseId, cmiBag, scoId) {
      await delay(80);
      const { sub } = getSession();
      enrollmentOrThrow(sub, courseId);
      const sco = resolveScoId(courseId, scoId);
      const p = progressFor(sub, courseId);
      const item = p.items.find((i) => i.type === 'scorm' && i.scoId === sco);
      if (!item) throw new Error(`Unknown SCO ${sco} for course ${courseId}.`);
      if (item.state.locked) throw new Error('This item is locked.');

      table.put({
        PK: keys.user(sub), SK: keys.cmi(courseId, sco), entity: 'cmi',
        sub, courseId, scoId: sco, cmi: { ...cmiBag },
      });
      markActive(sub, courseId);
      return completeIfDone(sub, courseId);
    },

    // GET /me/certificates/{courseId}
    // Get USER#<sub> / CERT#<courseId>
    async getCertificate(courseId) {
      await delay(60);
      const { sub } = getSession();
      return stripKeys(table.get(keys.user(sub), keys.cert(courseId)));
    },

    // Upload one file for an assignment  ->  { fileKey, name, size, type }
    // Real build: POST /me/uploads { courseId, itemId, name, type, size }
    // returns a presigned S3 PUT URL; this method then PUTs the file to it.
    // The size limit is enforced when the URL is issued.
    async uploadFile(courseId, itemId, file) {
      await delay(150);
      const { sub } = getSession();
      enrollmentOrThrow(sub, courseId);
      if (itemOrThrow(courseId, itemId).type !== 'assignment') throw new Error('This item does not take uploads.');
      if (!file || typeof file.size !== 'number') throw new Error('No file.');
      if (file.size > LMS_CONFIG.uploads.maxBytes) {
        throw new Error(`File is too large (limit ${Math.round(LMS_CONFIG.uploads.maxBytes / 1048576)} MB).`);
      }
      const name = String(file.name || 'file').replace(/[\\/]/g, '_').slice(0, 200);
      const fileKey = `${uploadPrefix(sub, courseId, itemId)}${randomToken()}/${name}`;
      store.blobs.set(fileKey, file);
      return { fileKey, name, size: file.size, type: file.type || 'application/octet-stream' };
    },

    // GET /files?key={fileKey}  ->  URL to open the file
    // Real build: a short-lived presigned S3 GET URL. Allowed for the file's
    // owner and for anyone who teaches the course it was submitted to.
    async getFileUrl(fileKey) {
      await delay(60);
      const { sub } = getSession();
      const [root, owner, courseId] = String(fileKey).split('/');
      if (root !== 'uploads' || !courseId) throw new Error('File not found.');
      if (owner !== sub && !isTeacher(courseId)) throw new Error('Not authorized for this file.');
      const blob = store.blobs.get(fileKey);
      if (!blob) throw new Error('File not found.');
      if (!urlCache.has(fileKey)) urlCache.set(fileKey, URL.createObjectURL(blob));
      return urlCache.get(fileKey);
    },

    // POST /me/courses/{courseId}/items/{itemId}/submissions
    //   { responses: { [fieldId]: { text } | { files, comment } } }  ->  submission
    // One answer per field of the assignment form: a text field takes
    // { text }; a file field takes { files, comment } (files already
    // uploaded with uploadFile, comment optional). Required fields must be
    // answered. Allowed when the item is unlocked and not awaiting review
    // or approved (a returned item may be resubmitted). Each attempt is its
    // own record and keeps a snapshot of the form it answered, so later
    // edits to the assignment never change what was submitted or how it is
    // evaluated.
    async submitAssignment(courseId, itemId, { responses = {} } = {}) {
      await delay(150);
      const { sub } = getSession();
      enrollmentOrThrow(sub, courseId);
      const item = progressFor(sub, courseId).items.find((i) => i.itemId === itemId);
      if (!item) throw new Error('Course item not found.');
      if (item.type !== 'assignment') throw new Error('This item does not take submissions.');
      if (item.state.locked) throw new Error('This item is locked.');
      if (item.state.status === 'submitted') throw new Error('Your last submission is still awaiting review.');
      if (item.state.status === 'complete') throw new Error('This assignment is already approved.');

      const prefix = uploadPrefix(sub, courseId, itemId);
      const answers = {};
      for (const field of item.fields || []) {
        const r = responses[field.fieldId] || {};
        if (field.type === 'text') {
          const text = String(r.text || '').trim();
          if (text.length > TEXT_LIMIT) throw new Error(`"${field.label}" is too long (limit ${TEXT_LIMIT} characters).`);
          if (field.required && !text) throw new Error(`Answer "${field.label}".`);
          if (text) answers[field.fieldId] = { text };
        } else {
          const files = r.files || [];
          if (field.required && !files.length) throw new Error(`Attach a file for "${field.label}".`);
          if (files.length > LMS_CONFIG.uploads.maxFiles) {
            throw new Error(`Attach no more than ${LMS_CONFIG.uploads.maxFiles} files for "${field.label}".`);
          }
          for (const f of files) {
            if (!String(f.fileKey).startsWith(prefix) || !store.blobs.has(f.fileKey)) {
              throw new Error('A file was not uploaded for this assignment.');
            }
          }
          const comment = String(r.comment || '').trim().slice(0, COMMENT_LIMIT);
          if (files.length || comment) {
            answers[field.fieldId] = {
              files: files.map(({ fileKey, name, size, type }) => ({ fileKey, name, size, type })),
              comment,
            };
          }
        }
      }
      if (!Object.keys(answers).length) throw new Error('Answer at least one field.');

      const attempt = item.state.attempts + 1;
      const submittedAt = new Date().toISOString();
      const submission = {
        sub,
        courseId,
        itemId,
        attempt,
        responses: answers,
        form: { instructions: item.instructions || '', fields: item.fields || [] },
        status: 'submitted', // submitted -> approved | returned
        submittedAt,
        late: !!item.state.dueAt && Date.parse(submittedAt) > Date.parse(item.state.dueAt),
        evaluation: null,
      };
      table.put({
        PK: keys.user(sub), SK: keys.submission(courseId, itemId, attempt), entity: 'submission',
        GSI1PK: keys.course(courseId), GSI1SK: keys.queued(submittedAt, sub, itemId),
        ...submission,
      });
      markActive(sub, courseId);
      return submission;
    },

    // GET /me/courses/{courseId}/items/{itemId}/submissions  ->  attempts, oldest first
    // Query USER#<sub> / begins_with SUB#<courseId>#<itemId>#
    async listSubmissions(courseId, itemId) {
      await delay(80);
      const { sub } = getSession();
      return table.query(keys.user(sub), keys.submissions(courseId, itemId)).map(stripKeys);
    },

    /* ======================================================================
       INSTRUCTOR AND ADMIN
       Every method below starts with requireTeacher(courseId).
       ====================================================================== */

    // GET /teaching  ->  courses the caller may teach, with queue and roster counts
    // Admin: every published course (GSI2). Instructor: USER#<sub>/TEACH#.
    async listTeaching() {
      await delay();
      const { sub, role } = getSession();
      let courses = [];
      if (role === 'admin') {
        courses = table.queryIndex('GSI2', keys.catalog('published'), 'COURSE#').map(stripKeys);
      } else if (role === 'instructor') {
        courses = table
          .query(keys.user(sub), 'TEACH#')
          .map((t) => stripKeys(table.get(keys.course(t.courseId), keys.meta())))
          .filter(Boolean);
      }
      return courses.map((course) => ({
        ...course,
        pendingCount: table.queryIndex('GSI1', keys.course(course.courseId), 'QUEUE#').length,
        learnerCount: table.queryIndex('GSI1', keys.course(course.courseId), 'ENROLL#').length,
      }));
    },

    // GET /courses/{courseId}/roster  ->  learners with progress
    // Query GSI1: COURSE#<courseId> / begins_with ENROLL#
    async getRoster(courseId) {
      await delay();
      requireTeacher(courseId);
      return table.queryIndex('GSI1', keys.course(courseId), 'ENROLL#').map((e) => {
        const learner = profileOf(e.sub) || {};
        const p = progressFor(e.sub, courseId);
        return {
          sub: e.sub,
          name: learner.name || e.sub,
          email: learner.email || '',
          status: e.status,
          enrolledAt: e.enrolledAt,
          completedAt: e.completedAt,
          score: e.score,
          complete: p.summary.complete,
          required: p.summary.required,
          awaitingReview: p.items.filter((i) => i.state.status === 'submitted').length,
          overdue: p.items.filter((i) => i.state.overdue).length,
        };
      });
    },

    // GET /courses/{courseId}/queue  ->  submissions awaiting review, oldest first
    // Query GSI1: COURSE#<courseId> / begins_with QUEUE#
    async listGradingQueue(courseId) {
      await delay();
      requireTeacher(courseId);
      return table.queryIndex('GSI1', keys.course(courseId), 'QUEUE#').map((s) => {
        const learner = profileOf(s.sub) || {};
        const item = stripKeys(table.get(keys.course(courseId), keys.item(s.itemId))) || {};
        return {
          sub: s.sub,
          learnerName: learner.name || s.sub,
          itemId: s.itemId,
          itemTitle: item.title || s.itemId,
          attempt: s.attempt,
          submittedAt: s.submittedAt,
          late: s.late,
        };
      });
    },

    // GET /courses/{courseId}/learners/{sub}/items/{itemId}/review
    //   ->  { learner, item, attempts }
    // Each attempt carries its own form snapshot; review against that.
    async getReview(courseId, learnerSub, itemId) {
      await delay();
      requireTeacher(courseId);
      const learner = profileOf(learnerSub);
      if (!learner) throw new Error('Learner not found.');
      const item = itemOrThrow(courseId, itemId);
      const attempts = table.query(keys.user(learnerSub), keys.submissions(courseId, itemId)).map(stripKeys);
      return { learner: { sub: learner.sub, name: learner.name, email: learner.email }, item, attempts };
    },

    // POST /courses/{courseId}/learners/{sub}/items/{itemId}/submissions/{attempt}/evaluation
    //   { ratings: { criterionId: levelId }, criterionComments: { criterionId: text },
    //     outcome: levelId, comments }
    //   ->  { submission, completed, certificate }
    // Every criterion in the attempt's form snapshot must be rated; each may
    // carry its own comment, and `comments` is the overall comment on the
    // assignment. A passing outcome approves the submission (opening any
    // approval gate and possibly completing the course, which certifies the
    // learner); a non-passing outcome returns it for resubmission and needs
    // feedback (an overall comment or at least one criterion comment). The
    // form snapshot on the submission is the rubric of record, so later
    // edits to the assignment never change a recorded evaluation.
    async evaluateSubmission(
      courseId,
      learnerSub,
      itemId,
      attempt,
      { ratings = {}, criterionComments = {}, outcome, comments = '' } = {}
    ) {
      await delay(150);
      requireTeacher(courseId);
      const { sub: evaluatorSub, profile } = getSession();
      if (learnerSub === evaluatorSub) throw new Error('You cannot evaluate your own submission.');

      const rec = table.get(keys.user(learnerSub), keys.submission(courseId, itemId, attempt));
      if (!rec) throw new Error('Submission not found.');
      if (rec.status !== 'submitted') throw new Error('This submission has already been evaluated.');
      const latest = table.query(keys.user(learnerSub), keys.submissions(courseId, itemId)).pop();
      if (latest.attempt !== rec.attempt) throw new Error('Only the latest attempt can be evaluated.');

      const item = itemOrThrow(courseId, itemId);
      const criteria = criteriaOf(rec.form?.fields);
      for (const c of criteria) {
        if (!levelById(ratings[c.criterionId])) throw new Error(`Rate every rubric criterion (missing: ${c.title}).`);
      }
      const level = levelById(outcome);
      if (!level) throw new Error('Choose an overall outcome.');
      const text = String(comments).trim().slice(0, COMMENT_LIMIT);
      const perCriterion = Object.fromEntries(
        criteria
          .map((c) => [c.criterionId, String(criterionComments[c.criterionId] || '').trim().slice(0, COMMENT_LIMIT)])
          .filter(([, t]) => t)
      );
      if (!level.passing && !text && !Object.keys(perCriterion).length) {
        throw new Error('Add comments explaining what to revise.');
      }

      const evaluatedAt = new Date().toISOString();
      const evaluation = {
        outcome: level.id,
        outcomeLabel: level.label,
        passing: level.passing,
        ratings: Object.fromEntries(criteria.map((c) => [c.criterionId, ratings[c.criterionId]])),
        criterionComments: perCriterion,
        comments: text,
        evaluatorSub,
        evaluatorName: profile?.name || 'Instructor',
        evaluatedAt,
      };
      const updated = {
        ...rec,
        status: level.passing ? 'approved' : 'returned',
        evaluation,
        GSI1SK: keys.evaluated(evaluatedAt, learnerSub, itemId),
      };
      table.put(updated);

      const learner = profileOf(learnerSub) || {};
      if (learner.email) {
        sendEmail(
          learner.email,
          level.passing ? `Approved: ${item.title}` : `Returned for revision: ${item.title}`,
          { kind: 'evaluation', courseId, itemId, outcome: level.label }
        );
      }
      const result = level.passing ? completeIfDone(learnerSub, courseId) : { completed: false, certificate: null };
      return { submission: stripKeys(updated), ...result };
    },

    // PUT /courses/{courseId}/items/{itemId}/assignment  { instructions, fields }  ->  item
    // Admins and the course's instructors build assignments: instructions,
    // then the fields the learner answers (text, or files with a comment),
    // each with its own rubric criteria (zero or more). Submissions already
    // made keep the form they answered.
    async saveAssignment(courseId, itemId, { instructions = '', fields = [] } = {}) {
      await delay(120);
      requireTeacher(courseId);
      const { sub } = getSession();
      const rec = table.get(keys.course(courseId), keys.item(itemId));
      if (!rec) throw new Error('Course item not found.');
      if (rec.type !== 'assignment') throw new Error('This item is not an assignment.');
      const text = String(instructions).trim();
      if (!text) throw new Error('Add instructions.');
      const updated = {
        ...rec,
        instructions: text,
        fields: normalizeFields(fields),
        updatedAt: new Date().toISOString(),
        updatedBy: sub,
      };
      table.put(updated);
      return stripKeys(updated);
    },

    /* ======================================================================
       SANDBOX ONLY
       ====================================================================== */

    // GET /me/outbox  (lets the UI show the "sent" email)
    async _outbox() {
      const { profile } = getSession() || {};
      const myEmail = profile?.email;
      return store.outbox.filter((m) => m.to === myEmail);
    },
  };
}
