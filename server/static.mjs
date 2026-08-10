import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { createBrotliCompress, createGzip, constants as zlibConstants } from 'node:zlib';

const root = resolve(process.cwd(), 'dist');
const redirects = new Map([
  ['/tutor', '/'],
  ['/tutor/', '/'],
  ['/tutor.html', '/'],
  ['/legacy', '/'],
  ['/legacy/', '/'],
  ['/legacy/index.html', '/'],
  ['/legacy/auth.html', '/auth'],
  ['/legacy/games.html', '/games'],
  ['/legacy/learning.html', '/learning'],
  ['/legacy/coding.html', '/coding'],
  ['/legacy/exams.html', '/exams'],
  ['/legacy/kids-games.html', '/kids-games'],
  ['/legacy/tutor.html', '/']
]);
const criticalAuthFiles = new Set([
  '/auth.html',
  '/legacy/auth.html',
  '/legacy/auth.js',
  '/legacy/auth-portal-routing.js',
  '/legacy/auth-phone.js',
  '/legacy/auth-language-bridge.js',
  '/legacy/firebase-config.js'
]);
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};
const compressible = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt']);

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const clean = normalize(decoded).replace(/^([/\\])+/, '');
  const candidate = resolve(root, clean || 'index.html');
  return candidate.startsWith(root) ? candidate : null;
}

function resolveFile(urlPath) {
  const candidate = safePath(urlPath);
  if (!candidate) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  if (!extname(candidate)) {
    const htmlCandidate = `${candidate}.html`;
    if (existsSync(htmlCandidate) && statSync(htmlCandidate).isFile()) return htmlCandidate;
    const indexCandidate = join(candidate, 'index.html');
    if (existsSync(indexCandidate) && statSync(indexCandidate).isFile()) return indexCandidate;
  }
  return null;
}

function cacheControl(filePath) {
  const relative = filePath.slice(root.length).replaceAll('\\', '/');
  if (criticalAuthFiles.has(relative)) return 'no-store, no-cache, must-revalidate, max-age=0';
  if (relative.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (relative.startsWith('/data/exams/') || relative.startsWith('/data/coding/')) return 'public, max-age=86400, stale-while-revalidate=604800';
  if (relative.startsWith('/legacy/')) return 'public, max-age=3600, stale-while-revalidate=86400';
  if (extname(filePath) === '.html') return 'public, max-age=0, must-revalidate';
  return 'public, max-age=3600';
}

function redirectLocation(req, requestPath, destination) {
  if (requestPath !== '/legacy/auth.html') return destination;
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    return `${destination}${url.search}`;
  } catch {
    return destination;
  }
}

export function handleStatic(req, res, requestPath) {
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  const destination = redirects.get(requestPath);
  if (destination) {
    res.writeHead(308, { Location: redirectLocation(req, requestPath, destination), 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' });
    res.end();
    return;
  }

  const filePath = resolveFile(req.url || '/');
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('404 — الصفحة غير موجودة');
    return;
  }
  const stats = statSync(filePath);
  const extension = extname(filePath).toLowerCase();
  const type = mimeTypes[extension] || 'application/octet-stream';
  const policy = cacheControl(filePath);
  const etag = `W/\"${stats.size}-${Math.floor(stats.mtimeMs)}\"`;
  if (!policy.includes('no-store') && req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': policy });
    res.end();
    return;
  }
  const headers = {
    'Content-Type': type,
    'Cache-Control': policy,
    ETag: etag,
    'Last-Modified': stats.mtime.toUTCString(),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
  if (policy.includes('no-store')) {
    headers.Pragma = 'no-cache';
    headers.Expires = '0';
  }
  if (req.method === 'HEAD') {
    res.writeHead(200, { ...headers, 'Content-Length': stats.size });
    res.end();
    return;
  }
  const accepted = String(req.headers['accept-encoding'] || '');
  const shouldCompress = compressible.has(extension) && stats.size > 1024;
  const stream = createReadStream(filePath);
  if (shouldCompress && accepted.includes('br')) {
    headers['Content-Encoding'] = 'br';
    headers.Vary = 'Accept-Encoding';
    res.writeHead(200, headers);
    stream.pipe(createBrotliCompress({ params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 } })).pipe(res);
    return;
  }
  if (shouldCompress && accepted.includes('gzip')) {
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
    res.writeHead(200, headers);
    stream.pipe(createGzip({ level: 6 })).pipe(res);
    return;
  }
  headers['Content-Length'] = stats.size;
  res.writeHead(200, headers);
  stream.pipe(res);
}
