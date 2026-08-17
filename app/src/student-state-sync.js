const NOTEBOOK_KEY = 'neonErrorNotebookV1';
const PLAN_PREFIX = 'neonDailyPlanV1:';
const QUEUE_PREFIX = 'neonStudentStateQueueV1:';

let activeSession = null;
let internalWrite = false;
let flushPromise = null;
let hydrationPromise = null;

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; }
  catch { return fallback; }
}

function safeSet(key, value) {
  internalWrite = true;
  try { localStorage.setItem(key, JSON.stringify(value)); }
  finally { internalWrite = false; }
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
}

function planKey(date = todayKey()) {
  return `${PLAN_PREFIX}${activeSession?.user?.uid || 'anonymous'}:${date}`;
}

function queueKey() {
  return `${QUEUE_PREFIX}${activeSession?.user?.uid || 'anonymous'}`;
}

async function request(path, options = {}) {
  if (!activeSession?.user?.getIdToken) throw new Error('AUTH_SESSION_UNAVAILABLE');
  const token = await activeSession.user.getIdToken();
  const response = await fetch(path, {
    ...options,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `HTTP_${response.status}`);
    error.code = data.error || `HTTP_${response.status}`;
    throw error;
  }
  return data;
}

function notebookMap(rows) {
  return new Map((Array.isArray(rows) ? rows : []).filter(item => item?.id).map(item => [String(item.id), item]));
}

