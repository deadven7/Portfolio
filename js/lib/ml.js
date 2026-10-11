/* Tiny in-browser ML used by the labs: seeded splits, scaling, logistic / softmax regression, CART trees, random forests, kNN. */
(function () {
  const ML = {};
  ML.rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  ML.split = (n, frac, seed = 42) => { const r = ML.rng(seed), idx = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } const k = Math.round(n * frac); return [idx.slice(0, k), idx.slice(k)]; };
  ML.scaler = X => { const d = X[0].length, mu = Array(d).fill(0), sd = Array(d).fill(0); X.forEach(x => x.forEach((v, j) => mu[j] += v / X.length)); X.forEach(x => x.forEach((v, j) => sd[j] += (v - mu[j]) ** 2 / X.length)); sd.forEach((v, j) => sd[j] = Math.sqrt(v) || 1); return { mu, sd, t: x => x.map((v, j) => (v - mu[j]) / sd[j]) }; };
  const sig = z => 1 / (1 + Math.exp(-z));
  ML.logistic = (X, y, { epochs = 300, lr = .3, l2 = 1e-3 } = {}) => {
    const d = X[0].length, w = Array(d).fill(0); let b = 0;
    for (let e = 0; e < epochs; e++) { const gw = Array(d).fill(0); let gb = 0;
      for (let i = 0; i < X.length; i++) { const p = sig(b + X[i].reduce((s, v, j) => s + v * w[j], 0)), g = p - y[i]; gb += g; for (let j = 0; j < d; j++) gw[j] += g * X[i][j]; }
      b -= lr * gb / X.length; for (let j = 0; j < d; j++) w[j] -= lr * (gw[j] / X.length + l2 * w[j]); }
    return { w, b, p: x => sig(b + x.reduce((s, v, j) => s + v * w[j], 0)) };
  };
  ML.softmax = (X, y, K, { epochs = 250, lr = .5, l2 = 1e-4 } = {}) => {
    const d = X[0].length, W = [...Array(K)].map(() => Array(d).fill(0)), b = Array(K).fill(0);
    const probs = x => { const z = W.map((w, k) => b[k] + x.reduce((s, v, j) => s + v * w[j], 0)), m = Math.max(...z), e = z.map(v => Math.exp(v - m)), S = e.reduce((a, c) => a + c, 0); return e.map(v => v / S); };
    for (let e = 0; e < epochs; e++) { const gW = W.map(() => Array(d).fill(0)), gb = Array(K).fill(0);
      for (let i = 0; i < X.length; i++) { const p = probs(X[i]); for (let k = 0; k < K; k++) { const g = p[k] - (y[i] === k ? 1 : 0); gb[k] += g; for (let j = 0; j < d; j++) gW[k][j] += g * X[i][j]; } }
      for (let k = 0; k < K; k++) { b[k] -= lr * gb[k] / X.length; for (let j = 0; j < d; j++) W[k][j] -= lr * (gW[k][j] / X.length + l2 * W[k][j]); } }
    return { W, b, probs, predict: x => { const p = probs(x); return p.indexOf(Math.max(...p)); } };
  };
  // CART: task 'cls' (gini, K classes) or 'reg' (variance)
  ML.tree = (X, y, { task = 'cls', K = 2, depth = 6, minLeaf = 3, mtry = null, r = Math.random, idx = null } = {}) => {
    const d = X[0].length;
    const leaf = ids => { if (task === 'reg') return { v: ids.reduce((s, i) => s + y[i], 0) / ids.length, n: ids.length }; const c = Array(K).fill(0); ids.forEach(i => c[y[i]]++); return { v: c.map(x => x / ids.length), n: ids.length }; };
    const imp = (sum, sq, cnt, n) => task === 'reg' ? sq - sum * sum / n : n - cnt.reduce((s, c) => s + c * c, 0) / n;
    function grow(ids, dep) {
      if (dep >= depth || ids.length < 2 * minLeaf) return leaf(ids);
      let best = null; const feats = mtry ? [...Array(d).keys()].sort(() => r() - .5).slice(0, mtry) : [...Array(d).keys()];
      for (const j of feats) {
        const o = ids.slice().sort((a, b) => X[a][j] - X[b][j]); let ls = 0, lq = 0, lc = Array(K).fill(0), ts = 0, tq = 0, tc = Array(K).fill(0);
        o.forEach(i => { if (task === 'reg') { ts += y[i]; tq += y[i] * y[i]; } else tc[y[i]]++; });
        const base = imp(ts, tq, tc, o.length);
        for (let k = 0; k < o.length - 1; k++) { const i = o[k]; if (task === 'reg') { ls += y[i]; lq += y[i] * y[i]; } else lc[y[i]]++;
          if (k + 1 < minLeaf || o.length - k - 1 < minLeaf || X[o[k]][j] === X[o[k + 1]][j]) continue;
          const nl = k + 1, nr = o.length - nl, g = base - imp(ls, lq, lc, nl) - imp(ts - ls, tq - lq, tc.map((c, q) => c - lc[q]), nr);
          if (!best || g > best.g) best = { g, j, t: (X[o[k]][j] + X[o[k + 1]][j]) / 2 }; }
      }
      if (!best || best.g <= 1e-9) return leaf(ids);
      const L = ids.filter(i => X[i][best.j] <= best.t), Rr = ids.filter(i => X[i][best.j] > best.t);
      return { j: best.j, t: best.t, g: best.g, l: grow(L, dep + 1), r: grow(Rr, dep + 1) };
    }
    const root = grow(idx || [...X.keys()], 0);
    const walk = x => { let n = root; while (n.l) n = x[n.j] <= n.t ? n.l : n.r; return n.v; };
    const gains = Array(d).fill(0); (function acc(n) { if (n.l) { gains[n.j] += n.g; acc(n.l); acc(n.r); } })(root);
    return { root, out: walk, gains };
  };
  ML.forest = (X, y, { trees = 25, task = 'cls', K = 2, depth = 8, minLeaf = 2, seed = 7 } = {}) => {
    const r = ML.rng(seed), d = X[0].length, mtry = task === 'reg' ? Math.max(1, Math.round(d / 3)) : Math.max(1, Math.round(Math.sqrt(d))), T = [];
    for (let t = 0; t < trees; t++) { const idx = X.map(() => Math.floor(r() * X.length)); T.push(ML.tree(X, y, { task, K, depth, minLeaf, mtry, r, idx })); }
    const out = x => { const o = T.map(t => t.out(x)); return task === 'reg' ? o.reduce((a, b) => a + b, 0) / o.length : o[0].map((_, k) => o.reduce((s, v) => s + v[k], 0) / o.length); };
    const gains = Array(d).fill(0); T.forEach(t => t.gains.forEach((g, j) => gains[j] += g)); const S = gains.reduce((a, b) => a + b, 0) || 1;
    return { out, importance: gains.map(g => g / S) };
  };
  ML.knn = (X, y, k = 5, task = 'cls', K = 2) => ({ out: x => { const d = X.map((p, i) => [p.reduce((s, v, j) => s + (v - x[j]) ** 2, 0), i]).sort((a, b) => a[0] - b[0]).slice(0, k); if (task === 'reg') return d.reduce((s, [, i]) => s + y[i], 0) / k; const c = Array(K).fill(0); d.forEach(([, i]) => c[y[i]]++); return c.map(v => v / k); }, near: (x, n) => X.map((p, i) => [p.reduce((s, v, j) => s + (v - x[j]) ** 2, 0), i]).sort((a, b) => a[0] - b[0]).slice(0, n).map(q => q[1]) });
  ML.argmax = a => a.indexOf(Math.max(...a));
  window.ML = ML;
})();
