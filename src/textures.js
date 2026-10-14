// Hand-drawn looking patterns painted on canvases: rose fabric, polka dots, bunting prints, wood floor, wall paint.
import * as THREE from 'three';
import { rng } from './kit.js';

export function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function canvasTexture(canvas, { repeat = [1, 1], wrap = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

// Draw fn at x,y plus its wrapped copies so the tile repeats seamlessly.
function wrapped(size, x, y, r, fn) {
  for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
    const px = x + dx * size, py = y + dy * size;
    if (px > -r && px < size + r && py > -r && py < size + r) fn(px, py);
  }
}

function leaf(g, x, y, len, ang, col, vein) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.5, -len * 0.38, len, 0);
  g.quadraticCurveTo(len * 0.5, len * 0.38, 0, 0);
  g.fillStyle = col;
  g.fill();
  g.strokeStyle = vein;
  g.lineWidth = len * 0.07;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(len * 0.12, 0);
  g.lineTo(len * 0.78, 0);
  g.stroke();
  g.restore();
}

function rose(g, x, y, r, a, col, dark) {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.beginPath();
  for (let k = 0; k <= 30; k++) {
    const t = (k / 30) * Math.PI * 2;
    const rr = r * (1 + 0.09 * Math.sin(t * 5));
    g.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
  }
  g.fillStyle = col;
  g.fill();
  g.strokeStyle = dark;
  g.lineWidth = r * 0.14;
  g.lineCap = g.lineJoin = 'round';
  g.beginPath();
  const T = Math.PI * 3.3;
  for (let t = 0; t <= T; t += 0.12) {
    const rr = r * 0.74 * (t / T);
    g.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
  }
  g.stroke();
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.arc(0, 0, r * 0.9, k * 2.1 + 0.4, k * 2.1 + 1.25);
    g.stroke();
  }
  g.restore();
}

export function roseFabric({ bg, rose: rc, dark, leaf: lc = '#a6d69c', vein = '#7cb878', size = 512, grid = 3, seed = 3, rScale = 1 }) {
  const c = mkCanvas(size, size), g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);
  const cell = size / grid, items = [];
  for (let j = 0; j < grid; j++) for (let i = 0; i < grid; i++) {
    items.push({
      x: (i + 0.5 + (j % 2) * 0.5 + (R() - 0.5) * 0.35) * cell,
      y: (j + 0.5 + (R() - 0.5) * 0.3) * cell,
      r: cell * (0.19 + R() * 0.05) * rScale,
      a: R() * 6.28,
    });
  }
  for (const it of items) {
    const n = 2 + Math.floor(R() * 2), base = R() * 6.28;
    for (let k = 0; k < n; k++) {
      const ang = base + k * (Math.PI * 2 / n) + (R() - 0.5) * 0.6;
      wrapped(size, it.x + Math.cos(ang) * it.r * 0.8, it.y + Math.sin(ang) * it.r * 0.8, it.r * 2,
        (px, py) => leaf(g, px, py, it.r * 1.25, ang, lc, vein));
    }
  }
  for (const it of items) wrapped(size, it.x, it.y, it.r * 1.2, (px, py) => rose(g, px, py, it.r, it.a, rc, dark));
  return c;
}

export function polka({ bg, dot, size = 256, n = 4, r = 0.2 }) {
  const c = mkCanvas(size, size), g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);
  g.fillStyle = dot;
  const cell = size / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + 0.5 + (j % 2) * 0.5) * cell, y = (j + 0.5) * cell;
    wrapped(size, x, y, cell, (px, py) => {
      g.beginPath();
      g.arc(px, py, cell * r, 0, Math.PI * 2);
      g.fill();
    });
  }
  return c;
}

// Pattern painters used for bunting flags (draw into an existing context).
export const paint = {
  dots(g, w, h, { bg, dot, n = 5, r = 0.18 }) {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = dot;
    const cell = w / n;
    for (let j = 0; j * cell < h + cell; j++) for (let i = -1; i <= n; i++) {
      g.beginPath();
      g.arc((i + 0.5 + (j % 2) * 0.5) * cell, (j + 0.5) * cell, cell * r, 0, Math.PI * 2);
      g.fill();
    }
  },
  stripes(g, w, h, { a, b, n = 7, angle = 0.6 }) {
    g.fillStyle = a;
    g.fillRect(0, 0, w, h);
    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(angle);
    g.fillStyle = b;
    const sw = (w * 1.6) / n;
    for (let i = -n; i < n; i++) g.fillRect(i * sw, -h * 1.5, sw * 0.5, h * 3);
    g.restore();
  },
  gingham(g, w, h, { bg, a, n = 6 }) {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = a;
    g.globalAlpha = 0.55;
    const s = w / n;
    for (let i = 0; i < n + 2; i++) {
      g.fillRect(i * s, 0, s / 2, h);
      g.fillRect(0, i * s, w, s / 2);
    }
    g.globalAlpha = 1;
  },
  plaid(g, w, h, { bg, a, b, n = 4 }) {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const s = w / n;
    for (let i = 0; i < n + 2; i++) {
      g.globalAlpha = 0.5;
      g.fillStyle = a;
      g.fillRect(i * s, 0, s * 0.35, h);
      g.fillRect(0, i * s, w, s * 0.35);
      g.globalAlpha = 0.8;
      g.fillStyle = b;
      g.fillRect(i * s + s * 0.62, 0, s * 0.07, h);
      g.fillRect(0, i * s + s * 0.62, w, s * 0.07);
    }
    g.globalAlpha = 1;
  },
};

export function woodFloor({ size = 1024, rows = 8, seed = 7 } = {}) {
  const c = mkCanvas(size, size), g = c.getContext('2d'), R = rng(seed);
  const tones = ['#5b3129', '#4f2a24', '#64382d', '#56302a', '#4a2722'];
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    let x = -R() * size * 0.6;
    while (x < size) {
      const len = size * (0.35 + R() * 0.5);
      const col = tones[Math.floor(R() * tones.length)];
      for (const off of [0, size]) {
        g.fillStyle = col;
        g.fillRect(x - off, r * rh, len, rh);
        g.fillRect(x + off, r * rh, len, rh);
      }
      g.strokeStyle = 'rgba(255,220,200,0.07)';
      g.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const yy = r * rh + rh * (0.2 + R() * 0.6);
        g.beginPath();
        for (let t = 0; t <= 1; t += 0.05) g.lineTo(x + len * t, yy + Math.sin(t * 9 + k) * 2.5);
        g.stroke();
      }
      g.fillStyle = '#2b1714';
      g.fillRect(((x % size) + size) % size, r * rh, 3, rh);
      x += len;
    }
    g.fillStyle = '#2b1714';
    g.fillRect(0, r * rh, size, 4);
  }
  return c;
}

export function wallPaint({ base = '#c7a3d6', size = 512, seed = 11 } = {}) {
  const c = mkCanvas(size, size), g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) {
    const x = R() * size, y = R() * size, r = 20 + R() * 70;
    const light = R() > 0.5;
    wrapped(size, x, y, r, (px, py) => {
      g.fillStyle = light ? 'rgba(255,255,255,0.035)' : 'rgba(90,40,110,0.035)';
      g.beginPath();
      g.arc(px, py, r, 0, Math.PI * 2);
      g.fill();
    });
  }
  return c;
}

export function glowTexture(inner = 'rgba(255,230,180,1)', outer = 'rgba(255,190,200,0)') {
  const c = mkCanvas(128, 128), g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner);
  gr.addColorStop(1, outer);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
