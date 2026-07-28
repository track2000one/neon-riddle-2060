import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-ai.js';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js';
import { firebaseConfig } from './firebase-config.js';
import { AI_MODEL, APP_CHECK_SITE_KEY, AI_LIMITS } from './ai-config.js';

const HISTORY_KEY = 'neonAcademyAiTutorHistoryV1';
const RATE_KEY = 'neonAcademyAiTutorRateV1';
const PROFILE_KEY = 'neonRiddleGrandProfilesV4';
const SETTINGS_KEY = 'neonRiddleGrandSettingsV4';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
let model = null;
let activeController = null;
let initialized = false;

const askButton = document.getElementById('askTeacherButton');
const responsePanel = document.getElementById('teacherResponse');
const promptInput = document.getElementById('teacherPrompt');
const subjectSelect = document.getElementById('teacherSubject');
const modeSelect = document.getElementById('teacherMode');

injectStyles();
upgradeTeacherUi();
initializeRealAI();

async function initializeRealAI() {
  if (!askButton || !responsePanel) return;

  askButton.disabled = true;
  askButton.textContent = 'جارٍ تشغيل المعلم الذكي...';

  try {
    const siteKey = APP_CHECK_SITE_KEY || firebaseConfig.recaptchaSiteKey || '';
    if (siteKey) {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true
        });
      } catch (error) {
        if (!String(error?.message || '').includes('already exists')) throw error;
      }
    }

    const ai = getAI(app, { backend: new GoogleAIBackend() });
    model = getGenerativeModel(ai, {
      model: AI_MODEL,
      systemInstruction: buildSystemInstruction(),
      generationConfig: {
        maxOutputTokens: 1800
      }
    });

    initialized = true;
    askButton.disabled = false;
    askButton.textContent = 'اسأل المعلم الذكي';
    showReadyState(siteKey);
  } catch (error) {
    console.error('Firebase AI Logic initialization failed:', error);
    askButton.disabled = false;
    askButton.textContent = 'إعادة محاولة تشغيل AI';
    showSetupRequired(error);
  }
}

askButton?.addEventListener('click', handleAsk, { capture: true });
promptInput?.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    askButton?.click();
  }
});

