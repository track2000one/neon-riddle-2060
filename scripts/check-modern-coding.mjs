import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const required = [
  'app/coding.html',
  'app/src/coding.js',
  'app/src/coding.css',
  'scripts/build-coding-content.mjs'
];
const missing = required.filter(file => !existsSync(file));
if (missing.length) throw new Error(`Modern coding files missing: ${missing.join(', ')}`);

const html = await readFile('app/coding.html', 'utf8');
const runtime = await readFile('app/src/coding.js', 'utf8');
const staticServer = await readFile('server/static.mjs', 'utf8');
const vite = await readFile('vite.config.js', 'utf8');

if (/legacy\/coding\.html|coding-frame/.test(html)) throw new Error('app/coding.html: legacy coding iframe reference detected');
if (/\/legacy\/coding|coding-learning-center\.js/.test(runtime)) throw new Error('app/src/coding.js: legacy coding runtime dependency detected');
if (!/sandbox="allow-scripts"/.test(html) || /allow-same-origin/.test(html)) throw new Error('app/coding.html: preview sandbox must allow scripts without same-origin access');
if (!/data-modern-coding-center="true"/.test(html)) throw new Error('app/coding.html: modern coding marker missing');
if (!/PROGRESS_PREFIX\s*=\s*'neonCodingProgressV3:'/.test(runtime)) throw new Error('app/src/coding.js: account-scoped coding progress key missing');
if (!/event\.source\s*!==\s*preview\?\.contentWindow/.test(runtime)) throw new Error('app/src/coding.js: sandbox message source validation missing');
if (/isEmbeddedLegacyRequest/.test(staticServer)) throw new Error('server/static.mjs: embedded legacy coding bypass still exists');
if (!/\['\/legacy\/coding\.html', '\/coding'\]/.test(staticServer)) throw new Error('server/static.mjs: legacy coding redirect missing');
if (!/generatedCodingSource/.test(vite) || !/data\/coding/.test(vite)) throw new Error('vite.config.js: generated coding data publication missing');

console.log('Modern coding center guard passed.');
