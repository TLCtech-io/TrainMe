/* ============================================================================
   ASSIGNMENT VIEW  (learner)
   Instructions, due date, the rubric the work is evaluated against, every
   attempt with the instructor's evaluation (outcome, per-criterion ratings,
   comments), and the submit / resubmit form. Files upload through
   api.uploadFile (a presigned S3 PUT in the real build) before the
   submission references them.
   ============================================================================ */

import React, { useState, useEffect, useCallback } from 'react';
import LMS_CONFIG from '../lms.config.js';
import { T, F } from '../theme.js';
import {
  Btn,
  SectionHead,
  Loading,
  Card,
  BackLink,
  ErrorText,
  ItemStatusPill,
  Pill,
  fmtDate,
  fieldStyle,
} from '../components/primitives.jsx';

const LEVELS = LMS_CONFIG.evaluation.levels;
const levelLabel = (id) => LEVELS.find((l) => l.id === id)?.label || id;

const h3 = { margin: '0 0 10px', fontFamily: F.heading, fontSize: 19, color: T.neutral900 };

// Rubric criteria with the descriptor for each level (what is expected).
export function RubricTable({ rubric }) {
  if (!rubric) return null;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 560 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8, color: T.neutral500 }}>Criterion</th>
            {LEVELS.map((l) => (
              <th key={l.id} style={{ textAlign: 'left', padding: 8, color: T.neutral500 }}>
                {l.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rubric.criteria.map((c) => (
            <tr key={c.criterionId} style={{ borderTop: `1px solid ${T.neutral100}`, verticalAlign: 'top' }}>
              <td style={{ padding: 8, color: T.neutral900 }}>
                <strong>{c.title}</strong>
                {c.description && <div style={{ color: T.neutral500, marginTop: 2 }}>{c.description}</div>}
              </td>
              {LEVELS.map((l) => (
                <td key={l.id} style={{ padding: 8, color: T.neutral700 }}>
                  {c.levels?.[l.id] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// One attempt: files, note, and the evaluation if there is one.
export function AttemptCard({ api, attempt }) {
  const [err, setErr] = useState(null);
  const ev = attempt.evaluation;
  const openFile = async (f) => {
    setErr(null);
    try {
      window.open(await api.getFileUrl(f.fileKey), '_blank', 'noopener');
    } catch (e) {
      setErr(e.message);
    }
  };
  return (
    <div
      data-testid={`attempt-${attempt.attempt}`}
      style={{ borderTop: `1px solid ${T.neutral100}`, padding: '14px 0', fontSize: 13.5, color: T.neutral800 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <strong>Attempt {attempt.attempt}</strong>
        <span style={{ color: T.neutral500 }}>submitted {fmtDate(attempt.submittedAt)}</span>
        {attempt.late && <Pill tone="accent">Late</Pill>}
        <ItemStatusPill
          status={attempt.status === 'approved' ? 'complete' : attempt.status === 'returned' ? 'returned' : 'submitted'}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {attempt.files.map((f) => (
          <Btn key={f.fileKey} kind="ghost" style={{ padding: '6px 10px', fontSize: 12.5 }} onClick={() => openFile(f)}>
            📎 {f.name}
          </Btn>
        ))}
      </div>
      {attempt.note && <p style={{ margin: '8px 0 0', color: T.neutral700 }}>Note: {attempt.note}</p>}
      <ErrorText>{err}</ErrorText>
      {ev && (
        <div style={{ marginTop: 10, background: T.neutral50, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong>Outcome:</strong>
            <Pill tone={ev.passing ? 'success' : 'accent'}>{ev.outcomeLabel}</Pill>
            <span style={{ color: T.neutral500, fontSize: 12 }}>
              {ev.evaluatorName} - {fmtDate(ev.evaluatedAt)}
            </span>
          </div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {ev.rubric.criteria.map((c) => (
              <li key={c.criterionId}>
                {c.title}: <strong>{levelLabel(ev.ratings[c.criterionId])}</strong>
              </li>
            ))}
          </ul>
          {ev.comments && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{ev.comments}</p>}
        </div>
      )}
    </div>
  );
}

export default function AssignmentView({ api, course, item, onExit }) {
  const [attempts, setAttempts] = useState(null);
  const [rubric, setRubric] = useState(null);
  const [files, setFiles] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [inputKey, setInputKey] = useState(0); // resets the file input after a submit

  const load = useCallback(async () => {
    const [subs, r] = await Promise.all([
      api.listSubmissions(course.courseId, item.itemId),
      item.rubricId ? api.getRubric(course.courseId, item.rubricId) : null,
    ]);
    setAttempts(subs);
    setRubric(r);
  }, [api, course.courseId, item.itemId, item.rubricId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!attempts) return <Loading label="Loading assignment" />;

  const latest = attempts[attempts.length - 1];
  const status = !latest ? 'available' : latest.status === 'approved' ? 'complete' : latest.status;
  const canSubmit = status === 'available' || status === 'returned';

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const uploaded = [];
      for (const f of files) uploaded.push(await api.uploadFile(course.courseId, item.itemId, f));
      await api.submitAssignment(course.courseId, item.itemId, { note, files: uploaded });
      setFiles([]);
      setNote('');
      setInputKey((k) => k + 1);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <BackLink onClick={onExit}>Back to course</BackLink>
      <SectionHead eyebrow={course.title} title={item.title} />

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <ItemStatusPill status={status} />
          {item.state?.dueAt && <span style={{ fontSize: 13, color: T.neutral500 }}>Due {fmtDate(item.state.dueAt)}</span>}
        </div>
        <p style={{ margin: 0, fontSize: 14, color: T.neutral700, lineHeight: 1.6 }}>{item.instructions}</p>
      </Card>

      {rubric && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={h3}>How this is evaluated</h3>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: T.neutral500 }}>
            {LEVELS.filter((l) => l.passing).map((l) => l.label).join(' or ')} completes the assignment.{' '}
            {LEVELS.filter((l) => !l.passing).map((l) => l.label).join(' or ')} returns it for revision.
          </p>
          <RubricTable rubric={rubric} />
        </Card>
      )}

      {canSubmit && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={h3}>{status === 'returned' ? 'Resubmit your work' : 'Submit your work'}</h3>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.neutral700 }}>
            Files (up to {LMS_CONFIG.uploads.maxFiles}, {Math.round(LMS_CONFIG.uploads.maxBytes / 1048576)} MB each)
            <input
              key={inputKey}
              type="file"
              multiple
              aria-label="Files"
              onChange={(e) => setFiles([...e.target.files])}
              style={{ display: 'block', marginTop: 6, fontFamily: F.body, fontSize: 13 }}
            />
          </label>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.neutral700, marginTop: 14 }}>
            Note to your instructor (optional)
            <textarea
              aria-label="Note to your instructor"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ ...fieldStyle, marginTop: 6, resize: 'vertical' }}
            />
          </label>
          <div style={{ marginTop: 14 }}>
            <Btn onClick={submit} disabled={busy || files.length === 0}>
              {busy ? 'Submitting...' : 'Submit for review'}
            </Btn>
          </div>
          <ErrorText>{err}</ErrorText>
        </Card>
      )}

      {status === 'submitted' && (
        <Card style={{ marginBottom: 16, background: T.neutral50 }}>
          <span style={{ fontSize: 14, color: T.neutral700 }}>
            Submitted. Your instructor will evaluate it; you will get an email when they do.
          </span>
        </Card>
      )}

      {attempts.length > 0 && (
        <Card>
          <h3 style={h3}>Your submissions</h3>
          {[...attempts].reverse().map((a) => (
            <AttemptCard key={a.attempt} api={api} attempt={a} />
          ))}
        </Card>
      )}
    </div>
  );
}
