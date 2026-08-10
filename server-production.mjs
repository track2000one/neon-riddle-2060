import { createServer } from 'node:http';
import { closeAdminDashboardDatabase, handleAdminDashboardApi } from './server/admin-dashboard.mjs';
import { closeAdminUsersDatabase, handleAdminUsersApi } from './server/admin-users.mjs';
import { closeCompetitionDatabase, handleCompetitionApi } from './server/competition.mjs';
import { closePlatformAccessDatabase, guardPlatformAccess, handlePlatformAccessApi } from './server/platform-access.mjs';
import { closeProgressDatabase, handleProgressApi } from './server/progress.mjs';
import { closeQuestionMasteryDatabase, handleQuestionMasteryApi } from './server/question-mastery.mjs';
import { applySecurityHeaders } from './server/security-headers.mjs';
import { closeStudentSuccessDatabase, handleStudentSuccessApi } from './server/student-success.mjs';
import { closeStudentStateDatabase, handleStudentStateApi } from './server/student-state.mjs';
import { handleStatic } from './server/static.mjs';

const port = Number(process.env.PORT || 3000);
const host = '0.0.0.0';
const maxBodyBytes = 64 * 1024;

function readJsonBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        rejectBody(Object.assign(new Error('PAYLOAD_TOO_LARGE'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch {
        rejectBody(Object.assign(new Error('INVALID_JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', rejectBody);
  });
}

function sendJson(res, status, payload, { headOnly = false } = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(headOnly ? undefined : body);
}

function handleHealth(req, res, requestPath) {
  if (requestPath !== '/healthz') return false;
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
    res.end();
    return true;
  }
  sendJson(res, 200, {
    status: 'ok',
    service: 'neon-learning-platform',
    runtime: 'modern',
    legacyRuntime: false
  }, { headOnly: req.method === 'HEAD' });
  return true;
}

function handleRetiredRoutes(req, res, requestPath) {
  if (!['/api/tutor', '/api/tutor/status'].includes(requestPath)) return false;
  sendJson(res, 410, {
    error: 'FEATURE_RETIRED',
    feature: 'tutor',
    message: 'تم إيقاف المعلم الذكي القديم وإزالة تكامل Gemini من خادم NEON.'
  });
  return true;
}

const server = createServer(async (req, res) => {
  applySecurityHeaders(res);
  try {
    const requestPath = decodeURIComponent(String(req.url || '/').split('?')[0]);
    if (handleHealth(req, res, requestPath)) return;
    if (handleRetiredRoutes(req, res, requestPath)) return;
    if (await handlePlatformAccessApi(req, res, requestPath)) return;
    if (await guardPlatformAccess(req, res, requestPath)) return;
    if (await handleAdminUsersApi(req, res, requestPath, readJsonBody)) return;
    if (await handleAdminDashboardApi(req, res, requestPath, readJsonBody)) return;
    if (await handleStudentStateApi(req, res, requestPath, readJsonBody)) return;
    if (await handleStudentSuccessApi(req, res, requestPath, readJsonBody)) return;
    if (await handleQuestionMasteryApi(req, res, requestPath, readJsonBody)) return;
    if (await handleProgressApi(req, res, requestPath, readJsonBody)) return;
    if (await handleCompetitionApi(req, res, requestPath, readJsonBody)) return;
    handleStatic(req, res, requestPath);
  } catch (error) {
    console.error('NEON server error:', error);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('حدث خطأ أثناء تحميل الصفحة');
  }
});

async function shutdown(signal) {
  console.log(`Received ${signal}; closing NEON server.`);
  server.close(async () => {
    try {
      await Promise.allSettled([
        closeAdminDashboardDatabase(),
        closeAdminUsersDatabase(),
        closePlatformAccessDatabase(),
        closeCompetitionDatabase(),
        closeProgressDatabase(),
        closeQuestionMasteryDatabase(),
        closeStudentSuccessDatabase(),
        closeStudentStateDatabase()
      ]);
    } finally {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

server.listen(port, host, () => {
  const database = process.env.DATABASE_URL || process.env.PROGRESS_DATABASE_URL ? 'postgresql' : 'local queue';
  console.log(`NEON listening on http://${host}:${port} | Progress: ${database} | Student state: ${database} | Access control: enabled | Admin RBAC: enabled | Competitions: enabled | Success dashboard: enabled | Tutor: retired | Health: /healthz`);
});
