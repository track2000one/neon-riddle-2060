import './styles.css';
import './atari-2600-page.css';
import { ensureAuth } from './auth.js';

const catalog = [
  { id: 'adventure', title: 'Adventure', genre: 'مغامرات', category: 'adventure', glyph: '◆', hint: 'استكشاف متاهات وقلاع وجمع عناصر.' },
  { id: 'asteroids', title: 'Asteroids', genre: 'أركيد فضائي', category: 'arcade', glyph: '✦', hint: 'مواجهة كويكبات في جولات أركيد سريعة.' },
  { id: 'breakout', title: 'Breakout', genre: 'مهارة ورد فعل', category: 'arcade', glyph: '▦', hint: 'تحكم دقيق بالمضرب وكسر صفوف الحواجز.' },
  { id: 'combat', title: 'Combat', genre: 'مواجهة كلاسيكية', category: 'action', glyph: '▲', hint: 'مواجهات قصيرة بطابع Atari الكلاسيكي.' },
  { id: 'missile-command', title: 'Missile Command', genre: 'استراتيجية أركيد', category: 'strategy', glyph: '⌁', hint: 'دفاع سريع واتخاذ قرار تحت الضغط.' },
  { id: 'space-invaders', title: 'Space Invaders', genre: 'أركيد', category: 'arcade', glyph: '▣', hint: 'موجات متدرجة من الأهداف بأسلوب كلاسيكي.' },
  { id: 'yars-revenge', title: "Yars' Revenge", genre: 'أكشن فضائي', category: 'action', glyph: '✺', hint: 'حركة وهجوم وتوقيت في ساحة فضائية.' },
  { id: 'centipede', title: 'Centipede', genre: 'أركيد', category: 'arcade', glyph: '•••', hint: 'رد فعل سريع وتتبع أهداف متحركة.' },
  { id: 'river-raid', title: 'River Raid', genre: 'أكشن', category: 'action', glyph: '≈', hint: 'رحلة سريعة عبر مسارات ضيقة ومتغيرة.' },
  { id: 'pitfall', title: 'Pitfall!', genre: 'مغامرات', category: 'adventure', glyph: '♢', hint: 'قفز واستكشاف وتوقيت عبر مراحل متتابعة.' },
  { id: 'frogger', title: 'Frogger', genre: 'مهارة', category: 'arcade', glyph: '＋', hint: 'توقيت الحركة والعبور الآمن عبر مسارات متعددة.' },
  { id: 'pac-man', title: 'Pac-Man', genre: 'متاهة', category: 'strategy', glyph: '◒', hint: 'تنقل داخل متاهة وجمع عناصر مع إدارة المسار.' }
];

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar', 'PageUp', 'PageDown', 'Home', 'End']);
const state = {
  query: '',
  category: 'all',
  selected: null,
  pendingFile: null,
  playerReady: false,
  gameplayLocked: false,
  lockedScrollY: 0,
  authSession: null,
  driveItems: [],
  driveNextPageToken: null,
  driveQuery: '',
  driveLoading: false,
  driveConfigured: false
};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function stripExtension(name) {
  return String(name || '').replace(/\.[^.]+$/, '');
}

function humanBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('ar-SA')} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function visibleGames() {
  const query = normalize(state.query);
  return catalog.filter(game => {
    const categoryMatch = state.category === 'all' || game.category === state.category;
    const text = normalize(`${game.title} ${game.genre} ${game.hint}`);
    return categoryMatch && (!query || text.includes(query));
  });
}

function card(game) {
  return `<article class="atari-card" data-game-id="${escapeHtml(game.id)}">
    <div class="atari-cover"><b>${escapeHtml(game.glyph)}</b></div>
    <div class="atari-card-copy"><small>${escapeHtml(game.genre)}</small><h3 lang="en">${escapeHtml(game.title)}</h3><p>${escapeHtml(game.hint)}</p><button type="button" data-select-game="${escapeHtml(game.id)}">اختيار وتشغيل ROM</button></div>
  </article>`;
}

