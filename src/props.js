// Every object in the room, built from primitives in a chunky cartoon style.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  V3, toon, unlit, noOutline, mesh, rng, worldUV, tube, spiral2D, sagPoints, starShape, heartShape,
  smoothstep, lerp,
} from './kit.js';
import { roseFabric, polka, paint, canvasTexture, mkCanvas, glowTexture, woodFloor, wallPaint } from './textures.js';
import { canvasArt, star2D } from './posters.js';

const IRON = '#fbf4f7';
const INK_HEX = '#2a1a2e';
const v2 = ([x, y]) => new THREE.Vector2(x, y);

function shapeFrom(points) {
  const s = new THREE.Shape();
  s.moveTo(...points[0]);
  s.splineThru(points.slice(1).map(v2));
  s.closePath();
  return s;
}

function extrude(shape, depth, bevel = 0, { curveSegments = 32, center = true } = {}) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, curveSegments,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3,
  });
  if (center) geo.translate(0, 0, -depth / 2);
  return geo;
}

// ---------------------------------------------------------------- room shell
export function makeRoom() {
  const g = new THREE.Group();
  const H = 3.5, T = 0.14;
  const cut = toon('#6c4a88');
  const cutFloor = toon('#3d2432');

  const backTex = canvasTexture(wallPaint({ base: '#c6a1d5' }));
  const leftTex = canvasTexture(wallPaint({ base: '#cfa8d9', seed: 12 }));
  const backMat = toon('#ffffff', { map: backTex });
  const leftMat = toon('#ffffff', { map: leftTex });

  const BW = 6.74;
  const backGeo = worldUV(new THREE.BoxGeometry(BW, H, T), 0.45);
  const back = mesh(backGeo, [cut, cut, cut, cut, backMat, cut], { cast: false });
  back.position.set(-3.14 + BW / 2, H / 2, -T / 2);
  g.add(back);

  const LD = 4.0;
  const leftGeo = worldUV(new THREE.BoxGeometry(T, H, LD), 0.45);
  const left = mesh(leftGeo, [leftMat, cut, cut, cut, cut, cut], { cast: false });
  left.position.set(-3.0 - T / 2, H / 2, LD / 2);
  g.add(left);

  const floorTex = canvasTexture(woodFloor());
  floorTex.rotation = Math.PI / 2;
  const floorMat = toon('#ffffff', { map: floorTex });
  const FD = 4.14;
  const floorGeo = worldUV(new THREE.BoxGeometry(BW, 0.16, FD), 0.8);
  const floor = mesh(floorGeo, [cutFloor, cutFloor, floorMat, cutFloor, cutFloor, cutFloor], { cast: false });
  floor.position.set(-3.14 + BW / 2, -0.08, -T + FD / 2);
  g.add(floor);

  const trim = toon('#f6e9f2');
  const bb1 = mesh(new THREE.BoxGeometry(6.6, 0.12, 0.03), trim);
  bb1.position.set(0.3, 0.06, 0.015);
  const bb2 = mesh(new THREE.BoxGeometry(0.03, 0.12, LD), trim);
  bb2.position.set(-2.985, 0.06, LD / 2);
  g.add(bb1, bb2);
  return g;
}

// ---------------------------------------------------------------- bed
function pillowGeo(w, h, d) {
  const geo = new THREE.SphereGeometry(1, 56, 32);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.sign(x) * Math.pow(Math.abs(x), 0.35);
    const az = Math.sign(z) * Math.pow(Math.abs(z), 0.35);
    const edge = Math.max(Math.abs(ax), Math.abs(az));
    p.setXYZ(i, (ax * w) / 2, (y * (1 - 0.72 * Math.pow(edge, 4)) * h) / 2, (az * d) / 2);
  }
  geo.computeVertexNormals();
  return geo;
}

function makeHeadboard() {
  const g = new THREE.Group();
  const iron = toon(IRON);
  const W = 1.78, r = 0.017;
  const P = (x, y) => new V3(x, y, 0);
  for (const s of [-1, 1]) {
    const post = mesh(new THREE.CylinderGeometry(0.028, 0.032, 1.42, 12), iron);
    post.position.set((s * W) / 2, 0.71, 0);
    const ball = mesh(new THREE.SphereGeometry(0.052, 18, 12), iron);
    ball.position.set((s * W) / 2, 1.46, 0);
    g.add(post, ball);
  }
  g.add(tube([P(-W / 2, 1.16), P(-W / 4, 1.31), P(0, 1.37), P(W / 4, 1.31), P(W / 2, 1.16)], 0.021, iron, { segments: 60 }));
  g.add(tube([P(-W / 2, 0.66), P(W / 2, 0.66)], 0.019, iron, { segments: 4 }));
  for (const s of [-1, 1]) {
    const a = spiral2D(s * 0.34, 1.0, 0.16, 1.15, -Math.PI / 2, -s, 40);
    const b = spiral2D(s * 0.66, 0.86, 0.12, 1.1, Math.PI / 2, -s, 36);
    g.add(tube([...a.slice().reverse(), ...b].map(([x, y]) => P(x, y)), r, iron, { segments: 240 }));
    const c = spiral2D(s * 0.12, 0.84, 0.08, 1.0, s > 0 ? Math.PI : 0, -s, 28);
    g.add(tube([P(s * 0.03, 0.67), P(s * 0.05, 0.77), ...c.map(([x, y]) => P(x, y))], r * 0.9, iron, { segments: 120 }));
    g.add(tube([P(s * 0.34, 1.16), P(s * 0.34, 1.33)], r, iron, { segments: 4 }));
    const d = spiral2D(s * 0.7, 1.12, 0.06, 0.9, -Math.PI / 2, -s, 20);
    g.add(tube([P(s * 0.86, 1.06), ...d.map(([x, y]) => P(x, y))], r * 0.85, iron, { segments: 80 }));
  }
  return g;
}

