import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const requiredFiles = [
  'index.html','auth.html','step.html','exams.html','games.html','kids-games.html','learning.html','coding.html','trust.html','admin.html',
  'data/step/content.json','data/coding/content.json','data/exams/manifest.json','data/exams/runtime/visuals.json','data/exams/runtime/learning-paths.json'
];
const forbiddenExtensions = new Set(['.map', '.pem', '.key', '.p12', '.pfx']);
const maxJavaScriptBytes = 180 * 1024;
const files = [];

function walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path);
  }
}

if (!existsSync(dist)) throw new Error('Release gate requires a completed dist build.');
for (const file of requiredFiles) {
  if (!existsSync(join(dist, file))) throw new Error(`Missing production artifact: dist/${file}`);
}
walk(dist);

const legacyFiles = files.filter(file => relative(dist, file).replaceAll('\\','/').startsWith('legacy/'));
if (legacyFiles.length) throw new Error(`Legacy runtime files found in production: ${legacyFiles.map(file => relative(dist,file)).join(', ')}`);

const forbidden = files.filter(file => forbiddenExtensions.has(extname(file).toLowerCase()) || /(^|[/\\])\.env(?:\.|$)/i.test(file));
if (forbidden.length) throw new Error(`Sensitive/debug artifact found in dist: ${forbidden.map(file => relative(dist,file)).join(', ')}`);

const oversized = files.filter(file => extname(file) === '.js' && statSync(file).size > maxJavaScriptBytes);
if (oversized.length) throw new Error(`JavaScript release budget exceeded (${maxJavaScriptBytes} bytes): ${oversized.map(file => `${relative(dist,file)}=${statSync(file).size}`).join(', ')}`);

for (const htmlPath of files.filter(file => extname(file) === '.html')) {
  const html = readFileSync(htmlPath, 'utf8');
  if (!/<meta\s+name=["']viewport["']/i.test(html)) throw new Error(`Missing responsive viewport: ${relative(dist, htmlPath)}`);
  if (/<(?:script|iframe)[^>]+(?:src|href)=["']\/legacy\//i.test(html)) throw new Error(`Legacy runtime reference in HTML: ${relative(dist, htmlPath)}`);
}

const step = JSON.parse(readFileSync(join(dist, 'data/step/content.json'), 'utf8'));
if ((step.counts?.lessons || 0) < 60 || (step.counts?.models || 0) < 7 || (step.counts?.questions || 0) < 250) throw new Error('STEP production content is below the guarded baseline.');
const exams = JSON.parse(readFileSync(join(dist, 'data/exams/manifest.json'), 'utf8'));
if ((exams.totalQuestions || 0) < 2600 || Object.keys(exams.subjects || {}).length !== 6) throw new Error('Exam production content is below the guarded baseline.');
const coding = JSON.parse(readFileSync(join(dist, 'data/coding/content.json'), 'utf8'));
if ((coding.counts?.courses || 0) < 10 || (coding.counts?.lessons || 0) < 20) throw new Error('Coding production content is below the guarded baseline.');

const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
const jsFiles = files.filter(file => extname(file) === '.js');
console.log(`Release artifact gate passed: ${files.length} files, ${(totalBytes/1024).toFixed(1)} KiB total, ${jsFiles.length} JS assets, zero Legacy/debug secrets.`);
