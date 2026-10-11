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
    <p class="lede${P.plain ? ' tech' : ''}">${P.tagline}</p>
    <div class="chips">${P.stack.map(s => `<span class="chip">${s}</span>`).join('')}</div>
    <div class="metrics">${P.metrics.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>
    <div class="actions">
      ${P.repo ? `<a class="btn" href="${P.repo}" target="_blank" rel="noopener">${ICONS.github} source on GitHub</a>` : ''}
      ${P.live ? `<a class="btn primary" href="${P.live}" target="_blank" rel="noopener">full app on Hugging Face <span class="arr">↗</span></a>` : ''}
      <a class="btn" href="#lab">jump to lab <span class="arr">↓</span></a>
    </div>`;
  document.querySelectorAll('.actions .btn svg').forEach(s => { s.style.width = '16px'; s.style.height = '16px'; s.style.fill = 'currentColor'; });
  document.getElementById('labTitle').textContent = `~/${P.slug}/lab — ${P.year}`;
  const o = ORN[P.theme]; if (o) { const live = document.querySelector('.lab-bar .live'); const sp = document.createElement('span'); sp.className = 'orn'; sp.innerHTML = `<b>${o[0]}</b>${o[1]}`; live.before(sp); }

  document.getElementById('story').innerHTML = `
    <div><p class="eyebrow">the project</p>${P.summary.map(s => `<p>${s}</p>`).join('')}</div>
    <div><p class="eyebrow">pipeline</p><ol class="pipeline">${P.pipeline.map(s => `<li>${s}</li>`).join('')}</ol></div>`;

  const prev = S.projects[(idx - 1 + S.projects.length) % S.projects.length], next = S.projects[(idx + 1) % S.projects.length];
  document.getElementById('nextProj').innerHTML = `<a class="btn" href="project.html?p=${prev.slug}">← ${prev.title}</a><a class="btn" href="project.html?p=${next.slug}">${next.title} →</a>`;

  window.DEMOS = window.DEMOS || {};
  const s = document.createElement('script');
  s.src = `js/demos/${P.demo}.js`;
  s.onload = () => {
    const body = document.getElementById('labBody'); body.innerHTML = '';
    try { window.DEMOS[P.demo](body, P); }
    catch (e) { console.error(e); body.innerHTML = '<p class="note">The lab failed to start in this browser.</p>'; }
  };
  s.onerror = () => { document.getElementById('labBody').innerHTML = '<p class="note">Lab not found.</p>'; };
  document.body.append(s);
})();
