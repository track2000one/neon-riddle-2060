(() => {
  'use strict';

  const ACADEMY = window.NEON_ACADEMY;
  const PROFILE_KEY = 'neonRiddleGrandProfilesV4';
  const SETTINGS_KEY = 'neonRiddleGrandSettingsV4';
  const CUSTOM_CONTENT_KEY = 'neonAcademyCustomContentV1';
  const PAGE_SIZE = 24;
  const AVATARS = ['🧠','👑','🧩','🚀','💻','🔬','📚','🎯','🦾','🐉'];

  const CODE_TEMPLATES = {
    html: `<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n  <meta charset="utf-8">\n  <title>صفحتي</title>\n</head>\n<body>\n  <h1>مرحبًا بك في NEON Academy</h1>\n  <p>عدّل الصفحة ثم اضغط تشغيل.</p>\n  <button>ابدأ التعلم</button>\n</body>\n</html>`,
    css: `<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<style>\nbody {\n  font-family: Tahoma, sans-serif;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #07101f;\n  color: white;\n}\n.card {\n  padding: 28px;\n  border-radius: 22px;\n  background: #14213d;\n  box-shadow: 0 20px 50px rgba(0,0,0,.3);\n}\n</style>\n</head>\n<body>\n  <section class="card">\n    <h1>بطاقة CSS</h1>\n    <p>غيّر الألوان والحجم والتنسيق.</p>\n  </section>\n</body>\n</html>`,
    javascript: `const numbers = [3, 7, 12, 5, 9];\nconst total = numbers.reduce((sum, value) => sum + value, 0);\nconst average = total / numbers.length;\n\nconsole.log('المجموع:', total);\nconsole.log('المتوسط:', average);`,
    python: `numbers = [3, 7, 12, 5, 9]\ntotal = sum(numbers)\naverage = total / len(numbers)\nprint("Total:", total)\nprint("Average:", average)`,
    java: `public class Main {\n  public static void main(String[] args) {\n    int[] numbers = {3, 7, 12, 5, 9};\n    int total = 0;\n    for (int value : numbers) total += value;\n    System.out.println("Total: " + total);\n  }\n}`,
    cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n  vector<int> numbers = {3, 7, 12, 5, 9};\n  int total = 0;\n  for (int value : numbers) total += value;\n  cout << "Total: " << total << endl;\n  return 0;\n}`,
    csharp: `using System;\n\nclass Program {\n  static void Main() {\n    int[] numbers = {3, 7, 12, 5, 9};\n    int total = 0;\n    foreach (int value in numbers) total += value;\n    Console.WriteLine($"Total: {total}");\n  }\n}`,
    dart: `void main() {\n  final numbers = [3, 7, 12, 5, 9];\n  final total = numbers.reduce((a, b) => a + b);\n  print('Total: $total');\n}`,
    sql: `CREATE TABLE students (\n  id INTEGER PRIMARY KEY,\n  name VARCHAR(100),\n  score INTEGER\n);\n\nSELECT name, score\nFROM students\nWHERE score >= 80\nORDER BY score DESC;`,
    git: `git init\ngit add .\ngit commit -m "Initial academy project"\ngit branch -M main\ngit remote add origin https://github.com/USERNAME/PROJECT.git\ngit push -u origin main`
  };

  const LANGUAGE_CHECKS = {
    python: [/#|print\s*\(|def\s+|for\s+|if\s+/i, 'أضف تعليمة Python مثل print أو دالة أو شرط أو حلقة.'],
    java: [/class\s+\w+|public\s+static\s+void\s+main/i, 'يُفضل أن يتضمن المثال class ودالة main.'],
    cpp: [/#include|int\s+main|cout/i, 'أضف include أو main أو cout إلى مثال C++.'],
    csharp: [/using\s+System|class\s+\w+|Console\.WriteLine/i, 'أضف بنية C# مثل class أو Console.WriteLine.'],
    dart: [/void\s+main|final\s+|print\s*\(/i, 'أضف main أو متغيرًا أو print في Dart.'],
    sql: [/SELECT|CREATE\s+TABLE|INSERT|UPDATE|DELETE/i, 'أضف استعلام SQL مثل SELECT أو CREATE TABLE.'],
    git: [/git\s+(init|add|commit|push|pull|status)/i, 'أضف أمر Git صحيحًا مثل git status أو git commit.']
  };

  let profiles = readJson(PROFILE_KEY, {});
  let settings = readJson(SETTINGS_KEY, { activeId: null });
  let activeId = settings.activeId || Object.keys(profiles)[0] || null;
  let student = ensureStudent();
  let visibleLimit = PAGE_SIZE;
  let activeArea = 'all';
  let activeSubject = 'all';
  let activeLevel = 'all';
  let query = '';
  let activeLesson = null;
  let activeLanguage = 'javascript';
  let examState = null;
  let examTimer = null;
  let escapeState = null;
  let toastTimer = null;

  const lessonGrid = document.getElementById('lessonGrid');
  const searchInput = document.getElementById('searchInput');
  const areaFilter = document.getElementById('areaFilter');
  const levelFilter = document.getElementById('levelFilter');
  const subjectFilter = document.getElementById('subjectFilter');
  const subjectRail = document.getElementById('subjectRail');
  const toast = document.getElementById('toast');

  initializeAnalytics();
  updateStreak();
  saveAll();
  renderEverything();
  bindEvents();

  function initializeAnalytics() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-NZNC6929YS', {
      send_page_view: true,
      page_title: 'NEON Academy 2060',
      page_location: window.location.href,
      transport_type: 'beacon'
    });
    track('academy_loaded', { total_lessons: ACADEMY.counts.totalLessons });
  }

  function track(eventName, parameters = {}) {
    window.gtag?.('event', eventName, { app_name: 'neon_academy_2060', ...parameters });
  }

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function ensureStudent() {
    if (!activeId || !profiles[activeId]) {
      activeId = `academy_${Date.now()}`;
      profiles[activeId] = {
        id: activeId,
        name: 'طالب جديد',
        score: 0,
        coins: 180,
        levels: {},
        stats: { answered: 0, correct: 0, hintsUsed: 0 },
        theme: 'neon',
        avatar: '🧠'
      };
      settings.activeId = activeId;
    }

    const profile = profiles[activeId];
    profile.academy ??= {};
    const academy = profile.academy;
    academy.name ??= profile.name || 'طالب جديد';
    academy.grade ??= 'المرحلة الثانوية';
    academy.avatar ??= profile.avatar || '🧠';
    academy.xp ??= 0;
    academy.completed ??= [];
    academy.certificates ??= [];
    academy.streak ??= 0;
    academy.lastActive ??= '';
    academy.lastLesson ??= '';
    academy.dailyDate ??= '';
    academy.domainScores ??= { games: 0, knowledge: 0, exams: 0, coding: 0 };
    academy.domainAttempts ??= { games: 0, knowledge: 0, exams: 0, coding: 0 };
    academy.examHistory ??= [];
    academy.escapeCompleted ??= [];
    academy.createdAt ??= new Date().toISOString();
    return academy;
  }

  function saveAll() {
    profiles[activeId].name = student.name;
    profiles[activeId].avatar = student.avatar;
    profiles[activeId].academy = student;
    settings.activeId = activeId;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function todayKey(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function updateStreak() {
    const today = todayKey();
    const yesterday = todayKey(-1);
    if (!student.lastActive) {
      student.streak = 1;
      student.lastActive = today;
    } else if (student.lastActive === yesterday) {
      student.streak += 1;
      student.lastActive = today;
    } else if (student.lastActive !== today) {
      student.streak = 1;
      student.lastActive = today;
    }
  }

  function getAllLessons() {
    const custom = readJson(CUSTOM_CONTENT_KEY, []);
    return [...ACADEMY.lessons, ...custom.filter(item => item && item.id)];
  }

  function studentLevel() {
    return Math.floor(student.xp / 500) + 1;
  }

  function levelProgress() {
    return student.xp % 500;
  }

  function renderEverything() {
    renderHeader();
    renderHeroMetrics();
    renderAreas();
    populateSubjects();
    renderSubjectRail();
    renderLessons();
    renderLanguages();
    setLanguage(activeLanguage, false);
    renderStudentDashboard();
    populateTeacherSubjects();
  }

  function renderHeader() {
    document.getElementById('studentAvatar').textContent = student.avatar;
    document.getElementById('studentName').textContent = student.name;
    document.getElementById('studentLevel').textContent = `المستوى ${studentLevel()}`;
  }

  function renderHeroMetrics() {
    document.getElementById('heroLessonCount').textContent = ACADEMY.counts.totalLessons.toLocaleString('ar-SA');
    document.getElementById('heroSubjectCount').textContent = ACADEMY.counts.subjects.toLocaleString('ar-SA');
    document.getElementById('heroQuestionCount').textContent = ACADEMY.counts.questions.toLocaleString('ar-SA');
    document.getElementById('metricXp').textContent = student.xp.toLocaleString('ar-SA');
    document.getElementById('metricCompleted').textContent = student.completed.length.toLocaleString('ar-SA');
    document.getElementById('metricStreak').textContent = `${student.streak.toLocaleString('ar-SA')} يوم`;
    document.getElementById('metricCertificates').textContent = student.certificates.length.toLocaleString('ar-SA');
    const mastery = Math.min(100, Math.round((student.completed.length / Math.max(1, getAllLessons().length)) * 100));
    document.getElementById('metricMastery').textContent = `${mastery}%`;
  }

  function renderAreas() {
    const lessons = getAllLessons();
    document.getElementById('areaCards').innerHTML = Object.values(ACADEMY.AREAS).map(area => {
      const count = lessons.filter(item => item.area === area.id).length;
      const complete = lessons.filter(item => item.area === area.id && student.completed.includes(item.id)).length;
      return `
        <article class="area-card" data-area-card="${area.id}" style="--area-color:${area.color}">
          <div class="area-icon">${area.icon}</div>
          <h3>${area.title}</h3>
          <p>${area.description}</p>
          <div class="area-meta"><div><strong>${count.toLocaleString('ar-SA')}</strong><small> وحدة</small></div><span>${complete.toLocaleString('ar-SA')} مكتملة ←</span></div>
        </article>
      `;
    }).join('');
  }

  function populateSubjects() {
    const lessons = getAllLessons();
    const unique = [...new Map(lessons.map(item => [item.subjectId, { id:item.subjectId, title:item.subject, icon:item.subjectIcon, area:item.area }])).values()];
    subjectFilter.innerHTML = '<option value="all">كل التخصصات</option>' + unique.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.icon)} ${escapeHtml(item.title)}</option>`).join('');
  }

  function renderSubjectRail() {
    const lessons = getAllLessons().filter(item => activeArea === 'all' || item.area === activeArea);
    const unique = [...new Map(lessons.map(item => [item.subjectId, { id:item.subjectId, title:item.subject, icon:item.subjectIcon }])).values()];
    subjectRail.innerHTML = `<button class="subject-chip ${activeSubject === 'all' ? 'active' : ''}" data-subject-chip="all">الكل</button>` + unique.map(item => `<button class="subject-chip ${activeSubject === item.id ? 'active' : ''}" data-subject-chip="${escapeHtml(item.id)}">${escapeHtml(item.icon)} ${escapeHtml(item.title)}</button>`).join('');
  }

  function filteredLessons() {
    const normalizedQuery = normalizeText(query);
    return getAllLessons().filter(item => {
      const areaMatch = activeArea === 'all' || item.area === activeArea;
      const subjectMatch = activeSubject === 'all' || item.subjectId === activeSubject;
      const levelMatch = activeLevel === 'all' || item.level === activeLevel;
      const text = normalizeText(`${item.title} ${item.subject} ${item.summary} ${item.topic}`);
      return areaMatch && subjectMatch && levelMatch && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }

  function renderLessons() {
    const filtered = filteredLessons();
    const visible = filtered.slice(0, visibleLimit);
    document.getElementById('visibleCount').textContent = filtered.length.toLocaleString('ar-SA');
    lessonGrid.innerHTML = visible.length ? visible.map(renderLessonCard).join('') : '<div class="empty-library">لا توجد وحدات مطابقة لبحثك.</div>';
    const loadButton = document.getElementById('loadMoreButton');
    loadButton.classList.toggle('hidden', visible.length >= filtered.length);
  }

  function renderLessonCard(lesson) {
    const completed = student.completed.includes(lesson.id);
    return `
      <article class="lesson-card ${completed ? 'completed' : ''}" style="--lesson-color:${lesson.color}" data-lesson-card="${escapeHtml(lesson.id)}">
        ${completed ? '<span class="completion-mark">✓</span>' : ''}
        <div class="lesson-card-top">
          <div class="lesson-subject"><span>${escapeHtml(lesson.subjectIcon)}</span>${escapeHtml(lesson.subject)}</div>
          <span class="lesson-level">${escapeHtml(lesson.levelTitle)}</span>
        </div>
        <h3>${escapeHtml(lesson.title)}</h3>
        <p>${escapeHtml(lesson.summary)}</p>
        <div class="lesson-footer">
          <div class="lesson-meta"><span>⏱ ${lesson.duration} د</span><span>⚡ ${lesson.xp} XP</span></div>
          <button class="lesson-open" data-open-lesson="${escapeHtml(lesson.id)}">←</button>
        </div>
      </article>
    `;
  }

  function openLesson(lessonId) {
    const lesson = getAllLessons().find(item => item.id === lessonId);
    if (!lesson) return;
    activeLesson = lesson;
    student.lastLesson = lesson.id;
    saveAll();

    const question = selectQuestionForLesson(lesson);
    const completed = student.completed.includes(lesson.id);
    const modal = document.getElementById('lessonModalContent');
    modal.innerHTML = `
      <div class="lesson-head" style="--lesson-color:${lesson.color}">
        <div class="lesson-head-icon">${escapeHtml(lesson.subjectIcon)}</div>
        <div><span class="eyebrow">${escapeHtml(ACADEMY.AREAS[lesson.area]?.title || lesson.area)} • ${escapeHtml(lesson.levelTitle)}</span><h2>${escapeHtml(lesson.title)}</h2><p>${escapeHtml(lesson.summary)}</p></div>
      </div>
      <div class="lesson-content-grid">
        <article class="lesson-body">
          <h3>الشرح</h3>
          <p>${escapeHtml(lesson.content)}</p>
          <h3>أهداف الدرس</h3>
          <ul class="lesson-objectives">${lesson.objectives.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          <h3>النشاط التطبيقي</h3>
          <p>${escapeHtml(lesson.activity)}</p>
          ${lesson.disclaimer ? `<p class="lesson-disclaimer">${escapeHtml(lesson.disclaimer)}</p>` : ''}
          ${question ? renderQuickCheck(question) : ''}
        </article>
        <aside class="lesson-side">
          <h3>بطاقة الوحدة</h3>
          <ul>
            <li>المسار: ${escapeHtml(ACADEMY.AREAS[lesson.area]?.title || lesson.area)}</li>
            <li>التخصص: ${escapeHtml(lesson.subject)}</li>
            <li>المستوى: ${escapeHtml(lesson.levelTitle)}</li>
            <li>المدة التقديرية: ${lesson.duration} دقيقة</li>
            <li>المكافأة: ${lesson.xp} نقطة خبرة</li>
          </ul>
          ${lesson.playground ? '<button class="outline-action" data-jump-coding="true">فتح مختبر البرمجة</button>' : ''}
          <button id="completeLessonButton" class="lesson-complete" ${completed ? 'disabled' : ''}>${completed ? '✓ تم إكمال الوحدة' : 'إكمال الوحدة والحصول على النقاط'}</button>
        </aside>
      </div>
    `;
    openModal('lessonModal');
    track('academy_lesson_opened', { lesson_id: lesson.id, area: lesson.area, subject: lesson.subjectId });
  }

  function selectQuestionForLesson(lesson) {
    const exact = ACADEMY.questionBank.filter(question => question.subject === lesson.subjectId);
    const area = ACADEMY.questionBank.filter(question => question.area === lesson.area);
    const pool = exact.length ? exact : area;
    if (!pool.length) return null;
    const index = Math.abs(hashCode(lesson.id)) % pool.length;
    return pool[index];
  }

  function renderQuickCheck(question) {
    return `
      <div class="quick-check" data-question-id="${question.id}">
        <h4>تحقق سريع: ${escapeHtml(question.q)}</h4>
        <div class="quick-options">${question.options.map((option, index) => `<button class="quick-option" data-quick-answer="${index}">${escapeHtml(option)}</button>`).join('')}</div>
        <div class="quick-feedback"></div>
      </div>
    `;
  }

  function answerQuickCheck(button) {
    const container = button.closest('.quick-check');
    const question = ACADEMY.questionBank.find(item => item.id === container.dataset.questionId);
    if (!question || container.dataset.answered) return;
    const selected = Number(button.dataset.quickAnswer);
    const buttons = [...container.querySelectorAll('.quick-option')];
    buttons.forEach((item, index) => {
      item.disabled = true;
      if (index === question.answer) item.classList.add('correct');
    });
    const correct = selected === question.answer;
    if (!correct) button.classList.add('wrong');
    container.dataset.answered = 'true';
    container.querySelector('.quick-feedback').textContent = `${correct ? 'إجابة صحيحة. ' : 'راجع الإجابة الصحيحة. '}${question.explain}`;
    recordDomainResult(activeLesson?.area || question.area, correct);
    profiles[activeId].stats ??= { answered:0, correct:0 };
    profiles[activeId].stats.answered = (profiles[activeId].stats.answered || 0) + 1;
    if (correct) profiles[activeId].stats.correct = (profiles[activeId].stats.correct || 0) + 1;
    saveAll();
    track('academy_quick_check_answered', { correct, subject: question.subject });
  }

  function completeLesson() {
    if (!activeLesson || student.completed.includes(activeLesson.id)) return;
    student.completed.push(activeLesson.id);
    student.xp += activeLesson.xp;
    recordDomainResult(activeLesson.area, true, 2);
    maybeAwardCertificate(activeLesson.area);
    saveAll();
    renderEverything();
    document.getElementById('completeLessonButton').disabled = true;
    document.getElementById('completeLessonButton').textContent = '✓ تم إكمال الوحدة';
    showToast(`أحسنت! حصلت على ${activeLesson.xp} XP`);
    track('academy_lesson_completed', { lesson_id: activeLesson.id, area: activeLesson.area, xp: activeLesson.xp });
  }

  function maybeAwardCertificate(area) {
    const areaCompleted = getAllLessons().filter(item => item.area === area && student.completed.includes(item.id)).length;
    const thresholds = [5, 15, 30, 60];
    const reached = thresholds.filter(value => areaCompleted >= value).pop();
    if (!reached) return;
    const id = `${area}-${reached}`;
    if (student.certificates.some(item => item.id === id)) return;
    student.certificates.push({ id, area, count: reached, title: `شهادة إنجاز ${ACADEMY.AREAS[area].title}`, date: todayKey() });
  }

  function recordDomainResult(area, correct, weight = 1) {
    if (!student.domainScores[area] && student.domainScores[area] !== 0) student.domainScores[area] = 0;
    if (!student.domainAttempts[area] && student.domainAttempts[area] !== 0) student.domainAttempts[area] = 0;
    student.domainAttempts[area] += weight;
    if (correct) student.domainScores[area] += weight;
  }

  function renderLanguages() {
    document.getElementById('languageList').innerHTML = ACADEMY.programmingSubjects.map(language => `
      <button class="language-item ${language.id === activeLanguage ? 'active' : ''}" data-language="${language.id}">
        <span style="color:${language.color}">${escapeHtml(language.icon)}</span>${escapeHtml(language.title)}
      </button>
    `).join('');
  }

  function setLanguage(languageId, reset = true) {
    const language = ACADEMY.programmingSubjects.find(item => item.id === languageId);
    if (!language) return;
    activeLanguage = languageId;
    document.querySelectorAll('.language-item').forEach(item => item.classList.toggle('active', item.dataset.language === languageId));
    document.getElementById('activeLanguageIcon').textContent = language.icon;
    document.getElementById('activeLanguageTitle').textContent = language.title;
    if (reset || !document.getElementById('codeEditor').value) document.getElementById('codeEditor').value = CODE_TEMPLATES[languageId] || '';
    document.getElementById('livePreview').srcdoc = '';
    document.getElementById('consoleOutput').textContent = `${language.title} workspace ready…`;
    document.getElementById('codeFeedback').className = 'code-feedback';
    document.getElementById('codeFeedback').textContent = ['html','css','javascript'].includes(languageId) ? 'يمكن تشغيل هذا المسار مباشرة داخل المتصفح.' : 'هذا المسار يقدم فحصًا تعليميًا لبنية الكود دون تنفيذ خادم.';
  }

  function runCode() {
    const editor = document.getElementById('codeEditor');
    const code = editor.value;
    const preview = document.getElementById('livePreview');
    const output = document.getElementById('consoleOutput');
    const feedback = document.getElementById('codeFeedback');
    feedback.className = 'code-feedback';

    if (!code.trim()) {
      feedback.classList.add('error');
      feedback.textContent = 'اكتب كودًا أولًا.';
      return;
    }

    if (activeLanguage === 'html' || activeLanguage === 'css') {
      preview.srcdoc = code;
      output.textContent = 'Preview rendered successfully.';
      feedback.classList.add('success');
      feedback.textContent = 'تم تحديث المعاينة. راجع البنية والتجاوب وإتاحة الوصول.';
    } else if (activeLanguage === 'javascript') {
      const logs = [];
      try {
        const consoleProxy = { log: (...args) => logs.push(args.map(value => typeof value === 'object' ? JSON.stringify(value) : String(value)).join(' ')) };
        Function('console', `"use strict";\n${code}`)(consoleProxy);
        output.textContent = logs.length ? logs.join('\n') : 'Executed without console output.';
        preview.srcdoc = '<!doctype html><html><body style="font-family:Arial;display:grid;place-items:center;height:100vh"><h2>JavaScript executed</h2></body></html>';
        feedback.classList.add('success');
        feedback.textContent = 'تم تنفيذ JavaScript بنجاح داخل بيئة المتصفح.';
        recordDomainResult('coding', true);
      } catch (error) {
        output.textContent = `${error.name}: ${error.message}`;
        feedback.classList.add('error');
        feedback.textContent = 'يوجد خطأ في الكود. اقرأ رسالة Console وحدد السطر أو الصياغة المسببة للمشكلة.';
        recordDomainResult('coding', false);
      }
    } else {
      const [pattern, message] = LANGUAGE_CHECKS[activeLanguage] || [/.+/, ''];
      const valid = pattern.test(code);
      output.textContent = valid ? 'Structure check passed. Use a local compiler or trusted online runtime for execution.' : message;
      feedback.classList.add(valid ? 'success' : 'error');
      feedback.textContent = valid ? 'اجتاز الكود الفحص البنيوي التعليمي. راجع الأنواع والأسماء والحالات الحدية.' : message;
      recordDomainResult('coding', valid);
    }

    saveAll();
    renderStudentDashboard();
    track('academy_code_checked', { language: activeLanguage });
  }

  function renderStudentDashboard() {
    const level = studentLevel();
    const progress = levelProgress();
    document.getElementById('dashboardAvatar').textContent = student.avatar;
    document.getElementById('dashboardName').textContent = student.name;
    document.getElementById('dashboardGrade').textContent = student.grade;
    document.getElementById('dashboardLevel').textContent = level.toLocaleString('ar-SA');
    document.getElementById('nextLevelText').textContent = `${progress.toLocaleString('ar-SA')} / 500 XP`;
    document.getElementById('levelProgressBar').style.width = `${(progress / 500) * 100}%`;

    const skills = Object.values(ACADEMY.AREAS).map(area => {
      const attempts = student.domainAttempts[area.id] || 0;
      const score = student.domainScores[area.id] || 0;
      const completed = getAllLessons().filter(item => item.area === area.id && student.completed.includes(item.id)).length;
      const percent = attempts ? Math.round((score / attempts) * 100) : Math.min(100, completed * 4);
      return { ...area, percent };
    });

    document.getElementById('skillBars').innerHTML = skills.map(skill => `
      <div class="skill-item"><div><span>${skill.icon} ${skill.title}</span><span>${skill.percent}%</span></div><div class="skill-track"><div style="width:${skill.percent}%;background:linear-gradient(90deg,${skill.color},var(--purple))"></div></div></div>
    `).join('');

    const sorted = [...skills].sort((a,b) => a.percent - b.percent);
    const plan = [];
    for (const skill of sorted) {
      const lesson = getAllLessons().find(item => item.area === skill.id && !student.completed.includes(item.id));
      if (lesson) plan.push(lesson);
      if (plan.length === 4) break;
    }
    document.getElementById('learningPlan').innerHTML = plan.length ? plan.map(item => `<li data-plan-lesson="${item.id}"><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.subject)} • ${item.duration} دقيقة</li>`).join('') : '<li>أكملت المسارات الأساسية. اختر وحدات الإتقان المتقدمة.</li>';
    document.getElementById('startPlanButton').dataset.lessonId = plan[0]?.id || '';
  }

  function populateTeacherSubjects() {
    const subjectMap = new Map(getAllLessons().map(item => [item.subjectId, { id:item.subjectId, title:item.subject, area:item.area }]));
    document.getElementById('teacherSubject').innerHTML = [...subjectMap.values()].map(item => `<option value="${escapeHtml(item.id)}" data-area="${item.area}">${escapeHtml(item.title)}</option>`).join('');
  }

  function askTeacher() {
    const subjectSelect = document.getElementById('teacherSubject');
    const subjectId = subjectSelect.value;
    const subjectTitle = subjectSelect.options[subjectSelect.selectedIndex]?.textContent || subjectId;
    const mode = document.getElementById('teacherMode').value;
    const prompt = document.getElementById('teacherPrompt').value.trim();
    const relatedLessons = getAllLessons().filter(item => item.subjectId === subjectId);
    const lesson = findRelevantLesson(relatedLessons, prompt) || relatedLessons.find(item => !student.completed.includes(item.id)) || relatedLessons[0];
    const area = lesson?.area || 'knowledge';
    const guideKey = area === 'coding' ? 'coding' : area === 'exams' ? 'exams' : subjectId;
    const guide = ACADEMY.teacherGuides[guideKey] || ACADEMY.teacherGuides[area] || 'قسّم الموضوع إلى مفاهيم صغيرة، ابدأ بالأساسيات، ثم طبّق مثالًا وتحقق من الفهم.';
    const question = ACADEMY.questionBank.find(item => item.subject === subjectId) || ACADEMY.questionBank.find(item => item.area === area);

    let title = 'شرح مخصص';
    let body = '';
    if (mode === 'practice') {
      title = `تمرين جديد في ${subjectTitle}`;
      body = question ? `<div class="answer-section"><h4>السؤال</h4><p>${escapeHtml(question.q)}</p><p><strong>الخيارات:</strong> ${question.options.map(escapeHtml).join(' — ')}</p></div><div class="answer-section"><h4>طريقة التفكير</h4><p>${escapeHtml(guide)}</p></div>` : `<div class="answer-section"><h4>المهمة</h4><p>${escapeHtml(lesson?.activity || `أنشئ مثالًا تطبيقيًا في ${subjectTitle}.`)}</p></div>`;
    } else if (mode === 'plan') {
      title = `خطة مذاكرة في ${subjectTitle}`;
      const planLessons = relatedLessons.filter(item => !student.completed.includes(item.id)).slice(0, 5);
      body = `<div class="answer-section"><h4>خطة مقترحة</h4><ol>${planLessons.map(item => `<li>${escapeHtml(item.title)} — ${item.duration} دقيقة</li>`).join('') || '<li>راجع وحدات الإتقان المتقدمة.</li>'}</ol></div><div class="answer-section"><h4>أسلوب الدراسة</h4><p>${escapeHtml(guide)}</p></div>`;
    } else if (mode === 'code') {
      title = `مراجعة برمجية في ${subjectTitle}`;
      body = `<div class="answer-section"><h4>منهج المراجعة</h4><p>${escapeHtml(guide)}</p></div><div class="answer-section"><h4>قائمة تحقق</h4><ol><li>هل المدخلات والمخرجات واضحة؟</li><li>هل أسماء المتغيرات والدوال مفهومة؟</li><li>هل توجد حالات حدية أو أخطاء محتملة؟</li><li>هل يمكن تقسيم الحل إلى دوال أصغر؟</li><li>هل اختبرت مثالًا صحيحًا وآخر غير متوقع؟</li></ol></div>`;
    } else {
      title = prompt ? `شرح: ${prompt.slice(0, 70)}` : `شرح ${lesson?.topic || subjectTitle}`;
      body = `<div class="answer-section"><h4>الفكرة الأساسية</h4><p>${escapeHtml(lesson?.content || `ابدأ بفهم الأساسيات في ${subjectTitle}.`)}</p></div><div class="answer-section"><h4>خطوات الفهم والحل</h4><p>${escapeHtml(guide)}</p></div><div class="answer-section"><h4>تطبيق سريع</h4><p>${escapeHtml(lesson?.activity || 'طبّق مثالًا ثم اشرح لماذا نجح الحل.')}</p></div>`;
    }

    document.getElementById('teacherResponse').innerHTML = `<div class="teacher-answer"><span class="eyebrow">ADAPTIVE RESPONSE • المستوى ${studentLevel()}</span><h3>${escapeHtml(title)}</h3>${body}${lesson ? `<button class="primary-small" data-teacher-lesson="${lesson.id}">فتح الوحدة المرتبطة</button>` : ''}</div>`;
    track('academy_teacher_used', { mode, subject: subjectId });
  }

  function findRelevantLesson(lessons, prompt) {
    const normalized = normalizeText(prompt);
    if (!normalized) return null;
    return lessons.find(item => normalizeText(`${item.title} ${item.topic} ${item.summary}`).split(' ').some(word => word.length > 3 && normalized.includes(word)));
  }

  function openExamSetup(daily = false) {
    if (daily) {
      startDailyChallenge();
      return;
    }
    document.getElementById('examContent').innerHTML = `
      <div class="exam-setup">
        <span class="eyebrow">TRAINING EXAM BUILDER</span><h2>إنشاء اختبار تدريبي</h2><p>اختر المجال وعدد الأسئلة والوقت. الأسئلة أصلية تدريبية وغير رسمية.</p>
        <div class="setup-grid">
          <label class="setup-field">المجال<select id="examArea"><option value="all">اختبار مختلط</option><option value="knowledge">المعرفة</option><option value="exams">القدرات والاختبارات</option><option value="coding">البرمجة</option></select></label>
          <label class="setup-field">عدد الأسئلة<select id="examCount"><option value="5">5 أسئلة</option><option value="10" selected>10 أسئلة</option><option value="20">20 سؤالًا</option></select></label>
          <label class="setup-field">الزمن الكلي<select id="examMinutes"><option value="5">5 دقائق</option><option value="10" selected>10 دقائق</option><option value="20">20 دقيقة</option><option value="0">وقت مفتوح</option></select></label>
          <label class="setup-field">المستوى<select id="examLevel"><option value="all">مختلط</option><option value="foundation">تأسيسي</option><option value="practice">تطبيقي</option><option value="mastery">متقدم</option></select></label>
        </div>
        <button class="primary-action" id="startExamButton">بدء الاختبار</button>
      </div>`;
    openModal('examModal');
  }

  function startExam() {
    const area = document.getElementById('examArea').value;
    const count = Number(document.getElementById('examCount').value);
    const minutes = Number(document.getElementById('examMinutes').value);
    const level = document.getElementById('examLevel').value;
    let pool = ACADEMY.questionBank.filter(item => (area === 'all' || item.area === area) && (level === 'all' || item.level === level));
    if (pool.length < count) pool = ACADEMY.questionBank.filter(item => area === 'all' || item.area === area);
    const questions = shuffle([...pool]).slice(0, Math.min(count, pool.length));
    examState = { questions, index:0, correct:0, answers:[], startedAt:Date.now(), seconds:minutes ? minutes * 60 : Infinity, area, daily:false };
    renderExamQuestion();
    clearInterval(examTimer);
    if (Number.isFinite(examState.seconds)) examTimer = setInterval(tickExam, 1000);
    track('academy_exam_started', { area, question_count: questions.length, minutes });
  }

  function startDailyChallenge() {
    const date = todayKey();
    const index = Math.abs(hashCode(date)) % ACADEMY.questionBank.length;
    examState = { questions:[ACADEMY.questionBank[index]], index:0, correct:0, answers:[], startedAt:Date.now(), seconds:60, area:'daily', daily:true };
    document.getElementById('examContent').innerHTML = '';
    openModal('examModal');
    renderExamQuestion();
    clearInterval(examTimer);
    examTimer = setInterval(tickExam, 1000);
    track('academy_daily_challenge_started');
  }

  function renderExamQuestion() {
    const question = examState.questions[examState.index];
    if (!question) return finishExam();
    document.getElementById('examContent').innerHTML = `
      <div class="exam-screen">
        <div class="exam-top"><span>السؤال ${examState.index + 1} من ${examState.questions.length}</span><span id="examTimerText" class="exam-timer">${formatSeconds(examState.seconds)}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${(examState.index / examState.questions.length) * 100}%"></div></div>
        <h2 class="exam-question">${escapeHtml(question.q)}</h2>
        <div class="exam-options">${question.options.map((option,index) => `<button class="exam-option" data-exam-answer="${index}">${escapeHtml(option)}</button>`).join('')}</div>
      </div>`;
  }

  function answerExam(index) {
    const question = examState.questions[examState.index];
    const correct = index === question.answer;
    if (correct) examState.correct += 1;
    examState.answers.push({ questionId:question.id, selected:index, correct });
    recordDomainResult(question.area === 'exams' ? 'exams' : question.area, correct);
    examState.index += 1;
    renderExamQuestion();
  }

  function tickExam() {
    if (!examState || !Number.isFinite(examState.seconds)) return;
    examState.seconds -= 1;
    const label = document.getElementById('examTimerText');
    if (label) label.textContent = formatSeconds(examState.seconds);
    if (examState.seconds <= 0) finishExam();
  }

  function finishExam() {
    clearInterval(examTimer);
    examTimer = null;
    if (!examState) return;
    const total = examState.questions.length;
    const percent = total ? Math.round((examState.correct / total) * 100) : 0;
    const elapsed = Math.max(1, Math.round((Date.now() - examState.startedAt) / 1000));
    const reward = examState.daily && student.dailyDate !== todayKey() ? 100 : Math.max(20, examState.correct * 12);
    student.xp += reward;
    if (examState.daily) student.dailyDate = todayKey();
    student.examHistory.unshift({ date:new Date().toISOString(), area:examState.area, total, correct:examState.correct, percent, elapsed });
    student.examHistory = student.examHistory.slice(0, 30);
    saveAll();
    renderEverything();

    document.getElementById('examContent').innerHTML = `
      <div class="exam-result"><span class="eyebrow">EXAM REPORT</span><h2>${examState.daily ? 'نتيجة تحدي اليوم' : 'نتيجة الاختبار'}</h2>
        <div class="result-score"><strong>${percent}%</strong><small>درجة تدريبية</small></div>
        <div class="result-grid"><div><strong>${examState.correct}/${total}</strong><small>إجابات صحيحة</small></div><div><strong>${formatSeconds(elapsed)}</strong><small>الزمن المستخدم</small></div><div><strong>+${reward}</strong><small>XP مكتسبة</small></div></div>
        <p>${percent >= 80 ? 'أداء ممتاز. انتقل إلى مستوى أعلى أو جرّب اختبارًا أطول.' : percent >= 60 ? 'أداء جيد. راجع الأسئلة التي تحتاج مزيدًا من التدريب.' : 'ابدأ بوحدات التأسيس ثم أعد المحاولة بعد مراجعة المفاهيم.'}</p>
        <button class="primary-action" data-close="examModal">العودة للمكتبة</button>
      </div>`;
    track('academy_exam_completed', { area:examState.area, score:percent, correct:examState.correct, total });
    examState = null;
  }

  function openEscapeRooms() {
    document.getElementById('escapeContent').innerHTML = `
      <div class="escape-setup"><span class="eyebrow">EDUCATIONAL ESCAPE ROOMS</span><h2>اختر غرفة الهروب</h2><p>حل ثلاثة أقفال مترابطة لتحصل على مكافأة خبرة.</p>
        <div class="room-grid">${ACADEMY.escapeRooms.map(room => `<button class="room-card" data-room="${room.id}" style="--room-color:${room.color}"><span>${room.icon}</span><h3>${escapeHtml(room.title)}</h3><p>${escapeHtml(room.story)}</p></button>`).join('')}</div>
      </div>`;
    openModal('escapeModal');
  }

  function startEscapeRoom(roomId) {
    const room = ACADEMY.escapeRooms.find(item => item.id === roomId);
    if (!room) return;
    escapeState = { room, stage:0, attempts:0 };
    renderEscapeStage();
    track('academy_escape_started', { room_id:roomId });
  }

  function renderEscapeStage(message = '') {
    const { room, stage } = escapeState;
    const puzzle = room.stages[stage];
    document.getElementById('escapeContent').innerHTML = `
      <div class="escape-stage"><div class="escape-stage-icon">${room.icon}</div><span class="eyebrow">${escapeHtml(room.title)} • القفل ${stage + 1}</span><h2>${escapeHtml(puzzle.q)}</h2><p>${escapeHtml(room.story)}</p>
        <div class="escape-progress">${room.stages.map((_,index) => `<span class="${index < stage ? 'done' : ''}"></span>`).join('')}</div>
        <input id="escapeAnswer" autocomplete="off" placeholder="اكتب الإجابة..." />
        <div id="escapeMessage" class="form-message">${escapeHtml(message)}</div>
        <div class="hero-actions" style="justify-content:center"><button id="submitEscapeAnswer" class="primary-action">فتح القفل</button><button id="escapeHint" class="secondary-action">تلميح</button></div>
      </div>`;
    setTimeout(() => document.getElementById('escapeAnswer')?.focus(), 80);
  }

  function submitEscapeAnswer() {
    const puzzle = escapeState.room.stages[escapeState.stage];
    const value = normalizeAnswer(document.getElementById('escapeAnswer').value);
    const validAnswers = [puzzle.answer, ...(puzzle.alternatives || [])].map(normalizeAnswer);
    escapeState.attempts += 1;
    if (!validAnswers.includes(value)) {
      document.getElementById('escapeMessage').textContent = 'الإجابة غير صحيحة. فكّر بطريقة أخرى أو استخدم التلميح.';
      recordDomainResult('games', false);
      return;
    }
    recordDomainResult('games', true);
    escapeState.stage += 1;
    if (escapeState.stage >= escapeState.room.stages.length) return finishEscapeRoom();
    renderEscapeStage('تم فتح القفل. انتقل إلى التحدي التالي.');
  }

  function finishEscapeRoom() {
    const room = escapeState.room;
    const firstTime = !student.escapeCompleted.includes(room.id);
    const reward = firstTime ? 150 : 40;
    if (firstTime) student.escapeCompleted.push(room.id);
    student.xp += reward;
    saveAll();
    renderEverything();
    document.getElementById('escapeContent').innerHTML = `<div class="exam-result"><div style="font-size:70px">🏆</div><span class="eyebrow">ROOM ESCAPED</span><h2>نجحت في الهروب من ${escapeHtml(room.title)}</h2><p>فتحت جميع الأقفال بعد ${escapeState.attempts} محاولات.</p><div class="result-score"><strong>+${reward}</strong><small>XP</small></div><button class="primary-action" data-close="escapeModal">العودة</button></div>`;
    track('academy_escape_completed', { room_id:room.id, attempts:escapeState.attempts, reward });
    escapeState = null;
  }

  function openStudentModal() {
    document.getElementById('studentNameInput').value = student.name;
    document.getElementById('studentGradeInput').value = student.grade;
    document.getElementById('avatarChoices').innerHTML = AVATARS.map(avatar => `<button type="button" class="avatar-choice ${avatar === student.avatar ? 'active' : ''}" data-avatar="${avatar}">${avatar}</button>`).join('');
    openModal('studentModal');
  }

  function saveStudentProfile(event) {
    event.preventDefault();
    student.name = document.getElementById('studentNameInput').value.trim() || 'الطالب';
    student.grade = document.getElementById('studentGradeInput').value;
    student.avatar = document.querySelector('.avatar-choice.active')?.dataset.avatar || student.avatar;
    saveAll();
    renderEverything();
    closeModal('studentModal');
    showToast('تم حفظ ملف الطالب');
    track('academy_student_profile_updated', { grade:student.grade });
  }

  function openCertificate() {
    const completed = student.completed.length;
    const certificate = student.certificates.at(-1);
    const title = certificate?.title || 'شهادة مشاركة وتقدم';
    document.getElementById('certificateContent').innerHTML = `
      <div class="certificate"><div class="eyebrow" style="color:#8a6a1c">NEON ACADEMY 2060</div><h2>شهادة إنجاز</h2><p>تشهد منصة NEON Academy 2060 بأن</p><h3>${escapeHtml(student.name)}</h3><p>أكمل ${completed.toLocaleString('ar-SA')} وحدة تعليمية وحقق المستوى ${studentLevel().toLocaleString('ar-SA')} بإجمالي ${student.xp.toLocaleString('ar-SA')} نقطة خبرة.</p><p><strong>${escapeHtml(title)}</strong></p><div class="certificate-seal">2060</div><p>تاريخ الإصدار: ${new Intl.DateTimeFormat('ar-SA',{dateStyle:'long'}).format(new Date())}</p></div>
      <div class="certificate-actions"><button class="primary-action" id="printCertificateButton">طباعة / حفظ PDF</button><button class="secondary-action" data-close="certificateModal">إغلاق</button></div>`;
    openModal('certificateModal');
    track('academy_certificate_viewed');
  }

  function exportProgress() {
    const payload = {
      exportedAt:new Date().toISOString(),
      student,
      activeProfileId:activeId,
      catalogVersion:'academy-v1'
    };
    const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `neon-academy-progress-${todayKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('تم تصدير تقدم الطالب');
  }

  function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
    document.body.style.overflow = '';
    if (id === 'examModal') { clearInterval(examTimer); examTimer = null; examState = null; }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
  }

  function bindEvents() {
    document.querySelectorAll('[data-scroll]').forEach(button => button.addEventListener('click', () => scrollToSection(button.dataset.scroll)));
    document.getElementById('studentButton').addEventListener('click', openStudentModal);
    document.getElementById('editStudentButton').addEventListener('click', openStudentModal);
    document.getElementById('studentForm').addEventListener('submit', saveStudentProfile);
    document.getElementById('dailyButton').addEventListener('click', () => openExamSetup(true));
    document.getElementById('dailyActionButton').addEventListener('click', () => openExamSetup(true));
    document.getElementById('examButton').addEventListener('click', () => openExamSetup(false));
    document.getElementById('escapeButton').addEventListener('click', openEscapeRooms);
    document.getElementById('continueButton').addEventListener('click', () => student.lastLesson ? openLesson(student.lastLesson) : scrollToSection('tracks'));
    document.getElementById('loadMoreButton').addEventListener('click', () => { visibleLimit += PAGE_SIZE; renderLessons(); });
    document.getElementById('runCodeButton').addEventListener('click', runCode);
    document.getElementById('resetCodeButton').addEventListener('click', () => setLanguage(activeLanguage, true));
    document.getElementById('askTeacherButton').addEventListener('click', askTeacher);
    document.getElementById('certificateButton').addEventListener('click', openCertificate);
    document.getElementById('exportProgressButton').addEventListener('click', exportProgress);
    document.getElementById('startPlanButton').addEventListener('click', event => event.currentTarget.dataset.lessonId && openLesson(event.currentTarget.dataset.lessonId));

    searchInput.addEventListener('input', () => { query = searchInput.value; visibleLimit = PAGE_SIZE; renderLessons(); });
    areaFilter.addEventListener('change', () => { activeArea = areaFilter.value; activeSubject = 'all'; subjectFilter.value = 'all'; visibleLimit = PAGE_SIZE; renderSubjectRail(); renderLessons(); });
    levelFilter.addEventListener('change', () => { activeLevel = levelFilter.value; visibleLimit = PAGE_SIZE; renderLessons(); });
    subjectFilter.addEventListener('change', () => { activeSubject = subjectFilter.value; visibleLimit = PAGE_SIZE; renderSubjectRail(); renderLessons(); });

    document.addEventListener('click', event => {
      const close = event.target.closest('[data-close]');
      if (close) return closeModal(close.dataset.close);

      const areaCard = event.target.closest('[data-area-card]');
      if (areaCard) {
        activeArea = areaCard.dataset.areaCard;
        areaFilter.value = activeArea;
        activeSubject = 'all';
        subjectFilter.value = 'all';
        visibleLimit = PAGE_SIZE;
        renderSubjectRail();
        renderLessons();
        scrollToSection('library');
        track('academy_area_opened', { area:activeArea });
        return;
      }

      const subjectChip = event.target.closest('[data-subject-chip]');
      if (subjectChip) {
        activeSubject = subjectChip.dataset.subjectChip;
        subjectFilter.value = activeSubject;
        visibleLimit = PAGE_SIZE;
        renderSubjectRail();
        renderLessons();
        return;
      }

      const lessonButton = event.target.closest('[data-open-lesson]');
      if (lessonButton) return openLesson(lessonButton.dataset.openLesson);
      const lessonCard = event.target.closest('[data-lesson-card]');
      if (lessonCard && !event.target.closest('button')) return openLesson(lessonCard.dataset.lessonCard);
      const quickAnswer = event.target.closest('[data-quick-answer]');
      if (quickAnswer) return answerQuickCheck(quickAnswer);
      if (event.target.id === 'completeLessonButton') return completeLesson();
      const jumpCoding = event.target.closest('[data-jump-coding]');
      if (jumpCoding) { closeModal('lessonModal'); scrollToSection('coding'); }

      const language = event.target.closest('[data-language]');
      if (language) return setLanguage(language.dataset.language);
      const teacherLesson = event.target.closest('[data-teacher-lesson]');
      if (teacherLesson) return openLesson(teacherLesson.dataset.teacherLesson);

      if (event.target.id === 'startExamButton') return startExam();
      const examAnswer = event.target.closest('[data-exam-answer]');
      if (examAnswer) return answerExam(Number(examAnswer.dataset.examAnswer));

      const room = event.target.closest('[data-room]');
      if (room) return startEscapeRoom(room.dataset.room);
      if (event.target.id === 'submitEscapeAnswer') return submitEscapeAnswer();
      if (event.target.id === 'escapeHint') {
        const puzzle = escapeState?.room.stages[escapeState.stage];
        if (puzzle) document.getElementById('escapeMessage').textContent = `تلميح: ${puzzle.hint}`;
      }

      const avatar = event.target.closest('[data-avatar]');
      if (avatar) {
        document.querySelectorAll('.avatar-choice').forEach(item => item.classList.remove('active'));
        avatar.classList.add('active');
      }
      if (event.target.id === 'printCertificateButton') window.print();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(modal => closeModal(modal.id));
      if (event.key === 'Enter' && document.activeElement?.id === 'escapeAnswer') submitEscapeAnswer();
    });

    window.addEventListener('storage', event => {
      if (event.key === PROFILE_KEY || event.key === SETTINGS_KEY) {
        profiles = readJson(PROFILE_KEY, {});
        settings = readJson(SETTINGS_KEY, { activeId:null });
        activeId = settings.activeId || activeId;
        student = ensureStudent();
        renderEverything();
      }
    });

    window.addEventListener('scroll', updateActiveNav, { passive:true });
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function updateActiveNav() {
    const sections = ['home','tracks','library','coding','teacher'];
    let current = 'home';
    for (const id of sections) {
      const element = document.getElementById(id);
      if (element && element.getBoundingClientRect().top <= 150) current = id;
    }
    document.querySelectorAll('.nav-link').forEach(item => item.classList.toggle('active', item.dataset.scroll === current));
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[^\u0600-\u06FFA-Za-z0-9\s+#]/g,' ').replace(/\s+/g,' ').trim();
  }

  function normalizeAnswer(value) {
    return normalizeText(value).replace(/\s/g,'');
  }

  function hashCode(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash) + value.charCodeAt(i) | 0;
    return hash;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function formatSeconds(seconds) {
    if (!Number.isFinite(seconds)) return '∞';
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2,'0')}:${String(remainder).padStart(2,'0')}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[character]);
  }
})();
