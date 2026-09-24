/* ============================================================================
   SCORM 1.2 RUNTIME MOCK  (faithful to the scorm-again / SCORM 1.2 surface)
   Exposes window.API so embedded content's LMS* calls are captured. Sprint 4
   swaps the body for a scorm-again wrapper; the returned shape stays the same.

   Why snapshot() exists (playbook 10.1): under React StrictMode the player's
   mount effect runs mount / cleanup / mount, and cleanup removes window.API.
   Completion must never read CMI through the global, so snapshot() hands
   back a fresh copy of the live bag whether or not window.API is mounted.
   ============================================================================ */

export function installScormApi(initialCmi, onCommit) {
  const cmi = {
    'cmi.core.lesson_status': 'not attempted',
    'cmi.core.score.raw': '',
    'cmi.core.score.min': '0',
    'cmi.core.score.max': '100',
    'cmi.suspend_data': '',
    'cmi.core.session_time': '00:00:00',
    ...(initialCmi || {}),
  };
  let lastError = '0';

  const API = {
    LMSInitialize: () => {
      lastError = '0';
      return 'true';
    },
    LMSGetValue: (el) => (cmi[el] !== undefined ? String(cmi[el]) : ''),
    LMSSetValue: (el, val) => {
      cmi[el] = val;
      lastError = '0';
      return 'true';
    },
    LMSCommit: () => {
      onCommit({ ...cmi });
      return 'true';
    },
    LMSFinish: () => {
      onCommit({ ...cmi });
      return 'true';
    },
    LMSGetLastError: () => lastError,
    LMSGetErrorString: () => 'No error',
    LMSGetDiagnostic: () => '',
  };

  window.API = API; // SCORM 1.2 content discovers the runtime here
  return {
    api: API,
    // Snapshot accessor: always returns a fresh copy of the live CMI bag,
    // independent of whether window.API is still mounted. This is what the
    // commit/finish path reads, so completion never depends on the global.
    snapshot: () => ({ ...cmi }),
    set: (el, val) => {
      cmi[el] = val;
    },
    teardown: () => {
      if (window.API === API) delete window.API;
    },
  };
}
