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

// â”€â”€ Firebase & API placeholder replacements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const replacements = {
  __FIREBASE_API_KEY__:            process.env.FIREBASE_API_KEY            || "",
  __FIREBASE_AUTH_DOMAIN__:        process.env.FIREBASE_AUTH_DOMAIN        || "",
  __FIREBASE_PROJECT_ID__:         process.env.FIREBASE_PROJECT_ID         || "",
  __FIREBASE_STORAGE_BUCKET__:     process.env.FIREBASE_STORAGE_BUCKET     || "",
  __FIREBASE_MESSAGING_SENDER_ID__:process.env.FIREBASE_MESSAGING_SENDER_ID|| "",
  __FIREBASE_APP_ID__:             process.env.FIREBASE_APP_ID             || "",
  __CLAUDE_API_KEY__:              process.env.CLAUDE_API_KEY              || "",
};

// â”€â”€ Clean URL mapping: filename â†’ slug â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// slug "" means root (/), all others become /slug
const cleanUrls = {
  "index.html":                      "",
  "announcements.html":              "announcements",
  "surveys.html":                    "surveys",
  "library.html":                    "library",
  "documents.html":                  "documents",
  "messageboard.html":               "message-board",
  "AcademicCalendar.html":           "academic-calendar",
  "AcademicStandards.html":          "academic-standards",
  "CambridgeExamsDashboard.html":    "cambridge-exams",
  "CambridgePathwaySimulator.html":  "cambridge-pathway",
  "IslamicSchoolsPerformance.html":  "islamic-schools",
  "PartnerSchoolsPerformance.html":  "partner-schools",
  "SchoolAppraisalsDashboard.html":  "school-appraisals",
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
    // window.location.href = "filename.html"  (auth-guard.js)
    result = result.replace(
      new RegExp(`(window\\.location\\.href\\s*=\\s*")(\\./)?(${escaped})(")`, "g"),
      `$1${target}$4`
    );
  }
  return result;
}

// â”€â”€ Create dist directory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist");
}

// â”€â”€ HTML files to process â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const htmlFiles = [
  "index.html",
  "announcements.html",
  "surveys.html",
  "library.html",
  "documents.html",
  "messageboard.html",
  "AcademicStandards.html",
  "CambridgeExamsDashboard.html",
  "CambridgePathwaySimulator.html",
  "IslamicSchoolsPerformance.html",
  "PartnerSchoolsPerformance.html",
  "SchoolAppraisalsDashboard.html",
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
];

htmlFiles.forEach((file) => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // 1. Replace Firebase placeholders
  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replace(new RegExp(placeholder, "g"), value);
  }

  // Remove local-dev-only firebase-config.js script tag (not needed in dist)
  html = html.replace(/<script src="firebase-config\.js"><\/script>\n?/g, "");

  // 2. Rewrite internal links to clean URLs
  html = rewriteLinks(html);

  // 3. Write to dist using the slug name so Vercel cleanUrls serves the
  //    correct path (e.g. cambridge-pathway.html â†’ /cambridge-pathway).
  //    Files whose slug matches their base name (e.g. announcements.html)
  //    are unaffected; index.html stays index.html.
  const slug = cleanUrls[file];
  const destName = slug === "" ? "index.html" : `${slug}.html`;
  fs.writeFileSync(path.join("dist", destName), html);
  console.log(`Processed: ${file} â†’ dist/${destName}`);
});

// â”€â”€ auth-guard.js â€” process link rewrites too â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Copy static assets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Generate Netlify _redirects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Files are now written as <slug>.html so Netlify/Vercel cleanUrls
// serves /slug automatically.  We still add explicit 200 rewrites for
// robustness and 301 redirects from original filenames for back-compat.
let redirects = "# â”€â”€ Clean URL routing (generated by build.js) â”€â”€\n\n";
redirects    += "# Serve clean URLs (slug.html lives in dist)\n";
for (const [filename, slug] of Object.entries(cleanUrls)) {
  if (slug === "") continue;
  redirects += `/${slug}  /${slug}.html  200\n`;
}
redirects += "\n# Redirect original filenames â†’ clean URLs (301)\n";
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

// â”€â”€ Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log("\nBuild completed successfully!");
console.log("Environment variables:");
Object.keys(replacements).forEach((key) => {
  const value = replacements[key];
  console.log(`  ${key}: ${value ? "[SET]" : "[NOT SET]"}`);
});


