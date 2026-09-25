/* Shared SVG <defs>: filters, gradients, patterns used across all art.
 * Owned by the Room-art agent; other modules may rely on these ids:
 *   #ink         subtle hand-drawn wobble for line art
 *   #paper       paper fibre texture (apply to paper/parchment shapes)
 *   #softshadow  soft drop shadow
 *   #glow        warm bloom for flames / lit things
 *   #moonglow    cold bloom for moonlit things
 *   #blur2 #blur6 #blur20  gaussian blurs
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
  `;
  document.addEventListener('DOMContentLoaded', () => {
    const d = document.getElementById('defs');
    if (d) d.insertAdjacentHTML('beforeend', ART.defs);
  });
})();
