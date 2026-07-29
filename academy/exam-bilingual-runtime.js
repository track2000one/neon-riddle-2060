(() => {
  'use strict';
  const i18n = window.NEON_I18N;
  const bank = window.NEON_EXAM_BANK;
  const academy = window.NEON_ACADEMY;
  if (!i18n || !bank || !academy) return;
  const report = window.NEON_BILINGUAL_PRACTICE_REPORT || {};
  const questions = academy.questionBank || [];
  const subjectMap = new Map((bank.meta?.subjects || []).map(item => [item.id, item]));
  const normalizedMap = new Map();
  let scheduled = false;
  let applying = false;
  function normalize(value) { return String(value || '').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,''); }
  questions.forEach(question => { if (question?.q) normalizedMap.set(normalize(question.q), question); if (question?.qEn) normalizedMap.set(normalize(question.qEn), question); });
  function questionFromText(value) { return normalizedMap.get(normalize(value)) || null; }
  function localized(question) { return i18n.localizeQuestion(question); }
  function setText(element, value) { if (element && value != null && element.textContent !== String(value)) element.textContent = String(value); }
  function number(value) { return Number(value || 0).toLocaleString(i18n.isEnglish ? 'en-US' : 'ar-SA'); }
  function localizeSubjectOptions() {
    const family = document.getElementById('centerFamily')?.value || 'all';
    const subjectSelect = document.getElementById('centerSubject');
    const categorySelect = document.getElementById('centerCategory');
    if (!subjectSelect) return;
    [...subjectSelect.options].forEach(option => {
      if (option.value === 'all') return setText(option, i18n.pick('كل الأقسام','All sections'));
      const meta = subjectMap.get(option.value);
      const count = questions.filter(question => question.area === 'exams' && question.active !== false && question.subject === option.value && (family === 'all' || question.family === family)).length;
      const title = i18n.pick(meta?.title || option.value, meta?.titleEn || meta?.title || option.value);
      setText(option, `${meta?.icon || '🎯'} ${title} (${number(count)})`);
    });
    if (!categorySelect) return;
    const subject = subjectSelect.value;
    const categories = new Map((bank.meta?.categories?.[subject] || []).map(item => [item.id, item]));
    [...categorySelect.options].forEach(option => {
      if (option.value === 'all') return setText(option, i18n.pick('كل الأنواع','All types'));
      const meta = categories.get(option.value);
      const count = questions.filter(question => question.area === 'exams' && question.active !== false && question.subject === subject && question.category === option.value).length;
      const title = i18n.pick(meta?.title || option.value, meta?.titleEn || meta?.title || option.value);
      setText(option, `${title} (${number(count)})`);
    });
  }
  function localizeQuestionScreen(root) {
    const heading = root.querySelector?.('.exam-question');
    if (!heading) return;
    const question = questionFromText(heading.textContent);
    if (!question) return;
    const view = localized(question);
    setText(heading, view.q);
    const passage = root.querySelector('.center-passage');
    if (passage && view.passage) setText(passage, view.passage);
    root.querySelectorAll('[data-center-answer],[data-exam-answer]').forEach((button,index) => {
      const label = button.querySelector('b');
      if (label) setText(label, i18n.isEnglish ? ['A','B','C','D','E','F'][index] || String(index+1) : ['أ','ب','ج','د','هـ','و'][index] || String(index+1));
      const optionText = view.options?.[index];
      if (optionText == null) return;
      if (label) {
        const textNodes = [...button.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
        if (textNodes.length) { const node = textNodes[textNodes.length-1]; if (node.nodeValue !== optionText) node.nodeValue = optionText; }
        else button.append(document.createTextNode(optionText));
      } else setText(button, optionText);
    });
    const feedback = root.querySelector('.center-answer-feedback p,.quick-feedback');
    if (feedback && view.explain) setText(feedback, view.explain);
    const sourceLine = root.querySelector('.center-source-line');
    if (sourceLine && question.bilingual) {
      const source = view.source || i18n.pick('سؤال تدريبي أصلي من المنصة','Original practice question from the platform');
      const page = question.sourcePage ? i18n.pick(` • صفحة الملف ${number(question.sourcePage)}`,` • File page ${number(question.sourcePage)}`) : '';
      const timestamp = question.sourceTimestamp ? i18n.pick(` • التوقيت ${question.sourceTimestamp}`,` • Timestamp ${question.sourceTimestamp}`) : '';
      setText(sourceLine, `${source}${page}${timestamp}`);
    }
    const subjectLabel = root.querySelector('.center-exam-top div > span');
    const meta = subjectMap.get(question.subject);
    if (subjectLabel && meta) setText(subjectLabel, `${meta.icon || '🎯'} ${i18n.pick(meta.title,meta.titleEn || meta.title)}`);
  }
  function localizeQuickChecks(root) {
    root.querySelectorAll?.('.quick-check').forEach(container => {
      const question = questions.find(item => item.id === container.dataset.questionId);
      if (!question) return;
      const view = localized(question);
      const heading = container.querySelector('h4');
      if (heading) setText(heading, `${i18n.pick('تحقق سريع: ','Quick check: ')}${view.q}`);
      container.querySelectorAll('[data-quick-answer]').forEach((button,index) => setText(button, view.options?.[index] ?? button.textContent));
      const feedback = container.querySelector('.quick-feedback');
      if (feedback?.textContent.trim() && container.dataset.answered) {
        const selectedCorrect = feedback.textContent.includes('إجابة صحيحة') || feedback.textContent.includes('Correct');
        setText(feedback, `${selectedCorrect ? i18n.pick('إجابة صحيحة. ','Correct. ') : i18n.pick('راجع الإجابة الصحيحة. ','Review the correct answer. ')}${view.explain}`);
      }
    });
  }
  function localizeReviewCards(root) {
    root.querySelectorAll?.('.center-review-card').forEach(card => {
      const questionElement = card.querySelector('div > strong');
      const question = questionFromText(questionElement?.textContent);
      if (!question) return;
      const view = localized(question);
      setText(questionElement, view.q);
      [...card.querySelectorAll('p')].forEach(paragraph => {
        const answerNode = paragraph.querySelector('em,b');
        if (!answerNode) return;
        const current = answerNode.textContent.trim();
        const index = (question.options || []).findIndex(option => String(option).trim() === current);
        const englishIndex = (question.optionsEn || []).findIndex(option => String(option).trim() === current);
        const resolved = index >= 0 ? index : englishIndex;
        if (resolved >= 0) setText(answerNode, view.options?.[resolved]);
      });
      const explanation = [...card.querySelectorAll('small')].find(item => !item.classList.contains('source'));
      if (explanation) setText(explanation, view.explain);
    });
  }
  function mountCoverageBadge() {
    const heading = document.querySelector('#test-center .exam-center-heading > div');
    if (!heading || heading.querySelector('.bilingual-practice-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'bilingual-practice-badge';
    badge.innerHTML = `<span>AR</span><b>↔</b><span>EN</span><strong>${number(report.total || 64)} ${i18n.pick('سؤالًا ثنائي اللغة','bilingual questions')}</strong><small>${number(report.categories || 32)} ${i18n.pick('نوعًا ومهارة','types and skills')}</small>`;
    heading.appendChild(badge);
    if (!document.getElementById('bilingualPracticeStyles')) {
      const style = document.createElement('style');
      style.id = 'bilingualPracticeStyles';
      style.textContent = '.bilingual-practice-badge{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:12px;font-size:11px;color:#b9c7df}.bilingual-practice-badge span{display:grid;place-items:center;min-width:30px;height:26px;padding:0 7px;border-radius:8px;background:rgba(103,237,255,.12);border:1px solid rgba(103,237,255,.22);color:#dffbff;font-weight:900}.bilingual-practice-badge b{color:#a56cff}.bilingual-practice-badge strong{color:#63f2a9}.bilingual-practice-badge small{color:#9eacc9}';
      document.head.appendChild(style);
    }
  }
  function apply() {
    scheduled = false;
    if (applying) return;
    applying = true;
    try {
      i18n.translateRoot(document.getElementById('test-center'));
      i18n.translateRoot(document.getElementById('examContent'));
      localizeSubjectOptions();
      const examContent = document.getElementById('examContent');
      if (examContent) { localizeQuestionScreen(examContent); localizeReviewCards(examContent); }
      const lessonContent = document.getElementById('lessonModalContent');
      if (lessonContent) localizeQuickChecks(lessonContent);
      mountCoverageBadge();
    } finally { applying = false; }
  }
  function schedule() { if (scheduled) return; scheduled = true; (window.requestAnimationFrame || (callback => setTimeout(callback,16)))(apply); }
  function observe(id) {
    const element = document.getElementById(id);
    if (!element || element.dataset.bilingualObserved === 'true') return false;
    element.dataset.bilingualObserved = 'true';
    const observer = new MutationObserver(schedule);
    observer.observe(element,{childList:true,subtree:true,characterData:true});
    return true;
  }
  let attempts = 0;
  function connect() { observe('test-center'); observe('examContent'); observe('lessonModalContent'); schedule(); attempts += 1; if (attempts < 14) setTimeout(connect, attempts < 5 ? 250 : 800); }
  document.addEventListener('change',event => { if (['centerFamily','centerSubject','centerCategory'].includes(event.target?.id)) schedule(); },true);
  connect();
})();