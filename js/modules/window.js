/* THE MOTH KEEPER — window module (west wall round window, 'window' close-up, moonbeams).
 * Owns: wall object on 'west' (window, frame, sky, rain, latch, curtains),
 *       close-up view 'window' (lower window + latch, key -> open sequence),
 *       moonbeam overlays on 'south', 'north', 'west' once windowOpen.
 * Performance: all continuous motion is CSS transform/opacity animation on small groups;
 * no SVG filters are used anywhere inside animated regions. Animations are paused while not visible.
 */
(function () {
  'use strict';

  // ---------- geometry (local units; west view is 1:1) ----------
  const R_GLASS = 198, R_SASH = 214, R_REVEAL = 234, R_MOULD = 254;
  const INK = '#120d09';
  const f = n => (Math.round(n * 100) / 100);

  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  const pt = (r, a) => `${f(r * Math.cos(a))} ${f(r * Math.sin(a))}`;
  function sector(r0, r1, a0, a1) {
    const lg = (a1 - a0) > Math.PI ? 1 : 0;
    return `M${pt(r1, a0)}A${r1} ${r1} 0 ${lg} 1 ${pt(r1, a1)}L${pt(r0, a1)}A${r0} ${r0} 0 ${lg} 0 ${pt(r0, a0)}Z`;
  }
  // ellipse as a sub-path (lets hundreds of static dots live in one <path>)
  function circ(x, y, rx, ry) {
    return `M${f(x - rx)} ${f(y)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
  }
  function ring(r0, r1, cx, cy) {
    cx = cx || 0; cy = cy || 0;
    const c = r => `M${f(cx + r)} ${f(cy)}A${r} ${r} 0 1 1 ${f(cx - r)} ${f(cy)}A${r} ${r} 0 1 1 ${f(cx + r)} ${f(cy)}Z`;
    return c(r1) + c(r0);
  }

  // ---------- CSS (injected once) ----------
  const CSS = `
  .win-paused, .win-paused * { animation-play-state: paused !important; }
  .win-anim { will-change: transform; }
  @keyframes win-fall { from { transform: translate(0px, 0px); } to { transform: translate(var(--dx), var(--dy)); } }
  @keyframes win-cloud { from { transform: translateX(0px); } to { transform: translateX(var(--cw)); } }
  @keyframes win-riv1 {
    0% { transform: translateY(0px); opacity: 0; } 6% { opacity: 1; }
    18% { transform: translateY(calc(var(--d) * .10)); } 34% { transform: translateY(calc(var(--d) * .13)); }
    46% { transform: translateY(calc(var(--d) * .42)); } 64% { transform: translateY(calc(var(--d) * .47)); }
    80% { transform: translateY(calc(var(--d) * .85)); opacity: 1; } 100% { transform: translateY(var(--d)); opacity: 0; } }
  @keyframes win-riv2 {
    0% { transform: translateY(0px); opacity: 0; } 8% { opacity: 1; }
    40% { transform: translateY(calc(var(--d) * .08)); } 52% { transform: translateY(calc(var(--d) * .55)); }
    72% { transform: translateY(calc(var(--d) * .6)); } 90% { opacity: .9; } 100% { transform: translateY(var(--d)); opacity: 0; } }
  @keyframes win-flap { 0%,100% { transform: scaleX(1); } 50% { transform: scaleX(.28); } }
  .win-flap { transform-box: fill-box; transform-origin: center; animation: win-flap .14s linear infinite; }
  @keyframes win-mothA {
    0% { transform: translate(0px,0px); } 18% { transform: translate(calc(var(--k)*34px), calc(var(--k)*-22px)); }
    31% { transform: translate(calc(var(--k)*30px), calc(var(--k)*-18px)); } 47% { transform: translate(calc(var(--k)*-12px), calc(var(--k)*-40px)); }
    66% { transform: translate(calc(var(--k)*-38px), calc(var(--k)*6px)); } 82% { transform: translate(calc(var(--k)*-8px), calc(var(--k)*20px)); }
    100% { transform: translate(0px,0px); } }
  @keyframes win-mothB {
    0% { transform: translate(0px,0px); } 22% { transform: translate(calc(var(--k)*-28px), calc(var(--k)*-14px)); }
    27% { transform: translate(calc(var(--k)*-24px), calc(var(--k)*-10px)); } 50% { transform: translate(calc(var(--k)*18px), calc(var(--k)*-34px)); }
    74% { transform: translate(calc(var(--k)*40px), calc(var(--k)*4px)); } 100% { transform: translate(0px,0px); } }
  @keyframes win-flutter {
    0%,100% { transform: skewX(0deg) scaleX(1); } 22% { transform: skewX(-6deg) scaleX(1.1); }
    47% { transform: skewX(3.5deg) scaleX(.95); } 70% { transform: skewX(-3deg) scaleX(1.06); } }
  .win-curtain { transform-box: fill-box; transform-origin: 50% 0%; }
  .win-open .win-curtain { animation: win-flutter 3.4s ease-in-out infinite; }
  .win-open .win-curtain.win-r { animation-duration: 2.9s; animation-delay: -1.1s; }
  @keyframes win-mote {
    0% { transform: translate(0px,0px); opacity: 0; } 20% { opacity: var(--o); } 80% { opacity: var(--o); }
    100% { transform: translate(var(--dx), var(--dy)); opacity: 0; } }
  .win-beam { transition: opacity 1.6s ease-in-out; }
  @keyframes win-drip { 0% { transform: translate(0px, 0px); opacity: 0; } 15% { opacity: .9; } 85% { opacity: .8; } 100% { transform: translate(var(--dx), var(--dy)); opacity: 0; } }
  @keyframes win-twitch { 0%, 86%, 100% { transform: rotate(0deg); } 89% { transform: rotate(-9deg); } 92% { transform: rotate(-2deg); } 95% { transform: rotate(-7deg); } }
  .win-twitch { transform-box: fill-box; transform-origin: 0% 100%; animation: win-twitch 4.6s ease-in-out infinite; }
  .win-billow { transform-box: fill-box; }
  .win-bl { transform-origin: 0% 0%; } .win-br { transform-origin: 100% 0%; }
  @keyframes win-billowL { 0%,100% { transform: scaleX(1) skewX(0deg); } 30% { transform: scaleX(1.9) skewX(8deg); }
    55% { transform: scaleX(1.3) skewX(2deg); } 78% { transform: scaleX(1.75) skewX(6deg); } }
  @keyframes win-billowR { 0%,100% { transform: scaleX(1) skewX(0deg); } 30% { transform: scaleX(1.9) skewX(-8deg); }
    55% { transform: scaleX(1.3) skewX(-2deg); } 78% { transform: scaleX(1.75) skewX(-6deg); } }
  .win-open .win-bl { animation: win-billowL 3.6s ease-in-out infinite; }
  .win-open .win-br { animation: win-billowR 3.1s ease-in-out -1.3s infinite; }
  @keyframes win-splash { 0% { transform: scale(.15, .15); opacity: 0; } 12% { opacity: .95; } 55% { transform: scale(1, 1); opacity: .5; } 100% { transform: scale(1.25, .7); opacity: 0; } }
  .win-splash { transform-box: fill-box; transform-origin: 50% 100%; animation: win-splash 1.2s ease-out infinite; }
  @keyframes win-rest { 0%,100% { transform: scaleX(1); } 50% { transform: scaleX(.7); } }
  .win-resting .win-flap { animation: win-rest 2.8s ease-in-out infinite; }
  @keyframes win-breathe { 0%,100% { opacity: .85; } 50% { opacity: 1; } }
  `;
  function ensureCss() {
    if (document.getElementById('win-css')) return;
    const s = document.createElement('style');
    s.id = 'win-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ---------- shared gradients (ids prefixed win-) ----------
  const DEFS = `
  <linearGradient id="win-sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#050c13"/><stop offset=".45" stop-color="#10212e"/>
    <stop offset=".8" stop-color="#23394a"/><stop offset="1" stop-color="#2f4757"/>
  </linearGradient>
  <radialGradient id="win-halo"><stop offset="0" stop-color="#d9e8ff" stop-opacity=".55"/>
    <stop offset=".25" stop-color="#9fbde0" stop-opacity=".22"/><stop offset=".6" stop-color="#5f84ad" stop-opacity=".07"/>
    <stop offset="1" stop-color="#5f84ad" stop-opacity="0"/></radialGradient>
  <radialGradient id="win-moonring"><stop offset=".78" stop-color="#cfe3ff" stop-opacity="0"/>
    <stop offset=".86" stop-color="#cfe3ff" stop-opacity=".08"/><stop offset=".9" stop-color="#e7d9c0" stop-opacity=".05"/>
    <stop offset="1" stop-color="#cfe3ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="win-moon" cx=".42" cy=".4" r=".62"><stop offset="0" stop-color="#fbf8ea"/>
    <stop offset=".7" stop-color="#e6e6d4"/><stop offset="1" stop-color="#b9c3c0"/></radialGradient>
  <radialGradient id="win-cloud"><stop offset="0" stop-color="#1a2833" stop-opacity=".7"/>
    <stop offset=".55" stop-color="#1c2c38" stop-opacity=".45"/><stop offset="1" stop-color="#1c2c38" stop-opacity="0"/></radialGradient>
  <radialGradient id="win-cloudlit"><stop offset="0" stop-color="#8fa9c2" stop-opacity=".55"/>
    <stop offset=".6" stop-color="#6d88a3" stop-opacity=".22"/><stop offset="1" stop-color="#6d88a3" stop-opacity="0"/></radialGradient>
  <linearGradient id="win-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46657a" stop-opacity="0"/>
    <stop offset="1" stop-color="#5b7b8e" stop-opacity=".45"/></linearGradient>
  <linearGradient id="win-paint" gradientUnits="userSpaceOnUse" x1="160" y1="-200" x2="-160" y2="200">
    <stop offset="0" stop-color="#3b4b42"/><stop offset=".5" stop-color="#27342e"/><stop offset="1" stop-color="#172019"/></linearGradient>
  <linearGradient id="win-mould" gradientUnits="userSpaceOnUse" x1="0" y1="-260" x2="0" y2="260">
    <stop offset="0" stop-color="#6e4629"/><stop offset=".45" stop-color="#4f311e"/><stop offset="1" stop-color="#2a1a10"/></linearGradient>
  <linearGradient id="win-mould2" gradientUnits="userSpaceOnUse" x1="-200" y1="-200" x2="200" y2="200">
    <stop offset="0" stop-color="#8c5d38"/><stop offset=".5" stop-color="#5c3a23"/><stop offset="1" stop-color="#2e1d12"/></linearGradient>
  <radialGradient id="win-wallshadow"><stop offset=".78" stop-color="#000" stop-opacity=".55"/>
    <stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="win-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d995"/>
    <stop offset=".35" stop-color="#c9983f"/><stop offset=".75" stop-color="#8a6224"/><stop offset="1" stop-color="#5a3e14"/></linearGradient>
  <linearGradient id="win-sashsheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bcd6ee" stop-opacity=".16"/>
    <stop offset=".45" stop-color="#9fc4d8" stop-opacity=".05"/><stop offset=".6" stop-color="#dcebff" stop-opacity=".14"/>
    <stop offset="1" stop-color="#9fc4d8" stop-opacity=".03"/></linearGradient>
  <linearGradient id="win-sashside" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3ff" stop-opacity=".25"/>
    <stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
  <linearGradient id="win-keyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dc96"/>
    <stop offset=".4" stop-color="#d0a24a"/><stop offset=".75" stop-color="#9a6c28"/><stop offset="1" stop-color="#5a3c12"/></linearGradient>
  <linearGradient id="win-brass2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7c476"/>
    <stop offset=".5" stop-color="#a97c32"/><stop offset="1" stop-color="#5e4216"/></linearGradient>
  <linearGradient id="win-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset=".3" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".42" stop-color="#e6f0ff" stop-opacity=".09"/><stop offset=".5" stop-color="#fff" stop-opacity=".02"/>
    <stop offset=".56" stop-color="#e6f0ff" stop-opacity=".06"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <radialGradient id="win-lampref" cx=".2" cy=".75" r=".7"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".2"/>
    <stop offset=".5" stop-color="#e0853a" stop-opacity=".06"/><stop offset="1" stop-color="#e0853a" stop-opacity="0"/></radialGradient>
  <radialGradient id="win-flame"><stop offset="0" stop-color="#fff1c1" stop-opacity=".75"/>
    <stop offset=".3" stop-color="#ffcf7a" stop-opacity=".3"/><stop offset="1" stop-color="#e0853a" stop-opacity="0"/></radialGradient>
  <linearGradient id="win-lace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcd5c2" stop-opacity=".30"/>
    <stop offset=".6" stop-color="#cfd6d8" stop-opacity=".22"/><stop offset="1" stop-color="#bfc9cc" stop-opacity=".30"/></linearGradient>
  <linearGradient id="win-beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe3ff" stop-opacity=".0"/>
    <stop offset=".25" stop-color="#cfe3ff" stop-opacity=".9"/><stop offset="1" stop-color="#b8d2f2" stop-opacity=".55"/></linearGradient>
  <linearGradient id="win-beamdown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3ff" stop-opacity=".9"/>
    <stop offset="1" stop-color="#8fb3d9" stop-opacity=".15"/></linearGradient>
  <radialGradient id="win-pool"><stop offset="0" stop-color="#dcebff" stop-opacity=".85"/>
    <stop offset=".5" stop-color="#a9c6e8" stop-opacity=".35"/><stop offset="1" stop-color="#8fb3d9" stop-opacity="0"/></radialGradient>
  <radialGradient id="win-vign" cx=".5" cy=".42" r=".75"><stop offset=".45" stop-color="#03070a" stop-opacity="0"/>
    <stop offset="1" stop-color="#03070a" stop-opacity=".82"/></radialGradient>
  <linearGradient id="win-sill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4429"/>
    <stop offset="1" stop-color="#3a2418"/></linearGradient>
  <linearGradient id="win-trail" gradientUnits="userSpaceOnUse" x1="0" y1="-1" x2="0" y2="0">
    <stop offset="0" stop-color="#cfe0ee" stop-opacity="0"/><stop offset="1" stop-color="#cfe0ee" stop-opacity=".35"/></linearGradient>
  <pattern id="win-damask" width="120" height="150" patternUnits="userSpaceOnUse">
    <rect width="120" height="150" fill="#3a4738"/>
    <g fill="#465443" opacity=".75">
      <path d="M60 18c10 14 22 20 22 38s-12 28-22 40c-10-12-22-22-22-40s12-24 22-38z"/>
      <path d="M60 56c4 6 9 8 9 15s-5 11-9 16c-4-5-9-9-9-16s5-9 9-15z" fill="#3a4738"/>
      <path d="M0 93c8 10 16 14 16 26S8 139 0 147c-8-8-16-16-16-28S-8 103 0 93zM120 93c8 10 16 14 16 26s-8 20-16 28c-8-8-16-16-16-28s8-16 16-26z"/>
      <circle cx="60" cy="118" r="3"/><circle cx="0" cy="43" r="3"/><circle cx="120" cy="43" r="3"/>
    </g>
  </pattern>
  `;
  function ensureDefs() {
    if (document.getElementById('win-sky')) return;
    const d = document.getElementById('defs');
    if (d) d.insertAdjacentHTML('beforeend', DEFS);
  }

  // ---------- sky (screen coords) ----------
  function skyline(x0, x1, base, k, r, yb, spireF, spireK) {
    // far wooded hills: a gentle rolling line crowned with tree canopies
    const hill = x => base - (16 + 10 * Math.sin((x - x0) * 0.006 / k + 1.3) + 5 * Math.sin((x - x0) * 0.017 / k)) * k;
    let far = `M${x0 - 20} ${yb}L${x0 - 20} ${f(hill(x0 - 20))}`;
    for (let x = x0 - 20; x <= x1 + 20;) {
      const rr = (5 + r() * 9) * k, nx = x + rr * 2;
      far += `A${f(rr)} ${f(rr * (0.8 + r() * 0.4))} 0 0 1 ${f(nx)} ${f(hill(nx))}`;
      x = nx;
    }
    far += `L${x1 + 40} ${yb}Z`;
    // near village roofline
    let near = `M${x0} ${yb}L${x0} ${base}`;
    const lights = [];
    let x = x0 - 10 * k, i = 0;
    const spireAt = x0 + (x1 - x0) * spireF;
    let spireDone = false;
    while (x < x1 + 10) {
      i++;
      if (!spireDone && x > spireAt) {
        spireDone = true;
        const w = 26 * spireK, h = 58 * spireK, sh = 72 * spireK;
        near += `L${f(x)} ${f(base - 6 * k)}L${f(x)} ${f(base - h)}L${f(x + w * .5)} ${f(base - h - sh)}L${f(x + w)} ${f(base - h)}L${f(x + w)} ${f(base - 6 * k)}`;
        lights.push([x + w * .5 - 2.2 * spireK, base - h + 10 * spireK, 4.4 * spireK, 7 * spireK, .55]);
        x += w; continue;
      }
      const w = (34 + r() * 46) * k, h = (8 + r() * 26) * k, pitch = (14 + r() * 16) * k;
      const eave = base - h;
      near += `L${f(x)} ${f(eave)}`;
      if (r() < 0.55) {
        const cxp = x + w * (0.2 + r() * 0.2), cw = 6 * k, ch = (10 + r() * 8) * k;
        const yRoof = eave - pitch * ((cxp - x) / (w / 2));
        near += `L${f(cxp)} ${f(yRoof)}L${f(cxp)} ${f(yRoof - ch)}L${f(cxp + cw)} ${f(yRoof - ch)}L${f(cxp + cw)} ${f(yRoof - pitch * (cw / (w / 2)))}`;
      }
      near += `L${f(x + w / 2)} ${f(eave - pitch)}L${f(x + w)} ${f(eave)}`;
      if (r() < 0.4) lights.push([x + w * (0.3 + r() * 0.4), eave + 5 * k, 4 * k, 5 * k, .5 + r() * .4]);
      x += w + (r() < 0.3 ? 6 * k : 0);
    }
    near += `L${f(x)} ${yb}Z`;
    // trees at the ends
    let trees = '';
    for (let t = 0; t < 8; t++) {
      const tx = t < 4 ? x0 + r() * (x1 - x0) * 0.25 : x1 - r() * (x1 - x0) * 0.25;
      const tr = (7 + r() * 8) * k, ty = base - tr * 1.2;
      trees += `<rect x="${f(tx - tr * .08)}" y="${f(ty)}" width="${f(tr * .16)}" height="${f(tr * 2)}"/>`;
      for (let j = 0; j < 5; j++) trees += `<ellipse cx="${f(tx + (r() - .5) * tr * 1.3)}" cy="${f(ty - j * tr * .35 + (r() - .5) * tr * .4)}" rx="${f(tr * (0.75 - j * .1))}" ry="${f(tr * (0.6 - j * .06))}"/>`;
    }
    return { far, near, lights, trees };
  }

  function skyMarkup(c, r, B, noStreaks) {
    const { x0, x1, y0, y1 } = B;
    const m = c.moon, k = c.k;
    let s = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="url(#win-sky)"/>`;
    // stars
    let st1 = '', st2 = '';
    for (let i = 0; i < c.stars; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (c.horizon - y0 - 40 * k), rr = (0.5 + r() * 0.9) * Math.sqrt(k);
      const d = circ(x, y, rr, rr);
      if (r() < 0.5) st1 += d; else st2 += d;
    }
    s += `<path d="${st1}" fill="#dfe9f5" opacity=".35"/><path d="${st2}" fill="#dfe9f5" opacity=".7"/>`;
    // moon
    s += `<circle class="win-halo" cx="${m.x}" cy="${m.y}" r="${m.r * 5.5}" fill="url(#win-halo)"/>`;
    s += `<circle cx="${m.x}" cy="${m.y}" r="${m.r * 3.4}" fill="url(#win-moonring)"/>`;
    s += `<circle class="win-halo2" cx="${m.x}" cy="${m.y}" r="${m.r * 8}" fill="url(#win-halo)" opacity="0"/>`;
    s += `<g transform="translate(${m.x} ${m.y}) scale(${m.r / 40})">
      <circle r="40" fill="url(#win-moon)"/>
      <g fill="#a9b3ad" opacity=".42">
        <path d="M-18 -22c8-5 20-3 22 5s-6 12-12 16-14 2-16-6 0-12 6-15z"/>
        <path d="M8 4c7-2 15 2 16 9s-5 12-12 12-10-5-10-10 2-9 6-11z"/>
        <path d="M-26 6c4-2 9 0 9 4s-3 7-7 7-6-3-6-6 1-4 4-5z"/>
        <circle cx="16" cy="-18" r="4"/><circle cx="-4" cy="26" r="3"/><circle cx="24" cy="-4" r="2.2"/>
      </g>
      <circle r="39" fill="none" stroke="#fffdf0" stroke-opacity=".35" stroke-width="1.5"/>
    </g>`;
    // clouds (two copies, drift left)
    const cw = c.cloudW;
    let cl = '';
    const cr = rng(c.seed + 77);
    for (let i = 0; i < c.clouds; i++) {
      const cx = x0 + cr() * cw, cy = y0 + 40 * k + cr() * (c.horizon - y0 - 110 * k);
      const n = 4 + Math.floor(cr() * 4), w = (50 + cr() * 70) * k;
      for (let j = 0; j < n; j++) {
        const px = cx + (j / (n - 1) - 0.5) * w * 1.6, py = cy + (cr() - 0.5) * 12 * k, rx = (28 + cr() * 30) * k, ry = rx * (0.35 + cr() * 0.2);
        cl += `<ellipse cx="${f(px)}" cy="${f(py - ry * .35)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#win-cloudlit)"/>`;
        cl += `<ellipse cx="${f(px)}" cy="${f(py + ry * .15)}" rx="${f(rx * .95)}" ry="${f(ry * .9)}" fill="url(#win-cloud)"/>`;
      }
    }
    s += `<g class="win-anim" style="--cw:${-cw}px;animation:win-cloud ${c.cloudDur}s linear ${-c.cloudDur * 0.37}s infinite">
      <g id="win-cl-${c.id}">${cl}</g><use href="#win-cl-${c.id}" transform="translate(${cw} 0)"/></g>`;
    // horizon haze
    s += `<rect x="${x0}" y="${c.horizon - 120 * k}" width="${x1 - x0}" height="${120 * k + 4}" fill="url(#win-haze)"/>`;
    // lightning flash (below silhouettes)
    s += `<rect class="win-flash" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#dbe8ff" opacity="0"/>`;
    // silhouettes
    const sk = skyline(x0, x1, c.horizon, k, r, y1, c.spire[0], c.spire[1]);
    s += `<path d="${sk.far}" fill="#0d1a22"/>`;
    s += `<g fill="#0b171e">${sk.trees}</g>`;
    s += `<path d="${sk.near}" fill="#060b0f"/>`;
    s += '<g fill="#e7a85a">' + sk.lights.map(l => `<rect x="${f(l[0])}" y="${f(l[1])}" width="${f(l[2])}" height="${f(l[3])}" opacity="${f(l[4])}"/>`).join('') + '</g>';
    if (noStreaks) return s;
    // outside rain streaks, two depths
    s += rainStreaks(c, B, rng(c.seed + 5), 0.11, c.streaks, 0.75, 1);
    s += rainStreaks(c, B, rng(c.seed + 9), 0.2, Math.round(c.streaks * 0.45), 0.52, 1.6);
    return s;
  }

  function rainStreaks(c, B, r, op, n, dur, len) {
    const { x0, x1, y0, y1 } = B;
    const H = y1 - y0, slope = 0.18, dx = H * slope;
    const k = c.k;
    let lines = '';
    for (let i = 0; i < n; i++) {
      const x = x0 - dx + r() * (x1 - x0 + dx), y = y0 + r() * H, l = (14 + r() * 22) * k * len;
      lines += `M${f(x)} ${f(y)}l${f(l * slope)} ${f(l)}`;
    }
    const w = f(Math.max(0.7, 0.8 * Math.sqrt(k) * len * 0.8));
    return `<g class="win-anim" style="--dx:${f(dx)}px;--dy:${H}px;animation:win-fall ${dur}s linear infinite">
      <path d="${lines}" stroke="#a9c1d6" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round"/>
      <path transform="translate(${f(-dx)} ${-H})" d="${lines}" stroke="#a9c1d6" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round"/></g>`;
  }

  // resting moth, side/three-quarter view, wings folded like a tent. Feet at y = 0, head to the left.
  function restMothMarkup(tint) {
    return `<ellipse cx="6" cy="1" rx="20" ry="2.6" fill="#03070a" opacity=".45"/>
      <path d="M-6 -2.5L-9 0M-1 -2.5L-2 0M4 -2.5L6 0" stroke="#3b2e22" stroke-width=".7" stroke-linecap="round"/>
      <path d="M-24 1C-18 -4 -10 -6 -6 -6.5M-23 -1C-18 -5 -11 -6.8 -7 -7" stroke="#6b5842" stroke-width=".7" fill="none" stroke-linecap="round"/>
      <path d="M-5 -6.5C3 -7.5 16 -5 25 -1.2L24 0C14 -2 3 -2.5 -5 -3Z" fill="#a89c7c" stroke="${INK}" stroke-width=".6" stroke-linejoin="round"/>
      <g class="win-twitch">
        <path d="M-6 -6.8C-2 -13 3 -16.5 7 -16.5C14 -14 21 -7 26 -1.5L22 -1C14 -3.5 3 -4.8 -6 -6.8Z" fill="${tint}" stroke="${INK}" stroke-width=".7" stroke-linejoin="round"/>
        <path d="M6 -15.5C12 -12 18 -7 23 -2.2" stroke="#8a7a5e" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round"/>
        <path d="M-5 -6.6C3 -5.6 13 -4 21.5 -1.3" stroke="#8fc4a0" stroke-width="1.1" fill="none" opacity=".7" stroke-linecap="round"/>
        <path d="M-2 -7.6C4 -9.6 11 -9 18 -4.6" stroke="#4a3c2c" stroke-width=".55" fill="none" opacity=".85"/>
        <path d="M-1 -8.5C5 -10 12 -8.6 17 -5.6" stroke="#8a7a5e" stroke-width=".7" fill="none" opacity=".75"/>
        <circle cx="8" cy="-9.6" r="1.5" fill="none" stroke="#6d5e48" stroke-width=".7"/><circle cx="8" cy="-9.6" r=".6" fill="#6d5e48"/>
        <path d="M-3 -9C0 -13 4 -15.2 7 -15.4" stroke="#fff6dc" stroke-width=".7" fill="none" opacity=".7"/>
      </g>
      <ellipse cx="-6.5" cy="-5.2" rx="3.4" ry="2.8" fill="#d8ccab" stroke="${INK}" stroke-width=".5"/>
      <path d="M-9.4 -6.8l-.6-1.3M-8 -7.6l-.2-1.4M-6.4 -7.9l.1-1.4M-4.8 -7.6l.4-1.3M-3.6 -6.8l.8-1.1" stroke="#efe6cc" stroke-width=".55" stroke-linecap="round"/>
      <circle cx="-9.4" cy="-4.4" r="1.7" fill="#6b5842"/>`;
  }

  function mothMarkup(scale, tint) {
    const wing = sx => `<g transform="scale(${sx} 1)">
        <path d="M0 -1.5C-6 -6 -15 -9.5 -19.5 -6.5C-18.5 -1.5 -12 2.5 0 2Z" fill="${tint}"/>
        <path d="M-3.5 -1.8C-8.5 -4 -13 -5.6 -17 -5.8" stroke="#8a7a5e" stroke-width=".8" fill="none" opacity=".7"/>
        <circle cx="-11" cy="-2.6" r="1.3" fill="#8a7a5e" opacity=".6"/>
        <path d="M0 1C-6 2 -12 6 -10.5 9.5C-6.5 10.5 -2 6.5 0 3Z" fill="${tint}" opacity=".82"/></g>`;
    return `<g transform="scale(${scale})"><g class="win-flap">${wing(1)}${wing(-1)}</g>
      <ellipse cy="3" rx="1.7" ry="5.5" fill="#5c4b37"/><circle cy="-1.5" r="2.4" fill="#cbb994"/>
      <path d="M-.8 -3.5Q-3 -8 -6 -9M.8 -3.5Q3 -8 6 -9" stroke="#5c4b37" stroke-width=".9" fill="none" stroke-linecap="round"/></g>`;
  }

  // ---------- rain on the glass (screen coords, clipped to glass) ----------
  function glassRain(c, r) {
    const S = c.s, R = R_GLASS * S;
    let s = '', dA = '', dB = '', dC = '';
    const dr = c.dropR;
    for (let i = 0; i < c.drops; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R;
      const x = c.cx + d * Math.cos(a), y = c.cy + d * Math.sin(a);
      const rr = dr[0] + Math.pow(r(), 2.2) * (dr[1] - dr[0]);
      if (y < -20 || y > 900) continue;
      dA += circ(x, y, rr, rr * 1.12);
      dB += circ(x, y + rr * .28, rr * .78, rr * .66);
      const h = Math.max(.5, rr * .26); dC += circ(x - rr * .32, y - rr * .38, h, h);
    }
    s += `<path d="${dA}" fill="#07121a" fill-opacity=".38"/><path d="${dB}" fill="#bcd3e6" fill-opacity=".3"/><path d="${dC}" fill="#fff" fill-opacity=".75"/>`;
    // sliding rivulets
    const TL = c.trail;
    for (let i = 0; i < c.rivs; i++) {
      const x = c.cx + (r() * 2 - 1) * R * 0.92;
      const half = Math.sqrt(Math.max(0, R * R - (x - c.cx) * (x - c.cx)));
      const top = Math.max(-10, c.cy - half), bot = c.cy + half;
      if (bot - top < 40) continue;
      const y = top + r() * (bot - top) * 0.35, d = (bot - y) * (0.6 + r() * 0.4);
      const rr = dr[1] * (0.7 + r() * 0.5), dur = f(6 + r() * 9), del = f(-r() * 15);
      const wig = (r() - 0.5) * 6 * S;
      s += `<g transform="translate(${f(x)} ${f(y)})"><g class="win-anim" style="--d:${f(d)}px;animation:win-riv${1 + (i % 2)} ${dur}s linear ${del}s infinite">
        <path transform="scale(1 ${TL})" d="M0 -1Q${f(wig / TL)} -.5 0 0" stroke="url(#win-trail)" stroke-width="${f(rr * .9)}" fill="none" vector-effect="non-scaling-stroke"/>
        <ellipse rx="${f(rr)}" ry="${f(rr * 1.25)}" fill="#07121a" fill-opacity=".42"/>
        <ellipse cy="${f(rr * .35)}" rx="${f(rr * .8)}" ry="${f(rr * .75)}" fill="#c8dcee" fill-opacity=".38"/>
        <circle cx="${f(-rr * .3)}" cy="${f(-rr * .45)}" r="${f(rr * .3)}" fill="#fff" fill-opacity=".85"/></g></g>`;
    }
    return s;
  }

  // ---------- panes, mullions, sash (local coords) ----------
  function sashLocal(c, r) {
    const S = c.s, lw = px => f(px / Math.sqrt(S));
    const tints = ['#9fc4d8', '#b7d0c0', '#a9b8d6', '#c8d4c4', '#d8d0b0'];
    let s = `<circle r="${R_SASH}" fill="#0b1720" fill-opacity=".14"/>`;
    const pane = (d, i) => {
      const t = tints[Math.floor(r() * tints.length)];
      return `<path d="${d}" fill="${t}" fill-opacity="${f(0.03 + r() * 0.08)}"/>`;
    };
    // centre bullseye roundel
    s += `<circle r="58" fill="#a8c6b4" fill-opacity=".09"/>`;
    for (let i = 1; i <= 6; i++) s += `<circle r="${f(i * 8.5)}" fill="none" stroke="#dff0ff" stroke-opacity="${f(0.04 + (6 - i) * 0.012)}" stroke-width="${lw(1.4)}"/>`;
    s += `<circle r="11" fill="#b8d6c0" fill-opacity=".22"/><circle cx="-3" cy="-3" r="3.5" fill="#fff" fill-opacity=".25"/>`;
    const D = Math.PI / 180;
    for (let k = 0; k < 8; k++) s += pane(sector(58, 130, (-90 + k * 45) * D, (-45 + k * 45) * D), k);
    for (let k = 0; k < 16; k++) s += pane(sector(130, R_GLASS, (-90 + k * 22.5) * D, (-67.5 + k * 22.5) * D), k);
    // wavy old-glass streaks
    let waves = '';
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = 40 + r() * 150, x = d * Math.cos(a), y = d * Math.sin(a), l = 10 + r() * 22, tilt = (r() - 0.5) * 1.2;
      waves += `M${f(x)} ${f(y)}q${f(l * .5)} ${f(-3 + tilt * 4)} ${f(l)} ${f(tilt * 6)}`;
    }
    s += `<path d="${waves}" stroke="#e8f2ff" stroke-opacity=".09" stroke-width="${lw(1.6)}" fill="none" stroke-linecap="round"/>`;
    // seed bubbles
    s += '<g fill="none" stroke="#e8f2ff" stroke-opacity=".18">';
    for (let i = 0; i < 16; i++) { const a = r() * 6.283, d = 20 + r() * 175; s += `<circle cx="${f(d * Math.cos(a))}" cy="${f(d * Math.sin(a))}" r="${f(0.6 + r() * 1.1)}" stroke-width="${lw(.6)}"/>`; }
    s += '</g>';
    // big sheen across the glass
    s += `<circle r="${R_GLASS}" fill="url(#win-sheen)"/>`;
    return s;
  }

  function mullions(c) {
    const S = c.s, ink = 2.4 / Math.sqrt(S), lw = px => f(px / Math.sqrt(S));
    const D = Math.PI / 180;
    let sp1 = '', sp2 = '';
    for (let k = 0; k < 8; k++) { const a = (-90 + k * 45) * D; sp1 += `M${pt(56, a)}L${pt(R_GLASS + 2, a)}`; }
    for (let k = 0; k < 8; k++) { const a = (-67.5 + k * 45) * D; sp2 += `M${pt(128, a)}L${pt(R_GLASS + 2, a)}`; }
    const layer = (col, add, hi) => `
      <path d="${sp2}" stroke="${col}" stroke-width="${f(7 + add)}"/>
      <path d="${sp1}" stroke="${col}" stroke-width="${f(9.5 + add)}"/>
      <circle r="130" fill="none" stroke="${col}" stroke-width="${f(8.5 + add)}"/>
      <circle r="58" fill="none" stroke="${col}" stroke-width="${f(10 + add)}"/>`;
    let s = `<g stroke-linecap="butt">${layer(INK, ink * 2)}${layer('url(#win-paint)', 0)}</g>`;
    // thin moon-side highlight
    s += `<g fill="none" stroke="#7d9186" stroke-opacity=".35" stroke-width="${lw(1)}">
      <path d="${sp1}" transform="translate(1.6 -1.6)"/><circle r="126.5"/><circle r="54"/></g>`;
    // hub glazing beads / tiny carved bosses where spokes meet rings
    s += '<g>';
    for (let k = 0; k < 8; k++) {
      const a = (-90 + k * 45) * D;
      for (const rr of [58, 130]) { const [x, y] = [rr * Math.cos(a), rr * Math.sin(a)];
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="7" fill="url(#win-paint)" stroke="${INK}" stroke-width="${lw(1.6)}"/><circle cx="${f(x - 1.5)}" cy="${f(y - 1.5)}" r="2.2" fill="#6f8378" opacity=".4"/>`; }
    }
    s += '</g>';
    // sash ring
    s += `<path d="${ring(R_GLASS, R_SASH)}" fill-rule="evenodd" fill="url(#win-paint)" stroke="${INK}" stroke-width="${f(ink)}"/>`;
    s += `<circle r="${R_GLASS + 4}" fill="none" stroke="#56695c" stroke-opacity=".35" stroke-width="${lw(1.2)}"/>`;
    s += `<circle r="${R_SASH - 3}" fill="none" stroke="#0a0806" stroke-opacity=".5" stroke-width="${lw(1.4)}"/>`;
    // paint chips on the sash ring
    const r = rng(c.seed + 31);
    s += '<g fill="#5a3824" opacity=".6">';
    for (let i = 0; i < 18; i++) { const a = r() * 6.283, d = R_GLASS + 3 + r() * 11; s += `<ellipse cx="${f(d * Math.cos(a))}" cy="${f(d * Math.sin(a))}" rx="${f(1 + r() * 2.5)}" ry="${f(0.6 + r() * 1.2)}" transform="rotate(${f(a / D + 90)} ${f(d * Math.cos(a))} ${f(d * Math.sin(a))})"/>`; }
    s += '</g>';
    return s;
  }

  // the player's brass key, seen from the front: moth-shaped bow (as the inventory icon) above a short shaft
  function keyMarkup(S) {
    const sc = 0.15, ink = f(1.7 / Math.sqrt(S) / sc), hi = f(1.2 / Math.sqrt(S) / sc);
    const wingF = 'M0,-6 C-10,-40 -44,-66 -70,-58 C-88,-50 -86,-22 -70,-8 C-56,2 -30,2 0,-2 Z';
    const wingH = 'M0,2 C-20,6 -52,12 -64,32 C-72,50 -56,64 -38,58 C-20,50 -6,28 0,8 Z';
    const holeF = 'M-18,-12 C-26,-30 -44,-46 -60,-44 C-70,-38 -66,-22 -54,-14 C-44,-8 -30,-8 -18,-12 Z';
    const holeH = 'M-14,14 C-26,18 -44,26 -50,38 C-52,48 -44,50 -36,46 C-26,40 -18,28 -14,14 Z';
    const side = `<path d="${wingF} ${holeF}" fill-rule="evenodd"/><path d="${wingH} ${holeH}" fill-rule="evenodd"/>`;
    const lines = `<path d="${wingF}" fill="none" stroke="#fff0c0" stroke-width="${hi}" opacity=".6" transform="translate(-4,-2) scale(0.9)"/>`;
    return `<rect x="-1.6" y="172" width="3.2" height="17" rx="1" fill="url(#win-keyG)" stroke="${INK}" stroke-width="${f(0.9 / Math.sqrt(S))}"/>
      <rect x="-3" y="171" width="6" height="2.4" rx="1" fill="url(#win-keyG)" stroke="${INK}" stroke-width="${f(0.7 / Math.sqrt(S))}"/>
      <g transform="translate(0 164) scale(${sc})">
        <g fill="url(#win-keyG)" stroke="${INK}" stroke-width="${ink}" stroke-linejoin="round"><g>${side}</g><g transform="scale(-1,1)">${side}</g></g>
        <g>${lines}</g><g transform="scale(-1,1)">${lines}</g>
        <g transform="rotate(-90)">
          <path d="M-58,0 C-50,-9 -20,-11 6,-9 C18,-8 28,-5 30,0 C28,5 18,8 6,9 C-20,11 -50,9 -58,0 Z" fill="url(#win-keyG)" stroke="${INK}" stroke-width="${ink}"/>
          <path d="M-40,-5 L-40,5 M-30,-6 L-30,6 M-20,-7 L-20,7 M-10,-7 L-10,7" stroke="${INK}" stroke-width="${f(ink * .6)}" opacity=".6"/>
          <path d="M30,-2 C44,-14 54,-26 60,-38 M30,2 C44,14 54,26 60,38" stroke="${INK}" stroke-width="${ink}" fill="none" stroke-linecap="round"/>
        </g>
      </g>
      <circle cx="0" cy="188.5" r="2.6" fill="url(#win-keyG)" stroke="${INK}" stroke-width="${f(0.9 / Math.sqrt(S))}"/>`;
  }

  function latchLocal(c) {
    const S = c.s, ink = f(1.8 / Math.sqrt(S)), thin = f(0.9 / Math.sqrt(S));
    return `
    <g class="win-plate">
      <path d="M-19 183Q-19 178 -14 178L14 178Q19 178 19 183L19 200Q19 206 13 207L-13 207Q-19 206 -19 200Z" fill="url(#win-brass)" stroke="${INK}" stroke-width="${ink}"/>
      <path d="M-16 183Q-16 181 -13 181L13 181Q16 181 16 183L16 199Q16 204 12 204L-12 204Q-16 204 -16 199Z" fill="none" stroke="#fff3c8" stroke-opacity=".35" stroke-width="${thin}"/>
      <g fill="#6e4d1c" stroke="${INK}" stroke-width="${f(0.6 / Math.sqrt(S))}">
        <circle cx="-14.5" cy="183" r="1.7"/><circle cx="14.5" cy="183" r="1.7"/><circle cx="-14.5" cy="202" r="1.7"/><circle cx="14.5" cy="202" r="1.7"/>
      </g>
      <g stroke="#2a1d0c" stroke-width="${f(0.5 / Math.sqrt(S))}"><path d="M-15.6 182.2l2.2 1.6M13.4 183.8l2.2-1.6M13.4 201.2l2.2 1.6M-15.6 202.8l2.2-1.6"/></g>
      <ellipse cx="0" cy="190.5" rx="5" ry="7.5" fill="#6e4d1c" opacity=".55"/>
      <path d="M0 185.4a2.7 2.7 0 1 1 -0.01 0Z M-1.1 189.5L1.1 189.5L1.9 195.4L-1.9 195.4Z" fill="#0b0705"/>
      <path d="M-5 190.5a5 7.5 0 0 1 10 0" fill="none" stroke="#f3d995" stroke-opacity=".55" stroke-width="${thin}"/>
    </g>
    <g class="win-key" opacity="0">
      <g class="win-keyrot">${keyMarkup(S)}</g>
    </g>
    <g class="win-lever" transform="rotate(0 -10 210.3)">
      <path d="M-18 208L-10 207.5L17 214.5Q22 216 21.5 220.5L20.5 226Q19.8 228.5 17.6 227.6L16.6 227Q15.6 226.2 16 224.8L17 220.5Q17 218.8 15 218.2L-10 213L-18 212.5Q-20.5 210.2 -18 208Z"
        fill="url(#win-brass)" stroke="${INK}" stroke-width="${ink}" stroke-linejoin="round"/>
      <path d="M-9 209.3L15.5 215.6" stroke="#fff3c8" stroke-opacity=".5" stroke-width="${thin}"/>
      <circle cx="-20.5" cy="210.3" r="3.6" fill="url(#win-brass)" stroke="${INK}" stroke-width="${ink}"/>
      <circle cx="-21.5" cy="209.3" r="1.1" fill="#fff6d6" opacity=".7"/>
      <circle cx="-10" cy="210.3" r="2.6" fill="#8a6224" stroke="${INK}" stroke-width="${thin}"/>
      <circle cx="-10.6" cy="209.7" r=".8" fill="#fff3c8" opacity=".6"/>
    </g>`;
  }

  function frameLocal(c) {
    const S = c.s, ink = f(2.4 / Math.sqrt(S)), lw = px => f(px / Math.sqrt(S));
    const D = Math.PI / 180;
    let s = '';
    // fixed frame (painted), between sash and reveal
    s += `<path d="${ring(R_SASH, R_REVEAL)}" fill-rule="evenodd" fill="url(#win-paint)"/>`;
    s += `<path d="${ring(R_SASH, R_SASH + 7)}" fill-rule="evenodd" fill="#05080a" opacity=".45"/>`;
    s += `<circle r="${R_SASH + 1}" fill="none" stroke="${INK}" stroke-width="${ink}"/>`;
    s += `<circle r="${R_REVEAL - 3}" fill="none" stroke="#5f7266" stroke-opacity=".25" stroke-width="${lw(1)}"/>`;
    // moulded surround (walnut)
    s += `<path d="${ring(R_REVEAL, R_MOULD)}" fill-rule="evenodd" fill="url(#win-mould)" stroke="${INK}" stroke-width="${ink}"/>`;
    s += `<path d="${ring(R_REVEAL + 5, R_REVEAL + 11)}" fill-rule="evenodd" fill="url(#win-mould2)" opacity=".8"/>`;
    // bead moulding
    let beads = '';
    for (let i = 0; i < 128; i++) { const a = i / 128 * 6.2832, x = (R_REVEAL + 8.2) * Math.cos(a), y = (R_REVEAL + 8.2) * Math.sin(a);
      beads += `M${f(x + 1.9)} ${f(y)}a1.9 1.9 0 1 0 -3.8 0a1.9 1.9 0 1 0 3.8 0Z`; }
    s += `<path d="${beads}" fill="#8a5d3a" stroke="#1a0f08" stroke-opacity=".7" stroke-width="${lw(.6)}"/>`;
    s += `<g fill="none" stroke-width="${lw(1.1)}">
      <circle r="${R_REVEAL + 5}" stroke="#1a0f08" stroke-opacity=".8"/>
      <circle r="${R_REVEAL + 11.5}" stroke="#1a0f08" stroke-opacity=".7"/>
      <circle r="${R_REVEAL + 13.5}" stroke="#a0714a" stroke-opacity=".45"/>
      <circle r="${R_MOULD - 4}" stroke="#a0714a" stroke-opacity=".35"/>
      <circle r="${R_REVEAL + 2}" stroke="#946845" stroke-opacity=".4"/></g>`;
    // wood grain
    const r = rng(c.seed + 51);
    let grain = '';
    for (let i = 0; i < 26; i++) {
      const a0 = r() * 6.283, len = 0.15 + r() * 0.5, rr = R_REVEAL + 2 + r() * 18;
      grain += `M${pt(rr, a0)}A${f(rr)} ${f(rr)} 0 0 1 ${pt(rr, a0 + len)}`;
    }
    s += `<path d="${grain}" fill="none" stroke="#1d120a" stroke-opacity=".35" stroke-width="${lw(.8)}"/>`;
    // carved keystone blocks at top, left and right
    for (const ang of [-90]) {
      const a0 = (ang - 6) * D, a1 = (ang + 6) * D;
      const d = `M${pt(R_REVEAL - 1, a0)}L${pt(R_MOULD + 16, a0 - 1.5 * D)}L${pt(R_MOULD + 16, a1 + 1.5 * D)}L${pt(R_REVEAL - 1, a1)}Z`;
      s += `<path d="${d}" fill="url(#win-mould2)" stroke="${INK}" stroke-width="${ink}" stroke-linejoin="round"/>`;
      const a = ang * D, mx = (R_REVEAL + 22) * Math.cos(a), my = (R_REVEAL + 22) * Math.sin(a);
      s += `<g transform="translate(${f(mx)} ${f(my)}) rotate(${ang + 90})">
        <path d="M0 -8C4 -4 4 3 0 7C-4 3 -4 -4 0 -8Z" fill="#3a2418" stroke="#9a6d46" stroke-opacity=".5" stroke-width="${lw(.8)}"/>
        <circle cy="-1" r="1.5" fill="#9a6d46" opacity=".5"/></g>`;
    }
    // keeper for the latch (on the fixed frame)
    const sl = f(.5 / Math.sqrt(S));
    s += `<path d="M9 216.8L27 216.8Q29.4 216.8 29.4 219.2L29.4 230Q29.4 233.4 26 233.4L11 233.4Q9 233.4 9 231Z" fill="#000" opacity=".5"/>
      <path d="M8 215.5L26 215.5Q28 215.5 28 217.5L28 229Q28 232 25 232L10 232Q8 232 8 230Z" fill="url(#win-brass)" stroke="${INK}" stroke-width="${f(1.6 / Math.sqrt(S))}"/>
      <path d="M9.5 216.8L26 216.8" stroke="#fff3c8" stroke-opacity=".55" stroke-width="${sl}"/>
      <rect x="14" y="218.4" width="9" height="5.2" rx="1.8" fill="#1e1406" stroke="${INK}" stroke-width="${sl}"/>
      <g stroke="${INK}" stroke-width="${sl}"><circle cx="11.6" cy="228.4" r="1.9" fill="#8a6224"/><circle cx="24.4" cy="228.4" r="1.9" fill="#8a6224"/></g>
      <path d="M10.4 229.4l2.4-2M23.2 227.4l2.4 2" stroke="#2a1d0c" stroke-width="${sl}"/>`;
    return s;
  }

  function curtainsMarkup(c) {
    // sheer lace curtains, screen coords (west view only)
    const one = (dir) => {
      const cx = c.cx, cy = c.cy;
      const sgn = dir;
      const X = x => f(cx + sgn * x);
      const top = cy - 268;
      const d = `M${X(-305)} ${top}L${X(-170)} ${top}C${X(-178)} ${cy - 120} ${X(-232)} ${cy + 20} ${X(-248)} ${cy + 64}C${X(-238)} ${cy + 130} ${X(-212)} ${cy + 190} ${X(-196)} ${cy + 238}L${X(-306)} ${cy + 240}C${X(-300)} ${cy + 180} ${X(-282)} ${cy + 120} ${X(-270)} ${cy + 64}C${X(-296)} ${cy - 10} ${X(-310)} ${cy - 130} ${X(-305)} ${top}Z`;
      let folds = '';
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const xt = -300 + t * 120, xm = -268 + t * 16, xb = -300 + t * 100;
        folds += `M${X(xt)} ${top + 4}C${X(xt - 10 + t * 20)} ${cy - 100} ${X(xm - 6)} ${cy + 20} ${X(xm)} ${cy + 64}C${X(xm + 4)} ${cy + 130} ${X(xb)} ${cy + 180} ${X(xb)} ${cy + 236}`;
      }
      let scallop = '';
      const x0 = -304, x1 = -198;
      for (let i = 0; i < 9; i++) { const a = x0 + (x1 - x0) * i / 9, b = x0 + (x1 - x0) * (i + 1) / 9; scallop += `M${X(a)} ${cy + 238}Q${X((a + b) / 2)} ${cy + 250} ${X(b)} ${cy + 238}`; }
      return `<g class="win-curtain ${sgn > 0 ? 'win-r' : ''}">
        <path d="${d}" fill="url(#win-lace)" stroke="#e6e0cf" stroke-opacity=".25" stroke-width="1.2"/>
        <path d="${folds}" fill="none" stroke="#f1ecdc" stroke-opacity=".13" stroke-width="3"/>
        <path d="${folds}" fill="none" stroke="#0a1014" stroke-opacity=".12" stroke-width="1.2" transform="translate(${sgn * 5} 0)"/>
        <path d="${scallop}" fill="none" stroke="#e6e0cf" stroke-opacity=".3" stroke-width="1.4"/>
        </g>
        <g transform="translate(${X(-259)} ${cy + 64})">
          <path d="M-18 -4Q0 -12 18 -4Q20 3 18 5Q0 -2 -18 5Q-20 1 -18 -4Z" fill="#5e2322" stroke="${INK}" stroke-width="1.6"/>
          <path d="M-4 3Q-8 16 -6 26M3 3Q6 14 8 24" stroke="#5e2322" stroke-width="3" fill="none" stroke-linecap="round"/>
          <circle cx="-6" cy="27" r="3" fill="#b8893a" stroke="${INK}" stroke-width="1"/><circle cx="8" cy="25" r="3" fill="#b8893a" stroke="${INK}" stroke-width="1"/>
        </g>`;
    };
    const top = c.cy - 272;
    return `<g class="win-rod">
      <rect x="${c.cx - 322}" y="${top - 6}" width="644" height="8" rx="4" fill="url(#win-brass2)" stroke="${INK}" stroke-width="2"/>
      <circle cx="${c.cx - 328}" cy="${top - 2}" r="9" fill="url(#win-brass)" stroke="${INK}" stroke-width="2"/>
      <circle cx="${c.cx + 328}" cy="${top - 2}" r="9" fill="url(#win-brass)" stroke="${INK}" stroke-width="2"/>
      ${[-296, -270, -244, -218, -192, 192, 218, 244, 270, 296].map(x => `<circle cx="${c.cx + x}" cy="${top - 2}" r="5.5" fill="none" stroke="#8a6224" stroke-width="2"/>`).join('')}
    </g>${one(-1)}${one(1)}`;
  }

  // ---------- the opened sash, drawn in true perspective ----------
  // The sash is hinged on its left edge (local x = -R_SASH) and swings outward (away from the viewer) by angle th.
  const OPEN_ANG = 64 * Math.PI / 180, PERSP_D = 560, SASH_T = 20;
  function projector(c, th) {
    const H = R_SASH, ct = Math.cos(th), st = Math.sin(th), ey = c.eyeY;
    return (x, y, zo) => {
      zo = zo || 0;
      const xr = -H + (x + H) * ct - zo * st, z = (x + H) * st + zo * ct, k = PERSP_D / (PERSP_D + z);
      return [c.cx + c.s * xr * k, c.cy + c.s * (ey + (y - ey) * k), k];
    };
  }
  function ringD(P, r, zo, n) {
    n = n || 56; let d = '';
    for (let i = 0; i < n; i++) { const a = i / n * 6.2832, q = P(r * Math.cos(a), r * Math.sin(a), zo); d += (i ? 'L' : 'M') + f(q[0]) + ' ' + f(q[1]); }
    return d + 'Z';
  }
  function buildPersp(parent, c) {
    const g = G.el('g', { class: 'win-persp', style: 'display:none' }, parent);
    const mk = (tag, a) => G.el(tag, a, g);
    const r = rng(c.seed + 404), drops = [];
    for (let i = 0; i < 22; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * 188; drops.push([d * Math.cos(a), d * Math.sin(a), 1.2 + r() * 2]); }
    return {
      g, drops,
      back: mk('path', { fill: '#1a231e', 'fill-rule': 'evenodd', stroke: INK, 'stroke-linejoin': 'round' }),
      side: mk('path', { fill: '#5d6e61', stroke: '#5d6e61', 'stroke-linejoin': 'round' }),
      sideSh: mk('path', { fill: 'url(#win-sashside)' }),
      edge: mk('path', { fill: 'none', stroke: '#8a9a8e', 'stroke-opacity': .6 }),
      glass: mk('path', { fill: '#0d1a22', 'fill-opacity': .22 }),
      tint: mk('path', { fill: 'url(#win-sashsheen)' }),
      moonRef: mk('path', { fill: '#eef3e6', 'fill-opacity': .55 }),
      moonHalo: mk('path', { fill: '#cfe3ff', 'fill-opacity': .12 }),
      dropsP: mk('path', { fill: '#07121a', 'fill-opacity': .4 }),
      dropsH: mk('path', { fill: '#eef6ff', 'fill-opacity': .85 }),
      mullInk: mk('path', { fill: 'none', stroke: INK, 'stroke-linecap': 'butt' }),
      mull: mk('path', { fill: 'none', stroke: '#27342e', 'stroke-linecap': 'butt' }),
      rim: mk('path', { fill: '#2b3831', 'fill-rule': 'evenodd', stroke: INK, 'stroke-linejoin': 'round' }),
      rimHi: mk('path', { fill: 'none', stroke: '#6f8578', 'stroke-opacity': .5 }),
      glint: mk('path', { fill: 'none', stroke: '#eef6ff', 'stroke-linecap': 'round', 'stroke-opacity': .5 }),
      glint2: mk('path', { fill: 'none', stroke: '#eef6ff', 'stroke-linecap': 'round', 'stroke-opacity': .16 }),
      rimLight: mk('path', { fill: 'none', stroke: '#dcebff', 'stroke-linecap': 'round', 'stroke-opacity': .75 }),
    };
  }
  function drawPersp(R, th) {
    const c = R.c, Pp = R.persp, P = projector(c, th), S = c.s;
    const kc = P(0, 0)[2], w = px => f(px * S * kc);
    Pp.back.setAttribute('d', ringD(P, R_SASH, SASH_T) + ringD(P, R_GLASS, SASH_T));
    Pp.back.setAttribute('stroke-width', w(1.6));
    // the sash's wooden edge: quads between the inner-face and outer-face outlines
    let sd = '';
    const N = 64;
    for (let i = 0; i < N; i++) {
      const a0 = i / N * 6.2832, a1 = (i + 1) / N * 6.2832;
      const q = [P(R_SASH * Math.cos(a0), R_SASH * Math.sin(a0)), P(R_SASH * Math.cos(a1), R_SASH * Math.sin(a1)),
        P(R_SASH * Math.cos(a1), R_SASH * Math.sin(a1), -SASH_T), P(R_SASH * Math.cos(a0), R_SASH * Math.sin(a0), -SASH_T)];
      sd += 'M' + q.map(v => f(v[0]) + ' ' + f(v[1])).join('L') + 'Z';
    }
    Pp.side.setAttribute('d', sd); Pp.side.setAttribute('stroke-width', w(0.6));
    Pp.sideSh.setAttribute('d', sd);
    Pp.edge.setAttribute('d', ringD(P, R_SASH, -SASH_T));
    Pp.edge.setAttribute('stroke-width', w(1.4));
    const gl = ringD(P, R_GLASS);
    Pp.glass.setAttribute('d', gl); Pp.tint.setAttribute('d', gl);
    // beads on the glass (foreshortened)
    const fx = Math.max(0.25, Math.cos(th));
    let dd = '', dh = '';
    for (const q of Pp.drops) { const p = P(q[0], q[1]), rr = q[2] * S * p[2]; dd += circ(p[0], p[1], rr * fx, rr * 1.1); dh += circ(p[0] - rr * .3 * fx, p[1] - rr * .4, rr * .3 * fx, rr * .3); }
    Pp.dropsP.setAttribute('d', dd); Pp.dropsH.setAttribute('d', dh);
    // a sliver of reflected moon (the moon is behind the viewer's right; the glass faces into the room at an angle)
    const mp = P(-130, 86), mr = 16 * S * mp[2];
    Pp.moonRef.setAttribute('d', circ(mp[0], mp[1], mr * fx * .9, mr));
    Pp.moonHalo.setAttribute('d', circ(mp[0], mp[1], mr * fx * 3, mr * 3));
    // light catching the free (outer) edge of the rim
    let rl = '';
    for (let i = 0; i <= 20; i++) { const a = (-55 + i * 5.5) * Math.PI / 180, q = P(R_SASH * Math.cos(a), R_SASH * Math.sin(a)); rl += (i ? 'L' : 'M') + f(q[0]) + ' ' + f(q[1]); }
    Pp.rimLight.setAttribute('d', rl); Pp.rimLight.setAttribute('stroke-width', w(2.6));
    let md = ringD(P, 130, 0, 44) + ringD(P, 58, 0, 28);
    for (let k = 0; k < 8; k++) { const a = (-90 + k * 45) * Math.PI / 180, p0 = P(56 * Math.cos(a), 56 * Math.sin(a)), p1 = P(R_GLASS * Math.cos(a), R_GLASS * Math.sin(a)); md += `M${f(p0[0])} ${f(p0[1])}L${f(p1[0])} ${f(p1[1])}`; }
    for (let k = 0; k < 8; k++) { const a = (-67.5 + k * 45) * Math.PI / 180, p0 = P(128 * Math.cos(a), 128 * Math.sin(a)), p1 = P(R_GLASS * Math.cos(a), R_GLASS * Math.sin(a)); md += `M${f(p0[0])} ${f(p0[1])}L${f(p1[0])} ${f(p1[1])}`; }
    Pp.mull.setAttribute('d', md); Pp.mullInk.setAttribute('d', md);
    Pp.mull.setAttribute('stroke-width', w(8.5)); Pp.mullInk.setAttribute('stroke-width', w(8.5 + 4.8 / Math.sqrt(S)));
    Pp.rim.setAttribute('d', ringD(P, R_SASH) + ringD(P, R_GLASS));
    Pp.rim.setAttribute('stroke-width', w(2.4 / Math.sqrt(S)));
    Pp.rimHi.setAttribute('d', ringD(P, R_SASH - 3)); Pp.rimHi.setAttribute('stroke-width', w(1.4));
    const seg = (pts) => pts.map((q, i) => { const p = P(q[0], q[1]); return (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]); }).join('');
    Pp.glint.setAttribute('d', seg([[-150, -40], [-60, -120], [20, -160]]) + seg([[-120, 40], [-40, -30]]));
    Pp.glint.setAttribute('stroke-width', w(3.2));
    Pp.glint2.setAttribute('d', seg([[-170, 10], [-40, -110], [60, -170]]));
    Pp.glint2.setAttribute('stroke-width', w(9));
    // latch (plate, lever, key) follows the sash: local affine fit of the projection around the keyhole
    const X = 0, Y = 196, p0 = P(X, Y), px = P(X + 1, Y), py = P(X, Y + 1);
    const a = px[0] - p0[0], b = px[1] - p0[1], cc = py[0] - p0[0], d = py[1] - p0[1];
    const r4 = v => Math.round(v * 10000) / 10000;
    R.latchInner.setAttribute('transform', `matrix(${r4(a)} ${r4(b)} ${r4(cc)} ${r4(d)} ${f(p0[0] - a * X - cc * Y)} ${f(p0[1] - b * X - d * Y)})`);
  }

  // ---------- build a window instance ----------
  function buildWindow(g, c) {
    ensureCss(); ensureDefs();
    const S = c.s, rO = R_SASH * S, id = c.id;
    const B = { x0: Math.max(-20, c.cx - rO - 30), x1: Math.min(1620, c.cx + rO + 30), y0: Math.max(-20, c.cy - rO - 30), y1: Math.min(920, c.cy + rO + 30) };
    const r = rng(c.seed);
    const tr = `translate(${c.cx} ${c.cy}) scale(${S})`;
    const root = G.el('g', { class: 'win-root win-paused' }, g);
    G.svg(`<defs>
      <clipPath id="win-open-${id}"><circle cx="${c.cx}" cy="${c.cy}" r="${rO + 1}"/></clipPath>
      <clipPath id="win-glass-${id}"><circle cx="${c.cx}" cy="${c.cy}" r="${R_GLASS * S}"/></clipPath>
    </defs>`, root);
    if (c.backdrop) G.svg(c.backdrop, root);
    // soft shadow of the surround on the wall
    G.svg(`<circle cx="${c.cx}" cy="${c.cy + 12 * S}" r="${(R_MOULD + 30) * S}" fill="url(#win-wallshadow)"/>`, root);
    // sky + outside
    let skyM;
    if (c.skyFrom) {
      // same sky as the overview, magnified about the window centre (moon, spire and clouds stay where they were)
      const W = c.skyFrom, rW = R_SASH * W.s;
      const BW = { x0: W.cx - rW - 30, x1: W.cx + rW + 30, y0: W.cy - rW - 30, y1: W.cy + rW + 30 };
      skyM = `<g transform="translate(${c.cx} ${c.cy}) scale(${S / W.s}) translate(${-W.cx} ${-W.cy})">${skyMarkup(W, rng(W.seed), BW, true)}</g>`
        + rainStreaks(c, B, rng(c.seed + 5), 0.11, c.streaks, 0.75, 1) + rainStreaks(c, B, rng(c.seed + 9), 0.2, Math.round(c.streaks * 0.45), 0.52, 1.6);
    } else skyM = skyMarkup(c, r, B);
    const sky = G.svg(skyM, root);
    sky.setAttribute('clip-path', `url(#win-open-${id})`);
    const moths = G.svg(c.moths.map((m, i) => `<g transform="translate(${m[0]} ${m[1]})"><g class="win-anim" style="--k:${m[2]};animation:win-moth${i % 2 ? 'B' : 'A'} ${m[3]}s ease-in-out ${-i * 2.3}s infinite">${mothMarkup(m[2], '#e6dbbd')}</g></g>`).join(''), sky);
    moths.setAttribute('class', 'win-moths');
    // sash (moves)
    const sashWrap = G.el('g', { 'clip-path': `url(#win-open-${id})` }, root);
    const sash = G.el('g', { class: 'win-sash' }, sashWrap);
    G.svg(sashLocal(c, r), sash).setAttribute('transform', tr);
    G.svg(glassRain(c, r), sash).setAttribute('clip-path', `url(#win-glass-${id})`);
    const lampRef = G.svg(`<g style="mix-blend-mode:screen">
      <circle class="win-lampdot" cx="${c.cx - 118 * S}" cy="${c.cy + 112 * S}" r="${13 * S}" fill="url(#win-flame)" style="animation:win-breathe 2.3s ease-in-out infinite"/>
      <circle cx="${c.cx - 118 * S}" cy="${c.cy + 112 * S}" r="${1.6 * S}" fill="#fff1c1" opacity=".85"/>
      <path d="M${c.cx - 150 * S} ${c.cy + 96 * S}q${14 * S} ${-6 * S} ${26 * S} ${-4 * S}" stroke="#ffcf7a" stroke-opacity=".35" stroke-width="${1.4 * S}" fill="none" stroke-linecap="round"/></g>`, sash);
    lampRef.setAttribute('clip-path', `url(#win-glass-${id})`);
    G.svg(mullions(c), sash).setAttribute('transform', tr);
    const persp = buildPersp(sashWrap, c);

    // fixed frame + moulding
    G.svg(frameLocal(c), root).setAttribute('transform', tr);
    const hl = f(1.2 / Math.sqrt(S));
    const hinge = y => `<g transform="translate(${f(R_SASH - Math.sqrt(R_SASH * R_SASH - y * y))} ${y})">
        <path d="M-236 -8L-214 -8L-214 8L-236 8Z" fill="url(#win-brass2)" stroke="${INK}" stroke-width="${hl}"/>
        <circle cx="-230" cy="-3.5" r="1.6" fill="#6e4d1c" stroke="${INK}" stroke-width="${f(.5 / Math.sqrt(S))}"/><circle cx="-230" cy="3.5" r="1.6" fill="#6e4d1c" stroke="${INK}" stroke-width="${f(.5 / Math.sqrt(S))}"/>
        <rect x="-218" y="-13" width="8" height="26" rx="3" fill="url(#win-brass)" stroke="${INK}" stroke-width="${hl}"/>
        <path d="M-218 -4.5h8M-218 4.5h8" stroke="${INK}" stroke-width="${f(.6 / Math.sqrt(S))}"/>
        <rect x="-216.8" y="-11" width="1.8" height="22" rx=".9" fill="#fff3c8" opacity=".6"/>
        <circle cx="-214" cy="-15" r="2" fill="url(#win-brass)" stroke="${INK}" stroke-width="${f(.6 / Math.sqrt(S))}"/></g>`;
    const hinges = G.svg(`<g style="display:none">${hinge(-88)}${hinge(88)}</g>`, root).firstChild;
    hinges.setAttribute('transform', tr);
    // latch (moves with sash, drawn above frame)
    const latchWrap = G.el('g', {}, root);
    const latch = G.el('g', { class: 'win-latch' }, latchWrap);
    const latchInner = G.svg(latchLocal(c), latch);
    latchInner.setAttribute('transform', tr);
    // things once open: blowing rain, moonlight spill
    if (c.sill) G.svg(c.sill, root);
    const openFx = G.el('g', { class: 'win-openfx', opacity: 0, 'pointer-events': 'none' }, root);
    const inR = rng(c.seed + 99);
    G.svg(`<g clip-path="url(#win-open-${id})">${rainStreaks(c, B, inR, 0.32, Math.round(c.streaks * 0.35), 0.42, 2.2)}</g>`, openFx);
    if (c.rainToSill) {
      // drops blown over the lip of the opening, falling onto the sill in front of the frame
      const rr = rng(c.seed + 61);
      let sp = '';
      for (let i = 0; i < 16; i++) {
        const x = 610 + rr() * 380, lip = c.cy + Math.sqrt(rO * rO - (x - c.cx) * (x - c.cx)) - 4, dy = 700 - lip;
        sp += `<g transform="translate(${f(x)} ${f(lip)})"><g class="win-anim" style="--dx:${f(-6 + rr() * 12)}px;--dy:${f(dy)}px;animation:win-drip ${f(0.5 + rr() * 0.4)}s cubic-bezier(.5,0,1,1) ${f(-rr() * 2)}s infinite">
          <ellipse rx="1.6" ry="${f(4 + rr() * 4)}" fill="#dcebff" opacity=".7"/></g></g>`;
      }
      G.svg(sp, openFx);
    }
    if (c.openExtra) G.svg(c.openExtra, openFx);
    const curt = c.curtains ? G.svg(c.curtains, root) : null;
    // cold air wash (animated during opening)
    const wash = G.el('rect', { x: 0, y: 0, width: 1600, height: 900, fill: '#cfe3ff', opacity: 0, 'pointer-events': 'none' }, root);
    const fr = rO + (R_MOULD - R_SASH + 60) * S;
    const flash2 = G.el('rect', { x: c.cx - fr, y: Math.max(0, c.cy - fr), width: 2 * fr, height: Math.min(900, c.cy + fr + 80) - Math.max(0, c.cy - fr), fill: '#dbe8ff', opacity: 0, 'pointer-events': 'none', style: 'mix-blend-mode:screen' }, root);
    const R = {
      c, tr, root, sky, flash2, hinges, sash, latch, latchWrap, latchInner, persp, moths, lampRef, openFx, curt, wash,
      flash: sky.querySelector('.win-flash'), halo2: sky.querySelector('.win-halo2'),
      lever: latch.querySelector('.win-lever'), key: latch.querySelector('.win-key'), keyrot: latch.querySelector('.win-keyrot'),
      animating: false, timer: null, active: false,
    };
    return R;
  }

  function setOpen(R, t) {
    const c = R.c;
    if (t <= 0) {
      R.sash.style.opacity = 1;
      R.persp.g.style.display = 'none'; R.hinges.style.display = 'none';
      R.latchInner.setAttribute('transform', R.tr);
      R.latchWrap.removeAttribute('clip-path');
    } else {
      R.sash.style.opacity = f(Math.max(0, 1 - t * 7));
      R.persp.g.style.display = ''; R.hinges.style.display = '';
      R.persp.g.style.opacity = f(Math.min(1, t * 7));
      drawPersp(R, t * OPEN_ANG);
      R.latchWrap.setAttribute('clip-path', `url(#win-open-${c.id})`);
    }
    R.openFx.setAttribute('opacity', f(t));
    R.halo2.setAttribute('opacity', f(0.9 * t));
  }
  function setLever(R, t) { R.lever.setAttribute('transform', `rotate(${f(-34 * t)} -10 210.3)`); }
  function setKey(R, vis, rot, sc) {
    R.key.setAttribute('opacity', vis);
    R.keyrot.setAttribute('transform', `translate(0 188.5) rotate(${f(rot)}) scale(${f(sc)}) translate(0 -188.5)`);
  }

  function applyState(R) {
    if (!R || R.animating) return;
    const open = !!G.get('windowOpen'), lamp = !!G.get('lampLit');
    setOpen(R, open ? 1 : 0);
    setLever(R, open ? 1 : 0);
    setKey(R, open ? 1 : 0, 90, 1);
    R.moths.style.display = lamp ? '' : 'none';
    R.lampRef.style.display = lamp ? '' : 'none';
    R.root.classList.toggle('win-open', open);
  }

  // lightning: rare, subtle
  function scheduleFlash(R) {
    clearTimeout(R.timer);
    if (!R.active) return;
    R.timer = setTimeout(async () => {
      if (!R.active) return;
      const peak = G.get('windowOpen') ? 0.34 : 0.24;
      await G.tween(900, (e, t) => {
        const v = t < .08 ? t / .08 : t < .18 ? 1 - (t - .08) / .1 * .8 : t < .26 ? .2 + (t - .18) / .08 * .6 : Math.max(0, .8 * (1 - (t - .26) / .74));
        R.flash.setAttribute('opacity', f(v * peak));
        R.flash2.setAttribute('opacity', f(v * peak * 0.3));
      }, 'linear');
      R.flash.setAttribute('opacity', 0); R.flash2.setAttribute('opacity', 0);
      scheduleFlash(R);
    }, 9000 + Math.random() * 14000);
  }
  function scheduleGust(R) {
    clearTimeout(R.gust);
    if (!R.active) return;
    R.gust = setTimeout(async () => {
      if (R.active && G.get('windowOpen') && !R.animating) {
        const a = 0.05 + Math.random() * 0.05;
        await G.tween(1600, (e, t) => { if (!R.animating) drawPersp(R, OPEN_ANG * (1 - a * Math.sin(t * Math.PI) * (1 - 0.3 * Math.sin(t * 9)))); }, 'linear');
        if (!R.animating && G.get('windowOpen')) drawPersp(R, OPEN_ANG);
      }
      scheduleGust(R);
    }, 4000 + Math.random() * 5000);
  }
  function activate(R, on) {
    if (!R) return;
    R.active = on;
    R.root.classList.toggle('win-paused', !on);
    if (on) { scheduleFlash(R); scheduleGust(R); } else { clearTimeout(R.timer); clearTimeout(R.gust); R.flash.setAttribute('opacity', 0); }
  }

  // A soft parallel shaft from P0 towards P1 (half-width w), cut at y = yEnd; edges fade via a cross-beam gradient.
  let beamN = 0;
  // tapered shaft through four corner points, with a soft cross-beam falloff; ax0/ax1 = axis ends, w = half-width at the middle
  function taper(pts, ax0, ax1, w, op, col, core) {
    const id = 'win-shaft' + (beamN++);
    const dx = ax1[0] - ax0[0], dy = ax1[1] - ax0[1], L = Math.hypot(dx, dy), n = [dy / L, -dx / L];
    const M = [(ax0[0] + ax1[0]) / 2, (ax0[1] + ax1[1]) / 2];
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(M[0] + n[0] * w)}" y1="${f(M[1] + n[1] * w)}" x2="${f(M[0] - n[0] * w)}" y2="${f(M[1] - n[1] * w)}">
        <stop offset="0" stop-color="${col}" stop-opacity="0"/><stop offset=".2" stop-color="${col}" stop-opacity=".12"/>
        <stop offset=".38" stop-color="${col}" stop-opacity=".6"/><stop offset=".5" stop-color="${core}" stop-opacity="1"/>
        <stop offset=".62" stop-color="${col}" stop-opacity=".6"/><stop offset=".8" stop-color="${col}" stop-opacity=".12"/>
        <stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>
      <polygon points="${pts.map(q => f(q[0]) + ',' + f(q[1])).join(' ')}" fill="url(#${id})" opacity="${op}"/>`;
  }
  function shaft(P0, P1, w, yEnd, op) {
    const id = 'win-shaft' + (beamN++);
    const dx = P1[0] - P0[0], dy = P1[1] - P0[1], L = Math.hypot(dx, dy), d = [dx / L, dy / L], n = [d[1], -d[0]];
    const A = [P0[0] + n[0] * w, P0[1] + n[1] * w], Bp = [P0[0] - n[0] * w, P0[1] - n[1] * w];
    const toY = Q => { const t = (yEnd - Q[1]) / d[1]; return [Q[0] + d[0] * t, yEnd]; };
    const C = toY(A), D = toY(Bp);
    const M = [(P0[0] + P1[0]) / 2, (P0[1] + P1[1]) / 2];
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(M[0] + n[0] * w)}" y1="${f(M[1] + n[1] * w)}" x2="${f(M[0] - n[0] * w)}" y2="${f(M[1] - n[1] * w)}">
        <stop offset="0" stop-color="#cfe3ff" stop-opacity="0"/><stop offset=".16" stop-color="#cfe3ff" stop-opacity=".03"/>
        <stop offset=".32" stop-color="#cfe3ff" stop-opacity=".22"/><stop offset=".5" stop-color="#e4efff" stop-opacity="1"/>
        <stop offset=".68" stop-color="#cfe3ff" stop-opacity=".22"/><stop offset=".84" stop-color="#cfe3ff" stop-opacity=".03"/>
        <stop offset="1" stop-color="#cfe3ff" stop-opacity="0"/></linearGradient>
      <polygon points="${[A, C, D, Bp].map(q => f(q[0]) + ',' + f(q[1])).join(' ')}" fill="url(#${id})" opacity="${op}"/>`;
  }
  function motes(n, box, seed, dir) {
    const r = rng(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.8 + r() * 1.6)}" fill="#eaf3ff" class="win-anim"
        style="--o:${f(0.35 + r() * 0.5)};--dx:${f(dir[0] * (20 + r() * 40))}px;--dy:${f(dir[1] * (20 + r() * 40))}px;animation:win-mote ${f(7 + r() * 8)}s ease-in-out ${f(-r() * 15)}s infinite"/>`;
    }
    return s;
  }
  // ---------- configs ----------
  const WEST = {
    id: 'w', cx: 800, cy: 360, s: 1, k: 1, seed: 11, eyeY: 0,
    moon: { x: 934, y: 449, r: 21 }, horizon: 512, spire: [0.72, 1], stars: 40, clouds: 9, cloudW: 760, cloudDur: 150,
    streaks: 70, drops: 90, dropR: [0.9, 2.4], rivs: 16, trail: 26,
    moths: [[742, 318, 1.05, 8.5], [868, 420, 0.85, 11]],
  };
  WEST.curtains = curtainsMarkup(WEST);
  WEST.sill = `<g>
    <path d="M540 598L1060 598L1078 610L522 610Z" fill="#7a4e30" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <rect x="522" y="610" width="556" height="14" fill="url(#win-sill)" stroke="${INK}" stroke-width="2.4"/>
    <path d="M548 601L1052 601" stroke="#a87a50" stroke-opacity=".5" stroke-width="1.2"/>
    <rect x="522" y="624" width="556" height="8" fill="#000" opacity=".3"/></g>`;
  WEST.openExtra = `<g style="mix-blend-mode:screen">
    <ellipse cx="800" cy="604" rx="230" ry="10" fill="url(#win-pool)" opacity=".95"/>
    <ellipse cx="800" cy="603" rx="150" ry="4" fill="#e4efff" opacity=".4"/>
    <ellipse cx="800" cy="617" rx="240" ry="8" fill="url(#win-pool)" opacity=".35"/></g>`;

  const CLOSE = { skyFrom: WEST,
    id: 'c', cx: 800, cy: -50, s: 3, k: 2.4, seed: 23, eyeY: 70,
    moon: { x: 1212, y: 226, r: 64 }, horizon: 470, spire: [0.26, 1.9], stars: 70, clouds: 12, cloudW: 1560, cloudDur: 260,
    streaks: 150, drops: 190, dropR: [2.2, 6.5], rivs: 26, trail: 80,
    moths: [[560, 300, 2.1, 9], [1010, 400, 1.7, 12]],
  };
  CLOSE.backdrop = `<rect width="1600" height="900" fill="url(#win-damask)"/>
    <rect width="1600" height="900" fill="#0b1418" opacity=".35"/>`;
  CLOSE.sill = `<g>
    <path d="M0 690L1600 690L1600 716L0 716Z" fill="#7a4e30"/>
    <path d="M0 690L1600 690" stroke="${INK}" stroke-width="3"/>
    <path d="M0 694L1600 694" stroke="#b4855a" stroke-opacity=".45" stroke-width="2"/>
    <rect x="0" y="716" width="1600" height="30" fill="url(#win-sill)" stroke="${INK}" stroke-width="3"/>
    <rect x="0" y="746" width="1600" height="16" fill="#000" opacity=".45"/>
    <rect x="0" y="762" width="1600" height="138" fill="#1d2a24"/>
    <path d="M0 780L1600 780M0 850L1600 850" stroke="#0e1512" stroke-width="3"/>
    <g transform="translate(470 706) rotate(-8)" opacity=".92">
      <path d="M0 0C-12 -4 -26 -12 -30 -4C-32 2 -18 4 0 2Z" fill="#8c8069"/>
      <path d="M0 2C-10 6 -18 12 -10 14C-4 14 0 8 0 3Z" fill="#6f6553"/>
      <path d="M0 -1C8 -8 20 -6 22 -1C22 3 10 3 0 2Z" fill="#7d725d"/>
      <ellipse cx="0" cy="1" rx="2.4" ry="7" fill="#3b2e22" transform="rotate(80)"/>
      <path d="M-4 -2L-12 -8M-3 -2L-10 -10" stroke="#3b2e22" stroke-width="1"/>
    </g>
    <g fill="#9fb6cc" opacity=".35"><circle cx="1030" cy="708" r="2.5"/><circle cx="1056" cy="702" r="1.8"/><circle cx="640" cy="705" r="2"/></g>
  </g>`;
  CLOSE.openExtra = (() => {
    const r = rng(808);
    let beads = '', hi = '', spl = '';
    for (let i = 0; i < 46; i++) {
      const x = 430 + r() * 740, y = 693 + r() * 18, rr = 2 + r() * 4.5;
      beads += circ(x, y, rr * 1.3, rr * .55); hi += circ(x - rr * .4, y - rr * .2, rr * .35, rr * .2);
    }
    for (let i = 0; i < 14; i++) {
      const x = f(460 + r() * 680), y = f(696 + r() * 14), sc = f(0.8 + r() * 0.8);
      spl += `<g transform="translate(${x} ${y}) scale(${sc})"><g class="win-splash" style="animation-duration:${f(0.8 + r() * 0.9)}s;animation-delay:${f(-r() * 2)}s">
        <path d="M-5 0Q-7 -6 -10 -9M-1.5 0Q-2 -8 -3 -13M1.5 0Q3 -8 4.5 -12M5 0Q8 -5 11 -7" stroke="#d6e6f4" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <ellipse rx="9" ry="2.2" fill="none" stroke="#d6e6f4" stroke-width="1.2"/></g></g>`;
    }
    return `<g style="mix-blend-mode:screen">
      ${shaft([800, 560], [800, 900], 330, 900, 0.10)}
      <ellipse cx="800" cy="703" rx="480" ry="26" fill="url(#win-pool)" opacity=".95"/>
      <ellipse cx="800" cy="700" rx="330" ry="10" fill="#e4efff" opacity=".35"/>
      <ellipse cx="800" cy="732" rx="460" ry="18" fill="url(#win-pool)" opacity=".4"/>
      <ellipse cx="800" cy="830" rx="520" ry="70" fill="url(#win-pool)" opacity=".16"/>
    </g>
    <path d="${beads}" fill="#0b151b" fill-opacity=".32"/>
    <path d="${hi}" fill="#eef6ff" fill-opacity=".75"/>
    <g>${spl}</g>`;
  })();
  CLOSE.rainToSill = true;
  // lace curtain edges in the close-up
  CLOSE.curtains = [[-1, 0], [1, 1600]].map(([sg, ex]) => {
    const X = x => ex - sg * x;
    return `<g class="win-billow ${sg < 0 ? 'win-bl' : 'win-br'}">
      <path d="M${X(0)} 0L${X(170)} 0C${X(150)} 200 ${X(110)} 420 ${X(140)} 690L${X(0)} 690Z" fill="url(#win-lace)"/>
      <path d="M${X(40)} 0C${X(36)} 200 ${X(30)} 460 ${X(40)} 690M${X(95)} 0C${X(85)} 220 ${X(64)} 460 ${X(90)} 690M${X(140)} 0C${X(122)} 220 ${X(98)} 460 ${X(126)} 690" stroke="#f1ecdc" stroke-opacity=".14" stroke-width="7" fill="none"/>
      <path d="M${X(0)} 686${[...Array(8)].map((_, i) => `Q${X(i * 17.5 + 8.75)} 700 ${X((i + 1) * 17.5)} 686`).join('')}" stroke="#e6e0cf" stroke-opacity=".35" stroke-width="2" fill="none"/>
    </g>`;
  }).join('');

  // ---------- west wall object ----------
  let RW = null, RC = null;
  G.registerWallObject('west', {
    z: 10,
    build(g) {
      RW = buildWindow(g, WEST);
      RW.restSmall = G.svg(`<g style="display:none" transform="translate(880 603) scale(.62)">${restMothMarkup('#e3d8b9')}</g>`, RW.root).firstChild;
      const hot = G.el('circle', { cx: 800, cy: 360, r: 238, fill: 'transparent' }, RW.root);
      G.hotspot(hot, {
        cursor: 'look',
        click() { G.go('window'); },
        use(id) { G.go('window'); return true; },
      });
    },
    update() {
      applyState(RW);
      if (RW.restSmall) RW.restSmall.style.display = (G.get('windowOpen') && landState === 'landed') ? '' : 'none';
    },
    enter() { activate(RW, true); },
    exit() { activate(RW, false); },
  });

  // ---------- close-up ----------
  let latchHot = null;
  G.registerView('window', {
    parent: 'west',
    build(g) {
      RC = buildWindow(g, CLOSE);
      // a moth that flies in through the open window and settles on the sill
      RC.land = G.svg(`<g style="display:none">
        <g class="win-lm">${mothMarkup(1, '#e9dfc3')}</g>
        <g class="win-rest" transform="translate(${LAND.x} ${LAND.y}) scale(${LAND.s})">${restMothMarkup('#e3d8b9')}</g></g>`, RC.root).firstChild;
      RC.fly = RC.land.querySelector('.win-lm'); RC.rest = RC.land.querySelector('.win-rest');
      // vignette on top
      G.el('rect', { width: 1600, height: 900, fill: 'url(#win-vign)', 'pointer-events': 'none' }, RC.root);
      const glass = G.el('circle', { cx: 800, cy: -50, r: R_SASH * 3, fill: 'transparent' }, RC.root);
      G.hotspot(glass, {
        cursor: 'look',
        click() {
          if (G.get('windowOpen')) G.say('Cold air, and the smell of wet slate. The moon is enormous tonight.');
          else if (G.get('lampLit')) G.say('Moths batter softly at the glass, drawn to the lamp.');
          else G.say('Rain streams down the old, rippled glass. The village beyond is dark.');
        },
      });
      latchHot = G.el('rect', { x: 715, y: 465, width: 180, height: 190, rx: 30, fill: 'transparent' }, RC.root);
      G.hotspot(latchHot, {
        cursor: 'use',
        click() {
          if (G.get('windowOpen')) { G.say('The keeper is empty. The latch swung out with the window, my key still in it.'); return; }
          G.sfx('lockFail');
          G.say('Locked. The latch has a tiny keyhole.');
          wiggle();
        },
        use(id) {
          if (G.get('windowOpen')) return false;
          if (id === 'key') { openSequence(); return true; }
          return false;
        },
        fail: 'It needs a key — a very small one.',
      });
    },
    update() {
      applyState(RC);
      if (RC && RC.land && !G.get('windowOpen')) hideMoths();
      else if (RC && landState === 'landed') showLanded();
    },
    enter() { activate(RC, true); scheduleLanding(2600); },
    exit() { activate(RC, false); },
  });

  async function wiggle() {
    if (!RC || RC.animating) return;
    await G.tween(260, (e, t) => setLever(RC, Math.sin(t * Math.PI * 3) * 0.06 * (1 - t)), 'linear');
    setLever(RC, 0);
  }

  const LAND = { x: 1040, y: 696, s: 2.1 };
  let landState = 'none';
  function placeMoth(x, y, s, rot) { RC.fly.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})`); }
  function showLanded() {
    RC.land.style.display = ''; RC.fly.style.display = 'none'; RC.rest.style.display = '';
    if (RW && RW.restSmall) RW.restSmall.style.display = '';
  }
  function hideMoths() {
    landState = 'none';
    if (RC && RC.land) RC.land.style.display = 'none';
    if (RW && RW.restSmall) RW.restSmall.style.display = 'none';
  }
  let landTimer = null, landSlow = 1;
  function scheduleLanding(ms) {
    clearTimeout(landTimer);
    if (!RC || !G.get('windowOpen') || landState !== 'none') return;
    landTimer = setTimeout(async () => {
      if (G.view() !== 'window' || landState !== 'none' || !G.get('windowOpen')) return;
      landState = 'flying';
      RC.land.style.display = ''; RC.fly.style.display = ''; RC.rest.style.display = 'none';
      const P0 = [1230, 250], P1 = [560, 260], P2 = [760, 560], P3 = [LAND.x, LAND.y - 60];
      RC.fly.style.opacity = 1; RC.rest.style.opacity = 0;
      await G.tween(3400 * landSlow, (e, t) => {
        const u = 1 - e, b = [0, 1].map(i => u * u * u * P0[i] + 3 * u * u * e * P1[i] + 3 * u * e * e * P2[i] + e * e * e * P3[i]);
        const wob = Math.sin(t * 22) * 10 * (1 - e);
        placeMoth(b[0] + wob, b[1] + Math.cos(t * 17) * 8 * (1 - e), 0.8 + 1.3 * e, Math.sin(t * 9) * 25 * (1 - e));
      }, 'inOut');
      G.sfx('mothFlutter');
      // settle: the body sinks onto the sill while the spread wings fold up into the resting tent (cross-fade),
      // the lowest point of the flying sprite (11 units below its centre) never goes under the sill line
      RC.rest.style.display = '';
      const flyLow = 11 * LAND.s;
      await G.tween(380 * landSlow, e => {
        placeMoth(LAND.x, LAND.y - 60 + (60 - flyLow - 4) * e, LAND.s, 0);
        RC.fly.firstChild.setAttribute('transform', `scale(${f(1 - 0.75 * e)} 1)`);
        RC.fly.style.opacity = f(1 - e);
        RC.rest.style.opacity = f(e);
        RC.rest.setAttribute('transform', `translate(${LAND.x} ${f(LAND.y - 10 * (1 - e))}) scale(${LAND.s})`);
      }, 'inOut');
      RC.fly.firstChild.setAttribute('transform', 'scale(1)');
      RC.fly.style.opacity = 1; RC.rest.style.opacity = 1;
      RC.rest.setAttribute('transform', `translate(${LAND.x} ${LAND.y}) scale(${LAND.s})`);
      landState = 'landed';
      showLanded();
    }, ms);
  }

  // debug helper (screenshots): replay the moth's arrival
  G.debug.windowReplayLanding = (slow) => { landSlow = slow || 1; hideMoths(); scheduleLanding(0); };

  let justOpened = false;
  async function openSequence() {
    const R = RC;
    G.busy(true);
    R.animating = true;
    try {
      // key goes in
      await G.tween(350, e => setKey(R, e, 0, 1.35 - 0.35 * e), 'out');
      await G.wait(100);
      G.sfx('keyTurn');
      await G.tween(450, e => setKey(R, 1, 90 * e, 1), 'inOut');
      G.sfx('lockClick');
      await G.tween(320, e => setLever(R, e), 'outBack');
      await G.wait(150);
      // the sash swings outward
      G.sfx('windowCreak');
      await G.tween(1300, e => setOpen(R, e), 'inOut');
      G.sfx('wind');
      R.root.classList.add('win-open');
      await G.tween(900, (e, t) => R.wash.setAttribute('opacity', f(Math.sin(t * Math.PI) * 0.16)), 'linear');
      R.wash.setAttribute('opacity', 0);
    } finally {
      R.animating = false;
      justOpened = true;
      G.take('key');
      G.set('windowOpen');
      G.busy(false);
    }
    G.say('The window swings out into the rain. Moonlight spills across the room — over the desk.');
    scheduleLanding(2400);
  }

  // ---------- moonbeams on the walls ----------
  function beamObject(wall, markup, moteBox, moteDir, seed, maskRect, normalMarkup) {
    const B = { g: null, shown: false };
    G.registerWallObject(wall, {
      z: 50,
      build(g) {
        ensureCss(); ensureDefs();
        B.g = G.el('g', { class: 'win-beam win-paused', 'pointer-events': 'none', opacity: 0, style: 'display:none' }, g);
        const inner = G.el('g', {}, B.g);
        if (normalMarkup) G.svg(normalMarkup, inner);   // cold tint laid over the warm art
        const scr = G.el('g', { style: 'mix-blend-mode:screen' }, inner); // luminous core
        if (maskRect) {
          // hold the light back from a rectangle (feathered by stacked steps), so clues painted there keep their contrast
          const [x, y, w, h, keep] = maskRect, mid = 'win-bmask-' + wall;
          let steps = '';
          for (let i = 0; i < 6; i++) { const e = 42 - i * 7; steps += `<rect x="${x - e}" y="${y - e}" width="${w + 2 * e}" height="${h + 2 * e}" rx="${e + 6}" fill="#000" opacity=".22"/>`; }
          steps += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#000" opacity="${1 - keep}"/>`;
          G.svg(`<mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900"><rect width="1600" height="900" fill="#fff"/>${steps}</mask>`, B.g);
          inner.setAttribute('mask', `url(#${mid})`);
        }
        G.svg(markup, scr);
        if (moteBox) G.svg(motes(9, moteBox, seed, moteDir), scr);
      },
      update() {
        if (!B.g) return;
        const open = !!G.get('windowOpen');
        if (open && !B.shown) {
          B.shown = true;
          B.g.style.display = '';
          if (justOpened && G.view() !== wall) B.pending = true; // fade in on first visit
          else B.g.setAttribute('opacity', 1);
        } else if (!open && B.shown) {
          B.shown = false; B.pending = false;
          B.g.style.display = 'none'; B.g.setAttribute('opacity', 0);
        }
      },
      enter() {
        if (!B.g) return;
        B.g.classList.remove('win-paused');
        if (B.pending) {
          B.pending = false;
          B.g.style.transition = 'none'; B.g.style.opacity = 0;
          requestAnimationFrame(() => requestAnimationFrame(() => { B.g.style.transition = ''; B.g.style.opacity = 1; B.g.setAttribute('opacity', 1); }));
        }
      },
      exit() { if (B.g) B.g.classList.add('win-paused'); },
    });
  }

  // south: the west window is on the viewer's RIGHT. Shaft from the upper right through the air above the
  // portrait/box, its bright pool landing on the journal (x ~450-790, y ~540-620). The only south moonbeam.
  // south: a low, cold shaft from the west window (viewer's right) that runs under the projected silhouettes
  // (y > 350 across x 440-1160), past the lamp base, and lands on the journal (x ~450-790, y ~540-620).
  {
    const ax0 = [1640, 335], ax1 = [630, 582];
    const quad = (wa, wb) => [[1640, 335 - wa], [1640, 335 + wa], [640 + wb * .25, 582 + wb], [630 - wb * .25, 582 - wb]];
    beamObject('south', `
      ${taper(quad(95, 40), ax0, ax1, 70, 0.26, '#cfe3ff', '#eef6ff')}
      ${taper(quad(40, 16), ax0, ax1, 30, 0.22, '#dcebff', '#ffffff')}
      <ellipse cx="620" cy="580" rx="175" ry="40" fill="url(#win-pool)" opacity=".55"/>
      <ellipse cx="620" cy="582" rx="110" ry="20" fill="url(#win-pool)" opacity=".6"/>`,
      [700, 400, 1500, 560], [-1, 0.25], 101, null,
      `${taper(quad(110, 50), ax0, ax1, 80, 0.34, '#6f98d0', '#8fb3e8')}
      <ellipse cx="620" cy="582" rx="190" ry="44" fill="#7fa6dc" opacity=".16"/>`);
  }
  // north / west spills are provided by the room art's lighting layer (room.js buildTop, class rl-moon);
  // set EXTRA_SPILLS = true to add this module's own softer versions on top.
  const EXTRA_SPILLS = false;
  if (EXTRA_SPILLS) {
    beamObject('north', `
      ${shaft([-160, 120], [200, 860], 110, 900, 0.10)}
      <ellipse cx="150" cy="850" rx="230" ry="42" fill="url(#win-pool)" opacity=".3"/>`,
      [0, 250, 220, 780], [0.6, 1], 202);
    beamObject('west', `
      <ellipse cx="800" cy="860" rx="420" ry="52" fill="url(#win-pool)" opacity=".32"/>
      <ellipse cx="800" cy="856" rx="250" ry="28" fill="url(#win-pool)" opacity=".3"/>`,
      null, null, 303);
  }

  // ---------- hint + debug step ----------
  G.registerHint({
    id: 'window', order: 40,
    when: () => G.get('gotKey') && !G.get('windowOpen'),
    lines: ['Something in this room is fastened with a very small lock.',
      'Look closely at the round window’s latch.',
      'Fit the brass key into the latch of the round window, and turn it.'],
  });
  G.registerStep(40, 'window', () => { G.take('key'); G.set('windowOpen'); });
})();
