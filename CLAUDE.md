# Academic Hub — Architecture Reference

## What This App Is

Academic Hub is the **partner school leadership portal** for Eduversal's network. Its users are partner school management staff:

- **Foundation Representatives** — governance and foundation oversight
- **School Principals** — school-level operations and quality
- **Academic Coordinators** — curriculum, teaching quality, and academic standards
- **Cambridge Exam Officers / Coordinators** — Cambridge exam administration and pathway planning

Key features: EASE assessment dashboards (4 cycles/year), Cambridge exam performance tracking, school appraisal and self-appraisal tools, teacher appraisal entry and calibration, school KPI and accreditation dashboards, academic standards framework, competency learning path and portfolio for coordinators, role-based weekly checklists, satisfaction surveys (student/staff/parent), and resource library.

New users require approval from a `central_admin` before accessing the platform. It is a **vanilla HTML/CSS/JS application** (no React, no bundler framework). Pages are plain `.html` files with inline scripts that load Firebase via CDN.

---

## Monorepo Structure

```
Eduversal Web/                    ← monorepo root (not a deployed app)
├── Academic Hub/                 ← THIS app (Vercel)
├── Central Hub/                  ← admin control panel (Vercel)
│   ├── firestore.rules           ← ⚠️ ONLY Firestore rules file — deploy from here
│   └── firebase.json             ← firebase deploy config
├── Teachers Hub/                 ← teacher tools (Vercel)
└── keys/                         ← service account JSON keys (gitignored)
```

Each app has its **own GitHub repository** and its **own Vercel/Firebase project link**, but all three share the single Firebase backend `centralhub-8727b`.

---

## Shared Firebase Backend

**Project ID:** `centralhub-8727b`

| Field                | Value                                      |
|----------------------|--------------------------------------------|
| authDomain           | centralhub-8727b.firebaseapp.com           |
| projectId            | centralhub-8727b                           |
| storageBucket        | centralhub-8727b.firebasestorage.app       |
| messagingSenderId    | 244951050014                               |
| apiKey / appId       | gitignored — see Firebase Console          |

**SDK:** Firebase modular v10 (`10.7.1`), loaded from the CDN:
```
https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js
https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js
https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js
```
Do NOT use the compat SDK (`firebase/app`, `firebase/auth` namespace imports). Always use modular imports.

---

## Firebase Config Pattern

**`firebase-config.js`** (gitignored) sets `window.ENV` at page load:
```js
window.ENV = {
  FIREBASE_API_KEY: "...",
  FIREBASE_AUTH_DOMAIN: "centralhub-8727b.firebaseapp.com",
  // ...
};
```

**Local development:** HTML pages include `<script src="firebase-config.js"></script>` plus an inline fallback:
```html
<script>
  if (!window.ENV) window.ENV = { FIREBASE_API_KEY: "...", ... };
</script>
```

**Production (Vercel):** `build.js` replaces `__FIREBASE_*__` placeholders embedded in each HTML file and strips the `<script src="firebase-config.js">` tag entirely. The `firebase-config.js` file is NOT deployed.

**Template:** `firebase-config.example.js` — copy to `firebase-config.js` and fill in the two secrets.

---

## Auth Pattern

Every protected page loads `auth-guard.js` as a module:
```html
<script type="module" src="auth-guard.js"></script>
```

`auth-guard.js` (modular SDK v10). The school + sub-role prompt runs BEFORE the approval check so central_admin sees the user's declared school + roles when reviewing pending signups in `console.html`:

