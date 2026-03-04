window.__loadAcademicNavbar = async function(activeKey) {
  const mount = document.getElementById('navbarMount');
  if (!mount) return;

  const res = await fetch('partials/navbar.html', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load navbar partial');

  mount.innerHTML = await res.text();

  const links = mount.querySelectorAll('[data-nav-key]');
  links.forEach((link) => {
    link.classList.toggle('active', link.dataset.navKey === activeKey);
  });
};

window.__clearNavbarCounters = function() {
  const ids = ['annBadge', 'msgBadge', 'libBadge', 'docBadge'];
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
  const {
    collection, query, where, onSnapshot, Timestamp,
    doc, getDoc, setDoc, serverTimestamp,
  } = fs;

  const annBadge = document.getElementById('annBadge');
  if (annBadge) {
    const lastSeenKey = `ann_lastSeen_${user.uid}`;
    const lastSeen = parseInt(localStorage.getItem(lastSeenKey) || '0', 10);
    const annQ = query(
      collection(db, 'announcements'),
      where('createdAt', '>', Timestamp.fromMillis(lastSeen)),
    );
    state.unsubs.push(onSnapshot(annQ, (snap) => setBadge('annBadge', snap.size), () => {}));

    const navAnnBtn = document.getElementById('navAnnBtn');
    if (navAnnBtn && navAnnBtn.dataset.counterBound !== '1') {
      navAnnBtn.dataset.counterBound = '1';
      navAnnBtn.addEventListener('click', () => {
        localStorage.setItem(lastSeenKey, Date.now().toString());
      });
    }
  }

  const msgBadge = document.getElementById('msgBadge');
  if (msgBadge) {
    let cutoff = 0;
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      cutoff = userSnap.exists() && userSnap.data().lastReadMessageboard
        ? userSnap.data().lastReadMessageboard.toMillis()
        : 0;
    } catch {}

    const msgQ = query(
      collection(db, 'topics'),
      where('createdAt', '>', Timestamp.fromMillis(cutoff)),
    );
    state.unsubs.push(onSnapshot(msgQ, (snap) => setBadge('msgBadge', snap.size), () => {}));

    const markRead = () => {
      setDoc(doc(db, 'users', user.uid), { lastReadMessageboard: serverTimestamp() }, { merge: true }).catch(() => {});
      setBadge('msgBadge', 0);
    };
    const navMsgBtn = document.getElementById('navMsgBtn');
    if (navMsgBtn && navMsgBtn.dataset.counterBound !== '1') {
      navMsgBtn.dataset.counterBound = '1';
      navMsgBtn.addEventListener('click', markRead);
    }
    const mobileMsgBtn = document.getElementById('mobileMsgBtn');
    if (mobileMsgBtn && mobileMsgBtn.dataset.counterBound !== '1') {
      mobileMsgBtn.dataset.counterBound = '1';
      mobileMsgBtn.addEventListener('click', markRead);
    }
  }

  if (document.getElementById('libBadge')) {
    state.unsubs.push(
      onSnapshot(collection(db, 'library'), (snap) => setBadge('libBadge', snap.size, 999), () => {}),
    );
  }

  if (document.getElementById('docBadge')) {
    state.unsubs.push(
      onSnapshot(collection(db, 'documents'), (snap) => setBadge('docBadge', snap.size, 999), () => {}),
    );
  }
};
