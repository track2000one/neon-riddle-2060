(() => {
  'use strict';

  const academy = window.NEON_ACADEMY;
  if (!academy || !Array.isArray(academy.lessons) || !Array.isArray(academy.questionBank)) return;

  const lessons = academy.lessons.filter(lesson => lesson?.id && lesson?.title);
  const generatedByLesson = new Map();
  const lessonsByTitle = new Map();
  const lessonsBySubject = new Map();
  const lessonsByArea = new Map();
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let applyQueued = false;

  lessons.forEach(lesson => {
    if (!lessonsByTitle.has(lesson.title)) lessonsByTitle.set(lesson.title, []);
    lessonsByTitle.get(lesson.title).push(lesson);
    if (!lessonsBySubject.has(lesson.subjectId)) lessonsBySubject.set(lesson.subjectId, []);
    lessonsBySubject.get(lesson.subjectId).push(lesson);
    if (!lessonsByArea.has(lesson.area)) lessonsByArea.set(lesson.area, []);
    lessonsByArea.get(lesson.area).push(lesson);
  });

  function normalize(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit)))
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hash(value) {
    let result = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index++) {
      result ^= text.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function safeId(value) {
    return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  function lessonValue(lesson, variant) {
    if (variant === 'activity') return String(lesson.activity || lesson.summary || lesson.topic || lesson.title || '').trim();
    if (variant === 'objective') {
      const objectives = Array.isArray(lesson.objectives) ? lesson.objectives.filter(Boolean) : [];
      return String(objectives[0] || lesson.summary || lesson.topic || lesson.title || '').trim();
    }
    return String(lesson.summary || lesson.topic || lesson.title || '').trim();
  }

  function questionPrompt(lesson, variant) {
    const title = `«${lesson.title}»`;
    if (lesson.area === 'coding') {
      if (variant === 'activity') return `أي تطبيق عملي يرتبط مباشرة بوحدة ${title}؟`;
      if (variant === 'objective') return `ما المهارة البرمجية المستهدفة في وحدة ${title}؟`;
      return `أي وصف يعبّر بدقة عن محتوى وحدة ${title}؟`;
    }
    if (lesson.area === 'exams') {
      if (variant === 'activity') return `أي تدريب يطابق وحدة ${title}؟`;
      if (variant === 'objective') return `ما المهارة التي تقيسها وحدة ${title}؟`;
      return `ما المجال الرئيس الذي تتناوله وحدة ${title}؟`;
    }
    if (lesson.area === 'games') {
      if (variant === 'activity') return `ما المهمة الأساسية في وحدة ${title}؟`;
      if (variant === 'objective') return `أي مهارة ذهنية تطورها وحدة ${title}؟`;
      return `أي وصف يناسب تجربة وحدة ${title}؟`;
    }
    if (variant === 'activity') return `أي نشاط يطبق ما تعلمته في وحدة ${title}؟`;
    if (variant === 'objective') return `ما الهدف التعليمي الرئيس لوحدة ${title}؟`;
    return `أي وصف يطابق محتوى وحدة ${title}؟`;
  }

  function appendCandidates(group, lesson, variant, seen, output) {
    if (!Array.isArray(group) || group.length < 2 || output.length >= 3) return;
    const start = hash(`${lesson.id}|${variant}|${group.length}`) % group.length;
    for (let offset = 0; offset < group.length && output.length < 3; offset++) {
      const candidate = group[(start + offset) % group.length];
      if (!candidate || candidate.id === lesson.id) continue;
      const value = lessonValue(candidate, variant);
      const key = normalize(value);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      output.push(value);
    }
  }

  function distractorsFor(lesson, variant, correct) {
    const seen = new Set([normalize(correct)]);
    const output = [];

    appendCandidates(lessonsBySubject.get(lesson.subjectId), lesson, variant, seen, output);
    appendCandidates(lessonsByArea.get(lesson.area), lesson, variant, seen, output);
    appendCandidates(lessons, lesson, variant, seen, output);

    const fallbacks = {
      coding: ['حفظ أسماء الأوامر دون بناء أي مثال تطبيقي.', 'تغيير ألوان الواجهة فقط دون دراسة المفهوم.', 'استخدام أداة لا ترتبط باللغة أو الموضوع الحالي.'],
      exams: ['تجاهل المعطيات والاختيار العشوائي.', 'حفظ الإجابة دون فهم استراتيجية الحل.', 'استخدام قاعدة لا ترتبط بنوع السؤال.'],
      games: ['تجاوز التعليمات دون حل التحدي.', 'اختيار إجابة عشوائية دون ملاحظة النمط.', 'إهمال الوقت والخطوات المطلوبة للمهمة.'],
      knowledge: ['موضوع مختلف لا يرتبط بأهداف الوحدة.', 'معلومة جانبية لا تحقق ناتج التعلم.', 'نشاط لا يستخدم المفهوم الذي تشرحه الوحدة.']
    };

    (fallbacks[lesson.area] || fallbacks.knowledge).forEach(value => {
      const key = normalize(value);
      if (output.length < 3 && !seen.has(key)) {
        seen.add(key);
        output.push(value);
      }
    });

    return output.slice(0, 3);
  }

  function createQuestion(lesson, index) {
    const variants = ['summary', 'activity', 'objective'];
    const variant = variants[(index + (lesson.level === 'practice' ? 1 : lesson.level === 'mastery' ? 2 : 0)) % variants.length];
    const correct = lessonValue(lesson, variant);
    const distractors = distractorsFor(lesson, variant, correct);
    const answer = hash(lesson.id) % 4;
    const options = [...distractors];
    options.splice(answer, 0, correct);

    return {
      id: `lesson-quick-${safeId(lesson.id)}`,
      area: lesson.area,
      subject: lesson.subjectId,
      level: lesson.level,
      q: questionPrompt(lesson, variant),
      options: options.slice(0, 4),
      answer,
      explain: `الإجابة الصحيحة ترتبط مباشرة بمحتوى هذه الوحدة: ${correct}`,
      generatedForLesson: lesson.id,
      active: true
    };
  }

  const existingIds = new Set(academy.questionBank.map(question => question.id));
  lessons.forEach((lesson, index) => {
    const question = createQuestion(lesson, index);
    generatedByLesson.set(lesson.id, question);
    if (!existingIds.has(question.id)) {
      academy.questionBank.push(question);
      existingIds.add(question.id);
    }
  });

  if (academy.counts) academy.counts.questions = academy.questionBank.length;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
  }

  function renderQuickCheck(question) {
    return `<div class="quick-check" data-question-id="${escapeHtml(question.id)}" data-lesson-unique="true"><h4>تحقق سريع: ${escapeHtml(question.q)}</h4><div class="quick-options">${question.options.map((option, index) => `<button class="quick-option" data-quick-answer="${index}">${escapeHtml(option)}</button>`).join('')}</div><div class="quick-feedback"></div></div>`;
  }

  function resolveLesson(modalContent) {
    const title = modalContent?.querySelector('.lesson-head h2')?.textContent?.trim();
    if (!title) return null;
    const matches = lessonsByTitle.get(title) || [];
    if (matches.length <= 1) return matches[0] || null;
    const eyebrow = modalContent.querySelector('.lesson-head .eyebrow')?.textContent || '';
    return matches.find(lesson => eyebrow.includes(lesson.levelTitle || '')) || matches[0];
  }

  function applyUniqueQuestion() {
    applyQueued = false;
    const modalContent = document.getElementById('lessonModalContent');
    if (!modalContent) return;
    const container = modalContent.querySelector('.quick-check:not([data-lesson-unique])');
    if (!container) return;
    const lesson = resolveLesson(modalContent);
    const question = lesson && generatedByLesson.get(lesson.id);
    if (question) container.outerHTML = renderQuickCheck(question);
  }

  function scheduleApply() {
    if (applyQueued) return;
    applyQueued = true;
    const schedule = window.requestAnimationFrame || (callback => window.setTimeout(callback, 16));
    schedule(applyUniqueQuestion);
  }

  const modalContent = document.getElementById('lessonModalContent');
  if (modalContent) {
    const observer = new MutationObserver(scheduleApply);
    observer.observe(modalContent, { childList: true, subtree: true });
  }
  scheduleApply();

  window.NEON_LESSON_QUESTION_REPORT = {
    generated: generatedByLesson.size,
    uniqueQuestionIds: new Set([...generatedByLesson.values()].map(item => item.id)).size,
    strategy: 'one-contextual-question-per-lesson-optimized'
  };

  console.info('[NEON Academy] Unique lesson questions ready', window.NEON_LESSON_QUESTION_REPORT);
})();