1. Hides `document.body` immediately (prevents flash of content).
2. Initialises Firebase (guards against double-init with `getApps()`).
3. Listens on `onAuthStateChanged`. If no user → redirects to `login.html`.
4. Fetches (or creates) Firestore profile. First sign-in writes `role_academichub: 'academic_user'` + `approval_status_academichub: 'pending'`.
5. **Domain check** — Google SSO emails must be in `window.ACADEMIC_ALLOWED_DOMAINS`; email/password accounts bypass.
6. **Role check** — `role_academichub` must be in `['academic_admin', 'academic_user']`.
7. **Name prompt** if `displayName` missing.
8. **Profile prompt** — shown by `promptForAhProfile(user, profile)` until both `schoolId` AND `ah_sub_roles[]` are set (`ahProfileComplete()` checks both). The school dropdown is sourced from `partner_schools` ordered by name and auto-defaults to the doc whose `domain` matches the user's email domain. Multi-school domains (`semesta.sch.id`) leave the picker empty + show an amber hint. Writes back `{ schoolId, school, ah_sub_roles }` with `setDoc(..., { merge: true })`.
9. **Approval check** — if `approval_status_academichub !== 'approved'` (and not `academic_admin`) → redirect to `waiting.html`. `waiting.html` polls every 30s and redirects on approval.
10. **Page-access gate** — for non-admins, fetches `page_access_config/{currentSlug}` and redirects to `/?denied=<slug>` (with a yellow toast) if the user's `ah_sub_roles[]` doesn't intersect the page's `visible_to[]`. Auth-flow pages (`/`, `/login`, `/waiting`) and pages without a config doc are bypassed.
11. **UI gating** — bulk-fetches every `page_access_config` doc for `academichub` (one read, 5-min `sessionStorage` cache as `pac:__all__`) and runs `applyPageAccessGating()`: hides any `[data-nav-key]` link or `<a class="card" href]` element the user cannot access, plus empty `.nav-dropdown-wrap` / `.nav-dd-col` / `.mob-nav-section` containers. A MutationObserver re-runs gating whenever the navbar partial mounts or any new card/link is inserted later.
12. Exposes globals and dispatches `authReady`.

**Allowed domains** are defined centrally in `auth-guard.js` as `window.ACADEMIC_ALLOWED_DOMAINS` (15 entries: 14 partner school `.sch.id` domains + `eduversal.org`). Individual pages reference this via `const allowedDomains = window.ACADEMIC_ALLOWED_DOMAINS` — do NOT redefine the list inline.

**`index.html`** (login page) handles auth inline and does NOT use `auth-guard.js`. It has its own copy of the domain list for the login-time check.

**Globals exposed after `authReady`:**
| Global               | Value                                |
|----------------------|--------------------------------------|
| `window.firebaseApp` | FirebaseApp instance                 |
| `window.auth`        | Auth instance                        |
| `window.db`          | Firestore instance                   |
| `window.storage`     | Storage instance                     |
| `window.currentUser` | firebase.User object                 |
| `window.userProfile` | Firestore `users/{uid}` document     |

**Listening for auth in page scripts:**
```js
document.addEventListener('authReady', ({ detail: { user, profile } }) => {
  // safe to use window.db, window.currentUser, window.userProfile here
});
```

---

## Role System

Academic Hub uses `role_academichub` as the primary access field. **The legacy `role` field is no longer read** — `auth-guard.js` uses only `role_academichub`.

| Field             | Values                                            |
|-------------------|---------------------------------------------------|
| `role_academichub`| `'academic_user'` (default) \| `'academic_admin'` |
| `ah_sub_roles[]`  | `'foundation_representative'`, `'school_principal'`, `'academic_coordinator'`, `'cambridge_coordinator'` |
| `approval_status_academichub` | `'pending'` (default) \| `'approved'` |

**Academic Hub allowed roles:** `['academic_user', 'academic_admin']`