function renderCatalog() {
  const games = visibleGames();
  const grid = $('#atariCatalogGrid');
  if (!grid) return;
  $('#atariVisibleCount').textContent = games.length.toLocaleString('ar-SA');
  grid.innerHTML = games.length ? games.map(card).join('') : '<div class="atari-card-copy"><h3>لا توجد نتيجة</h3><p>غيّر البحث أو نوع اللعبة.</p></div>';
}

function driveCard(item) {
  const title = stripExtension(item.name);
  const extension = String(item.extension || '').toUpperCase();
  return `<article class="atari-card drive-card" data-drive-id="${escapeHtml(item.id)}">
    <div class="atari-cover"><b>DRIVE</b></div>
    <div class="atari-card-copy">
      <small>Google Drive Private</small>
      <h3 lang="en" title="${escapeHtml(item.name)}">${escapeHtml(title)}</h3>
      <p>ملف Atari محفوظ في مكتبة Msar Neon الخاصة ويُجلب عبر الخادم عند التشغيل فقط.</p>
      <div class="drive-card-meta"><span>${escapeHtml(extension || 'ROM')}</span><span>${escapeHtml(humanBytes(item.size))}</span></div>
      <button class="drive-play-button" type="button" data-drive-play="${escapeHtml(item.id)}">تشغيل من Google Drive</button>
    </div>
  </article>`;
}

function renderDriveLibrary() {
  const grid = $('#driveLibraryGrid');
  if (!grid) return;
  if (!state.driveItems.length) {
    grid.innerHTML = state.driveConfigured ? '<div class="drive-empty">لا توجد ملفات مطابقة في مجلد Atari على Google Drive.</div>' : '';
  } else {
    grid.innerHTML = state.driveItems.map(driveCard).join('');
  }
  const more = $('#driveLoadMoreButton');
  if (more) more.hidden = !state.driveNextPageToken;
}

