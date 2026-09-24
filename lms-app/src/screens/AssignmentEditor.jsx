/* ============================================================================
   ASSIGNMENT EDITOR  (instructor / admin)
   Builds one assignment: the instructions, then the fields the learner
   answers, in order. Each field has a label, optional guidance, a type (a
   written answer, or a file upload with comments), a required switch, and
   its own rubric: zero or more criteria, each with a descriptor for every
   level of the evaluation scale (lms.config.js).
   Saving never changes submissions already made: each attempt keeps a
   snapshot of the form it answered.
   ============================================================================ */

import React, { useState } from 'react';
import { T, F } from '../theme.js';
import { Btn, Card, ErrorText, fieldStyle } from '../components/primitives.jsx';
import { LEVELS, fieldTypeLabel } from '../components/assignment.jsx';

const label = { display: 'block', fontSize: 12.5, fontWeight: 600, color: T.neutral700, marginTop: 10 };
const smallBtn = { padding: '4px 10px', fontSize: 12 };

const blankCriterion = () => ({ title: '', description: '', levels: {} });
const blankField = () => ({ label: '', prompt: '', type: 'text', required: true, criteria: [] });

// Moves element i of a list by d places (d = -1 up, +1 down).
const move = (list, i, d) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

function CriterionEditor({ n, fieldN, criterion: c, onChange, onRemove }) {
  const name = `Field ${fieldN} criterion ${n}`;
  return (
    <div
      data-testid="field-criterion"
      style={{ border: `1px solid ${T.neutral100}`, borderRadius: 8, padding: '10px 12px', marginTop: 10, background: T.white }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 13.5, color: T.neutral900 }}>Criterion {n}</strong>
        <Btn kind="ghost" style={smallBtn} onClick={onRemove}>
          Remove criterion
        </Btn>
      </div>
      <label style={label}>
        Title
        <input
          aria-label={`${name} title`}
          value={c.title}
          onChange={(e) => onChange({ title: e.target.value })}
          style={{ ...fieldStyle, marginTop: 4 }}
        />
      </label>
      <label style={label}>
        Description
        <input
          aria-label={`${name} description`}
          value={c.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          style={{ ...fieldStyle, marginTop: 4 }}
        />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
        {LEVELS.map((l) => (
          <label key={l.id} style={label}>
            {l.label}
            <textarea
              aria-label={`${name} ${l.label}`}
              value={c.levels?.[l.id] || ''}
              onChange={(e) => onChange({ levels: { ...c.levels, [l.id]: e.target.value } })}
              rows={2}
              style={{ ...fieldStyle, marginTop: 4, resize: 'vertical', fontSize: 13 }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export default function AssignmentEditor({ api, courseId, item, onSaved }) {
  const [draft, setDraft] = useState(() => ({
    instructions: item.instructions || '',
    fields: item.fields?.length ? item.fields : [blankField()],
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [saved, setSaved] = useState(false);

  const edit = (patch) => {
    setSaved(false);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const setFields = (fields) => edit({ fields });
  const editField = (i, patch) => setFields(draft.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const editCriterion = (i, k, patch) =>
    editField(i, { criteria: draft.fields[i].criteria.map((c, m) => (m === k ? { ...c, ...patch } : c)) });

  const save = async () => {
    setErr(null);
    setBusy(true);
    try {
      const updated = await api.saveAssignment(courseId, item.itemId, draft);
      setDraft({ instructions: updated.instructions, fields: updated.fields });
      setSaved(true);
      onSaved?.(updated);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: F.heading, fontSize: 19, color: T.neutral900 }}>{item.title}</div>
      <label style={label}>
        Instructions
        <textarea
          aria-label="Instructions"
          value={draft.instructions}
          onChange={(e) => edit({ instructions: e.target.value })}
          rows={4}
          style={{ ...fieldStyle, marginTop: 4, resize: 'vertical' }}
        />
      </label>

      {draft.fields.map((f, i) => {
        const n = i + 1;
        return (
          <div
            key={f.fieldId || `new-${i}`}
            data-testid="assignment-field"
            style={{ border: `1px solid ${T.neutral100}`, borderRadius: 10, padding: '12px 14px', marginTop: 14, background: T.neutral50 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <strong style={{ fontFamily: F.heading, fontSize: 16, color: T.neutral900 }}>Field {n}</strong>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn kind="ghost" style={smallBtn} disabled={i === 0} onClick={() => setFields(move(draft.fields, i, -1))}>
                  Move up
                </Btn>
                <Btn
                  kind="ghost"
                  style={smallBtn}
                  disabled={i === draft.fields.length - 1}
                  onClick={() => setFields(move(draft.fields, i, 1))}
                >
                  Move down
                </Btn>
                <Btn kind="ghost" style={smallBtn} onClick={() => setFields(draft.fields.filter((_, j) => j !== i))}>
                  Remove field
                </Btn>
              </div>
            </div>
            <label style={label}>
              Label (the question or task)
              <input
                aria-label={`Field ${n} label`}
                value={f.label}
                onChange={(e) => editField(i, { label: e.target.value })}
                style={{ ...fieldStyle, marginTop: 4 }}
              />
            </label>
            <label style={label}>
              Guidance for the learner (optional)
              <textarea
                aria-label={`Field ${n} guidance`}
                value={f.prompt || ''}
                onChange={(e) => editField(i, { prompt: e.target.value })}
                rows={2}
                style={{ ...fieldStyle, marginTop: 4, resize: 'vertical' }}
              />
            </label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label style={{ ...label, flex: '1 1 220px' }}>
                Answer type
                <select
                  aria-label={`Field ${n} answer type`}
                  value={f.type}
                  onChange={(e) => editField(i, { type: e.target.value })}
                  style={{ ...fieldStyle, marginTop: 4 }}
                >
                  {Object.entries(fieldTypeLabel).map(([id, text]) => (
                    <option key={id} value={id}>
                      {text}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 10 }}>
                <input
                  type="checkbox"
                  aria-label={`Field ${n} required`}
                  checked={f.required !== false}
                  onChange={(e) => editField(i, { required: e.target.checked })}
                />
                Required
              </label>
            </div>

            <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: T.neutral700 }}>
              Rubric for this field {f.criteria.length ? '' : '(none: this field is not rated on its own)'}
            </div>
            {f.criteria.map((c, k) => (
              <CriterionEditor
                key={c.criterionId || `new-${k}`}
                n={k + 1}
                fieldN={n}
                criterion={c}
                onChange={(patch) => editCriterion(i, k, patch)}
                onRemove={() => editField(i, { criteria: f.criteria.filter((_, m) => m !== k) })}
              />
            ))}
            <div style={{ marginTop: 10 }}>
              <Btn kind="ghost" style={smallBtn} onClick={() => editField(i, { criteria: [...f.criteria, blankCriterion()] })}>
                Add criterion to field {n}
              </Btn>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn kind="ghost" onClick={() => setFields([...draft.fields, blankField()])}>
          Add field
        </Btn>
        <Btn onClick={save} disabled={busy}>
          {busy ? 'Saving...' : 'Save assignment'}
        </Btn>
        {saved && <span style={{ fontSize: 13, color: T.successInk }}>Saved. New submissions use this version.</span>}
      </div>
      <ErrorText>{err}</ErrorText>
    </Card>
  );
}
