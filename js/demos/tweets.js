/* Twitter sentiment — the notebook's VADER scoring rule (pos > neg → positive) and its cleaning pipeline, run on your own text */
DEMOS.tweets = async function (root) {
  const [LEX, STOP] = await Promise.all([loadJSON('assets/data/vader.json'), loadJSON('assets/data/nltk_stopwords.json')]);
  const STOPS = new Set(Array.isArray(STOP) ? STOP : STOP.words || []);
  const ACC = getComputedStyle(document.body).getPropertyValue('--accent').trim() || PC.cyan, POS = '#5fd38d', NEG = '#ff6b8b', NEU = '#8b96a8';
  /* ---- VADER (Hutto & Gilbert, 2014), the core rules of SentimentIntensityAnalyzer ---- */
  const B_INC = .293, B_DEC = -.293, C_INC = .733, N_SCALAR = -.74;
  const NEGATE = new Set("aint arent cannot cant couldnt darent didnt doesnt dont hadnt hasnt havent isnt mightnt mustnt neither nor not nothing nowhere oughtnt shant shouldnt wasnt werent without wont wouldnt never none nope".split(' '));
  const BOOST = { absolutely: B_INC, amazingly: B_INC, awfully: B_INC, completely: B_INC, considerably: B_INC, decidedly: B_INC, deeply: B_INC, enormously: B_INC, entirely: B_INC, especially: B_INC, exceptionally: B_INC, extremely: B_INC, fabulously: B_INC, greatly: B_INC, highly: B_INC, hugely: B_INC, incredibly: B_INC, intensely: B_INC, majorly: B_INC, more: B_INC, most: B_INC, particularly: B_INC, purely: B_INC, quite: B_INC, really: B_INC, remarkably: B_INC, so: B_INC, substantially: B_INC, thoroughly: B_INC, totally: B_INC, tremendously: B_INC, unbelievably: B_INC, unusually: B_INC, utterly: B_INC, very: B_INC, almost: B_DEC, barely: B_DEC, hardly: B_DEC, kinda: B_DEC, less: B_DEC, little: B_DEC, marginally: B_DEC, occasionally: B_DEC, partly: B_DEC, scarcely: B_DEC, slightly: B_DEC, somewhat: B_DEC, sorta: B_DEC };
  const norm = (s, a = 15) => { const n = s / Math.sqrt(s * s + a); return Math.max(-1, Math.min(1, n)); };
  function vader(text) {
    const words = text.split(/\s+/).map(w => w.replace(/^[^\w']+|[^\w']+$/g, '')).filter(w => w.length > 1 || /^[ai]$/i.test(w));
    const isCap = w => /[A-Z]/.test(w) && w === w.toUpperCase(), capDiff = words.some(isCap) && !words.every(isCap);
    const low = words.map(w => w.toLowerCase().replace(/'/g, '')), per = [];
    low.forEach((w, i) => { let v = LEX[w];
      if (v === undefined || BOOST[w] !== undefined) { per.push([words[i], 0]); return; }
      if (capDiff && isCap(words[i])) v += v > 0 ? C_INC : -C_INC;
      for (let k = 1; k <= 3 && i - k >= 0; k++) { const b = BOOST[low[i - k]]; if (b !== undefined) { let s = v > 0 ? b : -b; if (capDiff && isCap(words[i - k])) s += v > 0 ? C_INC : -C_INC; v += s * [1, .95, .9][k - 1]; } }
      for (let k = 1; k <= 3 && i - k >= 0; k++) if (NEGATE.has(low[i - k]) || low[i - k].endsWith('nt')) { v *= N_SCALAR; break; }
      per.push([words[i], v]); });
    const bi = low.indexOf('but'); if (bi >= 0) per.forEach((p, i) => { if (i < bi) p[1] *= .5; else if (i > bi) p[1] *= 1.5; });
    const sum = per.reduce((s, p) => s + p[1], 0), ex = Math.min(4, (text.match(/!/g) || []).length) * .292, qm = (text.match(/\?/g) || []).length, qa = qm > 1 ? Math.min(.96, qm * .18) : 0, emph = ex + qa;
    const comp = norm(sum + (sum > 0 ? emph : sum < 0 ? -emph : 0));
    let ps = 0, ns = 0, nu = 0; per.forEach(([, v]) => { if (v > 0) ps += v + 1; else if (v < 0) ns += v - 1; else nu++; });
    if (ps > Math.abs(ns)) ps += emph; else if (ps < Math.abs(ns)) ns -= emph;
    const tot = ps + Math.abs(ns) + nu || 1, r3 = v => Math.round(v * 1000) / 1000;
    return { pos: r3(ps / tot), neg: r3(Math.abs(ns) / tot), neu: r3(nu / tot), compound: Math.round(comp * 1e4) / 1e4, per };
  }
  const label = s => s.pos > s.neg ? 'Positive' : s.neg > s.pos ? 'Negative' : 'Neutral';
  /* ---- the notebook's cleaning steps ---- */
  const STEPS = [
    ['remove_url', t => t.replace(/https?:\/\/\S+|www\.\S+/g, '')],
    ['remove_html', t => t.replace(/<.*?>/g, '')],
    ['remove_emoji', t => t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}]/gu, '')],
    ['remove_rt / mentions', t => t.replace(/RT @\w+: /g, ' ').replace(/@[A-Za-z0-9_]+/g, ' ')],
    ['decontraction', t => t.replace(/won't/gi, ' will not').replace(/can't/gi, ' can not').replace(/don't/gi, ' do not').replace(/n't/gi, ' not').replace(/'re/gi, ' are').replace(/'s/gi, ' is').replace(/'ll/gi, ' will').replace(/'ve/gi, ' have').replace(/'m/gi, ' am')],
    ['remove_punct', t => t.replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, '')],
    ['tokenization (lower)', t => t.toLowerCase().split(/\W+/).filter(Boolean)],
    ['remove_stopwords', a => a.filter(w => !STOPS.has(w))],
    ['stemming', a => a.map(w => w.replace(/(ational|tional)$/, 'tion').replace(/(ing|ed|ly|es|s)$/, '').replace(/(.)\1$/, '$1'))],
  ];
  const EX = `Just tried the new update and honestly it's AMAZING, so much faster!!
The train was late again. Third time this week. Not impressed.
Watching the launch livestream at 9pm
Customer support fixed my issue in five minutes, great service :)
I can't believe how bad the traffic is today
Not bad at all, the food was actually pretty good
New study on sleep and memory out today https://example.com/study
Worst. Customer. Experience. Ever.`;
  root.innerHTML = `<style>.lab-tw textarea{width:100%;min-height:140px} .lab-tw .tw{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--panel);margin-bottom:8px;display:flex;gap:12px;align-items:flex-start}
    .lab-tw .tw .av{width:34px;height:34px;border-radius:50%;flex:none;background:linear-gradient(135deg,var(--accent),var(--accent-2))} .lab-tw .tw p{margin:0;font-size:14px} .lab-tw .tag{font:600 11px var(--mono);padding:2px 8px;border-radius:999px;margin-left:auto;flex:none}
    .lab-tw .w{padding:1px 3px;border-radius:4px} .lab-tw .step{display:grid;grid-template-columns:170px 1fr;gap:10px;padding:7px 0;border-bottom:1px dashed var(--line);font-size:13px} .lab-tw .step code{white-space:pre-wrap;word-break:break-word}</style>
  <div class="lab-tw">
    <div class="tabs"><button class="on">score a tweet</button><button>score a batch</button><button>the cleaning pipeline</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> how the project decides whether a tweet is positive, negative or neutral. Type anything. ${LAB.badge('live')}</p><p><b>Technical:</b> VADER (<code>nltk.sentiment.vader.SentimentIntensityAnalyzer</code>), re-implemented here with its published 7,500-word lexicon and its rules for boosters ("very"), negation ("not good"), capitals, "but" and exclamation marks. The notebook labels a tweet <code>Positive if pos > neg</code>, <code>Negative if neg > pos</code>, otherwise <code>Neutral</code>.</p><p><b>Try:</b> "good" → "not good" → "not bad" → "NOT BAD!!!"</p>`)}
      <div class="grid-main"><div><label class="ctl">tweet<input id="t1" value="Not bad at all, the food was actually pretty good!" style="width:100%"></label><div id="hl" style="margin-top:12px;font-size:16px;line-height:2"></div></div>
      <div class="panel"><h4><b>polarity_scores()</b></h4><div class="kpis" id="k1"></div><p class="mono" id="v1" style="font-size:14px;margin:6px 0 0"></p></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the notebook's summary step — score every tweet and report the share that is positive, negative and neutral, plus the most frequent words and word pairs after cleaning. ${LAB.badge('live')}</p><p><b>About the sample:</b> the original pulled live tweets through the Twitter API, which can't run in a static page. The box starts with a few example lines written for this demo; paste your own — one tweet per line.</p>`)}
      <textarea id="tb">${EX}</textarea>
      <div class="kpis" id="k2" style="margin-top:12px"></div>
      <div class="grid-main"><div id="feed" style="max-height:420px;overflow:auto"></div><div><div class="panel"><h4><b>most recurring words</b></h4><canvas class="chart" id="wc" style="height:200px"></canvas></div><div class="panel" style="margin-top:12px"><h4><b>top bigrams</b></h4><div id="bg" class="mono" style="font-size:12.5px;line-height:1.9"></div></div></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the notebook's text-cleaning functions applied one after another to a tweet, so you can see what each step removes before counting words. ${LAB.badge('live')}</p>`)}
      <label class="ctl">tweet<input id="t3" value="RT @newsdesk: Can't believe it's already 9pm 😅 — read more at https://example.com <b>now</b>!!" style="width:100%"></label>
      <div class="panel" style="margin-top:12px" id="steps"></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-tw'));
  const $ = id => root.querySelector('#' + id);
  const col = l => l === 'Positive' ? POS : l === 'Negative' ? NEG : NEU;
  function one() { const s = vader($('t1').value), l = label(s);
    $('k1').innerHTML = [['pos', s.pos], ['neg', s.neg], ['neu', s.neu], ['compound', s.compound]].map(([k, v]) => `<div class="kpi"><span>${k}</span><b>${v}</b></div>`).join('');
    $('v1').innerHTML = `label: <b style="color:${col(l)}">${l}</b>`;
    $('hl').innerHTML = s.per.map(([w, v]) => v ? `<span class="w" title="${v.toFixed(2)}" style="background:${v > 0 ? 'rgba(95,211,141,' : 'rgba(255,107,139,'}${Math.min(.6, Math.abs(v) / 4 + .15)})">${w}</span>` : `<span class="w">${w}</span>`).join(' ') + '<p class="note">Highlighted words carry sentiment; hover for the value after boosters and negation.</p>'; }
  $('t1').addEventListener('input', one); one();
  const wP = new Plot($('wc'), { pad: { l: 84, b: 22 } }); let top = [];
  wP.render = p => { if (!top.length) return; p.frame(0, top[0][1] * 1.1, -.6, top.length - .4).axes({ yTicks: top.map((_, i) => i), yFmt: i => top[i] ? top[i][0] : '', xFmt: v => v.toFixed(0) }); top.forEach(([, v], i) => { p.ctx.fillStyle = ACC; p.ctx.fillRect(p.X(0), p.Y(i) - 5, p.X(v) - p.X(0), 10); }); };
  const clean = t => STEPS.reduce((x, [, f]) => f(x), t);
  function batch() { const L = $('tb').value.split('\n').map(s => s.trim()).filter(Boolean), sc = L.map(t => [t, vader(t)]), c = { Positive: 0, Negative: 0, Neutral: 0 }; sc.forEach(([, s]) => c[label(s)]++);
    const pct = k => (100 * c[k] / (L.length || 1)).toFixed(2) + '%';
    $('k2').innerHTML = [['total tweets', L.length], ['positive', pct('Positive')], ['negative', pct('Negative')], ['neutral', pct('Neutral')]].map(([k, v]) => `<div class="kpi"><span>${k}</span><b>${v}</b></div>`).join('');
    $('feed').innerHTML = sc.map(([t, s]) => { const l = label(s); return `<div class="tw"><span class="av"></span><p>${t.replace(/</g, '&lt;')}</p><span class="tag" style="color:${col(l)};border:1px solid ${col(l)}">${l} ${s.compound}</span></div>`; }).join('');
    const cnt = {}, bi = {}; L.forEach(t => { const w = clean(t); w.forEach(x => cnt[x] = (cnt[x] || 0) + 1); for (let i = 0; i < w.length - 1; i++) { const k = w[i] + ' ' + w[i + 1]; bi[k] = (bi[k] || 0) + 1; } });
    top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 8).reverse(); wP.redraw();
    $('bg').innerHTML = Object.entries(bi).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} <span style="color:var(--muted)">×${v}</span>`).join('<br>') || '<span class="note">Paste more text.</span>'; }
  $('tb').addEventListener('input', batch); batch();
  function steps() { let x = $('t3').value; $('steps').innerHTML = `<div class="step"><b class="mono">raw</b><code>${x.replace(/</g, '&lt;')}</code></div>` + STEPS.map(([n, f]) => { x = f(x); return `<div class="step"><b class="mono" style="color:var(--accent)">${n}</b><code>${(Array.isArray(x) ? JSON.stringify(x) : x).replace(/</g, '&lt;')}</code></div>`; }).join(''); }
  $('t3').addEventListener('input', steps); steps();
};
