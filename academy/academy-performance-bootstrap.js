(() => {
  'use strict';

  if (window.__NEON_PERFORMANCE_BOOTSTRAP__) return;
  window.__NEON_PERFORMANCE_BOOTSTRAP__ = true;

  const NativeMutationObserver = window.MutationObserver;
  if (typeof NativeMutationObserver !== 'function') return;

  const scheduleFrame = window.requestAnimationFrame
    ? callback => window.requestAnimationFrame(callback)
    : callback => window.setTimeout(callback, 16);

  class BatchedMutationObserver {
    constructor(callback) {
      let queuedMutations = [];
      let scheduled = false;

      this._observer = new NativeMutationObserver(mutations => {
        queuedMutations.push(...mutations);
        if (scheduled) return;
        scheduled = true;

        scheduleFrame(() => {
          scheduled = false;
          const batch = queuedMutations;
          queuedMutations = [];
          if (batch.length) callback(batch, this);
        });
      });
    }

    observe(target, options) {
      return this._observer.observe(target, options);
    }

    disconnect() {
      return this._observer.disconnect();
    }

    takeRecords() {
      return this._observer.takeRecords();
    }
  }

  window.MutationObserver = BatchedMutationObserver;
})();
