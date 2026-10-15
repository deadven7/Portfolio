/* About page
   1. opening: a CRT warms up onto a rolling film reel; a superhero dives as the scroll cue
   2. a downward neural network the scroll walks through, node by node, each with its own background
   3. credits
   4. a small fourth-wall break for anyone who lingers */
(function () {
  const RM = !!window.reducedMotion;
  const TAU = Math.PI * 2;
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const span = (p, a, b) => ease((p - a) / (b - a));
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, a).toFixed(3)})`; };
  const PAL = { cyan: '#5ee6ff', green: '#7cffb2', amber: '#ffb547', gold: '#ffcf5a', rose: '#ff6b8b', pink: '#ff6bd5', violet: '#c4a7ff', blue: '#7cc8ff', lime: '#d6f45a', bronze: '#e3a467', paper: '#f0e6cc', teal: '#4fd1c5' };

  /* ---------- film grain ---------- */
  (() => {
    const c = document.createElement('canvas'); c.width = c.height = 180; const x = c.getContext('2d'), im = x.createImageData(180, 180);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); document.getElementById('mvHero').style.setProperty('--grain', `url(${c.toDataURL()})`);
  })();

  /* ---------- scroll velocity + last input (for the fourth wall) ---------- */
  let lastY = scrollY, vel = 0, lastInput = performance.now();
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  (function track() { const y = scrollY; vel = lerp(vel, y - lastY, .25); lastY = y; requestAnimationFrame(track); })();
  ['scroll', 'wheel', 'keydown', 'touchstart', 'pointerdown'].forEach(ev => addEventListener(ev, () => { lastInput = performance.now(); onInput(); }, { passive: true }));
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; lastInput = performance.now(); onInput(); }, { passive: true });

  /* =========================================================
     1. OPENING
     ========================================================= */
  const hero = document.getElementById('mvHero'), shade = document.getElementById('mvShade'), titles = document.getElementById('mvTitles'), title = document.getElementById('mvTitle'), crt = document.getElementById('crt');
  const RC = fitCanvas(document.getElementById('reel'));
  const T_ON = RM ? 0 : 1.05, t0 = performance.now() / 1000;
  history.scrollRestoration = 'manual'; window.scrollTo(0, 0);
  if (RM) crt.remove();
  else { requestAnimationFrame(() => crt.classList.add('go')); setTimeout(() => crt.classList.add('done'), T_ON * 1000); setTimeout(() => crt.remove(), T_ON * 1000 + 600); }
  setTimeout(() => title.classList.add('on'), (T_ON + .25) * 1000);

  /* film strips — each frame a tiny drawing of something further down */
  const VIGNETTES = ['cards', 'strings', 'keys', 'knight', 'planet', 'cluster', 'tree', 'cloud', 'keys', 'reel'];
  const VCOL = [PAL.cyan, PAL.bronze, PAL.lime, PAL.gold, PAL.violet, PAL.pink, PAL.teal, PAL.blue, PAL.amber, PAL.paper];
  function vignette(ctx, kind, x, y, w, h, col, a) {
    const cx = x + w / 2, cy = y + h / 2, s = Math.min(w, h);
    ctx.save(); ctx.strokeStyle = rgba(col, a); ctx.fillStyle = rgba(col, a); ctx.lineWidth = Math.max(1, s / 70); ctx.lineCap = 'round';
    switch (kind) {
      case 'cards': ['#e8574a', '#f5c518', '#36b37e', '#2f80ed'].forEach((c, i) => { ctx.save(); ctx.translate(cx + (i - 1.5) * s * .1, cy + s * .08); ctx.rotate((i - 1.5) * .25); ctx.fillStyle = rgba(c, a); ctx.fillRect(-s * .1, -s * .3, s * .2, s * .3); ctx.restore(); }); break;
      case 'strings': for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x + w * .12, y + h * (.3 + i * .08)); ctx.lineTo(x + w * .88, y + h * (.3 + i * .08)); ctx.stroke(); } break;
      case 'keys': for (let i = 0; i < 7; i++) ctx.strokeRect(x + w * (.14 + i * .1), y + h * .3, w * .1, h * .42); for (const i of [0, 1, 3, 4, 5]) ctx.fillRect(x + w * (.21 + i * .1), y + h * .3, w * .06, h * .24); break;
      case 'ball': ctx.beginPath(); ctx.arc(cx, cy, s * .2, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx - s * .28, cy, s * .2, -.9, .9); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + s * .28, cy, s * .2, Math.PI - .9, Math.PI + .9); ctx.stroke(); break;
      case 'knight': ctx.font = `${s * .62}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♞', cx, cy + s * .03); break;
      case 'planet': ctx.beginPath(); ctx.arc(cx, cy, s * .15, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx, cy, s * .32, s * .09, -.35, 0, TAU); ctx.stroke(); break;
      case 'cluster': { const R = rng(4); [[-.18, -.08], [.16, -.1], [0, .16]].forEach(([dx, dy]) => { for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(cx + (dx + (R() - .5) * .14) * s, cy + (dy + (R() - .5) * .12) * s, s * .02, 0, TAU); ctx.fill(); } }); break; }
      case 'tree': { const br = (x1, y1, len, ang, d) => { if (d > 3) return; const x2 = x1 + Math.cos(ang) * len, y2 = y1 + Math.sin(ang) * len; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); br(x2, y2, len * .7, ang - .5, d + 1); br(x2, y2, len * .7, ang + .5, d + 1); }; br(cx, y + h * .85, s * .22, -Math.PI / 2, 0); break; }
      case 'cloud': ctx.beginPath(); ctx.arc(cx - s * .12, cy + s * .02, s * .11, Math.PI * .5, Math.PI * 1.5); ctx.arc(cx, cy - s * .06, s * .14, Math.PI, 0); ctx.arc(cx + s * .14, cy + s * .02, s * .1, Math.PI * 1.5, Math.PI * .5); ctx.closePath(); ctx.stroke(); break;
      case 'reel': ctx.beginPath(); ctx.arc(cx, cy, s * .28, 0, TAU); ctx.stroke(); for (let i = 0; i < 5; i++) { const an = i / 5 * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(an) * s * .15, cy + Math.sin(an) * s * .15, s * .055, 0, TAU); ctx.stroke(); } break;
    }
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function drawStrip(ctx, H, xc, w, off, alpha, seed) {
    const fh = w * .78, margin = w * .15, x = xc - w / 2;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#100d09'; ctx.fillRect(x, -2, w, H + 4);
    for (let k = Math.floor(off / fh) - 1; k * fh - off < H + fh; k++) {
      const y = k * fh - off, idx = ((k + seed) % VIGNETTES.length + VIGNETTES.length) % VIGNETTES.length, col = VCOL[idx];
      ctx.fillStyle = '#000';
      for (let j = 0; j < 4; j++) { const hy = y + fh * (j + .3) / 4; roundRect(ctx, x + margin * .3, hy, margin * .42, fh * .1, 2); ctx.fill(); roundRect(ctx, x + w - margin * .72, hy, margin * .42, fh * .1, 2); ctx.fill(); }
      const fx = x + margin, fw = w - margin * 2, fy = y + fh * .07, fhh = fh * .86;
      const g = ctx.createLinearGradient(fx, fy, fx, fy + fhh); g.addColorStop(0, rgba(col, .16)); g.addColorStop(1, rgba(col, .05));
      ctx.fillStyle = g; ctx.fillRect(fx, fy, fw, fhh);
      ctx.strokeStyle = 'rgba(255,240,210,.06)'; ctx.strokeRect(fx + .5, fy + .5, fw - 1, fhh - 1);
      vignette(ctx, VIGNETTES[idx], fx, fy, fw, fhh, col, .55);
    }
    ctx.restore();
  }

  const bez = (p0, p1, p2, p3, s) => { const u = 1 - s; return [u * u * u * p0[0] + 3 * u * u * s * p1[0] + 3 * u * s * s * p2[0] + s * s * s * p3[0], u * u * u * p0[1] + 3 * u * u * s * p1[1] + 3 * u * s * s * p2[1] + s * s * s * p3[1]]; };
  const bezT = (p0, p1, p2, p3, s) => { const u = 1 - s; return [3 * u * u * (p1[0] - p0[0]) + 6 * u * s * (p2[0] - p1[0]) + 3 * s * s * (p3[0] - p2[0]), 3 * u * u * (p1[1] - p0[1]) + 6 * u * s * (p2[1] - p1[1]) + 3 * s * s * (p3[1] - p2[1])]; };

  let reelOff = 0, reelSpeed = 0;
  loopWhileVisible(hero, (dt, tt) => {
    const ctx = RC.ctx, W = RC.w, H = RC.h, since = performance.now() / 1000 - t0 - T_ON;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const fadeIn = RM ? 1 : span(since, -.3, 1.2);
    reelSpeed = lerp(reelSpeed, (RM ? 0 : 16 * span(since, .2, 3.5)) + Math.abs(vel) * 22, .06);
    reelOff += reelSpeed * dt;
    const scrollOff = scrollY * .35, flick = 1 + (Math.random() - .5) * .05;
    const lg = ctx.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.max(W, H) * .7); lg.addColorStop(0, `rgba(200,225,255,${.07 * fadeIn * flick})`); lg.addColorStop(1, 'rgba(200,225,255,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    const strips = W < 760 ? [[W * .12, 104, .9, .5, 0], [W * .88, 104, 1.15, .5, 5]] : [[W * .14, 150, .85, .5, 0], [W * .5, 250, 1, .1, 3], [W * .86, 150, 1.2, .5, 7]];
    strips.forEach(([x, w, sp, a, seed]) => drawStrip(ctx, H, x, w, reelOff * sp + scrollOff * sp, a * fadeIn, seed));

  });

  function heroScroll() {
    const p = clamp(scrollY / (hero.offsetHeight * .85), 0, 1);
    shade.style.opacity = (p * .96).toFixed(3);
    titles.style.opacity = (1 - p * 1.4).toFixed(3);
    titles.style.transform = `translateY(calc(-4vh - ${(p * 40).toFixed(1)}px))`;
  }
  addEventListener('scroll', heroScroll, { passive: true }); heroScroll();


  /* =========================================================
     2. THE NETWORK
     ========================================================= */
  const net = document.getElementById('net'), face = document.getElementById('netFace');
  const BG = fitCanvas(document.getElementById('netBg')), FG = fitCanvas(document.getElementById('netFg'));
  const beatEls = [...net.querySelectorAll('.beat')];
  const BEATS = [
    { lv: 0, i: 0, theme: 'intro', col: PAL.green },
    { lv: 1, i: 0, theme: 'computers', col: PAL.cyan, label: 'computers' },
    { lv: 1, i: 1, theme: 'creative', col: PAL.bronze, label: 'creative' },
    { lv: 1, i: 2, theme: 'sports', col: PAL.lime, label: 'puzzles' },
    { lv: 1, i: 3, theme: 'analytics', col: PAL.gold, label: 'analytics' },
    { lv: 2, i: 0, theme: 'language', col: PAL.pink, label: 'language' },
    { lv: 2, i: 1, theme: 'rigor', col: PAL.teal, label: 'rigour' },
    { lv: 2, i: 2, theme: 'delivery', col: PAL.blue, label: 'care' },
  ];
  let beat = 0;
  const weights = BEATS.map((_, k) => k === 0 ? 1 : 0);
  function netProgress() { const r = net.getBoundingClientRect(), range = net.offsetHeight - innerHeight; return clamp(-r.top / range, 0, .9999) * BEATS.length; }
  function onNetScroll() { const b = Math.floor(netProgress()); if (b !== beat) { beat = b; beatEls.forEach((el, k) => el.classList.toggle('on', k === beat)); } }
  beatEls[0].classList.add('on');
  addEventListener('scroll', onNetScroll, { passive: true });

  const geo = W => { const H = FG.h, rows = [Math.max(H * .14, 92), H * .43, H * .72];
    const xs = [[W / 2], [0, 1, 2, 3].map(i => W / 2 + (i - 1.5) * Math.min(W * .78, 720) / 3), [0, 1, 2].map(i => W / 2 + (i - 1) * Math.min(W * .6, 520) / 2)];
    return { rows, xs, rowY: rows[1] }; };
  function placeBeats() { const { rows } = geo(FG.w); beatEls.forEach((el, k) => { el.style.top = (rows[BEATS[k].lv] + (k === 0 ? 38 : 26)) + "px"; }); }
  placeBeats(); addEventListener('resize', () => setTimeout(placeBeats, 80));

  /* ---------- background themes ---------- */
  const TH = {
    intro(ctx, W, H, t, a, st) {
      if (!st.p) { const r = rng(3); st.p = [...Array(70)].map(() => [r(), r(), r()]); }
      st.p.forEach(([x, y, z]) => { const yy = ((y - t * .01 * (.3 + z)) % 1 + 1) % 1; ctx.fillStyle = rgba(PAL.green, (.05 + z * .14) * a); ctx.beginPath(); ctx.arc(x * W, yy * H, .6 + z * 1.4, 0, TAU); ctx.fill(); });
    },

    /* Uno cards being dealt, an old desktop typing away */
    computers(ctx, W, H, t, a) {
      const k = clamp(Math.min(W, H) / 900, .55, 1.1), cols = ['#e8574a', '#f5c518', '#36b37e', '#2f80ed'];
      const win = (x, y, w, h, seed, ph) => {
        ctx.strokeStyle = rgba(PAL.cyan, .2 * a); ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h); ctx.fillStyle = rgba(PAL.cyan, .06 * a); ctx.fillRect(x, y, w, 16 * k);
        for (let i = 0; i < 3; i++) { ctx.strokeStyle = rgba(PAL.cyan, .25 * a); ctx.strokeRect(x + w - (12 + i * 12) * k, y + 4 * k, 8 * k, 8 * k); }
        const r = rng(seed), lh = 12 * k, maxL = Math.floor((h - 24 * k) / lh), n = Math.min(maxL, Math.floor((t * .9 + ph) % 9));
        for (let i = 0; i < n; i++) { const ind = Math.floor(r() * 3) * 12 * k, len = 30 + r() * (w - 70 * k); ctx.fillStyle = rgba(i % 3 === 0 ? PAL.amber : PAL.green, .28 * a); ctx.fillRect(x + 10 * k + ind, y + 24 * k + i * lh, Math.min(len, w - 20 * k - ind), 4 * k); }
        if (Math.floor(t * 2) % 2) { ctx.fillStyle = rgba(PAL.green, .45 * a); ctx.fillRect(x + 10 * k, y + 24 * k + n * lh - 2, 6 * k, 8 * k); }
      };
      if (W > 900) { win(W * .025, H * .5, 200 * k, 130 * k, 5, 0); win(W * .975 - 190 * k, H * .52, 190 * k, 120 * k, 9, 4); }
      const T = 7, c = (t % T) / T, n = 9, deck = [W * .1, H * .9], cw = 34 * k, ch = 50 * k;
      for (let i = 0; i < n; i++) {
        const f = span(c, i * .06, i * .06 + .22), fade = 1 - span(c, .88, 1); if (!f) continue;
        const tx = W * (.2 + i * (.6 / (n - 1))), ty = H * .88 - Math.sin((i / (n - 1)) * Math.PI) * 26 * k;
        const x = lerp(deck[0], tx, f), y = lerp(deck[1], ty, f) - Math.sin(f * Math.PI) * 90 * k, rot = lerp(0, (i - (n - 1) / 2) * .08, f), flip = Math.cos(f * Math.PI);
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(Math.abs(flip) * .98 + .02, 1);
        roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 4 * k);
        if (flip > 0) { ctx.fillStyle = `rgba(16,16,20,${.8 * a * fade})`; ctx.fill(); ctx.strokeStyle = rgba('#e8574a', .45 * a * fade); ctx.stroke(); }
        else { ctx.fillStyle = rgba(cols[i % 4], .62 * a * fade); ctx.fill(); ctx.save(); ctx.rotate(-.5); ctx.fillStyle = `rgba(255,255,255,${(.45 * a * fade).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(0, 0, cw * .32, ch * .4, 0, 0, TAU); ctx.fill(); ctx.restore(); }
        ctx.restore();
      }
      const mx = W * (.5 + .32 * Math.sin(t * .37)), my = H * (.62 + .18 * Math.sin(t * .53 + 1));
      ctx.fillStyle = `rgba(240,240,240,${.4 * a})`; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my + 16 * k); ctx.lineTo(mx + 4 * k, my + 12 * k); ctx.lineTo(mx + 8 * k, my + 18 * k); ctx.lineTo(mx + 10 * k, my + 17 * k); ctx.lineTo(mx + 6 * k, my + 11 * k); ctx.lineTo(mx + 11 * k, my + 11 * k); ctx.closePath(); ctx.fill();
      const cl = (t * .7) % 1; if (cl < .3) { ctx.strokeStyle = rgba(PAL.cyan, (.4 - cl) * a); ctx.beginPath(); ctx.arc(mx, my, cl * 60, 0, TAU); ctx.stroke(); }
    },

    /* six bronze strings and, quietly, a keyboard */
    creative(ctx, W, H, t, a, st) {
      st.amp = st.amp || [0, 0, 0, 0, 0, 0]; st.last = st.last || 0;
      if (t - st.last > 1.3 || t < st.last) { st.last = t; st.amp[Math.floor(Math.random() * 6)] += 7; }
      const gap = Math.min(18, H * .022), y0 = H * .785, BR = ['#e3b07a', '#d39c62', '#c98a4b', '#b8773a', '#a8692f', '#9a5d28'];
      for (let i = 0; i < 6; i++) {
        st.amp[i] = Math.min(gap * .9, st.amp[i] * Math.exp(-(1 / 60) * (1.4 + i * .25)) + Math.abs(vel) * (.04 + (5 - i) * .01));
        const y = y0 + i * gap, A = st.amp[i] + .25, freq = 18 + (5 - i) * 7, thick = .8 + (5 - i) * .42;
        const draw = () => { ctx.beginPath(); for (let x = 0; x <= W; x += 6) { const s = Math.sin(Math.PI * x / W), yy = y + A * s * Math.sin(t * freq + i) + A * .3 * Math.sin(TAU * x / W) * Math.sin(t * freq * 2.1); x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); };
        ctx.strokeStyle = rgba(BR[i], (.07 + Math.min(.1, st.amp[i] / 60)) * a); ctx.lineWidth = thick + 5; draw();
        ctx.strokeStyle = rgba(BR[i], (.28 + Math.min(.2, st.amp[i] / 50)) * a); ctx.lineWidth = thick; draw();
      }
      const kh = Math.min(H * .07, 60), ky = H - kh - 4, nW = Math.max(21, Math.round(W / 40)), kw = W / nW;
      const seq = [0, 2, 4, 7, 9, 7, 4, 2, 5, 9, 12, 9], step = Math.floor(t * 3.2), lit = new Map(), base = 7 * Math.floor(nW / 14);
      for (let j = 0; j < 4; j++) { const s = seq[((step - j) % seq.length + seq.length) % seq.length] + base; lit.set(s, Math.max(lit.get(s) || 0, 1 - j * .3 - (t * 3.2 % 1) * .3)); }
      for (let i = 0; i < nW; i++) { ctx.strokeStyle = `rgba(240,230,210,${.07 * a})`; ctx.strokeRect(i * kw + .5, ky, kw - 1, kh); const l = lit.get(i); if (l) { ctx.fillStyle = rgba(PAL.amber, .14 * l * a); ctx.fillRect(i * kw + 1, ky + 1, kw - 2, kh - 2); } }
      for (let i = 0; i < nW - 1; i++) { if ([2, 6].includes(i % 7)) continue; ctx.fillStyle = `rgba(0,0,0,${.6 * a})`; ctx.fillRect((i + 1) * kw - kw * .3, ky, kw * .6, kh * .6); ctx.strokeStyle = `rgba(240,230,210,${.05 * a})`; ctx.strokeRect((i + 1) * kw - kw * .3, ky, kw * .6, kh * .6); }
      [[.08, .3, PAL.pink], [.92, .22, PAL.cyan]].forEach(([x, y, c], i) => { const r = Math.min(W, H) * (.16 + .02 * Math.sin(t * .4 + i)), g = ctx.createRadialGradient(W * x, H * y, 0, W * x, H * y, r); g.addColorStop(0, rgba(c, .1 * a)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W * x, H * y, r, 0, TAU); ctx.fill(); });
    },

    /* sports: no background — the line carries it */
    sports() {},

    /* a night sky; a whole army of chess pieces mid-leap, panned like one wide splash page */
    analytics(ctx, W, H, t, a, st) {
      if (!st.s) {
        const r = rng(19); st.s = [...Array(170)].map(() => [r(), r() * .8, r(), r() * 6]);
        const glyphs = ['♚', '♛', '♜', '♝', '♞', '♟', '♟', '♞', '♜', '♝', '♛', '♟', '♞', '♟', '♜', '♝'];
        st.pc = glyphs.map((g, i) => ({ g, white: i % 2 === 0, x: i / glyphs.length + (r() - .5) * .04, y: .5 + r() * .34, z: .35 + r() * .65, rot: (r() - .5) * .9, ph: r() * 6 }));
        st.pc.sort((p, q) => p.z - q.z);
        st.deb = [...Array(40)].map(() => [r(), .45 + r() * .45, r() * 6, .3 + r()]);
      }
      st.s.forEach(([x, y, z, ph]) => { ctx.fillStyle = `rgba(225,232,255,${((.06 + z * .2) * (.6 + .4 * Math.sin(t * (1 + z) + ph)) * a).toFixed(3)})`; ctx.fillRect(x * W, y * H, z > .85 ? 1.8 : 1, z > .85 ? 1.8 : 1); });
      const cons = [[.08, .14], [.15, .1], [.22, .16], [.27, .11], [.2, .24]]; ctx.strokeStyle = `rgba(200,215,255,${.1 * a})`; ctx.beginPath(); cons.forEach(([x, y], i) => i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)); ctx.stroke(); cons.forEach(([x, y]) => { ctx.fillStyle = `rgba(230,236,255,${.4 * a})`; ctx.beginPath(); ctx.arc(x * W, y * H, 1.6, 0, TAU); ctx.fill(); });
      const px = W * .86, py = H * .18, pr = Math.min(W, H) * .04; ctx.fillStyle = rgba(PAL.violet, .12 * a); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba(PAL.violet, .18 * a); ctx.beginPath(); ctx.ellipse(px, py, pr * 2.1, pr * .55, -.3, 0, TAU); ctx.stroke();
      const wide = W * 1.7, off = (t * 16) % wide, base = Math.min(W, H);
      st.deb.forEach(([x, y, ph, z]) => { const xx = ((x * wide - off * z) % wide + wide) % wide - W * .35, yy = y * H + Math.sin(t * .5 + ph) * 8; ctx.save(); ctx.translate(xx, yy); ctx.rotate(t * .3 * z + ph); ctx.fillStyle = rgba(PAL.gold, .1 * a); ctx.fillRect(-4 * z, -4 * z, 8 * z, 8 * z); ctx.restore(); });
      st.pc.forEach(p => {
        const xx = ((p.x * wide - off * (.6 + p.z * .6)) % wide + wide) % wide - W * .35, yy = p.y * H + Math.sin(t * .45 + p.ph) * 12 * p.z, sz = base * (.05 + p.z * .09), rot = p.rot + Math.sin(t * .3 + p.ph) * .06;
        ctx.strokeStyle = rgba(PAL.paper, .07 * a * p.z); for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(xx - sz * .5, yy - sz * .3 + j * sz * .25); ctx.lineTo(xx - sz * (1.4 + j * .3), yy - sz * .3 + j * sz * .25 + sz * .1); ctx.stroke(); }
        ctx.save(); ctx.translate(xx, yy); ctx.rotate(rot); ctx.font = `${sz}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (p.white) { ctx.fillStyle = `rgba(240,230,210,${(.1 + p.z * .14) * a})`; ctx.fillText(p.g, 0, 0); }
        else { ctx.fillStyle = `rgba(6,7,10,${.85 * a})`; ctx.fillText(p.g, 0, 0); ctx.strokeStyle = rgba(PAL.gold, (.1 + p.z * .16) * a); ctx.lineWidth = 1; ctx.strokeText(p.g, 0, 0); }
        ctx.restore();
      });
    },

    /* comments as points, settling into what they meant */
    language(ctx, W, H, t, a, st) {
      if (!st.p) { const r = rng(6), g = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }; st.p = [...Array(150)].map((_, i) => ({ c: i % 3, sx: r(), sy: .35 + r() * .6, gx: g(), gy: g() })); }
      const C = [[.18, .72, PAL.green], [.5, .84, PAL.cyan], [.82, .72, PAL.rose]], T = 8, c = (t % T) / T, g = span(c, .12, .5) * (1 - span(c, .82, 1)), R = Math.min(W, H) * .07;
      const pos = p => [lerp(p.sx * W, C[p.c][0] * W + p.gx * R, g), lerp(p.sy * H, C[p.c][1] * H + p.gy * R * .6, g)];
      ctx.lineWidth = 1;
      for (let i = 0; i < st.p.length; i += 3) { const p = st.p[i], q = st.p[(i + 9) % st.p.length]; if (p.c !== q.c) continue; const [x1, y1] = pos(p), [x2, y2] = pos(q); ctx.strokeStyle = rgba(C[p.c][2], .08 * g * a); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - 30, x2, y2); ctx.stroke(); }
      st.p.forEach(p => { const [x, y] = pos(p); ctx.fillStyle = g > .3 ? rgba(C[p.c][2], (.2 + .35 * g) * a) : `rgba(200,205,215,${.25 * a})`; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); });
    },

    /* a small forest of decision trees growing from the floor */
    rigor(ctx, W, H, t, a) {
      const T = 8, g = clamp(((t % T) / T) * 2.8, 0, 1) * (1 - span((t % T) / T, .9, 1)), depth = 5;
      const trees = W > 700 ? [.08, .22, .78, .92, .36, .64] : [.12, .5, .88];
      trees.forEach((x0, ti) => {
        const r = rng(ti * 13 + 5), len = Math.min(H * .12, 90) * (.8 + r() * .3), gg = clamp(g * 1.15 - ti * .04, 0, 1) * depth;
        const br = (x, y, l, ang, d) => { if (d >= gg) return; const f = clamp(gg - d, 0, 1), x2 = x + Math.cos(ang) * l * f, y2 = y + Math.sin(ang) * l * f; ctx.strokeStyle = rgba(PAL.teal, (.32 - d * .04) * a); ctx.lineWidth = Math.max(.6, 2.4 - d * .4); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
          if (f < 1) return; if (d === depth - 1) { ctx.fillStyle = rgba(r() < .55 ? PAL.green : PAL.rose, .45 * a); ctx.beginPath(); ctx.arc(x2, y2, 2.6, 0, TAU); ctx.fill(); return; }
          const sp = .32 + r() * .3; br(x2, y2, l * .72, ang - sp, d + 1); br(x2, y2, l * .72, ang + sp, d + 1); };
        br(W * x0, H * .98, len, -Math.PI / 2, 0);
      });
    },

    /* the paper's pages turning into packets, into a cloud, out to readers */
    delivery(ctx, W, H, t, a) {
      const k = clamp(Math.min(W, H) / 900, .6, 1.1), page = [W * (W > 700 ? .1 : .1), H * .62], cl = [W * (W > 700 ? .86 : .84), H * .5];
      const pw = 90 * k, ph = 120 * k; ctx.strokeStyle = `rgba(240,232,214,${.18 * a})`; ctx.strokeRect(page[0] - pw / 2, page[1] - ph / 2, pw, ph);
      ctx.fillStyle = `rgba(240,232,214,${.1 * a})`; ctx.fillRect(page[0] - pw / 2 + 8 * k, page[1] - ph / 2 + 8 * k, pw - 16 * k, 12 * k);
      for (let c = 0; c < 3; c++) for (let i = 0; i < 7; i++) ctx.fillRect(page[0] - pw / 2 + 8 * k + c * (pw - 16 * k) / 3, page[1] - ph / 2 + 28 * k + i * 12 * k, (pw - 16 * k) / 3 - 4 * k, 4 * k);
      const R = 34 * k; ctx.strokeStyle = rgba(PAL.blue, .35 * a); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cl[0] - R * .9, cl[1] + R * .1, R * .7, Math.PI * .5, Math.PI * 1.5); ctx.arc(cl[0], cl[1] - R * .4, R, Math.PI, 0); ctx.arc(cl[0] + R * .9, cl[1] + R * .1, R * .7, Math.PI * 1.5, Math.PI * .5); ctx.closePath(); ctx.stroke(); ctx.lineWidth = 1;
      const c1 = [W * .35, H * .2], c2 = [W * .65, H * .25];
      for (let i = 0; i < 16; i++) { const u = (t * .18 + i / 16) % 1, [x, y] = bez(page, c1, c2, cl, u); ctx.fillStyle = rgba(PAL.cyan, .4 * a * Math.sin(Math.PI * u)); ctx.fillRect(x - 3, y - 3, 6, 6); }
      for (let i = 0; i < 26; i++) { const u = (t * .22 + i / 26) % 1, tx = W * (.15 + (i * .37 % 1) * .7), [x, y] = bez(cl, [cl[0], H * .8], [tx, H * .7], [tx, H * .97], u); ctx.fillStyle = rgba(PAL.green, .45 * a * Math.sin(Math.PI * u)); ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); }
      const T = 9, f = span((t % T) / T, .05, .7); const line = (y0, y1, col) => { ctx.strokeStyle = rgba(col, .3 * a); ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 40 * f; i++) { const u = i / 40, x = W * (.06 + u * .88), y = lerp(y0, y1, ease(u)) + Math.sin(u * 17) * 4; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.lineWidth = 1; };
      line(H * .9, H * .96, PAL.amber); line(H * .97, H * .88, PAL.green);
    },
  };
  const tstate = BEATS.map(() => ({}));

  loopWhileVisible(net, (dt, t) => {
    const W = BG.w, H = BG.h, g = geo(W), b = BEATS[beat];
    BEATS.forEach((_, k) => { weights[k] = lerp(weights[k], k === beat ? 1 : 0, RM ? 1 : .07); });
    const ctx = BG.ctx; ctx.clearRect(0, 0, W, H);
    BEATS.forEach((bb, k) => { const st = tstate[k]; if (weights[k] < .02 && k !== beat) { st.start = null; return; } if (st.start == null) st.start = t; ctx.save(); TH[bb.theme](ctx, W, H, t - st.start + (bb.theme === 'rigor' ? 0 : 2), weights[k], st); ctx.restore(); });
    const vy = g.rows[b.lv] + 70, veil = ctx.createRadialGradient(W / 2, vy, 0, W / 2, vy, Math.max(300, W * .36)); veil.addColorStop(0, 'rgba(4,5,7,.72)'); veil.addColorStop(1, 'rgba(4,5,7,0)');
    ctx.fillStyle = veil; ctx.fillRect(0, 0, W, H);
    const edge = ctx.createLinearGradient(0, 0, 0, H); edge.addColorStop(0, 'rgba(4,5,7,.9)'); edge.addColorStop(.12, 'rgba(4,5,7,0)'); ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H);

    const f = FG.ctx; f.clearRect(0, 0, W, H);
    const Y = lv => g.rows[lv];
    const rowA = lv => lv <= b.lv ? 1 : .55;
    const nodeK = (lv, i) => BEATS.findIndex(x => x.lv === lv && x.i === i);
    for (let lv = 0; lv < 2; lv++) {
      g.xs[lv].forEach((x1, i) => g.xs[lv + 1].forEach((x2, j) => {
        const kTo = nodeK(lv + 1, j), live = kTo === beat, done = kTo < beat;
        const y1 = Y(lv), y2 = Y(lv + 1), w = .5 + ((i * 7 + j * 3) % 5) * .25; f.globalAlpha = Math.min(rowA(lv), rowA(lv + 1)); if (f.globalAlpha < .01) return;
        f.strokeStyle = live ? rgba(BEATS[kTo].col, .38) : `rgba(200,210,225,${done ? .1 : .055})`; f.lineWidth = live ? w + .4 : w;
        f.beginPath(); f.moveTo(x1, y1); f.bezierCurveTo(x1, (y1 + y2) / 2, x2, (y1 + y2) / 2, x2, y2); f.stroke();
        if (live && !RM) for (let q = 0; q < 2; q++) { const u = (t * .7 + q * .5 + i * .13) % 1, [px, py] = bez([x1, y1], [x1, (y1 + y2) / 2], [x2, (y1 + y2) / 2], [x2, y2], u); f.fillStyle = rgba(BEATS[kTo].col, .9 * Math.sin(Math.PI * u)); f.beginPath(); f.arc(px, py, 2.2, 0, TAU); f.fill(); }
      }));
    }
    BEATS.forEach((bb, k) => {
      if (bb.lv === 0) return;
      const x = g.xs[bb.lv][bb.i], y = Y(bb.lv), act = k === beat, past = k < beat;
      if (y < -40 || y > H + 40) return; f.globalAlpha = rowA(bb.lv); if (f.globalAlpha < .01) return;
      if (act) { const gl = f.createRadialGradient(x, y, 0, x, y, 40); gl.addColorStop(0, rgba(bb.col, .4)); gl.addColorStop(1, rgba(bb.col, 0)); f.fillStyle = gl; f.beginPath(); f.arc(x, y, 40, 0, TAU); f.fill(); }
      f.beginPath(); f.arc(x, y, act ? 12 : 7.5, 0, TAU);
      if (act) { f.fillStyle = bb.col; f.fill(); } else if (past) { f.fillStyle = rgba(bb.col, .45); f.fill(); } else { f.fillStyle = '#06080c'; f.fill(); f.strokeStyle = 'rgba(220,228,240,.28)'; f.lineWidth = 1.2; f.stroke(); }
      f.font = `${act ? 600 : 400} 10.5px JetBrains Mono, monospace`; f.textAlign = 'center'; f.fillStyle = act ? bb.col : 'rgba(150,160,178,.6)';
      f.fillText(bb.label, x, y - 20);
    });
    f.globalAlpha = 1;
    const fy = Y(0), fs = beat === 0 ? 72 : 52, fa = 1;
    face.style.width = face.style.height = fs + 'px';
    face.style.transform = `translate(${(W / 2 - fs / 2).toFixed(1)}px, ${(fy - fs / 2).toFixed(1)}px)`; face.style.opacity = fa.toFixed(3);
    face.style.borderColor = beat === 0 ? 'rgba(124,255,178,.6)' : 'rgba(124,255,178,.25)';
  });

  /* =========================================================
     THE HERO — one character, drawn as a poster silhouette (heroic proportions, no detail inside).
     He hovers by the content, reacts to the scroll (dives when you scroll down, rises when you scroll up),
     flies over to knock on the glass if you linger, and at the end salutes and points at the banner.
     He only ever goes where there's empty space.
     ========================================================= */
  const CP = fitCanvas(document.getElementById('companion'));
  const GL = fitCanvas(document.getElementById('glass'));
  const stage = net.querySelector('.net-stage');
  const DPRH = Math.min(devicePixelRatio || 1, 2);

  /* ---------- shape helpers (units: about 200 tall) ---------- */
  function smooth(c, P) { const n = P.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let s = m(P[n - 1], P[0]); c.moveTo(s[0], s[1]); for (let i = 0; i < n; i++) { const q = m(P[i], P[(i + 1) % n]); c.quadraticCurveTo(P[i][0], P[i][1], q[0], q[1]); } c.closePath(); }
  function blob(c, P) { c.beginPath(); smooth(c, P); c.fill(); }
  function dot(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  function oval(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill(); }
  // a limb: tapered, with a bulge on either side ([t, left, right] half-widths)
  function limb(c, x, y, ang, L, prof) {
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, A = [], B = [];
    for (const [t, l, r] of prof) { const px = x + ux * L * t, py = y + uy * L * t; A.push([px + nx * l, py + ny * l]); B.push([px - nx * r, py - ny * r]); }
    const first = prof[0], last = prof[prof.length - 1]; c.beginPath(); smooth(c, [[x - ux * first[1] * .6, y - uy * first[1] * .6], ...A, [x + ux * (L + last[1] * .7), y + uy * (L + last[1] * .7)], ...B.reverse()]); c.fill();
    return [x + ux * L, y + uy * L];
  }
  const UPPER = [[0, 8.2, 8.2], [.18, 8.6, 7.6], [.5, 7.6, 6.4], [.85, 5.7, 5.2], [1, 5.1, 4.8]];
  const FORE = [[0, 5.2, 5.2], [.2, 6.3, 5.6], [.55, 4.9, 4.4], [1, 3.6, 3.4]];
  const THIGH = [[0, 10.8, 10.6], [.25, 10.4, 9.6], [.62, 8.3, 7.8], [.92, 6.4, 6.0], [1, 6.0, 5.8]];
  const SHIN = [[0, 6.0, 6.0], [.22, 6.8, 6.0], [.5, 5.4, 4.8], [.85, 4.0, 3.7], [1, 3.6, 3.4]];
  const BOOT = [[0, 3.8, 3.8], [.55, 3.5, 3.2], [1, 1.9, 1.5]];
  function ik(sx, sy, tx, ty, a, b, bendSign) { // two-bone reach: returns the elbow
    let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy); const dd = clamp(d, Math.abs(a - b) + .01, a + b - .01);
    const base = Math.atan2(dy, dx), k = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1)), an = base + bendSign * k;
    return [sx + Math.cos(an) * a, sy + Math.sin(an) * a];
  }

  /* ---------- facing us, hovering: origin at the hips, head up (−y), toes down ---------- */
  function front(c, P) {
    const { L = 'hip', R = 'hip', knock = 0, wave = 0, aim = null, look = 0, t = 0 } = P;
    const sway = Math.sin(t * 1.7) * .04;
    // legs dangle, toes pointed: that's what says "flying"
    const legs = [[-1, Math.PI / 2 + .07 + sway, .0, 1], [1, Math.PI / 2 - .05 + sway, .16, .86]];
    for (const [sd, th, bend, fs] of legs) { const k = limb(c, sd * 9.5, -2, th, 45, THIGH); const a = limb(c, k[0], k[1], th - sd * .02 + bend * sd * -.2, 43 * fs, SHIN); limb(c, a[0], a[1], th + sd * .05, 13, BOOT); }
    // torso: big chest, lats, narrow waist
    blob(c, [[-8, -71], [-18, -67], [-26, -62.5], [-28.5, -55], [-27.5, -46], [-24.5, -37], [-19.5, -27], [-15.8, -17], [-15.2, -9], [-17, -3], [-12.5, 2.5], [-4, 4.5], [4, 4.5], [12.5, 2.5], [17, -3], [15.2, -9], [15.8, -17], [19.5, -27], [24.5, -37], [27.5, -46], [28.5, -55], [26, -62.5], [18, -67], [8, -71]]);
    oval(c, -25.5, -57.5, 8.6, 8.8, -.2); oval(c, 25.5, -57.5, 8.6, 8.8, .2);
    c.beginPath(); c.moveTo(-7, -77); c.lineTo(7, -77); c.lineTo(10, -65); c.lineTo(-10, -65); c.closePath(); c.fill();
    // head: square jaw, a little hair, turned a touch toward the cursor
    const hx = look * 2.2;
    blob(c, [[hx - 9.6, -90], [hx - 9.2, -97.5], [hx - 4, -101], [hx + 4.5, -101.5], [hx + 9.4, -97.5], [hx + 9.8, -90], [hx + 9.7, -83], [hx + 8.2, -76.5], [hx + 4.2, -72.6], [hx, -72], [hx - 4.2, -72.6], [hx - 8.2, -76.5], [hx - 9.7, -83]]);
    oval(c, hx - 10.2, -85, 2, 3.4); oval(c, hx + 10.2, -85, 2, 3.4);
    // arms
    const arm = (sd, mode) => {
      const sx = sd * 25.5, sy = -57; let tx, ty, fist = 1, flat = false, finger = null;
      if (mode === 'hip') { tx = sd * 17; ty = -13; }
      else if (mode === 'side') { tx = sd * 31; ty = -8; }
      else if (mode === 'knock') { tx = sd * 19; ty = -70 - knock * 4; fist = 1 + knock * .9; }
      else if (mode === 'wave') { tx = sd * (33 + wave * 6); ty = -104; flat = true; }
      else if (mode === 'salute') { tx = sd * 11; ty = -93; flat = true; }
      else if (mode === 'point') { const n = Math.hypot(aim[0], aim[1]) || 1; tx = sx + aim[0] / n * 57; ty = sy + aim[1] / n * 57; finger = [aim[0] / n, aim[1] / n]; }
      const out = mode === 'salute' || mode === 'wave' ? -1 : 1, e = ik(sx, sy, tx, ty, 31, 28, (sd > 0 ? -1 : 1) * out * (mode === 'point' ? .0001 : 1));
      const ua = Math.atan2(e[1] - sy, e[0] - sx), fa = Math.atan2(ty - e[1], tx - e[0]);
      limb(c, sx, sy, ua, 31, UPPER); const w = limb(c, e[0], e[1], fa, 28, FORE);
      if (flat) { oval(c, w[0] + Math.cos(fa) * 5, w[1] + Math.sin(fa) * 5, 7, 2.9, fa); }
      else if (finger) { oval(c, w[0] + Math.cos(fa) * 3.5, w[1] + Math.sin(fa) * 3.5, 4.8, 4.2, fa); limb(c, w[0] + finger[0] * 6, w[1] + finger[1] * 6, fa, 7, [[0, 1.6, 1.6], [1, 1.2, 1.2]]); }
      else oval(c, w[0] + Math.cos(fa) * 3.6 * fist, w[1] + Math.sin(fa) * 3.6 * fist, 4.9 * fist, 5.6 * fist, fa);
      return [w[0] + Math.cos(fa) * 4 * fist, w[1] + Math.sin(fa) * 4 * fist];
    };
    const hl = arm(-1, L), hr = arm(1, R); return { hl, hr };
  }

  /* ---------- side view: origin at the hips; the body axis points along +x, the chest faces +y ---------- */
  const POSE = {
    hover: { aF: Math.PI - .1, bF: .2, aB: Math.PI + .05, bB: .12, lF: Math.PI - .03, kF: .1, lB: Math.PI + .02, kB: .32, face: Math.PI / 2 - .15 },
    fly: { aF: .1, bF: 0, aB: Math.PI - .32, bB: .12, lF: Math.PI - .02, kF: .06, lB: Math.PI + .05, kB: .5, face: .45 },
    dive: { aF: .08, bF: 0, aB: .16, bB: 0, lF: Math.PI - .01, kF: .03, lB: Math.PI + .03, kB: .22, face: .25 },
  };
  const mixPose = (A, B, k) => { const o = {}; for (const key in A) o[key] = lerp(A[key], B[key], k); return o; };
  function side(c, P) {
    // far limbs first (they merge into the silhouette anyway)
    const leg = (th, bend) => { const k = limb(c, 0, 1.5, th, 45, THIGH), a = limb(c, k[0], k[1], th + bend, 43, SHIN); limb(c, a[0], a[1], th + bend - .32, 13, BOOT); };
    const arm = (a, b) => { const e = limb(c, 52, 1, a, 31, UPPER), w = limb(c, e[0], e[1], a - b, 28, FORE); oval(c, w[0] + Math.cos(a - b) * 3.6, w[1] + Math.sin(a - b) * 3.6, 5, 5.6, a - b); };
    leg(P.lB, P.kB); arm(P.aB, P.bB);
    blob(c, [[-10, -1], [-7, -9.5], [3, -11], [18, -10], [33, -11.5], [46, -12.2], [56, -9.5], [62, -5], [63, 4], [57, 11.5], [48, 15.8], [38, 15], [28, 10.5], [18, 8.8], [8, 10], [-2, 10], [-9, 6]]);
    c.beginPath(); c.moveTo(57, -8.5); c.lineTo(68, -7); c.lineTo(68, 4); c.lineTo(57, 6); c.closePath(); c.fill();
    const fa = P.face, f = [Math.cos(fa), Math.sin(fa)], d = [-f[1], f[0]], hx = 76.5, hy = 0;
    oval(c, hx, hy, 11, 10.2, fa);
    oval(c, hx + f[0] * 5.5 - d[0] * 4.5, hy + f[1] * 5.5 - d[1] * 4.5, 5.6, 5.2, fa);
    oval(c, hx + f[0] * 9.6 + d[0] * 1.5, hy + f[1] * 9.6 + d[1] * 1.5, 2.2, 2.6, fa);
    oval(c, hx - f[0] * 2 + d[0] * 3, hy - f[1] * 2 + d[1] * 3, 10.2, 8.2, fa);
    leg(P.lF, P.kF); arm(P.aF, P.bF);
    // suit seams, cut out of the silhouette so they glow with the outline colour
    c.save(); c.globalCompositeOperation = 'destination-out'; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath();
    c.moveTo(58, 9); c.lineTo(44, 3); c.lineTo(30, 4);      // chest to waist
    c.moveTo(4, -7); c.lineTo(4, 7);                         // belt
    c.stroke(); c.restore();
  }

  /* ---------- painting the silhouette: one solid shape, lit from above, rim-lit from behind ---------- */
  const bufs = [0, 1, 2].map(() => document.createElement('canvas'));
  function paint(c, x, y, s, rot, flip, sq, a, drawFn, glow = 1) {
    if (a <= .01) return null;
    const B = Math.ceil(250 * s), px = Math.ceil(B * DPRH);
    bufs.forEach(b => { if (b.width !== px) { b.width = b.height = px; } });
    const [sil, sh, edge] = bufs.map(b => b.getContext('2d'));
    let out = null;
    sil.setTransform(1, 0, 0, 1, 0, 0); sil.clearRect(0, 0, px, px); sil.setTransform(DPRH, 0, 0, DPRH, 0, 0);
    sil.translate(B / 2, B / 2); sil.rotate(rot); sil.scale(s * sq * (flip ? -1 : 1), s); sil.fillStyle = '#fff'; out = drawFn(sil);
    // volume: a dark suit lit from the upper left, falling into shadow (reads as a rounded, 3D body)
    sh.setTransform(1, 0, 0, 1, 0, 0); sh.globalCompositeOperation = 'source-over'; sh.clearRect(0, 0, px, px); sh.drawImage(bufs[0], 0, 0);
    sh.globalCompositeOperation = 'source-in'; const g = sh.createLinearGradient(px * .2, px * .15, px * .75, px * .85); g.addColorStop(0, '#22364f'); g.addColorStop(.4, '#0d1726'); g.addColorStop(1, '#03060b'); sh.fillStyle = g; sh.fillRect(0, 0, px, px);
    // a soft specular sheen where the light hits
    const rg = sh.createRadialGradient(px * .4, px * .38, 0, px * .4, px * .38, px * .32); rg.addColorStop(0, 'rgba(120,200,255,.22)'); rg.addColorStop(1, 'rgba(120,200,255,0)'); sh.globalCompositeOperation = 'source-atop'; sh.fillStyle = rg; sh.fillRect(0, 0, px, px);
    // inner light line on the lit side: the edge minus itself shifted down-right
    edge.setTransform(1, 0, 0, 1, 0, 0); edge.globalCompositeOperation = 'source-over'; edge.clearRect(0, 0, px, px); edge.drawImage(bufs[0], 0, 0);
    edge.globalCompositeOperation = 'destination-out'; edge.drawImage(bufs[0], 1.4 * DPRH, 1.8 * DPRH);
    edge.globalCompositeOperation = 'source-in'; edge.fillStyle = 'rgba(160,240,255,.9)'; edge.fillRect(0, 0, px, px);
    sh.globalCompositeOperation = 'source-atop'; sh.drawImage(bufs[2], 0, 0);
    // a darker core-shadow line on the far side, for depth
    edge.globalCompositeOperation = 'source-over'; edge.clearRect(0, 0, px, px); edge.drawImage(bufs[0], 0, 0);
    edge.globalCompositeOperation = 'destination-out'; edge.drawImage(bufs[0], -2.2 * DPRH, -2.6 * DPRH);
    edge.globalCompositeOperation = 'source-in'; edge.fillStyle = 'rgba(0,0,0,.55)'; edge.fillRect(0, 0, px, px);
    sh.drawImage(bufs[2], 0, 0);
    // the Tron outline: the whole silhouette in cyan, drawn as a thin glowing ring around the body
    edge.globalCompositeOperation = 'source-over'; edge.clearRect(0, 0, px, px); edge.drawImage(bufs[0], 0, 0); edge.globalCompositeOperation = 'source-in'; edge.fillStyle = '#6ff3ff'; edge.fillRect(0, 0, px, px);
    c.save(); c.globalAlpha = a; const X = x - B / 2, Y = y - B / 2;
    if (glow) { c.shadowColor = 'rgba(80,235,255,.85)'; c.shadowBlur = 9 * glow; c.drawImage(bufs[2], X, Y, B, B); c.shadowBlur = 0; }
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]]) c.drawImage(bufs[2], X + ox, Y + oy, B, B);
    c.drawImage(bufs[1], X, Y, B, B); c.restore();
    if (out) { const tf = (p) => { const lx = p[0] * s * sq * (flip ? -1 : 1), ly = p[1] * s, cr = Math.cos(rot), sr = Math.sin(rot); return [x + lx * cr - ly * sr, y + lx * sr + ly * cr]; }; return { hl: tf(out.hl), hr: tf(out.hr) }; }
    return null;
  }
  function trail(c, x, y, ang, s, k, t) { // speed lines behind him
    if (k < .15) return; c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (let i = 0; i < 7; i++) { const off = (i - 3) * 9 * s, ph = ((t * 2.4 + i * .37) % 1), L = (60 + 80 * k) * s, st = (100 + ph * 140) * s;
      const bx = x - Math.cos(ang) * st - Math.sin(ang) * off, by = y - Math.sin(ang) * st + Math.cos(ang) * off;
      c.strokeStyle = `rgba(190,240,255,${(.28 * k * (1 - ph)).toFixed(3)})`; c.lineWidth = 1.2; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - Math.cos(ang) * L, by - Math.sin(ang) * L); c.stroke(); }
    c.restore();
  }

  /* ---------- where things are on screen, so he never sits on them ---------- */
  let obsFrame = -1, obsCache = null, frameNo = 0; // measured once per frame, not once per caller
  function obstacles() {
    if (obsFrame === frameNo && obsCache) return obsCache; obsFrame = frameNo;
    const out = obsCache = [], vis = el => { const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) return; if (+getComputedStyle(el).opacity < .15) return; out.push(r); };
    ['.nav', '.mv-title', '.beat.on', '#netFace', '.credits .tbc', '.credits .edu-line', '.credits .roll-cta > *', '.credits .contact-row > *', 'footer .wrap > *'].forEach(q => document.querySelectorAll(q).forEach(vis));
    const sr = stage.getBoundingClientRect();
    if (sr.bottom > 0 && sr.top < innerHeight) { const g = geo(FG.w); g.rows.forEach((y, lv) => { const xs = g.xs[lv]; out.push({ left: Math.min(...xs) - 52, right: Math.max(...xs) + 52, top: sr.top + y - 36, bottom: sr.top + y + 18 }); }); }
    return out;
  }
  const hits = (r, obs, pad = 14) => obs.some(o => r.left < o.right + pad && r.right > o.left - pad && r.top < o.bottom + pad && r.bottom > o.top - pad);
  const inView = r => r.left >= 6 && r.top >= 64 && r.right <= innerWidth - 6 && r.bottom <= innerHeight - 4;
  const heroScale = () => clamp(Math.min(innerWidth, innerHeight) / 1000, .5, .82) * .52 * .3; // he's small; his balloon and the cracks keep their size
  const HS = .3;
  const frontRect = (x, y, s) => ({ left: x - 46 * s, right: x + 46 * s, top: y - 106 * s, bottom: y + 100 * s });
  function freeSpots(s, prefer) { // candidate hover points with nothing underneath, best first
    const W = innerWidth, H = innerHeight, obs = obstacles(), out = [];
    const xs = [W - 88 * s, 88 * s, W - 150 * s, 150 * s, W * .82, W * .18], ys = [H * .55, H * .42, H * .68, H * .3, H * .8];
    for (const y of ys) for (const x of xs) { const r = frontRect(x, y, s); if (inView(r) && !hits(r, obs)) out.push({ x, y, d: prefer ? Math.hypot(x - prefer[0], y - prefer[1]) : 0 }); }
    return out.sort((a, b) => a.d - b.d);
  }
  function knockSpot() {
    const s = heroScale(), W = innerWidth, obs = obstacles(), bw = Math.min(300 * s / HS * 1.15, W - 24), bh = 100 * s / HS * 1.15;
    for (const sp of freeSpots(s)) {
      const fr = frontRect(sp.x, sp.y, s), right = sp.x > W / 2;
      const opts = [right ? { left: fr.left - bw - 6, top: fr.top - 10 } : { left: fr.right + 6, top: fr.top - 10 }, { left: clamp(sp.x - bw / 2, 8, W - bw - 8), top: fr.top - bh - 12 }];
      for (const o of opts) { const br = { left: o.left, top: o.top, right: o.left + bw, bottom: o.top + bh }; if (inView(br) && !hits(br, obs) && !hits(br, [fr], 2)) return { x: sp.x, y: sp.y, s, side: right ? 1 : -1, balloon: br }; }
    }
    return null;
  }
  function finaleSpot() {
    const s = heroScale(), tb = document.querySelector('.credits .tbc'); if (!tb) return null;
    const B = tb.getBoundingClientRect(), obs = obstacles(), cy = B.top + B.height / 2 + 70 * s;
    const cands = [[B.right + 70 * s, cy], [B.left - 70 * s, cy], [B.right + 70 * s, cy + 60 * s], [B.left - 70 * s, cy + 60 * s]];
    for (const [x, y] of cands) { const r = frontRect(x, y, s); if (inView(r) && !hits(r, obs, 8)) return { x, y, s, side: x > B.right ? 1 : -1 }; }
    const f = freeSpots(s, [B.left + B.width / 2, B.top + B.height / 2])[0];
    return f ? { x: f.x, y: f.y, s, side: f.x > B.left + B.width / 2 ? 1 : -1 } : null;
  }

  /* ---------- glass cracks and the line he says ---------- */
  let cracks = [];
  function makeCrack(x, y, size, seed) {
    const r = rng(seed), N = 5 + Math.floor(r() * 3), rays = [];
    for (let i = 0; i < N; i++) { const a0 = i / N * TAU + (r() - .5) * .9, L = size * (.35 + r() * .65), pts = [[x, y]]; let rr = 0, an = a0; while (rr < L) { rr += 9 + r() * 16; an += (r() - .5) * .3; pts.push([x + Math.cos(an) * rr, y + Math.sin(an) * rr]); } rays.push(pts); }
    const rings = []; for (let i = 0; i < N; i++) { if (r() < .6) continue; const A = rays[i], B = rays[(i + 1) % N], ia = Math.min(A.length - 1, 2), ib = Math.min(B.length - 1, 2); rings.push([A[ia], B[ib]]); }
    return { rays, rings, x, y, born: performance.now(), dieAt: 0 };
  }
  function drawCracks(c) {
    const now = performance.now(); cracks = cracks.filter(k => !k.dieAt || now < k.dieAt + 800);
    cracks.forEach(k => { const a = (k.dieAt ? clamp(1 - (now - k.dieAt) / 800, 0, 1) : 1) * clamp((now - k.born) / 120, 0, 1);
      const pass = (dx, dy, col, w) => { c.strokeStyle = col; c.lineWidth = w; k.rays.forEach(pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0] + dx, p[1] + dy) : c.moveTo(p[0] + dx, p[1] + dy)); c.stroke(); }); k.rings.forEach(([p, q]) => { c.beginPath(); c.moveTo(p[0] + dx, p[1] + dy); c.lineTo(q[0] + dx, q[1] + dy); c.stroke(); }); };
      pass(.8, .8, `rgba(0,0,0,${(.22 * a).toFixed(3)})`, 1.1); pass(0, 0, `rgba(230,242,255,${(.4 * a).toFixed(3)})`, .8);
      const g = c.createRadialGradient(k.x, k.y, 0, k.x, k.y, 16); g.addColorStop(0, `rgba(255,255,255,${(.2 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(k.x, k.y, 16, 0, TAU); c.fill(); });
  }
  let glassOn = false;
  function runGlass() { if (glassOn) return; glassOn = true; (function g() { GL.ctx.clearRect(0, 0, GL.w, GL.h); drawCracks(GL.ctx); if (cracks.length) requestAnimationFrame(g); else { GL.ctx.clearRect(0, 0, GL.w, GL.h); glassOn = false; } })(); }
  // a speech balloon with no fill: an inked outline and the words
  function balloon(c, r, tail, sc) {
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, w = r.right - r.left, h = r.bottom - r.top;
    c.save(); c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy); c.lineJoin = 'round';
    const th = Math.atan2((tail[1] - cy) / (h / 2), (tail[0] - cx) / (w / 2)), gap = .2;
    const shape = () => { c.beginPath(); c.ellipse(cx, cy, w / 2, h / 2, 0, th + gap, th - gap + TAU, false); c.lineTo(tail[0], tail[1]); c.closePath(); };
    shape(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#f2f6ff'; c.lineWidth = 2.2; c.stroke();
    let fs = Math.round(h * .23); const fam = "Bangers, 'Comic Sans MS', Impact, sans-serif", l1 = "YOU'VE BEEN HERE A WHILE.", l2 = 'YOU LIKE ME THAT MUCH?';
    c.font = `${fs}px ${fam}`; const need = Math.max(c.measureText(l1).width, c.measureText(l2).width); if (need > w * .76) { fs = Math.floor(fs * w * .76 / need); c.font = `${fs}px ${fam}`; }
    c.textAlign = 'center'; c.textBaseline = 'middle'; if ('letterSpacing' in c) c.letterSpacing = '1px';
    c.lineWidth = 4; c.strokeStyle = 'rgba(4,6,10,.85)'; c.strokeText(l1, cx, cy - fs * .62); c.strokeText(l2, cx, cy + fs * .62);
    c.fillStyle = '#ffffff'; c.fillText(l1, cx, cy - fs * .62); c.fillStyle = '#ffd34d'; c.fillText(l2, cx, cy + fs * .62);
    c.restore();
  }

  /* ---------- the sonic boom: a vapour cone and a shock ring when he really goes ---------- */
  const booms = [];
  function drawBooms(c, dt) {
    for (let i = booms.length - 1; i >= 0; i--) { const b = booms[i]; b.t += dt; const u = b.t / 1.1; if (u >= 1) { booms.splice(i, 1); continue; }
      const ca = Math.cos(b.ang), sa = Math.sin(b.ang), cx = b.x - ca * 40 * b.s, cy = b.y - sa * 40 * b.s;
      c.save(); c.translate(cx, cy); c.rotate(b.ang);
      // vapour cone: two arcs opening backwards
      const R = (40 + 260 * u) * b.s / .5 * .5, fa = 1 - u;
      c.strokeStyle = `rgba(200,245,255,${(.55 * fa).toFixed(3)})`; c.lineWidth = 2 * fa + .5;
      c.beginPath(); c.ellipse(-R * .35, 0, R * .5, R, 0, Math.PI * .5, Math.PI * 1.5); c.stroke();
      c.strokeStyle = `rgba(111,243,255,${(.3 * fa).toFixed(3)})`; c.beginPath(); c.ellipse(-R * .55, 0, R * .62, R * 1.2, 0, Math.PI * .55, Math.PI * 1.45); c.stroke();
      // shock ring
      c.strokeStyle = `rgba(255,255,255,${(.35 * fa * fa).toFixed(3)})`; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, R * 1.4, 0, TAU); c.stroke();
      c.restore(); }
  }

  /* ---------- the actor ---------- */
  const act = { mode: 'follow', t: 0, from: null, spot: null, plays: 0, knocked: [false, false], pos: { x: innerWidth / 2, y: innerHeight * .8 }, fade: 1, k: 0, ang: -Math.PI / 2 + .1, flip: false, dy: 0, turn: 1 };
  const born = performance.now();
  function bannerVisible() { const tb = document.querySelector('.credits .tbc'); if (!tb) return false; const r = tb.getBoundingClientRect(); return r.top > 60 && r.bottom < innerHeight * .7; }
  function onInput() {
    const now = performance.now(); cracks.forEach(k => { if (!k.dieAt) k.dieAt = now + 5000; });
    if (act.mode === 'knock' && act.t > .5) startReturn();
  }
  function startReturn() { act.from = { ...act.pos }; act.mode = 'return'; act.t = 0; }
  setInterval(() => {
    const now = performance.now();
    const nr = net.getBoundingClientRect(), inNet = nr.top < 0 && nr.bottom > innerHeight;
    if (act.mode === 'follow' && !RM && act.plays < 2 && inNet && !bannerVisible() && now - lastInput > 5000 && now - born > 6500 && document.visibilityState === 'visible') {
      const sp = knockSpot(); if (!sp) { lastInput = now - 3000; return; }
      act.spot = sp; act.from = { ...act.pos }; act.mode = 'goKnock'; act.t = 0; act.knocked = [false, false]; act.plays++;
    }
    if ((act.mode === 'follow' || act.mode === 'return') && bannerVisible()) { const sp = finaleSpot(); if (sp) { act.spot = sp; act.from = { ...act.pos }; act.mode = 'goFinale'; act.t = 0; } }
    if ((act.mode === 'finale' || act.mode === 'goFinale') && !bannerVisible()) startReturn();
  }, 250);

  let lastT = performance.now();
  (function loop(n) {
    requestAnimationFrame(loop); frameNo++;
    if (document.hidden) { lastT = n; return; }
    const dt = Math.min(.05, (n - lastT) / 1000); lastT = n; const tt = n / 1000, since = tt - t0 - T_ON;
    const c = CP.ctx, W = CP.w, H = CP.h; c.clearRect(0, 0, W, H);
    const show = RM ? 1 : span(since, 1.3, 2.4), s = heroScale(); act.t += dt;
    const flyTo = (from, to, D) => { const u = ease(clamp(act.t / D, 0, 1)), mx = (from.x + to.x) / 2, my = Math.min(from.y, to.y) - 70 * s, x = (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * mx + u * u * to.x, y = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * my + u * u * to.y, dX = 2 * (1 - u) * (mx - from.x) + 2 * u * (to.x - mx), dY = 2 * (1 - u) * (my - from.y) + 2 * u * (to.y - my); return { x, y, ang: Math.atan2(dY, dX), u }; };
    const flySide = (x, y, ang, k, a) => { const flip = Math.cos(ang) < 0; trail(c, x, y, ang, s, k, tt); const pose = mixPose(POSE.fly, POSE.dive, clamp((k - .5) * 2, 0, 1)); paint(c, x, y, s, flip ? ang - Math.PI : ang, flip, 1, a, cc => side(cc, pose)); };
    const look = clamp((mouse.x - act.pos.x) / 400, -1, 1);
    drawBooms(c, dt);

    if (act.mode === 'follow') {
      // the opening: hover under the title; then a dive down to the right edge, where he stays alongside
      const p = clamp(scrollY / (hero.offsetHeight * .7), 0, 1), m = (W < 760 ? 70 : 120) * s / .42;
      const home = { x: W - m, y: H * .56 }, start = { x: W / 2, y: H * .8 };
      const v = vel;                                   // px per frame, smoothed: + when scrolling down
      act.k = lerp(act.k, clamp(Math.abs(v) / 16, 0, 1), .12);
      act.dy = lerp(act.dy, clamp(v * 5, -H * .16, H * .16), .08);
      let x, y;
      if (p < 1) { const u = ease(p); x = lerp(start.x, home.x, u); y = lerp(start.y, home.y, u) + Math.sin(u * Math.PI) * H * .18; }
      else { x = home.x; y = home.y + act.dy; }
      // shy of the cursor: drifts up or down if it comes close
      const dm = Math.hypot(mouse.x - x, mouse.y - y); if (dm < 130 * s / .6) y += (y > mouse.y ? 1 : -1) * (130 * s / .6 - dm) * .8;
      y += Math.sin(tt * 2.1) * 4 * s / .6;
      act.pos.x = lerp(act.pos.x, x, .2); act.pos.y = lerp(act.pos.y, y, .2);
      // which way he's heading: rising, hovering, or diving with the scroll
      // always flying: diving with the scroll, climbing against it, and otherwise holding a level glide into the wind
      const intro = p > .02 && p < .98 ? 1 : 0, down = v > .5 || intro, glide = Math.PI + .08 + Math.sin(tt * 1.3) * .035 + Math.sin(tt * 7.1) * .008;
      const want = act.k > .12 || intro ? (down ? Math.PI / 2 - .12 : -Math.PI / 2) : glide;
      act.ang = lerp(act.ang, want + (want - act.ang > Math.PI ? -TAU : want - act.ang < -Math.PI ? TAU : 0), .08);
      if (act.k > .78 && tt - (act.boomAt || 0) > 1.6) { act.boomAt = tt; booms.push({ x: act.pos.x, y: act.pos.y, ang: act.ang, t: 0, s }); }
      act.fade = 1;
      const k = Math.max(act.k, intro * .8);
      // idle by the page he turns to face us, hands on hips; any real scroll and he's flying again
      const wantView = 'side';
      if (wantView !== act.view && act.turnT == null) act.turnT = 0;
      let sq = 1; if (act.turnT != null) { act.turnT += dt / .22; if (act.turnT >= .5 && act.swapped !== true) { act.view = wantView; act.swapped = true; } sq = Math.max(.12, Math.abs(1 - act.turnT * 2)); if (act.turnT >= 1) { act.turnT = null; act.swapped = false; } }
      act.view = act.view || 'side';
      const flip = Math.cos(act.ang) < 0;
      if (act.view === 'front') {
        paint(c, act.pos.x, act.pos.y, s, 0, false, sq, show * act.fade, cc => front(cc, { L: 'hip', R: 'hip', look, t: tt }));
      } else {
        trail(c, act.pos.x, act.pos.y, act.ang, s, k, tt);
        // wind on the body while gliding: the trailing leg and arm flutter a little
        const base = mixPose(POSE.fly, POSE.dive, clamp((act.k - .5) * 2, 0, 1)), pose = { ...base, kB: base.kB + Math.sin(tt * 5.3) * .06, lB: base.lB + Math.sin(tt * 3.1) * .025, aB: base.aB + Math.sin(tt * 4.2 + 1) * .03 }, rot = act.ang;
        paint(c, act.pos.x, act.pos.y, s, flip ? rot - Math.PI : rot, flip, sq, show * act.fade, cc => side(cc, pose));
      }
    } else if (act.mode === 'goKnock' || act.mode === 'goFinale') {
      const D = .95, sp = act.spot, f = flyTo(act.from, sp, D); act.pos = { x: f.x, y: f.y };
      flySide(f.x, f.y, f.ang, Math.sin(f.u * Math.PI) * .9 + .1, 1);
      if (act.t >= D) { act.mode = act.mode === 'goKnock' ? 'knock' : 'finale'; act.t = 0; }
    } else if (act.mode === 'knock') {
      // he turns to face us, hovering, and raps on the glass twice
      const sp = act.spot, t = act.t, turn = clamp(t / .22, 0, 1), sq = .2 + .8 * turn, bob = Math.sin(tt * 2.2) * 3 * s;
      act.pos = { x: sp.x, y: sp.y + bob };
      const knockAt = (tk, i, size) => { const d = t - tk, z = d > 0 && d < .22 ? Math.sin(Math.PI * d / .22) : 0; if (d >= .11 && !act.knocked[i]) { act.knocked[i] = true; const hp = act.hand || [sp.x, sp.y - 70 * s]; cracks.push(makeCrack(hp[0], hp[1], size * s / HS, Math.floor(performance.now()))); runGlass(); } return z; };
      const z = Math.max(knockAt(.6, 0, 70), knockAt(.95, 1, 120)), wph = (t - 1.7) % 4.5, waving = t > 1.7 && wph < 1.3;
      const hand = sp.side > 0 ? 'L' : 'R', P = { L: 'hip', R: 'hip', knock: z, look, t: tt };
      if (t > .3 && t < 1.6) P[hand] = 'knock'; else if (waving) { P[hand] = 'wave'; P.wave = Math.sin(wph * 12); }
      const out = paint(c, sp.x, sp.y + bob, s, 0, false, sq, 1, cc => front(cc, P));
      if (out) act.hand = hand === 'L' ? out.hl : out.hr;
      const bt = span(t, 1.2, 1.5); if (bt > 0) balloon(c, sp.balloon, [sp.x - sp.side * 18 * s, sp.y - 96 * s], .6 + .4 * (1 - Math.pow(1 - bt, 3)));
      if (hits(frontRect(sp.x, sp.y, s), obstacles(), 0)) startReturn();
    } else if (act.mode === 'finale') {
      // hover by the banner: a salute, then a point at it
      const sp = act.spot, t = act.t, tb = document.querySelector('.credits .tbc').getBoundingClientRect(), bob = Math.sin(tt * 2.2) * 3 * s;
      const cand = finaleSpot(); if (cand) { sp.x = lerp(sp.x, cand.x, .15); sp.y = lerp(sp.y, cand.y, .15); sp.side = cand.side; }
      act.pos = { x: sp.x, y: sp.y + bob };
      const turn = clamp(t / .22, 0, 1), near = sp.side > 0 ? 'L' : 'R', P = { L: 'hip', R: 'hip', look: -sp.side * .8, t: tt };
      if (t > .3 && t < 1.7) P.R = 'salute';
      else if (t >= 1.7) { P[near] = 'point'; const sx = sp.x + (near === 'L' ? -25.5 : 25.5) * s, sy = sp.y + bob - 57 * s; P.aim = [tb.left + tb.width / 2 - sx, tb.top + tb.height / 2 - sy]; }
      paint(c, sp.x, sp.y + bob, s, 0, false, .2 + .8 * turn, 1, cc => front(cc, P));
    } else if (act.mode === 'return') {
      const D = .7, p = clamp(scrollY / (hero.offsetHeight * .7), 0, 1), m = (W < 760 ? 70 : 120) * s / .42, to = p < 1 ? { x: W / 2, y: H * .8 } : { x: W - m, y: H * .56 };
      const f = flyTo(act.from, to, D); act.pos = { x: f.x, y: f.y }; flySide(f.x, f.y, f.ang, .8, 1);
      if (act.t >= D) { act.mode = 'follow'; act.spot = null; lastInput = performance.now(); }
    }
    // he flies behind the words, never over them: cut the text boxes out of his layer unless he's knocking or saluting
    if (act.mode !== 'knock' && act.mode !== 'finale') { const obs = obstacles(); if (obs.length) { c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; for (const r of obs) { c.fillRect(r.left - 6, r.top - 4, r.width + 12, r.height + 8); } c.restore(); } }
  })(performance.now());

  /* ---------- themed buttons ---------- */
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = ICONS[el.dataset.icon] || '');
  const gg = document.querySelector('.gh-grid');
  if (gg) { const r = rng(31), greens = ['#0e4429', '#006d32', '#26a641', '#39d353']; gg.innerHTML = [...Array(21)].map((_, i) => `<i style="--g:${r() < .2 ? '#161c26' : greens[Math.floor(r() * 4)]};transition-delay:${(i % 7) * 40 + Math.floor(i / 7) * 25}ms"></i>`).join(''); }
})();
