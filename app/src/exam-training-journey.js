import './exam-training-journey.css';
import {
  TRAINING_STAGES,
  buildJourneyStages,
  currentJourneyStage,
  resetMasteryRecords,
  summarizeMastery
} from './exam-training-journey-core.js';

const PANEL_ID = 'trainingJourneyPanel';
const DIALOG_ID = 'trainingJourneyDialog';
const JOURNEY_PREFIX = 'neonTrainingJourneyV1:';
const RESUME_KEY = 'neonTrainingJourneyResumeSubject';
const managementOpen = new Set();
let manifestPromise = null;
let renderTimer = null;
let dialogResolver = null;

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; }
  catch { return fallback; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* The training journey remains available for this page session. */ }
}

function userId() {
  return window.NEON_QUESTION_MASTERY?.userId || 'anonymous';
}

function masteryKey(subject) {
  return `neonQuestionMasteryV2:${userId()}:${subject}`;
}

function journeyKey(subject) {
  return `${JOURNEY_PREFIX}${userId()}:${subject}`;
}

function selectedSubject() {
  return document.querySelector('.exam-subject.selected')?.dataset.subject || '';
}

function readJourney(subject) {
  const stored = safeJson(journeyKey(subject), null);
  const now = new Date().toISOString();
  const state = stored && typeof stored === 'object' ? stored : {};
  return {
    version: 1,
    attempt: Math.max(1, Number(state.attempt || 1)),
    startedAt: state.startedAt || now,
    lastStage: Math.max(1, Math.min(7, Number(state.lastStage || 1))),
    history: Array.isArray(state.history) ? state.history.slice(0, 20) : []
  };
}

function saveJourney(subject, state) {
  safeSet(journeyKey(subject), { ...state, version: 1, history: (state.history || []).slice(0, 20) });
}

function readMastery(subject) {
  return safeJson(masteryKey(subject), []);
}

async function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch('/data/exams/manifest.json', { cache: 'no-cache' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('MANIFEST_UNAVAILABLE')))
      .catch(() => ({ subjects: {} }));
  }
  return manifestPromise;
}

async function waitForMasteryClient(timeoutMs = 4000) {
  const started = Date.now();
  while (!window.NEON_QUESTION_MASTERY?.save && Date.now() - started < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return window.NEON_QUESTION_MASTERY || null;
}

function formatDate(value) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return '—';
  return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(time));
}

function stageHint(stage, stats) {
  if (stage.status === 'done') return 'مكتملة ✓';
  if (stage.status === 'current') return 'أنت هنا';
  if (stage.id <= 5) return `${Math.min(stats.practiced, stage.target).toLocaleString('ar-SA')} / ${stage.target.toLocaleString('ar-SA')}`;
  if (stage.id === 6) return stats.reviewBacklog ? `${stats.reviewBacklog.toLocaleString('ar-SA')} للمراجعة` : 'جاهزة عند ظهور أخطاء';
  return 'اختبار ختامي';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}

function stageProgressPercent(stage, stats) {
  if (stage.status === 'done') return 100;
  if (stage.id <= 5) return Math.max(0, Math.min(100, Math.round((stats.practiced / Math.max(1, stage.target)) * 100)));
  if (stage.id === 6) {
    if (!stats.reviewBacklog) return 100;
    return Math.max(0, Math.min(100, 100 - Math.round((stats.reviewBacklog / Math.max(1, stats.practiced)) * 100)));
  }
  return Math.max(0, Math.min(100, Math.round((stats.mastered / Math.max(1, stage.target)) * 100)));
}

function ensurePanel() {
  let panel = document.getElementById(PANEL_ID);
  if (panel) return panel;
  const mastery = document.getElementById('masteryDashboard');
  const setupFields = document.querySelector('#examSetup .setup-fields');
  if (!mastery || !setupFields) return null;
  panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.className = 'training-journey-panel';
  panel.setAttribute('aria-live', 'polite');
  setupFields.parentNode.insertBefore(panel, setupFields);
  return panel;
}

function ensureDialog() {
  let dialog = document.getElementById(DIALOG_ID);
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = DIALOG_ID;
  dialog.className = 'journey-dialog';
  dialog.innerHTML = `
    <form method="dialog" class="journey-dialog-card">
      <span class="eyebrow">TRAINING JOURNEY</span>
      <h3 id="journeyDialogTitle">تأكيد الإجراء</h3>
      <p id="journeyDialogMessage"></p>
      <div class="journey-dialog-actions">
        <button class="exam-secondary" value="cancel">إلغاء</button>
        <button class="journey-danger" id="journeyDialogConfirm" value="confirm">تأكيد</button>
      </div>
    </form>`;
  dialog.addEventListener('close', () => {
    const resolver = dialogResolver;
    dialogResolver = null;
    resolver?.(dialog.returnValue === 'confirm');
  });
  document.body.appendChild(dialog);
  return dialog;
}

