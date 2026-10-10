/* La Ghigliottina — the Skip-Gram baseline's common_words() solver, running on vectors trained from the repo's data */
DEMOS.ghigliottina = async function (root) {
  const [VOC, PUZ, buf] = await Promise.all([loadJSON('assets/data/w2v_vocab.json'), loadJSON('assets/data/ghig_puzzles.json'), fetch('assets/data/w2v_int8.bin').then(r => r.arrayBuffer())]);
  const D = 100, Q = new Int8Array(buf), NV = VOC.length, idx = new Map(VOC.map((w, i) => [w, i]));
  const vec = new Float32Array(NV * D); for (let i = 0; i < NV; i++) { let n = 0; for (let k = 0; k < D; k++) { const v = Q[i * D + k] / 127; vec[i * D + k] = v; n += v * v; } n = Math.sqrt(n); for (let k = 0; k < D; k++) vec[i * D + k] /= n; }
  function most_similar(w, topn = 10) { const i = idx.get(w); if (i == null) return []; const out = []; for (let j = 0; j < NV; j++) { if (j === i) continue; let s = 0; for (let k = 0; k < D; k++) s += vec[i * D + k] * vec[j * D + k]; if (out.length < topn || s > out[out.length - 1][1]) { out.push([VOC[j], s]); out.sort((a, b) => b[1] - a[1]); if (out.length > topn) out.pop(); } } return out; }
  function common_words(words, top_n = 10) { const acc = new Map(); words.forEach(w => most_similar(w, top_n).forEach(([x, s]) => { if (!acc.has(x)) acc.set(x, []); acc.get(x).push(s); })); return [...acc].map(([x, v]) => [x, v.reduce((a, b) => a + b, 0) / v.length, v.length]).sort((a, b) => b[1] - a[1]); }

  root.innerHTML = `
    <div class="tabs"><button class="on">play the guillotine</button><button>ask the solver</button><button>what the notebooks recorded</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>How the game works:</b> five clue words share one hidden word. Clues appear one at a time, and the earlier you guess, the more points you keep (the TV show halves the prize with each new clue). The puzzles come from the team's curated clue–target dataset (<code>final_data-2.csv</code>).</p><p><b>Your opponent</b> is the project's Skip-Gram baseline: <code>Word2Vec(vector_size = 100, window = 5, sg = 1)</code> trained on the repo's <code>final_data.csv</code>, plus the notebook's <code>common_words()</code> solver. For each revealed clue it takes the 10 most similar words, then ranks every candidate by its mean similarity. Its top guesses update as clues arrive. About two-thirds of the puzzles are ones the baseline can crack (the hidden word reaches its top 15 once all five clues are in); the rest are genuinely hard for it.</p>`)}
      <div class="controls"><button class="btn primary" id="gNext">▶ new puzzle</button><button class="btn" id="gClue">reveal next clue</button><label class="ctl" style="flex:1;min-width:200px">your guess<input type="text" id="gIn" placeholder="type and press enter" autocomplete="off"></label><button class="btn" id="gGive">give up</button></div>
      <div class="kpis" id="gK"></div>
      <div class="grid-main"><div class="panel"><h4><b>clues</b><span id="gPrize"></span></h4><div id="gClues" style="display:flex;flex-wrap:wrap;gap:10px;min-height:64px"></div><div id="gMsg" style="margin-top:16px;font-size:15px;min-height:24px"></div><canvas class="chart sm" id="gRank" style="margin-top:10px"></canvas><p class="note">Rank of the hidden word in the solver's list after each clue (lower is better; off the chart = not in the list).</p></div>
      <div class="panel"><h4><b>common_words(revealed clues)</b><span>mean similarity · hits</span></h4><div id="gSolver"></div></div></div>
      ${LAB.src('ghigliottina', ['w2v', 'common'])}
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> <code>common_words()</code> exactly as written in the baseline notebook, so you can query it with any words. Try the notebook's own examples: <i>laptop, pc, smartphone</i>; <i>apple, banana, grape, mango</i>; <i>spoon, fork, butterknife</i>. The "hits" column counts how many of your words list that candidate among their neighbours, which is the agreement the solver rewards.</p><p>Expect odd neighbours: a skip-gram trained on short clue lists learns topical co-occurrence, not meaning, and the notebook's recorded outputs show the same quirks. That weakness is why the team moved on to T5 and BART. Search is limited to words seen at least 3 times to keep the download small (19,848 words).</p>`)}
      <div class="controls"><label class="ctl" style="flex:1">clue words (comma or space separated)<input type="text" id="aIn" value="laptop, pc, smartphone"></label><div class="ctl">notebook examples<div class="seg" id="aEx"><button data-v="laptop pc smartphone" class="on">laptop…</button><button data-v="apple banana grape mango">apple…</button><button data-v="spoon fork butterknife">spoon…</button><button data-v="mother father son daughter">mother…</button></div></div></div>
      <div class="grid2"><div class="panel"><h4><b>common_words(input_words)</b><span id="aT"></span></h4><table class="tbl" id="aOut"></table></div><div class="panel"><h4><b>neighbours per word</b><span>most_similar(topn = 10)</span></h4><div id="aPer" style="font-size:13px;line-height:1.8"></div></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> results saved in the notebooks' outputs. ${LAB.badge('rec')} <b>Skip-gram:</b> the neighbour lists the baseline printed. <b>LSTM:</b> three epochs at about 34 minutes each on Kaggle. Its 99.2% "accuracy" is an artefact of padding: most target positions are zeros, so predicting padding scores well. For <i>mother, father, son, daughter</i> it answered "genus". <b>BART</b> (<code>facebook/bart-base</code>, fine-tuned for 3 epochs, 6,519 steps, ≈45 minutes on a GPU) is where generation became sensible. The report found T5 and BART the strongest of the four model families.</p>`)}
      <div class="grid3">
        <div class="panel"><h4><b>skip-gram · recorded outputs</b></h4><div style="font-size:13px;line-height:1.7"><b class="mono" style="font-size:12px;color:#7cffb2">laptop, pc, smartphone →</b><br>user, random-access, file, read-only, portable, analog, microprocessor…<br><br><b class="mono" style="font-size:12px;color:#7cffb2">apple, banana, grape, mango →</b><br>mangosteen, simarouba, incense, medlar, diospyros, olea, marmalade, malus…<br><br><b class="mono" style="font-size:12px;color:#7cffb2">spoon, fork, butterknife →</b><br>hanger, appendage, beater, lining, can, sharpener, cookie, cutlery…</div></div>
        <div class="panel"><h4><b>LSTM · training history</b></h4><canvas class="chart sm" id="lstm"></canvas><div class="legend"><span><i style="background:#5ee6ff"></i>train loss</span><span><i style="background:#ffb547"></i>val loss</span></div><p class="note">accuracy 0.9915 → 0.9917 · val 0.9917 (flat) · predicted "genus" for mother/father/son/daughter</p></div>
        <div class="panel"><h4><b>BART · fine-tuning run</b></h4><table class="tbl"><tr><td>base model</td><td>facebook/bart-base</td></tr><tr><td>training pairs</td><td>57,933 cleaned</td></tr><tr><td>epochs / steps</td><td>3 / 6,519</td></tr><tr><td>learning rate</td><td>2e-5 · wd 0.01</td></tr><tr><td>batch size</td><td>10 · fp16</td></tr><tr><td>training loss</td><td>4.19</td></tr><tr><td>runtime</td><td>2,698 s</td></tr></table></div>
      </div>
      ${LAB.src('ghigliottina', ['lstm', 'bart'])}
    </div>`;
  tabs(root);
  const $ = id => root.querySelector('#' + id);

  /* ---------------- game ---------------- */
  let P = null, shown = 0, done = false, score = 0, played = 0, won = 0, botWon = 0, order = PUZ.map((_, i) => i), oi = 0, ranks = [];
  const r0 = rng(Date.now() % 1e6); order.sort(() => r0() - .5);
  function newPuzzle() { P = PUZ[order[oi++ % order.length]]; shown = 1; done = false; ranks = []; $('gIn').value = ''; $('gMsg').innerHTML = ''; render(); $('gIn').focus(); }
  function render() {
    const prize = 100 / 2 ** (shown - 1);
    $('gPrize').textContent = done ? '' : `prize ${prize.toFixed(1)} pts`;
    $('gClues').innerHTML = P[1].map((c, i) => `<span class="mono" style="padding:10px 14px;border-radius:8px;border:1px solid ${i < shown ? 'rgba(124,255,178,.4)' : 'var(--line)'};background:${i < shown ? 'rgba(124,255,178,.06)' : 'transparent'};color:${i < shown ? '#e7ebf2' : '#3d4657'};font-size:16px">${i < shown ? c : '?????'}</span>`).join('');
    const res = common_words(P[1].slice(0, shown)).slice(0, 12), rank = res.findIndex(r => r[0] === P[0]);
    ranks[shown - 1] = rank < 0 ? null : rank + 1;
    $('gSolver').innerHTML = `<table class="tbl"><tr><th>#</th><th>candidate</th><th>mean sim</th><th>hits</th></tr>${res.map((r, i) => `<tr style="${done && r[0] === P[0] ? 'color:#7cffb2' : ''}"><td>${i + 1}</td><td>${done || i >= 0 ? r[0] : ''}</td><td>${r[1].toFixed(3)}</td><td>${'●'.repeat(r[2])}</td></tr>`).join('')}</table>`;
    rankP.redraw();
    $('gK').innerHTML = [['your score', score.toFixed(1)], ['solved', `${won} / ${played}`], ['solver solved (top 1)', `${botWon} / ${played}`], ['clues shown', `${shown} / 5`]].map(([k, v]) => `<div class="kpi"><span>${k}</span><b>${v}</b></div>`).join('');
  }
  const rankP = new Plot($('gRank'), { pad: { l: 30 } });
  rankP.render = p => { p.frame(.5, 5.5, 20, 1).axes({ xTicks: [1, 2, 3, 4, 5].map(k => [k, 'clue ' + k]), yTicks: [1, 5, 10, 15, 20] }); const xs = [], ys = []; ranks.forEach((r, i) => { if (r) { xs.push(i + 1); ys.push(Math.min(20, r)); } }); p.line(xs, ys, { color: PC.violet, width: 1.6 }); p.dots(xs, ys, { color: PC.violet, r: 4 }); };
  function finish(win) { done = true; played++; if (win) { won++; score += 100 / 2 ** (shown - 1); } const top = common_words(P[1]).slice(0, 1)[0]; if (top && top[0] === P[0]) botWon++;
    $('gMsg').innerHTML = (win ? `<span class="pos">✓ Correct — <b>${P[0]}</b></span>` : `The word was <b style="color:#ffb547">${P[0]}</b>.`) + ` <span class="muted">The solver ranked it ${ranks[shown - 1] ? '#' + ranks[shown - 1] : 'outside its list'} after ${shown} clue${shown > 1 ? 's' : ''}${P[2] ? `, and #${P[2]} with all five` : ''}.</span>`;
    shown = 5; render(); }
  $('gNext').addEventListener('click', newPuzzle);
  $('gClue').addEventListener('click', () => { if (done) return; if (shown < 5) { shown++; render(); } else finish(false); });
  $('gGive').addEventListener('click', () => { if (!done) finish(false); });
  $('gIn').addEventListener('keydown', e => { if (e.key !== 'Enter' || done) return; const g = $('gIn').value.trim().toLowerCase(); if (!g) return; if (g === P[0]) finish(true); else { $('gMsg').innerHTML = `<span class="neg">✗ “${g}” isn't it.</span>`; $('gIn').value = ''; if (shown < 5) { shown++; render(); } else finish(false); } });
  newPuzzle();

  /* ---------------- free solver ---------------- */
  function ask() { const words = $('aIn').value.toLowerCase().split(/[\s,]+/).filter(Boolean), t0 = performance.now(), res = common_words(words).slice(0, 15), miss = words.filter(w => !idx.has(w));
    $('aT').textContent = `${(performance.now() - t0).toFixed(0)} ms over ${NV.toLocaleString()} words`;
    $('aOut').innerHTML = '<tr><th>Similar_Words</th><th>Similar_Scores</th><th>hits</th></tr>' + res.map(r => `<tr><td>${r[0]}</td><td>${r[1].toFixed(6)}</td><td>${'●'.repeat(r[2])}</td></tr>`).join('') + (miss.length ? `<tr><td colspan="3" class="warn">not in vocabulary: ${miss.join(', ')}</td></tr>` : '');
    $('aPer').innerHTML = words.filter(w => idx.has(w)).map(w => `<div><b class="mono" style="color:#7cffb2;font-size:12px">${w}</b> → ${most_similar(w, 10).map(x => x[0]).join(', ')}</div>`).join(''); }
  $('aIn').addEventListener('change', ask); seg($('aEx'), v => { $('aIn').value = v.split(' ').join(', '); ask(); }); ask();

  /* ---------------- recorded ---------------- */
  const lp = new Plot($('lstm'), { pad: { l: 40 } });
  lp.render = p => { const tr = [.3403, .0980, .0945], va = [.0992, .0966, .0965]; p.frame(.8, 3.2, 0, .36).axes({ xTicks: [1, 2, 3], yFmt: v => v.toFixed(2) }); p.line([1, 2, 3], tr, { color: PC.cyan, width: 1.8 }); p.dots([1, 2, 3], tr, { color: PC.cyan, r: 3.5 }); p.line([1, 2, 3], va, { color: PC.amber, width: 1.8 }); p.dots([1, 2, 3], va, { color: PC.amber, r: 3.5 }); };
};
