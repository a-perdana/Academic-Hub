// Minimal standalone header for dashboard pages (2026-05-22).
//
// Dashboard pages are read-only network panels surfaced from CH/AH/TH navbars
// (cross-hub link to academichub.eduversal.org/<slug>). When a CH/TH user
// arrives, they should NOT see the full AH navbar — they don't have AH
// sub-roles and the dropdowns are not relevant to their task. This script
// replaces the AH navbar partial with a minimal logo + Sign-out bar.
//
// Auth-guard still runs unchanged (login + role check + Firestore reads).
// This script just paints a header into #navbarMount on authReady.
//
// Usage in dashboard HTML (replaces partials/navbar-loader.js):
//   <script src="dashboards/dashboard-header.js"></script>
//   ...
//   <div id="navbarMount"></div>
//
// authReady listener wiring is handled inside this script — pages should
// drop their own `window.__loadAcademicNavbar(...)` call.

(function () {
  function paintHeader() {
    const mount = document.getElementById('navbarMount');
    if (!mount) return;
    mount.innerHTML = [
      '<header class="dashboard-min-header" role="banner">',
      '  <a href="/" class="dmh-brand" aria-label="Eduversal home">',
      '    <img src="/images/eduversal-logo-white.png" alt="Eduversal" class="dmh-logo">',
      '    <span class="dmh-brand-divider" aria-hidden="true"></span>',
      '    <span class="dmh-brand-text">Dashboards</span>',
      '  </a>',
      '  <div class="dmh-actions">',
      '    <button type="button" class="dmh-signout" id="dmhSignout">',
      '      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
      '      Sign out',
      '    </button>',
      '  </div>',
      '</header>'
    ].join('');

    const btn = document.getElementById('dmhSignout');
    if (btn) {
      btn.addEventListener('click', function () {
        if (window.auth && typeof window.auth.signOut === 'function') {
          window.auth.signOut().finally(function () {
            window.location.href = '/login';
          });
        } else {
          window.location.href = '/login';
        }
      });
    }
  }

  // Inject CSS once (idempotent — dashboards may carry their own brand styles).
  function injectCss() {
    if (document.getElementById('dmh-style')) return;
    const css = [
      '.dashboard-min-header{',
      '  position:sticky;top:0;z-index:100;display:flex;align-items:center;',
      '  justify-content:space-between;padding:10px 28px;',
      '  background:rgba(10,10,26,0.92);backdrop-filter:blur(12px);',
      '  -webkit-backdrop-filter:blur(12px);',
      '  border-bottom:1px solid rgba(255,255,255,0.08);',
      '  box-shadow:0 1px 20px rgba(0,0,0,0.3);',
      '  font-family:"DM Sans",system-ui,sans-serif;',
      '}',
      '.dmh-brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:#fff;}',
      '.dmh-logo{height:24px;width:auto;display:block;',
      '  filter:drop-shadow(0 2px 10px rgba(109,40,217,0.45));}',
      '.dmh-brand-divider{width:1px;height:18px;background:rgba(255,255,255,0.18);}',
      '.dmh-brand-text{font-size:13px;font-weight:600;color:rgba(255,255,255,0.92);letter-spacing:-0.01em;}',
      '.dmh-actions{display:flex;align-items:center;gap:8px;}',
      '.dmh-signout{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;',
      '  border:1px solid rgba(255,255,255,0.18);border-radius:7px;background:transparent;',
      '  color:rgba(255,255,255,0.78);font:500 12.5px "DM Sans",system-ui,sans-serif;',
      '  cursor:pointer;transition:background .15s,border-color .15s,color .15s;}',
      '.dmh-signout:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.32);color:#fff;}',
      '.dmh-signout svg{flex-shrink:0;}',
      '@media print{.dashboard-min-header{display:none;}}'
    ].join('');
    const style = document.createElement('style');
    style.id = 'dmh-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Paint as soon as #navbarMount exists. Some dashboards listen on authReady
  // before the body is parsed (script in <head>); some are body-late. Cover
  // both: try on DOMContentLoaded AND on authReady. paintHeader is idempotent
  // because it innerHTMLs an already-painted div with the same markup.
  injectCss();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paintHeader, { once: true });
  } else {
    paintHeader();
  }
  // Also paint on authReady so window.auth (set just before dispatch) is
  // wired into the Sign-out button.
  document.addEventListener('authReady', paintHeader);

  // Defensive stub — old dashboard pages may still call this. Treat as no-op
  // so a stray invocation doesn't throw and break the page.
  window.__loadAcademicNavbar = function () {};
})();
