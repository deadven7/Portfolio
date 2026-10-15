/* Project detail page: renders header/story from data.js and boots the matching demo */
(function () {
  const S = window.SITE;
  const slug = new URLSearchParams(location.search).get('p') || S.projects[0].slug;
  const idx = Math.max(0, S.projects.findIndex(p => p.slug === slug));
  const P = S.projects[idx];
  document.title = `${P.title} — Amaan Vora`;
  const ORN = {"finance": ["◆", "market data"], "bank": ["▤", "risk desk"], "survey": ["◎", "survey"], "stream": ["▶", "catalogue"], "show": ["✦", "on air"], "security": ["⬢", "secured"], "claims": ["✚", "claims desk"], "docs": ["¶", "document"], "research": ["§", "archive"], "maritime": ["⚓", "manifest"], "realestate": ["⌂", "listing"], "device": ["▯", "spec sheet"], "sports": ["●", "scorecard"], "world": ["◍", "briefing"], "publichealth": ["—", "report"], "social": ["@", "feed"], "search": ["⌕", "console"], "cinema": ["★", "reviews"], "chat": ["…", "help desk"], "game": ["♛", "board"], "puzzle": ["#", "puzzle"]};
  if (P.theme) document.body.dataset.theme = P.theme;

  document.getElementById('pdHead').innerHTML = `
    <div class="crumbs"><a href="projects.html">~/projects</a> / ${P.slug}</div>
    ${P.domain ? `<span class="pill">${P.domain}</span>` : ''}
    <h1>${P.title}</h1>
    ${P.plain ? `<p class="plain">${P.plain}</p>` : ''}
    ${P.plain ? '' : `<p class="lede">${P.tagline}</p>`}
    ${P.metrics.length ? `<div class="metrics m${P.metrics.length}">${P.metrics.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>` : ''}
    <div class="actions">
      ${P.repo ? `<a class="btn" href="${P.repo}" target="_blank" rel="noopener">${ICONS.github} source on GitHub</a>` : ''}
      ${P.live ? `<a class="btn primary" href="${P.live}" target="_blank" rel="noopener">full app on Hugging Face <span class="arr">↗</span></a>` : ''}
      <a class="btn" href="#lab">go to the lab <span class="arr">↓</span></a>
    </div>`;
  document.querySelectorAll('.actions .btn svg').forEach(s => { s.style.width = '16px'; s.style.height = '16px'; s.style.fill = 'currentColor'; });
  document.getElementById('labTitle').textContent = `~/${P.slug}/lab — ${P.year}`;
  const o = ORN[P.theme]; if (o) { const sp = document.createElement('span'); sp.className = 'orn'; sp.innerHTML = `<b>${o[0]}</b>${o[1]}`; document.querySelector('.lab-bar').append(sp); }

  if (P.overview) { const lab = document.getElementById('lab'), ov = document.createElement('details'); ov.className = 'p-ov'; ov.open = true;
    ov.innerHTML = `<summary>Project overview</summary><div class="ov-grid">${P.overview.map(([k, items]) => `<section><h3>${k}</h3><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul></section>`).join('')}</div>`;
    lab.before(ov); }
  document.getElementById('story').innerHTML = `
    <div><p class="eyebrow">the project</p><p class="lede tech" style="margin-top:0">${P.tagline}</p>${P.summary.map(s => `<p>${s}</p>`).join('')}<div class="chips" style="margin-top:14px">${P.stack.map(s => `<span class="chip">${s}</span>`).join('')}</div></div>
    <div><p class="eyebrow">pipeline</p><ol class="pipeline">${P.pipeline.map(s => `<li>${s}</li>`).join('')}</ol></div>`;

  const prev = S.projects[(idx - 1 + S.projects.length) % S.projects.length], next = S.projects[(idx + 1) % S.projects.length];
  document.getElementById('nextProj').innerHTML = `<a class="btn" href="project.html?p=${prev.slug}">← ${prev.title}</a><a class="btn" href="project.html?p=${next.slug}">${next.title} →</a>`;

  // no tabs: every section of the lab is laid out on the page, one after another, with its own heading
  function chapters(body) {
    const wrap = body.querySelector('.tabs') ? body.querySelector('.tabs').parentElement : null;
    if (wrap) { const btns = [...wrap.querySelectorAll(':scope > .tabs button')], panes = [...wrap.querySelectorAll(':scope > .tabpane')];
      panes.forEach((p, i) => { p.classList.add('on'); const sec = P.sections && P.sections[i];
        if (sec) p.querySelectorAll(':scope > .explain').forEach(ex => { const tech = ex.querySelector('.tech') || ex.appendChild(Object.assign(document.createElement('div'), { className: 'tech' })); [...ex.children].filter(c => c !== tech).forEach(c => tech.append(c)); ex.prepend(Object.assign(document.createElement('p'), { textContent: sec[1] })); });
        if (btns[i] || sec) p.insertAdjacentHTML('afterbegin', `<h3 class="ch-h"><span>${String(i + 1).padStart(2, '0')}</span>${sec ? sec[0] : btns[i].textContent}</h3>`); p.dispatchEvent(new Event('show')); });
      wrap.querySelector(':scope > .tabs').remove(); }
    dispatchEvent(new Event('resize'));
    if (location.hash === '#lab') setTimeout(() => document.getElementById('lab').scrollIntoView(), 60);
  }
  window.DEMOS = window.DEMOS || {};
  const s = document.createElement('script');
  s.src = `js/demos/${P.demo}.js`;
  s.onload = () => {
    const body = document.getElementById('labBody'); body.innerHTML = '';
    try { Promise.resolve(window.DEMOS[P.demo](body, P)).then(() => chapters(body)).catch(e => console.error(e)); }
    catch (e) { console.error(e); body.innerHTML = '<p class="note">The lab failed to start in this browser.</p>'; }
  };
  s.onerror = () => { document.getElementById('labBody').innerHTML = '<p class="note">Lab not found.</p>'; };
  document.body.append(s);
})();
