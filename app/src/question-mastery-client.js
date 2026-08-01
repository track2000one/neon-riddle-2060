const API_BASE = String(window.NEON_PROGRESS_API_BASE || '').replace(/\/$/, '');
const CACHE_PREFIX = 'neonQuestionMasteryV2:';
const QUEUE_PREFIX = 'neonQuestionMasteryQueueV2:';

let activeSession = null;
const inFlightLoads = new Map();

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; }
  catch { return fallback; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* The in-memory controller remains usable. */ }
}

function userId() {
  return activeSession?.user?.uid || 'anonymous';
}

function cacheKey(subjectId) {
  return `${CACHE_PREFIX}${userId()}:${subjectId}`;
}

function queueKey() {
  return `${QUEUE_PREFIX}${userId()}`;
}

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function headers() {
  const user = activeSession?.user;
  if (!user?.getIdToken) throw new Error('AUTH_SESSION_UNAVAILABLE');
  return {
    Authorization: `Bearer ${await user.getIdToken()}`,
    'Content-Type': 'application/json'
  };
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { ...(await headers()), ...(options.headers || {}) },
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

function recordTime(record) {
  const value = Date.parse(record?.updatedAt || record?.lastSeenAt || 0);
  return Number.isFinite(value) ? value : 0;
}

function mergeRecords(...groups) {
  const byId = new Map();
  for (const group of groups) {
    for (const record of Array.isArray(group) ? group : []) {
      const questionId = String(record?.questionId || record?.id || '').trim();
      if (!questionId) continue;
      const normalized = { ...record, questionId };
      const current = byId.get(questionId);
      if (!current || recordTime(normalized) >= recordTime(current)) byId.set(questionId, normalized);
    }
  }
  return [...byId.values()];
}

function saveLocal(subjectId, records) {
  const merged = mergeRecords(safeJson(cacheKey(subjectId), []), records);
  safeSet(cacheKey(subjectId), merged);
  return merged;
}

function enqueue(subjectId, records) {
  const queue = safeJson(queueKey(), {});
  queue[subjectId] = mergeRecords(queue[subjectId], records);
  safeSet(queueKey(), queue);
}

export function configureQuestionMastery(session) {
  activeSession = session || null;
  window.NEON_QUESTION_MASTERY = {
    userId: userId(),
    load: subjectId => loadQuestionMastery(subjectId),
    save: (subjectId, records) => saveQuestionMastery(subjectId, records),
    flush: () => flushQuestionMasteryQueue(),
    local: subjectId => safeJson(cacheKey(subjectId), [])
  };
  flushQuestionMasteryQueue().catch(() => {});
  return window.NEON_QUESTION_MASTERY;
}

export async function loadQuestionMastery(subjectId, { force = false } = {}) {
  const subject = String(subjectId || '').trim();
  if (!subject) return [];
  const local = safeJson(cacheKey(subject), []);
  if (!activeSession?.user?.getIdToken) return local;
  if (!force && inFlightLoads.has(subject)) return inFlightLoads.get(subject);

  const load = request(`/api/mastery/questions?subject=${encodeURIComponent(subject)}`, { method: 'GET' })
    .then(data => {
      const merged = mergeRecords(local, data.records);
      safeSet(cacheKey(subject), merged);
      window.dispatchEvent(new CustomEvent('neon-question-mastery-loaded', {
        detail: { subjectId: subject, records: merged }
      }));
      return merged;
    })
    .catch(error => {
      console.warn('Question mastery load:', error.code || error.message);
      return local;
    })
    .finally(() => inFlightLoads.delete(subject));

  inFlightLoads.set(subject, load);
  return load;
}

export async function saveQuestionMastery(subjectId, records) {
  const subject = String(subjectId || '').trim();
  const normalized = mergeRecords(records).map(record => ({
    ...record,
    subjectId: subject,
    updatedAt: record.updatedAt || new Date().toISOString()
  }));
  if (!subject || !normalized.length) return { ok: true, saved: 0 };

  saveLocal(subject, normalized);
  if (!activeSession?.user?.getIdToken) {
    enqueue(subject, normalized);
    return { ok: false, localOnly: true, saved: normalized.length };
  }

  try {
    const result = await request('/api/mastery/questions', {
      method: 'POST',
      body: JSON.stringify({ subjectId: subject, records: normalized })
    });
    window.dispatchEvent(new CustomEvent('neon-question-mastery-saved', {
      detail: { subjectId: subject, records: normalized, result }
    }));
    return result;
  } catch (error) {
    enqueue(subject, normalized);
    window.dispatchEvent(new CustomEvent('neon-question-mastery-offline', {
      detail: { subjectId: subject, records: normalized, error: error.code || error.message }
    }));
    return { ok: false, queued: true, error: error.code || error.message };
  }
}

export async function flushQuestionMasteryQueue() {
  if (!activeSession?.user?.getIdToken) return { ok: false, localOnly: true };
  const queue = safeJson(queueKey(), {});
  const remaining = {};
  let saved = 0;

  for (const [subjectId, records] of Object.entries(queue)) {
    if (!Array.isArray(records) || !records.length) continue;
    try {
      const result = await request('/api/mastery/questions', {
        method: 'POST',
        body: JSON.stringify({ subjectId, records })
      });
      saved += Number(result.saved || records.length);
    } catch {
      remaining[subjectId] = records;
    }
  }

  safeSet(queueKey(), remaining);
  return { ok: Object.keys(remaining).length === 0, saved, remaining: Object.keys(remaining).length };
}

window.addEventListener('online', () => flushQuestionMasteryQueue().catch(() => {}));
