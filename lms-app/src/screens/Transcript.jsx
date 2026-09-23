/* ============================================================================
   TRANSCRIPT  (one course = one line, per the scoping requirement: a course
   with multiple content items shows as the single course, not its units)
   ============================================================================ */

import React, { useState, useEffect } from 'react';
import LMS_CONFIG from '../lms.config.js';
import { T, F } from '../theme.js';
import { Btn, StatusPill, SectionHead, Loading, Empty } from '../components/primitives.jsx';

const { copy } = LMS_CONFIG;

export default function Transcript({ api, profile }) {
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
        eyebrow={copy.transcriptEyebrow}
        title={copy.transcriptTitle}
        sub={`${profile.name} - ${copy.transcriptSubtitle}`}
      />
      {rows.length === 0 ? (
        <Empty label={copy.transcriptEmpty} />
      ) : (
        <div
          style={{
            background: T.white,
            borderRadius: 14,
            border: `1px solid ${T.neutral100}`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 80px 1fr',
              padding: '12px 22px',
              background: T.neutral50,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.05em',
              textTransform: 'uppercase',
              color: T.neutral500,
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
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 80px 1fr',
                padding: '16px 22px',
                borderTop: `1px solid ${T.neutral100}`,
                fontSize: 13.5,
                color: T.neutral800,
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 600, fontFamily: F.heading }}>{r.title}</div>
              <div>
                <StatusPill status={r.status} />
              </div>
              <div>{r.score ?? '—'}</div>
              <div style={{ color: T.neutral500 }}>
                {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <Btn kind="ghost" onClick={() => alert('Real build: generates a transcript PDF from DynamoDB.')}>
          Download transcript
        </Btn>
      </div>
    </div>
  );
}
