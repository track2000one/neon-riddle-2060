(()=>{
'use strict';

const LEGACY_ROOTS = new Set(['/legacy','/legacy/','/legacy/index.html','/legacy/auth.html']);
let pendingAuthNavigation = '';
let navigationStarted = false;

function safeDestination() {
  const params = new URLSearchParams(location.search);
  const rawNext = params.get('next');
  if (!rawNext) return '/';

  try {
    const decoded = decodeURIComponent(rawNext);
    const destination = new URL(decoded, location.origin);
    if (destination.origin !== location.origin) return '/';
    const normalizedPath = destination.pathname.replace(/\/{2,}/g, '/');
    if (LEGACY_ROOTS.has(normalizedPath)) return '/';
    if (normalizedPath === '/auth' || normalizedPath === '/auth.html') return '/';
    return `${normalizedPath}${destination.search}${destination.hash}` || '/';
  } catch {
    return '/';
  }
}

function goToModernPortal() {
  if (navigationStarted) return;
  navigationStarted = true;
  location.replace(safeDestination());
}

function normalizePortalLinks() {
  const destination = safeDestination();
  document.querySelector('#signedInPanel .primary-button')?.setAttribute('href', destination);
  document.querySelector('.auth-brand')?.setAttribute('href', '/');
  document.querySelector('.auth-footer a:first-child')?.setAttribute('href', '/');
}

function armNavigation(type) {
  pendingAuthNavigation = type;
}

document.getElementById('loginForm')?.addEventListener('submit', () => armNavigation('login'), { capture:true });
document.getElementById('registerForm')?.addEventListener('submit', () => armNavigation('register'), { capture:true });

const toast = document.getElementById('toast');
if (toast) {
  const observer = new MutationObserver(() => {
    if (pendingAuthNavigation !== 'login') return;
    if (!toast.classList.contains('show')) return;
    if (!/تم تسجيل الدخول بنجاح|signed in successfully|login successful/i.test(toast.textContent || '')) return;
    goToModernPortal();
  });
  observer.observe(toast, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['class'] });
}

const registerMessage = document.getElementById('registerMessage');
if (registerMessage) {
  const observer = new MutationObserver(() => {
    if (pendingAuthNavigation !== 'register') return;
    if (!registerMessage.classList.contains('success')) return;
    if (!registerMessage.textContent.trim()) return;
    goToModernPortal();
  });
  observer.observe(registerMessage, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['class'] });
}

normalizePortalLinks();
window.addEventListener('pageshow', normalizePortalLinks);
})();