function confirmJourneyAction(title, message, confirmLabel) {
  const dialog = ensureDialog();
  dialog.querySelector('#journeyDialogTitle').textContent = title;
  dialog.querySelector('#journeyDialogMessage').textContent = message;
  dialog.querySelector('#journeyDialogConfirm').textContent = confirmLabel;
  dialog.returnValue = 'cancel';
  dialog.showModal();
  return new Promise(resolve => { dialogResolver = resolve; });
}

function archiveAttempt(state, stats) {
  if (!stats.practiced && !stats.mastered && !stats.reviewBacklog) return state;
  return {
    ...state,
    history: [{
      attempt: state.attempt,
      startedAt: state.startedAt,
      endedAt: new Date().toISOString(),
      practiced: stats.practiced,
      mastered: stats.mastered,
      reviewBacklog: stats.reviewBacklog,
      masteryPercent: stats.masteryPercent
    }, ...(state.history || [])].slice(0, 20)
  };
}

function setControl(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  const option = [...element.options].find(item => item.value === String(value));
  if (option) element.value = String(value);
}

function configureStage(subject, stageId, { start = false } = {}) {
  const stage = TRAINING_STAGES.find(item => item.id === Number(stageId));
  if (!stage) return;
  setControl('examMode', stage.mode);
  setControl('examLevel', stage.level);
  setControl('examCount', stage.count);
  setControl('examMinutes', stage.minutes);

  const state = readJourney(subject);
  state.lastStage = stage.id;
  saveJourney(subject, state);

  const note = document.getElementById('examLoadNote');
  if (note) note.textContent = `تم تجهيز مرحلة «${stage.title}»: ${stage.description}`;
  scheduleRender(0);
  if (start) document.getElementById('startExamButton')?.click();
}

async function resetSubjectProgress(subject, { clearHistory = false } = {}) {
  const manifest = await loadManifest();
  const total = Number(manifest.subjects?.[subject]?.count || 0);
  const records = readMastery(subject);
  const stats = summarizeMastery(records, total);
  let state = readJourney(subject);

  if (clearHistory) {
    state = { version: 1, attempt: 1, startedAt: new Date().toISOString(), lastStage: 1, history: [] };
  } else {
    state = archiveAttempt(state, stats);
    state.attempt += 1;
    state.startedAt = new Date().toISOString();
    state.lastStage = 1;
  }
  saveJourney(subject, state);

  const resetRows = resetMasteryRecords(records);
  const client = await waitForMasteryClient();
  if (client?.save && resetRows.length) {
    for (let index = 0; index < resetRows.length; index += 100) {
      await client.save(subject, resetRows.slice(index, index + 100));
    }
  } else if (resetRows.length) {
    safeSet(masteryKey(subject), resetRows);
  }

  try { sessionStorage.setItem(RESUME_KEY, subject); } catch { /* optional convenience */ }
  window.location.reload();
}

