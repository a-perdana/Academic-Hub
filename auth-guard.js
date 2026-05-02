// auth-guard.js — Academic Hub (modular SDK v10)
// ─────────────────────────────────────────────────────────────────
// Include on every protected page (NOT on any public landing page).
// Depends on firebase-config.js setting window.ENV before this runs.
//
// Allowed roles: academic_admin, academic_user
//
// Exposes globals (set once authReady fires):
//   window.firebaseApp   — FirebaseApp instance
//   window.db            — Firestore instance
//   window.auth          — Auth instance
//   window.currentUser   — firebase.User object
//   window.userProfile   — Firestore users/{uid} document data
//
// Dispatches CustomEvent 'authReady' on document when auth + profile
// are confirmed, with detail: { user, profile }
// ─────────────────────────────────────────────────────────────────

import { initializeApp, getApps }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, serverTimestamp,
  collection, collectionGroup, onSnapshot, updateDoc, arrayUnion, arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ── Platform identity ─────────────────────────────────────────────
const PLATFORM_KEY    = 'role_academichub';        // per-user Firestore field
const APPROVAL_KEY    = 'approval_status_academichub'; // 'pending' | 'approved'
const DEFAULT_ROLE    = 'academic_user';

// ── Allowed email domains (centralised — used by all pages) ───────
window.ACADEMIC_ALLOWED_DOMAINS = [
  "scr.sch.id", "eibos.sch.id", "fatih.sch.id", "gcb.sch.id",
  "kesatuanbangsa.sch.id", "kbs.sch.id", "mega.sch.id", "pakarbelia.sch.id",
  "prestigeschool.sch.id", "pribadibandung.sch.id", "pribadidepok.sch.id",
  "pribadipremiere.sch.id", "semesta.sch.id", "tnafatih.sch.id", "eduversal.org",
];

// Roles permitted to use Academic Hub
const ALLOWED_ROLES = ['academic_admin', 'academic_user'];

// Hide page content until auth is confirmed (prevents flash of content)
document.body.style.visibility = 'hidden';

// ── Initialise Firebase (guard against double-init) ──────────────
const firebaseConfig = {
  apiKey:            window.ENV.FIREBASE_API_KEY,
  authDomain:        window.ENV.FIREBASE_AUTH_DOMAIN,
  projectId:         window.ENV.FIREBASE_PROJECT_ID,
  storageBucket:     window.ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: window.ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId:             window.ENV.FIREBASE_APP_ID,
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const storage = getStorage(app);

window.firebaseApp   = app;
window.auth          = auth;
window.db            = db;
window.storage       = storage;
window.firestoreOps  = {
  doc, getDoc, setDoc, serverTimestamp,
  collection, collectionGroup, onSnapshot, updateDoc, arrayUnion, arrayRemove,
};
window.storageOps    = { ref, uploadBytes, getDownloadURL, deleteObject };

// ── Name prompt (shown when displayName is missing) ───────────────
function promptForName() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(28,28,46,0.75);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"DM Sans",sans-serif';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:40px 36px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.35)">
        <h2 style="font-size:1.4rem;font-weight:600;color:#1c1c2e;margin-bottom:6px">Welcome!</h2>
        <p style="font-size:0.875rem;color:#8888a8;margin-bottom:24px">Please enter your full name to complete your profile.</p>
        <input id="_nameInput" type="text" placeholder="Your full name"
          style="width:100%;padding:10px 14px;border:1px solid #e0ddd6;border-radius:8px;font-size:0.95rem;color:#1c1c2e;outline:none;margin-bottom:8px;box-sizing:border-box">
        <p id="_nameErr" style="font-size:0.82rem;color:#dc2626;min-height:20px;margin-bottom:12px"></p>
        <button id="_nameBtn" style="width:100%;padding:11px;background:linear-gradient(135deg,#7c3aed,#0891b2);color:#fff;border:none;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer">Continue →</button>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.visibility = 'visible';

    const input = overlay.querySelector('#_nameInput');
    const btn   = overlay.querySelector('#_nameBtn');
    const err   = overlay.querySelector('#_nameErr');
    input.focus();

    const submit = () => {
      const name = input.value.trim();
      if (!name) { err.textContent = 'Please enter your name.'; return; }
      overlay.remove();
      document.body.style.visibility = 'hidden';
      resolve(name);
    };
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  });
}

