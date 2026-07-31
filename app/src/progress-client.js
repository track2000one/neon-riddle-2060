const MIGRATION_PREFIX = 'neonProgressMigratedV1:';
const SUMMARY_CACHE_PREFIX = 'neonProgressSummaryV1:';
const API_BASE = String(window.NEON_PROGRESS_API_BASE || '').replace(/\/$/, '');

let activeSession = null;
let cachedSummary = null;
let inFlightSummary = null;

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; }
  catch { return fallback; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); }
  catch { /* Progress remains usable without local cache. */ }
}

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function authHeaders(session = activeSession) {
  const user = session?.user;
  if (!user?.getIdToken) throw new Error('AUTH_SESSION_UNAVAILABLE');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function request(path, options = {}, session = activeSession) {
  const headers = await authHeaders(session);
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `HTTP_${response.status}`);
    error.code = data.error || `HTTP_${response.status}`;
    error.status = response.status;
    throw error;
  }
  return data;
}

function summaryCacheKey(session = activeSession) {
  return `${SUMMARY_CACHE_PREFIX}${session?.user?.uid || 'anonymous'}`;
}

export function configureProgress(session) {
  activeSession = session || null;
  if (session?.user?.uid) cachedSummary = safeJson(summaryCacheKey(session), null);
  window.NEON_PROGRESS = {
    record: event => recordProgress(event),
    summary: options => loadProgressSummary(options),
    sync: () => migrateLegacyProgress(),
    flush: () => flushProgressQueue(),
    getCached: () => cachedSummary
  };
  return activeSession;
}

export async function loadProgressSummary({ force = false } = {}) {
  if (!activeSession) throw new Error('AUTH_SESSION_UNAVAILABLE');
  if (!force && cachedSummary) return cachedSummary;
  if (inFlightSummary) return inFlightSummary;
  inFlightSummary = request('/api/progress/me', { method: 'GET' })
    .then(data => {
      cachedSummary = data;
      safeSet(summaryCacheKey(), data);
      window.dispatchEvent(new CustomEvent('neon-progress-summary', { detail: data }));
      return data;
    })
    .finally(() => { inFlightSummary = null; });
  return inFlightSummary;
}

export async function recordProgress(event, { refresh = true } = {}) {
  if (!activeSession || !event || typeof event !== 'object') return { ok: false, localOnly: true };
  const normalized = {
    eventType: event.eventType || 'activity',
    eventKey: event.eventKey || `${event.eventType || 'activity'}:${event.centerId || 'general'}:${event.itemId || Date.now()}`,
    centerId: event.centerId || 'general',
    itemType: event.itemType || 'activity',
    itemId: event.itemId || `${Date.now()}`,
    title: event.title || '',
    status: event.status || 'in_progress',
    progressPercent: Number(event.progressPercent || 0),
    masteryScore: Number(event.masteryScore ?? event.score ?? 0),
    score: Number(event.score ?? event.masteryScore ?? 0),
    subjectId: event.subjectId || '',
    correct: Number(event.correct || 0),
    total: Number(event.total || 0),
    durationSeconds: Number(event.durationSeconds || 0),
    href: event.href || `${location.pathname}${location.search}${location.hash}`,
    position: event.position || {},
    metadata: event.metadata || {},
    details: event.details || {}
  };

  try {
    const result = await request('/api/progress/activity', { method: 'POST', body: JSON.stringify(normalized) });
    if (refresh) {
      cachedSummary = null;
      loadProgressSummary({ force: true }).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('neon-progress-recorded', { detail: { event: normalized, result } }));
    return result;
  } catch (error) {
    const queueKey = `neonProgressQueueV1:${activeSession.user.uid}`;
    const queue = safeJson(queueKey, []);
    queue.push(normalized);
    safeSet(queueKey, queue.slice(-200));
    window.dispatchEvent(new CustomEvent('neon-progress-offline', { detail: { event: normalized, error: error.code || error.message } }));
    return { ok: false, queued: true, error: error.code || error.message };
  }
}

