(() => {
  'use strict';

  const imported = window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || [];
  const bank = window.NEON_EXAM_BANK;
  const academy = window.NEON_ACADEMY;
  const i18n = window.NEON_I18N || { isEnglish: false, pick: ar => ar };
  const answerLabels = i18n.isEnglish ? ['A','B','C','D','E','F'] : ['أ','ب','ج','د','هـ','و'];
  const locale = i18n.isEnglish ? 'en-US' : 'ar-SA';
  const AUDIT_STORAGE_KEY = 'neonAcademyContentAuditV1';
  let updateQueued = false;
  let lastAuditSignature = '';

  if (!document.querySelector('script[data-lesson-quickcheck-loader]')) {
    const quickCheckScript = document.createElement('script');
    quickCheckScript.src = 'lesson-quickcheck-unique.js';
    quickCheckScript.async = false;
    quickCheckScript.dataset.lessonQuickcheckLoader = 'true';
    document.body.appendChild(quickCheckScript);
  }

  if (!document.getElementById('studentTechnicalNoticePolicy')) {
    const style = document.createElement('style');
    style.id = 'studentTechnicalNoticePolicy';
    style.textContent = '.exam-bank-health,.exam-source-note{display:none!important}';
    document.head.appendChild(style);
  }

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

  const sourceMap = new Map();
  imported.forEach(question => {
    if (question?.q) sourceMap.set(normalize(question.q), question);
    if (question?.qEn) sourceMap.set(normalize(question.qEn), question);
  });

  function inferFamily(question) {
    if (question.family) return question.family;
    if (String(question.subject || '').startsWith('qudurat')) return 'qudurat';
    if (String(question.subject || '').startsWith('tahsili')) return 'tahsili';
    return 'other';
  }

  function localizedTitle(item, fallback = '') {
    return i18n.pick(item?.title || fallback, item?.titleEn || item?.title || fallback);
  }

  function repairOptionButtons(root = document) {
    root.querySelectorAll?.('.center-exam-screen .exam-option[data-center-answer]').forEach((button, index) => {
      const label = button.querySelector('b');
      if (label && label.textContent !== answerLabels[index]) {
        label.textContent = answerLabels[index] || String(index + 1);
      }
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
    const subjectCounts = new Map();
    const categoryCounts = new Map();

    questions.forEach(item => {
      if (family === 'all' || inferFamily(item) === family) {
        subjectCounts.set(item.subject, (subjectCounts.get(item.subject) || 0) + 1);
      }
      const key = `${item.subject}|${item.category}`;
      categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
    });

    [...subjectSelect.options].forEach(option => {
      if (option.value === 'all') {
        option.textContent = i18n.pick('كل الأقسام', 'All sections');
        return;
      }
      const meta = subjectMeta.get(option.value);
      const count = subjectCounts.get(option.value) || 0;
      option.disabled = count === 0;
      const text = `${meta?.icon || '🎯'} ${localizedTitle(meta, option.value)} (${count.toLocaleString(locale)})`;
      if (option.textContent !== text) option.textContent = text;
    });

    if (!categorySelect) return;
    const subject = subjectSelect.value;
    const categoryMeta = new Map((bank.meta?.categories?.[subject] || []).map(item => [item.id, item]));

    [...categorySelect.options].forEach(option => {
      if (option.value === 'all') {
        option.textContent = i18n.pick('كل الأنواع', 'All types');
        return;
      }
      const count = categoryCounts.get(`${subject}|${option.value}`) || 0;
      const meta = categoryMeta.get(option.value);
      option.disabled = count === 0;
      const title = localizedTitle(meta, option.dataset.baseTitle || option.value);
      option.dataset.baseTitle = title;
      const text = `${title} (${count.toLocaleString(locale)})`;
      if (option.textContent !== text) option.textContent = text;
    });
  }

  function hideStudentTechnicalNotices(testCenter) {
    testCenter?.querySelectorAll('.exam-bank-health,.exam-source-note').forEach(element => {
      element.hidden = true;
      element.setAttribute('aria-hidden', 'true');
      element.dataset.adminOnly = 'true';
    });
  }

  function persistAdminAudit() {
    const audit = window.NEON_PLATFORM_AUDIT_REPORT || {};
    const report = window.NEON_EXAM_DEDUPE_REPORT || {};
    const stats = window.NEON_IMPORTED_EXAM_SOURCE_STATS || {};

    const repairedCases = Number(audit.idsRepaired || 0)
      + Number(audit.answersRepaired || 0)
      + Number(audit.duplicateOptionsRepaired || 0);
    const rawBankQuestions = Number(report.rawBankQuestions || 0);
    const uniqueBankQuestions = Number(report.uniqueBankQuestions || 0);
    const duplicatesRemoved = Number(
      report.removedInsideBanks
      ?? (rawBankQuestions && uniqueBankQuestions ? rawBankQuestions - uniqueBankQuestions : 0)
    );
    const invalidQuestions = Math.max(
      Number(audit.totalInactiveRemoved || 0),
      Number(report.invalidRemoved || 0)
    );

    const summary = {
      schemaVersion: 1,
      policy: 'admin-only',
      activeExamQuestions: Number(audit.activeExamQuestions || 0),
      importedQuestions: Number(stats.total || imported.length || 0),
      visualQuestions: Number(stats.visualQuant || 0),
      repairedCases,
      invalidQuestions,
      duplicatesRemoved,
      rawBankQuestions,
      uniqueBankQuestions,
      addedToAcademy: Number(report.addedToAcademy || 0),
      skippedAgainstExistingAcademy: Number(report.skippedAgainstExistingAcademy || 0),
      filesReviewed: Number(stats.filesReviewed || 0),
      videoFramesReviewed: Number(stats.videoFramesReviewed || 0),
      videoUniqueQuestionsPrepared: Number(stats.videoUniqueQuestionsPrepared || 0),
      descriptionsAr: [
        'فحص التكرار النصي بعد توحيد الحروف والأرقام وعلامات الترقيم.',
        'التحقق من اكتمال نص السؤال والخيارات والإجابة الصحيحة والتصنيف والمستوى.',
        'إصلاح معرفات الأسئلة والإجابات والخيارات القابلة للإصلاح قبل تفعيلها.',
        'التحقق من توفر الرسومات والجداول للأسئلة البصرية واستبعاد المحتوى الناقص.',
        'إبقاء تنبيهات الجودة والتقارير الفنية داخل لوحة المسؤول فقط وعدم عرضها للطالب.'
      ],
      descriptionsEn: [
        'Detect textual duplicates after normalizing letters, digits, and punctuation.',
        'Validate question text, options, answer keys, categories, and levels.',
        'Repair identifiers, answer indexes, and recoverable option issues before activation.',
        'Verify that visual questions include their required diagrams or tables.',
        'Keep quality-control notices and technical reports inside the administrator console only.'
      ]
    };

    const signature = JSON.stringify(summary);
    if (signature === lastAuditSignature) return;
    lastAuditSignature = signature;

    const payload = { ...summary, generatedAt: new Date().toISOString() };
    window.NEON_ADMIN_CONTENT_AUDIT = payload;

    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to save the administrator content-audit snapshot.', error);
    }
  }

  function updateSourceDisplay() {
    updateQueued = false;
    const examModal = document.getElementById('examModal');
    const questionElement = examModal?.querySelector('.center-exam-screen .exam-question');
    const sourceElement = examModal?.querySelector('.center-exam-screen .center-source-line');

    if (questionElement && sourceElement) {
      const question = sourceMap.get(normalize(questionElement.textContent));
      if (question) {
        const page = question.sourcePage
          ? i18n.pick(
              ` • الصفحة ${Number(question.sourcePage).toLocaleString(locale)}`,
              ` • Page ${Number(question.sourcePage).toLocaleString(locale)}`
            )
          : '';
        const timestamp = question.sourceTimestamp
          ? i18n.pick(` • التوقيت ${question.sourceTimestamp}`, ` • Timestamp ${question.sourceTimestamp}`)
          : '';
        const source = i18n.pick(
          question.source || 'سؤال تدريبي من المنصة',
          question.sourceEn || question.source || 'Practice question from the platform'
        );
        const value = `${source}${page}${timestamp}`;
        if (sourceElement.textContent !== value) sourceElement.textContent = value;
      }
    }

    repairOptionButtons(examModal || document);
    repairSetupControls();

    const testCenter = document.getElementById('test-center');
    const quduratEyebrow = testCenter?.querySelector('.qudurat-family .eyebrow');
    if (quduratEyebrow && quduratEyebrow.textContent !== 'GENERAL APTITUDE TEST') {
      quduratEyebrow.textContent = 'GENERAL APTITUDE TEST';
    }

    hideStudentTechnicalNotices(testCenter);
    persistAdminAudit();
  }

  function scheduleUpdate() {
    if (updateQueued) return;
    updateQueued = true;
    (window.requestAnimationFrame || (callback => window.setTimeout(callback, 16)))(updateSourceDisplay);
  }

  const observer = new MutationObserver(scheduleUpdate);
  const examModal = document.getElementById('examModal');
  const testCenter = document.getElementById('test-center');
  if (examModal) observer.observe(examModal, { childList: true, subtree: true });
  if (testCenter) observer.observe(testCenter, { childList: true, subtree: true });

  document.addEventListener('change', event => {
    if (['centerFamily','centerSubject','centerCategory'].includes(event.target?.id)) scheduleUpdate();
  }, true);

  document.addEventListener('neon:language-changed', scheduleUpdate);
  scheduleUpdate();
})();
