import { WORLD_COUNTRY_BORDERS } from './kids-world-map-local.js';

const FLAG_META = new Map([
  ['🇸🇦', { code: 'sa', label: 'علم المملكة العربية السعودية', fallback: 'السعودية' }],
  ['🇲🇦', { code: 'ma', label: 'علم المغرب', fallback: 'المغرب' }],
  ['🇧🇷', { code: 'br', label: 'علم البرازيل', fallback: 'البرازيل' }],
  ['🇫🇷', { code: 'fr', label: 'علم فرنسا', fallback: 'فرنسا' }],
  ['🇨🇦', { code: 'ca', label: 'علم كندا', fallback: 'كندا' }],
  ['🇦🇺', { code: 'au', label: 'علم أستراليا', fallback: 'أستراليا' }],
  ['🇯🇵', { code: 'jp', label: 'علم اليابان', fallback: 'اليابان' }]
]);

const STYLE_ID = 'neon-kids-flag-fallback-style';
const EARTH_RADIUS_KM = 6371.0088;

const AREA_OVERRIDES_KM2 = {
  SA: 2149690, AE: 83600, QA: 11586, BH: 786, KW: 17818, OM: 309500, YE: 527968,
  VA: 0.49, MC: 2.02, SM: 61, LI: 160, MT: 316, MV: 300, SG: 734,
  AD: 468, LU: 2586, NR: 21, TV: 26, MH: 181, KN: 261, GD: 344,
  VC: 389, BB: 430, AG: 442, SC: 459, PW: 459, DM: 751, TO: 747,
  FM: 702, KI: 811, ST: 964, KM: 1862, MU: 2040, WS: 2842, CV: 4033,
  PS: 6020
};

const NAME_ALIASES = {
  'united states': 'united states of america',
  'dr congo': 'dem rep congo',
  'democratic republic of the congo': 'dem rep congo',
  'central african republic': 'central african rep',
  'dominican republic': 'dominican rep',
  'equatorial guinea': 'eq guinea',
  'bosnia and herzegovina': 'bosnia and herz',
  'south sudan': 's sudan',
  'solomon islands': 'solomon is',
  'ivory coast': 'cote d ivoire',
  'cote d ivoire': 'cote d ivoire'
};

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .runtime-visual.world-flag-visual{display:flex;align-items:center;justify-content:center;gap:14px;min-height:92px;font-size:2.4rem}
    .runtime-visual .world-country-flag{display:block;width:min(170px,44vw);height:auto;max-height:104px;object-fit:contain;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.24),0 0 0 1px rgba(255,255,255,.18);background:rgba(255,255,255,.96)}
    .runtime-visual .world-visual-emoji{line-height:1;font-size:clamp(2rem,5vw,3.25rem)}
    .runtime-visual .world-flag-fallback{display:inline-flex;align-items:center;justify-content:center;min-width:132px;min-height:72px;padding:10px 18px;border-radius:16px;font-size:1.15rem;font-weight:800;background:linear-gradient(135deg,rgba(84,205,255,.18),rgba(145,92,255,.2));border:1px solid rgba(255,255,255,.2)}
    .country-profile-head img[data-world-real-flag="true"]{object-fit:cover;border:1px solid rgba(255,255,255,.28);box-shadow:0 12px 28px rgba(0,0,0,.32),0 0 24px rgba(89,217,255,.13)}
    .country-facts-grid .country-area-stat{grid-column:1/-1;background:linear-gradient(135deg,rgba(89,217,255,.08),rgba(124,104,255,.08));border-color:rgba(89,217,255,.16)}
    .country-facts-grid .country-area-stat b{font-size:12px;color:#eafcff;direction:rtl}
  `;
  document.head.appendChild(style);
}

function normalizeName(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function ringAreaKm2(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const current = ring[i] || [];
    const next = ring[(i + 1) % ring.length] || [];
    const lon1 = Number(current[0]);
    const lat1 = Number(current[1]);
    const lon2 = Number(next[0]);
    const lat2 = Number(next[1]);
    if (![lon1, lat1, lon2, lat2].every(Number.isFinite)) continue;
    let deltaLon = (lon2 - lon1) * Math.PI / 180;
    if (deltaLon > Math.PI) deltaLon -= Math.PI * 2;
    if (deltaLon < -Math.PI) deltaLon += Math.PI * 2;
    sum += deltaLon * (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
  }
  return Math.abs(sum) * EARTH_RADIUS_KM * EARTH_RADIUS_KM / 2;
}

function polygonAreaKm2(coordinates) {
  if (!Array.isArray(coordinates) || !coordinates.length) return 0;
  const outer = ringAreaKm2(coordinates[0]);
  const holes = coordinates.slice(1).reduce((total, ring) => total + ringAreaKm2(ring), 0);
  return Math.max(0, outer - holes);
}

function featureAreaKm2(feature) {
  const geometry = feature?.geometry;
  if (!geometry?.coordinates) return 0;
  if (geometry.type === 'Polygon') return polygonAreaKm2(geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.reduce((total, polygon) => total + polygonAreaKm2(polygon), 0);
  return 0;
}

const atlasByName = new Map((WORLD_COUNTRY_BORDERS?.features || []).map(feature => [normalizeName(feature.properties?.name), feature]));

function areaForCountry(code, englishName) {
  const upper = String(code || '').toUpperCase();
  if (AREA_OVERRIDES_KM2[upper]) return AREA_OVERRIDES_KM2[upper];
  const normalized = normalizeName(englishName);
  const lookup = NAME_ALIASES[normalized] || normalized;
  const feature = atlasByName.get(lookup);
  const area = featureAreaKm2(feature);
  return area > 0 ? Math.round(area) : 0;
}

function formatArea(area) {
  if (!area) return 'غير متاحة';
  if (area < 1) return `${new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(area)} كم²`;
  return `${new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(Math.round(area))} كم²`;
}

function findFlag(text) {
  for (const [emoji, meta] of FLAG_META.entries()) {
    if (text.includes(emoji)) return { emoji, meta };
  }
  return null;
}

function renderFlag(node) {
  if (!(node instanceof HTMLElement) || node.dataset.flagEnhanced === 'true') return;
  const original = node.textContent || '';
  const match = findFlag(original);
  if (!match) return;

  ensureStyles();
  const { emoji, meta } = match;
  const prefix = original.replace(emoji, '').trim();
  node.textContent = '';
  node.classList.add('world-flag-visual');
  node.dataset.flagEnhanced = 'true';

  if (prefix) {
    const decorative = document.createElement('span');
    decorative.className = 'world-visual-emoji';
    decorative.setAttribute('aria-hidden', 'true');
    decorative.textContent = prefix;
    node.appendChild(decorative);
  }

  const image = document.createElement('img');
  image.className = 'world-country-flag';
  image.src = `https://flagcdn.com/w160/${meta.code}.png`;
  image.srcset = `https://flagcdn.com/w160/${meta.code}.png 1x, https://flagcdn.com/w320/${meta.code}.png 2x`;
  image.alt = meta.label;
  image.width = 160;
  image.height = 106;
  image.decoding = 'async';
  image.loading = 'eager';
  image.addEventListener('error', () => {
    const fallback = document.createElement('span');
    fallback.className = 'world-flag-fallback';
    fallback.textContent = meta.fallback;
    image.replaceWith(fallback);
  }, { once: true });
  node.appendChild(image);
}