// ── AH sub-role options ───────────────────────────────────────────
const AH_ROLE_OPTIONS = [
  { value: 'foundation_representative', label: 'Foundation Representative', desc: 'I represent the school foundation and oversee strategic direction.' },
  { value: 'school_principal',          label: 'School Principal',          desc: 'I lead the school and am responsible for overall management.' },
  { value: 'academic_coordinator',      label: 'Academic Coordinator',      desc: 'I coordinate academic programmes, curriculum, and assessment.' },
  { value: 'cambridge_coordinator',     label: 'Cambridge Coordinator',     desc: 'I oversee Cambridge examinations, syllabus tracking, and student preparation.' },
];

function ahProfileComplete(profile) {
  return Array.isArray(profile.ah_sub_roles) && profile.ah_sub_roles.length > 0;
}

// ── Page-access helpers ──────────────────────────────────────────
// Pages that never get gated (auth flow + dashboard itself).
const PAGE_ACCESS_BYPASS = new Set(['', 'index', 'login', 'waiting']);
const PAGE_ACCESS_TTL_MS = 5 * 60 * 1000; // 5 min sessionStorage cache

// Convert window.location.pathname to a clean URL slug (the doc ID
// in page_access_config). '/academic-calendar' -> 'academic-calendar';
// '/academic-calendar.html' -> 'academic-calendar'; '/' -> ''.
function currentPageKey() {
  const path = (window.location.pathname || '/').toLowerCase();
  let slug = path.replace(/^\/+/, '').replace(/\/+$/, '');
  slug = slug.replace(/\.html$/, '');
  // Drop any nested path segments — only the top-level slug is the page key.
  if (slug.includes('/')) slug = slug.split('/')[0];
  return slug;
}

async function getPageAccessConfig(db, pageKey) {
  // sessionStorage cache to avoid one Firestore read per navigation.
  try {
    const raw = sessionStorage.getItem('pac:' + pageKey);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && (Date.now() - cached.at) < PAGE_ACCESS_TTL_MS) {
        return cached.data; // may be null (cached miss)
      }
    }
  } catch (_) {}

  let data = null;
  try {
    const snap = await getDoc(doc(db, 'page_access_config', pageKey));
    data = snap.exists() ? snap.data() : null;
  } catch (err) {
    // On read failure, fail-open (don't lock everyone out on a transient error).
    console.warn('page_access_config read failed for', pageKey, err);
    return null;
  }
  try {
    sessionStorage.setItem('pac:' + pageKey, JSON.stringify({ at: Date.now(), data }));
  } catch (_) {}
  return data;
}

