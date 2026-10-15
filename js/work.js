/* Work — a first-person walk down one New York block, drawn in WebGL.
   Scroll walks you forward. The walk pauses at each place I've worked; a deliberate scroll walks on past.
   Move the mouse (or drag sideways) to look around. The afternoon turns into night by the last door. */
(function () {
  'use strict';
  const RM = !!window.reducedMotion;
  const cv = document.getElementById('street'), fade = document.getElementById('streetFade');
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const sh = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const css = c => `rgb(${c.map(v => clamp(v * 255, 0, 255) | 0).join(',')})`;
  function RNG(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  const gl = cv.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' });
  if (!gl) { document.body.classList.add('no-gl'); }

  /* =========================================================
     THE BLOCK
     ========================================================= */
  const F = 10, CURB = 5.5, SWH = .15, CAMX = .35, EYE = 1.64;
  const CROSS = [[72, 84, 'Bayes St'], [142, 154, 'Gradient Ave']];
  const ZMAX = 164;
  const STYLE = [
    { side: 1, door: 24, s0: 12, s1: 36, accent: '#2f9e6e' },
    { side: -1, door: 52, s0: 38, s1: 66, accent: '#3cc3c9' },
    { side: 1, door: 95, s0: 84, s1: 106, accent: '#cc0033' },
    { side: -1, door: 129.7, s0: 116, s1: 142, accent: '#e9c46a' },
    { side: 1, door: 167, s0: 154, s1: 180, accent: '#2a7de1' },
  ];
  /* five buildings; the university building holds the research and education entries */
  const EXP = SITE.experience, byKey = k => EXP.find(e => e.key === k);
  const GROUPS = [
    { keys: ['kaiser'], pin: 'Kaiser' },
    { keys: ['siemens'], pin: 'Siemens' },
    { keys: ['njms', 'rutgers-ra', 'rutgers-ms', 'srm'], pin: 'Rutgers', org: 'Rutgers University', role: 'Research · M.S. · and where it started', dates: '2018 – 2025', plaque: 'Rutgers University' },
    { keys: ['targum'], pin: 'Targum' },
    { keys: ['virtua'], pin: 'Virtua' },
  ];
  const ORGS = GROUPS.map((g, i) => { const e = g.keys.map(byKey), f = e[0]; return { org: g.org || f.org, role: g.role || f.role, dates: g.dates || f.dates, plaqueText: g.plaque || f.org, logo: f.logo, mono: f.mono, entries: e, pin: g.pin, ...STYLE[i], accent: f.accent || STYLE[i].accent, idx: i }; });
  const STOPS = ORGS.map(o => ({ s: o.door - 17, org: o, passed: false }));

  /* ---------- textures: tileable materials (512²) and painted signs (1024×256) ---------- */
  const SMALL = Math.min(screen.width, screen.height) < 700 || (navigator.deviceMemory || 8) <= 4;
  const TS = SMALL ? 256 : 512, SW = SMALL ? 512 : 1024, SH = SMALL ? 128 : 256, tiles = [], signs = [];
  function tile(draw) { const c = document.createElement('canvas'); c.width = c.height = 512; draw(c.getContext('2d'), 512); if (TS !== 512) { const d = document.createElement('canvas'); d.width = d.height = TS; d.getContext('2d').drawImage(c, 0, 0, TS, TS); tiles.push(d); } else tiles.push(c); return tiles.length - 1; }
  function grain(x, W, H, amt, seed) { const im = x.getImageData(0, 0, W, H), d = im.data, r = RNG(seed); for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; } x.putImageData(im, 0, 0); }
  function blotches(x, S, n, col, rmin, rmax, a, seed) { const r = RNG(seed); for (let i = 0; i < n; i++) { const X = r() * S, Y = r() * S, R = rmin + r() * (rmax - rmin), g = x.createRadialGradient(X, Y, 0, X, Y, R); g.addColorStop(0, `rgba(${col},${a * (.4 + r() * .6)})`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.save(); x.translate(ox, oy); x.fillRect(X - R, Y - R, 2 * R, 2 * R); x.restore(); } } }
  const brick = (base, mortar, seed) => tile((x, S) => {
    const r = RNG(seed); x.fillStyle = mortar; x.fillRect(0, 0, S, S); const rows = 20, rh = S / rows, bw = S / 8, b = hex(base);
    for (let j = 0; j < rows; j++) { const off = (j % 2) * bw / 2; for (let i = -1; i < 9; i++) { const k = .84 + r() * .3, w = r() * .08; x.fillStyle = css([b[0] * k + w, b[1] * k, b[2] * k]); x.fillRect(i * bw + off + 1.6, j * rh + 1.6, bw - 3.2, rh - 3.2); } }
    blotches(x, S, 10, '20,16,14', 40, 140, .12, seed + 3); grain(x, S, S, 26, seed + 1); });
  const stone = (base, joint, bw, bh, seed, amt = 14) => tile((x, S) => {
    x.fillStyle = base; x.fillRect(0, 0, S, S); blotches(x, S, 18, '90,80,60', 30, 120, .08, seed); blotches(x, S, 8, '255,250,235', 40, 120, .08, seed + 9);
    x.strokeStyle = joint; x.lineWidth = 2; const cw = S / bw, ch = S / bh;
    for (let j = 0; j <= bh; j++) { x.beginPath(); x.moveTo(0, j * ch); x.lineTo(S, j * ch); x.stroke(); for (let i = 0; i <= bw; i++) { const xx = i * cw + (j % 2) * cw / 2; x.beginPath(); x.moveTo(xx, j * ch); x.lineTo(xx, (j + 1) * ch); x.stroke(); } }
    grain(x, S, S, amt, seed + 1); });
  const T = {
    brickRed: brick('#8e3f2f', '#9d948a', 11), brickTan: brick('#b08a63', '#a39a8c', 12), brickBrown: brick('#6c4434', '#8f877c', 13),
    brown: stone('#6b4c3c', 'rgba(40,24,18,.35)', 1, 4, 21, 10), lime: stone('#d6ccb7', 'rgba(110,98,80,.35)', 2, 4, 22), concrete: stone('#dcdad4', 'rgba(120,120,116,.25)', 2, 2, 23, 8),
    asphalt: tile((x, S) => { x.fillStyle = '#45474b'; x.fillRect(0, 0, S, S); blotches(x, S, 16, '20,20,22', 30, 110, .3, 31); blotches(x, S, 10, '120,120,118', 30, 90, .08, 32);
      const r = RNG(33); for (let i = 0; i < 2600; i++) { x.fillStyle = r() < .5 ? 'rgba(150,150,148,.35)' : 'rgba(18,18,20,.45)'; x.fillRect(r() * S, r() * S, 1.6, 1.6); }
      x.strokeStyle = 'rgba(20,20,22,.55)'; x.lineWidth = 1.4; for (let i = 0; i < 4; i++) { let X = r() * S, Y = r() * S; x.beginPath(); x.moveTo(X, Y); for (let k = 0; k < 9; k++) { X += (r() - .5) * 40; Y += (r() - .3) * 30; x.lineTo(X, Y); } x.stroke(); }
      grain(x, S, S, 30, 34); }),
    sidewalk: tile((x, S) => { x.fillStyle = '#a7a39b'; x.fillRect(0, 0, S, S); blotches(x, S, 14, '70,66,60', 20, 90, .14, 41); blotches(x, S, 8, '235,230,220', 30, 90, .1, 42);
      const r = RNG(43); for (let i = 0; i < 26; i++) { x.fillStyle = 'rgba(40,38,36,.5)'; x.beginPath(); x.arc(r() * S, r() * S, 1.5 + r() * 2.5, 0, 7); x.fill(); }
      x.strokeStyle = 'rgba(70,66,60,.75)'; x.lineWidth = 3; for (const p of [0, S / 2]) { x.beginPath(); x.moveTo(p, 0); x.lineTo(p, S); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(S, p); x.stroke(); }
      grain(x, S, S, 20, 44); }),
    granite: tile((x, S) => { x.fillStyle = '#9a978f'; x.fillRect(0, 0, S, S); const r = RNG(51); for (let i = 0; i < 9000; i++) { x.fillStyle = r() < .5 ? 'rgba(40,40,40,.4)' : 'rgba(230,228,220,.4)'; x.fillRect(r() * S, r() * S, 2, 2); } }),
    bark: tile((x, S) => { x.fillStyle = '#5a4a3c'; x.fillRect(0, 0, S, S); const r = RNG(61); for (let i = 0; i < 220; i++) { x.strokeStyle = r() < .5 ? 'rgba(30,22,16,.6)' : 'rgba(140,124,104,.35)'; x.lineWidth = 2 + r() * 4; const X = r() * S; x.beginPath(); x.moveTo(X, r() * S); x.lineTo(X + (r() - .5) * 20, r() * S); x.stroke(); } grain(x, S, S, 30, 62); }),
    leaf: tile((x, S) => { x.clearRect(0, 0, S, S); const r = RNG(71), G = ['#3f6b2c', '#4d7a33', '#5b8a3a', '#6a9440', '#35602a', '#7aa34c'];
      x.strokeStyle = 'rgba(70,52,36,.9)'; x.lineWidth = 3; for (let i = 0; i < 7; i++) { const a = r() * 6.28; x.beginPath(); x.moveTo(S / 2, S / 2); x.lineTo(S / 2 + Math.cos(a) * S * .38, S / 2 + Math.sin(a) * S * .38); x.stroke(); }
      for (let i = 0; i < 900; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * S * .46, X = S / 2 + Math.cos(a) * d, Y = S / 2 + Math.sin(a) * d * .92, L = 9 + r() * 9; x.save(); x.translate(X, Y); x.rotate(r() * 6.28); const c = hex(G[(r() * G.length) | 0]), k = .8 + r() * .35 + (1 - d / (S * .46)) * -.1; x.fillStyle = css([c[0] * k, c[1] * k, c[2] * k]); x.beginPath(); x.ellipse(0, 0, L, L * .5, 0, 0, 7); x.fill(); x.restore(); } }),
  };

  /* signs: painted at the sign's real aspect ratio, then squeezed into a 1024×256 layer */
  function sign(aspect, draw) { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d'), lw = 256 * aspect; x.save(); x.scale(1024 / lw, 1); draw(x, lw, 256); x.restore(); if (SW !== 1024) { const d = document.createElement('canvas'); d.width = SW; d.height = SH; d.getContext('2d').drawImage(c, 0, 0, SW, SH); signs.push(d); } else signs.push(c); return 100 + signs.length - 1; }
  function fit(x, text, font, maxW, size) { let s = size; x.font = font.replace('#', s); while (x.measureText(text).width > maxW && s > 8) { s -= 2; x.font = font.replace('#', s); } return s; }
  function txt(x, text, font, size, col, X, Y, maxW, ls = 0) { if ('letterSpacing' in x) x.letterSpacing = ls + 'px'; fit(x, text, font, maxW, size); x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, X, Y); if ('letterSpacing' in x) x.letterSpacing = '0px'; }
  let S = {};
  function makeSigns() {
    S.kaiser = sign(12, (x, W, H) => { x.fillStyle = '#f2f0ea'; x.fillRect(0, 0, W, H); txt(x, 'KAISER PHARMACEUTICALS', '700 #px Inter, sans-serif', 150, '#1d7a50', W / 2, H * .54, W * .94, 18); });
    S.siemens = sign(4.5, (x, W, H) => { x.fillStyle = '#0b161b'; x.fillRect(0, 0, W, H); x.shadowColor = '#5ff0f4'; x.shadowBlur = 18; txt(x, 'SIEMENS', '800 #px Inter, sans-serif', 190, '#41d0d4', W / 2, H * .55, W * .9, 10); });
    S.rutgers = sign(9, (x, W, H) => { x.fillStyle = '#e4d9c6'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(110,90,70,.5)'; x.lineWidth = 6; x.strokeRect(14, 14, W - 28, H - 28); txt(x, 'RUTGERS', '700 #px Cinzel, Georgia, serif', 160, '#7a1a1a', W / 2, H * .55, W * .8, 70); });
    S.targum = sign(6, (x, W, H) => { x.fillStyle = '#17130d'; x.fillRect(0, 0, W, H); x.strokeStyle = '#b89a5a'; x.lineWidth = 5; x.strokeRect(10, 10, W - 20, H - 20); txt(x, 'The Daily Targum', '400 #px UnifrakturMaguntia, "Old English Text MT", Georgia, serif', 190, '#f4ead2', W / 2, H * .56, W * .9); });
    S.ticker = sign(16, (x, W, H) => { x.fillStyle = '#0c0805'; x.fillRect(0, 0, W, H); const m = 'BLACK HOLES: STILL UP AT 2 A.M.   •   KNIGHT TO F6, SIX MOVES AHEAD   •   ';
      x.font = '700 120px JetBrains Mono, monospace'; const w = x.measureText(m).width, k = W / w; x.save(); x.scale(k, 1); x.fillStyle = '#ffb547'; x.shadowColor = '#ff9a1f'; x.shadowBlur = 14; x.textBaseline = 'middle'; x.fillText(m, 0, H * .54); x.restore();
      x.fillStyle = 'rgba(12,8,5,.55)'; for (let i = 0; i < H; i += 8) x.fillRect(0, i, W, 3); });
    S.virtua = sign(7, (x, W, H) => { x.fillStyle = '#f7f9fb'; x.fillRect(0, 0, W, H); x.fillStyle = '#2a7de1'; const cx = H * .62, cy = H / 2, a = H * .13, b = H * .36; x.fillRect(cx - a, cy - b, a * 2, b * 2); x.fillRect(cx - b, cy - a, b * 2, a * 2); txt(x, 'VIRTUA HEALTH', '700 #px Inter, sans-serif', 140, '#173a63', W / 2 + H * .45, H * .55, W - H * 1.6, 14); });
    S.newsroom = sign(10, (x, W, H) => { x.fillStyle = '#15120d'; x.fillRect(0, 0, W, H); txt(x, 'NEWSROOM  ·  EST. 1869', '600 #px JetBrains Mono, monospace', 120, '#e9c46a', W / 2, H * .55, W * .86, 8); });
    S.marquee = sign(6.5, (x, W, H) => { x.fillStyle = '#1a0709'; x.fillRect(0, 0, W, H); x.fillStyle = '#f6e7c0'; for (let i = 18; i < W; i += 30) for (const y of [16, H - 16]) { x.beginPath(); x.arc(i, y, 7, 0, 7); x.fill(); }
      txt(x, 'NOW SHOWING', '600 #px Cinzel, Georgia, serif', 46, '#e9c46a', W / 2, H * .3, W * .6, 12); txt(x, 'WHO I AM', '700 #px Cinzel, Georgia, serif', 112, '#fff4dc', W / 2, H * .64, W * .8, 26); });
    S.reel = sign(5, (x, W, H) => { x.fillStyle = '#2a0b0d'; x.fillRect(0, 0, W, H); x.strokeStyle = '#d4a24a'; x.lineWidth = 10; x.strokeRect(10, 10, W - 20, H - 20);
      ['R', 'E', 'E', 'L'].forEach((ch, i) => { x.save(); x.translate(W * (.16 + i * .227), H / 2); x.rotate(-Math.PI / 2); x.font = '700 150px Cinzel, Georgia, serif'; x.fillStyle = '#ffeec8'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 0, 8); x.restore(); });
      x.fillStyle = '#ffe9b0'; for (let i = 28; i < W - 20; i += 34) for (const y of [26, H - 26]) { x.beginPath(); x.arc(i, y, 6, 0, 7); x.fill(); } });
    S.comics = sign(5, (x, W, H) => { x.fillStyle = '#f5c518'; x.fillRect(0, 0, W, H); x.lineJoin = 'round'; fit(x, 'COMICS', '400 #px Bangers, Impact, sans-serif', W * .7, 200); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 14; x.strokeStyle = '#141414'; x.strokeText('COMICS', W / 2, H * .55); x.fillStyle = '#d8262c'; x.fillText('COMICS', W / 2, H * .55); });
    S.burst = sign(1.3, (x, W, H) => { x.fillStyle = '#d62f2f'; x.fillRect(0, 0, W, H); x.fillStyle = '#f5c518'; x.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = (i % 2 ? .3 : .48) * H; x.lineTo(W / 2 + Math.cos(a) * r * 1.25, H / 2 + Math.sin(a) * r); } x.fill(); txt(x, 'POW!', '400 #px Bangers, Impact, sans-serif', 90, '#141414', W / 2, H * .53, W * .6); });
    S.posters = sign(4, (x, W, H) => { x.fillStyle = '#1b1a24'; x.fillRect(0, 0, W, H); const C = [['#e23b3b', '#f5c518', 'VOLT'], ['#2f6fe0', '#fff', 'NOVA'], ['#f5c518', '#d8262c', 'TITAN'], ['#29a35a', '#fff', 'ECHO'], ['#7b3fe4', '#f5c518', 'ORBIT']];
      C.forEach(([bg, fg, t], i) => { const px = 30 + i * (W - 60) / 5, pw = (W - 60) / 5 - 26, py = 26, ph = H - 52; x.fillStyle = bg; x.fillRect(px, py, pw, ph);
        x.save(); x.beginPath(); x.rect(px, py, pw, ph); x.clip(); x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 4; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; x.beginPath(); x.moveTo(px + pw / 2, py + ph * .6); x.lineTo(px + pw / 2 + Math.cos(a) * 300, py + ph * .6 + Math.sin(a) * 300); x.stroke(); }
        x.fillStyle = 'rgba(10,10,14,.9)'; const cx = px + pw / 2, cy = py + ph * .62; x.beginPath(); x.ellipse(cx, cy - 46, 13, 15, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx - 34, cy - 26); x.lineTo(cx + 34, cy - 26); x.lineTo(cx + 18, cy + 18); x.lineTo(cx + 22, cy + 70); x.lineTo(cx - 22, cy + 70); x.lineTo(cx - 18, cy + 18); x.closePath(); x.fill(); x.restore();
        txt(x, t, '400 #px Bangers, Impact, sans-serif', 52, fg, px + pw / 2, py + 34, pw * .9); }); });
    S.guitars = sign(4, (x, W, H) => { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a2416'); g.addColorStop(1, '#1d120b'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      ['#c98a4b', '#a0522d', '#d9a066', '#6b2f1a', '#e3c08a', '#8a3b22'].forEach((c, i) => { const cx = 70 + i * (W - 140) / 5, cy = H * .66; x.strokeStyle = '#2a1a10'; x.lineWidth = 9; x.beginPath(); x.moveTo(cx, cy - 30); x.lineTo(cx, 26); x.stroke(); x.fillStyle = c; x.beginPath(); x.ellipse(cx, cy + 22, 38, 44, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(cx, cy - 26, 29, 32, 0, 0, 7); x.fill(); x.fillStyle = '#140c07'; x.beginPath(); x.arc(cx, cy - 2, 11, 0, 7); x.fill(); });
      x.fillStyle = '#f2ece0'; x.fillRect(0, H - 34, W, 34); x.fillStyle = '#111'; for (let i = 0; i < W; i += 22) if ([1, 2, 4, 5, 6].includes((i / 22 | 0) % 7)) x.fillRect(i + 14, H - 34, 12, 20); });
    S.music = sign(6, (x, W, H) => { x.fillStyle = '#1a110b'; x.fillRect(0, 0, W, H); txt(x, '♫  STRINGS & KEYS', '600 #px Cinzel, Georgia, serif', 120, '#e8b77a', W / 2, H * .55, W * .86, 10); });
    S.bayes = sign(4.5, (x, W, H) => { x.fillStyle = '#1f6f43'; x.fillRect(0, 0, W, H); x.strokeStyle = '#fff'; x.lineWidth = 8; x.strokeRect(12, 12, W - 24, H - 24); txt(x, 'Bayes St', '600 #px Inter, sans-serif', 150, '#fff', W / 2, H * .55, W * .84); });
    S.gradient = sign(4.5, (x, W, H) => { x.fillStyle = '#1f6f43'; x.fillRect(0, 0, W, H); x.strokeStyle = '#fff'; x.lineWidth = 8; x.strokeRect(12, 12, W - 24, H - 24); txt(x, 'Gradient Ave', '600 #px Inter, sans-serif', 150, '#fff', W / 2, H * .55, W * .84); });
    S.ghost = sign(2.6, (x, W, H) => { x.fillStyle = '#7e3a2c'; x.fillRect(0, 0, W, H); x.globalAlpha = .55; txt(x, 'KNIGHT & ROOK', '700 #px Georgia, serif', 86, '#e8dcc0', W / 2, H * .36, W * .86, 6); txt(x, 'CHESS SETS · CLOCKS · 2ND FL.', '600 #px Georgia, serif', 40, '#e8dcc0', W / 2, H * .7, W * .86, 3); x.globalAlpha = 1; });
    S.banner = sign(.42, (x, W, H) => { x.fillStyle = '#b3002d'; x.fillRect(0, 0, W, H); txt(x, 'R', '700 #px Cinzel, Georgia, serif', 70, '#fff', W / 2, H * .45, W * .9); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, H - 22, W, 22); });
    const now = new Date();
    S.clock = sign(1, (x, W, H) => { x.fillStyle = '#2b2620'; x.fillRect(0, 0, W, H); x.fillStyle = '#f3ead6'; x.beginPath(); x.arc(W / 2, H / 2, H * .44, 0, 7); x.fill(); x.strokeStyle = '#2b2620'; x.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.lineWidth = 6; x.beginPath(); x.moveTo(W / 2 + Math.sin(a) * H * .36, H / 2 - Math.cos(a) * H * .36); x.lineTo(W / 2 + Math.sin(a) * H * .41, H / 2 - Math.cos(a) * H * .41); x.stroke(); }
      const hA = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2, mA = now.getMinutes() / 60 * Math.PI * 2;
      x.lineWidth = 12; x.beginPath(); x.moveTo(W / 2, H / 2); x.lineTo(W / 2 + Math.sin(hA) * H * .22, H / 2 - Math.cos(hA) * H * .22); x.stroke(); x.lineWidth = 7; x.beginPath(); x.moveTo(W / 2, H / 2); x.lineTo(W / 2 + Math.sin(mA) * H * .34, H / 2 - Math.cos(mA) * H * .34); x.stroke(); });
    ORGS.forEach(o => { o.plaque = sign(1.6, (x, W, H) => { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#c9a35a'); g.addColorStop(.5, '#f0d48e'); g.addColorStop(1, '#9c7a3a'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.strokeStyle = '#6e5222'; x.lineWidth = 6; x.strokeRect(12, 12, W - 24, H - 24);
      const parts = o.plaqueText.split(' '), a = parts.slice(0, Math.ceil(parts.length / 2)).join(' '), b = parts.slice(Math.ceil(parts.length / 2)).join(' '); txt(x, a, '700 #px Georgia, serif', 54, '#3d2c10', W / 2, H * .38, W * .84); txt(x, b, '700 #px Georgia, serif', 54, '#3d2c10', W / 2, H * .64, W * .84); }); });
  }

  /* =========================================================
     GEOMETRY
     vertex: position(3) normal(3) uv(2) colour(3) material(4) = [layer, reflectivity, emission, mode]
     mode: 0 lights up at night · 1 lit sign · 1.2/1.4 alternating signal · >2 scrolls (ticker) · <0 sways in the wind
     ========================================================= */
  class Geo {
    constructor() { this.v = []; this.i = []; this.T = null; }
    at(tx, ty, tz, ry = 0) { this.T = { tx, ty, tz, c: Math.cos(ry), s: Math.sin(ry) }; return this; }
    reset() { this.T = null; return this; }
    vert(p, n, uv, c, m) {
      let x = p[0], y = p[1], z = p[2], nx = n[0], ny = n[1], nz = n[2]; const T = this.T;
      if (T) { const X = x * T.c + z * T.s, Z = -x * T.s + z * T.c; x = X + T.tx; z = Z + T.tz; y += T.ty; const NX = nx * T.c + nz * T.s, NZ = -nx * T.s + nz * T.c; nx = NX; nz = NZ; }
      this.v.push(x, y, z, nx, ny, nz, uv[0], uv[1], c[0], c[1], c[2], m[0], m[1], m[2], m[3]); return this.v.length / 15 - 1;
    }
    tri(a, b, c, col, mat, n, uvs = [[0, 0], [1, 0], [1, 1]]) { n = n || norm(cross(sub(b, a), sub(c, a))); const cs = Array.isArray(col[0]) ? col : [col, col, col]; const i0 = this.vert(a, n, uvs[0], cs[0], mat), i1 = this.vert(b, n, uvs[1], cs[1], mat), i2 = this.vert(c, n, uvs[2], cs[2], mat); this.i.push(i0, i1, i2); }
    quad(a, b, c, d, col, mat, uvs = [[0, 0], [1, 0], [1, 1], [0, 1]], n) {
      n = n || norm(cross(sub(b, a), sub(d, a))); const cs = Array.isArray(col[0]) ? col : [col, col, col, col];
      const i0 = this.vert(a, n, uvs[0], cs[0], mat), i1 = this.vert(b, n, uvs[1], cs[1], mat), i2 = this.vert(c, n, uvs[2], cs[2], mat), i3 = this.vert(d, n, uvs[3], cs[3], mat);
      this.i.push(i0, i1, i2, i0, i2, i3);
    }
    box(x0, y0, z0, x1, y1, z1, col, mat, u = 2, skip = '') {
      const U = (a, b) => [a / u, -b / u];
      if (!skip.includes('+x')) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col, mat, [U(z1, y0), U(z0, y0), U(z0, y1), U(z1, y1)], [1, 0, 0]);
      if (!skip.includes('-x')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col, mat, [U(z0, y0), U(z1, y0), U(z1, y1), U(z0, y1)], [-1, 0, 0]);
      if (!skip.includes('+y')) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], col, mat, [U(x0, z1), U(x1, z1), U(x1, z0), U(x0, z0)], [0, 1, 0]);
      if (!skip.includes('-y')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col, mat, [U(x0, z0), U(x1, z0), U(x1, z1), U(x0, z1)], [0, -1, 0]);
      if (!skip.includes('+z')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, mat, [U(x0, y0), U(x1, y0), U(x1, y1), U(x0, y1)], [0, 0, 1]);
      if (!skip.includes('-z')) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col, mat, [U(x1, y0), U(x0, y0), U(x0, y1), U(x1, y1)], [0, 0, -1]);
    }
    // a tapered tube between two points
    tube(p0, p1, r0, r1, seg, col, mat, caps = false, uvS = 0) {
      const ax = norm(sub(p1, p0)), up = Math.abs(ax[1]) > .9 ? [1, 0, 0] : [0, 1, 0], u = norm(cross(ax, up)), w = cross(u, ax), L = len(sub(p1, p0));
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, d0 = add(sc(u, Math.cos(a0)), sc(w, Math.sin(a0))), d1 = add(sc(u, Math.cos(a1)), sc(w, Math.sin(a1)));
        const uv = uvS ? [[i / seg, 0], [(i + 1) / seg, 0], [(i + 1) / seg, L / uvS], [i / seg, L / uvS]] : undefined;
        const i0 = this.vert(add(p0, sc(d0, r0)), d0, uv ? uv[0] : [0, 0], col, mat), i1 = this.vert(add(p0, sc(d1, r0)), d1, uv ? uv[1] : [0, 0], col, mat), i2 = this.vert(add(p1, sc(d1, r1)), d1, uv ? uv[2] : [0, 0], col, mat), i3 = this.vert(add(p1, sc(d0, r1)), d0, uv ? uv[3] : [0, 0], col, mat);
        this.i.push(i0, i1, i2, i0, i2, i3);
        if (caps) { this.tri(p1, add(p1, sc(d0, r1)), add(p1, sc(d1, r1)), col, mat, ax); this.tri(p0, add(p0, sc(d1, r0)), add(p0, sc(d0, r0)), col, mat, sc(ax, -1)); }
      }
    }
    // an ellipsoid, optionally lumpy
    blob(c, rx, ry, rz, su, sv, col, mat, jit = 0, seed = 1, nrmC = null) {
      const r = RNG(seed), rows = [];
      for (let j = 0; j <= sv; j++) { const row = []; const ph = j / sv * Math.PI; for (let i = 0; i <= su; i++) { const th = i / su * Math.PI * 2; let d = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]; const k = 1 + (j > 0 && j < sv && i < su ? (r() - .5) * jit : 0); row.push([c[0] + d[0] * rx * k, c[1] + d[1] * ry * k, c[2] + d[2] * rz * k, d]); } if (jit) row[su] = row[0]; rows.push(row); }
      for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) {
        const P = [rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]];
        const idx = P.map(p => { let n = p[3]; if (nrmC) n = norm(add(sc(norm(sub(p, nrmC)), .65), sc(n, .35))); return this.vert([p[0], p[1], p[2]], n, [0, 0], col, mat); });
        this.i.push(idx[0], idx[1], idx[2], idx[0], idx[2], idx[3]);
      }
    }
    // a flat polygon (z,y profile) extruded across x, with an optional width taper by height
    extrudeX(prof, hw, col, mat, edgeMat) {
      const tris = earcut(prof), W = (y) => typeof hw === 'function' ? hw(y) : hw;
      for (const s of [-1, 1]) for (let k = 0; k < tris.length; k += 3) { const P = [tris[k], tris[k + 1], tris[k + 2]].map(i => [s * W(prof[i][1]), prof[i][1], prof[i][0]]); this.tri(P[0], P[1], P[2], col, mat, [s, 0, 0]); }
      for (let i = 0; i < prof.length; i++) { const a = prof[i], b = prof[(i + 1) % prof.length], m = edgeMat ? edgeMat(i) : null;
        const A0 = [-W(a[1]), a[1], a[0]], A1 = [W(a[1]), a[1], a[0]], B1 = [W(b[1]), b[1], b[0]], B0 = [-W(b[1]), b[1], b[0]];
        const n = norm([0, b[0] - a[0], -(b[1] - a[1])]); this.quad(A0, A1, B1, B0, m ? m[0] : col, m ? m[1] : mat, undefined, n); }
    }
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = a => Math.hypot(a[0], a[1], a[2]), norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  function earcut(P) { // ear clipping for a small simple polygon
    const idx = P.map((_, i) => i), out = []; let area = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; area += a[0] * b[1] - b[0] * a[1]; } const ccw = area > 0;
    const crossZ = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const inside = (p, a, b, c) => { const d1 = crossZ(a, b, p), d2 = crossZ(b, c, p), d3 = crossZ(c, a, p); return ccw ? d1 > 0 && d2 > 0 && d3 > 0 : d1 < 0 && d2 < 0 && d3 < 0; };
    let guard = 0; while (idx.length > 3 && guard++ < 500) { let cut = false; for (let k = 0; k < idx.length; k++) { const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length], cz = crossZ(P[i0], P[i1], P[i2]); if (ccw ? cz <= 0 : cz >= 0) continue; if (idx.some(j => j !== i0 && j !== i1 && j !== i2 && inside(P[j], P[i0], P[i1], P[i2]))) continue; out.push(i0, i1, i2); idx.splice(k, 1); cut = true; break; } if (!cut) break; }
    if (idx.length === 3) out.push(...idx); return out;
  }

  const M = (layer = -1, refl = 0, e = 0, w = 0) => [layer, refl, e, w];
  const M0 = M();
  /* facade space: s = distance along the walk, y = height, d = depth (+ into the building, − toward the street) */
  const fx = (side, d) => side * (F + d);
  function fQuad(g, side, sA, sB, yA, yB, d, col, mat, u = 2) { const x = fx(side, d), U = (s, y) => [s / u, -y / u]; g.quad([x, yA, -sA], [x, yA, -sB], [x, yB, -sB], [x, yB, -sA], col, mat, [U(sA, yA), U(sB, yA), U(sB, yB), U(sA, yB)], [-side, 0, 0]); }
  function fBox(g, side, sA, sB, yA, yB, dA, dB, col, mat, u = 2, skip = '') { const x0 = fx(side, dA), x1 = fx(side, dB); g.box(Math.min(x0, x1), yA, -sB, Math.max(x0, x1), yB, -sA, col, mat, u, skip); }
  const streetFace = side => side > 0 ? '-x' : '+x';
  // a sign on a facade-parallel plane, reading left to right from the street
  function fSign(g, side, sA, sB, yA, yB, d, layer, col = [1, 1, 1], e = 0, w = 1) {
    const x = fx(side, d), m = M(layer, 0, e, w), n = [-side, 0, 0];
    if (side < 0) g.quad([x, yB, -sA], [x, yB, -sB], [x, yA, -sB], [x, yA, -sA], col, m, [[0, 0], [1, 0], [1, 1], [0, 1]], n);
    else g.quad([x, yB, -sB], [x, yB, -sA], [x, yA, -sA], [x, yA, -sB], col, m, [[0, 0], [1, 0], [1, 1], [0, 1]], n);
  }
  // a sign square to the street (blade), facing the walker
  function blade(g, side, s, dA, dB, yA, yB, layer, e = .9, rot = false, frame = [.12, .1, .09]) {
    const xA = fx(side, dA), xB = fx(side, dB), x0 = Math.min(xA, xB), x1 = Math.max(xA, xB), z = -s, m = M(layer, 0, e, 1);
    const uv = rot ? [[1, 1], [1, 0], [0, 0], [0, 1]] : [[0, 1], [1, 1], [1, 0], [0, 0]];
    g.quad([x0, yA, z + .06], [x1, yA, z + .06], [x1, yB, z + .06], [x0, yB, z + .06], [1, 1, 1], m, uv, [0, 0, 1]);
    g.quad([x1, yA, z - .06], [x0, yA, z - .06], [x0, yB, z - .06], [x1, yB, z - .06], [1, 1, 1], m, uv, [0, 0, -1]);
    g.box(x0 - .03, yA - .03, z - .055, x1 + .03, yB + .03, z + .055, frame, M0);
    const xb = side > 0 ? x1 : x0; g.box(Math.min(xb, fx(side, 0)), yB - .25, z - .03, Math.max(xb, fx(side, 0)), yB - .18, z + .03, [.1, .1, .1], M0);
  }
  const WARM = [hex('#ffd59a'), hex('#ffc777'), hex('#ffe2b8'), hex('#f2e6d0'), hex('#d8e4ff')];
  function glassMat(r, lit) { return M(-1, .82, lit ? .55 + r() * .4 : 0, 0); }
  // a window punched into the wall: reveals, glass, sash bars, sill and lintel
  function windowHole(g, side, sA, sB, yA, yB, o, r) {
    const rd = o.rd, x0 = fx(side, 0), x1 = fx(side, rd), wc = o.wallCol, wm = o.wallMat, lit = r() < o.lit;
    g.quad([x0, yB, -sA], [x0, yB, -sB], [x1, yB, -sB], [x1, yB, -sA], sh(wc, .62), wm, undefined, [0, -1, 0]);
    g.quad([x0, yA, -sA], [x0, yA, -sB], [x1, yA, -sB], [x1, yA, -sA], sh(wc, .9), wm, undefined, [0, 1, 0]);
    g.quad([x0, yA, -sA], [x1, yA, -sA], [x1, yB, -sA], [x0, yB, -sA], sh(wc, .78), wm, undefined, [0, 0, -1]);
    g.quad([x0, yA, -sB], [x1, yA, -sB], [x1, yB, -sB], [x0, yB, -sB], sh(wc, .78), wm, undefined, [0, 0, 1]);
    const gc = lit ? WARM[(r() * WARM.length) | 0] : mixc(hex('#2a3440'), hex('#5b6b7c'), r() * .6);
    fQuad(g, side, sA, sB, yA, yB, rd, gc, glassMat(r, lit));
    if (o.blind && r() < .45) { const by = yB - (yB - yA) * (.15 + r() * .45); fQuad(g, side, sA, sB, by, yB, rd - .02, lit ? hex('#f3dcb0') : hex('#d9d2c2'), M(-1, 0, lit ? .35 : 0, 0)); }
    const fc = o.frame, fd0 = rd - .07, t = .045, sm = (sA + sB) / 2, ym = yA + (yB - yA) * (o.sash || .52);
    fBox(g, side, sA, sB, yB - t, yB, fd0, rd, fc, M0); fBox(g, side, sA, sB, yA, yA + t, fd0, rd, fc, M0);
    fBox(g, side, sA, sA + t, yA, yB, fd0, rd, fc, M0); fBox(g, side, sB - t, sB, yA, yB, fd0, rd, fc, M0);
    fBox(g, side, sA, sB, ym - t * .7, ym + t * .7, fd0 - .02, rd, fc, M0); if (sB - sA > 1.05) fBox(g, side, sm - t * .6, sm + t * .6, yA, yB, fd0, rd, fc, M0);
    if (o.sill) fBox(g, side, sA - .08, sB + .08, yA - .1, yA, -.09, .05, o.sill, M0);
    if (o.lintel) fBox(g, side, sA - .1, sB + .1, yB, yB + o.lintelH, -.035, .02, o.lintel, M0);
  }
  // a band of wall with a row of windows cut out of it
  function windowRow(g, side, s0, s1, fy0, fy1, wy0, wy1, wins, o, r) {
    fQuad(g, side, s0, s1, fy0, wy0, 0, o.wallCol, o.wallMat, o.u); fQuad(g, side, s0, s1, wy1, fy1, 0, o.wallCol, o.wallMat, o.u);
    let s = s0; for (const [a, b] of wins) { if (a > s) fQuad(g, side, s, a, wy0, wy1, 0, o.wallCol, o.wallMat, o.u); s = b; } if (s < s1) fQuad(g, side, s, s1, wy0, wy1, 0, o.wallCol, o.wallMat, o.u);
    for (const [a, b] of wins) windowHole(g, side, a, b, wy0, wy1, o, r);
  }
  const bays = (s0, s1, bay, w) => { const n = Math.max(1, Math.floor((s1 - s0) / bay)), st = (s0 + s1) / 2 - n * bay / 2, out = []; for (let i = 0; i < n; i++) { const c = st + (i + .5) * bay; out.push([c - w / 2, c + w / 2]); } return out; };

  function cornice(g, side, s0, s1, h, col, deep = .6) {
    fBox(g, side, s0 - .15, s1 + .15, h - .95, h - .55, -deep, 0, col, M0);
    fBox(g, side, s0 - .05, s1 + .05, h - 1.2, h - .95, -deep * .5, 0, sh(col, .92), M0);
    for (let s = s0 + .4; s < s1 - .2; s += 1.1) fBox(g, side, s - .1, s + .1, h - 1.45, h - .95, -deep * .75, 0, sh(col, .96), M0);
  }
  function storefront(g, side, s0, s1, o, r) {
    const gy0 = .55, gy1 = 3.05, fy0 = 3.25, fy1 = 4.25, dm = o.door ?? (s0 + s1) / 2, pc = o.pier || o.wallCol, pm = o.pierMat || o.wallMat;
    fBox(g, side, s0, s0 + .45, 0, fy1, -.1, 0, pc, pm, o.u); fBox(g, side, s1 - .45, s1, 0, fy1, -.1, 0, pc, pm, o.u);
    fBox(g, side, s0 + .45, s1 - .45, fy0, fy1, -.14, 0, o.fascia, M0);
    fQuad(g, side, s0 + .45, s1 - .45, gy1, fy0, 0, o.trim, M0);
    const ranges = [[s0 + .45, dm - .8], [dm + .8, s1 - .45]];
    for (const [a, b] of ranges) { if (b - a < .5) continue;
      fBox(g, side, a, b, 0, gy0, -.02, .32, o.bulk, M0);
      for (const [zs, nz] of [[a, -1], [b, 1]]) g.quad([fx(side, 0), 0, -zs], [fx(side, .34), 0, -zs], [fx(side, .34), gy1, -zs], [fx(side, 0), gy1, -zs], sh(o.trim, .7), M0, undefined, [0, 0, nz]);
      g.quad([fx(side, 0), gy1, -a], [fx(side, 0), gy1, -b], [fx(side, .32), gy1, -b], [fx(side, .32), gy1, -a], sh(o.trim, .6), M0, undefined, [0, -1, 0]);
      const lit = o.glassLayer != null ? M(o.glassLayer, .35, .45, 0) : M(-1, .7, .7, 0);
      fQuad(g, side, a, b, gy0, gy1, .32, o.glassLayer != null ? [1, 1, 1] : WARM[(r() * 3) | 0], lit);
      for (let s = a + 1.7; s < b - .4; s += 1.7) fBox(g, side, s - .04, s + .04, gy0, gy1, .24, .32, o.trim, M0);
    }
    // the shop door, set back
    const da = dm - .8, db = dm + .8, dd = .9, xa = fx(side, 0), xb = fx(side, dd);
    g.quad([xa, 0, -da], [xb, 0, -da], [xb, gy1, -da], [xa, gy1, -da], sh(o.trim, .7), M0, undefined, [0, 0, -1]);
    g.quad([xa, 0, -db], [xb, 0, -db], [xb, gy1, -db], [xa, gy1, -db], sh(o.trim, .7), M0, undefined, [0, 0, 1]);
    g.quad([xa, gy1, -da], [xa, gy1, -db], [xb, gy1, -db], [xb, gy1, -da], sh(o.trim, .5), M0, undefined, [0, -1, 0]);
    g.quad([xa, .02, -da], [xa, .02, -db], [xb, .02, -db], [xb, .02, -da], hex('#4a4640'), M0, undefined, [0, 1, 0]);
    fQuad(g, side, da, db, 0, gy1, dd, hex('#2a2a2a'), M0); fQuad(g, side, da + .12, db - .12, .1, 2.55, dd - .02, WARM[1], M(-1, .7, .5, 0));
    if (o.awning) awning(g, side, s0 + .55, s1 - .55, fy0 - .02, o.awning);
  }
  function awning(g, side, a, b, y, col) {
    const x0 = fx(side, 0), x1 = fx(side, -1.35), y1 = y - .7;
    g.quad([x0, y, -a], [x0, y, -b], [x1, y1, -b], [x1, y1, -a], col, M0);
    g.quad([x1, y1, -a], [x1, y1, -b], [x1, y1 - .28, -b], [x1, y1 - .28, -a], sh(col, .9), M0, undefined, [-side, 0, 0]);
    g.tri([x0, y, -a], [x1, y1, -a], [x1, y1 - .28, -a], sh(col, .8), M0, [0, 0, 1]); g.tri([x0, y, -b], [x1, y1, -b], [x1, y1 - .28, -b], sh(col, .8), M0, [0, 0, -1]);
  }
  function waterTower(g, side, s, d, y) {
    const cx = fx(side, d), cz = -s, wood = hex('#6a5442');
    for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.tube([cx + ox * 1.1, y, cz + oz * 1.1], [cx + ox * .9, y + 2.4, cz + oz * .9], .07, .07, 5, [.12, .12, .12], M0);
    g.box(cx - 1.5, y + 2.4, cz - 1.5, cx + 1.5, y + 2.55, cz + 1.5, [.14, .13, .12], M0);
    g.tube([cx, y + 2.55, cz], [cx, y + 5.4, cz], 1.55, 1.5, 14, wood, M(T.bark, 0, 0, 0), false, 1.5);
    for (const hh of [3.1, 4.0, 4.9]) g.tube([cx, y + hh, cz], [cx, y + hh + .08, cz], 1.57, 1.56, 14, [.1, .1, .1], M0);
    g.tube([cx, y + 5.4, cz], [cx, y + 6.6, cz], 1.62, .05, 14, sh(wood, .85), M0);
  }
  function fireEscape(g, side, s0, floors, base, fh) {
    const mc = [.1, .105, .11], s1 = s0 + 4.4;
    for (let i = 1; i < floors; i++) { const y = base + i * fh - .15;
      fBox(g, side, s0, s1, y, y + .06, -1.1, -.02, mc, M0); fBox(g, side, s0, s1, y + .95, y + 1.0, -1.1, -1.05, mc, M0);
      for (let s = s0; s <= s1 + .01; s += .55) fBox(g, side, s - .02, s + .02, y, y + .97, -1.09, -1.06, mc, M0);
      fBox(g, side, s0 - .02, s0 + .02, y, y + .97, -1.1, -.02, mc, M0); fBox(g, side, s1 - .02, s1 + .02, y, y + .97, -1.1, -.02, mc, M0);
      if (i < floors - 1) { const a = i % 2 ? [s1 - .4, y + .06] : [s0 + .4, y + .06], b = i % 2 ? [s0 + 1.6, y + fh] : [s1 - 1.6, y + fh];
        for (const dd of [-.85, -.45]) g.tube([fx(side, dd), a[1], -a[0]], [fx(side, dd), b[1], -b[0]], .025, .025, 4, mc, M0);
        for (let k = 1; k < 10; k++) { const t = k / 10; g.box(Math.min(fx(side, -.85), fx(side, -.45)), lerp(a[1], b[1], t), -lerp(a[0], b[0], t) - .03, Math.max(fx(side, -.85), fx(side, -.45)), lerp(a[1], b[1], t) + .03, -lerp(a[0], b[0], t) + .03, mc, M0); } }
    }
  }

  /* ---------- an ordinary building ---------- */
  const STY = {
    brick: { layer: 'brickRed', u: 1.6, fh: 3.2, w: 1.15, h: 1.75, bay: 2.5, rd: .2, frame: hex('#e9e4d8'), sill: hex('#cfc6b4'), lintel: hex('#cfc6b4'), lintelH: .22, corn: hex('#6f6a60'), blind: true },
    tan: { layer: 'brickTan', u: 1.6, fh: 3.2, w: 1.15, h: 1.8, bay: 2.45, rd: .2, frame: hex('#2f3b33'), sill: hex('#d6cdbb'), lintel: hex('#d6cdbb'), lintelH: .25, corn: hex('#c9c0ae'), blind: true },
    dark: { layer: 'brickBrown', u: 1.6, fh: 3.25, w: 1.2, h: 1.8, bay: 2.6, rd: .2, frame: hex('#d8d2c4'), sill: hex('#bdb3a0'), lintel: hex('#bdb3a0'), lintelH: .2, corn: hex('#4c4842'), blind: true },
    brown: { layer: 'brown', u: 2.4, fh: 3.35, w: 1.2, h: 2.0, bay: 2.6, rd: .24, frame: hex('#e2dccf'), sill: hex('#5a3f31'), lintel: hex('#5a3f31'), lintelH: .35, corn: hex('#4a362c'), blind: true },
    lime: { layer: 'lime', u: 2.4, fh: 3.3, w: 1.3, h: 1.9, bay: 2.4, rd: .26, frame: hex('#2b2f33'), sill: hex('#c7bca6'), lintel: null, corn: hex('#cfc4ad') },
    loft: { layer: 'concrete', u: 2.4, fh: 4.1, w: 2.0, h: 2.8, bay: 2.9, rd: .22, frame: hex('#26292c'), sill: null, lintel: null, corn: hex('#4d5258'), col: hex('#7d828a') },
  };
  function building(g, b) {
    const { side, s0, s1, h } = b, st = STY[b.style] || STY.brick, r = RNG(b.seed), depth = 22, tint = .9 + r() * .2;
    const wallCol = sh(st.col || [1, 1, 1], tint), wallMat = M(T[st.layer]), o = { wallCol, wallMat, u: st.u, rd: st.rd, frame: st.frame, sill: st.sill, lintel: st.lintel, lintelH: st.lintelH, lit: .45, blind: st.blind, sash: .52 };
    fBox(g, side, s0, s1, 0, h, .02, depth, wallCol, wallMat, st.u, streetFace(side) + '-y');
    fBox(g, side, s0 + .3, s1 - .3, h, h + .02, .5, depth - .5, hex('#3b3a38'), M0);
    const base = 4.25, floors = Math.max(1, Math.floor((h - base - 1.3) / st.fh)), top = base + floors * st.fh;
    for (let i = 0; i < floors; i++) { const y0 = base + i * st.fh, wy0 = y0 + (st.fh - st.h) * .55, wins = bays(s0 + .5, s1 - .5, st.bay, st.w); windowRow(g, side, s0 + .3, s1 - .3, y0, y0 + st.fh, wy0, wy0 + st.h, wins, o, r); }
    fQuad(g, side, s0 + .3, s1 - .3, top, h, 0, wallCol, wallMat, st.u);
    fBox(g, side, s0, s0 + .3, base, h, -.22, 0, wallCol, wallMat, st.u); fBox(g, side, s1 - .3, s1, base, h, -.22, 0, wallCol, wallMat, st.u);
    if (b.style === 'loft') for (const [a, bb] of bays(s0 + .5, s1 - .5, st.bay, st.w)) { fBox(g, side, bb + .05, bb + .3, base, top, -.2, 0, sh(wallCol, .9), M0); }
    cornice(g, side, s0, s1, h, sh(st.corn, tint));
    storefront(g, side, s0, s1, { wallCol, wallMat, u: st.u, fascia: b.fascia || hex(['#1e2a22', '#2b2420', '#1c2230', '#3a1f1f', '#262626'][(r() * 5) | 0]), trim: hex('#22252a'), bulk: hex('#2f3134'), awning: b.awning, pier: b.style === 'loft' ? sh(wallCol, .85) : null }, r);
    if (b.fire) fireEscape(g, side, s0 + (s1 - s0) / 2 - 2.2, floors, base, st.fh);
    if (b.tower) waterTower(g, side, (s0 + s1) / 2, 9, h);
    return { floors, base };
  }
  function glassTower(g, b) {
    const { side, s0, s1, h } = b, r = RNG(b.seed), depth = 26, fh = 3.6, glassC = b.tint || hex('#3f5a6a');
    fBox(g, side, s0, s1, 0, h, .05, depth, hex('#28323a'), M0, 2, streetFace(side) + '-y');
    const base = 6.5;
    for (let y = base; y < h - 1.5; y += fh) {
      for (let s = s0 + .4; s < s1 - .4 - .05; s += 1.5) { const lit = r() < (b.lit ?? .3); fQuad(g, side, s, Math.min(s + 1.5, s1 - .4), y + .9, y + fh, .08, lit ? WARM[4] : glassC, M(-1, .92, lit ? .45 : 0, 0)); }
      fBox(g, side, s0 + .4, s1 - .4, y, y + .9, -.04, .06, hex('#2b3640'), M(-1, .3, 0, 0));
    }
    for (let s = s0 + .4; s <= s1 - .39; s += 1.5) fBox(g, side, s - .05, s + .05, base, h - 1.5, -.16, .08, hex('#9aa6ae'), M(-1, .25, 0, 0));
    fBox(g, side, s0, s1, h - 1.5, h, -.1, .05, hex('#9aa6ae'), M0);
    fBox(g, side, s0, s0 + .4, base, h, -.12, .1, hex('#9aa6ae'), M0); fBox(g, side, s1 - .4, s1, base, h, -.12, .1, hex('#9aa6ae'), M0); fBox(g, side, s1 - .3, s1, 0, base, -.1, .5, hex('#bfc3c3'), M0);
    fBox(g, side, s0, s1, 0, base, .5, .52, hex('#1d262c'), M0);
    for (let s = s0; s <= s1; s += 3) fBox(g, side, s - .3, s + .3, 0, base, -.1, .5, hex('#bfc3c3'), M0);
    for (let s = s0 + .3; s < s1 - .3; s += 3) fQuad(g, side, s + .3, s + 2.7, .2, base - .3, .45, hex('#d6d9d2'), M(-1, .45, .5, 0));
    fBox(g, side, s0, s1, base - .5, base, -.2, .5, hex('#bfc3c3'), M0);
  }

  /* ---------- the four places I worked ---------- */
  function orgBuilding(g, o) {
    const side = o.side, s0 = o.s0, s1 = o.s1, acc = hex(o.accent), r = RNG(o.idx * 77 + 5);
    o.doorD = .5;
    if (o.idx === 0) { // Kaiser — a clean, white pharma office
      const h = 24, wc = hex('#e4e2dc'), wm = M(T.concrete);
      fBox(g, side, s0, s1, 0, h, .02, 22, wc, wm, 2.4, streetFace(side) + '-y');
      fBox(g, side, s0, s1, 0, 5, .6, .62, hex('#20282c'), M0);
      for (let s = s0 + .4; s < s1 - .3; s += 2.4) fQuad(g, side, s, Math.min(s + 2.4, s1 - .4), .1, 4.8, .55, hex('#d9dcd6'), M(-1, .42, .45, 0));
      for (let s = s0; s <= s1 + .01; s += 4.8) fBox(g, side, s - .25, s + .25, 0, 5.2, -.25, .6, wc, wm, 2.4);
      fBox(g, side, s0, s1, 5.0, 5.55, -.18, .02, acc, M0);
      g.quad([fx(side, 0), 4.85, -s0], [fx(side, 0), 4.85, -s1], [fx(side, .62), 4.85, -s1], [fx(side, .62), 4.85, -s0], hex('#e9e7e1'), M0, undefined, [0, -1, 0]);
      fBox(g, side, s0, s0 + .35, 5.55, h, -.12, .2, wc, wm, 2.4); fBox(g, side, s1 - .35, s1, 5.55, h, -.12, .2, wc, wm, 2.4);
      fBox(g, side, s0, s1, 5.55, 7.1, -.06, .02, hex('#f2f0ea'), M0);
      fSign(g, side, s0 + 5.4, s1 - 5.4, 5.75, 6.9, -.07, S.kaiser, [1, 1, 1], .25, 1);
      for (let y = 7.1; y < h - 1.4; y += 3.4) {
        fQuad(g, side, s0, s1, y, y + 1.2, 0, wc, wm, 2.4); const g0 = y + 1.2, g1 = y + 3.15;
        g.quad([fx(side, 0), g1, -s0], [fx(side, 0), g1, -s1], [fx(side, .2), g1, -s1], [fx(side, .2), g1, -s0], sh(wc, .6), M0, undefined, [0, -1, 0]);
        g.quad([fx(side, 0), g0, -s0], [fx(side, 0), g0, -s1], [fx(side, .2), g0, -s1], [fx(side, .2), g0, -s0], sh(wc, .9), M0, undefined, [0, 1, 0]);
        for (let s = s0; s < s1 - .05; s += 1.8) { const lit = r() < .4; fQuad(g, side, s, Math.min(s + 1.8, s1), g0, g1, .2, lit ? WARM[3] : hex('#3d5560'), M(-1, .9, lit ? .5 : 0, 0)); }
        fQuad(g, side, s0, s1, g1, y + 3.4, 0, wc, wm, 2.4);
      }
      for (let s = s0 + 1.8; s < s1 - .5; s += 1.8) fBox(g, side, s - .06, s + .06, 7.1, h - 1.3, -.45, .2, hex('#f4f3ef'), M0);
      fBox(g, side, s0, s1, h - 1.3, h, -.1, .02, wc, wm, 2.4);
      fBox(g, side, s0 + 4, s1 - 4, h, h + 3, 4, 14, hex('#c9c8c2'), M0);
      fBox(g, side, o.door - 3, o.door + 3, 4.1, 4.35, -2.6, -.25, hex('#f4f3ef'), M0); fBox(g, side, o.door - 3, o.door + 3, 4.0, 4.1, -2.62, -2.5, acc, M0);
      // a green cross, hung out over the sidewalk
      const cs = o.door - 7.5; for (const [a, b, c, d] of [[cs - .25, cs + .25, 6.6, 8.4], [cs - .9, cs + .9, 7.25, 7.75]]) { const xa = fx(side, -1.1), xb = fx(side, -1.0); g.box(Math.min(xa, xb), c, -b, Math.max(xa, xb) + .0, d, -a, hex('#2fdc84'), M(-1, 0, 1.1, 1)); }
      fBox(g, side, cs - .04, cs + .04, 7.4, 7.6, -1.0, 0, [.2, .2, .2], M0);
    } else if (o.idx === 1) { // Siemens — a glass tower
      glassTower(g, { side, s0, s1, h: 92, seed: 9, tint: hex('#36606c'), lit: .25 });
      fBox(g, side, s0 + .5, s1 - .5, 86.5, 88.2, -.25, .1, acc, M(-1, 0, .8, 1));
      fSign(g, side, s0 + 7, s1 - 7, 82.3, 85.9, -.2, S.siemens, [1, 1, 1], .7, 1);
      fBox(g, side, s0 + 7, s1 - 7, 82.2, 86, -.18, .05, hex('#0b161b'), M0);
      fBox(g, side, o.door - 4, o.door + 4, 5.6, 5.9, -2.8, -.1, hex('#cfd5d6'), M(-1, .3, 0, 0));
      fBox(g, side, o.door - 3, o.door + 3, 4.85, 5.6, -.16, .05, hex('#0b161b'), M0); fSign(g, side, o.door - 2.6, o.door + 2.6, 4.95, 5.5, -.17, S.siemens, [1, 1, 1], .6, 1);
    } else if (o.idx === 2) { // Rutgers — brick and limestone, a portico, a clock tower
      const h = 22, wc = [1, 1, 1], wm = M(T.brickRed), lime = hex('#ddd3bf'), lm = M(T.lime);
      fBox(g, side, s0, s1, 0, h, .02, 22, wc, wm, 1.6, streetFace(side) + '-y');
      const da_ = o.door - 1.04, db_ = o.door + 1.04;
      fBox(g, side, s0, da_, 0, 1.3, -.12, .02, lime, lm, 2.4); fBox(g, side, db_, s1, 0, 1.3, -.12, .02, lime, lm, 2.4);
      const o2 = { wallCol: wc, wallMat: wm, u: 1.6, rd: .3, frame: hex('#f0ebe0'), sill: lime, lintel: lime, lintelH: .3, lit: .4, sash: .6 };
      const fh = 3.9, base = 8.6;
      { const wins = bays(s0 + .4, s1 - .4, 2.75, 1.4); windowRow(g, side, s0, o.door - 5.4, 1.3, base, 2.2, 6.1, wins.filter(([a, b]) => b < o.door - 5.6), o2, r); windowRow(g, side, o.door + 5.4, s1, 1.3, base, 2.2, 6.1, wins.filter(([a, b]) => a > o.door + 5.6), o2, r);
        fQuad(g, side, o.door - 5.4, da_, 1.3, base, 0, wc, wm, 1.6); fQuad(g, side, db_, o.door + 5.4, 1.3, base, 0, wc, wm, 1.6); fQuad(g, side, da_, db_, 3.14, base, 0, wc, wm, 1.6); fQuad(g, side, da_, db_, 0, 1.3, .6, lime, M0); }
      fBox(g, side, s0, s1, base - .35, base, -.15, .02, lime, lm, 2.4);
      for (let i = 0; i < 3; i++) { const y0 = base + i * fh; windowRow(g, side, s0, s1, y0, y0 + fh, y0 + .6, y0 + 3.0, bays(s0 + .4, s1 - .4, 2.75, 1.3), o2, r);
        for (const [a, b] of bays(s0 + .4, s1 - .4, 2.75, 1.3)) { const c = (a + b) / 2, R = .65, yb = y0 + 3.0; for (let k = 0; k < 8; k++) { const a0 = Math.PI * k / 8, a1 = Math.PI * (k + 1) / 8; const P = t => [fx(side, -.03), yb + Math.sin(t) * (R + .12), -(c - Math.cos(t) * (R + .12))], Q = t => [fx(side, -.03), yb + Math.sin(t) * R, -(c - Math.cos(t) * R)]; g.quad(Q(a0), P(a0), P(a1), Q(a1), lime, M0, undefined, [-side, 0, 0]); } } }
      fQuad(g, side, s0, s1, base + 3 * fh, h, 0, wc, wm, 1.6);
      cornice(g, side, s0, s1, h, lime, .7);
      fBox(g, side, s0, s0 + .4, 1.3, h, -.2, 0, lime, lm, 2.4); fBox(g, side, s1 - .4, s1, 1.3, h, -.2, 0, lime, lm, 2.4);
      // portico
      const pa = o.door - 5.4, pb = o.door + 5.4;
      for (let k = 0; k < 3; k++) fBox(g, side, pa - .3 + k * .25, pb + .3 - k * .25, k * .2, (k + 1) * .2, -3.2 + k * .35, 0, lime, lm, 2.4);
      for (const s of [pa + .8, o.door - 1.9, o.door + 1.9, pb - .8]) { const x = fx(side, -2.3); g.tube([x, .6, -s], [x, 6.9, -s], .38, .32, 14, lime, M0); g.box(x - .48, .6, -s - .48, x + .48, .85, -s + .48, lime, M0); g.box(x - .45, 6.75, -s - .45, x + .45, 7.05, -s + .45, lime, M0); }
      fBox(g, side, pa - .2, pb + .2, 7.05, 8.3, -2.9, 0, lime, lm, 2.4);
      fSign(g, side, pa + .6, pb - .6, 7.2, 8.15, -2.91, S.rutgers, [1, 1, 1], 0, 0);
      { const x0 = fx(side, -2.9), x1 = fx(side, 0), yb = 8.3, ya = 10.1, zc = -o.door, za = -(pa - .2), zb = -(pb + .2);
        g.tri([x0, yb, za], [x0, yb, zb], [x0, ya, zc], lime, M0, [-side, 0, 0]);
        g.quad([x0, yb, za], [x0, ya, zc], [x1, ya, zc], [x1, yb, za], sh(lime, .95), M0); g.quad([x0, yb, zb], [x0, ya, zc], [x1, ya, zc], [x1, yb, zb], sh(lime, .95), M0); }
      for (const s of [s0 + 1.9, s1 - 1.9]) { fBox(g, side, s - .03, s + .03, 15.4, 15.5, -1.1, 0, [.15, .15, .15], M0); fSign(g, side, s - .55, s + .55, 12.4, 15.4, -1.0, S.banner, [1, 1, 1], 0, 0); }
      // clock tower, set back
      const tc = (s0 + s1) / 2 + 3, ta = tc - 2.6, tb = tc + 2.6;
      fBox(g, side, ta, tb, h, h + 9, 4, 9.2, wc, wm, 1.6); fBox(g, side, ta - .2, tb + .2, h + 9, h + 9.5, 3.8, 9.4, lime, M0);
      fSign(g, side, tc - 1.4, tc + 1.4, h + 4.6, h + 7.4, 3.97, S.clock, [1, 1, 1], .5, 0);
      { const x0 = fx(side, 3.8), x1 = fx(side, 9.4), xc = (x0 + x1) / 2, y = h + 9.5, top = [xc, y + 4.2, -tc], c = [[x0, y, -ta + .2], [x1, y, -ta + .2], [x1, y, -tb - .2], [x0, y, -tb - .2]], rc = hex('#3d5a52'); for (let k = 0; k < 4; k++) g.tri(c[k], c[(k + 1) % 4], top, rc, M0); }
    } else if (o.idx === 4) { // Virtua Health — a modern hospital pavilion: white panels, blue glass bands, a canopy
      const h = 30, wc = hex('#eef1f3'), wm = M(T.concrete), glassC = hex('#3a6f9a');
      fBox(g, side, s0, s1, 0, h, .02, 24, wc, wm, 2.4, streetFace(side) + '-y');
      // ground floor: full-height lobby glazing behind slim mullions
      fBox(g, side, s0, s1, 0, 5.4, .7, .72, hex('#1b2630'), M0);
      for (let s = s0 + .4; s < s1 - .3; s += 2) fQuad(g, side, s, Math.min(s + 2, s1 - .4), .1, 5.2, .68, hex('#dfe8ee'), M(-1, .45, .55, 0));
      for (let s = s0; s <= s1 + .01; s += 2) fBox(g, side, s - .05, s + .05, 0, 5.4, .05, .7, hex('#c9d1d6'), M0);
      // upper floors: alternating white spandrels and blue ribbon windows
      for (let y = 5.4; y < h - 2; y += 3.6) {
        fBox(g, side, s0, s1, y, y + 1.1, -.12, .02, wc, wm, 2.4);
        for (let s = s0 + .3; s < s1 - .35; s += 1.6) { const lit = r() < .45; fQuad(g, side, s, Math.min(s + 1.6, s1 - .3), y + 1.1, y + 3.6, .12, lit ? WARM[3] : glassC, M(-1, .9, lit ? .5 : 0, 0)); }
        for (let s = s0 + .3; s <= s1 - .29; s += 1.6) fBox(g, side, s - .03, s + .03, y + 1.1, y + 3.6, .02, .12, hex('#dfe5e9'), M0);
      }
      fBox(g, side, s0, s1, h - 2, h, -.15, .02, wc, wm, 2.4);
      fBox(g, side, s0, s0 + .5, 5.4, h, -.2, .02, wc, wm, 2.4); fBox(g, side, s1 - .5, s1, 5.4, h, -.2, .02, wc, wm, 2.4);
      // the name across the top, and a blue band
      fBox(g, side, s0 + 3, s1 - 3, h - 1.9, h - .1, -.22, .02, hex('#f7f9fb'), M0);
      fSign(g, side, s0 + 3.3, s1 - 3.3, h - 1.8, h - .2, -.23, S.virtua, [1, 1, 1], .5, 1);
      fBox(g, side, s0, s1, 5.4, 5.75, -.2, .02, acc, M(-1, 0, .5, 1));
      // entrance canopy over the sidewalk
      fBox(g, side, o.door - 4.5, o.door + 4.5, 3.6, 3.9, -3.2, .02, hex('#f4f6f8'), M0); fBox(g, side, o.door - 4.5, o.door + 4.5, 3.5, 3.6, -3.22, -3.05, acc, M0);
      for (const s of [o.door - 4.1, o.door + 4.1]) { const x = fx(side, -2.9); g.tube([x, 0, -s], [x, 3.6, -s], .1, .1, 10, hex('#c9d1d6'), M0); }
      fBox(g, side, s0 + 4, s1 - 4, h, h + 2.6, 3, 16, hex('#cfd5d9'), M0);
      // a lit blue cross on the corner
      const cs = s1 - 2.5; for (const [a, b, c, d] of [[cs - .25, cs + .25, 18.4, 20.2], [cs - .9, cs + .9, 19.05, 19.55]]) { const xa = fx(side, -.35), xb = fx(side, -.25); g.box(Math.min(xa, xb), c, -b, Math.max(xa, xb), d, -a, hex('#3b8cf0'), M(-1, 0, 1.1, 1)); }
    } else { // The Daily Targum — an art-deco newspaper building
      const h = 32, wc = hex('#e1d8c4'), wm = M(T.lime);
      fBox(g, side, s0, s1, 0, h, .02, 22, wc, wm, 2.4, streetFace(side) + '-y');
      const fh = 3.4, base = 13;
      fQuad(g, side, s0, s1, 6.6, base, 0, wc, wm, 2.4);
      for (let y = base; y < h - 3.5; y += fh) for (let s = s0 + .5; s < s1 - 2; s += 2.6) { const lit = r() < .55; fQuad(g, side, s + .35, s + 2.25, y + .9, y + fh, .25, lit ? WARM[0] : hex('#33404a'), M(-1, .8, lit ? .6 : 0, 0)); fQuad(g, side, s + .35, s + 2.25, y, y + .9, .25, hex('#3a3934'), M(-1, .2, 0, 0)); }
      for (let s = s0 + .5; s <= s1 - .4; s += 2.6) { fBox(g, side, s - .35, s + .35, base, h - 2, -.32, .25, wc, wm, 2.4); }
      for (const yy of [base, h - 3.5 - ((h - 3.5 - base) % fh)]) g.quad([fx(side, 0), yy, -s0], [fx(side, 0), yy, -s1], [fx(side, .26), yy, -s1], [fx(side, .26), yy, -s0], sh(wc, .8), M0, undefined, [0, yy === base ? 1 : -1, 0]);
      fQuad(g, side, s0, s1, h - 3.5, h, 0, wc, wm, 2.4);
      fBox(g, side, s0, s0 + .5, 6.6, h, -.35, 0, wc, wm, 2.4); fBox(g, side, s1 - .5, s1, 6.6, h, -.35, 0, wc, wm, 2.4);
      fBox(g, side, s0 + 6, s1 - 6, h, h + 4, 2.5, 18, wc, wm, 2.4); fBox(g, side, s0 + 9, s1 - 9, h + 4, h + 7, 5, 15, wc, wm, 2.4);
      fBox(g, side, s0 + 2, s1 - 2, 9.4, 12.6, -.3, .02, hex('#17130d'), M0);
      fSign(g, side, s0 + 3.6, s1 - 3.6, 9.55, 12.45, -.31, S.targum, [1, 1, 1], .5, 1);
      fBox(g, side, s0 + .5, s1 - .5, 7.3, 8.5, -.3, .02, hex('#0c0805'), M0);
      { const x = fx(side, -.31), a = s0 + .7, b = s1 - .7, L = (b - a) / 16, sp = 2 + .045, m = M(S.ticker, 0, 1.0, sp), n = [-side, 0, 0];
        if (side < 0) g.quad([x, 8.4, -a], [x, 8.4, -b], [x, 7.4, -b], [x, 7.4, -a], [1, 1, 1], m, [[0, 0], [L, 0], [L, 1], [0, 1]], n); else g.quad([x, 8.4, -b], [x, 8.4, -a], [x, 7.4, -a], [x, 7.4, -b], [1, 1, 1], m, [[0, 0], [L, 0], [L, 1], [0, 1]], n); }
      fBox(g, side, s0, s1, 0, 6.6, .55, .57, hex('#2a2620'), M0);
      for (let s = s0 + .5; s < s1 - .5; s += 2.6) fQuad(g, side, s + .3, s + 2.3, .5, 5.4, .55, WARM[0], M(-1, .7, .7, 0));
      for (let s = s0; s <= s1 + .01; s += 2.6) fBox(g, side, s - .3, s + .3, 0, 6.6, -.15, .55, wc, wm, 2.4);
      fBox(g, side, s0, s1, 5.5, 6.6, -.2, .55, hex('#15120d'), M0);
      fSign(g, side, o.door - 4.2, o.door + 4.2, 5.62, 6.48, -.21, S.newsroom, [1, 1, 1], .5, 1);
    }
    // the entrance: recess, frame in the org's colour, a brass plaque; the door itself moves (see doors)
    const da = o.door - .9, db = o.door + .9, dd = o.doorD, xa = fx(side, -.01), xb = fx(side, dd), top = 3.0;
    g.quad([xa, 0, -da], [xb, 0, -da], [xb, top, -da], [xa, top, -da], hex('#2a2a2a'), M0, undefined, [0, 0, -1]); g.quad([xa, 0, -db], [xb, 0, -db], [xb, top, -db], [xa, top, -db], hex('#2a2a2a'), M0, undefined, [0, 0, 1]);
    g.quad([xa, top, -da], [xa, top, -db], [xb, top, -db], [xb, top, -da], hex('#1d1d1d'), M0, undefined, [0, -1, 0]);
    fQuad(g, side, da, db, 0, top, dd + .02, hex('#ffe3b0'), M(-1, 0, 1.2, 0)); // warm light from inside
    fBox(g, side, da - .14, da, 0, top + .14, -.06, .02, acc, M0); fBox(g, side, db, db + .14, 0, top + .14, -.06, .02, acc, M0); fBox(g, side, da - .14, db + .14, top, top + .14, -.06, .02, acc, M0);
    fSign(g, side, db + .45, db + 1.25, 1.35, 1.85, -.03, o.plaque, [1, 1, 1], 0, 0); fBox(g, side, db + .42, db + 1.28, 1.32, 1.88, -.025, .0, hex('#6e5222'), M0);
  }

  /* ---------- the landmarks ---------- */
  function comics(g) {
    const side = -1, s0 = 26, s1 = 38; building(g, { side, s0, s1, h: 14.5, style: 'tan', seed: 301, awning: null, fascia: hex('#f5c518') });
    fSign(g, side, s0 + 1.4, s1 - 1.4, 3.32, 4.18, -.15, S.comics, [1, 1, 1], .2, 1);
    fQuad(g, side, s0 + .5, 31.15, .58, 3.0, .3, [1, 1, 1], M(S.posters, .3, .4, 1)); fQuad(g, side, 32.85, s1 - .5, .58, 3.0, .3, [1, 1, 1], M(S.posters, .3, .4, 1));
    awning(g, side, s0 + .55, s1 - .55, 3.23, hex('#c72a2a'));
    blade(g, side, 28.3, -.25, -1.75, 4.8, 6.0, S.burst, .3);
  }
  function music(g) {
    const side = 1, s0 = 52, s1 = 64; building(g, { side, s0, s1, h: 17.5, style: 'dark', seed: 302, fascia: hex('#1a110b') });
    fSign(g, side, s0 + 1, s1 - 1, 3.32, 4.18, -.15, S.music, [1, 1, 1], .4, 1);
    fQuad(g, side, s0 + .5, 57.15, .58, 3.0, .3, [1, 1, 1], M(S.guitars, .3, .6, 1)); fQuad(g, side, 58.85, s1 - .5, .58, 3.0, .3, [1, 1, 1], M(S.guitars, .3, .6, 1));
    awning(g, side, s0 + .55, s1 - .55, 3.23, hex('#2b1d14'));
  }
  function theater(g) {
    const side = -1, s0 = 94, s1 = 108, h = 21; building(g, { side, s0, s1, h, style: 'lime', seed: 303, fascia: hex('#2a0c0e') });
    const m0 = 96, m1 = 106, x0 = fx(side, -3.1), x1 = fx(side, 0);
    g.box(Math.min(x0, x1), 3.7, -m1, Math.max(x0, x1), 5.25, -m0, hex('#20090b'), M0);
    fSign(g, side, m0 + .1, m1 - .1, 3.78, 5.17, -3.11, S.marquee, [1, 1, 1], .9, 1);
    g.quad([x0, 3.69, -m0], [x0, 3.69, -m1], [x1, 3.69, -m1], [x1, 3.69, -m0], hex('#ffe2a0'), M(-1, 0, 1.4, 1), undefined, [0, -1, 0]);
    blade(g, side, 101, -.3, -1.7, 6.2, 13.2, S.reel, 1.0, true, hex('#2a0b0d'));
  }

  /* ---------- the street ---------- */
  function street(g) {
    const zA = 30, zB = -420, inX = (s, m = 0) => CROSS.some(([a, b]) => s > a - m && s < b + m);
    g.quad([-CURB, 0, zA], [CURB, 0, zA], [CURB, 0, zB], [-CURB, 0, zB], [1, 1, 1], M(T.asphalt), [[-CURB / 6, -zA / 6], [CURB / 6, -zA / 6], [CURB / 6, -zB / 6], [-CURB / 6, -zB / 6]], [0, 1, 0]);
    // sidewalks, curbs, cut at the cross streets
    const runs = []; let s = -30; for (const [a, b] of CROSS) { runs.push([s, a]); s = b; } runs.push([s, 420]);
    for (const side of [1, -1]) for (const [a, b] of runs) {
      const x0 = side * CURB, x1 = side * (F + 1.3), u = 3, U = (x, s) => [x / u, s / u];
      g.quad([x0, SWH, -a], [x1, SWH, -a], [x1, SWH, -b], [x0, SWH, -b], [1, 1, 1], M(T.sidewalk), [U(x0, a), U(x1, a), U(x1, b), U(x0, b)], [0, 1, 0]);
      g.box(Math.min(x0, x0 + side * .32), 0, -b, Math.max(x0, x0 + side * .32), SWH + .002, -a, hex('#b4b0a6'), M(T.granite), 1.5, '-y');
    }
    for (const [a, b] of CROSS) {
      g.quad([-90, -.001, -a], [90, -.001, -a], [90, -.001, -b], [-90, -.001, -b], [1, 1, 1], M(T.asphalt), [[-15, a / 6], [15, a / 6], [15, b / 6], [-15, b / 6]], [0, 1, 0]);
      for (const side of [1, -1]) { const x0 = side * (F + .2), x1 = side * 90; for (const [p, q] of [[a - 6, a], [b, b + 6]]) { void p; void q; }
        g.quad([x0, -.0005, -a], [x1, -.0005, -a], [x1, -.0005, -b], [x0, -.0005, -b], [1, 1, 1], M(T.asphalt), [[0, 0], [10, 0], [10, 2], [0, 2]], [0, 1, 0]); }
      for (const [za, zb] of [[a + .5, a + 3.5], [b - 3.5, b - .5]]) for (let x = -CURB + .4; x < CURB - .5; x += 1.15) g.quad([x, .012, -za], [x + .6, .012, -za], [x + .6, .012, -zb], [x, .012, -zb], hex('#e8e5dc'), M0, undefined, [0, 1, 0]);
      for (const side of [1, -1]) for (let z = a + .7; z < b - .7; z += 1.15) g.quad([side * (CURB + .6), SWH + .006, -z], [side * (F - .4), SWH + .006, -z], [side * (F - .4), SWH + .006, -(z + .6)], [side * (CURB + .6), SWH + .006, -(z + .6)], hex('#e8e5dc'), M0, undefined, [0, 1, 0]);
      g.quad([-CURB, .012, -(a - .3)], [1.6, .012, -(a - .3)], [1.6, .012, -(a - .65)], [-CURB, .012, -(a - .65)], hex('#e8e5dc'), M0, undefined, [0, 1, 0]);
    }
    // bike lane and its line; manholes
    for (const [a, b] of runs) { if (b < -10) continue; g.quad([-CURB, .008, -a], [-3.75, .008, -a], [-3.75, .008, -b], [-CURB, .008, -b], hex('#6a9877'), M(T.asphalt), undefined, [0, 1, 0]); g.quad([-3.75, .013, -a], [-3.62, .013, -a], [-3.62, .013, -b], [-3.75, .013, -b], hex('#e8e5dc'), M0, undefined, [0, 1, 0]); }
    for (const [x, s] of [[1.2, 20], [-.6, 63], [1.5, 118]]) { for (let k = 0; k < 16; k++) { const a0 = k / 16 * Math.PI * 2, a1 = (k + 1) / 16 * Math.PI * 2; g.tri([x, .014, -s], [x + Math.cos(a0) * .36, .014, -s + Math.sin(a0) * .36], [x + Math.cos(a1) * .36, .014, -s + Math.sin(a1) * .36], hex('#3a3936'), M0, [0, 1, 0]); } }
    void inX;
  }
  function lamp(g, side, s) {
    const x = side * 5.95, z = -s, pc = hex('#2c3136'), m = M(-1, .15, 0, 0);
    g.tube([x, SWH, z], [x, 1.1, z], .17, .13, 10, pc, m); g.tube([x, 1.1, z], [x, 7.4, z], .085, .065, 8, pc, m);
    const arm = []; for (let k = 0; k <= 6; k++) { const t = k / 6, a = t * Math.PI / 2; arm.push([x - side * (1 - Math.cos(a)) * 1.0 - side * t * .9, 7.4 + Math.sin(a) * .55, z]); }
    for (let k = 0; k < 6; k++) g.tube(arm[k], arm[k + 1], .055, .05, 6, pc, m);
    const hd = arm[6]; g.blob([hd[0] - side * .25, hd[1] - .05, z], .42, .13, .22, 10, 5, pc, m);
    g.quad([hd[0] - side * .55, hd[1] - .14, z - .14], [hd[0] + side * .05, hd[1] - .14, z - .14], [hd[0] + side * .05, hd[1] - .14, z + .14], [hd[0] - side * .55, hd[1] - .14, z + .14], hex('#fff1d6'), M(-1, 0, 1.6, 0), undefined, [0, -1, 0]);
    LAMPS.push([hd[0] - side * .25, hd[1] - .5, z]);
  }
  function tree(g, side, s, seed) {
    const r = RNG(seed), x = side * 7.6, z = -s, h = 2.6 + r() * .5, bark = M(T.bark, 0, 0, 0);
    g.box(x - .75, SWH - .02, z - .75, x + .75, SWH + .01, z + .75, hex('#3b2f25'), M0);
    for (const [a, b, c, d] of [[-.78, .78, -.78, -.74], [-.78, .78, .74, .78], [-.78, -.74, -.78, .78], [.74, .78, -.78, .78]]) g.box(x + a, SWH, z + c, x + b, SWH + .42, z + d, hex('#1c1e1f'), M0);
    const lean = (r() - .5) * .3, top = [x + lean, SWH + h, z + (r() - .5) * .2];
    g.tube([x, SWH, z], top, .16, .11, 9, [1, 1, 1], bark, false, 1.2);
    const C = [top[0], top[1] + 2.2, top[2]], rx = 2.3 + r() * .4, ry = 1.9 + r() * .3;
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + r(), e = [top[0] + Math.cos(a) * rx * .7, top[1] + 1.3 + r() * 1.2, top[2] + Math.sin(a) * rx * .7]; g.tube(top, e, .08, .035, 5, [1, 1, 1], bark); }
    const lm = M(T.leaf, 0, 0, -1);
    for (let k = 0; k < 190; k++) {
      let p; do { p = [(r() * 2 - 1), (r() * 2 - 1), (r() * 2 - 1)]; } while (p[0] * p[0] + p[1] * p[1] + p[2] * p[2] > 1);
      const rr = Math.cbrt(.25 + .75 * r()), q = norm(p), c = [C[0] + q[0] * rx * rr, C[1] + q[1] * ry * rr, C[2] + q[2] * rx * rr];
      const a1 = r() * Math.PI * 2, tilt = (r() - .5) * 1.4, u = [Math.cos(a1), 0, Math.sin(a1)], v = norm([-Math.sin(a1) * Math.sin(tilt), Math.cos(tilt), Math.cos(a1) * Math.sin(tilt)]), half = .7 + r() * .45;
      const n = norm(add(sc(q, .85), [0, .25, 0])), tint = sh([1, 1, 1], .78 + r() * .3 + q[1] * .08);
      const P0 = add(c, add(sc(u, -half), sc(v, -half))), P1 = add(c, add(sc(u, half), sc(v, -half))), P2 = add(c, add(sc(u, half), sc(v, half))), P3 = add(c, add(sc(u, -half), sc(v, half)));
      g.quad(P0, P1, P2, P3, tint, lm, [[0, 1], [1, 1], [1, 0], [0, 0]], n);
    }
  }
  // a sedan, lofted from cross-sections along its length (front toward −z)
  const pw = (pts, z) => { for (let i = 0; i < pts.length - 1; i++) if (z <= pts[i + 1][0]) { const t = (z - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return lerp(pts[i][1], pts[i + 1][1], t); } return pts[pts.length - 1][1]; };
  const CAR_TOP = [[-2.46, .6], [-2.42, .76], [-2.2, .86], [-1.45, .97], [-1.32, 1.0], [-.55, 1.41], [-.2, 1.46], [.45, 1.45], [.75, 1.4], [1.5, 1.02], [2.15, .99], [2.4, .88], [2.47, .66]];
  function car(g, x, s, rot, col, cab) {
    g.at(x, 0, -s, rot);
    const paint = M(-1, cab ? .22 : .3, 0, 0), glassC = hex('#151c24'), glassM = M(-1, .88, 0, 0), N = 30, belt = .99, Wr = .66;
    const W = z => { const a = Math.abs(z); return .9 - (a > 1.9 ? Math.pow((a - 1.9) / .58, 2) * .13 : 0); };
    const bot = z => { let y = .3; for (const c of [-1.45, 1.45]) { const d = z - c; if (Math.abs(d) < .45) y = Math.max(y, .3 + Math.sqrt(.45 * .45 - d * d)); } return y; };
    const sect = z => { const yt = pw(CAR_TOP, z), yb = Math.min(bot(z), yt - .12), w = W(z), gh = yt > belt + .07, sh_ = Math.min(belt, yt);
      return { gh, z, pts: [[0, yb], [w - .12, yb], [w, yb + .12], [w, Math.max(yb + .13, sh_ - .07)], [w - .035, sh_], gh ? [Wr + .05, yt - .08] : [w - .07, yt], gh ? [Wr - .07, yt] : [w - .12, yt], [0, yt]] }; };
    const S = []; for (let i = 0; i <= N; i++) S.push(sect(lerp(-2.47, 2.47, i / N)));
    const P = (st, j, sd) => [sd * st.pts[j][0], st.pts[j][1], st.z];
    for (let i = 0; i < N; i++) { const A = S[i], B = S[i + 1], zm = (A.z + B.z) / 2;
      for (const sd of [-1, 1]) for (let j = 0; j < 7; j++) {
        let c = col, m = paint;
        if (j === 4 && A.gh && B.gh && Math.abs(zm - .08) > .09 && zm > -1.25 && zm < 1.38) { c = glassC; m = glassM; }
        if (j === 6 && ((zm > -1.32 && zm < -.6) || (zm > .78 && zm < 1.48))) { c = glassC; m = glassM; }
        if (j === 0) c = sh(col, .45);
        g.quad(P(A, j, sd), P(B, j, sd), P(B, j + 1, sd), P(A, j + 1, sd), c, m);
      } }
    for (const [st, nz] of [[S[0], -1], [S[N], 1]]) for (const sd of [-1, 1]) for (let j = 0; j < 7; j++) g.tri([0, (st.pts[0][1] + st.pts[7][1]) / 2, st.z], P(st, j, sd), P(st, j + 1, sd), col, paint, [0, 0, nz]);
    // bumpers, grille, lights, mirrors
    g.box(-.88, .24, -2.55, .88, .5, -2.38, [.07, .07, .08], M0); g.box(-.88, .24, 2.4, .88, .5, 2.56, [.07, .07, .08], M0);
    g.box(-.42, .5, -2.47, .42, .66, -2.43, [.05, .05, .06], M(-1, .3, 0, 0));
    for (const sd of [-1, 1]) { g.box(sd * .66 - .2, .6, -2.47, sd * .66 + .2, .72, -2.42, hex('#eef0f2'), M(-1, .7, .7, 0)); g.box(sd * .64 - .2, .66, 2.42, sd * .64 + .2, .8, 2.48, hex('#b3141a'), M(-1, .5, .5, 0));
      g.box(sd * .9, .98, -1.2, sd * 1.05, 1.1, -1.05, sh(col, .9), paint); }
    for (const zz of [-1.45, 1.45]) for (const sd of [-1, 1]) { g.tube([sd * .7, .34, zz], [sd * .93, .34, zz], .335, .335, 16, [.045, .045, .05], M0, true); g.tube([sd * .925, .34, zz], [sd * .94, .34, zz], .2, .2, 12, hex('#6c7076'), M(-1, .45, 0, 0), true); }
    if (cab) { g.box(-.3, 1.45, -.2, .3, 1.68, .08, hex('#fff6c8'), M(-1, 0, .7, 0)); for (const sd of [-1, 1]) for (let k = 0; k < 6; k++) g.box(sd * .902 - .004, .74, -1.6 + k * .55, sd * .902 + .004, .8, -1.6 + k * .55 + .27, [.08, .08, .08], M0); }
    g.quad([-.8, .016, -2.1], [.8, .016, -2.1], [.8, .016, 2.1], [-.8, .016, 2.1], [.16, .16, .17], M0, undefined, [0, 1, 0]);
    g.reset();
  }
  function hydrant(g, side, s) { const x = side * 6.4, z = -s, c = hex('#b8322a'); g.tube([x, SWH, z], [x, SWH + .55, z], .14, .13, 10, c, M(-1, .2, 0, 0)); g.blob([x, SWH + .58, z], .15, .12, .15, 10, 5, c, M0); g.tube([x - .24, SWH + .38, z], [x + .24, SWH + .38, z], .06, .06, 8, c, M0, true); g.tube([x, SWH + .38, z - .2], [x, SWH + .38, z + .01], .07, .07, 8, c, M0, true); g.tube([x, SWH, z], [x, SWH + .06, z], .2, .2, 10, c, M0); }
  function signal(g, side, s, name) {
    const x = side * 6.1, z = -s, pc = hex('#2a2d30');
    g.tube([x, SWH, z], [x, 6.4, z], .09, .08, 8, pc, M0);
    g.box(x - .2, 4.4, z - .14, x + .2, 5.5, z + .14, hex('#1a1b1d'), M0);
    for (const [y, c, w] of [[5.2, '#ff3b2f', 1.2], [4.7, '#35e07a', 1.4]]) g.box(x - .11, y - .11, z + .14, x + .11, y + .11, z + .16, hex(c), M(-1, 0, 1.6, w));
    const a = x - side * .2, b = x - side * 1.95; g.quad([Math.min(a, b), 6.05, z + .03], [Math.max(a, b), 6.05, z + .03], [Math.max(a, b), 6.45, z + .03], [Math.min(a, b), 6.45, z + .03], [1, 1, 1], M(name, 0, 0, 0), [[0, 1], [1, 1], [1, 0], [0, 0]], [0, 0, 1]);
    g.box(Math.min(a, b), 6.03, z - .01, Math.max(a, b), 6.47, z + .025, hex('#1f6f43'), M0);
  }
  function bike(g, x, s) {
    const z = -s, fr = hex('#24508f'), bk = [.06, .06, .07], w = (zc) => { for (let k = 0; k < 16; k++) { const a0 = k / 16 * Math.PI * 2, a1 = (k + 1) / 16 * Math.PI * 2; g.tube([x, SWH + .34 + Math.sin(a0) * .33, zc + Math.cos(a0) * .33], [x, SWH + .34 + Math.sin(a1) * .33, zc + Math.cos(a1) * .33], .025, .025, 4, bk, M0); } };
    w(z - .52); w(z + .52); const P = (dz, y) => [x, SWH + y, z + dz];
    for (const [a, b] of [[P(-.52, .34), P(-.05, .36)], [P(-.05, .36), P(.42, .88)], [P(-.05, .36), P(-.22, .85)], [P(-.22, .85), P(.42, .88)], [P(-.22, .85), P(-.52, .34)], [P(.52, .34), P(.42, .88)], [P(.42, .88), P(.38, 1.02)]]) g.tube(a, b, .02, .02, 4, fr, M0);
    g.box(x - .07, SWH + .88, z - .32, x + .07, SWH + .92, z - .12, bk, M0); g.tube([x - .25, SWH + 1.02, z + .38], [x + .25, SWH + 1.02, z + .38], .015, .015, 4, bk, M0);
  }
  function subway(g, side, s) {
    const x0 = side * 7.2, x1 = side * 9.4, z0 = -s, z1 = -(s + 4.2), rail = hex('#1f3d2c');
    g.quad([x0, SWH + .004, z0], [x1, SWH + .004, z0], [x1, SWH + .004, z1], [x0, SWH + .004, z1], [.04, .04, .05], M0, undefined, [0, 1, 0]);
    for (const [a, b] of [[[x0, z0], [x0, z1]], [[x1, z0], [x1, z1]], [[x0, z1], [x1, z1]]]) { g.box(Math.min(a[0], b[0]) - .03, SWH + .95, Math.min(a[1], b[1]) - .03, Math.max(a[0], b[0]) + .03, SWH + 1.0, Math.max(a[1], b[1]) + .03, rail, M0);
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = 0; t <= 1.001; t += .25 / (L / 2)) g.box(lerp(a[0], b[0], t) - .02, SWH, lerp(a[1], b[1], t) - .02, lerp(a[0], b[0], t) + .02, SWH + .97, lerp(a[1], b[1], t) + .02, rail, M0); }
    for (const z of [z0, z1 + .0]) { g.tube([x0, SWH + 1, z], [x0, SWH + 2.3, z], .04, .04, 6, rail, M0); g.blob([x0, SWH + 2.4, z], .15, .15, .15, 10, 6, hex('#3fd170'), M(-1, .2, .8, 1)); }
  }
  function newsbox(g, side, s, col) { const x = side * 6.5, z = -s; g.box(x - .25, SWH, z - .25, x + .25, SWH + 1.1, z + .25, hex(col), M(-1, .25, 0, 0)); g.box(x - .26 * side - .01, SWH + .55, z - .18, x - .26 * side + .01, SWH + .95, z + .18, hex('#e9e5d8'), M(-1, .5, 0, 0)); }
  function bin(g, side, s) { const x = side * 6.3, z = -s; g.tube([x, SWH, z], [x, SWH + .85, z], .26, .3, 12, hex('#2d4a33'), M(-1, .2, 0, 0)); g.tube([x, SWH + .85, z], [x, SWH + .88, z], .32, .32, 12, hex('#22382a'), M0, true); }

  /* the city beyond the block, softened by distance */
  function skyline(g) {
    const r = RNG(77);
    for (const side of [1, -1]) for (let s = 160; s < 400;) { const w = 14 + r() * 20, h = 25 + r() * r() * 110; fBox(g, side, s, s + w, 0, h, 0, 30, mixc(hex('#7b7f86'), hex('#9a8c7c'), r()), M0, 2); s += w; }
    // a deco spire at the end of the avenue
    const z = -760, x = -24, c = hex('#a8a29a');
    for (const [w, y0, y1] of [[34, 0, 170], [26, 170, 230], [18, 230, 280], [11, 280, 315], [6, 315, 335]]) g.box(x - w / 2, y0, z - w / 2, x + w / 2, y1, z + w / 2, c, M(-1, .1, 0, 0));
    g.tube([x, 335, z], [x, 395, z], 1.6, .3, 8, c, M0);
    g.box(x - 3.1, 318, z + 3.0, x + 3.1, 332, z + 3.2, hex('#ffe9c0'), M(-1, 0, 1.2, 0));
    for (let i = 0; i < 9; i++) { const xx = -140 + i * 34 + r() * 10, w = 20 + r() * 20, h = 90 + r() * 160; g.box(xx - w / 2, 0, -700 - r() * 160 - w, xx + w / 2, h, -700 - r() * 160, mixc(hex('#8a8e96'), hex('#a39789'), r()), M0); }
  }

  /* build it all */
  const LAMPS = [];
  function buildCity() {
    const g = new Geo();
    street(g);
    const R = [[-30, -8, 22, 'brick', { fire: true }], [-8, 12, 27, 'loft'], [36, 52, 31, 'lime', { tower: true }], [64, 72, 23, 'tan'], [106, 116, 20, 'brick', { fire: true }], [116, 134, 28, 'loft', { tower: true }], [134, 142, 17, 'brown'], [180, 204, 30, 'brick']];
    const L = [[-30, -4, 30, 'lime'], [-4, 12, 18, 'brick', { fire: true, awning: hex('#1f5e46') }], [12, 26, 15.5, 'brown', { tower: true, awning: hex('#7a2a2a') }], [66, 72, 24, 'dark'], [84, 94, 17, 'tan', { awning: hex('#22406b') }], [108, 116, 18.5, 'brown'], [154, 180, 64, 'glass'], [180, 204, 38, 'tan']];
    let k = 0;
    for (const [list, side] of [[R, 1], [L, -1]]) for (const [s0, s1, h, style, ex] of list) { k++; const b = { side, s0, s1, h, style, seed: k * 31 + 7, ...(ex || {}) }; if (style === 'glass') glassTower(g, b); else building(g, b); }
    ORGS.forEach(o => orgBuilding(g, o)); comics(g); music(g); theater(g);
    // the ghost sign on a side wall that pokes above its neighbour
    { const x = fx(1, 4), z0 = -35.98; g.quad([x, 30.2, z0], [x + 8.6, 30.2, z0], [x + 8.6, 25, z0], [x, 25, z0], [1, 1, 1], M(S.ghost), [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, 1]); }
    for (const [side, s] of [[1, 4], [-1, 19], [1, 41], [-1, 67], [1, 69], [-1, 88], [1, 112], [-1, 113], [1, 139], [-1, 140], [1, 157], [-1, 158], [1, 183], [-1, 184]]) lamp(g, side, s);
    for (const [side, s, sd] of [[1, 6, 1], [-1, 9, 2], [1, 46, 3], [-1, 70, 4], [-1, 89, 5], [1, 113.5, 6], [-1, 111, 7], [1, 188, 8], [-1, 171, 9]]) tree(g, side, s, sd);
    // no parked cars, hydrants, bikes, news boxes, bins or subway entrance: the walk and the walk-in to each door stay clear
    for (const [s0, s1, name] of CROSS) { const sn = name === 'Bayes St' ? S.bayes : S.gradient; signal(g, 1, s0 - .8, sn); signal(g, -1, s0 - .8, sn); }
    skyline(g);
    return g;
  }
  function doorGeo(o) { // a glass door with a metal frame, hinged at its edge (local: hinge at origin, door along +z)
    const g = new Geo(), acc = hex(o.accent), w = 1.8, h = 2.95, t = .06, fr = sh(acc, .55);
    g.box(-t, 0, 0, t, h, .08, fr, M0); g.box(-t, 0, w - .08, t, h, w, fr, M0); g.box(-t, h - .1, 0, t, h, w, fr, M0); g.box(-t, 0, 0, t, .14, w, fr, M0);
    g.quad([0, .14, .08], [0, .14, w - .08], [0, h - .1, w - .08], [0, h - .1, .08], hex('#ffe3b0'), M(-1, .4, .35, 0), undefined, [1, 0, 0]);
    g.box(-.16, 1.0, w - .32, .16, 1.9, w - .26, hex('#d8d2c2'), M(-1, .5, 0, 0));
    return g;
  }

  /* =========================================================
     WEBGL
     ========================================================= */
  const VS = `#version 300 es
  layout(location=0) in vec3 a_pos; layout(location=1) in vec3 a_nrm; layout(location=2) in vec2 a_uv; layout(location=3) in vec3 a_col; layout(location=4) in vec4 a_mat;
  uniform mat4 u_vp, u_model, u_svp; uniform float u_time;
  out vec3 v_wp; out vec3 v_n; out vec2 v_uv; out vec3 v_col; out vec4 v_mat; out vec4 v_sp;
  void main(){ vec3 p=a_pos; if(a_mat.w<0.){ float k=clamp((p.y-3.)*.12,0.,1.); p.x+=sin(u_time*1.4+p.z*.35+p.y*.5)*.05*k; p.z+=cos(u_time*1.1+p.x*.4)*.04*k; }
    vec4 wp=u_model*vec4(p,1.); v_wp=wp.xyz; v_n=mat3(u_model)*a_nrm; vec2 uv=a_uv; if(a_mat.w>1.9) uv.x+=u_time*(a_mat.w-2.); v_uv=uv; v_col=a_col; v_mat=a_mat; v_sp=u_svp*wp; gl_Position=u_vp*wp; }`;
  const FS = `#version 300 es
  precision highp float; precision highp sampler2DArray; precision highp sampler2DShadow;
  in vec3 v_wp; in vec3 v_n; in vec2 v_uv; in vec3 v_col; in vec4 v_mat; in vec4 v_sp;
  uniform sampler2DArray u_tiles, u_signs; uniform sampler2DShadow u_shadow;
  uniform vec3 u_sun, u_sunCol, u_sky, u_gnd, u_fog, u_cam, u_zen, u_hor, u_city; uniform float u_fogD, u_night, u_time, u_boost, u_exp, u_texel;
  uniform vec4 u_pl[8]; uniform vec3 u_plc; uniform int u_nl;
  out vec4 o;
  vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
  vec3 env(vec3 r){ float y=r.y; vec3 sky=mix(u_hor,u_zen,pow(clamp(y,0.,1.),.5)); vec3 c=mix(u_city, sky, smoothstep(.02,.38,y)); if(y<0.) c=mix(u_city*.7, u_gnd*.6, smoothstep(0.,-.3,y)); return c; }
  void main(){
    float L=v_mat.x; vec3 alb=lin(v_col);
    if(L>=99.5) alb*=lin(texture(u_signs, vec3(v_uv, L-100.)).rgb); else if(L>=0.){ vec4 tx=texture(u_tiles, vec3(v_uv, L)); if(v_mat.w<-.5&&tx.a<.5) discard; alb*=lin(tx.rgb); }
    vec3 n=normalize(v_n), V=normalize(u_cam-v_wp); if(v_mat.w>-.5&&dot(n,V)<0.) n=-n;
    float refl=v_mat.y, sh=1.;
    vec3 sc=v_sp.xyz/v_sp.w*.5+.5;
    if(sc.x>0.&&sc.x<1.&&sc.y>0.&&sc.y<1.&&sc.z<1.){ float b=.0009+.0016*(1.-abs(dot(n,u_sun))); sh=0.; vec2 t=vec2(u_texel);
      sh+=texture(u_shadow,vec3(sc.xy+vec2(-.5,-.5)*t,sc.z-b)); sh+=texture(u_shadow,vec3(sc.xy+vec2(.5,-.5)*t,sc.z-b)); sh+=texture(u_shadow,vec3(sc.xy+vec2(-.5,.5)*t,sc.z-b)); sh+=texture(u_shadow,vec3(sc.xy+vec2(.5,.5)*t,sc.z-b)); sh*=.25; }
    float ndl=max(dot(n,u_sun),0.);
    vec3 amb=mix(u_gnd,u_sky,n.y*.5+.5)*(.75+.25*clamp(v_wp.y*.08,0.,1.));
    vec3 dif = refl>.5 ? alb*.06 : alb; if(v_mat.z>0.&&v_mat.w>=1.15&&v_mat.w<1.5) dif*=.08;
    vec3 col=dif*(amb+u_sunCol*ndl*sh);
    for(int i=0;i<8;i++){ if(i>=u_nl) break; vec3 l=u_pl[i].xyz-v_wp; float d2=dot(l,l); col+=dif*u_plc*u_pl[i].w*(max(dot(n,normalize(l)),0.)*.85+.15)/(1.+d2*.45); }
    vec3 H=normalize(u_sun+V); col+=u_sunCol*sh*ndl*pow(max(dot(n,H),0.), refl>0.?180.:20.)*(refl>0.?1.6*refl:.03);
    if(refl>0.){ vec3 R=reflect(-V,n); float f=refl*(.04+.96*pow(1.-max(dot(n,V),0.),4.)); if(refl>.5) f=max(f, refl*.32); col=mix(col, env(R), f); }
    float e=v_mat.z; if(e>0.){ float w=v_mat.w, k; if(w<.5) k=u_night; else if(w<1.1) k=.4+.6*u_night; else if(w<1.3) k=step(.5,fract(u_time/16.)); else if(w<1.5) k=1.-step(.5,fract(u_time/16.)); else k=.6+.4*u_night; col+=alb*e*k*1.7; }
    col+=alb*u_boost;
    float d=length(v_wp-u_cam), fg=1.-exp(-d*u_fogD); fg*=fg>0.?1.:0.; col=mix(col,u_fog,clamp(fg,0.,1.));
    o=vec4(pow(aces(col*u_exp),vec3(1./2.2)),1.);
  }`;
  const SVS = `#version 300 es
  layout(location=0) in vec3 a_pos; layout(location=2) in vec2 a_uv; layout(location=4) in vec4 a_mat; uniform mat4 u_svp, u_model; uniform float u_time; out vec2 v_uv; out vec2 v_lw;
  void main(){ vec3 p=a_pos; v_uv=a_uv; v_lw=a_mat.xw; gl_Position=u_svp*u_model*vec4(p,1.); }`;
  const SFS = `#version 300 es
  precision mediump float; precision mediump sampler2DArray; uniform sampler2DArray u_tiles; in vec2 v_uv; in vec2 v_lw; out vec4 o;
  void main(){ if(v_lw.y<-.5&&v_lw.x>=0.&&v_lw.x<99.5){ if(texture(u_tiles,vec3(v_uv,v_lw.x)).a<.5) discard; } o=vec4(1.); }`;
  const SKYVS = `#version 300 es
  out vec2 v; void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2)*2.-1.; v=p; gl_Position=vec4(p,.9999,1.); }`;
  const SKYFS = `#version 300 es
  precision highp float; in vec2 v; out vec4 o;
  uniform mat4 u_ivp; uniform vec3 u_sun, u_moon, u_zen, u_hor, u_glow, u_cloud; uniform float u_night, u_time, u_exp, u_sunVis;
  float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float nz(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*nz(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
  void main(){
    vec4 a=u_ivp*vec4(v,1.,1.), b=u_ivp*vec4(v,-1.,1.); vec3 d=normalize(a.xyz/a.w-b.xyz/b.w);
    float y=d.y; vec3 c=mix(u_hor,u_zen,pow(clamp(y,0.,1.),.42)); if(y<0.) c=u_hor*.9;
    float sd=max(dot(d,u_sun),0.); c+=u_glow*(pow(sd,6.)*.35+pow(sd,60.)*.6)*u_sunVis; c+=vec3(1.,.92,.78)*smoothstep(.9994,.9997,sd)*8.*u_sunVis;
    if(y>0.){ vec2 cp=d.xz/(y+.1)*.55+vec2(u_time*.006,u_time*.002); float cl=smoothstep(.5,.82,fbm(cp*1.4))*smoothstep(0.,.18,y); vec3 cc=u_cloud*(.85+.3*fbm(cp*3.+3.)); c=mix(c,cc,cl*.85*(1.-u_night*.8)); }
    if(u_night>.01&&y>0.){ vec2 g=vec2(atan(d.z,d.x),asin(clamp(y,-1.,1.)))*vec2(110.,110.); vec2 id=floor(g), f=fract(g)-.5; float hh=h21(id); if(hh>.955){ vec2 o2=vec2(h21(id+3.1),h21(id+7.7))-.5; float s=smoothstep(.12,0.,length(f-o2*.6)); float tw=.6+.4*sin(u_time*(1.5+hh*3.)+hh*40.); c+=vec3(.9,.93,1.)*s*tw*u_night*(.6+2.5*(hh-.955)/.045)*smoothstep(.0,.1,y); } }
    float md=dot(d,u_moon); c+=vec3(.95,.93,.86)*smoothstep(.99955,.9997,md)*1.4*u_night + vec3(.6,.7,.9)*pow(max(md,0.),40.)*.12*u_night;
    o=vec4(pow(aces(c*u_exp),vec3(1./2.2)),1.);
  }`;
  function prog(vs, fs) { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const sh_ = gl.createShader(t); gl.shaderSource(sh_, s); gl.compileShader(sh_); if (!gl.getShaderParameter(sh_, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh_)); gl.attachShader(p, sh_); } gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const U = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); U[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); } return { p, U }; }
  function upload(g) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.v), gl.STATIC_DRAW);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(g.i), gl.STATIC_DRAW);
    const st = 60; [[0, 3, 0], [1, 3, 12], [2, 2, 24], [3, 3, 32], [4, 4, 44]].forEach(([l, n, o]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, st, o); });
    gl.bindVertexArray(null); return { vao, n: g.i.length };
  }
  function texArray(list, w, h, unit) {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, w, h, Math.max(1, list.length), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    list.forEach((c, i) => gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, w, h, 1, gl.RGBA, gl.UNSIGNED_BYTE, c));
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const af = gl.getExtension('EXT_texture_filter_anisotropic'); if (af) gl.texParameterf(gl.TEXTURE_2D_ARRAY, af.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(af.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return t;
  }

  /* ---------- matrices (column-major) ---------- */
  const m4 = {
    mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
    persp(fy, asp, n, f) { const t = 1 / Math.tan(fy / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
    ortho(l, r, b, t, n, f) { const o = new Float32Array(16); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o; },
    look(e, c, up) { const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x); return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1]); },
    inv(m) { const o = new Float32Array(16), a = m; const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6], b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
      const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
      o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d; o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d; o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d; o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d; return o; },
    tr(x, y, z, ry = 0) { const c = Math.cos(ry), s = Math.sin(ry); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, x, y, z, 1]); },
  };
  const ID = m4.tr(0, 0, 0);

  /* =========================================================
     THE WALKER
     ========================================================= */
  const cam = { s: 0, target: 0, v: 0, phase: 0, amp: 0, x: CAMX, heading: 0, yOff: 0 };
  window.__walk = cam;
  const look = { yaw: 0, pitch: -.02, ty: 0, tp: -.02 };
  let mode = 'walk';
  function walk(dt) {
    if (mode === 'walk') {
      const want = clamp((cam.target - cam.s) * 2.6, -6.2, 6.2);
      cam.v = lerp(cam.v, want, 1 - Math.exp(-dt * 5)); if (Math.abs(cam.target - cam.s) < .01 && Math.abs(cam.v) < .05) cam.v = 0;
      cam.s += cam.v * dt;
    }
    const speed = Math.abs(mode === 'walk' ? cam.v : enterSpeed);
    cam.amp = lerp(cam.amp, clamp(speed / 3, 0, 1), 1 - Math.exp(-dt * 4));
    cam.phase += speed * dt / 1.5;               // one stride ≈ 1.5 m (two steps)
    look.yaw = lerp(look.yaw, mode === 'walk' ? look.ty : 0, 1 - Math.exp(-dt * 5)); look.pitch = lerp(look.pitch, mode === 'walk' ? look.tp : -.02, 1 - Math.exp(-dt * 5));
  }
  let enterSpeed = 0;

  /* =========================================================
     TIME OF DAY
     ========================================================= */
  const DAY = { zen: hex('#3b78c4'), hor: hex('#bcd3e6'), sun: [3.1, 2.95, 2.7], sky: [.62, .72, .88], gnd: [.4, .37, .33], fog: hex('#b9cad9'), glow: [1.2, 1.0, .8], cloud: [1.25, 1.25, 1.25], city: hex('#8a8580') };
  const DUSK = { zen: hex('#33416e'), hor: hex('#f0a868'), sun: [2.6, 1.35, .62], sky: [.42, .38, .5], gnd: [.3, .24, .2], fog: hex('#c49478'), glow: [2.2, 1.0, .4], cloud: [1.4, .9, .7], city: hex('#6e5550') };
  const NIGHT = { zen: hex('#02040b'), hor: hex('#141c30'), sun: [.05, .065, .11], sky: [.035, .045, .08], gnd: [.02, .02, .03], fog: hex('#141c2e'), glow: [0, 0, 0], cloud: [.12, .13, .18], city: hex('#1d2232') };
  function sky(s) {
    const night = sstep(96, 120, s), dusk = Math.sin(Math.PI * clamp((s - 70) / 50, 0, 1));
    const mx = (k) => { const a = mixc(DAY[k], DUSK[k], clamp(dusk * 1.2, 0, 1)); return mixc(a, NIGHT[k], night); };
    const u = sstep(15, 112, s), sun = norm(add(sc(norm([.55, .78, .3]), 1 - u), sc(norm([.05, .045, -1]), u)));
    const L_ = c => c.map(v => Math.pow(v, 2.2));
    return { night, dusk, sun, zen: L_(mx('zen')), hor: L_(mx('hor')), sunCol: mx('sun'), skyC: mx('sky'), gnd: mx('gnd'), fog: L_(mx('fog')), glow: mx('glow'), cloud: mx('cloud'), city: L_(mx('city')), sunVis: 1 - night };
  }

  /* =========================================================
     RENDER
     ========================================================= */
  let P, SP, KP, city, doors = [], crossCars = [], shadowFB, shadowTex, SHS = 2048, ready = false, tNow = 0, lastT = performance.now(), W = 0, H = 0, VP = ID;
  let qual = 1; const DPR = () => Math.min(devicePixelRatio || 1, SMALL ? 1.25 : 1.5) * qual;
  function resize() { W = innerWidth; H = innerHeight; cv.width = Math.round(W * DPR()); cv.height = Math.round(H * DPR()); lastDraw = 0; }
  async function init() {
    if (!gl) return;
    try { await Promise.race([Promise.all(['700 40px Inter', '600 40px "JetBrains Mono"', '700 40px Cinzel', '40px UnifrakturMaguntia', '40px Bangers'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch (e) { /* fall back to system fonts */ }
    makeSigns();
    P = prog(VS, FS); SP = prog(SVS, SFS); KP = prog(SKYVS, SKYFS);
    city = upload(buildCity());
    ORGS.forEach(o => { doors.push({ o, mesh: upload(doorGeo(o)), open: 0 }); });
    crossCars = []; // nothing crosses the walk path
    texArray(tiles, TS, TS, 0); texArray(signs, SW, SH, 1);
    SHS = SMALL ? 1024 : 2048;
    shadowTex = gl.createTexture(); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHS, SHS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    shadowFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    resize(); addEventListener('resize', resize);
    ready = true; document.body.classList.add('gl-ready'); requestAnimationFrame(frame);
  }
  function drawList() {
    const out = [{ mesh: city, model: ID }];
    doors.forEach(d => { const o = d.o, side = o.side, x = fx(side, o.doorD - .02), hz = -(o.door - .9); out.push({ mesh: d.mesh, model: m4.tr(x, 0, hz, Math.PI - side * d.open * 1.35), boost: d.boost || 0 }); });
    crossCars.forEach(c => { const x = c.dir * (((tNow * c.v + c.off) % 220) - 110); if (Math.abs(cam.s - c.lane) < 160) out.push({ mesh: c.mesh, model: m4.tr(x, 0, -c.lane, -c.dir * Math.PI / 2), noShadow: true }); });
    return out;
  }
  let lastDraw = 0, shadowKey = '', SVPc = ID, slow = 0, fast = 0;
  function frame(n) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (n - lastT) / 1000); lastT = n; tNow += dt;
    const ly = look.yaw, lp = look.pitch, s0_ = cam.s, gl0 = glance;
    walk(dt); ui(dt);
    if (mode === 'inside' || document.hidden) return;                     // nothing to see behind the card
    const moving = Math.abs(cam.s - s0_) > 1e-4 || Math.abs(look.yaw - ly) > 1e-4 || Math.abs(look.pitch - lp) > 1e-4 || Math.abs(glance - gl0) > 1e-4 || mode !== 'walk';
    if (!moving && n - lastDraw < 1000 / 24) return;                       // standing still: a calm 24 fps for the ticker and the traffic
    // a device that can't keep up gets fewer pixels
    if (moving && lastDraw) { const ft = n - lastDraw; if (ft > 45) { slow++; fast = 0; } else if (ft < 20) { fast++; slow = 0; } if (slow > 40 && qual > .6) { qual = Math.max(.6, qual - .15); slow = 0; resize(); } }
    lastDraw = n;
    draw(dt);
  }
  function draw(dt) {
    const env = sky(cam.s);
    // the eye: position, a light step in the stride, the gaze
    const bobY = Math.abs(Math.sin(cam.phase * Math.PI * 2)) * .022 * cam.amp * (RM ? 0 : 1), bobX = Math.sin(cam.phase * Math.PI * 2) * .012 * cam.amp * (RM ? 0 : 1);
    const head = cam.heading + look.yaw + (mode === 'walk' ? glance : 0), eyeS = cam.s, ex = cam.x + bobX * Math.cos(head), ey = EYE + bobY - .011 * cam.amp, ez = -eyeS + bobX * Math.sin(head);
    const fwd = [Math.sin(head) * Math.cos(look.pitch), Math.sin(look.pitch), -Math.cos(head) * Math.cos(look.pitch)];
    const eye = [ex, ey, ez], roll = Math.sin(cam.phase * Math.PI * 2) * .0016 * cam.amp, up = [Math.sin(roll) * Math.cos(head), Math.cos(roll), Math.sin(roll) * Math.sin(head)];
    const asp = W / H, fov = (asp < .8 ? 72 : asp < 1.2 ? 66 : 58) * Math.PI / 180;
    const proj = m4.persp(fov, asp, .2, 1400), view = m4.look(eye, add(eye, fwd), up); VP = m4.mul(proj, view);
    // shadows: an orthographic box around where you are looking
    const ctr = [cam.x + fwd[0] * 40, 0, ez + fwd[2] * 40], sd = env.sun[1] > .02 ? env.sun : [.3, .8, .2], R = 72, tex = (2 * R) / SHS;
    const lv = m4.look(add(ctr, sc(sd, 220)), ctr, [0, 1, 0]);
    const lp = [lv[12], lv[13]]; const snapX = Math.round(lp[0] / tex) * tex - lp[0], snapY = Math.round(lp[1] / tex) * tex - lp[1]; lv[12] += snapX; lv[13] += snapY;
    const list = drawList();
    const key = [Math.round(ctr[0] / 3), Math.round(ctr[2] / 3), env.sun.map(v => v.toFixed(3)).join(), doors.map(d => d.open.toFixed(2)).join()].join('|');
    let SVP = SVPc;
    if (key === shadowKey) { /* the shadows haven't changed: reuse them */ }
    else if (env.sun[1] > .02 && env.night < .97) { shadowKey = key; SVP = SVPc = m4.mul(m4.ortho(-R, R, -R, R, 20, 520), lv);
      gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB); gl.viewport(0, 0, SHS, SHS); gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.6, 3); gl.useProgram(SP.p); gl.uniformMatrix4fv(SP.U.u_svp, false, SVP); gl.uniform1f(SP.U.u_time, tNow); gl.uniform1i(SP.U.u_tiles, 0);
      list.forEach(d => { if (d.noShadow) return; gl.uniformMatrix4fv(SP.U.u_model, false, d.model); gl.bindVertexArray(d.mesh.vao); gl.drawElements(gl.TRIANGLES, d.mesh.n, gl.UNSIGNED_INT, 0); });
      gl.disable(gl.POLYGON_OFFSET_FILL);
    } else { shadowKey = key; gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB); gl.viewport(0, 0, SHS, SHS); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height);
    const exp = lerp(1.0, 1.25, env.night);
    // sky
    gl.disable(gl.DEPTH_TEST); gl.useProgram(KP.p); gl.uniformMatrix4fv(KP.U.u_ivp, false, m4.inv(VP));
    const moon = norm([-.35, .42, -.84]);
    gl.uniform3fv(KP.U.u_sun, env.sun); gl.uniform3fv(KP.U.u_moon, moon); gl.uniform3fv(KP.U.u_zen, env.zen); gl.uniform3fv(KP.U.u_hor, env.hor); gl.uniform3fv(KP.U.u_glow, env.glow); gl.uniform3fv(KP.U.u_cloud, env.cloud);
    gl.uniform1f(KP.U.u_night, env.night); gl.uniform1f(KP.U.u_time, tNow); gl.uniform1f(KP.U.u_exp, exp); gl.uniform1f(KP.U.u_sunVis, env.sunVis);
    gl.bindVertexArray(null); gl.drawArrays(gl.TRIANGLES, 0, 3);
    // the street
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(P.p); const U = P.U;
    gl.uniformMatrix4fv(U.u_vp, false, VP); gl.uniformMatrix4fv(U.u_svp, false, SVP); gl.uniform1f(U.u_time, tNow);
    gl.uniform1i(U.u_tiles, 0); gl.uniform1i(U.u_signs, 1); gl.uniform1i(U.u_shadow, 2);
    const sunOn = env.sun[1] > .02 ? 1 : 0, sunL = env.night > .5 ? moon : env.sun;
    gl.uniform3fv(U.u_sun, sunL); gl.uniform3fv(U.u_sunCol, sh(env.sunCol, sunOn || env.night > .5 ? 1 : 0)); gl.uniform3fv(U.u_sky, env.skyC); gl.uniform3fv(U.u_gnd, env.gnd);
    gl.uniform3fv(U.u_fog, env.fog); gl.uniform3fv(U.u_cam, eye); gl.uniform3fv(U.u_zen, env.zen); gl.uniform3fv(U.u_hor, env.hor); gl.uniform3fv(U.u_city, env.city);
    gl.uniform1f(U.u_fogD, lerp(.003, .0058, env.night)); gl.uniform1f(U.u_night, env.night); gl.uniform1f(U.u_exp, exp); gl.uniform1f(U.u_texel, 1 / SHS);
    const near = LAMPS.map(p => [p, (p[2] + cam.s) ** 2 + (p[0] - cam.x) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 8), pl = new Float32Array(32);
    near.forEach(([p], i) => { pl[i * 4] = p[0]; pl[i * 4 + 1] = p[1]; pl[i * 4 + 2] = p[2]; pl[i * 4 + 3] = sstep(.35, .9, env.night) * 15; });
    gl.uniform4fv(U.u_pl, pl); gl.uniform3fv(U.u_plc, [1.0, .72, .42]); gl.uniform1i(U.u_nl, env.night > .35 ? 8 : 0);
    list.forEach(d => { gl.uniformMatrix4fv(U.u_model, false, d.model); gl.uniform1f(U.u_boost, d.boost || 0); gl.bindVertexArray(d.mesh.vao); gl.drawElements(gl.TRIANGLES, d.mesh.n, gl.UNSIGNED_INT, 0); });
    gl.bindVertexArray(null);
  }
  function project(p) { const x = p[0], y = p[1], z = p[2], m = VP, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15]; if (cw <= .1) return null; return [(cx / cw * .5 + .5) * W, (1 - (cy / cw * .5 + .5)) * H]; }

  /* =========================================================
     UI
     ========================================================= */
  const title = document.getElementById('walkTitle'), tag = document.getElementById('buzz'), endEl = document.getElementById('walkEnd'), passEl = document.getElementById('walkPass'), passRing = document.getElementById('passRing');
  const map = document.getElementById('walkMap');
  map.innerHTML = ORGS.map((o, i) => `<button class="pin" data-i="${i}" style="left:${(o.door / (ZMAX + 4) * 100).toFixed(1)}%" aria-label="Walk to ${o.org}"><span>${o.pin}</span><i></i></button>`).join('') + '<span class="me" id="me"></span>';
  const me = document.getElementById('me'), seen = new Set();
  map.querySelectorAll('.pin').forEach(b => b.addEventListener('click', () => { if (mode !== 'walk') return; const i = +b.dataset.i; STOPS.forEach((st, k) => { st.passed = k < i; }); cam.target = STOPS[i].s; push = 0; }));
  let near = null, push = 0, pushT = 0, tagFor = null, glance = 0;
  const atStop = () => STOPS.find(st => !st.passed && Math.abs(cam.s - st.s) < .5 && Math.abs(cam.target - st.s) < .5);
  function ui(dt) {
    if (cam.s > 1.2 || mode !== 'walk') title.classList.add('gone'); else title.classList.remove('gone');
    me.style.left = (clamp(cam.s / (ZMAX + 4), 0, 1) * 100).toFixed(2) + '%';
    endEl.hidden = !(cam.s > ZMAX - 3 && mode === 'walk');
    near = mode === 'walk' ? ORGS.find(o => o.door - cam.s > 3 && o.door - cam.s < 23) : null;
    glance = lerp(glance, near ? near.side * .34 * sstep(23, 16, near.door - cam.s) * (1 - sstep(9, 4, near.door - cam.s)) : 0, 1 - Math.exp(-dt * 2.2));
    doors.forEach(d => { d.boost = near === d.o ? .18 + .14 * Math.sin(tNow * 3.2) : 0; });
    if (near && ready) {
      const p = project([fx(near.side, -.05), 1.7, -near.door]);
      if (tagFor !== near) { tagFor = near; tag.style.setProperty('--acc', near.accent); tag.querySelector('.dt-org').textContent = near.org; tag.querySelector('.dt-role').textContent = near.role; tag.querySelector('.dt-date').textContent = near.dates; }
      tag.hidden = false; requestAnimationFrame(() => tag.classList.add('show'));
      if (p) { const w = tag.offsetWidth, h = tag.offsetHeight, gap = 46, left = near.side > 0;
        const narrow = W < 600, x = narrow ? (W - w) / 2 : clamp(left ? p[0] - w - gap : p[0] + gap, 14, W - w - 14), y = narrow ? H - h - 150 : clamp(p[1] - h * .62, 80, H - h - 118);
        tag.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`; tag.classList.toggle('to-r', left); tag.classList.toggle('to-l', !left);
        const reach = left ? p[0] - (x + w) : x - p[0]; tag.style.setProperty('--reach', `${clamp(reach, 0, 400).toFixed(0)}px`); tag.style.setProperty('--sy', `${clamp(p[1] - y, 16, h - 16).toFixed(0)}px`); tag.classList.toggle('flat', narrow || reach < 8 || p[1] < y || p[1] > y + h); }
    } else { tag.classList.remove('show'); tag.hidden = true; tagFor = null; }
    if (performance.now() - pushT > 900) push = Math.max(0, push - dt * 30);
    const st = atStop(); passEl.hidden = !(st && mode === 'walk'); if (st) passRing.style.setProperty('--p', clamp(push / 16, 0, 1).toFixed(3));
  }

  /* ---------- input: scroll walks, deliberately past each door; pointer looks around ---------- */
  function go(d) {
    if (mode !== 'walk') return;
    if (d > 0) {
      const st = atStop();
      if (st) { push += d; pushT = performance.now(); if (push < 16) return; st.passed = true; push = 0; }
      const next = STOPS.find(s => !s.passed && s.s > cam.target - .01);
      let tgt = cam.target + d; if (next && tgt > next.s) tgt = next.s;
      cam.target = clamp(Math.min(tgt, cam.s + 14), 0, ZMAX);
    } else { cam.target = clamp(Math.max(cam.target + d, cam.s - 14), 0, ZMAX); STOPS.forEach(s => { if (s.s > cam.target + 1) s.passed = false; }); }
  }
  addEventListener('wheel', e => { if (mode !== 'walk' || e.target.closest('.wmodal')) return; e.preventDefault(); const dy = e.deltaMode ? e.deltaY * 30 : e.deltaY, dx = e.deltaMode ? e.deltaX * 30 : e.deltaX; if (Math.abs(dx) > Math.abs(dy)) { look.ty = clamp(look.ty + dx * .0025, -.6, .6); return; } go(dy * .035); }, { passive: false });
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && mode === 'walk') { look.ty = clamp((e.clientX / innerWidth - .5) * 1.0, -.55, .55); look.tp = clamp(-.02 + (e.clientY / innerHeight - .5) * -.26, -.15, .13); } }, { passive: true });
  document.addEventListener('mouseleave', () => { look.ty = 0; look.tp = -.02; });
  addEventListener('keydown', e => { if (mode === 'inside' && e.key === 'Escape') return leave(); if (mode !== 'walk') return; const k = e.key; if (k === 'ArrowUp' || k === 'w' || k === 'PageDown' || k === ' ') { go(k === 'PageDown' || k === ' ' ? 10 : 3); e.preventDefault(); } if (k === 'ArrowDown' || k === 's' || k === 'PageUp') { go(k === 'PageUp' ? -10 : -3); e.preventDefault(); } if (k === 'ArrowLeft') look.ty = clamp(look.ty - .12, -.6, .6); if (k === 'ArrowRight') look.ty = clamp(look.ty + .12, -.6, .6); if (k === 'Enter' && near) enter(near); });
  let tp = null; addEventListener('touchstart', e => { tp = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
  addEventListener('touchmove', e => { if (!tp || mode !== 'walk') return; const x = e.touches[0].clientX, y = e.touches[0].clientY, dx = x - tp[0], dy = y - tp[1]; if (Math.abs(dx) > Math.abs(dy)) look.ty = clamp(look.ty - dx * .004, -.6, .6); else go(-dy * .06); tp = [x, y]; }, { passive: true });
  addEventListener('touchend', () => { tp = null; });
  tag.addEventListener('click', () => near && enter(near));

  /* ---------- stepping inside: turn to the door, walk up to it, it opens, you go in ---------- */
  const modal = document.getElementById('wmodal'), card = document.getElementById('wmCard');
  const EXIT = '<button class="wm-exit" type="button" id="wmExit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>EXIT</button>';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function animate(T_, fn) { return new Promise(res => { const t0 = performance.now(); const tick = n => { const u = clamp((n - t0) / 1000 / T_, 0, 1); fn(u); if (u < 1) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); }); }
  let from = null;
  async function enter(o) {
    if (mode !== 'walk') return; mode = 'entering'; cam.target = cam.s; cam.v = 0; tag.classList.remove('show'); tag.hidden = true; passEl.hidden = true;
    const d = doors.find(q => q.o === o); from = { s: cam.s, x: cam.x, heading: cam.heading, d };
    const ang = Math.atan2(o.side * (F - 1.2 - cam.x), (o.door - cam.s)), tx = o.side * (F - 1.1), ts = o.door;
    if (RM) { fade.style.opacity = 1; await wait(200); }
    else {
      await animate(.55, u => { const e = u * u * (3 - 2 * u); cam.heading = lerp(from.heading, ang, e); });
      const sx = cam.x, ss = cam.s, dist = Math.hypot(tx - sx, ts - ss);
      let last = 0; await animate(Math.max(1.4, dist / 3.2), u => { const e = u < .85 ? u / .85 : 1, k = 1 - Math.pow(1 - e, 1.6); cam.x = lerp(sx, tx, k); cam.s = lerp(ss, ts, k); cam.heading = lerp(ang, o.side * Math.PI / 2, sstep(.35, 1, u)); enterSpeed = (k - last) * dist * 60; last = k; d.open = sstep(.55, .95, u); if (u > .78) fade.style.opacity = sstep(.78, 1, u); });
      enterSpeed = 0;
    }
    fade.style.opacity = 1; await wait(120);
    openModal(expHTML(o.entries) + EXIT); wireTabs();
    seen.add(o.idx); map.querySelector(`.pin[data-i="${o.idx}"]`).classList.add('seen');
  }
  const esc = t => String(t);
  function logoHTML(e) { const img = e.logo ? `<img src="${e.logo}" alt="" onerror="this.parentNode.classList.add('none');this.remove()">` : ''; return `<div class="wm-logo${img ? '' : ' none'}" style="--acc:${e.accent}">${img}<span>${e.mono || e.org.replace(/^The /, '').slice(0, 1)}</span></div>`; }
  function entryHTML(e) {
    const L = e.labels || ['About the organisation', 'My role', 'Domains', 'Tech stack'];
    const depth = e.depth.map(b => (b.h ? `<h4>${b.h}</h4>` : '') + (b.p ? `<p>${b.p}</p>` : '') + (b.ul ? `<ul>${b.ul.map(x => `<li>${x}</li>`).join('')}</ul>` : '')).join('');
    return `<div class="wm-head">${logoHTML(e)}<div><h2 id="wmOrg">${e.org}</h2><p>${e.role}</p><p class="wm-meta">${e.dates} · ${e.place}</p></div></div>
      <div class="wm-grid">
        <section class="wm-c"><h3>${L[0]}</h3><p>${e.about}</p></section>
        <section class="wm-c"><h3>${L[1]}</h3><p>${e.summary}</p></section>
        <section class="wm-c"><h3>${L[2]}</h3><div class="wm-chips">${e.domains.map(d => `<span>${d}</span>`).join('')}</div></section>
        <section class="wm-c"><h3>${L[3]}</h3><dl class="wm-stack">${e.stack.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></section>
      </div>
      <div class="wm-depth"><h3>${e.kind === 'edu' ? 'In depth' : 'The role in depth'}</h3>${depth}</div>`;
  }
  function expHTML(list) {
    const top = `<div class="wm-top"><a class="wm-tldr" href="${SITE.resume}" download><b>TL;DR</b> download résumé <i>↓</i></a></div>`;
    if (list.length === 1) return top + `<div class="wm-pane" style="--acc:${list[0].accent}">${entryHTML(list[0])}</div>`;
    const lbl = e => e.key === 'njms' ? 'NJ Medical School' : e.key === 'rutgers-ra' ? 'Statistics RA' : e.key === 'rutgers-ms' ? 'M.S. Statistics' : e.key === 'srm' ? 'B.Tech · SRM' : e.org;
    return top + `<div class="wm-tabs" role="tablist">${list.map((e, i) => `<button role="tab" class="${i ? '' : 'on'}" data-i="${i}">${lbl(e)}<small>${e.dates}</small></button>`).join('')}</div>` +
      list.map((e, i) => `<div class="wm-pane" style="--acc:${e.accent}" ${i ? 'hidden' : ''}>${entryHTML(e)}</div>`).join('');
  }
  function wireTabs() { const tb = card.querySelectorAll('.wm-tabs button'), panes = card.querySelectorAll('.wm-pane'); tb.forEach(b => b.addEventListener('click', () => { tb.forEach(x => x.classList.toggle('on', x === b)); panes.forEach((p, i) => p.hidden = i !== +b.dataset.i); card.scrollTop = 0; })); }
  function openModal(html) { card.innerHTML = html; modal.hidden = false; requestAnimationFrame(() => modal.classList.add('show')); mode = 'inside'; card.scrollTop = 0; const x = document.getElementById('wmExit'); x.addEventListener('click', leave); x.focus({ preventScroll: true }); requestAnimationFrame(() => { card.scrollTop = 0; }); }
  async function leave() {
    if (mode !== 'inside') return; mode = 'leaving';
    modal.classList.remove('show'); await wait(260); modal.hidden = true;
    if (from) {
      const d = from.d;
      const sx = cam.x, ss = cam.s, sh0 = cam.heading; fade.style.opacity = 0;
      await animate(RM ? .01 : 1.1, u => { const e = u * u * (3 - 2 * u); cam.x = lerp(sx, from.x, e); cam.s = lerp(ss, from.s, e); cam.heading = lerp(sh0, from.heading, sstep(.2, 1, u)); enterSpeed = 2.4 * Math.sin(Math.PI * u); if (d) d.open = 1 - sstep(.3, .9, u); });
      enterSpeed = 0; cam.target = cam.s; from = null;
    } else fade.style.opacity = 0;
    mode = 'walk';
  }
  modal.addEventListener('click', e => { if (e.target === modal) leave(); });
  document.getElementById('walkList').addEventListener('click', () => {
    if (mode !== 'walk') return;
    openModal(`<div class="wm-top"><a class="wm-tldr" href="${SITE.resume}" download><b>TL;DR</b> download résumé <i>↓</i></a></div><div class="wm-list"><h2 id="wmOrg" style="margin:0 0 6px">Work &amp; education</h2>${EXP.map((e, i) => `<button class="wm-item" data-i="${i}"><h3>${e.org}</h3><p class="mono">${e.role} · ${e.dates}</p><p>${e.summary}</p><span class="wm-more">read more →</span></button>`).join('')}</div>${EXIT}`);
    card.querySelectorAll('.wm-item').forEach(b => b.addEventListener('click', () => { const e = EXP[+b.dataset.i]; card.innerHTML = expHTML([e]) + `<button class="wm-back" type="button">← all entries</button>` + EXIT; card.scrollTop = 0; document.getElementById('wmExit').addEventListener('click', leave); card.querySelector('.wm-back').addEventListener('click', () => { mode = 'walk'; document.getElementById('walkList').click(); }); }));
  });

  if (gl) init().catch(err => { console.error(err); document.body.classList.add('no-gl'); });
  else document.getElementById('walkList').click();
})();
