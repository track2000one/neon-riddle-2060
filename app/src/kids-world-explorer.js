import './kids-world-explorer.css';

const GLOBE_SCRIPT = 'https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js';
const COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,capital,region,subregion,languages,currencies,flags,latlng,translations,population,unMember';
const GEOJSON_URL = 'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json';
const EARTH_IMAGE = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_BUMP = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png';

const REGION_AR = {
  Africa: 'أفريقيا',
  Americas: 'الأمريكيتان',
  Asia: 'آسيا',
  Europe: 'أوروبا',
  Oceania: 'أوقيانوسيا',
  Antarctic: 'القارة القطبية الجنوبية'
};

const VIEW_PRESETS = [
  ['العالم', 20, 15, 2.35],
  ['الخليج', 25, 50, 1.45],
  ['الوطن العربي', 25, 33, 1.85],
  ['آسيا', 32, 92, 2.05],
  ['أفريقيا', 5, 20, 1.9],
  ['أوروبا', 50, 15, 1.65],
  ['الأمريكيتان', 15, -80, 2.2],
  ['أوقيانوسيا', -25, 135, 1.75]
];

let globeLibraryPromise;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function loadGlobeLibrary() {
  if (window.Globe) return Promise.resolve(window.Globe);
  if (globeLibraryPromise) return globeLibraryPromise;

  globeLibraryPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-neon-globe="${GLOBE_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => window.Globe ? resolve(window.Globe) : reject(new Error('Globe library missing')));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = GLOBE_SCRIPT;
    script.async = true;
    script.dataset.neonGlobe = GLOBE_SCRIPT;
    script.onload = () => window.Globe ? resolve(window.Globe) : reject(new Error('Globe library missing'));
    script.onerror = () => reject(new Error('Unable to load globe library'));
    document.head.appendChild(script);
  });

  return globeLibraryPromise;
}

function displayLanguage(code, fallback) {
  try {
    const display = new Intl.DisplayNames(['ar'], { type: 'language' });
    return display.of(code) || fallback || code;
  } catch {
    return fallback || code;
  }
}

function displayCurrency(code, fallback) {
  try {
    const display = new Intl.DisplayNames(['ar'], { type: 'currency' });
    return display.of(code) || fallback || code;
  } catch {
    return fallback || code;
  }
}

function countryNameAr(raw) {
  return raw.translations?.ara?.common || raw.translations?.ara?.official || raw.name?.common || raw.cca3;
}

function prepareCountry(raw) {
  const lat = Number(raw.latlng?.[0]);
  const lng = Number(raw.latlng?.[1]);
  const languages = Object.entries(raw.languages || {})
    .slice(0, 4)
    .map(([code, label]) => displayLanguage(code, label));
  const currencies = Object.entries(raw.currencies || {})
    .slice(0, 3)
    .map(([code, value]) => displayCurrency(code, value?.name));
  const nameAr = countryNameAr(raw);
  const nameEn = raw.name?.common || raw.cca3;
  const capital = raw.capital?.[0] || 'لا توجد عاصمة محددة';
  const region = REGION_AR[raw.region] || raw.region || '—';
  const flag = raw.flags?.svg || raw.flags?.png || `https://flagcdn.com/w320/${String(raw.cca2 || '').toLowerCase()}.png`;

  return {
    cca2: raw.cca2,
    cca3: raw.cca3,
    nameAr,
    nameEn,
    capital,
    region,
    subregion: raw.subregion || '',
    languages,
    currencies,
    population: Number(raw.population) || 0,
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    flag,
    searchText: normalize(`${nameAr} ${nameEn} ${raw.cca2} ${raw.cca3} ${capital}`)
  };
}

