/* Checkers AI — the repo's rules and minimax (evaluate = white − red + ½·(white kings − red kings)), playable */
DEMOS.checkers = async function (root) {
  // board: 0 empty, 1 red, 2 white, 3 red king, 4 white king. Red (you) moves up the board; white (computer) moves down, as in the repo.
  const RED = 1, WHITE = 2, isRed = v => v === 1 || v === 3, isWhite = v => v === 2 || v === 4, king = v => v > 2;
  const start = () => [...Array(8)].map((_, r) => [...Array(8)].map((_, c) => (r + c) % 2 ? (r < 3 ? 2 : r > 4 ? 1 : 0) : 0));
  const own = (v, col) => col === RED ? isRed(v) : isWhite(v);
  function movesFor(B, r, c) { const v = B[r][c], col = isRed(v) ? RED : WHITE, dirs = king(v) ? [-1, 1] : [col === RED ? -1 : 1], out = [];
    const jumps = (rr, cc, cap, Bc) => { let found = false; for (const dr of dirs) for (const dc of [-1, 1]) { const mr = rr + dr, mc = cc + dc, tr = rr + 2 * dr, tc = cc + 2 * dc;
        if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue; const m = Bc[mr][mc]; if (m && !own(m, col) && !Bc[tr][tc] && !cap.some(q => q[0] === mr && q[1] === mc)) { found = true; const nb = Bc.map(x => x.slice()); nb[tr][tc] = nb[rr][cc]; nb[rr][cc] = 0; nb[mr][mc] = 0; jumps(tr, tc, [...cap, [mr, mc]], nb) || out.push({ from: [r, c], to: [tr, tc], cap: [...cap, [mr, mc]] }); } } return found; };
    jumps(r, c, [], B);
    if (!out.length) for (const dr of dirs) for (const dc of [-1, 1]) { const tr = r + dr, tc = c + dc; if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && !B[tr][tc]) out.push({ from: [r, c], to: [tr, tc], cap: [] }); }
    return out; }
  const allMoves = (B, col) => { const m = []; B.forEach((row, r) => row.forEach((v, c) => { if (v && own(v, col)) m.push(...movesFor(B, r, c)); })); return m.some(x => x.cap.length) ? m.filter(x => x.cap.length) : m; };
  function apply(B, m) { const nb = B.map(x => x.slice()), v = nb[m.from[0]][m.from[1]]; nb[m.from[0]][m.from[1]] = 0; m.cap.forEach(([r, c]) => nb[r][c] = 0);
    nb[m.to[0]][m.to[1]] = (v === 1 && m.to[0] === 0) ? 3 : (v === 2 && m.to[0] === 7) ? 4 : v; return nb; }
  const count = B => { let w = 0, r = 0, wk = 0, rk = 0; B.forEach(row => row.forEach(v => { if (isWhite(v)) { w++; if (king(v)) wk++; } if (isRed(v)) { r++; if (king(v)) rk++; } })); return { w, r, wk, rk }; };
  const evaluate = B => { const k = count(B); return k.w - k.r + (k.wk * .5 - k.rk * .5); };
  const winner = B => { const k = count(B); return !k.r || !allMoves(B, RED).length ? WHITE : !k.w || !allMoves(B, WHITE).length ? RED : 0; };
  let nodes = 0;
  function minimax(B, depth, max) { nodes++; if (depth === 0 || winner(B)) return [evaluate(B), null];
    const ms = allMoves(B, max ? WHITE : RED); let best = max ? -Infinity : Infinity, bm = null;
    for (const m of ms) { const e = minimax(apply(B, m), depth - 1, !max)[0]; if (max ? e >= best : e <= best) { best = e; bm = m; } }
    return [best, bm]; }
  root.innerHTML = `<style>
    .lab-ck .board { display:grid; grid-template-columns:repeat(8,1fr); width:min(440px,100%); aspect-ratio:1; border:6px solid #3b2a1e; border-radius:6px; box-shadow:0 10px 40px rgba(0,0,0,.5); margin:0 auto; }
    .lab-ck .sq { position:relative; } .lab-ck .sq.l { background:#e8d5b0; } .lab-ck .sq.d { background:#7a5a3f; cursor:pointer; }
    .lab-ck .sq.hint::after { content:''; position:absolute; inset:38%; border-radius:50%; background:rgba(124,255,178,.7); }
    .lab-ck .sq.last { box-shadow:inset 0 0 0 3px rgba(255,215,120,.6); }
    .lab-ck .pc { position:absolute; inset:12%; border-radius:50%; display:grid; place-items:center; font-size:clamp(12px,2.4vw,18px); transition:transform .15s; }
    .lab-ck .pc.r { background:radial-gradient(circle at 35% 30%,#ff7a6b,#b3261e 70%); box-shadow:0 3px 0 #6e140f; color:#ffd9a0; }
    .lab-ck .pc.w { background:radial-gradient(circle at 35% 30%,#fff,#cfc8bb 70%); box-shadow:0 3px 0 #8e877a; color:#8a6a2a; }
    .lab-ck .pc.sel { transform:scale(1.08); outline:3px solid #7cffb2; outline-offset:2px; }
  </style>
  <div class="lab-ck">
    <div class="tabs"><button class="on">play</button><button>what it's thinking</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> a game of checkers against the computer. You play red and move first. Click a piece, then a highlighted square. Captures are compulsory when available, multi-jumps chain, and pieces that reach the far row become kings. ${LAB.badge('live')}</p><p><b>Technical:</b> a port of the repo's <code>minimax</code> and <code>board.evaluate()</code>: score = white pieces − red pieces + ½ × (white kings − red kings). The computer searches every line to the chosen depth and plays the one that maximises that score.</p><p><b>Try:</b> win at depth 1, then try depth 4.</p>`)}
      <div class="grid-main"><div><div class="board" id="bd"></div></div>
      <div class="panel"><h4><b>game</b></h4><div class="controls" style="margin:0 0 10px"><label class="ctl" style="min-width:200px"><span class="lbl">look-ahead (moves) <output id="dO">3</output></span><input type="range" id="dep" min="1" max="5" value="3"></label><button class="btn sm" id="nw">new game</button></div><div class="kpis" id="ck"></div><p class="mono" id="msg" style="font-size:13px;color:var(--accent)"></p></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> how the computer chose its last move — every option it had, with the minimax score it found for each, and how many positions it examined. ${LAB.badge('live')}</p><p><b>How minimax works:</b> it assumes you will always reply with the move that is worst for it, and picks the move whose worst case is best. Each extra move of look-ahead multiplies the positions to examine.</p>`)}
      <div class="grid2"><div class="panel"><h4><b>options on its last turn</b></h4><table class="tbl" id="op"></table></div><div class="panel"><h4><b>positions examined per move</b></h4><canvas class="chart" id="nd"></canvas></div></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-ck'));
  const $ = id => root.querySelector('#' + id);
  let B = start(), sel = null, last = null, busy = false; const hist = [];
  const label = ([r, c]) => 'abcdefgh'[c] + (8 - r);
  function render() { const legal = allMoves(B, RED), mustJump = legal.some(m => m.cap.length), opts = sel ? legal.filter(m => m.from[0] === sel[0] && m.from[1] === sel[1] && (!mustJump || m.cap.length)) : [];
    $('bd').innerHTML = B.map((row, r) => row.map((v, c) => `<div class="sq ${(r + c) % 2 ? 'd' : 'l'} ${opts.some(m => m.to[0] === r && m.to[1] === c) ? 'hint' : ''} ${last && ((last.from[0] === r && last.from[1] === c) || (last.to[0] === r && last.to[1] === c)) ? 'last' : ''}" data-r="${r}" data-c="${c}">${v ? `<div class="pc ${isRed(v) ? 'r' : 'w'} ${sel && sel[0] === r && sel[1] === c ? 'sel' : ''}">${king(v) ? '♛' : ''}</div>` : ''}</div>`).join('')).join('');
    const k = count(B); $('ck').innerHTML = [['you (red)', k.r + (k.rk ? ` · ${k.rk}♛` : '')], ['computer', k.w + (k.wk ? ` · ${k.wk}♛` : '')], ['evaluation', evaluate(B).toFixed(1)]].map(([a, b]) => `<div class="kpi"><span>${a}</span><b>${b}</b></div>`).join(''); }
  $('bd').addEventListener('click', e => { if (busy || winner(B)) return; const sq = e.target.closest('.sq'); if (!sq) return; const r = +sq.dataset.r, c = +sq.dataset.c;
    const legal = allMoves(B, RED), mustJump = legal.some(m => m.cap.length);
    if (sel) { const m = legal.find(m => m.from[0] === sel[0] && m.from[1] === sel[1] && m.to[0] === r && m.to[1] === c && (!mustJump || m.cap.length)); if (m) { B = apply(B, m); last = m; sel = null; render(); return ai(); } }
    sel = isRed(B[r][c]) ? [r, c] : null; if (sel && mustJump && !legal.some(m => m.from[0] === r && m.from[1] === c && m.cap.length)) $('msg').textContent = 'A capture is available — you must take it.'; else $('msg').textContent = ''; render(); });
  function ai() { const w = winner(B); if (w) return end(w); busy = true; $('msg').textContent = 'thinking…';
    setTimeout(() => { const d = +$('dep').value, opts = allMoves(B, WHITE); nodes = 0; const scored = opts.map(m => [m, minimax(apply(B, m), d - 1, false)[0]]); const n = nodes;
      let best = -Infinity, bm = null; scored.forEach(([m, s]) => { if (s >= best) { best = s; bm = m; } });
      $('op').innerHTML = '<tr><th>move</th><th>captures</th><th>minimax score</th></tr>' + scored.sort((a, b) => b[1] - a[1]).map(([m, s]) => `<tr style="${m === bm ? 'color:var(--accent)' : ''}"><td class="mono">${label(m.from)} → ${label(m.to)}</td><td class="mono">${m.cap.length}</td><td class="mono">${s.toFixed(1)}</td></tr>`).join('');
      hist.push(n); ndP.redraw();
      if (bm) { B = apply(B, bm); last = bm; } busy = false; $('msg').textContent = bm ? `computer played ${label(bm.from)} → ${label(bm.to)} after examining ${n.toLocaleString()} positions` : ''; render(); const w2 = winner(B); if (w2) end(w2); }, 30); }
  function end(w) { $('msg').textContent = w === RED ? 'You win.' : 'The computer wins. New game?'; }
  const ndP = new Plot($('nd'), { pad: { l: 52, b: 28 } });
  ndP.render = p => { if (!hist.length) { p.frame(0, 1, 0, 1).axes({}); return; } p.frame(.5, hist.length + .5, 0, Math.max(...hist) * 1.1).axes({ xLabel: 'computer move' }); p.bars(hist.map((_, i) => i + 1), hist, { color: getComputedStyle(document.body).getPropertyValue('--accent').trim(), width: .6 }); };
  $('dep').addEventListener('input', () => $('dO').textContent = $('dep').value);
  $('nw').addEventListener('click', () => { B = start(); sel = null; last = null; hist.length = 0; ndP.redraw(); $('msg').textContent = ''; render(); });
  render(); ndP.redraw();
};
