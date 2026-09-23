/* ============================================================================
   CATALOG
   Published courses with the caller's enrollment state; enroll or open.
   ============================================================================ */

import React, { useState, useEffect, useCallback } from 'react';
import LMS_CONFIG from '../lms.config.js';
import { T, F } from '../theme.js';
import { Btn, StatusPill, SectionHead, Loading } from '../components/primitives.jsx';

const { copy } = LMS_CONFIG;

export default function Catalog({ api, onOpen }) {
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
        eyebrow={copy.catalogEyebrow}
        title={copy.catalogTitle}
        sub={copy.catalogSubtitle}
      />
      <div style={{ display: 'grid', gap: 16 }}>
        {courses.map((c) => {
          const e = enr[c.courseId];
          return (
            <div
              key={c.courseId}
              style={{
                background: T.white,
                borderRadius: 14,
                border: `1px solid ${T.neutral100}`,
                padding: 22,
                display: 'flex',
                gap: 20,
                alignItems: 'center',
                boxShadow: '0 1px 2px rgba(15,23,42,.04)',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${T.neutral800}, ${T.neutral700})`,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 26 }}>📘</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: F.heading,
                      fontSize: 19,
                      color: T.neutral900,
                    }}
                  >
                    {c.title}
                  </h3>
                  <StatusPill status={e?.status} />
                </div>
                <div style={{ fontSize: 12, color: T.neutral500, marginBottom: 8 }}>{c.subtitle}</div>
                <p style={{ margin: 0, fontSize: 13, color: T.neutral700, lineHeight: 1.5 }}>
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
                    {e.status === 'completed' ? 'Review' : 'Open course'}
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
