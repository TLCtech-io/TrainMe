/* ============================================================================
   LMS CONFIG: Organization-specific values
   ============================================================================
   The LMS analog of the DST's dst.config.js. Everything that changes when the
   LMS is built or re-skinned for a different organization lives here: org
   identity, brand tokens, fonts, copy strings, and feature flags. Components
   read from this module and never hardcode org specifics.

   This build: TLC_TRNG sandbox (slate + amber palette, mock data layer).

   What does NOT live here:
     - Data. Seed users and courses are mock-backend content and live in
       src/api/seed.js (they stand in for Cognito users and COURSE# items).
     - Course content. The stand-in SCO lessons live in src/scorm/mockLessons.js
       (the real build plays SCORM packages from S3 instead).
     - AWS values. Sprint 4 adds `cognito` and `api` sections here, mirroring
       dst.config.js, when the live backend exists.

   Also used at build time: vite.config.js injects values from this file into
   index.html (page title, meta description, theme color, fonts), so the HTML
   metadata comes from this single source of truth too.

   Node-safe: this is plain JS with no Vite-only imports, so the headless tests
   (npm test) can import it directly.
   ============================================================================ */

const config = {

  /* --------------------------------------------------------------------------
     ORGANIZATION IDENTITY
     fullName        legal name, for footers and documents
     shortName       brand short name shown in the app header and sign-in card
     productName     what the platform is called in titles
     titleLong       browser tab title (injected into index.html)
     metaDescription <meta name="description"> (injected into index.html)
     emailDomain     org email domain, for placeholders and future SES sender
     resourcePrefix  AWS resource short-name placeholder (the DST's ShortName).
                     Rename when a real domain or short name is chosen.
     -------------------------------------------------------------------------- */
  org: {
    fullName:        'TLC TRNG, LLC',
    shortName:       'TLC_TRNG',
    productName:     'Learning Platform',
    titleLong:       'TLC_TRNG Learning Platform',
    metaDescription: 'TLC TRNG, LLC Learning Platform',
    emailDomain:     'tlctrng.com',
    resourcePrefix:  'lms',
  },

  /* --------------------------------------------------------------------------
     BRAND MARK
     The sign-in card and app header render `mark` followed by `wordmark`.
     Sprint 0 used an emoji mark; keep it until a processed logo lands (see the
     DST playbook, Section 4, for the logo and favicon pipeline).
     -------------------------------------------------------------------------- */
  brand: {
    mark:     '☁️',
    wordmark: 'TLC_TRNG',
  },

  /* --------------------------------------------------------------------------
     BRAND TOKENS: TLC_TRNG Slate & Amber
     Token names are hue-neutral on purpose: a `neutral` scale for structure
     and chrome, an `accent` scale for calls to action and highlights, and a
     few status colors. A client re-skin (for example, district or department
     branding) swaps the values without leaving misleading names behind. The
     DST learned this the hard way: its PCCA-era slot names (darkBlue, teal)
     now hold slate and amber.

     The TLC_TRNG swatch each token carries is noted inline.
     -------------------------------------------------------------------------- */
  theme: {
    // Neutral scale (slate): text, headers, dark surfaces, borders, page fills
    neutral900: '#0F172A',   // slate-900: headings, app header, darkest surface
    neutral800: '#1E293B',   // slate-800: dark buttons, gradient stops, body ink
    neutral700: '#334155',   // slate-700: secondary ink, active tab, labels
    neutral500: '#64748B',   // slate-500: muted text
    neutral300: '#CBD5E1',   // slate-300: borders, inactive rail segments
    neutral100: '#F1F5F9',   // slate-100: soft borders and dividers, pill fill
    neutral50:  '#F8FAFC',   // slate-50:  page background, table headers

    // Accent scale (amber): calls to action, progress, eyebrows
    accent600:  '#D97706',   // amber-600: eyebrow text, accent ink on light
    accent500:  '#F59E0B',   // amber-500: primary buttons, progress, cert border
    accent400:  '#FBBF24',   // amber-400: accent ink on dark (role label)
    accent100:  '#FEF3C7',   // amber-100: soft accent fill (in-progress pill)

    // Status colors
    successSoft: '#D1FAE5',  // emerald-100: completed pill and check fill
    successInk:  '#047857',  // emerald-700: completed pill text
    danger:      '#EF4444',  // red-500: error text

    white:       '#FFFFFF',
  },

  /* --------------------------------------------------------------------------
     TYPOGRAPHY
     heading / body are CSS font stacks used by every component.
     googleFontsHref is injected into index.html, so the stylesheet that loads
     the fonts and the stacks that use them are edited in one place.
     -------------------------------------------------------------------------- */
  fonts: {
    heading: "'Zilla Slab', Georgia, serif",
    body:    "'Poppins', system-ui, sans-serif",
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap',
  },

  /* --------------------------------------------------------------------------
     COPY
     User-facing strings a client would plausibly customize. Generic control
     labels (Next, Previous, Sign out) stay in the components.
     -------------------------------------------------------------------------- */
  copy: {
    signInTagline:      'Learning platform - sandbox',
    catalogEyebrow:     'Course catalog',
    catalogTitle:       'Available training',
    catalogSubtitle:    'Enroll, complete at your own pace, and earn a certificate.',
    transcriptEyebrow:  'Record of training',
    transcriptTitle:    'Transcript',
    transcriptSubtitle: 'completed and in-progress courses',   // shown after the learner's name
    transcriptEmpty:    'No enrollments yet. Head to the catalog to get started.',
    completionTitle:    'Course complete',
    certificateHeading: 'CERTIFICATE OF COMPLETION',
    certificateLine:    'has successfully completed',
  },

  /* --------------------------------------------------------------------------
     CREDENTIALS (Open Badges forward-compatible; playbook Sections 4 and 6.5)
     issuer         the Open Badges Issuer Profile: who stands behind every
                    certificate. Snapshotted onto each certificate when it is
                    issued, so a later change here never rewrites history.
     verifyBaseUrl  public verification route for a credential ID
                    (verify.<domain>/c/<credentialId>). Null until the domain
                    is chosen (Sprint 7 page, Sprint 8 domain).

     Per-course credential policy (certificate on/off, criteria, skills,
     validity) lives on each course record, not here.
     -------------------------------------------------------------------------- */
  credentials: {
    issuer: {
      name:  'TLC TRNG, LLC',
      email: 'info@TLCTRNG.com',
      url:   'https://TLCTRNG.com',
    },
    verifyBaseUrl: null,
  },

  /* --------------------------------------------------------------------------
     FEATURE FLAGS
     sandboxHints  Shows the sandbox-only helper UI: the demo accounts panel
                   and prefilled credentials on sign-in, the SCORM runtime
                   note in the course player, and the SES stand-in email
                   notice on completion. Turn off for any client-facing build.
     -------------------------------------------------------------------------- */
  features: {
    sandboxHints: true,
  },

  /* --------------------------------------------------------------------------
     SANDBOX ACCOUNTS
     Shown on the sign-in card when features.sandboxHints is on. These must
     match the mock users in src/api/seed.js; test/config.test.js signs in
     with each one to prove it.
     -------------------------------------------------------------------------- */
  sandbox: {
    accounts:     ['student@demo.test', 'instructor@demo.test', 'admin@demo.test'],
    password:     'demo',
    prefillEmail: 'student@demo.test',
  },

};

export default config;