async function renderJourney() {
  const subject = selectedSubject();
  if (!subject) return;
  const panel = ensurePanel();
  if (!panel) return;

  const manifest = await loadManifest();
  if (subject !== selectedSubject()) return;
  const total = Number(manifest.subjects?.[subject]?.count || 0);
  const stats = summarizeMastery(readMastery(subject), total);
  const stages = buildJourneyStages(stats);
  const active = currentJourneyStage(stats);
  const state = readJourney(subject);
  const selected = state.lastStage || active.id;
  const open = managementOpen.has(subject);
  const history = state.history || [];
  const activeProgress = stageProgressPercent(active, stats);

  panel.innerHTML = `
    <div class="journey-head">
      <div>
        <span class="eyebrow">UNIFIED TRAINING JOURNEY</span>
        <h3>مسار التدريب الموحد</h3>
        <p>المحاولة ${state.attempt.toLocaleString('ar-SA')} • نقاط تقدم محفوظة تلقائيًا • يمكنك الرجوع أو بدء محاولة جديدة متى شئت.</p>
      </div>
      <div class="journey-save-state"><span></span><strong>محفوظ</strong><small>على حسابك والمادة</small></div>
    </div>

    <div class="journey-track-shell" aria-label="مراحل التدريب">
      <div class="journey-track">
        ${stages.map(stage => `
          <button class="journey-stage is-${stage.status} ${selected === stage.id ? 'is-selected' : ''}" data-journey-stage="${stage.id}" title="${escapeHtml(stage.description)}">
            <span class="journey-node">${stage.status === 'done' ? '✓' : stage.id.toLocaleString('ar-SA')}</span>
            <strong>${escapeHtml(stage.short)}</strong>
            <small>${escapeHtml(stageHint(stage, stats))}</small>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="journey-current-card">
      <div class="journey-current-copy">
        <small>نقطة المتابعة الحالية</small>
        <strong>المرحلة ${active.id.toLocaleString('ar-SA')} — ${escapeHtml(active.title)}</strong>
        <p>${escapeHtml(active.description)}</p>
      </div>
      <div class="journey-current-progress">
        <strong>${activeProgress}%</strong>
        <span><i style="width:${activeProgress}%"></i></span>
      </div>
      <div class="journey-mini-stats">
        <span><b>${stats.practiced.toLocaleString('ar-SA')}</b><small>تدرّبت عليها</small></span>
        <span><b>${stats.mastered.toLocaleString('ar-SA')}</b><small>متقنة</small></span>
        <span><b>${stats.reviewBacklog.toLocaleString('ar-SA')}</b><small>تحتاج مراجعة</small></span>
      </div>
    </div>

    <div class="journey-actions">
      <button class="exam-primary" data-journey-continue>متابعة من المرحلة ${active.id.toLocaleString('ar-SA')}</button>
      <button class="exam-secondary" data-journey-manage>${open ? 'إخفاء إدارة التقدم' : 'إدارة تقدمي'}</button>
    </div>

    <div class="journey-management" ${open ? '' : 'hidden'}>
      <div class="journey-management-copy">
        <strong>إدارة المحاولة الحالية</strong>
        <p>إعادة المرحلة لا تمسح نتائجك. «محاولة جديدة» تصفّر الأسئلة الحالية لكنها تحفظ ملخص المحاولة السابقة للمقارنة.</p>
      </div>
      <div class="journey-management-actions">
        <button class="exam-secondary" data-journey-retry>إعادة المرحلة الحالية</button>
        <button class="journey-reset" data-journey-new-attempt>بدء محاولة جديدة</button>
        <button class="journey-reset is-danger" data-journey-clear>تصفير المادة والسجل</button>
      </div>
      ${history.length ? `
        <div class="journey-history">
          <strong>سجل المحاولات السابقة</strong>
          <div>${history.slice(0, 4).map(item => `
            <article>
              <span>المحاولة ${Number(item.attempt || 1).toLocaleString('ar-SA')}</span>
              <b>${Number(item.masteryPercent || 0).toLocaleString('ar-SA')}% إتقان</b>
              <small>${Number(item.practiced || 0).toLocaleString('ar-SA')} سؤال • ${formatDate(item.endedAt)}</small>
            </article>
          `).join('')}</div>
        </div>` : '<div class="journey-history-empty">لا توجد محاولة سابقة بعد — تقدمك الحالي محفوظ كنقطة البداية.</div>'}
    </div>
  `;
}

function scheduleRender(delay = 80) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => renderJourney().catch(() => {}), delay);
}

async function resumeSubjectAfterReload() {
  let subject = '';
  try {
    subject = sessionStorage.getItem(RESUME_KEY) || '';
    if (subject) sessionStorage.removeItem(RESUME_KEY);
  } catch { return; }
  if (!subject) return;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const card = [...document.querySelectorAll('[data-subject]')].find(element => element.dataset.subject === subject);
    if (card) {
      card.click();
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

document.addEventListener('click', async event => {
  const subjectCard = event.target.closest('[data-subject]');
  if (subjectCard) {
    scheduleRender(180);
    return;
  }

  const subject = selectedSubject();
  if (!subject) return;

  const stageButton = event.target.closest('[data-journey-stage]');
  if (stageButton) {
    configureStage(subject, Number(stageButton.dataset.journeyStage));
    return;
  }

  if (event.target.closest('[data-journey-continue]')) {
    const manifest = await loadManifest();
    const stats = summarizeMastery(readMastery(subject), Number(manifest.subjects?.[subject]?.count || 0));
    configureStage(subject, currentJourneyStage(stats).id, { start: true });
    return;
  }

  if (event.target.closest('[data-journey-manage]')) {
    if (managementOpen.has(subject)) managementOpen.delete(subject);
    else managementOpen.add(subject);
    scheduleRender(0);
    return;
  }

  if (event.target.closest('[data-journey-retry]')) {
    const manifest = await loadManifest();
    const stats = summarizeMastery(readMastery(subject), Number(manifest.subjects?.[subject]?.count || 0));
    configureStage(subject, currentJourneyStage(stats).id, { start: true });
    return;
  }

  if (event.target.closest('[data-journey-new-attempt]')) {
    const confirmed = await confirmJourneyAction(
      'بدء محاولة جديدة؟',
      'سيتم حفظ ملخص محاولتك الحالية في السجل، ثم تصفير حالة الأسئلة التي تدربت عليها لتبدأ من المرحلة الأولى. لن يتم حذف بنك الأسئلة.',
      'ابدأ محاولة جديدة'
    );
    if (confirmed) await resetSubjectProgress(subject, { clearHistory: false });
    return;
  }

  if (event.target.closest('[data-journey-clear]')) {
    const confirmed = await confirmJourneyAction(
      'تصفير المادة والسجل بالكامل؟',
      'سيتم تصفير تقدم هذه المادة وحذف سجل محاولاتها المحفوظ في هذا الحساب. هذا الإجراء لا يحذف الأسئلة من المنصة.',
      'تصفير المادة'
    );
    if (confirmed) await resetSubjectProgress(subject, { clearHistory: true });
  }
});

const masteryDashboard = document.getElementById('masteryDashboard');
if (masteryDashboard) {
  new MutationObserver(() => scheduleRender(60)).observe(masteryDashboard, { childList: true, subtree: true });
}

window.addEventListener('neon-question-mastery-loaded', () => scheduleRender(30));
window.addEventListener('neon-question-mastery-saved', () => scheduleRender(30));
resumeSubjectAfterReload().catch(() => {});
