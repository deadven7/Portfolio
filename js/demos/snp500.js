/* S&P 500 sector study + Pfizer forecasting — JavaScript ports of the R Markdown analysis */
DEMOS.snp500 = async function (root) {
  const [SEC, PF] = await Promise.all([loadJSON('assets/data/sectors.json'), loadJSON('assets/data/pfe_forecasting.json')]);
  const dates = SEC.d, names = Object.keys(SEC.s), N = dates.length;
  const EVENTS = [['2020-02-20', 'COVID-19 sell-off begins'], ['2020-03-23', 'Market bottom (Fed backstop)'], ['2020-11-03', 'US presidential election'], ['2020-11-09', 'Pfizer/BioNTech vaccine efficacy announced'], ['2022-02-24', 'Russia invades Ukraine'], ['2022-03-16', 'First Fed rate hike of the cycle']];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtD = s => { const [y, m] = s.split('-'); return MON[+m - 1] + " '" + y.slice(2); };
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

  root.innerHTML = `
    <div class="tabs"><button class="on">pfizer · auto.arima</button><button>pfizer · exploratory</button><button>sector event study</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> the forecasting section of <code>PFizer_Analysis.Rmd</code>, ported from R. The 946 daily Pfizer closes become a time series. An Augmented Dickey–Fuller test checks for stationarity (it isn't stationary, so the series must be differenced). An <code>auto.arima(ic = "aic", trace = TRUE)</code>-style search then walks the ARIMA(p, 1, q) space stepwise, the way <code>auto.arima</code> does: start from a few seed models, move p and q by ±1 and toggle the drift term, and stop when the AIC stops improving. The report's conclusion was ARIMA(1, 1, 0), and the trace on the right shows each model the search visits.</p><p><b>Then:</b> <code>forecast(level = 95, h = 5)</code> and <code>Box.test(lag = 5, type = "Ljung-Box")</code> on the residuals; a p-value above 0.05 means no leftover autocorrelation. The report stops at 5 days. Drag the training cut-off back in time to see how the same model would have done against prices it never saw.</p>`)}
      <div class="controls">
        <label class="ctl" style="flex:1;min-width:220px"><span class="lbl">training data ends <output id="aCutO"></output></span><input type="range" id="aCut" min="300" max="${PF.c.length - 1}" value="${PF.c.length - 1}"></label>
        <label class="ctl"><span class="lbl">horizon h <output id="aHO"></output></span><input type="range" id="aH" min="5" max="60" value="5"></label>
        <label class="ctl">model<select id="aSel"><option value="auto">auto (min AIC)</option></select></label>
        <div class="ctl">series<div class="seg" id="aSrc"><button data-v="obs" class="on">the 946 closes</button><button data-v="rmd">exactly as ts() builds it</button></div></div>
      </div>
      <div class="kpis" id="aK"></div>
      <div class="grid-main">
        <div class="panel"><h4><b>plot(fcst, include = …)</b><span>95% interval · white = what actually happened</span></h4><canvas class="chart lg" id="aMain"></canvas></div>
        <div class="panel"><h4><b>auto.arima trace</b><span>AIC, lower is better</span></h4><div class="log" id="aTrace" style="max-height:330px"></div></div>
      </div>
      <div class="grid3" style="margin-top:14px">
        <div class="panel"><h4><b>checkresiduals(): residuals</b></h4><canvas class="chart sm" id="rTs"></canvas></div>
        <div class="panel"><h4><b>residual ACF</b><span>±1.96/√n</span></h4><canvas class="chart sm" id="rAcf"></canvas></div>
        <div class="panel"><h4><b>residual histogram</b><span>vs normal</span></h4><canvas class="chart sm" id="rHist"></canvas></div>
      </div>
      ${LAB.src('snp500', ['ts', 'arima'])}
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the exploratory plots that come before the model in the R notebook. The yearly box plot shows the distribution of closes per year (the report notes that 2022 traded highest). The monthly totals sum each month's daily closes, faceted by year, which is how the team spotted stronger Q2–Q3 activity. <code>10*diff(log(Close))</code> is the scaled daily log-return series, and its spikes line up with the COVID crash and the vaccine news.</p>`)}
      <div class="grid2"><div class="panel"><h4><b>boxplot(Close ~ year)</b></h4><canvas class="chart" id="eBox"></canvas></div>
      <div class="panel"><h4><b>10 × diff(log(Close))</b><span>scaled log returns</span></h4><canvas class="chart" id="eRet"></canvas></div></div>
      <div class="panel" style="margin-top:14px"><h4><b>monthly total of daily closes, by year</b><span>summarise(sum(Close)) · facet_wrap(~ year)</span></h4><canvas class="chart" id="eMon"></canvas></div>
      ${LAB.src('snp500', ['logdiff', 'monthly'])}
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the project's 11 sector series. Every S&amp;P 500 constituent was min-max normalised, then averaged within its sector (the <code>*_mean.csv</code> files in the repo), so sectors can be compared on one scale. The red markers are the world events the report studied.</p><p><b>Try:</b> drag across the chart to select a window and the bar chart ranks the sectors over it, or jump straight to an event. Around the vaccine announcement, health care and energy move very differently; in early 2022, energy surges while tech falls. Click a legend entry to hide a sector (shift-click isolates it).</p>`)}
      <div class="controls"><div class="ctl">jump to an event<div class="seg" id="sEv">${EVENTS.map((e, k) => `<button data-v="${k}">${k + 1}</button>`).join('')}<button data-v="all" class="on">all</button></div></div></div>
      <div class="panel"><h4><b>mean normalised close by sector</b><span>drag to select a window</span></h4><canvas class="chart lg" id="sMain" style="cursor:col-resize"></canvas><div class="legend" id="sLeg"></div></div>
      <div class="grid-main" style="margin-top:14px">
        <div class="panel"><h4><b id="sWinT">change over window</b></h4><canvas class="chart" id="sBar"></canvas></div>
        <div class="panel"><h4><b>events in this window</b></h4><div id="sTxt" style="font-size:14px;color:#c3cbd8;line-height:1.7"></div></div>
      </div>
      ${LAB.src('snp500', ['sector'])}
    </div>`;
  tabs(root);
  const $ = id => root.querySelector('#' + id);

  /* ================= statistics helpers ================= */
  function solve(A, b) { const n = A.length, M = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r; [M[c], M[piv]] = [M[piv], M[c]]; const d = M[c][c] || 1e-12; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map((r, i) => r[n] / (r[i] || 1e-12)); }
  function ols(X, y) { const k = X[0].length, XtX = [...Array(k)].map((_, a) => [...Array(k)].map((__, b) => X.reduce((s, r) => s + r[a] * r[b], 0))), Xty = [...Array(k)].map((_, a) => X.reduce((s, r, i) => s + r[a] * y[i], 0));
    const beta = solve(XtX, Xty), res = y.map((v, i) => v - X[i].reduce((s, x, j) => s + x * beta[j], 0)), s2 = res.reduce((s, e) => s + e * e, 0) / (y.length - k);
    const inv0 = j => solve(XtX, XtX.map((_, i) => i === j ? 1 : 0))[j]; return { beta, se: beta.map((_, j) => Math.sqrt(Math.abs(inv0(j) * s2))) }; }
  const approx = (xs, ys, x) => { if (x <= xs[0]) return ys[0]; if (x >= xs[xs.length - 1]) return ys[ys.length - 1]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]); };
  function adfTest(x) { // tseries::adf.test (constant + trend, k = trunc((n-1)^(1/3)))
    let k = Math.trunc(Math.pow(x.length - 1, 1 / 3)); const lag = k; k += 1;
    const y = x.slice(1).map((v, i) => v - x[i]), n = y.length, X = [], yt = [];
    for (let t = k - 1; t < n; t++) { const row = [1, x[t], t + 1]; for (let j = 1; j < k; j++) row.push(y[t - j]); X.push(row); yt.push(y[t]); }
    const o = ols(X, yt), STAT = o.beta[1] / o.se[1];
    const tab = [[4.38, 4.15, 4.04, 3.99, 3.98, 3.96], [3.95, 3.80, 3.73, 3.69, 3.68, 3.66], [3.60, 3.50, 3.45, 3.43, 3.42, 3.41], [3.24, 3.18, 3.15, 3.13, 3.13, 3.12], [1.14, 1.19, 1.22, 1.23, 1.24, 1.25], [0.80, 0.87, 0.90, 0.92, 0.93, 0.94], [0.50, 0.58, 0.62, 0.64, 0.65, 0.66], [0.15, 0.24, 0.28, 0.31, 0.32, 0.33]].map(c => c.map(v => -v));
    const T = [25, 50, 100, 250, 500, 1e5], P = [0.01, 0.025, 0.05, 0.10, 0.90, 0.95, 0.975, 0.99];
    const ipl = tab.map(col => approx(T, col, X.length));
    return { STAT, lag, p: approx(ipl, P, STAT) };
  }
  function nelderMead(f, x0, iters = 400) { const n = x0.length; let S = [x0, ...x0.map((_, i) => x0.map((v, j) => j === i ? v + (Math.abs(v) > 1e-3 ? v * .1 : .1) : v))].map(x => ({ x, f: f(x) }));
    for (let it = 0; it < iters; it++) { S.sort((a, b) => a.f - b.f); const c = S[0].x.map((_, j) => S.slice(0, n).reduce((s, p) => s + p.x[j], 0) / n), w = S[n];
      const pt = a => c.map((v, j) => v + a * (w.x[j] - v)); const r = pt(-1), fr = f(r);
      if (fr < S[0].f) { const e = pt(-2), fe = f(e); S[n] = fe < fr ? { x: e, f: fe } : { x: r, f: fr }; }
      else if (fr < S[n - 1].f) S[n] = { x: r, f: fr };
      else { const cc = pt(.5), fc = f(cc); if (fc < w.f) S[n] = { x: cc, f: fc }; else S = S.map((p, i) => i ? { x: p.x.map((v, j) => S[0].x[j] + .5 * (v - S[0].x[j])), f: 0 } : p).map((p, i) => i ? { ...p, f: f(p.x) } : p); }
      if (Math.abs(S[n].f - S[0].f) < 1e-10) break; }
    S.sort((a, b) => a.f - b.f); return S[0]; }
  function fitArima(x, p, q, drift) { // ARIMA(p,1,q) by conditional sum of squares
    const y = x.slice(1).map((v, i) => v - x[i]), n = y.length, m = Math.max(p, q);
    const resid = th => { const mu = drift ? th[p + q] : 0, e = new Array(n).fill(0); let css = 0; for (let t = m; t < n; t++) { let v = y[t] - mu; for (let i = 0; i < p; i++) v -= th[i] * (y[t - 1 - i] - mu); for (let j = 0; j < q; j++) v -= th[p + j] * e[t - 1 - j]; e[t] = v; css += v * v; } return { e, css }; };
    const k = p + q + (drift ? 1 : 0);
    const pen = th => { for (let i = 0; i < p + q; i++) if (Math.abs(th[i]) > .99) return 1e12; return resid(th).css; };
    const best = k ? nelderMead(pen, [...Array(p + q).fill(.1), ...(drift ? [mean(y)] : [])]) : { x: [], f: resid([]).css };
    const { e, css } = resid(best.x), ne = n - m, s2 = css / ne, ll = -ne / 2 * (Math.log(2 * Math.PI * s2) + 1);
    return { p, q, drift, th: best.x, s2, aic: -2 * ll + 2 * (k + 1), e: e.slice(m), y };
  }
  function forecastArima(x, M, h) { const y = M.y.slice(), e = new Array(y.length).fill(0), mu = M.drift ? M.th[M.p + M.q] : 0; const ee = M.e; for (let i = 0; i < ee.length; i++) e[y.length - ee.length + i] = ee[i];
    const dy = []; for (let s = 0; s < h; s++) { const t = y.length; let v = mu; for (let i = 0; i < M.p; i++) v += M.th[i] * (y[t - 1 - i] - mu); for (let j = 0; j < M.q; j++) v += M.th[M.p + j] * (e[t - 1 - j] || 0); y.push(v); e.push(0); dy.push(v); }
    const psi = [1]; for (let j = 1; j < h; j++) { let v = j <= M.q ? M.th[M.p + j - 1] : 0; for (let i = 1; i <= M.p; i++) if (j - i >= 0) v += M.th[i - 1] * psi[j - i]; psi.push(v); }
    let lvl = x[x.length - 1], cum = 0, c = 0; const mid = [], se = []; for (let s = 0; s < h; s++) { lvl += dy[s]; mid.push(lvl); c += psi[s]; cum += c * c; se.push(Math.sqrt(M.s2 * cum)); } return { mid, se }; }
  function lgamma(z) { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i); const t = z + g + .5; return .5 * Math.log(2 * Math.PI) + (z + .5) * Math.log(t) - t + Math.log(x); }
  function gammaQ(a, x) { if (x < a + 1) { let s = 1 / a, d = s; for (let n = 1; n < 300; n++) { d *= x / (a + n); s += d; if (Math.abs(d) < 1e-14) break; } return 1 - s * Math.exp(-x + a * Math.log(x) - lgamma(a)); } let b = x + 1 - a, c = 1e300, d = 1 / b, h = d; for (let i = 1; i < 300; i++) { const an = -i * (i - a); b += 2; d = 1 / (an * d + b); c = b + an / c; h *= d * c; if (Math.abs(d * c - 1) < 1e-14) break; } return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h; }
  const acf = (e, k) => { const m = mean(e), d = e.reduce((s, v) => s + (v - m) ** 2, 0); let s = 0; for (let i = k; i < e.length; i++) s += (e[i] - m) * (e[i - k] - m); return s / d; };
  const ljung = (e, lag) => { const n = e.length; let Q = 0; for (let k = 1; k <= lag; k++) Q += acf(e, k) ** 2 / (n - k); Q *= n * (n + 2); return { Q, p: gammaQ(lag / 2, Q / 2) }; };

  /* ================= ARIMA tab ================= */
  let A = null, lastCut = -1, fits = [];
  const ORDERS = []; for (let p = 0; p <= 3; p++) for (let q = 0; q <= 3; q++) ORDERS.push([p, q]);
  $('aSel').innerHTML += ORDERS.map(([p, q]) => `<option value="${p},${q}">ARIMA(${p},1,${q})</option>`).join('');
  let src = 'obs';
  const RMD = Array.from({ length: 1392 }, (_, i) => PF.c[i % PF.c.length]);
  function runArima() {
    const H = +$('aH').value, cut = src === 'rmd' ? PF.c.length - 1 : +$('aCut').value, x = src === 'rmd' ? RMD : PF.c.slice(0, cut + 1);
    if (cut + src !== lastCut) { // stepwise search in the style of forecast::auto.arima (Hyndman–Khandakar)
      lastCut = cut + src; fits = []; const seen = new Map();
      const fit = (p, q, dr) => { const key = p + ',' + q + ',' + dr; if (p < 0 || q < 0 || p > 5 || q > 5) return null; if (!seen.has(key)) { const f = fitArima(x, p, q, dr); seen.set(key, f); fits.push(f); } return seen.get(key); };
      let best = [[2, 2, true], [0, 0, true], [1, 0, true], [0, 1, true], [0, 0, false]].map(o => fit(...o)).reduce((a, b) => b.aic < a.aic ? b : a);
      for (let it = 0; it < 94; it++) {
        const { p, q, drift } = best, cand = [[p - 1, q, drift], [p + 1, q, drift], [p, q - 1, drift], [p, q + 1, drift], [p - 1, q - 1, drift], [p + 1, q + 1, drift], [p - 1, q + 1, drift], [p + 1, q - 1, drift], [p, q, !drift]].map(o => fit(...o)).filter(Boolean);
        const nb = cand.reduce((a, b) => b.aic < a.aic ? b : a, best); if (nb === best) break; best = nb;
      }
      fits.best = best;
    }
    const sel = $('aSel').value, M = sel === 'auto' ? fits.best : fitArima(x, +sel.split(',')[0], +sel.split(',')[1], fits.best.drift);
    const fc = forecastArima(x, M, H), adf = adfTest(x), adfD = adfTest(x.slice(1).map((v, i) => v - x[i])), lb = ljung(M.e, 5);
    const actual = PF.c.slice(cut + 1, cut + 1 + H), cover = actual.length ? actual.filter((a, h) => Math.abs(a - fc.mid[h]) <= 1.96 * fc.se[h]).length / actual.length : null;
    const mape = actual.length ? mean(actual.map((a, h) => Math.abs(fc.mid[h] - a) / a)) : null;
    A = { cut: src === 'rmd' ? null : cut, H, M, fc, x, actual: src === 'rmd' ? [] : actual };
    $('aCutO').textContent = PF.d[cut]; $('aHO').textContent = H;
    const lbl = f => `ARIMA(${f.p},1,${f.q})${f.drift ? ' with drift' : ''}`;
    $('aK').innerHTML = [['adf.test (levels)', `DF = ${adf.STAT.toFixed(2)}, lag ${adf.lag}, p ≈ ${adf.p.toFixed(2)}`, adf.p > .05 ? 'warn' : 'pos'], ['adf.test (differenced)', `DF = ${adfD.STAT.toFixed(2)}, p ${adfD.p <= .01 ? '< 0.01' : '≈ ' + adfD.p.toFixed(2)}`, adfD.p < .05 ? 'pos' : 'warn'], ['selected', lbl(M), M.p === 1 && M.q === 0 ? 'pos' : ''], ['Ljung–Box (lag 5)', `X² = ${lb.Q.toFixed(2)}, p = ${lb.p.toFixed(3)}`, lb.p > .05 ? 'pos' : 'warn'], ['MAPE vs actual', mape == null ? 'no future data' : (mape * 100).toFixed(2) + '%', ''], ['actual inside 95%', cover == null ? '—' : (cover * 100).toFixed(0) + '%', '']]
      .map(([k, v, c]) => `<div class="kpi"><span>${k}</span><b class="${c}" style="font-size:13.5px">${v}</b></div>`).join('');
    $('aTrace').innerHTML = `<span class="dim">Fitting models using approximations (CSS)…</span>\n` + fits.map(f => `<span class="${f === fits.best ? 'hit' : ''}">${lbl(f).padEnd(28)}: AIC=${f.aic.toFixed(2)}</span>`).join('\n') + `\n\n<span class="hit">Best model: ${lbl(fits.best)}</span>\n<span class="dim">Report (R): Best model ARIMA(1,1,0) — here ΔAIC = ${(fitArima(x, 1, 0, fits.best.drift).aic - fits.best.aic).toFixed(2)} vs the port's pick</span>`;
    aMain.redraw(); rTs.redraw(); rAcf.redraw(); rHist.redraw();
  }
  const aMain = new Plot($('aMain'), { pad: { l: 46 } }), rTs = new Plot($('rTs'), { pad: { l: 40 } }), rAcf = new Plot($('rAcf'), { pad: { l: 40 } }), rHist = new Plot($('rHist'), { pad: { l: 30 } });
  aMain.render = p => { if (!A) return; if (A.cut == null) { const x = A.x, n = x.length, i0 = n - 200, fx = A.fc.mid.map((_, h) => n + h), lo = A.fc.mid.map((m, h) => m - 1.96 * A.fc.se[h]), hi = A.fc.mid.map((m, h) => m + 1.96 * A.fc.se[h]), xs = []; for (let i = i0; i < n; i++) xs.push(i); const all = [...xs.map(i => x[i]), ...lo, ...hi];
      p.frame(i0, n + A.H, Math.min(...all), Math.max(...all), .04).axes({ xFmt: v => 't=' + v.toFixed(0), yFmt: v => '$' + v.toFixed(0) }); p.area([n - 1, ...fx], [x[n - 1], ...lo], [x[n - 1], ...hi], { color: PC.cyan, alpha: .15 }); p.line(xs, xs.map(i => x[i]), { color: PC.amber, width: 1.4 }); p.line([n - 1, ...fx], [x[n - 1], ...A.fc.mid], { color: PC.cyan, width: 2 }); p.vline(946, { label: 'data starts repeating (t = 946)', color: 'rgba(255,107,139,.6)' }); return; }
    const i0 = Math.max(0, A.cut - 120), fx = A.fc.mid.map((_, h) => A.cut + 1 + h), hx = []; for (let i = i0; i <= Math.min(PF.c.length - 1, A.cut + A.H); i++) hx.push(i);
    const lo = A.fc.mid.map((m, h) => m - 1.96 * A.fc.se[h]), hi = A.fc.mid.map((m, h) => m + 1.96 * A.fc.se[h]), all = [...hx.map(i => PF.c[i]), ...lo, ...hi];
    const tk = []; let prev = ''; for (let i = i0; i <= A.cut + A.H; i += Math.ceil((A.cut + A.H - i0) / 6)) { const l = i < PF.c.length ? fmtD(PF.d[i]) : 'future'; tk.push([i, l === prev ? '' : l]); prev = l; }
    p.frame(i0, A.cut + A.H, Math.min(...all), Math.max(...all), .04).axes({ xTicks: tk, yFmt: v => '$' + v.toFixed(0) });
    p.area([A.cut, ...fx], [PF.c[A.cut], ...lo], [PF.c[A.cut], ...hi], { color: PC.cyan, alpha: .15 });
    p.line(hx.filter(i => i <= A.cut), hx.filter(i => i <= A.cut).map(i => PF.c[i]), { color: PC.amber, width: 1.4 });
    p.line(hx.filter(i => i > A.cut), hx.filter(i => i > A.cut).map(i => PF.c[i]), { color: PC.white, width: 1.4 });
    p.line([A.cut, ...fx], [PF.c[A.cut], ...A.fc.mid], { color: PC.cyan, width: 2 }); p.vline(A.cut, { label: 'end of training data' });
    if (p.inside(p.mouse)) { const i = Math.round(p.invX(p.mouse.x)), h = i - A.cut - 1; p.crossX(p.X(i)); p.tooltip([[i < PF.c.length ? PF.d[i] : `t + ${h + 1}`, PC.text], ...(i < PF.c.length ? [`actual $${PF.c[i].toFixed(2)}`] : []), ...(h >= 0 && h < A.H ? [[`point forecast $${A.fc.mid[h].toFixed(2)}`, PC.cyan], [`95%: ${(A.fc.mid[h] - 1.96 * A.fc.se[h]).toFixed(2)} – ${(A.fc.mid[h] + 1.96 * A.fc.se[h]).toFixed(2)}`, PC.text]] : [])], p.X(i), p.mouse.y); } };
  rTs.render = p => { if (!A) return; const e = A.M.e, xs = e.map((_, i) => i), m = Math.max(...e.map(Math.abs)); p.frame(0, e.length - 1, -m, m).axes({ xTicks: [], yFmt: v => v.toFixed(1) }); p.line(xs, e, { color: PC.violet, width: 1 }); };
  rAcf.render = p => { if (!A) return; const ks = [...Array(25)].map((_, k) => k + 1), v = ks.map(k => acf(A.M.e, k)), b = 1.96 / Math.sqrt(A.M.e.length), m = Math.max(b * 1.8, ...v.map(Math.abs)); p.frame(.5, 25.5, -m, m).axes({ xTicks: [1, 5, 10, 15, 20, 25], yFmt: x => x.toFixed(2) }); p.hline(b, { color: 'rgba(94,230,255,.6)' }); p.hline(-b, { color: 'rgba(94,230,255,.6)' }); p.hline(0, { dash: [] }); p.bars(ks, v, { colors: v.map(x => Math.abs(x) > b ? PC.rose : PC.violet), width: .35 }); };
  rHist.render = p => { if (!A) return; const e = A.M.e, sd = Math.sqrt(mean(e.map(v => v * v))), bins = 30, lo = -4 * sd, w = 8 * sd / bins, cnt = new Array(bins).fill(0); e.forEach(v => { const b = Math.floor((v - lo) / w); if (b >= 0 && b < bins) cnt[b]++; });
    const xs = cnt.map((_, i) => lo + (i + .5) * w), dens = xs.map(x => e.length * w * Math.exp(-x * x / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI))); p.frame(lo, -lo, 0, Math.max(...cnt, ...dens) * 1.1).axes({ yTicks: [], xFmt: v => v.toFixed(1) }); p.bars(xs, cnt, { color: 'rgba(167,139,250,.6)', width: .9 }); p.line(xs, dens, { color: PC.amber, width: 1.5 }); };
  ['aCut', 'aH'].forEach(id => $(id).addEventListener('change', runArima)); $('aH').addEventListener('input', () => { $('aHO').textContent = $('aH').value; }); $('aCut').addEventListener('input', () => { $('aCutO').textContent = PF.d[+$('aCut').value]; }); $('aSel').addEventListener('change', runArima); seg($('aSrc'), v => { src = v; $('aCut').disabled = v === 'rmd'; runArima(); });
  runArima();

  /* ================= exploratory tab ================= */
  const years = [2019, 2020, 2021, 2022], byYear = years.map(y => PF.c.filter((_, i) => PF.d[i].startsWith(y)));
  const q = (a, f) => { const s = a.slice().sort((x, y) => x - y), pos = (s.length - 1) * f, l = Math.floor(pos); return s[l] + (s[Math.min(l + 1, s.length - 1)] - s[l]) * (pos - l); };
  const eBox = new Plot($('eBox'), { pad: { l: 46 } }), eRet = new Plot($('eRet'), { pad: { l: 40 } }), eMon = new Plot($('eMon'), { pad: { l: 50, b: 36 } });
  eBox.render = p => { const all = PF.c; p.frame(-.5, 3.5, Math.min(...all), Math.max(...all), .05).axes({ xTicks: years.map((y, k) => [k, String(y)]), yFmt: v => '$' + v.toFixed(0) }); const c = p.ctx;
    byYear.forEach((a, k) => { const [q1, md, q3] = [q(a, .25), q(a, .5), q(a, .75)], iqr = q3 - q1, lo = Math.max(Math.min(...a), q1 - 1.5 * iqr), hi = Math.min(Math.max(...a), q3 + 1.5 * iqr), x = p.X(k), w = (p.X(1) - p.X(0)) * .28;
      c.strokeStyle = SERIES[k]; c.fillStyle = SERIES[k] + '33'; c.fillRect(x - w, p.Y(q3), 2 * w, p.Y(q1) - p.Y(q3)); c.strokeRect(x - w, p.Y(q3), 2 * w, p.Y(q1) - p.Y(q3)); c.beginPath(); c.moveTo(x - w, p.Y(md)); c.lineTo(x + w, p.Y(md)); c.moveTo(x, p.Y(q3)); c.lineTo(x, p.Y(hi)); c.moveTo(x, p.Y(q1)); c.lineTo(x, p.Y(lo)); c.stroke();
      a.filter(v => v > hi || v < lo).forEach(v => { c.beginPath(); c.arc(x, p.Y(v), 2, 0, 7); c.stroke(); }); }); };
  eRet.render = p => { const r = PF.c.slice(1).map((v, i) => 10 * Math.log(v / PF.c[i])), xs = r.map((_, i) => i + 1), m = Math.max(...r.map(Math.abs)); const tk = []; years.forEach(y => { const i = PF.d.findIndex(d => d.startsWith(y)); if (i >= 0) tk.push([i, String(y)]); });
    p.frame(0, PF.c.length - 1, -m, m).axes({ xTicks: tk, yFmt: v => v.toFixed(1) }); p.line(xs, r, { color: PC.amber, width: 1 }); EVENTS.forEach(([d]) => { const i = PF.d.findIndex(x => x >= d); if (i > 0) p.vline(i, { color: 'rgba(255,107,139,.35)' }); }); };
  const monthly = years.map(y => MON.map((_, m) => PF.c.filter((_, i) => PF.d[i].startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).reduce((a, b) => a + b, 0)));
  eMon.render = p => { const flat = monthly.flat(); p.frame(-.5, 48 - .5 + 3, 0, Math.max(...flat) * 1.1).axes({ xTicks: years.map((y, k) => [k * 13 + 5.5, String(y)]), yFmt: v => fmtNum(v) });
    monthly.forEach((ms, k) => p.bars(ms.map((_, m) => k * 13 + m), ms, { color: SERIES[k], width: .8, alpha: .8 }));
    if (p.inside(p.mouse)) { const x = Math.round(p.invX(p.mouse.x)), k = Math.floor(x / 13), m = x - k * 13; if (k >= 0 && k < 4 && m >= 0 && m < 12) p.tooltip([`${MON[m]} ${years[k]}`, [`sum of closes $${monthly[k][m].toFixed(0)}`, SERIES[k]]], p.X(x), p.mouse.y); } };

  /* ================= sector tab ================= */
  const di = s => { const i = dates.findIndex(d => d >= s); return i < 0 ? N - 1 : i; };
  const on = Object.fromEntries(names.map(n => [n, true])); let w0 = 0, w1 = N - 1, drag = null;
  const main = new Plot($('sMain'), { pad: { l: 36, t: 22 } }), bar = new Plot($('sBar'), { pad: { l: 130, b: 22, r: 44 } });
  main.render = p => { const tk = []; let prev = ''; for (let i = 0; i < N; i += Math.ceil(N / 12)) { const l = fmtD(dates[i]); tk.push([i, l === prev ? '' : l]); prev = l; }
    p.frame(0, N - 1, 0, 10).axes({ xTicks: tk, yTicks: [0, 2, 4, 6, 8, 10] }); p.ctx.fillStyle = 'rgba(124,255,178,.06)'; p.ctx.fillRect(p.X(w0), p.T, p.X(w1) - p.X(w0), p.B - p.T);
    EVENTS.forEach(([d], k) => { const i = di(d); p.vline(i, { color: 'rgba(255,107,139,.45)' }); p.ctx.font = '10px JetBrains Mono, monospace'; p.ctx.fillStyle = 'rgba(255,107,139,.85)'; p.ctx.fillText(String(k + 1), p.X(i) + 3, p.T - 8); });
    const xs = dates.map((_, i) => i); names.forEach((n, k) => { if (on[n]) p.line(xs, SEC.s[n], { color: SERIES[k], width: n === 'Health Care' || n === 'Energy' ? 2 : 1.1, alpha: n === 'Health Care' || n === 'Energy' ? 1 : .65 }); });
    if (p.inside(p.mouse) && drag == null) { const i = clamp(Math.round(p.invX(p.mouse.x)), 0, N - 1); p.crossX(p.X(i)); p.tooltip([[dates[i], PC.text], ...names.filter(n => on[n]).map(n => [n, SEC.s[n][i]]).sort((a, b) => b[1] - a[1]).map(([n, v]) => [`${n.padEnd(20)} ${v.toFixed(2)}`, SERIES[names.indexOf(n)]])], p.X(i), p.mouse.y); } };
  bar.render = p => { const ch = names.filter(n => on[n]).map(n => [n, SEC.s[n][w1] - SEC.s[n][w0]]).sort((a, b) => b[1] - a[1]); if (!ch.length) return; const m = Math.max(...ch.map(c => Math.abs(c[1]))) * 1.1 || 1; p.frame(-m, m, 0, ch.length); const c = p.ctx, bh = (p.B - p.T) / ch.length; c.font = '11px JetBrains Mono, monospace';
    ch.forEach(([n, v], k) => { const y = p.T + k * bh; c.fillStyle = SERIES[names.indexOf(n)]; c.globalAlpha = .8; c.fillRect(Math.min(p.X(0), p.X(v)), y + bh * .2, Math.abs(p.X(v) - p.X(0)), bh * .6); c.globalAlpha = 1; c.fillStyle = PC.text; c.textAlign = 'right'; c.fillText(n, p.L - 8, y + bh * .65); c.textAlign = v >= 0 ? 'left' : 'right'; c.fillStyle = v >= 0 ? PC.green : PC.rose; c.fillText((v >= 0 ? '+' : '') + v.toFixed(2), p.X(v) + (v >= 0 ? 5 : -5), y + bh * .65); });
    c.textAlign = 'left'; c.strokeStyle = PC.axis; c.beginPath(); c.moveTo(p.X(0), p.T); c.lineTo(p.X(0), p.B); c.stroke(); };
  function winText() { $('sWinT').textContent = `change ${dates[w0]} → ${dates[w1]} (index points, 0–10 scale)`;
    const inWin = EVENTS.map((e, k) => [k, ...e]).filter(([, d]) => di(d) >= w0 && di(d) <= w1);
    $('sTxt').innerHTML = `<div class="mono" style="font-size:12px;color:#5a6578;margin-bottom:8px">${w1 - w0} trading days</div>` + (inWin.length ? inWin.map(([k, d, l]) => `<div><span class="mono" style="color:#ff6b8b">${k + 1}</span> ${l} <span class="mono" style="color:#5a6578;font-size:11.5px">${d}</span></div>`).join('') : '<div style="color:#5a6578">No marked events in this window.</div>'); }
  const upd = () => { main.redraw(); bar.redraw(); winText(); };
  $('sLeg').innerHTML = names.map((n, k) => `<span data-n="${n}"><i style="background:${SERIES[k]}"></i>${n}</span>`).join('');
  $('sLeg').querySelectorAll('span').forEach(s => s.addEventListener('click', e => { const n = s.dataset.n; if (e.shiftKey || e.metaKey) names.forEach(m => on[m] = m === n); else on[n] = !on[n]; $('sLeg').querySelectorAll('span').forEach(x => x.classList.toggle('off', !on[x.dataset.n])); upd(); }));
  const cv = $('sMain');
  cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); drag = clamp(Math.round(main.invX(e.clientX - r.left)), 0, N - 1); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (drag == null) return; const r = cv.getBoundingClientRect(), i = clamp(Math.round(main.invX(e.clientX - r.left)), 0, N - 1); if (Math.abs(i - drag) > 2) { w0 = Math.min(i, drag); w1 = Math.max(i, drag); upd(); } });
  cv.addEventListener('pointerup', () => { drag = null; });
  seg($('sEv'), v => { if (v === 'all') { w0 = 0; w1 = N - 1; } else { const i = di(EVENTS[+v][0]); w0 = Math.max(0, i - 10); w1 = Math.min(N - 1, i + 45); } upd(); });
  upd();
};
