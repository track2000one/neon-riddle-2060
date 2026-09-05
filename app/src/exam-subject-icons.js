import './exam-subject-icons.css';
import './exam-subject-reference-art.css';

const SUBJECT_THEME = {
  'qudurat-verbal': { a:'#c7c0ff', b:'#897cff', glow:'#a79aff' },
  'qudurat-quant': { a:'#d9f4ff', b:'#69b8ff', glow:'#72bfff' },
  'tahsili-math': { a:'#fff0c8', b:'#efb75e', glow:'#f1bd64' },
  'tahsili-physics': { a:'#d9fff2', b:'#58d8bd', glow:'#63dfc2' },
  'tahsili-chemistry': { a:'#e2f4ff', b:'#62baff', glow:'#75c2ff' },
  'tahsili-biology': { a:'#d9fff0', b:'#55d7b1', glow:'#62deb9' }
};

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

function iconMarkup(subject) {
  const t = SUBJECT_THEME[subject];
  if (!t) return '';
  const id = subject.replace(/[^a-z0-9]/gi, '');
  const commonStart = `<svg viewBox="0 0 180 150" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="glass-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.a}" stop-opacity=".43"/><stop offset=".52" stop-color="${t.b}" stop-opacity=".18"/><stop offset="1" stop-color="#214a8e" stop-opacity=".22"/></linearGradient>
      <linearGradient id="line-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${t.a}"/></linearGradient>
      <filter id="glow-${id}" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse cx="90" cy="132" rx="62" ry="9" fill="${t.glow}" opacity=".16"/>
    <rect x="28" y="12" width="124" height="116" rx="24" fill="url(#glass-${id})" stroke="${t.a}" stroke-opacity=".76" stroke-width="2"/>
    <rect x="35" y="19" width="110" height="102" rx="19" fill="none" stroke="${t.b}" stroke-opacity=".46"/>
    <g fill="none" stroke="url(#line-${id})" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-${id})">`;
  const commonEnd = `</g></svg>`;

  const drawings = {
    'qudurat-quant': `<path d="M48 70h13v28H48zM68 57h13v41H68zM88 43h13v55H88z"/><path d="M47 50c16-2 28-8 40-20 8 5 16 5 26-5"/><path d="M106 25h10v10"/><rect x="46" y="104" width="38" height="16" rx="4"/><path d="M53 110h24M55 116h5M64 116h5M73 116h4"/><rect x="92" y="102" width="38" height="18" rx="4"/><path d="M98 108h26M98 114h26M104 105v6M116 111v6"/></g><g fill="#eef9ff" font-family="Arial,sans-serif" font-weight="700" font-size="23" filter="url(#glow-${id})"><text x="116" y="50">1</text><text x="130" y="70">2</text><text x="113" y="91">3</text></g><g>` ,
    'qudurat-verbal': `<path d="M49 61c12-7 24-6 39 2v38c-15-8-27-9-39-2zM131 61c-12-7-24-6-39 2v38c15-8 27-9 39-2z"/><path d="M90 64v38M57 72c8-3 16-2 25 2M57 82c8-3 16-2 25 2M123 72c-8-3-16-2-25 2M123 82c-8-3-16-2-25 2"/><path d="M113 47c8-9 14-13 19-13-2 8-7 16-18 23l-10 4"/><path d="M109 52l8 8"/></g><g fill="#f7f4ff" font-family="Tahoma,Arial" font-weight="700" font-size="15" filter="url(#glow-${id})"><text x="53" y="48">أ</text><text x="76" y="43">ب</text><text x="94" y="48">ج</text></g><g>`,
    'tahsili-math': `<path d="M49 42h28L59 63l18 21H49M93 44l10 15 11-15"/><path d="M96 84l14-23h24"/><path d="M50 93h25v24H50z"/><circle cx="99" cy="105" r="12"/><path d="M121 116l12-26 12 26z"/><path d="M126 109h14"/>`,
    'tahsili-physics': `<ellipse cx="90" cy="73" rx="43" ry="17"/><ellipse cx="90" cy="73" rx="43" ry="17" transform="rotate(60 90 73)"/><ellipse cx="90" cy="73" rx="43" ry="17" transform="rotate(120 90 73)"/><circle cx="90" cy="73" r="8"/><circle cx="126" cy="62" r="3" fill="currentColor" stroke="none"/><circle cx="61" cy="52" r="3" fill="currentColor" stroke="none"/><circle cx="76" cy="108" r="3" fill="currentColor" stroke="none"/>`,
    'tahsili-chemistry': `<path d="M48 48h20M55 48v20L41 103c-3 8 2 14 10 14h31c8 0 13-6 10-14L77 68V48"/><path d="M48 91h37M48 91c7 5 14 4 20 0 6-4 12-4 18 0"/><path d="M121 50v47M111 50h20M113 98h16"/><ellipse cx="104" cy="68" rx="25" ry="9"/><ellipse cx="104" cy="68" rx="25" ry="9" transform="rotate(60 104 68)"/><ellipse cx="104" cy="68" rx="25" ry="9" transform="rotate(120 104 68)"/><circle cx="104" cy="68" r="4"/>`,
    'tahsili-biology': `<path d="M62 43c26 8 52 53 64 75M118 43c-26 8-52 53-64 75"/><path d="M68 55h42M61 70h58M59 86h61M69 101h42"/><path d="M53 61c-13-8-20-16-21-25 11 1 20 7 27 18M128 56c11-8 18-16 20-24-11 0-20 6-27 17"/><path d="M122 82c10 1 18 6 23 15-10 3-19 0-27-8"/><path d="M115 87v22M107 109h16M126 88l7 19M132 107h8"/>`
  };

  return commonStart + drawings[subject] + commonEnd;
}

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
  if (!subject || !icon || !SUBJECT_THEME[subject]) return;

  const family = card.querySelector('small');
  if (family && FAMILY_LABELS[subject]) family.textContent = FAMILY_LABELS[subject];

  const description = card.querySelector('p');
  if (description && CARD_COPY[subject]) description.textContent = CARD_COPY[subject];

  if (icon.dataset.enhanced !== 'true') {
    icon.dataset.enhanced = 'true';
    icon.dataset.iconSubject = subject;
    icon.classList.add('neon-subject-icon', 'generated-crystal-art');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = iconMarkup(subject);
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
