const CDN_VERSION = '4.2.3';
const DATA_PATH = `https://cdn.emulatorjs.org/${CDN_VERSION}/data/`;
let started = false;
let startupTimer = null;

function notify(type, payload = {}) {
  try { window.parent.postMessage({ type, ...payload }, window.location.origin); }
  catch {}
}

function fail(message, detail = '') {
  notify('msar-atari-status', { level: 'error', message, detail });
}

function safeName(file) {
  return String(file?.name || 'atari2600').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 80) || 'atari2600';
}

function boot(file) {
  if (started || !(file instanceof File)) return;
  started = true;
  document.body.classList.add('running');
  notify('msar-atari-status', { level: 'info', message: 'جارٍ تحميل محرك Stella 2014…' });

  window.EJS_player = '#game';
  window.EJS_core = 'stella2014';
  window.EJS_gameUrl = file;
  window.EJS_gameName = safeName(file);
  window.EJS_pathtodata = DATA_PATH;
  window.EJS_startOnLoaded = true;
  window.EJS_threads = false;
  window.EJS_disableAutoLang = false;
  window.EJS_askBeforeExit = false;
  window.EJS_DEBUG_XX = true;
  window.EJS_ready = () => notify('msar-atari-status', { level: 'success', message: 'تم تحميل واجهة المحاكي بنجاح.' });
  window.EJS_onGameStart = () => {
    clearTimeout(startupTimer);
    notify('msar-atari-status', { level: 'success', message: 'تم تشغيل ROM بنجاح عبر Stella 2014.' });
  };
  window.EJS_onExit = () => notify('msar-atari-status', { level: 'info', message: 'تم إيقاف جلسة المحاكاة.' });

  const loader = document.createElement('script');
  loader.src = `${DATA_PATH}loader.js`;
  loader.async = true;
  loader.onerror = () => fail('تعذر تحميل EmulatorJS من شبكة CDN.', loader.src);
  document.body.appendChild(loader);

  startupTimer = window.setTimeout(() => {
    notify('msar-atari-status', {
      level: 'error',
      message: 'لم يبدأ محرك Atari خلال المهلة. أعد المحاولة أو افحص اتصال المتصفح بـ EmulatorJS CDN.'
    });
  }, 18000);
}

window.addEventListener('message', event => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== 'msar-atari-load') return;
  boot(event.data.file);
});

window.addEventListener('error', event => {
  if (!started) return;
  fail('حدث خطأ أثناء تحميل محرك المحاكاة.', event.message || 'Unknown error');
});

window.addEventListener('unhandledrejection', event => {
  if (!started) return;
  const detail = event.reason instanceof Error ? event.reason.message : String(event.reason || 'Unknown rejection');
  fail('تعذر إكمال تشغيل محرك المحاكاة.', detail);
});

notify('msar-atari-player-ready', { version: CDN_VERSION });
