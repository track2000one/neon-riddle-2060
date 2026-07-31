import './ui-preferences.css';

const THEME_KEY = 'neonAcademyThemeV3';
const READER_SCALE_KEY = 'neonAcademyReaderScaleV1';
const DEFAULT_THEME = 'academic';
const THEMES = [
  { id:'academic', name:'أزرق احترافي', note:'الثيم الافتراضي', mode:'dark', colors:['#1B3C53','#234C6A','#456882','#D2C1B6'] },
  { id:'deep-blue', name:'أزرق أكاديمي', note:'عميق وواضح', mode:'dark', colors:['#0F2854','#1C4D8D','#4988C4','#BDE8F5'] },
  { id:'soft-beige', name:'بيج هادئ', note:'دافئ ومريح', mode:'light', colors:['#D6A99D','#EBE3D5','#D6DAC8','#9CAFAA'] },
  { id:'pastel-study', name:'باستيل تعليمي', note:'ودود وناعم', mode:'light', colors:['#FCF9EA','#BADFDB','#FFA4A4','#FFBDBD'] },
  { id:'mint-calm', name:'مينت هادئ', note:'مناسب للقراءة', mode:'light', colors:['#C0E1D2','#E5EEE4','#F6F4E8','#DC9B9B'] },
  { id:'summer-fresh', name:'صيفي مبهج', note:'حيوي ومتوازن', mode:'light', colors:['#FFF6DE','#8BDFDD','#F48F68','#FFE394'] }
];

