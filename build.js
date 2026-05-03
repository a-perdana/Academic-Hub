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
  "AcademicCalendar.html":           "academic-calendar",
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
  "CurriculumMap.html":             "curriculum-map",
  "teacher-kpi-evaluation.html":    "teacher-kpi-evaluation",
  "TeacherAppraisalEntry.html":     "teacher-appraisal-entry",
  "TeacherWalkthroughEntry.html":   "teacher-walkthrough-entry",
  "MyObservations.html":            "my-observations",
  "CompetencyFramework.html":       "competency-framework",
  "LearningPath.html":              "learning-path",
  "MyPortfolio.html":               "my-portfolio",
  "MyCertificates.html":            "my-certificates",
  "TeacherAppraisalCalibration.html": "appraiser-calibration",
  "academic-services.html":          "academic-services",
  "SyllabusCoverage.html":           "syllabus-coverage",
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
const htmlFiles = [
  "index.html",
  "login.html",
  "waiting.html",
  "announcements.html",
  "surveys.html",
  "library.html",
  "documents.html",
  "messageboard.html",
  "AcademicStandards.html",
  "AcademicStandardsDynamic.html",
  "CambridgeExamsDashboard.html",
  "CambridgePathwaySimulator.html",
  "IslamicSchoolsPerformance.html",
  "PartnerSchoolsPerformance.html",
  "SchoolAppraisalsDashboard.html",
  "SchoolSelfAppraisal.html",
  "StaffSatisfactionSurvey.html",
  "StudentSatisfactionSurvey.html",
  "ParentSatisfactionSurvey.html",
  "EASE-Archive.html",
  "EASE-I-AssessmentResults.html",
  "EASE-II-AssessmentResults.html",
  "EASE-III-AssessmentResults.html",
  "A-EASE-I-AssessmentResults.html",
  "AcademicCalendar.html",
  "AccreditationDashboard.html",
  "AIPrompts.html",
  "SchoolPerformanceKPI.html",
  "EASE-Analytics.html",
  "SchoolNetworkAudit.html",
  "CambridgeSchoolQuality.html",
  "RaporPendidikan2025.html",
  "weekly-checklist.html",
  "CurriculumMap.html",
  "teacher-kpi-evaluation.html",
  "TeacherAppraisalEntry.html",
  "TeacherWalkthroughEntry.html",
  "MyObservations.html",
  "cambridge-calendar.html",
  "CompetencyFramework.html",
  "LearningPath.html",
  "MyPortfolio.html",
  "MyCertificates.html",
  "TeacherAppraisalCalibration.html",
  "academic-services.html",
  "SyllabusCoverage.html",
];

// Pages skipped from base.css injection (login/waiting are auth-flow,
// no navbar/no auth guard — keep them self-contained).
const BASE_CSS_SKIP = new Set(["login.html", "waiting.html"]);

htmlFiles.forEach((file) => {
  if (!fs.existsSync(file)) return;
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
  if (!BASE_CSS_SKIP.has(file) && !html.includes('href="/base.css"') && !html.includes("href='/base.css'")) {
    const baseLink = '  <link rel="stylesheet" href="/base.css">\n';
    if (/<style[\s>]/.test(html)) {
      html = html.replace(/(\s*<style[\s>])/, `\n${baseLink}$1`);
    } else if (html.includes("</head>")) {
      html = html.replace("</head>", `${baseLink}</head>`);
    }
  }

  // 2. Rewrite internal links to clean URLs
  html = rewriteLinks(html);

  // 3. Write to dist using the slug name so Vercel cleanUrls serves the
  //    correct path (e.g. cambridge-pathway.html -> /cambridge-pathway).
  //    Files whose slug matches their base name (e.g. announcements.html)
  //    are unaffected; index.html stays index.html.
  const slug = cleanUrls[file];
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


