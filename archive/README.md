# Academic Hub — archived pages

Retired page designs, kept for reference. **Nothing in this folder is built or
deployed** — `build.js` lists its HTML files explicitly and none of these are on
that list.

| File | What it was | Retired |
|---|---|---|
| `home-v1.html` | The v1 dashboard (`index.html`): dark gradient background, floating orbs, BAN-S/M celebration banner, admin-managed accordion "collections" of large image cards. | 2026-09-30, replaced by the v2 home organised around the Academic Quality Ecosystem. |
| `dashboards/*.html` (15 files) | The AY 2025-26 dashboards with hardcoded data: EASE I/II/III + A-EASE I results, EASE Analytics, EASE Archive, Cambridge School Quality, School Appraisals Dashboard, Accreditation 2025, Partner Schools, Islamic Schools, Student/Staff/Parent Satisfaction Survey, Rapor Pendidikan 2025. | 2026-09-30 — removed from build.js, the AH/CH/TH navbars, the home page and page_access_config (backup: `scripts/dashboard/backups/page-access-ah-2025-26-dashboards-2026-09-30.json`). |

`home-v1.html` still reads the live `ah_categories` collection, so opening it
today shows the v2 module sections in the old style. The v1 category documents
themselves were backed up before the v2 seed — see
`scripts/dashboard/backups/ah-categories-v1-2026-09-30.json`.
