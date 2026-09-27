/* Boot. URL params (for testing): ?debug=1&skip=1&view=south&flags=a,b&items=x,y&solve=N */
(function () {
  'use strict';
  const P = new URLSearchParams(location.search);
  function boot() {
    G.debugMode = P.get('debug') === '1';
    G.init();
    if (window.UI && UI.init) UI.init();
    if (P.get('skip') === '1') {
      G.start();
      if (window.UI && UI.hideTitle) UI.hideTitle(true);
      (async () => {
        if (P.get('solve')) await G.debug.solveTo(+P.get('solve'));
        (P.get('flags') || '').split(',').filter(Boolean).forEach(f => G.set(f, true));
        (P.get('items') || '').split(',').filter(Boolean).forEach(i => G.give(i));
        if (P.get('view')) await G.go(P.get('view'), { instant: true });
        G.refresh();
        document.body.dataset.ready = '1';
      })();
    } else {
      if (window.UI && UI.showTitle) UI.showTitle();
      document.body.dataset.ready = '1';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
