# Academic Hub — Architecture Reference

## What This App Is

Partner school **leadership** portal. Audiences: **Foundation Representative**, **School Principal**, **Academic Coordinator**, **Cambridge Coordinator**.

Key features: EASE assessment dashboards (4 cycles/year), Cambridge exam performance tracking, school appraisal + teacher appraisal entry + calibration, school KPI / accreditation / network audit dashboards, academic standards framework, leadership competency framework + 4-page CPD set, weekly checklists per sub-role, satisfaction surveys (student/staff/parent), induction (Year-1 mentees + team view).

**Vanilla HTML/CSS/JS** (no React, no bundler — React-via-CDN is allowed for individual dashboard pages). Pages load Firebase via CDN.

**Deployment:** Vercel (`dist/`).

---

## Shared Firebase Backend

**Project:** `centralhub-8727b` (shared with CH / TH / Research Hub).

**SDK:** Firebase modular v10.7.1, CDN imports. NEVER use compat (`firebase.firestore()`).

**Config pattern:**
- `firebase-config.js` (gitignored) sets `window.ENV.*`
- Local dev: HTML pages include `<script src="firebase-config.js">` + inline fallback
- Production: `build.js` substitutes `__FIREBASE_*__` placeholders + strips the script tag

**Firestore rules:** maintained exclusively in `Central Hub/firestore.rules`. NEVER create one here. Deploy from CH:
```bash
cd "Central Hub" && firebase deploy --only firestore:rules --project centralhub-8727b
```

For full schema + collection catalogue, see [`docs/FIRESTORE_SCHEMA.md`](../docs/FIRESTORE_SCHEMA.md) and the root `CLAUDE.md`. This file documents only AH-touching aspects.

---

## Auth Pattern

Every protected page loads `auth-guard.js` as a module FIRST:
```html
<script type="module" src="auth-guard.js"></script>
```

Steps (in order):
1. Hide `document.body`
2. Init Firebase (guarded against double-init)
3. `onAuthStateChanged` — no user → `login.html`
4. Fetch / create profile (auto-assigns `role_academichub: 'academic_user'` + `approval_status_academichub: 'pending'`). On first sign-in, `applyStaffBridge()` looks up `staff/{...}` by `emailLower`: a match prefills `schoolId` / `school` / `displayName` / `phone` / `title` and back-links the staff row; no match auto-creates a staff row keyed by `sha1(emailLower).slice(0,20)` with `source:'auth-guard-autocreate'`. Bridging is best-effort (try/catch/warn), never blocks signup. **Helper is shared with CH + TH — keep all three in sync.** See root CLAUDE.md "Staff Directory & ↔ users Bridge".
5. **Domain check** — Google SSO email must be in `window.ACADEMIC_ALLOWED_DOMAINS` (15 entries). Email/password bypasses.
6. **Role check** — `role_academichub ∈ ['academic_admin','academic_user']`
7. **Name prompt** if `displayName` missing
8. **Profile prompt** — `promptForAhProfile()` runs until both `schoolId` AND `ah_sub_roles[]` are set (`ahProfileComplete()` checks both). School auto-defaults from `partner_schools.domain` matching the email; multi-school domains (`semesta.sch.id`) leave the picker empty + show an amber hint. Runs BEFORE the approval check so central_admin sees the user's declared school + roles when reviewing pending signups.
9. **Approval check** — non-admin not yet `approved` → `waiting.html` (polls every 30s)
10. **Page-access gate** + UI gating (see below)
11. Expose globals · dispatch `authReady`

**Globals after `authReady`:** `window.firebaseApp`, `window.auth`, `window.db`, `window.storage`, `window.currentUser`, `window.userProfile`.

`index.html` is the LOGIN page (no auth-guard). `waiting.html` polls every 30s.

---

## Role System

| Field | Values |
|---|---|
| `role_academichub` | `'academic_user'` (default) \| `'academic_admin'` |
| `ah_sub_roles[]` | `'foundation_representative'`, `'school_principal'`, `'academic_coordinator'`, `'cambridge_coordinator'` |
| `approval_status_academichub` | `'pending'` (default) \| `'approved'` \| `'rejected'` |

