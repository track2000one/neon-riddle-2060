(() => {
  'use strict';

  if (window.__NEON_PUBLIC_INTERFACE_AUDIT__) return;
  window.__NEON_PUBLIC_INTERFACE_AUDIT__ = true;

  const PUBLIC_APP_URL = 'https://neon-academy-frontend-preview-production.up.railway.app/';
  const PUBLIC_BRANCH = 'performance-vite';
  const PUBLIC_COMMITS_URL = `https://api.github.com/repos/track2000one/neon-riddle-2060/commits?sha=${PUBLIC_BRANCH}&per_page=6`;

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

    const loginBrand = document.querySelector('.login-showcase h1 span');
    if (loginBrand) loginBrand.textContent = 'NEON ACADEMY';

    const backLink = document.querySelector('.back-link');
    if (backLink) {
      backLink.textContent = 'العودة إلى المنصة';
      backLink.href = PUBLIC_APP_URL;
    }

    const publicLink = document.querySelector('.sidebar-footer .secondary-link');
    if (publicLink) {
      publicLink.textContent = 'فتح المنصة العامة';
      publicLink.href = PUBLIC_APP_URL;
      publicLink.target = '_blank';
      publicLink.rel = 'noopener';
    }

    const overviewParagraph = document.querySelector('#overviewSection .hero-panel p');
    if (overviewParagraph) {
      overviewParagraph.textContent = 'لوحة المسؤول تعمل عبر GitHub Pages، وواجهة الطالب تعمل عبر Railway، وتستخدم خدمات الإدارة مصادقة آمنة وتقارير تشغيلية خاصة بالمسؤول.';
    }

    document.querySelectorAll('.quick-links a').forEach(link => {
      const strong = link.querySelector('strong');
      const small = link.querySelector('small');
      if (['الموقع العام', 'المنصة العامة'].includes(strong?.textContent?.trim())) {
        strong.textContent = 'المنصة العامة';
        if (small) small.textContent = 'فتح النسخة التشغيلية للطلاب';
        link.href = PUBLIC_APP_URL;
        link.target = '_blank';
        link.rel = 'noopener';
      }
    });

    const frontendStatusText = document.getElementById('adminFrontendStatusText');
    if (frontendStatusText) {
      frontendStatusText.textContent = 'لوحة المسؤول منشورة عبر GitHub Pages، وواجهة الطالب التشغيلية منشورة بصورة مستقلة عبر Railway.';
    }

    document.querySelectorAll('.admin-architecture-list div').forEach(row => {
      const term = row.querySelector('dt');
      const description = row.querySelector('dd');
      if (term?.textContent?.trim() === 'استضافة الواجهة') {
        term.textContent = 'استضافة لوحة المسؤول';
        if (description) description.textContent = 'GitHub Pages — بوابة الإدارة والملفات الثابتة الخاصة بها.';
      }
    });

    const architecture = document.querySelector('.admin-architecture-list');
    if (architecture && !architecture.querySelector('[data-public-app-row]')) {
      const row = document.createElement('div');
      row.dataset.publicAppRow = 'true';
      row.innerHTML = `<dt>واجهة الطالب التشغيلية</dt><dd><a href="${PUBLIC_APP_URL}" target="_blank" rel="noopener">Railway — ${PUBLIC_APP_URL}</a></dd>`;
      const backendRow = [...architecture.children].find(item => item.querySelector('dt')?.textContent?.trim() === 'الخدمات الخلفية');
      architecture.insertBefore(row, backendRow || architecture.children[2] || null);
    }
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
      .admin-public-audit-badges{display:flex;gap:8px;flex-wrap:wrap}
      .admin-public-audit-badge{padding:8px 11px;border:1px solid rgba(99,242,169,.25);border-radius:999px;background:rgba(99,242,169,.07);color:#a8e9ca;font-size:11px;font-weight:900}
      .admin-public-audit-badge.branch{border-color:rgba(99,235,255,.22);background:rgba(99,235,255,.06);color:#8eeeff}
      .admin-public-audit-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      .admin-public-audit-item{padding:14px;border:1px solid rgba(255,255,255,.075);border-radius:15px;background:rgba(255,255,255,.025)}
      .admin-public-audit-item header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
      .admin-public-audit-item strong{color:#f7f9ff}
      .admin-public-audit-item span{color:#78e8b2;font-size:10px;font-weight:900}
      .admin-public-audit-item p{margin:0;color:#98a5ca;line-height:1.75;font-size:12px}
      .admin-public-branch-updates{margin-top:15px;padding-top:15px;border-top:1px solid rgba(255,255,255,.08)}
      .admin-public-branch-updates h4{margin:0 0 10px}
      .admin-public-commit-list{display:grid;gap:8px}
      .admin-public-commit{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border:1px solid rgba(255,255,255,.065);border-radius:12px;background:rgba(255,255,255,.02)}
      .admin-public-commit code{color:#8eeeff;font-size:11px}
      .admin-public-commit strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#eef3ff;font-size:12px}
      .admin-public-commit small{color:#8f9cc0;font-size:10px}
      .admin-public-audit-policy{margin-top:14px;padding:13px 15px;border:1px solid rgba(255,212,109,.17);border-radius:14px;background:rgba(255,212,109,.055);color:#e8d69e;line-height:1.8}
      .admin-architecture-list a{color:#8eeeff;overflow-wrap:anywhere}
      @media(max-width:850px){.admin-public-audit-list{grid-template-columns:1fr}.admin-public-commit{grid-template-columns:auto minmax(0,1fr)}.admin-public-commit small{display:none}}
    `;
    document.head.appendChild(style);
  }

  async function refreshPublicBranchUpdates() {
    const container = document.getElementById('adminPublicBranchUpdates');
    const badge = document.getElementById('adminPublicBranchBadge');
    if (!container) return;

    try {
      const response = await fetch(PUBLIC_COMMITS_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const commits = await response.json();
      if (!Array.isArray(commits) || !commits.length) throw new Error('EMPTY_COMMITS');

      const latestSha = String(commits[0].sha || '').slice(0, 7);
      if (badge) badge.textContent = `${PUBLIC_BRANCH} • ${latestSha}`;
      container.innerHTML = `<div class="admin-public-commit-list">${commits.map(item => {
        const message = String(item.commit?.message || 'تحديث واجهة الطالب').split('\n')[0];
        const date = item.commit?.committer?.date ? new Date(item.commit.committer.date).toLocaleString('ar-SA') : 'وقت غير محدد';
        const sha = String(item.sha || '').slice(0, 7);
        return `<a class="admin-public-commit" href="${escapeHtml(item.html_url || '#')}" target="_blank" rel="noopener"><code>${escapeHtml(sha)}</code><strong>${escapeHtml(message)}</strong><small>${escapeHtml(date)}</small></a>`;
      }).join('')}</div>`;
    } catch (error) {
      console.warn('Public branch updates unavailable:', error);
      if (badge) badge.textContent = PUBLIC_BRANCH;
      container.textContent = 'تعذر تحميل سجل فرع واجهة الطالب حاليًا. يمكن مراجعته مباشرة من GitHub.';
    }
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
        <div class="admin-public-audit-badges">
          <span class="admin-public-audit-badge">آخر مراجعة: 2 أغسطس 2026</span>
          <span class="admin-public-audit-badge branch" id="adminPublicBranchBadge">${PUBLIC_BRANCH}</span>
        </div>
      </div>
      <div class="admin-public-audit-list">
        ${auditItems.map(item => `
          <article class="admin-public-audit-item">
            <header><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.status)}</span></header>
            <p>${escapeHtml(item.detail)}</p>
          </article>
        `).join('')}
      </div>
      <div class="admin-public-branch-updates">
        <h4>آخر تحديثات واجهة الطالب</h4>
        <div id="adminPublicBranchUpdates">جارٍ تحميل سجل فرع ${PUBLIC_BRANCH}...</div>
      </div>
      <div class="admin-public-audit-policy"><strong>السياسة المعتمدة:</strong> تعرض واجهة الطالب المحتوى التعليمي، التقدم، التنبيهات القابلة للتنفيذ، ورسائل خطأ مبسطة فقط. أما أسماء الخدمات، مسارات الملفات، سجل التعديلات، نتائج الفحص، المصادر الداخلية، وأعمال الصيانة فتبقى داخل بوابة المسؤول.</div>
    `;

    const slot = document.getElementById('adminContentAuditSlot');
    if (slot) slot.insertAdjacentElement('afterend', panel);
    else reportsSection.insertAdjacentElement('afterbegin', panel);
    refreshPublicBranchUpdates();
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
