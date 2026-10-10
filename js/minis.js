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
  };

  window.miniViz = function (slug, canvas) {
    const C = fitCanvas(canvas);
    const f = minis[slug] || minis.recommender;
    loopWhileVisible(canvas, (dt, t) => { const ctx = C.ctx; ctx.save(); ctx.clearRect(0, 0, C.w, C.h); f(ctx, C.w, C.h, t); ctx.restore(); });
  };
})();
