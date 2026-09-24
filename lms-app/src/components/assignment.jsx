/* ============================================================================
   ASSIGNMENT BUILDING BLOCKS
   Shared by the learner's assignment view and the instructor's review:
   the rubric table for one field, the collapsible "How this is evaluated",
   file links (always a new tab, so an instructor can read a file and score
   side by side), one field's answer, and one attempt with its evaluation
   laid out field by field.

   Everything renders from the attempt's own form snapshot, never the live
   assignment, so later edits to the assignment never change what an old
   attempt shows.
   ============================================================================ */

import React, { useState, useEffect } from 'react';
import LMS_CONFIG from '../lms.config.js';
import { T, F } from '../theme.js';
import { Pill, ItemStatusPill, ErrorText, fmtDate } from './primitives.jsx';

export const LEVELS = LMS_CONFIG.evaluation.levels;
export const levelLabel = (id) => LEVELS.find((l) => l.id === id)?.label || id;

export const fieldTypeLabel = { text: 'Written answer', file: 'File upload with comments' };

// Rubric criteria with the descriptor for each level (what is expected).
export function RubricTable({ criteria }) {
  if (!criteria?.length) return null;
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
          {criteria.map((c) => (
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

// Collapsed by default; the learner opens it under the field it applies to.
export function CriteriaDetails({ criteria, label = 'How this is evaluated' }) {
  if (!criteria?.length) return null;
  return (
    <details style={{ marginTop: 10, fontSize: 13 }}>
      <summary style={{ cursor: 'pointer', color: T.neutral700, fontWeight: 600 }}>{label}</summary>
      <div style={{ marginTop: 8 }}>
        <RubricTable criteria={criteria} />
      </div>
    </details>
  );
}

// Links to uploaded files. The URL is fetched up front so the link is a
// plain <a target="_blank">, which every browser opens in a new tab.
// (Sprint 4: these become presigned S3 GET URLs; issue them with a
// lifetime long enough to cover a review session.)
export function FileLinks({ api, files }) {
  const [urls, setUrls] = useState({});
  const [err, setErr] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.all(files.map(async (f) => [f.fileKey, await api.getFileUrl(f.fileKey)]))
      .then((pairs) => live && setUrls(Object.fromEntries(pairs)))
      .catch((e) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [api, files]);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {files.map((f) => (
          <a
            key={f.fileKey}
            href={urls[f.fileKey] || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!urls[f.fileKey]}
            style={{
              display: 'inline-block',
              padding: '6px 10px',
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: F.body,
              borderRadius: 8,
              border: `1px solid ${T.neutral300}`,
              color: T.neutral800,
              background: T.white,
              textDecoration: 'none',
            }}
          >
            📎 {f.name} ↗
          </a>
        ))}
      </div>
      <ErrorText>{err}</ErrorText>
    </div>
  );
}

// One field's answer in a submitted attempt.
export function ResponseView({ api, field, response }) {
  if (!response) return <div style={{ fontSize: 13, color: T.neutral500 }}>No answer.</div>;
  if (field.type === 'text') {
    return (
      <div
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: 14,
          color: T.neutral900,
          background: T.neutral50,
          borderRadius: 8,
          padding: '10px 12px',
          lineHeight: 1.55,
        }}
      >
        {response.text}
      </div>
    );
  }
  return (
    <div>
      {response.files?.length > 0 && <FileLinks api={api} files={response.files} />}
      {response.comment && (
        <div style={{ marginTop: 8, fontSize: 13.5, color: T.neutral700, whiteSpace: 'pre-wrap' }}>
          <strong>Learner's comment:</strong> {response.comment}
        </div>
      )}
    </div>
  );
}

// A field heading: its label, type, and whether it is optional.
export function FieldHead({ field, index }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: F.heading, fontSize: 16, fontWeight: 600, color: T.neutral900 }}>
        {index + 1}. {field.label}
        {!field.required && <span style={{ fontSize: 12, color: T.neutral500, fontWeight: 400 }}> (optional)</span>}
      </div>
      {field.prompt && <div style={{ fontSize: 13, color: T.neutral500, marginTop: 2 }}>{field.prompt}</div>}
    </div>
  );
}

// The recorded evaluation of one criterion: its level and comment.
function CriterionResult({ criterion, evaluation }) {
  const comment = evaluation.criterionComments?.[criterion.criterionId];
  return (
    <div style={{ padding: '6px 0', borderTop: `1px solid ${T.neutral100}` }}>
      <span>{criterion.title}: </span>
      <strong>{levelLabel(evaluation.ratings?.[criterion.criterionId])}</strong>
      {comment && <div style={{ marginTop: 2, color: T.neutral700, whiteSpace: 'pre-wrap' }}>{comment}</div>}
    </div>
  );
}

// One attempt: each field's answer with its rubric results under it, then
// the overall outcome and comments.
export function AttemptCard({ api, attempt }) {
  const ev = attempt.evaluation;
  const fields = attempt.form?.fields || [];
  return (
    <div
      data-testid={`attempt-${attempt.attempt}`}
      style={{ borderTop: `1px solid ${T.neutral100}`, padding: '14px 0', fontSize: 13.5, color: T.neutral800 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <strong>Attempt {attempt.attempt}</strong>
        <span style={{ color: T.neutral500 }}>submitted {fmtDate(attempt.submittedAt)}</span>
        {attempt.late && <Pill tone="accent">Late</Pill>}
        <ItemStatusPill
          status={attempt.status === 'approved' ? 'complete' : attempt.status === 'returned' ? 'returned' : 'submitted'}
        />
      </div>
      {fields.map((field, i) => (
        <div key={field.fieldId} style={{ marginBottom: 14 }}>
          <FieldHead field={field} index={i} />
          <ResponseView api={api} field={field} response={attempt.responses?.[field.fieldId]} />
          {ev && field.criteria?.length > 0 && (
            <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: `3px solid ${T.neutral100}` }}>
              {field.criteria.map((c) => (
                <CriterionResult key={c.criterionId} criterion={c} evaluation={ev} />
              ))}
            </div>
          )}
        </div>
      ))}
      {ev && (
        <div style={{ marginTop: 4, background: T.neutral50, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong>Overall outcome:</strong>
            <Pill tone={ev.passing ? 'success' : 'accent'}>{ev.outcomeLabel}</Pill>
            <span style={{ color: T.neutral500, fontSize: 12 }}>
              {ev.evaluatorName} - {fmtDate(ev.evaluatedAt)}
            </span>
          </div>
          {ev.comments && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{ev.comments}</p>}
        </div>
      )}
    </div>
  );
}
