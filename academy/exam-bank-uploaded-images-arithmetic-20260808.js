(() => {
  'use strict';

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
      .replace(/[^a-z0-9\u0600-\u06ff%+\-÷×*/^√<>=.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const genericWords = new Set([
    'احسب','اوجد','أوجد','جد','ما','ماذا','كم','قيمة','ناتج','التالي','الآتي','الاتي',
    'اذا','إذا','كان','كانت','فما','فإن','فان','اي','أي','اختر','قارن','بين'
  ].map(normalize));

  function coreText(value) {
    return normalize(value)
      .split(' ')
      .filter(word => word && !genericWords.has(word))
      .join(' ');
  }

  function numberSignature(value) {
    return (normalize(value).match(/-?\d+(?:\.\d+)?/g) || []).join('|');
  }

  function operatorSignature(value) {
    return (normalize(value).match(/[+\-÷×*/^√<>=]/g) || []).join('');
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

  function buildBank() {
    const raw = [
      ...(window.NEON_UPLOADED_IMAGES_ARITHMETIC_20260808_RAW_A || []),
      ...(window.NEON_UPLOADED_IMAGES_ARITHMETIC_20260808_RAW_B || []),
      ...(window.NEON_UPLOADED_IMAGES_ARITHMETIC_20260808_RAW_C || []),
      ...(window.NEON_UPLOADED_IMAGES_ARITHMETIC_20260808_RAW_D || [])
    ];

    const existing = [];
    Object.keys(window).forEach(key => {
      if (key === 'NEON_UPLOADED_IMAGES_ARITHMETIC_20260808') return;
      if (key.startsWith('NEON_UPLOADED_IMAGES_ARITHMETIC_20260808_RAW_')) return;
      const value = window[key];
      if (!Array.isArray(value)) return;
      value.forEach(item => {
        if (item && item.subject === 'qudurat-quant' && item.q) existing.push(item);
      });
    });

    const accepted = [];
    const exactSeen = new Set(existing.map(item => normalize(item.q)));
    const comparisonPool = existing.slice();
    let removedExact = 0;
    let removedNear = 0;

    for (const question of raw) {
      const exactKey = normalize(question.q);
      if (!exactKey || exactSeen.has(exactKey)) {
        removedExact++;
        continue;
      }

      const numbers = numberSignature(question.q);
      const operators = operatorSignature(question.q);
      let nearDuplicate = false;

      if (numbers) {
        for (const prior of comparisonPool) {
          if (numberSignature(prior.q) !== numbers) continue;
          if (operatorSignature(prior.q) !== operators) continue;
          if (dice(question.q, prior.q) >= 0.94) {
            nearDuplicate = true;
            break;
          }
        }
      }

      if (nearDuplicate) {
        removedNear++;
        continue;
      }

      exactSeen.add(exactKey);
      accepted.push(question);
      comparisonPool.push(question);
    }

    window.NEON_UPLOADED_IMAGES_ARITHMETIC_20260808 = accepted;
    window.NEON_UPLOADED_IMAGES_ARITHMETIC_20260808_REPORT = {
      rawQuestions: raw.length,
      comparedAgainstExisting: existing.length,
      acceptedQuestions: accepted.length,
      removedExact,
      removedNear
    };
    return accepted;
  }

  window.NEON_BUILD_UPLOADED_IMAGES_ARITHMETIC_20260808 = buildBank;
  buildBank();
})();
