/* Tiny canvas plotting helper for the project labs */
(function () {
  const C = {
    grid: 'rgba(140,155,180,.09)', axis: 'rgba(140,155,180,.35)', label: '#5a6578', text: '#8b96a8',
    green: '#7cffb2', cyan: '#5ee6ff', amber: '#ffb547', violet: '#a78bfa', rose: '#ff6b8b', white: '#e7ebf2',
  };
  const SERIES = ['#7cffb2', '#5ee6ff', '#ffb547', '#a78bfa', '#ff6b8b', '#f0abfc', '#93c5fd', '#fde68a', '#86efac', '#fca5a5', '#c4b5fd'];

  function niceTicks(min, max, n = 5) {
    if (!isFinite(min) || !isFinite(max)) return [];
    if (min === max) { min -= 1; max += 1; }
    const span = max - min, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
    const out = []; for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function fmt(v) {
    const a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B'; if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M'; if (a >= 1e4) return (v / 1e3).toFixed(0) + 'k';
    if (a >= 100) return v.toFixed(0); if (a >= 1) return v.toFixed(a >= 10 ? 0 : 1).replace(/\.0$/, ''); if (a === 0) return '0'; return v.toFixed(2);
  }

  class Plot {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.pad = Object.assign({ l: 44, r: 12, t: 12, b: 26 }, opts.pad || {});
      this.mouse = null;
      this.render = null;
      this.S = fitCanvas(canvas, () => this.redraw());
      canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; this.redraw(); });
      canvas.addEventListener('pointerleave', () => { this.mouse = null; this.redraw(); });
    }
    get ctx() { return this.S.ctx; } get w() { return this.S.w; } get h() { return this.S.h; }
    redraw() { if (this.render && this.w) { this.ctx.clearRect(0, 0, this.w, this.h); this.render(this); } }
    frame(x0, x1, y0, y1, padFrac = 0) {
      if (padFrac) { const d = (y1 - y0) * padFrac || 1; y0 -= d; y1 += d; }
      this.x0 = x0; this.x1 = x1; this.y0 = y0; this.y1 = y1;
      this.L = this.pad.l; this.R = this.w - this.pad.r; this.T = this.pad.t; this.B = this.h - this.pad.b;
      return this;
    }
    X(v) { return this.L + (v - this.x0) / (this.x1 - this.x0 || 1) * (this.R - this.L); }
    Y(v) { return this.B - (v - this.y0) / (this.y1 - this.y0 || 1) * (this.B - this.T); }
    invX(px) { return this.x0 + (px - this.L) / (this.R - this.L) * (this.x1 - this.x0); }
    invY(py) { return this.y0 + (this.B - py) / (this.B - this.T) * (this.y1 - this.y0); }
    inside(m) { return m && m.x >= this.L && m.x <= this.R && m.y >= this.T && m.y <= this.B; }
    axes({ xTicks, yTicks, xFmt = fmt, yFmt = fmt, xLabel, yLabel, grid = true } = {}) {
      const c = this.ctx;
      c.font = '10.5px JetBrains Mono, monospace'; c.fillStyle = C.label; c.lineWidth = 1;
      const yt = yTicks || niceTicks(this.y0, this.y1, Math.max(3, Math.floor((this.B - this.T) / 45)));
      c.textAlign = 'right'; c.textBaseline = 'middle';
      yt.forEach(v => { const y = Math.round(this.Y(v)) + .5; if (grid) { c.strokeStyle = C.grid; c.beginPath(); c.moveTo(this.L, y); c.lineTo(this.R, y); c.stroke(); } c.fillText(yFmt(v), this.L - 6, y); });
      const xt = xTicks || niceTicks(this.x0, this.x1, Math.max(3, Math.floor((this.R - this.L) / 90)));
      c.textAlign = 'center'; c.textBaseline = 'top';
      xt.forEach(t => { const [v, lab] = Array.isArray(t) ? t : [t, xFmt(t)]; const x = this.X(v); if (x < this.L - 1 || x > this.R + 1) return; c.fillText(lab, x, this.B + 7); });
      c.strokeStyle = C.axis; c.beginPath(); c.moveTo(this.L, this.B + .5); c.lineTo(this.R, this.B + .5); c.stroke();
      if (yLabel) { c.save(); c.translate(11, (this.T + this.B) / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.fillText(yLabel, 0, 0); c.restore(); }
      if (xLabel) { c.textAlign = 'right'; c.fillText(xLabel, this.R, this.B + 7 + 12); }
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      return this;
    }
    clip(fn) { const c = this.ctx; c.save(); c.beginPath(); c.rect(this.L, this.T - 2, this.R - this.L, this.B - this.T + 4); c.clip(); fn(); c.restore(); return this; }
    line(xs, ys, { color = C.green, width = 1.6, dash = null, alpha = 1 } = {}) {
      const c = this.ctx; c.save(); c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width; c.lineJoin = 'round'; if (dash) c.setLineDash(dash);
      c.beginPath(); let on = false;
      for (let i = 0; i < xs.length; i++) { const y = ys[i]; if (y == null || !isFinite(y)) { on = false; continue; } const X = this.X(xs[i]), Y = this.Y(y); on ? c.lineTo(X, Y) : c.moveTo(X, Y); on = true; }
      c.stroke(); c.restore(); return this;
    }
    area(xs, lo, hi, { color = C.green, alpha = .15 } = {}) {
      const c = this.ctx; c.save(); c.globalAlpha = alpha; c.fillStyle = color; c.beginPath();
      xs.forEach((x, i) => i ? c.lineTo(this.X(x), this.Y(hi[i])) : c.moveTo(this.X(x), this.Y(hi[i])));
      for (let i = xs.length - 1; i >= 0; i--) c.lineTo(this.X(xs[i]), this.Y(Array.isArray(lo) ? lo[i] : lo));
      c.closePath(); c.fill(); c.restore(); return this;
    }
    dots(xs, ys, { color = C.green, r = 2.5, alpha = 1, colors = null } = {}) {
      const c = this.ctx; c.save(); c.globalAlpha = alpha;
      for (let i = 0; i < xs.length; i++) { c.fillStyle = colors ? colors[i] : color; c.beginPath(); c.arc(this.X(xs[i]), this.Y(ys[i]), r, 0, 7); c.fill(); }
      c.restore(); return this;
    }
    bars(xs, ys, { color = C.green, width = .7, base = 0, colors = null, alpha = 1 } = {}) {
      const c = this.ctx, step = xs.length > 1 ? Math.abs(this.X(xs[1]) - this.X(xs[0])) : (this.R - this.L) * .5, bw = Math.max(1, step * width);
      c.save(); c.globalAlpha = alpha;
      xs.forEach((x, i) => { c.fillStyle = colors ? colors[i] : color; const y0 = this.Y(base), y1 = this.Y(ys[i]); c.fillRect(this.X(x) - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0))); });
      c.restore(); return this;
    }
    vline(x, { color = C.axis, dash = [3, 3], label } = {}) {
      const c = this.ctx, X = Math.round(this.X(x)) + .5; c.save(); c.strokeStyle = color; c.setLineDash(dash); c.beginPath(); c.moveTo(X, this.T); c.lineTo(X, this.B); c.stroke(); c.restore();
      if (label) { c.font = '10px JetBrains Mono, monospace'; c.fillStyle = color; c.fillText(label, X + 4, this.T + 10); }
      return this;
    }
    hline(y, { color = C.axis, dash = [3, 3], label } = {}) {
      const c = this.ctx, Y = Math.round(this.Y(y)) + .5; c.save(); c.strokeStyle = color; c.setLineDash(dash); c.beginPath(); c.moveTo(this.L, Y); c.lineTo(this.R, Y); c.stroke(); c.restore();
      if (label) { c.font = '10px JetBrains Mono, monospace'; c.fillStyle = color; c.textAlign = 'right'; c.fillText(label, this.R - 2, Y - 4); c.textAlign = 'left'; }
      return this;
    }
    tooltip(lines, px, py) {
      const c = this.ctx; c.font = '11px JetBrains Mono, monospace';
      const w = Math.max(...lines.map(l => c.measureText(Array.isArray(l) ? l[0] : l).width)) + 18, h = lines.length * 16 + 10;
      let x = px + 12, y = py - h - 8; if (x + w > this.w - 4) x = px - w - 12; if (y < 4) y = py + 12;
      c.fillStyle = 'rgba(10,14,21,.94)'; c.strokeStyle = 'rgba(140,155,180,.3)'; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 7) : c.rect(x, y, w, h); c.fill(); c.stroke();
      lines.forEach((l, i) => { const [t, col] = Array.isArray(l) ? l : [l, C.white]; c.fillStyle = col; c.fillText(t, x + 9, y + 18 + i * 16); });
    }
    crossX(px) { const c = this.ctx; c.save(); c.strokeStyle = 'rgba(231,235,242,.25)'; c.beginPath(); c.moveTo(Math.round(px) + .5, this.T); c.lineTo(Math.round(px) + .5, this.B); c.stroke(); c.restore(); }
  }

  window.Plot = Plot; window.PC = C; window.SERIES = SERIES; window.niceTicks = niceTicks; window.fmtNum = fmt;

  /* tiny DOM helpers used by demos */
  window.h = function (html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  window.tabs = function (root) {
    const btns = root.querySelectorAll(':scope > .tabs button'), panes = root.querySelectorAll(':scope > .tabpane');
    btns.forEach((b, i) => b.addEventListener('click', () => { btns.forEach(x => x.classList.remove('on')); panes.forEach(x => x.classList.remove('on')); b.classList.add('on'); panes[i].classList.add('on'); panes[i].dispatchEvent(new Event('show')); }));
  };
  window.seg = function (el, onChange) {
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { el.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); onChange(b.dataset.v); }));
  };
  window.loadJSON = (() => { const cache = {}; return url => cache[url] || (cache[url] = fetch(url).then(r => r.json())); })();
})();

