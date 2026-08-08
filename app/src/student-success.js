import './student-success.css';

const GOAL_PREFIX = 'neonStudentGoalV1:';
const PLAN_PREFIX = 'neonDailyPlanV1:';
const NOTEBOOK_KEY = 'neonErrorNotebookV1';
let activeSession;
let currentDashboard;

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; }
  catch { return fallback; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}

function arNumber(value) {
  return Number(value || 0).toLocaleString('ar-SA');
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
}

async function request(path, options = {}) {
  if (!activeSession?.user?.getIdToken) throw new Error('AUTH_SESSION_UNAVAILABLE');
  const token = await activeSession.user.getIdToken();
  const response = await fetch(path, {
    ...options,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || `HTTP_${response.status}`), { code: data.error });
  return data;
}

function trackEvent(eventName, properties = {}) {
  request('/api/success/event', { method: 'POST', body: JSON.stringify({ eventName, properties }) }).catch(() => {});
}

function goalKey() {
  return `${GOAL_PREFIX}${activeSession?.user?.uid || 'anonymous'}`;
}

function localProfile() {
  return safeJson(goalKey(), {
    examTrack: 'tahsili', examDate: '', targetScore: 80, dailyMinutes: 30, onboardingComplete: false
  });
}

function localDashboard() {
  const profile = localProfile();
  const history = safeJson('neonOptimizedExamHistoryV1', []).slice(-80);
  const since = Date.now() - 7 * 86_400_000;
  const weekRows = history.filter(item => new Date(item.date || 0).getTime() >= since);
  const sessions = weekRows.length;
  const questions = weekRows.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const correct = weekRows.reduce((sum, item) => sum + Number(item.correct || 0), 0);
  const minutes = Math.round(weekRows.reduce((sum, item) => sum + Number(item.durationSeconds || 0), 0) / 60);
  const average = sessions ? Math.round(weekRows.reduce((sum, item) => sum + Number(item.score || 0), 0) / sessions) : 0;
  const latest = Number(weekRows.at(-1)?.score || 0);
  const readiness = sessions ? Math.round(average * .7 + latest * .3) : 0;
  const examDate = profile.examDate ? new Date(`${profile.examDate}T12:00:00`) : null;
  const daysRemaining = examDate ? Math.max(0, Math.ceil((examDate - new Date()) / 86_400_000)) : null;
  const targetTitle = { tahsili:'التحصيلي العلمي', qudurat:'اختبار القدرات', step:'اختبار STEP', mixed:'خطة متعددة المسارات' }[profile.examTrack] || 'التحصيلي العلمي';
  const href = profile.examTrack === 'step' ? '/step' : '/exams';
  const plan = sessions ? [
    { id:'review-errors', title:'مراجعة دفتر الأخطاء', description:'ابدأ بالأخطاء المستحقة قبل الأسئلة الجديدة.', minutes:Math.max(5,Math.round(profile.dailyMinutes*.25)), href:'/exams#notebook' },
    { id:'focused-practice', title:`تدريب مركز في ${targetTitle}`, description:'تدريب ذكي يركز على نقاط الضعف.', minutes:Math.max(10,Math.round(profile.dailyMinutes*.5)), href },
    { id:'mini-simulation', title:'محاكاة قصيرة', description:'قياس سريع للثبات والسرعة.', minutes:Math.max(5,Math.round(profile.dailyMinutes*.25)), href }
  ] : [
    { id:'diagnostic', title:`اختبار تشخيصي في ${targetTitle}`, description:'ابدأ بقياس المستوى لبناء خطة فعلية.', minutes:Math.min(25,profile.dailyMinutes), href }
  ];
  return {
    profile,
    target:{ title:targetTitle, daysRemaining, score:profile.targetScore },
    readiness:{ value:readiness, label:readiness >= 70 ? 'جاهزية جيدة' : readiness ? 'تحتاج خطة مركزة' : 'ابدأ بالتشخيص', mastery:readiness },
    week:{ sessions, questions, correct, minutes, average, previousAverage:0, trend:0 },
    weakSubjects:[],
    plan
  };
}

