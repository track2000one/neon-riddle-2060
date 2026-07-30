import './styles.css';
import './home-shell.css';
import { ensureAuth, renderAccount } from './auth.js';

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
    href: '/legacy/games.html',
    title: 'الألعاب والألغاز',
    subtitle: 'Games & Puzzles',
    description: 'ألغاز وتحديات ومسابقات وغرف هروب تعليمية.',
    icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 21h24c8 0 13 7 14 17l1 9c1 7-7 10-11 5l-7-8H23l-7 8c-4 5-12 2-11-5l1-9c1-10 6-17 14-17Z"/><path d="M18 31v10M13 36h10M43 32h.1M50 39h.1"/></svg>'
  },
  {
    id: 'learning',
    href: '/legacy/learning.html',
    title: 'المعرفة والدروس',
    subtitle: 'Learning Library',
    description: 'مكتبة تعليمية متعددة التخصصات من التأسيس إلى الإتقان.',
    icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 13h18c5 0 8 3 8 8v32c0-5-3-8-8-8H8V13Zm48 0H38c-5 0-8 3-8 8v32c0-5 3-8 8-8h18V13Z"/><path d="M15 22h12M15 29h12M49 22H37M49 29H37"/></svg>'
  }
];

function number(value) {
  return Number(value || 0).toLocaleString('ar-SA');
}

function renderCards() {
  const grid = document.getElementById('centerGrid');
  grid.innerHTML = centers.map(center => `
    <a class="center-card" data-center="${center.id}" href="${center.href}" aria-label="فتح ${center.title}">
      <div class="center-brand">NEON<small>ACADEMY 2060</small></div>
      <div class="center-icon">${center.icon}</div>
      <h2>${center.title}</h2>
      <div class="center-subtitle">${center.subtitle}</div>
      <p>${center.description}</p>
      <div class="center-footer">NEON ACADEMY 2060</div>
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

  document.getElementById('metricXp').textContent = number(score);
  document.getElementById('metricCompleted').textContent = number(completed);
  document.getElementById('metricStreak').textContent = `${number(streak)} يوم`;
  document.getElementById('metricCertificates').textContent = number(Array.isArray(certificates) ? certificates.length : certificates);
  document.getElementById('metricMastery').textContent = `${number(mastery)}%`;
}

async function loadQuestionCount() {
  try {
    const response = await fetch('/data/exams/manifest.json', { cache: 'force-cache' });
    if (!response.ok) return;
    const manifest = await response.json();
    document.getElementById('heroQuestionCount').textContent = number(manifest.totalQuestions);
  } catch {
    document.getElementById('heroQuestionCount').textContent = '١٬١٢٢';
  }
}

function prepareContinueButton() {
  const saved = localStorage.getItem(LAST_CENTER_KEY);
  const valid = centers.some(center => center.href === saved);
  const button = document.getElementById('continueButton');
  button.href = valid ? saved : '/step';
}

async function boot() {
  renderCards();
  prepareContinueButton();
  prefetchOnIntent();
  loadQuestionCount();
  try {
    const session = await ensureAuth();
    renderAccount(session);
    renderStudentMetrics(session.profile);
  } catch (error) {
    if (error.message !== 'Authentication required') console.error(error);
  } finally {
    document.getElementById('bootOverlay')?.classList.add('hidden');
  }
}

boot();
