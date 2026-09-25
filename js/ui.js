/* THE MOTH KEEPER — UI layer (title screen, HUD, inventory, captions, hints, cursors, ending card).
 * Builds everything inside #overlay. Exposes window.UI = { init(), showTitle(), hideTitle(instant) }.
 * Geometry is in stage units (see css: --u = 1/1600 of stage width).
 */
(function () {
  'use strict';

  const OPENING = "You wake on the floorboards of an attic you don't remember. The door has no handle.";
  const NO_HINT = 'Nothing more to find here… or is there?';
  const MUTE_KEY = 'mothkeeper.muted';
  const TIME_KEY = 'mothkeeper.elapsed';
  const SLOTS = 5;
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let overlay, wrap;
  const S = {
    title: false, starting: false, ending: false, panel: false,
    t0: 0, carry: 0, hintEvents: 0, muted: false,
    px: null, py: null, lastSig: null, capTimer: 0, labelTimer: 0,
  };
  const E = {}; // element refs

  // ---------------------------------------------------------------- helpers
  function h(tag, attrs, html, parent) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    if (html) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  const item = id => (G.items && G.items[id]) || null;
  const FALLBACK_ICON = '<circle cx="50" cy="50" r="22" fill="none" stroke="#e9e0c4" stroke-width="3" opacity=".6"/>';
  const iconSvg = id => `<svg viewBox="0 0 100 100" aria-hidden="true">${(item(id) && item(id).icon) || FALLBACK_ICON}</svg>`;
  const itemName = id => (item(id) && item(id).name) || id;
  const safe = fn => { try { return fn(); } catch (e) { console.error(e); } };
  function stageRect() { return wrap.getBoundingClientRect(); }
  const unit = () => stageRect().width / 1600;

  // ---------------------------------------------------------------- art snippets
  // hand-inked chevron: main stroke + a faint second pass slightly offset (like a quill retrace)
  const CHEV_L = '<svg viewBox="0 0 34 84" aria-hidden="true"><path d="M27 5 C 21 22, 13 34, 7 42 C 13 51, 21 63, 27 79" stroke-width="3"/><path class="s2" d="M29 9 C 23 24, 16 35, 10 42.5 C 16 51, 23 61, 28.5 75" stroke-width="1.3"/></svg>';
  const CHEV_R = '<svg viewBox="0 0 34 84" aria-hidden="true"><path d="M7 5 C 13 22, 21 34, 27 42 C 21 51, 13 63, 7 79" stroke-width="3"/><path class="s2" d="M5 9 C 11 24, 18 35, 24 42.5 C 18 51, 11 61, 5.5 75" stroke-width="1"/></svg>';
  const CHEV_D = '<svg viewBox="0 0 84 34" aria-hidden="true"><path d="M5 7 C 22 13, 34 21, 42 27 C 51 21, 63 13, 79 7" stroke-width="3"/><path class="s2" d="M9 5 C 24 11, 35 18, 42.5 24 C 51 18, 61 11, 75 5.5" stroke-width="1"/></svg>';

  // small moth used in the hint button
  const HINT_ICON = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs><radialGradient id="uiHintHalo"><stop offset="0" stop-color="#ffd690" stop-opacity=".55"/><stop offset=".55" stop-color="#ffcf7a" stop-opacity=".12"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient></defs>
    <circle class="halo" cx="50" cy="52" r="46" fill="url(#uiHintHalo)"/>
    <circle cx="50" cy="52" r="33" fill="none" stroke="#e7c476" stroke-opacity=".35" stroke-width="1"/>
    <g class="wings" fill="#efe6cf" stroke="#1c140f" stroke-width="1.2" stroke-linejoin="round">
      <path d="M49 47 C 40 34, 27 30, 22 35 C 19 42, 27 52, 48 53 Z"/>
      <path d="M51 47 C 60 34, 73 30, 78 35 C 81 42, 73 52, 52 53 Z"/>
      <path d="M48.5 53 C 36 55, 30 63, 34 69 C 39 72, 46 64, 49 57 Z"/>
      <path d="M51.5 53 C 64 55, 70 63, 66 69 C 61 72, 54 64, 51 57 Z"/>
    </g>
    <ellipse cx="50" cy="53" rx="2.6" ry="10" fill="#d9ccaa" stroke="#1c140f" stroke-width="1"/>
    <path d="M49 44 C 46 38, 42 35, 39 34 M51 44 C 54 38, 58 35, 61 34" fill="none" stroke="#efe6cf" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;
  const MUTE_ICON = `<svg viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="#efe6cf" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 16 H12 L19 10 V30 L12 24 H7 Z" fill="#efe6cf" fill-opacity=".15"/>
    <g class="waves"><path d="M24 15 C 26.5 17.5, 26.5 22.5, 24 25"/><path d="M28 11.5 C 32.5 16, 32.5 24, 28 28.5"/></g>
    <g class="cross"><path d="M25 16 L33 24 M33 16 L25 24"/></g>
  </svg>`;
  const MAG_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="#e7c476" stroke-width="1.8" stroke-linecap="round"><circle cx="8.5" cy="8.5" r="5"/><path d="M12.3 12.3 L17 17"/></svg>';

  // luna moth emblem (0 0 200 200, body axis x=100)
  function lunaWing() {
    return `
      <path d="M101 88 C 116 70, 146 48, 178 44 C 184 52, 177 70, 165 86 C 150 103, 126 106, 103 100 Z" fill="url(#lunaFore)" stroke="#2c3a2e" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M101 88 C 116 70, 146 48, 178 44" fill="none" stroke="#8a5a64" stroke-width="3.2" stroke-linecap="round" opacity=".85"/>
      <path d="M108 92 C 124 84, 146 70, 166 58" fill="none" stroke="#5f8f6c" stroke-width=".9" opacity=".5"/>
      <path d="M110 97 C 128 94, 148 88, 164 80" fill="none" stroke="#5f8f6c" stroke-width=".9" opacity=".4"/>
      <ellipse cx="142" cy="80" rx="6" ry="7.5" fill="#e9e0c4" stroke="#8a5a64" stroke-width="1.6"/>
      <ellipse cx="142" cy="80" rx="2.2" ry="3.2" fill="#6b4a3c"/>
      <path d="M103 102 C 124 104, 149 110, 151 128 C 152 142, 139 150, 129 158 C 121 166, 118 182, 123 198 C 126 206, 121 212, 115 207 C 110 197, 109 178, 107 160 C 105 140, 103 122, 103 102 Z" fill="url(#lunaHind)" stroke="#2c3a2e" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M121 204 C 117 196, 115 186, 115 176" fill="none" stroke="#c9a060" stroke-width="2" stroke-linecap="round" opacity=".55"/>
      <ellipse cx="130" cy="131" rx="5.5" ry="6.5" fill="#e9e0c4" stroke="#8a5a64" stroke-width="1.5"/>
      <ellipse cx="130" cy="131" rx="2" ry="2.8" fill="#6b4a3c"/>`;
  }
  const EMBLEM = `<svg viewBox="0 0 200 215" aria-hidden="true">
    <defs>
      <linearGradient id="lunaFore" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3f3dc"/><stop offset=".6" stop-color="#b9e0bf"/><stop offset="1" stop-color="#8fc6a0"/></linearGradient>
      <linearGradient id="lunaHind" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4ecd0"/><stop offset=".5" stop-color="#a8d8b0"/><stop offset="1" stop-color="#6fae8a"/></linearGradient>
      <radialGradient id="lunaBody" cx=".4" cy=".35"><stop offset="0" stop-color="#fbf6e6"/><stop offset="1" stop-color="#cfc3a2"/></radialGradient>
    </defs>
    <g class="wl"><g transform="translate(200 0) scale(-1 1)">${lunaWing()}</g></g>
    <g class="wr">${lunaWing()}</g>
    <path d="M98 80 C 94 68, 88 58, 80 52" fill="none" stroke="#d9cfae" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M102 80 C 106 68, 112 58, 120 52" fill="none" stroke="#d9cfae" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M97 76 C 91 66, 84 58, 78 54 C 86 57, 93 64, 97 76 Z M103 76 C 109 66, 116 58, 122 54 C 114 57, 107 64, 103 76 Z" fill="#e9dfbf" opacity=".55"/>
    <ellipse cx="100" cy="106" rx="6.5" ry="24" fill="url(#lunaBody)" stroke="#3a3326" stroke-width="1.2"/>
    <circle cx="100" cy="82" r="6" fill="url(#lunaBody)" stroke="#3a3326" stroke-width="1.2"/>
    <path d="M95 96 H105 M94.5 104 H105.5 M95 112 H105 M96 120 H104" stroke="#b6a987" stroke-width=".9"/>
  </svg>`;
  const RULE = '<svg viewBox="0 0 320 14" preserveAspectRatio="none" aria-hidden="true"><path d="M0 7 H136 M184 7 H320" stroke="#e7c476" stroke-width="1" opacity=".6"/><path d="M160 1 L166 7 L160 13 L154 7 Z" fill="none" stroke="#e7c476" stroke-width="1"/><circle cx="143" cy="7" r="1.4" fill="#e7c476"/><circle cx="177" cy="7" r="1.4" fill="#e7c476"/></svg>';
  const GRAIN = 'url("data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>') + '")';

  // ---------------------------------------------------------------- cursors
  function injectCursors() {
    const c = (svg, x, y, fb) => `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' + svg + '</svg>')}") ${x} ${y}, ${fb}`;
    const st = 'fill="#efe6cf" stroke="#1c140f" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"';
    const arrow = c(`<path d="M4 3 L4 23 L9.2 18.4 L12.6 26.4 L16 25 L12.7 17.2 L19.6 17 Z" ${st}/>`, 4, 3, 'default');
    const look = c(`<circle cx="13" cy="13" r="8.2" fill="#efe6cf" fill-opacity=".18" stroke="#1c140f" stroke-width="4"/><circle cx="13" cy="13" r="8.2" fill="none" stroke="#efe6cf" stroke-width="2"/><path d="M19 19 L27.5 27.5" stroke="#1c140f" stroke-width="5.2" stroke-linecap="round"/><path d="M19 19 L27.5 27.5" stroke="#efe6cf" stroke-width="2.6" stroke-linecap="round"/>`, 13, 13, 'zoom-in');
    const point = c(`<path d="M10 28 L5.5 20.5 C4.8 19.4 5.2 18 6.3 17.5 C7.3 17 8.3 17.4 9 18.3 L10 19.6 V5 C10 4 10.8 3.2 11.8 3.2 C12.8 3.2 13.6 4 13.6 5 V14 V12 C13.6 11 14.4 10.2 15.4 10.2 C16.4 10.2 17.2 11 17.2 12 V14.5 V13 C17.2 12 18 11.2 19 11.2 C20 11.2 20.8 12 20.8 13 V15 V14 C20.8 13 21.6 12.2 22.6 12.2 C23.6 12.2 24.4 13 24.4 14 V19 C24.4 24 21.5 28 17 28 Z" ${st}/>`, 12, 3, 'pointer');
    const grab = c(`<path d="M10 28 L5.5 20.5 C4.8 19.4 5.2 18 6.3 17.5 C7.3 17 8.3 17.4 9 18.3 L10 19.6 V8 C10 7 10.8 6.2 11.8 6.2 C12.8 6.2 13.6 7 13.6 8 V14 V5.5 C13.6 4.5 14.4 3.7 15.4 3.7 C16.4 3.7 17.2 4.5 17.2 5.5 V14 V6.5 C17.2 5.5 18 4.7 19 4.7 C20 4.7 20.8 5.5 20.8 6.5 V14.5 V9 C20.8 8 21.6 7.2 22.6 7.2 C23.6 7.2 24.4 8 24.4 9 V19 C24.4 24 21.5 28 17 28 Z" ${st}/>`, 15, 12, 'grab');
    const go = c(`<path d="M16 3 L25 13 H19.5 V27 H12.5 V13 H7 Z" ${st}/>`, 16, 4, 'pointer');
    const css = `
      #stage-wrap { cursor: ${arrow}; }
      #stage .cur-look, #stage .cur-look * { cursor: ${look}; }
      #stage .cur-use, #stage .cur-use * { cursor: ${point}; }
      #stage .cur-take, #stage .cur-take * { cursor: ${grab}; }
      #stage .cur-go, #stage .cur-go * { cursor: ${go}; }
      #overlay button, #overlay [role="button"] { cursor: ${point}; }
      body.busy #stage-wrap, body.busy #stage-wrap #stage * { cursor: ${arrow}; }
    `;
    h('style', { id: 'ui-cursors' }, null, document.head).textContent = css;
  }

  // ---------------------------------------------------------------- ambient canvas (rain + drifting moths)
  function Ambient(canvas, mode) {
    const ctx = canvas.getContext('2d');
    let raf = 0, W = 0, H = 0, u = 1, dpr = 1, last = 0, moths = [], drops = [], running = false;
    const R = (a, b) => a + Math.random() * (b - a);
    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height); u = W / 1600;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    function newMoth(init) {
      const end = mode === 'end';
      return {
        x: R(0, 1600), y: init ? R(0, 900) : (end ? 940 : R(0, 900)),
        s: R(.55, 1.2), ph: R(0, 6.28), fr: R(5, 8), a: R(.25, .6),
        ang: R(0, 6.28), sp: end ? R(22, 46) : R(14, 30), turn: R(-.4, .4),
        tint: Math.random() < (end ? .35 : .2) ? 'l' : 'p',
      };
    }
    function newDrop(init) {
      return { x: R(-100, 1700), y: init ? R(-100, 900) : R(-160, -20), len: R(18, 46), sp: R(950, 1350), a: R(.05, .16), w: R(.6, 1.2) };
    }
    function seed() {
      moths = Array.from({ length: mode === 'end' ? 12 : 9 }, () => newMoth(true));
      drops = mode === 'title' ? Array.from({ length: 130 }, () => newDrop(true)) : [];
    }
    function drawMoth(m, t) {
      const flap = .25 + .75 * Math.abs(Math.sin(t * m.fr + m.ph));
      const sz = 13 * m.s * u;
      ctx.save();
      ctx.translate(m.x * u, m.y * u);
      ctx.rotate(m.heading + Math.PI / 2);
      ctx.globalAlpha = m.a;
      ctx.shadowColor = m.tint === 'l' ? 'rgba(170,230,190,.8)' : 'rgba(240,228,196,.7)';
      ctx.shadowBlur = 10 * u * m.s;
      ctx.fillStyle = m.tint === 'l' ? '#bfe6c6' : '#ece3c8';
      for (const side of [-1, 1]) {
        ctx.save(); ctx.scale(side * flap, 1);
        // forewing: a swept triangle; hindwing: rounded lobe
        ctx.beginPath(); ctx.moveTo(sz * .05, -sz * .3);
        ctx.bezierCurveTo(sz * .5, -sz * .75, sz * 1.1, -sz * .7, sz * 1.15, -sz * .45);
        ctx.bezierCurveTo(sz * 1.05, -sz * .05, sz * .5, sz * .15, sz * .05, sz * .08); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sz * .05, sz * .05);
        ctx.bezierCurveTo(sz * .6, sz * .1, sz * .8, sz * .45, sz * .55, sz * .7);
        ctx.bezierCurveTo(sz * .35, sz * .85, sz * .12, sz * .5, sz * .04, sz * .3); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = m.a * .9; ctx.fillStyle = '#d8ccaa';
      ctx.beginPath(); ctx.ellipse(0, sz * .1, sz * .09, sz * .42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      const t = now / 1000, slow = reduced() ? .35 : 1;
      if (canvas.width !== Math.round(canvas.getBoundingClientRect().width * dpr)) resize();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // rain
      if (drops.length) {
        ctx.lineCap = 'round';
        for (const d of drops) {
          d.y += d.sp * dt * slow; d.x += d.sp * .12 * dt * slow;
          if (d.y > 940) Object.assign(d, newDrop(false));
          ctx.strokeStyle = `rgba(170,196,210,${d.a})`; ctx.lineWidth = d.w * u;
          ctx.beginPath(); ctx.moveTo(d.x * u, d.y * u); ctx.lineTo((d.x - d.len * .12) * u, (d.y - d.len) * u); ctx.stroke();
        }
      }
      // moths
      for (const m of moths) {
        if (mode === 'end') {
          m.ang = -Math.PI / 2 + Math.sin(t * .5 + m.ph) * .8;
        } else {
          m.turn += R(-.6, .6) * dt; m.turn = Math.max(-.7, Math.min(.7, m.turn));
          m.ang += m.turn * dt;
          // keep them loosely around the emblem light
          const dx = 800 - m.x, dy = 260 - m.y, want = Math.atan2(dy, dx);
          const diff = Math.atan2(Math.sin(want - m.ang), Math.cos(want - m.ang));
          m.ang += diff * dt * .12;
        }
        const sp = m.sp * slow * (.75 + .25 * Math.sin(t * 1.3 + m.ph));
        m.x += Math.cos(m.ang) * sp * dt; m.y += Math.sin(m.ang) * sp * dt;
        m.heading = m.ang;
        if (m.x < -60 || m.x > 1660 || m.y < -60 || m.y > 960) {
          Object.assign(m, newMoth(false));
          if (mode !== 'end') { const e = Math.floor(R(0, 4)); m.x = e === 0 ? -40 : e === 1 ? 1640 : R(0, 1600); m.y = e === 2 ? -40 : e === 3 ? 940 : R(0, 900); m.ang = Math.atan2(450 - m.y, 800 - m.x); }
        }
        drawMoth(m, t);
      }
    }
    return {
      start() { if (running) return; running = true; resize(); if (!moths.length) seed(); last = 0; raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
    };
  }

  // ---------------------------------------------------------------- build HUD
  function buildHUD() {
    h('div', { id: 'ui-vignette', class: 'ui-passive', 'aria-hidden': 'true' }, null, overlay);

    E.left = h('button', { class: 'ui-arrow left ui-hud', 'aria-label': 'Turn left', title: '' }, CHEV_L, overlay);
    E.right = h('button', { class: 'ui-arrow right ui-hud', 'aria-label': 'Turn right' }, CHEV_R, overlay);
    E.back = h('button', { class: 'ui-back ui-hud', 'aria-label': 'Step back' }, CHEV_D, overlay);
    E.left.addEventListener('click', () => nav('left'));
    E.right.addEventListener('click', () => nav('right'));
    E.back.addEventListener('click', () => nav('back'));

    E.caption = h('div', { id: 'ui-caption', class: 'ui-hud', role: 'status', 'aria-live': 'polite' }, '<span></span>', overlay);

    // inventory
    E.inv = h('div', { id: 'ui-inv', class: 'ui-hud', 'aria-hidden': 'true' }, null, overlay); // walnut frame strip (decor)
    const col = E.slotCol = h('div', { class: 'ui-slots ui-hud', role: 'toolbar', 'aria-label': 'Inventory' }, null, overlay);
    E.slots = [];
    for (let i = 0; i < SLOTS; i++) {
      const s = h('div', { class: 'ui-slot', role: 'button', tabindex: '-1', 'aria-label': 'Empty slot', 'aria-pressed': 'false' }, '<div class="ico"></div>', col);
      const mag = h('button', { class: 'ui-mag', 'aria-label': 'Examine', tabindex: '-1' }, MAG_ICON, s);
      mag.addEventListener('click', ev => { ev.stopPropagation(); inspect(s.dataset.item); });
      s.addEventListener('click', () => slotClick(s));
      s.addEventListener('dblclick', ev => { ev.preventDefault(); inspect(s.dataset.item); });
      s.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); slotClick(s); }
        else if (ev.key.toLowerCase() === 'e' || ev.key === 'i') inspect(s.dataset.item);
      });
      s.addEventListener('mouseenter', () => showLabel(s.dataset.item, s));
      s.addEventListener('mouseleave', () => hideLabel(700));
      s.addEventListener('focus', () => showLabel(s.dataset.item, s));
      s.addEventListener('blur', () => hideLabel(0));
      E.slots.push(s);
    }
    E.label = h('div', { id: 'ui-label', class: 'ui-hud', 'aria-hidden': 'true' }, '<div class="n"></div><div class="d"></div>', overlay);

    E.hintBtn = h('button', { id: 'ui-hint-btn', class: 'ui-hintbtn ui-hud', 'aria-label': 'Hint', 'aria-expanded': 'false', 'aria-controls': 'ui-hint' }, HINT_ICON, overlay);
    E.hintBtn.addEventListener('click', () => (S.panel ? closeHint() : openHint()));
    E.mute = h('button', { id: 'ui-mute', class: 'ui-mute ui-hud', 'aria-label': 'Mute sound', 'aria-pressed': 'false' }, MUTE_ICON, overlay);
    E.mute.addEventListener('click', () => setMuted(!S.muted));

    E.scrim = h('div', { id: 'ui-scrim', class: 'ui-hud', 'aria-hidden': 'true' }, null, overlay);
    E.scrim.addEventListener('click', closeHint);
    E.hint = h('div', { id: 'ui-hint', class: 'ui-hud', role: 'dialog', 'aria-label': 'Hint', 'aria-hidden': 'true' },
      '<div class="hp-head"><span>From the margins</span><span class="hp-pips"></span></div><div class="hp-text"></div><div class="hp-actions"></div>', overlay);
    const x = h('button', { class: 'hp-close', 'aria-label': 'Close hint' }, '&times;', E.hint);
    x.addEventListener('click', closeHint);

    E.held = h('div', { id: 'ui-held', class: 'ui-passive', 'aria-hidden': 'true' }, null, overlay);
  }

  // ---------------------------------------------------------------- navigation / HUD state
  function canAct() { return !S.title && !S.ending && !G.isBusy(); }
  function nav(which) {
    if (!canAct()) return;
    const v = G.views[G.view()] || {};
    if (which === 'left' && v.wall) G.turn(-1);
    else if (which === 'right' && v.wall) G.turn(1);
    else if (which === 'back' && v.parent) G.back();
  }
  function updateHUD() {
    const v = G.views[G.view()] || {};
    E.left.classList.toggle('on', !!v.wall);
    E.right.classList.toggle('on', !!v.wall);
    E.back.classList.toggle('on', !!v.parent);
    [E.left, E.right, E.back].forEach(b => { b.tabIndex = b.classList.contains('on') ? 0 : -1; });
  }

  // ---------------------------------------------------------------- inventory
  function renderInv(force) {
    const inv = (G.state.inv || []).filter(id => item(id));
    const sig = inv.join(',');
    if (!force && sig === S.lastSig) { markSel(); return; }
    S.lastSig = sig;
    E.slots.forEach((s, i) => {
      const id = inv[i] && item(inv[i]) ? inv[i] : undefined; // unregistered ids are not shown
      s.classList.remove('arriving', 'leaving');
      if (s.dataset.item !== (id || '')) {
        s.dataset.item = id || '';
        s.querySelector('.ico').innerHTML = id ? iconSvg(id) : '';
      }
      const it = id && item(id);
      s.classList.toggle('filled', !!id);
      s.classList.toggle('inspectable', !!(it && typeof it.inspect === 'function'));
      s.setAttribute('aria-label', id ? itemName(id) : 'Empty slot');
      s.tabIndex = id ? 0 : -1;
      s.querySelector('.ui-mag').tabIndex = -1;
    });
    markSel();
  }
  function markSel() {
    const sel = G.selected();
    E.slots.forEach(s => {
      const on = !!sel && s.dataset.item === sel;
      s.classList.toggle('sel', on);
      s.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function slotFor(id) { return E.slots.find(s => s.dataset.item === id); }
  function slotClick(s) {
    const id = s.dataset.item;
    if (!id || !canAct()) return;
    G.sfx('click');
    G.select(G.selected() === id ? null : id);
  }
  function inspect(id) {
    const it = id && item(id);
    if (!it || typeof it.inspect !== 'function' || !canAct()) return;
    G.select(null);
    hideLabel(0);
    safe(() => it.inspect());
  }
  function showLabel(id, slot, autohide) {
    clearTimeout(S.labelTimer);
    if (!id || S.title || S.ending) { hideLabel(0); return; }
    const it = item(id) || {};
    E.label.querySelector('.n').textContent = it.name || id;
    E.label.querySelector('.d').textContent = it.desc || '';
    const wr = stageRect(), r = slot.getBoundingClientRect();
    E.label.style.top = ((r.top + r.height / 2 - wr.top) / wr.height * 100) + '%';
    E.label.classList.add('show');
    if (autohide) S.labelTimer = setTimeout(() => E.label.classList.remove('show'), autohide);
  }
  function hideLabel(delay) {
    clearTimeout(S.labelTimer);
    S.labelTimer = setTimeout(() => {
      const sel = G.selected(), hov = E.slots.find(s => s.matches(':hover') && s.dataset.item);
      if (hov) return;
      E.label.classList.remove('show');
      void sel;
    }, delay || 0);
  }

  function onSelect(id) {
    markSel();
    if (id) {
      E.held.innerHTML = iconSvg(id);
      const s = slotFor(id);
      if (S.px == null && s) { const wr = stageRect(), r = s.getBoundingClientRect(); moveHeld(r.left - wr.left - r.width * .7, r.top - wr.top + r.height / 2); }
      if (!G.isBusy()) E.held.classList.add('on');
      if (s) showLabel(id, s, 2600);
    } else {
      E.held.classList.remove('on', 'over');
      S.over = false;
    }
  }
  function moveHeld(x, y) { S.px = x; S.py = y; E.held.style.transform = `translate(${x}px, ${y}px)`; }

  function onGive(id, fromEl) {
    renderInv(true);
    const slot = slotFor(id);
    if (!slot) return;
    const wr = stageRect();
    const target = slot.querySelector('.ico').getBoundingClientRect();
    let r0 = null;
    try { if (fromEl && fromEl.getBoundingClientRect) { const r = fromEl.getBoundingClientRect(); if (r.width > 1 && r.height > 1) r0 = r; } } catch (e) { }
    const u = wr.width / 1600;
    const size0 = r0 ? Math.max(target.width, Math.min(Math.max(r0.width, r0.height), 190 * u)) : 150 * u;
    const cx0 = r0 ? r0.left + r0.width / 2 - wr.left : wr.width * .5;
    const cy0 = r0 ? r0.top + r0.height / 2 - wr.top : wr.height * .46;
    const cx1 = target.left + target.width / 2 - wr.left, cy1 = target.top + target.height / 2 - wr.top;
    const sz1 = target.width;
    if (reduced() || !overlay.animate || document.hidden) { slot.classList.add('glow'); setTimeout(() => slot.classList.remove('glow'), 1700); return; }
    slot.classList.add('arriving');
    const fly = h('div', { class: 'ui-fly', 'aria-hidden': 'true' }, iconSvg(id), overlay);
    fly.style.width = fly.style.height = size0 + 'px';
    const tf = (x, y, s) => `translate(${x - size0 / 2}px, ${y - size0 / 2}px) scale(${s})`;
    const k = sz1 / size0;
    const midX = cx0 + (cx1 - cx0) * .45, midY = Math.min(cy0, cy1) - 60 * u;
    const anim = fly.animate([
      { transform: tf(cx0, cy0, .9), opacity: 0 },
      { transform: tf(cx0, cy0 - 14 * u, 1.05), opacity: 1, offset: .22 },
      { transform: tf(midX, midY, (1.05 + k) / 2), opacity: 1, offset: .6 },
      { transform: tf(cx1, cy1, k), opacity: 1 },
    ], { duration: 1150, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' });
    const done = () => {
      fly.remove();
      slot.classList.remove('arriving');
      slot.classList.add('glow');
      setTimeout(() => slot.classList.remove('glow'), 1700);
    };
    anim.onfinish = done; anim.oncancel = done;
    setTimeout(() => { if (fly.isConnected) done(); }, 2500);
  }
  function onTake(id) {
    if (!G.selected() || G.selected() === id) { E.held.classList.remove('on', 'over'); S.over = false; }
    const slot = E.slots.find(s => s.dataset.item === id);
    if (!slot) { renderInv(true); return; }
    slot.classList.add('leaving');
    setTimeout(() => renderInv(true), reduced() ? 100 : 480);
  }

  // ---------------------------------------------------------------- captions
  function say(text, opts) {
    opts = opts || {};
    const span = E.caption.querySelector('span');
    clearTimeout(S.capTimer);
    const dur = opts.dur || Math.max(3500, Math.min(9000, 1600 + String(text).length * 42));
    const put = () => {
      span.textContent = text;
      E.caption.classList.add('show');
      S.capTimer = setTimeout(hideCaption, dur);
    };
    if (E.caption.classList.contains('show')) {
      E.caption.classList.remove('show');
      S.capTimer = setTimeout(put, 260);
    } else put();
  }
  function hideCaption() { clearTimeout(S.capTimer); E.caption.classList.remove('show'); }

  // ---------------------------------------------------------------- hints
  function openHint() {
    if (S.title || S.ending) return;
    S.panel = true;
    G.sfx('hint');
    E.hint.classList.add('open');
    E.hint.setAttribute('aria-hidden', 'false');
    E.scrim.classList.add('on');
    E.hintBtn.setAttribute('aria-expanded', 'true');
    showCurrentHint(true);
  }
  function closeHint() {
    if (!S.panel) return;
    S.panel = false;
    E.hint.classList.remove('open');
    E.hint.setAttribute('aria-hidden', 'true');
    E.scrim.classList.remove('on');
    E.hintBtn.setAttribute('aria-expanded', 'false');
    if (document.activeElement && E.hint.contains(document.activeElement)) E.hintBtn.focus();
  }
  function showCurrentHint(instant) {
    const hc = safe(() => G.currentHint());
    if (!hc || !hc.lines || !hc.lines.length) { renderHint({ text: NO_HINT, level: -1, max: -1, none: true }, instant); return; }
    const lvl = (G.state.hint || {})[hc.id] || 0;
    let shown;
    if (lvl === 0) shown = G.nextHint();
    else {
      const max = hc.lines.length - 1, i = Math.min(lvl - 1, max);
      shown = { id: hc.id, level: i, max, text: hc.lines[i], isAnswer: i === max };
    }
    renderHint(shown, instant);
  }
  function renderHint(s, instant, confirm) {
    const txt = E.hint.querySelector('.hp-text'), act = E.hint.querySelector('.hp-actions'), pips = E.hint.querySelector('.hp-pips');
    const paint = () => {
      pips.innerHTML = '';
      if (!s.none) for (let i = 0; i <= s.max; i++) h('i', { class: i <= s.level ? 'on' : '' }, null, pips);
      txt.textContent = confirm ? 'The next note gives the answer away entirely. Are you certain?' : s.text;
      txt.classList.toggle('answer', !!s.isAnswer && !confirm);
      act.innerHTML = '';
      const btn = (label, fn, aria) => { const b = h('button', { 'aria-label': aria || label }, null, act); h('span', { text: label }, null, b); b.addEventListener('click', fn); return b; };
      let first = null;
      if (confirm) {
        btn('Not yet', () => renderHint(s));
        first = btn('Show me', () => { G.sfx('paper'); renderHint(G.nextHint()); });
      } else if (!s.none && !s.isAnswer) {
        if (s.level + 1 >= s.max) first = btn('Reveal the answer?', () => renderHint(s, false, true));
        else first = btn('A little more help?', () => { G.sfx('paper'); renderHint(G.nextHint()); });
      }
      if (first && S.panel && document.activeElement && E.hint.contains(document.activeElement)) first.focus();
      txt.classList.remove('fading');
    };
    if (instant) paint();
    else { txt.classList.add('fading'); setTimeout(paint, 260); }
  }

  // ---------------------------------------------------------------- sound
  function setMuted(m) {
    S.muted = !!m;
    try { localStorage.setItem(MUTE_KEY, S.muted ? '1' : '0'); } catch (e) { }
    safe(() => window.Audio2 && Audio2.setMuted && Audio2.setMuted(S.muted));
    E.mute.classList.toggle('muted', S.muted);
    E.mute.setAttribute('aria-pressed', S.muted ? 'true' : 'false');
    E.mute.setAttribute('aria-label', S.muted ? 'Unmute sound' : 'Mute sound');
  }

  // ---------------------------------------------------------------- timing
  function elapsed() { return S.carry + (S.t0 ? Date.now() - S.t0 : 0); }
  function persistTime() { if (G.debugMode || !S.t0 || S.ending) return; try { localStorage.setItem(TIME_KEY, String(elapsed())); } catch (e) { } }
  function onStart(cont) {
    S.t0 = Date.now();
    S.carry = 0;
    if (cont) { try { S.carry = +localStorage.getItem(TIME_KEY) || 0; } catch (e) { } }
    S.hintEvents = 0;
    renderInv(true);
    updateHUD();
  }
  function fmtTime(ms) {
    const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60;
    if (m >= 60) return `${Math.floor(m / 60)} h ${m % 60} min`;
    if (m === 0) return s === 1 ? '1 second' : `${s} seconds`;
    return `${m} min ${String(s).padStart(2, '0')} s`;
  }

  // ---------------------------------------------------------------- title
  function buildTitle() {
    const t = E.title = h('div', { id: 'ui-title', role: 'dialog', 'aria-label': 'The Moth Keeper' }, null, overlay);
    const cv = h('canvas', { 'aria-hidden': 'true' }, null, t);
    const st = h('div', { class: 't-stack' }, null, t);
    h('div', { class: 't-emblem-wrap rv', 'aria-hidden': 'true' }, '<div class="t-halo"></div><div class="t-emblem">' + EMBLEM + '</div>', st);
    h('h1', { class: 't-name rv d1' }, '<span class="the">The</span>Moth Keeper', st);
    h('div', { class: 't-rule rv d2', 'aria-hidden': 'true' }, RULE, st);
    h('p', { class: 't-sub rv d2' }, 'an attic, a lamp, a letter unread', st);
    const b = h('div', { class: 't-buttons rv d3' }, null, st);
    E.begin = h('button', { class: 't-btn', 'aria-label': 'Begin a new game', text: 'Begin' }, null, b);
    E.cont = h('button', { class: 't-btn secondary', 'aria-label': 'Continue saved game', text: 'Continue' }, null, b);
    h('div', { class: 't-foot rv d4', 'aria-hidden': 'true', text: 'best played with sound, in a dark room' }, null, t);
    const gr = h('div', { class: 'ui-grain anim', 'aria-hidden': 'true' }, null, t); gr.style.backgroundImage = GRAIN;
    h('div', { class: 'ui-vig', 'aria-hidden': 'true' }, null, t);
    E.titleAmb = Ambient(cv, 'title');
    E.begin.addEventListener('click', () => begin(false));
    E.cont.addEventListener('click', () => begin(true));
  }
  function showTitle() {
    if (!E.title) return;
    S.title = true;
    document.body.classList.add('title-open');
    E.cont.style.display = safe(() => G.hasSave()) ? '' : 'none';
    E.title.classList.remove('leaving', 'ready');
    E.title.classList.add('show');
    E.titleAmb.start();
    requestAnimationFrame(() => requestAnimationFrame(() => E.title.classList.add('ready')));
    updateHUD();
  }
  function begin(cont) {
    if (S.starting || !S.title) return;
    S.starting = true;
    safe(() => window.Audio2 && Audio2.unlock && Audio2.unlock());
    safe(() => window.Audio2 && Audio2.setMuted && Audio2.setMuted(S.muted));
    G.sfx('click');
    G.start({ continue: !!cont });
    hideTitle(false);
    if (!cont) setTimeout(() => G.say(OPENING, { dur: 7000 }), 1900);
  }
  function hideTitle(instant) {
    S.title = false;
    S.starting = false;
    document.body.classList.remove('title-open');
    updateHUD();
    if (!E.title) return;
    if (instant) {
      E.title.classList.remove('show', 'leaving', 'ready');
      E.titleAmb.stop();
      return;
    }
    E.title.classList.add('leaving');
    setTimeout(() => { E.title.classList.remove('show', 'leaving', 'ready'); E.titleAmb.stop(); }, 1600);
  }

  // ---------------------------------------------------------------- ending
  function showEnding() {
    if (S.ending) return;
    const time = elapsed();
    let hints = 0;
    try { hints = Object.values(G.state.hint || {}).reduce((a, b) => a + (+b || 0), 0); } catch (e) { }
    hints = Math.max(hints, S.hintEvents);
    S.ending = true;
    try { localStorage.removeItem(TIME_KEY); } catch (e) { }
    closeHint(); hideCaption(); hideLabel(0);
    if (G.selected()) G.select(null);
    document.body.classList.add('ending');

    const e = E.ending = h('div', { id: 'ui-ending', role: 'dialog', 'aria-label': 'The end', 'aria-live': 'polite' }, null, overlay);
    const cv = h('canvas', { 'aria-hidden': 'true' }, null, e);
    h('div', { class: 'e-shade-top', 'aria-hidden': 'true' }, null, e);
    h('div', { class: 'e-shade-bot', 'aria-hidden': 'true' }, null, e);
    const top = h('div', { class: 'e-top' }, null, e);
    const l1 = h('p', { class: 'e-line fx', text: 'She never left.' }, null, top);
    const l2 = h('p', { class: 'e-line l2 fx', text: 'She was only waiting for someone to light the lamp.' }, null, top);
    const meta = h('div', { class: 'e-bot' }, null, e);
    const m1 = h('div', { class: 'e-title fx', text: 'The Moth Keeper' }, null, meta);
    const m2 = h('div', { class: 'e-stats fx', text: `${fmtTime(time)}  ·  ${hints === 0 ? 'no hints' : hints === 1 ? '1 hint' : hints + ' hints'}` }, null, meta);
    const again = h('button', { class: 't-btn e-again fx', text: 'Play again', 'aria-label': 'Play again' }, null, meta);
    again.addEventListener('click', () => { safe(() => G.resetSave()); try { localStorage.removeItem(TIME_KEY); } catch (err) { } location.reload(); });
    E.endAmb = Ambient(cv, 'end');
    requestAnimationFrame(() => requestAnimationFrame(() => { e.classList.add('show'); E.endAmb.start(); }));
    const r = reduced() ? .3 : 1;
    [[l1, 2300], [l2, 4100], [m1, 5600], [m2, 5900], [again, 6300]].forEach(([el, t]) => setTimeout(() => el.classList.add('in'), t * r));
  }

  // ---------------------------------------------------------------- input
  function onKey(ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (S.title || S.ending) return;
    const tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (k === 'Escape') {
      if (S.panel) { closeHint(); ev.preventDefault(); return; }
      if (G.selected()) { G.select(null); ev.preventDefault(); return; }
      if (E.caption.classList.contains('show')) hideCaption();
      nav('back'); ev.preventDefault(); return;
    }
    if (S.panel) return;
    if (k === 'ArrowLeft') { nav('left'); ev.preventDefault(); }
    else if (k === 'ArrowRight') { nav('right'); ev.preventDefault(); }
    else if (k === 'ArrowDown' || k === 'Backspace') { nav('back'); ev.preventDefault(); }
    else if (k === 'h' || k === 'H') { openHint(); }
  }
  function bindInput() {
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('pointermove', ev => {
      if (ev.pointerType === 'touch' && !G.selected()) return;
      const r = stageRect();
      moveHeld(ev.clientX - r.left, ev.clientY - r.top);
      S.inside = true;
      if (G.selected()) {
        const t = ev.target, over = !!(t && t.closest && t.closest('#stage .hot'));
        if (over !== S.over) { S.over = over; E.held.classList.toggle('over', over); }
      }
    }, { passive: true });
    wrap.addEventListener('pointerleave', () => { S.inside = false; E.held.classList.remove('on'); });
    wrap.addEventListener('pointerenter', () => { S.inside = true; if (G.selected() && !G.isBusy()) E.held.classList.add('on'); });
    // any click dismisses the caption (captions are click-through)
    wrap.addEventListener('pointerdown', ev => {
      if (E.caption.classList.contains('show') && !E.hint.contains(ev.target)) hideCaption();
    }, true);
    window.addEventListener('pagehide', persistTime);
    document.addEventListener('visibilitychange', () => { if (document.hidden) persistTime(); });
    setInterval(persistTime, 5000);
  }

  // ---------------------------------------------------------------- init
  function init() {
    overlay = document.getElementById('overlay');
    wrap = document.getElementById('stage-wrap');
    overlay.innerHTML = '';
    injectCursors();
    buildHUD();
    buildTitle();
    bindInput();
    try { S.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { }
    setMuted(S.muted);

    G.on('view', () => { updateHUD(); if (S.panel) closeHint(); });
    G.on('give', (id, fromEl) => onGive(id, fromEl));
    G.on('take', id => onTake(id));
    G.on('select', id => onSelect(id));
    G.on('say', (text, opts) => say(text, opts));
    G.on('busy', b => {
      // the held ghost must never float over a use-animation
      if (b) { hideLabel(0); E.held.classList.remove('on', 'over'); S.over = false; }
      else if (G.selected() && S.inside) E.held.classList.add('on');
      updateHUD();
    });
    G.on('start', () => onStart(!!(G.state.flags && Object.keys(G.state.flags).length)));
    G.on('refresh', () => renderInv(false));
    G.on('hint', () => { S.hintEvents++; });
    G.on('finish', () => { document.body.classList.add('finale'); showEnding(); });
    // the finale cutscene: fade the whole HUD out and keep it gone through the ending
    const finaleHud = () => {
      const on = !!G.get('hatched');
      document.body.classList.toggle('finale', on);
      if (on) { closeHint(); hideLabel(0); if (G.selected()) G.select(null); }
    };
    G.on('flag', k => { if (k === 'hatched') finaleHud(); });
    G.on('start', finaleHud);
    renderInv(true);
    updateHUD();
  }

  window.UI = { init, showTitle, hideTitle, say };
})();
