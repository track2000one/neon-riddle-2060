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
    ...(window.NEON_IMPORTED_VISUAL_QUANT_PAGE24_29 || []),
    ...(window.NEON_IMPORTED_VISUAL_QUANT_PAGE30_35 || []),
    ...(window.NEON_IMPORTED_VISUAL_QUANT_PAGE36_41 || []),
    ...(window.NEON_IMPORTED_VISUAL_QUANT_PAGE42_45 || []),
    ...(window.NEON_IMPORTED_VISUAL_QUANT_PAGE46_49 || []),
    ...(window.NEON_IMPORTED_VIDEO_QUANT_A || []),
    ...(window.NEON_IMPORTED_VIDEO_QUANT_B || []),
    ...(window.NEON_IMPORTED_VIDEO_COMPILATIONS_2026_A || []),
    ...(window.NEON_IMPORTED_VIDEO_COMPILATIONS_2026_B || []),
    ...(window.NEON_IMPORTED_ARITHMETIC_VIDEO_V1_20260808 || []),
    ...(window.NEON_IMPORTED_ARITHMETIC_VIDEO_V2_20260808 || []),
    ...(window.NEON_IMPORTED_ARITHMETIC_VIDEO_V3_20260808 || [])
  ];
  window.NEON_IMPORTED_EXAM_QUESTIONS_2026 = questions;
  window.NEON_IMPORTED_EXAM_SOURCE_STATS = {
    total: questions.length,
    quant: questions.filter(item => item.subject === 'qudurat-quant').length,
    verbal: questions.filter(item => item.subject === 'qudurat-verbal').length,
    visualQuant: questions.filter(item => item.subject === 'qudurat-quant' && item.visualId).length,
    filesReviewed: 48,
    videoFramesReviewed: 68,
    videoUniqueQuestionsPrepared: 66,
    videoDuplicateFramesSkipped: 2,
    compilationsVideoFramesReviewed: 20,
    compilationsVideoQuestionsPrepared: 19,
    compilationsVideoDuplicatesSkipped: 1,
    arithmeticVideoFramesReviewed: 136,
    arithmeticVideoQuestionsPrepared: 123,
    arithmeticVideoDuplicatesSkipped: 13,
    exactDuplicateFilesSkipped: 1,
    duplicateHeavyFilesSkipped: 1
  };
})();
