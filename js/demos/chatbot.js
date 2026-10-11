/* Support chatbot — the repo's intents.json, bag-of-words, and the same 8-8-softmax network, trained in the page */
DEMOS.chatbot = async function (root) {
  const INT = JSON.parse(JSON.stringify(await loadJSON('assets/data/chatbot_intents.json'))).intents;
  // a light suffix-stripping stemmer standing in for NLTK's Lancaster stemmer
  const stem = w => w.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(ing|ed|ly|es|s|'s)$/, '').replace(/(.)\1$/, '$1');
  const tok = s => s.split(/[^A-Za-z0-9']+/).filter(Boolean).map(stem).filter(Boolean);
  let vocab, tags, net;
  const rng = (s => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646)(9);
  const mat = (r, c) => [...Array(r)].map(() => [...Array(c)].map(() => (rng() - .5) * Math.sqrt(6 / (r + c)) * 2));
  const relu = v => v.map(x => Math.max(0, x)), dot = (W, x, b) => W.map((w, i) => w.reduce((s, v, j) => s + v * x[j], b[i]));
  const soft = z => { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), S = e.reduce((a, b) => a + b, 0); return e.map(v => v / S); };
  const bag = s => { const t = new Set(tok(s)); return vocab.map(w => t.has(w) ? 1 : 0); };
  function fwd(x) { const h1 = relu(dot(net.W1, x, net.b1)), h2 = relu(dot(net.W2, h1, net.b2)), p = soft(dot(net.W3, h2, net.b3)); return { h1, h2, p }; }
  function train(epochs = 1000, onDone) {
    vocab = [...new Set(INT.flatMap(i => i.patterns.flatMap(tok)))].sort(); tags = INT.map(i => i.tag);
    const data = INT.flatMap((it, k) => it.patterns.map(p => [bag(p), k]));
    net = { W1: mat(8, vocab.length), b1: Array(8).fill(0), W2: mat(8, 8), b2: Array(8).fill(0), W3: mat(tags.length, 8), b3: Array(tags.length).fill(0) };
    const lr = .05, hist = []; let e = 0;
    (function chunk() { const until = Math.min(epochs, e + 50);
      for (; e < until; e++) { let L = 0; for (const [x, k] of data) { const { h1, h2, p } = fwd(x); L -= Math.log(p[k] + 1e-9);
          const d3 = p.map((v, i) => v - (i === k ? 1 : 0)), d2 = net.W2.map((_, i) => h2[i] > 0 ? net.W3.reduce((s, w, o) => s + w[i] * d3[o], 0) : 0), d1 = net.W1.map((_, i) => h1[i] > 0 ? net.W2.reduce((s, w, o) => s + w[i] * d2[o], 0) : 0);
          net.W3.forEach((w, o) => { w.forEach((_, i) => w[i] -= lr * d3[o] * h2[i]); net.b3[o] -= lr * d3[o]; });
          net.W2.forEach((w, o) => { w.forEach((_, i) => w[i] -= lr * d2[o] * h1[i]); net.b2[o] -= lr * d2[o]; });
          net.W1.forEach((w, o) => { w.forEach((_, i) => { if (x[i]) w[i] -= lr * d1[o]; }); net.b1[o] -= lr * d1[o]; }); }
        if (e % 10 === 0) hist.push(L / data.length); }
      if (e < epochs) requestAnimationFrame(chunk); else onDone && onDone(hist, data); })();
  }
  root.innerHTML = `<style>
    .lab-chat .win { border:1px solid var(--line); border-radius:14px; overflow:hidden; background:var(--panel); display:flex; flex-direction:column; height:420px; }
    .lab-chat .bar { padding:10px 14px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:8px; font:12px var(--mono); color:var(--muted); }
    .lab-chat .bar i { width:8px; height:8px; border-radius:50%; background:var(--accent); }
    .lab-chat .clog { flex:1; overflow:auto; padding:14px; display:flex; flex-direction:column; gap:8px; }
    .lab-chat .m { max-width:78%; padding:8px 12px; border-radius:14px; font-size:14px; line-height:1.5; } .lab-chat .m.u { align-self:flex-end; background:color-mix(in srgb, var(--accent) 22%, #141b26); border-bottom-right-radius:4px; }
    .lab-chat .m.b { align-self:flex-start; background:#141b26; border:1px solid var(--line); border-bottom-left-radius:4px; } .lab-chat .m small { display:block; font:10.5px var(--mono); color:var(--muted); margin-top:3px; }
    .lab-chat form { display:flex; border-top:1px solid var(--line); } .lab-chat form input { flex:1; background:transparent; border:0; padding:12px 14px; color:var(--text); font:14px var(--sans); outline:none; } .lab-chat form button { background:none; border:0; color:var(--accent); font:600 13px var(--mono); padding:0 16px; cursor:pointer; }
    .lab-chat .chips { display:flex; gap:6px; flex-wrap:wrap; padding:0 14px 10px; } .lab-chat .chips button { font:12px var(--sans); background:none; border:1px solid var(--line-2); color:var(--muted); border-radius:999px; padding:4px 10px; cursor:pointer; }
  </style>
  <div class="lab-chat">
    <div class="tabs"><button class="on">chat</button><button>inside the model</button><button>teach it</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> a help-desk assistant for a small shop. It works out what you're asking — a greeting, opening hours, what the shop sells — and replies from a set list of answers. ${LAB.badge('live')}</p><p><b>Technical:</b> the repo's <code>intents.json</code>, turned into bag-of-words vectors after tokenising and stemming, feeds the same network as <code>main.py</code>: two hidden layers of 8 units and a softmax over the intents, trained for 1,000 epochs in your browser when the lab loads.</p><p><b>Try:</b> phrase things it hasn't seen exactly ("when do you close?", "who made you"). Ask something off-topic and watch its confidence drop.</p>`)}
      <div class="grid-main"><div class="win"><div class="bar"><i></i>support · <span id="st">training…</span></div><div class="clog" id="log"></div><div class="chips" id="sug"></div><form id="f"><input id="in" placeholder="Type a message…" autocomplete="off"><button>send</button></form></div>
      <div class="panel"><h4><b>what it heard</b><span>intent confidence</span></h4><canvas class="chart" id="pr" style="height:240px"></canvas><p class="note" id="toks"></p></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the training loss falling over 1,000 epochs, the vocabulary the stemmer produced, and how each training pattern is classified. ${LAB.badge('live')}</p>`)}
      <div class="grid2"><div class="panel"><h4><b>training loss</b><span>cross-entropy</span></h4><canvas class="chart" id="ls"></canvas></div><div class="panel"><h4><b>vocabulary</b><span id="vn"></span></h4><div id="vc" class="mono" style="font-size:12px;line-height:1.9;color:#cfd6e2"></div></div></div>
      <div class="panel" style="margin-top:14px"><h4><b>training patterns</b><span>predicted intent</span></h4><div style="max-height:260px;overflow:auto"><table class="tbl" id="tp"></table></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the intents file. Add a new intent with a few example phrases and replies, then retrain — the assistant learns it in seconds. That is the point of the design: swap the file and it becomes a different assistant. ${LAB.badge('live')}</p>`)}
      <div class="grid-main"><div class="panel"><h4><b>new intent</b></h4>
        <div class="controls" style="flex-direction:column;align-items:stretch;margin:0"><label class="ctl">tag<input id="nt" value="delivery"></label><label class="ctl">example phrases (one per line)<textarea id="np" rows="4">Do you deliver?