function selectGame(id) {
  state.selected = catalog.find(game => game.id === id) || null;
  $('#selectedGameTitle').textContent = state.selected?.title || 'أي لعبة متوافقة';
  $('#selectedGameMeta').textContent = state.selected ? `${state.selected.genre} — اختر نسخة ROM التي يحق لك استخدامها.` : 'اختر لعبة من الكتالوج أو حمّل ROM مباشرة.';
  $$('.atari-card').forEach(item => item.classList.toggle('selected', item.dataset.gameId === id));
  $('#player')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectDriveItem(item) {
  state.selected = { id: item.id, title: stripExtension(item.name), genre: 'Google Drive Private', source: 'drive' };
  $('#selectedGameTitle').textContent = state.selected.title;
  $('#selectedGameMeta').textContent = 'Google Drive Private — يتم جلب ROM عبر خادم NEON ثم تشغيله محليًا داخل المتصفح.';
  $$('.atari-card').forEach(cardElement => cardElement.classList.toggle('selected', cardElement.dataset.driveId === item.id));
}

function setStatus(message, type = 'info') {
  const box = $('#atariStatus');
  if (!box) return;
  box.dataset.type = type;
  box.textContent = message;
}

function setDriveMessage(message, type = 'info') {
  const box = $('#driveLibraryMessage');
  if (!box) return;
  box.dataset.type = type;
  box.textContent = message;
}

function setDriveConnection(stateName, text) {
  const cardElement = $('#driveConnectionCard');
  if (cardElement) cardElement.dataset.state = stateName;
  if ($('#driveConnectionText')) $('#driveConnectionText').textContent = text;
}

function setGameplayLock(locked, { announce = false } = {}) {
  const shouldLock = Boolean(locked);
  if (state.gameplayLocked === shouldLock) {
    if (shouldLock) $('#atariEmulatorFrame')?.focus();
    return;
  }

  state.gameplayLocked = shouldLock;

  if (shouldLock) {
    state.lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add('gameplay-lock');
    document.body.classList.add('gameplay-lock');
    $('#atariEmulatorFrame')?.focus();
    if (announce) setStatus('وضع اللعب مفعّل. الأسهم مخصصة للعبة الآن، واضغط Esc للعودة إلى تمرير الصفحة.', 'success');
    return;
  }

  document.documentElement.classList.remove('gameplay-lock');
  document.body.classList.remove('gameplay-lock');
  const restoreY = state.lockedScrollY;
  state.lockedScrollY = 0;
  window.requestAnimationFrame(() => {
    if (Math.abs((window.scrollY || 0) - restoreY) > 1) {
      window.scrollTo({ top: restoreY, left: 0, behavior: 'auto' });
    }
  });
  if (announce) setStatus('تم إلغاء وضع اللعب. يمكنك تمرير الصفحة بشكل طبيعي.', 'info');
}

function validateRom(file) {
  if (!file) return 'لم يتم اختيار ملف.';
  const extension = (file.name.split('.').pop() || '').toLowerCase();
  if (!['a26', 'bin', 'rom', 'zip', '7z', 'rar'].includes(extension)) return 'صيغة الملف غير مدعومة في المرحلة التجريبية.';
  if (file.size > 32 * 1024 * 1024) return 'حجم الملف أكبر من الحد التجريبي (32 MB).';
  return '';
}

function sendPendingFile() {
  if (!state.playerReady || !state.pendingFile) return;
  const frame = $('#atariEmulatorFrame');
  if (!frame?.contentWindow) return;
  frame.contentWindow.postMessage({ type: 'msar-atari-load', file: state.pendingFile }, window.location.origin);
  setStatus('تم تسليم ROM للمحاكي. جارٍ تشغيل Stella 2014…', 'info');
}

function launchRom(file, { source = 'local' } = {}) {
  const error = validateRom(file);
  if (error) { setStatus(error, 'error'); return; }

  setGameplayLock(false);
  state.pendingFile = file;
  state.playerReady = false;
  const frame = $('#atariEmulatorFrame');
  const placeholder = $('#playerPlaceholder');
  if (!frame) return;

  frame.hidden = false;
  frame.src = `/atari-2600-player?session=${Date.now()}`;
  if (placeholder) placeholder.hidden = true;
  $('#loadedRomName').textContent = file.name;
  $('#loadedRomSize').textContent = humanBytes(file.size);
  $('#playerResetButton').disabled = false;
  setStatus(source === 'drive' ? 'تم جلب ROM من Google Drive. جارٍ تجهيز المحاكي…' : 'تم اختيار ROM من جهازك. جارٍ تجهيز المحاكي…', 'info');
  $('#player')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetPlayer() {
  setGameplayLock(false);
  state.pendingFile = null;
  state.playerReady = false;
  const frame = $('#atariEmulatorFrame');
  if (frame) {
    frame.hidden = true;
    frame.src = `/atari-2600-player?reset=${Date.now()}`;
  }
  const placeholder = $('#playerPlaceholder');
  if (placeholder) placeholder.hidden = false;
  const input = $('#romInput');
  if (input) input.value = '';
  $('#loadedRomName').textContent = 'لا يوجد';
  $('#loadedRomSize').textContent = '—';
  $('#playerResetButton').disabled = true;
  setStatus('المحاكي جاهز. اختر لعبة من Drive أو ROM من جهازك للبدء.');
}

async function authHeaders() {
  if (!state.authSession?.user) throw new Error('AUTH_SESSION_MISSING');
  const token = await state.authSession.user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function driveJson(path) {
  const headers = await authHeaders();
  const response = await fetch(path, { cache: 'no-store', headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || `HTTP_${response.status}`), { status: response.status, code: data.error || 'DRIVE_REQUEST_FAILED' });
  return data;
}

async function loadDriveLibrary({ append = false, pageToken = null } = {}) {
  if (state.driveLoading || !state.authSession) return;
  state.driveLoading = true;
  const searchButton = $('#driveSearchButton');
  const refreshButton = $('#driveRefreshButton');
  const moreButton = $('#driveLoadMoreButton');
  [searchButton, refreshButton, moreButton].forEach(button => { if (button) button.disabled = true; });

  try {
    const params = new URLSearchParams({ pageSize: '120' });
    if (state.driveQuery) params.set('q', state.driveQuery);
    if (pageToken) params.set('pageToken', pageToken);
    const data = await driveJson(`/api/atari-drive/library?${params.toString()}`);
    state.driveConfigured = Boolean(data.configured);

    if (!data.configured) {
      state.driveItems = [];
      state.driveNextPageToken = null;
      setDriveConnection('pending', 'بانتظار بيانات حساب الخدمة في Railway');
      setDriveMessage('تم تجهيز التكامل والمجلد، لكن الخادم يحتاج GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL و GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY قبل قراءة الملفات.', 'warning');
      renderDriveLibrary();
      return;
    }

    const incoming = Array.isArray(data.items) ? data.items : [];
    state.driveItems = append ? [...state.driveItems, ...incoming] : incoming;
    state.driveNextPageToken = data.nextPageToken || null;
    setDriveConnection('connected', 'متصل بالمكتبة الخاصة');
    setDriveMessage(state.driveItems.length ? `تمت قراءة ${state.driveItems.length.toLocaleString('ar-SA')} ملفًا من Google Drive${state.driveNextPageToken ? ' — توجد نتائج إضافية' : ''}.` : 'الاتصال بـ Google Drive يعمل، لكن لا توجد ملفات مطابقة في مجلد ROMs حاليًا.', 'success');
    renderDriveLibrary();
  } catch (error) {
    state.driveConfigured = false;
    setDriveConnection('error', 'تعذر الاتصال بالمكتبة');
    setDriveMessage(error.message || 'تعذر قراءة Google Drive.', 'error');
  } finally {
    state.driveLoading = false;
    [searchButton, refreshButton, moreButton].forEach(button => { if (button) button.disabled = false; });
  }
}

async function playDriveItem(fileId) {
  const item = state.driveItems.find(value => value.id === fileId);
  if (!item || state.driveLoading) return;
  const cardElement = document.querySelector(`.drive-card[data-drive-id="${CSS.escape(fileId)}"]`);
  cardElement?.classList.add('is-loading');
  selectDriveItem(item);
  setDriveMessage(`جارٍ جلب ${item.name} من Google Drive عبر خادم NEON…`, 'info');

  try {
    const headers = await authHeaders();
    const response = await fetch(`/api/atari-drive/rom/${encodeURIComponent(fileId)}`, { cache: 'no-store', headers });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `HTTP_${response.status}`);
    }
    const blob = await response.blob();
    const encodedName = response.headers.get('X-NEON-ROM-Name');
    let fileName = item.name;
    if (encodedName) {
      try { fileName = decodeURIComponent(encodedName); } catch {}
    }
    const file = new File([blob], fileName, { type: 'application/octet-stream', lastModified: Date.now() });
    setDriveMessage(`تم جلب ${fileName} بنجاح. انتقل إلى شاشة المحاكاة للعب.`, 'success');
    launchRom(file, { source: 'drive' });
  } catch (error) {
    setDriveMessage(error.message || 'تعذر جلب ROM من Google Drive.', 'error');
    setStatus('تعذر تشغيل اللعبة من Google Drive. يمكنك تجربة ROM محلي مؤقتًا.', 'error');
  } finally {
    cardElement?.classList.remove('is-loading');
  }
}

function bindFilters() {
  $('#atariSearch')?.addEventListener('input', event => { state.query = event.target.value; renderCatalog(); });
  $('#atariCategoryFilters')?.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    state.category = button.dataset.category;
    $$('#atariCategoryFilters [data-category]').forEach(item => item.classList.toggle('active', item === button));
    renderCatalog();
  });
  $('#atariCatalogGrid')?.addEventListener('click', event => {
    const button = event.target.closest('[data-select-game]');
    if (button) selectGame(button.dataset.selectGame);
  });
}

