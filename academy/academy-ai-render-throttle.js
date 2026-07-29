(() => {
  'use strict';

  if (window.__NEON_AI_RENDER_THROTTLE__) return;
  window.__NEON_AI_RENDER_THROTTLE__ = true;

  const panel = document.getElementById('teacherResponse');
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (!panel || !descriptor?.get || !descriptor?.set) return;

  let pendingMarkup = '';
  let timer = null;
  const frameDelay = 90;

  function applyPending() {
    timer = null;
    if (!pendingMarkup) return;
    descriptor.set.call(panel, pendingMarkup);
    pendingMarkup = '';
  }

  Object.defineProperty(panel, 'innerHTML', {
    configurable: true,
    enumerable: false,
    get() {
      return descriptor.get.call(panel);
    },
    set(value) {
      const markup = String(value ?? '');
      const streaming = markup.includes('typing-caret') || markup.includes('Gemini يكتب الآن');

      if (!streaming) {
        window.clearTimeout(timer);
        timer = null;
        pendingMarkup = '';
        descriptor.set.call(panel, markup);
        return;
      }

      pendingMarkup = markup;
      if (!timer) timer = window.setTimeout(applyPending, frameDelay);
    }
  });

  window.addEventListener('pagehide', () => {
    window.clearTimeout(timer);
    timer = null;
    pendingMarkup = '';
  });
})();
