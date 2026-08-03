import './styles.css';
import './kids-games-page.css';
import './kids-games-engine.css';
import { ensureAuth, renderAccount } from './auth.js';
import { games } from './kids-games-data.js';
import { launchKidsGame } from './kids-games-engine.js';

const PROGRESS_KEY = 'neonKidsGamesProgressV2';
const state = { type: 'all', age: 'all', query: '' };
let lastFocused = null;
let activeGameCleanup = null;

function readProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
  catch { return {}; }
}

function writeProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function saveStarted(game) {
  const progress = readProgress();
  const current = progress[game.id] || {};
  progress[game.id] = {
    ...current,
    started: true,
    percent: Math.max(5, Number(current.percent) || 0),
    lastPlayed: new Date().toISOString()
  };
  writeProgress(progress);
}

function saveGameProgress(game, result = {}) {
  const progress = readProgress();
  const current = progress[game.id] || {};
  const previousAttempts = Number(current.attempts) || 0;
  const nextPercent = result.completed
    ? 100
    : Math.max(5, Number(current.percent) || 0, Number(result.percent) || 0);

  progress[game.id] = {
    ...current,
    started: true,
    percent: Math.max(0, Math.min(100, Math.round(nextPercent))),
    bestScore: Math.max(Number(current.bestScore) || 0, Number(result.score) || 0),
    lastScore: Number(result.score) || 0,
    lastTotal: Number(result.total) || 0,
    attempts: previousAttempts + (result.completed ? 1 : 0),
    completed: Boolean(current.completed || result.completed),
    lastPlayed: new Date().toISOString()
  };
  writeProgress(progress);
}

function progressFor(game) {
  const item = readProgress()[game.id] || {};
  return {
    percent: Math.max(0, Math.min(100, Number(item.percent) || 0)),
    started: Boolean(item.started),
    completed: Boolean(item.completed),
    bestScore: Number(item.bestScore) || 0
  };
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
}

function matchesAge(game) {
  if (state.age === 'all') return true;
  const [min, max] = state.age.split('-').map(Number);
  return game.age[0] <= max && game.age[1] >= min;
}

function filteredGames() {
  const query = normalize(state.query);
  return games.filter(game => {
    const typeMatch = state.type === 'all' || game.type.includes(state.type);
    const text = normalize(`${game.en} ${game.ar} ${game.subject} ${game.skill} ${game.description}`);
    return typeMatch && matchesAge(game) && (!query || text.includes(query));
  });
}

function renderCard(game) {
  const progress = progressFor(game);
  const actionLabel = progress.completed ? 'العب مرة أخرى' : progress.started ? 'متابعة اللعب' : 'ابدأ اللعبة';
  return `
    <article class="kids-card" style="--game-a:${game.colors[0]};--game-b:${game.colors[1]}">
      <div class="kids-card-art"><span class="game-type">${game.subject}</span><div class="game-icon">${game.icon}</div></div>
      <div class="kids-card-body">
        <div class="game-level"><span>${game.difficulty}</span><span>${game.age[0]}–${game.age[1]} سنوات</span></div>
        <h2 lang="en">${game.en}</h2><h3>${game.ar}</h3>
        <p>${game.description}</p>
        <div class="game-meta"><span><b>المدة</b>${game.time} د</span><span><b>المراحل</b>${game.stages}</span><span><b>المهارة</b>${game.skill}</span></div>
        <div class="game-progress"><div><span>${progress.completed ? 'مكتملة ✓' : 'التقدم'}</span><b>${progress.percent}%</b></div><div class="progress-track"><i style="width:${progress.percent}%"></i></div></div>
        <div class="card-actions"><button class="play-game" data-play="${game.id}" type="button">${actionLabel}</button><button class="game-details" data-details="${game.id}" type="button">طريقة اللعب</button></div>
      </div>
    </article>`;
}

