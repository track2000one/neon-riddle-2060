import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LEGACY_RUNTIME_ALLOWLIST } from './legacy-runtime-allowlist.mjs';

const root = process.cwd();
const sourceRoot = join(root, 'academy');
const packageRoot = join(root, 'dist', 'legacy');

function listFiles(directory, base = directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path, base));
    else files.push(relative(base, path).replaceAll('\\', '/'));
  }
  return files.sort();
}

function totalBytes(directory, files) {
  return files.reduce((sum, file) => sum + statSync(join(directory, file)).size, 0);
}

const expected = [...LEGACY_RUNTIME_ALLOWLIST].sort();
const packaged = listFiles(packageRoot);
const missing = expected.filter(file => !packaged.includes(file));
const extra = packaged.filter(file => !expected.includes(file));

if (missing.length || extra.length) {
  const details = [
    missing.length ? `Missing: ${missing.join(', ')}` : '',
    extra.length ? `Unexpected: ${extra.join(', ')}` : ''
  ].filter(Boolean).join('\n');
  throw new Error(`Selective Legacy package mismatch.\n${details}`);
}

const sourceFiles = listFiles(sourceRoot);
const sourceBytes = totalBytes(sourceRoot, sourceFiles);
const packagedBytes = totalBytes(packageRoot, packaged);
const fileReduction = sourceFiles.length ? (1 - packaged.length / sourceFiles.length) * 100 : 0;
const byteReduction = sourceBytes ? (1 - packagedBytes / sourceBytes) * 100 : 0;

console.log(`Selective Legacy package verified: ${packaged.length}/${sourceFiles.length} files published (${fileReduction.toFixed(1)}% fewer files).`);
console.log(`Legacy payload: ${packagedBytes}/${sourceBytes} bytes (${byteReduction.toFixed(1)}% smaller than academy source tree).`);
