import './exam-skill-selector.css';
import { ExamMasteryController } from './exam-mastery.js';

const STORAGE_KEY = 'neonExamSkillSelectionV1';
const controllers = new Map();
let activeSubject = '';

const CATEGORY_LABELS = {
  algebra:'الجبر', arithmetic:'الحساب', percentages:'النسب المئوية', percentage:'النسب المئوية', ratios:'النسب والتناسب', ratio:'النسب والتناسب',
  fractions:'الكسور', decimals:'الأعداد العشرية', integers:'الأعداد الصحيحة', numbers:'الأعداد', 'number-sense':'الحس العددي', exponents:'الأسس', roots:'الجذور',
  equations:'المعادلات', inequalities:'المتباينات', functions:'الدوال', polynomials:'كثيرات الحدود', 'rational-expressions':'العبارات النسبية', sequences:'المتتابعات', matrices:'المصفوفات',
  geometry:'الهندسة', 'analytic-geometry':'الهندسة التحليلية', 'solid-geometry':'الهندسة الفراغية', transformations:'التحويلات', conics:'القطوع المخروطية', trigonometry:'المثلثات', measurement:'القياس',
  probability:'الاحتمالات', statistics:'الإحصاء', combinatorics:'العد', calculus:'التفاضل والتكامل', 'word-problems':'المسائل اللفظية', speed:'السرعة', work:'العمل', 'speed-work':'السرعة والعمل',
  analogy:'التناظر اللفظي', analogies:'التناظر اللفظي', vocabulary:'المفردات', 'sentence-completion':'إكمال الجمل', 'contextual-error':'الخطأ السياقي', 'reading-comprehension':'استيعاب المقروء', 'verbal-reasoning':'الاستدلال اللفظي',
  motion:'الحركة', projectiles:'المقذوفات', equilibrium:'الاتزان', rotation:'الدوران', momentum:'الزخم', energy:'الطاقة', 'work-power':'الشغل والقدرة', oscillations:'الاهتزازات', waves:'الموجات', optics:'البصريات', sound:'الصوت', electricity:'الكهرباء', circuits:'الدوائر الكهربائية', magnetism:'المغناطيسية', modern:'الفيزياء الحديثة',
  matter:'المادة', atmosphere:'الغلاف الجوي', liquids:'السوائل', laws:'القوانين', 'phase-diagram':'مخططات الطور', atomic:'الذرة', nuclear:'النواة', 'electron-config':'التوزيع الإلكتروني', periodic:'الجدول الدوري', ions:'الأيونات', bonding:'الروابط', nomenclature:'التسمية', polarity:'القطبية', intermolecular:'القوى بين الجزيئات', hybridization:'التهجين', 'ionic-solids':'المواد الأيونية', reactions:'التفاعلات', formulas:'الصيغ الكيميائية', stoichiometry:'الحسابات الكيميائية', yield:'المردود', gases:'الغازات',
  genetics:'الوراثة', ecology:'علم البيئة', environment:'علوم البيئة', ecosystems:'الأنظمة البيئية', biodiversity:'التنوع الحيوي', behavior:'السلوك الحيواني', evolution:'التطور', classification:'التصنيف', cells:'الخلايا', plants:'النبات', animals:'الحيوان', microbiology:'الأحياء الدقيقة', anatomy:'أجهزة الجسم', reproduction:'التكاثر'
};

function normalizeCategory(value) {
  return String(value || 'general').trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
}

function categoryLabel(category) {
  const key = normalizeCategory(category);
  return CATEGORY_LABELS[key] || String(category || 'مهارات عامة').replace(/[-_]+/g, ' ');
}

function readSelections() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch { return {}; }
}

function saveSelection(subject, value) {
  if (!subject) return;
  const selections = readSelections();
  selections[subject] = value;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selections)); }
  catch { /* Selection remains available for the current session. */ }
}

function currentLevel() {
  return document.getElementById('examLevel')?.value || 'all';
}

function currentMode() {
  return document.getElementById('examMode')?.value || 'smart';
}

function questionMatchesLevel(question, level) {
  return question?.active !== false && (level === 'all' || question.level === level);
}

function modeEligible(controller, question, mode) {
  const record = controller.record(question);
  if (mode === 'new') return record.status === 'new';
  if (mode === 'review') return ['review', 'reinforcing', 'learning'].includes(record.status) && controller.isDue(record);
  if (mode === 'mastered') return record.status === 'mastered';
  return true;
}

