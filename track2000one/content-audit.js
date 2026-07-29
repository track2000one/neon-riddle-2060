(() => {
  'use strict';

  if (window.__NEON_ADMIN_CONTENT_AUDIT__) return;
  window.__NEON_ADMIN_CONTENT_AUDIT__ = true;

  const STORAGE_KEY = 'neonAcademyContentAuditV1';
  const numberFormat = new Intl.NumberFormat('ar-SA');
  const dateFormat = new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const fallbackDescriptions = [
    'فحص التكرار النصي وتوحيد الحروف والأرقام وعلامات الترقيم قبل مقارنة الأسئلة.',
    'التحقق من وجود نص السؤال والخيارات والإجابة الصحيحة والتصنيف والمستوى.',
    'إصلاح معرفات الأسئلة والإجابات والخيارات القابلة للإصلاح قبل تفعيلها.',
    'التحقق من توفر الرسم أو الجدول للأسئلة البصرية، واستبعاد السؤال الناقص.',
    'إبقاء التنبيهات الفنية وتقارير المراجعة داخل لوحة المسؤول وعدم عرضها للطالب.'
  ];

  function injectStyles() {
    if (document.getElementById('contentAuditStyles')) return;
    const style = document.createElement('style');
    style.id = 'contentAuditStyles';
    style.textContent = `
      .content-audit-panel{margin-bottom:22px;overflow:hidden}
      .content-audit-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
      .content-audit-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .content-audit-actions a{text-decoration:none}
      .content-audit-state{margin:18px 0 0;padding:13px 16px;border:1px solid rgba(99,235,255,.18);border-radius:14px;background:rgba(99,235,255,.055);color:#b9c6e9;line-height:1.8}
      .content-audit-state.is-warning{border-color:rgba(255,199,93,.28);background:rgba(255,199,93,.07);color:#f4d99a}
      .content-audit-metrics{display:grid;grid-template-columns:repeat(6,minmax(130px,1fr));gap:12px;margin-top:16px}
      .content-audit-metric{min-height:112px;padding:17px;border:1px solid rgba(255,255,255,.09);border-radius:17px;background:rgba(7,12,30,.46);display:flex;flex-direction:column;justify-content:center;gap:7px}
      .content-audit-metric small{color:#9ba8cd;line-height:1.5}
      .content-audit-metric strong{font-size:28px;color:#fff}
      .content-audit-description{margin-top:16px;padding:18px;border:1px solid rgba(255,255,255,.08);border-radius:17px;background:rgba(7,12,30,.34)}
      .content-audit-description h4{margin:0 0 12px;font-size:17px}
      .content-audit-description ul{margin:0;padding:0 20px 0 0;color:#b7c2e2;line-height:2}
      .content-audit-private{margin-top:14px;padding:12px 15px;border-radius:13px;background:rgba(99,242,169,.07);border:1px solid rgba(99,242,169,.18);color:#9fe7c3;line-height:1.7}
      @media(max-width:1180px){.content-audit-metrics{grid-template-columns:repeat(3,minmax(140px,1fr))}}
      @media(max-width:680px){.content-audit-metrics{grid-template-columns:repeat(2,minmax(120px,1fr))}.content-audit-actions{width:100%}.content-audit-actions>*{flex:1;text-align:center}}
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    const librarySection = document.getElementById('librarySection');
    if (!librarySection) return null;

    let panel = document.getElementById('contentAuditPanel');
    if (panel) return panel;

    panel = document.createElement('article');
    panel.id = 'contentAuditPanel';
    panel.className = 'panel content-audit-panel';
    panel.innerHTML = `
      <div class="content-audit-heading">
        <div>
          <span class="eyebrow">CONTENT QUALITY CONTROL</span>
          <h3 style="margin:4px 0 7px">تقرير مراجعة بنك الأسئلة</h3>
          <p style="margin:0;color:#98a5ca;line-height:1.8">التنبيهات الفنية ووصف عمليات الفحص نُقلت من واجهة الطالب إلى شاشة المسؤول.</p>
        </div>
        <div class="content-audit-actions">
          <button id="contentAuditRefresh" class="outline-button compact" type="button">تحديث التقرير</button>
          <a class="outline-button compact" href="../academy/#test-center" target="_blank" rel="noopener">فتح مركز الاختبارات</a>
        </div>
      </div>
      <div id="contentAuditState" class="content-audit-state"></div>
      <div class="content-audit-metrics">
        <article class="content-audit-metric"><small>الأسئلة الفعالة</small><strong id="auditActiveQuestions">—</strong></article>
        <article class="content-audit-metric"><small>الأسئلة المستوردة والمراجعة</small><strong id="auditImportedQuestions">—</strong></article>
        <article class="content-audit-metric"><small>الأسئلة البصرية</small><strong id="auditVisualQuestions">—</strong></article>
        <article class="content-audit-metric"><small>التكرارات المستبعدة</small><strong id="auditDuplicatesRemoved">—</strong></article>
        <article class="content-audit-metric"><small>الحالات التي تم إصلاحها</small><strong id="auditRepairs">—</strong></article>
        <article class="content-audit-metric"><small>الأسئلة غير الصالحة</small><strong id="auditInvalidQuestions">—</strong></article>
      </div>
      <div class="content-audit-description">
        <h4>وصف عمليات المراجعة</h4>
        <ul id="contentAuditDescriptions"></ul>
      </div>
      <div class="content-audit-private">🔒 هذا التقرير إداري، ولا يظهر للطلاب داخل الأكاديمية أو أثناء الاختبار.</div>
    `;

    librarySection.insertBefore(panel, librarySection.firstChild);
    panel.querySelector('#contentAuditRefresh')?.addEventListener('click', render);
    return panel;
  }

  function readReport() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch {
      return null;
    }
  }

  function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? numberFormat.format(number) : '—';
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function renderDescriptions(descriptions) {
    const list = document.getElementById('contentAuditDescriptions');
    if (!list) return;
    list.replaceChildren();
    (Array.isArray(descriptions) && descriptions.length ? descriptions : fallbackDescriptions).forEach(description => {
      const item = document.createElement('li');
      item.textContent = description;
      list.appendChild(item);
    });
  }

  function render() {
    injectStyles();
    if (!createPanel()) return;

    const report = readReport();
    const state = document.getElementById('contentAuditState');

    if (!report) {
      state?.classList.add('is-warning');
      if (state) state.textContent = 'لا توجد لقطة مراجعة محفوظة على هذا المتصفح بعد. افتح الأكاديمية مرة واحدة بعد التحديث، ثم ارجع إلى مكتبة المحتوى واضغط «تحديث التقرير».';
      ['auditActiveQuestions','auditImportedQuestions','auditVisualQuestions','auditDuplicatesRemoved','auditRepairs','auditInvalidQuestions'].forEach(id => setText(id, '—'));
      renderDescriptions(fallbackDescriptions);
      return;
    }

    state?.classList.remove('is-warning');
    const updatedAt = report.generatedAt ? dateFormat.format(new Date(report.generatedAt)) : 'وقت غير محدد';
    if (state) state.textContent = `آخر لقطة فحص محفوظة من الأكاديمية: ${updatedAt}. الأرقام تعكس بنك الأسئلة الذي تم تحميله على هذا الجهاز.`;

    setText('auditActiveQuestions', formatNumber(report.activeExamQuestions));
    setText('auditImportedQuestions', formatNumber(report.importedQuestions));
    setText('auditVisualQuestions', formatNumber(report.visualQuestions));
    setText('auditDuplicatesRemoved', formatNumber(report.duplicatesRemoved));
    setText('auditRepairs', formatNumber(report.repairedCases));
    setText('auditInvalidQuestions', formatNumber(report.invalidQuestions));
    renderDescriptions(report.descriptionsAr);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
  else render();

  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) render();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render();
  });

  window.NEON_REFRESH_CONTENT_AUDIT = render;
})();
