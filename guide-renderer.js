/* ================================================================
   guide-renderer.js — renders an Academic Hub module guide from
   resources/guides/<module>.json into the page (2026-10-01).

   A guide is a VISUAL SUMMARY of the live Academic Services Google Docs.
   It sits at the Quick Reference level of the Policy Source-of-Truth
   Register: it never creates or removes a rule, every block names the
   document it summarises, and where a guide and a live document differ the
   live document is right. Colours come from the page's module family
   (data-module on the body), never from the JSON.

   JSON shape (see resources/guides/README.md):
     { module, verified, docs: { key: { title, id } },
       chapters: [ { id, nav, kicker, title, lede, blocks: [ … ] } ] }
   Each block: { type, title?, intro?, source?: [ { doc, at } ], …type data }
   Block types: oneminute · stats · compare · cycle · weights · flow ·
                bands · roles · callout · dodont · faq · links · row
   ================================================================ */

const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  teacher: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M19 8v6M22 11h-6"/>',
  school: '<path d="m4 10 8-6 8 6"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  principal: '<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/><path d="m12 13 1.5 3-1.5 2-1.5-2z"/>',
  online: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  onsite: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 5 5"/>',
};
const icon = (name, cls = 'g-ico') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.doc}</svg>`;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Tiny inline markup: **bold**, [text](url). Everything else is escaped. */
const md = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${u}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`);

let DOCS = {};
const docUrl = (key) => {
  const d = DOCS[key];
  if (!d) return null;
  if (d.url) return d.url;
  return d.kind === 'sheet' ? `https://docs.google.com/spreadsheets/d/${d.id}/edit` : `https://docs.google.com/document/d/${d.id}/edit`;
};

function sources(list) {
  if (!list || !list.length) return '';
  const items = list.map(({ doc, at }) => {
    const d = DOCS[doc];
    if (!d) return `<span class="at">${esc(doc)}</span>`;
    return `<a href="${docUrl(doc)}" target="_blank" rel="noopener" title="Open the live Google Doc">${icon('doc')}${esc(d.title)}</a>${at ? `<span class="at">${esc(at)}</span>` : ''}`;
  }).join('');
  return `<div class="g-src"><span>Source</span>${items}</div>`;
}

const head = (b) => (b.title ? `<h3 class="g-block__title">${md(b.title)}</h3>` : '') + (b.intro ? `<p class="g-block__intro g-md">${md(b.intro)}</p>` : '');
const card = (b, inner, extra = '') => `<section class="g-block ${extra}">${head(b)}${inner}${sources(b.source)}</section>`;

