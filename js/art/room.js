/* THE MOTH KEEPER — room art & atmosphere (owned by the Room-art agent).
 *
 * Registers G.registerWallBase for north/east/south/west:
 *   build(g)    wallpaper, dado, skirting, floorboards, attic ceiling, corner slivers, decor, the south DESK
 *               and Edith's portrait.
 *   buildTop(g) lighting overlays (multiply / soft-light / screen), moon patches with rain shadows, dust motes.
 *   update()    reads flags lampLit / windowOpen and cross-fades lighting (1.2s when the wall is visible).
 * Also installs one global grade (paper mottle + grain + vignette) in <g id="fx">  (id "roomGrade").
 * Exposes ART.room = { rebuildGrade() } for debugging.
 */
(function () {
  'use strict';
  const INK = '#1c140f';
  const VPX = 800, VPY = 380, L = 70, R = 1530, TOP = 90, FLOOR = 790, DADO = 600, SKIRT = 758;
  const K = `stroke="${INK}" stroke-linejoin="round" stroke-linecap="round"`;
  const r1 = n => Math.round(n * 10) / 10;
  const sideY = y0 => r1(VPY + (y0 - VPY) * VPX / (VPX - L));
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const stopStr = stops => stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}" stop-opacity="${s[2] == null ? 1 : s[2]}"/>`).join('');
  const rad = (id, cx, cy, r, stops, extra) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}" ${extra || ''}>${stopStr(stops)}</radialGradient>`;
  const lin = (id, x1, y1, x2, y2, stops) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopStr(stops)}</linearGradient>`;

  // ------------------------------------------------------------------ CSS (animations)
  function injectCSS() {
    if (document.getElementById('room-art-css')) return;
    const st = document.createElement('style');
    st.id = 'room-art-css';
    st.textContent = `
