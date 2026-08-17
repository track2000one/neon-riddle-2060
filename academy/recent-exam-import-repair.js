(() => {
  'use strict';

  if (window.__NEON_RECENT_EXAM_IMPORT_REPAIR__) return;
  window.__NEON_RECENT_EXAM_IMPORT_REPAIR__ = true;

  const RECENT_SOURCE = /(?:فيديو تحصيلي ناصر 2026|QqTahsili-00004\.pdf)/i;
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let attempts = 0;

  function normalize(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, d => String(arabicDigits.indexOf(d)))
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff%+\-÷×√²³⁴⁵⁶⁷⁸⁹]+/g, '')
      .trim();
  }

  function grams(value) {
    const text = `  ${normalize(value)}  `;
    const map = new Map();
    for (let i = 0; i < text.length - 2; i++) {
      const gram = text.slice(i, i + 3);
      map.set(gram, (map.get(gram) || 0) + 1);
    }
    return map;
  }

  function dice(a, b) {
    const left = grams(a), right = grams(b);
    let overlap = 0, leftTotal = 0, rightTotal = 0;
    left.forEach(v => { leftTotal += v; });
    right.forEach(v => { rightTotal += v; });
    left.forEach((v, k) => { overlap += Math.min(v, right.get(k) || 0); });
    return leftTotal + rightTotal ? (2 * overlap) / (leftTotal + rightTotal) : 1;
  }

  function optionKey(question) {
    return (question.options || []).map(normalize).sort().join('|');
  }

  function correctValue(question) {
    return normalize(question.options?.[question.answer] || '');
  }

  function valid(question) {
    return question &&
      question.area === 'exams' &&
      question.subject === 'tahsili-chemistry' &&
      String(question.q || '').trim().length >= 3 &&
      Array.isArray(question.options) &&
      question.options.length >= 2 &&
      Number.isInteger(question.answer) &&
      question.answer >= 0 &&
      question.answer < question.options.length;
  }

  function duplicate(existing, candidate) {
    if (existing.subject !== candidate.subject) return false;
    const left = normalize(existing.q);
    const right = normalize(candidate.q);
    if (left === right) return true;
    if (!left || !right) return false;

    const similarity = dice(left, right);
    if (similarity < 0.985) return false;

    const sameAnswer = correctValue(existing) && correctValue(existing) === correctValue(candidate);
    const sameOptions = optionKey(existing) && optionKey(existing) === optionKey(candidate);
    return sameAnswer && sameOptions;
  }

  function mergeInto(target, candidates) {
    let added = 0;
    candidates.forEach(candidate => {
      if (target.some(item => duplicate(item, candidate))) return;
      target.push({ ...candidate, active: true });
      added++;
    });
    return added;
  }

  function refreshMetrics(academy) {
    const examQuestions = academy.questionBank.filter(q => q.area === 'exams' && q.active !== false);
    const chemistry = examQuestions.filter(q => q.subject === 'tahsili-chemistry');
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };
    setText('examCenterTotal', examQuestions.length.toLocaleString('ar-SA'));
    setText('count-tahsili-chemistry', `${chemistry.length.toLocaleString('ar-SA')} سؤال`);
    setText('heroQuestionCount', academy.questionBank.length.toLocaleString('ar-SA'));
  }

  function reconcile() {
    attempts++;
    const imported = window.NEON_IMPORTED_EXAM_QUESTIONS_2026;
    const bank = window.NEON_EXAM_BANK;
    const academy = window.NEON_ACADEMY;

    if (!Array.isArray(imported) || !bank || !academy || !Array.isArray(bank.questions) || !Array.isArray(academy.questionBank)) {
      if (attempts < 600) return setTimeout(reconcile, 50);
      return;
    }

    // Wait until the normal bank assembly/deduplication pipeline has finished, then repair only missing recent imports.
    if (!window.NEON_PLATFORM_AUDIT_REPORT && attempts < 600) return setTimeout(reconcile, 50);

    const sourceCandidates = imported.filter(q => valid(q) && RECENT_SOURCE.test(String(q.source || '')));
    const uniqueCandidates = [];
    sourceCandidates.forEach(candidate => {
      if (!uniqueCandidates.some(item => duplicate(item, candidate))) uniqueCandidates.push(candidate);
    });

    const beforeAcademy = academy.questionBank.length;
    const beforeBank = bank.questions.length;
    const addedToAcademy = mergeInto(academy.questionBank, uniqueCandidates);
    const addedToBank = mergeInto(bank.questions, uniqueCandidates);

    academy.counts ||= {};
    academy.counts.questions = academy.questionBank.length;
    academy.counts.examQuestions = academy.questionBank.filter(q => q.area === 'exams').length;

    window.NEON_RECENT_EXAM_IMPORT_REPAIR_REPORT = {
      sourceCandidates: sourceCandidates.length,
      uniqueCandidates: uniqueCandidates.length,
      nasserCandidates: uniqueCandidates.filter(q => String(q.source || '').includes('ناصر 2026')).length,
      qqTahsiliCandidates: uniqueCandidates.filter(q => String(q.source || '').includes('QqTahsili-00004.pdf')).length,
      beforeAcademy,
      afterAcademy: academy.questionBank.length,
      beforeBank,
      afterBank: bank.questions.length,
      addedToAcademy,
      addedToBank,
      repairedAt: new Date().toISOString()
    };

    refreshMetrics(academy);
    document.dispatchEvent(new CustomEvent('neon:exam-bank-repaired', { detail: window.NEON_RECENT_EXAM_IMPORT_REPAIR_REPORT }));
  }

  reconcile();
})();
