/* ============================================================================
   TEACH COURSE  (instructor / admin workspace for one course)
   Three views: the grading queue (submissions awaiting review, oldest
   first), the roster (every learner's progress), and the course's
   assignments (instructions, fields, and each field's rubric).
   Opening a queue entry shows the review screen.
   ============================================================================ */

import React, { useState, useEffect, useCallback } from 'react';
import { T, F } from '../theme.js';
import {
  Btn,
  SectionHead,
  Loading,
  Empty,
  Card,
  BackLink,
  StatusPill,
  Pill,
  fmtDate,
} from '../components/primitives.jsx';
import ReviewSubmission from './ReviewSubmission.jsx';
import AssignmentEditor from './AssignmentEditor.jsx';

const VIEWS = [
  ['queue', 'Grading queue'],
  ['roster', 'Roster'],
  ['assignments', 'Assignments'],
];

const th = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.05em',
  textTransform: 'uppercase',
  color: T.neutral500,
  background: T.neutral50,
};
const td = { padding: '12px 14px', borderTop: `1px solid ${T.neutral100}`, fontSize: 13.5, color: T.neutral800 };

export default function TeachCourse({ api, courseId, onExit }) {
  const [outline, setOutline] = useState(null);
  const [view, setView] = useState('queue');
  const [queue, setQueue] = useState(null);
  const [roster, setRoster] = useState(null);
  const [reviewing, setReviewing] = useState(null); // { sub, itemId }

  const load = useCallback(async () => {
    const [o, q, r] = await Promise.all([
      api.getCourseOutline(courseId),
      api.listGradingQueue(courseId),
      api.getRoster(courseId),
    ]);
    setOutline(o);
    setQueue(q);
    setRoster(r);
  }, [api, courseId]);

  useEffect(() => {
    load();
  }, [load]);

  // Opening or leaving a review starts at the top (DST playbook 10.17).
  useEffect(() => window.scrollTo(0, 0), [reviewing]);

  if (!outline || !queue || !roster) return <Loading label="Loading course" />;
  const { course, items } = outline;

  if (reviewing) {
    return (
      <ReviewSubmission
        api={api}
        course={course}
        learnerSub={reviewing.sub}
        itemId={reviewing.itemId}
        onDone={async () => {
          setReviewing(null);
          await load();
        }}
      />
    );
  }

  const assignments = items.filter((i) => i.type === 'assignment');
  // A saved assignment replaces its item here at once, so leaving and
  // returning to the tab shows what was saved.
  const keepSaved = (updated) =>
    setOutline((o) => ({ ...o, items: o.items.map((i) => (i.itemId === updated.itemId ? updated : i)) }));

  return (
    <div>
      <BackLink onClick={onExit}>Back to teaching</BackLink>
      <SectionHead eyebrow="Instructor view" title={course.title} />

      <div role="tablist" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {VIEWS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            style={{
              background: view === id ? T.neutral800 : T.white,
              color: view === id ? T.white : T.neutral700,
              border: `1px solid ${view === id ? T.neutral800 : T.neutral300}`,
              padding: '8px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: F.body,
            }}
          >
            {label}
            {id === 'queue' && queue.length > 0 ? ` (${queue.length})` : ''}
          </button>
        ))}
      </div>

      {view === 'queue' &&
        (queue.length === 0 ? (
          <Empty label="Nothing awaiting review." />
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Learner</th>
                  <th style={th}>Item</th>
                  <th style={th}>Attempt</th>
                  <th style={th}>Submitted</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {queue.map((q) => (
                  <tr key={`${q.sub}-${q.itemId}-${q.attempt}`}>
                    <td style={td}>{q.learnerName}</td>
                    <td style={td}>{q.itemTitle}</td>
                    <td style={td}>{q.attempt}</td>
                    <td style={td}>
                      {fmtDate(q.submittedAt)} {q.late && <Pill tone="accent">Late</Pill>}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <Btn style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => setReviewing(q)}>
                        Review
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}

      {view === 'roster' &&
        (roster.length === 0 ? (
          <Empty label="No learners enrolled yet." />
        ) : (
          <Card style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
              <thead>
                <tr>
                  <th style={th}>Learner</th>
                  <th style={th}>Status</th>
                  <th style={th}>Progress</th>
                  <th style={th}>Enrolled</th>
                  <th style={th}>Flags</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.sub}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: T.neutral500 }}>{r.email}</div>
                    </td>
                    <td style={td}>
                      <StatusPill status={r.status} />
                    </td>
                    <td style={td}>
                      {r.complete} of {r.required} required
                    </td>
                    <td style={td}>{fmtDate(r.enrolledAt)}</td>
                    <td style={td}>
                      {r.awaitingReview > 0 && <Pill tone="accent">{r.awaitingReview} awaiting review</Pill>}{' '}
                      {r.overdue > 0 && <Pill tone="accent">{r.overdue} overdue</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}

      {view === 'assignments' &&
        (assignments.length === 0 ? (
          <Empty label="This course has no assignments." />
        ) : (
          assignments.map((a) => (
            <AssignmentEditor key={a.itemId} api={api} courseId={courseId} item={a} onSaved={keepSaved} />
          ))
        ))}
    </div>
  );
}