export function makeBunny({ fur = '#fffaf6', dress = null, scale = 1 } = {}) {
  const g = new THREE.Group();
  const furM = toon(fur), eye = noOutline(toon(INK_HEX)), pinkM = noOutline(toon('#f6a3be'));
  const body = mesh(new THREE.SphereGeometry(0.1, 28, 18), furM);
  body.scale.set(1, 1.15, 0.92);
  body.position.y = 0.11;
  g.add(body);
  if (dress) {
    const lathe = new THREE.LatheGeometry([v2([0, 0.03]), v2([0.128, 0.03]), v2([0.118, 0.07]), v2([0.088, 0.2]), v2([0, 0.205])], 28);
    g.add(mesh(lathe, toon(dress)));
  }
  const head = mesh(new THREE.SphereGeometry(0.088, 28, 18), furM);
  head.scale.set(1.12, 1, 1);
  head.position.y = 0.28;
  g.add(head);
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.CapsuleGeometry(0.026, 0.11, 6, 12), furM);
    ear.position.set(s * 0.036, 0.41, 0);
    ear.rotation.z = -s * 0.12;
    ears.push(ear);
    const arm = mesh(new THREE.CapsuleGeometry(0.022, 0.05, 4, 8), furM);
    arm.position.set(s * 0.092, 0.14, 0.03);
    arm.rotation.z = s * 0.7;
    const foot = mesh(new THREE.SphereGeometry(0.036, 16, 10), furM);
    foot.scale.set(1, 0.7, 1.4);
    foot.position.set(s * 0.05, 0.025, 0.07);
    const e = mesh(new THREE.SphereGeometry(0.0105, 10, 8), eye, { cast: false });
    e.position.set(s * 0.032, 0.29, 0.083);
    g.add(ear, arm, foot, e);
  }
  const nose = mesh(new THREE.SphereGeometry(0.009, 10, 8), pinkM, { cast: false });
  nose.position.set(0, 0.268, 0.09);
  g.add(nose);
  g.scale.setScalar(scale);
  g.userData.ears = ears;
  return g;
}

export function makeBed() {
  const g = new THREE.Group();
  const sheetTex = canvasTexture(roseFabric({ bg: '#fce9f0', rose: '#f6b6ca', dark: '#e98aa8', grid: 3, seed: 2 }));
  const sheet = toon('#ffffff', { map: sheetTex });
  const mattress = mesh(worldUV(new RoundedBoxGeometry(2.12, 0.56, 1.64, 4, 0.07), 1.9), sheet);
  mattress.position.set(-1.46, 0.34, 0.9);
  g.add(mattress);

  const head = makeHeadboard();
  head.rotation.y = Math.PI / 2;
  head.position.set(-2.56, 0, 0.9);
  g.add(head);

  const white = toon('#fffafb');
  const addPillow = (geo, mat, x, y, z, lean, yaw = 0) => {
    const holder = new THREE.Group();
    const m = mesh(geo, mat);
    m.rotation.x = -(Math.PI / 2 - lean);
    holder.add(m);
    holder.rotation.y = -Math.PI / 2 + yaw;
    holder.position.set(x, y, z);
    g.add(holder);
    return holder;
  };
  const floralTex = canvasTexture(roseFabric({ bg: '#b892cc', rose: '#f6d9ec', dark: '#d79fc6', leaf: '#a9d9a2', grid: 3, seed: 8 }));
  const floralGeo = worldUV(pillowGeo(0.86, 0.24, 0.56), 2.4);
  addPillow(floralGeo, toon('#ffffff', { map: floralTex }), -2.43, 1.0, 0.95, 0.42, 0.05);
  addPillow(pillowGeo(0.74, 0.24, 0.5), white, -2.27, 0.86, 0.52, 0.5, -0.08);
  addPillow(pillowGeo(0.74, 0.24, 0.5), white, -2.25, 0.85, 1.3, 0.55, 0.1);

  const bunny = makeBunny({ scale: 1.05 });
  bunny.position.set(-1.98, 0.6, 0.3);
  bunny.rotation.y = 0.55;
  g.add(bunny);
  return { group: g, bunny };
}

