/* ================================================================
   home-week.js — "Your school this week" panel on the AH home (2026-10-02)

   The home page used to be a map of links: nothing told a school leader
   what the week needs. This panel answers that from data the leader can
   already read under the live Firestore rules — no new collection, no new
   rule:

     teaching_schedule/main            weeks, semesters, EASE / camp weeks
     calendar_events (academicYear)    network dates (EASE Weeks, reports, holidays)
     partner_schools/{schoolId}        appraisal_2026_27.visit1 / visit2 dates
                                       (Phase 1 Teaching Quality Visit,
                                        Phase 3 Validation Visit)
     weekly_templates + weekly_progress  this week's checklist, own progress
     school_appraisals_v2              the school's self-appraisal status
     teacher_appraisals / teacher_walkthroughs  (Principal / AC / CC only:
                                       the rule lets them read their school)
     users (schoolId) + staff (schoolId)  teachers with a Teachers Hub
                                       account vs the staff list

   Every block is optional: a read that fails or returns nothing hides that
   block, never the page. Rules quoted in the panel come from the live
   documents (Teacher Appraisal: at least three formal observations a
   semester; School Appraisal Phases 0-4).
   ================================================================ */
import {
  doc, getDoc, getDocs, collection, query, where,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const LEAD_ROLES = ['school_principal', 'academic_coordinator', 'cambridge_coordinator', 'foundation_representative'];
const APPRAISER_ROLES = ['school_principal', 'academic_coordinator', 'cambridge_coordinator'];
const ROLE_LABEL = {
  school_principal: 'Principal', academic_coordinator: 'Academic Coordinator',
  cambridge_coordinator: 'Cambridge Coordinator', foundation_representative: 'FR/GM',
};
const OBS_TARGET = 3;          // formal observations per teacher per semester
const HORIZON_DAYS = 45;       // how far "Coming up" looks ahead
const DAY = 86400000;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const iso = s => new Date(String(s).slice(0, 10) + 'T00:00:00');
const toDate = v => (v && typeof v.toDate === 'function') ? day0(v.toDate()) : (v ? iso(v) : null);
const fmt = d => `${d.getDate()} ${MON[d.getMonth()]}`;
const fmtRange = (a, b) => {
  if (!b || +a === +b) return fmt(a);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MON[a.getMonth()]}` : `${fmt(a)} – ${fmt(b)}`;
};
const inDays = (d, now) => {
  const n = Math.round((day0(d) - day0(now)) / DAY);
  return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : n < 14 ? `in ${n} days` : `in ${Math.round(n / 7)} weeks`;
};
const safe = async p => { try { return await p; } catch (e) { console.warn('[home-week]', e?.code || e?.message || e); return null; } };

// "15–16 Oct 2026" / "5 Aug 2026" → { start, end }
function parseVisitDates(s) {
  const m = String(s || '').match(/^(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if (!m) return null;
  const mi = MON.indexOf(m[3][0].toUpperCase() + m[3].slice(1, 3).toLowerCase());
  if (mi < 0) return null;
  const start = new Date(+m[4], mi, +m[1]);
  return { start, end: m[2] ? new Date(+m[4], mi, +m[2]) : start };
}

export async function renderHomeWeek({ db, user, profile, families = {}, mount, now = new Date() }) {
  if (!mount || !db || !user || !profile?.schoolId) return;
  const roles = (profile.ah_sub_roles || []).filter(r => LEAD_ROLES.includes(r));
  if (!roles.length) return;
  const role = LEAD_ROLES.find(r => roles.includes(r));
  const isAppraiser = roles.some(r => APPRAISER_ROLES.includes(r));
  const sid = profile.schoolId;
  const today = day0(now);

  // ── 1. Calendar spine ────────────────────────────────────────────
  const schedSnap = await safe(getDoc(doc(db, 'teaching_schedule', 'main')));
  const sched = schedSnap?.exists() ? schedSnap.data() : null;
  if (!sched?.weeks?.length) return;   // no academic year set up: nothing reliable to say
  const weeks = sched.weeks.map(w => ({ ...w, monD: iso(w.mon), friD: iso(w.fri) }));
  const skipped = (sched.skippedWeeks || []).map(w => ({ ...w, monD: iso(w.mon), friD: iso(w.fri) }));
  const startIso = sched.academicYearStart || weeks[0].mon;
  // June counts as the new year: 2026-27 starts Mon 29 June (same rule as weekly-checklist).
  const y0 = +startIso.slice(0, 4) - (+startIso.slice(5, 7) >= 6 ? 0 : 1);
  const AY = `${y0}-${y0 + 1}`;                       // weekly_templates / progress key
  const AY_CAL = `${String(y0).slice(2)}_${String(y0 + 1).slice(2)}`;  // calendar_events key

  const thisWeek = weeks.find(w => today >= w.monD && today <= iso(w.fri));
  const thisSkip = skipped.find(w => today >= w.monD && today <= w.friD);
  const pastWeeks = weeks.filter(w => w.friD < today);
  const checklistWeek = thisWeek || pastWeeks[pastWeeks.length - 1] || weeks[0];
  const nextWeek = weeks.find(w => w.monD > today);
  const semLabel = (thisWeek || thisSkip || nextWeek || checklistWeek).semLabel || '';
  const semWeeks = weeks.filter(w => w.semLabel === semLabel);
  const semStart = semWeeks[0]?.monD;
  const semEnd = [...semWeeks, ...skipped.filter(w => w.semLabel === semLabel)].reduce((m, w) => (w.friD > m ? w.friD : m), semWeeks[0]?.friD || today);

  // ── 2. Reads, in parallel; each one may fail on its own ──────────
  const platform = role;
  const wk = String(checklistWeek.weekNo).padStart(2, '0');
  const [schoolSnap, evSnap, tplSnap, progSnap, saSnap, teacherUsers, apprSnap, walkSnap, staffSnap] = await Promise.all([
    safe(getDoc(doc(db, 'partner_schools', sid))),
    safe(getDocs(query(collection(db, 'calendar_events'), where('academicYear', '==', AY_CAL)))),
    safe(getDoc(doc(db, 'weekly_templates', `${AY}_w${wk}_${platform}`))),
    safe(getDoc(doc(db, 'weekly_progress', `${user.uid}_${AY}_w${wk}_${platform}`))),
    safe(getDocs(query(collection(db, 'school_appraisals_v2'), where('schoolId', '==', sid)))),
    isAppraiser ? safe(getDocs(query(collection(db, 'users'), where('schoolId', '==', sid)))) : null,
    isAppraiser ? safe(getDocs(query(collection(db, 'teacher_appraisals'), where('schoolId', '==', sid)))) : null,
    isAppraiser ? safe(getDocs(query(collection(db, 'teacher_walkthroughs'), where('schoolId', '==', sid)))) : null,
    isAppraiser ? safe(getDocs(query(collection(db, 'staff'), where('schoolId', '==', sid)))) : null,
  ]);
  const school = schoolSnap?.exists() ? schoolSnap.data() : {};

  // ── 3. Header: where are we in the year? ─────────────────────────
  const events = (evSnap?.docs || []).map(d => d.data()).map(e => ({
    title: e.title || e.name || '', cat: e.category || '', dept: e.department || '', start: toDate(e.date_start), end: toDate(e.date_end || e.date_start),
  })).filter(e => e.start && e.title);
  let headline, sub;
  if (thisWeek) {
    headline = `${semLabel} · Week ${thisWeek.semWeekNo || thisWeek.weekNo}`;
    sub = `${fmtRange(thisWeek.monD, iso(thisWeek.fri))} · ${Math.max(0, Math.round((semEnd - today) / (7 * DAY)))} weeks left in ${semLabel}`;
  } else if (thisSkip) {
    const named = events.find(e => e.cat === 'Assessment' && e.start <= thisSkip.friD && e.end >= thisSkip.monD);
    headline = named ? named.title : `${thisSkip.reason} week`;
    const lessons = named ? easeLessons(named.title) : '';
    sub = `${fmtRange(thisSkip.monD, thisSkip.friD)}${lessons ? ` · ${lessons}` : ''}${nextWeek ? ` · the weekly checklist picks up again on ${fmt(nextWeek.monD)}` : ''}`;
  } else {
    headline = nextWeek ? `Teaching starts ${fmt(nextWeek.monD)}` : 'Between terms';
    sub = nextWeek ? `${nextWeek.semLabel} · ${inDays(nextWeek.monD, today)}` : '';
  }

  // ── 4. Coming up ─────────────────────────────────────────────────
  const horizon = new Date(+today + HORIZON_DAYS * DAY);
  const items = [];
  const KEEP = new Set(['Assessment', 'Reporting', 'Public Holiday', 'Academic Event', 'Academic']);
  // Academic department only: Career Planning / Working Alumni dates are not a school leader's week.
  events.filter(e => KEEP.has(e.cat) && (!e.dept || e.dept === 'Academic') && e.end >= today && e.start <= horizon)
    .forEach(e => items.push({ start: e.start, end: e.end, title: e.title, kind: e.cat === 'Assessment' && /EASE/i.test(e.title) ? 'ease' : e.cat === 'Public Holiday' ? 'holiday' : 'network' }));
  skipped.filter(w => !/EASE/i.test(w.reason) && w.friD >= today && w.monD <= horizon)
    .forEach(w => items.push({ start: w.monD, end: w.friD, title: w.reason, kind: 'network' }));
  const visits = [];
  const ap = school.appraisal_2026_27 || {};
  [['visit1', 'Phase 1 · Teaching Quality Visit'], ['visit2', 'Phase 3 · Validation Visit']].forEach(([k, label]) => {
    const r = parseVisitDates(ap[k]?.dates);
    if (!r) return;
    visits.push({ ...r, label });
    if (r.end >= today && r.start <= horizon) items.push({ start: r.start, end: r.end, title: `${label} at your school`, kind: 'visit' });
  });
  const seen = new Set();
  const coming = items.filter(i => { const k = i.title + +i.start; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.start - b.start).slice(0, 6);

  // ── 5. Cards ─────────────────────────────────────────────────────
  const cards = [];
  const fam = k => families[k] || {};

  // Checklist — the week's tasks for this role.
  const tasks = tplSnap?.exists() ? (tplSnap.data().tasks || []) : [];
  if (tasks.length) {
    const prog = progSnap?.exists() ? (progSnap.data().items || {}) : {};
    const done = tasks.filter(t => prog[t.id]?.checked).length;
    const next = tasks.find(t => !prog[t.id]?.checked);
    cards.push(card({
      fam: fam('school_workspace'), href: '/weekly-checklist', cta: 'Open the checklist',
      kick: `Weekly checklist · Week ${checklistWeek.semWeekNo || checklistWeek.weekNo}`,
      big: `${done}<small> of ${tasks.length}</small>`, label: done === tasks.length ? 'All done this week' : 'tasks done',
      bar: done / tasks.length,
      note: next ? `Next: ${next.title}` : `Your ${ROLE_LABEL[role]} tasks for this week are complete.`,
    }));
  }

  // Teacher observations — Principal / AC / CC.
  if (isAppraiser && teacherUsers && apprSnap) {
    const teachers = teacherUsers.docs.map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => u.role_teachershub && u.approval_status_teachershub !== 'rejected');
    const inSem = d => d && semStart && d >= semStart && d <= semEnd;
    const obsBy = {};
    apprSnap.docs.map(d => d.data())
      .filter(a => a.sessionType === 'observation' && a.status && a.status !== 'draft' && inSem(toDate(a.observationDate || a.createdAt)))
      .forEach(a => { obsBy[a.teacherUid] = (obsBy[a.teacherUid] || 0) + 1; });
    const full = teachers.filter(t => (obsBy[t.uid] || 0) >= OBS_TARGET).length;
    const some = teachers.filter(t => (obsBy[t.uid] || 0) > 0 && (obsBy[t.uid] || 0) < OBS_TARGET).length;
    const none = teachers.length - full - some;
    const staffTeachers = (staffSnap?.docs || []).map(d => d.data()).filter(s => s.role === 'teacher' && s.status !== 'inactive').length;
    const weekStart = thisWeek ? thisWeek.monD : (thisSkip ? thisSkip.monD : today);
    const myWalks = (walkSnap?.docs || []).map(d => d.data())
      .filter(w => w.observerUid === user.uid && toDate(w.visitDate || w.createdAt) >= weekStart).length;
    const notes = [];
    if (staffTeachers > teachers.length) notes.push(`${teachers.length} of your ${staffTeachers} teachers have a Teachers Hub account — a teacher needs one before you can record an observation here.`);
    notes.push(`Your walkthroughs this week: ${myWalks}.`);
    cards.push(card({
      fam: fam('appraisal'), href: '/teacher-appraisal-entry', cta: 'Record an observation',
      kick: `Teacher observations · ${semLabel}`,
      big: `${full}<small> of ${teachers.length}</small>`, label: `teachers with ${OBS_TARGET}+ formal observations`,
      split: teachers.length ? [[full, 'done'], [some, 'started'], [none, 'not yet']] : null,
      note: notes.join(' '),
    }));
  }

  // School Appraisal — the school's own visit dates + self-appraisal status.
  if (visits.length || saSnap) {
    const sa = (saSnap?.docs || []).map(d => d.data()).find(d => /2026.?2027/.test(String(d.academicYear || '')));
    const upcoming = visits.find(v => v.end >= today);
    const status = !sa ? 'Not started' : sa.status === 'submitted' ? 'Submitted' : sa.status === 'reviewed' || sa.status === 'validated' ? 'Reviewed' : 'In draft';
    cards.push(card({
      fam: fam('appraisal'), href: '/school-self-appraisal', cta: 'Open the self-appraisal',
      kick: 'School Appraisal',
      big: upcoming ? fmtRange(upcoming.start, upcoming.end) : (visits.length ? 'Visits done' : '—'),
      label: upcoming ? `${upcoming.label} · ${inDays(upcoming.start, today)}` : 'Phase 4 Impact Review comes near the end of the year',
      chips: visits.map(v => ({ text: `${v.label.split(' · ')[0]}: ${fmtRange(v.start, v.end)}`, done: v.end < today })),
      note: `Self-appraisal: ${status}. There is no single school score — each domain gets its own rating.`,
    }));
  }

  // EASE — next EASE Week from the network calendar.
  // A window that is running now is already the header; the card shows the next one.
  // The four EASE Weeks first (EASE Academic is the teachers' exam; it shows under Coming up).
  const easeAhead = events.filter(e => e.cat === 'Assessment' && /EASE/i.test(e.title) && e.start > today).sort((a, b) => a.start - b.start);
  const easeNext = easeAhead.find(e => /EASE Week/i.test(e.title)) || easeAhead[0];
  if (easeNext) {
    const lessons = easeLessons(easeNext.title);
    cards.push(card({
      fam: fam('ease'), href: '/ease-guide', cta: 'EASE guide',
      kick: 'EASE · next window',
      big: fmtRange(easeNext.start, easeNext.end), label: easeNext.title,
      note: `Starts ${inDays(easeNext.start, today)}${lessons ? `; ${lessons}` : ''}. The EASE guide has the readiness check for the weeks before.`,
    }));
  }

  if (!cards.length && !coming.length) return;

  mount.innerHTML = `
    <div class="hw-head">
      <div>
        <div class="hw-kick">Your school this week${profile.school ? ` · ${esc(profile.school)}` : ''}</div>
        <h2 class="hw-title">${esc(headline)}</h2>
        ${sub ? `<div class="hw-sub">${esc(sub)}</div>` : ''}
      </div>
    </div>
    <div class="hw-grid">
      <div class="hw-cards${cards.length === 4 ? ' is-four' : ''}">${cards.join('')}</div>
      ${coming.length ? `<aside class="hw-coming" aria-label="Coming up">
        <div class="hw-coming-h">Coming up</div>
        <ol>${coming.map(i => `<li class="hw-ev is-${i.kind}">
          <span class="hw-ev-date">${esc(fmtRange(i.start, i.end))}</span>
          <span class="hw-ev-t">${esc(i.title)}</span>
          <span class="hw-ev-in">${i.start <= today ? 'now' : esc(inDays(i.start, today))}</span>
        </li>`).join('')}</ol>
        <a class="hw-coming-more" href="/academic-calendar">Academic calendar →</a>
      </aside>` : ''}
    </div>`;
  mount.hidden = false;
}

// AY 2026-27 model: EASE Weeks 1 & 3 are mid-semester (EASE Growth, lessons
// continue); Weeks 2 & 4 are semester-end (Synchronized Tests, lessons stop).
function easeLessons(title) {
  const n = +(String(title).match(/EASE Week\s*([1-4])/i) || [])[1];
  return n === 1 || n === 3 ? 'lessons continue as normal'
       : n === 2 || n === 4 ? 'lessons stop for the Synchronized Tests' : '';
}

function card({ fam, href, cta, kick, big, label, bar, split, chips, note }) {
  const vars = `--hw-c:${fam.mid || '#4b3fc4'};--hw-t:${fam.tint || '#eeecf9'};--hw-d:${fam.c || '#2b2470'}`;
  const splitHtml = split ? (() => {
    const total = split.reduce((s, [n]) => s + n, 0) || 1;
    return `<div class="hw-split" role="img" aria-label="${esc(split.map(([n, l]) => `${n} ${l}`).join(', '))}">${split.map(([n, l], i) => n ? `<span class="s${i}" style="flex:${n / total}"></span>` : '').join('')}</div>
      <div class="hw-legend">${split.map(([n, l], i) => `<span class="s${i}"><i></i>${n} ${esc(l)}</span>`).join('')}</div>`;
  })() : '';
  return `<a class="hw-card" href="${esc(href)}" style="${vars}">
    <div class="hw-card-kick">${esc(kick)}</div>
    <div class="hw-big">${big}</div>
    <div class="hw-label">${esc(label)}</div>
    ${bar != null ? `<div class="hw-bar"><span style="width:${Math.round(bar * 100)}%"></span></div>` : ''}
    ${splitHtml}
    ${chips?.length ? `<div class="hw-chips">${chips.map(c => `<span class="${c.done ? 'is-done' : ''}">${c.done ? '✓ ' : ''}${esc(c.text)}</span>`).join('')}</div>` : ''}
    ${note ? `<p class="hw-note">${esc(note)}</p>` : ''}
    <span class="hw-cta">${esc(cta)} →</span>
  </a>`;
}
