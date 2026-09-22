import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================================
   LMS — Thin Vertical Slice (v0.1, sandbox)
   ----------------------------------------------------------------------------
   Proves the full student journey end to end against an in-memory mock backend:
     sign in  ->  catalog  ->  enroll  ->  play SCORM  ->  complete
              ->  certificate issued + "emailed"  ->  transcript

   ARCHITECTURE NOTE (read before wiring AWS):
   Every data operation goes through the `api` object below. Its method
   SIGNATURES are the contract the real backend must satisfy. To go live,
   replace each method BODY with a fetch() to the corresponding Lambda
   endpoint (JWT in the Authorization header). Nothing else in this file
   should need to change. The mock store mirrors the DynamoDB single-table
   keys (USER#, COURSE#, ENROLL#, CMI#, CERT#) so the mental model carries
   straight over.

   The SCORM runtime here is a faithful MOCK of the scorm-again contract:
   it exposes window.API (SCORM 1.2) so an embedded course's
   LMSInitialize / LMSSetValue / LMSCommit / LMSFinish calls are captured
   and persisted exactly as the real library will route them. The sandbox
   "course" is a few local slides standing in for a Rise360 package; when
   you point an <iframe> at a real S3-hosted SCORM launch file, the same
   API object and the same commit path serve it unchanged.
   ========================================================================== */

/* ---------------------------------------------------------------------------
   BRAND TOKENS  (TLC_TRNG slate + amber, carried from the DST build)
   --------------------------------------------------------------------------- */
const T = {
  slate900: "#0F172A",
  slate800: "#1E293B",
  slate700: "#334155",
  slate500: "#64748B",
  slate300: "#CBD5E1",
  slate100: "#F1F5F9",
  slate50: "#F8FAFC",
  amber500: "#F59E0B",
  amber400: "#FBBF24",
  amber300: "#FCD34D",
  amber600: "#D97706",
  white: "#FFFFFF",
  green: "#10B981",
  red: "#EF4444",
  paper: "#FBFCFE",
};

/* ---------------------------------------------------------------------------
   MOCK STORE  (mirrors the planned DynamoDB single-table item shapes)
   --------------------------------------------------------------------------- */
const seedUsers = {
  "student@demo.test": {
    sub: "u-student-001",
    email: "student@demo.test",
    name: "Jordan Avery",
    role: "student",
    password: "demo",
  },
  "instructor@demo.test": {
    sub: "u-instr-001",
    email: "instructor@demo.test",
    name: "Sam Rivera",
    role: "instructor",
    password: "demo",
  },
  "admin@demo.test": {
    sub: "u-admin-001",
    email: "admin@demo.test",
    name: "Pat Morgan",
    role: "admin",
    password: "demo",
  },
};

// COURSE# items. scormLaunch would be an S3 URL to imsmanifest's launch file.
const seedCourses = [
  {
    courseId: "c-eop-pwc",
    title: "PWC Emergency Operations Plan: New Team Member Training",
    subtitle: "Self-paced - 16 lessons - contact hour certificate",
    description:
      "Onboarding for new team members on the Prince William County Emergency " +
      "Operations Plan: organization, activation, concept of operations, and " +
      "assignment of responsibilities. Built in Articulate Rise360.",
    status: "published",
    type: "scorm",
    scormVersion: "1.2",
    scormLaunch: "MOCK", // real build: https://<bucket>/eop-pwc/content-3/index.html
    durationMin: 45,
    certTemplate: "ct-contact-hour",
    passingScore: 80,
  },
  {
    courseId: "c-msg-101",
    title: "Effective Message Writing",
    subtitle: "Self-paced - approx. 20 min - contact hour certificate",
    description:
      "Turn alerts and warnings into clear, actionable public messaging. " +
      "Built from your plans and processes, designed for retention, not fluff.",
    status: "published",
    type: "scorm",
    scormVersion: "1.2",
    scormLaunch: "MOCK", // real build: https://<bucket>/<prefix>/index_lms.html
    durationMin: 20,
    certTemplate: "ct-contact-hour",
    passingScore: 80,
  },
];

// In-memory tables keyed the way the single-table design will key them.
function makeStore() {
  return {
    enrollments: {}, // `${sub}::${courseId}` -> enrollment item
    cmi: {}, // `${sub}::${courseId}` -> raw CMI bag (suspend_data, status, score)
    certs: {}, // `${sub}::${courseId}` -> cert item
    outbox: [], // stand-in for SES; certificate "emails" land here
  };
}

/* ---------------------------------------------------------------------------
   API CONTRACT  (replace each body with a fetch() to a Lambda to go live)
   --------------------------------------------------------------------------- */
function makeApi(store, rawGetSession) {
  const k = (sub, courseId) => `${sub}::${courseId}`;
  const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

  // Normalize the session so callers can read `sub`, `profile`, and `token`
  // uniformly. The raw session is { token, profile }; profile carries the
  // sub. This flattening is why no call site has to know that shape, and it
  // mirrors the real backend, where `sub` comes from the verified JWT.
  const getSession = () => {
    const s = rawGetSession() || {};
    return { token: s.token, profile: s.profile, sub: s.profile?.sub };
  };

  return {
    // POST /auth/signin  ->  { token, profile }
    async signIn(email, password) {
      await delay();
      const u = seedUsers[email.toLowerCase().trim()];
      if (!u || u.password !== password) {
        throw new Error("Incorrect email or password.");
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
      return seedCourses.filter((c) => c.status === "published");
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
        status: "enrolled", // enrolled -> in_progress -> completed
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
    // trigger the certificate step. In the real build the COMPLETE+CERTIFY
    // Lambda does this server-side and emits the cert; here we mirror it.
    async commitCmi(courseId, cmiBag) {
      await delay(80);
      const { sub } = getSession();
      const key = k(sub, courseId);
      store.cmi[key] = { ...cmiBag };

      const course = seedCourses.find((c) => c.courseId === courseId);
      const status = cmiBag["cmi.core.lesson_status"];
      const rawScore = Number(cmiBag["cmi.core.score.raw"] ?? 0);

      const enr = store.enrollments[key];
      if (enr && enr.status !== "completed") {
        if (status === "completed" || status === "passed") {
          enr.status = "completed";
          enr.completedAt = new Date().toISOString();
          enr.score = rawScore;
          const cert = await this._issueCertificate(sub, course, rawScore);
          return { completed: true, certificate: cert };
        } else if (status === "incomplete") {
          enr.status = "in_progress";
        }
      }
      return { completed: false, certificate: null };
    },

    // Internal: stands in for the COMPLETE+CERTIFY Lambda (PDF -> S3 -> SES).
    // Reads the learner's identity from the session profile (the real backend
    // reads it from the JWT), so there is no table scan that can return
    // undefined and crash the completion path.
    async _issueCertificate(sub, course, score) {
      const { profile } = getSession() || {};
      const learnerName = profile?.name || "Learner";
      const learnerEmail = profile?.email || "unknown@demo.test";
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
      store.certs[`${sub}::${course.courseId}`] = cert;
      // SES stand-in:
      store.outbox.push({
        to: learnerEmail,
        subject: `Your certificate: ${course.title}`,
        cert,
        sentAt: new Date().toISOString(),
      });
      return cert;
    },

    // GET /me/certificates/{courseId}
    async getCertificate(courseId) {
      await delay(60);
      const { sub } = getSession();
      return store.certs[`${sub}::${courseId}`] || null;
    },

    // GET /me/outbox  (sandbox-only: lets the UI show the "sent" email)
    async _outbox() {
      const { profile } = getSession() || {};
      const myEmail = profile?.email;
      return store.outbox.filter((m) => m.to === myEmail);
    },
  };
}

/* ---------------------------------------------------------------------------
   SCORM RUNTIME MOCK  (faithful to the scorm-again / SCORM 1.2 surface)
   Exposes window.API so embedded content's LMS* calls are captured.
   --------------------------------------------------------------------------- */
function installScormApi(initialCmi, onCommit) {
  const cmi = {
    "cmi.core.lesson_status": "not attempted",
    "cmi.core.score.raw": "",
    "cmi.core.score.min": "0",
    "cmi.core.score.max": "100",
    "cmi.suspend_data": "",
    "cmi.core.session_time": "00:00:00",
    ...(initialCmi || {}),
  };
  let lastError = "0";

  const API = {
    LMSInitialize: () => {
      lastError = "0";
      return "true";
    },
    LMSGetValue: (el) => (cmi[el] !== undefined ? String(cmi[el]) : ""),
    LMSSetValue: (el, val) => {
      cmi[el] = val;
      lastError = "0";
      return "true";
    },
    LMSCommit: () => {
      onCommit({ ...cmi });
      return "true";
    },
    LMSFinish: () => {
      onCommit({ ...cmi });
      return "true";
    },
    LMSGetLastError: () => lastError,
    LMSGetErrorString: () => "No error",
    LMSGetDiagnostic: () => "",
  };

  window.API = API; // SCORM 1.2 content discovers the runtime here
  return {
    api: API,
    // Snapshot accessor: always returns a fresh copy of the live CMI bag,
    // independent of whether window.API is still mounted. This is what the
    // commit/finish path reads, so completion never depends on the global.
    snapshot: () => ({ ...cmi }),
    set: (el, val) => {
      cmi[el] = val;
    },
    teardown: () => {
      if (window.API === API) delete window.API;
    },
  };
}

/* ---------------------------------------------------------------------------
   SMALL UI PRIMITIVES
   --------------------------------------------------------------------------- */
const Btn = ({ children, onClick, kind = "primary", disabled, style }) => {
  const base = {
    fontFamily: "'Poppins', system-ui, sans-serif",
    fontWeight: 600,
    fontSize: 14,
    padding: "11px 20px",
    borderRadius: 8,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "transform .08s ease, box-shadow .15s ease, background .15s ease",
    letterSpacing: ".01em",
  };
  const kinds = {
    primary: { background: T.amber500, color: T.slate900 },
    dark: { background: T.slate800, color: T.white },
    ghost: {
      background: "transparent",
      color: T.slate700,
      border: `1px solid ${T.slate300}`,
    },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...base, ...kinds[kind], ...style }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "translateY(1px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      {children}
    </button>
  );
};

const Pill = ({ children, tone = "slate" }) => {
  const tones = {
    slate: { bg: T.slate100, fg: T.slate700 },
    amber: { bg: "#FEF3C7", fg: T.amber600 },
    green: { bg: "#D1FAE5", fg: "#047857" },
  };
  const c = tones[tone];
  return (
    <span
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: ".06em",
        padding: "4px 10px",
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
      }}
    >
      {children}
    </span>
  );
};

