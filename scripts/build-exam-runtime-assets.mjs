import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const academyDirectory = path.join(root, 'academy');
const outputDirectory = path.join(root, 'generated', 'exams');

const visualFiles = [
  'exam-visuals.js',
  'exam-visuals-page06-07.js',
  'exam-visuals-page08-09.js',
  'exam-visuals-page10-11.js',
  'exam-visuals-page18-23.js',
  'exam-visuals-page24-29.js',
  'exam-visuals-page30-41.js',
  'exam-visuals-page42-49.js',
  'exam-visuals-video-bank.js',
  'exam-visuals-video-compilations-2026.js',
  'exam-visuals-uploaded-tahsili-math-model8-2026.js',
  'exam-visuals-uploaded-tahsili-math-model12-2026.js'
];

const learningFiles = [
  'biology-mastery-lessons.js',
  'tahsili-advanced-lessons-2026.js'
];

function createContext() {
  const window = {};
  window.window = window;
  window.globalThis = window;
  return vm.createContext({
    window,
    globalThis: window,
    console,
    structuredClone,
    TextEncoder,
    TextDecoder,
    URL,
    setTimeout,
    clearTimeout
  });
}

async function evaluate(files) {
  const context = createContext();
  for (const file of files) {
    const source = await readFile(path.join(academyDirectory, file), 'utf8');
    vm.runInContext(source, context, { filename: file, timeout: 5000 });
  }
  return context.window;
}

async function collectVisuals() {
  const visuals = {};
  for (const file of visualFiles) {
    // Some historical visual bundles freeze their registry. Evaluate each source in
    // an isolated VM and merge only the serializable result into the modern asset.
    const windowObject = await evaluate([file]);
    const registry = windowObject.NEON_EXAM_VISUALS;
    if (!registry || typeof registry !== 'object') continue;
    for (const [id, svg] of Object.entries(registry)) {
      if (!id || typeof svg !== 'string' || !svg.includes('<svg')) continue;
      visuals[String(id)] = svg;
    }
  }
  return visuals;
}

function cleanLesson(value) {
  if (!value || typeof value !== 'object') return null;
  const id = String(value.id || '').trim();
  const title = String(value.title || '').trim();
  if (!id || !title) return null;
  const check = value.check && typeof value.check === 'object' ? {
    q: String(value.check.q || '').trim(),
    options: Array.isArray(value.check.options) ? value.check.options.map(item => String(item).trim()) : [],
    answer: Number(value.check.answer),
    explain: String(value.check.explain || '').trim()
  } : null;
  return {
    id,
    subject: String(value.subject || '').trim(),
    category: String(value.category || 'general').trim(),
    title,
    summary: String(value.summary || '').trim(),
    concepts: Array.isArray(value.concepts) ? value.concepts.map(item => String(item).trim()).filter(Boolean) : [],
    traps: Array.isArray(value.traps) ? value.traps.map(item => String(item).trim()).filter(Boolean) : [],
    check: check?.q && check.options.length >= 2 && Number.isInteger(check.answer) && check.answer >= 0 && check.answer < check.options.length ? check : null
  };
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });

  const visuals = await collectVisuals();
  const learningWindow = await evaluate(learningFiles);
  const biology = (learningWindow.NEON_BIOLOGY_MASTERY_LESSONS || []).map(cleanLesson).filter(Boolean)
    .map(lesson => ({ ...lesson, subject: 'tahsili-biology' }));
  const advanced = (learningWindow.NEON_TAHSILI_ADVANCED_LESSONS || []).map(cleanLesson).filter(Boolean);
  const lessons = [...biology, ...advanced];
  const groupedLessons = Map.groupBy(lessons, lesson => lesson.subject);

  if (Object.keys(visuals).length < 20) throw new Error(`Modern visual extraction is unexpectedly small: ${Object.keys(visuals).length}`);
  if (lessons.length < 20) throw new Error(`Modern lesson extraction is unexpectedly small: ${lessons.length}`);
  for (const subject of ['tahsili-math', 'tahsili-physics', 'tahsili-chemistry', 'tahsili-biology']) {
    if (!(groupedLessons.get(subject) || []).length) throw new Error(`No modern lessons extracted for ${subject}`);
  }

  await writeFile(path.join(outputDirectory, 'visuals.json'), `${JSON.stringify(visuals)}\n`, 'utf8');
  await writeFile(path.join(outputDirectory, 'learning-paths.json'), `${JSON.stringify({
    version: new Date().toISOString(),
    total: lessons.length,
    subjects: Object.fromEntries(groupedLessons.entries())
  })}\n`, 'utf8');

  console.log(`Exam runtime assets built: ${Object.keys(visuals).length} visuals and ${lessons.length} lessons.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
