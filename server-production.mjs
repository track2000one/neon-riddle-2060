import { createServer } from 'node:http';
import { closeProgressDatabase, handleProgressApi } from './server/progress.mjs';
import { closeQuestionMasteryDatabase, handleQuestionMasteryApi } from './server/question-mastery.mjs';
import { closeStudentSuccessDatabase, handleStudentSuccessApi } from './server/student-success.mjs';
import { geminiRuntimeInfo, handleTutorApi } from './server/gemini.mjs';
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

const server = createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent(String(req.url || '/').split('?')[0]);
    if (await handleStudentSuccessApi(req, res, requestPath, readJsonBody)) return;
    if (await handleQuestionMasteryApi(req, res, requestPath, readJsonBody)) return;
    if (await handleProgressApi(req, res, requestPath, readJsonBody)) return;
    if (await handleTutorApi(req, res, requestPath, readJsonBody)) return;
    handleStatic(req, res, requestPath);
  } catch (error) {
    console.error('NEON server error:', error);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('حدث خطأ أثناء تحميل الصفحة');
  }
});

async function shutdown(signal) {
  console.log(`Received ${signal}; closing NEON server.`);
  server.close(async () => {
    try {
      await Promise.allSettled([
        closeProgressDatabase(),
        closeQuestionMasteryDatabase(),
        closeStudentSuccessDatabase()
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
  const gemini = geminiRuntimeInfo.configured ? geminiRuntimeInfo.model : 'local fallback';
  console.log(`NEON listening on http://${host}:${port} | Gemini: ${gemini} | Progress: ${database} | Success dashboard: enabled`);
});