/* Work — a first-person stroll down a city block.
   Scroll walks you forward. The walk pauses at each place I've worked; a deliberate scroll walks on past.
   Move the mouse (or drag sideways) to look around. Day turns to night by the last stop. */
(function () {
  const RM = !!window.reducedMotion;
  const TAU = Math.PI * 2;
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const span = (p, a, b) => ease((p - a) / (b - a));
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const hash = (a, b = 0, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

  const C = fitCanvas(document.getElementById('street'));
  const cv = document.getElementById('street'), fade = document.getElementById('streetFade');

  /* =========================================================
     THE BLOCK
     ========================================================= */
  const FACADE = 10;
  const STYLE = [
    { side: 1, door: 28, style: 'pharma', col: '#ecebe6', h: 18, accent: '#2f9e6e' },
    { side: -1, door: 64, style: 'glass', col: '#2c4552', h: 92, accent: '#3cc3c9' },
    { side: 1, door: 108, style: 'brick', col: '#8c3d2e', h: 26, accent: '#cc0033', plate: 'dark' },
    { side: -1, door: 146, style: 'press', col: '#6a665d', h: 34, accent: '#e9c46a', plate: 'dark' },
  ];
  const ORGS = SITE.work.slice(0, 4).map((w, i) => ({ ...w, ...STYLE[i], half: 10, idx: i }));
  ORGS.forEach(o => { if (o.logo) { o.img = new Image(); o.img.src = o.logo; } });
  // the places from the other page: a comic shop, a music shop, a chess club, a picture house, a planetarium
  const LANDMARKS = [
    { side: -1, door: 34, half: 7, lm: 'comics', h: 14, col: '#2f356e' },
    { side: 1, door: 52, half: 7, lm: 'music', h: 16, col: '#5e4234' },
    { side: -1, door: 99, half: 6, lm: 'chess', h: 15, col: '#2c3f33' },
    { side: -1, door: 120, half: 8, lm: 'theater', h: 21, col: '#5a1f24' },
    { side: 1, door: 136, half: 10, lm: 'planetarium', h: 20, col: '#d8d1bf' },
  ];
  const CROSS = [[78, 90], [158, 170]];
  const CROSS_NAME = ['Bayes St', 'Gradient Ave'];
  const END = 186, ZMAX = 164;
  const PAL = ['#8a4a3a', '#a0644c', '#6e4a3e', '#b9a58a', '#c7b8a0', '#7d7f86', '#5b5e66', '#9b8770', '#4b5560', '#a3988a', '#8d6b55'];

  function genSide(side) {
    const r = rng(side > 0 ? 11 : 29), list = [], slots = [...ORGS, ...LANDMARKS].filter(o => o.side === side).map(o => ({ o, done: false }));
    let z = -24;
    while (z < END) {
      const cr = CROSS.find(([c0, c1]) => z >= c0 - .01 && z < c1); if (cr) { z = cr[1]; continue; }
      const sl = slots.find(s => !s.done && s.o.door - s.o.half < z + 24 && s.o.door + s.o.half > z);
      let z0 = z, len, org = null, lm = null;
      if (sl) { const start = sl.o.door - sl.o.half; if (start - z >= 7) len = start - z; else { sl.done = true; z0 = Math.max(z, start); len = sl.o.door + sl.o.half - z0; if (sl.o.lm) lm = sl.o; else org = sl.o; } }
      else len = 24 + r() * 12;
      const nc = CROSS.find(([c0]) => c0 > z0 + .01); if (nc && z0 + len > nc[0]) len = nc[0] - z0;
      if (len < 5) { z = z0 + len + .01; continue; }
      const sp = org || lm, st = org ? org.style : lm ? 'lm' : (r() < .2 ? 'glass' : r() < .55 ? 'brick' : 'stone');
      list.push({ side, z0, z1: z0 + len, h: sp ? sp.h : 13 + r() * r() * 58, depth: 14 + r() * 10, col: hex(sp ? sp.col : st === 'glass' ? ['#33424d', '#3d4b55', '#2a3a44'][Math.floor(r() * 3)] : PAL[Math.floor(r() * PAL.length)]), seed: Math.floor(r() * 1e6), org, lm, style: st, tower: !sp && st !== 'glass' && r() < .45, awning: r() < .5 ? ['#1f5e46', '#7a2a2a', '#22406b', '#5b3a6b', '#8a5a1e'][Math.floor(r() * 5)] : null });
      z = z0 + len;
    }
    return list;
  }
  const BUILDINGS = [...genSide(1), ...genSide(-1)];
  const catB = BUILDINGS.find(b => b.side === 1 && !b.org && !b.lm && b.z0 > 144 && b.h > 18) || BUILDINGS.find(b => b.side === 1 && !b.org && !b.lm && b.z0 > 60);
  const knightB = BUILDINGS.find(b => b.side === -1 && !b.org && !b.lm && b.z0 > 38 && b.z0 < 60);

  const PROPS = [];
  const nearDoor = z => [...ORGS, ...LANDMARKS].some(o => Math.abs(o.door - z) < o.half - 1);
  const inCross = (z, m = 0) => CROSS.some(([c0, c1]) => z > c0 - m && z < c1 + m);
  for (const s of [1, -1]) {
    for (let z = 12 + (s > 0 ? 0 : 17); z < END; z += 34) if (!nearDoor(z) && !inCross(z, 2)) PROPS.push({ t: 'tree', x: s * 7.7, z, s: .85 + hash(z | 0, s) * .35 });
    for (let z = 22 + (s > 0 ? 0 : 24); z < END; z += 48) if (!inCross(z, 1)) PROPS.push({ t: 'lamp', x: s * 6.5, z, side: s });
    CROSS.forEach(([c0, c1], i) => PROPS.push({ t: 'signal', x: s * 6.4, z: s > 0 ? c0 - 1 : c1 + 1, side: s, name: CROSS_NAME[i] }));
  }
  [[-1, 21], [1, 124]].forEach(([s, z]) => PROPS.push({ t: 'hydrant', x: s * 6.7, z }));
  PROPS.push({ t: 'subway', x: 8.2, z: 93 });
    PROPS.push({ t: 'cart', x: -7.6, z: 76 });
  PROPS.push({ t: 'steam', x: 2.6, z: 72 });
  PROPS.push({ t: 'news', x: -7.0, z: 140 }); PROPS.push({ t: 'news', x: -7.0, z: 141.2 });
  for (const s of [1, -1]) for (let z = 10 + (s > 0 ? 4 : 0); z < END; z += 9.5) if (!nearDoor(z) && !inCross(z, 4) && hash(z | 0, s, 7) < .12) PROPS.push({ t: 'car', x: s * 5.1, z, dir: 0, col: carCol(hash(z | 0, s, 3)) });
  function carCol(u) { return u < .3 ? '#f2c230' : ['#2b2f36', '#8a1f22', '#c9ccd1', '#1f3c63', '#3b4a3a', '#6b6f75'][Math.floor(u * 6) % 6]; }
  const TRAFFIC = [...Array(3)].map((_, i) => ({ lane: i % 2 ? -3.7 : 3.7, v: i % 2 ? 10 + hash(i) * 4 : 5 + hash(i, 1) * 4, base: hash(i, 2) * 300, col: hash(i, 4) < .55 ? '#f2c230' : carCol(hash(i, 5)) }));

  /* text painted once, then mapped onto walls */
  const tcache = {};
  function textCanvas(key, text, font, color, w, h, opts = {}) {
    if (tcache[key]) return tcache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    if (opts.bg) { x.fillStyle = opts.bg; x.fillRect(0, 0, w, h); }
    x.fillStyle = color; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (opts.glow) { x.shadowColor = opts.glow; x.shadowBlur = h * .15; }
    x.fillText(text, w / 2, h / 2 + (opts.dy || 0), w * .96);
    return (tcache[key] = c);
  }
  const TICKER = (() => {
    const msg = 'MODEL CONVERGES AFTER LONG NIGHT  •  LOCAL KNIGHT ALREADY SIX MOVES AHEAD  •  STATE TENNIS RUNNER-UP STILL REPLAYING THAT POINT  •  BLACK HOLES: STILL UP AT 2 A.M.  •  FOUR STRINGS OF EIGHTY-EIGHT KEYS?  •  ';
    const c = document.createElement('canvas'); c.width = 4200; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#120c04'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#ffb547'; x.font = '700 40px JetBrains Mono, monospace'; x.textBaseline = 'middle';
    x.shadowColor = '#ff9a1f'; x.shadowBlur = 10; x.fillText(msg + msg, 10, 34); return c; })();

  /* =========================================================
     THE WALKER, AND WHERE THEY LOOK
     ========================================================= */
  const cam = { z: 0, target: 0, step: null, n: 0, bob: 0, x: 0, roll: 0 };
  window.__walk = cam;
  const look = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
  const STOPS = ORGS.map(o => ({ z: o.door - 8.5, org: o, passed: false }));
  function walk(dt) {
    if (!cam.step && Math.abs(cam.target - cam.z) > .05 && mode === 'walk') {
      const far = Math.abs(cam.target - cam.z) > 12, L = far ? 2.1 : 1.15;
      cam.step = { z0: cam.z, d: clamp(cam.target - cam.z, -L, L), t: 0, T: RM ? .1 : far ? .17 : .25 };
    }
    if (cam.step) {
      const s = cam.step; s.t = Math.min(1, s.t + dt / s.T);
      const e = s.t < .5 ? 2 * s.t * s.t : 1 - Math.pow(-2 * s.t + 2, 2) / 2;
      cam.z = s.z0 + s.d * e; cam.bob = RM ? 0 : Math.sin(Math.PI * s.t);
      if (s.t >= 1) { cam.step = null; cam.n++; }
    } else cam.bob *= .8;
    const side = cam.n % 2 ? 1 : -1;
    cam.x = side * .018 * cam.bob; cam.roll = side * .0012 * cam.bob;
    look.yaw = lerp(look.yaw, mode === 'walk' ? look.ty : 0, .08); look.pitch = lerp(look.pitch, mode === 'walk' ? look.tp : 0, .08);
  }

  /* =========================================================
     DRAWING
     ========================================================= */
  let W = 0, H = 0, f = 0, hy = 0, camY = 1.62, night = 0, Lk = 1, fogAmt = 0, fogCol = [150, 170, 190], cyw = 1, syw = 0;
  const fogOf = z => (1 - Math.exp(-Math.max(0, z - cam.z) / 95)) * lerp(.55, .8, night);
  const depth = (x, z) => (x - cam.x) * syw + (z - cam.z) * cyw;
  const nearZ = x => cam.z + Math.max(.35, (.6 - (x - cam.x) * syw) / cyw);
  const P = (x, y, z) => { const dx = x - cam.x, dz = z - cam.z, xr = dx * cyw - dz * syw, zr = Math.max(.3, dx * syw + dz * cyw), k = f / zr; return [W / 2 + xr * k, hy - (y - camY) * k, k]; };
  const quad = (ctx, a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); };
  const lit = c => mix(mix(mul(c, Lk), [16, 22, 40], night * .35), fogCol, fogAmt);
  const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else ctx.rect(x, y, w, h); };
  const line = (ctx, a, b) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  // paint something flat onto a wall (plane x = X), reading the right way round from the street
  function onWall(ctx, X, side, y0, y1, za, zb, w, h, draw) {
    za = Math.max(za, nearZ(X)); if (zb <= za) return;
    const [zl, zr] = side > 0 ? [zb, za] : [za, zb];
    const TL = P(X, y1, zl), TR = P(X, y1, zr), BL = P(X, y0, zl);
    ctx.save(); ctx.transform((TR[0] - TL[0]) / w, (TR[1] - TL[1]) / w, (BL[0] - TL[0]) / h, (BL[1] - TL[1]) / h, TL[0], TL[1]); draw(ctx); ctx.restore();
  }

  const SKY = { day: [hex('#3f86d6'), hex('#cfe4f6')], dusk: [hex('#3a3c74'), hex('#f2a35c')], night: [hex('#02040b'), hex('#141d33')] };
  function sky(ctx, t) {
    const a = night < .5 ? mix(SKY.day[0], SKY.dusk[0], night * 2) : mix(SKY.dusk[0], SKY.night[0], night * 2 - 1);
    const b = night < .5 ? mix(SKY.day[1], SKY.dusk[1], night * 2) : mix(SKY.dusk[1], SKY.night[1], night * 2 - 1);
    const g = ctx.createLinearGradient(0, hy - H, 0, hy); g.addColorStop(0, css(a)); g.addColorStop(1, css(b)); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, hy + 70);
    const off = -f * Math.tan(look.yaw);
    // stars
    if (night > .45) { const a2 = span(night, .45, .85);
      for (let i = 0; i < 170; i++) { const x = ((hash(i, 1) * 1.8 - .4) * W + off * .2), y = hash(i, 2) * hy * .9, tw = .55 + .45 * Math.sin(t * (1 + hash(i, 4) * 2) + i), sz = hash(i, 3) > .9 ? 1.9 : hash(i, 3) > .6 ? 1.3 : .9; ctx.fillStyle = `rgba(232,238,255,${(a2 * tw * (.35 + hash(i, 9) * .65)).toFixed(3)})`; ctx.fillRect(x, y, sz, sz); }
      const mx = W / 2 + off + Math.min(W * .1, 120), my = hy * .2, mr = Math.max(9, f * .018); ctx.fillStyle = `rgba(240,236,220,${a2})`; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill(); ctx.fillStyle = `rgba(190,186,170,${a2 * .5})`; [[-.3, -.2, .22], [.25, .1, .16], [-.05, .35, .12]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, TAU); ctx.fill(); });
      const mg = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 5); mg.addColorStop(0, `rgba(220,230,255,${.12 * a2})`); mg.addColorStop(1, 'rgba(220,230,255,0)'); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr * 5, 0, TAU); ctx.fill();
      const cyc = (t % 22) / 3; if (cyc < 1) { const x = lerp(-40, W + 40, cyc), y = hy * .3 - Math.sin(cyc * Math.PI) * hy * .1; ctx.save(); ctx.translate(x, y); ctx.rotate(-.12); ctx.fillStyle = `rgba(10,12,20,${a2})`; ctx.beginPath(); ctx.ellipse(0, 0, 9, 2.4, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(11, -.5, 2.2, 0, TAU); ctx.fill(); ctx.fillRect(12, -1.6, 6, 1.6); ctx.restore(); }
    }
    // clouds
    if (night < .85) { const ca = 1 - span(night, .5, .85), cc = night < .5 ? mix(hex('#ffffff'), hex('#ffc9a8'), night * 2) : mix(hex('#ffc9a8'), hex('#5a5f80'), night * 2 - 1);
      for (let i = 0; i < 5; i++) { const sp = 4 + hash(i, 3) * 6, cx = ((hash(i, 1) * (W + 400) + t * sp) % (W + 400)) - 200 + off * .3, cy = hy * (.08 + hash(i, 2) * .32), sc = (.6 + hash(i, 4) * .8) * Math.min(1.2, W / 1000);
        for (let k = 0; k < 6; k++) { const ox = (hash(i, k, 5) - .5) * 140 * sc, oy = (hash(i, k, 6) - .5) * 22 * sc, rx = (40 + hash(i, k, 7) * 50) * sc; ctx.fillStyle = css(cc, (.32 + .14 * (k % 2)) * ca * (night < .5 ? 1 : .6)); ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy, rx, rx * .38, 0, 0, TAU); ctx.fill(); } } }
    // the sun setting straight down the grid
    const dusk = Math.sin(Math.PI * clamp(night * 1.25, 0, 1));
    if (dusk > .02) { const sx = W / 2 + off, sy = hy - f * .012, R = f * .05; const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 7); sg.addColorStop(0, `rgba(255,214,150,${.75 * dusk})`); sg.addColorStop(.12, `rgba(255,170,90,${.45 * dusk})`); sg.addColorStop(1, 'rgba(255,140,80,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, hy + 40); ctx.fillStyle = `rgba(255,236,200,${.9 * dusk})`; ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.fill(); }
    // skyline down the avenue
    const zs = END + 160, base = P(0, 0, zs)[1], r = rng(77); let x = -150;
    while (x < 150) { const w = 10 + r() * 22, h = 40 + r() * r() * 220, a2 = P(x, 0, zs), b2 = P(x + w, h, zs); ctx.fillStyle = css(mix(lit(hex('#6a7686')), night > .5 ? hex('#0b1222') : hex('#a9bccd'), .45 + night * .3)); ctx.fillRect(a2[0], b2[1], b2[0] - a2[0], base - b2[1]);
      if (r() < .12) { const sp = P(x + w / 2, h + 60, zs); ctx.fillRect(sp[0] - 1, sp[1], 2, b2[1] - sp[1]); }
      if (night > .5) for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(255,214,140,${(.6 * (night - .5)).toFixed(3)})`; ctx.fillRect(a2[0] + r() * (b2[0] - a2[0]), b2[1] + r() * (base - b2[1]), 1.2, 1.2); }
      x += w + 2 + r() * 6; }
  }

  function ground(ctx) {
    const zf = cam.z + 900;
    const strip = (x0, x1, col, z0 = -1e9, z1 = zf, k = .9) => { const zn = Math.max(nearZ(x0), nearZ(x1)); if (z1 <= zn) return; z0 = Math.max(z0, zn); quad(ctx, P(x0, 0, z0), P(x1, 0, z0), P(x1, 0, z1), P(x0, 0, z1)); ctx.fillStyle = css(mul(lit(hex(col)), k)); ctx.fill(); };
    strip(-80, 80, '#474a50');
    strip(-FACADE - 30, -6.2, '#9a968e'); strip(6.2, FACADE + 30, '#9a968e');
    strip(-6.2, -6.0, '#c2bdb2'); strip(6.0, 6.2, '#c2bdb2');
    strip(-1.7, 1.7, '#85817a'); strip(-1.75, -1.6, '#b3aea2'); strip(1.6, 1.75, '#b3aea2');
    for (const [cx, side] of [[6.0, 1], [-6.0, -1], [1.75, 1], [-1.75, -1]]) { const h = Math.abs(cx) === 6 ? .15 : .12, zn = nearZ(cx); if ((cx - cam.x) * side <= 0) continue;
      quad(ctx, P(cx, 0, zn), P(cx, h, zn), P(cx, h, cam.z + 900), P(cx, 0, cam.z + 900)); ctx.fillStyle = css(mul(lit(hex('#8f8a80')), .7)); ctx.fill(); }
    if (night < .9) { const zn = nearZ(-FACADE), sh = .16 * (1 - night); quad(ctx, P(-FACADE, 0, zn), P(-2.4, 0, zn), P(-.6, 0, zf), P(-FACADE, 0, zf)); ctx.fillStyle = `rgba(10,14,24,${sh.toFixed(3)})`; ctx.fill(); }
    for (const mz of [24, 70, 117, 152]) { if (depth(-3, mz) < 1 || mz > cam.z + 140) continue; const m = P(-3.2, 0, mz), m2 = P(-2.4, 0, mz); ctx.fillStyle = css(lit(hex('#1c1d20'))); ctx.beginPath(); ctx.ellipse((m[0] + m2[0]) / 2, m[1], Math.abs(m2[0] - m[0]) * .9, Math.max(1, Math.abs(m2[0] - m[0]) * .09), 0, 0, TAU); ctx.fill(); }
    CROSS.forEach(([c0, c1]) => { strip(-90, 90, '#474a50', c0, c1);
      for (const [za, zb] of [[c0 - 3.2, c0 - .4], [c1 + .4, c1 + 3.2]]) for (let x = -5.8; x < 5.8; x += 1.1) if (Math.abs(x) > 1.9) strip(x, x + .55, '#e2dfd8', za, zb, 1);
      for (let z = c0 + .6; z < c1 - .6; z += 1.1) { strip(6.3, 9.8, '#e2dfd8', z, z + .55, 1); strip(-9.8, -6.3, '#e2dfd8', z, z + .55, 1); } });
    ctx.strokeStyle = css(lit(hex('#6f6b65')), .6); ctx.lineWidth = 1;
    for (let z = Math.ceil(cam.z / 1.5) * 1.5 + 1.5; z < cam.z + 80; z += 1.5) { if (inCross(z) || depth(0, z) < 1) continue; line(ctx, P(-1.6, 0, z), P(1.6, 0, z)); }
    ctx.strokeStyle = css(lit(hex('#7a766f')), .5);
    for (let z = Math.ceil(cam.z / 2) * 2 + 2; z < cam.z + 120; z += 2) { if (inCross(z)) continue; for (const s of [1, -1]) { if (depth(s * 6.2, z) < 1) continue; line(ctx, P(s * 6.2, 0, z), P(s * FACADE, 0, z)); } }
    for (let z = Math.ceil(cam.z / 9) * 9; z < cam.z + 260; z += 9) { if (inCross(z, 3)) continue; for (const s of [1, -1]) strip(s * 3.85 - .07, s * 3.85 + .07, '#ece8de', z, z + 3, 1); }
  }

  /* ---------- buildings ---------- */
  function building(ctx, b, t) {
    const s = b.side, X = s * FACADE, z0 = Math.max(b.z0, nearZ(X)); if (b.z1 <= z0) return;
    fogAmt = fogOf(Math.max(z0, (b.z0 + b.z1) / 2 - 4));
    const dz = z0 - cam.z, col = mul(lit(b.col), s < 0 ? lerp(.86, 1, night) : 1), hi = mul(col, 1.18), lo = mul(col, .72);
    if (depth(X, b.z0) > .6 && depth(X + s * b.depth, b.z0) > .6) { quad(ctx, P(X, 0, b.z0), P(X, b.h, b.z0), P(X + s * b.depth, b.h, b.z0), P(X + s * b.depth, 0, b.z0)); ctx.fillStyle = css(mul(col, s < 0 ? .9 : .76)); ctx.fill(); }
    const A0 = P(X, 0, z0), A1 = P(X, b.h, z0), B1 = P(X, b.h, b.z1), B0 = P(X, 0, b.z1);
    quad(ctx, A0, A1, B1, B0); const g = ctx.createLinearGradient(0, A1[1], 0, A0[1]); g.addColorStop(0, css(mul(col, 1.05))); g.addColorStop(1, css(mul(col, .84))); ctx.fillStyle = g; ctx.fill();
    if (b.tower) { const c = P(X + s * b.depth * .5, b.h, (b.z0 + b.z1) / 2), k = c[2], tc = lit(hex('#5b4636')); { const wg = ctx.createLinearGradient(c[0] - 1.5 * k, 0, c[0] + 1.5 * k, 0); wg.addColorStop(0, css(mul(tc, .8))); wg.addColorStop(.35, css(mul(tc, 1.25))); wg.addColorStop(1, css(mul(tc, .55))); ctx.fillStyle = wg; } rrect(ctx, c[0] - 1.5 * k, c[1] - 6 * k, 3 * k, 3.6 * k, .3 * k); ctx.fill(); ctx.fillStyle = css(mul(tc, 1.2)); for (let i = 0; i < 3; i++) ctx.fillRect(c[0] - 1.5 * k, c[1] - (5.4 - i * 1.1) * k, 3 * k, .12 * k); ctx.fillStyle = css(mul(tc, .8)); ctx.beginPath(); ctx.moveTo(c[0] - 1.7 * k, c[1] - 6 * k); ctx.lineTo(c[0], c[1] - 7.6 * k); ctx.lineTo(c[0] + 1.7 * k, c[1] - 6 * k); ctx.fill(); ctx.strokeStyle = css(mul(tc, .7)); ctx.lineWidth = Math.max(1, .15 * k); ctx.beginPath(); ctx.moveTo(c[0] - 1.2 * k, c[1] - 2.4 * k); ctx.lineTo(c[0] - 1.4 * k, c[1]); ctx.moveTo(c[0] + 1.2 * k, c[1] - 2.4 * k); ctx.lineTo(c[0] + 1.4 * k, c[1]); ctx.stroke(); }
    for (const [pa, pb] of [[b.z0, b.z0 + .55], [b.z1 - .55, b.z1]]) { if (pb <= z0) continue; quad(ctx, P(X - s * .05, 0, Math.max(pa, z0)), P(X - s * .05, b.h, Math.max(pa, z0)), P(X - s * .05, b.h, pb), P(X - s * .05, 0, pb)); ctx.fillStyle = css(mul(col, 1.1)); ctx.fill(); }
    quad(ctx, P(X - s * .35, b.h - .7, z0), P(X - s * .35, b.h, z0), P(X - s * .35, b.h, b.z1), P(X - s * .35, b.h - .7, b.z1)); ctx.fillStyle = css(hi); ctx.fill();
    quad(ctx, P(X - s * .3, b.h - 1.1, z0), P(X - s * .3, b.h - .7, z0), P(X - s * .3, b.h - .7, b.z1), P(X - s * .3, b.h - 1.1, b.z1)); ctx.fillStyle = css(lo); ctx.fill();
    quad(ctx, P(X, b.h - .7, z0), P(X - s * .35, b.h - .7, z0), P(X - s * .35, b.h - .7, b.z1), P(X, b.h - .7, b.z1)); ctx.fillStyle = css(mul(col, .4)); ctx.fill();
    quad(ctx, P(X, 0, z0), P(X, .6, z0), P(X, .6, b.z1), P(X, 0, b.z1)); ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fill();
    if (dz > 190) return;
    if (b.org) { orgBuilding(ctx, b, z0, t, col); return; }
    if (b.lm) { landmark(ctx, b, z0, t, col); return; }
    windows(ctx, b, z0, t, col, b.style);
    storefront(ctx, b, z0, col);
  }

  function windows(ctx, b, z0, t, col, style, opt = {}) {
    const s = b.side, X = s * FACADE, dz = z0 - cam.z, floors = Math.floor((b.h - (opt.base || 5)) / 3.4), hi = mul(col, 1.18);
    const sky = mix(hex('#24364a'), hex('#9cc4ea'), .45 * (1 - night)), winDay = mix(hex('#18212b'), hex('#7fa9d6'), .22 * (1 - night));
    if (style === 'glass') {
      quad(ctx, P(X, 4.4, z0), P(X, b.h - 1.1, z0), P(X, b.h - 1.1, b.z1), P(X, 4.4, b.z1)); const A1 = P(X, b.h, z0), B0 = P(X, 0, b.z1), gg = ctx.createLinearGradient(A1[0], A1[1], B0[0], B0[1]); gg.addColorStop(0, css(mix(sky, hex('#d7e7f3'), .4 * (1 - night)), .95)); gg.addColorStop(.55, css(winDay, .95)); gg.addColorStop(1, css(mix(winDay, sky, .3), .95)); ctx.fillStyle = gg; ctx.fill();
      for (let i = 0; i <= floors; i++) { const y = 4.4 + i * 3.4; quad(ctx, P(X, y, z0), P(X, y + .55, z0), P(X, y + .55, b.z1), P(X, y, b.z1)); ctx.fillStyle = css(mul(col, .62), .9); ctx.fill(); }
      ctx.strokeStyle = css(mul(col, .55), .9); ctx.lineWidth = 1;
      for (let z = Math.ceil(z0 / 1.6) * 1.6; z < b.z1; z += 1.6) line(ctx, P(X, 4.4, z), P(X, b.h - 1.1, z));
      if (night > .3) for (let i = 0; i < floors; i++) for (let z = Math.ceil(z0 / 1.6) * 1.6; z < b.z1 - 1.6; z += 1.6) if (hash(b.seed, i, z * 10 | 0) < .35 * night) { quad(ctx, P(X, 4.4 + i * 3.4 + .6, z + .1), P(X, 4.4 + i * 3.4 + 3.3, z + .1), P(X, 4.4 + i * 3.4 + 3.3, z + 1.5), P(X, 4.4 + i * 3.4 + .6, z + 1.5)); ctx.fillStyle = `rgba(255,226,170,${(.55 * night).toFixed(3)})`; ctx.fill(); }
      return;
    }
    if (style === 'ribbon') {
      for (let i = 0; i < floors; i++) { const y0 = 5 + i * 3.4, y1 = y0 + 2; quad(ctx, P(X, y0, z0), P(X, y1, z0), P(X, y1, b.z1 - .6), P(X, y0, b.z1 - .6)); const wg = ctx.createLinearGradient(0, P(X, y1, z0)[1], 0, P(X, y0, z0)[1]); wg.addColorStop(0, css(mix(sky, hex('#bfe8d6'), .2), .95)); wg.addColorStop(1, css(winDay, .95)); ctx.fillStyle = night > .3 ? `rgba(255,236,200,${.5 * night})` : wg; ctx.fill();
        if (dz < 70) { ctx.strokeStyle = css(mul(col, .6)); ctx.lineWidth = 1; for (let z = b.z0 + 1.2; z < b.z1 - .6; z += 1.5) if (z > z0) line(ctx, P(X, y0, z), P(X, y1, z)); } }
      return;
    }
    const arch = style === 'brick' || style === 'arched', fe = style === 'brick' && b.h < 48 && b.z1 - b.z0 > 9;
    for (let i = 0; i < floors; i++) {
      const y0 = (opt.base || 5) + .2 + i * 3.4, y1 = y0 + (style === 'arched' ? 2.3 : 1.95);
      for (let j = 0, z = b.z0 + 1.3; z + 1.3 < b.z1 - .7; j++, z += 2.6) {
        if (z + 1.3 < z0) continue;
        const za = Math.max(z, z0), zb = z + 1.3, wz = za - cam.z, h = hash(b.seed, i, j), on = night > .2 && h < .62 * night;
        if (wz < 110 && zb > z0) { const zr = Math.max(z, z0); quad(ctx, P(X, y0, zr), P(X, y1, zr), P(X + s * .32, y1, zr), P(X + s * .32, y0, zr)); ctx.fillStyle = css(mul(col, .45)); ctx.fill(); quad(ctx, P(X, y1, za), P(X + s * .32, y1, za), P(X + s * .32, y1, zb), P(X, y1, zb)); ctx.fillStyle = css(mul(col, .35)); ctx.fill(); }
        if (wz < 80) { quad(ctx, P(X - s * .06, y1, za - .12), P(X - s * .06, y1 + .28, za - .12), P(X - s * .06, y1 + .28, zb + .12), P(X - s * .06, y1, zb + .12)); ctx.fillStyle = css(arch ? mul(lit(hex('#d8cfbd')), 1) : hi); ctx.fill(); quad(ctx, P(X - s * .1, y0 - .16, za - .1), P(X - s * .1, y0, za - .1), P(X - s * .1, y0, zb + .1), P(X - s * .1, y0 - .16, zb + .1)); ctx.fill(); }
        quad(ctx, P(X, y0, za), P(X, y1, za), P(X, y1, zb), P(X, y0, zb));
        if (on) { ctx.fillStyle = css(mix(hex('#ffcf87'), hex('#ffe9c4'), h), .55 + .4 * night); ctx.fill(); }
        else { const wg = ctx.createLinearGradient(0, P(X, y1, za)[1], 0, P(X, y0, za)[1]); wg.addColorStop(0, css(sky, .95)); wg.addColorStop(1, css(winDay, .95)); ctx.fillStyle = wg; ctx.fill(); }
        if (style === 'arched' && wz < 90) { const c1 = P(X - s * .02, y1, za), c2 = P(X - s * .02, y1, zb), cm = P(X - s * .02, y1 + .6, (za + zb) / 2); ctx.beginPath(); ctx.moveTo(c1[0], c1[1]); ctx.quadraticCurveTo(cm[0], cm[1] - (c1[1] - cm[1]) * .6, c2[0], c2[1]); ctx.closePath(); ctx.fillStyle = on ? css(hex('#ffd89a'), .6) : css(sky, .9); ctx.fill(); ctx.strokeStyle = css(lit(hex('#e8e0cf'))); ctx.lineWidth = Math.max(1, c1[2] * .06); ctx.stroke(); }
        if (wz < 55) { ctx.strokeStyle = css(mul(col, .55)); ctx.lineWidth = 1; const zm = (za + zb) / 2, ym = y0 + (y1 - y0) * .55; if (zm > z0) line(ctx, P(X, y0, zm), P(X, y1, zm)); line(ctx, P(X, ym, za), P(X, ym, zb)); }
        if (b === catB && i === 3 && j === 2 && night > .6) { const c = P(X, y0 + .55, (za + zb) / 2), k = c[2]; ctx.fillStyle = 'rgba(8,8,10,.95)'; ctx.beginPath(); ctx.ellipse(c[0], c[1] - .2 * k, .28 * k, .3 * k, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(c[0] - .22 * k, c[1] - .38 * k); ctx.lineTo(c[0] - .16 * k, c[1] - .62 * k); ctx.lineTo(c[0] - .06 * k, c[1] - .42 * k); ctx.moveTo(c[0] + .22 * k, c[1] - .38 * k); ctx.lineTo(c[0] + .16 * k, c[1] - .62 * k); ctx.lineTo(c[0] + .06 * k, c[1] - .42 * k); ctx.fill(); if ((t % 5) > .2) { ctx.fillStyle = '#ffd34d'; ctx.fillRect(c[0] - .12 * k, c[1] - .3 * k, Math.max(1, .05 * k), Math.max(1, .04 * k)); ctx.fillRect(c[0] + .07 * k, c[1] - .3 * k, Math.max(1, .05 * k), Math.max(1, .04 * k)); } }
        if (b === knightB && i === 1 && j === 1 && night < .5) { const c = P(X, y0 + .05, (za + zb) / 2), k = c[2]; ctx.fillStyle = 'rgba(20,20,24,.85)'; ctx.font = `${Math.max(6, .9 * k)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('♞', c[0], c[1]); }
      }
      if (fe && dz < 95) {
        const fa = b.z0 + 1.3 + 2.6 - .35, fb = fa + 2.6 + 1.3 + .7, py = y0 - .25, out = 1.15; if (fb < z0) continue;
        const fA = Math.max(fa, z0);
        ctx.fillStyle = 'rgba(16,17,19,.92)'; quad(ctx, P(X, py, fA), P(X - s * out, py, fA), P(X - s * out, py, fb), P(X, py, fb)); ctx.fill();
        ctx.strokeStyle = 'rgba(16,17,19,.92)'; ctx.lineWidth = Math.max(1, P(X, 0, fA)[2] * .035);
        line(ctx, P(X - s * out, py + .95, fA), P(X - s * out, py + .95, fb));
        for (let z = fA; z <= fb; z += .45) line(ctx, P(X - s * out, py, z), P(X - s * out, py + .95, z));
        if (i < floors - 1) { const up = i % 2 ? [fb - .3, fa + .9] : [fa + .3, fb - .9]; if (Math.min(...up) > z0) { line(ctx, P(X - s * out * .5, py, up[0]), P(X - s * out * .5, py + 3.4, up[1])); line(ctx, P(X - s * out * .5, py + .9, up[0]), P(X - s * out * .5, py + 4.3, up[1])); } }
      }
    }
  }

  function storefront(ctx, b, z0, col, opt = {}) {
    const s = b.side, X = s * FACADE, dz = z0 - cam.z, sf0 = .3, sf1 = 3.2, fz1 = b.z1 - .55;
    quad(ctx, P(X, sf0, z0), P(X, sf1, z0), P(X + s * .5, sf1, z0), P(X + s * .5, sf0, z0)); ctx.fillStyle = css(mul(col, .4)); ctx.fill();
    quad(ctx, P(X, sf0, z0), P(X, sf1, z0), P(X, sf1, fz1), P(X, sf0, fz1)); ctx.fillStyle = opt.glass || (night > .2 ? css(mix(hex('#1a1d22'), hex('#ffcf87'), .5 * night), .92) : css(mix(hex('#1c2530'), hex('#9cc4ea'), .28), .95)); ctx.fill();
    if (dz < 70) { ctx.strokeStyle = css(mul(col, .5)); ctx.lineWidth = 1.2; for (let z = b.z0 + 2; z < fz1; z += 1.9) if (z > z0) line(ctx, P(X, sf0, z), P(X, sf1, z)); }
    const fas = opt.fascia ? hex(opt.fascia) : b.awning ? hex(b.awning) : mul(b.col, .5);
    quad(ctx, P(X - s * .04, sf1, z0), P(X - s * .04, sf1 + .8, z0), P(X - s * .04, sf1 + .8, fz1), P(X - s * .04, sf1, fz1)); ctx.fillStyle = css(mul(lit(fas), .9)); ctx.fill();
    const aw = opt.awning || b.awning;
    if (aw && dz < 120) { const ac = lit(hex(aw)), az1 = Math.min(fz1, b.z0 + (b.z1 - b.z0) * (opt.awning ? .95 : .6));
      for (let z = Math.max(z0, b.z0 + .6), k = 0; z < az1; z += .7, k++) { quad(ctx, P(X, sf1 + .75, z), P(X - s * 1.5, sf1 + .1, z), P(X - s * 1.5, sf1 + .1, Math.min(az1, z + .7)), P(X, sf1 + .75, Math.min(az1, z + .7))); ctx.fillStyle = css(k % 2 ? mul(ac, 1.25) : ac); ctx.fill(); }
      if (az1 > z0) { quad(ctx, P(X - s * 1.5, sf1 + .1, Math.max(z0, b.z0 + .6)), P(X - s * 1.5, sf1 - .25, Math.max(z0, b.z0 + .6)), P(X - s * 1.5, sf1 - .25, az1), P(X - s * 1.5, sf1 + .1, az1)); ctx.fillStyle = css(mul(ac, .8)); ctx.fill(); } }
  }

  // a sign square to the street (so it reads), hung on a bracket
  function blade(ctx, X, s, z, y0, y1, out, draw) {
    if (depth(X, z) < 1) return null;
    const a = P(X - s * .25, y1, z), c = P(X - s * out, y0, z), x0 = Math.min(a[0], c[0]), w = Math.abs(c[0] - a[0]), h = c[1] - a[1];
    draw(x0, a[1], w, h, a[2]);
    const br = P(X, y1 - .4, z); ctx.strokeStyle = 'rgba(30,30,30,.8)'; ctx.lineWidth = Math.max(1, a[2] * .08); line(ctx, br, [a[0], a[1] + h * .1]);
    return [x0, a[1], w, h];
  }

  /* ---------- the four places I worked ---------- */
  function orgBuilding(ctx, b, z0, t, col) {
    const o = b.org, s = b.side, X = s * FACADE, acc = hex(o.accent), d0 = o.door - 1.4, d1 = o.door + 1.4;
    if (o.style === 'pharma') {
      windows(ctx, b, z0, t, col, 'ribbon');
      quad(ctx, P(X - s * .06, 4.0, z0), P(X - s * .06, 4.6, z0), P(X - s * .06, 4.6, b.z1), P(X - s * .06, 4.0, b.z1)); ctx.fillStyle = css(lit(acc)); ctx.fill();
      storefront(ctx, b, z0, col, { glass: css(mix(hex('#cfeee0'), hex('#ffe7b8'), night * .6), .9), fascia: '#f4f2ec' });
      onWall(ctx, X - s * .08, s, 3.25, 3.95, b.z0 + 2, b.z1 - 2, 900, 70, c => c.drawImage(textCanvas('kz', 'KAISER PHARMACEUTICALS', '700 46px Inter, sans-serif', '#1f7a52', 900, 70), 0, 0));
      const cz = o.door - 4.4; if (depth(X, cz) > 1) { const c = P(X - s * 1.1, 6.1, cz), k = c[2], g = .7 + .3 * Math.abs(Math.sin(t * 2)); ctx.fillStyle = css(acc, g); ctx.fillRect(c[0] - .3 * k, c[1] - 1 * k, .6 * k, 2 * k); ctx.fillRect(c[0] - 1 * k, c[1] - .3 * k, 2 * k, .6 * k); const gl = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], 2.4 * k); gl.addColorStop(0, `rgba(80,230,150,${.25 * g})`); gl.addColorStop(1, 'rgba(80,230,150,0)'); ctx.fillStyle = gl; ctx.fillRect(c[0] - 2.4 * k, c[1] - 2.4 * k, 4.8 * k, 4.8 * k); }
    } else if (o.style === 'glass') {
      windows(ctx, b, z0, t, col, 'glass');
      quad(ctx, P(X - s * .05, b.h - 6, z0), P(X - s * .05, b.h - 4.6, z0), P(X - s * .05, b.h - 4.6, b.z1), P(X - s * .05, b.h - 6, b.z1)); ctx.fillStyle = css(acc, .55 + .35 * night); ctx.fill();
      if (o.img && o.img.complete && o.img.naturalWidth) onWall(ctx, X - s * .08, s, b.h - 11, b.h - 7.4, b.z0 + 3, b.z1 - 3, o.img.naturalWidth, o.img.naturalHeight, c => c.drawImage(o.img, 0, 0));
      quad(ctx, P(X, .3, z0), P(X, 7.4, z0), P(X, 7.4, b.z1), P(X, .3, b.z1)); ctx.fillStyle = css(mix(hex('#1e3a44'), hex('#bfeef0'), .25 + .45 * night), .92); ctx.fill();
      ctx.strokeStyle = css(mul(col, .5)); ctx.lineWidth = 1.2; for (let z = b.z0 + 2.4; z < b.z1; z += 2.4) if (z > z0) line(ctx, P(X, .3, z), P(X, 7.4, z));
      quad(ctx, P(X - s * .05, 7.4, z0), P(X - s * .05, 7.9, z0), P(X - s * .05, 7.9, b.z1), P(X - s * .05, 7.4, b.z1)); ctx.fillStyle = css(lit(acc)); ctx.fill();
    } else if (o.style === 'brick') {
      windows(ctx, b, z0, t, col, 'arched', { base: 6 });
      // stone frieze with the name, columns at the entrance, banners, a clock tower
      quad(ctx, P(X - s * .08, 4.0, z0), P(X - s * .08, 5.4, z0), P(X - s * .08, 5.4, b.z1), P(X - s * .08, 4.0, b.z1)); ctx.fillStyle = css(lit(hex('#e6dccb'))); ctx.fill();
      onWall(ctx, X - s * .1, s, 4.1, 5.3, b.z0 + 4, b.z1 - 4, 900, 90, c => c.drawImage(textCanvas('rz', 'R U T G E R S', '700 62px Cinzel, Georgia, serif', '#7a1a1a', 900, 90), 0, 0));
      storefront(ctx, b, z0, col, { fascia: '#e6dccb' });
      for (let z = d0 - 2.4; z <= d1 + 2.4; z += 1.6) { if (Math.abs(z - o.door) < 1.2 || z < z0) continue; const a = P(X - s * 1.0, 0, z), c2 = P(X - s * 1.0, 4.0, z), k = a[2]; ctx.fillStyle = css(lit(hex('#ece4d4'))); ctx.fillRect(a[0] - .22 * k, c2[1], .44 * k, a[1] - c2[1]); ctx.fillStyle = css(lit(hex('#c9bfae'))); ctx.fillRect(a[0] - .3 * k, c2[1] - .2 * k, .6 * k, .25 * k); }
      for (let z = b.z0 + 2; z < b.z1 - 1; z += 5) { if (Math.abs(z - o.door) < 3 || z < z0) continue; quad(ctx, P(X - s * .1, 7, z), P(X - s * .1, 12, z), P(X - s * .1, 12, z + 1), P(X - s * .1, 7, z + 1)); ctx.fillStyle = css(lit(acc), .95); ctx.fill(); }
      const tz = b.z0 + 4, tx0 = X + s * 4, tx1 = X + s * 8;
      if (depth(tx0, tz) > 1) { const A = P(tx0, b.h, tz), B = P(tx1, b.h + 13, tz), k = A[2]; ctx.fillStyle = css(mul(col, .95)); ctx.fillRect(Math.min(A[0], B[0]), B[1], Math.abs(B[0] - A[0]), A[1] - B[1]); const cx = (A[0] + B[0]) / 2, cy = B[1] + (A[1] - B[1]) * .3, r = Math.abs(B[0] - A[0]) * .28;
        ctx.fillStyle = css(lit(hex('#f2ead8'))); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2a2420'; ctx.lineWidth = Math.max(1, r * .08); const now = new Date(), hA = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * TAU, mA = now.getMinutes() / 60 * TAU; line(ctx, [cx, cy], [cx + Math.sin(hA) * r * .5, cy - Math.cos(hA) * r * .5]); line(ctx, [cx, cy], [cx + Math.sin(mA) * r * .8, cy - Math.cos(mA) * r * .8]);
        ctx.fillStyle = css(lit(hex('#3d5a52'))); ctx.beginPath(); ctx.moveTo(Math.min(A[0], B[0]) - 2, B[1]); ctx.lineTo(cx, B[1] - 6 * k); ctx.lineTo(Math.max(A[0], B[0]) + 2, B[1]); ctx.closePath(); ctx.fill(); }
    } else if (o.style === 'press') {
      windows(ctx, b, z0, t, col, 'stone', { base: 9 });
      // the masthead across the façade, a news zipper below it
      onWall(ctx, X - s * .08, s, b.h - 6.5, b.h - 2, b.z0 + 1.5, b.z1 - 1.5, 1400, 150, c => c.drawImage(textCanvas('tz', 'The Daily Targum', '700 112px "UnifrakturMaguntia", "Old English Text MT", Georgia, serif', night > .4 ? '#fff4d8' : '#14120e', 1400, 150, { glow: night > .4 ? 'rgba(255,220,150,.8)' : null }), 0, 0));
      quad(ctx, P(X - s * .1, 5.6, z0), P(X - s * .1, 6.6, z0), P(X - s * .1, 6.6, b.z1), P(X - s * .1, 5.6, b.z1)); ctx.fillStyle = '#120c04'; ctx.fill();
      onWall(ctx, X - s * .12, s, 5.65, 6.55, b.z0 + .3, b.z1 - .3, 1000, 64, c => { const off = (t * 140) % (TICKER.width / 2); c.drawImage(TICKER, off, 0, 1000, 64, 0, 0, 1000, 64); });
      storefront(ctx, b, z0, col, { glass: css(mix(hex('#2a2a26'), hex('#ffdca0'), .3 + .5 * night), .92), fascia: '#14120e' });
      onWall(ctx, X - s * .06, s, 3.3, 3.95, b.z0 + 1.5, b.z1 - 1.5, 900, 60, c => c.drawImage(textCanvas('tz2', 'NEWSROOM  ·  EST. 1869', '600 34px JetBrains Mono, monospace', '#e9c46a', 900, 60), 0, 0));
    }
    // door, awning in the org's colour, a beacon until you've been in
    if (d1 > z0) {
      quad(ctx, P(X, 0, Math.max(d0, z0)), P(X, 3.2, Math.max(d0, z0)), P(X, 3.2, d1), P(X, 0, d1)); ctx.fillStyle = css(mix(hex('#0d1014'), hex('#ffe3a6'), .25 + .6 * night)); ctx.fill(); ctx.strokeStyle = css(lit(acc)); ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
      quad(ctx, P(X, 3.6, Math.max(d0 - .6, z0)), P(X - s * 1.8, 3.3, Math.max(d0 - .6, z0)), P(X - s * 1.8, 3.3, d1 + .6), P(X, 3.6, d1 + .6)); ctx.fillStyle = css(lit(acc), .95); ctx.fill();
    }
    const plate = blade(ctx, X, s, d0 - 3.4, 3.85, 6.1, 2.9, (x0, y0, w, h) => {
      const dark = o.plate === 'dark'; ctx.fillStyle = dark ? '#16181c' : night > .4 ? '#fff8ec' : '#f2ece0'; ctx.fillRect(x0, y0, w, h); ctx.strokeStyle = css(acc); ctx.lineWidth = Math.max(1, w * .03); ctx.strokeRect(x0, y0, w, h);
      if (night > .4) { const gl = ctx.createRadialGradient(x0 + w / 2, y0 + h / 2, 0, x0 + w / 2, y0 + h / 2, w * 1.2); gl.addColorStop(0, `rgba(255,240,210,${.25 * night})`); gl.addColorStop(1, 'rgba(255,240,210,0)'); ctx.fillStyle = gl; ctx.fillRect(x0 - w, y0 - h, w * 3, h * 3); }
      if (o.img && o.img.complete && o.img.naturalWidth) { const ar = o.img.naturalWidth / o.img.naturalHeight; let iw = w * .8, ih = iw / ar; if (ih > h * .52) { ih = h * .52; iw = ih * ar; } ctx.drawImage(o.img, x0 + (w - iw) / 2, y0 + h * .08 + (h * .52 - ih) / 2, iw, ih); }
      if (w > 26) { ctx.fillStyle = dark ? '#f2ece0' : '#1b1b1b'; ctx.font = `600 ${Math.max(6, Math.min(w * .1, h * .14))}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(o.org, x0 + w / 2, y0 + h * .93, w * .92); }
    });
    if (!seen.has(o.idx) && depth(X, o.door) > 2) { const bp = P(X - s * 1.4, 9 + Math.sin(t * 2) * .25, o.door), k = bp[2], r = Math.max(5, .55 * k); const gl = ctx.createRadialGradient(bp[0], bp[1], 0, bp[0], bp[1], r * 4); gl.addColorStop(0, css(acc, .55)); gl.addColorStop(1, css(acc, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(bp[0], bp[1], r * 4, 0, TAU); ctx.fill(); ctx.fillStyle = css(mix(acc, [255, 255, 255], .35)); ctx.beginPath(); ctx.moveTo(bp[0], bp[1] - r); ctx.lineTo(bp[0] + r * .7, bp[1]); ctx.lineTo(bp[0], bp[1] + r); ctx.lineTo(bp[0] - r * .7, bp[1]); ctx.closePath(); ctx.fill(); }
    void plate;
  }

  /* ---------- the landmarks ---------- */
  function landmark(ctx, b, z0, t, col) {
    const L = b.lm, s = b.side, X = s * FACADE, dz = z0 - cam.z;
    if (L.lm === 'theater') {
      windows(ctx, b, z0, t, col, 'stone', { base: 8 });
      storefront(ctx, b, z0, col, { glass: css(mix(hex('#3a1215'), hex('#ffcf87'), .35 + .4 * night), .92), fascia: '#2a0c0e' });
      const m0 = L.door - 5, m1 = L.door + 5, y0 = 3.6, y1 = 5.3, out = 2.6;
      if (m1 > z0) { const mA = Math.max(m0, z0);
        quad(ctx, P(X, y0, mA), P(X - s * out, y0, mA), P(X - s * out, y0, m1), P(X, y0, m1)); ctx.fillStyle = css(hex('#ffe2a0'), .5 + .4 * night); ctx.fill();
        quad(ctx, P(X - s * out, y0, mA), P(X - s * out, y1, mA), P(X - s * out, y1, m1), P(X - s * out, y0, m1)); ctx.fillStyle = css(lit(hex('#20090b'))); ctx.fill();
        onWall(ctx, X - s * out - s * .02, s, y0 + .25, y1 - .25, mA + .4, m1 - .4, 1000, 120, c => c.drawImage(textCanvas('mq', 'NOW SHOWING  ·  WHO I AM', '700 64px Cinzel, Georgia, serif', '#ffe9b8', 1000, 120, { bg: '#1a0709' }), 0, 0));
        if (depth(X, m0) > .8) { const a = P(X, y1, m0), c = P(X - s * out, y0, m0); ctx.fillStyle = '#1a0709'; ctx.fillRect(Math.min(a[0], c[0]), a[1], Math.abs(c[0] - a[0]), c[1] - a[1]); }
        for (let i = 0, z = mA; z < m1; z += .45, i++) { const on = ((i + Math.floor(t * 8)) % 4) < 2; for (const y of [y0 + .1, y1 - .1]) { const q = P(X - s * out, y, z); ctx.fillStyle = on ? '#fff3c4' : 'rgba(120,90,40,.7)'; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1, .07 * q[2]), 0, TAU); ctx.fill(); } } }
      blade(ctx, X, s, L.door, 6, 13, 1.6, (x0, y0, w, h) => { ctx.fillStyle = '#2a0c0e'; ctx.fillRect(x0, y0, w, h); ctx.strokeStyle = '#d4a24a'; ctx.lineWidth = Math.max(1, w * .05); ctx.strokeRect(x0, y0, w, h); if (h > 30) { ctx.fillStyle = night > .3 ? '#fff0c8' : '#e9c98a'; ctx.font = `700 ${Math.max(6, Math.min(w * .7, h / 5.5))}px Cinzel, Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; 'REEL'.split('').forEach((ch, i) => ctx.fillText(ch, x0 + w / 2, y0 + h * (.18 + i * .21))); } });
    } else if (L.lm === 'comics') {
      windows(ctx, b, z0, t, col, 'stone');
      storefront(ctx, b, z0, col, { glass: css(mix(hex('#222a44'), hex('#ffd98a'), .3 * night), .92), fascia: '#f5c518', awning: '#d62f2f' });
      if (dz < 80) for (let i = 0, z = b.z0 + 1; z < b.z1 - 2; z += 1.6, i++) { if (z < z0) continue; const c = ['#e23b3b', '#2f6fe0', '#f5c518', '#29a35a'][i % 4]; quad(ctx, P(X - s * .02, .7, z), P(X - s * .02, 2.6, z), P(X - s * .02, 2.6, z + 1.1), P(X - s * .02, .7, z + 1.1)); ctx.fillStyle = css(lit(hex(c)), .9); ctx.fill(); const m = P(X - s * .03, 1.9, z + .55), k = m[2]; ctx.fillStyle = css(lit(hex('#111')), .9); ctx.beginPath(); ctx.arc(m[0], m[1], .18 * k, 0, TAU); ctx.fill(); ctx.fillRect(m[0] - .14 * k, m[1] + .1 * k, .28 * k, .5 * k); }
      blade(ctx, X, s, L.door - 2, 4.2, 6.2, 2.6, (x0, y0, w, h) => { ctx.fillStyle = '#d62f2f'; ctx.fillRect(x0, y0, w, h); ctx.fillStyle = '#f5c518'; ctx.beginPath(); for (let i = 0; i <= 16; i++) { const an = i / 16 * TAU, r = (i % 2 ? .3 : .48) * Math.min(w, h); ctx.lineTo(x0 + w / 2 + Math.cos(an) * r * 1.2, y0 + h / 2 + Math.sin(an) * r * .9); } ctx.fill(); if (w > 24) { ctx.fillStyle = '#111'; ctx.font = `${Math.max(6, w * .2)}px Bangers, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('COMICS', x0 + w / 2, y0 + h / 2 + 1); } });
    } else if (L.lm === 'music') {
      windows(ctx, b, z0, t, col, 'brick');
      storefront(ctx, b, z0, col, { glass: css(mix(hex('#2a1a12'), hex('#ffcf87'), .35 + .45 * night), .92), fascia: '#1b120c' });
      if (dz < 70) for (let i = 0, z = b.z0 + 1.8; z < b.z1 - 2; z += 1.5, i++) { if (z < z0) continue; const top = P(X - s * .05, 2.7, z), bot = P(X - s * .05, 1.0, z), k = top[2]; ctx.strokeStyle = css(lit(hex('#3a2416')), .95); ctx.lineWidth = Math.max(1, .07 * k); line(ctx, top, [bot[0], bot[1] - .5 * k]); ctx.fillStyle = css(lit(hex(i % 2 ? '#a0522d' : '#c98a4b')), .95); ctx.beginPath(); ctx.ellipse(bot[0], bot[1] - .1 * k, .26 * k, .36 * k, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(bot[0], bot[1] - .55 * k, .2 * k, .25 * k, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.beginPath(); ctx.arc(bot[0], bot[1] - .3 * k, .07 * k, 0, TAU); ctx.fill(); }
      blade(ctx, X, s, L.door - 2, 4.2, 6.0, 2.6, (x0, y0, w, h) => { ctx.fillStyle = '#1b120c'; ctx.fillRect(x0, y0, w, h); ctx.strokeStyle = '#c98a4b'; ctx.lineWidth = Math.max(1, w * .03); ctx.strokeRect(x0, y0, w, h); if (w > 24) { ctx.fillStyle = night > .3 ? '#ffe2b0' : '#e3a467'; ctx.font = `${Math.max(6, h * .42)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♫', x0 + w * .5, y0 + h * .38); ctx.font = `600 ${Math.max(5, w * .085)}px Inter, sans-serif`; ctx.fillText('STRINGS & KEYS', x0 + w / 2, y0 + h * .78, w * .9); } });
    } else if (L.lm === 'chess') {
      windows(ctx, b, z0, t, col, 'stone');
      storefront(ctx, b, z0, col, { glass: css(mix(hex('#1c241f'), hex('#ffcf87'), .3 + .4 * night), .92), fascia: '#152019', awning: '#1f4a33' });
      if (dz < 60) { const z = Math.max(z0, b.z0 + 2); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { if ((r + c) % 2) continue; const za = z + c * .3, zb = za + .3; quad(ctx, P(X - s * .02, 1.2 + r * .3, za), P(X - s * .02, 1.5 + r * .3, za), P(X - s * .02, 1.5 + r * .3, zb), P(X - s * .02, 1.2 + r * .3, zb)); ctx.fillStyle = css(lit(hex('#e8e0cf')), .85); ctx.fill(); } }
      blade(ctx, X, s, L.door - 1, 4.2, 6.1, 2.3, (x0, y0, w, h) => { ctx.fillStyle = '#152019'; ctx.fillRect(x0, y0, w, h); ctx.strokeStyle = '#c9b77a'; ctx.lineWidth = Math.max(1, w * .03); ctx.strokeRect(x0, y0, w, h); ctx.fillStyle = '#e8dcb8'; ctx.font = `${Math.max(6, h * .7)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♞', x0 + w / 2, y0 + h * .55); });
    } else if (L.lm === 'planetarium') {
      // limestone, a colonnade, a frieze, and a dome over the roofline
      quad(ctx, P(X - s * .08, 9, z0), P(X - s * .08, 10.6, z0), P(X - s * .08, 10.6, b.z1), P(X - s * .08, 9, b.z1)); ctx.fillStyle = css(mul(col, 1.1)); ctx.fill();
      onWall(ctx, X - s * .1, s, 9.15, 10.45, b.z0 + 2, b.z1 - 2, 1000, 90, c => c.drawImage(textCanvas('pl', 'P L A N E T A R I U M', '600 58px Cinzel, Georgia, serif', '#4a4434', 1000, 90), 0, 0));
      quad(ctx, P(X, .3, z0), P(X, 8.4, z0), P(X, 8.4, b.z1), P(X, .3, b.z1)); ctx.fillStyle = css(mix(hex('#141a2a'), hex('#ffdca0'), .2 + .35 * night), .9); ctx.fill();
      for (let z = b.z0 + 1.5; z < b.z1 - 1; z += 2.2) { if (z < z0) continue; const a = P(X - s * 1.4, 0, z), c2 = P(X - s * 1.4, 8.6, z), k = a[2]; const cg = ctx.createLinearGradient(a[0] - .4 * k, 0, a[0] + .4 * k, 0); cg.addColorStop(0, css(mul(col, .8))); cg.addColorStop(.5, css(mul(col, 1.15))); cg.addColorStop(1, css(mul(col, .85))); ctx.fillStyle = cg; ctx.fillRect(a[0] - .38 * k, c2[1], .76 * k, a[1] - c2[1]); ctx.fillStyle = css(mul(col, 1.2)); ctx.fillRect(a[0] - .5 * k, c2[1] - .25 * k, k, .3 * k); }
      for (let z = b.z0 + 3; z < b.z1 - 2; z += 7) { if (z < z0) continue; const bc = P(X - s * .1, 6.2, z + .5), k = bc[2]; quad(ctx, P(X - s * .1, 4.4, z), P(X - s * .1, 8.2, z), P(X - s * .1, 8.2, z + 1), P(X - s * .1, 4.4, z + 1)); ctx.fillStyle = css(lit(hex('#1d2a52')), .95); ctx.fill(); ctx.fillStyle = css(hex('#e9c46a'), .9); ctx.beginPath(); ctx.arc(bc[0], bc[1], .22 * k, 0, TAU); ctx.fill(); ctx.strokeStyle = css(hex('#e9c46a'), .9); ctx.lineWidth = Math.max(1, .04 * k); ctx.beginPath(); ctx.ellipse(bc[0], bc[1], .42 * k, .12 * k, -.3, 0, TAU); ctx.stroke(); }
      const dc = P(X + s * b.depth * .5, b.h, (b.z0 + b.z1) / 2); if (depth(X + s * b.depth * .5, (b.z0 + b.z1) / 2) > 2) { const k = dc[2], R = 7 * k; ctx.fillStyle = css(lit(hex('#5f8f84'))); ctx.beginPath(); ctx.ellipse(dc[0], dc[1], R, R * .95, 0, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = css(lit(hex('#4b746b'))); ctx.lineWidth = Math.max(1, .1 * k); for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.ellipse(dc[0], dc[1], R * i / 5, R * .95, 0, Math.PI, TAU); ctx.stroke(); }
        if (night > .5) { ctx.fillStyle = `rgba(255,236,190,${(night - .5) * 1.4})`; ctx.fillRect(dc[0] - R * .05, dc[1] - R * .95, R * .1, R * .95); } }
    }
  }

  /* ---------- sprites ---------- */
  function drawProp(ctx, p, t) {
    if (depth(p.x, p.z) < .7) return;
    const [x, y, k] = P(p.x, 0, p.z); fogAmt = fogOf(p.z);
    switch (p.t) {
      case 'tree': {
        const s = p.s, g0 = lit(mix(hex('#4f8a3b'), hex('#356a2c'), hash(p.z | 0))), lw = Math.max(1, .05 * k);
        if (night < .8) { const sh = P(p.x - 1.2, 0, p.z + .6); ctx.fillStyle = `rgba(0,0,0,${(.24 * (1 - night)).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], 1.9 * k * s, .5 * k * s, 0, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = css(lit(hex('#1f2326'))); ctx.lineWidth = lw; ctx.strokeRect(x - .6 * k, y - .45 * k, 1.2 * k, .45 * k);
        { const tg = ctx.createLinearGradient(x - .16 * k, 0, x + .16 * k, 0); tg.addColorStop(0, css(lit(hex('#4a392c')))); tg.addColorStop(.4, css(lit(hex('#5a4636')))); tg.addColorStop(1, css(lit(hex('#231a14')))); ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(x - .16 * k, y); ctx.lineTo(x - .09 * k, y - 2.6 * k * s); ctx.lineTo(x + .09 * k, y - 2.6 * k * s); ctx.lineTo(x + .16 * k, y); ctx.fill(); }
        ctx.strokeStyle = css(lit(hex('#3a2c22'))); ctx.lineWidth = Math.max(1, .08 * k); line(ctx, [x, y - 2.3 * k * s], [x - .8 * k * s, y - 3.4 * k * s]); line(ctx, [x, y - 2.5 * k * s], [x + .7 * k * s, y - 3.6 * k * s]);
        const blobs = [[0, 4.1, 1.45], [-1, 3.5, 1.05], [1, 3.6, 1.1], [-.5, 4.9, 1], [.6, 4.8, 1.05], [0, 3.1, .95], [-1.3, 4.3, .8], [1.3, 4.4, .8]];
        blobs.forEach(([dx, dy, r]) => { ctx.fillStyle = css(mul(g0, .78)); ctx.beginPath(); ctx.arc(x + dx * k * s, y - dy * k * s, r * k * s, 0, TAU); ctx.fill(); });
        blobs.forEach(([dx, dy, r]) => { const bx = x + (dx + .18) * k * s, by = y - (dy + .18) * k * s, R = r * .82 * k * s, sg = ctx.createRadialGradient(bx + R * .35, by - R * .4, R * .1, bx, by, R); sg.addColorStop(0, css(mul(g0, 1.28))); sg.addColorStop(.6, css(mul(g0, 1))); sg.addColorStop(1, css(mul(g0, .7))); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(bx, by, R, 0, TAU); ctx.fill(); });
        if (night < .7) blobs.slice(0, 5).forEach(([dx, dy, r]) => { ctx.fillStyle = css(mix(g0, hex('#e6f0a8'), .4), .4 * (1 - night)); ctx.beginPath(); ctx.arc(x + (dx + .45) * k * s, y - (dy + .45) * k * s, r * .35 * k * s, 0, TAU); ctx.fill(); });
        break; }
      case 'lamp': {
        const s = p.side, pc = css(lit(hex('#262b30'))), top = P(p.x, 6.6, p.z), crook = P(p.x - s * .2, 7.6, p.z), head = P(p.x - s * 1.6, 7.2, p.z);
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y, .45 * k, .12 * k, 0, 0, TAU); ctx.fill();
        { const cg = ctx.createLinearGradient(x - .22 * k, 0, x + .22 * k, 0); cg.addColorStop(0, css(lit(hex('#3a4148')))); cg.addColorStop(.35, css(lit(hex('#5a636c')))); cg.addColorStop(1, css(lit(hex('#14181c')))); ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(x - .22 * k, y); ctx.lineTo(x - .09 * k, y - .9 * k); ctx.lineTo(x + .09 * k, y - .9 * k); ctx.lineTo(x + .22 * k, y); ctx.fill(); }
        ctx.strokeStyle = pc; ctx.lineWidth = Math.max(1, .12 * k); ctx.beginPath(); ctx.moveTo(x, y - .9 * k); ctx.lineTo(top[0], top[1]); ctx.quadraticCurveTo(crook[0], crook[1] - .4 * k, head[0], head[1] - .2 * k); ctx.stroke();
        ctx.fillStyle = pc; ctx.beginPath(); ctx.moveTo(head[0] - .4 * k, head[1]); ctx.quadraticCurveTo(head[0], head[1] - .5 * k, head[0] + .4 * k, head[1]); ctx.closePath(); ctx.fill();
        ctx.fillStyle = night > .25 ? '#fff1cf' : css(lit(hex('#d9d4c4'))); ctx.beginPath(); ctx.ellipse(head[0], head[1] + .02 * k, .3 * k, .08 * k, 0, 0, TAU); ctx.fill();
        if (night > .25) { const a = (night - .25) / .75, g = ctx.createRadialGradient(head[0], head[1] + .2 * k, 0, head[0], head[1] + .2 * k, 2 * k); g.addColorStop(0, `rgba(255,214,150,${.5 * a})`); g.addColorStop(.25, `rgba(255,214,150,${.18 * a})`); g.addColorStop(1, 'rgba(255,214,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(head[0], head[1] + .2 * k, 2 * k, 0, TAU); ctx.fill();
          const gp = P(p.x - s * 1.6, 0, p.z); ctx.fillStyle = `rgba(255,214,150,${.07 * a})`; ctx.beginPath(); ctx.ellipse(gp[0], gp[1], 3 * k, .8 * k, 0, 0, TAU); ctx.fill(); }
        break; }
      case 'signal': {
        const s = p.side, top = P(p.x, 5.6, p.z); ctx.strokeStyle = css(lit(hex('#2b3035'))); ctx.lineWidth = Math.max(1, .14 * k); line(ctx, [x, y], top);
        ctx.fillStyle = '#1a1c1f'; ctx.fillRect(top[0] - .22 * k, top[1], .44 * k, 1.2 * k);
        const ph = Math.floor((t + (s > 0 ? 0 : 6)) / 6) % 2; [['#ff4b3e', 0], ['#3be37a', 1]].forEach(([c, i]) => { ctx.fillStyle = ph === i ? c : 'rgba(80,80,80,.6)'; ctx.beginPath(); ctx.arc(top[0], top[1] + (.3 + i * .55) * k, .14 * k, 0, TAU); ctx.fill(); });
        const sg = P(p.x - s * .1, 4.6, p.z), sg2 = P(p.x - s * 1.9, 4.2, p.z), sx = Math.min(sg[0], sg2[0]), sw = Math.abs(sg2[0] - sg[0]), sh = sg2[1] - sg[1];
        ctx.fillStyle = '#1f6f43'; ctx.fillRect(sx, sg[1], sw, sh); if (sw > 30) { ctx.fillStyle = '#fff'; ctx.font = `600 ${Math.max(6, sh * .6)}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.name, sx + sw / 2, sg[1] + sh / 2 + 1, sw * .92); }
        break; }
      case 'hydrant': { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, .3 * k, .08 * k, 0, 0, TAU); ctx.fill(); const hg = ctx.createLinearGradient(x - .17 * k, 0, x + .17 * k, 0); hg.addColorStop(0, css(lit(hex('#c4372c')))); hg.addColorStop(.35, css(lit(hex('#e8574a')))); hg.addColorStop(1, css(lit(hex('#6e130e')))); ctx.fillStyle = hg; ctx.fillRect(x - .16 * k, y - .7 * k, .32 * k, .7 * k); ctx.beginPath(); ctx.arc(x, y - .7 * k, .17 * k, Math.PI, 0); ctx.fill(); ctx.fillRect(x - .27 * k, y - .52 * k, .54 * k, .13 * k); ctx.fillStyle = css(lit(hex('#d9c27a'))); ctx.fillRect(x - .05 * k, y - .92 * k, .1 * k, .08 * k); break; }
      case 'subway': {
        const g = night > .3 ? '#7dff9a' : '#2f8f4e'; ctx.strokeStyle = css(lit(hex('#1f4a33'))); ctx.lineWidth = Math.max(1, .08 * k);
        for (const dzz of [-1.6, 1.6]) { if (depth(p.x, p.z + dzz) < .7) continue; const q = P(p.x, 1.1, p.z + dzz), b = P(p.x, 0, p.z + dzz); line(ctx, b, q); const gl = P(p.x, 2.2, p.z + dzz); line(ctx, q, gl); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gl[0], gl[1], .2 * gl[2], 0, TAU); ctx.fill(); if (night > .3) { const r = ctx.createRadialGradient(gl[0], gl[1], 0, gl[0], gl[1], gl[2] * 1.2); r.addColorStop(0, 'rgba(120,255,160,.35)'); r.addColorStop(1, 'rgba(120,255,160,0)'); ctx.fillStyle = r; ctx.beginPath(); ctx.arc(gl[0], gl[1], gl[2] * 1.2, 0, TAU); ctx.fill(); } }
        break; }
      case 'bikes': for (let i = 0; i < 6; i++) { const q = P(p.x, 0, p.z + i * .9), kk = q[2], c = css(lit(hex('#1e6fd0'))); ctx.strokeStyle = 'rgba(20,20,22,.9)'; ctx.lineWidth = Math.max(1, .05 * kk); ctx.beginPath(); ctx.arc(q[0] - .25 * kk * Math.sign(p.x), q[1] - .33 * kk, .3 * kk, 0, TAU); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, .08 * kk); ctx.beginPath(); ctx.moveTo(q[0], q[1] - .4 * kk); ctx.lineTo(q[0], q[1] - .95 * kk); ctx.lineTo(q[0] + .15 * kk, q[1] - 1 * kk); ctx.stroke(); } break;
      case 'cart': { const c = P(p.x, 1.1, p.z), kk = c[2]; ctx.fillStyle = css(lit(hex('#c8ccd2'))); ctx.fillRect(c[0] - .7 * kk, c[1], 1.4 * kk, 1.0 * kk); ctx.fillStyle = css(lit(hex('#2b2f36'))); ctx.beginPath(); ctx.arc(c[0] - .4 * kk, c[1] + 1 * kk, .2 * kk, 0, TAU); ctx.arc(c[0] + .4 * kk, c[1] + 1 * kk, .2 * kk, 0, TAU); ctx.fill();
        const u = P(p.x, 2.6, p.z); ctx.strokeStyle = 'rgba(40,40,40,.8)'; ctx.lineWidth = Math.max(1, .05 * kk); line(ctx, c, u);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = css(lit(hex(i % 2 ? '#f2f0ea' : '#2a64b3'))); ctx.beginPath(); ctx.moveTo(u[0], u[1] - .2 * kk); ctx.arc(u[0], u[1] + .2 * kk, 1.1 * kk, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); ctx.closePath(); ctx.fill(); } break; }
      case 'steam': { for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? css(lit(hex('#f2f0ea'))) : css(lit(hex('#e8742c'))); ctx.fillRect(x - .28 * k, y - (i + 1) * .45 * k, .56 * k, .45 * k); }
        for (let i = 0; i < 8; i++) { const u = ((t * .35 + i / 8) % 1), py = y - (1.8 + u * 5) * k, px = x + Math.sin(u * 6 + i) * .4 * k, r = (.4 + u * 1.2) * k; ctx.fillStyle = `rgba(235,238,242,${(.28 * (1 - u)).toFixed(3)})`; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); } break; }
      case 'news': { const c = P(p.x, 1.2, p.z), kk = c[2]; ctx.fillStyle = css(lit(hex('#2f5fa8'))); ctx.fillRect(c[0] - .25 * kk, c[1], .5 * kk, 1.2 * kk); ctx.fillStyle = css(lit(hex('#e8e4da'))); ctx.fillRect(c[0] - .18 * kk, c[1] + .15 * kk, .36 * kk, .3 * kk); break; }
      case 'car': drawCar(ctx, p.x, p.z, p.dir, hex(p.col), p.cab); break;
    }
  }

  function drawCar(ctx, x, zc, dir, col, cab) {
    const L = 4.5, hw = .92, zn = zc - L / 2, zf = zc + L / 2; if (depth(x, zn) < .7) return;
    const sx = x > cam.x ? -1 : 1, sideX = x + sx * hw, c = lit(col), glassC = mix(hex('#141b24'), hex('#9cc4ea'), .25 * (1 - night));
    const s0 = P(x, 0, zn - .2), s1 = P(x, 0, zf); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse((s0[0] + s1[0]) / 2, (s0[1] * .7 + s1[1] * .3), hw * 1.25 * s0[2], Math.max(2, (s0[1] - s1[1]) * .55 + .12 * s0[2]), 0, 0, TAU); ctx.fill();
    const side = [P(sideX, .32, zn), P(sideX, .95, zn), P(sideX, 1.05, zn + .9), P(sideX, 1.05, zf - .5), P(sideX, .95, zf), P(sideX, .32, zf)];
    ctx.beginPath(); side.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fillStyle = css(mul(c, .82)); ctx.fill();
    quad(ctx, P(sideX, .32, zn), P(sideX, .5, zn), P(sideX, .5, zf), P(sideX, .32, zf)); ctx.fillStyle = css(mul(c, .55)); ctx.fill();
    const gx = sideX * .97 + x * .03; quad(ctx, P(gx, 1.05, zn + 1.15), P(x + sx * hw * .82, 1.55, zn + 1.55), P(x + sx * hw * .82, 1.55, zf - 1.45), P(gx, 1.05, zf - .85)); ctx.fillStyle = css(mul(c, .7)); ctx.fill();
    quad(ctx, P(gx, 1.1, zn + 1.3), P(x + sx * hw * .84, 1.5, zn + 1.65), P(x + sx * hw * .84, 1.5, zf - 1.55), P(gx, 1.1, zf - 1)); ctx.fillStyle = css(glassC); ctx.fill();
    { quad(ctx, P(x + sx * hw * .82, 1.55, zn + 1.55), P(x - sx * hw * .82, 1.55, zn + 1.55), P(x - sx * hw * .82, 1.55, zf - 1.45), P(x + sx * hw * .82, 1.55, zf - 1.45)); ctx.fillStyle = css(mix(mul(c, 1.15), [255, 255, 255], .15 * (1 - night))); ctx.fill(); }
    for (const wz of [zn + .85, zf - .85]) { const wa = P(sideX, .36, wz), ra = .45 * wa[2]; ctx.fillStyle = css(mul(c, .35)); ctx.beginPath(); ctx.ellipse(wa[0], wa[1], ra * .55, ra, 0, Math.PI, TAU); ctx.fill(); }
    for (const wz of [zn + .85, zf - .85]) { const w = P(sideX, .33, wz), r = .33 * w[2]; ctx.fillStyle = '#0b0b0c'; ctx.beginPath(); ctx.ellipse(w[0], w[1], r * .5, r, 0, 0, TAU); ctx.fill(); ctx.fillStyle = css(lit(hex('#8d9196'))); ctx.beginPath(); ctx.ellipse(w[0], w[1], r * .26, r * .52, 0, 0, TAU); ctx.fill(); }
    const a = P(x - hw, .32, zn), b = P(x + hw, 1.0, zn), w = b[0] - a[0], h = a[1] - b[1];
    rrect(ctx, a[0], b[1], w, h, w * .06); ctx.fillStyle = css(c); ctx.fill();
    const ca = P(x - hw * .8, 1.0, zn + 1.15), cb = P(x + hw * .8, 1.55, zn + 1.15), cw = cb[0] - ca[0], ch = ca[1] - cb[1];
    ctx.fillStyle = css(mul(c, .9)); ctx.beginPath(); ctx.moveTo(a[0] + w * .1, b[1]); ctx.lineTo(ca[0], cb[1]); ctx.lineTo(cb[0], cb[1]); ctx.lineTo(b[0] - w * .1, b[1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = css(glassC); ctx.beginPath(); ctx.moveTo(a[0] + w * .16, b[1] - ch * .08); ctx.lineTo(ca[0] + cw * .06, cb[1] + ch * .15); ctx.lineTo(cb[0] - cw * .06, cb[1] + ch * .15); ctx.lineTo(b[0] - w * .16, b[1] - ch * .08); ctx.closePath(); ctx.fill();
    ctx.fillStyle = css(mul(c, .5)); ctx.fillRect(a[0], a[1] - h * .2, w, h * .2);
    ctx.fillStyle = css(lit(hex('#e9e6dc'))); ctx.fillRect(a[0] + w * .4, a[1] - h * .42, w * .2, h * .16);
    const ly = b[1] + h * .22, lh = h * .16;
    if (dir < 0) { ctx.fillStyle = night > .3 ? '#fff6d8' : css(lit(hex('#e8e4da'))); rrect(ctx, a[0] + w * .06, ly, w * .22, lh, lh * .4); ctx.fill(); rrect(ctx, b[0] - w * .28, ly, w * .22, lh, lh * .4); ctx.fill();
      if (night > .3) { const gg = ctx.createRadialGradient(a[0] + w / 2, ly, 0, a[0] + w / 2, ly, w * 1.5); gg.addColorStop(0, `rgba(255,246,216,${.32 * night})`); gg.addColorStop(1, 'rgba(255,246,216,0)'); ctx.fillStyle = gg; ctx.fillRect(a[0] - w, ly - w, w * 3, w * 2.4); } }
    else { ctx.fillStyle = dir > 0 || night > .5 ? '#ff3b30' : css(lit(hex('#8a1f1a'))); rrect(ctx, a[0] + w * .05, ly, w * .24, lh, lh * .3); ctx.fill(); rrect(ctx, b[0] - w * .29, ly, w * .24, lh, lh * .3); ctx.fill(); }
    if (cab) { const t1 = P(x - .3, 1.55, zn + 1.7), t2 = P(x + .3, 1.78, zn + 1.7); ctx.fillStyle = night > .3 ? '#fff2b0' : css(lit(hex('#f7f1d6'))); rrect(ctx, t1[0], t2[1], t2[0] - t1[0], t1[1] - t2[1], 2); ctx.fill(); ctx.fillStyle = css(mul(c, .6)); for (let i = 1; i < 6; i += 2) ctx.fillRect(a[0] + w * i / 6, b[1] + h * .58, w / 6, h * .07); }
  }

  /* =========================================================
     THE LOOP
     ========================================================= */
  let mode = 'walk', tNow = 0, last = performance.now();
  const seen = new Set();
  function frame(n) {
    const dt = Math.min(.05, (n - last) / 1000); last = n; tNow += dt;
    walk(dt);
    W = C.w; H = C.h; f = Math.min(W * .62, H * .92); cyw = Math.cos(look.yaw); syw = Math.sin(look.yaw);
    hy = H * .5 + cam.bob * 1.4 + look.pitch * f; camY = 1.62 + cam.bob * .018;
    night = span(cam.z, 112, 140); Lk = lerp(1.04, .3, night);
    fogCol = night < .5 ? mix(hex('#b9ccdc'), hex('#a8826a'), night * 2) : mix(hex('#a8826a'), hex('#0e1424'), night * 2 - 1);
    const ctx = C.ctx; ctx.save(); ctx.clearRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2); ctx.rotate(cam.roll); ctx.translate(-W / 2, -H / 2);
    fogAmt = .6; sky(ctx, tNow); fogAmt = 0; ground(ctx);
    BUILDINGS.filter(b => b.z1 > cam.z && b.z0 < cam.z + 600).sort((a, b) => b.z0 - a.z0).forEach(b => building(ctx, b, tNow));
    const items = PROPS.filter(p => p.z > cam.z - 12 && p.z < cam.z + 260).map(p => ({ p, z: p.z }));
    TRAFFIC.forEach(c => { const z = c.lane > 0 ? ((c.base + c.v * tNow) % 300) - 50 : 250 - ((c.base + c.v * tNow) % 300); items.push({ p: { t: 'car', x: c.lane, z, dir: c.lane > 0 ? 1 : -1, col: c.col, cab: c.col === '#f2c230' }, z }); });
    items.sort((a, b) => b.z - a.z).forEach(({ p }) => drawProp(ctx, p, tNow));
    fogAmt = 0;
    const hzc = css(fogCol, night < .5 ? .3 : .42), hz = ctx.createLinearGradient(0, hy - H * .3, 0, hy + H * .3); hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(.6, hzc); hz.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = hz; ctx.fillRect(0, hy - H * .3, W, H * .6);
    ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H * .46, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${.3 + .35 * night})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ui(dt);
    requestAnimationFrame(frame);
  }

  /* =========================================================
     UI
     ========================================================= */
  const title = document.getElementById('walkTitle'), buzz = document.getElementById('buzz'), buzzName = document.getElementById('buzzName'), endEl = document.getElementById('walkEnd'), passEl = document.getElementById('walkPass'), passRing = document.getElementById('passRing');
  const map = document.getElementById('walkMap');
  map.innerHTML = ORGS.map((o, i) => `<button class="pin" data-i="${i}" style="left:${(o.door / ZMAX * 100).toFixed(1)}%" aria-label="Walk to ${o.org}"><span>${o.org.split(' ')[0] === 'The' ? o.org.split(' ')[1] : o.org.split(' ')[0]}</span><i></i></button>`).join('') + '<span class="me" id="me"></span>';
  const me = document.getElementById('me');
  map.querySelectorAll('.pin').forEach(b => b.addEventListener('click', () => { if (mode !== 'walk') return; const i = +b.dataset.i, z = STOPS[i].z; STOPS.forEach((st, k) => { if (k < i) st.passed = true; else if (k >= i) st.passed = false; }); cam.target = z; push = 0; }));
  let near = null, push = 0, pushT = 0;
  const atStop = () => STOPS.find(st => !st.passed && Math.abs(cam.z - st.z) < .6 && Math.abs(cam.target - st.z) < .6);
  function ui(dt) {
    if (cam.z > 1.2) title.classList.add('gone'); else title.classList.remove('gone');
    me.style.left = (clamp(cam.z / ZMAX, 0, 1) * 100).toFixed(2) + '%';
    endEl.hidden = !(cam.z > ZMAX - 4 && mode === 'walk');
    near = mode === 'walk' ? ORGS.find(o => o.door - cam.z > 2.5 && o.door - cam.z < 16) : null;
    if (near) {
      const p = P(near.side * FACADE, 1.6, near.door);
      buzz.hidden = false; buzz.classList.add('show'); buzzName.textContent = near.org; buzz.style.setProperty('--acc', near.accent);
      buzz.style.left = clamp(p[0], 150, W - 150) + 'px'; buzz.style.top = clamp(p[1] - 40, H * .38, H * .66) + 'px';
    } else { buzz.classList.remove('show'); buzz.hidden = true; }
    if (performance.now() - pushT > 900) push = Math.max(0, push - dt * 30);
    const st = atStop(); passEl.hidden = !(st && mode === 'walk'); if (st) passRing.style.setProperty('--p', clamp(push / 16, 0, 1).toFixed(3));
  }

  /* ---------- input: scroll walks, deliberately past each door; pointer looks around ---------- */
  function go(d) {
    if (mode !== 'walk') return;
    if (d > 0) {
      const st = atStop();
      if (st) { push += d; pushT = performance.now(); if (push < 16) return; st.passed = true; push = 0; }
      const next = STOPS.find(s => !s.passed && s.z > cam.target - .01);
      let tgt = cam.target + d;
      if (next && tgt > next.z) tgt = next.z;
      cam.target = clamp(Math.min(tgt, cam.z + 16), 0, ZMAX);
    } else { cam.target = clamp(Math.max(cam.target + d, cam.z - 16), 0, ZMAX); STOPS.forEach(s => { if (s.z > cam.target + 1) s.passed = false; }); }
  }
  addEventListener('wheel', e => { e.preventDefault(); const dy = e.deltaMode ? e.deltaY * 30 : e.deltaY, dx = e.deltaMode ? e.deltaX * 30 : e.deltaX; if (Math.abs(dx) > Math.abs(dy)) { look.ty = clamp(look.ty + dx * .0025, -.5, .5); return; } go(dy * .04); }, { passive: false });
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { look.ty = clamp((e.clientX / innerWidth - .5) * .8, -.42, .42); look.tp = clamp((e.clientY / innerHeight - .5) * -.22, -.12, .12); } }, { passive: true });
  document.addEventListener('mouseleave', () => { look.ty = 0; look.tp = 0; });
  addEventListener('keydown', e => { if (mode === 'inside' && e.key === 'Escape') return leave(); if (mode !== 'walk') return; const k = e.key; if (k === 'ArrowUp' || k === 'w' || k === 'PageDown' || k === ' ') { go(k === 'PageDown' || k === ' ' ? 12 : 3); e.preventDefault(); } if (k === 'ArrowDown' || k === 's' || k === 'PageUp') { go(k === 'PageUp' ? -12 : -3); e.preventDefault(); } if (k === 'ArrowLeft') look.ty = clamp(look.ty - .1, -.5, .5); if (k === 'ArrowRight') look.ty = clamp(look.ty + .1, -.5, .5); if (k === 'Enter' && near) enter(near); });
  let tp = null; addEventListener('touchstart', e => { tp = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
  addEventListener('touchmove', e => { if (!tp) return; const x = e.touches[0].clientX, y = e.touches[0].clientY, dx = x - tp[0], dy = y - tp[1]; if (Math.abs(dx) > Math.abs(dy)) look.ty = clamp(look.ty - dx * .004, -.5, .5); else go(-dy * .07); tp = [x, y]; }, { passive: true });
  addEventListener('touchend', () => { tp = null; });
  buzz.addEventListener('click', () => near && enter(near));

  /* ---------- stepping inside ---------- */
  const modal = document.getElementById('wmodal'), card = document.getElementById('wmCard');
  const EXIT = '<button class="wm-exit" type="button" id="wmExit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>EXIT</button>';
  function zoomTo(px, py, from, to, steps, T) {
    return new Promise(res => {
      if (RM) { cv.style.transform = to === 1 ? '' : `translate(${px * (1 - to)}px,${py * (1 - to)}px) scale(${to})`; return res(); }
      const t0 = performance.now(), tot = steps * T;
      const tick = n => { const el = (n - t0) / 1000, i = Math.min(steps - 1, Math.floor(el / T)), u = clamp((el - i * T) / T, 0, 1), e = 1 - Math.pow(1 - Math.min(1, u * 1.6), 3);
        const s = from * Math.pow(to / from, (i + e) / steps), bob = Math.sin(Math.PI * u) * 4 * (i % 2 ? 1 : -1) * .6, bobY = -Math.sin(Math.PI * u) * 5;
        cv.style.transform = `translate(${(px * (1 - s) + bob).toFixed(1)}px,${(py * (1 - s) + bobY).toFixed(1)}px) scale(${s.toFixed(4)})`;
        if (el < tot) requestAnimationFrame(tick); else { cv.style.transform = to === 1 ? '' : `translate(${px * (1 - to)}px,${py * (1 - to)}px) scale(${to})`; res(); } };
      requestAnimationFrame(tick);
    });
  }
  let doorPt = null;
  async function enter(o) {
    if (mode !== 'walk') return; mode = 'entering'; cam.target = cam.z; buzz.classList.remove('show'); buzz.hidden = true; passEl.hidden = true;
    const p = P(o.side * FACADE, 1.5, o.door); doorPt = [clamp(p[0], 0, W), clamp(p[1], 0, H)];
    await zoomTo(doorPt[0], doorPt[1], 1, 7, 5, .26);
    fade.style.opacity = 1; await new Promise(r => setTimeout(r, RM ? 0 : 300));
    openModal(`<div class="wm-head"><div class="wm-logo${o.plate === 'dark' ? ' dark' : ''}">${o.logo ? `<img src="${o.logo}" alt="">` : ''}</div><div><h2 id="wmOrg">${o.org}</h2><p>${o.role} · ${o.dates}</p></div></div>
      <div class="wm-body">${(o.text || [o.blurb]).map(t => `<p>${t}</p>`).join('')}${o.details ? `<ul>${o.details.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}</div>${EXIT}`);
    seen.add(o.idx); map.querySelector(`.pin[data-i="${o.idx}"]`).classList.add('seen');
  }
  function openModal(html) { card.innerHTML = html; modal.hidden = false; requestAnimationFrame(() => modal.classList.add('show')); mode = 'inside'; const x = document.getElementById('wmExit'); x.addEventListener('click', leave); x.focus(); }
  async function leave() {
    if (mode !== 'inside') return; mode = 'leaving';
    modal.classList.remove('show'); await new Promise(r => setTimeout(r, 300)); modal.hidden = true;
    if (doorPt) { fade.style.opacity = 0; await zoomTo(doorPt[0], doorPt[1], 7, 1, 3, .2); doorPt = null; } else fade.style.opacity = 0;
    mode = 'walk';
  }
  modal.addEventListener('click', e => { if (e.target === modal) leave(); });
  document.getElementById('walkList').addEventListener('click', () => {
    if (mode !== 'walk') return;
    openModal(`<div class="wm-list"><h2 id="wmOrg" style="margin:0 0 6px">Work</h2>${ORGS.map(o => `<div class="wm-item"><h3>${o.org}</h3><p class="mono" style="font-size:12.5px;color:var(--muted)">${o.role} · ${o.dates}</p><p style="color:#cfd6e2">${(o.text || [o.blurb]).join(' ')}</p></div>`).join('')}</div>${EXIT}`);
  });

  requestAnimationFrame(frame);
})();
