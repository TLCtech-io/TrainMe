/* ============================================================================
   SIGN IN
   Calls api.signIn and hands { token, profile } to the app shell. With
   features.sandboxHints on, the form is prefilled and the demo accounts are
   listed; both come from lms.config.js (sandbox section).
   ============================================================================ */

import React, { useState } from 'react';
import LMS_CONFIG from '../lms.config.js';
import { T, F } from '../theme.js';
import { DISPLAY_VERSION } from '../version.js';
import { Btn } from '../components/primitives.jsx';

const { copy, brand, features, sandbox } = LMS_CONFIG;

export default function SignIn({ api, onSignedIn }) {
  const [email, setEmail] = useState(features.sandboxHints ? sandbox.prefillEmail : '');
  const [password, setPassword] = useState(features.sandboxHints ? sandbox.password : '');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { token, profile } = await api.signIn(email, password);
      onSignedIn(token, profile);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const field = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: 8,
    border: `1px solid ${T.neutral300}`,
    fontFamily: F.body,
    fontSize: 14,
    marginTop: 6,
    background: T.white,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: `radial-gradient(120% 100% at 50% 0%, ${T.neutral800} 0%, ${T.neutral900} 60%)`,
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: T.white,
          borderRadius: 16,
          padding: '36px 32px',
          boxShadow: '0 24px 60px rgba(0,0,0,.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>{brand.mark}</span>
          <span
            style={{
              fontFamily: F.heading,
              fontWeight: 700,
              fontSize: 22,
              color: T.neutral900,
              letterSpacing: '.02em',
            }}
          >
            {brand.wordmark}
          </span>
        </div>
        <div
          style={{
            fontFamily: F.body,
            fontSize: 13,
            color: T.neutral500,
            marginBottom: 26,
          }}
        >
          {copy.signInTagline} - {DISPLAY_VERSION}
        </div>

        <label style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: T.neutral700 }}>
          Email
          <input style={field} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div style={{ height: 16 }} />
        <label style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: T.neutral700 }}>
          Password
          <input
            type="password"
            style={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>

        {err && (
          <div
            style={{
              marginTop: 16,
              fontFamily: F.body,
              fontSize: 13,
              color: T.danger,
            }}
          >
            {err}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Btn onClick={submit} disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in...' : 'Sign in'}
          </Btn>
        </div>

        {features.sandboxHints && (
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: `1px solid ${T.neutral100}`,
              fontFamily: F.body,
              fontSize: 12,
              color: T.neutral500,
              lineHeight: 1.7,
            }}
          >
            <strong style={{ color: T.neutral700 }}>Sandbox accounts</strong> (password{' '}
            <code>{sandbox.password}</code>):<br />
            {sandbox.accounts.join(' - ')}
          </div>
        )}
      </div>
    </div>
  );
}
