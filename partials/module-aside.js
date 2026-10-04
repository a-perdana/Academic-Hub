/* ================================================================
   module-aside.js — the glass panel on the right of a module page's
   hero (2026-10-04). It shows where the page sits in the Academic
   Quality Ecosystem: the six-step cycle with this page's step lit, the
   module's question, and a link to the module guide — the same panel
   idea as the network map on the AH home page (Stitch design).

   Added only when the hero has no KPI strip (that strip owns the lower
   edge) and the page belongs to a module. build.js injects this file on
   every page; styles live in modules.css section 7.

   Names, questions and guides mirror HOME_FAMILIES in index.html and the
   live "Start Here" documents — change them in both places.
   ================================================================ */
(function () {
  const CYCLE = ['Define', 'Prepare', 'Measure', 'Reflect', 'Improve', 'Grow'];
  const M = {
    curriculum:          { step: 1, name: 'Curriculum', q: 'What is taught?', guide: '/curriculum-guide' },
    induction:           { step: 2, name: 'Induction', q: 'Who delivers it?', guide: '/induction-guide' },
    ease:                { step: 3, name: 'EASE', q: 'What is understood?', guide: '/ease-guide' },
    student_learning:    { step: 4, name: 'Student Learning', q: 'How does the student see, reflect on, and communicate their learning?', guide: '/student-learning-guide', layer: true },
    appraisal:           { step: 5, name: 'Appraisal', q: 'What is working, and what should improve?', guide: '/appraisal-guide' },
    career_growth:       { step: 6, name: 'Career Growth', q: 'How do people grow into approved roles?', guide: '/career-growth-guide' },
    teaching_learning:   { kick: 'Cross-cutting area', name: 'Teaching & Learning', q: 'Classroom practice across the network, supporting all five modules.', guide: '/teaching-learning-guide' },
    digital_citizenship: { kick: 'Cross-cutting area', name: 'Digital Citizenship & AI', q: 'Integrity, responsible AI use, devices and AI competency, across all five modules.', guide: '/digital-citizenship-guide' },
    quality_ecosystem:   { kick: 'Governance', name: 'Quality Ecosystem & Standards', q: 'Which document governs each area, and how the five modules fit together.', guide: '/quality-ecosystem-guide' },
    academic_insights:   { kick: 'Analysis', name: 'Academic Insights', q: 'Evidence about your school: results and analysis, against the partner-school average.', guide: '/cambridge-results', linkText: 'Cambridge Results' },
    school_workspace:    { kick: 'Your school', name: 'School workspace', q: 'Everyday leadership work for your school: this week, events, meetings and decisions.', guide: '/weekly-checklist', linkText: 'this week’s checklist' },
    hub:                 { kick: 'Academic Hub', name: 'Academic Hub', q: 'Your school’s academic quality system: five modules and one cycle, in one place.', guide: '/', linkText: 'the home page' },
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function build() {
    const mod = document.body && document.body.dataset.module;
    const f = M[mod];
    const inner = document.querySelector('.page-hero .page-hero__inner');
    if (!f || !inner || inner.querySelector('.page-hero__aside')) return;
    // A hero that already carries its own widget (a progress ring, buttons)
    // keeps its right side: only text, icon and the KPI strip may sit beside
    // the panel. When the KPI strip is showing, CSS hides the panel (the strip
    // owns the hero's lower edge); a strip still hidden for lack of data
    // leaves the panel in place.
    if ([...inner.children].some((el) => !el.matches('.page-hero__text, .page-hero__icon, .page-hero__kpis'))) return;
    const here = location.pathname.replace(/\/+$/, '');
    const cycle = f.step
      ? `<div class="pha-cycle" aria-hidden="true">${CYCLE.map((v, i) => `<span class="pha-step${i + 1 === f.step ? ' is-here' : ''}"><i>${i + 1}</i>${v}</span>`).join('')}</div>`
      : `<div class="pha-cycle" aria-hidden="true">${CYCLE.map((v, i) => `<span class="pha-step"><i>${i + 1}</i>${v}</span>`).join('')}</div>`;
    const top = f.step
      ? `<span>Academic Quality Ecosystem</span><b>${f.layer ? 'Layer' : 'Step ' + f.step + ' of 6'}</b>`
      : `<span>Academic Quality Ecosystem</span><b>${esc(f.kick)}</b>`;
    const link = here === f.guide ? '' :
      `<a class="pha-link" href="${f.guide}">Open ${esc(f.linkText || f.name + ' guide')} <span aria-hidden="true">→</span></a>`;
    const aside = document.createElement('aside');
    aside.className = 'page-hero__aside';
    aside.setAttribute('aria-label', `${f.name} in the Academic Quality Ecosystem`);
    aside.innerHTML = `<div class="pha-top">${top}</div>${cycle}<div class="pha-name">${esc(f.name)}</div><p class="pha-q">${esc(f.q)}</p>${link}`;
    const kpis = inner.querySelector('.page-hero__kpis');
    if (kpis) inner.insertBefore(aside, kpis); else inner.appendChild(aside);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
