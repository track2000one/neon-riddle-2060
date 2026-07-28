(() => {
  'use strict';

  const PROFILE_KEY = 'neonRiddleGrandProfilesV4';
  const SETTINGS_KEY = 'neonRiddleGrandSettingsV4';
  const MODES = window.GAME_MODES;
  const DATA = window.GAME_DATA;
  const AUDIENCES = { adult: 'للبالغين', kids: 'للأطفال' };
  const TIMER_OPTIONS = ['25', '45', '75', '120', 'open'];
  const ELIGIBLE_TOURNAMENT_MODES = ['book', 'logic', 'lateral', 'math', 'words', 'knowledge', 'visual', 'hidden'];
  const ENTERTAINMENT_MODES = ['book','logic','lateral','scramble','visual','hidden','cross'];
  const KNOWLEDGE_MODES = ['knowledge','words','math'];
  const APTITUDE_MODES = ['qudurat_verbal','qudurat_quant'];

  const THEMES = [
    { id: 'neon', title: 'نيون 2060', icon: '◈', price: 0 },
    { id: 'solar', title: 'الطاقة الشمسية', icon: '☀', price: 400 },
    { id: 'emerald', title: 'زمرد المستقبل', icon: '◆', price: 400 },
    { id: 'crimson', title: 'الشفق القرمزي', icon: '✦', price: 450 },
    { id: 'ice', title: 'الجليد الكمي', icon: '❄', price: 500 }
  ];
  const AVATARS = [
    { id: '🧠', title: 'العقل', price: 0 },
    { id: '🦾', title: 'الذراع الآلية', price: 150 },
    { id: '👑', title: 'البطل', price: 250 },
    { id: '🛸', title: 'المستكشف', price: 300 },
    { id: '🐉', title: 'التنين', price: 350 },
    { id: '🧩', title: 'قطعة اللغز', price: 220 }
  ];
  const BOOSTERS = [
    { id: 'hints', title: '3 تلميحات', icon: '💡', amount: 3, price: 120, desc: 'يكشف تلميحًا أو كلمة.' },
    { id: 'freezes', title: 'تجميدان', icon: '❄', amount: 2, price: 150, desc: 'يضيف 15 ثانية.' },
    { id: 'skips', title: 'تجاوز واحد', icon: '↪', amount: 1, price: 180, desc: 'يفتح المرحلة التالية.' }
  ];
  const ACHIEVEMENTS = [
    { id: 'first', icon: '✦', title: 'الانطلاقة', desc: 'أكمل أول مرحلة.', coins: 50, test: s => s.completed >= 1 },
    { id: 'ten', icon: '⚡', title: 'عقل متقد', desc: 'أكمل 10 مراحل.', coins: 90, test: s => s.completed >= 10 },
    { id: 'fifty', icon: '◆', title: 'جامع الألغاز', desc: 'أكمل 50 مرحلة.', coins: 180, test: s => s.completed >= 50 },
    { id: 'hundred', icon: '♛', title: 'أستاذ المكتبة', desc: 'أكمل 100 مرحلة.', coins: 350, test: s => s.completed >= 100 },
    { id: 'perfect10', icon: '★', title: 'إتقان النجوم', desc: 'احصل على 10 نتائج بثلاث نجوم.', coins: 150, test: s => s.perfect >= 10 },
    { id: 'book20', icon: '📘', title: 'قارئ الألغاز', desc: 'أكمل 20 لغزًا من مكتبة الكتاب.', coins: 160, test: s => s.bookCompleted >= 20 },
    { id: 'tourney', icon: '🏆', title: 'منافس خطير', desc: 'حقق 1000 نقطة في بطولة.', coins: 220, test: s => s.bestTournament >= 1000 },
    { id: 'rich', icon: '◉', title: 'خزنة ممتلئة', desc: 'امتلك 1000 عملة.', coins: 100, test: s => s.coins >= 1000 },
    { id: 'aptitude80', icon: '🎯', title: 'متفوق القدرات', desc: 'حقق 80% في المحاكاة التدريبية.', coins: 250, test: s => s.bestAptitude >= 80 }
  ];

  const mainView = document.getElementById('mainView');
  const profileModal = document.getElementById('profileModal');
  const profilesList = document.getElementById('profilesList');
  const profileForm = document.getElementById('profileForm');
  const profileNameInput = document.getElementById('profileName');
  const toast = document.getElementById('toast');

  let profiles = load(PROFILE_KEY, {});
  let settings = load(SETTINGS_KEY, { activeId: null, audience: 'adult', timer: '45', sound: true });
  let activeId = settings.activeId || Object.keys(profiles)[0] || null;
  let currentView = { name: 'home' };
  let game = null;
  let timerId = null;
  let confirmResolver = null;
  let audioContext = null;
  let toastTimer = null;
  let libraryMode = 'all';
  let libraryQuery = '';

  Object.values(profiles).forEach(normalizeProfile);
  saveAll();

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function saveAll() {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    settings.activeId = activeId;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function createProfile(name) {
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return normalizeProfile({
      id, name, score: 0, coins: 180, streak: 0, bestStreak: 0,
      levels: {}, stats: { answered: 0, correct: 0, hintsUsed: 0 },
      inventory: { hints: 3, freezes: 1, skips: 0, themes: ['neon'], avatars: ['🧠'] },
      theme: 'neon', avatar: '🧠', dailyReward: '', claimedAchievements: [],
      tournament: { best: 0, played: 0, lastScore: 0 }, aptitude: { best: 0, attempts: 0, last: 0, verbal: 0, quant: 0 }
    });
  }

  function normalizeProfile(p) {
    p.score ??= 0;
    p.coins ??= 180;
    p.streak ??= 0;
    p.bestStreak ??= 0;
    p.levels ??= {};
    p.stats ??= {};
    p.stats.answered ??= 0;
    p.stats.correct ??= 0;
    p.stats.hintsUsed ??= 0;
    p.inventory ??= {};
    p.inventory.hints ??= 3;
    p.inventory.freezes ??= 1;
    p.inventory.skips ??= 0;
    p.inventory.themes ??= ['neon'];
    p.inventory.avatars ??= ['🧠'];
    if (!p.inventory.themes.includes('neon')) p.inventory.themes.push('neon');
    if (!p.inventory.avatars.includes('🧠')) p.inventory.avatars.push('🧠');
    p.theme ??= 'neon';
    p.avatar ??= '🧠';
    p.dailyReward ??= '';
    p.claimedAchievements ??= [];
    p.tournament ??= {};
    p.tournament.best ??= 0;
    p.tournament.played ??= 0;
    p.tournament.lastScore ??= 0;
    p.aptitude ??= {};
    p.aptitude.best ??= 0;
    p.aptitude.attempts ??= 0;
    p.aptitude.last ??= 0;
    p.aptitude.verbal ??= 0;
    p.aptitude.quant ??= 0;
    return p;
  }

  function profile() { return profiles[activeId] || null; }
  function puzzleBank(mode) { return DATA[settings.audience][mode] || []; }
  function levelKey(mode) { return `${settings.audience}_${mode}`; }
  function levelRecord(mode, index, p = profile()) { return p?.levels?.[levelKey(mode)]?.[index] || null; }
  function isUnlocked(mode, index) { return index < 3 || Boolean(levelRecord(mode, index - 1)?.completed); }
  function audienceLabel() { return AUDIENCES[settings.audience]; }
  function timerLabel() { return settings.timer === 'open' ? 'وقت مفتوح' : `${settings.timer} ثانية`; }
  function timerValue() { return settings.timer === 'open' ? Infinity : Number(settings.timer); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[ch])); }
  function normalizeArabic(value) { return String(value || '').replace(/\s+/g, '').replace(/[إأآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[^\u0600-\u06FFA-Za-z0-9]/g, '').toLowerCase(); }
  function starsHtml(count) { return `<span class="stars">${[1,2,3].map(n => `<span class="${n <= count ? 'won' : ''}">★</span>`).join('')}</span>`; }
  function localDateKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

  function totalStats(p = profile(), audience = settings.audience) {
    const stats = { completed: 0, stars: 0, perfect: 0, total: 0, bookCompleted: 0, bestTournament: p?.tournament?.best || 0, bestAptitude: p?.aptitude?.best || 0, coins: p?.coins || 0 };
    if (!p) return stats;
    Object.keys(MODES).forEach(mode => {
      const bank = DATA[audience][mode] || [];
      stats.total += bank.length;
      const bucket = p.levels[`${audience}_${mode}`] || {};
      Object.values(bucket).forEach(rec => {
        if (rec.completed) stats.completed++;
        stats.stars += rec.stars || 0;
        if ((rec.stars || 0) === 3) stats.perfect++;
      });
      if (mode === 'book') stats.bookCompleted = Object.values(bucket).filter(r => r.completed).length;
    });
    return stats;
  }

  function overallCompleted(p = profile()) {
    if (!p) return 0;
    let count = 0;
    Object.values(p.levels).forEach(bucket => Object.values(bucket).forEach(rec => { if (rec.completed) count++; }));
    return count;
  }

  function modeStats(mode) {
    const bucket = profile()?.levels?.[levelKey(mode)] || {};
    let completed = 0, stars = 0;
    Object.values(bucket).forEach(rec => { if (rec.completed) completed++; stars += rec.stars || 0; });
    return { completed, stars };
  }

  function applyTheme() {
    document.body.dataset.theme = profile()?.theme || 'neon';
  }

  function setHeader() {
    const p = profile();
    document.getElementById('headerPlayer').textContent = p?.name || 'اللاعب';
    document.getElementById('headerAvatar').textContent = p?.avatar || '🧠';
    document.getElementById('headerCoins').textContent = (p?.coins || 0).toLocaleString('ar-SA');
    document.getElementById('soundIcon').textContent = settings.sound === false ? '🔇' : '🔊';
    applyTheme();
  }

  function renderHome() {
    clearTimer();
    currentView = { name: 'home' };
    const p = profile();
    const libraryTotal = Object.values(DATA.adult).reduce((sum, arr) => sum + arr.length, 0) + Object.values(DATA.kids).reduce((sum, arr) => sum + arr.length, 0);
    if (!p) {
      mainView.innerHTML = `
        <section class="hero mega-hero"><div><div class="eyebrow">GRAND PUZZLE ARENA 2060</div><h1>أضخم مكتبة ألغاز<br><span class="gradient-text">في تجربة أوفلاين</span></h1><p>أكثر من ${libraryTotal} تحديًا بين ألغاز الكتاب والمنطق والتفكير الجانبي والحساب والكلمات المتقطعة والصور وشبكات المفردات.</p><div class="hero-actions"><button class="primary-btn" data-action="profiles">إنشاء لاعب والبدء</button></div></div><div class="hero-orbit"><div class="orbit-ring"></div><div class="orbit-ring2"></div><div class="orbit-core">?</div></div></section>`;
      setHeader();
      openProfiles(true);
      return;
    }

    const stats = totalStats(p);
    const todayAvailable = p.dailyReward !== localDateKey();
    const modeCard = ([id, mode]) => {
      const ms = modeStats(id), total = puzzleBank(id).length;
      const pct = Math.round(ms.completed / Math.max(1, total) * 100);
      return `<button class="mode-card" data-action="open-mode" data-mode="${id}" style="--mode-color:${mode.color}"><div class="mode-icon">${mode.icon}</div><h3>${mode.title}</h3><p>${mode.sub}</p><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="mode-foot"><span class="mode-progress">${ms.completed} / ${total} مرحلة</span><span class="arrow-circle">←</span></div></button>`;
    };
    const trackHtml = (title, subtitle, icon, ids, cls='') => `<section class="mode-track ${cls}"><div class="track-head"><span class="track-icon">${icon}</span><div><h3>${title}</h3><p>${subtitle}</p></div></div><div class="mode-grid">${ids.filter(id => MODES[id]).map(id => modeCard([id, MODES[id]])).join('')}</div></section>`;
    const modesHtml = [
      trackHtml('المتعة وحل الألغاز','ألغاز منطقية وتفاعلية وصور وكلمات.', '🎮', ENTERTAINMENT_MODES, 'fun-track'),
      trackHtml('المعرفة والتعلّم','معلومات عامة ولغة وحساب مع تفسير الإجابة.', '📚', KNOWLEDGE_MODES, 'knowledge-track'),
      trackHtml('التدريب على القدرات','تدريب أصلي غير رسمي على المهارات اللفظية والكمية.', '🎯', APTITUDE_MODES, 'aptitude-track')
    ].join('');
    const shelfHtml = Object.entries(MODES).map(([id, mode]) => `<article class="library-card" style="--shelf:${mode.color}"><div class="library-head"><span class="library-icon">${mode.icon}</span><strong>${mode.title}</strong></div><div class="library-count">${puzzleBank(id).length}</div><small>تحديًا في الفئة الحالية</small></article>`).join('');

    mainView.innerHTML = `
      <section class="hero mega-hero"><div><div class="eyebrow">WELCOME ${escapeHtml(p.name)} • HYPER ARENA ONLINE</div><h1>تحديات بلا نهاية<br><span class="gradient-text">ومتجر وبطولات</span></h1><p>تم توسيع المكتبة إلى ${stats.total} مرحلة في الفئة الحالية، مع نظام عملات ومكافآت يومية ومتجر ثيمات وأدوات مساعدة وبطولة محلية بين اللاعبين.</p><div class="hero-actions"><button class="primary-btn" data-action="quick-start">متابعة التحدي</button><button class="secondary-btn" data-action="tournament">دخول البطولة</button><button class="secondary-btn" data-action="library">استعراض المكتبة</button></div><div class="hero-meta"><span class="hero-chip">${audienceLabel()}</span><span class="hero-chip">${timerLabel()}</span><span class="hero-chip">${stats.total} مرحلة</span><span class="hero-chip">${p.coins.toLocaleString('ar-SA')} عملة</span></div></div><div class="hero-orbit"><div class="orbit-ring"></div><div class="orbit-ring2"></div><div class="orbit-core">${p.avatar}</div></div></section>

      <section class="marquee"><div class="marquee-track"><span>🎮 متعة وألغاز</span><span>📚 معرفة عامة</span><span>🎯 قدرات لفظي</span><span>∑ قدرات كمي</span><span>🏆 بطولة محلية</span><span>◉ متجر العملات</span><span>🎮 متعة وألغاز</span><span>📚 معرفة عامة</span><span>🎯 قدرات لفظي</span><span>∑ قدرات كمي</span></div></section>

      <section class="action-grid">
        <article class="action-card hot"><div class="action-kicker">BOOK VAULT</div><h3>مكتبة الكتاب</h3><p>${puzzleBank('book').length} لغزًا مستوحى من الكتاب المرفوع ومعاد الصياغة للفئة الحالية.</p><button class="secondary-btn" data-action="open-mode" data-mode="book">فتح المخزن</button></article>
        <article class="action-card pulse"><div class="action-kicker">ARENA BATTLE</div><h3>بطولة العقول</h3><p>10 أسئلة موحدة، ونتيجة محفوظة في لوحة الصدارة المحلية.</p><button class="secondary-btn" data-action="tournament">دخول الساحة</button></article>
        <article class="action-card beam"><div class="action-kicker">REWARD DROP</div><h3>${todayAvailable ? 'مكافأة يومية جاهزة' : 'مركز المكافآت'}</h3><p>${todayAvailable ? 'لديك 100 عملة بانتظار الاستلام اليوم.' : 'راجع الإنجازات والمكافآت التي حققتها.'}</p><button class="secondary-btn" data-action="rewards">عرض المكافآت</button></article>
        <article class="action-card aptitude-action"><div class="action-kicker">APTITUDE LAB</div><h3>محاكاة القدرات</h3><p>اختبار تدريبي من 20 سؤالًا لفظيًا وكميًا مع تحليل النتيجة.</p><button class="secondary-btn" data-action="aptitude">دخول المحاكاة</button></article><article class="action-card shop-action"><div class="action-kicker">NEON MARKET</div><h3>المتجر المستقبلي</h3><p>ثيمات وصور شخصية وتلميحات وتجميد للوقت وتجاوزات.</p><button class="secondary-btn" data-action="shop">فتح المتجر</button></article>
      </section>

      <section class="stats-strip"><article class="stat-card"><div class="stat-label">إجمالي النقاط</div><div class="stat-value">${p.score.toLocaleString('ar-SA')}</div><div class="stat-note">نقطة خبرة</div></article><article class="stat-card"><div class="stat-label">عملات المتجر</div><div class="stat-value">${p.coins.toLocaleString('ar-SA')}</div><div class="stat-note">عملة متاحة</div></article><article class="stat-card"><div class="stat-label">تقدم الفئة</div><div class="stat-value">${stats.completed}<small> / ${stats.total}</small></div><div class="stat-note">${Math.round(stats.completed / Math.max(1, stats.total) * 100)}% مكتمل</div></article><article class="stat-card"><div class="stat-label">أفضل نتيجة قدرات</div><div class="stat-value">${p.aptitude.best}%</div><div class="stat-note">نسبة تدريبية غير رسمية</div></article></section>

      <section class="setup-grid"><article class="setup-card"><h3>الفئة المستهدفة</h3><p>يُحفظ التقدم بشكل مستقل للبالغين والأطفال.</p><div class="choice-row"><button class="choice-chip ${settings.audience === 'adult' ? 'active' : ''}" data-action="set-audience" data-value="adult">للبالغين</button><button class="choice-chip ${settings.audience === 'kids' ? 'active' : ''}" data-action="set-audience" data-value="kids">للأطفال</button></div></article><article class="setup-card"><h3>مهلة الإجابة</h3><p>اختر المهلة أو العب بوقت مفتوح.</p><div class="choice-row">${TIMER_OPTIONS.map(value => `<button class="choice-chip ${settings.timer === value ? 'active' : ''}" data-action="set-timer" data-value="${value}">${value === 'open' ? 'وقت مفتوح' : `${value} ثانية`}</button>`).join('')}</div></article></section>

      <div class="section-head"><div><div class="section-kicker">MEGA LIBRARY</div><h2>حجم المكتبة</h2><p>${libraryTotal} تحديًا إجماليًا عبر الفئتين.</p></div><button class="secondary-btn" data-action="library">البحث في المكتبة</button></div>
      <section class="library-grid">${shelfHtml}</section>
      <div class="section-head"><div><div class="section-kicker">LEARNING PATHS</div><h2>مسارات المكتبة</h2><p>اختر بين المتعة والمعرفة والتدريب على القدرات.</p></div></div>
      ${modesHtml}`;
    setHeader();
  }

  function renderMode(mode) {
    clearTimer();
    currentView = { name: 'mode', mode };
    const meta = MODES[mode], bank = puzzleBank(mode), ms = modeStats(mode);
    const pct = Math.round(ms.completed / Math.max(1, bank.length) * 100);
    mainView.innerHTML = `<div class="page-head"><div class="page-title-wrap"><button class="back-btn" data-action="home">→</button><div><div class="section-kicker">${meta.icon} ${audienceLabel()}</div><h1>${meta.title}</h1><p>${meta.sub}</p></div></div><div class="mode-summary"><div class="summary-line"><span>الإنجاز</span><strong>${ms.completed}/${bank.length}</strong></div><div class="summary-line"><span>المهلة</span><strong>${timerLabel()}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div></div><section class="chapter-banner"><div><span>المراحل الثلاث الأولى مفتوحة</span><strong>أكمل كل مرحلة لفتح التالية، أو استخدم تجاوزًا من المتجر.</strong></div><button class="secondary-btn compact" data-action="shop">أدوات المساعدة</button></section><section class="levels-grid">${bank.map((puzzle, index) => levelCard(mode, puzzle, index)).join('')}</section>`;
  }

  function levelCard(mode, puzzle, index) {
    const record = levelRecord(mode, index), open = isUnlocked(mode, index);
    return `<button class="level-card ${!open ? 'locked' : ''} ${record?.completed ? 'completed' : ''}" ${!open ? 'disabled' : ''} data-action="start-level" data-mode="${mode}" data-level="${index}">${!open ? '<span class="lock-badge">🔒</span>' : ''}<div class="level-number">${record?.completed ? '✓' : index + 1}</div><h3>${escapeHtml(puzzle.title || `المرحلة ${index + 1}`)}</h3><div class="level-state">${record?.completed ? starsHtml(record.stars) : open ? 'جاهزة للعب' : 'أكمل السابقة أولًا'}</div><div class="level-tags"><span class="level-tag">${puzzle.difficulty || 'متوسط'}</span>${puzzle.tag ? `<span class="level-tag">${escapeHtml(puzzle.tag)}</span>` : ''}</div></button>`;
  }

  function renderLibrary() {
    clearTimer();
    currentView = { name: 'library' };
    mainView.innerHTML = `<div class="page-head"><div class="page-title-wrap"><button class="back-btn" data-action="home">→</button><div><div class="section-kicker">SEARCHABLE ARCHIVE</div><h1>المكتبة الكاملة</h1><p>ابحث في الأسئلة والأقسام وابدأ أي مرحلة مفتوحة.</p></div></div></div><section class="library-search-panel"><input id="librarySearch" value="${escapeHtml(libraryQuery)}" placeholder="ابحث عن لغز أو كلمة..." /><div class="choice-row"><button class="choice-chip ${libraryMode === 'all' ? 'active' : ''}" data-action="library-filter" data-value="all">الكل</button>${Object.entries(MODES).map(([id, m]) => `<button class="choice-chip ${libraryMode === id ? 'active' : ''}" data-action="library-filter" data-value="${id}">${m.icon} ${m.title}</button>`).join('')}</div></section><div id="libraryResults"></div>`;
    updateLibraryResults();
    setTimeout(() => document.getElementById('librarySearch')?.focus(), 50);
  }

  function updateLibraryResults() {
    const container = document.getElementById('libraryResults');
    if (!container) return;
    const q = normalizeArabic(libraryQuery);
    const results = [];
    Object.keys(MODES).forEach(mode => {
      if (libraryMode !== 'all' && libraryMode !== mode) return;
      puzzleBank(mode).forEach((puzzle, index) => {
        const haystack = normalizeArabic(`${puzzle.q || puzzle.title || ''} ${puzzle.hint || ''} ${puzzle.tag || ''}`);
        if (!q || haystack.includes(q)) results.push({ mode, puzzle, index });
      });
    });
    container.innerHTML = `<div class="library-result-head"><strong>${results.length.toLocaleString('ar-SA')} نتيجة</strong><span>يظهر أول 120 عنصرًا</span></div><section class="catalog-grid">${results.slice(0, 120).map(({ mode, puzzle, index }) => { const open = isUnlocked(mode, index); return `<button class="catalog-card ${!open ? 'locked' : ''}" ${!open ? 'disabled' : ''} data-action="start-level" data-mode="${mode}" data-level="${index}"><span class="catalog-icon" style="--catalog:${MODES[mode].color}">${MODES[mode].icon}</span><span><strong>${escapeHtml(puzzle.title || puzzle.q || `المرحلة ${index + 1}`)}</strong><small>${MODES[mode].title} • المرحلة ${index + 1} • ${puzzle.difficulty || 'متوسط'}</small></span><span class="catalog-arrow">${open ? '←' : '🔒'}</span></button>`; }).join('')}</section>`;
  }

  function quickStart() {
    for (const mode of Object.keys(MODES)) {
      for (let i = 0; i < puzzleBank(mode).length; i++) {
        if (isUnlocked(mode, i) && !levelRecord(mode, i)?.completed) return startLevel(mode, i);
      }
    }
    startLevel('book', 0);
  }

  function startLevel(mode, index, tournamentContext = null, aptitudeContext = null) {
    clearTimer();
    const puzzle = tournamentContext?.puzzle || aptitudeContext?.puzzle || puzzleBank(mode)[index];
    const maxTime = tournamentContext ? 30 : aptitudeContext ? 60 : timerValue();
    game = {
      mode, index, puzzle, tournament: tournamentContext, aptitude: aptitudeContext,
      timeLeft: maxTime, maxTime, attempts: 0, answered: false, hintUsed: false,
      revealCount: mode === 'hidden' ? 3 : 0, tileReveals: 0, overtime: false,
      scrambleGuess: [], scrambleUsed: [], crossInputs: {}, frozen: false
    };
    if (puzzle.type === 'scramble') setupScramble();
    if (puzzle.type === 'cross') puzzle.slots.forEach(slot => game.crossInputs[slot.id] = '');
    currentView = { name: 'game', mode, index };
    renderGame();
    if (Number.isFinite(maxTime)) timerId = setInterval(tickTimer, 1000);
  }

  function setupScramble() {
    const chars = [...game.puzzle.word.replace(/\s/g, '')];
    const seed = game.index + chars.length * 17 + (settings.audience === 'adult' ? 53 : 7);
    game.scrambleLetters = seededShuffle(chars, seed);
    game.scrambleUsed = Array(chars.length).fill(false);
  }

  function seededShuffle(array, seed) {
    const result = [...array];
    let x = seed || 1;
    for (let i = result.length - 1; i > 0; i--) {
      x = (x * 9301 + 49297) % 233280;
      const j = Math.floor((x / 233280) * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function renderGame() {
    const { puzzle, mode } = game;
    const meta = MODES[mode];
    const p = profile();
    const timerText = Number.isFinite(game.timeLeft) ? `${game.timeLeft} ثانية` : '∞ مفتوح';
    const pct = Number.isFinite(game.timeLeft) ? Math.max(0, game.timeLeft / Math.max(1, game.maxTime) * 100) : 100;
    const stageText = game.tournament ? `الجولة ${game.tournament.round + 1} من ${game.tournament.total}` : game.aptitude ? `السؤال ${game.aptitude.round + 1} من ${game.aptitude.total}` : `المرحلة ${game.index + 1} من ${puzzleBank(mode).length}`;
    mainView.innerHTML = `<div class="page-head"><div class="page-title-wrap"><button class="back-btn" data-action="exit-game">→</button><div><div class="section-kicker">${game.tournament ? '🏆 بطولة العقول' : game.aptitude ? '🎯 محاكاة القدرات' : `${meta.icon} ${meta.title}`}</div><h1>${escapeHtml(puzzle.title || (game.tournament ? `الجولة ${game.tournament.round + 1}` : game.aptitude ? `السؤال ${game.aptitude.round + 1}` : `المرحلة ${game.index + 1}`))}</h1></div></div><div class="quick-row"><span class="setup-pill">${audienceLabel()}</span><span class="setup-pill">${game.tournament ? '30 ثانية ثابتة' : game.aptitude ? '60 ثانية لكل سؤال' : timerLabel()}</span></div></div><section class="game-layout"><article class="game-card"><div class="game-top"><span class="stage-pill">${stageText}</span><span class="difficulty-pill">${puzzle.difficulty || 'متوسط'}</span></div><div class="timer-wrap"><div class="timer-line"><span>الوقت المتبقي</span><strong id="timerText">${timerText}</strong></div><div class="timer-track"><div id="timerBar" class="timer-bar" style="width:${pct}%"></div></div></div><div class="question-area"><div class="question-label">${questionLabel(puzzle.type, mode)}</div>${puzzle.context ? `<div class="reading-passage">${escapeHtml(puzzle.context)}</div>` : ''}<h2>${escapeHtml(puzzle.q || puzzle.title)}</h2>${renderPuzzleBody()}<div id="feedback" class="feedback-banner"></div><div id="hintBox" class="hint-box">${escapeHtml(puzzle.hint || '')}</div></div></article><aside class="game-sidebar"><section class="side-card"><h3>لوحة اللاعب</h3><div class="score-big">${p.score.toLocaleString('ar-SA')} <small>نقطة</small></div><div class="info-list" style="margin-top:16px"><div class="info-row"><span>العملات</span><strong>◉ ${p.coins.toLocaleString('ar-SA')}</strong></div><div class="info-row"><span>المحاولات</span><strong id="attemptCount">${game.attempts}</strong></div><div class="info-row"><span>التتابع</span><strong>× ${p.streak}</strong></div>${game.tournament ? `<div class="info-row"><span>نقاط البطولة</span><strong>${game.tournament.score.toLocaleString('ar-SA')}</strong></div>` : game.aptitude ? `<div class="info-row"><span>الصحيح</span><strong>${game.aptitude.correct}/${game.aptitude.total}</strong></div>` : ''}</div></section>${game.aptitude ? `<section class="side-card exam-rules"><h3>قواعد المحاكاة</h3><p>محاولة واحدة لكل سؤال، دون تلميحات أو تجاوزات. النتيجة تدريبية وليست درجة رسمية.</p></section>` : `<section class="side-card"><h3>أدوات المساعدة</h3><button id="hintBtn" class="tool-btn" data-action="use-hint" ${p.inventory.hints <= 0 ? 'disabled' : ''}>💡 تلميح (${p.inventory.hints})</button><button class="tool-btn" data-action="freeze-time" ${!Number.isFinite(game.timeLeft) || p.inventory.freezes <= 0 ? 'disabled' : ''}>❄ تجميد +15ث (${p.inventory.freezes})</button><button class="tool-btn" data-action="skip-level" ${p.inventory.skips <= 0 ? 'disabled' : ''}>↪ تجاوز (${p.inventory.skips})</button>${mode === 'hidden' ? '<button id="revealBtn" class="tool-btn" data-action="reveal-tile">◫ كشف جزء</button>' : ''}</section>`}<section class="side-card"><h3>مفتاح النجوم</h3><div class="info-list"><div class="info-row"><span>دون خطأ أو مساعدة</span><strong>★★★</strong></div><div class="info-row"><span>خطأ أو مساعدة واحدة</span><strong>★★</strong></div><div class="info-row"><span>أكثر</span><strong>★</strong></div></div></section></aside></section>`;
  }

  function questionLabel(type, mode) {
    if (type === 'scramble') return 'رتّب الحروف';
    if (type === 'cross') return 'حل شبكة الكلمات';
    if (type === 'hidden' || mode === 'hidden') return 'اكتشف الصورة';
    if (mode === 'visual') return 'حلّل النمط';
    return 'فكّر ثم اختر';
  }

  function renderPuzzleBody() {
    const p = game.puzzle;
    if (p.type === 'scramble') return renderScramble();
    if (p.type === 'cross') return renderCrossword();
    let visual = '';
    if (p.type === 'hidden') visual = `<div class="visual-stage"><div id="hiddenBox" class="hidden-box"><div class="hidden-emoji">${p.emoji}</div><div class="cover-grid">${Array.from({length:12}, (_, i) => `<span class="tile ${i < game.revealCount ? 'open' : ''}"></span>`).join('')}</div></div></div>`;
    return `${visual}<div class="answers-grid">${p.options.map((option, index) => `<button class="answer-btn" data-action="answer" data-index="${index}"><span class="answer-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span></button>`).join('')}</div>`;
  }

  function renderScramble() {
    const wordLength = [...game.puzzle.word.replace(/\s/g, '')].length;
    return `<div class="scramble-stage"><div class="scramble-clue">${escapeHtml(game.puzzle.hint)}</div><div class="guess-slots">${Array.from({length:wordLength}, (_, i) => `<span>${game.scrambleGuess[i] || ''}</span>`).join('')}</div><div class="letter-pool">${game.scrambleLetters.map((letter, index) => `<button class="letter-chip ${game.scrambleUsed[index] ? 'used' : ''}" ${game.scrambleUsed[index] ? 'disabled' : ''} data-action="scramble-letter" data-index="${index}">${letter}</button>`).join('')}</div><div class="scramble-actions"><button class="secondary-btn compact" data-action="scramble-back">حذف حرف</button><button class="secondary-btn compact" data-action="scramble-clear">مسح</button><button class="primary-btn compact" data-action="check-scramble">تحقق</button></div></div>`;
  }

  function buildCrossGrid() {
    const p = game.puzzle;
    const grid = Array.from({ length: p.size }, () => Array.from({ length: p.size }, () => ({ block: true, number: '', refs: [] })));
    let number = 1;
    p.slots.forEach(slot => {
      if (!grid[slot.r]?.[slot.c]) return;
      if (!grid[slot.r][slot.c].number) grid[slot.r][slot.c].number = number++;
      [...slot.ans].forEach((_, i) => {
        const r = slot.dir === 'd' ? slot.r + i : slot.r;
        const c = slot.dir === 'a' ? slot.c + i : slot.c;
        if (grid[r]?.[c]) { grid[r][c].block = false; grid[r][c].refs.push({ id: slot.id, i }); }
      });
    });
    return grid;
  }

  function renderCrossword() {
    const p = game.puzzle, grid = buildCrossGrid();
    const cellHtml = grid.flatMap(row => row.map(cell => {
      if (cell.block) return '<div class="cell block"></div>';
      let letter = '';
      for (const ref of cell.refs) {
        const value = [...normalizeArabic(game.crossInputs[ref.id] || '')];
        if (value[ref.i]) { letter = value[ref.i]; break; }
      }
      return `<div class="cell"><span class="num">${cell.number || ''}</span><span class="letter">${letter}</span></div>`;
    })).join('');
    const clues = dir => p.slots.filter(s => s.dir === dir).map(s => `<div class="clue"><span class="id">${s.id}</span><span>${escapeHtml(s.clue)}</span></div>`).join('');
    return `<div class="cross-wrap"><div class="cross-board"><div class="cross-grid" style="grid-template-columns:repeat(${p.size},40px)">${cellHtml}</div></div><div class="cross-panel"><div class="clue-box"><h4>أفقي</h4><div class="clues">${clues('a')}</div></div><div class="clue-box"><h4>رأسي</h4><div class="clues">${clues('d')}</div></div><div class="entry-box"><h4>إدخال الكلمات</h4><div class="word-list">${p.slots.map(s => `<div class="word-row" id="row_${s.id}"><span class="id">${s.id}</span><input data-cross-slot="${s.id}" value="${escapeHtml(game.crossInputs[s.id] || '')}" placeholder="اكتب الكلمة..." /><span>${[...s.ans].length} حروف</span></div>`).join('')}</div><div class="entry-actions"><button class="primary-btn compact" data-action="check-cross">تحقق</button><button class="secondary-btn compact" data-action="clear-cross">مسح</button></div></div></div></div>`;
  }

  function tickTimer() {
    if (!game || game.answered || !Number.isFinite(game.timeLeft)) return clearTimer();
    game.timeLeft--;
    const text = document.getElementById('timerText'), bar = document.getElementById('timerBar');
    if (text) text.textContent = `${game.timeLeft} ثانية`;
    if (bar) bar.style.width = `${Math.max(0, game.timeLeft / Math.max(1, game.maxTime) * 100)}%`;
    if (game.timeLeft <= 0) handleTimeout();
  }

  function handleTimeout() {
    clearTimer();
    if (game.tournament) return tournamentWrong('انتهى الوقت.');
    if (game.aptitude) return aptitudeWrong('انتهى الوقت.');
    game.attempts++;
    updateAttempts();
    if (!game.overtime) {
      game.overtime = true; game.timeLeft = 12; game.maxTime = 12;
      showFeedback(false, 'انتهى الوقت الأساسي. حصلت على 12 ثانية إضافية، وستكون النتيجة القصوى نجمة واحدة.');
      timerId = setInterval(tickTimer, 1000);
    } else {
      game.timeLeft = 0;
      showFeedback(false, 'انتهى الوقت الإضافي. يمكنك الاستمرار في التفكير دون مؤقت.');
    }
    tone('wrong');
  }

  function answer(index) {
    if (!game || game.answered || game.puzzle.type !== 'mc' && game.puzzle.type !== 'hidden') return;
    game.attempts++;
    updateAttempts();
    const buttons = [...document.querySelectorAll('.answer-btn')];
    const selected = buttons[index];
    if (index === game.puzzle.answer) {
      game.answered = true;
      clearTimer();
      buttons.forEach(b => b.disabled = true);
      selected?.classList.add('correct');
      document.getElementById('hiddenBox')?.classList.add('revealed');
      showFeedback(true, `إجابة صحيحة! ${game.puzzle.explain}`);
      tone('success');
      if (game.tournament) setTimeout(() => tournamentCorrect(), 650);
      else if (game.aptitude) setTimeout(() => aptitudeCorrect(), 650);
      else setTimeout(() => completeLevel(), 750);
    } else {
      if (game.aptitude) return aptitudeWrong('إجابة غير صحيحة.');
      selected?.classList.add('wrong');
      selected.disabled = true;
      profile().streak = 0;
      saveAll();
      if (game.tournament) return tournamentWrong('إجابة غير صحيحة.');
      if (game.mode === 'hidden') revealTile(false);
      showFeedback(false, 'ليست الإجابة الصحيحة. حاول مجددًا.');
      tone('wrong');
    }
  }

  function scrambleLetter(index) {
    if (game?.puzzle.type !== 'scramble' || game.scrambleUsed[index]) return;
    game.scrambleUsed[index] = true;
    game.scrambleGuess.push(game.scrambleLetters[index]);
    rerenderPuzzleBody();
  }

  function scrambleBack() {
    if (!game?.scrambleGuess?.length) return;
    const removed = game.scrambleGuess.pop();
    for (let i = game.scrambleUsed.length - 1; i >= 0; i--) {
      if (game.scrambleUsed[i] && game.scrambleLetters[i] === removed) { game.scrambleUsed[i] = false; break; }
    }
    rerenderPuzzleBody();
  }

  function scrambleClear() {
    if (!game) return;
    game.scrambleGuess = [];
    game.scrambleUsed.fill(false);
    rerenderPuzzleBody();
  }

  function checkScramble() {
    if (!game || game.answered || game.puzzle.type !== 'scramble') return;
    game.attempts++;
    updateAttempts();
    if (normalizeArabic(game.scrambleGuess.join('')) === normalizeArabic(game.puzzle.word)) {
      game.answered = true; clearTimer(); showFeedback(true, game.puzzle.explain); tone('success'); setTimeout(completeLevel, 650);
    } else {
      profile().streak = 0; saveAll(); showFeedback(false, 'الترتيب غير صحيح. جرّب ترتيبًا آخر.'); tone('wrong');
    }
  }

  function checkCross() {
    if (!game || game.answered || game.puzzle.type !== 'cross') return;
    game.attempts++;
    updateAttempts();
    let correct = true;
    game.puzzle.slots.forEach(slot => {
      const row = document.getElementById(`row_${slot.id}`);
      row?.classList.remove('correct', 'wrong');
      if (normalizeArabic(game.crossInputs[slot.id]) === normalizeArabic(slot.ans)) row?.classList.add('correct');
      else { row?.classList.add('wrong'); correct = false; }
    });
    if (correct) {
      game.answered = true; clearTimer(); showFeedback(true, 'تم حل جميع كلمات الشبكة بنجاح.'); tone('success'); setTimeout(completeLevel, 650);
    } else {
      profile().streak = 0; saveAll(); showFeedback(false, 'بعض الكلمات ناقصة أو غير صحيحة.'); tone('wrong');
    }
  }

  function clearCross() {
    Object.keys(game.crossInputs).forEach(key => game.crossInputs[key] = '');
    rerenderPuzzleBody();
  }

  function rerenderPuzzleBody() {
    const questionArea = document.querySelector('.question-area');
    if (!questionArea) return;
    const old = questionArea.querySelector('.scramble-stage, .cross-wrap');
    if (!old) return;
    const temp = document.createElement('div');
    temp.innerHTML = game.puzzle.type === 'scramble' ? renderScramble() : renderCrossword();
    old.replaceWith(temp.firstElementChild);
  }

  function useHint() {
    const p = profile();
    if (!game || game.answered || game.hintUsed || p.inventory.hints <= 0) return;
    p.inventory.hints--;
    p.stats.hintsUsed++;
    game.hintUsed = true;
    if (game.puzzle.type === 'scramble') {
      scrambleClear();
      const first = [...game.puzzle.word.replace(/\s/g, '')][0];
      const idx = game.scrambleLetters.findIndex((letter, i) => letter === first && !game.scrambleUsed[i]);
      if (idx >= 0) { game.scrambleUsed[idx] = true; game.scrambleGuess.push(first); rerenderPuzzleBody(); }
      showFeedback(false, `تم تثبيت الحرف الأول: ${first}`);
    } else if (game.puzzle.type === 'cross') {
      const wrong = game.puzzle.slots.filter(s => normalizeArabic(game.crossInputs[s.id]) !== normalizeArabic(s.ans));
      if (wrong.length) { const slot = wrong[0]; game.crossInputs[slot.id] = slot.ans; rerenderPuzzleBody(); showFeedback(false, `تم كشف الكلمة ${slot.id}.`); }
    } else {
      document.getElementById('hintBox')?.classList.add('show');
      if (game.mode === 'hidden') { document.getElementById('hiddenBox')?.classList.add('hinted'); revealTile(false); revealTile(false); }
    }
    saveAll(); setHeader();
    const btn = document.getElementById('hintBtn'); if (btn) { btn.disabled = true; btn.textContent = `✓ استُخدم التلميح (${p.inventory.hints})`; }
    tone('hint');
  }

  function freezeTime() {
    const p = profile();
    if (!game || game.answered || !Number.isFinite(game.timeLeft) || p.inventory.freezes <= 0) return;
    p.inventory.freezes--;
    game.timeLeft += 15;
    game.maxTime += 15;
    saveAll(); setHeader();
    document.getElementById('timerText').textContent = `${game.timeLeft} ثانية`;
    showFeedback(true, 'تم تجميد الزمن وإضافة 15 ثانية.');
    tone('hint');
    renderGame();
    clearTimer(); timerId = setInterval(tickTimer, 1000);
  }

  async function skipLevel() {
    const p = profile();
    if (!game || game.answered || p.inventory.skips <= 0) return;
    const ok = await requestConfirm('تجاوز المرحلة', 'سيتم استهلاك تجاوز واحد وتسجيل المرحلة بنجمة واحدة دون نقاط.');
    if (!ok) return;
    p.inventory.skips--;
    saveAll(); setHeader();
    if (game.tournament) return tournamentWrong('تم تجاوز الجولة.');
    game.answered = true;
    completeLevel({ forcedStars: 1, forcedScore: 0, forcedCoins: 0 });
  }

  function revealTile(withPenalty = true) {
    if (!game || game.mode !== 'hidden' || game.answered) return;
    const tiles = [...document.querySelectorAll('.tile:not(.open)')];
    if (!tiles.length) return;
    tiles[Math.floor(Math.random() * tiles.length)].classList.add('open');
    game.revealCount++;
    if (withPenalty) game.tileReveals++;
    if (game.revealCount >= 10) document.getElementById('revealBtn')?.setAttribute('disabled', 'disabled');
  }

  function calculateStars() {
    if (game.overtime) return 1;
    const help = game.hintUsed || game.tileReveals > 0;
    if (game.attempts <= 1 && !help && (!Number.isFinite(game.maxTime) || game.timeLeft > game.maxTime * .35)) return 3;
    if (game.attempts <= 2) return 2;
    return 1;
  }

  function difficultyBonus(difficulty) { return difficulty === 'خبير' ? 40 : difficulty === 'صعب' ? 25 : difficulty === 'متوسط' ? 12 : 5; }

  function completeLevel(overrides = {}) {
    const p = profile();
    const stars = overrides.forcedStars ?? calculateStars();
    const baseScore = 110 + game.index * 3 + difficultyBonus(game.puzzle.difficulty);
    const timeBonus = Number.isFinite(game.timeLeft) ? Math.max(0, game.timeLeft * 2) : 25;
    const score = overrides.forcedScore ?? Math.max(25, baseScore + timeBonus - (game.hintUsed ? 35 : 0) - game.tileReveals * 10 - Math.max(0, game.attempts - 1) * 20);
    const coins = overrides.forcedCoins ?? (8 + stars * 7 + Math.round(difficultyBonus(game.puzzle.difficulty) / 3));
    p.levels[levelKey(game.mode)] ??= {};
    const old = p.levels[levelKey(game.mode)][game.index] || { stars: 0, score: 0 };
    const scoreDelta = Math.max(0, score - (old.score || 0));
    const coinDelta = old.completed ? 0 : coins;
    p.levels[levelKey(game.mode)][game.index] = { completed: true, stars: Math.max(stars, old.stars || 0), score: Math.max(score, old.score || 0), completedAt: Date.now() };
    p.score += scoreDelta;
    p.coins += coinDelta;
    p.streak++;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    p.stats.answered++;
    p.stats.correct++;
    saveAll(); setHeader(); clearTimer();
    const nextExists = game.index + 1 < puzzleBank(game.mode).length;
    const overlay = document.createElement('div');
    overlay.className = 'result-overlay';
    overlay.innerHTML = `<div class="result-card"><div class="result-icon">${stars === 3 ? '♛' : stars === 2 ? '✦' : '✓'}</div><div class="eyebrow">STAGE COMPLETED</div><h2>${stars === 3 ? 'إتقان مذهل!' : stars === 2 ? 'أداء قوي!' : 'تم الاجتياز'}</h2><p>${escapeHtml(game.puzzle.explain || 'تم حل التحدي بنجاح.')}</p><div class="result-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><div class="result-stats"><div class="result-stat"><strong>+${scoreDelta}</strong><small>نقطة</small></div><div class="result-stat"><strong>+${coinDelta}</strong><small>عملة</small></div><div class="result-stat"><strong>${game.attempts}</strong><small>محاولة</small></div></div><div class="result-actions"><button class="secondary-btn" data-action="back-levels">المراحل</button>${nextExists ? '<button class="primary-btn" data-action="next-level">المرحلة التالية</button>' : '<button class="primary-btn" data-action="home">الرئيسية</button>'}</div></div>`;
    document.querySelector('.game-card')?.appendChild(overlay);
  }

  function renderShop() {
    clearTimer(); currentView = { name: 'shop' };
    const p = profile();
    const themeCards = THEMES.map(item => shopItem(item, 'theme')).join('');
    const avatarCards = AVATARS.map(item => shopItem(item, 'avatar')).join('');
    const boosterCards = BOOSTERS.map(item => `<article class="shop-card"><div class="shop-icon">${item.icon}</div><h3>${item.title}</h3><p>${item.desc}</p><div class="shop-foot"><strong>◉ ${item.price}</strong><button class="primary-btn compact" data-action="buy-booster" data-id="${item.id}">شراء</button></div></article>`).join('');
    mainView.innerHTML = `<div class="page-head"><div class="page-title-wrap"><button class="back-btn" data-action="home">→</button><div><div class="section-kicker">NEON MARKET</div><h1>المتجر المستقبلي</h1><p>رصيدك الحالي: ◉ ${p.coins.toLocaleString('ar-SA')}</p></div></div></div><div class="section-head"><div><h2>ثيمات الواجهة</h2><p>اشترِ الثيم ثم فعّله.</p></div></div><section class="shop-grid">${themeCards}</section><div class="section-head"><div><h2>الصور الشخصية</h2></div></div><section class="shop-grid">${avatarCards}</section><div class="section-head"><div><h2>أدوات المساعدة</h2><p>العناصر القابلة للاستهلاك أثناء اللعب.</p></div></div><section class="shop-grid">${boosterCards}</section>`;
  }

  function shopItem(item, kind) {
    const p = profile();
    const owned = kind === 'theme' ? p.inventory.themes.includes(item.id) : p.inventory.avatars.includes(item.id);
    const equipped = kind === 'theme' ? p.theme === item.id : p.avatar === item.id;
    const action = owned ? (kind === 'theme' ? 'equip-theme' : 'equip-avatar') : (kind === 'theme' ? 'buy-theme' : 'buy-avatar');
    return `<article class="shop-card ${equipped ? 'equipped' : ''}"><div class="shop-icon">${item.icon || item.id}</div><h3>${item.title}</h3><p>${equipped ? 'مفعّل حاليًا' : owned ? 'مملوك وجاهز للتفعيل' : 'عنصر دائم في حساب اللاعب'}</p><div class="shop-foot"><strong>${owned ? 'مملوك' : `◉ ${item.price}`}</strong><button class="${owned ? 'secondary-btn' : 'primary-btn'} compact" data-action="${action}" data-id="${item.id}" ${equipped ? 'disabled' : ''}>${equipped ? 'مفعّل' : owned ? 'تفعيل' : 'شراء'}</button></div></article>`;
  }

  function purchasePermanent(kind, id) {
    const p = profile();
    const list = kind === 'theme' ? THEMES : AVATARS;
    const item = list.find(x => x.id === id);
    if (!item) return;
    const owned = kind === 'theme' ? p.inventory.themes : p.inventory.avatars;
    if (owned.includes(id)) return equip(kind, id);
    if (p.coins < item.price) return showToast('لا توجد عملات كافية');
    p.coins -= item.price; owned.push(id); equip(kind, id, false); saveAll(); setHeader(); renderShop(); tone('success');
  }

  function equip(kind, id, rerender = true) {
    const p = profile();
    if (kind === 'theme' && p.inventory.themes.includes(id)) p.theme = id;
    if (kind === 'avatar' && p.inventory.avatars.includes(id)) p.avatar = id;
    saveAll(); setHeader(); if (rerender) renderShop();
  }

  function buyBooster(id) {
    const p = profile();
    const item = BOOSTERS.find(x => x.id === id);
    if (!item) return;
    if (p.coins < item.price) return showToast('لا توجد عملات كافية');
    p.coins -= item.price;
    p.inventory[id] += item.amount;
    saveAll(); setHeader(); renderShop(); tone('success'); showToast(`تم شراء ${item.title}`);
  }

  function renderRewards() {
    clearTimer(); currentView = { name: 'rewards' };
    const p = profile(), stats = totalStats(p), canDaily = p.dailyReward !== localDateKey();
    const achievementCards = ACHIEVEMENTS.map(a => {
      const achieved = a.test(stats), claimed = p.claimedAchievements.includes(a.id);
      return `<article class="reward-card ${achieved ? 'ready' : ''} ${claimed ? 'claimed' : ''}"><div class="reward-icon">${a.icon}</div><div><h3>${a.title}</h3><p>${a.desc}</p></div><div class="reward-value">◉ ${a.coins}</div><button class="${achieved && !claimed ? 'primary-btn' : 'secondary-btn'} compact" data-action="claim-achievement" data-id="${a.id}" ${!achieved || claimed ? 'disabled' : ''}>${claimed ? 'تم الاستلام' : achieved ? 'استلام' : 'غير مكتمل'}</button></article>`;
    }).join('');
    mainView.innerHTML = `<div class="page-head"><div class="page-title-wrap"><button class="back-btn" data-action="home">→</button><div><div class="section-kicker">REWARD CENTER</div><h1>المكافآت والإنجازات</h1><p>حوّل تقدمك إلى عملات وعناصر داخل اللعبة.</p></div></div></div><section class="daily-card ${canDaily ? 'ready' : ''}"><div><div class="eyebrow">DAILY DROP</div><h2>${canDaily ? 'مكافأتك اليومية جاهزة' : 'تم استلام مكافأة اليوم'}</h2><p>${canDaily ? 'استلم 100 عملة الآن.' : 'عُد غدًا للحصول على مكافأة جديدة.'}</p></div><div class="daily-coin">◉ 100</div><button class="primary-btn" data-action="claim-daily" ${canDaily ? '' : 'disabled'}>${canDaily ? 'استلام المكافأة' : 'تم الاستلام'}</button></section><div class="section-head"><div><h2>الإنجازات</h2><p>كل إنجاز يُستلم مرة واحدة.</p></div></div><section class="rewards-grid">${achievementCards}</section>`;
  }

  function claimDaily() {
    const p = profile();
    if (p.dailyReward === localDateKey()) return;
    p.dailyReward = localDateKey(); p.coins += 100; saveAll(); setHeader(); renderRewards(); tone('success'); showToast('تمت إضافة 100 عملة');
  }

  function claimAchievement(id) {
    const p = profile(), stats = totalStats(p), item = ACHIEVEMENTS.find(a => a.id === id);
    if (!item || p.claimedAchievements.includes(id) || !item.test(stats)) return;
    p.claimedAchievements.push(id); p.coins += item.coins; saveAll(); setHeader(); renderRewards(); tone('success');
  }


  function renderAptitude() {
    clearTimer(); currentView = { name: 'aptitude' };
    const p = profile();
    const adult = settings.audience === 'adult';
    const count = adult ? 20 : 12;
    mainView.innerHTML = `<div class="page-head"><div class="page-title-wrap"><button class="back-btn" data-action="home">→</button><div><div class="section-kicker">APTITUDE TRAINING LAB</div><h1>محاكاة القدرات العامة</h1><p>تدريب أصلي غير رسمي على الاستدلال اللفظي والكمي لطلاب المرحلة الثانوية.</p></div></div></div>
      <section class="aptitude-hero"><div class="aptitude-core">🎯</div><div><div class="eyebrow">VERBAL + QUANTITATIVE</div><h2>${adult ? 'اختبار تدريبي متوازن' : 'تهيئة مبسطة للقدرات'}</h2><p>${count} سؤالًا؛ نصفها لفظي ونصفها كمي، بمهلة 60 ثانية لكل سؤال. تحصل في النهاية على نسبة تدريبية وتحليل مستقل للقسمين.</p><div class="aptitude-actions"><button class="primary-btn" data-action="start-aptitude">بدء المحاكاة</button><button class="secondary-btn" data-action="open-mode" data-mode="qudurat_verbal">تدريب لفظي</button><button class="secondary-btn" data-action="open-mode" data-mode="qudurat_quant">تدريب كمي</button></div></div></section>
      <section class="aptitude-stats"><article><span>أفضل نتيجة</span><strong>${p.aptitude.best}%</strong></article><article><span>آخر نتيجة</span><strong>${p.aptitude.last}%</strong></article><article><span>اللفظي</span><strong>${p.aptitude.verbal}%</strong></article><article><span>الكمي</span><strong>${p.aptitude.quant}%</strong></article><article><span>المحاولات</span><strong>${p.aptitude.attempts}</strong></article></section>
      <section class="aptitude-disclaimer"><strong>تنبيه:</strong> هذه محاكاة تدريبية من إعداد المنصة، وليست اختبارًا رسميًا ولا تحتوي أسئلة مسرّبة، ولا تمثل الدرجة المعيارية الصادرة من هيئة تقويم التعليم والتدريب.</section>
      <div class="section-head"><div><h2>ماذا يقيس التدريب؟</h2><p>الفهم والتحليل والاستدلال والتطبيق وحل المشكلات.</p></div></div>
      <section class="aptitude-skill-grid"><article><span>ل</span><h3>القدرات اللفظية</h3><p>التناظر اللفظي، إكمال الجمل، المفردات، الخطأ السياقي، والاستيعاب المقروء.</p></article><article><span>ك</span><h3>القدرات الكمية</h3><p>النسب المئوية، التناسب، المتوسط، الجبر، الهندسة، المتتاليات والمسائل التطبيقية.</p></article></section>`;
  }

  function aptitudeQueue() {
    const perSection = settings.audience === 'adult' ? 10 : 6;
    const dateSeed = [...`${localDateKey()}_${settings.audience}_${profile().aptitude.attempts}`].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const verbal = seededShuffle(puzzleBank('qudurat_verbal').map((puzzle,index)=>({mode:'qudurat_verbal',index,puzzle,section:'verbal'})), dateSeed).slice(0, perSection);
    const quant = seededShuffle(puzzleBank('qudurat_quant').map((puzzle,index)=>({mode:'qudurat_quant',index,puzzle,section:'quant'})), dateSeed + 991).slice(0, perSection);
    return seededShuffle([...verbal, ...quant], dateSeed + 313);
  }

  function startAptitude() {
    const queue = aptitudeQueue();
    const first = queue[0];
    const context = { kind:'aptitude', queue, round:0, total:queue.length, correct:0, verbalCorrect:0, quantCorrect:0, verbalTotal:queue.filter(x=>x.section==='verbal').length, quantTotal:queue.filter(x=>x.section==='quant').length };
    startLevel(first.mode, first.index, null, { ...context, puzzle:first.puzzle, section:first.section });
  }

  function aptitudeCorrect() {
    const a = game.aptitude;
    a.correct++;
    if (a.section === 'verbal') a.verbalCorrect++; else a.quantCorrect++;
    advanceAptitude(a);
  }

  function aptitudeWrong(message) {
    if (!game || game.answered) return;
    game.answered = true; clearTimer();
    document.querySelectorAll('.answer-btn').forEach((b, i) => { b.disabled = true; if (i === game.puzzle.answer) b.classList.add('correct'); });
    showFeedback(false, `${message} الإجابة الصحيحة: ${game.puzzle.options?.[game.puzzle.answer] || ''}`);
    tone('wrong');
    setTimeout(() => advanceAptitude(game.aptitude), 900);
  }

  function advanceAptitude(a) {
    const nextRound = a.round + 1;
    if (nextRound >= a.total) return finishAptitude(a);
    const next = a.queue[nextRound];
    startLevel(next.mode, next.index, null, { ...a, round:nextRound, puzzle:next.puzzle, section:next.section });
  }

  function finishAptitude(a) {
    clearTimer();
    const p = profile();
    const score = Math.round(a.correct / Math.max(1,a.total) * 100);
    const verbal = Math.round(a.verbalCorrect / Math.max(1,a.verbalTotal) * 100);
    const quant = Math.round(a.quantCorrect / Math.max(1,a.quantTotal) * 100);
    p.aptitude.attempts++;
    p.aptitude.last = score;
    p.aptitude.best = Math.max(p.aptitude.best, score);
    p.aptitude.verbal = verbal;
    p.aptitude.quant = quant;
    const reward = 25 + a.correct * 3;
    p.coins += reward;
    saveAll(); setHeader(); currentView = { name:'aptitude-result' };
    const band = score >= 90 ? 'ممتاز جدًا' : score >= 80 ? 'متقدم' : score >= 70 ? 'جيد' : score >= 60 ? 'متوسط' : 'يحتاج تدريبًا إضافيًا';
    mainView.innerHTML = `<section class="aptitude-result"><div class="score-ring"><strong>${score}%</strong><span>نسبة تدريبية</span></div><div class="eyebrow">APTITUDE SIMULATION COMPLETED</div><h1>${band}</h1><p>أجبت عن ${a.correct} من ${a.total} سؤالًا. هذه النتيجة للتدريب داخل المنصة وليست درجة قياس رسمية.</p><div class="result-stats"><div class="result-stat"><strong>${verbal}%</strong><small>لفظي</small></div><div class="result-stat"><strong>${quant}%</strong><small>كمي</small></div><div class="result-stat"><strong>+${reward}</strong><small>عملة</small></div></div><div class="result-actions"><button class="secondary-btn" data-action="aptitude">لوحة القدرات</button><button class="primary-btn" data-action="start-aptitude">محاولة جديدة</button></div></section>`;
  }

  function renderTournament() {
    clearTimer(); currentView = { name: 'tournament' };
    const leaderboard = Object.values(profiles).sort((a,b) => (b.tournament?.best || 0) - (a.tournament?.best || 0));
    mainView.innerHTML = `<div class="page-head"><div class="page-title-wrap"><button class="back-btn" data-action="home">→</button><div><div class="section-kicker">LOCAL MIND ARENA</div><h1>بطولة العقول</h1><p>10 أسئلة بمهلة 30 ثانية لكل سؤال، ونفس تحدي اليوم لجميع اللاعبين.</p></div></div></div><section class="tournament-hero"><div class="trophy-core">🏆</div><div><div class="eyebrow">DAILY SEED • ${localDateKey()}</div><h2>هل تستطيع تصدر القائمة؟</h2><p>إجابة صحيحة: 100 نقطة، مع مكافأة سرعة تصل إلى 150 نقطة.</p><button class="primary-btn" data-action="start-tournament">بدء البطولة</button></div></section><div class="section-head"><div><h2>لوحة الصدارة</h2><p>أفضل نتيجة محفوظة لكل لاعب.</p></div></div><section class="leaderboard">${leaderboard.map((p, i) => `<article class="leader-row ${p.id === activeId ? 'active' : ''}"><span class="rank">${i + 1}</span><span class="avatar">${p.avatar}</span><span class="leader-name"><strong>${escapeHtml(p.name)}</strong><small>${p.tournament.played || 0} مشاركة</small></span><strong>${(p.tournament.best || 0).toLocaleString('ar-SA')}</strong></article>`).join('')}</section>`;
  }

  function tournamentQueue() {
    const pool = [];
    ELIGIBLE_TOURNAMENT_MODES.forEach(mode => puzzleBank(mode).forEach((puzzle, index) => { if (puzzle.type === 'mc' || puzzle.type === 'hidden') pool.push({ mode, index, puzzle }); }));
    const seedText = `${localDateKey()}_${settings.audience}`;
    let seed = [...seedText].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return seededShuffle(pool, seed).slice(0, 10);
  }

  function startTournament() {
    const queue = tournamentQueue();
    const context = { queue, round: 0, total: queue.length, score: 0, correct: 0 };
    const first = queue[0];
    startLevel(first.mode, first.index, { ...context, puzzle: first.puzzle });
  }

  function tournamentCorrect() {
    const t = game.tournament;
    t.score += 100 + Math.max(0, game.timeLeft * 5);
    t.correct++;
    advanceTournament(t);
  }

  function tournamentWrong(message) {
    if (!game || game.answered) return;
    game.answered = true; clearTimer();
    document.querySelectorAll('.answer-btn').forEach((b, i) => { b.disabled = true; if (i === game.puzzle.answer) b.classList.add('correct'); });
    showFeedback(false, `${message} الإجابة الصحيحة: ${game.puzzle.options?.[game.puzzle.answer] || ''}`);
    tone('wrong');
    setTimeout(() => advanceTournament(game.tournament), 950);
  }

  function advanceTournament(t) {
    const nextRound = t.round + 1;
    if (nextRound >= t.total) return finishTournament(t);
    const next = t.queue[nextRound];
    startLevel(next.mode, next.index, { ...t, round: nextRound, puzzle: next.puzzle });
  }

  function finishTournament(t) {
    clearTimer();
    const p = profile();
    p.tournament.played++;
    p.tournament.lastScore = t.score;
    p.tournament.best = Math.max(p.tournament.best, t.score);
    const coinReward = 40 + t.correct * 8;
    p.coins += coinReward;
    saveAll(); setHeader();
    currentView = { name: 'tournament-result' };
    const rank = Object.values(profiles).sort((a,b) => b.tournament.best - a.tournament.best).findIndex(x => x.id === activeId) + 1;
    mainView.innerHTML = `<section class="tournament-result"><div class="trophy-core large">🏆</div><div class="eyebrow">TOURNAMENT COMPLETED</div><h1>${t.score.toLocaleString('ar-SA')} نقطة</h1><p>أجبت عن ${t.correct} من ${t.total} إجابات صحيحة، وحصلت على ${coinReward} عملة.</p><div class="result-stats"><div class="result-stat"><strong>#${rank}</strong><small>الترتيب المحلي</small></div><div class="result-stat"><strong>${p.tournament.best.toLocaleString('ar-SA')}</strong><small>أفضل نتيجة</small></div><div class="result-stat"><strong>+${coinReward}</strong><small>عملة</small></div></div><div class="result-actions"><button class="secondary-btn" data-action="tournament">لوحة الصدارة</button><button class="primary-btn" data-action="start-tournament">إعادة المحاولة</button></div></section>`;
  }

  function renderProfiles() {
    const list = Object.values(profiles);
    profilesList.innerHTML = list.length ? list.map(p => `<div class="profile-item ${p.id === activeId ? 'active' : ''}"><div class="profile-main" data-action="select-profile" data-id="${p.id}"><span class="avatar">${p.avatar}</span><span><strong>${escapeHtml(p.name)}</strong><small>${p.score.toLocaleString('ar-SA')} نقطة • ◉ ${p.coins.toLocaleString('ar-SA')} • قدرات ${p.aptitude.best}%</small></span></div><div class="profile-actions"><button class="profile-action" data-action="reset-profile" data-id="${p.id}">↻</button><button class="profile-action" data-action="delete-profile" data-id="${p.id}">🗑</button></div></div>`).join('') : '<div class="empty-state">لا يوجد لاعبون. أضف أول لاعب للبدء.</div>';
  }

  function openProfiles(force = false) {
    renderProfiles(); profileModal.classList.remove('hidden');
    profileModal.querySelector('.modal-close').style.display = force && !profile() ? 'none' : '';
    setTimeout(() => profileNameInput.focus(), 60);
  }
  function closeProfiles() { if (!profile()) return; profileModal.classList.add('hidden'); profileNameInput.value = ''; }

  function addProfile(name) {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length < 2) return showToast('اكتب اسمًا من حرفين على الأقل');
    if (Object.values(profiles).some(p => p.name.toLowerCase() === clean.toLowerCase())) return showToast('الاسم موجود بالفعل');
    if (Object.keys(profiles).length >= 8) return showToast('الحد الأقصى 8 لاعبين');
    const p = createProfile(clean); profiles[p.id] = p; activeId = p.id; saveAll(); closeProfiles(); setHeader(); renderHome(); tone('success');
  }

  function selectProfile(id) { if (!profiles[id]) return; activeId = id; saveAll(); closeProfiles(); setHeader(); renderHome(); showToast(`مرحبًا ${profiles[id].name}`); }

  async function deleteProfile(id) {
    if (!profiles[id]) return;
    if (!await requestConfirm('حذف اللاعب', `سيتم حذف ملف ${profiles[id].name} وجميع تقدمه.`)) return;
    delete profiles[id]; if (activeId === id) activeId = Object.keys(profiles)[0] || null; saveAll(); setHeader(); renderProfiles(); renderHome();
  }

  async function resetProfile(id) {
    if (!profiles[id]) return;
    if (!await requestConfirm('تصفير التقدم', `سيعود ${profiles[id].name} إلى البداية مع الاحتفاظ بالاسم.`)) return;
    const old = profiles[id]; profiles[id] = createProfile(old.name); profiles[id].id = old.id; saveAll(); setHeader(); renderProfiles(); renderHome();
  }

  async function exitGame() {
    if (game?.aptitude) {
      const ok = await requestConfirm('الخروج من محاكاة القدرات', 'ستفقد نتيجة المحاولة الحالية.');
      if (ok) renderAptitude();
      return;
    }
    if (game?.tournament) {
      const ok = await requestConfirm('الخروج من البطولة', 'ستفقد نتيجة البطولة الحالية.');
      if (ok) renderTournament();
      return;
    }
    if (!game?.answered) {
      const ok = await requestConfirm('مغادرة المرحلة', 'سيتم فقدان المحاولة الحالية فقط.');
      if (!ok) return;
    }
    clearTimer(); renderMode(game.mode);
  }

  function requestConfirm(title, text) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmText').textContent = text;
    document.getElementById('confirmModal').classList.remove('hidden');
    return new Promise(resolve => confirmResolver = resolve);
  }
  function closeConfirm(value) { document.getElementById('confirmModal').classList.add('hidden'); confirmResolver?.(value); confirmResolver = null; }

  function showFeedback(success, text) { const el = document.getElementById('feedback'); if (!el) return; el.className = `feedback-banner show ${success ? 'success' : 'error'}`; el.textContent = text; }
  function updateAttempts() { const el = document.getElementById('attemptCount'); if (el) el.textContent = game.attempts; }
  function clearTimer() { if (timerId) clearInterval(timerId); timerId = null; }
  function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200); }

  function toggleSound() { settings.sound = settings.sound === false; saveAll(); setHeader(); if (settings.sound) tone('hint'); showToast(settings.sound ? 'تم تشغيل الصوت' : 'تم كتم الصوت'); }
  function tone(type) {
    if (settings.sound === false) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime, osc = audioContext.createOscillator(), gain = audioContext.createGain();
      const map = { success:[523,659,.17], wrong:[180,120,.18], hint:[430,520,.12] }, [a,b,d] = map[type] || map.hint;
      osc.type = type === 'wrong' ? 'sawtooth' : 'sine'; osc.frequency.setValueAtTime(a, now); osc.frequency.exponentialRampToValueAtTime(b, now + d);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.13, now + .02); gain.gain.exponentialRampToValueAtTime(.0001, now + d);
      osc.connect(gain); gain.connect(audioContext.destination); osc.start(now); osc.stop(now + d + .02);
    } catch {}
  }

  document.addEventListener('click', event => {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'home') renderHome();
    else if (action === 'profiles') openProfiles();
    else if (action === 'close-profiles') closeProfiles();
    else if (action === 'toggle-sound') toggleSound();
    else if (action === 'set-audience') { settings.audience = el.dataset.value; saveAll(); renderHome(); }
    else if (action === 'set-timer') { settings.timer = el.dataset.value; saveAll(); renderHome(); }
    else if (action === 'open-mode') renderMode(el.dataset.mode);
    else if (action === 'start-level') startLevel(el.dataset.mode, Number(el.dataset.level));
    else if (action === 'quick-start') quickStart();
    else if (action === 'library') renderLibrary();
    else if (action === 'library-filter') { libraryMode = el.dataset.value; renderLibrary(); }
    else if (action === 'answer') answer(Number(el.dataset.index));
    else if (action === 'scramble-letter') scrambleLetter(Number(el.dataset.index));
    else if (action === 'scramble-back') scrambleBack();
    else if (action === 'scramble-clear') scrambleClear();
    else if (action === 'check-scramble') checkScramble();
    else if (action === 'check-cross') checkCross();
    else if (action === 'clear-cross') clearCross();
    else if (action === 'use-hint') useHint();
    else if (action === 'freeze-time') freezeTime();
    else if (action === 'skip-level') skipLevel();
    else if (action === 'reveal-tile') revealTile(true);
    else if (action === 'exit-game') exitGame();
    else if (action === 'back-levels') renderMode(game.mode);
    else if (action === 'next-level') startLevel(game.mode, game.index + 1);
    else if (action === 'shop') renderShop();
    else if (action === 'buy-theme') purchasePermanent('theme', el.dataset.id);
    else if (action === 'equip-theme') equip('theme', el.dataset.id);
    else if (action === 'buy-avatar') purchasePermanent('avatar', el.dataset.id);
    else if (action === 'equip-avatar') equip('avatar', el.dataset.id);
    else if (action === 'buy-booster') buyBooster(el.dataset.id);
    else if (action === 'rewards') renderRewards();
    else if (action === 'claim-daily') claimDaily();
    else if (action === 'claim-achievement') claimAchievement(el.dataset.id);
    else if (action === 'aptitude') renderAptitude();
    else if (action === 'start-aptitude') startAptitude();
    else if (action === 'tournament') renderTournament();
    else if (action === 'start-tournament') startTournament();
    else if (action === 'select-profile') selectProfile(el.dataset.id);
    else if (action === 'delete-profile') deleteProfile(el.dataset.id);
    else if (action === 'reset-profile') resetProfile(el.dataset.id);
  });

  document.addEventListener('input', event => {
    if (event.target.id === 'librarySearch') { libraryQuery = event.target.value; updateLibraryResults(); }
    const input = event.target.closest('input[data-cross-slot]');
    if (input && game?.puzzle.type === 'cross') { game.crossInputs[input.dataset.crossSlot] = input.value; }
  });

  profileForm.addEventListener('submit', event => { event.preventDefault(); addProfile(profileNameInput.value); });
  document.getElementById('confirmCancel').addEventListener('click', () => closeConfirm(false));
  document.getElementById('confirmOk').addEventListener('click', () => closeConfirm(true));
  document.addEventListener('keydown', event => {
    if (currentView.name === 'game' && game?.puzzle?.options && !game.answered && ['1','2','3','4'].includes(event.key)) answer(Number(event.key) - 1);
    if (event.key === 'Escape') {
      if (!profileModal.classList.contains('hidden')) closeProfiles();
      else if (!document.getElementById('confirmModal').classList.contains('hidden')) closeConfirm(false);
    }
  });
  window.addEventListener('beforeunload', clearTimer);

  setHeader();
  renderHome();
})();
