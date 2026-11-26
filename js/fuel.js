/* =====================================================================
   FUEL — three views over FUEL_PLAN (fuel-data.js), all scaled to the open
   profile's body weight:
     Everyday  - daily targets by type of day + meal ideas
     Long runs - how much to take on each long run, gels, before/after
     Race week - D-7 to the day after, carb load, race-morning timeline
   Body weight and the race start time are saved per profile.
   ===================================================================== */
const FuelUI = (function(){
  "use strict";
  const SETTINGS_KEY = 'maraFuelSettings_v1';
  const DEFAULT_WEIGHT = 54;
  const WINDOW = { from: -7, to: 1 };
  const SECTIONS = [['everyday', 'Everyday'], ['long', 'Long runs'], ['race', 'Race week']];
  const GEL_G = 22;              // typical grams of carbs in one gel
  let ctx = null;
  let selected = null;           // { raceId, offset }
  let section = null;            // 'everyday' | 'long' | 'race'
  let dayKind = null;            // everyday chip override

  function init(c){ ctx = c; }

  /* ---------------- settings ---------------- */
  function settings(){
    let s = {};
    try { s = JSON.parse(localStorage.getItem(ctx.nsKey(SETTINGS_KEY))) || {}; } catch(e){}
    if (!s.starts || typeof s.starts !== 'object') s.starts = {};
    return s;
  }
  function saveSettings(s){
    try { localStorage.setItem(ctx.nsKey(SETTINGS_KEY), JSON.stringify(s)); } catch(e){}
  }
  function weight(){
    const w = parseFloat(settings().weight);
    return (w >= 35 && w <= 160) ? w : DEFAULT_WEIGHT;
  }
  function startFor(race){
    const saved = settings().starts[race.id];
    if (/^\d{1,2}:\d{2}$/.test(saved || '')) return saved;
    return (race.startWindow && race.startWindow[0]) || '09:00';
  }
  function minutesOf(hhmm){
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }
  function variantFor(hhmm){
    const m = minutesOf(hhmm);
    if (m === null) return 'early';
    return m < 600 ? 'early' : 'mid';
  }
  function goalMinutes(){
    try { return Math.round(PacesUI.compute().goalSec / 60); } catch(e){ return 280; }
  }
  function easyMinPerKm(){
    // midpoint of the easy-pace range from the Paces tab
    try {
      const e = PacesUI.compute().paces.E.split('-').map(x => { const [m, s] = x.split(':').map(Number); return m + s / 60; });
      return (e[0] + e[1]) / 2;
    } catch(e){ return 7.33; }
  }

  /* ---------------- races and dates ---------------- */
  function races(){
    return (PROGRAM.races || [{ id: 'race1', label: 'Race', date: PROGRAM.race1 }]);
  }
  function raceName(r){ return r.city ? `${r.city} ${r.label}` : r.label; }
  function upcomingRace(){
    const t = ctx.todayISO();
    const list = races();
    return list.find(r => ctx.addDays(r.date, WINDOW.to) >= t) || list[list.length - 1];
  }
  function offsetOf(dateISO, race){
    return Math.round((ctx.fromISO(dateISO) - ctx.fromISO(race.date)) / 86400000);
  }
  function raceWindowFor(dateISO){
    for (const r of races()){
      const o = offsetOf(dateISO, r);
      if (o >= WINDOW.from && o <= WINDOW.to) return { race: r, offset: o };
    }
    return null;
  }
  function round5(v){ return Math.round(v / 5) * 5; }
  function offLabel(o){ return o === 0 ? 'Race' : (o > 0 ? `+${o}` : `D${o}`); }
  function shortDate(iso){ return ctx.fromISO(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function sessionOn(dateISO){
    try { return ctx.getContentFor(dateISO); } catch(e){ return null; }
  }

  /* ---------------- long runs ---------------- */
  function longRunKm(content){
    if (!content || !content.blocks) return null;
    const b = content.blocks.find(x => x.name === 'Long Run');
    if (!b) return null;
    const km = parseFloat(b.prescription);
    return isFinite(km) ? km : null;
  }
  function longRunPlan(km){
    const mins = Math.round(km * easyMinPerKm());
    const rung = FUEL_PLAN.longRunLadder.find(r => mins <= r.upTo);
    let gels = 0, every = 0, first = 0;
    if (mins > 120){ every = 30; first = 30; }
    else if (mins > 75){ every = 40; first = 40; }
    if (every) gels = Math.max(1, Math.floor((mins - first - 10) / every) + 1);
    return { km, mins, rung, gels, every, first };
  }
  function nextLongRun(fromISO){
    let d = fromISO;
    for (let i = 0; i < 21; i++){
      const c = sessionOn(d);
      if (!c) break;
      const km = longRunKm(c);
      if (km) return { date: d, km };
      d = ctx.addDays(d, 1);
    }
    return null;
  }
  function hm(m){ return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m} min`; }

  // A race-week day's targets. Dynamic days follow the session on that date.
  function dayFor(race, offset){
    const base = FUEL_PLAN.days.find(d => d.offset === offset);
    if (!base) return null;
    const dateISO = ctx.addDays(race.date, offset);
    let d = Object.assign({}, base);
    if (base.dynamic){
      const s = sessionOn(dateISO);
      const kind = (s && s.sessionType === 'rest') ? 'rest' : 'training';
      d = Object.assign(d, FUEL_PLAN.dynamic[kind]);
    }
    if (offset === -1 && variantFor(startFor(race)) === 'early'){
      d.focus = `${d.focus} ${FUEL_PLAN.earlyStartNote}`;
    }
    return d;
  }
  function kindForSession(s){
    if (!s || s.sessionType === 'rest') return 'rest';
    if (longRunKm(s) || s.sessionType === 'race') return 'hard';
    const hard = (s.blocks || []).some(b => /Tempo|Intervals|Hill|Marathon-Pace|Time Trial|Fartlek/.test(b.name));
    return hard ? 'hard' : 'training';
  }

  function clockAt(start, minutes){
    const base = minutesOf(start);
    if (base === null) return null;
    let total = base + minutes;
    total = ((total % 1440) + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  function relLabel(minutes){
    if (minutes === 0) return 'Start';
    const a = Math.abs(minutes), h = Math.floor(a / 60), mm = a % 60;
    const s = h ? `${h}h${mm ? ' ' + mm + 'm' : ''}` : `${mm} min`;
    return minutes < 0 ? `${s} before` : `${s} after`;
  }

  /* ---------------- compact card on the Plan view ---------------- */
  function todayCardHTML(dateISO){
    const hit = raceWindowFor(dateISO);
    if (hit){
      const d = dayFor(hit.race, hit.offset);
      if (!d) return '';
      const w = weight();
      const line = d.race
        ? `Race-morning timeline for a ${ctx.escapeHtml(startFor(hit.race))} start: breakfast, drinks, gel times, recovery.`
        : `<b>${round5(d.carbs * w)} g</b> carbs · <b>${round5(d.protein * w)} g</b> protein · <b>${ctx.escapeHtml(d.fluid)}</b> fluid`;
      return `<button class="fuel-today" data-fuel-section="race" data-fuel-race="${hit.race.id}" data-fuel-offset="${hit.offset}">
        <span class="ft-off">${offLabel(hit.offset)}</span>
        <span class="ft-body">
          <span class="ft-title">Race-week fuel · ${ctx.escapeHtml(d.title)}</span>
          <span class="ft-line">${line}</span>
        </span>
        <span class="ft-go" aria-hidden="true">›</span>
      </button>`;
    }
    const km = longRunKm(sessionOn(dateISO));
    if (km){
      const p = longRunPlan(km);
      const line = p.gels
        ? `About ${hm(p.mins)} · <b>${p.gels} gel${p.gels === 1 ? '' : 's'}</b> (every ${p.every} min from ${p.first} min) · breakfast 2-3 h before`
        : `About ${hm(p.mins)} · <b>water only</b> · something small 1-2 h before`;
      return `<button class="fuel-today is-long" data-fuel-section="long">
        <span class="ft-off">Fuel</span>
        <span class="ft-body">
          <span class="ft-title">Long-run fuel · ${ctx.escapeHtml(p.rung.target)}</span>
          <span class="ft-line">${line}</span>
        </span>
        <span class="ft-go" aria-hidden="true">›</span>
      </button>`;
    }
    return '';
  }

  /* ---------------- shared bits ---------------- */
  function select(raceId, offset, sec){
    if (raceId) selected = { raceId, offset };
    if (sec) section = sec;
  }
  function optionsHTML(opts){
    return `<ul class="meal-opts">${opts.map(o => `<li><span class="mo-text">${ctx.escapeHtml(o.text)}</span><span class="mo-macros">C ${o.c} · P ${o.p}</span></li>`).join('')}</ul>`;
  }
  function mealsHTML(meals){
    if (!meals) return '';
    return Object.keys(meals).map(slot => `
      <div class="meal">
        <h3 class="meal-slot">${ctx.escapeHtml(slot)}</h3>
        ${optionsHTML(meals[slot])}
      </div>`).join('');
  }
  function tile(label, value, sub, cls){
    return `<div class="tile ${cls || ''}"><div class="tile-label">${label}</div><div class="tile-value">${value}</div>${sub ? `<div class="tile-sub">${sub}</div>` : ''}</div>`;
  }
  function listHTML(items){ return `<ul class="rules">${items.map(r => `<li>${ctx.escapeHtml(r)}</li>`).join('')}</ul>`; }

  /* ---------------- Everyday ---------------- */
  function everydayHTML(){
    const w = weight();
    const today = ctx.todayISO();
    const todayKind = kindForSession(sessionOn(today));
    const kind = dayKind || todayKind;
    const d = FUEL_PLAN.daily[kind];
    return `
      <p class="fd-focus intro-note">${ctx.escapeHtml(FUEL_PLAN.everydayIntro)}</p>
      <div class="day-chips kind-chips">${Object.keys(FUEL_PLAN.daily).map(k => `
        <button class="day-chip ${k === kind ? 'is-on' : ''} ${k === todayKind ? 'is-today' : ''}" data-kind="${k}" aria-pressed="${k === kind}">
          <span class="dc-off">${ctx.escapeHtml(FUEL_PLAN.daily[k].label)}</span><span class="dc-date">${k === todayKind ? 'today' : '&nbsp;'}</span>
        </button>`).join('')}
      </div>
      <section class="fuel-day">
        <div class="tiles">
          ${tile('Carbs', `${round5(d.carbs * w)} g`, `${d.carbs} g/kg`, 'is-carb')}
          ${tile('Protein', `${round5(d.protein * w)} g`, `${d.protein} g/kg`)}
          ${tile('Fluid', ctx.escapeHtml(d.fluid), ctx.escapeHtml(d.fluidNote), 'is-fluid')}
          ${tile('Meals', ctx.escapeHtml(d.meals), '')}
        </div>
        <p class="fd-focus">${ctx.escapeHtml(d.note)}</p>
        <p class="meal-hint">Mix and match. Numbers are approximate - land near ${round5(d.carbs * w)} g carbs across the day.</p>
        ${mealsHTML(FUEL_PLAN.dailyMeals)}
      </section>
      <section class="fuel-card">
        <h2 class="fc-title">Everyday habits</h2>
        ${listHTML(FUEL_PLAN.everydayTips)}
      </section>`;
  }

  /* ---------------- Long runs ---------------- */
  function longHTML(){
    const w = weight();
    const today = ctx.todayISO();
    const next = nextLongRun(today);
    let nextCard = '';
    if (next){
      const p = longRunPlan(next.km);
      const times = [];
      if (p.every) for (let t = p.first; t <= p.mins - 10; t += p.every) times.push(t);
      nextCard = `
      <section class="fuel-day is-long">
        <div class="fd-head">
          <span class="fd-off">${next.km}k</span>
          <div>
            <h2 class="fd-title">${next.date === today ? "Today's" : 'Next'} long run</h2>
            <p class="fd-meta">${shortDate(next.date)} · about ${hm(p.mins)} at easy pace</p>
          </div>
        </div>
        <div class="tiles">
          ${tile('Target', ctx.escapeHtml(p.rung.target), '', 'is-carb')}
          ${tile('Gels', p.gels ? `${p.gels}` : '0', p.gels ? `~${GEL_G} g each` : 'water only', 'is-carb')}
          ${tile('Breakfast', `${round5(1.5 * w)}-${round5(2 * w)} g`, 'carbs, 2-3 h before')}
          ${tile('After', `${round5(1 * w)} g carbs`, '+ 20-25 g protein within 1 h', 'is-fluid')}
        </div>
        <p class="fd-focus">${ctx.escapeHtml(p.rung.how)}${times.length ? ` Gel times: ${times.map(t => t + ' min').join(', ')}.` : ''}</p>
      </section>`;
    }
    return `
      ${nextCard}
      <section class="fuel-card">
        <h2 class="fc-title">How much to take</h2>
        <ol class="ladder">${FUEL_PLAN.longRunLadder.map(r => `
          <li><div class="ld-top"><span class="ld-title">${ctx.escapeHtml(r.title)}</span><span class="ld-target">${ctx.escapeHtml(r.target)}</span></div>
          <p>${ctx.escapeHtml(r.how)}</p></li>`).join('')}
        </ol>
        <p class="pg-note">Race day is ~${Math.round(goalMinutes() / 60 * 10) / 10} h, so by March your long runs should be at 45-60 g an hour without any stomach trouble. That's what the practice is for.</p>
      </section>
      <section class="fuel-card">
        <h2 class="fc-title">Before</h2>
        ${listHTML(FUEL_PLAN.longRunBefore)}
      </section>
      <section class="fuel-card">
        <h2 class="fc-title">After</h2>
        ${listHTML(FUEL_PLAN.longRunAfter)}
      </section>
      <section class="fuel-card">
        <h2 class="fc-title">Gels - a beginner's guide</h2>
        <dl class="supps">${FUEL_PLAN.gels.map(x => `<dt>${ctx.escapeHtml(x.name)}</dt><dd>${ctx.escapeHtml(x.how)}</dd>`).join('')}</dl>
        <a class="station-video" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent('how to use energy gels marathon beginner')}">Watch a video ↗</a>
      </section>`;
  }

  /* ---------------- Race week ---------------- */
  function timelineHTML(start){
    const v = variantFor(start);
    const goal = goalMinutes();
    const gels = [];
    for (let t = 30; t <= goal - 15; t += 30) gels.push(clockAt(start, t));
    const fill = s => s.replace('{GELS}', gels.join(', ')).replace('{FINISH}', clockAt(start, goal) || '');
    const items = FUEL_PLAN.raceTimeline
      .filter(t => !t.variants || t.variants.includes(v))
      .map(t => Object.assign({}, t, { at: t.afterFinish !== undefined ? goal + t.afterFinish : t.at }))
      .sort((a, b) => a.at - b.at);
    return `<ol class="timeline">${items.map(t => `
      <li class="tl-item ${t.at === 0 ? 'is-start' : ''}">
        <div class="tl-time"><span class="tl-clock">${clockAt(start, t.at) || '—'}</span><span class="tl-rel">${relLabel(t.at)}</span></div>
        <div class="tl-body">
          <div class="tl-title">${ctx.escapeHtml(t.title)}</div>
          <div class="tl-detail">${ctx.escapeHtml(fill(t.detail))}</div>
          ${t.options ? optionsHTML(t.options) : ''}
        </div>
      </li>`).join('')}</ol>`;
  }

  function raceHTML(){
    const w = weight();
    const today = ctx.todayISO();
    const list = races();
    const race = (selected && list.find(r => r.id === selected.raceId)) || upcomingRace();
    let offset = (selected && selected.raceId === race.id && selected.offset !== null && selected.offset !== undefined) ? selected.offset : null;
    if (offset === null){
      const o = offsetOf(today, race);
      offset = (o >= WINDOW.from && o <= WINDOW.to) ? o : WINDOW.from;
    }
    const start = startFor(race);
    const variant = variantFor(start);
    const planStart = ctx.addDays(race.date, WINDOW.from);
    const daysToPlan = Math.round((ctx.fromISO(planStart) - ctx.fromISO(today)) / 86400000);
    const sub = daysToPlan > 0
      ? `Race-week plan starts ${shortDate(planStart)} - ${daysToPlan} day${daysToPlan === 1 ? '' : 's'} away. Have a look now so you can practise the race breakfast on long runs.`
      : (offsetOf(today, race) > WINDOW.to ? 'Race done - here for reference.' : 'You are in race week.');
    const d = dayFor(race, offset);
    const dateISO = ctx.addDays(race.date, offset);
    const session = sessionOn(dateISO);
    const goal = goalMinutes();
    const gelCount = Math.max(1, Math.floor((goal - 15) / 30));

    const dayChips = FUEL_PLAN.days.map(x => {
      const iso = ctx.addDays(race.date, x.offset);
      return `<button class="day-chip ${x.offset === offset ? 'is-on' : ''} ${iso === today ? 'is-today' : ''} ${x.race ? 'is-race' : ''}" data-chip="${x.offset}" aria-pressed="${x.offset === offset}">
        <span class="dc-off">${offLabel(x.offset)}</span><span class="dc-date">${ctx.fromISO(iso).toLocaleDateString('en-GB', { weekday: 'short' })} ${ctx.fromISO(iso).getDate()}</span>
      </button>`;
    }).join('');

    let body;
    if (d.race){
      body = `
        <div class="tiles">
          ${tile('Breakfast', `${round5(2 * w)}-${round5(3 * w)} g`, `carbs, ${variant === 'early' ? '3-3.5' : '3-4'} h before`, 'is-carb')}
          ${tile('Pre-race fluid', `${round5(5 * w)}-${round5(7 * w)} ml`, 'over the 2-4 h before', 'is-fluid')}
          ${tile('During', `${gelCount} gels`, `one every 30 min · ~${Math.round(GEL_G * 2)} g/h`, 'is-carb')}
          ${tile('Recovery', `${round5(1 * w)} g carbs`, '+ 20-25 g protein', 'is-fluid')}
        </div>
        <h3 class="fuel-h3">Timeline for a ${ctx.escapeHtml(start)} start <span class="variant-tag">${variant === 'early' ? 'early wave' : 'later wave'}</span></h3>
        ${timelineHTML(start)}`;
    } else {
      body = `
        <div class="tiles">
          ${tile('Carbs', `${round5(d.carbs * w)} g`, `${d.carbs} g/kg`, 'is-carb')}
          ${tile('Protein', `${round5(d.protein * w)} g`, `${d.protein} g/kg`)}
          ${tile('Fluid', ctx.escapeHtml(d.fluid), ctx.escapeHtml(d.fluidNote || ''), 'is-fluid')}
          ${tile('Electrolytes', ctx.escapeHtml(d.electrolytes), ctx.escapeHtml(d.electrolytesNote || ''), 'is-fluid')}
        </div>
        <p class="fibre-line"><span>Fibre</span>${ctx.escapeHtml(d.fibre)}</p>
        <p class="meal-hint">Pick one option per meal. Numbers are for ~55 kg - scale portions to land near ${round5(d.carbs * w)} g carbs across 3 meals and snacks.</p>
        ${mealsHTML(FUEL_PLAN.meals[d.mealSet])}`;
    }

    return `
      <p class="view-sub race-sub">${ctx.escapeHtml(raceName(race))} · ${shortDate(race.date)}. ${sub}</p>
      <div class="fuel-settings">
        <div class="fs-field"><span>Start time (24-hour)</span>${TimeBox.html('fuelStart', minutesOf(start) * 60, { parts: 'hm', clock: true, label: 'Race start' })}</div>
        <p class="fs-note">Your wave time is on your race documents (London's waves run from about ${ctx.escapeHtml((race.startWindow || ['09:00'])[0])} to ${ctx.escapeHtml((race.startWindow || ['', '11:30'])[1])}). Gel times use your goal from the Paces tab.</p>
      </div>
      <div class="day-chips" aria-label="Race-week day">${dayChips}</div>
      <section class="fuel-day ${d.race ? 'is-race' : ''}" data-race-id="${race.id}">
        <div class="fd-head">
          <span class="fd-off">${offLabel(offset)}</span>
          <div>
            <h2 class="fd-title">${ctx.escapeHtml(d.title)}</h2>
            <p class="fd-meta">${shortDate(dateISO)}${session ? ' · Training: ' + ctx.escapeHtml(session.title) : ''}</p>
          </div>
        </div>
        <p class="fd-focus">${ctx.escapeHtml(d.focus)}</p>
        ${body}
      </section>`;
  }

  /* ---------------- tab ---------------- */
  function renderTab(el){
    const s = settings();
    const today = ctx.todayISO();
    if (!section) section = raceWindowFor(today) ? 'race' : 'everyday';
    const inner = section === 'race' ? raceHTML() : (section === 'long' ? longHTML() : everydayHTML());
    el.innerHTML = `
      <div class="view-head">
        <div class="eyebrow">Fuel</div>
        <h1 class="view-title">${{ everyday: 'Eating for training', long: 'Fuelling long runs', race: 'Race-week fuel' }[section]}</h1>
      </div>
      <div class="seg" role="tablist" aria-label="Fuel section">
        ${SECTIONS.map(([k, label]) => `<button class="seg-btn ${k === section ? 'is-on' : ''}" role="tab" aria-selected="${k === section}" data-sec="${k}">${label}</button>`).join('')}
      </div>
      <div class="fuel-settings">
        <label class="fs-field"><span>Body weight</span><span class="fs-input"><input id="fuelWeight" type="text" inputmode="decimal" value="${ctx.escapeHtml(String(s.weight || DEFAULT_WEIGHT))}" maxlength="5"><em>kg</em></span></label>
      </div>
      ${inner}
      <section class="fuel-card">
        <h2 class="fc-title">Supplements</h2>
        <dl class="supps">${FUEL_PLAN.supplements.map(x => `<dt>${ctx.escapeHtml(x.name)}</dt><dd>${ctx.escapeHtml(x.how)}</dd>`).join('')}</dl>
      </section>
      <section class="fuel-card">
        <h2 class="fc-title">Ground rules</h2>
        ${listHTML(FUEL_PLAN.rules)}
      </section>`;

    el.querySelectorAll('[data-sec]').forEach(b => b.addEventListener('click', () => {
      section = b.getAttribute('data-sec');
      renderTab(el);
    }));
    el.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => {
      dayKind = b.getAttribute('data-kind');
      renderTab(el);
    }));
    const raceEl = el.querySelector('[data-race-id]');
    el.querySelectorAll('[data-chip]').forEach(b => b.addEventListener('click', () => {
      select(raceEl.getAttribute('data-race-id'), Number(b.getAttribute('data-chip')));
      renderTab(el);
    }));
    const wIn = el.querySelector('#fuelWeight');
    wIn.addEventListener('change', () => {
      const v = parseFloat(wIn.value);
      const cur = settings();
      if (v >= 35 && v <= 160){ cur.weight = Math.round(v * 10) / 10; saveSettings(cur); }
      renderTab(el);
    });
    const sBox = el.querySelector('[data-tbox="fuelStart"]');
    if (sBox) TimeBox.wire(sBox.parentNode, (n, secs) => {
      if (secs === null) return;
      const cur = settings();
      const rid = raceEl ? raceEl.getAttribute('data-race-id') : upcomingRace().id;
      const mins = Math.round(secs / 60);
      cur.starts[rid] = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      saveSettings(cur);
      renderTab(el);
    });
  }

  return { init, renderTab, todayCardHTML, select, raceWindowFor, clockAt, variantFor };
})();
