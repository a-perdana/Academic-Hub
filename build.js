const fs = require("fs");
const path = require("path");

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.readdirSync(srcDir, { withFileTypes: true }).forEach((entry) => {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// -- Firebase & API placeholder replacements
const replacements = {
  __FIREBASE_API_KEY__:            process.env.FIREBASE_API_KEY            || "",
  __FIREBASE_AUTH_DOMAIN__:        process.env.FIREBASE_AUTH_DOMAIN        || "",
  __FIREBASE_PROJECT_ID__:         process.env.FIREBASE_PROJECT_ID         || "",
  __FIREBASE_STORAGE_BUCKET__:     process.env.FIREBASE_STORAGE_BUCKET     || "",
  __FIREBASE_MESSAGING_SENDER_ID__:process.env.FIREBASE_MESSAGING_SENDER_ID|| "",
  __FIREBASE_APP_ID__:             process.env.FIREBASE_APP_ID             || "",
  __CLAUDE_API_KEY__:              process.env.CLAUDE_API_KEY              || "",
  __RAILWAY_API_URL__:             process.env.RAILWAY_API_URL             || "",
  __RAILWAY_API_TOKEN__:           process.env.RAILWAY_API_TOKEN           || "",
};

// -- Clean URL mapping: filename -> slug
// slug "" means root (/), all others become /slug
const cleanUrls = {
  "index.html":                      "",
  "login.html":                      "login",
  "waiting.html":                    "waiting",
  "announcements.html":              "announcements",
  "surveys.html":                    "surveys",
  "library.html":                    "library",
  "documents.html":                  "documents",
  "messageboard.html":               "message-board",
  "academic-calendar.html":          "academic-calendar",
  "SchoolEvents.html":               "school-events",
  "AcademicStandards.html":          "academic-standards",
  "AcademicStandardsDynamic.html":   "academic-standards-public",
  "CambridgeExamsDashboard.html":    "cambridge-exams",
  "CambridgePathwaySimulator.html":  "cambridge-pathway",
  "IslamicSchoolsPerformance.html":  "islamic-schools",
  "PartnerSchoolsPerformance.html":  "partner-schools",
  "SchoolAppraisalsDashboard.html":  "school-appraisals",
  "SchoolSelfAppraisal.html":        "school-self-appraisal",
  "StaffSatisfactionSurvey.html":    "staff-survey",
  "StudentSatisfactionSurvey.html":  "student-survey",
  "ParentSatisfactionSurvey.html":   "parent-survey",
  "EASE-I-AssessmentResults.html":   "ease-1",
  "EASE-II-AssessmentResults.html":  "ease-2",
  "EASE-III-AssessmentResults.html": "ease-3",
  "A-EASE-I-AssessmentResults.html": "a-ease-1",
  "EASE-Archive.html":               "ease-archive",
  "AccreditationDashboard.html":     "accreditation-dashboard",
  "AIPrompts.html":                  "ai-prompts",
  "SchoolPerformanceKPI.html":       "school-performance-kpi",
  "EASE-Analytics.html":             "ease-analytics",
  "SchoolNetworkAudit.html":         "network-audit",
  "CambridgeSchoolQuality.html":     "cambridge-school-quality",
  "RaporPendidikan2025.html":        "rapor-pendidikan-2025",
  "weekly-checklist.html":           "weekly-checklist",
  "cambridge-calendar.html":         "cambridge-calendar",
  "cambridge-standards.html":        "cambridge-standards",
  "CurriculumMap.html":             "curriculum-map",
  "teacher-kpi-evaluation.html":    "teacher-kpi-evaluation",
  "ai-validate-teacher-assessments.html": "ai-validate-teacher-assessments",
  "ai-maturity-self-assessment.html":     "ai-maturity-self-assessment",
  "TeacherAppraisalEntry.html":     "teacher-appraisal-entry",
  "TeacherWalkthroughEntry.html":   "teacher-walkthrough-entry",
  "MyObservations.html":            "my-observations",
  "CompetencyFramework.html":       "competency-framework",
  "LearningPath.html":              "learning-path",
  "MyPortfolio.html":               "my-portfolio",
  "MyCertificates.html":            "my-certificates",
  "MyInduction.html":               "my-induction",
  "ReadMeMyHub.html":               "my-hub-read-me",
  "welcome.html":                   "welcome",
  "ObservationEntry.html":          "observation-entry",
  "principal-observation-entry.html": "principal-observation-entry",
  "principal-appraisal-entry.html":   "principal-appraisal-entry",
  "principal-360-respond.html":       "principal-360-respond",
  "principal-360-results.html":       "principal-360-results",
  "principal-coaching-view.html":     "principal-coaching-view",
  "principal-evaluation.html":        "principal-evaluation",
  "TeamInduction.html":             "team-induction",
  "handbook.html":                  "handbook",
  "references.html":                "references",
  "TeacherAppraisalCalibration.html": "appraiser-calibration",
  "academic-services.html":          "academic-services",
  "SyllabusCoverage.html":           "syllabus-coverage",
  "StudentRoster.html":              "student-roster",
  "SchoolAssessment.html":           "school-assessment",
  "settings.html":                   "settings",
  // School Leadership Workspace (2026-05-21) — 7 new pages
  "school-leadership-read-me.html":           "school-leadership-read-me",
  "school-leadership-operational-guide.html": "school-leadership-operational-guide",
  "school-leadership-meetings.html":          "school-leadership-meetings",
  "school-leadership-decisions.html":         "school-leadership-decisions",
  "school-leadership-directory.html":         "school-leadership-directory",
  "school-artifacts.html":                    "school-artifacts",
  "school-activities.html":                   "school-activities",
};

// Rewrite all internal .html links to clean URLs inside a built file
function rewriteLinks(content) {
  let result = content;
  for (const [filename, slug] of Object.entries(cleanUrls)) {
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const target  = slug === "" ? "/" : `/${slug}`;
    // href="filename.html" and href="./filename.html"
    result = result.replace(
      new RegExp(`(href=")(\\./)?(${escaped})(")`, "g"),
      `$1${target}$4`
    );
    // window.location.href = "filename.html" or '...' (with optional ?query)
    result = result.replace(
      new RegExp(`(window\\.location\\.href\\s*=\\s*['"])(\\./)?(${escaped})(\\?[^'"]*)?(['"])`, "g"),
      `$1${target}$4$5`
    );
    // window.location.replace("filename.html") or ('...') (with optional ?query)
    result = result.replace(
      new RegExp(`(window\\.location\\.replace\\s*\\(\\s*['"])(\\./)?(${escaped})(\\?[^'"]*)?(['"])`, "g"),
      `$1${target}$4$5`
    );
  }
  return result;
}

// -- Create dist directory
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist");
}

// -- HTML files to process
// Dashboard pages live in dashboards/ for source-code organisation (22 files,
// 2026-05-22). URLs / slugs / page_access_config doc IDs UNCHANGED — only the
// source path differs. cleanUrls + BASE_CSS_SKIP are keyed by basename so the
// folder prefix is invisible to the build pipeline downstream.
const htmlFiles = [
  "index.html",
  "login.html",
  "waiting.html",
  "announcements.html",
  "surveys.html",
  "library.html",
  "documents.html",
  "messageboard.html",
  "dashboards/AcademicStandards.html",
  "dashboards/AcademicStandardsDynamic.html",
  "dashboards/CambridgeExamsDashboard.html",
  "dashboards/CambridgePathwaySimulator.html",
  "dashboards/IslamicSchoolsPerformance.html",
  "dashboards/PartnerSchoolsPerformance.html",
  "dashboards/SchoolAppraisalsDashboard.html",
  "dashboards/SchoolSelfAppraisal.html",
  "dashboards/StaffSatisfactionSurvey.html",
  "dashboards/StudentSatisfactionSurvey.html",
  "dashboards/ParentSatisfactionSurvey.html",
  "dashboards/EASE-Archive.html",
  "dashboards/EASE-I-AssessmentResults.html",
  "dashboards/EASE-II-AssessmentResults.html",
  "dashboards/EASE-III-AssessmentResults.html",
  "dashboards/A-EASE-I-AssessmentResults.html",
  "academic-calendar.html",
  "SchoolEvents.html",
  "dashboards/AccreditationDashboard.html",
  "dashboards/AIPrompts.html",
  "dashboards/SchoolPerformanceKPI.html",
  "dashboards/EASE-Analytics.html",
  "dashboards/SchoolNetworkAudit.html",
  "dashboards/CambridgeSchoolQuality.html",
  "dashboards/RaporPendidikan2025.html",
  "weekly-checklist.html",
  "CurriculumMap.html",
  "teacher-kpi-evaluation.html",
  "ai-validate-teacher-assessments.html",
  "ai-maturity-self-assessment.html",
  "TeacherAppraisalEntry.html",
  "TeacherWalkthroughEntry.html",
  "MyObservations.html",
  "cambridge-calendar.html",
  "cambridge-standards.html",
  "CompetencyFramework.html",
  "LearningPath.html",
  "MyPortfolio.html",
  "MyCertificates.html",
  "MyInduction.html",
  "ReadMeMyHub.html",
  "welcome.html",
  "ObservationEntry.html",
  "principal-observation-entry.html",
  "principal-appraisal-entry.html",
  "principal-360-respond.html",
  "principal-360-results.html",
  "principal-coaching-view.html",
  "principal-evaluation.html",
  "TeamInduction.html",
  "handbook.html",
  "references.html",
  "TeacherAppraisalCalibration.html",
  "academic-services.html",
  "SyllabusCoverage.html",
  "StudentRoster.html",
  "SchoolAssessment.html",
  "settings.html",
  // School Leadership Workspace (2026-05-21)
  "school-leadership-read-me.html",
  "school-leadership-operational-guide.html",
  "school-leadership-meetings.html",
  "school-leadership-decisions.html",
  "school-leadership-directory.html",
  "school-artifacts.html",
  "school-activities.html",
];

// Pages skipped from base.css injection (login/waiting are auth-flow,
// no navbar/no auth guard — keep them self-contained).
const BASE_CSS_SKIP = new Set(["login.html", "waiting.html"]);

htmlFiles.forEach((file) => {
  if (!fs.existsSync(file)) return;
  // Source path may carry a folder prefix (e.g. "dashboards/Foo.html").
  // cleanUrls + BASE_CSS_SKIP are keyed by basename — strip the prefix
  // for those lookups while keeping `file` itself for fs.readFileSync.
  const fileBase = path.basename(file);
  let html = fs.readFileSync(file, "utf8");

  // 1. Replace Firebase placeholders
  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replace(new RegExp(placeholder, "g"), value);
  }

  // Remove local-dev-only firebase-config.js script tag (not needed in dist)
  html = html.replace(/<script src="firebase-config\.js"><\/script>\n?/g, "");

  // 1b. Inject /base.css before the first <style> tag (or before </head>).
  //     Absolute path — relative paths fail from clean URL routes like
  //     /school-performance-kpi. Skip if already linked or auth-flow page.
  if (!BASE_CSS_SKIP.has(fileBase) && !html.includes('href="/base.css"') && !html.includes("href='/base.css'")) {
    const baseLink = '  <link rel="stylesheet" href="/base.css">\n';
    if (/<style[\s>]/.test(html)) {
      html = html.replace(/(\s*<style[\s>])/, `\n${baseLink}$1`);
    } else if (html.includes("</head>")) {
      html = html.replace("</head>", `${baseLink}</head>`);
    }
  }

  // 2. Rewrite internal links to clean URLs
  html = rewriteLinks(html);

  // Phase 4 — inject /cambridge-crossref.js once per page (defer; auto-
  // bootstraps from DOM scan). Skip auth-flow and pages without chips.
  // Use lastIndexOf so we target the actual document </body> and not a
  // </body> sitting inside an inline JS template literal.
  //
  // Idempotency check: look for the actual <script src="..."> tag, not
  // a plain substring of the filename. Mirrors the CH 1200d81 fix —
  // CSS/JS comments referencing the filename fool a loose substring
  // check, leaving chips rendered but unclickable.
  if (fileBase !== 'index.html' && fileBase !== 'login.html' && fileBase !== 'waiting.html' &&
      !/<script\s[^>]*src=["']\/?cambridge-crossref\.js["']/.test(html)) {
    const closeIdx = html.lastIndexOf('</body>');
    if (closeIdx >= 0) {
      html = html.slice(0, closeIdx)
        + '<script src="/cambridge-crossref.js" defer></script>\n'
        + html.slice(closeIdx);
    }
  }

  // 3. Write to dist using the slug name so Vercel cleanUrls serves the
  //    correct path (e.g. cambridge-pathway.html -> /cambridge-pathway).
  //    Files whose slug matches their base name (e.g. announcements.html)
  //    are unaffected; index.html stays index.html.
  const slug = cleanUrls[fileBase];
  const destName = slug === "" ? "index.html" : `${slug}.html`;
  fs.writeFileSync(path.join("dist", destName), html);
  console.log(`Processed: ${file} -> dist/${destName}`);
});

// -- auth-guard.js -- process link rewrites too
if (fs.existsSync("auth-guard.js")) {
  let js = fs.readFileSync("auth-guard.js", "utf8");
  js = rewriteLinks(js);
  fs.writeFileSync("dist/auth-guard.js", js);
  console.log("Processed: auth-guard.js");
}
if (fs.existsSync("schools_compact.js")) {
  fs.copyFileSync("schools_compact.js", "dist/schools_compact.js");
  console.log("Copied: schools_compact.js");
}
if (fs.existsSync("cambridge-crossref.js")) {
  fs.copyFileSync("cambridge-crossref.js", "dist/cambridge-crossref.js");
  console.log("Copied: cambridge-crossref.js");
}

// Read-only Academic Calendar viewer — single source of truth lives in
// monorepo /shared-design/. Prefer local committed copy; fall back to
// monorepo when developing from the parent directory. Mirrors the
// nav-edit-simple.js + cambridge-crossref.js distribution pattern.
// Run `node scripts/design/sync-tokens.js --apply` from monorepo root
// when the master changes.
const localAcadCal  = "academic-calendar-readonly.js";
const sharedAcadCal = path.join("..", "shared-design", "academic-calendar-readonly.js");
const acadCalSrc    = fs.existsSync(localAcadCal) ? localAcadCal
                    : (fs.existsSync(sharedAcadCal) ? sharedAcadCal : null);
if (acadCalSrc) {
  fs.copyFileSync(acadCalSrc, "dist/academic-calendar-readonly.js");
  console.log(`Copied: academic-calendar-readonly.js (from ${acadCalSrc})`);
} else {
  console.warn("WARNING: academic-calendar-readonly.js not found in local or shared-design/");
}

// Indonesian statutory references — fetched at runtime by
// cambridge-crossref.js when the user clicks a PIGP / SKL / PMD chip.
// Local-first / monorepo-fallback (Vercel only checks out the AH repo so
// the monorepo's docs/research is unreachable from there — local mirror
// under resources/research/permendiknas/ has to exist for production).
const researchSrcLocal    = path.join(__dirname, "resources", "research", "permendiknas");
const researchSrcMonorepo = path.join("..", "docs", "research", "permendiknas");
const researchSrcDir      = fs.existsSync(researchSrcLocal) ? researchSrcLocal : researchSrcMonorepo;
const researchDestDir     = path.join("dist", "research", "permendiknas");
if (fs.existsSync(researchSrcDir)) {
  fs.mkdirSync(researchDestDir, { recursive: true });
  ["no-27-2010-pigp.json", "no-10-2025-skl.json", "no-16-2007.json"].forEach(name => {
    // Try chosen src first, then the other path as per-file fallback
    const tryPaths = [path.join(researchSrcDir, name)];
    if (researchSrcDir !== researchSrcMonorepo) tryPaths.push(path.join(researchSrcMonorepo, name));
    if (researchSrcDir !== researchSrcLocal)    tryPaths.push(path.join(researchSrcLocal, name));
    const src = tryPaths.find(p => fs.existsSync(p));
    if (src) {
      fs.copyFileSync(src, path.join(researchDestDir, name));
      console.log(`Copied: dist/research/permendiknas/${name}`);
    } else {
      console.warn(`WARNING: ${name} not found in docs/research/permendiknas/ or local mirror`);
    }
  });
}

// Cambridge research archive (CSLS chip popovers in CompetencyFramework
// + AppraisalEntry) — same local-first / monorepo-fallback pattern.
const cambridgeSrcLocal    = path.join(__dirname, "resources", "research", "cambridge");
const cambridgeSrcMonorepo = path.join("..", "docs", "research", "cambridge");
const cambridgeSrcDir      = fs.existsSync(cambridgeSrcLocal) ? cambridgeSrcLocal : cambridgeSrcMonorepo;
const cambridgeDestDir     = path.join("dist", "research", "cambridge");
if (fs.existsSync(cambridgeSrcDir)) {
  fs.mkdirSync(cambridgeDestDir, { recursive: true });
  ["school-leader-standards-2023.json"].forEach(name => {
    const tryPaths = [path.join(cambridgeSrcDir, name)];
    if (cambridgeSrcDir !== cambridgeSrcMonorepo) tryPaths.push(path.join(cambridgeSrcMonorepo, name));
    if (cambridgeSrcDir !== cambridgeSrcLocal)    tryPaths.push(path.join(cambridgeSrcLocal, name));
    const src = tryPaths.find(p => fs.existsSync(p));
    if (src) {
      fs.copyFileSync(src, path.join(cambridgeDestDir, name));
      console.log(`Copied: dist/research/cambridge/${name}`);
    } else {
      console.warn(`WARNING: ${name} not found in docs/research/cambridge/ or local mirror`);
    }
  });
}

// AICF reference layer (chip popovers + reader pages). Same pattern.
const aicfSrcLocal    = path.join(__dirname, "resources", "research", "eduversal", "ai-competency-framework");
const aicfSrcMonorepo = path.join("..", "docs", "research", "eduversal", "ai-competency-framework");
const aicfSrcDir      = fs.existsSync(aicfSrcLocal) ? aicfSrcLocal : aicfSrcMonorepo;
const aicfDestDir     = path.join("dist", "research", "eduversal", "ai-competency-framework");
if (fs.existsSync(aicfSrcDir)) {
  fs.mkdirSync(aicfDestDir, { recursive: true });
  const manifestSrc = path.join(aicfSrcDir, "manifest.json");
  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, path.join(aicfDestDir, "manifest.json"));
    console.log(`Copied: dist/research/eduversal/ai-competency-framework/manifest.json`);
  }
  const aicfReferenceSrc  = path.join(aicfSrcDir,  "reference");
  const aicfReferenceDest = path.join(aicfDestDir, "reference");
  if (fs.existsSync(aicfReferenceSrc)) {
    fs.mkdirSync(aicfReferenceDest, { recursive: true });
    fs.readdirSync(aicfReferenceSrc).filter(n => n.endsWith(".json")).forEach(name => {
      fs.copyFileSync(path.join(aicfReferenceSrc, name), path.join(aicfReferenceDest, name));
      console.log(`Copied: dist/research/eduversal/ai-competency-framework/reference/${name}`);
    });
  } else {
    console.warn(`WARNING: reference/ subdir not found in ${aicfSrcDir} — AICF chip popovers will degrade gracefully.`);
  }
}

