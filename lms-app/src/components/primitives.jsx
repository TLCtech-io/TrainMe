/* ============================================================================
   SMALL UI PRIMITIVES
   Shared by every screen. Styling is inline and token-driven (theme.js).
   ============================================================================ */

import React from 'react';
import { T, F } from '../theme.js';

export const Btn = ({ children, onClick, kind = 'primary', disabled, style }) => {
  const base = {
    fontFamily: F.body,
    fontWeight: 600,
    fontSize: 14,
    padding: '11px 20px',
    borderRadius: 8,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'transform .08s ease, box-shadow .15s ease, background .15s ease',
    letterSpacing: '.01em',
  };
  const kinds = {
    primary: { background: T.accent500, color: T.neutral900 },
    dark: { background: T.neutral800, color: T.white },
    ghost: {
      background: 'transparent',
      color: T.neutral700,
      border: `1px solid ${T.neutral300}`,
    },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...base, ...kinds[kind], ...style }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'translateY(1px)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {children}
    </button>
  );
};

export const Pill = ({ children, tone = 'neutral' }) => {
  const tones = {
    neutral: { bg: T.neutral100, fg: T.neutral700 },
    accent: { bg: T.accent100, fg: T.accent600 },
    success: { bg: T.successSoft, fg: T.successInk },
  };
  const c = tones[tone];
  return (
    <span
      style={{
        fontFamily: F.body,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        padding: '4px 10px',
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
      }}
    >
      {children}
    </span>
  );
};

// Enrollment status pill, shared by the catalog and the transcript.
// No enrollment reads "Not enrolled" (neutral); enrolled and in_progress
// are accent; completed is success.
export const StatusPill = ({ status }) => {
  const label = !status
    ? 'Not enrolled'
    : status === 'completed'
    ? 'Completed'
    : status === 'in_progress'
    ? 'In progress'
    : 'Enrolled';
  const tone = !status ? 'neutral' : status === 'completed' ? 'success' : 'accent';
  return <Pill tone={tone}>{label}</Pill>;
};

export function SectionHead({ eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {eyebrow && (
        <div
          style={{
            fontFamily: F.body,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: T.accent600,
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
      )}
      <h1
        style={{
          margin: 0,
          fontFamily: F.heading,
          fontSize: 30,
          color: T.neutral900,
          letterSpacing: '.01em',
        }}
      >
        {title}
      </h1>
      {sub && <p style={{ margin: '8px 0 0', fontSize: 14, color: T.neutral500 }}>{sub}</p>}
    </div>
  );
}

export const Loading = ({ label }) => (
  <div style={{ padding: 48, textAlign: 'center', color: T.neutral500, fontFamily: F.body }}>
    {label}…
  </div>
);

export const Empty = ({ label }) => (
  <div
    style={{
      padding: 40,
      textAlign: 'center',
      color: T.neutral500,
      background: T.white,
      borderRadius: 14,
      border: `1px dashed ${T.neutral300}`,
      fontFamily: F.body,
      fontSize: 14,
    }}
  >
    {label}
  </div>
);
