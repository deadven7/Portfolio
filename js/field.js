/* One continuous background behind every home section below the hero.
   The same handful of points re-arrange themselves as you scroll — the page's own "data, demystified":
   about → drifting flow, projects → clusters forming, work → a time series, certifications → a constellation. */
(function () {
  const cv = document.getElementById('field'); if (!cv) return;
  const hero = document.getElementById('hero');
  const secs = [...document.querySelectorAll('[data-motif]')];
  const ctx = cv.getContext('2d');
  const small = innerWidth < 720, N = small ? 80 : 150, DPR = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75);
  let W = 0, H = 0;
  const fit = () => { W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
  addEventListener('resize', fit); fit();
  const r = rng(21);
  const P = [...Array(N)].map((_, i) => ({ u: r(), v: r(), s: .6 + r() * .8, ph: r() * 6.283, k: i % 5, x: r() * W, y: r() * H, px: 0, py: 0, rank: i / N }));
  const ACC = '124,255,178', CY = '94,230,255', AM = '255,181,71', VI = '167,139,250';
  const KC = [ACC, CY, AM, VI, '255,107,139'];
  const CENT = [[.12, .3], [.88, .25], [.86, .75], [.15, .78], [.5, .12]];
  // smooth 1-D noise for the series motif
  const sm = x => Math.sin(x * 1.3) * .5 + Math.sin(x * .57 + 1.7) * .35 + Math.sin(x * 2.9 + .4) * .15;
  const SY = (x, t) => H * .84 + sm(x / W * 5 + t * .05) * H * .07;
  const M = {
    flow: (p, t) => { const x = ((p.u * W * 1.2 + t * 14 * p.s) % (W * 1.2)) - W * .1; return [x, H * (.08 + p.v * .84) + Math.sin(x * .004 + t * .25 + p.v * 9) * 46]; },
    clusters: (p, t) => { const c = CENT[p.k], a = p.ph + t * .12 * p.s, rad = (18 + p.v * 70) * (small ? .7 : 1); return [c[0] * W + Math.cos(a) * rad, c[1] * H + Math.sin(a) * rad * .8]; },
    series: (p, t) => { const span = W * 1.15, x = ((p.rank * span - t * 22) % span + span) % span - W * .075; return [x, SY(x, t)]; },
    constellation: (p, t) => [W * (.04 + p.u * .92) + Math.sin(t * .2 + p.ph) * 6, H * (.06 + p.v * .88) + Math.cos(t * .17 + p.ph) * 6],
  };
  const keys = Object.keys(M), w = Object.fromEntries(keys.map(k => [k, k === 'flow' ? 1 : 0]));
  let vis = 0, last = 0, t0 = performance.now();
  function weights() {
    const mid = H * .5, raw = {}; keys.forEach(k => raw[k] = 0);
    secs.forEach(s => { const b = s.getBoundingClientRect(); const d = b.top > mid ? b.top - mid : b.bottom < mid ? mid - b.bottom : 0; raw[s.dataset.motif] += Math.max(0, 1 - d / (H * .45)); });
    const S = keys.reduce((a, k) => a + raw[k], 0) || 1; keys.forEach(k => w[k] = lerp(w[k], raw[k] / S, .06));
    const hb = hero.getBoundingClientRect(); vis = lerp(vis, clamp((H * .75 - hb.bottom) / (H * .5) + .15, 0, 1), .08);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || now - last < 33) return; last = now;
    weights();
    cv.style.opacity = vis.toFixed(3);
    if (vis < .01) return;
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    // move every point toward the blend of the motifs on screen
    for (const p of P) { let tx = 0, ty = 0; for (const k of keys) if (w[k] > .002) { const [a, b] = M[k](p, t); tx += a * w[k]; ty += b * w[k]; }
      // points that wrap around (flow / series) jump; ease others
      p.px = p.x; p.py = p.y; const jump = Math.abs(tx - p.x) > W * .5; p.x = jump ? tx : lerp(p.x, tx, .07); p.y = jump ? ty : lerp(p.y, ty, .07); if (jump) { p.px = p.x; p.py = p.y; } }
    const edge = x => .45 + .55 * Math.min(1, Math.abs(x / W - .5) * 2.4); // quieter behind the text column
    // flow: short streaks along each point's motion
    if (w.flow > .02) { ctx.lineCap = 'round'; for (const p of P) { const dx = p.x - p.px, dy = p.y - p.py, L = Math.hypot(dx, dy); if (L > 40) continue; ctx.strokeStyle = `rgba(${CY},${(.32 * w.flow * edge(p.x)).toFixed(3)})`; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - dx * 9, p.y - dy * 9); ctx.stroke(); } }
    // clusters: spokes to each centroid and a centroid cross
    if (w.clusters > .02) { ctx.lineWidth = 1; for (const p of P) { const c = CENT[p.k]; ctx.strokeStyle = `rgba(${KC[p.k]},${(.07 * w.clusters).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c[0] * W, c[1] * H); ctx.stroke(); }
      CENT.forEach(([cx, cy], k) => { ctx.strokeStyle = `rgba(${KC[k]},${(.5 * w.clusters).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(cx * W - 6, cy * H); ctx.lineTo(cx * W + 6, cy * H); ctx.moveTo(cx * W, cy * H - 6); ctx.lineTo(cx * W, cy * H + 6); ctx.stroke(); }); }
    // series: one line through the points in time order, with a soft band
    if (w.series > .02) { const xs = []; for (let x = -10; x <= W + 10; x += 8) xs.push(x);
      ctx.fillStyle = `rgba(${ACC},${(.05 * w.series).toFixed(3)})`; ctx.beginPath(); xs.forEach((x, i) => { const y = SY(x, t) - 18 - 6 * Math.sin(x * .01 + t * .3); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], SY(xs[i], t) + 18 + 6 * Math.sin(xs[i] * .01 + t * .3)); ctx.fill();
      ctx.strokeStyle = `rgba(${ACC},${(.4 * w.series).toFixed(3)})`; ctx.lineWidth = 1.4; ctx.beginPath(); xs.forEach((x, i) => i ? ctx.lineTo(x, SY(x, t)) : ctx.moveTo(x, SY(x, t))); ctx.stroke();
      // the forecast: the last stretch, dashed
      ctx.setLineDash([4, 5]); ctx.strokeStyle = `rgba(${AM},${(.45 * w.series).toFixed(3)})`; ctx.beginPath(); for (let x = W * .82; x <= W + 10; x += 8) x === W * .82 ? ctx.moveTo(x, SY(x, t)) : ctx.lineTo(x, SY(x, t)); ctx.stroke(); ctx.setLineDash([]); }
    // constellation: link near neighbours
    if (w.constellation > .02) { ctx.lineWidth = .8; const R2 = (small ? 90 : 120) ** 2; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const a = P[i], b = P[j], d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2; if (d < R2) { ctx.strokeStyle = `rgba(${CY},${(.16 * (1 - d / R2) * w.constellation * edge(a.x)).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } } }
    // the points themselves
    for (const p of P) { const col = w.clusters > .5 ? KC[p.k] : ACC, tw = .55 + .45 * Math.sin(t * 1.4 + p.ph); ctx.fillStyle = `rgba(${col},${((.28 + .3 * w.constellation * tw) * edge(p.x)).toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4 + p.s * .8, 0, 6.283); ctx.fill(); }
  }
  if (!reducedMotion) requestAnimationFrame(frame); else { cv.style.opacity = .5; }
})();
