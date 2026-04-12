// Sub-role definitions for Academic Hub
const AH_SUB_ROLES = [
  { key: 'foundation_representative', label: 'Foundation Representative' },
  { key: 'school_principal',          label: 'School Principal' },
  { key: 'academic_coordinator',      label: 'Academic Coordinator' },
  { key: 'cambridge_coordinator',     label: 'Cambridge Coordinator' },
];

function _ahSubRoleLabel(key) {
  return AH_SUB_ROLES.find(r => r.key === key)?.label || key;
}

function ensureNavbarSharedStyles() {
  if (document.getElementById('navbar-shared-styles')) return;
  const style = document.createElement('style');
  style.id = 'navbar-shared-styles';
  style.textContent = `
    #topNav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      padding: 0 24px;
      height: 62px;
      background: rgba(5, 5, 16, 0.92);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      gap: 12px;
      overflow: visible;
      transition: background 0.3s ease;
    }
    #topNav.scrolled {
      background: rgba(5, 5, 16, 0.98);
    }
    #topNav .nav-brand {
      display: flex; align-items: center; gap: 11px;
      text-decoration: none; flex-shrink: 0;
    }
    #topNav .nav-brand-icon {
      width: 36px; height: 36px; flex-shrink: 0;
      background: linear-gradient(135deg, #5b21b6, #7c3aed);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 14px rgba(109, 40, 217, 0.55);
    }
    #topNav .nav-brand-icon svg { width: 22px; height: 22px; fill: none; }
    #topNav .nav-brand-name {
      font-family: "DM Sans", sans-serif;
      font-size: 15px; font-weight: 700;
      color: #fff; white-space: nowrap;
      letter-spacing: -0.01em;
    }
    #topNav .nav-brand-sub {
      font-family: "DM Sans", sans-serif;
      font-size: 10px; font-weight: 500;
      color: rgba(255,255,255,0.4);
      display: block; letter-spacing: 0.02em;
    }
    #topNav .nav-actions {
      display: flex; align-items: center; gap: 6px;
      flex: 1; min-width: 0; justify-content: flex-end;
    }
    #topNav .nav-btn {
      display: flex; align-items: center; gap: 7px;
      padding: 9px 18px; border-radius: 10px;
      background: linear-gradient(135deg, rgba(108,92,231,0.20), rgba(0,217,255,0.10));
      border: 1px solid rgba(108,92,231,0.45);
      color: rgba(255,255,255,0.85);
      font-family: "DM Sans", sans-serif;
      font-size: 13px; font-weight: 500;
      cursor: pointer; text-decoration: none;
      transition: all 0.22s ease;
      position: relative; white-space: nowrap;
      overflow: visible;
    }
    #topNav .nav-btn svg { width: 15px; height: 15px; flex-shrink: 0; }
    #topNav .nav-btn:hover {
      background: linear-gradient(135deg, rgba(108,92,231,0.45), rgba(0,217,255,0.25));
      border-color: rgba(108,92,231,0.7); color: #fff;
      box-shadow: 0 0 16px rgba(108,92,231,0.40);
      transform: translateY(-1px);
    }
    #topNav .nav-btn.active {
      background: linear-gradient(135deg, rgba(108,92,231,0.50), rgba(0,217,255,0.30));
      border-color: rgba(108,92,231,0.80); color: #fff;
      box-shadow: 0 0 16px rgba(108,92,231,0.35);
    }
    #topNav .profile-wrap { position: relative; }
    #topNav .profile-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 12px 6px 6px; border-radius: 100px;
      background: linear-gradient(135deg, rgba(108,92,231,0.20), rgba(0,217,255,0.10));
      border: 1px solid rgba(108,92,231,0.45);
      color: rgba(255,255,255,0.85); font-family: "DM Sans", sans-serif;
      font-size: 13px; font-weight: 500; cursor: pointer;
      transition: all 0.22s ease; max-width: 170px;
    }
    #topNav .profile-btn:hover {
      background: linear-gradient(135deg, rgba(108,92,231,0.45), rgba(0,217,255,0.25));
      border-color: rgba(108,92,231,0.7); color: #fff;
      box-shadow: 0 0 16px rgba(108,92,231,0.40);
    }
    #topNav .profile-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #fff;
      flex-shrink: 0; overflow: hidden;
      font-family: "DM Sans", sans-serif;
    }
    #topNav .profile-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    #topNav .profile-first-name {
      max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    #topNav .profile-chevron { width: 14px; height: 14px; flex-shrink: 0; transition: transform 0.25s ease; }
    #topNav .profile-wrap.open .profile-chevron { transform: rotate(180deg); }
    #topNav .profile-dropdown {
      position: absolute; top: calc(100% + 10px); right: 0;
      width: 290px; background: rgba(10, 10, 26, 0.97);
      border: 1px solid rgba(108,92,231,0.3); border-radius: 18px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      overflow: hidden; display: none; transform-origin: top right;
      animation: navDdOpen 0.22s cubic-bezier(0.34,1.2,0.64,1) both;
    }
    #topNav .profile-wrap.open .profile-dropdown { display: block; }
    @keyframes navDdOpen {
      from { opacity: 0; transform: translateY(-10px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    #topNav .dd-header {
      padding: 20px; display: flex; align-items: center; gap: 14px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    #topNav .dd-avatar {
      width: 46px; height: 46px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden;
    }
    #topNav .dd-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    #topNav .dd-name { font-size: 14px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #topNav .dd-email { font-size: 11.5px; color: rgba(255,255,255,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    #topNav .dd-signout-btn {
      display: flex; align-items: center; gap: 9px;
      width: 100%; padding: 9px 14px; border-radius: 9px; border: none;
      background: rgba(231,76,60,0.10); color: rgba(231,76,60,0.9);
      font-size: 13px; font-weight: 500; font-family: "DM Sans", sans-serif;
      cursor: pointer; transition: all 0.18s; margin: 8px 12px 12px;
      width: calc(100% - 24px);
    }
    #topNav .dd-signout-btn:hover { background: rgba(231,76,60,0.22); color: #e74c3c; }
    #topNav .dd-signout-btn svg { width: 15px; height: 15px; }
    #topNav .nav-badge {
      display: none;
      position: absolute;
      top: -8px;
      right: -8px;
      min-width: 21px;
      height: 21px;
      padding: 0 6px;
      border-radius: 999px;
      border: 2px solid rgba(10, 10, 26, 0.95);
      background: linear-gradient(135deg, #ff5f6d 0%, #ff3f56 100%);
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      line-height: 1;
      letter-spacing: 0.01em;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(255, 63, 86, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.16) inset;
      z-index: 5;
      pointer-events: none;
    }
    #topNav .nav-badge.visible {
      display: inline-flex !important;
    }
    #topNav .nav-badge.nav-badge--count {
      background: linear-gradient(135deg, #7a5cff 0%, #4f7dff 100%);
      box-shadow: 0 6px 16px rgba(92, 114, 255, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.16) inset;
    }

    /* Hamburger button — hidden by default, shown on mobile */
    #topNav .hamburger-btn {
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 5px;
      width: 38px;
      height: 38px;
      border-radius: 9px;
      border: 1px solid rgba(255,255,255,.15);
      background: rgba(255,255,255,.06);
      cursor: pointer;
      flex-shrink: 0;
      padding: 0;
      margin-left: auto;
      transition: background .2s, border-color .2s;
    }
    #topNav .hamburger-btn:hover {
      background: rgba(255,255,255,.12);
      border-color: rgba(255,255,255,.28);
    }
    #topNav .hamburger-btn span {
      display: block;
      width: 18px;
      height: 2px;
      background: rgba(255,255,255,.85);
      border-radius: 2px;
      transition: all .25s ease;
    }
    #topNav .hamburger-btn.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    #topNav .hamburger-btn.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
    #topNav .hamburger-btn.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

    /* Mobile dropdown menu */
    .ah-mobile-menu {
      position: fixed;
      top: 62px;
      left: 0;
      right: 0;
      background: rgba(5,5,16,.97);
      backdrop-filter: blur(20px) saturate(1.8);
      -webkit-backdrop-filter: blur(20px) saturate(1.8);
      border-bottom: 1px solid rgba(255,255,255,.10);
      display: flex;
      flex-direction: column;
      gap: 2px;
      z-index: 998;
      padding: 10px 14px 18px;
      transform: translateY(-110%);
      opacity: 0;
      transition: transform .28s cubic-bezier(.16,1,.3,1), opacity .2s ease;
      pointer-events: none;
    }
    .ah-mobile-menu.open {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
    .ah-mobile-menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      color: rgba(255,255,255,.75);
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      background: transparent;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: background .15s, color .15s;
      position: relative;
    }
    .ah-mobile-menu-item.active {
      background: rgba(108,92,231,.18);
      color: #fff;
    }
    .ah-mobile-menu-item:hover { background: rgba(255,255,255,.08); color: #fff; }
    .ah-mobile-menu-item svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: rgba(255,255,255,.45);
      transition: color .15s;
    }
    .ah-mobile-menu-item:hover svg,
    .ah-mobile-menu-item.active svg { color: rgba(255,255,255,.85); }
    .ah-mobile-divider {
      height: 1px;
      background: rgba(255,255,255,.07);
      margin: 4px 0;
    }
    .ah-mobile-badge {
      margin-left: auto;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      background: #e74c3c;
      color: white;
      font-size: 11px;
      font-weight: 700;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0 5px;
    }
    .ah-mobile-badge.visible { display: flex; }
    .ah-mobile-badge--count { background: #6c5ce7; }

    /* Stage 1 — 1100px: hide brand name */
    @media (max-width: 1100px) {
      #topNav { padding: 0 18px; }
      #topNav .nav-brand-name { display: none; }
    }

    /* Stage 2 — 900px: hide button labels, icon-only buttons */
    @media (max-width: 900px) {
      #topNav .nav-btn span:not(.nav-badge) { display: none; }
      #topNav .nav-btn { padding: 9px 10px; gap: 0; }
      #topNav .profile-first-name { display: none; }
      #topNav .profile-btn { padding: 5px 8px 5px 5px; }
    }

    /* Stage 3 — 640px: hamburger only, hide all nav-actions items */
    @media (max-width: 640px) {
      #topNav { padding: 0 14px; gap: 8px; }
      #topNav .hamburger-btn { display: flex; }
      #topNav .nav-actions .nav-btn,
      #topNav .nav-actions .profile-wrap { display: none !important; }
    }

    /* ── Profile dropdown extras ────────────────────────────────── */
    #topNav .profile-dropdown {
      width: 320px;
    }
    #topNav .dd-role-badge {
      display: inline-block;
      margin-top: 5px;
      padding: 2px 9px;
      border-radius: 20px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: rgba(108,92,231,0.25);
      border: 1px solid rgba(108,92,231,0.5);
      color: #a78bfa;
    }
    #topNav .dd-role-badge.admin {
      background: rgba(16,185,129,0.18);
      border-color: rgba(16,185,129,0.45);
      color: #34d399;
    }
    #topNav .dd-info-section {
      padding: 10px 16px 6px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    #topNav .dd-info-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #topNav .dd-subroles-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    #topNav .dd-info-icon {
      width: 13px;
      height: 13px;
      flex-shrink: 0;
      color: rgba(255,255,255,0.35);
      margin-top: 1px;
    }
    #topNav .dd-info-value {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      font-family: "DM Sans", sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #topNav .dd-subrole-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    #topNav .dd-subrole-chip {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10.5px;
      font-weight: 500;
      background: rgba(0,184,212,0.15);
      border: 1px solid rgba(0,184,212,0.3);
      color: rgba(0,212,255,0.85);
      font-family: "DM Sans", sans-serif;
    }
    #topNav .dd-edit-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      cursor: pointer;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.55);
      font-size: 12.5px;
      font-weight: 500;
      font-family: "DM Sans", sans-serif;
      transition: color 0.15s, background 0.15s;
      user-select: none;
    }
    #topNav .dd-edit-toggle:hover {
      color: rgba(255,255,255,0.85);
      background: rgba(255,255,255,0.04);
    }
    #topNav .dd-edit-toggle svg:first-child {
      width: 13px; height: 13px; flex-shrink: 0;
    }
    #topNav .dd-edit-toggle span {
      flex: 1;
    }
    #topNav .dd-edit-chevron {
      width: 13px; height: 13px; flex-shrink: 0;
      transition: transform 0.22s ease;
    }
    #topNav .dd-edit-chevron.open {
      transform: rotate(180deg);
    }
    #topNav .dd-edit-form {
      padding: 12px 16px 4px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    #topNav .dd-field-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    #topNav .dd-field-label {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.35);
      font-family: "DM Sans", sans-serif;
    }
    #topNav .dd-field-input {
      padding: 7px 11px;
      border-radius: 8px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: #fff;
      font-size: 12.5px;
      font-family: "DM Sans", sans-serif;
      outline: none;
      transition: border-color 0.15s, background 0.15s;
    }
    #topNav .dd-field-input:focus {
      border-color: #6c5ce7;
      background: rgba(108,92,231,0.08);
    }
    #topNav .dd-subrole-checkboxes {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #topNav .dd-subrole-checkbox-row {
      display: flex;
      align-items: center;
      gap: 9px;
      cursor: pointer;
      padding: 5px 8px;
      border-radius: 7px;
      transition: background 0.13s;
      font-size: 12px;
      font-family: "DM Sans", sans-serif;
      color: rgba(255,255,255,0.7);
      user-select: none;
    }
    #topNav .dd-subrole-checkbox-row:hover {
      background: rgba(255,255,255,0.05);
    }
    #topNav .dd-subrole-checkbox-row input[type="checkbox"] {
      width: 14px; height: 14px;
      accent-color: #6c5ce7;
      flex-shrink: 0;
      cursor: pointer;
    }
    #topNav .dd-save-btn {
      width: 100%;
      padding: 8px;
      border-radius: 8px;
      background: #6c5ce7;
      border: none;
      color: #fff;
      font-size: 12.5px;
      font-weight: 600;
      font-family: "DM Sans", sans-serif;
      cursor: pointer;
      transition: filter 0.15s, box-shadow 0.15s;
      margin-bottom: 4px;
    }
    #topNav .dd-save-btn:hover:not(:disabled) {
      filter: brightness(1.1);
      box-shadow: 0 4px 14px rgba(108,92,231,0.4);
    }
    #topNav .dd-save-btn:disabled {
      opacity: 0.55;
      cursor: default;
    }
    #topNav .dd-save-msg {
      padding: 5px 9px;
      border-radius: 7px;
      font-size: 11.5px;
      font-family: "DM Sans", sans-serif;
      margin-bottom: 6px;
    }
    #topNav .dd-save-msg.ok {
      background: rgba(5,150,105,0.15);
      border: 1px solid rgba(5,150,105,0.25);
      color: #34d399;
    }
    #topNav .dd-save-msg.err {
      background: rgba(220,38,38,0.15);
      border: 1px solid rgba(220,38,38,0.25);
      color: #f87171;
    }
  `;
  document.head.appendChild(style);
}

