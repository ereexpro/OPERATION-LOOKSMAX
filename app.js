'use strict';
/* OPERATION LOOKSMAX — core logic (testable in Node) + UI */
const CATS = [
  ['DISCIPLINE', 25, ['Wake up at 06:00 without snoozing.', 'Write 3 primary objectives for the day.', 'Complete the hardest task before secondary tasks.', 'No phone use during study sessions.', 'Finish what you start before switching tasks.', 'Do not postpone important tasks without a valid reason.', 'Organize your room or workspace.', "Prepare tomorrow's clothes and essentials.", 'Go to sleep at 22:00.']],
  ['MENTAL TOUGHNESS', 20, ['Complete a difficult task you have been avoiding.', 'Complete 30 minutes of focused work without distraction.', 'Accept mistakes without making excuses.', 'Resist procrastination and return to the task immediately.', 'Face one personal weakness and work on it.', 'Review your decisions and mistakes honestly.', 'Do not quit only because motivation is low.']],
  ['PHYSICAL DEVELOPMENT', 10, ['Complete the scheduled workout for today.', 'Record weights and repetitions.']],
  ['APPEARANCE', 10, ['Wash your face in the morning.', 'Wash your face in the evening.', 'Apply facial moisturizer.', 'Brush your teeth twice.', 'Style your hair.', 'Wear clean, coordinated clothes.', 'Shower when needed.']],
  ['RECOVERY', 10, ['Put your phone away before sleep.', 'Drink water regularly.', 'Get 8–10 hours of sleep.']],
  ['EDUCATION', 15, ['Complete school study.', 'Learn Spanish.', 'Review what you learned.', 'Identify one academic weakness and work on it.']],
  ['FINAL INSPECTION', 10, ['Review all missions.', 'Record failed missions honestly.', 'Analyze the cause of each failure.', 'Write a correction plan for tomorrow.', 'Set the top 3 objectives for tomorrow.']]
];
const MISSIONS = [];
CATS.forEach((c, ci) => c[2].forEach(t => MISSIONS.push({ id: MISSIONS.length + 1, cat: ci, text: t, pts: c[1] / c[2].length })));
const STATUS = ['PENDING', 'DONE', 'FAILED', 'N/A'];
const TRACKERS = [
  { k: 'water', l: 'WATER', u: 'liters', max: 20, step: 0.1 },
  { k: 'sleep', l: 'SLEEP', u: 'hours', max: 24, step: 0.25 },
  { k: 'study', l: 'SCHOOL STUDY', u: 'minutes', max: 1440, step: 5 },
  { k: 'spanish', l: 'SPANISH LEARNING', u: 'minutes', max: 1440, step: 5 }
];
const KEY = 'operation-looksmax.v1';

/* ---------- dates (local time, YYYY-MM-DD) ---------- */
const p2 = n => String(n).padStart(2, '0');
const fmt = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && fmt(parse(s)) === s;
const todayStr = () => fmt(new Date());

/* ---------- data ---------- */
const emptyDay = () => ({ m: {}, t: {}, r: { why: {}, analysis: '', plan: '', top3: ['', '', ''] } });
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
function cleanDay(raw) {
  const d = emptyDay();
  if (!raw || typeof raw !== 'object') return d;
  if (raw.m && typeof raw.m === 'object') for (const id in raw.m) if (/^\d+$/.test(id) && +id >= 1 && +id <= 37 && STATUS.includes(raw.m[id]) && raw.m[id] !== 'PENDING') d.m[id] = raw.m[id];
  if (raw.t && typeof raw.t === 'object') TRACKERS.forEach(t => { const v = raw.t[t.k]; if (typeof v === 'number' && isFinite(v) && v >= 0 && v <= t.max) d.t[t.k] = v; });
  const r = raw.r;
  if (r && typeof r === 'object') {
    if (r.why && typeof r.why === 'object') for (const id in r.why) if (/^\d+$/.test(id) && +id >= 1 && +id <= 37) d.r.why[id] = str(r.why[id], 1000);
    d.r.analysis = str(r.analysis, 3000); d.r.plan = str(r.plan, 3000);
    if (Array.isArray(r.top3)) d.r.top3 = [0, 1, 2].map(i => str(r.top3[i], 300));
  }
  return d;
}
function cleanStore(raw) {
  const out = { days: {} };
  if (raw && typeof raw === 'object' && raw.days && typeof raw.days === 'object') for (const k in raw.days) if (validDate(k)) out.days[k] = cleanDay(raw.days[k]);
  return out;
}