function enhanceWorldCountryProfile(profile) {
  if (!(profile instanceof HTMLElement)) return;
  ensureStyles();

  const header = profile.querySelector('.country-profile-head');
  const codeText = header?.querySelector('span')?.textContent || '';
  const englishName = header?.querySelector('p')?.textContent?.trim() || '';
  const code = (codeText.match(/\b[A-Z]{2}\b/) || [])[0] || '';
  const codeLower = code.toLowerCase();
  const image = header?.querySelector('img');

  if (image && codeLower && image.dataset.worldRealFlag !== 'true') {
    image.dataset.worldRealFlag = 'true';
    image.alt = `علم ${header?.querySelector('h3')?.textContent?.trim() || englishName}`;
    image.srcset = `https://flagcdn.com/w160/${codeLower}.png 1x, https://flagcdn.com/w320/${codeLower}.png 2x`;
    image.src = `https://flagcdn.com/w160/${codeLower}.png`;
    image.addEventListener('error', () => {
      image.removeAttribute('srcset');
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="106"><rect width="160" height="106" rx="12" fill="#fff"/><text x="80" y="66" text-anchor="middle" font-family="Arial" font-size="34" fill="#14213d">${code.toUpperCase()}</text></svg>`)}`;
    }, { once: true });
  }

  const grid = profile.querySelector('.country-facts-grid');
  if (grid && !grid.querySelector('[data-world-area]')) {
    const area = areaForCountry(code, englishName);
    const stat = document.createElement('span');
    stat.className = 'country-area-stat';
    stat.dataset.worldArea = 'true';
    stat.innerHTML = `<small>المساحة</small><b>${formatArea(area)}</b>`;
    grid.appendChild(stat);
  }
}

function scan(root = document) {
  if (root instanceof HTMLElement) {
    if (root.matches('.runtime-visual')) renderFlag(root);
    if (root.matches('.country-profile')) enhanceWorldCountryProfile(root);
  }
  root.querySelectorAll?.('.runtime-visual').forEach(renderFlag);
  root.querySelectorAll?.('.country-profile').forEach(enhanceWorldCountryProfile);
}

scan();

const observer = new MutationObserver(records => {
  records.forEach(record => {
    record.addedNodes.forEach(node => {
      if (node instanceof HTMLElement) scan(node);
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
