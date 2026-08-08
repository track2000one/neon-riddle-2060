import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const academyDirectory = path.join(root, 'academy');
const outputDirectory = path.join(root, 'generated', 'exams');
const excluded = new Set([
  'exam-bank.js',
  'exam-bank-bilingual-practice.js',
  'exam-bank-curated-meta-2026.js'
]);

function isQuestionSource(file) {
  if (!file.endsWith('.js') || excluded.has(file)) return false;
  return /^(exam-practice-|exam-bank-(?:tahsili|qudurat|curated-(?:tahsili|qudurat)|uploaded-|imported-))/.test(file);
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

function quality(question) {
  let score = 0;
  if (question.explain || question.explanation) score += 4;
  if (question.qEn || question.questionEn) score += 2;
  if (question.visualId || question.visual) score += 1;
  if (question.category) score += 1;
  if (question.level) score += 1;
  return score;
}

function keyFor(question) {
  const passage = normalize(question.passage || '').slice(0, 260);
  return `${question.subject || 'unknown'}|${normalize(question.q || question.question)}|${passage}`;
}

function cleanQuestion(question, index) {
  const q = String(question.q || question.question || '').trim();
  const options = Array.isArray(question.options) ? question.options.map(value => String(value).trim()) : [];
  const answer = Number(question.answer ?? question.correct ?? question.correctIndex);
  if (!q || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;

  const cleaned = {
    ...question,
    id: String(question.id || `generated-${index + 1}`),
    area: question.area || 'exams',
    subject: question.subject || 'unknown',
    q,
    options,
    answer,
    explain: String(question.explain || question.explanation || 'راجع القاعدة المرتبطة بالسؤال.').trim(),
    level: question.level || 'practice'
  };

  for (const key of [
    'source', 'sourcePage', 'sourceQuestion', 'sourcePages', 'sourceFile', 'sourceTitle',
    'book', 'bookId', 'bookTitle', 'author', 'writer', 'page', 'pageNo', 'pageNumber',
    'pdf', 'pdfPage', 'documentName', 'documentTitle'
  ]) delete cleaned[key];

  return cleaned;
}

function createSandbox() {
  const window = {};
  const sandbox = {
    window,
    globalThis: window,
    console,
    structuredClone,
    TextDecoder,
    TextEncoder,
    URL,
    setTimeout,
    clearTimeout,
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    btoa: value => Buffer.from(value, 'binary').toString('base64')
  };
  window.window = window;
  window.globalThis = window;
  return vm.createContext(sandbox);
}

async function evaluateSources(files) {
  const context = createSandbox();
  for (const file of files) {
    const source = await readFile(path.join(academyDirectory, file), 'utf8');
    try {
      vm.runInContext(source, context, { filename: file, timeout: 5000 });
    } catch (error) {
      throw new Error(`تعذر تحليل ${file}: ${error.message}`);
    }
  }

  // Rebuild the uploaded arithmetic image bank after all sources (including
  // the new video banks) have loaded, so its near-duplicate filter compares
  // against the complete quantitative bank rather than only earlier files.
  if (typeof context.window.NEON_BUILD_UPLOADED_IMAGES_ARITHMETIC_20260808 === 'function') {
    context.window.NEON_BUILD_UPLOADED_IMAGES_ARITHMETIC_20260808();
  }

  return context.window;
}

function collectQuestionArrays(windowObject) {
  const arrays = [];
  for (const [name, value] of Object.entries(windowObject)) {
    // RAW_* arrays are staging data for the filtered uploaded-image bank.
    // Collecting them would re-introduce questions intentionally removed by
    // its duplicate filter, so only the rebuilt accepted array is exported.
    if (name.startsWith('NEON_UPLOADED_IMAGES_ARITHMETIC_20260808_RAW_')) continue;
    if (!Array.isArray(value)) continue;
    if (!value.some(item => item && typeof item === 'object' && Array.isArray(item.options) && (item.q || item.question))) continue;
    arrays.push({ name, questions: value });
  }
  return arrays;
}

async function main() {
  const files = (await readdir(academyDirectory)).filter(isQuestionSource).sort();
  if (!files.length) throw new Error('لم يتم العثور على ملفات أسئلة قابلة للتجميع.');

  const windowObject = await evaluateSources(files);
  const arrays = collectQuestionArrays(windowObject);
  const candidates = arrays.flatMap(item => item.questions);
  const bestByKey = new Map();
  let invalid = 0;

  candidates.forEach((raw, index) => {
    const question = cleanQuestion(raw, index);
    if (!question) {
      invalid += 1;
      return;
    }
    const key = keyFor(question);
    const previous = bestByKey.get(key);
    if (!previous || quality(question) > quality(previous)) bestByKey.set(key, question);
  });

  const questions = [...bestByKey.values()].sort((a, b) =>
    String(a.subject).localeCompare(String(b.subject), 'en') || String(a.id).localeCompare(String(b.id), 'en')
  );
  const groups = Map.groupBy(questions, question => question.subject || 'unknown');

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  const manifest = {
    version: new Date().toISOString(),
    sourceFiles: files.length,
    sourceArrays: arrays.length,
    rawCandidates: candidates.length,
    invalidQuestions: invalid,
    duplicatesRemoved: candidates.length - invalid - questions.length,
    totalQuestions: questions.length,
    subjects: {}
  };

  for (const [subject, subjectQuestions] of groups) {
    const safeName = subject.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '') || 'unknown';
    const file = `${safeName}.json`;
    await writeFile(path.join(outputDirectory, file), `${JSON.stringify(subjectQuestions)}\n`, 'utf8');
    manifest.subjects[subject] = { file, count: subjectQuestions.length };
  }

  await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Question bank built: ${questions.length} unique questions across ${groups.size} subjects.`);
  console.log(`Removed ${manifest.duplicatesRemoved} duplicates and rejected ${invalid} invalid questions.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