function safeStorageGet(key, fallback) {
  try { return localStorage.getItem(key) || fallback; }
  catch { return fallback; }
}
function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); }
  catch { /* Storage may be unavailable in private contexts. */ }
}
function validTheme(value) {
  return THEMES.some(theme => theme.id === value) ? value : DEFAULT_THEME;
}
function applyTheme(themeId, announce = false) {
  const theme = validTheme(themeId);
  const metadata = THEMES.find(item => item.id === theme) || THEMES[0];
  document.documentElement.dataset.neonTheme = theme;
  document.documentElement.style.colorScheme = metadata.mode;
  safeStorageSet(THEME_KEY, theme);
  const color = getComputedStyle(document.documentElement).getPropertyValue('--ui-bg-0').trim() || metadata.colors[0];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  document.querySelectorAll('.neon-theme-option').forEach(button => {
    const selected = button.dataset.theme === theme;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (announce) window.dispatchEvent(new CustomEvent('neon-theme-changed', { detail:{ theme } }));
}

applyTheme(safeStorageGet(THEME_KEY, DEFAULT_THEME));

function createThemePicker() {
  if (document.querySelector('.neon-theme-host')) return;
  const header = document.querySelector('.site-header,.topbar');
  if (!header) return;
  const host = document.createElement('div');
  host.className = 'neon-theme-host';
  host.innerHTML = `
    <button class="neon-theme-trigger" type="button" aria-label="اختيار ثيم الألوان" aria-expanded="false" title="ثيمات الألوان">🎨</button>
    <div class="neon-theme-panel" role="dialog" aria-label="ثيمات ألوان المنصة">
      <header><strong>ثيمات مريحة للعين</strong><small>الأزرار والنصوص بتباين واضح</small></header>
      <div class="neon-theme-grid">
        ${THEMES.map(theme => `
          <button class="neon-theme-option" type="button" data-theme="${theme.id}" aria-pressed="false">
            <span class="neon-theme-swatches">${theme.colors.map(color => `<i style="background:${color}"></i>`).join('')}</span>
            <span><strong>${theme.name}${theme.id === DEFAULT_THEME ? ' • افتراضي' : ''}</strong><small>${theme.note}</small></span>
          </button>
        `).join('')}
      </div>
    </div>`;

  const account = header.querySelector('.account-chip,.auth-user-chip');
  const actions = header.querySelector('.header-actions');
  if (actions) actions.insertBefore(host, actions.firstChild);
  else if (account) header.insertBefore(host, account);
  else header.appendChild(host);

  const trigger = host.querySelector('.neon-theme-trigger');
  trigger.addEventListener('click', event => {
    event.stopPropagation();
    const open = host.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(open));
  });
  host.querySelectorAll('.neon-theme-option').forEach(button => {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.theme, true);
      host.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', event => {
    if (!host.contains(event.target)) {
      host.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      host.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
  applyTheme(safeStorageGet(THEME_KEY, DEFAULT_THEME));
}

function getReaderScale() {
  const value = Number(safeStorageGet(READER_SCALE_KEY, '1'));
  return Number.isFinite(value) ? Math.min(1.6, Math.max(.8, value)) : 1;
}
function setReaderScale(frame, scale) {
  const value = Math.round(Math.min(1.6, Math.max(.8, scale)) * 10) / 10;
  frame.dataset.readerScale = String(value);
  frame.style.setProperty('--reader-scale', String(value));
  frame.querySelector('.reader-value')?.replaceChildren(document.createTextNode(`${Math.round(value * 100)}%`));
  safeStorageSet(READER_SCALE_KEY, String(value));
}
async function toggleFullscreen(frame, button) {
  const nativeFullscreen = document.fullscreenEnabled && typeof frame.requestFullscreen === 'function';
  if (nativeFullscreen) {
    try {
      if (document.fullscreenElement === frame) await document.exitFullscreen();
      else await frame.requestFullscreen();
      button.classList.toggle('active', document.fullscreenElement === frame);
      return;
    } catch { /* Fall back to CSS fullscreen. */ }
  }
  const active = frame.classList.toggle('neon-reader-fullscreen-fallback');
  document.body.classList.toggle('neon-reader-lock', active);
  button.classList.toggle('active', active);
  button.title = active ? 'الخروج من ملء الشاشة' : 'ملء الشاشة';
}
function addReadingToolbar(frame) {
  if (!(frame instanceof HTMLElement)) return;
  if (frame.querySelector(':scope > .neon-reader-tools')) {
    frame.dataset.readerEnhanced = 'true';
    frame.classList.add('neon-reader-frame');
    return;
  }
  const hasReadableContent = frame.matches('.exam-runner,.step-practice-card,.step-modal-card') ||
    frame.querySelector('.exam-passage,.step-passage,.exam-question,.step-question,.ltr');
  if (!hasReadableContent) return;

  frame.dataset.readerEnhanced = 'true';
  frame.classList.add('neon-reader-frame');
  const toolbar = document.createElement('div');
  toolbar.className = 'neon-reader-tools';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'أدوات تكبير القراءة');
  toolbar.innerHTML = `
    <span class="reader-label">حجم القراءة والإطار</span>
    <button type="button" data-reader="minus" aria-label="تصغير النص">A−</button>
    <span class="reader-value">100%</span>
    <button type="button" data-reader="plus" aria-label="تكبير النص">A+</button>
    <button type="button" data-reader="reset" aria-label="إعادة الحجم">100</button>
    <button type="button" data-reader="wide" aria-label="توسيع إطار القراءة"><span class="reader-wide-label">توسيع</span> ↔</button>
    <button type="button" data-reader="full" aria-label="ملء الشاشة" title="ملء الشاشة">⛶</button>`;
  frame.insertBefore(toolbar, frame.firstChild);
  setReaderScale(frame, getReaderScale());

  toolbar.addEventListener('click', event => {
    const button = event.target.closest('[data-reader]');
    if (!button) return;
    const action = button.dataset.reader;
    const current = Number(frame.dataset.readerScale || 1);
    if (action === 'minus') setReaderScale(frame, current - .1);
    if (action === 'plus') setReaderScale(frame, current + .1);
    if (action === 'reset') setReaderScale(frame, 1);
    if (action === 'wide') {
      const wide = frame.classList.toggle('neon-reader-wide');
      button.classList.toggle('active', wide);
      button.setAttribute('aria-pressed', String(wide));
    }
    if (action === 'full') toggleFullscreen(frame, button);
  });
}
function scanReadingFrames(root = document) {
  const selectors = '.exam-runner,.step-practice-card,.step-modal-card,.learning-modal,.lesson-modal,[role="dialog"],[data-reader-frame]';
  if (root instanceof HTMLElement && root.matches(selectors)) addReadingToolbar(root);
  root.querySelectorAll?.(selectors).forEach(addReadingToolbar);
}
function startReadingObserver() {
  scanReadingFrames();
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.target instanceof HTMLElement) scanReadingFrames(mutation.target);
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) scanReadingFrames(node);
      });
    }
  });
  observer.observe(document.body, { childList:true, subtree:true });
  document.addEventListener('fullscreenchange', () => {
    document.querySelectorAll('[data-reader="full"]').forEach(button => {
      const frame = button.closest('.neon-reader-frame');
      button.classList.toggle('active', document.fullscreenElement === frame);
    });
  });
}

function init() {
  createThemePicker();
  startReadingObserver();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
else init();

export { applyTheme, addReadingToolbar, scanReadingFrames };