function ensureShell() {
  if (document.getElementById('studentSuccessHub')) return;
  const section = document.createElement('section');
  section.id = 'studentSuccessHub';
  section.className = 'success-hub section-shell';
  section.innerHTML = '<div class="success-skeleton">جارٍ بناء خطتك الشخصية وقراءة مستوى الجاهزية…</div>';
  const anchor = document.querySelector('.progress-overview') || document.querySelector('.centers-section');
  anchor?.parentElement?.insertBefore(section, anchor);

  document.body.insertAdjacentHTML('beforeend', `
    <div class="success-modal" id="goalModal" role="dialog" aria-modal="true" aria-labelledby="goalModalTitle">
      <div class="success-modal-card">
        <div class="success-modal-head"><div><h2 id="goalModalTitle">حدد هدفك الدراسي</h2><p>هذه البيانات تستخدم لبناء خطة يومية ومؤشر جاهزية يناسب موعد اختبارك.</p></div><button class="success-close" data-close-success-modal="goalModal" aria-label="إغلاق">×</button></div>
        <form class="goal-form" id="goalForm">
          <label>المسار المستهدف<select name="examTrack" required><option value="tahsili">التحصيلي العلمي</option><option value="qudurat">اختبار القدرات</option><option value="step">اختبار STEP</option><option value="mixed">أكثر من مسار</option></select></label>
          <label>موعد الاختبار<input name="examDate" type="date" required></label>
          <label>الدرجة المستهدفة<input name="targetScore" type="number" min="50" max="100" value="80" required></label>
          <label>وقت الدراسة اليومي<input name="dailyMinutes" type="number" min="10" max="180" step="5" value="30" required></label>
          <div class="goal-form-actions"><button type="button" class="success-soft-button" data-close-success-modal="goalModal">لاحقًا</button><button class="success-primary-button" type="submit">بناء خطتي</button></div>
        </form>
      </div>
    </div>
    <div class="success-modal" id="notebookModal" role="dialog" aria-modal="true" aria-labelledby="notebookModalTitle">
      <div class="success-modal-card">
        <div class="success-modal-head"><div><h2 id="notebookModalTitle">دفتر الأخطاء</h2><p>الأسئلة التي أخطأت فيها مع الإجابة الصحيحة والشرح وموعد المراجعة.</p></div><button class="success-close" data-close-success-modal="notebookModal" aria-label="إغلاق">×</button></div>
        <div class="notebook-list" id="notebookList"></div>
      </div>
    </div>
  `);
}

function openModal(id) {
  document.getElementById(id)?.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('is-open');
  if (!document.querySelector('.success-modal.is-open')) document.body.style.overflow = '';
}

function fillGoalForm(profile) {
  const form = document.getElementById('goalForm');
  if (!form) return;
  form.elements.examTrack.value = profile.examTrack || 'tahsili';
  form.elements.examDate.value = profile.examDate || '';
  form.elements.targetScore.value = profile.targetScore || 80;
  form.elements.dailyMinutes.value = profile.dailyMinutes || 30;
  form.elements.examDate.min = todayKey();
}

function planStateKey() {
  return `${PLAN_PREFIX}${activeSession?.user?.uid || 'anonymous'}:${todayKey()}`;
}