/* ---------- lab helpers: explanations + verbatim source excerpts ---------- */
(function () {
  const KW = {
    python: 'False None True and as assert break class continue def del elif else except finally for from global if import in is lambda not or pass raise return try while with yield self print len range',
    r: 'function if else for while in library TRUE FALSE NULL NA return',
    sql: 'SELECT FROM WHERE AND OR ORDER BY GROUP LIMIT IN AS DESC ASC CREATE TABLE IF NOT EXISTS PARTITION OF FOR VALUES TO RANGE LIKE MAX distinct over partition by order desc limit',
  };
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function highlight(code, lang) {
    const kw = new Set((KW[lang] || KW.python).split(' '));
    const re = new RegExp((lang === 'sql' ? '(--[^\\n]*)' : '(#[^\\n]*)') + /|("""[\s\S]*?"""|'''[\s\S]*?'''|f?"(?:\\.|[^"\\\n])*"|f?'(?:\\.|[^'\\\n])*')|(\b\d+\.?\d*(?:e-?\d+)?\b)|([A-Za-z_][A-Za-z0-9_.]*)(\s*\()?|([\s\S])/.source, 'g');
    let out = '', m;
    while ((m = re.exec(code))) {
      if (m[1]) out += `<span class="c">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="s">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="n">${m[3]}</span>`;
      else if (m[4]) { const w = m[4]; out += kw.has(w) ? `<span class="k">${w}</span>` : m[5] ? `<span class="f">${esc(w)}</span>` : esc(w); if (m[5]) out += esc(m[5]); }
      else out += esc(m[6]);
    }
    return out;
  }
  const snipP = loadJSON('assets/data/snippets.json');
  window.LAB = {
    highlight,
    need(src) { return (window.__need = window.__need || {})[src] || (window.__need[src] = new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.append(el); })); },
    explain(html) { return `<div class="explain">${html}</div>`; },
    // placeholder that is filled once snippets.json arrives
    src(slug, keys, note = '') {
      const id = 'src' + Math.random().toString(36).slice(2, 8);
      snipP.then(S => {
        const el = document.getElementById(id); if (!el) return;
        el.innerHTML = [].concat(keys).map(k => { const s = S[slug] && S[slug][k]; if (!s) return '';
          return `<details class="src"><summary><span class="tag">from the repo</span> <b>${esc(s.title)}</b> <span class="file">${esc(s.file)}</span></summary><pre><code>${highlight(s.code, s.lang)}</code></pre><a class="gh" href="${s.url}" target="_blank" rel="noopener">view file on GitHub ↗</a></details>`; }).join('') + (note ? `<p class="note">${note}</p>` : '');
      });
      return `<div class="srcs" id="${id}"></div>`;
    },
    badge(kind) { return kind === 'rec' ? '<span class="badge rec">recorded in the notebook</span>' : '<span class="badge live">computed live</span>'; },
  };
})();
