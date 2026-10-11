/* House prices — Ames, Iowa: a random-forest appraisal trained live, comparable sales by nearest neighbours */
DEMOS.housing = async function (root) {
  await LAB.need('js/lib/ml.js');
  const D = await loadJSON('assets/data/housing.json');
  const ACC = getComputedStyle(document.body).getPropertyValue('--accent').trim() || PC.green;
  const NB = D.nb, R = D.rows, N = R.length;
  // neighbourhood is encoded by its median price rank so the trees can split on it
  const nbMed = NB.map((_, k) => { const p = R.filter(r => r[7] === k).map(r => r[8]).sort((a, b) => a - b); return p[Math.floor(p.length / 2)] || 0; });
  const nbRank = nbMed.map(v => nbMed.filter(w => w < v).length);
  const feat = r => [r[0], r[1], r[2], r[3], r[4], r[5], Math.log(r[6]), nbRank[r[7]]];
  const NAMES = ['overall quality', 'living area', 'year built', 'basement area', 'garage cars', 'full baths', 'lot size (log)', 'neighbourhood'];
  const X = R.map(feat), y = R.map(r => r[8]);
  const [tr, te] = ML.split(N, .75, 5);
  const rf = ML.forest(tr.map(i => X[i]), tr.map(i => y[i]), { task: 'reg', trees: 40, depth: 10, minLeaf: 3 });
  const sc = ML.scaler(tr.map(i => X[i])), Xs = X.map(sc.t);
  const usd = v => '$' + Math.round(v).toLocaleString();
  const NBN = { Blmngtn: 'Bloomington Heights', Blueste: 'Bluestem', BrDale: 'Briardale', BrkSide: 'Brookside', ClearCr: 'Clear Creek', CollgCr: 'College Creek', Crawfor: 'Crawford', Edwards: 'Edwards', Gilbert: 'Gilbert', IDOTRR: 'Iowa DOT & Rail Road', MeadowV: 'Meadow Village', Mitchel: 'Mitchell', NAmes: 'North Ames', NPkVill: 'Northpark Villa', NWAmes: 'Northwest Ames', NoRidge: 'Northridge', NridgHt: 'Northridge Heights', OldTown: 'Old Town', SWISU: 'South & West of ISU', Sawyer: 'Sawyer', SawyerW: 'Sawyer West', Somerst: 'Somerset', StoneBr: 'Stone Brook', Timber: 'Timberland', Veenker: 'Veenker' };
  root.innerHTML = `<style>
    .lab-housing .listing { border:1px solid var(--line); border-radius:12px; overflow:hidden; background:var(--panel); }
    .lab-housing .listing .top { padding:16px 18px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:flex-end; gap:12px; flex-wrap:wrap; }
    .lab-housing .price { font-size:34px; font-weight:700; letter-spacing:-.01em; color:var(--text); }
    .lab-housing .band { font-family:var(--mono); font-size:12px; color:var(--muted); }
    .lab-housing .facts { display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid var(--line); }
    .lab-housing .facts div { padding:10px 14px; border-right:1px solid var(--line); } .lab-housing .facts div:last-child{border:0}
    .lab-housing .facts b { display:block; font-size:16px; } .lab-housing .facts span { font-family:var(--mono); font-size:10.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; }
    .lab-housing .comps { padding:12px 18px 16px; } .lab-housing .comp { display:flex; justify-content:space-between; gap:10px; padding:7px 0; border-bottom:1px dashed var(--line); font-size:13.5px; }
    @media (max-width:640px){ .lab-housing .facts{grid-template-columns:1fr 1fr} }
  </style>
  <div class="lab-housing">
    <div class="tabs"><button class="on">appraise a home</button><button>what drives price</button><button>model accuracy</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> an appraisal for a home in Ames, Iowa. Describe the house and a model trained on 1,460 real sales estimates its price, with the three most similar homes that actually sold. ${LAB.badge('live')}</p><p><b>Technical:</b> a 40-tree random forest regressor trained in your browser on 75% of the sales (seeded split), using eight of the notebook's strongest features. Neighbourhood is encoded by its median sale price. Comparables are nearest neighbours on standardised features.</p><p><b>Try:</b> raise overall quality from 6 to 8 with nothing else changed — quality moves the price more than an extra garage space.</p>`)}
      <div class="grid-main">
        <div class="panel"><h4><b>the house</b></h4><div class="controls" id="hC" style="margin:0"></div></div>
        <div class="listing"><div class="top"><div><div class="band">ESTIMATED VALUE</div><div class="price" id="hP">–</div></div><div class="band" id="hR"></div></div>
          <div class="facts" id="hF"></div><div class="comps"><div class="band" style="margin-bottom:4px">COMPARABLE SALES</div><div id="hComp"></div></div></div>
      </div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> how much each feature contributes to the forest's decisions (share of total error reduction across all splits), and how price relates to the top driver. ${LAB.badge('live')}</p><p><b>Takeaway:</b> overall quality and living area dominate. Location matters, but mostly through the kind of houses each neighbourhood has.</p>`)}
      <div class="grid2"><div class="panel"><h4><b>feature importance</b><span>random forest</span></h4><canvas class="chart" id="hImp"></canvas></div>
      <div class="panel"><h4><b>sale price vs <span id="hXl">overall quality</span></b></h4><div class="controls" style="margin:0 0 8px"><div class="seg" id="hSel"><button data-v="0" class="on">quality</button><button data-v="1">living area</button><button data-v="2">year built</button></div></div><canvas class="chart" id="hSc"></canvas></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> error on the 365 sales the models never saw, in dollars, next to the scores the notebook printed. ${LAB.badge('live')} ${LAB.badge('rec')}</p><p><b>Why they differ:</b> the notebook's 98% and 100% were R² on the training sales — a tree can memorise them. The typical miss on unseen homes is the number that matters to a buyer.</p>`)}
      <div class="kpis" id="hK"></div>
      <div class="grid-main"><div class="panel"><h4><b>predicted vs actual (held-out sales)</b><span>random forest</span></h4><canvas class="chart" id="hPv"></canvas></div>
      <div class="panel"><h4><b>recorded in the notebook</b><span>training score</span></h4><table class="tbl">${D.rec.map(([m, v]) => `<tr><td>${m}</td><td class="mono">${v.toFixed(2)}%</td></tr>`).join('')}</table></div></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-housing'));
  const $ = id => root.querySelector('#' + id);
  const st = { q: 6, a: 1500, yb: 1975, bs: 1000, g: 2, fb: 2, lot: 9500, nb: NB.indexOf('NAmes') };
  const S = [['q', 'overall quality (1–10)', 1, 10, 1], ['a', 'living area (sq ft)', 500, 4000, 10], ['yb', 'year built', 1880, 2010, 1], ['bs', 'basement (sq ft)', 0, 3000, 10], ['g', 'garage (cars)', 0, 4, 1], ['fb', 'full bathrooms', 0, 3, 1], ['lot', 'lot size (sq ft)', 1500, 40000, 100]];
  $('hC').innerHTML = S.map(([k, l, a, b, s]) => `<label class="ctl" style="min-width:170px;flex:1"><span class="lbl">${l} <output data-o="${k}"></output></span><input type="range" data-k="${k}" min="${a}" max="${b}" step="${s}" value="${st[k]}"></label>`).join('') + `<label class="ctl" style="min-width:200px;flex:1">neighbourhood<select id="hNb">${NB.map((n, i) => `<option value="${i}" ${i === st.nb ? 'selected' : ''}>${NBN[n] || n}</option>`).join('')}</select></label>`;
  $('hC').addEventListener('input', e => { if (e.target.dataset.k) st[e.target.dataset.k] = +e.target.value; if (e.target.id === 'hNb') st.nb = +e.target.value; appraise(); });
  function appraise() {
    S.forEach(([k]) => root.querySelector(`[data-o="${k}"]`).textContent = st[k].toLocaleString());
    const r = [st.q, st.a, st.yb, st.bs, st.g, st.fb, st.lot, st.nb], x = feat(r), p = rf.out(x);
    $('hP').textContent = usd(p); $('hR').textContent = `typical miss on unseen homes ± ${usd(mae)}`;
    $('hF').innerHTML = [[st.a.toLocaleString(), 'sq ft'], [st.fb, 'baths'], [st.g, 'garage'], [st.yb, 'built']].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');
    const kn = ML.knn(Xs, y, 3, 'reg').near(sc.t(x), 3);
    $('hComp').innerHTML = kn.map(i => `<div class="comp"><span>${NBN[NB[R[i][7]]] || NB[R[i][7]]} · ${R[i][1].toLocaleString()} sq ft · built ${R[i][2]} · quality ${R[i][0]}</span><b class="mono">${usd(R[i][8])}</b></div>`).join('');
  }
  const preds = te.map(i => rf.out(X[i])), mae = te.reduce((s, i, k) => s + Math.abs(preds[k] - y[i]), 0) / te.length;
  appraise();
  // importance
  const imp = rf.importance.map((v, j) => [NAMES[j], v]).sort((a, b) => a[1] - b[1]);
  const iP = new Plot($('hImp'), { pad: { l: 118, b: 30 } });
  iP.render = p => { p.frame(0, Math.max(...imp.map(q => q[1])) * 1.1, -.6, imp.length - .4).axes({ yTicks: imp.map((_, i) => i), yFmt: i => imp[i] ? imp[i][0] : '', xFmt: v => Math.round(v * 100) + '%' });
    const c = p.ctx; imp.forEach(([, v], i) => { c.fillStyle = ACC; c.fillRect(p.X(0), p.Y(i) - 7, p.X(v) - p.X(0), 14); }); };
  iP.redraw();
  const sP = new Plot($('hSc'), { pad: { l: 58, b: 32 } }); let sk = 0;
  sP.render = p => { const xs = R.map(r => r[sk]), mn = Math.min(...xs), mx = Math.max(...xs); p.frame(mn, mx, 0, 760000, .03).axes({ yFmt: v => '$' + Math.round(v / 1000) + 'k', xFmt: v => sk === 1 ? Math.round(v).toLocaleString() : Math.round(v) });
    p.dots(xs.map(v => v + (sk === 0 ? (Math.random() - .5) * .4 : 0)), y, { color: ACC, r: 1.8, alpha: .45 }); };
  seg($('hSel'), v => { sk = +v; $('hXl').textContent = ['overall quality', 'living area', 'year built'][sk]; sP.redraw(); }); sP.redraw();
  // accuracy
  const tree = ML.tree(tr.map(i => X[i]), tr.map(i => y[i]), { task: 'reg', depth: 8 }), kn = ML.knn(tr.map(i => Xs[i]), tr.map(i => y[i]), 7, 'reg');
  const maeOf = f => te.reduce((s, i) => s + Math.abs(f(i) - y[i]), 0) / te.length;
  const ss = te.reduce((s, i) => s + (y[i] - y.reduce((a, b) => a + b, 0) / N) ** 2, 0), r2 = 1 - te.reduce((s, i, k) => s + (preds[k] - y[i]) ** 2, 0) / ss;
  $('hK').innerHTML = [['random forest · typical miss', usd(mae)], ['random forest · R² on unseen', r2.toFixed(3)], ['single tree · typical miss', usd(maeOf(i => tree.out(X[i])))], ['kNN (k = 7) · typical miss', usd(maeOf(i => kn.out(Xs[i])))]].map(([k, v]) => `<div class="kpi"><span>${k}</span><b>${v}</b></div>`).join('');
  const pv = new Plot($('hPv'), { pad: { l: 58, b: 32 } });
  pv.render = p => { p.frame(0, 700000, 0, 700000).axes({ xFmt: v => '$' + Math.round(v / 1000) + 'k', yFmt: v => '$' + Math.round(v / 1000) + 'k', xLabel: 'actual sale price' }); p.line([0, 700000], [0, 700000], { color: PC.axis, dash: [4, 4] }); p.dots(te.map(i => y[i]), preds, { color: ACC, r: 2.2, alpha: .6 }); };
  pv.redraw();
};
