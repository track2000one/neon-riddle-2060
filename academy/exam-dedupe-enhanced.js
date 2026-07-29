(() => {
  'use strict';

  const bank = window.NEON_EXAM_BANK;
  const academy = window.NEON_ACADEMY;
  if (!bank || !academy) return;

  const visuals = window.NEON_EXAM_VISUALS || {};
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const validAreas = new Set(['games', 'knowledge', 'exams', 'coding']);
  const validLevels = new Set(['foundation', 'practice', 'mastery']);
  const validExamSubjects = new Set((bank.meta?.subjects || []).map(item => item.id));
  const genericWords = new Set([
    'ما','ماذا','كم','اوجد','أوجد','احسب','حدد','اختر','قارن','بين','من','في','الى','إلى','على','عن','هو','هي','اذا','إذا','كان','كانت','يكون','تكون','وفق','حسب','بالاستعانة','خلال','السؤال','التالي','الآتي','الاتي','الموضح','المجاور','الشكل','الرسم','الجدول','المخطط','البياني','أدناه','ادناه'
  ].map(normalize));

  const report = {
    startedAt: new Date().toISOString(),
    rawQuestions: 0,
    activeQuestions: 0,
    activeExamQuestions: 0,
    exactDuplicatesRemoved: 0,
    nearDuplicatesRemoved: 0,
    invalidQuestionsRemoved: 0,
    missingVisualQuestionsRemoved: 0,
    duplicateOptionsRepaired: 0,
    answersRepaired: 0,
    idsRepaired: 0,
    categoriesInferred: 0,
    lessonsRemoved: 0,
    lessonIdsRepaired: 0,
    removedSamples: [],
    repairedSamples: []
  };

  function normalize(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit)))
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff%+\-÷×√²³⁴⁵⁶⁷⁸⁹]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function coreText(value) {
    return normalize(value)
      .split(' ')
      .filter(word => word && !genericWords.has(word))
      .join(' ');
  }

  function tokenSet(value) {
    return new Set(coreText(value).split(' ').filter(word => word.length > 1));
  }

  function jaccard(left, right) {
    const a = left instanceof Set ? left : tokenSet(left);
    const b = right instanceof Set ? right : tokenSet(right);
    if (!a.size && !b.size) return 1;
    let intersection = 0;
    a.forEach(item => { if (b.has(item)) intersection++; });
    return intersection / Math.max(1, a.size + b.size - intersection);
  }

  function trigrams(value) {
    const compact = `  ${coreText(value).replace(/\s+/g, '')}  `;
    const grams = new Map();
    for (let index = 0; index < compact.length - 2; index++) {
      const gram = compact.slice(index, index + 3);
      grams.set(gram, (grams.get(gram) || 0) + 1);
    }
    return grams;
  }

  function dice(left, right) {
    const a = trigrams(left);
    const b = trigrams(right);
    let overlap = 0;
    let totalA = 0;
    let totalB = 0;
    a.forEach(value => { totalA += value; });
    b.forEach(value => { totalB += value; });
    a.forEach((value, key) => { overlap += Math.min(value, b.get(key) || 0); });
    return totalA + totalB ? (2 * overlap) / (totalA + totalB) : 1;
  }

  function numberSignature(value) {
    return (normalize(value).match(/-?\d+(?:\.\d+)?/g) || []).sort().join('|');
  }

  function shortHash(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function inferArea(question) {
    const subject = String(question.subject || '');
    if (subject.startsWith('qudurat') || subject.startsWith('tahsili')) return 'exams';
    if (['html','css','javascript','python','java','cpp','csharp','dart','sql','git'].includes(subject)) return 'coding';
    return validAreas.has(question.area) ? question.area : 'knowledge';
  }

  function inferFamily(question) {
    if (question.family) return question.family;
    if (String(question.subject).startsWith('qudurat')) return 'qudurat';
    if (String(question.subject).startsWith('tahsili')) return 'tahsili';
    return question.area === 'exams' ? 'other' : '';
  }

  function inferCategory(question) {
    const current = String(question.category || '').trim();
    if (current) return current;
    const text = normalize(`${question.q || ''} ${question.passage || ''}`);
    let category = '';

    if (question.subject === 'qudurat-quant') {
      if (/(سرع|مساف|زمن|ساع|عمل|عامل|مصنع|انتاج|إنتاج)/.test(text)) category = 'speed-work';
      else if (/(مثلث|مربع|مستطيل|دائر|زاوي|ضلع|محيط|مساح|حجم|مستقيم|متوازي|احداث|إحداث)/.test(text)) category = 'geometry';
      else if (/(متوسط|وسيط|منوال|مدى|احتمال|بيانات|جدول|اعمد|أعمد|رسم|مخطط|تكرار)/.test(text)) category = 'statistics-probability';
      else if (/(نسبه|نسبة|بالمئ|خصم|زياد|انخفاض|ارتفاع)/.test(text)) category = 'percentages';
      else if (/(كسر|تناسب|معدل|ميراث|تركة|جزء|نصيب)/.test(text)) category = 'ratios-fractions';
      else if (/(معادل|دال|اس |أس |جذر|لوغ|س\b|ص\b|ع\b|مجهول)/.test(text)) category = 'algebra';
      else category = 'arithmetic';
    } else if (question.subject === 'qudurat-verbal') {
      if (question.passage) category = 'reading-comprehension';
      else if (/(كما ان|كما أن|علاق|تناظر)/.test(text)) category = 'analogy';
      else if (/(اكمل|أكمل|فراغ|تكمل)/.test(text)) category = 'sentence-completion';
      else if (/(خطا|خطأ|سياق)/.test(text)) category = 'contextual-error';
      else if (/(مختلف|اختلاف|ارتباط)/.test(text)) category = 'relation-difference';
      else category = 'vocabulary';
    }

    if (category) report.categoriesInferred++;
    return category;
  }

  function resolveAnswerIndex(question, options) {
    const candidates = [question.answer, question.correctIndex, question.answerIndex, question.correctAnswer];
    for (const value of candidates) {
      if (Number.isInteger(value) && value >= 0 && value < options.length) return value;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^\d+$/.test(trimmed)) {
          const number = Number(trimmed);
          if (number >= 0 && number < options.length) return number;
        }
        const letterIndex = ['أ','ا','ب','ج','د','هـ','ه','و'].indexOf(trimmed);
        if (letterIndex >= 0 && letterIndex < options.length) return letterIndex;
        const matching = options.findIndex(option => normalize(option) === normalize(trimmed));
        if (matching >= 0) return matching;
      }
    }
    return -1;
  }

  function requiresVisual(question) {
    return /(الشكل|الرسم|الجدول|المخطط|البيان|المجاور|ادناه|المرفق)/.test(normalize(`${question.q || ''} ${question.passage || ''}`));
  }

  function rememberSample(kind, question, reason) {
    const target = kind === 'removed' ? report.removedSamples : report.repairedSamples;
    if (target.length >= 25) return;
    target.push({ id: question?.id || '', question: String(question?.q || '').slice(0, 150), reason });
  }

  function sanitizeQuestion(rawQuestion, index) {
    if (!rawQuestion || typeof rawQuestion !== 'object') {
      report.invalidQuestionsRemoved++;
      return null;
    }

    const question = { ...rawQuestion };
    question.q = String(question.q || question.question || '').trim();
    question.passage = question.passage == null ? '' : String(question.passage).trim();
    const originalOptions = Array.isArray(question.options) ? question.options.map(value => String(value ?? '').trim()) : [];
    const originalAnswer = resolveAnswerIndex(question, originalOptions);

    if (question.q.length < 3 || originalOptions.length < 2 || originalAnswer < 0) {
      report.invalidQuestionsRemoved++;
      rememberSample('removed', question, 'missing-question-options-or-answer');
      return null;
    }

    const optionIndexMap = new Map();
    const cleanedOptions = [];
    const oldToNew = [];
    originalOptions.forEach((option, optionIndex) => {
      if (!option) return;
      const key = normalize(option);
      if (!key) return;
      if (optionIndexMap.has(key)) {
        oldToNew[optionIndex] = optionIndexMap.get(key);
        report.duplicateOptionsRepaired++;
        rememberSample('repaired', question, 'duplicate-option-removed');
        return;
      }
      const newIndex = cleanedOptions.length;
      optionIndexMap.set(key, newIndex);
      oldToNew[optionIndex] = newIndex;
      cleanedOptions.push(option);
    });

    const cleanedAnswer = oldToNew[originalAnswer];
    if (cleanedOptions.length < 2 || !Number.isInteger(cleanedAnswer) || cleanedAnswer < 0 || cleanedAnswer >= cleanedOptions.length) {
      report.invalidQuestionsRemoved++;
      rememberSample('removed', question, 'invalid-answer-after-option-cleanup');
      return null;
    }

    if (cleanedAnswer !== Number(question.answer)) report.answersRepaired++;
    question.options = cleanedOptions;
    question.answer = cleanedAnswer;
    question.area = inferArea(question);
    question.family = inferFamily(question);
    question.level = validLevels.has(question.level) ? question.level : 'practice';
    question.category = inferCategory(question);
    question.explain = String(question.explain || question.explanation || `الإجابة الصحيحة: ${cleanedOptions[cleanedAnswer]}.`).trim();
    question.active = true;
    delete question.disabled;
    delete question.inactive;

    if (question.area === 'exams' && !validExamSubjects.has(question.subject)) {
      report.invalidQuestionsRemoved++;
      rememberSample('removed', question, 'unknown-exam-subject');
      return null;
    }

    if (question.visualId && !visuals[question.visualId]) {
      if (requiresVisual(question)) {
        report.invalidQuestionsRemoved++;
        report.missingVisualQuestionsRemoved++;
        rememberSample('removed', question, `missing-visual:${question.visualId}`);
        return null;
      }
      delete question.visualId;
      delete question.imageAlt;
      rememberSample('repaired', question, 'unused-missing-visual-reference-removed');
    }

    const baseId = String(question.id || '').trim() || `${question.subject || question.area || 'q'}-${shortHash(`${question.q}|${question.passage}|${index}`)}`;
    question.id = baseId.replace(/[^a-zA-Z0-9_\-:.]/g, '-');
    return question;
  }

  function exactKey(question) {
    return `${question.subject}|${coreText(question.q)}|${coreText(question.passage || '')}`;
  }

  function optionSet(question) {
    return new Set((question.options || []).map(normalize));
  }

  function correctValue(question) {
    return normalize(question.options?.[question.answer] || '');
  }

  function quality(question) {
    let score = 0;
    if (question.visualId && visuals[question.visualId]) score += 8;
    if (question.passage) score += 5;
    if (question.source) score += 3;
    if (question.sourcePage || question.sourceTimestamp) score += 2;
    if (question.explain?.length >= 25) score += 3;
    if (question.options?.length === 4) score += 2;
    score += Math.min(3, Math.floor(question.q.length / 70));
    return score;
  }

  function isNearDuplicate(first, second) {
    if (first.subject !== second.subject) return false;
    const firstPassage = coreText(first.passage || '');
    const secondPassage = coreText(second.passage || '');
    if ((firstPassage || secondPassage) && dice(firstPassage, secondPassage) < 0.94) return false;

    const firstCore = coreText(first.q);
    const secondCore = coreText(second.q);
    if (firstCore === secondCore) return true;

    const questionSimilarity = dice(firstCore, secondCore);
    const tokenSimilarity = jaccard(tokenSet(firstCore), tokenSet(secondCore));
    const optionsSimilarity = jaccard(optionSet(first), optionSet(second));
    const sameCorrect = correctValue(first) && correctValue(first) === correctValue(second);
    const firstNumbers = numberSignature(`${first.q} ${(first.options || []).join(' ')}`);
    const secondNumbers = numberSignature(`${second.q} ${(second.options || []).join(' ')}`);
    const sameNumbers = firstNumbers && firstNumbers === secondNumbers;

    if (questionSimilarity >= 0.95) return true;
    if (sameCorrect && optionsSimilarity === 1 && questionSimilarity >= 0.76) return true;
    if (sameCorrect && tokenSimilarity >= 0.78 && questionSimilarity >= 0.86) return true;
    if (sameCorrect && sameNumbers && questionSimilarity >= 0.88) return true;
    return false;
  }

  function dedupeQuestions(items) {
    const unique = [];
    const exactMap = new Map();
    const optionBuckets = new Map();
    const numberBuckets = new Map();
    const prefixBuckets = new Map();

    function addBucket(map, key, index) {
      if (!key) return;
      const list = map.get(key) || [];
      list.push(index);
      map.set(key, list);
    }

    items.forEach(question => {
      const exact = exactKey(question);
      if (exactMap.has(exact)) {
        const existingIndex = exactMap.get(exact);
        const existing = unique[existingIndex];
        if (quality(question) > quality(existing)) unique[existingIndex] = question;
        report.exactDuplicatesRemoved++;
        rememberSample('removed', question, `exact-duplicate:${existing.id}`);
        return;
      }

      const optionFingerprint = `${question.subject}|${correctValue(question)}|${[...optionSet(question)].sort().join('|')}`;
      const numbers = numberSignature(`${question.q} ${(question.options || []).join(' ')}`);
      const numberFingerprint = numbers ? `${question.subject}|${correctValue(question)}|${numbers}` : '';
      const prefix = `${question.subject}|${coreText(question.q).slice(0, 28)}`;
      const candidates = new Set([
        ...(optionBuckets.get(optionFingerprint) || []),
        ...(numberBuckets.get(numberFingerprint) || []),
        ...(prefixBuckets.get(prefix) || [])
      ]);

      let duplicateIndex = -1;
      for (const candidateIndex of candidates) {
        if (isNearDuplicate(unique[candidateIndex], question)) {
          duplicateIndex = candidateIndex;
          break;
        }
      }

      if (duplicateIndex >= 0) {
        const existing = unique[duplicateIndex];
        if (quality(question) > quality(existing)) unique[duplicateIndex] = question;
        report.nearDuplicatesRemoved++;
        rememberSample('removed', question, `near-duplicate:${existing.id}`);
        return;
      }

      const newIndex = unique.length;
      unique.push(question);
      exactMap.set(exact, newIndex);
      addBucket(optionBuckets, optionFingerprint, newIndex);
      addBucket(numberBuckets, numberFingerprint, newIndex);
      addBucket(prefixBuckets, prefix, newIndex);
    });

    return unique;
  }

  function ensureUniqueQuestionIds(questions) {
    const seen = new Set();
    questions.forEach(question => {
      const original = question.id || 'question';
      let candidate = original;
      if (seen.has(candidate)) {
        candidate = `${original}-${shortHash(`${question.subject}|${question.q}|${question.passage}`)}`;
        let suffix = 2;
        while (seen.has(candidate)) candidate = `${original}-${shortHash(question.q)}-${suffix++}`;
        question.id = candidate;
        report.idsRepaired++;
        rememberSample('repaired', question, `duplicate-id:${original}`);
      }
      seen.add(candidate);
    });
  }

  function auditLessons() {
    const unique = [];
    const exact = new Set();
    const ids = new Set();
    (academy.lessons || []).forEach((rawLesson, index) => {
      if (!rawLesson || typeof rawLesson !== 'object' || !validAreas.has(rawLesson.area) || !String(rawLesson.title || '').trim()) {
        report.lessonsRemoved++;
        return;
      }
      const lesson = { ...rawLesson };
      const key = `${lesson.area}|${lesson.subjectId || ''}|${normalize(lesson.topic || lesson.title)}|${lesson.level || ''}`;
      if (exact.has(key)) {
        report.lessonsRemoved++;
        return;
      }
      exact.add(key);
      let id = String(lesson.id || `lesson-${shortHash(`${key}|${index}`)}`);
      if (ids.has(id)) {
        id = `${id}-${shortHash(key)}`;
        report.lessonIdsRepaired++;
      }
      ids.add(id);
      lesson.id = id;
      lesson.objectives = Array.isArray(lesson.objectives) ? lesson.objectives.filter(Boolean) : ['فهم الفكرة الأساسية.','تطبيقها في مثال.'];
      lesson.duration = Math.max(1, Number(lesson.duration) || 10);
      lesson.xp = Math.max(0, Number(lesson.xp) || 30);
      unique.push(lesson);
    });
    academy.lessons.splice(0, academy.lessons.length, ...unique);
  }

  const combinedQuestions = [...(academy.questionBank || []), ...(bank.questions || [])];
  report.rawQuestions = combinedQuestions.length;
  const sanitized = combinedQuestions.map(sanitizeQuestion).filter(Boolean);
  const uniqueQuestions = dedupeQuestions(sanitized);
  ensureUniqueQuestionIds(uniqueQuestions);
  auditLessons();

  const examQuestions = uniqueQuestions.filter(question => question.area === 'exams');
  bank.questions.splice(0, bank.questions.length, ...examQuestions);
  academy.questionBank.splice(0, academy.questionBank.length, ...uniqueQuestions);

  academy.counts.questions = uniqueQuestions.length;
  academy.counts.totalLessons = academy.lessons.length;
  academy.counts.knowledgeLessons = academy.lessons.filter(item => item.area === 'knowledge').length;
  academy.counts.codingLessons = academy.lessons.filter(item => item.area === 'coding').length;
  academy.counts.examLessons = academy.lessons.filter(item => item.area === 'exams').length;
  academy.counts.gameLessons = academy.lessons.filter(item => item.area === 'games').length;

  report.activeQuestions = uniqueQuestions.length;
  report.activeExamQuestions = examQuestions.length;
  report.completedAt = new Date().toISOString();
  report.totalDuplicatesRemoved = report.exactDuplicatesRemoved + report.nearDuplicatesRemoved;
  report.totalInactiveRemoved = report.invalidQuestionsRemoved;

  window.NEON_EXAM_DEDUPE_REPORT = {
    ...(window.NEON_EXAM_DEDUPE_REPORT || {}),
    enhancedExactRemoved: report.exactDuplicatesRemoved,
    enhancedNearRemoved: report.nearDuplicatesRemoved,
    enhancedTotalRemoved: report.totalDuplicatesRemoved,
    invalidRemoved: report.invalidQuestionsRemoved,
    missingVisualRemoved: report.missingVisualQuestionsRemoved,
    repairedIds: report.idsRepaired,
    finalUniqueExamQuestions: report.activeExamQuestions,
    removedSamples: report.removedSamples
  };
  window.NEON_PLATFORM_AUDIT_REPORT = report;

  function injectHealthStyles() {
    if (document.getElementById('neonPlatformHealthStyles')) return;
    const style = document.createElement('style');
    style.id = 'neonPlatformHealthStyles';
    style.textContent = `
      .exam-bank-health{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:10px;font-size:12px;color:#a9bad4}
      .exam-bank-health b{color:#63f2a9}.exam-bank-health .warn{color:#ffd46e}
      .quick-check-audit-visual{margin:16px 0;border:1px solid rgba(103,237,255,.2);border-radius:16px;overflow:hidden;background:#fff}
      .quick-check-audit-visual svg{display:block;width:100%;height:auto;max-height:360px}
      .quick-check-audit-visual figcaption{padding:8px 12px;background:#0d1930;color:#b9c7dd;font-size:12px}
    `;
    document.head.appendChild(style);
  }

  function mountHealthBadge(root = document) {
    const heading = root.querySelector?.('.exam-center-heading');
    if (!heading || heading.querySelector('.exam-bank-health')) return;
    const badge = document.createElement('div');
    badge.className = 'exam-bank-health';
    badge.innerHTML = `<span>✓ تم فحص البنك</span><span><b>${report.activeExamQuestions.toLocaleString('ar-SA')}</b> سؤالًا فعالًا</span><span><b>${report.totalDuplicatesRemoved.toLocaleString('ar-SA')}</b> مكررًا مستبعدًا</span>${report.totalInactiveRemoved ? `<span class="warn">${report.totalInactiveRemoved.toLocaleString('ar-SA')} سؤالًا غير صالح مستبعدًا</span>` : ''}`;
    heading.querySelector('div')?.appendChild(badge);
  }

  function mountQuickCheckVisuals(root = document) {
    root.querySelectorAll?.('.quick-check:not([data-health-checked])').forEach(container => {
      container.dataset.healthChecked = 'true';
      const question = academy.questionBank.find(item => item.id === container.dataset.questionId);
      if (!question) return;
      container.querySelectorAll('.quick-option').forEach(button => {
        if (!container.dataset.answered) button.disabled = false;
      });
      const markup = question.visualId && visuals[question.visualId];
      if (!markup || container.querySelector('.quick-check-audit-visual')) return;
      const figure = document.createElement('figure');
      figure.className = 'quick-check-audit-visual';
      figure.setAttribute('role', 'img');
      figure.setAttribute('aria-label', question.imageAlt || 'الرسم المرافق للسؤال');
      figure.innerHTML = `${markup}<figcaption>${String(question.imageAlt || 'الرسم المرافق للسؤال').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]))}</figcaption>`;
      container.querySelector('h4')?.insertAdjacentElement('afterend', figure);
    });
  }

  injectHealthStyles();
  mountHealthBadge();
  mountQuickCheckVisuals();

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      mountHealthBadge(node.matches('.exam-center-section') ? node : node);
      mountQuickCheckVisuals(node);
    }));
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  console.info('[NEON Academy] Platform audit completed', report);
})();
