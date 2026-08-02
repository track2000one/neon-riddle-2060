import './styles.css';
import './home-shell.css';
import { ensureAuth, renderAccount } from './auth.js';
import { loadProgressSummary, migrateLegacyProgress } from './progress-client.js';

const LAST_CENTER_KEY = 'neonAcademyLastCenterV1';

const centers = [
  {
    id: 'step',
    href: '/step',
    title: 'اللغة الإنجليزية STEP',
    subtitle: 'STEP English',
    description: 'شرح متدرج، تدريب، استماع، قراءة ومحاكاة كاملة.',
    icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 14h38a7 7 0 0 1 7 7v20a7 7 0 0 1-7 7H31L18 57v-9h-5a7 7 0 0 1-7-7V21a7 7 0 0 1 7-7Z"/><circle cx="23" cy="31" r="2.7"/><circle cx="32" cy="31" r="2.7"/><circle cx="41" cy="31" r="2.7"/></svg>'
  },
  {
    id: 'exams',
    href: '/exams',
    title: 'مركز التحصيلي والقدرات',
    subtitle: 'Tahsili & Qudurat',
    description: 'بنوك أسئلة ومحاكاة زمنية وتحليل مفصل للأداء.',
    icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 51h44M16 45V32h9v13M28 45V23h9v22M40 45V14h9v31M15 22l12-9 10 5 14-10"/><path d="m45 8 6 0 0 6"/></svg>'
  },
  {
    id: 'coding',
    href: '/legacy/coding.html',
    title: 'تعليم البرمجة',
    subtitle: 'Coding',
    description: 'دروس عملية ومختبر تفاعلي لأهم تقنيات البرمجة.',
    icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m24 16-16 16 16 16M40 16l16 16-16 16M37 10 27 54"/></svg>'
  },
  {
    id: 'games',
    href: '/games',
    title: 'الألعاب والألغاز',
    subtitle: 'Games & Puzzles',
    description: 'ألغاز وتحديات ومسابقات وغرف هروب تعليمية.',
    icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 21h24c8 0 13 7 14 17l1 9c1 7-7 10-11 5l-7-8H23l-7 8c-4 5-12 2-11-5l1-9c1-10 6-17 14-17Z"/><path d="M18 31v10M13 36h10M43 32h.1M50 39h.1"/></svg>'
  },
  {
    id: 'learning',
    href: '/learning',
    title: 'المعرفة والدروس',
    subtitle: 'Learning Library',
    description: 'مكتبة تعليمية متعددة التخصصات من التأسيس إلى الإتقان.',
    icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 13h18c5 0 8 3 8 8v32c0-5-3-8-8-8H8V13Zm48 0H38c-5 0-8 3-8 8v32c0-5 3-8 8-8h18V13Z"/><path d="M15 22h12M15 29h12M49 22H37M49 29H37"/></svg>'
  }
];

const progressCenters = [
  { id: 'learning', title: 'المعرفة والدروس', icon: '📚', href: '/learning', total: 240, unit: 'درس' },
  { id: 'step', title: 'اللغة الإنجليزية STEP', icon: '💬', href: '/step', total: 20, unit: 'درس وتدريب' },
  { id: 'exams', title: 'التحصيلي والقدرات', icon: '📊', href: '/exams', unit: 'محاولة' },
  { id: 'games', title: 'الألعاب والألغاز', icon: '🎮', href: '/games', total: 72, unit: 'نشاط' },
  { id: 'coding', title: 'تعليم البرمجة', icon: '💻', href: '/legacy/coding.html', unit: 'درس' }
];

function number(value) {
  return Number(value || 0).toLocaleString('ar-SA');
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value ?? '');
}

function renderCards() {
  const grid = document.getElementById('centerGrid');
  setText('heroCenterCount', number(centers.length));
  if (!grid) return;

  grid.innerHTML = centers.map(center => `
    <a class="center-card" data-center="${center.id}" href="${center.href}" aria-label="فتح ${center.title}">
      <div class="center-brand">NEON<small>LEARN • PLAY • BUILD</small></div>
      <div class="center-icon">${center.icon}</div>
      <h2>${center.title}</h2>
      <div class="center-subtitle">${center.subtitle}</div>
      <p>${center.description}</p>
      <div class="center-footer">NEON</div>
    </a>
  `).join('');

  grid.querySelectorAll('.center-card').forEach(card => {
    card.addEventListener('click', () => localStorage.setItem(LAST_CENTER_KEY, card.getAttribute('href')));
  });
}

function prefetchOnIntent() {
  const prefetched = new Set();
  const prefetch = href => {
    if (!href || prefetched.has(href)) return;
    prefetched.add(href);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  };

  document.querySelectorAll('.center-card').forEach(card => {
    const href = card.getAttribute('href');
    card.addEventListener('pointerenter', () => prefetch(href), { once: true });
    card.addEventListener('touchstart', () => prefetch(href), { once: true, passive: true });
  });
}

