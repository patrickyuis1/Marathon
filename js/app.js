/* =====================================================================
   MARATHON DAILY — app logic
   No build step, no backend. Progress (and day-swap arrangements) are
   stored in the browser via localStorage — private to this device/browser.
   The program itself lives in program-data.js as plain, editable data.
   ===================================================================== */

(function(){
  "use strict";

  const STORAGE_KEY = 'maraProgress_v1';
  const RACE_TIME_KEY = 'maraRaceTimes_v1';
  const DAYORDER_KEY = 'maraDayOrder_v1';
  const EXLOG_KEY = 'maraExerciseLog_v1';
  const HOLIDAY_KEY = 'maraHoliday_v1';
  const PROFILES_KEY = 'maraProfiles_v1';
  const ACTIVE_PROFILE_KEY = 'maraActiveProfile_v1';
  const ANKLE_KEY = 'maraAnkle_v1';
  const OWN_KEY = 'maraOwn_v1';
  // Race weeks are fixed to the real race date, so swapping is switched off for them.
  const RACES = PROGRAM.races || [{ id: 'race1', label: 'Race 1', date: PROGRAM.race1 }, { id: 'race2', label: 'Race 2', date: PROGRAM.race2 }];
  const LOCKED_WEEKS = PROGRAM.weeks.filter(w => w.days.some(d => RACES.some(r => r.date === d.date))).map(w => w.weekNum);

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* ---------------- profiles (device-local — each browser has its own list) ---------------- */
  function loadProfiles(){
    try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) || []; }
    catch(e){ return []; }
  }
  function saveProfiles(list){
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(list)); } catch(e){}
  }
  function getActiveProfileId(){
    try { return localStorage.getItem(ACTIVE_PROFILE_KEY); } catch(e){ return null; }
  }
  function setActiveProfileId(id){
    try { localStorage.setItem(ACTIVE_PROFILE_KEY, id); } catch(e){}
  }
  function createProfile(name){
    const id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
    const list = loadProfiles();
    list.push({ id, name, createdAt: new Date().toISOString() });
    saveProfiles(list);
    return id;
  }
  function deleteProfile(id){
    saveProfiles(loadProfiles().filter(p => p.id !== id));
    [STORAGE_KEY, RACE_TIME_KEY, DAYORDER_KEY, EXLOG_KEY, HOLIDAY_KEY].forEach(base => {
      try { localStorage.removeItem(nsKey(base, id)); } catch(e){}
    });
    if (getActiveProfileId() === id) setActiveProfileId(null);
  }
  function avatarColor(name){
    const palette = ['#2DD4BF', '#FF6B35', '#8B93FF', '#F472B6', '#4ADE80', '#FBBF24'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  }
  // Namespaces a storage base-key to the active (or given) profile, so every
  // profile's progress/swaps/race-times live in completely separate keys.
  function nsKey(base, profileId){
    const pid = profileId || getActiveProfileId();
    return pid ? `${base}::${pid}` : base;
  }

  /* ---------------- date helpers (local time, no UTC drift) ---------------- */
  function pad(n){ return String(n).padStart(2,'0'); }
  function toISO(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function fromISO(s){ const [y,m,dd] = s.split('-').map(Number); return new Date(y, m-1, dd); }
  function todayISO(){ return toISO(new Date()); }
  function addDays(iso, n){ const d = fromISO(iso); d.setDate(d.getDate()+n); return toISO(d); }
  function fmtLong(iso){ return fromISO(iso).toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'}); }
  function fmtShort(iso){ return fromISO(iso).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}); }

  /* ---------------- flatten PROGRAM for lookups ---------------- */
  const DAY_INDEX = {};      // date -> { week, day }  ("day" = the fixed calendar slot: dayName etc.)
  const FLAT_DATES = [];     // ordered list of all 126 dates
  PROGRAM.weeks.forEach(w => {
    w.days.forEach(d => {
      DAY_INDEX[d.date] = { week: w, day: d };
      FLAT_DATES.push(d.date);
    });
  });
  const PROGRAM_START = PROGRAM.startDate;
  const PROGRAM_END = FLAT_DATES[FLAT_DATES.length - 1];

  function clampISO(iso){
    if (iso < PROGRAM_START) return PROGRAM_START;
    if (iso > PROGRAM_END) return PROGRAM_END;
    return iso;
  }
  function weekOf(dateStr){ return DAY_INDEX[dateStr].week; }
  function posInWeek(dateStr){
    const week = weekOf(dateStr);
    return week.days.findIndex(d => d.date === dateStr);
  }
  function weekAllowsSwap(week){ return !LOCKED_WEEKS.includes(week.weekNum); }

  /* ---------------- persistence: progress ---------------- */
  function loadProgress(){
    try { return JSON.parse(localStorage.getItem(nsKey(STORAGE_KEY))) || {}; }
    catch(e){ return {}; }
  }
  function saveProgress(p){
    try { localStorage.setItem(nsKey(STORAGE_KEY), JSON.stringify(p)); } catch(e){ /* storage unavailable */ }
  }
  function isChecked(date, idx){
    const p = loadProgress();
    return !!(p[date] && p[date][idx]);
  }
  function toggleChecked(date, idx){
    const p = loadProgress();
    if (!p[date]) p[date] = {};
    p[date][idx] = !p[date][idx];
    saveProgress(p);
  }
  function loadRaceTimes(){
    try { return JSON.parse(localStorage.getItem(nsKey(RACE_TIME_KEY))) || {}; }
    catch(e){ return {}; }
  }
  function saveRaceTime(date, val){
    const t = loadRaceTimes();
    t[date] = val;
    try { localStorage.setItem(nsKey(RACE_TIME_KEY), JSON.stringify(t)); } catch(e){}
  }

  /* ---------------- persistence: day-swap arrangement ---------------- */
  // Per week (keyed by that week's Monday date): a permutation of [0..6].
  // perm[i] = which ORIGINAL day-index's content is shown on calendar position i.
  function loadDayOrder(){
    try { return JSON.parse(localStorage.getItem(nsKey(DAYORDER_KEY))) || {}; }
    catch(e){ return {}; }
  }
  function saveDayOrder(o){
    try { localStorage.setItem(nsKey(DAYORDER_KEY), JSON.stringify(o)); } catch(e){}
  }
  function getWeekOrder(weekStartDate){
    const o = loadDayOrder();
    return o[weekStartDate] || [0,1,2,3,4,5,6];
  }
  function setWeekOrder(weekStartDate, perm){
    const o = loadDayOrder();
    o[weekStartDate] = perm;
    saveDayOrder(o);
  }

  // The plan content on a calendar date after any swap, before ankle adjustments.
  function getRawContentFor(dateStr){
    const week = weekOf(dateStr);
    const perm = getWeekOrder(week.days[0].date);
    const pos = posInWeek(dateStr);
    return week.days[perm[pos]];
  }
  // What's actually shown: swap-aware, and eased off if this week's ankle
  // check-in said Sore or Worse (from the day of the check-in onwards).
  // Alternatives only change block text, never the number of blocks, so
  // ticks keyed by block index stay valid.
  function getContentFor(dateStr){
    const raw = getRawContentFor(dateStr);
    const mode = ankleModeOn(dateStr);
    if (!mode) return raw;
    const day = Object.assign({}, raw, (raw.alt && raw.alt[mode]) || {}, { ankleMode: mode });
    day.blocks = raw.blocks.map(b => (b.alt && b.alt[mode]) ? Object.assign({}, b, b.alt[mode]) : b);
    return day;
  }

  /* ---------------- persistence: weekly ankle check-in ---------------- */
  // { [weekStartISO]: { level, from } }. Sore / Worse switch that week's
  // remaining days to their eased-off versions; OK / Better / Pain-free = plan as written.
  const ANKLE_LEVELS = [
    { k: 'worse',  label: 'Worse',     sub: 'than last week',  mode: 'worse' },
    { k: 'sore',   label: 'Sore',      sub: 'niggly or achy',  mode: 'sore' },
    { k: 'ok',     label: 'OK',        sub: 'about the same',  mode: null },
    { k: 'better', label: 'Better',    sub: 'improving',       mode: null },
    { k: 'great',  label: 'Pain-free', sub: 'all good',        mode: null },
  ];
  const ANKLE_LAST_WEEK = 20;     // taper, race week and recovery aren't adjusted
  function loadAnkle(){
    try { return JSON.parse(localStorage.getItem(nsKey(ANKLE_KEY))) || {}; }
    catch(e){ return {}; }
  }
  function saveAnkle(a){
    try { localStorage.setItem(nsKey(ANKLE_KEY), JSON.stringify(a)); } catch(e){}
  }
  function levelInfo(k){ return ANKLE_LEVELS.find(l => l.k === k) || null; }
  function ankleModeOn(dateStr){
    const week = weekOf(dateStr);
    if (week.weekNum > ANKLE_LAST_WEEK) return null;
    const rec = loadAnkle()[week.days[0].date];
    if (!rec) return null;
    const info = levelInfo(rec.level);
    if (!info || !info.mode) return null;
    return dateStr >= (rec.from || week.days[0].date) ? info.mode : null;
  }
  function setAnkleLevel(weekStart, level){
    const a = loadAnkle();
    const prev = a[weekStart];
    const wasAdjusting = prev && levelInfo(prev.level) && levelInfo(prev.level).mode;
    const t = todayISO();
    const from = (wasAdjusting && prev.from) ? prev.from : (t > weekStart ? t : weekStart);
    a[weekStart] = { level, from };
    saveAnkle(a);
  }

  /* ---------------- persistence: "did my own session" ---------------- */
  function loadOwn(){
    try { return JSON.parse(localStorage.getItem(nsKey(OWN_KEY))) || {}; }
    catch(e){ return {}; }
  }
  function saveOwn(o){
    try { localStorage.setItem(nsKey(OWN_KEY), JSON.stringify(o)); } catch(e){}
  }
  function ownSession(dateStr){ return loadOwn()[dateStr] || null; }
  function setOwnSession(dateStr, note){
    const o = loadOwn();
    if (note === null) delete o[dateStr]; else o[dateStr] = { note: note || '' };
    saveOwn(o);
  }
  function isSwapped(dateStr){
    const week = weekOf(dateStr);
    const perm = getWeekOrder(week.days[0].date);
    const pos = posInWeek(dateStr);
    return perm[pos] !== pos;
  }
  function performSwap(dateA, dateB){
    const week = weekOf(dateA);
    const weekStart = week.days[0].date;
    const posA = posInWeek(dateA);
    const posB = posInWeek(dateB);
    const perm = getWeekOrder(weekStart).slice();
    const tmp = perm[posA]; perm[posA] = perm[posB]; perm[posB] = tmp;
    setWeekOrder(weekStart, perm);

    // completion state follows the content it belongs to
    const prog = loadProgress();
    const a = prog[dateA], b = prog[dateB];
    if (b === undefined) delete prog[dateA]; else prog[dateA] = b;
    if (a === undefined) delete prog[dateB]; else prog[dateB] = a;
    saveProgress(prog);
    const own = loadOwn();
    const oa = own[dateA], ob = own[dateB];
    if (ob === undefined) delete own[dateA]; else own[dateA] = ob;
    if (oa === undefined) delete own[dateB]; else own[dateB] = oa;
    saveOwn(own);
  }
  function resetWeekOrder(weekStart){
    // undo swaps one at a time so ticks travel back with their sessions
    const week = PROGRAM.weeks.find(w => w.days[0].date === weekStart);
    for (let guard = 0; guard < 10; guard++){
      const perm = getWeekOrder(weekStart);
      const i = perm.findIndex((v, idx) => v !== idx);
      if (i < 0) break;
      const j = perm.indexOf(i);
      performSwap(week.days[i].date, week.days[j].date);
    }
  }

  /* ---------------- persistence: exercise history log ---------------- */
  // Keyed by exercise NAME (stable across the weeks it recurs), each an array
  // of {date, ...fields} entries, so "what did I do last time" is a simple
  // lookup regardless of which week/date that last occurrence was.
  function loadExerciseLog(){
    try { return JSON.parse(localStorage.getItem(nsKey(EXLOG_KEY))) || {}; }
    catch(e){ return {}; }
  }
  function saveExerciseLog(log){
    try { localStorage.setItem(nsKey(EXLOG_KEY), JSON.stringify(log)); } catch(e){}
  }
  function getExerciseHistory(name){
    const log = loadExerciseLog();
    return (log[name] || []).slice().sort((a, b) => a.date < b.date ? -1 : (a.date > b.date ? 1 : 0));
  }
  function getEntryOn(name, dateStr){
    return getExerciseHistory(name).find(e => e.date === dateStr) || null;
  }
  function getMostRecentEntry(name, beforeDate){
    const hist = getExerciseHistory(name).filter(e => e.date < beforeDate);
    return hist.length ? hist[hist.length - 1] : null;
  }
  function saveExerciseEntry(name, dateStr, values){
    const log = loadExerciseLog();
    if (!log[name]) log[name] = [];
    log[name] = log[name].filter(e => e.date !== dateStr);
    log[name].push({ date: dateStr, ...values });
    saveExerciseLog(log);
  }
  function formatEntryValue(field, entry){
    const v = entry ? entry[field.key] : null;
    if (!v) return null;
    if (field.type === 'duration') return TimeBox.format(TimeBox.parse(v));
    return `${v}${field.unit || ''}`;
  }

  /* ---------------- persistence: holiday mode ---------------- */
  // A day marked as holiday is excused: it's skipped in streak-breaking logic
  // and removed from the adherence denominator, instead of counting against you.
  function loadHolidays(){
    try { return JSON.parse(localStorage.getItem(nsKey(HOLIDAY_KEY))) || {}; }
    catch(e){ return {}; }
  }
  function saveHolidays(h){
    try { localStorage.setItem(nsKey(HOLIDAY_KEY), JSON.stringify(h)); } catch(e){}
  }
  function isHoliday(dateStr){
    return !!loadHolidays()[dateStr];
  }
  function getHolidayReason(dateStr){
    const h = loadHolidays()[dateStr];
    return h ? (h.reason || '') : '';
  }
  function setHoliday(dateStr, on, reason){
    const h = loadHolidays();
    if (on) h[dateStr] = { reason: reason || (h[dateStr] ? h[dateStr].reason : '') || '' };
    else delete h[dateStr];
    saveHolidays(h);
  }


  /* ---------------- block helpers ---------------- */
  function isNote(b){ return b.pattern === 'rest' && b.prescription === ''; }
  function checkableIndices(content){
    return content.blocks.map((b,i)=>i).filter(i => !isNote(content.blocks[i]));
  }
  function isDayComplete(dateStr){
    if (ownSession(dateStr)) return true;
    const content = getContentFor(dateStr);
    if (!content) return false;
    const idxs = checkableIndices(content);
    if (idxs.length === 0) return false;
    return idxs.every(i => isChecked(dateStr, i));
  }
  function dayCompletionPct(dateStr){
    if (ownSession(dateStr)) return 100;
    const content = getContentFor(dateStr);
    if (!content) return 0;
    const idxs = checkableIndices(content);
    if (idxs.length === 0) return 0;
    const done = idxs.filter(i => isChecked(dateStr, i)).length;
    return Math.round((done/idxs.length)*100);
  }
  function accentVar(sessionType){
    return { gym:'var(--gym)', run:'var(--run)', rest:'var(--rest)', race:'var(--race)' }[sessionType] || 'var(--gym)';
  }

  /* ---------------- state ---------------- */
  let viewDate = clampISO(todayISO());
  let swapPanelOpen = false;
  let currentTab = 'plan';
  let sheetOpener = null;

  /* ---------------- modules (Fuel, Mobility) share these helpers ---------------- */
  const CTX = { nsKey, todayISO, fromISO, toISO, addDays, fmtShort, escapeHtml, getContentFor, loadExerciseLog, openSheet: (t, m, h) => openSheet(t, m, h) };
  PacesUI.init(CTX);
  FuelUI.init(CTX);
  MobilityUI.init(CTX);
  const T = str => PacesUI.fill(str || '');   // swap {E}, {HRE}... for this profile's paces

  /* ---------------- tabs ---------------- */
  const VIEWS = { plan: 'planView', paces: 'pacesView', fuel: 'fuelView', mobility: 'mobilityView' };
  function showTab(name, opts){
    opts = opts || {};
    currentTab = name;
    Object.keys(VIEWS).forEach(k => { document.getElementById(VIEWS[k]).hidden = (k !== name); });
    document.querySelectorAll('.tabbar .tab').forEach(b => {
      const on = b.getAttribute('data-tab') === name;
      b.classList.toggle('is-active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    document.getElementById('todayBtn').hidden = (name !== 'plan');
    if (name === 'plan') renderAll();
    if (name === 'paces') PacesUI.renderTab(document.getElementById('pacesView'));
    if (name === 'fuel'){
      FuelUI.select(opts.raceId, opts.offset, opts.section);
      FuelUI.renderTab(document.getElementById('fuelView'));
    }
    if (name === 'mobility'){
      const pref = opts.routine || (opts.fromDay ? MobilityUI.routineForSession(getContentFor(viewDate).sessionType) : null);
      MobilityUI.renderTab(document.getElementById('mobilityView'), pref);
    }
    try { window.scrollTo(0, 0); } catch(e){}
  }

  /* ---------------- bottom sheet (routines, rearrange, progression) ---------------- */
  function openSheet(title, meta, html, opener){
    sheetOpener = opener || document.activeElement || null;
    document.getElementById('sheetTitle').textContent = title;
    document.getElementById('sheetMeta').textContent = meta || '';
    document.getElementById('sheetBody').innerHTML = html;
    document.getElementById('sheet').hidden = false;
    document.body.classList.add('sheet-open');
    document.getElementById('sheetCloseBtn').focus();
  }
  function openRoutine(key, opener){
    const r = ROUTINES[key];
    if (!r) return;
    openSheet(r.name, `${r.duration} · ${r.when}`, MobilityUI.stepsHTML(key), opener);
  }
  function closeSheet(){
    const sheet = document.getElementById('sheet');
    if (sheet.hidden) return;
    sheet.hidden = true;
    document.body.classList.remove('sheet-open');
    if (sheetOpener && document.body.contains(sheetOpener)) sheetOpener.focus();
    sheetOpener = null;
  }

  /* ---------------- profile screen + boot flow ---------------- */
  function renderProfileList(){
    const list = document.getElementById('profileList');
    const profiles = loadProfiles();
    if (profiles.length === 0){
      list.innerHTML = `<p class="profile-empty">No profiles yet on this device — add your name below.</p>`;
    } else {
      list.innerHTML = profiles.map(p => `
        <div class="profile-card">
          <button class="profile-select" data-profile="${p.id}">
            <span class="profile-avatar" style="background:${avatarColor(p.name)}">${escapeHtml(p.name.slice(0,1).toUpperCase())}</span>
            <span class="profile-name">${escapeHtml(p.name)}</span>
          </button>
          <button class="profile-delete" data-delete="${p.id}" aria-label="Delete ${escapeHtml(p.name)}'s profile">×</button>
        </div>
      `).join('');
    }
    list.querySelectorAll('[data-profile]').forEach(btn => {
      btn.addEventListener('click', () => {
        setActiveProfileId(btn.getAttribute('data-profile'));
        enterApp();
      });
    });
    list.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete');
        const p = profiles.find(x => x.id === id);
        if (window.confirm(`Delete ${p ? p.name : 'this'}'s profile and all their progress on this device? This can't be undone.`)){
          deleteProfile(id);
          renderProfileList();
        }
      });
    });
  }

  function showProfileScreen(){
    document.getElementById('mainApp').hidden = true;
    document.getElementById('profileScreen').hidden = false;
    renderProfileList();
    document.getElementById('newProfileName').value = '';
  }

  function enterApp(){
    document.getElementById('profileScreen').hidden = true;
    document.getElementById('mainApp').hidden = false;
    const profiles = loadProfiles();
    const active = profiles.find(p => p.id === getActiveProfileId());
    document.getElementById('activeProfileName').textContent = active ? active.name : '';
    viewDate = clampISO(todayISO());
    swapPanelOpen = false; ownEditing = false; ankleEditing = false;
    closeSheet();
    showTab('plan');
  }

  function addProfileFromInput(){
    const input = document.getElementById('newProfileName');
    const name = input.value.trim();
    if (!name) return;
    const id = createProfile(name);
    setActiveProfileId(id);
    enterApp();
  }

  function boot(){
    const profiles = loadProfiles();
    const activeId = getActiveProfileId();
    if (activeId && profiles.some(p => p.id === activeId)){
      enterApp();
    } else if (profiles.length === 1){
      setActiveProfileId(profiles[0].id);
      enterApp();
    } else {
      showProfileScreen();
    }
  }

  /* ---------------- rendering ---------------- */

  function renderBanner(){
    const el = document.getElementById('startBanner');
    const real = todayISO();
    if (real < PROGRAM_START){
      const days = Math.round((fromISO(PROGRAM_START) - fromISO(real)) / 86400000);
      el.innerHTML = `<div class="banner">Plan starts <b>${fmtLong(PROGRAM_START)}</b> — <b>${days} day${days===1?'':'s'}</b> to go. You're previewing week ${weekOf(viewDate).weekNum}.</div>`;
    } else if (real > PROGRAM_END){
      el.innerHTML = `<div class="banner">Plan complete - congratulations, marathoner. This is the final day of the plan.</div>`;
    } else {
      el.innerHTML = '';
    }
  }

  function renderPhaseCard(){
    const week = weekOf(viewDate);
    const phaseObj = PROGRAM.phases.find(p => p.weeks.includes(week.weekNum));
    const weekPosInPhase = phaseObj.weeks.indexOf(week.weekNum) + 1;

    document.getElementById('phaseName').textContent = phaseObj.name;
    document.getElementById('phaseWeek').textContent = `Week ${week.weekNum} / ${PROGRAM.weeks.length} · Phase wk ${weekPosInPhase}/${phaseObj.weeks.length}`;

    const flatIdx = FLAT_DATES.indexOf(viewDate);
    const pct = ((flatIdx+1) / FLAT_DATES.length) * 100;
    document.getElementById('phaseBarFill').style.width = pct.toFixed(1) + '%';

    const real = todayISO();
    let countdown;
    const nextRace = RACES.find(r => real <= r.date);
    if (nextRace){
      const d = Math.round((fromISO(nextRace.date) - fromISO(real)) / 86400000);
      const name = nextRace.city ? `${nextRace.city}` : nextRace.label;
      countdown = d === 0 ? `${name.toUpperCase()} IS TODAY` : `${d} day${d===1?'':'s'} to ${name}`;
    } else {
      countdown = 'Race done';
    }
    document.getElementById('raceCountdown').textContent = countdown;

    // This week's running: planned km vs what's been logged.
    let planned = 0, logged = 0;
    const log = loadExerciseLog();
    week.days.forEach(d => {
      const c = getContentFor(d.date);
      c.blocks.forEach(b => {
        const m = /^(\d+(?:\.\d+)?) km$/.exec(b.prescription || '');
        if (m && b.pattern === 'run') planned += parseFloat(m[1]);
        if (b.log && b.log.fields.some(f => f.key === 'distance')){
          const e = (log[b.name] || []).find(x => x.date === d.date);
          if (e && parseFloat(e.distance) > 0) logged += parseFloat(e.distance);
        }
      });
    });
    const fmtKm = v => (Math.round(v * 10) / 10).toString();
    document.getElementById('adherenceStat').textContent = planned
      ? `This week: ${fmtKm(logged)} / ${fmtKm(planned)} km`
      : (logged ? `This week: ${fmtKm(logged)} km` : '');
  }

  function renderWeekRail(){
    const week = weekOf(viewDate);
    const rail = document.getElementById('weekRail');
    rail.innerHTML = '';
    const real = todayISO();
    week.days.forEach(slot => {
      const realDate = slot.date;                 // calendar date never moves
      const content = getContentFor(realDate);     // may be swapped-in content
      const pct = dayCompletionPct(realDate);
      const done = pct === 100;
      const partial = pct > 0 && pct < 100;
      const onHoliday = isHoliday(realDate);
      const btn = document.createElement('button');
      btn.className = `week-dot type-${content.sessionType} ${done?'done':''} ${partial?'partial':''} ${onHoliday?'holiday':''} ${realDate===real?'is-today':''} ${realDate===viewDate?'is-viewing':''}`;
      if (partial) btn.style.setProperty('--pct', pct + '%');
      btn.innerHTML = `<span class="wd-letter">${slot.dayName.slice(0,3)}</span><span class="wd-ring">${onHoliday ? '⛱' : fromISO(realDate).getDate()}</span><span class="wd-flag">${realDate===real ? 'Today' : ''}</span>`;
      if (realDate === viewDate) btn.setAttribute('aria-current', 'date');
      btn.setAttribute('aria-label', `${slot.dayName} ${fmtShort(realDate)}${onHoliday?' - holiday mode':(done?' - complete':'')}`);
      btn.addEventListener('click', () => { viewDate = realDate; swapPanelOpen = false; ownEditing = false; ankleEditing = false; renderAll(); });
      rail.appendChild(btn);
    });
  }

  // Instructions are stored one per line. Lines that start "Label: ..." get
  // the label picked out so a session reads like a recipe.
  function detailHTML(text, cls){
    const t = T(text);
    if (!t) return '';
    const rows = t.split('\n').filter(Boolean);
    if (rows.length === 1 && !/^[A-Z][A-Za-z -]{1,14}: /.test(rows[0])) return `<div class="${cls || 'station-detail'}">${escapeHtml(rows[0])}</div>`;
    return `<ul class="${cls || 'station-detail'} steps">${rows.map(r => {
      const m = /^([A-Z][A-Za-z0-9 -]{1,14}): (.*)$/.exec(r);
      return m ? `<li><b>${escapeHtml(m[1])}:</b> ${escapeHtml(m[2])}</li>` : `<li>${escapeHtml(r)}</li>`;
    }).join('')}</ul>`;
  }

  function logInputHTML(block, dateStr){
    if (!block.log || !block.log.fields || !block.log.fields.length) return '';
    const fields = block.log.fields;
    const prev = getMostRecentEntry(block.name, dateStr);
    const current = getEntryOn(block.name, dateStr) || {};

    const prevParts = fields.map(f => formatEntryValue(f, prev)).filter(Boolean);
    const prevText = prevParts.length
      ? `Last: <b>${escapeHtml(prevParts.join(' / '))}</b> (${fmtShort(prev.date)})`
      : 'No previous log yet';

    const inputs = fields.filter(f => f.type !== 'duration').map(f => `
      <span class="log-field">
        <input class="log-input" data-logfield="${f.key}" type="text" inputmode="${f.inputmode || 'text'}"
               placeholder="${escapeHtml(f.placeholder || '')}" value="${escapeHtml(current[f.key] || '')}">
        <span class="log-field-label">${escapeHtml(f.label)}</span>
      </span>`).join('');
    const durations = fields.filter(f => f.type === 'duration').map(f => `
      <div class="log-duration"><span class="log-dur-label">${escapeHtml(f.label)}</span>${TimeBox.html(f.key, TimeBox.parse(current[f.key]), { label: block.name + ' ' + f.label })}</div>`).join('');

    return `<div class="log-row" data-logname="${escapeHtml(block.name)}">
      <span class="log-prev">${prevText}</span>
      ${inputs ? `<span class="log-inputs">${inputs}</span>` : ''}
      ${durations}
      <span class="log-saved" aria-live="polite"></span>
    </div>`;
  }

  function stationHTML(content, dateStr, idx){
    const b = content.blocks[idx];
    const checked = isChecked(dateStr, idx);

    if (isNote(b)){
      return `
      <div class="station note">
        <div class="station-line"></div>
        <div class="station-node">${PICTOGRAMS['rest']}</div>
        <div class="station-body">
          <div class="station-name">${b.name}</div>
          ${detailHTML(b.detail)}
        </div>
      </div>`;
    }

    const videoLink = b.videoQuery
      ? `<a class="station-video" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(b.videoQuery)}">Watch a demo ↗</a>`
      : '';

    return `
      <div class="station ${checked?'checked':''}" data-idx="${idx}">
        <div class="station-line"></div>
        <button class="station-node" aria-label="Mark ${b.name} done" data-toggle="${idx}">
          ${PICTOGRAMS[b.pattern] || PICTOGRAMS['core']}
          <span class="p-check">✓</span>
        </button>
        <div class="station-body">
          <div class="station-name">${b.name}</div>
          ${b.prescription ? `<div class="station-prescription">${T(b.prescription)}</div>` : ''}
          ${detailHTML(b.detail)}
          ${b.cue ? `<div class="station-cue">${escapeHtml(T(b.cue))}</div>` : ''}
          ${videoLink}
          ${MobilityUI.routineForBlock(b.name) ? `<button class="routine-link" data-routine="${MobilityUI.routineForBlock(b.name)}">Show the moves ›</button>` : ''}
          ${logInputHTML(b, dateStr)}
          ${b.name === '10k Time Trial' ? `<button class="routine-link pill save-result" data-save-result="${idx}">Save to my results ›</button>` : ''}
        </div>
      </div>`;
  }

  function restBlockHTML(content, dateStr){
    const idx = 0;
    const b = content.blocks[0];
    const checked = isChecked(dateStr, idx);
    return `
      <div class="rest-block ${checked?'checked':''}">
        <button class="station-node" aria-label="Mark rest day taken" data-toggle="${idx}">
          ${PICTOGRAMS['rest']}
          <span class="p-check">✓</span>
        </button>
        <div class="station-body">
          <div class="station-name">${b.name}</div>
          ${detailHTML(b.detail)}
          <button class="routine-link" data-routine="offday">Off-day mobility · 20 min ›</button>
        </div>
      </div>`;
  }

  function raceBlockHTML(content, dateStr){
    const idx = 0;
    const b = content.blocks[0];
    const checked = isChecked(dateStr, idx);
    const times = loadRaceTimes();
    const savedTime = times[dateStr] || '';
    return `
      <div class="race-block">
        ${detailHTML(b.detail, 'race-lead')}
        <div class="time-input-row">
          <span class="tir-label">Finish time</span>
          ${TimeBox.html('raceTime', TimeBox.parse(savedTime), { label: 'Finish time' })}
        </div>
        <div class="race-cue">${escapeHtml(T(b.cue))}</div>
        <button class="race-complete-btn ${checked?'done':''}" id="raceCompleteBtn" data-toggle="${idx}">
          ${checked ? '✓ Race Logged' : 'Mark Race Complete'}
        </button>
      </div>`;
  }

  function renderSwapUI(){
    const week = weekOf(viewDate);
    const btn = document.getElementById('swapToggleBtn');
    const lockedNote = document.getElementById('swapLockedNote');
    document.getElementById('swapPanel').hidden = true;
    if (!weekAllowsSwap(week)){
      btn.hidden = true;
      lockedNote.hidden = false;
      return;
    }
    lockedNote.hidden = true;
    btn.hidden = false;
    btn.textContent = '⇄ Move sessions around this week';
  }

  /* ---------------- rearrange-the-week sheet ---------------- */
  // Drag a session onto another day to swap them, or tap one then tap another.
  let rrSelected = null;
  function rearrangeHTML(week){
    const real = todayISO();
    const order = getWeekOrder(week.days[0].date);
    const moved = order.some((v, i) => v !== i);
    return `
      <p class="rr-help">Drag a session onto another day to swap them - or tap one session, then tap the day you want it on.</p>
      <ol class="rr-list" id="rrList">${week.days.map((slot, i) => {
        const c = getContentFor(slot.date);
        const tag = { gym:'Gym', run:'Run', rest:'Rest', race:'Race' }[c.sessionType];
        const flags = [slot.date === real ? '<span class="rr-flag is-today">Today</span>' : '', slot.date === viewDate ? '<span class="rr-flag">Viewing</span>' : ''].join('');
        return `<li class="rr-row ${rrSelected === slot.date ? 'is-source' : ''} ${rrSelected && rrSelected !== slot.date ? 'is-droppable' : ''}" data-date="${slot.date}">
          <div class="rr-day"><b>${slot.dayName.slice(0,3)}</b><span>${fromISO(slot.date).getDate()} ${fromISO(slot.date).toLocaleDateString('en-GB', { month: 'short' })}</span>${flags}</div>
          <button class="rr-tile type-${c.sessionType} ${rrSelected === slot.date ? 'is-selected' : ''}" data-date="${slot.date}" aria-pressed="${rrSelected === slot.date}">
            <span class="rr-grip" aria-hidden="true">⠿</span>
            <span class="rr-tag">${tag}</span>
            <span class="rr-title">${escapeHtml(c.title)}</span>
            ${isDayComplete(slot.date) ? '<span class="rr-done" aria-label="done">✓</span>' : ''}
            ${isSwapped(slot.date) ? '<span class="rr-moved" title="Moved from its original day">⇄</span>' : ''}
          </button>
        </li>`;
      }).join('')}</ol>
      <p class="rr-status" id="rrStatus" role="status">${rrSelected ? `Now tap the day to swap <b>${escapeHtml(getContentFor(rrSelected).title)}</b> with.` : ''}</p>
      <div class="rr-actions">
        <button class="ghost-btn" id="rrReset" ${moved ? '' : 'disabled'}>Reset week</button>
        <button class="today-btn" id="rrDone">Done</button>
      </div>`;
  }
  function openRearrange(opener){
    rrSelected = null;
    const week = weekOf(viewDate);
    openSheet('Move sessions around', `Week ${week.weekNum} · ${week.dateRange}. Ticks and logs move with their session.`, rearrangeHTML(week), opener);
    wireRearrange(week);
  }
  function refreshRearrange(week, flash){
    document.getElementById('sheetBody').innerHTML = rearrangeHTML(week);
    wireRearrange(week);
    (flash || []).forEach(d => { const row = document.querySelector(`.rr-row[data-date="${d}"]`); if (row) row.classList.add('just-swapped'); });
    renderAll();
  }
  function doSwap(week, a, b){
    if (!a || !b || a === b) return;
    performSwap(a, b);
    rrSelected = null;
    refreshRearrange(week, [a, b]);
  }
  function wireRearrange(week){
    const body = document.getElementById('sheetBody');
    body.querySelector('#rrDone').addEventListener('click', closeSheet);
    body.querySelector('#rrReset').addEventListener('click', () => { resetWeekOrder(week.days[0].date); rrSelected = null; refreshRearrange(week); });
    body.querySelectorAll('.rr-row').forEach(row => row.addEventListener('click', e => {
      // tapping anywhere on a row (not the tile) when a session is picked = drop it here
      if (rrSelected && !e.target.closest('.rr-tile')) doSwap(week, rrSelected, row.getAttribute('data-date'));
    }));
    body.querySelectorAll('.rr-tile').forEach(tile => {
      let start = null, dragging = false, target = null;
      const rows = () => [...body.querySelectorAll('.rr-row')];
      tile.addEventListener('pointerdown', e => {
        if (e.button !== undefined && e.button !== 0) return;
        start = { x: e.clientX, y: e.clientY }; dragging = false; target = null;
        try { tile.setPointerCapture(e.pointerId); } catch(err){}
      });
      tile.addEventListener('pointermove', e => {
        if (!start) return;
        const dy = e.clientY - start.y;
        if (!dragging && Math.abs(dy) > 8){ dragging = true; tile.classList.add('is-dragging'); body.classList.add('rr-dragging'); }
        if (!dragging) return;
        e.preventDefault();
        tile.style.transform = `translateY(${dy}px)`;
        target = null;
        rows().forEach(r => {
          const rc = r.getBoundingClientRect();
          const over = e.clientY >= rc.top && e.clientY <= rc.bottom && r.getAttribute('data-date') !== tile.getAttribute('data-date');
          r.classList.toggle('is-target', over);
          if (over) target = r.getAttribute('data-date');
        });
      });
      const end = () => {
        if (!start) return;
        const wasDrag = dragging;
        start = null; dragging = false;
        tile.style.transform = '';
        tile.classList.remove('is-dragging'); body.classList.remove('rr-dragging');
        rows().forEach(r => r.classList.remove('is-target'));
        const me = tile.getAttribute('data-date');
        if (wasDrag){ if (target) doSwap(week, me, target); return; }
        // a tap: pick this session, or drop the picked one here
        if (rrSelected && rrSelected !== me) doSwap(week, rrSelected, me);
        else { rrSelected = rrSelected === me ? null : me; refreshRearrange(week); }
      };
      tile.addEventListener('pointerup', end);
      tile.addEventListener('pointercancel', () => { start = null; dragging = false; tile.style.transform = ''; tile.classList.remove('is-dragging'); body.classList.remove('rr-dragging'); });
      tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); start = { x: 0, y: 0 }; end(); } });
    });
  }

  /* ---------------- weekly ankle check-in ---------------- */
  function ankleScoresBetween(from, to){
    const log = loadExerciseLog();
    const out = [];
    Object.keys(log).forEach(name => (log[name] || []).forEach(e => {
      const v = parseInt(e.ankle, 10);
      if (e.date >= from && e.date <= to && isFinite(v)) out.push({ date: e.date, v });
    }));
    return out.sort((a, b) => a.date < b.date ? -1 : 1);
  }
  let ankleEditing = false;
  function renderAnkleCheck(){
    const el = document.getElementById('ankleCheck');
    const week = weekOf(viewDate);
    const ws = week.days[0].date;
    const real = todayISO();
    if (week.weekNum > ANKLE_LAST_WEEK){ el.innerHTML = ''; return; }
    const opensOn = addDays(ws, -1);
    if (real < opensOn){
      el.innerHTML = `<div class="ankle-card is-muted"><span class="ac-dot"></span><span>Week ${week.weekNum} ankle check-in opens ${fromISO(opensOn).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}.</span></div>`;
      return;
    }
    const all = loadAnkle();
    const rec = all[ws];
    const prevWeek = PROGRAM.weeks.find(w => w.weekNum === week.weekNum - 1);
    const prevRec = prevWeek ? all[prevWeek.days[0].date] : null;
    const lastScores = prevWeek ? ankleScoresBetween(prevWeek.days[0].date, prevWeek.days[6].date) : [];
    const thisScores = ankleScoresBetween(ws, week.days[6].date);
    const highThisWeek = thisScores.filter(x => x.v >= 4);
    const info = rec ? levelInfo(rec.level) : null;
    const twoBad = info && info.mode && prevRec && levelInfo(prevRec.level) && levelInfo(prevRec.level).mode;

    const advice = !info ? '' : ({
      worse: 'Recovery week for the ankle: runs move to the bike or get much shorter, no speed work or hopping, extra ankle rehab. If you are limping, or it hurts at rest, see your physio before running again.',
      sore: 'Lighter week: runs about a quarter shorter and on flat ground, speed sessions become a gentle steady run, no strides, hills or hopping.',
      ok: 'Normal training this week.',
      better: 'Normal training this week. Keep logging the ankle score after each run.',
      great: week.weekNum >= 9 ? 'Normal training. If you can do 10 single-leg hops on the right foot with no pain, the hopping drills are unlocked.' : 'Normal training this week.',
    })[info.k];
    const fromNote = (info && info.mode && rec.from > ws) ? ` Applies from ${fromISO(rec.from).toLocaleDateString('en-GB', { weekday: 'long' })}.` : '';

    const chips = `<div class="ankle-chips" role="radiogroup" aria-label="How is the ankle this week?">${ANKLE_LEVELS.map(l => `
      <button class="ankle-chip lvl-${l.k} ${rec && rec.level === l.k ? 'is-on' : ''}" role="radio" aria-checked="${!!(rec && rec.level === l.k)}" data-ankle="${l.k}">
        <b>${l.label}</b><small>${l.sub}</small></button>`).join('')}</div>`;
    const scoresLine = lastScores.length ? `<p class="ac-scores">Last week's ankle scores: ${lastScores.map(x => x.v).join(', ')} /10</p>` : '';
    const nudge = highThisWeek.length && (!info || !info.mode)
      ? `<p class="ac-nudge">You logged ${highThisWeek.map(x => x.v + '/10').join(', ')} this week. Consider switching to <b>Sore</b> so the rest of the week eases off.</p>` : '';

    if (rec && !ankleEditing){
      el.innerHTML = `<div class="ankle-card is-set lvl-${info.k}">
        <div class="ac-row"><span class="ac-dot"></span><span class="ac-text"><b>Ankle this week: ${info.label}.</b> ${advice}${fromNote}</span>
        <button class="ac-change" id="ankleChange">Change</button></div>
        ${twoBad ? `<p class="ac-warn">Two weeks in a row now. Book in with your physio before the long runs grow - the plan will keep easing off until it settles.</p>` : ''}
        ${nudge}
      </div>`;
    } else {
      el.innerHTML = `<div class="ankle-card">
        <div class="ac-q"><b>Week ${week.weekNum} check-in: how's the ankle?</b><span>Sore or Worse eases off the rest of this week. Answer again next week and it goes back to normal once it's settled.</span></div>
        ${chips}${scoresLine}${nudge}
      </div>`;
    }
    el.querySelectorAll('[data-ankle]').forEach(b => b.addEventListener('click', () => {
      setAnkleLevel(ws, b.getAttribute('data-ankle'));
      ankleEditing = false;
      renderAll();
    }));
    const ch = el.querySelector('#ankleChange');
    if (ch) ch.addEventListener('click', () => { ankleEditing = true; renderAnkleCheck(); });
  }

  /* ---------------- "I did my own session" ---------------- */
  let ownEditing = false;
  function renderOwnUI(content){
    const slot = document.getElementById('ownSlot');
    const rail = document.getElementById('stationRail');
    if (content.sessionType === 'rest' || content.sessionType === 'race'){ slot.innerHTML = ''; rail.classList.remove('is-own'); return; }
    const own = ownSession(viewDate);
    rail.classList.toggle('is-own', !!own);
    if (own){
      slot.innerHTML = `<div class="own-banner"><span class="own-tick">✓</span><div><b>Own session - counted as done</b>${own.note ? `<span>${escapeHtml(own.note)}</span>` : ''}</div><button class="ac-change" id="ownUndo">Undo</button></div>`;
      slot.querySelector('#ownUndo').addEventListener('click', () => { setOwnSession(viewDate, null); renderAll(); });
    } else if (ownEditing){
      slot.innerHTML = `<div class="own-panel">
        <label for="ownNote">What did you do instead? <small>(optional)</small></label>
        <input id="ownNote" type="text" maxlength="100" placeholder="e.g. 45 min spin class, my usual leg day">
        <div class="own-actions"><button class="ghost-btn" id="ownCancel">Cancel</button><button class="today-btn" id="ownSave">Count today as done</button></div>
      </div>`;
      slot.querySelector('#ownCancel').addEventListener('click', () => { ownEditing = false; renderOwnUI(content); });
      slot.querySelector('#ownSave').addEventListener('click', () => { setOwnSession(viewDate, slot.querySelector('#ownNote').value.trim()); ownEditing = false; renderAll(); });
      slot.querySelector('#ownNote').focus();
    } else {
      slot.innerHTML = `<button class="own-btn" id="ownBtn">Doing my own session today instead</button>`;
      slot.querySelector('#ownBtn').addEventListener('click', () => { ownEditing = true; renderOwnUI(content); });
    }
  }

  function renderHolidayUI(){
    const content = getContentFor(viewDate);
    const row = document.getElementById('holidayRow');
    const btn = document.getElementById('holidayToggleBtn');
    const panel = document.getElementById('holidayPanel');
    const reasonInput = document.getElementById('holidayReasonInput');

    if (content.sessionType === 'race'){
      row.hidden = true;
      panel.hidden = true;
      return;
    }
    row.hidden = false;
    const onHoliday = isHoliday(viewDate);
    btn.textContent = onHoliday ? '✕ Undo Holiday Mode' : '🏖 Mark as Holiday Mode';
    btn.classList.toggle('active', onHoliday);
    panel.hidden = !onHoliday;
    reasonInput.value = onHoliday ? getHolidayReason(viewDate) : '';
  }

  function renderDay(){
    const slot = DAY_INDEX[viewDate].day;       // fixed calendar info (weekday name)
    const content = getContentFor(viewDate);    // swap-aware content

    document.getElementById('dhName').textContent = slot.dayName;
    document.getElementById('dhDate').textContent = fmtShort(viewDate);

    document.getElementById('prevDayBtn').disabled = viewDate <= PROGRAM_START;
    document.getElementById('nextDayBtn').disabled = viewDate >= PROGRAM_END;

    const card = document.getElementById('sessionCard');
    card.className = `session-card type-${content.sessionType}`;
    card.style.setProperty('--session-accent', accentVar(content.sessionType));

    document.getElementById('sessionTag').className = `session-tag type-${content.sessionType}`;
    document.getElementById('sessionTag').textContent =
      { gym:'Gym', run:'Run', rest:'Rest', race:'Race Day' }[content.sessionType];
    document.getElementById('swappedBadge').hidden = !isSwapped(viewDate);
    const ab = document.getElementById('ankleBadge');
    ab.hidden = !content.ankleMode;
    ab.textContent = content.ankleMode === 'worse' ? 'Ankle recovery week' : 'Ankle week - eased off';
    document.getElementById('sessionTitle').textContent = content.title;
    document.getElementById('sessionSubtitle').textContent = content.subtitle || '';

    const links = document.getElementById('sessionLinks');
    const linkDefs = {
      run: [['runWarmup', 'Before: run warm-up · 6 min'], ['cooldown', 'After: cool-down · 10 min']],
      race: [['raceWarmup', 'Race-day warm-up · 10 min']],
    }[content.sessionType] || [];
    links.innerHTML = linkDefs.map(([k, label]) => `<button class="routine-link pill" data-routine="${k}">${label} ›</button>`).join('')
      + ((content.sessionType === 'run' || content.sessionType === 'race') ? `<button class="routine-link pill" data-open-paces="1">Your paces ›</button>` : '')
      + (content.sessionType === 'race' ? `<button class="routine-link pill" data-open-fuel="1">Race-day fuel timeline ›</button>` : '');
    links.hidden = !links.innerHTML;

    const fuelSlot = document.getElementById('fuelToday');
    fuelSlot.innerHTML = FuelUI.todayCardHTML(viewDate);

    const rail = document.getElementById('stationRail');
    if (content.sessionType === 'rest'){
      rail.innerHTML = restBlockHTML(content, viewDate);
    } else if (content.sessionType === 'race'){
      rail.innerHTML = raceBlockHTML(content, viewDate);
    } else {
      rail.innerHTML = content.blocks.map((b,i) => stationHTML(content, viewDate, i)).join('');
    }

    rail.querySelectorAll('[data-toggle]').forEach(elm => {
      elm.addEventListener('click', () => {
        const idx = Number(elm.getAttribute('data-toggle'));
        toggleChecked(viewDate, idx);
        renderAll();
      });
    });
    rail.querySelectorAll('.log-row').forEach(row => {
      const name = row.getAttribute('data-logname');
      const inputs = row.querySelectorAll('.log-input');
      const save = () => {
        const values = {};
        inputs.forEach(i2 => { values[i2.getAttribute('data-logfield')] = i2.value.trim(); });
        row.querySelectorAll('.tbox').forEach(box => {
          const secs = TimeBox.read(box);
          values[box.getAttribute('data-tbox')] = secs ? TimeBox.format(secs) : '';
        });
        if (Object.values(values).some(v => v)){
          saveExerciseEntry(name, viewDate, values);
          const ok = row.querySelector('.log-saved');
          if (ok){ ok.textContent = 'Saved ✓'; clearTimeout(ok._t); ok._t = setTimeout(() => { ok.textContent = ''; }, 1600); }
        }
      };
      inputs.forEach(inp => inp.addEventListener('change', save));
      TimeBox.wire(row, save);
    });
    const raceBox = rail.querySelector('[data-tbox="raceTime"]');
    if (raceBox){
      TimeBox.wire(raceBox.parentNode, (n, secs) => {
        saveRaceTime(viewDate, secs ? TimeBox.format(secs) : '');
        if (secs) PacesUI.addResult({ date: viewDate, dist: 'marathon', secs, hr: null, note: 'London Marathon' }, false);
      });
    }
    rail.querySelectorAll('[data-save-result]').forEach(btn => btn.addEventListener('click', () => {
      const b = content.blocks[Number(btn.getAttribute('data-save-result'))];
      const e = getEntryOn(b.name, viewDate) || {};
      const secs = TimeBox.parse(e.time);
      const km = parseFloat(e.distance) || 10;
      if (!secs){ btn.textContent = 'Log your time above first'; return; }
      const secs10 = Math.abs(km - 10) < 0.15 ? secs : Math.round(secs * Math.pow(10 / km, 1.06));   // Riegel, if not exactly 10 km
      const hr = parseInt(e.hr, 10);
      PacesUI.addResult({ date: viewDate, dist: '10k', secs: secs10, hr: hr > 60 ? hr : null, note: '10k time trial' }, true);
      btn.textContent = `Saved ${TimeBox.format(secs10)} - paces updated ✓`;
      btn.classList.add('is-done');
    }));
    [rail, links].forEach(scope => scope.querySelectorAll('[data-routine]').forEach(btn => {
      btn.addEventListener('click', () => openRoutine(btn.getAttribute('data-routine'), btn));
    }));
    const fuelBtns = [...fuelSlot.querySelectorAll('[data-fuel-section]'), ...links.querySelectorAll('[data-open-fuel]')];
    fuelBtns.forEach(btn => btn.addEventListener('click', () => {
      const hit = FuelUI.raceWindowFor(viewDate);
      const sec = btn.getAttribute('data-fuel-section') || 'race';
      showTab('fuel', (hit && sec === 'race') ? { raceId: hit.race.id, offset: hit.offset, section: 'race' } : { section: sec });
    }));
    links.querySelectorAll('[data-open-paces]').forEach(btn => btn.addEventListener('click', () => showTab('paces')));

    renderOwnUI(content);
    renderSwapUI();
    renderHolidayUI();
  }

  function renderFooter(){
    const real = todayISO();
    let cursor = real > PROGRAM_END ? PROGRAM_END : (real < PROGRAM_START ? null : real);
    let streak = 0;
    if (cursor){
      if (!isDayComplete(cursor) && !isHoliday(cursor)) cursor = addDays(cursor, -1);
      while (cursor >= PROGRAM_START && (isDayComplete(cursor) || isHoliday(cursor))){
        if (!isHoliday(cursor)) streak++;
        cursor = addDays(cursor, -1);
      }
    }
    document.getElementById('streakNum').textContent = streak;

    const totalDone = FLAT_DATES.filter(d => d <= (real > PROGRAM_END ? PROGRAM_END : real) && isDayComplete(d)).length;
    document.getElementById('doneCount').textContent = totalDone;

    const throughDate = real < PROGRAM_START ? null : (real > PROGRAM_END ? PROGRAM_END : real);
    if (throughDate){
      const elapsed = FLAT_DATES.filter(d => d <= throughDate && !isHoliday(d));
      const done = elapsed.filter(d => isDayComplete(d)).length;
      const pct = elapsed.length ? Math.round((done/elapsed.length)*100) : 0;
      document.getElementById('pctNum').textContent = pct + '%';
    } else {
      document.getElementById('pctNum').textContent = '—';
    }
  }

  function renderAll(){
    renderBanner();
    renderPhaseCard();
    renderWeekRail();
    renderAnkleCheck();
    renderDay();
    renderFooter();
  }

  /* ---------------- events ---------------- */
  document.getElementById('prevDayBtn').addEventListener('click', () => {
    viewDate = clampISO(addDays(viewDate, -1));
    swapPanelOpen = false; ownEditing = false; ankleEditing = false;
    renderAll();
  });
  document.getElementById('nextDayBtn').addEventListener('click', () => {
    viewDate = clampISO(addDays(viewDate, 1));
    swapPanelOpen = false; ownEditing = false; ankleEditing = false;
    renderAll();
  });
  document.getElementById('todayBtn').addEventListener('click', () => {
    viewDate = clampISO(todayISO());
    swapPanelOpen = false; ownEditing = false; ankleEditing = false;
    renderAll();
  });
  document.getElementById('swapToggleBtn').addEventListener('click', (e) => openRearrange(e.currentTarget));
  document.getElementById('switchProfileBtn').addEventListener('click', () => {
    closeSheet();
    showProfileScreen();
  });
  document.getElementById('holidayToggleBtn').addEventListener('click', () => {
    setHoliday(viewDate, !isHoliday(viewDate), getHolidayReason(viewDate));
    renderAll();
  });
  document.getElementById('holidayReasonInput').addEventListener('change', (e) => {
    if (isHoliday(viewDate)) setHoliday(viewDate, true, e.target.value.trim());
  });
  document.querySelectorAll('.tabbar .tab').forEach(b => b.addEventListener('click', () => {
    const t = b.getAttribute('data-tab');
    showTab(t, t === 'mobility' ? { fromDay: true } : {});
  }));
  document.querySelectorAll('[data-sheet-close]').forEach(el => el.addEventListener('click', closeSheet));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  document.getElementById('addProfileBtn').addEventListener('click', addProfileFromInput);

  /* ---------------- backup & restore (every profile on this device) ---------------- */
  const BACKUP_APP = 'marathon-daily';
  function dataStatus(msg, isError){
    const el = document.getElementById('dataStatus');
    el.textContent = msg;
    el.classList.toggle('is-error', !!isError);
  }
  function collectBackup(){
    const data = {};
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.startsWith('mara')) data[k] = localStorage.getItem(k);
    }
    return { app: BACKUP_APP, version: 1, exportedAt: new Date().toISOString(), data };
  }
  function downloadBackup(){
    try {
      const blob = new Blob([JSON.stringify(collectBackup(), null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `marathon-daily-backup-${todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      dataStatus('Backup saved - look in your downloads for marathon-daily-backup-' + todayISO() + '.json.');
    } catch(e){
      dataStatus('Could not create the backup file on this browser.', true);
    }
  }
  function parseBackup(text){
    let obj;
    try { obj = JSON.parse(text); } catch(e){ return { error: "That file isn't a Marathon Daily backup (it isn't valid JSON)." }; }
    if (!obj || obj.app !== BACKUP_APP || !obj.data || typeof obj.data !== 'object') return { error: "That file isn't a Marathon Daily backup." };
    const keys = Object.keys(obj.data);
    if (!keys.length || keys.some(k => !k.startsWith('mara') || typeof obj.data[k] !== 'string')) return { error: 'That backup file looks damaged - nothing was changed.' };
    let profiles = [];
    try { profiles = JSON.parse(obj.data[PROFILES_KEY] || '[]'); } catch(e){ return { error: 'That backup file looks damaged - nothing was changed.' }; }
    if (!Array.isArray(profiles)) return { error: 'That backup file looks damaged - nothing was changed.' };
    return { obj, profiles };
  }
  function restoreFromText(text){
    const parsed = parseBackup(text);
    if (parsed.error){ dataStatus(parsed.error, true); return false; }
    const names = parsed.profiles.map(p => p.name).join(', ') || 'no profiles';
    const when = parsed.obj.exportedAt ? new Date(parsed.obj.exportedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'an unknown date';
    if (!window.confirm(`Replace everything on this device with the backup from ${when}? Profiles in it: ${names}.`)) {
      dataStatus('Restore cancelled - nothing was changed.');
      return false;
    }
    const existing = [];
    for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && k.startsWith('mara')) existing.push(k); }
    try {
      existing.forEach(k => localStorage.removeItem(k));
      Object.entries(parsed.obj.data).forEach(([k, v]) => localStorage.setItem(k, v));
    } catch(e){
      dataStatus('This browser would not save the restored data (storage full or blocked).', true);
      return false;
    }
    dataStatus(`Restored ${parsed.profiles.length} profile${parsed.profiles.length === 1 ? '' : 's'}: ${names}.`);
    boot();
    return true;
  }
  document.getElementById('backupBtn').addEventListener('click', downloadBackup);
  document.getElementById('restoreBtn').addEventListener('click', () => document.getElementById('restoreInput').click());
  document.getElementById('restoreInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { restoreFromText(String(reader.result)); e.target.value = ''; };
    reader.onerror = () => dataStatus('Could not read that file.', true);
    reader.readAsText(file);
  });

  /* ---------------- install to home screen + offline ---------------- */
  const INSTALL_DISMISSED_KEY = 'maraInstallDismissed_v1';
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    let dismissed = false;
    try { dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY) === '1'; } catch(err){}
    if (!dismissed) document.getElementById('installBanner').hidden = false;
  });
  window.addEventListener('appinstalled', () => { document.getElementById('installBanner').hidden = true; });
  document.getElementById('installBtn').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch(err){}
    installPrompt = null;
    document.getElementById('installBanner').hidden = true;
  });
  document.getElementById('installDismiss').addEventListener('click', () => {
    try { localStorage.setItem(INSTALL_DISMISSED_KEY, '1'); } catch(err){}
    document.getElementById('installBanner').hidden = true;
  });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
  document.getElementById('newProfileName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addProfileFromInput();
  });

  boot();
})();
