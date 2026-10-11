/* IPL 2008–2020 — season scorecards, player cards and a data-picked XI, aggregated from every delivery */
DEMOS.ipl = async function (root) {
  const D = await loadJSON('assets/data/ipl.json');
  const ACC = getComputedStyle(document.body).getPropertyValue('--accent').trim() || PC.green, AC2 = getComputedStyle(document.body).getPropertyValue('--accent-2').trim() || PC.amber;
  const SEAS = Object.keys(D.seasons).map(Number).sort();
  const BAT = D.bat.map(([n, r, b, i, sr, av, f, s]) => ({ n, r, b, i, sr, av, f, s })), BOWL = D.bowl.map(([n, w, b, e, sr]) => ({ n, w, b, e, sr }));
  // composite ratings: batters reward average and strike rate, bowlers reward wickets and economy (z-scores)
  const z = (arr, f) => { const v = arr.map(f), m = v.reduce((a, b) => a + b, 0) / v.length, s = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1; return x => (f(x) - m) / s; };
  const zA = z(BAT, x => x.av), zS = z(BAT, x => x.sr), zR = z(BAT, x => x.r); BAT.forEach(x => x.rating = zA(x) + zS(x) + .5 * zR(x));
  const zW = z(BOWL, x => x.w), zE = z(BOWL, x => -x.e), zSR = z(BOWL, x => -x.sr); BOWL.forEach(x => x.rating = zW(x) + zE(x) + .5 * zSR(x));
  const both = new Set(BAT.map(x => x.n).filter(n => BOWL.some(b => b.n === n)));
  root.innerHTML = `<style>
    .lab-ipl .board { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--line); border-radius:12px; overflow:hidden; background:linear-gradient(180deg,#0d1a12,#0b0f16); }
    .lab-ipl .board div { padding:12px 14px; border-right:1px solid var(--line); } .lab-ipl .board div:last-child{border:0}
    .lab-ipl .board b { display:block; font:600 22px var(--mono); color:var(--text); } .lab-ipl .board span { font:10.5px var(--mono); letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
    .lab-ipl .champ { font:600 13px var(--mono); color:var(--accent-2); letter-spacing:.06em; }
    .lab-ipl table.tbl td.pick { cursor:pointer; } .lab-ipl tr.on td { color:var(--accent); } .lab-ipl .xi { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:6px; }
    .lab-ipl .xi div { border:1px solid var(--line-2); border-radius:8px; padding:7px 10px; font-size:13px; } .lab-ipl .xi div small { display:block; font:10.5px var(--mono); color:var(--muted); }
    @media (max-width:640px){ .lab-ipl .board{grid-template-columns:1fr 1fr} }
  </style>
  <div class="lab-ipl">
    <div class="tabs"><button class="on">season scorecard</button><button>player cards</button><button>pick the XI</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> a scorecard for one IPL season, built from every ball bowled — ${D.n.balls.toLocaleString()} deliveries across ${D.n.matches} matches. ${LAB.badge('live')}</p><p><b>Technical:</b> the run-rate chart averages total runs (including extras) for each over across every innings of the season. Toss impact is the share of matches won by the team that won the toss.</p><p><b>Try:</b> step from 2008 to 2020 and watch the death overs (16–20) get more expensive.</p>`)}
      <div class="controls"><label class="ctl" style="min-width:260px"><span class="lbl">season <output id="sO"></output></span><input type="range" id="sea" min="${SEAS[0]}" max="${SEAS[SEAS.length - 1]}" value="${SEAS[SEAS.length - 1]}"></label><span class="champ" id="ch"></span></div>
      <div class="board" id="brd"></div>
      <div class="panel" style="margin-top:14px"><h4><b>runs per over</b><span>season average · <span style="color:${AC2}">2008 for comparison</span></span></h4><canvas class="chart" id="rr"></canvas></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> every batter with 600+ balls faced and every bowler with 600+ balls bowled, 2008–2020. ${LAB.badge('live')}</p><p><b>Reading the chart:</b> right is faster scoring (strike rate), up is more runs per dismissal (average). The best batters sit top-right.</p>`)}
      <div class="controls"><div class="seg" id="pSel"><button data-v="bat" class="on">batters</button><button data-v="bowl">bowlers</button></div></div>
      <div class="grid-main"><div class="panel"><h4><b id="pT">average vs strike rate</b></h4><canvas class="chart" id="pc"></canvas></div><div class="panel"><h4><b>leaders</b><span>career totals</span></h4><div style="max-height:330px;overflow:auto"><table class="tbl" id="pL"></table></div></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the notebook's closing question — which XI gives the best chance of winning? The data's pick takes the top six batters and top five bowlers on a composite rating (z-scores of average, strike rate and volume for batters; wickets, economy and strike rate for bowlers), with all-rounders allowed in either list. ${LAB.badge('live')}</p><p><b>Try:</b> click players in the tables to build your own XI and compare its total rating with the data's.</p>`)}
      <div class="grid2"><div class="panel"><h4><b>the data's XI</b><span id="dR"></span></h4><div class="xi" id="dXI"></div></div><div class="panel"><h4><b>your XI</b><span id="yR">pick 11</span></h4><div class="xi" id="yXI"></div></div></div>
      <div class="grid2" style="margin-top:14px"><div class="panel"><h4><b>batters</b><span>click to add</span></h4><div style="max-height:280px;overflow:auto"><table class="tbl" id="bT"></table></div></div><div class="panel"><h4><b>bowlers</b><span>click to add</span></h4><div style="max-height:280px;overflow:auto"><table class="tbl" id="wT"></table></div></div></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-ipl'));
  const $ = id => root.querySelector('#' + id);
  const rrP = new Plot($('rr'), { pad: { l: 40, b: 30 } });
  function season() { const s = +$('sea').value, d = D.seasons[s]; $('sO').textContent = s; $('ch').textContent = `champions: ${d.champ}`;
    $('brd').innerHTML = [[d.matches, 'matches'], [d.avg1, 'avg 1st-innings score'], [d.high, 'highest total'], [d.sixes, 'sixes'], [d.fours, 'fours'], [Math.round(d.toss * 100) + '%', 'toss winner won'], [Math.round(d.fieldFirst * 100) + '%', 'chose to field'], [(d.rr.reduce((a, b) => a + b, 0) / 20).toFixed(2), 'runs per over']].map(([b, l]) => `<div><b>${b}</b><span>${l}</span></div>`).join('');
    rrP.render = p => { const ov = [...Array(20).keys()].map(i => i + 1); p.frame(.5, 20.5, 0, 12).axes({ xTicks: [1, 6, 10, 15, 20], xLabel: 'over', yFmt: v => v.toFixed(0) });
      p.bars(ov, d.rr, { color: ACC, width: .7, alpha: .85 }); p.line(ov, D.seasons[SEAS[0]].rr, { color: AC2, width: 1.6, dash: [4, 3] }); p.vline(6.5, { label: 'powerplay ends' }); p.vline(15.5, { label: 'death overs' }); };
    rrP.redraw(); }
  $('sea').addEventListener('input', season); season();
  const pcP = new Plot($('pc'), { pad: { l: 44, b: 32 } }); let pk = 'bat';
  function players() { const isB = pk === 'bat', L = isB ? BAT : BOWL;
    $('pT').textContent = isB ? 'batting average vs strike rate' : 'economy vs bowling strike rate (lower is better on both)';
    pcP.render = p => { const xs = L.map(q => isB ? q.sr : q.e), ys = L.map(q => isB ? q.av : q.sr); p.frame(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), .08).axes({ xLabel: isB ? 'strike rate' : 'economy (runs / over)' });
      p.dots(xs, ys, { color: ACC, r: 3.2, alpha: .75 }); const c = p.ctx; c.font = '10.5px JetBrains Mono, monospace'; c.fillStyle = '#cfd6e2';
      L.slice().sort((a, b) => b.rating - a.rating).slice(0, 8).forEach(q => c.fillText(q.n, p.X(isB ? q.sr : q.e) + 5, p.Y(isB ? q.av : q.sr) - 4)); };
    pcP.redraw();
    $('pL').innerHTML = isB ? '<tr><th>batter</th><th>runs</th><th>avg</th><th>SR</th><th>6s</th></tr>' + BAT.slice(0, 30).map(q => `<tr><td>${q.n}</td><td class="mono">${q.r}</td><td class="mono">${q.av}</td><td class="mono">${q.sr}</td><td class="mono">${q.s}</td></tr>`).join('')
      : '<tr><th>bowler</th><th>wkts</th><th>econ</th><th>SR</th></tr>' + BOWL.slice(0, 30).map(q => `<tr><td>${q.n}</td><td class="mono">${q.w}</td><td class="mono">${q.e}</td><td class="mono">${q.sr}</td></tr>`).join(''); }
  seg($('pSel'), v => { pk = v; players(); }); players();
  // XI
  const bat6 = BAT.slice().sort((a, b) => b.rating - a.rating).slice(0, 6), bowl5 = BOWL.slice().sort((a, b) => b.rating - a.rating).filter(b => !bat6.some(x => x.n === b.n)).slice(0, 5);
  const card = (q, role) => `<div>${q.n}<small>${role === 'bat' ? `${q.r} runs · avg ${q.av} · SR ${q.sr}` : `${q.w} wkts · econ ${q.e}`}${both.has(q.n) ? ' · all-rounder' : ''}</small></div>`;
  const total = xi => xi.reduce((s, [q]) => s + q.rating, 0);
  $('dXI').innerHTML = bat6.map(q => card(q, 'bat')).join('') + bowl5.map(q => card(q, 'bowl')).join('');
  $('dR').textContent = `rating ${total([...bat6, ...bowl5].map(q => [q])).toFixed(1)}`;
  const mine = new Map();
  const tbl = (L, role, id) => { $(id).innerHTML = L.slice().sort((a, b) => b.rating - a.rating).map(q => `<tr data-n="${q.n}" data-r="${role}" class="${mine.has(q.n) ? 'on' : ''}"><td class="pick">${q.n}</td><td class="mono">${q.rating.toFixed(2)}</td></tr>`).join(''); };
  function xi() { tbl(BAT, 'bat', 'bT'); tbl(BOWL, 'bowl', 'wT'); $('yXI').innerHTML = [...mine.values()].map(([q, r]) => card(q, r)).join('') || '<p class="note">Click names below to pick your side.</p>';
    $('yR').textContent = mine.size ? `${mine.size}/11 · rating ${total([...mine.values()]).toFixed(1)}` : 'pick 11'; }
  root.querySelectorAll('#bT, #wT').forEach(t => t.addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if (!tr) return; const n = tr.dataset.n, r = tr.dataset.r;
    if (mine.has(n)) mine.delete(n); else if (mine.size < 11) mine.set(n, [(r === 'bat' ? BAT : BOWL).find(q => q.n === n), r]); xi(); }));
  xi();
};
