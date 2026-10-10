/* About page — opening titles (projector → countdown leader → titles → film strips),
   scroll-revealed scene backgrounds, the comic-page interests, and themed buttons. */
(function () {
  const RM = !!window.reducedMotion;
  const TAU = Math.PI * 2;
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const span = (p, a, b) => ease((p - a) / (b - a));
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`; };
  const PAL = { cyan: '#5ee6ff', green: '#7cffb2', amber: '#ffb547', gold: '#ffcf5a', rose: '#ff6b8b', pink: '#ff6bd5', violet: '#c4a7ff', blue: '#7cc8ff', lime: '#d6f45a', bronze: '#e3a467', paper: '#f0e6cc' };

  /* ---------- film grain texture ---------- */
  (() => {
    const c = document.createElement('canvas'); c.width = c.height = 180; const x = c.getContext('2d'), im = x.createImageData(180, 180);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); document.getElementById('mvHero').style.setProperty('--grain', `url(${c.toDataURL()})`);
  })();

  /* ---------- scroll velocity (guitar + reel) ---------- */
  let lastY = scrollY, vel = 0;
  (function track() { const y = scrollY; vel = lerp(vel, y - lastY, .25); lastY = y; requestAnimationFrame(track); })();

  /* =========================================================
     OPENING TITLES
     ========================================================= */
  const hero = document.getElementById('mvHero'), shade = document.getElementById('mvShade');
  const presents = document.getElementById('mvPresents'), title = document.getElementById('mvTitle'), tag = document.getElementById('mvTag');
  const cue = document.getElementById('mvCue'), skipBtn = document.getElementById('mvSkip'), titles = hero.querySelector('.mv-titles');
  const RC = fitCanvas(document.getElementById('reel'));
  const T_FLICK = .7, T_COUNT = .85, N_COUNT = 3, T_LEADER = T_FLICK + T_COUNT * N_COUNT;   // ≈ 3.25 s
  let t0 = performance.now() / 1000, skipped = false, timers = [];
  history.scrollRestoration = 'manual'; window.scrollTo(0, 0);

  function cueTitles(offset) {
    timers.forEach(clearTimeout); timers = [];
    const at = (s, f) => timers.push(setTimeout(f, Math.max(0, (s - offset) * 1000)));
    at(T_LEADER + .15, () => presents.classList.add('on'));
    at(T_LEADER + .8, () => title.classList.add('on'));
    at(T_LEADER + 1.7, () => tag.classList.add('on'));
    at(T_LEADER + 3.4, () => { cue.classList.add('on'); skipBtn.classList.add('gone'); });
  }
  function skip() {
    if (skipped) return; skipped = true;
    t0 = performance.now() / 1000 - (T_LEADER + 1.2);
    cueTitles(T_LEADER + 1.2);
    presents.classList.add('on'); title.classList.add('on');
  }
  if (RM) { skip(); } else cueTitles(0);
  skipBtn.addEventListener('click', skip);
  addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === ' ') skip(); }, { once: true });
  addEventListener('wheel', skip, { once: true, passive: true });
  addEventListener('touchmove', skip, { once: true, passive: true });

  /* film strips: frames carry tiny line-drawn vignettes of the scenes below */
  const VIGNETTES = ['data', 'knight', 'paint', 'quill', 'note', 'planet', 'globe', 'ball', 'strings', 'glyph', 'burst', 'reel'];
  const VCOL = [PAL.cyan, PAL.gold, PAL.pink, PAL.blue, PAL.green, PAL.amber, PAL.blue, PAL.lime, PAL.bronze, PAL.violet, PAL.rose, PAL.paper];
  function vignette(ctx, kind, x, y, w, h, col, a) {
    const cx = x + w / 2, cy = y + h / 2, s = Math.min(w, h);
    ctx.save(); ctx.strokeStyle = rgba(col, a); ctx.fillStyle = rgba(col, a); ctx.lineWidth = Math.max(1, s / 70); ctx.lineCap = 'round';
    const R = rng(kind.length * 7 + 3);
    switch (kind) {
      case 'data': { for (let i = 0; i < 14; i++) { const u = R(), v = .5 - (u - .5) * .7 + (R() - .5) * .25; ctx.beginPath(); ctx.arc(x + w * (.15 + u * .7), y + h * (.15 + v * .7), s * .025, 0, TAU); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(x + w * .12, y + h * .78); ctx.lineTo(x + w * .88, y + h * .26); ctx.stroke(); break; }
      case 'knight': ctx.font = `${s * .62}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♞', cx, cy + s * .03); break;
      case 'note': ctx.font = `${s * .58}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♫', cx, cy); break;
      case 'glyph': ctx.font = `${s * .5}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('अ', cx, cy); break;
      case 'paint': [[-.12, -.05, PAL.pink], [.1, -.08, PAL.cyan], [0, .1, PAL.gold]].forEach(([dx, dy, c]) => { ctx.fillStyle = rgba(c, a * .7); ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, s * .2, 0, TAU); ctx.fill(); }); break;
      case 'quill': for (let l = 0; l < 3; l++) { ctx.beginPath(); for (let i = 0; i <= 30; i++) { const u = i / 30, xx = x + w * (.15 + u * .7 * (l === 2 ? .6 : 1)), yy = y + h * (.32 + l * .2) + Math.sin(u * 28 + l) * s * .03; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); } break;
      case 'planet': ctx.beginPath(); ctx.arc(cx, cy, s * .16, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx, cy, s * .32, s * .09, -.35, 0, TAU); ctx.stroke(); break;
      case 'globe': ctx.beginPath(); ctx.arc(cx, cy, s * .28, 0, TAU); ctx.stroke(); for (const k of [-.5, 0, .5]) { ctx.beginPath(); ctx.ellipse(cx, cy, s * .28 * Math.abs(Math.cos(k * 1.2)) + .1, s * .28, 0, 0, TAU); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(cx - s * .28, cy); ctx.lineTo(cx + s * .28, cy); ctx.stroke(); break;
      case 'ball': ctx.beginPath(); ctx.arc(cx, cy, s * .22, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx - s * .3, cy, s * .2, -.9, .9); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + s * .3, cy, s * .2, Math.PI - .9, Math.PI + .9); ctx.stroke(); break;
      case 'strings': for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x + w * (.32 + i * .072), y + h * .12); ctx.lineTo(x + w * (.32 + i * .072), y + h * .88); ctx.stroke(); } ctx.beginPath(); ctx.arc(cx, cy, s * .14, 0, TAU); ctx.stroke(); break;
      case 'burst': ctx.beginPath(); for (let i = 0; i <= 18; i++) { const r = (i % 2 ? .14 : .3) * s, an = i / 18 * TAU; i ? ctx.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r) : ctx.moveTo(cx + r, cy); } ctx.stroke(); break;
      case 'reel': ctx.beginPath(); ctx.arc(cx, cy, s * .28, 0, TAU); ctx.stroke(); for (let i = 0; i < 5; i++) { const an = i / 5 * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(an) * s * .15, cy + Math.sin(an) * s * .15, s * .055, 0, TAU); ctx.stroke(); } break;
    }
    ctx.restore();
  }
  function drawStrip(ctx, H, xc, w, off, alpha, seed) {
    const fh = w * .78, margin = w * .15, x = xc - w / 2;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#100d09'; ctx.fillRect(x, -2, w, H + 4);
    const first = Math.floor(off / fh) - 1;
    for (let k = first; k * fh - off < H + fh; k++) {
      const y = k * fh - off, idx = ((k + seed) % VIGNETTES.length + VIGNETTES.length) % VIGNETTES.length, col = VCOL[idx];
      // sprocket holes
      ctx.fillStyle = '#000';
      for (let j = 0; j < 4; j++) { const hy = y + fh * (j + .3) / 4; roundRect(ctx, x + margin * .3, hy, margin * .42, fh * .1, 2); roundRect(ctx, x + w - margin * .72, hy, margin * .42, fh * .1, 2); }
      // frame: tinted emulsion + vignette
      const fx = x + margin, fw = w - margin * 2, fy = y + fh * .07, fhh = fh * .86;
      const g = ctx.createLinearGradient(fx, fy, fx, fy + fhh); g.addColorStop(0, rgba(col, .16)); g.addColorStop(1, rgba(col, .05));
      ctx.fillStyle = g; ctx.fillRect(fx, fy, fw, fhh);
      ctx.strokeStyle = 'rgba(255,240,210,.06)'; ctx.strokeRect(fx + .5, fy + .5, fw - 1, fhh - 1);
      vignette(ctx, VIGNETTES[idx], fx, fy, fw, fhh, col, .55);
      // edge print
      if (w > 120) { ctx.fillStyle = 'rgba(255,190,110,.32)'; ctx.font = `${Math.max(7, w * .045)}px JetBrains Mono, monospace`; ctx.save(); ctx.translate(x + margin * .22, y + fh * .55); ctx.rotate(-Math.PI / 2); ctx.fillText(`AV ${String(((k % 99) + 99) % 99).padStart(2, '0')} ▸`, 0, 0); ctx.restore(); }
    }
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); }

  function drawLeader(ctx, W, H, t) {
    const n = N_COUNT - Math.floor((t - T_FLICK) / T_COUNT), f = ((t - T_FLICK) % T_COUNT) / T_COUNT;
    const wx = (Math.random() - .5) * 2, wy = (Math.random() - .5) * 2;   // gate weave
    ctx.save(); ctx.translate(wx, wy);
    const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .7); bg.addColorStop(0, '#3a3122'); bg.addColorStop(1, '#0d0b07');
    ctx.fillStyle = bg; ctx.fillRect(-4, -4, W + 8, H + 8);
    const R = Math.min(W, H) * .3, cx = W / 2, cy = H / 2;
    ctx.fillStyle = 'rgba(255,236,200,.10)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 2.4, -Math.PI / 2, -Math.PI / 2 + f * TAU); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(240,226,196,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, R * .82, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#f2e6c8'; ctx.font = `700 ${R * 1.15}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.max(1, n)), cx, cy + R * .06);
    // scratches + dust
    for (let i = 0; i < 3; i++) if (Math.random() < .5) { ctx.strokeStyle = `rgba(255,250,235,${.08 + Math.random() * .12})`; ctx.lineWidth = Math.random() * 1.2 + .3; const x = Math.random() * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() - .5) * 8, H); ctx.stroke(); }
    for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * .5})`; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 2.2, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  let reelOff = 0, reelSpeed = 0;
  loopWhileVisible(hero, (dt) => {
    const ctx = RC.ctx, W = RC.w, H = RC.h, t = performance.now() / 1000 - t0;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (t < T_FLICK && !skipped) {                       // projector lamp warming up
      const on = Math.random() < .35 + t; ctx.fillStyle = `rgba(255,236,200,${on ? .05 + Math.random() * .1 : 0})`; ctx.fillRect(0, 0, W, H);
      return;
    }
    if (t < T_LEADER && !skipped) { drawLeader(ctx, W, H, t); return; }
    // after the leader: a fading flash, then the strips arrive and start to roll
    const since = t - T_LEADER;
    const fadeIn = RM ? 1 : span(since, 1.1, 3.6);
    const target = RM ? 0 : 14 * span(since, 2.4, 6.5);   // px/s — slow, a hint to scroll
    reelSpeed = lerp(reelSpeed, target + Math.abs(vel) * 22, .06);
    reelOff += reelSpeed * dt;
    const scrollOff = scrollY * .35;
    // projector light from above
    const flick = 1 + (Math.random() - .5) * .04;
    const lg = ctx.createRadialGradient(W / 2, -H * .1, 0, W / 2, -H * .1, H * 1.1); lg.addColorStop(0, `rgba(255,214,150,${.10 * fadeIn * flick})`); lg.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    const narrow = W < 760;
    const strips = narrow
      ? [[W * .1, 104, .9, .5, 0], [W * .9, 104, 1.15, .5, 5]]
      : [[W * .13, 150, .85, .55, 0], [W * .5, 250, 1, .13, 3], [W * .87, 150, 1.2, .55, 7]];
    strips.forEach(([x, w, sp, a, seed]) => drawStrip(ctx, H, x, w, reelOff * sp + scrollOff * sp, a * fadeIn, seed));
    if (since < 1.2 && !RM) { ctx.fillStyle = `rgba(255,244,222,${(1 - since / 1.2) * .22})`; ctx.fillRect(0, 0, W, H); }
  });

  // darken as the reader scrolls past the titles
  function heroScroll() {
    const p = clamp(scrollY / (hero.offsetHeight * .85), 0, 1);
    shade.style.opacity = (p * .96).toFixed(3);
    titles.style.opacity = (1 - p * 1.3).toFixed(3);
    titles.style.transform = `translateY(calc(-4vh - ${(p * 40).toFixed(1)}px))`;
  }
  addEventListener('scroll', heroScroll, { passive: true }); heroScroll();

  /* =========================================================
     SCENE BACKGROUNDS — drawn from scroll position, no idle loops (except guitar)
     ========================================================= */
  const fadeEdges = (ctx, W, H) => { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(4,5,7,1)'); g.addColorStop(.14, 'rgba(4,5,7,0)'); g.addColorStop(.86, 'rgba(4,5,7,0)'); g.addColorStop(1, 'rgba(4,5,7,1)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  const side = (W, right) => W < 860 ? { x0: 0, x1: W, dim: .55 } : right ? { x0: W * .56, x1: W * .97, dim: 1 } : { x0: W * .03, x1: W * .44, dim: 1 };
  const partialPath = (ctx, pts, f) => { if (f <= 0) return; const n = pts.length - 1, m = f * n, k = Math.floor(m); ctx.beginPath(); ctx.moveTo(...pts[0]); for (let i = 1; i <= Math.min(k, n); i++) ctx.lineTo(...pts[i]); if (k < n) { const r = m - k; ctx.lineTo(lerp(pts[k][0], pts[k + 1][0], r), lerp(pts[k][1], pts[k + 1][1], r)); } ctx.stroke(); };

  const FX = {
    /* about me: 1s and 0s settle into a scatter, then a fitted line draws through it */
    data(ctx, W, H, p, st) {
      const { x0, x1, dim } = side(W, true), y0 = H * .2, y1 = H * .8;
      if (!st.pts || st.W !== W) {
        const R = rng(11); st.W = W; st.pts = [];
        const cols = 12, rows = 9;
        for (let i = 0; i < 96; i++) {
          const gx = i % cols, gy = Math.floor(i / cols) % rows, u = R();
          const curve = .5 + .32 * Math.tanh((u - .5) * 3.2), noise = (R() - .5) * .22;
          st.pts.push({ c: R() < .5 ? '0' : '1', gx: lerp(x0, x1, (gx + .5) / cols), gy: lerp(y0, y1, (gy + .5) / rows), tx: lerp(x0, x1, .06 + u * .88), ty: lerp(y1, y0, curve + noise), res: noise, d: R() });
        }
      }
      const m = span(p, .1, .46), line = span(p, .36, .58);
      ctx.font = '13px JetBrains Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      st.pts.forEach(o => {
        const mi = ease(clamp(m * 1.5 - o.d * .5, 0, 1));
        const x = lerp(o.gx, o.tx, mi), y = lerp(o.gy, o.ty, mi);
        if (mi < .6) { ctx.fillStyle = rgba(PAL.cyan, (1 - mi / .6) * .2 * dim); ctx.fillText(o.c, x, y); }
        if (mi > .2) { ctx.fillStyle = rgba(o.res > 0 ? PAL.violet : PAL.cyan, (mi - .2) * .5 * dim); ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill(); }
      });
      if (line > 0) {
        const f = u => lerp(y1, y0, .5 + .32 * Math.tanh((u - .5) * 3.2)), pts = [], up = [], dn = [];
        for (let i = 0; i <= 60; i++) { const u = .04 + i / 60 * .92, x = lerp(x0, x1, u); pts.push([x, f(u)]); up.push([x, f(u) - H * .07]); dn.push([x, f(u) + H * .07]); }
        const k = Math.max(1, Math.round(line * 60));
        ctx.fillStyle = rgba(PAL.green, .05 * dim); ctx.beginPath(); up.slice(0, k + 1).forEach((q, i) => i ? ctx.lineTo(...q) : ctx.moveTo(...q)); dn.slice(0, k + 1).reverse().forEach(q => ctx.lineTo(...q)); ctx.fill();
        ctx.strokeStyle = rgba(PAL.green, .5 * dim); ctx.lineWidth = 1.6; partialPath(ctx, pts, line);
      }
      ctx.strokeStyle = `rgba(140,155,180,${.12 * dim})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y1 + 14); ctx.lineTo(x1, y1 + 14); ctx.stroke();
    },

    /* interests: Ben-Day dots printed slightly off-register behind the page */
    ink(ctx, W, H, p) {
      const e = span(p, .08, .4), s = 16;
      const dots = (col, ox, oy, cx, cy, rad) => {
        ctx.fillStyle = rgba(col, .11 * e);
        for (let y = s / 2; y < H; y += s) for (let x = s / 2 + ((y / s) % 2) * s / 2; x < W; x += s) {
          const d = Math.hypot(x - cx, y - cy) / rad, r = (1 - d) * s * .38;
          if (r > .4) { ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, TAU); ctx.fill(); }
        }
      };
      dots(PAL.pink, 0, 0, W * .95, H * .08, Math.max(W, H) * .5);
      dots(PAL.cyan, 3, 2, W * .02, H * .95, Math.max(W, H) * .45);
      // speed lines from the far corner
      ctx.strokeStyle = rgba(PAL.paper, .05 * e);
      for (let i = 0; i < 26; i++) { const an = Math.PI * .55 + i / 26 * Math.PI * .4, r0 = H * .9, r1 = r0 + H * (.2 + (i % 3) * .1) * e; ctx.beginPath(); ctx.moveTo(W + Math.cos(an) * r0, -H * .05 + Math.sin(an) * r0 * .1); ctx.lineTo(W + Math.cos(an) * r1, -H * .05 + Math.sin(an) * r1 * .1); ctx.stroke(); }
    },

    /* olympiads: five subjects as planets orbiting; scrolling moves them */
    orbits(ctx, W, H, p, st) {
      const { x0, x1, dim } = side(W, false), cx = (x0 + x1) / 2, cy = H * .5, R = Math.min((x1 - x0) * .5, H * .42);
      if (!st.stars) { const r = rng(21); st.stars = [...Array(140)].map(() => [r(), r(), r()]); }
      st.stars.forEach(([x, y, z]) => { ctx.fillStyle = `rgba(230,235,255,${(.05 + z * .14) * dim})`; ctx.fillRect(x * W, y * H, z > .8 ? 1.6 : 1, z > .8 ? 1.6 : 1); });
      // seven gold medals as brighter stars appearing one by one
      const r7 = rng(77);
      for (let i = 0; i < 7; i++) { const a = span(p, .2 + i * .04, .26 + i * .04), x = lerp(x0, x1 - 70, r7()), y = H * (.12 + r7() * .76); if (!a) continue; const g = ctx.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, rgba(PAL.gold, .7 * a * dim)); g.addColorStop(1, rgba(PAL.gold, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); }
      const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .22); sun.addColorStop(0, rgba(PAL.gold, .55 * dim)); sun.addColorStop(.3, rgba(PAL.amber, .18 * dim)); sun.addColorStop(1, rgba(PAL.amber, 0));
      ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(cx, cy, R * .22, 0, TAU); ctx.fill();
      const planets = [[.3, PAL.cyan, 1.5], [.45, PAL.green, 1.1], [.6, PAL.violet, .85], [.76, PAL.rose, .65], [.94, PAL.amber, .5]];
      const tilt = -.32, k = .4;
      planets.forEach(([rr, col, sp], i) => {
        const draw = span(p, .08 + i * .05, .3 + i * .05); if (!draw) return;
        const a = R * rr, b = a * k;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
        ctx.strokeStyle = rgba(col, .16 * dim); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, a, b, 0, -Math.PI / 2, -Math.PI / 2 + draw * TAU); ctx.stroke();
        const ang = i * 1.3 + p * TAU * sp * 1.4, px = Math.cos(ang) * a, py = Math.sin(ang) * b;
        ctx.strokeStyle = rgba(col, .45 * dim * draw); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, 0, a, b, 0, ang - .5, ang); ctx.stroke();
        ctx.fillStyle = rgba(col, .8 * dim * draw); ctx.beginPath(); ctx.arc(px, py, 3 + i * .5, 0, TAU); ctx.fill();
        if (i === 4) { ctx.strokeStyle = rgba(col, .5 * dim * draw); ctx.beginPath(); ctx.ellipse(px, py, 9, 2.6, .3, 0, TAU); ctx.stroke(); }
        ctx.restore();
      });
    },

    /* model UN: a wireframe globe turns as you scroll; Canada, Haiti and the UK light up and join */
    globe(ctx, W, H, p) {
      const { x0, x1, dim } = side(W, true), cx = (x0 + x1) / 2, cy = H * .5, R = Math.min((x1 - x0) * .44, H * .36);
      const lam0 = (-60 + p * 120) * Math.PI / 180, phi0 = 18 * Math.PI / 180;
      const proj = (lat, lon) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180 - lam0;
        const x = Math.cos(la) * Math.sin(lo), y = Math.cos(phi0) * Math.sin(la) - Math.sin(phi0) * Math.cos(la) * Math.cos(lo), z = Math.sin(phi0) * Math.sin(la) + Math.cos(phi0) * Math.cos(la) * Math.cos(lo);
        return [cx + x * R, cy - y * R, z]; };
      const e = span(p, .08, .36);
      const atm = ctx.createRadialGradient(cx, cy, R * .9, cx, cy, R * 1.25); atm.addColorStop(0, rgba(PAL.blue, .08 * e * dim)); atm.addColorStop(1, rgba(PAL.blue, 0));
      ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(PAL.blue, .22 * e * dim); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      const curve = (fn, n) => { let prev = null; for (let i = 0; i <= n; i++) { const q = fn(i / n); if (prev && Math.sign(prev[2]) === Math.sign(q[2])) { ctx.strokeStyle = rgba(PAL.blue, (q[2] > 0 ? .13 : .035) * e * dim); ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); } prev = q; } };
      ctx.lineWidth = 1;
      for (let lon = -180; lon < 180; lon += 20) curve(u => proj(-90 + u * 180, lon), 48);
      for (let lat = -60; lat <= 60; lat += 20) curve(u => proj(lat, -180 + u * 360), 96);
      const places = [[56, -106, '#ff7a7a'], [19, -72.3, '#6d9bff'], [54, -2, PAL.violet]];
      const P = places.map(([la, lo]) => proj(la, lo));
      const arc = span(p, .3, .62);
      const slerp = (a, b, u) => { const A = a.map(v => v * Math.PI / 180), B = b.map(v => v * Math.PI / 180), va = [Math.cos(A[0]) * Math.cos(A[1]), Math.cos(A[0]) * Math.sin(A[1]), Math.sin(A[0])], vb = [Math.cos(B[0]) * Math.cos(B[1]), Math.cos(B[0]) * Math.sin(B[1]), Math.sin(B[0])];
        const om = Math.acos(va.reduce((s, v, i) => s + v * vb[i], 0)), s1 = Math.sin((1 - u) * om) / Math.sin(om), s2 = Math.sin(u * om) / Math.sin(om), v = va.map((x, i) => x * s1 + vb[i] * s2);
        return [Math.asin(v[2]) * 180 / Math.PI, Math.atan2(v[1], v[0]) * 180 / Math.PI]; };
      [[0, 1], [1, 2], [2, 0]].forEach(([i, j], n) => { const f = clamp(arc * 3 - n, 0, 1); if (!f) return; const pts = []; for (let k = 0; k <= 40; k++) { const [la, lo] = slerp(places[i], places[j], k / 40), q = proj(la, lo), lift = 1 + .08 * Math.sin(Math.PI * k / 40); pts.push([cx + (q[0] - cx) * lift, cy + (q[1] - cy) * lift, q[2]]); }
        ctx.lineWidth = 1.4; for (let k = 1; k <= Math.round(f * 40); k++) { ctx.strokeStyle = rgba(PAL.gold, (pts[k][2] > 0 ? .45 : .1) * dim); ctx.beginPath(); ctx.moveTo(pts[k - 1][0], pts[k - 1][1]); ctx.lineTo(pts[k][0], pts[k][1]); ctx.stroke(); } });
      P.forEach(([x, y, z], i) => { if (z < 0) return; const c = places[i][2], a = span(p, .18 + i * .05, .28 + i * .05) * dim; ctx.fillStyle = rgba(c, .85 * a); ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba(c, .35 * a); ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.stroke(); });
    },

    /* sports: the court lines draw in, then a rally plays out as you scroll */
    court(ctx, W, H, p) {
      const narrow = W < 860, vx = narrow ? W * .5 : W * .27, top = H * .2, bot = H * .95, wNear = Math.min(W * (narrow ? .95 : .44), 700), wFar = wNear * .38, dim = narrow ? .55 : 1;
      const X = (u, d) => vx + (u - .5) * lerp(wNear, wFar, d), Y = d => lerp(bot, top, d);
      const lines = [[0, 0, 1, 0], [0, 1, 1, 1], [0, 0, 0, 1], [1, 0, 1, 1], [.125, 0, .125, 1], [.875, 0, .875, 1], [.125, .23, .875, .23], [.125, .77, .875, .77], [.5, .23, .5, .77]];
      const e = span(p, .06, .34);
      ctx.strokeStyle = rgba(PAL.lime, .12 * dim); ctx.lineWidth = 1.3;
      lines.forEach(([u1, d1, u2, d2], i) => { const f = clamp(e * lines.length * .6 - i * .5, 0, 1); if (f) partialPath(ctx, [[X(u1, d1), Y(d1)], [X(u2, d2), Y(d2)]], f); });
      if (e > .5) { ctx.strokeStyle = `rgba(255,255,255,${.14 * dim * (e - .5) * 2})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(-.04, .5), Y(.5)); ctx.lineTo(X(1.04, .5), Y(.5)); ctx.stroke(); ctx.lineWidth = 1; }
      const q0 = span(p, .3, .78); if (!q0) return;
      const shots = [[.3, .05, .7, .88], [.7, .88, .2, .1], [.2, .1, .8, .82], [.8, .82, .4, .06]];
      const q = Math.min(q0, .999) * shots.length, k = Math.floor(q), f = q - k, s = shots[k], trail = [];
      for (let j = 0; j <= 26; j++) { const ff = f * j / 26, u = lerp(s[0], s[2], ff), d = lerp(s[1], s[3], ff), b = .72, hgt = ff < b ? Math.sin(Math.PI * ff / b) : Math.sin(Math.PI * (ff - b) / (1 - b)) * .35; trail.push([X(u, d), Y(d) - hgt * lerp(130, 55, d), X(u, d), Y(d)]); }
      trail.forEach(([x, y], j) => { ctx.fillStyle = rgba(PAL.lime, (j / trail.length) * .3 * dim); ctx.beginPath(); ctx.arc(x, y, 1.7, 0, TAU); ctx.fill(); });
      const [bx, by, sx, sy] = trail[trail.length - 1];
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(sx, sy, 7, 2.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(PAL.lime, .7 * dim); ctx.beginPath(); ctx.arc(bx, by, 5.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${.4 * dim})`; ctx.beginPath(); ctx.arc(bx, by, 5.5, -.6, 1.4); ctx.stroke();
    },

    /* languages: letters from each script surface, coloured like their chips */
    glyphs(ctx, W, H, p, st) {
      const { x0, x1, dim } = side(W, false);
      if (!st.g || st.W !== W) {
        st.W = W; const r = rng(12);
        const sets = [['ABCDEFGHRSTW', PAL.blue], ['अआकगजतनमरसह', PAL.amber], ['અકગજતદનમરસ', PAL.green], ['ابتجدرسعقلمن', PAL.cyan], ['ÄÖÜßEGKLRZ', PAL.violet], ['ÑñÁÉÍÓ¿¡', '#ff8b6b'], ['ÉÈÊÇàçœ', PAL.pink]];
        st.g = [...Array(56)].map((_, i) => { const [chars, col] = sets[i % 7]; return { c: chars[Math.floor(r() * chars.length)], col, x: lerp(x0 + 30, x1 - 30, r()), y: H * (.1 + r() * .8), s: 16 + r() * 46, d: r(), par: .3 + r() * .7 }; });
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      st.g.forEach(o => { const a = span(p, .1 + o.d * .3, .2 + o.d * .3); if (!a) return; ctx.font = `${o.s}px serif`; ctx.fillStyle = rgba(o.col, (.06 + (o.s / 62) * .13) * a * dim); ctx.fillText(o.c, o.x, o.y - (p - .5) * 120 * o.par + (1 - a) * 18); });
    },

    /* end credits: a projector beam with dust, and the strip returning at the edges */
    beam(ctx, W, H, p) {
      const e = span(p, .1, .45);
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgba(255,220,160,${.09 * e})`); g.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(W / 2 - 30, 0); ctx.lineTo(W / 2 + 30, 0); ctx.lineTo(W / 2 + W * .42, H); ctx.lineTo(W / 2 - W * .42, H); ctx.closePath(); ctx.fill();
      const r = rng(9);
      for (let i = 0; i < 90; i++) { const u = r(), v = r(), z = r(), y = ((v + p * (.2 + z * .4)) % 1) * H, half = 30 + (W * .42 - 30) * (y / H), x = W / 2 + (u - .5) * 2 * half; ctx.fillStyle = `rgba(255,236,200,${(.06 + z * .2) * e})`; ctx.beginPath(); ctx.arc(x, y, .6 + z * 1.2, 0, TAU); ctx.fill(); }
      if (W > 760) { drawStrip(ctx, H, 60, 96, p * 900, .3 * e, 2); drawStrip(ctx, H, W - 60, 96, p * 1100, .3 * e, 8); }
    },
  };

  /* guitar keeps its life: six bronze strings that ring when you scroll */
  const BRONZE = ['#e3b07a', '#d39c62', '#c98a4b', '#b8773a', '#a8692f', '#9a5d28'];
  function guitar(ctx, W, H, t, st) {
    st.amp = st.amp || [0, 0, 0, 0, 0, 0];
    const gap = Math.min(30, H * .045), y0 = H * .5 - gap * 2.5, dt = 1 / 60;
    for (let i = 0; i < 6; i++) {
      st.amp[i] = Math.min(gap * .9, st.amp[i] * Math.exp(-dt * (1.6 + i * .25)) + Math.abs(vel) * (.05 + (5 - i) * .012));
      const y = y0 + i * gap, A = st.amp[i] + .25, freq = 18 + (5 - i) * 7, thick = .8 + (5 - i) * .42;
      const drawString = () => { ctx.beginPath(); for (let x = 0; x <= W; x += 6) { const s = Math.sin(Math.PI * x / W), yy = y + A * s * Math.sin(t * freq + i) + A * .3 * Math.sin(TAU * x / W) * Math.sin(t * freq * 2.1); x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); };
      ctx.strokeStyle = BRONZE[i]; ctx.globalAlpha = .07 + Math.min(.12, st.amp[i] / 60); ctx.lineWidth = thick + 5; drawString();
      ctx.globalAlpha = .26 + Math.min(.22, st.amp[i] / 50); ctx.lineWidth = thick; drawString();
      if (i <= 2) { ctx.globalAlpha = .18; ctx.setLineDash([1, 2]); ctx.strokeStyle = '#3a2410'; ctx.lineWidth = thick * .6; drawString(); ctx.setLineDash([]); }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(230,220,200,.08)'; ctx.fillRect(18, y0 - 10, 4, gap * 5 + 20); ctx.fillRect(W - 22, y0 - 10, 4, gap * 5 + 20);
  }

  /* =========================================================
     COMIC PANELS — each panel inks itself in as it scrolls into view
     ========================================================= */
  const PANEL = {
    chess(ctx, W, H, e) {
      const s = Math.min(W, H) / 5.2, ox = W - s * 4.6, oy = H - s * 4.4;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const f = clamp(e * 3 - (r + c) * .25, 0, 1); if (!f || (r + c) % 2 === 0) continue; halftone(ctx, ox + c * s, oy + r * s, s, s, PAL.gold, .2 * f, 6); }
      ctx.strokeStyle = rgba(PAL.paper, .25 * e); ctx.strokeRect(ox, oy, s * 4, s * 4);
      const sq = (c, r) => [ox + (c + .5) * s, oy + (r + .5) * s];
      ctx.setLineDash([5, 4]); ctx.strokeStyle = rgba(PAL.gold, .7); ctx.lineWidth = 2;
      partialPath(ctx, [sq(0, 3), sq(0, 1), sq(1, 1), sq(1, 1), sq(3, 1), sq(3, 0)], span(e, .35, 1)); ctx.setLineDash([]); ctx.lineWidth = 1;
      const k = span(e, .2, .6), kp = e < .9 ? sq(0, 3) : sq(3, 0);
      ctx.font = `${s * 1.15}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(0,0,0,${.8 * k})`; ctx.fillText('♞', kp[0] + 3, kp[1] + 3); ctx.fillStyle = rgba('#fff3d0', .9 * k); ctx.fillText('♞', kp[0], kp[1]);
    },
    art(ctx, W, H, e) {
      ctx.globalCompositeOperation = 'lighter';
      [[.62, .5, PAL.pink, .38], [.8, .34, PAL.cyan, .3], [.74, .74, PAL.gold, .3], [.45, .78, PAL.violet, .22]].forEach(([x, y, c, r], i) => { const f = span(e, i * .12, .5 + i * .12); if (!f) return; const R = Math.min(W, H) * r * f, g = ctx.createRadialGradient(W * x, H * y, 0, W * x, H * y, R); g.addColorStop(0, rgba(c, .32)); g.addColorStop(.7, rgba(c, .12)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W * x, H * y, R, 0, TAU); ctx.fill(); });
      ctx.globalCompositeOperation = 'source-over';
      const b = span(e, .3, 1), n = Math.round(b * 120);
      for (let i = 0; i < n; i++) { const u = i / 120, x = W * (.3 + u * .62), y = H * (.62 - Math.sin(u * 3.4) * .22 + u * .1), w = (1 - Math.abs(u - .45) * 1.6) * Math.min(W, H) * .03 + 1; ctx.fillStyle = rgba(PAL.pink, .28); ctx.beginPath(); ctx.arc(x, y, Math.max(1, w), 0, TAU); ctx.fill(); }
      const r = rng(4); if (e > .6) for (let i = 0; i < 18; i++) { ctx.fillStyle = rgba([PAL.pink, PAL.cyan, PAL.gold][i % 3], .5 * (e - .6) / .4); ctx.beginPath(); ctx.arc(W * (.5 + r() * .45), H * (.25 + r() * .7), 1 + r() * 3, 0, TAU); ctx.fill(); }
    },
    writing(ctx, W, H, e) {
      ctx.strokeStyle = rgba(PAL.cyan, .1); for (let y = H * .42; y < H; y += 22) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(W - 14, y); ctx.stroke(); }
      const lines = 3, f = span(e, .15, 1) * lines; let tip = null;
      ctx.strokeStyle = rgba('#e9f6ff', .7); ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
      for (let l = 0; l < lines; l++) { const g = clamp(f - l, 0, 1); if (!g) continue; const base = H * .42 + 22 * (l + 1) - 4, len = l === lines - 1 ? .55 : 1; ctx.beginPath();
        for (let i = 0; i <= 140 * g; i++) { const u = i / 140, x = 22 + u * (W - 44) * len, y = base - Math.abs(Math.sin(u * 46 + l * 2)) * 9 * (.6 + .4 * Math.sin(u * 7 + l)) + Math.sin(u * 23) * 1.5; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); tip = [x, y]; } ctx.stroke(); }
      if (tip) { ctx.fillStyle = rgba(PAL.cyan, .9); ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] + 22, tip[1] - 30); ctx.lineTo(tip[0] + 28, tip[1] - 26); ctx.closePath(); ctx.fill(); }
      const bl = span(e, .05, .35); if (bl) { const bx = W * .78, by = H * .22, s = .6 + .4 * bl; ctx.save(); ctx.translate(bx, by); ctx.scale(s, s); ctx.globalAlpha = bl; ctx.fillStyle = 'rgba(240,232,214,.12)'; ctx.strokeStyle = 'rgba(240,232,214,.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, 0, Math.min(70, W * .16), 30, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-14, 26); ctx.lineTo(-30, 50); ctx.lineTo(0, 29); ctx.fill(); ctx.stroke(); for (let i = -1; i <= 1; i++) { ctx.fillStyle = 'rgba(240,232,214,.6)'; ctx.beginPath(); ctx.arc(i * 14, 0, 3, 0, TAU); ctx.fill(); } ctx.restore(); }
    },
    music(ctx, W, H, e) {
      const cx = W * .68, cy = H * .55, R = Math.min(W, H) * .36;
      ctx.strokeStyle = rgba(PAL.green, .14); for (let i = 0; i < 40; i++) { const an = i / 40 * TAU, r0 = R * .7, r1 = R * (1.1 + (i % 3) * .25) * span(e, 0, .5); if (r1 < r0) continue; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); ctx.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); ctx.stroke(); }
      const b = span(e, .15, .55);
      if (b) { ctx.save(); ctx.translate(cx, cy); ctx.scale(b, b); ctx.rotate(-.1); ctx.beginPath(); for (let i = 0; i <= 22; i++) { const an = i / 22 * TAU, r = (i % 2 ? .45 : .7) * R * (1 + ((i * 7) % 5) * .05); i ? ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r) : ctx.moveTo(r, 0); } ctx.closePath(); ctx.save(); ctx.clip(); halftone(ctx, -R, -R, R * 2, R * 2, PAL.gold, .35, 7); ctx.restore(); ctx.strokeStyle = rgba(PAL.green, .7); ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
      const notes = ['♪', '♫', '♩', '♬']; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      notes.forEach((n, i) => { const f = span(e, .35 + i * .1, .7 + i * .08); if (!f) return; ctx.font = `${20 + i * 5}px serif`; ctx.fillStyle = rgba([PAL.green, PAL.cyan, PAL.gold, PAL.pink][i], .85 * f); ctx.fillText(n, W * (.3 + i * .16), H * (.82 - i * .1) - f * 26); });
    },
  };
  function halftone(ctx, x, y, w, h, col, a, s) {
    ctx.fillStyle = rgba(col, a);
    for (let yy = y + s / 2; yy < y + h; yy += s) for (let xx = x + s / 2 + (Math.round((yy - y) / s) % 2) * s / 2; xx < x + w; xx += s) { const d = (yy - y) / h, r = s * (.18 + .25 * d); ctx.beginPath(); ctx.arc(xx, yy, r, 0, TAU); ctx.fill(); }
  }

  /* ---------- wiring: redraw on scroll, only what's on screen ---------- */
  const items = [];
  const prog = el => { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1); };
  document.querySelectorAll('.scene').forEach(sec => {
    const C = fitCanvas(sec.querySelector(':scope > canvas')), name = sec.dataset.fx, st = {};
    if (name === 'guitar') {
      loopWhileVisible(sec, (dt, t) => { const ctx = C.ctx; ctx.clearRect(0, 0, C.w, C.h); ctx.save(); guitar(ctx, C.w, C.h, t, st); ctx.restore(); fadeEdges(ctx, C.w, C.h); });
      return;
    }
    items.push({ el: sec, draw(p) { const ctx = C.ctx; ctx.clearRect(0, 0, C.w, C.h); ctx.save(); FX[name](ctx, C.w, C.h, RM ? .5 : p, st); ctx.restore(); fadeEdges(ctx, C.w, C.h); } });
  });
  document.querySelectorAll('.panel').forEach(pn => {
    const C = fitCanvas(pn.querySelector('canvas')), f = PANEL[pn.dataset.panel];
    items.push({ el: pn, draw(p) { const ctx = C.ctx; ctx.clearRect(0, 0, C.w, C.h); ctx.save(); f(ctx, C.w, C.h, RM ? 1 : span(p, .12, .55)); ctx.restore(); } });
  });
  const vis = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => { const it = items.find(i => i.el === e.target); e.isIntersecting ? vis.add(it) : vis.delete(it); if (e.isIntersecting) schedule(true); }));
  items.forEach(i => io.observe(i.el));
  let pending = false;
  function schedule(force) {
    if (pending) return; pending = true;
    requestAnimationFrame(() => { pending = false; vis.forEach(it => { const p = Math.round(prog(it.el) * 500) / 500; if (force === true || p !== it.last) { it.last = p; it.draw(p); } }); });
  }
  addEventListener('scroll', () => schedule(), { passive: true });
  addEventListener('resize', () => setTimeout(() => schedule(true), 60));
  document.fonts && document.fonts.ready.then(() => schedule(true));

  /* ---------- themed buttons ---------- */
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = ICONS[el.dataset.icon] || '');
  const gg = document.querySelector('.gh-grid');
  if (gg) { const r = rng(31), greens = ['#0e4429', '#006d32', '#26a641', '#39d353']; gg.innerHTML = [...Array(21)].map((_, i) => `<i style="--g:${r() < .2 ? '#161c26' : greens[Math.floor(r() * 4)]};transition-delay:${(i % 7) * 40 + Math.floor(i / 7) * 25}ms"></i>`).join(''); }
})();
