/* THE MOTH KEEPER — core engine.  Exposes window.G.
 *
 * Stage: one <svg id="stage" viewBox="0 0 1600 900">. Every view is a <g> inside #views.
 * Walls ('north','east','south','west') are views built from a wall base (room art) + wall objects (puzzle art).
 * Close-up views are registered by modules with a `parent` (the view the back arrow returns to).
 *
 * API summary
 *   G.registerWallBase(wall, {build(g), update()})
 *   G.registerWallObject(wall, {z=0, build(g), update()})
 *   G.registerView(id, {parent, build(g), update(), enter(), exit()})
 *   G.registerItem(id, {name, desc, icon /* svg markup in a 0 0 100 100 box *\/ , inspect()?})
 *   G.registerHint({id, order, when:()=>bool, lines:[nudge, stronger, answer]})
 *   G.registerStep(order, name, fn)          // debug: solve helpers, run in order by G.debug.solveTo(n)
 *   G.hotspot(elem, {click(), use(itemId)=>true|false|undefined, cursor:'look'|'use'|'take'|'go', fail:'text'})
 *   G.go(viewId), G.back(), G.view()
 *   G.set(flag, value=true), G.get(flag)
 *   G.give(itemId, fromElem?), G.take(itemId), G.has(itemId), G.selected(), G.select(itemId|null)
 *   G.say(text, {dur}), G.sfx(name), G.busy(bool)
 *   G.el(tag, attrs, parent), G.svg(markup, parent) -> <g>, G.toStage(evt) -> {x,y}
 *   G.tween(ms, fn(t), ease='inOut') -> Promise, G.wait(ms), G.ease.{linear,in,out,inOut,outBack}
 *   G.on(evt, fn): events 'flag'(k,v) 'give'(id,fromEl) 'take'(id) 'select'(id) 'say'(text,opts) 'view'(id,prev)
 *                  'busy'(bool) 'start' 'finish' 'hint'(hintObj) 'refresh'
 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const WALLS = ['north', 'east', 'south', 'west'];
  const SAVE_KEY = 'mothkeeper.save.v1';

  const state = { flags: {}, inv: [], sel: null, view: 'north', hint: {}, started: false };
  const views = {};
  const wallBases = {};
  const wallObjects = { north: [], east: [], south: [], west: [] };
  const items = {};
  const hints = [];
  const steps = [];
  const bus = {};
  let busyCount = 0;
  let stage, viewsRoot;

  // ---------- events ----------
  function on(evt, fn) { (bus[evt] || (bus[evt] = [])).push(fn); }
  function emit(evt, ...a) { (bus[evt] || []).forEach(f => { try { f(...a); } catch (e) { console.error(e); } }); }

  // ---------- dom helpers ----------
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svg(markup, parent) {
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = markup;
    if (parent) parent.appendChild(g);
    return g;
  }
  function toStage(evt) {
    const pt = stage.createSVGPoint();
    const src = evt.touches ? evt.touches[0] : evt;
    pt.x = src.clientX; pt.y = src.clientY;
    const p = pt.matrixTransform(stage.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
  }

  // ---------- timing ----------
  const ease = {
    linear: t => t,
    in: t => t * t * t,
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  function tween(ms, fn, e) {
    const f = typeof e === 'function' ? e : ease[e || 'inOut'];
    return new Promise(res => {
      const t0 = performance.now();
      (function frame(now) {
        const t = Math.min(1, (now - t0) / ms);
        fn(f(t), t);
        if (t < 1) requestAnimationFrame(frame); else res();
      })(t0);
    });
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ---------- registration ----------
  function registerWallBase(wall, def) { wallBases[wall] = def; }
  function registerWallObject(wall, def) { def.z = def.z || 0; wallObjects[wall].push(def); }
  function registerView(id, def) { def.id = id; views[id] = def; }
  function registerItem(id, def) { def.id = id; items[id] = def; }
  function registerHint(def) { hints.push(def); hints.sort((a, b) => a.order - b.order); }
  function registerStep(order, name, fn) { steps.push({ order, name, fn }); steps.sort((a, b) => a.order - b.order); }

  WALLS.forEach(w => {
    registerView(w, {
      wall: true,
      build(g) {
        const base = el('g', { class: 'wall-base' }, g);
        if (wallBases[w] && wallBases[w].build) wallBases[w].build(base);
        wallObjects[w].sort((a, b) => a.z - b.z).forEach(o => {
          o.g = el('g', { class: 'wall-obj' }, g);
          if (o.build) o.build(o.g);
        });
        // top-most layer for anything the room art wants above objects (lighting, dust)
        if (wallBases[w] && wallBases[w].buildTop) wallBases[w].buildTop(el('g', { class: 'wall-top', 'pointer-events': 'none' }, g));
      },
      update() {
        if (wallBases[w] && wallBases[w].update) wallBases[w].update();
        wallObjects[w].forEach(o => o.update && o.update());
      },
      enter() {
        if (wallBases[w] && wallBases[w].enter) wallBases[w].enter();
        wallObjects[w].forEach(o => o.enter && o.enter());
      },
      exit() {
        if (wallBases[w] && wallBases[w].exit) wallBases[w].exit();
        wallObjects[w].forEach(o => o.exit && o.exit());
      },
    });
  });

  // ---------- flags / items ----------
  function get(k) { return state.flags[k]; }
  function set(k, v) {
    if (v === undefined) v = true;
    if (state.flags[k] === v) return;
    state.flags[k] = v;
    emit('flag', k, v);
    refresh();
    save();
  }
  function has(id) { return state.inv.includes(id); }
  function give(id, fromEl) {
    if (has(id)) return;
    state.inv.push(id);
    sfx('pickup');
    emit('give', id, fromEl);
    save();
  }
  function take(id) {
    const i = state.inv.indexOf(id);
    if (i < 0) return;
    state.inv.splice(i, 1);
    if (state.sel === id) select(null);
    emit('take', id);
    save();
  }
  function selected() { return state.sel; }
  function select(id) {
    state.sel = id && has(id) ? id : null;
    document.body.classList.toggle('item-selected', !!state.sel);
    emit('select', state.sel);
  }

  // ---------- captions / sound / busy ----------
  function say(text, opts) { emit('say', text, opts || {}); }
  function sfx(name, opts) { try { if (window.Audio2 && window.Audio2.play) window.Audio2.play(name, opts); } catch (e) { console.warn(e); } }
  function busy(b) {
    busyCount = Math.max(0, busyCount + (b ? 1 : -1));
    document.body.classList.toggle('busy', busyCount > 0);
    emit('busy', busyCount > 0);
  }
  function isBusy() { return busyCount > 0; }

  // ---------- hotspots ----------
  const FAILS = ["That doesn't fit there.", "Nothing happens.", "That won't help here.", "No — not like that."];
  function hotspot(target, opts) {
    target.classList.add('hot', 'cur-' + (opts.cursor || 'use'));
    target.addEventListener('click', ev => {
      ev.stopPropagation();
      if (busyCount > 0) return;
      const sel = state.sel;
      if (sel) {
        if (opts.use) {
          const r = opts.use(sel);
          if (r === true) return;
          if (r === false || !opts.click) {
            sfx('lockFail');
            say(opts.fail || FAILS[Math.floor(Math.random() * FAILS.length)]);
            select(null);
            return;
          }
        } else if (!opts.click) {
          say(opts.fail || FAILS[Math.floor(Math.random() * FAILS.length)]);
          select(null);
          return;
        }
      }
      if (opts.click) opts.click(ev);
    });
    return target;
  }

  // ---------- navigation ----------
  function buildAll() {
    Object.values(views).forEach(v => {
      v.g = el('g', { class: 'view', 'data-view': v.id, style: 'display:none' }, viewsRoot);
      try { v.build && v.build(v.g); } catch (e) { console.error('build failed:', v.id, e); }
      v.built = true;
    });
  }
  function view() { return state.view; }
  function show(id) {
    Object.values(views).forEach(v => { if (v.g) v.g.style.display = v.id === id ? '' : 'none'; });
  }
  // a nav request that arrives mid-transition is queued (never silently dropped) and replaces
  // any earlier queued request, so back-to-back clicks land on the last-intended view.
  let navigating = false, queuedGo = null;
  async function go(id, opts) {
    opts = opts || {};
    if (!views[id]) return;
    if (navigating) { queuedGo = [id, opts]; return; }
    const prev = state.view;
    if (prev === id) return;
    navigating = true;
    const fade = document.getElementById('fade');
    const dur = opts.instant ? 0 : (opts.dur || 170);
    if (dur && fade) { fade.style.transition = `opacity ${dur}ms ease`; fade.style.opacity = 1; await wait(dur); }
    try { views[prev] && views[prev].exit && views[prev].exit(); } catch (e) { console.error(e); }
    state.view = id;
    show(id);
    try { views[id].update && views[id].update(); } catch (e) { console.error(e); }
    try { views[id].enter && views[id].enter(); } catch (e) { console.error(e); }
    emit('view', id, prev);
    save();
    if (dur && fade) { fade.style.opacity = 0; await wait(dur); }
    navigating = false;
    if (queuedGo) { const [qid, qopts] = queuedGo; queuedGo = null; go(qid, qopts); }
  }
  function back() { const v = views[state.view]; if (v && v.parent) { sfx('back'); go(v.parent); } }
  function turn(dir) {
    const i = WALLS.indexOf(state.view);
    if (i < 0) return;
    sfx('step');
    go(WALLS[(i + dir + 4) % 4], { dur: 140 });
  }
  function refresh() {
    Object.values(views).forEach(v => { if (v.built && v.update) { try { v.update(); } catch (e) { console.error('update failed:', v.id, e); } } });
    emit('refresh');
  }

  // ---------- hints ----------
  function currentHint() { return hints.find(h => { try { return h.when(); } catch (e) { return false; } }); }
  function nextHint(peekOnly) {
    const h = currentHint();
    if (!h) return null;
    const lvl = state.hint[h.id] || 0;
    const i = Math.min(lvl, h.lines.length - 1);
    const out = { id: h.id, level: i, max: h.lines.length - 1, text: h.lines[i], isAnswer: i === h.lines.length - 1 };
    if (!peekOnly) { state.hint[h.id] = lvl + 1; save(); emit('hint', out); }
    return out;
  }

  // ---------- save ----------
  function save() {
    if (!state.started || G.debugMode) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ flags: state.flags, inv: state.inv, view: state.view, hint: state.hint })); } catch (e) { }
  }
  function hasSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return !!(s && Object.keys(s.flags || {}).length); } catch (e) { return false; } }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!s) return false;
      state.flags = s.flags || {}; state.inv = s.inv || []; state.hint = s.hint || {};
      state.view = views[s.view] ? s.view : 'north';
      if (state.flags.finished) { resetSave(); return false; }
      return true;
    } catch (e) { return false; }
  }
  function resetSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
    state.flags = {}; state.inv = []; state.hint = {}; state.sel = null; state.view = 'north';
  }

  // ---------- boot ----------
  function init() {
    stage = document.getElementById('stage');
    viewsRoot = document.getElementById('views');
    stage.addEventListener('click', () => { if (state.sel && busyCount === 0) select(null); });
    buildAll();
    show(state.view);
    refresh();
  }
  function start(opts) {
    opts = opts || {};
    if (opts.continue) load(); else resetSave();
    state.started = true;
    show(state.view);
    refresh();
    Object.values(views).forEach(v => { if (v.id === state.view && v.enter) v.enter(); });
    emit('view', state.view, null);
    emit('start');
    save();
  }
  function finish() { set('finished', true); emit('finish'); try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }

  // ---------- debug ----------
  const debug = {
    state,
    views, items, hints, steps,
    async solveTo(n) { for (const s of steps) { if (s.order > n) break; await s.fn(); } refresh(); },
    listSteps() { return steps.map(s => s.order + ' ' + s.name); },
  };

  const G = window.G = {
    WALLS, state, items, views,
    on, emit, el, svg, toStage, tween, wait, ease,
    registerWallBase, registerWallObject, registerView, registerItem, registerHint, registerStep,
    get, set, has, give, take, selected, select,
    say, sfx, busy, isBusy, hotspot,
    go, back, turn, view, refresh,
    currentHint, nextHint,
    save, load, hasSave, resetSave, init, start, finish,
    debug, debugMode: false,
  };
})();