// Eduversal Academic Standards manifest + blurbs — fetched at runtime by
// cambridge-crossref.js when the user clicks an ES chip. Full section
// JSONs are hosted by CH (/references reader); AH only needs the lookup
// files for popover content.
//
// Prefer the local AH copy (committed under resources/research/eduversal/
// academic-standards/) because Vercel only checks out the AH repo — the
// monorepo's docs/research folder isn't available at build time.
// Fall back to the monorepo path when running build locally from the
// parent directory. Same local-first/monorepo-fallback pattern used by
// TH's cambridge research-archive block.
//
// Source-of-truth lives in monorepo docs/research/eduversal/academic-
// standards/ (built by scripts/eduversal-standards/build-academic-
// standards.js --apply). Re-run that script and then re-copy into
// resources/research/eduversal/ after every change.
const eduStdSrcLocal    = path.join(__dirname, "resources", "research", "eduversal", "academic-standards");
const eduStdSrcMonorepo = path.join("..", "docs", "research", "eduversal", "academic-standards");
const eduStdSrcDir      = fs.existsSync(eduStdSrcLocal) ? eduStdSrcLocal : eduStdSrcMonorepo;
const eduStdDestDir     = path.join("dist", "research", "eduversal", "academic-standards");
if (fs.existsSync(eduStdSrcDir)) {
  fs.mkdirSync(eduStdDestDir, { recursive: true });
  ["manifest.json", "search-blurbs.json"].forEach(name => {
    const src = path.join(eduStdSrcDir, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(eduStdDestDir, name));
      console.log(`Copied: dist/research/eduversal/academic-standards/${name}`);
    } else {
      console.warn(`WARNING: ${name} not found in ${eduStdSrcDir} — run build-academic-standards.js --apply first.`);
    }
  });
}
// References & Standards data — AH does NOT mirror references-data
// locally. The /references viewer fetches from
// https://centralhub.eduversal.org/references-data/* (CORS-open) so
// we keep one source of truth in CH. See references.html REF_DATA_BASE.
//
// (Earlier revisions of this file copied 20 JSONs from monorepo-root
// docs/ + this hub's resources/. That works locally but breaks on
// Vercel because the Academic-Hub repo is deployed standalone and has
// no monorepo root.)

