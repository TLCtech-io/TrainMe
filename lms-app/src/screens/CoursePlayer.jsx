/* ============================================================================
   COURSE PLAYER  (mock SCORM content + the capture/commit path)
   In the real build the inner panel is an <iframe src={course.scormLaunch}/>
   and installScormApi() wraps scorm-again instead of the local mock.
   ============================================================================ */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import LMS_CONFIG from '../lms.config.js';
import { T, F } from '../theme.js';
import { installScormApi } from '../scorm/runtime.js';
import { lessonsFor } from '../scorm/mockLessons.js';
import { Btn, SectionHead, Loading } from '../components/primitives.jsx';
import CompletionPanel from './CompletionPanel.jsx';

const { features } = LMS_CONFIG;

export default function CoursePlayer({ api, courseId, onExit }) {
  const [course, setCourse] = useState(null);
  const [cmi, setCmi] = useState(null);
  const [slide, setSlide] = useState(0);
  const [completion, setCompletion] = useState(null); // {completed, certificate}
  const [saving, setSaving] = useState(false);
  const scormRef = useRef(null);

  const slides = lessonsFor(courseId);

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

      const lessonCount = lessonsFor(courseId).length;
      const bm = saved?.['cmi.suspend_data'];
      if (bm) {
        const n = parseInt(bm, 10);
        if (!Number.isNaN(n)) setSlide(Math.min(n, lessonCount - 1));
      }
      scormRef.current.api.LMSInitialize('');
      if (saved?.['cmi.core.lesson_status'] !== 'completed') {
        scormRef.current.set('cmi.core.lesson_status', 'incomplete');
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
        r.set('cmi.suspend_data', String(idx));
        r.set('cmi.core.session_time', '00:05:00');
        r.api.LMSCommit('');
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
        r.set('cmi.core.score.raw', '92');
        r.set('cmi.core.lesson_status', 'completed');
        r.api.LMSCommit('');
        r.api.LMSFinish('');
      }
      // Build the bag directly so completion does not depend on the global
      // still being installed at await-resolution time.
      const bag = currentBag({
        'cmi.core.score.raw': '92',
        'cmi.core.lesson_status': 'completed',
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

  const alreadyDone = cmi?.['cmi.core.lesson_status'] === 'completed';

  return (
    <div>
      <button
        onClick={onExit}
        style={{
          background: 'transparent',
          border: 'none',
          color: T.neutral500,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 16,
          fontFamily: F.body,
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
            border: `1px solid ${T.neutral100}`,
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(15,23,42,.04)',
          }}
        >
          {/* progress rail */}
          <div style={{ display: 'flex', gap: 4, padding: '14px 22px', background: T.neutral50 }}>
            {slides.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i <= slide ? T.accent500 : T.neutral300,
                }}
              />
            ))}
          </div>

          {/* mock SCO viewport (real build: <iframe src={course.scormLaunch}/>) */}
          <div
            style={{
              padding: '44px 40px',
              minHeight: 220,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              background: `linear-gradient(160deg, ${T.white}, ${T.neutral50})`,
            }}
          >
            <div
              style={{
                fontFamily: F.body,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: T.accent600,
                marginBottom: 10,
              }}
            >
              Slide {slide + 1} of {slides.length}
            </div>
            <h2
              style={{
                margin: '0 0 12px',
                fontFamily: F.heading,
                fontSize: 28,
                color: T.neutral900,
              }}
            >
              {slides[slide].h}
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: T.neutral700, lineHeight: 1.6, maxWidth: 560 }}>
              {slides[slide].b}
            </p>
          </div>

          {/* controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 22px',
              borderTop: `1px solid ${T.neutral100}`,
            }}
          >
            <Btn kind="ghost" disabled={slide === 0} onClick={() => go(slide - 1)}>
              Previous
            </Btn>
            {slide < slides.length - 1 ? (
              <Btn onClick={() => go(slide + 1)}>Next</Btn>
            ) : (
              <Btn kind="dark" onClick={finish} disabled={saving}>
                {saving ? 'Recording...' : alreadyDone ? 'Re-issue certificate' : 'Mark complete'}
              </Btn>
            )}
          </div>
        </div>
      )}

      {features.sandboxHints && (
        <div
          style={{
            marginTop: 16,
            fontSize: 12,
            color: T.neutral500,
            fontFamily: F.body,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: T.neutral700 }}>Runtime note:</strong> moving between slides commits a
          SCORM bookmark (<code>cmi.suspend_data</code>). Leave and reopen the course to confirm it
          resumes where you left off. In production this exact path persists a real Rise360 package's
          runtime from S3.
        </div>
      )}
    </div>
  );
}