// A thick quilted slab bent along a drape path: over the bed, down the front, out onto the floor.
// Big soft bumps on the top surface turn the slab into a puffy pile.
const DUVET_BUMPS = [
  [0.3, 0.42, 0.36, 0.1], [0.85, 0.78, 0.42, 0.12], [1.38, 0.42, 0.36, 0.1], [0.55, 1.22, 0.32, 0.08],
  [1.18, 1.28, 0.3, 0.08], [1.68, 0.9, 0.36, 0.08],
];
export function makeDuvet() {
  const tex = canvasTexture(roseFabric({ bg: '#f7b3c8', rose: '#ef87a8', dark: '#d9587f', leaf: '#b9dd9c', vein: '#86b874', grid: 3, seed: 5, rScale: 1.1 }));
  const mat = toon('#ffffff', { map: tex });
  const W = 1.95, T = 0.08, L = 2.6, x0 = -1.55, footX = -0.42;
  const geo = new THREE.BoxGeometry(W, T, L, 110, 1, 140);
  const path = new THREE.CatmullRomCurve3([
    new V3(0, 0.66, 0.24), new V3(0, 0.7, 0.85), new V3(0, 0.68, 1.48), new V3(0, 0.57, 1.78),
    new V3(0, 0.32, 1.88), new V3(0, 0.08, 1.97), new V3(0, 0.05, 2.14), new V3(0, 0.05, 2.3),
  ], false, 'centripetal');
  const len = path.getLength();
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const nrm = geo.attributes.normal;
  const P = new V3(), Tg = new V3();
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + W / 2, t = pos.getY(i), s = (pos.getZ(i) + L / 2) / L;
    path.getPointAt(s, P);
    path.getTangentAt(s, Tg);
    const ny = Tg.z, nz = -Tg.y;
    const sm = s * len, hang = Math.min(1, Math.abs(Tg.y) * 1.3);
    let puff = 0.05 + 0.025 * Math.sin(u * 6.1 + sm * 4.3) + 0.02 * Math.sin(u * 11 - sm * 7);
    for (const [bu, bs, br, bh] of DUVET_BUMPS) puff += bh * Math.exp(-((u - bu) ** 2 + (sm - bs) ** 2) / (br * br));
    const folds = 0.055 * Math.sin(u * 7.5 + Math.sin(sm * 2.2) * 1.4) + 0.02 * Math.sin(u * 17);
    const off = t + (t > 0 ? 1 : 0.25) * puff * (1 - hang) + folds * hang;
    let x = x0 + u;
    let y = P.y + ny * off, z = P.z + nz * off;
    // Wavy hem on the floor.
    z += Math.max(0, sm - len + 0.5) * 0.35 * Math.sin(u * 3.1 + 0.7);
    // Past the foot of the bed the quilt slumps down to the floor.
    const k = smoothstep(footX - 0.05, footX + 0.5, x);
    if (k > 0) {
      const floorY = 0.012 + (t + T / 2) + (t > 0 ? 0.05 + 0.04 * Math.sin(sm * 4 + u * 3) : 0);
      y = lerp(y, Math.min(y, floorY), k);
      x += k * 0.06 * Math.sin(sm * 3);
    }
    pos.setXYZ(i, x, Math.max(0.004, y), z);
    // End and side faces get UVs across their own extent instead of a stretched stripe.
    if (Math.abs(nrm.getZ(i)) > 0.5) uv.setXY(i, u * 1.5, sm * 1.5 + t * 4);
    else if (Math.abs(nrm.getX(i)) > 0.5) uv.setXY(i, sm * 1.5, t * 4);
    else uv.setXY(i, u * 1.5, sm * 1.5);
  }
  geo.computeVertexNormals();
  const duvet = mesh(geo, mat);

  // Overlapping puffs give the cloud-like, outlined lumps of the illustration's quilt.
  const PUFFS = [
    [-1.2, 0.8, 0.72, 0.4, 0.17, 0.42], [-0.72, 0.86, 1.08, 0.5, 0.22, 0.48], [-0.2, 0.74, 0.7, 0.44, 0.17, 0.44],
    [-1.1, 0.74, 1.42, 0.42, 0.15, 0.32], [-0.42, 0.6, 1.55, 0.48, 0.22, 0.34], [0.12, 0.3, 1.25, 0.36, 0.24, 0.5],
    [-0.78, 0.15, 2.16, 0.62, 0.15, 0.3], [0.02, 0.14, 2.06, 0.46, 0.14, 0.38], [-1.32, 0.12, 2.12, 0.3, 0.12, 0.26],
  ];
  const puffs = [];
  PUFFS.forEach(([x, y, z, rx, ry, rz], i) => {
    const pg = new THREE.SphereGeometry(1, 40, 26);
    const pp = pg.attributes.position;
    for (let j = 0; j < pp.count; j++) {
      const px = pp.getX(j), py = pp.getY(j), pz = pp.getZ(j);
      const n = 1 + 0.09 * Math.sin(px * 3 + py * 1.7 + i) + 0.07 * Math.sin(pz * 4 - px * 2 + i * 2);
      pp.setXYZ(j, px * n * rx + x, (py < 0 ? py * 0.45 : py) * n * ry + y, pz * n * rz + z);
    }
    pg.computeVertexNormals();
    worldUV(pg, 1.5);
    puffs.push(mesh(pg, mat));
  });

  // Bunched black-and-white polka dot blanket on top.
  const dots = canvasTexture(polka({ bg: '#fdf8f5', dot: '#231a22', n: 4, r: 0.17 }), { repeat: [7, 4] });
  const bgeo = new THREE.SphereGeometry(1, 48, 32);
  const bp = bgeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    const n = 1 + 0.12 * Math.sin(x * 5 + z * 3) + 0.08 * Math.sin(z * 7 - x * 2) + (y < 0 ? -0.3 * y * y : 0);
    bp.setXYZ(i, x * n, y * n, z * n);
  }
  bgeo.computeVertexNormals();
  const blanket = mesh(bgeo, toon('#ffffff', { map: dots }));
  blanket.scale.set(0.62, 0.2, 0.4);
  blanket.position.set(-0.6, 1.0, 0.42);
  blanket.rotation.y = 0.25;
  const g = new THREE.Group();
  g.add(duvet, blanket, ...puffs);
  return g;
}

// ---------------------------------------------------------------- nightstand, lamp, mug, books
export function makeNightstand() {
  const g = new THREE.Group();
  const iron = toon(IRON);
  const top = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.035, 48), toon('#fdf7fa'));
  top.position.y = 0.62;
  g.add(top);
  const ring = mesh(new THREE.TorusGeometry(0.18, 0.012, 8, 40), iron);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.24;
  g.add(ring);
  for (let i = 0; i < 3; i++) {
    const th = (i * Math.PI * 2) / 3 + 0.35;
    const d = new V3(Math.cos(th), 0, Math.sin(th));
    const rad = (r, y) => new V3(d.x * r, y, d.z * r);
    const foot = spiral2D(0.3, 0.075, 0.065, 1.1, Math.PI, 1, 30);
    const pts = [rad(0.26, 0.6), rad(0.2, 0.44), rad(0.17, 0.26), rad(0.2, 0.12), ...foot.map(([r, y]) => rad(r, y))];
    g.add(tube(pts, 0.014, iron, { segments: 160 }));
    const sc = spiral2D(0.27, 0.45, 0.06, 1.0, -Math.PI / 2, 1, 24);
    g.add(tube([rad(0.205, 0.52), ...sc.map(([r, y]) => rad(r, y))], 0.011, iron, { segments: 90 }));
  }
  return g;
}

