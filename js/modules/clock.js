/* THE MOTH KEEPER — clock module.
 * Tall clock on the north wall + close-up 'clock' view (picture-dial puzzle).
 * Solution: hour hand -> crescent moon (8), minute hand -> candle (3).  Reward: matches.
 * Hand positions persist in flags clockH / clockM (0..11).
 */
(function () {
  'use strict';
  const INK = '#1c140f';
  const CX = 800, CY = 290;               // close-up dial centre (stage coords)
  const R_EN = 226, R_ICON = 160;
  const HOUR_LEN = 126, MIN_LEN = 212;
  const SOL_H = 8, SOL_M = 3, START_H = 10, START_M = 6;
  const DOOR = { x: 654, y: 602, w: 292, h: 230 };   // close-up case door
  const LEN = { x: 800, y: 652, r: 38 };
  const SHELF_Y = 764;                                // inner shelf the matchbox rests on (kept above the HUD strip)              // lenticle (pendulum window)
  const OPEN_DEG = 112;
  const W = { cx: 400, dialY: 250, dialR: 60 };      // wall-object geometry

  const rad = d => d * Math.PI / 180;
  const pol = (r, deg, cx, cy) => [(cx || 0) + r * Math.sin(rad(deg)), (cy || 0) - r * Math.cos(rad(deg))];
  const f1 = n => Math.round(n * 10) / 10;
  const mod = (n, m) => ((n % m) + m) % m;

  // ------------------------------------------------------------------ shared defs
  let defsDone = false;
  function ensureDefs() {
    if (defsDone) return;
    const d = document.getElementById('defs');
    if (!d) return;
    defsDone = true;
    d.insertAdjacentHTML('beforeend', `
    <filter id="ck-grainV" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.11 0.007" numOctaves="3" seed="11" result="t"/>
      <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.045  0 0 0 0 0.02  0 0 0 1.5 -0.62" result="tc"/>
      <feComposite in="tc" in2="SourceGraphic" operator="in" result="tx"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="tx"/></feMerge>
    </filter>
    <filter id="ck-grainH" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.007 0.12" numOctaves="3" seed="4" result="t"/>
      <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.045  0 0 0 0 0.02  0 0 0 1.5 -0.62" result="tc"/>
      <feComposite in="tc" in2="SourceGraphic" operator="in" result="tx"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="tx"/></feMerge>
    </filter>
    <filter id="ck-enamelTex" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="21" result="t"/>
      <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.33  0 0 0 0 0.2  0 0 0 0.16 0" result="tc"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="5" result="m"/>
      <feColorMatrix in="m" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.16  0 0 0 0.9 -0.38" result="mc"/>
      <feMerge result="all"><feMergeNode in="tc"/><feMergeNode in="mc"/></feMerge>
      <feComposite in="all" in2="SourceGraphic" operator="in" result="tx"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="tx"/></feMerge>
    </filter>
    <filter id="ck-blur3" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="ck-blur12" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
    <radialGradient id="ck-enamelG" cx="46%" cy="42%" r="60%">
      <stop offset="0" stop-color="#f6efdb"/><stop offset="0.6" stop-color="#ebdfc0"/><stop offset="0.92" stop-color="#d8c79e"/><stop offset="1" stop-color="#c4ae82"/>
    </radialGradient>
    <radialGradient id="ck-stain" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#8a6a3a" stop-opacity="0.22"/><stop offset="0.7" stop-color="#8a6a3a" stop-opacity="0.08"/><stop offset="1" stop-color="#8a6a3a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ck-bezelG" x1="0.15" y1="0.05" x2="0.85" y2="0.95">
      <stop offset="0" stop-color="#f3dc98"/><stop offset="0.25" stop-color="#d2a650"/><stop offset="0.5" stop-color="#8e6526"/>
      <stop offset="0.7" stop-color="#c79a45"/><stop offset="1" stop-color="#5a3e16"/>
    </linearGradient>
    <linearGradient id="ck-bezelG2" x1="0.85" y1="0.95" x2="0.15" y2="0.05">
      <stop offset="0" stop-color="#f0d388"/><stop offset="0.4" stop-color="#a87a30"/><stop offset="1" stop-color="#5a3e16"/>
    </linearGradient>
    <linearGradient id="ck-brassH" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6dc94"/><stop offset="0.45" stop-color="#c8963e"/><stop offset="1" stop-color="#6e4d1c"/>
    </linearGradient>
    <radialGradient id="ck-bossG" cx="38%" cy="32%" r="70%">
      <stop offset="0" stop-color="#fff0bd"/><stop offset="0.4" stop-color="#d2a14a"/><stop offset="1" stop-color="#5e4015"/>
    </radialGradient>
    <linearGradient id="ck-steelG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#46607c"/><stop offset="0.45" stop-color="#1a2330"/><stop offset="0.55" stop-color="#121820"/><stop offset="1" stop-color="#34495f"/>
    </linearGradient>
    <linearGradient id="ck-plateG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2d1d15"/><stop offset="0.5" stop-color="#1d130e"/><stop offset="1" stop-color="#150d09"/>
    </linearGradient>
    <linearGradient id="ck-walnutV" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3a2418"/><stop offset="0.3" stop-color="#6a4229"/><stop offset="0.55" stop-color="#5a3824"/><stop offset="1" stop-color="#2e1c12"/>
    </linearGradient>
    <linearGradient id="ck-walnutH" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a5a37"/><stop offset="0.35" stop-color="#5a3824"/><stop offset="1" stop-color="#2e1c12"/>
    </linearGradient>
    <linearGradient id="ck-colG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2a1a10"/><stop offset="0.3" stop-color="#8a5a37"/><stop offset="0.45" stop-color="#a87650"/><stop offset="0.7" stop-color="#4e3020"/><stop offset="1" stop-color="#22150d"/>
    </linearGradient>
    <linearGradient id="ck-colBrass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5e4015"/><stop offset="0.35" stop-color="#f0d388"/><stop offset="0.6" stop-color="#b8893a"/><stop offset="1" stop-color="#4a3210"/>
    </linearGradient>
    <linearGradient id="ck-cavityG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070403"/><stop offset="0.5" stop-color="#140c08"/><stop offset="1" stop-color="#22150d"/>
    </linearGradient>
    <radialGradient id="ck-bobG" cx="36%" cy="32%" r="72%">
      <stop offset="0" stop-color="#fff2c4"/><stop offset="0.35" stop-color="#d7a84e"/><stop offset="0.8" stop-color="#7a5520"/><stop offset="1" stop-color="#4a3210"/>
    </radialGradient>
    <radialGradient id="ck-glassG" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="#cfe3ff" stop-opacity="0.22"/><stop offset="0.5" stop-color="#8fb3d9" stop-opacity="0.06"/><stop offset="1" stop-color="#0e171b" stop-opacity="0.25"/>
    </radialGradient>
    <radialGradient id="ck-sunG" cx="40%" cy="38%" r="65%">
      <stop offset="0" stop-color="#fff3b8"/><stop offset="0.55" stop-color="#f2c14e"/><stop offset="1" stop-color="#d4832a"/>
    </radialGradient>
    <linearGradient id="ck-beeG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f8d767"/><stop offset="1" stop-color="#d49a26"/>
    </linearGradient>
    <clipPath id="ck-beeClip"><ellipse cx="5" cy="2" rx="15" ry="10"/></clipPath>
    <radialGradient id="ck-roseG" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#d9636a"/><stop offset="0.6" stop-color="#a8323b"/><stop offset="1" stop-color="#6d1c22"/>
    </radialGradient>
    <linearGradient id="ck-waxG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d9caa2"/><stop offset="0.35" stop-color="#fbf4e0"/><stop offset="1" stop-color="#cdbb90"/>
    </linearGradient>
    <radialGradient id="ck-flameGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffcf7a" stop-opacity="0.75"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ck-featherG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3d5566"/><stop offset="0.22" stop-color="#6f8fa2"/><stop offset="0.6" stop-color="#b9ccd4"/><stop offset="1" stop-color="#e6ece8"/>
    </linearGradient>
    <radialGradient id="ck-moonG" cx="40%" cy="36%" r="70%">
      <stop offset="0" stop-color="#fdfbef"/><stop offset="0.6" stop-color="#e3e2d0"/><stop offset="1" stop-color="#aeb3ad"/>
    </radialGradient>
    <radialGradient id="ck-moonHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0.6" stop-color="#8fb3d9" stop-opacity="0.35"/><stop offset="1" stop-color="#8fb3d9" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ck-crescG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff4c2"/><stop offset="0.6" stop-color="#f0cf6a"/><stop offset="1" stop-color="#c6922e"/>
    </linearGradient>
    <radialGradient id="ck-starG" cx="50%" cy="45%" r="60%">
      <stop offset="0" stop-color="#fff6c8"/><stop offset="0.55" stop-color="#ecc865"/><stop offset="1" stop-color="#b8893a"/>
    </radialGradient>
    <radialGradient id="ck-shellG" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#eec48c"/><stop offset="0.55" stop-color="#b8763e"/><stop offset="1" stop-color="#6e3f1e"/>
    </radialGradient>
    <linearGradient id="ck-snailB" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c4c4a2"/><stop offset="1" stop-color="#8a8a68"/>
    </linearGradient>
    <linearGradient id="ck-gildG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f3d890"/><stop offset="0.5" stop-color="#c49440"/><stop offset="1" stop-color="#7a5520"/>
    </linearGradient>
    <radialGradient id="ck-lunaG" cx="50%" cy="40%" r="60%">
      <stop offset="0" stop-color="#d7eed8"/><stop offset="0.6" stop-color="#a8d8b0"/><stop offset="1" stop-color="#6fae8a"/>
    </radialGradient>
    <radialGradient id="ck-vign" cx="50%" cy="42%" r="75%">
      <stop offset="0.38" stop-color="#05080a" stop-opacity="0"/><stop offset="0.75" stop-color="#05080a" stop-opacity="0.6"/><stop offset="1" stop-color="#05080a" stop-opacity="0.9"/>
    </radialGradient>
    <radialGradient id="ck-wallLight" cx="50%" cy="35%" r="55%">
      <stop offset="0" stop-color="#56634f" stop-opacity="0.35"/><stop offset="1" stop-color="#0e171b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ck-iconGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0.45" stop-color="#ffc85a" stop-opacity="0.85"/><stop offset="1" stop-color="#ffb040" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ck-dialWarm" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffdca0" stop-opacity="0.55"/><stop offset="0.7" stop-color="#f3b25a" stop-opacity="0.3"/><stop offset="1" stop-color="#d9822e" stop-opacity="0.35"/>
    </radialGradient>
    <linearGradient id="ck-shaft" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#ffd89a" stop-opacity="0.05"/><stop offset="1" stop-color="#ffd89a" stop-opacity="0.32"/>
    </linearGradient>
    <radialGradient id="ck-pool" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffcf7a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ck-lampR" gradientUnits="userSpaceOnUse" cx="1650" cy="560" r="1250">
      <stop offset="0" stop-color="#ffb55a" stop-opacity="1"/><stop offset="0.5" stop-color="#e0853a" stop-opacity="0.6"/><stop offset="1" stop-color="#e0853a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ck-lampR2" gradientUnits="userSpaceOnUse" cx="1600" cy="520" r="900">
      <stop offset="0" stop-color="#ffcf7a" stop-opacity="0.28"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ck-moonL" gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="900" y2="600">
      <stop offset="0" stop-color="#8fb3d9" stop-opacity="0.3"/><stop offset="1" stop-color="#8fb3d9" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="ck-moonShaftG" gradientUnits="userSpaceOnUse" x1="200" y1="0" x2="1000" y2="900">
      <stop offset="0" stop-color="#cfe3ff" stop-opacity="0.34"/><stop offset="0.55" stop-color="#a9c6ea" stop-opacity="0.2"/><stop offset="1" stop-color="#8fb3d9" stop-opacity="0.04"/>
    </linearGradient>
    <radialGradient id="ck-mothGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fdf6dc" stop-opacity="0.55"/><stop offset="1" stop-color="#fdf6dc" stop-opacity="0"/>
    </radialGradient>
    <pattern id="ck-damask" width="140" height="180" patternUnits="userSpaceOnUse">
      <g fill="#2f3a2e">
        <path d="M70,18 C84,40 98,58 88,80 C82,94 74,98 70,112 C66,98 58,94 52,80 C42,58 56,40 70,18Z"/>
        <path d="M70,112 C76,124 86,128 94,126 C90,134 80,138 70,134 C60,138 50,134 46,126 C54,128 64,124 70,112Z"/>
        <circle cx="70" cy="62" r="5" fill="#3a4637"/>
        <path d="M0,108 C10,124 18,136 12,150 C8,160 3,162 0,172 C-3,162 -8,160 -12,150 C-18,136 -10,124 0,108Z"/>
        <path d="M140,108 C150,124 158,136 152,150 C148,160 143,162 140,172 C137,162 132,160 128,150 C122,136 130,124 140,108Z"/>
        <path d="M22,40 q12,-10 20,4 q-10,-4 -14,6 q-8,-2 -6,-10Z M118,40 q-12,-10 -20,4 q10,-4 14,6 q8,-2 6,-10Z" fill="#2c362b"/>
      </g>
    </pattern>`);
  }

  // ------------------------------------------------------------------ dial icons (drawn around 0,0, ~56px box)
  function spiralPath(cx, cy, rMax, turns) {
    let d = '';
    const n = 70;
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = t * turns * Math.PI * 2 + 0.6, r = 1.2 + rMax * t;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      d += (i ? 'L' : 'M') + f1(x) + ',' + f1(y);
    }
    return d;
  }
  const ICONS = [
    // 0 sun
    () => {
      let rays = '';
      for (let k = 0; k < 16; k++) {
        const a = k * 22.5, L = k % 2 ? 20 : 27, w = 8;
        const p1 = pol(13, a - w), t = pol(L, a), p2 = pol(13, a + w);
        rays += `M${f1(p1[0])},${f1(p1[1])}L${f1(t[0])},${f1(t[1])}L${f1(p2[0])},${f1(p2[1])}Z`;
      }
      return `<path d="${rays}" fill="#e39a34" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
        <circle r="15" fill="url(#ck-sunG)" stroke="${INK}" stroke-width="1.8"/>
        <circle cx="-7.5" cy="3" r="2.6" fill="#e0703f" opacity="0.45"/><circle cx="7.5" cy="3" r="2.6" fill="#e0703f" opacity="0.45"/>
        <path d="M-8,-3 q3,2.6 6,0 M2,-3 q3,2.6 6,0 M-4.5,5 q4.5,3.6 9,0" fill="none" stroke="#6b3410" stroke-width="1.4" stroke-linecap="round"/>`;
    },
    // 1 bee
    () => `<g transform="rotate(-12)">
        <path d="M-5,11 l-3,6 M1,12 l-1,6 M7,11 l2,6" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>
        <ellipse cx="5" cy="2" rx="15" ry="10" fill="url(#ck-beeG)"/>
        <g clip-path="url(#ck-beeClip)" fill="#2a1f14"><rect x="-1" y="-10" width="4.5" height="24"/><rect x="7" y="-10" width="4.5" height="24"/><rect x="15" y="-10" width="8" height="24"/></g>
        <ellipse cx="5" cy="2" rx="15" ry="10" fill="none" stroke="${INK}" stroke-width="1.8"/>
        <path d="M20,1 l7,2 l-7,3Z" fill="${INK}"/>
        <path d="M-15,-4 q-3,-8 -9,-9 M-12,-5 q0,-8 -3,-11" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>
        <circle cx="-24" cy="-13" r="1.6" fill="${INK}"/><circle cx="-15" cy="-16" r="1.6" fill="${INK}"/>
        <circle cx="-12" cy="2" r="7.5" fill="#2e2418" stroke="${INK}" stroke-width="1.6"/>
        <circle cx="-14.5" cy="0" r="1.8" fill="#e8dcc0" opacity="0.7"/>
        <ellipse cx="-1" cy="-13" rx="7" ry="12" transform="rotate(-28 -1 -13)" fill="#eaf5f6" fill-opacity="0.82" stroke="${INK}" stroke-width="1.3"/>
        <ellipse cx="9" cy="-12" rx="6" ry="10" transform="rotate(22 9 -12)" fill="#eaf5f6" fill-opacity="0.82" stroke="${INK}" stroke-width="1.3"/>
        <path d="M-2,-6 q-1,-8 1,-15 M8,-5 q1,-7 3,-12" fill="none" stroke="#7f98a3" stroke-width="0.8"/>
      </g>`,
    // 2 rose
    () => {
      const pet = [0, 72, 144, 216, 288].map(a => pol(8, a + 20, 0, -6));
      const circ = pet.map(p => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="8"/>`).join('');
      return `<path d="M0,4 C3,12 -2,19 1,28" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
        <path d="M0,4 C3,12 -2,19 1,28" fill="none" stroke="#4f6b34" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M1,17 C7,10 15,11 19,14 C13,20 6,21 1,17Z" fill="#5d7a3e" stroke="${INK}" stroke-width="1.3"/>
        <path d="M0,22 C-7,16 -14,17 -18,20 C-12,26 -5,26 0,22Z" fill="#5d7a3e" stroke="${INK}" stroke-width="1.3"/>
        <path d="M3,14 q7,-1 12,0 M-2,21 q-7,-2 -12,-1" stroke="#34482a" stroke-width="0.8" fill="none"/>
        <g fill="${INK}" stroke="${INK}" stroke-width="3.4">${circ}</g>
        <g fill="#a3313a">${circ}</g>
        <circle cx="0" cy="-6" r="9.5" fill="url(#ck-roseG)" stroke="#5e1a1e" stroke-width="1"/>
        <path d="M0,-6 c2,-1 3,2 1,3 c-3,2 -6,-1 -5,-4 c1,-4 7,-5 9,-1 c2,5 -2,10 -7,9 M-9,-9 q2,-7 9,-8" fill="none" stroke="#5a171c" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M-10,-2 q-2,-6 2,-10" stroke="#e98d8d" stroke-width="1.1" fill="none" opacity="0.7"/>`;
    },
    // 3 candle
    () => `<circle cx="0" cy="-19" r="14" fill="url(#ck-flameGlow)"/>
        <path d="M14,17 c8,-1 9,-9 3,-10" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>
        <path d="M14,17 c8,-1 9,-9 3,-10" fill="none" stroke="#c8963e" stroke-width="2.2" stroke-linecap="round"/>
        <ellipse cx="0" cy="21" rx="18" ry="5.5" fill="url(#ck-brassH)" stroke="${INK}" stroke-width="1.6"/>
        <ellipse cx="0" cy="19.5" rx="12" ry="3" fill="#8a6424" opacity="0.6"/>
        <rect x="-8" y="12" width="16" height="7" rx="2" fill="url(#ck-brassH)" stroke="${INK}" stroke-width="1.4"/>
        <rect x="-6" y="-8" width="12" height="21" rx="1.5" fill="url(#ck-waxG)" stroke="${INK}" stroke-width="1.6"/>
        <path d="M-6,-6 q0,7 1.8,7 q1.8,0 1.8,-5 q0,-2 1,-3" fill="#fbf4e0" stroke="${INK}" stroke-width="1"/>
        <ellipse cx="0" cy="-8" rx="6" ry="1.8" fill="#fcf6e4" stroke="${INK}" stroke-width="1.1"/>
        <path d="M0,-8 L0.6,-12.5" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M0,-28 C5,-21 6,-16 0,-12 C-6,-16 -4,-22 0,-28Z" fill="#ffcf7a" stroke="#a8521a" stroke-width="1.1"/>
        <path d="M0,-22.5 C2.2,-19 2.2,-15.5 0,-14.2 C-2.2,-15.5 -2,-19 0,-22.5Z" fill="#fff6d6"/>`,
    // 4 key
    () => `<g transform="rotate(-42)">
        <rect x="-8" y="-2.8" width="34" height="5.6" rx="2" fill="url(#ck-brassH)" stroke="${INK}" stroke-width="1.5"/>
        <path d="M17,2 L17,13 L21,13 L21,9 L24,9 L24,13 L27,13 L27,2Z" fill="url(#ck-brassH)" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
        <rect x="-9.5" y="-5" width="4.5" height="10" rx="1.2" fill="url(#ck-brassH)" stroke="${INK}" stroke-width="1.3"/>
        <circle cx="-17" cy="0" r="10" fill="url(#ck-brassH)" stroke="${INK}" stroke-width="1.7"/>
        <path d="M-17,-5.5 a5.5,5.5 0 1 0 0.01,0Z" fill="#efe4c8" stroke="${INK}" stroke-width="1.3"/>
        <path d="M-17,-10 v-2.5 M-17,10 v2.5 M-27,0 h-2.5" stroke="${INK}" stroke-width="1.3"/>
        <path d="M-23,-5 q3,-4 8,-4.5 M-4,-1.2 h26" stroke="#fff3c8" stroke-width="1" fill="none" opacity="0.8"/>
      </g>`,
    // 5 feather
    () => {
      let barbs = '';
      for (let y = -21; y <= 14; y += 3.5) {
        const w = 7 - Math.abs(y + 4) * 0.18;
        barbs += `M0,${y}L${f1(-w)},${f1(y - 4)}M0,${y}L${f1(w)},${f1(y - 4)}`;
      }
      return `<g transform="rotate(32)">
        <path d="M0,-28 C8,-22 11,-6 8.5,6 C7,13 4,17 1.5,20 L-1.5,20 C-6,14 -9.5,4 -8.5,-8 C-8,-18 -4,-25 0,-28Z" fill="url(#ck-featherG)" stroke="${INK}" stroke-width="1.5"/>
        <path d="${barbs}" stroke="#34495a" stroke-width="0.75" opacity="0.6"/>
        <path d="M8.8,-3 l-5,2.5 M-8.6,6 l4.5,1.5" stroke="#ebe2c8" stroke-width="2" stroke-linecap="round"/>
        <path d="M-3,17 q-5,1 -7,5 M3,17 q4,2 5,6 M-1,19 q-3,3 -2,7" stroke="#b9ccd4" stroke-width="1.1" fill="none" stroke-linecap="round"/>
        <path d="M0,-25 L0,29" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M0,-25 L0,28.5" stroke="#efe6cc" stroke-width="1.5" stroke-linecap="round"/>
      </g>`;
    },
    // 6 full moon
    () => `<circle r="27" fill="url(#ck-moonHalo)"/>
        <circle r="20" fill="url(#ck-moonG)" stroke="${INK}" stroke-width="1.9"/>
        <path d="M-12,-8 c3,-5 9,-5 10,0 c1,5 -4,7 -8,6 c-3,-1 -4,-3 -2,-6Z" fill="#a9ad9c" opacity="0.55"/>
        <path d="M3,2 c4,-3 10,0 9,5 c-1,4 -6,5 -9,2 c-2,-2 -2,-5 0,-7Z" fill="#a9ad9c" opacity="0.5"/>
        <path d="M-7,8 c2,-2 6,-1 5,2 c-1,3 -5,3 -5,-2Z" fill="#a9ad9c" opacity="0.45"/>
        <circle cx="8" cy="-9" r="2.6" fill="none" stroke="#8f9486" stroke-width="0.9"/>
        <circle cx="-2" cy="13" r="1.7" fill="none" stroke="#8f9486" stroke-width="0.8"/>
        <circle cx="13" cy="-2" r="1.3" fill="none" stroke="#8f9486" stroke-width="0.8"/>
        <path d="M-13,-10 a16,16 0 0 1 12,-7" stroke="#ffffff" stroke-width="1.6" fill="none" opacity="0.7" stroke-linecap="round"/>`,
    // 7 bell
    () => `<circle cx="0" cy="-24" r="4.5" fill="none" stroke="${INK}" stroke-width="4.4"/>
        <circle cx="0" cy="-24" r="4.5" fill="none" stroke="#c8963e" stroke-width="2"/>
        <circle cx="0" cy="21" r="4.8" fill="#6e4d1c" stroke="${INK}" stroke-width="1.5"/>
        <path d="M-3,-19 C-11,-19 -13,-10 -13,-2 C-13,8 -15,12 -21,15 L21,15 C15,12 13,8 13,-2 C13,-10 11,-19 3,-19Z" fill="url(#ck-brassH)" stroke="${INK}" stroke-width="1.9" stroke-linejoin="round"/>
        <ellipse cx="0" cy="15.5" rx="21.5" ry="3.6" fill="#7a5520" stroke="${INK}" stroke-width="1.6"/>
        <rect x="-4.5" y="-22" width="9" height="4.5" rx="1.2" fill="#b8893a" stroke="${INK}" stroke-width="1.3"/>
        <path d="M-13,3 q13,4.5 26,0 M-14,7 q14,4.5 28,0" stroke="#6e4d1c" stroke-width="1.1" fill="none"/>
        <path d="M-7,-13 C-9,-5 -9,3 -12,10" stroke="#fff4cc" stroke-width="2.2" fill="none" opacity="0.75" stroke-linecap="round"/>`,
    // 8 crescent moon
    () => `<path d="M-4.09,-20.59 A21,21 0 1 0 15.33,14.35 A20,20 0 0 1 -4.09,-20.59Z" fill="url(#ck-crescG)" stroke="${INK}" stroke-width="1.9" stroke-linejoin="round"/>
        <circle cx="-14" cy="3" r="1.9" fill="none" stroke="#b9892e" stroke-width="0.9"/>
        <circle cx="-9" cy="12" r="1.4" fill="none" stroke="#b9892e" stroke-width="0.8"/>
        <path d="M-9,-15 a18,18 0 0 0 -8,18" stroke="#fffbe6" stroke-width="1.6" fill="none" opacity="0.8" stroke-linecap="round"/>`,
    // 9 star
    () => {
      let pts = '';
      for (let k = 0; k < 10; k++) { const p = pol(k % 2 ? 9.5 : 23, k * 36); pts += (k ? 'L' : 'M') + f1(p[0]) + ',' + f1(p[1] + 1); }
      let facets = '';
      for (let k = 0; k < 5; k++) { const p = pol(23, k * 36 * 2); facets += `M0,1L${f1(p[0])},${f1(p[1] + 1)}`; }
      return `<path d="${pts}Z" fill="url(#ck-starG)" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>
        <path d="${facets}" stroke="#a87a2e" stroke-width="0.9" opacity="0.8"/>
        <path d="M19,-19 l1.2,3.3 3.3,1.2 -3.3,1.2 -1.2,3.3 -1.2,-3.3 -3.3,-1.2 3.3,-1.2Z M-20,15 l1,2.6 2.6,1 -2.6,1 -1,2.6 -1,-2.6 -2.6,-1 2.6,-1Z" fill="#e7c476" stroke="${INK}" stroke-width="0.7"/>`;
    },
    // 10 hourglass
    () => `<path d="M-10,-19 C-10,-7 -2,-4 -2,0 C-2,4 -10,7 -10,19 L10,19 C10,7 2,4 2,0 C2,-4 10,-7 10,-19Z" fill="#dcecee" fill-opacity="0.6" stroke="${INK}" stroke-width="1.4"/>
        <path d="M-7.5,-9 C-5,-6 -2,-4 -1,-1 L1,-1 C2,-4 5,-6 7.5,-9 Q0,-11 -7.5,-9Z" fill="#d9a54a"/>
        <path d="M0,-1 L0,17" stroke="#d9a54a" stroke-width="1.1"/>
        <path d="M-9.5,19 C-6,12 -2,10 0,9.5 C2,10 6,12 9.5,19Z" fill="#d9a54a" stroke="#9a6a2a" stroke-width="0.8"/>
        <path d="M-7,-16 q-1,5 1.5,8" stroke="#ffffff" stroke-width="1.1" fill="none" opacity="0.8"/>
        <rect x="-15" y="-19" width="3.2" height="38" fill="#6b4128" stroke="${INK}" stroke-width="1.1"/>
        <rect x="11.8" y="-19" width="3.2" height="38" fill="#6b4128" stroke="${INK}" stroke-width="1.1"/>
        <rect x="-17" y="-25" width="34" height="6.5" rx="2" fill="#7a4e30" stroke="${INK}" stroke-width="1.5"/>
        <rect x="-17" y="18.5" width="34" height="6.5" rx="2" fill="#7a4e30" stroke="${INK}" stroke-width="1.5"/>
        <path d="M-14,-23 h26 M-14,20.5 h26" stroke="#b07a50" stroke-width="1" opacity="0.8"/>`,
    // 11 snail
    () => `<path d="M-25,16 C-23,12 -19,11 -17,8 C-16,2 -19,-2 -20,-6 C-19,-9 -15,-9 -13,-5 C-11,0 -9,6 -3,9 L20,10.5 C25,12 25,16 20,16.5Z" fill="url(#ck-snailB)" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M-18,-6 L-23,-17 M-15,-6 L-14,-17" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="-23" cy="-17.5" r="2" fill="${INK}"/><circle cx="-14" cy="-17.5" r="2" fill="${INK}"/>
        <circle cx="5" cy="-2" r="13.5" fill="url(#ck-shellG)" stroke="${INK}" stroke-width="1.9"/>
        <path d="${spiralPath(5, -2, 11.5, 2.3)}" fill="none" stroke="#5a3218" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M-3,-11 a12,12 0 0 1 12,-3" stroke="#f8dcb0" stroke-width="1.3" fill="none" opacity="0.8"/>
        <path d="M-20,14 h36" stroke="#e8e8d0" stroke-width="0.9" opacity="0.5"/>`,
  ];
  const ICON_NAMES = ['sun', 'bee', 'rose', 'candle', 'key', 'feather', 'full moon', 'bell', 'crescent moon', 'star', 'hourglass', 'snail'];

  // ------------------------------------------------------------------ hands (pointing up from 0,0)
  const HOUR_PATHS = [
    'M0,15 a7.5,7.5 0 1 0 0.01,0Z M0,18.5 a3.8,3.8 0 1 1 -0.01,0Z',
    'M-4.6,16 L-3.6,-46 L3.6,-46 L4.6,16Z',
    'M0,-43 C-11,-43 -25,-53 -25,-70 C-25,-85 -12,-93 -4,-87 L0,-81 L4,-87 C12,-93 25,-85 25,-70 C25,-53 11,-43 0,-43Z ' +
    'M-3.2,-51 C-10,-52 -19,-59 -19,-70 C-19,-80 -12,-84 -7,-81 L-3.2,-76Z M3.2,-51 C10,-52 19,-59 19,-70 C19,-80 12,-84 7,-81 L3.2,-76Z',
    'M-2.6,-86 L-2,-104 L2,-104 L2.6,-86Z',
    'M0,-127 C4,-119 11.5,-112 9.5,-105.5 C7.5,-100.5 3.5,-102.5 1.6,-103.5 L-1.6,-103.5 C-3.5,-102.5 -7.5,-100.5 -9.5,-105.5 C-11.5,-112 -4,-119 0,-127Z',
  ];
  const MIN_PATHS = [
    'M0,48 C-6.5,48 -7.5,40 -4.2,34 L-2.2,12 L2.2,12 L4.2,34 C7.5,40 6.5,48 0,48Z M0,36 a3,3 0 1 0 0.01,0Z',
    'M-3.6,14 L-2.9,-60 L2.9,-60 L3.6,14Z',
    'M0,-57 L-8,-71.5 L0,-88 L8,-71.5Z M0,-64 L-3.8,-71.5 L0,-80 L3.8,-71.5Z',
    'M-2.8,-86 L-1.9,-178 L1.9,-178 L2.8,-86Z',
    'M0,-216 C6,-207 10.5,-195 6.5,-185 L2.4,-176 L-2.4,-176 L-6.5,-185 C-10.5,-195 -6,-207 0,-216Z M0,-203 C2,-198 2.6,-193 1,-189 L-1,-189 C-2.6,-193 -2,-198 0,-203Z',
  ];
  function handMarkup(paths, fill, stroke, sw) {
    return paths.map(d => `<path d="${d}" fill-rule="evenodd" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`).join('');
  }

  // ------------------------------------------------------------------ gilt corner moth (spandrel)
  // moth motif (head up, ~100 wide): feathery bipectinate antennae, furry body, triangular forewings, rounded hindwings
  function mothMotif(fill, line, vein, bodyFill) {
    let comb = '';
    for (let k = 0; k < 7; k++) {
      const t = k / 6, x = -3 - 12 * t, y = -12 - 17 * t + 3 * t * t, L = 4.2 - 2 * t;
      comb += `M${f1(x)},${f1(y)}l${f1(-L)},${f1(-L * 0.35)}M${f1(x)},${f1(y)}l${f1(L * 0.3)},${f1(-L)}`;
    }
    const half = `
      <path d="M-3,-7 C-16,-17 -34,-22 -52,-21 C-50,-12 -46,-4 -40,1 C-28,4 -14,5 -3,3Z" fill="${fill}"/>
      <path d="M-3,3 C-14,5 -30,8 -34,18 C-35,28 -24,32 -14,27 C-8,23 -4,16 -3,10Z" fill="${fill}"/>
      <path d="M-6,-6 C-18,-12 -32,-15 -46,-17 M-8,0 C-20,-2 -32,-2 -40,0 M-6,6 C-14,10 -22,14 -28,20" fill="none" stroke="${vein}" stroke-width="1.1"/>
      <path d="M-33,-10 a4,4 0 1 0 0.01,0" fill="none" stroke="${vein}" stroke-width="1.2"/>
      <path d="M-3,-12 C-7,-18 -11,-24 -15,-29" fill="none" stroke="${line}" stroke-width="1.3"/>
      <path d="${comb}" stroke="${line}" stroke-width="0.9" fill="none"/>`;
    return `${half}<g transform="scale(-1,1)">${half}</g>
      <ellipse cx="0" cy="-8" rx="5.5" ry="5.5" fill="${bodyFill}"/>
      <path d="M-5.5,-3 C-7,6 -6,16 0,24 C6,16 7,6 5.5,-3 C3,-5 -3,-5 -5.5,-3Z" fill="${bodyFill}"/>
      <path d="M-4,1 h8 M-4.5,6 h9 M-4,11 h8 M-3,16 h6" stroke="${line}" stroke-width="0.9" opacity="0.7"/>
      <path d="M-5,-10 l-2,-1 M5,-10 l2,-1 M-5.5,-5 l-2,0 M5.5,-5 l2,0" stroke="${line}" stroke-width="0.8"/>
      <circle cx="-2.4" cy="-12" r="1.3" fill="${line}"/><circle cx="2.4" cy="-12" r="1.3" fill="${line}"/>`;
  }
  function spandrel(x, y, rot) {
    return `<g transform="translate(${x},${y}) rotate(${rot})" stroke-linejoin="round">
      <g transform="translate(-6,-6) rotate(135) scale(0.8)" stroke="#4a3210" stroke-width="1.5">${mothMotif('url(#ck-gildG)', '#4a3210', '#8a6424', '#d9b060')}</g>
      <path d="M-50,12 c-8,6 -14,20 -6,30 c4,5 12,2 10,-4 M12,-50 c6,-8 20,-14 30,-6 c5,4 2,12 -4,10" fill="none" stroke="#c49440" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M-44,40 c2,8 10,12 16,8 M40,-44 c8,2 12,10 8,16" fill="none" stroke="#c49440" stroke-width="1.8" stroke-linecap="round"/>
    </g>`;
  }

  // painted luna moth on the dial centre
  function lunaMoth(x, y, s) {
    return `<g transform="translate(${x},${y}) scale(${s})" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round">
      <path d="M-4,4 C-14,10 -20,22 -22,40 C-24,48 -18,50 -16,44 C-14,32 -10,20 -3,10Z" fill="url(#ck-lunaG)"/>
      <path d="M4,4 C14,10 20,22 22,40 C24,48 18,50 16,44 C14,32 10,20 3,10Z" fill="url(#ck-lunaG)"/>
      <path d="M-3,-2 C-14,-16 -34,-20 -42,-12 C-44,-2 -30,8 -4,6Z" fill="url(#ck-lunaG)"/>
      <path d="M3,-2 C14,-16 34,-20 42,-12 C44,-2 30,8 4,6Z" fill="url(#ck-lunaG)"/>
      <path d="M-42,-12 C-30,-16 -14,-14 -3,-2 M42,-12 C30,-16 14,-14 3,-2" fill="none" stroke="#8a5a5a" stroke-width="2"/>
      <circle cx="-22" cy="-4" r="3.2" fill="#e9e0c4"/><circle cx="-22" cy="-4" r="1.2" fill="#8a5a5a" stroke="none"/>
      <circle cx="22" cy="-4" r="3.2" fill="#e9e0c4"/><circle cx="22" cy="-4" r="1.2" fill="#8a5a5a" stroke="none"/>
      <ellipse cx="0" cy="3" rx="3.4" ry="11" fill="#f1ecd8"/>
      <path d="M-1.5,-7 q-4,-8 -10,-9 M1.5,-7 q4,-8 10,-9" fill="none" stroke="#8a6a3a" stroke-width="1.3"/>
    </g>`;
  }

  // ------------------------------------------------------------------ state
  const ang = { h: START_H * 30, m: START_M * 30 };   // current displayed (unwrapped) angles
  const lift = { h: 0, m: 0 };                          // 0..1 "picked up" amount per hand
  let drag = null, animating = false, swinging = false, swingStart = 0, saidEnter = false;
  let active = null, hovered = null, hoverIcon = null, askedWhich = false;
  let V = {}, WO = {};   // element refs for the view / wall object

  function posOf(which) { const f = G.get(which === 'h' ? 'clockH' : 'clockM'); return typeof f === 'number' ? f : (which === 'h' ? START_H : START_M); }

  // generic hinged-door transform (hinge on the left edge). Past 90deg the back face shows, left of the hinge.
  function applyDoor(R, D, deg, thick) {
    const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
    const hx = D.x, cy = D.y + D.h / 2;
    R.front.style.display = c >= 0 ? '' : 'none';
    R.back.style.display = c < 0 ? '' : 'none';
    const k = s * 0.045 * (c >= 0 ? 1 : -1);
    const m = deg ? `translate(${hx},${cy}) matrix(${c.toFixed(4)},${(-k).toFixed(4)},0,${(1 + s * 0.05).toFixed(4)},0,0) translate(${-hx},${-cy})` : '';
    R.front.setAttribute('transform', m);
    R.back.setAttribute('transform', m);
    if (R.fshade) R.fshade.setAttribute('opacity', (s * 0.5).toFixed(3));
    const T = thick * s, ex = hx + D.w * c;
    R.edge.setAttribute('x', f1(c >= 0 ? ex : ex - T));
    R.edge.setAttribute('width', f1(deg > 0.5 ? T : 0));
    R.edge.setAttribute('transform', `translate(0,${f1(-k * D.w * c * 0.5)})`);
  }

  // ------------------------------------------------------------------ WALL OBJECT (north)
  const WD = { x: 356, y: 362, w: 88, h: 322 };
  function buildWall(g) {
    ensureDefs();
    const cx = W.cx, dy = W.dialY;
    let icons = '';
    for (let i = 0; i < 12; i++) {
      const p = pol(42, i * 30, cx, dy);
      icons += `<g transform="translate(${f1(p[0])},${f1(p[1])}) scale(0.25)">${ICONS[i]()}</g>`;
    }
    const root = G.svg(`
      <rect x="318" y="140" width="176" height="660" rx="10" fill="#000" opacity="0.5" filter="url(#ck-blur12)" transform="translate(10,6)"/>
      <!-- base -->
      <path d="M318,712 L482,712 L486,722 L486,786 L478,786 L478,800 L458,800 L458,790 L342,790 L342,800 L322,800 L322,786 L314,786 L314,722Z" fill="url(#ck-walnutV)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" filter="url(#ck-grainV)"/>
      <rect x="334" y="728" width="132" height="48" rx="3" fill="#4a2e1e" stroke="${INK}" stroke-width="1.6"/>
      <rect x="340" y="734" width="120" height="36" rx="2" fill="none" stroke="#8a5a37" stroke-width="1" opacity="0.7"/>
      <path d="M318,712 h164" stroke="#9a6a44" stroke-width="2" opacity="0.8"/>
      <!-- trunk -->
      <rect x="342" y="338" width="116" height="376" fill="url(#ck-walnutV)" stroke="${INK}" stroke-width="2.5" filter="url(#ck-grainV)"/>
      <path d="M346,344 v364 M454,344 v364" stroke="#8a5a37" stroke-width="1.2" opacity="0.6"/>
      <g class="ck-wcavity">
        <rect x="${WD.x}" y="${WD.y}" width="${WD.w}" height="${WD.h}" fill="url(#ck-cavityG)" stroke="${INK}" stroke-width="1.5"/>
        <path d="M372,362 v322 M388,362 v322 M412,362 v322 M428,362 v322" stroke="#2a1a10" stroke-width="1" opacity="0.8"/>
        <path d="M368,362 v8 M432,362 v4" stroke="#8a6a3a" stroke-width="1"/>
        <rect x="363" y="370" width="10" height="58" rx="2" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="1"/>
        <rect x="427" y="366" width="10" height="52" rx="2" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="1"/>
        <g class="ck-wpend">
          <path d="M400,362 L400,430" stroke="#c8963e" stroke-width="2"/>
          <circle cx="400" cy="440" r="11" fill="url(#ck-bobG)" stroke="${INK}" stroke-width="1.5"/>
        </g>
        <path d="M356,662 h88 v10 h-88Z" fill="#5a3824" stroke="${INK}" stroke-width="1"/>
        <ellipse cx="402" cy="660" rx="34" ry="6" fill="#ffcf7a" opacity="0.18" class="ck-wpool"/>
        <g class="ck-wmb"><g transform="translate(374,634) scale(0.5)">${matchboxBody()}</g></g>
      </g>
      <g class="ck-wdoor">
        <g class="ck-wfront">
          <path d="M356,362 h88 v322 h-88Z M400,425 a15,15 0 1 0 0.01,0Z" fill-rule="evenodd" fill="url(#ck-walnutV)" stroke="${INK}" stroke-width="2" filter="url(#ck-grainV)"/>
          <rect x="366" y="480" width="68" height="186" rx="4" fill="none" stroke="#2a1a10" stroke-width="2"/>
          <rect x="368" y="482" width="64" height="182" rx="3" fill="none" stroke="#8a5a37" stroke-width="1" opacity="0.7"/>
          <circle cx="400" cy="440" r="15" fill="url(#ck-glassG)"/>
          <circle cx="400" cy="440" r="16.5" fill="none" stroke="url(#ck-brassH)" stroke-width="3.5"/>
          <circle cx="400" cy="440" r="18.5" fill="none" stroke="${INK}" stroke-width="1.2"/>
          <path d="M391,432 a12,12 0 0 1 9,-5" stroke="#fff" stroke-width="1.2" fill="none" opacity="0.5"/>
          <path d="M436,540 m-3,0 a3,3 0 1 0 6,0 a3,3 0 1 0 -6,0 M436,543 l0,6" stroke="${INK}" stroke-width="1.2" fill="#6e4d1c"/>
          <g transform="translate(400,560) scale(0.42)" fill="#4a2e1e" stroke="#20140c" stroke-width="2.4"><path d="M-2,0 C-12,-16 -38,-22 -48,-12 C-50,-4 -36,6 -18,4 C-30,8 -34,20 -24,22 C-12,22 -6,12 -2,6Z"/><path d="M2,0 C12,-16 38,-22 48,-12 C50,-4 36,6 18,4 C30,8 34,20 24,22 C12,22 6,12 2,6Z"/><ellipse cx="0" cy="3" rx="3.5" ry="12" fill="#6a4229"/></g>
          <rect class="ck-wfshade" x="356" y="362" width="88" height="322" fill="#000" opacity="0" pointer-events="none"/>
        </g>
        <g class="ck-wback" style="display:none">
          <rect x="356" y="362" width="88" height="322" fill="#3a2418" stroke="${INK}" stroke-width="2" filter="url(#ck-grainV)"/>
          <rect x="360" y="380" width="80" height="10" fill="#4e3020" stroke="${INK}" stroke-width="1"/>
          <rect x="360" y="650" width="80" height="10" fill="#4e3020" stroke="${INK}" stroke-width="1"/>
          <circle cx="400" cy="440" r="15" fill="#0c0806" stroke="${INK}" stroke-width="1.5"/>
          <rect x="356" y="362" width="88" height="322" fill="#000" opacity="0.35"/>
        </g>
        <rect class="ck-wedge" x="444" y="362" width="0" height="322" fill="#7a4e30" stroke="${INK}" stroke-width="1"/>
      </g>
      <!-- hood base moulding -->
      <path d="M312,322 h176 l-6,10 h-164Z" fill="url(#ck-walnutH)" stroke="${INK}" stroke-width="2"/>
      <path d="M318,332 h164 l-8,10 h-148Z" fill="#3a2418" stroke="${INK}" stroke-width="1.8"/>
      <!-- hood -->
      <rect x="318" y="176" width="164" height="148" fill="url(#ck-walnutV)" stroke="${INK}" stroke-width="2.5" filter="url(#ck-grainV)"/>
      <rect x="334" y="184" width="132" height="132" fill="url(#ck-plateG)" stroke="#b8893a" stroke-width="1.5"/>
      <g transform="translate(400,250) scale(0.26)">
        ${spandrel(-222, -222, 0)}${spandrel(222, -222, 90)}${spandrel(222, 222, 180)}${spandrel(-222, 222, 270)}
      </g>
      <rect x="320" y="182" width="12" height="138" fill="url(#ck-colG)" stroke="${INK}" stroke-width="1.5"/>
      <rect x="468" y="182" width="12" height="138" fill="url(#ck-colG)" stroke="${INK}" stroke-width="1.5"/>
      <rect x="318" y="178" width="16" height="7" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="1.2"/>
      <rect x="466" y="178" width="16" height="7" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="1.2"/>
      <rect x="318" y="314" width="16" height="7" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="1.2"/>
      <rect x="466" y="314" width="16" height="7" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="1.2"/>
      <!-- pediment with swan necks -->
      <path d="M312,178 L312,166 C330,164 344,150 360,146 C376,142 386,150 386,160 L414,160 C414,150 424,142 440,146 C456,150 470,164 488,166 L488,178Z" fill="url(#ck-walnutH)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" filter="url(#ck-grainH)"/>
      <path d="M318,170 C334,166 346,154 362,151 C374,149 380,154 380,160 M482,170 C466,166 454,154 438,151 C426,149 420,154 420,160" fill="none" stroke="#9a6a44" stroke-width="1.5"/>
      <circle cx="380" cy="160" r="4" fill="#5a3824" stroke="${INK}" stroke-width="1.3"/><circle cx="420" cy="160" r="4" fill="#5a3824" stroke="${INK}" stroke-width="1.3"/>
      <circle cx="318" cy="158" r="6.5" fill="url(#ck-bossG)" stroke="${INK}" stroke-width="1.4"/>
      <circle cx="482" cy="158" r="6.5" fill="url(#ck-bossG)" stroke="${INK}" stroke-width="1.4"/>
      <path d="M318,151 l0,-8 M482,151 l0,-8" stroke="${INK}" stroke-width="2"/>
      <circle cx="318" cy="141" r="2.5" fill="#e7c476" stroke="${INK}"/><circle cx="482" cy="141" r="2.5" fill="#e7c476" stroke="${INK}"/>
      <!-- carved moth crest -->
      <g transform="translate(400,140) scale(0.95)" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" filter="url(#ck-grainH)">
        ${mothMotif('url(#ck-walnutH)', INK, '#a87650', '#6a4229')}
      </g>
      <!-- dial -->
      <circle cx="${cx}" cy="${dy}" r="60" fill="url(#ck-bezelG)" stroke="${INK}" stroke-width="2"/>
      <circle cx="${cx}" cy="${dy}" r="54" fill="url(#ck-enamelG)" stroke="#6e4d1c" stroke-width="1.5"/>
      <circle cx="${cx}" cy="${dy}" r="52" fill="none" stroke="#3a2a1c" stroke-width="0.6"/>
      <circle cx="${cx}" cy="${dy}" r="28" fill="none" stroke="#8a6a3a" stroke-width="0.6"/>
      ${icons}
      <path d="${pol(54, 137, cx, dy).map(f1).join(',').replace(/^/, 'M')} L${pol(40, 133, cx, dy).map(f1).join(',')} L${pol(30, 139, cx, dy).map(f1).join(',')}" stroke="#4a3b2a" stroke-width="0.7" fill="none"/>
      <g class="ck-wh" stroke="${INK}" stroke-width="1">
        <path d="M-2.4,5 L-1.6,-15 C-8,-15 -8,-24 -2,-23.5 L0,-31 L2,-23.5 C8,-24 8,-15 1.6,-15 L2.4,5Z" fill="#1a2330"/>
      </g>
      <g class="ck-wm" stroke="${INK}" stroke-width="0.8">
        <path d="M-1.6,8 L-0.8,-44 L0,-50 L0.8,-44 L1.6,8Z" fill="#1a2330"/>
      </g>
      <circle cx="${cx}" cy="${dy}" r="3.5" fill="url(#ck-bossG)" stroke="${INK}" stroke-width="1"/>
      <path d="M352,212 a58,58 0 0 1 44,-20" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.18" stroke-linecap="round"/>
      <path d="M350,346 v360" stroke="#c89468" stroke-width="3" opacity="0.18"/>
    `, g);
    WO.root = root;
    WO.h = root.querySelector('.ck-wh');
    WO.m = root.querySelector('.ck-wm');
    WO.pend = root.querySelector('.ck-wpend');
    WO.mb = root.querySelector('.ck-wmb');
    WO.pool = root.querySelector('.ck-wpool');
    WO.door = { front: root.querySelector('.ck-wfront'), back: root.querySelector('.ck-wback'), edge: root.querySelector('.ck-wedge'), fshade: root.querySelector('.ck-wfshade') };
    const hit = G.el('rect', { x: 306, y: 108, width: 188, height: 694, fill: 'transparent', 'pointer-events': 'all' }, g);
    G.hotspot(hit, { cursor: 'look', click() { G.go('clock'); } });
  }
  function updateWall() {
    if (!WO.root) return;
    const solved = !!G.get('clockSolved');
    const h = solved ? SOL_H : posOf('h'), m = solved ? SOL_M : posOf('m');
    WO.h.setAttribute('transform', `translate(${W.cx},${W.dialY}) rotate(${h * 30})`);
    WO.m.setAttribute('transform', `translate(${W.cx},${W.dialY}) rotate(${m * 30})`);
    applyDoor(WO.door, WD, solved ? OPEN_DEG : 0, 6);
    WO.mb.style.display = solved && !G.get('gotMatches') ? '' : 'none';
    WO.pool.style.display = solved ? '' : 'none';
    ensureLoop();
  }

  // ------------------------------------------------------------------ CLOSE-UP VIEW
  function buildView(g) {
    ensureDefs();
    let icons = '', medallions = '', florets = '', lits = '';
    for (let i = 0; i < 12; i++) {
      const p = pol(R_ICON, i * 30, CX, CY);
      const X = f1(p[0]), Y = f1(p[1]);
      medallions += `<circle cx="${X}" cy="${Y}" r="33" fill="#f7f0dc" fill-opacity="0.55" stroke="#8a6a3a" stroke-width="1.3"/>
                     <circle cx="${X}" cy="${Y}" r="29.5" fill="none" stroke="#8a6a3a" stroke-width="0.6" stroke-dasharray="2 2.5"/>`;
      lits += `<g class="ck-lit" data-i="${i}" style="opacity:0;transition:opacity .35s ease">
                 <circle cx="${X}" cy="${Y}" r="60" fill="url(#ck-iconGlow)"/>
                 <circle cx="${X}" cy="${Y}" r="33" fill="#ffe2a0" fill-opacity="0.55" stroke="#d9982e" stroke-width="3.2"/>
               </g>`;
      icons += `<g class="ck-icon" data-i="${i}" transform="translate(${X},${Y}) scale(1.1)">${ICONS[i]()}</g>`;
      const q = pol(R_ICON + 2, i * 30 + 15, CX, CY);
      florets += `<g transform="translate(${f1(q[0])},${f1(q[1])}) rotate(${i * 30 + 15})"><path d="M0,-6 L2,0 L0,6 L-2,0Z" fill="#b8893a" stroke="#6e4d1c" stroke-width="0.6"/><circle r="1.4" fill="#6e4d1c"/></g>`;
    }
    let ticks = '';
    for (let k = 0; k < 60; k++) {
      const a = k * 6, big = k % 5 === 0;
      const p1 = pol(big ? 202 : 206, a, CX, CY), p2 = pol(big ? 220 : 216, a, CX, CY);
      ticks += `M${f1(p1[0])},${f1(p1[1])}L${f1(p2[0])},${f1(p2[1])}`;
    }
    let dots = '';
    for (let k = 0; k < 12; k++) { const p = pol(211, k * 30, CX, CY); dots += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="3.4" fill="#2a1f14"/>`; }
    let beads = '';
    for (let k = 0; k < 90; k++) { const p = pol(241, k * 4, CX, CY); beads += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="3.1"/>`; }
    const crackPts = [[226, 139], [214, 140.5], [203, 138], [192, 139.5], [181, 137.2], [168, 135.8], [150, 137.5], [134, 134], [121, 135.5], [108, 131]];
    const crack = 'M' + crackPts.map(p => pol(p[0], p[1], CX, CY).map(f1).join(',')).join('L');
    const crackB = 'M' + [[181, 137.2], [176, 141], [168, 142.6], [161, 146]].map(p => pol(p[0], p[1], CX, CY).map(f1).join(',')).join('L');
    // wainscot panels
    let panels = '';
    for (let x = -60; x < 1600; x += 250) {
      panels += `<rect x="${x + 16}" y="748" width="218" height="140" rx="3" fill="url(#gPanel)" stroke="${INK}" stroke-width="2"/>
                 <path d="M${x + 22},754 h206" stroke="#6a4229" stroke-width="1.4" opacity="0.6"/>
                 <path d="M${x + 22},882 h206" stroke="#0e0906" stroke-width="2" opacity="0.7"/>`;
    }
    const D = DOOR;
    const root = G.svg(`
      <!-- surroundings: same wallpaper + dado as the room, seen closer -->
      <rect x="0" y="0" width="1600" height="900" fill="#3e4b3c"/>
      <g transform="scale(1.45)"><rect x="0" y="0" width="1104" height="476" fill="url(#pWall)"/></g>
      <rect x="0" y="0" width="1600" height="700" fill="url(#gWallTone)"/>
      <rect x="0" y="690" width="1600" height="210" fill="#22160e"/>
      ${panels}
      <rect x="0" y="708" width="1600" height="26" fill="url(#gRailShadow)"/>
      <rect x="-4" y="686" width="1608" height="24" fill="url(#gBeam)" stroke="${INK}" stroke-width="2"/>
      <path d="M0,690 h1600" stroke="#a87650" stroke-width="1.8" opacity="0.55"/>
      <path d="M0,709 h1600" stroke="#1a100a" stroke-width="1.4" opacity="0.7"/>
      <g class="ck-clock">
      <!-- clock drop shadow on the wall -->
      <path d="M470,-10 h660 v590 h-120 v330 h-420 v-330 h-120Z" fill="#000" opacity="0.6" filter="url(#ck-blur12)" transform="translate(16,10)"/>
      <!-- trunk -->
      <rect x="600" y="570" width="400" height="340" fill="url(#ck-walnutV)" stroke="${INK}" stroke-width="3" filter="url(#ck-grainV)"/>
      <rect x="606" y="590" width="30" height="320" fill="url(#ck-colG)" stroke="${INK}" stroke-width="2" opacity="0.9"/>
      <rect x="964" y="590" width="30" height="320" fill="url(#ck-colG)" stroke="${INK}" stroke-width="2" opacity="0.9"/>
      <path d="M614,600 v300 M621,600 v300 M628,600 v300 M972,600 v300 M979,600 v300 M986,600 v300" stroke="#1c120b" stroke-width="1.2" opacity="0.55"/>
      <path d="M${D.x - 10},${D.y - 10} h${D.w + 20} v${D.h + 20} h-${D.w + 20}Z" fill="#241610" stroke="${INK}" stroke-width="2"/>
      <!-- cavity (behind the door) -->
      <g class="ck-cavity">
        <rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" fill="url(#ck-cavityG)"/>
        <path d="M690,${D.y}v${D.h} M728,${D.y}v${D.h} M766,${D.y}v${D.h} M834,${D.y}v${D.h} M872,${D.y}v${D.h} M910,${D.y}v${D.h}" stroke="#2a1a10" stroke-width="1.5" opacity="0.7"/>
        <g><path d="M702,${D.y} v16" stroke="#8a6a3a" stroke-width="1.5"/><rect x="690" y="${D.y + 16}" width="26" height="96" rx="4" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="1.6"/><path d="M690,${D.y + 28} h26 M690,${D.y + 100} h26" stroke="#5e4015" stroke-width="1.5"/></g>
        <g><path d="M898,${D.y} v8" stroke="#8a6a3a" stroke-width="1.5"/><rect x="885" y="${D.y + 8}" width="26" height="96" rx="4" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="1.6"/><path d="M885,${D.y + 20} h26 M885,${D.y + 92} h26" stroke="#5e4015" stroke-width="1.5"/></g>
        <g class="ck-pend">
          <path d="M800,${D.y - 2} L800,${LEN.y - 22}" stroke="#6e4d1c" stroke-width="5"/>
          <path d="M800,${D.y - 2} L800,${LEN.y - 22}" stroke="#c8963e" stroke-width="2"/>
          <circle cx="${LEN.x}" cy="${LEN.y}" r="31" fill="url(#ck-bobG)" stroke="${INK}" stroke-width="2"/>
          <circle cx="${LEN.x}" cy="${LEN.y}" r="22" fill="none" stroke="#7a5520" stroke-width="1.2" opacity="0.7"/>
          <path d="M${LEN.x - 17},${LEN.y - 13} a21,21 0 0 1 15,-11" stroke="#fff6d6" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/>
        </g>
        <g class="ck-rewardLight" style="opacity:0;transition:opacity 1.4s ease">
          <path d="M${D.x},${D.y} L${D.x + 90},${D.y} L${D.x + 250},${SHELF_Y} L${D.x + 40},${SHELF_Y}Z" fill="url(#ck-shaft)" style="mix-blend-mode:screen"/>
          <ellipse cx="812" cy="${SHELF_Y}" rx="130" ry="20" fill="url(#ck-pool)" style="mix-blend-mode:screen"/>
        </g>
        <path d="M${D.x},${SHELF_Y} h${D.w} v18 h-${D.w}Z" fill="#4a2e1e" stroke="${INK}" stroke-width="1.5"/>
        <path d="M${D.x},${SHELF_Y} h${D.w}" stroke="#8a5a37" stroke-width="2"/>
        <rect x="${D.x}" y="${SHELF_Y + 18}" width="${D.w}" height="14" fill="#000" opacity="0.55" filter="url(#ck-blur3)"/>
        <rect x="${D.x}" y="${D.y}" width="${D.w}" height="18" fill="#000" opacity="0.5" filter="url(#ck-blur3)"/>
        <g class="ck-matchbox"></g>
      </g>
      <!-- the door -->
      <g class="ck-door">
        <g class="ck-doorFront">
          <path d="M${D.x},${D.y} h${D.w} v${D.h} h-${D.w}Z M${LEN.x},${LEN.y - LEN.r} a${LEN.r},${LEN.r} 0 1 0 0.01,0Z" fill-rule="evenodd" fill="url(#ck-walnutV)" stroke="${INK}" stroke-width="2.5" filter="url(#ck-grainV)"/>
          <circle cx="${LEN.x}" cy="${LEN.y}" r="${LEN.r}" fill="url(#ck-glassG)"/>
          <path d="M${LEN.x - 25},${LEN.y - 19} a31,31 0 0 1 23,-16" stroke="#e6f0ff" stroke-width="3" fill="none" opacity="0.35" stroke-linecap="round"/>
          <path d="M${LEN.x + 23},${LEN.y + 17} a29,29 0 0 1 -10,10" stroke="#e6f0ff" stroke-width="2" fill="none" opacity="0.2" stroke-linecap="round"/>
          <circle cx="${LEN.x}" cy="${LEN.y}" r="${LEN.r + 4}" fill="none" stroke="${INK}" stroke-width="10"/>
          <circle cx="${LEN.x}" cy="${LEN.y}" r="${LEN.r + 4}" fill="none" stroke="url(#ck-bezelG)" stroke-width="7"/>
          <circle cx="${LEN.x}" cy="${LEN.y}" r="${LEN.r + 9}" fill="none" stroke="#2a1a10" stroke-width="1.5"/>
          <rect x="${D.x + 16}" y="${D.y + 150}" width="${D.w - 32}" height="66" rx="5" fill="#4a2e1e" stroke="#20140c" stroke-width="2"/>
          <rect x="${D.x + 20}" y="${D.y + 154}" width="${D.w - 40}" height="58" rx="4" fill="none" stroke="#8a5a37" stroke-width="1.2" opacity="0.7"/>
          <g transform="translate(800,${D.y + 183})" stroke="#20140c" stroke-width="1.3" stroke-linejoin="round">
            <path d="M-2,0 C-12,-16 -38,-22 -48,-12 C-50,-4 -36,6 -18,4 C-30,8 -34,20 -24,22 C-12,22 -6,12 -2,6Z" fill="#5e3b26"/>
            <path d="M2,0 C12,-16 38,-22 48,-12 C50,-4 36,6 18,4 C30,8 34,20 24,22 C12,22 6,12 2,6Z" fill="#5e3b26"/>
            <path d="M-8,-4 C-18,-12 -32,-16 -42,-12 M8,-4 C18,-12 32,-16 42,-12" fill="none" stroke="#8a5a37" stroke-width="1"/>
            <ellipse cx="0" cy="3" rx="3.5" ry="12" fill="#6a4229"/>
          </g>
          <g transform="translate(${D.x + D.w - 26},${D.y + 104})">
            <path d="M-8,-14 C-8,-20 8,-20 8,-14 L9,14 C9,20 -9,20 -9,14Z" fill="url(#ck-brassH)" stroke="${INK}" stroke-width="1.6"/>
            <path d="M0,-6 m-3,0 a3,3 0 1 0 6,0 a3,3 0 1 0 -6,0 M-1.4,-4 L-2.4,6 L2.4,6 L1.4,-4Z" fill="${INK}"/>
          </g>
          <rect x="${D.x - 3}" y="${D.y + 18}" width="9" height="28" rx="2" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="1.3"/>
          <rect x="${D.x - 3}" y="${D.y + D.h - 46}" width="9" height="28" rx="2" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="1.3"/>
          <path d="M${D.x + 6},${D.y + 6} v${D.h - 12}" stroke="#c89468" stroke-width="2" opacity="0.22"/>
          <rect class="ck-doorFrontShade" x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" fill="#000" opacity="0" pointer-events="none"/>
        </g>
        <g class="ck-doorBack" style="display:none">
          <rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" fill="#3e2618" stroke="${INK}" stroke-width="2.5" filter="url(#ck-grainV)"/>
          <rect x="${D.x + 10}" y="${D.y + 22}" width="${D.w - 20}" height="16" fill="#4e3020" stroke="${INK}" stroke-width="1.5"/>
          <rect x="${D.x + 10}" y="${D.y + D.h - 38}" width="${D.w - 20}" height="16" fill="#4e3020" stroke="${INK}" stroke-width="1.5"/>
          <circle cx="${LEN.x}" cy="${LEN.y}" r="${LEN.r}" fill="#0c0806" stroke="${INK}" stroke-width="2"/>
          <rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" fill="#000" opacity="0.3"/>
        </g>
        <rect class="ck-doorEdge" x="0" y="${D.y}" width="0" height="${D.h}" fill="#7a4e30" stroke="${INK}" stroke-width="1.5"/>
      </g>
      <!-- hood base moulding -->
      <path d="M440,540 h720 l-10,18 h-700Z" fill="url(#ck-walnutH)" stroke="${INK}" stroke-width="2.5" filter="url(#ck-grainH)"/>
      <path d="M450,558 h700 l-14,14 h-672Z" fill="#3a2418" stroke="${INK}" stroke-width="2"/>
      <path d="M464,572 h672 l-40,14 h-592Z" fill="#2a1a10" stroke="${INK}" stroke-width="2"/>
      <path d="M446,543 h708" stroke="#b07a50" stroke-width="2" opacity="0.6"/>
      <!-- hood -->
      <rect x="462" y="-10" width="676" height="552" fill="url(#ck-walnutV)" stroke="${INK}" stroke-width="3" filter="url(#ck-grainV)"/>
      <rect x="536" y="26" width="528" height="528" fill="#000" opacity="0.55" filter="url(#ck-blur3)"/>
      <rect x="540" y="30" width="520" height="506" fill="url(#ck-plateG)" stroke="${INK}" stroke-width="2.5"/>
      <rect x="550" y="40" width="500" height="486" fill="none" stroke="#b8893a" stroke-width="1.6" opacity="0.85"/>
      <rect x="555" y="45" width="490" height="476" fill="none" stroke="#6e4d1c" stroke-width="0.8"/>
      ${spandrel(582, 72, 0)}${spandrel(1018, 72, 90)}${spandrel(1018, 494, 180)}${spandrel(582, 494, 270)}
      <!-- columns -->
      <g>
        <rect x="478" y="30" width="46" height="506" fill="url(#ck-colG)" stroke="${INK}" stroke-width="2.5"/>
        <path d="M490,70 v430 M501,70 v430 M512,70 v430" stroke="#1c120b" stroke-width="1.4" opacity="0.5"/>
        <rect x="472" y="20" width="58" height="34" rx="3" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="2"/>
        <path d="M472,30 h58 M472,44 h58" stroke="#5e4015" stroke-width="1.5"/>
        <rect x="472" y="508" width="58" height="30" rx="3" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="2"/>
        <path d="M472,520 h58" stroke="#5e4015" stroke-width="1.5"/>
        <rect x="1076" y="30" width="46" height="506" fill="url(#ck-colG)" stroke="${INK}" stroke-width="2.5"/>
        <path d="M1088,70 v430 M1099,70 v430 M1110,70 v430" stroke="#1c120b" stroke-width="1.4" opacity="0.5"/>
        <rect x="1070" y="20" width="58" height="34" rx="3" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="2"/>
        <path d="M1070,30 h58 M1070,44 h58" stroke="#5e4015" stroke-width="1.5"/>
        <rect x="1070" y="508" width="58" height="30" rx="3" fill="url(#ck-colBrass)" stroke="${INK}" stroke-width="2"/>
        <path d="M1070,520 h58" stroke="#5e4015" stroke-width="1.5"/>
      </g>
      <!-- top rail -->
      <rect x="450" y="-10" width="700" height="30" fill="url(#ck-walnutH)" stroke="${INK}" stroke-width="2.5" filter="url(#ck-grainH)"/>
      <path d="M460,8 h680" stroke="#2a1a10" stroke-width="2" stroke-dasharray="10 8"/>
      <!-- dial -->
      <circle cx="${CX}" cy="${CY + 6}" r="254" fill="#000" opacity="0.6" filter="url(#ck-blur12)"/>
      <circle cx="${CX}" cy="${CY}" r="252" fill="url(#ck-bezelG)" stroke="${INK}" stroke-width="3"/>
      <circle cx="${CX}" cy="${CY}" r="247" fill="none" stroke="url(#ck-bezelG2)" stroke-width="4" opacity="0.8"/>
      <g fill="url(#ck-brassH)" stroke="#5e4015" stroke-width="0.8">${beads}</g>
      <circle cx="${CX}" cy="${CY}" r="234" fill="url(#ck-bezelG2)" stroke="${INK}" stroke-width="2"/>
      <circle cx="${CX}" cy="${CY}" r="${R_EN + 1}" fill="${INK}"/>
      <g class="ck-face">
        <circle cx="${CX}" cy="${CY}" r="${R_EN}" fill="url(#ck-enamelG)" filter="url(#ck-enamelTex)"/>
        <ellipse cx="${CX + 150}" cy="${CY - 120}" rx="60" ry="40" fill="url(#ck-stain)"/>
        <ellipse cx="${CX - 130}" cy="${CY + 150}" rx="70" ry="45" fill="url(#ck-stain)"/>
        <ellipse cx="${CX - 170}" cy="${CY - 60}" rx="30" ry="50" fill="url(#ck-stain)" opacity="0.7"/>
        <circle class="ck-warm" cx="${CX}" cy="${CY}" r="${R_EN}" fill="url(#ck-dialWarm)" style="opacity:0"/>
        <circle cx="${CX}" cy="${CY}" r="222" fill="none" stroke="#2a1f14" stroke-width="1.6"/>
        <circle cx="${CX}" cy="${CY}" r="200" fill="none" stroke="#2a1f14" stroke-width="1.2"/>
        <circle cx="${CX}" cy="${CY}" r="196" fill="none" stroke="#8a6a3a" stroke-width="0.6"/>
        <path d="${ticks}" stroke="#2a1f14" stroke-width="1.3"/>
        ${dots}
        <circle cx="${CX}" cy="${CY}" r="118" fill="none" stroke="#8a6a3a" stroke-width="1"/>
        <circle cx="${CX}" cy="${CY}" r="114" fill="none" stroke="#8a6a3a" stroke-width="0.5"/>
        ${medallions}${lits}${florets}
        <g opacity="0.72">${lunaMoth(CX, CY - 60, 0.95)}</g>
        <text x="${CX - 5}" y="${CY + 68}" font-family="IM Fell English, Georgia, serif" font-style="italic" font-size="24" fill="#3a2a1c" text-anchor="end">Jos.</text>
        <text x="${CX + 7}" y="${CY + 68}" font-family="IM Fell English, Georgia, serif" font-style="italic" font-size="24" fill="#3a2a1c" text-anchor="start">Vane</text>
        <path d="M${CX - 46},${CY + 78} q46,8 92,0" stroke="#6e5438" stroke-width="0.9" fill="none"/>
        <text x="${CX + 2}" y="${CY + 96}" font-family="IM Fell English SC, IM Fell English, Georgia, serif" font-size="12" letter-spacing="5" fill="#5a4630" text-anchor="middle">LONDON</text>
        ${icons}
        <path d="${crack}" stroke="#fffaf0" stroke-width="1.2" fill="none" opacity="0.5" transform="translate(0.8,0.8)"/>
        <path d="${crack}" stroke="#3a2c1e" stroke-width="1.1" fill="none" stroke-linejoin="round"/>
        <path d="${crackB}" stroke="#3a2c1e" stroke-width="0.8" fill="none"/>
        <circle cx="${CX}" cy="${CY}" r="${R_EN}" fill="none" stroke="#000" stroke-width="12" opacity="0.18" filter="url(#ck-blur3)"/>
      </g>
      <g class="ck-shadows" opacity="0.34" filter="url(#ck-blur3)">
        <g class="ck-hshadow">${handMarkup(HOUR_PATHS, '#000')}</g>
        <g class="ck-mshadow">${handMarkup(MIN_PATHS, '#000')}</g>
      </g>
      <g class="ck-hour">${handMarkup(HOUR_PATHS, 'none', '#f6efdc', 4.6)}${handMarkup(HOUR_PATHS, 'url(#ck-steelG)', INK, 1.3)}
        <path d="M0,10 L0,-40 M0,-88 L0,-102" stroke="#6f8fb0" stroke-width="0.9" opacity="0.6"/>
        <g class="ck-rim" style="opacity:0">${handMarkup(HOUR_PATHS, 'none', '#f3d27e', 2.2)}</g></g>
      <g class="ck-min">${handMarkup(MIN_PATHS, 'none', '#f6efdc', 4.4)}${handMarkup(MIN_PATHS, 'url(#ck-steelG)', INK, 1.3)}
        <path d="M0,8 L0,-56 M0,-90 L0,-176" stroke="#6f8fb0" stroke-width="0.7" opacity="0.6"/>
        <g class="ck-rim" style="opacity:0">${handMarkup(MIN_PATHS, 'none', '#f3d27e', 2)}</g></g>
      <circle cx="${CX}" cy="${CY}" r="14" fill="url(#ck-bossG)" stroke="${INK}" stroke-width="2"/>
      <circle cx="${CX}" cy="${CY}" r="6.5" fill="#8a6424" stroke="${INK}" stroke-width="1.2"/>
      <circle cx="${CX - 2}" cy="${CY - 2}" r="2.2" fill="#fff4cc" opacity="0.9"/>
      <!-- glass reflections -->
      <path d="M${CX - 196},${CY - 40} A200,200 0 0 1 ${CX - 40},${CY - 196}" stroke="#ffffff" stroke-width="22" fill="none" opacity="0.07" stroke-linecap="round"/>
      <path d="M${CX - 210},${CY - 20} A212,212 0 0 1 ${CX - 110},${CY - 180}" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.2" stroke-linecap="round"/>
      <path d="M${CX + 150},${CY + 130} A200,200 0 0 1 ${CX + 90},${CY + 180}" stroke="#cfe3ff" stroke-width="6" fill="none" opacity="0.08" stroke-linecap="round"/>
      </g>
      <g class="ck-fx" pointer-events="none"></g>
      <!-- light: cold+dim before the lamp, warm from the right after; moonlight from the left once the window is open -->
      <g pointer-events="none">
        <rect class="ck-cold" x="0" y="0" width="1600" height="900" fill="#1b3040" style="mix-blend-mode:multiply;opacity:0.4;transition:opacity 1.2s ease"/>
        <rect class="ck-dim" x="0" y="0" width="1600" height="900" fill="#05080a" style="opacity:0.22;transition:opacity 1.2s ease"/>
        <rect class="ck-warmL" x="0" y="0" width="1600" height="900" fill="url(#ck-lampR)" style="mix-blend-mode:soft-light;opacity:0;transition:opacity 1.2s ease"/>
        <rect class="ck-warmG" x="0" y="0" width="1600" height="900" fill="url(#ck-lampR2)" style="mix-blend-mode:screen;opacity:0;transition:opacity 1.2s ease"/>
        <rect class="ck-moonL" x="0" y="0" width="1600" height="900" fill="url(#ck-moonL)" style="mix-blend-mode:screen;opacity:0;transition:opacity 1.2s ease"/>
        <g class="ck-moonShaft" style="mix-blend-mode:screen;opacity:0;transition:opacity 1.6s ease">
          <path d="M120,-40 L470,-40 L1180,940 L760,940Z" fill="url(#ck-moonShaftG)" filter="url(#ck-blur12)"/>
          <path d="M250,-40 L360,-40 L1010,940 L880,940Z" fill="#cfe3ff" opacity="0.07" filter="url(#ck-blur12)"/>
        </g>
        <rect x="0" y="0" width="1600" height="900" fill="url(#ck-vign)"/>
      </g>
    `, g);
    V.root = root;
    const q = s => root.querySelector(s);
    V.clock = q('.ck-clock');
    V.fx = q('.ck-fx');
    V.hour = q('.ck-hour');
    V.min = q('.ck-min');
    V.rim = { h: V.hour.querySelector('.ck-rim'), m: V.min.querySelector('.ck-rim') };
    V.hsh = q('.ck-hshadow');
    V.msh = q('.ck-mshadow');
    V.pend = q('.ck-pend');
    V.doorR = { front: q('.ck-doorFront'), back: q('.ck-doorBack'), edge: q('.ck-doorEdge'), fshade: q('.ck-doorFrontShade') };
    V.warm = q('.ck-warm');
    V.lits = Array.from(root.querySelectorAll('.ck-lit'));
    V.rewardLight = q('.ck-rewardLight');
    V.light = { shaft: q('.ck-moonShaft'), cold: q('.ck-cold'), dim: q('.ck-dim'), warmL: q('.ck-warmL'), warmG: q('.ck-warmG'), moon: q('.ck-moonL') };
    V.mbWrap = q('.ck-matchbox');

    V.matchbox = G.svg(matchboxScene(), V.mbWrap);
    V.matchbox.style.transition = 'transform .22s ease, filter .22s ease';
    V.matchbox.addEventListener('pointerenter', () => { V.matchbox.style.transform = 'translateY(-6px)'; V.matchbox.style.filter = 'drop-shadow(0 0 8px rgba(255,214,140,0.9))'; });
    V.matchbox.addEventListener('pointerleave', () => { V.matchbox.style.transform = ''; V.matchbox.style.filter = ''; });
    G.hotspot(V.matchbox, {
      cursor: 'take',
      click() {
        if (G.get('gotMatches')) return;
        G.give('matches', V.matchbox);
        G.set('gotMatches');
        V.matchbox.style.display = 'none';
      },
    });

    const lenHit = G.el('circle', { cx: LEN.x, cy: LEN.y, r: LEN.r + 8, fill: 'transparent', 'pointer-events': 'all' }, root);
    G.hotspot(lenHit, {
      cursor: 'look', click() {
        G.say(G.get('clockSolved') ? 'The pendulum swings again, slow as breathing.' : 'Behind the little window the pendulum hangs dead still.');
      },
    });
    V.lenHit = lenHit;
    V.doorHit = G.el('rect', { x: D.x, y: D.y, width: D.w, height: 796 - D.y, fill: 'transparent', 'pointer-events': 'all' }, root);
    root.insertBefore(V.doorHit, lenHit);
    G.hotspot(V.doorHit, { cursor: 'look', click() { G.sfx('lockFail'); G.say('The case door is shut fast. Something inside the clock must release it.'); } });

    V.hit = G.el('circle', { cx: CX, cy: CY, r: R_EN + 4, fill: 'transparent', 'pointer-events': 'all', class: 'hot' }, root);
    V.hit.style.touchAction = 'none';
    V.hit.addEventListener('pointerdown', onDown);
    V.hit.addEventListener('pointermove', onMove);
    V.hit.addEventListener('pointerup', onUp);
    V.hit.addEventListener('pointercancel', onCancel);
    V.hit.addEventListener('pointerleave', () => { if (!drag) { hovered = null; setHoverIcon(null); updateRims(); } });
    V.hit.addEventListener('click', ev => ev.stopPropagation());
    renderHands();
  }

  function matchboxScene() {
    // lying on the ledge inside the case, 3/4 view
    return `<g transform="translate(742,${SHELF_Y - 66}) scale(1.36)">
      <ellipse cx="50" cy="48" rx="52" ry="6" fill="#000" opacity="0.55" filter="url(#ck-blur3)"/>
      ${matchboxBody()}
      <path d="M26,8 L90,0" stroke="#ffe0a0" stroke-width="1.6" opacity="0.7"/>
      <g transform="translate(88,4)">
        <path d="M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2Z" fill="#fff6d6">
          <animate attributeName="opacity" values="0;0.95;0;0" keyTimes="0;0.15;0.35;1" dur="2.8s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="scale" values="0.3;1.2;0.3;0.3" keyTimes="0;0.15;0.35;1" dur="2.8s" repeatCount="indefinite"/>
        </path>
      </g>
      <rect x="-4" y="-8" width="108" height="66" fill="transparent"/>
    </g>`;
  }
  function matchboxBody() {
    return `
      <path d="M2,14 L28,10 L30,34 L4,38Z" fill="#d7b27a" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M4,38 L30,34 L30,43 L4,47Z" fill="#b98c52" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M2,14 L4,38 L4,47 L2,23Z" fill="#9c7040" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <g stroke-linecap="round">
        <path d="M8,19 L34,15.5" stroke="${INK}" stroke-width="4.2"/><path d="M8,19 L34,15.5" stroke="#efd9a8" stroke-width="2.4"/>
        <path d="M9,25 L34,21.5" stroke="${INK}" stroke-width="4.2"/><path d="M9,25 L34,21.5" stroke="#efd9a8" stroke-width="2.4"/>
      </g>
      <ellipse cx="7.5" cy="19.1" rx="3.6" ry="3" fill="#c02a20" stroke="${INK}" stroke-width="1.2"/>
      <ellipse cx="8.5" cy="25.1" rx="3.6" ry="3" fill="#c02a20" stroke="${INK}" stroke-width="1.2"/>
      <path d="M26,8 L90,0 L94,26 L30,34Z" fill="#d04c30" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M30,34 L94,26 L94,40 L30,48Z" fill="#8f2d1f" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M33,38.5 L91,31.3 L91,36 L33,43.2Z" fill="#5a3522"/>
      <g transform="matrix(1,-0.125,0.154,1,26,8)">
        <rect x="6" y="3.5" width="52" height="19" rx="1.5" fill="#f0cf64" stroke="#7a2a1a" stroke-width="1.2"/>
        <rect x="8.5" y="5.5" width="47" height="15" rx="1" fill="none" stroke="#7a2a1a" stroke-width="0.6"/>
        <text x="32" y="12" font-family="IM Fell English SC, Georgia, serif" font-size="5.2" fill="#3a1a10" text-anchor="middle">BRYANT &amp; MAY</text>
        <text x="32" y="18.2" font-family="IM Fell English, Georgia, serif" font-style="italic" font-size="4.4" fill="#7a2a1a" text-anchor="middle">Safety Matches</text>
      </g>
      <path d="M44,54 L82,46" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M44,54 L82,46" stroke="#efd9a8" stroke-width="2.4" stroke-linecap="round"/>
      <ellipse cx="83.5" cy="45.6" rx="3.8" ry="3" transform="rotate(-12 83.5 45.6)" fill="#c02a20" stroke="${INK}" stroke-width="1.2"/>`;
  }

  // ------------------------------------------------------------------ hands rendering + interaction
  let jolt = 0;
  function renderHands() {
    if (!V.hour) return;
    const parts = [['h', V.hour, V.hsh, 6, 9], ['m', V.min, V.msh, 8, 11]];
    for (const [w, el, sh, ox, oy] of parts) {
      const L = lift[w], a = f1(ang[w] + jolt * (w === 'h' ? 1 : -1.4)), sc = (1 + 0.06 * L).toFixed(3);
      el.setAttribute('transform', `translate(${CX},${CY}) rotate(${a}) scale(${sc})`);
      sh.setAttribute('transform', `translate(${f1(CX + ox + 18 * L)},${f1(CY + oy + 25 * L)}) rotate(${a}) scale(${sc})`);
    }
  }
  function updateRims() {
    if (!V.rim) return;
    const solvedOrBusy = !!G.get('clockSolved') || swinging || G.isBusy();
    ['h', 'm'].forEach(w => {
      const grabbed = !solvedOrBusy && ((drag && drag.which === w && drag.moved) || lift[w] > 0.5);
      const act = !solvedOrBusy && active === w;
      const hov = !solvedOrBusy && hovered === w;
      V.rim[w].style.opacity = (grabbed || act) ? 1 : hov ? 0.75 : 0;
      (w === 'h' ? V.hour : V.min).style.filter = (grabbed || act) ? 'drop-shadow(0 0 6px rgba(255,205,110,0.95))' : hov ? 'drop-shadow(0 0 4px rgba(255,210,120,0.6))' : '';
    });
  }
  function setHoverIcon(i) {
    if (hoverIcon === i) return;
    hoverIcon = i;
    V.lits.forEach(l => { if (!l.dataset.hold) l.style.opacity = (+l.dataset.i === i) ? 0.4 : 0; });
  }
  async function pulse(w) {
    await liftTo(w, 1, 110);
    await liftTo(w, 0, 220);
  }
  function selectHand(w) {
    if (active !== w) { active = w; G.sfx('click', { vol: 0.5 }); }
    updateRims();
    pulse(w);
  }
  function liftTo(w, v, ms) {
    const from = lift[w];
    return G.tween(ms || 120, t => { lift[w] = from + (v - from) * t; renderHands(); }, 'out');
  }
  function angleAt(p) { return mod(Math.atan2(p.x - CX, -(p.y - CY)) * 180 / Math.PI, 360); }
  function distToHand(p, a, len) {
    const ux = Math.sin(rad(a)), uy = -Math.cos(rad(a));
    const dx = p.x - CX, dy = p.y - CY;
    const t = Math.max(0, Math.min(len, dx * ux + dy * uy));
    return Math.hypot(dx - ux * t, dy - uy * t);
  }
  function pickHand(p) {
    const r = Math.hypot(p.x - CX, p.y - CY);
    if (r > R_EN + 6) return null;
    const dh = distToHand(p, ang.h, HOUR_LEN + 2), dm = distToHand(p, ang.m, MIN_LEN + 2);
    const TH = 28;
    if (dh > TH && dm > TH) return null;
    if (dh <= TH && dm <= TH && Math.abs(dh - dm) < 6) return r <= HOUR_LEN + 4 ? 'h' : 'm';
    return dh < dm ? 'h' : 'm';
  }
  function iconAt(p) {
    for (let i = 0; i < 12; i++) {
      const c = pol(R_ICON, i * 30, CX, CY);
      if (Math.hypot(p.x - c[0], p.y - c[1]) < 34) return i;
    }
    return null;
  }
  function hardLocked() { return !!G.get('clockSolved') || swinging || G.isBusy(); }
  function locked() { return hardLocked() || animating; }

  function onDown(e) {
    if (e.button != null && e.button !== 0) return;
    const p = G.toStage(e);
    e.preventDefault();
    try { V.hit.setPointerCapture(e.pointerId); } catch (err) { }
    if (hardLocked()) { drag = { which: null, start: p, lockedHand: !!pickHand(p) }; return; }
    const which = pickHand(p);
    if (animating) { drag = { which, start: p, moved: false, queued: true }; return; }   // mid-animation: treat as a queued click
    drag = { which, start: p, moved: false, raw: which ? ang[which] : 0, detent: which ? Math.round(ang[which] / 30) : 0 };
    if (which) V.hit.style.cursor = 'grabbing';
  }
  function onMove(e) {
    const p = G.toStage(e);
    if (!drag) {
      if (locked()) { V.hit.style.cursor = 'default'; if (hovered) { hovered = null; updateRims(); } setHoverIcon(null); return; }
      const w = pickHand(p), ic = w ? null : iconAt(p);
      if (w !== hovered) { hovered = w; updateRims(); }
      setHoverIcon(ic);
      V.hit.style.cursor = w ? 'grab' : 'pointer';
      return;
    }
    if (!drag.which || drag.queued) return;
    if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 6) {
      drag.moved = true;
      active = drag.which;
      setHoverIcon(null);
      liftTo(drag.which, 1, 130);
      updateRims();
    }
    if (!drag.moved) return;
    if (Math.hypot(p.x - CX, p.y - CY) < 18) return;
    const a = angleAt(p);
    const delta = mod(a - mod(drag.raw, 360) + 540, 360) - 180;
    drag.raw += delta;
    const near = Math.round(drag.raw / 30) * 30;
    const off = drag.raw - near;
    ang[drag.which] = near + Math.sign(off) * Math.pow(Math.abs(off) / 15, 1.6) * 15;
    const d = Math.round(drag.raw / 30);
    if (d !== drag.detent) { drag.detent = d; G.sfx('tick', { vol: 0.35 }); }
    renderHands();
  }
  async function onUp(e) {
    if (!drag) return;
    const d = drag; drag = null;
    try { V.hit.releasePointerCapture(e.pointerId); } catch (err) { }
    const p = G.toStage(e);
    V.hit.style.cursor = 'pointer';
    if (d.which && d.moved) {
      await settle(d.which, ang[d.which], Math.round(d.raw / 30) * 30, 200);
      hovered = pickHand(p); updateRims();
      return;
    }
    if (Math.hypot(p.x - d.start.x, p.y - d.start.y) > 8) return;
    if (d.lockedHand !== undefined) {   // clicked while locked
      if (G.get('clockSolved')) G.say(d.lockedHand ? 'The hands will not budge now. The clock keeps its own time again.' : 'Pictures instead of numbers. Father’s work, surely.');
      return;
    }
    clickChain = clickChain.then(() => resolveClick(d, p)).catch(err => console.error(err));
  }
  let clickChain = Promise.resolve();
  async function resolveClick(d, p) {
    // click resolution: a hand -> step it clockwise; a picture -> send the active hand there; else caption
    let n = 0; while (animating && n++ < 120) await G.wait(25);
    if (hardLocked() || animating) return;
    const r = Math.hypot(p.x - CX, p.y - CY), icon = iconAt(p), hand = d.queued ? pickHand(p) : d.which;
    let handClick = false;
    if (hand) {
      if (icon == null) handClick = true;
      else if (hand === 'h' && r <= HOUR_LEN + 6) handClick = true;
      else if (hand === 'm' && posOf('m') === icon && distToHand(p, ang.m, MIN_LEN) < 12) handClick = true;
    }
    if (handClick) {
      if (active !== hand) { selectHand(hand); }            // first click on a hand only picks it up
      else {
        liftTo(hand, 1, 90);
        await settle(hand, ang[hand], Math.round(ang[hand] / 30) * 30 + 30, 280);
      }
    } else if (icon != null && !active) {
      pulse('h'); pulse('m');
      if (!askedWhich) { askedWhich = true; G.say('Which hand — the short or the long?'); }
    } else if (icon != null) {
      const cur = posOf(active);
      const steps = icon === cur ? 1 : mod(icon - cur + 6, 12) - 6;
      await sweep(active, steps);
    } else {
      G.say('Pictures instead of numbers. Father’s work, surely.');
    }
    hovered = pickHand(p); updateRims();
  }
  function onCancel() {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.which && d.moved) settle(d.which, ang[d.which], Math.round(ang[d.which] / 30) * 30, 150);
  }
  async function sweep(which, steps) {
    animating = true;
    liftTo(which, 1, 90);
    updateRims();
    const dir = Math.sign(steps);
    const base = Math.round(ang[which] / 30) * 30;
    for (let k = 1; k < Math.abs(steps); k++) {
      const from = ang[which], to = base + 30 * dir * k;
      await G.tween(95, t => { ang[which] = from + (to - from) * t; renderHands(); }, 'inOut');
      G.sfx('tick', { vol: 0.4 });
    }
    await settle(which, ang[which], base + 30 * steps, 190);
  }
  async function settle(which, from, target, ms) {
    animating = true;
    await G.tween(ms, t => { ang[which] = from + (target - from) * t; renderHands(); }, 'outBack');
    G.sfx('tick');
    const pos = mod(Math.round(target / 30), 12);
    ang[which] = pos * 30; renderHands();
    await liftTo(which, 0, 140);
    animating = false;
    G.set(which === 'h' ? 'clockH' : 'clockM', pos);
    updateRims();
    if (!G.get('clockSolved') && posOf('h') === SOL_H && posOf('m') === SOL_M) solve();
  }

  // ------------------------------------------------------------------ solve payoff
  function shake(ms, amp) {
    return G.tween(ms, t => {
      const k = (1 - t) * amp;
      V.clock.setAttribute('transform', t >= 1 ? '' : `translate(${f1(Math.sin(t * 70) * k)},${f1(Math.cos(t * 53) * k * 0.5)})`);
    }, 'linear');
  }
  function particles(n, spawn, ms) {
    const els = [];
    for (let i = 0; i < n; i++) {
      const s = spawn(i);
      const c = G.el('circle', { cx: s.x, cy: s.y, r: s.r0, fill: s.fill || '#d8c8a4', opacity: 0, filter: s.blur ? 'url(#ck-blur3)' : null }, V.fx);
      els.push([c, s]);
    }
    return G.tween(ms, t => {
      for (const [c, s] of els) {
        const u = Math.max(0, Math.min(1, (t - s.delay) / (1 - s.delay)));
        const e = 1 - Math.pow(1 - u, 2);
        c.setAttribute('cx', f1(s.x + s.dx * e));
        c.setAttribute('cy', f1(s.y + s.dy * e + (s.g || 0) * u * u));
        c.setAttribute('r', f1(s.r0 + (s.r1 - s.r0) * e));
        c.setAttribute('opacity', (u <= 0 ? 0 : s.op * Math.sin(Math.PI * Math.min(1, u * 1.15))).toFixed(3));
      }
    }, 'linear').then(() => els.forEach(([c]) => c.remove()));
  }
  function dustFall() {
    return particles(26, i => {
      const top = i % 3 === 0;
      return { x: 470 + Math.random() * 660, y: top ? 20 : 560 + Math.random() * 20, r0: 1 + Math.random() * 1.6, r1: 1.2 + Math.random() * 1.2,
        dx: (Math.random() - 0.5) * 30, dy: 40 + Math.random() * 90, g: 30, op: 0.75, delay: Math.random() * 0.3, fill: '#d9c9a2' };
    }, 1700);
  }
  function doorPuff() {
    const D = DOOR;
    return particles(22, i => {
      const y = D.y + 20 + Math.random() * (D.h - 40);
      return { x: D.x + D.w * (0.2 + Math.random() * 0.8), y, r0: 4 + Math.random() * 4, r1: 16 + Math.random() * 14,
        dx: (Math.random() - 0.3) * 120, dy: -20 - Math.random() * 50, op: 0.35, delay: Math.random() * 0.25, blur: true, fill: '#cbbd9c' };
    }, 1500);
  }
  function mothFlight() {
    const m = G.svg(`<g class="ck-moth" opacity="0">
        <circle r="30" fill="url(#ck-mothGlow)" class="ck-mhalo"/>
        <g class="ck-mw" stroke="#5a4a36" stroke-width="0.9" stroke-linejoin="round">
          <path d="M-1,-3 C-9,-12 -22,-16 -25,-13 C-25,-6 -20,1 -2,2Z" fill="#f6f0dc"/><path d="M1,-3 C9,-12 22,-16 25,-13 C25,-6 20,1 2,2Z" fill="#f6f0dc"/>
          <path d="M-1,2 C-9,4 -16,9 -15,15 C-11,19 -4,13 -1,6Z" fill="#e9e0c4"/><path d="M1,2 C9,4 16,9 15,15 C11,19 4,13 1,6Z" fill="#e9e0c4"/>
          <path d="M-4,-3 C-12,-8 -18,-11 -22,-12 M4,-3 C12,-8 18,-11 22,-12" fill="none" stroke="#b8a888" stroke-width="0.7"/>
          <circle cx="-14" cy="-6" r="1.6" fill="#b8a888" stroke="none"/><circle cx="14" cy="-6" r="1.6" fill="#b8a888" stroke="none"/>
        </g>
        <ellipse rx="2.8" ry="8" cy="2" fill="#e3d6b2" stroke="#5a4a36" stroke-width="0.8"/>
        <path d="M-1,-6 q-3,-6 -8,-8 M1,-6 q3,-6 8,-8" fill="none" stroke="#5a4a36" stroke-width="0.8"/>
      </g>`, V.fx);
    const mg = m.firstElementChild, wings = m.querySelector('.ck-mw');
    const S0 = 2.2;
    // phase 1: rises out of the case and hovers in the light shaft over the pendulum
    const hover = G.tween(800, t => {
      const x = 812 + Math.sin(t * 9) * 6, y = 720 - 90 * G.ease.out(t) + Math.cos(t * 13) * 4;
      wings.setAttribute('transform', `scale(${(0.35 + 0.65 * Math.abs(Math.sin(t * 34))).toFixed(2)},1)`);
      mg.setAttribute('transform', `translate(${f1(x)},${f1(y)}) rotate(${f1(Math.sin(t * 7) * 8)}) scale(${S0})`);
      mg.setAttribute('opacity', Math.min(1, t * 3).toFixed(2));
    }, 'linear');
    // phase 2: drifts slowly up and away across the dial
    const P = [[812, 630], [880, 520], [1080, 360], [1380, 60]];
    const bez = (t, i) => { const u = 1 - t; return u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i]; };
    return hover.then(() => G.tween(3000, t => {
      const x = bez(t, 0) + Math.sin(t * 18) * 12, y = bez(t, 1) + Math.cos(t * 14) * 9;
      wings.setAttribute('transform', `scale(${(0.3 + 0.7 * Math.abs(Math.sin(t * 70))).toFixed(2)},1)`);
      mg.setAttribute('transform', `translate(${f1(x)},${f1(y)}) rotate(${f1(20 + Math.sin(t * 9) * 12)}) scale(${(S0 - t * 0.9).toFixed(2)})`);
      mg.setAttribute('opacity', Math.min(1, (1 - t) * 3).toFixed(2));
    }, 'inOut')).then(() => m.remove());
  }
  function glowIcons(on) {
    [SOL_H, SOL_M].forEach(i => { const l = V.lits[i]; l.dataset.hold = on ? '1' : ''; l.style.transition = on ? 'opacity .25s ease' : 'opacity 1.2s ease'; l.style.opacity = on ? 1 : 0; });
  }

  async function solve() {
    if (swinging || G.get('clockSolved')) return;
    G.busy(true);
    hovered = null; active = null; setHoverIcon(null); updateRims();
    try {
      await G.wait(380);
      // the strike: chime, the case shudders, the dial warms, the hands jolt, dust sifts down
      G.sfx('chime');
      glowIcons(true);
      V.warm.style.transition = 'opacity .3s ease'; V.warm.style.opacity = 1;
      shake(520, 5);
      dustFall();
      await G.tween(520, t => { jolt = Math.sin(t * Math.PI * 5) * 4 * (1 - t); renderHands(); }, 'linear');
      jolt = 0; renderHands();
      await G.wait(900);
      glowIcons(false);
      V.warm.style.transition = 'opacity 1.6s ease'; V.warm.style.opacity = 0.25;
      swinging = true; swingStart = performance.now();
      updateRims();
      ensureLoop();
      await G.wait(1300);
      // the latch: a click, the door jumps ajar, then swings wide
      G.sfx('clockOpen');
      V.matchbox.style.display = '';
      shake(180, 2);
      await G.tween(220, t => applyDoor(V.doorR, DOOR, 9 * t, 13), 'outBack');
      await G.wait(320);
      doorPuff();
      V.rewardLight.style.opacity = 1;
      setTimeout(mothFlight, 350);
      await G.tween(1300, t => applyDoor(V.doorR, DOOR, 9 + (OPEN_DEG - 9) * t, 13), 'inOut');
      V.doorHit.style.display = 'none';
      G.set('clockSolved');
    } finally {
      G.busy(false);
    }
  }

  // ------------------------------------------------------------------ pendulum loop
  let loopOn = false, lastSign = 0;
  const PERIOD = 2000;
  function ensureLoop() {
    if (loopOn) return;
    if (!(swinging || G.get('clockSolved'))) return;
    const v = G.view();
    if (v !== 'clock' && v !== 'north') return;
    loopOn = true;
    requestAnimationFrame(loop);
  }
  function loop(now) {
    const v = G.view();
    if (!(swinging || G.get('clockSolved')) || (v !== 'clock' && v !== 'north')) { loopOn = false; return; }
    const ramp = swingStart ? Math.min(1, (now - swingStart) / 1800) : 1;
    const s = Math.sin((now / PERIOD) * Math.PI * 2);
    const th = 3.2 * s * (0.3 + 0.7 * ramp);
    if (V.pend) V.pend.setAttribute('transform', `rotate(${th.toFixed(3)} ${CX} ${CY})`);
    if (WO.pend) WO.pend.setAttribute('transform', `rotate(${(th * 1.2).toFixed(3)} 400 250)`);
    const sign = s >= 0 ? 1 : -1;
    if (lastSign && sign !== lastSign && v === 'clock') G.sfx('tick', { vol: 0.14 });
    lastSign = sign;
    requestAnimationFrame(loop);
  }
  G.on('view', () => ensureLoop());

  // ------------------------------------------------------------------ view update
  function updateView() {
    if (!V.root) return;
    const solved = !!G.get('clockSolved');
    if (!drag && !animating) {
      ang.h = (solved ? SOL_H : posOf('h')) * 30;
      ang.m = (solved ? SOL_M : posOf('m')) * 30;
      renderHands();
    }
    if (!swinging || solved) {
      applyDoor(V.doorR, DOOR, solved ? OPEN_DEG : 0, 13);
      V.doorHit.style.display = solved ? 'none' : '';
      V.rewardLight.style.opacity = solved ? 1 : 0;
      if (solved) V.warm.style.opacity = 0.25;
    }
    V.matchbox.style.display = solved && !G.get('gotMatches') ? '' : 'none';
    V.hit.classList.toggle('hot', !solved);
    updateRims();
    const lit = !!G.get('lampLit'), open = !!G.get('windowOpen');
    V.light.cold.style.opacity = lit ? 0.08 : 0.4;
    V.light.dim.style.opacity = lit ? 0 : 0.22;
    V.light.warmL.style.opacity = lit ? 1 : 0;
    V.light.warmG.style.opacity = lit ? 1 : 0;
    V.light.moon.style.opacity = open ? 1 : 0;
    V.light.shaft.style.opacity = open ? 1 : 0;
    ensureLoop();
  }
  // ------------------------------------------------------------------ registration
  G.registerWallObject('north', { z: 10, build: buildWall, update: updateWall, enter: ensureLoop });

  G.registerView('clock', {
    parent: 'north',
    build: buildView,
    update: updateView,
    enter() {
      ensureLoop();
      if (!saidEnter && !G.get('clockSolved') && G.get('clockH') == null && G.get('clockM') == null) {
        saidEnter = true;
        setTimeout(() => { if (G.view() === 'clock') G.say('The hands are stiff, but they move.'); }, 520);
      }
    },
    exit() { if (drag) onCancel(); hovered = null; if (V.lits) setHoverIcon(null); updateRims(); },
  });

  G.registerItem('matches', {
    name: 'Matches',
    desc: 'A box of Bryant & May safety matches. Three left.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ckiTray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6c48c"/><stop offset="1" stop-color="#b98c52"/></linearGradient>
        <linearGradient id="ckiTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9583a"/><stop offset="1" stop-color="#a8392a"/></linearGradient>
      </defs>
      <ellipse cx="52" cy="80" rx="44" ry="7" fill="#000" opacity="0.35"/>
      <g transform="translate(2,24)">
        <path d="M2,14 L28,10 L30,34 L4,38Z" fill="url(#ckiTray)" stroke="#1c140f" stroke-width="2" stroke-linejoin="round"/>
        <path d="M4,38 L30,34 L30,43 L4,47Z" fill="#a67a44" stroke="#1c140f" stroke-width="2" stroke-linejoin="round"/>
        <path d="M2,14 L4,38 L4,47 L2,23Z" fill="#8a6036" stroke="#1c140f" stroke-width="1.6" stroke-linejoin="round"/>
        <g stroke-linecap="round">
          <path d="M8,19 L34,15.5" stroke="#1c140f" stroke-width="5"/><path d="M8,19 L34,15.5" stroke="#f3e0b4" stroke-width="3"/>
          <path d="M9,26 L34,22.5" stroke="#1c140f" stroke-width="5"/><path d="M9,26 L34,22.5" stroke="#f3e0b4" stroke-width="3"/>
        </g>
        <ellipse cx="7.5" cy="19.1" rx="4.2" ry="3.5" fill="#c02a20" stroke="#1c140f" stroke-width="1.5"/>
        <ellipse cx="8.5" cy="26.1" rx="4.2" ry="3.5" fill="#c02a20" stroke="#1c140f" stroke-width="1.5"/>
        <circle cx="6.5" cy="18" r="1.1" fill="#ff9a80"/><circle cx="7.5" cy="25" r="1.1" fill="#ff9a80"/>
        <path d="M26,8 L90,0 L94,26 L30,34Z" fill="url(#ckiTop)" stroke="#1c140f" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M30,34 L94,26 L94,40 L30,48Z" fill="#8f2d1f" stroke="#1c140f" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M33,38.5 L91,31.3 L91,36 L33,43.2Z" fill="#5a3522"/>
        <path d="M36,40 l2,-0.3 M44,39 l2,-0.3 M52,38 l2,-0.3 M60,37 l2,-0.3 M68,36 l2,-0.3 M76,35 l2,-0.3 M84,34 l2,-0.3" stroke="#8a6040" stroke-width="1"/>
        <g transform="matrix(1,-0.125,0.154,1,26,8)">
          <rect x="6" y="3.5" width="52" height="19" rx="1.5" fill="#f0cf64" stroke="#7a2a1a" stroke-width="1.3"/>
          <rect x="8.5" y="5.5" width="47" height="15" rx="1" fill="none" stroke="#7a2a1a" stroke-width="0.7"/>
          <path d="M32,9 c-3,-4 -10,-5 -12,-1 c3,2 8,3 12,3 c4,0 9,-1 12,-3 c-2,-4 -9,-3 -12,1Z" fill="#3a1a10"/>
          <text x="32" y="19" font-family="IM Fell English SC, Georgia, serif" font-size="5" fill="#3a1a10" text-anchor="middle">SAFETY MATCHES</text>
        </g>
        <path d="M28,10 L88,2.5" stroke="#f5a080" stroke-width="1.4" opacity="0.7"/>
        <path d="M40,60 L84,50" stroke="#1c140f" stroke-width="5" stroke-linecap="round"/>
        <path d="M40,60 L84,50" stroke="#f3e0b4" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="86" cy="49.5" rx="4.6" ry="3.6" transform="rotate(-12 86 49.5)" fill="#c02a20" stroke="#1c140f" stroke-width="1.5"/>
        <circle cx="85" cy="48.5" r="1.2" fill="#ff9a80"/>
      </g>
    </svg>`,
  });

  G.registerHint({
    id: 'clock', order: 10, when: () => !G.get('gotMatches'),
    lines: [
      'The tall clock stopped at a particular moment. Edith wrote about it in her journal on the desk.',
      'The clock has pictures instead of numbers. The journal names one for the short hand and one for the long hand.',
      'Short hand on the crescent moon, long hand on the candle.',
    ],
  });

  G.registerStep(10, 'clock', () => { G.set('clockSolved'); G.give('matches'); G.set('gotMatches'); });

  // exposed for tests / other modules
  window.ClockPuzzle = { centre: { x: CX, y: CY }, HOUR_LEN, MIN_LEN, R_ICON, iconAt: i => { const p = pol(R_ICON, i * 30, CX, CY); return { x: p[0], y: p[1], name: ICON_NAMES[i] }; } };
})();