if (fs.existsSync("favicon.svg")) {
  fs.copyFileSync("favicon.svg", "dist/favicon.svg");
  console.log("Copied: favicon.svg");
}
if (fs.existsSync("tokens.css")) {
  fs.copyFileSync("tokens.css", "dist/tokens.css");
  console.log("Copied: tokens.css");
}
if (fs.existsSync("base.css")) {
  fs.copyFileSync("base.css", "dist/base.css");
  console.log("Copied: base.css");
}

// Handbook reader — shared CSS + JS modules for the /handbook page (browser
// + reader modes). Source-of-truth lives in monorepo /shared-design/ and is
// synced into this repo via `npm run sync:handbook`. Same local-first /
// monorepo-fallback pattern as nav-edit-simple.js + cambridge-crossref.js.
["handbook-reader.css", "handbook-reader.js"].forEach(name => {
  const local  = name;
  const shared = path.join("..", "shared-design", name);
  const src    = fs.existsSync(local) ? local : (fs.existsSync(shared) ? shared : null);
  if (src) {
    fs.copyFileSync(src, path.join("dist", name));
    console.log(`Copied: ${src} -> dist/${name}`);
  } else {
    console.warn(`WARNING: ${name} not found locally or in shared-design/`);
  }
});

// Simple nav editor module — local copy lives in this repo (committed) so
// Vercel builds don't depend on the monorepo-root /shared-design/ folder.
// Source of truth is monorepo-root /shared-design/nav-edit-simple.js;
// keep in sync via `node scripts/design/sync-tokens.js --apply`.
const localNavEdit  = "nav-edit-simple.js";
const sharedNavEdit = path.join("..", "shared-design", "nav-edit-simple.js");
const navEditSrc    = fs.existsSync(localNavEdit) ? localNavEdit
                    : (fs.existsSync(sharedNavEdit) ? sharedNavEdit : null);
