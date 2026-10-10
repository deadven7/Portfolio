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

  /* a superhero (no cape), side view, facing +x */
  function flyer(ctx, x, y, ang, sc, a, rim = PAL.cyan) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const shape = (grow, col) => {
      ctx.fillStyle = col; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(34, -12 - grow); ctx.quadraticCurveTo(44, 0, 34, 12 + grow); ctx.lineTo(4, 8 + grow); ctx.quadraticCurveTo(-2, 0, 4, -8 - grow); ctx.closePath(); ctx.fill();   // torso, broad at the shoulders
      ctx.lineWidth = 9 + grow * 2; [[[34, -7], [70, -5]], [[34, 7], [70, 5]]].forEach(([p, q]) => { ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke(); });   // arms, fists first
      ctx.lineWidth = 10 + grow * 2; [[[5, -4], [-34, -6]], [[5, 4], [-30, 9]]].forEach(([p, q]) => { ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke(); });   // legs
      ctx.beginPath(); ctx.arc(48, 0, 9 + grow, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(74, -5, 5.5 + grow, 0, TAU); ctx.arc(74, 5, 5.5 + grow, 0, TAU); ctx.fill();
    };
    shape(1.6, rgba(rim, .7 * a)); shape(0, `rgba(8,9,14,${a})`);
    ctx.fillStyle = rgba(PAL.gold, .6 * a); ctx.fillRect(5, -9, 3, 18);   // belt
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

    /* the scroll cue: dive, then peel right with a light trail and a sonic boom */
    const show = RM ? 1 : span(since, 1.4, 2.6); if (!show) return;
    const sc = clamp(Math.min(W, H) / 900, .6, 1) * 1.15;
    const s = clamp(scrollY / (hero.offsetHeight * .6), 0, 1);
    const P0 = [W / 2, H * .8], P1 = [W / 2, H * .97], P2 = [W * .72, H * 1.0], P3 = [W + 160, H * .9];
    const [x, yRaw] = bez(P0, P1, P2, P3, s), [dx, dy] = bezT(P0, P1, P2, P3, Math.max(s, .001)), ang = Math.atan2(dy, dx);
    const y = yRaw + (1 - span(s, 0, .08)) * Math.sin(tt * 2.4) * 6;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const pts = [];
    if (s < .02) for (let i = 0; i <= 12; i++) pts.push([x, y - 150 * sc + i * 150 * sc / 12]);
    else { const s0 = Math.max(0, s - .45); for (let i = 0; i <= 30; i++) pts.push(bez(P0, P1, P2, P3, s0 + (s - s0) * i / 30)); pts[pts.length - 1] = [x, y]; if (s0 === 0) pts.unshift([P0[0], P0[1] - 150 * sc]); }
    for (let i = 1; i < pts.length; i++) { const f = i / pts.length; ctx.strokeStyle = rgba(PAL.cyan, .5 * f * show); ctx.lineWidth = 1 + f * 7 * sc; ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${(.5 * f * show).toFixed(3)})`; ctx.lineWidth = .6 + f * 2 * sc; ctx.stroke(); }
    if (s < .02) for (let i = 0; i < 6; i++) { const yy = y - 60 * sc - ((tt * 140 + i * 37) % 120) * sc, xx = x + (i - 2.5) * 6 * sc; ctx.strokeStyle = `rgba(220,240,255,${.25 * show})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy - 18 * sc); ctx.stroke(); }
    const sb = .32, q = (s - sb) / .5;
    if (q > 0 && q < 1) {
      const [bx, by] = bez(P0, P1, P2, P3, sb), [tx, ty] = bezT(P0, P1, P2, P3, sb), ba = Math.atan2(ty, tx);
      for (let i = 0; i < 3; i++) { const qq = clamp(q * 1.4 - i * .15, 0, 1); if (!qq) continue; const r = (20 + qq * 260) * sc; ctx.save(); ctx.translate(bx, by); ctx.rotate(ba); ctx.strokeStyle = `rgba(230,245,255,${((1 - qq) * .45).toFixed(3)})`; ctx.lineWidth = 2 * (1 - qq) + .5; ctx.beginPath(); ctx.ellipse(-r * .2, 0, r * .55, r, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
      if (q < .35) { const fl = ctx.createRadialGradient(bx, by, 0, bx, by, 90 * sc); fl.addColorStop(0, `rgba(255,255,255,${(.35 * (1 - q / .35)).toFixed(3)})`); fl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(bx, by, 90 * sc, 0, TAU); ctx.fill(); }
      if (q < .45) { const vq = 1 - q / .45; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); const vg = ctx.createRadialGradient(10 * sc, 0, 0, 10 * sc, 0, 40 * sc); vg.addColorStop(0, `rgba(255,255,255,${(.32 * vq).toFixed(3)})`); vg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = vg; ctx.beginPath(); ctx.ellipse(10 * sc, 0, 16 * sc, 40 * sc, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${(.28 * vq).toFixed(3)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(70 * sc, 0); ctx.lineTo(-60 * sc, -44 * sc); ctx.moveTo(70 * sc, 0); ctx.lineTo(-60 * sc, 44 * sc); ctx.stroke(); ctx.restore(); }
    }
    ctx.restore();
    flyer(ctx, x, y, ang, sc, show);
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
  let beat = 0, camLevel = 0;
  const weights = BEATS.map((_, k) => k === 0 ? 1 : 0);
  function netProgress() { const r = net.getBoundingClientRect(), range = net.offsetHeight - innerHeight; return clamp(-r.top / range, 0, .9999) * BEATS.length; }
  function onNetScroll() { const b = Math.floor(netProgress()); if (b !== beat) { beat = b; beatEls.forEach((el, k) => el.classList.toggle('on', k === beat)); } }
  beatEls[0].classList.add('on');
  addEventListener('scroll', onNetScroll, { passive: true });

  const geo = W => { const H = FG.h, gap = Math.min(H * .34, 300), rowY = H * .44;
    const xs = [[W / 2], [0, 1, 2, 3].map(i => W / 2 + (i - 1.5) * Math.min(W * .84, 720) / 3), [0, 1, 2].map(i => W / 2 + (i - 1) * Math.min(W * .62, 520) / 2)];
    return { gap, rowY, xs }; };
  function placeBeats() { const { rowY } = geo(FG.w); beatEls.forEach((el, k) => { el.style.top = (rowY + (k === 0 ? 62 : 34)) + 'px'; }); }
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
    camLevel = lerp(camLevel, b.lv, RM ? 1 : .08);
    BEATS.forEach((_, k) => { weights[k] = lerp(weights[k], k === beat ? 1 : 0, RM ? 1 : .07); });
    const ctx = BG.ctx; ctx.clearRect(0, 0, W, H);
    BEATS.forEach((bb, k) => { const st = tstate[k]; if (weights[k] < .02 && k !== beat) { st.start = null; return; } if (st.start == null) st.start = t; ctx.save(); TH[bb.theme](ctx, W, H, t - st.start + (bb.theme === 'rigor' ? 0 : 2), weights[k], st); ctx.restore(); });
    const veil = ctx.createRadialGradient(W / 2, g.rowY + 80, 0, W / 2, g.rowY + 80, Math.max(320, W * .4)); veil.addColorStop(0, 'rgba(4,5,7,.72)'); veil.addColorStop(1, 'rgba(4,5,7,0)');
    ctx.fillStyle = veil; ctx.fillRect(0, 0, W, H);
    const edge = ctx.createLinearGradient(0, 0, 0, H); edge.addColorStop(0, 'rgba(4,5,7,.9)'); edge.addColorStop(.12, 'rgba(4,5,7,0)'); ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H);

    const f = FG.ctx; f.clearRect(0, 0, W, H);
    const Y = lv => g.rowY + (lv - camLevel) * g.gap;
    const rowA = lv => { const d = lv - camLevel; return d <= 0 ? 1 : d <= 1 ? lerp(1, .4, d) : clamp(.4 * (1.6 - d) / .6, 0, .4); };
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
    const fy = Y(0), fs = beat === 0 ? 84 : 56, fa = clamp((fy - 40) / 60, 0, 1);
    face.style.width = face.style.height = fs + 'px';
    face.style.transform = `translate(${(W / 2 - fs / 2).toFixed(1)}px, ${(fy - fs / 2).toFixed(1)}px)`; face.style.opacity = fa.toFixed(3);
    face.style.borderColor = beat === 0 ? 'rgba(124,255,178,.6)' : 'rgba(124,255,178,.25)';
  });

  /* =========================================================
     4. THE FOURTH WALL — linger, and someone knocks on the glass
     ========================================================= */
  const GL = fitCanvas(document.getElementById('glass'));
  let ep = null, plays = 0;
  setInterval(() => { if (!ep && !RM && plays < 2 && performance.now() - lastInput > 9000 && document.visibilityState === 'visible') startEpisode(); }, 600);
  function onInput() { if (ep && ep.t > .4 && !ep.leaving) { ep.leaving = true; ep.leaveAt = ep.t; } }
  function startEpisode() {
    plays++; ep = { t: 0, ripples: [], knocked: [false, false], leaving: false, leaveAt: 0 };
    let last = performance.now();
    const tick = n => { ep.t += (n - last) / 1000; last = n; if (drawEpisode()) requestAnimationFrame(tick); else { GL.ctx.clearRect(0, 0, GL.w, GL.h); ep = null; lastInput = performance.now(); } };
    requestAnimationFrame(tick);
  }
  function drawEpisode() {
    const c = GL.ctx, W = GL.w, H = GL.h, t = ep.t, s = clamp(Math.min(W, H) / 800, .7, 1.2);
    c.clearRect(0, 0, W, H);
    const outStart = ep.leaving ? ep.leaveAt : 3.3, outDur = ep.leaving ? .35 : .8;
    const rise = span(t, 0, .8), fall = span(t, outStart, outStart + outDur);
    if (t > outStart + outDur + .9) return false;
    const x = W - 120 * s, y = H - 110 * s + (1 - rise) * 260 * s + fall * 300 * s;
    const knock = (tk, i) => { const d = t - tk, z = d > 0 && d < .2 ? Math.sin(Math.PI * d / .2) : 0; if (d >= .1 && !ep.knocked[i] && !ep.leaving) { ep.knocked[i] = true; ep.ripples.push({ x: x - 30 * s, y: y - 72 * s, t }); } return z; };
    const z = Math.max(knock(1.15, 0), knock(1.5, 1));
    const wave = t > 1.9 && t < outStart ? Math.sin((t - 1.9) * 14) : null;
    ep.ripples.forEach(r => { const age = t - r.t; if (age > .9) return; for (let i = 0; i < 3; i++) { const aa = clamp(age - i * .08, 0, .9), rr = 6 + aa * 170 * s; c.strokeStyle = `rgba(230,245,255,${((1 - aa / .9) * .4).toFixed(3)})`; c.lineWidth = 1.4; c.beginPath(); c.arc(r.x, r.y, rr, 0, TAU); c.stroke(); } const hl = c.createRadialGradient(r.x, r.y, 0, r.x, r.y, 40 * s); hl.addColorStop(0, `rgba(255,255,255,${(.18 * (1 - age / .9)).toFixed(3)})`); hl.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = hl; c.beginPath(); c.arc(r.x, r.y, 40 * s, 0, TAU); c.fill(); });
    if (y > H + 140 * s) return true;
    c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round';
    const lx = clamp((mouse.x - x) / 300, -1, 1) * 2.4, ly = clamp((mouse.y - (y - 60 * s)) / 300, -1, 1) * 1.6;
    const fig = (g, col) => {
      c.fillStyle = col; c.strokeStyle = col; c.lineJoin = 'round';
      c.lineWidth = 10 + g * 2; c.beginPath(); c.moveTo(-8, 18); c.lineTo(-11, 46); c.moveTo(8, 18); c.lineTo(11, 46); c.stroke();          // legs
      c.beginPath(); c.moveTo(-20 - g, -28 - g); c.lineTo(20 + g, -28 - g); c.lineTo(13 + g, 20 + g); c.lineTo(-13 - g, 20 + g); c.closePath(); c.fill();   // torso
      c.lineWidth = 8.5 + g * 2;
      c.beginPath(); c.moveTo(17, -24); wave !== null ? c.lineTo(36 + wave * 7, -58) : c.lineTo(25, 8); c.stroke();                          // left arm (waves)
      const fx = -30 - z * 4, fy = -70 + z * 2, fr = 6.5 + z * 7;
      c.beginPath(); c.moveTo(-17, -24); c.lineTo(fx, fy); c.stroke(); c.beginPath(); c.arc(fx, fy, fr + g, 0, TAU); c.fill();              // the knocking fist
      if (wave !== null) { c.beginPath(); c.arc(36 + wave * 7, -58, 6 + g, 0, TAU); c.fill(); }
      c.beginPath(); c.arc(0, -46, 15 + g, 0, TAU); c.fill();
    };
    fig(1.6, rgba(PAL.cyan, .7)); fig(0, '#08090e');
    c.fillStyle = rgba(PAL.gold, .7); c.fillRect(-13, 14, 26, 4);
    c.fillStyle = rgba(PAL.rose, .8); c.beginPath(); c.moveTo(-14, -52); c.lineTo(14, -52); c.lineTo(12, -44); c.lineTo(-12, -44); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-5.5 + lx, -48 + ly, 2.6, 1.7, 0, 0, TAU); c.ellipse(5.5 + lx, -48 + ly, 2.6, 1.7, 0, 0, TAU); c.fill();
    c.restore();
    return true;
  }

  /* ---------- themed buttons ---------- */
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = ICONS[el.dataset.icon] || '');
  const gg = document.querySelector('.gh-grid');
  if (gg) { const r = rng(31), greens = ['#0e4429', '#006d32', '#26a641', '#39d353']; gg.innerHTML = [...Array(21)].map((_, i) => `<i style="--g:${r() < .2 ? '#161c26' : greens[Math.floor(r() * 4)]};transition-delay:${(i % 7) * 40 + Math.floor(i / 7) * 25}ms"></i>`).join(''); }
})();
