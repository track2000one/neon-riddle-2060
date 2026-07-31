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
    });

    let tutor = [...nav.querySelectorAll('a')].find(link => normalizePath(new URL(link.href, location.origin).pathname) === '/tutor');
    if (!tutor) {
      tutor = document.createElement('a');
      tutor.href = '/tutor';
      tutor.textContent = 'المعلم الذكي';
      const examsLink = [...nav.querySelectorAll('a')].find(link => normalizePath(new URL(link.href, location.origin).pathname) === '/exams');
      if (examsLink) nav.insertBefore(tutor, examsLink);
      else nav.appendChild(tutor);
    }

    nav.querySelectorAll('a').forEach(link => {
      const href = normalizePath(new URL(link.href, location.origin).pathname);
      if (current === '/tutor') link.classList.toggle('active', href === '/tutor');
    });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceNavigation, { once:true });
else enhanceNavigation();