.rl-mote{opacity:0;animation:rlMote var(--d,12s) ease-in-out var(--dl,0s) infinite}
@keyframes rlMote{0%{transform:translate(0,0);opacity:0}18%{opacity:var(--o,.6)}50%{transform:translate(calc(var(--dx) * .5 + var(--wx,0px)),calc(var(--dy) * .5))}82%{opacity:var(--o,.6)}100%{transform:translate(var(--dx),var(--dy));opacity:0}}
.rl-flick.on{animation:rlFlick 3.7s linear infinite}
.rl-flick2.on{animation:rlFlick 2.3s linear -1.1s infinite}
@keyframes rlFlick{0%{opacity:1}9%{opacity:.9}14%{opacity:.97}27%{opacity:.88}35%{opacity:1}52%{opacity:.93}58%{opacity:.84}66%{opacity:.96}80%{opacity:.9}90%{opacity:.99}100%{opacity:1}}
.rl-rain{animation:rlRain var(--rd,1.3s) linear infinite}
@keyframes rlRain{from{transform:translate(0,0)}to{transform:translate(var(--rx,0px),var(--ry,200px))}}
.rl-drip{animation:rlDrip var(--rd,9s) cubic-bezier(.6,0,.9,.6) var(--dl,0s) infinite}
@keyframes rlDrip{0%{transform:translate(0,0);opacity:0}8%{opacity:1}100%{transform:translate(var(--rx,0px),var(--ry,160px));opacity:.2}}
.rl-sway{transform-box:view-box;animation:rlSway 6.5s ease-in-out infinite alternate}
@keyframes rlSway{from{transform:rotate(-1.1deg)}to{transform:rotate(1.1deg)}}
.rl-breathe{animation:rlBreathe 7s ease-in-out infinite alternate}
@keyframes rlBreathe{from{opacity:.75}to{opacity:1}}
.rl-paused .rl-mote,.rl-paused .rl-flick,.rl-paused .rl-flick2,.rl-paused .rl-rain,.rl-paused .rl-drip,.rl-paused .rl-sway,.rl-paused .rl-breathe{animation-play-state:paused}
.rl-fade{transition:opacity 1.2s ease}
`;
    document.head.appendChild(st);
  }

  // ------------------------------------------------------------------ global grade in #fx
  function ensureGrade() {
    const fx = document.getElementById('fx');
    const defs = document.getElementById('defs');
    if (!fx || !defs || document.getElementById('roomGrade')) return;
    // fine grain tile
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const cx = c.getContext('2d');
    const img = cx.createImageData(256, 256);
    const rnd = rng(77);
    for (let i = 0; i < 256 * 256; i++) {
      const v = (128 + (rnd() - 0.5) * 120 + (rnd() - 0.5) * 60) | 0;
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    const grain = c.toDataURL();
    // low-frequency painterly mottle (one stretched image)
    const m = document.createElement('canvas'); m.width = 400; m.height = 225;
    const mx = m.getContext('2d');
    mx.fillStyle = '#808080'; mx.fillRect(0, 0, 400, 225);
    const rm = rng(12);
    for (let i = 0; i < 140; i++) {
      const x = rm() * 400, y = rm() * 225, r = 8 + rm() * 50, light = rm() < 0.5;
      const gr = mx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.05 + rm() * 0.09;
      gr.addColorStop(0, light ? `rgba(255,240,215,${a})` : `rgba(10,8,5,${a})`);
      gr.addColorStop(1, light ? 'rgba(255,240,215,0)' : 'rgba(10,8,5,0)');
      mx.fillStyle = gr; mx.beginPath(); mx.arc(x, y, r, 0, Math.PI * 2); mx.fill();
    }
    // a few fibrous streaks
    mx.globalAlpha = 0.05; mx.strokeStyle = '#fff';
    for (let i = 0; i < 60; i++) { const x = rm() * 400, y = rm() * 225; mx.beginPath(); mx.moveTo(x, y); mx.lineTo(x + (rm() - 0.5) * 40, y + (rm() - 0.5) * 8); mx.stroke(); }
    const mottle = m.toDataURL();
    defs.insertAdjacentHTML('beforeend', `
      <pattern id="pGrain" patternUnits="userSpaceOnUse" width="256" height="256"><image href="${grain}" width="256" height="256"/></pattern>
      <radialGradient id="gVignette" gradientUnits="userSpaceOnUse" cx="800" cy="430" r="980" gradientTransform="translate(800 430) scale(1 0.72) translate(-800 -430)">
        <stop offset="0.42" stop-color="#050404" stop-opacity="0"/>
        <stop offset="0.68" stop-color="#050404" stop-opacity="0.28"/>
        <stop offset="0.86" stop-color="#050404" stop-opacity="0.62"/>
        <stop offset="1" stop-color="#050404" stop-opacity="0.85"/>
      </radialGradient>`);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'roomGrade');
    g.setAttribute('pointer-events', 'none');
    g.innerHTML = `
      <image href="${mottle}" x="0" y="0" width="1600" height="900" preserveAspectRatio="none" opacity="0.6" style="mix-blend-mode:soft-light"/>
      <rect width="1600" height="900" fill="url(#pGrain)" opacity="0.1" style="mix-blend-mode:overlay"/>
      <rect width="1600" height="900" fill="url(#gVignette)"/>`;
    fx.insertBefore(g, fx.firstChild);
    // keep the grade on top of anything later added to #fx
    new MutationObserver(() => { if (fx.lastChild !== g) fx.appendChild(g); }).observe(fx, { childList: true });
  }

  // ================================================================== shared room shell
  function ceilingLong() {
    let s = `<rect x="0" y="0" width="1600" height="${TOP + 2}" fill="url(#gCeil)"/>`;
    const k = VPY / (VPY - TOP);
    // lath / plaster strips between rafters
    for (let y = 8; y < TOP; y += 13) s += `<line x1="0" y1="${y}" x2="1600" y2="${y}" stroke="#0c0a08" stroke-width="1.2" opacity="0.5"/>`;
    for (let x0 = L + 20; x0 <= R; x0 += 146) {
      const x1 = VPX + (x0 - VPX) * k, w0 = 12, w1 = r1(12 * k);
      const side = x0 < VPX ? 1 : -1;
      s += `<path d="M${x0 - w0},${TOP} L${x0 + w0},${TOP} L${r1(x1 + w1)},0 L${r1(x1 - w1)},0Z" fill="#2c1b11" ${K} stroke-width="2"/>`;
      s += `<path d="M${x0 + side * w0},${TOP} L${x0 + side * (w0 + 7)},${TOP} L${r1(x1 + side * (w1 + 12))},0 L${r1(x1 + side * w1)},0Z" fill="#46301f" opacity="0.9"/>`;
      s += `<path d="M${x0 - side * (w0 - 3)},${TOP} L${r1(x1 - side * (w1 - 4))},0" stroke="#6b4a32" stroke-width="1.4" opacity="0.5"/>`;
    }
    // purlin
    s += `<rect x="0" y="22" width="1600" height="20" fill="url(#gBeam)" ${K} stroke-width="2"/>`;
    s += `<line x1="0" y1="24.5" x2="1600" y2="24.5" stroke="#8a5e3c" stroke-width="1.5" opacity="0.5"/>`;
    s += `<rect x="0" y="42" width="1600" height="10" fill="url(#gRailShadow)" opacity="0.8"/>`;
    // wall plate
    s += `<rect x="0" y="${TOP - 12}" width="1600" height="20" fill="url(#gBeam)" ${K} stroke-width="2.4"/>`;
    s += `<line x1="0" y1="${TOP - 9}" x2="1600" y2="${TOP - 9}" stroke="#9a6a45" stroke-width="1.5" opacity="0.45"/>`;
    // pegs in the plate
    for (let x = 180; x < 1600; x += 290) s += `<circle cx="${x}" cy="${TOP - 2}" r="3" fill="#24160d"/>`;
    return s;
  }
  function ceilingGable() {
    const yl = sideY(TOP);
    let s = `<path d="M0,0 H340 L${L},${TOP} L0,${yl}Z" fill="url(#gCeil)"/>`;
    s += `<path d="M1600,0 H1260 L${R},${TOP} L1600,${yl}Z" fill="url(#gCeil)"/>`;
    // rafters seen on the sloping ceiling (short diagonal strips)
    for (let i = 0; i < 4; i++) {
      const t = 0.18 + i * 0.22;
      const ax = r1(L + (340 - L) * t), ay = r1(TOP * (1 - t));
      s += `<path d="M${ax},${ay} L${r1(ax - 90 - i * 10)},${r1(ay - 30 - i * 8)}" stroke="#2c1b11" stroke-width="${10 + i * 2}" stroke-linecap="butt" opacity="0.9"/>`;
      const bx = r1(1600 - ax);
      s += `<path d="M${bx},${ay} L${r1(bx + 90 + i * 10)},${r1(ay - 30 - i * 8)}" stroke="#2c1b11" stroke-width="${10 + i * 2}" stroke-linecap="butt" opacity="0.9"/>`;
    }
    // collar tie
    s += `<rect x="180" y="26" width="1240" height="24" fill="url(#gBeam)" ${K} stroke-width="2.2"/>`;
    s += `<line x1="180" y1="29" x2="1420" y2="29" stroke="#9a6a45" stroke-width="1.5" opacity="0.45"/>`;
    s += `<rect x="180" y="50" width="1240" height="12" fill="url(#gRailShadow)" opacity="0.7"/>`;
    // pegs / iron straps
    s += `<rect x="286" y="24" width="12" height="28" fill="#1e1a17" opacity="0.8"/><rect x="1302" y="24" width="12" height="28" fill="#1e1a17" opacity="0.8"/>`;
    // principal rafters along the slopes (the slanted ceiling beams)
    const beam = (x0, y0, x1, y1, th) => {
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
      let nx = -dy / len * th, ny = dx / len * th; if (ny < 0) { nx = -nx; ny = -ny; }
      return `<path d="M${x0},${y0} L${x1},${y1} L${r1(x1 + nx)},${r1(y1 + ny)} L${r1(x0 + nx)},${r1(y0 + ny)}Z" fill="url(#gBeam)" ${K} stroke-width="2.4"/>` +
        `<path d="M${r1(x0 + nx * 0.2)},${r1(y0 + ny * 0.2)} L${r1(x1 + nx * 0.2)},${r1(y1 + ny * 0.2)}" stroke="#9a6a45" stroke-width="1.6" opacity="0.4"/>` +
        `<path d="M${r1(x0 + nx)},${r1(y0 + ny)} L${r1(x1 + nx)},${r1(y1 + ny)} L${r1(x1 + nx * 1.9)},${r1(y1 + ny * 1.9)} L${r1(x0 + nx * 1.9)},${r1(y0 + ny * 1.9)}Z" fill="#000" opacity="0.28"/>`;
    };
    // extend lines past the screen edges
    const slope = TOP / (340 - L);
    s += beam(-20, r1(TOP + (L + 20) * slope), 360, r1(TOP - (360 - L) * slope), 30);
    s += beam(1620, r1(TOP + (L + 20) * slope), 1240, r1(TOP - (360 - L) * slope), 30);
    return s;
  }

  function wallAging(seed, extra) {
    const rnd = rng(seed);
    let s = '';
    for (let i = 0; i < 9; i++) {
      const x = L + rnd() * (R - L), y = 120 + rnd() * 460, rx = 80 + rnd() * 200, ry = 60 + rnd() * 160;
      s += `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="url(#${rnd() < 0.55 ? 'gBlotchD' : 'gBlotchL'})"/>`;
    }
    // paper seams
    for (let x = L + 170 + ((seed * 37) % 90); x < R - 20; x += 262) {
      s += `<line x1="${x}" y1="${TOP}" x2="${x}" y2="${DADO - 12}" stroke="#63705a" stroke-width="1" opacity="0.35"/>`;
      s += `<line x1="${x + 1.5}" y1="${TOP}" x2="${x + 1.5}" y2="${DADO - 12}" stroke="#0d120e" stroke-width="1.2" opacity="0.35"/>`;
    }
    return s + (extra || '');
  }
  // a brown water stain under the ceiling
  function stain(x, y, w, h) {
    return `<g opacity="0.55">
      <path d="M${x},${y} C${x + w * 0.2},${y + h * 0.6} ${x + w * 0.35},${y + h * 0.3} ${x + w * 0.5},${y + h} C${x + w * 0.62},${y + h * 0.4} ${x + w * 0.8},${y + h * 0.7} ${x + w},${y} Z" fill="#4a3a22" opacity="0.35"/>
      <path d="M${x},${y} C${x + w * 0.2},${y + h * 0.6} ${x + w * 0.35},${y + h * 0.3} ${x + w * 0.5},${y + h} C${x + w * 0.62},${y + h * 0.4} ${x + w * 0.8},${y + h * 0.7} ${x + w},${y}" fill="none" stroke="#5a4222" stroke-width="2" opacity="0.6"/>
      <path d="M${x + w * 0.49},${y + h} q2,${h * 0.5} 0,${h * 0.9}" stroke="#4a3a22" stroke-width="2" opacity="0.5" fill="none"/>
    </g>`;
  }

  function dado() {
    let s = `<rect x="${L}" y="${DADO}" width="${R - L}" height="${SKIRT - DADO}" fill="#22160e"/>`;
    const n = 8, gap = 16, x0 = L + 16, pw = (R - L - 32 - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const x = r1(x0 + i * (pw + gap)), y = DADO + 26, h = SKIRT - DADO - 44, w = r1(pw);
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1a110a"/>`;
      s += `<rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" fill="url(#gPanel)" stroke="#120b07" stroke-width="1.5"/>`;
      s += `<path d="M${x + 5},${y + h - 5} V${y + 5} H${r1(x + w - 5)}" fill="none" stroke="#7a5236" stroke-width="1.5" opacity="0.45"/>`;
      s += `<path d="M${x},${y + h} H${r1(x + w)} V${y}" fill="none" stroke="#6b4a32" stroke-width="1.2" opacity="0.3"/>`;
      s += `<path d="M${x + 20},${y + 30} q${w * 0.3},6 ${w * 0.6},-2 M${x + 16},${y + 70} q${w * 0.35},-5 ${w * 0.7},3" fill="none" stroke="#130c07" stroke-width="1" opacity="0.5"/>`;
    }
    // chair rail
    s += `<rect x="${L}" y="${DADO + 6}" width="${R - L}" height="18" fill="url(#gRailShadow)"/>`;
    s += `<rect x="${L}" y="${DADO - 12}" width="${R - L}" height="18" fill="url(#gBeam)" ${K} stroke-width="2"/>`;
    s += `<line x1="${L}" y1="${DADO - 9}" x2="${R}" y2="${DADO - 9}" stroke="#a87650" stroke-width="1.6" opacity="0.55"/>`;
    s += `<line x1="${L}" y1="${DADO - 1}" x2="${R}" y2="${DADO - 1}" stroke="#1a100a" stroke-width="1.2" opacity="0.7"/>`;
    // skirting
    s += `<rect x="${L}" y="${SKIRT}" width="${R - L}" height="${FLOOR - SKIRT}" fill="#1c120b"/>`;
    s += `<rect x="${L}" y="${SKIRT - 5}" width="${R - L}" height="9" fill="#4a2e1d" ${K} stroke-width="1.6"/>`;
    s += `<line x1="${L}" y1="${SKIRT - 3}" x2="${R}" y2="${SKIRT - 3}" stroke="#8a5e3c" stroke-width="1.2" opacity="0.5"/>`;
    return s;
  }

  function sliver(side) {
    // side: -1 left, +1 right
    const cx = side < 0 ? L : R, ex = side < 0 ? 0 : 1600;
    const P = (y) => `${ex},${sideY(y)}`;
    let s = '';
    s += `<path d="M${P(TOP)} L${cx},${TOP} L${cx},${FLOOR} L${P(FLOOR)}Z" fill="url(#pWall)"/>`;
    s += `<path d="M${P(DADO - 12)} L${cx},${DADO - 12} L${cx},${SKIRT} L${P(SKIRT)}Z" fill="#22160e"/>`;
    s += `<path d="M${P(DADO - 12)} L${cx},${DADO - 12} L${cx},${DADO + 6} L${P(DADO + 6)}Z" fill="#553421"/>`;
    s += `<path d="M${P(SKIRT - 5)} L${cx},${SKIRT - 5} L${cx},${FLOOR} L${P(FLOOR)}Z" fill="#1c120b"/>`;
    s += `<path d="M${P(TOP - 40)} L${cx},${TOP - 40} L${cx},${FLOOR} L${P(FLOOR)}Z" fill="#050807" opacity="0.55"/>`;
    s += `<line x1="${cx}" y1="${TOP}" x2="${cx}" y2="${FLOOR}" stroke="${INK}" stroke-width="2.5" opacity="0.8"/>`;
    return s;
  }

  function floorLong(seed) {
    const rnd = rng(seed);
    const yl = sideY(FLOOR);
    let s = `<clipPath id="clipFloor${seed}"><path d="M0,${yl} L${L},${FLOOR} H${R} L1600,${yl} V900 H0Z"/></clipPath><g clip-path="url(#clipFloor${seed})">`;
    s += `<rect x="0" y="${FLOOR - 40}" width="1600" height="${940 - FLOOR}" fill="#2e1c12"/>`;
    const k = (900 - VPY) / (FLOOR - VPY);
    const tints = ['#3d2619', '#452b1b', '#362117', '#4a2f1e', '#3a2418', '#41291a'];
    for (let x0 = -380; x0 < 1980; x0 += 58) {
      const xa = x0, xb = x0 + 58;
      const ya = FLOOR - 40, ka = (ya - VPY) / (FLOOR - VPY);
      const p = (x, kk) => r1(VPX + (x - VPX) * kk);
      s += `<path d="M${p(xa, ka)},${ya} L${p(xb, ka)},${ya} L${p(xb, k)},900 L${p(xa, k)},900Z" fill="${tints[(rnd() * tints.length) | 0]}"/>`;
      // grain streak
      const xm = xa + 20 + rnd() * 20;
      s += `<path d="M${p(xm, 1)},${FLOOR} L${p(xm, k)},900" stroke="#23150d" stroke-width="1" opacity="0.5"/>`;
      s += `<path d="M${p(xa, ka)},${ya} L${p(xa, k)},900" stroke="#140c07" stroke-width="1.6" opacity="0.85"/>`;
      s += `<path d="M${p(xa + 3, ka)},${ya} L${p(xa + 3, k)},900" stroke="#6b4a32" stroke-width="0.8" opacity="0.25"/>`;
      // board end joint
      const yj = FLOOR + 14 + rnd() * 90, kj = (yj - VPY) / (FLOOR - VPY);
      s += `<line x1="${p(xa, kj)}" y1="${r1(yj)}" x2="${p(xb, kj)}" y2="${r1(yj)}" stroke="#140c07" stroke-width="1.6" opacity="0.8"/>`;
      if (rnd() < 0.35) s += `<circle cx="${p(xa + 10, kj)}" cy="${r1(yj + 5)}" r="1.6" fill="#0d0805"/><circle cx="${p(xb - 10, kj)}" cy="${r1(yj + 5)}" r="1.6" fill="#0d0805"/>`;
    }
    s += `<rect x="0" y="${FLOOR - 40}" width="1600" height="${940 - FLOOR}" fill="url(#gFloorDepth)"/>`;
    return s + '</g>';
  }
  function floorGable(seed) {
    const rnd = rng(seed);
    const yl = sideY(FLOOR);
    let s = `<clipPath id="clipFloor${seed}"><path d="M0,${yl} L${L},${FLOOR} H${R} L1600,${yl} V900 H0Z"/></clipPath><g clip-path="url(#clipFloor${seed})">`;
    s += `<rect x="0" y="${FLOOR - 40}" width="1600" height="${940 - FLOOR}" fill="#2e1c12"/>`;
    const tints = ['#3d2619', '#452b1b', '#362117', '#4a2f1e', '#3a2418', '#41291a'];
    let y = FLOOR - 30, h = 5;
    while (y < 900) {
      s += `<rect x="0" y="${r1(y)}" width="1600" height="${r1(h + 0.6)}" fill="${tints[(rnd() * tints.length) | 0]}"/>`;
      s += `<line x1="0" y1="${r1(y)}" x2="1600" y2="${r1(y)}" stroke="#140c07" stroke-width="${r1(0.8 + h / 20)}" opacity="0.85"/>`;
      s += `<line x1="0" y1="${r1(y + 1.5)}" x2="1600" y2="${r1(y + 1.5)}" stroke="#6b4a32" stroke-width="0.7" opacity="0.2"/>`;
      // butt joints along perspective rays
      for (let j = 0; j < 3; j++) {
        const xj = rnd() * 1600, kk = (y - VPY) / (FLOOR - VPY), kk2 = (y + h - VPY) / (FLOOR - VPY);
        const xw = (xj - VPX) / kk;
        s += `<line x1="${r1(xj)}" y1="${r1(y)}" x2="${r1(VPX + xw * kk2)}" y2="${r1(y + h)}" stroke="#140c07" stroke-width="1.4" opacity="0.8"/>`;
      }
      y += h; h = h * 1.28 + 1.5;
    }
    s += `<rect x="0" y="${FLOOR - 40}" width="1600" height="${940 - FLOOR}" fill="url(#gFloorDepth)"/>`;
    return s + '</g>';
  }
  const cshadow = (cx, cy, rx, ry, op) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#gShadow)" opacity="${op == null ? 1 : op}"/>`;

  function shell(w, seed, extraWall) {
    const gable = (w === 'east' || w === 'west');
    const wallPath = gable ? `M${L},${TOP} L340,0 H1260 L${R},${TOP} V${FLOOR} H${L}Z` : `M${L},${TOP} H${R} V${FLOOR} H${L}Z`;
    let s = `<rect width="1600" height="900" fill="#0e171b"/>`;
    s += `<path d="${wallPath}" fill="url(#pWall)"/>`;
    s += `<clipPath id="clipWall_${w}"><path d="${wallPath}"/></clipPath><g clip-path="url(#clipWall_${w})">${wallAging(seed, extraWall)}</g>`;
    s += `<path d="${wallPath}" fill="url(#gWallTone)"/>`;
    s += `<path d="${wallPath}" fill="url(#gWallSides)"/>`;
    s += dado();
    s += gable ? floorGable(seed) : floorLong(seed);
    s += `<line x1="${L}" y1="${FLOOR}" x2="${R}" y2="${FLOOR}" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<rect x="${L}" y="${FLOOR}" width="${R - L}" height="10" fill="url(#gRailShadow)" opacity="0.8"/>`;
    s += sliver(-1) + sliver(1);
    s += gable ? ceilingGable() : ceilingLong();
    return s;
  }

  // ================================================================== small reusable props
  function frameRect(x, y, w, h, t, wood) {
    wood = wood || '#3a2418';
    return `<rect x="${x + 6}" y="${y + 9}" width="${w}" height="${h}" fill="#000" opacity="0.35"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${wood}" ${K} stroke-width="2.2"/>
      <path d="M${x + 2},${y + h - 2} V${y + 2} H${x + w - 2}" fill="none" stroke="#9a6a45" stroke-width="1.4" opacity="0.5"/>
      <rect x="${x + t}" y="${y + t}" width="${w - 2 * t}" height="${h - 2 * t}" fill="#120b07"/>`;
  }
  function pin(x, y, col) {
    return `<circle cx="${x + 1.5}" cy="${y + 3}" r="4" fill="#000" opacity="0.35"/><circle cx="${x}" cy="${y}" r="4" fill="${col || '#a35a5a'}" ${K} stroke-width="1"/><circle cx="${x - 1.3}" cy="${y - 1.3}" r="1.3" fill="#fff" opacity="0.6"/>`;
  }
  // a little moth silhouette (centred 0,0, ~ 40 wide)
  function mothShape(fill, stroke, op) {
    return `<g fill="${fill}" stroke="${stroke || INK}" stroke-width="1" stroke-linejoin="round" opacity="${op == null ? 1 : op}">
      <path d="M0,-2 C-6,-12 -18,-16 -21,-8 C-22,-2 -14,2 0,2 Z"/><path d="M0,-2 C6,-12 18,-16 21,-8 C22,-2 14,2 0,2 Z"/>
      <path d="M0,1 C-5,4 -14,6 -13,12 C-11,16 -4,11 0,4 Z"/><path d="M0,1 C5,4 14,6 13,12 C11,16 4,11 0,4 Z"/>
      <ellipse cx="0" cy="2" rx="1.8" ry="7" fill="${stroke || INK}"/></g>`;
  }
  function papers(x, y, w, h, rot, body) {
    return `<g transform="translate(${x},${y}) rotate(${rot})">
      <rect x="${-w / 2 + 5}" y="${-h / 2 + 8}" width="${w}" height="${h}" fill="#000" opacity="0.3"/>
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#cdbf9d" stroke="#8a7a5a" stroke-width="0.8"/>
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="url(#gPaperAge)"/>
      ${body}
      ${pin(0, -h / 2 + 8)}</g>`;
  }

  // ================================================================== SOUTH
  function portrait() {
    // painting coordinates: 0,0 = centre of canvas (1365, 290)
    return `<g id="edithPortrait" transform="translate(-90,0)">
    <defs>
      ${rad('pBg', -30, -60, 170, [[0, '#56502f'], [0.45, '#2f2b19'], [1, '#110f08']])}
      ${rad('pSkin', -8, -32, 42, [[0, '#f3e7d4'], [0.55, '#e2cdb2'], [0.85, '#c8a98c'], [1, '#a88870']])}
      ${rad('pNeck', -4, 10, 30, [[0, '#dcc4a8'], [1, '#9c7e66']])}
      ${lin('pBgShade', -80, 0, 80, 0, [[0.45, '#000', 0], [1, '#000', 0.35]])}
      ${lin('pFaceShade', -24, 0, 24, 0, [[0, '#5a3a2a', 0.05], [0.5, '#5a3a2a', 0], [0.72, '#5a3a2a', 0.08], [1, '#5a3a2a', 0.38]])}
      ${lin('pJaw', 0, -8, 0, 8, [[0, '#5a3a2a', 0], [1, '#5a3a2a', 0.3]])}
      ${lin('pNeckShade', 0, 4, 0, 16, [[0, '#4a2e22', 0.45], [1, '#4a2e22', 0]])}
      ${rad('pCheek', 0, 0, 1, [[0, '#d98f86', 0.42], [1, '#d98f86', 0]], 'gradientUnits="objectBoundingBox" cx="0.5" cy="0.5" r="0.5"')}
      ${rad('pShadowSoft', 0, 0, 1, [[0, '#5a3426', 0.34], [1, '#5a3426', 0]], 'gradientUnits="objectBoundingBox" cx="0.5" cy="0.5" r="0.5"')}
      ${rad('pBrow', 0, 0, 1, [[0, '#fff8ea', 0.45], [1, '#fff8ea', 0]], 'gradientUnits="objectBoundingBox" cx="0.5" cy="0.5" r="0.5"')}
      ${lin('pCollar', -18, 0, 18, 0, [[0, '#8a7e64'], [0.35, '#e8dfc4'], [0.7, '#d3c7a8'], [1, '#7a6e54']])}
      ${lin('pDress', -70, 40, 70, 110, [[0, '#2d4144'], [0.4, '#172326'], [1, '#0b1012']])}
      ${lin('pHair', -30, -80, 30, 0, [[0, '#3b2a20'], [0.5, '#1b120e'], [1, '#0f0a08']])}
      ${rad('pSheen', -40, -80, 120, [[0, '#fff3d6', 0.16], [1, '#fff3d6', 0]])}
      <clipPath id="pClip"><ellipse cx="0" cy="0" rx="72" ry="104"/></clipPath>
    </defs>
    <!-- hanging cord -->
    <path d="M1365,108 L1296,154 M1365,108 L1434,154" stroke="#1a120c" stroke-width="1.6" fill="none"/>
    <circle cx="1365" cy="107" r="4" fill="url(#gBrass)" ${K} stroke-width="1"/>
    <g transform="translate(1365,290)">
      <rect x="-99" y="-130" width="214" height="284" rx="4" fill="#000" opacity="0.28"/>
      <rect x="-103" y="-134" width="220" height="292" rx="8" fill="#000" opacity="0.12"/>
      <rect x="-105" y="-140" width="210" height="280" fill="url(#gGilt)" ${K} stroke-width="2.5"/>
      <rect x="-97" y="-132" width="194" height="264" fill="none" stroke="#6e4d1c" stroke-width="3"/>
      <rect x="-93" y="-128" width="186" height="256" fill="#a07530" stroke="#e7c476" stroke-width="1" stroke-opacity="0.5"/>
      <g fill="#e7c476" opacity="0.55">${[-1, 1].map(sx => [-1, 1].map(sy => `<path transform="translate(${sx * 97},${sy * 132}) scale(${sx},${sy})" d="M0,0 C8,2 16,8 14,16 C10,10 5,8 0,10 C4,6 3,3 0,0 Z M0,0 C2,8 8,16 16,14 C10,10 8,5 10,0 C6,4 3,3 0,0Z"/>`).join('')).join('')}</g>
      <g clip-path="url(#pClip)">
        <rect x="-80" y="-115" width="160" height="230" fill="url(#pBg)"/>
        <path d="M-80,-60 C-50,-80 -30,-70 -10,-95" stroke="#6a623c" stroke-width="10" opacity="0.12" fill="none"/>
        <rect x="-80" y="-115" width="160" height="230" fill="url(#pBgShade)"/>
        <g transform="translate(0,16) scale(1.2)">
        <!-- hair mass behind (an up-do: ends above the jaw) -->
        <path d="M-37,-24 C-46,-58 -26,-79 0,-79 C26,-79 46,-58 37,-24 C35,-17 31,-14 26,-13 L-26,-13 C-31,-14 -35,-17 -37,-24 Z" fill="url(#pHair)"/>
        <ellipse cx="2" cy="-82" rx="13" ry="8" fill="#1a110d"/>
        <path d="M-9,-84 C-3,-89 9,-89 15,-82 M-6,-78 C0,-82 8,-82 12,-77" stroke="#4a3528" stroke-width="1.2" fill="none" opacity="0.8"/>
        <!-- dress & shoulders -->
        <path d="M-80,115 C-78,72 -58,52 -30,44 C-20,41 -16,37 -14,32 L14,32 C16,37 20,41 30,44 C58,52 78,72 80,115 Z" fill="url(#pDress)"/>
        <path d="M-62,66 C-52,58 -42,55 -30,54 M36,56 C50,60 60,70 66,82" stroke="#5a7a7e" stroke-width="2" opacity="0.35" fill="none"/>
        <path d="M-6,52 L-2,115 M6,52 L4,115" stroke="#0a0f10" stroke-width="1.2" opacity="0.6"/>
        <!-- ears -->
        <path d="M-24,-26 C-29,-28 -30,-18 -25,-14 Z" fill="#c9ab92"/><path d="M24,-26 C29,-28 30,-18 25,-14 Z" fill="#b8987e"/>
        <!-- neck -->
        <path d="M-10.5,-6 C-10.5,3 -11,8 -11.8,14 L11.8,14 C11,8 10.5,3 10.5,-6 Z" fill="url(#pNeck)"/><path d="M-10.5,-6 C-10.5,3 -11,8 -11.8,14 L11.8,14 C11,8 10.5,3 10.5,-6 Z" fill="url(#pNeckShade)"/><path d="M5,2 C7,6 9,10 12,13" stroke="#6a4a3a" stroke-width="2.2" opacity="0.22" fill="none"/><path d="M-6,4 C-7,7 -8,10 -10,13" stroke="#fff4e0" stroke-width="1.6" opacity="0.18" fill="none"/>
        
        <!-- lace collar (high, but short) -->
        <path d="M-12,11 C-13,19 -14.5,27 -17,33 C-6,37 6,37 17,33 C14.5,27 13,19 12,11 C4,13 -4,13 -12,11 Z" fill="url(#pCollar)" ${K} stroke-width="0.7"/>
        <path d="M-12,11 q1.5,-2.4 3,0 q1.5,-2.4 3,0 q1.5,-2.4 3,0 q1.5,-2.4 3,0 q1.5,-2.4 3,0 q1.5,-2.4 3,0 q1.5,-2.4 3,0 q1.5,-2.4 3,0" fill="#ece3c8" stroke="#9a8c6e" stroke-width="0.5"/>
        <path d="M-8,15 L-10,34 M-4,15 L-5,35 M0,15 L0,36 M4,15 L5,35 M8,15 L10,34" stroke="#9a8c6e" stroke-width="0.6" opacity="0.6"/>
        <path d="M-17,33 C-6,37 6,37 17,33 L22,39 C7,45 -7,45 -22,39 Z" fill="#c9bb99" stroke="#8a7a5a" stroke-width="0.5"/>
        <path d="M-20,39 q2,3 4,0 q2,3 4,0 q2,3 4,0 q2,3 4,0 q2,3 4,0 q2,3 4,0 q2,3 4,0 q2,3 4,0 q2,3 4,0 q2,3 4,0" fill="none" stroke="#e9e0c4" stroke-width="0.7" opacity="0.8"/>
        <!-- moth brooch -->
        <g transform="translate(0,31) scale(0.36)">
          <path d="M0,-2 C-6,-14 -20,-18 -24,-8 C-25,-1 -15,3 0,2 Z" fill="#a8d8b0" stroke="#b8893a" stroke-width="2.4"/>
          <path d="M0,-2 C6,-14 20,-18 24,-8 C25,-1 15,3 0,2 Z" fill="#a8d8b0" stroke="#b8893a" stroke-width="2.4"/>
          <path d="M0,1 C-6,4 -16,8 -14,16 C-11,20 -4,13 0,4 Z" fill="#6fae8a" stroke="#b8893a" stroke-width="2.4"/>
          <path d="M0,1 C6,4 16,8 14,16 C11,20 4,13 0,4 Z" fill="#6fae8a" stroke="#b8893a" stroke-width="2.4"/>
          <ellipse cx="0" cy="1" rx="3" ry="9" fill="#e7c476" stroke="#6e4d1c" stroke-width="1"/>
          <circle cx="-13" cy="-7" r="2.5" fill="#e9e0c4"/><circle cx="13" cy="-7" r="2.5" fill="#e9e0c4"/>
          <circle cx="-2" cy="-4" r="1.6" fill="#fff"/>
        </g>
        <!-- face -->
        <path d="M0,-56 C15,-56 23.5,-44 23.5,-28 C23.5,-14 18,-3 8,4 C4,7 -4,7 -8,4 C-18,-3 -23.5,-14 -23.5,-28 C-23.5,-44 -15,-56 0,-56 Z" fill="url(#pSkin)"/><path d="M0,-56 C15,-56 23.5,-44 23.5,-28 C23.5,-14 18,-3 8,4 C4,7 -4,7 -8,4 C-18,-3 -23.5,-14 -23.5,-28 C-23.5,-44 -15,-56 0,-56 Z" fill="url(#pFaceShade)"/><path d="M0,-56 C15,-56 23.5,-44 23.5,-28 C23.5,-14 18,-3 8,4 C4,7 -4,7 -8,4 C-18,-3 -23.5,-14 -23.5,-28 C-23.5,-44 -15,-56 0,-56 Z" fill="url(#pJaw)"/>
        
        
        <ellipse cx="-13" cy="-13" rx="9" ry="6.5" fill="url(#pCheek)"/>
        <ellipse cx="17" cy="-12" rx="6" ry="9" fill="url(#pShadowSoft)"/><ellipse cx="-17.5" cy="-12" rx="4.5" ry="8" fill="url(#pShadowSoft)" opacity="0.55"/>
        <ellipse cx="13" cy="-2" rx="9" ry="5" transform="rotate(-38 13 -2)" fill="url(#pShadowSoft)"/><ellipse cx="-13" cy="-2" rx="8" ry="4" transform="rotate(38 -13 -2)" fill="url(#pShadowSoft)" opacity="0.6"/>
        <ellipse cx="-12" cy="-19.5" rx="5" ry="2.6" fill="url(#pBrow)" opacity="0.7"/>
        <ellipse cx="0" cy="1.8" rx="4" ry="1.6" fill="url(#pShadowSoft)" opacity="0.7"/>
        <ellipse cx="13" cy="-13" rx="8" ry="6" fill="url(#pCheek)" opacity="0.8"/>
        <ellipse cx="-5" cy="-43" rx="13" ry="7" fill="url(#pBrow)"/><ellipse cx="-9" cy="-20" rx="6" ry="4" fill="url(#pBrow)" opacity="0.6"/><ellipse cx="0" cy="3" rx="5" ry="2.5" fill="url(#pBrow)" opacity="0.5"/>
        <!-- eyes -->
        <g>
          <path d="M-16,-26 C-13,-29.5 -7,-29.5 -4,-26 C-7,-23.5 -13,-23.5 -16,-26 Z" fill="#ece4d4"/>
          <path d="M4,-26 C7,-29.5 13,-29.5 16,-26 C13,-23.5 7,-23.5 4,-26 Z" fill="#e6ddcc"/>
          <clipPath id="pEyeClipL"><path d="M-16,-26 C-13,-29.5 -7,-29.5 -4,-26 C-7,-23.5 -13,-23.5 -16,-26 Z"/></clipPath>
          <clipPath id="pEyeClipR"><path d="M4,-26 C7,-29.5 13,-29.5 16,-26 C13,-23.5 7,-23.5 4,-26 Z"/></clipPath>
          <g clip-path="url(#pEyeClipL)"><g id="edithEyeL"><circle cx="-10" cy="-26.2" r="2.9" fill="#3f5446"/><circle cx="-10" cy="-26.2" r="1.35" fill="#0b0806"/><circle cx="-10.9" cy="-27.1" r="0.7" fill="#fff" opacity="0.9"/></g></g>
          <g clip-path="url(#pEyeClipR)"><g id="edithEyeR"><circle cx="10" cy="-26.2" r="2.9" fill="#3f5446"/><circle cx="10" cy="-26.2" r="1.35" fill="#0b0806"/><circle cx="9.1" cy="-27.1" r="0.7" fill="#fff" opacity="0.9"/></g></g>
          <g class="edith-lid" transform="translate(0,-29.5) scale(1,0) translate(0,29.5)"><path d="M-16.6,-26 C-13,-30.4 -7,-30.4 -3.4,-26 C-7,-23 -13,-23 -16.6,-26 Z" fill="#dcc6ac"/><path d="M-16,-25 C-12,-23.6 -8,-23.6 -4,-25" stroke="#5a3a2a" stroke-width="0.9" fill="none"/></g>
          <g class="edith-lid" transform="translate(0,-29.5) scale(1,0) translate(0,29.5)"><path d="M3.4,-26 C7,-30.4 13,-30.4 16.6,-26 C13,-23 7,-23 3.4,-26 Z" fill="#d6bea4"/><path d="M4,-25 C8,-23.6 12,-23.6 16,-25" stroke="#5a3a2a" stroke-width="0.9" fill="none"/></g>
          <path d="M-16.5,-25.8 C-13,-30.2 -7,-30.2 -3.6,-25.8" stroke="#1c120d" stroke-width="1.3" fill="none"/>
          <path d="M3.6,-25.8 C7,-30.2 13,-30.2 16.5,-25.8" stroke="#1c120d" stroke-width="1.3" fill="none"/>
          <path d="M-15,-29.8 C-12,-32 -8,-32 -5,-30" stroke="#8a6a55" stroke-width="0.8" fill="none" opacity="0.7"/>
          <path d="M5,-30 C8,-32 12,-32 15,-29.8" stroke="#8a6a55" stroke-width="0.8" fill="none" opacity="0.7"/>
          <path d="M-15,-23.6 C-12,-21.5 -7,-21.5 -5,-23.6" stroke="#8a6a7a" stroke-width="1.6" fill="none" opacity="0.35"/>
          <path d="M5,-23.6 C7,-21.5 12,-21.5 15,-23.6" stroke="#8a6a7a" stroke-width="1.6" fill="none" opacity="0.35"/>
        </g>
        <path d="M-17,-34 C-13,-36 -8,-36.6 -4.2,-36" stroke="#2a1d17" stroke-width="1.5" fill="none"/>
        <path d="M4.2,-36 C8,-36.6 13,-36 17,-34" stroke="#2a1d17" stroke-width="1.5" fill="none"/>
        <!-- nose -->
        <path d="M1,-27 C3,-20 4.6,-15 4.2,-11.2 C2.8,-10.2 1.2,-10.6 0.6,-11.6 C1.6,-16 1.3,-22 1,-27 Z" fill="#7a5a45" opacity="0.32"/>
        <path d="M-1.6,-25 C-1.9,-20 -2.1,-16 -3,-13" stroke="#fff2dc" stroke-width="1" opacity="0.35" fill="none"/>
        <ellipse cx="-0.6" cy="-12.6" rx="2.2" ry="1.5" fill="url(#pBrow)"/>
        <path d="M-3.8,-11.6 C-4.4,-10 -3.2,-9.2 -2,-9.7 M3.8,-11.4 C4.4,-9.9 3.4,-9.2 2.2,-9.6" stroke="#8a6250" stroke-width="0.7" fill="none" opacity="0.8"/>
        <ellipse cx="-1.9" cy="-10" rx="1.05" ry="0.55" fill="#4a2e24" opacity="0.75"/><ellipse cx="2" cy="-10" rx="1.05" ry="0.55" fill="#4a2e24" opacity="0.75"/>
        
        <!-- mouth -->
        <path d="M-5.8,-2.4 C-3,-5 -1,-4.4 0,-3.8 C1,-4.4 3,-5 5.8,-2.4 C3,-2.6 -3,-2.6 -5.8,-2.4 Z" fill="#94494b"/>
        <path d="M-5,-3 C-2,0.8 2,0.8 5,-3 Z" fill="#b0635f"/>
        <path d="M-5.8,-2.3 C-3,-2.8 -1,-2.7 0,-2.6 C1,-2.7 3,-2.8 5.8,-2.3" stroke="#4a1f1e" stroke-width="0.8" fill="none"/>
        <ellipse cx="-1" cy="-1.3" rx="2" ry="0.7" fill="#fff" opacity="0.25"/>
        <!-- hair front: soft pompadour, centre parting, swept back over the ears -->
        <path d="M-31,-22 C-37,-52 -20,-71 0,-71 C20,-71 37,-52 31,-22 C28,-36 18,-47 4,-49 C1.5,-47 -1.5,-47 -4,-49 C-18,-47 -28,-36 -31,-22 Z" fill="url(#pHair)"/>
        <path d="M-31,-22 C-30,-30 -27,-34 -22,-36 C-24,-30 -24,-25 -21,-20 C-25,-19 -29,-20 -31,-22 Z M31,-22 C30,-30 27,-34 22,-36 C24,-30 24,-25 21,-20 C25,-19 29,-20 31,-22 Z" fill="#150e0b"/>
        <path d="M-33,-30 C-34,-50 -22,-66 -6,-69" stroke="#7a6050" stroke-width="1.6" fill="none" opacity="0.45"/>
        
        <g fill="#2c1e16">
          <path d="M-4,-49 C-14,-47 -24,-40 -28,-26 C-24,-35 -16,-42 -6,-45.5 Z"/><path d="M-5,-59 C-18,-57 -28,-47 -31,-30 C-26,-43 -18,-51 -7,-54 Z"/>
          <path d="M4,-49 C14,-47 24,-40 28,-26 C24,-35 16,-42 6,-45.5 Z"/><path d="M5,-59 C18,-57 28,-47 31,-30 C26,-43 18,-51 7,-54 Z"/>
        </g>
        <g fill="none" stroke-linecap="round">
          <path d="M-7,-64 C-18,-61 -27,-51 -30,-36 M-5,-52 C-14,-50 -22,-43 -25,-32" stroke="#8a6650" stroke-width="1.1" opacity="0.55"/>
          <path d="M7,-64 C18,-61 27,-51 30,-36 M5,-52 C14,-50 22,-43 25,-32" stroke="#6a4c3a" stroke-width="1" opacity="0.4"/>
          <path d="M-14,-66 C-8,-69 -2,-70 3,-69" stroke="#a07a5c" stroke-width="1.6" opacity="0.4"/>
          <path d="M-4,-86 C0,-89 6,-89 10,-86" stroke="#8a6650" stroke-width="1.2" opacity="0.5"/>
          <path d="M-27,-22 C-30,-15 -28,-8 -31,0 M26.5,-21 C29.5,-14 27.5,-7 29.5,1 M-3,-48 C-6,-44 -5,-40 -8,-36 M-22,-44 C-26,-46 -30,-44 -33,-40" stroke="#1a110d" stroke-width="0.6" opacity="0.85"/>
        </g>
        <circle cx="25.5" cy="-11" r="1.7" fill="#efe6d6"/><circle cx="25" cy="-11.6" r="0.6" fill="#fff"/>
        </g>
        <!-- varnish sheen & craquelure -->
        <rect x="-80" y="-115" width="160" height="230" fill="url(#pSheen)"/>
        <path d="M-60,-90 l14,10 l-4,12 M50,40 l-10,14 l6,12 M-50,70 l12,-6 l8,10" stroke="#000" stroke-width="0.5" opacity="0.25" fill="none"/>
      </g>
      <ellipse cx="0" cy="0" rx="72" ry="104" fill="none" stroke="#6e4d1c" stroke-width="3"/>
      <ellipse cx="0" cy="0" rx="75" ry="107" fill="none" stroke="#e7c476" stroke-width="1.2" opacity="0.6"/>
      <path fill-rule="evenodd" d="M-93,-128 H93 V128 H-93 Z M0,-107 A75,107 0 1,0 0,107 A75,107 0 1,0 0,-107 Z" fill="#5a3f16"/>
      <path fill-rule="evenodd" d="M-93,-128 H93 V128 H-93 Z M0,-107 A75,107 0 1,0 0,107 A75,107 0 1,0 0,-107 Z" fill="url(#gGilt)" opacity="0.4"/>
      <ellipse cx="0" cy="0" rx="80" ry="113" fill="none" stroke="#e7c476" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 6" opacity="0.7"/>
      <ellipse cx="0" cy="0" rx="85" ry="118" fill="none" stroke="#2a1d0c" stroke-width="1" opacity="0.5"/>
      <rect x="-26" y="112" width="52" height="11" rx="1.5" fill="url(#gBrass)" ${K} stroke-width="0.8"/>
      <text x="0" y="120.5" text-anchor="middle" font-family="'IM Fell English SC','IM Fell English',Georgia,serif" font-size="7.5" fill="#3a2410">Edith Vane</text>
    </g></g>`;
  }

  function desk() {
    const leg = (cx, top, bot, w) => {
      const h = w / 2;
      return `<path d="M${cx - h},${top} H${cx + h} V${top + 26} C${cx + h * 0.5},${top + 32} ${cx + h * 0.45},${top + 36} ${cx + h * 0.55},${top + 44}
        C${cx + h * 0.9},${top + 54} ${cx + h * 0.8},${top + 70} ${cx + h * 0.42},${top + 80} L${cx + h * 0.3},${bot - 22}
        C${cx + h * 0.55},${bot - 18} ${cx + h * 0.55},${bot - 10} ${cx + h * 0.36},${bot - 7} L${cx + h * 0.3},${bot} H${cx - h * 0.3} L${cx - h * 0.36},${bot - 7}
        C${cx - h * 0.55},${bot - 10} ${cx - h * 0.55},${bot - 18} ${cx - h * 0.3},${bot - 22} L${cx - h * 0.42},${top + 80}
        C${cx - h * 0.8},${top + 70} ${cx - h * 0.9},${top + 54} ${cx - h * 0.55},${top + 44} C${cx - h * 0.45},${top + 36} ${cx - h * 0.5},${top + 32} ${cx - h},${top + 26} Z"
        fill="url(#gLegWood)" ${K} stroke-width="2"/>
        <path d="M${cx - h * 0.2},${top + 46} C${cx - h * 0.4},${top + 60} ${cx - h * 0.2},${top + 74} ${cx - h * 0.1},${top + 80} M${cx - h * 0.1},${top + 86} L${cx - h * 0.08},${bot - 24}" stroke="#a87650" stroke-width="1.6" opacity="0.45" fill="none"/>`;
    };
    const pull = (x, y) => `<g transform="translate(${x},${y})">
        <path d="M-15,-2 C-15,-8 -9,-9 -7,-5 L7,-5 C9,-9 15,-8 15,-2 C15,3 9,4 7,1 L-7,1 C-9,4 -15,3 -15,-2Z" fill="url(#gBrass)" ${K} stroke-width="1.2"/>
        <path d="M-11,-1 C-11,10 11,10 11,-1" fill="none" stroke="#1c140f" stroke-width="4.5"/>
        <path d="M-11,-1 C-11,10 11,10 11,-1" fill="none" stroke="#c9a050" stroke-width="2.6"/>
        <path d="M-9,2 C-7,7 -2,8 2,8" fill="none" stroke="#fff1c1" stroke-width="0.9" opacity="0.7"/>
        <circle cx="-11" cy="-1" r="2" fill="#6e4d1c"/><circle cx="11" cy="-1" r="2" fill="#6e4d1c"/></g>`;
    const drawer = (x, y, w, h, key) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#5d3a25" ${K} stroke-width="1.8"/>
        <path d="M${x + 2},${y + h - 2} V${y + 2} H${x + w - 2}" fill="none" stroke="#a87650" stroke-width="1.3" opacity="0.5"/>
        <path d="M${x + 12},${y + 16} C${x + w * 0.3},${y + 10} ${x + w * 0.6},${y + 22} ${x + w - 14},${y + 14} M${x + 18},${y + h - 14} C${x + w * 0.4},${y + h - 20} ${x + w * 0.7},${y + h - 8} ${x + w - 20},${y + h - 16}
          M${x + w * 0.45},${y + 28} c 10,-6 22,-6 30,2 c -8,6 -20,6 -30,-2" fill="none" stroke="#3a2418" stroke-width="1" opacity="0.6"/>
        ${pull(x + w / 2, y + h / 2 - 2)}
        ${key ? `<g transform="translate(${x + w / 2 - 38},${y + h / 2})"><path d="M-6,-8 H6 V4 L0,10 L-6,4Z" fill="url(#gBrass)" ${K} stroke-width="1"/><circle cy="-2" r="2" fill="#120b07"/><path d="M-1,-1 L-1.5,5 H1.5 L1,-1Z" fill="#120b07"/></g>` : ''}`;
    let s = '';
    // floor shadow under the desk
    s += cshadow(800, 812, 480, 30, 0.95);
    s += `<path d="M430,686 H1170 L1180,800 H420 Z" fill="#050302" opacity="0.55"/>`;
    // back legs & stretcher
    s += `<rect x="440" y="684" width="22" height="108" fill="#26170e" ${K} stroke-width="1.6"/>`;
    s += `<rect x="1138" y="684" width="22" height="108" fill="#26170e" ${K} stroke-width="1.6"/>`;
    s += `<path d="M420,770 H1180 L1176,778 H424Z" fill="#2a190f" ${K} stroke-width="1.4"/>`;
    // front legs
    s += leg(404, 680, 818, 38) + leg(1196, 680, 818, 38);
    // apron
    s += `<rect x="384" y="604" width="832" height="82" fill="url(#gWalnut)" ${K} stroke-width="2.4"/>`;
    s += `<rect x="384" y="680" width="832" height="6" fill="#24160d"/>`;
    s += drawer(430, 616, 190, 56) + drawer(634, 616, 332, 56, true) + drawer(980, 616, 190, 56);
    // top slab: surface (seen slightly from above) + front edge
    s += `<path d="M402,546 H1198 L1226,590 H374 Z" fill="#6f4529" ${K} stroke-width="2.4"/>`;
    s += `<path d="M430,552 H1170 L1190,584 H410 Z" fill="#26332a" stroke="#120b07" stroke-width="1.5"/>`;
    s += `<path d="M436,555.5 H1164 L1181,581 H419 Z" fill="none" stroke="#b8893a" stroke-width="1" opacity="0.5" stroke-dasharray="6 3"/>`;
    s += `<path d="M430,552 H1170 L1190,584 H410 Z" fill="url(#gDeskSheen)"/>`;
    s += `<path d="M374,590 H1226 V606 H374 Z" fill="#7a4e30" ${K} stroke-width="2.4"/>`;
    s += `<line x1="376" y1="592.5" x2="1224" y2="592.5" stroke="#c08a5e" stroke-width="1.6" opacity="0.6"/>`;
    s += `<line x1="376" y1="604" x2="1224" y2="604" stroke="#2a190f" stroke-width="1.4" opacity="0.8"/>`;
    // inkwell + quill (left end of desk, clear of the journal zone)
    s += `<g>
      <ellipse cx="462" cy="570" rx="26" ry="6" fill="#000" opacity="0.4"/>
      <path d="M444,540 C444,536 480,536 480,540 L482,566 C482,571 442,571 442,566 Z" fill="#141c20" ${K} stroke-width="1.6"/>
      <path d="M448,542 L447,563" stroke="#8fb3d9" stroke-width="2" opacity="0.35"/>
      <rect x="452" y="530" width="20" height="9" rx="2" fill="url(#gBrass)" ${K} stroke-width="1.2"/>
      <path d="M468,532 C478,500 492,470 512,440" stroke="#d8ccb0" stroke-width="1.6" fill="none"/>
      <path d="M512,440 C500,452 486,474 478,504 C490,484 500,466 518,452 C516,446 514,442 512,440 Z" fill="#e9e0c4" ${K} stroke-width="1.2"/>
      <path d="M508,446 C498,462 490,478 484,494" stroke="#a89878" stroke-width="0.8" fill="none"/>
    </g>`;
    // pale wing scale & dust fallen on the desk under the sketch wall (shown once the sketch moth is gone)
    s += `<g class="sk-dust" style="display:none">
      <path d="M396,571 C399,566 406,565 410,568 C407,570 404,573 402,576 C400,575 397,573 396,571 Z" fill="#e9e0c4" opacity="0.85"/>
      <path d="M398,571 L408,567.6 M399,573 L405,569.6" stroke="#b8a888" stroke-width="0.5"/>
      ${[[392, 578, 1.2], [404, 580, 0.9], [414, 574, 1.1], [420, 582, 0.8], [388, 584, 0.9], [411, 585, 1.3], [426, 577, 0.7], [399, 586, 0.8], [432, 583, 0.9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#efe7cf" opacity="0.7"/>`).join('')}
    </g>`;
    // spectacles folded on the desk (right of the lamp zone)
    s += `<g transform="translate(1188,572)" opacity="0.95"><ellipse cx="-8" cy="0" rx="9" ry="5" fill="#cfe3ff" fill-opacity="0.12" stroke="#b8893a" stroke-width="1.6"/><path d="M1,0 C3,-2 5,-2 7,0" stroke="#b8893a" stroke-width="1.4" fill="none"/></g>`;
    return s;
  }

  function southDecor() {
    let s = '<g transform="translate(18,0)">';
    // peg rail with shawl & bonnet
    s += `<rect x="96" y="${DADO - 250}" width="220" height="16" fill="url(#gBeam)" ${K} stroke-width="2"/>`;
    const py = DADO - 242;
    s += [130, 206, 282].map(x => `<ellipse cx="${x}" cy="${py + 2}" rx="6" ry="6" fill="#553421" ${K} stroke-width="1.4"/>`).join('');
    s += `<g>
      <path d="M114,${py + 2} C104,${py + 60} 99,${py + 140} 97,${py + 214} L180,${py + 192} C177,${py + 124} 170,${py + 58} 150,${py + 2} Z" fill="#7d3f40" ${K} stroke-width="2"/>
      <path d="M99,${py + 192} L178,${py + 172} M98,${py + 202} L179,${py + 182}" stroke="#e7c476" stroke-width="1.4" opacity="0.55"/>
      <path d="M100,${py + 150} C120,${py + 146} 150,${py + 140} 176,${py + 132}" stroke="#5e2322" stroke-width="5" opacity="0.6" fill="none"/>
      ${Array.from({ length: 17 }, (_, i) => { const t = i / 16, x = 97 + t * 83, y = py + 214 - t * 22; return `<path d="M${r1(x)},${r1(y)} l${r1(-1 + (i % 3))},${14 + (i % 4) * 2}" stroke="#7d3f40" stroke-width="1.8" stroke-linecap="round"/>`; }).join('')}
      <path d="M116,${py + 1} L152,${py + 1} C156,${py + 44} 150,${py + 96} 133,${py + 156} C122,${py + 104} 114,${py + 52} 116,${py + 1} Z" fill="#a35a5a" ${K} stroke-width="2"/>
      <path d="M121,${py + 8} C120,${py + 56} 126,${py + 104} 133,${py + 142} C144,${py + 100} 149,${py + 54} 147,${py + 8}" stroke="#e7c476" stroke-width="1.3" fill="none" opacity="0.6" stroke-dasharray="5 3"/>
      ${[[134, 30], [128, 58], [140, 60], [134, 88], [131, 116]].map(([x, y]) => `<path d="M${x},${py + y} c4,-6 9,-2 6,3 c-2,4 -8,5 -9,10 c-3,-5 -1,-10 3,-13 Z" fill="#6a2f30" opacity="0.8"/><circle cx="${x + 3}" cy="${py + y}" r="1.2" fill="#e7c476" opacity="0.7"/>`).join('')}
      <path d="M133,${py + 156} l-3,16 M133,${py + 156} l0,18 M133,${py + 156} l3,16" stroke="#a35a5a" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M140,${py + 6} C150,${py + 40} 148,${py + 80} 140,${py + 120}" stroke="#c98a7a" stroke-width="2" fill="none" opacity="0.35"/>
    </g>`;
    s += `<g>
      <path d="M296,${py + 26} C302,${py + 60} 296,${py + 96} 304,${py + 124} M306,${py + 24} C318,${py + 58} 314,${py + 88} 324,${py + 116}" stroke="#5e2322" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse cx="282" cy="${py + 26}" rx="50" ry="14" transform="rotate(-6 282 ${py + 26})" fill="#c9a86a" ${K} stroke-width="2"/>
      <ellipse cx="282" cy="${py + 26}" rx="38" ry="9" transform="rotate(-6 282 ${py + 26})" fill="none" stroke="#8a6a3a" stroke-width="1" opacity="0.7"/>
      <ellipse cx="282" cy="${py + 26}" rx="44" ry="11.5" transform="rotate(-6 282 ${py + 26})" fill="none" stroke="#8a6a3a" stroke-width="0.8" opacity="0.5"/>
      <path d="M256,${py + 24} C254,${py - 10} 306,${py - 14} 308,${py + 18} C292,${py + 26} 270,${py + 28} 256,${py + 24} Z" fill="#b8955a" ${K} stroke-width="2"/>
      <path d="M262,${py + 4} C276,${py - 4} 294,${py - 4} 304,${py + 2}" stroke="#8a6a3a" stroke-width="1" fill="none" opacity="0.7"/>
      <path d="M256,${py + 16} C272,${py + 20} 292,${py + 18} 308,${py + 10} L308,${py + 19} C292,${py + 27} 270,${py + 28} 256,${py + 24} Z" fill="#5e2322" ${K} stroke-width="1"/>
      <path d="M300,${py + 18} c6,-8 14,-6 12,2 c-3,6 -10,4 -12,-2 Z M300,${py + 18} c-2,-9 -10,-10 -12,-3 c0,6 8,7 12,3 Z" fill="#7a2e2c" ${K} stroke-width="1"/>
      <path d="M268,${py - 2} C276,${py - 8} 288,${py - 8} 296,${py - 4}" stroke="#e8d4a0" stroke-width="2" fill="none" opacity="0.5"/>
    </g>`;
    s += '</g>';
    // pinned sketches
    s += papers(300, 196, 110, 138, -4, `
      <g class="sk-moth"><g transform="translate(0,-8) scale(1.9)" fill="none" stroke="#3a2a1c" stroke-width="0.7" stroke-linecap="round">
        <path d="M0,-2 C-6,-14 -20,-18 -24,-8 C-25,-1 -15,3 0,2 M0,-2 C6,-14 20,-18 24,-8 C25,-1 15,3 0,2 M0,1 C-6,4 -16,8 -14,16 C-11,20 -4,13 0,4 M0,1 C6,4 16,8 14,16 C11,20 4,13 0,4"/>
        <path d="M0,-6 L0,10 M-1,-6 C-4,-12 -6,-14 -9,-15 M1,-6 C4,-12 6,-14 9,-15"/>
        <circle cx="-14" cy="-7" r="3"/><circle cx="14" cy="-7" r="3"/><circle cx="-8" cy="11" r="2"/><circle cx="8" cy="11" r="2"/>
        <path d="M-20,-8 l3,2 M-18,-11 l3,2 M20,-8 l-3,2 M18,-11 l-3,2" opacity="0.7"/>
      </g></g>
      <g class="sk-gone" style="display:none">
        <g transform="translate(0,-8) scale(1.9)" fill="none" stroke="#6a5a44" stroke-width="0.55" opacity="0.4" stroke-dasharray="1.2 1.6">
          <path d="M0,-2 C-6,-14 -20,-18 -24,-8 C-25,-1 -15,3 0,2 M0,-2 C6,-14 20,-18 24,-8 C25,-1 15,3 0,2 M0,1 C-6,4 -16,8 -14,16 C-11,20 -4,13 0,4 M0,1 C6,4 16,8 14,16 C11,20 4,13 0,4"/>
        </g>
        <!-- torn pinhole where the body was held -->
        <path d="M-2.5,-1 C-3.5,-3 -1,-5 1,-4 C3,-4.5 4,-2 3,0 C3.5,2 1,3.5 -0.5,2.5 C-2.5,2.8 -3.5,1 -2.5,-1 Z" fill="#241a12"/>
        <path d="M1,-4 C3,-7 6,-7 7,-5 C5,-4.5 3.5,-3.5 3,0 Z" fill="#e6dcc0" stroke="#8a7a5a" stroke-width="0.5"/>
        <path d="M-2,2.5 l-2,3 M1,3 l0.5,3" stroke="#6a5a44" stroke-width="0.5"/>
        <!-- the empty specimen pin, pushed through above the hole -->
        <line x1="3" y1="-22" x2="6" y2="-4" stroke="#000" stroke-width="1.6" opacity="0.25"/>
        <line x1="0" y1="-24" x2="1" y2="-6" stroke="#9a968e" stroke-width="1.1"/>
        <line x1="-0.3" y1="-23" x2="0.6" y2="-7" stroke="#e8e6e0" stroke-width="0.4" opacity="0.8"/>
        <circle cx="0" cy="-24.5" r="2.6" fill="#1c140f"/><circle cx="-0.8" cy="-25.3" r="0.8" fill="#fff" opacity="0.75"/>
      </g>
      <path d="M-38,48 q10,-4 20,0 t22,0 M-38,56 q14,-3 30,0" stroke="#3a2a1c" stroke-width="1" fill="none" opacity="0.7"/>`);
    s += papers(176, 200, 92, 112, 5, `
      <g fill="none" stroke="#3a2a1c" stroke-width="1" stroke-linecap="round">
        <path d="M-32,20 C-30,-10 -10,-34 30,-30 C24,-10 20,10 -32,20 Z"/>
        <path d="M-32,20 L20,-24 M-32,20 L26,-10 M-32,20 L10,-30 M-32,20 L22,4 M-32,20 L-2,-28"/>
        <circle cx="4" cy="-10" r="6"/><circle cx="4" cy="-10" r="2.5"/>
      </g>
      <path d="M-30,38 q12,-4 24,0 t20,0" stroke="#3a2a1c" stroke-width="1" fill="none" opacity="0.7"/>`);
    s += papers(410, 418, 78, 92, 3, `
      <g fill="none" stroke="#3a2a1c" stroke-width="1" stroke-linecap="round">
        <path d="M0,-30 L0,-22 M0,-22 C-10,-18 -12,4 -6,18 C-3,24 3,24 6,18 C12,4 10,-18 0,-22 Z"/>
        <path d="M-8,-10 C-3,-8 3,-8 8,-10 M-10,0 C-4,2 4,2 10,0 M-8,10 C-3,12 3,12 8,10"/>
        <path d="M-24,-30 H24" stroke-width="1.4"/>
      </g>
      <path d="M-24,32 q10,-3 18,0 t18,0" stroke="#3a2a1c" stroke-width="1" fill="none" opacity="0.7"/>`);
    // pressed flower frame under the portrait
    s += `<g transform="translate(-64,-26)">${frameRect(1300, 470, 130, 92, 9)}
      <rect x="1309" y="479" width="112" height="74" fill="#e2d8bd"/>
      <path d="M1340,540 C1350,520 1360,505 1372,492" stroke="#6b7a4a" stroke-width="1.6" fill="none"/>
      <path d="M1352,520 C1340,512 1334,516 1332,524 C1340,526 1346,524 1352,520 Z M1358,510 C1368,506 1376,510 1378,516 C1370,518 1362,516 1358,510Z" fill="#7d8a55"/>
      <g transform="translate(1374,490)" fill="#8a78a0" stroke="#5a4a70" stroke-width="0.6">
        <ellipse cx="0" cy="-6" rx="3.5" ry="6"/><ellipse cx="6" cy="-1" rx="3.5" ry="6" transform="rotate(72 6 -1)"/><ellipse cx="4" cy="6" rx="3.5" ry="6" transform="rotate(144 4 6)"/><ellipse cx="-4" cy="6" rx="3.5" ry="6" transform="rotate(216 -4 6)"/><ellipse cx="-6" cy="-1" rx="3.5" ry="6" transform="rotate(288 -6 -1)"/>
        <circle r="2.2" fill="#e7c476"/></g>
      <path d="M1320,546 q8,-2 16,0" stroke="#3a2a1c" stroke-width="0.8" fill="none"/>
    </g>`;
    // waste-paper basket
    s += `${cshadow(1300, 800, 58, 9)}<g>
      <path d="M1262,722 H1342 L1332,800 H1272 Z" fill="#6a4a2a" ${K} stroke-width="2"/>
      ${[736, 750, 764, 778, 792].map(y => `<path d="M${1262 + (y - 722) / 8},${y} H${1342 - (y - 722) / 8}" stroke="#3a2410" stroke-width="1.4"/>`).join('')}
      ${[1276, 1290, 1304, 1318, 1330].map(x => `<path d="M${x},724 L${x + (1302 - x) * 0.12},798" stroke="#3a2410" stroke-width="1" opacity="0.6"/>`).join('')}
      <ellipse cx="1302" cy="722" rx="40" ry="6" fill="#241609" ${K} stroke-width="2"/>
      <path d="M1284,720 C1280,706 1292,698 1302,702 C1312,694 1324,706 1318,718 Z" fill="#d8cba8" ${K} stroke-width="1.4"/>
      <path d="M1290,712 l6,-4 l4,6 l6,-6 M1296,718 l6,-3" stroke="#8a7a5a" stroke-width="0.8" fill="none"/>
    </g>`;
    // rug under the desk
    s += `<g>
      <path d="M290,797 H1310 L1470,900 H130 Z" fill="#3b1516"/>
      <path d="M318,801 H1282 L1418,900 H182 Z" fill="#5e2322"/>
      <path d="M340,805 H1260 L1378,900 H222 Z" fill="#3a1718"/>
      <path d="M356,808 H1244 L1350,900 H250 Z" fill="#6a2a26"/>
      <path d="M340,805 H1260 L1378,900 H222 Z" fill="none" stroke="#a57a3a" stroke-width="1.5" stroke-dasharray="2 6" opacity="0.7"/>
      <ellipse cx="800" cy="870" rx="210" ry="30" fill="#2a1415" stroke="#a57a3a" stroke-width="1.5" opacity="0.9"/>
      <ellipse cx="800" cy="870" rx="140" ry="19" fill="#7a3a2e"/>
      <ellipse cx="800" cy="870" rx="70" ry="9" fill="#a35a5a" opacity="0.6"/>
      ${Array.from({ length: 50 }, (_, i) => { const x = 294 + i * 20.4; return `<path d="M${x},797 l-1,-5" stroke="#8a6a4a" stroke-width="1.2"/>`; }).join('')}
    </g>`;
    return s;
  }

  // ================================================================== NORTH
  function northDecor() {
    let s = '';
    // trunk (left, on floor)
    s += cshadow(190, 796, 115, 12);
    s += `<g>
      <path d="M100,714 H282 V794 H100 Z" fill="#4a2f1f" ${K} stroke-width="2.4"/>
      <path d="M100,716 C100,690 112,682 191,682 C270,682 282,690 282,716 Z" fill="#5a3824" ${K} stroke-width="2.4"/>
      <path d="M100,716 H282" stroke="${INK}" stroke-width="3"/>
      <path d="M110,700 C130,688 250,688 272,700" stroke="#8a5e3c" stroke-width="1.5" fill="none" opacity="0.6"/>
      ${[128, 254].map(x => `<rect x="${x - 7}" y="684" width="14" height="110" fill="#6e4d1c" ${K} stroke-width="1.4"/><rect x="${x - 7}" y="684" width="3" height="110" fill="#e7c476" opacity="0.35"/>`).join('')}
      ${[[100, 716], [282, 716], [100, 794], [282, 794]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="url(#gBrass)" ${K} stroke-width="1.2"/>`).join('')}
      <rect x="180" y="708" width="22" height="26" rx="3" fill="url(#gBrass)" ${K} stroke-width="1.4"/><circle cx="191" cy="722" r="2.5" fill="#120b07"/>
      <rect x="148" y="742" width="46" height="30" fill="#d8c8a4" ${K} stroke-width="1" transform="rotate(-4 170 757)"/>
      <text x="171" y="762" text-anchor="middle" font-family="'IM Fell English',Georgia,serif" font-size="12" fill="#3a2a1c" transform="rotate(-4 170 757)">E.V.</text>
    </g>`;
    // silhouettes in oval frames
    const sil = (cx, cy, rx, ry, beard) => `<g>
      <ellipse cx="${cx + 5}" cy="${cy + 8}" rx="${rx + 7}" ry="${ry + 7}" fill="#000" opacity="0.35"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx + 7}" ry="${ry + 7}" fill="#1f130c" ${K} stroke-width="2"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx + 4}" ry="${ry + 4}" fill="none" stroke="#b8893a" stroke-width="1.5" opacity="0.7"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#e2d6b8"/>
      <clipPath id="sil${cx}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>
      <g clip-path="url(#sil${cx})"><g transform="translate(${cx},${cy}) scale(${rx / 38})" fill="#15100c">
        ${beard
        ? `<path d="M-14,60 C-16,40 -20,30 -18,20 C-26,18 -28,8 -24,2 C-30,-4 -30,-10 -26,-12 C-30,-20 -28,-30 -22,-36 C-12,-46 10,-46 18,-34 C24,-24 22,-10 18,0 C22,14 18,26 8,30 C8,40 12,48 30,60 Z"/>`
        : `<path d="M-10,60 C-12,44 -14,32 -12,24 C-20,22 -22,14 -18,8 C-24,4 -24,-2 -20,-4 C-24,-12 -22,-22 -16,-28 C-18,-40 -8,-50 4,-48 C8,-58 22,-58 24,-46 C30,-40 28,-28 22,-22 C24,-10 20,4 12,16 C12,30 18,44 34,60 Z"/>`}
      </g></g></g>`;
    s += sil(160, 290, 38, 50, false) + sil(246, 350, 30, 40, true);
    // brass wall sconce (unlit) between clock & door
    s += `<g>
      <ellipse cx="572" cy="410" rx="30" ry="6" fill="#000" opacity="0.3"/>
      <path d="M560,330 C556,310 588,310 584,330 L582,380 C582,392 562,392 562,380 Z" fill="url(#gBrass)" ${K} stroke-width="1.6"/>
      <path d="M572,378 C572,392 560,396 556,404 H590 C586,396 574,392 574,378" fill="url(#gBrass)" ${K} stroke-width="1.4"/>
      <path d="M548,404 H598 C596,412 550,412 548,404 Z" fill="url(#gBrass)" ${K} stroke-width="1.4"/>
      <rect x="565" y="360" width="16" height="44" fill="#e9e0c4" ${K} stroke-width="1.4"/>
      <path d="M565,362 C565,370 569,372 568,380 M580,364 C580,372 577,376 578,384" stroke="#c9bd9c" stroke-width="2" fill="none"/>
      <path d="M573,360 l0,-8" stroke="${INK}" stroke-width="1.6"/>
    </g>`;
    // botanical plate (foxglove)
    s += `<g>${frameRect(1024, 196, 168, 222, 11)}
      <rect x="1035" y="207" width="146" height="200" fill="#dccfae"/>
      <rect x="1035" y="207" width="146" height="200" fill="url(#gPaperAge)"/>
      <rect x="1043" y="215" width="130" height="184" fill="none" stroke="#6a5a3a" stroke-width="0.8"/>
      <path d="M1106,378 C1104,330 1106,290 1112,236" stroke="#5a6a3a" stroke-width="2" fill="none"/>
      <path d="M1106,376 C1086,372 1070,360 1068,344 C1086,346 1100,358 1106,376 Z M1106,370 C1126,368 1144,356 1148,340 C1128,342 1112,354 1106,370Z" fill="#7d8a55" stroke="#4a5a2a" stroke-width="0.8"/>
      ${[0, 1, 2, 3, 4, 5, 6].map(i => { const y = 250 + i * 16, x = 1110 - i * 0.6, side = i % 2 ? 1 : -1; return `<path d="M${x},${y} c${side * 4},2 ${side * 14},6 ${side * 16},16 c${-side * 4},4 ${-side * 12},2 ${-side * 14},-6 Z" fill="#b0707a" stroke="#6a3a44" stroke-width="0.7"/><circle cx="${x + side * 10}" cy="${y + 12}" r="1" fill="#5a2a30"/>`; }).join('')}
      <path d="M1112,236 c-3,-6 -1,-10 2,-12" stroke="#5a6a3a" stroke-width="1.4" fill="none"/>
      <text x="1108" y="394" text-anchor="middle" font-family="'IM Fell English',Georgia,serif" font-style="italic" font-size="10" fill="#3a2a1c">Digitalis purpurea</text>
      <text x="1164" y="226" text-anchor="end" font-family="'IM Fell English',Georgia,serif" font-size="8" fill="#3a2a1c">Pl. XII</text>
    </g>`;
    // tripod side table with bell jar
    s += cshadow(1290, 796, 120, 12);
    s += `<g>
      <path d="M1290,752 C1270,770 1230,780 1206,792 M1290,752 C1310,770 1350,780 1374,792 M1290,752 C1292,772 1290,786 1292,800" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M1290,752 C1270,770 1230,780 1206,792 M1290,752 C1310,770 1350,780 1374,792 M1290,752 C1292,772 1290,786 1292,800" stroke="#5a3824" stroke-width="5.5" fill="none" stroke-linecap="round"/>
      <path d="M1282,608 H1298 C1296,640 1304,660 1300,690 C1308,710 1300,736 1296,756 H1284 C1280,736 1272,710 1280,690 C1276,660 1284,640 1282,608 Z" fill="url(#gLegWood)" ${K} stroke-width="1.8"/>
      <path d="M1186,600 C1186,612 1394,612 1394,600 V606 C1394,618 1186,618 1186,606 Z" fill="#3a2418" ${K} stroke-width="2"/>
      <ellipse cx="1290" cy="600" rx="104" ry="15" fill="#6f4529" ${K} stroke-width="2"/>
      <ellipse cx="1280" cy="597" rx="70" ry="7" fill="#9a6a45" opacity="0.3"/>
      <!-- lace doily -->
      <ellipse cx="1290" cy="598" rx="74" ry="10" fill="#d8ccb0" opacity="0.8"/>
      <ellipse cx="1290" cy="598" rx="74" ry="10" fill="none" stroke="#a89878" stroke-width="1" stroke-dasharray="3 3"/>
      <!-- jar base -->
      <path d="M1234,586 H1346 V594 C1346,600 1234,600 1234,594 Z" fill="#3a2418" ${K} stroke-width="1.6"/>
      <ellipse cx="1290" cy="586" rx="56" ry="7" fill="#5a3824" ${K} stroke-width="1.6"/>
      <!-- dried flowers -->
      <g stroke-linecap="round" fill="none">
        <path d="M1290,584 C1284,540 1270,500 1262,470 M1290,584 C1292,530 1296,490 1300,452 M1290,584 C1300,540 1318,506 1324,480 M1290,584 C1284,550 1284,520 1280,500 M1290,584 C1300,556 1306,530 1310,510" stroke="#6a6a44" stroke-width="1.6"/>
        <path d="M1262,470 l-8,-6 M1262,480 l8,-5 M1300,470 l-8,-5 M1324,480 l8,-6 M1280,510 l-8,-4" stroke="#7a7a50" stroke-width="3"/>
      </g>
      ${[[1262, 466, 9], [1300, 450, 11], [1324, 476, 8], [1280, 498, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#8e4a4a" stroke="#4a1e1e" stroke-width="1"/><path d="M${x - r * 0.5},${y} a${r * 0.5},${r * 0.5} 0 1,1 ${r * 0.5},${r * 0.5} a${r * 0.3},${r * 0.3} 0 1,1 -${r * 0.3},-${r * 0.35}" stroke="#5e2322" stroke-width="1" fill="none"/>`).join('')}
      ${Array.from({ length: 22 }, (_, i) => { const a = i * 2.4, rr = 8 + (i % 5) * 7; return `<circle cx="${r1(1306 + Math.cos(a) * rr)}" cy="${r1(520 + Math.sin(a) * rr * 0.8)}" r="1.8" fill="#e9e0c4" opacity="0.8"/>`; }).join('')}
      <path d="M1310,510 l4,-8 l3,6 l4,-7" stroke="#8a7aa0" stroke-width="2" fill="none"/>
      <!-- glass dome -->
      <path d="M1240,585 V470 C1240,404 1340,404 1340,470 V585" fill="url(#gGlass)" stroke="#cfe3ff" stroke-width="1.6" stroke-opacity="0.45"/>
      <path d="M1250,578 V474 C1250,440 1262,426 1276,420" stroke="#fff" stroke-width="4" opacity="0.18" fill="none" stroke-linecap="round"/>
      <path d="M1330,560 V480" stroke="#fff" stroke-width="2" opacity="0.12" stroke-linecap="round"/>
      <ellipse cx="1290" cy="421" rx="9" ry="5" fill="#cfe3ff" opacity="0.35" stroke="#cfe3ff" stroke-opacity="0.5"/>
    </g>`;
    // birdcage hanging from the purlin (sways gently)
    let bars = '';
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, x = 1410 + t * 100;
      if (x > 1446 && x < 1482) { bars += `<path d="M${r1(x)},330 V344 M${r1(x)},416 V430" stroke="#b8893a" stroke-width="1.6"/>`; }
      else bars += `<path d="M${r1(x)},300 V430" stroke="#b8893a" stroke-width="1.6"/>`;
      bars += `<path d="M${r1(x)},300 Q${r1(1460 + (x - 1460) * 0.9)},246 1460,244" stroke="#b8893a" stroke-width="1.4" fill="none"/>`;
    }
    s += `<g transform="translate(-130,-100)"><ellipse cx="1462" cy="897" rx="30" ry="4" fill="url(#gShadow)"/>
      <path d="M1450,894 C1460,886 1474,884 1482,890 C1472,892 1460,894 1450,894 Z" fill="#e9e0c4" opacity="0.8"/>
      <g class="rl-sway" style="transform-origin:1460px 42px">
      <path d="M1460,42 V236" stroke="#2a1d15" stroke-width="2" stroke-dasharray="5 3"/>
      <circle cx="1460" cy="240" r="6" fill="none" stroke="#b8893a" stroke-width="2.4"/>
      <g stroke="${INK}" stroke-width="4" fill="none" opacity="0.8"><path d="M1410,300 Q1414,248 1460,244 Q1506,248 1510,300"/></g>
      ${bars}
      <ellipse cx="1460" cy="300" rx="50" ry="5" fill="none" stroke="#b8893a" stroke-width="2.4"/>
      <ellipse cx="1460" cy="370" rx="50" ry="5" fill="none" stroke="#b8893a" stroke-width="1.6" opacity="0.8"/>
      <path d="M1406,430 H1514 L1508,440 H1412 Z" fill="url(#gBrass)" ${K} stroke-width="1.6"/>
      <path d="M1420,400 H1500" stroke="#7a4e30" stroke-width="3"/>
      <!-- open door swung outwards -->
      <path d="M1446,344 L1446,416 L1416,424 L1416,352 Z" fill="none" stroke="#e7c476" stroke-width="1.8"/>
      <path d="M1438,346 V418 M1430,348 V420 M1422,350 V422" stroke="#b8893a" stroke-width="1.2"/>
      <path d="M1446,344 H1482 M1446,416 H1482" stroke="#b8893a" stroke-width="1.8"/>
      </g></g>`;
    return s;
  }

  // ================================================================== EAST
  function eastDecor() {
    let s = '';
    // butterfly net leaning left of the cabinet
    s += `<ellipse cx="310" cy="796" rx="30" ry="5" fill="url(#gShadow)"/>
    <g>
      <path d="M302,796 L408,318" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
      <path d="M302,796 L408,318" stroke="#8a6a3a" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M300,790 L404,322" stroke="#c9a060" stroke-width="1.2" opacity="0.6"/>
      <path d="M372,290 C366,344 386,408 424,432 C446,420 458,372 462,258 C440,248 390,262 372,290 Z" fill="#e9e0c4" opacity="0.14"/>
      <path d="M372,290 C366,344 386,408 424,432 C446,420 458,372 462,258" fill="none" stroke="#e9e0c4" stroke-width="1.4" opacity="0.5"/>
      <path d="M388,280 C386,340 400,396 424,432 M406,270 C408,330 414,390 424,432 M426,262 C432,320 432,380 424,432 M444,258 C450,320 444,390 424,432 M376,320 C400,330 440,320 458,300 M382,360 C404,370 436,360 452,344 M396,398 C410,404 430,400 442,390" fill="none" stroke="#e9e0c4" stroke-width="0.7" opacity="0.3"/>
      <ellipse cx="417" cy="272" rx="46" ry="20" transform="rotate(-12 417 272)" fill="none" stroke="${INK}" stroke-width="6"/>
      <ellipse cx="417" cy="272" rx="46" ry="20" transform="rotate(-12 417 272)" fill="none" stroke="#b8893a" stroke-width="3"/>
    </g>`;
    // dried herb bundles hanging (upside-down) from the collar tie
    s += [[236, 140, ['#6a7a4a', '#7d8a55', '#5a6a3a'], 0], [322, 120, ['#7a6a8a', '#8a7aa0', '#6a5a4a'], 1]].map(([x, len, cols, lav]) => {
      const ty = 50 + len * 0.3;
      let g = `<path d="M${x},50 V${ty}" stroke="#8a7a5a" stroke-width="1.4"/>`;
      const rnd = rng(x);
      for (let i = 0; i < 13; i++) {
        const a = (i - 6) * 3.4 + (rnd() - 0.5) * 3, L = len * (0.55 + rnd() * 0.25);
        const ex = x + Math.sin(a * Math.PI / 180) * L, ey = ty + Math.cos(a * Math.PI / 180) * L;
        const c = cols[i % 3];
        g += `<path d="M${x},${ty} Q${r1(x + (ex - x) * 0.4)},${r1(ty + (ey - ty) * 0.5)} ${r1(ex)},${r1(ey)}" stroke="${c}" stroke-width="1.6" fill="none"/>`;
        for (let t = 0.45; t < 1.01; t += 0.11) {
          const px = x + (ex - x) * t, py = ty + (ey - ty) * t;
          g += lav ? `<ellipse cx="${r1(px)}" cy="${r1(py)}" rx="2.2" ry="3.4" fill="${c}"/>`
            : `<ellipse cx="${r1(px - 3)}" cy="${r1(py)}" rx="4.5" ry="1.8" transform="rotate(${r1(-30 + a)} ${r1(px - 3)} ${r1(py)})" fill="${c}"/><ellipse cx="${r1(px + 3)}" cy="${r1(py)}" rx="4.5" ry="1.8" transform="rotate(${r1(30 + a)} ${r1(px + 3)} ${r1(py)})" fill="${c}"/>`;
        }
      }
      g += `<path d="M${x - 7},${ty - 2} h14 v9 h-14 Z" fill="#a8845a" ${K} stroke-width="1"/><path d="M${x - 7},${ty + 2} h14" stroke="#5e2322" stroke-width="2"/>`;
      return `<g>${g}</g>`;
    }).join('');
    // stacked books on floor
    const book = (x, y, w, h, col, band, rot) => `<g transform="rotate(${rot || 0} ${x + w / 2} ${y + h / 2})">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${col}" ${K} stroke-width="1.8"/>
      <rect x="${x + w - 10}" y="${y + 3}" width="7" height="${h - 6}" fill="#e2d6b8" opacity="0.85"/>
      <path d="M${x + w - 9},${y + 6} H${x + w - 4} M${x + w - 9},${y + 10} H${x + w - 4}" stroke="#a89878" stroke-width="0.6"/>
      <path d="M${x + 14},${y + 2} V${y + h - 2} M${x + 20},${y + 2} V${y + h - 2}" stroke="${band}" stroke-width="1.6" opacity="0.8"/>
      <rect x="${x + 34}" y="${y + h / 2 - 5}" width="${Math.min(60, w - 70)}" height="10" fill="#120b07" opacity="0.35"/>
      <path d="M${x + 38},${y + h / 2} H${x + 30 + Math.min(60, w - 70)}" stroke="${band}" stroke-width="1" opacity="0.6"/>
      <path d="M${x + 2},${y + 3} H${x + w - 12}" stroke="#fff" stroke-width="1" opacity="0.15"/></g>`;
    s += cshadow(205, 797, 125, 12);
    s += book(104, 766, 206, 28, '#5e2322', '#e7c476') + book(114, 740, 184, 26, '#2f3b2c', '#b8893a') + book(108, 708, 196, 32, '#4a2f1f', '#e7c476')
      + book(122, 686, 170, 22, '#1f2b3a', '#b8893a') + book(116, 660, 180, 26, '#6b4a2a', '#e7c476') + book(136, 638, 150, 20, '#5e2322', '#b8893a', -4);
    // a candle stub in a saucer on the stack
    s += `<g><ellipse cx="236" cy="630" rx="22" ry="5" fill="url(#gBrass)" ${K} stroke-width="1.2"/>
      <rect x="228" y="596" width="16" height="34" fill="#e9e0c4" ${K} stroke-width="1.4"/>
      <path d="M229,600 c0,8 3,10 2,18" stroke="#c9bd9c" stroke-width="2" fill="none"/><path d="M236,596 l0,-7" stroke="${INK}" stroke-width="1.6"/></g>`;
    // specimen boxes on the wall (right)
    const specBox = (x, y, w, h, content) => `<g>${frameRect(x, y, w, h, 10, '#4a2f1f')}
      <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="#e2d8bd"/>
      ${content}
      <path d="M${x + 10},${y + 10} L${x + 50},${y + 10} L${x + 10},${y + 50}Z M${x + 70},${y + 10} L${x + 90},${y + 10} L${x + 10},${y + 90} L${x + 10},${y + 70}Z" fill="#fff" opacity="0.12"/>
      <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="none" stroke="#000" stroke-width="3" opacity="0.2"/></g>`;
    s += specBox(1170, 214, 206, 144,
      [[1220, 270, '#8a6a4a', 1], [1273, 262, '#a8b8a0', 1.15], [1326, 272, '#6a4a3a', 0.95], [1246, 322, '#c9b890', 0.8], [1302, 322, '#7a5a5a', 0.85]]
        .map(([x, y, c, k]) => `<g transform="translate(${x},${y}) scale(${k})"><line x1="0" y1="-10" x2="0" y2="4" stroke="#6e4d1c" stroke-width="1"/>${mothShape(c, '#2a1d15')}</g><rect x="${x - 10}" y="${y + 20 * k}" width="20" height="5" fill="#fff" stroke="#8a7a5a" stroke-width="0.4"/>`).join(''));
    s += specBox(1190, 392, 170, 124,
      [[1230, 432], [1265, 432], [1300, 432], [1330, 432], [1230, 474], [1265, 474], [1300, 474], [1330, 474]]
        .map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${5 + (i % 3)}" ry="${8 + (i % 2) * 2}" fill="${['#1f2b1f', '#2a1d15', '#3a4a2a', '#4a2a1a'][i % 4]}" stroke="${INK}" stroke-width="0.8"/><ellipse cx="${x - 1.5}" cy="${y - 3}" rx="1.5" ry="3" fill="#cfe3ff" opacity="0.5"/><path d="M${x - 5},${y - 3} l-4,-3 M${x + 5},${y - 3} l4,-3 M${x - 5},${y + 2} l-4,1 M${x + 5},${y + 2} l4,1" stroke="${INK}" stroke-width="0.7"/>`).join(''));
    // stacked specimen cases on the floor
    s += cshadow(1310, 797, 130, 12);
    const caseBox = (x, y, w, h) => `<g>
      <path d="M${x},${y} L${x + 14},${y - 10} H${x + w + 14} L${x + w},${y} Z" fill="#6f4529" ${K} stroke-width="1.6"/>
      <path d="M${x + w},${y} L${x + w + 14},${y - 10} V${y + h - 10} L${x + w},${y + h} Z" fill="#2a190f" ${K} stroke-width="1.6"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#5a3824" ${K} stroke-width="2"/>
      <line x1="${x}" y1="${y + 8}" x2="${x + w}" y2="${y + 8}" stroke="#2a190f" stroke-width="1.4"/>
      <rect x="${x + w / 2 - 34}" y="${y + h / 2 - 5}" width="68" height="14" fill="#d8c8a4" stroke="#6a5a3a" stroke-width="0.8"/>
      <text x="${x + w / 2}" y="${y + h / 2 + 5.5}" text-anchor="middle" font-family="'IM Fell English SC','IM Fell English',Georgia,serif" font-size="8.5" fill="#3a2a1c">LEPIDOPTERA</text>
      <rect x="${x + 16}" y="${y + 3}" width="12" height="10" fill="url(#gBrass)" stroke="${INK}" stroke-width="0.8"/><rect x="${x + w - 28}" y="${y + 3}" width="12" height="10" fill="url(#gBrass)" stroke="${INK}" stroke-width="0.8"/></g>`;
    s += caseBox(1196, 752, 220, 44) + caseBox(1214, 708, 186, 44);
    // knee-brace timber on the right
    s += `<path d="M1530,360 L1530,396 L1398,${TOP + 56} L1420,${TOP + 40} Z" fill="url(#gBeam)" ${K} stroke-width="2.2"/>
      <path d="M1528,366 L1414,${TOP + 46}" stroke="#9a6a45" stroke-width="1.4" opacity="0.45"/>
      <path d="M1530,396 L1398,${TOP + 56} L1400,${TOP + 70} L1530,410Z" fill="#000" opacity="0.25"/>`;
    return s;
  }

  // ================================================================== WEST
  function fern(cx, cy, seed) {
    const rnd = rng(seed);
    const fronds = [[-172, 150], [-150, 185], [-128, 205], [-108, 215], [-90, 205], [-72, 210], [-52, 200], [-30, 180], [-8, 150], [-140, 120], [-60, 130], [-100, 150]];
    const cols = ['#3f5a34', '#4f6b3f', '#36502e', '#5a7648'];
    let back = '', front = '';
    fronds.forEach(([deg, len], idx) => {
      const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
      const P0 = [cx, cy], P1 = [cx + dx * len * 0.55, cy + dy * len * 0.9 - len * 0.35], P2 = [cx + dx * len, cy + dy * len * 0.45 + len * 0.25];
      const col = cols[idx % cols.length];
      let s = `<path d="M${P0[0]},${P0[1]} Q${r1(P1[0])},${r1(P1[1])} ${r1(P2[0])},${r1(P2[1])}" stroke="#2e3f22" stroke-width="2" fill="none"/>`;
      for (let t = 0.12; t < 0.98; t += 0.055) {
        const u = 1 - t;
        const x = u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0], y = u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1];
        const tx = 2 * u * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]), ty = 2 * u * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
        const tl = Math.hypot(tx, ty), nx = -ty / tl, ny = tx / tl;
        const size = (1 - t) * 15 + 4;
        [-1, 1].forEach(sd => {
          const ex = x + nx * sd * size * 0.55 + tx / tl * size * 0.25, ey = y + ny * sd * size * 0.55 + ty / tl * size * 0.25;
          const ang = Math.atan2(ey - y, ex - x) * 180 / Math.PI;
          s += `<ellipse cx="${r1(ex)}" cy="${r1(ey)}" rx="${r1(size * 0.55)}" ry="${r1(size * 0.2)}" transform="rotate(${r1(ang)} ${r1(ex)} ${r1(ey)})" fill="${col}"/>`;
        });
      }
      s += `<path d="M${P0[0]},${P0[1]} Q${r1(P1[0])},${r1(P1[1])} ${r1(P2[0])},${r1(P2[1])}" stroke="#7a9a60" stroke-width="0.8" fill="none" opacity="${r1(0.3 + rnd() * 0.3)}"/>`;
      if (idx >= 9) back += s; else front += s;
    });
    return `<g opacity="0.8">${back}</g>${front}`;
  }

  function westDecor() {
    let s = '';
    // plaster reveal around the round window
    s += `<defs>${rad('gReveal', 800, 360, 272, [[0.8, '#6d6c5a'], [0.9, '#4d5044'], [0.97, '#2a2d25'], [1, '#1c1d18']])}</defs>
      <circle cx="800" cy="360" r="276" fill="#000" opacity="0.3"/>
      <circle cx="800" cy="360" r="272" fill="url(#gReveal)" ${K} stroke-width="3"/>
      <circle cx="800" cy="360" r="266" fill="none" stroke="#8a8a72" stroke-width="1.2" opacity="0.4"/>
      <path d="M560,280 C600,180 700,110 800,100" stroke="#9a9a80" stroke-width="6" fill="none" opacity="0.18" stroke-linecap="round"/>
      <circle cx="800" cy="360" r="232" fill="#0b1418"/>`;
    // sill
    s += `<path d="M546,598 H1054 L1066,612 H534 Z" fill="#6f4529" ${K} stroke-width="2"/>
      <rect x="534" y="612" width="532" height="10" fill="#3a2418" ${K} stroke-width="1.6"/>
      <line x1="548" y1="600.5" x2="1052" y2="600.5" stroke="#c08a5e" stroke-width="1.4" opacity="0.5"/>`;
    // window seat
    s += cshadow(800, 797, 300, 12);
    s += `<g>
      <rect x="520" y="672" width="560" height="120" fill="url(#gWalnut)" ${K} stroke-width="2.4"/>
      ${[536, 716, 896].map(x => `<rect x="${x}" y="690" width="168" height="84" fill="url(#gPanel)" ${K} stroke-width="1.4"/><path d="M${x + 2},772 V692 H${x + 166}" stroke="#a87650" stroke-width="1.2" fill="none" opacity="0.45"/>`).join('')}
      <rect x="512" y="662" width="576" height="14" fill="#6f4529" ${K} stroke-width="2"/>
      <line x1="514" y1="665" x2="1086" y2="665" stroke="#c08a5e" stroke-width="1.4" opacity="0.5"/>
      <path d="M528,662 C522,640 530,630 548,630 H1052 C1070,630 1078,640 1072,662 Z" fill="#2c4a48" ${K} stroke-width="2.2"/>
      <path d="M540,636 H1060" stroke="#5d8a82" stroke-width="3" opacity="0.4"/>
      ${[600, 680, 760, 840, 920, 1000].map(x => `<path d="M${x - 14},646 L${x},650 L${x + 14},646 M${x},640 V650" stroke="#15282a" stroke-width="1" fill="none"/><circle cx="${x}" cy="648" r="2.6" fill="#15282a"/><circle cx="${x - 0.8}" cy="647.2" r="0.8" fill="#8fb3d9" opacity="0.5"/>`).join('')}
      <!-- pillows -->
      <path d="M562,628 C556,614 566,610 590,612 L650,614 C668,614 670,624 664,634 C668,650 660,660 640,658 L580,654 C560,652 556,642 562,628 Z" fill="#a35a5a" ${K} stroke-width="2"/>
      <path d="M578,622 C600,628 630,628 652,624" stroke="#c98a7a" stroke-width="1.2" fill="none" opacity="0.6"/>
      <path d="M560,628 l-8,-4 M562,646 l-8,4 M664,630 l8,-4 M660,650 l8,4" stroke="#e7c476" stroke-width="2"/>
      <path d="M946,630 C942,616 952,612 970,613 L1030,616 C1046,617 1048,626 1044,636 C1048,652 1040,660 1022,658 L964,655 C946,654 940,644 946,630 Z" fill="#d8ccb0" ${K} stroke-width="2"/>
      <g transform="translate(996,636) scale(0.7)">${mothShape('#8a7a5a', '#5a4a30', 0.8)}</g>
    </g>`;
    // fern in terracotta pot
    s += cshadow(1204, 796, 70, 9);
    s += fern(1204, 726, 5);
    s += `<g>
      <path d="M1154,734 H1254 L1244,794 H1164 Z" fill="#9a5a3a" ${K} stroke-width="2"/>
      <path d="M1164,740 L1172,790" stroke="#c07a52" stroke-width="3" opacity="0.4"/>
      <rect x="1146" y="720" width="116" height="18" rx="2" fill="#a86440" ${K} stroke-width="2"/>
      <path d="M1150,724 H1258" stroke="#d08a60" stroke-width="1.4" opacity="0.5"/>
      <path d="M1190,760 c10,8 24,4 30,14" stroke="#4a5a3a" stroke-width="3" opacity="0.35" fill="none"/>
    </g>`;
    // braided rag rug
    s += `<g>
      ${[[320, 44, '#3b2a22'], [304, 41, '#5e2322'], [288, 38, '#6a5a4a'], [270, 35, '#3e4b3c'], [250, 32, '#8a6a4a'], [228, 28, '#5e2322'], [204, 25, '#56634f'], [176, 21, '#6a5a4a'], [140, 17, '#a35a5a'], [96, 12, '#8a6a4a']]
        .map(([rx, ry, c]) => `<ellipse cx="800" cy="858" rx="${rx}" ry="${ry}" fill="${c}"/><ellipse cx="800" cy="858" rx="${rx - 4}" ry="${ry - 0.6}" fill="none" stroke="#000" stroke-width="1" opacity="0.25" stroke-dasharray="4 3"/>`).join('')}
    </g>`;
    // sheet-draped dress form (left) — uncanny
    s += cshadow(300, 800, 90, 10);
    const SHEET = "M300,318 C318,318 334,330 346,344 C372,354 388,372 391,398 C397,452 399,522 410,592 C414,622 420,650 414,668 C408,660 402,664 396,672 C390,664 382,660 374,668 C366,676 358,672 352,664 C344,672 334,674 326,666 C318,672 312,666 308,656 C302,612 298,570 292,548 C278,552 256,548 240,540 C232,536 228,532 226,526 C222,474 214,434 214,400 C216,372 230,356 254,344 C266,330 282,318 300,318 Z";
    s += `<defs>${lin('gSheet', 214, 0, 420, 0, [[0, '#8e8876'], [0.3, '#b3ab94'], [0.55, '#aaa28b'], [0.8, '#8f8772'], [1, '#6e6856']])}
      ${lin('gSheetV', 0, 318, 0, 680, [[0, '#fff', 0.12], [0.4, '#000', 0], [1, '#000', 0.28]])}</defs>
      <g opacity="0.22"><path d="${SHEET}" transform="translate(30,14)" fill="#000" opacity="0.35"/><path d="${SHEET}" transform="translate(24,10)" fill="#000" opacity="0.4"/><path d="${SHEET}" transform="translate(18,6)" fill="#000" opacity="0.5"/></g>
      <g>
      <path d="M300,560 V788" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M300,560 V788" stroke="#5a3824" stroke-width="6"/>
      <path d="M300,760 L246,796 M300,760 L354,796 M300,760 L304,802" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
      <path d="M300,760 L246,796 M300,760 L354,796 M300,760 L304,802" stroke="#5a3824" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M244,540 C240,552 240,560 242,568 H358 C362,556 360,546 356,538 Z" fill="#8a7e64" ${K} stroke-width="2"/>
      <!-- the sheet, thrown over the whole form: a headless, shrouded figure -->
      <path d="${SHEET}" fill="url(#gSheet)" ${K} stroke-width="2.2"/>
      <path d="${SHEET}" fill="url(#gSheetV)"/>
      <g fill="#4a4436" opacity="0.28">
        <path d="M322,352 C344,420 352,500 360,600 C364,630 366,650 360,670 C352,620 344,560 336,500 C330,450 324,400 316,356 Z"/>
        <path d="M348,362 C372,430 380,520 388,620 C390,640 392,655 390,668 C382,620 374,540 364,470 C360,430 354,396 344,368 Z"/>
        <path d="M280,344 C266,400 258,460 258,530 C252,470 252,410 268,350 Z"/>
        <path d="M302,350 C304,420 306,500 314,600 C316,630 316,648 312,664 C306,620 300,540 298,470 C296,420 296,380 298,352 Z"/>
      </g>
      <path d="M316,350 C338,424 346,504 354,610 M340,360 C364,430 372,520 380,630" stroke="#d8d0b8" stroke-width="2" fill="none" opacity="0.35"/>
      <path d="M300,318 C290,322 286,332 288,340 C296,336 306,336 314,340 C314,330 310,322 300,318 Z" fill="#c8c0a8" opacity="0.8"/>
      <path d="M292,548 C300,544 306,548 308,558" stroke="#6a6250" stroke-width="1.2" fill="none" opacity="0.6"/>
    </g>`;
    // shelf with specimen jars (right, high)
    const jar = (x, w, h, fillC, inner) => `<g>
      <rect x="${x}" y="${330 - h}" width="${w}" height="${h}" rx="5" fill="${fillC}" fill-opacity="0.35" stroke="#cfe3ff" stroke-opacity="0.45" stroke-width="1.4"/>
      ${inner}
      <rect x="${x - 2}" y="${330 - h - 10}" width="${w + 4}" height="11" rx="2" fill="#a8845a" ${K} stroke-width="1.2"/>
      <path d="M${x + 5},${330 - h + 6} V${324}" stroke="#fff" stroke-width="3" opacity="0.22" stroke-linecap="round"/></g>`;
    s += `<g>
      <path d="M1170,340 l0,26 l18,-26 Z M1360,340 l0,26 l-18,-26 Z" fill="#3a2418" ${K} stroke-width="1.6"/>
      <rect x="1150" y="330" width="224" height="12" fill="url(#gBeam)" ${K} stroke-width="2"/>
      <rect x="1150" y="342" width="224" height="12" fill="url(#gRailShadow)"/>
      ${jar(1168, 48, 76, '#8fb3d9', `<path d="M1192,300 C1180,306 1182,322 1192,326 C1202,322 1204,306 1192,300 Z" fill="#b5a888" stroke="#6a5a3a" stroke-width="0.8"/><path d="M1186,308 H1198 M1185,314 H1199 M1186,320 H1198" stroke="#6a5a3a" stroke-width="0.6"/><path d="M1192,300 V284" stroke="#6a5a3a" stroke-width="0.8"/>`)}
      ${jar(1228, 40, 56, '#a8d8b0', `<path d="M1234,326 C1240,310 1256,314 1262,326 Z" fill="#6a5a3a" opacity="0.8"/>`)}
      ${jar(1280, 56, 90, '#cfe3ff', `<path d="M1296,326 l6,-20 l4,20 M1310,326 l3,-30 l5,30 M1322,326 l4,-16 l2,16" stroke="#8a7a5a" stroke-width="1.6" fill="none"/>`)}
      ${jar(1348, 44, 62, '#e9e0c4', `${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${1358 + (i % 3) * 12}" cy="${320 - ((i / 3) | 0) * 11}" r="5" fill="#e9e0c4" opacity="0.8"/>`).join('')}`)}
    </g>`;
    return s;
  }

  // ================================================================== LIGHTING
  // per wall: where the moon & lamp read from, plus extra shapes
  function rainStreaks(seed, x, y, w, h, n, op, rx) {
    // seamless looping column of very soft elongated shadow ripples (black inside screen groups = rain shadows)
    const rnd = rng(seed);
    let blobs = '';
    for (let i = 0; i < n; i++) {
      const lx = x + rnd() * w, ly = y + rnd() * h, ry = 16 + rnd() * 34, rxx = 3 + rnd() * 5;
      const o = r1(op * (0.35 + rnd() * 0.65) * 10) / 10;
      const ang = r1(Math.atan2(-rx, h) * 180 / Math.PI);
      const one = (oy) => `<ellipse cx="${r1(lx)}" cy="${r1(ly + oy)}" rx="${r1(rxx)}" ry="${r1(ry)}" transform="rotate(${ang} ${r1(lx)} ${r1(ly + oy)})" fill="url(#gRipple)" opacity="${o}"/>`;
      blobs += one(0) + one(-h);
    }
    return `<g class="rl-rain" style="--rx:${-rx}px;--ry:${h}px;--rd:${(h / 170).toFixed(2)}s">${blobs}</g>`;
  }
  function drips(seed, x, y, w, n) {
    const rnd = rng(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const dx = x + rnd() * w, dy = y + rnd() * 60;
      s += `<g class="rl-drip" style="--rd:${(6 + rnd() * 7).toFixed(1)}s;--dl:${(-rnd() * 10).toFixed(1)}s;--ry:${(120 + rnd() * 140) | 0}px;--rx:${((rnd() - 0.5) * 16) | 0}px"><ellipse cx="${r1(dx)}" cy="${r1(dy)}" rx="3.2" ry="5" fill="#000" opacity="0.55"/><path d="M${r1(dx)},${r1(dy - 5)} l0,-26" stroke="#000" stroke-width="2" opacity="0.3"/></g>`;
    }
    return s;
  }
  function motes(seed, n, box, grad, sizeK) {
    const rnd = rng(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = box[0] + rnd() * box[2], y = box[1] + rnd() * box[3], r = (1.4 + rnd() * 2.6) * (sizeK || 1);
      const d = 10 + rnd() * 12;
      s += `<circle class="rl-mote" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="url(#${grad})" style="--d:${d.toFixed(1)}s;--dl:${(-rnd() * d).toFixed(1)}s;--dx:${((rnd() - 0.5) * 120) | 0}px;--dy:${((rnd() - 0.3) * 90) | 0}px;--wx:${((rnd() - 0.5) * 40) | 0}px;--o:${(0.35 + rnd() * 0.6).toFixed(2)}"/>`;
    }
    return s;
  }

  // soft-edged ("feathered") polygon: n stacked copies grown about the centroid
  function feather(pts, fill, n, grow) {
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    let s = '';
    for (let i = 0; i < n; i++) {
      const k = 1 + grow * (i / (n - 1) - 0.35);
      s += `<polygon points="${pts.map(([x, y]) => `${r1(cx + (x - cx) * k)},${r1(cy + (y - cy) * k)}`).join(' ')}" fill="${fill}" opacity="${(1.6 / n).toFixed(3)}"/>`;
    }
    return s;
  }
  const polyStr = (pts, k) => {
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    return pts.map(([x, y]) => `${r1(cx + (x - cx) * k)},${r1(cy + (y - cy) * k)}`).join(' ');
  };
  // shadow of the round window's wheel tracery (black strokes: used inside screen groups)
  function wheel(cx, cy, sx, sy, rot, sw) {
    const ns = 'vector-effect="non-scaling-stroke"';
    let s = `<g transform="translate(${cx},${cy}) rotate(${rot}) scale(${sx},${sy})" fill="none" stroke="#000" stroke-width="${sw}">`;
    s += `<circle r="62" ${ns}/><circle r="26" ${ns}/><circle r="100" stroke-width="${sw * 1.6}" ${ns}/>`;
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 + 15) * Math.PI / 180;
      s += `<line x1="${r1(Math.cos(a) * 26)}" y1="${r1(Math.sin(a) * 26)}" x2="${r1(Math.cos(a) * 100)}" y2="${r1(Math.sin(a) * 100)}" ${ns}/>`;
    }
    return s + '</g>';
  }
  const WIN_MASK = `<mask id="winMask_w" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">
      <rect width="1600" height="900" fill="url(#winMaskG_w)"/></mask>
      ${rad('winMaskG_w', 800, 360, 262, [[0.84, '#000'], [0.95, '#fff']])}`;

  const N_SHAFT = [[0, 120], [60, 150], [640, 900], [150, 900], [0, 560]];
    const LIGHT = {
    south: {
      cold: rad('lc_s', 1700, 300, 1500, [[0, '#9fb6c6'], [0.45, '#7a92a4'], [1, '#43566a']]),
      warm: rad('lw_s', 900, 400, 1150, [[0, '#fff8ec'], [0.22, '#f6e2c2'], [0.5, '#c8a888'], [0.8, '#7d7478'], [1, '#4d5160']]),
      soft: rad('ls_s', 900, 420, 760, [[0, '#ffb760', 0.95], [0.45, '#ff9a40', 0.5], [1, '#ff9a40', 0]]),
      glow: `${rad('lg_s', 900, 390, 280, [[0, '#ffe2a0', 0.55], [0.35, '#ffb050', 0.22], [1, '#e0853a', 0]])}
             ${rad('lg2_s', 900, 580, 420, [[0, '#ffcf7a', 0.35], [1, '#ffcf7a', 0]], 'gradientTransform="translate(900 580) scale(1 0.2) translate(-900 -580)"')}`,
      glowShapes: `<rect x="620" y="110" width="560" height="560" fill="url(#lg_s)"/><rect x="480" y="500" width="840" height="160" fill="url(#lg2_s)"/>`,
      // the moonbeam itself is drawn by window.js; here only a faint cool ambient from the right
      coldExtra: `<rect x="60" y="100" width="440" height="420" fill="url(#lcx_s)" style="mix-blend-mode:multiply"/>`,
      lampMask: 'lampMask_s',
      lampDefs: `${rad('lcx_s', 280, 300, 230, [[0, '#76828f'], [0.6, '#a4b0bb'], [1, '#fff']], 'gradientTransform="translate(280 300) scale(1 0.95) translate(-280 -300)"')}<mask id="lampMask_s" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900"><rect width="1600" height="900" fill="url(#lampMaskG_s)"/></mask>
        ${rad('lampMaskG_s', 900, 465, 170, [[0.35, '#2a2a2a'], [1, '#fff']], 'gradientTransform="translate(900 465) scale(0.62 1) translate(-900 -465)"')}`,
      moonMask: 'projMask_s',
      moon: `<mask id="projMask_s" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900"><rect width="1600" height="900" fill="url(#projMaskG_s)"/></mask>
        ${rad('projMaskG_s', 800, 225, 470, [[0.8, '#000'], [1, '#fff']], 'gradientTransform="translate(800 225) scale(1 0.34) translate(-800 -225)"')}` + rad('lm2_s', 1700, 250, 900, [[0, '#8fb3d9', 0.16], [1, '#8fb3d9', 0]]),
      moonShapes: `<rect width="1600" height="900" fill="url(#lm2_s)"/>`,
      motesW: [31, 30, [620, 180, 560, 440], 'gMoteW'],
      motesC: [32, 18, [980, 200, 520, 380], 'gMoteC'],
    },
    north: {
      cold: rad('lc_n', -200, 330, 1600, [[0, '#a3b9c9'], [0.45, '#7890a2'], [1, '#43566a']]),
      warm: rad('lw_n', 800, 1050, 1150, [[0, '#ffe6bf'], [0.35, '#e0bc94'], [0.7, '#a08070'], [1, '#5a5058']]),
      softExtra: `<rect width="1600" height="900" fill="#ff9a40" opacity="0.16"/>`,
      soft: rad('ls_n', 800, 980, 950, [[0, '#ffa040', 1], [0.5, '#ff9a40', 0.5], [1, '#ff9a40', 0.05]]),
      glow: rad('lg_n', 800, 1040, 760, [[0, '#ffcf7a', 0.34], [1, '#ffcf7a', 0]]) + rad('lf_n', 800, 910, 700, [[0, '#ffb45c', 0.42], [0.6, '#ffa040', 0.1], [1, '#ffa040', 0]], 'gradientTransform="translate(800 910) scale(1 0.2) translate(-800 -910)"'),
      noFlick: true,
      glowShapes: `<rect x="0" y="280" width="1600" height="620" fill="url(#lg_n)"/><rect x="100" y="780" width="1400" height="120" fill="url(#lf_n)"/>`,
      moon: `${rad('lm2_n', -150, 300, 950, [[0, '#8fb3d9', 0.3], [1, '#8fb3d9', 0]])}
             ${lin('lm_n', 0, 150, 420, 900, [[0, '#cfe3ff', 0.24], [0.6, '#a8c6ea', 0.12], [1, '#8fb3d9', 0.08]])}
             ${rad('lp_n', 340, 856, 250, [[0, '#dcebff', 0.3], [0.6, '#cfe3ff', 0.18], [1, '#cfe3ff', 0]], 'gradientTransform="translate(340 856) scale(1 0.17) translate(-340 -856)"')}
             <clipPath id="lmc_n"><polygon points="${polyStr(N_SHAFT, 0.85)}"/></clipPath>`,
      moonShapes: `<rect width="1600" height="900" fill="url(#lm2_n)"/>
             ${feather(N_SHAFT, 'url(#lm_n)', 7, 0.45)}
             <clipPath id="lmcw_n"><rect x="0" y="0" width="1600" height="585"/></clipPath><g clip-path="url(#lmc_n)"><g clip-path="url(#lmcw_n)">${rainStreaks(22, -100, 120, 800, 620, 30, 0.3, -70)}</g></g>
             <rect x="60" y="800" width="560" height="100" fill="url(#lp_n)"/>`,
      motesW: [33, 10, [300, 520, 1000, 300], 'gMoteW'],
      motesC: [34, 22, [40, 220, 520, 560], 'gMoteC'],
    },
    east: {
      cold: rad('lc_e', 720, 330, 1300, [[0, '#b3c7d4'], [0.35, '#8aa1b2'], [1, '#43566a']]),
      warm: rad('lw_e', 1800, 560, 1750, [[0, '#ffe2b8'], [0.3, '#dcbc98'], [0.65, '#958a88'], [1, '#52525e']]),
      softExtra: `<rect width="1600" height="900" fill="url(#lsx_e)"/>`,
      soft: rad('ls_e', 1800, 560, 1250, [[0, '#ffa040', 0.9], [0.45, '#ff9a40', 0.4], [0.8, '#ff9a40', 0.08], [1, '#ff9a40', 0]]) + lin('lsx_e', 0, 0, 1600, 0, [[0, '#ff9a40', 0], [0.4, '#ff9a40', 0.06], [1, '#ff9a40', 0.4]]),
      glow: rad('lg_e', 1800, 560, 700, [[0, '#ffcf7a', 0.26], [1, '#ffcf7a', 0]]) + rad('lf_e', 1600, 880, 760, [[0, '#ffb45c', 0.32], [0.6, '#ffa040', 0.1], [1, '#ffa040', 0]], 'gradientTransform="translate(1600 880) scale(1 0.16) translate(-1600 -880)"'),
      glowShapes: `<rect x="1100" y="0" width="500" height="900" fill="url(#lg_e)"/><rect x="840" y="790" width="760" height="110" fill="url(#lf_e)"/>`,
      // the round window's light falls across this wall & the cabinet
      moonBase: rad('lp_e', 1200, 330, 180, [[0, '#cfe3ff', 0.22], [0.72, '#a8c6ea', 0.16], [1, '#8fb3d9', 0]], 'gradientTransform="translate(1200 330) rotate(-8) scale(0.84 1) translate(-1200 -330)"'),
      moonBaseShapes: `<rect x="1000" y="130" width="400" height="400" fill="url(#lp_e)"/>
             <clipPath id="lpc_e"><ellipse cx="1200" cy="330" rx="140" ry="165" transform="rotate(-8 1200 330)"/></clipPath>
             <g clip-path="url(#lpc_e)">${rainStreaks(23, 1070, 160, 260, 360, 18, 0.35, 30)}${drips(24, 1090, 190, 220, 4)}</g>`,
      moon: `${rad('lm2_e', 800, 900, 1200, [[0, '#8fb3d9', 0.14], [1, '#8fb3d9', 0]])}${rad('lm3_e', 1200, 330, 300, [[0, '#cfe3ff', 0.14], [1, '#cfe3ff', 0]])}`,
      moonShapes: `<rect width="1600" height="900" fill="url(#lm2_e)"/><rect width="1600" height="900" fill="url(#lm3_e)"/>
             <rect x="1000" y="130" width="400" height="400" fill="url(#lp_e)"/>`,
      motesW: [35, 14, [1150, 250, 400, 450], 'gMoteW'],
      motesC: [36, 22, [1070, 170, 260, 330], 'gMoteC'],
    },
    west: {
      mask: 'winMask_w',
      cold: WIN_MASK + rad('lc_w', 800, 360, 1000, [[0.2, '#e6eef4'], [0.3, '#bccbd6'], [0.55, '#8499aa'], [1, '#43566a']]),
      warm: rad('lw_w', -250, 600, 1750, [[0, '#dcc0a0'], [0.25, '#bfa48c'], [0.55, '#98989e'], [1, '#56607a']]),
      soft: rad('ls_w', -250, 600, 900, [[0, '#ff9a40', 0.55], [0.4, '#ff9a40', 0.25], [1, '#ff9a40', 0]]),
      glow: rad('lg_w', -200, 600, 520, [[0, '#ffcf7a', 0.14], [1, '#ffcf7a', 0]]),
      glowShapes: `<rect x="0" y="0" width="450" height="900" fill="url(#lg_w)"/>`,
      moonBase: rad('lp_w', 800, 360, 480, [[0.45, '#8fb3d9', 0.16], [1, '#8fb3d9', 0]]),
      moonBaseShapes: `<rect width="1600" height="900" fill="url(#lp_w)"/>`,
      moon: `${rad('lm2_w', 800, 360, 720, [[0.3, '#cfe3ff', 0.2], [1, '#cfe3ff', 0]])}
             ${rad('lb_w', 770, 640, 470, [[0, '#9cc0ea', 0.26], [0.55, '#8fb3d9', 0.1], [1, '#8fb3d9', 0]], 'gradientTransform="translate(770 640) scale(1 0.72) translate(-770 -640)"')}
             ${rad('lp2_w', 720, 860, 360, [[0, '#dcebff', 0.34], [0.6, '#cfe3ff', 0.14], [1, '#cfe3ff', 0]], 'gradientTransform="translate(720 860) scale(1 0.13) translate(-720 -860)"')}
             ${lin('ltop_w', 0, 628, 0, 672, [[0, '#cfe3ff', 0.3], [1, '#cfe3ff', 0]])}`,
      moonShapes: `<rect width="1600" height="900" fill="url(#lm2_w)"/>
             <rect width="1600" height="900" fill="url(#lb_w)"/>
             <rect x="300" y="800" width="840" height="100" fill="url(#lp2_w)"/>
             <path d="M530,632 H1070 L1072,664 H528 Z" fill="url(#ltop_w)"/>`,
      motesW: [37, 10, [80, 300, 500, 450], 'gMoteW'],
      motesC: [38, 30, [480, 520, 560, 330], 'gMoteC'],
    },
  };

  function lightingMarkup(w) {
    const c = LIGHT[w], id = w[0];
    const m = c.mask ? ` mask="url(#${c.mask})"` : '';
    const lm = c.lampMask ? ` mask="url(#${c.lampMask})"` : m;
    return `<defs>${c.lampDefs || ''}${c.cold}${c.warm}${c.soft}${c.glow}${c.moonBase || ''}${c.moon}</defs>
      <g class="rl-cold rl-fade" style="mix-blend-mode:multiply"><rect width="1600" height="900" fill="url(#lc_${id})"${m}/>${c.coldExtra || ''}</g>
      <g class="rl-warm rl-fade" style="mix-blend-mode:multiply;opacity:0"><rect width="1600" height="900" fill="url(#lw_${id})"${m}/></g>
      <g class="rl-soft rl-fade" style="mix-blend-mode:soft-light;opacity:0"><g${lm}><rect width="1600" height="900" fill="url(#ls_${id})"/>${c.softExtra || ''}</g></g>
      <g class="rl-glow rl-fade" style="mix-blend-mode:screen;opacity:0"><g class="${c.noFlick ? '' : 'rl-flick2'}"${lm}>${c.glowShapes}</g></g>
      ${c.moonBaseShapes ? `<g class="rl-moonbase rl-fade" style="mix-blend-mode:screen"><g${m}>${c.moonBaseShapes}</g></g>` : ''}
      <g class="rl-moon rl-fade" style="mix-blend-mode:screen;opacity:0"><g${c.moonMask ? ` mask="url(#${c.moonMask})"` : m}>${c.moonShapes}</g></g>
      <g class="rl-motesC rl-fade" style="opacity:0.5">${motes(c.motesC[0], c.motesC[1], c.motesC[2], c.motesC[3])}</g>
      <g class="rl-motesW rl-fade" style="opacity:0">${motes(c.motesW[0], c.motesW[1], c.motesW[2], c.motesW[3], 1.2)}</g>`;
  }

  // ================================================================== registration
  const state = {};
  const DECOR = { north: northDecor, east: eastDecor, south: () => southDecor() + portrait() + desk(), west: westDecor };
  const SEEDS = { north: 11, east: 23, south: 37, west: 41 };
  const STAINS = {
    north: stain(1180, TOP + 8, 120, 110) + stain(760, TOP + 8, 60, 50),
    east: stain(1180, 20, 90, 140),
    south: stain(210, TOP + 8, 90, 70),
    west: stain(1250, 60, 70, 120),
  };

  function setOp(el, v, anim) {
    if (!el) return;
    el.style.transition = anim ? '' : 'none';
    el.style.opacity = v;
  }
  function applyLight(w) {
    const st = state[w];
    if (!st || !st.top) return;
    const lit = !!G.get('lampLit'), open = !!G.get('windowOpen');
    const key = (lit ? 1 : 0) + (open ? 2 : 0);
    if (st.key === key) return;
    const anim = st.key != null && document.body.dataset.ready === '1' && G.view() === w;
    st.key = key;
    const q = c => st.top.querySelector('.' + c);
    setOp(q('rl-cold'), lit ? 0 : 1, anim);
    setOp(q('rl-warm'), lit ? 1 : 0, anim);
    setOp(q('rl-soft'), lit ? 1 : 0, anim);
    setOp(q('rl-glow'), lit ? 1 : 0, anim);
    setOp(q('rl-moon'), open ? 1 : 0, anim);
    setOp(q('rl-moonbase'), lit && !open ? 0.85 : 1, anim);
    setOp(q('rl-motesW'), lit ? 1 : 0, anim);
    setOp(q('rl-motesC'), open ? 1 : (lit ? 0.3 : 0.55), anim);
    st.top.querySelectorAll('.rl-flick,.rl-flick2').forEach(e => e.classList.toggle('on', lit));
  }

  // second-look detail: after the lamp is lit, the moth drawn on Edith's pinned sketch is gone the next
  // time you face south — only its faint impression and an empty specimen pin remain.
  let sketchGone = false;
  function updateSketch(leaving) {
    if (!sketchGone && G.get('lampLit') && (leaving || G.view() !== 'south' || document.body.dataset.ready !== '1')) sketchGone = true;
    const b = state.south && state.south.base;
    if (!b) return;
    const m = b.querySelector('.sk-moth'), g = b.querySelector('.sk-gone'), dd = b.querySelector('.sk-dust');
    if (dd) dd.style.display = sketchGone ? '' : 'none';
    if (m) m.style.display = sketchGone ? 'none' : '';
    if (g) g.style.display = sketchGone ? '' : 'none';
  }

  // portrait: her eyes follow the cursor with a slow, lagging catch-up, and she very rarely blinks
  const eyes = { on: false, tx: 0, ty: 0, x: 0, y: 0, raf: 0, last: 0, blinkT: 0, handler: null };
  function eyesFrame(now) {
    if (!eyes.on) return;
    const dt = Math.min(100, now - (eyes.last || now)); eyes.last = now;
    const idle = now - (eyes.moved || 0) > 7000;   // cursor still for a while: her gaze drifts back to you
    const k = 1 - Math.exp(-dt / (idle ? 1400 : 380));   // ~400ms lag while following
    const gx = idle ? 0 : eyes.tx, gy = idle ? 0 : eyes.ty;
    eyes.x += (gx - eyes.x) * k; eyes.y += (gy - eyes.y) * k;
    const t = `translate(${eyes.x.toFixed(2)},${eyes.y.toFixed(2)})`;
    const Lg = document.getElementById('edithEyeL'), Rg = document.getElementById('edithEyeR');
    if (Lg) { Lg.setAttribute('transform', t); Rg.setAttribute('transform', t); }
    eyes.raf = requestAnimationFrame(eyesFrame);
  }
  function scheduleBlink() {
    clearTimeout(eyes.blinkT);
    eyes.blinkT = setTimeout(() => {
      if (!eyes.on || G.view() !== 'south') return;
      const lids = document.querySelectorAll('#edithPortrait .edith-lid');
      G.tween(420, (e, t) => {
        const k = t < 0.45 ? t / 0.45 : Math.max(0, 1 - (t - 0.55) / 0.45);
        const v = Math.min(1, k).toFixed(3);
        lids.forEach(l => l.setAttribute('transform', `translate(0,-29.5) scale(1,${v}) translate(0,29.5)`));
      }, 'linear').then(scheduleBlink);
    }, 40000 + Math.random() * 50000);
  }
  function eyesOn() {
    const stage = document.getElementById('stage');
    if (!stage || eyes.on) return;
    eyes.on = true; eyes.last = 0;
    eyes.handler = (e) => {
      if (G.view() !== 'south') return;
      const p = G.toStage(e);
      const dx = p.x - 1275, dy = p.y - 275, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 320);
      eyes.tx = dx / d * 3.6 * k; eyes.ty = dy / d * 1.3 * k; eyes.moved = performance.now();
    };
    stage.addEventListener('mousemove', eyes.handler);
    eyes.raf = requestAnimationFrame(eyesFrame);
    scheduleBlink();
  }
  function eyesOff() {
    const stage = document.getElementById('stage');
    if (stage && eyes.handler) stage.removeEventListener('mousemove', eyes.handler);
    eyes.on = false; eyes.handler = null;
    cancelAnimationFrame(eyes.raf); clearTimeout(eyes.blinkT);
  }
  ART.blinkEdith = () => { const lids = document.querySelectorAll('#edithPortrait .edith-lid'); return G.tween(420, (e, t) => { const k = t < 0.45 ? t / 0.45 : Math.max(0, 1 - (t - 0.55) / 0.45); lids.forEach(l => l.setAttribute('transform', `translate(0,-29.5) scale(1,${Math.min(1, k).toFixed(3)}) translate(0,29.5)`)); }, 'linear').then(() => { if (eyes.on) scheduleBlink(); }); };

  G.WALLS.forEach(w => {
    state[w] = { key: null };
    G.registerWallBase(w, {
      build(g) {
        injectCSS();
        ensureGrade();
        state[w].base = g;
        G.svg(shell(w, SEEDS[w], STAINS[w]) + DECOR[w](), g);
      },
      buildTop(g) {
        state[w].top = g;
        G.svg(lightingMarkup(w), g);
        applyLight(w);
      },
      update() { applyLight(w); if (w === 'south') updateSketch(false); },
      enter() {
        const st = state[w];
        [st.base, st.top].forEach(e => e && e.classList.remove('rl-paused'));
        if (w === 'south') eyesOn();
      },
      exit() {
        const st = state[w];
        [st.base, st.top].forEach(e => e && e.classList.add('rl-paused'));
        if (w === 'south') { eyesOff(); updateSketch(true); }
      },
    });
  });

  window.ART = window.ART || {};
  ART.room = {
    rebuildGrade() { const g = document.getElementById('roomGrade'); if (g) g.remove(); ensureGrade(); },
  };
})();

// ---- look-at captions for the room's decor (lowest wall layer, so every puzzle hotspot stays on top)
(function () {
  'use strict';
  const LOOKS = {
    north: [
      [120, 225, 170, 180, 'Two paper silhouettes: a man with a clockmaker’s loupe, and a girl with a ribbon in her hair. Father and Edith, years ago.'],
      [540, 300, 70, 115, 'A wall sconce. The candle burned down to a stub long ago.'],
      [1020, 190, 180, 230, 'Digitalis purpurea. Foxglove. The moths come to it at dusk.'],
      [1270, 125, 125, 220, 'An empty birdcage. Its door hangs open, as if whatever lived here simply left.'],
      [1230, 410, 120, 190, 'Dried roses under glass. Dead a long time, and kept very carefully.'],
      [90, 670, 205, 130, 'An old travelling trunk. It is locked, and so light it must be nearly empty.'],
    ],
    south: [
      [120, 115, 245, 160, 'Edith’s sketches: a wing, a moth, notes in pencil. Her hand grows less steady from one to the next.'],
      [365, 365, 90, 105, 'A drawing of a cocoon, pinned apart from the others. Beneath it, one word: “mine”.'],
      [110, 350, 95, 240, 'A shawl, left on its peg. It still smells faintly of lavender.'],
      [245, 345, 110, 60, 'A summer hat with a red ribbon. Summer seems a long way off.'],
      [1160, 140, 230, 300, 'Edith Vane. Her eyes seem to follow you about the room.'],
      [1230, 440, 140, 100, 'A pressed violet, dated the spring before Father was taken away.'],
      [1255, 690, 95, 110, 'Crumpled pages. Every one begins “Dear Father” and goes no further.'],
      [435, 430, 70, 145, 'The ink has dried to a crust in the well.'],
    ],
    west: [
      [210, 320, 210, 460, 'A dress form under a dust sheet. For a moment, in the dark, it looked like someone standing there.'],
      [1150, 225, 230, 130, 'Specimen jars: pins, paper labels, and a few pale cocoons that never hatched.'],
      [1080, 580, 250, 210, 'A fern in a clay pot, still green. Someone has been watering it.'],
      [510, 610, 570, 180, 'A window seat with two faded cushions. The best place in the attic to watch for moths.'],
    ],
    east: [
      [200, 40, 160, 175, 'Lavender and yarrow, hung to dry. Lavender keeps the clothes moths off, Mother used to say.'],
      [365, 250, 100, 520, 'A butterfly net, its mesh mended many times over.'],
      [1165, 205, 170, 150, 'Common moths from the garden, pinned in tidy rows.'],
      [1185, 385, 150, 135, 'Beetles. Father’s collection, not hers. She never cared for them.'],
      [105, 625, 200, 175, 'Natural histories and moth keys, their spines cracked from use.'],
      [1195, 685, 175, 115, 'Two boxes marked LEPIDOPTERA. Empty setting boards inside.'],
    ],
  };
  Object.keys(LOOKS).forEach(wall => {
    G.registerWallObject(wall, {
      z: -1000,
      build(g) {
        LOOKS[wall].forEach(([x, y, w, h, text]) => {
          const r = G.el('rect', { x, y, width: w, height: h, fill: 'transparent' }, g);
          G.hotspot(r, { cursor: 'look', click() { G.say(text); } });
        });
      },
    });
  });
})();