if (navEditSrc) {
  fs.copyFileSync(navEditSrc, "dist/nav-edit-simple.js");
  console.log(`Copied: ${navEditSrc} -> dist/nav-edit-simple.js`);
} else {
  console.warn("WARNING: nav-edit-simple.js not found locally or in shared-design/");
}

// references-viewer schema-aware modal renderer — same local-then-shared
// fallback pattern as nav-edit-simple. Loaded by references.html for the
// JSON document modal.
["references-viewer.js", "references-viewer.css"].forEach(name => {
  const local  = name;
  const shared = path.join("..", "shared-design", name);
  const src    = fs.existsSync(local) ? local : (fs.existsSync(shared) ? shared : null);
  if (src) {
    fs.copyFileSync(src, path.join("dist", name));
    console.log(`Copied: ${src} -> dist/${name}`);
  } else {
    console.warn(`WARNING: ${name} not found locally or in shared-design/`);
  }
});

// competency-framework.css — 3-hub byte-identical CSS partial (cf-legend
// popover + domain-takeaways accordion). Source-of-truth lives in
// monorepo-root /shared-design/competency-framework.css. Same local-then-
// shared fallback as references-viewer. Linked from CompetencyFramework.html
// at dist root (build.js's link rewrite maps PascalCase to kebab-case URL,
// so the dist file lands at /competency-framework.css and the HTML links it).
{
  const name   = "competency-framework.css";
  const local  = name;
  const shared = path.join("..", "shared-design", name);
  const src    = fs.existsSync(local) ? local : (fs.existsSync(shared) ? shared : null);
  if (src) {
    fs.copyFileSync(src, path.join("dist", name));
    console.log(`Copied: ${src} -> dist/${name}`);
  } else {
    console.warn(`WARNING: ${name} not found locally or in shared-design/`);
  }
}

