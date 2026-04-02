function ensureNavbarSharedStyles() {
  if (document.getElementById('navbar-shared-styles')) return;
  const style = document.createElement('style');
  style.id = 'navbar-shared-styles';
  style.textContent = `
    #topNav {
      overflow: visible;
    }
    #topNav .nav-actions {
      min-width: 0;
    }
    #topNav .nav-btn {
      position: relative;
      overflow: visible;
    }
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

    @media (max-width: 1080px) {
      #topNav .nav-brand-name {
        display: none;
      }
      #topNav .nav-actions {
        gap: 6px;
      }
      #topNav .nav-btn {
        padding-left: 12px;
        padding-right: 12px;
      }
    }

    @media (max-width: 860px) {
      #topNav {
        padding-left: 10px !important;
        padding-right: 10px !important;
      }
      #topNav .nav-actions {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: visible;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        gap: 8px;
        padding-bottom: 2px;
      }
      #topNav .nav-actions::-webkit-scrollbar {
        display: none;
      }
      #topNav .nav-btn {
        flex: 0 0 auto;
      }
      #topNav .profile-wrap {
        flex: 0 0 auto;
      }
    }

    @media (max-width: 640px) {
      #topNav .nav-btn span {
        font-size: 12px;
      }
      #topNav .nav-badge {
        min-width: 19px;
        height: 19px;
        font-size: 10px;
        top: -7px;
        right: -7px;
      }
    }
  `;
  document.head.appendChild(style);
}

window.__loadAcademicNavbar = async function(activeKey) {
  const mount = document.getElementById('navbarMount');
  if (!mount) return;

  const res = await fetch('partials/navbar.html', { cache: 'default' });
  if (!res.ok) throw new Error('Failed to load navbar partial');

  mount.innerHTML = await res.text();
  ensureNavbarSharedStyles();

  const links = mount.querySelectorAll('[data-nav-key]');
  links.forEach((link) => {
    link.classList.toggle('active', link.dataset.navKey === activeKey);
  });
};

window.__clearNavbarCounters = function() {
  const ids = ['annBadge', 'msgBadge', 'libBadge', 'docBadge', 'aiBadge', 'surveyBadge'];
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
  const { collection, getCountFromServer, query, where } = fs;

  // Use one-shot aggregation counts instead of full-collection real-time listeners.
  // This avoids downloading all documents just to read snap.size.
  const countJobs = [
    { id: 'annBadge',    ref: collection(db, 'announcements') },
    { id: 'msgBadge',    ref: collection(db, 'topics') },
    { id: 'libBadge',    ref: collection(db, 'library') },
    { id: 'docBadge',    ref: collection(db, 'documents') },
    { id: 'aiBadge',     ref: collection(db, 'prompts') },
    { id: 'surveyBadge', ref: query(collection(db, 'surveys'), where('platforms', 'array-contains', 'academichub')) },
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
