/* ============================================================================
   MOCK API: THE BACKEND CONTRACT
   Every data operation goes through the object makeApi() returns. Its method
   SIGNATURES are the contract the real backend must satisfy; the route each
   method becomes is noted above it. To go live (Sprint 4), each method body
   becomes a fetch() to the corresponding Lambda endpoint with the JWT in the
   Authorization header. Components never change.

   When you add a feature, add its method here first, with the signature the
   backend will honor, then implement the mock body, then add it to
   API_CONTRACT in ./index.js (the contract test enforces the list).
   ============================================================================ */

import { seedUsers } from './seed.js';
import { keys, stripKeys } from './mockStore.js';

export function makeApi(store, rawGetSession) {
  const { table } = store;
  const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

  // Normalize the session so callers can read `sub`, `profile`, and `token`
  // uniformly. The raw session is { token, profile }; profile carries the
  // sub. This flattening is why no call site has to know that shape, and it
  // mirrors the real backend, where `sub` comes from the verified JWT.
  // (Playbook 10.2: identity comes from the session, never a table scan.)
  const getSession = () => {
    const s = rawGetSession() || {};
    return { token: s.token, profile: s.profile, sub: s.profile?.sub };
  };

  // The SCO a CMI call addresses. Callers may omit scoId: a Rise360 export
  // is a single-SCO package, so the default is the course's first SCORM item
  // (lowest order). Query COURSE#<id> / begins_with ITEM#, no scan.
  function resolveScoId(courseId, scoId) {
    if (scoId) return scoId;
    const sco = table
      .query(keys.course(courseId), 'ITEM#')
      .filter((i) => i.type === 'scorm')
      .sort((a, b) => a.order - b.order)[0];
    if (!sco) throw new Error(`Course ${courseId} has no SCORM item.`);
    return sco.scoId;
  }

  // Stands in for the COMPLETE+CERTIFY Lambda (PDF -> S3 -> SES). Internal:
  // not part of the contract, because in the real build the backend issues
  // the certificate server-side inside the commit. Reads the learner's
  // identity from the session profile (the real backend reads it from the
  // JWT), so there is no lookup that can return undefined and crash the
  // completion path.
  function issueCertificate(sub, course, score) {
    const { profile } = getSession() || {};
    const learnerName = profile?.name || 'Learner';
    const learnerEmail = profile?.email || 'unknown@demo.test';
    const cert = {
      sub,
      courseId: course.courseId,
      courseTitle: course.title,
      learnerName,
      score,
      issuedAt: new Date().toISOString(),
      certId: `CERT-${course.courseId}-${Date.now().toString(36)}`,
      s3Key: `certs/${sub}/${course.courseId}.pdf`, // where the real PDF lands
    };
    // USER#<sub> / CERT#<courseId>
    table.put({ PK: keys.user(sub), SK: keys.cert(course.courseId), entity: 'cert', ...cert });
    // SES stand-in:
    store.outbox.push({
      to: learnerEmail,
      subject: `Your certificate: ${course.title}`,
      cert,
      sentAt: new Date().toISOString(),
    });
    return cert;
  }

  return {
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

    // GET /me/cmi/{courseId}?sco={scoId}  ->  saved runtime bag (for resume)
    // Get USER#<sub> / CMI#<courseId>#<scoId>. scoId is optional (see
    // resolveScoId); omit it for single-SCO packages.
    async getCmi(courseId, scoId) {
      await delay(80);
      const { sub } = getSession();
      const rec = table.get(keys.user(sub), keys.cmi(courseId, resolveScoId(courseId, scoId)));
      return rec ? rec.cmi : null;
    },

    // PUT /me/cmi/{courseId}?sco={scoId}  { cmi }  ->  persist runtime (the Commit path)
    // Returns whether this commit completed the course, so the client can
    // show the certificate step. In the real build the COMPLETE+CERTIFY
    // Lambda does this server-side and emits the cert; here we mirror it.
    async commitCmi(courseId, cmiBag, scoId) {
      await delay(80);
      const { sub } = getSession();
      const sco = resolveScoId(courseId, scoId);
      table.put({
        PK: keys.user(sub), SK: keys.cmi(courseId, sco), entity: 'cmi',
        sub, courseId, scoId: sco, cmi: { ...cmiBag },
      });

      const status = cmiBag['cmi.core.lesson_status'];
      const rawScore = Number(cmiBag['cmi.core.score.raw'] ?? 0);

      const enr = table.get(keys.user(sub), keys.enroll(courseId));
      if (enr && enr.status !== 'completed') {
        if (status === 'completed' || status === 'passed') {
          table.put({ ...enr, status: 'completed', completedAt: new Date().toISOString(), score: rawScore });
          const course = stripKeys(table.get(keys.course(courseId), keys.meta()));
          const cert = issueCertificate(sub, course, rawScore);
          return { completed: true, certificate: cert };
        } else if (status === 'incomplete') {
          table.put({ ...enr, status: 'in_progress' });
        }
      }
      return { completed: false, certificate: null };
    },

    // GET /me/certificates/{courseId}
    // Get USER#<sub> / CERT#<courseId>
    async getCertificate(courseId) {
      await delay(60);
      const { sub } = getSession();
      return stripKeys(table.get(keys.user(sub), keys.cert(courseId)));
    },

    // GET /me/outbox  (sandbox-only: lets the UI show the "sent" email)
    async _outbox() {
      const { profile } = getSession() || {};
      const myEmail = profile?.email;
      return store.outbox.filter((m) => m.to === myEmail);
    },
  };
}