// -- Copy static assets
if (fs.existsSync("images")) {
  copyDirRecursive("images", "dist/images");
  console.log("Copied: images/");
}
if (fs.existsSync("Sections")) {
  copyDirRecursive("Sections", "dist/Sections");
  console.log("Copied: Sections/");
}
if (fs.existsSync("partials")) {
  copyDirRecursive("partials", "dist/partials");
  console.log("Copied: partials/");
}
if (fs.existsSync("resources")) {
  copyDirRecursive("resources", "dist/resources");
  console.log("Copied: resources/");
}

// -- Generate Netlify _redirects
// Files are now written as <slug>.html so Netlify/Vercel cleanUrls
// serves /slug automatically.  We still add explicit 200 rewrites for
// robustness and 301 redirects from original filenames for back-compat.
let redirects = '# -- Clean URL routing (generated by build.js) --\n\n';
redirects    += "# Serve clean URLs (slug.html lives in dist)\n";
for (const [filename, slug] of Object.entries(cleanUrls)) {
  if (slug === "") continue;
  redirects += `/${slug}  /${slug}.html  200\n`;
}
redirects += "\n# Redirect original filenames -> clean URLs (301)\n";
for (const [filename, slug] of Object.entries(cleanUrls)) {
  if (slug === "") continue;
  // Only emit a redirect when the original name differs from slug.html
  if (filename !== `${slug}.html`) {
    redirects += `/${filename}  /${slug}  301\n`;
    // Also catch .html-extension variant of the original name
  }
}
fs.writeFileSync(path.join("dist", "_redirects"), redirects);
console.log("Generated: _redirects");

// -- Summary
console.log("\nBuild completed successfully!");
console.log("Environment variables:");
Object.keys(replacements).forEach((key) => {
  const value = replacements[key];
  console.log(`  ${key}: ${value ? "[SET]" : "[NOT SET]"}`);
});


