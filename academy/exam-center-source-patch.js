(() => {
  'use strict';

  const imported = window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || [];
  if (!imported.length) return;

  function normalize(value) {
    const digits = '٠١٢٣٤٥٦٧٨٩';
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, digit => String(digits.indexOf(digit)))
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, '');
  }

  const sourceMap = new Map(imported.map(question => [normalize(question.q), question]));

  function updateSourceDisplay() {
    const questionElement = document.querySelector('.center-exam-screen .exam-question');
    const sourceElement = document.querySelector('.center-exam-screen .center-source-line');

    if (questionElement && sourceElement) {
      const question = sourceMap.get(normalize(questionElement.textContent));
      if (question) {
        const page = question.sourcePage ? ` • الصفحة ${Number(question.sourcePage).toLocaleString('ar-SA')}` : '';
        sourceElement.textContent = `${question.source}${page}`;
      }
    }

    const quduratEyebrow = document.querySelector('.qudurat-family .eyebrow');
    if (quduratEyebrow) quduratEyebrow.textContent = 'GENERAL APTITUDE TEST';

    const note = document.querySelector('.exam-source-note');
    if (note && note.dataset.importReviewApplied !== 'true') {
      const report = window.NEON_EXAM_DEDUPE_REPORT || {};
      const stats = window.NEON_IMPORTED_EXAM_SOURCE_STATS || {};
      const visualCount = Number(stats.visualQuant || 0);
      note.dataset.importReviewApplied = 'true';
      note.innerHTML = `<strong>تنبيه:</strong> المحتوى تدريبي غير رسمي. تمت مراجعة المرفقات وإضافة ${Number(stats.total || imported.length).toLocaleString('ar-SA')} سؤالًا واضحًا${visualCount ? `، منها <b>${visualCount.toLocaleString('ar-SA')}</b> سؤال قدرات كمي برسومات متجهية دقيقة` : ''}. استُبعدت الصور غير الواضحة أو المشتتة، وحُذف المكرر آليًا${Number(report.removedInsideBanks || 0) ? ` (${Number(report.removedInsideBanks).toLocaleString('ar-SA')} مكررًا)` : ''}.`;
    }
  }

  const observer = new MutationObserver(updateSourceDisplay);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  updateSourceDisplay();
})();