function promptForAhProfile(profile) {
  return new Promise(resolve => {
    const existing = Array.isArray(profile.ah_sub_roles) ? profile.ah_sub_roles : [];

    const roleCards = AH_ROLE_OPTIONS.map(o => `
      <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px 14px;border:1.5px solid #e0ddd6;border-radius:10px;transition:border-color .15s" id="_roleCard_${o.value}">
        <input type="checkbox" id="_chk_${o.value}" value="${o.value}"
          style="margin-top:2px;accent-color:#d97706;width:16px;height:16px;flex-shrink:0" ${existing.includes(o.value) ? 'checked' : ''}>
        <div>
          <div style="font-size:0.875rem;font-weight:600;color:#1c1c2e">${o.label}</div>
          <div style="font-size:0.78rem;color:#8888a8;margin-top:2px">${o.desc}</div>
        </div>
      </label>`).join('');

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(28,28,46,0.82);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"DM Sans",sans-serif';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:40px 36px;width:100%;max-width:480px;box-shadow:0 24px 64px rgba(0,0,0,0.40);max-height:90vh;overflow-y:auto">
        <div style="margin-bottom:24px">
          <h2 style="font-size:1.35rem;font-weight:700;color:#1c1c2e;margin-bottom:6px">Set up your profile</h2>
          <p style="font-size:0.875rem;color:#8888a8;line-height:1.5">Select your role(s) so we can show you the right dashboards and checklists.</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
          ${roleCards}
        </div>
        <p id="_ahProfileErr" style="font-size:0.82rem;color:#dc2626;min-height:18px;margin-bottom:12px"></p>
        <button id="_ahProfileBtn" style="width:100%;padding:12px;background:linear-gradient(135deg,#d97706,#b45309);color:#fff;border:none;border-radius:10px;font-size:0.95rem;font-weight:600;cursor:pointer">Save & Continue →</button>
      </div>`;

    document.body.appendChild(overlay);
    document.body.style.visibility = 'visible';

    // Border highlight on check
    AH_ROLE_OPTIONS.forEach(o => {
      const chk   = overlay.querySelector(`#_chk_${o.value}`);
      const label = overlay.querySelector(`#_roleCard_${o.value}`);
      const update = () => { label.style.borderColor = chk.checked ? '#d97706' : '#e0ddd6'; };
      chk.addEventListener('change', update);
      update();
    });

    const btn = overlay.querySelector('#_ahProfileBtn');
    const err = overlay.querySelector('#_ahProfileErr');

    btn.addEventListener('click', () => {
      const ah_sub_roles = AH_ROLE_OPTIONS
        .map(o => overlay.querySelector(`#_chk_${o.value}`).checked ? o.value : null)
        .filter(Boolean);

      if (!ah_sub_roles.length) {
        err.textContent = 'Please select at least one role.';
        return;
      }

      overlay.remove();
      document.body.style.visibility = 'hidden';
      resolve({ ah_sub_roles });
    });
  });
}

