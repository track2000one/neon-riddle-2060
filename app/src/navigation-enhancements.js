import './public-interface-policy.js';

function normalizePath(value) {
  return String(value || '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceNavigation, { once:true });
} else {
  enhanceNavigation();
}
