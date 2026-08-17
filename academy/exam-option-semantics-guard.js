(() => {
  'use strict';

  const academy = window.NEON_ACADEMY;
  const bank = window.NEON_EXAM_BANK;
  if (!academy || !bank) return;

  const encodedToOriginal = new Map();
  const protectedQuestions = [];
  const seen = new WeakSet();
  const marker = '__NEONSEM_';

  function hash(value) {
    let result = 2166136261;
    const text = String(value ?? '').normalize('NFKC');
    for (let index = 0; index < text.length; index++) {
      result ^= text.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(36);
  }

  function encode(value) {
    const original = String(value ?? '');
    if (original.includes(marker)) return original;
    const encoded = `${original} ${marker}${hash(original)}__`;
    encodedToOriginal.set(encoded, original);
    return encoded;
  }

  function protectQuestion(question) {
    if (!question || typeof question !== 'object' || seen.has(question) || !Array.isArray(question.options)) return;
    seen.add(question);
    protectedQuestions.push(question);
    const originalOptions = question.options.map(value => String(value ?? ''));
    question.options = originalOptions.map(encode);

    for (const field of ['answer', 'correctAnswer', 'answerText']) {
      if (typeof question[field] !== 'string') continue;
      const index = originalOptions.findIndex(option => option === question[field]);
      if (index >= 0) question[field] = question.options[index];
    }
  }

  [...(academy.questionBank || []), ...(bank.questions || [])].forEach(protectQuestion);

  function restoreValue(value) {
    if (typeof value !== 'string') return value;
    if (encodedToOriginal.has(value)) return encodedToOriginal.get(value);
    return value.replace(/\s+__NEONSEM_[a-z0-9]+__$/i, '');
  }

  function restore() {
    protectedQuestions.forEach(question => {
      if (Array.isArray(question.options)) question.options = question.options.map(restoreValue);
      for (const field of ['correctAnswer', 'answerText']) {
        if (typeof question[field] === 'string') question[field] = restoreValue(question[field]);
      }
    });
    window.NEON_EXAM_OPTION_SEMANTICS_GUARD_REPORT = {
      protectedQuestions: protectedQuestions.length,
      protectedOptions: encodedToOriginal.size,
      restored: true
    };
  }

  window.NEON_RESTORE_EXAM_OPTION_SEMANTICS = restore;
  window.NEON_EXAM_OPTION_SEMANTICS_GUARD_REPORT = {
    protectedQuestions: protectedQuestions.length,
    protectedOptions: encodedToOriginal.size,
    restored: false
  };
})();
