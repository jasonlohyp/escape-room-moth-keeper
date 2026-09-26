/* THE MOTH KEEPER — procedural audio.  Exposes window.Audio2.
 *
 *   Audio2.play(name, {vol, pan, delay})   one-shot SFX (names in DESIGN.md)
 *   Audio2.unlock()                        create/resume the AudioContext (call from a user gesture)
 *   Audio2.setMuted(bool) / isMuted() / setVolume(0..1) / getVolume()
 *
 * No audio files: everything is synthesised with Web Audio (oscillators, generated noise / impulse-train /
 * crackle buffers, biquad resonators, convolution reverb from generated impulse responses).
 * Every SFX is a function (K, t, o) where K = {c: context, out: dry bus, wet: reverb send, nb: noise buffers},
 * so it can be rendered in an OfflineAudioContext for level checks (Audio2._offline(name)).
 *
 * Ambience (rain, room tone, thunder, house creaks, gutter drips, wind, lamp, music-box score + drone)
 * starts on G.on('start') once audio is unlocked, and follows flags / the current view.
 * Everything fails silently when Web Audio is unavailable.
 */
(function () {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  const R = Math.random;
  const rr = (a, b) => a + (b - a) * R();
  const pick = a => a[Math.floor(R() * a.length)];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const MUTE_KEY = 'mothkeeper.muted';

  let ctx = null, master = null, comp = null, sfxBus = null, ambBus = null, musBus = null;
  let roomRev = null, hallRev = null, wow = null;
  let muted = false, volume = 0.8;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { }

  /* =====================================================================================
   *  Buffers
   * ===================================================================================== */
  const nbCache = new WeakMap();
  function noiseBuffers(c) {
    let nb = nbCache.get(c);
    if (nb) return nb;
    const sr = c.sampleRate, n = Math.floor(sr * 4);
    const mk = () => c.createBuffer(1, n, sr);
    const w = mk(), p = mk(), b = mk();
    const wd = w.getChannelData(0), pd = p.getChannelData(0), bd = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, br = 0;
    for (let i = 0; i < n; i++) {
      const x = R() * 2 - 1;
      wd[i] = x * 0.5;
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
      pd[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
      br = (br + 0.02 * x) / 1.02; bd[i] = br * 3.5;
    }
    // crossfade loop seams
    const xf = Math.floor(sr * 0.05);
    [wd, pd, bd].forEach(d => { for (let i = 0; i < xf; i++) { const a = i / xf; d[i] = d[i] * a + d[n - xf + i] * (1 - a); } });
    nb = { white: w, pink: p, brown: b };
    nbCache.set(c, nb);
    return nb;
  }

  // Convolution reverb IR: early reflections + exponentially decaying, progressively darker noise tail.
  function buildIR(c, dur, damp, pre, er) {
    const sr = c.sampleRate, n = Math.floor(sr * dur), b = c.createBuffer(2, n, sr);
    const p0 = Math.floor(sr * pre);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = p0; i < n; i++) {
        const x = (i - p0) / (n - p0), tt = (i - p0) / sr;
        const k = 1 - Math.min(0.97, (0.15 + 0.8 * x) * damp);
        lp += k * ((R() * 2 - 1) - lp);
        d[i] = lp * Math.exp(-6.9 * tt / (dur - pre)) * Math.min(1, tt / 0.012);
      }
      for (let j = 0; j < er; j++) { // early reflections
        const i = p0 + Math.floor(sr * rr(0.003, 0.045));
        if (i < n) d[i] += (R() < 0.5 ? -1 : 1) * rr(0.3, 0.9) * (1 - j / er);
      }
    }
    return b;
  }

  // Stick-slip friction: impulse train with wandering rate; fed through wood resonators it becomes a creak.
  function creakBuf(c, dur, r0, rm, r1, jit, flick) {
    const sr = c.sampleRate, n = Math.max(1, Math.floor(dur * sr)), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
    let t = rr(0, 0.01), wob = 0, amp = 1;
    const tail = Math.floor(sr * 0.0025), tau = sr * 0.0005;
    while (t < dur) {
      const x = t / dur;
      const rate = (1 - x) * (1 - x) * r0 + 2 * x * (1 - x) * rm + x * x * r1;
      wob = wob * 0.92 + (R() - 0.5) * 0.18;
      const period = (1 / Math.max(5, rate * (1 + wob))) * (1 + (R() - 0.5) * jit);
      amp = amp * 0.7 + 0.3 * (R() < flick ? rr(0, 0.35) : rr(0.7, 1));
      const e = Math.pow(Math.sin(Math.PI * Math.min(1, x)), 0.5) * amp;
      const i0 = Math.floor(t * sr);
      for (let k = 0; k < tail && i0 + k < n; k++) d[i0 + k] += e * Math.exp(-k / tau) * (k < 2 ? 1 : (R() - 0.5) * 0.8);
      t += period;
    }
    return b;
  }

  // Sparse random clicks (paper, fizz, fire, cocoon). dens(x) = events/sec, x in 0..1.
  function crackleBuf(c, dur, dens, grainMs, pow) {
    const sr = c.sampleRate, n = Math.max(1, Math.floor(dur * sr)), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
    let t = 0;
    while (t < dur) {
      const x = t / dur, de = Math.max(0.5, dens(x));
      t += -Math.log(1 - R() * 0.999) / de;
      if (t >= dur) break;
      const i0 = Math.floor(t * sr), a = Math.pow(R(), pow || 2.5) * (R() < 0.5 ? -1 : 1);
      const len = Math.floor(sr * grainMs / 1000 * rr(0.4, 1.4)), tau = len / 3;
      for (let k = 0; k < len && i0 + k < n; k++) d[i0 + k] += a * Math.exp(-k / tau) * (R() * 2 - 1);
    }
    return b;
  }

  // Wing beats: soft noise grains at beatHz with a burst envelope.
  function flutterBuf(c, dur, hz) {
    const sr = c.sampleRate, n = Math.floor(dur * sr), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
    let t = 0;
    while (t < dur) {
      const per = 1 / (hz * rr(0.9, 1.1)), x = t / dur;
      const env = Math.sin(Math.PI * x) * rr(0.55, 1);
      const i0 = Math.floor(t * sr), len = Math.floor(per * sr * 0.7);
      for (let k = 0; k < len && i0 + k < n; k++) {
        const w = Math.sin(Math.PI * k / len);
        d[i0 + k] += env * w * w * (R() * 2 - 1);
      }
      t += per;
    }
    return b;
  }

  /* =====================================================================================
   *  Primitive voices
   * ===================================================================================== */
  function env(p, t, a, peak, d, hold) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    if (hold) p.setValueAtTime(peak, t + a + hold);
    p.exponentialRampToValueAtTime(0.0001, t + a + (hold || 0) + d);
  }
  // Output node for one SFX: gain -> pan -> dry + reverb send.
  function voice(K, o, rev) {
    const c = K.c, g = c.createGain();
    g.gain.value = o.vol == null ? 1 : o.vol;
    let node = g;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(o.pan == null ? rr(-0.12, 0.12) : o.pan, -1, 1); g.connect(p); node = p; }
    node.connect(K.out);
    const nodes = [g];
    if (node !== g) nodes.push(node);
    if (K.wet && rev > 0) { const s = c.createGain(); s.gain.value = rev; node.connect(s); s.connect(K.wet); nodes.push(s); }
    g.__vr = { n: 0, nodes };
    return g;
  }
  // Reference-count sources feeding a voice(); the voice's gain/pan/send are disconnected after the last one ends.
  function track(dest) {
    const r = dest && dest.__vr;
    if (!r) return null;
    r.n++;
    return () => { if (--r.n <= 0) setTimeout(() => { if (r.n <= 0) r.nodes.forEach(n => { try { n.disconnect(); } catch (e) { } }); }, 60); };
  }
  function tone(K, dest, p) {
    const c = K.c, o = c.createOscillator(), g = c.createGain();
    const a = p.a == null ? 0.002 : p.a, end = p.t + a + (p.hold || 0) + p.d;
    o.type = p.type || 'sine';
    o.frequency.setValueAtTime(p.f, p.t);
    if (p.f1) o.frequency.exponentialRampToValueAtTime(p.f1, p.t + (p.glide || p.d));
    if (p.detune) o.detune.value = p.detune;
    const w = p.wow && K.wow;
    if (w) K.wow.connect(o.detune);
    env(g.gain, p.t, a, p.g, p.d, p.hold);
    o.connect(g); g.connect(dest);
    const done = track(dest);
    o.onended = () => { try { if (w) w.disconnect(o.detune); o.disconnect(); g.disconnect(); } catch (e) { } if (done) done(); };
    o.start(p.t); o.stop(end + 0.05);
    return g;
  }
  // filters: [{type, f, q, gain, pts:[[dt, f], ...]}]
  function filt(K, n, t, fl) {
    const b = K.c.createBiquadFilter();
    b.type = fl.type; b.frequency.setValueAtTime(fl.f, t);
    if (fl.pts) fl.pts.forEach(([dt, f]) => b.frequency.exponentialRampToValueAtTime(f, t + dt));
    b.Q.value = fl.q == null ? 0.707 : fl.q;
    if (fl.gain != null) b.gain.value = fl.gain;
    n.connect(b);
    return b;
  }
  function noise(K, dest, p) {
    const c = K.c, s = c.createBufferSource(), custom = p.buf && typeof p.buf === 'object';
    s.buffer = custom ? p.buf : K.nb[p.buf || 'white'];
    s.loop = !custom;
    if (p.rate) s.playbackRate.value = p.rate;
    const a = p.a == null ? 0.002 : p.a, dur = custom && p.flat ? s.buffer.duration / (p.rate || 1) : a + (p.hold || 0) + p.d;
    let n = s;
    (p.filters || []).forEach(fl => { n = filt(K, n, p.t, fl); });
    const g = c.createGain();
    if (p.flat) g.gain.value = p.g; else env(g.gain, p.t, a, p.g, p.d, p.hold);
    n.connect(g); g.connect(dest);
    const done = track(dest);
    s.onended = () => { try { s.disconnect(); g.disconnect(); } catch (e) { } if (done) done(); };
    s.start(p.t, custom ? 0 : R() * (s.buffer.duration - dur - 0.1 > 0 ? s.buffer.duration - dur - 0.1 : 0));
    s.stop(p.t + dur + 0.05);
    return g;
  }
  // Parallel resonator bank (used for creaks / rumbles); res: [[f, q, gain], ...]
  function resBank(K, dest, t, buf, res, g, rate) {
    const c = K.c, s = c.createBufferSource(), out = c.createGain();
    s.buffer = buf; if (rate) s.playbackRate.value = rate;
    out.gain.value = g;
    res.forEach(([f, q, gg]) => {
      const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f * rr(0.96, 1.04); b.Q.value = q;
      const bg = c.createGain(); bg.gain.value = (gg == null ? 1 : gg) * Math.sqrt(q);
      s.connect(b); b.connect(bg); bg.connect(out);
    });
    out.connect(dest);
    const done = track(dest);
    s.onended = () => { try { s.disconnect(); out.disconnect(); } catch (e) { } if (done) done(); };
    s.start(t); s.stop(t + buf.duration / (rate || 1) + 0.05);
  }
  function creak(K, dest, t, p) {
    const buf = creakBuf(K.c, p.dur, p.r0, p.rm, p.r1, p.jit == null ? 0.25 : p.jit, p.flick == null ? 0.12 : p.flick);
    resBank(K, dest, t, buf, p.res, p.g);
  }

  // ---- compound atoms ----
  function woodKnock(K, dest, t, f, g, dec) {
    dec = dec || 0.09;
    tone(K, dest, { f: f * 1.5, f1: f, glide: 0.012, t, d: dec, g: g * 0.8 });
    tone(K, dest, { f: f * 2.43, t, d: dec * 0.5, g: g * 0.3 });
    tone(K, dest, { f: f * 3.9, t, d: dec * 0.25, g: g * 0.18 });
    noise(K, dest, { t, a: 0.001, d: 0.025, g: g * 0.7, filters: [{ type: 'bandpass', f: f * 4, q: 0.9 }] });
  }
  function metalTick(K, dest, t, g, bright) {
    bright = bright || 1;
    noise(K, dest, { t, a: 0.0004, d: 0.007, g: g, filters: [{ type: 'highpass', f: 2200 * bright }, { type: 'peaking', f: 4800 * bright, q: 2, gain: 8 }] });
    [rr(2900, 3300), rr(4400, 5200), rr(6800, 7600)].forEach((f, i) =>
      tone(K, dest, { f: Math.min(15000, f * bright), t, a: 0.0005, d: 0.04 / (i + 1) + 0.01, g: g * 0.14 / (i + 1) }));
  }
  function thud(K, dest, t, f, g, dec) {
    dec = dec || 0.12;
    tone(K, dest, { f: f * 1.8, f1: f, glide: 0.02, t, d: dec, g });
    tone(K, dest, { f: f * 2.7, t, d: dec * 0.4, g: g * 0.2 });
    noise(K, dest, { t, a: 0.001, d: dec * 0.5, g: g * 0.8, filters: [{ type: 'lowpass', f: f * 6, q: 0.8 }] });
  }
  const BELL = [[0.5, 0.32, 1.0], [1, 0.6, 0.8], [1.183, 0.34, 0.55], [1.506, 0.2, 0.45], [2, 0.38, 0.38],
    [2.514, 0.13, 0.28], [2.662, 0.17, 0.26], [3.011, 0.1, 0.2], [4.166, 0.07, 0.13], [5.433, 0.05, 0.09], [6.8, 0.03, 0.06]];
  function bell(K, dest, t, f, g, dec) {
    BELL.forEach(([r, a, dm]) => {
      const fr = f * r * (1 + (R() - 0.5) * 0.003);
      if (fr > 16000) return;
      tone(K, dest, { f: fr, t, a: 0.0015, d: dec * dm, g: g * a });
      if (r <= 2) tone(K, dest, { f: fr + rr(0.5, 1.6), t, a: 0.003, d: dec * dm, g: g * a * 0.5 }); // slow beating
    });
    noise(K, dest, { t, a: 0.0005, d: 0.04, g: g * 0.35, filters: [{ type: 'bandpass', f: Math.min(9000, f * 6), q: 1.5 }] });
    tone(K, dest, { f: f * 0.9, f1: f * 0.5, glide: 0.03, t, d: 0.08, g: g * 0.25 });
  }
  // Music-box / celesta tine: detuned fundamental pair, octave, inharmonic tine mode, pluck.
  function mbNote(K, dest, t, f, v, o) {
    o = o || {};
    const dec = (o.decay || 2.6) * Math.pow(523 / f, 0.35);
    const det = (R() - 0.5) * 8;
    tone(K, dest, { f, t, a: 0.003, d: dec, g: v * 0.5, detune: det, wow: true });
    tone(K, dest, { f, t, a: 0.005, d: dec * 0.85, g: v * 0.25, detune: det + (o.chorus == null ? 7 : o.chorus), wow: true });
    tone(K, dest, { f: f * 2.004, t, a: 0.002, d: dec * 0.3, g: v * 0.12 });
    if (f * 5.93 < 15000) tone(K, dest, { f: f * 5.93, t, a: 0.001, d: 0.14, g: v * 0.07 });
    if (f * 8.9 < 15000) tone(K, dest, { f: f * 8.9, t, a: 0.001, d: 0.05, g: v * 0.03 });
    noise(K, dest, { t, a: 0.0005, d: 0.012, g: v * 0.1, filters: [{ type: 'highpass', f: 3500 }] });
  }
  // Bowed-string bed: band-limited pulse (bow/string), delayed vibrato, bow-hair noise, wooden body formants.
  const pwCache = new WeakMap();
  function bowWave(c) {
    let w = pwCache.get(c);
    if (w) return w;
    const N = 48, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) im[n] = Math.sin(Math.PI * n * 0.19) / n * Math.exp(-n / 26);
    w = c.createPeriodicWave(re, im);
    pwCache.set(c, w);
    return w;
  }
  // Body: a fixed bank of narrow wood resonances (one "instrument"); vibrato sweeps the harmonics across them.
  const BODY = [[196, 12, 7], [275, 10, 8], [392, 14, 6], [520, 12, 7], [705, 14, 6], [985, 12, 6], [1350, 14, 5], [1880, 12, 5], [2750, 10, 4]];
  function padNote(K, dest, t, f, dur, v, bright, atk, rel) {
    const c = K.c, g = c.createGain();
    atk = atk || 1.2; rel = rel || 2.5;
    const hold = Math.max(atk, dur), end = t + hold + rel + 0.1;
    const inp = c.createGain();               // body input: bowed string + scratch
    g.connect(inp);
    let n = filt(K, inp, t, { type: 'highpass', f: 70 });
    BODY.forEach(([bf, q, gain]) => { n = filt(K, n, t, { type: 'peaking', f: bf, q, gain: gain * 0.8 }); });
    n = filt(K, n, t, { type: 'peaking', f: 1200, q: 0.5, gain: -6 }); // compensate the bank's build-up
    // bow pressure: the tone opens as the stroke swells and darkens as it dies
    const top = bright ? 3400 : 2100;
    const lp = filt(K, n, t, { type: 'lowpass', f: 420, q: 0.6 });
    lp.frequency.setValueAtTime(420, t);
    lp.frequency.linearRampToValueAtTime(top, t + atk);
    lp.frequency.setValueAtTime(top, t + hold);
    lp.frequency.exponentialRampToValueAtTime(380, t + hold + rel);
    const out = c.createGain(); out.gain.value = 0.55; lp.connect(out); out.connect(dest);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * 0.7, t + atk * 0.6);
    g.gain.linearRampToValueAtTime(v, t + atk);
    g.gain.setValueAtTime(v, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + hold + rel);
    const vib = c.createOscillator(), vg = c.createGain();
    vib.frequency.value = rr(4.6, 5.6);
    vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(rr(7, 12), t + atk * 1.3);
    vib.connect(vg); vib.start(t); vib.stop(end);
    const srcs = [vib];
    // rosin noise, amplitude-modulated by the string itself so the hiss is pitched and follows vibrato
    const ns = c.createBufferSource(); ns.buffer = K.nb.pink; ns.loop = true;
    const nf = filt(K, ns, t, { type: 'bandpass', f: Math.min(6000, f * 3.2), q: 0.9 });
    const ng = c.createGain(); ng.gain.value = 0.05; nf.connect(ng); ng.connect(g);
    [[-5, 0.5], [6, 0.5]].forEach(([dt, gg], i) => {
      const o = c.createOscillator(), og = c.createGain();
      o.setPeriodicWave(bowWave(c)); o.frequency.value = f; o.detune.value = dt + (R() - 0.5) * 3; og.gain.value = gg;
      vg.connect(o.detune);
      o.connect(og); og.connect(g); o.start(t); o.stop(end);
      if (i === 0) { const am = c.createGain(); am.gain.value = 0.35; o.connect(am); am.connect(ng.gain); srcs.push(am); }
      srcs.push(o);
    });
    ns.start(t, R() * 3); ns.stop(end);
    srcs.push(ns);
    // bow scratch: ~30 ms of rough noise as the hair bites, straight into the body
    const sc = c.createBufferSource(); sc.buffer = K.nb.white; sc.loop = true;
    const sf = filt(K, sc, t, { type: 'bandpass', f: Math.min(5000, f * 5 + 1200), q: 0.8 });
    const sg = c.createGain(); env(sg.gain, t, 0.004, v * 1.2, 0.03); sf.connect(sg); sg.connect(inp);
    sc.start(t, R() * 3); sc.stop(t + 0.08);
    const done = track(dest);
    ns.onended = () => { try { srcs.forEach(x => x.disconnect()); sc.disconnect(); sg.disconnect(); vg.disconnect(); g.disconnect(); inp.disconnect(); out.disconnect(); } catch (e) { } if (done) done(); };
  }

  const boost = (o, k) => Object.assign({}, o, { vol: (o.vol == null ? 1 : o.vol) * k });
  // scale degree (0 = D5) -> midi in the current mode (minor until the moth hatches, then major)
  const km = d => degMidi(d, M.stage >= 2 ? 'major' : 'minor');

  /* =====================================================================================
   *  SFX
   * ===================================================================================== */
  const SFX = {
    click(K, t, o) {
      const v = voice(K, o, 0.12), f = rr(1500, 1900);
      tone(K, v, { f, f1: f * 0.8, t, d: 0.035, g: 0.22 });
      tone(K, v, { f: f * 2.7, t, d: 0.012, g: 0.07 });
      noise(K, v, { t, a: 0.0005, d: 0.01, g: 0.35, filters: [{ type: 'bandpass', f: rr(3000, 4500), q: 1.2 }] });
    },
    back(K, t, o) {
      const v = voice(K, o, 0.12), f = rr(700, 850);
      tone(K, v, { f, f1: f * 0.75, t, d: 0.05, g: 0.2 });
      noise(K, v, { t, a: 0.0006, d: 0.018, g: 0.25, filters: [{ type: 'bandpass', f: rr(1600, 2200), q: 1 }] });
      noise(K, v, { t, a: 0.03, d: 0.1, g: 0.05, filters: [{ type: 'bandpass', f: 900, q: 0.6, pts: [[0.12, 500]] }] });
    },
    step(K, t, o) {
      const v = voice(K, o, 0.22);
      [0, rr(0.18, 0.24)].forEach((dt, i) => {
        const g = i ? 0.6 : 1, tt = t + dt;
        tone(K, v, { f: rr(100, 125), f1: 55, glide: 0.06, t: tt, a: 0.004, d: 0.1, g: 0.38 * g });
        noise(K, v, { t: tt, a: 0.004, d: 0.07, g: 0.35 * g, filters: [{ type: 'lowpass', f: rr(500, 800), q: 0.8 }] });
        noise(K, v, { t: tt + 0.01, a: 0.01, d: 0.05, g: 0.05 * g, filters: [{ type: 'bandpass', f: 2500, q: 0.7 }] }); // grit
      });
      if (R() < 0.65) creak(K, v, t + rr(0.03, 0.12), { dur: rr(0.18, 0.4), r0: rr(60, 90), rm: rr(100, 150), r1: rr(70, 110), res: [[rr(420, 520), 6, 1], [rr(950, 1150), 8, 0.6], [rr(2000, 2300), 9, 0.25]], g: 0.8 });
    },
    pickup(K, t, o) {
      const v = voice(K, o, 0.3);
      noise(K, v, { t, a: 0.03, d: 0.12, g: 0.12, filters: [{ type: 'bandpass', f: 2200, q: 0.7, pts: [[0.15, 1400]] }] });
      noise(K, v, { t, buf: crackleBuf(K.c, 0.14, () => 300, 1.5), flat: true, g: 0.25, filters: [{ type: 'highpass', f: 1800 }] });
      woodKnock(K, v, t + 0.02, rr(280, 330), 0.18, 0.07);
      const d = pick([7, 11, 9]);
      mbNote(K, v, t + 0.08, mtof(km(d)), 0.28, { decay: 2 });
      mbNote(K, v, t + 0.17, mtof(km(d === 11 ? 14 : d + 4)), 0.11, { decay: 1.6 });
    },
    tick(K, t, o) {
      const v = voice(K, o, 0.15);
      metalTick(K, v, t, 0.5, rr(0.95, 1.1));
      tone(K, v, { f: rr(380, 440), t, d: 0.03, g: 0.18 });
      tone(K, v, { f: rr(3600, 4000), t: t + 0.004, d: 0.09, g: 0.025 });
    },
    chime(K, t, o) {
      const v = voice(K, o, 0.45);
      // gear run ("warning") before the strike
      for (let i = 0; i < 10; i++) metalTick(K, v, t + i * rr(0.045, 0.06), 0.08 * (1 - i / 14), 0.7);
      thud(K, v, t + 0.55, 180, 0.12, 0.06);
      [-3, -5, -7].forEach((d, i) => bell(K, v, t + 0.7 + i * rr(1.25, 1.4), mtof(km(d)), 0.3, 5.5));
    },
    clockOpen(K, t, o) {
      const v = voice(K, o, 0.3);
      metalTick(K, v, t, 0.3, 0.9);
      metalTick(K, v, t + 0.05, 0.15, 1.1);
      creak(K, v, t + 0.12, { dur: rr(0.6, 0.8), r0: 110, rm: rr(200, 240), r1: 150, res: [[900, 8, 1], [2000, 10, 0.6], [3400, 12, 0.3]], g: 1.0 });
      woodKnock(K, v, t + 0.88, 260, 0.12);
    },
    match(K, t, o) {
      const v = voice(K, o, 0.25);
      // scrape
      noise(K, v, { t, buf: crackleBuf(K.c, 0.24, x => 700 + 900 * x, 0.8, 1.5), flat: true, g: 0.7, filters: [{ type: 'bandpass', f: 2200, q: 0.9, pts: [[0.22, 4200]] }] });
      noise(K, v, { t, a: 0.03, d: 0.2, g: 0.08, filters: [{ type: 'bandpass', f: 3000, q: 1.2 }] });
      // ignite flare
      const ti = t + 0.22;
      noise(K, v, { t: ti, a: 0.012, d: 0.5, g: 0.35, filters: [{ type: 'bandpass', f: 1400, q: 0.5, pts: [[0.4, 500]] }] });
      noise(K, v, { t: ti, buf: 'brown', a: 0.02, d: 0.7, g: 0.35, filters: [{ type: 'lowpass', f: 700 }] });
      // fizz
      noise(K, v, { t: ti, buf: crackleBuf(K.c, 1.3, x => 280 * Math.pow(1 - x, 2) + 15, 1.2), flat: true, g: 0.5, filters: [{ type: 'bandpass', f: 3200, q: 0.7 }] });
      noise(K, v, { t: ti + 0.05, a: 0.1, d: 0.8, g: 0.015, filters: [{ type: 'bandpass', f: 4500, q: 0.8 }] });
    },
    lampWhoosh(K, t, o) {
      const v = voice(K, o, 0.3);
      noise(K, v, { t, buf: 'pink', a: 0.08, hold: 0.1, d: 0.9, g: 0.6, filters: [{ type: 'lowpass', f: 160, q: 1.2, pts: [[0.16, 1000], [1.0, 320]] }] });
      tone(K, v, { f: 68, f1: 48, glide: 0.6, t, a: 0.06, d: 0.6, g: 0.25 });
      noise(K, v, { t: t + 0.25, buf: crackleBuf(K.c, 1.4, x => 40 * (1 - x) + 4, 1.5), flat: true, g: 0.3, filters: [{ type: 'bandpass', f: 2600, q: 0.6 }] });
    },
    drawerOpen(K, t, o) {
      const v = voice(K, o, 0.25), dur = rr(0.5, 0.62);
      resBank(K, v, t, creakBuf(K.c, dur, 260, rr(380, 460), 200, 0.9, 0.3), [[180, 2, 1], [420, 3, 0.8], [900, 4, 0.4], [2200, 5, 0.15]], 0.5);
      noise(K, v, { t, buf: 'brown', a: 0.08, hold: dur - 0.2, d: 0.12, g: 0.3, filters: [{ type: 'lowpass', f: 600 }] });
      woodKnock(K, v, t + dur + 0.02, rr(130, 150), 0.42, 0.12);
      [0.04, 0.09, 0.15].forEach(dt => metalTick(K, v, t + dur + dt + rr(0, 0.02), rr(0.05, 0.12), 0.8));
    },
    lockClick(K, t, o) {
      const v = voice(K, o, 0.22);
      metalTick(K, v, t, 0.5, 0.85);
      thud(K, v, t + 0.008, rr(150, 175), 0.5, 0.12);
      metalTick(K, v, t + 0.07, 0.3, 1.05);
      tone(K, v, { f: rr(1200, 1300), t: t + 0.07, d: 0.35, g: 0.04 });
      tone(K, v, { f: rr(2750, 2900), t: t + 0.07, d: 0.22, g: 0.025 });
    },
    lockFail(K, t, o) {
      const v = voice(K, o, 0.18);
      thud(K, v, t, rr(88, 100), 0.55, 0.14);
      [0.04, 0.075, 0.105, 0.13].forEach(dt => metalTick(K, v, t + dt + rr(0, 0.01), rr(0.06, 0.12), 0.45));
    },
    dial(K, t, o) {
      const v = voice(K, o, 0.15);
      metalTick(K, v, t, 0.3, rr(0.8, 1.1));
      tone(K, v, { f: rr(2400, 3200), t, d: 0.06, g: 0.04 });
      tone(K, v, { f: rr(560, 640), t, d: 0.025, g: 0.1 });
    },
    keyTurn(K, t, o) {
      const v = voice(K, o, 0.2);
      noise(K, v, { t, a: 0.02, d: 0.16, g: 0.14, filters: [{ type: 'bandpass', f: 2800, q: 2, pts: [[0.18, 4200]] }] });
      [0.05, 0.09, 0.13].forEach(dt => metalTick(K, v, t + dt + rr(0, 0.01), 0.12, 1.2));
      metalTick(K, v, t + 0.36, 0.22, 1);
      noise(K, v, { t: t + 0.36, a: 0.05, d: 0.12, g: 0.05, filters: [{ type: 'bandpass', f: 1800, q: 3 }] });
      metalTick(K, v, t + 0.52, 0.45, 0.85);
      thud(K, v, t + 0.525, 190, 0.35, 0.1);
    },
    windowCreak(K, t, o) {
      const v = voice(K, Object.assign({ pan: -0.1 }, o), 0.35);
      metalTick(K, v, t, 0.25, 0.8);
      creak(K, v, t + 0.1, { dur: rr(1.7, 2.1), r0: 40, rm: rr(120, 150), r1: 65, res: [[650, 7, 1], [1400, 9, 0.7], [2700, 10, 0.35], [300, 4, 0.5]], g: 1.1 });
      noise(K, v, { t: t + 0.9, buf: 'pink', a: 0.8, d: 1.3, g: 0.2, filters: [{ type: 'bandpass', f: 600, q: 0.7, pts: [[1.5, 1500], [2.1, 900]] }] });
    },
    wind(K, t, o) {
      const v = voice(K, o, 0.3), p0 = rr(300, 400);
      noise(K, v, { t, buf: 'pink', a: 1.1, hold: 0.3, d: 1.8, g: 1.0, filters: [{ type: 'bandpass', f: p0, q: 0.9, pts: [[1.2, p0 * 2.4], [3.1, p0 * 1.3]] }] });
      const w0 = rr(760, 900);
      noise(K, v, { t, a: 1.2, hold: 0.2, d: 1.7, g: 0.2, filters: [{ type: 'bandpass', f: w0, q: 18, pts: [[1.0, w0 * 1.35], [1.8, w0 * 1.15], [3.1, w0 * 1.25]] }] });
    },
    paper(K, t, o) {
      const v = voice(K, boost(o, 2), 0.2), d = rr(0.25, 0.38);
      noise(K, v, { t, buf: crackleBuf(K.c, d, x => 500 * Math.sin(Math.PI * x) + 40, 1.2), flat: true, g: 0.6, filters: [{ type: 'bandpass', f: 2800, q: 0.7 }] });
      noise(K, v, { t, a: 0.05, d: d, g: 0.1, filters: [{ type: 'bandpass', f: 1800, q: 0.8, pts: [[d, 2600]] }] });
    },
    pageTurn(K, t, o) {
      const v = voice(K, o, 0.22);
      noise(K, v, { t, a: 0.13, d: 0.33, g: 0.35, filters: [{ type: 'bandpass', f: 900, q: 0.8, pts: [[0.2, 3500], [0.46, 1700]] }] });
      noise(K, v, { t: t + 0.03, buf: crackleBuf(K.c, 0.35, x => 250 * Math.sin(Math.PI * x) + 20, 1), flat: true, g: 0.35, filters: [{ type: 'highpass', f: 2000 }] });
      tone(K, v, { f: 160, f1: 110, glide: 0.05, t: t + 0.42, d: 0.07, g: 0.1 });
      noise(K, v, { t: t + 0.42, a: 0.003, d: 0.06, g: 0.12, filters: [{ type: 'lowpass', f: 900 }] });
    },
    boxOpen(K, t, o) {
      const v = voice(K, o, 0.28);
      metalTick(K, v, t, 0.22, 1);
      creak(K, v, t + 0.06, { dur: rr(0.4, 0.5), r0: 160, rm: rr(240, 290), r1: 190, res: [[1200, 8, 1], [2600, 10, 0.6], [600, 5, 0.4]], g: 0.8 });
      woodKnock(K, v, t + 0.55, rr(200, 220), 0.4, 0.1);
      woodKnock(K, v, t + 0.65, rr(210, 230), 0.1, 0.06);
    },
    cocoonCrack(K, t, o) {
      const v = voice(K, boost(o, 2), 0.3);
      const bump = (x, c, w) => Math.exp(-Math.pow((x - c) / w, 2));
      noise(K, v, { t, buf: crackleBuf(K.c, 1.3, x => 260 * (bump(x, 0.1, 0.07) + bump(x, 0.5, 0.1) + bump(x, 0.9, 0.08)) + 10, 0.7, 2), flat: true, g: 0.9, filters: [{ type: 'bandpass', f: 4000, q: 0.8 }] });
      [0.12, 0.55, rr(0.85, 0.95)].forEach(dt => {
        noise(K, v, { t: t + dt, a: 0.0005, d: 0.006, g: 0.18, filters: [{ type: 'bandpass', f: rr(2200, 3000), q: 1.5 }] });
        tone(K, v, { f: rr(1600, 2000), t: t + dt, d: 0.03, g: 0.05 });
      });
      noise(K, v, { t: t + 0.4, a: 0.2, hold: 0.3, d: 0.4, g: 0.04, filters: [{ type: 'bandpass', f: 1400, q: 3 }] });
    },
    mothFlutter(K, t, o) {
      let tt = t;
      const n = 3 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) {
        const d = rr(0.22, 0.5);
        const v = voice(K, Object.assign({}, o, { pan: clamp((o.pan || 0) + rr(-0.6, 0.6), -1, 1) }), 0.3);
        const fb = flutterBuf(K.c, d, rr(15, 23)), gg = rr(0.35, 0.55) * 1.8;   // +5 dB: the hero sound
        noise(K, v, { t: tt, buf: fb, flat: true, g: gg, filters: [{ type: 'bandpass', f: rr(900, 1500), q: 0.6 }, { type: 'highpass', f: 250 }, { type: 'lowpass', f: 3200 }] });
        noise(K, v, { t: tt, buf: fb, flat: true, g: gg * 1.4, filters: [{ type: 'bandpass', f: rr(380, 520), q: 1.3 }, { type: 'lowpass', f: 700 }] }); // wing thumps
        tt += d + rr(0.12, 0.4);
      }
    },
    magic(K, t, o) {
      const v = voice(K, o, 0.55);
      [0, 4, 7, 8, 9, 11, 14].forEach((d, i) => mbNote(K, v, t + i * rr(0.075, 0.095), mtof(km(d)), 0.26 * (1 - i * 0.07), { decay: 3 }));
      noise(K, v, { t, a: 0.4, d: 1.6, g: 0.05, filters: [{ type: 'bandpass', f: 8000, q: 0.6 }] });
      tone(K, v, { f: mtof(86), t, a: 0.5, d: 2, g: 0.04 });
      tone(K, v, { f: mtof(93), t: t + 0.2, a: 0.5, d: 2, g: 0.03 });
    },
    doorUnlock(K, t, o) {
      const v = voice(K, o, 0.35);
      resBank(K, v, t, creakBuf(K.c, 2.6, 28, 40, 24, 0.5, 0.25), [[180, 4, 1], [420, 6, 0.6], [900, 8, 0.3]], 0.35);
      const hits = [0, 0.36, 0.64, 0.88, 1.1, 1.32, 1.56, 1.86, 2.22];
      hits.forEach((dt, i) => {
        const tt = t + dt + rr(-0.02, 0.02);
        thud(K, v, tt, rr(75, 110), 0.4, 0.14);
        metalTick(K, v, tt, 0.25, 0.6);
        if (i < hits.length - 1) for (let k = 1; k <= 3; k++) metalTick(K, v, tt + k * (hits[i + 1] - dt) / 4, 0.05, 1.1);
      });
      const tb = t + 2.6;
      noise(K, v, { t: tb - 0.18, a: 0.15, d: 0.08, g: 0.25, filters: [{ type: 'bandpass', f: 800, q: 0.8, pts: [[0.23, 300]] }] });
      thud(K, v, tb, 55, 0.7, 0.3);
      metalTick(K, v, tb, 0.45, 0.7);
      bell(K, v, tb, 146.83, 0.06, 1.6);
    },
    doorOpen(K, t, o) {
      const v = voice(K, o, 0.4);
      creak(K, v, t, { dur: 3.8, r0: 18, rm: 58, r1: 30, jit: 0.35, res: [[220, 6, 1], [480, 8, 0.8], [1100, 10, 0.5], [2300, 12, 0.2]], g: 1.1 });
      noise(K, v, { t: t + 0.3, buf: 'pink', a: 1.6, hold: 0.6, d: 2.2, g: 0.3, filters: [{ type: 'lowpass', f: 250, q: 0.7, pts: [[1.8, 900], [4.2, 300]] }] });
      tone(K, v, { f: 42, t, a: 1, hold: 1.5, d: 2, g: 0.18 });
      woodKnock(K, v, t + 4.1, 75, 0.25, 0.25);
    },
    success(K, t, o) {
      const v = voice(K, o, 0.5);
      [-14, -10, -7].forEach(d => padNote(K, v, t, mtof(km(d)), 1.8, 0.05, false, 0.35, 2.2));
      padNote(K, v, t, mtof(km(-4)), 0.6, 0.04, false, 0.3, 0.6);        // suspension G
      padNote(K, v, t + 0.7, mtof(km(-5)), 1.2, 0.04, false, 0.3, 2.2);  // resolves to the third
      mbNote(K, v, t + 0.03, mtof(km(4)), 0.26);
      mbNote(K, v, t + 0.72, mtof(km(7)), 0.24);
      mbNote(K, v, t + 0.74, mtof(km(2)), 0.12);
    },
    hint(K, t, o) {
      const v = voice(K, o, 0.6);
      mbNote(K, v, t, mtof(km(pick([4, 7, 2, 6]))), 0.3, { decay: 3 });
    },
  };

  /* =====================================================================================
   *  Context / buses
   * ===================================================================================== */
  function kit(out, wet) { return { c: ctx, out, wet, nb: noiseBuffers(ctx), wow }; }
  let KS = null, KA = null, KM = null;

  function build() {
    const c = ctx;
    master = c.createGain(); master.gain.value = muted ? 0 : volume;
    comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
    master.connect(comp); comp.connect(c.destination);
    roomRev = c.createConvolver(); roomRev.buffer = buildIR(c, 1.3, 0.8, 0.008, 10);
    hallRev = c.createConvolver(); hallRev.buffer = buildIR(c, 3.6, 0.7, 0.02, 6);
    const rg = c.createGain(); rg.gain.value = 0.7; roomRev.connect(rg); rg.connect(master);
    const hg = c.createGain(); hg.gain.value = 0.6; hallRev.connect(hg); hg.connect(master);
    sfxBus = c.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    ambBus = c.createGain(); ambBus.gain.value = 1; ambBus.connect(master);
    musBus = c.createGain(); musBus.gain.value = 0.55; musBus.connect(master);
    const ms = c.createGain(); ms.gain.value = 0.6; musBus.connect(ms); ms.connect(hallRev);
    // shared tape "wow" for music voices
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.37; lg.gain.value = 6; lfo.connect(lg); lfo.start();
    wow = lg;
    KS = kit(sfxBus, roomRev);
    KA = kit(ambBus, roomRev);
    KM = { c, out: musBus, wet: null, nb: noiseBuffers(c), wow };
  }

  function unlock() {
    try {
      if (!AC) return;
      if (!ctx) { ctx = new AC({ latencyHint: 'interactive' }); build(); }
      if (ctx.state !== 'running' && ctx.resume) ctx.resume().then(maybeStartAmb, () => { });
      maybeStartAmb();
    } catch (e) { ctx = null; }
  }
  function setMuted(b) {
    muted = !!b;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { }
    try { if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.08); } catch (e) { }
  }
  function setVolume(v) {
    volume = clamp(+v || 0, 0, 1);
    try { if (master && !muted) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.08); } catch (e) { }
  }

  // ambience ducks ~4 dB under longer SFX so they read clearly
  const DUCK = { step: 0.5, pickup: 0.9, chime: 4.5, clockOpen: 1, match: 1.2, lampWhoosh: 1.2, drawerOpen: 1, lockClick: 0.4, lockFail: 0.4,
    keyTurn: 0.8, windowCreak: 2, paper: 0.4, pageTurn: 0.5, boxOpen: 0.9, cocoonCrack: 1.4, mothFlutter: 2.5, magic: 2, doorUnlock: 3,
    doorOpen: 4, success: 2.5, hint: 1 };
  let duckUntil = 0;
  function duck(t, len) {
    const p = ambBus.gain, end = Math.max(duckUntil, t + len);
    duckUntil = end;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(0.63, t, 0.03);
    p.setTargetAtTime(1, end, 0.5);
  }
  const lastPlay = {};
  function play(name, o) {
    try {
      if (!ctx) unlock();
      if (!ctx || muted) return;
      const fn = SFX[name];
      if (!fn) return;
      const now = ctx.currentTime;
      if (lastPlay[name] && now - lastPlay[name] < 0.03) return;
      lastPlay[name] = now;
      o = Object.assign({}, o || {});
      if (o.vol == null && o.volume != null) o.vol = o.volume;
      fn(KS, now + 0.01 + (o.delay || 0), o);
      if (DUCK[name]) duck(now + (o.delay || 0), DUCK[name]);
      if (name === 'cocoonCrack') A.cracked = true;
      if (name === 'mothFlutter' && A.cracked && !A.hatchHeard) { A.hatchHeard = true; if (M.stage < 2) setMusicStage(2); }
    } catch (e) { /* silent */ }
  }

  /* =====================================================================================
   *  Ambience
   * ===================================================================================== */
  const AMB_LEVEL = 0.32, RAIN_CLOSED = 2800;
  const A = { on: false, started: false, nodes: [], timers: [], L: {}, cracked: false, win: false, lamp: false, finished: false };
  function later(fn, sec) {
    const id = setTimeout(() => { const i = A.timers.indexOf(id); if (i >= 0) A.timers.splice(i, 1); if (A.on) { try { fn(); } catch (e) { } } }, sec * 1000);
    A.timers.push(id);
    return id;
  }
  function running() { return ctx && ctx.state === 'running'; }
  function loopSrc(buf, rate) {
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    if (rate) s.playbackRate.value = rate;
    s.start(ctx.currentTime, R() * buf.duration);
    A.nodes.push(s);
    return s;
  }
  function G_(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function BQ(type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q == null ? 0.707 : q; return b; }
  function PAN(p) { const n = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(); if (n.pan) n.pan.value = p; return n; }
  function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
  function ramp(p, v, tc) { try { p.setTargetAtTime(v, ctx.currentTime, tc); } catch (e) { } }

  function maybeStartAmb() { if (A.started && !A.on && running()) startAmbience(); }

  function startAmbience() {
    if (!ctx || A.on) return;
    A.on = true; A.finished = false;
    const c = ctx, nb = noiseBuffers(c), now = c.currentTime, L = A.L = {};

    // ---- ambience master (fades in) ----
    L.amb = G_(0); L.amb.connect(ambBus); L.amb.gain.setTargetAtTime(AMB_LEVEL, now, 1.5);
    const send = n => { const s = G_(0.25); n.connect(s); s.connect(roomRev); };

    // ---- rain ----
    L.rainTone = BQ('lowpass', RAIN_CLOSED, 0.4);
    L.rainGain = G_(0.9);
    const lift = BQ('peaking', 2200, 0.7); lift.gain.value = 4.5;   // presence for small speakers
    chain(L.rainTone, lift, L.rainGain, L.amb); send(L.rainGain);
    [-0.75, 0.75].forEach(p => chain(loopSrc(nb.white, rr(0.97, 1.03)), BQ('bandpass', rr(1300, 1700), 0.45), G_(0.24), PAN(p), L.rainTone));
    chain(loopSrc(nb.brown), BQ('lowpass', 380), G_(0.26), L.rainTone);            // roof body
    L.patter = G_(0.18);
    chain(loopSrc(nb.pink, 1.1), BQ('highpass', 700), L.patter, PAN(0.2), L.rainTone);
    // window-side droplets + gutter (directional, follow view)
    L.winPan = PAN(0); L.winLP = BQ('lowpass', 9000, 0.5);
    L.drops = G_(0.9);
    chain(L.drops, L.winLP, L.winPan, L.rainTone);
    L.KD = { c, out: L.drops, wet: roomRev, nb };
    // droplet texture: three pre-rendered stereo loops of different lengths (no per-drop nodes)
    L.dropLayers = [[5.3, 14, 1], [6.7, 14, 1], [7.9, 27, 0]].map(([len, rate, on]) => {
      const src = loopSrc(dropBuf(c, len, rate), rr(0.96, 1.04)), g = G_(on);
      chain(src, g, L.drops);
      return { src, g };
    });

    // ---- room tone ----
    chain(loopSrc(nb.brown, 0.8), BQ('lowpass', 110), G_(0.15), L.amb);
    chain(loopSrc(nb.pink, 0.9), BQ('bandpass', 260, 0.4), G_(0.012), L.amb);

    // ---- wind (off until windowOpen) ----
    L.windG = G_(0); L.windBP = BQ('bandpass', 500, 0.8); L.whisBP = BQ('bandpass', 900, 20); L.whisG = G_(0.25);
    L.windPan = PAN(-0.3);
    chain(loopSrc(nb.pink), L.windBP, L.windG, L.windPan, L.amb);
    chain(loopSrc(nb.white), L.whisBP, L.whisG, L.windG);
    send(L.windPan);

    // ---- lamp (off until lampLit) ----
    L.lampOn = G_(0); L.lampView = G_(1); L.lampLP = BQ('lowpass', 8000, 0.5); L.lampPan = PAN(0);
    chain(L.lampOn, L.lampView, L.lampLP, L.lampPan, L.amb);
    L.roarG = G_(0.3);
    chain(loopSrc(nb.brown), BQ('bandpass', 170, 1), L.roarG, L.lampOn);
    chain(loopSrc(nb.white), BQ('bandpass', 2600, 0.6), G_(0.006), L.lampOn);
    L.KL = { c, out: L.lampOn, wet: roomRev, nb };
    L.lampLoop = loopSrc(popBuf(c, 6.3, 3.5), 1);
    chain(L.lampLoop, G_(1), L.lampOn);

    // ---- music drone ----
    L.drone = G_(0); L.drone.connect(musBus); L.drone.gain.setTargetAtTime(1, now + 2, 4);
    L.droneLP = BQ('lowpass', 380, 0.8);
    L.droneLP.connect(L.drone);
    L.droneOscs = [];
    [[mtof(38), 'sine', 0.05], [mtof(45), 'triangle', 0.025], [mtof(50), 'bow', 0.02], [mtof(50) * 1.004, 'bow', 0.02]].forEach(([f, ty, g]) => {
      const o = c.createOscillator(); if (ty === 'bow') o.setPeriodicWave(bowWave(c)); else o.type = ty; o.frequency.value = f; o.start(); A.nodes.push(o); L.droneOscs.push(o);
      chain(o, G_(g), L.droneLP);
    });
    L.droneThird = G_(0); L.droneThird.connect(L.droneLP); // F (minor) or F# (major) added when warm
    L.thirdOsc = c.createOscillator(); L.thirdOsc.type = 'triangle'; L.thirdOsc.frequency.value = mtof(53); L.thirdOsc.start(); A.nodes.push(L.thirdOsc);
    chain(L.thirdOsc, G_(0.02), L.droneThird);
    L.shimmer = G_(0); L.shimmer.connect(musBus);
    [74, 81, 86, 90].forEach((m, i) => {
      const o = c.createOscillator(); o.frequency.value = mtof(m); o.detune.value = rr(-4, 4); o.start(); A.nodes.push(o);
      const trem = c.createOscillator(), tg = G_(0.004), og = G_(0.006);
      trem.frequency.value = rr(0.15, 0.4); trem.start(); A.nodes.push(trem); trem.connect(tg); tg.connect(og.gain);
      chain(o, og, L.shimmer);
    });
    // breathing drone filter
    L.breath = c.createOscillator(); L.breath.frequency.value = 0.05; L.breath.start(); A.nodes.push(L.breath);
    chain(L.breath, G_(120), L.droneLP.frequency);

    // ---- schedulers ----
    later(dropWander, 3);
    rainWander();
    later(thunder, rr(18, 35));
    later(houseCreak, rr(8, 20));
    later(gutterEpisode, rr(10, 25));
    later(lampCrackle, 0.5);
    later(windWander, 1);
    M.stage = -1;
    sync(true);
    seqNext(rr(45, 60)); // the first minute is rain and room only
  }

  function stopAmbience(fade) {
    if (!A.on) return;
    A.on = false;
    clearTimeout(M.timer);
    A.timers.forEach(clearTimeout); A.timers = [];
    const nodes = A.nodes, L = A.L;
    A.nodes = [];
    try { L.amb.gain.setTargetAtTime(0, ctx.currentTime, (fade || 0.3) / 3); L.drone.gain.setTargetAtTime(0, ctx.currentTime, (fade || 0.3) / 3); L.shimmer.gain.setTargetAtTime(0, ctx.currentTime, (fade || 0.3) / 3); } catch (e) { }
    setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch (e) { } }); try { L.amb.disconnect(); L.drone.disconnect(); L.shimmer.disconnect(); } catch (e) { } }, (fade || 0.3) * 1000 + 200);
  }

  // Stereo loop of droplets rendered in JS: resonant noise ticks (2-pole resonator) and small pitch-dropping plinks.
  function dropBuf(c, dur, rate) {
    const sr = c.sampleRate, n = Math.floor(dur * sr), b = c.createBuffer(2, n, sr);
    const L = b.getChannelData(0), Rr = b.getChannelData(1), g = new Float32Array(Math.floor(sr * 0.03));
    let t = R() * 0.1;
    while (t < dur) {
      t += -Math.log(1 - R() * 0.999) / rate;
      const i0 = Math.floor(t * sr);
      let len;
      if (R() < 0.72) { // tick
        const f = rr(1800, 6500), bw = f / 1.3, r = Math.exp(-Math.PI * bw / sr), cw = 2 * r * Math.cos(2 * Math.PI * f / sr);
        const ex = Math.floor(sr * rr(0.002, 0.007)); len = Math.min(g.length, ex + Math.floor(sr * 0.004));
        let y1 = 0, y2 = 0, pk = 1e-9;
        for (let k = 0; k < len; k++) { const x = k < ex ? (R() * 2 - 1) * Math.exp(-k / (ex / 3)) : 0; const y = x + cw * y1 - r * r * y2; y2 = y1; y1 = y; g[k] = y; pk = Math.max(pk, Math.abs(y)); }
        const amp = Math.pow(R(), 2) * 0.35 + 0.02;
        for (let k = 0; k < len; k++) g[k] *= amp / pk;
      } else { // plink
        const f0 = rr(1800, 4200), f1 = rr(1100, 1600), d = rr(0.01, 0.02), amp = rr(0.015, 0.05);
        len = Math.min(g.length, Math.floor(sr * (d + 0.004)));
        let ph = 0;
        for (let k = 0; k < len; k++) { const x = k / sr; const f = f0 * Math.pow(f1 / f0, Math.min(1, x / 0.012)); ph += 2 * Math.PI * f / sr; g[k] = Math.sin(ph) * amp * Math.min(1, k / 20) * Math.exp(-x / (d / 4)); }
      }
      const p = rr(-0.9, 0.9), gl = Math.cos((p + 1) * Math.PI / 4), gr = Math.sin((p + 1) * Math.PI / 4);
      for (let k = 0; k < len; k++) { const j = (i0 + k) % n; L[j] += g[k] * gl; Rr[j] += g[k] * gr; }
    }
    return b;
  }
  function dropWander() { // keeps the loops from sounding like loops: drift their speed and level
    const L = A.L;
    L.dropLayers.forEach((d, i) => {
      ramp(d.src.playbackRate, rr(0.9, 1.1), rr(1, 3));
      if (i < 2) ramp(d.g.gain, A.finished ? 0.2 : rr(0.6, 1.2), 2);
    });
    later(dropWander, rr(4, 9));
  }
  function rainWander() {
    const L = A.L;
    ramp(L.patter.gain, rr(0.08, 0.3), 1.5);
    later(rainWander, rr(2, 5));
  }
  function thunder() {
    if (!A.finished && running()) {
      const t = ctx.currentTime + 0.1, near = R() < 0.3, K = A.L.KD;
      const v = voice({ c: ctx, out: A.L.rainGain, wet: roomRev, nb: K.nb }, { pan: rr(-0.6, 0.6), vol: (A.win ? 1.2 : 0.75) }, 0.3);
      if (near) noise(K, v, { t, a: 0.004, d: 0.6, g: 0.22, filters: [{ type: 'lowpass', f: 3500, pts: [[0.5, 300]] }] });
      noise(K, v, { t: t + 0.05, buf: 'brown', a: rr(0.2, 0.5), hold: 0.3, d: rr(2.5, 4), g: 0.9, filters: [{ type: 'lowpass', f: 500, q: 0.5, pts: [[1.5, 90]] }] });
      const n = 3 + Math.floor(R() * 4);
      for (let i = 0; i < n; i++) noise(K, v, { t: t + rr(0.3, 1) + i * rr(0.4, 0.9), buf: 'brown', a: rr(0.2, 0.7), hold: rr(0.1, 0.8), d: rr(1.8, 4), g: rr(0.4, 0.9), filters: [{ type: 'lowpass', f: rr(90, 200), q: 0.7 }] });
    }
    later(thunder, rr(40, 90));
  }
  function houseCreak() {
    if (!A.finished && running()) {
      const K = { c: ctx, out: A.L.amb, wet: roomRev, nb: noiseBuffers(ctx) };
      const n = R() < 0.35 ? 2 : 1;
      let t = ctx.currentTime + 0.1;
      const v = voice(K, { pan: rr(-1, 1), vol: rr(0.5, 1) }, 0.7), lo = rr(200, 450);
      for (let i = 0; i < n; i++) {
        const d = rr(0.35, 1.3);
        creak(K, v, t, { dur: d, r0: rr(18, 50), rm: rr(40, 110), r1: rr(20, 60), res: [[lo, 5, 1], [lo * rr(2.2, 2.8), 7, 0.5], [lo * 0.5, 3, 0.6]], g: 0.45 });
        t += d + rr(0.2, 0.9);
      }
    }
    later(houseCreak, rr(15, 45));
  }
  function gutterEpisode() {
    const n = 8 + Math.floor(R() * 14), per = rr(0.9, 1.6), f = rr(850, 1250);
    let i = 0;
    const drip = () => {
      if (A.finished || !running()) return;
      const t = ctx.currentTime + 0.05, K = A.L.KD, v = voice(K, { pan: rr(-0.3, 0.1), vol: 1 }, 0.4);
      const ff = f * rr(0.94, 1.06);
      tone(K, v, { f: ff, f1: ff * 1.7, glide: 0.025, t, a: 0.001, d: 0.06, g: 0.06 });
      noise(K, v, { t, a: 0.0005, d: 0.01, g: 0.04, filters: [{ type: 'bandpass', f: 3000, q: 1 }] });
      if (++i < n) later(drip, per * rr(0.85, 1.2));
    };
    drip();
    later(gutterEpisode, n * per + rr(20, 50));
  }
  // Wick crackle: resonant pops (and the odd bigger snap) rendered into a stereo loop.
  function popBuf(c, dur, rate) {
    const sr = c.sampleRate, n = Math.floor(dur * sr), b = c.createBuffer(2, n, sr);
    const L = b.getChannelData(0), Rr = b.getChannelData(1), g = new Float32Array(Math.floor(sr * 0.03));
    let t = R() * 0.2;
    while (t < dur) {
      t += -Math.log(1 - R() * 0.999) / rate;
      const big = R() < 0.12, f = rr(1500, 5000), r = Math.exp(-Math.PI * (f / 1.0) / sr), cw = 2 * r * Math.cos(2 * Math.PI * f / sr);
      const ex = Math.floor(sr * (big ? 0.012 : rr(0.002, 0.006))), len = Math.min(g.length, ex + Math.floor(sr * 0.004));
      let y1 = 0, y2 = 0, pk = 1e-9;
      for (let k = 0; k < len; k++) { const x = k < ex ? (R() * 2 - 1) * Math.exp(-k / (ex / 3)) : 0; const y = x + cw * y1 - r * r * y2; y2 = y1; y1 = y; g[k] = y; pk = Math.max(pk, Math.abs(y)); }
      const amp = big ? 0.25 : Math.pow(R(), 2) * 0.1 + 0.01, p = rr(-0.2, 0.2);
      const gl = Math.cos((p + 1) * Math.PI / 4), gr = Math.sin((p + 1) * Math.PI / 4), i0 = Math.floor(t * sr);
      for (let k = 0; k < len; k++) { const j = (i0 + k) % n, y = g[k] * amp / pk; L[j] += y * gl; Rr[j] += y * gr; }
    }
    return b;
  }
  function lampCrackle() { // flicker only: no nodes created
    if (A.lamp && running()) {
      ramp(A.L.roarG.gain, rr(0.22, 0.4), 0.08);
      ramp(A.L.lampLoop.playbackRate, rr(0.85, 1.15), 0.5);
    }
    later(lampCrackle, rr(0.15, 0.7));
  }

  function windWander() {
    const L = A.L;
    if (A.win) {
      ramp(L.windBP.frequency, rr(300, 1000), rr(0.6, 1.5));
      ramp(L.whisBP.frequency, rr(650, 1300), rr(0.8, 2));
      ramp(L.windG.gain, A.finished ? 0 : rr(0.03, 0.3), rr(0.8, 2));
      ramp(L.whisG.gain, rr(0.05, 0.4), 1.5);
    }
    later(windWander, rr(1.5, 4));
  }

  // ---- view-dependent spatialisation ----
  function wallOf(id) {
    let v = id, guard = 0;
    while (v && guard++ < 8) {
      if (['north', 'east', 'south', 'west'].includes(v)) return v;
      const def = window.G && G.views && G.views[v];
      v = def && def.parent;
    }
    return 'north';
  }
  function onView(id) {
    if (!A.on) return;
    const L = A.L, w = wallOf(id), close = id !== w;
    // lamp is on the south wall; window on the west wall
    const lamp = { south: [0, 9000, close ? 1.3 : 1], east: [0.7, 3000, 0.35], west: [-0.7, 3000, 0.35], north: [0, 900, 0.2] }[w];
    if (L.lampPan.pan) ramp(L.lampPan.pan, lamp[0], 0.3); ramp(L.lampLP.frequency, lamp[1], 0.3); ramp(L.lampView.gain, lamp[2], 0.4);
    const win = { west: [0, 9000], north: [-0.6, 5000], south: [0.6, 5000], east: [0, 1800] }[w];
    if (L.winPan.pan) ramp(L.winPan.pan, win[0], 0.3);
    ramp(L.winLP.frequency, win[1], 0.3);
    if (L.windPan.pan) ramp(L.windPan.pan, win[0] * 0.8, 0.4);
  }

  // ---- uncanny accents: a reversed swell into the lamp's light; the whole room sags in pitch as the window opens ----
  function uncanny(kind) {
    if (!running()) return;
    const L = A.L, t = ctx.currentTime + 0.05, K = KM;
    if (kind === 'lamp') {
      // reversed swell: grows from nothing, bends up a semitone, then is cut dead as the flame catches
      const g = ctx.createGain(), lp = BQ('lowpass', 500, 0.7);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.0008, t + 0.2); g.gain.exponentialRampToValueAtTime(0.09, t + 1.7);
      g.gain.setTargetAtTime(0, t + 1.72, 0.015);
      lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(3000, t + 1.7);
      chain(g, lp, K.out);
      [62, 65, 69, 75].forEach(m => { // D F A Eb: the Neapolitan rub
        const o = ctx.createOscillator(); o.setPeriodicWave(bowWave(ctx)); o.frequency.setValueAtTime(mtof(m - 1), t);
        o.frequency.exponentialRampToValueAtTime(mtof(m), t + 1.7); o.connect(g); o.start(t); o.stop(t + 2);
        o.onended = () => { try { o.disconnect(); } catch (e) { } };
      });
      noise(K, g, { t, buf: 'pink', a: 1.6, d: 0.05, g: 0.3, filters: [{ type: 'bandpass', f: 800, q: 0.7, pts: [[1.7, 4000]] }] });
      setTimeout(() => { try { g.disconnect(); lp.disconnect(); } catch (e) { } }, 2600);
    } else if (kind === 'window') {
      (L.droneOscs || []).forEach(o => { o.detune.setTargetAtTime(-45, t, 0.5); o.detune.setTargetAtTime(0, t + 2.2, 1.2); });
      L.thirdOsc.detune.setTargetAtTime(-45, t, 0.5); L.thirdOsc.detune.setTargetAtTime(0, t + 2.2, 1.2);
    }
  }

  // ---- flags ----
  function sync(initial) {
    if (!A.on || !window.G) return;
    const L = A.L;
    const lamp = !!G.get('lampLit'), win = !!G.get('windowOpen'), hatched = !!G.get('hatched'), door = !!G.get('doorOpen');
    if (lamp !== A.lamp) { A.lamp = lamp; ramp(L.lampOn.gain, lamp ? 0.5 : 0, lamp ? 1.2 : 0.3); if (lamp && !initial) uncanny('lamp'); }
    if (win !== A.win) {
      A.win = win;
      if (win && !initial) uncanny('window');
      ramp(L.rainTone.frequency, win ? 6500 : RAIN_CLOSED, initial ? 0.1 : 1.5);
      ramp(L.dropLayers[2].g.gain, win ? 1 : 0, initial ? 0.1 : 1.5);
      ramp(L.rainGain.gain, win ? 1.2 : 0.9, initial ? 0.1 : 1.5);
      if (!win) ramp(L.windG.gain, 0, 0.5);
      else ramp(L.windG.gain, 0.15, 2);
    }
    const stage = door ? 3 : (hatched || A.hatchHeard) ? 2 : lamp ? 1 : 0;
    if (stage !== M.stage) setMusicStage(stage, initial);
    onView(G.view());
  }

  /* =====================================================================================
   *  Music: music-box motif in D minor (major at the finale) + drone pad
   * ===================================================================================== */
  const MIN = [0, 2, 3, 5, 7, 8, 10], MAJ = [0, 2, 4, 5, 7, 9, 11];
  /* THE MOTH THEME (phrase A, D minor, 3/4):
   *   | A4  F5--   | F5 E5 F5 G5 F5 (wing-beat turn) | D5-- C#5 | C5-- Bb4 | A4--- |
   *   a rising minor 6th, a fluttering neighbour-note turn, then a chromatic lament D-C#-C-Bb-A.
   *   Harmony: i  bVI  i-V  III(F)  V  - the lament passes through the "wrong" C natural over F major.
   * The other phrases develop it (sequence up a 4th, inversion as a falling 6th, Neapolitan lament,
   * Dorian B-natural answer, turn chains); Z is the theme in MAJOR, resolving, for the finale.
   * n: [scale degree (0 = D5) | null rest, beats, accidental (+1 minor only, -1 both modes)]
   * ch: [beat offset, root degree, quality: 'M' major triad, 'N' Neapolitan (bII)]
   */
  const PHR = {
    A:  { n: [[-3, 1], [2, 2], [2, 0.5], [1, 0.5], [2, 0.5], [3, 0.5], [2, 1], [0, 2], [-1, 1, 1], [-1, 2], [-2, 1], [-3, 3]],
          ch: [[0, 0], [3, 5], [6, 0], [8, 4, 'M'], [9, 2], [12, 4, 'M']], fixed: true },
    B:  { n: [[0, 1], [5, 2], [5, 0.5], [4, 0.5], [5, 0.5], [6, 0.5], [5, 1], [4, 1], [3, 1], [2, 1], [1, 2], [null, 1]],
          ch: [[0, 3], [3, 5], [6, 0], [9, 4, 'M']] },
    A2: { n: [[-3, 1], [2, 2], [2, 0.5], [1, 0.5], [2, 0.5], [3, 0.5], [2, 1], [0, 1], [-2, 1], [-3, 1], [1, 2], [-1, 1, 1], [0, 3]],
          ch: [[0, 0], [3, 5], [6, 3], [9, 4, 'M'], [12, 0]], cad: true },
    C:  { n: [[2, 2], [1, 1], [1, 2, -1], [0, 1], [-1, 3, 1], [0, 3]],
          ch: [[0, 0], [3, 1, 'N'], [6, 4, 'M'], [9, 0]], cad: true },
    D:  { n: [[2, 1], [-3, 2], [-2, 1], [-3, 1], [-4, 1], [-3, 2], [-5, 1], [-7, 3]],
          ch: [[0, 0], [3, 5], [6, 0], [9, 0]], cad: true },
    E:  { n: [[2, 0.5], [1, 0.5], [2, 0.5], [3, 0.5], [2, 1], [4, 0.5], [3, 0.5], [4, 0.5], [5, 0.5], [4, 1], [7, 2], [2, 1], [1, 2], [-1, 1, 1], [0, 3]],
          ch: [[0, 0], [3, 2], [6, 3], [9, 4, 'M'], [12, 0]], cad: true },
    F:  { n: [[0, 1], [2, 1], [4, 1], [5, 2, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 3]],
          ch: [[0, 0], [3, 3, 'M'], [6, 6], [9, 0]], cad: true },
    Z:  { n: [[-3, 1], [2, 2], [2, 0.5], [1, 0.5], [2, 0.5], [3, 0.5], [2, 1], [4, 1.5], [3, 0.5], [1, 1], [0, 3]],
          ch: [[0, 0], [3, 5], [6, 4], [9, 0]], cad: true, finale: true, fixed: true },
  };
  const PNAMES = Object.keys(PHR);
  const M = { stage: -1, timer: null, last: null, recent: [], voices: null, bass: null };
  function degMidi(d, mode, acc) {
    const sc = mode === 'major' ? MAJ : MIN, o = Math.floor(d / 7), s = ((d % 7) + 7) % 7;
    return 74 + 12 * o + sc[s] + (acc < 0 || (acc > 0 && mode === 'minor') ? acc : 0);
  }
  // pitch classes of the triad (root, third, fifth)
  function chordPcs(r, q, mode) {
    let m = [r, r + 2, r + 4].map(d => degMidi(d, mode));
    if (q === 'N') { const b = degMidi(r, mode) - 1; m = [b, b + 4, b + 7]; }
    if (q === 'M' && m[1] - m[0] === 3) m[1]++;
    return m.map(x => ((x % 12) + 12) % 12);
  }
  // Melody note sounding at each chord onset (and the one before it), from a note list.
  function melAt(notes, beatPos, mode, oct) {
    let pos = 0, cur = null, prev = null;
    for (const [d, l, acc] of notes) {
      if (d != null) {
        const m = degMidi(d, mode, acc) + 12 * (oct || 0);
        if (pos === beatPos) { cur = m; break; }
        if (pos < beatPos) prev = m;
      }
      if (pos > beatPos) break;
      pos += l;
    }
    return { prev, cur };
  }
  const isPar = (a0, b0, a1, b1) => { // parallel perfect 5th/8ve between two moving parts
    const pi = ((b0 - a0) % 12 + 12) % 12, ni = ((b1 - a1) % 12 + 12) % 12, ma = a1 - a0, mb = b1 - b0;
    return (pi === 0 || pi === 7) && pi === ni && ma !== 0 && mb !== 0 && Math.sign(ma) === Math.sign(mb);
  };
  // Nearest-voice voicing: 3 upper voices (D3..A#4) + bass (D2..D3).
  // Penalises parallel 5ths/8ves (between voices and against the melody) and pad doublings of the melody note.
  function voiceChord(pcs, st, mel) {
    const inRange = (pc, lo, hi) => { const r = []; for (let m = lo; m <= hi; m++) if (m % 12 === pc) r.push(m); return r; };
    const prev = st.voices || [57, 62, 65], pb = st.bass == null ? 50 : st.bass;
    const mc = mel && mel.cur != null ? mel.cur : null, mp = mel && mel.prev != null ? mel.prev : st.mel;
    const mpc = mc == null ? -1 : mc % 12;
    // root position, or first inversion (cheap 25% of the time, otherwise a small cost)
    const bassOpts = inRange(pcs[0], 38, 50).map(b => [b, 0]).concat(inRange(pcs[1], 40, 50).map(b => [b, R() < 0.25 ? 0 : 4]));
    // pad voicings: any 3 distinct chord tones covering the chord, except the melody's pitch class (the tune supplies it)
    const pool = []; for (let m = 50; m <= 70; m++) if (pcs.includes(m % 12)) pool.push(m);
    const cands = [];
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) for (let k = j + 1; k < pool.length; k++) {
      const v = [pool[i], pool[j], pool[k]];
      if (v[2] - v[0] > 14) continue;
      if (!pcs.every(pc => pc === mpc || v.some(x => x % 12 === pc))) continue;
      cands.push(v);
    }
    let best = null;
    for (const v of cands) {
      for (const [bs, bc] of bassOpts) {
        if (v[0] - bs < 3) continue;
        const all = [bs].concat(v), pall = [pb].concat(prev);
        let cost = Math.abs(bs - pb) * 0.35 + bc;
        for (let i = 0; i < 3; i++) cost += Math.abs(v[i] - prev[i]);
        if (v[0] % 12 === v[2] % 12 || v[0] % 12 === v[1] % 12 || v[1] % 12 === v[2] % 12) cost += 6; // octave doublings invite parallels later
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (isPar(pall[i], pall[j], all[i], all[j])) cost += 40;
        if (mc != null) {
          for (const p of v) {
            if (p % 12 === mc % 12) cost += (mc - p <= 24 ? 4 : 2); // doubling the melody's pitch class in the pad
            if (p >= mc) cost += 12;                      // pad must stay under the tune
          }
          if (mp != null) for (let i = 0; i < 4; i++) if (isPar(pall[i], mp, all[i], mc)) cost += 40;
        }
        cost += R() * 1.5;
        if (!best || cost < best.cost) best = { cost, v, bs };
      }
    }
    if (!best) best = { v: prev, bs: pb };
    st.voices = best.v; st.bass = best.bs; if (mc != null) st.mel = mc;
    return best;
  }
  // Rhythmic displacement: turns some even pairs into dotted pairs.
  function varyNotes(n, o) {
    n = n.map(x => x.slice());
    if (o.displace) for (let i = 0; i < n.length - 2; i++) {
      if (n[i][0] != null && n[i + 1][0] != null && n[i][1] === 1 && n[i + 1][1] === 1 && R() < 0.35) { n[i][1] = 1.5; n[i + 1][1] = 0.5; i++; }
    }
    return n;
  }
  // Schedules a phrase in K starting at t0; returns its length in seconds.
  function playPhrase(K, dest, name, t0, o) {
    const ph = PHR[name], mode = o.stage >= 2 ? 'major' : 'minor', beat = o.beat || 1.02, oct = o.oct || 0;
    const st = o.st || M;
    let notes = varyNotes(ph.n, o);
    let total = notes.reduce((a, x) => a + x[1], 0);
    if (o.fragment) { // first two bars only
      let acc = 0, k = 0;
      while (k < notes.length && acc < 6) acc += notes[k++][1];
      notes = notes.slice(0, k); total = acc;
    }
    let t = t0, pos = 0;
    notes.forEach(([d, len, acc], i) => {
      const rit = i >= notes.length - 2 ? 1.18 : 1;
      if (d != null) {
        const m = degMidi(d, mode, acc) + 12 * oct;
        const vel = (pos % 3 === 0 ? 0.42 : 0.33) * rr(0.85, 1.1) * (o.vel || 1);
        const tt = t + rr(-0.012, 0.025);
        if (o.grace && pos % 3 === 0 && len >= 1 && R() < 0.3) mbNote(K, dest, tt - 0.07, mtof(degMidi(d + 1, mode) + 12 * oct), vel * 0.4, { decay: 0.8 });
        mbNote(K, dest, tt, mtof(m), vel, { decay: o.stage >= 3 ? 3.4 : 2.6 });
        if (o.stage >= 3) mbNote(K, dest, tt + 0.01, mtof(m + 12), vel * 0.3, { decay: 2 });
      }
      pos += len; t += len * beat * rit;
    });
    const chords = ph.ch.filter(c => c[0] < total);
    chords.forEach((c, i) => {
      const tb = t0 + c[0] * beat, nextB = i + 1 < chords.length ? chords[i + 1][0] : Math.max(total, c[0] + 3);
      const len = (nextB - c[0]) * beat;
      const vc = voiceChord(chordPcs(c[1], c[2], mode), st, melAt(notes, c[0], mode, oct));
      if (o.stage >= 1) {
        vc.v.forEach(m => padNote(K, dest, tb, mtof(m), len, o.stage >= 3 ? 0.032 : 0.024, o.stage >= 2, Math.min(0.9, len * 0.5), 2.4));
        padNote(K, dest, tb, mtof(vc.bs), len, 0.04, false, 0.35, 2);
      } else if (i === 0 || (i === chords.length - 1 && R() < 0.5)) {
        padNote(K, dest, tb, mtof(vc.bs), len * 1.4, 0.035, false, 0.8, 2.5);
      }
    });
    return t - t0;
  }
  function choosePhrase() {
    if (!M.last) return 'A'; // the first music heard is the moth theme itself
    const pool = M.stage >= 2 ? ['Z', 'A2', 'B', 'E', 'C'] : PNAMES.filter(n => !PHR[n].finale);
    let cand = pool.filter(n => !M.recent.includes(n));
    if (!cand.length) cand = pool;
    // the theme (A) comes back often enough to be remembered, developments fill the rest
    const w = cand.map(n => (n === 'A' || n === 'Z' ? 1.6 : n === 'A2' ? 0.8 : 1));
    let r = R() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < cand.length; i++) { r -= w[i]; if (r <= 0) return cand[i]; }
    return cand[0];
  }
  function schedulePhrase(name, t0, extra) {
    const o = Object.assign({
      stage: M.stage, beat: M.stage >= 3 ? 1.12 : rr(0.96, 1.08), displace: R() < 0.3, grace: R() < 0.25,
      fragment: M.stage < 3 && R() < 0.15,
    }, extra || {});
    if (o.oct == null) {
      const hi = Math.max(...PHR[name].n.map(x => x[0] == null ? -99 : x[0]));
      o.oct = M.stage < 1 && R() < 0.22 ? -1 : (hi <= 5 && M.stage < 3 && R() < 0.12 ? 1 : 0);
    }
    if (PHR[name].fixed) Object.assign(o, { displace: false, grace: false, fragment: !!(extra && extra.fragment), oct: 0, vel: 1, beat: M.stage >= 3 ? 1.12 : 1.02 });
    if (o.oct === -1) o.vel = 1.25; else if (o.oct === 1) o.vel = 0.75;
    M.last = name;
    M.recent.push(name); if (M.recent.length > 3) M.recent.shift();
    const dur = playPhrase(KM, KM.out, name, t0, o);
    M.busyUntil = t0 + dur;
    return dur;
  }
  // After each puzzle solve: a short, always-identical 2-bar quote of the moth theme (A4 F5 | F E F G F).
  const SOLVES = ['clockSolved', 'lampLit', 'drawerOpen', 'windowOpen', 'inkSeen', 'boxOpen'];
  function themeQuote(flag) {
    if (!A.on || A.finished || !SOLVES.includes(flag) || !running()) return;
    const t0 = Math.max(ctx.currentTime + 1.6, (M.busyUntil || 0) + 1);
    if (t0 - ctx.currentTime > 6) return; // a phrase is playing; the theme will come round anyway
    const last = M.last, rec = M.recent.slice();
    schedulePhrase('A', t0, { fragment: true });
    M.last = last; M.recent = rec;
  }
  function seqNext(delay) {
    clearTimeout(M.timer);
    M.timer = setTimeout(() => {
      if (!A.on || A.finished) return;
      if (!running()) { seqNext(2); return; }
      const t0 = ctx.currentTime + 0.15;
      let dur = schedulePhrase(choosePhrase(), t0);
      if (!PHR[M.last].cad && R() < 0.45) { const g = rr(1.2, 3); dur += g + schedulePhrase(choosePhrase(), t0 + dur + g); } // answer phrase
      let gap = rr(20, 60);
      if (M.stage >= 3) gap = rr(6, 12);
      else if (M.stage === 2) gap = rr(10, 25);
      seqNext(dur + gap);
    }, delay * 1000);
  }
  function setMusicStage(s, initial) {
    const prev = M.stage;
    M.stage = s;
    if (!A.on) return;
    const L = A.L, now = ctx.currentTime;
    ramp(L.droneThird.gain, s >= 1 ? 1 : 0, 3);
    L.thirdOsc.frequency.setTargetAtTime(mtof(s >= 2 ? 54 : 53), now, 0.5);
    ramp(L.droneLP.frequency, s >= 3 ? 1100 : s >= 1 ? 520 : 380, 3);
    ramp(L.shimmer.gain, s >= 3 ? 1 : s >= 2 ? 0.35 : 0, 4);
    if (!initial && s === 3 && prev < 3) {
      // luminous resolution: bloom + motif in major right away
      ramp(L.rainGain.gain, 0.45, 4);
      clearTimeout(M.timer);
      const t = now + 0.4;
      [50, 57, 62, 66, 69, 76].forEach(m => padNote(KM, KM.out, t, mtof(m), 7, 0.03, true, 3, 6));
      const d = schedulePhrase('Z', t + 1.5, { stage: 3, beat: 1.15, displace: false, fragment: false, grace: false, oct: 0 });
      seqNext(d + 3);
    } else if (!initial && s === 2 && prev < 2) {
      clearTimeout(M.timer); seqNext(1.5);
    }
  }
  function finalChord(K, dest, t) {
    [38, 45, 50, 54, 57, 64, 66, 69].forEach(m => padNote(K, dest, t, mtof(m), 5, m < 45 ? 0.06 : 0.04, true, 2.5, 9));
    // the moth theme's head, in major, over the final chord: A - F#... (turn) F# E F# G F# ... D
    const q = [[69, 0.4, 0.4], [78, 1.1, 0.42], [78, 2.4, 0.3], [76, 2.62, 0.26], [78, 2.84, 0.28], [79, 3.06, 0.28], [78, 3.3, 0.34], [86, 4.6, 0.3], [81, 4.62, 0.16], [98, 6.4, 0.1]];
    q.forEach(([m, dt, v]) => mbNote(K, dest, t + dt, mtof(m), v, { decay: 4.5 }));
    bell(K, dest, t, mtof(62), 0.08, 9);
  }
  function onFinish() {
    if (!ctx) return;
    A.finished = true;
    clearTimeout(M.timer);
    try {
      const L = A.L;
      if (A.on) { // leave a faint room with distant rain under the end card
        ramp(L.amb.gain, AMB_LEVEL * 0.55, 2.2); ramp(L.rainGain.gain, 0.15, 2.5); ramp(L.windG.gain, 0, 2);
        ramp(L.lampOn.gain, 0, 3); ramp(L.drone.gain, 0.0001, 2.5); ramp(L.shimmer.gain, 0.0001, 3);
      }
      finalChord(KM, KM.out, ctx.currentTime + 0.6);
    } catch (e) { }
  }

  /* =====================================================================================
   *  Wiring
   * ===================================================================================== */
  const gesture = () => { unlock(); if (running()) { window.removeEventListener('pointerdown', gesture, true); window.removeEventListener('keydown', gesture, true); } };
  window.addEventListener('pointerdown', gesture, true);
  window.addEventListener('keydown', gesture, true);
  document.addEventListener('visibilitychange', () => {
    try { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); } catch (e) { }
  });
  if (window.G && G.on) {
    G.on('start', () => { try { if (A.on) stopAmbience(0.3); A.started = true; A.cracked = false; A.hatchHeard = false; M.last = null; M.recent = []; M.voices = null; M.bass = null; A.win = false; A.lamp = false; setTimeout(maybeStartAmb, A.on ? 600 : 0); } catch (e) { } });
    G.on('flag', (k, v) => { try { if (k !== 'finished') sync(false); if (v) themeQuote(k); } catch (e) { } });
    G.on('view', (id) => { try { onView(id); } catch (e) { } });
    G.on('finish', () => { try { onFinish(); } catch (e) { } });
  }

  /* ---- offline rendering for level checks: Audio2._offline('chime') -> {peak, rms, ...} ---- */
  async function offline(name, secs) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const sr = 44100, len = Math.floor(sr * (secs || 6));
    const c = new OAC(2, len, sr);
    const out = c.createGain(); out.connect(c.destination);
    const rev = c.createConvolver(); rev.buffer = buildIR(c, name.startsWith('music') || name === 'final' ? 3.6 : 1.3, 0.8, 0.01, 8);
    const rg = c.createGain(); rg.gain.value = 0.7; rev.connect(rg); rg.connect(out);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.37; lg.gain.value = 6; lfo.connect(lg); lfo.start();
    const K = { c, out, wet: rev, nb: noiseBuffers(c), wow: lg };
    if (name.startsWith('music:')) {
      const [, ph, st] = name.split(':');
      const bus = c.createGain(); bus.gain.value = 0.55; bus.connect(out); const s = c.createGain(); s.gain.value = 0.6; bus.connect(s); s.connect(rev);
      playPhrase(K, bus, ph, 0.05, { stage: +(st || 0), st: {} });
    } else if (name === 'final') {
      const bus = c.createGain(); bus.gain.value = 0.55; bus.connect(out); const s = c.createGain(); s.gain.value = 0.6; bus.connect(s); s.connect(rev);
      finalChord(K, bus, 0.05);
    } else SFX[name](K, 0.05, {});
    const buf = await c.startRendering();
    let peak = 0, sum = 0, first = -1, last = 0;
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) {
        const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i];
        if (a > 0.001) { if (first < 0 || i < first) first = i; if (i > last) last = i; }
      }
    }
    const active = Math.max(1, last - first);
    let asum = 0;
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = first; i < last; i++) asum += d[i] * d[i]; }
    let zc = 0; { const d = buf.getChannelData(0); for (let i = first + 1; i < last; i++) if ((d[i] >= 0) !== (d[i - 1] >= 0)) zc++; }
    return { name, zcrHz: Math.round(zc / 2 / (active / sr)), peak: +peak.toFixed(3), rmsActive: +Math.sqrt(asum / (2 * active)).toFixed(4), audibleSec: +(active / sr).toFixed(2), nan: !isFinite(sum) };
  }

  window.Audio2 = {
    play, unlock, setMuted, setVolume,
    isMuted: () => muted,
    getVolume: () => volume,
    names: Object.keys(SFX),
    _offline: offline,
    _meter(ms) { // debug: RMS / peak of the master output over ms
      if (!ctx) return Promise.resolve(null);
      if (!this._an) { this._an = ctx.createAnalyser(); this._an.fftSize = 2048; comp.connect(this._an); }
      const an = this._an, d = new Float32Array(an.fftSize); let pk = 0, s = 0, n = 0;
      return new Promise(res => { const iv = setInterval(() => { an.getFloatTimeDomainData(d); for (const x of d) { pk = Math.max(pk, Math.abs(x)); s += x * x; n++; } }, 40);
        setTimeout(() => { clearInterval(iv); res({ peak: +pk.toFixed(3), rms: +Math.sqrt(s / Math.max(1, n)).toFixed(4), dBFS: +(20 * Math.log10(Math.sqrt(s / Math.max(1, n)) + 1e-9)).toFixed(1) }); }, ms || 2000); });
    },
    _mix(o) { if (o.amb != null) ambBus.gain.value = o.amb; if (o.mus != null) musBus.gain.value = o.mus; if (o.sfx != null) sfxBus.gain.value = o.sfx; },
    _analyze(stage) { // debug: voicings, melody notes that clash at chord onsets, parallel 5ths/8ves
      const mode = stage >= 2 ? 'major' : 'minor', out = {};
      PNAMES.forEach(nm => {
        const ph = PHR[nm], st = {}, res = { chords: [], clashes: [], parallels: 0 };
        let prev = null;
        ph.ch.forEach(c => {
          const pcs = chordPcs(c[1], c[2], mode), vc = voiceChord(pcs, st, melAt(ph.n, c[0], mode, 0)), all = [vc.bs].concat(vc.v);
          res.chords.push(all.join('/'));
          if (prev) for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
            const pi = ((prev[j] - prev[i]) % 12 + 12) % 12, ni = ((all[j] - all[i]) % 12 + 12) % 12, mi = all[i] - prev[i], mj = all[j] - prev[j];
            if ((pi === 0 || pi === 7) && pi === ni && mi && Math.sign(mi) === Math.sign(mj)) res.parallels++;
          }
          prev = all;
          let pos = 0;
          ph.n.forEach(([d, len, acc]) => { if (d != null && pos === c[0]) { const pc = ((degMidi(d, mode, acc) % 12) + 12) % 12; if (!pcs.includes(pc)) res.clashes.push('beat ' + pos + ' pc ' + pc + ' vs ' + pcs); } pos += len; });
        });
        out[nm] = res;
      });
      return out;
    },
    _state: () => ({ ctx: ctx ? ctx.state : 'none', amb: A.on, stage: M.stage, lamp: A.lamp, win: A.win, finished: A.finished, last: M.last }),
  };
})();
