(() => {
  'use strict';

  const bank = window.NEON_EXAM_BANK;
  const academy = window.NEON_ACADEMY;
  if (!bank || !academy) return;

  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

  function normalize(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit)))
      .toLowerCase()
      .replace(/\b(?:وفق|حسب|من)\s+(?:الرسم|الشكل|الجدول|المخطط)\b/g, ' ')
      .replace(/(?:المجاور|الاتي|التالي|الموضح)/g, ' ')
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function exactKey(question) {
    return [
      question?.subject || '',
      normalize(question?.q),
      normalize(question?.passage || '')
    ].join('|');
  }

  function optionKey(question) {
    return (question?.options || []).map(normalize).sort().join('|');
  }

  function trigrams(value) {
    const compact = `  ${normalize(value).replace(/\s+/g, '')}  `;
    const grams = new Map();
    for (let i = 0; i < compact.length - 2; i++) {
      const gram = compact.slice(i, i + 3);
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

  function isNearDuplicate(first, second) {
    if (first?.subject !== second?.subject) return false;
    if ((first?.category || '') !== (second?.category || '')) return false;
    if (Number(first?.answer) !== Number(second?.answer)) return false;
    if (optionKey(first) !== optionKey(second)) return false;

    const firstPassage = normalize(first?.passage || '');
    const secondPassage = normalize(second?.passage || '');
    if (firstPassage || secondPassage) {
      if (firstPassage !== secondPassage) return false;
    }

    return dice(first?.q, second?.q) >= 0.86;
  }

  function dedupe(list) {
    const exactSeen = new Set();
    const unique = [];
    const removed = [];

    list.forEach(question => {
      const key = exactKey(question);
      if (exactSeen.has(key)) {
        removed.push({ question, reason:'exact' });
        return;
      }

      const nearMatch = unique.find(existing => isNearDuplicate(existing, question));
      if (nearMatch) {
        removed.push({ question, reason:'near', duplicateOf:nearMatch.id || nearMatch.q });
        return;
      }

      exactSeen.add(key);
      unique.push(question);
    });

    return { unique, removed };
  }

  const bankResult = dedupe(bank.questions || []);
  bank.questions.splice(0, bank.questions.length, ...bankResult.unique);

  const nonExam = academy.questionBank.filter(question => question.area !== 'exams');
  const examResult = dedupe(academy.questionBank.filter(question => question.area === 'exams'));
  academy.questionBank.splice(0, academy.questionBank.length, ...nonExam, ...examResult.unique);

  academy.counts.questions = academy.questionBank.length;
  window.NEON_EXAM_DEDUPE_REPORT = {
    ...(window.NEON_EXAM_DEDUPE_REPORT || {}),
    enhancedExactRemoved: examResult.removed.filter(item => item.reason === 'exact').length,
    enhancedNearRemoved: examResult.removed.filter(item => item.reason === 'near').length,
    enhancedTotalRemoved: examResult.removed.length,
    finalUniqueExamQuestions: examResult.unique.length,
    removedSamples: examResult.removed.slice(0, 20).map(item => ({
      id:item.question?.id || '',
      question:item.question?.q || '',
      reason:item.reason,
      duplicateOf:item.duplicateOf || ''
    }))
  };
})();
