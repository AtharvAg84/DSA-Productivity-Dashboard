(() => {
'use strict';
const KEY = 'dsa.tracker.entries.v1', START_YEAR = 2025, PAGE = 15, SKEY = 'dsa.tracker.settings.v1', MS = [3, 7, 14, 30, 50, 75, 100, 150, 200, 300, 365, 500, 730, 1000];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PLATFORMS = ['LeetCode', 'GeeksforGeeks', 'Codeforces', 'HackerRank', 'Coding Ninjas', 'CodeChef'];
const DEF_CO = ['Meesho', 'Flipkart', 'Couchbase', 'RingCentral'], DIFF = ['Easy', 'Medium', 'Hard'];
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const todayISO = (off = 0) => { const n = new Date(); n.setDate(n.getDate() - off); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };
const L = (s, o) => parse(s).toLocaleDateString('en-GB', { timeZone: 'UTC', ...o });
const fmtShort = s => L(s, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtMin = m => { if (m == null) return 'Not logged'; const h = Math.floor(m / 60), r = m % 60; return [h && h + 'h', (r || !h) && r + 'm'].filter(Boolean).join(' '); };
const num = n => n.toLocaleString('en-IN');
const plural = (n, w, pl) => `${num(n)} ${n === 1 ? w : (pl || w + 's')}`;
const sp = s => s ? s.split(', ').filter(Boolean) : [];
const uniq = a => [...new Set(a)];
const newId = () => 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- storage: user items are additions, edits (ov = replaced file entry) or deletions (del) ---------- */
const validItem = e => e && typeof e.id === 'string' && (e.del ? typeof e.ov === 'string' : /^\d{4}-\d{2}-\d{2}$/.test(e.d) && Number.isFinite(+e.n) && Number.isFinite(+e.r));
const load = () => { try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(validItem) : []; } catch { return []; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(user)); return true; } catch { return false; } };

const DEFAULTS = { rOn: false, rTime: '20:00', goal: 0 };
let settings = (() => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SKEY) || '{}') }; } catch { return { ...DEFAULTS }; } })();
const saveSettings = () => { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch { /* storage blocked */ } };
const nextMs = n => MS.find(m => m > n) || (Math.floor(n / 500) + 1) * 500, isMilestone = n => MS.includes(n) || (n > 1000 && n % 500 === 0);
let anim = 0, pop = false, dayKey = '';
let user = load(), entries = [], byDate = new Map(), YEARS = [], year = new Date().getFullYear(), page = 1, view = 'overview';
const filt = { q: '', ph: 'all', yr: 'all', pl: 'all', act: 'all', rev: false, day: '', sort: 'desc' };
const norm = (e, src, id) => ({ id, src, ov: e.ov || '', d: e.d, ph: e.ph === 'L' ? 'Learning' : 'Challenge', n: +e.n || 0, r: +e.r || 0, p: (+e.n || 0) + (+e.r || 0),
  t: e.t == null ? null : +e.t, v: e.v || '', w: e.w || '', tp: e.tp || '', rv: e.rv || '', co: e.co || '', ty: e.ty || '', ok: e.ok || '', tc: e.tc || '', nt: e.nt || '' });

