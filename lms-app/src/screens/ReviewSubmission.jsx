/* ============================================================================
   REVIEW SUBMISSION  (instructor / admin)
   The learner's latest attempt (files and note) and earlier attempts with
   their evaluations, then the evaluation form: a rating on every rubric
   criterion, an overall outcome (prefilled with the lowest criterion
   rating, which the instructor may change), and comments. A passing outcome
   approves the work; a non-passing one returns it for revision and needs
   comments. The api enforces all of this; the form mirrors it.
   ============================================================================ */

import React, { useState, useEffect, useCallback } from 'react';
import LMS_CONFIG from '../lms.config.js';
import { T, F } from '../theme.js';
import { Btn, SectionHead, Loading, Card, BackLink, ErrorText, Pill, fieldStyle } from '../components/primitives.jsx';
import { AttemptCard } from './AssignmentView.jsx';

const LEVELS = LMS_CONFIG.evaluation.levels;
const h3 = { margin: '0 0 10px', fontFamily: F.heading, fontSize: 19, color: T.neutral900 };

export default function ReviewSubmission({ api, course, learnerSub, itemId, onDone }) {
  const [review, setReview] = useState(null);
  const [ratings, setRatings] = useState({});
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
  const { learner, item, rubric, attempts } = review;
  const latest = attempts[attempts.length - 1];
  const earlier = attempts.slice(0, -1).reverse();
  const pending = latest?.status === 'submitted';

  const rate = (criterionId, levelId) => {
    const next = { ...ratings, [criterionId]: levelId };
    setRatings(next);
    // Suggest the lowest criterion rating as the overall outcome, until the
    // instructor picks one themselves.
    if (!outcomeTouched && rubric && rubric.criteria.every((c) => next[c.criterionId])) {
      const worst = Math.max(...rubric.criteria.map((c) => LEVELS.findIndex((l) => l.id === next[c.criterionId])));
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

      <Card style={{ marginBottom: 16 }}>
        <h3 style={h3}>{pending ? 'Submission to evaluate' : 'Latest submission'}</h3>
        {latest ? <AttemptCard api={api} attempt={latest} /> : <p>No submissions.</p>}
      </Card>

      {pending && rubric && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={h3}>Evaluate against: {rubric.title}</h3>
          {rubric.criteria.map((c) => (
            <fieldset
              key={c.criterionId}
              style={{ border: `1px solid ${T.neutral100}`, borderRadius: 10, padding: '12px 14px', margin: '0 0 12px' }}
            >
              <legend style={{ fontWeight: 600, fontSize: 14, color: T.neutral900, padding: '0 4px' }}>{c.title}</legend>
              {c.description && <div style={{ fontSize: 12.5, color: T.neutral500, marginBottom: 8 }}>{c.description}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                {LEVELS.map((l) => (
                  <label
                    key={l.id}
                    style={{
                      display: 'block',
                      border: `1px solid ${ratings[c.criterionId] === l.id ? T.accent500 : T.neutral300}`,
                      background: ratings[c.criterionId] === l.id ? T.accent100 : T.white,
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
                      checked={ratings[c.criterionId] === l.id}
                      onChange={() => rate(c.criterionId, l.id)}
                      aria-label={`${c.title}: ${l.label}`}
                    />{' '}
                    <strong>{l.label}</strong>
                    {c.levels?.[l.id] && <div style={{ color: T.neutral500, marginTop: 4 }}>{c.levels[l.id]}</div>}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.neutral700, marginTop: 6 }}>
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

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.neutral700, marginTop: 14 }}>
            Comments to the learner{level && !level.passing ? ' (required when returning)' : ''}
            <textarea
              aria-label="Comments to the learner"
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