export function makeLamp() {
  const g = new THREE.Group();
  const gold = toon('#e8c47c');
  const base = mesh(new THREE.CylinderGeometry(0.075, 0.092, 0.025, 28), gold);
  base.position.y = 0.012;
  const stem = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.32, 10), gold);
  stem.position.y = 0.17;
  g.add(base, stem);
  const shadeTex = canvasTexture(polka({ bg: '#f7b5ca', dot: '#fff7f9', n: 4, r: 0.17 }), { repeat: [7, 2] });
  const shadeMat = toon('#ffffff', {
    map: shadeTex, emissive: new THREE.Color('#ff9f8c'), emissiveMap: shadeTex, emissiveIntensity: 0.2, side: THREE.DoubleSide,
  });
  const shade = mesh(new THREE.LatheGeometry([v2([0.215, 0]), v2([0.13, 0.31])], 48), shadeMat, { cast: false });
  shade.position.y = 0.2;
  g.add(shade);
  for (const [r, y] of [[0.215, 0.2], [0.13, 0.51]]) {
    const rim = mesh(new THREE.TorusGeometry(r, 0.007, 6, 48), toon('#f39bb8'));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    g.add(rim);
  }
  const bulbMat = noOutline(new THREE.MeshBasicMaterial({ color: '#fff3c4' }));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), bulbMat);
  bulb.position.y = 0.32;
  g.add(bulb);
  const light = new THREE.PointLight('#ffc996', 2.2, 4.8, 1.4);
  light.position.y = 0.36;
  g.add(light);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,236,190,0.9)', 'rgba(255,190,200,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  halo.scale.setScalar(1.2);
  halo.position.y = 0.36;
  g.add(halo);
  return { group: g, light, shadeMat, bulbMat, halo, shade };
}

export function makeMug() {
  const g = new THREE.Group();
  const tex = canvasTexture(polka({ bg: '#211a22', dot: '#fff8f4', n: 4, r: 0.19 }), { repeat: [4, 1.2] });
  const cup = mesh(new THREE.CylinderGeometry(0.048, 0.044, 0.1, 28, 1, true), toon('#ffffff', { map: tex, side: THREE.DoubleSide }));
  cup.position.y = 0.05;
  const bottom = mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.008, 28), toon('#211a22'));
  bottom.position.y = 0.004;
  const coffee = mesh(new THREE.CircleGeometry(0.045, 28), noOutline(toon('#7a4a35')), { cast: false });
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.088;
  const handle = mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 20, Math.PI * 1.2), toon('#211a22'));
  handle.rotation.z = -Math.PI * 0.6;
  handle.position.set(0.05, 0.05, 0);
  g.add(cup, bottom, coffee, handle);
  const steamTex = glowTexture('rgba(255,255,255,0.7)', 'rgba(255,255,255,0)');
  const puffs = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.phase = i / 3;
    g.add(s);
    puffs.push(s);
  }
  g.userData.puffs = puffs;
  return g;
}

export function makeBooks() {
  const g = new THREE.Group();
  const pages = toon('#fbf3e6');
  const titleCanvas = mkCanvas(512, 360), c = titleCanvas.getContext('2d');
  c.fillStyle = '#f2b3c6';
  c.fillRect(0, 0, 512, 360);
  c.strokeStyle = '#fff';
  c.lineWidth = 10;
  c.strokeRect(24, 24, 464, 312);
  c.fillStyle = '#5b3550';
  c.textAlign = 'center';
  c.font = '64px "DM Serif Display", Georgia, serif';
  c.fillText('Little', 256, 150);
  c.fillText('Women', 256, 222);
  c.font = '28px "Fredoka", sans-serif';
  c.fillText('LOUISA MAY ALCOTT', 256, 290);
  const coverTex = canvasTexture(titleCanvas, { wrap: false });
  const specs = [
    { w: 0.24, d: 0.17, h: 0.035, col: '#c7b3e6', rot: 0.25 },
    { w: 0.22, d: 0.155, h: 0.03, col: '#fbf7f2', rot: -0.12 },
    { w: 0.205, d: 0.145, h: 0.032, col: '#f2b3c6', rot: 0.1, top: true },
  ];
  let y = 0;
  for (const s of specs) {
    const cov = toon(s.col);
    const topMat = s.top ? toon('#ffffff', { map: coverTex }) : cov;
    const b = mesh(new THREE.BoxGeometry(s.w, s.h, s.d), [pages, cov, topMat, cov, pages, pages]);
    b.position.y = y + s.h / 2;
    b.rotation.y = s.rot;
    y += s.h;
    g.add(b);
  }
  return g;
}

