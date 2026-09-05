import './exam-subject-icons.css';
import './exam-subject-reference-art.css';
import verbalArt from './assets/exam-subjects/qudurat-verbal.webp';
import mathArt from './assets/exam-subjects/tahsili-math.webp';
import physicsArt from './assets/exam-subjects/tahsili-physics.webp';
import chemistryArt from './assets/exam-subjects/tahsili-chemistry.webp';
import biologyArt from './assets/exam-subjects/tahsili-biology.webp';

const SUBJECT_ART = {
  'qudurat-verbal': verbalArt,
  'tahsili-math': mathArt,
  'tahsili-physics': physicsArt,
  'tahsili-chemistry': chemistryArt,
  'tahsili-biology': biologyArt
};

const QUANT_ART = `<svg viewBox="0 0 180 150" role="img" aria-label="القدرات الكمية">
  <defs>
    <linearGradient id="qGlass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d9f4ff" stop-opacity=".42"/>
      <stop offset=".48" stop-color="#7cc7ff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#3569dc" stop-opacity=".22"/>
    </linearGradient>
    <linearGradient id="qLine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e9f7ff"/>
      <stop offset="1" stop-color="#79bfff"/>
    </linearGradient>
    <filter id="qGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <ellipse cx="90" cy="132" rx="62" ry="9" fill="#66baff" opacity=".16"/>
  <rect x="28" y="12" width="124" height="116" rx="24" fill="url(#qGlass)" stroke="#bfe8ff" stroke-opacity=".72" stroke-width="2"/>
  <rect x="35" y="19" width="110" height="102" rx="19" fill="none" stroke="#7fc7ff" stroke-opacity=".42"/>
  <g fill="none" stroke="url(#qLine)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#qGlow)">
    <path d="M48 70h13v28H48zM68 57h13v41H68zM88 43h13v55H88z"/>
    <path d="M47 50c16-2 28-8 40-20 8 5 16 5 26-5"/>
    <path d="M106 25h10v10"/>
    <rect x="46" y="104" width="38" height="16" rx="4"/>
    <path d="M53 110h24M55 116h5M64 116h5M73 116h4"/>
    <rect x="92" y="102" width="38" height="18" rx="4"/>
    <path d="M98 108h26M98 114h26M104 105v6M116 111v6"/>
  </g>
  <g fill="#eaf7ff" font-family="Arial, sans-serif" font-weight="700" font-size="23" filter="url(#qGlow)">
    <text x="116" y="50">1</text><text x="130" y="70">2</text><text x="113" y="91">3</text>
  </g>
</svg>`;

const FAMILY_LABELS = {
  'qudurat-verbal': 'القدرات العامة',
  'qudurat-quant': 'القدرات العامة',
  'tahsili-math': 'التحصيلي',
  'tahsili-physics': 'التحصيلي',
  'tahsili-chemistry': 'التحصيلي',
  'tahsili-biology': 'التحصيلي'
};

const CARD_COPY = {
  'qudurat-verbal': 'فهم أعمق .. وتعبير أدق',
  'qudurat-quant': 'أرقام .. تحليلات .. قرارات أفضل',
  'tahsili-math': 'منطق دقيق .. لحلول أوسع',
  'tahsili-physics': 'اكتشف القوانين التي تحرك العالم',
  'tahsili-chemistry': 'مادة تصنع المستقبل',
  'tahsili-biology': 'استكشف أسرار الحياة'
};

function ensureArrow(card) {
  if (card.querySelector('.exam-subject-arrow')) return;
  const arrow = document.createElement('span');
  arrow.className = 'exam-subject-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = `<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>`;
  card.append(arrow);
}

function enhanceCard(card) {
  const subject = card?.dataset?.subject;
  const icon = card?.querySelector?.('.exam-subject-icon');
  if (!subject || !icon) return;
  if (subject !== 'qudurat-quant' && !SUBJECT_ART[subject]) return;

  const family = card.querySelector('small');
  if (family && FAMILY_LABELS[subject]) family.textContent = FAMILY_LABELS[subject];

  const description = card.querySelector('p');
  if (description && CARD_COPY[subject]) description.textContent = CARD_COPY[subject];

  if (icon.dataset.enhanced !== 'true') {
    icon.dataset.enhanced = 'true';
    icon.dataset.iconSubject = subject;
    icon.classList.add('neon-subject-icon');
    icon.setAttribute('aria-hidden', 'true');
    if (subject === 'qudurat-quant') {
      icon.classList.add('generated-quant-art');
      icon.innerHTML = QUANT_ART;
    } else {
      icon.classList.add('reference-subject-art');
      icon.innerHTML = `<img src="${SUBJECT_ART[subject]}" alt="" loading="eager" decoding="async">`;
    }
  }

  ensureArrow(card);
  card.classList.add('has-premium-subject-icon', 'glass-reference-card');
}

function enhanceAll(root = document) {
  if (root instanceof Element && root.matches('.exam-subject[data-subject]')) enhanceCard(root);
  root?.querySelectorAll?.('.exam-subject[data-subject]').forEach(enhanceCard);
}

function initialize() {
  enhanceAll(document);
  const host = document.getElementById('examSubjects') || document.body;
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) enhanceAll(node);
      }
    }
  });
  observer.observe(host, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
