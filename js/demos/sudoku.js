/* Sudoku solver — the repo's puzzle generator (pattern + shuffles, ¾ of cells blanked) and its recursive backtracking solve() */
DEMOS.sudoku = async function (root) {
  // generator, as in Sudoku.py: a valid base pattern, shuffled rows/cols/digits, then blanks
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(q => q[1]);
  const pattern = (r, c) => (3 * (r % 3) + Math.floor(r / 3) + c) % 9;
  function generate(blankFrac = .6) { const rB = [0, 1, 2], rows = shuffle(rB).flatMap(g => shuffle(rB).map(r => g * 3 + r)), cols = shuffle(rB).flatMap(g => shuffle(rB).map(c => g * 3 + c)), nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const bd = rows.map(r => cols.map(c => nums[pattern(r, c)])); shuffle([...Array(81).keys()]).slice(0, Math.round(81 * blankFrac)).forEach(p => bd[Math.floor(p / 9)][p % 9] = 0); return bd; }
  const valid = (b, n, r, c) => { for (let i = 0; i < 9; i++) { if (b[r][i] === n && i !== c) return false; if (b[i][c] === n && i !== r) return false; } const br = r - r % 3, bc = c - c % 3; for (let i = br; i < br + 3; i++) for (let j = bc; j < bc + 3; j++) if (b[i][j] === n && (i !== r || j !== c)) return false; return true; };
  const findEmpty = b => { for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if (!b[i][j]) return [i, j]; return null; };
  // solve() as a generator so every placement and backtrack can be replayed
  function* solve(b, stats) { const e = findEmpty(b); if (!e) return true; const [r, c] = e;
    for (let n = 1; n <= 9; n++) { if (valid(b, n, r, c)) { b[r][c] = n; stats.place++; yield ['place', r, c, n]; if (yield* solve(b, stats)) return true; b[r][c] = 0; stats.back++; yield ['back', r, c]; } }
    return false; }
  root.innerHTML = `<style>
    .lab-sd .grid9 { display:grid; grid-template-columns:repeat(9,1fr); width:min(430px,100%); aspect-ratio:1; margin:0 auto; border:2px solid #e5e7eb; background:#0d1118; }
    .lab-sd .grid9 input { width:100%; height:100%; border:0; border-right:1px solid #2a3546; border-bottom:1px solid #2a3546; background:transparent; color:#93c5fd; text-align:center; font:500 clamp(14px,2.6vw,22px) var(--mono); outline:none; padding:0; }
    .lab-sd .grid9 input.given { color:#e5e7eb; font-weight:700; } .lab-sd .grid9 input:nth-child(3n) { border-right:2px solid #8b96a8; } .lab-sd .grid9 input.rb { border-bottom:2px solid #8b96a8; }
    .lab-sd .grid9 input.now { background:rgba(147,197,253,.18); } .lab-sd .grid9 input.bt { background:rgba(255,107,139,.18); } .lab-sd .grid9 input.bad { color:#ff8a8a; }
  </style>
  <div class="lab-sd">
    <div class="tabs"><button class="on">solve</button><button>step through</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> a Sudoku grid. Type your own puzzle or generate one, then let the solver finish it. ${LAB.badge('live')}</p><p><b>Technical:</b> a port of the repo: puzzles are built the same way (a valid base pattern, shuffled rows, columns and digits, then cells blanked), and <code>solve()</code> is recursive backtracking — find the first empty cell, try 1–9, keep the first digit that is valid in its row, column and 3×3 box, recurse, and undo when stuck.</p><p><b>Try:</b> clear the grid and solve an empty board — any valid Sudoku is a solution.</p>`)}
      <div class="grid-main"><div><div class="grid9" id="g"></div></div>
      <div class="panel"><h4><b>controls</b></h4><div class="controls" style="margin:0 0 10px;flex-wrap:wrap"><label class="ctl" style="min-width:180px"><span class="lbl">blanks <output id="bO">60%</output></span><input type="range" id="bl" min=".3" max=".8" step=".05" value=".6"></label><button class="btn sm" id="gen">new puzzle</button><button class="btn sm" id="clr">clear</button><button class="btn sm primary" id="sol">solve</button></div><div class="kpis" id="k"></div><p class="mono" id="m" style="font-size:13px;color:var(--accent)"></p></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the same solver slowed down. Blue cells are placements; red flashes are backtracks — the solver discovering a dead end and undoing its last guess. ${LAB.badge('live')}</p>`)}
      <div class="grid-main"><div><div class="grid9" id="g2"></div></div>
      <div class="panel"><h4><b>playback</b></h4><div class="controls" style="margin:0 0 10px"><label class="ctl" style="min-width:200px"><span class="lbl">speed <output id="spO">fast</output></span><input type="range" id="sp" min="1" max="200" value="40"></label><button class="btn sm primary" id="run">run</button><button class="btn sm" id="stp">step</button></div><div class="kpis" id="k2"></div><canvas class="chart" id="pg" style="height:150px"></canvas></div></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-sd'));
  const $ = id => root.querySelector('#' + id);
  let B = generate(.6), G = B.map(r => r.map(v => !!v));
  const cells = id => [...$(id).querySelectorAll('input')];
  function build(id, editable) { $(id).innerHTML = [...Array(81)].map((_, i) => `<input inputmode="numeric" maxlength="1" data-i="${i}" class="${(Math.floor(i / 9) % 3 === 2) ? 'rb' : ''}" ${editable ? '' : 'readonly'}>`).join(''); }
  function paint(id, b, giv) { cells(id).forEach((el, i) => { const r = Math.floor(i / 9), c = i % 9, v = b[r][c]; el.value = v || ''; el.classList.toggle('given', !!giv[r][c]); el.classList.toggle('bad', !!v && !valid(b, v, r, c)); }); }
  build('g', true); build('g2', false);
  $('g').addEventListener('input', e => { const i = +e.target.dataset.i, v = parseInt(e.target.value) || 0; B[Math.floor(i / 9)][i % 9] = v; G[Math.floor(i / 9)][i % 9] = !!v; paint('g', B, G); reset2(); });
  $('bl').addEventListener('input', () => $('bO').textContent = Math.round($('bl').value * 100) + '%');
  $('gen').addEventListener('click', () => { B = generate(+$('bl').value); G = B.map(r => r.map(v => !!v)); paint('g', B, G); $('m').textContent = ''; $('k').innerHTML = ''; reset2(); });
  $('clr').addEventListener('click', () => { B = B.map(r => r.map(() => 0)); G = B.map(r => r.map(() => false)); paint('g', B, G); reset2(); });
  $('sol').addEventListener('click', () => { if (B.some((r, i) => r.some((v, j) => v && !valid(B, v, i, j)))) { $('m').textContent = 'This grid breaks a rule — fix the red digits first.'; return; }
    const b = B.map(r => r.slice()), st = { place: 0, back: 0 }, t0 = performance.now(), it = solve(b, st); let res; let guard = 0; while (!(res = it.next()).done && guard++ < 5e6); const ms = performance.now() - t0;
    if (res.value) { B = b; paint('g', B, G); $('m').textContent = 'Solved.'; } else $('m').textContent = 'No solution exists for this grid.';
    $('k').innerHTML = [['placements', st.place.toLocaleString()], ['backtracks', st.back.toLocaleString()], ['time', ms < 1 ? '<1 ms' : ms.toFixed(0) + ' ms']].map(([a, v]) => `<div class="kpi"><span>${a}</span><b>${v}</b></div>`).join(''); });
  paint('g', B, G);
  // step-through
  let W, it2, st2, run = false, filled = [];
  const pgP = new Plot($('pg'), { pad: { l: 36, b: 24 } });
  pgP.render = p => { p.frame(0, Math.max(10, filled.length), 0, 81).axes({ xLabel: 'steps', yFmt: v => v.toFixed(0) }); if (filled.length) p.line(filled.map((_, i) => i), filled, { color: getComputedStyle(document.body).getPropertyValue('--accent-2').trim() || '#93c5fd', width: 1.5 }); };
  function reset2() { W = B.map(r => r.slice()); st2 = { place: 0, back: 0 }; it2 = solve(W, st2); filled = []; run = false; $('run').textContent = 'run'; paint('g2', W, G); kp2(); pgP.redraw(); }
  const kp2 = () => $('k2').innerHTML = [['placements', st2.place], ['backtracks', st2.back], ['cells filled', W.flat().filter(Boolean).length + '/81']].map(([a, v]) => `<div class="kpi"><span>${a}</span><b>${v}</b></div>`).join('');
  function step() { const r = it2.next(); if (r.done) { run = false; $('run').textContent = 'done'; return false; } const [kind, rr, cc] = r.value; paint('g2', W, G); const el = cells('g2')[rr * 9 + cc]; el.classList.add(kind === 'place' ? 'now' : 'bt'); setTimeout(() => el.classList.remove('now', 'bt'), 160);
    filled.push(W.flat().filter(Boolean).length); if (filled.length % 5 === 0) pgP.redraw(); kp2(); return true; }
  function loop() { if (!run) return; const sp = +$('sp').value, n = sp > 100 ? Math.round((sp - 100) / 4) + 1 : 1; for (let i = 0; i < n; i++) if (!step()) { pgP.redraw(); return; } setTimeout(loop, sp > 100 ? 16 : 220 - sp * 2); }
  $('sp').addEventListener('input', () => $('spO').textContent = +$('sp').value > 100 ? 'fast' : 'slow');
  $('run').addEventListener('click', () => { run = !run; $('run').textContent = run ? 'pause' : 'run'; loop(); });
  $('stp').addEventListener('click', () => { run = false; $('run').textContent = 'run'; step(); pgP.redraw(); });
  reset2();
};
