import './styles.css';
import './atari-2600-page.css';

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

const state = { query: '', category: 'all', selected: null, objectUrl: null };
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
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

function selectGame(id) {
  state.selected = catalog.find(game => game.id === id) || null;
  $('#selectedGameTitle').textContent = state.selected?.title || 'أي لعبة متوافقة';
  $('#selectedGameMeta').textContent = state.selected ? `${state.selected.genre} — اختر نسخة ROM التي يحق لك استخدامها.` : 'اختر لعبة من الكتالوج أو حمّل ROM مباشرة.';
  $$('.atari-card').forEach(item => item.classList.toggle('selected', item.dataset.gameId === id));
  $('#player')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setStatus(message, type = 'info') {
  const box = $('#atariStatus');
  if (!box) return;
  box.dataset.type = type;
  box.textContent = message;
}

function validateRom(file) {
  if (!file) return 'لم يتم اختيار ملف.';
  const extension = (file.name.split('.').pop() || '').toLowerCase();
  if (!['a26', 'bin', 'rom', 'zip', '7z', 'rar'].includes(extension)) return 'صيغة الملف غير مدعومة في المرحلة التجريبية.';
  if (file.size > 32 * 1024 * 1024) return 'حجم الملف أكبر من الحد التجريبي (32 MB).';
  return '';
}

function safeName(file) {
  return String(file.name || 'atari2600').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 80) || 'atari2600';
}

function playerDocument(romUrl, file) {
  const rom = JSON.stringify(romUrl).replace(/</g, '\\u003c');
  const name = JSON.stringify(safeName(file)).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}#game{width:100%;height:100%;min-height:420px}</style></head><body><div id="game"></div><script>window.EJS_player='#game';window.EJS_core='atari2600';window.EJS_gameUrl=${rom};window.EJS_gameName=${name};window.EJS_pathtodata='https://cdn.emulatorjs.org/stable/data/';window.EJS_startOnLoaded=true;<\/script><script src="https://cdn.emulatorjs.org/stable/data/loader.js"><\/script></body></html>`;
}

function launchRom(file) {
  const error = validateRom(file);
  if (error) { setStatus(error, 'error'); return; }
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.objectUrl = URL.createObjectURL(file);
  const frame = $('#atariEmulatorFrame');
  const placeholder = $('#playerPlaceholder');
  frame.srcdoc = playerDocument(state.objectUrl, file);
  frame.hidden = false;
  if (placeholder) placeholder.hidden = true;
  $('#loadedRomName').textContent = file.name;
  $('#loadedRomSize').textContent = `${Math.max(1, Math.round(file.size / 1024)).toLocaleString('ar-SA')} KB`;
  $('#playerResetButton').disabled = false;
  setStatus('تم تجهيز ROM داخل جلسة المتصفح. إذا لم يبدأ تلقائيًا استخدم زر التشغيل داخل المحاكي.', 'success');
}

function resetPlayer() {
  const frame = $('#atariEmulatorFrame');
  if (frame) { frame.srcdoc = ''; frame.hidden = true; }
  const placeholder = $('#playerPlaceholder');
  if (placeholder) placeholder.hidden = false;
  if (state.objectUrl) { URL.revokeObjectURL(state.objectUrl); state.objectUrl = null; }
  const input = $('#romInput');
  if (input) input.value = '';
  $('#loadedRomName').textContent = 'لا يوجد';
  $('#loadedRomSize').textContent = '—';
  $('#playerResetButton').disabled = true;
  setStatus('المحاكي جاهز. اختر ROM من جهازك للبدء.');
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

function bindRomPicker() {
  const zone = $('#romDropzone');
  const input = $('#romInput');
  if (!zone || !input) return;
  zone.addEventListener('click', event => { if (event.target !== input) input.click(); });
  zone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
  input.addEventListener('change', () => launchRom(input.files?.[0]));
  ['dragenter', 'dragover'].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.remove('dragging'); }));
  zone.addEventListener('drop', event => launchRom(event.dataTransfer?.files?.[0]));
}

function bindPlayerActions() {
  $('#playerResetButton')?.addEventListener('click', resetPlayer);
  $('#focusPlayerButton')?.addEventListener('click', () => $('#atariEmulatorFrame')?.focus());
  window.addEventListener('gamepadconnected', () => { $('#gamepadState').textContent = 'يد تحكم متصلة'; });
  window.addEventListener('gamepaddisconnected', () => { $('#gamepadState').textContent = 'لا توجد يد تحكم'; });
  window.addEventListener('beforeunload', () => { if (state.objectUrl) URL.revokeObjectURL(state.objectUrl); });
}

renderCatalog();
bindFilters();
bindRomPicker();
bindPlayerActions();
resetPlayer();