function renderDashboard(data) {
  currentDashboard = data;
  const section = document.getElementById('studentSuccessHub');
  const profile = data.profile || localProfile();
  const week = data.week || {};
  const readiness = data.readiness || {};
  const notebook = safeJson(NOTEBOOK_KEY, []);
  const planState = safeJson(planStateKey(), {});
  const totalMinutes = (data.plan || []).reduce((sum, task) => sum + Number(task.minutes || 0), 0);
  const days = data.target?.daysRemaining;
  const trend = Number(week.trend || 0);
  const weak = (data.weakSubjects || []).map(item => `<span>${escapeHtml(item.title)} • ${arNumber(item.average)}%</span>`).join('');

  section.innerHTML = `
    <div class="success-head">
      <div><span class="eyebrow">PERSONALIZED SUCCESS PATH</span><h2>خطتك الشخصية حتى الاختبار</h2><p>تجمع هدفك ونتائجك ودفتر أخطائك لتحدد ما ينبغي إنجازه اليوم بدل التصفح العشوائي.</p></div>
      <button class="success-goal-button" id="editStudentGoal">تعديل الهدف</button>
    </div>
    <div class="success-grid">
      <article class="success-card readiness-card">
        <div class="readiness-ring" style="--readiness-angle:${Number(readiness.value || 0) * 3.6}deg"><span><strong>${arNumber(readiness.value)}%</strong><small>الجاهزية</small></span></div>
        <div class="readiness-label">${escapeHtml(readiness.label || 'ابدأ بالتشخيص')}</div>
        <div class="goal-summary"><span>${escapeHtml(data.target?.title || 'المسار')}</span><span>الهدف ${arNumber(data.target?.score)}%</span><span>${days === null || days === undefined ? 'حدد موعد الاختبار' : `متبقي ${arNumber(days)} يوم`}</span></div>
      </article>
      <article class="success-card daily-plan-card">
        <div class="plan-header"><div><h3>خطة اليوم</h3><p>جلسة قصيرة ومتوازنة حسب مستواك ووقتك.</p></div><span class="plan-total">${arNumber(totalMinutes)} دقيقة</span></div>
        <div class="daily-plan-list">${(data.plan || []).map(task => `
          <a class="plan-task ${planState[task.id] ? 'is-complete' : ''}" href="${escapeHtml(task.href)}" data-plan-task="${escapeHtml(task.id)}">
            <span class="plan-check">${planState[task.id] ? '✓' : ''}</span><span class="plan-copy"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.description)}</small></span><span class="plan-minutes">${arNumber(task.minutes)} د</span>
          </a>`).join('')}</div>
      </article>
      <div class="success-lower-grid">
        <article class="success-card">
          <h3>تقرير هذا الأسبوع</h3><p>ملخص قابل للقياس يوضح هل تتقدم نحو هدفك.</p>
          <div class="week-stats"><article><strong>${arNumber(week.sessions)}</strong><small>جلسة تدريب</small></article><article><strong>${arNumber(week.questions)}</strong><small>سؤالًا</small></article><article><strong>${arNumber(week.average)}%</strong><small>متوسط النتيجة</small></article><article><strong>${arNumber(week.minutes)}</strong><small>دقيقة دراسة</small></article></div>
          <div class="week-trend">${trend > 0 ? `تحسن متوسطك ${arNumber(trend)} درجات عن الأسبوع السابق.` : trend < 0 ? `انخفض المتوسط ${arNumber(Math.abs(trend))} درجات؛ ركز على المراجعة.` : week.sessions ? 'حافظ على الاستمرارية لظهور اتجاه التحسن.' : 'أكمل أول تشخيص ليبدأ التقرير الأسبوعي.'}</div>
          ${weak ? `<div class="weak-list">${weak}</div>` : ''}
        </article>
        <article class="success-card notebook-card"><div><h3>دفتر الأخطاء</h3><p>مراجعة شخصية لكل سؤال أخطأت فيه مع الشرح.</p><div class="notebook-count">${arNumber(notebook.length)}</div><small>سؤال محفوظ للمراجعة</small></div><div class="notebook-actions"><button class="success-primary-button" id="openErrorNotebook">فتح الدفتر</button><a class="success-soft-button" href="/exams">بدء تدريب</a></div></article>
      </div>
    </div>`;

  fillGoalForm(profile);
  if (!profile.onboardingComplete) {
    setTimeout(() => openModal('goalModal'), 350);
    trackEvent('onboarding_viewed');
  }
}

