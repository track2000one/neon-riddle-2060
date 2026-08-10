import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const appRoot = join(root, 'app');
const allowedExtensions = new Set(['.html', '.js', '.mjs', '.css']);
const runtimeReferences = [];

function extension(path) {
  const index = path.lastIndexOf('.');
  return index >= 0 ? path.slice(index) : '';
}

function inspect(path) {
  const source = readFileSync(path, 'utf8');
  for (const match of source.matchAll(/\/legacy\/[A-Za-z0-9._/-]+\.js\b/g)) {
    runtimeReferences.push({ file: relative(root, path).replaceAll('\\', '/'), url: match[0] });
  }
  if (path.endsWith('.html') && /<(?:script|iframe)[^>]+(?:src|href)=["']\/legacy\//i.test(source)) {
    runtimeReferences.push({ file: relative(root, path).replaceAll('\\', '/'), url: 'direct Legacy HTML runtime asset' });
  }
}

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (allowedExtensions.has(extension(entry.name))) inspect(path);
  }
}

walk(appRoot);
if (runtimeReferences.length) {
  throw new Error(`Legacy runtime dependency detected in modern app:\n${runtimeReferences.map(item => `- ${item.file}: ${item.url}`).join('\n')}`);
}

const viteSource = readFileSync(join(root, 'vite.config.js'), 'utf8');
if (/legacySource|LEGACY_RUNTIME_ALLOWLIST|dist\/legacy|outputDirectory[^\n]*legacy/.test(viteSource)) {
  throw new Error('Vite production build must not package a Legacy runtime directory.');
}

console.log('Zero-Legacy runtime guard passed: no modern page loads /legacy/*.js or Legacy iframes.');
