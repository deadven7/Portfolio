/* Professional Stockbroker Assistant — a JavaScript port of the notebook's pipeline
   (Professional_Stockbroker_Assistant.ipynb). Function names mirror the Python classes. */
DEMOS.stockbroker = async function (root, P) {
  const RAW = await loadJSON('assets/data/stocks.json');
  const ALL = ['PFE', 'JNJ', 'MRK', 'BMY', 'SYK'];
  const NAMES = { PFE: 'Pfizer', JNJ: 'Johnson & Johnson', MRK: 'Merck', BMY: 'Bristol-Myers Squibb', SYK: 'Stryker' };
  const D0 = RAW.PFE.d[0], D1 = RAW.PFE.d[RAW.PFE.d.length - 1];

  /* ================= numeric helpers ================= */
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const std = (a, ddof = 1) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - ddof)); };
  const rolling = (a, w, f) => a.map((_, i) => i < w - 1 ? NaN : f(a.slice(i - w + 1, i + 1)));
  const ewm = (a, span) => { const k = 2 / (span + 1); let e = a[0]; return a.map((v, i) => (e = i ? v * k + e * (1 - k) : v)); };
  const ffillBfill = (a, dflt = 0) => { const o = a.slice(); let last = NaN; for (let i = 0; i < o.length; i++) { if (isFinite(o[i])) last = o[i]; else o[i] = last; } let nxt = NaN; for (let i = o.length - 1; i >= 0; i--) { if (isFinite(o[i])) nxt = o[i]; else o[i] = nxt; } return o.map(v => isFinite(v) ? v : dflt); };
  function seeded(seed) { const r = rng(seed); return { u: r, n: () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); } }; }
  const pct = (v, d = 1) => (v >= 0 ? '+' : '') + (v * 100).toFixed(d) + '%';
  const money = v => '$' + Math.round(v).toLocaleString();

  /* ================= indicator functions (ports) ================= */
  const rolling_mean = (a, w) => rolling(a, w, mean);
  const rolling_std = (a, w) => rolling(a, w, x => std(x, 0)); // np.std → population
  function calculate_rsi(prices, window = 14) {
    const delta = prices.slice(1).map((v, i) => v - prices[i]);
    const gains = delta.map(d => d > 0 ? d : 0), losses = delta.map(d => d < 0 ? -d : 0);
    const ag = rolling_mean(gains, window), al = rolling_mean(losses, window);
    const rs = ag.map((g, i) => al[i] !== 0 ? g / al[i] : 0);
    return [50, ...rs.map(r => 100 - 100 / (1 + r))];
  }
  function calculate_macd(p) { const f = ewm(p, 12), s = ewm(p, 26), m = f.map((v, i) => v - s[i]), sig = ewm(m, 9); return [m, sig, m.map((v, i) => v - sig[i])]; }
  function calculate_bollinger_bands(p, w = 20, k = 2) { const sma = rolling_mean(p, w), sd = rolling_std(p, w); return [sma.map((m, i) => m + sd[i] * k), sma, sma.map((m, i) => m - sd[i] * k)]; }

  /* ================= Phase 1-2: DataLoader + FeatureEngineer ================= */
  function fetch_data(tickers, start, end) {
    const out = {};
    tickers.forEach(t => { const R = RAW[t], i0 = R.d.findIndex(d => d >= start); let i1 = R.d.length - 1; while (i1 > 0 && R.d[i1] > end) i1--;
      if (i0 < 0 || i1 - i0 < 30) return; const sl = k => R[k].slice(i0, i1 + 1);
      const c = sl('c'); out[t] = { d: sl('d'), o: sl('o'), h: sl('h'), l: sl('l'), c, v: sl('v').map(x => x * 1000), Returns: c.map((v, i) => i ? v / c[i - 1] - 1 : 0) }; });
    return out;
  }
  function create_technical_features(df) {
    const p = df.c, n = p.length;
    df.RSI = calculate_rsi(p); [df.MACD, df.MACD_Signal, df.MACD_Hist] = calculate_macd(p);
    [df.BB_Upper, df.BB_Middle, df.BB_Lower] = calculate_bollinger_bands(p);
    const tr = p.map((_, i) => i ? Math.max(df.h[i] - df.l[i], Math.abs(df.h[i] - p[i - 1]), Math.abs(df.l[i] - p[i - 1])) : df.h[0] - df.l[0]);
    df.ATR = rolling_mean(tr, Math.min(14, Math.floor(n / 2)));
    [5, 20, 60].forEach(w => { const aw = Math.min(w, Math.floor(n / 3)); if (aw >= 2) df['Volatility_' + w] = rolling(df.Returns, aw, x => std(x, 1)); });
    const vw = Math.min(20, Math.floor(n / 2)); df.Volume_MA = rolling_mean(df.v, vw); df.Volume_Ratio = df.v.map((v, i) => isFinite(df.Volume_MA[i]) ? v / df.Volume_MA[i] : NaN);
    df.Volume_Ratio = df.Volume_Ratio.map(v => isFinite(v) ? v : 1);
    [5, 20, 50, 200].forEach(w => { df['Price_MA_' + w] = rolling_mean(p, Math.min(w, Math.floor(n / 2))); });
    [5, 20].forEach(w => { df['ROC_' + w] = p.map((v, i) => i >= w ? v / p[i - w] - 1 : NaN); });
    const sw = Math.min(20, Math.floor(n / 2)); df.Support = rolling(df.l, sw, x => Math.min(...x)); df.Resistance = rolling(df.h, sw, x => Math.max(...x));
    ['RSI', 'MACD', 'MACD_Signal', 'MACD_Hist', 'BB_Upper', 'BB_Middle', 'BB_Lower', 'ATR', 'Volatility_5', 'Volatility_20', 'Volatility_60', 'Volume_MA', 'Volume_Ratio', 'Price_MA_5', 'Price_MA_20', 'Price_MA_50', 'Price_MA_200', 'ROC_5', 'ROC_20', 'Support', 'Resistance'].forEach(k => { if (df[k]) df[k] = ffillBfill(df[k], 0); });
    return df;
  }
  function kmeansPP(X, k, seed, nInit = 10) {
    let best = null;
    for (let run = 0; run < nInit; run++) {
      const r = rng(seed * 101 + run + 1); let C = [X[Math.floor(r() * X.length)].slice()];
      while (C.length < k) { const d = X.map(x => Math.min(...C.map(c => c.reduce((s, v, j) => s + (v - x[j]) ** 2, 0)))); const s = d.reduce((a, b) => a + b, 0); let u = r() * s, i = 0; while ((u -= d[i]) > 0 && i < X.length - 1) i++; C.push(X[i].slice()); }
      let lab = [];
      for (let it = 0; it < 100; it++) { const nl = X.map(x => { let b = 0, bd = Infinity; C.forEach((c, j) => { const dd = c.reduce((s, v, q) => s + (v - x[q]) ** 2, 0); if (dd < bd) { bd = dd; b = j; } }); return b; }); const same = nl.every((v, i) => v === lab[i]); lab = nl; C = C.map((c, j) => { const m = X.filter((_, i) => lab[i] === j); return m.length ? c.map((_, q) => mean(m.map(x => x[q]))) : c; }); if (same) break; }
      const inertia = X.reduce((s, x, i) => s + C[lab[i]].reduce((t, v, q) => t + (v - x[q]) ** 2, 0), 0);
      if (!best || inertia < best.inertia) best = { lab, inertia, C };
    }
    return best;
  }
  function detect_market_regimes(data) {
    const feats = ['Returns', 'RSI', 'Volume_Ratio']; // 'Volatility' is not a column, so the engine uses these three
    const rows = [], owner = [];
    Object.entries(data).forEach(([t, df]) => df.c.forEach((_, i) => { rows.push(feats.map(f => df[f][i])); owner.push([t, i]); }));
    const mu = feats.map((_, j) => mean(rows.map(r => r[j]))), sd = feats.map((_, j) => std(rows.map(r => r[j]), 0) || 1);
    const Z = rows.map(r => r.map((v, j) => (v - mu[j]) / sd[j]));
    const km = kmeansPP(Z, 3, 42, 10);
    Object.values(data).forEach(df => df.Market_Regime = new Array(df.c.length));
    km.lab.forEach((l, k) => { const [t, i] = owner[k]; data[t].Market_Regime[i] = l; });
    return km;
  }
  function create_correlation_features(data) {
    const spx = RAW.SPX, map = new Map(spx.d.map((d, i) => [d, i])), sr = spx.c.map((v, i) => i ? v / spx.c[i - 1] - 1 : NaN);
    Object.values(data).forEach(df => {
      const pairs = df.d.map((d, i) => [df.Returns[i], map.has(d) ? sr[map.get(d)] : NaN]);
      df.Market_Correlation = pairs.map((_, i) => { if (i < 19) return 0.5; const w = pairs.slice(i - 19, i + 1).filter(([a, b]) => isFinite(a) && isFinite(b)); if (w.length < 20) return 0.5; const a = w.map(x => x[0]), b = w.map(x => x[1]), ma = mean(a), mb = mean(b); const cov = a.reduce((s, v, k) => s + (v - ma) * (b[k] - mb), 0), va = a.reduce((s, v) => s + (v - ma) ** 2, 0), vb = b.reduce((s, v) => s + (v - mb) ** 2, 0); return va && vb ? cov / Math.sqrt(va * vb) : 0.5; });
    });
  }

  /* ================= Phase 3: Forecaster ================= */
  function create_forecasts(df, horizon = 5, seed = 7) {
    const prices = df.c, n = prices.length, cur = prices[n - 1];
    const recent_return = (prices[n - 1] / prices[n - 20] - 1) / 20, volatility = std(df.Returns.slice(-20), 1);
    const R = seeded(seed);
    // 1. _trend_forecast_realistic
    const y = prices.slice(-30), x = y.map((_, i) => i), mx = mean(x), my = mean(y);
    const sxy = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0), sxx = x.reduce((s, v) => s + (v - mx) ** 2, 0), syy = y.reduce((s, v) => s + (v - my) ** 2, 0);
    const slope = sxy / sxx, r2 = sxy * sxy / (sxx * syy);
    const Trend = [...Array(horizon)].map((_, k) => { const h = k + 1; return Math.max(cur + slope * r2 * h + R.n() * volatility * cur * Math.sqrt(h) * 0.1, cur * 0.5); });
    // 2. _mean_reversion_forecast
    const long_mean = mean(prices.slice(-60));
    const MeanReversion = [...Array(horizon)].map((_, k) => cur + (long_mean - cur) * (1 - Math.exp(-0.1 * (k + 1))));
    // 3. _exp_smoothing_forecast_enhanced (alpha .3, beta .1, from the first price)
    let level = prices[0], trend = prices[1] - prices[0];
    for (let i = 1; i < n; i++) { const pl = level; level = 0.3 * prices[i] + 0.7 * (level + trend); trend = 0.1 * (level - pl) + 0.9 * trend; }
    const ES = [...Array(horizon)].map((_, k) => level + (k + 1) * trend);
    // 4. _ma_forecast_enhanced
    const ma20 = mean(prices.slice(-20)), ma5 = mean(prices.slice(-5)), momentum = (ma5 - ma20) / ma20;
    const MA = [...Array(horizon)].map((_, k) => ma20 * (1 + momentum * 0.1 * (k + 1)));
    // 5. ARIMA is skipped when FAST_DEMO = True (as in the notebook) → weights renormalised by 0.9
    const W = { Trend: .3 / .9, MeanReversion: .2 / .9, ES: .25 / .9, MA: .15 / .9 };
    const F = { Trend, MeanReversion, ES, MA };
    const Ensemble = [...Array(horizon)].map((_, k) => Object.entries(W).reduce((s, [m, w]) => s + w * F[m][k], 0));
    return { ...F, Ensemble, meta: { slope, r2, long_mean, momentum, volatility, recent_return, level, trend } };
  }

  /* ================= Phase 4: MLPredictor (Random Forests, 50 trees as in FAST_DEMO) ================= */
  const ML_FEATS = ['RSI', 'MACD', 'MACD_Signal', 'MACD_Hist', 'Volatility_5', 'Volatility_20', 'Volume_Ratio', 'ROC_5', 'ROC_20', 'Market_Correlation', 'Market_Regime', 'Price_MA_5', 'Price_MA_20'];
  function buildTree(X, y, idx, opt, r, depth = 0) {
    const n = idx.length, isClf = opt.clf;
    const leafVal = () => isClf ? idx.reduce((s, i) => s + y[i], 0) / n : idx.reduce((s, i) => s + y[i], 0) / n;
    const imp = ids => { const m = ids.length; if (!m) return 0; const s = ids.reduce((a, i) => a + y[i], 0) / m; return isClf ? 2 * s * (1 - s) : ids.reduce((a, i) => a + (y[i] - s) ** 2, 0) / m; };
    const node = { v: leafVal(), n };
    if (depth >= opt.maxDepth || n < opt.minSplit || imp(idx) === 0) return node;
    const nf = X[0].length, k = isClf ? Math.max(1, Math.floor(Math.sqrt(nf))) : nf;
    const feats = [...Array(nf).keys()].sort(() => r() - .5).slice(0, k);
    const parent = imp(idx); let best = null;
    for (const f of feats) {
      const ord = idx.slice().sort((a, b) => X[a][f] - X[b][f]);
      let sL = 0, sqL = 0; const tot = ord.reduce((a, i) => a + y[i], 0), totSq = ord.reduce((a, i) => a + y[i] * y[i], 0);
      for (let j = 0; j < n - 1; j++) {
        const yi = y[ord[j]]; sL += yi; sqL += yi * yi;
        const nl = j + 1, nr = n - nl;
        if (nl < opt.minLeaf || nr < opt.minLeaf || X[ord[j]][f] === X[ord[j + 1]][f]) continue;
        let gl, gr;
        if (isClf) { const pl = sL / nl, pr = (tot - sL) / nr; gl = 2 * pl * (1 - pl); gr = 2 * pr * (1 - pr); }
        else { gl = sqL / nl - (sL / nl) ** 2; gr = (totSq - sqL) / nr - ((tot - sL) / nr) ** 2; }
        const gain = parent - (nl * gl + nr * gr) / n;
        if (!best || gain > best.gain) best = { gain, f, t: (X[ord[j]][f] + X[ord[j + 1]][f]) / 2, L: ord.slice(0, nl), R: ord.slice(nl) };
      }
    }
    if (!best || best.gain <= 1e-12) return node;
    opt.imp[best.f] += best.gain * n;
    node.f = best.f; node.t = best.t; node.l = buildTree(X, y, best.L, opt, r, depth + 1); node.r = buildTree(X, y, best.R, opt, r, depth + 1);
    return node;
  }
  const predTree = (t, x) => t.f === undefined ? t.v : predTree(x[t.f] <= t.t ? t.l : t.r, x);
  function forest(X, y, clf, nTrees, seed, params) {
    const r = rng(seed), imp = new Array(X[0].length).fill(0), trees = [];
    for (let k = 0; k < nTrees; k++) { const idx = X.map(() => Math.floor(r() * X.length)); trees.push(buildTree(X, y, idx, { clf, ...params, imp }, r)); }
    const tot = imp.reduce((a, b) => a + b, 0) || 1;
    return { predict: x => mean(trees.map(t => predTree(t, x))), importance: imp.map(v => v / tot) };
  }
  function train_models(df) {
    const n = df.c.length, rows = [];
    for (let i = 0; i < n - 1; i++) rows.push(i);
    const X = rows.map(i => ML_FEATS.map(f => df[f][i])), yP = rows.map(i => df.c[i + 1]), yD = rows.map(i => df.c[i + 1] > df.c[i] ? 1 : 0), yR = rows.map(i => df.c[i + 1] / df.c[i] - 1);
    const split = Math.floor(X.length * 0.8);
    const mu = ML_FEATS.map((_, j) => mean(X.slice(0, split).map(r => r[j]))), sd = ML_FEATS.map((_, j) => std(X.slice(0, split).map(r => r[j]), 0) || 1);
    const Z = X.map(r => r.map((v, j) => (v - mu[j]) / sd[j])), Ztr = Z.slice(0, split), Zte = Z.slice(split);
    const params = { maxDepth: Math.min(10, ML_FEATS.length), minSplit: Math.max(5, Math.floor(split / 20)), minLeaf: Math.max(2, Math.floor(split / 50)) };
    const rfP = forest(Ztr, yP.slice(0, split), false, 50, 42, params), rfD = forest(Ztr, yD.slice(0, split), true, 50, 43, params), rfR = forest(Ztr, yR.slice(0, split), false, 50, 44, params);
    const pp = Zte.map(rfP.predict), dprob = Zte.map(rfD.predict), dp = dprob.map(p => p > .5 ? 1 : 0), rp = Zte.map(rfR.predict);
    const yPt = yP.slice(split), yDt = yD.slice(split), yRt = yR.slice(split);
    return { split, params, idx: rows.slice(split), price_predictions: pp, direction_probabilities: dprob, test_actual_prices: yPt, test_dir: yDt,
      price_rmse: Math.sqrt(mean(pp.map((v, i) => (v - yPt[i]) ** 2))), price_mape: mean(pp.map((v, i) => Math.abs((yPt[i] - v) / yPt[i]))) * 100,
      direction_accuracy: mean(dp.map((v, i) => v === yDt[i] ? 1 : 0)), return_rmse: Math.sqrt(mean(rp.map((v, i) => (v - yRt[i]) ** 2))),
      feature_importance: Object.fromEntries(ML_FEATS.map((f, j) => [f, rfP.importance[j]])), base: Math.max(mean(yDt), 1 - mean(yDt)) };
  }

  /* ================= Phase 5: PortfolioOptimizer (_scipy_optimization_enhanced) ================= */
  function projectCapped(w, lo, hi) { // Euclidean projection onto {sum w = 1, lo ≤ w ≤ hi}
    let a = -10, b = 10; for (let it = 0; it < 80; it++) { const m = (a + b) / 2, s = w.reduce((t, v) => t + clamp(v - m, lo, hi), 0); if (s > 1) a = m; else b = m; }
    const m = (a + b) / 2; return w.map(v => clamp(v - m, lo, hi));
  }
  function optimize_portfolio(data, portfolio_value) {
    const T = Object.keys(data), n = T.length, len = Math.min(...T.map(t => data[t].Returns.length));
    const R = T.map(t => data[t].Returns.slice(-len));
    const mu = R.map(r => mean(r) * 252);
    const Sig = R.map((a, i) => R.map((b, j) => { const ma = mean(a), mb = mean(b); return a.reduce((s, v, k) => s + (v - ma) * (b[k] - mb), 0) / (len - 1) * 252 + (i === j ? 1e-6 : 0); }));
    const obj = w => { const r = w.reduce((s, v, i) => s + v * mu[i], 0); let v = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) v += w[i] * w[j] * Sig[i][j]; const vol = Math.sqrt(v); if (vol < 1e-6) return -r; return -(r / vol - w.reduce((s, x) => s + x * x, 0) * 0.1); };
    let method = 'Scipy Sharpe Optimization', w;
    if (n === 1) { w = [1]; method = 'Single Asset'; }
    else {
      const starts = [T.map(() => 1 / n), (() => { const iv = Sig.map((r, i) => 1 / Math.sqrt(r[i])); const s = iv.reduce((a, b) => a + b, 0); return iv.map(v => v / s); })(), (() => { const r = rng(9), x = T.map(() => r()); const s = x.reduce((a, b) => a + b, 0); return x.map(v => v / s); })()];
      const lo = 0.01, hi = Math.max(0.40, 1 / n);
      let best = null;
      starts.forEach(s => { let x = projectCapped(s, lo, hi), step = 0.05;
        for (let it = 0; it < 400; it++) { const f0 = obj(x), g = x.map((_, i) => { const e = x.slice(); e[i] += 1e-6; return (obj(e) - f0) / 1e-6; }); const xn = projectCapped(x.map((v, i) => v - step * g[i]), lo, hi); if (obj(xn) < f0) x = xn; else step *= 0.5; if (step < 1e-7) break; }
        if (!best || obj(x) < obj(best)) best = x; });
      w = best;
    }
    const weights = Object.fromEntries(T.map((t, i) => [t, w[i]]));
    const pr = [...Array(len).keys()].map(k => T.reduce((s, t, i) => s + w[i] * R[i][k], 0));
    const er = mean(pr) * 252, vol = std(pr, 1) * Math.sqrt(252);
    let total = 0; const allocations = {};
    T.forEach((t, i) => { const price = data[t].c[data[t].c.length - 1], tv = portfolio_value * w[i], sh = Math.max(0, Math.floor(tv / price)); total += sh * price; allocations[t] = { weight: w[i], target_value: tv, actual_value: sh * price, shares: sh, current_price: price, ret: mu[i], vol: Math.sqrt(Sig[i][i] - 1e-6) }; });
    // _generate_allocation_reasoning (individual rationale)
    const avgRet = mean(mu), avgVol = mean(R.map(r => std(r, 1) * Math.sqrt(252)));
    const reasoning = {}; T.forEach((t, i) => { const out = [], wt = w[i];
      out.push(wt > 0.25 ? `Major position (${(wt * 100).toFixed(1)}%) - high conviction allocation` : wt > 0.15 ? `Significant position (${(wt * 100).toFixed(1)}%) - core holding` : `Supporting position (${(wt * 100).toFixed(1)}%) - diversification benefit`);
      if (mu[i] > avgRet) out.push(`Above-average expected return (${(mu[i] * 100).toFixed(1)}% annual)`);
      const v = std(R[i], 1) * Math.sqrt(252); if (v < avgVol) out.push(`Below-average risk (${(v * 100).toFixed(1)}% volatility)`);
      reasoning[t] = out; });
    return { weights, expected_return: er, volatility: vol, sharpe_ratio: vol > 0 ? er / vol : 0, allocations, total_allocated: total, cash_remaining: portfolio_value - total, optimization_method: method, weight_concentration: w.reduce((s, v) => s + v * v, 0), reasoning, mu, Sig, T };
  }

  /* ================= Phase 6: RLTrader ================= */
  const STRATS = {
    conservative: { rsi_buy_threshold: 25, rsi_sell_threshold: 75, momentum_threshold: 0.015, position_size: 0.3, stop_loss: 0.05, take_profit: 0.08, hold_period: 10 },
    moderate: { rsi_buy_threshold: 30, rsi_sell_threshold: 70, momentum_threshold: 0.01, position_size: 0.5, stop_loss: 0.08, take_profit: 0.12, hold_period: 7 },
    aggressive: { rsi_buy_threshold: 35, rsi_sell_threshold: 65, momentum_threshold: 0.005, position_size: 0.8, stop_loss: 0.12, take_profit: 0.20, hold_period: 5 },
  };
  function simulate_trading(df, params, intended) {
    // state = [RSI, MACD, MACD_Signal, Volatility_20, Volume_Ratio, ROC_20, ...]; the notebook reads momentum = state[4], volume_ratio = state[3]
    const n = df.c.length, actions = [], positions = [], conf = [], reasons = [], pnl = [], trades = [];
    let pos = 0, entry = 0, hold = 0;
    for (let i = 0; i < n; i++) {
      const rsi = df.RSI[i], macd = df.MACD[i];
      const momentum = intended ? df.ROC_20[i] : df.Volume_Ratio[i];
      const volume_ratio = intended ? df.Volume_Ratio[i] : df.Volatility_20[i];
      let action = 0, reason = 'Hold - neutral conditions', c = 0.5;
      if (hold > 0) hold--;
      const buy = [], sell = [];
      if (rsi < params.rsi_buy_threshold) buy.push(`RSI oversold (${rsi.toFixed(1)})`);
      if (momentum > params.momentum_threshold) buy.push(`Positive momentum (${momentum.toFixed(3)})`);
      if (macd > 0) buy.push('MACD bullish');
      if (volume_ratio > 1.2) buy.push(`High volume (${volume_ratio.toFixed(1)}x)`);
      if (rsi > params.rsi_sell_threshold) sell.push(`RSI overbought (${rsi.toFixed(1)})`);
      if (momentum < -params.momentum_threshold) sell.push(`Negative momentum (${momentum.toFixed(3)})`);
      if (macd < 0) sell.push('MACD bearish');
      if (pos <= 0 && buy.length >= 2 && hold === 0) { action = 1; pos = params.position_size; entry = df.c[i]; hold = params.hold_period; reason = 'BUY - ' + buy.slice(0, 2).join(', '); c = Math.min(0.95, 0.5 + buy.length * 0.15); trades.push({ i, side: 'buy', px: df.c[i], reason }); }
      else if (pos > 0) {
        const ch = (df.c[i] - entry) / entry;
        if (ch >= params.take_profit) { action = -1; reason = `SELL - Take profit (${(ch * 100).toFixed(2)}%)`; c = 0.9; }
        else if (ch <= -params.stop_loss) { action = -1; reason = `SELL - Stop loss (${(ch * 100).toFixed(2)}%)`; c = 0.8; }
        else if (sell.length >= 2) { action = -1; reason = 'SELL - ' + sell.slice(0, 2).join(', '); c = Math.min(0.9, 0.5 + sell.length * 0.1); }
        if (action === -1) { pnl.push(ch); pos = 0; trades.push({ i, side: 'sell', px: df.c[i], reason, pnl: ch }); }
      }
      actions.push(action); positions.push(pos); conf.push(c * 100); reasons.push(reason);
    }
    const wins = pnl.filter(p => p > 0), losses = pnl.filter(p => p < 0);
    const res = { actions, positions, pnl, confidence_scores: conf, decision_reasons: reasons, trades, total_return: pnl.reduce((a, b) => a + b, 0), win_rate: pnl.length ? wins.length / pnl.length : 0, num_trades: pnl.length,
      avg_win: wins.length ? mean(wins) : 0, avg_loss: losses.length ? mean(losses) : 0, sharpe_ratio: pnl.length > 1 && std(pnl, 0) > 0 ? mean(pnl) / std(pnl, 0) : 0 };
    // get_trading_recommendations
    const recent = actions.slice(-10), avg = mean(recent); let last = 0; for (let k = recent.length - 1; k >= 0; k--) if (recent[k]) { last = recent[k]; break; }
    let rec = 'HOLD', base = 0.5; if (avg > 0.1 || last === 1) { rec = 'BUY'; base = 0.6; } else if (avg < -0.1 || last === -1) { rec = 'SELL'; base = 0.6; }
    let boost = 0; if (res.total_return > 0.05) boost += 0.2; else if (res.total_return > 0.02) boost += 0.1; else if (res.total_return < -0.05) boost -= 0.2;
    if (res.win_rate > 0.6) boost += 0.1; else if (res.win_rate < 0.4) boost -= 0.1;
    res.rec = { action: rec, confidence: Math.max(0.1, Math.min(0.95, base + boost)) };
    return res;
  }

  /* ================= Phase 7: StressTester ================= */
  const SCEN = {
    market_crash: { name: 'Market Crash (-20%)', return_shock: -0.20, vol_multiplier: 2.5, description: 'Severe market downturn similar to COVID-19 or 2008 crisis' },
    volatility_spike: { name: 'Volatility Spike (3x)', return_shock: -0.02, vol_multiplier: 3.0, description: 'Extreme market uncertainty with high volatility but minimal price change' },
    mild_correction: { name: 'Mild Correction (-10%)', return_shock: -0.10, vol_multiplier: 1.5, description: 'Standard market correction, healthy pullback' },
    bull_rally: { name: 'Bull Rally (+15%)', return_shock: 0.15, vol_multiplier: 0.8, description: 'Strong bull market with reduced volatility' },
    stagflation: { name: 'Stagflation Scenario', return_shock: -0.05, vol_multiplier: 2.0, description: 'High inflation with stagnant growth' },
  };
  const percentile = (a, q) => { const s = a.slice().sort((x, y) => x - y), pos = (s.length - 1) * q / 100, lo = Math.floor(pos); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo); };
  const impact = r => r < -0.15 ? 'Severe' : r < -0.08 ? 'Moderate' : r < -0.03 ? 'Mild' : r > 0.08 ? 'Very Positive' : 'Neutral';
  function run_stress_tests(data, weights) {
    const out = {};
    Object.entries(SCEN).forEach(([k, sp]) => {
      let pr = 0, pv = 0, pvar = 0; const ind = {};
      Object.entries(weights).forEach(([t, w]) => { if (w < 0.001) return; const r = data[t].Returns; const br = mean(r), bv = std(r, 1);
        const sr = (br + sp.return_shock / 252) * 252, sv = bv * sp.vol_multiplier * Math.sqrt(252), v95 = percentile(r.map(x => x + sp.return_shock / 252), 5) * Math.sqrt(252);
        ind[t] = { stressed_return: sr, stressed_volatility: sv, var_95: v95, weight: w }; pr += sr * w; pv += (sv * w) ** 2; pvar += v95 * w; });
      pv = Math.sqrt(pv); out[k] = { info: sp, portfolio_return: pr, portfolio_volatility: pv, portfolio_sharpe: pv > 0 ? pr / pv : 0, portfolio_var: pvar, impact_severity: impact(pr), individual_results: ind };
    });
    return out;
  }

  /* ================= Phase 8: BrokerAdvisor ================= */
  function generate_advice(data, F, ML, PM, RL, ST) {
    const adv = {};
    Object.keys(data).forEach(t => {
      const df = data[t], cur = df.c[df.c.length - 1], a = { ticker: t, current_price: cur, recommendation: 'HOLD', confidence: 0.5, target_allocation: PM.allocations[t]?.weight || 0, reasoning: [], risk_assessment: 'Medium', price_target: cur };
      const s = { bullish: 0, bearish: 0, neutral: 0 };
      const fp = F[t].Ensemble[0], fc = (fp - cur) / cur; a.price_target = fp;
      if (fc > 0.05) { a.reasoning.push(`Forecasting models predict ${(fc * 100).toFixed(1)}% upside`); s.bullish += 2; } else if (fc < -0.05) { a.reasoning.push(`Forecasting models predict ${(fc * 100).toFixed(1)}% downside risk`); s.bearish += 2; } else { a.reasoning.push('Forecasting models suggest sideways movement'); s.neutral += 1; }
      const dp = mean(ML[t].direction_probabilities), acc = ML[t].direction_accuracy;
      if (dp > 0.65 && acc > 0.55) { a.reasoning.push(`ML models show ${(dp * 100).toFixed(0)}% bullish probability (accuracy: ${(acc * 100).toFixed(0)}%)`); s.bullish += 2; a.confidence = Math.min(0.9, a.confidence + 0.2); }
      else if (dp < 0.35 && acc > 0.55) { a.reasoning.push(`ML models show ${((1 - dp) * 100).toFixed(0)}% bearish probability (accuracy: ${(acc * 100).toFixed(0)}%)`); s.bearish += 2; a.confidence = Math.min(0.9, a.confidence + 0.1); }
      else { a.reasoning.push('ML models show mixed signals'); s.neutral += 1; }
      const rl = RL[t].rec; a.reasoning.push(`RL agent suggests ${rl.action} (confidence: ${(rl.confidence * 100).toFixed(0)}%, backtest return: ${(RL[t].total_return * 100).toFixed(1)}%)`);
      if (rl.action === 'BUY' && rl.confidence > 0.6) s.bullish += 3; else if (rl.action === 'SELL' && rl.confidence > 0.6) s.bearish += 3; else s.neutral += 1;
      a.confidence = (a.confidence + rl.confidence) / 2;
      const worst = Math.min(...Object.values(ST).map(sc => sc.individual_results[t]?.stressed_return ?? Infinity));
      if (isFinite(worst)) { if (worst < -0.20) { a.risk_assessment = 'High'; a.reasoning.push(`High risk in stress scenarios (worst case: ${(worst * 100).toFixed(1)}%)`); s.bearish += 1; } else if (worst < -0.10) { a.risk_assessment = 'Medium-High'; a.reasoning.push('Moderate risk in stress scenarios'); } else { a.risk_assessment = 'Medium'; a.reasoning.push('Resilient to stress scenarios'); s.bullish += 1; } }
      const rsi = df.RSI[df.RSI.length - 1]; if (rsi < 30) { a.reasoning.push(`RSI oversold (${rsi.toFixed(1)})`); s.bullish += 1; } else if (rsi > 70) { a.reasoning.push(`RSI overbought (${rsi.toFixed(1)})`); s.bearish += 1; }
      const m20 = df.Price_MA_20[df.c.length - 1], m50 = df.Price_MA_50[df.c.length - 1];
      if (cur > m20 && m20 > m50) { a.reasoning.push('Price above moving averages (bullish trend)'); s.bullish += 1; } else if (cur < m20 && m20 < m50) { a.reasoning.push('Price below moving averages (bearish trend)'); s.bearish += 1; }
      const tot = s.bullish + s.bearish + s.neutral, br = s.bullish / tot, sr = s.bearish / tot;
      a.recommendation = br > 0.6 && a.confidence > 0.6 ? 'BUY' : sr > 0.6 && a.confidence > 0.6 ? 'SELL' : br > 0.4 ? 'HOLD/BUY' : sr > 0.4 ? 'HOLD/SELL' : 'HOLD';
      a.scores = s; adv[t] = a;
    });
    const recs = Object.values(adv), buy = recs.filter(a => a.recommendation.includes('BUY')).length, sell = recs.filter(a => a.recommendation.includes('SELL')).length, hold = recs.length - buy - sell;
    const neg = ['market_crash', 'volatility_spike', 'mild_correction', 'stagflation'].map(k => ST[k].portfolio_return), an = mean(neg);
    const resil = an > -0.03 ? 0.9 : an > -0.06 ? 0.7 : an > -0.10 ? 0.5 : 0.3;
    const ws = Object.values(PM.weights), hhi = ws.reduce((s, w) => s + w * w, 0), divs = ws.length > 1 ? clamp((1 - hhi) / (1 - 1 / ws.length), 0, 1) : 0;
    const total = recs.length, sent = buy / total > 0.6 ? 'Bullish' : sell / total > 0.6 ? 'Bearish' : buy > sell ? 'Cautiously Bullish' : sell > buy ? 'Cautiously Bearish' : 'Neutral';
    const ins = []; if (PM.expected_return > 0.12) ins.push('High growth potential with above-average expected returns'); else if (PM.expected_return < 0.06) ins.push('Conservative approach with focus on capital preservation');
    if (PM.volatility > 0.20) ins.push('Higher volatility portfolio suitable for risk-tolerant investors'); else if (PM.volatility < 0.12) ins.push('Low volatility approach emphasizing stability');
    if (ws.length >= 5) ins.push(`Well-diversified across ${ws.length} positions`); else if (ws.length === 1) ins.push('Concentrated single-asset strategy');
    if (Math.min(...Object.values(ST).map(x => x.portfolio_return)) > -0.10) ins.push('Portfolio shows good resilience to market stress');
    if (!ins.length) ins.push('Balanced portfolio approach with quantitative optimization');
    return { advice: adv, summary: { buy, sell, hold, avg_conf: mean(recs.map(a => a.confidence)), resilience: resil, diversification: divs, sentiment: sent, insights: ins.slice(0, 4) } };
  }

  /* ================= UI ================= */
  root.innerHTML = `
    ${LAB.explain(`<p><b>This is the notebook's whole pipeline, ported to JavaScript.</b> Pick tickers, a date range, an investment style and a portfolio size, then run it. The eight phases execute in order — exactly the order in <code>TradingUI.run_complete_analysis()</code> — and every tab below reads from that one run.</p><p>The live app pulls prices from Yahoo Finance; your browser can't, so this version uses daily prices for five healthcare stocks (2019–2022) from my S&amp;P 500 project. As in the notebook's default <code>FAST_DEMO = True</code> mode, ARIMA and LightGBM are skipped and the random forests use 50 trees.</p>`)}
    <div class="controls">
      <div class="ctl">tickers<div class="seg" id="sbTk">${ALL.map(t => `<button data-v="${t}" class="on">${t}</button>`).join('')}</div></div>
      <label class="ctl">start date<input type="date" id="sbS" value="2021-01-04" min="${D0}" max="${D1}"></label>
      <label class="ctl">end date<input type="date" id="sbE" value="${D1}" min="${D0}" max="${D1}"></label>
      <div class="ctl">investment style<div class="seg" id="sbSty"><button data-v="conservative">conservative</button><button data-v="moderate" class="on">moderate</button><button data-v="aggressive">aggressive</button></div></div>
      <label class="ctl">portfolio value ($)<input type="number" id="sbV" value="100000" min="1000" step="1000" style="width:120px"></label>
      <button class="btn primary" id="sbRun">▶ run complete analysis</button>
    </div>
    <div class="log" id="sbLog" style="max-height:170px;margin-bottom:18px"></div>
    <div id="sbOut" style="display:none">
      <div class="tabs"><button class="on">price &amp; indicators</button><button>forecasts</button><button>ml models</button><button>portfolio</button><button>rl trading</button><button>stress tests</button><button>summary report</button></div>
      <div class="tabpane on">
        ${LAB.explain(`<p><b>What you're seeing:</b> <code>FeatureEngineer.create_technical_features()</code> on the selected ticker — candles with the 20- and 50-day moving averages and Bollinger Bands (20-day mean ± 2σ), volume underneath, then RSI(14) and MACD(12, 26, 9).</p><p>The background shading is <code>detect_market_regimes()</code>: K-Means (k = 3, 10 restarts) clusters every day of every ticker on standardised returns, RSI and volume ratio. The engine asks for a <code>Volatility</code> column that doesn't exist, so it falls back to those three features, and so does this port.</p>`)}
        <div class="controls"><label class="ctl">chart ticker<select id="sbCT"></select></label></div>
        <div class="kpis" id="sbK"></div>
        <div class="panel"><h4><b>price · MA20 · MA50 · Bollinger(20, 2) · regime shading</b><span>hover for values</span></h4><canvas class="chart lg" id="cPrice"></canvas><div class="legend" id="regLeg"></div></div>
        <div class="grid2" style="margin-top:14px"><div class="panel"><h4><b>RSI(14) — simple rolling means, as in calculate_rsi()</b><span id="rsiV"></span></h4><canvas class="chart xs" id="cRsi"></canvas></div>
        <div class="panel"><h4><b>MACD(12, 26, 9)</b><span id="macdV"></span></h4><canvas class="chart xs" id="cMacd"></canvas></div></div>
        ${LAB.src('stockbroker', ['features', 'rsi', 'macd', 'bb', 'regime'])}
      </div>
      <div class="tabpane">
        ${LAB.explain(`<p><b>What you're seeing:</b> <code>Forecaster.create_forecasts(horizon=5)</code> for each ticker — the last 50 closes plus four forecasting methods and their weighted ensemble. The shaded band uses the same rule as <code>create_forecast_chart()</code>: ± ½ × recent 20-day volatility × price × days ahead.</p><p><b>The methods:</b> <b>trend</b> fits a line to the last 30 closes and scales the slope by R², so weak trends barely count; <b>mean reversion</b> pulls toward the 60-day average at 10% a day; <b>exponential smoothing</b> tracks level and trend (α = 0.3, β = 0.1); <b>MA momentum</b> tilts the 20-day average by the 5-vs-20-day spread. The ensemble weights are 0.3 / 0.2 / 0.25 / 0.15, renormalised because ARIMA is off.</p><p>If your end date leaves room, white dots show what actually happened next.</p>`)}
        <div class="controls"><label class="ctl">ticker<select id="sbFT"></select></label></div>
        <div class="grid-main"><div class="panel"><h4><b>last 50 closes → next 5 sessions</b><span>dots = realised</span></h4><canvas class="chart lg" id="cFc"></canvas><div class="legend" id="fcLeg"></div></div>
        <div class="panel"><h4><b>method outputs</b><span>day 1 → day 5</span></h4><table class="tbl" id="fcTbl"></table><div class="note" id="fcMeta"></div></div></div>
        ${LAB.src('stockbroker', ['trend', 'mr', 'es', 'ma', 'ens'])}
      </div>
      <div class="tabpane">
        ${LAB.explain(`<p><b>What you're seeing:</b> <code>MLPredictor.train_models()</code>. For each ticker, three random forests (next-day price, next-day direction, next-day return) train on the first 80% of the window and are scored on the last 20%. There's no shuffling, so the test set is genuinely "the future". The features are the 13 columns from <code>prepare_ml_data()</code>, and the tree settings match the notebook: <code>max_depth = 10</code>, <code>min_samples_split = max(5, n/20)</code>, <code>min_samples_leaf = max(2, n/50)</code>.</p><p><b>How to read it:</b> the price model looks good on RMSE because tomorrow's price is mostly today's price. The direction model is the honest test: compare its accuracy with the "always guess the majority" baseline. Feature importances come from the price forest, as in the notebook.</p>`)}
        <div class="controls"><label class="ctl">ticker<select id="sbMT"></select></label></div>
        <div class="kpis" id="mlK"></div>
        <div class="grid-main"><div class="panel"><h4><b>hold-out: predicted vs actual next-day close</b><span>RandomForestRegressor</span></h4><canvas class="chart" id="cMl"></canvas></div>
        <div class="panel"><h4><b>feature importance</b><span>price forest</span></h4><canvas class="chart" id="cW"></canvas></div></div>
        <div class="panel" style="margin-top:14px"><h4><b>P(up) from the direction forest</b><span>green dot = actually went up</span></h4><canvas class="chart sm" id="cDir"></canvas></div>
        ${LAB.src('stockbroker', ['mlfeat', 'rf'])}
      </div>
      <div class="tabpane">
        ${LAB.explain(`<p><b>What you're seeing:</b> <code>PortfolioOptimizer._scipy_optimization_enhanced()</code>. The objective is the Sharpe ratio (annualised return ÷ volatility) minus a concentration penalty of 0.1 × Σw². Each asset is held between 1% and 40%, and the search starts from equal weights, inverse-volatility weights and a random point, keeping the best (the notebook uses SLSQP; this port uses projected gradient steps on the same constraints).</p><p>The cloud is 3,000 random portfolios for context, so you can see where the optimiser landed. The share counts and the "why" lines come from <code>_calculate_portfolio_metrics()</code> and <code>_generate_allocation_reasoning()</code>.</p>`)}
        <div class="kpis" id="pfK"></div>
        <div class="grid-main"><div class="panel"><h4><b>risk vs return</b><span>◆ optimiser's pick</span></h4><canvas class="chart lg" id="cFront"></canvas></div>
        <div class="panel"><h4><b>allocation</b><span id="pfS"></span></h4><canvas class="chart sm" id="cWts"></canvas><table class="tbl" id="pfTbl" style="margin-top:8px"></table></div></div>
        <div class="panel" style="margin-top:14px"><h4><b>allocation reasoning (generated by the engine's rules)</b></h4><div id="pfWhy" style="font-size:14px;color:#c3cbd8;line-height:1.8"></div></div>
        ${LAB.src('stockbroker', ['opt', 'why'])}
      </div>
      <div class="tabpane">
        ${LAB.explain(`<p><b>What you're seeing:</b> <code>RLTrader.simulate_trading()</code>. Despite the name, it's a transparent rule-based agent, not a learned policy. Each day it counts buy signals (RSI oversold, positive momentum, MACD above zero, high volume) and sell signals. It buys when at least two buy signals agree and its cooldown has expired, then exits on take-profit, stop-loss or two sell signals. The three styles change the thresholds (see the source below).</p><p><b>Worth knowing:</b> the notebook reads indicators by column position, so <code>momentum</code> actually picks up the volume ratio and <code>volume_ratio</code> picks up 20-day volatility. "As written" reproduces that exactly; "intended columns" uses ROC-20 and the volume ratio instead, so you can compare the two.</p>`)}
        <div class="controls"><label class="ctl">ticker<select id="sbRT"></select></label><div class="ctl">feature mapping<div class="seg" id="rlMap"><button data-v="asis" class="on">as written</button><button data-v="fix">intended columns</button></div></div></div>
        <div class="kpis" id="rlK"></div>
        <div class="panel"><h4><b>trades</b><span>▲ buy · ▼ sell · hover a marker for the engine's reason</span></h4><canvas class="chart" id="cRl"></canvas></div>
        <div class="grid2" style="margin-top:14px"><div class="panel"><h4><b>position size</b></h4><canvas class="chart sm" id="cPos"></canvas></div>
        <div class="panel"><h4><b>decision confidence (%)</b></h4><canvas class="chart sm" id="cConf"></canvas></div></div>
        ${LAB.src('stockbroker', ['rlparams', 'rllogic'])}
      </div>
      <div class="tabpane">
        ${LAB.explain(`<p><b>What you're seeing:</b> <code>StressTester.run_stress_tests()</code> on the optimised weights. Each scenario adds an annual return shock (spread evenly across 252 days) and multiplies volatility. The portfolio return is the weighted sum, the 95% VaR is the 5th percentile of shocked daily returns × √252, and severity follows <code>_assess_scenario_impact()</code>. As in the notebook, portfolio volatility combines assets as if uncorrelated.</p>`)}
        <div class="kpis" id="stK"></div>
        <div class="grid2"><div class="panel"><h4><b>stressed portfolio return</b></h4><canvas class="chart" id="cSt"></canvas></div>
        <div class="panel"><h4><b>stressed volatility vs return, by asset</b><span>bubble = weight</span></h4><canvas class="chart" id="cStMap"></canvas></div></div>
        <table class="tbl" id="stTbl" style="margin-top:14px"></table>
        ${LAB.src('stockbroker', ['scen', 'stress', 'impact'])}
      </div>
      <div class="tabpane">
        ${LAB.explain(`<p><b>What you're seeing:</b> <code>BrokerAdvisor.generate_advice()</code>, the layer that merges everything. Each signal adds points to a bullish, bearish or neutral bucket: the ensemble forecast (±2), ML direction probability (±2, only if accuracy beats 55%), the RL agent (±3), stress resilience (±1), RSI (±1) and moving-average alignment (±1). The recommendation follows from the bucket shares and the blended confidence. The tally under each card shows the points.</p><p>Education only, not investment advice — that disclaimer is in the original report too.</p>`)}
        <div class="kpis" id="smK"></div>
        <div class="grid3" id="smCards"></div>
        ${LAB.src('stockbroker', ['advice'])}
      </div>
    </div>`;
  tabs(root.querySelector('#sbOut'));
  const $ = id => root.querySelector('#' + id);
  const sel = new Set(ALL); let style = 'moderate', RES = null, rlMap = 'asis';
  root.querySelectorAll('#sbTk button').forEach(b => b.addEventListener('click', () => { if (b.classList.contains('on') && sel.size === 1) return; b.classList.toggle('on'); b.classList.contains('on') ? sel.add(b.dataset.v) : sel.delete(b.dataset.v); }));
  seg($('sbSty'), v => style = v);
  seg($('rlMap'), v => { rlMap = v; if (RES) { RES.RL = Object.fromEntries(RES.T.map(t => [t, simulate_trading(RES.data[t], STRATS[RES.style], rlMap === 'fix')])); RES.ADV = generate_advice(RES.data, RES.F, RES.ML, RES.PM, RES.RL, RES.ST); drawRL(); drawSummary(); } });
  const log = (msg, cls = '') => { const L = $('sbLog'); L.innerHTML += `<div class="${cls}">${msg}</div>`; L.scrollTop = L.scrollHeight; };
  const tick = () => new Promise(r => setTimeout(r, 15));

  async function run() {
    $('sbRun').disabled = true; $('sbLog').innerHTML = '';
    const T = ALL.filter(t => sel.has(t)), start = $('sbS').value, end = $('sbE').value, value = Math.max(1000, +$('sbV').value || 100000);
    const t0 = performance.now();
    log(`<span class="dim">Starting fresh analysis… tickers ${T.join(',')} · ${start} → ${end} · strategy ${style} · portfolio ${money(value)}</span>`);
    log('Phase 1: Fetching market data...'); await tick();
    const data = fetch_data(T, start, end); const TT = Object.keys(data);
    if (!TT.length) { log('<span class="miss">No data in that range — widen the dates.</span>'); $('sbRun').disabled = false; return; }
    TT.forEach(t => log(`  ✓ ${t}: ${data[t].c.length} sessions`, 'dim'));
    log('Phase 2: Feature engineering...'); await tick();
    TT.forEach(t => create_technical_features(data[t])); const km = detect_market_regimes(data); create_correlation_features(data);
    log(`  ✅ Technical features, regimes (k=3, inertia ${km.inertia.toFixed(0)}) and S&P 500 correlation created`, 'hit');
    log('Phase 3: Creating forecasts...'); await tick();
    const F = Object.fromEntries(TT.map((t, i) => [t, create_forecasts(data[t], 5, 7 + i)]));
    log('Phase 4: Training ML models...'); await tick();
    const ML = {};
    for (const t of TT) { ML[t] = train_models(data[t]); log(`  ✅ ML models trained for ${t} - Price RMSE: ${ML[t].price_rmse.toFixed(2)}, Dir Accuracy: ${(ML[t].direction_accuracy * 100).toFixed(2)}%`, 'hit'); await tick(); }
    log('Phase 5: Optimizing portfolio...'); await tick();
    const PM = optimize_portfolio(data, value);
    log(`  ✅ Portfolio optimized using ${PM.optimization_method} · Expected Return ${(PM.expected_return * 100).toFixed(2)}% · Volatility ${(PM.volatility * 100).toFixed(2)}% · Sharpe ${PM.sharpe_ratio.toFixed(2)}`, 'hit');
    log('Phase 6: RL trading simulation...'); await tick();
    const RL = Object.fromEntries(TT.map(t => [t, simulate_trading(data[t], STRATS[style], rlMap === 'fix')]));
    TT.forEach(t => log(`    ✅ ${t}: ${RL[t].num_trades} trades, ${(RL[t].total_return * 100).toFixed(2)}% return, ${(RL[t].win_rate * 100).toFixed(1)}% win rate`, 'dim'));
    log('Phase 7: Stress testing...'); await tick();
    const ST = run_stress_tests(data, PM.weights);
    log('Phase 8: Generating advice...'); await tick();
    const ADV = generate_advice(data, F, ML, PM, RL, ST);
    log(`Complete analysis finished in ${((performance.now() - t0) / 1000).toFixed(1)} s ✓`, 'hit');
    RES = { T: TT, data, F, ML, PM, RL, ST, ADV, km, style, value };
    ['sbCT', 'sbFT', 'sbMT', 'sbRT'].forEach(id => { $(id).innerHTML = TT.map(t => `<option value="${t}">${t} · ${NAMES[t]}</option>`).join(''); });
    $('sbOut').style.display = 'block';
    drawAll(); $('sbRun').disabled = false;
  }
  $('sbRun').addEventListener('click', run);
  ['sbCT', 'sbFT', 'sbMT', 'sbRT'].forEach(id => $(id).addEventListener('change', drawAll));

  /* ---------- drawing ---------- */
  const fmtD = s => { const [y, m] = s.split('-'); return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1] + " '" + y.slice(2); };
  const dTicks = (d, i0, i1, n = 6) => { const out = []; let prev = ''; const st = Math.max(1, Math.round((i1 - i0) / n)); for (let i = i0; i <= i1; i += st) { const l = fmtD(d[i]); out.push([i, l === prev ? '' : l]); prev = l; } return out; };
  const REGC = ['rgba(94,230,255,.035)', 'rgba(255,181,71,.035)', 'rgba(167,139,250,.045)'];
  const pPrice = new Plot($('cPrice'), { pad: { l: 50 } }), pRsi = new Plot($('cRsi'), { pad: { l: 50 } }), pMacd = new Plot($('cMacd'), { pad: { l: 50 } });
  const span = df => { const i1 = df.c.length - 1; return [Math.max(0, i1 - 160), i1]; };
  pPrice.render = p => { if (!RES) return; const df = RES.data[$('sbCT').value], [i0, i1] = span(df), idx = []; for (let i = i0; i <= i1; i++) idx.push(i);
    const lo = Math.min(...idx.map(i => Math.min(df.l[i], df.BB_Lower[i]))), hi = Math.max(...idx.map(i => Math.max(df.h[i], df.BB_Upper[i])));
    p.frame(i0 - 1, i1 + 1, lo, hi, .05).axes({ xTicks: dTicks(df.d, i0, i1), yFmt: v => '$' + v.toFixed(0) });
    const c = p.ctx, bw = Math.max(1, (p.R - p.L) / idx.length * .7);
    idx.forEach(i => { c.fillStyle = REGC[df.Market_Regime[i]]; c.fillRect(p.X(i) - bw, p.T, bw * 2, p.B - p.T); });
    const vmax = Math.max(...idx.map(i => df.v[i])); idx.forEach(i => { const hh = df.v[i] / vmax * (p.B - p.T) * .16; c.fillStyle = df.c[i] >= df.o[i] ? 'rgba(124,255,178,.14)' : 'rgba(255,107,139,.14)'; c.fillRect(p.X(i) - bw / 2, p.B - hh, bw, hh); });
    p.clip(() => { p.area(idx, idx.map(i => df.BB_Lower[i]), idx.map(i => df.BB_Upper[i]), { color: PC.violet, alpha: .07 }); p.line(idx, idx.map(i => df.BB_Upper[i]), { color: PC.violet, width: 1, alpha: .5 }); p.line(idx, idx.map(i => df.BB_Lower[i]), { color: PC.violet, width: 1, alpha: .5 });
      idx.forEach(i => { const up = df.c[i] >= df.o[i]; c.strokeStyle = c.fillStyle = up ? PC.green : PC.rose; const x = p.X(i); c.beginPath(); c.moveTo(x, p.Y(df.h[i])); c.lineTo(x, p.Y(df.l[i])); c.stroke(); const a = p.Y(df.o[i]), b = p.Y(df.c[i]); c.fillRect(x - bw / 2, Math.min(a, b), bw, Math.max(1, Math.abs(a - b))); });
      p.line(idx, idx.map(i => df.Price_MA_20[i]), { color: PC.amber, width: 1.4 }); p.line(idx, idx.map(i => df.Price_MA_50[i]), { color: PC.cyan, width: 1.4 }); });
    if (p.inside(p.mouse)) { const i = clamp(Math.round(p.invX(p.mouse.x)), i0, i1); p.crossX(p.X(i)); p.tooltip([[df.d[i], PC.text], `O ${df.o[i].toFixed(2)} H ${df.h[i].toFixed(2)} L ${df.l[i].toFixed(2)} C ${df.c[i].toFixed(2)}`, [`MA20 ${df.Price_MA_20[i].toFixed(2)} · MA50 ${df.Price_MA_50[i].toFixed(2)}`, PC.amber], [`RSI ${df.RSI[i].toFixed(1)} · ATR ${df.ATR[i].toFixed(2)} · regime ${df.Market_Regime[i]}`, PC.text], [`S&P corr(20d) ${df.Market_Correlation[i].toFixed(2)}`, PC.text]], p.X(i), p.mouse.y); } };
  pRsi.render = p => { if (!RES) return; const df = RES.data[$('sbCT').value], [i0, i1] = span(df), idx = []; for (let i = i0; i <= i1; i++) idx.push(i); p.frame(i0 - 1, i1 + 1, 0, 100).axes({ xTicks: [], yTicks: [30, 50, 70] }); p.hline(70, { color: 'rgba(255,107,139,.4)' }); p.hline(30, { color: 'rgba(124,255,178,.4)' }); p.line(idx, idx.map(i => df.RSI[i]), { color: PC.violet, width: 1.4 }); };
  pMacd.render = p => { if (!RES) return; const df = RES.data[$('sbCT').value], [i0, i1] = span(df), idx = []; for (let i = i0; i <= i1; i++) idx.push(i); const m = Math.max(...idx.flatMap(i => [Math.abs(df.MACD[i]), Math.abs(df.MACD_Signal[i])])); p.frame(i0 - 1, i1 + 1, -m, m, .05).axes({ xTicks: [], yFmt: v => v.toFixed(1) }); p.bars(idx, idx.map(i => df.MACD_Hist[i]), { colors: idx.map(i => df.MACD_Hist[i] >= 0 ? 'rgba(124,255,178,.5)' : 'rgba(255,107,139,.5)'), width: .8 }); p.line(idx, idx.map(i => df.MACD[i]), { color: PC.cyan, width: 1.3 }); p.line(idx, idx.map(i => df.MACD_Signal[i]), { color: PC.amber, width: 1.1 }); };
  function drawMarket() { const t = $('sbCT').value, df = RES.data[t], i = df.c.length - 1; const regime = df.c[i] > df.Price_MA_20[i] && df.Price_MA_20[i] > df.Price_MA_50[i] ? ['above MAs', 'pos'] : df.c[i] < df.Price_MA_20[i] && df.Price_MA_20[i] < df.Price_MA_50[i] ? ['below MAs', 'neg'] : ['mixed', 'warn'];
    $('sbK').innerHTML = [['close', '$' + df.c[i].toFixed(2), ''], ['1-day', pct(df.Returns[i], 2), df.Returns[i] >= 0 ? 'pos' : 'neg'], ['20d vol (daily)', (df.Volatility_20[i] * 100).toFixed(2) + '%', ''], ['RSI', df.RSI[i].toFixed(0), df.RSI[i] > 70 ? 'neg' : df.RSI[i] < 30 ? 'pos' : ''], ['trend', regime[0], regime[1]], ['support / resistance', `${df.Support[i].toFixed(1)} / ${df.Resistance[i].toFixed(1)}`, '']].map(([k, v, c]) => `<div class="kpi"><span>${k}</span><b class="${c}">${v}</b></div>`).join('');
    $('rsiV').textContent = df.RSI[i].toFixed(1); $('macdV').textContent = df.MACD_Hist[i] >= 0 ? 'histogram > 0' : 'histogram < 0';
    const counts = [0, 1, 2].map(k => df.Market_Regime.filter(r => r === k).length), means = [0, 1, 2].map(k => { const ix = df.Market_Regime.map((r, j) => r === k ? j : -1).filter(j => j >= 0); return ix.length ? mean(ix.map(j => df.Returns[j])) : 0; });
    $('regLeg').innerHTML = [0, 1, 2].map(k => `<span><i style="background:${REGC[k].replace(/[\d.]+\)$/, '.6)')}"></i>regime ${k} · ${counts[k]} days · avg daily return ${pct(means[k], 2)}</span>`).join('');
    pPrice.redraw(); pRsi.redraw(); pMacd.redraw(); }

  const FCN = [['Ensemble', 'Ensemble', PC.green], ['Trend', 'Trend (R²-weighted)', PC.cyan], ['MeanReversion', 'Mean reversion', PC.violet], ['ES', 'Exp. smoothing', PC.amber], ['MA', 'MA momentum', '#f0abfc']];
  $('fcLeg').innerHTML = FCN.map(([, n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('') + '<span><i style="background:#e7ebf2;border-radius:50%"></i>realised</span>';
  const pFc = new Plot($('cFc'), { pad: { l: 50 } });
  pFc.render = p => { if (!RES) return; const t = $('sbFT').value, df = RES.data[t], f = RES.F[t], n = df.c.length, last = df.c[n - 1], hist = df.c.slice(-50), xs = hist.map((_, i) => i), fx = [49, 50, 51, 52, 53, 54];
    const vol = std(df.Returns.slice(-20), 1), ens = f.Ensemble.map(v => clamp(v, last * .5, last * 1.5)), up = ens.map((v, i) => Math.min(last * 2, v + vol * last * (i + 1) * .5)), dn = ens.map((v, i) => Math.max(last * .3, v - vol * last * (i + 1) * .5));
    const R = RAW[t], gi = R.d.indexOf(df.d[n - 1]), real = [1, 2, 3, 4, 5].map(h => R.c[gi + h]).filter(v => v != null);
    const all = [...hist, ...up, ...dn, ...FCN.flatMap(([k]) => f[k]), ...real];
    p.frame(0, 54, Math.min(...all), Math.max(...all), .05).axes({ xTicks: [[0, '-49'], [24, '-25'], [49, 'today'], [54, '+5']], yFmt: v => '$' + v.toFixed(0) });
    p.area(fx, [last, ...dn], [last, ...up], { color: PC.green, alpha: .1 }); p.line(xs, hist, { color: PC.white, width: 1.6 });
    FCN.slice(1).forEach(([k, , col]) => p.line(fx, [last, ...f[k]], { color: col, width: 1.1, dash: [3, 3], alpha: .8 }));
    p.line(fx, [last, ...ens], { color: PC.green, width: 2.2 }); p.dots(fx.slice(1), ens, { color: PC.green, r: 3.5 });
    if (real.length) p.dots(real.map((_, i) => 50 + i), real, { color: PC.white, r: 3.5 }); };
  function drawForecast() { const t = $('sbFT').value, f = RES.F[t], m = f.meta;
    $('fcTbl').innerHTML = '<tr><th>method</th><th>day 1</th><th>day 5</th></tr>' + FCN.map(([k, n, c]) => `<tr><td><span style="color:${c}">●</span> ${n}</td><td>$${f[k][0].toFixed(2)}</td><td>$${f[k][4].toFixed(2)}</td></tr>`).join('');
    $('fcMeta').innerHTML = `30-day slope ${m.slope.toFixed(3)}/day × R² ${m.r2.toFixed(2)} → ${(m.slope * m.r2).toFixed(3)}/day · 60-day mean $${m.long_mean.toFixed(2)} · MA5 vs MA20 momentum ${pct(m.momentum, 2)} · 20-day vol ${(m.volatility * 100).toFixed(2)}%`;
    pFc.redraw(); }

  const pMl = new Plot($('cMl'), { pad: { l: 50 } }), pW = new Plot($('cW'), { pad: { l: 136, b: 20 } }), pDir = new Plot($('cDir'), { pad: { l: 40 } });
  pMl.render = p => { if (!RES) return; const t = $('sbMT').value, m = RES.ML[t], d = RES.data[t].d, xs = m.idx; const all = [...m.price_predictions, ...m.test_actual_prices];
    p.frame(xs[0], xs[xs.length - 1], Math.min(...all), Math.max(...all), .05).axes({ xTicks: dTicks(d, xs[0], xs[xs.length - 1], 5), yFmt: v => '$' + v.toFixed(0) }); p.line(xs, m.test_actual_prices, { color: PC.white, width: 1.4 }); p.line(xs, m.price_predictions, { color: PC.cyan, width: 1.4, dash: [4, 3] }); };
  pW.render = p => { if (!RES) return; const fi = Object.entries(RES.ML[$('sbMT').value].feature_importance).sort((a, b) => b[1] - a[1]), c = p.ctx, n = fi.length; p.frame(0, Math.max(...fi.map(x => x[1])) * 1.15, 0, n); const bh = (p.B - p.T) / n; c.font = '10.5px JetBrains Mono, monospace';
    fi.forEach(([f, v], k) => { const y = p.T + k * bh; c.fillStyle = 'rgba(94,230,255,.6)'; c.fillRect(p.X(0), y + bh * .2, p.X(v) - p.X(0), bh * .6); c.fillStyle = PC.text; c.textAlign = 'right'; c.fillText(f, p.L - 8, y + bh * .65); c.textAlign = 'left'; c.fillText((v * 100).toFixed(1) + '%', p.X(v) + 5, y + bh * .65); }); };
  pDir.render = p => { if (!RES) return; const m = RES.ML[$('sbMT').value], xs = m.idx; p.frame(xs[0], xs[xs.length - 1], 0, 1).axes({ xTicks: [], yTicks: [0, .5, 1], yFmt: v => v.toFixed(1) }); p.hline(.5); p.line(xs, m.direction_probabilities, { color: PC.violet, width: 1.2, alpha: .7 }); p.dots(xs, m.direction_probabilities, { r: 2, colors: m.test_dir.map(v => v ? PC.green : PC.rose) }); };
  function drawML() { const m = RES.ML[$('sbMT').value], lift = m.direction_accuracy - m.base;
    $('mlK').innerHTML = [['train / test rows', `${m.split} / ${m.idx.length}`, ''], ['price RMSE', '$' + m.price_rmse.toFixed(2), ''], ['price MAPE', m.price_mape.toFixed(2) + '%', ''], ['direction accuracy', (m.direction_accuracy * 100).toFixed(1) + '%', ''], ['majority baseline', (m.base * 100).toFixed(1) + '%', ''], ['lift', pct(lift), lift > 0 ? 'pos' : 'neg'], ['mean P(up)', (mean(m.direction_probabilities) * 100).toFixed(0) + '%', '']].map(([k, v, c]) => `<div class="kpi"><span>${k}</span><b class="${c}">${v}</b></div>`).join('');
    pMl.redraw(); pW.redraw(); pDir.redraw(); }

  const pFront = new Plot($('cFront'), { pad: { l: 50, b: 30 } }), pWts = new Plot($('cWts'), { pad: { l: 44, b: 22 } }); let cloud = [];
  pFront.render = p => { if (!RES) return; const PM = RES.PM, n = PM.T.length;
    const stat = w => { const r = w.reduce((s, v, i) => s + v * PM.mu[i], 0); let v = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) v += w[i] * w[j] * PM.Sig[i][j]; return [Math.sqrt(v), r]; };
    if (!cloud.length) { const r = rng(5); for (let k = 0; k < 3000; k++) { let w = PM.T.map(() => -Math.log(r() + 1e-9)); const s = w.reduce((a, b) => a + b, 0); w = w.map(v => v / s); cloud.push([...stat(w), w]); } }
    const asset = PM.T.map((t, i) => [Math.sqrt(PM.Sig[i][i]), PM.mu[i]]), xs = [...cloud.map(c => c[0]), ...asset.map(a => a[0])], ys = [...cloud.map(c => c[1]), ...asset.map(a => a[1])];
    p.frame(Math.min(...xs) * .95, Math.max(...xs) * 1.05, Math.min(...ys), Math.max(...ys), .08).axes({ xFmt: v => (v * 100).toFixed(0) + '%', yFmt: v => (v * 100).toFixed(0) + '%', xLabel: 'volatility →', yLabel: 'annual return' });
    p.dots(cloud.map(c => c[0]), cloud.map(c => c[1]), { r: 1.5, alpha: .45, colors: cloud.map(c => `hsl(${190 + 60 * (c[1] / c[0] - 0)},70%,55%)`) });
    asset.forEach(([v, r], i) => { p.dots([v], [r], { color: SERIES[i + 1], r: 4.5 }); p.ctx.fillStyle = PC.text; p.ctx.font = '10.5px JetBrains Mono, monospace'; p.ctx.fillText(PM.T[i], p.X(v) + 7, p.Y(r) + 4); });
    const b = stat(PM.T.map(t => PM.weights[t])), c = p.ctx; c.save(); c.translate(p.X(b[0]), p.Y(b[1])); c.rotate(Math.PI / 4); c.fillStyle = PC.green; c.fillRect(-6, -6, 12, 12); c.restore(); };
  pWts.render = p => { if (!RES) return; const T = RES.PM.T, w = T.map(t => RES.PM.weights[t]); p.frame(-.5, w.length - .5, 0, Math.max(...w) * 1.18).axes({ xTicks: T.map((t, k) => [k, t]), yFmt: v => (v * 100).toFixed(0) + '%' }); p.bars(w.map((_, k) => k), w, { colors: w.map((_, k) => SERIES[k + 1]), width: .6 }); w.forEach((v, k) => { p.ctx.fillStyle = PC.white; p.ctx.font = '10.5px JetBrains Mono, monospace'; p.ctx.textAlign = 'center'; p.ctx.fillText((v * 100).toFixed(1) + '%', p.X(k), p.Y(v) - 5); p.ctx.textAlign = 'left'; }); };
  function drawPortfolio() { const PM = RES.PM; cloud = [];
    $('pfK').innerHTML = [['method', PM.optimization_method, ''], ['expected return', pct(PM.expected_return), PM.expected_return >= 0 ? 'pos' : 'neg'], ['volatility', (PM.volatility * 100).toFixed(1) + '%', ''], ['Sharpe (no rf)', PM.sharpe_ratio.toFixed(2), ''], ['HHI concentration', PM.weight_concentration.toFixed(3), ''], ['cash left', money(PM.cash_remaining), '']].map(([k, v, c]) => `<div class="kpi"><span>${k}</span><b class="${c}" style="font-size:15px">${v}</b></div>`).join('');
    $('pfS').textContent = `${money(PM.total_allocated)} invested`;
    $('pfTbl').innerHTML = '<tr><th>ticker</th><th>weight</th><th>shares</th><th>price</th><th>value</th></tr>' + PM.T.map((t, i) => { const a = PM.allocations[t]; return `<tr><td><span style="color:${SERIES[i + 1]}">●</span> ${t}</td><td>${(a.weight * 100).toFixed(1)}%</td><td>${a.shares}</td><td>$${a.current_price.toFixed(2)}</td><td>${money(a.actual_value)}</td></tr>`; }).join('');
    $('pfWhy').innerHTML = PM.T.slice().sort((a, b) => PM.weights[b] - PM.weights[a]).map(t => `<div><b style="font-family:var(--mono);color:${SERIES[PM.T.indexOf(t) + 1]}">${t}</b> — ${PM.reasoning[t].join(' · ')}</div>`).join('');
    pFront.redraw(); pWts.redraw(); }

  const pRl = new Plot($('cRl'), { pad: { l: 50 } }), pPos = new Plot($('cPos'), { pad: { l: 40 } }), pConf = new Plot($('cConf'), { pad: { l: 40 } });
  pRl.render = p => { if (!RES) return; const t = $('sbRT').value, df = RES.data[t], rl = RES.RL[t], n = df.c.length, idx = [...Array(n).keys()];
    p.frame(0, n - 1, Math.min(...df.c), Math.max(...df.c), .08).axes({ xTicks: dTicks(df.d, 0, n - 1, 6), yFmt: v => '$' + v.toFixed(0) });
    let open = null; rl.trades.forEach(tr => { if (tr.side === 'buy') open = tr.i; else if (open != null) { p.ctx.fillStyle = tr.pnl > 0 ? 'rgba(124,255,178,.08)' : 'rgba(255,107,139,.08)'; p.ctx.fillRect(p.X(open), p.T, p.X(tr.i) - p.X(open), p.B - p.T); open = null; } });
    p.line(idx, df.c, { color: PC.white, width: 1.3 }); const c = p.ctx;
    rl.trades.forEach(tr => { const x = p.X(tr.i), y = p.Y(tr.px); c.fillStyle = tr.side === 'buy' ? PC.green : PC.rose; c.beginPath(); if (tr.side === 'buy') { c.moveTo(x, y + 6); c.lineTo(x - 5, y + 14); c.lineTo(x + 5, y + 14); } else { c.moveTo(x, y - 6); c.lineTo(x - 5, y - 14); c.lineTo(x + 5, y - 14); } c.fill(); });
    if (p.inside(p.mouse)) { const tr = rl.trades.reduce((a, q) => !a || Math.abs(p.X(q.i) - p.mouse.x) < Math.abs(p.X(a.i) - p.mouse.x) ? q : a, null); if (tr && Math.abs(p.X(tr.i) - p.mouse.x) < 18) p.tooltip([[df.d[tr.i], PC.text], [`${tr.side.toUpperCase()} @ $${tr.px.toFixed(2)}`, tr.side === 'buy' ? PC.green : PC.rose], tr.reason], p.X(tr.i), p.Y(tr.px)); } };
  pPos.render = p => { if (!RES) return; const rl = RES.RL[$('sbRT').value], xs = rl.positions.map((_, i) => i); p.frame(0, xs.length - 1, 0, 1).axes({ xTicks: [], yTicks: [0, .5, 1] }); p.area(xs, 0, rl.positions, { color: PC.cyan, alpha: .25 }); p.line(xs, rl.positions, { color: PC.cyan, width: 1 }); };
  pConf.render = p => { if (!RES) return; const rl = RES.RL[$('sbRT').value], xs = rl.confidence_scores.map((_, i) => i); p.frame(0, xs.length - 1, 40, 100).axes({ xTicks: [], yTicks: [50, 75, 100] }); p.line(xs, rl.confidence_scores, { color: PC.amber, width: 1 }); };
  function drawRL() { const rl = RES.RL[$('sbRT').value];
    $('rlK').innerHTML = [['style', RES.style, ''], ['trades', rl.num_trades, ''], ['total return (sum of trades)', pct(rl.total_return), rl.total_return >= 0 ? 'pos' : 'neg'], ['win rate', (rl.win_rate * 100).toFixed(0) + '%', ''], ['avg win / loss', `${pct(rl.avg_win)} / ${pct(rl.avg_loss)}`, ''], ['trade Sharpe', rl.sharpe_ratio.toFixed(2), ''], ['recommendation', `${rl.rec.action} · ${(rl.rec.confidence * 100).toFixed(0)}%`, rl.rec.action === 'BUY' ? 'pos' : rl.rec.action === 'SELL' ? 'neg' : 'warn']].map(([k, v, c]) => `<div class="kpi"><span>${k}</span><b class="${c}" style="font-size:15px">${v}</b></div>`).join('');
    pRl.redraw(); pPos.redraw(); pConf.redraw(); }

  const pSt = new Plot($('cSt'), { pad: { l: 50, b: 40 } }), pStMap = new Plot($('cStMap'), { pad: { l: 50, b: 30 } });
  const sevCol = s => ({ Severe: PC.rose, Moderate: PC.amber, Mild: '#fde68a', Neutral: PC.cyan, 'Very Positive': PC.green }[s]);
  pSt.render = p => { if (!RES) return; const S = Object.values(RES.ST), r = S.map(s => s.portfolio_return); p.frame(-.6, S.length - .4, Math.min(0, ...r), Math.max(0, ...r), .12).axes({ xTicks: S.map((s, k) => [k, s.info.name.split(' ')[0]]), yFmt: v => (v * 100).toFixed(0) + '%' }); p.hline(0, { dash: [] }); p.bars(r.map((_, k) => k), r, { colors: S.map(s => sevCol(s.impact_severity)), width: .55, alpha: .8 }); };
  pStMap.render = p => { if (!RES) return; const pts = []; Object.values(RES.ST).forEach((s, k) => Object.entries(s.individual_results).forEach(([t, v]) => pts.push([v.stressed_volatility, v.stressed_return, v.weight, k, t])));
    p.frame(0, Math.max(...pts.map(q => q[0])) * 1.1, Math.min(...pts.map(q => q[1])), Math.max(...pts.map(q => q[1])), .1).axes({ xFmt: v => (v * 100).toFixed(0) + '%', yFmt: v => (v * 100).toFixed(0) + '%', xLabel: 'stressed vol →' }); p.hline(0);
    pts.forEach(([v, r, w, k]) => { p.ctx.fillStyle = SERIES[k] + '99'; p.ctx.beginPath(); p.ctx.arc(p.X(v), p.Y(r), 3 + w * 22, 0, 7); p.ctx.fill(); });
    if (p.inside(p.mouse)) { const q = pts.reduce((a, b) => Math.hypot(p.X(b[0]) - p.mouse.x, p.Y(b[1]) - p.mouse.y) < Math.hypot(p.X(a[0]) - p.mouse.x, p.Y(a[1]) - p.mouse.y) ? b : a); p.tooltip([`${q[4]} · ${Object.values(RES.ST)[q[3]].info.name}`, `return ${pct(q[1])} · vol ${(q[0] * 100).toFixed(0)}%`, [`weight ${(q[2] * 100).toFixed(0)}%`, PC.text]], p.X(q[0]), p.Y(q[1])); } };
  function drawStress() { const S = RES.ST;
    $('stTbl').innerHTML = '<tr><th>scenario</th><th>return</th><th>volatility</th><th>Sharpe</th><th>VaR 95%</th><th>impact</th></tr>' + Object.values(S).map(s => `<tr title="${s.info.description}"><td>${s.info.name}<div style="color:#5a6578;font-size:11px">${s.info.description}</div></td><td class="${s.portfolio_return >= 0 ? 'pos' : 'neg'}">${pct(s.portfolio_return)}</td><td>${(s.portfolio_volatility * 100).toFixed(1)}%</td><td>${s.portfolio_sharpe.toFixed(2)}</td><td>${(s.portfolio_var * 100).toFixed(1)}%</td><td style="color:${sevCol(s.impact_severity)}">${s.impact_severity}</td></tr>`).join('');
    const worst = Object.values(S).reduce((a, b) => b.portfolio_return < a.portfolio_return ? b : a);
    $('stK').innerHTML = [['worst scenario', worst.info.name, 'neg'], ['worst return', pct(worst.portfolio_return), worst.portfolio_return >= 0 ? 'pos' : 'neg'], ['stress resilience', (RES.ADV.summary.resilience * 100).toFixed(0) + '%', ''], ['VaR on capital (crash)', money(-S.market_crash.portfolio_var * RES.value), '']].map(([k, v, c]) => `<div class="kpi"><span>${k}</span><b class="${c}" style="font-size:15px">${v}</b></div>`).join('');
    pSt.redraw(); pStMap.redraw(); }

  function drawSummary() { const A = RES.ADV, s = A.summary, PM = RES.PM;
    $('smK').innerHTML = [['overall sentiment', s.sentiment, s.sentiment.includes('Bull') ? 'pos' : s.sentiment.includes('Bear') ? 'neg' : 'warn'], ['buy / hold / sell', `${s.buy} / ${s.hold} / ${s.sell}`, ''], ['avg confidence', (s.avg_conf * 100).toFixed(0) + '%', ''], ['diversification', (s.diversification * 100).toFixed(0) + '%', ''], ['stress resilience', (s.resilience * 100).toFixed(0) + '%', ''], ['expected return', pct(PM.expected_return), '']].map(([k, v, c]) => `<div class="kpi"><span>${k}</span><b class="${c}" style="font-size:15px">${v}</b></div>`).join('');
    $('smCards').innerHTML = Object.values(A.advice).map(a => { const col = a.recommendation.includes('BUY') ? PC.green : a.recommendation.includes('SELL') ? PC.rose : PC.amber;
      return `<div class="panel"><h4><b style="font-size:14px">${a.ticker} · ${NAMES[a.ticker]}</b><span>$${a.current_price.toFixed(2)}</span></h4><div style="font-family:var(--mono);font-size:20px;color:${col};margin:4px 0">${a.recommendation}</div>
        <div class="mono" style="font-size:11.5px;color:#8b96a8;margin-bottom:8px">confidence ${(a.confidence * 100).toFixed(0)}% · allocation ${(a.target_allocation * 100).toFixed(1)}% · risk ${a.risk_assessment} · next-day target $${a.price_target.toFixed(2)}</div>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#c3cbd8;line-height:1.6">${a.reasoning.map(r => `<li>${r}</li>`).join('')}</ul>
        <div class="mono" style="font-size:11px;color:#5a6578;margin-top:8px">tally: bullish ${a.scores.bullish} · bearish ${a.scores.bearish} · neutral ${a.scores.neutral}</div></div>`; }).join('') +
      `<div class="panel"><h4><b style="font-size:14px">key insights</b></h4><ul style="margin:0;padding-left:18px;font-size:13px;color:#c3cbd8;line-height:1.7">${s.insights.map(i => `<li>${i}</li>`).join('')}</ul></div>`; }

  function drawAll() { if (!RES) return; drawMarket(); drawForecast(); drawML(); drawPortfolio(); drawRL(); drawStress(); drawSummary(); }
  run();
};
