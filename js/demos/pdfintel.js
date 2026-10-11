/* PDF Intelligence — the pipeline's section map, TF-IDF search, entity tagging and per-section summaries, run on a sample document or your own text */
DEMOS.pdfintel = async function (root) {
  const SAMPLE = await loadJSON('assets/data/pdfintel_doc.json');
  const STOP = new Set(await loadJSON('assets/data/nltk_stopwords.json'));
  const ACC = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#e9d8a6';
  const TECH = ['Python', 'R', 'SQL', 'TensorFlow', 'Keras', 'PyTorch', 'NLTK', 'TFLearn', 'NumPy', 'Numpy', 'pandas', 'Pandas', 'MongoDB', 'PostgreSQL', 'MySQL', 'Twitter API', 'Tweepy', 'BERT', 'scikit-learn', 'Pygame', 'Flask', 'Kaggle', 'IMDb', 'JSON', 'LSTM', 'K-Means', 'TF-IDF', 'Word2Vec'];
  const sents = t => (t.match(/[^.!?]+[.!?]+/g) || [t]).map(s => s.trim()).filter(s => s.split(' ').length > 3);
  const words = t => (t.toLowerCase().match(/[a-z][a-z0-9'-]+/g) || []).filter(w => !STOP.has(w) && w.length > 2);
  function analyse(secs) {
    const df = {}, N = secs.length; secs.forEach(([, b]) => new Set(words(b)).forEach(w => df[w] = (df[w] || 0) + 1));
    const idf = w => Math.log((1 + N) / (1 + (df[w] || 0))) + 1;
    const tfidf = t => { const v = {}; words(t).forEach(w => v[w] = (v[w] || 0) + 1); for (const w in v) v[w] *= idf(w); return v; };
    const cos = (a, b) => { let s = 0, na = 0, nb = 0; for (const k in a) { na += a[k] ** 2; if (b[k]) s += a[k] * b[k]; } for (const k in b) nb += b[k] ** 2; return s / (Math.sqrt(na * nb) || 1); };
    return secs.map(([title, body], i) => { const S = sents(body), V = tfidf(body), SV = S.map(tfidf);
      // extractive summary: sentences closest to the section's own TF-IDF centroid, kept in reading order
      const sc = S.map((s, k) => [k, cos(SV[k], V) * (k === 0 ? 1.15 : 1)]).sort((a, b) => b[1] - a[1]).slice(0, Math.min(2, S.length)).sort((a, b) => a[0] - b[0]);
      const ents = { technology: new Set(), organisation: new Set(), 'number / date': new Set() };
      TECH.forEach(t => { if (new RegExp(`\\b${t.replace(/[-.]/g, '\\$&')}\\b`).test(body)) ents.technology.add(t); });
      (body.match(/\b(?:[A-Z][a-z]+|[A-Z]{2,})(?:\s+(?:of|and|the|&)?\s*(?:[A-Z][a-z]+|[A-Z]{2,}))+\b/g) || []).forEach(m => { if (!TECH.includes(m) && m.split(' ').length <= 5 && !/^(The|This|It|We|A|In)\b/.test(m)) ents.organisation.add(m); });
      (body.match(/\b(19|20)\d{2}\b|\b\d[\d,.]*\s?(%|percent|years|matches|users|tweets)?\b/g) || []).slice(0, 8).forEach(m => ents['number / date'].add(m.trim()));
      const top = Object.entries(V).sort((a, b) => b[1] - a[1]).slice(0, 6).map(q => q[0]);
      return { i, title, body, S, V, summary: sc.map(([k]) => S[k]), ents, top, words: body.split(/\s+/).length }; });
  }
  root.innerHTML = `<style>
    .lab-pdf .page { background:#f4f1ea; color:#1d2430; border-radius:6px; padding:24px 28px; font:14px/1.75 Georgia, serif; max-height:520px; overflow:auto; box-shadow:0 10px 30px rgba(0,0,0,.35); }
    .lab-pdf .page h3 { font:700 15px Georgia, serif; margin:18px 0 6px; } .lab-pdf .page h3:first-child { margin-top:0 } .lab-pdf .page mark { background:#ffe28a; padding:0 2px; } .lab-pdf .page .act { background:rgba(255,226,138,.35); }
    .lab-pdf .sec { border-bottom:1px solid var(--line); padding:9px 0; cursor:pointer; } .lab-pdf .sec b { font-size:14px; } .lab-pdf .sec small { display:block; font:11px var(--mono); color:var(--muted); }
    .lab-pdf .sec:hover b, .lab-pdf .sec.on b { color:var(--accent); } .lab-pdf .ent { display:inline-block; font:12px var(--mono); border:1px solid var(--line-2); border-radius:999px; padding:2px 9px; margin:2px; }
  </style>
  <div class="lab-pdf">
    <div class="tabs"><button class="on">document map</button><button>search</button><button>entities &amp; summaries</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> a long document turned into a map — each section with its length, its key terms and a two-sentence summary. Click a section to jump to it. ${LAB.badge('live')}</p><p><b>About the document:</b> the sample is a report assembled from this portfolio's own project READMEs (12 sections). Paste any text of your own below — headings on their own line, starting with <code>#</code>.</p><p><b>Technical:</b> the full system extracts text, tables and figures from PDFs and summarises with BART or FLAN-T5. In the browser, sections come from headings, key terms from TF-IDF, and summaries are extractive: the sentences closest to each section's TF-IDF centroid.</p>`)}
      <div class="controls"><button class="btn sm" id="useS">use the sample report</button><button class="btn sm" id="useM">paste my own text</button></div>
      <div id="own" hidden style="margin-bottom:12px"><textarea id="ta" rows="8" placeholder="# Introduction&#10;Your text here…&#10;# Methods&#10;…"></textarea><button class="btn sm primary" id="an" style="margin-top:8px">analyse</button></div>
      <div class="grid-main"><div class="page" id="pg"></div><div class="panel"><h4><b>sections</b><span id="sn"></span></h4><div id="map" style="max-height:470px;overflow:auto"></div></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> full-text search over the document. Sections are ranked by TF-IDF cosine similarity to your query, and the best-matching sentence in each is shown. ${LAB.badge('live')}</p><p><b>Try:</b> "database caching", "neural network accuracy", "best team".</p>`)}
      <label class="ctl">search the document<input id="q" value="database indexing and caching" style="width:100%"></label>
      <div id="hits" style="margin-top:12px"></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> named entities found in each section — technologies, organisations and proper names, numbers and dates — with its summary. ${LAB.badge('live')}</p><p><b>Technical:</b> the full system uses spaCy's statistical NER. Here a gazetteer of technology names, capitalised-phrase rules and number patterns stand in, so it runs instantly with no model download.</p>`)}
      <div id="ents"></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-pdf'));
  const $ = id => root.querySelector('#' + id);
  let A = [];
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function show(secs) { A = analyse(secs);
    $('sn').textContent = `${A.length} sections · ${A.reduce((s, a) => s + a.words, 0).toLocaleString()} words`;
    $('pg').innerHTML = A.map(a => `<h3 id="ps${a.i}">${esc(a.title)}</h3><p>${a.S.map(s => a.summary.includes(s) ? `<span class="act">${esc(s)}</span>` : esc(s)).join(' ')}</p>`).join('');
    $('map').innerHTML = A.map(a => `<div class="sec" data-i="${a.i}"><b>${esc(a.title)}</b><small>${a.words} words · ${a.top.slice(0, 4).join(', ')}</small><p style="margin:4px 0 0;font-size:13px;color:#cfd6e2">${esc(a.summary.join(' '))}</p></div>`).join('');
    $('ents').innerHTML = A.map(a => `<div class="panel" style="margin-bottom:10px"><h4><b>${esc(a.title)}</b><span>${a.words} words</span></h4><p style="margin:0 0 8px;font-size:14px;color:#cfd6e2">${esc(a.summary.join(' '))}</p>${Object.entries(a.ents).map(([k, s]) => s.size ? `<div style="margin-top:4px"><span class="mono" style="font-size:11px;color:var(--muted);margin-right:6px">${k}</span>${[...s].slice(0, 10).map(e => `<span class="ent" style="border-color:${k === 'technology' ? ACC : 'var(--line-2)'}">${esc(e)}</span>`).join('')}</div>` : '').join('')}</div>`).join('');
    search(); }
  $('map').addEventListener('click', e => { const s = e.target.closest('.sec'); if (!s) return; root.querySelectorAll('.sec').forEach(x => x.classList.toggle('on', x === s)); const h = $('ps' + s.dataset.i); $('pg').scrollTo({ top: h.offsetTop - 12, behavior: 'smooth' }); });
  function search() { const q = $('q').value, qw = words(q); if (!qw.length || !A.length) { $('hits').innerHTML = ''; return; }
    const qv = {}; qw.forEach(w => qv[w] = (qv[w] || 0) + 1);
    const cos = (a, b) => { let s = 0, na = 0, nb = 0; for (const k in a) { na += a[k] ** 2; if (b[k]) s += a[k] * b[k]; } for (const k in b) nb += b[k] ** 2; return s / (Math.sqrt(na * nb) || 1); };
    const R = A.map(a => [a, cos(qv, a.V)]).filter(r => r[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, 5);
    const re = new RegExp(`\\b(${qw.map(w => w.replace(/[^a-z0-9]/g, '')).join('|')})\\w*`, 'gi');
    $('hits').innerHTML = R.map(([a, s]) => { const best = a.S.map(x => [x, words(x).filter(w => qw.includes(w)).length]).sort((x, y) => y[1] - x[1])[0][0]; return `<div class="panel" style="margin-bottom:10px"><h4><b>${esc(a.title)}</b><span>score ${s.toFixed(3)}</span></h4><p style="margin:0;font-size:14px;color:#cfd6e2">${esc(best).replace(re, m => `<mark style="background:color-mix(in srgb, var(--accent) 35%, transparent);color:inherit;padding:0 2px">${m}</mark>`)}</p></div>`; }).join('') || '<p class="note">No section mentions those words.</p>'; }
  $('q').addEventListener('input', search);
  $('useS').addEventListener('click', () => { $('own').hidden = true; show(SAMPLE); });
  $('useM').addEventListener('click', () => { $('own').hidden = false; $('ta').focus(); });
  $('an').addEventListener('click', () => { const t = $('ta').value, parts = t.split(/^#+\s*(.+)$/m); const secs = []; if (parts[0].trim()) secs.push(['Untitled', parts[0].trim()]); for (let i = 1; i < parts.length; i += 2) secs.push([parts[i].trim(), (parts[i + 1] || '').replace(/\s+/g, ' ').trim()]); if (secs.length) show(secs.filter(s => s[1])); });
  show(SAMPLE);
};
