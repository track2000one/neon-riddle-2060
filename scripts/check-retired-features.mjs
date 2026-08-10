import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const forbiddenFiles = [
  'app/tutor.html',
  'app/src/tutor-retirement.js',
  'app/src/tutor-direct-answer.js',
  'app/src/tutor-gemini.css',
  'app/src/tutor-gemini.js',
  'app/src/tutor.css',
  'app/src/tutor.js',
  'server/gemini.mjs'
];

const present = forbiddenFiles.filter(existsSync);
if (present.length) {
  throw new Error(`Retired Tutor files returned: ${present.join(', ')}`);
}

const runtimeFiles = ['server-production.mjs', 'server.mjs', 'vite.config.js'];
const forbiddenPatterns = [
  /GEMINI_API_KEY/,
  /GOOGLE_API_KEY/,
  /generativelanguage\.googleapis\.com/,
  /handleTutorApi/,
  /geminiRuntimeInfo/,
  /app\/tutor\.html/
];

for (const file of runtimeFiles) {
  const source = await readFile(file, 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) throw new Error(`${file}: retired Tutor/Gemini runtime reference detected (${pattern})`);
  }
}

console.log('Retired Tutor/Gemini runtime guard passed.');
