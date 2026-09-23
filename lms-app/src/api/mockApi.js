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

import { seedUsers, seedCourses } from './seed.js';
import { learnerCourseKey as k } from './mockStore.js';

export function makeApi(store, rawGetSession) {
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

  // Stands in for the COMPLETE+CERTIFY Lambda (PDF -> S3 -> SES). Internal:
  // not part of the contract, because in the real build the backend issues
  // the certificate server-side inside the commit. Reads the learner's
  // identity from the session profile (the real backend reads it from the
  // JWT), so there is no table scan that can return undefined and crash the
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
    store.certs[k(sub, course.courseId)] = cert;
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
    async listCatalog() {
      await delay();
      return seedCourses.filter((c) => c.status === 'published');
    },

    // GET /me/enrollments  ->  this user's enrollments (transcript source)
    async listEnrollments() {
      await delay();
      const { sub } = getSession();
      return Object.values(store.enrollments).filter((e) => e.sub === sub);
    },

    // POST /me/enrollments { courseId }  ->  enrollment item
    async enroll(courseId) {
      await delay();
      const { sub } = getSession();
      const key = k(sub, courseId);
      if (store.enrollments[key]) return store.enrollments[key];
      const item = {
        sub,
        courseId,
        status: 'enrolled', // enrolled -> in_progress -> completed
        enrolledAt: new Date().toISOString(),
        completedAt: null,
        score: null,
      };
      store.enrollments[key] = item;
      return item;
    },

    // GET /me/cmi/{courseId}  ->  saved runtime bag (for resume)
    async getCmi(courseId) {
      await delay(80);
      const { sub } = getSession();
      return store.cmi[k(sub, courseId)] || null;
    },

    // PUT /me/cmi/{courseId}  { cmi }  ->  persist runtime (the Commit path)
    // Returns whether this commit completed the course, so the client can
    // show the certificate step. In the real build the COMPLETE+CERTIFY
    // Lambda does this server-side and emits the cert; here we mirror it.
    async commitCmi(courseId, cmiBag) {
      await delay(80);
      const { sub } = getSession();
      const key = k(sub, courseId);
      store.cmi[key] = { ...cmiBag };

      const course = seedCourses.find((c) => c.courseId === courseId);
      const status = cmiBag['cmi.core.lesson_status'];
      const rawScore = Number(cmiBag['cmi.core.score.raw'] ?? 0);

      const enr = store.enrollments[key];
      if (enr && enr.status !== 'completed') {
        if (status === 'completed' || status === 'passed') {
          enr.status = 'completed';
          enr.completedAt = new Date().toISOString();
          enr.score = rawScore;
          const cert = issueCertificate(sub, course, rawScore);
          return { completed: true, certificate: cert };
        } else if (status === 'incomplete') {
          enr.status = 'in_progress';
        }
      }
      return { completed: false, certificate: null };
    },

    // GET /me/certificates/{courseId}
    async getCertificate(courseId) {
      await delay(60);
      const { sub } = getSession();
      return store.certs[k(sub, courseId)] || null;
    },

    // GET /me/outbox  (sandbox-only: lets the UI show the "sent" email)
    async _outbox() {
      const { profile } = getSession() || {};
      const myEmail = profile?.email;
      return store.outbox.filter((m) => m.to === myEmail);
    },
  };
}
