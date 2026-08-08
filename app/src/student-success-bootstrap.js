function mountForPage(session) {
  if (!session) return;
  if (document.body.classList.contains('portal-home') || location.pathname === '/' || location.pathname.endsWith('/index.html')) {
    import('./student-success.js')
      .then(module => module.mountStudentSuccess(session))
      .catch(error => console.warn('Student success dashboard unavailable:', error));
  }
}

window.addEventListener('neon-auth-session', event => mountForPage(event.detail));
if (window.NEON_AUTH_SESSION) mountForPage(window.NEON_AUTH_SESSION);
