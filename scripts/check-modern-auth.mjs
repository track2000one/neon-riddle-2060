import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const required = [
  'app/auth.html',
  'app/src/auth-page.js',
  'app/src/auth-page.css',
  'app/src/firebase-config.js'
];

const missing = required.filter(file => !existsSync(file));
if (missing.length) throw new Error(`Modern auth files missing: ${missing.join(', ')}`);

const authRuntime = await readFile('app/src/auth.js', 'utf8');
const authPage = await readFile('app/src/auth-page.js', 'utf8');
const viteConfig = await readFile('vite.config.js', 'utf8');
const staticServer = await readFile('server/static.mjs', 'utf8');

for (const [file, source] of [['app/src/auth.js', authRuntime], ['app/src/auth-page.js', authPage]]) {
  if (/\/legacy\/auth\.html/.test(source)) throw new Error(`${file}: modern auth still routes through legacy/auth.html`);
  if (/\/legacy\/firebase-config\.js/.test(source)) throw new Error(`${file}: modern auth still loads legacy Firebase config`);
}

if (!/auth:\s*fileURLToPath\(new URL\('\.\/app\/auth\.html'/.test(viteConfig)) {
  throw new Error('vite.config.js: modern auth is not a Vite MPA entry');
}
if (!/\['\/legacy\/auth\.html', '\/auth'\]/.test(staticServer)) {
  throw new Error('server/static.mjs: legacy auth redirect to /auth is missing');
}
if (!/registerPlatformAccess\(user\)/.test(authPage) || !/ACCOUNT_SUSPENDED/.test(authPage)) {
  throw new Error('app/src/auth-page.js: platform access guard is not enforced');
}
if (!/claimLocalStateOwner\(localStorage,user\.uid\)/.test(authPage.replace(/\s+/g,''))) {
  throw new Error('app/src/auth-page.js: account-local-state isolation is missing');
}

console.log('Modern authentication guard passed.');
