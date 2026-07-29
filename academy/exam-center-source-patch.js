(() => {
  'use strict';

  const imported = window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || [];
  const bank = window.NEON_EXAM_BANK;
  const academy = window.NEON_ACADEMY;
  const answerLabels = ['أ','ب','ج','د','هـ','و'];

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

  function inferFamily(question) {
    if (question.family) return question.family;
    if (String(question.subject || '').startsWith('qudurat')) return 'qudurat';
    if (String(question.subject || '').startsWith('tahsili')) return 'tahsili';
    return 'other';
  }

  function repairOptionButtons() {
    document.querySelectorAll('.center-exam-screen .exam-option[data-center-answer]').forEach((button, index) => {
      const label = button.querySelector('b');
      if (label && label.textContent !== answerLabels[index]) label.textContent = answerLabels[index] || String(index + 1);
      const screen = button.closest('.center-exam-screen');
      if (screen && !screen.querySelector('.center-answer-feedback')) button.disabled = false;
    });
  }

  function repairSetupControls() {
    if (!bank || !academy) return;
    const questions = academy.questionBank.filter(item => item.area === 'exams' && item.active !== false);
    const familySelect = document.getElementById('centerFamily');
    const subjectSelect = document.getElementById('centerSubject');
    const categorySelect = document.getElementById('centerCategory');
    if (!subjectSelect) return;

    const family = familySelect?.value || 'all';
    const subjectMeta = new Map((bank.meta?.subjects || []).map(item => [item.id, item]));
    [...subjectSelect.options].forEach(option => {
      if (option.value === 'all') return;
      const meta = subjectMeta.get(option.value);
      const count = questions.filter(item => item.subject === option.value && (family === 'all' || inferFamily(item) === family)).length;
      option.disabled = count === 0;
      const text = `${meta?.icon || '🎯'} ${meta?.title || option.value} (${count.toLocaleString('ar-SA')})`;
      if (option.textContent !== text) option.textContent = text;
    });

    if (!categorySelect) return;
    const subject = subjectSelect.value;
    [...categorySelect.options].forEach(option => {
      if (option.value === 'all') return;
      const count = questions.filter(item => item.subject === subject && item.category === option.value).length;
      option.disabled = count === 0;
      const base = option.dataset.baseTitle || option.textContent.replace(/\s*\(\d+\)\s*$/, '');
      option.dataset.baseTitle = base;
      const text = `${base} (${count.toLocaleString('ar-SA')})`;
      if (option.textContent !== text) option.textContent = text;
    });
  }

  function updateSourceDisplay() {
    const questionElement = document.querySelector('.center-exam-screen .exam-question');
    const sourceElement = document.querySelector('.center-exam-screen .center-source-line');

    if (questionElement && sourceElement) {
      const question = sourceMap.get(normalize(questionElement.textContent));
      if (question) {
        const page = question.sourcePage ? ` • الصفحة ${Number(question.sourcePage).toLocaleString('ar-SA')}` : '';
        const timestamp = question.sourceTimestamp ? ` • التوقيت ${question.sourceTimestamp}` : '';
        const value = `${question.source || 'سؤال تدريبي من المنصة'}${page}${timestamp}`;
        if (sourceElement.textContent !== value) sourceElement.textContent = value;
      }
    }

    repairOptionButtons();
    repairSetupControls();

    const quduratEyebrow = document.querySelector('.qudurat-family .eyebrow');
    if (quduratEyebrow && quduratEyebrow.textContent !== 'GENERAL APTITUDE TEST') {
      quduratEyebrow.textContent = 'GENERAL APTITUDE TEST';
    }

    const audit = window.NEON_PLATFORM_AUDIT_REPORT || {};
    const health = document.querySelector('.exam-bank-health');
    if (health && health.dataset.finalized !== 'true') {
      health.dataset.finalized = 'true';
      const active = Number(audit.activeExamQuestions || 0);
      const invalid = Number(audit.totalInactiveRemoved || 0);
      const repaired = Number(audit.idsRepaired || 0) + Number(audit.answersRepaired || 0) + Number(audit.duplicateOptionsRepaired || 0);
      health.innerHTML = `<span>✓ تم فحص بنك الأسئلة</span><span><b>${active.toLocaleString('ar-SA')}</b> سؤالًا فعالًا</span><span><b>تمت معالجة التكرار</b></span>${repaired ? `<span><b>${repaired.toLocaleString('ar-SA')}</b> حالة تم إصلاحها</span>` : ''}${invalid ? `<span class="warn">${invalid.toLocaleString('ar-SA')} سؤالًا غير صالح تم استبعاده</span>` : ''}`;
    }

    const note = document.querySelector('.exam-source-note');
    if (note && note.dataset.importReviewApplied !== 'true') {
      const report = window.NEON_EXAM_DEDUPE_REPORT || {};
      const stats = window.NEON_IMPORTED_EXAM_SOURCE_STATS || {};
      const visualCount = Number(stats.visualQuant || 0);
      note.dataset.importReviewApplied = 'true';
      note.innerHTML = `<strong>تنبيه:</strong> المحتوى تدريبي غير رسمي. تمت مراجعة المرفقات وإضافة ${Number(stats.total || imported.length).toLocaleString('ar-SA')} سؤالًا واضحًا${visualCount ? `، منها <b>${visualCount.toLocaleString('ar-SA')}</b> سؤال قدرات كمي برسومات متجهية دقيقة` : ''}. يجري فحص التكرار وصحة الخيارات والإجابات والرسومات تلقائيًا قبل إتاحة الأسئلة للطالب${Number(report.invalidRemoved || 0) ? `، واستُبعد ${Number(report.invalidRemoved).toLocaleString('ar-SA')} سؤالًا غير مكتمل أو غير قابل للتشغيل` : ''}.`;
    }
  }

  const observer = new MutationObserver(updateSourceDisplay);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('change', event => {
    if (['centerFamily','centerSubject','centerCategory'].includes(event.target?.id)) queueMicrotask(updateSourceDisplay);
  }, true);
  updateSourceDisplay();
})();
