import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { firebaseConfig, ADMIN_UID } from '../firebase-config.js';

const LESSONS_KEY = 'neonAcademyCustomContentV1';
const QUESTIONS_KEY = 'neonAcademyCustomQuestionsV1';
const PROFILES_KEY = 'neonRiddleGrandProfilesV4';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const loading = document.getElementById('loading');
const denied = document.getElementById('denied');
const studio = document.getElementById('studio');
const toast = document.getElementById('toast');
let toastTimer = null;

onAuthStateChanged(auth, async user => {
  if (!user || user.uid !== ADMIN_UID) {
    if (user) await signOut(auth);
    loading.classList.add('hidden');
    denied.classList.remove('hidden');
    return;
  }
  document.getElementById('adminEmail').textContent = user.email || 'المسؤول';
  loading.classList.add('hidden');
  studio.classList.remove('hidden');
  renderAll();
});

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[char]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function renderAll() {
  renderLessons();
  renderQuestions();
  renderStudents();
}

function renderLessons() {
  const lessons = read(LESSONS_KEY, []);
  document.getElementById('customLessonCount').textContent = `${lessons.length.toLocaleString('ar-SA')} درس`;
  document.getElementById('customLessons').innerHTML = lessons.length ? lessons.slice().reverse().map(lesson => `
    <article class="custom-item"><div><strong>${escapeHtml(lesson.title)}</strong><small>${escapeHtml(lesson.subject)} • ${escapeHtml(lesson.levelTitle)} • ${lesson.duration} دقيقة</small></div><button data-delete-lesson="${escapeHtml(lesson.id)}">×</button></article>
  `).join('') : '<div class="empty">لا توجد دروس مخصصة بعد.</div>';
}

function renderQuestions() {
  const questions = read(QUESTIONS_KEY, []);
  document.getElementById('customQuestionCount').textContent = `${questions.length.toLocaleString('ar-SA')} سؤال`;
  document.getElementById('customQuestions').innerHTML = questions.length ? questions.slice().reverse().map(question => `
    <article class="custom-item"><div><strong>${escapeHtml(question.q)}</strong><small>${escapeHtml(question.subject)} • الإجابة: ${escapeHtml(question.options[question.answer])}</small></div><button data-delete-question="${escapeHtml(question.id)}">×</button></article>
  `).join('') : '<div class="empty">لا توجد أسئلة مخصصة بعد.</div>';
}

function renderStudents() {
  const profiles = Object.values(read(PROFILES_KEY, {}));
  document.getElementById('studentsTable').innerHTML = profiles.length ? profiles.map(profile => {
    const completed = profile.academy?.completed?.length || 0;
    return `<tr><td>${escapeHtml(profile.avatar || '🧠')} <strong>${escapeHtml(profile.name || 'طالب')}</strong></td><td>${(Number(profile.score)||0).toLocaleString('ar-SA')}</td><td>${(Number(profile.academy?.xp)||0).toLocaleString('ar-SA')}</td><td>${completed.toLocaleString('ar-SA')}</td><td><button data-delete-student="${escapeHtml(profile.id)}">حذف محلي</button></td></tr>`;
  }).join('') : '<tr><td colspan="5">لا توجد ملفات محلية.</td></tr>';
}

function levelTitle(value) {
  return value === 'foundation' ? 'تأسيسي' : value === 'practice' ? 'تطبيقي' : 'إتقان';
}

function areaColor(area) {
  return { knowledge:'#63f2a9', coding:'#67edff', exams:'#ffd46e', games:'#ff6dbc' }[area] || '#67edff';
}

function areaIcon(area) {
  return { knowledge:'📚', coding:'💻', exams:'🎯', games:'🎮' }[area] || '◈';
}

document.getElementById('lessonForm').addEventListener('submit', event => {
  event.preventDefault();
  const area = document.getElementById('lessonArea').value;
  const level = document.getElementById('lessonLevel').value;
  const subject = document.getElementById('lessonSubject').value.trim();
  const title = document.getElementById('lessonTitle').value.trim();
  const summary = document.getElementById('lessonSummary').value.trim();
  const content = document.getElementById('lessonContent').value.trim();
  const activity = document.getElementById('lessonActivity').value.trim() || `طبّق ما تعلمته في ${title} بمثال جديد.`;
  const lessons = read(LESSONS_KEY, []);
  lessons.push({
    id:`custom-${area}-${Date.now()}`,
    area,
    subjectId:document.getElementById('lessonSubjectId').value.trim().toLowerCase().replace(/\s+/g,'-'),
    subject,
    subjectIcon:areaIcon(area),
    color:areaColor(area),
    title,
    topic:title,
    level,
    levelTitle:levelTitle(level),
    xp:Number(document.getElementById('lessonXp').value)||50,
    duration:Number(document.getElementById('lessonDuration').value)||15,
    summary,
    content,
    objectives:[`فهم مفهوم ${title}.`,'تطبيق الفكرة في نشاط قصير.','التحقق من الفهم وتسجيل التقدم.'],
    activity,
    custom:true,
    createdAt:new Date().toISOString()
  });
  write(LESSONS_KEY, lessons);
  event.target.reset();
  document.getElementById('lessonDuration').value = 15;
  document.getElementById('lessonXp').value = 50;
  renderLessons();
  showToast('تمت إضافة الدرس إلى الأكاديمية المحلية');
});

