/* Shared SVG <defs>: filters, gradients, patterns used across all art.
 * Owned by the Room-art agent; other modules may rely on these ids:
 *   #ink         subtle hand-drawn wobble for line art
 *   #paper       paper fibre texture (apply to paper/parchment shapes)
 *   #softshadow  soft drop shadow
 *   #glow        warm bloom for flames / lit things
 *   #moonglow    cold bloom for moonlit things
 *   #blur2 #blur6 #blur20  gaussian blurs
 *   #gCandle #gBrass #gWalnut  shared gradients
 * Room-art additions (free to reuse): #pWall (sage damask wallpaper pattern), #gBeam, #gCeil, #gPanel,
 *   #gShadow (radial contact shadow — use on an <ellipse>), #gRailShadow, #gGilt, #gLegWood, #gGlass,
 *   #gMoteW / #gMoteC (warm / cool dust mote), #gRipple, #gPaperAge (aged-paper edge darkening).
 * room.js also adds #pGrain and #gVignette at boot (used by the global grade in #fx).
 */
(function () {
  'use strict';
  window.ART = window.ART || {};
  ART.defs = `
  <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="8" result="t"/>
    <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.18  0 0 0 0.22 0" result="tc"/>
    <feComposite in="tc" in2="SourceGraphic" operator="in" result="tx"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="tx"/></feMerge>
  </filter>
  <filter id="softshadow" x="-20%" y="-20%" width="140%" height="150%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
    <feOffset dx="0" dy="6" result="o"/>
    <feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="moonglow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b"/>
    <feColorMatrix in="b" type="matrix" values="0.6 0 0 0 0.2  0 0.7 0 0 0.25  0 0 1 0 0.35  0 0 0 1 0" result="c"/>
    <feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="blur20" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="20"/></filter>
  <radialGradient id="gCandle" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ffcf7a" stop-opacity="0.55"/>
    <stop offset="0.5" stop-color="#e0853a" stop-opacity="0.18"/>
    <stop offset="1" stop-color="#e0853a" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="gBrass" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e7c476"/><stop offset="0.45" stop-color="#b8893a"/><stop offset="1" stop-color="#6e4d1c"/>
  </linearGradient>
  <linearGradient id="gWalnut" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7a4e30"/><stop offset="0.6" stop-color="#5a3824"/><stop offset="1" stop-color="#3a2418"/>
  </linearGradient>

  <!-- ===== room art (room.js) ===== -->
  <g id="dmHalf">
    <path d="M0,-46 C7,-36 15,-31 14,-20 C13,-11 5,-9 6,-2 C7,6 18,5 22,14 C26,25 17,36 0,44 Z"/>
    <path d="M3,-5 C12,-15 27,-15 31,-4 C25,-8 15,-6 9,2 Z"/>
    <path d="M2,31 C12,35 22,41 25,52 C18,46 10,42 2,39 Z"/>
    <path d="M4,-40 C10,-52 20,-56 26,-50 C18,-50 12,-46 6,-38 Z"/>
  </g>
  <g id="dmMotif">
    <g fill="#4d5c48"><use href="#dmHalf"/><use href="#dmHalf" transform="scale(-1,1)"/></g>
    <path d="M0,-32 C5,-25 7,-20 6,-14 C5,-9 2,-8 0,-8 C-2,-8 -5,-9 -6,-14 C-7,-20 -5,-25 0,-32 Z" fill="#3b4839"/>
    <circle cy="14" r="6" fill="#58664f"/><circle cy="14" r="2.4" fill="#3b4839"/>
    <circle cy="-50" r="2.4" fill="#58664f"/>
  </g>
  <g id="dmRosette" fill="#4b5946">
    <circle r="5"/><circle cx="0" cy="-9" r="3"/><circle cx="0" cy="9" r="3"/><circle cx="-9" cy="0" r="3"/><circle cx="9" cy="0" r="3"/>
  </g>
  <pattern id="pWall" patternUnits="userSpaceOnUse" width="140" height="180">
    <rect width="140" height="180" fill="#3e4b3c"/>
    <g fill="none" stroke="#475644" stroke-width="2.4">
      <path d="M0,0 C38,18 44,62 70,90 C96,118 102,162 140,180"/>
      <path d="M140,0 C102,18 96,62 70,90 C44,118 38,162 0,180"/>
    </g>
    <g fill="none" stroke="#56634f" stroke-width="0.8" stroke-opacity="0.5">
      <path d="M0,4 C36,22 41,64 66,92"/><path d="M140,4 C104,22 99,64 74,92"/>
    </g>
    <use href="#dmMotif" x="70" y="0"/><use href="#dmMotif" x="70" y="180"/>
    <use href="#dmMotif" x="0" y="90"/><use href="#dmMotif" x="140" y="90"/>
    <use href="#dmRosette" x="70" y="90"/>
    <use href="#dmRosette" x="0" y="0"/><use href="#dmRosette" x="140" y="0"/><use href="#dmRosette" x="0" y="180"/><use href="#dmRosette" x="140" y="180"/>
  </pattern>
  <linearGradient id="gCeil" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#15120e"/><stop offset="1" stop-color="#2a241c"/>
  </linearGradient>
  <linearGradient id="gBeam" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6b4329"/><stop offset="0.35" stop-color="#553421"/><stop offset="1" stop-color="#2e1c12"/>
  </linearGradient>
  <linearGradient id="gWallTone" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="900">
    <stop offset="0" stop-color="#070b09" stop-opacity="0.75"/>
    <stop offset="0.12" stop-color="#070b09" stop-opacity="0.42"/>
    <stop offset="0.34" stop-color="#070b09" stop-opacity="0.05"/>
    <stop offset="0.6" stop-color="#070b09" stop-opacity="0.08"/>
    <stop offset="0.88" stop-color="#070b09" stop-opacity="0.35"/>
  </linearGradient>
  <linearGradient id="gWallSides" gradientUnits="userSpaceOnUse" x1="70" y1="0" x2="1530" y2="0">
    <stop offset="0" stop-color="#050807" stop-opacity="0.6"/>
    <stop offset="0.1" stop-color="#050807" stop-opacity="0.15"/>
    <stop offset="0.2" stop-color="#050807" stop-opacity="0"/>
    <stop offset="0.8" stop-color="#050807" stop-opacity="0"/>
    <stop offset="0.9" stop-color="#050807" stop-opacity="0.15"/>
    <stop offset="1" stop-color="#050807" stop-opacity="0.6"/>
  </linearGradient>
  <linearGradient id="gRailShadow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity="0.5"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="gPanel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3a261a"/><stop offset="1" stop-color="#26180f"/>
  </linearGradient>
  <linearGradient id="gFloorDepth" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#050302" stop-opacity="0.55"/><stop offset="0.25" stop-color="#050302" stop-opacity="0.1"/><stop offset="1" stop-color="#050302" stop-opacity="0.35"/>
  </linearGradient>
  <radialGradient id="gShadow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#040302" stop-opacity="0.8"/><stop offset="0.55" stop-color="#040302" stop-opacity="0.45"/><stop offset="1" stop-color="#040302" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gBlotchD" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#141b15" stop-opacity="0.45"/><stop offset="1" stop-color="#141b15" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gBlotchL" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#7d8a6c" stop-opacity="0.22"/><stop offset="1" stop-color="#7d8a6c" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gMoteW" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#fff1c1" stop-opacity="1"/><stop offset="0.4" stop-color="#ffcf7a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gMoteC" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#eef6ff" stop-opacity="1"/><stop offset="0.4" stop-color="#cfe3ff" stop-opacity="0.5"/><stop offset="1" stop-color="#cfe3ff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="gGilt" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#e7c476"/><stop offset="0.3" stop-color="#b8893a"/><stop offset="0.55" stop-color="#d9b060"/><stop offset="0.8" stop-color="#8a6428"/><stop offset="1" stop-color="#6e4d1c"/>
  </linearGradient>
  <linearGradient id="gLegWood" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#2a190f"/><stop offset="0.35" stop-color="#7a4e30"/><stop offset="0.55" stop-color="#5a3824"/><stop offset="1" stop-color="#1f130c"/>
  </linearGradient>
  <radialGradient id="gRipple" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#000" stop-opacity="0.8"/><stop offset="0.5" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gPaperAge" cx="50%" cy="45%" r="70%">
    <stop offset="0.5" stop-color="#8a6a3a" stop-opacity="0"/><stop offset="1" stop-color="#8a6a3a" stop-opacity="0.45"/>
  </radialGradient>
  <linearGradient id="gDeskSheen" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.06"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.1"/><stop offset="0.7" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#cfe3ff" stop-opacity="0.22"/><stop offset="0.18" stop-color="#cfe3ff" stop-opacity="0.05"/><stop offset="0.8" stop-color="#cfe3ff" stop-opacity="0.04"/><stop offset="1" stop-color="#cfe3ff" stop-opacity="0.18"/>
  </linearGradient>
  `;
  document.addEventListener('DOMContentLoaded', () => {
    const d = document.getElementById('defs');
    if (d) d.insertAdjacentHTML('beforeend', ART.defs);
  });
})();
