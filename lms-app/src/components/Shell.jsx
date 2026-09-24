/* ============================================================================
   SHELL / TOP BAR
   App chrome for signed-in users: brand, role-scoped tabs, identity, sign out.
   Every role gets Catalog and Transcript; instructors and admins also get
   Teaching.
   ============================================================================ */

import React from 'react';
import LMS_CONFIG from '../lms.config.js';
import { T, F } from '../theme.js';

export default function Shell({ profile, onSignOut, tab, setTab, children }) {
  // Everyone can take courses (instructors and admins too, as learners);
  // instructors and admins also get the instructor view of what they teach.
  const tabs = [
    ['catalog', 'Catalog'],
    ['transcript', 'Transcript'],
    ...(profile.role === 'instructor' || profile.role === 'admin' ? [['teaching', 'Teaching']] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: T.neutral50, fontFamily: F.body }}>
      <header
        style={{
          background: T.neutral900,
          color: T.white,
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 18 }}>{LMS_CONFIG.brand.mark}</span>
            <span
              style={{
                fontFamily: F.heading,
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: '.02em',
              }}
            >
              {LMS_CONFIG.brand.wordmark}
            </span>
          </div>
          <nav style={{ display: 'flex', gap: 6 }}>
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  background: tab === id ? T.neutral700 : 'transparent',
                  color: tab === id ? T.white : T.neutral300,
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.name}</div>
            <div style={{ fontSize: 11, color: T.accent400, textTransform: 'capitalize' }}>
              {profile.role}
            </div>
          </div>
          <button
            onClick={onSignOut}
            style={{
              background: 'transparent',
              border: `1px solid ${T.neutral700}`,
              color: T.neutral300,
              padding: '7px 12px',
              borderRadius: 7,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px 64px' }}>{children}</main>
    </div>
  );
}
