/* THE MOTH KEEPER — Specimen cabinet module.
 * Owns: east wall cabinet object, close-ups 'cabinet' (six pinned moths) and 'drawer' (4-wheel combination lock),
 * item 'key', hint 'drawer', debug step 30.
 * Drawer code 8426 = eyespot counts of Atlas(8) Luna(4) Hawk(2) Emperor(6) — the four lamp-projection shapes, L→R.
 */
(function () {
  'use strict';
  const CODE = [8, 4, 2, 6];
  const INK = '#1c140f';

  // ---------------------------------------------------------------- utils
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const f1 = n => Math.round(n * 10) / 10;
  function qpt(p0, p1, p2, t) { const u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; }
  function qtan(p0, p1, p2, t) { const x = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]); const y = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]); const l = Math.hypot(x, y) || 1; return [x / l, y / l]; }

  // ---------------------------------------------------------------- shared defs
  let defsDone = false;
  function ensureDefs() {
    if (defsDone) return; defsDone = true;
    const d = document.getElementById('defs');
    if (!d) return;
    let m = `
    <filter id="cabScale" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.55 1.3" numOctaves="2" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0 0.03  0 0 0 1.5 -0.55" result="d"/>
      <feComposite in="d" in2="SourceGraphic" operator="in" result="t"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="5" result="n2"/>
      <feColorMatrix in="n2" type="matrix" values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.9  0 0 0 0.9 -0.5" result="l"/>
      <feComposite in="l" in2="SourceGraphic" operator="in" result="t2"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="t"/><feMergeNode in="t2"/></feMerge>
    </filter>
    <filter id="cabFuzz" x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="2" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="cabShadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="cabShadowS" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="cabBlur1"><feGaussianBlur stdDeviation="1"/></filter>
    <filter id="cabGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.35" numOctaves="3" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0 0.02  0 0 0 1.2 -0.35" result="d"/>
      <feComposite in="d" in2="SourceGraphic" operator="in" result="t"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="t"/></feMerge>
    </filter>
    <filter id="cabVelvet" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.5 -0.15" result="d"/>
      <feComposite in="d" in2="SourceGraphic" operator="in" result="t"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="t"/></feMerge>
    </filter>
 <linearGradient id="cabSheen" gradientUnits="userSpaceOnUse" x1="0" y1="-90" x2="120" y2="120">
      <stop offset="0" stop-color="#fff" stop-opacity="0.18"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.02"/>
      <stop offset="0.55" stop-color="#fff8e0" stop-opacity="0.12"/><stop offset="0.75" stop-color="#000" stop-opacity="0.04"/><stop offset="1" stop-color="#000" stop-opacity="0.15"/>
    </linearGradient>
    <linearGradient id="cabCyl" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.38" stop-color="#fff" stop-opacity="0.16"/>
      <stop offset="0.55" stop-color="#fff" stop-opacity="0.05"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="cabBrass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3d890"/><stop offset="0.25" stop-color="#d7ab58"/><stop offset="0.6" stop-color="#a87a30"/><stop offset="1" stop-color="#5e4016"/>
    </linearGradient>
    <linearGradient id="cabBrassD" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0d388"/><stop offset="0.35" stop-color="#c29240"/><stop offset="0.7" stop-color="#8e6424"/><stop offset="1" stop-color="#4e3410"/>
    </linearGradient>
    <radialGradient id="cabDome" cx="40%" cy="35%" r="65%">
      <stop offset="0" stop-color="#fff2c4"/><stop offset="0.3" stop-color="#e2b865"/><stop offset="0.8" stop-color="#8e6424"/><stop offset="1" stop-color="#4a3210"/>
    </radialGradient>
    <linearGradient id="cabWal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#83553a"/><stop offset="0.5" stop-color="#5f3b25"/><stop offset="1" stop-color="#3e2618"/>
    </linearGradient>
    <linearGradient id="cabWalH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3e2618"/><stop offset="0.3" stop-color="#6a4229"/><stop offset="0.7" stop-color="#5a3824"/><stop offset="1" stop-color="#34200f"/>
    </linearGradient>
    <linearGradient id="cabGlass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.10"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.02"/>
      <stop offset="0.5" stop-color="#cfe3ff" stop-opacity="0.07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="cabBacking" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9caa6"/><stop offset="0.5" stop-color="#e8dcc0"/><stop offset="1" stop-color="#d6c59e"/>
    </linearGradient>
    <radialGradient id="cabBackVig" cx="50%" cy="48%" r="70%">
      <stop offset="0.55" stop-color="#3a2410" stop-opacity="0"/><stop offset="1" stop-color="#3a2410" stop-opacity="0.45"/>
    </radialGradient>
    <linearGradient id="cabDrum" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.85"/><stop offset="0.22" stop-color="#000" stop-opacity="0.25"/>
      <stop offset="0.42" stop-color="#fff" stop-opacity="0.12"/><stop offset="0.6" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.8" stop-color="#000" stop-opacity="0.3"/><stop offset="1" stop-color="#000" stop-opacity="0.88"/>
    </linearGradient>
    <linearGradient id="cabVelvetG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e0a0b"/><stop offset="0.45" stop-color="#4a1618"/><stop offset="1" stop-color="#6e2224"/>
    </linearGradient>`;
    // wing gradients & clips
    Object.keys(MOTHS).forEach(k => {
      const M = MOTHS[k];
      ['fw', 'hw'].forEach(w => {
        if (!M[w]) return;
        const g = M[w + 'Grad'];
        m += `<radialGradient id="cab-g-${k}-${w}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${g.r}">` +
          g.stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"/>`).join('') + `</radialGradient>`;
        m += `<clipPath id="cab-c-${k}-${w}"><path d="${M[w]}"/></clipPath>`;
      });
    });
    d.insertAdjacentHTML('beforeend', m);
  }

  // ---------------------------------------------------------------- moth art
  // Eyespot palettes: halo, outer ring, ring, inner ring, pupil
  function eye(x, y, r, p) {
    return `<g class="eyespot" transform="translate(${x},${y})">
      <circle r="${f1(r * 1.22)}" fill="${p.halo}" opacity="0.7"/>
      <circle r="${r}" fill="${p.outer}"/>
      <circle r="${f1(r * 0.8)}" fill="${p.ring}"/>
      <circle r="${f1(r * 0.8)}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="${f1(r * 0.06)}"/>
      <circle r="${f1(r * 0.6)}" fill="${p.inner}"/>
      <circle r="${f1(r * 0.4)}" fill="${p.pupil}"/>
      <ellipse cx="${f1(-r * 0.13)}" cy="${f1(-r * 0.15)}" rx="${f1(r * 0.14)}" ry="${f1(r * 0.1)}" fill="#fffdf2" transform="rotate(-30 ${f1(-r * 0.13)} ${f1(-r * 0.15)})"/>
      <circle r="${r}" fill="none" stroke="${INK}" stroke-width="${f1(Math.max(0.8, r * 0.07))}" opacity="0.8"/>
    </g>`;
  }
  function veins(base, ends, col, w, bend) {
    return ends.map(e => {
      const mx = (base[0] + e[0]) / 2, my = (base[1] + e[1]) / 2;
      const dx = e[0] - base[0], dy = e[1] - base[1];
      const b = bend == null ? 0.08 : bend;
      return `<path d="M${base[0]},${base[1]} Q${f1(mx - dy * b)},${f1(my + dx * b)} ${e[0]},${e[1]}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" opacity="0.5"/>`;
    }).join('');
  }
  // hair-stroke dusting clipped to a wing: short fine strokes (no dots)
  function dusting(seed, bx, n, col, op, len) {
    const r = rng(seed); let s = '';
    for (let i = 0; i < n; i++) {
      const x = bx[0] + r() * (bx[2] - bx[0]), y = bx[1] + r() * (bx[3] - bx[1]);
      const a = Math.atan2(y, x) + (r() - 0.5) * 0.5, L = len * (0.5 + r());
      s += `M${f1(x)},${f1(y)}l${f1(Math.cos(a) * L)},${f1(Math.sin(a) * L)}`;
    }
    return `<path d="${s}" stroke="${col}" stroke-width="0.8" stroke-linecap="round" opacity="${op}" fill="none"/>`;
  }
  function antFeather(len, spread, col, comb) {
    const out = [];
    [1, -1].forEach(sd => {
      const p0 = [sd * 3, -2], p1 = [sd * spread * 0.25, -len * 0.7], p2 = [sd * spread, -len];
      let d = `M${p0[0]},${p0[1]} Q${f1(p1[0])},${f1(p1[1])} ${f1(p2[0])},${f1(p2[1])}`;
      let c = '';
      const n = 22;
      for (let i = 2; i <= n; i++) {
        const t = i / n, p = qpt(p0, p1, p2, t), tg = qtan(p0, p1, p2, t);
        const L = comb * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 1;
        // barbs angled forward on both sides
        const nx = -tg[1], ny = tg[0];
        c += `M${f1(p[0])},${f1(p[1])}l${f1((nx + tg[0] * 0.7) * L)},${f1((ny + tg[1] * 0.7) * L)}`;
        c += `M${f1(p[0])},${f1(p[1])}l${f1((-nx + tg[0] * 0.7) * L)},${f1((-ny + tg[1] * 0.7) * L)}`;
      }
      out.push(`<path d="${c}" stroke="${col}" stroke-width="0.7" opacity="0.85" fill="none"/><path d="${d}" stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`);
    });
    return out.join('');
  }
  function antThin(len, spread, col, club) {
    return [1, -1].map(sd => {
      const p2 = [sd * spread, -len];
      return `<path d="M${sd * 2},-2 Q${f1(sd * spread * 0.2)},${f1(-len * 0.75)} ${f1(p2[0])},${f1(p2[1])}" stroke="${col}" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
        (club ? `<path d="M${f1(p2[0] - sd * 2)},${f1(p2[1] + 6)} Q${f1(p2[0] + sd * 1)},${f1(p2[1] - 3)} ${f1(p2[0] + sd * 4)},${f1(p2[1] - 2)}" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/>` : '');
    }).join('');
  }

  /* Wing geometry: RIGHT side only (x>0), body at x=0, head up (y<0). Left side mirrored.
   * Eyes listed per RIGHT wing; totals are doubled by mirroring. */
  const MOTHS = {
    atlas: {
      label: 'Attacus atlas', loc: 'Ceylon — 3.iii.1891', no: 'No. 7',
      say: 'Attacus atlas. The atlas moth — its wingtips curl like a snake\'s head.',
      fw: 'M7,-24 C46,-54 104,-76 158,-86 C180,-90 200,-82 198,-64 C197,-54 192,-46 184,-44 C180,-50 174,-52 166,-50 C152,-44 146,-30 144,-12 C142,2 138,10 132,16 C96,18 52,12 9,2 Z',
      hw: 'M7,0 C52,4 116,10 150,34 C166,58 150,96 118,122 C92,142 56,146 34,124 C16,104 8,64 6,20 Z',
      fwGrad: { r: 190, stops: [[0, '#4a1a0e'], [0.25, '#8a3a1c'], [0.62, '#b4562a'], [0.85, '#c9803e'], [1, '#d8a060']] },
      hwGrad: { r: 170, stops: [[0, '#4a1a0e'], [0.3, '#8e3c1c'], [0.7, '#b25428'], [0.9, '#cf8e4c'], [1, '#e0b070']] },
      edge: '#3a1208', band: '#e7c07a',
      fwDeco: `<path d="M38,-60 C54,-40 68,-18 70,10" stroke="#f3dcb2" stroke-width="4.5" fill="none" opacity="0.85"/>
               <path d="M32,-58 C48,-38 60,-16 62,9" stroke="#3a140a" stroke-width="2.5" fill="none" opacity="0.7"/>
               <path d="M150,-80 C170,-84 190,-74 186,-60 C178,-56 166,-58 160,-64 C154,-70 150,-74 150,-80 Z" fill="#caa0a4" opacity="0.8"/>
               <path d="M152,-72 C162,-70 172,-66 182,-66" stroke="#2a0e08" stroke-width="2.2" fill="none"/>
               <path d="M166,-52 C156,-40 150,-22 148,-4 C146,6 142,12 136,16" stroke="#ecc88a" stroke-width="12" fill="none" opacity="0.55"/>
               <path d="M158,-46 C146,-32 140,-14 138,2 C136,10 132,14 126,16" stroke="#3a140a" stroke-width="1.6" fill="none" opacity="0.8" stroke-dasharray="5 3"/>`,
      hwDeco: `<path d="M18,26 C44,30 84,38 118,54 C128,60 134,70 138,78" stroke="#f3dcb2" stroke-width="4.5" fill="none" opacity="0.85"/>
               <path d="M18,20 C44,24 86,32 120,48" stroke="#3a140a" stroke-width="2.4" fill="none" opacity="0.7"/>
               <path d="M156,52 C154,80 138,106 112,126 C88,142 60,146 40,130" stroke="#ecc88a" stroke-width="14" fill="none" opacity="0.5"/>
               <path d="M146,54 C144,78 130,100 108,118 C86,134 62,138 44,124" stroke="#3a140a" stroke-width="1.6" fill="none" opacity="0.8" stroke-dasharray="6 3"/>`,
      fwVeins: [[60, -64], [100, -74], [140, -76], [150, -44], [142, -14], [120, 14], [80, 14]],
      hwVeins: [[60, 12], [110, 20], [146, 42], [140, 90], [100, 132], [60, 140], [30, 118]],
      fwBase: [7, -18], hwBase: [7, 6],
      eyes: { fw: [[64, -26, 10], [118, -46, 9]], hw: [[64, 76, 11.5], [110, 88, 10]] },
      pal: { halo: '#f2dfae', outer: INK, ring: '#e4b453', inner: '#7a2616', pupil: '#120a06' },
      body: { th: [11, 16], abd: [70, 10], thc: '#7a3a1e', abc: '#a35a2e', hair: '#e8c898', seg: '#f0d8b0' },
      ant: ['feather', 44, 28, '#5a2a14', 6],
      top: -98, bottom: 146, span: 200,
    },
    luna: {
      label: 'Actias luna', loc: 'Vermont — 12.vi.1894', no: 'No. 3',
      say: 'Actias luna. The moon moth, trailing its long pale tails.',
      fw: 'M6,-22 C38,-50 96,-80 136,-86 C150,-88 156,-78 150,-64 C138,-38 124,-12 108,10 C74,14 40,8 8,2 Z',
      hw: 'M7,2 C50,6 96,14 114,34 C124,54 106,80 86,96 C74,122 70,168 76,212 C78,224 64,228 58,216 C44,178 46,132 42,108 C24,90 12,60 6,20 Z',
      fwGrad: { r: 160, stops: [[0, '#e6f2dc'], [0.35, '#c6e6c4'], [0.7, '#a8d8b0'], [1, '#86c09c']] },
      hwGrad: { r: 230, stops: [[0, '#e6f2dc'], [0.3, '#bde0bc'], [0.6, '#98cca4'], [0.85, '#7cb892'], [1, '#c8c08a']] },
      edge: '#4f7a5e', band: '#e0d690',
      fwDeco: `<path d="M8,-22 C40,-52 96,-82 138,-88 C150,-89 154,-82 152,-72 C120,-72 70,-56 12,-16 Z" fill="#7a3e56" opacity="0.9"/>
               <path d="M150,-64 C138,-38 124,-12 108,10" stroke="#d9d08a" stroke-width="5" fill="none" opacity="0.9"/>
               <path d="M20,-6 C46,-20 70,-28 84,-60" stroke="#7fb08e" stroke-width="2" fill="none" opacity="0.5"/>`,
      hwDeco: `<path d="M114,34 C124,54 106,80 86,96 C74,122 70,168 76,212" stroke="#d9d08a" stroke-width="5" fill="none" opacity="0.9"/>
               <path d="M72,176 C70,196 72,210 74,220 C66,226 60,222 58,214 C54,200 54,186 56,172 Z" fill="#d6a86e" opacity="0.75"/>
               <path d="M24,28 C44,34 60,50 70,70" stroke="#7fb08e" stroke-width="2" fill="none" opacity="0.5"/>`,
      fwVeins: [[70, -60], [120, -80], [146, -62], [128, -30], [106, 8], [64, 10]],
      hwVeins: [[60, 8], [104, 24], [110, 60], [80, 100], [66, 200], [44, 104]],
      fwBase: [6, -18], hwBase: [7, 6],
      eyes: { fw: [[96, -40, 9]], hw: [[74, 50, 10]] },
      pal: { halo: '#eef4d8', outer: '#3a1f2a', ring: '#ecc463', inner: '#8a3440', pupil: '#1a0d10' },
      body: { th: [10, 15], abd: [58, 9], thc: '#f2f0e4', abc: '#e8e6d4', hair: '#ffffff', seg: '#c8c6b0' },
      ant: ['feather', 40, 24, '#8a6a34', 5],
      top: -100, bottom: 230, span: 158,
    },
    hawk: {
      label: 'Sphinx ligustri', loc: 'Kent — 22.vii.1896', no: 'No. 11',
      say: 'Sphinx ligustri. The privet hawk-moth — built for speed.',
      fw: 'M8,-26 C62,-34 132,-18 186,16 C197,23 195,31 182,30 C150,26 118,24 88,27 C56,27 30,16 9,0 Z',
      hw: 'M8,4 C44,8 88,24 110,42 C118,60 100,78 72,82 C46,86 22,68 8,34 Z',
      fwGrad: { r: 200, stops: [[0, '#3a2a1e'], [0.3, '#6a5440'], [0.7, '#8e7658'], [1, '#a89070']] },
      hwGrad: { r: 110, stops: [[0, '#6a3a3a'], [0.3, '#c98088'], [0.7, '#e3a4a6'], [1, '#d99aa0']] },
      edge: '#221a14', band: '#c8b89c',
      fwDeco: `<path d="M20,-10 C70,-8 120,4 178,18" stroke="#1a120c" stroke-width="6" fill="none" opacity="0.75"/>
               <path d="M60,-20 C100,-18 140,-8 170,6" stroke="#1a120c" stroke-width="2" fill="none" opacity="0.6"/>
               <path d="M40,6 C80,10 120,16 160,16" stroke="#241a14" stroke-width="3" fill="none" opacity="0.5"/>
               <path d="M30,-22 C80,-24 130,-14 180,4" stroke="#c9b89a" stroke-width="3" fill="none" opacity="0.55"/>
               <path d="M180,4 C170,14 150,22 120,28 C100,30 90,31 86,32" stroke="#bfae92" stroke-width="10" fill="none" opacity="0.5"/>
               <path d="M100,-8 C110,4 116,14 118,26" stroke="#1a120e" stroke-width="2" fill="none" opacity="0.7"/>`,
      hwDeco: `<path d="M14,24 C44,28 80,36 106,50" stroke="#1c1210" stroke-width="7" fill="none"/>
               <path d="M40,82 C72,80 100,66 112,50" stroke="#1c1210" stroke-width="8" fill="none" opacity="0.95"/>
               <path d="M10,44 C20,62 34,76 50,84" stroke="#1c1210" stroke-width="5" fill="none" opacity="0.8"/>`,
      fwVeins: [[80, -26], [140, -14], [186, 10], [150, 22], [110, 28], [60, 26]],
      hwVeins: [[60, 16], [96, 40], [76, 70], [40, 72]],
      fwBase: [8, -18], hwBase: [8, 8],
      eyes: { fw: [], hw: [[64, 60, 11]] },
      pal: { halo: '#f2d6c8', outer: INK, ring: '#e7c476', inner: '#3d5f92', pupil: '#0e0a08' },
      body: { th: [12, 19], abd: [100, 12], thc: '#5a4636', abc: '#c9767e', hair: '#d8c8b0', seg: '#1c1210', stripes: true },
      ant: ['thin', 40, 20, '#7a6a54', 1],
      top: -70, bottom: 120, span: 200,
    },
    emperor: {
      label: 'Saturnia pavonia', loc: 'Yorkshire moor — 9.iv.1897', no: 'No. 19',
      say: 'Saturnia pavonia. The emperor, wings round as fans.',
      fw: 'M8,-22 C36,-62 96,-86 136,-76 C164,-66 168,-30 152,-4 C142,12 122,18 100,18 C62,16 30,8 8,2 Z',
      hw: 'M8,4 C54,6 112,14 140,40 C160,66 146,106 110,122 C76,134 40,120 22,90 C10,64 6,32 6,10 Z',
      fwGrad: { r: 170, stops: [[0, '#4a3a3e'], [0.3, '#7a6a70'], [0.65, '#a8969a'], [0.85, '#c8a8a0'], [1, '#d8a07c']] },
      hwGrad: { r: 160, stops: [[0, '#5a3a2a'], [0.3, '#9c6038'], [0.65, '#c8844a'], [0.85, '#dca060'], [1, '#e6c088']] },
      edge: '#2e2224', band: '#efe2d0',
      fwDeco: `<path d="M34,-56 C44,-40 50,-22 48,-2 C46,6 44,10 42,12" stroke="#f2e6d6" stroke-width="5" fill="none" opacity="0.8"/>
               <path d="M40,-60 C52,-42 58,-22 56,-2 C55,6 54,10 52,14" stroke="#2a1e22" stroke-width="2" fill="none" opacity="0.8"/>
               <path d="M156,-40 L146,-30 L154,-20 L144,-10 L150,0 L138,10" stroke="#f2e6d6" stroke-width="3" fill="none" opacity="0.8" stroke-linejoin="round"/>
               <path d="M120,-82 C150,-78 166,-58 162,-34 C150,-44 136,-60 120,-82 Z" fill="#b8605a" opacity="0.55"/>`,
      hwDeco: `<path d="M22,24 C54,28 96,38 132,62" stroke="#f2e6d6" stroke-width="4" fill="none" opacity="0.7"/>
               <path d="M22,18 C56,22 98,32 134,54" stroke="#3a2418" stroke-width="2" fill="none" opacity="0.7"/>
               <path d="M148,58 C152,86 136,108 108,118 C80,128 50,118 32,96" stroke="#f0dcc0" stroke-width="10" fill="none" opacity="0.5"/>
               <path d="M140,60 L130,74 L140,86 L126,98 L130,110 L112,112 L108,122" stroke="#3a2418" stroke-width="1.8" fill="none" opacity="0.7" stroke-linejoin="round"/>`,
      fwVeins: [[70, -70], [120, -80], [158, -40], [148, 2], [110, 18], [60, 14]],
      hwVeins: [[60, 10], [120, 22], [148, 62], [130, 110], [84, 130], [40, 110]],
      fwBase: [8, -18], hwBase: [8, 6],
      eyes: { fw: [[100, -36, 12]], hw: [[64, 62, 10.5], [110, 84, 10.5]] },
      pal: { halo: '#f4e8d8', outer: INK, ring: '#e2b868', inner: '#6a4e8a', pupil: '#100a0c' },
      body: { th: [11, 15], abd: [62, 10], thc: '#6a4a3a', abc: '#8a6a52', hair: '#e2d0bc', seg: '#e0cdb4' },
      ant: ['feather', 40, 26, '#4a3226', 6],
      top: -100, bottom: 132, span: 168,
    },
    io: {
      label: 'Automeris io', loc: 'Ohio — 30.vi.1893', no: 'No. 5',
      say: 'Automeris io. It flashes two great eyes to frighten birds.',
      fw: 'M8,-22 C40,-56 96,-74 128,-68 C146,-62 148,-40 138,-18 C130,0 116,12 100,14 C62,12 30,8 8,2 Z',
      hw: 'M8,4 C52,6 102,16 122,38 C138,64 120,98 88,110 C58,120 28,104 16,78 C8,56 6,30 6,10 Z',
      fwGrad: { r: 150, stops: [[0, '#8a5a1a'], [0.3, '#c89a30'], [0.7, '#e0bc48'], [1, '#e8c85c']] },
      hwGrad: { r: 140, stops: [[0, '#c07a2a'], [0.3, '#e0b040'], [0.7, '#eccb56'], [1, '#e6be4c']] },
      edge: '#6a4410', band: '#f4de8a',
      fwDeco: `<path d="M28,-40 C46,-22 56,-6 58,10" stroke="#8a5a1a" stroke-width="2.4" fill="none" opacity="0.6"/>
               <path d="M100,-66 C112,-40 118,-16 116,10" stroke="#8a5a1a" stroke-width="2.4" fill="none" opacity="0.6"/>
               <path d="M72,-62 C80,-44 84,-24 80,-4" stroke="#b07a2a" stroke-width="6" fill="none" opacity="0.35"/>`,
      hwDeco: `<path d="M130,48 C136,72 120,96 90,106 C60,114 34,102 20,80" stroke="#b8302c" stroke-width="7" fill="none" opacity="0.9"/>
               <path d="M122,46 C128,68 114,90 88,98 C62,106 38,96 26,78" stroke="#1c140f" stroke-width="2" fill="none" opacity="0.8"/>`,
      fwVeins: [[60, -60], [110, -68], [140, -30], [110, 12], [60, 12]],
      hwVeins: [[60, 10], [116, 30], [124, 76], [80, 110], [30, 94]],
      fwBase: [8, -18], hwBase: [8, 6],
      eyes: { fw: [], hw: [[64, 56, 24]] },
      pal: { halo: '#f8e89a', outer: INK, ring: '#6f92cc', inner: '#243866', pupil: '#0e0a08' },
      body: { th: [11, 15], abd: [58, 10], thc: '#b8862e', abc: '#d8a840', hair: '#f4dc8a', seg: '#8a5a1a' },
      ant: ['feather', 36, 22, '#6a4410', 5],
      top: -86, bottom: 118, span: 150,
    },
    plume: {
      label: 'Pterophorus pentadactyla', loc: 'The garden — 14.viii.1898', no: 'No. 23',
      say: 'A plume moth. Hardly more than feathers.',
      plume: true,
      body: { th: [5, 9], abd: [96, 4.5], thc: '#d8ccb0', abc: '#e4dac0', hair: '#fffaf0', seg: '#b4a684' },
      ant: ['thin', 58, 22, '#b8aa8a', 0],
      top: -70, bottom: 110, span: 160,
    },
  };
  const ORDER = ['atlas', 'luna', 'hawk', 'emperor', 'io', 'plume'];

  function plumeSide() {
    // one narrow forewing straight out (T), split into 2 plumes at the tip; hindwing = 3 feathers behind
    let s = '';
    const feather = (x0, y0, x1, y1, w, seed, col) => {
      const r = rng(seed); let barbs = '';
      const n = 34, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      for (let i = 1; i < n; i++) {
        const t = i / n, x = x0 + dx * t, y = y0 + dy * t, bl = w * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.05))) * (0.8 + r() * 0.4);
        barbs += `M${f1(x)},${f1(y)}l${f1(-uy * bl + ux * bl * 0.5)},${f1(ux * bl + uy * bl * 0.5)}M${f1(x)},${f1(y)}l${f1(uy * bl + ux * bl * 0.5)},${f1(-ux * bl + uy * bl * 0.5)}`;
      }
      return `<path d="${barbs}" stroke="${col}" stroke-width="1.1" opacity="0.9" fill="none"/>` +
        `<path d="M${x0},${y0} L${x1},${y1}" stroke="#8c7c5c" stroke-width="1.6" stroke-linecap="round"/>`;
    };
    // hindwing plumes (behind)
    s += feather(6, -2, 112, 16, 9, 3, '#b8a47c');
    s += feather(6, 2, 100, 38, 9, 4, '#b09c74');
    s += feather(6, 6, 82, 58, 8, 5, '#a8946c');
    // forewing: solid narrow blade then two plumes
    s += `<path d="M4,-24 C40,-28 70,-30 98,-33 L103,-22 C70,-18 40,-14 5,-10 Z" fill="#d8c8a0" stroke="${INK}" stroke-width="1.1" opacity="0.95"/>`;
    s += `<path d="M20,-20 C50,-23 74,-25 94,-27" stroke="#b4a482" stroke-width="1.2" fill="none" opacity="0.7"/>`;
    s += feather(98, -31, 156, -42, 9, 6, '#c4b088');
    s += feather(101, -24, 152, -16, 9, 7, '#c4b088');
    return s;
  }

  function wing(k, w, M, opts) {
    const d = M[w];
    const deco = M[w + 'Deco'] || '';
    const base = M[w + 'Base'];
    const vs = veins(base, M[w + 'Veins'], M.edge, 1.1, 0.07);
    const eyes = (M.eyes[w] || []).map(e => eye(e[0], e[1], e[2], M.pal)).join('');
    const bx = w === 'fw' ? [0, -90, 200, 30] : [0, 0, 160, 230];
    return `<g class="wing ${w}">
      <path d="${d}" fill="url(#cab-g-${k}-${w})" ${opts.mini ? '' : 'filter="url(#cabScale)"'}/>
      <g clip-path="url(#cab-c-${k}-${w})">
        <ellipse cx="${base[0] + 10}" cy="${base[1] + (w === 'fw' ? -2 : 8)}" rx="${w === 'fw' ? 46 : 36}" ry="${w === 'fw' ? 22 : 30}" fill="${M.edge}" opacity="0.45" ${opts.mini ? '' : 'filter="url(#blur6)"'}/>
        ${deco}
        ${vs}
        ${w === 'hw' && !opts.mini ? `<path d="${M.fw}" fill="#140a04" opacity="0.35" filter="url(#blur6)" transform="translate(2,7)"/>` : ''}
        <path d="${d}" fill="url(#cabSheen)"/>
        ${opts.mini ? '' : dusting(k.length * 31 + (w === 'fw' ? 1 : 2), bx, 260, M.edge, 0.22, 3)}
        ${opts.mini ? '' : dusting(k.length * 17 + (w === 'fw' ? 3 : 4), bx, 160, '#fff6e0', 0.18, 2.5)}
        <path d="${d}" fill="none" stroke="${M.edge}" stroke-width="10" opacity="0.35"/>
        <path d="${d}" fill="none" stroke="${M.band}" stroke-width="2.4" stroke-dasharray="1.5 3" opacity="0.4"/>
      </g>
      <path d="${d}" fill="none" stroke="${INK}" stroke-width="${opts.mini ? 2.6 : 1.8}" stroke-linejoin="round"/>
      ${eyes}
    </g>`;
  }

  function body(M, opts) {
    const b = M.body, [tx, ty] = b.th, [al, ax] = b.abd;
    const headY = -10 - ty - 3;
    let s = '';
    // abdomen
    const abd = `M${-ax},6 C${-ax - 1},${f1(al * 0.55)} ${f1(-ax * 0.45)},${al} 0,${al + 6} C${f1(ax * 0.45)},${al} ${ax + 1},${f1(al * 0.55)} ${ax},6 C${f1(ax * 0.6)},0 ${f1(-ax * 0.6)},0 ${-ax},6 Z`;
    s += `<g ${opts.mini ? '' : 'filter="url(#cabFuzz)"'}><path d="${abd}" fill="${b.abc}"/>`;
    if (b.stripes) {
      for (let i = 0; i < 6; i++) {
        const y = 16 + i * (al - 16) / 6;
        s += `<path d="M${-ax - 2},${f1(y)} Q0,${f1(y + 6)} ${ax + 2},${f1(y)} L${ax + 2},${f1(y + 5)} Q0,${f1(y + 11)} ${-ax - 2},${f1(y + 5)} Z" fill="${b.seg}" clip-path="none" opacity="0.92"/>`;
      }
      s += `<path d="M0,8 L0,${al}" stroke="${b.seg}" stroke-width="3" opacity="0.7"/>`;
    } else {
      for (let i = 1; i < 7; i++) {
        const y = 8 + i * (al - 6) / 7;
        s += `<path d="M${f1(-ax * 0.9)},${f1(y)} Q0,${f1(y + 4)} ${f1(ax * 0.9)},${f1(y)}" stroke="${b.seg}" stroke-width="1.2" fill="none" opacity="0.6"/>`;
      }
    }
    s += `<path d="${abd}" fill="url(#cabCyl)"/></g><path d="${abd}" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.55"/>`;
    // thorax
    s += `<g ${opts.mini ? '' : 'filter="url(#cabFuzz)"'}><ellipse cx="0" cy="-10" rx="${tx}" ry="${ty}" fill="${b.thc}"/>
      <ellipse cx="0" cy="-10" rx="${tx}" ry="${ty}" fill="url(#cabCyl)"/>
      <path d="M${-tx + 2},${-10 - ty * 0.6} Q0,${-10 - ty * 0.95} ${tx - 2},${-10 - ty * 0.6}" stroke="${b.hair}" stroke-width="3" fill="none" opacity="0.8"/>
      </g><ellipse cx="0" cy="-10" rx="${tx}" ry="${ty}" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.55"/>`;
    // head
    s += `<ellipse cx="0" cy="${headY}" rx="${f1(tx * 0.62)}" ry="${f1(tx * 0.5)}" fill="${b.thc}" stroke="${INK}" stroke-width="1.2"/>
      <ellipse cx="${f1(-tx * 0.45)}" cy="${headY}" rx="2" ry="3" fill="#1c140f"/><ellipse cx="${f1(tx * 0.45)}" cy="${headY}" rx="2" ry="3" fill="#1c140f"/>`;
    // antennae
    const a = M.ant;
    const ant = a[0] === 'feather' ? antFeather(a[1], a[2], a[3], a[4]) : antThin(a[1], a[2], a[3], a[4]);
    s = `<g transform="translate(0,${headY - 2})">${ant}</g>` + s;
    return s;
  }

  function silhouette(k, M) {
    if (M.plume) {
      return `<path d="M6,-18 L100,-28 L154,-40 M100,-26 L150,-16 M6,-2 L110,16 M6,2 L98,38 M6,6 L80,56" fill="none" stroke="#000" stroke-width="10" stroke-linecap="round"/>`;
    }
    return `<path d="${M.hw}"/><path d="${M.fw}"/>`;
  }

  function mothArt(k, opts) {
    opts = opts || {};
    const M = MOTHS[k];
    const side = M.plume ? plumeSide() : wing(k, 'hw', M, opts) + wing(k, 'fw', M, opts);
    const sil = silhouette(k, M);
    const b = M.body;
    const bodySil = `<ellipse cx="0" cy="${b.abd[0] / 2}" rx="${b.abd[1]}" ry="${b.abd[0] / 2 + 8}"/><ellipse cx="0" cy="-10" rx="${b.th[0]}" ry="${b.th[1]}"/>`;
    const sh = opts.mini ? 'cabShadowS' : 'cabShadow';
    return `<g class="moth-art">
      <g transform="translate(${opts.mini ? 5 : 9},${opts.mini ? 7 : 13})" fill="#2a1a0c" opacity="${opts.mini ? 0.3 : 0.28}" filter="url(#${sh})">
        <g>${sil}</g><g transform="scale(-1,1)">${sil}</g>${bodySil}
      </g>
      <g transform="scale(-1,1)">${side}</g>
      <g>${side}</g>
      ${body(M, opts)}
      ${opts.mini ? '' : `<path d="M1,-12 L26,22" stroke="#1a100a" stroke-width="2.4" opacity="0.28" filter="url(#cabBlur1)"/>`}
      <ellipse cx="0" cy="-12" rx="${opts.mini ? 3.2 : 3.4}" ry="${opts.mini ? 3.2 : 3}" fill="#6a6660" stroke="${INK}" stroke-width="1"/>
      <path d="M-1.8,-13.2 L0.8,-14" stroke="#e8e6e0" stroke-width="1.2" stroke-linecap="round"/>
    </g>`;
  }

  // ---------------------------------------------------------------- key art
  function keyArt(grad, hi) {
    // horizontal key, bow (moth) on the left centred at (-120,0); tip of bit at x≈200
    const wingF = 'M0,-6 C-10,-40 -44,-66 -70,-58 C-88,-50 -86,-22 -70,-8 C-56,2 -30,2 0,-2 Z';
    const wingH = 'M0,2 C-20,6 -52,12 -64,32 C-72,50 -56,64 -38,58 C-20,50 -6,28 0,8 Z';
    const holeF = 'M-18,-12 C-26,-30 -44,-46 -60,-44 C-70,-38 -66,-22 -54,-14 C-44,-8 -30,-8 -18,-12 Z';
    const holeH = 'M-14,14 C-26,18 -44,26 -50,38 C-52,48 -44,50 -36,46 C-26,40 -18,28 -14,14 Z';
    const oneSide = `<path d="${wingF} ${holeF}" fill-rule="evenodd"/><path d="${wingH} ${holeH}" fill-rule="evenodd"/>`;
    const lines = `<path d="${wingF}" fill="none" stroke="${hi}" stroke-width="1.6" opacity="0.6" transform="translate(-4,-2) scale(0.9)"/>`;
    // moth drawn head → +x: local moth coordinates have wings out along ±y; body along x
    const moth = `<g transform="translate(-120,0) rotate(90)">
        <g fill="url(#${grad})" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round">
          <g>${oneSide}</g><g transform="scale(-1,1)">${oneSide}</g>
        </g>
        <g>${lines}</g><g transform="scale(-1,1)">${lines}</g>
      </g>
      <g transform="translate(-120,0)">
        <path d="M-58,0 C-50,-9 -20,-11 6,-9 C18,-8 28,-5 30,0 C28,5 18,8 6,9 C-20,11 -50,9 -58,0 Z" fill="url(#${grad})" stroke="${INK}" stroke-width="2.4"/>
        <path d="M-40,-5 L-40,5 M-30,-6 L-30,6 M-20,-7 L-20,7 M-10,-7 L-10,7" stroke="${INK}" stroke-width="1.4" opacity="0.6"/>
        <path d="M30,-2 C44,-14 54,-26 60,-38 M30,2 C44,14 54,26 60,38" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <path d="M-52,-2 C-30,-7 0,-7 20,-5" stroke="${hi}" stroke-width="2" fill="none" opacity="0.8"/>
      </g>`;
    const shaft = `<path d="M-86,-9 L-66,-9 L-62,-14 L-50,-14 L-46,-9 L150,-9 L150,9 L-46,9 L-50,14 L-62,14 L-66,9 L-86,9 Z" fill="url(#${grad})" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M-44,-4 L148,-4" stroke="${hi}" stroke-width="2.4" opacity="0.8" stroke-linecap="round"/>
      <path d="M-60,-10 L-60,10" stroke="${hi}" stroke-width="2" opacity="0.7"/>`;
    const bit = `<path d="M118,8 L118,56 L132,56 L132,44 L142,44 L142,60 L156,60 L156,40 L166,40 L166,52 L178,52 L178,8 Z" fill="url(#${grad})" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M150,-9 C166,-9 176,-4 178,8" fill="url(#${grad})" stroke="${INK}" stroke-width="2.4"/>
      <path d="M122,14 L122,50" stroke="${hi}" stroke-width="2" opacity="0.7"/>`;
    return `<g class="key-art">${shaft}${bit}${moth}</g>`;
  }
  const KEY_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="cabKeyIconG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6dc96"/><stop offset="0.4" stop-color="#d0a24a"/><stop offset="0.75" stop-color="#9a6c28"/><stop offset="1" stop-color="#5a3c12"/></linearGradient></defs>
    <g transform="translate(52,50) rotate(-38) scale(0.27)">${keyArt('cabKeyIconG', '#fff0c0')}</g></svg>`;

  G.registerItem('key', {
    name: 'Brass key',
    desc: 'A small brass key. Its bow is shaped like a moth.',
    icon: KEY_ICON,
  });

  // ---------------------------------------------------------------- lock state
  const wheels = [0, 0, 0, 0].map(() => ({ pos: 0, target: 0, token: 0 }));
  const mod10 = n => ((n % 10) + 10) % 10;
  const values = () => wheels.map(w => mod10(w.target));
  let solving = false;

  // ---------------------------------------------------------------- wood helpers
  function grain(x, y, w, h, n, seed, col, op) {
    const r = rng(seed); let s = '';
    for (let i = 0; i < n; i++) {
      const yy = y + (i + r() * 0.8) * h / n;
      const a = 1.5 + r() * 4, ph = r() * 6, fr = 0.004 + r() * 0.006;
      let d = `M${x},${f1(yy)}`;
      for (let xx = x; xx <= x + w; xx += 24) d += ` L${xx},${f1(yy + Math.sin(xx * fr + ph) * a + Math.sin(xx * fr * 3.1 + ph) * a * 0.3)}`;
      s += `<path d="${d}" stroke="${col}" stroke-width="${f1(0.6 + r() * 1.4)}" fill="none" opacity="${f1(op * (0.4 + r() * 0.6) * 100) / 100}"/>`;
    }
    return s;
  }
  function screw(x, y, r, rot) {
    return `<g transform="translate(${x},${y}) rotate(${rot || 30})"><circle r="${r}" fill="url(#cabDome)" stroke="${INK}" stroke-width="1.4"/>
      <path d="M${-r * 0.75},0 L${r * 0.75},0" stroke="#3a2608" stroke-width="${f1(r * 0.28)}" stroke-linecap="round"/></g>`;
  }

  // ================================================================ EAST WALL OBJECT
  const wall = { els: {} };
  G.registerWallObject('east', {
    z: 10,
    build(g) {
      ensureDefs();
      const X0 = 500, X1 = 1100;
      let m = '';
      // cast shadow on wall + floor contact
      m += `<rect x="${X0 + 14}" y="160" width="${X1 - X0 + 10}" height="620" fill="#0b0806" opacity="0.45" filter="url(#blur20)"/>
            <ellipse cx="800" cy="790" rx="330" ry="14" fill="#000" opacity="0.55" filter="url(#blur6)"/>`;
      // cornice
      m += `<path d="M478,140 L1122,140 L1122,152 L1112,158 L1112,168 L1100,176 L1100,192 L500,192 L500,176 L488,168 L488,158 L478,152 Z" fill="url(#cabWal)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
            <path d="M480,146 L1120,146" stroke="#a87a52" stroke-width="2" opacity="0.6"/>
            <path d="M490,163 L1110,163" stroke="#2a180e" stroke-width="3" opacity="0.7"/>
            <path d="M502,184 L1098,184" stroke="#a87a52" stroke-width="1.5" opacity="0.5"/>`;
      for (let i = 0; i < 30; i++) m += `<rect x="${506 + i * 20}" y="${168}" width="10" height="8" fill="#2a180e" opacity="0.55"/>`;
      // upper case
      m += `<rect x="${X0}" y="192" width="${X1 - X0}" height="338" fill="url(#cabWalH)" stroke="${INK}" stroke-width="2.4"/>
            <g filter="url(#cabGrain)"><rect x="${X0 + 2}" y="194" width="${X1 - X0 - 4}" height="334" fill="#5a3824" opacity="0.35"/></g>`;
      m += grain(X0, 196, X1 - X0, 330, 24, 21, '#2a170c', 0.5);
      // glass door frame
      m += `<rect x="522" y="208" width="556" height="312" rx="3" fill="#4a2e1c" stroke="${INK}" stroke-width="2.2"/>
            <rect x="526" y="212" width="548" height="304" fill="none" stroke="#9a6e48" stroke-width="1.4" opacity="0.6"/>`;
      // backing + moths
      m += `<rect x="538" y="222" width="524" height="284" fill="url(#cabBacking)"/>
            <rect x="538" y="222" width="524" height="284" fill="url(#cabBacking)" filter="url(#paper)" opacity="0.6"/>`;
      m += `<g id="cab-wall-moths"></g>`;
      m += `<rect x="538" y="222" width="524" height="284" fill="url(#cabBackVig)"/>
            <path d="M538,222 L1062,222 L1062,236 L538,236 Z" fill="#1c0e06" opacity="0.35" filter="url(#cabBlur1)"/>`;
      // glass: reflections
      m += `<g pointer-events="none"><rect x="538" y="222" width="524" height="284" fill="url(#cabGlass)"/>
            <path d="M600,222 L680,222 L560,506 L538,506 L538,370 Z" fill="#fff" opacity="0.06"/>
            <path d="M700,222 L722,222 L602,506 L580,506 Z" fill="#fff" opacity="0.07"/>
            <path d="M960,222 L1010,222 L900,506 L850,506 Z" fill="#cfe3ff" opacity="0.045"/></g>`;
      m += `<rect x="538" y="222" width="524" height="284" fill="none" stroke="#c9a05a" stroke-width="2" opacity="0.8"/>`;
      // hinges + escutcheon
      [[520, 250], [520, 474]].forEach(([x, y]) => { m += `<rect x="${x - 6}" y="${y}" width="10" height="30" rx="2" fill="url(#cabBrass)" stroke="${INK}" stroke-width="1.2"/>`; });
      m += `<path d="M1086,352 C1094,352 1096,362 1092,368 L1094,384 L1078,384 L1080,368 C1076,362 1078,352 1086,352 Z" fill="url(#cabBrass)" stroke="${INK}" stroke-width="1.4"/>
            <path d="M1086,362 L1086,374" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
      // waist moulding
      m += `<path d="M488,530 L1112,530 L1112,542 L1104,550 L1104,562 L496,562 L496,550 L488,542 Z" fill="url(#cabWal)" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M490,536 L1110,536" stroke="#a87a52" stroke-width="1.6" opacity="0.6"/>`;
      // lower case
      m += `<rect x="${X0}" y="562" width="${X1 - X0}" height="190" fill="url(#cabWalH)" stroke="${INK}" stroke-width="2.4"/>`;
      m += grain(X0, 564, X1 - X0, 186, 14, 33, '#2a170c', 0.5);
      // lower fielded panel
      m += `<rect x="532" y="704" width="536" height="40" rx="2" fill="#4e3120" stroke="${INK}" stroke-width="1.8"/>
            <rect x="544" y="712" width="512" height="24" fill="#5c3a26" stroke="#2a180e" stroke-width="1.2"/>`;
      // drawer cavity + interior (visible when open)
      m += `<g id="cab-wall-cavity" style="display:none">
              <rect x="530" y="584" width="540" height="108" fill="#0c0705"/>
              <path d="M540,592 L1060,592 L1086,636 L514,636 Z" fill="url(#cabVelvetG)"/>
              <path d="M530,588 L540,592 L514,636 L508,636 Z M1070,588 L1060,592 L1086,636 L1092,636 Z" fill="#6a4229"/>
              <g id="cab-wall-keyglint"><g transform="translate(800,616) scale(0.16)">${keyArt('cabBrass', '#fff0c0')}</g></g>
            </g>`;
      // drawer front (transforms when open)
      m += `<g id="cab-wall-drawer">
              <rect x="530" y="584" width="540" height="108" rx="3" fill="url(#cabWal)" stroke="${INK}" stroke-width="2.4"/>
              ${grain(532, 588, 536, 100, 9, 41, '#2a170c', 0.55)}
              <rect x="540" y="594" width="520" height="88" rx="2" fill="none" stroke="#9a6e48" stroke-width="1.2" opacity="0.5"/>
              <rect x="540" y="594" width="520" height="88" rx="2" fill="none" stroke="#1c100a" stroke-width="1.2" opacity="0.6" transform="translate(1.5,1.5)"/>
              ${[612, 988].map(x => `<g transform="translate(${x},632)"><path d="M-22,-4 C-22,-10 -16,-12 -12,-10 L12,-10 C16,-12 22,-10 22,-4 L22,-2 L-22,-2 Z" fill="url(#cabBrass)" stroke="${INK}" stroke-width="1.4"/>
                <path d="M-16,-2 C-16,18 16,18 16,-2" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M-16,-2 C-16,18 16,18 16,-2" fill="none" stroke="#d7ab58" stroke-width="3" stroke-linecap="round"/></g>`).join('')}
              <g id="cab-wall-lock">
                <path d="M740,602 C760,596 780,600 800,594 C820,600 840,596 860,602 L866,628 C866,652 852,670 800,676 C748,670 734,652 734,628 Z" fill="url(#cabBrass)" stroke="${INK}" stroke-width="2"/>
                <path d="M746,608 C764,603 782,606 800,601 C818,606 836,603 854,608" stroke="#fff0c0" stroke-width="1.2" fill="none" opacity="0.6"/>
                ${[0, 1, 2, 3].map(i => `<rect x="${759 + i * 21}" y="624" width="15" height="22" rx="1.5" fill="#1a1008" stroke="#5e4016" stroke-width="1.2"/>
                   <rect x="${760 + i * 21}" y="626" width="13" height="18" fill="#e8dcc0"/>
                   <text id="cab-wall-d${i}" x="${766.5 + i * 21}" y="641" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-weight="bold" font-size="15" fill="${INK}">0</text>
                   <rect x="${760 + i * 21}" y="626" width="13" height="18" fill="url(#cabDrum)" opacity="0.7"/>`).join('')}
                ${screw(746, 612, 3.2, 20)}${screw(854, 612, 3.2, 70)}${screw(800, 664, 3.2, 40)}
              </g>
            </g>`;
      // plinth + feet
      m += `<path d="M490,752 L1110,752 L1116,760 L1116,778 L484,778 L484,760 Z" fill="url(#cabWal)" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M488,758 L1112,758" stroke="#a87a52" stroke-width="1.4" opacity="0.5"/>
            ${[522, 1078].map(x => `<path d="M${x - 22},778 C${x - 22},792 ${x - 12},794 ${x},794 C${x + 12},794 ${x + 22},792 ${x + 22},778 Z" fill="#3a2418" stroke="${INK}" stroke-width="2"/>`).join('')}`;
      G.svg(m, g);
      // mini moths
      const mm = g.querySelector('#cab-wall-moths');
      const cells = gridCells(538, 222, 524, 284, 0.285, true);
      ORDER_GRID.forEach((k, i) => {
        const c = cells[i];
        G.svg(`<g transform="translate(${c.x},${c.y}) scale(${c.s})">${mothArt(k, { mini: true })}</g>`, mm);
      });
      // hotspots (transparent hit rects)
      const glass = G.el('rect', { x: 522, y: 208, width: 556, height: 312, fill: 'transparent' }, g);
      G.hotspot(glass, { cursor: 'look', click: () => { G.sfx('click'); G.go('cabinet'); } });
      const dr = G.el('rect', { x: 522, y: 578, width: 556, height: 170, fill: 'transparent' }, g);
      G.hotspot(dr, { cursor: 'look', click: () => { G.sfx('click'); G.go('drawer'); } });
      wall.g = g;
      wall.els.drawer = g.querySelector('#cab-wall-drawer');
      wall.els.cavity = g.querySelector('#cab-wall-cavity');
      wall.els.glint = g.querySelector('#cab-wall-keyglint');
      wall.els.digits = [0, 1, 2, 3].map(i => g.querySelector('#cab-wall-d' + i));
    },
    update() {
      if (!wall.g) return;
      const open = !!G.get('drawerOpen');
      wall.els.cavity.style.display = open ? '' : 'none';
      wall.els.glint.style.display = open && !G.get('gotKey') ? '' : 'none';
      wall.els.drawer.setAttribute('transform', open ? 'translate(800,636) scale(1.075) translate(-800,-584)' : '');
      const v = open ? CODE : values();
      wall.els.digits.forEach((t, i) => { t.textContent = v[i]; });
    },
  });

  // grid: row1 Luna, Io, Atlas ; row2 Plume, Emperor, Hawk
  const ORDER_GRID = ['luna', 'io', 'atlas', 'plume', 'emperor', 'hawk'];
  function gridCells(x, y, w, h, scaleBase, mini) {
    const out = [];
    const cw = w / 3, rh = h / 2;
    const labelH = mini ? 0 : 64;
    ORDER_GRID.forEach((k, i) => {
      const col = i % 3, row = Math.floor(i / 3), M = MOTHS[k];
      const avail = rh - labelH - (mini ? 10 : 24);
      const mh = M.bottom - M.top;
      let s = scaleBase;
      if (mh * s > avail) s = avail / mh;
      if (M.span * 2 * s > cw * 0.92) s = cw * 0.92 / (M.span * 2);
      const cx = x + cw * (col + 0.5);
      const top = y + rh * row + (mini ? 6 : 16) + (avail - mh * s) / 2;
      out.push({ k, x: f1(cx), y: f1(top - M.top * s), s: Math.round(s * 1000) / 1000, labelY: y + rh * row + rh - labelH + 4, cx, col, row });
    });
    return out;
  }

  // ================================================================ CABINET CLOSE-UP
  const cab = {};
  G.registerView('cabinet', {
    parent: 'east',
    build(g) {
      ensureDefs();
      let m = '';
      // walnut surround
      m += `<rect width="1600" height="900" fill="#2a180e"/>
            <rect width="1600" height="900" fill="url(#cabWal)" opacity="0.8"/>`;
      m += grain(0, 0, 1600, 900, 60, 77, '#1a0e06', 0.45);
      m += `<g filter="url(#cabGrain)"><rect width="1600" height="900" fill="#4a2e1c" opacity="0.25"/></g>`;
      // inner frame bevel
      m += `<rect x="92" y="34" width="1356" height="770" rx="4" fill="#1c100a" stroke="${INK}" stroke-width="3"/>
            <rect x="100" y="42" width="1340" height="754" fill="none" stroke="#a87a52" stroke-width="2" opacity="0.5"/>
            <rect x="112" y="54" width="1316" height="730" fill="#140a06"/>`;
      // backing card
      m += `<rect x="120" y="62" width="1300" height="714" fill="url(#cabBacking)"/>
            <rect x="120" y="62" width="1300" height="714" fill="url(#cabBacking)" filter="url(#paper)" opacity="0.7"/>`;
      // faint pencil guide lines
      m += `<g stroke="#8a7a5a" stroke-width="0.8" opacity="0.25">
              <path d="M140,419 L1400,419"/><path d="M553,80 L553,760"/><path d="M987,80 L987,760"/></g>`;
      m += `<g id="cab-moths"></g>`;
      m += `<rect x="120" y="62" width="1300" height="714" fill="url(#cabBackVig)" pointer-events="none"/>
            <path d="M120,62 L1420,62 L1420,92 L120,92 Z" fill="#1c0e06" opacity="0.3" filter="url(#blur6)" pointer-events="none"/>
            <path d="M120,62 L150,62 L150,776 L120,776 Z" fill="#1c0e06" opacity="0.25" filter="url(#blur6)" pointer-events="none"/>`;
      // brass title plate on frame
      m += `<g transform="translate(770,34)">
              <path d="M-170,-22 L170,-22 C178,-22 182,-16 182,-10 L182,10 C182,16 178,22 170,22 L-170,22 C-178,22 -182,16 -182,10 L-182,-10 C-182,-16 -178,-22 -170,-22 Z" fill="url(#cabBrass)" stroke="${INK}" stroke-width="2"/>
              <text x="0" y="7" text-anchor="middle" font-family="'IM Fell English SC', 'IM Fell English', Georgia, serif" font-size="19" fill="#3a2608" letter-spacing="1.5">HETEROCERA · E. VANE</text>
              <text x="0" y="8" text-anchor="middle" font-family="'IM Fell English SC', 'IM Fell English', Georgia, serif" font-size="19" fill="#fff0c0" opacity="0.35" letter-spacing="1.5" transform="translate(0.8,0.8)">HETEROCERA · E. VANE</text>
              ${screw(-168, 0, 5, 20)}${screw(168, 0, 5, 60)}
            </g>`;
      // brass corner brackets
      [[92, 34, 0], [1448, 34, 90], [1448, 804, 180], [92, 804, 270]].forEach(([x, y, r]) => {
        m += `<g transform="translate(${x},${y}) rotate(${r})"><path d="M0,0 L56,0 L56,8 C36,8 18,14 8,26 L8,56 L0,56 Z" fill="url(#cabBrassD)" stroke="${INK}" stroke-width="1.8"/>${screw(16, 16, 4, 30)}</g>`;
      });
      // glass layer: sheen, reflections, dust (dust kept to margins, away from wings)
      let glass = `<rect x="120" y="62" width="1300" height="714" fill="url(#cabGlass)"/>
        <path d="M120,62 L420,62 L120,560 Z" fill="#fff" opacity="0.045"/>
        <path d="M470,62 L530,62 L150,776 L120,776 L120,720 Z" fill="#fff" opacity="0.05"/>
        <path d="M1180,62 L1300,62 L1000,776 L880,776 Z" fill="#dfeaff" opacity="0.03"/>
        <path d="M1330,62 L1350,62 L1060,776 L1040,776 Z" fill="#fff" opacity="0.05"/>
        <path d="M126,68 L1414,68" stroke="#fff" stroke-width="1.4" opacity="0.18"/>`;
      const r = rng(99); let dust = '';
      for (let i = 0; i < 90; i++) {
        let x, y;
        const e = r();
        if (e < 0.35) { x = 124 + r() * 1292; y = 752 + r() * 22; }
        else if (e < 0.55) { x = 124 + r() * 1292; y = 64 + r() * 14; }
        else if (e < 0.78) { x = 122 + r() * 18; y = 64 + r() * 710; }
        else { x = 1398 + r() * 20; y = 64 + r() * 710; }
        const s = 0.5 + r() * 1.3;
        dust += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(s * 1.4)}" ry="${f1(s * 0.7)}" transform="rotate(${Math.round(r() * 180)} ${f1(x)} ${f1(y)})" fill="#f4ecd8" opacity="${f1(0.18 + r() * 0.3)}"/>`;
      }
      glass += dust;
      // a smudge (fingerprint arc) near the bottom-right corner, not over any moth
      glass += `<path d="M1330,748 C1350,730 1380,734 1392,752" stroke="#fff" stroke-width="5" fill="none" opacity="0.05" filter="url(#cabBlur1)"/>`;
      m += `<g id="cab-glass" pointer-events="none">${glass}</g>`;
      m += `<rect id="cab-tint" width="1600" height="900" pointer-events="none" fill="#12222e" opacity="0.22" style="mix-blend-mode:multiply"/>`;
      G.svg(m, g);

      const host = g.querySelector('#cab-moths');
      const cells = gridCells(120, 62, 1300, 690, 1.0, false);
      cells.forEach((c, i) => {
        const M = MOTHS[c.k];
        const rot = [-1.2, 0.8, -0.6, 1.1, -0.9, 0.5][i];
        // label (pinned paper slip)
        const lx = c.cx, ly = c.labelY + 22;
        const lab = G.svg(`<g transform="translate(${f1(lx)},${f1(ly)}) rotate(${rot})">
            <rect x="-104" y="-18" width="208" height="46" fill="#1c0e06" opacity="0.18" filter="url(#cabShadowS)" transform="translate(3,4)"/>
            <rect x="-104" y="-18" width="208" height="46" fill="#efe5cc" filter="url(#paper)"/>
            <rect x="-100" y="-14" width="200" height="38" fill="none" stroke="#6a5a40" stroke-width="0.8" opacity="0.6"/>
            <text x="0" y="3" text-anchor="middle" font-family="'IM Fell English', Georgia, serif" font-style="italic" font-size="${M.label.length > 20 ? 17 : 20}" fill="#2a1c10">${M.label}</text>
            <text x="0" y="20" text-anchor="middle" font-family="'Homemade Apple', 'IM Fell English', cursive" font-size="9.5" fill="#4a3624" opacity="0.9">${M.loc}</text>
            <text x="-94" y="-4" font-family="'IM Fell English', Georgia, serif" font-size="9" fill="#6a5a40">${M.no}</text>
            <path d="M92,-12 L96,-4" stroke="#5a5650" stroke-width="1" opacity="0.8"/><circle cx="92" cy="-12" r="2.6" fill="#8a8680" stroke="${INK}" stroke-width="0.8"/>
          </g>`, host);
        // moth
        const mg = G.svg(`<g transform="translate(${c.x},${c.y}) scale(${c.s}) rotate(${rot * 0.6})">${mothArt(c.k)}</g>`, host);
        mg.setAttribute('class', 'cab-moth');
        mg.setAttribute('data-moth', c.k);
        G.hotspot(mg, { cursor: 'look', click: () => { G.sfx('click'); G.say(M.say); } });
        G.hotspot(lab, { cursor: 'look', click: () => { G.sfx('paper'); G.say(M.say); } });
      });
      cab.tint = g.querySelector('#cab-tint');
    },
    update() { if (cab.tint) setTint(cab.tint); },
    enter() {
      if (!cab.seen) { cab.seen = true; setTimeout(() => G.say('Edith\'s specimens — six moths, each pinned and labelled in her hand.'), 250); }
    },
  });
  function setTint(el) {
    const lit = !!G.get('lampLit');
    el.setAttribute('fill', lit ? '#ffb85a' : '#12222e');
    el.setAttribute('opacity', lit ? '0.07' : '0.22');
    el.style.mixBlendMode = lit ? 'soft-light' : 'multiply';
  }

  // ================================================================ DRAWER CLOSE-UP
  const dr = { wheelEls: [] };
  const WX = [635, 745, 855, 965], WY = 468, WW = 78, WH = 116, DS = 78; // digit spacing
  const FRONT = { x: 100, y: 150, w: 1400, h: 620 };
  const SLIDE = 440;
  G.registerView('drawer', {
    parent: 'east',
    build(g) {
      ensureDefs();
      let m = '';
      // carcass
      m += `<rect width="1600" height="900" fill="#2e1c10"/>
            <rect width="1600" height="900" fill="url(#cabWalH)" opacity="0.7"/>`;
      m += grain(0, 0, 1600, 900, 50, 12, '#140a04', 0.5);
      m += `<rect x="0" y="0" width="1600" height="126" fill="url(#cabWal)"/>${grain(0, 4, 1600, 118, 8, 3, '#1c0e06', 0.5)}
            <path d="M0,118 L1600,118" stroke="#a87a52" stroke-width="2" opacity="0.4"/>
            <path d="M0,126 L1600,126" stroke="${INK}" stroke-width="3"/>`;
      // cavity
      m += `<rect x="${FRONT.x - 6}" y="${FRONT.y - 12}" width="${FRONT.w + 12}" height="${FRONT.h + 22}" fill="#080403"/>
            <defs> <clipPath id="cab-cavclip"><rect x="${FRONT.x - 6}" y="${FRONT.y + 4}" width="${FRONT.w + 12}" height="900"/></clipPath></defs>`;
      // interior (velvet tray) — slides with the drawer
      let inner = `<path d="M190,176 L1410,176 L1410,196 L190,196 Z" fill="#6a4229" stroke="${INK}" stroke-width="2"/>
        <path d="M200,196 L1400,196 L1470,590 L130,590 Z" fill="url(#cabVelvetG)"/>
        <path d="M200,196 L1400,196 L1470,590 L130,590 Z" fill="#5e1a1c" opacity="0.5" filter="url(#cabVelvet)"/>
        <path d="M180,176 L200,196 L130,590 L96,590 Z" fill="#5a3824" stroke="${INK}" stroke-width="2"/>
        <path d="M1420,176 L1400,196 L1470,590 L1504,590 Z" fill="#4a2e1c" stroke="${INK}" stroke-width="2"/>
        <path d="M200,196 L1400,196" stroke="#000" stroke-width="12" opacity="0.4" filter="url(#blur6)"/>
        <g transform="translate(800,390) rotate(-8)">
          <g transform="translate(6,10) scale(1.05)" fill="#1a0406" opacity="0.8" filter="url(#cabBlur1)"><g class="key-imprint">${keyArt('cabVelvetG', '#1a0406')}</g></g>
          <g id="cab-key" transform="scale(1.05)">
            <g opacity="0.45" filter="url(#cabShadow)" transform="translate(8,12)"><g fill="#000">${keyArt('cabVelvetG', '#000')}</g></g>
            ${keyArt('cabBrass', '#fff2c8')}
            <rect x="-200" y="-80" width="400" height="160" fill="transparent"/>
          </g>
        </g>`;
      m += `<g clip-path="url(#cab-cavclip)"><g id="cab-inner" transform="translate(0,${-SLIDE})">${inner}</g></g>`;
      // drawer front
      const F = FRONT;
      let fr = `<rect x="${F.x}" y="${F.y}" width="${F.w}" height="${F.h}" rx="6" fill="url(#cabWal)" stroke="${INK}" stroke-width="3"/>
        ${grain(F.x + 4, F.y + 4, F.w - 8, F.h - 8, 34, 58, '#241208', 0.55)}
        <g filter="url(#cabGrain)"><rect x="${F.x + 3}" y="${F.y + 3}" width="${F.w - 6}" height="${F.h - 6}" fill="#6a4229" opacity="0.25"/></g>
        <rect x="${F.x + 26}" y="${F.y + 26}" width="${F.w - 52}" height="${F.h - 52}" rx="4" fill="none" stroke="#b08058" stroke-width="2" opacity="0.45"/>
        <rect x="${F.x + 29}" y="${F.y + 29}" width="${F.w - 52}" height="${F.h - 52}" rx="4" fill="none" stroke="#140a04" stroke-width="2.5" opacity="0.6"/>
        <path d="M${F.x + 8},${F.y + 6} L${F.x + F.w - 8},${F.y + 6}" stroke="#c09068" stroke-width="2" opacity="0.5"/>`;
      // bail handles
      [330, 1270].forEach(x => {
        fr += `<g class="cab-handle" transform="translate(${x},445)">
          <path d="M-70,-26 C-74,-40 -58,-46 -50,-38 L50,-38 C58,-46 74,-40 70,-26 C66,-16 56,-14 50,-18 L-50,-18 C-56,-14 -66,-16 -70,-26 Z" fill="url(#cabBrass)" stroke="${INK}" stroke-width="2.2"/>
          <path d="M-60,-34 C-40,-36 40,-36 60,-34" stroke="#fff0c0" stroke-width="1.6" opacity="0.7" fill="none"/>
          ${screw(-56, -28, 6, 20)}${screw(56, -28, 6, 110)}
          <path d="M-50,-22 C-54,40 54,40 50,-22" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
          <path d="M-50,-22 C-54,40 54,40 50,-22" fill="none" stroke="url(#cabBrass)" stroke-width="8" stroke-linecap="round"/>
          <path d="M-46,-12 C-46,26 -10,32 10,30" fill="none" stroke="#fff0c0" stroke-width="2" opacity="0.6" stroke-linecap="round"/>
          <path d="M-54,-18 C-58,52 58,52 54,-18" fill="none" stroke="#000" stroke-width="10" opacity="0.2" filter="url(#blur6)" transform="translate(6,14)"/>
        </g>`;
      });
      // lock plate
      const plate = 'M800,196 C830,196 846,214 872,210 C900,206 912,188 940,194 C972,200 986,226 1020,226 C1048,226 1062,244 1062,272 L1062,560 C1062,610 1030,632 990,640 C940,650 900,654 870,672 C850,684 830,700 800,700 C770,700 750,684 730,672 C700,654 660,650 610,640 C570,632 538,610 538,560 L538,272 C538,244 552,226 580,226 C614,226 628,200 660,194 C688,188 700,206 728,210 C754,214 770,196 800,196 Z';
      let pl = `<path d="${plate}" fill="#000" opacity="0.5" filter="url(#blur6)" transform="translate(8,12)"/>
        <path d="${plate}" fill="url(#cabBrassD)" stroke="${INK}" stroke-width="3"/>
        <path d="${plate}" fill="none" stroke="#fff0c0" stroke-width="2" opacity="0.4" transform="translate(800,448) scale(0.965) translate(-800,-448)"/>
        <path d="${plate}" fill="none" stroke="#4a3010" stroke-width="1.6" opacity="0.7" transform="translate(800,448) scale(0.93) translate(-800,-448)"/>`;
      // engraved filigree scrolls
      const scroll = (sx) => `<g transform="translate(800,0) scale(${sx},1)" fill="none" stroke="#5a3a10" stroke-width="2" opacity="0.65" stroke-linecap="round">
          <path d="M40,610 C90,620 150,612 196,586 C226,566 222,532 196,530 C176,530 172,552 188,556"/>
          <path d="M60,626 C110,640 180,630 222,600"/>
          <path d="M210,262 C236,262 246,286 232,300 C220,310 204,302 208,290"/>
          <path d="M120,236 C160,232 200,244 214,262"/>
          <path d="M226,320 L226,540" stroke-dasharray="2 7"/>
        </g>
        <g transform="translate(800,0) scale(${sx},1)" fill="none" stroke="#fff0c0" stroke-width="1" opacity="0.35">
          <path d="M41,612 C91,622 151,614 197,588 C227,568 223,534 197,532"/>
          <path d="M211,264 C237,264 247,288 233,302"/>
        </g>`;
      pl += scroll(1) + scroll(-1);
      // engraved moth motif (no eye spots)
      pl += `<g transform="translate(800,262) scale(0.9)" fill="none" stroke="#4a3010" stroke-width="2" stroke-linejoin="round">
          <path d="M0,-6 C-20,-26 -54,-30 -62,-14 C-66,-2 -40,6 0,2 Z"/><path d="M0,-6 C20,-26 54,-30 62,-14 C66,-2 40,6 0,2 Z"/>
          <path d="M0,2 C-16,8 -40,20 -36,32 C-30,40 -10,26 0,8 Z"/><path d="M0,2 C16,8 40,20 36,32 C30,40 10,26 0,8 Z"/>
          <path d="M0,-12 L0,24" stroke-width="4"/><path d="M-2,-14 C-8,-26 -14,-30 -20,-32 M2,-14 C8,-26 14,-30 20,-32"/>
          <path d="M-12,-6 C-28,-16 -44,-18 -54,-12 M12,-6 C28,-16 44,-18 54,-12" opacity="0.6"/>
        </g>
        <g transform="translate(801,263.5) scale(0.9)" fill="none" stroke="#fff0c0" stroke-width="1" opacity="0.35">
          <path d="M0,-6 C-20,-26 -54,-30 -62,-14"/><path d="M0,-6 C20,-26 54,-30 62,-14"/></g>`;
      // engraved motto
      pl += `<text x="801.5" y="349.5" text-anchor="middle" font-family="'IM Fell English', Georgia, serif" font-style="italic" font-size="34" fill="#fff0c0" opacity="0.4">What the light remembers</text>
        <text x="800" y="348" text-anchor="middle" font-family="'IM Fell English', Georgia, serif" font-style="italic" font-size="34" fill="#3a2406">What the light remembers</text>
        <path d="M640,366 C700,372 760,364 800,372 C840,364 900,372 960,366" stroke="#4a3010" stroke-width="1.6" fill="none" opacity="0.7"/>`;
      // wheel bezel recess
      pl += `<rect x="584" y="386" width="432" height="164" rx="14" fill="#3a2608" opacity="0.55"/>
        <rect x="584" y="386" width="432" height="164" rx="14" fill="none" stroke="#fff0c0" stroke-width="1.4" opacity="0.35" transform="translate(1,1.5)"/>
        <rect x="584" y="386" width="432" height="164" rx="14" fill="none" stroke="${INK}" stroke-width="2"/>`;
      // corner screws
      pl += screw(580, 262, 9, 15) + screw(1020, 262, 9, 75) + screw(580, 580, 9, 130) + screw(1020, 580, 9, 40);
      // bolt slot
      pl += `<rect x="700" y="586" width="200" height="30" rx="6" fill="#140a02" stroke="${INK}" stroke-width="2"/>
        <rect x="700" y="586" width="200" height="30" rx="6" fill="none" stroke="#fff0c0" stroke-width="1" opacity="0.3" transform="translate(0,1.5)"/>
        <rect x="866" y="590" width="30" height="22" rx="3" fill="#6e4d1c" stroke="${INK}" stroke-width="1.4"/>
        <g id="cab-bolt"><rect x="706" y="592" width="176" height="18" rx="4" fill="url(#cabBrass)" stroke="${INK}" stroke-width="1.6"/>
          <path d="M712,596 L876,596" stroke="#fff0c0" stroke-width="1.4" opacity="0.6"/>
          ${[730, 760, 790, 820, 850].map(x => `<path d="M${x},594 L${x},608" stroke="#5a3a10" stroke-width="1.2" opacity="0.6"/>`).join('')}</g>`;
      fr += `<g id="cab-plate">${pl}<g id="cab-wheels"></g></g>`;
      m += `<g id="cab-front">${fr}<rect id="cab-front-hit" x="${F.x}" y="${F.y}" width="${F.w}" height="${F.h}" fill="transparent" style="display:none"/></g>`;
      m += `<rect id="cab-dtint" width="1600" height="900" pointer-events="none" fill="#12222e" opacity="0.22" style="mix-blend-mode:multiply"/>`;
      G.svg(m, g);

      dr.front = g.querySelector('#cab-front');
      dr.inner = g.querySelector('#cab-inner');
      dr.key = g.querySelector('#cab-key');
      dr.bolt = g.querySelector('#cab-bolt');
      dr.tint = g.querySelector('#cab-dtint');
      dr.frontHit = g.querySelector('#cab-front-hit');
      g.querySelectorAll('.cab-handle').forEach(h => G.hotspot(h, {
        cursor: 'use',
        click: () => {
          if (G.get('drawerOpen')) return;
          G.sfx('lockFail'); G.say('Locked fast. The drawer won\'t budge.');
          G.tween(260, t => dr.front.setAttribute('transform', `translate(0,${f1(Math.sin(t * Math.PI * 3) * 3 * (1 - t))})`), 'linear');
        },
      }));
      G.hotspot(dr.key, {
        cursor: 'take',
        click: () => {
          if (G.get('gotKey')) return;
          G.give('key', dr.key);
          G.set('gotKey');
          G.say('A small brass key. Its bow is shaped like a moth.');
        },
      });
      G.hotspot(dr.frontHit, { cursor: 'look', click: () => G.say('The drawer hangs open on its runners.') });

      // ---- wheels
      const wg = g.querySelector('#cab-wheels');
      WX.forEach((cx, i) => {
        const x0 = cx - WW / 2, y0 = WY - WH / 2;
        let w = `<defs><clipPath id="cab-wclip${i}"><rect x="${x0}" y="${y0}" width="${WW}" height="${WH}" rx="6"/></clipPath></defs>
          <rect x="${x0 - 9}" y="${y0 - 9}" width="${WW + 18}" height="${WH + 18}" rx="12" fill="url(#cabBrass)" stroke="${INK}" stroke-width="2.2"/>
          <rect x="${x0 - 4}" y="${y0 - 4}" width="${WW + 8}" height="${WH + 8}" rx="9" fill="#2a1a06" stroke="#fff0c0" stroke-width="1" stroke-opacity="0.4"/>
          <g clip-path="url(#cab-wclip${i})">
            <rect x="${x0}" y="${y0}" width="${WW}" height="${WH}" fill="#e6d8b4"/>
            <rect x="${x0}" y="${y0}" width="${WW}" height="${WH}" fill="#e6d8b4" filter="url(#paper)" opacity="0.6"/>
            <g class="digits">${[0, 1, 2, 3, 4].map(() => `<text x="${cx}" y="0" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-weight="bold" font-size="66" fill="${INK}">0</text>`).join('')}</g>
            <g class="ticks">${[0, 1, 2, 3, 4].map(() => `<path d="" stroke="#6a5030" stroke-width="1.4" opacity="0.5"/>`).join('')}</g>
            <rect x="${x0}" y="${y0}" width="${WW}" height="${WH}" fill="url(#cabDrum)"/>
            <rect class="wglow" x="${x0}" y="${y0}" width="${WW}" height="${WH}" fill="#ffcf7a" opacity="0"/>
          </g>
          <path d="M${x0 + 4},${y0 + 3} L${x0 + WW - 4},${y0 + 3}" stroke="#fff" stroke-width="1.4" opacity="0.25"/>
          <path d="M${x0 - 5},${WY} L${x0 + 5},${WY - 5} L${x0 + 5},${WY + 5} Z" fill="#3a2406" opacity="0.8"/>`;
        // up / down buttons
        const btn = (dir) => {
          const y = dir < 0 ? y0 - 38 : y0 + WH + 38;
          const tri = dir < 0 ? `M${cx - 11},${y + 5} L${cx},${y - 7} L${cx + 11},${y + 5} Z` : `M${cx - 11},${y - 5} L${cx},${y + 7} L${cx + 11},${y - 5} Z`;
          return `<g class="cab-btn" data-w="${i}" data-d="${-dir}">
            <ellipse cx="${cx + 2}" cy="${y + 4}" rx="30" ry="17" fill="#000" opacity="0.35" filter="url(#cabBlur1)"/>
            <ellipse cx="${cx}" cy="${y}" rx="30" ry="17" fill="url(#cabDome)" stroke="${INK}" stroke-width="2"/>
            <path d="${tri}" fill="#4a3010" stroke="#2a1a06" stroke-width="1" stroke-linejoin="round"/>
            <path d="${tri}" fill="none" stroke="#fff0c0" stroke-width="1" opacity="0.4" transform="translate(0.8,1)"/>
            <rect x="${cx - 38}" y="${y - 22}" width="76" height="44" fill="transparent"/>
          </g>`;
        };
        w += btn(-1) + btn(1);
        const wEl = G.svg(`<g class="cab-wheel">${w}</g>`, wg);
        const digits = [...wEl.querySelectorAll('.digits text')];
        const ticks = [...wEl.querySelectorAll('.ticks path')];
        const hit = G.el('rect', { x: x0, y: y0, width: WW, height: WH, fill: 'transparent' }, wEl);
        dr.wheelEls[i] = { digits, ticks, glow: wEl.querySelector('.wglow'), cx, x0 };
        G.hotspot(hit, { cursor: 'use', click: () => {
          spin(i, 1);
        } });
        wEl.querySelectorAll('.cab-btn').forEach(b => G.hotspot(b, { cursor: 'use', click: () => {
          spin(i, +b.dataset.d);
          G.tween(140, t => b.setAttribute('transform', `translate(0,${f1(Math.sin(t * Math.PI) * 2.5)})`), 'linear');
        } }));
        renderWheel(i);
      });
      dr.g = g;
    },
    update() {
      if (!dr.g) return;
      setTint(dr.tint);
      const open = !!G.get('drawerOpen');
      if (!solving) setOpenPose(open ? 1 : 0);
      dr.key.style.display = G.get('gotKey') ? 'none' : '';
      dr.frontHit.style.display = open ? '' : 'none';
      if (open && !solving) { wheels.forEach((w, i) => { w.pos = w.target = CODE[i]; renderWheel(i); }); }
    },
    enter() {
      if (!G.get('drawerOpen') && !G.get('cabDrawerSeen')) {
        G.set('cabDrawerSeen');
        setTimeout(() => G.say('A combination lock. "What the light remembers."'), 250);
      }
    },
  });

  function setOpenPose(t) {
    const s = 1 + 0.07 * t, dy = SLIDE * t;
    dr.front.setAttribute('transform', t ? `translate(800,${f1(FRONT.y + dy)}) scale(${s}) translate(-800,${-FRONT.y})` : '');
    dr.inner.setAttribute('transform', `translate(0,${f1(-SLIDE + dy)})`);
    dr.bolt.setAttribute('transform', t ? 'translate(-130,0)' : '');
  }

  function renderWheel(i) {
    const W = dr.wheelEls[i]; if (!W) return;
    const pos = wheels[i].pos, base = Math.round(pos);
    W.digits.forEach((t, j) => {
      const k = base + j - 2, y = WY + (k - pos) * DS;
      t.setAttribute('y', f1(y + 23));
      t.textContent = mod10(k);
      const tick = W.ticks[j];
      const ty = y + DS / 2;
      tick.setAttribute('d', `M${W.x0 + 6},${f1(ty)} L${W.x0 + WW - 6},${f1(ty)}`);
    });
  }

  function spin(i, dir) {
    if (solving || G.get('drawerOpen')) return;
    const w = wheels[i];
    w.target += dir;
    G.sfx('dial');
    const from = w.pos, to = w.target, tok = ++w.token;
    G.tween(230, t => { if (w.token !== tok) return; w.pos = from + (to - from) * t; renderWheel(i); }, 'out').then(() => {
      if (w.token !== tok) return;
      w.target = mod10(w.target); w.pos = w.target; renderWheel(i);
      if (wall.g) wall.els.digits[i].textContent = w.target;
      check();
    });
  }

  function check() {
    const v = values();
    if (v.every((d, i) => d === CODE[i]) && !solving && !G.get('drawerOpen')) solve();
  }

  async function solve() {
    solving = true;
    G.busy(true);
    try {
      await G.wait(260);
      G.sfx('lockClick');
      await G.tween(500, t => dr.wheelEls.forEach(W => W.glow.setAttribute('opacity', f1(Math.sin(t * Math.PI) * 0.35 * 100) / 100)), 'linear');
      await G.tween(380, t => dr.bolt.setAttribute('transform', `translate(${f1(-130 * t)},0)`), 'inOut');
      await G.wait(250);
      G.sfx('drawerOpen');
      await G.tween(1400, t => {
        const s = 1 + 0.07 * t, dy = SLIDE * t;
        dr.front.setAttribute('transform', `translate(800,${f1(FRONT.y + dy)}) scale(${f1(s * 1000) / 1000}) translate(-800,${-FRONT.y})`);
        dr.inner.setAttribute('transform', `translate(0,${f1(-SLIDE + dy)})`);
      }, 'inOut');
      solving = false;
      G.set('drawerOpen');
      G.say('The drawer slides open. Something glints on the velvet.');
    } finally {
      solving = false;
      G.busy(false);
    }
  }

  // keyboard: type digits while looking at the lock
  let kbIdx = 0;
  document.addEventListener('keydown', ev => {
    if (G.view() !== 'drawer' || G.isBusy() || G.get('drawerOpen')) return;
    if (!/^[0-9]$/.test(ev.key)) return;
    const i = kbIdx % 4, w = wheels[i], d = +ev.key;
    const cur = mod10(w.target);
    let diff = d - cur; if (diff > 5) diff -= 10; if (diff < -5) diff += 10;
    if (diff !== 0) {
      w.target = cur + diff;
      const from = w.pos, to = w.target, tok = ++w.token;
      G.sfx('dial');
      G.tween(260, t => { if (w.token !== tok) return; w.pos = from + (to - from) * t; renderWheel(i); }, 'out').then(() => {
        if (w.token !== tok) return;
        w.target = mod10(w.target); w.pos = w.target; renderWheel(i); check();
      });
    }
    kbIdx++;
  });

  // ---------------------------------------------------------------- hints / debug
  G.registerHint({
    id: 'drawer', order: 30,
    when: () => G.get('lampLit') && !G.get('gotKey'),
    lines: [
      'The lamp shows more than light. Look at the wall behind it — then at the cabinet.',
      'Each of the four shapes on the wall has a twin in the cabinet. Edith counted their eyes, left to right.',
      'Atlas 8, Luna 4, Hawk-moth 2, Emperor 6. The drawer code is 8426.',
    ],
  });
  G.registerStep(30, 'drawer', () => { G.set('drawerOpen'); G.give('key'); G.set('gotKey'); });

  // exposed for testing
  G.cabinet = { wheels, values, WX, WY, MOTHS, ORDER_GRID };
})();
