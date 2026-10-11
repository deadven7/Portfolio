/* Small looping animations used as project-card thumbnails */
(function () {
  const G = '#7cffb2', CY = '#5ee6ff', AM = '#ffb547', VI = '#a78bfa', RO = '#ff6b8b';
  const DIM = 'rgba(140,155,180,.18)';

  const minis = {
    stockbroker(ctx, W, H, t) {
      const n = 34, bw = W / n, r = rng(11);
      let p = 50, pts = [];
      const off = Math.floor(t * 2);
      for (let i = 0; i < n + off; i++) { const o = p; p += (r() - .48) * 4; const hi = Math.max(o, p) + r() * 2, lo = Math.min(o, p) - r() * 2; if (i >= off) pts.push([o, p, hi, lo]); }
      const all = pts.flat(), mn = Math.min(...all), mx = Math.max(...all);
      const y = v => H - 20 - (v - mn) / (mx - mn) * (H - 46);
      const shift = (t * 2 % 1) * bw;
      pts.forEach(([o, c, hi, lo], i) => {
        const x = i * bw + bw / 2 - shift;
        ctx.strokeStyle = ctx.fillStyle = c >= o ? G : RO; ctx.globalAlpha = .8;
        ctx.beginPath(); ctx.moveTo(x, y(hi)); ctx.lineTo(x, y(lo)); ctx.stroke();
        ctx.fillRect(x - bw * .3, Math.min(y(o), y(c)), bw * .6, Math.max(1, Math.abs(y(o) - y(c))));
      });
      ctx.globalAlpha = 1; ctx.strokeStyle = AM; ctx.lineWidth = 1.5; ctx.beginPath();
      pts.forEach((_, i) => { const s = pts.slice(Math.max(0, i - 5), i + 1); const m = s.reduce((a, b) => a + b[1], 0) / s.length; const x = i * bw + bw / 2 - shift; i ? ctx.lineTo(x, y(m)) : ctx.moveTo(x, y(m)); });
      ctx.stroke();
    },
    optimizers(ctx, W, H, t) {
      const cx = W * .62, cy = H * .55;
      for (let k = 1; k < 9; k++) { ctx.strokeStyle = `rgba(94,230,255,${0.05 + k * 0.012})`; ctx.beginPath(); ctx.ellipse(cx, cy, k * W * .055, k * H * .05, -.4, 0, 7); ctx.stroke(); }
      const T = (t % 6) / 6;
      [[G, 0.0, 1.0], [AM, 0.9, 0.7], [VI, 2.0, 0.45]].forEach(([c, ph, sp]) => {
        ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath();
        const steps = 60;
        for (let i = 0; i <= steps * T; i++) {
          const u = i / steps, d = Math.pow(1 - u, 1 + sp), a = ph + u * 6 * sp;
          const x = cx + Math.cos(a) * d * W * .42, y = cy + Math.sin(a) * d * H * .38;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, 7); ctx.fill();
    },
    recommender(ctx, W, H, t) {
      const r = rng(5), N = 26, nodes = [];
      for (let i = 0; i < N; i++) nodes.push([W * .1 + r() * W * .8 + Math.sin(t * .6 + i) * 4, H * .15 + r() * H * .75 + Math.cos(t * .5 + i * 2) * 4, i % 4]);
      const hub = Math.floor(t / 2) % N;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]);
        if (d < 70) { const hot = i === hub || j === hub; ctx.strokeStyle = hot ? 'rgba(124,255,178,.7)' : DIM; ctx.lineWidth = hot ? 1.4 : 1; ctx.beginPath(); ctx.moveTo(nodes[i][0], nodes[i][1]); ctx.lineTo(nodes[j][0], nodes[j][1]); ctx.stroke(); }
      }
      nodes.forEach(([x, y, g], i) => { ctx.fillStyle = [G, CY, AM, VI][g]; ctx.beginPath(); ctx.arc(x, y, i === hub ? 5 : 2.6, 0, 7); ctx.fill(); });
    },
    snp500(ctx, W, H, t) {
      const cols = [G, CY, AM, VI, RO, '#8b96a8'];
      const T = Math.min(1, (t % 7) / 5);
      cols.forEach((c, s) => {
        const r = rng(s + 3); let v = .5; ctx.strokeStyle = c; ctx.lineWidth = 1.3; ctx.globalAlpha = .85; ctx.beginPath();
        const n = 90;
        for (let i = 0; i < n * T; i++) {
          v += (r() - .5) * .06 + (i > 25 && i < 32 ? -.05 : 0) + (i >= 32 && i < 40 ? .03 : 0) + (s === 3 ? .002 : 0);
          const x = 10 + i / n * (W - 20), y = H * .9 - clamp(v, 0, 1) * H * .75;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,107,139,.4)'; ctx.setLineDash([3, 3]);
      const ex = 10 + 26 / 90 * (W - 20); ctx.beginPath(); ctx.moveTo(ex, 20); ctx.lineTo(ex, H - 10); ctx.stroke(); ctx.setLineDash([]);
    },
    attrition(ctx, W, H, t) {
      ctx.strokeStyle = CY; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= W; x += 3) { const y = H - 20 - (H - 50) / (1 + Math.exp(-(x - W / 2) / 22)); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      const r = rng(9);
      for (let i = 0; i < 40; i++) {
        const x = r() * W, cls = r() < 1 / (1 + Math.exp(-(x - W / 2) / 22)) ? 1 : 0;
        const ph = (t * .5 + r()) % 1, y = cls ? 26 + ph * 10 : H - 26 - ph * 10;
        ctx.fillStyle = cls ? RO : G; ctx.globalAlpha = .4 + .5 * (1 - ph); ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    ghigliottina(ctx, W, H, t) {
      const words = ['honey', 'light', 'stone', 'cake', 'shine'], cx = W / 2, cy = H / 2;
      const k = Math.floor(t * .8) % 7;
      ctx.font = '11px JetBrains Mono, monospace'; ctx.textAlign = 'center';
      words.forEach((w, i) => {
        const a = -Math.PI / 2 + i * 2 * Math.PI / 5, x = cx + Math.cos(a) * W * .32, y = cy + Math.sin(a) * H * .34;
        const on = i < k;
        ctx.strokeStyle = on ? 'rgba(124,255,178,.55)' : DIM; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = on ? '#e7ebf2' : '#3d4657'; ctx.fillText(w, x, y + 4);
      });
      ctx.fillStyle = k >= 6 ? G : AM; ctx.font = 'bold 14px JetBrains Mono, monospace';
      ctx.fillText(k >= 6 ? 'MOON' : '?', cx, cy + 5);
      ctx.textAlign = 'left';
    },
    privacy(ctx, W, H, t) {
      const s = 8, nx = Math.ceil(W / s), ny = Math.ceil(H / s), eps = .5 + .5 * Math.sin(t * .8);
      const r = rng(Math.floor(t * 12));
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = i * s, y = j * s, dx = (x - W / 2) / (H * .32), dy = (y - H / 2) / (H * .38);
        let v = dx * dx + dy * dy < 1 ? .55 : .08;
        if (Math.hypot(dx + .35, dy + .25) < .14 || Math.hypot(dx - .35, dy + .25) < .14) v = .05;
        if (Math.abs(dy - .38) < .06 && Math.abs(dx) < .4) v = .1;
        v = clamp(v + (r() - .5) * (1 - eps) * 1.4, 0, 1);
        ctx.fillStyle = `rgba(94,230,255,${v.toFixed(2)})`; ctx.fillRect(x, y, s - 1, s - 1);
      }
      ctx.fillStyle = '#06080c'; ctx.fillRect(W - 76, H - 24, 68, 16); ctx.fillStyle = AM; ctx.font = '10px JetBrains Mono, monospace'; ctx.fillText('ε = ' + (eps * 4).toFixed(2), W - 70, H - 12);
    },
    claims(ctx, W, H, t, A) { const rows = 5, y0 = H * .2; ctx.strokeStyle = DIM; ctx.strokeRect(W * .12, H * .12, W * .76, H * .76);
      for (let i = 0; i < rows; i++) { const y = y0 + i * H * .13; ctx.fillStyle = 'rgba(200,210,225,.25)'; ctx.fillRect(W * .18, y, W * .36, 5); ctx.fillRect(W * .58, y, W * .08, 5);
        const on = (t * .8) % (rows + 2) > i; if (on) { ctx.fillStyle = i === 1 || i === 3 ? RO : A; ctx.font = '700 10px JetBrains Mono, monospace'; ctx.fillText(i === 1 || i === 3 ? 'DENY' : 'PAY', W * .72, y + 6); } } },
    pdfintel(ctx, W, H, t, A) { const x0 = W * .3, w = W * .4; ctx.fillStyle = '#e9e4d8'; ctx.globalAlpha = .9; ctx.fillRect(x0, H * .1, w, H * .8); ctx.globalAlpha = 1;
      const k = Math.floor(t * 3) % 12; for (let i = 0; i < 12; i++) { const y = H * .16 + i * H * .055, ww = w * (i % 4 === 0 ? .5 : .82); ctx.fillStyle = i === k ? A : 'rgba(40,40,40,.35)'; ctx.fillRect(x0 + w * .08, y, ww, i % 4 === 0 ? 5 : 3); } },
    research(ctx, W, H, t, A) { const r = rng(5), C = [[.3, .35], [.7, .3], [.5, .72], [.22, .75], [.78, .7]], cols = [A, CY, VI, AM, RO];
      for (let i = 0; i < 90; i++) { const c = i % 5, a = r() * 6.28, d = r() * .1 + .02, k = .5 + .5 * Math.sin(t * .6); const x = lerp(r(), C[c][0] + Math.cos(a) * d, k), y = lerp(r(), C[c][1] + Math.sin(a) * d, k); ctx.fillStyle = cols[c]; ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(x * W, y * H, 2.2, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; },
    titanic(ctx, W, H, t, A) { for (let k = 0; k < 4; k++) { ctx.strokeStyle = `rgba(143,184,222,${.15 + k * .08})`; ctx.beginPath(); for (let x = 0; x <= W; x += 6) { const y = H * .72 + k * 9 + Math.sin(x * .03 + t * 1.5 + k) * 3; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      const sx = W * .5 + Math.sin(t * .4) * W * .1, sy = H * .62; ctx.fillStyle = A; ctx.beginPath(); ctx.moveTo(sx - 70, sy); ctx.lineTo(sx + 70, sy); ctx.lineTo(sx + 58, sy + 16); ctx.lineTo(sx - 62, sy + 16); ctx.closePath(); ctx.fill();
      ctx.fillRect(sx - 40, sy - 12, 70, 12); for (let i = 0; i < 4; i++) ctx.fillRect(sx - 34 + i * 17, sy - 30, 9, 18); },
    housing(ctx, W, H, t, A) { const cx = W * .38, by = H * .78; ctx.strokeStyle = A; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 50, by); ctx.lineTo(cx - 50, by - 50); ctx.lineTo(cx, by - 90); ctx.lineTo(cx + 50, by - 50); ctx.lineTo(cx + 50, by); ctx.closePath(); ctx.stroke(); ctx.strokeRect(cx - 12, by - 34, 24, 34);
      const v = 120 + 60 * Math.sin(t * .8); ctx.lineWidth = 1; ctx.fillStyle = '#cfd6e2'; ctx.font = '600 16px Inter, sans-serif'; ctx.fillText('$' + Math.round(v) + 'k', W * .6, H * .45); for (let i = 0; i < 6; i++) { ctx.fillStyle = i === 5 ? A : DIM; const h = 10 + ((i * 37 + Math.floor(t)) % 5) * 9; ctx.fillRect(W * .6 + i * 14, by - h, 9, h); } },
    mobile(ctx, W, H, t, A) { const x = W * .3, y = H * .12, w = 64, h = H * .76; ctx.strokeStyle = A; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 12) : ctx.rect(x, y, w, h); ctx.stroke(); ctx.lineWidth = 1;
      ['RAM', 'battery', 'pixels', 'camera'].forEach((l, i) => { const v = .3 + .6 * (.5 + .5 * Math.sin(t * .9 + i * 1.3)); ctx.fillStyle = DIM; ctx.fillRect(W * .5, H * .25 + i * 22, W * .35, 6); ctx.fillStyle = i === 0 ? A : CY; ctx.fillRect(W * .5, H * .25 + i * 22, W * .35 * v, 6); ctx.fillStyle = 'rgba(200,210,225,.6)'; ctx.font = '10px JetBrains Mono, monospace'; ctx.fillText(l, W * .5, H * .25 + i * 22 - 3); }); },
    ipl(ctx, W, H, t, A) { const n = 20, bw = (W - 30) / n; for (let i = 0; i < n; i++) { const h = (20 + 40 * Math.abs(Math.sin(i * .7 + 1)) + (i > 15 ? 25 : 0)) * (H / 200) * Math.min(1, Math.max(0, (t * 6 - i) / 3)); ctx.fillStyle = i > 15 ? AM : A; ctx.globalAlpha = .85; ctx.fillRect(15 + i * bw, H - 20 - h, bw * .7, h); } ctx.globalAlpha = 1; if (t * 6 > 30) { } },
    covid(ctx, W, H, t, A) { const r = rng(9); for (let i = 0; i < 70; i++) { const x = r() * W, y = H * .2 + r() * H * .6, s = r(); const p = .5 + .5 * Math.sin(t * 1.5 + i); ctx.fillStyle = A; ctx.globalAlpha = .25 + .5 * p * s; ctx.beginPath(); ctx.arc(x, y, 1.5 + 4 * s * p, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; },
    suiciderates(ctx, W, H, t, A) { const pts = 30; ctx.strokeStyle = A; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < pts; i++) { const x = W * .1 + i / (pts - 1) * W * .8, y = H * (.35 + .25 * (i / pts) + .04 * Math.sin(i * .9)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.lineWidth = 1;
      const k = (t * .15) % 1, x = W * .1 + k * W * .8; ctx.fillStyle = A; ctx.beginPath(); ctx.arc(x, H * (.35 + .25 * k + .04 * Math.sin(k * pts * .9)), 3.5, 0, 7); ctx.fill(); },
    tweets(ctx, W, H, t, A) { const r = rng(3); for (let i = 0; i < 9; i++) { const ph = ((t * .25 + r()) % 1), x = W * (.1 + r() * .8), y = H * (1 - ph) ; const c = r() < .45 ? G : r() < .6 ? RO : '#8b96a8'; ctx.globalAlpha = Math.sin(ph * Math.PI) * .9; ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 26, y - 8, 52, 16, 8) : ctx.rect(x - 26, y - 8, 52, 16); ctx.fill(); } ctx.globalAlpha = 1; },
    tweetsearch(ctx, W, H, t, A) { ctx.strokeStyle = A; ctx.strokeRect(W * .12, H * .18, W * .76, 22); ctx.fillStyle = A; ctx.font = '11px JetBrains Mono, monospace'; ctx.fillText('#corona'.slice(0, 1 + Math.floor(t * 4) % 8), W * .15, H * .18 + 15);
      for (let i = 0; i < 5; i++) { const on = (t * 2) % 6 > i + 1; ctx.fillStyle = on ? 'rgba(200,210,225,.35)' : 'rgba(200,210,225,.08)'; ctx.fillRect(W * .12, H * .36 + i * 18, W * (.5 + (i % 3) * .1), 7); } if ((t * 2) % 6 > 5.5) { ctx.fillStyle = A; ctx.fillText('cache hit · 0.02 ms', W * .5, H * .9); } },
    chatbot(ctx, W, H, t, A) { const k = Math.floor(t * .8) % 5; for (let i = 0; i < Math.min(k + 1, 4); i++) { const me = i % 2 === 0, w = 70 + (i * 23) % 50, x = me ? W * .88 - w : W * .12, y = H * .18 + i * 30; ctx.fillStyle = me ? A : '#2a3546'; ctx.globalAlpha = .85; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, 20, 10) : ctx.rect(x, y, w, 20); ctx.fill(); } ctx.globalAlpha = 1; },
    checkers(ctx, W, H, t, A) { const s = Math.min(W, H) * .1, ox = W / 2 - 4 * s, oy = H / 2 - 4 * s; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { ctx.fillStyle = (r + c) % 2 ? '#5a4330' : '#cdb894'; ctx.globalAlpha = .7; ctx.fillRect(ox + c * s, oy + r * s, s, s); } ctx.globalAlpha = 1;
      const pc = (r, c, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ox + (c + .5) * s, oy + (r + .5) * s, s * .38, 0, 7); ctx.fill(); }; [[0, 1], [0, 3], [1, 2], [2, 5]].forEach(([r, c]) => pc(r, c, '#eee8dc')); [[6, 1], [7, 2], [6, 5]].forEach(([r, c]) => pc(r, c, '#d0453a'));
      const k = (t * .6) % 1, r0 = 5, c0 = 4; pc(lerp(r0, r0 - 1, Math.min(1, k * 2)), lerp(c0, c0 + 1, Math.min(1, k * 2)), A); },
    sudoku(ctx, W, H, t, A) { const s = Math.min(W, H) * .085, ox = W / 2 - 4.5 * s, oy = H / 2 - 4.5 * s, r = rng(4); ctx.strokeStyle = DIM; for (let i = 0; i <= 9; i++) { ctx.lineWidth = i % 3 ? 1 : 2; ctx.beginPath(); ctx.moveTo(ox + i * s, oy); ctx.lineTo(ox + i * s, oy + 9 * s); ctx.moveTo(ox, oy + i * s); ctx.lineTo(ox + 9 * s, oy + i * s); ctx.stroke(); } ctx.lineWidth = 1;
      const n = Math.floor(t * 8) % 95; ctx.font = `${s * .6}px JetBrains Mono, monospace`; ctx.textAlign = 'center'; for (let i = 0; i < 81; i++) { const given = r() < .35, d = 1 + Math.floor(r() * 9); if (given || i < n) { ctx.fillStyle = given ? '#e5e7eb' : A; ctx.fillText(d, ox + (i % 9 + .5) * s, oy + (Math.floor(i / 9) + .7) * s); } } ctx.textAlign = 'left'; },
  };

  window.miniViz = function (slug, canvas) {
    const C = fitCanvas(canvas);
    const f = minis[slug] || minis.recommender, A = getComputedStyle(canvas).getPropertyValue('--accent').trim() || G;
    loopWhileVisible(canvas, (dt, t) => { const ctx = C.ctx; ctx.save(); ctx.clearRect(0, 0, C.w, C.h); f(ctx, C.w, C.h, t, A); ctx.restore(); });
  };
})();