// ---------------------------------------------------------------- wall decorations
export function makePoster({ w, h, design, images = [], spec = {}, deco = 'tape', seed = 1 }) {
  const art = canvasArt({ w, h, design, images, spec });
  const front = unlit({ map: art.texture });
  const edge = unlit({ color: '#f5eff3' });
  const g = new THREE.Group();
  const board = mesh(new THREE.BoxGeometry(w, h, 0.008), [edge, edge, edge, edge, front, edge], { cast: false, receive: false });
  g.add(board);
  const R = rng(seed);
  if (deco === 'tape') {
    const cols = ['#f7a8c4', '#bfa3ea', '#ffe28a', '#9fdcc9'];
    const tapeMat = noOutline(unlit({ color: cols[Math.floor(R() * cols.length)], transparent: true, opacity: 0.82 }));
    for (const s of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.04), tapeMat);
      t.position.set((s * w) / 2 - s * 0.02, h / 2 - 0.02, 0.0055);
      t.rotation.z = s * -0.65 + (R() - 0.5) * 0.2;
      g.add(t);
    }
  } else if (deco === 'pins') {
    const pinCols = ['#ef6f95', '#8f6ad0', '#f6c84c'];
    for (const s of [-1, 1]) {
      const pin = mesh(new THREE.SphereGeometry(0.014, 12, 8), toon(pinCols[Math.floor(R() * pinCols.length)]), { cast: false });
      pin.position.set((s * w) / 2 - s * 0.045, h / 2 - 0.045, 0.012);
      g.add(pin);
    }
  }
  return { group: g, board, art, materials: [front, edge] };
}

const FLAG_PATTERNS = [
  (g, w, h) => paint.dots(g, w, h, { bg: '#f7a3bf', dot: '#fff4f7', n: 5 }),
  (g, w, h) => paint.stripes(g, w, h, { a: '#fbe1c4', b: '#f49a52', n: 8, angle: 0.65 }),
  (g, w, h) => paint.stripes(g, w, h, { a: '#f1e2fb', b: '#a978d6', n: 8, angle: -0.6 }),
  (g, w, h) => paint.plaid(g, w, h, { bg: '#9ed6ae', a: '#3f9a6e', b: '#2b5f8c', n: 4 }),
  (g, w, h) => paint.dots(g, w, h, { bg: '#f2734f', dot: '#ffe2d3', n: 6, r: 0.16 }),
  (g, w, h) => paint.stripes(g, w, h, { a: '#ffe3d9', b: '#f2846f', n: 9, angle: 0 }),
  (g, w, h) => paint.gingham(g, w, h, { bg: '#fff0f5', a: '#f07aa3', n: 7 }),
  (g, w, h) => paint.dots(g, w, h, { bg: '#c3a6ee', dot: '#ffffff', n: 5 }),
  (g, w, h) => paint.stripes(g, w, h, { a: '#e6fff6', b: '#7fd3bf', n: 8, angle: 0.6 }),
];

function flagMaterial(i, W = 0.27, Hh = 0.36) {
  const cw = 270, ch = 360, c = mkCanvas(cw, ch), g = c.getContext('2d');
  g.save();
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(cw, 0);
  g.lineTo(cw / 2, ch);
  g.closePath();
  g.clip();
  FLAG_PATTERNS[i % FLAG_PATTERNS.length](g, cw, ch);
  g.strokeStyle = INK_HEX;
  g.lineWidth = 14;
  g.lineJoin = 'round';
  g.stroke();
  g.restore();
  return noOutline(toon('#ffffff', { map: canvasTexture(c, { wrap: false }), side: THREE.DoubleSide }));
}

export function makeBunting(a, b, sag, count, startPattern = 0) {
  const g = new THREE.Group();
  const pts = sagPoints(a, b, sag, 40);
  g.add(tube(pts, 0.006, toon('#f6ead9'), { segments: 80 }));
  const W = 0.27, H = 0.36;
  const tri = new THREE.Shape([v2([-W / 2, 0]), v2([W / 2, 0]), v2([0, -H])]);
  const geo = new THREE.ShapeGeometry(tri);
  const uv = geo.attributes.uv, p = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + W / 2) / W, (p.getY(i) + H) / H);
  const flags = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const pos = new V3().lerpVectors(a, b, t);
    pos.y -= sag * 4 * t * (1 - t);
    const slope = ((b.y - a.y) - sag * 4 * (1 - 2 * t)) / (b.x - a.x);
    const pivot = new THREE.Group();
    pivot.position.copy(pos);
    pivot.rotation.z = Math.atan(slope);
    const flag = new THREE.Mesh(geo, flagMaterial(startPattern + i));
    flag.castShadow = true;
    pivot.add(flag);
    pivot.userData.phase = i * 0.9 + startPattern;
    g.add(pivot);
    flags.push(pivot);
  }
  g.userData.flags = flags;
  return g;
}

export function makeStarGarland(a, b, sag, count) {
  const g = new THREE.Group();
  g.add(tube(sagPoints(a, b, sag, 30), 0.005, toon('#f6ead9'), { segments: 60 }));
  const geo = extrude(starShape(0.075, 0.48), 0.022, 0.008);
  const cols = ['#f7a8c8', '#b18be0', '#fffafc', '#f7a8c8', '#d8c2f5'];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = new V3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t) + 0.05;
    const s = mesh(geo, toon(cols[i % cols.length]));
    s.position.copy(p);
    s.rotation.set(0, 0.95, (i % 2 ? 0.25 : -0.2));
    s.userData.phase = i;
    g.add(s);
  }
  return g;
}

