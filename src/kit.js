// Small helpers shared by the scene: cartoon materials, seeded randomness, geometry utilities.
import * as THREE from 'three';

export const V3 = THREE.Vector3;
export const INK = [0.16, 0.09, 0.18];

// Three-step ramp for MeshToonMaterial: hard cel bands instead of smooth shading.
export const GRADIENT = (() => {
  const t = new THREE.DataTexture(new Uint8Array([88, 175, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: GRADIENT, ...opts });
}

// Unlit material for real photos/covers so they keep their true colours.
// Registered so night mode can dim them along with the lights.
export const unlitMaterials = new Set();
export function unlit(opts = {}) {
  const m = new THREE.MeshBasicMaterial(opts);
  m.userData.baseColor = m.color.clone();
  unlitMaterials.add(m);
  return m;
}

export function noOutline(m) {
  m.userData.outlineParameters = { visible: false };
  return m;
}

export function setOutline(m, color = INK, thickness = 0.0035) {
  m.userData.outlineParameters = { thickness, color, alpha: 1, visible: true, keepAlive: true };
  return m;
}

export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Planar UVs picked per vertex by the dominant normal axis, in metres * scale,
// so patterned fabric keeps the same print size on every face.
export function worldUV(geo, scale = 1) {
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else if (ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * scale;
    uv[i * 2 + 1] = v * scale;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

export function curve(points, closed = false) {
  return new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new V3(...p))), closed, 'centripetal');
}

export function tube(points, radius, mat, { segments, radial = 8, closed = false } = {}) {
  const c = curve(points, closed);
  const geo = new THREE.TubeGeometry(c, segments ?? Math.max(16, points.length * 6), radius, radial, closed);
  return mesh(geo, mat);
}

// Flat spiral in 2D, from the outer rim inward. Used for wrought-iron scrollwork.
export function spiral2D(cx, cy, R, turns, a0, dir = 1, n = 48, inner = 0.18) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const a = a0 + dir * k * turns * Math.PI * 2;
    const r = R * (1 - (1 - inner) * k);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

// Points along a sagging string between a and b.
export function sagPoints(a, b, sag, n = 24) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new V3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  return pts;
}

export function starShape(r = 1, inner = 0.5, points = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 ? r * inner : r;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  return s;
}

export function heartShape(r = 1) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.9 * r);
  s.bezierCurveTo(-1.3 * r, -0.1 * r, -0.7 * r, 0.95 * r, 0, 0.35 * r);
  s.bezierCurveTo(0.7 * r, 0.95 * r, 1.3 * r, -0.1 * r, 0, -0.9 * r);
  return s;
}
