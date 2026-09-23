/* ============================================================================
   RUBRIC EDITOR  (instructor / admin)
   Edits one rubric: its title and criteria, each with a description and a
   descriptor for every level of the evaluation scale (lms.config.js).
   Saving never changes evaluations already recorded: each evaluation keeps
   a snapshot of the rubric it was made against.
   ============================================================================ */

import React, { useState, useEffect } from 'react';
import LMS_CONFIG from '../lms.config.js';
import { T, F } from '../theme.js';
import { Btn, Card, Loading, ErrorText, fieldStyle } from '../components/primitives.jsx';

const LEVELS = LMS_CONFIG.evaluation.levels;
const label = { display: 'block', fontSize: 12.5, fontWeight: 600, color: T.neutral700, marginTop: 10 };

export default function RubricEditor({ api, courseId, rubricId, itemTitle }) {
  const [rubric, setRubric] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getRubric(courseId, rubricId).then((r) =>
      setRubric(r || { rubricId, title: `Rubric: ${itemTitle}`, criteria: [] })
    );
  }, [api, courseId, rubricId, itemTitle]);

  if (rubric === undefined) return <Loading label="Loading rubric" />;

  const edit = (patch) => {
    setSaved(false);
    setRubric((r) => ({ ...r, ...patch }));
  };
  const editCriterion = (i, patch) =>
    edit({ criteria: rubric.criteria.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const addCriterion = () =>
    edit({ criteria: [...rubric.criteria, { title: '', description: '', levels: {} }] });
  const removeCriterion = (i) => edit({ criteria: rubric.criteria.filter((_, j) => j !== i) });

  const save = async () => {
    setErr(null);
    setBusy(true);
    try {
      setRubric(await api.saveRubric(courseId, rubric));
      setSaved(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: T.neutral500, marginBottom: 4 }}>Used for: {itemTitle}</div>
      <label style={{ ...label, marginTop: 0 }}>
        Rubric title
        <input
          aria-label="Rubric title"
          value={rubric.title}
          onChange={(e) => edit({ title: e.target.value })}
          style={{ ...fieldStyle, marginTop: 4 }}
        />
      </label>

      {rubric.criteria.map((c, i) => (
        <div
          key={c.criterionId || `new-${i}`}
          data-testid="rubric-criterion"
          style={{ border: `1px solid ${T.neutral100}`, borderRadius: 10, padding: '12px 14px', marginTop: 14 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontFamily: F.heading, fontSize: 16, color: T.neutral900 }}>Criterion {i + 1}</strong>
            <Btn kind="ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => removeCriterion(i)}>
              Remove
            </Btn>
          </div>
          <label style={label}>
            Title
            <input
              aria-label={`Criterion ${i + 1} title`}
              value={c.title}
              onChange={(e) => editCriterion(i, { title: e.target.value })}
              style={{ ...fieldStyle, marginTop: 4 }}
            />
          </label>
          <label style={label}>
            Description
            <input
              aria-label={`Criterion ${i + 1} description`}
              value={c.description || ''}
              onChange={(e) => editCriterion(i, { description: e.target.value })}
              style={{ ...fieldStyle, marginTop: 4 }}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            {LEVELS.map((l) => (
              <label key={l.id} style={label}>
                {l.label}
                <textarea
                  aria-label={`Criterion ${i + 1} ${l.label}`}
                  value={c.levels?.[l.id] || ''}
                  onChange={(e) => editCriterion(i, { levels: { ...c.levels, [l.id]: e.target.value } })}
                  rows={2}
                  style={{ ...fieldStyle, marginTop: 4, resize: 'vertical', fontSize: 13 }}
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
        <Btn kind="ghost" onClick={addCriterion}>
          Add criterion
        </Btn>
        <Btn onClick={save} disabled={busy}>
          {busy ? 'Saving...' : 'Save rubric'}
        </Btn>
        {saved && <span style={{ fontSize: 13, color: T.successInk }}>Saved.</span>}
      </div>
      <ErrorText>{err}</ErrorText>
    </Card>
  );
}
