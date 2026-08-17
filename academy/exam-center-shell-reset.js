(() => {
  'use strict';

  const existing = document.getElementById('test-center');
  const report = {
    removedExistingSection: Boolean(existing),
    previousTotal: existing?.querySelector('#examCenterTotal,.exam-center-total strong,.adaptive-exam-total strong')?.textContent?.trim() || '',
    previousEyebrow: existing?.querySelector('.exam-center-heading .eyebrow,.eyebrow')?.textContent?.trim() || '',
    resetAt: new Date().toISOString()
  };

  if (existing) existing.remove();

  // exam-center-ui.js runs immediately after this file and recreates #test-center
  // from the live NEON_ACADEMY question bank instead of preserving cached shell markup.
  window.NEON_EXAM_CENTER_SHELL_RESET_REPORT = report;
})();
