(() => {
  'use strict';

  if (window.__NEON_ADMIN_NETWORK_GUARD__) return;
  window.__NEON_ADMIN_NETWORK_GUARD__ = true;

  const nativeFetch = window.fetch.bind(window);
  const protectedHost = 'neon-riddle-2060-backend-production.up.railway.app';
  const timeoutMs = 18_000;

  window.fetch = async function guardedFetch(resource, options = {}) {
    const url = typeof resource === 'string' ? resource : resource?.url || '';
    if (!String(url).includes(protectedHost)) return nativeFetch(resource, options);

    const controller = new AbortController();
    const originalSignal = options.signal;
    const abortFromOriginal = () => controller.abort(originalSignal?.reason);

    if (originalSignal) {
      if (originalSignal.aborted) controller.abort(originalSignal.reason);
      else originalSignal.addEventListener('abort', abortFromOriginal, { once: true });
    }

    const timer = window.setTimeout(() => controller.abort('railway-timeout'), timeoutMs);

    try {
      return await nativeFetch(resource, { ...options, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted && !originalSignal?.aborted) {
        const timeoutError = new Error('انتهت مهلة الاتصال بخدمة Railway. أعد المحاولة بعد لحظات؛ قد تكون الخدمة في مرحلة الاستيقاظ.');
        timeoutError.code = 'RAILWAY_TIMEOUT';
        throw timeoutError;
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
      originalSignal?.removeEventListener?.('abort', abortFromOriginal);
    }
  };

  if (!document.querySelector('script[data-content-audit-loader]')) {
    const auditScript = document.createElement('script');
    auditScript.src = 'content-audit.js';
    auditScript.async = false;
    auditScript.dataset.contentAuditLoader = 'true';
    document.head.appendChild(auditScript);
  }

  if (!document.querySelector('script[data-admin-reports-loader]')) {
    const reportsScript = document.createElement('script');
    reportsScript.src = 'admin-reports.js';
    reportsScript.async = false;
    reportsScript.dataset.adminReportsLoader = 'true';
    document.head.appendChild(reportsScript);
  }
})();