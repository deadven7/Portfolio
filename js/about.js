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
  let ep = null, plays = 0, cracks = [], glassLoop = false;
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

  /* the hero: a classic flying build — broad shoulders, fists first — no cape, no logo */
  const SUIT = '#2b4478', SUIT_HI = '#5574b8', BOOT = '#141a26', SKIN = '#c99a76', HAIR = '#16120e';
  function flyer(ctx, x, y, ang, sc, a) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc); ctx.globalAlpha = a; ctx.lineJoin = 'round';
    const poly = (pts, fill) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    const suit = ctx.createLinearGradient(0, -16, 0, 16); suit.addColorStop(0, SUIT_HI); suit.addColorStop(.45, SUIT); suit.addColorStop(1, '#1a2a4d');
    const rim = () => { ctx.strokeStyle = rgba(PAL.cyan, .55); ctx.lineWidth = 1.4; ctx.stroke(); };
    // far leg and arm, a shade darker
    poly([[4, -1], [-20, 1], [-40, 3], [-40, 9], [-20, 10], [4, 11]], '#1c2b4f'); poly([[-30, 2], [-45, 4], [-51, 7], [-45, 10], [-30, 10]], '#0e121b');
    poly([[34, 1], [50, 1], [66, 3], [66, 9], [50, 8], [36, 9]], '#1c2b4f'); ctx.fillStyle = '#0e121b'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(64, 1.5, 10, 8, 3) : ctx.rect(64, 1.5, 10, 8); ctx.fill();
    // near leg: thigh, calf, boot
    ctx.beginPath(); ctx.moveTo(5, -6); ctx.quadraticCurveTo(-8, -7.5, -21, -4); ctx.lineTo(-41, -2); ctx.lineTo(-41, 4); ctx.lineTo(-21, 6); ctx.quadraticCurveTo(-8, 8.5, 5, 7); ctx.closePath(); ctx.fillStyle = suit; ctx.fill(); rim();
    poly([[-29, -3.5], [-46, -2], [-53, 1.5], [-46, 4.5], [-29, 5.5]], BOOT);
    // torso: tapered waist up to a broad back and chest
    ctx.beginPath(); ctx.moveTo(4, -7); ctx.quadraticCurveTo(18, -9, 30, -13); ctx.quadraticCurveTo(39, -14, 42, -8); ctx.lineTo(42, 8); ctx.quadraticCurveTo(35, 15, 24, 13); ctx.quadraticCurveTo(13, 11, 4, 8); ctx.closePath(); ctx.fillStyle = suit; ctx.fill(); rim();
    ctx.strokeStyle = 'rgba(10,16,30,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(38, 4); ctx.quadraticCurveTo(30, 10, 22, 10); ctx.stroke();
    ctx.fillStyle = rgba(PAL.gold, .9); ctx.fillRect(6, -7.5, 3.2, 15.5);
    // head, tucked between the arms
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.ellipse(48, -1, 8.5, 7.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = HAIR; ctx.beginPath(); ctx.ellipse(46, -4, 8.6, 5.6, -.15, Math.PI * .95, Math.PI * 2.1); ctx.fill();
    ctx.beginPath(); ctx.arc(54.5, -6.5, 1.8, 0, TAU); ctx.fill();
    // near arm, deltoid to fist
    ctx.beginPath(); ctx.moveTo(31, -13.5); ctx.quadraticCurveTo(41, -15, 51, -10); ctx.lineTo(66, -8); ctx.lineTo(66, -2); ctx.lineTo(51, -2.5); ctx.quadraticCurveTo(42, -1, 35, 1); ctx.closePath(); ctx.fillStyle = suit; ctx.fill(); rim();
    ctx.fillStyle = BOOT; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(64, -9.5, 11, 9, 3.5) : ctx.rect(64, -9.5, 11, 9); ctx.fill();
    ctx.restore();
  }
  /* the same hero, facing us */
  function frontHero(c, x, y, s, o) {
    const { look = [0, 0], z = 0, wave = null } = o;
    c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
    const suit = c.createLinearGradient(-30, -60, 30, 40); suit.addColorStop(0, SUIT_HI); suit.addColorStop(.5, SUIT); suit.addColorStop(1, '#18264a');
    const limb = (pts, w0, w1, fill) => { const [a, b] = pts, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L; c.beginPath(); c.moveTo(a[0] + nx * w0, a[1] + ny * w0); c.lineTo(b[0] + nx * w1, b[1] + ny * w1); c.lineTo(b[0] - nx * w1, b[1] - ny * w1); c.lineTo(a[0] - nx * w0, a[1] - ny * w0); c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = rgba(PAL.cyan, .45); c.lineWidth = 1.2; c.stroke(); };
    // legs + boots
    limb([[-8, 8], [-10, 30]], 7.5, 5.5, suit); limb([[8, 8], [10, 30]], 7.5, 5.5, suit);
    limb([[-10, 26], [-11, 42]], 5.6, 5.2, BOOT); limb([[10, 26], [11, 42]], 5.6, 5.2, BOOT);
    // torso
    c.beginPath(); c.moveTo(-14, 8); c.quadraticCurveTo(-17, -20, -27, -50); c.quadraticCurveTo(0, -60, 27, -50); c.quadraticCurveTo(17, -20, 14, 8); c.closePath(); c.fillStyle = suit; c.fill(); c.strokeStyle = rgba(PAL.cyan, .45); c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = 'rgba(10,16,30,.45)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-15, -30); c.quadraticCurveTo(0, -24, 15, -30); c.moveTo(0, -42); c.lineTo(0, -10); c.moveTo(-7, -16); c.lineTo(7, -16); c.moveTo(-6, -6); c.lineTo(6, -6); c.stroke();
    c.fillStyle = rgba(PAL.gold, .95); c.fillRect(-14.5, 3, 29, 5);
    // arms: one knocks on the glass, one waves
    const fist = [-33 + z * -2, -84 + z * 2], fr = 6 + z * 7;
    limb([[-24, -50], [-37, -66]], 8, 6, suit); limb([[-37, -66], fist], 6, 5, suit);
    c.fillStyle = BOOT; c.beginPath(); c.arc(fist[0], fist[1], fr, 0, TAU); c.fill();
    const hand = wave !== null ? [44 + wave * 9, -94] : [30, 2];
    if (wave !== null) { limb([[24, -50], [40, -64]], 8, 6, suit); limb([[40, -64], hand], 6, 5, suit); } else { limb([[24, -50], [28, -22]], 8, 6, suit); limb([[28, -22], hand], 6, 5, suit); }
    c.fillStyle = BOOT; c.beginPath(); c.arc(hand[0], hand[1], 6, 0, TAU); c.fill();
    c.fillStyle = suit; [[-24, -51], [24, -51]].forEach(([dx, dy]) => { c.beginPath(); c.arc(dx, dy, 9, 0, TAU); c.fill(); });
    // neck, head, hair with a curl
    c.fillStyle = SKIN; c.fillRect(-5, -66, 10, 10);
    c.beginPath(); c.ellipse(0, -76, 11, 13, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(120,80,55,.35)'; c.beginPath(); c.ellipse(0, -68, 8, 4, 0, 0, Math.PI); c.fill();
    c.fillStyle = HAIR; c.beginPath(); c.ellipse(0, -84, 12, 7, 0, Math.PI, TAU); c.fill(); c.beginPath(); c.moveTo(-12, -84); c.quadraticCurveTo(-12, -76, -10, -73); c.lineTo(-9, -82); c.fill(); c.beginPath(); c.moveTo(12, -84); c.quadraticCurveTo(12, -76, 10, -73); c.lineTo(9, -82); c.fill();
    c.strokeStyle = HAIR; c.lineWidth = 1.6; c.beginPath(); c.arc(-2, -80, 2.4, -.5, Math.PI * 1.4); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-4.5, -77, 2.4, 1.6, 0, 0, TAU); c.ellipse(4.5, -77, 2.4, 1.6, 0, 0, TAU); c.fill();
    c.fillStyle = '#1b2a44'; c.beginPath(); c.arc(-4.5 + look[0], -77 + look[1], 1.1, 0, TAU); c.arc(4.5 + look[0], -77 + look[1], 1.1, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(90,50,35,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-3, -69); c.quadraticCurveTo(0, -67.5, 3.5, -69.5); c.stroke();
    c.restore();
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

  /* the hero stays with you: dives at the bottom, swings out to the right with a sonic boom,
     then keeps diving down the right edge as you scroll */
  const CP = fitCanvas(document.getElementById('companion'));
  let cAlpha = 0;
  (function companion(n) {
    const ctx = CP.ctx, W = CP.w, H = CP.h, tt = n / 1000, since = n / 1000 - t0 - T_ON;
    ctx.clearRect(0, 0, W, H);
    cAlpha = lerp(cAlpha, ep ? 0 : 1, .1);
    const show = (RM ? 1 : span(since, 1.4, 2.6)) * cAlpha;
    if (show > .01) {
      const sc = clamp(Math.min(W, H) / 900, .5, 1) * .95, m = W < 760 ? 30 : 74;
      const s = clamp(scrollY / (hero.offsetHeight * .7), 0, 1);
      const P0 = [W / 2, H * .8], P1 = [W / 2, H * 1.02], P2 = [W - m, H * .32], P3 = [W - m, H * .6];
      const [x0, y0] = bez(P0, P1, P2, P3, s), [dx, dy] = bezT(P0, P1, P2, P3, clamp(s, .001, .999)), ang = Math.atan2(dy, dx);
      const idle = s < .02 || s > .98, x = x0, y = y0 + (idle ? Math.sin(tt * 2.4) * 6 : 0);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const pts = [];
      if (idle) for (let i = 0; i <= 12; i++) pts.push([x, y - (150 - i * 12.5) * sc]);
      else { const s0 = Math.max(0, s - .4); for (let i = 0; i <= 30; i++) pts.push(bez(P0, P1, P2, P3, s0 + (s - s0) * i / 30)); pts[pts.length - 1] = [x, y]; }
      for (let i = 1; i < pts.length; i++) { const f = i / pts.length; ctx.strokeStyle = rgba(PAL.cyan, .45 * f * show); ctx.lineWidth = 1 + f * 7 * sc; ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${(.45 * f * show).toFixed(3)})`; ctx.lineWidth = .6 + f * 2 * sc; ctx.stroke(); }
      if (idle) { const k = 1 + Math.min(3, Math.abs(vel) / 6); for (let i = 0; i < 7; i++) { const yy = y - 70 * sc - ((tt * 140 * k + i * 37) % 130) * sc, xx = x + (i - 3) * 6 * sc; ctx.strokeStyle = `rgba(220,240,255,${(.22 * show).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy - 18 * sc * k); ctx.stroke(); } }
      const sb = .38, q = (s - sb) / .45;
      if (q > 0 && q < 1) {
        const [bx, by] = bez(P0, P1, P2, P3, sb), [tx, ty] = bezT(P0, P1, P2, P3, sb), ba = Math.atan2(ty, tx);
        for (let i = 0; i < 3; i++) { const qq = clamp(q * 1.4 - i * .15, 0, 1); if (!qq) continue; const r = (20 + qq * 260) * sc; ctx.save(); ctx.translate(bx, by); ctx.rotate(ba); ctx.strokeStyle = `rgba(230,245,255,${((1 - qq) * .45 * show).toFixed(3)})`; ctx.lineWidth = 2 * (1 - qq) + .5; ctx.beginPath(); ctx.ellipse(-r * .2, 0, r * .55, r, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
        if (q < .35) { const fl = ctx.createRadialGradient(bx, by, 0, bx, by, 90 * sc); fl.addColorStop(0, `rgba(255,255,255,${(.35 * (1 - q / .35) * show).toFixed(3)})`); fl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(bx, by, 90 * sc, 0, TAU); ctx.fill(); }
        if (q < .45) { const vq = (1 - q / .45) * show; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); const vg = ctx.createRadialGradient(20 * sc, 0, 0, 20 * sc, 0, 44 * sc); vg.addColorStop(0, `rgba(255,255,255,${(.3 * vq).toFixed(3)})`); vg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = vg; ctx.beginPath(); ctx.ellipse(20 * sc, 0, 18 * sc, 44 * sc, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = `rgba(255,255,255,${(.26 * vq).toFixed(3)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(80 * sc, 0); ctx.lineTo(-60 * sc, -46 * sc); ctx.moveTo(80 * sc, 0); ctx.lineTo(-60 * sc, 46 * sc); ctx.stroke(); ctx.restore(); }
      }
      ctx.restore();
      flyer(ctx, x, y, s > .98 ? Math.PI / 2 : ang, sc, show);
    }
    requestAnimationFrame(companion);
  })(performance.now());

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
     4. THE FOURTH WALL — linger, and someone knocks on the glass
     ========================================================= */
  const GL = fitCanvas(document.getElementById('glass'));
  const born = performance.now();
  setInterval(() => { if (!ep && !RM && plays < 2 && performance.now() - lastInput > 5000 && performance.now() - born > 6500 && document.visibilityState === 'visible') startEpisode(); }, 400);
  function onInput() {
    if (ep && ep.t > .4 && !ep.leaving) { ep.leaving = true; ep.leaveAt = ep.t; }
    const now = performance.now(); cracks.forEach(c => { if (!c.dieAt) c.dieAt = now + 5000; });
  }
  function makeCrack(x, y, size, seed) {
    const r = rng(seed), N = 6 + Math.floor(r() * 4), rays = [];
    for (let i = 0; i < N; i++) { const a0 = i / N * TAU + (r() - .5) * .9, L = size * (.3 + r() * .7), pts = [[x, y]]; let rr = 0, a = a0; while (rr < L) { rr += 10 + r() * 18; a += (r() - .5) * .28; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } rays.push(pts); }
    const rings = []; [.3 + r() * .15].forEach(f => { for (let i = 0; i < N; i++) { if (r() < .55) continue; const A = rays[i], B = rays[(i + 1) % N], ia = Math.min(A.length - 1, Math.round(A.length * f)), ib = Math.min(B.length - 1, Math.round(B.length * f)); if (ia < 1 || ib < 1) continue; rings.push([A[ia], B[ib]]); } });
    const shards = [...Array(6)].map(() => { const a = r() * TAU, d = 6 + r() * 16; return [x + Math.cos(a) * d, y + Math.sin(a) * d, a]; });
    return { rays, rings, shards, x, y, born: performance.now(), dieAt: 0 };
  }
  function drawCracks(c) {
    const now = performance.now();
    cracks = cracks.filter(k => !k.dieAt || now < k.dieAt + 800);
    cracks.forEach(k => {
      const a = (k.dieAt ? clamp(1 - (now - k.dieAt) / 800, 0, 1) : 1) * clamp((now - k.born) / 120, 0, 1);
      const stroke = (dx, dy, col, w) => { c.strokeStyle = col; c.lineWidth = w; k.rays.forEach(pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0] + dx, p[1] + dy) : c.moveTo(p[0] + dx, p[1] + dy)); c.stroke(); }); k.rings.forEach(([p, q]) => { c.beginPath(); c.moveTo(p[0] + dx, p[1] + dy); c.lineTo(q[0] + dx, q[1] + dy); c.stroke(); }); };
      stroke(1, 1, `rgba(0,0,0,${(.3 * a).toFixed(3)})`, 1.3); stroke(0, 0, `rgba(235,245,255,${(.62 * a).toFixed(3)})`, .9);
      const g = c.createRadialGradient(k.x, k.y, 0, k.x, k.y, 26); g.addColorStop(0, `rgba(255,255,255,${(.32 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(k.x, k.y, 26, 0, TAU); c.fill();
      k.shards.forEach(([x, y, an]) => { c.fillStyle = `rgba(240,248,255,${(.35 * a).toFixed(3)})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(an + .4) * 7, y + Math.sin(an + .4) * 7); c.lineTo(x + Math.cos(an - .3) * 9, y + Math.sin(an - .3) * 9); c.closePath(); c.fill(); });
    });
  }
  function balloon(c, cx, cy, w, h, tail, scale) {
    c.save(); c.translate(cx, cy); c.scale(scale, scale); c.translate(-cx, -cy);
    c.fillStyle = '#fffdf3'; c.strokeStyle = '#111'; c.lineWidth = 2.6;
    c.beginPath(); c.ellipse(cx, cy, w / 2, h / 2, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(cx + w * .12, cy + h * .38); c.quadraticCurveTo(cx + w * .2, cy + h * .62, tail[0], tail[1]); c.quadraticCurveTo(cx + w * .3, cy + h * .5, cx + w * .26, cy + h * .3); c.fill();
    c.beginPath(); c.ellipse(cx, cy, w / 2, h / 2, 0, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(cx + w * .12, cy + h * .4); c.quadraticCurveTo(cx + w * .2, cy + h * .62, tail[0], tail[1]); c.quadraticCurveTo(cx + w * .3, cy + h * .5, cx + w * .27, cy + h * .34); c.stroke();
    c.fillStyle = '#fffdf3'; c.beginPath(); c.ellipse(cx, cy, w / 2 - 1.4, h / 2 - 1.4, 0, 0, TAU); c.fill();
    let fs = Math.round(h * .22); c.fillStyle = '#111'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const fam = "Bangers, 'Comic Sans MS', Impact, sans-serif"; c.font = `${fs}px ${fam}`; const need = Math.max(c.measureText("YOU'VE BEEN HERE A WHILE.").width, c.measureText('YOU LIKE ME THAT MUCH?').width); if (need > w * .76) { fs = Math.floor(fs * w * .76 / need); c.font = `${fs}px ${fam}`; }
    c.fillText("YOU'VE BEEN HERE A WHILE.", cx, cy - fs * .62); c.fillText('YOU LIKE ME THAT MUCH?', cx, cy + fs * .62);
    c.restore();
  }
  function startEpisode() {
    plays++; ep = { t: 0, knocked: [false, false], leaving: false, leaveAt: 0 };
    let last = performance.now();
    if (!glassLoop) { glassLoop = true; const tick = n => { const dt = (n - last) / 1000; last = n; if (ep) ep.t += dt; const alive = drawGlass(); if (alive) requestAnimationFrame(tick); else { GL.ctx.clearRect(0, 0, GL.w, GL.h); glassLoop = false; } }; requestAnimationFrame(tick); }
  }
  function drawGlass() {
    const c = GL.ctx, W = GL.w, H = GL.h; c.clearRect(0, 0, W, H);
    if (ep) {
      const t = ep.t, s = clamp(Math.min(W, H) / 800, .62, 1.1);
      const rise = span(t, 0, .8), fall = ep.leaving ? span(t, ep.leaveAt, ep.leaveAt + .35) : 0;
      const x = W - 110 * s, y = H - 70 * s + (1 - rise) * 280 * s + fall * 320 * s;
      const knock = (tk, i, size) => { const d = t - tk, z = d > 0 && d < .2 ? Math.sin(Math.PI * d / .2) : 0; if (d >= .1 && !ep.knocked[i] && !ep.leaving) { ep.knocked[i] = true; cracks.push(makeCrack(x - 35 * s, y - 86 * s, size * s, Math.floor(performance.now()))); } return z; };
      const z = Math.max(knock(1.1, 0, 90), knock(1.45, 1, 190));
      const wph = (t - 2.1) % 4, wave = t > 2.1 && wph < 1.3 && !ep.leaving ? Math.sin(wph * 14) : null;
      drawCracks(c);
      frontHero(c, x, y, s, { look: [clamp((mouse.x - x) / 250, -1, 1) * 1.2, clamp((mouse.y - (y - 76 * s)) / 250, -1, 1) * .7], z, wave });
      const bt = span(t, 1.65, 1.95) * (1 - fall);
      if (bt > 0) { const bw = Math.min(300 * s, W - 30), bh = 104 * s, bx = clamp(x - 170 * s, bw / 2 + 12, W - bw / 2 - 12), by = Math.max(bh / 2 + 70, y - 190 * s); balloon(c, bx, by, bw, bh, [x - 18 * s, y - 100 * s], .6 + .4 * (1 - Math.pow(1 - bt, 3))); }
      if (ep.leaving && t > ep.leaveAt + .4) { ep = null; lastInput = performance.now(); }
    } else drawCracks(c);
    return !!ep || cracks.length > 0;
  }

  /* ---------- themed buttons ---------- */
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = ICONS[el.dataset.icon] || '');
  const gg = document.querySelector('.gh-grid');
  if (gg) { const r = rng(31), greens = ['#0e4429', '#006d32', '#26a641', '#39d353']; gg.innerHTML = [...Array(21)].map((_, i) => `<i style="--g:${r() < .2 ? '#161c26' : greens[Math.floor(r() * 4)]};transition-delay:${(i % 7) * 40 + Math.floor(i / 7) * 25}ms"></i>`).join(''); }
})();
