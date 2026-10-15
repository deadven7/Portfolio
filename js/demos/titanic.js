/* Titanic — the 891 training passengers; models retrained live and scored on held-out passengers */
DEMOS.titanic = async function (root) {
  await LAB.need('js/lib/ml.js');
  const D = await loadJSON('assets/data/titanic.json');
  const ACC = getComputedStyle(document.body).getPropertyValue('--accent').trim() || PC.amber;
  const TITLES = ['Mr', 'Mrs', 'Miss', 'Master', 'Rare'], PORTS = { S: 'Southampton', C: 'Cherbourg', Q: 'Queenstown' };
  const rows = D.rows.map(r => ({ y: r[0], cls: r[1], fem: r[2], age: r[3], sib: r[4], par: r[5], fare: r[6], emb: r[7], title: r[8] }));
  // impute age by title median, exactly the kind of fill the notebook does
  const med = {}; TITLES.forEach(t => { const a = rows.filter(r => r.title === t && r.age != null).map(r => r.age).sort((x, y) => x - y); med[t] = a[Math.floor(a.length / 2)] || 28; });
  rows.forEach(r => { r.ageF = r.age ?? med[r.title]; });
  const feat = r => [r.cls === 1 ? 1 : 0, r.cls === 2 ? 1 : 0, r.fem, r.ageF, r.sib + r.par, Math.log1p(r.fare), r.emb === 'C' ? 1 : 0, r.emb === 'Q' ? 1 : 0, ...TITLES.map(t => r.title === t ? 1 : 0)];
  const X = rows.map(feat), y = rows.map(r => r.y);
  const [tr, te] = ML.split(X.length, .75, 11);
  const sc = ML.scaler(tr.map(i => X[i])), Xs = X.map(sc.t);
  const lr = ML.logistic(tr.map(i => Xs[i]), tr.map(i => y[i]), { epochs: 400, lr: .4 });
  const rf = await ML.forestA(tr.map(i => X[i]), tr.map(i => y[i]), { trees: 40, depth: 7, minLeaf: 3 });
  const acc = (f, ids) => ids.filter(i => (f(i) > .5 ? 1 : 0) === y[i]).length / ids.length;
  const lrP = i => lr.p(Xs[i]), rfP = i => rf.out(X[i])[1];

  root.innerHTML = `<style>
    .lab-titanic .pass { display:grid; grid-template-columns: 1fr 150px; border:1px solid color-mix(in srgb, var(--accent) 45%, var(--line)); border-radius:12px; overflow:hidden; background:linear-gradient(135deg,#14110c,#0f141d); }
    .lab-titanic .pass .main { padding:16px 18px; display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; }
    .lab-titanic .pass .stub { border-left:2px dashed color-mix(in srgb, var(--accent) 40%, transparent); padding:16px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; gap:6px; }
    .lab-titanic .pass .hd { grid-column:1/-1; display:flex; justify-content:space-between; font-family:var(--mono); font-size:11px; letter-spacing:.2em; color:var(--accent); text-transform:uppercase; }
    .lab-titanic .odds { font-family:var(--mono); font-size:38px; color:var(--text); }
    .lab-titanic select { width:100%; }
    @media (max-width:640px){ .lab-titanic .pass{grid-template-columns:1fr} .lab-titanic .pass .stub{border-left:0;border-top:2px dashed color-mix(in srgb, var(--accent) 40%, transparent)} .lab-titanic .pass .main{grid-template-columns:1fr} }
  </style>
  <div class="lab-titanic">
    <div class="tabs"><button class="on">board the ship</button><button>who survived</button><button>model comparison</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> a boarding pass for RMS Titanic, April 1912. Fill it in and two models trained on the real passenger list estimate the chance this passenger survived. ${LAB.badge('live')}</p><p><b>Technical:</b> logistic regression on standardised features and a 40-tree random forest, both trained in your browser on 75% of the 891 passengers (seeded split). Features follow the notebook: class, sex, age (missing ages filled with the median for the passenger's title), family aboard, log fare, port, and title extracted from the name.</p><p><b>Try:</b> keep everything the same and switch third class to first, or a man to a woman. "Women and children first" is visible in the numbers.</p>`)}
      <div class="grid-main">
        <div class="pass">
          <div class="main">
            <div class="hd"><span>White Star Line · RMS Titanic</span><span>Passenger ticket</span></div>
            <label class="ctl">class<div class="seg" id="tCls"><button data-v="1">first</button><button data-v="2">second</button><button data-v="3" class="on">third</button></div></label>
            <label class="ctl">sex<div class="seg" id="tSex"><button data-v="0" class="on">male</button><button data-v="1">female</button></div></label>
            <label class="ctl"><span class="lbl">age <output id="tAgeO"></output></span><input type="range" id="tAge" min="1" max="75" value="28"></label>
            <label class="ctl"><span class="lbl">family aboard <output id="tFamO"></output></span><input type="range" id="tFam" min="0" max="7" value="0"></label>
            <label class="ctl"><span class="lbl">fare paid (£) <output id="tFareO"></output></span><input type="range" id="tFare" min="4" max="260" value="8"></label>
            <label class="ctl">embarked at<select id="tEmb"><option value="S">Southampton</option><option value="C">Cherbourg</option><option value="Q">Queenstown</option></select></label>
          </div>
          <div class="stub"><span class="mono" style="font-size:10.5px;letter-spacing:.2em;color:var(--muted)">ESTIMATED SURVIVAL</span><span class="odds" id="tOdds">–</span><span class="mono" style="font-size:11px;color:var(--muted)" id="tBoth"></span></div>
        </div>
        <div class="panel"><h4><b>passengers like this one</b><span>same class &amp; sex</span></h4><div id="tLike"></div></div>
      </div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the share of passengers who survived, split the way the notebook explores it. All 891 passengers in the training file are counted. ${LAB.badge('live')}</p><p><b>Takeaway:</b> 74% of women survived against 19% of men; first class fared far better than third; young children were more likely to be saved.</p>`)}
      <div class="controls"><div class="ctl">split by<div class="seg" id="wSel"><button data-v="sex" class="on">sex</button><button data-v="cls">class</button><button data-v="age">age band</button><button data-v="title">title</button><button data-v="emb">port</button></div></div></div>
      <div class="panel"><h4><b>survival rate</b><span id="wSub"></span></h4><canvas class="chart" id="wChart"></canvas></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> accuracy on the 223 passengers held back from training, next to the figures the notebook printed. ${LAB.badge('live')} ${LAB.badge('rec')}</p><p><b>Why they differ:</b> the notebook scored each model on the same passengers it learned from. A decision tree can memorise those, which is why it reported 88.8%. Held-out accuracy is the honest measure of how a model does on people it hasn't seen.</p><p><b>Try:</b> raise the tree depth and watch training accuracy climb while held-out accuracy stalls — overfitting, live.</p>`)}
      <div class="controls"><label class="ctl" style="min-width:240px"><span class="lbl">decision tree depth <output id="dO"></output></span><input type="range" id="dep" min="1" max="14" value="4"></label></div>
      <div class="grid-main"><div class="panel"><h4><b>accuracy: training vs held-out</b></h4><canvas class="chart" id="mChart"></canvas><div class="legend"><span><i style="background:#5a6578"></i>training passengers</span><span><i style="background:${ACC}"></i>held-out passengers</span></div></div>
      <div class="panel"><h4><b>recorded in the notebook</b><span>training-set score</span></h4><table class="tbl">${D.rec.map(([m, v]) => `<tr><td>${m}</td><td class="mono">${v.toFixed(2)}%</td></tr>`).join('')}</table></div></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-titanic'));
  const $ = id => root.querySelector('#' + id);
  const st = { cls: 3, fem: 0 };
  seg($('tCls'), v => { st.cls = +v; pass(); }); seg($('tSex'), v => { st.fem = +v; pass(); });
  ['tAge', 'tFam', 'tFare', 'tEmb'].forEach(id => $(id).addEventListener('input', pass));
  function pass() {
    const age = +$('tAge').value, fam = +$('tFam').value, fare = +$('tFare').value, emb = $('tEmb').value;
    $('tAgeO').textContent = age; $('tFamO').textContent = fam; $('tFareO').textContent = '£' + fare;
    const title = age < 13 && !st.fem ? 'Master' : st.fem ? (age < 18 || fam === 0 ? 'Miss' : 'Mrs') : 'Mr';
    const r = { cls: st.cls, fem: st.fem, ageF: age, sib: fam, par: 0, fare, emb, title };
    const pL = lr.p(sc.t(feat(r))), pR = rf.out(feat(r))[1], p = (pL + pR) / 2;
    $('tOdds').textContent = Math.round(p * 100) + '%'; $('tOdds').style.color = p > .5 ? 'var(--accent)' : '#ff8a8a';
    $('tBoth').textContent = `logistic ${Math.round(pL * 100)}% · forest ${Math.round(pR * 100)}%`;
    const like = rows.filter(q => q.cls === st.cls && q.fem === st.fem), s = like.filter(q => q.y).length;
    $('tLike').innerHTML = `<p class="mono" style="font-size:13px;margin:0 0 10px">${s} of ${like.length} survived (${Math.round(s / like.length * 100)}%)</p><div style="display:flex;flex-wrap:wrap;gap:3px">${like.map(q => `<i title="age ${q.age ?? '?'}" style="width:9px;height:9px;border-radius:2px;background:${q.y ? 'var(--accent)' : '#2a3546'}"></i>`).join('')}</div><p class="note">Each square is a real passenger of this class and sex; lit squares survived.</p>`;
  }
  pass();
  // who survived
  const band = a => a == null ? 'unknown' : a < 13 ? '0–12' : a < 18 ? '13–17' : a < 30 ? '18–29' : a < 45 ? '30–44' : a < 60 ? '45–59' : '60+';
  const keyF = { sex: r => r.fem ? 'female' : 'male', cls: r => ['', 'first', 'second', 'third'][r.cls], age: r => band(r.age), title: r => r.title, emb: r => PORTS[r.emb] };
  const order = { age: ['0–12', '13–17', '18–29', '30–44', '45–59', '60+', 'unknown'] };
  const wP = new Plot($('wChart'), { pad: { l: 44, b: 34 } }); let wk = 'sex';
  wP.render = p => { const g = {}; rows.forEach(r => { const k = keyF[wk](r); (g[k] = g[k] || [0, 0])[0] += r.y; g[k][1]++; }); const ks = order[wk] ? order[wk].filter(k => g[k]) : Object.keys(g).sort();
    p.frame(-.6, ks.length - .4, 0, 1).axes({ xTicks: ks.map((_, i) => i), xFmt: i => ks[i] || '', yFmt: v => Math.round(v * 100) + '%' });
    p.bars(ks.map((_, i) => i), ks.map(k => g[k][0] / g[k][1]), { color: ACC, width: .6 });
    p.ctx.fillStyle = PC.white; p.ctx.font = '11px JetBrains Mono, monospace'; p.ctx.textAlign = 'center'; ks.forEach((k, i) => p.ctx.fillText(`${Math.round(g[k][0] / g[k][1] * 100)}% · n=${g[k][1]}`, p.X(i), p.Y(g[k][0] / g[k][1]) - 6)); p.ctx.textAlign = 'left'; };
  seg($('wSel'), v => { wk = v; wP.redraw(); }); wP.redraw();
  // models
  const mP = new Plot($('mChart'), { pad: { l: 44, b: 34 } });
  function models() { const dep = +$('dep').value; $('dO').textContent = dep;
    const t = ML.tree(tr.map(i => X[i]), tr.map(i => y[i]), { depth: dep, minLeaf: 1 }), tP = i => t.out(X[i])[1];
    const kn = ML.knn(tr.map(i => Xs[i]), tr.map(i => y[i]), 7), kP = i => kn.out(Xs[i])[1];
    const M = [['logistic', lrP], ['random forest', rfP], [`tree (depth ${dep})`, tP], ['kNN (k = 7)', kP]].map(([n, f]) => [n, acc(f, tr), acc(f, te)]);
    mP.render = p => { p.frame(-.6, M.length - .4, .6, 1).axes({ xTicks: M.map((_, i) => i), xFmt: i => M[i] ? M[i][0] : '', yFmt: v => Math.round(v * 100) + '%' });
      p.bars(M.map((_, i) => i - .17), M.map(m => m[1]), { color: '#5a6578', width: .3, base: .6 }); p.bars(M.map((_, i) => i + .17), M.map(m => m[2]), { color: ACC, width: .3, base: .6 });
      p.ctx.fillStyle = PC.white; p.ctx.font = '11px JetBrains Mono, monospace'; p.ctx.textAlign = 'center'; M.forEach((m, i) => p.ctx.fillText((m[2] * 100).toFixed(1) + '%', p.X(i + .17), p.Y(m[2]) - 6)); p.ctx.textAlign = 'left'; };
    mP.redraw(); }
  $('dep').addEventListener('input', models); models();
};
