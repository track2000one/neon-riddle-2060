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

    const note = document.querySelector('.exam-source-note');
    if (note && note.dataset.importReviewApplied !== 'true') {
      const report = window.NEON_EXAM_DEDUPE_REPORT || {};
      const stats = window.NEON_IMPORTED_EXAM_SOURCE_STATS || {};
      note.dataset.importReviewApplied = 'true';
      note.innerHTML = `<strong>تنبيه:</strong> المحتوى تدريبي غير رسمي. تمت مراجعة المرفقات المرفوعة وإضافة ${Number(stats.total || imported.length).toLocaleString('ar-SA')} سؤالًا نصيًا واضحًا، مع استبعاد الأسئلة المعتمدة على صور غير قابلة للعرض وحذف المكرر آليًا${Number(report.removedInsideBanks || 0) ? ` (${Number(report.removedInsideBanks).toLocaleString('ar-SA')} مكررًا)` : ''}.`;
    }
  }

  const observer = new MutationObserver(updateSourceDisplay);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  updateSourceDisplay();
})();
