(() => {
  'use strict';

  if (window.__NEON_ADMIN_REPORTS__) return;
  window.__NEON_ADMIN_REPORTS__ = true;

  const REPOSITORY = 'track2000one/neon-riddle-2060';
  const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;
  const COMMITS_API_URL = `https://api.github.com/repos/${REPOSITORY}/commits?sha=main&per_page=12`;
  const RAILWAY_HEALTH_URL = 'https://neon-riddle-2060-backend-production.up.railway.app/api/health';
  const REQUEST_TIMEOUT_MS = 12_000;
  const dateTimeFormat = new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  let reportsButton = null;
  let reportsSection = null;
  let refreshInProgress = false;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]);
  }

  function injectStyles() {
    if (document.getElementById('adminReportsStyles')) return;

    const style = document.createElement('style');
    style.id = 'adminReportsStyles';
    style.textContent = `
      .admin-reports-hero{position:relative;overflow:hidden;margin-bottom:20px;padding:26px;border:1px solid rgba(99,235,255,.18);border-radius:24px;background:radial-gradient(circle at 12% 18%,rgba(99,235,255,.13),transparent 29%),radial-gradient(circle at 88% 20%,rgba(164,110,255,.16),transparent 32%),rgba(10,15,36,.82)}
      .admin-reports-hero:after{content:"";position:absolute;inset:auto -70px -110px auto;width:270px;height:270px;border:1px solid rgba(255,255,255,.08);border-radius:50%;box-shadow:0 0 0 38px rgba(255,255,255,.018),0 0 0 76px rgba(255,255,255,.012)}
      .admin-reports-hero>*{position:relative;z-index:1}
      .admin-reports-hero h2{margin:5px 0 8px;font-size:clamp(23px,3vw,38px)}
      .admin-reports-hero p{max-width:860px;margin:0;color:#aeb9da;line-height:1.9}
      .admin-report-policy{display:flex;gap:9px;flex-wrap:wrap;margin-top:17px}
      .admin-report-policy span{padding:8px 11px;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(255,255,255,.045);color:#c8d1ec;font-size:12px}
      .admin-report-status-grid{display:grid;grid-template-columns:repeat(4,minmax(190px,1fr));gap:14px;margin-bottom:20px}
      .admin-report-status-card{min-height:158px;padding:19px;border:1px solid rgba(255,255,255,.085);border-radius:19px;background:rgba(10,15,35,.72);display:flex;flex-direction:column;gap:9px}
      .admin-report-status-card header{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .admin-report-status-card h3{margin:0;font-size:16px}
      .admin-report-status-card p{margin:0;color:#98a5ca;line-height:1.65;font-size:13px}
      .admin-report-status-card strong{font-size:19px;color:#fff;overflow-wrap:anywhere}
      .admin-service-dot{width:10px;height:10px;border-radius:50%;background:#8290b2;box-shadow:0 0 0 5px rgba(130,144,178,.1)}
      .admin-report-status-card.is-ok .admin-service-dot{background:#63f2a9;box-shadow:0 0 0 5px rgba(99,242,169,.1),0 0 18px rgba(99,242,169,.3)}
      .admin-report-status-card.is-warning .admin-service-dot{background:#ffd46d;box-shadow:0 0 0 5px rgba(255,212,109,.1)}
      .admin-report-status-card.is-error .admin-service-dot{background:#ff718d;box-shadow:0 0 0 5px rgba(255,113,141,.1)}
      .admin-reports-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.55fr);gap:18px;margin-bottom:20px}
      .admin-reports-panel{padding:21px}
      .admin-reports-panel-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;flex-wrap:wrap;margin-bottom:17px}
      .admin-reports-panel-heading h3{margin:4px 0 0}
      .admin-reports-actions{display:flex;gap:9px;flex-wrap:wrap}
      .admin-reports-actions a{text-decoration:none}
      .admin-updates-list{display:grid;gap:10px}
      .admin-update-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:13px;align-items:center;padding:13px 14px;border:1px solid rgba(255,255,255,.075);border-radius:15px;background:rgba(255,255,255,.025)}
      .admin-update-badge{min-width:56px;padding:6px 8px;border-radius:10px;background:rgba(99,235,255,.09);color:#8eeeff;text-align:center;font-size:11px;font-weight:800}
      .admin-update-main{min-width:0}
      .admin-update-main strong{display:block;color:#f7f9ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .admin-update-main small{display:block;margin-top:5px;color:#8f9cc0;line-height:1.5}
      .admin-update-link{color:#88eaff;text-decoration:none;font-size:20px}
      .admin-report-loading,.admin-report-empty{padding:22px;border:1px dashed rgba(255,255,255,.12);border-radius:15px;color:#98a5ca;text-align:center;line-height:1.8}
      .admin-architecture-list{display:grid;gap:11px;margin:0}
      .admin-architecture-list div{padding:13px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025)}
      .admin-architecture-list dt{color:#8f9cc0;font-size:12px}
      .admin-architecture-list dd{margin:5px 0 0;color:#f7f9ff;line-height:1.7;overflow-wrap:anywhere}
      .admin-report-private-note{margin-top:14px;padding:13px 15px;border:1px solid rgba(99,242,169,.18);border-radius:14px;background:rgba(99,242,169,.065);color:#a8e9ca;line-height:1.8}
      #adminContentAuditSlot>.content-audit-panel{margin-top:0}
      @media(max-width:1220px){.admin-report-status-grid{grid-template-columns:repeat(2,minmax(180px,1fr))}.admin-reports-grid{grid-template-columns:1fr}}
      @media(max-width:680px){.admin-report-status-grid{grid-template-columns:1fr}.admin-update-item{grid-template-columns:auto minmax(0,1fr)}.admin-update-link{display:none}.admin-reports-actions{width:100%}.admin-reports-actions>*{flex:1;text-align:center}.admin-reports-hero{padding:21px}}
    `;
    document.head.appendChild(style);
  }

  function createNavigationButton() {
    const navigation = document.querySelector('.side-nav');
    if (!navigation) return null;

    const existing = navigation.querySelector('[data-section="reports"]');
    if (existing) return existing;

    const button = document.createElement('button');
    button.className = 'nav-item';
    button.dataset.section = 'reports';
    button.innerHTML = '<span>▤</span>التقارير والمستجدات';

    const analyticsButton = navigation.querySelector('[data-section="analytics"]');
    navigation.insertBefore(button, analyticsButton || null);
    return button;
  }

  function createReportsSection() {
    const adminMain = document.querySelector('.admin-main');
    if (!adminMain) return null;

    const existing = document.getElementById('reportsSection');
    if (existing) return existing;

    const section = document.createElement('section');
    section.id = 'reportsSection';
    section.className = 'admin-section';
    section.innerHTML = `
      <div class="admin-reports-hero">
        <div class="eyebrow">INTERNAL OPERATIONS & RELEASE INTELLIGENCE</div>
        <h2>مركز التقارير والمستجدات</h2>
        <p>المكان الإداري الموحد لمتابعة حالة GitHub Pages وخادم Railway، والاطلاع على آخر تعديلات المشروع وتقارير جودة المحتوى. لا تُعرض هذه التفاصيل داخل واجهة الطالب.</p>
        <div class="admin-report-policy">
          <span>الواجهة: GitHub Pages</span>
          <span>الخدمات الخلفية: Railway</span>
          <span>المصادقة: Firebase</span>
          <span>التقارير الفنية: للمسؤول فقط</span>
        </div>
      </div>

      <div class="admin-report-status-grid">
        <article id="adminFrontendStatus" class="admin-report-status-card is-ok">
          <header><h3>واجهة التحكم</h3><span class="admin-service-dot"></span></header>
          <strong>GitHub Pages</strong>
          <p id="adminFrontendStatusText">الواجهة الإدارية تعمل من المسار الحالي دون نقلها إلى Railway.</p>
        </article>
        <article id="adminBackendStatus" class="admin-report-status-card">
          <header><h3>خادم Railway</h3><span class="admin-service-dot"></span></header>
          <strong id="adminBackendStatusValue">جارٍ الفحص...</strong>
          <p id="adminBackendStatusText">يتم التحقق من واجهة API المحمية.</p>
        </article>
        <article id="adminRepositoryStatus" class="admin-report-status-card">
          <header><h3>آخر تحديث GitHub</h3><span class="admin-service-dot"></span></header>
          <strong id="adminRepositoryStatusValue">جارٍ التحميل...</strong>
          <p id="adminRepositoryStatusText">يتم جلب آخر التزام من الفرع الرئيسي.</p>
        </article>
        <article id="adminAuthStatus" class="admin-report-status-card is-ok">
          <header><h3>حماية المسؤول</h3><span class="admin-service-dot"></span></header>
          <strong>Firebase + UID</strong>
          <p>تظهر اللوحة بعد المصادقة، وتتحقق Railway من رمز الدخول والصلاحية في العمليات الحساسة.</p>
        </article>
      </div>

      <div id="adminContentAuditSlot"></div>

      <div class="admin-reports-grid">
        <article class="panel admin-reports-panel">
          <div class="admin-reports-panel-heading">
            <div><span class="eyebrow">PROJECT CHANGELOG</span><h3>آخر تعديلات ومستجدات المشروع</h3></div>
            <div class="admin-reports-actions">
              <button id="adminReportsRefresh" class="outline-button compact" type="button">تحديث التقارير</button>
              <a class="outline-button compact" href="${REPOSITORY_URL}/commits/main" target="_blank" rel="noopener">جميع الالتزامات</a>
            </div>
          </div>
          <div id="adminUpdatesList" class="admin-updates-list"><div class="admin-report-loading">جارٍ تحميل سجل التعديلات من GitHub...</div></div>
        </article>

        <article class="panel admin-reports-panel">
          <div class="admin-reports-panel-heading"><div><span class="eyebrow">DEPLOYMENT ARCHITECTURE</span><h3>معمارية التشغيل المعتمدة</h3></div></div>
          <dl class="admin-architecture-list">
            <div><dt>رابط لوحة المسؤول</dt><dd id="adminConsoleUrl">—</dd></div>
            <div><dt>استضافة الواجهة</dt><dd>GitHub Pages — ملفات HTML وCSS وJavaScript فقط.</dd></div>
            <div><dt>الخدمات الخلفية</dt><dd>Railway — إدارة مستخدمي Firebase والعمليات التي تتطلب خادمًا آمنًا.</dd></div>
            <div><dt>مصدر التحديثات</dt><dd>الفرع <b>main</b> في مستودع GitHub.</dd></div>
            <div><dt>آخر تحديث للتقرير</dt><dd id="adminReportsUpdatedAt">—</dd></div>
          </dl>
          <div class="admin-report-private-note">🔒 تبقى رسائل الصيانة، نتائج الفحص، وسجل التطوير داخل هذه البوابة. واجهة الطالب تعرض المحتوى التعليمي فقط.</div>
        </article>
      </div>
    `;

    const analyticsSection = document.getElementById('analyticsSection');
    adminMain.insertBefore(section, analyticsSection || null);
    return section;
  }

  function setCardState(cardId, state) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.remove('is-ok', 'is-warning', 'is-error');
    if (state) card.classList.add(`is-${state}`);
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'وقت غير محدد' : dateTimeFormat.format(date);
  }

  function classifyCommit(message) {
    const value = String(message || '').toLowerCase();
    if (/fix|prevent|repair|resolve|correct/.test(value)) return 'إصلاح';
    if (/add|create|introduce|implement/.test(value)) return 'إضافة';
    if (/enhance|improve|optimi[sz]e|update|upgrade/.test(value)) return 'تحسين';
    if (/remove|delete|drop/.test(value)) return 'تنظيف';
    return 'تحديث';
  }

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort('admin-report-timeout'), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        ...options,
        signal: controller.signal
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function refreshRailwayHealth() {
    setCardState('adminBackendStatus', 'warning');
    const value = document.getElementById('adminBackendStatusValue');
    const text = document.getElementById('adminBackendStatusText');
    if (value) value.textContent = 'جارٍ الفحص...';
    if (text) text.textContent = 'يتم الاتصال بخدمة Railway والتحقق من نقطة الصحة.';

    try {
      const result = await fetchJson(RAILWAY_HEALTH_URL, {
        headers: { Accept: 'application/json' }
      });

      const healthy = result?.ok === true;
      setCardState('adminBackendStatus', healthy ? 'ok' : 'warning');
      if (value) value.textContent = healthy ? 'الخدمة تعمل' : 'استجابة غير مكتملة';
      if (text) {
        const service = result?.service || 'NEON Admin API';
        const timestamp = result?.timestamp ? ` • ${formatDate(result.timestamp)}` : '';
        text.textContent = `${service}${timestamp}`;
      }
    } catch (error) {
      console.error('Railway health report error:', error);
      setCardState('adminBackendStatus', 'error');
      if (value) value.textContent = 'تعذر الاتصال';
      if (text) {
        text.textContent = error?.code === 'RAILWAY_TIMEOUT' || error?.name === 'AbortError'
          ? 'انتهت مهلة الفحص. قد تكون الخدمة في مرحلة الاستيقاظ؛ أعد المحاولة بعد لحظات.'
          : 'لم تصل استجابة من خادم Railway. لا يؤثر ذلك على عرض واجهة التحكم.';
      }
    }
  }

  function renderCommits(commits) {
    const list = document.getElementById('adminUpdatesList');
    if (!list) return;

    if (!Array.isArray(commits) || !commits.length) {
      list.innerHTML = '<div class="admin-report-empty">لم يتم العثور على مستجدات في الوقت الحالي.</div>';
      return;
    }

    list.innerHTML = commits.map(item => {
      const message = String(item?.commit?.message || 'تحديث للمشروع').split('\n')[0];
      const sha = String(item?.sha || '').slice(0, 7);
      const date = item?.commit?.committer?.date || item?.commit?.author?.date;
      const author = item?.author?.login || item?.commit?.author?.name || 'GitHub';
      const url = item?.html_url || `${REPOSITORY_URL}/commits/main`;

      return `
        <div class="admin-update-item">
          <span class="admin-update-badge">${classifyCommit(message)}</span>
          <div class="admin-update-main">
            <strong title="${escapeHtml(message)}">${escapeHtml(message)}</strong>
            <small>${escapeHtml(sha)} • ${escapeHtml(author)} • ${escapeHtml(formatDate(date))}</small>
          </div>
          <a class="admin-update-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="فتح الالتزام">↗</a>
        </div>
      `;
    }).join('');
  }

  async function refreshGitHubUpdates() {
    setCardState('adminRepositoryStatus', 'warning');
    const value = document.getElementById('adminRepositoryStatusValue');
    const text = document.getElementById('adminRepositoryStatusText');
    const list = document.getElementById('adminUpdatesList');
    if (value) value.textContent = 'جارٍ التحميل...';
    if (text) text.textContent = 'يتم جلب آخر التزام من الفرع الرئيسي.';
    if (list) list.innerHTML = '<div class="admin-report-loading">جارٍ تحميل سجل التعديلات من GitHub...</div>';

    try {
      const commits = await fetchJson(COMMITS_API_URL, {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      renderCommits(commits);
      const latest = Array.isArray(commits) ? commits[0] : null;
      const message = String(latest?.commit?.message || 'تم الاتصال بالمستودع').split('\n')[0];
      const sha = String(latest?.sha || '').slice(0, 7);
      const date = latest?.commit?.committer?.date || latest?.commit?.author?.date;

      setCardState('adminRepositoryStatus', 'ok');
      if (value) value.textContent = sha || 'متصل';
      if (text) text.textContent = `${message}${date ? ` • ${formatDate(date)}` : ''}`;
    } catch (error) {
      console.error('GitHub updates report error:', error);
      setCardState('adminRepositoryStatus', 'error');
      if (value) value.textContent = 'تعذر التحديث';
      if (text) text.textContent = error?.status === 403
        ? 'تم بلوغ حد GitHub API المؤقت. افتح سجل الالتزامات من الرابط المباشر.'
        : 'تعذر جلب سجل الالتزامات الآن. لا يؤثر ذلك على عمل المنصة.';
      if (list) {
        list.innerHTML = `<div class="admin-report-empty">تعذر تحميل التحديثات تلقائيًا. <a href="${REPOSITORY_URL}/commits/main" target="_blank" rel="noopener">فتح سجل GitHub</a></div>`;
      }
    }
  }

  function moveContentAuditPanel() {
    const slot = document.getElementById('adminContentAuditSlot');
    const panel = document.getElementById('contentAuditPanel');
    if (slot && panel && panel.parentElement !== slot) slot.appendChild(panel);
  }

  async function refreshReports() {
    if (refreshInProgress) return;
    refreshInProgress = true;

    const refreshButton = document.getElementById('adminReportsRefresh');
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = 'جارٍ التحديث...';
    }

    try {
      await Promise.allSettled([refreshRailwayHealth(), refreshGitHubUpdates()]);
      const updatedAt = document.getElementById('adminReportsUpdatedAt');
      if (updatedAt) updatedAt.textContent = dateTimeFormat.format(new Date());
      window.NEON_REFRESH_CONTENT_AUDIT?.();
      moveContentAuditPanel();
    } finally {
      refreshInProgress = false;
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = 'تحديث التقارير';
      }
    }
  }

  function activateReports() {
    if (!reportsSection || !reportsButton) return;

    document.querySelectorAll('.nav-item').forEach(button => {
      button.classList.toggle('active', button === reportsButton);
    });
    document.querySelectorAll('.admin-section').forEach(section => {
      section.classList.toggle('active-section', section === reportsSection);
    });

    const title = document.getElementById('sectionTitle');
    if (title) title.textContent = 'التقارير والمستجدات';
    history.replaceState(null, '', '#reports');
    window.gtag?.('event', 'admin_reports_viewed', { app_name: 'neon_riddle_2060_admin' });
    refreshReports();
  }

  function initialize() {
    injectStyles();
    reportsButton = createNavigationButton();
    reportsSection = createReportsSection();
    if (!reportsButton || !reportsSection) return;

    const consoleUrl = document.getElementById('adminConsoleUrl');
    if (consoleUrl) consoleUrl.textContent = `${location.origin}${location.pathname}#reports`;

    reportsButton.addEventListener('click', event => {
      event.preventDefault();
      activateReports();
    });
    document.getElementById('adminReportsRefresh')?.addEventListener('click', refreshReports);

    moveContentAuditPanel();
    window.setTimeout(moveContentAuditPanel, 100);
    window.setTimeout(moveContentAuditPanel, 600);

    if (location.hash === '#reports') activateReports();
    else refreshReports();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  window.addEventListener('hashchange', () => {
    if (location.hash === '#reports') activateReports();
  });
  window.NEON_REFRESH_ADMIN_REPORTS = refreshReports;
})();
