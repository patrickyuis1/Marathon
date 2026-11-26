/* =====================================================================
   PACES — training paces and heart-rate zones worked out from a recent
   race or time trial (Jack Daniels' VDOT method) plus resting/max HR
   (Karvonen heart-rate reserve). Every run in the plan is written with
   tokens like {E} or {HRT}; fill() swaps them for the numbers here, so a
   new 10k time updates the whole plan at once. Saved per profile.
   ===================================================================== */
const PacesUI = (function(){
  "use strict";
  const KEY = 'maraPaces_v1';
  const DEFAULTS = { dist: '10k', time: '58:00', rest: 64, max: 177, goal: 'auto' };
  const DISTANCES = { '5k': 5000, '10k': 10000, 'half': 21097.5, 'marathon': 42195 };
  const DIST_LABEL = { '5k': '5 km', '10k': '10 km', 'half': 'Half marathon', 'marathon': 'Marathon' };
  const GOALS = ['auto', '4:00', '4:30', '4:45', '5:00'];
  const RESULTS_KEY = 'maraResults_v1';
  let ctx = null;

  function init(c){ ctx = c; }

  /* ---------------- settings ---------------- */
  function settings(){
    let s = {};
    try { s = JSON.parse(localStorage.getItem(ctx.nsKey(KEY))) || {}; } catch(e){}
    return Object.assign({}, DEFAULTS, s);
  }
  function save(s){
    try { localStorage.setItem(ctx.nsKey(KEY), JSON.stringify(s)); } catch(e){}
  }

  /* ---------------- maths ---------------- */
  // "58:00", "1:02:30" -> seconds
  function parseTime(str){
    const p = String(str || '').trim().split(':').map(Number);
    if (!p.length || p.some(n => !isFinite(n) || n < 0)) return null;
    let s = 0;
    for (const n of p) s = s * 60 + n;
    return s > 0 ? s : null;
  }
  function vo2(v){ return -4.60 + 0.182258 * v + 0.000104 * v * v; }        // v in m/min
  function pctMax(tMin){ return 0.8 + 0.1894393 * Math.exp(-0.012778 * tMin) + 0.2989558 * Math.exp(-0.1932605 * tMin); }
  function vdotFor(meters, seconds){
    const t = seconds / 60;
    return vo2(meters / t) / pctMax(t);
  }
  function speedAt(vo2Target){                                               // m/min
    const a = 0.000104, b = 0.182258, c = -4.60 - vo2Target;
    return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  }
  function paceFromSpeed(v){ return 1000 / v * 60; }                       // sec per km
  function predict(vdot, meters){
    let lo = 60, hi = 60 * 60 * 10;
    for (let i = 0; i < 60; i++){
      const mid = (lo + hi) / 2;
      if (vdotFor(meters, mid) > vdot) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function fmtPace(sec){
    let m = Math.floor(sec / 60), s = Math.round(sec - m * 60);
    if (s === 60){ m += 1; s = 0; }
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  function fmtTime(sec){
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  }
  function fmtHM(sec){
    const m = Math.round(sec / 60);
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  }

  function compute(){
    const s = settings();
    const meters = DISTANCES[s.dist] || 10000;
    const secs = parseTime(s.time) || parseTime(DEFAULTS.time);
    const vdot = vdotFor(meters, secs);
    const p = pct => paceFromSpeed(speedAt(vdot * pct));
    const predicted = predict(vdot, 42195);
    // A first marathon on modest mileage usually lands ~5-7% slower than the
    // VDOT prediction, so "auto" adds 6% and rounds to the nearest 5 minutes.
    const realistic = Math.round(predicted * 1.06 / 300) * 300;
    let goalSec;
    if (s.goal === 'auto') goalSec = realistic;
    else goalSec = (parseTime(s.goal + ':00') || realistic);
    const rest = +s.rest || DEFAULTS.rest, max = +s.max || DEFAULTS.max;
    const hr = (a, b) => `${Math.round(rest + (max - rest) * a)}-${Math.round(rest + (max - rest) * b)}`;
    return {
      s, vdot, predicted, realistic, goalSec,
      paces: {
        E: `${fmtPace(p(0.70))}-${fmtPace(p(0.62))}`,
        M: fmtPace(goalSec / 42.195),
        T: fmtPace(p(0.88)),
        I: fmtPace(p(0.975)),
        R: fmtPace(p(1.05)),
      },
      hr: { E: hr(0.60, 0.70), M: hr(0.70, 0.80), T: hr(0.82, 0.88), I: hr(0.90, 0.97) },
      predictedPace: fmtPace(predicted / 42.195),
    };
  }

  // Swap plan tokens for this profile's numbers.
  function fill(text){
    if (!text || text.indexOf('{') < 0) return text || '';
    const c = compute();
    const map = {
      E: c.paces.E, M: c.paces.M, T: c.paces.T, I: c.paces.I, R: c.paces.R,
      HRE: `${c.hr.E} bpm`, HRM: `${c.hr.M} bpm`, HRT: `${c.hr.T} bpm`, HRI: `${c.hr.I} bpm`,
      GOAL: fmtHM(c.goalSec),
    };
    return text.replace(/\{(E|M|T|I|R|HRE|HRM|HRT|HRI|GOAL)\}/g, (_, k) => map[k]);
  }

  /* ---------------- run types glossary ---------------- */
  const RUN_TYPES = [
    { key: 'easy', name: 'Easy run', zone: 'E', what: 'Most of your running. Slow enough to hold a full conversation. Builds the heart, lungs, tendons and the fat-burning engine a marathon runs on.',
      why: 'About 80% of marathon training should be easy. Running these too fast is the most common first-marathon mistake - it leaves you tired for the sessions that matter.', q: 'easy run zone 2 running explained' },
    { key: 'long', name: 'Long run', zone: 'E', what: 'Your Friday run - the backbone of the plan. Easy pace, slowly getting longer, topping out at 30 km three weeks before the race.',
      why: 'Teaches your legs to keep going for hours, and is where you practise fuelling (gels, drinks, breakfast) so race day holds no surprises.', q: 'marathon long run how to' },
    { key: 'strides', name: 'Strides', zone: 'R', what: '20-second pick-ups at the end of an easy run: build to fast-but-relaxed, then walk back.',
      why: 'Keeps your running form sharp and quick without adding fatigue.', q: 'running strides how to do them' },
    { key: 'tempo', name: 'Tempo (threshold) run', zone: 'T', what: '"Comfortably hard": you can say a few words but not hold a chat. Usually 15-25 minutes, sometimes split into 2 blocks.',
      why: 'Raises the pace you can hold before you tire quickly - one of the biggest drivers of marathon time.', q: 'what is a tempo run threshold run' },
    { key: 'intervals', name: 'Intervals', zone: 'I', what: 'Short, hard repeats (e.g. 800 m) with easy jogging between. Hard breathing, but controlled - the last rep as fast as the first.',
      why: 'Boosts your top-end aerobic fitness (VO2max), which makes every slower pace feel easier.', q: 'running interval training 800m repeats' },
    { key: 'mp', name: 'Marathon-pace run', zone: 'M', what: 'Blocks at your goal race pace inside an easy run.',
      why: 'Locks the race rhythm into your legs, and tests whether your goal pace feels sustainable.', q: 'marathon pace run workout explained' },
    { key: 'progression', name: 'Progression run', zone: 'E→M', what: 'Starts easy and finishes at marathon pace.',
      why: 'Practises running well on tired legs - exactly what the second half of a marathon asks for.', q: 'progression run explained' },
    { key: 'fartlek', name: 'Fartlek', zone: 'Feel', what: 'Swedish for "speed play": short surges by feel with easy running between, no track needed.',
      why: 'A gentle first step into faster running before structured sessions.', q: 'fartlek run explained' },
    { key: 'hills', name: 'Hill repeats', zone: 'Effort', what: '60 seconds up a steady hill at a hard effort, jog or walk back down.',
      why: 'Strength training disguised as running: builds calves, glutes and power with less pounding than flat speedwork.', q: 'hill repeats running technique' },
    { key: 'runwalk', name: 'Run-walk', zone: 'E', what: 'Planned short walk breaks, e.g. 1 minute every 2 km or every drink station.',
      why: 'A legitimate marathon strategy, not cheating - many first-timers finish faster with planned walks than without, because they fade less late on.', q: 'run walk method marathon' },
    { key: 'recovery', name: 'Shakeout / recovery jog', zone: 'E', what: 'Very short, very easy - 15-20 minutes.',
      why: 'Loosens the legs before a race or after a hard day without adding any training load.', q: 'shakeout run before race' },
    { key: 'tt', name: '10k time trial', zone: 'Race', what: 'An all-out, evenly paced 10 km in weeks 8 and 16.',
      why: 'Re-measures your fitness. Tap "Save to my results" on the session and every pace in the plan updates.', q: 'how to run a 10k time trial' },
  ];

  /* ---------------- results history ---------------- */
  // [{id, date, dist, secs, hr, note}] - races, time trials, parkruns.
  function loadResults(){
    let r = null;
    try { r = JSON.parse(localStorage.getItem(ctx.nsKey(RESULTS_KEY))); } catch(e){}
    if (!Array.isArray(r)){
      // First run: the questionnaire 10k is the starting point.
      r = [{ id: 'start', date: ctx.addDays(PROGRAM.startDate, -1), dist: '10k', secs: 3480, hr: null, note: 'Starting point (questionnaire)' }];
      saveResults(r);
    }
    return r.slice().sort((a, b) => a.date < b.date ? -1 : (a.date > b.date ? 1 : 0));
  }
  function saveResults(r){
    try { localStorage.setItem(ctx.nsKey(RESULTS_KEY), JSON.stringify(r)); } catch(e){}
  }
  function addResult(res, usePaces){
    const r = loadResults().filter(x => !(x.date === res.date && x.dist === res.dist));
    r.push(Object.assign({ id: 'r' + Date.now().toString(36) }, res));
    saveResults(r);
    if (usePaces){ const s = settings(); s.dist = res.dist; s.time = fmtTime(res.secs); save(s); }
  }
  function deleteResult(id){ saveResults(loadResults().filter(x => x.id !== id)); }
  function isBenchmark(res){
    const s = settings();
    return s.dist === res.dist && parseTime(s.time) === res.secs;
  }

  // Easy and long runs logged on the Plan tab -> pace and HR over time.
  function easyRunPoints(){
    const log = ctx.loadExerciseLog ? ctx.loadExerciseLog() : {};
    const pts = [];
    ['Easy Run', 'Long Run'].forEach(name => (log[name] || []).forEach(e => {
      const km = parseFloat(e.distance), secs = TimeBox.parse(e.time), hr = parseInt(e.hr, 10);
      if (km > 0 && secs > 0) pts.push({ date: e.date, km, secs, pace: secs / km, hr: hr > 60 ? hr : null, kind: name });
    }));
    return pts.sort((a, b) => a.date < b.date ? -1 : 1);
  }

  /* ---------------- small line chart (one series per chart) ---------------- */
  function chartSVG(points, opts){
    // points: [{x: label, v: number, tip: string}]  - opts: {fmt, invert, title, caption}
    const W = 320, H = 150, L = 46, R = 12, Tp = 14, B = 26;
    if (!points.length) return '';
    const vs = points.map(p => p.v);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (hi - lo < 1e-9){ lo -= 1; hi += 1; }
    const padV = (hi - lo) * 0.15; lo -= padV; hi += padV;
    const X = i => points.length === 1 ? (L + (W - L - R) / 2) : L + i * (W - L - R) / (points.length - 1);
    const Y = v => Tp + (hi - v) / (hi - lo) * (H - Tp - B);
    const ticks = [hi - padV, (hi + lo) / 2, lo + padV];
    const grid = ticks.map(t => `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/>
      <text class="ch-ylab" x="${L - 6}" y="${(Y(t) + 3.5).toFixed(1)}" text-anchor="end">${opts.fmt(t)}</text>`).join('');
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
    const dots = points.map((p, i) => `<g class="ch-pt" tabindex="0" data-tip="${ctx.escapeHtml(p.tip)}">
        <circle class="ch-hit" cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="14"/>
        <circle class="ch-dot" cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="4.5"/><title>${ctx.escapeHtml(p.tip)}</title></g>`).join('');
    const xl = points.length > 1
      ? `<text class="ch-xlab" x="${L}" y="${H - 6}" text-anchor="start">${points[0].x}</text><text class="ch-xlab" x="${W - R}" y="${H - 6}" text-anchor="end">${points[points.length - 1].x}</text>`
      : `<text class="ch-xlab" x="${X(0)}" y="${H - 6}" text-anchor="middle">${points[0].x}</text>`;
    return `<figure class="chart">
      <figcaption class="ch-title">${opts.title}<span>${opts.caption || ''}</span></figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${ctx.escapeHtml(opts.title)}">${grid}<path class="ch-line" d="${path}"/>${dots}${xl}</svg>
      <div class="ch-tip" aria-live="polite">Tap a point for details</div>
    </figure>`;
  }
  function shortD(iso){ return ctx.fromISO(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

  function progressionHTML(dist){
    if (dist === 'easy'){
      const pts = easyRunPoints();
      if (!pts.length) return `<p class="pg-note">Log the distance, time and average heart rate on your easy and long runs (Plan tab) and they'll appear here.</p>`;
      const withHr = pts.filter(p => p.hr);
      let verdict = '';
      if (withHr.length >= 4){
        const eff = p => (1000 / p.pace * 60) / p.hr;     // metres per minute per beat
        const n = Math.min(3, Math.floor(withHr.length / 2));
        const first = withHr.slice(0, n).reduce((a, p) => a + eff(p), 0) / n;
        const last = withHr.slice(-n).reduce((a, p) => a + eff(p), 0) / n;
        const pct = Math.round((last / first - 1) * 100);
        verdict = pct > 1 ? `Your easy running is <b>${pct}% more efficient</b> than at the start - more speed for each heartbeat. That's aerobic fitness building.`
          : (pct < -1 ? `Efficiency is down ${-pct}% on your first runs. Heat, tiredness, hills or illness all do this - watch the trend over a few weeks, not one run.`
          : `Efficiency is steady so far. It usually shows up after 6-8 weeks of consistent easy running.`);
      } else {
        verdict = 'Log heart rate on at least 4 easy or long runs to see whether you\'re getting fitter (faster at the same heart rate).';
      }
      return `<p class="pg-note pg-verdict">${verdict}</p>
        ${chartSVG(pts.map(p => ({ x: shortD(p.date), v: p.pace / 60, tip: `${shortD(p.date)} · ${p.kind} ${p.km} km · ${fmtPace(p.pace)}/km${p.hr ? ' · HR ' + p.hr : ''}` })),
          { title: 'Easy-run pace', caption: 'min/km - lower is faster', fmt: v => fmtPace(v * 60) })}
        ${withHr.length ? chartSVG(withHr.map(p => ({ x: shortD(p.date), v: p.hr, tip: `${shortD(p.date)} · HR ${p.hr} at ${fmtPace(p.pace)}/km` })),
          { title: 'Easy-run heart rate', caption: 'bpm - lower at the same pace = fitter', fmt: v => String(Math.round(v)) }) : ''}`;
    }
    const rs = loadResults().filter(r => r.dist === dist);
    if (!rs.length) return `<p class="pg-note">No ${DIST_LABEL[dist]} results yet.</p>`;
    const best = rs.reduce((a, r) => r.secs < a.secs ? r : a, rs[0]);
    const first = rs[0], last = rs[rs.length - 1];
    const diff = first.secs - last.secs;
    const summary = rs.length > 1
      ? `${rs.length} results. Best: <b>${fmtTime(best.secs)}</b> (${shortD(best.date)}). Latest is <b>${fmtTime(Math.abs(diff))} ${diff >= 0 ? 'faster' : 'slower'}</b> than your first.`
      : 'One result so far - add another to see the trend.';
    const hrs = rs.filter(r => r.hr);
    return `<p class="pg-note pg-verdict">${summary}</p>
      ${chartSVG(rs.map(r => ({ x: shortD(r.date), v: r.secs / 60, tip: `${shortD(r.date)} · ${fmtTime(r.secs)} · ${fmtPace(r.secs / DISTANCES[r.dist] * 1000)}/km${r.hr ? ' · HR ' + r.hr : ''}` })),
        { title: 'Finish time', caption: 'lower is faster', fmt: v => fmtTime(v * 60) })}
      ${hrs.length > 1 ? chartSVG(hrs.map(r => ({ x: shortD(r.date), v: r.hr, tip: `${shortD(r.date)} · HR ${r.hr} · ${fmtTime(r.secs)}` })),
        { title: 'Average heart rate', caption: 'bpm - same HR, faster time = fitter', fmt: v => String(Math.round(v)) }) : ''}`;
  }
  function openProgression(dist){
    const label = dist === 'easy' ? 'Easy & long runs' : DIST_LABEL[dist];
    ctx.openSheet(`Progression · ${label}`, dist === 'easy' ? 'From the runs you log on the Plan tab' : 'From your results history', progressionHTML(dist));
    const body = document.getElementById('sheetBody');
    body.querySelectorAll('.chart').forEach(ch => ch.querySelectorAll('.ch-pt').forEach(pt => {
      const show = () => { ch.querySelectorAll('.ch-pt').forEach(x => x.classList.remove('is-on')); pt.classList.add('is-on'); ch.querySelector('.ch-tip').textContent = pt.getAttribute('data-tip'); };
      pt.addEventListener('click', show); pt.addEventListener('focus', show); pt.addEventListener('mouseenter', show);
    }));
  }

  /* ---------------- tab ---------------- */
  let histDist = null, addOpen = false;
  function goalLabel(g, c){
    if (g === 'auto') return `Auto · ${fmtHM(c.realistic)}`;
    return (g === '4:00' || g === '5:00') ? `Sub ${g}` : g;
  }

  function historyHTML(){
    const rs = loadResults();
    const counts = d => d === 'easy' ? easyRunPoints().length : rs.filter(r => r.dist === d).length;
    if (!histDist) histDist = rs.length ? rs[rs.length - 1].dist : '10k';
    const cats = [...Object.keys(DISTANCES), 'easy'];
    const list = histDist === 'easy' ? [] : rs.filter(r => r.dist === histDist).reverse();
    const today = ctx.todayISO();
    return `
      <section class="fuel-card" id="historyCard">
        <div class="hist-head">
          <h2 class="fc-title">Results history</h2>
          <button class="data-btn small" id="addResultBtn" aria-expanded="${addOpen}">${addOpen ? 'Cancel' : '+ Add result'}</button>
        </div>
        ${addOpen ? `
        <div class="add-result">
          <div class="ar-row">
            <label class="fs-field"><span>Distance</span><span class="fs-input"><select id="arDist">${Object.keys(DISTANCES).map(k => `<option value="${k}" ${k === (histDist === 'easy' ? '10k' : histDist) ? 'selected' : ''}>${DIST_LABEL[k]}</option>`).join('')}</select></span></label>
            <label class="fs-field"><span>Date</span><span class="fs-input"><input id="arDate" type="date" value="${today}" max="${today}"></span></label>
          </div>
          <div class="ar-row">
            <div class="fs-field"><span>Time</span>${TimeBox.html('ar', null, { label: 'Result time' })}</div>
            <label class="fs-field ar-hr"><span>Avg HR</span><span class="fs-input"><input id="arHr" type="text" inputmode="numeric" maxlength="3" placeholder="optional"><em>bpm</em></span></label>
          </div>
          <label class="ar-check"><input type="checkbox" id="arUse" checked> Use this to set my training paces</label>
          <button class="race-complete-btn" id="arSave">Save result</button>
          <p class="data-status" id="arMsg" role="status"></p>
        </div>` : ''}
        <div class="day-chips hist-chips">${cats.map(k => `
          <button class="day-chip ${k === histDist ? 'is-on' : ''}" data-hist="${k}" aria-pressed="${k === histDist}">
            <span class="dc-off">${k === 'easy' ? 'Easy runs' : DIST_LABEL[k].replace('Half marathon', 'Half')}</span><span class="dc-date">${counts(k)}</span>
          </button>`).join('')}
        </div>
        ${histDist === 'easy'
          ? `<p class="pg-note">Every easy and long run you log on the Plan tab (distance, time, avg HR) is tracked here automatically.</p>`
          : (list.length ? `<ul class="hist-list">${list.map(r => `
            <li class="hist-row ${isBenchmark(r) ? 'is-bench' : ''}">
              <span class="hr-date">${shortD(r.date)}<small>${ctx.escapeHtml(r.note || '')}</small></span>
              <span class="hr-time">${fmtTime(r.secs)}<small>${fmtPace(r.secs / DISTANCES[r.dist] * 1000)}/km</small></span>
              <span class="hr-hr">${r.hr ? r.hr + '<small>bpm</small>' : '<small>no HR</small>'}</span>
              ${isBenchmark(r) ? '<span class="hr-bench" title="Your paces come from this result">Paces</span>' : `<button class="hr-use" data-use="${r.id}">Use</button>`}
              <button class="hr-del" data-del="${r.id}" aria-label="Delete this result">×</button>
            </li>`).join('')}</ul>` : `<p class="pg-note">No ${DIST_LABEL[histDist]} results yet. parkruns, races and the 10k time trials all count.</p>`)}
        <button class="routine-link pill prog-btn" data-prog="${histDist}">See progression ›</button>
      </section>`;
  }

  function renderTab(el){
    const c = compute();
    const s = c.s;
    const fasterThanFitness = c.goalSec < c.predicted - 60;
    const zones = [
      ['Easy', 'E', c.paces.E, c.hr.E, 'Full sentences', 'Easy runs, long runs, warm-ups'],
      ['Marathon', 'M', c.paces.M, c.hr.M, 'Short sentences', 'Goal race pace'],
      ['Tempo', 'T', c.paces.T, c.hr.T, 'A few words', 'Tempo / threshold'],
      ['Intervals', 'I', c.paces.I, c.hr.I, 'Single words', '800 m repeats'],
      ['Strides', 'R', c.paces.R, '-', '-', 'Short and relaxed'],
    ];
    el.innerHTML = `
      <div class="view-head">
        <div class="eyebrow">Paces & zones</div>
        <h1 class="view-title">How fast is "easy"?</h1>
        <p class="view-sub">Worked out from your latest race or time trial. Change the numbers and every session in the plan updates.</p>
      </div>

      <div class="fuel-settings pace-settings">
        <label class="fs-field"><span>Paces from</span><span class="fs-input">
          <select id="pDist">${Object.keys(DISTANCES).map(k => `<option value="${k}" ${k === s.dist ? 'selected' : ''}>${DIST_LABEL[k]}</option>`).join('')}</select></span></label>
        <div class="fs-field"><span>Time</span>${TimeBox.html('pTime', parseTime(s.time), { label: 'Benchmark time' })}</div>
        <label class="fs-field"><span>Resting HR</span><span class="fs-input"><input id="pRest" type="text" inputmode="numeric" value="${ctx.escapeHtml(String(s.rest))}" maxlength="3"><em>bpm</em></span></label>
        <label class="fs-field"><span>Max HR</span><span class="fs-input"><input id="pMax" type="text" inputmode="numeric" value="${ctx.escapeHtml(String(s.max))}" maxlength="3"><em>bpm</em></span></label>
      </div>

      <section class="fuel-card pace-goal">
        <div class="pg-row">
          <div class="pg-stat"><div class="tile-label">Fitness predicts</div><div class="pg-big">${fmtHM(c.predicted)}</div><div class="tile-sub">${c.predictedPace}/km · VDOT ${c.vdot.toFixed(1)}</div></div>
          <div class="pg-stat"><div class="tile-label">Race-day goal</div><div class="pg-big is-goal">${fmtHM(c.goalSec)}</div><div class="tile-sub">${c.paces.M}/km</div></div>
        </div>
        <div class="goal-chips" role="radiogroup" aria-label="Goal">
          ${GOALS.map(g => `<button class="race-chip goal-chip ${g === s.goal ? 'is-on' : ''}" role="radio" aria-checked="${g === s.goal}" data-goal="${g}">${goalLabel(g, c)}</button>`).join('')}
        </div>
        <p class="pg-note">${fasterThanFitness
          ? 'That goal is faster than your current fitness predicts. Train at it if you like, but check it against the 10k re-tests in weeks 8 and 16 before race day.'
          : 'The prediction assumes full marathon training. For a first marathon, "Auto" adds a safety margin - it is the pace you can trust on the day.'}</p>
      </section>

      ${historyHTML()}

      <section class="fuel-card">
        <h2 class="fc-title">Your zones</h2>
        <div class="zone-table" role="table">
          <div class="zt-row zt-head" role="row"><span role="columnheader">Zone</span><span role="columnheader">Pace /km</span><span role="columnheader">Heart rate</span><span role="columnheader">Talk test</span></div>
          ${zones.map(z => `<div class="zt-row zone-${z[1]}" role="row"><span role="cell"><b>${z[0]}</b><small>${z[5]}</small></span><span role="cell" class="zt-mono">${z[2]}</span><span role="cell" class="zt-mono">${z[3]}</span><span role="cell">${z[4]}</span></div>`).join('')}
        </div>
        <p class="pg-note">On hills, in wind or heat, follow heart rate and effort, not pace. On the treadmill set a 1% incline. Your old "easy" of 6:00/km is close to 10k race pace - slowing down is the point, not a step back.</p>
      </section>

      <section class="fuel-card">
        <h2 class="fc-title">The types of run in your plan</h2>
        <div class="run-types">${RUN_TYPES.map(r => `
          <details class="rt">
            <summary><span class="rt-name">${ctx.escapeHtml(r.name)}</span><span class="rt-zone">${ctx.escapeHtml(r.zone)}</span></summary>
            <p>${ctx.escapeHtml(r.what)}</p>
            <p class="rt-why"><b>Why:</b> ${ctx.escapeHtml(r.why)}</p>
            <a class="station-video" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(r.q)}">Watch a video ↗</a>
          </details>`).join('')}
        </div>
      </section>`;

    const rerender = () => { const y = window.scrollY; renderTab(el); try { window.scrollTo(0, y); } catch(e){} };
    const update = (k, v) => { const cur = settings(); cur[k] = v; save(cur); rerender(); };
    el.querySelector('#pDist').addEventListener('change', e => update('dist', e.target.value));
    TimeBox.wire(el.querySelector('.pace-settings'), (name, secs) => { if (secs > 0) update('time', fmtTime(secs)); });
    el.querySelector('#pRest').addEventListener('change', e => { const v = parseInt(e.target.value, 10); if (v >= 30 && v <= 110) update('rest', v); else rerender(); });
    el.querySelector('#pMax').addEventListener('change', e => { const v = parseInt(e.target.value, 10); if (v >= 140 && v <= 230) update('max', v); else rerender(); });
    el.querySelectorAll('[data-goal]').forEach(b => b.addEventListener('click', () => update('goal', b.getAttribute('data-goal'))));

    el.querySelector('#addResultBtn').addEventListener('click', () => { addOpen = !addOpen; rerender(); });
    el.querySelectorAll('[data-hist]').forEach(b => b.addEventListener('click', () => { histDist = b.getAttribute('data-hist'); rerender(); }));
    el.querySelectorAll('[data-prog]').forEach(b => b.addEventListener('click', () => openProgression(b.getAttribute('data-prog'))));
    el.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', () => {
      const r = loadResults().find(x => x.id === b.getAttribute('data-use'));
      if (r){ const cur = settings(); cur.dist = r.dist; cur.time = fmtTime(r.secs); save(cur); rerender(); }
    }));
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      if (window.confirm('Delete this result?')){ deleteResult(b.getAttribute('data-del')); rerender(); }
    }));
    const saveBtn = el.querySelector('#arSave');
    if (saveBtn){
      TimeBox.wire(el.querySelector('.add-result'));
      saveBtn.addEventListener('click', () => {
        const box = el.querySelector('[data-tbox="ar"]');
        const secs = TimeBox.read(box);
        const msg = el.querySelector('#arMsg');
        if (!secs || !TimeBox.valid(box)){ msg.textContent = 'Enter the time in the boxes above.'; msg.classList.add('is-error'); return; }
        const hr = parseInt(el.querySelector('#arHr').value, 10);
        const dist = el.querySelector('#arDist').value;
        addResult({ date: el.querySelector('#arDate').value || ctx.todayISO(), dist, secs, hr: hr >= 60 && hr <= 230 ? hr : null, note: '' }, el.querySelector('#arUse').checked);
        addOpen = false; histDist = dist; rerender();
      });
    }
  }

  return { init, renderTab, fill, compute, fmtHM, addResult, loadResults, openProgression };
})();
