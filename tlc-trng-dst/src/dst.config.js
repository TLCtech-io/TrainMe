/* ============================================================================
   DST CONFIG — Organization-specific values
   ============================================================================
   This file centralizes everything that changes when the DST is built for a
   different organization. To customize, edit the values below. Logic and
   structure live in App.jsx and do not change between organizations.

   This build: TLC_TRNG demo (slate + amber palette, generic industrial sample
   data). Org name "Meridian Industries" used in the source CSVs has been
   substituted to "TLC_TRNG" throughout the data files. See README.md for the
   build provenance.

   For new builds, also replace:
     - Data files in src/data/   (assets.json, edges.json, depLookup.json,
                                  personnel.json, directors.json)
     - Logo and favicon files in public/
     - Brand guide PDF (optional, for reference only)
   ============================================================================ */

const config = {

  /* --------------------------------------------------------------------------
     ORGANIZATION IDENTITY
     -------------------------------------------------------------------------- */
  org: {
    fullName:    'TLC TRNG, LLC',
    shortName:   'TLC_TRNG',
    toolName:    'Decision Support Tool',
    toolShort:   'DST',
    titleLong:   'TLC_TRNG Decision Support Tool',
    titleShort:  'TLC_TRNG DST',
    homeTitle:   'TLC_TRNG DST Home',
    tagline:     'Prioritization reference for TLC_TRNG leadership during disruptions to critical processes, systems, and facilities.',
    metaDescription: 'TLC TRNG, LLC Decision Support Tool',
    emailDomain: 'tlctrng.com',
  },

  /* --------------------------------------------------------------------------
     DEMO ACCESS GATE - UNUSED as of Sprint 1 (Cognito auth replaces this)
     The shared password gate that fronted the app is removed in favor of real
     Cognito authentication. This value is retained in the config in case a
     future build wants to re-enable a second auth layer in front of Cognito.
     -------------------------------------------------------------------------- */
  demo: {
    accessCode: 'tlctrng-2026',
  },

  /* --------------------------------------------------------------------------
     BRAND COLORS — Slate & Amber
     Two-tone palette: cool slate for structure and chrome, warm amber for
     accents and calls-to-action.

     Token mapping note: App.jsx uses legacy PCCA-era color slot names
     (darkBlue, navy, teal, etc.). For this build we keep those slot names
     but populate them with slate-and-amber values. The role of each slot is
     described inline below.
     -------------------------------------------------------------------------- */
  theme: {
    // Primary structural color (header backgrounds, dark surfaces, CTA fills)
    // Was PCCA blue; now slate-800.
    darkBlue:   '#1E293B',
    // Secondary structural color (gradient stops, depth in dark areas)
    // Was PCCA navy; now slate-700.
    navy:       '#334155',
    // Accent color (highlights, badges, score chips on light)
    // Was PCCA teal; now amber-500.
    teal:       '#F59E0B',
    // Lighter accent (soft fills, hover states)
    // Was PCCA light teal; now amber-300.
    lightTeal:  '#FCD34D',
    // Saturated accent (used in map decoration, channel overlay if present)
    // Was PCCA turquoise; now amber-600.
    turquoise:  '#D97706',
    // Pale accent fill
    // Was PCCA light green; now amber-100.
    lightGreen: '#FEF3C7',
    // Neutral mid-gray for muted text and divider rules
    // Was PCCA gray; now slate-500.
    gray:       '#64748B',

    // Surfaces
    bg:         '#FFFFFF',
    bgAlt:      '#F8FAFC',     // slate-50
    surface:    '#FFFFFF',
    surfaceAlt: '#F1F5F9',     // slate-100

    // Ink (text)
    ink:        '#0F172A',     // slate-900
    ink2:       '#334155',     // slate-700
    ink3:       '#64748B',     // slate-500
    rule:       '#CBD5E1',     // slate-300
    ruleSoft:   '#E2E8F0',     // slate-200

    // Score bands. Warm-for-urgent, cool-for-routine.
    critical:     '#7C2D12',   // orange-900
    criticalSoft: '#FED7AA',   // orange-200
    high:         '#78350F',   // amber-900
    highSoft:     '#FEF3C7',   // amber-100
    moderate:     '#1E293B',   // slate-800
    moderateSoft: '#E2E8F0',   // slate-200
    low:          '#64748B',   // slate-500
    lowSoft:      '#F8FAFC',   // slate-50
  },

  /* --------------------------------------------------------------------------
     DEPARTMENT COLORS
     Used to color department chips and accents throughout the app. Department
     names here MUST match the `dept` field values in personnel.json and
     assets.json. If a department appears in data but isn't listed here, it
     gets a default gray color.

     Values are the darker text-pair from the brand spec's Tailwind chip
     mapping (e.g., amber-800 for the Operations chip).
     -------------------------------------------------------------------------- */
  deptColors: {
    'Operations':                '#92400E',  // amber-800
    'Engineering & Maintenance': '#334155',  // slate-700
    'Information Technology':    '#075985',  // sky-800
    'Facilities Management':     '#44403C',  // stone-700
    'Security':                  '#9F1239',  // rose-800
    'Human Resources':           '#5B21B6',  // violet-800
    'Finance':                   '#065F46',  // emerald-800
    'Emergency Management':      '#7C2D12',  // orange-900
    'Supply Chain':              '#854D0E',  // yellow-800
  },

  /* --------------------------------------------------------------------------
     TYPOGRAPHY
     Font families used throughout the app UI. These should be loaded via
     Google Fonts in index.html. Update both this config AND the index.html
     <link> tag when changing fonts.
     -------------------------------------------------------------------------- */
  fonts: {
    heading:  '"Zilla Slab", serif',     // Titles, large numbers, brand text
    body:     'Poppins, sans-serif',     // All UI text, buttons, labels
  },

  /* --------------------------------------------------------------------------
     LOGO AND FAVICON
     Paths are relative to the public/ folder (Vite serves /public at root).
     The TLC_TRNG circle logo is square (500x500), so aspect ratio is 1.0.
     -------------------------------------------------------------------------- */
  logo: {
    stackedSrc:         '/tlc-trng-logo-stacked.png',
    stackedAspectRatio: 1.0,
    horizontalSrc:      '/tlc-trng-logo-horizontal.png',
    whiteSrc:           '/tlc-trng-logo-white.png',
    whiteAspectRatio:   1.347,
    altText:            'TLC TRNG, LLC',
  },

  // Overview / instructions reference PDF, opened in a new tab. Served as a
  // static file from the app's public folder.
  overviewPdf: '/overview.pdf',

  /* --------------------------------------------------------------------------
     ASSET CATEGORIES
     The three top-level asset categories on the home screen. The `type`
     values must match the data file's conventions exactly.
     -------------------------------------------------------------------------- */
  categories: [
    {
      key:      'processes',
      type:     'Process',
      label:    'Processes',
      desc:     'Critical business and operational processes.',
      iconKey:  'Activity',
    },
    {
      key:      'systems',
      type:     'System',
      label:    'Systems & Technology',
      desc:     'Applications, infrastructure, and communications.',
      iconKey:  'Server',
    },
    {
      key:      'facilities',
      type:     'Facility',
      label:    'Facilities',
      desc:     'Critical physical assets and workspaces.',
      iconKey:  'Building2',
    },
  ],

  /* --------------------------------------------------------------------------
     OPERATIONAL CATEGORY LEGEND
     Displayed in the priority guide sheet. Labels here MUST match the
     `opCategory` values present in assets.json so the legend explains what
     users see in the data. The TLC_TRNG demo dataset uses the same four
     labels as PCCA: Life Safety, Critical Operations, Critical Admin, Other.
     (Note: the brand spec accompanying the demo CSVs mentioned a
     "Customer-Affecting" label for category 3, but the actual CSV uses
     "Critical Admin". The data wins; this legend matches the data.)
     -------------------------------------------------------------------------- */
  opCategoryLegend: [
    { n: 1, l: 'Life Safety' },
    { n: 2, l: 'Critical Operations' },
    { n: 3, l: 'Critical Admin' },
    { n: 4, l: 'Other' },
  ],

  /* --------------------------------------------------------------------------
     MAP BOUNDING BOX
     Latitude/longitude bounds used by the full-org map screen. Choose values
     that comfortably contain all facility pins. The PCCA build had this
     hardcoded to the Corpus Christi area; for TLC_TRNG demo data we use the
     bounds that contain the sample facilities (clustered near 38.9, -77.04).

     As of Sprint 2 (real Mapbox map) the live map auto-fits to the facility
     markers, so these bounds are now a fallback only: used when no facilities
     have coordinates, and as documentation of the expected facility area.
     showShipChannel and the channel fields are retained for config
     compatibility but are no longer rendered (the real basemap shows the
     actual waterway). They can be removed once no build references them.
     -------------------------------------------------------------------------- */
  map: {
    minLat: 38.880,
    maxLat: 38.920,
    minLng: -77.060,
    maxLng: -77.015,
    showShipChannel: false,
    channelLatTop:    null,
    channelLatBottom: null,
    channelLabel:     '',
  },

  /* --------------------------------------------------------------------------
     MAPBOX — Real interactive basemap (Sprint 2)

     Replaces the schematic SVG map with Mapbox GL JS. The token is a PUBLIC
     token (pk.*), which is the correct kind to embed in a frontend build.
     IMPORTANT: this token must have URL restrictions set on the Mapbox side
     (https://tlctrng.demo-dst.com and http://localhost:5173) so a scraped
     copy cannot be used on another domain. When porting to another build,
     swap in that build's own token and add its production URL to the
     restriction list.

     defaultStyle: which base style loads first. The in-map layers button
     toggles between 'streets' and 'satellite'.

     If token is empty, the map screen renders a clear "map needs a token"
     placeholder instead of a broken/blank map.
     -------------------------------------------------------------------------- */
  mapbox: {
    token: 'pk.eyJ1IjoidGxjdGVjaCIsImEiOiJjbXFnMGR2M24wMXk2MnNxNGJ3dXM5bHVhIn0.cLlfgwiS18DQp2CTk5tATQ',
    defaultStyle: 'streets',   // 'streets' | 'satellite'
    styles: {
      streets:   'mapbox://styles/mapbox/streets-v12',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    },
  },

  /* --------------------------------------------------------------------------
     WEATHER — Optional live weather overlays on the map (Sprint 2.5)

     radar: animated NWS/NOAA base-reflectivity radar loop. Sourced from
     NOAA's time-enabled ImageServer via its WMS interface, which Mapbox
     consumes as a raster source. The loop steps through the service's
     4-hour moving window. All government sources, no API key.

       enabled:      master switch for the radar feature
       wmsBase:      WMS endpoint (GetMap requests are built from this)
       layer:        WMS layer id (0 = the radar mosaic)
       windowHours:  how far back the loop reaches (service max is 4)
       stepMinutes:  spacing between frames (service updates ~5-10 min)
       frameMs:      playback speed (ms each frame is shown)
       opacity:      overlay opacity so basemap/markers stay readable

     If enabled is false, the weather button is hidden and no NOAA requests
     are made. If NOAA is unreachable, the map still works; the radar simply
     fails to animate.
     -------------------------------------------------------------------------- */
  weather: {
    radar: {
      enabled: true,
      wmsBase: 'https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer',
      layer: 'radar_base_reflectivity_time',
      windowHours: 4,
      stepMinutes: 10,
      frameMs: 600,
      opacity: 0.65,
    },

    /* ------------------------------------------------------------------------
       FORECAST — current conditions + multi-horizon forecast strip below the
       map, from the NWS api.weather.gov service (free, no key, US only).

       The strip shows one "Current" card (live measured observation from the
       nearest station) followed by forecast cards at the horizons below.

       Data path (all derived at runtime from facility coordinates):
         1. centroid of facilities -> /points/{lat,lng}
         2. that returns forecastHourly + observationStations URLs
         3. hourly forecast feeds the horizon cards
         4. nearest station's latest observation feeds the Current card

       enabled:    master switch for the forecast strip
       apiBase:    NWS API root
       userAgent:  REQUIRED by NWS or requests 403. Identify the app + a
                   contact. Edit the contact per deployment.
       horizons:   forecast cards to show, each an hours-ahead window with a
                   label. Current conditions are always shown first separately.
       refreshMinutes: how often to re-pull (NWS updates hourly; 30 is plenty)
       ------------------------------------------------------------------------ */
    forecast: {
      enabled: true,
      apiBase: 'https://api.weather.gov',
      userAgent: 'TLC-TRNG-DST (travis@tlctrng.com)',
      horizons: [
        { key: '1h',  label: 'Next Hour', hours: 1 },
        { key: '4h',  label: '4 Hour',    hours: 4 },
        { key: '12h', label: '12 Hour',   hours: 12 },
        { key: '24h', label: '24 Hour',   hours: 24 },
      ],
      refreshMinutes: 30,
    },

    /* ------------------------------------------------------------------------
       ALERTS — NWS active watch/warning polygons over the facility area.

       Drawn as GeoJSON polygons on the full map, on by default (safety-
       critical). Tapping a polygon shows the warning detail. Sourced from
       api.weather.gov /alerts/active?point={centroid}. We keep only the
       polygon-bearing warning events listed below (tornado, severe
       thunderstorm, flash flood, etc.) — zone-based alerts (winter storm,
       heat, fire) don't carry polygons and are intentionally excluded for now.

       enabled:        master switch
       apiBase:        NWS API root (shares forecast's host)
       defaultOn:      whether the layer is visible on map open
       refreshMinutes: re-poll cadence (NWS updates ~every 2 min; 5 is safe)
       events:         the warning types to draw (substring match on `event`)
       severityColors: fill/line color by NWS severity
       ------------------------------------------------------------------------ */
    alerts: {
      enabled: true,
      apiBase: 'https://api.weather.gov',
      defaultOn: true,
      refreshMinutes: 5,
      /* TEST MODE (temporary sandbox aid — REMOVE before PCCA port).
         When true, alerts are NOT scoped to the facility centroid. Instead the
         app pulls active warnings nationwide and centers the map on the first
         polygon found, so the alert UI (flashing button, polygon, tap popup)
         can be exercised whenever any qualifying warning is active anywhere in
         the US. Set false for normal facility-area behavior. */
      testMode: true,
      // Trigger an alert when a qualifying warning polygon comes within this
      // many miles of the facility centroid (intersects a circle of this
      // radius). Catches nearby/approaching warnings, not just ones directly
      // over the centroid. Used in normal (non-test) mode.
      proximityMiles: 25,
      // State(s) to query for active alerts in normal mode (NWS area query,
      // which returns full polygon geometry — the point query can omit it).
      area: 'DC',
      events: [
        'Tornado Warning',
        'Severe Thunderstorm Warning',
        'Flash Flood Warning',
        'Flood Warning',
        'Extreme Wind Warning',
        'Snow Squall Warning',
        'Special Marine Warning',
        'Dust Storm Warning',
      ],
      severityColors: {
        Extreme:  '#B91C1C',
        Severe:   '#DC2626',
        Moderate: '#F59E0B',
        Minor:    '#FACC15',
        Unknown:  '#F59E0B',
      },
    },
  },

  /* --------------------------------------------------------------------------
     SEED USERS
     Pre-seeded user list shown in the mockup auth flow. After Sprint 1
     (Cognito), this is replaced by real auth. Until then, edit per build.
     At least one admin must be active so the Admin Portal is reachable.

     For the demo, we include:
       - Travis (consultant admin)
       - Two TLC_TRNG admin demo accounts (drawn from the sample personnel)
       - One regular user demo account
       - One pending account (demonstrates the "pending activation" gate)
       - One deactivated account (demonstrates the "deactivated" gate)
     -------------------------------------------------------------------------- */
  seedUsers: [
    { id: 'u-1', email: 'travis@TLCTRNG.com',          name: 'Travis Cryan',         role: 'admin', status: 'active',
      authMode: 'passwordless', lastLogin: '2026-04-26T15:00:00Z', invitedAt: '2026-03-10T09:00:00Z' },
    { id: 'u-2', email: 'mchen@tlctrng.com',           name: 'Marcus Chen',          role: 'admin', status: 'active',
      authMode: 'passwordless', lastLogin: '2026-04-25T08:42:00Z', invitedAt: '2026-03-10T09:05:00Z' },
    { id: 'u-3', email: 'pramaswamy@tlctrng.com',      name: 'Priya Ramaswamy',      role: 'admin', status: 'active',
      authMode: 'passwordless', lastLogin: '2026-04-23T14:18:00Z', invitedAt: '2026-03-10T09:10:00Z' },
    { id: 'u-4', email: 'rnakashima@tlctrng.com',      name: 'Robert Nakashima',     role: 'user',  status: 'active',
      authMode: 'password',     lastLogin: '2026-04-20T11:55:00Z', invitedAt: '2026-03-12T10:00:00Z' },
    { id: 'u-5', email: 'pending.demo@tlctrng.com',    name: 'Pending Demo User',    role: 'user',  status: 'pending',
      authMode: 'passwordless', lastLogin: null,                   invitedAt: '2026-04-24T16:30:00Z' },
    { id: 'u-6', email: 'inactive.demo@tlctrng.com',   name: 'Inactive Demo User',   role: 'user',  status: 'deactivated',
      authMode: 'passwordless', lastLogin: '2026-02-10T09:15:00Z', invitedAt: '2026-01-20T08:00:00Z' },
  ],

  /* --------------------------------------------------------------------------
     COPY - Strings that appear in the UI and contain org-specific references
     -------------------------------------------------------------------------- */
  copy: {
    acceptableUseNotice: 'By signing in you agree to use this tool consistent with TLC_TRNG acceptable-use policy.',
    portFooter:          'TLC TRNG, LLC · Decision Support Tool',
    contactsSourceNote:  'Contact data sourced from TLC_TRNG personnel records (sample dataset for this demo).',
    mapHeaderTitle:      'TLC_TRNG Site Map',
    adminPortalBlurb:    'Invite, update, and manage access for TLC_TRNG DST users. Only signed-in admins can see this portal.',
    mapPinLabel:         'TLC_TRNG facility',
    reportFooter:        'Generated by TLC_TRNG Decision Support Tool',
  },

  /* --------------------------------------------------------------------------
     AUTHENTICATION - AWS Cognito User Pool (Sprint 1)
     Real authentication backend. Replaces the mockup auth used in earlier
     versions. Values captured from the auth stack outputs (deployed via
     dst-auth-cloudformation.yaml under the stack name "tlctrng-dst-auth-stack").
     -------------------------------------------------------------------------- */
  cognito: {
    region:      'us-east-2',
    userPoolId:  'us-east-2_3tqzC2SvO',
    appClientId: '7cesdcbto1faommuccf1bns09t',
  },

  /* --------------------------------------------------------------------------
     ADMIN API - API Gateway endpoints for admin operations (Sprint 1)
     Each endpoint is JWT-authorized via the Cognito User Pool above. Lambdas
     behind these routes call AdminCreateUser, AdminDisableUser, AdminEnableUser,
     AdminSetUserPassword, and AdminUpdateUserAttributes on the user pool.
     -------------------------------------------------------------------------- */
  api: {
    baseUrl: 'https://2f26y4pt1d.execute-api.us-east-2.amazonaws.com',
    endpoints: {
      invite:        '/admin/invite',
      deactivate:    '/admin/deactivate',
      reactivate:    '/admin/reactivate',
      resetPassword: '/admin/reset-password',
      changeRole:    '/admin/change-role',
    },
  },

};

export default config;