function renderStudentMetrics(profile = {}) {
  const academy = profile.academy || {};
  const stats = academy.stats || profile.stats || {};
  const levels = academy.levels || profile.levels || {};
  const levelValues = Array.isArray(levels) ? levels : Object.values(levels);
  const completed = levelValues.filter(value => value === true || value === 'completed' || value?.completed === true || Number(value?.progress) >= 100).length;
  const certificates = academy.certificates || profile.certificates || [];
  const answered = Number(stats.answered || stats.totalAnswered || 0);
  const correct = Number(stats.correct || stats.correctAnswers || 0);
  const mastery = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const score = Number(academy.score ?? profile.score ?? academy.xp ?? profile.xp ?? 0);
  const streak = Number(academy.streak ?? profile.streak ?? 0);

  setText('metricXp', number(score));
  setText('metricCompleted', number(completed));
  setText('metricStreak', `${number(streak)} يوم`);
  setText('metricCertificates', number(Array.isArray(certificates) ? certificates.length : certificates));
  setText('metricMastery', `${number(mastery)}%`);
}

function centerPercentage(definition, progress) {
  if (definition.total) return Math.min(100, Math.round((Number(progress.completed || 0) / definition.total) * 100));
  if (Number(progress.mastery || 0) > 0) return Number(progress.mastery || 0);
  return Number(progress.completed || 0) > 0 ? 100 : Number(progress.inProgress || 0) > 0 ? 25 : 0;
}

function renderProgressSummary(summary) {
  const metrics = summary?.metrics || {};
  setText('metricXp', number(metrics.xp));
  setText('metricCompleted', number(metrics.completedItems));
  setText('metricStreak', `${number(metrics.streak)} يوم`);
  setText('metricCertificates', number(metrics.certificates));
  setText('metricMastery', `${number(metrics.mastery)}%`);

  const sync = document.getElementById('progressSyncState');
  if (sync) {
    sync.textContent = 'متزامن مع حسابك';
    sync.className = 'progress-sync-state online';
  }

  const grid = document.getElementById('progressCenterGrid');
  if (grid) {
    const byId = new Map((summary?.centers || []).map(item => [item.centerId, item]));
    grid.innerHTML = progressCenters.map(definition => {
      const progress = byId.get(definition.id) || { completed: 0, inProgress: 0, mastery: 0, attempts: 0 };
      const percent = centerPercentage(definition, progress);
      const completedText = definition.total
        ? `${number(progress.completed)} من ${number(definition.total)} ${definition.unit}`
        : `${number(progress.completed)} مكتمل • ${number(progress.attempts)} ${definition.unit}`;
      const secondary = progress.inProgress > 0
        ? `${number(progress.inProgress)} قيد التقدم`
        : progress.mastery > 0 ? `إتقان ${number(progress.mastery)}%` : 'لم يبدأ بعد';
      return `
        <a class="progress-center-card ${percent === 0 ? 'empty' : ''}" href="${definition.href}" data-progress-center="${definition.id}">
          <header><strong>${definition.title}</strong><span>${definition.icon}</span></header>
          <div class="progress-bar" aria-label="تقدم ${definition.title}: ${percent}%"><i style="width:${percent}%"></i></div>
          <div class="progress-center-meta"><span>${completedText}</span><span>${secondary}</span></div>
        </a>
      `;
    }).join('');
  }

  const button = document.getElementById('continueButton');
  if (button && summary?.continue?.href) {
    button.href = summary.continue.href;
    button.title = summary.continue.title ? `متابعة: ${summary.continue.title}` : 'متابعة آخر نشاط';
  }
}

function showProgressOffline() {
  const sync = document.getElementById('progressSyncState');
  if (sync) {
    sync.textContent = 'حفظ محلي مؤقت';
    sync.className = 'progress-sync-state offline';
  }
  const grid = document.getElementById('progressCenterGrid');
  if (grid && !grid.querySelector('.progress-center-card')) {
    grid.innerHTML = '<div class="progress-empty">سيتم مزامنة تقدمك تلقائيًا عند عودة الاتصال.</div>';
  }
}

async function loadQuestionCount() {
  const target = document.getElementById('heroQuestionCount');
  if (!target) return;
  try {
    const response = await fetch('/data/exams/manifest.json', { cache: 'force-cache' });
    if (!response.ok) return;
    const manifest = await response.json();
    target.textContent = number(manifest.totalQuestions);
  } catch {
    target.textContent = '١٬٥٤٨';
  }
}

function prepareContinueButton() {
  const button = document.getElementById('continueButton');
  if (!button) return;
  const saved = localStorage.getItem(LAST_CENTER_KEY);
  const valid = centers.some(center => center.href === saved);
  button.href = valid ? saved : '/step';
}

async function synchronizeProgress() {
  try {
    const cached = await loadProgressSummary();
    renderProgressSummary(cached);
    await migrateLegacyProgress();
    const fresh = await loadProgressSummary({ force: true });
    renderProgressSummary(fresh);
  } catch (error) {
    console.warn('Progress synchronization is temporarily unavailable:', error?.code || error?.message);
    showProgressOffline();
  }
}

async function boot() {
  try {
    renderCards();
    prepareContinueButton();
    prefetchOnIntent();
    loadQuestionCount().catch(error => console.warn('Question count unavailable:', error?.message));

    const session = await ensureAuth();
    renderAccount(session);
    renderStudentMetrics(session.profile);
    await synchronizeProgress();
  } catch (error) {
    if (error?.message !== 'Authentication required') console.error('NEON home boot error:', error);
  } finally {
    document.getElementById('bootOverlay')?.classList.add('hidden');
  }
}

window.addEventListener('neon-progress-summary', event => renderProgressSummary(event.detail));
window.addEventListener('neon-progress-offline', showProgressOffline);

boot();
