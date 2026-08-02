import './styles.css';
import { ensureAuth, renderAccount } from './auth.js';

const statusElement = document.getElementById('loadStatus');
const progressElement = document.getElementById('loadProgress');
const overlay = document.getElementById('bootOverlay');

function setProgress(percent, message) {
  if (progressElement) progressElement.style.width = `${percent}%`;
  if (statusElement) statusElement.textContent = message;
}

function loadClassicScript(src, { optional = false, timeout = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(script => script.src === new URL(src, document.baseURI).href);
    if (existing?.dataset.loaded === 'true') return resolve(true);

    const script = existing || document.createElement('script');
    const timer = setTimeout(() => {
      if (optional) resolve(false);
      else reject(new Error(`STEP_LOAD_TIMEOUT:${src}`));
    }, timeout);

    script.src = src;
    script.async = false;
    script.onload = () => {
      clearTimeout(timer);
      script.dataset.loaded = 'true';
      resolve(true);
    };
    script.onerror = () => {
      clearTimeout(timer);
      if (optional) resolve(false);
      else reject(new Error(`STEP_LOAD_FAILED:${src}`));
    };
    if (!existing) document.body.appendChild(script);
  });
}

async function loadScriptsInOrder(files) {
  for (const file of files) await loadClassicScript(file, { timeout: 12000 });
}

function waitForStepInterface(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('#stepAcademy .step-shell');
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const section = document.querySelector('#stepAcademy .step-shell');
      if (!section) return;
      observer.disconnect();
      resolve(section);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error('STEP_INTERFACE_TIMEOUT'));
    }, timeout);
  });
}

async function boot() {
  try {
    setProgress(8, 'جارٍ التحقق من حساب الطالب…');
    const session = await ensureAuth();
    renderAccount(session);

    setProgress(22, 'جارٍ تجهيز الدروس والتدريبات…');
    const masteryDataPromise = loadScriptsInOrder([
      '/legacy/step-book-kafayat-1-lessons.js',
      '/legacy/step-book-kafayat-1-models-1-2.js',
      '/legacy/step-book-kafayat-1-models-3-4.js',
      '/legacy/step-book-kafayat-1-models-5-6.js',
      '/legacy/step-book-kafayat-1-model-7.js',
      '/legacy/step-book-kafayat-1-listening.js',
      '/legacy/step-mastery-lessons.js',
      '/legacy/step-mastery-questions.js'
    ]);

    const dataPromise = loadClassicScript('/legacy/step-academy-data.js', {
      optional: true,
      timeout: 9000
    });

    await masteryDataPromise;
    setProgress(48, 'اكتمل تجهيز المحتوى الأساسي…');

    await Promise.race([
      dataPromise,
      new Promise(resolve => setTimeout(() => resolve(false), 1400))
    ]);

    setProgress(63, 'جارٍ إعداد مسار STEP…');
    await loadClassicScript('/legacy/step-academy-runtime.js', { timeout: 10000 });
    await waitForStepInterface();

    setProgress(80, 'جارٍ إعداد مكتبة الإتقان…');
    await loadClassicScript('/legacy/step-book-kafayat-1-runtime.js', { timeout: 10000 });

    setProgress(94, 'المسار جاهز للاستخدام…');
    overlay?.classList.add('hidden');
    document.getElementById('stepIntro')?.remove();

    dataPromise.then(loaded => {
      if (loaded) {
        window.dispatchEvent(new CustomEvent('neon-step-data-loaded'));
      }
      setProgress(100, 'اكتمل تجهيز مركز STEP.');
    });
  } catch (error) {
    console.error('NEON STEP boot error:', error);
    overlay?.classList.add('hidden');
    setProgress(100, 'تعذر فتح المسار بالكامل.');
    const root = document.getElementById('stepRoot');
    root?.insertAdjacentHTML('beforeend', `
      <section class="center-intro">
        <h2>تعذر تحميل مركز STEP</h2>
        <p>تعذر إكمال تجهيز المسار حاليًا. أعد المحاولة بعد قليل.</p>
        <p><button onclick="location.reload()">إعادة المحاولة</button> أو <a href="/">العودة إلى المراكز</a>.</p>
      </section>
    `);
  }
}

boot();