// Nav items config — used to build the mobile menu
const NAV_ITEMS = [
  { key: 'calendar',     href: '/academic-calendar',  label: 'Academic Calendar', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { key: 'announcements',href: '/announcements',       label: 'Announcements',    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3L9.218 10.083M11.698 20.334C12.573 21.209 14 20.561 14 19.307V4.693C14 3.439 12.573 2.791 11.698 3.666L7 8H4C2.895 8 2 8.895 2 10v4c0 1.105.895 2 2 2h3l4.698 4.334z"/></svg>', badgeId: 'annBadge' },
  { key: 'messageboard', href: '/message-board',       label: 'Message Board',    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>', badgeId: 'msgBadge' },
  { divider: true },
  { key: 'documents',    href: '/documents',           label: 'Documents',        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', badgeId: 'docBadge', badgeCount: true },
];

function buildMobileMenu(activeKey) {
  if (document.getElementById('ahMobileMenu')) return;

  const menu = document.createElement('div');
  menu.className = 'ah-mobile-menu';
  menu.id = 'ahMobileMenu';
  menu.setAttribute('role', 'navigation');
  menu.setAttribute('aria-label', 'Mobile navigation');

  NAV_ITEMS.forEach(item => {
    if (item.divider) {
      const d = document.createElement('div');
      d.className = 'ah-mobile-divider';
      menu.appendChild(d);
      return;
    }

    const a = document.createElement('a');
    a.href = item.href;
    a.className = 'ah-mobile-menu-item' + (item.key === activeKey ? ' active' : '');
    a.setAttribute('data-mobile-nav-key', item.key);

    let inner = item.icon + `<span>${item.label}</span>`;
    if (item.badgeId) {
      const countClass = item.badgeCount ? ' ah-mobile-badge--count' : '';
      inner += `<span class="ah-mobile-badge${countClass}" id="mobile_${item.badgeId}"></span>`;
    }
    a.innerHTML = inner;

    a.addEventListener('click', () => closeMobileMenu());
    menu.appendChild(a);
  });

  // Insert immediately after the navbarMount
  const mount = document.getElementById('navbarMount');
  if (mount && mount.parentNode) {
    mount.parentNode.insertBefore(menu, mount.nextSibling);
  } else {
    document.body.insertBefore(menu, document.body.firstChild);
  }
}

function closeMobileMenu() {
  const menu = document.getElementById('ahMobileMenu');
  const btn  = document.getElementById('hamburgerBtn');
  if (menu) { menu.classList.remove('open'); }
  if (btn)  { btn.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
}

function initHamburger() {
  const btn = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('ahMobileMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = menu.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      closeMobileMenu();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileMenu();
  });
}

// Mirror desktop badge counts to mobile badge elements
function syncMobileBadges() {
  NAV_ITEMS.forEach(item => {
    if (!item.badgeId) return;
    const desktop = document.getElementById(item.badgeId);
    const mobile  = document.getElementById('mobile_' + item.badgeId);
    if (!desktop || !mobile) return;
    const sync = () => {
      mobile.textContent = desktop.textContent;
      mobile.classList.toggle('visible', desktop.classList.contains('visible'));
    };
    sync();
    new MutationObserver(sync).observe(desktop, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
}

// ── Profile helpers ──────────────────────────────────────────────
const _AH_AVATAR_PALETTE = ['#6c5ce7','#0984e3','#00b894','#e17055','#d63031','#6d28d9','#0891b2'];
function _ahAvatarColor(name) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return _AH_AVATAR_PALETTE[Math.abs(h) % _AH_AVATAR_PALETTE.length];
}
function _ahGetInitials(name) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';
}
function _ahBuildAvatar(el, user) {
  if (!el) return;
  if (user.photoURL) {
    el.innerHTML = `<img src="${user.photoURL}" referrerpolicy="no-referrer" alt="">`;
    el.style.background = 'transparent';
  } else {
    const n = user.displayName || user.email.split('@')[0];
    el.style.background = _ahAvatarColor(n);
    el.textContent = _ahGetInitials(n);
  }
}
function _ahRenderProfileInfo(profile) {
  // Role badge
  const roleBadge = document.getElementById('ddRoleBadge');
  if (roleBadge && profile?.role_academichub) {
    const isAdmin = profile.role_academichub === 'academic_admin';
    roleBadge.textContent = isAdmin ? 'Admin' : 'User';
    roleBadge.className   = 'dd-role-badge' + (isAdmin ? ' admin' : '');
    roleBadge.style.display = '';
  }

  // School row
  const schoolRow = document.getElementById('ddSchoolRow');
  const schoolEl  = document.getElementById('ddSchool');
  if (schoolEl && profile?.school) {
    schoolEl.textContent  = profile.school;
    if (schoolRow) schoolRow.style.display = 'flex';
  } else if (schoolRow) {
    schoolRow.style.display = 'none';
  }

  // Sub-roles chips
  const subRolesRow   = document.getElementById('ddSubRolesRow');
  const chipsContainer = document.getElementById('ddSubRoleChips');
  const subRoles = profile?.ah_sub_roles || [];
  if (chipsContainer) {
    chipsContainer.innerHTML = '';
    subRoles.forEach(key => {
      const chip = document.createElement('span');
      chip.className   = 'dd-subrole-chip';
      chip.textContent = _ahSubRoleLabel(key);
      chipsContainer.appendChild(chip);
    });
  }
  if (subRolesRow) subRolesRow.style.display = subRoles.length ? 'flex' : 'none';
}

function _ahInitEditForm(user, profile) {
  const editToggle  = document.getElementById('ddEditToggle');
  const editForm    = document.getElementById('ddEditForm');
  const editChevron = document.getElementById('ddEditChevron');
  const nameInput   = document.getElementById('ddEditName');
  const schoolInput = document.getElementById('ddEditSchool');
  const checkboxesEl = document.getElementById('ddSubRoleCheckboxes');
  const saveBtn     = document.getElementById('ddSaveProfile');
  const saveMsg     = document.getElementById('ddSaveMsg');

  if (!editToggle || !editForm) return;

  // Populate initial values
  if (nameInput)   nameInput.value   = profile?.displayName || user.displayName || '';
  if (schoolInput) schoolInput.value = profile?.school || '';

  // Build sub-role checkboxes
  if (checkboxesEl) {
    checkboxesEl.innerHTML = '';
    const current = profile?.ah_sub_roles || [];
    AH_SUB_ROLES.forEach(({ key, label }) => {
      const row   = document.createElement('label');
      row.className = 'dd-subrole-checkbox-row';
      const cb    = document.createElement('input');
      cb.type     = 'checkbox';
      cb.value    = key;
      cb.checked  = current.includes(key);
      row.appendChild(cb);
      row.appendChild(document.createTextNode(label));
      checkboxesEl.appendChild(row);
    });
  }

  // Toggle expand/collapse
  editToggle.addEventListener('click', e => {
    e.stopPropagation();
    const open = editForm.style.display === 'none';
    editForm.style.display = open ? '' : 'none';
    if (editChevron) editChevron.classList.toggle('open', open);
    const lbl = document.getElementById('ddEditToggleLabel');
    if (lbl) lbl.textContent = open ? 'Cancel' : 'Edit Profile';
    if (saveMsg) { saveMsg.style.display = 'none'; saveMsg.className = 'dd-save-msg'; }
  });

  // Save
  if (saveBtn) {
    saveBtn.addEventListener('click', async e => {
      e.stopPropagation();
      const newName   = nameInput?.value.trim()   || '';
      const newSchool = schoolInput?.value.trim()  || '';
      const newRoles  = Array.from(
        checkboxesEl?.querySelectorAll('input[type="checkbox"]:checked') || []
      ).map(cb => cb.value);

      if (!newName) {
        _ahShowSaveMsg(saveMsg, 'err', 'Display name cannot be empty.');
        return;
      }

      saveBtn.disabled    = true;
      saveBtn.textContent = 'Saving…';

      try {
        const db  = window.db;
        const uid = user.uid;
        if (!db || !uid) throw new Error('Not authenticated');

        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        await updateDoc(doc(db, 'users', uid), {
          displayName: newName,
          school:      newSchool,
          ah_sub_roles: newRoles,
        });

        // Update in-memory profile
        if (window.userProfile) {
          window.userProfile.displayName  = newName;
          window.userProfile.school       = newSchool;
          window.userProfile.ah_sub_roles = newRoles;
        }

        // Refresh displayed info
        const nameEl = document.getElementById('ddFullName');
        if (nameEl) nameEl.textContent = newName;
        const navFirst = document.getElementById('navFirstName');
        if (navFirst) navFirst.textContent = newName.split(' ')[0];
        _ahBuildAvatar(document.getElementById('navAvatar'), { ...user, displayName: newName });
        _ahBuildAvatar(document.getElementById('ddAvatar'),  { ...user, displayName: newName });
        _ahRenderProfileInfo(window.userProfile);

        _ahShowSaveMsg(saveMsg, 'ok', 'Profile saved successfully.');
        setTimeout(() => {
          editForm.style.display = 'none';
          if (editChevron) editChevron.classList.remove('open');
          const lbl = document.getElementById('ddEditToggleLabel');
          if (lbl) lbl.textContent = 'Edit Profile';
          if (saveMsg) saveMsg.style.display = 'none';
        }, 1600);
      } catch (err) {
        _ahShowSaveMsg(saveMsg, 'err', 'Save failed. Please try again.');
      } finally {
        saveBtn.disabled    = false;
        saveBtn.textContent = 'Save Changes';
      }
    });
  }
}

function _ahShowSaveMsg(el, type, text) {
  if (!el) return;
  el.textContent  = text;
  el.className    = 'dd-save-msg ' + type;
  el.style.display = '';
}

function _ahPopulateProfile(user, displayName, authInstance, profile) {
  const name      = displayName || user.displayName || user.email.split('@')[0];
  const firstName = name.split(' ')[0];
  _ahBuildAvatar(document.getElementById('navAvatar'), { ...user, displayName: name });
  const navFirst = document.getElementById('navFirstName');
  if (navFirst) navFirst.textContent = firstName;
  _ahBuildAvatar(document.getElementById('ddAvatar'), { ...user, displayName: name });
  const ddFull  = document.getElementById('ddFullName');
  if (ddFull)  ddFull.textContent  = name;
  const ddEmail = document.getElementById('ddEmail');
  if (ddEmail) ddEmail.textContent = user.email;

  // Render extra profile info
  _ahRenderProfileInfo(profile);

  const profileWrap = document.getElementById('profileWrap');
  if (profileWrap) profileWrap.style.display = 'flex';

  const profileBtn = document.getElementById('profileBtn');
  const ddSignOut  = document.getElementById('ddSignOut');
  if (profileBtn && profileWrap) {
    profileBtn.addEventListener('click', e => { e.stopPropagation(); profileWrap.classList.toggle('open'); });
    document.addEventListener('click', () => profileWrap.classList.remove('open'));
  }
  if (ddSignOut) {
    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ signOut }) => {
      ddSignOut.addEventListener('click', () => {
        const a = authInstance || window.auth;
        signOut(a).then(() => { window.location.href = 'login.html'; });
      });
    });
  }

  // Wire up edit form
  _ahInitEditForm(user, profile);
}

// Public API: call after __loadAcademicNavbar resolves
// displayName: Firestore displayName string (or null to use user.displayName)
// authInstance: the app's auth instance (optional, falls back to window.auth)
// profile: Firestore userProfile object (optional)
window.__ahPopulateNav = function(user, displayName, authInstance, profile) {
  _ahPopulateProfile(user, displayName, authInstance, profile);
};

window.__loadAcademicNavbar = async function(activeKey, authCtx) {
  const mount = document.getElementById('navbarMount');
  if (!mount) return;

  const res = await fetch('partials/navbar.html', { cache: 'default' });
  if (!res.ok) throw new Error('Failed to load navbar partial');

  mount.innerHTML = await res.text();
  ensureNavbarSharedStyles();

  // Mark active desktop link
  mount.querySelectorAll('[data-nav-key]').forEach(link => {
    link.classList.toggle('active', link.dataset.navKey === activeKey);
  });

  // Build and wire mobile menu
  buildMobileMenu(activeKey);
  initHamburger();
  syncMobileBadges();

  // Populate profile section and init counters if auth context provided
  if (authCtx?.user) {
    _ahPopulateProfile(authCtx.user, authCtx.profile?.displayName || null, null, authCtx.profile || null);
    window.__initNavbarCounters?.({ db: window.db, user: authCtx.user });
  }
};

window.__clearNavbarCounters = function() {
  const ids = ['annBadge', 'msgBadge', 'docBadge'];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('visible');
  });

  const state = window.__navbarCounterState;
  if (!state) return;
  state.unsubs.forEach((u) => { try { u(); } catch {} });
  state.unsubs = [];
};

window.__initNavbarCounters = async function({ db, user }) {
  if (!db || !user) return;
  window.__clearNavbarCounters();

  const state = window.__navbarCounterState || { unsubs: [] };
  window.__navbarCounterState = state;

  const setBadge = (id, count, maxCount = 99) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) {
      el.textContent = count > maxCount ? `${maxCount}+` : String(count);
      el.classList.add('visible');
    } else {
      el.textContent = '';
      el.classList.remove('visible');
    }
  };

  const fs = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const { collection, getCountFromServer } = fs;

  // Use one-shot aggregation counts instead of full-collection real-time listeners.
  // This avoids downloading all documents just to read snap.size.
  const countJobs = [
    { id: 'annBadge', ref: collection(db, 'announcements') },
    { id: 'msgBadge', ref: collection(db, 'topics') },
    { id: 'docBadge', ref: collection(db, 'documents') },
  ];

  await Promise.allSettled(
    countJobs
      .filter(j => document.getElementById(j.id))
      .map(async j => {
        const snap = await getCountFromServer(j.ref);
        setBadge(j.id, snap.data().count, 999);
      })
  );
};
