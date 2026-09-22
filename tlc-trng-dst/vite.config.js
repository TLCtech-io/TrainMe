import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import DST_CONFIG from './src/dst.config.js';

/* ============================================================================
   DST Vite configuration

   - Builds the React SPA for static deployment to S3 + CloudFront
   - Injects dst.config.js values into index.html at build time (page title,
     meta description, theme color, background, etc) so the HTML metadata is
     customized from a single source of truth (src/dst.config.js)
   - Polyfills the Node-style `global` symbol for amazon-cognito-identity-js,
     which references it from its bundled buffer dependency

   To customize for a different organization, edit src/dst.config.js. This
   file should not need changes per build.
   ============================================================================ */

// Plugin: substitute %DST_*% placeholders in index.html at build time. Only
// metadata-level subs remain after Sprint 1 (Cognito) replaced the password
// gate; the gate-specific placeholders (DST_ACCESS_CODE, DST_SESSION_KEY,
// gate color tokens) are no longer needed.
function dstHtmlInject() {
  return {
    name: 'dst-html-inject',
    transformIndexHtml(html) {
      const subs = {
        '%DST_TITLE_LONG%':       DST_CONFIG.org.titleLong,
        '%DST_TITLE_SHORT%':      DST_CONFIG.org.titleShort,
        '%DST_META_DESCRIPTION%': DST_CONFIG.org.metaDescription,
        '%DST_THEME_COLOR%':      DST_CONFIG.theme.darkBlue,
        '%DST_TOOL_NAME%':        DST_CONFIG.org.toolName,
        '%DST_PORT_FOOTER%':      DST_CONFIG.copy.portFooter,
        '%DST_COLOR_BG%':         DST_CONFIG.theme.bgAlt,
        '%DST_COLOR_INK%':        DST_CONFIG.theme.ink,
      };
      let out = html;
      for (const [key, value] of Object.entries(subs)) {
        out = out.replaceAll(key, value);
      }
      return out;
    },
  };
}

export default defineConfig({
  plugins: [react(), dstHtmlInject()],
  base: './',
  // Cognito SDK polyfill: amazon-cognito-identity-js references the Node-style
  // `global` symbol from its bundled buffer dependency. The script in index.html
  // covers runtime references; the defines below cover pre-bundle and build time.
  // If dev mode still fails after changing this, delete node_modules/.vite to
  // force a re-bundle with the new defines.
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  server: {
    host: true,
    port: 5173,
  },
});
