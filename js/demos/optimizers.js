/* Optimizers: loss-landscape race + same-network training race */
DEMOS.optimizers = async function (root) {
  const RUNS = await loadJSON('assets/data/optimizer_runs.json');
  root.innerHTML = `
    <div class="tabs"><button class="on">recorded MNIST runs</button><button>loss landscape race</button><button>train the same net</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> the actual training logs from <code>comparison.ipynb</code>, parsed from the notebook's saved output. ${LAB.badge('rec')} Each optimizer trained the same <code>Net</code> (two conv layers, two dense layers) on 60,000 MNIST digits for 10 epochs, with batch size 64, learning rate 0.01 and seed 1. SGD used momentum 0.5. The loss is logged every 10 batches, as the training loop printed it.</p><p><b>How to read it:</b> AdaGrad's loss fell almost immediately and it finished with the best test accuracy. SGD with momentum got there more slowly. RMSprop at a learning rate of 0.01 hovered around log(10) ≈ 2.30 (pure guessing) at the start, took about four times as many samples as SGD to get its loss under 0.5, and its test accuracy stayed noisy. A 0.01 learning rate is aggressive for RMSprop on this network.</p>`)}
      <div class="kpis" id="rK"></div>
      <div class="grid-main"><div class="panel"><h4><b>training loss (NLL), every 10th batch</b><span>log scale · smoothed line + raw dots</span></h4><canvas class="chart lg" id="rLoss"></canvas><div class="legend" id="rLeg"></div></div>
      <div class="panel"><h4><b>test accuracy per epoch</b><span>10,000 held-out digits</span></h4><canvas class="chart" id="rAcc"></canvas><table class="tbl" id="rTbl" style="margin-top:10px"></table></div></div>
      ${LAB.src('optimizers', ['opts', 'net', 'train', 'ada'])}
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the same three update rules racing on classic 2-D test functions, where you can actually watch the path. SGD uses the repo's momentum of 0.5; AdaGrad divides each step by the running sum of squared gradients; RMSprop divides by a decaying average (α = 0.99). These are the <code>torch.optim</code> formulas, implemented directly.</p><p><b>Try this:</b> on the ravine, SGD zig-zags across the narrow axis while the adaptive methods rescale each direction. Click the map to move the start, add gradient noise to mimic mini-batches, and toggle Momentum or Adam, which the report listed as future work. Learning rates are tuned per surface so every optimizer has a fair chance.</p>`)}
      <div class="controls">
        <label class="ctl">surface<select id="oSurf"><option value="rosen">Rosenbrock (banana valley)</option><option value="ravine">Ill-conditioned ravine</option><option value="beale">Beale</option><option value="saddle">Saddle + bowl</option><option value="himmel">Himmelblau (4 minima)</option></select></label>
        <label class="ctl"><span class="lbl">learning-rate × <output id="oLrO"></output></span><input type="range" id="oLr" min="-2" max="1.3" step=".05" value="0"></label>
        <label class="ctl"><span class="lbl">gradient noise <output id="oNzO"></output></span><input type="range" id="oNz" min="0" max="1" step=".05" value="0"></label>
        <div class="ctl">run<div class="seg"><button id="oPlay" class="on">▶ play</button><button id="oReset">↺ reset</button></div></div>
      </div>
      <div class="grid-main">
        <div class="panel"><h4><b>click anywhere to drop the start point</b><span id="oStep">step 0</span></h4><canvas class="chart lg" id="oMap" style="cursor:crosshair"></canvas><div class="legend" id="oLeg"></div></div>
        <div class="panel"><h4><b>loss (log scale)</b></h4><canvas class="chart" id="oLoss"></canvas><table class="tbl" id="oTbl" style="margin-top:10px"></table></div>
      </div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> a small stand-in for the MNIST experiment that trains live in your browser. Three copies of one 2-16-16-1 network start from identical weights, see identical mini-batches, and use the repo's exact settings: learning rate 0.01 for all three, momentum 0.5 for SGD. Only the optimizer differs. The shading shows each network's decision boundary.</p><p><b>Worth noticing:</b> on this tiny problem RMSprop usually wins, which is the opposite of MNIST. Optimizer rankings depend on the problem and the learning rate, and that's the real lesson of the project. Use the learning-rate multiplier to see how sensitive each one is.</p>`)}
      <div class="controls">
        <div class="ctl">dataset<div class="seg" id="nData"><button data-v="spiral" class="on">spiral</button><button data-v="circles">circles</button><button data-v="moons">moons</button></div></div>
        <label class="ctl"><span class="lbl">learning-rate × <output id="nLrO"></output></span><input type="range" id="nLr" min="-1.5" max="1" step=".05" value="0"></label>
        <div class="ctl">run<div class="seg"><button id="nPlay" class="on">▶ train</button><button id="nReset">↺ re-init</button></div></div>
      </div>
      <div class="grid3" id="nGrid"></div>
      <div class="grid2" style="margin-top:14px"><div class="panel"><h4><b>training loss (BCE)</b><span id="nEp">epoch 0</span></h4><canvas class="chart sm" id="nLoss"></canvas></div><div class="panel"><h4><b>accuracy</b></h4><canvas class="chart sm" id="nAcc"></canvas></div></div>
    </div>`;
  tabs(root);
  const $ = id => root.querySelector('#' + id);

  /* ================= recorded runs ================= */
  const $r = id => root.querySelector('#' + id);
  const RK = [['ada', 'AdaGrad', '#ffb547'], ['sgd', 'SGD (momentum 0.5)', '#7cffb2'], ['rms', 'RMSprop', '#a78bfa']];
  const rOn = { ada: true, sgd: true, rms: true };
  const smooth = (a, k = 9) => a.map((_, i) => { const w = a.slice(Math.max(0, i - k), i + 1); return w.reduce((x, y) => x + y, 0) / w.length; });
  const rLoss = new Plot($r('rLoss'), { pad: { l: 46 } }), rAcc = new Plot($r('rAcc'), { pad: { l: 46 } });
  rLoss.render = p => { const n = RUNS.sgd.train.length; p.frame(0, n - 1, Math.log10(0.0015), Math.log10(3)).axes({ xTicks: [...Array(11).keys()].map(e => [e * n / 10, e ? 'ep ' + e : '0']), yTicks: [-2, -1, 0, Math.log10(2.3)], yFmt: v => (10 ** v).toFixed(v < -1.5 ? 2 : v < 0 ? 1 : 1) });
    p.hline(Math.log10(2.3026), { color: 'rgba(255,107,139,.4)', label: 'log(10) = chance' });
    RK.forEach(([k, , c]) => { if (!rOn[k]) return; const L = RUNS[k].train.map(r => Math.log10(Math.max(1e-3, r[2]))), xs = L.map((_, i) => i); p.dots(xs, L, { color: c, r: 1.2, alpha: .3 }); p.line(xs, smooth(L), { color: c, width: 1.8 }); });
    if (p.inside(p.mouse)) { const i = clamp(Math.round(p.invX(p.mouse.x)), 0, n - 1); p.crossX(p.X(i)); const r0 = RUNS.sgd.train[i]; p.tooltip([[`epoch ${r0[0]} · sample ${r0[1].toLocaleString()}`, PC.text], ...RK.filter(([k]) => rOn[k]).map(([k, nm, c]) => [`${nm.padEnd(18)} ${RUNS[k].train[i][2].toFixed(4)}`, c])], p.X(i), p.mouse.y); } };
  rAcc.render = p => { p.frame(.5, 10.5, 92, 100).axes({ xTicks: [1, 2, 4, 6, 8, 10], yFmt: v => v + '%' }); RK.forEach(([k, , c]) => { if (!rOn[k]) return; const a = RUNS[k].test.map(t => t[1] / 100), xs = a.map((_, i) => i + 1); p.line(xs, a, { color: c, width: 1.8 }); p.dots(xs, a, { color: c, r: 3 }); }); };
  $r('rLeg').innerHTML = RK.map(([k, n, c]) => `<span data-k="${k}"><i style="background:${c}"></i>${n}</span>`).join('');
  $r('rLeg').querySelectorAll('span').forEach(s => s.addEventListener('click', () => { rOn[s.dataset.k] = !rOn[s.dataset.k]; s.classList.toggle('off', !rOn[s.dataset.k]); rLoss.redraw(); rAcc.redraw(); }));
  $r('rTbl').innerHTML = '<tr><th>optimizer</th><th>epoch 1</th><th>best</th><th>final</th></tr>' + RK.map(([k, n, c]) => { const a = RUNS[k].test.map(t => t[1] / 100); return `<tr><td><span style="color:${c}">●</span> ${n}</td><td>${a[0].toFixed(2)}%</td><td>${Math.max(...a).toFixed(2)}%</td><td>${a[9].toFixed(2)}%</td></tr>`; }).join('');
  const firstBelow = k => { const i = RUNS[k].train.findIndex(r => r[2] < 0.5); return i < 0 ? '—' : (RUNS[k].train[i][1] + (RUNS[k].train[i][0] - 1) * 60000).toLocaleString() + ' samples'; };
  $r('rK').innerHTML = [['best final accuracy', 'AdaGrad · ' + (RUNS.ada.test[9][1] / 100).toFixed(2) + '%', 'pos'], ['SGD final', (RUNS.sgd.test[9][1] / 100).toFixed(2) + '%', ''], ['RMSprop final', (RUNS.rms.test[9][1] / 100).toFixed(2) + '%', 'warn'], ['AdaGrad loss < 0.5 after', firstBelow('ada'), ''], ['SGD loss < 0.5 after', firstBelow('sgd'), ''], ['RMSprop loss < 0.5 after', firstBelow('rms'), '']].map(([k, v, c]) => `<div class="kpi"><span>${k}</span><b class="${c}" style="font-size:15px">${v}</b></div>`).join('');

  /* ================= optimizer update rules ================= */
  const OPT = {
    SGD: { color: '#7cffb2', lr: 1, init: n => ({ V: new Float64Array(n) }), step: (p, g, s, lr) => p.map((v, i) => { s.V[i] = .5 * s.V[i] + g[i]; return v - lr * s.V[i]; }) },
    AdaGrad: { color: '#ffb547', lr: 1, init: n => ({ G: new Float64Array(n) }), step: (p, g, s, lr) => p.map((v, i) => { s.G[i] += g[i] * g[i]; return v - lr * g[i] / (Math.sqrt(s.G[i]) + 1e-10); }) },
    RMSprop: { color: '#a78bfa', lr: 1, init: n => ({ E: new Float64Array(n) }), step: (p, g, s, lr) => p.map((v, i) => { s.E[i] = .99 * s.E[i] + .01 * g[i] * g[i]; return v - lr * g[i] / (Math.sqrt(s.E[i]) + 1e-8); }) },
    Momentum: { color: '#5ee6ff', lr: 1, off: true, init: n => ({ V: new Float64Array(n) }), step: (p, g, s, lr) => p.map((v, i) => { s.V[i] = .9 * s.V[i] + g[i]; return v - lr * s.V[i]; }) },
    Adam: { color: '#ff6b8b', lr: 1, off: true, init: n => ({ m: new Float64Array(n), v: new Float64Array(n), t: 0 }), step: (p, g, s, lr) => { s.t++; return p.map((v, i) => { s.m[i] = .9 * s.m[i] + .1 * g[i]; s.v[i] = .999 * s.v[i] + .001 * g[i] * g[i]; const mh = s.m[i] / (1 - .9 ** s.t), vh = s.v[i] / (1 - .999 ** s.t); return v - lr * mh / (Math.sqrt(vh) + 1e-8); }); } },
  };
  const names = Object.keys(OPT);

  /* ================= landscapes ================= */
  const SURF = {
    rosen: { f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2, g: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)], dom: [-2, 2, -1, 3], start: [-1.5, 2.2], min: [[1, 1]], lr: { SGD: 5e-4, AdaGrad: .25, RMSprop: .01, Momentum: 2.5e-4, Adam: .03 } },
    ravine: { f: (x, y) => .05 * x * x + 5 * y * y, g: (x, y) => [.1 * x, 10 * y], dom: [-10, 10, -6, 6], start: [-9, 4], min: [[0, 0]], lr: { SGD: .09, AdaGrad: 1.2, RMSprop: .08, Momentum: .03, Adam: .15 } },
    beale: { f: (x, y) => (1.5 - x + x * y) ** 2 + (2.25 - x + x * y * y) ** 2 + (2.625 - x + x * y ** 3) ** 2, g: (x, y) => { const a = 1.5 - x + x * y, b = 2.25 - x + x * y * y, c = 2.625 - x + x * y ** 3; return [2 * a * (y - 1) + 2 * b * (y * y - 1) + 2 * c * (y ** 3 - 1), 2 * a * x + 2 * b * 2 * x * y + 2 * c * 3 * x * y * y]; }, dom: [-4.5, 4.5, -4.5, 4.5], start: [-3, -3.5], min: [[3, .5]], lr: { SGD: 5e-4, AdaGrad: .4, RMSprop: .02, Momentum: 2e-4, Adam: .05 } },
    saddle: { f: (x, y) => x * x - y * y + .25 * y ** 4 + .1 * x ** 4 * 0, g: (x, y) => [2 * x, -2 * y + y ** 3], dom: [-3, 3, -3, 3], start: [-2.5, 0.01], min: [[0, Math.SQRT2], [0, -Math.SQRT2]], lr: { SGD: .025, AdaGrad: .5, RMSprop: .02, Momentum: .01, Adam: .05 } },
    himmel: { f: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2, g: (x, y) => { const a = x * x + y - 11, b = x + y * y - 7; return [4 * x * a + 2 * b, 2 * a + 4 * y * b]; }, dom: [-5, 5, -5, 5], start: [-.3, -.9], min: [[3, 2], [-2.805, 3.131], [-3.779, -3.283], [3.584, -1.848]], lr: { SGD: .002, AdaGrad: .6, RMSprop: .03, Momentum: .001, Adam: .08 } },
  };
  let S = SURF.rosen, start = S.start.slice(), runners = [], playing = true, step = 0, heat = null;
  const lrMul = () => Math.pow(10, +$('oLr').value);
  function reset() {
    step = 0;
    runners = names.map(n => ({ n, p: start.slice(), s: OPT[n].init(2), path: [start.slice()], loss: [S.f(...start)], dead: false }));
  }
  const map = new Plot($('oMap'), { pad: { l: 34, b: 24, r: 10 } }), lossP = new Plot($('oLoss'), { pad: { l: 46 } });
  function buildHeat() {
    const w = Math.max(2, Math.floor(map.w)), hh = Math.max(2, Math.floor(map.h)); map.frame(...S.dom);
    const c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'), img = g.createImageData(w, hh);
    let lo = Infinity, hi = -Infinity; const vals = new Float32Array(w * hh);
    for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) { const v = Math.log(1e-3 + S.f(map.invX(i), map.invY(j)) - (S === SURF.saddle ? -3 : 0)); vals[j * w + i] = v; if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    for (let k = 0; k < vals.length; k++) { const u = (vals[k] - lo) / (hi - lo), band = (u * 18) % 1 < .06 ? 1 : 0; const base = 1 - u;
      img.data[k * 4] = 8 + base * 20 + band * 40; img.data[k * 4 + 1] = 12 + base * 70 + band * 60; img.data[k * 4 + 2] = 20 + base * 90 + band * 70; img.data[k * 4 + 3] = 255; }
    g.putImageData(img, 0, 0); heat = { c, w, hh };
  }
  map.render = p => {
    p.frame(...S.dom);
    if (!heat || heat.w !== Math.floor(p.w) || heat.hh !== Math.floor(p.h)) buildHeat();
    p.ctx.drawImage(heat.c, 0, 0);
    p.axes({ grid: false });
    S.min.forEach(([x, y]) => { p.ctx.strokeStyle = '#fff'; p.ctx.beginPath(); const X = p.X(x), Y = p.Y(y); p.ctx.moveTo(X - 5, Y - 5); p.ctx.lineTo(X + 5, Y + 5); p.ctx.moveTo(X + 5, Y - 5); p.ctx.lineTo(X - 5, Y + 5); p.ctx.stroke(); });
    p.clip(() => runners.forEach(r => { if (OPT[r.n].off) return; const col = OPT[r.n].color; p.line(r.path.map(q => q[0]), r.path.map(q => q[1]), { color: col, width: 1.8 }); const q = r.path[r.path.length - 1]; p.dots([q[0]], [q[1]], { color: col, r: 4.5 }); }));
    p.dots([start[0]], [start[1]], { color: '#fff', r: 3 });
  };
  lossP.render = p => {
    const act = runners.filter(r => !OPT[r.n].off); const all = act.flatMap(r => r.loss).filter(v => isFinite(v) && v > 0);
    if (!all.length) return; const lo = Math.log10(Math.max(1e-8, Math.min(...all))), hi = Math.log10(Math.max(...all));
    p.frame(0, Math.max(10, step), lo, hi, .05).axes({ yFmt: v => '1e' + v.toFixed(0), yTicks: niceTicks(lo, hi, 5).filter(v => Number.isInteger(v)) });
    act.forEach(r => p.line(r.loss.map((_, i) => i), r.loss.map(v => Math.log10(Math.max(1e-8, v))), { color: OPT[r.n].color, width: 1.5 }));
  };
  function legend() {
    $('oLeg').innerHTML = names.map(n => `<span data-n="${n}" class="${OPT[n].off ? 'off' : ''}"><i style="background:${OPT[n].color}"></i>${n}${['Momentum', 'Adam'].includes(n) ? ' (future work)' : ''}</span>`).join('');
    $('oLeg').querySelectorAll('span').forEach(s => s.addEventListener('click', () => { OPT[s.dataset.n].off = !OPT[s.dataset.n].off; legend(); map.redraw(); lossP.redraw(); table(); }));
  }
  function table() {
    $('oTbl').innerHTML = '<tr><th>optimizer</th><th>lr</th><th>loss</th></tr>' + runners.filter(r => !OPT[r.n].off).map(r => `<tr><td><span style="color:${OPT[r.n].color}">●</span> ${r.n}</td><td>${(S.lr[r.n] * lrMul()).toPrecision(2)}</td><td>${r.dead ? '<span class="neg">diverged</span>' : r.loss[r.loss.length - 1].toExponential(2)}</td></tr>`).join('');
  }
  let nr = rng(3);
  function tick() {
    if (step >= 600) return;
    const nz = +$('oNz').value;
    runners.forEach(r => {
      if (r.dead) return;
      let g = S.g(...r.p); if (nz) { const m = Math.hypot(...g) || 1; g = g.map(v => v + (nr() - .5) * 2 * nz * m * .8); }
      r.p = OPT[r.n].step(r.p, g, r.s, S.lr[r.n] * lrMul());
      const L = S.f(...r.p); if (!isFinite(L) || Math.abs(r.p[0]) > 1e3 || Math.abs(r.p[1]) > 1e3) { r.dead = true; return; }
      r.path.push(r.p.slice()); r.loss.push(L);
    });
    step++;
  }
  loopWhileVisible(root, () => { if (!playing || !root.querySelector('.tabpane.on #oMap')) return; for (let k = 0; k < 3; k++) tick(); $('oStep').textContent = 'step ' + step; map.redraw(); lossP.redraw(); if (step % 6 === 0) table(); });
  $('oSurf').addEventListener('change', e => { S = SURF[e.target.value]; start = S.start.slice(); heat = null; reset(); map.redraw(); lossP.redraw(); table(); });
  $('oLr').addEventListener('input', () => { $('oLrO').textContent = lrMul().toFixed(2); reset(); table(); });
  $('oNz').addEventListener('input', () => { $('oNzO').textContent = (+$('oNz').value).toFixed(2); reset(); });
  $('oPlay').addEventListener('click', () => { playing = !playing; $('oPlay').textContent = playing ? '❚❚ pause' : '▶ play'; $('oPlay').classList.toggle('on', playing); });
  $('oReset').addEventListener('click', () => { reset(); map.redraw(); });
  $('oMap').addEventListener('click', e => { const r = $('oMap').getBoundingClientRect(); start = [map.invX(e.clientX - r.left), map.invY(e.clientY - r.top)]; reset(); map.redraw(); });
  $('oLrO').textContent = '1.00'; $('oNzO').textContent = '0.00'; $('oPlay').textContent = '❚❚ pause';
  reset(); legend(); table();

  /* ================= same-net race ================= */
  const NETOPT = ['SGD', 'AdaGrad', 'RMSprop'], BASE = { SGD: .01, AdaGrad: .01, RMSprop: .01 };
  const H1 = 16, H2 = 16, NP = 2 * H1 + H1 + H1 * H2 + H2 + H2 + 1;
  let data = [], nets = [], epoch = 0, nPlaying = true, dname = 'spiral';
  function makeData(kind) {
    const r = rng(11), out = [];
    for (let i = 0; i < 240; i++) {
      const c = i % 2; let x, y;
      if (kind === 'spiral') { const t = (i / 240) * 3.2 + .3, a = t * 2.4 + c * Math.PI; x = Math.cos(a) * t / 3.6 + (r() - .5) * .08; y = Math.sin(a) * t / 3.6 + (r() - .5) * .08; }
      else if (kind === 'circles') { const a = r() * 6.283, rad = c ? .35 + (r() - .5) * .12 : .8 + (r() - .5) * .12; x = Math.cos(a) * rad; y = Math.sin(a) * rad; }
      else { const a = r() * Math.PI; x = c ? Math.cos(a) * .6 - .3 : -Math.cos(a) * .6 + .3; y = c ? Math.sin(a) * .6 - .15 : -Math.sin(a) * .6 + .25; x += (r() - .5) * .12; y += (r() - .5) * .12; }
      out.push([x * 2.5, y * 2.5, c]);
    }
    return out;
  }
  function initW(seed) { const r = rng(seed), w = new Float64Array(NP); let k = 0; const fill = (n, fan) => { for (let i = 0; i < n; i++) w[k++] = (r() * 2 - 1) * Math.sqrt(6 / fan) * .9; }; fill(2 * H1, 2 + H1); k += H1; fill(H1 * H2, H1 + H2); k += H2; fill(H2, H2 + 1); k += 1; return w; }
  function forward(w, x, y, cache) {
    let k = 0; const W1 = k; k += 2 * H1; const b1 = k; k += H1; const W2 = k; k += H1 * H2; const b2 = k; k += H2; const W3 = k; k += H2; const b3 = k;
    const h1 = new Float64Array(H1), h2 = new Float64Array(H2);
    for (let j = 0; j < H1; j++) h1[j] = Math.tanh(w[W1 + j] * x + w[W1 + H1 + j] * y + w[b1 + j]);
    for (let j = 0; j < H2; j++) { let s = w[b2 + j]; for (let i = 0; i < H1; i++) s += h1[i] * w[W2 + i * H2 + j]; h2[j] = Math.tanh(s); }
    let o = w[b3]; for (let i = 0; i < H2; i++) o += h2[i] * w[W3 + i];
    const p = 1 / (1 + Math.exp(-o));
    if (cache) Object.assign(cache, { h1, h2, p, W1, b1, W2, b2, W3, b3 });
    return p;
  }
  function grad(w, batch) {
    const g = new Float64Array(NP); let loss = 0; const c = {};
    for (const [x, y, t] of batch) {
      const p = forward(w, x, y, c); loss += -(t * Math.log(p + 1e-9) + (1 - t) * Math.log(1 - p + 1e-9));
      const dO = p - t;
      g[c.b3] += dO; const d2 = new Float64Array(H2);
      for (let i = 0; i < H2; i++) { g[c.W3 + i] += dO * c.h2[i]; d2[i] = dO * w[c.W3 + i] * (1 - c.h2[i] ** 2); }
      const d1 = new Float64Array(H1);
      for (let j = 0; j < H2; j++) { g[c.b2 + j] += d2[j]; for (let i = 0; i < H1; i++) { g[c.W2 + i * H2 + j] += d2[j] * c.h1[i]; d1[i] += d2[j] * w[c.W2 + i * H2 + j]; } }
      for (let i = 0; i < H1; i++) { const d = d1[i] * (1 - c.h1[i] ** 2); g[c.b1 + i] += d; g[c.W1 + i] += d * x; g[c.W1 + H1 + i] += d * y; }
    }
    for (let i = 0; i < NP; i++) g[i] /= batch.length;
    return { g, loss: loss / batch.length };
  }
  function nReset() {
    data = makeData(dname); epoch = 0; const w0 = initW(5);
    nets = NETOPT.map(n => ({ n, w: Array.from(w0), s: OPT[n].init(NP), loss: [], acc: [] }));
    $('nGrid').innerHTML = NETOPT.map(n => `<div class="panel"><h4><b style="color:${OPT[n].color}">${n}</b><span data-acc="${n}">—</span></h4><canvas class="chart sm" data-net="${n}"></canvas></div>`).join('');
    nets.forEach(net => { net.plot = new Plot($('nGrid').querySelector(`[data-net="${net.n}"]`), { pad: { l: 4, r: 4, t: 4, b: 4 } }); net.plot.render = p => drawNet(p, net); });
  }
  const bR = rng(77);
  function nEpoch() {
    const order = data.map((_, i) => i).sort(() => bR() - .5), lrm = Math.pow(10, +$('nLr').value);
    for (let b = 0; b < order.length; b += 24) {
      const batch = order.slice(b, b + 24).map(i => data[i]);
      nets.forEach(net => { const { g } = grad(net.w, batch); net.w = OPT[net.n].step(net.w, g, net.s, BASE[net.n] * lrm); });
    }
    nets.forEach(net => { const { loss } = grad(net.w, data); const acc = data.filter(([x, y, t]) => (forward(net.w, x, y) > .5 ? 1 : 0) === t).length / data.length; net.loss.push(isFinite(loss) ? loss : 5); net.acc.push(acc); });
    epoch++;
  }
  function drawNet(p, net) {
    p.frame(-2.75, 2.75, -2.75, 2.75); const c = p.ctx, n = 40, cw = (p.R - p.L) / n, ch = (p.B - p.T) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = p.invX(p.L + (i + .5) * cw), y = p.invY(p.T + (j + .5) * ch), v = forward(net.w, x, y); c.fillStyle = v > .5 ? `rgba(124,255,178,${((v - .5) * .5).toFixed(3)})` : `rgba(255,107,139,${((.5 - v) * .5).toFixed(3)})`; c.fillRect(p.L + i * cw, p.T + j * ch, cw + .5, ch + .5); }
    p.dots(data.map(d => d[0]), data.map(d => d[1]), { r: 2.2, colors: data.map(d => d[2] ? '#7cffb2' : '#ff6b8b') });
  }
  const nLoss = new Plot($('nLoss'), { pad: { l: 40 } }), nAcc = new Plot($('nAcc'), { pad: { l: 40 } });
  nLoss.render = p => { const m = Math.max(.75, ...nets.flatMap(n => n.loss.slice(0, 5))); p.frame(0, Math.max(20, epoch), 0, Math.min(m, 1.2)).axes({ yFmt: v => v.toFixed(2) }); nets.forEach(n => p.line(n.loss.map((_, i) => i), n.loss, { color: OPT[n.n].color, width: 1.6 })); };
  nAcc.render = p => { p.frame(0, Math.max(20, epoch), .4, 1).axes({ yFmt: v => (v * 100).toFixed(0) + '%' }); nets.forEach(n => p.line(n.acc.map((_, i) => i), n.acc, { color: OPT[n.n].color, width: 1.6 })); };
  let frame = 0;
  loopWhileVisible(root, () => {
    if (!nPlaying || !root.querySelector('.tabpane.on #nGrid') || epoch >= 400) return;
    nEpoch(); frame++;
    if (frame % 3 === 0) nets.forEach(n => n.plot.redraw());
    nLoss.redraw(); nAcc.redraw(); $('nEp').textContent = 'epoch ' + epoch;
    nets.forEach(n => { root.querySelector(`[data-acc="${n.n}"]`).textContent = `acc ${(n.acc[n.acc.length - 1] * 100).toFixed(1)}% · loss ${n.loss[n.loss.length - 1].toFixed(3)}`; });
  });
  seg($('nData'), v => { dname = v; nReset(); nLoss.redraw(); nAcc.redraw(); });
  $('nLr').addEventListener('input', () => { $('nLrO').textContent = Math.pow(10, +$('nLr').value).toFixed(2); });
  $('nPlay').addEventListener('click', () => { nPlaying = !nPlaying; $('nPlay').textContent = nPlaying ? '❚❚ pause' : '▶ train'; $('nPlay').classList.toggle('on', nPlaying); });
  $('nReset').addEventListener('click', () => { nReset(); nLoss.redraw(); nAcc.redraw(); });
  $('nLrO').textContent = '1.00'; $('nPlay').textContent = '❚❚ pause';
  nReset();
};
