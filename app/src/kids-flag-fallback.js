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

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .runtime-visual.world-flag-visual {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      min-height: 92px;
      font-size: 2.4rem;
    }
    .runtime-visual .world-country-flag {
      display: block;
      width: min(170px, 44vw);
      height: auto;
      max-height: 104px;
      object-fit: contain;
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, .24), 0 0 0 1px rgba(255,255,255,.18);
      background: rgba(255,255,255,.96);
    }
    .runtime-visual .world-visual-emoji {
      line-height: 1;
      font-size: clamp(2rem, 5vw, 3.25rem);
    }
    .runtime-visual .world-flag-fallback {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 132px;
      min-height: 72px;
      padding: 10px 18px;
      border-radius: 16px;
      font-size: 1.15rem;
      font-weight: 800;
      background: linear-gradient(135deg, rgba(84,205,255,.18), rgba(145,92,255,.2));
      border: 1px solid rgba(255,255,255,.2);
    }
  `;
  document.head.appendChild(style);
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

function scan(root = document) {
  if (root instanceof HTMLElement && root.matches('.runtime-visual')) renderFlag(root);
  root.querySelectorAll?.('.runtime-visual').forEach(renderFlag);
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
