(() => {
  'use strict';
  try {
    window.NEON_RESTORE_EXAM_OPTION_SEMANTICS?.();
  } finally {
    delete window.NEON_RESTORE_EXAM_OPTION_SEMANTICS;
  }
})();