/* ---------------------------------------------------------------------------
   SIGN IN
   --------------------------------------------------------------------------- */
function SignIn({ api, onSignedIn }) {
  const [email, setEmail] = useState("student@demo.test");
  const [password, setPassword] = useState("demo");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { token, profile } = await api.signIn(email, password);
      onSignedIn(token, profile);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const field = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 8,
    border: `1px solid ${T.slate300}`,
    fontFamily: "'Poppins', sans-serif",
    fontSize: 14,
    marginTop: 6,
    background: T.white,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: `radial-gradient(120% 100% at 50% 0%, ${T.slate800} 0%, ${T.slate900} 60%)`,
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: T.white,
          borderRadius: 16,
          padding: "36px 32px",
          boxShadow: "0 24px 60px rgba(0,0,0,.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>☁️</span>
          <span
            style={{
              fontFamily: "'Zilla Slab', Georgia, serif",
              fontWeight: 700,
              fontSize: 22,
              color: T.slate900,
              letterSpacing: ".02em",
            }}
          >
            TLC_TRNG
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 13,
            color: T.slate500,
            marginBottom: 26,
          }}
        >
          Learning platform - sandbox
        </div>

        <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, color: T.slate700 }}>
          Email
          <input style={field} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div style={{ height: 16 }} />
        <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, color: T.slate700 }}>
          Password
          <input
            type="password"
            style={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>

        {err && (
          <div
            style={{
              marginTop: 16,
              fontFamily: "'Poppins', sans-serif",
              fontSize: 13,
              color: T.red,
            }}
          >
            {err}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Btn onClick={submit} disabled={busy} style={{ width: "100%" }}>
            {busy ? "Signing in..." : "Sign in"}
          </Btn>
        </div>

        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: `1px solid ${T.slate100}`,
            fontFamily: "'Poppins', sans-serif",
            fontSize: 12,
            color: T.slate500,
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: T.slate700 }}>Sandbox accounts</strong> (password{" "}
          <code>demo</code>):<br />
          student@demo.test - instructor@demo.test - admin@demo.test
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   SHELL / TOP BAR
   --------------------------------------------------------------------------- */
function Shell({ profile, onSignOut, tab, setTab, children }) {
  const tabs =
    profile.role === "student"
      ? [
          ["catalog", "Catalog"],
          ["transcript", "Transcript"],
        ]
      : [["catalog", "Catalog"]];

  return (
    <div style={{ minHeight: "100vh", background: T.slate50, fontFamily: "'Poppins', sans-serif" }}>
      <header
        style={{
          background: T.slate900,
          color: T.white,
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 18 }}>☁️</span>
            <span
              style={{
                fontFamily: "'Zilla Slab', Georgia, serif",
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: ".02em",
              }}
            >
              TLC_TRNG
            </span>
          </div>
          <nav style={{ display: "flex", gap: 6 }}>
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  background: tab === id ? T.slate700 : "transparent",
                  color: tab === id ? T.white : T.slate300,
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: 7,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right", lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.name}</div>
            <div style={{ fontSize: 11, color: T.amber400, textTransform: "capitalize" }}>
              {profile.role}
            </div>
          </div>
          <button
            onClick={onSignOut}
            style={{
              background: "transparent",
              border: `1px solid ${T.slate700}`,
              color: T.slate300,
              padding: "7px 12px",
              borderRadius: 7,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px 64px" }}>{children}</main>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   CATALOG
   --------------------------------------------------------------------------- */
function Catalog({ api, profile, onOpen }) {
  const [courses, setCourses] = useState(null);
  const [enr, setEnr] = useState({});

  const load = useCallback(async () => {
    const [cat, mine] = await Promise.all([api.listCatalog(), api.listEnrollments()]);
    setCourses(cat);
    const map = {};
    mine.forEach((e) => (map[e.courseId] = e));
    setEnr(map);
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  if (!courses) return <Loading label="Loading catalog" />;

  return (
    <div>
      <SectionHead
        eyebrow="Course catalog"
        title="Available training"
        sub="Enroll, complete at your own pace, and earn a certificate."
      />
      <div style={{ display: "grid", gap: 16 }}>
        {courses.map((c) => {
          const e = enr[c.courseId];
          const tone =
            e?.status === "completed" ? "green" : e ? "amber" : "slate";
          const statusLabel = e
            ? e.status === "completed"
              ? "Completed"
              : e.status === "in_progress"
              ? "In progress"
              : "Enrolled"
            : "Not enrolled";
          return (
            <div
              key={c.courseId}
              style={{
                background: T.white,
                borderRadius: 14,
                border: `1px solid ${T.slate100}`,
                padding: 22,
                display: "flex",
                gap: 20,
                alignItems: "center",
                boxShadow: "0 1px 2px rgba(15,23,42,.04)",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${T.slate800}, ${T.slate700})`,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 26 }}>📘</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "'Zilla Slab', Georgia, serif",
                      fontSize: 19,
                      color: T.slate900,
                    }}
                  >
                    {c.title}
                  </h3>
                  <Pill tone={tone}>{statusLabel}</Pill>
                </div>
                <div style={{ fontSize: 12, color: T.slate500, marginBottom: 8 }}>{c.subtitle}</div>
                <p style={{ margin: 0, fontSize: 13, color: T.slate700, lineHeight: 1.5 }}>
                  {c.description}
                </p>
              </div>
              <div style={{ flexShrink: 0 }}>
                {!e ? (
                  <Btn
                    kind="dark"
                    onClick={async () => {
                      await api.enroll(c.courseId);
                      await load();
                    }}
                  >
                    Enroll
                  </Btn>
                ) : (
                  <Btn onClick={() => onOpen(c.courseId)}>
                    {e.status === "completed" ? "Review" : "Open course"}
                  </Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   COURSE PLAYER  (mock SCORM content + the capture/commit path)
   In the real build the inner panel is an <iframe src={scormLaunch}/> and the
   installScormApi() call wraps scorm-again instead of this local mock.
   --------------------------------------------------------------------------- */
function CoursePlayer({ api, courseId, onExit }) {
  const [course, setCourse] = useState(null);
  const [cmi, setCmi] = useState(null);
  const [slide, setSlide] = useState(0);
  const [completion, setCompletion] = useState(null); // {completed, certificate}
  const [saving, setSaving] = useState(false);
  const scormRef = useRef(null);

  // Course content: real lesson lists per course, with a generic fallback.
  const lessonSets = {
    "c-eop-pwc": [
      ["Course Overview", "What this training covers and how completion is recorded."],
      ["Introduction", "Purpose and scope of the Emergency Operations Plan."],
      ["Plan Organization", "How the EOP is structured and how to navigate it."],
      ["Delegation of Authority", "Who can act, and when authority transfers."],
      ["Plan Activation", "Triggers and steps that put the plan into effect."],
      ["Concept of Operations", "How the jurisdiction coordinates a response."],
      ["Assignment of Responsibilities", "Roles each department and partner holds."],
      ["Emergency Declarations", "Local, state, and federal declaration pathways."],
      ["Training and Exercise", "How the program builds and validates competency."],
      ["Course Quiz", "Confirm understanding to record your completion certificate."],
    ],
    "c-msg-101": [
      ["Why messaging matters", "Clear alerts drive protective action. Vague ones cost time."],
      ["The five elements", "Source, hazard, location, protective action, and time."],
      ["Write for action", "Lead with what to do. Plain language. No jargon."],
      ["Knowledge check", "Mark the course complete to record your score and certificate."],
    ],
  };
  const slides = (lessonSets[courseId] || lessonSets["c-msg-101"]).map(
    ([h, b]) => ({ h, b })
  );

  // Load course meta + any saved CMI, then install the runtime for resume.
  useEffect(() => {
    let live = true;
    (async () => {
      const cat = await api.listCatalog();
      const c = cat.find((x) => x.courseId === courseId);
      const saved = await api.getCmi(courseId);
      if (!live) return;
      setCourse(c);
      setCmi(saved);

      // Install the SCORM API the way embedded content will discover it.
      // Safe under React StrictMode's double-invoke: each install replaces
      // window.API, and completion reads scormRef via snapshot(), never the
      // global, so a teardown between invokes cannot strand the finish path.
      scormRef.current = installScormApi(saved, () => {});

      const lessons = lessonSets[courseId] || lessonSets["c-msg-101"];
      const bm = saved?.["cmi.suspend_data"];
      if (bm) {
        const n = parseInt(bm, 10);
        if (!Number.isNaN(n)) setSlide(Math.min(n, lessons.length - 1));
      }
      scormRef.current.api.LMSInitialize("");
      if (saved?.["cmi.core.lesson_status"] !== "completed") {
        scormRef.current.set("cmi.core.lesson_status", "incomplete");
      }
    })();
    return () => {
      live = false;
      scormRef.current?.teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Build the current CMI bag from the resilient snapshot, applying overrides.
  const currentBag = (overrides = {}) => {
    const base = scormRef.current?.snapshot?.() || {};
    return { ...base, ...overrides };
  };

  // Persist a bookmark every time the learner moves (the resume mechanism).
  const persistBookmark = useCallback(
    async (idx) => {
      const r = scormRef.current;
      if (r) {
        r.set("cmi.suspend_data", String(idx));
        r.set("cmi.core.session_time", "00:05:00");
        r.api.LMSCommit("");
      }
      await api.commitCmi(courseId, currentBag());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, courseId]
  );

  const go = async (idx) => {
    setSlide(idx);
    await persistBookmark(idx);
  };

  const finish = async () => {
    setSaving(true);
    try {
      const r = scormRef.current;
      if (r) {
        r.set("cmi.core.score.raw", "92");
        r.set("cmi.core.lesson_status", "completed");
        r.api.LMSCommit("");
        r.api.LMSFinish("");
      }
      // Build the bag directly so completion does not depend on the global
      // still being installed at await-resolution time.
      const bag = currentBag({
        "cmi.core.score.raw": "92",
        "cmi.core.lesson_status": "completed",
      });
      const res = await api.commitCmi(courseId, bag);

      if (res.completed) {
        setCompletion(res);
      } else {
        // Already completed on a prior attempt (Review path): fetch the
        // existing certificate so the panel still shows instead of hanging.
        const cert = await api.getCertificate(courseId);
        setCompletion({ completed: true, certificate: cert });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!course) return <Loading label="Loading course" />;

  const alreadyDone = cmi?.["cmi.core.lesson_status"] === "completed";


  return (
    <div>
      <button
        onClick={onExit}
        style={{
          background: "transparent",
          border: "none",
          color: T.slate500,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          marginBottom: 16,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        ← Back to catalog
      </button>

      <SectionHead eyebrow={course.subtitle} title={course.title} />

      {completion?.completed ? (
        <CompletionPanel
          api={api}
          courseId={courseId}
          certificate={completion.certificate}
          onExit={onExit}
        />
      ) : (
        <div
          style={{
            background: T.white,
            borderRadius: 14,
            border: `1px solid ${T.slate100}`,
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(15,23,42,.04)",
          }}
        >
          {/* progress rail */}
          <div style={{ display: "flex", gap: 4, padding: "14px 22px", background: T.slate50 }}>
            {slides.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i <= slide ? T.amber500 : T.slate300,
                }}
              />
            ))}
          </div>

          {/* mock SCO viewport (real build: <iframe src={course.scormLaunch}/>) */}
          <div
            style={{
              padding: "44px 40px",
              minHeight: 220,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              background: `linear-gradient(160deg, ${T.white}, ${T.slate50})`,
            }}
          >
            <div
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: T.amber600,
                marginBottom: 10,
              }}
            >
              Slide {slide + 1} of {slides.length}
            </div>
            <h2
              style={{
                margin: "0 0 12px",
                fontFamily: "'Zilla Slab', Georgia, serif",
                fontSize: 28,
                color: T.slate900,
              }}
            >
              {slides[slide].h}
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: T.slate700, lineHeight: 1.6, maxWidth: 560 }}>
              {slides[slide].b}
            </p>
          </div>

          {/* controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "18px 22px",
              borderTop: `1px solid ${T.slate100}`,
            }}
          >
            <Btn kind="ghost" disabled={slide === 0} onClick={() => go(slide - 1)}>
              Previous
            </Btn>
            {slide < slides.length - 1 ? (
              <Btn onClick={() => go(slide + 1)}>Next</Btn>
            ) : (
              <Btn kind="dark" onClick={finish} disabled={saving}>
                {saving ? "Recording..." : alreadyDone ? "Re-issue certificate" : "Mark complete"}
              </Btn>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          fontSize: 12,
          color: T.slate500,
          fontFamily: "'Poppins', sans-serif",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: T.slate700 }}>Runtime note:</strong> moving between slides commits a
        SCORM bookmark (<code>cmi.suspend_data</code>). Leave and reopen the course to confirm it
        resumes where you left off. In production this exact path persists a real Rise360 package's
        runtime from S3.
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   COMPLETION + CERTIFICATE
   --------------------------------------------------------------------------- */
function CompletionPanel({ api, courseId, certificate, onExit }) {
  const [outbox, setOutbox] = useState([]);
  useEffect(() => {
    api._outbox().then((o) => setOutbox(o.filter((m) => m.cert.courseId === courseId)));
  }, [api, courseId]);

  return (
    <div
      style={{
        background: T.white,
        borderRadius: 14,
        border: `1px solid ${T.slate100}`,
        padding: 32,
        boxShadow: "0 1px 2px rgba(15,23,42,.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            background: "#D1FAE5",
            display: "grid",
            placeItems: "center",
            fontSize: 20,
          }}
        >
          ✓
        </div>
        <h2 style={{ margin: 0, fontFamily: "'Zilla Slab', serif", fontSize: 24, color: T.slate900 }}>
          Course complete
        </h2>
      </div>
      <p style={{ fontSize: 14, color: T.slate700, lineHeight: 1.6, marginTop: 4 }}>
        Your completion was recorded with a score of <strong>{certificate.score}</strong>. A
        certificate has been issued and emailed.
      </p>

      {/* certificate preview (stand-in for the generated PDF) */}
      <div
        style={{
          marginTop: 18,
          border: `2px solid ${T.amber500}`,
          borderRadius: 12,
          padding: "28px 32px",
          background: `linear-gradient(135deg, ${T.slate900}, ${T.slate800})`,
          color: T.white,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: ".18em", color: T.amber400, fontWeight: 600 }}>
          CERTIFICATE OF COMPLETION
        </div>
        <div
          style={{
            fontFamily: "'Zilla Slab', serif",
            fontSize: 30,
            fontWeight: 700,
            margin: "14px 0 6px",
          }}
        >
          {certificate.learnerName}
        </div>
        <div style={{ fontSize: 13, color: T.slate300 }}>has successfully completed</div>
        <div style={{ fontSize: 17, fontWeight: 600, margin: "8px 0 16px" }}>
          {certificate.courseTitle}
        </div>
        <div style={{ fontSize: 11, color: T.slate500 }}>
          {certificate.certId} - issued {new Date(certificate.issuedAt).toLocaleDateString()}
        </div>
      </div>

      {outbox.length > 0 && (
        <div
          style={{
            marginTop: 18,
            background: T.slate50,
            borderRadius: 10,
            padding: "14px 16px",
            fontSize: 12.5,
            color: T.slate700,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          <strong>📧 Email sent</strong> (SES stand-in) - to{" "}
          <code>{outbox[0].to}</code> - subject "{outbox[0].subject}". The real build attaches the
          generated PDF from S3.
        </div>
      )}

      <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
        <Btn onClick={onExit}>Back to catalog</Btn>
        <Btn kind="ghost" onClick={() => alert("Real build: downloads the PDF from S3 (presigned URL).")}>
          Download PDF
        </Btn>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   TRANSCRIPT  (one completed course = one line, per the RFP requirement)
   --------------------------------------------------------------------------- */
function Transcript({ api, profile }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    (async () => {
      const [enr, cat] = await Promise.all([api.listEnrollments(), api.listCatalog()]);
      const titleOf = (id) => cat.find((c) => c.courseId === id)?.title || id;
      setRows(
        enr.map((e) => ({
          title: titleOf(e.courseId),
          status: e.status,
          score: e.score,
          completedAt: e.completedAt,
        }))
      );
    })();
  }, [api]);

  if (!rows) return <Loading label="Loading transcript" />;

  return (
    <div>
      <SectionHead
        eyebrow="Record of training"
        title="Transcript"
        sub={`${profile.name} - completed and in-progress courses`}
      />
      {rows.length === 0 ? (
        <Empty label="No enrollments yet. Head to the catalog to get started." />
      ) : (
        <div
          style={{
            background: T.white,
            borderRadius: 14,
            border: `1px solid ${T.slate100}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 80px 1fr",
              padding: "12px 22px",
              background: T.slate50,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".05em",
              textTransform: "uppercase",
              color: T.slate500,
            }}
          >
            <div>Course</div>
            <div>Status</div>
            <div>Score</div>
            <div>Completed</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 80px 1fr",
                padding: "16px 22px",
                borderTop: `1px solid ${T.slate100}`,
                fontSize: 13.5,
                color: T.slate800,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 600, fontFamily: "'Zilla Slab', serif" }}>{r.title}</div>
              <div>
                <Pill tone={r.status === "completed" ? "green" : "amber"}>
                  {r.status === "completed" ? "Completed" : r.status === "in_progress" ? "In progress" : "Enrolled"}
                </Pill>
              </div>
              <div>{r.score ?? "—"}</div>
              <div style={{ color: T.slate500 }}>
                {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <Btn kind="ghost" onClick={() => alert("Real build: generates a transcript PDF from DynamoDB.")}>
          Download transcript
        </Btn>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   SHARED BITS
   --------------------------------------------------------------------------- */
function SectionHead({ eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {eyebrow && (
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: T.amber600,
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
      )}
      <h1
        style={{
          margin: 0,
          fontFamily: "'Zilla Slab', Georgia, serif",
          fontSize: 30,
          color: T.slate900,
          letterSpacing: ".01em",
        }}
      >
        {title}
      </h1>
      {sub && <p style={{ margin: "8px 0 0", fontSize: 14, color: T.slate500 }}>{sub}</p>}
    </div>
  );
}

const Loading = ({ label }) => (
  <div style={{ padding: 48, textAlign: "center", color: T.slate500, fontFamily: "'Poppins', sans-serif" }}>
    {label}…
  </div>
);
const Empty = ({ label }) => (
  <div
    style={{
      padding: 40,
      textAlign: "center",
      color: T.slate500,
      background: T.white,
      borderRadius: 14,
      border: `1px dashed ${T.slate300}`,
      fontFamily: "'Poppins', sans-serif",
      fontSize: 14,
    }}
  >
    {label}
  </div>
);

/* ---------------------------------------------------------------------------
   ROOT
   --------------------------------------------------------------------------- */
export default function App() {
  const storeRef = useRef(makeStore());
  const sessionRef = useRef(null);
  const apiRef = useRef(makeApi(storeRef.current, () => sessionRef.current));

  const [session, setSession] = useState(null); // {token, profile}
  const [tab, setTab] = useState("catalog");
  const [openCourse, setOpenCourse] = useState(null);

  // load Google fonts once
  useEffect(() => {
    const id = "lms-fonts";
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      l.href =
        "https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const api = apiRef.current;

  const onSignedIn = (token, profile) => {
    sessionRef.current = { token, profile };
    setSession({ token, profile });
    setTab("catalog");
  };
  const onSignOut = () => {
    sessionRef.current = null;
    setSession(null);
    setOpenCourse(null);
  };

  if (!session) return <SignIn api={api} onSignedIn={onSignedIn} />;

  return (
    <Shell profile={session.profile} onSignOut={onSignOut} tab={tab} setTab={setTab}>
      {openCourse ? (
        <CoursePlayer api={api} courseId={openCourse} onExit={() => setOpenCourse(null)} />
      ) : tab === "catalog" ? (
        <Catalog api={api} profile={session.profile} onOpen={setOpenCourse} />
      ) : (
        <Transcript api={api} profile={session.profile} />
      )}
    </Shell>
  );
}
