(() => {
  'use strict';

  if (window.__NEON_EXAM_SOURCE_VISIBILITY_POLICY__) return;
  window.__NEON_EXAM_SOURCE_VISIBILITY_POLICY__ = true;

  const style = document.createElement('style');
  style.id = 'neonExamSourceVisibilityPolicy';
  style.textContent = `
    .center-source-line,
    .center-review-card .source,
    .question-source,
    .exam-question-source,
    [data-question-source],
    [data-source-page] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  const sourcePattern = /(?:المرفق\s+التدريبي|صفحة\s+الملف|الصفحة\s+\d+|practice\s+attachment|file\s+page|source\s+page)/i;
  const allowedRoots = '.center-exam-screen,.center-exam-result,.center-review,.quick-check,.exam-modal,.lesson-modal';

  function removeVisibleSourceMetadata(root = document) {
    root.querySelectorAll?.(
      '.center-source-line,.center-review-card .source,.question-source,.exam-question-source,[data-question-source],[data-source-page]'
    ).forEach(element => element.remove());

    root.querySelectorAll?.('small,span,p,div').forEach(element => {
      if (element.children.length || !element.closest(allowedRoots)) return;
      const text = element.textContent?.trim() || '';
      if (text && text.length <= 180 && sourcePattern.test(text)) element.remove();
    });
  }

  removeVisibleSourceMetadata();

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof Element) removeVisibleSourceMetadata(node);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
