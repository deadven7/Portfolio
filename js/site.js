/* Shared shell: nav, footer, icons, reveal, canvas helpers */
(function () {
  const S = window.SITE;
  const ICONS = {
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57l-.02-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.6-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
    kaggle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.83 23.86c-.02.09-.12.14-.28.14h-3.14a.6.6 0 0 1-.49-.25l-5.18-6.59-1.45 1.38v5.1c0 .24-.12.36-.35.36H5.5c-.23 0-.35-.12-.35-.36V.35c0-.23.12-.35.35-.35h2.44c.23 0 .35.12.35.35V14.7l6.2-6.28c.17-.16.33-.24.5-.24h3.24c.14 0 .23.06.28.18.05.15.04.26-.03.32l-6.56 6.34 6.84 8.5c.1.11.12.21.07.36"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v.4l9 5.6 9-5.6V7H3zm18 2.7-8.47 5.27a1 1 0 0 1-1.06 0L3 9.7V17h18V9.7z"/></svg>',
  };
  window.ICONS = ICONS;

  const page = document.body.dataset.page || '';
  const root = document.body.dataset.root || '';

  /* ---------- nav ---------- */
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = `
    <a class="brand" href="${root}index.html" aria-label="Home"><img src="${root}assets/img/av-logo.png" alt=""><span>amaan<b>.</b>vora</span></a>
    <button class="burger" aria-label="Menu"><i></i><i></i><i></i></button>
    <ul>
      <li><a href="${root}index.html" class="${page === 'home' ? 'active' : ''}">home</a></li>
      <li><a href="${root}about.html" class="${page === 'about' ? 'active' : ''}">about</a></li>
      <li><a href="${root}projects.html" class="${page === 'projects' ? 'active' : ''}">projects</a></li>
      <li><a href="${root}work.html" class="${page === 'work' ? 'active' : ''}">work</a></li>
      <li><a href="${S.links.mail}">contact</a></li>
    </ul>`;
  document.body.prepend(nav);
  nav.querySelector('.burger').addEventListener('click', () => nav.classList.toggle('open'));
  nav.querySelectorAll('ul a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- socials ---------- */
  window.socialsHTML = function () {
    return [
      ['linkedin', 'LinkedIn', S.links.linkedin],
      ['github', 'GitHub', S.links.github],
      ['kaggle', 'Kaggle', S.links.kaggle],
      ['mail', S.email, S.links.mail],
    ].map(([k, label, href]) => `<a class="social" href="${href}" ${k === 'mail' ? '' : 'target="_blank" rel="noopener"'} aria-label="${label}">${ICONS[k]}<span>${label}</span></a>`).join('');
  };
  document.querySelectorAll('[data-socials]').forEach(el => el.innerHTML = socialsHTML());

  /* ---------- footer ---------- */
  if (!document.body.dataset.nofooter) {
    const f = document.createElement('footer');
    f.className = 'footer';
    f.innerHTML = `<div class="wrap"><div><div>© ${new Date().getFullYear()} Amaan Vora</div><div class="mono">hand-built · no frameworks · runs on your GPU's spare cycles</div></div><div class="socials">${socialsHTML()}</div></div>`;
    document.body.append(f);
  }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  window.observeReveal = el => io.observe(el);
  document.querySelectorAll('.reveal, [data-reveal]').forEach(el => io.observe(el));

  /* ---------- helpers ---------- */
  window.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hi-DPI canvas that tracks its CSS size. Returns {ctx, w, h} getter-object.
  window.fitCanvas = function (canvas, onResize) {
    const state = { ctx: canvas.getContext('2d'), w: 0, h: 0, dpr: 1 };
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (!r.width || !r.height) return;
      state.w = r.width; state.h = r.height; state.dpr = dpr;
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      onResize && onResize(state);
    };
    new ResizeObserver(fit).observe(canvas);
    fit();
    return state;
  };

  // requestAnimationFrame loop that only runs while the element is on screen
  window.loopWhileVisible = function (el, frame) {
    let visible = false, raf = 0, last = performance.now();
    const tick = t => { const dt = Math.min(0.05, (t - last) / 1000); last = t; frame(dt, t / 1000); if (visible) raf = requestAnimationFrame(tick); };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    }).observe(el);
  };

  window.rng = function (seed = 1) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; };
  window.lerp = (a, b, t) => a + (b - a) * t;
  window.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
})();