/* ---------- scoring ---------- */
function calc(day) {
  let earned = 0, poss = 0; const c = { DONE: 0, FAILED: 0, PENDING: 0, 'N/A': 0 };
  MISSIONS.forEach(m => {
    const s = day.m[m.id] || 'PENDING'; c[s]++;
    if (s === 'N/A') return;
    poss += m.pts; if (s === 'DONE') earned += m.pts;
  });
  return { earned, poss, counts: c, score: poss > 0 ? earned / poss * 100 : null };
}
function classify(s) {
  if (s === null) return 'NO DATA';
  const r = Math.round(s * 10) / 10;
  return r >= 95 ? 'ELITE DAY' : r >= 85 ? 'STRONG DAY' : r >= 70 ? 'ACCEPTABLE' : r >= 50 ? 'WEAK DAY' : 'MISSION FAILURE';
}
const isLogged = day => Object.keys(day.m).length > 0;

/* ---------- rank (from saved records; rolling 7-day blocks ending today, >=5 logged days each) ---------- */
function weekAvg(days, end, k) {
  const e = addDays(end, -7 * k); let sum = 0, n = 0;
  for (let i = 0; i < 7; i++) {
    const d = days[addDays(e, -i)];
    if (d && isLogged(d)) { const s = calc(d).score; if (s !== null) { sum += s; n++; } }
  }
  return n >= 5 ? sum / n : null;
}
function streak(days, end, th, max) {
  let n = 0;
  while (n < max) { const a = weekAvg(days, end, n); if (a === null || a < th) break; n++; }
  return n;
}
function rankInfo(days, end) {
  const logged = Object.keys(days).filter(k => isLogged(days[k])).length;
  const a0 = weekAvg(days, end, 0);
  const s80 = streak(days, end, 80, 1), s85 = streak(days, end, 85, 2), s90 = streak(days, end, 90, 4);
  const avgTxt = a0 === null ? 'n/a (needs 5 logged days in last 7)' : a0.toFixed(1) + '%';
  if (s90 >= 4) return { rank: 'ELITE', next: null, pct: 100, text: 'Highest rank. Hold 90%+ weekly averages.' };
  if (s85 >= 2) return { rank: 'OPERATOR', next: 'ELITE', pct: s90 / 4 * 100, text: `${s90}/4 consecutive weeks at 90%+. Current 7-day avg: ${avgTxt}` };
  if (s80 >= 1) return { rank: 'SOLDIER', next: 'OPERATOR', pct: s85 / 2 * 100, text: `${s85}/2 consecutive weeks at 85%+. Current 7-day avg: ${avgTxt}` };
  if (logged < 7) return { rank: 'RECRUIT', next: 'SOLDIER', pct: logged / 7 * 100, text: `Baseline: ${logged}/7 days logged. Then reach a 80%+ weekly average.` };
  return { rank: 'RECRUIT', next: 'SOLDIER', pct: a0 === null ? 0 : Math.min(100, a0 / 80 * 100), text: `Baseline complete. Need 80%+ weekly average. Current 7-day avg: ${avgTxt}` };
}

if (typeof module !== 'undefined') module.exports = { MISSIONS, CATS, TRACKERS, calc, classify, rankInfo, weekAvg, cleanStore, cleanDay, addDays, validDate, fmt, parse, emptyDay };

