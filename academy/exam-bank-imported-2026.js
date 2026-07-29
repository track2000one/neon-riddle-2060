(() => {
  'use strict';
  const questions = [
    ...(window.NEON_IMPORTED_QUANT_A || []),
    ...(window.NEON_IMPORTED_QUANT_B || []),
    ...(window.NEON_IMPORTED_QUANT_C || []),
    ...(window.NEON_IMPORTED_VERBAL_A || []),
    ...(window.NEON_IMPORTED_VERBAL_B || []),
    ...(window.NEON_IMPORTED_READING || []),
    ...(window.NEON_IMPORTED_NOON_QUANT || []),
    ...(window.NEON_IMPORTED_NOON_VERBAL_A || []),
    ...(window.NEON_IMPORTED_NOON_VERBAL_B || []),
    ...(window.NEON_IMPORTED_VISUAL_QUANT || []),
    ...(window.NEON_IMPORTED_VISUAL_QUANT_PAGE06_07 || []),
    ...(window.NEON_IMPORTED_VISUAL_QUANT_PAGE08_09 || []),
    ...(window.NEON_IMPORTED_VISUAL_QUANT_PAGE10_11 || []),
    ...(window.NEON_IMPORTED_VISUAL_QUANT_PAGE18_23 || []),
    ...(window.NEON_IMPORTED_VISUAL_QUANT_PAGE24_29 || [])
  ];
  window.NEON_IMPORTED_EXAM_QUESTIONS_2026 = questions;
  window.NEON_IMPORTED_EXAM_SOURCE_STATS = {
    total: questions.length,
    quant: questions.filter(item => item.subject === 'qudurat-quant').length,
    verbal: questions.filter(item => item.subject === 'qudurat-verbal').length,
    visualQuant: questions.filter(item => item.subject === 'qudurat-quant' && item.visualId).length,
    filesReviewed: 29,
    exactDuplicateFilesSkipped: 1,
    duplicateHeavyFilesSkipped: 1
  };
})();