function weakCategories(controller, level = 'all', mode = 'smart') {
  const stats = new Map();
  for (const question of controller.questions) {
    if (!questionMatchesLevel(question, level) || !modeEligible(controller, question, mode)) continue;
    const category = normalizeCategory(question.category);
    const record = controller.record(question);
    const row = stats.get(category) || { category, attempts:0, correct:0, wrong:0, review:0, total:0 };
    row.total += 1;
    row.attempts += Number(record.attempts || 0);
    row.correct += Number(record.correctCount || 0);
    row.wrong += Number(record.wrongCount || 0);
    if (record.status === 'review' || record.status === 'reinforcing') row.review += 1;
    stats.set(category, row);
  }

  return [...stats.values()]
    .filter(row => row.attempts > 0 || row.review > 0)
    .sort((a, b) => {
      const aAccuracy = a.attempts ? a.correct / a.attempts : 1;
      const bAccuracy = b.attempts ? b.correct / b.attempts : 1;
      return (b.review - a.review) || (aAccuracy - bAccuracy) || (b.wrong - a.wrong) || (b.total - a.total);
    })
    .slice(0, 3)
    .map(row => row.category);
}

function temporarilySelect(controller, questions, options, originalSelect) {
  const previous = controller.questions;
  controller.questions = questions;
  try { return originalSelect.call(controller, options); }
  finally { controller.questions = previous; }
}

if (!ExamMasteryController.prototype.__neonSkillSelectorPatched) {
  const originalLoad = ExamMasteryController.prototype.load;
  const originalSelect = ExamMasteryController.prototype.select;

  ExamMasteryController.prototype.load = async function patchedLoad(...args) {
    const result = await originalLoad.apply(this, args);
    controllers.set(this.subjectId, this);
    if (this.subjectId === activeSubject) renderSelector(this);
    return result;
  };

  ExamMasteryController.prototype.select = function patchedSelect(options = {}) {
    const select = document.getElementById('examSkill');
    const skill = select?.value || 'auto';
    const mode = options.mode || 'smart';
    const level = options.level || 'all';
    const requested = Math.max(1, Number(options.count || 10));

    // Comprehensive simulation and automatic error review must preserve their full distribution.
    if (!select || skill === 'all' || mode === 'all' || mode === 'review') {
      return originalSelect.call(this, options);
    }

    if (skill !== 'auto') {
      const focused = this.questions.filter(question => normalizeCategory(question.category) === skill);
      return temporarilySelect(this, focused, options, originalSelect);
    }

    const weak = weakCategories(this, level, mode);
    if (!weak.length) return originalSelect.call(this, options);

    const weakSet = new Set(weak);
    const focused = this.questions.filter(question => weakSet.has(normalizeCategory(question.category)));
    const selected = temporarilySelect(this, focused, options, originalSelect);
    if (selected.length >= requested) return selected.slice(0, requested);

    // Complete the requested session from the remaining pool without duplicating questions.
    const selectedIds = new Set(selected.map(question => String(question.id)));
    const remaining = originalSelect.call(this, { ...options, count: requested * 2 })
      .filter(question => !selectedIds.has(String(question.id)));
    return [...selected, ...remaining].slice(0, requested);
  };

  Object.defineProperty(ExamMasteryController.prototype, '__neonSkillSelectorPatched', { value:true });
}

function ensureUi() {
  const fields = document.querySelector('.setup-fields');
  if (!fields || document.getElementById('examSkill')) return;

  const label = document.createElement('label');
  label.className = 'exam-skill-field';
  label.innerHTML = `المهارة أو المحور
    <select id="examSkill" aria-describedby="examSkillHint">
      <option value="auto">تلقائي حسب نقاط الضعف — موصى به</option>
      <option value="all">كل المهارات</option>
    </select>
    <small class="exam-skill-hint" id="examSkillHint">يحدد النظام أضعف المحاور ويبدأ بها.</small>`;

  const modeLabel = document.getElementById('examMode')?.closest('label');
  fields.insertBefore(label, modeLabel || fields.children[1] || null);

  const summary = document.createElement('div');
  summary.className = 'exam-skill-summary';
  summary.id = 'examSkillSummary';
  summary.innerHTML = '<span>اختر مادة لعرض المهارات المتاحة.</span><span>—</span>';
  fields.appendChild(summary);

  document.getElementById('examSkill').addEventListener('change', event => {
    saveSelection(activeSubject, event.target.value);
    updateAvailability();
  });
  document.getElementById('examMode')?.addEventListener('change', updateModePolicy);
  document.getElementById('examLevel')?.addEventListener('change', updateAvailability);
}

