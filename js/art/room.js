/* STUB — Room-art agent replaces. Registers G.registerWallBase for each wall. */
(function(){ ['north','east','south','west'].forEach(w => G.registerWallBase(w, { build(g){ G.svg(`<rect width="1600" height="900" fill="#3e4b3c"/><rect y="790" width="1600" height="110" fill="#3a2418"/><text x="40" y="60" fill="#e8dcc0" font-size="32">${w}</text>`, g); } })); })();
