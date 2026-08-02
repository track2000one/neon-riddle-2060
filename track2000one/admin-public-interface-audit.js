(() => {
  'use strict';

  if (window.__NEON_PUBLIC_INTERFACE_AUDIT__) return;
  window.__NEON_PUBLIC_INTERFACE_AUDIT__ = true;

  const auditItems = [
    {
      status: 'تمت المعالجة',
      title: 'ملاحظة الصيانة داخل مكتبة STEP',
      detail: 'أزيلت رسالة إزالة النسخ المكررة ومراجعة مفاتيح الإجابة وبيانات المصادر من واجهة الطالب. هذه المعلومات تشغيلية وتبقى في تقارير المسؤول.'
    },
    {
      status: 'تمت المعالجة',
      title: 'أوصاف تحميل الملفات وبنوك الأسئلة',
      detail: 'استبدلت عبارات إنشاء الواجهة ودمج البنك والتحميل في الخلفية برسائل تعليمية مختصرة لا تكشف تفاصيل التنفيذ.'
    },
    {
      status: 'تمت المعالجة',
      title: 'رسائل الخطأ الخام',
      detail: 'لم يعد الطالب يرى أسماء الملفات أو رموز HTTP أو مسارات legacy. تظهر رسالة عامة، بينما تبقى التفاصيل في وحدة التحكم للفحص الفني.'
    },
    {
      status: 'تمت المعالجة',
      title: 'وصف الخصوصية والبنية الخلفية',
      detail: 'أزيلت أسماء Firebase وPostgreSQL والخدمات الداخلية من صفحة الطالب، واستبدلت بعبارات واضحة عن المصادقة الآمنة وحفظ البيانات.'
    },
    {
      status: 'تمت المعالجة',
      title: 'المعلم الذكي المتوقف',
      detail: 'أوقف كود التنقل الذي كان يعيد إضافة رابط المعلم الذكي بعد حذفه، وبقي المسار القديم معزولًا عن المستخدم.'
    },
    {
      status: 'تمت المعالجة',
      title: 'وصف الألعاب والمكتبة',
      detail: 'استبدلت أوصاف الأداء التقني مثل «صفحة مستقلة دون تحميل بقية المنصة» بوصف يركز على الفائدة التعليمية للمستخدم.'
    },
    {
      status: 'تمت المعالجة',
      title: 'عدد أسئلة مركز الاختبارات',
      detail: 'أصبحت الواجهة تعرض عدد الأسئلة المتاحة للتدريب فقط، بينما تبقى إجراءات إزالة التكرار وفحص الجودة ضمن التقارير الإدارية.'
    }
  ];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function modernizeAdminCopy() {
    document.title = 'NEON Academy | لوحة المسؤول';

    const backLink = document.querySelector('.back-link');
    if (backLink) backLink.textContent = 'العودة إلى المنصة';

    const publicLink = document.querySelector('.sidebar-footer .secondary-link');
    if (publicLink) publicLink.textContent = 'فتح المنصة العامة';

    const overviewParagraph = document.querySelector('#overviewSection .hero-panel p');
    if (overviewParagraph) {
      overviewParagraph.textContent = 'لوحة المسؤول تعمل عبر GitHub Pages، وخدمات الإدارة المحمية تعمل عبر Railway، وتستخدم المنصة مصادقة آمنة وتقارير تشغيلية خاصة بالمسؤول.';
    }

    document.querySelectorAll('.quick-links a').forEach(link => {
      const strong = link.querySelector('strong');
      const small = link.querySelector('small');
      if (strong?.textContent?.trim() === 'الموقع العام') {
        strong.textContent = 'المنصة العامة';
        if (small) small.textContent = 'فتح النسخة المنشورة للطلاب';
      }
    });
  }

  function injectStyles() {
    if (document.getElementById('adminPublicAuditStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminPublicAuditStyles';
    style.textContent = `
      .admin-public-audit{margin:0 0 20px;padding:21px;border:1px solid rgba(99,235,255,.13);border-radius:20px;background:rgba(10,15,35,.72)}
      .admin-public-audit-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:16px}
      .admin-public-audit-head h3{margin:5px 0 6px}
      .admin-public-audit-head p{max-width:820px;margin:0;color:#99a6c9;line-height:1.8}
      .admin-public-audit-badge{padding:8px 11px;border:1px solid rgba(99,242,169,.25);border-radius:999px;background:rgba(99,242,169,.07);color:#a8e9ca;font-size:11px;font-weight:900}
      .admin-public-audit-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      .admin-public-audit-item{padding:14px;border:1px solid rgba(255,255,255,.075);border-radius:15px;background:rgba(255,255,255,.025)}
      .admin-public-audit-item header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
      .admin-public-audit-item strong{color:#f7f9ff}
      .admin-public-audit-item span{color:#78e8b2;font-size:10px;font-weight:900}
      .admin-public-audit-item p{margin:0;color:#98a5ca;line-height:1.75;font-size:12px}
      .admin-public-audit-policy{margin-top:14px;padding:13px 15px;border:1px solid rgba(255,212,109,.17);border-radius:14px;background:rgba(255,212,109,.055);color:#e8d69e;line-height:1.8}
      @media(max-width:850px){.admin-public-audit-list{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function createAuditPanel() {
    if (document.getElementById('adminPublicInterfaceAudit')) return true;

    const reportsSection = document.getElementById('reportsSection');
    if (!reportsSection) return false;

    injectStyles();
    const panel = document.createElement('article');
    panel.id = 'adminPublicInterfaceAudit';
    panel.className = 'admin-public-audit';
    panel.innerHTML = `
      <div class="admin-public-audit-head">
        <div>
          <span class="eyebrow">PUBLIC INTERFACE GOVERNANCE</span>
          <h3>فحص ما يظهر للطالب وما يبقى للمسؤول</h3>
          <p>ملخص الملاحظات التشغيلية والفنية التي أزيلت من الواجهة العامة ونقلت إلى بوابة التحكم، حتى تظل تجربة الطالب تعليمية وواضحة.</p>
        </div>
        <span class="admin-public-audit-badge">آخر مراجعة: 2 أغسطس 2026</span>
      </div>
      <div class="admin-public-audit-list">
        ${auditItems.map(item => `
          <article class="admin-public-audit-item">
            <header><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.status)}</span></header>
            <p>${escapeHtml(item.detail)}</p>
          </article>
        `).join('')}
      </div>
      <div class="admin-public-audit-policy"><strong>السياسة المعتمدة:</strong> تعرض واجهة الطالب المحتوى التعليمي، التقدم، التنبيهات القابلة للتنفيذ، ورسائل خطأ مبسطة فقط. أما أسماء الخدمات، مسارات الملفات، سجل التعديلات، نتائج الفحص، المصادر الداخلية، وأعمال الصيانة فتبقى داخل بوابة المسؤول.</div>
    `;

    const slot = document.getElementById('adminContentAuditSlot');
    if (slot) slot.insertAdjacentElement('afterend', panel);
    else reportsSection.insertAdjacentElement('afterbegin', panel);
    return true;
  }

  function start() {
    modernizeAdminCopy();
    if (createAuditPanel()) return;

    const observer = new MutationObserver(() => {
      modernizeAdminCopy();
      if (createAuditPanel()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
