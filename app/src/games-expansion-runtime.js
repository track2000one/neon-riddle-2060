import './games-expansion.css';
import { expansionMeta, expandedGameQuestions } from './games-expansion-data.js';

const STORAGE_KEY = 'neonGamesExpansionProgressV1';
const categories = ['cross', 'visual', 'hidden', 'lateral'];

let activeCategory = null;
let activeQuestions = [];
let currentIndex = 0;
let answered = false;
let revealLevel = 0;
let sessionScore = 0;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);
}

function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    value.completed ??= {};
    value.best ??= {};
    return value;
  } catch {
    return { completed: {}, best: {} };
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function completedFor(category) {
  const progress = readProgress();
  return new Set(progress.completed?.[category] || []);
}

function buildSection() {
  if (document.getElementById('expandedChallenges')) return;
  const anchor = document.getElementById('gameTracks');
  if (!anchor) return;

  const section = document.createElement('section');
  section.id = 'expandedChallenges';
  section.className = 'neon-expansion-section';
  section.innerHTML = `
    <div class="expansion-heading">
      <div>
        <span class="expansion-kicker">NEON EXPANDED CHALLENGE BANK</span>
        <h2>مكتبة التحديات الموسعة</h2>
        <p>112 مرحلة جديدة مركزة على الأقسام التي كانت أقل محتوى، مع حفظ التقدم تلقائيًا.</p>
      </div>
      <div class="expansion-total"><strong>112</strong><small>مرحلة جديدة</small></div>
    </div>
    <div class="expansion-categories" id="expansionCategories"></div>
    <div class="expansion-runner" id="expansionRunner" hidden></div>
  `;
  anchor.insertAdjacentElement('afterend', section);
  renderCategories();
}

function renderCategories() {
  const container = document.getElementById('expansionCategories');
  if (!container) return;
  container.innerHTML = categories.map(category => {
    const meta = expansionMeta[category];
    const bank = expandedGameQuestions.filter(item => item.cat === category);
    const completed = completedFor(category).size;
    const percent = Math.round((completed / bank.length) * 100);
    return `
      <button class="expansion-category-card" data-expansion-category="${category}">
        <span class="expansion-icon">${meta.icon}</span>
        <span class="expansion-card-copy">
          <strong>${escapeHtml(meta.title)}</strong>
          <small>${escapeHtml(meta.description)}</small>
          <span class="expansion-progress">
            <i><b style="width:${percent}%"></b></i>
            <em>${completed} / ${bank.length}</em>
          </span>
        </span>
        <span class="expansion-arrow">←</span>
      </button>
    `;
  }).join('');
}

function startCategory(category) {
  activeCategory = category;
  activeQuestions = expandedGameQuestions.filter(item => item.cat === category);
  const completed = completedFor(category);
  const firstIncomplete = activeQuestions.findIndex(item => !completed.has(item.id));
  currentIndex = firstIncomplete >= 0 ? firstIncomplete : 0;
  answered = false;
  revealLevel = 0;
  sessionScore = 0;
  const runner = document.getElementById('expansionRunner');
  runner.hidden = false;
  renderQuestion();
  runner.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function questionVisual(question) {
  if (question.cat === 'hidden') {
    const blur = [18, 11, 5, 0][Math.min(revealLevel, 3)];
    return `
      <div class="hidden-visual-wrap">
        <div class="hidden-visual" style="filter:blur(${blur}px)">${escapeHtml(question.visual)}</div>
        <button class="reveal-button" data-expansion-reveal ${revealLevel >= 3 ? 'disabled' : ''}>
          ${revealLevel >= 3 ? 'تم كشف الصورة' : `كشف جزء ${revealLevel + 1} / 3`}
        </button>
      </div>
    `;
  }
  if (question.visual) {
    return `<div class="pattern-visual">${escapeHtml(question.visual)}</div>`;
  }
  if (question.pattern) {
    return `<div class="cross-pattern">${escapeHtml(question.pattern)}</div>`;
  }
  return '';
}

function renderQuestion() {
  const runner = document.getElementById('expansionRunner');
  if (!runner || !activeQuestions.length) return;
  const question = activeQuestions[currentIndex];
  const meta = expansionMeta[activeCategory];
  const completed = completedFor(activeCategory);
  const totalCompleted = completed.size;
  const overallPct = Math.round((totalCompleted / activeQuestions.length) * 100);

  runner.innerHTML = `
    <div class="expansion-runner-head">
      <button class="expansion-back" data-expansion-back>×</button>
      <div>
        <span>${meta.icon} ${escapeHtml(meta.title)}</span>
        <strong>المرحلة ${currentIndex + 1} من ${activeQuestions.length}</strong>
      </div>
      <div class="expansion-score"><small>نقاط الجولة</small><b>${sessionScore}</b></div>
    </div>
    <div class="expansion-linear-progress"><span style="width:${Math.round(((currentIndex + 1) / activeQuestions.length) * 100)}%"></span></div>
    <div class="expansion-question-card">
      <div class="question-meta">
        <span>${escapeHtml(question.difficulty || 'متوسط')}</span>
        <span>${completed.has(question.id) ? '✓ مكتملة سابقًا' : 'مرحلة جديدة'}</span>
      </div>
      ${questionVisual(question)}
      <h3>${escapeHtml(question.q)}</h3>
      <div class="expansion-options">
        ${question.options.map((option, index) => `
          <button class="expansion-option" data-expansion-answer="${index}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>
        `).join('')}
      </div>
      <div class="expansion-feedback" id="expansionFeedback"></div>
      <div class="expansion-runner-actions">
        <button class="expansion-skip" data-expansion-next>تخطي مؤقت</button>
        <button class="expansion-next" data-expansion-next hidden>المرحلة التالية ←</button>
      </div>
    </div>
    <div class="expansion-category-summary">
      <span>إنجاز القسم</span><strong>${totalCompleted} / ${activeQuestions.length}</strong>
      <i><b style="width:${overallPct}%"></b></i>
    </div>
  `;
}

function answerQuestion(button) {
  if (answered) return;
  const question = activeQuestions[currentIndex];
  const chosen = Number(button.dataset.expansionAnswer);
  const isCorrect = chosen === question.answer;
  answered = true;

  const buttons = [...document.querySelectorAll('.expansion-option')];
  buttons.forEach((item, index) => {
    item.disabled = true;
    if (index === question.answer) item.classList.add('correct');
  });
  if (!isCorrect) button.classList.add('wrong');

  const feedback = document.getElementById('expansionFeedback');
  feedback.className = `expansion-feedback visible ${isCorrect ? 'success' : 'error'}`;
  feedback.innerHTML = `<strong>${isCorrect ? '✓ إجابة صحيحة' : '✦ الإجابة الصحيحة موضحة أعلاه'}</strong><p>${escapeHtml(question.explain)}</p>`;

  if (isCorrect) {
    const progress = readProgress();
    progress.completed[activeCategory] ??= [];
    if (!progress.completed[activeCategory].includes(question.id)) {
      progress.completed[activeCategory].push(question.id);
    }
    sessionScore += Math.max(50, 120 - revealLevel * 20);
    progress.best[activeCategory] = Math.max(progress.best[activeCategory] || 0, sessionScore);
    saveProgress(progress);
    renderCategories();
  }

  const nextButton = document.querySelector('.expansion-next');
  const skipButton = document.querySelector('.expansion-skip');
  if (nextButton) nextButton.hidden = false;
  if (skipButton) skipButton.hidden = true;
}

function nextQuestion() {
  if (!activeQuestions.length) return;
  currentIndex = (currentIndex + 1) % activeQuestions.length;
  answered = false;
  revealLevel = 0;
  renderQuestion();
}

function revealHidden() {
  if (activeCategory !== 'hidden' || revealLevel >= 3 || answered) return;
  revealLevel += 1;
  renderQuestion();
}

document.addEventListener('click', event => {
  const categoryButton = event.target.closest('[data-expansion-category]');
  if (categoryButton) {
    startCategory(categoryButton.dataset.expansionCategory);
    return;
  }

  const answerButton = event.target.closest('[data-expansion-answer]');
  if (answerButton) {
    answerQuestion(answerButton);
    return;
  }

  if (event.target.closest('[data-expansion-next]')) {
    nextQuestion();
    return;
  }

  if (event.target.closest('[data-expansion-reveal]')) {
    revealHidden();
    return;
  }

  if (event.target.closest('[data-expansion-back]')) {
    const runner = document.getElementById('expansionRunner');
    if (runner) runner.hidden = true;
    activeCategory = null;
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildSection, { once: true });
} else {
  buildSection();
}