function bindDriveLibrary() {
  const search = $('#driveSearch');
  const runSearch = () => {
    state.driveQuery = String(search?.value || '').trim();
    state.driveNextPageToken = null;
    loadDriveLibrary({ append: false });
  };
  $('#driveSearchButton')?.addEventListener('click', runSearch);
  search?.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); runSearch(); }
  });
  $('#driveRefreshButton')?.addEventListener('click', () => {
    state.driveQuery = '';
    if (search) search.value = '';
    state.driveNextPageToken = null;
    loadDriveLibrary({ append: false });
  });
  $('#driveLoadMoreButton')?.addEventListener('click', () => {
    if (state.driveNextPageToken) loadDriveLibrary({ append: true, pageToken: state.driveNextPageToken });
  });
  $('#driveLibraryGrid')?.addEventListener('click', event => {
    const button = event.target.closest('[data-drive-play]');
    if (button) playDriveItem(button.dataset.drivePlay);
  });
}

function bindRomPicker() {
  const zone = $('#romDropzone');
  const input = $('#romInput');
  if (!zone || !input) return;
  zone.addEventListener('click', event => { if (event.target !== input) input.click(); });
  zone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
  input.addEventListener('change', () => launchRom(input.files?.[0], { source: 'local' }));
  ['dragenter', 'dragover'].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.remove('dragging'); }));
  zone.addEventListener('drop', event => launchRom(event.dataTransfer?.files?.[0], { source: 'local' }));
}