document.getElementById('questionForm').addEventListener('submit', event => {
  event.preventDefault();
  const questions = read(QUESTIONS_KEY, []);
  questions.push({
    id:`custom-q-${Date.now()}`,
    area:document.getElementById('questionArea').value,
    subject:document.getElementById('questionSubject').value.trim(),
    level:'practice',
    q:document.getElementById('questionText').value.trim(),
    options:[0,1,2,3].map(index => document.getElementById(`option${index}`).value.trim()),
    answer:Number(document.getElementById('correctAnswer').value),
    explain:document.getElementById('questionExplain').value.trim(),
    custom:true,
    createdAt:new Date().toISOString()
  });
  write(QUESTIONS_KEY, questions);
  event.target.reset();
  renderQuestions();
  showToast('تمت إضافة السؤال إلى البنك المحلي');
});

document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
  const tab = button.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(item => item.classList.toggle('active', item === button));
  document.querySelectorAll('.tab').forEach(section => section.classList.remove('active-tab'));
  document.getElementById(`${tab}Tab`).classList.add('active-tab');
  document.getElementById('pageTitle').textContent = { content:'إدارة المحتوى', questions:'بنك الأسئلة', students:'الطلاب المحليون', reports:'التقارير والتصدير' }[tab];
}));

document.addEventListener('click', event => {
  const lessonId = event.target.dataset.deleteLesson;
  if (lessonId) {
    if (!confirm('حذف هذا الدرس المخصص؟')) return;
    write(LESSONS_KEY, read(LESSONS_KEY, []).filter(item => item.id !== lessonId));
    renderLessons();
  }
  const questionId = event.target.dataset.deleteQuestion;
  if (questionId) {
    if (!confirm('حذف هذا السؤال المخصص؟')) return;
    write(QUESTIONS_KEY, read(QUESTIONS_KEY, []).filter(item => item.id !== questionId));
    renderQuestions();
  }
  const studentId = event.target.dataset.deleteStudent;
  if (studentId) {
    if (!confirm('سيُحذف ملف الطالب من هذا المتصفح فقط. متابعة؟')) return;
    const profiles = read(PROFILES_KEY, {});
    delete profiles[studentId];
    write(PROFILES_KEY, profiles);
    renderStudents();
  }
});

document.getElementById('exportContent').addEventListener('click', () => {
  downloadJson({ exportedAt:new Date().toISOString(), lessons:read(LESSONS_KEY, []), questions:read(QUESTIONS_KEY, []) }, 'neon-academy-custom-content.json');
});

document.getElementById('exportStudents').addEventListener('click', () => {
  const profiles = Object.values(read(PROFILES_KEY, {}));
  const rows = [['الاسم','النقاط','عملات','XP الأكاديمية','الوحدات المكتملة','المستوى']];
  profiles.forEach(profile => rows.push([
    profile.name || '', profile.score || 0, profile.coins || 0, profile.academy?.xp || 0,
    profile.academy?.completed?.length || 0, Math.floor((profile.academy?.xp || 0)/500)+1
  ]));
  const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadBlob(csv, 'text/csv;charset=utf-8', 'neon-academy-students.csv');
});

document.getElementById('importContent').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed.lessons) || !Array.isArray(parsed.questions)) throw new Error('invalid');
    write(LESSONS_KEY, parsed.lessons);
    write(QUESTIONS_KEY, parsed.questions);
    renderAll();
    showToast('تم استيراد المحتوى بنجاح');
  } catch {
    showToast('ملف JSON غير صالح');
  }
  event.target.value = '';
});

document.getElementById('clearCustom').addEventListener('click', () => {
  if (!confirm('سيتم حذف جميع الدروس والأسئلة المخصصة محليًا. هل أنت متأكد؟')) return;
  localStorage.removeItem(LESSONS_KEY);
  localStorage.removeItem(QUESTIONS_KEY);
  renderAll();
  showToast('تم مسح المحتوى المخصص');
});

document.getElementById('logoutButton').addEventListener('click', async () => {
  await signOut(auth);
  location.href = '../';
});

function downloadJson(value, filename) {
  downloadBlob(JSON.stringify(value,null,2), 'application/json;charset=utf-8', filename);
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