export function makeFairyLights(a, b, sag, count) {
  const g = new THREE.Group();
  g.add(tube(sagPoints(a, b, sag, 40), 0.0045, toon('#5d7b56'), { segments: 80 }));
  const colors = ['#ffe9a8', '#ffc4d8', '#cfe6ff', '#dcc8ff', '#c9f5df'];
  const glow = glowTexture('rgba(255,240,210,1)', 'rgba(255,200,220,0)');
  const bulbs = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = new V3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t) + 0.025;
    const col = new THREE.Color(colors[i % colors.length]);
    const mat = new THREE.MeshToonMaterial({ color: col, emissive: col, emissiveIntensity: 0.3 });
    const bulb = mesh(new THREE.SphereGeometry(0.02, 12, 10), mat, { cast: false });
    bulb.scale.y = 1.3;
    bulb.position.copy(p);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    halo.scale.setScalar(0.22);
    halo.position.copy(p);
    halo.position.z += 0.02;
    g.add(bulb, halo);
    bulbs.push({ mat, halo, phase: i * 1.7 });
  }
  g.userData.bulbs = bulbs;
  return g;
}

export function makePolaroid(photo, caption, seed) {
  const w = 0.21, h = 0.25;
  const p = makePoster({ w, h, design: 'polaroid', images: [photo.src], spec: { caption, fx: 0.5, fy: 0.3 }, deco: null, seed });
  const clip = mesh(new THREE.BoxGeometry(0.022, 0.06, 0.016), toon('#e9c79a'), { cast: false });
  clip.position.set(0, h / 2, 0.008);
  p.group.add(clip);
  return p;
}

// ---------------------------------------------------------------- music things
export function makeAlbum(album, { record = false, recordOut = 0.12 } = {}) {
  const S = 0.31;
  const g = new THREE.Group();
  const art = canvasArt({ w: S, h: S, design: 'cover', images: [album.cover], spec: { color: album.color, title: album.title }, density: 1600, maxPx: 512 });
  const front = unlit({ map: art.texture });
  const edge = toon('#f6f1f4');
  const sleeve = mesh(new THREE.BoxGeometry(S, S, 0.006), [edge, edge, edge, edge, front, edge]);
  sleeve.rotation.x = -Math.PI / 2;
  sleeve.position.y = 0.0045;
  g.add(sleeve);
  if (record) {
    const disc = mesh(new THREE.CylinderGeometry(0.148, 0.148, 0.003, 56), toon('#17131a'));
    disc.position.set(recordOut, 0.0016, 0);
    const label = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.0034, 32), toon(album.color));
    label.position.copy(disc.position);
    g.add(disc, label);
  }
  return { group: g, sleeve, art, materials: [front] };
}

export function makeGuitar() {
  const g = new THREE.Group();
  const pink = toon('#f59fbf'), white = toon('#fffafc'), black = toon('#221a24'), chrome = toon('#dcd6e0');
  const wood = toon('#ecc391');
  const body = shapeFrom([[0.2, -0.035], [0.235, -0.09], [0.2, -0.13], [0.08, -0.15], [-0.06, -0.185], [-0.2, -0.16],
    [-0.28, -0.08], [-0.29, 0.03], [-0.24, 0.13], [-0.12, 0.17], [0.0, 0.155], [0.13, 0.168], [0.258, 0.152], [0.25, 0.09], [0.2, 0.035]]);
  const bodyMesh = mesh(extrude(body, 0.04, 0.01, { curveSegments: 80, center: false }), pink);
  g.add(bodyMesh);
  const guard = shapeFrom([[0.19, 0.045], [0.2, 0.11], [0.12, 0.135], [0.02, 0.122], [-0.065, 0.07], [-0.085, -0.02],
    [-0.035, -0.105], [0.06, -0.125], [0.15, -0.1], [0.19, -0.045]]);
  const guardMesh = mesh(extrude(guard, 0.003, 0, { curveSegments: 40, center: false }), white);
  guardMesh.position.z = 0.05;
  g.add(guardMesh);
  for (const [x, y] of [[0.02, 0.028], [0.05, -0.03]]) {
    const pu = mesh(new RoundedBoxGeometry(0.03, 0.07, 0.012, 2, 0.005), black);
    pu.position.set(x, y, 0.057);
    g.add(pu);
  }
  const bridge = mesh(new THREE.BoxGeometry(0.045, 0.09, 0.012), chrome);
  bridge.position.set(-0.19, 0, 0.056);
  g.add(bridge);
  for (const [x, y] of [[-0.11, -0.1], [-0.155, -0.075]]) {
    const knob = mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.016, 16), black);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(x, y, 0.06);
    g.add(knob);
  }
  const neck = mesh(new THREE.BoxGeometry(0.66, 0.05, 0.024), wood);
  neck.position.set(0.5, 0, 0.04);
  g.add(neck);
  const fc = mkCanvas(1024, 64), f = fc.getContext('2d');
  f.fillStyle = '#5b3427';
  f.fillRect(0, 0, 1024, 64);
  f.fillStyle = '#e8e2ea';
  // Nut at u = 1 (far end of the neck); frets get closer together towards the body.
  let x = 1024;
  for (let i = 1; i <= 20; i++) {
    const nx = 1024 * Math.pow(0.944, i);
    f.fillRect(nx, 0, 5, 64);
    if ([3, 5, 7, 9, 12, 15].includes(i)) {
      f.beginPath();
      f.arc((x + nx) / 2, 32, 7, 0, 7);
      f.fill();
    }
    x = nx;
  }
  const board = mesh(new THREE.BoxGeometry(0.64, 0.048, 0.005), [wood, wood, wood, wood, toon('#ffffff', { map: canvasTexture(fc, { wrap: false }) }), wood]);
  board.position.set(0.51, 0, 0.0545);
  g.add(board);
  const head = mesh(extrude(shapeFrom([[0, -0.028], [0.06, -0.045], [0.17, -0.04], [0.21, -0.012], [0.205, 0.032], [0.12, 0.05], [0.04, 0.04], [0, 0.028]]), 0.016, 0.004, { center: false }), wood);
  head.position.set(0.83, 0, 0.032);
  g.add(head);
  for (let i = 0; i < 4; i++) {
    const peg = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 10), chrome);
    peg.rotation.x = Math.PI / 2;
    peg.position.set(0.875 + i * 0.04, 0.028 - i * 0.004, 0.06);
    g.add(peg);
  }
  const stringMat = noOutline(toon('#efeaf2'));
  for (let i = 0; i < 4; i++) {
    const s = mesh(new THREE.BoxGeometry(1.06, 0.0025, 0.0025), stringMat, { cast: false });
    s.position.set(0.32, -0.027 + i * 0.018, 0.064);
    g.add(s);
  }
  return g;
}

