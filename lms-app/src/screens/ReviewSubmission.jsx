/* ============================================================================
   REVIEW SUBMISSION  (instructor / admin)
   The latest attempt, field by field: the learner's answer (files open in
   a new tab, so the instructor can read and score side by side), and
   directly under it that field's evaluation block, one row per rubric
   criterion with a level and its own comment. Then the overall outcome
   (prefilled with the lowest criterion rating, which the instructor may
   change) and the overall comments. Earlier attempts follow.

   A passing outcome approves the work; a non-passing one returns it for
   revision and needs feedback. The api enforces all of this against the
   attempt's form snapshot; the form mirrors it.
   ============================================================================ */

import React, { useState, useEffect, useCallback } from 'react';
import { T, F } from '../theme.js';
import { Btn, SectionHead, Loading, Card, BackLink, ErrorText, Pill, fieldStyle } from '../components/primitives.jsx';
import { LEVELS, AttemptCard, FieldHead, ResponseView } from '../components/assignment.jsx';

const h3 = { margin: '0 0 10px', fontFamily: F.heading, fontSize: 19, color: T.neutral900 };
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: T.neutral700 };

// Rating and comment for one rubric criterion.
function CriterionBlock({ criterion: c, rating, comment, onRate, onComment }) {
  return (
    <fieldset
      style={{ border: `1px solid ${T.neutral100}`, borderRadius: 10, padding: '12px 14px', margin: '10px 0 0', background: T.white }}
    >
      <legend style={{ fontWeight: 600, fontSize: 14, color: T.neutral900, padding: '0 4px' }}>{c.title}</legend>
      {c.description && <div style={{ fontSize: 12.5, color: T.neutral500, marginBottom: 8 }}>{c.description}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        {LEVELS.map((l) => (
          <label
            key={l.id}
            style={{
              display: 'block',
              border: `1px solid ${rating === l.id ? T.accent500 : T.neutral300}`,
              background: rating === l.id ? T.accent100 : T.white,
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name={c.criterionId}
              value={l.id}
              checked={rating === l.id}
              onChange={() => onRate(l.id)}
              aria-label={`${c.title}: ${l.label}`}
            />{' '}
            <strong>{l.label}</strong>
            {c.levels?.[l.id] && <div style={{ color: T.neutral500, marginTop: 4 }}>{c.levels[l.id]}</div>}
          </label>
        ))}
      </div>
      <textarea
        aria-label={`Comments on ${c.title}`}
        placeholder={`Comments on ${c.title} (optional)`}
        value={comment}
        onChange={(e) => onComment(e.target.value)}
        rows={2}
        style={{ ...fieldStyle, marginTop: 10, resize: 'vertical', fontSize: 13 }}
      />
    </fieldset>
  );
}

export default function ReviewSubmission({ api, course, learnerSub, itemId, onDone }) {
  const [review, setReview] = useState(null);
  const [ratings, setRatings] = useState({});
  const [criterionComments, setCriterionComments] = useState({});
  const [outcome, setOutcome] = useState('');
  const [outcomeTouched, setOutcomeTouched] = useState(false);
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setReview(await api.getReview(course.courseId, learnerSub, itemId));
  }, [api, course.courseId, learnerSub, itemId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!review) return <Loading label="Loading submission" />;
  const { learner, item, attempts } = review;
  const latest = attempts[attempts.length - 1];
  const earlier = attempts.slice(0, -1).reverse();
  const pending = latest?.status === 'submitted';
  const fields = latest?.form?.fields || [];
  const criteria = fields.flatMap((f) => f.criteria || []);

  const rate = (criterionId, levelId) => {
    const next = { ...ratings, [criterionId]: levelId };
    setRatings(next);
    // Suggest the lowest criterion rating as the overall outcome, until the
    // instructor picks one themselves.
    if (!outcomeTouched && criteria.length && criteria.every((c) => next[c.criterionId])) {
      const worst = Math.max(...criteria.map((c) => LEVELS.findIndex((l) => l.id === next[c.criterionId])));
      setOutcome(LEVELS[worst].id);
    }
  };

  const level = LEVELS.find((l) => l.id === outcome);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await api.evaluateSubmission(course.courseId, learnerSub, itemId, latest.attempt, {
        ratings,
        criterionComments,
        outcome,
        comments,
      });
      setResult(res);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const approved = result.submission.status === 'approved';
    return (
      <div>
        <SectionHead eyebrow={course.title} title="Evaluation recorded" />
        <Card>
          <p style={{ margin: 0, fontSize: 14, color: T.neutral700, lineHeight: 1.6 }}>
            {approved
              ? `Approved: ${learner.name}'s "${item.title}" is complete.`
              : `Returned: ${learner.name} can revise and resubmit "${item.title}".`}{' '}
            {learner.name} has been emailed.
            {result.completed &&
              ` This completed the course${result.certificate ? ', and a certificate was issued' : ''}.`}
          </p>
          <div style={{ marginTop: 16 }}>
            <Btn onClick={onDone}>Back to grading queue</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <BackLink onClick={onDone}>Back to grading queue</BackLink>
      <SectionHead eyebrow={`${course.title} - ${item.title}`} title={learner.name} sub={learner.email} />

      {!latest && (
        <Card>
          <p style={{ margin: 0 }}>No submissions.</p>
        </Card>
      )}

      {latest && !pending && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={h3}>Latest submission</h3>
          <AttemptCard api={api} attempt={latest} />
        </Card>
      )}

      {pending && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={h3}>Attempt {latest.attempt} to evaluate</h3>
          {latest.form?.instructions && (
            <details style={{ marginBottom: 12, fontSize: 13 }}>
              <summary style={{ cursor: 'pointer', color: T.neutral700, fontWeight: 600 }}>Assignment instructions</summary>
              <p style={{ margin: '8px 0 0', color: T.neutral700, whiteSpace: 'pre-wrap' }}>{latest.form.instructions}</p>
            </details>
          )}
          {fields.map((f, i) => (
            <div
              key={f.fieldId}
              data-testid={`review-field-${f.fieldId}`}
              style={{ borderTop: `1px solid ${T.neutral100}`, padding: '14px 0' }}
            >
              <FieldHead field={f} index={i} />
              <ResponseView api={api} field={f} response={latest.responses?.[f.fieldId]} />
              {(f.criteria || []).map((c) => (
                <CriterionBlock
                  key={c.criterionId}
                  criterion={c}
                  rating={ratings[c.criterionId]}
                  comment={criterionComments[c.criterionId] || ''}
                  onRate={(lv) => rate(c.criterionId, lv)}
                  onComment={(t) => setCriterionComments((cc) => ({ ...cc, [c.criterionId]: t }))}
                />
              ))}
            </div>
          ))}

          <div style={{ borderTop: `1px solid ${T.neutral100}`, paddingTop: 14 }}>
            <label style={label}>
              Overall outcome
              <select
                aria-label="Overall outcome"
                value={outcome}
                onChange={(e) => {
                  setOutcome(e.target.value);
                  setOutcomeTouched(true);
                }}
                style={{ ...fieldStyle, marginTop: 6 }}
              >
                <option value="">Choose an outcome</option>
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} ({l.passing ? 'approve' : 'return for revision'})
                  </option>
                ))}
              </select>
            </label>
            {level && (
              <div style={{ marginTop: 8 }}>
                <Pill tone={level.passing ? 'success' : 'accent'}>
                  {level.passing ? 'This will approve the submission' : 'This will return it for revision'}
                </Pill>
              </div>
            )}

            <label style={{ ...label, marginTop: 14 }}>
              Overall comments on the assignment
              {level && !level.passing ? ' (required when returning, unless you commented on a criterion)' : ''}
              <textarea
                aria-label="Overall comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                style={{ ...fieldStyle, marginTop: 6, resize: 'vertical' }}
              />
            </label>
            <div style={{ marginTop: 14 }}>
              <Btn kind="dark" onClick={submit} disabled={busy || !outcome}>
                {busy ? 'Recording...' : 'Record evaluation'}
              </Btn>
            </div>
            <ErrorText>{err}</ErrorText>
          </div>
        </Card>
      )}

      {earlier.length > 0 && (
        <Card>
          <h3 style={h3}>Earlier attempts</h3>
          {earlier.map((a) => (
            <AttemptCard key={a.attempt} api={api} attempt={a} />
          ))}
        </Card>
      )}
    </div>
  );
}
