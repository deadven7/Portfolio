/* Projects index: data-pipeline hero + filterable card grid */
(function () {
  const S = window.SITE;

  /* ---------------- hero: code rain + data pipeline ---------------- */
  const hero = document.getElementById('projHero');
  const C = fitCanvas(document.getElementById('pipeCanvas'));
  const SNIPPETS = [
    'df = df.dropna(subset=["Close"])', 'X = scaler.fit_transform(X)', 'model = LogisticRegression(penalty="l1")', 'km = KMeans(n_clusters=k).fit(V)',
    'rsi = 100 - 100 / (1 + rs)', 'opt = torch.optim.Adagrad(params, lr=0.01)', 'loss.backward(); opt.step()', 'tfidf = TfidfVectorizer(stop_words="english")',
    'sim = cosine_similarity(V[i], V)', 'fit <- auto.arima(pfe$Close)', 'adf.test(diff(log(pfe)))', 'w = minimize(-sharpe, w0, bounds=b)',
    'enc_v = ts.ckks_vector(context, v)', 'noisy = image + np.random.normal(0, sigma, image.shape)', 'model.most_similar(positive=[w])', 'glm(label ~ ., family = "binomial")',
    'cv.glmnet(x, y, alpha = 1)', 'regimes = KMeans(n_clusters=3).fit_predict(X)', 'count = CountVectorizer().fit_transform(df["soup"])', 'checkresiduals(fit)',
  ];
  const R = rng(17);
  const cols = [];
  function buildCols() {
    cols.length = 0;
    const cw = 230;
    for (let x = 10; x < C.w; x += cw) cols.push({ x, off: R() * 1000, sp: 8 + R() * 14, lines: [...Array(40)].map(() => SNIPPETS[Math.floor(R() * SNIPPETS.length)]) });
  }
  const N = 420;
  const parts = [...Array(N)].map(() => ({ x: R(), lane: R(), k: Math.floor(R() * 3), n1: R() * 2 - 1, n2: R(), sp: 0.03 + R() * 0.035, bad: R() < 0.1, ph: R() * 6.28 }));
  const out = []; // insight series
  let mouse = null;
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; });
  hero.addEventListener('pointerleave', () => mouse = null);
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const STAGES = ['raw', 'clean', 'features', 'model', 'insight'];
  const KC = ['#7cffb2', '#5ee6ff', '#ffb547'];
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

  loopWhileVisible(hero, (dt, t) => {
    const ctx = C.ctx, W = C.w, H = C.h;
    if (!cols.length || cols.W !== W) { buildCols(); cols.W = W; }
    ctx.clearRect(0, 0, W, H);
    // code rain
    ctx.font = '11.5px JetBrains Mono, monospace';
    cols.forEach(c => {
      const lh = 19, total = c.lines.length * lh, off = (c.off + t * c.sp) % total;
      c.lines.forEach((l, i) => { let y = i * lh - off; if (y < -lh) y += total; if (y > H) return; ctx.fillStyle = `rgba(140,155,180,${0.03 + 0.04 * Math.sin(i + t * .3) ** 2})`; ctx.fillText(l, c.x, y); });
    });
    // stage guides
    const top = Math.max(130, H * 0.2), span = H * 0.42;
    ctx.font = '11px JetBrains Mono, monospace';
    STAGES.forEach((s, i) => {
      const x = i * W / 5;
      if (i) { ctx.strokeStyle = 'rgba(140,155,180,.12)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(x + .5, top - 30); ctx.lineTo(x + .5, top + span + 30); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = 'rgba(124,255,178,.55)'; ctx.fillText(`0${i + 1}`, x + 12, top - 34); ctx.fillStyle = 'rgba(200,210,225,.5)'; ctx.fillText(s, x + 34, top - 34);
    });
    // centroids for model stage
    const cents = [[0.25, 0.22], [0.5, 0.75], [0.8, 0.35]].map(([a, b]) => [a, top + b * span]);
    // particles
    for (const p of parts) {
      p.x += p.sp * dt * (mouse && Math.abs(mouse.y - (top + p.lane * span)) < 80 ? 1.8 : 1);
      if (p.x > 1) { p.x -= 1; p.bad = R() < 0.1; }
      const s = p.x * 5; // 0..5
      const X = p.x * W;
      const yRaw = top + span * (0.5 + p.n1 * 0.48) + Math.sin(t * 3 + p.ph) * 6;
      const yClean = top + p.lane * span;
      const yFeat = top + (Math.round(p.lane * 9) / 9) * span;
      const c = cents[p.k], orb = 22 + p.n2 * 20;
      const yModel = c[1] + Math.sin(t * 1.5 + p.ph) * orb * .6;
      const yOut = top + span * (0.75 - 0.5 * ((p.x - 0.8) / 0.2) - 0.08 * Math.sin((p.x * 30) + p.k)) ;
      let y = yRaw;
      y = lerp(y, yClean, sstep(0.85, 1.15, s));
      y = lerp(y, yFeat, sstep(1.85, 2.15, s));
      y = lerp(y, yModel, sstep(2.8, 3.25, s));
      y = lerp(y, yOut, sstep(3.85, 4.2, s));
      let alpha = 0.85, color = '#9aa6b8', r = 2;
      if (p.bad) { color = '#ff6b8b'; alpha *= 1 - sstep(0.7, 1.05, s); }
      if (s > 1.85) color = KC[Math.floor(p.lane * 3) % 3];
      if (s > 2.9) color = KC[p.k];
      if (s > 4) { r = 1.4; alpha = 0.5 + 0.4 * sstep(4, 5, s); }
      if (mouse) { const d = Math.hypot(mouse.x - X, mouse.y - y); if (d < 70) { y += (y - mouse.y) / d * (70 - d) * 0.5; } }
      if (alpha <= 0.02) continue;
      ctx.fillStyle = hexA(color, alpha);
      ctx.fillRect(X - r, y - r, r * 2, r * 2);
      if (s > 2.15 && s < 2.85) { ctx.fillStyle = hexA(color, .08); ctx.fillRect(X - 6, y - 1, 12, 2); }
    }
    // model stage: centroid crosses
    cents.forEach(([cx, cy], i) => { const x = (3 + cx) * W / 5; ctx.strokeStyle = hexA(KC[i], .7); ctx.beginPath(); ctx.moveTo(x - 6, cy); ctx.lineTo(x + 6, cy); ctx.moveTo(x, cy - 6); ctx.lineTo(x, cy + 6); ctx.stroke(); });
    // insight stage: accumulating chart
    if (!out.length || t - out.t > 0.12) { out.push(0.5 + 0.25 * Math.sin(t * .7) + 0.15 * Math.sin(t * 1.9) + (R() - .5) * .1); out.t = t; if (out.length > 60) out.shift(); }
    ctx.strokeStyle = 'rgba(124,255,178,.7)'; ctx.lineWidth = 1.5; ctx.beginPath();
    out.forEach((v, i) => { const x = W * 0.81 + (i / 59) * W * 0.17, y = top + span + 70 - v * 60; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke(); ctx.lineWidth = 1;
  });

  /* ---------------- filters + cards ---------------- */
  const fwrap = document.getElementById('filters');
  const grid = document.getElementById('allCards');
  Object.entries(S.categories).forEach(([k, label], i) => {
    const b = document.createElement('button'); b.textContent = label; b.dataset.k = k; if (!i) b.classList.add('on');
    b.addEventListener('click', () => {
      fwrap.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on');
      grid.querySelectorAll('.pcard').forEach(c => c.classList.toggle('hide', k !== 'all' && !c.dataset.cat.split(' ').includes(k)));
    });
    fwrap.append(b);
  });
  S.projects.forEach((p, i) => {
    const a = document.createElement('article');
    a.className = `pcard reveal d${(i % 3) + 1}`; a.dataset.cat = p.cat.join(' '); if (p.theme) a.dataset.theme = p.theme;
    a.innerHTML = `<div class="viz"><canvas></canvas><span class="tag">${p.domain || p.cat.map(c => S.categories[c]).join(' · ')}</span></div>
      <div class="body"><h3>${p.title}</h3><p class="plain">${p.plain || p.tagline}</p><p class="tline">${p.tagline}</p>
      <div class="foot"><span class="yr">${p.year} · ${p.stack.slice(0, 2).join(' · ')}</span><a class="btn sm" href="project.html?p=${p.slug}#lab">open lab <span class="arr">→</span></a></div></div>`;
    a.classList.add('linked'); a.addEventListener('click', e => { if (!e.target.closest('a')) location.href = `project.html?p=${p.slug}#lab`; }); grid.append(a); observeReveal(a);
    miniViz(p.slug, a.querySelector('canvas'));
  });
})();