export async function flushProgressQueue() {
  if (!activeSession) return;
  const queueKey = `neonProgressQueueV1:${activeSession.user.uid}`;
  const queue = safeJson(queueKey, []);
  if (!queue.length) return;
  const remaining = [];
  for (const event of queue) {
    try { await request('/api/progress/activity', { method: 'POST', body: JSON.stringify(event) }); }
    catch { remaining.push(event); }
  }
  safeSet(queueKey, remaining);
  if (remaining.length !== queue.length) {
    cachedSummary = null;
    loadProgressSummary({ force: true }).catch(() => {});
  }
}

function legacyEvents() {
  const events = [];
  const learning = safeJson('neonLearningProgressV1', { completed: [] });
  const lastLesson = localStorage.getItem('neonLearningLastLessonV1');
  for (const lessonId of Array.isArray(learning.completed) ? learning.completed : []) {
    events.push({
      centerId: 'learning', itemType: 'lesson', itemId: lessonId, title: lessonId,
      status: 'completed', progressPercent: 100, masteryScore: 100,
      href: `/learning#lesson=${encodeURIComponent(lessonId)}`,
      metadata: { importedFrom: 'neonLearningProgressV1' }
    });
  }
  if (lastLesson && !events.some(event => event.itemId === lastLesson)) {
    events.push({
      centerId: 'learning', itemType: 'lesson', itemId: lastLesson, title: lastLesson,
      status: 'in_progress', progressPercent: 10,
      href: `/learning#lesson=${encodeURIComponent(lastLesson)}`,
      metadata: { importedFrom: 'neonLearningLastLessonV1' }
    });
  }

  const games = safeJson('neonGamesProgressV1', { completed: [] });
  for (const key of Array.isArray(games.completed) ? games.completed : []) {
    const [track, ...moduleParts] = String(key).split(':');
    const module = moduleParts.join(':') || key;
    events.push({
      centerId: 'games', itemType: 'challenge', itemId: key, title: module,
      status: 'completed', progressPercent: 100, masteryScore: Number(games.best || 0),
      href: '/games', metadata: { track, importedFrom: 'neonGamesProgressV1' }
    });
  }

  const exams = safeJson('neonOptimizedExamHistoryV1', []);
  for (const [index, attempt] of (Array.isArray(exams) ? exams.slice(-50) : []).entries()) {
    events.push({
      centerId: 'exams', itemType: 'assessment', itemId: `legacy-${attempt.subject || 'exam'}-${index}`,
      title: attempt.subject || 'اختبار سابق', status: 'completed', progressPercent: 100,
      masteryScore: Number(attempt.score || 0), score: Number(attempt.score || 0),
      subjectId: attempt.subject || '', correct: Number(attempt.correct || 0), total: Number(attempt.total || 0),
      href: '/exams', metadata: { importedFrom: 'neonOptimizedExamHistoryV1', date: attempt.date || null }
    });
  }
  return events.slice(0, 500);
}

export async function migrateLegacyProgress() {
  if (!activeSession?.user?.uid) return { ok: false };
  const marker = `${MIGRATION_PREFIX}${activeSession.user.uid}`;
  if (localStorage.getItem(marker) === 'done') return { ok: true, skipped: true };
  const events = legacyEvents();
  try {
    const result = await request('/api/progress/sync', { method: 'POST', body: JSON.stringify({ events }) });
    localStorage.setItem(marker, 'done');
    cachedSummary = null;
    await loadProgressSummary({ force: true });
    return result;
  } catch (error) {
    return { ok: false, error: error.code || error.message };
  }
}

window.addEventListener('online', () => flushProgressQueue().catch(() => {}));
window.addEventListener('neon-progress', event => recordProgress(event.detail).catch(() => {}));
