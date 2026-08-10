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

function normalizedNumbers(value) {
  const digits = '٠١٢٣٤٥٦٧٨٩';
  const text = String(value || '')
    .normalize('NFKC')
    .replace(/[٠-٩]/g, digit => String(digits.indexOf(digit)))
    .replace(/٫/g, '.')
    .replace(/٬/g, '');
  return (text.match(/-?\d+(?:\.\d+)?/g) || []).join('|');
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

function trigramDice(left, right) {
  if (left === right) return 1;
  if (!left || !right || Math.min(left.length, right.length) < 3) return 0;
  const counts = new Map();
  for (let index = 0; index <= left.length - 3; index += 1) {
    const gram = left.slice(index, index + 3);
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }
  let overlap = 0;
  for (let index = 0; index <= right.length - 3; index += 1) {
    const gram = right.slice(index, index + 3);
    const count = counts.get(gram) || 0;
    if (!count) continue;
    overlap += 1;
    counts.set(gram, count - 1);
  }
  return (2 * overlap) / ((left.length - 2) + (right.length - 2));
}

const fuzzySignatureCache = new WeakMap();

function fuzzySignature(question) {
  if (fuzzySignatureCache.has(question)) return fuzzySignatureCache.get(question);
  const q = normalize(question.q || question.question);
  const passage = normalize(question.passage || '');
  const options = (question.options || []).map(normalize).sort().join('|');
  const numbers = normalizedNumbers(`${question.q || question.question || ''} ${question.passage || ''}`);
  const signature = { q, passage, options, numbers };
  fuzzySignatureCache.set(question, signature);
  return signature;
}

function nearDuplicate(left, right) {
  if (left.subject !== right.subject) return false;
  const a = fuzzySignature(left);
  const b = fuzzySignature(right);
  if (Math.min(a.q.length, b.q.length) < 32) return false;
  const lengthRatio = Math.min(a.q.length, b.q.length) / Math.max(a.q.length, b.q.length);
  if (lengthRatio < 0.9) return false;
  if (a.numbers !== b.numbers) return false;
  if (Boolean(a.passage) !== Boolean(b.passage)) return false;
  if (a.passage && trigramDice(a.passage, b.passage) < 0.97) return false;
  if (trigramDice(a.q, b.q) < 0.975) return false;
  if (trigramDice(a.options, b.options) < 0.94) return false;
  return true;
}

function fuzzyDeduplicate(questions) {
  const accepted = [];
  const buckets = new Map();
  let removed = 0;

  for (const question of questions) {
    const subject = question.subject || 'unknown';
    const bucket = buckets.get(subject) || [];
    let match = null;
    for (const entry of bucket) {
      if (nearDuplicate(entry.question, question)) {
        match = entry;
        break;
      }
    }

    if (!match) {
      const index = accepted.push(question) - 1;
      bucket.push({ question, index });
      buckets.set(subject, bucket);
      continue;
    }

    removed += 1;
    if (quality(question) > quality(match.question)) {
      accepted[match.index] = question;
      match.question = question;
    }
  }

  return { questions: accepted, removed };
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

  if (typeof context.window.NEON_BUILD_UPLOADED_IMAGES_ARITHMETIC_20260808 === 'function') {
    context.window.NEON_BUILD_UPLOADED_IMAGES_ARITHMETIC_20260808();
  }

  return context.window;
}

function collectQuestionArrays(windowObject) {
  const arrays = [];
  for (const [name, value] of Object.entries(windowObject)) {
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

  const exactQuestions = [...bestByKey.values()];
  const exactDuplicatesRemoved = candidates.length - invalid - exactQuestions.length;
  const fuzzyResult = fuzzyDeduplicate(exactQuestions);
  const questions = fuzzyResult.questions.sort((a, b) =>
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
    exactDuplicatesRemoved,
    fuzzyDuplicatesRemoved: fuzzyResult.removed,
    duplicatesRemoved: exactDuplicatesRemoved + fuzzyResult.removed,
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
  console.log(`Removed ${manifest.duplicatesRemoved} duplicates (${exactDuplicatesRemoved} exact + ${fuzzyResult.removed} fuzzy) and rejected ${invalid} invalid questions.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
