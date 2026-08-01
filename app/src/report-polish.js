import './report-polish.css';

const CATEGORY_LABELS = new Map(Object.entries({
  algebra:'الجبر', arithmetic:'الحساب', percentages:'النسب المئوية', percentage:'النسب المئوية', ratios:'النسب والتناسب', ratio:'النسب والتناسب',
  fractions:'الكسور', decimals:'الأعداد العشرية', integers:'الأعداد الصحيحة', numbers:'الأعداد', 'number-sense':'الحس العددي', exponents:'الأسس', roots:'الجذور',
  equations:'المعادلات', inequalities:'المتباينات', functions:'الدوال', polynomials:'كثيرات الحدود', 'rational-expressions':'العبارات النسبية', sequences:'المتتابعات', matrices:'المصفوفات',
  geometry:'الهندسة', 'analytic-geometry':'الهندسة التحليلية', 'solid-geometry':'الهندسة الفراغية', transformations:'التحويلات', conics:'القطوع المخروطية', trigonometry:'المثلثات', measurement:'القياس',
  probability:'الاحتمالات', statistics:'الإحصاء', combinatorics:'العد', calculus:'التفاضل والتكامل', 'word-problems':'المسائل اللفظية',
  analogy:'التناظر اللفظي', analogies:'التناظر اللفظي', vocabulary:'المفردات', 'sentence-completion':'إكمال الجمل', 'contextual-error':'الخطأ السياقي', 'reading-comprehension':'استيعاب المقروء', 'verbal-reasoning':'الاستدلال اللفظي',
  motion:'الحركة', projectiles:'المقذوفات', equilibrium:'الاتزان', rotation:'الدوران', momentum:'الزخم', energy:'الطاقة', 'work-power':'الشغل والقدرة', oscillations:'الاهتزازات', waves:'الموجات', optics:'البصريات', sound:'الصوت', electricity:'الكهرباء', circuits:'الدوائر الكهربائية', magnetism:'المغناطيسية', modern:'الفيزياء الحديثة',
  matter:'المادة', atmosphere:'الغلاف الجوي', liquids:'السوائل', laws:'القوانين', 'phase-diagram':'مخططات الطور', atomic:'الذرة', nuclear:'النواة', 'electron-config':'التوزيع الإلكتروني', periodic:'الجدول الدوري', ions:'الأيونات', bonding:'الروابط', nomenclature:'التسمية', polarity:'القطبية', intermolecular:'القوى بين الجزيئات', hybridization:'التهجين', 'ionic-solids':'المواد الأيونية', reactions:'التفاعلات', formulas:'الصيغ الكيميائية', stoichiometry:'الحسابات الكيميائية', yield:'المردود', gases:'الغازات',
  genetics:'الوراثة', ecology:'علم البيئة', environment:'علوم البيئة', ecosystems:'الأنظمة البيئية', biodiversity:'التنوع الحيوي', behavior:'السلوك الحيواني', evolution:'التطور', classification:'التصنيف', cells:'الخلايا', plants:'النبات', animals:'الحيوان', microbiology:'الأحياء الدقيقة', anatomy:'أجهزة الجسم', reproduction:'التكاثر'
}));

const LABEL_SELECTORS = [
  '.exam-report-breakdown article>div span',
  '.review-state-row>small',
  '.question-category',
  '#advancedTahsiliLab .atl-progress small',
  '#advancedTahsiliLab .atl-badge',
  '#biologyMasteryLab .bio-progress-card small',
  '#biologyMasteryLab .bio-breakdown article small',
  '#biologyMasteryLab .bio-badge'
].join(',');

function normalizedKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
}

function localizeElement(element) {
  if (!(element instanceof HTMLElement)) return;
  const key = normalizedKey(element.textContent);
  const label = CATEGORY_LABELS.get(key);
  if (!label || element.dataset.neonLocalizedCategory === key) return;
  element.textContent = label;
  element.dataset.neonLocalizedCategory = key;
  element.lang = 'ar';
  element.dir = 'rtl';
}

function localizeReports(root = document) {
  if (root instanceof HTMLElement && root.matches(LABEL_SELECTORS)) localizeElement(root);
  root.querySelectorAll?.(LABEL_SELECTORS).forEach(localizeElement);

  root.querySelectorAll?.('.exam-report,.atl-runner,.bio-runner').forEach(report => {
    report.lang = 'ar';
    report.dir = 'rtl';
  });
}

function initialize() {
  localizeReports();
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.target instanceof HTMLElement) localizeReports(mutation.target);
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) localizeReports(node);
      });
    }
  });
  observer.observe(document.body, { childList:true, subtree:true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once:true });
else initialize();
