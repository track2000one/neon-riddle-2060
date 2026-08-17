(() => {
  'use strict';

  const academy = window.NEON_ACADEMY;
  const bank = window.NEON_EXAM_BANK;
  if (!academy || !bank) return;

  const BUILD_REV = window.NEON_ASSET_REV || 'unversioned';
  let queued = false;

  function versioned(href) {
    return `${href}${href.includes('?') ? '&' : '?'}v=${encodeURIComponent(BUILD_REV)}`;
  }

  function ensureStyles() {
    for (const href of ['exam-center.css', 'exam-visuals.css']) {
      const requestHref = versioned(href);
      const absolute = new URL(requestHref, document.baseURI).href;
      if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href === absolute)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = requestHref;
      document.head.appendChild(link);
    }
  }

  function activeQuestions() {
    return (academy.questionBank || []).filter(question => question?.area === 'exams' && question.active !== false);
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element && element.textContent !== String(value)) element.textContent = String(value);
  }

  function render() {
    queued = false;
    ensureStyles();
    const questions = activeQuestions();
    setText('examCenterTotal', questions.length.toLocaleString('ar-SA'));

    for (const subject of bank.meta?.subjects || []) {
      const count = questions.filter(question => question.subject === subject.id).length;
      setText(`count-${subject.id}`, `${count.toLocaleString('ar-SA')} سؤال`);
    }

    const section = document.getElementById('test-center');
    if (section) {
      section.dataset.build = BUILD_REV;
      section.dataset.activeExamQuestions = String(questions.length);
      const eyebrow = section.querySelector('.exam-center-heading .eyebrow');
      if (eyebrow) eyebrow.textContent = 'SAUDI TEST PREPARATION CENTER';
    }

    window.NEON_EXAM_CENTER_DIAGNOSTICS = {
      build: BUILD_REV,
      activeExamQuestions: questions.length,
      academyQuestions: (academy.questionBank || []).length,
      bankQuestions: (bank.questions || []).length,
      subjects: Object.fromEntries((bank.meta?.subjects || []).map(subject => [
        subject.id,
        questions.filter(question => question.subject === subject.id).length
      ])),
      repairedImport: window.NEON_RECENT_EXAM_IMPORT_REPAIR_REPORT || null,
      audit: window.NEON_PLATFORM_AUDIT_REPORT || null,
      renderedAt: new Date().toISOString()
    };
  }

  function schedule() {
    if (queued) return;
    queued = true;
    (window.requestAnimationFrame || (callback => setTimeout(callback, 16)))(render);
  }

  document.addEventListener('neon:exam-bank-repaired', schedule);
  document.addEventListener('neon:language-changed', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  render();
})();