function build() {
  const gone = new Set(user.filter(u => u.ov).map(u => u.ov));
  entries = (window.DSA_DATA || []).map((e, i) => norm(e, 'file', 'h' + i)).filter(e => !gone.has(e.id)).concat(user.filter(u => !u.del).map(u => norm(u, 'user', u.id)));
  entries.sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
  const top = Math.max(new Date().getFullYear(), START_YEAR, ...entries.map(e => +e.d.slice(0, 4)));
  YEARS = Array.from({ length: top - START_YEAR + 1 }, (_, i) => START_YEAR + i);
  byDate = new Map();
  for (const e of entries) {
    const x = byDate.get(e.d) || { p: 0, n: 0, r: 0, t: 0, tl: false, act: false };
    x.p += e.p; x.n += e.n; x.r += e.r;
    if (e.t != null) { x.t += e.t; x.tl = true; }
    if (e.p > 0 || e.t > 0 || e.v) x.act = true;
    byDate.set(e.d, x);
  }
}
const tally = fn => { const m = new Map(); for (const e of entries) for (const k of fn(e)) m.set(k, (m.get(k) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); };
const fit = () => $$('[data-w]').forEach(i => { i.style.width = i.dataset.w + '%'; });

/* ---------- overview ---------- */
function calc() {
  let P = 0, N = 0, R = 0, T = 0, TD = 0, A = 0, bestDay = null; const dates = [];
  for (const [d, x] of byDate) { P += x.p; N += x.n; R += x.r; if (x.tl) { T += x.t; TD++; } if (x.act) { A++; dates.push(d); } if (!bestDay || x.p > bestDay.p) bestDay = { d, p: x.p }; }
  dates.sort();
  let best = 0, bs = '', be = '', cs = '', len = 0, prev = null; const runs = [];
  for (const d of dates) { if (prev && parse(d) - parse(prev) === 864e5) len++; else { if (prev) runs.push({ s: cs, e: prev, n: len }); len = 1; cs = d; } prev = d; if (len > best) { best = len; bs = cs; be = d; } }
  if (prev) runs.push({ s: cs, e: prev, n: len });
  const set = new Set(dates); let cur = 0, k = set.has(todayISO()) ? todayISO() : todayISO(1);
  while (set.has(k)) { cur++; k = iso(new Date(parse(k).getTime() - 864e5)); }
  return { P, N, R, T, TD, A, best, bs, be, cur, last: dates[dates.length - 1], bestDay, dates, runs, doneToday: set.has(todayISO()) };
}
const FLAME = '<path class="fo" d="M34 3c2 11 15 17 15 33 0 11-7 21-17 21S15 47 15 36c0-8 4-13 8-17 0 6 3 9 6 9-2-9-1-17 5-25z"/><path class="fi" d="M32 57c-6 0-10-5-10-11 0-6 5-9 8-14 1 4 4 5 6 8 2-2 3-4 3-7 4 4 5 8 5 12 0 7-5 12-12 12z"/>';
function weekStrip(c) {
  const t = todayISO(), tp = parse(t), mon = tp.getTime() - ((tp.getUTCDay() + 6) % 7) * 864e5, first = c.dates[0] || '9999-12-31';
  return Array.from({ length: 7 }, (_, i) => {
    const d = iso(new Date(mon + i * 864e5)), st = byDate.get(d)?.act ? 'done' : d === t ? 'pending' : d < t ? (d >= first ? 'missed' : 'none') : 'future';
    const lab = { done: 'completed', pending: 'pending', missed: 'missed', future: 'upcoming', none: 'no record' }[st];
    return `<li class="wd ${st}" title="${fmtShort(d)}: ${lab}"><span aria-hidden="true">${L(d, { weekday: 'narrow' })}</span><i aria-hidden="true">${st === 'done' ? '✓' : st === 'missed' ? '×' : ''}</i><span class="vh">${L(d, { weekday: 'long' })}: ${lab}</span></li>`;
  }).join('');
}
function countTo(el, from, to) {
  if (!el) return; if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 800; el.textContent = from;
  (function step(t) { const p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(t0);
}
function renderTop() {
  const c = calc(), none = !entries.length, rp = c.P ? Math.round(c.R / c.P * 100) : 0, nx = nextMs(c.cur), from = anim, tp = byDate.get(todayISO())?.p || 0, g = settings.goal;
  $('#hero').innerHTML = `<div><p class="k">Problems solved</p><b class="big">${none ? '–' : num(c.P)}</b><p>${num(c.N)} new and ${num(c.R)} revised</p><div class="split" role="img" aria-label="${100 - rp}% new, ${rp}% revised"><i class="sn" data-w="${c.P ? 100 - rp : 0}"></i><i class="sr" data-w="${rp}"></i></div></div>
    <div class="hero-r" role="group" aria-label="Streak: ${plural(c.cur, 'day')}">
      <div class="sk"><svg class="flame ${c.doneToday ? 'on' : 'off'}${pop ? ' pop' : ''}" viewBox="0 0 64 64" aria-hidden="true">${FLAME}</svg>
        <div><p class="k">Current streak</p><p class="cnt2"><b class="big" id="streakNum">${c.cur}</b><span>${c.cur === 1 ? 'day' : 'days'}</span></p></div></div>
      <ul class="week" aria-label="This week">${weekStrip(c)}</ul>
      <div><p class="k mile"><span>Next milestone: ${nx} days</span><span>${nx - c.cur} to go</span></p><div class="split"><i class="sn" data-w="${Math.round(c.cur / nx * 100)}"></i></div></div>
      ${g ? `<div><p class="k mile"><span>Daily goal</span><span>${tp} / ${g} problems</span></p><div class="split"><i class="sg" data-w="${Math.min(100, Math.round(tp / g * 100))}"></i></div></div>` : ''}
      <button type="button" class="btn primary lg" id="heroLog">Log a day</button></div>`;
  if (from != null) countTo($('#streakNum'), from, c.cur); anim = null; pop = false;
  const card = (k, v, s) => `<div class="stat"><p class="k">${k}</p><b>${v}</b><span>${s}</span></div>`;
  $('#stats').innerHTML = card('Active days', none ? '–' : num(c.A), c.dates.length ? `since ${fmtShort(c.dates[0])}` : 'None yet') +
    card('Longest streak', none ? '–' : plural(c.best, 'day'), c.best ? `${fmtShort(c.bs)} to ${fmtShort(c.be)}` : 'Consecutive calendar days') +
    card('Logged hours', none ? '–' : (c.T / 60).toFixed(1) + ' h', `on ${plural(c.TD, 'day')} with time logged`) +
    card('Best day', c.bestDay && c.bestDay.p ? plural(c.bestDay.p, 'problem') : '–', c.bestDay && c.bestDay.p ? fmtShort(c.bestDay.d) : 'None yet');
  fit(); $('#heroLog').onclick = () => openForm();
}
const lastMonth = y => y === new Date().getFullYear() ? new Date().getMonth() : 11;
const level = x => !x ? 'lv0' : x.p === 0 ? (x.act ? 'lva' : 'lv0') : x.p <= 2 ? 'lv1' : x.p <= 5 ? 'lv2' : x.p <= 9 ? 'lv3' : 'lv4';
function renderHeat() {
  const cy = new Date().getFullYear(), cm = new Date().getMonth(), step = 16, left = 30, top = 22, mgap = 16, today = todayISO();
  let x0 = left, svg = '', yp = 0, ya = 0;
  for (let m = 0; m <= (year === cy ? cm : 11); m++) {
    const fd = new Date(Date.UTC(year, m, 1)).getUTCDay(), dim = new Date(Date.UTC(year, m + 1, 0)).getUTCDate(), upto = year === cy && m === cm ? Math.min(dim, new Date().getDate()) : dim, cols = Math.ceil((fd + upto) / 7);
    svg += `<rect class="mb" x="${x0 - 5}" y="${top - 5}" width="${cols * step + 2}" height="${7 * step + 2}" rx="8"/><text class="mt" x="${x0}" y="14">${MON[m]}</text>`;
    for (let d = 1; d <= upto; d++) {
      const k = `${year}-${pad(m + 1)}-${pad(d)}`, x = byDate.get(k), c = Math.floor((fd + d - 1) / 7), r = (fd + d - 1) % 7;
      if (x) { yp += x.p; if (x.act) ya++; }
      const tip = `${fmtShort(k)}: ${x && x.act ? plural(x.p, 'problem') + (x.r ? ` (${x.r} revised)` : '') + (x.tl ? ', ' + fmtMin(x.t) : '') : 'no activity'}`;
      svg += `<rect class="cell ${level(x)}${k === today ? ' today' : ''}" data-d="${k}" x="${x0 + c * step}" y="${top + r * step}" width="13" height="13" rx="3"><title>${esc(tip)}</title></rect>`;
    }
    x0 += cols * step + mgap;
  }
  ['Mon', 'Wed', 'Fri'].forEach((l, i) => svg += `<text x="0" y="${top + (i * 2 + 1) * step + 10}">${l}</text>`);
  $('#heat').innerHTML = `<svg class="heat" viewBox="0 0 ${x0 - mgap + 4} ${top + 7 * step + 4}" role="img" aria-label="Activity heatmap for ${year}, one block per month: ${plural(yp, 'problem')} on ${plural(ya, 'active day')}">${svg}</svg>`;
}
function renderYears() {
  $('#years').innerHTML = YEARS.map(y => { let p = 0; for (const [d, x] of byDate) if (+d.slice(0, 4) === y) p += x.p; return `<button type="button" class="yr" data-y="${y}" aria-pressed="${y === year}"><b>${y}</b><small>${num(p)}</small></button>`; }).join('');
}
function renderChart() {
  const m = Array.from({ length: 12 }, () => ({ n: 0, r: 0 }));
  for (const e of entries) if (+e.d.slice(0, 4) === year) { const i = +e.d.slice(5, 7) - 1; m[i].n += e.n; m[i].r += e.r; }
  const nm = lastMonth(year) + 1, mx = Math.ceil(Math.max(5, ...m.map(x => x.n + x.r)) / 20) * 20, Lp = 36, T = 16, H = 200, W = 700, gap = (W - Lp) / nm, bw = Math.min(30, gap * 0.6);
  let s = '';
  for (let t = 0; t <= 4; t++) { const y = T + H - H * t / 4; s += `<line class="gl" x1="${Lp}" x2="${W}" y1="${y}" y2="${y}"/><text x="${Lp - 6}" y="${y + 4}" text-anchor="end">${Math.round(mx * t / 4)}</text>`; }
  m.slice(0, nm).forEach((x, i) => {
    const cx = Lp + i * gap + (gap - bw) / 2, hn = H * x.n / mx, hr = H * x.r / mx, tot = x.n + x.r;
    s += `<g><title>${MON[i]} ${year}: ${x.n} new, ${x.r} revised</title>`;
    if (hn) s += `<rect class="bn" x="${cx}" y="${T + H - hn}" width="${bw}" height="${hn}" rx="3"/>`;
    if (hr) s += `<rect class="br" x="${cx}" y="${T + H - hn - hr}" width="${bw}" height="${hr}" rx="3"/>`;
    if (tot) s += `<text class="v" x="${cx + bw / 2}" y="${T + H - hn - hr - 4}" text-anchor="middle">${tot}</text>`;
    s += `<text x="${cx + bw / 2}" y="${T + H + 16}" text-anchor="middle">${MON[i]}</text></g>`;
  });
  $('#chart').innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${T + H + 24}" role="img" aria-label="Problems solved per month in ${year}">${s}</svg>` + (m.some(x => x.n + x.r) ? '' : `<p class="empty">No entries in ${year}.</p>`);
}
function renderMix() {
  let both = 0, vo = 0, qo = 0;
  for (const e of entries) { const v = !!e.v, q = e.p > 0; if (v && q) both++; else if (v) vo++; else if (q) qo++; }
  const bars = (t, l) => { const mx = Math.max(1, ...l.map(x => x[1])); return `<div class="bl"><h3>${t}</h3>${l.length ? l.map(([k, v]) => `<div class="br2"><span title="${esc(k)}">${esc(k)}</span><span class="tr"><i data-w="${Math.round(v / mx * 100)}"></i></span><b>${v}</b></div>`).join('') : '<p class="hint">Nothing yet</p>'}</div>`; };
  const tot = both + vo + qo;
  $('#mix').innerHTML = `<div class="facts"><div class="fact"><b>${num(both)}</b><span>days with video and questions</span></div><div class="fact"><b>${num(qo)}</b><span>question-only days</span></div></div>` +
    bars('Platforms (days used)', tally(e => sp(e.w)).slice(0, 6)) + bars('Topics practised', tally(e => uniq([...sp(e.tp), ...sp(e.rv)])).slice(0, 7)) + bars('Difficulty (days)', tally(e => sp(e.ty))) +
    (tally(e => sp(e.co)).length ? bars('Company prep (days)', tally(e => sp(e.co)).slice(0, 5)) : '');
  fit();
}

function renderStreakCard() {
  const c = calc(), live = c.doneToday ? todayISO() : todayISO(1), nb = MS.find(m => m > c.best);
  $('#badges').innerHTML = MS.filter(m => m <= c.best).map(m => `<li class="badge on" title="Reached a ${m}-day streak"><b>${m}</b><span>days</span></li>`).join('') + (nb ? `<li class="badge" title="Locked: ${nb}-day streak"><b>${nb}</b><span>locked</span></li>` : '');
  const top = c.runs.filter(r => r.n >= 2).sort((a, b) => b.n - a.n || (a.e < b.e ? 1 : -1)).slice(0, 5);
  $('#runs').innerHTML = top.length ? top.map(r => `<li><b>${plural(r.n, 'day')}</b><span>${fmtShort(r.s)} to ${fmtShort(r.e)}</span>${c.cur > 0 && r.e === live ? '<em class="tag add">Current</em>' : ''}</li>`).join('') : '<li class="hint">No streaks of 2 or more days yet.</li>';
}
function renderRadar() {
  const m = new Map(), now = parse(todayISO());
  for (const e of entries) for (const t of uniq([...sp(e.tp), ...sp(e.rv)])) { if (t === 'Contest' || t === 'POTD') continue; const x = m.get(t) || { n: 0, last: '' }; x.n++; if (e.d > x.last) x.last = e.d; m.set(t, x); }
  const due = [...m].filter(([, x]) => x.n >= 3).map(([t, x]) => ({ t, n: x.n, last: x.last, days: Math.floor((now - parse(x.last)) / 864e5) })).filter(x => x.days >= 7)
    .sort((a, b) => b.days * Math.log2(b.n + 1) - a.days * Math.log2(a.n + 1)).slice(0, 6);
  $('#radar').innerHTML = due.length ? due.map(x => `<li><div><b>${esc(x.t)}</b><span>Last practised ${x.days} days ago · ${plural(x.n, 'day')} total</span></div><button type="button" class="chip" data-rev="${esc(x.t)}" aria-label="Log a revision of ${esc(x.t)}">Revise</button></li>`).join('') : '<li class="hint">Nothing overdue. Topics you have practised 3+ times appear here after a week without revision.</li>';
}
const msLeft = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n; };
const fmtLeft = ms => `${Math.floor(ms / 36e5)}h ${Math.floor(ms % 36e5 / 6e4)}m`;
function renderRemind() {
  const c = calc(), el = $('#remind');
  if (c.doneToday) { el.className = 'remind ok'; el.innerHTML = `<span>Done for today. Your streak is ${plural(c.cur, 'day')}. See you tomorrow.</span>`; el.hidden = false; return; }
  const urgent = c.cur > 0 && msLeft() < 3 * 36e5;
  el.className = 'remind' + (urgent ? ' urgent' : '');
  el.innerHTML = `<span>${c.cur > 0 ? `Log something today to keep your ${plural(c.cur, 'day')} streak. ${fmtLeft(msLeft())} left.` : 'No streak running. Log today to start a new one.'}</span><button type="button" class="btn" id="remindBtn">Log now</button>`; el.hidden = false;
}
function checkReminder() {
  if (!settings.rOn || calc().doneToday) return;
  const n = new Date(), hm = `${pad(n.getHours())}:${pad(n.getMinutes())}`; let last = ''; try { last = localStorage.getItem('dsa.tracker.lastRemind') || ''; } catch { /* blocked */ }
  if (hm < settings.rTime || last === todayISO()) return;
  try { localStorage.setItem('dsa.tracker.lastRemind', todayISO()); } catch { /* blocked */ }
  const msg = calc().cur > 0 ? `Keep your ${plural(calc().cur, 'day')} streak alive: log today's DSA work.` : 'Log today’s DSA work to start a streak.';
  toast(msg); if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('DSA Journey', { body: msg }); } catch { /* unsupported */ } }
}
function showCelebration(n) {
  const cf = $('#cf'); cf.innerHTML = ''; const cols = ['#ff9a00', '#2457ff', '#0b7a53', '#e0409a', '#ffd24d'];
  for (let i = 0; i < 28; i++) { const p = document.createElement('i'); p.style.setProperty('--x', Math.round(Math.random() * 100) + '%'); p.style.setProperty('--c', cols[i % cols.length]); p.style.setProperty('--t', (1.8 + Math.random() * 1.6).toFixed(2) + 's'); p.style.setProperty('--d', (Math.random() * .6).toFixed(2) + 's'); cf.appendChild(p); }
  $('#celN').textContent = n; $('#celT').textContent = `${n}-day streak!`; $('#celP').textContent = `You have logged ${plural(n, 'day')} in a row. Next milestone: ${nextMs(n)} days.`;
  const d = $('#cel'); d.showModal ? d.showModal() : d.setAttribute('open', ''); $('#celX').focus();
}

