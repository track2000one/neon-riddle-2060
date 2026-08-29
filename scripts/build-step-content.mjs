import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const academy = join(root, 'academy');
const outputRoot = join(root, 'generated', 'step');

const DATA_FILES = [
  'step-book-kafayat-1-lessons.js',
  'step-book-kafayat-1-models-1-2.js',
  'step-book-kafayat-1-models-3-4.js',
  'step-book-kafayat-1-models-5-6.js',
  'step-book-kafayat-1-model-7.js',
  'step-book-kafayat-1-listening.js',
  'step-mastery-lessons.js',
  'step-mastery-questions.js',
  'step-uploaded-video-yaser-althunayan-20260829.js'
];

const window = {};
window.window = window;
window.globalThis = window;
const context = vm.createContext({ window, globalThis: window, console });

for (const file of DATA_FILES) {
  const source = readFileSync(join(academy, file), 'utf8');
  vm.runInContext(source, context, { filename: file, timeout: 3000 });
}

const forbiddenKeys = new Set([
  'source', 'sourcePage', 'sourcePages', 'questionPages', 'answerPage', 'pages',
  'author', 'edition', 'audit', 'sourceQuestionCount', 'sourceTitle', 'sourceFile',
  'pdf', 'pdfPage', 'documentName', 'documentTitle'
]);

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !forbiddenKeys.has(key))
    .map(([key, nested]) => [key, clean(nested)]));
}

function normalizeQuestion(item, index, prefix = 'step') {
  if (!item || typeof item !== 'object') return null;
  const options = Array.isArray(item.options) ? item.options.map(value => String(value)) : [];
  const answer = Number(item.answer ?? item.correct ?? 0);
  const q = String(item.q || item.question || '').trim();
  if (!q || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
  return clean({
    id: String(item.id || `${prefix}-${index + 1}`),
    number: Number.isFinite(Number(item.number)) ? Number(item.number) : undefined,
    skill: item.skill || item.unit || 'grammar',
    topic: item.topic || item.category || item.skill || 'general',
    level: item.level || 'practice',
    q,
    options,
    answer,
    explain: item.explain || item.explanation || item.reason || 'راجع القاعدة المرتبطة بالسؤال.',
    passage: item.passage || null,
    passageId: item.passageId || null,
    audio: item.audio || item.transcript || null,
    supplemental: Boolean(item.supplemental)
  });
}

const baseLessons = Array.isArray(window.NEON_STEP_BOOK_KAFAYAT_LESSONS) ? window.NEON_STEP_BOOK_KAFAYAT_LESSONS : [];
const masteryLessons = Array.isArray(window.NEON_STEP_MASTERY_LESSONS) ? window.NEON_STEP_MASTERY_LESSONS : [];
const lessons = [...baseLessons, ...masteryLessons]
  .filter((item, index, array) => item?.id && array.findIndex(other => other?.id === item.id) === index)
  .map(clean);

const rawModels = Array.isArray(window.NEON_STEP_BOOK_KAFAYAT_MODELS) ? window.NEON_STEP_BOOK_KAFAYAT_MODELS : [];
const models = rawModels.map((model, modelIndex) => {
  const passages = clean(model.passages || {});
  const questions = (model.questions || [])
    .map((question, index) => normalizeQuestion(question, index, model.id || `model-${modelIndex + 1}`))
    .filter(Boolean)
    .map(question => {
      if (!question.passage && question.passageId && passages[question.passageId]?.text) {
        return { ...question, passage: passages[question.passageId].text };
      }
      return question;
    });
  return clean({
    id: model.id || `step-model-${modelIndex + 1}`,
    number: Number(model.number || modelIndex + 1),
    title: model.title || `النموذج ${modelIndex + 1}`,
    minutes: Number(model.minutes || 30),
    questionCount: questions.length,
    passages,
    questions
  });
});

const masteryQuestions = (Array.isArray(window.NEON_STEP_MASTERY_QUESTIONS) ? window.NEON_STEP_MASTERY_QUESTIONS : [])
  .map((question, index) => normalizeQuestion(question, index, 'mastery'))
  .filter(Boolean);

const rawListening = window.NEON_STEP_BOOK_KAFAYAT_LISTENING || {};
const listeningExercises = (rawListening.interactiveExercises || [])
  .map((question, index) => normalizeQuestion(question, index, 'listening'))
  .filter(Boolean);
const listeningSets = clean((rawListening.sourceSets || []).map(set => ({
  id: set.id,
  title: set.title,
  questionRange: set.questionRange,
  minutes: set.minutes,
  status: set.status,
  note: set.note
})));

const fingerprint = question => `${question.q.toLowerCase()}|${question.options.join('|').toLowerCase()}`;
const seen = new Set();
const questionBank = [...models.flatMap(model => model.questions), ...masteryQuestions, ...listeningExercises]
  .filter(question => {
    const key = fingerprint(question);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

const metaSource = window.NEON_STEP_BOOK_KAFAYAT_META || {};
const content = {
  version: 1,
  generatedAt: new Date().toISOString(),
  meta: clean({
    id: metaSource.id || 'step-modern',
    title: metaSource.title || 'STEP',
    subtitle: metaSource.subtitle || 'مسار STEP المتكامل',
    lessonCount: lessons.length,
    modelCount: models.length,
    modelMinutes: Number(metaSource.modelMinutes || 30),
    listeningSets: listeningSets.length,
    listeningQuestions: listeningExercises.length
  }),
  skills: {
    grammar: 'القواعد',
    vocabulary: 'المفردات',
    reading: 'فهم المقروء',
    listening: 'الاستماع',
    analysis: 'تحليل الجملة'
  },
  topics: clean(window.NEON_STEP_BOOK_KAFAYAT_TOPICS || {}),
  lessons,
  models,
  listening: { sets: listeningSets, exercises: listeningExercises },
  questions: questionBank,
  counts: {
    lessons: lessons.length,
    models: models.length,
    questions: questionBank.length,
    listeningExercises: listeningExercises.length
  }
};

if (content.counts.lessons < 28) throw new Error(`STEP lessons unexpectedly low: ${content.counts.lessons}`);
if (content.counts.models < 7) throw new Error(`STEP models unexpectedly low: ${content.counts.models}`);
if (content.counts.questions < 150) throw new Error(`STEP questions unexpectedly low: ${content.counts.questions}`);

mkdirSync(outputRoot, { recursive: true });
writeFileSync(join(outputRoot, 'content.json'), `${JSON.stringify(content)}\n`);
console.log(`STEP content built: ${content.counts.lessons} lessons, ${content.counts.models} models, ${content.counts.questions} unique questions, ${content.counts.listeningExercises} listening exercises.`);
