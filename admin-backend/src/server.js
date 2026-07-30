import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { firebaseProjectId } from './config/firebase.js';
import { requireAdmin } from './middleware/auth.js';
import adminUsersRouter from './routes/admin-users.js';
import publicAuthRouter from './routes/public-auth.js';

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);
const allowedOrigins = new Set(
  String(process.env.ALLOWED_ORIGINS || 'https://track2000one.github.io,http://localhost:5500,http://127.0.0.1:5500')
    .split(',')
    .map(value => value.trim().replace(/\/$/, ''))
    .filter(Boolean)
);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }
    const error = new Error('Origin not allowed by CORS');
    error.status = 403;
    error.code = 'CORS_ORIGIN_DENIED';
    return callback(error);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));
app.use(express.json({ limit: '100kb' }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'RATE_LIMITED', message: 'تم تجاوز عدد الطلبات المسموح مؤقتًا.' }
}));

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'NEON Academy Admin API',
    projectId: firebaseProjectId,
    documentation: '/api/health'
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'neon-riddle-admin-backend',
    projectId: firebaseProjectId,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', publicAuthRouter);

app.get('/api/admin/me', ...requireAdmin, (req, res) => {
  res.json({ ok: true, admin: req.adminUser });
});

app.use('/api/admin/users', adminUsersRouter);

app.use((req, res) => {
  res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'المسار المطلوب غير موجود.' });
});

app.use((error, _req, res, _next) => {
  console.error(error);

  const firebaseCode = error?.code || '';
  const status = error.status || (
    firebaseCode.includes('user-not-found') ? 404 :
    firebaseCode.includes('email-already-exists') ? 409 :
    firebaseCode.includes('phone-number-already-exists') ? 409 :
    firebaseCode.includes('invalid-') ? 400 :
    500
  );

  res.status(status).json({
    ok: false,
    code: error.code || 'INTERNAL_ERROR',
    message: status >= 500 ? 'حدث خطأ داخلي في خدمة إدارة المستخدمين.' : error.message
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`NEON Academy Admin API listening on port ${port}`);
});