function itemTime(item) {
  const value = new Date(item?.lastWrongAt || item?.updatedAt || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function sameJson(left, right) {
  try { return JSON.stringify(left) === JSON.stringify(right); }
  catch { return false; }
}

function enqueue(operation) {
  if (!activeSession?.user?.uid || !operation) return;
  const key = queueKey();
  const queue = safeJson(key, []);
  if (operation.type === 'plan') {
    const filtered = queue.filter(item => !(item?.type === 'plan' && item?.date === operation.date));
    filtered.push(operation);
    safeSet(key, filtered.slice(-120));
  } else {
    queue.push(operation);
    safeSet(key, queue.slice(-120));
  }
  flushQueue().catch(() => {});
}

async function sendOperation(operation) {
  if (operation.type === 'notebook') {
    return request('/api/student-state/notebook/sync', {
      method: 'POST',
      body: JSON.stringify({ items: operation.items || [], removeIds: operation.removeIds || [] })
    });
  }
  if (operation.type === 'plan') {
    return request('/api/student-state/daily-plan', {
      method: 'PUT',
      body: JSON.stringify({ date: operation.date, state: operation.state || {} })
    });
  }
  return null;
}

async function flushQueue() {
  if (!activeSession?.user?.uid || flushPromise) return flushPromise;
  flushPromise = (async () => {
    const key = queueKey();
    const queue = safeJson(key, []);
    if (!queue.length) return;
    const remaining = [];
    for (let index = 0; index < queue.length; index += 1) {
      const operation = queue[index];
      try {
        await sendOperation(operation);
      } catch (error) {
        remaining.push(...queue.slice(index));
        break;
      }
    }
    safeSet(key, remaining);
    if (!remaining.length) window.dispatchEvent(new CustomEvent('neon-student-state-online'));
  })().finally(() => { flushPromise = null; });
  return flushPromise;
}

async function sendNotebookChunks(items, removeIds = []) {
  const rows = Array.isArray(items) ? items : [];
  const removals = Array.isArray(removeIds) ? removeIds : [];
  const chunks = [];
  for (let index = 0; index < rows.length; index += 30) {
    chunks.push({ type: 'notebook', items: rows.slice(index, index + 30), removeIds: [] });
  }
  for (let index = 0; index < removals.length; index += 80) {
    chunks.push({ type: 'notebook', items: [], removeIds: removals.slice(index, index + 80) });
  }
  for (const operation of chunks) {
    try { await sendOperation(operation); }
    catch { enqueue(operation); }
  }
}

function refreshVisibleState() {
  const notebook = safeJson(NOTEBOOK_KEY, []);
  const count = Number(notebook.length || 0).toLocaleString('ar-SA');
  const examCount = document.getElementById('examNotebookCount');
  if (examCount) examCount.textContent = count;
  document.querySelectorAll('.notebook-count').forEach(element => { element.textContent = count; });

  const state = safeJson(planKey(), {});
  document.querySelectorAll('[data-plan-task]').forEach(task => {
    const done = Boolean(state[task.dataset.planTask]);
    task.classList.toggle('is-complete', done);
    const check = task.querySelector('.plan-check');
    if (check) check.textContent = done ? '✓' : '';
  });
}

async function hydrateNotebook() {
  const remote = await request('/api/student-state/notebook');
  const localRows = safeJson(NOTEBOOK_KEY, []);
  const remoteRows = Array.isArray(remote.items) ? remote.items : [];
  const resolved = new Set((remote.resolvedIds || []).map(String));
  const merged = notebookMap(remoteRows);
  const upload = [];

  for (const local of localRows) {
    const id = String(local?.id || '');
    if (!id || resolved.has(id)) continue;
    const current = merged.get(id);
    if (!current || itemTime(local) > itemTime(current) || Number(local.wrongCount || 0) > Number(current.wrongCount || 0)) {
      merged.set(id, local);
      upload.push(local);
    }
  }

  const rows = [...merged.values()].filter(item => !resolved.has(String(item.id))).slice(-300);
  if (!sameJson(rows, localRows)) safeSet(NOTEBOOK_KEY, rows);
  if (upload.length) await sendNotebookChunks(upload);
  window.dispatchEvent(new CustomEvent('neon-error-notebook-updated', { detail: { source: 'account-sync' } }));
}

async function hydrateDailyPlan() {
  const date = todayKey();
  const local = safeJson(planKey(date), {});
  const remote = await request(`/api/student-state/daily-plan?date=${encodeURIComponent(date)}`);
  const remoteState = remote?.state && typeof remote.state === 'object' ? remote.state : {};
  const merged = {};
  for (const key of new Set([...Object.keys(remoteState), ...Object.keys(local)])) {
    merged[key] = Boolean(remoteState[key] || local[key]);
  }
  if (!sameJson(local, merged)) safeSet(planKey(date), merged);
  if (!sameJson(remoteState, merged)) {
    try {
      await sendOperation({ type: 'plan', date, state: merged });
    } catch {
      enqueue({ type: 'plan', date, state: merged });
    }
  }
}

async function hydrate() {
  if (!activeSession?.user?.uid || hydrationPromise) return hydrationPromise;
  hydrationPromise = Promise.allSettled([hydrateNotebook(), hydrateDailyPlan(), flushQueue()])
    .then(results => {
      refreshVisibleState();
      window.dispatchEvent(new CustomEvent('neon-student-state-synced', { detail: { results } }));
      return results;
    })
    .finally(() => { hydrationPromise = null; });
  return hydrationPromise;
}

function notebookDiff(beforeRows, afterRows) {
  const before = notebookMap(beforeRows);
  const after = notebookMap(afterRows);
  const items = [];
  const removeIds = [];
  for (const [id, item] of after) {
    if (!before.has(id) || !sameJson(before.get(id), item)) items.push(item);
  }
  for (const id of before.keys()) {
    if (!after.has(id)) removeIds.push(id);
  }
  return { items, removeIds };
}

function installStorageBridge() {
  if (window.__NEON_STUDENT_STATE_STORAGE_BRIDGE__) return;
  window.__NEON_STUDENT_STATE_STORAGE_BRIDGE__ = true;
  const previousSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function studentStateSetItem(key, value) {
    const stringKey = String(key);
    const trackedNotebook = this === localStorage && stringKey === NOTEBOOK_KEY;
    const trackedPlan = this === localStorage && stringKey.startsWith(PLAN_PREFIX);
    const before = trackedNotebook || trackedPlan ? this.getItem(stringKey) : null;
    previousSetItem.call(this, key, value);
    if (internalWrite || !activeSession?.user?.uid || this !== localStorage) return;

    if (trackedNotebook && before !== String(value)) {
      let previous = [];
      let next = [];
      try { previous = JSON.parse(before || '[]') || []; } catch {}
      try { next = JSON.parse(String(value) || '[]') || []; } catch {}
      const diff = notebookDiff(previous, next);
      if (diff.items.length || diff.removeIds.length) enqueue({ type: 'notebook', ...diff });
      refreshVisibleState();
    }

    if (trackedPlan && before !== String(value)) {
      const date = stringKey.match(/(\d{4}-\d{2}-\d{2})$/)?.[1];
      if (!date) return;
      let state = {};
      try { state = JSON.parse(String(value) || '{}') || {}; } catch {}
      enqueue({ type: 'plan', date, state });
      refreshVisibleState();
    }
  };
}

function configure(session) {
  activeSession = session || null;
  if (!activeSession?.user?.uid) return;
  window.NEON_STUDENT_STATE = {
    hydrate: () => hydrate(),
    flush: () => flushQueue(),
    notebook: () => safeJson(NOTEBOOK_KEY, []),
    dailyPlan: () => safeJson(planKey(), {})
  };
  hydrate().catch(error => console.warn('Student state sync unavailable:', error?.code || error?.message));
}

installStorageBridge();
window.addEventListener('neon-auth-session', event => configure(event.detail));
window.addEventListener('online', () => {
  hydrate().catch(() => {});
  flushQueue().catch(() => {});
});
window.addEventListener('neon-error-notebook-updated', refreshVisibleState);
window.addEventListener('neon-student-state-synced', refreshVisibleState);

if (window.NEON_AUTH_SESSION) configure(window.NEON_AUTH_SESSION);
