/* Mobile price tiers — 2,000 phones, 20 specs; softmax regression and a forest trained live */
DEMOS.mobile = async function (root) {
  await LAB.need('js/lib/ml.js');
  const D = await loadJSON('assets/data/mobile.json');
  const ACC = getComputedStyle(document.body).getPropertyValue('--accent').trim() || PC.cyan;
  const C = D.cols, F = C.slice(0, -1), X = D.rows.map(r => r.slice(0, -1)), y = D.rows.map(r => r[r.length - 1]);
  const TIER = ['budget', 'mid-range', 'premium', 'flagship'], TC = ['#7c8aa0', '#5ee6ff', '#a78bfa', '#ffb547'];
  const NICE = { battery_power: ['battery', 'mAh'], blue: ['Bluetooth', ''], clock_speed: ['CPU clock', 'GHz'], dual_sim: ['dual SIM', ''], fc: ['front camera', 'MP'], four_g: ['4G', ''], int_memory: ['storage', 'GB'], m_dep: ['thickness', 'cm'], mobile_wt: ['weight', 'g'], n_cores: ['CPU cores', ''], pc: ['rear camera', 'MP'], px_height: ['screen height', 'px'], px_width: ['screen width', 'px'], ram: ['RAM', 'MB'], sc_h: ['body height', 'cm'], sc_w: ['body width', 'cm'], talk_time: ['talk time', 'h'], three_g: ['3G', ''], touch_screen: ['touch screen', ''], wifi: ['Wi-Fi', ''] };
  const [tr, te] = ML.split(X.length, .75, 3);
  const sc = ML.scaler(tr.map(i => X[i])), Xs = X.map(sc.t);
  const sm = ML.softmax(tr.map(i => Xs[i]), tr.map(i => y[i]), 4, { epochs: 220, lr: .6 });
  const acc = f => te.filter(i => f(i) === y[i]).length / te.length;
  const ranges = F.map((_, j) => { const v = X.map(x => x[j]); return [Math.min(...v), Math.max(...v)]; });
  const bin = F.map((_, j) => ranges[j][1] === 1 && ranges[j][0] === 0);
  root.innerHTML = `<style>
    .lab-mobile .phone { width:150px; height:290px; margin:0 auto; border-radius:26px; border:2px solid color-mix(in srgb, var(--accent) 50%, var(--line-2)); padding:12px 9px; background:#0b0f16; display:flex; flex-direction:column; gap:8px; position:relative; }
    .lab-mobile .phone .scr { flex:1; border-radius:16px; background:linear-gradient(160deg, color-mix(in srgb, var(--accent) 18%, #10151f), #0b0f16); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; text-align:center; padding:8px; }
    .lab-mobile .tier { font-size:20px; font-weight:700; } .lab-mobile .spec { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:10px 16px; }
    .lab-mobile .tg { display:flex; gap:6px; flex-wrap:wrap; } .lab-mobile .tg button { font:12px var(--mono); background:none; border:1px solid var(--line-2); color:var(--muted); border-radius:999px; padding:5px 10px; cursor:pointer; } .lab-mobile .tg button.on { border-color:var(--accent); color:var(--accent); }
  </style>
  <div class="lab-mobile">
    <div class="tabs"><button class="on">configure a phone</button><button>what sets the price</button><button>models</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> a spec sheet. Set the specifications and the model places the phone in one of four price tiers, with its confidence in each. ${LAB.badge('live')}</p><p><b>Technical:</b> multinomial (softmax) logistic regression on all 20 standardised specs, trained in your browser on 1,500 phones and checked on the other 500.</p><p><b>Try:</b> leave everything else alone and drag RAM from 1 GB to 3.5 GB.</p>`)}
      <div class="grid-main"><div class="panel"><h4><b>spec sheet</b></h4><div class="spec" id="mC"></div><div class="tg" id="mT" style="margin-top:12px"></div></div>
      <div class="panel"><div class="phone"><div class="scr"><span class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.14em">PRICE TIER</span><span class="tier" id="mTier">–</span><span class="mono" id="mConf" style="font-size:11px;color:var(--muted)"></span></div></div><canvas class="chart" id="mProb" style="height:150px;margin-top:12px"></canvas></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> for each spec, how far the predicted price tier moves when that spec goes from its lowest to its highest value, holding a typical phone fixed. ${LAB.badge('live')}</p><p><b>Takeaway:</b> RAM dominates, as the notebook found; battery and screen resolution follow. Bluetooth, dual SIM and 3G barely matter.</p>`)}
      <div class="panel"><h4><b>effect on expected price tier (0 = budget … 3 = flagship)</b></h4><canvas class="chart" id="mInf" style="height:420px"></canvas></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> accuracy on 500 phones held out from training, next to the training scores the notebook printed. ${LAB.badge('live')} ${LAB.badge('rec')}</p><p><b>Why they differ:</b> the notebook's 99.75% for trees came from scoring on the training phones. On unseen phones, the linear softmax model is the most accurate here, because price tier in this data rises smoothly with RAM.</p>`)}
      <div class="kpis" id="mK"></div>
      <div class="grid-main"><div class="panel"><h4><b>confusion matrix · softmax · held-out phones</b></h4><div id="mCM"></div></div>
      <div class="panel"><h4><b>recorded in the notebook</b><span>training score</span></h4><table class="tbl">${D.rec.map(([m, v]) => `<tr><td>${m}</td><td class="mono">${v.toFixed(2)}%</td></tr>`).join('')}</table></div></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-mobile'));
  const $ = id => root.querySelector('#' + id);
  const med = F.map((_, j) => { const v = X.map(x => x[j]).sort((a, b) => a - b); return v[1000]; });
  const st = med.slice();
  const SL = ['ram', 'battery_power', 'px_height', 'px_width', 'int_memory', 'pc', 'fc', 'mobile_wt', 'clock_speed', 'n_cores', 'talk_time'];
  $('mC').innerHTML = SL.map(k => { const j = F.indexOf(k), [a, b] = ranges[j]; return `<label class="ctl"><span class="lbl">${NICE[k][0]} <output data-o="${j}"></output></span><input type="range" data-j="${j}" min="${a}" max="${b}" step="${k === 'clock_speed' || k === 'm_dep' ? .1 : 1}" value="${st[j]}"></label>`; }).join('');
  $('mT').innerHTML = F.map((k, j) => bin[j] ? `<button data-b="${j}" class="${st[j] ? 'on' : ''}">${NICE[k][0]}</button>` : '').join('');
  $('mC').addEventListener('input', e => { const j = +e.target.dataset.j; st[j] = +e.target.value; draw(); });
  $('mT').addEventListener('click', e => { const j = e.target.dataset.b; if (j == null) return; st[j] = st[j] ? 0 : 1; e.target.classList.toggle('on', !!st[j]); draw(); });
  const pP = new Plot($('mProb'), { pad: { l: 70, b: 22, t: 6 } }); let probs = [0, 0, 0, 0];
  pP.render = p => { p.frame(0, 1, -.6, 3.4).axes({ yTicks: [0, 1, 2, 3], yFmt: i => TIER[i] || '', xFmt: v => Math.round(v * 100) + '%', grid: false }); probs.forEach((v, i) => { p.ctx.fillStyle = TC[i]; p.ctx.fillRect(p.X(0), p.Y(i) - 6, p.X(v) - p.X(0), 12); }); };
  function draw() { SL.forEach(k => { const j = F.indexOf(k); root.querySelector(`[data-o="${j}"]`).textContent = `${st[j]}${NICE[k][1] ? ' ' + NICE[k][1] : ''}`; });
    probs = sm.probs(sc.t(st)); const t = ML.argmax(probs); $('mTier').textContent = TIER[t]; $('mTier').style.color = TC[t]; $('mConf').textContent = `${Math.round(probs[t] * 100)}% confident`; pP.redraw(); }
  draw();
  // influence: expected tier at min vs max of each spec
  const exp = x => sm.probs(sc.t(x)).reduce((s, p, k) => s + p * k, 0), base = exp(med);
  const inf = F.map((k, j) => { const lo = med.slice(), hi = med.slice(); lo[j] = ranges[j][0]; hi[j] = ranges[j][1]; return [NICE[k][0], exp(lo) - base, exp(hi) - base]; }).sort((a, b) => Math.abs(a[2] - a[1]) - Math.abs(b[2] - b[1]));
  const iP = new Plot($('mInf'), { pad: { l: 110, b: 28 } });
  iP.render = p => { p.frame(-1.6, 1.6, -.6, inf.length - .4).axes({ yTicks: inf.map((_, i) => i), yFmt: i => inf[i] ? inf[i][0] : '', xFmt: v => (v > 0 ? '+' : '') + v.toFixed(1) }); p.vline(0, { color: PC.axis, dash: [] });
    inf.forEach(([, lo, hi], i) => { const c = p.ctx; c.strokeStyle = ACC; c.lineWidth = 2; c.beginPath(); c.moveTo(p.X(lo), p.Y(i)); c.lineTo(p.X(hi), p.Y(i)); c.stroke(); c.fillStyle = '#7c8aa0'; c.beginPath(); c.arc(p.X(lo), p.Y(i), 3.5, 0, 7); c.fill(); c.fillStyle = ACC; c.beginPath(); c.arc(p.X(hi), p.Y(i), 3.5, 0, 7); c.fill(); }); };
  iP.redraw();
  // models
  const pred = te.map(i => sm.predict(Xs[i]));
  const rf = ML.forest(tr.map(i => X[i]), tr.map(i => y[i]), { K: 4, trees: 30, depth: 10 }), tree = ML.tree(tr.map(i => X[i]), tr.map(i => y[i]), { K: 4, depth: 10 }), kn = ML.knn(tr.map(i => Xs[i]), tr.map(i => y[i]), 9, 'cls', 4);
  $('mK').innerHTML = [['softmax regression', acc(i => sm.predict(Xs[i]))], ['random forest (30 trees)', acc(i => ML.argmax(rf.out(X[i])))], ['decision tree', acc(i => ML.argmax(tree.out(X[i])))], ['kNN (k = 9)', acc(i => ML.argmax(kn.out(Xs[i])))]].map(([k, v]) => `<div class="kpi"><span>${k} · held-out</span><b>${(v * 100).toFixed(1)}%</b></div>`).join('');
  const cm = [0, 1, 2, 3].map(a => [0, 1, 2, 3].map(b => te.filter((i, k) => y[i] === a && pred[k] === b).length));
  $('mCM').innerHTML = `<table class="tbl"><tr><th>actual \\ predicted</th>${TIER.map(t => `<th>${t}</th>`).join('')}</tr>${cm.map((r, a) => `<tr><td>${TIER[a]}</td>${r.map((v, b) => `<td class="mono" style="${a === b ? 'color:var(--accent)' : v ? 'color:#ff8a8a' : 'color:var(--dim)'}">${v}</td>`).join('')}</tr>`).join('')}</table>`;
};
