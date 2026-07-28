(() => {
  'use strict';

  const PROFILE_KEY = 'neonRiddleGrandProfilesV4';
  const SETTINGS_KEY = 'neonRiddleGrandSettingsV4';
  const bank = window.NEON_EXAM_BANK;
  const academy = window.NEON_ACADEMY;
  if (!bank || !academy) return;

  let state = null;
  let timer = null;
  const subjectMap = new Map(bank.meta.subjects.map(item => [item.id, item]));

  injectStylesheet();
  injectNavigation();
  injectSection();
  bindEvents();
  renderMetrics();

  function injectStylesheet() {
    ['exam-center.css', 'exam-visuals.css'].forEach(href => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
  }

  function injectNavigation() {
    const nav = document.querySelector('.main-nav');
    if (!nav || nav.querySelector('[data-scroll="test-center"]')) return;
    const button = document.createElement('button');
    button.className = 'nav-link';
    button.dataset.scroll = 'test-center';
    button.textContent = 'مركز الاختبارات';
    nav.insertBefore(button, nav.querySelector('[data-scroll="library"]') || null);
  }

  function subjectCard(id, icon, title, desc) {
    return `<button class="exam-subject-card" data-exam-preset="${id}" style="--subject-color:${subjectMap.get(id)?.color || '#67edff'}"><span>${icon}</span><div><strong>${title}</strong><small>${desc}</small><b id="count-${id}">0 سؤال</b></div></button>`;
  }

  function injectSection() {
    if (document.getElementById('test-center')) return;
    const tracks = document.getElementById('tracks');
    if (!tracks) return;
    const section = document.createElement('section');
    section.id = 'test-center';
    section.className = 'section-shell section-block exam-center-section';
    section.innerHTML = `
      <div class="section-heading exam-center-heading"><div><span class="eyebrow">SAUDI TEST PREPARATION CENTER</span><h2>مركز التحصيلي والقدرات</h2><p>قسم مستقل للمحاكاة الزمنية، الاختبارات المخصصة، تحليل النتائج ومراجعة الأخطاء.</p></div><div class="exam-center-total"><strong id="examCenterTotal">0</strong><small>سؤالًا تدريبيًا</small></div></div>
      <div class="exam-family-grid">
        <article class="exam-family-card tahsili-family"><div class="family-card-head"><div class="family-symbol">ت</div><div><span class="eyebrow">ACHIEVEMENT TEST</span><h3>الاختبار التحصيلي العلمي</h3><p>أربعة أقسام مستقلة، مع اختبار لكل مادة أو محاكاة شاملة.</p></div></div><div class="exam-subject-grid">${subjectCard('tahsili-math','∑','الرياضيات','الجبر والهندسة والإحصاء والتفاضل')}${subjectCard('tahsili-physics','⚛','الفيزياء','الميكانيكا والطاقة والكهرباء والموجات')}${subjectCard('tahsili-chemistry','🧪','الكيمياء','الذرة والروابط والمحاليل والعضوية')}${subjectCard('tahsili-biology','🧬','الأحياء','الخلية والوراثة والتنوع وأجهزة الجسم')}</div><div class="family-actions"><button class="exam-primary" data-exam-preset="tahsili-all">محاكاة تحصيلي شاملة</button><span>أسئلة تدريبية مراجعة مع تفسير الإجابة.</span></div></article>
        <article class="exam-family-card qudurat-family"><div class="family-card-head"><div class="family-symbol">ق</div><div><span class="eyebrow">GENERAL APTITUUDE TEST</span><h3>اختبار القدرات</h3><p>قدرات لفظية بأنواعها وقدرات كمية بموضوعاتها الأساسية.</p></div></div><div class="qudurat-main-grid"><button class="qudurat-main-card" data-exam-preset="qudurat-verbal"><span>ض</span><div><strong>القدرات اللفظية</strong><small id="count-qudurat-verbal">0 سؤال</small></div></button><button class="qudurat-main-card" data-exam-preset="qudurat-quant"><span>ك</span><div><strong>القدرات الكمية</strong><small id="count-qudurat-quant">0 سؤال</small></div></button></div><div class="category-cloud"><span>التناظر اللفظي</span><span>إكمال الجمل</span><span>الخطأ السياقي</span><span>المفردات</span><span>استيعاب المقروء</span><span>الحساب</span><span>الكسور والنسب</span><span>النسب المئوية</span><span>الجبر</span><span>الهندسة</span><span>الإحصاء والاحتمال</span></div><div class="family-actions"><button class="exam-primary" data-exam-preset="qudurat-all">محاكاة قدرات لفظي وكمي</button><span>تشمل أسئلة كمية برسومات متجهية واضحة وعالية الدقة.</span></div></article>
      </div>
      <div class="exam-center-features"><div><span>⏱</span><strong>محاكاة زمنية</strong><small>10 إلى 60 سؤالًا أو وقت مفتوح</small></div><div><span>📊</span><strong>تحليل حسب القسم</strong><small>درجة كل مادة على حدة</small></div><div><span>🧠</span><strong>مراجعة الأخطاء</strong><small>الإجابة الصحيحة والشرح</small></div><div><span>💾</span><strong>حفظ النتيجة</strong><small>ضمن سجل الطالب المحلي</small></div></div>
      <div class="exam-source-note"><strong>تنبيه:</strong> المحتوى تدريبي غير رسمي. الرسومات المرافقة للأسئلة الكمية أُعيد بناؤها بصيغة متجهية واضحة بدل استخدام صور الصفحات المصورة، مع مراجعة القيم والإجابات قبل الإضافة.</div>`;
    tracks.insertAdjacentElement('afterend', section);
  }

  function renderMetrics() {
    const questions = academy.questionBank.filter(item => item.area === 'exams');
    setText('examCenterTotal', questions.length.toLocaleString('ar-SA'));
    bank.meta.subjects.forEach(subject => setText(`count-${subject.id}`, `${questions.filter(item => item.subject === subject.id).length.toLocaleString('ar-SA')} سؤال`));
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const preset = event.target.closest('[data-exam-preset]');
      if (preset) {
        event.preventDefault();
        openSetup(preset.dataset.examPreset);
        return;
      }
      if (event.target.id === 'centerStartExam') {
        startExam();
        return;
      }
      const answerButton = event.target.closest('[data-center-answer]');
      if (answerButton) {
        answer(Number(answerButton.dataset.centerAnswer));
        return;
      }
      if (event.target.id === 'centerNextQuestion') {
        state.index++;
        renderQuestion();
        return;
      }
      if (event.target.closest('[data-close="examModal"]')) stopExam();
    }, true);

    document.addEventListener('change', event => {
      if (event.target.id === 'centerFamily') updateSubjects();
      if (event.target.id === 'centerSubject') updateCategories();
    });
  }

  function resolvePreset(preset) {
    if (preset === 'tahsili-all') return { family:'tahsili', subject:'all', category:'all' };
    if (preset === 'qudurat-all') return { family:'qudurat', subject:'all', category:'all' };
    if (preset.startsWith('tahsili-')) return { family:'tahsili', subject:preset, category:'all' };
    if (preset.startsWith('qudurat-')) return { family:'qudurat', subject:preset, category:'all' };
    return { family:'all', subject:'all', category:'all' };
  }

  function openSetup(preset='all') {
    stopExam(false);
    const config = resolvePreset(preset);
    const content = document.getElementById('examContent');
    if (!content) return;
    content.innerHTML = `<div class="center-exam-setup"><span class="eyebrow">ADVANCED EXAM BUILDER</span><h2>إنشاء اختبار مخصص</h2><p>حدد الاختبار والقسم والمهارة وعدد الأسئلة والزمن.</p><div class="center-setup-grid"><label>نوع الاختبار<select id="centerFamily"><option value="all">التحصيلي والقدرات</option><option value="tahsili">التحصيلي</option><option value="qudurat">القدرات</option></select></label><label>القسم<select id="centerSubject"></select></label><label id="centerCategoryField">النوع أو المهارة<select id="centerCategory"></select></label><label>عدد الأسئلة<select id="centerCount"><option value="10">10 أسئلة</option><option value="20" selected>20 سؤالًا</option><option value="40">40 سؤالًا</option><option value="60">60 سؤالًا</option></select></label><label>الزمن<select id="centerMinutes"><option value="10">10 دقائق</option><option value="20" selected>20 دقيقة</option><option value="40">40 دقيقة</option><option value="60">60 دقيقة</option><option value="0">وقت مفتوح</option></select></label><label>المستوى<select id="centerLevel"><option value="all">مختلط</option><option value="foundation">تأسيسي</option><option value="practice">تطبيقي</option><option value="mastery">متقدم</option></select></label></div><div id="centerPoolSummary" class="center-pool-summary"></div><button id="centerStartExam" class="primary-action">بدء الاختبار</button></div>`;
    openModal();
    document.getElementById('centerFamily').value = config.family;
    updateSubjects(config.subject);
    updateCategories(config.category);
    updateSummary();
    ['centerFamily','centerSubject','centerCategory','centerCount','centerLevel'].forEach(id => document.getElementById(id)?.addEventListener('change', updateSummary));
  }

  function updateSubjects(selected='all') {
    const family = document.getElementById('centerFamily')?.value || 'all';
    const select = document.getElementById('centerSubject');
    if (!select) return;
    const subjects = bank.meta.subjects.filter(item => family === 'all' || item.family === family);
    select.innerHTML = '<option value="all">كل الأقسام</option>' + subjects.map(item => `<option value="${item.id}">${item.icon} ${item.title}</option>`).join('');
    select.value = subjects.some(item => item.id === selected) ? selected : 'all';
    updateCategories();
  }

  function updateCategories(selected='all') {
    const subject = document.getElementById('centerSubject')?.value || 'all';
    const categories = bank.meta.categories[subject] || [];
    const field = document.getElementById('centerCategoryField');
    const select = document.getElementById('centerCategory');
    if (!field || !select) return;
    field.classList.toggle('is-muted', !categories.length);
    select.disabled = !categories.length;
    select.innerHTML = '<option value="all">كل الأنواع</option>' + categories.map(item => `<option value="${item.id}">${item.title}</option>`).join('');
    select.value = categories.some(item => item.id === selected) ? selected : 'all';
    updateSummary();
  }

  function pool() {
    const family = document.getElementById('centerFamily')?.value || 'all';
    const subject = document.getElementById('centerSubject')?.value || 'all';
    const category = document.getElementById('centerCategory')?.value || 'all';
    const level = document.getElementById('centerLevel')?.value || 'all';
    return academy.questionBank.filter(item => item.area === 'exams' && (family === 'all' || inferFamily(item) === family) && (subject === 'all' || item.subject === subject) && (category === 'all' || item.category === category) && (level === 'all' || item.level === level));
  }

  function updateSummary() {
    const summary = document.getElementById('centerPoolSummary');
    if (!summary) return;
    const questions = pool();
    const imported = questions.filter(item => item.sourcePage).length;
    const visual = questions.filter(item => item.visualId).length;
    summary.innerHTML = `<strong>${questions.length.toLocaleString('ar-SA')}</strong> سؤالًا متاحًا${imported ? `، منها <b>${imported.toLocaleString('ar-SA')}</b> من المرفقات` : ''}${visual ? `، و<b>${visual.toLocaleString('ar-SA')}</b> سؤالًا برسوم دقيقة` : ''}.`;
  }

  function startExam() {
    const questions = pool();
    if (!questions.length) {
      document.getElementById('centerPoolSummary').innerHTML = '<span class="center-error">لا توجد أسئلة مطابقة.</span>';
      return;
    }
    const count = Math.min(Number(document.getElementById('centerCount').value), questions.length);
    const minutes = Number(document.getElementById('centerMinutes').value);
    state = {
      questions: shuffle([...questions]).slice(0, count),
      index: 0,
      correct: 0,
      answers: [],
      seconds: minutes ? minutes * 60 : Infinity,
      startedAt: Date.now(),
      family: document.getElementById('centerFamily').value,
      subject: document.getElementById('centerSubject').value,
      category: document.getElementById('centerCategory').value
    };
    clearInterval(timer);
    if (Number.isFinite(state.seconds)) timer = setInterval(tick, 1000);
    renderQuestion();
    track('exam_center_started', { family:state.family, subject:state.subject, question_count:count });
  }

  function renderVisual(question, compact=false) {
    const markup = question.visualId && window.NEON_EXAM_VISUALS?.[question.visualId];
    if (!markup) return '';
    const alt = escapeHtml(question.imageAlt || 'الرسم البياني المرافق للسؤال');
    return `<figure class="center-question-visual${compact ? ' compact' : ''}" role="img" aria-label="${alt}">${markup}<figcaption>${alt}</figcaption></figure>`;
  }

  function sourceLine(question) {
    const source = question.source ? escapeHtml(question.source) : 'سؤال تدريبي أصلي من المنصة';
    const page = question.sourcePage ? ` • صفحة الملف ${Number(question.sourcePage).toLocaleString('ar-SA')}` : '';
    return `${source}${page}`;
  }

  function renderQuestion() {
    if (!state || state.index >= state.questions.length) return finishExam();
    const question = state.questions[state.index];
    const meta = subjectMap.get(question.subject);
    const category = categoryName(question.subject, question.category);
    const visual = renderVisual(question);
    document.getElementById('examContent').innerHTML = `<div class="center-exam-screen${visual ? ' has-visual' : ''}"><div class="center-exam-top"><div><span>${meta?.icon || '🎯'} ${meta?.title || question.subject}</span>${category ? `<small>${category}</small>` : ''}</div><strong id="centerTimer">${formatSeconds(state.seconds)}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${state.index / state.questions.length * 100}%"></div></div><div class="center-question-number">السؤال ${(state.index + 1).toLocaleString('ar-SA')} من ${state.questions.length.toLocaleString('ar-SA')}</div>${question.passage ? `<article class="center-passage">${escapeHtml(question.passage)}</article>` : ''}<h2 class="exam-question">${escapeHtml(question.q)}</h2>${visual}<div class="center-source-line">${sourceLine(question)}</div><div class="exam-options">${question.options.map((option,index) => `<button class="exam-option" data-center-answer="${index}"><b>${['أ','ب','ج','د'][index]}</b>${escapeHtml(option)}</button>`).join('')}</div></div>`;
  }

  function answer(selected) {
    if (!state) return;
    const question = state.questions[state.index];
    const correct = selected === question.answer;
    if (correct) state.correct++;
    state.answers.push({ question, selected, correct });
    document.querySelectorAll('[data-center-answer]').forEach((button,index) => {
      button.disabled = true;
      if (index === question.answer) button.classList.add('correct');
      if (index === selected && !correct) button.classList.add('wrong');
    });
    document.querySelector('.center-exam-screen')?.insertAdjacentHTML('beforeend', `<div class="center-answer-feedback ${correct ? 'ok' : 'bad'}"><strong>${correct ? 'إجابة صحيحة' : 'الإجابة تحتاج مراجعة'}</strong><p>${escapeHtml(question.explain)}</p><button id="centerNextQuestion" class="primary-action">${state.index + 1 === state.questions.length ? 'عرض النتيجة' : 'السؤال التالي'}</button></div>`);
  }

  function finishExam() {
    clearInterval(timer);
    timer = null;
    if (!state) return;
    const total = state.questions.length;
    const percent = Math.round(state.correct / total * 100);
    const elapsed = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
    const breakdown = buildBreakdown(state.answers);
    const wrong = state.answers.filter(item => !item.correct);
    saveResult(percent, elapsed, total);
    document.getElementById('examContent').innerHTML = `<div class="center-exam-result"><span class="eyebrow">DETAILED PERFORMANCE REPORT</span><h2>تقرير الاختبار</h2><div class="center-result-hero"><strong>${percent}%</strong><div><b>${label(percent)}</b><small>${state.correct} من ${total} • ${formatSeconds(elapsed)}</small></div></div><div class="center-breakdown">${breakdown.map(item => `<div><span>${item.icon} ${item.title}</span><strong>${item.percent}%</strong><small>${item.correct}/${item.total}</small><i><b style="width:${item.percent}%"></b></i></div>`).join('')}</div><section class="center-review"><h3>مراجعة الأخطاء (${wrong.length})</h3>${wrong.length ? wrong.slice(0,15).map(reviewCard).join('') : '<div class="center-perfect">🏆 جميع الإجابات صحيحة.</div>'}</section><div class="center-result-actions"><button class="primary-action" data-exam-preset="${state.subject !== 'all' ? state.subject : state.family + '-all'}">إعادة اختبار مشابه</button><button class="secondary-action" data-close="examModal">العودة</button></div></div>`;
    track('exam_center_completed', { family:state.family, subject:state.subject, score:percent, total });
    state = null;
  }

  function reviewCard(item, index) {
    const question = item.question;
    const meta = subjectMap.get(question.subject);
    return `<article class="center-review-card"><div><span>${(index + 1).toLocaleString('ar-SA')}</span><strong>${escapeHtml(question.q)}</strong></div>${renderVisual(question, true)}<p>إجابتك: <em>${escapeHtml(question.options[item.selected] ?? 'لم تُجب')}</em></p><p>الصحيحة: <b>${escapeHtml(question.options[question.answer])}</b></p><small>${escapeHtml(question.explain)}</small>${question.sourcePage ? `<small class="source">${meta?.title || ''} • صفحة الملف ${Number(question.sourcePage).toLocaleString('ar-SA')}</small>` : ''}</article>`;
  }

  function buildBreakdown(answers) {
    const map = new Map();
    answers.forEach(answerItem => {
      const key = answerItem.question.subject;
      const meta = subjectMap.get(key) || { title:key, icon:'🎯' };
      const row = map.get(key) || { title:meta.title, icon:meta.icon, total:0, correct:0 };
      row.total++;
      if (answerItem.correct) row.correct++;
      map.set(key, row);
    });
    return [...map.values()].map(item => ({ ...item, percent:Math.round(item.correct / item.total * 100) }));
  }

  function saveResult(percent, elapsed, total) {
    try {
      const profiles = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      const id = settings.activeId || Object.keys(profiles)[0];
      if (!id || !profiles[id]) return;
      const profile = profiles[id];
      profile.academy ||= {};
      profile.academy.examHistory ||= [];
      profile.academy.xp = Number(profile.academy.xp || 0) + Math.max(25, state.correct * 8);
      profile.academy.examHistory.unshift({ date:new Date().toISOString(), area:'exams', family:state.family, subject:state.subject, category:state.category, total, correct:state.correct, percent, elapsed, center:true });
      profile.academy.examHistory = profile.academy.examHistory.slice(0,50);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
      try { window.dispatchEvent(new StorageEvent('storage', { key:PROFILE_KEY, newValue:JSON.stringify(profiles), storageArea:localStorage })); } catch {}
    } catch (error) {
      console.warn(error);
    }
  }

  function tick() {
    if (!state || !Number.isFinite(state.seconds)) return;
    state.seconds--;
    setText('centerTimer', formatSeconds(state.seconds));
    if (state.seconds <= 0) finishExam();
  }

  function stopExam(reset=true) {
    clearInterval(timer);
    timer = null;
    if (reset) state = null;
  }

  function openModal() {
    document.getElementById('examModal')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function inferFamily(item) {
    if (item.family) return item.family;
    if (String(item.subject).startsWith('qudurat')) return 'qudurat';
    if (String(item.subject).startsWith('tahsili')) return 'tahsili';
    return 'other';
  }

  function categoryName(subject, category) {
    return (bank.meta.categories[subject] || []).find(item => item.id === category)?.title || '';
  }

  function label(percent) {
    return percent >= 90 ? 'ممتاز جدًا' : percent >= 80 ? 'ممتاز' : percent >= 70 ? 'جيد جدًا' : percent >= 60 ? 'جيد' : 'يحتاج إلى مراجعة منظمة';
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function shuffle(items) {
    for (let index=items.length-1; index>0; index--) {
      const random = Math.floor(Math.random() * (index + 1));
      [items[index], items[random]] = [items[random], items[index]];
    }
    return items;
  }

  function formatSeconds(seconds) {
    if (!Number.isFinite(seconds)) return '∞';
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.max(0, seconds % 60);
    return `${String(minutes).padStart(2,'0')}:${String(remainder).padStart(2,'0')}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
  }

  function track(name, params={}) {
    window.gtag?.('event', name, { app_name:'neon_academy_exam_center', ...params });
  }
})();
