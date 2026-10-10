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
  const VIGNETTES = ['cards', 'strings', 'ball', 'knight', 'planet', 'cluster', 'tree', 'cloud', 'keys', 'reel'];
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
    { lv: 1, i: 2, theme: 'sports', col: PAL.lime, label: 'sports' },
    { lv: 1, i: 3, theme: 'analytics', col: PAL.gold, label: 'analytics' },
    { lv: 2, i: 0, theme: 'language', col: PAL.pink, label: 'language' },
    { lv: 2, i: 1, theme: 'rigor', col: PAL.teal, label: 'rigor' },
    { lv: 2, i: 2, theme: 'delivery', col: PAL.blue, label: 'delivery' },
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
  function placeBeats() { const { rows } = geo(FG.w); beatEls.forEach((el, k) => { el.style.top = (rows[BEATS[k].lv] + (k === 0 ? 48 : 26)) + 'px'; }); }
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
      win(W * .05, H * .42, 230 * k, 150 * k, 5, 0); if (W > 700) win(W * .76, H * .5, 210 * k, 130 * k, 9, 4);
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
      const gap = Math.min(26, H * .036), y0 = H * .64 - gap * 2.5, BR = ['#e3b07a', '#d39c62', '#c98a4b', '#b8773a', '#a8692f', '#9a5d28'];
      for (let i = 0; i < 6; i++) {
        st.amp[i] = Math.min(gap * .9, st.amp[i] * Math.exp(-(1 / 60) * (1.4 + i * .25)) + Math.abs(vel) * (.04 + (5 - i) * .01));
        const y = y0 + i * gap, A = st.amp[i] + .25, freq = 18 + (5 - i) * 7, thick = .8 + (5 - i) * .42;
        const draw = () => { ctx.beginPath(); for (let x = 0; x <= W; x += 6) { const s = Math.sin(Math.PI * x / W), yy = y + A * s * Math.sin(t * freq + i) + A * .3 * Math.sin(TAU * x / W) * Math.sin(t * freq * 2.1); x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); };
        ctx.strokeStyle = rgba(BR[i], (.07 + Math.min(.1, st.amp[i] / 60)) * a); ctx.lineWidth = thick + 5; draw();
        ctx.strokeStyle = rgba(BR[i], (.28 + Math.min(.2, st.amp[i] / 50)) * a); ctx.lineWidth = thick; draw();
      }
      const kh = Math.min(H * .11, 90), ky = H - kh - 6, nW = Math.max(21, Math.round(W / 40)), kw = W / nW;
      const seq = [0, 2, 4, 7, 9, 7, 4, 2, 5, 9, 12, 9], step = Math.floor(t * 3.2), lit = new Map(), base = 7 * Math.floor(nW / 14);
      for (let j = 0; j < 4; j++) { const s = seq[((step - j) % seq.length + seq.length) % seq.length] + base; lit.set(s, Math.max(lit.get(s) || 0, 1 - j * .3 - (t * 3.2 % 1) * .3)); }
      for (let i = 0; i < nW; i++) { ctx.strokeStyle = `rgba(240,230,210,${.07 * a})`; ctx.strokeRect(i * kw + .5, ky, kw - 1, kh); const l = lit.get(i); if (l) { ctx.fillStyle = rgba(PAL.amber, .14 * l * a); ctx.fillRect(i * kw + 1, ky + 1, kw - 2, kh - 2); } }
      for (let i = 0; i < nW - 1; i++) { if ([2, 6].includes(i % 7)) continue; ctx.fillStyle = `rgba(0,0,0,${.6 * a})`; ctx.fillRect((i + 1) * kw - kw * .3, ky, kw * .6, kh * .6); ctx.strokeStyle = `rgba(240,230,210,${.05 * a})`; ctx.strokeRect((i + 1) * kw - kw * .3, ky, kw * .6, kh * .6); }
      [[.08, .3, PAL.pink], [.92, .22, PAL.cyan]].forEach(([x, y, c], i) => { const r = Math.min(W, H) * (.16 + .02 * Math.sin(t * .4 + i)), g = ctx.createRadialGradient(W * x, H * y, 0, W * x, H * y, r); g.addColorStop(0, rgba(c, .1 * a)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W * x, H * y, r, 0, TAU); ctx.fill(); });
    },

    /* a ball rallying across the bottom of the screen, which is the court */
    sports(ctx, W, H, t, a) {
      const floor = H * .9, k = clamp(Math.min(W, H) / 900, .6, 1.1), r = 9 * k;
      const fg = ctx.createLinearGradient(0, floor, 0, H); fg.addColorStop(0, rgba(PAL.lime, .07 * a)); fg.addColorStop(1, rgba(PAL.lime, 0)); ctx.fillStyle = fg; ctx.fillRect(0, floor, W, H - floor);
      ctx.strokeStyle = rgba(PAL.lime, .3 * a); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, floor); ctx.lineTo(W, floor); ctx.stroke(); ctx.lineWidth = 1;
      for (let i = -6; i <= 6; i++) { ctx.strokeStyle = rgba(PAL.lime, .07 * a); ctx.beginPath(); ctx.moveTo(W / 2 + i * W * .09, floor); ctx.lineTo(W / 2 + i * W * .2, H); ctx.stroke(); }
      const nh = H * .07; ctx.strokeStyle = `rgba(255,255,255,${.16 * a})`; ctx.beginPath(); ctx.moveTo(W / 2, floor); ctx.lineTo(W / 2, floor - nh); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${.06 * a})`; for (let y = floor - nh; y < floor; y += 6) { ctx.beginPath(); ctx.moveTo(W / 2 - 3, y); ctx.lineTo(W / 2 + 3, y); ctx.stroke(); }
      const P = 3.6, pos = tt => { const n = Math.floor(tt / P), u = (tt % P) / P, dir = n % 2 ? -1 : 1, x = dir > 0 ? lerp(-40, W + 40, u) : lerp(W + 40, -40, u), ph = u * 3, b = Math.floor(ph), f = ph - b, hgt = [H * .3, H * .22, H * .14][b] || 0; return [x, floor - r - Math.sin(Math.PI * f) * hgt, f]; };
      for (let j = 10; j >= 1; j--) { const [x, y] = pos(t - j * .03); ctx.fillStyle = rgba(PAL.lime, (.18 - j * .016) * a); ctx.beginPath(); ctx.arc(x, y, r * (1 - j * .05), 0, TAU); ctx.fill(); }
      const [x, y, f] = pos(t), contact = Math.min(f, 1 - f) < .05, sx = contact ? 1.25 : 1, sy = contact ? .78 : 1;
      const hgt = (floor - r - y) / (H * .3); ctx.fillStyle = `rgba(0,0,0,${.45 * a})`; ctx.beginPath(); ctx.ellipse(x, floor + 3, Math.max(2, r * (1.4 - hgt * .6)), r * .35, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(x, y + (contact ? r * .2 : 0)); ctx.scale(sx, sy); ctx.fillStyle = rgba(PAL.lime, .8 * a); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${.55 * a})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-r * 1.3, 0, r, -.8, .8); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 1.3, 0, r, Math.PI - .8, Math.PI + .8); ctx.stroke(); ctx.restore();
    },

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
     THE HERO — one character: follows the scroll, knocks on the glass when you linger,
     and salutes at the end. He only ever stands in empty space.
     ========================================================= */
  const SUIT_A = '#2f4a80', SUIT_B = '#0e1528';
  // a tapered capsule: two circles joined by tangents
  function capsule(c, x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx), off = Math.acos(clamp((r1 - r2) / d, -1, 1));
    c.moveTo(x1 + r1 * Math.cos(a + off), y1 + r1 * Math.sin(a + off));
    c.arc(x1, y1, r1, a + off, a - off + TAU, false);
    c.arc(x2, y2, r2, a - off, a + off, false);
    c.closePath();
  }
  function ell(c, x, y, rx, ry, rot = 0) { c.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
  // paint a silhouette: rim light on the outer edge only, then one smooth fill
  function silhouette(c, build, gx0, gy0, gx1, gy1, a, glow = true) {
    // record every primitive as its own shape, so overlaps add up instead of cancelling
    const shapes = []; const rec = {}; ['moveTo', 'lineTo', 'arc', 'ellipse', 'quadraticCurveTo', 'bezierCurveTo', 'closePath'].forEach(m => rec[m] = (...args) => { if (m === 'moveTo') shapes.push([]); (shapes[shapes.length - 1] || (shapes.push([]), shapes[0])).push([m, args]); });
    build(rec);
    const draw = sh => { c.beginPath(); sh.forEach(([m, args]) => c[m](...args)); };
    c.save(); c.globalAlpha = a; c.lineJoin = 'round';
    if (glow) { c.shadowColor = 'rgba(94,230,255,.4)'; c.shadowBlur = 16; }
    c.strokeStyle = 'rgba(150,236,255,.8)'; c.lineWidth = 2.4; shapes.forEach(sh => { draw(sh); c.stroke(); });
    c.shadowBlur = 0;
    const g = c.createLinearGradient(gx0, gy0, gx1, gy1); g.addColorStop(0, SUIT_A); g.addColorStop(1, SUIT_B); c.fillStyle = g;
    shapes.forEach(sh => { draw(sh); c.fill(); });
    c.restore();
  }
  // standing, facing us. Units: feet at (0,0), head top at about -180.
  function heroFront(c, x, y, s, pose, a = 1) {
    const { knock = 0, wave = null, salute = 0, point = null } = pose;
    c.save(); c.translate(x, y); c.scale(s, s);
    const build = c => {
      ell(c, 0, -166, 9.6, 12); ell(c, 0, -171, 10.4, 8.6);               // head, hair
      capsule(c, 0, -156, 6.4, 0, -143, 7);                                 // neck
      c.moveTo(-8, -151); c.quadraticCurveTo(-20, -148, -28, -142); c.quadraticCurveTo(-33, -131, -27, -116); c.quadraticCurveTo(-21, -100, -14.5, -92);
      c.quadraticCurveTo(-17, -84, -14, -77); c.lineTo(14, -77); c.quadraticCurveTo(17, -84, 14.5, -92); c.quadraticCurveTo(21, -100, 27, -116); c.quadraticCurveTo(33, -131, 28, -142); c.quadraticCurveTo(20, -148, 8, -151); c.closePath();
      ell(c, -27.5, -136, 9.6, 9); ell(c, 27.5, -136, 9.6, 9);              // shoulders
      for (const sd of [-1, 1]) { capsule(c, sd * 9.5, -82, 11, sd * 13.5, -44, 6.8); capsule(c, sd * 13.5, -44, 6.6, sd * 15, -30, 7.8); capsule(c, sd * 15, -30, 7.8, sd * 14.5, -7, 4.2); ell(c, sd * 17.5, -3, 8, 3.8); }
      const arm = (sd, elbow, hand, fist = 5.4) => { capsule(c, sd * 28, -134, 8.4, elbow[0], elbow[1], 6.2); capsule(c, elbow[0], elbow[1], 6.2, hand[0], hand[1], 4.4); ell(c, hand[0], hand[1], fist, fist); };
      // left of screen: knocks / salutes / points; right of screen: on hip, or waves
      let L = false, R = false;
      if (point) { const d = point, sd = d[0] >= 0 ? 1 : -1, n = Math.hypot(d[0], d[1]) || 1, ux = d[0] / n, uy = d[1] / n, sx = sd * 28, sy = -134; arm(sd, [sx + ux * 27, sy + uy * 27], [sx + ux * 50, sy + uy * 50], 4.8); capsule(c, sx + ux * 50, sy + uy * 50, 2.1, sx + ux * 60, sy + uy * 60, 1.7); if (sd < 0) L = true; else R = true; }
      else if (salute > 0) { const e = [lerp(-42, -40, salute), lerp(-108, -150, salute)], h = [lerp(-22, -13, salute), lerp(-92, -168, salute)]; arm(-1, e, h, 4.6); if (salute > .6) capsule(c, h[0], h[1], 2.1, h[0] + 9, h[1] - 3, 1.7); L = true; }
      else if (knock > 0 || pose.raise) { const z = knock; arm(-1, [-44, -150], [-37 - z * 2, -172 + z * 2], 5.4 + z * 6); L = true; }
      if (!L) arm(-1, [-42, -108], [-22, -92]);
      if (!R) { if (wave !== null) arm(1, [46, -150], [52 + wave * 8, -176]); else arm(1, [42, -108], [22, -92]); }
    };
    silhouette(c, build, -30, -180, 30, 0, a);
    c.restore();
  }
  // flying, side view, facing +x, centred on the chest
  function heroFly(c, x, y, ang, s, a = 1) {
    if (a <= .01) return;
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
    const build = c => {
      ell(c, 54, -2, 9.6, 8.8); ell(c, 51, -6, 9.8, 6.6);
      capsule(c, 42, 0, 6.6, 47, -1, 6);
      c.moveTo(40, -12); c.quadraticCurveTo(26, -16, 12, -9); c.quadraticCurveTo(4, -9, 0, -8); c.quadraticCurveTo(-4, 0, 0, 8); c.quadraticCurveTo(10, 9, 14, 9); c.quadraticCurveTo(28, 16, 40, 11); c.quadraticCurveTo(46, 0, 40, -12); c.closePath();
      ell(c, 37, -4, 9, 8.6);
      capsule(c, 38, -6, 7.4, 58, -7, 5.4); capsule(c, 58, -7, 5.4, 76, -7, 4); ell(c, 80, -7, 5.4, 5.4);
      capsule(c, 38, 2, 7, 57, 0, 5.2); capsule(c, 57, 0, 5.2, 74, 0, 3.8); ell(c, 78, 0, 5, 5);
      capsule(c, 2, -3, 9.6, -26, -2, 6); capsule(c, -26, -2, 6, -35, -1, 6.6); capsule(c, -35, -1, 6.6, -51, 0, 3.6); ell(c, -57, 1, 7, 3);
      capsule(c, 2, 4, 9, -24, 7, 5.8); capsule(c, -24, 7, 5.8, -33, 9, 6.2); capsule(c, -33, 9, 6.2, -47, 11, 3.5); ell(c, -53, 12, 6.6, 2.8);
    };
    silhouette(c, build, 0, -16, 0, 16, a, true);
    c.restore();
  }

  /* where things are on screen, so he never stands on them */
  const CP = fitCanvas(document.getElementById('companion'));
  const GL = fitCanvas(document.getElementById('glass'));
  const stage = net.querySelector('.net-stage');
  function obstacles() {
    const out = [], vis = el => { const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) return; if (+getComputedStyle(el).opacity < .15) return; out.push(r); };
    ['.nav', '.mv-title', '.beat.on', '#netFace', '.credits .tbc', '.credits .edu-line', '.credits .roll-cta > *', '.credits .contact-row > *', 'footer .wrap > *'].forEach(q => document.querySelectorAll(q).forEach(vis));
    const sr = stage.getBoundingClientRect();
    if (sr.bottom > 0 && sr.top < innerHeight) { const g = geo(FG.w); g.rows.forEach((y, lv) => { const xs = g.xs[lv]; out.push({ left: Math.min(...xs) - 52, right: Math.max(...xs) + 52, top: sr.top + y - 36, bottom: sr.top + y + 18 }); }); }
    return out;
  }
  const hits = (r, obs, pad = 14) => obs.some(o => r.left < o.right + pad && r.right > o.left - pad && r.top < o.bottom + pad && r.bottom > o.top - pad);
  const inView = r => r.left >= 6 && r.top >= 64 && r.right <= innerWidth - 6 && r.bottom <= innerHeight - 4;
  const heroScale = () => clamp(Math.min(innerWidth, innerHeight) / 900, .48, .9);
  const figRect = (x, y, s) => ({ left: x - 58 * s, right: x + 58 * s, top: y - 182 * s, bottom: y });
  function knockSpot() {
    const s = heroScale(), W = innerWidth, H = innerHeight, obs = obstacles(), bw = Math.min(290 * s * 1.15, W - 24), bh = 96 * s * 1.15;
    for (const side of [1, -1]) for (const fy of [H - 10, H * .82, H * .64, H * .46]) {
      const x = side > 0 ? W - 66 * s : 66 * s, fr = figRect(x, fy, s); if (!inView(fr) || hits(fr, obs)) continue;
      const opts = [side > 0 ? { left: fr.left - bw - 4, top: fy - 175 * s - bh * .55 } : { left: fr.right + 4, top: fy - 175 * s - bh * .55 }, { left: clamp(x - bw / 2, 8, W - bw - 8), top: fr.top - bh - 10 }];
      for (const o of opts) { const br = { left: o.left, top: o.top, right: o.left + bw, bottom: o.top + bh }; if (inView(br) && !hits(br, obs) && !hits(br, [fr], 2)) return { x, y: fy, s, side, balloon: br }; }
    }
    return null;
  }
  function finaleSpot() {
    const s = heroScale(), W = innerWidth, obs = obstacles(), tb = document.querySelector('.credits .tbc'); if (!tb) return null;
    const B = tb.getBoundingClientRect(), y = B.top + 150 * s;
    for (const x of [B.right + 100 * s + 16, B.left - 100 * s - 16, W - 66 * s, 66 * s]) { const fr = figRect(x, y, s); if (inView(fr) && !hits(fr, obs, 10)) return { x, y, s, target: [B.left + B.width / 2, B.top + B.height / 2], side: x > B.right ? 1 : -1 }; }
    return null;
  }

  /* the cracks and the line he says */
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
      pass(.8, .8, `rgba(0,0,0,${(.22 * a).toFixed(3)})`, 1.1); pass(0, 0, `rgba(230,242,255,${(.42 * a).toFixed(3)})`, .8);
      const g = c.createRadialGradient(k.x, k.y, 0, k.x, k.y, 16); g.addColorStop(0, `rgba(255,255,255,${(.22 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(k.x, k.y, 16, 0, TAU); c.fill(); });
  }
  function balloon(c, r, tail, sc) {
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, w = r.right - r.left, h = r.bottom - r.top;
    c.save(); c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy);
    c.fillStyle = '#fffdf3'; c.strokeStyle = '#111'; c.lineWidth = 2.4;
    const tx = clamp(tail[0], r.left + w * .2, r.right - w * .2), base = tail[0] < cx ? -1 : 1;
    c.beginPath(); c.ellipse(cx, cy, w / 2, h / 2, 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(tx - 9 * base, cy + h * .38); c.quadraticCurveTo(tx + 4 * base, cy + h * .62, tail[0], tail[1]); c.quadraticCurveTo(tx + 14 * base, cy + h * .5, tx + 10 * base, cy + h * .36); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(cx, cy, w / 2 - 1.3, h / 2 - 1.3, 0, 0, TAU); c.fill();
    let fs = Math.round(h * .22); const fam = "Bangers, 'Comic Sans MS', Impact, sans-serif"; c.font = `${fs}px ${fam}`; const need = Math.max(c.measureText("YOU'VE BEEN HERE A WHILE.").width, c.measureText('YOU LIKE ME THAT MUCH?').width); if (need > w * .74) { fs = Math.floor(fs * w * .74 / need); c.font = `${fs}px ${fam}`; }
    c.fillStyle = '#111'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText("YOU'VE BEEN HERE A WHILE.", cx, cy - fs * .62); c.fillText('YOU LIKE ME THAT MUCH?', cx, cy + fs * .62);
    c.restore();
  }

  /* the actor */
  const act = { mode: 'follow', t: 0, from: null, spot: null, plays: 0, knocked: [false, false], follow: { x: 0, y: 0, ang: 0 } };
  const born = performance.now();
  let creditsVis = 0;
  new IntersectionObserver(es => es.forEach(e => { creditsVis = e.intersectionRatio; }), { threshold: [0, .3, .45, .6, .8, 1] }).observe(document.getElementById('credits'));
  function onInput() {
    const now = performance.now(); cracks.forEach(k => { if (!k.dieAt) k.dieAt = now + 5000; });
    if (act.mode === 'knock' && act.t > .4) startReturn();
  }
  function startReturn() { act.from = curPos(); act.mode = 'return'; act.t = 0; }
  function curPos() { if (act.mode === 'follow' || !act.spot) return { x: act.follow.x, y: act.follow.y, front: false }; return { x: act.spot.x, y: act.spot.y - 100 * act.spot.s, front: true }; }
  setInterval(() => {
    const now = performance.now();
    if (act.mode === 'follow' && !RM && act.plays < 2 && creditsVis < .3 && now - lastInput > 5000 && now - born > 6500 && document.visibilityState === 'visible') {
      const sp = knockSpot(); if (!sp) { lastInput = now - 3000; return; }
      act.spot = sp; act.from = { x: act.follow.x, y: act.follow.y }; act.mode = 'goKnock'; act.t = 0; act.knocked = [false, false]; act.plays++;
    }
    if (act.mode === 'follow' && creditsVis >= .45) { const sp = finaleSpot(); if (sp) { act.spot = sp; act.from = { x: act.follow.x, y: act.follow.y }; act.mode = 'goFinale'; act.t = 0; } }
    if ((act.mode === 'finale' || act.mode === 'goFinale') && creditsVis < .25) startReturn();
  }, 300);

  (function loop(n) {
    const tt = n / 1000, since = tt - t0 - T_ON, dt = 1 / 60;
    const c = CP.ctx, W = CP.w, H = CP.h; c.clearRect(0, 0, W, H);
    const show = RM ? 1 : span(since, 1.4, 2.6);
    // where he'd be if he were just following along
    const sc = heroScale(), m = W < 760 ? 26 : 70, s = clamp(scrollY / (hero.offsetHeight * .7), 0, 1);
    const P0 = [W / 2, H * .8], P1 = [W / 2, H * 1.02], P2 = [W - m, H * .32], P3 = [W - m, H * .6];
    const [fx, fy0] = bez(P0, P1, P2, P3, s), [dx, dy] = bezT(P0, P1, P2, P3, clamp(s, .001, .999)), idle = s < .02 || s > .98;
    act.follow = { x: fx, y: fy0 + (idle ? Math.sin(tt * 2.4) * 6 : 0), ang: s > .98 ? Math.PI / 2 : Math.atan2(dy, dx), s, idle };
    act.t += dt;
    if (act.mode === 'follow') {
      const F = act.follow, r = { left: F.x - 30 * sc, right: F.x + 30 * sc, top: F.y - 60 * sc, bottom: F.y + 60 * sc };
      act.fade = lerp(act.fade ?? 1, s > .98 && hits(r, obstacles(), 6) ? 0 : 1, .12);
      const a = show * act.fade;
      if (a > .01) {
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        const pts = []; if (F.idle) for (let i = 0; i <= 12; i++) pts.push([F.x, F.y - (150 - i * 12.5) * sc]); else { const s0 = Math.max(0, s - .4); for (let i = 0; i <= 30; i++) pts.push(bez(P0, P1, P2, P3, s0 + (s - s0) * i / 30)); pts[pts.length - 1] = [F.x, F.y]; }
        for (let i = 1; i < pts.length; i++) { const f = i / pts.length; c.strokeStyle = rgba(PAL.cyan, .4 * f * a); c.lineWidth = 1 + f * 6 * sc; c.beginPath(); c.moveTo(...pts[i - 1]); c.lineTo(...pts[i]); c.stroke(); c.strokeStyle = `rgba(255,255,255,${(.4 * f * a).toFixed(3)})`; c.lineWidth = .6 + f * 1.8 * sc; c.stroke(); }
        if (F.idle) { const k = 1 + Math.min(3, Math.abs(vel) / 6); for (let i = 0; i < 7; i++) { const yy = F.y - 80 * sc - ((tt * 140 * k + i * 37) % 130) * sc, xx = F.x + (i - 3) * 6 * sc; c.strokeStyle = `rgba(220,240,255,${(.2 * a).toFixed(3)})`; c.lineWidth = 1; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy - 18 * sc * k); c.stroke(); } }
        const sb = .38, q = (s - sb) / .45;
        if (q > 0 && q < 1) { const [bx, by] = bez(P0, P1, P2, P3, sb), [tx, ty] = bezT(P0, P1, P2, P3, sb), ba = Math.atan2(ty, tx);
          for (let i = 0; i < 3; i++) { const qq = clamp(q * 1.4 - i * .15, 0, 1); if (!qq) continue; const R = (20 + qq * 240) * sc; c.save(); c.translate(bx, by); c.rotate(ba); c.strokeStyle = `rgba(230,245,255,${((1 - qq) * .42 * a).toFixed(3)})`; c.lineWidth = 2 * (1 - qq) + .5; c.beginPath(); c.ellipse(-R * .2, 0, R * .55, R, 0, 0, TAU); c.stroke(); c.restore(); }
          if (q < .35) { const fl = c.createRadialGradient(bx, by, 0, bx, by, 90 * sc); fl.addColorStop(0, `rgba(255,255,255,${(.32 * (1 - q / .35) * a).toFixed(3)})`); fl.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = fl; c.beginPath(); c.arc(bx, by, 90 * sc, 0, TAU); c.fill(); }
          if (q < .45) { const vq = (1 - q / .45) * a; c.save(); c.translate(F.x, F.y); c.rotate(F.ang); c.strokeStyle = `rgba(255,255,255,${(.24 * vq).toFixed(3)})`; c.lineWidth = 1.2; c.beginPath(); c.moveTo(85 * sc, 0); c.lineTo(-60 * sc, -48 * sc); c.moveTo(85 * sc, 0); c.lineTo(-60 * sc, 48 * sc); c.stroke(); const vg = c.createRadialGradient(22 * sc, 0, 0, 22 * sc, 0, 46 * sc); vg.addColorStop(0, `rgba(255,255,255,${(.28 * vq).toFixed(3)})`); vg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = vg; c.beginPath(); c.ellipse(22 * sc, 0, 18 * sc, 46 * sc, 0, 0, TAU); c.fill(); c.restore(); } }
        c.restore();
        heroFly(c, F.x, F.y, F.ang, sc * .95, a);
      }
    } else if (act.mode === 'goKnock' || act.mode === 'goFinale') {
      const sp = act.spot, D = .85, u = ease(clamp(act.t / D, 0, 1)), tx = sp.x, ty = sp.y - 100 * sp.s;
      const mx = (act.from.x + tx) / 2, my = Math.min(act.from.y, ty) - 80, x = (1 - u) * (1 - u) * act.from.x + 2 * (1 - u) * u * mx + u * u * tx, y = (1 - u) * (1 - u) * act.from.y + 2 * (1 - u) * u * my + u * u * ty;
      const dX = 2 * (1 - u) * (mx - act.from.x) + 2 * u * (tx - mx), dY = 2 * (1 - u) * (my - act.from.y) + 2 * u * (ty - my);
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(94,230,255,.35)'; c.lineWidth = 3 * sp.s; c.beginPath(); c.moveTo(x - dX * .08, y - dY * .08); c.lineTo(x, y); c.stroke(); c.restore();
      heroFly(c, x, y, Math.atan2(dY, dX), sp.s * .95, 1);
      if (act.t >= D) { act.mode = act.mode === 'goKnock' ? 'knock' : 'finale'; act.t = 0; }
    } else if (act.mode === 'knock') {
      const sp = act.spot, t = act.t, land = span(t, 0, .25);
      const knockAt = (tk, i, size) => { const d = t - tk, z = d > 0 && d < .2 ? Math.sin(Math.PI * d / .2) : 0; if (d >= .1 && !act.knocked[i]) { act.knocked[i] = true; cracks.push(makeCrack(sp.x - 38 * sp.s, sp.y - 172 * sp.s, size * sp.s, Math.floor(performance.now()))); runGlass(); } return z; };
      const z = Math.max(knockAt(.55, 0, 60), knockAt(.9, 1, 110)), wph = (t - 1.6) % 4, wave = t > 1.6 && wph < 1.2 ? Math.sin(wph * 14) : null;
      heroFront(c, sp.x, sp.y + (1 - land) * 12, sp.s, { knock: z, raise: t > .35, wave }, land);
      const bt = span(t, 1.15, 1.45); if (bt > 0) balloon(c, sp.balloon, [sp.x - 10 * sp.s * sp.side, sp.y - 160 * sp.s], .6 + .4 * (1 - Math.pow(1 - bt, 3)));
      if (hits(figRect(sp.x, sp.y, sp.s), obstacles(), 0)) startReturn();
    } else if (act.mode === 'finale') {
      const sp = act.spot, t = act.t, land = span(t, 0, .25), tb = document.querySelector('.credits .tbc').getBoundingClientRect();
      sp.y = tb.top + 150 * sp.s; if (sp.side > 0) sp.x = Math.max(sp.x, tb.right + 100 * sp.s + 16); else sp.x = Math.min(sp.x, tb.left - 100 * sp.s - 16);
      const sal = t < 1.5 ? span(t, .2, .55) * (1 - span(t, 1.15, 1.45)) : 0;
      const target = [tb.left + tb.width / 2 - sp.x, tb.top + tb.height / 2 - (sp.y - 134 * sp.s)];
      heroFront(c, sp.x, sp.y + (1 - land) * 12, sp.s, t < 1.45 ? { salute: sal } : { point: [target[0] / sp.s, target[1] / sp.s] }, land);
    } else if (act.mode === 'return') {
      const D = .6, u = ease(clamp(act.t / D, 0, 1)), F = act.follow, x = lerp(act.from.x, F.x, u), y = lerp(act.from.y, F.y, u);
      heroFly(c, x, y, Math.atan2(F.y - act.from.y, F.x - act.from.x), heroScale() * .95, 1);
      if (act.t >= D) { act.mode = 'follow'; act.spot = null; lastInput = performance.now(); }
    }
    requestAnimationFrame(loop);
  })(performance.now());

  let glassOn = false;
  function runGlass() { if (glassOn) return; glassOn = true; (function g() { GL.ctx.clearRect(0, 0, GL.w, GL.h); drawCracks(GL.ctx); if (cracks.length) requestAnimationFrame(g); else { GL.ctx.clearRect(0, 0, GL.w, GL.h); glassOn = false; } })(); }


  /* ---------- themed buttons ---------- */
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = ICONS[el.dataset.icon] || '');
  const gg = document.querySelector('.gh-grid');
  if (gg) { const r = rng(31), greens = ['#0e4429', '#006d32', '#26a641', '#39d353']; gg.innerHTML = [...Array(21)].map((_, i) => `<i style="--g:${r() < .2 ? '#161c26' : greens[Math.floor(r() * 4)]};transition-delay:${(i % 7) * 40 + Math.floor(i / 7) * 25}ms"></i>`).join(''); }
})();
