import './tutor-gemini.css';

const HISTORY_KEY = 'neonLocalTutorHistoryV3';
const MAX_HISTORY = 80;
const MAX_CONTEXT_MESSAGES = 12;

let geminiStatus = { configured: null, provider: 'checking', model: null };

function readHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeHistory(history) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY))); }
  catch { /* The tutor remains usable without persistence. */ }
}

function timeLabel() {
  return new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function appendMessage(role, text, options = {}) {
  const messages = document.getElementById('tutorMessages');
  if (!messages) return;
  messages.querySelector('.tutor-welcome')?.remove();

  const time = options.time || timeLabel();
  const article = document.createElement('article');
  article.className = `tutor-message ${role === 'user' ? 'user' : 'assistant'}`;
  if (options.provider) article.dataset.provider = options.provider;

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const author = document.createElement('strong');
  author.textContent = role === 'user' ? 'أنت' : options.provider === 'gemini' ? 'المعلم الذكي • Gemini' : 'المعلم المحلي الاحتياطي';
  const stamp = document.createElement('span');
  stamp.textContent = time;
  meta.append(author, stamp);

  const body = document.createElement('div');
  body.className = 'message-body';
  body.textContent = String(text || '');
  article.append(meta, body);
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;

  if (options.save !== false) {
    const history = readHistory();
    history.push({ role, text: String(text || ''), time, provider: options.provider || undefined });
    writeHistory(history);
  }
}

function showTyping(provider = 'gemini') {
  document.getElementById('tutorTyping')?.remove();
  const messages = document.getElementById('tutorMessages');
  if (!messages) return;
  const holder = document.createElement('article');
  holder.className = 'tutor-message assistant';
  holder.id = 'tutorTyping';
  holder.innerHTML = `<div class="message-meta"><strong>${provider === 'gemini' ? 'Gemini يجهز الإجابة…' : 'المعلم المحلي يجهز الإجابة…'}</strong></div><div class="tutor-typing" aria-label="جارٍ إعداد الرد"><i></i><i></i><i></i></div>`;
  messages.appendChild(holder);
  messages.scrollTop = messages.scrollHeight;
}

function selectedText(id) {
  const select = document.getElementById(id);
  return select?.selectedOptions?.[0]?.textContent?.trim() || '';
}

function currentMode() {
  return document.querySelector('#tutorModes [data-mode].active')?.dataset.mode || 'explain';
}

function modeLabel(mode) {
  return ({ explain: 'شرح', exercise: 'إنشاء تمرين', plan: 'خطة مذاكرة', review: 'مراجعة إجابة', code: 'مراجعة كود' })[mode] || 'شرح';
}

function apiHistory(snapshot) {
  return snapshot.slice(-MAX_CONTEXT_MESSAGES).map(item => ({
    role: item.role === 'assistant' ? 'model' : 'user',
    text: String(item.text || '').slice(0, 4_000)
  })).filter(item => item.text);
}

function setProviderBadge(status) {
  const badge = document.querySelector('.tutor-local-label');
  if (!badge) return;
  if (status.configured) {
    badge.textContent = 'GEMINI AI';
    badge.dataset.state = 'online';
    badge.title = `متصل بالنموذج ${status.model || 'Gemini'}`;
  } else if (status.configured === false) {
    badge.textContent = 'LOCAL BACKUP';
    badge.dataset.state = 'fallback';
    badge.title = 'أضف GEMINI_API_KEY في Railway لتفعيل Gemini';
  } else {
    badge.textContent = 'CHECKING';
    badge.dataset.state = 'checking';
  }
}

async function loadGeminiStatus() {
  setProviderBadge(geminiStatus);
  try {
    const response = await fetch('/api/tutor/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('STATUS_FAILED');
    geminiStatus = await response.json();
  } catch {
    geminiStatus = { configured: false, provider: 'local', model: null };
  }
  setProviderBadge(geminiStatus);
}

function normalizeArabic(value) {
  return String(value || '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function builtInLocalResponse(question) {
  const normalized = normalizeArabic(question);
  const mode = currentMode();
  const subject = selectedText('tutorSubject') || 'التعلم العام';
  const level = selectedText('tutorLevel') || 'تطبيقي';

  if (normalized.includes('اين تقع') && normalized.includes('القاهره')) {
    return 'تقع مدينة القاهرة في شمال شرقي جمهورية مصر العربية، على ضفتي نهر النيل قرب بداية دلتا النيل، وهي عاصمة مصر.';
  }
  if (normalized.includes('ما عاصمه') && normalized.includes('السعوديه')) {
    return 'عاصمة المملكة العربية السعودية هي مدينة الرياض.';
  }
  if (mode === 'exercise') {
    return `تمرين محلي احتياطي في ${subject} — مستوى ${level}:\n\nاكتب تعريفًا موجزًا للمفهوم الذي تسأل عنه، ثم مثالًا يوضحه، ثم سؤال تحقق واحدًا. أرسل إجابتك بعد ذلك في وضع «راجع إجابتي».`;
  }
  if (mode === 'plan') {
    return `خطة محلية احتياطية لمادة ${subject}:\n\n1. 15 دقيقة لفهم المفهوم.\n2. 20 دقيقة لتطبيق مثالين.\n3. 10 دقائق لمراجعة الأخطاء.\n4. خمس دقائق لتلخيص ما تعلمته.\n\nكرر الخطة خمسة أيام، واجعل اليوم السادس اختبارًا قصيرًا واليوم السابع مراجعة للنقاط الضعيفة.`;
  }
  if (mode === 'review') {
    return `مراجعة محلية أولية في ${subject}:\n\n• تأكد أن إجابتك بدأت بجواب مباشر.\n• أضف السبب أو القاعدة أو الدليل.\n• استخدم مثالًا مناسبًا.\n• اختم بطريقة تحقق من صحة الإجابة.\n\nتعذر الاتصال بـ Gemini، لذلك لا أستطيع إجراء تصحيح تفصيلي موثوق الآن.`;
  }
  if (mode === 'code') {
    return 'تعذر الاتصال بـ Gemini. راجع محليًا: صحة الأقواس، أسماء المتغيرات، معالجة الأخطاء، التحقق من المدخلات، تجنب innerHTML وeval مع بيانات المستخدم، واختبار الكود على الجوال ولوحة المفاتيح.';
  }
  return `تعذر الاتصال بـ Gemini حاليًا. في مادة ${subject}، ابدأ بالإجابة المباشرة عن السؤال، ثم اذكر التعريف أو القاعدة، وبعدها مثالًا أو دليلًا، واختم بخطوة تحقق. أعد المحاولة بعد قليل للحصول على إجابة Gemini الكاملة.`;
}

function localFallback(question, reason = '') {
  const buildLocalResponse = window.NEON_LOCAL_TUTOR_BUILD_RESPONSE;
  const localText = typeof buildLocalResponse === 'function'
    ? buildLocalResponse(question)
    : builtInLocalResponse(question);
  const notice = reason
    ? `⚠️ تعذر استخدام Gemini (${reason})، لذلك تم تشغيل المعلم المحلي الاحتياطي.\n\n`
    : 'ℹ️ Gemini غير مفعّل بعد، لذلك تم تشغيل المعلم المحلي الاحتياطي.\n\n';
  return `${notice}${localText}`;
}

async function askGemini({ question, snapshot, mode }) {
  const response = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: question,
      subject: selectedText('tutorSubject') || 'تعلم عام',
      subjectKey: document.getElementById('tutorSubject')?.value || 'general',
      level: selectedText('tutorLevel') || 'تطبيقي',
      mode,
      modeLabel: modeLabel(mode),
      history: apiHistory(snapshot)
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.text) {
    const error = new Error(data.message || 'تعذر الاتصال');
    error.code = data.error || 'GEMINI_ERROR';
    throw error;
  }
  return data;
}

document.addEventListener('submit', async event => {
  const form = event.target.closest?.('#tutorForm');
  if (!form) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const input = document.getElementById('tutorInput');
  const sendButton = document.getElementById('sendTutorMessage');
  const counter = document.getElementById('tutorCharCount');
  const question = input?.value.trim();
  if (!question || sendButton?.disabled) return;

  const snapshot = readHistory();
  const mode = currentMode();
  appendMessage('user', question, { provider: 'user' });
  input.value = '';
  if (counter) counter.textContent = '0';
  if (sendButton) sendButton.disabled = true;
  showTyping(geminiStatus.configured === false ? 'local' : 'gemini');

  try {
    if (geminiStatus.configured === false) {
      await new Promise(resolve => setTimeout(resolve, 180));
      document.getElementById('tutorTyping')?.remove();
      appendMessage('assistant', localFallback(question), { provider: 'local' });
    } else {
      const data = await askGemini({ question, snapshot, mode });
      document.getElementById('tutorTyping')?.remove();
      appendMessage('assistant', data.text, { provider: 'gemini' });
      geminiStatus = { configured: true, provider: 'gemini', model: data.model || geminiStatus.model };
      setProviderBadge(geminiStatus);
    }
  } catch (error) {
    document.getElementById('tutorTyping')?.remove();
    appendMessage('assistant', localFallback(question, error.message), { provider: 'local' });
    if (['GEMINI_NOT_CONFIGURED', 'GEMINI_KEY_ERROR'].includes(error.code)) {
      geminiStatus = { configured: false, provider: 'local', model: null };
      setProviderBadge(geminiStatus);
    }
  } finally {
    if (sendButton) sendButton.disabled = false;
    input.focus();
  }
}, true);

loadGeminiStatus();
