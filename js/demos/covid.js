/* COVID-19 economy & survival — data_agg and the notebook's ranking score, recomputed from raw_data.csv */
DEMOS.covid = async function (root) {
  const D = await loadJSON('assets/data/covid.json');
  const ACC = getComputedStyle(document.body).getPropertyValue('--accent').trim() || PC.cyan;
  const rows = D.rows.map(([code, country, cases, deaths, sti, pop, gdp, hdi]) => ({ code, country, cases, deaths, sti, pop, gdp, hdi }));
  const gdpSum = rows.reduce((s, r) => s + r.gdp, 0);
  rows.forEach(r => { r.death = r.cases ? r.deaths / r.cases : 0; r.inf = r.cases / r.pop * 100; r.gdpShare = r.gdp / gdpSum * 100; r.cpm = r.cases / r.pop * 1e6; r.dpm = r.deaths / r.pop * 1e6;
    const rd = v => Math.round(v * 100) / 100; r.score = rd(rd(r.hdi) + rd(r.gdpShare) + rd(r.sti) - rd(r.death)); });
  root.innerHTML = `<style>.lab-covid .rk td:first-child{color:var(--muted);font-family:var(--mono)} .lab-covid .bar{height:8px;border-radius:4px;background:var(--accent);display:inline-block;vertical-align:middle;margin-right:8px}</style>
  <div class="lab-covid">
    <div class="tabs"><button class="on">the notebook's ranking</button><button>build your own score</button><button>what mattered</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> the notebook's "safest countries during COVID-19" ranking, recomputed from the repo's raw data (${D.span[0]} to ${D.span[1]}, ${rows.length} countries). ${LAB.badge('live')}</p><p><b>The formula, as written:</b> <code>Score = HDI + GDP + Stringency_Index − Death_Rate</code>, where GDP is a country's share (%) of the summed GDP per capita, stringency is the Oxford index averaged over the period, and death rate is deaths ÷ cases.</p><p><b>A caveat worth seeing:</b> stringency is on a 0–100 scale while HDI is 0–1, so stringency dominates the score. The next tab lets you put the ingredients on equal footing.</p>`)}
      <div class="controls"><label class="ctl">search<input id="q" placeholder="country…" style="min-width:200px"></label></div>
      <div class="panel"><div style="max-height:420px;overflow:auto"><table class="tbl rk" id="rk"></table></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the same four ingredients, each rescaled to 0–1 across countries, combined with weights you choose. Lower death rate and infection rate count in a country's favour. ${LAB.badge('live')}</p><p><b>Try:</b> set stringency to zero and see which countries rise — wealth and development alone tell a different story.</p>`)}
      <div class="controls" id="wC"></div>
      <div class="grid-main"><div class="panel"><h4><b>top 20 on your score</b><span>out of 5</span></h4><canvas class="chart" id="wB" style="height:460px"></canvas></div><div class="panel"><h4><b>biggest movers</b><span>vs the notebook's ranking</span></h4><table class="tbl" id="mv"></table></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the notebook's scatter plots — each dot a country, sized by population. ${LAB.badge('live')}</p><p><b>Takeaway:</b> richer, more developed countries recorded more cases per person (they also tested more), while lockdown strictness had no simple relationship with outcomes.</p>`)}
      <div class="controls"><div class="ctl">x<div class="seg" id="xS"><button data-v="hdi" class="on">HDI</button><button data-v="gdp">GDP per capita</button><button data-v="sti">stringency</button></div></div><div class="ctl">y<div class="seg" id="yS"><button data-v="cpm" class="on">cases per million</button><button data-v="dpm">deaths per million</button><button data-v="death">death rate</button></div></div></div>
      <div class="panel"><canvas class="chart" id="sc" style="height:380px"></canvas><p class="note" id="scN"></p></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-covid'));
  const $ = id => root.querySelector('#' + id);
  const ranked = rows.slice().sort((a, b) => b.score - a.score); ranked.forEach((r, i) => r.rank = i + 1);
  const pct = v => (v * 100).toFixed(2) + '%';
  function table() { const q = $('q').value.toLowerCase(), mx = ranked[0].score;
    $('rk').innerHTML = '<tr><th>#</th><th>country</th><th>score</th><th>HDI</th><th>GDP share</th><th>stringency</th><th>death rate</th></tr>' + ranked.filter(r => r.country.toLowerCase().includes(q)).slice(0, q ? 50 : 60).map(r => `<tr><td>${r.rank}</td><td>${r.country}</td><td class="mono"><span class="bar" style="width:${Math.max(2, r.score / mx * 70)}px"></span>${r.score.toFixed(2)}</td><td class="mono">${r.hdi}</td><td class="mono">${r.gdpShare.toFixed(2)}</td><td class="mono">${r.sti.toFixed(1)}</td><td class="mono">${pct(r.death)}</td></tr>`).join(''); }
  $('q').addEventListener('input', table); table();
  const ING = [['hdi', 'development (HDI)', 1, 1], ['gdp', 'wealth (GDP per capita, log)', 1, 1], ['sti', 'stringency', 1, 1], ['death', 'low death rate', 1, -1], ['inf', 'low infection rate', 0, -1]];
  const norm = {}; ING.forEach(([k, , , sgn]) => { const v = rows.map(r => k === 'gdp' ? Math.log1p(r.gdp) : k === 'inf' ? Math.log1p(r.inf) : r[k]), mn = Math.min(...v), mx = Math.max(...v); rows.forEach((r, i) => (r.n = r.n || {})[k] = sgn > 0 ? (v[i] - mn) / (mx - mn || 1) : 1 - (v[i] - mn) / (mx - mn || 1)); });
  const W = {}; ING.forEach(([k, , w]) => W[k] = w);
  $('wC').innerHTML = ING.map(([k, l, w]) => `<label class="ctl" style="min-width:170px"><span class="lbl">${l} <output data-o="${k}">${w}</output></span><input type="range" data-k="${k}" min="0" max="3" step=".5" value="${w}"></label>`).join('');
  const bP = new Plot($('wB'), { pad: { l: 130, b: 26 } });
  function mine() { const S = ING.reduce((s, [k]) => s + W[k], 0) || 1; rows.forEach(r => r.mine = ING.reduce((s, [k]) => s + W[k] * r.n[k], 0) / S * 5);
    const top = rows.filter(r => r.pop > 1e6).sort((a, b) => b.mine - a.mine); top.forEach((r, i) => r.mrank = i + 1); const t20 = top.slice(0, 20).reverse();
    bP.render = p => { p.frame(0, 5, -.6, t20.length - .4).axes({ yTicks: t20.map((_, i) => i), yFmt: i => t20[i] ? t20[i].country : '', xFmt: v => v.toFixed(0) }); t20.forEach((r, i) => { p.ctx.fillStyle = ACC; p.ctx.fillRect(p.X(0), p.Y(i) - 6, p.X(r.mine) - p.X(0), 12); }); };
    bP.redraw();
    const nr = rows.filter(r => r.pop > 1e6).slice().sort((a, b) => b.score - a.score); nr.forEach((r, i) => r.nrank = i + 1);
    $('mv').innerHTML = '<tr><th>country</th><th>notebook</th><th>yours</th></tr>' + top.map(r => [r, r.nrank - r.mrank]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 12).map(([r, d]) => `<tr><td>${r.country}</td><td class="mono">#${r.nrank}</td><td class="mono" style="color:${d > 0 ? 'var(--accent)' : '#ff8a8a'}">#${r.mrank} (${d > 0 ? '↑' : '↓'}${Math.abs(d)})</td></tr>`).join('');
    $('mv').insertAdjacentHTML('afterend', ''); }
  $('wC').addEventListener('input', e => { const k = e.target.dataset.k; if (!k) return; W[k] = +e.target.value; root.querySelector(`[data-o="${k}"]`).textContent = W[k]; mine(); }); mine();
  let xk = 'hdi', yk = 'cpm';
  const sP = new Plot($('sc'), { pad: { l: 56, b: 34 } }); const LAB_ = { hdi: 'HDI', gdp: 'GDP per capita ($, log)', sti: 'mean stringency index', cpm: 'cases per million (log)', dpm: 'deaths per million (log)', death: 'death rate (deaths ÷ cases)' };
  sP.render = p => { const pts = rows.filter(r => r.hdi > 0 && r.cases > 0 && (xk !== 'gdp' || r.gdp > 0)), tx = v => xk === 'gdp' ? Math.log10(v) : v, ty = v => yk === 'death' ? v : Math.log10(Math.max(v, .1));
    const xs = pts.map(r => tx(r[xk])), ys = pts.map(r => ty(r[yk])); p.frame(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), .05).axes({ xLabel: LAB_[xk], xFmt: v => xk === 'gdp' ? '$' + Math.round(10 ** v).toLocaleString() : v.toFixed(xk === 'hdi' ? 2 : 0), yFmt: v => yk === 'death' ? (v * 100).toFixed(0) + '%' : Math.round(10 ** v).toLocaleString() });
    const c = p.ctx; pts.forEach((r, i) => { c.globalAlpha = .55; c.fillStyle = ACC; c.beginPath(); c.arc(p.X(xs[i]), p.Y(ys[i]), 2 + Math.sqrt(r.pop / 1e6) * .45, 0, 7); c.fill(); }); c.globalAlpha = 1;
    const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length, r = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
    $('scN').textContent = `Correlation across ${pts.length} countries: r = ${r.toFixed(2)}. Dot size = population.`; };
  seg($('xS'), v => { xk = v; sP.redraw(); }); seg($('yS'), v => { yk = v; sP.redraw(); }); sP.redraw();
};