/* ---------- UI ---------- */
if (typeof document !== 'undefined') (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let store = { days: {} };
  try { const raw = localStorage.getItem(KEY); if (raw) store = cleanStore(JSON.parse(raw)); }
  catch (e) { try { localStorage.setItem(KEY + '.corrupt', localStorage.getItem(KEY) || ''); } catch (_) {} store = { days: {} }; }
  let sel = todayStr(), tab = 'ops';
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { toast('Storage full or blocked: data not saved!'); } };
  const day = () => store.days[sel] || emptyDay();
  const edit = fn => { if (!store.days[sel]) store.days[sel] = emptyDay(); fn(store.days[sel]); save(); };
  function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2500); }

  function renderScore() {
    const r = calc(day()), c = r.counts;
    const big = r.score === null ? '--' : Math.round(r.score * 10) / 10;
    $('score').innerHTML = r.score === null
      ? `<div class="empty">ALL MISSIONS MARKED N/A<br><small>No applicable missions, so no score is calculated for this day.</small></div>`
      : `<div class="big">${big}<span>/100</span></div><div class="cls">${classify(r.score)}</div><div class="bar"><i style="width:${r.score}%"></i></div>`;
    $('score').innerHTML += `<div class="cnt"><b>${c.DONE}</b>DONE<b>${c.FAILED}</b>FAILED<b>${c.PENDING}</b>PENDING<b>${c['N/A']}</b>N/A</div>`;
  }
  function renderOps() {
    const d = day(); let h = '';
    CATS.forEach((c, ci) => {
      h += `<h3>${String(ci + 1).padStart(2, '0')} — ${c[0]} <small>${c[1]} PTS</small></h3>`;
      MISSIONS.filter(m => m.cat === ci).forEach(m => {
        const s = d.m[m.id] || 'PENDING';
        h += `<div class="m s-${s.replace('/', '')}"><p><em>${m.id}</em> ${esc(m.text)}</p><div class="st">` +
          STATUS.map(x => `<button data-id="${m.id}" data-s="${x}" class="${x === s ? 'on' : ''}">${x === 'PENDING' ? 'PEND' : x === 'FAILED' ? 'FAIL' : x}</button>`).join('') + '</div></div>';
      });
    });
    return h;
  }
  function renderTrack() {
    const d = day(); let h = '<h3>DAILY TRACKERS</h3>';
    TRACKERS.forEach(t => {
      const v = d.t[t.k];
      h += `<label class="tr"><span>${t.l}<small>${t.u}</small></span><input type="number" inputmode="decimal" min="0" max="${t.max}" step="${t.step}" data-t="${t.k}" value="${v === undefined ? '' : v}" placeholder="0"><b>${v === undefined ? '—' : v + ' ' + t.u}</b></label>`;
    });
    h += '<h3>FINAL INSPECTION</h3><h4>Failed missions &amp; reasons</h4>';
    const failed = MISSIONS.filter(m => d.m[m.id] === 'FAILED');
    h += failed.length ? failed.map(m => `<label class="fl"><span>${m.id}. ${esc(m.text)}</span><input type="text" maxlength="1000" data-why="${m.id}" value="${esc(d.r.why[m.id] || '')}" placeholder="Reason (no excuses)"></label>`).join('') : '<p class="mut">No failed missions recorded for this date.</p>';
    h += `<h4>Analysis of failures</h4><textarea data-r="analysis" maxlength="3000">${esc(d.r.analysis)}</textarea>
      <h4>Correction plan for tomorrow</h4><textarea data-r="plan" maxlength="3000">${esc(d.r.plan)}</textarea>
      <h4>Top 3 objectives for tomorrow</h4>` + [0, 1, 2].map(i => `<input type="text" maxlength="300" data-top="${i}" value="${esc(d.r.top3[i])}" placeholder="Objective ${i + 1}">`).join('');
    return h;
  }
  function renderIntel() {
    const ri = rankInfo(store.days, todayStr()), a = weekAvg(store.days, sel, 0);
    let h = `<div class="card"><div class="mut">CURRENT RANK</div><div class="rank">${ri.rank}</div><div class="mut">${ri.next ? 'PROGRESS TO ' + ri.next : 'MAX RANK'}</div><div class="bar"><i style="width:${ri.pct}%"></i></div><p class="mut">${esc(ri.text)}</p></div>`;
    h += `<div class="card"><div class="mut">WEEKLY AVERAGE (7 days ending ${sel})</div><div class="rank">${a === null ? 'N/A' : a.toFixed(1) + '%'}</div><p class="mut">Requires at least 5 logged days in the window.</p></div>`;
    const logged = Object.keys(store.days).filter(k => isLogged(store.days[k])).sort().reverse();
    h += '<h3>HISTORY (latest 14 logged days)</h3>';
    h += logged.length ? logged.slice(0, 14).map(k => { const r = calc(store.days[k]); return `<div class="hist" data-go="${k}"><span>${k}</span><div class="bar"><i style="width:${r.score || 0}%"></i></div><b>${r.score === null ? 'N/A' : Math.round(r.score) + '%'}</b></div>`; }).join('') : '<p class="mut">No logged days yet.</p>';
    h += '<h3>MISSION STATISTICS</h3>';
    if (!logged.length) return h + '<p class="mut">Statistics appear once missions are logged.</p>';
    const st = MISSIONS.map(m => { let dn = 0, ap = 0, f = 0; logged.forEach(k => { const s = store.days[k].m[m.id] || 'PENDING'; if (s !== 'N/A') ap++; if (s === 'DONE') dn++; if (s === 'FAILED') f++; }); return { m, dn, ap, f }; });
    CATS.forEach((c, ci) => { const x = st.filter(s => s.m.cat === ci), dn = x.reduce((q, s) => q + s.dn, 0), ap = x.reduce((q, s) => q + s.ap, 0), p = ap ? dn / ap * 100 : 0; h += `<div class="hist"><span>${c[0]}</span><div class="bar"><i style="width:${p}%"></i></div><b>${ap ? Math.round(p) + '%' : '—'}</b></div>`; });
    const worst = st.filter(s => s.f > 0).sort((a, b) => b.f - a.f).slice(0, 5);
    h += '<h4>Most failed missions</h4>' + (worst.length ? worst.map(s => `<p class="mut">${s.m.id}. ${esc(s.m.text)} — failed ${s.f}×</p>`).join('') : '<p class="mut">None.</p>');
    return h;
  }
  function renderData() {
    return `<h3>DATA</h3><p class="mut">All data lives only on this device. Export regularly to keep a backup.</p>
      <button class="btn" id="exp">EXPORT JSON</button><button class="btn" id="imp">IMPORT JSON</button><input type="file" id="file" accept="application/json,.json" hidden>
      <button class="btn danger" id="rst">RESET ALL DATA</button>`;
  }
  function render() {
    $('date').value = sel; renderScore();
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('view').innerHTML = { ops: renderOps, track: renderTrack, intel: renderIntel, data: renderData }[tab]();
  }
  function go(s) { if (validDate(s)) { sel = s; render(); } }

  $('prev').onclick = () => go(addDays(sel, -1));
  $('next').onclick = () => go(addDays(sel, 1));
  $('today').onclick = () => go(todayStr());
  $('date').onchange = e => go(e.target.value);
  document.querySelector('nav').onclick = e => { const t = e.target.closest('button'); if (t) { tab = t.dataset.tab; render(); window.scrollTo(0, 0); } };
  $('view').addEventListener('click', e => {
    const b = e.target.closest('button'), h = e.target.closest('[data-go]');
    if (h) { sel = h.dataset.go; tab = 'ops'; render(); return; }
    if (!b) return;
    if (b.dataset.id) { edit(d => { if (b.dataset.s === 'PENDING') delete d.m[b.dataset.id]; else d.m[b.dataset.id] = b.dataset.s; }); const y = scrollY; render(); scrollTo(0, y); }
    else if (b.id === 'exp') {
      const blob = new Blob([JSON.stringify({ app: 'OPERATION LOOKSMAX', version: 1, exported: new Date().toISOString(), days: store.days }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'looksmax-backup-' + todayStr() + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (b.id === 'imp') $('file').click();
    else if (b.id === 'rst') { if (confirm('Delete ALL saved data on this device? This cannot be undone.') && confirm('Final confirmation: permanently erase everything?')) { store = { days: {} }; save(); render(); toast('All data erased.'); } }
  });
  $('view').addEventListener('change', e => {
    if (e.target.id !== 'file' || !e.target.files[0]) return;
    const f = e.target.files[0], rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result);
        if (!j || typeof j.days !== 'object') throw 0;
        const n = cleanStore(j), c = Object.keys(n.days).length;
        if (!c) { toast('Import failed: no valid days found.'); return; }
        if (confirm(`Import ${c} day(s)? This REPLACES all current data.`)) { store = n; save(); render(); toast('Import complete.'); }
      } catch (_) { toast('Import failed: invalid file.'); }
    };
    rd.readAsText(f); e.target.value = '';
  });
  $('view').addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.t) {
      const tr = TRACKERS.find(x => x.k === t.dataset.t), v = t.value === '' ? null : Number(t.value);
      if (v !== null && (!isFinite(v) || v < 0 || v > tr.max)) { t.classList.add('bad'); return; }
      t.classList.remove('bad');
      edit(d => { if (v === null) delete d.t[tr.k]; else d.t[tr.k] = v; });
      t.nextElementSibling.textContent = v === null ? '—' : v + ' ' + tr.u;
    } else if (t.dataset.why) edit(d => { d.r.why[t.dataset.why] = t.value; });
    else if (t.dataset.r) edit(d => { d.r[t.dataset.r] = t.value; });
    else if (t.dataset.top) edit(d => { d.r.top3[+t.dataset.top] = t.value; });
  });
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  render();
})();
