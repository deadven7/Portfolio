/* Work — a first-person stroll down a city block.
   Scrolling walks you forward, step by step. Every few buildings, on alternating sides, one of them is a
   place I've worked: walk up, buzz, and step inside. The light goes as you reach the last one. */
(function () {
  const RM = !!window.reducedMotion;
  const TAU = Math.PI * 2;
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const span = (p, a, b) => ease((p - a) / (b - a));
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const hash = (a, b = 0, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

  const C = fitCanvas(document.getElementById('street'));
  const cv = document.getElementById('street'), fade = document.getElementById('streetFade');

  /* ---------- the block ---------- */
  const FACADE = 10;
  const STYLE = [
    { side: 1, door: 40, style: 'pharma', col: '#cfc4ae', h: 19, accent: '#2f9e6e' },
    { side: -1, door: 100, style: 'glass', col: '#2c4552', h: 82, accent: '#3cc3c9' },
    { side: 1, door: 148, style: 'brick', col: '#8c3d2e', h: 27, accent: '#cc0033', plate: 'dark' },
    { side: -1, door: 205, style: 'press', col: '#5f5b53', h: 33, accent: '#e9c46a', plate: 'dark' },
  ];
  const ORGS = SITE.work.slice(0, 4).map((w, i) => ({ ...w, ...STYLE[i], idx: i }));
  ORGS.forEach(o => { if (o.logo) { o.img = new Image(); o.img.src = o.logo; } });
  const CROSS = [[64, 80], [170, 186]];
  const CROSS_NAME = ['Bayes St', 'Gradient Ave'];
  const END = 248, ZMAX = 226;
  const PAL = ['#8a4a3a', '#a0644c', '#6e4a3e', '#b9a58a', '#c7b8a0', '#7d7f86', '#5b5e66', '#9b8770', '#4b5560', '#a3988a', '#8d6b55'];

  function genSide(side) {
    const r = rng(side > 0 ? 11 : 29), list = [], slots = ORGS.filter(o => o.side === side);
    let z = -24;
    while (z < END) {
      const cr = CROSS.find(([c0, c1]) => z >= c0 - .01 && z < c1); if (cr) { z = cr[1]; continue; }
      const slot = slots.find(s => !s.done && s.door - 10 < z + 26 && s.door + 10 > z);
      let z0 = z, len, org = null;
      if (slot) { const start = slot.door - 10; if (start - z >= 8) len = start - z; else { org = slot; slot.done = true; z0 = Math.max(z, start); len = slot.door + 10 - z0; } }
      else len = 13 + r() * 11;
      const nc = CROSS.find(([c0]) => c0 > z0 + .01); if (nc && z0 + len > nc[0]) len = nc[0] - z0;
      if (len < 5) { z = z0 + len + .01; continue; }
      const st = org ? org.style : (r() < .22 ? 'glass' : r() < .55 ? 'brick' : 'stone');
      list.push({ side, z0, z1: z0 + len, h: org ? org.h : 13 + r() * r() * 62, depth: 14 + r() * 10, col: hex(org ? org.col : st === 'glass' ? ['#33424d', '#3d4b55', '#2a3a44'][Math.floor(r() * 3)] : PAL[Math.floor(r() * PAL.length)]), seed: Math.floor(r() * 1e6), org, style: st, tower: !org && st !== 'glass' && r() < .45, awning: r() < .5 ? ['#1f5e46', '#7a2a2a', '#22406b', '#5b3a6b', '#8a5a1e'][Math.floor(r() * 5)] : null });
      z = z0 + len;
    }
    return list;
  }
  const BUILDINGS = [...genSide(1), ...genSide(-1)];
  // easter eggs live in specific windows
  const catB = BUILDINGS.find(b => b.side === 1 && !b.org && b.z0 > 214 && b.z0 < 245 && b.h > 22);
  const knightB = BUILDINGS.find(b => b.side === -1 && !b.org && b.z0 > 112 && b.z0 < 150);

  /* props along the sidewalks and road */
  const PROPS = [];
  const nearDoor = z => ORGS.some(o => Math.abs(o.door - z) < 6);
  const inCross = (z, m = 0) => CROSS.some(([c0, c1]) => z > c0 - m && z < c1 + m);
  for (const s of [1, -1]) {
    for (let z = 9 + (s > 0 ? 0 : 13); z < END; z += 26) if (!nearDoor(z) && !inCross(z, 2)) PROPS.push({ t: 'tree', x: s * 7.7, z, s: .85 + hash(z | 0, s) * .35 });
    for (let z = 24 + (s > 0 ? 0 : 20); z < END; z += 40) if (!inCross(z, 1) && !nearDoor(z)) PROPS.push({ t: 'lamp', x: s * 6.5, z, side: s });
    CROSS.forEach(([c0, c1], i) => { PROPS.push({ t: 'signal', x: s * 6.4, z: s > 0 ? c0 - 1 : c1 + 1, side: s, name: CROSS_NAME[i] }); });
  }
  [[-1, 22], [1, 160]].forEach(([s, z]) => PROPS.push({ t: 'hydrant', x: s * 6.7, z }));
  PROPS.push({ t: 'subway', x: 8.2, z: 86 });
  PROPS.push({ t: 'bikes', x: -7.4, z: 124 });
  PROPS.push({ t: 'cart', x: -7.6, z: 56 });
  PROPS.push({ t: 'steam', x: 2.6, z: 118 });
  PROPS.push({ t: 'news', x: -7.0, z: 199 }); PROPS.push({ t: 'news', x: -7.0, z: 200.2 });
  for (const s of [1, -1]) for (let z = 10 + (s > 0 ? 4 : 0); z < END; z += 9.5) if (!nearDoor(z) && !inCross(z, 4) && hash(z | 0, s, 7) < .2) PROPS.push({ t: 'car', x: s * 5.1, z, dir: 0, col: carCol(hash(z | 0, s, 3)) });
  function carCol(u) { return u < .3 ? '#f2c230' : ['#2b2f36', '#8a1f22', '#c9ccd1', '#1f3c63', '#3b4a3a', '#6b6f75'][Math.floor(u * 6) % 6]; }
  const TRAFFIC = [...Array(4)].map((_, i) => ({ lane: i % 2 ? -3.7 : 3.7, v: i % 2 ? 10 + hash(i) * 4 : 5 + hash(i, 1) * 4, base: hash(i, 2) * 340, col: hash(i, 4) < .55 ? '#f2c230' : carCol(hash(i, 5)) }));

  /* ---------- the walker ---------- */
  const cam = { z: 0, target: 0, step: null, n: 0, bob: 0, x: 0, roll: 0 };
  window.__walk = cam;
  function walk(dt) {
    if (!cam.step && Math.abs(cam.target - cam.z) > .05 && mode === 'walk') {
      const far = Math.abs(cam.target - cam.z) > 14, L = far ? 1.5 : .8;
      cam.step = { z0: cam.z, d: clamp(cam.target - cam.z, -L, L), t: 0, T: RM ? .12 : far ? .2 : .36 };
    }
    if (cam.step) {
      const s = cam.step; s.t = Math.min(1, s.t + dt / s.T);
      const e = s.t < .5 ? 2 * s.t * s.t : 1 - Math.pow(-2 * s.t + 2, 2) / 2;
      cam.z = s.z0 + s.d * e; cam.bob = RM ? 0 : Math.sin(Math.PI * s.t);
      if (s.t >= 1) { cam.step = null; cam.n++; }
    } else cam.bob *= .8;
    const side = cam.n % 2 ? 1 : -1;
    cam.x = side * .05 * cam.bob; cam.roll = side * .0045 * cam.bob;
  }

  /* ---------- drawing ---------- */
  let W = 0, H = 0, f = 0, hy = 0, camY = 1.62, night = 0, Lk = 1, fogAmt = 0, fogCol = [120, 130, 140];
  const fogOf = z => (1 - Math.exp(-Math.max(0, z - cam.z) / 85)) * .78;
  const P = (x, y, z) => { const dz = Math.max(.3, z - cam.z), k = f / dz; return [W / 2 + (x - cam.x) * k, hy - (y - camY) * k, k]; };
  const quad = (ctx, a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); };
  const lit = c => mix(mix(mul(c, Lk), [16, 22, 40], night * .35), fogCol, fogAmt);
  const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else ctx.rect(x, y, w, h); };
  const line = (ctx, a, b) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };

  const SKY = { day: [hex('#4f739b'), hex('#a9b6bf')], dusk: [hex('#3a3c74'), hex('#f2a35c')], night: [hex('#03050c'), hex('#172238')] };
  function sky(ctx, t) {
    const a = night < .5 ? mix(SKY.day[0], SKY.dusk[0], night * 2) : mix(SKY.dusk[0], SKY.night[0], night * 2 - 1);
    const b = night < .5 ? mix(SKY.day[1], SKY.dusk[1], night * 2) : mix(SKY.dusk[1], SKY.night[1], night * 2 - 1);
    const g = ctx.createLinearGradient(0, 0, 0, hy); g.addColorStop(0, css(a)); g.addColorStop(1, css(b)); ctx.fillStyle = g; ctx.fillRect(-50, -50, W + 100, hy + 60);
    // clouds, drifting
    if (night < .85) { const ca = (1 - span(night, .5, .85)), cc = night < .5 ? mix(hex('#ffffff'), hex('#ffc9a8'), night * 2) : mix(hex('#ffc9a8'), hex('#5a5f80'), night * 2 - 1);
      for (let i = 0; i < 5; i++) { const sp = 4 + hash(i, 3) * 6, cx = ((hash(i, 1) * (W + 400) + t * sp) % (W + 400)) - 200, cy = hy * (.08 + hash(i, 2) * .32), sc = (.6 + hash(i, 4) * .8) * Math.min(1.2, W / 1000);
        for (let k = 0; k < 6; k++) { const ox = (hash(i, k, 5) - .5) * 140 * sc, oy = (hash(i, k, 6) - .5) * 22 * sc, rx = (40 + hash(i, k, 7) * 50) * sc; ctx.fillStyle = css(cc, (.10 + .06 * (k % 2)) * ca); ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy, rx, rx * .38, 0, 0, TAU); ctx.fill(); } } }
    // the sun setting straight down the grid (it does that here, twice a year)
    const dusk = Math.sin(Math.PI * clamp(night * 1.25, 0, 1));
    if (dusk > .02) { const sx = W / 2, sy = hy - f * .012, R = f * .05; const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 7); sg.addColorStop(0, `rgba(255,214,150,${.75 * dusk})`); sg.addColorStop(.12, `rgba(255,170,90,${.45 * dusk})`); sg.addColorStop(1, 'rgba(255,140,80,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, hy + 40); ctx.fillStyle = `rgba(255,236,200,${.9 * dusk})`; ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.fill(); }
    if (night > .6) { const a2 = span(night, .6, .9); for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(230,236,255,${(a2 * (.2 + hash(i, 9) * .5)).toFixed(3)})`; ctx.fillRect(hash(i, 1) * W, hash(i, 2) * hy * .7, 1.2, 1.2); }
      const mx = W / 2 + Math.min(W * .1, 120), my = hy * .2, mr = Math.max(9, f * .018); ctx.fillStyle = `rgba(240,236,220,${a2})`; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill(); ctx.fillStyle = `rgba(190,186,170,${a2 * .5})`; [[-.3, -.2, .22], [.25, .1, .16], [-.05, .35, .12]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, TAU); ctx.fill(); });
      // someone else is out tonight
      const cyc = (t % 22) / 3; if (cyc < 1) { const x = lerp(-40, W + 40, cyc), y = hy * .32 - Math.sin(cyc * Math.PI) * hy * .1; ctx.save(); ctx.translate(x, y); ctx.rotate(-.12); ctx.fillStyle = `rgba(10,12,20,${a2})`; ctx.beginPath(); ctx.ellipse(0, 0, 9, 2.4, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(11, -.5, 2.2, 0, TAU); ctx.fill(); ctx.fillRect(12, -1.6, 6, 1.6); ctx.restore(); }
    }
    // skyline far down the avenue
    const zs = END + 160, base = P(0, 0, zs)[1];
    const r = rng(77); let x = -150;
    while (x < 150) { const w = 10 + r() * 22, h = 40 + r() * r() * 220, a = P(x, 0, zs), b = P(x + w, h, zs); ctx.fillStyle = css(mix(lit(hex('#5a6472')), night > .5 ? hex('#0b1222') : hex('#9aa6b4'), .4 + night * .3)); ctx.fillRect(a[0], b[1], b[0] - a[0], base - b[1]);
      if (r() < .12) { const sp = P(x + w / 2, h + 60, zs); ctx.fillRect(sp[0] - 1, sp[1], 2, b[1] - sp[1]); }
      if (night > .5) for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(255,214,140,${(.6 * (night - .5)).toFixed(3)})`; ctx.fillRect(a[0] + r() * (b[0] - a[0]), b[1] + r() * (base - b[1]), 1.2, 1.2); }
      x += w + 2 + r() * 6; }
  }

  function ground(ctx) {
    const zn = cam.z + .32, zf = cam.z + 900;
    const strip = (x0, x1, col, z0 = zn, z1 = zf) => { if (z1 <= zn) return; z0 = Math.max(z0, zn); quad(ctx, P(x0, 0, z0), P(x1, 0, z0), P(x1, 0, z1), P(x0, 0, z1)); ctx.fillStyle = css(mul(lit(hex(col)), .82)); ctx.fill(); };
    strip(-80, 80, '#2a2c30');
    strip(-FACADE - 30, -6.2, '#8e8a83'); strip(6.2, FACADE + 30, '#8e8a83');
    strip(-6.2, -6.0, '#b5b0a6'); strip(6.0, 6.2, '#b5b0a6');
    strip(-1.7, 1.7, '#77736c'); strip(-1.75, -1.6, '#a7a296'); strip(1.6, 1.75, '#a7a296');
    // afternoon: the left side of the street sits in shade
    if (night < .9) { const sh = .2 * (1 - night); quad(ctx, P(-FACADE, 0, zn), P(-2.4, 0, zn), P(-.6, 0, zf), P(-FACADE, 0, zf)); ctx.fillStyle = `rgba(10,14,24,${sh.toFixed(3)})`; ctx.fill(); }
    // manholes
    for (const mz of [33, 97, 141, 214]) { if (mz < zn || mz > cam.z + 140) continue; const m = P(-3.2, 0, mz), m2 = P(-2.4, 0, mz); ctx.fillStyle = css(lit(hex('#1c1d20'))); ctx.beginPath(); ctx.ellipse((m[0] + m2[0]) / 2, m[1], Math.abs(m2[0] - m[0]) * .9, Math.max(1, (m2[0] - m[0]) * .09), 0, 0, TAU); ctx.fill(); }
    // cross streets
    CROSS.forEach(([c0, c1]) => { strip(-90, 90, '#2a2c30', c0, c1);
      for (const [za, zb] of [[c0 - 3.2, c0 - .4], [c1 + .4, c1 + 3.2]]) for (let x = -5.8; x < 5.8; x += 1.1) if (Math.abs(x) > 1.9) strip(x, x + .55, '#d9d6cf', za, zb);
      for (let z = c0 + .6; z < c1 - .6; z += 1.1) { strip(6.3, 9.8, '#d9d6cf', z, z + .55); strip(-9.8, -6.3, '#d9d6cf', z, z + .55); } });
    // median paving
    ctx.strokeStyle = css(lit(hex('#625f59')), .6);
    for (let z = Math.ceil(zn / 1.5) * 1.5; z < cam.z + 80; z += 1.5) { if (inCross(z)) continue; const a = P(-1.6, 0, z), b = P(1.6, 0, z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    // sidewalk slabs
    ctx.strokeStyle = css(lit(hex('#6d6a64')), .5); ctx.lineWidth = 1;
    for (let z = Math.ceil(zn / 2) * 2; z < cam.z + 120; z += 2) { if (inCross(z)) continue; for (const s of [1, -1]) { const a = P(s * 6.2, 0, z), b = P(s * FACADE, 0, z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
    // lane dashes
    for (let z = Math.ceil(zn / 9) * 9; z < cam.z + 260; z += 9) { if (inCross(z, 3)) continue; for (const s of [1, -1]) strip(s * 3.85 - .07, s * 3.85 + .07, '#e8e4da', z, z + 3); }
  }

  function building(ctx, b, t) {
    const s = b.side, X = s * FACADE, z0 = Math.max(b.z0, cam.z + .35); if (b.z1 <= z0) return;
    fogAmt = fogOf(Math.max(z0, (b.z0 + b.z1) / 2 - 4));
    const dz = z0 - cam.z, col = mul(lit(b.col), s < 0 ? lerp(.84, 1, night) : 1);
    const hi = mul(col, 1.18), lo = mul(col, .72);
    // end face, where it shows
    if (b.z0 > cam.z + .35) { quad(ctx, P(X, 0, b.z0), P(X, b.h, b.z0), P(X + s * b.depth, b.h, b.z0), P(X + s * b.depth, 0, b.z0)); ctx.fillStyle = css(mul(col, s < 0 ? .9 : .76)); ctx.fill(); }
    const A0 = P(X, 0, z0), A1 = P(X, b.h, z0), B1 = P(X, b.h, b.z1), B0 = P(X, 0, b.z1);
    quad(ctx, A0, A1, B1, B0); const g = ctx.createLinearGradient(0, A1[1], 0, A0[1]); g.addColorStop(0, css(mul(col, 1.05))); g.addColorStop(1, css(mul(col, .84))); ctx.fillStyle = g; ctx.fill();
    // water tower
    if (b.tower) { const c = P(X + s * b.depth * .5, b.h, (b.z0 + b.z1) / 2), k = c[2], tc = lit(hex('#5b4636')); ctx.fillStyle = css(tc); rrect(ctx, c[0] - 1.5 * k, c[1] - 6 * k, 3 * k, 3.6 * k, .3 * k); ctx.fill(); ctx.fillStyle = css(mul(tc, 1.2)); for (let i = 0; i < 3; i++) ctx.fillRect(c[0] - 1.5 * k, c[1] - (5.4 - i * 1.1) * k, 3 * k, .12 * k); ctx.fillStyle = css(mul(tc, .8)); ctx.beginPath(); ctx.moveTo(c[0] - 1.7 * k, c[1] - 6 * k); ctx.lineTo(c[0], c[1] - 7.6 * k); ctx.lineTo(c[0] + 1.7 * k, c[1] - 6 * k); ctx.fill(); ctx.strokeStyle = css(mul(tc, .7)); ctx.lineWidth = Math.max(1, .15 * k); ctx.beginPath(); ctx.moveTo(c[0] - 1.2 * k, c[1] - 2.4 * k); ctx.lineTo(c[0] - 1.4 * k, c[1]); ctx.moveTo(c[0] + 1.2 * k, c[1] - 2.4 * k); ctx.lineTo(c[0] + 1.4 * k, c[1]); ctx.moveTo(c[0] - 1.3 * k, c[1] - 1.2 * k); ctx.lineTo(c[0] + 1.3 * k, c[1] - 1.2 * k); ctx.stroke(); }
    // corner pilasters and a cornice with dentils
    for (const [pa, pb] of [[b.z0, b.z0 + .55], [b.z1 - .55, b.z1]]) { if (pb <= z0) continue; quad(ctx, P(X - s * .05, 0, Math.max(pa, z0)), P(X - s * .05, b.h, Math.max(pa, z0)), P(X - s * .05, b.h, pb), P(X - s * .05, 0, pb)); ctx.fillStyle = css(mul(col, 1.1)); ctx.fill(); }
    quad(ctx, P(X - s * .35, b.h - .7, z0), P(X - s * .35, b.h, z0), P(X - s * .35, b.h, b.z1), P(X - s * .35, b.h - .7, b.z1)); ctx.fillStyle = css(hi); ctx.fill();
    quad(ctx, P(X - s * .3, b.h - 1.1, z0), P(X - s * .3, b.h - .7, z0), P(X - s * .3, b.h - .7, b.z1), P(X - s * .3, b.h - 1.1, b.z1)); ctx.fillStyle = css(lo); ctx.fill();
    quad(ctx, P(X, b.h - .7, z0), P(X - s * .35, b.h - .7, z0), P(X - s * .35, b.h - .7, b.z1), P(X, b.h - .7, b.z1)); ctx.fillStyle = css(mul(col, .4)); ctx.fill();
    if (dz < 45 && b.style !== 'glass') { ctx.fillStyle = css(hi); for (let z = Math.max(z0, b.z0) + .2; z < b.z1; z += .5) { const a = P(X - s * .3, b.h - .78, z), c = P(X - s * .3, b.h - 1.02, z + .22); ctx.fillRect(Math.min(a[0], c[0]), a[1], Math.max(1, Math.abs(c[0] - a[0])), c[1] - a[1]); } }
    // shadow where the wall meets the pavement
    quad(ctx, P(X, 0, z0), P(X, .6, z0), P(X, .6, b.z1), P(X, 0, b.z1)); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fill();
    if (dz > 190) return;
    const floors = Math.floor((b.h - 5) / 3.4), glass = b.style === 'glass', sky = mix(hex('#1c2733'), hex('#8fb3d9'), .35 * (1 - night)), winDay = mix(hex('#18212b'), hex('#7fa9d6'), .18 * (1 - night));
    if (glass) {
      quad(ctx, P(X, 4.4, z0), P(X, b.h - 1.1, z0), P(X, b.h - 1.1, b.z1), P(X, 4.4, b.z1)); const gg = ctx.createLinearGradient(A1[0], A1[1], B0[0], B0[1]); gg.addColorStop(0, css(mix(sky, hex('#c7dbea'), .35 * (1 - night)), .95)); gg.addColorStop(.55, css(winDay, .95)); gg.addColorStop(1, css(mix(winDay, sky, .3), .95)); ctx.fillStyle = gg; ctx.fill();
      for (let i = 0; i <= floors; i++) { const y = 4.4 + i * 3.4; quad(ctx, P(X, y, z0), P(X, y + .55, z0), P(X, y + .55, b.z1), P(X, y, b.z1)); ctx.fillStyle = css(mul(col, .62), .9); ctx.fill(); }
      ctx.strokeStyle = css(mul(col, .55), .9); ctx.lineWidth = 1;
      for (let z = Math.ceil(z0 / 1.6) * 1.6; z < b.z1; z += 1.6) line(ctx, P(X, 4.4, z), P(X, b.h - 1.1, z));
      if (night > .3) for (let i = 0; i < floors; i++) for (let z = Math.ceil(z0 / 1.6) * 1.6; z < b.z1 - 1.6; z += 1.6) if (hash(b.seed, i, z * 10 | 0) < .35 * night) { quad(ctx, P(X, 4.4 + i * 3.4 + .6, z + .1), P(X, 4.4 + i * 3.4 + 3.3, z + .1), P(X, 4.4 + i * 3.4 + 3.3, z + 1.5), P(X, 4.4 + i * 3.4 + .6, z + 1.5)); ctx.fillStyle = `rgba(255,226,170,${(.55 * night).toFixed(3)})`; ctx.fill(); }
    } else {
      const arch = b.style === 'brick', fe = arch && !b.org && b.h < 48 && b.z1 - b.z0 > 9;
      for (let i = 0; i < floors; i++) {
        const y0 = 5.2 + i * 3.4, y1 = y0 + 1.95;
        for (let j = 0, z = b.z0 + 1.3; z + 1.3 < b.z1 - .7; j++, z += 2.6) {
          if (z + 1.3 < z0) continue;
          const za = Math.max(z, z0), zb = z + 1.3, wz = za - cam.z, h = hash(b.seed, i, j), on = night > .2 && h < .62 * night;
          // lintel + sill
          if (wz < 80) { quad(ctx, P(X - s * .06, y1, za - .12), P(X - s * .06, y1 + .28, za - .12), P(X - s * .06, y1 + .28, zb + .12), P(X - s * .06, y1, zb + .12)); ctx.fillStyle = css(arch ? mul(hex('#d8cfbd'), Lk) : hi); ctx.fill();
            quad(ctx, P(X - s * .1, y0 - .16, za - .1), P(X - s * .1, y0, za - .1), P(X - s * .1, y0, zb + .1), P(X - s * .1, y0 - .16, zb + .1)); ctx.fill(); }
          if (wz < 110 && zb > z0) { const zr = Math.max(z, z0); quad(ctx, P(X, y0, zr), P(X, y1, zr), P(X + s * .32, y1, zr), P(X + s * .32, y0, zr)); ctx.fillStyle = css(mul(col, .45)); ctx.fill(); quad(ctx, P(X, y1, za), P(X + s * .32, y1, za), P(X + s * .32, y1, zb), P(X, y1, zb)); ctx.fillStyle = css(mul(col, .35)); ctx.fill(); }
          quad(ctx, P(X, y0, za), P(X, y1, za), P(X, y1, zb), P(X, y0, zb));
          if (on) { ctx.fillStyle = css(mix(hex('#ffcf87'), hex('#ffe9c4'), h), .55 + .4 * night); ctx.fill(); }
          else { const wg = ctx.createLinearGradient(0, P(X, y1, za)[1], 0, P(X, y0, za)[1]); wg.addColorStop(0, css(sky, .95)); wg.addColorStop(1, css(winDay, .95)); ctx.fillStyle = wg; ctx.fill(); }
          if (wz < 55) { ctx.strokeStyle = css(mul(col, .55)); ctx.lineWidth = 1; const zm = (za + zb) / 2, ym = y0 + (y1 - y0) * .55; if (zm > z0) line(ctx, P(X, y0, zm), P(X, y1, zm)); line(ctx, P(X, ym, za), P(X, ym, zb)); }
          if (b === catB && i === 4 && j === 2 && night > .6) { const c = P(X, y0 + .55, (za + zb) / 2), k = c[2]; ctx.fillStyle = 'rgba(8,8,10,.95)'; ctx.beginPath(); ctx.ellipse(c[0], c[1] - .2 * k, .28 * k, .3 * k, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(c[0] - .22 * k, c[1] - .38 * k); ctx.lineTo(c[0] - .16 * k, c[1] - .62 * k); ctx.lineTo(c[0] - .06 * k, c[1] - .42 * k); ctx.moveTo(c[0] + .22 * k, c[1] - .38 * k); ctx.lineTo(c[0] + .16 * k, c[1] - .62 * k); ctx.lineTo(c[0] + .06 * k, c[1] - .42 * k); ctx.fill(); if ((t % 5) > .2) { ctx.fillStyle = '#ffd34d'; ctx.fillRect(c[0] - .12 * k, c[1] - .3 * k, Math.max(1, .05 * k), Math.max(1, .04 * k)); ctx.fillRect(c[0] + .07 * k, c[1] - .3 * k, Math.max(1, .05 * k), Math.max(1, .04 * k)); } }
          if (b === knightB && i === 2 && j === 2 && night < .5) { const c = P(X, y0 + .05, (za + zb) / 2), k = c[2]; ctx.fillStyle = 'rgba(20,20,24,.85)'; ctx.font = `${Math.max(6, .9 * k)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('♞', c[0], c[1]); }
        }
        // fire escape on the old brick walk-ups
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
    // ground floor
    if (!b.org) {
      const sf0 = .3, sf1 = 3.2, fz1 = b.z1 - .55;
      quad(ctx, P(X, sf0, z0), P(X, sf1, z0), P(X + s * .5, sf1, z0), P(X + s * .5, sf0, z0)); ctx.fillStyle = css(mul(col, .4)); ctx.fill();
      quad(ctx, P(X, sf0, z0), P(X, sf1, z0), P(X, sf1, fz1), P(X, sf0, fz1)); ctx.fillStyle = night > .2 ? css(mix(hex('#1a1d22'), hex('#ffcf87'), .5 * night), .92) : css(mix(hex('#1c2530'), hex('#8fb3d9'), .2), .95); ctx.fill();
      if (dz < 70) { ctx.strokeStyle = css(mul(col, .5)); ctx.lineWidth = 1.2; for (let z = b.z0 + 2; z < fz1; z += 1.9) if (z > z0) line(ctx, P(X, sf0, z), P(X, sf1, z)); }
      const fas = b.awning ? hex(b.awning) : mul(b.col, .5);
      quad(ctx, P(X - s * .04, sf1, z0), P(X - s * .04, sf1 + .8, z0), P(X - s * .04, sf1 + .8, fz1), P(X - s * .04, sf1, fz1)); ctx.fillStyle = css(mul(lit(fas), .9)); ctx.fill();
      if (b.awning && dz < 120) { const ac = lit(hex(b.awning)), az1 = Math.min(fz1, b.z0 + (b.z1 - b.z0) * .6);
        for (let z = Math.max(z0, b.z0 + .6), k = 0; z < az1; z += .7, k++) { quad(ctx, P(X, sf1 + .75, z), P(X - s * 1.5, sf1 + .1, z), P(X - s * 1.5, sf1 + .1, Math.min(az1, z + .7)), P(X, sf1 + .75, Math.min(az1, z + .7))); ctx.fillStyle = css(k % 2 ? mul(ac, 1.25) : ac); ctx.fill(); }
        if (az1 > z0) { quad(ctx, P(X - s * 1.5, sf1 + .1, Math.max(z0, b.z0 + .6)), P(X - s * 1.5, sf1 - .25, Math.max(z0, b.z0 + .6)), P(X - s * 1.5, sf1 - .25, az1), P(X - s * 1.5, sf1 + .1, az1)); ctx.fillStyle = css(mul(ac, .8)); ctx.fill(); } }
    } else orgFront(ctx, b, z0, t);
  }

  function orgFront(ctx, b, z0, t) {
    const o = b.org, s = b.side, X = s * FACADE, acc = hex(o.accent);
    const d0 = o.door - 1.3, d1 = o.door + 1.3;
    // storefront glow
    quad(ctx, P(X, .3, z0), P(X, 3.6, z0), P(X, 3.6, b.z1), P(X, .3, b.z1));
    ctx.fillStyle = css(mix(hex('#20262e'), hex('#ffdca0'), .25 + .5 * night), .95); ctx.fill();
    if (o.style === 'brick') for (let z = b.z0 + 2; z < b.z1 - 1; z += 4) { if (Math.abs(z - o.door) < 2) continue; for (let i = 0; i < 2; i++) { const y = 6 + i * 6; if (z < z0) continue; quad(ctx, P(X - s * .05, y, z), P(X - s * .05, y + 4.5, z), P(X - s * .05, y + 4.5, z + .9), P(X - s * .05, y, z + .9)); ctx.fillStyle = css(lit(acc), .9); ctx.fill(); } }
    if (o.style === 'pharma' && d0 > z0) { const c = P(X - s * .9, 5.4, d0 - 1.2), k = c[2]; ctx.fillStyle = css(acc, .65 + .35 * Math.abs(Math.sin(t * 2))); ctx.fillRect(c[0] - .25 * k, c[1] - .8 * k, .5 * k, 1.6 * k); ctx.fillRect(c[0] - .8 * k, c[1] - .25 * k, 1.6 * k, .5 * k); }
    if (d1 < z0) return;
    // door
    quad(ctx, P(X, 0, Math.max(d0, z0)), P(X, 3.2, Math.max(d0, z0)), P(X, 3.2, d1), P(X, 0, d1)); ctx.fillStyle = css(mix(hex('#0d1014'), hex('#ffe3a6'), .2 + .6 * night)); ctx.fill();
    ctx.strokeStyle = css(lit(acc)); ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
    // awning in the org's colour
    quad(ctx, P(X, 3.6, Math.max(d0 - .6, z0)), P(X - s * 1.8, 3.3, Math.max(d0 - .6, z0)), P(X - s * 1.8, 3.3, d1 + .6), P(X, 3.6, d1 + .6)); ctx.fillStyle = css(lit(acc), .95); ctx.fill();
    // blade sign, square to the street, so it reads
    const zs = d0 - 3.4; if (zs < cam.z + .6) return;
    const a = P(X - s * .25, 6.1, zs), c = P(X - s * 2.9, 3.85, zs), x0 = Math.min(a[0], c[0]), w = Math.abs(c[0] - a[0]), y0 = a[1], h = c[1] - a[1];
    const darkPlate = o.plate === 'dark'; ctx.fillStyle = darkPlate ? '#16181c' : night > .4 ? '#fff8ec' : '#f2ece0'; ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = css(acc); ctx.lineWidth = Math.max(1, w * .03); ctx.strokeRect(x0, y0, w, h);
    if (night > .4) { const gl = ctx.createRadialGradient(x0 + w / 2, y0 + h / 2, 0, x0 + w / 2, y0 + h / 2, w * 1.2); gl.addColorStop(0, `rgba(255,240,210,${.25 * night})`); gl.addColorStop(1, 'rgba(255,240,210,0)'); ctx.fillStyle = gl; ctx.fillRect(x0 - w, y0 - h, w * 3, h * 3); }
    if (o.img && o.img.complete && o.img.naturalWidth) { const ar = o.img.naturalWidth / o.img.naturalHeight; let iw = w * .8, ih = iw / ar; if (ih > h * .52) { ih = h * .52; iw = ih * ar; } ctx.drawImage(o.img, x0 + (w - iw) / 2, y0 + h * .08 + (h * .52 - ih) / 2, iw, ih); }
    if (w > 26) { ctx.fillStyle = darkPlate ? '#f2ece0' : '#1b1b1b'; ctx.font = `600 ${Math.max(6, Math.min(w * .1, h * .14))}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(o.org, x0 + w / 2, y0 + h * .93, w * .92); }
    const br = P(X, 5.6, zs); ctx.strokeStyle = 'rgba(30,30,30,.8)'; ctx.lineWidth = Math.max(1, a[2] * .08); ctx.beginPath(); ctx.moveTo(br[0], br[1]); ctx.lineTo(a[0], a[1] + h * .1); ctx.stroke();
  }

  /* sprites */
  function drawProp(ctx, p, t) {
    const [x, y, k] = P(p.x, 0, p.z); fogAmt = fogOf(p.z);
    switch (p.t) {
      case 'tree': {
        const s = p.s, g0 = lit(mix(hex('#4f7d3b'), hex('#355a2c'), hash(p.z | 0))), lw = Math.max(1, .05 * k);
        if (night < .8) { const sh = P(p.x - 1.2, 0, p.z + .6); ctx.fillStyle = `rgba(0,0,0,${(.28 * (1 - night)).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], 1.9 * k * s, .5 * k * s, 0, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = css(lit(hex('#1f2326'))); ctx.lineWidth = lw; ctx.strokeRect(x - .6 * k, y - .45 * k, 1.2 * k, .45 * k);
        ctx.fillStyle = css(lit(hex('#3a2c22'))); ctx.beginPath(); ctx.moveTo(x - .16 * k, y); ctx.lineTo(x - .09 * k, y - 2.6 * k * s); ctx.lineTo(x + .09 * k, y - 2.6 * k * s); ctx.lineTo(x + .16 * k, y); ctx.fill();
        ctx.strokeStyle = css(lit(hex('#3a2c22'))); ctx.lineWidth = Math.max(1, .08 * k); line(ctx, [x, y - 2.3 * k * s], [x - .8 * k * s, y - 3.4 * k * s]); line(ctx, [x, y - 2.5 * k * s], [x + .7 * k * s, y - 3.6 * k * s]);
        const blobs = [[0, 4.1, 1.45], [-1, 3.5, 1.05], [1, 3.6, 1.1], [-.5, 4.9, 1], [.6, 4.8, 1.05], [0, 3.1, .95], [-1.3, 4.3, .8], [1.3, 4.4, .8]];
        blobs.forEach(([dx, dy, r]) => { ctx.fillStyle = css(mul(g0, .78)); ctx.beginPath(); ctx.arc(x + dx * k * s, y - dy * k * s, r * k * s, 0, TAU); ctx.fill(); });
        blobs.forEach(([dx, dy, r], i) => { ctx.fillStyle = css(mul(g0, 1 + (i % 3) * .06)); ctx.beginPath(); ctx.arc(x + (dx + .18) * k * s, y - (dy + .18) * k * s, r * .78 * k * s, 0, TAU); ctx.fill(); });
        if (night < .7) blobs.slice(0, 5).forEach(([dx, dy, r]) => { ctx.fillStyle = css(mix(g0, hex('#dfe9a8'), .35), .35 * (1 - night)); ctx.beginPath(); ctx.arc(x + (dx + .45) * k * s, y - (dy + .45) * k * s, r * .35 * k * s, 0, TAU); ctx.fill(); });
        break; }
      case 'lamp': {
        const s = p.side, pc = css(lit(hex('#262b30'))), top = P(p.x, 6.6, p.z), crook = P(p.x - s * .2, 7.6, p.z), head = P(p.x - s * 1.6, 7.2, p.z);
        ctx.fillStyle = pc; ctx.beginPath(); ctx.moveTo(x - .22 * k, y); ctx.lineTo(x - .09 * k, y - .9 * k); ctx.lineTo(x + .09 * k, y - .9 * k); ctx.lineTo(x + .22 * k, y); ctx.fill();
        ctx.strokeStyle = pc; ctx.lineWidth = Math.max(1, .12 * k); ctx.beginPath(); ctx.moveTo(x, y - .9 * k); ctx.lineTo(top[0], top[1]); ctx.quadraticCurveTo(crook[0], crook[1] - .4 * k, head[0], head[1] - .2 * k); ctx.stroke();
        ctx.lineWidth = Math.max(1, .05 * k); line(ctx, [x, y - 1.3 * k], [x, y - 1.5 * k]);
        ctx.fillStyle = pc; ctx.beginPath(); ctx.moveTo(head[0] - .4 * k, head[1]); ctx.quadraticCurveTo(head[0], head[1] - .5 * k, head[0] + .4 * k, head[1]); ctx.closePath(); ctx.fill();
        ctx.fillStyle = night > .25 ? '#fff1cf' : css(lit(hex('#d9d4c4'))); ctx.beginPath(); ctx.ellipse(head[0], head[1] + .02 * k, .3 * k, .08 * k, 0, 0, TAU); ctx.fill();
        if (night > .25) { const a = (night - .25) / .75, g = ctx.createRadialGradient(head[0], head[1] + .2 * k, 0, head[0], head[1] + .2 * k, 2 * k); g.addColorStop(0, `rgba(255,214,150,${.5 * a})`); g.addColorStop(.25, `rgba(255,214,150,${.18 * a})`); g.addColorStop(1, 'rgba(255,214,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(head[0], head[1] + .2 * k, 2 * k, 0, TAU); ctx.fill();
          const gp = P(p.x - s * 1.6, 0, p.z); ctx.fillStyle = `rgba(255,214,150,${.07 * a})`; ctx.beginPath(); ctx.ellipse(gp[0], gp[1], 3 * k, .8 * k, 0, 0, TAU); ctx.fill(); }
        break; }
      case 'signal': {
        const s = p.side, top = P(p.x, 5.6, p.z); ctx.strokeStyle = css(lit(hex('#2b3035'))); ctx.lineWidth = Math.max(1, .14 * k); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(top[0], top[1]); ctx.stroke();
        ctx.fillStyle = '#1a1c1f'; ctx.fillRect(top[0] - .22 * k, top[1], .44 * k, 1.2 * k);
        const ph = Math.floor((t + (s > 0 ? 0 : 6)) / 6) % 2; [['#ff4b3e', 0], ['#3be37a', 1]].forEach(([c, i]) => { ctx.fillStyle = ph === i ? c : 'rgba(80,80,80,.6)'; ctx.beginPath(); ctx.arc(top[0], top[1] + (.3 + i * .55) * k, .14 * k, 0, TAU); ctx.fill(); });
        // street name, small
        const sg = P(p.x - s * .1, 4.6, p.z), sg2 = P(p.x - s * 1.9, 4.2, p.z), sx = Math.min(sg[0], sg2[0]), sw = Math.abs(sg2[0] - sg[0]), sh = sg2[1] - sg[1];
        ctx.fillStyle = '#1f6f43'; ctx.fillRect(sx, sg[1], sw, sh); if (sw > 30) { ctx.fillStyle = '#fff'; ctx.font = `600 ${Math.max(6, sh * .6)}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.name, sx + sw / 2, sg[1] + sh / 2 + 1, sw * .92); }
        break; }
      case 'hydrant': ctx.fillStyle = css(lit(hex('#b3261e'))); ctx.fillRect(x - .16 * k, y - .7 * k, .32 * k, .7 * k); ctx.beginPath(); ctx.arc(x, y - .7 * k, .17 * k, Math.PI, 0); ctx.fill(); ctx.fillRect(x - .26 * k, y - .5 * k, .52 * k, .12 * k); break;
      case 'subway': {
        const g = night > .3 ? '#7dff9a' : '#2f8f4e'; ctx.strokeStyle = css(lit(hex('#1f4a33'))); ctx.lineWidth = Math.max(1, .08 * k);
        for (const dz of [-1.6, 1.6]) { const q = P(p.x, 1.1, p.z + dz), b = P(p.x, 0, p.z + dz); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); const gl = P(p.x, 2.2, p.z + dz); ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(gl[0], gl[1]); ctx.stroke(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gl[0], gl[1], .2 * gl[2], 0, TAU); ctx.fill(); if (night > .3) { const r = ctx.createRadialGradient(gl[0], gl[1], 0, gl[0], gl[1], gl[2] * 1.2); r.addColorStop(0, 'rgba(120,255,160,.35)'); r.addColorStop(1, 'rgba(120,255,160,0)'); ctx.fillStyle = r; ctx.beginPath(); ctx.arc(gl[0], gl[1], gl[2] * 1.2, 0, TAU); ctx.fill(); } }
        const a = P(p.x, 1.1, p.z - 1.6), b = P(p.x, 1.1, p.z + 1.6); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); break; }
      case 'bikes': for (let i = 0; i < 6; i++) { const q = P(p.x, 0, p.z + i * .9), kk = q[2], c = css(lit(hex('#1e6fd0'))); ctx.strokeStyle = 'rgba(20,20,22,.9)'; ctx.lineWidth = Math.max(1, .05 * kk); ctx.beginPath(); ctx.arc(q[0] - .25 * kk * Math.sign(p.x), q[1] - .33 * kk, .3 * kk, 0, TAU); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, .08 * kk); ctx.beginPath(); ctx.moveTo(q[0], q[1] - .4 * kk); ctx.lineTo(q[0], q[1] - .95 * kk); ctx.lineTo(q[0] + .15 * kk, q[1] - 1 * kk); ctx.stroke(); } break;
      case 'cart': { const c = P(p.x, 1.1, p.z), kk = c[2]; ctx.fillStyle = css(lit(hex('#c8ccd2'))); ctx.fillRect(c[0] - .7 * kk, c[1], 1.4 * kk, 1.0 * kk); ctx.fillStyle = css(lit(hex('#2b2f36'))); ctx.beginPath(); ctx.arc(c[0] - .4 * kk, c[1] + 1 * kk, .2 * kk, 0, TAU); ctx.arc(c[0] + .4 * kk, c[1] + 1 * kk, .2 * kk, 0, TAU); ctx.fill();
        const u = P(p.x, 2.6, p.z); ctx.strokeStyle = 'rgba(40,40,40,.8)'; ctx.lineWidth = Math.max(1, .05 * kk); ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(u[0], u[1]); ctx.stroke();
        for (let i = 0; i < 6; i++) { ctx.fillStyle = css(lit(hex(i % 2 ? '#f2f0ea' : '#2a64b3'))); ctx.beginPath(); ctx.moveTo(u[0], u[1] - .2 * kk); ctx.arc(u[0], u[1] + .2 * kk, 1.1 * kk, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); ctx.closePath(); ctx.fill(); } break; }
      case 'steam': { const c = P(p.x, 0, p.z), kk = c[2]; for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? css(lit(hex('#f2f0ea'))) : css(lit(hex('#e8742c'))); ctx.fillRect(c[0] - .28 * kk, c[1] - (i + 1) * .45 * kk, .56 * kk, .45 * kk); }
        for (let i = 0; i < 8; i++) { const u = ((t * .35 + i / 8) % 1), py = c[1] - (1.8 + u * 5) * kk, px = c[0] + Math.sin(u * 6 + i) * .4 * kk, r = (.4 + u * 1.2) * kk; ctx.fillStyle = `rgba(235,238,242,${(.28 * (1 - u)).toFixed(3)})`; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); } break; }
      case 'news': { const c = P(p.x, 1.2, p.z), kk = c[2]; ctx.fillStyle = css(lit(hex('#2f5fa8'))); ctx.fillRect(c[0] - .25 * kk, c[1], .5 * kk, 1.2 * kk); ctx.fillStyle = css(lit(hex('#e8e4da'))); ctx.fillRect(c[0] - .18 * kk, c[1] + .15 * kk, .36 * kk, .3 * kk); break; }
      case 'car': drawCar(ctx, p.x, p.z, p.dir, hex(p.col), p.cab); break;
    }
  }

  function drawCar(ctx, x, zc, dir, col, cab) {
    const L = 4.5, hw = .92, zn = zc - L / 2, zf = zc + L / 2; if (zn < cam.z + .5) return;
    const sx = x > cam.x ? -1 : 1, sideX = x + sx * hw, c = lit(col), glassC = mix(hex('#141b24'), hex('#7fa9d6'), .2 * (1 - night));
    // shadow on the road
    const s0 = P(x, 0, zn - .2), s1 = P(x, 0, zf); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse((s0[0] + s1[0]) / 2, (s0[1] * .7 + s1[1] * .3), hw * 1.25 * s0[2], Math.max(2, (s0[1] - s1[1]) * .55 + .12 * s0[2]), 0, 0, TAU); ctx.fill();
    // side: sill, body, a hood that slopes, the glasshouse
    const side = [P(sideX, .32, zn), P(sideX, .95, zn), P(sideX, 1.05, zn + .9), P(sideX, 1.05, zf - .5), P(sideX, .95, zf), P(sideX, .32, zf)];
    ctx.beginPath(); side.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fillStyle = css(mul(c, .82)); ctx.fill();
    quad(ctx, P(sideX, .32, zn), P(sideX, .5, zn), P(sideX, .5, zf), P(sideX, .32, zf)); ctx.fillStyle = css(mul(c, .55)); ctx.fill();
    const gx = sideX * .97 + x * .03; quad(ctx, P(gx, 1.05, zn + 1.15), P(x + sx * hw * .82, 1.55, zn + 1.55), P(x + sx * hw * .82, 1.55, zf - 1.45), P(gx, 1.05, zf - .85)); ctx.fillStyle = css(mul(c, .7)); ctx.fill();
    quad(ctx, P(gx, 1.1, zn + 1.3), P(x + sx * hw * .84, 1.5, zn + 1.65), P(x + sx * hw * .84, 1.5, zf - 1.55), P(gx, 1.1, zf - 1)); ctx.fillStyle = css(glassC); ctx.fill();
    ctx.strokeStyle = css(mul(c, .7)); ctx.lineWidth = Math.max(1, P(sideX, 0, zn)[2] * .05); line(ctx, P(gx, 1.1, zc - .1), P(x + sx * hw * .84, 1.5, zc - .1));
    for (const wz of [zn + .85, zf - .85]) { const w = P(sideX, .33, wz), r = .33 * w[2]; ctx.fillStyle = '#0b0b0c'; ctx.beginPath(); ctx.ellipse(w[0], w[1], r * .5, r, 0, 0, TAU); ctx.fill(); ctx.fillStyle = css(lit(hex('#8d9196'))); ctx.beginPath(); ctx.ellipse(w[0], w[1], r * .26, r * .52, 0, 0, TAU); ctx.fill(); }
    // the face we see: rear (or front, for oncoming)
    const a = P(x - hw, .32, zn), b = P(x + hw, 1.0, zn), w = b[0] - a[0], h = a[1] - b[1];
    rrect(ctx, a[0], b[1], w, h, w * .06); ctx.fillStyle = css(c); ctx.fill();
    const ca = P(x - hw * .8, 1.0, zn + 1.15), cb = P(x + hw * .8, 1.55, zn + 1.15), cw = cb[0] - ca[0], ch = ca[1] - cb[1];
    ctx.fillStyle = css(mul(c, .9)); ctx.beginPath(); ctx.moveTo(a[0] + w * .1, b[1]); ctx.lineTo(ca[0], cb[1]); ctx.lineTo(cb[0], cb[1]); ctx.lineTo(b[0] - w * .1, b[1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = css(glassC); ctx.beginPath(); ctx.moveTo(a[0] + w * .16, b[1] - ch * .08); ctx.lineTo(ca[0] + cw * .06, cb[1] + ch * .15); ctx.lineTo(cb[0] - cw * .06, cb[1] + ch * .15); ctx.lineTo(b[0] - w * .16, b[1] - ch * .08); ctx.closePath(); ctx.fill();
    ctx.fillStyle = css(mul(c, .5)); ctx.fillRect(a[0], a[1] - h * .2, w, h * .2);
    ctx.fillStyle = css(lit(hex('#e9e6dc'))); ctx.fillRect(a[0] + w * .4, a[1] - h * .42, w * .2, h * .16);
    const ly = b[1] + h * .22, lh = h * .16;
    if (dir < 0) { ctx.fillStyle = night > .3 ? '#fff6d8' : css(lit(hex('#e8e4da'))); rrect(ctx, a[0] + w * .06, ly, w * .22, lh, lh * .4); ctx.fill(); rrect(ctx, b[0] - w * .28, ly, w * .22, lh, lh * .4); ctx.fill(); ctx.fillStyle = css(mul(c, .4)); ctx.fillRect(a[0] + w * .32, ly, w * .36, lh * 1.4);
      if (night > .3) { const gg = ctx.createRadialGradient(a[0] + w / 2, ly, 0, a[0] + w / 2, ly, w * 1.5); gg.addColorStop(0, `rgba(255,246,216,${.32 * night})`); gg.addColorStop(1, 'rgba(255,246,216,0)'); ctx.fillStyle = gg; ctx.fillRect(a[0] - w, ly - w, w * 3, w * 2.4); } }
    else { ctx.fillStyle = dir > 0 || night > .5 ? '#ff3b30' : css(lit(hex('#8a1f1a'))); rrect(ctx, a[0] + w * .05, ly, w * .24, lh, lh * .3); ctx.fill(); rrect(ctx, b[0] - w * .29, ly, w * .24, lh, lh * .3); ctx.fill();
      if (dir > 0 && night > .3) { const gg = ctx.createRadialGradient(a[0] + w / 2, ly, 0, a[0] + w / 2, ly, w); gg.addColorStop(0, `rgba(255,60,48,${.18 * night})`); gg.addColorStop(1, 'rgba(255,60,48,0)'); ctx.fillStyle = gg; ctx.fillRect(a[0] - w * .5, ly - w * .5, w * 2, w); } }
    if (cab) { const t1 = P(x - .3, 1.55, zn + 1.7), t2 = P(x + .3, 1.78, zn + 1.7); ctx.fillStyle = night > .3 ? '#fff2b0' : css(lit(hex('#f7f1d6'))); rrect(ctx, t1[0], t2[1], t2[0] - t1[0], t1[1] - t2[1], 2); ctx.fill();
      ctx.fillStyle = css(mul(c, .6)); for (let i = 0; i < 6; i++) if (i % 2) ctx.fillRect(a[0] + w * i / 6, b[1] + h * .58, w / 6, h * .07); }
  }

  /* ---------- the loop ---------- */
  let mode = 'walk', tNow = 0, last = performance.now();
  function frame(n) {
    const dt = Math.min(.05, (n - last) / 1000); last = n; tNow += dt;
    walk(dt);
    W = C.w; H = C.h; f = Math.min(W * .62, H * .92); hy = H * .5 + cam.bob * 3; camY = 1.62 + cam.bob * .045;
    night = span(cam.z, 152, 200); Lk = lerp(.8, .3, night); fogCol = night < .5 ? mix(hex('#7d8a95'), hex('#a8826a'), night * 2) : mix(hex('#a8826a'), hex('#0e1424'), night * 2 - 1); fogAmt = 0;
    const ctx = C.ctx; ctx.save(); ctx.clearRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2); ctx.rotate(cam.roll); ctx.translate(-W / 2, -H / 2);
    fogAmt = .72; sky(ctx, tNow); fogAmt = 0; ground(ctx);
    // buildings, far to near on each side
    BUILDINGS.filter(b => b.z1 > cam.z + .35 && b.z0 < cam.z + 600).sort((a, b) => b.z0 - a.z0).forEach(b => building(ctx, b, tNow));
    // everything on the street
    const items = PROPS.filter(p => p.z > cam.z + .4 && p.z < cam.z + 260).map(p => ({ p, z: p.z }));
    TRAFFIC.forEach(c => { const z = c.lane > 0 ? ((c.base + c.v * tNow) % 360) - 60 : 300 - ((c.base + c.v * tNow) % 360); items.push({ p: { t: 'car', x: c.lane, z, dir: c.lane > 0 ? 1 : -1, col: c.col, cab: c.col === '#f2c230' }, z }); });
    items.sort((a, b) => b.z - a.z).forEach(({ p }) => { if (p.z > cam.z + .4 && p.z < cam.z + 260) drawProp(ctx, p, tNow); });
    // dusk haze down the avenue
    const hzc = css(fogCol, .42), hz = ctx.createLinearGradient(0, hy - H * .3, 0, hy + H * .1); hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(.78, hzc); hz.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = hz; ctx.fillRect(0, hy - H * .3, W, H * .4);
    ctx.restore();
    // vignette
    const vg = ctx.createRadialGradient(W / 2, H * .46, Math.min(W, H) * .25, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${.55 + .25 * night})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ui();
    requestAnimationFrame(frame);
  }

  /* ---------- UI: title, buzzer, map, end ---------- */
  const title = document.getElementById('walkTitle'), buzz = document.getElementById('buzz'), buzzName = document.getElementById('buzzName'), endEl = document.getElementById('walkEnd');
  const map = document.getElementById('walkMap');
  map.innerHTML = ORGS.map((o, i) => `<button class="pin" data-i="${i}" style="left:${(o.door / ZMAX * 100).toFixed(1)}%" aria-label="Walk to ${o.org}"><span>${o.org.split(' ')[0] === 'The' ? o.org.split(' ')[1] : o.org.split(' ')[0]}</span><i></i></button>`).join('') + '<span class="me" id="me"></span>';
  const me = document.getElementById('me');
  map.querySelectorAll('.pin').forEach(b => b.addEventListener('click', () => { if (mode !== 'walk') return; cam.target = ORGS[+b.dataset.i].door - 9; }));
  let near = null;
  function ui() {
    if (cam.z > 1.2) title.classList.add('gone'); else title.classList.remove('gone');
    me.style.left = (clamp(cam.z / ZMAX, 0, 1) * 100).toFixed(2) + '%';
    endEl.hidden = !(cam.z > ZMAX - 5 && mode === 'walk');
    near = mode === 'walk' ? ORGS.find(o => o.door - cam.z > 2.5 && o.door - cam.z < 19) : null;
    if (near) {
      const p = P(near.side * FACADE, 1.4, near.door);
      buzz.hidden = false; buzz.classList.add('show'); buzzName.textContent = near.org;
      buzz.style.left = clamp(p[0], 120, W - 120) + 'px'; buzz.style.top = clamp(p[1] - 30, H * .4, H * .72) + 'px';
    } else { buzz.classList.remove('show'); buzz.hidden = true; }
  }

  /* ---------- input: scrolling walks ---------- */
  const go = d => { if (mode !== 'walk') return; cam.target = clamp(cam.target + d, 0, ZMAX); cam.target = clamp(cam.target, cam.z - 18, cam.z + 18); };
  addEventListener('wheel', e => { e.preventDefault(); go((e.deltaMode ? e.deltaY * 30 : e.deltaY) * .03); }, { passive: false });
  addEventListener('keydown', e => { if (mode === 'inside' && e.key === 'Escape') return leave(); if (mode !== 'walk') return; const k = e.key; if (k === 'ArrowUp' || k === 'w' || k === 'PageDown' || k === ' ') { go(k === 'PageDown' || k === ' ' ? 12 : 3); e.preventDefault(); } if (k === 'ArrowDown' || k === 's' || k === 'PageUp') { go(k === 'PageUp' ? -12 : -3); e.preventDefault(); } if (k === 'Enter' && near) enter(near); });
  let ty = null; addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', e => { if (ty == null) return; const y = e.touches[0].clientY; go((ty - y) * .06); ty = y; }, { passive: true });
  buzz.addEventListener('click', () => near && enter(near));

  /* ---------- stepping inside ---------- */
  const modal = document.getElementById('wmodal'), card = document.getElementById('wmCard');
  const EXIT = '<button class="wm-exit" type="button" id="wmExit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>EXIT</button>';
  function zoomTo(px, py, from, to, steps, T) {
    return new Promise(res => {
      if (RM) { cv.style.transform = to === 1 ? '' : `translate(${px * (1 - to)}px,${py * (1 - to)}px) scale(${to})`; return res(); }
      const t0 = performance.now(), tot = steps * T;
      const tick = n => { const el = (n - t0) / 1000, i = Math.min(steps - 1, Math.floor(el / T)), u = clamp((el - i * T) / T, 0, 1), e = 1 - Math.pow(1 - Math.min(1, u * 1.6), 3);
        const s = from * Math.pow(to / from, (i + e) / steps), bob = Math.sin(Math.PI * u) * 7 * (i % 2 ? 1 : -1) * .6, bobY = -Math.sin(Math.PI * u) * 9;
        cv.style.transform = `translate(${(px * (1 - s) + bob).toFixed(1)}px,${(py * (1 - s) + bobY).toFixed(1)}px) scale(${s.toFixed(4)})`;
        if (el < tot) requestAnimationFrame(tick); else { cv.style.transform = to === 1 ? '' : `translate(${px * (1 - to)}px,${py * (1 - to)}px) scale(${to})`; res(); } };
      requestAnimationFrame(tick);
    });
  }
  let doorPt = null;
  async function enter(o) {
    if (mode !== 'walk') return; mode = 'entering'; cam.target = cam.z; buzz.classList.remove('show'); buzz.hidden = true;
    const p = P(o.side * FACADE, 1.5, o.door); doorPt = [clamp(p[0], 0, W), clamp(p[1], 0, H)];
    await zoomTo(doorPt[0], doorPt[1], 1, 7, 5, .3);
    fade.style.opacity = 1; await new Promise(r => setTimeout(r, RM ? 0 : 320));
    openModal(`<div class="wm-head"><div class="wm-logo${o.plate === 'dark' ? ' dark' : ''}">${o.logo ? `<img src="${o.logo}" alt="">` : ''}</div><div><h2 id="wmOrg">${o.org}</h2><p>${o.role} · ${o.dates}</p></div></div>
      <div class="wm-body">${(o.text || [o.blurb]).map(t => `<p>${t}</p>`).join('')}${o.details ? `<ul>${o.details.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}</div>${EXIT}`);
    map.querySelector(`.pin[data-i="${o.idx}"]`).classList.add('seen');
  }
  function openModal(html) { card.innerHTML = html; modal.hidden = false; requestAnimationFrame(() => modal.classList.add('show')); mode = 'inside'; const x = document.getElementById('wmExit'); x.addEventListener('click', leave); x.focus(); }
  async function leave() {
    if (mode !== 'inside') return; mode = 'leaving';
    modal.classList.remove('show'); await new Promise(r => setTimeout(r, 300)); modal.hidden = true;
    if (doorPt) { fade.style.opacity = 0; await zoomTo(doorPt[0], doorPt[1], 7, 1, 3, .22); doorPt = null; } else fade.style.opacity = 0;
    mode = 'walk';
  }
  modal.addEventListener('click', e => { if (e.target === modal) leave(); });
  document.getElementById('walkList').addEventListener('click', () => {
    if (mode !== 'walk') return;
    openModal(`<div class="wm-list"><h2 id="wmOrg" style="margin:0 0 6px">Work</h2>${ORGS.map(o => `<div class="wm-item"><h3>${o.org}</h3><p class="mono" style="font-size:12.5px;color:var(--muted)">${o.role} · ${o.dates}</p><p style="color:#cfd6e2">${(o.text || [o.blurb]).join(' ')}</p></div>`).join('')}</div>${EXIT}`);
  });

  requestAnimationFrame(frame);
})();
