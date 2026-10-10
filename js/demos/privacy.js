/* Privacy-preserving facial recognition — DP noise, DP-SGD clipping, and a toy CKKS (the scheme TenSEAL uses) */
DEMOS.privacy = async function (root) {
  const RUNS = await loadJSON('assets/data/privacy_runs.json');
  const runDP = RUNS[Object.keys(RUNS).find(k => k.startsWith('dp_'))], runHE = RUNS[Object.keys(RUNS).find(k => k.startsWith('he_'))], runRN = RUNS[Object.keys(RUNS).find(k => k.startsWith('resnet_'))];
  root.innerHTML = `
    <div class="tabs"><button class="on">differential privacy</button><button>homomorphic encryption (CKKS)</button><button>recorded results</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> the notebook's two differential-privacy defences. First, <code>add_noise_to_data(noise_factor = 0.3)</code> adds Gaussian noise to every pixel and clips back to [0, 1]. The image is 50 × 37 pixels, the exact shape <code>fetch_lfw_people(resize = 0.4)</code> produces. The default is a synthetic face drawn in your browser; you can drop in your own photo, which never leaves your device.</p><p>Second, the model trains with <code>DPKerasAdamOptimizer</code>: each gradient is <b>clipped</b> to an L2 norm of 1.0, then Gaussian <b>noise</b> with σ = 0.8 × clip is added before the update. The arrow plot shows one such step. Grey arrows are per-example gradients, white is their honest average, and green is what the optimizer actually uses after clipping and noise. With <code>num_microbatches = 1</code>, as in the notebook, the whole batch is clipped as one.</p>`)}
      <div class="controls">
        <label class="ctl"><span class="lbl">noise_factor <output id="nfO">0.30</output></span><input type="range" id="nf" min="0" max="1" step=".01" value=".3"></label>
        <div class="ctl">image<div class="seg"><button id="imSyn" class="on">synthetic face</button><label class="btn sm" style="border:0;border-left:1px solid var(--line-2);border-radius:0;margin:0">your photo<input type="file" id="imUp" accept="image/*" hidden></label></div></div>
        <button class="btn sm" id="reNoise">resample noise ↻</button>
      </div>
      <div class="grid3">
        <div class="panel"><h4><b>X (scaled to [0, 1])</b><span>50 × 37</span></h4><canvas id="imA" style="width:100%;aspect-ratio:37/50;image-rendering:pixelated;border-radius:8px"></canvas></div>
        <div class="panel"><h4><b>add_noise_to_data(X)</b><span id="psnr"></span></h4><canvas id="imB" style="width:100%;aspect-ratio:37/50;image-rendering:pixelated;border-radius:8px"></canvas></div>
        <div class="panel"><h4><b>DP-SGD: one clipped, noised step</b><span>2-D view</span></h4><canvas class="chart" id="dpv" style="height:auto;aspect-ratio:1"></canvas>
          <div class="controls" style="margin:8px 0 0"><label class="ctl"><span class="lbl">l2_norm_clip <output id="clO">1.0</output></span><input type="range" id="cl" min=".1" max="3" step=".1" value="1"></label><label class="ctl"><span class="lbl">noise_multiplier <output id="nmO">0.8</output></span><input type="range" id="nm" min="0" max="3" step=".1" value=".8"></label><label class="ctl">microbatches<select id="mb"><option value="1">1 (notebook)</option><option value="64">64 (per example)</option></select></label></div></div>
      </div>
      ${LAB.src('privacy', ['noise', 'dpsgd'])}
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> a working miniature of CKKS, the homomorphic encryption scheme the notebook sets up through TenSEAL (<code>ts.context(SCHEME_TYPE.CKKS, poly_modulus_degree = 16384, coeff_mod_bit_sizes = [60, 40, 40, 60])</code>, <code>global_scale = 2**40</code>). Sixteen face features are encoded into a polynomial, encrypted with a public key, and then a "server" multiplies them by plaintext model weights and adds a bias <b>without ever decrypting</b>. Only the key holder can read the result. It matches the plaintext computation to within about 10⁻¹⁰, because CKKS does approximate arithmetic.</p><p><b>Toy parameters:</b> this demo uses a polynomial degree of 32 (16 slots) and power-of-two moduli so it runs instantly and you can read the ciphertext. The notebook's degree of 16,384 is what makes the real thing secure. The notebook reduces faces to 100 PCA features before encrypting, so a ciphertext like this one would hold a whole face descriptor. Summing the slots needs Galois rotation keys, which is why the notebook calls <code>generate_galois_keys()</code>; here the client sums after decrypting.</p>`)}
      <div class="controls"><button class="btn primary" id="heRun">▶ encrypt → compute → decrypt</button><button class="btn sm" id="heKeys">new keys ↻</button><span class="note" id="heInfo"></span></div>
      <div class="grid2">
        <div class="panel"><h4><b>client: features (from the face, 4 × 4 regions)</b></h4><div id="heFeat" class="mono" style="font-size:12px"></div><h4 style="margin-top:12px"><b>ciphertext (c₀, c₁) — first coefficients</b><span id="heQ"></span></h4><div id="heCt" class="log" style="max-height:170px;word-break:break-all"></div></div>
        <div class="panel"><h4><b>server: Enc(x) ⊙ w + b, then rescale</b></h4><div id="heSrv" class="log" style="max-height:120px"></div><h4 style="margin-top:12px"><b>client: decrypt + decode</b></h4><table class="tbl" id="heOut"></table></div>
      </div>
      ${LAB.src('privacy', ['ckks', 'hepca'])}
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the accuracy curves the notebooks actually recorded. ${LAB.badge('rec')} The DP model (noised pixels + DP-SGD, 5 people with 100+ photos each) is the price of privacy made visible: validation accuracy stays under 50%. The CKKS-pipeline MLP on the same five people reaches about 71%. The ResNet50 transfer-learning baseline (34 people, 128 × 128 colour crops, no privacy) memorises the training set (95%) but also generalises to about 70%.</p><p>These runs use different subsets and models, so read them as the size of the trade-off rather than a controlled benchmark — the report's discussion makes the same point.</p>`)}
      <div class="kpis" id="rK"></div>
      <div class="grid3"><div class="panel"><h4><b>DP model</b><span>20 epochs</span></h4><canvas class="chart sm" id="rDP"></canvas></div><div class="panel"><h4><b>CKKS-pipeline MLP</b><span>20 epochs</span></h4><canvas class="chart sm" id="rHE"></canvas></div><div class="panel"><h4><b>ResNet50 baseline</b><span>10 epochs</span></h4><canvas class="chart sm" id="rRN"></canvas></div></div>
      <div class="legend"><span><i style="background:#5ee6ff"></i>training accuracy</span><span><i style="background:#7cffb2"></i>validation accuracy</span></div>
      ${LAB.src('privacy', ['resnet'])}
    </div>`;
  tabs(root);
  const $ = id => root.querySelector('#' + id);
  const W = 37, H = 50;

  /* ---------------- images ---------------- */
  function synthFace() { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#3a3a3a'); bg.addColorStop(1, '#151515'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const sk = g.createRadialGradient(17, 22, 2, 18, 25, 18); sk.addColorStop(0, '#d8d8d8'); sk.addColorStop(1, '#7a7a7a'); g.fillStyle = sk; g.beginPath(); g.ellipse(18.5, 25, 12.5, 17, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2a2a'; g.beginPath(); g.ellipse(18.5, 10, 13, 6, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#202020'; [[13, 21], [24, 21]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 2.4, 1.5, 0, 0, 7); g.fill(); });
    g.strokeStyle = '#3d3d3d'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, 17.5); g.lineTo(15.5, 17); g.moveTo(21.5, 17); g.lineTo(27, 17.5); g.stroke();
    g.strokeStyle = '#8a8a8a'; g.beginPath(); g.moveTo(18.5, 22); g.lineTo(17.3, 29); g.lineTo(19.5, 29.5); g.stroke();
    g.strokeStyle = '#4a4a4a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(14, 34.5); g.quadraticCurveTo(18.5, 37, 23, 34.5); g.stroke();
    return toGray(c); }
  function toGray(c) { const d = c.getContext('2d').getImageData(0, 0, W, H).data, X = new Float32Array(W * H); for (let i = 0; i < W * H; i++) X[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255; return X; }
  let X = synthFace(), seedN = 1;
  function gaussRng(seed) { const r = rng(seed); return () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }; }
  const add_noise_to_data = (data, nf, seed) => { const g = gaussRng(seed); return data.map(v => Math.min(1, Math.max(0, v + nf * g()))); };
  function paint(cv, arr) { cv.width = W; cv.height = H; const g = cv.getContext('2d'), im = g.createImageData(W, H); arr.forEach((v, i) => { const b = Math.round(v * 255); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255; }); g.putImageData(im, 0, 0); }
  function drawImgs() { const nf = +$('nf').value; $('nfO').textContent = nf.toFixed(2); const Y = add_noise_to_data(X, nf, seedN); paint($('imA'), X); paint($('imB'), Y); const mse = X.reduce((s, v, i) => s + (v - Y[i]) ** 2, 0) / X.length; $('psnr').textContent = mse ? `PSNR ${(10 * Math.log10(1 / mse)).toFixed(1)} dB` : 'no noise'; }
  $('nf').addEventListener('input', drawImgs); $('reNoise').addEventListener('click', () => { seedN++; drawImgs(); });
  $('imSyn').addEventListener('click', () => { X = synthFace(); drawImgs(); heFeatures(); });
  $('imUp').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const s = Math.max(W / img.width, H / img.height); g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s); X = toGray(c); $('imSyn').classList.remove('on'); drawImgs(); heFeatures(); }; img.src = URL.createObjectURL(f); });
  drawImgs();

  /* ---------------- DP-SGD vector view ---------------- */
  const dpv = new Plot($('dpv'), { pad: { l: 26, r: 8, t: 8, b: 22 } });
  const per = (() => { const r = rng(4), g = gaussRng(9); return [...Array(64)].map(() => [0.9 + g() * 1.1, 0.5 + g() * 1.1]); })();
  dpv.render = p => { const C = +$('cl').value, nmul = +$('nm').value, mb = +$('mb').value; $('clO').textContent = C.toFixed(1); $('nmO').textContent = nmul.toFixed(1);
    p.frame(-3.2, 3.2, -3.2, 3.2).axes({ xTicks: [-2, 0, 2], yTicks: [-2, 0, 2] }); const c = p.ctx;
    const arrow = (x, y, col, w = 1) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(p.X(0), p.Y(0)); c.lineTo(p.X(x), p.Y(y)); c.stroke(); };
    c.strokeStyle = 'rgba(255,181,71,.6)'; c.setLineDash([4, 4]); c.beginPath(); c.arc(p.X(0), p.Y(0), p.X(C) - p.X(0), 0, 7); c.stroke(); c.setLineDash([]);
    per.forEach(([x, y]) => arrow(x, y, 'rgba(140,155,180,.22)'));
    const avg = [per.reduce((s, v) => s + v[0], 0) / 64, per.reduce((s, v) => s + v[1], 0) / 64];
    const clip = v => { const n = Math.hypot(...v); return n > C ? v.map(x => x * C / n) : v; };
    let used; const g = gaussRng(77 + Math.round(nmul * 10));
    if (mb === 1) { const cl = clip(avg); used = [cl[0] + g() * nmul * C, cl[1] + g() * nmul * C]; }
    else { const cs = per.map(clip), s = [cs.reduce((a, v) => a + v[0], 0), cs.reduce((a, v) => a + v[1], 0)]; used = [(s[0] + g() * nmul * C) / 64, (s[1] + g() * nmul * C) / 64]; cs.forEach(([x, y]) => arrow(x, y, 'rgba(255,181,71,.25)')); }
    arrow(...avg, '#e7ebf2', 2.2); arrow(...used, '#7cffb2', 2.6);
    c.font = '10.5px JetBrains Mono, monospace'; c.fillStyle = '#e7ebf2'; c.fillText('true mean', p.X(avg[0]) + 4, p.Y(avg[1]) - 4); c.fillStyle = '#7cffb2'; c.fillText('used', p.X(used[0]) + 4, p.Y(used[1]) + 12); c.fillStyle = 'rgba(255,181,71,.8)'; c.fillText('clip radius', p.X(C * .7) + 2, p.Y(C * .7) - 2); };
  ['cl', 'nm'].forEach(id => $(id).addEventListener('input', () => dpv.redraw())); $('mb').addEventListener('change', () => dpv.redraw());

  /* ---------------- toy CKKS ---------------- */
  const N = 32, SLOTS = N / 2, DELTA = 2n ** 40n, Q1 = 2n ** 100n, Q0 = 2n ** 60n;
  const mod = (a, q) => ((a % q) + q) % q, center = (a, q) => { a = mod(a, q); return a > q / 2n ? a - q : a; };
  const roots = [...Array(N)].map((_, j) => [Math.cos(Math.PI * (2 * j + 1) / N), Math.sin(Math.PI * (2 * j + 1) / N)]);
  function encode(z, scale) { // canonical embedding inverse: real coefficients from N/2 slot values
    const u = new Array(N); for (let j = 0; j < SLOTS; j++) { u[j] = [z[j], 0]; u[N - 1 - j] = [z[j], 0]; }
    const m = []; for (let k = 0; k < N; k++) { let re = 0; for (let j = 0; j < N; j++) { const a = -Math.PI * (2 * j + 1) * k / N; re += u[j][0] * Math.cos(a) - u[j][1] * Math.sin(a); } m.push(BigInt(Math.round(re / N * Number(scale)))); } return m; }
  function decode(m, q, scale) { const c = m.map(v => Number(center(v, q))); return [...Array(SLOTS)].map((_, j) => { let re = 0; for (let k = 0; k < N; k++) { const a = Math.PI * (2 * j + 1) * k / N; re += c[k] * Math.cos(a); } return re / Number(scale); }); }
  function pmul(a, b, q) { const c = new Array(N).fill(0n); for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const k = i + j, v = a[i] * b[j]; if (k < N) c[k] += v; else c[k - N] -= v; } return c.map(v => mod(v, q)); }
  const padd = (a, b, q) => a.map((v, i) => mod(v + b[i], q));
  let R = rng(2024), key;
  const rU = q => { let v = 0n; for (let k = 0; k < 4; k++) v = (v << 32n) | BigInt(Math.floor(R() * 2 ** 32)); return mod(v, q); };
  const ternary = () => [...Array(N)].map(() => BigInt(Math.floor(R() * 3) - 1));
  const gaussE = () => { const g = gaussRng(Math.floor(R() * 1e9)); return [...Array(N)].map(() => BigInt(Math.round(g() * 3.2))); };
  function keygen() { const s = ternary(), a = [...Array(N)].map(() => rU(Q1)), e = gaussE(); key = { s, pk: [padd(pmul(a, s, Q1).map(v => mod(-v, Q1)), e, Q1), a] }; }
  function encrypt(m) { const v = ternary(), e0 = gaussE(), e1 = gaussE(); return { c0: padd(padd(pmul(v, key.pk[0], Q1), e0, Q1), m, Q1), c1: padd(pmul(v, key.pk[1], Q1), e1, Q1), q: Q1, scale: DELTA }; }
  const decrypt = ct => padd(ct.c0, pmul(ct.c1, key.s.map(v => mod(v, ct.q)), ct.q), ct.q);
  function mulPlain(ct, w) { const pw = encode(w, DELTA); return { c0: pmul(ct.c0, pw, ct.q), c1: pmul(ct.c1, pw, ct.q), q: ct.q, scale: ct.scale * DELTA }; }
  function rescale(ct) { const div = v => { const c = center(v, ct.q); return mod((c >= 0n ? c + DELTA / 2n : c - DELTA / 2n) / DELTA, ct.q / DELTA); }; return { c0: ct.c0.map(div), c1: ct.c1.map(div), q: ct.q / DELTA, scale: ct.scale / DELTA }; }
  const addPlain = (ct, b) => ({ ...ct, c0: padd(ct.c0, encode(b, ct.scale), ct.q) });
  let feats = [];
  function heFeatures() { feats = []; for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) { let s = 0, n = 0; for (let y = Math.floor(by * H / 4); y < Math.floor((by + 1) * H / 4); y++) for (let x = Math.floor(bx * W / 4); x < Math.floor((bx + 1) * W / 4); x++) { s += X[y * W + x]; n++; } feats.push(+(s / n).toFixed(4)); }
    $('heFeat').innerHTML = `x = [${feats.map(v => v.toFixed(3)).join(', ')}]`; }
  const wts = (() => { const r = rng(31); return [...Array(SLOTS)].map(() => +((r() - .5) * 2).toFixed(3)); })(), bias = [...Array(SLOTS)].map((_, i) => +(0.05 * (i % 3)).toFixed(2));
  function runCKKS() {
    const t0 = performance.now(); const m = encode(feats, DELTA), ct = encrypt(m);
    const short = v => { const s = v.toString(); return s.length > 22 ? s.slice(0, 10) + '…' + s.slice(-8) : s; };
    $('heQ').textContent = `mod q = 2^100`; $('heCt').innerHTML = `<span class="dim">c₀ =</span> [${ct.c0.slice(0, 6).map(short).join(', ')}, …]\n<span class="dim">c₁ =</span> [${ct.c1.slice(0, 6).map(short).join(', ')}, …]`;
    const t1 = performance.now(); let r = mulPlain(ct, wts); const sc1 = r.scale; r = rescale(r); r = addPlain(r, bias); const t2 = performance.now();
    $('heSrv').innerHTML = `w = [${wts.slice(0, 6).join(', ')}, …]\nmultiply → scale 2^80, q = 2^100\nrescale ÷ 2^40 → scale 2^40, q = 2^60\nadd b → done in ${(t2 - t1).toFixed(1)} ms <span class="hit">(never saw x)</span>`;
    const out = decode(decrypt(r), r.q, r.scale), plain = feats.map((v, i) => v * wts[i] + bias[i]), err = Math.max(...out.map((v, i) => Math.abs(v - plain[i])));
    $('heOut').innerHTML = '<tr><th>slot</th><th>decrypted</th><th>plaintext x·w + b</th><th>|error|</th></tr>' + out.slice(0, 8).map((v, i) => `<tr><td>${i}</td><td>${v.toFixed(9)}</td><td>${plain[i].toFixed(9)}</td><td>${Math.abs(v - plain[i]).toExponential(1)}</td></tr>`).join('') + `<tr><td>Σ</td><td>${out.reduce((a, b) => a + b, 0).toFixed(6)}</td><td>${plain.reduce((a, b) => a + b, 0).toFixed(6)}</td><td>client-side sum</td></tr>`;
    $('heInfo').textContent = `max error ${err.toExponential(2)} · total ${(performance.now() - t0).toFixed(0)} ms · scale before rescale 2^${sc1.toString(2).length - 1}`;
  }
  keygen(); heFeatures(); runCKKS();
  $('heRun').addEventListener("click", runCKKS); $('heKeys').addEventListener('click', () => { R = rng(Math.floor(Math.random() * 1e9)); keygen(); runCKKS(); });

  /* ---------------- recorded ---------------- */
  const mk = (id, run, ep) => { const p = new Plot($(id), { pad: { l: 40 } }); p.render = q => { const xs = run.map((_, i) => i + 1); q.frame(1, ep, 0, 1).axes({ xTicks: [1, Math.round(ep / 2), ep], yFmt: v => (v * 100).toFixed(0) + '%' }); q.line(xs, run.map(r => r[1]), { color: PC.cyan, width: 1.6 }); q.line(xs, run.map(r => r[3]), { color: PC.green, width: 1.8 }); }; };
  mk('rDP', runDP, 20); mk('rHE', runHE, 20); mk('rRN', runRN, 10);
  const last = r => r[r.length - 1][3];
  $('rK').innerHTML = [['DP model · val accuracy', (last(runDP) * 100).toFixed(1) + '%', 'warn'], ['CKKS-pipeline MLP · val', (last(runHE) * 100).toFixed(1) + '%', ''], ['ResNet50 · val', (last(runRN) * 100).toFixed(1) + '%', ''], ['ResNet50 · train', (runRN[runRN.length - 1][1] * 100).toFixed(1) + '%', '']].map(([k, v, c]) => `<div class="kpi"><span>${k}</span><b class="${c}">${v}</b></div>`).join('');
};