First login automatically assigns `academic_user` + `approval_status_academichub: 'pending'` via `setDoc` with `{ merge: true }`. Before reaching `waiting.html` the user must complete the **Profile prompt** (school + sub-roles) — the prompt re-shows on every login until both `schoolId` and `ah_sub_roles[]` are set, and writes back `{ schoolId, school, ah_sub_roles }`. After that, the user stays on `waiting.html` until a `central_admin` sets `approval_status_academichub: 'approved'` in `console.html` (which now sees the user's declared school + sub-roles when reviewing). `academic_admin` bypasses the approval check entirely.

**Sub-roles (`ah_sub_roles[]`)** are set at first sign-in by the profile prompt (and editable later via `console.html`). They control:
- `weekly-checklist.html` — tab visibility: each sub-role maps to its own tab (Foundation Representative / School Principal / Academic Coordinator). Users with multiple sub-roles see multiple tabs; single sub-role users see no tab bar. Admins see all tabs.
- `index.html` dashboard — categories with a `visible_to[]` field are filtered to matching sub-roles. Categories with empty `visible_to` are shown to everyone.
- **Per-page access** via `page_access_config/{slug}` — see Page Access section below.

**isAdmin check pattern:**
```js
const isAdmin = profile?.role_academichub === 'academic_admin';
```

**weekly-checklist.html Firestore IDs** follow the pattern `${ACADEMIC_YEAR}_w${week}_${currentPlatform}` where `currentPlatform` is one of `foundation_representative`, `school_principal`, `academic_coordinator`.

---

## Page Access System

Sub-role-based page visibility is driven by the `page_access_config/{slug}` collection (see monorepo-root `CLAUDE.md` for the full collection spec) and enforced entirely from `auth-guard.js`. Edited from Central Hub `/page-access`.

**Three layers of enforcement, all in `auth-guard.js`:**
1. **Step 5b — per-navigation gate.** Reads `page_access_config/{currentSlug}`. If no intersection between `userProfile.ah_sub_roles[]` and `cfg.visible_to[]`, redirects to `/?denied=<slug>`. Bypassed for admin, auth-flow pages, and pages with no config doc (back-compat) or `visible_to: []` (open to all).
2. **Step 7b — UI gating** via `applyPageAccessGating()`:
   - Bulk-fetches every AH `page_access_config` doc once, caches as `pac:__all__` in `sessionStorage` (5 min TTL).
   - Hides any `[data-nav-key]` element whose key is in the config and not allowed.
   - Hides any `<a class="card" href="...">` whose slug (derived from href via `slugFromHref()`) is in the config and not allowed.
   - Hides empty `.nav-dropdown-wrap`, `.nav-dd-col`, and `.mob-nav-section` containers.
   - A `MutationObserver` re-runs gating whenever new matching elements appear (the navbar partial mounts asynchronously, so this is essential).
   - Hidden elements get `data-pa-hidden="1"`; the CSS rule `[data-pa-hidden="1"] { display: none !important }` is injected by `ensurePageAccessStyles()`.
3. **`index.html` "Other available pages" auto-section** (`renderOtherAvailablePages()`) — for pages the user can access but lack a hand-crafted card on the dashboard, renders a minimal auto-card using `label` + `description`. De-duplicates against existing `<a class="card" href]` (slug-matched) so hand-crafted cards always win.

**Critical invariant — slug consistency:** Every `data-nav-key` in `partials/navbar.html` (and the `key:` field in `partials/navbar-loader.js`'s mobile menu config) must exactly match the `pageKey` in `page_access_config`. Example fixes from Step 1.1: `data-nav-key="calendar"` → `"academic-calendar"`, `data-nav-key="messageboard"` → `"message-board"`. When a page is added, also update `seed-ah-page-access.js` and re-run it.

**Active-key passing:** Pages call `window.__loadAcademicNavbar('<slug>', { user, profile })` with their own slug for the active-link highlight. The slug must match `data-nav-key` (and therefore `pageKey`).

**Bypass list** (in `auth-guard.js`):
```js
const PAGE_ACCESS_BYPASS = new Set(['', 'index', 'login', 'waiting']);
```

**Debugging:** `window.__paGate()` re-runs the gating pass. To force a fresh fetch, `sessionStorage.removeItem('pac:__all__')` then call `__paGate()`.

---

## Firestore Collections

| Collection              | Purpose                                      | Write access         |
|-------------------------|----------------------------------------------|----------------------|
| `users/{uid}`           | User profiles. **`schoolId` is required for AH users** — set at first login by the profile prompt (auto-defaults from email domain via `partner_schools.domain`). Used by `isAHUserAtSameSchool()` rules helper for same-school access checks. | owner or central_admin |
| `partner_schools/{schoolId}` | School directory (read here for the auth-guard school picker + KPI school selector). Each doc has `name`, `domain` (drives email-based auto-default in `promptForAhProfile()`), and a `classes/{classId}` subcollection. | central_admin (write) |
| `staff/{staffId}`       | Staff records                                | central_admin        |
| `announcements/{annId}` | Platform-wide announcements                  | central_admin        |
| `central_documents/{docId}` | CentralHub-managed documents            | central_admin        |
| `topics/{topicId}`      | Message board topics                         | any authorised user  |
| `topics/{topicId}/replies/{replyId}` | Message board replies           | any authorised user  |
| `competency_framework/leaders` | Read-only here. AH leadership track. Fields: `domains[]` (6: evsi/cial/pdpc/ewsc/eao/fcep), `competencies[]` (24, with `cambridgeStandardRefs[]` + `cambridgeStandardTexts[]`), `levelOrder`, `levelLabels`, full `cambridgeStandards{}` lookup (Cambridge **School Leader** Standards 2023). Loaded by `CompetencyFramework.html`, `LearningPath.html`, `MyPortfolio.html`, `MyCertificates.html`. Seeded by `scripts/competency/seed-ah-competency-framework.js`. | central_admin (write) |
| `competency_framework/leaders/levels/{compId}_{level}` | Read-only here. Per-(competency, level) base learning content. Fields: `reading` (~250 words), `keyTakeaways[]`, `selfAssessment[]`, `activity{...}`. Lazy-fetched on modal open by `LearningPath.html`. Admin overrides in `content_overrides_academic/{compId}_{lvl}` layer on top (HTML sanitised on save AND on render — same allowlist as TH). Seeded by `scripts/competency/seed-competency-content.js`. | central_admin (write) |
| `cambridge_crossref/index` | Read-only here. Single aggregator doc — for every Cambridge Teacher Standards (2023) ID that any Eduversal artefact tags, lists every sibling artefact across KPI / Appraisal / Competency. Read by `cambridge-crossref.js` when an AH user clicks any CTS chip. | central_admin (write) |
| `content_overrides_academic/{compId}_{lvl}` | Admin-edited reading override. Sanitised on save AND on render through a strict tag allowlist (Phase 1.5-equivalent fix shipped to AH 2026-05-03). | academic_admin |
| `user_competencies/{uid}` | Academic coordinator competency progress. Fields: `earned_academic` (map of compId → `{level, date}`), `matDone_academic` (map of matId → bool). TH progress lives on the same doc under `earned`; CH specialist under `earned_central`. Written by the owner, read by `LearningPath.html` and `CompetencyFramework.html`. | owner |
| `competency_evidence/{docId}` | Evidence submissions for competency level certification. Fields: `uid`, `platform` (`'academic'`), `compId`, `compName`, `domain`, `level`, `description`, `fileUrl`, `fileName`, `status` (`'pending'`\|`'approved'`\|`'rejected'`), `reviewerNote`, `createdAt`, `updatedAt`. **Storage path** for `fileUrl`: `competency_evidence/academic/{uid}/{timestamp}_{filename}` (≤25 MB). Written by coordinator (create), reviewed by `central_admin` via `Central Hub/competency-admin.html`. | owner (create), central_admin (review) |
| `competency_certificates/{certId}` | Read-only here. Issued certificates filtered by `where('platform','==','academic')`. Read by `MyCertificates.html`. Issued from `Central Hub/competency-admin.html`. | central_admin (write) |
| `page_access_config/{slug}` | Per-page sub-role visibility (read here, written from Central Hub `/page-access`). See Page Access System section for full enforcement model. | central_admin (write) |
| `nav_config/academichub`   | Admin-editable navbar item config — labels, hidden flags, ordering. Read on `authReady` by `partials/navbar-loader.js` which then dynamic-imports `/nav-edit-simple.js` (shared module from monorepo `shared-design/`) for the in-place editor. Doc shape: `{ platform: 'academichub', items: [{key, label, hidden}], updatedAt }`. | academic_admin |
| `feedbacks/{fbId}`         | Single canonical feedback collection (consolidated 2026-05-03). All AH writers (announcements, library, documents, EASE-Archive, messageboard, index) stamp `__src: 'academichub'` on every doc. The CH `feedback-management.html` reads + reviews. | any authorised user (create); central_admin (read/update/delete) |
| `weekly_progress/{docId}`  | Per-user weekly checklist progress. Doc id: `${uid}_${ACADEMIC_YEAR}_w${week}_${currentPlatform}`. Writes always include `schoolId: window.userProfile.schoolId` (denormalised 2026-05-03) so the `isAHUserAtSameSchool()` rule helper can read it directly without an extra `users/{uid}` get. Reads gated per Step 1.2 hardening. | owner; AH leadership (school_principal / academic_coordinator) read same-school |
| `teacher_kpi_submissions/{uid}_{periodId}` | Teacher KPI submissions (read by AH evaluators on `teacher-kpi-evaluation.html`). After Step 1.3 hardening, AH sub-role evaluators (school_principal, academic_coordinator) are restricted by Firestore rule to submissions where `schoolId == userProfile.schoolId`. The page query adds `where('schoolId','==',mySchool)` for sub-role users; `academic_admin` keeps the unfiltered query. Composite index `(periodId, schoolId)` is required. | teacher (write own); AH evaluator (workflow status fields only) |
| `induction_assignments/{menteeUid}` | **Induction Module (2026-05-04).** Read by `MyInduction.html` (own mentee induction) and `TeamInduction.html` (school principal team view, filtered `where('schoolId','==',mySchool)`). Charter NN3+NN4 — written by central_admin only. | central_admin (write) |
| `induction_progress/{uid}_{taskId}` | Mentee task completion. Principal mentee writes from `MyInduction.html`; school leader writes Q4-formal-eval-related tasks from `ObservationEntry.html`. | owner / mentor / school-leader |
| `induction_observations/{obsId}` | Observations including school leader's Q4 formal evaluation. Written from `ObservationEntry.html` (with `?type=formal_evaluation`). **Charter NN1: never feeds `teacher_appraisal_results`.** | observer (school leader) |
| `induction_journal/{entryId}` | Principal's weekly reflection. Written from `MyInduction.html` sidebar. **Charter NN2: HQ never reads named entries.** | owner (mentee) |
| `induction_pulses/{pulseId}` | Weekly mood pulse. Read aggregated by `TeamInduction.html` for school-pulse roll-up + 2-consecutive-low alarm. | owner (mentee); school leader read-roll-up |
| `induction_programs/{programId}` | Read by `MyInduction.html` to render Listen→Diagnose→Act→Anchor windows. | central_admin (write — via seed script only) |

**Timestamp field:** always `createdAt` (serverTimestamp). Do not use `timestamp` — that was the legacy name.

**Firestore rules** live **exclusively** in `CentralHub/firestore.rules` — the single source of truth for all three apps.

⚠️ **Always deploy rules from the `CentralHub/` directory:**
```bash
cd "Eduversal Web/CentralHub"
firebase deploy --only firestore:rules --project centralhub-8727b
```
Academic Hub does NOT have its own `firestore.rules`. Never create one — it would overwrite the shared rules with an outdated version.

---

## Build & Deployment

**Platform:** Vercel
**Build command:** `node build.js`
**Output directory:** `dist/`

### What `build.js` does:
1. Reads each `.html` source file.
2. Replaces `__FIREBASE_*__` and `__CLAUDE_API_KEY__` placeholders with Vercel env vars.
3. Strips the `<script src="firebase-config.js"></script>` tag.
4. Rewrites all internal `.html` links to clean URL slugs (e.g. `AcademicCalendar.html` → `/academic-calendar`).
5. Writes output files as `<slug>.html` into `dist/`.
6. Copies `auth-guard.js`, `schools_compact.js`, `images/`, and `Sections/` into `dist/`.
7. Generates `dist/_redirects` for Vercel routing.

### Vercel environment variables required:
```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
CLAUDE_API_KEY           ← for AIPrompts.html
```

### Clean URL mapping (selected):
| Source file                      | Deployed at                    |
|----------------------------------|--------------------------------|
| `index.html`                     | `/`                            |
| `announcements.html`             | `/announcements`               |
| `AcademicCalendar.html`          | `/academic-calendar`           |
| `CambridgeExamsDashboard.html`   | `/cambridge-exams`             |
| `EASE-I-AssessmentResults.html`  | `/ease-1`                      |
| `EASE-II-AssessmentResults.html` | `/ease-2`                      |
| `EASE-III-AssessmentResults.html`| `/ease-3`                      |
| `weekly-checklist.html`          | `/weekly-checklist`            |
| `cambridge-calendar.html`        | `/cambridge-calendar`          |
| `teacher-kpi-evaluation.html`    | `/teacher-kpi-evaluation`      |
| `CurriculumMap.html`             | `/curriculum-map`              |
| `CompetencyFramework.html`       | `/competency-framework`        |
| `LearningPath.html`              | `/learning-path`               |
| `MyPortfolio.html`               | `/my-portfolio`                |
| `MyCertificates.html`            | `/my-certificates`             |
| `MyInduction.html`               | `/my-induction`                |
| `ObservationEntry.html`          | `/observation-entry`           |
| `TeamInduction.html`             | `/team-induction`              |
| *(see build.js for full list)*   |                                |

---

## Key Files

| File                         | Purpose                                                    |
|------------------------------|------------------------------------------------------------|
| `auth-guard.js`              | Auth + role gate for protected pages (modular SDK v10)     |
| `build.js`                   | Vercel build script — `cleanUrls` map, placeholder replacement, link rewriting, copies assets |
| `partials/navbar.html`       | Shared navbar HTML partial (injected via `navbar-loader.js`) |
| `partials/navbar-loader.js`  | Exposes `window.__loadAcademicNavbar(activeKey, {user, profile})` — fetches `/partials/navbar.html` (absolute path required for clean URL routes), injects into `#navbarMount`, calls `initNavbar()` |
| `partials/navbar.js`         | Navbar init (`initNavbar()`), badge logic (`setupNavBadges()`), feedback button |
| `firebase-config.js`         | Local dev config (gitignored)                              |
| `firebase-config.example.js` | Template for firebase-config.js                            |
| ~~`firestore.rules`~~        | DELETED — rules live in `CentralHub/firestore.rules` only   |
| `vercel.json`                | Vercel deployment config (cleanUrls, build cmd)            |
| `dist/`                      | Build output (not committed)                               |
| `schools_compact.js`         | Minified school data used by school-picker components      |

---

## Navbar Loading Pattern

Academic Hub uses a different navbar pattern from Teachers Hub — a dedicated loader script rather than an inline fetch:

```html
<!-- In <body>, after #navbarMount div: -->
<script src="partials/navbar-loader.js"></script>
```

Then in `authReady`:
```js
document.addEventListener('authReady', ({ detail: { user, profile } }) => {
  window.__loadAcademicNavbar('active-key', { user, profile });
  // ... rest of page init
});
```

`active-key` is the slug of the current page (e.g. `'competency-framework'`, `'learning-path'`) — used to highlight the active nav item.

**Critical:** `navbar-loader.js` fetches `/partials/navbar.html` with an **absolute path** (not `partials/navbar.html`). The relative path fails from clean URL routes like `/competency-framework`. Never change this to a relative path.

The navbar mounts into `<div id="navbarMount"></div>` — do NOT use `navbar-container` (that is the Teachers Hub ID).

---

## Cambridge Leadership Competency Framework — AH track (2026-05-03 / 2026-05-04)

Eduversal runs three independent rating systems across the network. AH owns the **leadership** competency track. See the root CLAUDE.md "Three Rating Systems" section for the full architecture.

**AH-specific:**
- Leadership taxonomy: 6 domains (`evsi/cial/pdpc/ewsc/eao/fcep`) × 24 competencies, grounded in Cambridge **School Leader** Standards 2023 (25/25 standards covered) + Permendiknas No.16/2007.
- 4 pages: `CompetencyFramework.html`, `LearningPath.html`, `MyPortfolio.html`, `MyCertificates.html`. The MyCertificates legacy domain ID bug (same class as TH 1.1) was fixed 2026-05-03 — `dl/co/sd/sp/ac/so` → canonical `evsi/cial/pdpc/ewsc/eao/fcep`.
- `MyPortfolio.html` Storage upload was a no-op (same bug as TH had); fixed 2026-05-03. Uploads now go to `competency_evidence/academic/{uid}/{timestamp}_{filename}` (≤25 MB cap, deployed in `Central Hub/storage.rules`).
- `LearningPath.html` lazy-fetches per-(comp, level) content from `competency_framework/leaders/levels/`. Admin override pipeline (`content_overrides_academic`) HTML-sanitises on save AND on render.
- `teacher-kpi-evaluation.html` and `TeacherAppraisalEntry.html` render mor `CTS X.Y` chips on every KPI / appraisal item. Click → `cambridge-crossref.js` runtime opens a popover showing every sibling artefact across the 3 systems.
- `TeacherAppraisalEntry.html` rubric modal subtitle now leads with Cambridge refs (`Cambridge Teacher Standards 2023 — CTS 3.6, CTS 4.4`) followed by `theory_basis`.
- Per-school pilot enrolment: `index.html` reads `partner_schools/{schoolId}.enabled_systems[]` on `authReady` and hides cards by `data-theme` (kpi / appraisal / leadership-framework). Admin and HQ users bypass.

**Bonus historical fix shipped alongside Phase 2-4:**
- `MyObservations.html` (the read view) was deliberately left untouched in chip wiring because it only renders aggregate composite scores, not per-item rows.

---

## Important Conventions

- **No npm bundler.** All JS runs directly in the browser via CDN imports (React via CDN is allowed for dashboard pages).
- **Always use modular SDK v10.** Never use the compat namespace (`firebase.firestore()` etc.).
- **`createdAt` not `timestamp`** for all Firestore timestamp fields.
- **Never commit `firebase-config.js`.** It is in `.gitignore`.
- **Auth guard goes first.** On protected pages, `auth-guard.js` must be the first `<script type="module">` tag so it hides the body before any content renders.
- **Use `authReady` event** to gate all Firestore reads in page scripts — never call `window.db` before the event fires.
- **`central_documents` collection, not `documents`** — the `documents` name was used by CentralHub's old schema and was renamed to avoid conflicts.
- **Navbar mount ID is `navbarMount`** (not `navbar-container` which is the TH pattern). Never mix them up.
- **Template literals with `.html` extensions are NOT rewritten by `rewriteLinks()`** — only `href="..."` and `window.location.href = "..."` string literals are rewritten. Any link built with a template literal (e.g. `` `/learning-path?comp=${id}` ``) must use the absolute clean URL path directly, not the source filename.
- **Competency framework IDs** — domain IDs: `evsi`, `cial`, `pdpc`, `ewsc`, `eao`, `fcep`. Competency IDs: `evsi-1..4`, `cial-1..4` etc. Grounded in Cambridge School Leader Standards 2019 + PSEL 2015 + Permendiknas No.13/2007. Do NOT revert to old IDs (`dl-1`, `co-1` etc.).
- **Nav-edit toolbar uses the `hidden` HTML attribute, not CSS-only display.** Both `#btnNavEdit` and `#navEditBar` in `partials/navbar.html` ship with `hidden` so non-admins (e.g. `academic_user`) never see the "Drag to reorder…" bar — even if `nav-edit-simple.js` fails to load. The shared `shared-design/nav-edit-simple.js` removes/re-adds the attribute when admin is detected (`btnNavEdit`) and on `enterEditMode`/`exitEditMode` (`navEditBar`). Reason: a CSS-only `display:none` rule lives inside the JS-injected `<style>` block — if the import 404s, the bar renders full-width with naked text. Past incident, fixed 2026-05-03. How to apply: any new edit-mode chrome added to the navbar partial must also default to `hidden`.
