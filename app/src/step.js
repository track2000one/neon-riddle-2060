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
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      if (optional) resolve(false);
      else reject(new Error(`انتهت مهلة تحميل ${src}`));
    }, timeout);

    script.src = src;
    script.async = false;
    script.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    script.onerror = () => {
      clearTimeout(timer);
      if (optional) resolve(false);
      else reject(new Error(`تعذر تحميل ${src}`));
    };
    document.body.appendChild(script);
  });
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
      reject(new Error('لم تُنشأ واجهة STEP خلال المهلة المحددة'));
    }, timeout);
  });
}

async function boot() {
  try {
    setProgress(12, 'جارٍ التحقق من حساب الطالب…');
    const session = await ensureAuth();
    renderAccount(session);
    setProgress(35, 'تم التحقق. جارٍ تحميل محرك STEP…');

    const dataPromise = loadClassicScript('/legacy/step-academy-data.js', {
      optional: true,
      timeout: 7000
    });

    await Promise.race([
      dataPromise,
      new Promise(resolve => setTimeout(() => resolve(false), 1600))
    ]);

    setProgress(58, 'جارٍ إنشاء الدروس والتدريب…');
    await loadClassicScript('/legacy/step-academy-runtime.js', { timeout: 9000 });
    await waitForStepInterface();

    setProgress(84, 'واجهة STEP جاهزة. استكمال بنك الأسئلة في الخلفية…');
    overlay?.classList.add('hidden');
    document.getElementById('stepIntro')?.remove();

    dataPromise.then(loaded => {
      if (loaded) {
        window.dispatchEvent(new CustomEvent('neon-step-data-loaded'));
        setProgress(100, 'اكتمل تحميل بنك STEP.');
      }
    });
  } catch (error) {
    console.error(error);
    overlay?.classList.add('hidden');
    setProgress(100, 'تعذر فتح المسار بالكامل.');
    const root = document.getElementById('stepRoot');
    root.insertAdjacentHTML('beforeend', `
      <section class="center-intro">
        <h2>تعذر تحميل مركز STEP</h2>
        <p>${String(error.message || error)}</p>
        <p><button onclick="location.reload()">إعادة المحاولة</button> أو <a href="/">العودة إلى المراكز</a>.</p>
      </section>
    `);
  }
}

boot();
