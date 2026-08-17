import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const sourcePath = resolve('academy/coding-learning-center.js');
const outputPath = resolve('generated/coding/content.json');
const source = await readFile(sourcePath, 'utf8');

const start = source.indexOf('const L=');
const challengeStart = source.indexOf('const CHALLENGES=', start);
const challengeEndMarker = "].map(([id,language,title,level,description,starter,checks])=>({id,language,title,level,description,starter,checks}));";
const challengeEnd = source.indexOf(challengeEndMarker, challengeStart);

if (start < 0 || challengeStart < 0 || challengeEnd < 0) {
  throw new Error('Unable to locate coding course/challenge declarations in legacy source.');
}

const declarations = source.slice(start, challengeEnd + challengeEndMarker.length);
const context = Object.create(null);
context.globalThis = context;
vm.runInNewContext(`${declarations}\nglobalThis.__NEON_CODING_CONTENT__={COURSES,CHALLENGES};`, context, {
  timeout: 1_000,
  filename: 'coding-content-extract.vm.js'
});

const extracted = context.__NEON_CODING_CONTENT__;
if (!extracted?.COURSES || !Array.isArray(extracted.CHALLENGES)) {
  throw new Error('Coding content extraction did not produce courses and challenges.');
}

const courses = Object.values(extracted.COURSES).map(course => ({
  id: String(course.id || '').trim(),
  title: String(course.title || '').trim(),
  icon: String(course.icon || '').trim(),
  color: String(course.color || '').trim(),
  description: String(course.description || '').trim(),
  lessons: Array.isArray(course.lessons) ? course.lessons.map(lesson => ({
    id: String(lesson.id || '').trim(),
    title: String(lesson.title || '').trim(),
    level: String(lesson.level || '').trim(),
    minutes: Number(lesson.minutes) || 0,
    summary: String(lesson.summary || '').trim(),
    points: Array.isArray(lesson.points) ? lesson.points.map(String) : [],
    code: String(lesson.code || ''),
    question: String(lesson.q || '').trim(),
    options: Array.isArray(lesson.options) ? lesson.options.map(String) : [],
    answer: Number(lesson.answer),
    task: String(lesson.task || '').trim()
  })) : []
}));

const challenges = extracted.CHALLENGES.map(challenge => ({
  id: String(challenge.id || '').trim(),
  language: String(challenge.language || '').trim(),
  title: String(challenge.title || '').trim(),
  level: String(challenge.level || '').trim(),
  description: String(challenge.description || '').trim(),
  starter: String(challenge.starter || ''),
  checks: Array.isArray(challenge.checks) ? challenge.checks.map(String) : []
}));

const courseIds = new Set(courses.map(course => course.id));
const lessonIds = new Set();
for (const course of courses) {
  if (!course.id || !course.title || !course.lessons.length) throw new Error(`Invalid coding course: ${course.id || '<missing id>'}`);
  if (course.lessons.some(lesson => !lesson.id || !lesson.title || !lesson.options.length || !Number.isInteger(lesson.answer) || lesson.answer < 0 || lesson.answer >= lesson.options.length)) {
    throw new Error(`Invalid lesson payload in course ${course.id}`);
  }
  for (const lesson of course.lessons) {
    if (lessonIds.has(lesson.id)) throw new Error(`Duplicate coding lesson id: ${lesson.id}`);
    lessonIds.add(lesson.id);
  }
}
for (const challenge of challenges) {
  if (!challenge.id || !courseIds.has(challenge.language) || !challenge.checks.length) throw new Error(`Invalid coding challenge: ${challenge.id || '<missing id>'}`);
}

const payload = {
  version: 'modern-coding-v1',
  generatedAt: new Date().toISOString(),
  counts: {
    courses: courses.length,
    lessons: courses.reduce((sum, course) => sum + course.lessons.length, 0),
    challenges: challenges.length
  },
  courses,
  challenges
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Coding content built: ${payload.counts.courses} courses, ${payload.counts.lessons} lessons, ${payload.counts.challenges} challenges.`);
