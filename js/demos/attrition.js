/* Credit-card attrition — the three models from "Stat Modeling - Final project.Rmd", refit identically and run in the page */
DEMOS.attrition = async function (root) {
  const M = await loadJSON('assets/data/churn.json');
  const G = M.glm;
  root.innerHTML = `
    <div class="tabs"><button class="on">compare the models</button><button>score a customer</button><button>what drives attrition</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> the three models from the R Markdown, refit on the same 10,127 customers with the same choices, then evaluated live. ${LAB.badge('live')}</p><p><b>Model 1 — <code>glm(label ~ ., family = 'binomial')</code>:</b> plain logistic regression on <code>data1</code>, the dataset after the team dropped five predictors that were highly correlated with others (credit limit vs open-to-buy, transaction amount vs count, and so on). It uses a 75/25 stratified split, and the Rmd flags anyone with P(attrition) > 0.2 rather than 0.5, because missing a leaving customer costs more than a false alarm. <b>Models 2 and 3 — ridge and lasso:</b> <code>cv.glmnet</code> with 10-fold cross-validation picks the penalty λ on a 70/30 split of 14 numeric predictors, then classifies at 0.5.</p><p><b>How to read it:</b> move the threshold slider and watch recall and precision trade off in the glm confusion matrix. The ROC curves show all three models rank customers about equally well; lasso gets there while switching off a predictor.</p>`)}
      <div class="controls"><label class="ctl" style="min-width:260px"><span class="lbl">glm decision threshold <output id="tO"></output></span><input type="range" id="thr" min=".05" max=".9" step=".01" value=".2"></label></div>
      <div class="kpis" id="aK"></div>
      <div class="grid3" id="cms"></div>
      <div class="grid-main" style="margin-top:14px"><div class="panel"><h4><b>ROC curves on each model's test set</b><span>pROC::roc equivalent</span></h4><canvas class="chart" id="roc"></canvas><div class="legend" id="rocLeg"></div></div>
      <div class="panel"><h4><b>prediction_table (as printed in the Rmd)</b></h4><table class="tbl" id="ptab"></table><p class="note" id="recNote"></p></div></div>
      ${LAB.src('attrition', ['label', 'glm', 'ridge', 'lasso'])}
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> a customer profile you can edit, scored by all three fitted models. The bar chart breaks the glm prediction into per-feature contributions (coefficient × value relative to a typical customer), so you can see <i>why</i> the risk moved.</p><p><b>Try:</b> lower the transaction count or raise months inactive and contacts with the bank, the classic signs of a customer drifting away, and watch the risk climb past the 0.2 flag.</p>`)}
      <div class="grid-main">
        <div><div class="panel"><h4><b>customer</b><span><button class="btn sm" id="typ">reset to typical</button></span></h4><div class="controls" id="feat" style="margin:0"></div></div>
          <div class="panel" style="margin-top:14px"><h4><b>glm: contribution to log-odds vs a typical customer</b></h4><canvas class="chart" id="contrib"></canvas></div></div>
        <div class="panel"><h4><b>P(attrition)</b></h4><div id="gauges"></div><p class="note">Ridge and lasso only use the 14 numeric columns, so the categorical choices move only the glm. Their five extra columns, which aren't on the form, are filled with typical values (months on book 36, Q4/Q1 amount change 0.74) or derived from it (open-to-buy, utilisation, transaction amount ≈ count × $65).</p></div>
      </div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the exploratory section of the Rmd — the grouped bar plots of attrition by contacts, inactivity, number of products and dependents (each bar is the share <i>within</i> its group, as in <code>mutate(prop = n / sum(n))</code>), plus the glm's <code>summary(model)</code> coefficient table with significance stars.</p><p><b>Takeaway:</b> customers who leave contact the bank more, sit inactive longer and hold fewer products. In the model, transaction count and change in transaction count dominate everything else.</p>`)}
      <div class="controls"><div class="ctl">split by<div class="seg" id="eSel"><button data-v="Contacts_Count_12_mon" class="on">contacts (12 mo)</button><button data-v="Months_Inactive_12_mon">months inactive</button><button data-v="Total_Relationship_Count">products held</button><button data-v="Dependent_count">dependents</button></div></div></div>
      <div class="grid-main"><div class="panel"><h4><b>proportion within each class</b><span>existing vs attrited</span></h4><canvas class="chart" id="eda"></canvas><div class="legend"><span><i style="background:#5ee6ff"></i>existing (0)</span><span><i style="background:#ff6b8b"></i>attrited (1)</span></div></div>
      <div class="panel"><h4><b>summary(model)</b><span>glm coefficients</span></h4><div style="max-height:330px;overflow:auto"><table class="tbl" id="coefT"></table></div><p class="note" id="devNote"></p></div></div>
    </div>`;
  tabs(root);
  const $ = id => root.querySelector('#' + id);
  const sig = p => p < .001 ? '***' : p < .01 ? '**' : p < .05 ? '*' : p < .1 ? '.' : '';
  function cm(ps, ys, t) { let tp = 0, fp = 0, tn = 0, fn = 0; ps.forEach((p, i) => { const pr = p > t ? 1 : 0; if (pr && ys[i]) tp++; else if (pr) fp++; else if (ys[i]) fn++; else tn++; }); const rec = tp / (tp + fn), prec = tp / (tp + fp || 1); return { tp, fp, tn, fn, acc: (tp + tn) / ps.length, rec, prec, f1: 2 * prec * rec / (prec + rec || 1), spec: tn / (tn + fp) }; }
  function roc(ps, ys) { const o = ps.map((p, i) => [p, ys[i]]).sort((a, b) => b[0] - a[0]), P = ys.filter(Boolean).length, Nn = ys.length - P; let tp = 0, fp = 0; const pts = [[0, 0]]; o.forEach(([, y]) => { y ? tp++ : fp++; pts.push([fp / Nn, tp / P]); }); return pts.filter((_, i) => i % 6 === 0 || i === pts.length - 1); }
  const MODELS = [['glm (threshold slider)', G, PC.amber], ['ridge (0.5)', M.ridge, PC.cyan], ['lasso (0.5)', M.lasso, PC.green]];
  const ROCS = MODELS.map(([, m]) => roc(m.test.p, m.test.y));
  const rocP = new Plot($('roc'), { pad: { l: 40, b: 30 } });
  rocP.render = p => { p.frame(0, 1, 0, 1).axes({ xLabel: 'false positive rate', yFmt: v => v.toFixed(1), xFmt: v => v.toFixed(1) }); p.line([0, 1], [0, 1], { color: PC.axis, dash: [4, 4] });
    ROCS.forEach((r, k) => p.line(r.map(q => q[0]), r.map(q => q[1]), { color: MODELS[k][2], width: 1.8 }));
    const t = +$('thr').value, c = cm(G.test.p, G.test.y, t); p.dots([1 - c.spec], [c.rec], { color: '#fff', r: 5 }); p.ctx.fillStyle = PC.white; p.ctx.font = '11px JetBrains Mono, monospace'; p.ctx.fillText(`glm @ ${t.toFixed(2)}`, p.X(1 - c.spec) + 8, p.Y(c.rec) + 14); };
  $('rocLeg').innerHTML = MODELS.map(([n, m, c]) => `<span><i style="background:${c}"></i>${n.split(' ')[0]} · AUC ${m.auc.toFixed(3)}</span>`).join('');
  function cmCard(title, c, col, sub) { const cell = (v, lab, good) => `<div style="background:${good ? 'rgba(124,255,178,.08)' : 'rgba(255,107,139,.07)'};border:1px solid var(--line);border-radius:8px;padding:10px;text-align:center"><div class="mono" style="font-size:20px">${v}</div><div class="mono" style="font-size:10.5px;color:#8b96a8">${lab}</div></div>`;
    return `<div class="panel"><h4><b style="color:${col}">${title}</b><span>${sub}</span></h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${cell(c.tn, 'true stay', 1)}${cell(c.fp, 'false alarm', 0)}${cell(c.fn, 'missed leaver', 0)}${cell(c.tp, 'caught leaver', 1)}</div><div class="mono" style="font-size:11.5px;color:#aab4c3;margin-top:10px">acc ${(c.acc * 100).toFixed(1)}% · recall ${(c.rec * 100).toFixed(1)}% · precision ${(c.prec * 100).toFixed(1)}% · F1 ${c.f1.toFixed(3)}</div></div>`; }
  function update() { const t = +$('thr').value; $('tO').textContent = t.toFixed(2);
    const cg = cm(G.test.p, G.test.y, t), cr = cm(M.ridge.test.p, M.ridge.test.y, .5), cl = cm(M.lasso.test.p, M.lasso.test.y, .5);
    $('cms').innerHTML = cmCard('glm', cg, PC.amber, `test n = ${G.test.p.length} · p > ${t.toFixed(2)}`) + cmCard('ridge', cr, PC.cyan, `λ = ${M.ridge.lambda.toExponential(2)}`) + cmCard('lasso', cl, PC.green, `λ = ${M.lasso.lambda.toExponential(2)} · ${M.lasso.zeros} coef = 0`);
    $('aK').innerHTML = [['customers', M.n.toLocaleString()], ['attrition rate', (M.rate * 100).toFixed(1) + '%'], ['glm AUC', G.auc.toFixed(3)], ['ridge accuracy', (M.ridge.acc * 100).toFixed(2) + '%'], ['lasso accuracy', (M.lasso.acc * 100).toFixed(2) + '%'], ['lasso zeroed', M.lasso.zeros + ' predictor']].map(([k, v]) => `<div class="kpi"><span>${k}</span><b>${v}</b></div>`).join('');
    rocP.redraw(); }
  const pt = m => { const c = m.test.p.filter((p, i) => (p > .5 ? 1 : 0) === m.test.y[i]).length; return [c, m.test.p.length - c]; };
  $('ptab').innerHTML = '<tr><th>Model</th><th>Correct</th><th>Incorrect</th></tr>' + [['Ridge', M.ridge], ['Lasso', M.lasso]].map(([n, m]) => { const [c, w] = pt(m); return `<tr><td>${n}</td><td>${c}</td><td>${w}</td></tr>`; }).join('');
  $('recNote').innerHTML = `${LAB.badge('rec')} the Rmd computed the glm's recall at the 0.2 threshold as 309 / (97 + 309) = <b>76.1%</b>. The refit gives ${(cm(G.test.p, G.test.y, .2).rec * 100).toFixed(1)}%; <code>createDataPartition</code> ran without a seed, so every split differs a little.`;
  $('thr').addEventListener('input', update); update();

  /* ---------- score a customer ---------- */
  const R = G.ranges, cats = G.cats, state = {};
  const typical = () => { G.num.forEach(k => state[k] = R[k][2]); state.Gender = 'F'; state.Education_Level = 'Graduate'; state.Income_Category = 'Less than $40K'; state.Card_Category = 'Blue'; state.Marital_Status = 'Married'; };
  typical();
  const NICE = { Customer_Age: 'age', Dependent_count: 'dependents', Total_Relationship_Count: 'products held', Months_Inactive_12_mon: 'months inactive (12 mo)', Contacts_Count_12_mon: 'contacts with bank (12 mo)', Credit_Limit: 'credit limit ($)', Total_Revolving_Bal: 'revolving balance ($)', Total_Trans_Ct: 'transactions (12 mo)', Total_Ct_Chng_Q4_Q1: 'txn count change Q4/Q1' };
  function buildFeat() { $('feat').innerHTML = G.num.map(k => { const [lo, hi] = R[k], st = hi - lo > 50 ? Math.round((hi - lo) / 100) : hi - lo > 5 ? 1 : .01; return `<label class="ctl" style="min-width:180px;flex:1"><span class="lbl">${NICE[k]} <output data-o="${k}">${(+state[k]).toFixed(st < 1 ? 2 : 0)}</output></span><input type="range" data-k="${k}" min="${lo}" max="${hi}" step="${st}" value="${state[k]}"></label>`; }).join('') +
    Object.keys(cats).map(k => `<label class="ctl" style="min-width:160px"><span>${k.replace(/_/g, ' ').toLowerCase()}</span><select data-c="${k}">${cats[k].map(v => `<option ${state[k] === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`).join('');
    $('feat').querySelectorAll('input[data-k]').forEach(el => el.addEventListener('input', () => { state[el.dataset.k] = +el.value; root.querySelector(`[data-o="${el.dataset.k}"]`).textContent = (+el.value).toFixed(+el.step < 1 ? 2 : 0); score(); }));
    $('feat').querySelectorAll('select').forEach(el => el.addEventListener('change', () => { state[el.dataset.c] = el.value; score(); })); }
  const xGlm = s => G.cols.map(c => { if (c === '(Intercept)') return 1; if (c in s) return s[c]; const k = Object.keys(cats).find(k => c.startsWith(k) && cats[k].includes(c.slice(k.length))); return k ? (s[k] === c.slice(k.length) ? 1 : 0) : 0; });
  const sigm = z => 1 / (1 + Math.exp(-z));
  const pGlm = s => sigm(xGlm(s).reduce((a, x, i) => a + x * G.b[i], 0));
  const NUM14 = s => ({ Months_on_book: 36, Avg_Open_To_Buy: Math.max(0, s.Credit_Limit - s.Total_Revolving_Bal), Total_Amt_Chng_Q4_Q1: 0.74, Total_Trans_Amt: s.Total_Trans_Ct * 65, Avg_Utilization_Ratio: s.Total_Revolving_Bal / Math.max(1, s.Credit_Limit), ...s });
  const pPen = (m, s) => { const v = NUM14(s); return sigm(m.b0 + m.cols.reduce((a, c, i) => a + m.coef[i] * (v[c] - m.mean[i]) / m.scale[i], 0)); };
  const contribP = new Plot($('contrib'), { pad: { l: 170, b: 20 } }); let contrib = [];
  contribP.render = p => { if (!contrib.length) return; const m = Math.max(.5, ...contrib.map(c => Math.abs(c[1]))) * 1.1, c = p.ctx; p.frame(-m, m, 0, contrib.length); const bh = (p.B - p.T) / contrib.length; c.font = '10.5px JetBrains Mono, monospace';
    contrib.forEach(([n, v], k) => { const y = p.T + k * bh; c.fillStyle = v > 0 ? 'rgba(255,107,139,.7)' : 'rgba(124,255,178,.6)'; c.fillRect(Math.min(p.X(0), p.X(v)), y + bh * .2, Math.abs(p.X(v) - p.X(0)), bh * .6); c.fillStyle = PC.text; c.textAlign = 'right'; c.fillText(n, p.L - 8, y + bh * .65); });
    c.textAlign = 'left'; c.strokeStyle = PC.axis; c.beginPath(); c.moveTo(p.X(0), p.T); c.lineTo(p.X(0), p.B); c.stroke(); };
  const base = (() => { const s = {}; G.num.forEach(k => s[k] = R[k][2]); Object.keys(cats).forEach(k => s[k] = cats[k][0]); return xGlm(s); })();
  function score() { const x = xGlm(state); contrib = G.cols.map((c, i) => { const k = Object.keys(cats).find(k => c.startsWith(k) && c !== k); return [k ? k.split('_')[0].toLowerCase() + ': ' + c.slice(k.length) : (NICE[c] || c), G.b[i] * (x[i] - base[i])]; }).filter(c => c[0] !== '(Intercept)' && Math.abs(c[1]) > 1e-3).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 10);
    const ps = [['glm', pGlm(state), PC.amber, .2], ['ridge', pPen(M.ridge, state), PC.cyan, .5], ['lasso', pPen(M.lasso, state), PC.green, .5]];
    $('gauges').innerHTML = ps.map(([n, p, c, t]) => `<div style="margin:6px 0 18px"><div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px;color:#8b96a8"><span style="color:${c}">${n}</span><span>flag above ${t}</span></div><div style="font-family:var(--mono);font-size:30px;color:${p > t ? '#ff6b8b' : '#e7ebf2'}">${(p * 100).toFixed(1)}%</div><div style="height:8px;border-radius:4px;background:var(--line);position:relative"><div style="height:100%;width:${(p * 100).toFixed(1)}%;background:${c};border-radius:4px"></div><div style="position:absolute;top:-4px;bottom:-4px;left:${t * 100}%;width:2px;background:#fff"></div></div><div class="mono" style="font-size:11.5px;margin-top:6px;color:${p > t ? '#ff6b8b' : '#7cffb2'}">${p > t ? 'likely to leave' : 'likely to stay'}</div></div>`).join('');
    contribP.redraw(); }
  $('typ').addEventListener('click', () => { typical(); buildFeat(); score(); });
  buildFeat(); score();

  /* ---------- EDA ---------- */
  const eda = new Plot($('eda'), { pad: { l: 44 } }); let ek = 'Contacts_Count_12_mon';
  eda.render = p => { const e = M.eda[ek], n = e.levels.length; p.frame(-.6, n - .4, 0, Math.max(...e.existing, ...e.attrited) * 1.15).axes({ xTicks: e.levels.map((l, i) => [i, l]), yFmt: v => (v * 100).toFixed(0) + '%' }); p.bars(e.levels.map((_, i) => i - .18), e.existing, { color: PC.cyan, width: .32 }); p.bars(e.levels.map((_, i) => i + .18), e.attrited, { color: PC.rose, width: .32 }); };
  seg($('eSel'), v => { ek = v; eda.redraw(); });
  $('coefT').innerHTML = '<tr><th>term</th><th>estimate</th><th>std. error</th><th>z</th><th>Pr(>|z|)</th><th></th></tr>' + G.cols.map((c, i) => `<tr><td>${c}</td><td>${G.b[i].toPrecision(3)}</td><td>${G.se[i].toPrecision(3)}</td><td>${G.z[i].toFixed(2)}</td><td>${G.p[i] < 2e-16 ? '< 2e-16' : G.p[i].toExponential(2)}</td><td class="pos">${sig(G.p[i])}</td></tr>`).join('');
  $('devNote').innerHTML = `Null deviance ${G.null.toFixed(1)} · residual deviance ${G.dev.toFixed(1)} on ${G.ntrain - G.b.length} df · AIC ${G.aic.toFixed(1)} · signif. codes: *** 0.001 ** 0.01 * 0.05 . 0.1`;
};