function shortFact(country) {
  const population = country.population
    ? new Intl.NumberFormat('ar-SA', { notation: country.population >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(country.population)
    : null;
  const language = country.languages[0];
  const parts = [`تقع ${country.nameAr} في ${country.region}`];
  if (country.capital && country.capital !== 'لا توجد عاصمة محددة') parts.push(`وعاصمتها ${country.capital}`);
  if (language) parts.push(`ومن لغاتها ${language}`);
  if (population) parts.push(`ويبلغ عدد سكانها قرابة ${population} نسمة`);
  return `${parts.join('، ')}.`;
}

function shell(game) {
  return `
    <section class="kids-game-runtime world-runtime world-runtime-3d" style="--game-a:${game.colors[0]};--game-b:${game.colors[1]}">
      <header class="runtime-header">
        <div class="runtime-game-id"><span>🌐</span><div><small>جغرافيا تفاعلية • 3D 360°</small><h2>الكرة الأرضية التعليمية</h2><b lang="en">World Explorer 3D</b></div></div>
        <div class="runtime-score"><span>الدول المكتشفة</span><strong id="runtimeScore">٠</strong></div>
      </header>
      <div class="runtime-progress"><div><span id="runtimeStep">جارٍ تجهيز الكرة الأرضية…</span><b id="runtimePercent">0%</b></div><div class="progress-track"><i id="runtimeProgressBar"></i></div></div>
      <div id="runtimeStage" class="runtime-stage world-runtime-stage"></div>
    </section>`;
}

function countryCard(country, challengeText = '') {
  if (!country) {
    return `
      <div class="country-card-empty">
        <span>🧭</span>
        <h3>اختر دولة من الكرة الأرضية</h3>
        <p>اسحب الكرة 360°، قرّبها، ثم اضغط على أي دولة أو ابحث عنها بالاسم.</p>
      </div>`;
  }

  return `
    <article class="country-profile">
      <div class="country-profile-head">
        <img src="${escapeHtml(country.flag)}" alt="علم ${escapeHtml(country.nameAr)}" loading="eager" decoding="async">
        <div><span>${escapeHtml(country.cca2)} • ${escapeHtml(country.cca3)}</span><h3>${escapeHtml(country.nameAr)}</h3><p lang="en">${escapeHtml(country.nameEn)}</p></div>
      </div>
      ${challengeText ? `<div class="country-challenge-feedback">${escapeHtml(challengeText)}</div>` : ''}
      <div class="country-facts-grid">
        <span><small>العاصمة</small><b>${escapeHtml(country.capital)}</b></span>
        <span><small>القارة</small><b>${escapeHtml(country.region)}</b></span>
        <span><small>اللغة</small><b>${escapeHtml(country.languages.join('، ') || '—')}</b></span>
        <span><small>العملة</small><b>${escapeHtml(country.currencies.join('، ') || '—')}</b></span>
      </div>
      <div class="country-fact"><span>💡 معلومة سريعة</span><p>${escapeHtml(shortFact(country))}</p></div>
      <div class="country-coordinates">📍 ${country.lat.toFixed(2)}° ، ${country.lng.toFixed(2)}°</div>
    </article>`;
}

function loadingMarkup() {
  return `<div class="world-loading"><div class="world-spinner"></div><h3>نجهّز جميع دول العالم</h3><p>تحميل حدود الدول ومعلوماتها التعليمية…</p></div>`;
}

function errorMarkup(message) {
  return `<div class="world-error"><span>🌍</span><h3>تعذر تشغيل الكرة ثلاثية الأبعاد</h3><p>${escapeHtml(message)}</p><button type="button" data-world-retry>إعادة المحاولة</button></div>`;
}

export function launchWorldExplorer({ game, mount, onProgress }) {
  let destroyed = false;
  let globe = null;
  let resizeObserver = null;
  let countries = [];
  let polygons = [];
  let selectedIso = '';
  let explored = new Set();
  let mode = 'explore';
  let challengeTarget = null;
  let challengeRound = 0;
  let challengeScore = 0;
  const challengeTotal = 10;
  const controller = new AbortController();

  mount.classList.add('game-active');
  mount.innerHTML = shell(game);

  const stage = mount.querySelector('#runtimeStage');
  const scoreNode = mount.querySelector('#runtimeScore');
  const stepNode = mount.querySelector('#runtimeStep');
  const percentNode = mount.querySelector('#runtimePercent');
  const progressBar = mount.querySelector('#runtimeProgressBar');

  const setProgress = (percent, label, result = {}) => {
    const safe = Math.max(0, Math.min(100, Math.round(percent)));
    progressBar.style.width = `${safe}%`;
    percentNode.textContent = `${safe}%`;
    stepNode.textContent = label;
    scoreNode.textContent = explored.size.toLocaleString('ar-SA');
    onProgress?.({
      percent: safe,
      score: Number(result.score) || explored.size,
      total: Number(result.total) || countries.length || 195,
      completed: Boolean(result.completed)
    });
  };

  const refreshGlobeSelection = () => {
    if (!globe) return;
    globe
      .polygonAltitude(feature => feature.__iso3 === selectedIso ? 0.055 : 0.008)
      .polygonCapColor(feature => feature.__iso3 === selectedIso ? 'rgba(124,104,255,.92)' : 'rgba(72,164,220,.24)')
      .polygonSideColor(feature => feature.__iso3 === selectedIso ? 'rgba(89,217,255,.8)' : 'rgba(44,120,180,.12)')
      .polygonStrokeColor(feature => feature.__iso3 === selectedIso ? '#b8f5ff' : 'rgba(151,220,255,.52)')
      .pointRadius(country => country.cca3 === selectedIso ? 0.28 : 0.07)
      .pointAltitude(country => country.cca3 === selectedIso ? 0.055 : 0.012)
      .pointColor(country => country.cca3 === selectedIso ? '#ffffff' : 'rgba(255,220,105,.9)');
  };

  const renderChallengePanel = (message = '') => {
    const mission = stage.querySelector('#worldMission');
    if (!mission) return;

    if (mode !== 'challenge') {
      mission.innerHTML = `
        <span>وضع الاستكشاف الحر</span>
        <b>اختر أي دولة لتعرف معلوماتها</b>
        <small>يمكنك أيضًا البحث باسم الدولة بالعربية أو الإنجليزية.</small>`;
      return;
    }

    if (!challengeTarget) {
      mission.innerHTML = `<span>تحدي العثور على الدولة</span><b>أكملت الجولة 🎉</b><small>نتيجتك ${challengeScore.toLocaleString('ar-SA')} من ${challengeTotal.toLocaleString('ar-SA')}</small>`;
      return;
    }

    mission.innerHTML = `
      <span>تحدي ${challengeRound.toLocaleString('ar-SA')} من ${challengeTotal.toLocaleString('ar-SA')}</span>
      <b>🎯 اعثر على: ${escapeHtml(challengeTarget.nameAr)}</b>
      <small>${message ? escapeHtml(message) : 'حرّك الكرة واضغط على الدولة الصحيحة.'}</small>`;
  };

  const nextChallenge = () => {
    if (challengeRound >= challengeTotal) {
      challengeTarget = null;
      renderChallengePanel();
      setProgress(100, 'اكتمل تحدي العثور على الدول', { score: challengeScore, total: challengeTotal, completed: true });
      return;
    }

    const available = countries.filter(country => country.cca3 !== challengeTarget?.cca3);
    challengeTarget = available[Math.floor(Math.random() * available.length)];
    challengeRound += 1;
    renderChallengePanel();
    setProgress(Math.round(((challengeRound - 1) / challengeTotal) * 100), `تحدي العثور • ${challengeRound} من ${challengeTotal}`, { score: challengeScore, total: challengeTotal });
  };

  const startChallenge = () => {
    mode = 'challenge';
    challengeRound = 0;
    challengeScore = 0;
    challengeTarget = null;
    stage.querySelectorAll('[data-world-mode]').forEach(button => button.classList.toggle('active', button.dataset.worldMode === 'challenge'));
    nextChallenge();
  };

  const switchToExplore = () => {
    mode = 'explore';
    challengeTarget = null;
    stage.querySelectorAll('[data-world-mode]').forEach(button => button.classList.toggle('active', button.dataset.worldMode === 'explore'));
    renderChallengePanel();
    const percent = countries.length ? Math.min(95, Math.round((explored.size / countries.length) * 100)) : 0;
    setProgress(percent, `استكشفت ${explored.size} من ${countries.length || 195} دولة`);
  };

  const renderCountry = (country, challengeText = '') => {
    const card = stage.querySelector('#worldCountryCard');
    if (card) card.innerHTML = countryCard(country, challengeText);
  };

  const selectCountry = (country, focus = true) => {
    if (!country || destroyed) return;
    selectedIso = country.cca3;
    explored.add(country.cca3);

    let challengeText = '';
    if (mode === 'challenge' && challengeTarget) {
      if (country.cca3 === challengeTarget.cca3) {
        challengeScore += 1;
        challengeText = '✓ ممتاز! عثرت على الدولة الصحيحة.';
        renderChallengePanel('إجابة صحيحة! استعد للدولة التالية.');
        window.setTimeout(() => {
          if (!destroyed && mode === 'challenge') nextChallenge();
        }, 1050);
      } else {
        challengeText = `هذه ${country.nameAr}. حاول العثور على ${challengeTarget.nameAr}.`;
        renderChallengePanel(`ليست ${country.nameAr}. حاول مرة أخرى.`);
      }
    }

    renderCountry(country, challengeText);
    refreshGlobeSelection();
    if (focus && globe) globe.pointOfView({ lat: country.lat, lng: country.lng, altitude: 1.35 }, 850);

    if (mode === 'explore') {
      const percent = countries.length ? Math.min(95, Math.round((explored.size / countries.length) * 100)) : 0;
      setProgress(percent, `استكشفت ${explored.size} من ${countries.length} دولة`);
    } else {
      setProgress(Math.round(((Math.max(0, challengeRound - 1)) / challengeTotal) * 100), `تحدي العثور • ${challengeRound} من ${challengeTotal}`, { score: challengeScore, total: challengeTotal });
    }
  };

  const populateSearch = query => {
    const list = stage.querySelector('#worldSearchResults');
    if (!list) return;
    const needle = normalize(query);
    if (!needle) {
      list.innerHTML = '';
      list.hidden = true;
      return;
    }

    const matches = countries
      .filter(country => country.searchText.includes(needle))
      .slice(0, 10);

    list.innerHTML = matches.length
      ? matches.map(country => `<button type="button" data-country-search="${escapeHtml(country.cca3)}"><img src="${escapeHtml(country.flag)}" alt=""><span><b>${escapeHtml(country.nameAr)}</b><small>${escapeHtml(country.nameEn)} • ${escapeHtml(country.capital)}</small></span></button>`).join('')
      : '<div class="world-search-empty">لم نجد دولة بهذا الاسم.</div>';
    list.hidden = false;
  };

  const renderDirectory = () => {
    const directory = stage.querySelector('#worldDirectory');
    if (!directory) return;
    directory.innerHTML = countries.map(country => `
      <button type="button" data-directory-country="${escapeHtml(country.cca3)}">
        <img src="${escapeHtml(country.flag)}" alt="">
        <span><b>${escapeHtml(country.nameAr)}</b><small>${escapeHtml(country.region)}</small></span>
      </button>`).join('');
  };

  const bindInterface = () => {
    const searchInput = stage.querySelector('#worldCountrySearch');
    const searchResults = stage.querySelector('#worldSearchResults');
    const directoryPanel = stage.querySelector('#worldDirectoryPanel');

    searchInput?.addEventListener('input', event => populateSearch(event.target.value));
    searchInput?.addEventListener('focus', event => populateSearch(event.target.value));

    searchResults?.addEventListener('click', event => {
      const button = event.target.closest('[data-country-search]');
      if (!button) return;
      const country = countries.find(item => item.cca3 === button.dataset.countrySearch);
      if (!country) return;
      searchResults.hidden = true;
      searchInput.value = country.nameAr;
      selectCountry(country, true);
    });

    stage.querySelector('[data-world-mode="explore"]')?.addEventListener('click', switchToExplore);
    stage.querySelector('[data-world-mode="challenge"]')?.addEventListener('click', startChallenge);

    stage.querySelector('[data-world-spin]')?.addEventListener('click', event => {
      if (!globe) return;
      const controls = globe.controls();
      controls.autoRotate = !controls.autoRotate;
      event.currentTarget.classList.toggle('active', controls.autoRotate);
      event.currentTarget.textContent = controls.autoRotate ? '⏸ إيقاف الدوران' : '▶ تدوير تلقائي';
    });

    stage.querySelector('[data-world-directory]')?.addEventListener('click', event => {
      const open = directoryPanel?.classList.toggle('open');
      event.currentTarget.classList.toggle('active', Boolean(open));
      event.currentTarget.textContent = open ? '✕ إغلاق قائمة الدول' : '☷ جميع الدول';
    });

    stage.querySelector('#worldDirectory')?.addEventListener('click', event => {
      const button = event.target.closest('[data-directory-country]');
      if (!button) return;
      const country = countries.find(item => item.cca3 === button.dataset.directoryCountry);
      if (country) selectCountry(country, true);
    });

    stage.querySelectorAll('[data-view-lat]').forEach(button => button.addEventListener('click', () => {
      globe?.pointOfView({
        lat: Number(button.dataset.viewLat),
        lng: Number(button.dataset.viewLng),
        altitude: Number(button.dataset.viewAltitude)
      }, 850);
    }));

    document.addEventListener('click', event => {
      if (!stage.contains(event.target)) return;
      if (!event.target.closest('.world-search-box')) searchResults && (searchResults.hidden = true);
    });
  };

  const renderWorkspace = () => {
    stage.innerHTML = `
      <section class="world-3d-explorer" aria-label="الكرة الأرضية التعليمية ثلاثية الأبعاد">
        <div class="world-3d-intro">
          <div><span class="runtime-kicker">3D • 360° • جميع دول العالم</span><h3>حرّك الكرة الأرضية واكتشف الدول بنفسك</h3><p>اسحب للتدوير، استخدم عجلة الفأرة أو إصبعين للتكبير والتصغير، ثم اضغط على أي دولة لعرض معلوماتها.</p></div>
          <div class="world-mode-actions">
            <button class="active" type="button" data-world-mode="explore">🧭 استكشاف حر</button>
            <button type="button" data-world-mode="challenge">🎯 تحدي العثور</button>
            <button class="active" type="button" data-world-spin>⏸ إيقاف الدوران</button>
            <button type="button" data-world-directory>☷ جميع الدول</button>
          </div>
        </div>

        <div class="world-search-row">
          <div class="world-search-box">
            <span>⌕</span>
            <input id="worldCountrySearch" type="search" autocomplete="off" placeholder="ابحث عن دولة: السعودية، اليابان، Brazil..." aria-label="البحث عن دولة">
            <div id="worldSearchResults" class="world-search-results" hidden></div>
          </div>
          <div class="world-view-presets">
            ${VIEW_PRESETS.map(([label, lat, lng, altitude]) => `<button type="button" data-view-lat="${lat}" data-view-lng="${lng}" data-view-altitude="${altitude}">${label}</button>`).join('')}
          </div>
        </div>

        <div id="worldMission" class="world-mission"></div>

        <div class="world-3d-grid">
          <div class="world-globe-card">
            <div id="worldGlobe" class="world-globe" role="application" aria-label="كرة أرضية ثلاثية الأبعاد قابلة للدوران">${loadingMarkup()}</div>
            <div class="world-globe-hints"><span>↔ اسحب للدوران 360°</span><span>＋/－ قرّب وأبعد</span><span>● اضغط على الدولة</span></div>
          </div>
          <aside id="worldCountryCard" class="world-country-card" aria-live="polite">${countryCard(null)}</aside>
        </div>

        <section id="worldDirectoryPanel" class="world-directory-panel">
          <header><div><span>جميع دول العالم</span><b id="worldCountryCount">${countries.length.toLocaleString('ar-SA')} دولة</b></div><small>بديل سريع للدول الصغيرة التي يصعب الضغط عليها على الكرة.</small></header>
          <div id="worldDirectory" class="world-directory"></div>
        </section>
      </section>`;

    renderChallengePanel();
    renderDirectory();
    bindInterface();
  };

  const setupGlobe = async () => {
    try {
      setProgress(2, 'تحميل معلومات جميع دول العالم…');
      stage.innerHTML = loadingMarkup();

      const countryResponse = await fetch(COUNTRIES_URL, { signal: controller.signal });
      if (!countryResponse.ok) throw new Error('تعذر تحميل قاعدة بيانات الدول.');
      const rawCountries = await countryResponse.json();

      countries = rawCountries
        .filter(raw => raw?.cca3 && (raw.unMember || raw.cca3 === 'PSE' || raw.cca3 === 'VAT'))
        .map(prepareCountry)
        .sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));

      if (!countries.length) throw new Error('قاعدة بيانات الدول فارغة.');

      setProgress(4, `تم تجهيز ${countries.length} دولة • تحميل الكرة ثلاثية الأبعاد…`);
      renderWorkspace();

      const [GlobeCtor, geoResult] = await Promise.all([
        loadGlobeLibrary(),
        fetch(GEOJSON_URL, { signal: controller.signal }).then(response => response.ok ? response.json() : null).catch(() => null)
      ]);
      if (destroyed) return;

      const byIso3 = new Map(countries.map(country => [country.cca3, country]));
      polygons = (geoResult?.features || []).map(feature => {
        const iso3 = String(feature.id || feature.properties?.iso_a3 || feature.properties?.ISO_A3 || '').toUpperCase();
        const country = byIso3.get(iso3);
        return { ...feature, __iso3: iso3, __country: country || null };
      });

      const globeHost = stage.querySelector('#worldGlobe');
      globeHost.innerHTML = '';

      globe = new GlobeCtor(globeHost, { rendererConfig: { antialias: true, alpha: true } })
        .width(Math.max(320, globeHost.clientWidth))
        .height(Math.max(420, Math.min(650, window.innerHeight * 0.68)))
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl(EARTH_IMAGE)
        .bumpImageUrl(EARTH_BUMP)
        .showAtmosphere(true)
        .atmosphereColor('#59d9ff')
        .atmosphereAltitude(0.18)
        .polygonsData(polygons)
        .polygonAltitude(feature => feature.__iso3 === selectedIso ? 0.055 : 0.008)
        .polygonCapColor(feature => feature.__iso3 === selectedIso ? 'rgba(124,104,255,.92)' : 'rgba(72,164,220,.24)')
        .polygonSideColor(feature => feature.__iso3 === selectedIso ? 'rgba(89,217,255,.8)' : 'rgba(44,120,180,.12)')
        .polygonStrokeColor(feature => feature.__iso3 === selectedIso ? '#b8f5ff' : 'rgba(151,220,255,.52)')
        .polygonLabel(feature => feature.__country ? `<div class="world-globe-tooltip"><b>${escapeHtml(feature.__country.nameAr)}</b><span>${escapeHtml(feature.__country.nameEn)}</span></div>` : '')
        .onPolygonClick(feature => feature.__country && selectCountry(feature.__country, false))
        .pointsData(countries)
        .pointLat('lat')
        .pointLng('lng')
        .pointRadius(country => country.cca3 === selectedIso ? 0.28 : 0.07)
        .pointAltitude(country => country.cca3 === selectedIso ? 0.055 : 0.012)
        .pointColor(country => country.cca3 === selectedIso ? '#ffffff' : 'rgba(255,220,105,.9)')
        .pointLabel(country => `<div class="world-globe-tooltip"><b>${escapeHtml(country.nameAr)}</b><span>${escapeHtml(country.capital)}</span></div>`)
        .onPointClick(country => selectCountry(country, false))
        .pointOfView({ lat: 23, lng: 35, altitude: 2.25 }, 0);

      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;

      resizeObserver = new ResizeObserver(entries => {
        if (!globe || destroyed) return;
        const width = Math.max(320, Math.floor(entries[0]?.contentRect?.width || globeHost.clientWidth));
        globe.width(width);
      });
      resizeObserver.observe(globeHost);

      setProgress(5, `جاهز للاستكشاف • ${countries.length} دولة`);
    } catch (error) {
      if (destroyed || error?.name === 'AbortError') return;
      console.error('World Explorer 3D failed:', error);
      stage.innerHTML = errorMarkup('يمكن أن يكون الاتصال بخدمة الخرائط غير متاح مؤقتًا. أعد المحاولة، أو تحقق من اتصال الإنترنت.');
      stage.querySelector('[data-world-retry]')?.addEventListener('click', setupGlobe, { once: true });
      setProgress(0, 'تعذر تحميل الكرة الأرضية');
    }
  };

  setupGlobe();

  return () => {
    destroyed = true;
    controller.abort();
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (globe) {
      try {
        globe.controls().autoRotate = false;
        globe._destructor?.();
      } catch {}
    }
    globe = null;
    mount.classList.remove('game-active');
  };
}