**isAdmin pattern:**
```js
const isAdmin = profile?.role_academichub === 'academic_admin';
```

**Sub-roles control:**
- `weekly-checklist.html` tab visibility (one tab per sub-role; admin sees all)
- `index.html` dashboard category filter (categories with `visible_to[]` filtered to matching sub-roles)
- Per-page access via `page_access_config/{slug}` (see below)

`weekly-checklist.html` Firestore IDs: `${ACADEMIC_YEAR}_w${week}_${currentPlatform}` where `currentPlatform ∈ {foundation_representative, school_principal, academic_coordinator}`.

---

## Page-Access Gating

`auth-guard.js` enforces three layers:

1. **Per-navigation gate (Step 5b)** — direct URL access redirects to `/?denied=<slug>` (yellow toast) if user's `ah_sub_roles[]` doesn't intersect `cfg.visible_to[]`. Bypass: admin · auth-flow pages · pages with no config doc · `visible_to: []`.
2. **UI gating (Step 7b)** via `applyPageAccessGating()`:
   - Bulk-fetches every AH `page_access_config` doc once. Cache key `pac:__all__` (5 min TTL).
   - desktop navbar items: `[data-nav-key]`
   - dashboard cards: `<a class="card" href]` (slug from href via `slugFromHref()`)
   - **mobile drawer items**: `[data-mobile-nav-key]` (different attribute because mobile clones don't carry `data-nav-key`)
   - empty `.nav-dropdown-wrap` / `.nav-dd-col` / `.mob-nav-section` get `data-pa-hidden="1"` too
   - empty `.ah-mobile-section-header` siblings (mobile drawer doesn't wrap groups in containers — auth-guard walks forward from each header until next header/divider; if every interactive sibling is hidden, hide the header)
   - `MutationObserver` re-runs gating on async navbar mount or new card insertion
3. **Auto-cards** (in `index.html` `renderOtherAvailablePages()`) — for accessible pages without a hand-crafted card, builds minimal cards INTO the Uncategorized grid (de-duped against existing `<a class="card" href]`). See Dashboard Pattern below.

**Bypass list** (`PAGE_ACCESS_BYPASS`): `''`, `'index'`, `'login'`, `'waiting'`.

**Slug consistency:** every `data-nav-key` in `partials/navbar.html` AND every `key:` in `partials/navbar-loader.js`'s `NAV_ITEMS` must exactly match a `pageKey` in `page_access_config`.

**Active-key passing:** Pages call `window.__loadAcademicNavbar('<slug>', { user, profile })` for active-link highlight.

**Debugging:** `window.__paGate()` re-runs gating. `sessionStorage.removeItem('pac:__all__')` to force a fresh fetch.

---

## Firestore Collections (AH-touching)

| Collection | Purpose | Write |
|---|---|---|
| `users/{uid}` | Profile. **`schoolId` is required for AH users** — set at first login by profile prompt (auto-defaults from `partner_schools.domain`). Drives `isAHUserAtSameSchool()` rule. | owner / central_admin |
| `partner_schools/{schoolId}` | School directory + `domain` (drives auto-default) + `classes/{classId}` subcollection | central_admin |
| `staff` · `announcements` · `central_documents` | CH-managed | central_admin |
| `topics/{topicId}` + `replies/` | Message board | any auth user |
| `competency_framework/leaders` (+ `levels/` subcoll) | AH leadership track of 3-track Cambridge competency. 6 domains (`evsi/cial/pdpc/ewsc/eao/fcep`) × 24 competencies, grounded in Cambridge **School Leader** Standards 2023 (25/25). Lazy-fetched in `LearningPath.html`. | central_admin |
| `content_overrides_academic/{compId}_{lvl}` | Admin reading override. **HTML allowlist sanitiser on save AND render** (same as TH). | academic_admin |
| `user_competencies/{uid}` | Coordinator progress in `earned_academic` (TH under `earned`; CH specialist under `earned_central`) | owner |
| `competency_evidence/{docId}` | AH submissions with `platform: 'academic'`. Storage: `competency_evidence/academic/{uid}/{ts}_{filename}` (≤25 MB). | owner create / central_admin review |
| `competency_certificates/{certId}` | Filtered `where('platform','==','academic')` | central_admin |
| `cambridge_crossref/index` | Single CTS aggregator. Read by `cambridge-crossref.js` runtime (build-injected) when CTS chips are clicked. | central_admin |
| `ah_categories/{catId}` | Dashboard category collection. Each: `{name, color, cardIds[], visible_to[], hidden_for_users, pilot_systems[], order, createdAt}`. **Meta doc** `_uncategorized_settings_` (`isMeta:true`, `order:-1`, `visible_to_users:bool`) gates the Uncategorized accordion for non-admins. Non-admin path subscribes via direct `onSnapshot(doc(..., '_uncategorized_settings_'))` (the meta doc lacks `visible_to`, so the open-to-all + sub-role queries miss it). `pilot_systems[]` (added 2026-05-10) optional — admin tags a collection with one or more of `kpi`/`appraisal`/`competency`/`induction` from the Manage Cards modal so the entire collection (header included) hides when ANY of those systems is opted out at the user's school. Untagged (`[]`) collections fall back to per-card pilot gating only; admins always bypass. | academic_admin / central_admin |
| `page_access_config/{slug}` | Per-page sub-role visibility. Cache key `pac:__all__`. | central_admin via CH `/page-access` |
| `nav_config/academichub` | Admin-editable navbar config (label/order/hidden). Read on `authReady` by `partials/navbar-loader.js`; editor in shared `/nav-edit-simple.js`. Shape: `{platform, items:[{key,label,hidden}], updatedAt}`. | academic_admin |
| `feedbacks/{fbId}` | Single canonical feedback collection. AH writers stamp `__src: 'academichub'`. | any auth (create); central_admin (read/update/delete) |
| `weekly_progress/{docId}` | Doc id `${uid}_${ACADEMIC_YEAR}_w${week}_${currentPlatform}`. **Always include `schoolId`** for the `isAHUserAtSameSchool()` rule helper. | owner; AH leadership read same-school |
| `teacher_kpi_submissions/{uid}_{periodId}` | Read by AH evaluators on `teacher-kpi-evaluation.html`. Sub-role evaluators restricted by rule to `schoolId == userProfile.schoolId`; page query adds `where('schoolId','==',mySchool)` for sub-role users. Composite index `(periodId, schoolId)` required. | teacher writes own; AH evaluator flips status fields only |
| `induction_assignments/{menteeUid}` | Read by `MyInduction.html` (own induction) + `TeamInduction.html` (school principal team view, `where('schoolId','==',mySchool)`). Charter NN3+NN4 enforced. | central_admin |
| `induction_progress/{uid}_{taskId}` | Principal mentee writes from `MyInduction.html`; school leader writes Q4-formal-eval tasks from `ObservationEntry.html`. | owner / mentor / school-leader |
| `induction_observations/{obsId}` | Includes Q4 formal evaluation written from `ObservationEntry.html` (`?type=formal_evaluation`). **Charter NN1: never feeds appraisal.** | observer (school leader) |
| `induction_journal/{entryId}` | Principal's weekly reflection. **Charter NN2: HQ never reads named entries.** | owner (mentee) |
| `induction_pulses/{pulseId}` | Weekly mood pulse. Read aggregated by `TeamInduction.html` for school-pulse roll-up + 2-consecutive-low alarm. | owner; school leader read-roll-up |
| `induction_programs/{programId}` | 3 handbook templates. Read by `MyInduction.html`. | central_admin via seed only |
| `principal_observations/{obsId}` | 8-foci E/D/N rubric written by `principal-observation-entry`. Submitted = immutable. Audience: principal (own), observer (own), same-school AH leadership, central_admin. | Foundation Rep (observer) |
| `principal_annual_appraisals/{principalUid}_{academicYear}` | F1-F5 + F_LEAD weighted composite + A-F band. Composite + percent + band persisted alongside raw scores. Submitted = immutable. | Foundation Rep (appraiser) |
| `principal_360_cycles/{cycleId}` · `principal_360_responses/{respId}` · `principal_360_aggregates/{cycleId}` | Anonymous 360 cycle. Responses persist NO respondent uid (NN5). Aggregates threshold-gated (5+ per cohort). Cloud Function planned. | various — see root CLAUDE.md |
| `principal_coaching_sessions/{principalUid}_{YYYY-MM-DD}` | Mentor session form lives in CH; AH `/principal-coaching-view` reads-only. Foundation Reps **excluded at rule level** for coaching confidentiality. | mentor (HQ Director — CH) |
| `students/{uid}` | Read by AH `/student-roster` for own-school view. Update: status flips on approve/graduate/reject/reactivate. **Distinct from `users/{uid}`** — `students` is the Students-Hub user collection. Phase 1.5 (2026-05-10). | school_principal / academic_coordinator (status flips); central_admin (any field) |
| `chapter_test_attempts/{attemptId}` | Read by AH `/school-assessment` (`where schoolId == own school`) for school-wide mastery roll-up. Phase 1.5. | TH teacher / admin (writes); AH leadership read |

**Timestamp:** `createdAt` (serverTimestamp). NEVER `timestamp`.

---

## Build & Deployment

`node build.js` → `dist/`. What it does:
1. Reads source `.html` files
2. Substitutes `__FIREBASE_*__` + `__CLAUDE_API_KEY__` placeholders
3. Strips `<script src="firebase-config.js">`
4. Rewrites internal `.html` href → clean URLs (`AcademicCalendar.html` → `/academic-calendar`). **NB:** `rewriteLinks()` only handles `href="..."` and `window.location.href = "..."` string literals — template literals like `` `/learning-path?comp=${id}` `` must use the absolute clean URL path directly.
5. Writes `dist/<slug>.html`
6. Copies `auth-guard.js`, `schools_compact.js`, `images/`, `Sections/`
7. Generates `dist/_redirects` for Vercel routing

**Vercel env vars:** `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `CLAUDE_API_KEY` (for AIPrompts.html).

---

## Pages

**Auth + landing:**
- `index.html` (`/`) — LOGIN page, no auth-guard
- `login.html` / `waiting.html` — auth flow

**Dashboards (legacy hardcoded — Assessments dropdown):**
- EASE: `EASE-I/II/III-AssessmentResults` (`/ease-1/2/3`), `A-EASE-I-AssessmentResults` (`/a-ease-1`), `EASE-Analytics` (`/ease-analytics`), `EASE-Archive` (`/ease-archive`)
- Cambridge: `CambridgeExamsDashboard` (`/cambridge-exams`), `CambridgePathwaySimulator` (`/cambridge-pathway`), `CambridgeSchoolQuality` (`/cambridge-school-quality`)
- School Quality: `SchoolAppraisalsDashboard` (`/school-appraisals`), `SchoolSelfAppraisal` (`/school-self-appraisal`), `SchoolPerformanceKPI` (`/school-performance-kpi`), `AccreditationDashboard` (`/accreditation-dashboard`), `SchoolNetworkAudit` (`/network-audit`), `PartnerSchoolsPerformance` (`/partner-schools`), `IslamicSchoolsPerformance` (`/islamic-schools`)
- Surveys: `surveys` (My Surveys landing), `StudentSatisfactionSurvey` / `StaffSatisfactionSurvey` / `ParentSatisfactionSurvey`
- `RaporPendidikan2025` (`/rapor-pendidikan-2025`), `AIPrompts` (`/ai-prompts`)

**School (Curriculum + Appraisal):**
- Curriculum: `AcademicStandards` (`/academic-standards`), `CurriculumMap` (`/curriculum-map`), `SyllabusCoverage` (`/syllabus-coverage`)
- Appraisal: `TeacherAppraisalEntry` (`/teacher-appraisal-entry`), `TeacherWalkthroughEntry` (`/teacher-walkthrough-entry`), `TeacherAppraisalCalibration` (`/appraiser-calibration`), `MyObservations` (`/my-observations`), `teacher-kpi-evaluation` (`/teacher-kpi-evaluation`)

**My Hub (Communications + CPD + Induction & Reference):**
- Communications: `AcademicCalendar` (`/academic-calendar`), `announcements`, `messageboard` (`/message-board`), `documents`
- CPD: `CompetencyFramework` (`/competency-framework`), `LearningPath` (`/learning-path`), `MyPortfolio` (`/my-portfolio`), `MyCertificates` (`/my-certificates`)
- Induction: `MyInduction` (`/my-induction`), `TeamInduction` (`/team-induction`), `ObservationEntry` (`/observation-entry`), `handbook`
- **References (2026-05-09):** `references` — narrowed AH variant (3 tabs · 16 docs). Fetches references-data cross-origin from CH (CORS-open).
- **Principal Evaluation (Phase-2, 2026-05-09):**
  - `principal-observation-entry` — 8-foci E/D/N rubric form (FR-only). Source: `principal-observation-rubric.json`. Doc id auto. Submitted = immutable.
  - `principal-appraisal-entry` — F1-F5 + F_LEAD weighted appraisal (FR-only). Source: `principal-appraisal-framework-v1.json`. Doc id `{principalUid}_{academicYear}`. Composite + A-F band auto-computed. Submitted = immutable.
  - `principal-360-respond?cycle=X&cohort=staff|parent|student` — anonymous respondent form. Open to any auth user (cycle gating in rule). Idempotency via localStorage hint.
  - `principal-360-results?cycle=X` — aggregate read-only view (SP + FR). Threshold-gated (5+ respondents/cohort). Cloud Function `aggregatePrincipal360Responses` planned.
  - `principal-coaching-view` — coachee read-only view of own coaching sessions (school_principal only). Mentor session form lives in CH (`/principal-coaching-session`).
- **Students Hub bridge (Phase 1.5, 2026-05-10):**
  - `student-roster` (source: `StudentRoster.html`) — School-side counterpart to TH `/student-approvals`. Status filter (active / pending_approval / rejected / graduated / needs_class) + grade filter + search. Approve / Graduate / Remove / Reactivate actions write to `students/{uid}.status`. visible_to=[school_principal, academic_coordinator] (admin bypasses). Reads `students where schoolId == own school`.
  - `school-assessment` (source: `SchoolAssessment.html`) — Network-uniform chapter-mastery roll-up across every Year 7-8 class. Per-class cards (avg score, pass rate, intervention count). Subject + grade filters. Pulls live `chapter_test_attempts where schoolId == own school`. Read-only for all leadership sub-roles (FR / SP / AC / CC).
- Reference: `weekly-checklist`, `cambridge-calendar`, `cambridge-standards`, `library`, `academic-services`

---

## Dashboard Pattern (`index.html`)

Single accordion-based dashboard. Cards = static `<a class="card">` (image + content + stats). Categories managed by admin from the dashboard itself.

- **Category collection:** `ah_categories`. Each: `{ name, color, cardIds[], visible_to[], hidden_for_users, pilot_systems[], order, createdAt }` (`pilot_systems[]` added 2026-05-10 — see collection table above for hybrid-gating semantics)
- **Admin actions per category** (only when `body.is-admin`): move-up · move-down · manage-cards · **eye-toggle** (`hidden_for_users` boolean) · rename · delete
- **Uncategorized accordion** = hand-crafted cards not assigned to a category PLUS auto-cards (merged into the same grid). The eye-toggle on the Uncategorized header writes meta doc `_uncategorized_settings_` (carries `isMeta:true`, `order:-1`, `visible_to_users` flag). **Non-admin path subscribes to the meta doc DIRECTLY by ID** because the open-to-all (`visible_to == []`) and sub-role (`array-contains-any`) queries miss it (no `visible_to` field on the meta doc).
- **Visual cue** for admins on hidden sections: `body.is-admin .category-section.is-hidden-for-users > .category-header` gets `opacity: 0.55` + appended " (hidden)" in red.
- **Auto-cards** are generated by `renderOtherAvailablePages(db, profile)` BEFORE `initCategorySystem` so `getAllCards()`'s first read picks them up. Each auto-card carries `class="card card-auto"` + `data-theme="auto"` + `data-card-id="auto_<slug>"` so admins can sweep them into a category via the Manage Cards modal. Visual treatment scoped to `.card.card-auto` only — hand-crafted cards untouched.
  - Auto-card template: 110px gradient `card-image-strip` header (radial-light + bottom-shadow decoration) + slug-mapped emoji `card-image-glyph` (induction→🌱, library→📚, calendar→🗓️, etc.) + brand mor+cyan accent + 2 `card-stats` (Page · Type / sub-role visibility count)
  - SKIP slugs: `''`, `'index'`, `'login'`, `'waiting'`, `'observation-entry'` (URL-params subpage), `'academic-standards-public'` (public)

**Pilot enrolment filter:** non-admin AH user with a `schoolId` → reads `partner_schools/{schoolId}.enabled_systems[]` and hides cards by `data-theme` (kpi / appraisal / leadership-framework). Missing field = all enabled. Empty = all disabled. Admin + HQ users (no schoolId) bypass.

---

## Profile Dropdown — Read-Only

Profile dropdown shows display name + email + role badge + **read-only chips** for school + sub-roles + Sign Out button.

**No inline edit form.** School / sub-role mutations only via CH `/console`. Past incident (2026-05-05): inline edit form let `academic_user` self-promote to `school_principal` and rewrite `schoolId`, breaking `isAHUserAtSameSchool()` rule. Removed.

---

## Navbar

3 dropdowns, all in `partials/navbar.html`:

- **Dashboards** (4 columns, `nav-dropdown-panel--wide`): EASE · Cambridge · School Quality · Surveys (sub-headers via `nav-dd-col-header`)
- **School** (2 columns, `--wide`): Curriculum (3) · Appraisal (5)
- **My Hub** (3 columns, `--xwide` 720px min-width): Communications (4) · CPD (4) · Induction & Reference (8)

Mobile drawer is built dynamically by `partials/navbar-loader.js` from `NAV_ITEMS` (the same source as the loader injects). Each item carries `data-mobile-nav-key="<slug>"`. Mobile section headers (`ah-mobile-section-header`) are sibling elements (not parent containers); auth-guard walks forward from each header until the next header/divider to detect "all hidden" state.

**Loading pattern:**
```html
<!-- In <body>, after #navbarMount div: -->
<script src="partials/navbar-loader.js"></script>
```

```js
document.addEventListener('authReady', ({ detail: { user, profile } }) => {
  window.__loadAcademicNavbar('active-slug', { user, profile });
});
```

`navbar-loader.js` fetches `/partials/navbar.html` with an **absolute path**. Relative path fails from clean URL routes. Never change.

Mount target is `#navbarMount` (NOT `navbar-container` — that's TH).

---

## Cambridge Leadership Competency Framework — AH track

The `leaders` track of the 3-track Cambridge competency system (root CLAUDE.md "Three Rating Systems" has the full architecture).

**AH-specific:**
- 6 domains (`evsi/cial/pdpc/ewsc/eao/fcep`) × 24 competencies. Grounded in Cambridge **School Leader** Standards 2023 (25/25 covered) + Permendiknas No.16/2007.
- 4 pages: `CompetencyFramework`, `LearningPath`, `MyPortfolio`, `MyCertificates`
- `LearningPath.html` lazy-fetches per-(comp, level) content from `competency_framework/leaders/levels/` on modal open
- `teacher-kpi-evaluation.html` + `TeacherAppraisalEntry.html` render mor `CTS X.Y` chips on every KPI / appraisal item → click opens cross-ref popover
- `TeacherAppraisalEntry.html` rubric modal subtitle leads with Cambridge refs followed by `theory_basis`
- Per-school pilot enrolment via `partner_schools.enabled_systems[]` (admin + HQ bypass)

**Don't reintroduce:**
- Domain IDs are canonical: `evsi/cial/pdpc/ewsc/eao/fcep`. Legacy `dl/co/sd/sp/ac/so` gone everywhere.
- `MyPortfolio.html` Storage upload was a no-op (uploaded `null`); fixed — uploads now go to `competency_evidence/academic/{uid}/{ts}_{filename}` (≤25 MB).
- Admin override (`LearningPath.html` → `content_overrides_academic`) HTML allowlist on save AND render — strict tag list, all attributes stripped.

---

## Key Files

| File | Purpose |
|---|---|
| `auth-guard.js` | Auth + role gate, profile prompt, page-access UI gating, mobile drawer gating, Uncategorized meta doc subscription |
| `build.js` | Vercel build — `cleanUrls` map, link rewriting, asset copy |
| `partials/navbar.html` | Shared navbar HTML (3 dropdowns, columned) |
| `partials/navbar-loader.js` | Exposes `window.__loadAcademicNavbar()`. Builds mobile drawer from `NAV_ITEMS`. CSS for column panels (`.nav-dropdown-panel--wide` 480px, `--xwide` 720px). |
| `partials/navbar.js` | `initNavbar()`, `setupNavBadges()`, feedback button |
| `firebase-config.js` / `.example.js` | Local dev config (gitignored) / template |
| `vercel.json` | Vercel config (cleanUrls, build cmd) |
| `dist/` | Build output (not committed) |
| `schools_compact.js` | Minified school data used by school-picker components |

---

## Important Conventions

- **Modular SDK v10 only.** Never compat (`firebase.firestore()`).
- **`createdAt` not `timestamp`.**
- **Never commit `firebase-config.js`** — gitignored.
- **Auth guard goes first** (first `<script type="module">`).
- **Use `authReady`** — never call `window.db` before the event fires.
- **`central_documents` not `documents`** — collection rename.
- **Navbar mount ID is `navbarMount`** — NOT `navbar-container` (TH pattern). Don't mix up.
- **Template literal `.html` is NOT rewritten by `rewriteLinks()`** — only `href="..."` and `window.location.href = "..."` string literals. Use absolute clean URL paths directly in template literals.
- **Competency domain IDs canonical:** `evsi/cial/pdpc/ewsc/eao/fcep`. Legacy `dl/co/sd/sp/ac/so` gone.
- **Nav-edit toolbar uses `hidden` HTML attribute, not CSS-only display.** `#btnNavEdit` and `#navEditBar` ship with `hidden` so non-admins never see them — even if `nav-edit-simple.js` 404s.
- **Profile dropdown is read-only** for school + sub-roles. Mutations only via CH `/console`. NEVER re-add an inline edit form — past incident let `academic_user` self-promote.
- **Mobile drawer page-access gating uses `[data-mobile-nav-key]`.** Drawer items are clones with a different attribute name. Auth-guard handles both selectors.
- **Mobile section headers are siblings, not containers.** Auth-guard walks forward from each `.ah-mobile-section-header` to detect "all hidden" state.
- **Reserved Firestore doc IDs** — `__name__`-style (double-underscore start AND end). Use `_uncategorized_settings_`, NOT `__uncategorized_settings__`.
- **Firestore `orderBy` query silently drops docs missing the field.** Meta doc must include `order: -1` to be picked up by the admin `orderBy('order','asc')` listener. Non-admin path uses direct doc subscription (the visible_to == [] / array-contains-any queries also miss field-less docs).
- **Decorative full-screen background layers must `pointer-events: none`.** `bg-animation` already has it (z-index:-1 was already keeping it behind content); inherit through children.
- **AH `auth-guard.js` dispatches `authReady` on `document`, NOT `window`.** Listening on the wrong target makes the listener never fire — page renders the empty shell because the init code that wires UI / starts onSnapshot / fetches data never runs, and the failure is **silent** (no errors, no toast, no network rejection). When porting code from Students Hub (which dispatches on `window`), always swap the listener target to `document.addEventListener('authReady', …)`. CH does the same as AH; TH does the same as AH; SH is the odd one out. Easy to miss because both forms are valid JS — only one matches the dispatcher. See CH CLAUDE.md Common Mistake #13 for the past-incident detail.
