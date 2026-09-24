/* ============================================================================
   COURSE HOME  (the learner's course page)
   Lists the course's items in order with their status, lock, and due date,
   so the learner always knows what is required of them and when. Opens a
   SCORM item in the player or an assignment in the assignment view. Shows
   the completion panel (with the certificate) once the course is complete.

   Every status and lock comes from api.getCourseProgress: the api decides
   what is unlocked; this screen only shows it.
   ============================================================================ */

import React, { useState, useEffect, useCallback } from 'react';
import { T, F } from '../theme.js';
import {
  Btn,
  SectionHead,
  Loading,
  Card,
  BackLink,
  ItemStatusPill,
  Pill,
  fmtDate,
} from '../components/primitives.jsx';
import CoursePlayer from './CoursePlayer.jsx';
import AssignmentView from './AssignmentView.jsx';
import CompletionPanel from './CompletionPanel.jsx';

const TYPE_LABEL = { scorm: 'Lesson', assignment: 'Assignment' };

// Why a locked item is locked, in the learner's words.
function lockReason(item, prev) {
  if (!prev) return '';
  if (item.unlock === 'after_approval') {
    return prev.type === 'assignment'
      ? `Unlocks when your instructor approves "${prev.title}".`
      : `Unlocks when you complete "${prev.title}".`;
  }
  return prev.type === 'assignment'
    ? `Unlocks when you submit "${prev.title}".`
    : `Unlocks when you complete "${prev.title}".`;
}

function actionLabel(item) {
  const s = item.state.status;
  if (item.type === 'assignment') {
    return { available: 'Start', submitted: 'View', returned: 'Revise and resubmit', complete: 'View' }[s] || 'Open';
  }
  return { available: 'Start', in_progress: 'Resume', complete: 'Review' }[s] || 'Open';
}

export default function CourseHome({ api, courseId, onExit }) {
  const [progress, setProgress] = useState(null);
  const [open, setOpen] = useState(null); // the item being viewed, or null

  const load = useCallback(async () => {
    setProgress(await api.getCourseProgress(courseId));
  }, [api, courseId]);

  useEffect(() => {
    load();
  }, [load]);

  // Opening or closing an item starts at the top (DST playbook 10.17).
  useEffect(() => window.scrollTo(0, 0), [open]);

  const closeItem = async () => {
    setOpen(null);
    await load();
  };

  if (!progress) return <Loading label="Loading course" />;
  const { course, items, summary, enrollment, certificate } = progress;

  if (open?.type === 'scorm') {
    return <CoursePlayer api={api} course={course} item={open} onExit={closeItem} />;
  }
  if (open?.type === 'assignment') {
    return <AssignmentView api={api} course={course} item={open} onExit={closeItem} />;
  }

  const completed = enrollment?.status === 'completed';

  return (
    <div>
      <BackLink onClick={onExit}>Back to catalog</BackLink>
      <SectionHead eyebrow={course.subtitle} title={course.title} />

      {completed && (
        <div style={{ marginBottom: 20 }}>
          <CompletionPanel api={api} courseId={courseId} certificate={certificate} onExit={onExit} />
        </div>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 22px',
            background: T.neutral50,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.05em',
            textTransform: 'uppercase',
            color: T.neutral500,
          }}
        >
          <span>Course items</span>
          <span data-testid="progress-summary">
            {summary.complete} of {summary.required} required complete
          </span>
        </div>

        {items.map((item, idx) => {
          const locked = item.state.status === 'locked';
          return (
            <div
              key={item.itemId}
              data-testid={`item-${item.itemId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '18px 22px',
                borderTop: `1px solid ${T.neutral100}`,
                opacity: locked ? 0.7 : 1,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: item.state.status === 'complete' ? T.successSoft : T.neutral100,
                  color: item.state.status === 'complete' ? T.successInk : T.neutral700,
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {item.state.status === 'complete' ? '✓' : locked ? '🔒' : idx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontFamily: F.heading, fontSize: 17, fontWeight: 600, color: T.neutral900 }}>
                    {item.title}
                  </span>
                  <ItemStatusPill status={item.state.status} />
                  {item.state.overdue && <Pill tone="accent">Overdue</Pill>}
                </div>
                <div style={{ fontSize: 12, color: T.neutral500 }}>
                  {TYPE_LABEL[item.type] || item.type}
                  {item.required === false ? ' - optional' : ''}
                  {item.state.dueAt ? ` - due ${fmtDate(item.state.dueAt)}` : ''}
                  {item.type === 'scorm' && item.state.score != null ? ` - score ${item.state.score}` : ''}
                </div>
                {locked && (
                  <div style={{ fontSize: 12.5, color: T.neutral700, marginTop: 4 }}>
                    {lockReason(item, items[idx - 1])}
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                {!locked && (
                  <Btn kind={item.state.status === 'complete' ? 'ghost' : 'primary'} onClick={() => setOpen(item)}>
                    {actionLabel(item)}
                  </Btn>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
