/* ============================================================================
   ASSIGNMENT VIEW  (learner)
   Instructions and due date, then the assignment form: one block per field
   (a written answer, or files with a comment), each with its evaluation
   criteria in a collapsed "How this is evaluated" under it. Below, every
   attempt with the instructor's evaluation laid out field by field.
   Files upload through api.uploadFile (a presigned S3 PUT in the real
   build) before the submission references them. On a resubmission the
   written answers start from the previous attempt.
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
  fmtDate,
  fieldStyle,
} from '../components/primitives.jsx';
import { LEVELS, AttemptCard, CriteriaDetails, FieldHead } from '../components/assignment.jsx';

const h3 = { margin: '0 0 10px', fontFamily: F.heading, fontSize: 19, color: T.neutral900 };
const small = { display: 'block', fontSize: 12.5, fontWeight: 600, color: T.neutral700, marginTop: 8 };

// Empty answers for a form, with written answers carried over from an
// earlier attempt when there is one.
function startingAnswers(fields, previous) {
  return Object.fromEntries(
    fields.map((f) => [
      f.fieldId,
      f.type === 'text' ? { text: previous?.responses?.[f.fieldId]?.text || '' } : { files: [], comment: '' },
    ])
  );
}

export default function AssignmentView({ api, course, item, onExit }) {
  const fields = item.fields || [];
  const [attempts, setAttempts] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [inputKey, setInputKey] = useState(0); // resets the file inputs after a submit

  const load = useCallback(async () => {
    const subs = await api.listSubmissions(course.courseId, item.itemId);
    setAttempts(subs);
    setAnswers(startingAnswers(item.fields || [], subs[subs.length - 1]));
  }, [api, course.courseId, item.itemId, item.fields]);

  useEffect(() => {
    load();
  }, [load]);

  if (!attempts) return <Loading label="Loading assignment" />;

  const latest = attempts[attempts.length - 1];
  const status = !latest ? 'available' : latest.status === 'approved' ? 'complete' : latest.status;
  const canSubmit = status === 'available' || status === 'returned';
  const setAnswer = (fieldId, patch) => setAnswers((a) => ({ ...a, [fieldId]: { ...a[fieldId], ...patch } }));

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const responses = {};
      for (const f of fields) {
        const a = answers[f.fieldId] || {};
        if (f.type === 'text') {
          responses[f.fieldId] = { text: a.text || '' };
        } else {
          const uploaded = [];
          for (const file of a.files || []) uploaded.push(await api.uploadFile(course.courseId, item.itemId, file));
          responses[f.fieldId] = { files: uploaded, comment: a.comment || '' };
        }
      }
      await api.submitAssignment(course.courseId, item.itemId, { responses });
      setInputKey((k) => k + 1);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const passing = LEVELS.filter((l) => l.passing).map((l) => l.label).join(' or ');
  const failing = LEVELS.filter((l) => !l.passing).map((l) => l.label).join(' or ');

  return (
    <div>
      <BackLink onClick={onExit}>Back to course</BackLink>
      <SectionHead eyebrow={course.title} title={item.title} />

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <ItemStatusPill status={status} />
          {item.state?.dueAt && <span style={{ fontSize: 13, color: T.neutral500 }}>Due {fmtDate(item.state.dueAt)}</span>}
        </div>
        <p style={{ margin: 0, fontSize: 14, color: T.neutral700, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {item.instructions}
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: T.neutral500 }}>
          An overall outcome of {passing} completes the assignment. {failing} returns it for revision.
        </p>
      </Card>

      {canSubmit && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={h3}>{status === 'returned' ? 'Revise and resubmit' : 'Your answers'}</h3>
          {status === 'returned' && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: T.neutral500 }}>
              Your written answers are filled in from your last attempt.
              {fields.some((f) => f.type === 'file') ? ' Attach your files again.' : ''}
            </p>
          )}
          {fields.map((f, i) => {
            const a = answers[f.fieldId] || {};
            return (
              <div
                key={f.fieldId}
                data-testid={`field-${f.fieldId}`}
                style={{ borderTop: i ? `1px solid ${T.neutral100}` : 'none', padding: i ? '14px 0 4px' : '0 0 4px' }}
              >
                <FieldHead field={f} index={i} />
                {f.type === 'text' ? (
                  <textarea
                    aria-label={f.label}
                    value={a.text || ''}
                    onChange={(e) => setAnswer(f.fieldId, { text: e.target.value })}
                    rows={5}
                    style={{ ...fieldStyle, resize: 'vertical' }}
                  />
                ) : (
                  <>
                    <label style={{ ...small, marginTop: 0 }}>
                      Files (up to {LMS_CONFIG.uploads.maxFiles}, {Math.round(LMS_CONFIG.uploads.maxBytes / 1048576)} MB each)
                      <input
                        key={inputKey}
                        type="file"
                        multiple
                        aria-label={`${f.label}: files`}
                        onChange={(e) => setAnswer(f.fieldId, { files: [...e.target.files] })}
                        style={{ display: 'block', marginTop: 6, fontFamily: F.body, fontSize: 13 }}
                      />
                    </label>
                    <label style={small}>
                      Comments (optional)
                      <textarea
                        aria-label={`${f.label}: comments`}
                        value={a.comment || ''}
                        onChange={(e) => setAnswer(f.fieldId, { comment: e.target.value })}
                        rows={3}
                        style={{ ...fieldStyle, marginTop: 6, resize: 'vertical' }}
                      />
                    </label>
                  </>
                )}
                <CriteriaDetails criteria={f.criteria} />
              </div>
            );
          })}
          <div style={{ marginTop: 16 }}>
            <Btn onClick={submit} disabled={busy}>
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