/* ---------- daily log ---------- */
function filtered() {
  const q = filt.q.trim().toLowerCase(), by = filt.sort === 'asc' ? 1 : -1;
  return entries.filter(e => (filt.ph === 'all' || e.ph === filt.ph) && (filt.yr === 'all' || e.d.startsWith(filt.yr)) && (!filt.rev || e.r > 0) && (!filt.day || e.d === filt.day) &&
    (filt.pl === 'all' || sp(e.w).includes(filt.pl)) && (filt.act === 'all' || (filt.act === 'both' ? e.v && e.p : filt.act === 'video' ? e.v && !e.p : e.p && !e.v)) &&
    (!q || [e.v, e.w, e.tp, e.rv, e.co, e.ty, e.nt, e.d, fmtShort(e.d)].join(' ').toLowerCase().includes(q))).sort((a, b) => a.d < b.d ? -by : a.d > b.d ? by : 0);
}
function recHTML(e) {
  const dl = [['Video topic', e.v], ['Platforms', e.w], ['Company prep', e.co], ['Topics solved', e.tp], ['Topics revised', e.rv], ['Difficulty', e.ty], ['Completed', e.ok], ['Test cases', e.tc], ['Time spent', fmtMin(e.t)], ['Notes', e.nt]].filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  const sub = [e.w, e.co, e.tp].filter(Boolean).join(' · ') || (e.v ? '' : 'Time only');
  return `<li class="rec"><button type="button" class="rh" aria-expanded="false" aria-controls="d-${esc(e.id)}">
    <span class="d"><b>${+e.d.slice(8)}</b><small>${MON[+e.d.slice(5, 7) - 1]} ${L(e.d, { weekday: 'short' })}</small></span>
    <span class="sum"><b>${e.v ? 'Video: ' + esc(e.v) : e.p ? plural(e.p, 'problem') + ' solved' : 'Logged time'}</b><span>${esc(sub)}</span></span>
    <span class="act">${e.v ? '<span class="k2 kv">Video</span>' : ''}${e.p ? '<span class="k2 kq">Questions</span>' : ''}${e.n ? `<i class="pn">${e.n} new</i>` : ''}${e.r ? `<i class="pr">${e.r} revised</i>` : ''}</span>
    <span class="tm">${e.t != null ? fmtMin(e.t) : ''}</span><span class="st ${e.ok === 'Yes' ? 'ok' : e.ok === 'No' ? 'no' : ''}">${e.ok === 'Yes' ? '✓ Completed' : e.ok === 'No' ? 'Not completed' : ''}</span></button>
    <div class="det" id="d-${esc(e.id)}" hidden><dl>${dl || '<dt>Details</dt><dd>None recorded</dd>'}</dl><div class="da"><span class="tag">${e.ph}</span>${e.src === 'user' ? `<span class="tag add">${e.ov ? 'Edited here' : 'Added here'}</span>` : ''}<button type="button" class="btn" data-edit="${esc(e.id)}">Edit</button><button type="button" class="btn dl" data-del="${esc(e.id)}">Delete</button></div></div></li>`;
}
function renderList() {
  const rows = filtered(), pages = Math.max(1, Math.ceil(rows.length / PAGE));
  page = Math.min(page, pages);
  $('#count').textContent = plural(rows.length, 'entry', 'entries');
  const months = new Map(); for (const e of rows) { const k = e.d.slice(0, 7), m = months.get(k) || { p: 0, d: new Set() }; m.p += e.p; m.d.add(e.d); months.set(k, m); }
  let last = '', html = '';
  for (const e of rows.slice((page - 1) * PAGE, page * PAGE)) {
    const k = e.d.slice(0, 7);
    if (k !== last) { const m = months.get(k); html += `<li class="mh"><b>${L(e.d, { month: 'long', year: 'numeric' })}</b><span>${plural(m.p, 'problem')} · ${plural(m.d.size, 'active day')}</span></li>`; last = k; }
    html += recHTML(e);
  }
  $('#list').innerHTML = html || `<li class="empty">${entries.length ? 'No entries match these filters. Try clearing them.' : 'No entries yet. Use “Log a day” to add your first one.'}</li>`;
  $('#flt').innerHTML = filt.day ? `<button type="button" class="chip" id="clrDay" aria-label="Clear day filter">Day: ${fmtShort(filt.day)} ×</button>` : '';
  $('#pageInfo').textContent = `Page ${page} of ${pages}`; $('#prev').disabled = page <= 1; $('#next').disabled = page >= pages;
}
function renderFilterOpts() {
  const fy = $('#fYear').value || 'all'; $('#fYear').innerHTML = '<option value="all">All years</option>' + YEARS.slice().reverse().map(y => `<option>${y}</option>`).join(''); $('#fYear').value = fy === 'all' || YEARS.includes(+fy) ? fy : 'all';
  const pl = uniq([...PLATFORMS, ...tally(e => sp(e.w)).map(x => x[0])]);
  $('#fPlat').innerHTML = '<option value="all">All platforms</option>' + pl.map(p => `<option>${esc(p)}</option>`).join(''); $('#fPlat').value = pl.includes(filt.pl) ? filt.pl : 'all';
}
function renderAll() { dayKey = todayISO(); renderTop(); renderStreakCard(); renderRadar(); renderRemind(); renderYears(); renderHeat(); renderChart(); renderMix(); renderFilterOpts(); renderList(); }
function toast(msg, bad) { const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : ''); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 3800); }
function route() { view = location.hash === '#log' ? 'log' : 'overview'; $('#vOverview').hidden = view !== 'overview'; $('#vLog').hidden = view !== 'log'; $('#tOverview').toggleAttribute('aria-current', view === 'overview'); $('#tLog').toggleAttribute('aria-current', view === 'log');
  $$('.tabs a').forEach(a => a.getAttribute('aria-current') !== null ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')); }

/* ---------- entry form ---------- */
const dlg = $('#dlg'); let F = null;
const GROUPS = ['w', 'co', 'tp', 'rv', 'ty'];
const suggest = g => g === 'w' ? PLATFORMS : g === 'ty' ? DIFF : g === 'co' ? uniq([...DEF_CO, ...tally(e => sp(e.co)).map(x => x[0])]) : tally(e => uniq([...sp(e.tp), ...sp(e.rv)])).map(x => x[0]).slice(0, 14);
function chips(g) {
  const opts = uniq([...suggest(g), ...F.sel[g]]);
  $(`[data-cg="${g}"]`).innerHTML = opts.map(o => `<button type="button" class="chip" data-g="${g}" data-v="${esc(o)}" aria-pressed="${F.sel[g].has(o)}">${esc(o)}</button>`).join('');
}
function syncForm() {
  $$('.kind').forEach(b => b.setAttribute('aria-pressed', String(F.k[b.dataset.k]))); $('#secV').hidden = !F.k.v; $('#secQ').hidden = !F.k.q; $('#rvBox').hidden = !(+$('#fRevN').value > 0);
  $$('[data-seg]').forEach(s => s.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(F[s.dataset.seg] === c.dataset.v))));
}
function openForm(e, pre) {
  const last = entries.find(x => x.w);
  F = { id: e && e.src === 'user' ? e.id : null, ov: e ? (e.src === 'file' ? e.id : e.ov) : '', ph: e ? e.ph : null, k: { v: e ? !!e.v : false, q: e ? e.p > 0 : true }, ok: e ? e.ok : '', tc: e ? e.tc : '',
    sel: { w: new Set(e ? sp(e.w) : last ? sp(last.w) : []), co: new Set(e ? sp(e.co) : []), tp: new Set(e ? sp(e.tp) : []), rv: new Set(e ? sp(e.rv) : []), ty: new Set(e ? sp(e.ty) : []) } };
  $('#form').reset(); $('#fErr').textContent = ''; $('#dlgT').textContent = e ? 'Edit entry' : 'Log a day'; $('#saveAgain').hidden = !!e;
  $('#fDate').max = todayISO(); $('#fDate').value = e ? e.d : todayISO();
  $('#fNew').value = e ? e.n : 0; $('#fRevN').value = e ? e.r : 0; $('#fVid').value = e ? e.v : ''; $('#fNote').value = e ? e.nt : '';
  $('#fH').value = e && e.t != null ? Math.floor(e.t / 60) : ''; $('#fM').value = e && e.t != null ? e.t % 60 : '';
  if (pre) { $('#fRevN').value = 1; F.sel.rv.add(pre.rv); }
  $('#vidList').innerHTML = tally(x => x.v ? [x.v] : []).slice(0, 40).map(x => `<option value="${esc(x[0])}">`).join('');
  GROUPS.forEach(chips); syncForm();
  dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', ''); (e ? $('#fDate') : $('#fNew')).focus();
}
const closeForm = () => dlg.close ? dlg.close() : dlg.removeAttribute('open');
function addChip(inp) {
  const v = inp.value.trim().replace(/\s+/g, ' '); if (!v || /[<>]/.test(v)) return;
  const g = inp.dataset.g, found = [...suggest(g), ...F.sel[g]].find(o => o.toLowerCase() === v.toLowerCase());
  F.sel[g].add(found || v); inp.value = ''; chips(g);
}
function submitForm(ev) {
  ev.preventDefault(); const again = ev.submitter && ev.submitter.dataset.again;
  const d = $('#fDate').value, ints = id => { const v = $(id).value; return v === '' ? 0 : /^\d+$/.test(v) ? +v : NaN; };
  const N = F.k.q ? ints('#fNew') : 0, R = F.k.q ? ints('#fRevN') : 0, H = ints('#fH'), M = ints('#fM'), hasT = $('#fH').value !== '' || $('#fM').value !== '';
  const vid = F.k.v ? $('#fVid').value.trim() : '', mins = H * 60 + M; let err = '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(parse(d))) err = 'Choose a valid date.';
  else if (d < `${START_YEAR}-01-01`) err = `The date must be on or after 1 Jan ${START_YEAR}.`;
  else if (d > todayISO()) err = 'The date cannot be in the future.';
  else if (F.k.v && !vid) err = 'Enter the video topic, or switch Video off.';
  else if ([N, R].some(x => isNaN(x) || x > 500)) err = 'Problem counts must be whole numbers from 0 to 500.';
  else if (F.k.q && N + R === 0) err = 'Add at least one new or revised problem, or switch Questions off.';
  else if (isNaN(H) || isNaN(M) || H > 24 || M > 59) err = 'Enter hours (0–24) and minutes (0–59) as whole numbers.';
  else if (!F.k.v && !F.k.q && !(hasT && mins > 0)) err = 'Choose Video, Questions or enter the time spent.';
  if (err) { $('#fErr').textContent = err; return; }
  const q = F.k.q, pick = g => q ? [...F.sel[g]] : [], order = DIFF.filter(x => F.sel.ty.has(x));
  const rec = { id: F.id || newId(), d, ph: F.ph ? (F.ph === 'Learning' ? 'L' : 'C') : (d < '2025-12-02' ? 'L' : 'C'), n: N, r: R, t: hasT ? mins : null, v: vid,
    w: pick('w').join(', '), co: pick('co').join(', '), tp: pick('tp').join(', '), rv: R > 0 ? pick('rv').join(', ') : '', ty: q ? order.join(', ') : '', ok: q ? F.ok : '', tc: q ? F.tc : '', nt: $('#fNote').value.trim(), ts: Date.now(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
  if (F.ov) rec.ov = F.ov;
  const before = calc().cur, base = F.id || F.ov ? 'Entry updated.' : 'Entry saved.';
  const i = user.findIndex(u => u.id === rec.id); i >= 0 ? user[i] = rec : user.push(rec);
  const saved = save(); build(); year = +d.slice(0, 4); page = 1;
  const after = calc().cur; if (after > before) { anim = before; pop = true; } renderAll(); closeForm();
  if (!saved) toast('Entry added, but this browser blocked saving. Export to Excel to keep it.', true);
  else if (after > before) { toast(`${base} Streak: ${plural(after, 'day')}.`); if (isMilestone(after)) { showCelebration(after); return; } }
  else toast(base);
  if (again) openForm();
}
function deleteEntry(id) {
  const e = entries.find(x => x.id === id); if (!e || !confirm(`Delete the entry for ${fmtShort(e.d)}? This cannot be undone.`)) return;
  const ov = e.src === 'file' ? e.id : e.ov; user = user.filter(u => u.id !== e.id); if (ov) user.push({ id: newId(), ov, del: true });
  save(); build(); renderAll(); toast('Entry deleted.');
}

/* ---------- export ---------- */
function exportXlsx() {
  if (!window.XLSX) { toast('The Excel library did not load. Check your connection and try again.', true); return; }
  const head = ['Date', 'Year', 'Month', 'Phase', 'Total problems', 'New solved', 'Revised', 'Time (min)', 'Time', 'Video topic', 'Platforms', 'Company prep', 'Topics solved', 'Topics revised', 'Difficulty', 'Completed', 'Test cases', 'Notes', 'Source'];
  const rows = entries.slice().reverse().map(e => [e.d, +e.d.slice(0, 4), MON[+e.d.slice(5, 7) - 1], e.ph, e.p, e.n, e.r, e.t == null ? '' : e.t, e.t == null ? '' : fmtMin(e.t), e.v, e.w, e.co, e.tp, e.rv, e.ty, e.ok, e.tc, e.nt, e.src === 'user' ? (e.ov ? 'Edited in app' : 'Added in app') : 'Excel import']);
  const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
  ws['!cols'] = [12, 6, 7, 10, 9, 9, 8, 9, 9, 24, 22, 18, 26, 26, 14, 10, 10, 40, 13].map(wch => ({ wch })); ws['!autofilter'] = { ref: `A1:S${rows.length + 1}` };
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'All Entries');
  try { XLSX.writeFile(wb, `DSA_Tracker_${todayISO()}.xlsx`); toast(`Exported ${plural(rows.length, 'entry', 'entries')}.`); } catch { toast('Export failed. Try again or use a different browser.', true); }
}

/* ---------- wiring ---------- */
function goLog(patch) { Object.assign(filt, patch); page = 1; location.hash = '#log'; route(); renderList(); window.scrollTo(0, 0); }
function init() {
  build();
  year = new Date().getFullYear();
  const yearly = () => { renderYears(); renderHeat(); renderChart(); };
  $('#years').onclick = e => { const b = e.target.closest('.yr'); if (b) { year = +b.dataset.y; yearly(); } };
  $('#heat').onclick = e => { const c = e.target.closest('.cell'); if (c) goLog({ day: c.dataset.d, q: '', ph: 'all', yr: 'all', pl: 'all', act: 'all', rev: false }); };
  const bind = (id, k, ev = 'onchange') => { $(id)[ev] = e => { filt[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; page = 1; renderList(); }; };
  bind('#q', 'q', 'oninput'); bind('#fPhase', 'ph'); bind('#fYear', 'yr'); bind('#fPlat', 'pl'); bind('#fAct', 'act'); bind('#fSort', 'sort'); bind('#fRev', 'rev');
  $('#clear').onclick = () => { Object.assign(filt, { q: '', ph: 'all', yr: 'all', pl: 'all', act: 'all', rev: false, day: '', sort: 'desc' });
    ['#q', '#fPhase', '#fYear', '#fPlat', '#fAct', '#fSort'].forEach(i => { $(i).value = i === '#q' ? '' : i === '#fSort' ? 'desc' : 'all'; }); $('#fRev').checked = false; page = 1; renderList(); };
  $('#flt').onclick = e => { if (e.target.closest('#clrDay')) { filt.day = ''; renderList(); } };
  $('#prev').onclick = () => { page--; renderList(); window.scrollTo(0, 0); }; $('#next').onclick = () => { page++; renderList(); window.scrollTo(0, 0); };
  $('#list').onclick = e => {
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (ed) return openForm(entries.find(x => x.id === ed.dataset.edit)); if (del) return deleteEntry(del.dataset.del);
    const b = e.target.closest('.rh'); if (!b) return; const open = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!open)); document.getElementById(b.getAttribute('aria-controls')).hidden = open;
  };
  const form = $('#form');
  form.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.k) { F.k[t.dataset.k] = !F.k[t.dataset.k]; syncForm(); }
    else if (t.dataset.g) { const s = F.sel[t.dataset.g]; s.has(t.dataset.v) ? s.delete(t.dataset.v) : s.add(t.dataset.v); t.setAttribute('aria-pressed', String(s.has(t.dataset.v))); }
    else if (t.dataset.step) { const i = $('#' + t.dataset.step); i.value = Math.min(500, Math.max(0, (+i.value || 0) + +t.dataset.d)); syncForm(); }
    else if (t.dataset.pre) { $('#fH').value = Math.floor(+t.dataset.pre / 60); $('#fM').value = +t.dataset.pre % 60; }
    else if (t.dataset.day) { $('#fDate').value = todayISO(+t.dataset.day); }
    else if (t.closest('[data-seg]')) { const k = t.closest('[data-seg]').dataset.seg; F[k] = F[k] === t.dataset.v ? '' : t.dataset.v; syncForm(); }
  });
  form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('addin')) { e.preventDefault(); addChip(e.target); } });
  form.addEventListener('focusout', e => { if (e.target.classList.contains('addin') && e.target.value.trim()) addChip(e.target); });
  $('#fRevN').addEventListener('input', syncForm);
  form.onsubmit = submitForm; $('#cancel').onclick = closeForm;
  $('#addBtn').onclick = () => openForm(); $('#exportBtn').onclick = exportXlsx;
  $('#fDate').min = `${START_YEAR}-01-01`;
  $('#rOn').checked = settings.rOn; $('#rTime').value = settings.rTime; $('#gGoal').value = settings.goal || '';
  $('#rOn').onchange = e => { settings.rOn = e.target.checked; saveSettings(); if (settings.rOn && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission(); toast(settings.rOn ? `Reminder set for ${settings.rTime}. It fires while this page is open.` : 'Daily reminder off.'); };
  $('#rTime').onchange = e => { if (/^\d\d:\d\d$/.test(e.target.value)) { settings.rTime = e.target.value; saveSettings(); } };
  $('#gGoal').onchange = e => { const v = e.target.value.trim(), n = v === '' ? 0 : /^\d+$/.test(v) ? +v : NaN;
    if (isNaN(n) || n > 100) { toast('Goal must be a whole number from 1 to 100, or empty for none.', true); e.target.value = settings.goal || ''; return; } settings.goal = n; saveSettings(); renderTop(); };
  $('#radar').onclick = e => { const b = e.target.closest('[data-rev]'); if (b) openForm(null, { rv: b.dataset.rev }); };
  $('#remind').onclick = e => { if (e.target.closest('#remindBtn')) openForm(); };
  $('#celX').onclick = () => $('#cel').close ? $('#cel').close() : $('#cel').removeAttribute('open');
  setInterval(() => { if (todayISO() !== dayKey) renderAll(); else renderRemind(); checkReminder(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (todayISO() !== dayKey) renderAll(); else renderRemind(); checkReminder(); } });
  anim = 0; window.addEventListener('hashchange', route); route(); renderAll(); checkReminder();
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