export function makeSneaker(color = '#a48ade') {
  const g = new THREE.Group();
  const canvasM = toon(color), white = toon('#fffbf8'), dark = toon('#5b4a8a');
  const upper = mesh(extrude(shapeFrom([[-0.135, 0.03], [-0.146, 0.1], [-0.13, 0.19], [-0.085, 0.216], [-0.035, 0.206], [0.0, 0.15],
    [0.05, 0.1], [0.11, 0.072], [0.145, 0.046], [0.15, 0.03]]), 0.07, 0.014, { curveSegments: 40 }), canvasM);
  const sole = mesh(extrude(new THREE.Shape([v2([-0.148, 0]), v2([0.162, 0]), v2([0.168, 0.02]), v2([0.158, 0.042]), v2([-0.152, 0.042]), v2([-0.158, 0.02])]), 0.086, 0.008), white);
  const stripe = mesh(new THREE.BoxGeometry(0.3, 0.008, 0.104), dark, { cast: false });
  stripe.position.set(0.005, 0.022, 0);
  const toe = mesh(new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), white);
  toe.scale.set(0.05, 0.034, 0.052);
  toe.position.set(0.118, 0.04, 0);
  g.add(upper, sole, stripe, toe);
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const lace = mesh(new THREE.BoxGeometry(0.012, 0.007, 0.075), white, { cast: false });
    lace.position.set(lerp(-0.012, 0.085, t), lerp(0.168, 0.092, t), 0);
    lace.rotation.z = -0.65;
    g.add(lace);
  }
  const pc = mkCanvas(128, 128), c = pc.getContext('2d');
  c.fillStyle = '#fffbf8';
  c.beginPath();
  c.arc(64, 64, 60, 0, 7);
  c.fill();
  c.strokeStyle = INK_HEX;
  c.lineWidth = 6;
  c.stroke();
  star2D(c, 64, 66, 30, 0, INK_HEX);
  const patch = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), noOutline(toon('#ffffff', { map: canvasTexture(pc, { wrap: false }), transparent: true })));
  patch.position.set(-0.085, 0.15, 0.0505);
  g.add(patch);
  return g;
}

// ---------------------------------------------------------------- little bed things
export function makePhone(coverUrl) {
  const g = new THREE.Group();
  const body = mesh(new RoundedBoxGeometry(0.082, 0.011, 0.162, 2, 0.008), toon('#8c6ad1'));
  body.position.y = 0.0055;
  g.add(body);
  const art = canvasArt({ w: 0.07, h: 0.148, design: 'phone', images: [coverUrl], spec: { on: false, progress: 0 }, density: 3400, maxPx: 512 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.148), noOutline(unlit({ map: art.texture })));
  screen.rotation.x = -Math.PI / 2;
  screen.position.y = 0.0115;
  g.add(screen);
  return { group: g, art, screen, body };
}

export function makeMagazine(photoUrl) {
  const g = new THREE.Group();
  const art = canvasArt({ w: 0.5, h: 0.33, design: 'magazine', images: [photoUrl], spec: { fx: 0.5, fy: 0.25 }, density: 2000, maxPx: 1024 });
  const geo = new THREE.PlaneGeometry(0.5, 0.33, 30, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, 0.018 * Math.sin(Math.PI * Math.min(1, Math.abs(x) / 0.25)));
  }
  geo.computeVertexNormals();
  const pages = new THREE.Mesh(geo, noOutline(unlit({ map: art.texture, side: THREE.DoubleSide })));
  pages.rotation.x = -Math.PI / 2;
  pages.position.y = 0.007;
  const stack = mesh(new THREE.BoxGeometry(0.49, 0.006, 0.32), toon('#fbf4f6'));
  stack.position.y = 0.003;
  g.add(stack, pages);
  return { group: g, art, pages };
}

export function makePowerStrip() {
  const g = new THREE.Group();
  const white = toon('#fbf8f6'), dark = noOutline(toon('#5a4a5c'));
  const strip = mesh(new RoundedBoxGeometry(0.36, 0.045, 0.088, 2, 0.014), white);
  strip.position.y = 0.0225;
  g.add(strip);
  for (let i = 0; i < 3; i++) {
    const hole = mesh(new THREE.BoxGeometry(0.05, 0.002, 0.05), dark, { cast: false });
    hole.position.set(-0.08 + i * 0.075, 0.0455, 0);
    g.add(hole);
  }
  const sw = mesh(new THREE.BoxGeometry(0.035, 0.012, 0.03), toon('#ef6f7f'));
  sw.position.set(0.145, 0.05, 0);
  g.add(sw);
  for (const x of [-0.08, -0.005]) {
    const plug = mesh(new RoundedBoxGeometry(0.04, 0.035, 0.04, 2, 0.008), white);
    plug.position.set(x, 0.062, 0);
    g.add(plug);
  }
  return g;
}