function renderNotebook() {
  const list = document.getElementById('notebookList');
  const rows = safeJson(NOTEBOOK_KEY, []).sort((a, b) => new Date(b.lastWrongAt || 0) - new Date(a.lastWrongAt || 0));
  if (!rows.length) {
    list.innerHTML = '<div class="notebook-empty">لا توجد أخطاء محفوظة بعد. أخطاؤك القادمة ستظهر هنا تلقائيًا مع الشرح.</div>';
    return;
  }
  list.innerHTML = rows.map(item => `
    <article class="notebook-entry" data-notebook-id="${escapeHtml(item.id)}"><header><strong>${escapeHtml(item.question)}</strong><button data-remove-notebook="${escapeHtml(item.id)}">تمت المراجعة</button></header><p>الإجابة الصحيحة: <b>${escapeHtml(item.correctText || '')}</b></p><p>${escapeHtml(item.explain || 'راجع المهارة المرتبطة بالسؤال.')}</p><small>${escapeHtml(item.subjectTitle || item.subject || '')} • أخطأت ${arNumber(item.wrongCount || 1)} مرة</small></article>
  `).join('');
}

async function loadDashboard() {
  try {
    const data = await request('/api/success/dashboard');
    safeSet(goalKey(), data.profile);
    renderDashboard(data);
  } catch (error) {
    console.warn('Success dashboard fallback:', error.code || error.message);
    renderDashboard(localDashboard());
  }
}

async function saveGoal(form) {
  const body = Object.fromEntries(new FormData(form));
  body.targetScore = Number(body.targetScore);
  body.dailyMinutes = Number(body.dailyMinutes);
  let profile;
  try {
    const result = await request('/api/success/profile', { method:'PUT', body:JSON.stringify(body) });
    profile = result.profile;
  } catch {
    profile = { ...body, onboardingComplete:Boolean(body.examDate) };
  }
  safeSet(goalKey(), profile);
  closeModal('goalModal');
  trackEvent('onboarding_completed', { examTrack:profile.examTrack, dailyMinutes:profile.dailyMinutes });
  await loadDashboard();
}

function installEvents() {
  document.addEventListener('click', event => {
    const close = event.target.closest('[data-close-success-modal]');
    if (close) closeModal(close.dataset.closeSuccessModal);
    if (event.target.id === 'editStudentGoal') openModal('goalModal');
    if (event.target.id === 'openErrorNotebook') {
      renderNotebook();
      openModal('notebookModal');
      trackEvent('error_notebook_opened', { count:safeJson(NOTEBOOK_KEY, []).length });
    }
    const remove = event.target.closest('[data-remove-notebook]');
    if (remove) {
      const rows = safeJson(NOTEBOOK_KEY, []).filter(item => String(item.id) !== String(remove.dataset.removeNotebook));
      safeSet(NOTEBOOK_KEY, rows);
      renderNotebook();
      loadDashboard();
    }
    const task = event.target.closest('[data-plan-task]');
    if (task) {
      const state = safeJson(planStateKey(), {});
      state[task.dataset.planTask] = true;
      safeSet(planStateKey(), state);
      trackEvent('daily_plan_task_started', { taskId:task.dataset.planTask, href:task.getAttribute('href') });
    }
    if (event.target.classList.contains('success-modal')) closeModal(event.target.id);
  });
  document.getElementById('goalForm')?.addEventListener('submit', event => {
    event.preventDefault();
    saveGoal(event.currentTarget).catch(console.error);
  });
  window.addEventListener('neon-error-notebook-updated', () => currentDashboard && renderDashboard(currentDashboard));
}

export async function mountStudentSuccess(session) {
  activeSession = session;
  ensureShell();
  installEvents();
  await loadDashboard();
}