function bindGameplayFocus() {
  const frame = $('#atariEmulatorFrame');
  const screenFrame = document.querySelector('.screen-frame');

  screenFrame?.addEventListener('pointerdown', () => {
    if (!frame?.hidden && state.pendingFile) setGameplayLock(true);
  });

  window.addEventListener('keydown', event => {
    if (!state.gameplayLocked) return;
    if (SCROLL_KEYS.has(event.key)) event.preventDefault();
    if (event.key === 'Escape') setGameplayLock(false, { announce: true });
  }, { capture: true });
}

function bindPlayerActions() {
  $('#playerResetButton')?.addEventListener('click', resetPlayer);
  $('#focusPlayerButton')?.addEventListener('click', () => {
    setGameplayLock(true, { announce: true });
    $('#atariEmulatorFrame')?.focus();
  });

  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin) return;
    const data = event.data || {};
    if (data.type === 'msar-atari-player-ready') {
      state.playerReady = true;
      sendPendingFile();
      return;
    }
    if (data.type === 'msar-atari-lock') {
      setGameplayLock(Boolean(data.locked), { announce: data.reason === 'escape' });
      return;
    }
    if (data.type === 'msar-atari-status') {
      const level = data.level === 'error' ? 'error' : data.level === 'success' ? 'success' : 'info';
      const detail = data.detail ? ` — ${data.detail}` : '';
      setStatus(`${data.message || 'تحديث من المحاكي'}${detail}`, level);
    }
  });

  window.addEventListener('gamepadconnected', () => { $('#gamepadState').textContent = 'يد تحكم متصلة'; });
  window.addEventListener('gamepaddisconnected', () => { $('#gamepadState').textContent = 'لا توجد يد تحكم'; });
  window.addEventListener('beforeunload', () => setGameplayLock(false));
}

async function bootstrapDriveIntegration() {
  setDriveConnection('checking', 'جارٍ التحقق من الاتصال…');
  try {
    state.authSession = await ensureAuth();
    await loadDriveLibrary({ append: false });
  } catch (error) {
    if (!String(error?.message || '').includes('Authentication required')) {
      setDriveConnection('error', 'تعذر بدء جلسة المنصة');
      setDriveMessage('تعذر التحقق من جلسة المستخدم. أعد تحميل الصفحة أو سجّل الدخول من جديد.', 'error');
    }
  }
}

renderCatalog();
bindFilters();
bindDriveLibrary();
bindRomPicker();
bindGameplayFocus();
bindPlayerActions();
bootstrapDriveIntegration();
