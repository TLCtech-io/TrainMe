/* Display version, derived from package.json so it cannot drift from the
   build (DST playbook 10.14). Major and minor show; patch does not:
   0.2.0 -> "v0.2". */

import pkg from '../package.json';

export const DISPLAY_VERSION = (() => {
  const parts = String(pkg.version || '0.0.0').split('.');
  return `v${parts[0] || '0'}.${parts[1] || '0'}`;
})();
