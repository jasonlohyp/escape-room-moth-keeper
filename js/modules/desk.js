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
  function scallop(pts, c, depth) { // Q-bumps between successive points, pushed away from centre c
    const out = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const vx = mx - c[0], vy = my - c[1], L = Math.hypot(vx, vy) || 1;
      out.push(['Q', mx + vx / L * depth, my + vy / L * depth, b[0], b[1]]);
    }
    return out;
  }
  const HALF = {
    atlas: { // broad; forewing apex is a big "snake-head" lobe curling DOWN
      wings: [
        [103, 48, ['C', 122, 34, 148, 24, 166, 20], ['C', 176, 15, 186, 5, 194, 3], ['C', 202, 2, 203, 16, 197, 22],
          ['C', 191, 28, 182, 27, 176, 30], ['C', 175, 44, 172, 58, 166, 70], ['C', 150, 76, 126, 74, 104, 66]],
        [104, 67, ['C', 132, 70, 164, 72, 177, 84], ['C', 184, 98, 176, 114, 162, 122], ['C', 148, 130, 130, 129, 120, 120],
          ['C', 111, 111, 105, 97, 103, 82]],
        [101, 44, ['C', 106, 34, 112, 26, 121, 19], ['C', 119, 28, 111, 38, 102, 46]],
      ],
      body: 'M100 40 C106 40 108 56 107 72 C106 90 104 100 100 104 C96 100 94 90 93 72 C92 56 94 40 100 40 Z',
    },
    luna: { // long parallel trailing tails with club tips
      wings: [
        [103, 40, ['C', 112, 28, 138, 16, 162, 12], ['C', 171, 11, 175, 16, 172, 24], ['C', 166, 38, 154, 52, 138, 58],
          ['C', 126, 62, 112, 60, 104, 54]],
        [104, 56, ['C', 122, 56, 146, 60, 150, 72], ['C', 153, 84, 145, 92, 137, 97], ['C', 135, 107, 137, 117, 140, 125],
          ['C', 147, 129, 147, 139, 139, 140], ['C', 131, 141, 127, 134, 130, 126], ['C', 129, 117, 126, 106, 120, 98],
          ['C', 111, 90, 104, 80, 102, 66]],
        [101, 34, ['C', 106, 24, 112, 16, 120, 10], ['C', 118, 19, 110, 28, 102, 36]],
      ],
      body: 'M100 30 C105 30 106 44 106 58 C106 74 103 84 100 88 C97 84 94 74 94 58 C94 44 95 30 100 30 Z',
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
    emperor: { // Saturnia: round fan wings, ANGLED forewing apex, strongly scalloped margins, stubby body, feathery antennae
      wings: [
        [104, 56, ['C', 112, 42, 128, 22, 150, 16], ['L', 188, 12]].concat(
          scallop([[188, 12], [186, 27], [183, 41], [177, 53], [168, 64]], [140, 40], 5), [['C', 154, 74, 124, 74, 104, 64]]),
        [104, 60, ['C', 126, 58, 156, 58, 170, 66]].concat(
          scallop([[170, 66], [177, 79], [177, 92], [172, 104], [164, 114], [152, 122], [138, 125], [124, 121]], [140, 90], 6),
          [['C', 116, 116, 110, 104, 109, 92], ['C', 108, 82, 106, 70, 104, 60]]),
        // bipectinate (feathery) antenna: a broad comb-like leaf
        [101, 40, ['C', 101, 32, 103, 24, 106, 16], ['L', 110, 20], ['L', 107, 21], ['L', 111, 25], ['L', 107, 26], ['L', 110, 30],
          ['L', 106, 31], ['C', 105, 35, 104, 38, 103, 41]],
      ],
      body: 'M100 34 C105 34 107 44 107 58 C108 76 106 94 100 106 C94 94 92 76 93 58 C93 44 95 34 100 34 Z',
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
  DESK.flame = { x: 900, y: 474 };
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
    { k: 'atlas', x: 542, y: 238, s: 0.96, r: 0 },
    { k: 'luna', x: 714, y: 202, s: 0.96, r: 0 },
    { k: 'hawk', x: 882, y: 204, s: 0.88, r: 0 },
    { k: 'emperor', x: 1054, y: 236, s: 0.94, r: 0 },
  ];
  // Projection layers are baked to bitmaps at load (blur/turbulence filters over large areas are far too
  // expensive to rasterise on the frame lampLit flips). Each layer is an <image>: first an SVG data-URL
  // (so it is correct immediately), then swapped for a PNG rendered once via canvas.
  const PROJ_DEFS = `
    <radialGradient id="dkWash" cx="900" cy="372" r="520" gradientUnits="userSpaceOnUse" gradientTransform="translate(900 372) scale(1 0.62) translate(-900 -372)">
      <stop offset="0" stop-color="#ffcf7a" stop-opacity="0.34"/><stop offset="0.45" stop-color="#e0953a" stop-opacity="0.16"/><stop offset="1" stop-color="#e0853a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="dkMothLight" cx="50%" cy="50%" r="60%">
      <stop offset="0" stop-color="#fff1c1"/><stop offset="0.55" stop-color="#ffd98e"/><stop offset="1" stop-color="#f0a24c"/>
    </radialGradient>
    <radialGradient id="dkMothFall" gradientUnits="userSpaceOnUse" cx="900" cy="380" r="560">
      <stop offset="0" stop-color="#ffe9b4" stop-opacity="0.82"/><stop offset="0.45" stop-color="#ffd08a" stop-opacity="0.62"/><stop offset="1" stop-color="#e8964a" stop-opacity="0.36"/>
    </radialGradient>
    <filter id="dkSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.8"/></filter>
    <filter id="dkGlowB" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="dkB6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="dkBleed" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="dkB20" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="20"/></filter>
    <filter id="dkWeave" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05 0.9" numOctaves="2" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.15" result="a"/>
      <feComposite in="SourceGraphic" in2="a" operator="in"/>
    </filter>`;
  function bake(markup, x, y, w, h, scale, parent, attrs, extraDefs) {
    const W = Math.round(w * scale), H = Math.round(h * scale);
    const src = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${x} ${y} ${w} ${h}"><defs>${PROJ_DEFS}${extraDefs || ''}</defs>${markup}</svg>`;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
    const im = G.el('image', Object.assign({ x, y, width: w, height: h, href: url, preserveAspectRatio: 'none' }, attrs || {}), parent);
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        c.getContext('2d').drawImage(img, 0, 0, W, H);
        im.setAttribute('href', c.toDataURL('image/png'));
      } catch (e) { /* keep the SVG image */ }
    };
    img.src = url;
    return im;
  }

  G.registerWallObject('south', {
    z: -5,
    build(g) {
      G.svg(`
        <defs>
          <radialGradient id="dkHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#ffcf7a" stop-opacity="0.6"/>
            <stop offset="0.35" stop-color="#f0a24c" stop-opacity="0.25"/>
            <stop offset="1" stop-color="#e0853a" stop-opacity="0"/>
          </radialGradient>
        </defs>`, g);
      // warm halo around lamp (desk pool + wall bloom) — plain gradients, cheap
      R.halo = G.el('g', { opacity: 0.012, 'pointer-events': 'none' }, g);
      G.el('ellipse', { cx: 900, cy: 452, rx: 420, ry: 300, fill: 'url(#dkHalo)' }, R.halo);
      G.el('ellipse', { cx: 900, cy: 580, rx: 360, ry: 60, fill: 'url(#dkHalo)', opacity: 0.8 }, R.halo);

      // faint dark cone either side of the shade (baked)
      R.cone = G.el('g', { opacity: 0.012, 'pointer-events': 'none', style: 'mix-blend-mode:multiply' }, g);
      bake(`<path d="M852 360 L360 90 L330 470 L800 442 Z" fill="#1a1410" opacity="0.22" filter="url(#dkB20)"/>
            <path d="M948 360 L1440 90 L1470 470 L1000 442 Z" fill="#1a1410" opacity="0.22" filter="url(#dkB20)"/>`,
        260, 20, 1280, 520, 0.5, R.cone);
      R.proj = G.el('g', { opacity: 0.012, 'pointer-events': 'none', style: 'mix-blend-mode:screen' }, g);
      // broad fan of light up the wall + bright rim of the shade's top opening (baked, one layer)
      R.wash = bake(`<path d="M852 362 L380 60 Q900 -30 1420 60 L948 362 Z" fill="url(#dkWash)" filter="url(#dkBleed)"/>
            <ellipse cx="900" cy="346" rx="190" ry="34" fill="#ffcf7a" opacity="0.1" filter="url(#dkB20)"/>`,
        300, -60, 1200, 480, 0.5, R.proj);
      R.moths = [];
      SLOTS.forEach((s) => {
        const outer = G.el('g', {}, R.proj);
        const inner = G.el('g', {}, outer);
        // keystone: further from the lamp axis -> slightly larger, softer and dimmer
        const dist = Math.min(1, Math.abs(s.x - 900) / 360);
        const sc = s.s * (1 + 0.06 * dist), soft = (1.3 + 1.5 * dist).toFixed(2), pen = (8 + 6 * dist).toFixed(1);
        const hot = (0.98 - 0.2 * dist).toFixed(2), rim = (0.4 - 0.14 * dist).toFixed(2);
        const loc = `transform="translate(${s.x} ${s.y}) scale(${sc.toFixed(4)})"`;
        const bx = s.x - 140 * sc, by = s.y - 110 * sc, bw = 280 * sc, bh = 220 * sc;
        const defs = `<radialGradient id="dkHot" cx="50%" cy="46%" r="58%">
            <stop offset="0" stop-color="#fff3cc" stop-opacity="${hot}"/><stop offset="0.45" stop-color="#ffd690" stop-opacity="${(hot * 0.8).toFixed(2)}"/>
            <stop offset="1" stop-color="#e98f44" stop-opacity="${rim}"/></radialGradient>
          <filter id="dkS" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${soft}"/></filter>
          <filter id="dkP" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${pen}"/></filter>`;
        // penumbra spread + hot-cored, soft-edged light shape
        bake(`<g ${loc}><path d="${SIL[s.k]}" transform="scale(1.07) translate(-100 -70)" fill="#f0a24c" opacity="${(0.34 - 0.08 * dist).toFixed(2)}" filter="url(#dkP)"/>
              <path d="${SIL[s.k]}" transform="translate(-100 -70)" fill="url(#dkHot)" filter="url(#dkS)"/></g>`,
          bx, by, bw, bh, 1.5, inner, null, defs);
        // paper-grain shimmer layer (its opacity flickers)
        const weave = bake(`<g ${loc}><path d="${SIL[s.k]}" transform="translate(-100 -70)" fill="#fff6d8" filter="url(#dkWeave)"/></g>`,
          bx, by, bw, bh, 1.5, inner, { opacity: 0.2 });
        R.moths.push({ outer, inner, s, weave });
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
      if (lightingNow || lit === projShown) return;
      projShown = lit;
      const animate = document.body.dataset.ready === '1' && G.view() === 'south';
      if (animate) fadeProjection(lit ? 1 : 0, 1300);
      else setProj(lit ? 1 : 0);
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
          <clipPath id="dkBookTop"><path d="M540 530 L702 526 L727 555 L515 561 Z"/></clipPath>
          <linearGradient id="dkFore" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8a67e"/><stop offset="1" stop-color="#7a6a48"/></linearGradient>
        </defs>
        <!-- contact shadow -->
        <ellipse cx="624" cy="577" rx="126" ry="10" fill="#000" opacity="0.5" filter="url(#blur6)"/>
        <!-- bottom board -->
        <path d="M515 572 L727 567 L727 573 L515 579 Z" fill="#3a1414" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <!-- page block: front + fore-edge side -->
        <path d="M517 562 L725 557 L725 569 L517 574 Z" fill="url(#dkEdges)" stroke="${INK}" stroke-width="1.2"/>
        <path d="M519 565 L723 560 M519 567.5 L723 562.5 M519 570 L723 565" stroke="#8a7a58" stroke-width="0.6" opacity="0.8"/>
        <path d="M702 528 L725 557 L725 569 L704 541 Z" fill="url(#dkFore)" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M727 555 L727 571 L704 542" fill="none" stroke="#3a1414" stroke-width="3"/>
        <!-- top board -->
        <path d="M540 530 L702 526 L727 555 L515 561 Z" fill="url(#dkCover)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" filter="url(#ink)"/>
        <path d="M515 561 L727 555 L727 559 L515 565 Z" fill="#4a1a18" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <!-- spine band + raised bands -->
        <path d="M540 530 L515 561 L532 560.6 L555 529.6 Z" fill="#2c0f0e" opacity="0.75"/>
        <path d="M534 537 L550 536.6 M527 546 L543 545.6 M520 555 L537 554.6" stroke="#b8893a" stroke-width="1.1" opacity="0.6"/>
        <!-- tooled border -->
        <path d="M562 533.5 L696 530.4 L714 552 L545 556 Z" fill="none" stroke="#b8893a" stroke-width="1.1" opacity="0.75"/>
        <path d="M566 536 L693 533.1 L708 550 L551 553.6 Z" fill="none" stroke="#b8893a" stroke-width="0.6" opacity="0.5"/>
        <!-- gilt moth on cover -->
        <g transform="translate(630 542) scale(0.3 0.15)" opacity="0.9">
          <path d="${SIL.luna}" transform="translate(-100 -70)" fill="#d9ad58" stroke="#6e4d1c" stroke-width="3"/>
        </g>
        <!-- cover highlight -->
        <path d="M548 532 L640 530" stroke="#e8b0a0" stroke-width="1.5" opacity="0.25" stroke-linecap="round"/>
        <!-- ribbon bookmark draping from the pages onto the desk -->
        <path d="M646 569 C648 578 642 586 650 594 L644 602 L652 599 L657 605 L658 595 C650 587 655 578 652 568 Z" fill="#6e2a26" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      `, jg);
      // moonlight shimmer
      R.shimmer = G.el('g', { opacity: 0, 'pointer-events': 'none' }, jg);
      const sh = G.el('g', { 'clip-path': 'url(#dkBookTop)' }, R.shimmer);
      G.el('path', { d: 'M540 530 L702 526 L727 555 L515 561 Z', fill: '#cfe3ff', opacity: 0.25 }, sh);
      G.svg(`<rect x="440" y="520" width="60" height="50" fill="url(#dkSheen)" transform="skewX(-30)">
        <animate attributeName="x" values="700;1260;1260" keyTimes="0;0.55;1" dur="3.2s" repeatCount="indefinite"/></rect>`, sh);
      const spark = G.svg(`
        <g fill="#f2f8ff" filter="url(#moonglow)">
          <path d="M600 543 l2 -7 l2 7 l7 2 l-7 2 l-2 7 l-2 -7 l-7 -2 Z"><animate attributeName="opacity" values="0;1;0;0" dur="2.4s" repeatCount="indefinite"/></path>
          <path d="M676 537 l1.5 -5 l1.5 5 l5 1.5 l-5 1.5 l-1.5 5 l-1.5 -5 l-5 -1.5 Z"><animate attributeName="opacity" values="0;0;1;0" dur="2.4s" repeatCount="indefinite"/></path>
          <path d="M562 552 l1.2 -4 l1.2 4 l4 1.2 l-4 1.2 l-1.2 4 l-1.2 -4 l-4 -1.2 Z"><animate attributeName="opacity" values="1;0;0;1" dur="3.1s" repeatCount="indefinite"/></path>
        </g>`, R.shimmer);
      void spark;
      const hot = G.el('path', { d: 'M508 520 L732 516 L734 608 L508 610 Z', fill: 'transparent' }, jg);
      G.hotspot(hot, { cursor: 'look', click() { G.sfx('paper'); G.go('journal'); } });
    },
    update() {
      R.shimmer.setAttribute('opacity', G.get('windowOpen') && !G.get('inkSeen') ? 1 : 0);
    },
  });

  // ================================================================== OIL LAMP
  // geometry: shade 356–446, glass chimney 436–498 (flame inside), collar 494–508, font 505–550, foot 561–577
  const SHADE_D = 'M852 358 C870 354 930 354 948 358 L1002 436 C960 448 840 448 798 436 Z';
  const CHIM_D = 'M880 498 C864 490 858 472 864 458 C868 448 878 444 884 436 L916 436 C922 444 932 448 936 458 C942 472 936 490 920 498 Z';
  const FONT_D = 'M888 550 C852 547 841 532 846 520 C851 510 872 505 900 505 C928 505 949 510 954 520 C959 532 948 547 912 550 Z';
  const FOOT_D = 'M844 577 C844 566 870 561 900 561 C930 561 956 566 956 577 Z';
  const STEM_D = 'M884 562 C887 557 888 553 887 549 L913 549 C912 553 913 557 916 562 Z';
  const COLLAR_D = 'M874 508 L875 497 C876 493 924 493 925 497 L926 508 Z';
  function rng(seed) { let x = seed; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
  G.registerWallObject('south', {
    z: 6,
    build(g) {
      G.svg(`
        <defs>
          <linearGradient id="dkBrassH" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#2e1d06"/><stop offset="0.14" stop-color="#7a5620"/><stop offset="0.28" stop-color="#f3d68e"/>
            <stop offset="0.36" stop-color="#c99a45"/><stop offset="0.6" stop-color="#8a6226"/><stop offset="0.84" stop-color="#553812"/><stop offset="1" stop-color="#241604"/>
          </linearGradient>
          <radialGradient id="dkPatina" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#2f3418" stop-opacity="0.85"/><stop offset="1" stop-color="#3c3a1e" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="dkGlass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#cfe3ff" stop-opacity="0.22"/><stop offset="0.22" stop-color="#ffffff" stop-opacity="0.5"/>
            <stop offset="0.36" stop-color="#cfe3ff" stop-opacity="0.07"/><stop offset="0.84" stop-color="#cfe3ff" stop-opacity="0.12"/>
            <stop offset="1" stop-color="#ffffff" stop-opacity="0.3"/>
          </linearGradient>
          <radialGradient id="dkGlassLit" cx="50%" cy="68%" r="62%">
            <stop offset="0" stop-color="#fff1c1" stop-opacity="0.95"/><stop offset="0.45" stop-color="#ffcf7a" stop-opacity="0.6"/><stop offset="1" stop-color="#e0853a" stop-opacity="0.25"/>
          </radialGradient>
          <linearGradient id="dkShadeCold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#4e4c40"/><stop offset="0.3" stop-color="#9d9478"/><stop offset="0.62" stop-color="#857d64"/><stop offset="1" stop-color="#36352e"/>
          </linearGradient>
          <radialGradient id="dkShadeLit" cx="50%" cy="88%" r="80%">
            <stop offset="0" stop-color="#fff1c1"/><stop offset="0.4" stop-color="#ffd88a"/><stop offset="0.78" stop-color="#e79a48"/><stop offset="1" stop-color="#9a4a1c"/>
          </radialGradient>
          <radialGradient id="dkFlame" cx="50%" cy="78%" r="70%">
            <stop offset="0" stop-color="#fffbe8"/><stop offset="0.28" stop-color="#ffe7a6"/><stop offset="0.6" stop-color="#ffbf5c"/><stop offset="1" stop-color="#e0702a"/>
          </radialGradient>
          <radialGradient id="dkBulbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#fff1c1" stop-opacity="0.95"/><stop offset="0.45" stop-color="#ffcf7a" stop-opacity="0.45"/><stop offset="1" stop-color="#e0853a" stop-opacity="0"/>
          </radialGradient>
          <clipPath id="dkShadeClip"><path d="${SHADE_D}"/></clipPath>
          <clipPath id="dkFontClip"><path d="${FONT_D}"/><path d="${FOOT_D}"/><path d="${COLLAR_D}"/></clipPath>
          <clipPath id="dkChimClip"><path d="${CHIM_D}"/></clipPath>
          <filter id="dkPaint" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" seed="21" result="n"/>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>`, g);
      const L = G.el('g', {}, g);
      G.el('ellipse', { cx: 900, cy: 577, rx: 82, ry: 8, fill: '#000', opacity: 0.55, filter: 'url(#blur6)' }, L);
      // ---- brass body
      G.svg(`
        <g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" filter="url(#ink)">
          <path d="${FOOT_D}" fill="url(#dkBrassH)"/>
          <path d="${STEM_D}" fill="url(#dkBrassH)"/>
          <path d="${FONT_D}" fill="url(#dkBrassH)"/>
          <path d="${COLLAR_D}" fill="url(#dkBrassH)"/>
          <path d="M926 501 H938" stroke-width="3"/>
          <ellipse cx="941" cy="501" rx="4" ry="7.5" fill="url(#dkBrassH)"/>
        </g>
        <g clip-path="url(#dkFontClip)" pointer-events="none">
          <ellipse cx="930" cy="540" rx="22" ry="8" fill="url(#dkPatina)"/>
          <ellipse cx="866" cy="536" rx="14" ry="7" fill="url(#dkPatina)"/>
          <ellipse cx="930" cy="572" rx="18" ry="5" fill="url(#dkPatina)"/>
          <path d="M858 522 C860 512 872 508 884 508" fill="none" stroke="#fffbe8" stroke-width="4.5" stroke-linecap="round" opacity="0.85" filter="url(#dkPaint)"/>
          <path d="M852 530 C856 540 868 545 880 546" fill="none" stroke="#ffe7a6" stroke-width="2" stroke-linecap="round" opacity="0.35" filter="url(#dkPaint)"/>
          <path d="M872 566 C882 563 894 563 902 563" fill="none" stroke="#fff4cf" stroke-width="2.4" stroke-linecap="round" opacity="0.5"/>
          <path d="M880 499 L880 506" stroke="#fff4cf" stroke-width="3" opacity="0.45"/>
          <path d="M920 516 C926 513 933 515 935 521" fill="none" stroke="#3a2608" stroke-width="2.2" stroke-linecap="round" opacity="0.6"/>
          <path d="M921 519 C926 517 931 518 933 523" fill="none" stroke="#f3d48a" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>
          <path d="M896 530 l14 -3 M902 536 l9 -1 M864 570 l10 -2" stroke="#f3d48a" stroke-width="0.8" opacity="0.5"/>
        </g>
        <path d="M850 524 C874 530 926 530 950 524" fill="none" stroke="${INK}" stroke-width="1.3" opacity="0.6"/>
        <path d="M878 502 H922" stroke="${INK}" stroke-width="1.1" opacity="0.55"/>
      `, L);
      R.brassLit = G.el('path', { d: 'M850 520 C866 540 934 540 950 520 C944 538 926 546 900 546 C874 546 856 538 850 520 Z', fill: '#ffcf7a', opacity: 0, filter: 'url(#blur2)', 'pointer-events': 'none' }, L);
      // ---- chimney + flame
      R.bulbGlow = G.el('ellipse', { cx: 900, cy: 474, rx: 58, ry: 46, fill: 'url(#dkBulbGlow)', opacity: 0 }, L);
      R.glassLit = G.el('path', { d: CHIM_D, fill: 'url(#dkGlassLit)', opacity: 0 }, L);
      G.el('path', { d: 'M895 496 L896 488 L904 488 L905 496 Z', fill: '#2a1a10', stroke: INK, 'stroke-width': 1 }, L);
      R.flameG = G.el('g', { opacity: 0.012, 'clip-path': 'url(#dkChimClip)' }, L);
      R.flameInner = G.el('g', {}, R.flameG);
      bake(`<ellipse cx="900" cy="472" rx="24" ry="30" fill="#ffb34d" opacity="0.5" filter="url(#dkB6)"/>
        <path d="M900 446 C904 456 914 468 913 478 C912 486 906 490 900 490 C894 490 888 486 887 478 C886 468 896 456 900 446 Z" fill="url(#dkFlame)" filter="url(#dkGlowB)"/>
        <path d="M900 464 C903 471 906 478 905 482 C904 486 896 486 895 482 C894 478 897 471 900 464 Z" fill="#fffbe8" opacity="0.9"/>`,
        850, 420, 100, 90, 3, R.flameInner, null,
        `<radialGradient id="dkFlame" cx="50%" cy="78%" r="70%"><stop offset="0" stop-color="#fffbe8"/><stop offset="0.28" stop-color="#ffe7a6"/><stop offset="0.6" stop-color="#ffbf5c"/><stop offset="1" stop-color="#e0702a"/></radialGradient>`);
      G.svg(`
        <path d="${CHIM_D}" fill="url(#dkGlass)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M870 480 C866 470 868 460 876 452" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
        <path d="M926 488 C932 480 933 470 930 462" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.35"/>
      `, L);
      // ---- shade (hand-made: irregular pleats, wobbly hem)
      const shade = G.el('g', {}, L);
      R.shadeBase = G.el('path', { d: SHADE_D, fill: 'url(#dkShadeCold)' }, shade);
      R.shadeLit = G.el('path', { d: SHADE_D, fill: 'url(#dkShadeLit)', opacity: 0 }, shade);
      const inner = G.el('g', { 'clip-path': 'url(#dkShadeClip)' }, shade);
      const rnd = rng(77);
      let tt = 0; const ts = [0];
      while (tt < 1) { tt += 0.045 + rnd() * 0.05; ts.push(Math.min(1, tt)); }
      let bands = '', lines = '';
      for (let i = 0; i < ts.length - 1; i++) {
        const a0 = ts[i], a1 = ts[i + 1];
        const xt0 = 852 + 96 * a0, xb0 = 798 + 204 * a0, xt1 = 852 + 96 * a1, xb1 = 798 + 204 * a1;
        const wob = (rnd() - 0.5) * 6;
        if (i % 2) bands += `<path d="M${xt0.toFixed(1)} 350 Q${((xt0 + xb0) / 2 + wob).toFixed(1)} 400 ${xb0.toFixed(1)} 452 L${xb1.toFixed(1)} 452 Q${((xt1 + xb1) / 2 + wob).toFixed(1)} 400 ${xt1.toFixed(1)} 350 Z" fill="#000" opacity="${(0.06 + rnd() * 0.12).toFixed(3)}"/>`;
        lines += `<path d="M${xt0.toFixed(1)} 350 Q${((xt0 + xb0) / 2 + wob).toFixed(1)} 400 ${xb0.toFixed(1)} 452" fill="none" stroke="#3a2418" stroke-width="${(0.7 + rnd() * 1.2).toFixed(2)}" opacity="${(0.3 + rnd() * 0.4).toFixed(2)}"/>`;
      }
      G.svg(bands + lines, inner);
      G.svg(`
        <linearGradient id="dkShadeRound" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity="0.5"/><stop offset="0.28" stop-color="#000" stop-opacity="0"/>
          <stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/>
        </linearGradient>
        <rect x="790" y="350" width="220" height="110" fill="url(#dkShadeRound)"/>
        <path d="M800 432 C840 444 960 444 1000 432" fill="none" stroke="#6e4d1c" stroke-width="1" opacity="0.4" stroke-dasharray="3 4"/>`, inner);
      R.holes = G.el('g', {}, inner);
      [['atlas', 838, 406, 0.2, -10], ['luna', 884, 386, 0.19, -3], ['hawk', 922, 400, 0.18, 4], ['emperor', 964, 416, 0.17, 12]].forEach(h => {
        G.el('path', { d: SIL[h[0]], transform: `translate(${h[1]} ${h[2]}) rotate(${h[4]}) scale(${h[3]} ${h[3] * 0.9}) translate(-100 -70)` }, R.holes);
      });
      R.holes.setAttribute('fill', '#15100c');
      R.holesLit = bake(`<g clip-path="url(#dkSC2)" fill="#fff6d8" filter="url(#dkGlowB)">${R.holes.innerHTML}</g>`,
        790, 350, 220, 110, 2, inner, { opacity: 0.012 }, `<clipPath id="dkSC2"><path d="${SHADE_D}"/></clipPath>`);
      G.svg(`
        <path d="${SHADE_D}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" filter="url(#ink)"/>
        <path d="M852 358 C870 363 930 363 948 358" fill="none" stroke="${INK}" stroke-width="1.6"/>
        <path d="M798 436 C822 441 846 446 872 445 C900 448 932 446 960 444 C978 442 992 439 1002 436" fill="none" stroke="#b8893a" stroke-width="3.2" filter="url(#ink)"/>
        <path d="M800 439 C842 450 958 450 1000 439" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.7"/>
      `, shade);
      // ---- cold tint (unlit): union of lamp parts, blended as one layer
      R.cold = G.el('g', { opacity: 0.42, 'pointer-events': 'none', style: 'mix-blend-mode:multiply' }, L);
      [SHADE_D, CHIM_D, COLLAR_D, FONT_D, STEM_D, FOOT_D].forEach(d => G.el('path', { d, fill: '#0e1a22' }, R.cold));
      // ---- match (animation prop); head at local 0,0
      R.match = G.el('g', { opacity: 0, 'pointer-events': 'none' }, g);
      G.svg(`
        <path d="M0 0 L70 -3" stroke="#c9a877" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M0 0 L70 -3" stroke="${INK}" stroke-width="1" opacity="0.5" transform="translate(0 2)"/>
        <ellipse cx="-2" cy="0" rx="6" ry="4.6" fill="#5e2322" stroke="${INK}" stroke-width="1.2"/>`, R.match);
      R.matchFlame = G.el('g', { opacity: 0 }, R.match);
      G.el('ellipse', { cx: -4, cy: -8, rx: 14, ry: 18, fill: '#ffcf7a', opacity: 0.5, filter: 'url(#blur6)' }, R.matchFlame);
      G.el('path', { d: 'M-4 -22 C0 -14 4 -8 2 -2 C0 2 -8 2 -10 -2 C-12 -8 -8 -14 -4 -22 Z', fill: 'url(#dkFlame)' }, R.matchFlame);
      R.sparks = G.el('g', { opacity: 0, fill: '#ffe2a0', 'pointer-events': 'none' }, g);

      const hot = G.el('path', { d: 'M792 350 H1008 V452 H944 V580 H842 V452 H792 Z', fill: 'transparent' }, g);
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
    },
    update() {
      if (lightingNow) return;
      applyLit(G.get('lampLit') ? 1 : 0);
    },
  });

  function applyLit(k) {
    const m = v => Math.max(0.012, v).toFixed(3); // never exactly 0: keeps layers painted so lighting costs no raster spike
    R.flameG.setAttribute('opacity', m(k));
    R.bulbGlow.setAttribute('opacity', m(k));
    R.glassLit.setAttribute('opacity', m(0.8 * k));
    R.shadeLit.setAttribute('opacity', m(k * 0.92));
    R.cold.setAttribute('opacity', m(0.42 * (1 - k)));
    R.brassLit.setAttribute('opacity', m(0.35 * k));
    R.holes.setAttribute('opacity', m(1 - k));
    R.holesLit.setAttribute('opacity', m(k));
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
    await G.tween(700, t => place(990 - 86 * t, 558 - 70 * t - 30 * Math.sin(t * Math.PI), -14 + 30 * t), 'inOut');
    await G.wait(180);
    G.sfx('lampWhoosh');
    G.take('matches');
    G.set('lampLit');              // room lighting starts its ~1.2s cross-fade now
    R.projHot.setAttribute('pointer-events', 'all');
    R.moths.forEach(mm => mm.inner.setAttribute('opacity', 0));
    R.wash.setAttribute('opacity', 0);
    setProj(0.012);
    // bloom the flame while the wall projection fades up over the same ~1.3s
    const bloom = G.tween(700, t => {
      applyLit(t);
      R.flameInner.setAttribute('transform', `translate(900 490) scale(${0.2 + 0.8 * t}) translate(-900 -490)`);
      m.setAttribute('opacity', 1 - t);
      place(904 + 76 * t, 488 + 40 * t, 16 + 30 * t);
    }, 'out');
    const proj = G.tween(1400, t => {
      setProj(G.ease.inOut(t));
      R.wash.setAttribute('opacity', Math.min(1, t * 1.3).toFixed(3));
      R.moths.forEach((mm, i) => {
        const u = Math.max(0, Math.min(1, (t - i * 0.06) / 0.82));
        const e = G.ease.inOut(u);
        mm.inner.setAttribute('opacity', e.toFixed(3));
        const k = 1.05 - 0.05 * e;
        mm.inner.setAttribute('transform', `translate(${mm.s.x} ${mm.s.y}) scale(${k.toFixed(4)}) translate(${-mm.s.x} ${-mm.s.y})`);
      });
    }, 'linear');
    await Promise.all([bloom, proj]);
    R.flameInner.removeAttribute('transform');
    R.moths.forEach(mm => { mm.inner.removeAttribute('transform'); mm.inner.setAttribute('opacity', 1); });
    projShown = true;
    lightingNow = false;
    G.busy(false);
    G.say('The wick takes. Warm light spills across the desk — and four moths bloom upon the wall.', { dur: 4200 });
  }

  // projection visibility. Hidden state is 0.012 (not 0) so the baked layers stay painted/decoded and
  // nothing has to rasterise on the frame the lamp lights.
  function setProj(v) {
    const o = Math.max(0.012, v);
    R.proj.setAttribute('opacity', o.toFixed(3));
    R.cone.setAttribute('opacity', o.toFixed(3));
    R.halo.setAttribute('opacity', o.toFixed(3));
  }
  let fadeId = 0, fadeEnd = 0;
  const fadeDone = () => performance.now() > fadeEnd;
  function fadeProjection(to, ms) {
    const id = ++fadeId;
    const from = +R.proj.getAttribute('opacity') || 0;
    R.proj.removeAttribute('transform');
    fadeEnd = performance.now() + ms;
    return G.tween(ms, t => { if (id === fadeId) setProj(from + (to - from) * t); }, 'inOut');
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
      `translate(900 490) skewX(${(f2 * 3).toFixed(2)}) scale(${(1 - 0.035 * f).toFixed(3)} ${(1 + 0.07 * f).toFixed(3)}) translate(-900 -490)`);
    R.glassLit.setAttribute('opacity', (0.74 + 0.1 * f).toFixed(3));
    R.bulbGlow.setAttribute('opacity', (0.85 + 0.12 * f).toFixed(3));
    R.shadeLit.setAttribute('opacity', (0.88 + 0.06 * f).toFixed(3));
    R.halo.setAttribute('opacity', (0.9 + 0.08 * f).toFixed(3));
    if (projShown && fadeDone()) {
      R.proj.setAttribute('opacity', (0.9 + 0.1 * f).toFixed(3));
      R.moths.forEach((mm, i) => mm.weave.setAttribute('opacity', (0.2 + 0.1 * flick(t * 0.9 + i * 1.7)).toFixed(3)));
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
    // age spots (deterministic per page)
    const seed = (pageBase.n = (pageBase.n || 0) + 1);
    for (let i = 0; i < 4; i++) {
      const rx = Math.abs(Math.sin(seed * 12.9 + i * 78.2)), ry = Math.abs(Math.sin(seed * 4.1 + i * 37.7));
      const x = (side === 'L' ? 230 : 830) + rx * 540, y = 130 + ry * 620;
      G.el('circle', { cx: x.toFixed(0), cy: y.toFixed(0), r: (6 + rx * 16).toFixed(1), fill: '#9a7a44', opacity: (0.06 + ry * 0.07).toFixed(3), filter: 'url(#blur6)', 'pointer-events': 'none' }, g);
    }
  }
  function pageNum(g, side, n) {
    const t = G.el('text', {
      x: side === 'L' ? 500 : 1100, y: 762, 'font-family': FELL, 'font-size': 18, fill: '#5a4430', opacity: 0.7,
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
      ${[[-50, 6], [-16, -18], [20, -4], [54, 12]].map(p => `<g transform="translate(${cx + p[0]} ${cy + p[1]}) scale(0.95)"><path d="M0 0 C-4 -9 -16 -12 -18 -4 C-19 1 -10 3 0 0 C10 3 19 1 18 -4 C16 -12 4 -9 0 0 Z M0 0 C-3 5 -10 9 -12 5 C-13 2 -6 1 0 0 C6 1 13 2 12 5 C10 9 3 5 0 0 Z" fill="#3a2a1e" fill-opacity="0.65" stroke="#3a2a1e" stroke-width="0.8"/></g>`).join('')}
      <path d="M${cx - 12} ${cy + 36} C${cx - 14} ${cy + 44} ${cx - 24} ${cy + 50} ${cx - 22} ${cy + 62} C${cx - 20} ${cy + 72} ${cx - 12} ${cy + 76} ${cx - 12} ${cy + 80} L${cx + 12} ${cy + 80} C${cx + 12} ${cy + 76} ${cx + 20} ${cy + 72} ${cx + 22} ${cy + 62} C${cx + 24} ${cy + 50} ${cx + 14} ${cy + 44} ${cx + 12} ${cy + 36}" fill="#8a6a44" fill-opacity="0.08" stroke="#3a2a1e" stroke-width="1.5"/>
      <path d="M${cx - 6} ${cy + 72} C${cx - 4} ${cy + 64} ${cx + 4} ${cy + 64} ${cx + 6} ${cy + 72}" fill="none" stroke="#3a2a1e" stroke-width="1.2"/>
      <path d="M${cx - 18} ${cy + 80} H${cx + 18} V${cy + 88} H${cx - 18} Z" fill="#8a6a44" fill-opacity="0.2" stroke="#3a2a1e" stroke-width="1.5"/>
      <path d="M${cx - 10} ${cy + 88} C${cx - 52} ${cy + 90} ${cx - 54} ${cy + 118} ${cx - 12} ${cy + 124} L${cx + 12} ${cy + 124} C${cx + 54} ${cy + 118} ${cx + 52} ${cy + 90} ${cx + 10} ${cy + 88} Z" fill="#8a6a44" fill-opacity="0.18" stroke="#3a2a1e" stroke-width="1.7"/>
      <path d="M${cx - 10} ${cy + 124} L${cx - 8} ${cy + 136} M${cx + 10} ${cy + 124} L${cx + 8} ${cy + 136}" stroke="#3a2a1e" stroke-width="1.5"/>
      <path d="M${cx - 38} ${cy + 146} C${cx - 36} ${cy + 136} ${cx + 36} ${cy + 136} ${cx + 38} ${cy + 146} Z" fill="#8a6a44" fill-opacity="0.18" stroke="#3a2a1e" stroke-width="1.7"/>
      <path d="M${cx + 22} ${cy + 84} h10" stroke="#3a2a1e" stroke-width="2"/>
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
      G.svg(crescentDoodle(866, 150, 1.0) + candleDoodle(868, 240, 0.95), g);
      const cap = handText(g, 1100, 598, '', { lines: ['Father’s tall clock.', 'Pictures, not numbers —', '“hours one can hold.”'], size: 18, lh: 38, maxw: 330, opacity: 0.8 });
      cap.setAttribute('text-anchor', 'middle'); cap.querySelectorAll('tspan').forEach(t => t.setAttribute('x', 1100));
      pageNum(g, 'R', 2);
    }],
    // spread 2
    [g => {
      pageBase(g, 'L');
      handText(g, 262, 180, 'Father cut my lampshade by hand, so the lamp throws my four dearest onto the wall. When I count them, I count their eyes — every eye, on every wing.', { chars: 33, maxw: 480 });
      G.svg(eyeSketch(380, 500, 1.3), g);
      handText(g, 440, 500, '', { lines: ['an eye — ring', 'within ring'], size: 16, lh: 34, maxw: 260, opacity: 0.75 });
      pageNum(g, 'L', 3);
    }, g => {
      pageBase(g, 'R');
      G.svg(shadeSketch(1100, 360), g);
      handText(g, 900, 660, '', { lines: ['Lit, it is a summer night', 'on the attic wall.'], size: 18, lh: 38, maxw: 440, opacity: 0.8 });
      pageNum(g, 'R', 4);
    }],
    // spread 3
    [g => {
      pageBase(g, 'L');
      G.svg(mothSketch('luna', 500, 300, 1.35, -6), g);
      G.svg(`<path d="M430 424 C470 470 520 480 560 470" fill="none" stroke="#3a2a1e" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>`, g);
      handText(g, 262, 540, 'Actias luna, the moon moth. She does not eat; she lives but a week, and spends it looking for the light.', { chars: 30, maxw: 480, size: 20 });
      pageNum(g, 'L', 5);
    }, g => {
      pageBase(g, 'R');
      const refs = {};
      // pearlescent sheen: the page is deliberately, conspicuously blank
      refs.sheen = G.el('g', { 'pointer-events': 'none' }, g);
      G.el('path', { d: RIGHT_PAGE_D, fill: 'url(#dkPearl)' }, refs.sheen);
      G.el('path', { d: RIGHT_PAGE_D, fill: 'url(#dkPearl2)', opacity: 0.8, style: 'mix-blend-mode:soft-light' }, refs.sheen);
      G.svg(`<g fill="#ffffff">
        <circle cx="990" cy="300" r="1.6"><animate attributeName="opacity" values="0;0.9;0;0" dur="3.8s" repeatCount="indefinite"/></circle>
        <circle cx="1180" cy="420" r="1.3"><animate attributeName="opacity" values="0;0;0.8;0" dur="4.6s" repeatCount="indefinite"/></circle>
        <circle cx="1090" cy="520" r="1.4"><animate attributeName="opacity" values="0.7;0;0;0.7" dur="5.2s" repeatCount="indefinite"/></circle>
        <circle cx="1270" cy="250" r="1.2"><animate attributeName="opacity" values="0;0.8;0;0" dur="6.1s" begin="1.2s" repeatCount="indefinite"/></circle>
      </g>`, refs.sheen);
      // tiny line at the bottom
      handText(g, 1100, 716, '', { lines: ['Some words I write only for the moon.'], size: 13, opacity: 0.62, maxw: 380 }).setAttribute('text-anchor', 'middle');
      pageNum(g, 'R', 6);
      return refs;
    }],
    // spread 4
    [g => {
      pageBase(g, 'L');
      handText(g, 262, 200, 'They are calling me now, every night, at the glass. I think I am ready to go.', { chars: 30, maxw: 480, size: 23 });
      handText(g, 560, 420, '', { lines: ['— E.'], size: 26 });
      G.svg(`<g filter="url(#ink)" stroke="#3a2a1e" stroke-linecap="round" stroke-linejoin="round">
        <path d="M330 500 C400 492 470 496 540 490" fill="none" stroke-width="1.8"/>
        <path d="M430 494 L432 516" fill="none" stroke-width="1.2"/>
        <path d="M432 516 C414 522 408 556 414 590 C420 626 444 628 450 590 C456 556 450 522 432 516 Z" fill="#8a6a44" fill-opacity="0.18" stroke-width="1.7"/>
        <path d="M418 540 C428 546 442 544 450 538 M414 562 C426 570 444 568 452 560 M416 586 C428 592 442 590 450 584" fill="none" stroke-width="1" opacity="0.7"/>
      </g>`, g);
      handText(g, 480, 590, '', { lines: ['soon.'], size: 18, opacity: 0.7 });
      pageNum(g, 'L', 7);
    }, g => {
      pageBase(g, 'R');
      G.svg(windowSketch(1100, 380, 130), g);
      pageNum(g, 'R', 8);
    }],
  ];
  let clipN = 0;

  function applyMoon(refs, moonlit) {
    if (!refs || !refs.sheen) return;
    refs.sheen.setAttribute('opacity', moonlit ? 0 : 1);
  }

  // --- silver moon-ink (view level, drawn above the moonlight so it can glint) ---
  function hatchD(x0, y0, x1, y1, sp, angDeg, seed) {
    const r = rng(seed || 5);
    const a = angDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
    let d = '';
    for (let o = -R; o <= R; o += sp) {
      const j = (r() - 0.5) * sp * 0.35;
      const px = cx + nx * (o + j), py = cy + ny * (o + j);
      const e0 = R * (0.9 + r() * 0.1), e1 = R * (0.9 + r() * 0.1);
      d += `M${(px - dx * e0).toFixed(1)} ${(py - dy * e0).toFixed(1)} L${(px + dx * e1).toFixed(1)} ${(py + dy * e1).toFixed(1)} `;
    }
    return d;
  }
  function buildInk(parent) {
    const refs = { outlines: [], darks: [], lits: [] };
    refs.ink = G.el('g', { 'pointer-events': 'none' }, parent);
    const defs = G.el('defs', {}, refs.ink);
    const MY = 356, RR = 50, XS = [912, 1040, 1168, 1296];
    const half = (x, sweep) => `M${x} ${MY - RR} A${RR} ${RR} 0 0 ${sweep} ${x} ${MY + RR} Z`;
    const disc = x => `M${x} ${MY - RR} A${RR} ${RR} 0 0 1 ${x} ${MY + RR} A${RR} ${RR} 0 0 1 ${x} ${MY - RR} Z`;
    refs.XS = XS; refs.MY = MY; refs.RR = RR;
    refs.wipes = []; refs.halos = [];
    defs.innerHTML = `
      <linearGradient id="dkInkBeam" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#eaf2ff" stop-opacity="0"/><stop offset="0.35" stop-color="#eaf2ff" stop-opacity="0.55"/>
        <stop offset="0.6" stop-color="#dbe8ff" stop-opacity="0.35"/><stop offset="1" stop-color="#dbe8ff" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="dkInkHalo" cx="50%" cy="50%" r="50%">
        <stop offset="0.55" stop-color="#e8f0ff" stop-opacity="0.55"/><stop offset="0.75" stop-color="#cfe0ff" stop-opacity="0.22"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/>
      </radialGradient>`;
    // the page catching the moonbeam
    refs.beam = G.el('path', { d: 'M820 96 L1150 96 L1398 560 L1398 786 L1200 786 Z', fill: 'url(#dkInkBeam)', style: 'mix-blend-mode:screen', opacity: 0.5 }, refs.ink);
    // soft glow behind the moons + words (persists faintly as an afterglow, breathing)
    refs.glowG = G.el('g', {}, refs.ink);
    XS.forEach(x => refs.halos.push(G.el('circle', { cx: x, cy: MY, r: RR * 1.65, fill: 'url(#dkInkHalo)' }, refs.glowG)));
    refs.halos.push(G.el('ellipse', { cx: 1104, cy: 522, rx: 170, ry: 46, fill: 'url(#dkInkHalo)', opacity: 0.7 }, refs.glowG));
    G.el('animate', { attributeName: 'opacity', values: '0.75;1;0.75', dur: '4s', repeatCount: 'indefinite' }, refs.glowG);
    XS.forEach((x, i) => {
      // i: 0 new, 1 first quarter (right lit), 2 full, 3 last quarter (left lit)
      const litD = [null, half(x, 1), disc(x), half(x, 0)][i];
      const darkD = [disc(x), half(x, 0), null, half(x, 1)][i];
      const mg = G.el('g', {}, refs.ink);
      // slate under-stroke separates the moon from the page
      G.el('circle', { cx: x, cy: MY, r: RR, fill: 'none', stroke: '#1a2230', 'stroke-width': 5, opacity: 0.45 }, mg);
      // diagonal wipe: the hatching is drawn in stroke by stroke
      const wc = G.el('clipPath', { id: 'dkMW' + i }, defs);
      const wr = G.el('rect', { x: x - 75, y: MY - 75, width: 150, height: 150, transform: `rotate(-28 ${x} ${MY})` }, wc);
      refs.wipes.push(wr);
      const wg = G.el('g', { 'clip-path': `url(#dkMW${i})` }, mg);
      const dg = G.el('g', {}, wg), lg = G.el('g', {}, wg);
      if (darkD) {
        const cp = G.el('clipPath', { id: 'dkMD' + i }, defs); G.el('path', { d: darkD }, cp);
        G.el('path', { d: darkD, fill: '#18202d', opacity: 0.85 }, dg);
        G.el('path', { d: hatchD(x - RR, MY - RR, x + RR, MY + RR, 6, 45, 11 + i), stroke: '#c8d6ea', 'stroke-width': 0.7, opacity: 0.3, 'clip-path': `url(#dkMD${i})` }, dg);
        G.el('path', { d: hatchD(x - RR, MY - RR, x + RR, MY + RR, 7, -45, 31 + i), stroke: '#c8d6ea', 'stroke-width': 0.6, opacity: 0.2, 'clip-path': `url(#dkMD${i})` }, dg);
      }
      if (litD) {
        const cp = G.el('clipPath', { id: 'dkML' + i }, defs); G.el('path', { d: litD }, cp);
        G.el('path', { d: litD, fill: '#dfe8f5', opacity: 0.42 }, lg);
        const h = G.el('path', { d: hatchD(x - RR, MY - RR, x + RR, MY + RR, 3.3, 62, 51 + i), stroke: '#f6f9ff', 'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: 0.95, 'clip-path': `url(#dkML${i})`, filter: 'url(#moonglow)' }, lg);
        G.el('animate', { attributeName: 'opacity', values: '0.8;1;0.8', dur: (2.6 + i * 0.5).toFixed(1) + 's', repeatCount: 'indefinite' }, h);
        G.el('g', { 'clip-path': `url(#dkML${i})` }, lg).innerHTML =
          `<circle cx="${x + (i === 3 ? -18 : 16)}" cy="${MY - 14}" r="7" fill="none" stroke="#8ea2c0" stroke-width="1.2" opacity="0.7"/>` +
          `<circle cx="${x + (i === 3 ? -26 : 24)}" cy="${MY + 18}" r="4.5" fill="none" stroke="#8ea2c0" stroke-width="1" opacity="0.6"/>`;
      }
      const ol = G.el('circle', { cx: x, cy: MY, r: RR, fill: 'none', stroke: '#eef4ff', 'stroke-width': 2.4, filter: 'url(#moonglow)' }, mg);
      refs.outlines.push(ol); refs.darks.push(dg); refs.lits.push(lg);
    });
    // the 'pen tip' — a bright glint that travels with the ink as it draws itself
    refs.pen = G.svg(`<g filter="url(#moonglow)"><circle r="9" fill="#eaf2ff" opacity="0.35"/><path d="M0 -11 L2 -2 L11 0 L2 2 L0 11 L-2 2 L-11 0 L-2 -2 Z" fill="#ffffff"/></g>`, refs.ink);
    refs.pen.setAttribute('opacity', 0);
    // twinkles
    G.svg(`<g fill="#ffffff" filter="url(#moonglow)">
      <path d="M1046 300 l1.5 -6 l1.5 6 l6 1.5 l-6 1.5 l-1.5 6 l-1.5 -6 l-6 -1.5 Z"><animate attributeName="opacity" values="0;1;0;0" dur="3.1s" repeatCount="indefinite"/></path>
      <path d="M1188 330 l1.2 -5 l1.2 5 l5 1.2 l-5 1.2 l-1.2 5 l-1.2 -5 l-5 -1.2 Z"><animate attributeName="opacity" values="0;0;1;0" dur="3.7s" repeatCount="indefinite"/></path>
      <path d="M1276 392 l1.2 -5 l1.2 5 l5 1.2 l-5 1.2 l-1.2 5 l-1.2 -5 l-5 -1.2 Z"><animate attributeName="opacity" values="1;0;0;1" dur="4.3s" repeatCount="indefinite"/></path>
    </g>`, refs.ink);
    refs.flour = G.el('path', { d: 'M880 446 C980 432 1100 458 1200 440 C1250 432 1300 442 1330 436', fill: 'none', stroke: '#e6eefc', 'stroke-width': 1.6, opacity: 0.85, filter: 'url(#moonglow)' }, refs.ink);
    refs.words = handText(refs.ink, 1104, 536, '', { lines: ['for the box'], size: 36, fill: '#f2f7ff', opacity: 1, maxw: 420 });
    refs.words.setAttribute('text-anchor', 'middle');
    refs.words.querySelector('tspan').setAttribute('x', 1104);
    refs.words.setAttribute('stroke', '#1a2230'); refs.words.setAttribute('stroke-width', 3);
    refs.words.setAttribute('paint-order', 'stroke'); refs.words.setAttribute('stroke-linejoin', 'round');
    const wc = G.el('clipPath', { id: 'dkWordsClip' }, defs);
    refs.wordsClipRect = G.el('rect', { x: 860, y: 470, width: 500, height: 110 }, wc);
    const wg = G.el('g', { 'clip-path': 'url(#dkWordsClip)', filter: 'url(#moonglow)' }, refs.ink);
    wg.appendChild(refs.words);
    return refs;
  }
  function inkFull(r) {
    const C = 2 * Math.PI * 50;
    r.wipes.forEach(w => w.setAttribute('width', 150));
    r.halos.forEach(h => h.setAttribute('opacity', h.tagName === 'ellipse' ? 0.7 : 1));
    r.beam.setAttribute('opacity', 0.5);
    r.pen.setAttribute('opacity', 0);
    r.outlines.forEach(o => { o.setAttribute('stroke-dasharray', C); o.setAttribute('stroke-dashoffset', 0); });
    r.darks.concat(r.lits).forEach(f => f.setAttribute('opacity', 1));
    r.flour.setAttribute('opacity', 0.85);
    r.wordsClipRect.setAttribute('width', 500);
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
          <linearGradient id="dkMoonBath" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#8aa3c8"/><stop offset="0.5" stop-color="#6d86ab"/><stop offset="1" stop-color="#4a5f80"/>
          </linearGradient>
          <linearGradient id="dkPearl" x1="0" y1="0" x2="1" y2="0.35">
            <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
            <stop offset="0.22" stop-color="#f2c4e2" stop-opacity="0.26"/>
            <stop offset="0.38" stop-color="#bfeedd" stop-opacity="0.3"/>
            <stop offset="0.52" stop-color="#c6d2fa" stop-opacity="0.3"/>
            <stop offset="0.66" stop-color="#f6e0c0" stop-opacity="0.22"/>
            <stop offset="0.8" stop-color="#ffffff" stop-opacity="0"/>
            <animateTransform attributeName="gradientTransform" type="translate" values="-0.6 0;0.6 0;-0.6 0" dur="9s" repeatCount="indefinite"/>
          </linearGradient>
          <radialGradient id="dkPearl2" cx="50%" cy="45%" r="60%">
            <stop offset="0" stop-color="#fff8ff" stop-opacity="0.9"/><stop offset="0.6" stop-color="#e8f0f8" stop-opacity="0.4"/><stop offset="1" stop-color="#e8f0f8" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="dkMoonAmb" gradientUnits="userSpaceOnUse" cx="1110" cy="430" r="820">
            <stop offset="0" stop-color="#7a90b6"/><stop offset="0.42" stop-color="#a4b5cf"/><stop offset="1" stop-color="#dfe4ec"/>
          </radialGradient>
          <filter id="dkBlur40" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
          <linearGradient id="dkGutterShadow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.5" stop-color="#1a0f06" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
          </linearGradient>
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
      G.svg(`<path d="M805 97 C808 300 812 560 818 800 L814 826 L822 816 L830 828 L830 800 C824 560 818 300 815 97 Z" fill="#6e2a26" stroke="${INK}" stroke-width="1.3" opacity="0.95"/>
             <path d="M809 110 C812 300 816 560 821 796" fill="none" stroke="#a35a5a" stroke-width="1" opacity="0.5"/>`, g);
      // turning leaf (curved, lifted, with thickness, cast shadow and moving gutter shadow)
      J.turnG = G.el('g', { style: 'display:none', 'pointer-events': 'none' }, g);
      J.gutter = G.el('rect', { x: 730, y: 96, width: 140, height: 700, fill: 'url(#dkGutterShadow)', opacity: 0 }, J.turnG);
      J.leafCast = G.el('path', { fill: '#000', filter: 'url(#blur20)', opacity: 0 }, J.turnG);
      J.leafThick = G.el('path', { fill: '#b3a079', stroke: INK, 'stroke-width': 1 }, J.turnG);
      J.leafBase = G.el('path', { fill: '#e8dcc0', filter: 'url(#paper)' }, J.turnG);
      const lc = G.el('clipPath', { id: 'dkLeafClip' }, J.turnG);
      J.leafClip = G.el('path', {}, lc);
      J.leafContent = G.el('g', {}, G.el('g', { 'clip-path': 'url(#dkLeafClip)' }, J.turnG));
      J.leafGrad = G.el('linearGradient', { id: 'dkLeafGrad', gradientUnits: 'userSpaceOnUse', x1: 800, y1: 0, x2: 1395, y2: 0 }, J.turnG);
      G.el('stop', { offset: 0, 'stop-color': '#000', 'stop-opacity': 0.9 }, J.leafGrad);
      G.el('stop', { offset: 0.5, 'stop-color': '#000', 'stop-opacity': 0.35 }, J.leafGrad);
      G.el('stop', { offset: 0.92, 'stop-color': '#000', 'stop-opacity': 0.1 }, J.leafGrad);
      G.el('stop', { offset: 1, 'stop-color': '#fff6e0', 'stop-opacity': 0.5 }, J.leafGrad);
      J.leafShade = G.el('path', { fill: 'url(#dkLeafGrad)', opacity: 0 }, J.turnG);
      J.leafEdge = G.el('path', { fill: 'none', stroke: '#fff6e0', 'stroke-width': 2, opacity: 0 }, J.turnG);
      G.el('path', { d: 'M0 0', fill: 'none' }, J.turnG);
      // light overlays
      J.warm = G.el('rect', { width: 1600, height: 900, fill: 'url(#dkWarm)', 'pointer-events': 'none', style: 'mix-blend-mode:screen' }, g);
      J.cold = G.el('rect', { width: 1600, height: 900, fill: '#16262b', opacity: 0.18, 'pointer-events': 'none', style: 'mix-blend-mode:multiply' }, g);
      // moonlight (window open): soft ambient cooling + a diagonal shaft crossing both pages
      J.moon = G.el('g', { opacity: 0, 'pointer-events': 'none' }, g);
      G.el('rect', { width: 1600, height: 900, fill: 'url(#dkMoonAmb)', style: 'mix-blend-mode:multiply' }, J.moon);
      G.el('path', { d: 'M520 -160 L1080 -160 L1580 1060 L980 1060 Z', fill: '#cfe3ff', opacity: 0.26, filter: 'url(#dkBlur40)', style: 'mix-blend-mode:screen' }, J.moon);
      G.el('path', { d: 'M720 -160 L880 -160 L1330 1060 L1150 1060 Z', fill: '#e6f0ff', opacity: 0.14, filter: 'url(#dkBlur40)', style: 'mix-blend-mode:screen' }, J.moon);
      G.svg(`<g fill="#e6f0ff">
        <circle cx="900" cy="200" r="1.6" opacity="0.5"><animate attributeName="cy" values="200;260;200" dur="14s" repeatCount="indefinite"/></circle>
        <circle cx="1010" cy="480" r="1.2" opacity="0.45"><animate attributeName="cx" values="1010;1040;1010" dur="11s" repeatCount="indefinite"/></circle>
        <circle cx="1180" cy="660" r="1.4" opacity="0.4"><animate attributeName="cy" values="660;610;660" dur="13s" repeatCount="indefinite"/></circle>
        <circle cx="760" cy="120" r="1.1" opacity="0.4"><animate attributeName="cx" values="760;790;760" dur="12s" repeatCount="indefinite"/></circle>
      </g>`, J.moon);
      J.inkLayer = G.el('g', { style: 'display:none', 'pointer-events': 'none' }, g);
      J.inkRefs = buildInk(J.inkLayer);
      G.el('rect', { width: 1600, height: 900, fill: 'url(#dkVig)', 'pointer-events': 'none' }, g);
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
      J.cold.setAttribute('opacity', lit ? 0.06 : 0.2);
      const moonlit = !!G.get('windowOpen');
      J.moon.setAttribute('opacity', moonlit ? 1 : 0);
      applyMoon(J.static[2].rr, moonlit);
      syncInk();
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
    J.leafContent.innerHTML = '';
    const refs = PAGES[spread][side === 'L' ? 0 : 1](J.leafContent) || {};
    applyMoon(refs, !!G.get('windowOpen'));
    fitText(J.leafContent);
  }

  // curved, lifted leaf: spine at x=800, free edge at ex
  const TOPY = 104, BOTY = 788, MIDY = 446;
  function leafFrame(p, dir) {
    const w = dir * 595 * Math.cos(Math.PI * p), ex = 800 + w;
    const lift = Math.sin(Math.PI * p), h = 44 * lift, side = w >= 0 ? 1 : -1, b = side * 34 * lift;
    const d = `M800 ${TOPY} Q${(800 + w * 0.55).toFixed(1)} ${(TOPY - h * 0.95).toFixed(1)} ${ex.toFixed(1)} ${(TOPY - h * 0.55).toFixed(1)} ` +
      `Q${(ex + b).toFixed(1)} ${MIDY} ${ex.toFixed(1)} ${(BOTY + h * 0.55).toFixed(1)} ` +
      `Q${(800 + w * 0.55).toFixed(1)} ${(BOTY + h * 0.95).toFixed(1)} 800 ${BOTY} Z`;
    J.leafClip.setAttribute('d', d);
    J.leafBase.setAttribute('d', d);
    J.leafShade.setAttribute('d', d);
    J.leafThick.setAttribute('d', d);
    J.leafThick.setAttribute('transform', `translate(${side * 3.5} 3)`);
    J.leafCast.setAttribute('d', d);
    J.leafCast.setAttribute('transform', `translate(${(side * 26 * lift).toFixed(1)} ${(12 * lift).toFixed(1)})`);
    J.leafCast.setAttribute('opacity', (0.42 * lift).toFixed(3));
    J.leafEdge.setAttribute('d', `M${ex.toFixed(1)} ${(TOPY - h * 0.55).toFixed(1)} Q${(ex + b).toFixed(1)} ${MIDY} ${ex.toFixed(1)} ${(BOTY + h * 0.55).toFixed(1)}`);
    J.leafEdge.setAttribute('opacity', (0.8 * lift).toFixed(3));
    // shade: darker as the leaf stands up (facing away from the light)
    J.leafShade.setAttribute('opacity', (0.05 + 0.3 * Math.pow(lift, 1.5)).toFixed(3));
    J.leafGrad.setAttribute('x1', 800); J.leafGrad.setAttribute('x2', ex.toFixed(1));
    const sy = 1 + (h * 1.1) / 684;
    J.leafContent.setAttribute('transform', `translate(800 ${MIDY}) scale(${Math.max(0.001, Math.abs(w) / 595).toFixed(4)} ${sy.toFixed(4)}) translate(-800 ${-MIDY})`);
    J.gutter.setAttribute('opacity', (0.75 * lift).toFixed(3));
  }

  async function turn(dir) {
    const to = J.spread + dir;
    if (J.turning || to < 0 || to >= PAGES.length) return;
    J.turning = true;
    G.sfx('pageTurn');
    const from = J.spread, S = J.static;
    S.forEach(s => { s.L.style.display = 'none'; s.R.style.display = 'none'; });
    if (dir > 0) { S[from].L.style.display = ''; S[to].R.style.display = ''; }
    else { S[to].L.style.display = ''; S[from].R.style.display = ''; }
    fitText(J.pagesRoot);
    syncInk();
    const firstSide = dir > 0 ? 'R' : 'L', secondSide = dir > 0 ? 'L' : 'R';
    leafContent(from, firstSide);
    leafFrame(0, dir);
    J.turnG.style.display = '';
    let swapped = false;
    await G.tween(920, (e) => {
      if (!swapped && e >= 0.5) { swapped = true; leafContent(to, secondSide); }
      leafFrame(e, dir);
    }, 'inOut');
    J.turnG.style.display = 'none';
    J.leafContent.innerHTML = '';
    J.turning = false;
    showSpread(to);
    maybeReveal();
  }

  function syncInk() {
    if (!J.inkRefs) return;
    const show = J.spread === 2 && !J.turning && !!G.get('windowOpen') && (!!G.get('inkSeen') || !!J.revealing);
    J.inkLayer.style.display = show ? '' : 'none';
    if (show && !J.revealing) inkFull(J.inkRefs);
  }

  async function maybeReveal() {
    if (J.spread !== 2 || !G.get('windowOpen') || J.revealing) return;
    if (G.get('inkSeen')) { glint(); return; }
    J.revealing = true;
    const r = J.inkRefs;
    const C = 2 * Math.PI * r.RR;
    const penAt = (x, y, o) => { r.pen.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); r.pen.setAttribute('opacity', o); };
    r.outlines.forEach(o => { o.setAttribute('stroke-dasharray', C); o.setAttribute('stroke-dashoffset', C); });
    r.wipes.forEach(w => w.setAttribute('width', 0));
    r.darks.concat(r.lits).forEach(f => f.setAttribute('opacity', 1));
    r.halos.forEach(h => h.setAttribute('opacity', 0));
    r.flour.setAttribute('opacity', 0);
    r.wordsClipRect.setAttribute('width', 0);
    r.beam.setAttribute('opacity', 0);
    penAt(0, 0, 0);
    J.inkLayer.style.display = '';
    G.busy(true);
    // 1. the blank page catches the moonbeam
    G.sfx('magic');
    await G.tween(900, t => r.beam.setAttribute('opacity', (1.3 * Math.sin(t * Math.PI * 0.75)).toFixed(3)), 'out');
    // 2. each moon's outline draws itself, a glint riding the nib; its glow wakes as it closes
    for (let i = 0; i < 4; i++) {
      const o = r.outlines[i], x = r.XS[i];
      await G.tween(420, t => {
        o.setAttribute('stroke-dashoffset', C * (1 - t));
        const a = t * Math.PI * 2;  // a circle's stroke starts at 3 o'clock, clockwise
        penAt(x + Math.cos(a) * r.RR, r.MY + Math.sin(a) * r.RR, 1);
        r.halos[i].setAttribute('opacity', (t * 0.6).toFixed(3));
      }, 'inOut');
    }
    // 3. the hatching sweeps in stroke by stroke (diagonal wipe), moons brighten to full glow
    await G.tween(1300, t => {
      r.wipes.forEach((w, i) => {
        const u = Math.max(0, Math.min(1, (t - i * 0.12) / 0.64));
        w.setAttribute('width', (150 * G.ease.inOut(u)).toFixed(1));
        r.halos[i].setAttribute('opacity', (0.6 + 0.4 * u).toFixed(3));
        if (u > 0 && u < 1) penAt(r.XS[i] - 60 + 120 * u, r.MY + 40 - 80 * u, 1);
      });
    }, 'linear');
    // 4. the flourish and the words are written out, left to right
    await G.tween(1400, t => {
      r.flour.setAttribute('opacity', (0.85 * Math.min(1, t * 2)).toFixed(3));
      r.wordsClipRect.setAttribute('width', (500 * t).toFixed(1));
      r.halos[4].setAttribute('opacity', (0.7 * t).toFixed(3));
      penAt(880 + 450 * t, 520 + 8 * Math.sin(t * 18), 1);
    }, 'inOut');
    await G.tween(500, t => { r.pen.setAttribute('opacity', (1 - t).toFixed(3)); r.beam.setAttribute('opacity', (0.5 * t).toFixed(3)); }, 'out');
    J.revealing = false;
    G.busy(false);
    G.set('inkSeen');
    G.say('Silver ink, woken by the moonlight: four moons, in a row.', { dur: 4000 });
  }
  // revisiting the moonlit page: a quick re-glint so the silver ink always reads as ink, not print
  let glinting = false;
  async function glint() {
    if (glinting) return;
    glinting = true;
    const r = J.inkRefs;
    inkFull(r);
    await G.tween(1400, t => {
      r.beam.setAttribute('opacity', (0.5 + 0.6 * Math.sin(t * Math.PI)).toFixed(3));
      r.pen.setAttribute('transform', `translate(${(860 + 480 * t).toFixed(1)} ${(356 + 170 * t).toFixed(1)})`);
      r.pen.setAttribute('opacity', Math.sin(t * Math.PI).toFixed(3));
      r.halos.forEach((h, i) => h.setAttribute('opacity', ((i === 4 ? 0.7 : 1) * (1 + 0.4 * Math.sin(Math.max(0, t * 1.4 - i * 0.1) * Math.PI))).toFixed(3)));
    }, 'inOut');
    inkFull(r);
    glinting = false;
  }

  // ================================================================== hints & debug steps
  G.registerHint({ id: 'journal', order: 5, when: () => !G.get('journalRead'), lines: ['There is a journal lying on the desk.', 'Edith\'s journal is on the desk, by the lamp. Read it.', 'Edith’s journal lies on the writing desk. Open it and read.'] });
  G.registerHint({ id: 'lamp', order: 20, when: () => G.get('gotMatches') && !G.get('lampLit'), lines: ['It is so dark in here. Something on the desk could give light.', 'The oil lamp on the desk has a dry wick — and you have matches.', 'Take up the matches and bring a flame to the lamp’s wick.'] });
  G.registerHint({ id: 'ink', order: 50, when: () => G.get('windowOpen') && !G.get('inkSeen'), lines: ['The moonlight is falling across the desk now.', 'One of the journal\'s pages was blank. "Some words I write only for the moon."', 'Open the journal to its third spread. In the moonlight, four moons appear.'] });
  G.registerStep(5, 'journal', () => G.set('journalRead'));
  G.registerStep(20, 'lamp', () => { G.take('matches'); G.set('lampLit'); });
  G.registerStep(50, 'ink', () => { G.set('journalRead'); G.set('inkSeen'); });
})();
