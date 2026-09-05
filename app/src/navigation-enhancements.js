import './public-interface-policy.js';

const NAVIGATION_COVER_ID = 'neonNavigationCover';

function normalizePath(value) {
  return String(value || '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
}

function installNavigationCoverStyle() {
  if (document.getElementById('neonNavigationCoverStyle')) return;
  const style = document.createElement('style');
  style.id = 'neonNavigationCoverStyle';
  style.textContent = `
    .neon-navigation-cover{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:radial-gradient(circle at 50% 42%,rgba(91,111,255,.22),transparent 34%),linear-gradient(145deg,#06101f,#090b22 58%,#050914);color:#f7f9ff;opacity:1;visibility:visible;pointer-events:auto}
    .neon-navigation-cover-card{display:grid;justify-items:center;gap:14px;padding:26px 30px;text-align:center}
    .neon-navigation-cover-mark{width:58px;height:58px;display:grid;place-items:center;border-radius:19px;background:linear-gradient(135deg,#63e7ff,#956dff 55%,#ff70cf);color:#07101f;font:1000 24px/1 Tahoma,Arial,sans-serif;box-shadow:0 0 34px rgba(99,231,255,.22)}
    .neon-navigation-cover-loader{width:30px;height:30px;border:3px solid rgba(255,255,255,.12);border-top-color:#63e7ff;border-radius:50%;animation:neonNavigationSpin .72s linear infinite}
    .neon-navigation-cover p{margin:0;color:#aebbd6;font:700 12px/1.8 Tahoma,Arial,sans-serif}
    @keyframes neonNavigationSpin{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){.neon-navigation-cover-loader{animation:none}}
  `;
  document.head.appendChild(style);
}

function showNavigationCover(message = 'جارٍ فتح الصفحة…') {
  const boot = document.getElementById('bootOverlay');
  if (boot) {
    boot.dataset.navigationTransition = 'true';
    boot.classList.remove('hidden');
    boot.style.setProperty('opacity', '1', 'important');
    boot.style.setProperty('visibility', 'visible', 'important');
    boot.style.setProperty('pointer-events', 'auto', 'important');
    const text = boot.querySelector('p');
    if (text) text.textContent = message;
    return boot;
  }

  let cover = document.getElementById(NAVIGATION_COVER_ID);
  if (!cover) {
    installNavigationCoverStyle();
    cover = document.createElement('div');
    cover.id = NAVIGATION_COVER_ID;
    cover.className = 'neon-navigation-cover';
    cover.setAttribute('aria-live', 'polite');
    cover.setAttribute('aria-busy', 'true');
    cover.innerHTML = '<div class="neon-navigation-cover-card"><span class="neon-navigation-cover-mark">N</span><span class="neon-navigation-cover-loader" aria-hidden="true"></span><p></p></div>';
    document.body.appendChild(cover);
  }
  const text = cover.querySelector('p');
  if (text) text.textContent = message;
  return cover;
}

function hideNavigationCover() {
  document.getElementById(NAVIGATION_COVER_ID)?.remove();
  const boot = document.getElementById('bootOverlay');
  if (boot?.dataset.navigationTransition === 'true') {
    delete boot.dataset.navigationTransition;
    boot.style.removeProperty('opacity');
    boot.style.removeProperty('visibility');
    boot.style.removeProperty('pointer-events');
    boot.classList.add('hidden');
  }
}

function shouldMaskNavigation(event, link) {
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.hasAttribute('download') || link.target === '_blank') return false;
  const raw = link.getAttribute('href') || '';
  if (!raw || raw.startsWith('#') || raw.startsWith('javascript:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return false;

  let destination;
  try { destination = new URL(link.href, location.href); }
  catch { return false; }
  if (destination.origin !== location.origin) return false;

  const sameDocument = destination.pathname === location.pathname && destination.search === location.search;
  if (sameDocument) return false;
  return true;
}

function enhanceNavigation() {
  const current = normalizePath(location.pathname);

  document.querySelectorAll('.quick-nav,.main-nav').forEach(nav => {
    nav.querySelectorAll('a').forEach(link => {
      const href = normalizePath(new URL(link.href, location.origin).pathname);
      if (href === '/legacy/learning') link.href = '/learning';
      if (href === '/legacy/games') link.href = '/games';
      if (href === '/tutor') link.remove();
    });

    nav.querySelectorAll('a').forEach(link => {
      const href = normalizePath(new URL(link.href, location.origin).pathname);
      link.classList.toggle('active', href === current || (current === '/' && link.getAttribute('href') === '#home'));
    });
  });
}

function installTransitionMask() {
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!shouldMaskNavigation(event, link)) return;
    showNavigationCover();
  });

  window.addEventListener('beforeunload', () => showNavigationCover());
  window.addEventListener('pageshow', event => {
    if (event.persisted) hideNavigationCover();
  });

  window.NEON_NAVIGATION = {
    ...(window.NEON_NAVIGATION || {}),
    begin: showNavigationCover,
    end: hideNavigationCover
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    enhanceNavigation();
    installTransitionMask();
  }, { once:true });
} else {
  enhanceNavigation();
  installTransitionMask();
}
