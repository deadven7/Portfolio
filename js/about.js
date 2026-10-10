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
  const presents = document.getElementById('mvPresents'), title = document.getElementById('mvTitle');
  const cue = document.getElementById('mvCue'), titles = hero.querySelector('.mv-titles'), crt = document.getElementById('crt');
  const RC = fitCanvas(document.getElementById('reel'));
  const T_ON = RM ? 0 : 1.05;             // the set warms up, then the reel is already rolling
  const t0 = performance.now() / 1000;
  history.scrollRestoration = 'manual'; window.scrollTo(0, 0);
  if (RM) crt.remove();
  else { requestAnimationFrame(() => crt.classList.add('go')); setTimeout(() => crt.classList.add('done'), T_ON * 1000); setTimeout(() => crt.remove(), T_ON * 1000 + 600); }
  const at = (s, f) => setTimeout(f, RM ? 0 : s * 1000);
  at(T_ON + .2, () => { presents.classList.add('on'); titles.classList.add('on'); });
  at(T_ON + .7, () => title.classList.add('on'));
  at(T_ON + 2.6, () => cue.classList.add('on'));

  /* film strips: frames carry tiny line-drawn vignettes of the scenes below */
  const VIGNETTES = ['data', 'knight', 'burst', 'strings', 'ball', 'note', 'paint', 'quill', 'cape', 'reel'];
  const VCOL = [PAL.cyan, PAL.gold, PAL.rose, PAL.bronze, PAL.lime, PAL.green, PAL.pink, PAL.blue, PAL.violet, PAL.paper];
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
      case 'cape': ctx.beginPath(); ctx.arc(cx + s * .12, cy - s * .16, s * .06, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx + s * .08, cy - s * .08); ctx.quadraticCurveTo(cx - s * .1, cy + s * .02, cx - s * .3, cy + s * .26); ctx.quadraticCurveTo(cx - s * .05, cy + s * .14, cx + s * .02, cy + s * .2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx + s * .12, cy - s * .06); ctx.lineTo(cx + s * .32, cy - s * .2); ctx.stroke(); break;
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

  let reelOff = 0, reelSpeed = 0;
  loopWhileVisible(hero, (dt) => {
    const ctx = RC.ctx, W = RC.w, H = RC.h, since = performance.now() / 1000 - t0 - T_ON;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const fadeIn = RM ? 1 : span(since, -.3, 1.2);
    const target = RM ? 0 : 16 * span(since, .2, 3.5);   // px/s: slow, a hint to scroll
    reelSpeed = lerp(reelSpeed, target + Math.abs(vel) * 22, .06);
    reelOff += reelSpeed * dt;
    const scrollOff = scrollY * .35, flick = 1 + (Math.random() - .5) * .05;
    const lg = ctx.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.max(W, H) * .7); lg.addColorStop(0, `rgba(200,225,255,${.07 * fadeIn * flick})`); lg.addColorStop(1, 'rgba(200,225,255,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    const strips = W < 760
      ? [[W * .12, 104, .9, .5, 0], [W * .88, 104, 1.15, .5, 5]]
      : [[W * .14, 150, .85, .5, 0], [W * .5, 250, 1, .12, 3], [W * .86, 150, 1.2, .5, 7]];
    strips.forEach(([x, w, sp, a, seed]) => drawStrip(ctx, H, x, w, reelOff * sp + scrollOff * sp, a * fadeIn, seed));
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

    /* a board seen at an angle; a knight's tour unwinds as you scroll */
    board(ctx, W, H, p, st) {
      const narrow = W < 860, dim = narrow ? .5 : 1, vx = narrow ? W * .5 : W * .26, top = H * .2, bot = H * .9;
      const wNear = Math.min(narrow ? W * .9 : W * .4, 600), wFar = wNear * .62;
      const P = (u, v) => { const d = v / 8, dd = d * (1 - .25 * d); return [vx + (u / 8 - .5) * lerp(wNear, wFar, d), lerp(bot, top, dd / .75)]; };
      if (!st.tour) {   // Warnsdorff's rule from b1
        const M = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]], seen = new Set(), ok = (c, r) => c >= 0 && c < 8 && r >= 0 && r < 8 && !seen.has(c * 8 + r);
        let c = 1, r = 0; st.tour = [[c, r]]; seen.add(c * 8 + r);
        for (let n = 1; n < 64; n++) { const opts = M.map(([dc, dr]) => [c + dc, r + dr]).filter(([a, b]) => ok(a, b)); if (!opts.length) break; opts.sort((A, B) => M.filter(([dc, dr]) => ok(A[0] + dc, A[1] + dr)).length - M.filter(([dc, dr]) => ok(B[0] + dc, B[1] + dr)).length); [c, r] = opts[0]; seen.add(c * 8 + r); st.tour.push([c, r]); }
      }
      const e = span(p, .05, .32);
      for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) {
        const f = clamp(e * 2.2 - (v + u) / 14, 0, 1); if (!f) continue;
        const q = [P(u, v), P(u + 1, v), P(u + 1, v + 1), P(u, v + 1)];
        ctx.fillStyle = (u + v) % 2 ? rgba(PAL.gold, .055 * f * dim) : `rgba(255,255,255,${.012 * f * dim})`;
        ctx.beginPath(); q.forEach((pt, k) => k ? ctx.lineTo(...pt) : ctx.moveTo(...pt)); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = rgba(PAL.gold, .14 * e * dim); ctx.lineWidth = 1; ctx.beginPath(); [P(0, 0), P(8, 0), P(8, 8), P(0, 8), P(0, 0)].forEach((pt, k) => k ? ctx.lineTo(...pt) : ctx.moveTo(...pt)); ctx.stroke();
      const steps = span(p, .2, .78) * 36, k = Math.floor(steps), ctr = ([c, r]) => P(c + .5, r + .5);
      if (steps > 0) {
        const pts = st.tour.slice(0, k + 2).map(ctr);
        ctx.strokeStyle = rgba(PAL.amber, .32 * dim); ctx.lineWidth = 1.4; partialPath(ctx, pts, (steps) / Math.max(1, pts.length - 1) * ((pts.length - 1) / (k + 1)));
        for (let i = 0; i <= k; i++) { const q = ctr(st.tour[i]); ctx.fillStyle = rgba(PAL.amber, .28 * dim); ctx.beginPath(); ctx.arc(q[0], q[1], 2, 0, TAU); ctx.fill(); }
        const a = ctr(st.tour[k]), b = ctr(st.tour[Math.min(k + 1, 63)]), f = steps - k, h = [lerp(a[0], b[0], f), lerp(a[1], b[1], f) - Math.sin(Math.PI * f) * 14];
        const depth = lerp(st.tour[k][1], st.tour[Math.min(k + 1, 63)][1], f) / 8;
        ctx.font = `${Math.round(lerp(44, 28, depth))}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = `rgba(0,0,0,${.5 * dim})`; ctx.fillText('♞', h[0] + 2, h[1] + 6); ctx.fillStyle = `rgba(255,234,196,${.55 * dim})`; ctx.fillText('♞', h[0], h[1] + 4);
      }
    },

    /* superhero comic: a night skyline in Ben-Day dots, a caped figure crossing panels, an impact burst */
    hero(ctx, W, H, p, st) {
      const { x0, x1, dim } = side(W, true), w = x1 - x0, top = H * .14, bot = H * .88, h = bot - top;
      const e = span(p, .05, .32);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, top, w, h); ctx.clip();
      // printed sky: magenta dots growing toward the top, cyan plate slightly off-register
      const dots = (col, ox, oy, a) => { const s = 12; ctx.fillStyle = rgba(col, a * e * dim); for (let y = top + s / 2; y < bot; y += s) for (let x = x0 + s / 2 + ((Math.round((y - top) / s)) % 2) * s / 2; x < x1; x += s) { const r = (1 - (y - top) / h) * s * .36; if (r > .4) { ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, TAU); ctx.fill(); } } };
      dots(PAL.pink, 0, 0, .08); dots(PAL.cyan, 3, 2, .05);
      // skyline
      if (!st.city || st.W !== W) { st.W = W; const r = rng(8); st.city = []; let x = x0; while (x < x1) { const bw = 26 + r() * 54, bh = h * (.18 + r() * .38); st.city.push({ x, bw, bh, win: [...Array(28)].map(() => [r(), r(), r()]) }); x += bw + 2; } }
      st.city.forEach(b => { const by = bot - b.bh; ctx.fillStyle = '#05060a'; ctx.fillRect(b.x, by, b.bw, b.bh); ctx.strokeStyle = `rgba(240,232,214,${.07 * e * dim})`; ctx.strokeRect(b.x + .5, by + .5, b.bw - 1, b.bh);
        b.win.forEach(([u, v, z]) => { if (z > span(p, .1, .6)) return; ctx.fillStyle = rgba(PAL.gold, .22 * dim); ctx.fillRect(b.x + 4 + u * (b.bw - 10), by + 6 + v * (b.bh - 14), 3, 4); }); });
      // panel gutters ink in
      const g = span(p, .12, .4);
      ctx.strokeStyle = '#040507'; ctx.lineWidth = 9; partialPath(ctx, [[x0 + w * .42, top], [x0 + w * .3, bot]], g); partialPath(ctx, [[x0 + w * .3, top + h * .46], [x1, top + h * .38]], g);
      ctx.strokeStyle = `rgba(240,232,214,${.16 * dim})`; ctx.lineWidth = 1.2; partialPath(ctx, [[x0 + w * .42 + 5, top], [x0 + w * .3 + 5, bot]], g); partialPath(ctx, [[x0 + w * .3, top + h * .46 + 5], [x1, top + h * .38 + 5]], g);
      // the flight
      const f = span(p, .22, .74), hx = lerp(x0 + w * .05, x0 + w * .78, f), hy = lerp(bot - h * .2, top + h * .2, f) - Math.sin(f * Math.PI) * h * .08, ang = -Math.atan2(h * .6, w * .73), sc = Math.min(w, h) / 420;
      if (f > 0 && f < 1) {
        const sc2 = Math.min(w, h) / 300;
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.scale(sc2, sc2);
        ctx.strokeStyle = `rgba(240,232,214,${.13 * dim})`; ctx.lineWidth = 1.2;
        for (let i = 0; i < 10; i++) { const yy = -26 + i * 6; ctx.beginPath(); ctx.moveTo(-70 - (i % 3) * 16, yy); ctx.lineTo(-180 - (i % 4) * 34, yy); ctx.stroke(); }
        const wv = Math.sin(p * 46) * 7;
        // cape
        ctx.fillStyle = rgba(PAL.rose, .38 * dim); ctx.beginPath(); ctx.moveTo(36, -9);
        ctx.bezierCurveTo(6, -26 + wv, -40, -30 - wv, -82, -20 + wv); ctx.lineTo(-70, -6 + wv * .5); ctx.lineTo(-86, 8 - wv * .4); ctx.bezierCurveTo(-40, 14, -6, 12, 24, 2); ctx.closePath(); ctx.fill();
        // body: rim light first, silhouette on top
        const limbs = [[[34, -7], [70, -15]], [[28, 1], [8, 7]], [[6, -1], [-32, 2]], [[6, 4], [-28, 13]]];
        const body = (lw, col) => { ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = lw; limbs.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }); ctx.lineWidth = lw * 2.1; ctx.beginPath(); ctx.moveTo(8, -1); ctx.lineTo(34, -4); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(46, -7, lw * .95 + 1, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(72, -15, lw * .62 + 1, 0, TAU); ctx.fill(); };
        body(10.5, rgba(PAL.cyan, .34 * dim)); body(8, '#07080d');
        ctx.restore();
        // crackle trailing the fist
        const r = rng(Math.floor(f * 60) + 3); for (let i = 0; i < 14; i++) { const an = r() * TAU, rr = 10 + r() * 26 * sc; ctx.fillStyle = rgba(i % 3 ? PAL.cyan : PAL.violet, .35 * dim); ctx.beginPath(); ctx.arc(hx + Math.cos(ang) * 74 * Math.min(w, h) / 300 + Math.cos(an) * rr, hy + Math.sin(ang) * 74 * Math.min(w, h) / 300 + Math.sin(an) * rr, 1 + r() * 2.6, 0, TAU); ctx.fill(); }
      }
      // impact
      const b = span(p, .7, .86);
      if (b) { const cx = x0 + w * .82, cy = top + h * .2, R = Math.min(w, h) * .2 * (.6 + .4 * b); ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.15); ctx.beginPath(); for (let i = 0; i <= 24; i++) { const an = i / 24 * TAU, rr = (i % 2 ? .5 : 1) * R * (1 + ((i * 7) % 5) * .06); i ? ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : ctx.moveTo(rr, 0); } ctx.closePath();
        ctx.save(); ctx.clip(); halftone(ctx, -R, -R, R * 2, R * 2, PAL.gold, .3 * b * dim, 7); ctx.restore(); ctx.strokeStyle = rgba(PAL.rose, .55 * b * dim); ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
      ctx.restore();
      const cx = (x0 + x1) / 2, cy = (top + bot) / 2, mask = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .62);
      mask.addColorStop(0, '#000'); mask.addColorStop(.42, 'rgba(0,0,0,.8)'); mask.addColorStop(.82, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-in'; ctx.save(); ctx.translate(cx, cy); ctx.scale(1, h / Math.max(w, h)); ctx.translate(-cx, -cy); ctx.fillStyle = mask; ctx.fillRect(-W, -H * 6, W * 3, H * 13); ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    },

    /* sports: the court lines draw in, then a rally plays out as you scroll */
    court(ctx, W, H, p) {
      const narrow = W < 860, vx = narrow ? W * .5 : W * .74, top = H * .2, bot = H * .95, wNear = Math.min(W * (narrow ? .95 : .44), 700), wFar = wNear * .38, dim = narrow ? .55 : 1;
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
