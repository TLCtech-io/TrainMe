import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import LMS_CONFIG from './src/lms.config.js';

/* ============================================================================
   LMS Vite configuration

   - Builds the React SPA for static deployment to S3 + CloudFront (the same
     hosting spine as the DST).
   - Injects lms.config.js values into index.html at build time (page title,
     meta description, theme color, page colors, font stylesheet) so the HTML
     metadata comes from the single source of truth, src/lms.config.js.

   To customize for a different organization, edit src/lms.config.js. This
   file should not need changes per build.

   Not carried over from the DST on purpose: the Cognito `global` polyfill
   (added in Sprint 4 if amazon-cognito-identity-js is used) and Mapbox.
   ============================================================================ */

// Plugin: substitute %LMS_*% placeholders in index.html. Fails the build if a
// placeholder is left unresolved, so a renamed config key cannot silently ship
// a literal "%LMS_...%" into the page. Runs with order 'pre' so substitution
// happens before Vite parses the HTML: a placeholder inside an href (the font
// stylesheet) is otherwise URI-decoded by Vite and fails as malformed.
function lmsHtmlInject() {
  return {
    name: 'lms-html-inject',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const subs = {
          '%LMS_TITLE%':            LMS_CONFIG.org.titleLong,
          '%LMS_META_DESCRIPTION%': LMS_CONFIG.org.metaDescription,
          '%LMS_THEME_COLOR%':      LMS_CONFIG.theme.neutral900,
          '%LMS_COLOR_BG%':         LMS_CONFIG.theme.neutral50,
          '%LMS_COLOR_INK%':        LMS_CONFIG.theme.neutral900,
          '%LMS_FONT_BODY%':        LMS_CONFIG.fonts.body,
          '%LMS_FONTS_HREF%':       LMS_CONFIG.fonts.googleFontsHref,
        };
        let out = html;
        for (const [key, value] of Object.entries(subs)) {
          if (value === undefined) throw new Error(`lms-html-inject: no config value for ${key}`);
          out = out.replaceAll(key, value);
        }
        const left = out.match(/%LMS_[A-Z_]+%/);
        if (left) throw new Error(`lms-html-inject: unresolved placeholder ${left[0]} in index.html`);
        return out;
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), lmsHtmlInject()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  // Dev server stays on localhost by default. To test on a phone or tablet
  // over the LAN, run `npm run dev -- --host` for that session only (the
  // dev server is not hardened for network exposure; see README).
  server: {
    port: 5173,
  },
});
