export const LEGACY_RUNTIME_ALLOWLIST = Object.freeze([
  'step-book-kafayat-1-lessons.js',
  'step-book-kafayat-1-models-1-2.js',
  'step-book-kafayat-1-models-3-4.js',
  'step-book-kafayat-1-models-5-6.js',
  'step-book-kafayat-1-model-7.js',
  'step-book-kafayat-1-listening.js',
  'step-mastery-lessons.js',
  'step-mastery-questions.js',
  'step-academy-data.js',
  'step-academy-runtime.js',
  'step-book-kafayat-1-runtime.js'
]);

export const LEGACY_RUNTIME_PREFIX = '/legacy/';
export const LEGACY_RUNTIME_OWNER = 'app/src/step.js';

export function legacyRuntimeUrl(fileName) {
  return `${LEGACY_RUNTIME_PREFIX}${fileName}`;
}
