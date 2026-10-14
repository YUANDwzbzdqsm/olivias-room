// Poster artwork: real photos and album covers composited onto canvases with cartoon poster layouts.
import { mkCanvas, canvasTexture } from './textures.js';
import { rng } from './kit.js';

export const FONT = {
  title: '"Archivo Black", "Arial Black", sans-serif',
  hand: '"Caveat Brush", "Comic Sans MS", cursive',
  round: '"Fredoka", "Segoe UI", sans-serif',
  serif: '"DM Serif Display", Georgia, serif',
};
const INK = '#2a1a2e';

// ---------- image loading with progress ----------
const cache = new Map();
const state = { total: 0, done: 0, failed: [] };
const listeners = new Set();
export const imageProgress = {
  subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
  get: () => state,
};
const emit = () => listeners.forEach((fn) => fn(state));

export function loadImage(url) {
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return cache.get(url);
  state.total++;
  const p = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    let settled = false;
    const finish = (v) => {
      if (settled) return;
      settled = true;
      state.done++;
      if (!v) state.failed.push(url);
      emit();
      resolve(v);
    };
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    setTimeout(() => finish(img.complete && img.naturalWidth ? img : null), 25000);
    img.src = url;
  });
  cache.set(url, p);
  emit();
  return p;
}

