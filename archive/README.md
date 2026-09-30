# Academic Hub — archived pages

Retired page designs, kept for reference. **Nothing in this folder is built or
deployed** — `build.js` lists its HTML files explicitly and none of these are on
that list.

| File | What it was | Retired |
|---|---|---|
| `home-v1.html` | The v1 dashboard (`index.html`): dark gradient background, floating orbs, BAN-S/M celebration banner, admin-managed accordion "collections" of large image cards. | 2026-09-30, replaced by the v2 home organised around the Academic Quality Ecosystem. |
| `dashboards/*.html` (15 files) | The AY 2025-26 dashboards with hardcoded data: EASE I/II/III + A-EASE I results, EASE Analytics, EASE Archive, Cambridge School Quality, School Appraisals Dashboard, Accreditation 2025, Partner Schools, Islamic Schools, Student/Staff/Parent Satisfaction Survey, Rapor Pendidikan 2025. | 2026-09-30 — removed from build.js, the AH/CH/TH navbars, the home page and page_access_config (backup: `scripts/dashboard/backups/page-access-ah-2025-26-dashboards-2026-09-30.json`). |
| `kpi/SchoolPerformanceKPI.html`, `kpi/teacher-kpi-evaluation.html` | The School Performance KPI scorecard (`/school-performance-kpi`, with a network average and school ranking) and the Teacher KPI Evaluation page (`/teacher-kpi-evaluation`, a second teacher score from `teacher_kpi_submissions`). | 2026-10-01 — the live pack has no standalone KPI system: "Quantitative operational indicators are embedded within the Appraisal Suite rather than operated as a separate standalone KPI system" (Academic Services Start Here); legacy KPI trackers "should not be used as a second scoring system" (Appraisal Suite: Quality Assurance & Performance Architecture 26-27). Removed from build.js, the AH navbar (desktop + mobile), the home TOOLS registry (slugs added to AUTO_SKIP), auth-guard DASHBOARD_SLUGS / PILOT_SLUG_MAP and in-page links. The Firestore data (`kpi_*`, `teacher_kpi_*`) is untouched. |

`home-v1.html` still reads the live `ah_categories` collection, so opening it
today shows the v2 module sections in the old style. The v1 category documents
themselves were backed up before the v2 seed — see
`scripts/dashboard/backups/ah-categories-v1-2026-09-30.json`.
