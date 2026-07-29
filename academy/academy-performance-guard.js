(() => {
  'use strict';

  if (window.__NEON_ACADEMY_PERFORMANCE_GUARD__) return;
  window.__NEON_ACADEMY_PERFORMANCE_GUARD__ = true;

  const runButton = document.getElementById('runCodeButton');
  const codeEditor = document.getElementById('codeEditor');
  const preview = document.getElementById('livePreview');
  const output = document.getElementById('consoleOutput');
  const feedback = document.getElementById('codeFeedback');
  const askButton = document.getElementById('askTeacherButton');
  const responsePanel = document.getElementById('teacherResponse');
  const modalElements = [...document.querySelectorAll('.modal-backdrop')];

  let activeWorker = null;
  let workerTimeout = null;
  let aiTimeout = null;

  injectPerformanceStyles();
  enableAdaptiveMode();
  bindSafeCodeRunner();
  bindServiceClickGuard();
  bindAiWatchdog();
  bindModalPerformanceMode();
  bindErrorRecovery();

  function injectPerformanceStyles() {
    if (document.getElementById('neonAcademyPerformanceStyles')) return;
    const style = document.createElement('style');
    style.id = 'neonAcademyPerformanceStyles';
    style.textContent = `
      .section-block{content-visibility:auto;contain-intrinsic-size:900px}
      body.neon-focus-mode .academy-orbit,
      body.neon-focus-mode .floating-node,
      body.neon-performance-lite .academy-orbit,
      body.neon-performance-lite .floating-node{animation-play-state:paused!important}
      body.neon-focus-mode .world-glow,
      body.neon-performance-lite .world-glow{filter:blur(55px);opacity:.07}
      body.neon-performance-lite .site-header{backdrop-filter:none;background:rgba(7,16,31,.97)}
      body.neon-performance-lite .lesson-card,
      body.neon-performance-lite .area-card,
      body.neon-performance-lite .action-card{box-shadow:0 12px 32px rgba(0,0,0,.24)}
      .neon-service-busy{pointer-events:none;opacity:.72}
      @media (prefers-reduced-motion:reduce){
        *,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
      }
    `;
    document.head.appendChild(style);
  }

  function enableAdaptiveMode() {
    const lowCpu = Number(navigator.hardwareConcurrency || 8) <= 4;
    const lowMemory = Number(navigator.deviceMemory || 8) <= 4;
    if (lowCpu || lowMemory || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      document.body.classList.add('neon-performance-lite');
    }
  }

  function activeLanguage() {
    return document.querySelector('.language-item.active')?.dataset.language || 'javascript';
  }

  function setCodeState(kind, message, consoleText = '') {
    if (feedback) {
      feedback.className = 'code-feedback';
      if (kind) feedback.classList.add(kind);
      feedback.textContent = message;
    }
    if (output && consoleText !== undefined) output.textContent = consoleText;
  }

  function resetWorker() {
    window.clearTimeout(workerTimeout);
    workerTimeout = null;
    if (activeWorker) {
      activeWorker.terminate();
      activeWorker = null;
    }
    if (runButton) {
      runButton.disabled = false;
      runButton.classList.remove('neon-service-busy');
      runButton.textContent = '▶ تشغيل وفحص';
    }
  }

  function bindSafeCodeRunner() {
    if (!runButton || !codeEditor || !preview) return;

    runButton.addEventListener('click', event => {
      const language = activeLanguage();
      if (!['html', 'css', 'javascript'].includes(language)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const code = codeEditor.value || '';
      if (!code.trim()) {
        setCodeState('error', 'اكتب كودًا أولًا.', 'Console ready…');
        return;
      }

      if (code.length > 60_000) {
        setCodeState('error', 'حجم الكود كبير جدًا للتشغيل الآمن داخل المتصفح.', 'تم إيقاف التنفيذ قبل البدء.');
        return;
      }

      resetWorker();
      runButton.disabled = true;
      runButton.classList.add('neon-service-busy');
      runButton.textContent = 'جارٍ التشغيل الآمن...';

      if (language === 'html' || language === 'css') {
        preview.setAttribute('sandbox', '');
        preview.srcdoc = code;
        setCodeState('success', 'تم تحديث المعاينة في وضع آمن مع تعطيل أكواد JavaScript داخل الصفحة.', 'Preview rendered safely.');
        resetWorker();
        return;
      }

      runJavaScriptInWorker(code);
    }, { capture: true });
  }

  function runJavaScriptInWorker(code) {
    const workerSource = `
      const logs = [];
      const serialize = value => {
        try {
          if (typeof value === 'string') return value;
          if (typeof value === 'undefined') return 'undefined';
          if (typeof value === 'function') return '[Function]';
          return JSON.stringify(value);
        } catch { return String(value); }
      };
      const push = (type, args) => {
        if (logs.length >= 100) return;
        logs.push(type + ': ' + args.map(serialize).join(' '));
      };
      self.console = {
        log: (...args) => push('LOG', args),
        info: (...args) => push('INFO', args),
        warn: (...args) => push('WARN', args),
        error: (...args) => push('ERROR', args)
      };
      self.onmessage = async event => {
        try {
          const runner = new Function('"use strict";\\n' + event.data.code);
          const result = runner();
          if (result && typeof result.then === 'function') await result;
          self.postMessage({ ok: true, logs });
        } catch (error) {
          self.postMessage({ ok: false, name: error?.name || 'Error', message: error?.message || String(error), logs });
        }
      };
    `;

    const blobUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
    activeWorker = new Worker(blobUrl);
    URL.revokeObjectURL(blobUrl);

    activeWorker.onmessage = event => {
      const result = event.data || {};
      const logs = Array.isArray(result.logs) ? result.logs.join('\n').slice(0, 40_000) : '';
      if (result.ok) {
        preview.setAttribute('sandbox', '');
        preview.srcdoc = '<!doctype html><html lang="ar" dir="rtl"><body style="font-family:Tahoma,Arial;display:grid;place-items:center;min-height:100vh;margin:0;background:#f4f7fb;color:#172033"><h2>تم تنفيذ JavaScript في بيئة معزولة وآمنة</h2></body></html>';
        setCodeState('success', 'تم تنفيذ JavaScript دون السماح للكود بتعليق الصفحة الرئيسية.', logs || 'Executed without console output.');
      } else {
        setCodeState('error', 'يوجد خطأ في الكود. راجع رسالة وحدة التحكم.', `${result.name || 'Error'}: ${result.message || 'Unknown error'}${logs ? `\n${logs}` : ''}`);
      }
      resetWorker();
    };

    activeWorker.onerror = event => {
      setCodeState('error', 'تعذر تشغيل الكود داخل البيئة الآمنة.', `${event.message || 'Worker error'}`);
      resetWorker();
    };

    activeWorker.postMessage({ code });
    workerTimeout = window.setTimeout(() => {
      setCodeState('error', 'تم إيقاف الكود لأنه تجاوز مهلة التنفيذ الآمنة.', 'Execution stopped after 2 seconds. Check for an infinite loop or very heavy operation.');
      resetWorker();
    }, 2_000);
  }

  function bindServiceClickGuard() {
    const selector = [
      '#examButton', '#escapeButton', '#dailyButton', '#dailyActionButton',
      '#continueButton', '#certificateButton', '#startPlanButton',
      '[data-exam-preset]', '[data-room]'
    ].join(',');

    document.addEventListener('click', event => {
      const button = event.target.closest?.(selector);
      if (!button) return;
      const now = Date.now();
      const lockedUntil = Number(button.dataset.neonLockedUntil || 0);
      if (lockedUntil > now) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      button.dataset.neonLockedUntil = String(now + 650);
    }, true);
  }

  function bindAiWatchdog() {
    if (!askButton) return;

    askButton.addEventListener('click', () => {
      window.clearTimeout(aiTimeout);
      aiTimeout = window.setTimeout(() => {
        if (!askButton.classList.contains('ai-busy')) return;
        askButton.click();
        if (responsePanel) {
          responsePanel.innerHTML = '<div class="teacher-answer real-ai-answer ai-inline-error"><span class="eyebrow">انتهت المهلة</span><h3>تم إيقاف الطلب بعد 45 ثانية لحماية استجابة الصفحة.</h3><p>أعد المحاولة بسؤال أقصر أو تحقق من اتصال الإنترنت.</p></div>';
        }
      }, 45_000);
    }, { capture: true });

    const observer = new MutationObserver(() => {
      const busy = askButton.classList.contains('ai-busy');
      document.body.classList.toggle('neon-focus-mode', busy || hasOpenModal());
      if (!busy) window.clearTimeout(aiTimeout);
    });
    observer.observe(askButton, { attributes: true, childList: true, subtree: true });
  }

  function hasOpenModal() {
    return modalElements.some(modal => !modal.classList.contains('hidden'));
  }

  function syncModalPerformanceMode() {
    const open = hasOpenModal();
    const aiBusy = Boolean(askButton?.classList.contains('ai-busy'));
    document.body.classList.toggle('neon-focus-mode', open || aiBusy);
    if (!open && document.body.style.overflow === 'hidden') document.body.style.overflow = '';
  }

  function bindModalPerformanceMode() {
    if (!modalElements.length) return;
    const observer = new MutationObserver(syncModalPerformanceMode);
    modalElements.forEach(modal => observer.observe(modal, { attributes: true, attributeFilter: ['class'] }));
    syncModalPerformanceMode();
  }

  function bindErrorRecovery() {
    window.addEventListener('pagehide', resetWorker);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && activeWorker) resetWorker();
    });

    window.addEventListener('unhandledrejection', () => {
      window.setTimeout(syncModalPerformanceMode, 0);
    });
    window.addEventListener('error', () => {
      window.setTimeout(syncModalPerformanceMode, 0);
    });

    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver(list => {
          const longTasks = list.getEntries().filter(entry => entry.duration >= 250);
          if (longTasks.length) {
            console.warn('[NEON Academy] Long task detected', longTasks.map(entry => Math.round(entry.duration)));
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {}
    }
  }
})();