// ---------- drawing helpers ----------
function cover(g, img, x, y, w, h, { fx = 0.5, fy = 0.35, zoom = 1, filter } = {}) {
  if (!img) {
    g.fillStyle = '#dccbe8';
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(42,26,46,.35)';
    g.font = `${Math.round(Math.min(w, h) * 0.18)}px ${FONT.round}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('♡', x + w / 2, y + h / 2);
    return;
  }
  const ir = img.naturalWidth / img.naturalHeight, r = w / h;
  let sw, sh;
  if (ir > r) { sh = img.naturalHeight / zoom; sw = sh * r; }
  else { sw = img.naturalWidth / zoom; sh = sw / r; }
  const sx = Math.max(0, Math.min(img.naturalWidth - sw, (img.naturalWidth - sw) * fx));
  const sy = Math.max(0, Math.min(img.naturalHeight - sh, (img.naturalHeight - sh) * fy));
  g.save();
  if (filter) g.filter = filter;
  g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  g.restore();
}

function inkRect(g, x, y, w, h, lw) {
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.strokeRect(x, y, w, h);
}

function fitFont(g, text, family, maxW, maxSize) {
  let s = maxSize;
  g.font = `${s}px ${family}`;
  while (g.measureText(text).width > maxW && s > 8) {
    s -= 2;
    g.font = `${s}px ${family}`;
  }
  return s;
}

function outlinedText(g, text, x, y, fill, stroke, lw) {
  g.lineJoin = 'round';
  g.miterLimit = 2;
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.strokeText(text, x, y);
  }
  g.fillStyle = fill;
  g.fillText(text, x, y);
}

export function star2D(g, x, y, r, rot, fill, stroke, lw = 0) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.48 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.lineJoin = 'round';
    g.stroke();
  }
}

function heart2D(g, x, y, r, fill) {
  g.beginPath();
  g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.3, y + r * 0.1, x - r * 0.7, y - r * 0.95, x, y - r * 0.35);
  g.bezierCurveTo(x + r * 0.7, y - r * 0.95, x + r * 1.3, y + r * 0.1, x, y + r * 0.9);
  g.fillStyle = fill;
  g.fill();
}

const STAR_COLORS = ['#f7a8c8', '#9fe3d3', '#8fb8f2', '#f6d36b', '#ffffff', '#e98bd9', '#f58f7c'];

// ---------- poster designs ----------
const DESIGNS = {
  photo(g, W, H, [img], s) {
    const m = Math.round(Math.min(W, H) * (s.margin ?? 0.055));
    g.fillStyle = s.border ?? '#fffdfb';
    g.fillRect(0, 0, W, H);
    const bottom = s.caption ? Math.round(H * 0.15) : m;
    cover(g, img, m, m, W - 2 * m, H - m - bottom, s);
    inkRect(g, m, m, W - 2 * m, H - m - bottom, Math.max(2, W * 0.006));
    if (s.caption) {
      g.fillStyle = s.captionColor ?? INK;
      fitFont(g, s.caption, FONT.hand, W * 0.86, Math.round(bottom * 0.62));
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(s.caption, W / 2, H - bottom / 2);
    }
  },

  polaroid(g, W, H, [img], s) {
    g.fillStyle = '#fffdf8';
    g.fillRect(0, 0, W, H);
    const m = W * 0.08, side = W - 2 * m;
    cover(g, img, m, m, side, side, s);
    g.fillStyle = INK;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    fitFont(g, s.caption ?? '', FONT.hand, W * 0.86, H * 0.12);
    g.fillText(s.caption ?? '', W / 2, m + side + (H - m - side) / 2);
  },

  title2026(g, W, H, [img], s) {
    g.fillStyle = '#fffaf7';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'left';
    g.textBaseline = 'top';
    const fs = fitFont(g, 'RODRIGO', FONT.title, W * 0.7, H * 0.1);
    g.font = `${fs}px ${FONT.title}`;
    outlinedText(g, 'OLIVIA', W * 0.06, H * 0.04, '#f48db3', '#e0628f', fs * 0.06);
    outlinedText(g, 'RODRIGO', W * 0.06, H * 0.04 + fs * 1.05, '#f48db3', '#e0628f', fs * 0.06);
    const ds = H * 0.15;
    g.font = `${ds}px ${FONT.title}`;
    g.textAlign = 'center';
    [...(s.year ?? '2026')].forEach((d, i) =>
      outlinedText(g, d, W * 0.885, H * 0.23 + i * ds * 1.02, '#f48db3', '#e0628f', ds * 0.05));
    const px = W * 0.07, py = H * 0.26, pw = W * 0.68, ph = H * 0.69;
    cover(g, img, px, py, pw, ph, s);
    inkRect(g, px, py, pw, ph, W * 0.006);
  },

  tour(g, W, H, [img], s) {
    const R = rng(5);
    g.fillStyle = '#121014';
    g.fillRect(0, 0, W, H);
    cover(g, img, 0, H * 0.24, W * 0.64, H * 0.76, { ...s, filter: 'grayscale(1) contrast(1.15) brightness(1.05)' });
    const fade = g.createLinearGradient(W * 0.44, 0, W * 0.64, 0);
    fade.addColorStop(0, 'rgba(18,16,20,0)');
    fade.addColorStop(1, 'rgba(18,16,20,1)');
    g.fillStyle = fade;
    g.fillRect(W * 0.44, H * 0.24, W * 0.21, H * 0.76);
    g.textAlign = 'right';
    g.textBaseline = 'top';
    const fs = fitFont(g, 'RODRIGO', FONT.title, W * 0.6, H * 0.1);
    g.fillStyle = '#fff';
    g.fillText('OLIVIA', W * 0.94, H * 0.05);
    g.fillText('RODRIGO', W * 0.94, H * 0.05 + fs * 1.05);
    for (let i = 0; i < 46; i++) {
      const t = R();
      const x = W * (0.42 + t * 0.56) + (R() - 0.5) * W * 0.12;
      const y = H * (0.86 - t * 0.3) + (R() - 0.5) * H * 0.16;
      star2D(g, x, y, W * (0.018 + R() * 0.02), R() * 6, STAR_COLORS[Math.floor(R() * STAR_COLORS.length)]);
    }
    g.save();
    g.translate(W * 0.72, H * 0.7);
    g.rotate(-0.42);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `${W * 0.2}px ${FONT.title}`;
    outlinedText(g, 'GUTS', 0, 0, '#fff', '#121014', W * 0.025);
    g.font = `${W * 0.06}px ${FONT.title}`;
    outlinedText(g, 'WORLD TOUR', 0, W * 0.13, '#fff', '#121014', W * 0.012);
    g.restore();
  },

  gutsPhoto(g, W, H, [img], s) {
    g.fillStyle = '#efe6f3';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = INK;
    g.font = `${H * 0.085}px ${FONT.title}`;
    g.fillText('GUTS', W * 0.07, H * 0.03);
    const px = W * 0.07, py = H * 0.14, pw = W * 0.86, ph = H * 0.81;
    cover(g, img, px, py, pw, ph, s);
    inkRect(g, px, py, pw, ph, W * 0.007);
  },

  dropdead(g, W, H, [img], s) {
    g.fillStyle = '#f8c9d8';
    g.fillRect(0, 0, W, H);
    const m = W * 0.08, side = W - 2 * m;
    cover(g, img, m, m, side, side, { fx: 0.5, fy: 0.5 });
    inkRect(g, m, m, side, side, W * 0.008);
    const cy = m + side + (H - m - side) / 2;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    fitFont(g, 'drop dead', FONT.hand, W * 0.8, (H - m - side) * 0.7);
    outlinedText(g, 'drop dead', W / 2, cy, '#e0507c', '#fff', W * 0.03);
    heart2D(g, W * 0.1, cy - H * 0.03, W * 0.035, '#e0507c');
    heart2D(g, W * 0.9, cy + H * 0.02, W * 0.03, '#fff');
  },

  tracklist(g, W, H, [img], s) {
    g.fillStyle = '#7b50b6';
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 9; i++) g.fillRect(0, H * (0.06 + i * 0.11), W, H * 0.035);
    const m = H * 0.1, side = H - 2 * m;
    cover(g, img, m, m, side, side, { fx: 0.5, fy: 0.5 });
    inkRect(g, m, m, side, side, H * 0.012);
    const x0 = m * 2 + side;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = '#fff';
    g.font = `${H * 0.13}px ${FONT.title}`;
    g.fillText('GUTS', x0, m * 0.9);
    const tracks = s.tracks ?? [];
    const lh = (H - m * 3.1) / Math.max(1, tracks.length);
    g.font = `500 ${Math.min(lh * 0.8, H * 0.055)}px ${FONT.round}`;
    tracks.forEach((t, i) => {
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.fillText(`${String(i + 1).padStart(2, '0')}  ${t}`, x0, m * 2.35 + i * lh);
    });
  },

  stars(g, W, H, [img], s) {
    const R = rng(9);
    g.fillStyle = '#16111b';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 34; i++) {
      star2D(g, R() * W, R() * H, W * (0.03 + R() * 0.035), R() * 6, STAR_COLORS[Math.floor(R() * STAR_COLORS.length)]);
    }
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(-0.05);
    const pw = W * 0.66, ph = H * 0.7, b = W * 0.03;
    g.fillStyle = '#fff';
    g.fillRect(-pw / 2 - b, -ph / 2 - b, pw + 2 * b, ph + 2 * b);
    cover(g, img, -pw / 2, -ph / 2, pw, ph, s);
    g.restore();
  },

  ysps(g, W, H, [img], s) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#b9dbf5');
    gr.addColorStop(1, '#f8d7e5');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    const m = W * 0.1, side = W - 2 * m;
    cover(g, img, m, m, side, side, { fx: 0.5, fy: 0.5 });
    inkRect(g, m, m, side, side, W * 0.007);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#5a3a6c';
    const y0 = m + side + H * 0.06;
    fitFont(g, 'for a girl so in love', `italic ${FONT.serif}`, W * 0.84, H * 0.06);
    g.fillText('you seem pretty sad', W / 2, y0);
    g.fillText('for a girl so in love', W / 2, y0 + H * 0.065);
    g.font = `600 ${H * 0.032}px ${FONT.round}`;
    g.fillStyle = '#7d6290';
    g.fillText('OLIVIA RODRIGO · 2026', W / 2, H - H * 0.05);
  },

  sour(g, W, H, [img], s) {
    const R = rng(21);
    g.fillStyle = '#8e62c8';
    g.fillRect(0, 0, W, H);
    const cols = ['#ffd84d', '#ff7fb0', '#7fe0ff', '#9dff8a', '#ffffff', '#ff9e5e'];
    for (let i = 0; i < 26; i++) {
      const x = R() * W, y = R() * H, r = W * (0.025 + R() * 0.03), c = cols[Math.floor(R() * cols.length)];
      const k = R();
      if (k < 0.4) star2D(g, x, y, r, R() * 6, c, '#fff', r * 0.25);
      else if (k < 0.7) heart2D(g, x, y, r, c);
      else { g.fillStyle = c; g.beginPath(); g.arc(x, y, r * 0.8, 0, 7); g.fill(); }
    }
    const m = W * 0.11, side = W - 2 * m;
    cover(g, img, m, m, side, side, { fx: 0.5, fy: 0.5 });
    inkRect(g, m, m, side, side, W * 0.008);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    fitFont(g, 'SOUR', FONT.title, W * 0.7, (H - m - side) * 0.62);
    outlinedText(g, 'SOUR', W / 2, m + side + (H - m - side) / 2, '#fff', INK, W * 0.02);
  },

  cover(g, W, H, [img], s) {
    g.fillStyle = s.color ?? '#9a77c9';
    g.fillRect(0, 0, W, H);
    if (img) cover(g, img, 0, 0, W, H, { fx: 0.5, fy: 0.5 });
    else {
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      fitFont(g, s.title ?? '', FONT.title, W * 0.8, H * 0.14);
      g.fillText(s.title ?? '', W / 2, H / 2);
    }
  },

  magazine(g, W, H, [img], s) {
    const R = rng(4);
    const half = W / 2;
    g.fillStyle = '#fff7f9';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `${H * 0.11}px ${FONT.title}`;
    outlinedText(g, 'OLIVIA', half * 0.09, H * 0.06, '#ef86ad', null);
    g.font = `600 ${H * 0.04}px ${FONT.round}`;
    g.fillStyle = '#7b5a8c';
    g.fillText('the guts tour diaries ★', half * 0.09, H * 0.2);
    for (let col = 0; col < 2; col++) {
      for (let i = 0; i < 15; i++) {
        const w = half * 0.36 * (i % 6 === 5 ? 0.6 : 0.9 + R() * 0.1);
        g.fillStyle = i % 7 === 0 ? '#f2a7c3' : '#d9c9de';
        g.fillRect(half * (0.09 + col * 0.44), H * (0.3 + i * 0.043), w, H * 0.018);
      }
    }
    star2D(g, half * 0.78, H * 0.9, H * 0.04, 0.2, '#8f6ad0');
    const px = half + half * 0.06, py = H * 0.05, pw = half * 0.88, ph = H * 0.9;
    cover(g, img, px, py, pw, ph, s);
    star2D(g, px + pw * 0.85, py + ph * 0.9, H * 0.045, -0.3, '#8f6ad0', '#fff', H * 0.008);
    const crease = g.createLinearGradient(half - W * 0.04, 0, half + W * 0.04, 0);
    crease.addColorStop(0, 'rgba(120,80,110,0)');
    crease.addColorStop(0.5, 'rgba(120,80,110,0.28)');
    crease.addColorStop(1, 'rgba(120,80,110,0)');
    g.fillStyle = crease;
    g.fillRect(half - W * 0.04, 0, W * 0.08, H);
    g.strokeStyle = INK;
    g.lineWidth = H * 0.008;
    g.strokeRect(0, 0, W, H);
  },

  phone(g, W, H, [img], s) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, s.on ? '#3a2350' : '#141016');
    gr.addColorStop(1, s.on ? '#1a1024' : '#0b090c');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    if (!s.on) return;
    const m = W * 0.12, side = W - 2 * m;
    cover(g, img, m, H * 0.14, side, side, { fx: 0.5, fy: 0.5 });
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = '#fff';
    g.font = `600 ${W * 0.1}px ${FONT.round}`;
    g.fillText('drop dead', m, H * 0.14 + side + H * 0.04);
    g.fillStyle = 'rgba(255,255,255,.65)';
    g.font = `500 ${W * 0.07}px ${FONT.round}`;
    g.fillText('Olivia Rodrigo', m, H * 0.14 + side + H * 0.1);
    const by = H * 0.14 + side + H * 0.18;
    g.fillStyle = 'rgba(255,255,255,.25)';
    g.fillRect(m, by, side, W * 0.02);
    g.fillStyle = '#f7a8c8';
    g.fillRect(m, by, side * (s.progress ?? 0.3), W * 0.02);
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(m + side * (s.progress ?? 0.3), by + W * 0.01, W * 0.03, 0, 7);
    g.fill();
    const cy = by + H * 0.09;
    g.fillRect(W / 2 - W * 0.05, cy - W * 0.06, W * 0.035, W * 0.12);
    g.fillRect(W / 2 + W * 0.015, cy - W * 0.06, W * 0.035, W * 0.12);
  },
};

// Returns a texture that shows a placeholder immediately and redraws once its images arrive.
export function canvasArt({ w, h, design, images = [], spec = {}, density = 820, maxPx = 1024 }) {
  const scale = Math.min(density, maxPx / Math.max(w, h));
  const W = Math.max(16, Math.round(w * scale)), H = Math.max(16, Math.round(h * scale));
  const canvas = mkCanvas(W, H), g = canvas.getContext('2d');
  const texture = canvasTexture(canvas, { wrap: false });
  let imgs = [];
  const draw = () => {
    g.save();
    g.clearRect(0, 0, W, H);
    DESIGNS[design](g, W, H, imgs, spec);
    g.restore();
    texture.needsUpdate = true;
  };
  draw();
  const ready = Promise.all(images.map(loadImage)).then((loaded) => {
    imgs = loaded;
    draw();
  });
  return { texture, canvas, spec, ready, redraw: draw };
}
