/* Twitter search engine — the project's design (users table + tweets collection, indexes, engagement ranking, LRU cache with TTL) on a synthetic corpus */
DEMOS.tweetsearch = async function (root) {
  const ACC = getComputedStyle(document.body).getPropertyValue('--accent').trim() || PC.amber;
  /* ---- a synthetic corpus, generated here (the original April-2020 tweet dump isn't in the repo) ---- */
  const r = (s => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646)(2020);
  const pick = a => a[Math.floor(r() * a.length)];
  const TAGS = ['corona', 'covid19', 'stayhome', 'lockdown', 'vaccine', 'wfh', 'health', 'news', 'economy', 'mentalhealth', 'science', 'travel'];
  const SUBJ = ['Hospitals', 'Schools', 'Small businesses', 'Researchers', 'Airlines', 'Nurses', 'Local shops', 'Students', 'Doctors', 'Families'];
  const VERB = ['are adapting to', 'are struggling with', 'are preparing for', 'are speaking out about', 'report progress on', 'share tips on', 'are sharing updates on'];
  const OBJ = ['remote work', 'new testing sites', 'the latest guidelines', 'supply shortages', 'mask distribution', 'online classes', 'vaccine trials', 'reopening plans', 'delivery delays', 'mental health support'];
  const NAMES = ['city_desk', 'health_watch', 'dr_amara', 'the_daily_brief', 'nurse_kim', 'science_now', 'metro_updates', 'econ_pulse', 'wfh_life', 'campus_news', 'travel_alerts', 'public_health_ny', 'data_dan', 'clinic_notes', 'world_report', 'local_eats', 'transit_info', 'lab_bench', 'parents_hub', 'markets_live'];
  const users = NAMES.map((n, i) => ({ id: 1000 + i, name: n, followers: Math.round(10 ** (2 + r() * 4.2)), verified: r() < .25 }));
  const T0 = Date.UTC(2020, 3, 25, 14, 0), tweets = [];
  for (let i = 0; i < 4000; i++) { const u = pick(users), tg = [...new Set([pick(TAGS), ...(r() < .4 ? [pick(TAGS)] : [])])], pop = Math.log10(u.followers);
    tweets.push({ id: 5e6 + i, user_id: u.id, text: `${pick(SUBJ)} ${pick(VERB)} ${pick(OBJ)} ${tg.map(t => '#' + t).join(' ')}`, hashtags: tg, created_at: T0 + Math.floor(r() * 6 * 3600e3),
      retweet_count: Math.floor(r() ** 3 * 40 * pop), favorite_count: Math.floor(r() ** 2.5 * 120 * pop), reply_count: Math.floor(r() ** 4 * 25 * pop), quote_count: Math.floor(r() ** 5 * 12 * pop), is_retweet: r() < .3 }); }
  const userById = new Map(users.map(u => [u.id, u]));
  /* ---- indexes, as in the report: on text, user name and date ---- */
  const byTag = new Map(), byUser = new Map(); tweets.forEach(t => { t.hashtags.forEach(h => (byTag.get(h) || byTag.set(h, []).get(h)).push(t)); (byUser.get(t.user_id) || byUser.set(t.user_id, []).get(t.user_id)).push(t); });
  const byTime = tweets.slice().sort((a, b) => a.created_at - b.created_at);
  const engagement = t => .3 * t.reply_count + .3 * t.quote_count + .2 * t.favorite_count + .2 * t.retweet_count;
  const rank = list => list.slice().sort((a, b) => engagement(b) - engagement(a) || userById.get(b.user_id).followers - userById.get(a.user_id).followers);
  /* ---- LRU cache with TTL ---- */
  class LRU { constructor(size, ttl) { this.size = size; this.ttl = ttl; this.m = new Map(); this.hits = 0; this.miss = 0; this.log = []; }
    get(k) { const e = this.m.get(k); if (e && performance.now() - e.t < this.ttl * 1000) { this.m.delete(k); this.m.set(k, e); this.hits++; return e.v; } if (e) this.m.delete(k); this.miss++; return undefined; }
    set(k, v) { if (this.m.size >= this.size) { const old = this.m.keys().next().value; this.m.delete(old); this.log.unshift(`evicted ${old}`); } this.m.set(k, { v, t: performance.now() }); } }
  let cache = new LRU(50, 30);
  // a full scan with no index, to show what the indexes buy
  const scan = pred => tweets.filter(pred);
  const Q = {
    hashtag: (q, idx) => idx ? (byTag.get(q.replace('#', '').toLowerCase()) || []) : scan(t => t.hashtags.includes(q.replace('#', '').toLowerCase())),
    user: (q, idx) => { const u = users.find(u => u.name === q.replace('@', '')); return !u ? [] : idx ? (byUser.get(u.id) || []) : scan(t => t.user_id === u.id); },
    keyword: (q, idx, a, b) => { const k = q.toLowerCase(); if (!idx) return scan(t => t.text.toLowerCase().includes(k) && t.created_at >= a && t.created_at <= b); let lo = 0, hi = byTime.length; while (lo < hi) { const m = (lo + hi) >> 1; if (byTime[m].created_at < a) lo = m + 1; else hi = m; } const out = []; for (let i = lo; i < byTime.length && byTime[i].created_at <= b; i++) if (byTime[i].text.toLowerCase().includes(k)) out.push(byTime[i]); return out; },
  };
  const fmtT = ms => new Date(ms).toUTCString().slice(17, 22);
  root.innerHTML = `<style>.lab-ts .res{border-bottom:1px dashed var(--line);padding:9px 0;font-size:13.5px}.lab-ts .res b{font-family:var(--mono);font-size:12.5px}.lab-ts .res small{display:block;font:11px var(--mono);color:var(--muted)}
    .lab-ts .qbar{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end}.lab-ts .qbar input{flex:1;min-width:200px}.lab-ts .flow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font:12px var(--mono)}.lab-ts .flow span{border:1px solid var(--line-2);border-radius:8px;padding:8px 10px}.lab-ts .flow span.on{border-color:var(--accent);color:var(--accent)}.lab-ts .flow i{color:var(--dim);font-style:normal}</style>
  <div class="lab-ts">
    <div class="tabs"><button class="on">search</button><button>how a query runs</button><button>cache</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> a search engine over tweets. Search by hashtag, user or keyword; results are ranked by engagement and the timing shows where the answer came from. ${LAB.badge('live')}</p><p><b>Technical:</b> the project's design rebuilt in the page — user records kept like the PostgreSQL table, tweets like the MongoDB collection, lookup indexes on hashtag, user and time, and an LRU cache with a time-to-live. Ranking uses the report's weights: <code>0.3·replies + 0.3·quotes + 0.2·likes + 0.2·retweets</code>, ties broken by follower count.</p><p><b>About the data:</b> the original April 2020 tweet dump isn't in the repo, so 4,000 synthetic tweets from 20 accounts are generated here to exercise the engine. The design, not the content, is the point.</p>`)}
      <div class="qbar"><label class="ctl">search by<div class="seg" id="mode"><button data-v="hashtag" class="on">hashtag</button><button data-v="user">user</button><button data-v="keyword">keyword + time</button></div></label><label class="ctl" style="flex:1">query<input id="q" value="#corona" list="sug"></label><datalist id="sug">${TAGS.map(t => `<option value="#${t}">`).join('')}${NAMES.map(n => `<option value="@${n}">`).join('')}</datalist><button class="btn sm primary" id="go">search</button></div>
      <div class="kpis" id="k" style="margin-top:12px"></div>
      <div class="grid-main"><div class="panel"><h4><b>results</b><span id="rn"></span></h4><div id="res" style="max-height:380px;overflow:auto"></div></div>
      <div class="panel"><h4><b>dashboards</b><span>cached after first call</span></h4><div class="controls" style="margin:0 0 8px"><button class="btn sm" data-d="users">most popular users</button><button class="btn sm" data-d="tags">most popular hashtags</button><button class="btn sm" data-d="eng">most engaging tweets</button></div><div id="dash"></div></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the same query answered three ways — scanning every tweet, using an index, and from the cache — with the time each took in your browser. ${LAB.badge('live')}</p><p><b>Why it matters:</b> a full scan grows with the data; an index jumps straight to the matching rows; the cache skips the work entirely for repeated questions. At millions of tweets, the gaps grow by orders of magnitude.</p>`)}
      <div class="flow" id="flow"><span>query</span><i>→</i><span data-s="cache">cache?</span><i>→</i><span data-s="index">index lookup</span><i>→</i><span data-s="rank">engagement rank</span><i>→</i><span data-s="store">store in cache</span></div>
      <div class="panel" style="margin-top:12px"><h4><b>time to answer</b><span id="qn"></span></h4><canvas class="chart" id="tm" style="height:200px"></canvas></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the cache's contents, hit rate and evictions. When it is full, the least-recently-used entry is evicted; entries older than the time-to-live are refetched. ${LAB.badge('live')}</p><p><b>Report settings:</b> 1,000 items and a 3,600-second TTL in production. The lab uses 50 items and 30 seconds — the values in the notebook's test — so you can watch both rules act.</p>`)}
      <div class="controls"><label class="ctl"><span class="lbl">cache size <output id="csO">50</output></span><input type="range" id="cs" min="3" max="100" value="50"></label><label class="ctl"><span class="lbl">TTL (s) <output id="ctO">30</output></span><input type="range" id="ct" min="5" max="120" value="30"></label><button class="btn sm" id="burst">run 40 random queries</button></div>
      <div class="kpis" id="ck"></div>
      <div class="grid2"><div class="panel"><h4><b>cached keys</b><span>most recent first</span></h4><div id="keys" class="mono" style="font-size:12px;line-height:1.8;max-height:260px;overflow:auto"></div></div><div class="panel"><h4><b>eviction log</b></h4><div id="ev" class="mono" style="font-size:12px;line-height:1.8;max-height:260px;overflow:auto"></div></div></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-ts'));
  const $ = id => root.querySelector('#' + id); let mode = 'hashtag';
  seg($('mode'), v => { mode = v; $('q').value = v === 'hashtag' ? '#corona' : v === 'user' ? '@health_watch' : 'vaccine'; });
  const time = f => { const t0 = performance.now(); const v = f(); return [v, performance.now() - t0]; };
  const tP = new Plot($('tm'), { pad: { l: 110, b: 28 } }); let times = null;
  tP.render = p => { if (!times) return; const mx = Math.max(...times.map(t => t[1])) * 1.15 || 1; p.frame(0, mx, -.6, times.length - .4).axes({ yTicks: times.map((_, i) => i), yFmt: i => times[i] ? times[i][0] : '', xFmt: v => v.toFixed(2) + ' ms' }); times.forEach(([, v], i) => { p.ctx.fillStyle = i === 2 ? ACC : '#5a6578'; p.ctx.fillRect(p.X(0), p.Y(i) - 9, Math.max(2, p.X(v) - p.X(0)), 18); p.ctx.fillStyle = '#cfd6e2'; p.ctx.font = '11px JetBrains Mono, monospace'; p.ctx.fillText(v.toFixed(3) + ' ms', p.X(v) + 6, p.Y(i) + 4); }); };
  function run(q, m = mode) { const a = T0 + 3600e3, b = T0 + 5 * 3600e3, key = `${m}:${q}`;
    const [hit, tc] = time(() => cache.get(key));
    let res = hit, src = 'cache', tt = tc;
    if (!res) { const [v, ti] = time(() => rank(Q[m](q, true, a, b)).slice(0, 50)); res = v; tt = tc + ti; src = 'index'; cache.set(key, res); }
    const [, ts] = time(() => rank(Q[m](q, false, a, b))), [, ti2] = time(() => rank(Q[m](q, true, a, b))), [, tc2] = time(() => cache.m.get(key));
    times = [['full scan', ts], ['index', ti2], ['cache', tc2]]; $('qn').textContent = key; tP.redraw();
    root.querySelectorAll('#flow span[data-s]').forEach(s => s.classList.toggle('on', src === 'cache' ? s.dataset.s === 'cache' : true));
    return { res, src, tt }; }
  function search() { const q = $('q').value.trim(); if (!q) return; const { res, src, tt } = run(q);
    $('k').innerHTML = [['answered from', src], ['time', tt.toFixed(3) + ' ms'], ['matches (top 50 shown)', res.length], ['cache hit rate', cache.hits + cache.miss ? Math.round(100 * cache.hits / (cache.hits + cache.miss)) + '%' : '–']].map(([k, v]) => `<div class="kpi"><span>${k}</span><b>${v}</b></div>`).join('');
    $('rn').textContent = mode === 'keyword' ? 'between 15:00 and 19:00 UTC, 25 Apr 2020' : 'ranked by engagement';
    $('res').innerHTML = res.slice(0, 25).map(t => { const u = userById.get(t.user_id); return `<div class="res"><b>@${u.name}${u.verified ? ' ✓' : ''}</b> ${t.text}<small>${fmtT(t.created_at)} UTC · ♥ ${t.favorite_count} · ⟲ ${t.retweet_count} · replies ${t.reply_count} · quotes ${t.quote_count} · score ${engagement(t).toFixed(1)}</small></div>`; }).join('') || '<p class="note">No matches — try a suggestion from the list.</p>'; cacheView(); }
  $('go').addEventListener('click', search); $('q').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
  root.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { const d = b.dataset.d, key = 'dash:' + d; let v = cache.get(key), src = 'cache'; const t0 = performance.now();
    if (!v) { src = 'computed'; v = d === 'users' ? users.slice().sort((a, c) => (c.verified - a.verified) || c.followers - a.followers).slice(0, 8).map(u => `@${u.name}${u.verified ? ' ✓' : ''} — ${u.followers.toLocaleString()} followers`)
      : d === 'tags' ? [...byTag.entries()].sort((a, c) => c[1].length - a[1].length).slice(0, 8).map(([h, l]) => `#${h} — ${l.length} tweets`) : rank(tweets).slice(0, 6).map(t => `@${userById.get(t.user_id).name}: ${t.text} (score ${engagement(t).toFixed(1)})`); cache.set(key, v); }
    $('dash').innerHTML = `<p class="mono" style="font-size:11.5px;color:var(--muted);margin:0 0 6px">${src} in ${(performance.now() - t0).toFixed(3)} ms</p>` + v.map(x => `<div class="res">${x}</div>`).join(''); cacheView(); }));
  function cacheView() { $('ck').innerHTML = [['entries', `${cache.m.size}/${cache.size}`], ['hits', cache.hits], ['misses', cache.miss], ['hit rate', cache.hits + cache.miss ? Math.round(100 * cache.hits / (cache.hits + cache.miss)) + '%' : '–']].map(([k, v]) => `<div class="kpi"><span>${k}</span><b>${v}</b></div>`).join('');
    $('keys').innerHTML = [...cache.m.entries()].reverse().map(([k, e]) => `${k} <span style="color:var(--muted)">· ${Math.max(0, cache.ttl - (performance.now() - e.t) / 1000).toFixed(0)}s left</span>`).join('<br>') || '<span class="note">empty</span>';
    $('ev').innerHTML = cache.log.slice(0, 30).join('<br>') || '<span class="note">nothing evicted yet</span>'; }
  const resize = () => { const old = cache; cache = new LRU(+$('cs').value, +$('ct').value); cache.hits = old.hits; cache.miss = old.miss; $('csO').textContent = cache.size; $('ctO').textContent = cache.ttl; cacheView(); };
  $('cs').addEventListener('change', resize); $('ct').addEventListener('change', resize); $('cs').addEventListener('input', () => $('csO').textContent = $('cs').value); $('ct').addEventListener('input', () => $('ctO').textContent = $('ct').value);
  $('burst').addEventListener('click', () => { for (let i = 0; i < 40; i++) { const m = r() < .5 ? 'hashtag' : 'user'; run(m === 'hashtag' ? '#' + pick(TAGS) : '@' + pick(NAMES), m); } cacheView(); });
  setInterval(() => { if (root.isConnected && root.querySelector('.tabpane.on #keys')) cacheView(); }, 1000);
  search();
};
