/* Home page */
(function () {
  const S = window.SITE;

  /* =====================================================
     HERO — typing terminal + desktop of floating windows
     ===================================================== */
  const hero = document.getElementById('hero');
  const canvas = document.getElementById('heroCanvas');
  const C = fitCanvas(canvas);
  const R = rng(7);
  let intensity = 0.15;              // grows as text is typed
  const wins = [];
  const PALETTE = ['#7cffb2', '#5ee6ff', '#ffb547', '#a78bfa', '#ff6b8b'];
  const TYPES = ['code', 'loss', 'scatter', 'progress', 'bars', 'matrix', 'terminal'];
  const TITLES = { code: ['train.py', 'features.py', 'model.R', 'pipeline.ts', 'query.sql'], loss: ['loss.png', 'val_curve', 'training…'], scatter: ['kmeans.ipynb', 'embeddings', 'clusters'], progress: ['fetching data', 'pip install', 'docker build'], bars: ['hist(returns)', 'feature_importance', 'eda.ipynb'], matrix: ['attention', 'corr_matrix', 'confusion'], terminal: ['zsh', 'bash — 80×24', 'python3'] };

  function spawn(t) {
    const W = C.w, H = C.h, mobile = W < 720;
    const type = TYPES[Math.floor(R() * TYPES.length)];
    const w = (mobile ? 150 : 210) + R() * (mobile ? 70 : 140);
    const h = w * (0.58 + R() * 0.25);
    const xMin = mobile ? -20 : W * 0.56;
    const x = xMin + R() * Math.max(10, W - xMin - w + 20);
    const y = 70 + R() * Math.max(10, H - h - 110);
    const seed = Math.floor(R() * 1e6);
    wins.push({ type, title: TITLES[type][Math.floor(R() * TITLES[type].length)], x, y, w, h, born: t, life: 7 + R() * 7, seed, color: PALETTE[Math.floor(R() * PALETTE.length)], vx: (R() - .5) * 6, vy: (R() - .5) * 4, depth: 0.4 + R() * 0.6 });
  }

  // cursor that wanders between windows and drags them
  const cur = { x: 0, y: 0, tx: 0, ty: 0, target: null, mode: 'seek', timer: 0, ox: 0, oy: 0, dragTo: null };
  let mouse = { x: 0.5, y: 0.5 };
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width; mouse.y = (e.clientY - r.top) / r.height; });

  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  function drawWin(ctx, wn, t) {
    const age = t - wn.born, life = wn.life;
    const open = clamp(age / 0.35, 0, 1), close = clamp((life - age) / 0.35, 0, 1);
    const k = Math.min(open, close);
    if (k <= 0) return;
    const ease = 1 - Math.pow(1 - k, 3);
    const px = (mouse.x - .5) * -18 * wn.depth, py = (mouse.y - .5) * -12 * wn.depth;
    ctx.save();
    ctx.translate(wn.x + wn.w / 2 + px, wn.y + wn.h / 2 + py);
    ctx.scale(0.88 + 0.12 * ease, 0.88 + 0.12 * ease);
    ctx.translate(-wn.w / 2, -wn.h / 2);
    ctx.globalAlpha = ease * (0.32 + 0.4 * wn.depth);
    // frame
    roundRect(ctx, 0, 0, wn.w, wn.h, 9);
    ctx.fillStyle = 'rgba(12,16,24,.92)'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,140,170,.28)'; ctx.lineWidth = 1; ctx.stroke();
    // title bar
    ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(0, 0, wn.w, 22);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.globalAlpha *= 1; ctx.beginPath(); ctx.arc(11 + i * 12, 11, 3.6, 0, 7); ctx.fill(); });
    ctx.fillStyle = 'rgba(200,210,225,.6)'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'center'; ctx.fillText(wn.title, wn.w / 2, 14.5); ctx.textAlign = 'left';
    ctx.save(); ctx.beginPath(); ctx.rect(6, 26, wn.w - 12, wn.h - 32); ctx.clip();
    content(ctx, wn, age);
    ctx.restore();
    ctx.restore();
  }

  function content(ctx, wn, age) {
    const r = rng(wn.seed), W = wn.w, H = wn.h, x0 = 10, y0 = 30, cw = W - 20, ch = H - 38;
    const c = wn.color;
    switch (wn.type) {
      case 'code': {
        const n = Math.floor(age * 7), lh = 9;
        const maxL = Math.floor(ch / lh);
        const start = Math.max(0, n - maxL);
        for (let i = start; i < n; i++) {
          const rr = rng(wn.seed + i * 31); let x = x0 + (rr() < .3 ? 14 : 0) + (rr() < .15 ? 14 : 0);
          const y = y0 + (i - start) * lh;
          ctx.fillStyle = 'rgba(120,130,150,.5)'; ctx.fillRect(x0 - 2, y, 1, 5);
          const tokens = 2 + Math.floor(rr() * 5);
          for (let j = 0; j < tokens && x < W - 14; j++) {
            const tw = 6 + rr() * 28;
            ctx.fillStyle = [c, '#c9d1dc', '#5ee6ff', '#ffb547', '#c9d1dc'][Math.floor(rr() * 5)];
            ctx.globalAlpha *= 1; ctx.fillRect(x, y, Math.min(tw, W - 14 - x), 4.5);
            x += tw + 4;
          }
        }
        break;
      }
      case 'loss': {
        const n = Math.min(120, Math.floor(age * 30));
        ctx.strokeStyle = 'rgba(120,140,170,.25)';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + ch); ctx.lineTo(x0 + cw, y0 + ch); ctx.stroke();
        ['#7cffb2', '#ff6b8b'].forEach((col, s) => {
          ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath();
          const rr = rng(wn.seed + s);
          for (let i = 0; i < n; i++) {
            const v = Math.exp(-i / (25 + s * 15)) * (0.9 - s * .1) + 0.08 + s * 0.06 + (rr() - .5) * 0.05;
            const X = x0 + (i / 120) * cw, Y = y0 + ch - v * ch;
            i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
          }
          ctx.stroke();
        });
        break;
      }
      case 'scatter': {
        const k = 3, cents = [...Array(k)].map(() => [x0 + 15 + r() * (cw - 30), y0 + 12 + r() * (ch - 24)]);
        const conv = clamp(age / 4, 0, 1);
        for (let i = 0; i < 70; i++) {
          const g = i % k, sx = x0 + r() * cw, sy = y0 + r() * ch;
          const ang = r() * 6.28, rad = r() * 18;
          const tx = cents[g][0] + Math.cos(ang) * rad, ty = cents[g][1] + Math.sin(ang) * rad;
          ctx.fillStyle = conv > .3 ? PALETTE[g] : '#9aa6b8';
          ctx.beginPath(); ctx.arc(lerp(sx, tx, conv * conv), lerp(sy, ty, conv * conv), 1.8, 0, 7); ctx.fill();
        }
        break;
      }
      case 'progress': {
        for (let i = 0; i < 3; i++) {
          const y = y0 + 8 + i * (ch / 3.2);
          const p = clamp((age - i * 1.2) / (3 + r() * 3), 0, 1);
          ctx.fillStyle = 'rgba(200,210,225,.55)'; ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillText(['dataset.parquet', 'weights.bin', 'tokenizer.json'][i] + '  ' + Math.round(p * 100) + '%', x0, y);
          ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x0, y + 5, cw, 5);
          ctx.fillStyle = c; ctx.fillRect(x0, y + 5, cw * p, 5);
        }
        break;
      }
      case 'bars': {
        const n = 14, bw = cw / n;
        for (let i = 0; i < n; i++) {
          const target = Math.exp(-Math.pow((i - n / 2 + r() * 2) / 3.5, 2)) * 0.85 + 0.05;
          const v = target * clamp(age / 1.5, 0, 1) * (0.92 + 0.08 * Math.sin(age * 3 + i));
          ctx.fillStyle = c; ctx.globalAlpha *= 1; ctx.fillRect(x0 + i * bw + 1, y0 + ch - v * ch, bw - 2, v * ch);
        }
        break;
      }
      case 'matrix': {
        const n = 8, s = Math.min(cw, ch) / n, ox = x0 + (cw - s * n) / 2;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const v = (i === j ? .9 : r() * .5) * (0.6 + 0.4 * Math.sin(age * 2 + i * .7 + j));
          ctx.fillStyle = `rgba(94,230,255,${v.toFixed(2)})`; ctx.fillRect(ox + j * s + .5, y0 + i * s + .5, s - 1, s - 1);
        }
        break;
      }
      case 'terminal': {
        const n = Math.floor(age * 2.5), lh = 11, maxL = Math.floor(ch / lh);
        ctx.font = '9px JetBrains Mono, monospace';
        for (let i = Math.max(0, n - maxL); i < n; i++) {
          const y = y0 + 8 + (i - Math.max(0, n - maxL)) * lh;
          const loss = (Math.exp(-i / 9) * 1.8 + 0.12).toFixed(3);
          ctx.fillStyle = i % 5 === 4 ? c : 'rgba(200,210,225,.6)';
          ctx.fillText(i % 5 === 4 ? `✓ checkpoint saved (ep ${i + 1})` : `epoch ${String(i + 1).padStart(2, '0')}  loss ${loss}  acc ${(1 - loss / 2.2).toFixed(2)}`, x0, y);
        }
        break;
      }
    }
  }

  function drawCursor(ctx) {
    ctx.save(); ctx.translate(cur.x, cur.y); ctx.globalAlpha = .75;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.lineTo(4, 11.5); ctx.lineTo(7, 18); ctx.lineTo(9.5, 17); ctx.lineTo(6.5, 10.5); ctx.lineTo(11.5, 10.5); ctx.closePath();
    ctx.fillStyle = '#e7ebf2'; ctx.fill(); ctx.strokeStyle = '#06080c'; ctx.lineWidth = 1; ctx.stroke();
    if (cur.mode === 'drag') { ctx.strokeStyle = 'rgba(124,255,178,.6)'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.stroke(); }
    ctx.restore();
  }

  let nextSpawn = 0;
  const drawGrid = (ctx) => {
    ctx.strokeStyle = 'rgba(94,230,255,.035)'; ctx.lineWidth = 1;
    const s = 44;
    for (let x = 0; x < C.w; x += s) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, C.h); ctx.stroke(); }
    for (let y = 0; y < C.h; y += s) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(C.w, y + .5); ctx.stroke(); }
  };
  cur.x = C.w * .8; cur.y = C.h * .6;

  loopWhileVisible(hero, (dt, t) => {
    const ctx = C.ctx; ctx.clearRect(0, 0, C.w, C.h);
    drawGrid(ctx);
    const cap = Math.round(2 + intensity * (C.w < 720 ? 3 : 7));
    if (t > nextSpawn && wins.length < cap) { spawn(t); nextSpawn = t + 0.5 + R() * (1.6 - intensity); }
    for (let i = wins.length - 1; i >= 0; i--) {
      const w = wins[i];
      if (t - w.born > w.life) { wins.splice(i, 1); if (cur.target === w) { cur.target = null; cur.mode = 'seek'; } continue; }
      if (cur.target !== w || cur.mode !== 'drag') { w.x += w.vx * dt; w.y += w.vy * dt; }
    }
    wins.sort((a, b) => a.depth - b.depth).forEach(w => drawWin(ctx, w, t));

    // cursor behaviour
    if (!cur.target && wins.length) { cur.target = wins[Math.floor(R() * wins.length)]; cur.mode = 'seek'; }
    const w = cur.target;
    if (w) {
      if (cur.mode === 'seek') {
        cur.tx = w.x + w.w * 0.5; cur.ty = w.y + 11;
        cur.x = lerp(cur.x, cur.tx, 1 - Math.pow(0.02, dt)); cur.y = lerp(cur.y, cur.ty, 1 - Math.pow(0.02, dt));
        if (Math.hypot(cur.x - cur.tx, cur.y - cur.ty) < 3) { cur.mode = 'drag'; cur.timer = 0; cur.ox = cur.x - w.x; cur.oy = cur.y - w.y; cur.dragTo = [clamp(w.x + (R() - .5) * 220, C.w < 720 ? 0 : C.w * .5, C.w - w.w), clamp(w.y + (R() - .5) * 160, 70, C.h - w.h - 40)]; }
      } else if (cur.mode === 'drag') {
        cur.timer += dt;
        cur.x = lerp(cur.x, cur.dragTo[0] + cur.ox, 1 - Math.pow(0.08, dt)); cur.y = lerp(cur.y, cur.dragTo[1] + cur.oy, 1 - Math.pow(0.08, dt));
        w.x = cur.x - cur.ox; w.y = cur.y - cur.oy;
        if (cur.timer > 1.6) { cur.mode = 'rest'; cur.timer = 0; }
      } else { cur.timer += dt; if (cur.timer > 0.8) cur.target = null; }
    }
    drawCursor(ctx);
  });

  /* ---------- typing ---------- */
  const term = document.getElementById('termLines');
  const head = document.getElementById('headline');
  const sub = document.getElementById('heroSub');
  sub.textContent = S.hero.sub;
  const sleep = ms => new Promise(r => setTimeout(r, reducedMotion ? 0 : ms));
  async function typeInto(el, text, speed = 55) {
    for (const ch of text) { el.textContent += ch; await sleep(speed + Math.random() * speed * 0.8); intensity = Math.min(1, intensity + 0.012); }
  }
  async function run() {
    await sleep(500);
    const lines = [
      [S.hero.prelude[0], 'amaan vora · data scientist / ml engineer · new jersey'],
      [S.hero.prelude[1], null],
    ];
    for (const [cmd, out] of lines) {
      const ln = document.createElement('div'); ln.className = 'ln';
      ln.innerHTML = '<span class="p">❯ </span><span class="cmd"></span><span class="caret"></span>';
      term.append(ln);
      await typeInto(ln.querySelector('.cmd'), cmd, 45);
      await sleep(280);
      ln.querySelector('.caret').remove();
      if (out) { const o = document.createElement('div'); o.className = 'ln out'; o.textContent = out; term.append(o); await sleep(350); }
    }
    const l1 = document.createElement('span'), br = document.createElement('br'), l2 = document.createElement('span'), caret = document.createElement('span');
    l2.className = 'l2'; caret.className = 'caret';
    head.append(l1, caret);
    await typeInto(l1, S.hero.headline[0], 70);
    head.insertBefore(br, caret); head.insertBefore(l2, caret);
    await sleep(160);
    await typeInto(l2, S.hero.headline[1], 70);
    intensity = 1;
    hero.classList.add('done');
  }
  run();

  /* =====================================================
     ABOUT STRIP — drifting topographic contours
     ===================================================== */
  document.getElementById('aboutShort').textContent = S.aboutShort;
  const aboutSec = document.getElementById('about');
  const AC = fitCanvas(document.getElementById('aboutCanvas'));
  // smooth 3D value noise
  const P = new Uint8Array(512); { const p = [...Array(256).keys()]; const r = rng(3); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  function vnoise(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const h = (i, j, k) => P[P[P[X + i] + Y + j] + Z + k] / 255;
    return lerp(lerp(lerp(h(0, 0, 0), h(1, 0, 0), u), lerp(h(0, 1, 0), h(1, 1, 0), u), v), lerp(lerp(h(0, 0, 1), h(1, 0, 1), u), lerp(h(0, 1, 1), h(1, 1, 1), u), v), w);
  }
  const MS = { 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]] };
  loopWhileVisible(aboutSec, (dt, t) => {
    const ctx = AC.ctx, W = AC.w, H = AC.h, cs = W < 700 ? 16 : 20;
    ctx.clearRect(0, 0, W, H);
    const nx = Math.ceil(W / cs) + 1, ny = Math.ceil(H / cs) + 1, z = t * 0.06;
    const f = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) f[j * nx + i] = vnoise(i * 0.06, j * 0.06, z) * 0.7 + vnoise(i * 0.15, j * 0.15, z * 1.7) * 0.3;
    const levels = 10;
    for (let L = 1; L < levels; L++) {
      const th = L / levels;
      const hi = L === 5;
      ctx.strokeStyle = hi ? 'rgba(124,255,178,.22)' : `rgba(94,230,255,${0.05 + 0.06 * (L % 3 === 0)})`;
      ctx.lineWidth = hi ? 1.2 : 1;
      ctx.beginPath();
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = f[j * nx + i], b = f[j * nx + i + 1], c = f[(j + 1) * nx + i + 1], d = f[(j + 1) * nx + i];
        const idx = (a > th) | ((b > th) << 1) | ((c > th) << 2) | ((d > th) << 3);
        if (idx === 0 || idx === 15) continue;
        const x = i * cs, y = j * cs;
        const e = [
          [x + cs * (th - a) / (b - a), y], [x + cs, y + cs * (th - b) / (c - b)],
          [x + cs * (th - d) / (c - d), y + cs], [x, y + cs * (th - a) / (d - a)],
        ];
        const seg = MS[idx];
        for (const [p, q] of seg) { ctx.moveTo(e[p][0], e[p][1]); ctx.lineTo(e[q][0], e[q][1]); }
      }
      ctx.stroke();
    }
  });

  /* =====================================================
     FEATURED PROJECTS
     ===================================================== */
  const feat = document.getElementById('featured');
  S.featured.map(s => S.projects.find(p => p.slug === s)).forEach((p, i) => {
    const a = document.createElement('article');
    a.className = `pcard reveal d${i + 1}`;
    a.innerHTML = `<div class="viz"><canvas></canvas><span class="tag">live lab</span></div>
      <div class="body"><h3>${p.title}</h3><p>${p.tagline}</p>
      <div class="foot"><span class="yr">${p.year} · ${p.stack.slice(0, 2).join(' · ')}</span><a class="btn sm" href="project.html?p=${p.slug}">open project <span class="arr">→</span></a></div></div>`;
    feat.append(a); observeReveal(a);
    window.miniViz(p.slug, a.querySelector('canvas'));
  });

  /* =====================================================
     WORK TIMELINE
     ===================================================== */
  const tl = document.getElementById('timeline');
  S.work.forEach((w, i) => {
    const n = document.createElement('div');
    n.className = 'tnode';
    n.innerHTML = `<div class="above"><span class="dates">${w.dates}</span><span class="org">${w.org}</span><span class="role">${w.role}</span><div class="logo"><img src="${w.logo}" alt="${w.org} logo" loading="lazy"></div></div>
      <span class="stem"></span><span class="dot" style="transition-delay:${0.3 + i * 0.35}s"></span><div class="below" style="transition-delay:${0.5 + i * 0.35}s">${w.blurb}</div>`;
    tl.append(n);
  });
  observeReveal(tl);

  /* =====================================================
     CERTIFICATIONS + LIGHTBOX
     ===================================================== */
  const grid = document.getElementById('certGrid');
  const lb = document.getElementById('lightbox');
  S.certs.forEach((c, i) => {
    const d = document.createElement('button');
    d.className = `cert reveal d${(i % 3) + 1}`;
    d.style.padding = '0';
    d.setAttribute('aria-label', c.name);
    d.innerHTML = `<img src="${c.img}" alt="${c.name}" loading="lazy">`;
    d.addEventListener('pointermove', e => { const r = d.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; d.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-3px)`; });
    d.addEventListener('pointerleave', () => d.style.transform = '');
    d.addEventListener('click', () => { lb.querySelector('img').src = c.img; lb.querySelector('img').alt = c.name; lb.querySelector('figcaption').textContent = c.name; lb.classList.add('on'); });
    grid.append(d); observeReveal(d);
  });
  lb.addEventListener('click', () => lb.classList.remove('on'));
  addEventListener('keydown', e => { if (e.key === 'Escape') lb.classList.remove('on'); });
})();