function categoryCounts(controller, level = 'all', mode = 'smart') {
  const counts = new Map();
  for (const question of controller.questions) {
    if (!questionMatchesLevel(question, level) || !modeEligible(controller, question, mode)) continue;
    const category = normalizeCategory(question.category);
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return counts;
}

function renderSelector(controller) {
  ensureUi();
  const select = document.getElementById('examSkill');
  if (!select || !controller) return;

  const saved = readSelections()[controller.subjectId] || 'auto';
  const counts = categoryCounts(controller, 'all', 'smart');
  const options = [...counts.entries()]
    .sort((a, b) => categoryLabel(a[0]).localeCompare(categoryLabel(b[0]), 'ar'));

  select.innerHTML = `
    <option value="auto">تلقائي حسب نقاط الضعف — موصى به</option>
    <option value="all">كل المهارات (${controller.questions.filter(q => q.active !== false).length.toLocaleString('ar-SA')})</option>
    ${options.map(([category, count]) => `<option value="${category}">${categoryLabel(category)} (${count.toLocaleString('ar-SA')})</option>`).join('')}`;
  select.value = [...select.options].some(option => option.value === saved) ? saved : 'auto';
  updateModePolicy();
}

function selectedEligibleQuestions(controller) {
  const select = document.getElementById('examSkill');
  const level = currentLevel();
  const mode = currentMode();
  let questions = controller.questions.filter(question => questionMatchesLevel(question, level) && modeEligible(controller, question, mode));

  if (!select || mode === 'all' || mode === 'review' || select.value === 'all') return questions;
  if (select.value === 'auto') {
    const weak = weakCategories(controller, level, mode);
    if (weak.length) {
      const set = new Set(weak);
      const focused = questions.filter(question => set.has(normalizeCategory(question.category)));
      if (focused.length) return focused;
    }
    return questions;
  }
  return questions.filter(question => normalizeCategory(question.category) === select.value);
}

function adjustCountOptions(available) {
  const countSelect = document.getElementById('examCount');
  if (!countSelect) return;
  countSelect.querySelectorAll('option[data-skill-generated]').forEach(option => option.remove());
  [...countSelect.options].forEach(option => { option.disabled = Number(option.value) > available; });

  if (available > 0 && ![...countSelect.options].some(option => Number(option.value) === available) && available < 40) {
    const option = document.createElement('option');
    option.value = String(available);
    option.textContent = `${available.toLocaleString('ar-SA')} سؤالًا — المتاح`;
    option.dataset.skillGenerated = 'true';
    countSelect.appendChild(option);
  }

  if (available > 0 && Number(countSelect.value) > available) countSelect.value = String(available);
  if (!available) countSelect.selectedIndex = 0;
}

function updateAvailability() {
  ensureUi();
  const controller = controllers.get(activeSubject);
  const select = document.getElementById('examSkill');
  const hint = document.getElementById('examSkillHint');
  const summary = document.getElementById('examSkillSummary');
  if (!controller || !select || !summary) return;

  const questions = selectedEligibleQuestions(controller);
  const available = questions.length;
  const label = select.value === 'auto'
    ? (() => {
        const weak = weakCategories(controller, currentLevel(), currentMode());
        return weak.length ? `الأولوية: ${weak.map(categoryLabel).join('، ')}` : 'سيبدأ النظام بجميع المحاور حتى تتوفر بيانات كافية.';
      })()
    : select.value === 'all'
      ? 'توزيع شامل على جميع المهارات المتاحة.'
      : `تدريب مركز في ${categoryLabel(select.value)}.`;

  if (hint) hint.textContent = label;
  summary.innerHTML = `<span><strong>${label}</strong> سيتم اختيار الأسئلة دون تكرار وفق النمط والمستوى المحددين.</span><span>${available.toLocaleString('ar-SA')} متاح</span>`;
  adjustCountOptions(available);
}

function updateModePolicy() {
  ensureUi();
  const select = document.getElementById('examSkill');
  if (!select) return;
  const mode = currentMode();
  const locked = mode === 'all' || mode === 'review';

  if (mode === 'all') select.value = 'all';
  if (mode === 'review') select.value = 'auto';
  select.disabled = locked;
  select.title = mode === 'all'
    ? 'المحاكاة الشاملة تغطي جميع المهارات.'
    : mode === 'review'
      ? 'مراجعة الأخطاء تُبنى تلقائيًا من سجل الطالب.'
      : '';
  updateAvailability();
}

function activateSubject(subject) {
  if (!subject) return;
  activeSubject = subject;
  ensureUi();
  const controller = controllers.get(subject);
  if (controller) renderSelector(controller);
}

function detectSelectedSubject() {
  const selected = document.querySelector('.exam-subject.selected[data-subject]');
  if (selected) activateSubject(selected.dataset.subject);
}

function initialize() {
  ensureUi();
  document.addEventListener('click', event => {
    const subject = event.target.closest('.exam-subject[data-subject]');
    if (subject) activateSubject(subject.dataset.subject);
  }, true);

  const observer = new MutationObserver(() => detectSelectedSubject());
  const subjects = document.getElementById('examSubjects');
  if (subjects) observer.observe(subjects, { attributes:true, childList:true, subtree:true, attributeFilter:['class'] });
  detectSelectedSubject();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once:true });
else initialize();