const R = {
  oneminute: (b) => card(b, `<div class="g-oneminute"><p class="g-oneminute__lead g-md">${md(b.lead)}</p><ul>${
    b.points.map((p) => `<li><span class="tick">${icon('check')}</span><span class="g-md">${md(p)}</span></li>`).join('')}</ul></div>`),

  stats: (b) => card(b, `<div class="g-stats">${b.items.map((s) => `<div class="g-stat">
      <div class="g-stat__num">${esc(s.value)}${s.unit ? `<small>${esc(s.unit)}</small>` : ''}</div>
      <div class="g-stat__label">${md(s.label)}</div>${s.note ? `<div class="g-stat__note g-md">${md(s.note)}</div>` : ''}</div>`).join('')}</div>`),

  compare: (b) => card(b, `<div class="g-compare">${b.items.map((c) => `<article class="g-card">
      <div class="g-card__top"><div class="g-card__icon">${icon(c.icon || 'doc')}</div><h4 class="g-card__title">${esc(c.title)}</h4>${c.sub ? `<div class="g-card__sub g-md">${md(c.sub)}</div>` : ''}</div>
      <dl>${c.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="g-md">${md(v)}</dd></div>`).join('')}</dl>
      ${c.link ? `<div class="g-card__link"><a href="${c.link.href}">${esc(c.link.label)} →</a></div>` : ''}</article>`).join('')}</div>`),

  cycle: (b) => card(b, `<div class="g-cycle" style="--n:${b.steps.length}">${b.steps.map((s) => `<div class="g-step${s.key ? ' g-step--key' : ''}">
      <div class="g-step__node">${esc(s.node)}</div>
      <div><div class="g-step__when">${esc(s.when)}</div><div class="g-step__name">${esc(s.name)}</div>
      ${s.mode ? `<div class="g-step__mode">${icon(s.mode === 'online' ? 'online' : 'onsite')}${s.mode === 'online' ? 'Online' : 'On site'}</div>` : ''}</div>
      ${s.text ? `<div class="g-step__text g-md">${md(s.text)}</div>` : ''}</div>`).join('')}</div>`),

  weights: (b) => {
    const sets = b.sets;
    // Six family tones, darkest first (Lead principals have six areas).
    const shades = ['var(--m-dark)', 'var(--m-mid)', 'var(--m-soft)', 'color-mix(in srgb, var(--m-soft) 50%, var(--m-border))', 'var(--m-border)', 'var(--m-tint)'];
    const donut = (items) => {
      const C = 2 * Math.PI * 80; let off = 0;
      const arcs = items.filter((i) => i.pct > 0).map((it) => {
        const idx = items.indexOf(it);
        const len = (it.pct / 100) * C;
        const a = `<circle cx="105" cy="105" r="80" fill="none" stroke="${shades[idx]}" stroke-width="34" stroke-dasharray="${len - 2} ${C - len + 2}" stroke-dashoffset="${-off}" transform="rotate(-90 105 105)"/>`;
        off += len; return a;
      }).join('');
      return `<svg class="g-donut" viewBox="0 0 210 210" role="img" aria-label="${esc(items.map((i) => `${i.name} ${i.pct}%`).join(', '))}">${arcs}
        <text x="105" y="100" text-anchor="middle" font-size="30" font-weight="600" fill="var(--m-dark)">100%</text>
        <text x="105" y="124" text-anchor="middle" font-size="12" fill="var(--ink-2)" font-family="DM Sans, sans-serif">${esc(b.centre || 'composite')}</text></svg>`;
    };
    const panel = (set, i) => `<div class="g-weights" data-set="${i}"${i ? ' hidden' : ''}>${donut(set.items)}<div class="g-legend">${
      set.items.map((it, j) => `<div class="g-legend__row"><span class="g-legend__sw" style="background:${shades[j]}"></span>
        <span class="g-legend__pct">${it.pct}%</span><div><div class="g-legend__name">${esc(it.name)}</div>${it.desc ? `<div class="g-legend__desc g-md">${md(it.desc)}</div>` : ''}</div></div>`).join('')}</div></div>`;
    const tabs = sets.length > 1 ? `<div class="g-tabs" role="tablist">${sets.map((s, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-tab="${i}">${esc(s.label)}</button>`).join('')}</div>` : '';
    return card(b, tabs + sets.map(panel).join(''), 'g-has-tabs');
  },

  flow: (b) => card(b, `<div class="g-flow" style="--n:${b.steps.length}">${b.steps.map((s, i) => `<div class="g-flow__step">
      <div class="g-flow__num">${i + 1}</div><div class="g-flow__title">${esc(s.title)}</div>
      <div class="g-flow__text g-md">${md(s.text)}</div>${s.who ? `<span class="g-flow__who">${esc(s.who)}</span>` : ''}</div>`).join('')}</div>`),

  bands: (b) => {
    // Lightest → darkest family tone, so the scale reads as one family.
    const tones = [
      { bg: 'var(--m-tint-2)', fg: 'var(--m-dark)', fg2: 'var(--ink-2)' },
      { bg: 'var(--m-tint)', fg: 'var(--m-dark)', fg2: 'var(--ink-2)' },
      { bg: 'var(--m-soft)', fg: '#fff', fg2: 'rgba(255,255,255,.9)' },
      { bg: 'var(--m-dark)', fg: '#fff', fg2: 'rgba(255,255,255,.85)' },
    ];
    const n = b.items.length;
    return card(b, `<div class="g-bands" style="--n:${n}">${b.items.map((it, i) => {
      const t = tones[Math.round((i / Math.max(1, n - 1)) * (tones.length - 1))];
      return `<div class="g-band" style="--bg:${t.bg};--fg:${t.fg};--fg2:${t.fg2}"><div class="g-band__range">${esc(it.range)}</div><div class="g-band__name">${esc(it.name)}</div>${it.desc ? `<div class="g-band__desc g-md">${md(it.desc)}</div>` : ''}</div>`;
    }).join('')}</div>`);
  },

  roles: (b) => card(b, `<div class="g-roles-scroll"><table class="g-roles"><thead><tr>${b.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${
    b.rows.map((r) => `<tr>${r.map((c) => `<td class="g-md">${md(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`),

  callout: (b) => `<aside class="g-callout${b.tone === 'soft' ? ' g-callout--soft' : ''}"><div class="g-callout__icon">${icon(b.icon || 'alert')}</div>
    <div style="flex:1;min-width:0"><h3 class="g-callout__title">${md(b.title)}</h3><div class="g-callout__text g-md">${md(b.text)}</div>${sources(b.source)}</div></aside>`,

  dodont: (b) => card(b, `<div class="g-dodont"><div class="g-dodont__col g-dodont__col--do"><h4>${esc(b.doLabel || 'Do')}</h4><ul>${b.do.map((x) => `<li class="g-md">${md(x)}</li>`).join('')}</ul></div>
    <div class="g-dodont__col g-dodont__col--dont"><h4>${esc(b.dontLabel || "Don't")}</h4><ul>${b.dont.map((x) => `<li class="g-md">${md(x)}</li>`).join('')}</ul></div></div>`),

  faq: (b) => card(b, `<div class="g-faq">${b.items.map((q) => `<details><summary>${esc(q.q)}</summary><div class="g-faq__a g-md">${md(q.a)}</div></details>`).join('')}</div>`),

  links: (b) => card(b, `<div class="g-links">${b.items.map((l) => {
    const isDoc = !!l.doc; const href = isDoc ? docUrl(l.doc) : l.href;
    const title = l.title || (isDoc && DOCS[l.doc] ? DOCS[l.doc].title : '');
    return `<a class="g-link${isDoc ? ' g-link--doc' : ''}" href="${href}"${isDoc ? ' target="_blank" rel="noopener"' : ''}>
      <span class="g-link__icon">${icon(isDoc ? 'doc' : (l.icon || 'tool'))}</span><span><div class="g-link__title">${esc(title)}</div>${l.sub ? `<div class="g-link__sub">${esc(l.sub)}</div>` : ''}</span></a>`;
  }).join('')}</div>`),

  row: (b) => `<div class="g-row g-row--${b.blocks.length}">${b.blocks.map(block).join('')}</div>`,
};

function block(b) {
  const fn = R[b.type];
  if (!fn) { console.warn('[guide] unknown block type', b.type); return ''; }
  return fn(b);
}

export function renderGuide(root, nav, data) {
  DOCS = data.docs || {};
  nav.innerHTML = `<div class="g-nav__inner">${data.chapters.map((c, i) =>
    `<a href="#${c.id}" data-chapter="${c.id}"><span class="n">${i + 1}</span>${esc(c.nav || c.title)}</a>`).join('')}</div>`;

  const verified = data.verified
    ? `<div class="g-verified"><span class="dot" aria-hidden="true"></span><span>Summarised from the live Academic Services documents · last checked <strong>${esc(data.verified)}</strong>.</span><span>If this page and a document ever differ, <strong>the document is right</strong>${data.startHere ? ` — <a href="${docUrl(data.startHere)}" target="_blank" rel="noopener">open ${esc(DOCS[data.startHere].title)} ↗</a>` : ''}.</span></div>`
    : '';

  root.innerHTML = verified + data.chapters.map((c, i) => `<section class="g-chapter" id="${c.id}">
      <header class="g-chapter__head"><div class="g-chapter__num">${i + 1}</div><div>
        ${c.kicker ? `<div class="g-chapter__kicker">${esc(c.kicker)}</div>` : ''}
        <h2 class="g-chapter__title">${esc(c.title)}</h2>${c.lede ? `<p class="g-chapter__lede g-md">${md(c.lede)}</p>` : ''}</div></header>
      ${c.blocks.map(block).join('')}</section>`).join('');

  // Tabs inside weight blocks
  root.querySelectorAll('.g-has-tabs').forEach((el) => {
    el.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => {
      el.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === btn)));
      el.querySelectorAll('[data-set]').forEach((p) => { p.hidden = p.dataset.set !== btn.dataset.tab; });
    }));
  });

  // Chapter scroll-spy
  const links = [...nav.querySelectorAll('a')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-active', a.dataset.chapter === e.target.id));
      const active = nav.querySelector('a.is-active');
      if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }, { rootMargin: '-140px 0px -60% 0px' });
  root.querySelectorAll('.g-chapter').forEach((s) => io.observe(s));
}
