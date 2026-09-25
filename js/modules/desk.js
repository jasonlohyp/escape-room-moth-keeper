/* THE MOTH KEEPER — desk module (south wall): oil lamp, moth projection, Edith's journal.
 * Owns: wall objects on 'south' (projection z-5, journal z4, lamp z6) + close-up view 'journal'.
 * Exposes:
 *   window.MOTHS.silhouettes = {atlas, luna, hawk, emperor}  (path d strings, 0 0 200 140 box, centred 100,70)
 *   window.DESK = { flame:{x,y}, onLampUse(fn(itemId)=>true|undefined), lampUseHandlers:[] }
 *     — other modules (e.g. finale: cocoon on lit lamp) can claim item-use on the lamp.
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------ moth silhouettes
  // Right half of each moth (body at x=100). Mirrored + winding-normalised into one path.
  const HALF = {
    atlas: {
      wings: [
        [103, 52, ['C', 116, 34, 145, 22, 170, 18], ['C', 182, 16, 190, 12, 197, 5], ['C', 200, 16, 197, 30, 186, 35],
          ['C', 182, 37, 180, 36, 177, 34], ['C', 178, 46, 176, 58, 170, 66], ['C', 156, 74, 128, 74, 104, 66]],
        [104, 68, ['C', 130, 72, 160, 72, 175, 84], ['C', 181, 96, 174, 110, 162, 118], ['C', 150, 127, 132, 127, 122, 118],
          ['C', 112, 110, 106, 96, 103, 82]],
        // feathered antenna
        [101, 46, ['C', 106, 36, 112, 28, 121, 21], ['C', 119, 30, 111, 40, 102, 48]],
      ],
      body: 'M100 42 C106 42 108 58 107 74 C106 90 104 100 100 103 C96 100 94 90 93 74 C92 58 94 42 100 42 Z',
    },
    luna: {
      wings: [
        [103, 50, ['C', 112, 36, 135, 24, 160, 19], ['C', 169, 17, 174, 22, 171, 30], ['C', 166, 44, 156, 58, 140, 66],
          ['C', 128, 70, 114, 68, 104, 62]],
        [104, 64, ['C', 122, 66, 146, 70, 152, 82], ['C', 156, 94, 147, 104, 137, 109], ['C', 136, 116, 142, 128, 149, 136],
          ['C', 151, 140, 145, 141, 142, 139], ['C', 134, 131, 124, 119, 118, 109], ['C', 110, 100, 104, 88, 102, 74]],
        [101, 44, ['C', 106, 34, 112, 26, 120, 20], ['C', 118, 29, 110, 38, 102, 46]],
      ],
      body: 'M100 40 C105 40 106 56 106 70 C106 86 103 96 100 99 C97 96 94 86 94 70 C94 56 95 40 100 40 Z',
    },
    hawk: {
      wings: [
        [103, 44, ['C', 120, 42, 150, 50, 178, 66], ['C', 188, 72, 194, 78, 197, 85], ['C', 186, 87, 170, 83, 150, 77],
          ['C', 130, 71, 114, 65, 104, 61]],
        [104, 62, ['C', 120, 66, 138, 74, 147, 85], ['C', 140, 93, 124, 93, 108, 86], ['C', 105, 80, 104, 70, 104, 62]],
        [101, 32, ['C', 104, 24, 110, 17, 119, 12], ['C', 112, 19, 106, 26, 102, 34]],
      ],
      body: 'M100 29 C105 29 107 40 107 52 C107 70 106 96 103 118 C102 126 101 133 100 134 C99 133 98 126 97 118 C94 96 93 70 93 52 C93 40 95 29 100 29 Z',
    },
    emperor: {
      wings: [
        [103, 54, ['C', 106, 36, 124, 20, 146, 18], ['C', 168, 16, 185, 30, 183, 49], ['C', 181, 63, 160, 71, 138, 71],
          ['C', 124, 71, 110, 67, 104, 62]],
        [104, 66, ['C', 124, 68, 160, 70, 173, 86], ['C', 183, 103, 168, 123, 146, 125], ['C', 126, 127, 110, 113, 105, 95],
          ['C', 103, 85, 103, 75, 104, 66]],
        [101, 46, ['C', 106, 37, 112, 30, 121, 25], ['C', 119, 33, 111, 41, 102, 48]],
      ],
      body: 'M100 44 C106 44 108 58 108 72 C108 88 105 98 100 101 C95 98 92 88 92 72 C92 58 94 44 100 44 Z',
    },
  };
  function subArea(sp) {
    const pts = [[sp[0], sp[1]]];
    sp.slice(2).forEach(s => { for (let i = 1; i < s.length; i += 2) pts.push([s[i], s[i + 1]]); });
    let a = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return a;
  }
  function reverseSub(sp) {
    const segs = sp.slice(2);
    const ends = [[sp[0], sp[1]]];
    segs.forEach(s => ends.push([s[s.length - 2], s[s.length - 1]]));
    const out = [ends[ends.length - 1][0], ends[ends.length - 1][1]];
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i], p = ends[i];
      if (s[0] === 'C') out.push(['C', s[3], s[4], s[1], s[2], p[0], p[1]]);
      else if (s[0] === 'Q') out.push(['Q', s[1], s[2], p[0], p[1]]);
      else out.push(['L', p[0], p[1]]);
    }
    return out;
  }
  function mirrorSub(sp) {
    return [200 - sp[0], sp[1]].concat(sp.slice(2).map(s => {
      const o = [s[0]];
      for (let i = 1; i < s.length; i += 2) o.push(200 - s[i], s[i + 1]);
      return o;
    }));
  }
  const r1 = v => Math.round(v * 10) / 10;
  function subToD(sp) {
    if (subArea(sp) < 0) sp = reverseSub(sp);
    return 'M' + r1(sp[0]) + ' ' + r1(sp[1]) + ' ' + sp.slice(2).map(s => s[0] + s.slice(1).map(r1).join(' ')).join(' ') + ' Z';
  }
  function bodyD(d) { // body is authored clockwise-ish; normalise via parse
    const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
    const sp = [n[0], n[1]];
    for (let i = 2; i + 5 < n.length + 1; i += 6) sp.push(['C', n[i], n[i + 1], n[i + 2], n[i + 3], n[i + 4], n[i + 5]]);
    return subToD(sp);
  }
  const SIL = {};
  Object.keys(HALF).forEach(k => {
    const h = HALF[k];
    const parts = [];
    h.wings.forEach(w => { parts.push(subToD(w)); parts.push(subToD(mirrorSub(w))); });
    parts.push(bodyD(h.body));
    SIL[k] = parts.join(' ');
  });
  window.MOTHS = window.MOTHS || {};
  window.MOTHS.silhouettes = SIL;

  const DESK = window.DESK = window.DESK || {};
  DESK.flame = { x: 900, y: 468 };
  DESK.lampUseHandlers = DESK.lampUseHandlers || [];
  DESK.onLampUse = fn => DESK.lampUseHandlers.push(fn);

  const HAND = `'Homemade Apple', 'IM Fell English', cursive`;
  const FELL = `'IM Fell English', 'Cormorant Garamond', Georgia, serif`;
  const INK = '#1c140f';

  // ------------------------------------------------------------------ shared state/refs
  const R = {};            // refs to live elements
  let lightingNow = false; // lamp-lighting animation in progress (update() must not snap)
  let projShown = false;

  // ================================================================== PROJECTION (south, behind)
  // Projection slots (arc, as thrown up by a round shade)
  const SLOTS = [
    { k: 'atlas', x: 552, y: 246, s: 1.0, r: -8 },
    { k: 'luna', x: 734, y: 204, s: 0.96, r: -3 },
    { k: 'hawk', x: 914, y: 206, s: 0.96, r: 3 },
    { k: 'emperor', x: 1092, y: 246, s: 1.0, r: 8 },
  ];
  G.registerWallObject('south', {
    z: -5,
    build(g) {
      G.svg(`
        <defs>
          <radialGradient id="dkWash" cx="900" cy="372" r="520" gradientUnits="userSpaceOnUse" gradientTransform="translate(900 372) scale(1 0.62) translate(-900 -372)">
            <stop offset="0" stop-color="#ffcf7a" stop-opacity="0.34"/>
            <stop offset="0.45" stop-color="#e0953a" stop-opacity="0.16"/>
            <stop offset="1" stop-color="#e0853a" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="dkMothLight" cx="50%" cy="50%" r="60%">
            <stop offset="0" stop-color="#fff1c1"/>
            <stop offset="0.55" stop-color="#ffd98e"/>
            <stop offset="1" stop-color="#f0a24c"/>
          </radialGradient>
          <radialGradient id="dkHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#ffcf7a" stop-opacity="0.6"/>
            <stop offset="0.35" stop-color="#f0a24c" stop-opacity="0.25"/>
            <stop offset="1" stop-color="#e0853a" stop-opacity="0"/>
          </radialGradient>
          <filter id="dkSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>
          <filter id="dkBleed" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>
          <filter id="dkWeave" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.9" numOctaves="2" seed="11" result="n"/>
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.15" result="a"/>
            <feComposite in="SourceGraphic" in2="a" operator="in"/>
          </filter>
        </defs>`, g);
      // warm halo around lamp (desk pool + wall bloom)
      R.halo = G.el('g', { opacity: 0, 'pointer-events': 'none' }, g);
      G.el('ellipse', { cx: 900, cy: 452, rx: 420, ry: 300, fill: 'url(#dkHalo)' }, R.halo);
      G.el('ellipse', { cx: 900, cy: 580, rx: 360, ry: 60, fill: 'url(#dkHalo)', opacity: 0.8 }, R.halo);

      R.proj = G.el('g', { opacity: 0, 'pointer-events': 'none', style: 'mix-blend-mode:screen' }, g);
      // broad fan of light thrown up the wall by the shade's open top
      G.el('path', { d: 'M852 362 L380 60 Q900 -30 1420 60 L948 362 Z', fill: 'url(#dkWash)', filter: 'url(#dkBleed)' }, R.proj);
      // the bright rim of the shade's top opening
      G.el('ellipse', { cx: 900, cy: 336, rx: 150, ry: 26, fill: '#ffcf7a', opacity: 0.18, filter: 'url(#dkBleed)' }, R.proj);
      R.moths = [];
      SLOTS.forEach((s, i) => {
        const outer = G.el('g', { transform: `translate(${s.x} ${s.y}) rotate(${s.r}) scale(${s.s})` }, R.proj);
        const inner = G.el('g', {}, outer);
        const t = 'translate(-100 -70)';
        G.el('path', { d: SIL[s.k], transform: t, fill: '#f0a24c', opacity: 0.55, filter: 'url(#dkBleed)' }, inner);
        G.el('path', { d: SIL[s.k], transform: t, fill: 'url(#dkMothLight)', opacity: 0.92, filter: 'url(#dkSoft)' }, inner);
        G.el('path', { d: SIL[s.k], transform: t, fill: '#fff6d8', opacity: 0.35, filter: 'url(#dkWeave)' }, inner);
        R.moths.push({ outer, inner, s });
      });
      // click target (only live when lit)
      R.projHot = G.el('path', { d: 'M440 110 H1160 V330 H440 Z', fill: 'transparent', 'pointer-events': 'none' }, g);
      G.hotspot(R.projHot, {
        cursor: 'look',
        click() { G.say("Four moths, cast by the lampshade. Edith's four dearest."); },
      });
    },
    update() {
      const lit = !!G.get('lampLit');
      R.projHot.setAttribute('pointer-events', lit ? 'all' : 'none');
      if (lightingNow) return;
      R.proj.setAttribute('opacity', lit ? 1 : 0);
      R.halo.setAttribute('opacity', lit ? 1 : 0);
      projShown = lit;
    },
  });

  // ================================================================== JOURNAL (lying on the desk)
  G.registerWallObject('south', {
    z: 4,
    build(g) {
      const jg = G.el('g', {}, g);
      G.svg(`
        <defs>
          <linearGradient id="dkCover" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#7a3230"/><stop offset="0.55" stop-color="#5e2322"/><stop offset="1" stop-color="#3a1414"/>
          </linearGradient>
          <linearGradient id="dkEdges" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#e8dcc0"/><stop offset="1" stop-color="#a8966e"/>
          </linearGradient>
          <linearGradient id="dkSheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#cfe3ff" stop-opacity="0"/>
            <stop offset="0.5" stop-color="#eef6ff" stop-opacity="0.85"/>
            <stop offset="1" stop-color="#cfe3ff" stop-opacity="0"/>
          </linearGradient>
          <clipPath id="dkBookTop"><path d="M534 548 L706 544 L724 566 L516 571 Z"/></clipPath>
        </defs>
        <!-- contact shadow -->
        <ellipse cx="620" cy="576" rx="118" ry="9" fill="#000" opacity="0.45" filter="url(#blur6)"/>
        <!-- back cover edge -->
        <path d="M516 571 L724 566 L724 574 L516 580 Z" fill="#3a1414" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <!-- page block -->
        <path d="M520 568 L721 563 L721 570 L520 575 Z" fill="url(#dkEdges)"/>
        <path d="M522 570.5 L719 565.6 M522 572.5 L719 567.6" stroke="#8a7a58" stroke-width="0.6" opacity="0.8"/>
        <!-- top cover -->
        <path d="M534 548 L706 544 L724 566 L516 571 Z" fill="url(#dkCover)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" filter="url(#ink)"/>
        <!-- spine band -->
        <path d="M534 548 L516 571 L530 570.6 L546 547.7 Z" fill="#3a1414" opacity="0.7"/>
        <!-- tooled border -->
        <path d="M552 550.5 L700 547.2 L713 563.6 L540 567.6 Z" fill="none" stroke="#b8893a" stroke-width="1" opacity="0.7"/>
        <!-- embossed moth on cover -->
        <g transform="translate(626 557) scale(0.16 0.085)" opacity="0.8">
          <path d="${SIL.luna}" transform="translate(-100 -70)" fill="#b8893a"/>
        </g>
        <!-- ribbon bookmark -->
        <path d="M640 575 C641 582 636 588 640 594 L636 600 L642 597 L646 602 L646 594 C642 588 646 582 645 574 Z" fill="#2f5f5a" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      `, jg);
      // moonlight shimmer
      R.shimmer = G.el('g', { opacity: 0, 'pointer-events': 'none' }, jg);
      const sh = G.el('g', { 'clip-path': 'url(#dkBookTop)' }, R.shimmer);
      G.el('path', { d: 'M534 548 L706 544 L724 566 L516 571 Z', fill: '#cfe3ff', opacity: 0.25 }, sh);
      G.svg(`<rect x="440" y="530" width="70" height="60" fill="url(#dkSheen)" transform="skewX(-30)">
        <animate attributeName="x" values="700;1260;1260" keyTimes="0;0.55;1" dur="3.2s" repeatCount="indefinite"/></rect>`, sh);
      const spark = G.svg(`
        <g fill="#f2f8ff" filter="url(#moonglow)">
          <path d="M600 556 l2 -7 l2 7 l7 2 l-7 2 l-2 7 l-2 -7 l-7 -2 Z"><animate attributeName="opacity" values="0;1;0;0" dur="2.4s" repeatCount="indefinite"/></path>
          <path d="M676 552 l1.5 -5 l1.5 5 l5 1.5 l-5 1.5 l-1.5 5 l-1.5 -5 l-5 -1.5 Z"><animate attributeName="opacity" values="0;0;1;0" dur="2.4s" repeatCount="indefinite"/></path>
          <path d="M560 564 l1.2 -4 l1.2 4 l4 1.2 l-4 1.2 l-1.2 4 l-1.2 -4 l-4 -1.2 Z"><animate attributeName="opacity" values="1;0;0;1" dur="3.1s" repeatCount="indefinite"/></path>
        </g>`, R.shimmer);
      void spark;
      const hot = G.el('path', { d: 'M512 538 L730 534 L732 606 L510 610 Z', fill: 'transparent' }, jg);
      G.hotspot(hot, { cursor: 'look', click() { G.sfx('paper'); G.go('journal'); } });
    },
    update() {
      R.shimmer.setAttribute('opacity', G.get('windowOpen') && !G.get('inkSeen') ? 1 : 0);
    },
  });

  // ================================================================== OIL LAMP
  G.registerWallObject('south', {
    z: 6,
    build(g) {
      G.svg(`
        <defs>
          <linearGradient id="dkBrassH" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#6e4d1c"/><stop offset="0.28" stop-color="#e7c476"/><stop offset="0.45" stop-color="#b8893a"/>
            <stop offset="0.8" stop-color="#7a5620"/><stop offset="1" stop-color="#4a3210"/>
          </linearGradient>
          <linearGradient id="dkGlass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#cfe3ff" stop-opacity="0.18"/><stop offset="0.25" stop-color="#ffffff" stop-opacity="0.55"/>
            <stop offset="0.4" stop-color="#cfe3ff" stop-opacity="0.08"/><stop offset="0.85" stop-color="#cfe3ff" stop-opacity="0.12"/>
            <stop offset="1" stop-color="#ffffff" stop-opacity="0.35"/>
          </linearGradient>
          <linearGradient id="dkShadeCold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#5b5a4c"/><stop offset="0.3" stop-color="#a39a7c"/><stop offset="0.6" stop-color="#8a8268"/><stop offset="1" stop-color="#3c3b33"/>
          </linearGradient>
          <radialGradient id="dkShadeLit" cx="50%" cy="80%" r="75%">
            <stop offset="0" stop-color="#fff1c1"/><stop offset="0.45" stop-color="#ffcf7a"/><stop offset="0.85" stop-color="#e0853a"/><stop offset="1" stop-color="#9a4a1c"/>
          </radialGradient>
          <radialGradient id="dkFlame" cx="50%" cy="72%" r="60%">
            <stop offset="0" stop-color="#ffffff"/><stop offset="0.3" stop-color="#fff1c1"/><stop offset="0.7" stop-color="#ffcf7a"/><stop offset="1" stop-color="#e0853a"/>
          </radialGradient>
          <radialGradient id="dkBulbGlow" cx="50%" cy="60%" r="55%">
            <stop offset="0" stop-color="#fff1c1" stop-opacity="0.95"/><stop offset="0.5" stop-color="#ffcf7a" stop-opacity="0.45"/><stop offset="1" stop-color="#e0853a" stop-opacity="0"/>
          </radialGradient>
          <clipPath id="dkShadeClip"><path d="M852 364 C870 360 930 360 948 364 L1002 446 C960 456 840 456 798 446 Z"/></clipPath>
        </defs>`, g);
      const L = G.el('g', {}, g);
      // contact shadow
      G.el('ellipse', { cx: 900, cy: 576, rx: 78, ry: 8, fill: '#000', opacity: 0.5, filter: 'url(#blur6)' }, L);
      G.svg(`
        <g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" filter="url(#ink)">
          <!-- foot -->
          <path d="M846 574 C846 562 872 558 900 558 C928 558 954 562 954 574 Z" fill="url(#dkBrassH)"/>
          <path d="M880 558 C884 550 886 546 886 540 L914 540 C914 546 916 550 920 558 Z" fill="url(#dkBrassH)"/>
          <!-- font (oil reservoir) -->
          <path d="M886 541 C850 538 842 518 848 506 C854 494 874 490 900 490 C926 490 946 494 952 506 C958 518 950 538 914 541 Z" fill="url(#dkBrassH)"/>
          <path d="M852 516 C872 522 928 522 948 516" fill="none" stroke-width="1.4" opacity="0.7"/>
          <!-- burner collar -->
          <path d="M874 491 L874 480 C874 476 926 476 926 480 L926 491 Z" fill="url(#dkBrassH)"/>
          <path d="M877 484 H923" stroke-width="1.2" opacity="0.6"/>
          <!-- wick knob -->
          <path d="M926 484 H940" stroke-width="3"/>
          <ellipse cx="943" cy="484" rx="4" ry="8" fill="url(#dkBrassH)"/>
        </g>
        <path d="M862 500 C858 512 860 526 872 534" fill="none" stroke="#fff1c1" stroke-width="3" stroke-linecap="round" opacity="0.35"/>
      `, L);
      // chimney bulb (glass) — flame lives inside
      R.bulbGlow = G.el('ellipse', { cx: 900, cy: 458, rx: 46, ry: 40, fill: 'url(#dkBulbGlow)', opacity: 0 }, L);
      R.wick = G.el('path', { d: 'M896 478 L897 470 L903 470 L904 478 Z', fill: '#2a1a10', stroke: INK, 'stroke-width': 1 }, L);
      R.flameG = G.el('g', { opacity: 0 }, L);
      R.flameInner = G.el('g', {}, R.flameG);
      G.el('ellipse', { cx: 900, cy: 452, rx: 26, ry: 34, fill: '#ffcf7a', opacity: 0.45, filter: 'url(#blur6)' }, R.flameInner);
      G.el('path', { d: 'M900 424 C906 438 914 452 911 462 C909 470 904 473 900 473 C896 473 891 470 889 462 C886 452 894 438 900 424 Z', fill: 'url(#dkFlame)', filter: 'url(#glow)' }, R.flameInner);
      G.el('path', { d: 'M900 446 C903 454 905 461 903 466 C902 469 898 469 897 466 C895 461 897 454 900 446 Z', fill: '#8fb3d9', opacity: 0.55 }, R.flameInner);
      G.svg(`
        <path d="M878 478 C866 470 862 456 868 444 C872 436 880 432 884 426 L916 426 C920 432 928 436 932 444 C938 456 934 470 922 478 Z"
          fill="url(#dkGlass)" stroke="${INK}" stroke-width="2" stroke-linejoin="round" opacity="0.95"/>
        <path d="M874 462 C872 452 876 444 882 438" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
      `, L);
      // shade
      const shade = G.el('g', {}, L);
      R.shadeBase = G.el('path', { d: 'M852 364 C870 360 930 360 948 364 L1002 446 C960 456 840 456 798 446 Z', fill: 'url(#dkShadeCold)' }, shade);
      R.shadeLit = G.el('path', { d: 'M852 364 C870 360 930 360 948 364 L1002 446 C960 456 840 456 798 446 Z', fill: 'url(#dkShadeLit)', opacity: 0 }, shade);
      // paper/fabric pleats + holes, clipped to shade
      const inner = G.el('g', { 'clip-path': 'url(#dkShadeClip)' }, shade);
      let pleats = '';
      for (let i = 0; i <= 14; i++) {
        const t = i / 14; const xt = 852 + 96 * t, xb = 798 + 204 * t;
        pleats += `M${xt.toFixed(1)} 362 L${xb.toFixed(1)} 452 `;
      }
      G.el('path', { d: pleats, stroke: '#3a2418', 'stroke-width': 0.9, opacity: 0.35, fill: 'none' }, inner);
      // side shading (roundness)
      G.svg(`
        <linearGradient id="dkShadeRound" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="0.3" stop-color="#000" stop-opacity="0"/>
          <stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/>
        </linearGradient>
        <rect x="790" y="355" width="220" height="110" fill="url(#dkShadeRound)"/>`, inner);
      // hand-cut moth holes on the visible face
      R.holes = G.el('g', {}, inner);
      [['atlas', 838, 414, 0.2, -10], ['luna', 884, 392, 0.19, -3], ['hawk', 922, 408, 0.18, 4], ['emperor', 964, 424, 0.17, 12]].forEach(h => {
        G.el('path', { d: SIL[h[0]], transform: `translate(${h[1]} ${h[2]}) rotate(${h[4]}) scale(${h[3]} ${h[3] * 0.9}) translate(-100 -70)` }, R.holes);
      });
      R.holes.setAttribute('fill', '#15100c');
      G.svg(`
        <path d="M852 364 C870 360 930 360 948 364 L1002 446 C960 456 840 456 798 446 Z" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" filter="url(#ink)"/>
        <path d="M852 364 C870 368 930 368 948 364" fill="none" stroke="${INK}" stroke-width="1.6"/>
        <path d="M798 446 C840 456 960 456 1002 446" fill="none" stroke="#b8893a" stroke-width="3"/>
        <path d="M800 449 C842 459 958 459 1000 449" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.7"/>
      `, shade);
      // cold tint overlay (unlit)
      R.cold = G.el('path', {
        d: 'M852 362 L948 362 L1004 448 L940 460 L934 478 L926 491 L952 506 C958 518 950 538 914 541 L920 558 C928 558 954 562 954 576 L846 576 C846 562 872 558 880 558 L886 541 C850 538 842 518 848 506 L874 491 L866 478 L860 460 L796 448 Z',
        fill: '#0e1a22', opacity: 0.42, 'pointer-events': 'none', style: 'mix-blend-mode:multiply',
      }, L);
      // warm rim light on brass when lit
      R.brassLit = G.el('path', { d: 'M852 512 C866 532 934 532 948 512 C942 530 924 538 900 538 C876 538 858 530 852 512 Z', fill: '#ffcf7a', opacity: 0, filter: 'url(#blur2)' }, L);
      // match (animation prop)
      R.match = G.el('g', { opacity: 0, 'pointer-events': 'none' }, g);
      G.svg(`
        <path d="M0 0 L70 -3" stroke="#c9a877" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M0 0 L70 -3" stroke="${INK}" stroke-width="1" opacity="0.5" transform="translate(0 2)"/>
        <ellipse cx="-2" cy="0" rx="6" ry="4.6" fill="#5e2322" stroke="${INK}" stroke-width="1.2"/>`, R.match);
      R.matchFlame = G.el('g', { opacity: 0 }, R.match);
      G.el('ellipse', { cx: -4, cy: -8, rx: 14, ry: 18, fill: '#ffcf7a', opacity: 0.5, filter: 'url(#blur6)' }, R.matchFlame);
      G.el('path', { d: 'M-4 -22 C0 -14 4 -8 2 -2 C0 2 -8 2 -10 -2 C-12 -8 -8 -14 -4 -22 Z', fill: 'url(#dkFlame)' }, R.matchFlame);
      R.sparks = G.el('g', { opacity: 0, fill: '#ffe2a0', 'pointer-events': 'none' }, g);

      // hotspot
      const hot = G.el('path', { d: 'M792 356 H1008 V452 H940 V580 H846 V452 H792 Z', fill: 'transparent' }, g);
      G.hotspot(hot, {
        cursor: 'use',
        click() {
          if (G.get('lampLit')) G.say('The flame burns low and steady. The shade throws her moths up onto the wall.');
          else G.say('The lamp is cold. The wick is dry but it would take a flame.');
        },
        use(item) {
          for (const h of DESK.lampUseHandlers) { try { if (h(item) === true) return true; } catch (e) { console.error(e); } }
          if (window.FINALE && typeof FINALE.useOnLamp === 'function' && FINALE.useOnLamp(item) === true) return true;
          if (item === 'matches') {
            if (G.get('lampLit')) { G.say('The lamp is already burning.'); G.select(null); return true; }
            lightLamp();
            return true;
          }
          return false;
        },
      });
      R.lampRoot = L;
    },
    update() {
      if (lightingNow) return;
      applyLit(G.get('lampLit') ? 1 : 0);
    },
  });

  function applyLit(k) {
    R.flameG.setAttribute('opacity', k);
    R.bulbGlow.setAttribute('opacity', k);
    R.shadeLit.setAttribute('opacity', k * 0.92);
    R.cold.setAttribute('opacity', 0.42 * (1 - k));
    R.brassLit.setAttribute('opacity', 0.35 * k);
    R.holes.setAttribute('fill', k > 0.5 ? '#fff6d8' : '#15100c');
    R.holes.setAttribute('filter', k > 0.5 ? 'url(#glow)' : '');
  }

  async function lightLamp() {
    G.busy(true);
    G.select(null);
    lightingNow = true;
    const m = R.match;
    const place = (x, y, a) => m.setAttribute('transform', `translate(${x} ${y}) rotate(${a})`);
    // bring match in from the right, strike it
    place(1060, 560, -20);
    await G.tween(260, t => { m.setAttribute('opacity', t); place(1060 - 30 * t, 560 - 10 * t, -20); }, 'out');
    G.sfx('match');
    await G.tween(180, t => place(1030 - 40 * t, 550 + 8 * t, -20 + 6 * t), 'in');
    // sparks
    R.sparks.innerHTML = '';
    const sp = [];
    for (let i = 0; i < 9; i++) {
      const c = G.el('circle', { cx: 990, cy: 558, r: 1.6 + Math.random() * 1.6 }, R.sparks);
      sp.push({ c, vx: (Math.random() - 0.3) * 60, vy: -30 - Math.random() * 50 });
    }
    R.sparks.setAttribute('opacity', 1);
    R.matchFlame.setAttribute('opacity', 1);
    G.tween(420, t => {
      sp.forEach(s => { s.c.setAttribute('cx', 990 + s.vx * t); s.c.setAttribute('cy', 558 + s.vy * t + 70 * t * t); });
      R.sparks.setAttribute('opacity', 1 - t);
    }, 'out');
    await G.tween(260, t => R.matchFlame.setAttribute('transform', `scale(${0.3 + 0.9 * t})`), 'outBack');
    await G.wait(250);
    // carry flame to wick
    await G.tween(620, t => place(990 - 80 * t, 558 - 88 * t, -14 + 34 * t), 'inOut');
    await G.wait(180);
    G.sfx('lampWhoosh');
    G.take('matches');
    // bloom
    R.projHot.setAttribute('pointer-events', 'all');
    await G.tween(700, t => {
      applyLit(t);
      R.flameInner.setAttribute('transform', `translate(900 473) scale(${0.2 + 0.8 * t}) translate(-900 -473)`);
      R.halo.setAttribute('opacity', t);
      m.setAttribute('opacity', 1 - t);
      place(910 + 70 * t, 470 + 50 * t, 20 + 30 * t);
    }, 'out');
    R.flameInner.removeAttribute('transform');
    // projection fades in, moths appear one by one
    R.proj.setAttribute('opacity', 1);
    R.moths.forEach(mm => mm.inner.setAttribute('opacity', 0));
    const wash = [R.proj.children[0], R.proj.children[1]];
    wash.forEach(w => w.setAttribute('opacity', 0));
    await G.tween(2200, t => {
      wash[0].setAttribute('opacity', Math.min(1, t * 1.6));
      wash[1].setAttribute('opacity', 0.18 * Math.min(1, t * 1.6));
      R.moths.forEach((mm, i) => {
        const u = Math.max(0, Math.min(1, (t - 0.12 - i * 0.14) / 0.42));
        const e = G.ease.inOut(u);
        mm.inner.setAttribute('opacity', e);
        mm.inner.setAttribute('transform', `scale(${1.12 - 0.12 * e})`);
      });
    }, 'linear');
    R.moths.forEach(mm => { mm.inner.removeAttribute('transform'); mm.inner.setAttribute('opacity', 1); });
    lightingNow = false;
    projShown = true;
    G.set('lampLit');
    G.busy(false);
    G.say('The wick takes. Warm light spills across the desk — and four moths bloom upon the wall.', { dur: 4200 });
  }

  // flicker loop
  function flick(t) {
    return 0.5 * Math.sin(t * 7.3) + 0.3 * Math.sin(t * 13.1 + 1.3) + 0.2 * Math.sin(t * 23.7 + 2.1);
  }
  function loop(now) {
    requestAnimationFrame(loop);
    if (!R.flameInner || !G.get('lampLit') || lightingNow) return;
    const v = G.view();
    if (v !== 'south') return;
    const t = now / 1000;
    const f = flick(t), f2 = flick(t * 0.7 + 5);
    R.flameInner.setAttribute('transform',
      `translate(900 473) skewX(${(f2 * 3).toFixed(2)}) scale(${(1 - 0.035 * f).toFixed(3)} ${(1 + 0.07 * f).toFixed(3)}) translate(-900 -473)`);
    R.bulbGlow.setAttribute('opacity', (0.85 + 0.12 * f).toFixed(3));
    R.shadeLit.setAttribute('opacity', (0.88 + 0.06 * f).toFixed(3));
    R.halo.setAttribute('opacity', (0.9 + 0.08 * f).toFixed(3));
    if (projShown) {
      R.proj.setAttribute('opacity', (0.93 + 0.06 * f).toFixed(3));
      const dx = (-f2 * 1.4).toFixed(2), dy = (-f * 1.2).toFixed(2), sc = (1 + 0.006 * f).toFixed(4);
      R.proj.setAttribute('transform', `translate(${dx} ${dy}) translate(900 372) scale(${sc}) translate(-900 -372)`);
    }
  }
  requestAnimationFrame(loop);

  // ================================================================== JOURNAL CLOSE-UP
  const LP = { x0: 205, x1: 795 }, RP = { x0: 805, x1: 1395 };
  const PAGE_TOP = 100, PAGE_BOT = 782;
  const LEFT_PAGE_D = 'M796 104 C700 96 420 92 206 106 L202 784 C420 774 700 778 796 788 Z';
  const RIGHT_PAGE_D = 'M804 104 C900 96 1180 92 1394 106 L1398 784 C1180 774 900 778 804 788 Z';

  function wrap(text, n) {
    const words = text.split(/\s+/); const lines = []; let cur = '';
    words.forEach(w => { if ((cur + ' ' + w).trim().length > n) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) lines.push(cur);
    return lines;
  }
  function handText(g, x, y, text, opts) {
    opts = opts || {};
    const size = opts.size || 22, lh = opts.lh || size * 2.05, n = opts.chars || 34;
    const lines = opts.lines || wrap(text, n);
    const t = G.el('text', {
      x, y, 'font-family': HAND, 'font-size': size, fill: opts.fill || '#2b1d13', opacity: opts.opacity == null ? 0.9 : opts.opacity,
      'data-maxw': opts.maxw || 480,
    }, g);
    lines.forEach((ln, i) => {
      const ts = G.el('tspan', { x, dy: i ? lh : 0, 'data-fit': 1 }, t);
      ts.textContent = ln;
    });
    return t;
  }
  function fitText(root) {
    root.querySelectorAll('text[data-maxw]').forEach(t => {
      const maxw = +t.getAttribute('data-maxw');
      t.querySelectorAll('tspan[data-fit]').forEach(ts => {
        ts.removeAttribute('textLength'); ts.removeAttribute('lengthAdjust');
        let w = 0; try { w = ts.getComputedTextLength(); } catch (e) { }
        if (w > maxw) { ts.setAttribute('textLength', maxw); ts.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      });
    });
  }
  const sk = (d, extra) => `<path d="${d}" fill="none" stroke="#3a2a1e" stroke-width="${(extra && extra.w) || 1.7}" stroke-linecap="round" stroke-linejoin="round" opacity="${(extra && extra.o) || 0.85}"/>`;

  function pageBase(g, side) {
    const d = side === 'L' ? LEFT_PAGE_D : RIGHT_PAGE_D;
    G.el('path', { d, fill: '#e8dcc0', filter: 'url(#paper)' }, g);
    G.el('path', { d, fill: side === 'L' ? 'url(#dkGutterL)' : 'url(#dkGutterR)' }, g);
    G.el('path', { d, fill: 'url(#dkFox)', opacity: 0.8 }, g);
  }
  function pageNum(g, side, n) {
    const t = G.el('text', {
      x: side === 'L' ? 250 : 1350, y: 752, 'font-family': FELL, 'font-size': 18, fill: '#5a4430', opacity: 0.7,
      'text-anchor': 'middle',
    }, g);
    t.textContent = '— ' + n + ' —';
  }

  // --- sketches -----------------------------------------------------------
  function mothSketch(k, x, y, s, rot) {
    return `<g transform="translate(${x} ${y}) rotate(${rot || 0}) scale(${s})"><path d="${SIL[k]}" transform="translate(-100 -70)" fill="#8a6a44" fill-opacity="0.12" stroke="#3a2a1e" stroke-width="${1.6 / s}" stroke-linejoin="round" opacity="0.8"/></g>`;
  }
  function clockSketch(cx, cy, r) {
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const x1 = cx + Math.sin(a) * (r - 8), y1 = cy - Math.cos(a) * (r - 8);
      const x2 = cx + Math.sin(a) * (r - 18), y2 = cy - Math.cos(a) * (r - 18);
      ticks += `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} `;
    }
    // little unfinished icon circles at each hour
    let dots = '';
    for (let i = 0; i < 12; i++) {
      if (i === 0 || i === 6) continue;
      const a = i * Math.PI / 6;
      const x = cx + Math.sin(a) * (r - 36), y = cy - Math.cos(a) * (r - 36);
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="none" stroke="#3a2a1e" stroke-width="1.1" stroke-dasharray="3 3" opacity="0.6"/>`;
    }
    // sun at 12, full moon at 6
    const sy = cy - (r - 36), my = cy + (r - 36);
    let sun = `<circle cx="${cx}" cy="${sy}" r="7" fill="none" stroke="#3a2a1e" stroke-width="1.5"/>`;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; sun += `<path d="M${(cx + Math.cos(a) * 10).toFixed(1)} ${(sy + Math.sin(a) * 10).toFixed(1)} L${(cx + Math.cos(a) * 14).toFixed(1)} ${(sy + Math.sin(a) * 14).toFixed(1)}" stroke="#3a2a1e" stroke-width="1.3"/>`; }
    return `
      <g filter="url(#ink)">
        <circle cx="${cx}" cy="${cy}" r="${r + 10}" fill="#8a6a44" fill-opacity="0.08" stroke="#3a2a1e" stroke-width="2"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#3a2a1e" stroke-width="1.3"/>
        <path d="${ticks}" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/>
        ${dots}${sun}
        <circle cx="${cx}" cy="${my}" r="8" fill="#3a2a1e" fill-opacity="0.18" stroke="#3a2a1e" stroke-width="1.5"/>
        <circle cx="${cx}" cy="${cy}" r="4" fill="#3a2a1e"/>
        <path d="M${cx - r - 10} ${cy + r + 30} C${cx - r} ${cy + r + 70} ${cx + r} ${cy + r + 70} ${cx + r + 10} ${cy + r + 30}" fill="none" stroke="#3a2a1e" stroke-width="1.2" stroke-dasharray="4 5" opacity="0.5"/>
      </g>`;
  }
  function crescentDoodle(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#ink)"><path d="M6 -16 C-6 -14 -14 -4 -12 6 C-10 16 2 20 12 14 C2 14 -4 6 -3 -2 C-2 -10 2 -14 6 -16 Z" fill="#3a2a1e" fill-opacity="0.25" stroke="#3a2a1e" stroke-width="1.5" stroke-linejoin="round"/></g>`;
  }
  function candleDoodle(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#ink)" stroke="#3a2a1e" stroke-width="1.5" stroke-linejoin="round" fill="none">
      <path d="M-7 -6 L-7 22 L7 22 L7 -6 Z" fill="#3a2a1e" fill-opacity="0.12"/><path d="M-12 22 H12"/><path d="M0 -6 V-10"/>
      <path d="M0 -26 C4 -20 5 -15 2 -12 C0 -10 -3 -11 -3 -14 C-3 -18 -1 -21 0 -26 Z" fill="#3a2a1e" fill-opacity="0.2"/></g>`;
  }
  function eyeSketch(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#ink)">
      <ellipse rx="30" ry="26" fill="#8a6a44" fill-opacity="0.12" stroke="#3a2a1e" stroke-width="1.5"/>
      <ellipse rx="21" ry="18" fill="none" stroke="#3a2a1e" stroke-width="1.3"/>
      <ellipse rx="12" ry="10" fill="#3a2a1e" fill-opacity="0.35" stroke="#3a2a1e" stroke-width="1.3"/>
      <circle cx="-3" cy="-3" r="3" fill="#e8dcc0"/></g>`;
  }
  function shadeSketch(cx, cy) {
    // lampshade with hand-cut holes and rays (no moth shapes, no order)
    let rays = '';
    for (let i = -4; i <= 4; i++) {
      const a = (i * 13 - 90) * Math.PI / 180;
      rays += `M${(cx + Math.cos(a) * 70).toFixed(1)} ${(cy - 20 + Math.sin(a) * 40).toFixed(1)} L${(cx + Math.cos(a) * 190).toFixed(1)} ${(cy - 20 + Math.sin(a) * 150).toFixed(1)} `;
    }
    return `<g filter="url(#ink)">
      <path d="${rays}" stroke="#3a2a1e" stroke-width="1" stroke-dasharray="2 6" opacity="0.55"/>
      <path d="M${cx - 40} ${cy - 50} L${cx + 40} ${cy - 50} L${cx + 85} ${cy + 30} C${cx + 40} ${cy + 42} ${cx - 40} ${cy + 42} ${cx - 85} ${cy + 30} Z" fill="#8a6a44" fill-opacity="0.14" stroke="#3a2a1e" stroke-width="1.8" stroke-linejoin="round"/>
      ${[[-48, 4], [-14, -14], [18, -2], [52, 14]].map(p => `<path d="M${cx + p[0]} ${cy + p[1]} c-6 -8 -14 -6 -12 2 c2 6 8 6 12 2 c4 4 10 4 12 -2 c2 -8 -6 -10 -12 -2 Z" fill="#3a2a1e" fill-opacity="0.6" stroke="#3a2a1e" stroke-width="1"/>`).join('')}
      <path d="M${cx - 16} ${cy + 38} L${cx - 20} ${cy + 64} C${cx - 40} ${cy + 70} ${cx - 40} ${cy + 104} ${cx} ${cy + 106} C${cx + 40} ${cy + 104} ${cx + 40} ${cy + 70} ${cx + 20} ${cy + 64} L${cx + 16} ${cy + 38}" fill="none" stroke="#3a2a1e" stroke-width="1.6"/>
      <path d="M${cx - 34} ${cy + 118} H${cx + 34}" stroke="#3a2a1e" stroke-width="1.8"/>
      <path d="M${cx - 24} ${cy + 106} L${cx - 30} ${cy + 118} M${cx + 24} ${cy + 106} L${cx + 30} ${cy + 118}" stroke="#3a2a1e" stroke-width="1.6"/>
    </g>`;
  }
  function windowSketch(cx, cy, r) {
    return `<g filter="url(#ink)">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#8a6a44" fill-opacity="0.1" stroke="#3a2a1e" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="${r - 12}" fill="none" stroke="#3a2a1e" stroke-width="1.2"/>
      <path d="M${cx - r + 12} ${cy} H${cx + r - 12} M${cx} ${cy - r + 12} V${cy + r - 12}" stroke="#3a2a1e" stroke-width="1.5"/>
      <circle cx="${cx + 30}" cy="${cy - 34}" r="14" fill="none" stroke="#3a2a1e" stroke-width="1.2" opacity="0.7"/>
    </g>
    ${mothSketch('luna', cx - r - 20, cy - 40, 0.32, -20)}
    ${mothSketch('emperor', cx + r + 10, cy - 70, 0.26, 18)}
    ${mothSketch('atlas', cx + r + 30, cy + 40, 0.24, 30)}
    ${mothSketch('hawk', cx - r - 10, cy + 60, 0.26, -35)}
    ${mothSketch('luna', cx + 6, cy + r + 36, 0.22, 8)}`;
  }

  // --- page builders --------------------------------------------------------
  // each returns refs (may be {}) — builders are reused for the turning leaf
  const PAGES = [
    // spread 1
    [g => {
      pageBase(g, 'L');
      handText(g, 262, 176, '', { lines: ['14th October.'], size: 26, maxw: 470 });
      G.el('path', { d: 'M262 196 C330 190 420 194 470 190', stroke: '#3a2a1e', 'stroke-width': 1.3, fill: 'none', opacity: 0.6 }, g);
      handText(g, 262, 262, 'They took Father to the asylum today. I keep his clocks wound for him — all but the tall one. That one I stopped at the very minute she first came to my window: the short hand upon the crescent moon, the long hand upon the candle.', { chars: 33, maxw: 480 });
      G.svg(mothSketch('luna', 660, 700, 0.28, -14), g);
      pageNum(g, 'L', 1);
    }, g => {
      pageBase(g, 'R');
      G.svg(clockSketch(1100, 340, 150), g);
      G.svg(crescentDoodle(900, 600, 1.4) + candleDoodle(1300, 596, 1.3), g);
      handText(g, 880, 580, '', { lines: ['Father’s tall clock.', 'Pictures, not numbers —', '“hours one can hold.”'], size: 18, lh: 38, maxw: 440, opacity: 0.8 });
      pageNum(g, 'R', 2);
    }],
    // spread 2
    [g => {
      pageBase(g, 'L');
      handText(g, 262, 180, 'Father cut my lampshade by hand, so the lamp throws my four dearest onto the wall. When I count them, I count their eyes — every eye, on every wing.', { chars: 33, maxw: 480 });
      G.svg(eyeSketch(360, 580, 1.3), g);
      handText(g, 420, 588, '', { lines: ['an eye — ring', 'within ring'], size: 16, lh: 34, maxw: 260, opacity: 0.75 });
      pageNum(g, 'L', 3);
    }, g => {
      pageBase(g, 'R');
      G.svg(shadeSketch(1100, 360), g);
      handText(g, 900, 640, '', { lines: ['Lit, it is a summer night', 'on the attic wall.'], size: 18, lh: 38, maxw: 440, opacity: 0.8 });
      pageNum(g, 'R', 4);
    }],
    // spread 3
    [g => {
      pageBase(g, 'L');
      G.svg(mothSketch('luna', 500, 300, 1.35, -6), g);
      G.svg(`<path d="M430 424 C470 470 520 480 560 470" fill="none" stroke="#3a2a1e" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>`, g);
      handText(g, 262, 540, 'Actias luna, the moon moth. She does not eat; she lives but a week, and spends it looking for the light.', { chars: 33, maxw: 480, size: 20 });
      pageNum(g, 'L', 5);
    }, g => {
      pageBase(g, 'R');
      const refs = {};
      // faint sheen (the blank page seems to hold something)
      refs.sheen = G.el('path', { d: RIGHT_PAGE_D, fill: 'url(#dkPageSheen)', opacity: 0.6, 'pointer-events': 'none' }, g);
      // moonlight bath
      refs.moon = G.el('g', { opacity: 0, 'pointer-events': 'none' }, g);
      G.el('path', { d: RIGHT_PAGE_D, fill: '#5d7596', style: 'mix-blend-mode:multiply' }, refs.moon);
      G.el('path', { d: 'M1000 90 L1300 90 L1180 790 L820 790 Z', fill: '#cfe3ff', opacity: 0.22, filter: 'url(#blur20)', style: 'mix-blend-mode:screen' }, refs.moon);
      // silver ink
      refs.ink = G.el('g', { 'pointer-events': 'none' }, g);
      const MY = 360, RR = 50, XS = [912, 1040, 1168, 1296];
      refs.outlines = []; refs.fills = [];
      XS.forEach((x, i) => {
        const mg = G.el('g', {}, refs.ink);
        const fillG = G.el('g', {}, mg);
        G.el('circle', { cx: x, cy: MY, r: RR, fill: '#1e2735' }, fillG);
        let lit = null;
        if (i === 1) lit = `M${x} ${MY - RR} A${RR} ${RR} 0 0 1 ${x} ${MY + RR} Z`;
        if (i === 2) lit = `M${x} ${MY - RR} A${RR} ${RR} 0 0 1 ${x} ${MY + RR} A${RR} ${RR} 0 0 1 ${x} ${MY - RR} Z`;
        if (i === 3) lit = `M${x} ${MY - RR} A${RR} ${RR} 0 0 0 ${x} ${MY + RR} Z`;
        if (lit) G.el('path', { d: lit, fill: 'url(#dkSilver)', filter: 'url(#moonglow)' }, fillG);
        const ol = G.el('circle', { cx: x, cy: MY, r: RR, fill: 'none', stroke: '#eef4ff', 'stroke-width': 2.6, filter: 'url(#moonglow)' }, mg);
        refs.fills.push(fillG); refs.outlines.push(ol);
      });
      // silver guide flourish + words
      refs.flour = G.el('path', { d: 'M880 450 C980 436 1100 462 1200 444 C1250 436 1300 446 1330 440', fill: 'none', stroke: '#e6eefc', 'stroke-width': 1.6, opacity: 0.8, filter: 'url(#moonglow)' }, refs.ink);
      refs.words = handText(refs.ink, 1104, 540, '', { lines: ['for the box'], size: 34, fill: '#f2f7ff', opacity: 1, maxw: 420 });
      refs.words.setAttribute('text-anchor', 'middle');
      refs.words.querySelector('tspan').setAttribute('x', 1104);
      refs.words.setAttribute('filter', 'url(#moonglow)');
      refs.wordsClipRect = G.el('rect', { x: 860, y: 480, width: 500, height: 100 }, G.el('clipPath', { id: 'dkWordsClip' + (++clipN) }, g));
      refs.words.setAttribute('clip-path', `url(#dkWordsClip${clipN})`);
      // tiny line at the bottom
      handText(g, 1100, 716, '', { lines: ['Some words I write only for the moon.'], size: 13, opacity: 0.62, maxw: 380 }).setAttribute('text-anchor', 'middle');
      pageNum(g, 'R', 6);
      return refs;
    }],
    // spread 4
    [g => {
      pageBase(g, 'L');
      handText(g, 262, 200, 'They are calling me now, every night, at the glass. I think I am ready to go.', { chars: 30, maxw: 480, size: 23 });
      handText(g, 560, 470, '', { lines: ['— E.'], size: 26 });
      pageNum(g, 'L', 7);
    }, g => {
      pageBase(g, 'R');
      G.svg(windowSketch(1100, 380, 130), g);
      pageNum(g, 'R', 8);
    }],
  ];
  let clipN = 0;

  function applyMoon(refs, moonlit, inkVisible) {
    if (!refs || !refs.moon) return;
    refs.moon.setAttribute('opacity', moonlit ? 1 : 0);
    refs.sheen.setAttribute('opacity', moonlit ? 0 : 0.6);
    refs.ink.setAttribute('opacity', moonlit && inkVisible ? 1 : 0);
    if (moonlit && inkVisible) {
      refs.outlines.forEach(o => { o.removeAttribute('stroke-dasharray'); o.removeAttribute('stroke-dashoffset'); });
      refs.fills.forEach(f => f.setAttribute('opacity', 1));
      refs.flour.setAttribute('opacity', 0.8);
      refs.wordsClipRect.setAttribute('width', 500);
    }
  }

  const J = { spread: 0, turning: false };
  G.registerView('journal', {
    parent: 'south',
    build(g) {
      G.svg(`
        <defs>
          <radialGradient id="dkTable" cx="50%" cy="45%" r="75%">
            <stop offset="0" stop-color="#4a2e1c"/><stop offset="0.7" stop-color="#2a1a10"/><stop offset="1" stop-color="#0e0a07"/>
          </radialGradient>
          <linearGradient id="dkLeather" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#6e2a26"/><stop offset="0.5" stop-color="#4e1c1a"/><stop offset="1" stop-color="#2c0f0e"/>
          </linearGradient>
          <linearGradient id="dkGutterL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#6b5434" stop-opacity="0.25"/><stop offset="0.06" stop-color="#6b5434" stop-opacity="0"/>
            <stop offset="0.82" stop-color="#6b5434" stop-opacity="0"/><stop offset="0.96" stop-color="#4a3620" stop-opacity="0.35"/><stop offset="1" stop-color="#2a1a0e" stop-opacity="0.6"/>
          </linearGradient>
          <linearGradient id="dkGutterR" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stop-color="#6b5434" stop-opacity="0.25"/><stop offset="0.06" stop-color="#6b5434" stop-opacity="0"/>
            <stop offset="0.82" stop-color="#6b5434" stop-opacity="0"/><stop offset="0.96" stop-color="#4a3620" stop-opacity="0.35"/><stop offset="1" stop-color="#2a1a0e" stop-opacity="0.6"/>
          </linearGradient>
          <radialGradient id="dkFox" cx="50%" cy="50%" r="72%">
            <stop offset="0.6" stop-color="#8a6a3a" stop-opacity="0"/><stop offset="1" stop-color="#7a5a2a" stop-opacity="0.35"/>
          </radialGradient>
          <linearGradient id="dkPageSheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.3" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.48" stop-color="#f4f0ff" stop-opacity="0.16"/>
            <stop offset="0.52" stop-color="#f4f0ff" stop-opacity="0.16"/><stop offset="0.7" stop-color="#ffffff" stop-opacity="0"/>
            <animate attributeName="x1" values="-1;1" dur="6s" repeatCount="indefinite"/>
            <animate attributeName="x2" values="0;2" dur="6s" repeatCount="indefinite"/>
          </linearGradient>
          <radialGradient id="dkSilver" cx="45%" cy="40%" r="70%">
            <stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#e2eaf6"/><stop offset="1" stop-color="#a9bbd4"/>
          </radialGradient>
          <linearGradient id="dkLeafShade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="0.3" stop-color="#000" stop-opacity="0.05"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
          </linearGradient>
          <radialGradient id="dkWarm" cx="85%" cy="5%" r="90%">
            <stop offset="0" stop-color="#ffcf7a" stop-opacity="0.35"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="dkVig" cx="50%" cy="50%" r="72%">
            <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/>
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#dkTable)"/>
        <g opacity="0.18" stroke="#1c0f08" stroke-width="2" fill="none">
          <path d="M0 140 C400 120 900 170 1600 130"/><path d="M0 330 C500 350 1000 300 1600 340"/><path d="M0 610 C300 590 1100 640 1600 600"/><path d="M0 820 C600 800 1000 850 1600 810"/>
        </g>
        <!-- book shadow -->
        <rect x="170" y="88" width="1270" height="740" rx="30" fill="#000" opacity="0.6" filter="url(#blur20)"/>
        <!-- leather cover -->
        <path d="M168 76 C400 66 700 70 800 82 C900 70 1200 66 1432 76 C1440 78 1446 84 1446 92 L1446 800 C1446 810 1440 816 1432 816 C1200 808 900 812 800 822 C700 812 400 808 168 816 C160 816 154 810 154 800 L154 92 C154 84 160 78 168 76 Z"
          fill="url(#dkLeather)" stroke="${INK}" stroke-width="3" filter="url(#ink)"/>
        <path d="M172 88 C400 80 700 84 800 94 C900 84 1200 80 1428 88 L1432 804 C1200 796 900 800 800 810 C700 800 400 796 168 804 Z" fill="none" stroke="#b8893a" stroke-width="1.2" opacity="0.35" stroke-dasharray="1 5"/>
        <!-- page stacks -->
        <path d="M198 110 L194 792 C420 784 700 788 796 798 L796 790 C700 780 420 776 200 786 Z" fill="#c7b58e" stroke="${INK}" stroke-width="1.2"/>
        <path d="M1402 110 L1406 792 C1180 784 900 788 804 798 L804 790 C900 780 1180 776 1400 786 Z" fill="#c7b58e" stroke="${INK}" stroke-width="1.2"/>
        <path d="M200 790 C420 781 700 785 796 794 M1400 790 C1180 781 900 785 804 794" stroke="#8a7650" stroke-width="0.8" fill="none"/>
      `, g);
      J.pagesRoot = G.el('g', {}, g);
      J.static = PAGES.map((pair, i) => {
        const L = G.el('g', { style: 'display:none' }, J.pagesRoot);
        const Rg = G.el('g', { style: 'display:none' }, J.pagesRoot);
        const lr = pair[0](L) || {}; const rr = pair[1](Rg) || {};
        return { L, R: Rg, lr, rr };
      });
      // spine
      G.svg(`<path d="M796 104 C799 300 799 600 796 790 L804 790 C801 600 801 300 804 104 Z" fill="#2a1a0e" opacity="0.55"/>
             <path d="M800 100 V792" stroke="${INK}" stroke-width="1.4" opacity="0.6"/>`, g);
      // ribbon bookmark
      G.svg(`<path d="M794 96 C792 300 806 560 800 820 L808 846 L814 822 L822 840 C818 560 808 300 806 96 Z" fill="#2f5f5a" stroke="${INK}" stroke-width="1.6" opacity="0.92"/>`, g);
      // light overlays
      J.warm = G.el('rect', { width: 1600, height: 900, fill: 'url(#dkWarm)', 'pointer-events': 'none', style: 'mix-blend-mode:screen' }, g);
      J.cold = G.el('rect', { width: 1600, height: 900, fill: '#16262b', opacity: 0.18, 'pointer-events': 'none', style: 'mix-blend-mode:multiply' }, g);
      G.el('rect', { width: 1600, height: 900, fill: 'url(#dkVig)', 'pointer-events': 'none' }, g);
      // turning leaf
      J.leaf = G.el('g', { style: 'display:none', 'pointer-events': 'none' }, g);
      J.leafShadow = G.el('rect', { x: 805, y: 100, width: 595, height: 690, fill: 'url(#dkLeafShade)', 'pointer-events': 'none', opacity: 0 }, g);
      // page-turn controls: page curls in the corners
      J.nextCurl = G.svg(`
        <path d="M1398 784 L1398 724 C1376 740 1352 764 1338 786 Z" fill="#d8c8a4" stroke="${INK}" stroke-width="1.4"/>
        <path d="M1398 724 C1380 748 1362 770 1338 786 L1398 784 Z" fill="#000" opacity="0.1"/>
        <path d="M1356 752 l18 -4 l-10 16" fill="none" stroke="#5a4430" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>`, g);
      J.prevCurl = G.svg(`
        <path d="M202 784 L202 724 C224 740 248 764 262 786 Z" fill="#d8c8a4" stroke="${INK}" stroke-width="1.4"/>
        <path d="M202 724 C220 748 238 770 262 786 L202 784 Z" fill="#000" opacity="0.1"/>
        <path d="M244 752 l-18 -4 l10 16" fill="none" stroke="#5a4430" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>`, g);
      J.nextCurl.setAttribute('pointer-events', 'none'); J.prevCurl.setAttribute('pointer-events', 'none');
      J.hotNext = G.el('path', { d: RIGHT_PAGE_D, fill: 'transparent' }, g);
      J.hotPrev = G.el('path', { d: LEFT_PAGE_D, fill: 'transparent' }, g);
      G.hotspot(J.hotNext, { cursor: 'go', click() { turn(1); } });
      G.hotspot(J.hotPrev, { cursor: 'go', click() { turn(-1); } });
      showSpread(0);
    },
    update() {
      const lit = !!G.get('lampLit');
      J.warm.setAttribute('opacity', lit ? 1 : 0);
      J.cold.setAttribute('opacity', lit ? 0.12 : 0.34);
      if (!J.revealing) {
        const rr = J.static[2].rr;
        applyMoon(rr, !!G.get('windowOpen'), !!G.get('inkSeen'));
      }
      J.nextCurl.style.display = J.spread < PAGES.length - 1 ? '' : 'none';
      J.prevCurl.style.display = J.spread > 0 ? '' : 'none';
      J.hotNext.style.cursor = J.spread < PAGES.length - 1 ? '' : 'default';
      J.hotPrev.style.cursor = J.spread > 0 ? '' : 'default';
    },
    enter() {
      if (!G.get('journalRead')) G.set('journalRead');
      const doFit = () => fitText(J.pagesRoot);
      doFit();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(doFit);
      maybeReveal();
    },
  });

  function showSpread(i) {
    J.spread = i;
    J.static.forEach((s, k) => { s.L.style.display = k === i ? '' : 'none'; s.R.style.display = k === i ? '' : 'none'; });
    if (G.view && G.view() === 'journal') fitText(J.pagesRoot);
    const v = G.views && G.views.journal; if (v && v.update && J.nextCurl) v.update();
  }

  function leafContent(spread, side) {
    J.leaf.innerHTML = '';
    const refs = PAGES[spread][side === 'L' ? 0 : 1](J.leaf) || {};
    applyMoon(refs, !!G.get('windowOpen'), !!G.get('inkSeen'));
    fitText(J.leaf);
    G.el('path', { d: side === 'L' ? LEFT_PAGE_D : RIGHT_PAGE_D, fill: '#000', opacity: 0, class: 'leafdark' }, J.leaf);
  }

  async function turn(dir) {
    const to = J.spread + dir;
    if (J.turning || to < 0 || to >= PAGES.length) return;
    J.turning = true;
    G.sfx('pageTurn');
    const from = J.spread, S = J.static;
    // underneath: the page that stays + the page being revealed
    S.forEach(s => { s.L.style.display = 'none'; s.R.style.display = 'none'; });
    if (dir > 0) { S[from].L.style.display = ''; S[to].R.style.display = ''; }
    else { S[to].L.style.display = ''; S[from].R.style.display = ''; }
    fitText(J.pagesRoot);
    J.leaf.style.display = '';
    const firstSide = dir > 0 ? 'R' : 'L', secondSide = dir > 0 ? 'L' : 'R';
    leafContent(from, firstSide);
    const setT = (sx, lift) => J.leaf.setAttribute('transform', `translate(800 0) skewY(${lift.toFixed(2)}) scale(${sx.toFixed(4)} 1) translate(-800 0)`);
    const dark = () => J.leaf.querySelector('.leafdark');
    J.leafShadow.setAttribute('x', dir > 0 ? 805 : 205);
    J.leafShadow.setAttribute('transform', dir > 0 ? '' : 'translate(1000 0) scale(-1 1) translate(-1000 0)');
    await G.tween(360, t => {
      setT(1 - t, (dir > 0 ? -1 : 1) * 4 * Math.sin(t * Math.PI / 2));
      dark().setAttribute('opacity', 0.35 * t);
      J.leafShadow.setAttribute('opacity', 1 - t);
    }, 'in');
    leafContent(to, secondSide);
    J.leafShadow.setAttribute('x', dir > 0 ? 205 : 805);
    await G.tween(380, t => {
      setT(t, (dir > 0 ? 1 : -1) * 4 * Math.cos(t * Math.PI / 2));
      dark().setAttribute('opacity', 0.35 * (1 - t));
    }, 'out');
    J.leaf.style.display = 'none';
    J.leaf.innerHTML = '';
    J.leafShadow.setAttribute('opacity', 0);
    showSpread(to);
    J.turning = false;
    maybeReveal();
  }

  async function maybeReveal() {
    if (J.spread !== 2 || !G.get('windowOpen') || G.get('inkSeen') || J.revealing) return;
    J.revealing = true;
    const rr = J.static[2].rr;
    rr.moon.setAttribute('opacity', 1); rr.sheen.setAttribute('opacity', 0);
    rr.ink.setAttribute('opacity', 1);
    const C = 2 * Math.PI * 50;
    rr.outlines.forEach(o => { o.setAttribute('stroke-dasharray', C); o.setAttribute('stroke-dashoffset', C); });
    rr.fills.forEach(f => f.setAttribute('opacity', 0));
    rr.flour.setAttribute('opacity', 0);
    rr.wordsClipRect.setAttribute('width', 0);
    G.busy(true);
    await G.wait(450);
    G.sfx('magic');
    await G.tween(1500, t => {
      rr.outlines.forEach((o, i) => {
        const u = Math.max(0, Math.min(1, (t - i * 0.14) / 0.58));
        o.setAttribute('stroke-dashoffset', C * (1 - G.ease.inOut(u)));
      });
    }, 'linear');
    await G.tween(900, t => {
      rr.fills.forEach((f, i) => f.setAttribute('opacity', Math.max(0, Math.min(1, t * 1.6 - i * 0.2))));
      rr.flour.setAttribute('opacity', 0.8 * t);
    }, 'inOut');
    await G.tween(1100, t => rr.wordsClipRect.setAttribute('width', 500 * t), 'inOut');
    J.revealing = false;
    G.busy(false);
    G.set('inkSeen');
    G.say('Silver ink, woken by the moonlight: four moons, in a row.', { dur: 4000 });
  }

  // ================================================================== hints & debug steps
  G.registerHint({ id: 'journal', order: 5, when: () => !G.get('journalRead'), lines: ['There is a journal lying on the desk.', 'Edith\'s journal is on the desk, by the lamp. Read it.', 'Turn around to the desk and click the journal.'] });
  G.registerHint({ id: 'lamp', order: 20, when: () => G.get('gotMatches') && !G.get('lampLit'), lines: ['It is so dark in here. Something on the desk could give light.', 'The oil lamp on the desk has a dry wick — and you have matches.', 'Select the matches in your inventory, then click the lamp.'] });
  G.registerHint({ id: 'ink', order: 50, when: () => G.get('windowOpen') && !G.get('inkSeen'), lines: ['The moonlight is falling across the desk now.', 'One of the journal\'s pages was blank. "Some words I write only for the moon."', 'Open the journal to its third spread — the moonlight reveals four moons.'] });
  G.registerStep(5, 'journal', () => G.set('journalRead'));
  G.registerStep(20, 'lamp', () => { G.take('matches'); G.set('lampLit'); });
  G.registerStep(50, 'ink', () => { G.set('journalRead'); G.set('inkSeen'); });
})();
