import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LEGACY_RUNTIME_ALLOWLIST, LEGACY_RUNTIME_OWNER, legacyRuntimeUrl } from './legacy-runtime-allowlist.mjs';

const root = process.cwd();
const appRoot = join(root, 'app');
const legacySource = join(root, 'academy');
const ownerPath = join(root, LEGACY_RUNTIME_OWNER);
const allowedUrls = new Set(LEGACY_RUNTIME_ALLOWLIST.map(legacyRuntimeUrl));
const allowedExtensions = new Set(['.html', '.js', '.mjs', '.css']);
const runtimeReferences = [];

function extension(path) {
  const index = path.lastIndexOf('.');
  return index >= 0 ? path.slice(index) : '';
}

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (allowedExtensions.has(extension(entry.name))) inspect(path);
  }
}

function inspect(path) {
  const source = readFileSync(path, 'utf8');
  const regex = /\/legacy\/[A-Za-z0-9._/-]+\.js\b/g;
  for (const match of source.matchAll(regex)) {
    runtimeReferences.push({ file: relative(root, path).replaceAll('\\', '/'), url: match[0] });
  }
}

if (!existsSync(ownerPath)) throw new Error(`Legacy runtime owner is missing: ${LEGACY_RUNTIME_OWNER}`);
for (const fileName of LEGACY_RUNTIME_ALLOWLIST) {
  const sourcePath = join(legacySource, fileName);
  if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
    throw new Error(`Allowlisted legacy source is missing: academy/${fileName}`);
  }
}

walk(appRoot);

const unexpected = runtimeReferences.filter(item => item.file !== LEGACY_RUNTIME_OWNER || !allowedUrls.has(item.url));
if (unexpected.length) {
  throw new Error(`Unexpected modern Legacy JavaScript runtime reference(s):\n${unexpected.map(item => `- ${item.file}: ${item.url}`).join('\n')}`);
}

const ownerSource = readFileSync(ownerPath, 'utf8');
const missingReferences = LEGACY_RUNTIME_ALLOWLIST.filter(fileName => !ownerSource.includes(legacyRuntimeUrl(fileName)));
if (missingReferences.length) {
  throw new Error(`Allowlisted Legacy file(s) are not referenced by ${LEGACY_RUNTIME_OWNER}: ${missingReferences.join(', ')}`);
}

for (const htmlName of readdirSync(appRoot).filter(name => name.endsWith('.html'))) {
  const html = readFileSync(join(appRoot, htmlName), 'utf8');
  if (/<(?:script|iframe)[^>]+(?:src|href)=["']\/legacy\//i.test(html)) {
    throw new Error(`Modern HTML entry must not directly load Legacy assets: app/${htmlName}`);
  }
}

const viteSource = readFileSync(join(root, 'vite.config.js'), 'utf8');
if (/cpSync\(legacySource[^\n]*recursive\s*:\s*true/.test(viteSource)) {
  throw new Error('Full academy -> dist/legacy recursive copy is forbidden. Use LEGACY_RUNTIME_ALLOWLIST.');
}

console.log(`Selective Legacy runtime guard passed: ${runtimeReferences.length} JavaScript references, all owned by ${LEGACY_RUNTIME_OWNER}.`);