Can you ship to my address
How long does delivery take
Shipping options</textarea></label><label class="ctl">replies (one per line)<textarea id="nr" rows="2">We deliver within 3–5 working days.
Yes — standard shipping takes 3–5 days.</textarea></label><button class="btn sm" id="add">add intent &amp; retrain</button></div></div>
      <div class="panel"><h4><b>intents.json</b></h4><pre class="mono" id="js" style="font-size:11.5px;max-height:330px;overflow:auto;margin:0;white-space:pre-wrap;color:#cfd6e2"></pre></div></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-chat'));
  const $ = id => root.querySelector('#' + id);
  const say = (t, who, meta) => { $('log').insertAdjacentHTML('beforeend', `<div class="m ${who}">${t}${meta ? `<small>${meta}</small>` : ''}</div>`); $('log').scrollTop = 1e9; };
  const pP = new Plot($('pr'), { pad: { l: 76, b: 24 } }); let last = null;
  pP.render = p => { const v = last || tags.map(() => 0); p.frame(0, 1, -.6, tags.length - .4).axes({ yTicks: tags.map((_, i) => i), yFmt: i => tags[i] || '', xFmt: x => Math.round(x * 100) + '%' }); v.forEach((x, i) => { p.ctx.fillStyle = x === Math.max(...v) ? 'var(--accent)' : '#3a4658'; p.ctx.fillStyle = x === Math.max(...v) ? getComputedStyle(document.body).getPropertyValue('--accent') : '#3a4658'; p.ctx.fillRect(p.X(0), p.Y(i) - 6, p.X(x) - p.X(0), 12); }); };
  function reply(msg) { const x = bag(msg), { p } = fwd(x), k = p.indexOf(Math.max(...p)); last = p; pP.redraw();
    $('toks').textContent = `stems recognised: ${tok(msg).filter(w => vocab.includes(w)).join(', ') || 'none'}`;
    if (p[k] < .7) return say('Sorry, I didn’t quite get that. Could you rephrase?', 'b', `best guess “${tags[k]}” at ${Math.round(p[k] * 100)}% — below the 70% bar`);
    const R = INT[k].responses; say(R[Math.floor(Math.random() * R.length)], 'b', `${tags[k]} · ${Math.round(p[k] * 100)}%`); }
  $('f').addEventListener('submit', e => { e.preventDefault(); const v = $('in').value.trim(); if (!v || !net) return; say(v, 'u'); $('in').value = ''; reply(v); });
  $('sug').addEventListener('click', e => { if (e.target.tagName !== 'BUTTON' || !net) return; say(e.target.textContent, 'u'); reply(e.target.textContent); });
  const lsP = new Plot($('ls'), { pad: { l: 44, b: 30 } });
  function ready(hist, data) { $('st').textContent = 'online'; $('sug').innerHTML = ['Hello', 'What do you sell?', 'When do you close?', 'How old are you?', 'Tell me about quantum physics'].map(s => `<button type="button">${s}</button>`).join('');
    if (!$('log').children.length) say('Hi! Ask me about the shop.', 'b', 'greeting');
    lsP.render = p => { p.frame(0, hist.length * 10, 0, Math.max(...hist)).axes({ xLabel: 'epoch' }); p.line(hist.map((_, i) => i * 10), hist, { color: getComputedStyle(document.body).getPropertyValue('--accent').trim(), width: 2 }); }; lsP.redraw();
    $('vn').textContent = `${vocab.length} stems`; $('vc').textContent = vocab.join('  ·  ');
    $('tp').innerHTML = '<tr><th>pattern</th><th>tag</th><th>predicted</th></tr>' + INT.flatMap((it, k) => it.patterns.map(pt => { const q = fwd(bag(pt)).p, j = q.indexOf(Math.max(...q)); return `<tr><td>${pt}</td><td class="mono">${it.tag}</td><td class="mono" style="color:${j === k ? 'var(--accent)' : '#ff8a8a'}">${tags[j]} ${Math.round(q[j] * 100)}%</td></tr>`; })).join('');
    $('js').textContent = JSON.stringify({ intents: INT }, null, 2); }
  train(1000, ready);
  $('add').addEventListener('click', () => { const tag = $('nt').value.trim(), pats = $('np').value.split('\n').map(s => s.trim()).filter(Boolean), rs = $('nr').value.split('\n').map(s => s.trim()).filter(Boolean); if (!tag || !pats.length || !rs.length) return;
    const ex = INT.find(i => i.tag === tag); if (ex) { ex.patterns.push(...pats); ex.responses.push(...rs); } else INT.push({ tag, patterns: pats, responses: rs, context_set: '' });
    $('st').textContent = 'retraining…'; train(1000, (h, d) => { ready(h, d); say(`I’ve learned “${tag}”. Try asking me about it.`, 'b', 'retrained'); }); });
};
