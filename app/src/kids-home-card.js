const LAST_CENTER_KEY = 'neonAcademyLastCenterV1';
const KIDS_HREF = '/kids-games';

const kidsCardMarkup = `
  <div class="center-brand">NEON<small>LEARN • PLAY • BUILD</small></div>
  <span class="kids-center-badge">جديد</span>
  <div class="center-icon">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M35 9c10 4 17 12 20 22L36 50c-10-3-18-10-22-20L35 9Z"/>
      <circle cx="39" cy="25" r="5"/>
      <path d="m19 34-10 3 8 8M30 46l-3 10 9-5M13 51l-5 5M19 54l-2 5"/>
      <path d="m12 14 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z"/>
    </svg>
  </div>
  <h2>ألعاب الأطفال</h2>
  <div class="center-subtitle">Kids Learning Games</div>
  <p>18 لعبة تعليمية وترفيهية لتنمية اللغة والرياضيات والعلوم والبرمجة والإبداع.</p>
  <div class="center-footer">NEON</div>
`;

function addPrefetch(card) {
  let prefetched = false;
  const prefetch = () => {
    if (prefetched) return;
    prefetched = true;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = KIDS_HREF;
    document.head.appendChild(link);
  };
  card.addEventListener('pointerenter', prefetch, { once: true });
  card.addEventListener('touchstart', prefetch, { once: true, passive: true });
}

function mountKidsCard() {
  const grid = document.getElementById('centerGrid');
  if (!grid || grid.querySelector('[data-center="kids"]')) return Boolean(grid);

  const card = document.createElement('a');
  card.className = 'center-card';
  card.dataset.center = 'kids';
  card.href = KIDS_HREF;
  card.setAttribute('aria-label', 'فتح ألعاب الأطفال');
  card.innerHTML = kidsCardMarkup;

  const learningCard = grid.querySelector('[data-center="learning"]');
  if (learningCard) grid.insertBefore(card, learningCard);
  else grid.appendChild(card);

  card.addEventListener('click', () => localStorage.setItem(LAST_CENTER_KEY, KIDS_HREF));
  addPrefetch(card);

  const count = document.getElementById('heroCenterCount');
  if (count) count.textContent = Number(7).toLocaleString('ar-SA');

  const heading = document.querySelector('#centers .section-heading .eyebrow');
  if (heading) heading.textContent = 'SEVEN GRAND LEARNING CENTERS';
  return true;
}

if (!mountKidsCard()) {
  const observer = new MutationObserver(() => {
    if (mountKidsCard()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 15000);
}
