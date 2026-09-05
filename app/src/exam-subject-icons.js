import './exam-subject-icons.css';

const ICONS = {
  'qudurat-verbal': `<svg viewBox="0 0 120 120" role="img" aria-label="القدرات اللفظية">
    <path d="M18 36c15-7 29-5 42 5v55c-13-10-27-12-42-6V36Z"/>
    <path d="M102 36c-15-7-29-5-42 5v55c13-10 27-12 42-6V36Z"/>
    <path d="M29 52c9-3 17-1 24 3M29 64c9-3 17-1 24 3M91 52c-9-3-17-1-24 3M91 64c-9-3-17-1-24 3"/>
    <path d="M80 29c13-11 21-14 27-12-2 9-8 18-19 28l-12 5 4-21Z"/>
    <path d="M30 24h8M34 20v8M48 18l5 6M66 19h8M70 16v7"/>
  </svg>`,
  'tahsili-biology': `<svg viewBox="0 0 120 120" role="img" aria-label="أحياء التحصيلي">
    <path d="M43 20c28 14 28 66 0 80M73 20c-28 14-28 66 0 80"/>
    <path d="M45 32h26M39 46h38M39 72h38M45 86h26"/>
    <path d="M80 22c15-5 24 3 20 18-15 4-24-4-20-18ZM20 64c17-4 27 5 22 22-17 3-27-6-22-22Z"/>
    <path d="M35 75c-9 6-15 14-18 23M85 35c8 6 13 12 17 20"/>
    <path d="M91 72h13M94 72v24M101 72v24M90 96h15M94 82h7"/>
    <circle cx="96" cy="63" r="4"/>
  </svg>`,
  'tahsili-chemistry': `<svg viewBox="0 0 120 120" role="img" aria-label="كيمياء التحصيلي">
    <path d="M18 22h28M26 22v31L13 88a10 10 0 0 0 9 14h31a10 10 0 0 0 9-14L46 53V22"/>
    <path d="M20 82h36M25 71h26"/>
    <circle cx="82" cy="38" r="7"/>
    <ellipse cx="82" cy="38" rx="22" ry="9"/>
    <ellipse cx="82" cy="38" rx="22" ry="9" transform="rotate(60 82 38)"/>
    <ellipse cx="82" cy="38" rx="22" ry="9" transform="rotate(120 82 38)"/>
    <path d="M83 61v13M72 78h24M75 78v23h18V78M79 90h10"/>
  </svg>`,
  'tahsili-math': `<svg viewBox="0 0 120 120" role="img" aria-label="رياضيات التحصيلي">
    <path d="M18 22h31L32 39l17 17H18"/>
    <path d="M60 24h14l8 16 11-28"/>
    <path d="M19 91l14-24 14 24H19Z"/>
    <path d="M56 72l15-9 15 9v18l-15 9-15-9V72Z"/>
    <circle cx="99" cy="90" r="12"/>
    <path d="M99 78v12l8 5"/>
  </svg>`,
  'tahsili-physics': `<svg viewBox="0 0 120 120" role="img" aria-label="فيزياء التحصيلي">
    <circle cx="60" cy="60" r="8"/>
    <ellipse cx="60" cy="60" rx="42" ry="17"/>
    <ellipse cx="60" cy="60" rx="42" ry="17" transform="rotate(60 60 60)"/>
    <ellipse cx="60" cy="60" rx="42" ry="17" transform="rotate(120 60 60)"/>
    <circle cx="96" cy="60" r="4"/>
    <circle cx="39" cy="27" r="4"/>
    <circle cx="39" cy="93" r="4"/>
  </svg>`,
  'qudurat-quant': `<svg viewBox="0 0 120 120" role="img" aria-label="القدرات الكمية">
    <path d="M18 51h12v26H18V51ZM36 40h12v37H36V40ZM54 27h12v50H54V27Z"/>
    <path d="M17 31c13-2 23-7 33-17 7 5 14 5 23-4"/>
    <path d="M66 10h9v9"/>
    <text x="82" y="34" font-size="20" font-family="Arial, sans-serif" font-weight="700" fill="currentColor" stroke="none">1</text>
    <text x="94" y="49" font-size="20" font-family="Arial, sans-serif" font-weight="700" fill="currentColor" stroke="none">2</text>
    <text x="80" y="64" font-size="20" font-family="Arial, sans-serif" font-weight="700" fill="currentColor" stroke="none">3</text>
    <rect x="16" y="85" width="34" height="25" rx="4"/>
    <path d="M22 91h22M23 99h5M32 99h5M41 99h4M23 106h5M32 106h5M41 106h4"/>
    <rect x="59" y="83" width="45" height="29" rx="4"/>
    <path d="M67 91h29M67 98h29M67 105h29M76 88v6M87 95v6M72 102v6"/>
  </svg>`
};

const FAMILY_LABELS = {
  'qudurat-verbal': 'القدرات العامة',
  'qudurat-quant': 'القدرات العامة',
  'tahsili-math': 'التحصيلي',
  'tahsili-physics': 'التحصيلي',
  'tahsili-chemistry': 'التحصيلي',
  'tahsili-biology': 'التحصيلي'
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
  const markup = ICONS[subject];
  if (!markup) return;

  const family = card.querySelector('small');
  if (family && FAMILY_LABELS[subject]) family.textContent = FAMILY_LABELS[subject];

  if (icon.dataset.enhanced !== 'true') {
    icon.dataset.enhanced = 'true';
    icon.dataset.iconSubject = subject;
    icon.classList.add('neon-subject-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = markup;
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
