(() => {
  'use strict';
  const questions = [
    ...(window.NEON_IMPORTED_QUANT_A || []),
    ...(window.NEON_IMPORTED_QUANT_B || []),
    ...(window.NEON_IMPORTED_QUANT_C || []),
    ...(window.NEON_IMPORTED_VERBAL_A || []),
    ...(window.NEON_IMPORTED_VERBAL_B || []),
    ...(window.NEON_IMPORTED_READING || [])
  ];
  window.NEON_IMPORTED_EXAM_QUESTIONS_2026 = questions;
  window.NEON_IMPORTED_EXAM_SOURCE_STATS = {
    total: questions.length,
    quant: questions.filter(item => item.subject === 'qudurat-quant').length,
    verbal: questions.filter(item => item.subject === 'qudurat-verbal').length,
    filesReviewed: 9,
    exactDuplicateFilesSkipped: 1
  };
})();