function render() {
  const visible = filteredGames();
  document.getElementById('resultCount').textContent = visible.length.toLocaleString('ar-SA');
  document.getElementById('gamesGrid').innerHTML = visible.length ? visible.map(renderCard).join('') : '<div class="empty-games"><span>🧭</span><h2>لا توجد لعبة مطابقة</h2><p>غيّر العمر أو نوع اللعبة أو عبارة البحث.</p></div>';
}

function showModal() {
  const modal = document.getElementById('gameModal');
  lastFocused = document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  modal.querySelector('.modal-close')?.focus();
}

function openModal(game) {
  activeGameCleanup?.();
  activeGameCleanup = null;
  const progress = progressFor(game);
  const modalContent = document.getElementById('modalContent');
  modalContent.classList.remove('game-active');
  modalContent.innerHTML = `
    <div class="modal-hero" style="--game-a:${game.colors[0]};--game-b:${game.colors[1]}"><span>${game.icon}</span></div>
    <div class="modal-copy"><span class="eyebrow">KIDS GAME CARD</span><h2 id="modalTitle" lang="en">${game.en}</h2><h3>${game.ar}</h3><p>${game.description}</p>
    <div class="modal-stats"><span><small>العمر</small><b>${game.age[0]}–${game.age[1]} سنوات</b></span><span><small>الصعوبة</small><b>${game.difficulty}</b></span><span><small>المدة</small><b>${game.time} دقائق</b></span><span><small>المراحل</small><b>${game.stages}</b></span></div>
    <section class="how-play"><h4>طريقة اللعب</h4><ol>${game.how.map(step => `<li>${step}</li>`).join('')}</ol></section>
    <section class="teacher-note"><h4>ملخص للوالد والمعلم</h4><p>${game.summary}</p></section>
    <div class="modal-progress"><span>التقدم الحالي: <b>${progress.percent}%</b></span><div class="progress-track"><i style="width:${progress.percent}%"></i></div></div>
    <button class="modal-start" data-modal-play="${game.id}" type="button">${progress.completed ? 'العب مرة أخرى' : progress.started ? 'متابعة النشاط' : 'بدء النشاط'}</button></div>`;
  showModal();
}

function startGame(game) {
  activeGameCleanup?.();
  saveStarted(game);
  const mount = document.getElementById('modalContent');
  activeGameCleanup = launchKidsGame({
    game,
    mount,
    onProgress: result => {
      saveGameProgress(game, result);
      render();
    }
  });
  showModal();
  render();
}

function closeModal() {
  const modal = document.getElementById('gameModal');
  activeGameCleanup?.();
  activeGameCleanup = null;
  document.getElementById('modalContent')?.classList.remove('game-active');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  lastFocused?.focus?.();
}

function bindEvents() {
  document.querySelector('.kids-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    state.type = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
    render();
  });
  document.getElementById('gameSearch').addEventListener('input', event => { state.query = event.target.value; render(); });
  document.getElementById('ageFilter').addEventListener('change', event => { state.age = event.target.value; render(); });
  document.getElementById('gamesGrid').addEventListener('click', event => {
    const details = event.target.closest('[data-details]');
    const play = event.target.closest('[data-play]');
    const id = details?.dataset.details || play?.dataset.play;
    const game = games.find(item => item.id === id);
    if (!game) return;
    if (play) startGame(game);
    else openModal(game);
  });
  const modal = document.getElementById('gameModal');
  modal.addEventListener('click', event => {
    if (event.target === modal || event.target.closest('.modal-close')) {
      closeModal();
      return;
    }
    const play = event.target.closest('[data-modal-play]');
    if (play) {
      const game = games.find(item => item.id === play.dataset.modalPlay);
      if (game) startGame(game);
    }
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
}

async function boot() {
  render();
  bindEvents();
  try { renderAccount(await ensureAuth()); }
  catch (error) { if (error.message !== 'Authentication required') console.error(error); }
  finally { document.getElementById('bootOverlay')?.classList.add('hidden'); }
}

boot();