export function makeDust(count = 70) {
  const geo = new THREE.BufferGeometry();
  const R = rng(17), arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = -2.8 + R() * 3.4;
    arr[i * 3 + 1] = 0.3 + R() * 2.4;
    arr[i * 3 + 2] = 0.4 + R() * 2.8;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.035, map: glowTexture('rgba(255,245,225,1)', 'rgba(255,240,220,0)'), transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

// ---------------------------------------------------------------- right-hand corner: rug, record crate, turntable
export function makeRug(R = 0.95) {
  const g = new THREE.Group();
  const scallop = (r, n, amp) => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      const rr = r + amp * Math.abs(Math.sin((a * n) / 2));
      i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    return s;
  };
  const outer = mesh(extrude(scallop(R, 18, 0.07), 0.018, 0.006, { center: false }), toon('#f7d7e6'), { cast: false });
  const inner = mesh(extrude(scallop(R * 0.62, 14, 0.05), 0.008, 0.004, { center: false }), toon('#e7c9f1'), { cast: false });
  outer.rotation.x = inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.022;
  g.add(outer, inner);
  return g;
}

export function makeCrate(covers) {
  const g = new THREE.Group();
  const wood = toon('#fbf2ea');
  const W = 0.62, D = 0.4, H = 0.3, t = 0.02;
  const part = (w, h, d, x, y, z) => {
    const m = mesh(new THREE.BoxGeometry(w, h, d), wood);
    m.position.set(x, y, z);
    g.add(m);
  };
  part(W, t, D, 0, t / 2, 0);
  part(W, H, t, 0, H / 2, -D / 2 + t / 2);
  part(t, H, D, -W / 2 + t / 2, H / 2, 0);
  part(t, H, D, W / 2 - t / 2, H / 2, 0);
  part(W, 0.11, t, 0, 0.055, D / 2 - t / 2);
  const R = rng(31);
  const pastel = ['#f4a6c4', '#b89be6', '#9fd8c9', '#f6d27a', '#8fb8f2', '#f28f86'];
  const records = [];
  for (let i = 0; i < 7; i++) {
    const front = covers[i];
    let mats;
    if (front) {
      const art = canvasArt({ w: 0.3, h: 0.3, design: 'cover', images: [front.cover], spec: { color: front.color, title: front.title }, density: 1600, maxPx: 512 });
      const m = unlit({ map: art.texture });
      mats = [wood, wood, wood, wood, m, wood];
      records.push({ album: front, materials: [m] });
    } else mats = toon(pastel[Math.floor(R() * pastel.length)]);
    const rec = mesh(new THREE.BoxGeometry(0.3, 0.3, 0.008), mats);
    rec.position.set((R() - 0.5) * 0.04, 0.17, D / 2 - 0.06 - i * 0.045);
    rec.rotation.x = -0.16 - i * 0.015;
    g.add(rec);
    if (front) records[records.length - 1].mesh = rec;
  }
  return { group: g, records };
}

export function makeTurntable(album) {
  const g = new THREE.Group();
  const box = mesh(new RoundedBoxGeometry(0.5, 0.42, 0.42, 3, 0.03), toon('#fbf4f8'));
  box.position.y = 0.21;
  g.add(box);
  const base = mesh(new RoundedBoxGeometry(0.46, 0.08, 0.36, 3, 0.02), toon('#f39dbf'));
  base.position.y = 0.46;
  const plate = mesh(new THREE.BoxGeometry(0.42, 0.006, 0.32), toon('#fff3f8'));
  plate.position.y = 0.503;
  g.add(base, plate);
  const spin = new THREE.Group();
  spin.position.set(-0.05, 0.508, 0);
  const platter = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 48), toon('#4a3f50'));
  const disc = mesh(new THREE.CylinderGeometry(0.143, 0.143, 0.004, 64), toon('#17131a'));
  disc.position.y = 0.008;
  const art = canvasArt({ w: 0.1, h: 0.1, design: 'cover', images: [album.cover], spec: { color: album.color, title: '' }, density: 3000, maxPx: 256 });
  const labelMat = noOutline(unlit({ map: art.texture }));
  const label = new THREE.Mesh(new THREE.CircleGeometry(0.048, 40), labelMat);
  label.rotation.x = -Math.PI / 2;
  label.position.y = 0.0105;
  const grooves = noOutline(new THREE.MeshBasicMaterial({ color: '#3a3240', transparent: true, opacity: 0.6 }));
  for (const r of [0.08, 0.105, 0.128]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.002, 64), grooves);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.0103;
    spin.add(ring);
  }
  spin.add(platter, disc, label);
  g.add(spin);
  const chrome = toon('#dcd6e0');
  const pivot = mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.03, 16), chrome);
  pivot.position.set(0.16, 0.52, -0.1);
  const arm = new THREE.Group();
  arm.position.set(0.16, 0.54, -0.1);
  const rod = mesh(new THREE.BoxGeometry(0.008, 0.008, 0.2), chrome);
  rod.position.set(0, 0, 0.1);
  const headShell = mesh(new THREE.BoxGeometry(0.02, 0.012, 0.035), toon(INK_HEX));
  headShell.position.set(0, -0.006, 0.205);
  arm.add(rod, headShell);
  arm.rotation.y = -0.25;
  g.add(pivot, arm);
  for (const x of [0.15, 0.19]) {
    const knob = mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.012, 14), toon('#8c6ad1'));
    knob.position.set(x, 0.508, 0.13);
    g.add(knob);
  }
  return { group: g, spin, arm, labelMat, pick: [base, plate, platter, disc, label] };
}

export function makeHeartCushion(color = '#f48db3') {
  const geo = extrude(heartShape(0.2), 0.07, 0.04, { curveSegments: 40 });
  const m = mesh(geo, toon(color));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.1;
  const g = new THREE.Group();
  g.add(m);
  return g;
}
