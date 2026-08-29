import './kids-world-explorer.css';

const COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,capital,region,subregion,languages,currencies,flags,latlng,translations,population,unMember';
const GEOJSON_URL = 'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json';

const REGION_AR = {
  Africa: 'أفريقيا', Americas: 'الأمريكيتان', Asia: 'آسيا', Europe: 'أوروبا',
  Oceania: 'أوقيانوسيا', Antarctic: 'القارة القطبية الجنوبية'
};

const VIEW_PRESETS = [
  ['العالم', 20, 15, 2.35], ['الخليج', 25, 50, 1.45], ['الوطن العربي', 25, 33, 1.85],
  ['آسيا', 32, 92, 2.05], ['أفريقيا', 5, 20, 1.9], ['أوروبا', 50, 15, 1.65],
  ['الأمريكيتان', 15, -80, 2.2], ['أوقيانوسيا', -25, 135, 1.75]
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toRad = value => value * Math.PI / 180;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function displayLanguage(code, fallback) {
  try { return new Intl.DisplayNames(['ar'], { type: 'language' }).of(code) || fallback || code; }
  catch { return fallback || code; }
}

function displayCurrency(code, fallback) {
  try { return new Intl.DisplayNames(['ar'], { type: 'currency' }).of(code) || fallback || code; }
  catch { return fallback || code; }
}

function countryNameAr(raw) {
  return raw.translations?.ara?.common || raw.translations?.ara?.official || raw.name?.common || raw.cca3;
}

function prepareCountry(raw) {
  const lat = Number(raw.latlng?.[0]);
  const lng = Number(raw.latlng?.[1]);
  const languages = Object.entries(raw.languages || {}).slice(0, 4).map(([code, label]) => displayLanguage(code, label));
  const currencies = Object.entries(raw.currencies || {}).slice(0, 3).map(([code, value]) => displayCurrency(code, value?.name));
  const nameAr = countryNameAr(raw);
  const nameEn = raw.name?.common || raw.cca3;
  const capital = raw.capital?.[0] || 'لا توجد عاصمة محددة';
  const region = REGION_AR[raw.region] || raw.region || '—';
  const flag = raw.flags?.svg || raw.flags?.png || `https://flagcdn.com/w320/${String(raw.cca2 || '').toLowerCase()}.png`;
  return {
    cca2: raw.cca2, cca3: raw.cca3, nameAr, nameEn, capital, region,
    subregion: raw.subregion || '', languages, currencies, population: Number(raw.population) || 0,
    lat: Number.isFinite(lat) ? lat : 0, lng: Number.isFinite(lng) ? lng : 0, flag,
    searchText: normalize(`${nameAr} ${nameEn} ${raw.cca2} ${raw.cca3} ${capital}`)
  };
}

function shortFact(country) {
  const population = country.population
    ? new Intl.NumberFormat('ar-SA', { notation: country.population >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(country.population)
    : null;
  const parts = [`تقع ${country.nameAr} في ${country.region}`];
  if (country.capital && country.capital !== 'لا توجد عاصمة محددة') parts.push(`وعاصمتها ${country.capital}`);
  if (country.languages[0]) parts.push(`ومن لغاتها ${country.languages[0]}`);
  if (population) parts.push(`ويبلغ عدد سكانها قرابة ${population} نسمة`);
  return `${parts.join('، ')}.`;
}

function shell(game) {
  return `<section class="kids-game-runtime world-runtime world-runtime-3d" style="--game-a:${game.colors[0]};--game-b:${game.colors[1]}">
    <header class="runtime-header">
      <div class="runtime-game-id"><span>🌐</span><div><small>جغرافيا تفاعلية • 3D 360°</small><h2>الكرة الأرضية التعليمية</h2><b lang="en">World Explorer 3D</b></div></div>
      <div class="runtime-score"><span>الدول المكتشفة</span><strong id="runtimeScore">٠</strong></div>
    </header>
    <div class="runtime-progress"><div><span id="runtimeStep">جارٍ تجهيز الكرة الأرضية…</span><b id="runtimePercent">0%</b></div><div class="progress-track"><i id="runtimeProgressBar"></i></div></div>
    <div id="runtimeStage" class="runtime-stage world-runtime-stage"></div>
  </section>`;
}

function countryCard(country, challengeText = '') {
  if (!country) return `<div class="country-card-empty"><span>🧭</span><h3>اختر دولة من الكرة الأرضية</h3><p>اسحب الكرة 360°، قرّبها، ثم اضغط على أي دولة أو ابحث عنها بالاسم.</p></div>`;
  return `<article class="country-profile">
    <div class="country-profile-head"><img src="${escapeHtml(country.flag)}" alt="علم ${escapeHtml(country.nameAr)}" loading="eager" decoding="async"><div><span>${escapeHtml(country.cca2)} • ${escapeHtml(country.cca3)}</span><h3>${escapeHtml(country.nameAr)}</h3><p lang="en">${escapeHtml(country.nameEn)}</p></div></div>
    ${challengeText ? `<div class="country-challenge-feedback">${escapeHtml(challengeText)}</div>` : ''}
    <div class="country-facts-grid"><span><small>العاصمة</small><b>${escapeHtml(country.capital)}</b></span><span><small>القارة</small><b>${escapeHtml(country.region)}</b></span><span><small>اللغة</small><b>${escapeHtml(country.languages.join('، ') || '—')}</b></span><span><small>العملة</small><b>${escapeHtml(country.currencies.join('، ') || '—')}</b></span></div>
    <div class="country-fact"><span>💡 معلومة سريعة</span><p>${escapeHtml(shortFact(country))}</p></div>
    <div class="country-coordinates">📍 ${country.lat.toFixed(2)}° ، ${country.lng.toFixed(2)}°</div>
  </article>`;
}

function loadingMarkup() {
  return `<div class="world-loading"><div class="world-spinner"></div><h3>نجهّز جميع دول العالم</h3><p>تحميل معلومات الدول وتجهيز الكرة الأرضية…</p></div>`;
}

function errorMarkup(message) {
  return `<div class="world-error"><span>🌍</span><h3>تعذر تحميل بيانات الدول</h3><p>${escapeHtml(message)}</p><button type="button" data-world-retry>إعادة المحاولة</button></div>`;
}

function featureRings(feature) {
  const geometry = feature?.geometry;
  if (!geometry?.coordinates) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

function createNativeGlobe(host, countries, polygons, onCountryClick) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'كرة أرضية تفاعلية');
  canvas.tabIndex = 0;
  host.replaceChildren(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Canvas 2D غير مدعوم في هذا المتصفح.');

  let width = 640;
  let height = 520;
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  let viewLat = 23;
  let viewLng = 35;
  let zoom = 1;
  let selectedIso = '';
  let destroyed = false;
  let frame = 0;
  let lastTime = performance.now();
  let activeTween = null;
  let projectedCountries = [];
  const pointerMap = new Map();
  let dragStart = null;
  let dragMoved = false;
  let pinchStart = null;

  const controls = { autoRotate: true, autoRotateSpeed: 0.35, enableDamping: true, dampingFactor: 0.08 };

  const resize = () => {
    const rect = host.getBoundingClientRect();
    width = Math.max(320, Math.floor(rect.width || 640));
    height = Math.max(380, Math.min(650, Math.floor(Math.max(host.clientHeight || 520, 420))));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const radius = () => Math.min(width, height) * 0.39 * zoom;

  const project = (lat, lng) => {
    const phi = toRad(lat);
    const lambda = toRad(lng - viewLng);
    const phi0 = toRad(viewLat);
    const cosPhi = Math.cos(phi);
    const x = cosPhi * Math.sin(lambda);
    const y = Math.sin(phi) * Math.cos(phi0) - cosPhi * Math.cos(lambda) * Math.sin(phi0);
    const z = Math.sin(phi) * Math.sin(phi0) + cosPhi * Math.cos(lambda) * Math.cos(phi0);
    const r = radius();
    return { x: width / 2 + x * r, y: height / 2 - y * r, z, visible: z > 0.01 };
  };

  const drawCurve = points => {
    ctx.beginPath();
    let drawing = false;
    for (const [lng, lat] of points) {
      const p = project(lat, lng);
      if (!p.visible) { drawing = false; continue; }
      if (!drawing) { ctx.moveTo(p.x, p.y); drawing = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  };

  const drawGrid = () => {
    ctx.save();
    ctx.strokeStyle = 'rgba(126,232,255,.10)';
    ctx.lineWidth = 0.7;
    for (let lat = -60; lat <= 60; lat += 30) {
      const points = [];
      for (let lng = -180; lng <= 180; lng += 4) points.push([lng, lat]);
      drawCurve(points);
    }
    for (let lng = -150; lng <= 180; lng += 30) {
      const points = [];
      for (let lat = -88; lat <= 88; lat += 3) points.push([lng, lat]);
      drawCurve(points);
    }
    ctx.restore();
  };

  const drawPolygons = () => {
    for (const feature of polygons) {
      const selected = feature.__iso3 === selectedIso;
      ctx.save();
      ctx.strokeStyle = selected ? 'rgba(202,249,255,.98)' : 'rgba(119,205,245,.42)';
      ctx.lineWidth = selected ? 2.2 : 0.75;
      if (selected) { ctx.shadowColor = '#6ee9ff'; ctx.shadowBlur = 10; }
      for (const ring of featureRings(feature)) {
        const step = Math.max(1, Math.floor(ring.length / 650));
        const sampled = step === 1 ? ring : ring.filter((_, index) => index % step === 0);
        drawCurve(sampled);
      }
      ctx.restore();
    }
  };

  const drawCountries = () => {
    projectedCountries = [];
    for (const country of countries) {
      const p = project(country.lat, country.lng);
      if (!p.visible) continue;
      projectedCountries.push({ country, ...p });
      const selected = country.cca3 === selectedIso;
      const dot = selected ? 6.5 : 2.6;
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, dot, 0, Math.PI * 2);
      ctx.fillStyle = selected ? '#ffffff' : 'rgba(255,218,104,.92)';
      ctx.shadowColor = selected ? '#7cf4ff' : 'rgba(255,215,95,.7)';
      ctx.shadowBlur = selected ? 18 : 7;
      ctx.fill();
      if (selected) {
        ctx.font = '800 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const text = country.nameAr;
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(5,14,33,.88)';
        ctx.fillRect(p.x - tw / 2 - 8, p.y - 38, tw + 16, 24);
        ctx.fillStyle = '#fff';
        ctx.fillText(text, p.x, p.y - 19);
      }
      ctx.restore();
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    const r = radius();
    const cx = width / 2;
    const cy = height / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(99,226,255,.20)';
    ctx.lineWidth = 10;
    ctx.shadowColor = '#56d9ff';
    ctx.shadowBlur = 30;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const ocean = ctx.createRadialGradient(cx - r * .32, cy - r * .35, r * .08, cx, cy, r * 1.08);
    ocean.addColorStop(0, '#2f8dd5');
    ocean.addColorStop(.42, '#0b5a9d');
    ocean.addColorStop(.78, '#07345f');
    ocean.addColorStop(1, '#031a36');
    ctx.fillStyle = ocean;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    drawGrid();
    drawPolygons();
    drawCountries();
    const shade = ctx.createRadialGradient(cx - r * .34, cy - r * .30, r * .2, cx + r * .25, cy + r * .18, r * 1.05);
    shade.addColorStop(0, 'rgba(255,255,255,.08)');
    shade.addColorStop(.55, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,4,16,.56)');
    ctx.fillStyle = shade;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  };

  const animateView = now => {
    if (!activeTween) return;
    const t = clamp((now - activeTween.start) / activeTween.duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    viewLat = activeTween.fromLat + (activeTween.toLat - activeTween.fromLat) * eased;
    viewLng = activeTween.fromLng + activeTween.deltaLng * eased;
    zoom = activeTween.fromZoom + (activeTween.toZoom - activeTween.fromZoom) * eased;
    if (t >= 1) activeTween = null;
  };

  const loop = now => {
    if (destroyed) return;
    const delta = Math.min(50, now - lastTime);
    lastTime = now;
    animateView(now);
    if (controls.autoRotate && !pointerMap.size && !activeTween) viewLng = (viewLng + delta * 0.0022 * controls.autoRotateSpeed + 540) % 360 - 180;
    draw();
    frame = requestAnimationFrame(loop);
  };

  const hitTest = (x, y) => {
    let best = null;
    let bestDistance = Infinity;
    for (const item of projectedCountries) {
      const distance = Math.hypot(item.x - x, item.y - y);
      if (distance < bestDistance && distance <= 15) { best = item.country; bestDistance = distance; }
    }
    return best;
  };

  const pointerPosition = event => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const updatePinch = () => {
    if (pointerMap.size !== 2) { pinchStart = null; return; }
    const [a, b] = [...pointerMap.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (!pinchStart) pinchStart = { distance, zoom };
    else zoom = clamp(pinchStart.zoom * (distance / Math.max(1, pinchStart.distance)), .72, 1.62);
  };

  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture?.(event.pointerId);
    const p = pointerPosition(event);
    pointerMap.set(event.pointerId, p);
    dragStart = { ...p, lat: viewLat, lng: viewLng };
    dragMoved = false;
    controls.autoRotate = false;
    updatePinch();
  });

  canvas.addEventListener('pointermove', event => {
    if (!pointerMap.has(event.pointerId)) return;
    const p = pointerPosition(event);
    const previous = pointerMap.get(event.pointerId);
    pointerMap.set(event.pointerId, p);
    if (pointerMap.size === 2) { updatePinch(); return; }
    if (!dragStart) return;
    const dx = p.x - dragStart.x;
    const dy = p.y - dragStart.y;
    if (Math.hypot(dx, dy) > 5) dragMoved = true;
    viewLng = dragStart.lng - dx * .34 / zoom;
    viewLat = clamp(dragStart.lat + dy * .24 / zoom, -82, 82);
    if (previous) activeTween = null;
  });

  const endPointer = event => {
    const p = pointerPosition(event);
    pointerMap.delete(event.pointerId);
    updatePinch();
    if (!pointerMap.size) {
      if (!dragMoved) {
        const country = hitTest(p.x, p.y);
        if (country) onCountryClick(country);
      }
      dragStart = null;
      dragMoved = false;
    }
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', event => { pointerMap.delete(event.pointerId); updatePinch(); });

  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    controls.autoRotate = false;
    zoom = clamp(zoom * (event.deltaY > 0 ? .92 : 1.08), .72, 1.62);
    activeTween = null;
  }, { passive: false });

  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(host);
  window.addEventListener('resize', resize);
  resize();
  frame = requestAnimationFrame(loop);

  return {
    controls: () => controls,
    setSelected(iso3) { selectedIso = iso3 || ''; },
    pointOfView(target, duration = 0) {
      const toLat = Number.isFinite(Number(target?.lat)) ? clamp(Number(target.lat), -82, 82) : viewLat;
      const rawLng = Number.isFinite(Number(target?.lng)) ? Number(target.lng) : viewLng;
      const deltaLng = ((rawLng - viewLng + 540) % 360) - 180;
      const altitude = Number(target?.altitude);
      const toZoom = Number.isFinite(altitude) ? clamp(2.25 / altitude, .72, 1.62) : zoom;
      if (!duration) { viewLat = toLat; viewLng += deltaLng; zoom = toZoom; activeTween = null; return this; }
      activeTween = { start: performance.now(), duration: Math.max(120, duration), fromLat: viewLat, toLat, fromLng: viewLng, deltaLng, fromZoom: zoom, toZoom };
      return this;
    },
    zoomBy(factor) { controls.autoRotate = false; zoom = clamp(zoom * factor, .72, 1.62); activeTween = null; },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      pointerMap.clear();
    }
  };
}

async function fetchJson(url, signal, timeoutMs = 12000) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  const onAbort = () => timeout.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetch(url, { signal: timeout.signal, cache: 'default' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export function launchWorldExplorer({ game, mount, onProgress }) {
  let destroyed = false;
  let globe = null;
  let countries = [];
  let polygons = [];
  let selectedIso = '';
  const explored = new Set();
  let mode = 'explore';
  let challengeTarget = null;
  let challengeRound = 0;
  let challengeScore = 0;
  let challengeLocked = false;
  let outsideClickHandler = null;
  const challengeTotal = 10;
  let controller = new AbortController();

  mount.classList.add('game-active');
  mount.innerHTML = shell(game);
  const stage = mount.querySelector('#runtimeStage');
  const scoreNode = mount.querySelector('#runtimeScore');
  const stepNode = mount.querySelector('#runtimeStep');
  const percentNode = mount.querySelector('#runtimePercent');
  const progressBar = mount.querySelector('#runtimeProgressBar');

  const setProgress = (percent, label, result = {}) => {
    const safe = clamp(Math.round(percent), 0, 100);
    progressBar.style.width = `${safe}%`;
    percentNode.textContent = `${safe}%`;
    stepNode.textContent = label;
    scoreNode.textContent = explored.size.toLocaleString('ar-SA');
    onProgress?.({ percent: safe, score: Number(result.score) || explored.size, total: Number(result.total) || countries.length || 195, completed: Boolean(result.completed) });
  };

  const refreshGlobeSelection = () => globe?.setSelected(selectedIso);

  const renderChallengePanel = (message = '') => {
    const mission = stage.querySelector('#worldMission');
    if (!mission) return;
    if (mode !== 'challenge') {
      mission.innerHTML = `<span>وضع الاستكشاف الحر</span><b>اختر أي دولة لتعرف معلوماتها</b><small>يمكنك أيضًا البحث باسم الدولة بالعربية أو الإنجليزية.</small>`;
      return;
    }
    if (!challengeTarget) {
      mission.innerHTML = `<span>تحدي العثور على الدولة</span><b>أكملت الجولة 🎉</b><small>نتيجتك ${challengeScore.toLocaleString('ar-SA')} من ${challengeTotal.toLocaleString('ar-SA')}</small>`;
      return;
    }
    mission.innerHTML = `<span>تحدي ${challengeRound.toLocaleString('ar-SA')} من ${challengeTotal.toLocaleString('ar-SA')}</span><b>🎯 اعثر على: ${escapeHtml(challengeTarget.nameAr)}</b><small>${message ? escapeHtml(message) : 'حرّك الكرة واضغط على الدولة الصحيحة.'}</small>`;
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
    challengeLocked = false;
    challengeRound += 1;
    renderChallengePanel();
    setProgress(((challengeRound - 1) / challengeTotal) * 100, `تحدي العثور • ${challengeRound} من ${challengeTotal}`, { score: challengeScore, total: challengeTotal });
  };

  const startChallenge = () => {
    mode = 'challenge'; challengeRound = 0; challengeScore = 0; challengeTarget = null; challengeLocked = false;
    stage.querySelectorAll('[data-world-mode]').forEach(button => button.classList.toggle('active', button.dataset.worldMode === 'challenge'));
    nextChallenge();
  };

  const switchToExplore = () => {
    mode = 'explore'; challengeTarget = null;
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
      if (challengeLocked) return;
      if (country.cca3 === challengeTarget.cca3) {
        challengeLocked = true; challengeScore += 1;
        challengeText = '✓ ممتاز! عثرت على الدولة الصحيحة.';
        renderChallengePanel('إجابة صحيحة! استعد للدولة التالية.');
        window.setTimeout(() => { if (!destroyed && mode === 'challenge') nextChallenge(); }, 1050);
      } else {
        challengeText = `هذه ${country.nameAr}. حاول العثور على ${challengeTarget.nameAr}.`;
        renderChallengePanel(`ليست ${country.nameAr}. حاول مرة أخرى.`);
      }
    }
    renderCountry(country, challengeText);
    refreshGlobeSelection();
    if (focus) globe?.pointOfView({ lat: country.lat, lng: country.lng, altitude: 1.35 }, 850);
    if (mode === 'explore') {
      const percent = countries.length ? Math.min(95, Math.round((explored.size / countries.length) * 100)) : 0;
      setProgress(percent, `استكشفت ${explored.size} من ${countries.length} دولة`);
    } else setProgress(((Math.max(0, challengeRound - 1)) / challengeTotal) * 100, `تحدي العثور • ${challengeRound} من ${challengeTotal}`, { score: challengeScore, total: challengeTotal });
  };

  const populateSearch = query => {
    const list = stage.querySelector('#worldSearchResults');
    if (!list) return;
    const needle = normalize(query);
    if (!needle) { list.innerHTML = ''; list.hidden = true; return; }
    const matches = countries.filter(country => country.searchText.includes(needle)).slice(0, 10);
    list.innerHTML = matches.length
      ? matches.map(country => `<button type="button" data-country-search="${escapeHtml(country.cca3)}"><img src="${escapeHtml(country.flag)}" alt=""><span><b>${escapeHtml(country.nameAr)}</b><small>${escapeHtml(country.nameEn)} • ${escapeHtml(country.capital)}</small></span></button>`).join('')
      : '<div class="world-search-empty">لم نجد دولة بهذا الاسم.</div>';
    list.hidden = false;
  };

  const renderDirectory = () => {
    const directory = stage.querySelector('#worldDirectory');
    if (!directory) return;
    directory.innerHTML = countries.map(country => `<button type="button" data-directory-country="${escapeHtml(country.cca3)}"><img src="${escapeHtml(country.flag)}" alt=""><span><b>${escapeHtml(country.nameAr)}</b><small>${escapeHtml(country.region)}</small></span></button>`).join('');
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
      searchResults.hidden = true; searchInput.value = country.nameAr; selectCountry(country, true);
    });
    stage.querySelector('[data-world-mode="explore"]')?.addEventListener('click', switchToExplore);
    stage.querySelector('[data-world-mode="challenge"]')?.addEventListener('click', startChallenge);
    stage.querySelector('[data-world-spin]')?.addEventListener('click', event => {
      if (!globe) return;
      const controls = globe.controls(); controls.autoRotate = !controls.autoRotate;
      event.currentTarget.classList.toggle('active', controls.autoRotate);
      event.currentTarget.textContent = controls.autoRotate ? '⏸ إيقاف الدوران' : '▶ تدوير تلقائي';
    });
    stage.querySelector('[data-world-zoom-in]')?.addEventListener('click', () => globe?.zoomBy(1.12));
    stage.querySelector('[data-world-zoom-out]')?.addEventListener('click', () => globe?.zoomBy(.89));
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
    stage.querySelectorAll('[data-view-lat]').forEach(button => button.addEventListener('click', () => globe?.pointOfView({ lat: Number(button.dataset.viewLat), lng: Number(button.dataset.viewLng), altitude: Number(button.dataset.viewAltitude) }, 850)));
    outsideClickHandler = event => {
      if (!stage.contains(event.target)) return;
      if (!event.target.closest('.world-search-box') && searchResults) searchResults.hidden = true;
    };
    document.addEventListener('click', outsideClickHandler);
  };

  const renderWorkspace = () => {
    stage.innerHTML = `<section class="world-3d-explorer" aria-label="الكرة الأرضية التعليمية ثلاثية الأبعاد">
      <div class="world-3d-intro"><div><span class="runtime-kicker">3D • 360° • جميع دول العالم</span><h3>حرّك الكرة الأرضية واكتشف الدول بنفسك</h3><p>اسحب للتدوير، استخدم عجلة الفأرة أو إصبعين للتكبير والتصغير، ثم اضغط على أي دولة لعرض معلوماتها.</p></div>
      <div class="world-mode-actions"><button class="active" type="button" data-world-mode="explore">🧭 استكشاف حر</button><button type="button" data-world-mode="challenge">🎯 تحدي العثور</button><button class="active" type="button" data-world-spin>⏸ إيقاف الدوران</button><button type="button" data-world-zoom-in>＋ تكبير</button><button type="button" data-world-zoom-out>－ تصغير</button><button type="button" data-world-directory>☷ جميع الدول</button></div></div>
      <div class="world-search-row"><div class="world-search-box"><span>⌕</span><input id="worldCountrySearch" type="search" autocomplete="off" placeholder="ابحث عن دولة: السعودية، اليابان، Brazil..." aria-label="البحث عن دولة"><div id="worldSearchResults" class="world-search-results" hidden></div></div>
      <div class="world-view-presets">${VIEW_PRESETS.map(([label, lat, lng, altitude]) => `<button type="button" data-view-lat="${lat}" data-view-lng="${lng}" data-view-altitude="${altitude}">${label}</button>`).join('')}</div></div>
      <div id="worldMission" class="world-mission"></div>
      <div class="world-3d-grid"><div class="world-globe-card"><div id="worldGlobe" class="world-globe" role="application" aria-label="كرة أرضية ثلاثية الأبعاد قابلة للدوران">${loadingMarkup()}</div><div class="world-globe-hints"><span>↔ اسحب للدوران 360°</span><span>＋/－ قرّب وأبعد</span><span>● اضغط على الدولة</span></div></div><aside id="worldCountryCard" class="world-country-card" aria-live="polite">${countryCard(null)}</aside></div>
      <section id="worldDirectoryPanel" class="world-directory-panel"><header><div><span>جميع دول العالم</span><b id="worldCountryCount">${countries.length.toLocaleString('ar-SA')} دولة</b></div><small>بديل سريع للدول الصغيرة التي يصعب الضغط عليها على الكرة.</small></header><div id="worldDirectory" class="world-directory"></div></section>
    </section>`;
    renderChallengePanel(); renderDirectory(); bindInterface();
  };

  const setupGlobe = async () => {
    try {
      controller.abort();
      controller = new AbortController();
      globe?.destroy(); globe = null;
      setProgress(2, 'تحميل معلومات جميع دول العالم…');
      stage.innerHTML = loadingMarkup();

      const rawCountries = await fetchJson(COUNTRIES_URL, controller.signal, 14000);
      countries = rawCountries.filter(raw => raw?.cca3 && (raw.unMember || raw.cca3 === 'PSE' || raw.cca3 === 'VAT')).map(prepareCountry).sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));
      if (!countries.length) throw new Error('قاعدة بيانات الدول فارغة.');

      setProgress(4, `تم تجهيز ${countries.length} دولة • تجهيز الكرة 3D محليًا…`);
      renderWorkspace();

      let geoResult = null;
      try { geoResult = await fetchJson(GEOJSON_URL, controller.signal, 9000); } catch (geoError) { console.warn('World Explorer borders fallback:', geoError); }
      if (destroyed) return;
      const byIso3 = new Map(countries.map(country => [country.cca3, country]));
      polygons = (geoResult?.features || []).map(feature => {
        const iso3 = String(feature.id || feature.properties?.iso_a3 || feature.properties?.ISO_A3 || '').toUpperCase();
        return { ...feature, __iso3: iso3, __country: byIso3.get(iso3) || null };
      });
      const globeHost = stage.querySelector('#worldGlobe');
      globe = createNativeGlobe(globeHost, countries, polygons, country => selectCountry(country, false));
      globe.pointOfView({ lat: 23, lng: 35, altitude: 2.25 }, 0);
      const controls = globe.controls(); controls.autoRotate = true; controls.autoRotateSpeed = 0.35;
      setProgress(5, `جاهز للاستكشاف • ${countries.length} دولة${polygons.length ? '' : ' • عرض النقاط التفاعلية'}`);
    } catch (error) {
      if (destroyed || error?.name === 'AbortError') return;
      console.error('World Explorer 3D failed:', error);
      stage.innerHTML = errorMarkup('تعذر الوصول إلى قاعدة بيانات الدول حاليًا. أعد المحاولة بعد لحظات. الكرة نفسها أصبحت تعمل محليًا ولا تعتمد على مكتبة خرائط خارجية.');
      stage.querySelector('[data-world-retry]')?.addEventListener('click', setupGlobe, { once: true });
      setProgress(0, 'تعذر تحميل بيانات الدول');
    }
  };

  setupGlobe();

  return () => {
    destroyed = true;
    controller.abort();
    if (outsideClickHandler) document.removeEventListener('click', outsideClickHandler);
    outsideClickHandler = null;
    globe?.destroy(); globe = null;
    mount.classList.remove('game-active');
  };
}
