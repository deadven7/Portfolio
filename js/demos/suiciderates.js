/* Global suicide-rate trends 1985–2015 — rates per 100k from master.csv, by country, sex and age */
DEMOS.suiciderates = async function (root) {
  const D = await loadJSON('assets/data/suiciderates.json');
  const ACC = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#9fb3c8', AC2 = getComputedStyle(document.body).getPropertyValue('--accent-2').trim() || '#c8b6a6';
  const C = Object.keys(D.countries).sort();
  root.innerHTML = `<div class="lab-sr">
    <div class="tabs"><button class="on">trends</button><button>by age and sex</button><button>income and rates</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> suicides per 100,000 people each year, for the world total in the dataset or one country. Rates are recomputed as total suicides ÷ total population, not averages of averages. ${LAB.badge('live')}</p><p><b>Data:</b> the WHO-derived Kaggle dataset used in the notebook (101 countries, 1985–2016; 2016 is dropped here because few countries reported it). Countries shown have at least 22 years of data.</p>`)}
      <div class="controls"><label class="ctl">view<select id="cSel"><option value="">all countries in the data</option>${C.map(c => `<option>${c}</option>`).join('')}</select></label><label class="ctl">compare with<select id="cCmp"><option value="">—</option>${C.map(c => `<option>${c}</option>`).join('')}</select></label></div>
      <div class="kpis" id="sK"></div>
      <div class="panel"><h4><b>rate per 100,000</b><span id="sLeg"></span></h4><canvas class="chart" id="tr"></canvas></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the gap between men and women over time, and rates by age band across all years. ${LAB.badge('live')}</p><p><b>Takeaway:</b> men's rates run three to four times women's in most years, and risk rises with age.</p>`)}
      <div class="grid2"><div class="panel"><h4><b>men vs women</b><span id="aName">all countries</span></h4><canvas class="chart" id="sx"></canvas><div class="legend"><span><i style="background:${ACC}"></i>men</span><span><i style="background:${AC2}"></i>women</span></div></div>
      <div class="panel"><h4><b>by age band</b><span>all years</span></h4><canvas class="chart" id="ag"></canvas></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> each dot is a country in 1990, 1995, 2000, 2005, 2010 or 2015, placed by GDP per person and its suicide rate. ${LAB.badge('live')}</p><p><b>Takeaway:</b> there is no simple income effect — some of the highest rates are in middle-income countries of the former Soviet Union in the 1990s.</p>`)}
      <div class="controls"><div class="seg" id="yr"><button data-v="0" class="on">all years</button>${[1990, 1995, 2000, 2005, 2010, 2015].map(y => `<button data-v="${y}">${y}</button>`).join('')}</div></div>
      <div class="panel"><canvas class="chart" id="gd" style="height:360px"></canvas></div>
    </div>
    <p class="note" style="margin-top:14px">If this topic affects you, you don’t have to face it alone. In the US, call or text <b>988</b> (Suicide &amp; Crisis Lifeline); elsewhere, local health services can connect you with support.</p>
  </div>`;
  tabs(root.querySelector('.lab-sr'));
  const $ = id => root.querySelector('#' + id);
  const pick = n => n ? D.countries[n] : D.global;
  const yrs = o => Object.keys(o).map(Number).sort((a, b) => a - b);
  const tP = new Plot($('tr'), { pad: { l: 40, b: 30 } }), xP = new Plot($('sx'), { pad: { l: 40, b: 30 } }), aP = new Plot($('ag'), { pad: { l: 40, b: 34 } });
  function draw() { const n = $('cSel').value, m = $('cCmp').value, A = pick(n), B = m ? D.countries[m] : null, ya = yrs(A.rate);
    const all = [...Object.values(A.rate), ...(B ? Object.values(B.rate) : [])];
    tP.render = p => { p.frame(1985, 2015, 0, Math.max(...all) * 1.1).axes({ xFmt: v => Math.round(v) }); p.line(ya, ya.map(y => A.rate[y]), { color: ACC, width: 2 }); if (B) { const yb = yrs(B.rate); p.line(yb, yb.map(y => B.rate[y]), { color: AC2, width: 2, dash: [5, 3] }); } };
    tP.redraw(); $('sLeg').innerHTML = `<span style="color:${ACC}">${n || 'all countries'}</span>${m ? ` · <span style="color:${AC2}">${m}</span>` : ''}`;
    const first = A.rate[ya[0]], last = A.rate[ya[ya.length - 1]], peak = ya.reduce((b, y) => A.rate[y] > A.rate[b] ? y : b, ya[0]);
    $('sK').innerHTML = [[`${ya[0]} rate`, first.toFixed(1)], [`${ya[ya.length - 1]} rate`, last.toFixed(1)], ['peak year', `${peak} (${A.rate[peak].toFixed(1)})`], ['change', `${((last / first - 1) * 100).toFixed(0)}%`]].map(([k, v]) => `<div class="kpi"><span>${k}</span><b>${v}</b></div>`).join('');
    $('aName').textContent = n || 'all countries';
    xP.render = p => { const M = A.sex.male, F = A.sex.female, ym = yrs(M); p.frame(1985, 2015, 0, Math.max(...Object.values(M)) * 1.1).axes({ xFmt: v => Math.round(v) }); p.area(ym, ym.map(y => F[y] || 0), ym.map(y => M[y]), { color: ACC, alpha: .08 }); p.line(ym, ym.map(y => M[y]), { color: ACC, width: 2 }); p.line(ym, ym.map(y => F[y] || 0), { color: AC2, width: 2 }); };
    xP.redraw();
    aP.render = p => { const ag = D.ages, v = ag.map(a => A.age[a] || 0); p.frame(-.6, ag.length - .4, 0, Math.max(...v) * 1.15).axes({ xTicks: ag.map((_, i) => i), xFmt: i => ag[i] ? ag[i].replace(' years', '') : '' }); p.bars(ag.map((_, i) => i), v, { color: ACC, width: .6 }); };
    aP.redraw(); }
  ['cSel', 'cCmp'].forEach(id => $(id).addEventListener('change', draw)); draw();
  const gP = new Plot($('gd'), { pad: { l: 44, b: 34 } }); let yy = 0;
  gP.render = p => { const pts = D.gdp.filter(q => q[2] > 0 && (!yy || q[1] === yy)); p.frame(2.2, 5.1, 0, 60).axes({ xLabel: 'GDP per capita ($, log scale)', xFmt: v => '$' + Math.round(10 ** v).toLocaleString(), yFmt: v => v.toFixed(0) });
    p.dots(pts.map(q => Math.log10(q[2])), pts.map(q => q[3]), { color: ACC, r: 3, alpha: .6 });
    const c = p.ctx; c.font = '10.5px JetBrains Mono, monospace'; c.fillStyle = '#cfd6e2'; pts.slice().sort((a, b) => b[3] - a[3]).slice(0, 5).forEach(q => c.fillText(`${q[0]} ${q[1]}`, p.X(Math.log10(q[2])) + 5, p.Y(q[3]) - 3)); };
  seg($('yr'), v => { yy = +v; gP.redraw(); }); gP.redraw();
};
