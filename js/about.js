/* About page: CRT boot, atari title, nebula, scroll-driven easter eggs */
(function () {
  /* ---------------- CRT boot ---------------- */
  const crt = document.getElementById('crt');
  const atari = document.getElementById('atari');
  const meta = document.getElementById('atariMeta');
  const sub = document.getElementById('atariSub');
  let bootT = performance.now() / 1000;
  window.scrollTo(0, 0);
  requestAnimationFrame(() => crt.classList.add('go'));
  setTimeout(() => { crt.classList.add('done'); bootT = performance.now() / 1000; }, reducedMotion ? 0 : 1050);
  setTimeout(() => { atari.classList.add('on'); meta.classList.add('on'); }, reducedMotion ? 0 : 1500);
  setTimeout(() => sub.classList.add('on'), reducedMotion ? 0 : 2500);

  /* ---------------- scroll velocity ---------------- */
  let lastY = scrollY, vel = 0;
  (function track() { const y = scrollY; vel = lerp(vel, y - lastY, 0.25); lastY = y; requestAnimationFrame(track); })();

  /* ---------------- sprite helper ---------------- */
  function glowSprite(color, size = 32) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.18, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
  }

  /* ---------------- NEBULA ---------------- */
  const hero = document.getElementById('abHero');
  const NC = fitCanvas(document.getElementById('nebula'));
  const cols = ['#a78bfa', '#ff6b8b', '#5ee6ff', '#ffb547', '#c4b5fd', '#f0abfc'];
  const sprites = cols.map(c => glowSprite(c, 48));
  const R = rng(42);
  const stars = [...Array(220)].map(() => ({ x: R(), y: R(), s: R() * 1.3 + .2, ph: R() * 6.28, sp: .5 + R() * 2 }));
  const parts = [];
  const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  function newPart(init) {
    return { u: init ? R() : 0, off: gauss() * 0.42, sp: 0.05 + R() * 0.09, size: 4 + R() * 14 * (R() < .1 ? 2.2 : 1), c: Math.floor(R() * sprites.length), sw: R() * 6.28, a: .25 + R() * .55 };
  }
  for (let i = 0; i < 700; i++) parts.push(newPart(true));
  let mx = 0, my = 0;
  hero.addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });

  loopWhileVisible(hero, (dt, t) => {
    const ctx = NC.ctx, W = NC.w, H = NC.h;
    const since = performance.now() / 1000 - bootT;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#040507'; ctx.fillRect(0, 0, W, H);
    // static noise just after power-on
    if (since < 0.7) {
      const n = 1 - since / 0.7, img = ctx.createImageData(Math.ceil(W / 3), Math.ceil(H / 3));
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255 * n; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      const off = document.createElement('canvas'); off.width = img.width; off.height = img.height; off.getContext('2d').putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, W, H); ctx.imageSmoothingEnabled = true;
    }
    const grow = clamp((since - 1.2) / 2.5, 0, 1);         // nebula grows in after title
    // stars
    stars.forEach(s => { ctx.globalAlpha = (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * clamp(since, 0, 1); ctx.fillStyle = '#dfe6ff'; ctx.fillRect(s.x * W + mx * 6, s.y * H + my * 6, s.s, s.s); });
    ctx.globalAlpha = 1;
    const cx = W / 2 + mx * -14, cy = H * 0.6 + my * -8;
    // core glow
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.45);
    g.addColorStop(0, `rgba(167,139,250,${0.16 * grow})`); g.addColorStop(.4, `rgba(94,230,255,${0.05 * grow})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // flowing stream: center → bottom
    ctx.globalCompositeOperation = 'lighter';
    const len = (H - cy + 60) * grow;
    for (const p of parts) {
      p.u += p.sp * dt * (0.6 + p.u);
      if (p.u > 1) Object.assign(p, newPart(false));
      const y = cy + p.u * len;
      const spread = 12 + Math.pow(p.u, 1.25) * W * 0.36;
      const swirl = Math.sin(p.u * 7 + t * 0.6 + p.sw) * 18 * p.u;
      const x = cx + p.off * spread + swirl;
      const s = p.size * (0.4 + p.u * 1.1);
      ctx.globalAlpha = p.a * Math.min(1, p.u * 8) * (1 - Math.pow(p.u, 4)) * grow;
      ctx.drawImage(sprites[p.c], x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  });

  /* ---------------- CHAPTER EFFECTS ---------------- */
  const BRONZE = ['#e3b07a', '#d39c62', '#c98a4b', '#b8773a', '#a8692f', '#9a5d28'];

  // precomputed knight's tour (Warnsdorff) from a1
  const tour = (() => {
    const N = 8, seen = new Set(), path = [[0, 0]]; seen.add('0,0');
    const moves = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
    const ok = (r, c) => r >= 0 && c >= 0 && r < N && c < N && !seen.has(r + ',' + c);
    const deg = (r, c) => moves.filter(([a, b]) => ok(r + a, c + b)).length;
    while (path.length < 64) {
      const [r, c] = path[path.length - 1];
      const opts = moves.map(([a, b]) => [r + a, c + b]).filter(([a, b]) => ok(a, b)).sort((A, B) => deg(...A) - deg(...B));
      if (!opts.length) break; path.push(opts[0]); seen.add(opts[0].join());
    }
    return path;
  })();

  const FX = {
    tech(ctx, W, H, t, p, v, st) {
      if (!st.paths || st.W !== W) {
        st.W = W; const r = rng(8), g = 26; st.paths = [];
        for (let i = 0; i < 26; i++) {
          let x = Math.round((W * .5 + r() * W * .5) / g) * g, y = Math.round(r() * H / g) * g; const pts = [[x, y]];
          for (let k = 0; k < 6; k++) { if (r() < .5) x += (r() < .5 ? -1 : 1) * g * (1 + Math.floor(r() * 4)); else y += (r() < .5 ? -1 : 1) * g * (1 + Math.floor(r() * 4)); pts.push([x, y]); }
          st.paths.push(pts);
        }
      }
      st.paths.forEach((pts, i) => {
        ctx.strokeStyle = 'rgba(94,230,255,.09)'; ctx.lineWidth = 1.2; ctx.beginPath(); pts.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        ctx.fillStyle = 'rgba(94,230,255,.18)'; ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], 2.5, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(94,230,255,.2)'; ctx.beginPath(); ctx.arc(pts[pts.length - 1][0], pts[pts.length - 1][1], 3.5, 0, 7); ctx.stroke();
        // pulse
        const segs = pts.length - 1, u = ((t * 0.25 + i * 0.13 + p * 2) % 1) * segs, k = Math.floor(u), f = u - k;
        const x = lerp(pts[k][0], pts[k + 1][0], f), y = lerp(pts[k][1], pts[k + 1][1], f);
        ctx.fillStyle = 'rgba(124,255,178,.55)'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
      });
    },
    data(ctx, W, H, t, p) {
      const r = rng(3), n = 110, k = clamp((p - 0.15) / 0.45, 0, 1), e = k * k * (3 - 2 * k);
      const x0 = W * .05, x1 = W * .5, a = H * .78, b = -H * .5;
      for (let i = 0; i < n; i++) {
        const u = r(), noise = (r() - .5) * H * .16, ry = H * (.12 + r() * .76);
        const tx = x0 + u * (x1 - x0), ty = a + b * u + noise;
        const y = lerp(ry, ty, e);
        if (e > .6) { ctx.strokeStyle = 'rgba(255,107,139,.12)'; ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, a + b * u); ctx.stroke(); }
        ctx.fillStyle = 'rgba(94,230,255,.32)'; ctx.beginPath(); ctx.arc(tx, y, 2, 0, 7); ctx.fill();
      }
      const L = clamp((e - .5) * 2, 0, 1);
      if (L > 0) { ctx.strokeStyle = 'rgba(124,255,178,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, a); ctx.lineTo(lerp(x0, x1, L), a + b * L); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(124,255,178,.35)'; ctx.font = '11px JetBrains Mono, monospace'; ctx.fillText('ŷ = β₀ + β₁x', x0, H * .1); }
    },
    chess(ctx, W, H, t, p) {
      // perspective board on the right
      const vx = W * .72, vy = H * .02, base = H * .98, bw = Math.min(W * .7, 760), left = vx - bw / 2;
      const P = (c, r) => { // c,r in 0..8, r=0 near
        const depth = r / 8, yy = lerp(base, H * .28, Math.pow(depth, .8));
        const scale = (yy - vy) / (base - vy);
        return [vx + (left + c * bw / 8 - vx) * scale, yy];
      };
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const a = P(c, r), b = P(c + 1, r), cc = P(c + 1, r + 1), d = P(c, r + 1);
        ctx.fillStyle = (r + c) % 2 ? 'rgba(255,181,71,.035)' : 'rgba(255,255,255,.012)';
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...cc); ctx.lineTo(...d); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,181,71,.08)';
      for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(...P(i, 0)); ctx.lineTo(...P(i, 8)); ctx.moveTo(...P(0, i)); ctx.lineTo(...P(8, i)); ctx.stroke(); }
      const steps = Math.floor(clamp(p * 1.4, 0, 1) * 28);
      const ctr = ([r, c]) => P(c + .5, r + .5);
      ctx.strokeStyle = 'rgba(255,181,71,.22)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i <= steps; i++) { const q = ctr(tour[i]); i ? ctx.lineTo(...q) : ctx.moveTo(...q); }
      ctx.stroke(); ctx.lineWidth = 1;
      for (let i = 0; i <= steps; i++) { const q = ctr(tour[i]); ctx.fillStyle = `rgba(255,181,71,${i === steps ? .0 : .25})`; ctx.beginPath(); ctx.arc(q[0], q[1], 2, 0, 7); ctx.fill(); }
      const h = ctr(tour[steps]); const depth = tour[steps][0] / 8;
      ctx.font = `${Math.round(lerp(40, 22, depth))}px serif`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,230,190,.5)'; ctx.fillText('♞', h[0], h[1] + 6); ctx.textAlign = 'left';
    },
    guitar(ctx, W, H, t, p, v, st) {
      st.amp = st.amp || [0, 0, 0, 0, 0, 0];
      const gap = Math.min(30, H * .045), y0 = H * .5 - gap * 2.5;
      const dt = 1 / 60;
      for (let i = 0; i < 6; i++) {
        st.amp[i] = Math.min(gap * .9, st.amp[i] * Math.exp(-dt * (1.6 + i * .25)) + Math.abs(v) * (0.05 + (5 - i) * 0.012));
        const y = y0 + i * gap, A = st.amp[i] + 0.25, freq = 18 + (5 - i) * 7;
        const thick = 0.8 + (5 - i) * 0.42;
        // glow
        ctx.strokeStyle = BRONZE[i]; ctx.globalAlpha = .07 + Math.min(.12, st.amp[i] / 60); ctx.lineWidth = thick + 5; drawString();
        ctx.globalAlpha = .26 + Math.min(.22, st.amp[i] / 50); ctx.lineWidth = thick; drawString();
        if (i <= 2) { ctx.globalAlpha = .18; ctx.setLineDash([1, 2]); ctx.strokeStyle = '#3a2410'; ctx.lineWidth = thick * .6; drawString(); ctx.setLineDash([]); }
        function drawString() {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 6) { const s = Math.sin(Math.PI * x / W); const yy = y + A * s * Math.sin(t * freq + i) + A * .3 * Math.sin(2 * Math.PI * x / W) * Math.sin(t * freq * 2.1); x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // nut + bridge saddles at the edges
      ctx.fillStyle = 'rgba(230,220,200,.08)'; ctx.fillRect(18, y0 - 10, 4, gap * 5 + 20); ctx.fillRect(W - 22, y0 - 10, 4, gap * 5 + 20);
    },
    tennis(ctx, W, H, t, p, v, st) {
      // court seen from behind the near baseline
      const vx = W < 800 ? W * .5 : W * .74, top = H * .22, bot = H * .96, wNear = Math.min(W * .9, 820), wFar = wNear * .38;
      const X = (u, d) => vx + (u - .5) * lerp(wNear, wFar, d), Y = d => lerp(bot, top, d);
      ctx.strokeStyle = 'rgba(200,255,120,.09)'; ctx.lineWidth = 1.2;
      const line = (u1, d1, u2, d2) => { ctx.beginPath(); ctx.moveTo(X(u1, d1), Y(d1)); ctx.lineTo(X(u2, d2), Y(d2)); ctx.stroke(); };
      line(0, 0, 1, 0); line(0, 1, 1, 1); line(0, 0, 0, 1); line(1, 0, 1, 1);
      line(.125, 0, .125, 1); line(.875, 0, .875, 1);
      line(.125, .23, .875, .23); line(.125, .77, .875, .77); line(.5, .23, .5, .77);
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; line(-.05, .5, 1.05, .5); ctx.lineWidth = 1;
      // rally driven by scroll
      const shots = [[.3, .05, .7, .88], [.7, .88, .2, .1], [.2, .1, .8, .82], [.8, .82, .4, .06]];
      const q = clamp(p * 1.3, 0, .999) * shots.length, k = Math.floor(q), f = q - k, s = shots[k];
      const trail = [];
      for (let j = 0; j <= 24; j++) {
        const ff = f * j / 24, u = lerp(s[0], s[2], ff), d = lerp(s[1], s[3], ff);
        const bounceAt = .72, hgt = ff < bounceAt ? Math.sin(Math.PI * ff / bounceAt) * 1 : Math.sin(Math.PI * (ff - bounceAt) / (1 - bounceAt)) * .35;
        trail.push([X(u, d), Y(d) - hgt * lerp(120, 50, d), X(u, d), Y(d)]);
      }
      trail.forEach(([x, y], j) => { ctx.fillStyle = `rgba(214,255,90,${(j / trail.length) * .25})`; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); });
      const [bx, by, sx, sy] = trail[trail.length - 1];
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(sx, sy, 7, 2.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(214,255,90,.6)'; ctx.beginPath(); ctx.arc(bx, by, 5.5, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(bx, by, 5.5, -.6, 1.4); ctx.stroke();
    },
    comics(ctx, W, H, t, p) {
      // panel grid (left side) drawing itself in
      const L = W * .04, T = H * .1, PW = Math.min(W * .4, 560), PH = H * .8;
      const panels = [[0, 0, .58, .38], [.6, 0, .4, .38], [0, .4, 1, .26], [0, .68, .38, .32], [.4, .68, .6, .32]];
      const draw = clamp(p * 1.6, 0, 1) * panels.length;
      panels.forEach(([x, y, w, h], i) => {
        const f = clamp(draw - i, 0, 1); if (!f) return;
        const px = L + x * PW, py = T + y * PH, pw = w * PW, ph = h * PH;
        // halftone inside panel
        const s = 11, fx = px + pw * (.3 + .4 * Math.sin(t * .2 + i)), fy = py + ph * .5;
        ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
        ctx.fillStyle = i % 2 ? 'rgba(255,107,139,.09)' : 'rgba(94,230,255,.08)';
        for (let yy = py + s / 2; yy < py + ph; yy += s) for (let xx = px + s / 2 + ((yy / s) % 2) * s / 2; xx < px + pw; xx += s) {
          const d = Math.hypot(xx - fx, yy - fy) / Math.max(pw, ph); const r = Math.max(0, (1 - d * 1.6)) * s * .42 * f;
          if (r > .3) { ctx.beginPath(); ctx.arc(xx, yy, r, 0, 7); ctx.fill(); }
        }
        ctx.restore();
        // border drawn progressively
        const per = 2 * (pw + ph), lenp = per * f;
        ctx.strokeStyle = 'rgba(240,235,220,.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py);
        const pts = [[px + pw, py], [px + pw, py + ph], [px, py + ph], [px, py]]; let acc = 0, cur = [px, py];
        for (const q of pts) { const seg = Math.hypot(q[0] - cur[0], q[1] - cur[1]); if (acc + seg <= lenp) { ctx.lineTo(...q); acc += seg; cur = q; } else { const r = (lenp - acc) / seg; ctx.lineTo(lerp(cur[0], q[0], r), lerp(cur[1], q[1], r)); break; } }
        ctx.stroke(); ctx.lineWidth = 1;
      });
      // a faint balloon in panel 2
      if (draw > 2) { const bx = L + .8 * PW, by = T + .16 * PH; ctx.strokeStyle = 'rgba(240,235,220,.18)'; ctx.beginPath(); ctx.ellipse(bx, by, 46, 24, 0, 0, 7); ctx.moveTo(bx - 10, by + 22); ctx.lineTo(bx - 22, by + 40); ctx.lineTo(bx + 2, by + 23); ctx.stroke(); ctx.fillStyle = 'rgba(240,235,220,.18)'; ctx.font = 'bold 13px JetBrains Mono, monospace'; ctx.textAlign = 'center'; ctx.fillText('. . .', bx, by + 4); ctx.textAlign = 'left'; }
    },
    music(ctx, W, H, t, p, v, st) {
      // staff on the right, notes drifting left, plus a spectrum along the bottom
      const sy = H * .3, g = 14, x0 = W < 800 ? 0 : W * .56;
      ctx.strokeStyle = 'rgba(167,139,250,.12)';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x0, sy + i * g); ctx.lineTo(W, sy + i * g); ctx.stroke(); }
      const r = rng(2);
      for (let i = 0; i < 16; i++) {
        const sp = 40, x = W - ((t * sp + i * (W - x0) / 16 + p * 300) % (W - x0)), pos = Math.floor(r() * 9), y = sy + 4 * g - pos * g / 2;
        const a = clamp((x - x0) / 80, 0, 1) * .4;
        ctx.fillStyle = `rgba(196,181,253,${a})`; ctx.strokeStyle = `rgba(196,181,253,${a})`;
        ctx.beginPath(); ctx.ellipse(x, y, 5.5, 4, -.4, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 5, y); ctx.lineTo(x + 5, y - 30); ctx.stroke();
      }
      const n = 64, bw = W / n, energy = .25 + Math.min(1.2, Math.abs(v) / 25);
      for (let i = 0; i < n; i++) {
        const f = (Math.sin(t * 3 + i * .45) * .5 + .5) * (Math.sin(t * 1.7 + i * .13) * .5 + .5) * Math.exp(-i / 40);
        const h = f * H * .22 * energy + 2;
        ctx.fillStyle = `rgba(167,139,250,${.06 + f * .12})`; ctx.fillRect(i * bw + 1, H - h, bw - 2, h);
      }
      // oscilloscope
      ctx.strokeStyle = 'rgba(94,230,255,.18)'; ctx.beginPath();
      for (let x = 0; x <= W; x += 4) { const y = H * .72 + Math.sin(x * .03 + t * 4) * 10 * energy * Math.sin(x * .004 + t); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    },
    tech2(ctx, W, H, t, p, v, st) {
      // glyphs from the languages Amaan speaks, rising slowly
      if (!st.g) { const r = rng(12), chars = 'अआकखगघचजटडतदनपबमयरलवशसह અકગજતદનપમરલવસ ابپتجدرسشعفقکگلمنوهی AÄBCDÉFGHÑOÖSßUÜ'.replace(/ /g, ''); st.g = [...Array(70)].map(() => ({ c: chars[Math.floor(r() * chars.length)], x: r(), y: r(), s: 12 + r() * 26, sp: .01 + r() * .02 })); }
      ctx.textAlign = 'center';
      st.g.forEach(o => {
        const y = ((o.y - t * o.sp - p * .3) % 1 + 1) % 1;
        ctx.font = `${o.s}px serif`; ctx.fillStyle = `rgba(255,181,71,${(.04 + .1 * Math.sin(y * Math.PI)).toFixed(3)})`;
        ctx.fillText(o.c, o.x * W * .55 + 20, y * H);
      });
      ctx.textAlign = 'left';
    },
    stars(ctx, W, H, t, p, v, st) {
      if (!st.s) { const r = rng(5); st.s = [...Array(260)].map(() => ({ x: r() - .5, y: r() - .5, z: r() })); }
      const speed = .04 + p * .5, cx = W * .7, cy = H * .5;
      st.s.forEach(s => {
        s.z -= speed * (1 / 60); if (s.z <= .02) { s.z = 1; }
        const k = 1 / s.z, x = cx + s.x * W * k * .5, y = cy + s.y * H * k * .5;
        const pk = 1 / (s.z + speed * .08), px = cx + s.x * W * pk * .5, py = cy + s.y * H * pk * .5;
        ctx.strokeStyle = `rgba(223,230,255,${(1 - s.z) * .5})`; ctx.lineWidth = (1 - s.z) * 1.8; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      });
    },
  };

  document.querySelectorAll('.chapter').forEach(sec => {
    const cv = sec.querySelector(':scope > canvas');
    const C = fitCanvas(cv);
    const fx = FX[sec.dataset.fx];
    const st = {};
    loopWhileVisible(sec, (dt, t) => {
      const r = sec.getBoundingClientRect();
      const p = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
      const ctx = C.ctx; ctx.clearRect(0, 0, C.w, C.h);
      ctx.save(); fx(ctx, C.w, C.h, t, p, vel, st); ctx.restore();
      // soft fade at section edges so effects never hard-cut
      const g = ctx.createLinearGradient(0, 0, 0, C.h);
      g.addColorStop(0, 'rgba(4,5,7,1)'); g.addColorStop(.12, 'rgba(4,5,7,0)'); g.addColorStop(.88, 'rgba(4,5,7,0)'); g.addColorStop(1, 'rgba(4,5,7,1)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, C.w, C.h);
    });
  });

  /* ---------------- CONTINUE? countdown ---------------- */
  const cd = document.getElementById('countdown');
  let n = 9, started = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !started) {
      started = true;
      const iv = setInterval(() => { n--; cd.textContent = n > 0 ? n : 'YES ▶'; if (n <= 0) clearInterval(iv); }, 900);
    }
  }, { threshold: 1 }).observe(cd);
})();