// ── Auth state listener ──────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {

  // 1. Not signed in → redirect to login
  if (!user) {
    window.location.replace('login.html');
    return;
  }

  // 2. Fetch (or create) Firestore profile
  let profile;
  const userRef = doc(db, 'users', user.uid);
  try {
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // First sign-in: assign default Academic Hub role + pending approval.
      const newProfile = {
        uid:            user.uid,
        email:          user.email,
        displayName:    user.displayName || '',
        photoURL:       user.photoURL    || '',
        [PLATFORM_KEY]: DEFAULT_ROLE,
        [APPROVAL_KEY]: 'pending',
        createdAt:      serverTimestamp(),
      };
      await setDoc(userRef, newProfile);
      profile = newProfile;
    } else {
      profile = userSnap.data();
      if (profile[PLATFORM_KEY] == null) {
        await setDoc(userRef, { [PLATFORM_KEY]: DEFAULT_ROLE }, { merge: true });
        profile = { ...profile, [PLATFORM_KEY]: DEFAULT_ROLE };
      }
      // If approval field is absent, treat as pending — requires admin approval
      if (profile[APPROVAL_KEY] == null) {
        await setDoc(userRef, { [APPROVAL_KEY]: 'pending' }, { merge: true });
        profile = { ...profile, [APPROVAL_KEY]: 'pending' };
      }
    }
  } catch (err) {
    console.error('auth-guard: could not fetch user profile', err);
    await signOut(auth);
    window.location.replace('login.html?error=profile');
    return;
  }

  // 3. Domain check (Google SSO users must be from an allowed school domain)
  const isPasswordUser = user.providerData.some(p => p.providerId === 'password');
  const emailDomain    = user.email.split('@')[1];
  if (!isPasswordUser && !window.ACADEMIC_ALLOWED_DOMAINS.includes(emailDomain)) {
    await signOut(auth);
    window.location.replace('login.html?error=domain');
    return;
  }

  // 4. Approval check (academic_admin bypasses — they are always approved)
  const approvalStatus = profile[APPROVAL_KEY];
  const isAdminRole    = profile[PLATFORM_KEY] === 'academic_admin';
  if (!isAdminRole && approvalStatus !== 'approved') {
    // Not yet approved — send to waiting room (do NOT sign out)
    const pathname = window.location.pathname;
    const isWaiting = pathname === '/waiting' || pathname.endsWith('/waiting.html');
    if (!isWaiting) {
      window.location.replace('waiting.html');
    }
    document.body.style.visibility = 'visible';
    return;
  }

  // 5. Role check
  const platformRole = profile[PLATFORM_KEY];
  if (!ALLOWED_ROLES.includes(platformRole)) {
    await signOut(auth);
    window.location.replace('login.html?error=access');
    return;
  }

  // 5b. Page-access check (sub-role gate via page_access_config)
  // - admin bypasses
  // - root '/' and explicit allow-list pages skip the check
  // - missing config doc => allow (back-compat)
  // - empty visible_to  => allow (open to every AH sub-role)
  // - else: user must hold at least one matching ah_sub_role
  if (platformRole !== 'academic_admin') {
    const pageKey = currentPageKey();
    if (pageKey && !PAGE_ACCESS_BYPASS.has(pageKey)) {
      const cfg = await getPageAccessConfig(db, pageKey);
      if (cfg && Array.isArray(cfg.visible_to) && cfg.visible_to.length > 0) {
        const userSubRoles = Array.isArray(profile.ah_sub_roles) ? profile.ah_sub_roles : [];
        const allowed = userSubRoles.some(r => cfg.visible_to.includes(r));
        if (!allowed) {
          try {
            sessionStorage.setItem('ah_access_denied', JSON.stringify({
              pageKey,
              label: cfg.label || pageKey,
              at: Date.now(),
            }));
          } catch (_) {}
          window.location.replace('/?denied=' + encodeURIComponent(pageKey));
          return;
        }
      }
    }
  }

  // 6. Name prompt if missing
  if (!profile.displayName) {
    const name = await promptForName();
    await setDoc(userRef, { displayName: name }, { merge: true });
    profile.displayName = name;
  }

  // 6b. AH sub-role prompt if ah_sub_roles not yet set
  if (!ahProfileComplete(profile)) {
    const { ah_sub_roles } = await promptForAhProfile(profile);
    await setDoc(userRef, { ah_sub_roles }, { merge: true });
    profile.ah_sub_roles = ah_sub_roles;
  }

  // 7. All checks passed — expose globals
  window.currentUser = user;
  window.userProfile = profile;

  // Log platform usage event (fire-and-forget, non-blocking)
  addDoc(collection(db, 'platform_usage'), {
    uid:      user.uid,
    platform: 'academichub',
    role:     profile[PLATFORM_KEY] || '',
    ts:       serverTimestamp(),
  }).catch(() => {});

  // ── Populate shared nav elements ─────────────────────────────────
  const displayName = profile.displayName || user.displayName;
  const navUserName = document.querySelector('.nav-user-name');
  const navAvatar   = document.getElementById('navAvatar');
  const logoutBtn   = document.getElementById('logoutBtn');

  if (navUserName) {
    navUserName.textContent = displayName
      ? displayName.split(' ')[0]
      : user.email;
  }

  if (navAvatar) {
    const initials = displayName
      ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : user.email[0].toUpperCase();
    navAvatar.textContent = initials;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'login.html';
    });
  }

  // 8. Show page and notify
  document.body.style.visibility = 'visible';
  document.dispatchEvent(new CustomEvent('authReady', {
    detail: { user, profile },
  }));
});
