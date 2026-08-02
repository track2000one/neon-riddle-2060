(() => {
  'use strict';

  if (window.__MSAR_NEON_ADMIN_BRAND__) return;
  window.__MSAR_NEON_ADMIN_BRAND__ = true;

  const BRAND_AR = 'مسار نيون';
  const BRAND_EN = 'MSAR NEON';

  function replaceStandaloneNeon(value) {
    const hasArabic = /[\u0600-\u06ff]/.test(value);
    const replacement = hasArabic ? BRAND_AR : BRAND_EN;
    return value.replace(/\bNEON\b/g, (match, offset, source) => {
      const prefix = source.slice(Math.max(0, offset - 7), offset).toUpperCase();
      return /(?:MASAR|MSAR) $/.test(prefix) ? match : replacement;
    });
  }

  function replaceValue(input) {
    let value = String(input ?? '')
      .replaceAll('MASAR NEON', BRAND_EN)
      .replaceAll('NEON RIDDLE 2060', BRAND_EN)
      .replaceAll('NEON ACADEMY 2060', BRAND_EN)
      .replaceAll('NEON Academy 2060', BRAND_EN)
      .replaceAll('NEON ACADEMY', BRAND_EN)
      .replaceAll('NEON Academy', BRAND_EN)
      .replaceAll('NEON ADMIN', `${BRAND_EN} ADMIN`)
      .replaceAll('CONTROL CENTER 2060', 'ADMIN CONTROL CENTER');
    return replaceStandaloneNeon(value);
  }

  function replaceText(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const next = replaceValue(node.nodeValue || '');
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  function applyAdminBrand(root = document) {
    document.title = `${BRAND_AR} | لوحة المسؤول`;

    const loginBrand = document.querySelector('.login-showcase h1 span');
    if (loginBrand) loginBrand.textContent = BRAND_EN;

    const adminBrand = document.querySelector('.admin-brand strong');
    if (adminBrand) adminBrand.textContent = `${BRAND_EN} ADMIN`;

    const adminSubtitle = document.querySelector('.admin-brand small');
    if (adminSubtitle) adminSubtitle.textContent = 'ADMIN CONTROL CENTER';

    document.querySelectorAll('.orbit-core,.admin-brand-mark').forEach(mark => {
      if (mark.textContent?.trim() === 'N') mark.textContent = 'MN';
    });

    replaceText(root === document ? document.body : root);

    document.querySelectorAll('[aria-label],[title],[alt]').forEach(element => {
      ['aria-label', 'title', 'alt'].forEach(attribute => {
        if (!element.hasAttribute(attribute)) return;
        const current = element.getAttribute(attribute) || '';
        const next = replaceValue(current);
        if (next !== current) element.setAttribute(attribute, next);
      });
    });
  }

  function injectBrandStyles() {
    if (document.getElementById('msarNeonAdminBrandStyles')) return;
    const style = document.createElement('style');
    style.id = 'msarNeonAdminBrandStyles';
    style.textContent = `
      .admin-brand strong{letter-spacing:.05em!important;white-space:nowrap}
      .admin-brand small{letter-spacing:.12em!important}
      .orbit-core,.admin-brand-mark{font-size:.82em!important;letter-spacing:-.08em}
      .login-showcase h1 span{letter-spacing:.04em}
    `;
    document.head.appendChild(style);
  }

  function start() {
    injectBrandStyles();
    applyAdminBrand();
    new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) applyAdminBrand(node);
        if (node.nodeType === Node.TEXT_NODE) {
          const next = replaceValue(node.nodeValue || '');
          if (next !== node.nodeValue) node.nodeValue = next;
        }
      }));
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();