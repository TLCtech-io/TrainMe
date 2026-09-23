/* ============================================================================
   COMPLETION + CERTIFICATE
   Shown at the top of the course page once the course is complete (every
   required item done). The certificate card is a stand-in for the
   generated PDF. certificate is null for a course with certificates
   turned off (certificateEnabled: false): completion shows, the card and
   the email notice do not.
   ============================================================================ */

import React, { useState, useEffect } from 'react';
import LMS_CONFIG from '../lms.config.js';
import { T, F } from '../theme.js';
import { Btn } from '../components/primitives.jsx';

const { copy, features } = LMS_CONFIG;

export default function CompletionPanel({ api, courseId, certificate, onExit }) {
  const [outbox, setOutbox] = useState([]);
  useEffect(() => {
    // Only certificate emails: evaluation emails in the same outbox carry no cert.
    api._outbox().then((o) => setOutbox(o.filter((m) => m.kind === 'certificate' && m.courseId === courseId)));
  }, [api, courseId]);

  return (
    <div
      style={{
        background: T.white,
        borderRadius: 14,
        border: `1px solid ${T.neutral100}`,
        padding: 32,
        boxShadow: '0 1px 2px rgba(15,23,42,.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            background: T.successSoft,
            display: 'grid',
            placeItems: 'center',
            fontSize: 20,
          }}
        >
          ✓
        </div>
        <h2 style={{ margin: 0, fontFamily: F.heading, fontSize: 24, color: T.neutral900 }}>
          {copy.completionTitle}
        </h2>
      </div>
      {certificate ? (
        <p style={{ fontSize: 14, color: T.neutral700, lineHeight: 1.6, marginTop: 4 }}>
          Your completion was recorded
          {certificate.score != null && (
            <>
              {' '}with a score of <strong>{certificate.score}</strong>
            </>
          )}
          . A certificate has been issued and emailed.
        </p>
      ) : (
        <p style={{ fontSize: 14, color: T.neutral700, lineHeight: 1.6, marginTop: 4 }}>
          Your completion was recorded. This course does not issue a certificate.
        </p>
      )}

      {/* certificate preview (stand-in for the generated PDF) */}
      {certificate && (
        <div
          style={{
            marginTop: 18,
            border: `2px solid ${T.accent500}`,
            borderRadius: 12,
            padding: '28px 32px',
            background: `linear-gradient(135deg, ${T.neutral900}, ${T.neutral800})`,
            color: T.white,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: '.18em', color: T.accent400, fontWeight: 600 }}>
            {copy.certificateHeading}
          </div>
          <div
            style={{
              fontFamily: F.heading,
              fontSize: 30,
              fontWeight: 700,
              margin: '14px 0 6px',
            }}
          >
            {certificate.learnerName}
          </div>
          <div style={{ fontSize: 13, color: T.neutral300 }}>{copy.certificateLine}</div>
          <div style={{ fontSize: 17, fontWeight: 600, margin: '8px 0 16px' }}>
            {certificate.courseTitle}
          </div>
          <div style={{ fontSize: 11, color: T.neutral500 }}>
            Credential ID {certificate.credentialId} - issued{' '}
            {new Date(certificate.issuedAt).toLocaleDateString()}
            {certificate.expiresAt && ` - expires ${new Date(certificate.expiresAt).toLocaleDateString()}`}
          </div>
        </div>
      )}

      {features.sandboxHints && certificate && outbox.length > 0 && (
        <div
          style={{
            marginTop: 18,
            background: T.neutral50,
            borderRadius: 10,
            padding: '14px 16px',
            fontSize: 12.5,
            color: T.neutral700,
            fontFamily: F.body,
          }}
        >
          <strong>📧 Email sent</strong> (SES stand-in) - to{' '}
          <code>{outbox[0].to}</code> - subject "{outbox[0].subject}". The real build attaches the
          generated PDF from S3.
        </div>
      )}

      <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
        <Btn onClick={onExit}>Back to catalog</Btn>
        {certificate && (
          <Btn kind="ghost" onClick={() => alert('Real build: downloads the PDF from S3 (presigned URL).')}>
            Download PDF
          </Btn>
        )}
      </div>
    </div>
  );
}
