/* THE MOTH KEEPER — finale module.
 * Owns: writing box (south wall object + close-up 'box'), Edith's letter (view 'letter'), the cocoon,
 *       the door (north wall object + close-up 'door'), and the hatching / door-opening finale cutscene.
 * Items: 'letter', 'cocoon'.  Flags: boxOpen, letterRead, gotCocoon, hatched, doorOpen (+ G.finish()).
 * Lamp interaction: desk.js calls FINALE.useOnLamp(item) from its own lamp hotspot (no overlay hotspot needed).
 * Debug: window.FINALE.play() runs the cutscene from any state.
 */
(function () {
  'use strict';

  const INK = '#1c140f';
  const HAND = `'Homemade Apple', 'IM Fell English', cursive`;
  const FELL = `'IM Fell English', 'Cormorant Garamond', Georgia, serif`;
  const SOLUTION = [0, 2, 4, 6];             // new, first quarter, full, last quarter
  const PHASE_NAMES = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];

  // Luna-moth wing geometry (right side; body axis x=0, wing root at 0,0; head toward -y). Wingspan ≈ 150u.
  const FW = 'M3,-12 C18,-26 42,-42 66,-50 C71,-52 73,-48 70,-43 C64,-31 60,-17 55,-7 C49,4 35,8 21,7 C13,6 7,4 4,2 Z';
  const HW = 'M4,0 C20,0 39,6 45,18 C49,28 45,38 37,46 C32,51 29,58 29,68 C29,80 33,92 31,102 C30,107 25,108 23,104 C20,96 21,84 19,74 C17,64 13,56 9,48 C5,38 3,22 3,8 Z';
  const COSTA = 'M-1,-10 C18,-26 42,-42 66,-50 C71,-52 73,-48 70,-43';
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => t * t * (3 - 2 * t);
  const rnd = (a, b) => a + Math.random() * (b - a);
  let uid = 0;

  // ================================================================== shared defs
  let defsDone = false;
  function ensureDefs() {
    if (defsDone) return; defsDone = true;
    const d = document.getElementById('defs');
    if (!d) return;
    d.insertAdjacentHTML('beforeend', `
      <linearGradient id="fnRose" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6d2a1f"/><stop offset=".35" stop-color="#4e1c15"/><stop offset=".7" stop-color="#5f2419"/><stop offset="1" stop-color="#34110c"/>
      </linearGradient>
      <linearGradient id="fnRoseV" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7a3324"/><stop offset=".5" stop-color="#521d15"/><stop offset="1" stop-color="#2c0e0a"/>
      </linearGradient>
      <linearGradient id="fnPearl" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f7f1e3"/><stop offset=".22" stop-color="#d7e9ef"/><stop offset=".42" stop-color="#f2dde6"/>
        <stop offset=".62" stop-color="#e3f1dc"/><stop offset=".8" stop-color="#dcd7f0"/><stop offset="1" stop-color="#f7efdd"/>
        <animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;40 .5 .5;0 .5 .5" dur="9s" repeatCount="indefinite"/>
      </linearGradient>
      <radialGradient id="fnEnamel" cx="45%" cy="38%" r="70%">
        <stop offset="0" stop-color="#23385a"/><stop offset=".7" stop-color="#101d33"/><stop offset="1" stop-color="#080f1c"/>
      </radialGradient>
      <linearGradient id="fnBrassRev" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6e4d1c"/><stop offset=".55" stop-color="#b8893a"/><stop offset="1" stop-color="#e7c476"/>
      </linearGradient>
      <radialGradient id="fnMoonLit" cx="42%" cy="40%" r="68%">
        <stop offset="0" stop-color="#fffdf2"/><stop offset=".55" stop-color="#efe9d4"/><stop offset="1" stop-color="#bdb59c"/>
      </radialGradient>
      <radialGradient id="fnMoonDark" cx="40%" cy="38%" r="70%">
        <stop offset="0" stop-color="#2c3d5c"/><stop offset=".7" stop-color="#16213a"/><stop offset="1" stop-color="#0c1424"/>
      </radialGradient>
      <radialGradient id="fnSilk" cx="50%" cy="45%" r="75%">
        <stop offset="0" stop-color="#d9bfae"/><stop offset=".55" stop-color="#b58f80"/><stop offset="1" stop-color="#6a4540"/>
      </radialGradient>
      <radialGradient id="fnCocoon" cx="45%" cy="40%" r="65%">
        <stop offset="0" stop-color="#fffef6"/><stop offset=".45" stop-color="#f3ecd8"/><stop offset=".85" stop-color="#d4c6a2"/><stop offset="1" stop-color="#a8966e"/>
      </radialGradient>
      <radialGradient id="fnCore" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#fffbe0" stop-opacity="1"/><stop offset=".5" stop-color="#ffe9a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="fnWarmPool" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#fff1c1" stop-opacity=".55"/><stop offset=".5" stop-color="#ffcf7a" stop-opacity=".18"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="fnGreenPool" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#e8ffe9" stop-opacity=".9"/><stop offset=".35" stop-color="#b6f0c4" stop-opacity=".4"/><stop offset="1" stop-color="#a8d8b0" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="fnWhitePool" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset=".3" stop-color="#e3eeff" stop-opacity=".55"/><stop offset="1" stop-color="#cfe3ff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="fnPaper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#efe4c9"/><stop offset=".5" stop-color="#e6d8b8"/><stop offset="1" stop-color="#d2bf98"/>
      </linearGradient>
      <radialGradient id="fnWax" cx="40%" cy="35%" r="70%">
        <stop offset="0" stop-color="#a33a33"/><stop offset=".6" stop-color="#6e1f1f"/><stop offset="1" stop-color="#3e0e0e"/>
      </radialGradient>
      <linearGradient id="fnDoorWood" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#1f120b"/><stop offset=".2" stop-color="#34200f"/><stop offset=".55" stop-color="#3d2616"/><stop offset=".85" stop-color="#2c1a0f"/><stop offset="1" stop-color="#1a0f08"/>
      </linearGradient>
      <linearGradient id="fnPanel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#46301d"/><stop offset=".5" stop-color="#352213"/><stop offset="1" stop-color="#24160c"/>
      </linearGradient>
      <linearGradient id="fnFrame" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#2a180e"/><stop offset=".35" stop-color="#5a3824"/><stop offset=".6" stop-color="#7a4e30"/><stop offset="1" stop-color="#3a2418"/>
      </linearGradient>
      <linearGradient id="fnSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#050b18"/><stop offset=".3" stop-color="#0f2140"/><stop offset=".62" stop-color="#284a78"/><stop offset=".86" stop-color="#6f93c2"/><stop offset="1" stop-color="#a9c6e8"/>
      </linearGradient>
      <radialGradient id="fnMoonHalo" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".18" stop-color="#e9f2ff" stop-opacity=".6"/><stop offset=".5" stop-color="#bcd3f2" stop-opacity=".18"/><stop offset="1" stop-color="#8fb3d9" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="fnSpill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#eef5ff" stop-opacity=".85"/><stop offset=".5" stop-color="#cfe3ff" stop-opacity=".4"/><stop offset="1" stop-color="#cfe3ff" stop-opacity=".06"/>
      </linearGradient>
      <linearGradient id="fnRay" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#eaf2ff" stop-opacity=".55"/><stop offset="1" stop-color="#cfe3ff" stop-opacity="0"/>
      </linearGradient>
      <g id="fnTinyLuna">
        <path d="${FW}" fill="#d9f3d6"/><path d="${HW}" fill="#bfe6c4"/>
        <g transform="scale(-1 1)"><path d="${FW}" fill="#d9f3d6"/><path d="${HW}" fill="#bfe6c4"/></g>
        <ellipse cy="6" rx="6" ry="17" fill="#fbf8ee"/><path d="M-6.4,-12 Q0,-16.5 6.4,-12" stroke="#8a4a66" stroke-width="3" fill="none"/>
      </g>
      <g id="fnTiny">
        <path d="${FW}" fill="#eef6e4"/><path d="${HW}" fill="#dcefd6"/>
        <g transform="scale(-1 1)"><path d="${FW}" fill="#eef6e4"/><path d="${HW}" fill="#dcefd6"/></g>
        <ellipse cy="6" rx="5" ry="16" fill="#fbf8ee"/>
      </g>
      <filter id="fnBloom" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="fnFuzz" x="-10%" y="-20%" width="120%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="4" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feGaussianBlur in="d" stdDeviation=".6"/>
      </filter>
      <radialGradient id="fnTear" cx="50%" cy="65%" r="70%">
        <stop offset="0" stop-color="#fffbe6"/><stop offset=".45" stop-color="#ffd98a"/><stop offset=".85" stop-color="#b9763a"/><stop offset="1" stop-color="#5a3418"/>
      </radialGradient>
      <filter id="fnWhip" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur class="fn-whipb" stdDeviation="0 0"/></filter>
      <filter id="fnSoftGrain" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="b"/>
        <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 .35" result="na"/>
        <feComposite in="b" in2="na" operator="in"/>
      </filter>
      <filter id="fnBlur3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="fnBlur40" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="40"/></filter>
    `);
  }

  // ================================================================== moon phases
  function moonLit(k, r) {
    if (k === 0) return `M0,${-r} Z`;
    if (k === 4) return `M0,${-r} A${r},${r} 0 1 1 0,${r} A${r},${r} 0 1 1 0,${-r} Z`;
    const waxing = k < 4;
    const quarter = k === 2 || k === 6;
    const crescent = k === 1 || k === 7;
    const outer = `A${r},${r} 0 0 ${waxing ? 1 : 0} 0,${r}`;
    const rx = r * 0.56;
    const sweep = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
    const term = quarter ? `L0,${-r}` : `A${rx.toFixed(2)},${r} 0 0 ${sweep} 0,${-r}`;
    return `M0,${-r} ${outer} ${term} Z`;
  }
  function moonMarkup(id, r, k) {
    const s = r / 40;
    const craters = [[-12, -13, 8, 6.5], [11, 7, 11, 8.5], [-5, 17, 6, 4.5], [16, -17, 5, 4], [-23, 4, 6.5, 5.5], [2, -4, 4, 3.5], [22, 16, 4, 3]]
      .map(([x, y, a, b]) => `<ellipse cx="${x * s}" cy="${y * s}" rx="${a * s}" ry="${b * s}" fill="#a9a38e" opacity=".42"/>`).join('');
    return `
      <clipPath id="${id}-c"><path class="moon-clip" d="${moonLit(k, r)}"/></clipPath>
      <circle r="${r}" fill="url(#fnMoonDark)"/>
      <circle r="${r - 1}" fill="none" stroke="#9db8d8" stroke-width="${1.8 * s}" opacity=".55"/>
      <g class="moon-lit" clip-path="url(#${id}-c)">
        <circle r="${r + 1}" fill="url(#fnMoonLit)"/>
        ${craters}
        <circle r="${r + 1}" fill="#fffbe6" opacity=".25" filter="url(#fnBlur3)"/>
      </g>
      <circle r="${r}" fill="none" stroke="${INK}" stroke-width="${2 * s}"/>`;
  }
  function setMoon(g, k) {
    const r = +g.dataset.r;
    g.querySelector('.moon-clip').setAttribute('d', moonLit(k, r));
  }

  // ================================================================== luna moth (hero)
  function antenna(side) {
    // bipectinate (feathery) antenna
    const P = t => { const u = 1 - t; return [side * (u * u * 1.5 + 2 * u * t * 4 + t * t * 13), u * u * -17 + 2 * u * t * -33 + t * t * -41]; };
    let d = '';
    const [sx, sy] = P(0); d += `M${sx},${sy}`;
    for (let i = 1; i <= 16; i++) { const [x, y] = P(i / 16); d += ` L${x.toFixed(2)},${y.toFixed(2)}`; }
    let barbs = '';
    for (let i = 2; i <= 15; i++) {
      const t = i / 16, [x, y] = P(t), [x2, y2] = P(t + 0.01);
      const tx = x2 - x, ty = y2 - y, L = Math.hypot(tx, ty) || 1;
      const nx = -ty / L, ny = tx / L, len = 3.6 * (1 - t * 0.55);
      barbs += `M${x.toFixed(2)},${y.toFixed(2)} l${((nx + tx / L * 0.8) * len).toFixed(2)},${((ny + ty / L * 0.8) * len).toFixed(2)} `;
      barbs += `M${x.toFixed(2)},${y.toFixed(2)} l${((-nx + tx / L * 0.8) * len).toFixed(2)},${((-ny + ty / L * 0.8) * len).toFixed(2)} `;
    }
    return `<path d="${barbs}" stroke="#d8b96a" stroke-width=".7" fill="none" opacity=".9"/><path d="${d}" stroke="#a88442" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  }
  function eyespot(x, y, rx, ry, rot) {
    return `<g transform="translate(${x} ${y}) rotate(${rot})">
      <ellipse rx="${rx + 1.8}" ry="${ry + 1.8}" fill="#5d2b40" opacity=".85"/>
      <ellipse rx="${rx}" ry="${ry}" fill="#f0d27a"/>
      <ellipse rx="${rx * .72}" ry="${ry * .72}" fill="#9fb98d"/>
      <path d="M${-rx * .72},0 A${rx * .72},${ry * .72} 0 0 0 ${rx * .72},0 A${rx * .72},${ry * .45} 0 0 1 ${-rx * .72},0 Z" fill="#40233a" opacity=".85"/>
      <ellipse cx="${-rx * .15}" cy="${-ry * .22}" rx="${rx * .32}" ry="${ry * .26}" fill="#fbfff2" opacity=".92"/>
    </g>`;
  }
  function mothMarkup(id) {
    const veinsF = ['M4,-6 C22,-22 44,-36 66,-42', 'M4,-4 C24,-16 46,-26 64,-30', 'M5,-2 C26,-8 46,-14 61,-16', 'M5,0 C26,0 44,-2 57,-2', 'M22,-12 C30,-18 40,-22 46,-24']
      .map(d => `<path d="${d}" stroke="#5b9a74" stroke-width=".8" fill="none" opacity=".5"/>`).join('');
    const veinsH = ['M4,3 C22,6 38,12 46,20', 'M4,5 C20,14 32,26 38,42', 'M4,6 C14,24 22,44 26,66 C28,80 26,92 25,100', 'M4,7 C8,20 12,34 14,48']
      .map(d => `<path d="${d}" stroke="#5b9a74" stroke-width=".8" fill="none" opacity=".45"/>`).join('');
    const right = `
      <g class="m-hw1">
        <path d="${HW}" fill="url(#${id}-wg)"/>
        <g clip-path="url(#${id}-hwc)">
          <path d="${HW}" fill="url(#${id}-tail)"/>
          ${veinsH}
          <path d="M3,4 C6,20 10,36 14,50" stroke="#fdfdf4" stroke-width="5" fill="none" opacity=".55" filter="url(#fnBlur3)"/>
          ${eyespot(27, 25, 5.5, 7, -20)}
          <path d="${HW}" fill="none" stroke="#efeaa6" stroke-width="3.2" opacity=".55"/>
        </g>
        <path d="${HW}" fill="none" stroke="#2f5a45" stroke-width="1.1" stroke-linejoin="round"/>
      </g>`;
    const rightF = `
      <g class="m-fw1">
        <path d="${FW}" fill="url(#${id}-wg)"/>
        <g clip-path="url(#${id}-fwc)">
          ${veinsF}
          <path d="${COSTA}" stroke="#6f3552" stroke-width="5.5" fill="none" stroke-linecap="round"/>
          <path d="${COSTA}" stroke="#b77895" stroke-width="1.4" fill="none" opacity=".7" transform="translate(0 2.6)"/>
          ${eyespot(39, -18, 5, 6.2, -35)}
          <path d="${FW}" fill="none" stroke="#efeaa6" stroke-width="3" opacity=".5"/>
        </g>
        <path d="${FW}" fill="none" stroke="#2f5a45" stroke-width="1.1" stroke-linejoin="round"/>
      </g>`;
    return `
    <g class="moth">
      <defs>
        <radialGradient id="${id}-wg" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="96">
          <stop offset="0" stop-color="#f7fcec"/><stop offset=".28" stop-color="#d9f2d2"/><stop offset=".6" stop-color="#abdcb4"/><stop offset="1" stop-color="#76b28f"/>
        </radialGradient>
        <linearGradient id="${id}-tail" gradientUnits="userSpaceOnUse" x1="0" y1="52" x2="0" y2="104">
          <stop offset="0" stop-color="#e9e39c" stop-opacity="0"/><stop offset=".7" stop-color="#eed98f" stop-opacity=".7"/><stop offset="1" stop-color="#d7a9a0" stop-opacity=".95"/>
        </linearGradient>
        <radialGradient id="${id}-bd" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9d4bf"/></radialGradient>
        <clipPath id="${id}-fwc"><path d="${FW}"/></clipPath>
        <clipPath id="${id}-hwc"><path d="${HW}"/></clipPath>
        <filter id="${id}-cr" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="2" seed="11" result="n"/>
          <feDisplacementMap class="m-disp" in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
      <ellipse class="m-glow" cx="0" cy="14" rx="66" ry="58" fill="#c9f7d2" opacity=".32" filter="url(#blur20)"/>
      <g class="m-wings">
        <g class="m-hw">${right}<g transform="scale(-1 1)">${right}</g></g>
        <g class="m-fw">${rightF}<g transform="scale(-1 1)">${rightF}</g></g>
      </g>
      <g class="m-body">
        <path d="M-3,-8 L-9,-3 L-12,5 M3,-8 L9,-3 L12,5 M-3,-4 L-9,5 L-10,12 M3,-4 L9,5 L10,12" stroke="#b27088" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        <ellipse cy="15" rx="5.4" ry="15.5" fill="url(#${id}-bd)" stroke="#8c8a74" stroke-width=".6"/>
        <path d="M-4.6,8 Q0,10 4.6,8 M-5,13 Q0,15 5,13 M-4.8,18 Q0,20 4.8,18 M-4,23 Q0,25 4,23 M-2.8,27.5 Q0,29 2.8,27.5" stroke="#b9b39a" stroke-width=".7" fill="none"/>
        <ellipse cy="-6" rx="7.4" ry="8.6" fill="#fcfaf1"/>
        <ellipse cy="-6" rx="7.4" ry="8.6" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-dasharray="1 1.5" opacity=".9"/>
        <path d="M-6.4,-12 Q0,-16.5 6.4,-12" stroke="#6f3552" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <circle cy="-15.5" r="3.7" fill="#f3efe0" stroke="#8c8a74" stroke-width=".5"/>
        ${antenna(1)}${antenna(-1)}
      </g>
    </g>`;
  }
  function makeMoth(parent) {
    const id = 'fnm' + (uid++);
    const g = G.el('g', { class: 'finale-moth', 'pointer-events': 'none' }, parent);
    g.innerHTML = mothMarkup(id);
    const q = s => g.querySelector(s);
    const m = {
      g, id, x: 0, y: 0, rot: 0, s: 1, open: 1, hopen: 1, grow: 1, glow: 0.32, alpha: 1, phase: 0,
      wings: q('.m-wings'), fw: q('.m-fw'), hw: q('.m-hw'), glowEl: q('.m-glow'), disp: q('.m-disp'),
      apply() {
        g.setAttribute('transform', `translate(${m.x.toFixed(2)} ${m.y.toFixed(2)}) rotate(${m.rot.toFixed(2)}) scale(${m.s.toFixed(4)})`);
        const fo = 0.3 + 0.7 * clamp(m.open, 0, 1), ho = 0.3 + 0.7 * clamp(m.hopen, 0, 1);
        m.fw.setAttribute('transform', `scale(${fo.toFixed(4)} ${(1 - 0.07 * (1 - fo)).toFixed(4)})`);
        m.hw.setAttribute('transform', `scale(${ho.toFixed(4)} ${(1 - 0.05 * (1 - ho)).toFixed(4)})`);
        m.wings.setAttribute('transform', m.grow === 1 ? '' : `translate(0 ${(-(1 - m.grow) * 8).toFixed(2)}) scale(${m.grow.toFixed(4)} ${(m.grow * (0.8 + 0.2 * m.grow)).toFixed(4)})`);
        m.glowEl.setAttribute('opacity', (m.glow * 0.55).toFixed(3));
        g.setAttribute('opacity', m.alpha.toFixed(3));
      },
      crumple(v) {
        if (v <= 0.05) { m.wings.removeAttribute('filter'); return; }
        m.wings.setAttribute('filter', `url(#${id}-cr)`);
        m.disp.setAttribute('scale', v.toFixed(2));
      },
      remove() { g.remove(); },
    };
    m.apply();
    return m;
  }

  // ================================================================== cocoon (lumpy silk spindle)
  function srand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function smoothClosed(pts) {
    const n = pts.length, f = v => v.toFixed(2);
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
    }
    return d + ' Z';
  }
  function cocoonEnvelope(x) {
    const c = clamp(x / 104, -1, 1), s = Math.sqrt(1 - c * c);
    return 40 * Math.pow(s, 0.85) * (1 - 0.12 * c);
  }
  const COC = (function () {
    const pts = [];
    for (let i = 0; i < 64; i++) {
      const t = i / 64 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      const bump = 1 + 0.06 * Math.sin(t * 7 + 1.3) + 0.04 * Math.sin(t * 13 + 0.4) + 0.025 * Math.sin(t * 23);
      pts.push([104 * c * (1 + 0.015 * Math.sin(t * 9)), 40 * Math.sign(s) * Math.pow(Math.abs(s), 0.85) * (1 - 0.12 * c) * bump]);
    }
    return smoothClosed(pts);
  })();
  function cocoonBody(id) {
    const R = srand(7);
    let fib = '';
    for (let i = 0; i < 130; i++) {
      const x = -100 + R() * 200, env = cocoonEnvelope(x);
      const y = (R() * 2 - 1) * env * 0.95;
      const a = (55 + R() * 70) * Math.PI / 180 * (R() < 0.5 ? 1 : -1), L = 8 + R() * 22;
      const dx = Math.cos(a) * L, dy = Math.sin(a) * L, bend = (R() - 0.5) * 8;
      const light = R() < 0.6;
      fib += `<path d="M${(x - dx / 2).toFixed(1)},${(y - dy / 2).toFixed(1)} q${(dx / 2 + bend).toFixed(1)},${(dy / 2 - bend).toFixed(1)} ${dx.toFixed(1)},${dy.toFixed(1)}" stroke="${light ? '#fffdf4' : '#7d6844'}" stroke-width="${(0.4 + R() * 0.9).toFixed(2)}" opacity="${(0.18 + R() * 0.4).toFixed(2)}" fill="none"/>`;
    }
    return `
      <path d="${COC}" fill="url(#fnCocoon)"/>
      <g clip-path="url(#${id}-cc)">
        <path d="M-66,2 C-62,-14 -20,-20 30,-17 C58,-14 72,-6 72,2 C72,12 54,19 20,20 C-28,21 -66,17 -66,2 Z" fill="#5a4424" opacity=".45" filter="url(#fnBlur3)"/>
        <ellipse class="coc-core" cx="-6" cy="-2" rx="78" ry="28" fill="url(#fnCore)" opacity=".75" style="mix-blend-mode:screen"/>
        ${fib}
        <path class="coc-warm" d="${COC}" fill="#ffae4a" opacity="0" style="mix-blend-mode:multiply"/>
        <path d="M-104,14 C-60,40 50,42 104,10 L110,60 L-110,60 Z" fill="#6e5a3a" opacity=".5" filter="url(#fnBlur3)"/>
        <path d="M-74,-22 C-40,-36 30,-36 70,-22" stroke="#ffffff" stroke-width="6" fill="none" opacity=".4" filter="url(#fnBlur3)"/>
      </g>
      <path d="${COC}" fill="none" stroke="#fffaf0" stroke-width="4" opacity=".5" filter="url(#fnFuzz)"/>
      <path d="${COC}" fill="none" stroke="#4e3f28" stroke-width="1.8" opacity=".8"/>`;
  }
  function tearPath(p) { // jagged lens opening along the dorsal ridge, p 0..1
    const W = 116 * p, H = 30 * p, cx = -6, cy = -34, up = [], lo = [];
    const R = srand(21);
    for (let k = 0; k <= 12; k++) {
      const u = k / 12, x = cx - W / 2 + W * u, sn = Math.sin(Math.PI * u);
      up.push([x, cy - H * sn + (k % 2 ? -2.4 : 1.2) * p * (0.4 + R())]);
      lo.push([x, cy + H * 0.5 * sn + (k % 2 ? 1.6 : -1) * p * (0.4 + R())]);
    }
    const f = v => v.toFixed(1);
    const d = 'M' + up.map(q => f(q[0]) + ',' + f(q[1])).join(' L') + ' L' + lo.slice().reverse().map(q => f(q[0]) + ',' + f(q[1])).join(' L') + ' Z';
    return { d, up, lo };
  }
  function tearFibres(p) {
    const t = tearPath(p), R = srand(5);
    let d = '';
    t.up.forEach(([x, y], k) => {
      if (k === 0 || k === 12) return;
      const L = (6 + R() * 16) * p, sx = (R() - 0.5) * 10 * p;
      d += `M${x.toFixed(1)},${y.toFixed(1)} q${(sx * 0.3).toFixed(1)},${(-L * 0.6).toFixed(1)} ${sx.toFixed(1)},${(-L).toFixed(1)} `;
    });
    t.lo.forEach(([x, y], k) => {
      if (k % 2 || k === 0 || k === 12) return;
      const L = (4 + R() * 9) * p;
      d += `M${x.toFixed(1)},${y.toFixed(1)} q${((R() - 0.5) * 4).toFixed(1)},${(-L * 0.5).toFixed(1)} ${((R() - 0.5) * 8).toFixed(1)},${(-L).toFixed(1)} `;
    });
    return d || 'M0,0';
  }
  function cocoonMarkup(id) {
    return `
      <defs><clipPath id="${id}-cc"><path d="${COC}"/></clipPath></defs>
      <ellipse class="coc-halo" cx="0" cy="0" rx="125" ry="66" fill="#fff4cf" opacity=".15" filter="url(#blur20)"/>
      <g class="coc-threads" stroke="#f6f0e2" stroke-width=".8" fill="none" opacity=".7">
        <path d="M-100,4 C-114,10 -124,22 -128,40"/><path d="M-96,10 C-104,22 -108,32 -106,40"/><path d="M-60,30 C-62,34 -66,38 -72,40"/><path d="M-20,36 C-18,38 -16,39 -12,40"/>
        <path d="M40,32 C44,36 48,38 56,40"/><path d="M96,6 C110,14 118,26 124,40"/><path d="M102,-2 C116,-4 126,4 136,40"/>
        <path d="M-118,40 L136,40" stroke-width=".5" opacity=".35"/>
      </g>
      <g class="coc-body">${cocoonBody(id)}</g>
      <path class="coc-tearglow" d="M0,0" fill="#fff4cf" opacity="0" filter="url(#blur6)"/>
      <path class="coc-tear" d="M0,0" fill="url(#fnTear)" opacity="0" stroke="#4a2c14" stroke-width="2.6" stroke-linejoin="round"/>
      <path class="coc-fib" d="M0,0" stroke="#fffaf0" stroke-width="1.6" fill="none" opacity="0" stroke-linecap="round"/>`;
  }
  function makeCocoon(parent, x, y, s, rot) {
    const id = 'fnc' + (uid++);
    const outer = G.el('g', { transform: `translate(${x} ${y}) rotate(${rot || 0}) scale(${s})` }, parent);
    const breathe = G.el('g', {}, outer);
    breathe.innerHTML = cocoonMarkup(id) + `<animateTransform attributeName="transform" type="scale" values="1 1;1.018 1.05;1 1" dur="3.4s" repeatCount="indefinite"/>`;
    const q = s2 => breathe.querySelector(s2), qa = s2 => breathe.querySelectorAll(s2);
    const c = { outer, breathe, id, halo: q('.coc-halo'), tear: q('.coc-tear'), tearGlow: q('.coc-tearglow'), fib: q('.coc-fib'), cores: qa('.coc-core'), warms: qa('.coc-warm'), x, y, s, rot: rot || 0 };
    c.setTear = p => {
      const t = tearPath(Math.max(0.001, p));
      c.tear.setAttribute('d', t.d); c.tearGlow.setAttribute('d', t.d); c.fib.setAttribute('d', tearFibres(p));
      c.tear.setAttribute('opacity', p > 0 ? 1 : 0); c.tearGlow.setAttribute('opacity', (0.45 * p).toFixed(3)); c.fib.setAttribute('opacity', (0.9 * Math.min(1, p * 2)).toFixed(3));
    };
    c.toStage = (lx, ly) => {
      const r = c.rot * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
      return [c.x + (lx * cs - ly * sn) * c.s, c.y + (lx * sn + ly * cs) * c.s];
    };
    return c;
  }

  // ================================================================== small helpers
  function viewG(id) { return G.views[id] && G.views[id].g; }
  function topLayer(id) {
    const vg = viewG(id);
    let t = vg.querySelector(':scope > g.finale-top');
    if (!t) t = G.el('g', { class: 'finale-top', 'pointer-events': 'none' }, vg);
    else vg.appendChild(t);
    return t;
  }
  function setCam(id, s, cx, cy) {
    const g = viewG(id);
    if (!g) return;
    if (Math.abs(s - 1) < 1e-4 && Math.abs(cx - 800) < 0.01 && Math.abs(cy - 450) < 0.01) g.removeAttribute('transform');
    else g.setAttribute('transform', `translate(800 450) scale(${s.toFixed(4)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`);
  }
  const cams = {};
  function cam(id, to, ms, e) {
    const from = cams[id] || { s: 1, x: 800, y: 450 };
    return G.tween(ms, t => { const c = { s: lerp(from.s, to.s, t), x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }; cams[id] = c; setCam(id, c.s, c.x, c.y); }, e || 'inOut');
  }
  function resetCam(id) { cams[id] = { s: 1, x: 800, y: 450 }; setCam(id, 1, 800, 450); }

  // arc-length parameterised Catmull-Rom path
  function makePath(pts) {
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    const out = [];
    for (let i = 1; i < P.length - 2; i++) {
      const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
      for (let j = 0; j < 48; j++) {
        const t = j / 48, t2 = t * t, t3 = t2 * t;
        const f = k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    out.push(pts[pts.length - 1]);
    const cum = [0];
    for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    const L = cum[cum.length - 1];
    function at(u) {
      const d = clamp(u, 0, 1) * L;
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < d) lo = mid; else hi = mid; }
      const seg = cum[hi] - cum[lo] || 1, k = (d - cum[lo]) / seg;
      const x = lerp(out[lo][0], out[hi][0], k), y = lerp(out[lo][1], out[hi][1], k);
      const a = out[Math.max(0, lo - 2)], b = out[Math.min(out.length - 1, hi + 2)];
      return { x, y, dx: b[0] - a[0], dy: b[1] - a[1] };
    }
    return { at, L };
  }
  function angLerp(a, b, t) { let d = ((b - a + 540) % 360) - 180; return a + d * t; }

  // fly moth along points. opts: ms, ease(t), hz, scale(u,p), onFrame(u,p), bank (0..1), amp
  function fly(m, pts, opts) {
    const path = makePath(pts);
    const ms = opts.ms, ez = opts.ease || (t => t);
    const hz = opts.hz || 5.2;
    return new Promise(res => {
      const t0 = performance.now(); let last = t0;
      function frame(now) {
        const tt = Math.min(1, (now - t0) / ms), dt = (now - last) / 1000; last = now;
        const u = ez(tt);
        const p = path.at(u);
        const hzNow = typeof hz === 'function' ? hz(tt) : hz;
        m.phase += dt * hzNow * Math.PI * 2;
        const amp = opts.amp ? opts.amp(tt) : 1;
        m.open = 1 - amp * (0.5 - 0.5 * Math.cos(m.phase));
        m.hopen = 1 - amp * (0.5 - 0.5 * Math.cos(m.phase - 0.55));
        const bob = Math.sin(m.phase) * 2.2 * amp;
        m.x = p.x; m.y = p.y + bob;
        const heading = Math.atan2(p.dx, -p.dy) * 180 / Math.PI;            // 0 = up
        const target = clamp(((heading + 540) % 360) - 180, -120, 120) * (opts.bank == null ? 0.42 : opts.bank);
        m.rot = angLerp(m.rot, target, Math.min(1, dt * 5));
        if (opts.scale) m.s = opts.scale(tt, p);
        if (opts.onFrame) opts.onFrame(tt, p);
        m.apply();
        if (tt < 1) requestAnimationFrame(frame); else res();
      }
      requestAnimationFrame(frame);
    });
  }
  // flap in place for ms (open amplitude a(t)), with optional per-frame hook
  function hover(m, ms, opts) {
    opts = opts || {};
    return new Promise(res => {
      const t0 = performance.now(); let last = t0;
      function frame(now) {
        const tt = Math.min(1, (now - t0) / ms), dt = (now - last) / 1000; last = now;
        const hz = opts.hz ? (typeof opts.hz === 'function' ? opts.hz(tt) : opts.hz) : 4;
        m.phase += dt * hz * Math.PI * 2;
        const amp = opts.amp ? opts.amp(tt) : 1;
        m.open = 1 - amp * (0.5 - 0.5 * Math.cos(m.phase));
        m.hopen = 1 - amp * (0.5 - 0.5 * Math.cos(m.phase - 0.55));
        if (opts.onFrame) opts.onFrame(tt);
        m.apply();
        if (tt < 1) requestAnimationFrame(frame); else res();
      }
      requestAnimationFrame(frame);
    });
  }

  // ================================================================== WRITING BOX — south wall object
  const SB = {};
  G.registerWallObject('south', {
    z: 5,
    build(g) {
      ensureDefs();
      const moons = [0, 1, 2, 3].map(i => `<g transform="translate(${1068 + i * 14.5} 553.5)"><circle r="5.6" fill="#0f1a2c" stroke="${INK}" stroke-width="1"/><path class="sb-moon" d="${moonLit(4, 4.2)}" fill="#efe9d4"/></g>`).join('');
      G.svg(`
        <ellipse cx="1090" cy="578" rx="92" ry="8" fill="#000" opacity=".55" filter="url(#blur6)"/>
      `, g);
      // open lid (behind)
      SB.lidUp = G.svg(`
        <g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round">
          <path d="M1024,512 L1156,512 L1150,446 L1030,446 Z" fill="url(#fnRoseV)"/>
          <path d="M1033,506 L1147,506 L1142,454 L1038,454 Z" fill="url(#fnSilk)" stroke-width="1.2" opacity=".9"/>
          <path d="M1060,470 L1120,470 M1058,488 L1122,488" stroke="#8e6b61" stroke-width=".8" opacity=".6"/>
        </g>`, g);
      SB.body = G.svg(`
        <g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" filter="url(#ink)">
          <path d="M1014,532 L1166,532 L1166,576 L1014,576 Z" fill="url(#fnRoseV)"/>
          <path d="M1014,532 L1024,510 L1156,510 L1166,532 Z" fill="#6a2a1e"/>
        </g>
        <path d="M1018,540 H1162 M1018,566 H1162" stroke="#8a4a36" stroke-width="1" opacity=".45"/>
        <path d="M1020,531 H1160" stroke="#c98a6a" stroke-width="1.2" opacity=".35"/>
        <!-- brass corners -->
        <g fill="url(#gBrass)" stroke="${INK}" stroke-width="1.2">
          <path d="M1014,532 h14 v5 h-9 v9 h-5 Z"/><path d="M1166,532 h-14 v5 h9 v9 h5 Z"/>
          <path d="M1014,576 h14 v-5 h-9 v-9 h-5 Z"/><path d="M1166,576 h-14 v-5 h9 v-9 h5 Z"/>
        </g>
        <!-- lock plate with four moon dials -->
        <rect x="1056" y="543" width="68" height="21" rx="3" fill="url(#gBrass)" stroke="${INK}" stroke-width="1.4"/>
        ${moons}
      `, g);
      SB.lidShut = G.svg(`
        <g stroke="${INK}" stroke-width="2" stroke-linejoin="round">
          <path d="M1014,532 L1024,510 L1156,510 L1166,532 Z" fill="url(#fnRose)"/>
          <path d="M1030,528 L1037,514 L1143,514 L1150,528 Z" fill="none" stroke="#d8c49a" stroke-width=".9" opacity=".6"/>
        </g>
        <g transform="translate(1090 521) scale(.14 .07)" opacity=".85"><use href="#fnTiny" fill="url(#fnPearl)"/></g>
      `, g);
      SB.inside = G.svg(`
        <path d="M1024,512 L1156,512 L1162,528 L1018,528 Z" fill="#b48e80" stroke="${INK}" stroke-width="1.4"/>
        <g class="sb-coc"><ellipse cx="1072" cy="520" rx="22" ry="7" fill="#fff3cf" opacity=".6" filter="url(#blur6)"/><ellipse cx="1072" cy="520" rx="17" ry="5" fill="url(#fnCocoon)" stroke="#6d5f47" stroke-width="1"/></g>
        <g class="sb-let"><path d="M1098,514 L1142,514 L1146,526 L1100,526 Z" fill="#e8dcc0" stroke="${INK}" stroke-width="1"/><circle cx="1122" cy="520" r="3" fill="#7a2626"/></g>
      `, g);
      const hot = G.el('path', { d: 'M1006,440 H1174 V584 H1006 Z', fill: 'transparent' }, g);
      G.hotspot(hot, {
        cursor: 'look',
        click() { G.go('box'); },
        use(item) { if (item === 'cocoon') { G.say('It is safe enough where I carry it. It needs warmth, not wood.'); G.select(null); return true; } return false; },
      });
    },
    update() {
      const open = !!G.get('boxOpen');
      SB.lidUp.style.display = open ? '' : 'none';
      SB.inside.style.display = open ? '' : 'none';
      SB.lidShut.style.display = open ? 'none' : '';
      SB.inside.querySelector('.sb-coc').style.display = G.get('gotCocoon') ? 'none' : '';
      SB.inside.querySelector('.sb-let').style.display = G.get('letterRead') ? 'none' : '';
      SB.body.querySelectorAll('.sb-moon').forEach((p, i) => p.setAttribute('d', moonLit(open ? SOLUTION[i] : BX.dials[i], 4.2)));
    },
  });

  // ================================================================== BOX close-up
  const BX = { dials: [4, 4, 4, 4], rot: [0, 0, 0, 0], turning: [false, false, false, false] };
  const DIAL_X = [530, 710, 890, 1070], DIAL_Y = 604;
  const LID_N = 40, LID_D = 2400, LID_OPEN = 100 * Math.PI / 180;
  function pearlMoth(x, y, s, r, op) {
    return `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})" opacity="${op || 1}">
      <g fill="url(#fnPearl)" stroke="#2a0f0a" stroke-width="${1.6 / s}">
        <path d="${HW}"/><path d="${FW}"/><g transform="scale(-1 1)"><path d="${HW}"/><path d="${FW}"/></g>
        <ellipse cy="9" rx="7.4" ry="19"/><ellipse cy="-6" rx="9" ry="9.5"/><circle cy="-17" r="4.6"/>
      </g>
      <path d="M-5,4 Q0,6 5,4 M-6,10 Q0,12 6,10 M-6,16 Q0,18 6,16 M-5,22 Q0,24 5,22" stroke="#b9a58a" stroke-width="${1 / s}" fill="none" opacity=".7"/>
      <g fill="none" stroke="#b9a58a" stroke-width="${.9 / s}" opacity=".55">
        <path d="M6,-6 C24,-20 44,-34 62,-40 M6,-2 C26,-8 44,-14 58,-14 M5,4 C22,10 36,20 44,24 M5,6 C14,26 22,50 26,86"/>
        <g transform="scale(-1 1)"><path d="M6,-6 C24,-20 44,-34 62,-40 M6,-2 C26,-8 44,-14 58,-14 M5,4 C22,10 36,20 44,24 M5,6 C14,26 22,50 26,86"/></g>
      </g>
      <g fill="#2a0f0a" opacity=".55"><circle cx="39" cy="-18" r="4.5"/><circle cx="-39" cy="-18" r="4.5"/><circle cx="27" cy="25" r="5"/><circle cx="-27" cy="25" r="5"/></g>
      <g fill="url(#fnPearl)"><circle cx="39" cy="-18" r="2.2"/><circle cx="-39" cy="-18" r="2.2"/><circle cx="27" cy="25" r="2.6"/><circle cx="-27" cy="25" r="2.6"/></g>
      <g transform="scale(1.25)">${[1, -1].map(sd => `<path d="M${sd * 2},-19 Q${sd * 4},-34 ${sd * 15},-45 Q${sd * 13},-30 ${sd * 2},-19 Z" fill="url(#fnPearl)" stroke="#2a0f0a" stroke-width="${1.2 / s}"/><path d="${[0.25, 0.45, 0.65, 0.85].map(t => { const x = sd * (2 + 13 * t * t), y = -19 - 26 * t; return `M${x.toFixed(1)},${y.toFixed(1)} l${(sd * 5 * (1 - t * .5)).toFixed(1)},-1.5`; }).join(' ')}" stroke="#d8c49a" stroke-width="${1.3 / s}" fill="none"/>`).join('')}</g>
    </g>`;
  }
  function brassCorner(x, y, sx, sy) {
    return `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">
      <path d="M0,0 H74 C66,8 58,10 48,12 C34,14 22,20 16,30 C12,40 12,56 12,74 H0 Z" fill="url(#gBrass)" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M8,8 C26,8 40,10 50,6 M8,8 C8,26 10,40 6,50" stroke="#6e4d1c" stroke-width="1.4" fill="none"/>
      <circle cx="10" cy="10" r="3.5" fill="#e7c476" stroke="${INK}" stroke-width="1"/>
      <path d="M22,20 q6,-6 12,0 q-6,6 -12,0" fill="#6e4d1c" opacity=".6"/>
    </g>`;
  }
  function dialMarkup(i) {
    let ticks = '', stars = '';
    for (let a = 0; a < 8; a++) {
      const r = a * 45 * Math.PI / 180;
      ticks += `<path transform="translate(${(Math.sin(r) * 53).toFixed(2)} ${(-Math.cos(r) * 53).toFixed(2)}) rotate(${a * 45})" d="M0,-4 L2.6,0 L0,4 L-2.6,0 Z" fill="${a === 0 ? '#fff1c1' : '#e7c476'}" stroke="#3a2a12" stroke-width=".7"/>`;
    }
    for (let k = 0; k < 14; k++) {
      const r = (k * 137.5) * Math.PI / 180, d = 44 + (k % 3) * 3.2;
      stars += `<circle cx="${(Math.cos(r) * d).toFixed(1)}" cy="${(Math.sin(r) * d).toFixed(1)}" r="${k % 4 ? .8 : 1.3}" fill="#e9f0ff" opacity="${k % 2 ? .5 : .85}"/>`;
    }
    return `
      <g class="dial" transform="translate(${DIAL_X[i]} ${DIAL_Y})">
        <circle r="76" fill="#2c1c0a" opacity=".7" filter="url(#fnBlur3)" transform="translate(0 4)"/>
        <circle r="72" fill="url(#gBrass)" stroke="${INK}" stroke-width="2.6"/>
        <circle r="65" fill="url(#fnBrassRev)" stroke="#5a3d16" stroke-width="1.2"/>
        <g class="dial-rot">
          <circle r="59" fill="url(#fnEnamel)" stroke="#3a2a12" stroke-width="2"/>
          <circle r="49" fill="none" stroke="#e7c476" stroke-width=".8" opacity=".45"/>
          ${stars}${ticks}
        </g>
        <g class="dial-moon" data-r="40">${moonMarkup('fnd' + i, 40, 4)}</g>
        <circle r="59" fill="none" stroke="#fff" stroke-width="1" opacity=".12"/>
        <path d="M-30,-44 A54,54 0 0 1 30,-44" stroke="#fff" stroke-width="3" fill="none" opacity=".12" stroke-linecap="round"/>
        <path d="M0,-66 L-7,-80 L7,-80 Z" fill="url(#gBrass)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        <circle class="dial-flash" r="66" fill="none" stroke="#fff1c1" stroke-width="5" opacity="0" filter="url(#fnBloom)"/>
        <circle class="dial-hot" r="72" fill="transparent"/>
      </g>`;
  }
  G.registerView('box', {
    parent: 'south',
    build(g) {
      ensureDefs();
      // desk surface background
      let grain = '';
      for (let i = 0; i < 26; i++) {
        const y = 20 + i * 36 + (i % 3) * 5;
        grain += `<path d="M0,${y} C300,${y + 10} 600,${y - 12} 900,${y + 6} S1400,${y - 8} 1600,${y + 4}" stroke="#1f120a" stroke-width="${i % 3 ? 1 : 2}" fill="none" opacity=".35"/>`;
      }
      G.svg(`
        <rect width="1600" height="900" fill="#3a2418"/>
        <rect width="1600" height="900" fill="url(#gWalnut)" opacity=".8"/>
        ${grain}
        <ellipse class="bx-warm" cx="120" cy="300" rx="700" ry="520" fill="url(#fnWarmPool)" opacity="0"/>
        <radialGradient id="fnBoxVig" cx="50%" cy="50%" r="70%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
        <rect width="1600" height="900" fill="url(#fnBoxVig)"/>
        <rect x="316" y="252" width="968" height="508" rx="18" fill="#000" opacity=".6" filter="url(#blur20)"/>
      `, g);
      // ------- interior (under the lid)
      let tufts = '';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
        const x = 410 + c * 112 + (r % 2) * 56, y = 330 + r * 110;
        if (x > 1210) continue;
        tufts += `<g transform="translate(${x} ${y})"><ellipse rx="9" ry="7" fill="#6d4a44" opacity=".35" filter="url(#fnBlur3)"/><circle r="3.4" fill="#caa99a" stroke="#6d4a44" stroke-width="1"/></g>`;
      }
      let quilt = '';
      for (let k = -6; k < 14; k++) {
        quilt += `<path d="M${354 + k * 112},278 l448,448" stroke="#8e6b61" stroke-width="1.2" opacity=".28"/><path d="M${354 + k * 112},716 l448,-448" stroke="#8e6b61" stroke-width="1.2" opacity=".28"/>`;
      }
      BX.interior = G.svg(`
        <defs><clipPath id="fnCav"><rect x="360" y="280" width="880" height="432" rx="6"/></clipPath></defs>
        <rect x="330" y="250" width="940" height="490" rx="16" fill="url(#fnRoseV)" stroke="${INK}" stroke-width="3"/>
        <path d="M340,262 H1260" stroke="#b56a4e" stroke-width="2" opacity=".35"/>
        <rect x="360" y="280" width="880" height="432" rx="6" fill="#2a0f0a"/>
        <g clip-path="url(#fnCav)">
          <rect x="360" y="290" width="880" height="422" fill="url(#fnSilk)"/>
          ${quilt}${tufts}
          <path d="M360,300 C600,330 1000,290 1240,318" stroke="#f3e6d8" stroke-width="18" fill="none" opacity=".18" filter="url(#blur6)"/>
          <ellipse cx="930" cy="610" rx="120" ry="40" fill="#8a6a55" opacity=".18" filter="url(#blur6)"/>
          <rect x="360" y="280" width="880" height="40" fill="#1a0806" opacity=".55" filter="url(#blur6)"/>
          <rect x="360" y="280" width="26" height="432" fill="#1a0806" opacity=".35" filter="url(#blur6)"/>
          <ellipse class="bx-cshadow" cx="636" cy="540" rx="140" ry="22" fill="#4a2a26" opacity=".45" filter="url(#blur6)"/>
          <g class="bx-imp" transform="translate(630 508) rotate(-7) scale(1.35)">
            <path d="${COC}" fill="#a0766a" opacity=".13" filter="url(#fnBlur3)" transform="scale(.96 .9)"/>
            <path d="${COC}" fill="none" stroke="#6a463f" stroke-width="5" opacity=".22" filter="url(#fnBlur3)" transform="translate(0 -3) scale(.94 .86)"/>
            <path d="${COC}" fill="none" stroke="#f6e8de" stroke-width="5" opacity=".6" filter="url(#fnBlur3)" transform="translate(0 4) scale(1.02 .98)"/>
            <path d="M-60,-6 C-20,-10 30,-8 70,-2 M-50,8 C-10,12 30,10 64,6" stroke="#a88074" stroke-width="1.4" fill="none" opacity=".3" filter="url(#fnBlur3)"/>
            <path d="M-100,4 C-118,12 -126,24 -130,38 M96,4 C112,14 120,26 128,36 M20,-30 C30,-44 44,-50 60,-48" stroke="#fbf4e8" stroke-width=".8" fill="none" opacity=".55"/>
          </g>
          <text x="800" y="690" text-anchor="middle" font-family="${FELL}" font-style="italic" font-size="30" fill="#7a5048" opacity=".7" letter-spacing="6">E . V .</text>
          <ellipse class="bx-cocglow" cx="630" cy="505" rx="300" ry="170" fill="url(#fnWarmPool)" opacity=".9"/>
        </g>
        <rect x="360" y="280" width="880" height="432" rx="6" fill="none" stroke="${INK}" stroke-width="2.5"/>
      `, g);
      BX.cocoonG = G.el('g', {}, g);
      BX.coc = makeCocoon(BX.cocoonG, 630, 508, 1.35, -7);
      BX.cocHot = G.el('ellipse', { cx: 630, cy: 505, rx: 160, ry: 70, fill: 'transparent' }, g);
      G.hotspot(BX.cocHot, {
        cursor: 'take',
        click() {
          G.give('cocoon', BX.cocoonG);
          G.set('gotCocoon');
          G.say('It is warm in my hands — faintly, like a sleeping thing.');
        },
      });
      // letter
      BX.letterG = G.svg(`
        <g transform="translate(1000 500) rotate(5)">
          <rect x="-165" y="-104" width="330" height="208" rx="3" fill="#000" opacity=".4" filter="url(#blur6)" transform="translate(6 10)"/>
          <rect x="-160" y="-100" width="320" height="200" rx="2" fill="url(#fnPaper)" stroke="${INK}" stroke-width="2.4"/>
          <path d="M-160,-100 L0,8 L160,-100" fill="none" stroke="#9c8762" stroke-width="2"/>
          <path d="M-160,100 L-40,10 M160,100 L40,10" fill="none" stroke="#b8a47e" stroke-width="1.2" opacity=".7"/>
          <path d="M-150,-92 L0,6 L150,-92" fill="none" stroke="#fff8e6" stroke-width="1" opacity=".5"/>
          <text x="-120" y="70" font-family="${HAND}" font-size="17" fill="#3a281c" opacity=".75" transform="rotate(-3)">for whoever wakes her</text>
          <g class="bx-seal" transform="translate(0 8)">
            <path d="M-26,-4 C-30,-22 -12,-32 2,-30 C20,-30 32,-16 28,2 C26,20 10,30 -6,28 C-22,26 -28,12 -26,-4 Z" fill="url(#fnWax)" stroke="#2a0808" stroke-width="1.6"/>
            <path d="M-20,20 C-26,28 -30,34 -26,40 M18,22 C22,30 26,32 30,30" stroke="#6e1f1f" stroke-width="5" stroke-linecap="round" fill="none"/>
            <circle r="18" fill="none" stroke="#4a1212" stroke-width="1.4"/>
            <g transform="scale(.19)" fill="#8e2c2a" stroke="#3a0b0b" stroke-width="7">
              <path d="${FW}"/><path d="${HW}"/><g transform="scale(-1 1)"><path d="${FW}"/><path d="${HW}"/></g><ellipse cy="6" rx="6" ry="18"/>
            </g>
            <path d="M-14,-16 C-8,-22 4,-22 10,-18" stroke="#e08a80" stroke-width="2.4" fill="none" opacity=".55" stroke-linecap="round"/>
            <path class="bx-crack" d="M-2,-31 L3,-18 L-4,-8 L4,2 L-3,12 L2,24 L-1,30" stroke="#1a0404" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-dasharray="70" stroke-dashoffset="70"/>
          </g>
        </g>`, g);
      G.hotspot(BX.letterG, {
        cursor: 'look',
        async click() {
          if (BX.sealing) return;
          if (!BX.sealBroken) {
            // the wax seal cracks and splits before the letter opens
            BX.sealing = true; G.busy(true);
            try {
              const seal = BX.letterG.querySelector('.bx-seal'), crack = seal.querySelector('.bx-crack');
              G.sfx('lockClick');
              await G.tween(260, t => crack.setAttribute('stroke-dashoffset', (70 * (1 - t)).toFixed(1)), 'out');
              const kids = [...seal.children].filter(k => k !== crack);
              const L = G.el('g', {}, seal), Rr = G.el('g', {}, seal);
              kids.forEach(k => { L.appendChild(k); Rr.appendChild(k.cloneNode(true)); });
              G.svg(`<clipPath id="fnSealL"><rect x="-60" y="-60" width="60" height="120"/></clipPath><clipPath id="fnSealR"><rect x="0" y="-60" width="60" height="120"/></clipPath>`, seal);
              L.setAttribute('clip-path', 'url(#fnSealL)'); Rr.setAttribute('clip-path', 'url(#fnSealR)');
              await G.tween(320, t => {
                L.setAttribute('transform', `translate(${-7 * t} ${2 * t}) rotate(${-12 * t})`);
                Rr.setAttribute('transform', `translate(${7 * t} ${3 * t}) rotate(${10 * t})`);
                crack.setAttribute('opacity', (1 - t).toFixed(2));
              }, 'out');
              BX.sealBroken = true;
            } finally { BX.sealing = false; G.busy(false); }
          }
          G.sfx('paper');
          G.give('letter', BX.letterG);
          G.set('letterRead');
          G.go('letter');
        },
      });
      // ------- lid underside art (lid-local coords, drawn as seen once the lid swings past vertical)
      G.svg(`<defs><g id="fnUnderArt">
          <rect x="330" y="250" width="940" height="490" rx="16" fill="url(#fnRoseV)" stroke="${INK}" stroke-width="3"/>
          <rect x="362" y="282" width="876" height="426" rx="6" fill="url(#fnSilk)" stroke="${INK}" stroke-width="2"/>
          <path d="M370,360 C700,346 900,374 1230,356 M370,450 C700,436 900,464 1230,446 M370,540 C700,526 900,554 1230,536 M370,630 C700,616 900,644 1230,626" stroke="#8e6b61" stroke-width="2" fill="none" opacity=".45"/>
          <g transform="translate(800 520) rotate(180) scale(.9)" opacity=".45">${pearlMoth(0, 0, 1, 0, 1)}</g>
          <rect x="362" y="282" width="876" height="60" fill="#1a0806" opacity=".25"/>
          <rect x="420" y="250" width="60" height="20" rx="4" fill="url(#gBrass)" stroke="${INK}" stroke-width="1.6"/>
          <rect x="1120" y="250" width="60" height="20" rx="4" fill="url(#gBrass)" stroke="${INK}" stroke-width="1.6"/>
        </g></defs>`, g);
      BX.inShade = G.el('rect', { x: 360, y: 280, width: 880, height: 432, fill: '#0c0402', opacity: 0, 'pointer-events': 'none' }, g);
      // ------- the lid itself (closed)
      let rgrain = '';
      for (let i = 0; i < 30; i++) {
        const y = 262 + i * 16.5 + (i % 4) * 3;
        rgrain += `<path d="M330,${y} C500,${y + 8} 700,${y - 10} 900,${y + 4} S1150,${y - 6} 1270,${y + 3}" stroke="${i % 3 ? '#2a0c08' : '#8a3d2c'}" stroke-width="${i % 5 ? 1 : 2.2}" fill="none" opacity="${i % 3 ? .35 : .25}"/>`;
      }
      let stars = '';
      [[430, 300], [470, 460], [1150, 290], [1180, 450], [700, 290], [900, 300], [620, 470], [985, 470], [800, 486]].forEach(([x, y], k) => {
        stars += `<path transform="translate(${x} ${y}) scale(${k % 2 ? .7 : 1})" d="M0,-9 L2.4,-2.4 L9,0 L2.4,2.4 L0,9 L-2.4,2.4 L-9,0 L-2.4,-2.4 Z" fill="url(#fnPearl)" stroke="#2a0f0a" stroke-width="1"/>`;
      });
      BX.lid = G.svg(`
        <g>
          <defs><clipPath id="fnLidClip"><rect x="330" y="250" width="940" height="490" rx="16"/></clipPath></defs>
          <rect x="330" y="250" width="940" height="490" rx="16" fill="url(#fnRose)"/>
          <g clip-path="url(#fnLidClip)">${rgrain}
            <ellipse cx="760" cy="330" rx="420" ry="90" fill="#fff" opacity=".05" filter="url(#blur20)"/>
          </g>
          <rect x="330" y="250" width="940" height="490" rx="16" fill="none" stroke="${INK}" stroke-width="3.2"/>
          <rect x="346" y="266" width="908" height="458" rx="10" fill="none" stroke="#8a4632" stroke-width="2" opacity=".6"/>
          <rect x="364" y="284" width="872" height="422" rx="6" fill="none" stroke="#d8c49a" stroke-width="2.2" opacity=".55"/>
          <rect x="370" y="290" width="860" height="410" rx="4" fill="none" stroke="#2a0c08" stroke-width="1.2" opacity=".6"/>
          <!-- mother-of-pearl inlay -->
          <g class="bx-inlay">
            <path d="M520,420 C600,380 660,392 700,410 M1080,420 C1000,380 940,392 900,410" stroke="#d8c49a" stroke-width="2" fill="none" opacity=".55"/>
            <path d="M560,400 q10,-18 26,-14 M1040,400 q-10,-18 -26,-14 M620,392 q4,-16 20,-18 M980,392 q-4,-16 -20,-18" stroke="#d8c49a" stroke-width="1.6" fill="none" opacity=".5"/>
            ${stars}
            <path d="M779,286 A20,20 0 1 0 801,318 A15,15 0 1 1 779,286 Z" fill="url(#fnPearl)" stroke="#2a0f0a" stroke-width="1.2"/>
            ${pearlMoth(800, 388, 0.92, 0, 1)}
            ${pearlMoth(508, 346, 0.4, -24, .95)}
            ${pearlMoth(1092, 346, 0.4, 24, .95)}
            ${pearlMoth(640, 460, 0.24, -12, .9)}
            ${pearlMoth(960, 460, 0.24, 12, .9)}
          </g>
          ${brassCorner(330, 250, 1, 1)}${brassCorner(1270, 250, -1, 1)}${brassCorner(330, 740, 1, -1)}${brassCorner(1270, 740, -1, -1)}
          <!-- lock plate -->
          <rect x="420" y="508" width="760" height="196" rx="14" fill="#1a0a06" opacity=".6" filter="url(#fnBlur3)" transform="translate(0 5)"/>
          <rect x="420" y="508" width="760" height="196" rx="14" fill="url(#gBrass)" stroke="${INK}" stroke-width="3"/>
          <rect x="432" y="520" width="736" height="172" rx="9" fill="none" stroke="#6e4d1c" stroke-width="1.6"/>
          <rect x="438" y="526" width="724" height="160" rx="7" fill="none" stroke="#f3dc9a" stroke-width="1" opacity=".6"/>
          <path d="M440,540 C700,528 900,552 1160,534" stroke="#fff4c8" stroke-width="10" fill="none" opacity=".18" filter="url(#fnBlur3)"/>
          ${[[438, 526], [1162, 526], [438, 686], [1162, 686]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="5" fill="#e7c476" stroke="${INK}" stroke-width="1.2"/><path d="M-3,-3 L3,3" stroke="#6e4d1c" stroke-width="1.4"/></g>`).join('')}
          ${['I', 'II', 'III', 'IV'].map((n, i) => `<text x="${DIAL_X[i]}" y="${DIAL_Y + 94}" text-anchor="middle" font-family="${FELL}" font-size="15" fill="#3a2a12" opacity=".9">${n}</text>`).join('')}
          ${[620, 800, 980].map(x => `<path transform="translate(${x} ${DIAL_Y})" d="M0,-8 L3,-3 L8,0 L3,3 L0,8 L-3,3 L-8,0 L-3,-3 Z" fill="#6e4d1c" opacity=".8"/>`).join('')}
          <text x="800" y="728" text-anchor="middle" font-family="${FELL}" font-style="italic" font-size="19" fill="#d8b98a" opacity=".55" letter-spacing="3">as the nights turn, so turns the key</text>
          <g class="bx-dials">${[0, 1, 2, 3].map(dialMarkup).join('')}</g>
          <!-- hinge knuckles -->
          <rect x="430" y="240" width="60" height="16" rx="5" fill="url(#gBrass)" stroke="${INK}" stroke-width="1.8"/>
          <rect x="1110" y="240" width="60" height="16" rx="5" fill="url(#gBrass)" stroke="${INK}" stroke-width="1.8"/>
        </g>`, g);
      BX.dialEls = [...BX.lid.querySelectorAll('.dial')];
      BX.dialEls.forEach((d, i) => {
        d.dataset.i = i;
        G.hotspot(d.querySelector('.dial-hot'), {
          cursor: 'use',
          click() { turnDial(i); },
          use(item) { if (item === 'cocoon') { G.say('The dials want moons, not silk.'); G.select(null); return true; } return false; },
        });
        setMoon(d.querySelector('.dial-moon'), BX.dials[i]);
      });
      BX.lidHot = G.el('rect', { x: 330, y: 250, width: 940, height: 250, fill: 'transparent' }, g);
      G.hotspot(BX.lidHot, {
        cursor: 'look',
        click() { G.say(G.get('inkSeen') ? 'Moths in mother-of-pearl, and four little moons below. The journal\'s silver moons were drawn for this.' : 'Rosewood, inlaid with pearl moths. It is locked by four little moon dials.'); },
      });
      BX.lid.appendChild(BX.lidHot); // covers the inlay only (dials sit below y 500)
      // hinged perspective swing: the lid is re-drawn as 16 thin strips, each an affine slice of a true projection
      BX.swingDefs = G.el('defs', {}, g);
      BX.swing = G.el('g', { 'pointer-events': 'none', style: 'display:none' }, g);
      BX.strips = [];
      for (let i = 0; i < LID_N; i++) {
        const v0 = i * 490 / LID_N, v1 = (i + 1) * 490 / LID_N;
        const cp = G.el('clipPath', { id: 'fnLS' + i }, BX.swingDefs);
        G.el('rect', { x: 320, y: 250 + v0 - 0.8, width: 960, height: v1 - v0 + 1.6 }, cp);
        BX.strips.push({ v0, v1, u: G.el('use', { href: '#fnUnderArt', 'clip-path': `url(#fnLS${i})` }, BX.swing) });
      }
      BX.lidShade = G.el('polygon', { fill: '#000', opacity: 0 }, BX.swing);
    },
    update() {
      const open = !!G.get('boxOpen');
      if (!BX.opening) {
        BX.lid.style.display = open ? 'none' : '';
        BX.lidHot.style.display = open ? 'none' : '';
        BX.lid.removeAttribute('transform');
        BX.inShade.setAttribute('opacity', 0);
        if (open) renderLid(LID_OPEN); else BX.swing.style.display = 'none';
      }
      const got = !!G.get('gotCocoon');
      BX.cocoonG.style.display = got ? 'none' : '';
      BX.cocHot.style.display = got || !open ? 'none' : '';
      BX.interior.querySelector('.bx-cocglow').style.display = got ? 'none' : '';
      BX.interior.querySelector('.bx-cshadow').style.display = got ? 'none' : '';
      BX.interior.querySelector('.bx-imp').style.display = got ? '' : 'none';
      BX.letterG.style.display = G.get('letterRead') ? 'none' : '';
      BX.letterG.style.pointerEvents = open ? '' : 'none';
      BX.interior.parentNode.querySelector('.bx-warm').setAttribute('opacity', G.get('lampLit') ? .8 : 0);
      if (open) { BX.dials = SOLUTION.slice(); BX.dialEls.forEach((d, i) => setMoon(d.querySelector('.dial-moon'), BX.dials[i])); }
    },
  });

  function lidP(x, y, ph) {
    const v = y - 250, Y = 250 + v * Math.cos(ph), Z = -v * Math.sin(ph), f = LID_D / (LID_D + Z);
    return [800 + (x - 800) * f, 450 + (Y - 450) * f];
  }
  function renderLid(ph) {
    BX.swing.style.display = '';
    const face = ph <= Math.PI / 2, href = face ? '#fnLidClone' : '#fnUnderArt';
    for (const st of BX.strips) {
      const y0 = 250 + st.v0, y1 = 250 + st.v1;
      const ym = (y0 + y1) / 2;
      const A = lidP(330, ym, ph), B = lidP(1270, ym, ph), M = lidP(800, ym, ph), C0 = lidP(800, y0, ph), C1 = lidP(800, y1, ph);
      const a = (B[0] - A[0]) / 940, b = (B[1] - A[1]) / 940, c = (C1[0] - C0[0]) / (y1 - y0), d = (C1[1] - C0[1]) / (y1 - y0);
      const e = M[0] - a * 800 - c * ym, f = M[1] - b * 800 - d * ym;
      if (st.u.getAttribute('href') !== href) st.u.setAttribute('href', href);
      st.u.setAttribute('transform', `matrix(${a.toFixed(5)} ${b.toFixed(5)} ${c.toFixed(5)} ${d.toFixed(5)} ${e.toFixed(2)} ${f.toFixed(2)})`);
    }
    BX.lidShade.setAttribute('points', [[330, 250], [1270, 250], [1270, 740], [330, 740]].map(([x, y]) => lidP(x, y, ph).map(v => v.toFixed(1)).join(',')).join(' '));
    const k = face ? 0.5 * Math.sin(ph) : lerp(0.5, 0.1, clamp((ph - Math.PI / 2) / (LID_OPEN - Math.PI / 2), 0, 1));
    BX.lidShade.setAttribute('opacity', k.toFixed(3));
  }
  function dustPuff(parent) {
    const gp = G.el('g', { 'pointer-events': 'none' }, parent);
    const ps = [];
    for (let i = 0; i < 34; i++) {
      const side = i % 4, u = Math.random();
      const x = side < 2 ? 330 + u * 940 : (side === 2 ? 330 : 1270), y = side < 2 ? (side ? 740 : 250) : 250 + u * 490;
      const ang = Math.atan2(y - 495, x - 800) + rnd(-0.5, 0.5);
      ps.push({ el: G.el('circle', { cx: x, cy: y, r: rnd(1.2, 3.2), fill: '#f5e9d6', opacity: 0 }, gp), x, y, dx: Math.cos(ang) * rnd(14, 46), dy: Math.sin(ang) * rnd(10, 30) - rnd(4, 18) });
    }
    return G.tween(1300, t => ps.forEach(p => {
      p.el.setAttribute('cx', (p.x + p.dx * t).toFixed(1)); p.el.setAttribute('cy', (p.y + p.dy * t).toFixed(1));
      p.el.setAttribute('opacity', (Math.sin(Math.PI * Math.min(1, t * 1.3)) * 0.7).toFixed(3));
    }), 'out').then(() => gp.remove());
  }
  function turnDial(i) {
    if (BX.turning[i] || G.get('boxOpen') || BX.opening) return;
    BX.turning[i] = true;
    G.sfx('dial');
    const d = BX.dialEls[i];
    const rot = d.querySelector('.dial-rot'), moon = d.querySelector('.dial-moon');
    const a0 = BX.rot[i], a1 = a0 + 45;
    BX.rot[i] = a1;
    let swapped = false;
    const next = (BX.dials[i] + 1) % 8;
    G.tween(460, (t, raw) => {
      rot.setAttribute('transform', `rotate(${lerp(a0, a1, t).toFixed(2)})`);
      // moon eclipses briefly (a shutter) while the wheel turns
      const k = Math.sin(raw * Math.PI);
      moon.setAttribute('transform', `scale(${(1 - 0.12 * k).toFixed(3)})`);
      moon.setAttribute('opacity', (1 - 0.75 * k).toFixed(3));
      if (!swapped && raw >= 0.5) { swapped = true; BX.dials[i] = next; setMoon(moon, next); }
    }, 'outBack').then(() => {
      moon.removeAttribute('transform'); moon.setAttribute('opacity', 1);
      BX.turning[i] = false;
      if (BX.dials.every((v, k) => v === SOLUTION[k]) && !BX.turning.some(Boolean)) openBox();
    });
  }

  async function openBox() {
    if (BX.opening || G.get('boxOpen')) return;
    BX.opening = true;
    G.busy(true);
    try {
      await G.wait(250);
      G.sfx('lockClick');
      // dials flash one after another
      BX.dialEls.forEach((d, i) => {
        const f = d.querySelector('.dial-flash');
        setTimeout(() => G.tween(700, t => f.setAttribute('opacity', (Math.sin(t * Math.PI) * 0.95).toFixed(3)), 'linear'), i * 110);
      });
      dustPuff(BX.lid.parentNode);
      await G.wait(900);
      // lid pops a hair, then swings up on its hinge (y=250) in perspective
      await G.tween(160, t => BX.lid.setAttribute('transform', `translate(0 ${-4 * t})`), 'out');
      G.sfx('boxOpen');
      BX.lidHot.style.display = 'none';
      BX.letterG.style.pointerEvents = 'none';
      const old = BX.swingDefs.querySelector('#fnLidClone'); if (old) old.remove();
      const clone = BX.lid.cloneNode(true);
      clone.id = 'fnLidClone'; clone.removeAttribute('transform'); clone.style.display = '';
      BX.swingDefs.appendChild(clone);
      BX.lid.style.display = 'none';
      BX.inShade.setAttribute('opacity', 0.75);
      renderLid(0.001);
      await G.tween(1250, t => {
        const ph = t * LID_OPEN;
        renderLid(ph);
        BX.inShade.setAttribute('opacity', (0.75 * Math.pow(Math.max(0, Math.cos(ph)), 0.7)).toFixed(3));
      }, t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2));
      BX.inShade.setAttribute('opacity', 0);
      BX.opening = false;
      G.set('boxOpen');
      G.say('Inside, on faded silk: a cocoon — and a letter sealed with a moth.');
    } finally {
      BX.opening = false;
      G.busy(false);
      G.refresh();
    }
  }

  // ================================================================== LETTER view
  const LETTER = [
    ['Dearest —', 0],
    ['If you are reading this, I have gone', 1],
    ['where the lamps are.', 0],
    ['I could not take her with me.', 1],
    ['She is not ready yet.', 0],
    ['Keep her warm — they always wake', 1],
    ['to warmth.', 0],
    ['And then, please, let her show you', 1],
    ['the way out.', 0],
  ];
  G.registerView('letter', {
    parent: 'box',
    build(g) {
      ensureDefs();
      let y = 188;
      const lines = LETTER.map(([t, gap], i) => {
        y += (i === 0 ? 0 : 53) + (gap ? 20 : 0);
        return `<text x="${i === 0 ? 470 : 486}" y="${y}" font-family="${HAND}" font-size="${i === 0 ? 31 : 27}" fill="#2b1d14" opacity=".92">${t.replace(/&/g, '&amp;')}</text>`;
      }).join('');
      G.svg(`
        <rect width="1600" height="900" fill="#120c08"/>
        <rect width="1600" height="900" fill="url(#gWalnut)" opacity=".45"/>
        <ellipse cx="800" cy="450" rx="760" ry="520" fill="url(#fnWarmPool)" opacity=".35"/>
        <g transform="rotate(-1.2 800 440)">
          <path d="M392,62 L1204,58 L1210,806 L398,812 Z" fill="#000" opacity=".6" filter="url(#blur20)" transform="translate(10 16)"/>
          <path d="M392,62 C600,58 1000,64 1204,58 L1210,806 C1000,810 600,804 398,812 Z" fill="url(#fnPaper)" stroke="#7a6446" stroke-width="1.6"/>
          <path d="M392,62 C600,58 1000,64 1204,58 L1210,806 C1000,810 600,804 398,812 Z" fill="url(#fnPaper)" filter="url(#paper)" opacity=".9"/>
          <path d="M395,310 C700,306 900,314 1206,308" stroke="#a89068" stroke-width="2" fill="none" opacity=".55"/>
          <path d="M395,313 C700,309 900,317 1206,311" stroke="#fff8e8" stroke-width="1.5" fill="none" opacity=".5"/>
          <path d="M396,560 C700,556 900,564 1208,558" stroke="#a89068" stroke-width="2" fill="none" opacity=".5"/>
          <path d="M396,563 C700,559 900,567 1208,561" stroke="#fff8e8" stroke-width="1.5" fill="none" opacity=".45"/>
          <ellipse cx="1120" cy="720" rx="70" ry="40" fill="#a48458" opacity=".16" filter="url(#blur6)"/>
          <ellipse cx="470" cy="130" rx="50" ry="26" fill="#a48458" opacity=".14" filter="url(#blur6)"/>
          <text x="1150" y="120" text-anchor="end" font-family="${FELL}" font-style="italic" font-size="20" fill="#5a4630" opacity=".75">the attic, October</text>
          ${lines}
          <text x="1060" y="${y + 84}" font-family="${HAND}" font-size="32" fill="#2b1d14" opacity=".92">— E.</text>
          <g transform="translate(1106 ${y + 60}) rotate(-14) scale(.26)" opacity=".55" fill="none" stroke="#2b1d14" stroke-width="4">
            <path d="${FW}"/><path d="${HW}"/><g transform="scale(-1 1)"><path d="${FW}"/><path d="${HW}"/></g><ellipse cy="6" rx="5" ry="16"/>
          </g>
          <g transform="translate(800 70)">
            <path d="M-34,-4 C-30,-16 -12,-22 0,-20 C16,-20 30,-12 32,0 C30,10 16,14 0,12 C-16,12 -32,8 -34,-4 Z" fill="url(#fnWax)" stroke="#2a0808" stroke-width="1.4" opacity=".92"/>
            <path d="M-6,-18 L-2,-4 L6,-12 L4,8" stroke="#2a0808" stroke-width="1.6" fill="none"/>
          </g>
        </g>
      `, g);
      const hot = G.el('rect', { x: 390, y: 58, width: 822, height: 756, fill: 'transparent' }, g);
      G.hotspot(hot, { cursor: 'look', click() { G.say('"Keep her warm — they always wake to warmth."'); } });
    },
    enter() { G.sfx('paper'); },
  });
  G.on('view', (id, prev) => {
    if (id === 'letter' && prev && prev !== 'letter' && G.views.letter) G.views.letter.parent = prev;
  });

  // ================================================================== ITEMS
  G.registerItem('letter', {
    name: 'Edith\'s letter',
    desc: 'Folded in three, sealed with a moth in red wax. Her hand — hurried, tender.',
    icon: `<g transform="rotate(-8 50 50)">
      <rect x="12" y="24" width="76" height="52" rx="2" fill="#e8dcc0" stroke="${INK}" stroke-width="3"/>
      <path d="M12,26 L50,56 L88,26" fill="none" stroke="#8a7456" stroke-width="2.4"/>
      <path d="M22,66 C34,62 44,68 56,64" stroke="#3a281c" stroke-width="1.6" fill="none" opacity=".6"/>
      <circle cx="50" cy="56" r="10" fill="#7a2626" stroke="${INK}" stroke-width="2"/>
      <path d="M44,54 q6,-8 12,0 q-6,6 -12,0" fill="#a33a33"/>
    </g>`,
    inspect() { G.go('letter'); },
  });
  G.registerItem('cocoon', {
    name: 'Cocoon',
    desc: 'Silk-wrapped and faintly warm. Something inside is waiting.',
    icon: `<g transform="translate(50 52) rotate(-32) scale(.4)">
      <ellipse rx="130" ry="80" fill="#fff4cf" opacity=".35"/>
      <path d="${COC}" fill="url(#fnCocoon)" stroke="${INK}" stroke-width="6"/>
      <path d="M-60,-30 Q-40,0 -52,34 M-20,-38 Q0,0 -12,40 M20,-38 Q40,0 28,40 M60,-30 Q78,0 66,30" stroke="#fff" stroke-width="4" fill="none" opacity=".6"/>
      <path d="M-100,2 C-116,-4 -126,-14 -140,-16 M100,-6 C116,-14 128,-22 140,-30" stroke="#f4eee0" stroke-width="4" fill="none"/>
    </g>`,
  });

  // ================================================================== DOOR (north)
  // closed-door geometry (stage units); the leaf is re-projected every frame while it swings (hinge = left edge).
  const DL = 672, DR = 928, DT = 188, DB = 788, PX = 800, PY = 446, PLATE_S = 1.0;
  const CAMX = 800, CAMY = 470, CAMD = 1150, OPEN_ANG = 93;
  function proj(x, y, th) {
    const u = x - DL, X = DL + u * Math.cos(th), Z = u * Math.sin(th), f = CAMD / (CAMD + Z);
    return [CAMX + (X - CAMX) * f, CAMY + (y - CAMY) * f];
  }
  function plateMarkup(detail) {
    // brass moth with hollow wings; `detail` adds engraving & rivets (for the close-up)
    const wing = d => `<path d="${d}"/><path d="${d}" transform="scale(-1 1)"/>`;
    const ring = (sc, cls, w, col, op) => `<g class="${cls}" transform="scale(${sc})" fill="none" stroke="${col}" stroke-width="${w / sc}" opacity="${op}" stroke-linejoin="round">${wing(FW)}${wing(HW)}</g>`;
    let teeth = '';
    for (let a = 0; a < 16; a++) teeth += `<rect x="-3" y="-35" width="6" height="8" rx="1" transform="rotate(${a * 22.5})"/>`;
    let rays = '';
    for (let a = 0; a < 24; a++) { const r = a * 15 * Math.PI / 180; rays += `M${(Math.sin(r) * 34).toFixed(1)},${(-Math.cos(r) * 34).toFixed(1)} L${(Math.sin(r) * 120).toFixed(1)},${(-Math.cos(r) * 120).toFixed(1)} `; }
    return `
      <g class="pl">
                <g class="pl-rays" fill="none" stroke="#fff1c1" stroke-width="1.2" opacity="0"><path d="${rays}"/></g>
        <!-- brass rim (outer silhouette) -->
        <g fill="none" stroke="${INK}" stroke-width="12" stroke-linejoin="round">${wing(FW)}${wing(HW)}</g>
        <g fill="none" stroke="url(#gBrass)" stroke-width="9" stroke-linejoin="round">${wing(FW)}${wing(HW)}</g>
        <g fill="none" stroke="#f3dc9a" stroke-width="1.4" stroke-linejoin="round" opacity=".55" transform="translate(-.6 -1.2)">${wing(FW)}${wing(HW)}</g>
        ${detail ? ring(1.1, 'pl-eng', 0.9, '#5a3d16', .8) : ''}
        <!-- hollow recesses -->
        <g fill="#0b0705" stroke="#3a2a12" stroke-width="1.6" stroke-linejoin="round">${wing(FW)}${wing(HW)}</g>
        <g fill="none" stroke="#000" stroke-width="5" opacity=".7" transform="translate(0 2.5)" clip-path="url(#fnPlClip)">${wing(FW)}${wing(HW)}</g>
        <g class="pl-fill" opacity="0">
          <g fill="#8fd4a4" opacity=".55">${wing(FW)}${wing(HW)}</g>
          <g fill="none" stroke="#dcffe4" stroke-width="1.6" opacity=".8">${wing(FW)}${wing(HW)}</g>
        </g>
        <g class="pl-lines" fill="none" stroke="#fff4c4" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" filter="url(#fnBloom)">
          <g class="pl-l0" opacity="0">${wing(FW)}${wing(HW)}</g>
          <g class="pl-l1" opacity="0" transform="scale(1.1)">${wing(FW)}${wing(HW)}</g>
          <g class="pl-l2" opacity="0" transform="scale(1.2)">${wing(FW)}${wing(HW)}</g>
        </g>
        <!-- raised brass body -->
        <g stroke="${INK}" stroke-width="1.6">
          <g transform="scale(1.2)" stroke-width="1"><g opacity=".85" transform="translate(.6 .8)">${antenna(1).replace(/stroke="#[0-9a-f]+"/g, 'stroke="#1c140f"')}${antenna(-1).replace(/stroke="#[0-9a-f]+"/g, 'stroke="#1c140f"')}</g>${antenna(1).replace('#d8b96a', '#e7c476').replace('#a88442', '#b8893a')}${antenna(-1).replace('#d8b96a', '#e7c476').replace('#a88442', '#b8893a')}</g>
          <ellipse cy="17" rx="10" ry="21" fill="url(#gBrass)"/>
          <path d="M-6,8 Q0,11 6,8 M-6.4,14 Q0,17 6.4,14 M-6,20 Q0,23 6,20 M-4.6,26 Q0,28.5 4.6,26" stroke="#6e4d1c" stroke-width="1" fill="none"/>
          <ellipse cy="-6" rx="11" ry="11.5" fill="url(#gBrass)"/>
          <path d="M-9,-10 Q0,-16 9,-10" stroke="#6e4d1c" stroke-width="1.4" fill="none"/>
          <path d="M-8,-2 l-3,2 M8,-2 l3,2 M-7,3 l-3,3 M7,3 l3,3" stroke="#6e4d1c" stroke-width="1" fill="none"/>
          <circle cy="-18" r="5.2" fill="url(#gBrass)"/>
          <path d="M-4,-10 C-2,-14 3,-14 5,-10" stroke="#fff1c1" stroke-width="1.4" fill="none" opacity=".7"/>
        </g>
        ${[[60, -41], [53, -3], [42, 32], [27, 99], [-60, -41], [-53, -3], [-42, 32], [-27, 99]].map(([x, y]) => `<g class="pl-riv" data-x="${x}" data-y="${y}" transform="translate(${x} ${y})"><circle r="4.6" fill="url(#gBrass)" stroke="${INK}" stroke-width=".8"/><path d="M-3.8,0 H3.8" stroke="#2a1c08" stroke-width="1.5"/><circle cx="-1.5" cy="-1.6" r="1.1" fill="#fff1c1" opacity=".85"/></g><path class="pl-glint" transform="translate(${x - 1.5} ${y - 1.5})" d="M0,-7 L1,-1 L7,0 L1,1 L0,7 L-1,1 L-7,0 L-1,-1 Z" fill="#fffbe6" opacity="0"/>`).join('')}
      </g>`;
  }
  const D = { th: 0, polys: [], plateM: null };
  function mkPoly(parent, pts, attrs) {
    const el = G.el('polygon', attrs, parent);
    D.polys.push({ el, pts });
    return el;
  }
  function mkLine(parent, pts, attrs) {
    const el = G.el('polyline', Object.assign({ fill: 'none' }, attrs), parent);
    D.polys.push({ el, pts });
    return el;
  }
  function setMech(k) { // 0 = locked, 1 = drawn back
    const o = D.mech0, sh = (dst, src, dx, dy) => dst.forEach((p, i) => { p[0] = src[i][0] + dx; p[1] = src[i][1] + dy; });
    const r = clamp(k * 2, 0, 1), b = clamp(k * 2 - 1, 0, 1);
    sh(D.rod, o.rod, -26 * smooth(r), 0); sh(D.knob, o.knob, -26 * smooth(r), 0);
    sh(D.barU, o.barU, 0, 30 * smooth(b)); sh(D.barL, o.barL, 0, -30 * smooth(b));
    const a = k * Math.PI; // hub turns (drawn as a rotating square)
    D.hub.forEach((p, i) => { const an = a + i * Math.PI / 2 + Math.PI / 4; p[0] = 915 + Math.cos(an) * 8.5; p[1] = 446 + Math.sin(an) * 8.5; });
    setDoor(D.th);
  }
  function setDoor(th) {
    D.th = th;
    for (const p of D.polys) p.el.setAttribute('points', p.pts.map(([x, y]) => proj(x, y, th).map(v => v.toFixed(1)).join(',')).join(' '));
    const p0 = proj(PX, PY, th), pu = proj(PX + 1, PY, th), pv = proj(PX, PY + 1, th);
    D.plate.setAttribute('transform', `matrix(${(pu[0] - p0[0]).toFixed(5)} ${(pu[1] - p0[1]).toFixed(5)} ${(pv[0] - p0[0]).toFixed(5)} ${(pv[1] - p0[1]).toFixed(5)} ${p0[0].toFixed(2)} ${p0[1].toFixed(2)}) scale(${PLATE_S})`);
    const k = Math.sin(th);
    D.shade.setAttribute('opacity', (0.62 * k).toFixed(3));
    D.edgeShadow.setAttribute('opacity', (Math.min(1, k * 2.5) * 0.85).toFixed(3));
    const fe = proj(DR, DT, th), fb = proj(DR, DB, th);
    D.edgeShadow.setAttribute('points', `${fe[0]},${fe[1]} ${fe[0] + 60 * k},${fe[1]} ${fb[0] + 60 * k},${fb[1]} ${fb[0]},${fb[1]}`);
  }

  const MOON = { x: 806, y: 300, r: 30 };
  function buildSky(g) {
    const R = srand(99);
    let stars = '';
    for (let i = 0; i < 90; i++) {
      const x = DL + R() * (DR - DL), y = DT + R() * 430, r = R();
      stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 1.1 + .3).toFixed(2)}" fill="#fff" opacity="${(R() * .55 + .2).toFixed(2)}"/>`;
    }
    const ridge = (y0, amp, step, seed) => {
      const Rr = srand(seed); let d = `M${DL - 20},${DB + 20} L${DL - 20},${y0}`;
      for (let x = DL - 20; x <= DR + 20; x += step) d += ` L${x},${(y0 - Rr() * amp).toFixed(1)}`;
      return d + ` L${DR + 20},${DB + 20} Z`;
    };
    // treeline: rounded crowns
    let trees = `M${DL - 20},${DB + 20} L${DL - 20},700`;
    const Rt = srand(12);
    for (let x = DL - 20; x < DR + 20;) {
      const w = 10 + Rt() * 16, h = 18 + Rt() * 34;
      trees += ` L${x.toFixed(1)},700 Q${(x + w * 0.1).toFixed(1)},${(700 - h).toFixed(1)} ${(x + w / 2).toFixed(1)},${(700 - h - 4).toFixed(1)} Q${(x + w * 0.9).toFixed(1)},${(700 - h).toFixed(1)} ${(x + w).toFixed(1)},700`;
      x += w;
    }
    trees += ` L${DR + 20},${DB + 20} Z`;
    const roofs = `M${DL - 20},${DB + 20} L${DL - 20},744 L700,744 L700,726 L708,726 L708,744 L728,744 L752,724 L790,724 L812,744 L840,744 L840,736 L862,712 L884,736 L884,744 L912,744 L912,732 L920,732 L920,744 L${DR + 20},744 L${DR + 20},${DB + 20} Z`;
    G.svg(`
      <defs>
        <clipPath id="fnDoorway"><rect x="${DL}" y="${DT}" width="${DR - DL}" height="${DB - DT}"/></clipPath>
        <radialGradient id="fnMoonGlowS" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#eaf2ff" stop-opacity=".55"/><stop offset=".4" stop-color="#9fbde6" stop-opacity=".18"/><stop offset="1" stop-color="#6f93c2" stop-opacity="0"/></radialGradient>
      </defs>
      <g clip-path="url(#fnDoorway)">
        <rect x="${DL - 10}" y="${DT - 10}" width="${DR - DL + 20}" height="${DB - DT + 20}" fill="url(#fnSky)"/>
        ${stars}
        <circle cx="${MOON.x}" cy="${MOON.y}" r="190" fill="url(#fnMoonGlowS)"/>
        <g filter="url(#blur6)" opacity=".75">
          <ellipse cx="740" cy="392" rx="120" ry="9" fill="#3d5f8c"/><ellipse cx="900" cy="360" rx="100" ry="8" fill="#4a6c98"/>
          <ellipse cx="760" cy="389" rx="90" ry="3" fill="#dfeaff" opacity=".6"/>
        </g>
        <path d="${ridge(640, 26, 22, 3)}" fill="#3f5f8a" opacity=".75"/>
        <rect x="${DL}" y="600" width="${DR - DL}" height="80" fill="#9fbde6" opacity=".18" filter="url(#blur6)"/>
        <path d="${ridge(676, 18, 14, 8)}" fill="#223a5c"/>
        <path d="${trees}" fill="#101d31"/>
        <rect x="${DL}" y="690" width="${DR - DL}" height="30" fill="#9fbde6" opacity=".12" filter="url(#blur6)"/>
        <path d="${roofs}" fill="#060b14"/>
        <rect x="857" y="724" width="6" height="7" fill="#ffcf7a" opacity=".75"/>
        <g class="fn-skymoths"></g>
        <circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r + 10}" fill="#eaf2ff" opacity=".35" filter="url(#blur6)"/>
        <circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r}" fill="#fbf8ec"/>
        <circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r}" fill="url(#fnMoonLit)" opacity=".55"/>
        <g fill="#b9b39c" opacity=".4"><ellipse cx="${MOON.x - 9}" cy="${MOON.y - 8}" rx="7" ry="5.5"/><ellipse cx="${MOON.x + 8}" cy="${MOON.y + 7}" rx="9" ry="6.5"/><ellipse cx="${MOON.x - 4}" cy="${MOON.y + 13}" rx="4" ry="3"/></g>
      </g>`, g);
    return g.querySelector('.fn-skymoths');
  }

  G.registerWallObject('north', {
    z: 5,
    build(g) {
      ensureDefs();
      if (!document.getElementById('fnPlClip')) {
        document.getElementById('defs').insertAdjacentHTML('beforeend',
          `<clipPath id="fnPlClip"><path d="${FW}"/><path d="${HW}"/><path d="${FW}" transform="scale(-1 1)"/><path d="${HW}" transform="scale(-1 1)"/></clipPath>`);
      }
      // shadow of the recess behind the door + night beyond
      D.skyMoths = buildSky(G.el('g', {}, g));
      // jamb reveals (depth of the wall), seen once the door is open
      const rv = G.el('g', {}, g);
      const dz = 40, f = CAMD / (CAMD + dz);
      const q = (x, y) => [CAMX + (x - CAMX) * f, CAMY + (y - CAMY) * f];
      const [a1, a2] = [q(DR, DT), q(DR, DB)], [b1, b2] = [q(DL, DT), q(DR, DT)];
      G.el('polygon', { points: `${DR},${DT} ${DR},${DB} ${a2[0]},${a2[1]} ${a1[0]},${a1[1]}`, fill: '#1c110a' }, rv);
      G.el('polygon', { points: `${DL},${DT} ${DR},${DT} ${b2[0]},${b2[1]} ${b1[0]},${b1[1]}`, fill: '#140c07' }, rv);
      D.edgeShadow = G.el('polygon', { points: '', fill: '#050302', opacity: 0, filter: 'url(#fnBlur3)' }, g);
      // --------- the leaf (projected)
      G.svg(`<defs><clipPath id="fnLeafClip"><rect x="${DL}" y="0" width="400" height="900"/></clipPath></defs>`, g);
      const leaf = D.leaf = G.el('g', { 'stroke-linejoin': 'round', 'clip-path': 'url(#fnLeafClip)' }, g);
      mkPoly(leaf, [[DL, DT], [DR, DT], [DR, DB], [DL, DB]], { fill: 'url(#fnDoorWood)', stroke: INK, 'stroke-width': 3 });
      // grain
      for (let i = 0; i < 14; i++) {
        const x0 = DL + 10 + i * 17.5 + (i % 3) * 3;
        const pts = [];
        for (let k = 0; k <= 12; k++) pts.push([x0 + Math.sin(k * 0.9 + i) * 3, DT + 4 + k * ((DB - DT - 8) / 12)]);
        mkLine(leaf, pts, { stroke: i % 2 ? '#150b06' : '#4a2e1a', 'stroke-width': i % 4 ? 1 : 1.8, opacity: .5 });
      }
      const panel = (x1, y1, x2, y2) => {
        const b = 9;
        mkPoly(leaf, [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], { fill: '#1a0f08', stroke: INK, 'stroke-width': 2 });
        mkPoly(leaf, [[x1, y1], [x2, y1], [x2 - b, y1 + b], [x1 + b, y1 + b]], { fill: '#120a05' });
        mkPoly(leaf, [[x1, y1], [x1 + b, y1 + b], [x1 + b, y2 - b], [x1, y2]], { fill: '#1c1109' });
        mkPoly(leaf, [[x2, y1], [x2, y2], [x2 - b, y2 - b], [x2 - b, y1 + b]], { fill: '#4a2f1b' });
        mkPoly(leaf, [[x1, y2], [x2, y2], [x2 - b, y2 - b], [x1 + b, y2 - b]], { fill: '#5a3a22' });
        mkPoly(leaf, [[x1 + b, y1 + b], [x2 - b, y1 + b], [x2 - b, y2 - b], [x1 + b, y2 - b]], { fill: 'url(#fnPanel)', stroke: '#140a05', 'stroke-width': 1.2 });
        mkLine(leaf, [[x1 + b + 4, y2 - b - 4], [x1 + b + 4, y1 + b + 4], [x2 - b - 4, y1 + b + 4]], { stroke: '#6a4a30', 'stroke-width': 1, opacity: .5 });
      };
      panel(694, 212, 792, 372); panel(808, 212, 906, 372);
      panel(694, 598, 792, 766); panel(808, 598, 906, 766);
      // middle rail plate zone
      mkPoly(leaf, [[694, 386], [906, 386], [906, 584], [694, 584]], { fill: '#26170d', stroke: '#140a05', 'stroke-width': 1.5, opacity: .8 });
      mkLine(leaf, [[DL + 2, DT + 2], [DR - 2, DT + 2]], { stroke: '#7a5236', 'stroke-width': 1.5, opacity: .5 });
      // --- locking mechanism: an espagnolette bar in two halves along the free edge + a bolt rod from the plate
      const brass = { fill: 'url(#gBrass)', stroke: INK, 'stroke-width': 1.3 };
      mkPoly(leaf, [[909, DT + 2], [923, DT + 2], [923, DB - 2], [909, DB - 2]], { fill: '#0d0805', opacity: .85 });          // bar channel
      D.barU = [[911, DT - 14], [921, DT - 14], [921, 428], [911, 428]];
      D.barL = [[911, 464], [921, 464], [921, DB + 14], [911, DB + 14]];
      mkPoly(leaf, D.barU, brass); mkPoly(leaf, D.barL, brass);
      mkPoly(leaf, [[846, 438], [926, 438], [926, 454], [846, 454]], { fill: '#0b0705', stroke: '#6e4d1c', 'stroke-width': 1.4 }); // rod slot
      D.rod = [[866, 441.5], [946, 441.5], [946, 450.5], [866, 450.5]];
      D.knob = [[858, 438], [870, 438], [870, 454], [858, 454]];
      mkPoly(leaf, D.rod, brass); mkPoly(leaf, D.knob, brass);
      [250, 340, 560, 690].forEach(y => mkPoly(leaf, [[906, y], [926, y], [926, y + 9], [906, y + 9]], brass));             // guide straps
      mkPoly(leaf, [[902, 426], [928, 426], [928, 466], [902, 466]], brass);                                                // gear housing
      D.hub = [[909, 440], [921, 440], [921, 452], [909, 452]];
      mkPoly(leaf, D.hub, { fill: '#6e4d1c', stroke: INK, 'stroke-width': 1 });
      D.mech0 = { barU: D.barU.map(p => p.slice()), barL: D.barL.map(p => p.slice()), rod: D.rod.map(p => p.slice()), knob: D.knob.map(p => p.slice()), hub: D.hub.map(p => p.slice()) };
      D.plate = G.el('g', {}, leaf);
      G.svg(`<ellipse cx="0" cy="20" rx="92" ry="96" fill="#000" opacity=".5" filter="url(#blur6)" transform="translate(0 6)"/>${plateMarkup(false)}`, D.plate);
      D.shade = mkPoly(leaf, [[DL, DT], [DR, DT], [DR, DB], [DL, DB]], { fill: '#000', opacity: 0 });
      // --------- frame (static, on top)
      G.svg(`
        <g stroke="${INK}" stroke-width="3" stroke-linejoin="round" filter="url(#ink)">
          <path d="M640,${DB + 10} L640,170 L652,150 L948,150 L960,170 L960,${DB + 10} L${DR},${DB + 10} L${DR},${DT} L${DL},${DT} L${DL},${DB + 10} Z" fill="url(#fnFrame)"/>
          <path d="M626,160 L974,160 L968,138 L632,138 Z" fill="#5a3824"/>
          <path d="M618,138 L982,138 L976,122 L624,122 Z" fill="#7a4e30"/>
        </g>
        <path d="M650,176 V${DB + 6} M950,176 V${DB + 6}" stroke="#9a6a44" stroke-width="2" opacity=".45"/>
        <path d="M662,${DT - 6} H938" stroke="#1a0f08" stroke-width="2" opacity=".6"/>
        <g transform="translate(800 148)">
          <path d="M-22,-10 L22,-10 L16,14 L-16,14 Z" fill="#6a4228" stroke="${INK}" stroke-width="2"/>
          <path d="M-5,-2 A7,7 0 1 0 5,8 A5.5,5.5 0 1 1 -5,-2 Z" fill="#c9a877" opacity=".85"/>
        </g>
        <!-- hinges -->
        ${[250, 500, 730].map(y => `<g><rect x="664" y="${y}" width="12" height="42" rx="3" fill="url(#gBrass)" stroke="${INK}" stroke-width="1.6"/><path d="M664,${y + 14} h12 M664,${y + 28} h12" stroke="#6e4d1c" stroke-width="1"/></g>`).join('')}
        <!-- threshold -->
        <rect x="640" y="${DB}" width="320" height="10" fill="url(#gBrass)" stroke="${INK}" stroke-width="1.6" opacity=".9"/>
      `, g);
      // thin cold light under the closed door
      D.underLight = G.svg(`<rect x="${DL + 4}" y="${DB - 3}" width="${DR - DL - 8}" height="3" fill="#cfe3ff" opacity=".6" filter="url(#fnBloom)"/>`, g);
      // hotspot
      D.hot = G.el('rect', { x: DL, y: DT, width: DR - DL, height: DB - DT, fill: 'transparent' }, g);
      G.hotspot(D.hot, {
        cursor: 'look',
        click() { if (!G.get('doorOpen')) G.go('door'); },
        use(item) {
          if (item === 'cocoon') { G.say('Not yet. It is sleeping.'); G.select(null); return true; }
          if (item === 'key') { G.say('There is no keyhole. Not anywhere.'); G.select(null); return true; }
          return false;
        },
      });
      D.built = true;
      setDoor(0);
    },
    update() {
      if (D.animating) return;
      const open = !!G.get('doorOpen');
      D.th = open ? OPEN_ANG * Math.PI / 180 : 0; setMech(open ? 1 : 0);
      D.underLight.style.display = open ? 'none' : '';
      D.hot.style.display = open ? 'none' : '';
      const lit = !!G.get('hatched');
      D.plate.querySelector('.pl-fill').setAttribute('opacity', lit ? .85 : 0);
      if (open) { ensureOpenLight(1); SW.roomOn = true; if (G.view() === 'north') startSwarm(); }
    },
    enter() { if (G.get('doorOpen')) startSwarm(); },
    exit() { stopSwarm(); },
  });

  // moonlight flooding in: a shaft through the doorway onto the floor (north top layer)
  const LT = {};
  function ensureOpenLight(alpha) {
    const top = topLayer('north');
    if (!LT.g || !LT.g.isConnected) {
      LT.g = G.el('g', { class: 'fn-light' }, top);
      G.svg(`
        <defs>
          <linearGradient id="fnShaft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#dfeaff" stop-opacity=".02"/><stop offset=".55" stop-color="#dfeaff" stop-opacity=".14"/><stop offset="1" stop-color="#eef4ff" stop-opacity=".3"/>
          </linearGradient>
          <linearGradient id="fnFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#f4f8ff" stop-opacity=".95"/><stop offset=".6" stop-color="#cfe3ff" stop-opacity=".5"/><stop offset="1" stop-color="#cfe3ff" stop-opacity=".15"/>
          </linearGradient>
        </defs>
        <g style="mix-blend-mode:screen">
          <polygon class="fn-shaft" points="${DL + 30},${DT + 20} ${DR},${DT + 20} 1250,900 700,900" fill="url(#fnShaft)" filter="url(#blur6)"/>
          <polygon points="${DL + 30},${DB} ${DR},${DB} 1255,900 690,900" fill="url(#fnFloor)" filter="url(#fnSoftGrain)"/>
          <polygon points="${DL + 60},${DB + 4} ${DR - 10},${DB + 4} 1090,870 780,870" fill="#ffffff" opacity=".3" filter="url(#fnSoftGrain)"/>
          <rect x="${DL - 3}" y="${DT - 3}" width="${DR - DL + 6}" height="${DB - DT + 6}" fill="none" stroke="#e6f0ff" stroke-width="5" opacity=".45" filter="url(#blur6)"/>
          <ellipse class="fn-burst" cx="${(DL + DR) / 2}" cy="470" rx="240" ry="360" fill="url(#fnWhitePool)" opacity="0"/>
        </g>
        <g class="fn-roommoths"></g>`, LT.g);
      LT.room = LT.g.querySelector('.fn-roommoths');
      LT.shaft = LT.g.querySelector('.fn-shaft');
      LT.burst = LT.g.querySelector('.fn-burst');
    }
    LT.g.setAttribute('opacity', alpha.toFixed(3));
  }

  // moths streaming toward the moon (behind the door) + a few drifting out into the room
  const SW = { sky: [], room: [], running: false, raf: 0 };
  function spawnSky(m, scatter) {
    m.z = Math.pow(Math.random(), 1.6);                       // mostly far & small, a few near & large
    const edge = Math.random();
    if (edge < 0.6) { m.x = rnd(DL - 10, DR + 10); m.y = DB + rnd(0, 30); }
    else { m.x = Math.random() < 0.5 ? DL - 12 : DR + 12; m.y = rnd(420, DB); }
    if (scatter) { m.x = rnd(DL, DR); m.y = rnd(DT + 40, DB); }
    m.s = lerp(0.03, 0.14, m.z); m.a = lerp(0.3, 1, m.z); m.sp = lerp(22, 70, m.z);
    m.sw = rnd(0.35, 0.9) * (Math.random() < 0.5 ? 1 : -1); m.ph = rnd(0, 6.28); m.hz = rnd(5, 9);
    return m;
  }
  function initSwarm() {
    if (SW.sky.length) return;
    for (let i = 0; i < 120; i++) {
      const m = spawnSky({}, true);
      m.glow = m.z > 0.55 ? G.el('circle', { r: 26 * m.s / 0.14, fill: 'url(#fnGreenPool)', opacity: 0 }, D.skyMoths) : null;
      m.u = G.el('use', { href: m.z > 0.5 ? '#fnTinyLuna' : '#fnTiny', opacity: 0 }, D.skyMoths);
      SW.sky.push(m);
    }
  }
  function spawnRoom(m, scatter) {
    m.x = rnd(DL + 40, DR - 40); m.y = rnd(DT + 160, DB - 60);
    const ang = rnd(-0.9, 0.9) + (Math.random() < 0.5 ? 0 : Math.PI);
    m.vx = Math.cos(ang) * rnd(50, 120); m.vy = rnd(-18, 30);
    m.gs = rnd(0.08, 0.16); m.life = 0; m.max = rnd(4, 7); m.ph = rnd(0, 6.28); m.hz = rnd(6, 10);
    if (scatter) m.life = rnd(0, m.max);
    return m;
  }
  function initRoom() {
    if (SW.room.length || !LT.room) return;
    for (let i = 0; i < 16; i++) SW.room.push(spawnRoom({ u: G.el('use', { href: i % 3 ? '#fnTiny' : '#fnTinyLuna', opacity: 0 }, LT.room) }, true));
  }
  function startSwarm() {
    if (SW.running) return;
    initSwarm();
    SW.running = true;
    let last = performance.now();
    const loop = now => {
      if (!SW.running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const T = now / 1000, A = SW.alpha == null ? 1 : SW.alpha;
      for (const m of SW.sky) {
        const dx = MOON.x - m.x, dy = MOON.y - m.y, d = Math.hypot(dx, dy) || 1;
        const tx = -dy / d, ty = dx / d;                          // swirl around the moon while drawn in
        m.x += (dx / d * m.sp + tx * m.sp * m.sw + Math.sin(T * 1.7 + m.ph) * 8) * dt;
        m.y += (dy / d * m.sp + ty * m.sp * m.sw + Math.cos(T * 1.3 + m.ph) * 6) * dt;
        const near = clamp((d - 26) / 90, 0, 1);                  // fade into the moon
        if (d < 30) spawnSky(m);
        const fl = 0.3 + 0.7 * Math.abs(Math.cos(T * m.hz + m.ph));
        const s = m.s * (0.55 + 0.45 * near);
        m.u.setAttribute('transform', `translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) rotate(${(Math.atan2(dx, -dy) * 57.3 * 0.4).toFixed(1)}) scale(${(s * fl).toFixed(4)} ${s.toFixed(4)})`);
        m.u.setAttribute('opacity', (m.a * near * A).toFixed(2));
        if (m.glow) { m.glow.setAttribute('cx', m.x.toFixed(1)); m.glow.setAttribute('cy', m.y.toFixed(1)); m.glow.setAttribute('opacity', (0.5 * near * A).toFixed(2)); }
      }
      if (LT.room && SW.roomOn) {
        initRoom();
        for (const m of SW.room) {
          m.life += dt;
          if (m.life > m.max) spawnRoom(m);
          const k = m.life / m.max;
          m.x += m.vx * dt * (0.4 + k); m.y += m.vy * dt * (0.4 + k) + Math.sin(T * 2 + m.ph) * 0.5;
          const s = lerp(0.05, m.gs * 2, k), fl = 0.25 + 0.75 * Math.abs(Math.cos(T * m.hz + m.ph));
          let a = Math.min(1, k * 5) * (1 - smooth(clamp((k - 0.7) / 0.3, 0, 1))) * 0.8;
          if (m.y < 200) a *= clamp((m.y - 150) / 50, 0, 1);    // keep the band above the door clear
          m.u.setAttribute('transform', `translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) rotate(${(m.vx * 0.15).toFixed(1)}) scale(${(s * fl).toFixed(4)} ${s.toFixed(4)})`);
          m.u.setAttribute('opacity', a.toFixed(2));
        }
      }
      if (LT.shaft) LT.shaft.setAttribute('opacity', (0.85 + 0.15 * Math.sin(T * 0.6)).toFixed(3));
      SW.raf = requestAnimationFrame(loop);
    };
    SW.raf = requestAnimationFrame(loop);
  }
  function stopSwarm() { SW.running = false; cancelAnimationFrame(SW.raf); }

  // ================================================================== DOOR close-up
  const DV = {};
  G.registerView('door', {
    parent: 'north',
    build(g) {
      ensureDefs();
      let grain = '';
      for (let i = 0; i < 40; i++) {
        const x = i * 42 + (i % 3) * 7;
        grain += `<path d="M${x},0 C${x + 12},300 ${x - 10},600 ${x + 6},900" stroke="${i % 2 ? '#140a05' : '#4a2e1a'}" stroke-width="${i % 4 ? 1.4 : 2.6}" fill="none" opacity=".45"/>`;
      }
      const arcR = 330;
      G.svg(`
        <rect width="1600" height="900" fill="#2a190e"/>
        <rect width="1600" height="900" fill="url(#fnDoorWood)" opacity=".9"/>
        ${grain}
        <!-- panel moulding framing the plate -->
        <rect x="250" y="40" width="1100" height="760" rx="6" fill="none" stroke="#140a05" stroke-width="18"/>
        <rect x="262" y="52" width="1076" height="736" rx="4" fill="none" stroke="#5a3a22" stroke-width="3" opacity=".7"/>
        <radialGradient id="fnDoorVig" cx="50%" cy="48%" r="68%"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></radialGradient>
        <ellipse cx="800" cy="420" rx="560" ry="420" fill="#8fb3d9" opacity=".05"/>
        <defs><path id="fnArc" d="M${800 - arcR},${430} A${arcR},${arcR} 0 0 1 ${800 + arcR},${430}"/></defs>
        <text font-family="${FELL}" font-size="34" fill="#140a05" letter-spacing="10" opacity=".9"><textPath href="#fnArc" startOffset="50%" text-anchor="middle">ONLY  SHE  MAY  OPEN  IT</textPath></text>
        <text font-family="${FELL}" font-size="34" fill="#c9a877" letter-spacing="10" opacity=".55" transform="translate(-1 -1.5)"><textPath href="#fnArc" startOffset="50%" text-anchor="middle">ONLY  SHE  MAY  OPEN  IT</textPath></text>
        <text x="800" y="790" text-anchor="middle" font-family="${FELL}" font-style="italic" font-size="22" fill="#c9a877" opacity=".45" letter-spacing="4">A. Vane, clockmaker · 1871</text>
      `, g);
      DV.plate = G.el('g', { transform: 'translate(800 392) scale(3.0)' }, g);
      G.svg(`<ellipse cx="0" cy="22" rx="92" ry="96" fill="#000" opacity=".55" filter="url(#blur6)" transform="translate(0 4)"/>${plateMarkup(true)}`, DV.plate);
      G.svg(`<rect width="1600" height="900" fill="url(#fnDoorVig)" pointer-events="none"/>`, g);
      const hot = G.el('rect', { x: 500, y: 190, width: 600, height: 590, fill: 'transparent' }, g);
      G.hotspot(hot, {
        cursor: 'look',
        click() { G.say('The door has no handle — only this brass moth. Its wings are hollow, as if waiting for something to fill them.'); },
        use(item) {
          if (item === 'cocoon') { G.say('Not yet. It is sleeping.'); G.select(null); return true; }
          if (item === 'key') { G.say('There is no keyhole. Not anywhere.'); G.select(null); return true; }
          return false;
        },
      });
      const bg = G.el('rect', { width: 1600, height: 900, fill: 'transparent' }, g);
      g.insertBefore(bg, g.firstChild.nextSibling);
      G.hotspot(bg, { cursor: 'look', click() { G.say('Dark oak, heavy as a wall. No handle. No hinges on this side.'); } });
    },
    update() { DV.plate.querySelector('.pl-fill').setAttribute('opacity', G.get('hatched') ? .85 : 0); },
  });

  // ================================================================== FINALE
  function useOnLamp(item) {
    if (item !== 'cocoon') return;
    if (!G.get('lampLit')) { G.say('It is cold... it needs warmth.'); G.select(null); return true; }
    play();
    return true;
  }

  // letterbox bars in #fx
  const LB = {};
  function letterbox(on, ms) {
    const fx = document.getElementById('fx');
    if (!LB.g) {
      LB.g = G.el('g', { class: 'fn-letterbox' }, fx);
      LB.a = G.el('rect', { x: -10, y: 0, width: 1620, height: 0, fill: '#000' }, LB.g);
      LB.b = G.el('rect', { x: -10, y: 900, width: 1620, height: 0, fill: '#000' }, LB.g);
    }
    const h0 = +LB.a.getAttribute('height'), h1 = on ? 58 : 0;
    return G.tween(ms || 900, t => {
      const h = lerp(h0, h1, t);
      LB.a.setAttribute('height', h.toFixed(1));
      LB.b.setAttribute('y', (900 - h).toFixed(1)); LB.b.setAttribute('height', h.toFixed(1));
    });
  }

  let playing = false;
  async function play() {
    if (playing) return;
    playing = true;
    G.busy(true);
    try {
      if (!G.get('lampLit')) G.set('lampLit');
      if (G.view() !== 'south') await G.go('south', { instant: true });
      G.select(null);
      if (G.has('cocoon')) G.take('cocoon');
      await sceneSouth();
      await sceneNorth();
    } catch (e) {
      console.error(e);
      G.set('hatched'); G.set('doorOpen');
    } finally {
      G.busy(false);
      playing = false;
    }
    G.finish();
  }

  async function sceneSouth() {
    const L = topLayer('south');
    const FL = (window.DESK && DESK.flame) || { x: 900, y: 468 };
    const layer = G.el('g', { class: 'fn-hatch' }, L);
    const pool = G.el('ellipse', { cx: 800, cy: 552, rx: 150, ry: 50, fill: 'url(#fnWarmPool)', opacity: 0 }, layer);
    const CX = 806, CY = 552;
    const c = makeCocoon(layer, CX, CY, 0.5, -6);
    c.outer.setAttribute('opacity', 0);
    const shadow = G.el('ellipse', { cx: CX + 4, cy: CY + 21, rx: 50, ry: 5, fill: '#1a0a04', opacity: 0, filter: 'url(#fnBlur3)' }, layer);
    layer.insertBefore(shadow, c.outer);
    resetCam('south');
    letterbox(true, 900);
    // zoom in while the cocoon is set down beside the lamp — and it starts warming at once
    const camP = cam('south', { s: 1.85, x: 872, y: 470 }, 1200, 'inOut');
    G.sfx('pickup');
    let tremble = 0, warmK = 0, alive = true;
    const t0 = performance.now();
    G.tween(600, t => {
      c.outer.setAttribute('opacity', Math.min(1, t * 2).toFixed(3));
      c.y = CY - 26 * (1 - t);
      shadow.setAttribute('opacity', (0.55 * t).toFixed(3));
    }, 'out');
    c.y = CY - 26;
    (function jitter(now) {
      if (!alive) return;
      const T = (now - t0) / 1000;
      const j = tremble * (Math.sin(T * 47) * 0.6 + Math.sin(T * 83) * 0.4);
      c.outer.setAttribute('transform', `translate(${CX + j * 0.6} ${c.y}) rotate(${-6 + j * 2.4}) scale(.5)`);
      const beat = 0.5 + 0.5 * Math.sin(T * (4 + warmK * 7));
      c.cores.forEach(e => e.setAttribute('opacity', (0.55 + warmK * (0.3 + 0.15 * beat)).toFixed(3)));
      c.warms.forEach(e => e.setAttribute('opacity', (warmK * 0.3).toFixed(3)));
      c.halo.setAttribute('opacity', (0.12 + warmK * (0.16 + 0.1 * beat)).toFixed(3));
      c.halo.setAttribute('fill', warmK > 0.3 ? '#ffd79a' : '#fff4cf');
      pool.setAttribute('opacity', (warmK * (0.55 + 0.15 * beat)).toFixed(3));
      requestAnimationFrame(jitter);
    })(t0);
    await G.wait(450);
    await G.tween(1350, t => { warmK = t; tremble = t < 0.4 ? 0 : (t - 0.4) * 1.5; }, 'linear');
    await camP;
    c.y = CY;
    // --- crack, then the silk tears open along the top, fibres trailing
    G.sfx('cocoonCrack');
    tremble = 1.6;
    await G.wait(170);
    tremble = 1.0;
    await G.tween(280, t => c.setTear(t * 0.35), 'out');
    alive = false;
    c.breathe.querySelectorAll('animateTransform').forEach(a => a.remove());
    c.outer.setAttribute('transform', `translate(${CX} ${CY}) rotate(-6) scale(.5)`);
    // the moth emerges through the tear: clip her to everything above the tear's lower lip
    const lipPts = tearPath(1).lo.map(([x, y]) => c.toStage(x, y + 2));
    const clipId = 'fnEmerge' + (uid++);
    const cp = G.el('clipPath', { id: clipId }, layer);
    const L0 = lipPts[0], L1 = lipPts[lipPts.length - 1];
    G.el('polygon', { points: [[L0[0] - 30, L0[1] + 1], ...lipPts, [L1[0] + 30, L1[1] + 1], [L1[0] + 200, CY - 300], [L0[0] - 200, CY - 300]].map(q => q.join(',')).join(' ') }, cp);
    const mw = G.el('g', { 'clip-path': `url(#${clipId})` }, layer);
    const m = makeMoth(mw);
    const [ex, ey] = c.toStage(-6, -30);
    Object.assign(m, { x: ex, y: ey + 16, rot: -8, s: 0.34, open: 0, hopen: 0, grow: 0.5, glow: 0, alpha: 1 });
    m.crumple(20); m.apply();
    G.sfx('cocoonCrack');
    const flash = G.el('ellipse', { cx: ex, cy: ey - 4, rx: 60, ry: 30, fill: 'url(#fnWhitePool)', opacity: 0 }, layer);
    await G.tween(450, t => {
      c.setTear(lerp(0.35, 1, t));
      flash.setAttribute('opacity', (Math.sin(t * Math.PI) * 0.8).toFixed(3));
      m.y = ey + 16 - 6 * t; m.apply();
    }, 'out');
    flash.remove();
    // --- she crawls out: head first, wings still crumpled and wet
    await G.tween(800, t => {
      m.y = lerp(ey + 10, ey - 26, t); m.x = lerp(ex, ex + 4, t);
      m.s = lerp(0.34, 0.62, t); m.rot = lerp(-8, -3, t);
      m.grow = lerp(0.5, 0.56, t); m.open = 0.1 + 0.08 * Math.sin(t * 9); m.hopen = m.open;
      m.glow = 0.3 * t;
      m.apply();
    }, 'inOut');
    mw.removeAttribute('clip-path'); cp.remove();
    // --- wings unfurl: pumped full, crumples smoothing out
    await G.tween(1100, (t, raw) => {
      const pump = Math.sin(raw * Math.PI * 4) * (1 - raw) * 0.06;
      m.grow = clamp(lerp(0.56, 1, t) + pump, 0, 1.02);
      m.crumple(lerp(20, 0, smooth(raw)));
      m.open = 0.55 + 0.45 * t + Math.sin(raw * 11) * 0.05 * (1 - raw); m.hopen = m.open - 0.05 * (1 - raw);
      m.s = lerp(0.62, 0.7, t);
      m.glow = lerp(0.3, 0.6, t);
      m.apply();
    }, 'out');
    m.crumple(0); m.grow = 1;
    // one testing beat
    await hover(m, 500, { hz: 2, amp: t => 0.8 * Math.sin(Math.PI * t) });
    // --- first flight: up to the flame, once around the lamp, then away left
    G.sfx('mothFlutter');
    const mshadow = G.el('ellipse', { cx: m.x, cy: 576, rx: 30, ry: 4, fill: '#2a1206', opacity: 0, filter: 'url(#fnBlur3)' }, layer);
    layer.insertBefore(mshadow, c.outer.nextSibling);
    const ox = FL.x, oy = FL.y - 18, rx = 140, ry = 54;
    const pts = [[m.x, m.y], [m.x + 8, m.y - 36], [ox - 60, oy + 46]];
    const a0 = Math.atan2(46 / ry, -60 / rx);
    for (let i = 1; i <= 8; i++) { const a = a0 + (i / 8) * Math.PI * 2 * 0.96; pts.push([ox + Math.cos(a) * rx, oy + Math.sin(a) * ry]); }
    pts.push([ox - 190, oy - 70], [ox - 380, oy - 130], [ox - 560, oy - 170]);
    const camOut = { started: false };
    await fly(m, pts, {
      ms: 2400,
      hz: t => t < 0.08 ? 4 : 6.5,
      amp: t => Math.min(1, 0.7 + t * 4),
      ease: t => { const k = 0.1; return t < k ? (t * t) / (2 * k) / (1 - k / 2) : (t - k / 2) / (1 - k / 2); },
      scale(t, p) {
        const dep = clamp((p.y - oy) / ry, -1, 1);
        const orbit = t > 0.15 && t < 0.8 ? 1 : (t <= 0.15 ? t / 0.15 : Math.max(0, (1 - t) / 0.2));
        m.alpha = 1 - 0.18 * clamp(-dep, 0, 1) * orbit;
        m.glow = 0.55 + 0.25 * orbit;
        return (0.7 + 0.08 * dep * orbit) * (t > 0.8 ? lerp(1, 0.85, (t - 0.8) / 0.2) : 1);
      },
      onFrame(t) {
        const h = clamp((575 - m.y) / 220, 0, 1);
        mshadow.setAttribute('cx', m.x.toFixed(1));
        mshadow.setAttribute('rx', (46 * m.s * (1 + h)).toFixed(1));
        mshadow.setAttribute('opacity', (0.32 * (1 - h * 0.7) * (m.x > 700 && m.x < 1100 ? 1 : 0.4)).toFixed(3));
        pool.setAttribute('opacity', (0.7 - 0.3 * t).toFixed(3));
        if (t > 0.72 && !camOut.started) { camOut.started = true; cam('south', { s: 1.6, x: 780, y: 450 }, 700, 'inOut'); }
      },
    });
    m.remove(); mshadow.remove();
    // leave the empty shell by the lamp
    c.cores.forEach(e => e.setAttribute('opacity', 0.15));
    c.warms.forEach(e => e.setAttribute('opacity', 0.2));
    c.halo.setAttribute('opacity', 0.06);
    pool.setAttribute('opacity', 0);
    // whip-pan left out of the desk, a blink of black, whip in on the door
    const sg = viewG('south'), wb = document.querySelector('.fn-whipb');
    const c0 = cams.south || { s: 1, x: 800, y: 450 };
    sg.setAttribute('filter', 'url(#fnWhip)');
    await G.tween(240, t => { setCam('south', c0.s, c0.x - 320 * t, c0.y); wb.setAttribute('stdDeviation', `${(12 * t).toFixed(1)} 0`); }, 'in');
    await G.go('north', { dur: 40 });
    sg.removeAttribute('filter'); resetCam('south');
  }

  async function sceneNorth() {
    const L = topLayer('north');
    D.animating = true;
    // whip in from the right; the moth is already in frame as the blur clears
    const ng = viewG('north'), wb = document.querySelector('.fn-whipb');
    ng.setAttribute('filter', 'url(#fnWhip)');
    cams.north = { s: 1, x: 1080, y: 450 }; setCam('north', 1, 1080, 450);
    G.tween(330, t => { setCam('north', 1, lerp(1080, 800, t), 450); wb.setAttribute('stdDeviation', `${(12 * (1 - t)).toFixed(1)} 0`); }, 'out')
      .then(() => { ng.removeAttribute('filter'); cams.north = { s: 1, x: 800, y: 450 }; setCam('north', 1, 800, 450); });
    const m = makeMoth(L);
    Object.assign(m, { x: 1320, y: 190, s: 0.66, rot: -40, glow: 0.7, open: 1, hopen: 1 });
    m.apply();
    const plateGlow = G.el('circle', { cx: PX, cy: PY + 10, r: 120, fill: 'url(#fnGreenPool)', opacity: 0 }, L);
    L.insertBefore(plateGlow, m.g);
    // glide to the door while the camera leans in
    const camIn = G.wait(340).then(() => cam('north', { s: 1.6, x: 800, y: 452 }, 1450, 'inOut'));
    G.sfx('mothFlutter');
    await fly(m, [[1320, 190], [1150, 190], [1000, 290], [880, 330], [812, 368], [800, 392]], {
      ms: 1700,
      ease: t => 1 - Math.pow(1 - t, 1.6),
      hz: t => lerp(6.2, 3.4, t),
      amp: t => lerp(1, 0.75, t),
      scale: t => lerp(0.66, 1.0, t),
    });
    await camIn;
    // settle into the plate: wings spread flat and fill the hollows exactly
    const s0 = m.s, x0 = m.x, y0 = m.y, r0 = m.rot;
    await hover(m, 700, {
      hz: t => lerp(3, 1.4, t),
      amp: t => 0.7 * (1 - smooth(t)),
      onFrame(t) {
        const e = smooth(t);
        m.x = lerp(x0, PX, e); m.y = lerp(y0, PY, e) - Math.sin(t * Math.PI) * 6;
        m.s = lerp(s0, PLATE_S, e); m.rot = lerp(r0, 0, e);
      },
    });
    m.open = 1; m.hopen = 1; m.x = PX; m.y = PY; m.s = PLATE_S; m.rot = 0; m.apply();
    G.sfx('magic');
    // she glows; the brass answers — three lines and the rays, overlapped into one 0.7s swell
    const lines = ['.pl-l0', '.pl-l1', '.pl-l2'].map(s => D.plate.querySelector(s));
    const rays = D.plate.querySelector('.pl-rays');
    lines.forEach(el => { el.setAttribute('opacity', 1); el.querySelectorAll('path').forEach(p => { p.setAttribute('stroke-dasharray', 420); p.setAttribute('stroke-dashoffset', 420); }); });
    await G.tween(700, (t, raw) => {
      plateGlow.setAttribute('opacity', (0.9 * t).toFixed(3)); m.glow = lerp(0.7, 1, t); m.apply();
      lines.forEach((el, i) => {
        const k = smooth(clamp((raw - i * 0.15) / 0.7, 0, 1));
        el.querySelectorAll('path').forEach(p => p.setAttribute('stroke-dashoffset', (420 * (1 - k)).toFixed(1)));
      });
      rays.setAttribute('opacity', (Math.sin(clamp((raw - 0.3) / 0.7, 0, 1) * Math.PI) * 0.8).toFixed(3));
    }, 'out');
    // --- the mechanism: frame the keeper and bar, rivets turn with a glint, the bolt rod and bar slide back
    G.sfx('doorUnlock');
    const rivs = [...D.plate.querySelectorAll('.pl-riv')];
    const glints = [...D.plate.querySelectorAll('.pl-glint')];
    let clicked = false;
    await G.tween(900, (t, raw) => {
      const e = smooth(clamp(raw / 0.45, 0, 1));
      setCam('north', lerp(1.6, 1.9, e), lerp(800, 880, e), lerp(452, 420, e));
      m.glow = lerp(1, 0.35, e); m.apply();
      plateGlow.setAttribute('opacity', (0.9 - 0.55 * e).toFixed(3));
      const rt = smooth(clamp(raw / 0.55, 0, 1));
      rivs.forEach((r, i) => r.setAttribute('transform', `translate(${r.dataset.x} ${r.dataset.y}) rotate(${((i % 2 ? -1 : 1) * 180 * rt).toFixed(1)})`));
      glints.forEach(g => g.setAttribute('opacity', (Math.sin(rt * Math.PI) * 0.95).toFixed(3)));
      setMech(smooth(clamp((raw - 0.3) / 0.7, 0, 1)));
      if (!clicked && raw > 0.55) { clicked = true; G.sfx('lockClick'); }
    }, 'linear');
    cams.north = { s: 1.9, x: 880, y: 420 };
    D.plate.querySelector('.pl-fill').setAttribute('opacity', 0.6);
    lines.forEach(el => el.setAttribute('opacity', 0.4));
    // she lifts from the plate as the door gives; the camera pulls back
    const camOut = cam('north', { s: 1, x: 800, y: 450 }, 1100, 'inOut');
    await hover(m, 500, {
      hz: 3.5, amp: t => smooth(t) * 0.9,
      onFrame(t) { m.y = lerp(PY, PY - 60, smooth(t)); m.s = lerp(PLATE_S, 1.0, smooth(t)); m.glow = lerp(0.35, 1, t); },
    });
    // --- the door swings open
    G.sfx('doorOpen');
    D.underLight.style.display = 'none';
    D.hot.style.display = 'none';
    ensureOpenLight(0);
    L.appendChild(m.g);
    SW.alpha = 0;
    startSwarm();
    const openP = G.tween(2400, t => {
      setDoor(t * OPEN_ANG * Math.PI / 180);
      ensureOpenLight(smooth(clamp(t * 1.4, 0, 1)));
      LT.burst.setAttribute('opacity', (Math.sin(clamp(t * 1.6, 0, 1) * Math.PI) * 0.6).toFixed(3));
      plateGlow.setAttribute('opacity', (0.35 * (1 - t)).toFixed(3));
      SW.alpha = clamp(t * 1.5, 0, 1);
      if (t > 0.35) SW.roomOn = true;
    }, t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2));
    // she goes out through the door, towards the moon, among the others
    const flyOut = fly(m, [[m.x, m.y], [868, 360], [894, 306], [856, 252], [792, 266], [788, 300], [MOON.x, MOON.y]], {
      ms: 5000,
      hz: t => lerp(5.5, 4, t),
      ease: t => t,
      scale: t => lerp(1.0, 0.045, Math.pow(t, 0.7)),
      onFrame(t) { m.alpha = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15; m.glow = 1; },
    });
    await camOut;
    await openP;
    G.set('hatched');
    G.set('doorOpen');
    D.animating = false;
    await flyOut;
    m.remove();
    plateGlow.remove();
    letterbox(false, 900);
  }

  // ================================================================== hints / debug / exports
  G.registerHint({
    id: 'box', order: 60,
    when: () => G.get('inkSeen') && !G.get('boxOpen'),
    lines: ['The silver moons in the journal were meant for something with moons of its own.',
      'The writing box on the desk has four moon dials.',
      'Set the box dials to: new moon, first quarter (right half lit), full moon, last quarter (left half lit).'],
  });
  G.registerHint({
    id: 'hatch', order: 70,
    when: () => G.get('boxOpen') && !G.get('hatched'),
    lines: ['Read Edith\'s letter again. What did she ask of you?',
      '"They always wake to warmth." What is the warmest thing in the room?',
      'Hold the cocoon close to the lit lamp. Let it warm.'],
  });
  G.registerStep(60, 'box', () => {
    G.set('boxOpen'); G.give('letter'); G.set('letterRead'); G.give('cocoon'); G.set('gotCocoon');
  });

  window.FINALE = Object.assign(window.FINALE || {}, {
    play() { if (!G.has('cocoon') && !G.get('hatched')) { G.set('boxOpen'); G.set('gotCocoon'); } return play(); },
    useOnLamp,
    phaseNames: PHASE_NAMES,
    _dials: () => BX.dials.slice(),
    _lid: deg => { const c = BX.lid.cloneNode(true); c.id = 'fnLidClone'; c.removeAttribute('transform'); c.style.display = ''; const o = BX.swingDefs.querySelector('#fnLidClone'); if (o) o.remove(); BX.swingDefs.appendChild(c); BX.lid.style.display = 'none'; renderLid(deg * Math.PI / 180); BX.inShade.setAttribute('opacity', (0.75 * Math.pow(Math.max(0, Math.cos(deg * Math.PI / 180)), 0.7)).toFixed(3)); },
    _openBox: () => { BX.dials = SOLUTION.slice(); return openBox(); },
  });
})();
