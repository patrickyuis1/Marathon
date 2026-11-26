/**
 * RUNNING PICTOGRAMS
 * Extra stick-figure icons for the marathon plan: bike, step-up, ankle band
 * work, single-leg balance, tibialis raise, push-up, side plank, bird dog.
 * Same viewBox, stroke and currentColor tint as pictograms.js.
 * Requires pictograms.js (svgWrap, BASE_CSS, PICTOGRAMS) to load first.
 */
(function(){
  const L = (x1,y1,x2,y2,c='') => `<line${c?` class="${c}"`:''} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const P = (pts,c='') => `<polyline${c?` class="${c}"`:''} points="${pts}"/>`;
  const H = (cx,cy) => `<circle class="p-head" cx="${cx}" cy="${cy}" r="8"/>`;
  const FLOOR = `<line class="p-floor" x1="2" y1="106" x2="98" y2="106"/>`;
  const EXTRA = `
    .pictogram .p-floor, .pictogram .p-prop{ stroke-width:3; opacity:.35; }
    .pictogram .p-far{ opacity:.4; }
    .pictogram .p-thin{ stroke-width:3; }
    .pictogram .p-band{ stroke-width:2.5; stroke-dasharray:3 3; opacity:.8; }
  `;
  function simple(name, inner, css){ return svgWrap(name, inner, BASE_CSS + EXTRA + css); }
  function framed(name, frames, dur, css=''){
    const n = frames.length, fade = 5;
    let kfs = '', inner = '';
    frames.forEach((f, i) => {
      const a = i / n * 100, b = (i + 1) / n * 100;
      const k = `${name}-f${i}`;
      const pct = v => `${Math.max(0, Math.min(100, v)).toFixed(1)}%`;
      const body = i === 0
        ? `0%{opacity:1} ${pct(b - fade)}{opacity:1} ${pct(b)}{opacity:0} ${pct(100 - fade)}{opacity:0} 100%{opacity:1}`
        : `0%{opacity:0} ${pct(a - fade)}{opacity:0} ${pct(a)}{opacity:1} ${pct(b - fade)}{opacity:1} ${pct(b)}{opacity:0} 100%{opacity:0}`;
      kfs += `@keyframes ${k}{${body}}
        .pictogram--${name} .f${i}{ animation:${k} ${dur}s linear infinite; ${i === 0 ? '' : 'opacity:0;'} }`;
      inner += `<g class="f${i}">${f}</g>`;
    });
    return svgWrap(name, inner, BASE_CSS + EXTRA + kfs + css);
  }

  // Static exercise-bike frame shared by every bike frame.
  const BIKE = `${L(30,104,78,104,'p-prop')} ${L(34,58,48,58,'p-thin')} ${L(42,60,54,90,'p-thin')} ${L(54,90,70,50,'p-thin')} ${L(66,46,76,46,'p-thin')} ${L(54,90,54,104,'p-thin')} <circle class="p-thin" cx="54" cy="90" r="3"/>`;
  const RIDER = `${H(62,22)} ${L(42,56,58,30)} ${P('58,32 68,44 72,46')}`;
  // Pedal positions around the crank (54,90), with matching knees.
  const leg = (kx, ky, px, py, c='') => `<g class="${c}">${P(`42,56 ${kx},${ky} ${px},${py}`)}</g>`;
  const pedals = [[62,62,54,78],[64,72,66,90],[58,80,54,102],[54,72,42,90]];

  Object.assign(PICTOGRAMS, {

    /* Exercise bike - legs pedal through four crank positions */
    bike: framed('bike', pedals.map((p, i) => {
      const o = pedals[(i + 2) % 4];
      return `${BIKE} ${leg(o[0], o[1], o[2], o[3], 'p-far')} ${RIDER} ${leg(p[0], p[1], p[2], p[3])}`;
    }), 1.2),

    /* Step-up - one foot on the box, drive up to stand on it */
    stepup: framed('stepup', [
      `${FLOOR} <rect class="p-prop" x="52" y="86" width="40" height="20" rx="2"/>
       ${H(36,30)} ${L(36,38,36,66)} ${P('36,44 32,58 32,70')} ${P('36,66 34,86 32,104')} ${P('36,66 56,72 60,86')}`,
      `${FLOOR} <rect class="p-prop" x="52" y="86" width="40" height="20" rx="2"/>
       ${H(66,12)} ${L(66,20,66,46)} ${P('66,26 62,40 62,52')} ${P('66,46 64,66 62,86')} ${P('66,46 70,66 72,86')}`,
    ], 2.4),

    /* Band ankle work - seated, leg long, foot points and pulls against a band */
    bandankle: framed('bandankle', [
      `${FLOOR} ${H(28,52)} ${L(28,60,24,100)} ${P('26,68 46,82 62,86')} ${L(24,100,76,100)} ${L(76,100,88,92)} ${L(62,86,88,92,'p-band')}`,
      `${FLOOR} ${H(28,52)} ${L(28,60,24,100)} ${P('26,68 46,82 62,86')} ${L(24,100,76,100)} ${L(76,100,82,84)} ${L(62,86,82,84,'p-band')}`,
    ], 1.8),

    /* Single-leg balance - knee lifted, arms out, gentle sway */
    balance: simple('balance', `
      ${FLOOR}
      <g class="p-rig">${H(50,14)} ${L(50,22,50,58)} ${L(50,30,28,40)} ${L(50,30,72,40)} ${L(50,58,50,104)} ${P('50,58 64,70 58,88')}</g>`, `
      .pictogram--balance .p-rig{ animation: bal 3s ease-in-out infinite; transform-origin:50px 104px; }
      @keyframes bal{ 0%,100%{ transform:rotate(-3deg); } 50%{ transform:rotate(3deg); } }
    `),

    /* Tibialis raise - back against a wall, toes lift */
    tibraise: framed('tibraise', [
      `${L(16,8,16,106,'p-prop')} ${FLOOR} ${H(28,18)} ${L(24,26,30,62)} ${P('26,34 30,48 34,58')} ${L(30,62,52,104)} ${L(52,104,66,104)}`,
      `${L(16,8,16,106,'p-prop')} ${FLOOR} ${H(28,18)} ${L(24,26,30,62)} ${P('26,34 30,48 34,58')} ${L(30,62,52,104)} ${L(52,104,64,94)}`,
    ], 1.6),

    /* Push-up - plank, lower, press */
    pushup: framed('pushup', [
      `${FLOOR} ${H(18,58)} ${L(26,66,90,102)} ${L(28,68,28,104)}`,
      `${FLOOR} ${H(18,84)} ${L(26,90,90,102)} ${P('28,92 40,96 30,104')}`,
    ], 1.8),

    /* Side plank - on the forearm, body straight, small hip lift */
    sideplank: simple('sideplank', `
      ${FLOOR}
      <g class="p-rig">${H(20,60)} ${L(26,68,90,102)} ${P('28,70 26,102 40,102')} ${L(28,70,30,42)}</g>`, `
      .pictogram--sideplank .p-rig{ animation: spk 2.8s ease-in-out infinite; transform-origin:90px 102px; }
      @keyframes spk{ 0%,100%{ transform:rotate(0deg); } 50%{ transform:rotate(-4deg); } }
    `),

    /* Bird dog - on all fours, opposite arm and leg reach long */
    birddog: framed('birddog', [
      `${FLOOR} ${H(20,66)} ${L(30,72,66,72)} ${L(32,72,32,104)} ${P('66,72 66,104 86,104')}`,
      `${FLOOR} ${H(20,66)} ${L(30,72,66,72)} ${L(32,72,32,104)} ${P('66,72 66,104 86,104','p-far')} ${L(30,72,4,64)} ${L(66,72,98,68)}`,
    ], 3.2),
  });
})();