async function handleAsk(event) {
  event.preventDefault();
  event.stopImmediatePropagation();

  if (activeController) {
    activeController.abort();
    activeController = null;
    setAskButton(false);
    return;
  }

  if (!initialized || !model) {
    await initializeRealAI();
    if (!initialized) return;
  }

  const prompt = promptInput?.value.trim() || '';
  const mode = modeSelect?.value || 'explain';
  const subjectTitle = subjectSelect?.options[subjectSelect.selectedIndex]?.textContent?.trim() || 'التعلم العام';
  const subjectId = subjectSelect?.value || 'general';

  if (!prompt && mode !== 'plan') {
    showInlineError('اكتب سؤالك أولًا، أو اختر «خطة مذاكرة» لإنشاء خطة تلقائية.');
    promptInput?.focus();
    return;
  }

  if (prompt.length > AI_LIMITS.maxPromptCharacters) {
    showInlineError(`السؤال طويل جدًا. الحد الأقصى ${AI_LIMITS.maxPromptCharacters.toLocaleString('ar-SA')} حرف.`);
    return;
  }

  if (!checkRateLimit()) {
    showInlineError('تم بلوغ الحد المؤقت للطلبات. انتظر دقيقة ثم حاول مرة أخرى.');
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    window.location.replace('auth.html');
    return;
  }

  const studentContext = readStudentContext();
  const codeContext = mode === 'code'
    ? (document.getElementById('codeEditor')?.value || '').slice(0, AI_LIMITS.maxCodeCharacters)
    : '';
  const history = readHistory(subjectId).slice(-AI_LIMITS.maxHistoryTurns);
  const requestText = buildRequest({
    prompt,
    mode,
    subjectId,
    subjectTitle,
    studentContext,
    codeContext,
    history
  });

  activeController = new AbortController();
  setAskButton(true);
  renderStreamingShell(subjectTitle, mode);
  track('real_ai_teacher_request_started', { subject: subjectId, mode, model: AI_MODEL });

  let fullText = '';

  try {
    const result = await model.generateContentStream(requestText, {
      signal: activeController.signal
    });

    for await (const chunk of result.stream) {
      const chunkText = typeof chunk.text === 'function' ? chunk.text() : (chunk.text || '');
      if (!chunkText) continue;
      fullText += chunkText;
      renderAnswer(fullText, subjectTitle, mode, true);
    }

    if (!fullText.trim()) {
      const finalResponse = await result.response;
      fullText = typeof finalResponse.text === 'function' ? finalResponse.text() : (finalResponse.text || '');
    }

    if (!fullText.trim()) throw new Error('empty-ai-response');

    renderAnswer(fullText, subjectTitle, mode, false);
    saveHistory(subjectId, prompt || `خطة في ${subjectTitle}`, fullText);
    track('real_ai_teacher_request_completed', {
      subject: subjectId,
      mode,
      model: AI_MODEL,
      response_length: fullText.length
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      renderCancelledState();
      track('real_ai_teacher_request_cancelled', { subject: subjectId, mode });
    } else {
      console.error('Firebase AI Logic request failed:', error);
      showSetupRequired(error);
      track('real_ai_teacher_request_failed', {
        subject: subjectId,
        mode,
        error_code: normalizeErrorCode(error)
      });
    }
  } finally {
    activeController = null;
    setAskButton(false);
  }
}

function buildSystemInstruction() {
  return `أنت المعلم الذكي الرسمي لمنصة NEON Academy 2060، وهي منصة تعليمية عربية للطلاب.

قواعدك الأساسية:
1. أجب باللغة العربية الفصحى الواضحة، وكيّف الشرح حسب المرحلة الدراسية ومستوى الطالب.
2. علّم الطالب طريقة التفكير ولا تكتفِ بإعطاء الجواب النهائي.
3. في الرياضيات والعلوم: اعرض الخطوات بترتيب منطقي مع مثال ثم سؤال تحقق قصير.
4. في البرمجة: راجع الكود بدقة، اشرح الخطأ، ثم قدم نسخة مصححة داخل كتلة كود مع ذكر اللغة. لا تدّعِ أنك شغلت الكود ما لم تكن النتيجة مستنتجة منطقيًا.
5. في إنشاء التمارين: قدم السؤال أولًا، ثم ضع الحل في قسم أخير بعنوان «الحل بعد المحاولة».
6. في خطط المذاكرة: أنشئ خطة واقعية قصيرة قابلة للتنفيذ مع زمن تقريبي لكل خطوة.
7. استخدم أمثلة مناسبة للسياق السعودي عند فائدتها، دون اختلاق أنظمة أو أرقام حديثة غير متأكد منها.
8. لا تطلب بيانات شخصية حساسة، ولا تكشف معلومات الحساب، ولا تذكر البريد أو UID.
9. لا تساعد على الغش في اختبار مباشر؛ اشرح المفهوم والطريقة بدلًا من إعطاء إجابة جاهزة لسؤال تقييم نشط.
10. ارفض المحتوى الضار أو غير المناسب للطلاب بلطف، وقدّم بديلًا تعليميًا آمنًا.
11. لا تستخدم جداول Markdown. استخدم عناوين قصيرة، نقاطًا، أمثلة، وكتل كود عند الحاجة.
12. اجعل الإجابة عملية ومباشرة، وعادة لا تتجاوز 900 كلمة.`;
}

function buildRequest({ prompt, mode, subjectTitle, studentContext, codeContext, history }) {
  const modeLabels = {
    explain: 'شرح مفهوم أو سؤال تعليمي',
    practice: 'إنشاء تمرين تدريبي جديد',
    plan: 'إعداد خطة مذاكرة شخصية',
    code: 'مراجعة كود أو فكرة برمجية'
  };

  const previousTurns = history.length
    ? history.map((turn, index) => `المحادثة السابقة ${index + 1}:
سؤال الطالب: ${turn.user}
إجابة المعلم: ${turn.assistant}`).join('\n\n')
    : 'لا توجد محادثات سابقة ذات صلة.';

  return `مهمة المعلم: ${modeLabels[mode] || modeLabels.explain}
المجال المحدد: ${subjectTitle}
اسم الطالب الأول في المنصة: ${studentContext.name}
المرحلة الدراسية: ${studentContext.grade}
المستوى في المنصة: ${studentContext.level}
نسبة الإتقان التقريبية: ${studentContext.mastery}

سؤال أو طلب الطالب:
${prompt || `أنشئ خطة مذاكرة مناسبة في ${subjectTitle}.`}

${codeContext ? `الكود المراد مراجعته:
\
\
${codeContext}
\
\
` : ''}
سياق المحادثة السابقة:
${previousTurns}

قدّم إجابة تعليمية مخصصة ومنظمة، وابدأ مباشرة دون مقدمات عامة طويلة.`;
}

function readStudentContext() {
  const profiles = readJson(PROFILE_KEY, {});
  const settings = readJson(SETTINGS_KEY, {});
  const profile = profiles[settings.activeId] || {};
  const academy = profile.academy || {};
  const xp = Number(academy.xp) || 0;
  const completed = Array.isArray(academy.completed) ? academy.completed.length : 0;
  const totalLessons = Number(window.NEON_ACADEMY?.counts?.totalLessons) || 1;

  return {
    name: String(academy.name || profile.name || 'الطالب').split(/\s+/)[0].slice(0, 30),
    grade: academy.grade || 'تعلم عام',
    level: Math.floor(xp / 500) + 1,
    mastery: `${Math.min(100, Math.round((completed / totalLessons) * 100))}%`
  };
}

function renderStreamingShell(subjectTitle, mode) {
  responsePanel.innerHTML = `
    <div class="teacher-answer real-ai-answer">
      <div class="ai-answer-toolbar">
        <span class="ai-live-badge"><i></i> Gemini مباشر</span>
        <span>${escapeHtml(subjectTitle)} • ${escapeHtml(modeLabel(mode))}</span>
      </div>
      <div class="ai-thinking">
        <span></span><span></span><span></span>
        <strong>المعلم الذكي يجهز الإجابة...</strong>
      </div>
      <div id="realAiAnswerBody" class="real-ai-body"></div>
    </div>`;
}

function renderAnswer(text, subjectTitle, mode, streaming) {
  responsePanel.innerHTML = `
    <div class="teacher-answer real-ai-answer">
      <div class="ai-answer-toolbar">
        <span class="ai-live-badge"><i></i> Gemini ${streaming ? 'يكتب الآن' : 'متصل'}</span>
        <div class="ai-toolbar-actions">
          <span>${escapeHtml(subjectTitle)} • ${escapeHtml(modeLabel(mode))}</span>
          <button id="clearAiConversation" type="button">محادثة جديدة</button>
        </div>
      </div>
      <div class="real-ai-body">${renderMarkdown(text)}${streaming ? '<span class="typing-caret"></span>' : ''}</div>
      <div class="ai-answer-footer">
        <span>النموذج: ${escapeHtml(AI_MODEL)}</span>
        <span>قد يخطئ الذكاء الاصطناعي؛ تحقّق من المعلومات المهمة.</span>
      </div>
    </div>`;

  document.getElementById('clearAiConversation')?.addEventListener('click', clearConversation);
}

function clearConversation() {
  const subjectId = subjectSelect?.value || 'general';
  const all = readJson(HISTORY_KEY, {});
  delete all[subjectId];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  promptInput.value = '';
  showReadyState(Boolean(APP_CHECK_SITE_KEY || firebaseConfig.recaptchaSiteKey));
  promptInput.focus();
  track('real_ai_teacher_history_cleared', { subject: subjectId });
}

function showReadyState(appCheckConfigured) {
  const eyebrow = document.querySelector('.teacher-intro .eyebrow');
  const title = document.querySelector('.teacher-intro h2');
  const description = document.querySelector('.teacher-intro p');
  const disclaimer = document.querySelector('.teacher-disclaimer');

  if (eyebrow) eyebrow.textContent = 'GEMINI POWERED AI TUTOR';
  if (title) title.textContent = 'المعلم الذكي الحقيقي';
  if (description) description.textContent = 'معلم تفاعلي حقيقي يشرح، ينشئ تمارين وخططًا، ويراجع الأكواد وفق مستوى الطالب.';
  if (disclaimer) {
    disclaimer.innerHTML = `<span class="ai-status-dot"></span> يعمل بواسطة <strong>${escapeHtml(AI_MODEL)}</strong> عبر Firebase AI Logic${appCheckConfigured ? ' مع App Check' : ''}.`;
  }

  responsePanel.innerHTML = `
    <div class="response-placeholder ai-ready-placeholder">
      <span>✦</span>
      <div class="ai-ready-badge"><i></i> AI READY</div>
      <h3>المعلم الذكي متصل وجاهز</h3>
      <p>اختر المجال ونوع المساعدة، ثم اكتب سؤالك. استخدم Ctrl + Enter للإرسال السريع.</p>
      <small>مدعوم بواسطة ${escapeHtml(AI_MODEL)}</small>
    </div>`;
}

function showSetupRequired(error) {
  const code = normalizeErrorCode(error);
  const isAppCheck = /app.?check|attest|recaptcha|403/i.test(`${code} ${error?.message || ''}`);
  const isService = /api|service|permission|not.?found|failed.?precondition|403|404/i.test(`${code} ${error?.message || ''}`);

  responsePanel.innerHTML = `
    <div class="teacher-answer real-ai-answer ai-setup-card">
      <span class="eyebrow">FIREBASE AI LOGIC SETUP</span>
      <h3>الربط البرمجي جاهز، وتبقى خطوة تفعيل الخدمة</h3>
      <p>${isAppCheck
        ? 'تم رفض الطلب لأن حماية App Check تحتاج إلى إكمال إعداد reCAPTCHA Enterprise للموقع.'
        : isService
          ? 'خدمة Firebase AI Logic أو Gemini Developer API لم تُفعّل بعد في مشروع Firebase.'
          : 'تعذر الاتصال بخدمة الذكاء الاصطناعي في الوقت الحالي.'}</p>
      <ol>
        <li>افتح Firebase Console ثم المشروع <strong>neon-riddle-2060-admin</strong>.</li>
        <li>انتقل إلى <strong>AI services → AI Logic → Get started</strong>.</li>
        <li>اختر <strong>Gemini Developer API</strong> وأكمل الإعداد الموجّه.</li>
        <li>أكمل <strong>App Check / reCAPTCHA Enterprise</strong> للنطاق track2000one.github.io.</li>
      </ol>
      <button id="retryRealAiButton" class="primary-small" type="button">إعادة محاولة الاتصال</button>
      <details><summary>تفاصيل تقنية</summary><code>${escapeHtml(code)}</code></details>
    </div>`;

  document.getElementById('retryRealAiButton')?.addEventListener('click', initializeRealAI);
}

function showInlineError(message) {
  responsePanel.innerHTML = `
    <div class="teacher-answer real-ai-answer ai-inline-error">
      <span class="eyebrow">تنبيه</span>
      <h3>${escapeHtml(message)}</h3>
    </div>`;
}

function renderCancelledState() {
  responsePanel.innerHTML = `
    <div class="teacher-answer real-ai-answer ai-inline-error">
      <span class="eyebrow">تم الإيقاف</span>
      <h3>أوقفت إنشاء الإجابة.</h3>
      <p>يمكنك تعديل السؤال ثم الإرسال مرة أخرى.</p>
    </div>`;
}

function setAskButton(busy) {
  if (!askButton) return;
  askButton.disabled = false;
  askButton.classList.toggle('ai-busy', busy);
  askButton.textContent = busy ? 'إيقاف الإجابة' : 'اسأل المعلم الذكي';
}

function checkRateLimit() {
  const now = Date.now();
  const timestamps = readJson(RATE_KEY, []).filter(timestamp => now - timestamp < 60_000);
  if (timestamps.length >= AI_LIMITS.maxRequestsPerMinute) return false;
  timestamps.push(now);
  localStorage.setItem(RATE_KEY, JSON.stringify(timestamps));
  return true;
}

function readHistory(subjectId) {
  const history = readJson(HISTORY_KEY, {});
  return Array.isArray(history[subjectId]) ? history[subjectId] : [];
}

function saveHistory(subjectId, userText, assistantText) {
  const history = readJson(HISTORY_KEY, {});
  const subjectHistory = Array.isArray(history[subjectId]) ? history[subjectId] : [];
  subjectHistory.push({
    user: userText.slice(0, 1200),
    assistant: assistantText.slice(0, 5000),
    createdAt: new Date().toISOString()
  });
  history[subjectId] = subjectHistory.slice(-AI_LIMITS.maxHistoryTurns);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function modeLabel(mode) {
  return ({
    explain: 'شرح مفهوم',
    practice: 'تمرين مخصص',
    plan: 'خطة مذاكرة',
    code: 'مراجعة برمجية'
  })[mode] || 'مساعدة تعليمية';
}

function renderMarkdown(markdown) {
  const codeBlocks = [];
  let text = String(markdown || '').replace(/```([\w#+.-]*)\n?([\s\S]*?)```/g, (_, language, code) => {
    const token = `@@CODE_BLOCK_${codeBlocks.length}@@`;
    codeBlocks.push(`<div class="ai-code-block"><div><span>${escapeHtml(language || 'code')}</span><button type="button" data-copy-code="${codeBlocks.length}">نسخ</button></div><pre><code>${escapeHtml(code.trim())}</code></pre></div>`);
    return token;
  });

  text = escapeHtml(text)
    .replace(/^###\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^##\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^#\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\d+[.)]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>\n?)+/gs, match => `<ul>${match}</ul>`)
    .split(/\n{2,}/)
    .map(block => {
      if (/^<(h3|h4|h5|ul|div)/.test(block) || /^@@CODE_BLOCK_/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  codeBlocks.forEach((block, index) => {
    text = text.replace(`@@CODE_BLOCK_${index}@@`, block);
  });

  queueMicrotask(bindCodeCopyButtons);
  return text;
}

function bindCodeCopyButtons() {
  document.querySelectorAll('[data-copy-code]').forEach(button => {
    if (button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', async () => {
      const code = button.closest('.ai-code-block')?.querySelector('code')?.textContent || '';
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = 'تم النسخ';
        setTimeout(() => { button.textContent = 'نسخ'; }, 1200);
      } catch {
        button.textContent = 'تعذر النسخ';
      }
    });
  });
}

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

function normalizeErrorCode(error) {
  return String(error?.code || error?.status || error?.name || error?.message || 'unknown-ai-error').slice(0, 220);
}

function track(eventName, parameters = {}) {
  window.gtag?.('event', eventName, {
    app_name: 'neon_academy_real_ai_teacher',
    ...parameters
  });
}

function upgradeTeacherUi() {
  if (promptInput) promptInput.maxLength = AI_LIMITS.maxPromptCharacters;
  const controls = document.querySelector('.teacher-controls');
  if (controls && !controls.querySelector('.ai-provider-card')) {
    controls.insertAdjacentHTML('afterbegin', `
      <div class="ai-provider-card">
        <span class="ai-provider-logo">G</span>
        <div><strong>Gemini AI</strong><small>Firebase AI Logic • استجابة مباشرة</small></div>
      </div>`);
  }
}

function injectStyles() {
  const style = document.createElement('style');
  style.id = 'realAiTeacherStyles';
  style.textContent = `
    .ai-provider-card{display:flex;align-items:center;gap:11px;padding:12px 13px;margin-bottom:10px;border:1px solid rgba(99,235,255,.18);border-radius:15px;background:linear-gradient(135deg,rgba(99,235,255,.07),rgba(164,110,255,.08))}
    .ai-provider-logo{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#63ebff,#8b7cff,#ff6dbd);color:#07111b;font-weight:900;font-size:18px}
    .ai-provider-card strong,.ai-provider-card small{display:block}.ai-provider-card small{color:var(--muted);font-size:10px;margin-top:3px}
    .ai-status-dot,.ai-live-badge i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#63f2a9;box-shadow:0 0 14px #63f2a9;margin-left:5px}
    .real-ai-answer{min-height:100%;padding:28px}.ai-answer-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:16px;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,.08);color:var(--muted);font-size:11px}.ai-live-badge{display:inline-flex;align-items:center;gap:5px;color:#dffcff;font-weight:800}.ai-toolbar-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.ai-toolbar-actions button{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--text);border-radius:10px;padding:7px 10px;cursor:pointer;font-size:10px}
    .real-ai-body{font-size:15px;line-height:1.95;color:#e8edff}.real-ai-body h3,.real-ai-body h4,.real-ai-body h5{margin:22px 0 8px;color:#fff}.real-ai-body h3{font-size:23px}.real-ai-body h4{font-size:18px;color:#bff7ff}.real-ai-body h5{font-size:15px;color:#ddceff}.real-ai-body p{margin:9px 0}.real-ai-body ul{margin:10px 0;padding-right:23px}.real-ai-body li{margin:6px 0}.inline-code{padding:2px 6px;border-radius:7px;background:rgba(255,255,255,.08);direction:ltr;unicode-bidi:embed}
    .ai-code-block{margin:18px 0;border:1px solid rgba(99,235,255,.18);border-radius:16px;overflow:hidden;background:#07101f;direction:ltr;text-align:left}.ai-code-block>div{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:rgba(255,255,255,.045);color:#9fb2da;font-size:10px}.ai-code-block button{border:0;border-radius:8px;background:rgba(99,235,255,.12);color:#c9f9ff;padding:6px 9px;cursor:pointer}.ai-code-block pre{margin:0;padding:17px;overflow:auto}.ai-code-block code{font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.7;color:#e7f5ff;white-space:pre}
    .ai-answer-footer{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:16px;margin-top:22px;border-top:1px solid rgba(255,255,255,.07);font-size:10px;color:var(--muted)}
    .ai-thinking{min-height:240px;display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;color:var(--muted)}.ai-thinking span{width:9px;height:9px;border-radius:50%;background:#8d72ff;animation:aiBounce 1s infinite}.ai-thinking span:nth-child(2){animation-delay:.15s}.ai-thinking span:nth-child(3){animation-delay:.3s}.ai-thinking strong{width:100%;text-align:center;margin-top:8px}.typing-caret{display:inline-block;width:2px;height:1.2em;background:#63ebff;margin-right:5px;vertical-align:middle;animation:aiBlink .8s steps(1) infinite}
    .ai-ready-placeholder .ai-ready-badge{display:inline-flex;align-items:center;gap:6px;margin:8px auto 12px;padding:6px 10px;border-radius:999px;background:rgba(99,242,169,.08);border:1px solid rgba(99,242,169,.2);font-size:10px;color:#aaffd4}.ai-ready-placeholder small{color:var(--muted)}
    .ai-setup-card{display:block;text-align:right}.ai-setup-card h3{font-size:25px;margin:5px 0 12px}.ai-setup-card p,.ai-setup-card li{color:var(--muted);line-height:1.8}.ai-setup-card details{margin-top:15px;color:var(--muted)}.ai-setup-card code{display:block;margin-top:8px;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);direction:ltr;text-align:left;overflow-wrap:anywhere}.ai-inline-error{text-align:center;display:grid;place-items:center;align-content:center}.ai-inline-error h3{max-width:600px}
    #askTeacherButton.ai-busy{background:linear-gradient(135deg,#ff7488,#a46eff);color:#fff}.teacher-disclaimer strong{color:#dffcff}
    @keyframes aiBounce{0%,80%,100%{transform:translateY(0);opacity:.45}40%{transform:translateY(-7px);opacity:1}}@keyframes aiBlink{50%{opacity:0}}
    @media(max-width:700px){.real-ai-answer{padding:19px}.ai-answer-toolbar{align-items:flex-start;flex-direction:column}.ai-answer-footer{flex-direction:column}.real-ai-body{font-size:14px}}
  `;
  document.head.appendChild(style);
}
