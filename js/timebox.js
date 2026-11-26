/* =====================================================================
   TIMEBOX — time entry as separate hour / minute / second boxes, so nobody
   has to type ":" on a phone keypad. Typing fills a box and jumps to the
   next; backspace on an empty box jumps back.
     TimeBox.html(name, secs, {parts:'hms'|'ms'|'hm', clock:false})
     TimeBox.wire(root, (name, secs) => ...)   fires when a box changes
     TimeBox.parse("1:02:30") -> 3750   TimeBox.format(3750) -> "1:02:30"
   ===================================================================== */
const TimeBox = (function(){
  "use strict";
  const LABEL = { h: 'hrs', m: 'min', s: 'sec' };
  const CLOCK_LABEL = { h: 'hour', m: 'min' };

  function parse(str){
    if (str === null || str === undefined || str === '') return null;
    if (typeof str === 'number') return isFinite(str) ? str : null;
    const p = String(str).trim().split(':').map(x => x === '' ? 0 : Number(x));
    if (!p.length || p.some(n => !isFinite(n) || n < 0)) return null;
    let s = 0;
    for (const n of p) s = s * 60 + n;
    return s > 0 ? s : null;
  }
  function format(secs){
    if (!secs && secs !== 0) return '';
    secs = Math.round(secs);
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  }
  function split(secs, parts){
    if (!secs && secs !== 0) return {};
    secs = Math.round(secs);
    if (parts === 'hm') return { h: Math.floor(secs / 3600), m: Math.floor((secs % 3600) / 60) };
    if (parts === 'ms') return { m: Math.floor(secs / 60), s: secs % 60 };
    return { h: Math.floor(secs / 3600), m: Math.floor((secs % 3600) / 60), s: secs % 60 };
  }

  function html(name, secs, opts){
    opts = opts || {};
    const parts = (opts.parts || 'hms').split('');
    const v = split(secs, opts.parts || 'hms');
    const labels = opts.clock ? CLOCK_LABEL : LABEL;
    const boxes = parts.map((p, i) => {
      const max = (p === 'h' && !opts.clock) ? 1 : 2;
      let val = v[p];
      let shown = '';
      if (val !== undefined && val !== null && secs !== null && secs !== undefined){
        shown = (p === 'h' && !opts.clock) ? (val ? String(val) : '') : String(val).padStart(2, '0');
        if (p === 'h' && !opts.clock && !val) shown = '0';
      }
      return `${i ? '<span class="tb-sep" aria-hidden="true">:</span>' : ''}<span class="tb-cell">
        <input class="tb-in tb-${p}" data-part="${p}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="${max}"
               placeholder="${p === 'h' && !opts.clock ? '0' : '00'}" value="${shown}" aria-label="${opts.label ? opts.label + ' ' : ''}${labels[p]}" autocomplete="off">
        <span class="tb-lab">${labels[p]}</span></span>`;
    }).join('');
    return `<span class="tbox ${opts.clock ? 'is-clock' : ''}" data-tbox="${name}" data-parts="${opts.parts || 'hms'}">${boxes}</span>`;
  }

  function read(box){
    const get = p => { const el = box.querySelector(`[data-part="${p}"]`); return el ? el.value.trim() : ''; };
    const parts = box.getAttribute('data-parts').split('');
    if (parts.every(p => get(p) === '')) return null;
    const n = p => parseInt(get(p) || '0', 10);
    let secs = 0;
    if (parts.includes('h')) secs += n('h') * 3600;
    if (parts.includes('m')) secs += n('m') * 60;
    if (parts.includes('s')) secs += n('s');
    return secs;
  }
  function valid(box){
    const m = box.querySelector('[data-part="m"]'), s = box.querySelector('[data-part="s"]'), h = box.querySelector('[data-part="h"]');
    const clock = box.classList.contains('is-clock');
    const bad = (m && +m.value > 59) || (s && +s.value > 59) || (clock && h && +h.value > 23);
    box.classList.toggle('is-bad', !!bad);
    return !bad;
  }

  function wire(root, onChange){
    root.querySelectorAll('.tbox').forEach(box => {
      const ins = [...box.querySelectorAll('.tb-in')];
      ins.forEach((inp, i) => {
        inp.addEventListener('focus', () => { try { inp.select(); } catch(e){} });
        inp.addEventListener('input', () => {
          const clean = inp.value.replace(/\D/g, '').slice(0, +inp.getAttribute('maxlength'));
          if (clean !== inp.value) inp.value = clean;
          if (clean.length >= +inp.getAttribute('maxlength') && ins[i + 1]) ins[i + 1].focus();
          valid(box);
        });
        inp.addEventListener('keydown', e => {
          if (e.key === 'Backspace' && inp.value === '' && ins[i - 1]){ e.preventDefault(); ins[i - 1].focus(); }
          if ((e.key === ':' || e.key === '.') && ins[i + 1]){ e.preventDefault(); ins[i + 1].focus(); }
        });
        inp.addEventListener('change', () => {
          // tidy display: pad minutes / seconds once the box is left
          if (inp.value !== '' && inp.getAttribute('maxlength') === '2') inp.value = inp.value.padStart(2, '0');
          box._dirty = true;
        });
      });
      // Report once focus leaves the whole h/m/s group, so moving from the
      // hours box to the minutes box doesn't save (or re-render) half a time.
      const fire = () => {
        if (!box._dirty) return;
        box._dirty = false;
        if (!valid(box)) return;
        if (onChange) onChange(box.getAttribute('data-tbox'), read(box), box);
      };
      box.addEventListener('focusout', e => {
        if (e.relatedTarget && box.contains(e.relatedTarget)) return;
        setTimeout(() => { if (!box.contains(document.activeElement)) fire(); }, 0);
      });
    });
  }

  return { html, wire, read, parse, format, valid };
})();
