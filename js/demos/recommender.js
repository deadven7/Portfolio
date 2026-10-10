/* Generic clustering & recommender — ports of the two Data Mining notebooks */
DEMOS.recommender = async function (root) {
  const [raw, meta, SW, U] = await Promise.all([loadJSON('assets/data/netflix.json'), loadJSON('assets/data/netflix_meta.json'), loadJSON('assets/data/nltk_stopwords.json'), loadJSON('assets/data/universities.json')]);
  root.innerHTML = `
    <div class="tabs"><button class="on">netflix recommender</button><button>similarity graph</button><button>netflix clusters</button><button>college clustering</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> the Netflix notebook's recommender running on all 7,787 titles. For every title, director + cast + genres + description are glued into one "Clustering Attributes" string, cleaned (non-ASCII characters, NLTK stopwords and punctuation removed), turned into word counts with <code>CountVectorizer</code>, and compared with cosine similarity. <code>recommendation()</code> returns the 10 closest titles.</p><p><b>Check it:</b> the notebook printed recommendations for <i>Stranger Things</i> and <i>House of Cards</i>; when you pick one of those, the recorded list appears beside the live one so you can confirm the port gives identical results. The pipeline panel shows what the text looks like after each cleaning step.</p>`)}
      <div class="controls">
        <label class="ctl" style="flex:1;min-width:240px;position:relative">pick a title<input type="text" id="rQ" autocomplete="off" placeholder="type to search…"><div id="rSug" class="sug"></div></label>
        <div class="ctl">notebook examples<div class="seg" id="rTry"><button data-v="Stranger Things" class="on">Stranger Things</button><button data-v="House of Cards">House of Cards</button><button data-v="Marvel's Daredevil">Marvel's Daredevil</button><button data-v="How I Met Your Mother">How I Met Your Mother</button></div></div>
      </div>
      <div class="grid-main">
        <div class="panel"><h4><b>recommendation("<span id="rT"></span>")</b><span id="rTime"></span></h4><div id="rList"></div></div>
        <div><div class="panel"><h4><b>preprocessing, step by step</b></h4><div id="rPipe" class="pipe"></div></div>
          <div class="panel" style="margin-top:14px" id="rRecWrap"><h4><b>recorded in the notebook</b>${LAB.badge('rec')}</h4><div id="rRec"></div></div></div>
      </div>
      ${LAB.src('recommender', ['combine', 'clean', 'cv'])}
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the notebook's NetworkX visualisation, rebuilt as a live force-directed graph. Each title is linked to its actors and directors (green) and genres (orange), plus a <code>Similar_Title(…)</code> node (yellow) pointing at its five nearest neighbours by TF-IDF similarity. Titles that share a cast member or genre end up pulled together.</p><p><b>Try:</b> the Marvel preset reproduces the notebook's own test, which shows how the Defenders shows tie together through shared actors. Drag nodes around; hover to read labels.</p>`)}
      <div class="controls"><div class="ctl">preset<div class="seg" id="gPre"><button data-v="marvel" class="on">Marvel's Netflix shows (notebook test)</button><button data-v="seed">current title</button></div></div><span class="note" id="gInfo"></span></div>
      <div class="panel"><canvas class="chart" id="gCv" style="height:540px;cursor:grab"></canvas><div class="legend"><span><i style="background:#ff6b8b"></i>title</span><span><i style="background:#7cffb2"></i>actor / director</span><span><i style="background:#ffb547"></i>genre</span><span><i style="background:#fde68a"></i>Similar_Title</span></div></div>
      ${LAB.src('recommender', ['tfidf', 'graph'])}
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the clustering half of the Netflix notebook. The token lists are TF-IDF-weighted (top 10,000 terms) and grouped with K-Means; the elbow curve is why the team chose k = 5 over the first, too-coarse elbow at 2. Each card lists a cluster's heaviest terms, which is how you tell what the cluster "means".</p><p>These numbers were precomputed in Python with scikit-learn (<code>k-means++</code>, <code>random_state = 42</code>) on the TF-IDF matrix directly. The notebook first reduced it to 2,750 PCA components, which is too heavy to repeat here. The clusters it finds are the expected ones: documentaries and stand-up, international TV, docuseries and reality, international films, and family films.</p>`)}
      <div class="grid-main"><div class="panel"><h4><b>elbow method — within-cluster sum of squares</b><span class="badge">precomputed, same pipeline</span></h4><canvas class="chart" id="cEl"></canvas></div>
      <div class="panel"><h4><b>titles per cluster</b></h4><canvas class="chart" id="cSz"></canvas></div></div>
      <div class="grid3" id="cTop" style="margin-top:14px"></div>
      ${LAB.src('recommender', ['kmeans'])}
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the College notebook, run live on 777 US colleges. The raw columns are applications, acceptances, % of students from the top 10% of their high-school class, graduation rate, student/faculty ratio and aggregate tuition. Five engineered ratios are added (for example acceptances ÷ applications, and graduation rate ÷ tuition), all 11 features are standardised, then K-Means (k = 4, chosen by the elbow) and Ward agglomerative clustering (7 clusters, cut from the dendrogram) run in your browser.</p><p><b>How to read it:</b> like the notebook's scatter plots, the chart shows two standardised features at a time, coloured by cluster. The team noted the K-Means clusters overlap heavily, which is why they tried hierarchical clustering. Switch colourings to compare. The recommender on the right uses cosine similarity over the same features.</p>`)}
      <div class="controls">
        <label class="ctl">x<select id="kX"></select></label><label class="ctl">y<select id="kY"></select></label>
        <div class="ctl">colour by<div class="seg" id="kCol"><button data-v="km" class="on">K-Means (4)</button><button data-v="hc">Ward (7)</button><button data-v="type">private / public</button></div></div>
      </div>
      <div class="kpis" id="kK"></div>
      <div class="grid-main"><div class="panel"><h4><b>cluster visualisation</b><span>hover a college</span></h4><canvas class="chart lg" id="kMap"></canvas></div>
        <div><div class="panel"><h4><b>elbow (k = 1…20)</b></h4><canvas class="chart sm" id="kEl"></canvas></div>
        <div class="panel" style="margin-top:14px"><h4><b>recommendation()</b></h4><div style="position:relative"><input type="text" id="kQ" value="Rutgers at New Brunswick" autocomplete="off" style="width:100%"><div id="kSug" class="sug"></div></div><div id="kRec" style="margin-top:10px;font-size:13.5px"></div></div></div></div>
      ${LAB.src('recommender', ['ratios', 'ckm', 'chc'])}
    </div>`;
  tabs(root);
  const $ = id => root.querySelector('#' + id);
  const style = document.createElement('style');
  style.textContent = `.sug{position:absolute;top:100%;left:0;right:0;z-index:5;background:#0f141d;border:1px solid var(--line-2);border-radius:8px;margin-top:4px;display:none;max-height:260px;overflow:auto}.sug div{padding:8px 12px;cursor:pointer;font-size:13.5px;border-bottom:1px solid var(--line)}.sug div:hover{background:rgba(255,255,255,.04)}
  .pipe .st{margin-bottom:10px}.pipe .st b{display:block;font-family:var(--mono);font-size:11px;color:var(--accent);font-weight:500;margin-bottom:3px}.pipe .st div{font-family:var(--mono);font-size:11.5px;color:#aab4c3;line-height:1.5;max-height:66px;overflow:hidden;word-break:break-word}
  .rrow{display:grid;grid-template-columns:28px 1fr 90px;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer}`;
  root.append(style);

  /* ================= NETFLIX: port of the preprocessing ================= */
  const SWS = new Set(SW), PUNCT = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g;
  const docs = raw.map(([type, title, director, cast, genres, desc, km]) => ({ type: type === 'M' ? 'Movie' : 'TV Show', title, director, cast, genres, desc, km }));
  function stages(d) {
    const s0 = d.director + ' ' + d.cast + ' ' + d.genres + ' ' + d.desc;
    const s1 = s0.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
    const s2 = s1.split(/\s+/).filter(Boolean).filter(w => !SWS.has(w.toLowerCase())).map(w => w.toLowerCase()).join(' ');
    const s3 = s2.replace(PUNCT, '');
    return [s0, s1, s2, s3];
  }
  const t0 = performance.now();
  const vecs = docs.map(d => { const v = new Map(); (stages(d)[3].match(/\b\w\w+\b/g) || []).forEach(w => v.set(w, (v.get(w) || 0) + 1)); let n = 0; v.forEach(c => n += c * c); return { v, n: Math.sqrt(n) }; });
  const buildMs = performance.now() - t0;
  const titleIdx = new Map(docs.map((d, i) => [d.title, i]));
  const RECORDED = {
    'Stranger Things': ['Beyond Stranger Things', 'Zombie Dumb', 'Prank Encounters', 'The Umbrella Academy', 'Anjaan: Special Crimes Unit', 'Haunted', 'Scream', 'Fear Files... Har Mod Pe Darr', 'Warrior Nun', 'Nightflyers'],
    'House of Cards': ['The 4400', 'The Originals', 'Dramaworld', 'Lost in Space', 'The Blacklist', 'Argon', 'Happy And', 'Hannibal', 'Roswell, New Mexico', 'Designated Survivor'],
  };
  let seed = titleIdx.get('Stranger Things'), gMode = 'marvel';
  function cos(a, b) { let dot = 0; const [s, l] = a.v.size < b.v.size ? [a, b] : [b, a]; s.v.forEach((c, w) => { const o = l.v.get(w); if (o) dot += c * o; }); return a.n && b.n ? dot / (a.n * b.n) : 0; }
  function recommend() {
    const t1 = performance.now(), a = vecs[seed], sims = vecs.map(b => cos(a, b));
    const order = sims.map((s, i) => [s, i]).filter(x => x[1] !== seed).sort((x, y) => y[0] - x[0]).map(x => x[1]).slice(0, 10);
    $('rT').textContent = docs[seed].title; $('rTime').textContent = `vectorised in ${buildMs.toFixed(0)} ms · scored in ${(performance.now() - t1).toFixed(0)} ms`;
    const max = sims[order[0]] || 1;
    $('rList').innerHTML = order.map((i, r) => { const d = docs[i], shared = [...a.v.keys()].filter(w => vecs[i].v.has(w)).sort((x, y) => a.v.get(y) * vecs[i].v.get(y) - a.v.get(x) * vecs[i].v.get(x)).slice(0, 6);
      return `<div class="rrow" data-i="${i}"><span class="mono" style="color:#5a6578;font-size:12px">${String(r + 1).padStart(2, '0')}</span><div style="min-width:0"><div style="font-weight:600">${d.title} <span class="mono" style="font-size:11px;color:#5a6578;font-weight:400">${d.type} · cluster ${d.km}</span></div><div class="mono" style="font-size:11.5px;color:#8b96a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.genres}</div><div class="chips" style="margin-top:6px">${shared.map(w => `<span class="chip">${w}</span>`).join('')}</div></div><div><div style="height:6px;border-radius:3px;background:var(--line)"><div style="height:100%;width:${(sims[i] / max * 100).toFixed(0)}%;background:var(--accent);border-radius:3px"></div></div><div class="mono" style="font-size:11px;color:#8b96a8;margin-top:4px;text-align:right">${sims[i].toFixed(3)}</div></div></div>`; }).join('') + '<p class="note">Chips are shared tokens, strongest first. Click a row to make it the seed.</p>';
    $('rList').querySelectorAll('[data-i]').forEach(el => el.addEventListener('click', () => { seed = +el.dataset.i; $('rQ').value = docs[seed].title; recommend(); }));
    const st = stages(docs[seed]), lab = ['1 · combined attributes (director + cast + genres + description)', '2 · remove_non_ascii()', '3 · stopwords() — NLTK list, lower-cased', '4 · remove_punctuation() → CountVectorizer tokens'];
    $('rPipe').innerHTML = st.map((s, k) => `<div class="st"><b>${lab[k]}</b><div>${s.replace(/</g, '&lt;')}</div></div>`).join('');
    const rec = RECORDED[docs[seed].title];
    $('rRecWrap').style.display = rec ? '' : 'none';
    if (rec) { const live = order.map(i => docs[i].title), same = rec.filter((t, k) => live[k] === t).length; $('rRec').innerHTML = `<ol style="margin:0;padding-left:20px;font-size:13.5px;line-height:1.7">${rec.map((t, k) => `<li style="color:${live[k] === t ? '#7cffb2' : '#c3cbd8'}">${t}</li>`).join('')}</ol><p class="note">${same}/10 in the same position as the live port (green).</p>`; }
    if (gMode === 'seed') buildGraph();
  }
  const sugBox = (inp, box, list, pick) => { inp.addEventListener('input', () => { const q = inp.value.toLowerCase().trim(); if (q.length < 2) { box.style.display = 'none'; return; } const m = []; for (let i = 0; i < list.length && m.length < 12; i++) if (list[i].toLowerCase().includes(q)) m.push(i); box.innerHTML = m.map(i => `<div data-i="${i}">${list[i]}</div>`).join('') || '<div>no match</div>'; box.style.display = 'block'; box.querySelectorAll('[data-i]').forEach(el => el.addEventListener('mousedown', () => { inp.value = list[+el.dataset.i]; box.style.display = 'none'; pick(+el.dataset.i); })); }); inp.addEventListener('blur', () => setTimeout(() => box.style.display = 'none', 150)); };
  sugBox($('rQ'), $('rSug'), docs.map(d => d.title), i => { seed = i; recommend(); });
  seg($('rTry'), v => { seed = titleIdx.get(v); $('rQ').value = v; recommend(); });

  /* ================= similarity graph ================= */
  let G = { nodes: [], links: [] };
  const MARVEL = ["Marvel's Daredevil", "Marvel's Luke Cage", "Marvel's Iron Fist", "Marvel's The Punisher", "Marvel's The Defenders"];
  function buildGraph() {
    const titles = gMode === 'marvel' ? MARVEL.filter(t => titleIdx.has(t)) : [docs[seed].title];
    const N = new Map(), L = [];
    const node = (id, kind) => { if (!N.has(id)) { const r = rng(id.length * 31 + N.size + 1); N.set(id, { id, kind, x: (r() - .5) * 300, y: (r() - .5) * 300, vx: 0, vy: 0 }); } return N.get(id); };
    titles.forEach(t => { const i = titleIdx.get(t), d = docs[i]; node(t, 'title');
      [...d.cast.split(','), ...d.director.split(',')].map(s => s.trim()).filter(Boolean).forEach(a => { node(a, 'person'); L.push([t, a]); });
      d.genres.split(',').map(s => s.trim()).filter(Boolean).forEach(g => { node(g, 'genre'); L.push([t, g]); });
      const sn = `Similar_Title(${t})`; node(sn, 'sim'); L.push([t, sn]); meta.sim5[i].forEach(j => { node(docs[j].title, 'title'); L.push([sn, docs[j].title]); }); });
    G = { nodes: [...N.values()], links: L.map(([a, b]) => [N.get(a), N.get(b)]) };
    $('gInfo').textContent = `${G.nodes.length} nodes · ${G.links.length} edges`;
  }
  const gC = fitCanvas($('gCv')); let drag = null, hover = null; const cam = { s: 1 };
  const KC = { title: '#ff6b8b', person: '#7cffb2', genre: '#ffb547', sim: '#fde68a' };
  const toW = (ex, ey) => [(ex - gC.w / 2) / cam.s, (ey - gC.h / 2) / cam.s];
  $('gCv').addEventListener('pointerdown', e => { const r = $('gCv').getBoundingClientRect(), [x, y] = toW(e.clientX - r.left, e.clientY - r.top); drag = G.nodes.find(n => Math.hypot(n.x - x, n.y - y) < 10 / cam.s); $('gCv').setPointerCapture(e.pointerId); });
  $('gCv').addEventListener('pointermove', e => { const r = $('gCv').getBoundingClientRect(), [x, y] = toW(e.clientX - r.left, e.clientY - r.top); if (drag) { drag.x = x; drag.y = y; drag.vx = drag.vy = 0; } hover = G.nodes.find(n => Math.hypot(n.x - x, n.y - y) < 9 / cam.s) || null; });
  $('gCv').addEventListener('pointerup', () => drag = null);
  loopWhileVisible($('gCv'), () => {
    if (!root.querySelector('.tabpane.on #gCv') || !gC.w) return;
    const ns = G.nodes, ctx = gC.ctx;
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) { const a = ns[i], b = ns[j], dx = a.x - b.x, dy = a.y - b.y, dd = dx * dx + dy * dy + .01; if (dd > 90000) continue; const f = 18 / dd; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f; }
    G.links.forEach(([a, b]) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - (a.kind === 'title' && b.kind === 'title' ? 60 : 45)) * .02; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f; });
    ns.forEach(n => { n.vx -= n.x * .002; n.vy -= n.y * .002; if (n !== drag) { n.x += n.vx; n.y += n.vy; } n.vx *= .82; n.vy *= .82; });
    const ext = Math.max(.5, ...ns.map(n => Math.max(Math.abs(n.x) / (gC.w / 2 - 40), Math.abs(n.y) / (gC.h / 2 - 24)))); cam.s = lerp(cam.s, 1 / ext, .05);
    ctx.clearRect(0, 0, gC.w, gC.h); ctx.save(); ctx.translate(gC.w / 2, gC.h / 2); ctx.scale(cam.s, cam.s);
    ctx.strokeStyle = 'rgba(140,155,180,.2)'; ctx.lineWidth = 1 / cam.s; ctx.beginPath(); G.links.forEach(([a, b]) => { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }); ctx.stroke();
    ns.forEach(n => { ctx.fillStyle = KC[n.kind]; ctx.beginPath(); ctx.arc(n.x, n.y, (n.kind === 'title' ? 6 : 3.5) / cam.s, 0, 7); ctx.fill(); });
    ctx.font = `${11 / cam.s}px JetBrains Mono, monospace`;
    ns.forEach(n => { if (n.kind === 'title' || n === hover) { ctx.fillStyle = n === hover ? '#fff' : '#e7ebf2'; ctx.fillText(n.id, n.x + 8 / cam.s, n.y + 4 / cam.s); } });
    ctx.restore();
  });
  seg($('gPre'), v => { gMode = v; buildGraph(); });

  /* ================= clusters (precomputed) ================= */
  const cEl = new Plot($('cEl'), { pad: { l: 50 } }), cSz = new Plot($('cSz'), { pad: { l: 50 } });
  cEl.render = p => { const w = meta.wcss, ks = w.map((_, i) => i + 1); p.frame(.5, w.length + .5, Math.min(...w), Math.max(...w), .08).axes({ xTicks: ks, yFmt: v => v.toFixed(0) }); p.line(ks, w, { color: PC.cyan, width: 1.6 }); p.dots(ks, w, { r: 3.5, colors: ks.map(k => k === 5 ? PC.green : PC.cyan) }); p.ctx.fillStyle = PC.green; p.ctx.font = '11px JetBrains Mono, monospace'; p.ctx.fillText('k = 5 chosen', p.X(5) + 8, p.Y(w[4]) - 8); };
  cSz.render = p => { const s = meta.sizes; p.frame(-.5, s.length - .5, 0, Math.max(...s) * 1.15).axes({ xTicks: s.map((_, k) => [k, 'cluster ' + k]) }); p.bars(s.map((_, k) => k), s, { colors: s.map((_, k) => SERIES[k]), width: .6 }); s.forEach((v, k) => { p.ctx.fillStyle = PC.white; p.ctx.textAlign = 'center'; p.ctx.font = '11px JetBrains Mono, monospace'; p.ctx.fillText(v, p.X(k), p.Y(v) - 5); p.ctx.textAlign = 'left'; }); };
  const CN = ['Documentaries & stand-up', 'International TV', 'Docuseries, reality & anime', 'International films', 'Family & children'];
  $('cTop').innerHTML = meta.top.map((t, k) => { const ex = docs.filter(d => d.km === k).slice(0, 4).map(d => d.title); return `<div class="panel"><h4><b style="color:${SERIES[k]}">cluster ${k} · ${CN[k]}</b><span>${meta.sizes[k]}</span></h4><div class="chips">${t.map(w => `<span class="chip">${w}</span>`).join('')}</div><p class="note">e.g. ${ex.join(' · ')}</p></div>`; }).join('');

  /* ================= COLLEGE ================= */
  const RAWC = ['apps', 'accept', 'top10', 'grad', 'sfratio', 'tuition'];
  const LBL = { apps: 'applications', accept: 'acceptances', top10: '% top-10 percentile', grad: 'graduation rate', sfratio: 'student/faculty ratio', tuition: 'aggregate tuition', r1: 'ratio 1 · apps / tuition', r2: 'ratio 2 · acceptance rate', r3: 'ratio 3 · top10 / acceptances', r4: 'ratio 4 · S/F / graduation', r5: 'ratio 5 · graduation / tuition' };
  const COLS = [...RAWC, 'r1', 'r2', 'r3', 'r4', 'r5'];
  const rowsU = U.map(([name, priv, a1, a2, a5, a6, a7, a8]) => ({ name, priv, apps: a1, accept: a2, top10: a5, grad: a6, sfratio: a7, tuition: a8, r1: a1 / a8, r2: a2 / a1, r3: a5 / a2, r4: a7 / a6, r5: a6 / a8 }));
  const Zc = COLS.map(c => { const v = rowsU.map(r => r[c]), m = v.reduce((a, b) => a + b, 0) / v.length, s = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); return v.map(x => (x - m) / s); });
  const X11 = rowsU.map((_, i) => COLS.map((_, j) => Zc[j][i])), X12 = X11.map((r, i) => [...r, rowsU[i].priv]);
  const d2 = (a, b) => { let s = 0; for (let k = 0; k < a.length; k++) s += (a[k] - b[k]) ** 2; return s; };
  function kmeans(X, k, seedK = 42, nInit = 10) { let best = null; for (let run = 0; run < nInit; run++) { const r = rng(seedK * 7 + run + k * 131); let C = [X[Math.floor(r() * X.length)].slice()]; while (C.length < k) { const dd = X.map(x => Math.min(...C.map(c => d2(c, x)))); const s = dd.reduce((a, b) => a + b, 0); let u = r() * s, i = 0; while ((u -= dd[i]) > 0 && i < X.length - 1) i++; C.push(X[i].slice()); }
      let lab = []; for (let it = 0; it < 300; it++) { const nl = X.map(x => { let b = 0, bd = Infinity; C.forEach((c, j) => { const v = d2(c, x); if (v < bd) { bd = v; b = j; } }); return b; }); const same = nl.every((v, i) => v === lab[i]); lab = nl; C = C.map((c, j) => { const m = X.filter((_, i) => lab[i] === j); return m.length ? c.map((_, q) => m.reduce((s, x) => s + x[q], 0) / m.length) : c; }); if (same) break; }
      const inertia = X.reduce((s, x, i) => s + d2(x, C[lab[i]]), 0); if (!best || inertia < best.inertia) best = { lab, inertia }; } return best; }
  function ward(X, k) { // nearest-neighbour chain, Ward linkage via Lance–Williams on squared distances
    const n = X.length, D = new Float64Array(n * n), size = new Array(n).fill(1), active = new Array(n).fill(true), memb = X.map((_, i) => [i]);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = d2(X[i], X[j]); D[i * n + j] = D[j * n + i] = v; }
    let clusters = n; const chain = [];
    while (clusters > k) {
      if (!chain.length) chain.push(active.indexOf(true));
      while (true) { const a = chain[chain.length - 1]; let b = -1, bd = Infinity; for (let j = 0; j < n; j++) if (active[j] && j !== a && D[a * n + j] < bd) { bd = D[a * n + j]; b = j; }
        if (chain.length > 1 && b === chain[chain.length - 2]) break; chain.push(b); }
      const b = chain.pop(), a = chain.pop();
      for (let j = 0; j < n; j++) if (active[j] && j !== a && j !== b) { const v = ((size[a] + size[j]) * D[a * n + j] + (size[b] + size[j]) * D[b * n + j] - size[j] * D[a * n + b]) / (size[a] + size[b] + size[j]); D[a * n + j] = D[j * n + a] = v; }
      size[a] += size[b]; active[b] = false; memb[a] = memb[a].concat(memb[b]); clusters--;
    }
    const lab = new Array(n); let c = 0; active.forEach((on, i) => { if (on) { memb[i].forEach(m => lab[m] = c); c++; } }); return lab;
  }
  const KM = kmeans(X12, 4), HC = ward(X11, 7);
  const elbow = [...Array(20)].map((_, i) => kmeans(X11, i + 1, 42, 3).inertia);
  ['kX', 'kY'].forEach((id, k) => { $(id).innerHTML = COLS.map(c => `<option value="${c}">${LBL[c]}</option>`).join(''); $(id).value = k ? 'tuition' : 'top10'; });
  let colorBy = 'km';
  const sizes = lab => { const m = Math.max(...lab) + 1, s = new Array(m).fill(0); lab.forEach(l => s[l]++); return s.sort((a, b) => b - a); };
  $('kK').innerHTML = [['K-Means cluster sizes', sizes(KM.lab).join(' · ')], ['K-Means inertia', KM.inertia.toFixed(0)], ['Ward cluster sizes', sizes(HC).join(' · ')], ['features', '11 standardised (+ type for K-Means)']].map(([a, b]) => `<div class="kpi"><span>${a}</span><b style="font-size:14px">${b}</b></div>`).join('');
  const kMap = new Plot($('kMap'), { pad: { l: 40, b: 30 } }), kEl = new Plot($('kEl'), { pad: { l: 50 } });
  kMap.render = p => { const xi = COLS.indexOf($('kX').value), yi = COLS.indexOf($('kY').value), xs = Zc[xi], ys = Zc[yi];
    p.frame(Math.min(...xs) - .2, Math.max(...xs) + .2, Math.min(...ys) - .2, Math.max(...ys) + .2).axes({ xLabel: LBL[$('kX').value] + ' (σ) →', yLabel: LBL[$('kY').value] + ' (σ)' });
    const col = i => colorBy === 'km' ? SERIES[KM.lab[i]] : colorBy === 'hc' ? SERIES[HC[i]] : rowsU[i].priv ? '#5ee6ff' : '#ffb547';
    p.dots(xs, ys, { r: 2.8, alpha: .85, colors: rowsU.map((_, i) => col(i)) });
    if (p.inside(p.mouse)) { let bi = 0, bd = Infinity; xs.forEach((x, i) => { const d = (p.X(x) - p.mouse.x) ** 2 + (p.Y(ys[i]) - p.mouse.y) ** 2; if (d < bd) { bd = d; bi = i; } }); if (bd < 300) { const r = rowsU[bi]; p.dots([xs[bi]], [ys[bi]], { color: '#fff', r: 4.5 }); p.tooltip([r.name, [`${r.priv ? 'private' : 'public'} · K-Means ${KM.lab[bi]} · Ward ${HC[bi]}`, col(bi)], [`apps ${r.apps.toLocaleString()} · accepted ${r.accept.toLocaleString()} · grad ${r.grad}%`, PC.text], [`top-10% ${r.top10}% · S/F ${r.sfratio} · tuition $${r.tuition.toLocaleString()}`, PC.text]], p.X(xs[bi]), p.Y(ys[bi])); } } };
  kEl.render = p => { const ks = elbow.map((_, i) => i + 1); p.frame(.5, 20.5, 0, Math.max(...elbow), .05).axes({ xTicks: [1, 4, 8, 12, 16, 20], yFmt: v => fmtNum(v) }); p.line(ks, elbow, { color: PC.cyan, width: 1.5 }); p.dots(ks, elbow, { r: 3, colors: ks.map(k => k === 4 ? PC.green : PC.cyan) }); };
  const RUT = ['Pennsylvania State Univ. Main Campus', 'Virginia Tech', 'SUNY at Buffalo', 'SUNY at Albany', 'Purdue University at West Lafayette', 'University of Delaware', 'University of Maryland at College Park', 'University of Texas at Austin', 'University of Wisconsin at Madison', 'University of Illinois - Urbana'];
  const nrm = X12.map(r => Math.sqrt(r.reduce((s, v) => s + v * v, 0)));
  function collegeRec(i) { const sims = X12.map((r, j) => r.reduce((s, v, q) => s + v * X12[i][q], 0) / (nrm[i] * nrm[j])); const top = sims.map((s, j) => [s, j]).filter(x => x[1] !== i).sort((a, b) => b[0] - a[0]).slice(0, 10);
    const isRut = rowsU[i].name === 'Rutgers at New Brunswick', hit = top.filter(([, j]) => RUT.includes(rowsU[j].name)).length;
    $('kRec').innerHTML = `<ol style="margin:0;padding-left:20px;line-height:1.7">${top.map(([s, j]) => `<li style="color:${isRut && RUT.includes(rowsU[j].name) ? '#7cffb2' : '#c3cbd8'}">${rowsU[j].name} <span class="mono" style="color:#5a6578;font-size:11px">${s.toFixed(3)}</span></li>`).join('')}</ol>` + (isRut ? `<p class="note">${LAB.badge('rec')} ${hit}/10 also appear in the list the notebook printed for Rutgers (green). The notebook's matrix also carried cluster-label columns, which explains the small differences.</p>` : ''); }
  sugBox($('kQ'), $('kSug'), rowsU.map(r => r.name), collegeRec);
  ['kX', 'kY'].forEach(id => $(id).addEventListener('change', () => kMap.redraw()));
  seg($('kCol'), v => { colorBy = v; kMap.redraw(); });

  $('rQ').value = 'Stranger Things'; buildGraph(); recommend(); collegeRec(rowsU.findIndex(r => r.name === 'Rutgers at New Brunswick'));
};
