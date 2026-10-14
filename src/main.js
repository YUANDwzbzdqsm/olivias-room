import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { V3, INK, unlitMaterials, setOutline, clamp, lerp, tube, toon } from './kit.js';
import * as P from './props.js';
import { PHOTOS } from './photos.js';
import { ALBUMS } from './albums.js';
import { imageProgress } from './posters.js';

const $ = (s) => document.querySelector(s);
const PINK = [0.96, 0.42, 0.62];

// Poster canvases are drawn with web fonts, so wait for them (but never block for long).
await Promise.race([
  Promise.all(['64px "Archivo Black"', '64px "Caveat Brush"', '500 32px "Fredoka"', '600 32px "Fredoka"',
    'italic 32px "DM Serif Display"', '32px "DM Serif Display"'].map((f) => document.fonts.load(f))),
  new Promise((r) => setTimeout(r, 3500)),
]);

// ------------------------------------------------------------------ renderer
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0035, defaultColor: INK, defaultAlpha: 1, defaultKeepAlive: true });

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);

// ------------------------------------------------------------------ lights
const DAY = { hemi: new THREE.Color('#fff4fb'), sun: new THREE.Color('#fff3ea') };
const NIGHT = { hemi: new THREE.Color('#8a74c0'), sun: new THREE.Color('#a8b4ff') };
const hemi = new THREE.HemisphereLight('#fff4fb', '#d6b6d4', 1.25);
const amb = new THREE.AmbientLight('#ffffff', 0.55);
const sun = new THREE.DirectionalLight('#fff3ea', 1.45);
sun.position.set(3, 7.5, 7);
sun.target.position.set(-0.5, 0, 1.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -5.5, right: 5.5, top: 5.5, bottom: -5.5, near: 1, far: 25 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.025;
sun.shadow.radius = 3;
if ('intensity' in sun.shadow) sun.shadow.intensity = 0.55;
scene.add(hemi, amb, sun, sun.target);

// ------------------------------------------------------------------ interactive registry
const items = [];
const pickables = [];
function addItem(item, meshes) {
  Object.assign(item, { hover: 0, hovered: false, basePos: item.group.position.clone(), baseScale: item.group.scale.clone() });
  meshes.forEach((m) => { m.userData.item = item; pickables.push(m); });
  items.push(item);
  return item;
}
const tagUnlit = (materials, pos) => materials.forEach((m) => { m.userData.pos = pos.clone(); });

// ------------------------------------------------------------------ room + furniture
scene.add(P.makeRoom());
const bed = P.makeBed();
scene.add(bed.group);
scene.add(P.makeDuvet());

const BACK = new V3(0, 0, 1), LEFT = new V3(1, 0, 0), UP = new V3(0, 1, 0);

const POSTERS = [
  { x: -2.21, y: 2.76, w: 0.91, h: 0.6, r: 0.015, design: 'photo', photo: 'aceBand', spec: { fy: 0.4 }, deco: 'tape' },
  { x: -1.3, y: 2.83, w: 0.53, h: 0.7, r: -0.02, design: 'photo', photo: 'sunglasses', spec: { border: '#bdb5c2', filter: 'grayscale(1) contrast(1.05)', fy: 0.15 }, deco: 'pins' },
  { x: -2.57, y: 2.17, w: 0.49, h: 0.65, r: 0.03, design: 'dropdead', album: 'dropdead', deco: 'tape' },
  { x: -2.51, y: 1.52, w: 0.48, h: 0.7, r: -0.025, design: 'stars', photo: 'getHimBack', spec: { fy: 0.3 }, deco: 'pins' },
  { x: -1.65, y: 1.88, w: 0.96, h: 1.3, r: 0.01, design: 'title2026', photo: 'acePurple', spec: { fy: 0.22 }, deco: 'tape' },
  { x: -0.8, y: 2.0, w: 0.44, h: 0.64, r: -0.03, design: 'photo', photo: 'bwim22', spec: { fy: 0.3 }, deco: 'tape' },
  { x: 0.0, y: 2.26, w: 0.9, h: 1.2, r: 0.012, design: 'tour', photo: 'aceBlue3', spec: { fx: 0.55, fy: 0.15 }, deco: 'pins' },
  { x: 0.88, y: 2.2, w: 0.56, h: 0.81, r: 0.025, design: 'photo', photo: 'y23a', spec: { border: '#2a1a2e', fy: 0.25 }, deco: 'tape' },
  { x: -0.27, y: 1.38, w: 1.26, h: 0.66, r: -0.01, design: 'tracklist', album: 'guts', spec: { tracks: ALBUMS.guts.tracks }, deco: 'pins' },
  { x: 0.91, y: 1.25, w: 0.56, h: 0.96, r: -0.02, design: 'gutsPhoto', photo: 'aceSit', spec: { fy: 0.2 }, deco: 'tape' },
  { x: -1.31, y: 1.03, w: 0.39, h: 0.55, r: 0.04, design: 'photo', photo: 'whiteHouse', spec: { border: '#d4cbdb', fy: 0.25 }, deco: 'tape' },
  { x: 1.75, y: 2.3, w: 0.72, h: 1.0, r: 0.015, design: 'ysps', album: 'ysps', deco: 'tape' },
  { x: 2.6, y: 2.62, w: 0.6, h: 0.8, r: -0.02, design: 'sour', album: 'sour', deco: 'pins' },
  { x: 2.65, y: 1.76, w: 0.52, h: 0.62, r: 0.03, design: 'photo', photo: 'aceMic', spec: { fy: 0.2 }, deco: 'tape' },
  { x: 3.3, y: 2.1, w: 0.4, h: 0.55, r: -0.03, design: 'photo', photo: 'kca22', spec: { fy: 0.2, border: '#f8c9d8' }, deco: 'pins' },
  { wall: 'left', z: 0.85, y: 2.1, w: 0.86, h: 1.29, r: 0.01, design: 'photo', photo: 'iheart24', spec: { fy: 0.2 }, deco: 'tape' },
  { wall: 'left', z: 2.05, y: 2.2, w: 0.5, h: 0.8, r: -0.02, design: 'photo', photo: 'westWing', spec: { fy: 0.15 }, deco: 'pins' },
];

POSTERS.forEach((c, i) => {
  const photo = c.photo && PHOTOS[c.photo];
  const p = P.makePoster({
    w: c.w, h: c.h, design: c.design, images: [photo ? photo.src : ALBUMS[c.album].cover],
    spec: c.spec ?? {}, deco: c.deco, seed: i + 1,
  });
  const lift = 0.006 + (i % 4) * 0.002;
  let normal = BACK;
  if (c.wall === 'left') {
    p.group.position.set(-3 + lift, c.y, c.z);
    p.group.rotation.set(0, Math.PI / 2, c.r);
    normal = LEFT;
  } else {
    p.group.position.set(c.x, c.y, lift);
    p.group.rotation.z = c.r;
  }
  scene.add(p.group);
  tagUnlit(p.materials, p.group.position);
  addItem({
    kind: photo ? 'photo' : 'album', key: c.photo ?? c.album, label: photo ? photo.caption : ALBUMS[c.album].title,
    group: p.group, normal, size: [c.w, c.h], materials: p.materials, pop: 0.05, focus: true,
  }, [p.board]);
});

// bunting, garland, fairy lights + polaroids
const buntings = [
  P.makeBunting(new V3(-1.6, 3.33, 0.07), new V3(0.95, 3.25, 0.07), 0.2, 7, 0),
  P.makeBunting(new V3(0.95, 3.25, 0.07), new V3(3.5, 3.31, 0.07), 0.2, 7, 7),
];
buntings.forEach((b) => scene.add(b));
scene.add(P.makeStarGarland(new V3(-2.93, 3.34, 0.12), new V3(-2.93, 3.24, 2.75), 0.32, 9));

const wireA = new V3(1.3, 1.34, 0.05), wireB = new V3(3.5, 1.38, 0.05), wireSag = 0.16;
const fairy = P.makeFairyLights(wireA, wireB, wireSag, 18);
scene.add(fairy);
[['aceBlue1', 'LA ♡'], ['acePink', 'guts era'], ['aceRed2', '10.09.23'], ['acePiano', 'piano ballad'], ['aceDuo', 'encore!']]
  .forEach(([k, cap], i) => {
    const t = 0.12 + i * 0.19;
    const at = new V3().lerpVectors(wireA, wireB, t);
    at.y -= wireSag * 4 * t * (1 - t);
    const p = P.makePolaroid(PHOTOS[k], cap, 40 + i);
    p.group.position.set(at.x, at.y - 0.115, 0.03 + i * 0.001);
    p.group.rotation.z = i % 2 ? 0.06 : -0.05;
    scene.add(p.group);
    tagUnlit(p.materials, p.group.position);
    addItem({ kind: 'photo', key: k, label: PHOTOS[k].caption, group: p.group, normal: BACK, size: [0.21, 0.25], materials: p.materials, pop: 0.04, focus: true }, [p.board]);
  });

// nightstand corner
const stand = new THREE.Group();
stand.position.set(-2.28, 0, 2.12);
stand.add(P.makeNightstand());
const lamp = P.makeLamp();
lamp.group.position.set(-0.06, 0.6375, -0.07);
stand.add(lamp.group);
const mug = P.makeMug();
mug.position.set(0.17, 0.6375, -0.06);
mug.rotation.y = -0.6;
stand.add(mug);
const books = P.makeBooks();
books.position.set(0.06, 0.6375, 0.15);
books.rotation.y = 0.3;
stand.add(books);
scene.add(stand);
let lampOn = true;
addItem({ kind: 'lamp', label: '台灯 · 点击开关', group: lamp.group, onClick: () => { lampOn = !lampOn; } }, [lamp.shade]);
const lampWorld = new V3(-2.34, 0.99, 2.05);

// things on the bed
const phone = P.makePhone(ALBUMS.dropdead.cover);
phone.group.position.set(-1.72, 0.625, 1.45);
phone.group.rotation.y = 0.45;
scene.add(phone.group);
unlitMaterials.delete(phone.screen.material);
let phoneOn = false, phoneT = 0.18;
addItem({
  kind: 'phone', label: '手机 · 正在播放 drop dead', group: phone.group,
  onClick: () => { phoneOn = !phoneOn; phone.art.spec.on = phoneOn; phone.art.redraw(); },
}, [phone.body, phone.screen]);

const mag = P.makeMagazine(PHOTOS.aceArmUp.src);
mag.group.position.set(-1.8, 0.625, 0.95);
mag.group.rotation.y = -0.32;
scene.add(mag.group);
tagUnlit([mag.pages.material], mag.group.position);
addItem({ kind: 'photo', key: 'aceArmUp', label: '杂志 · ' + PHOTOS.aceArmUp.caption, group: mag.group, normal: UP, size: [0.5, 0.33], focus: true }, [mag.pages]);

addItem({ kind: 'bunny', label: '小兔子 · 戳一下', group: bed.bunny, onClick: (it) => { it.hop = 1; } }, bunnyMeshes(bed.bunny));

// floor
const floorBunny = P.makeBunny({ dress: '#e35b57', scale: 0.95 });
floorBunny.position.set(-1.2, 0, 2.78);
floorBunny.rotation.y = 0.3;
scene.add(floorBunny);
addItem({ kind: 'bunny', label: '小兔子 · 戳一下', group: floorBunny, onClick: (it) => { it.hop = 1; } }, bunnyMeshes(floorBunny));

function bunnyMeshes(g) {
  const out = [];
  g.traverse((o) => o.isMesh && out.push(o));
  return out;
}

const strip = P.makePowerStrip();
strip.position.set(-1.88, 0, 2.86);
strip.rotation.y = 0.25;
scene.add(strip);
const cord = toon('#fbf8f6');
scene.add(tube([[-1.96, 0.07, 2.88], [-2.02, 0.012, 2.7], [-2.12, 0.012, 2.52], [-2.18, 0.03, 2.38], [-2.2, 0.3, 2.3], [-2.25, 0.6, 2.2], [-2.32, 0.66, 2.05]], 0.007, cord, { segments: 80 }));
scene.add(tube([[-1.89, 0.07, 2.84], [-1.8, 0.012, 2.6], [-1.72, 0.012, 2.2], [-1.68, 0.02, 1.85], [-1.66, 0.25, 1.76], [-1.66, 0.58, 1.74], [-1.68, 0.64, 1.6], [-1.7, 0.633, 1.53]], 0.006, cord, { segments: 90 }));
scene.add(tube([[-1.75, 0.04, 2.95], [-1.6, 0.012, 3.05], [-1.45, 0.012, 2.95], [-1.52, 0.012, 2.82], [-1.66, 0.012, 2.9], [-1.58, 0.012, 3.15], [-1.3, 0.012, 3.2]], 0.006, cord, { segments: 90 }));

const albumSpots = [
  ['ysps', -2.08, 3.02, 0.4, false],
  ['sour', -1.5, 3.22, -0.25, true],
];
albumSpots.forEach(([key, x, z, ry, record], i) => {
  const a = P.makeAlbum(ALBUMS[key], { record, recordOut: 0.13 });
  a.group.position.set(x, 0.001 + i * 0.004, z);
  a.group.rotation.y = ry;
  scene.add(a.group);
  tagUnlit(a.materials, a.group.position);
  addItem({ kind: 'album', key, label: ALBUMS[key].title, group: a.group, normal: UP, size: [0.31, 0.31], materials: a.materials, pop: 0.03, focus: true }, [a.sleeve]);
});

const guitarHolder = new THREE.Group();
const guitar = P.makeGuitar();
guitar.rotation.set(-Math.PI / 2, -0.12, 0);
guitarHolder.add(guitar);
guitarHolder.position.set(0.05, 0.075, 2.85);
guitarHolder.rotation.y = 0.22;
guitarHolder.scale.setScalar(1.12);
scene.add(guitarHolder);
const guitarMeshes = [];
guitar.traverse((o) => o.isMesh && guitarMeshes.push(o));
const NOTES = [41.2, 55, 73.42, 98, 82.4, 61.7];
let noteIdx = 0;
addItem({ kind: 'guitar', label: '粉色贝斯 · 弹一下', group: guitarHolder, onClick: (it) => { it.wobble = 1; pluck(NOTES[noteIdx++ % NOTES.length]); } }, guitarMeshes);

const rug = P.makeRug(0.78);
rug.position.set(1.35, 0, 2.35);
scene.add(rug);
const cushion = P.makeHeartCushion();
cushion.position.set(1.55, 0.02, 2.1);
cushion.rotation.y = -0.5;
cushion.children[0].rotation.z = 0.15;
scene.add(cushion);

const shoeA = P.makeSneaker();
shoeA.position.set(2.0, 0, 3.12);
shoeA.rotation.y = -0.55;
const shoeB = P.makeSneaker();
shoeB.position.set(2.42, 0.051, 3.32);
shoeB.rotation.set(-Math.PI / 2, 0, 0.9, 'YXZ');
scene.add(shoeA, shoeB);

const crate = P.makeCrate([ALBUMS.guts]);
crate.group.position.set(2.2, 0, 0.3);
crate.group.rotation.y = -0.06;
scene.add(crate.group);
crate.records.forEach((r) => {
  tagUnlit(r.materials, crate.group.position);
  addItem({ kind: 'album', key: 'guts', label: ALBUMS.guts.title + ' · 黑胶', group: r.mesh, normal: BACK, size: [0.3, 0.3], materials: r.materials, pop: 0.04, focus: true }, [r.mesh]);
});

const deck = P.makeTurntable(ALBUMS.ysps);
deck.group.position.set(2.95, 0, 0.4);
deck.group.rotation.y = -0.2;
scene.add(deck.group);
tagUnlit([deck.labelMat], deck.group.position);
let spinning = false;
addItem({
  kind: 'album', key: 'ysps', label: '唱机 · 点一下放唱片', group: deck.group, normal: UP, size: [0.62, 0.5], focus: true,
  onClick: (it) => { spinning = !spinning; if (spinning) focusOn(it); },
}, deck.pick);

const dust = P.makeDust();
scene.add(dust);

// ------------------------------------------------------------------ camera rig
const view = { yaw: 0, pitch: 0, dist: 0, target: new V3() };
const goal = { yaw: 0, pitch: 0, dist: 0, target: new V3() };
let home = null;
let focused = null;
const pointer = { x: 0, y: 0, nx: 0, ny: 0, inside: false, down: null, dragged: false, moved: true };
const parallax = { x: 0, y: 0 };

function homeView() {
  const a = window.innerWidth / window.innerHeight;
  if (a >= 1.15) return { yaw: 0.14, pitch: 0.4, dist: 7.3, target: new V3(-0.1, 1.1, 1.3) };
  // Portrait: frame the bed corner like the original illustration.
  return { yaw: 0.12, pitch: 0.42, dist: 5.9 + (1.15 - a) * 1.4, target: new V3(-1.1, 1.2, 1.35) };
}

function setGoal(v) {
  goal.yaw = v.yaw;
  goal.pitch = v.pitch;
  goal.dist = v.dist;
  goal.target.copy(v.target);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = camera.aspect >= 1.15 ? 36 : Math.min(58, 36 + (1.15 - camera.aspect) * 30);
  camera.updateProjectionMatrix();
  home = homeView();
  if (!focused) setGoal(home);
}
window.addEventListener('resize', resize);
resize();
Object.assign(view, { yaw: home.yaw - 0.35, pitch: home.pitch + 0.25, dist: home.dist * 1.25, target: home.target.clone() });

function placeCamera() {
  const yaw = view.yaw + parallax.x, pitch = view.pitch + parallax.y;
  camera.position.set(
    view.target.x + view.dist * Math.sin(yaw) * Math.cos(pitch),
    view.target.y + view.dist * Math.sin(pitch),
    view.target.z + view.dist * Math.cos(yaw) * Math.cos(pitch),
  );
  camera.lookAt(view.target);
}

function focusOn(item) {
  focused = item;
  const center = new THREE.Box3().setFromObject(item.group).getCenter(new V3());
  const n = item.normal;
  const [w, h] = item.size;
  const wide = window.innerWidth > 820;
  const vfov = (camera.fov * Math.PI) / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const dist = Math.max((h / (wide ? 0.72 : 0.42)) / (2 * Math.tan(vfov / 2)), (w / (wide ? 0.5 : 0.86)) / (2 * Math.tan(hfov / 2)));
  const yaw = n.y > 0.9 ? 0.12 : Math.atan2(n.x, n.z);
  const pitch = n.y > 0.9 ? 1.2 : 0.04;
  const right = new V3(Math.cos(yaw), 0, -Math.sin(yaw));
  const up = new V3(-Math.sin(pitch) * Math.sin(yaw), Math.cos(pitch), -Math.sin(pitch) * Math.cos(yaw));
  const target = center.clone();
  if (wide) target.addScaledVector(right, 2 * dist * Math.tan(hfov / 2) * 0.19);
  else target.addScaledVector(up, -2 * dist * Math.tan(vfov / 2) * 0.2);
  setGoal({ yaw, pitch, dist: Math.max(0.55, dist), target });
  document.body.classList.add('focused');
  showCard(item);
}

function unfocus() {
  focused = null;
  setGoal(home);
  document.body.classList.remove('focused');
  hideCard();
}

// ------------------------------------------------------------------ input
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(x, y) {
  ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(pickables, false)[0];
  return hit ? hit.object.userData.item : null;
}

canvas.addEventListener('pointerdown', (e) => {
  pointer.down = { x: e.clientX, y: e.clientY, yaw: goal.yaw, pitch: goal.pitch };
  pointer.dragged = false;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
  pointer.inside = true;
  pointer.moved = true;
  const d = pointer.down;
  if (!d) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (!pointer.dragged && Math.hypot(dx, dy) > 6) {
    pointer.dragged = true;
    if (focused) {
      unfocus();
      d.yaw = goal.yaw;
      d.pitch = goal.pitch;
      d.x = e.clientX;
      d.y = e.clientY;
    }
    hideHint();
  }
  if (pointer.dragged) {
    goal.yaw = clamp(d.yaw - (e.clientX - d.x) * 0.0042, home.yaw - 0.75, home.yaw + 0.7);
    goal.pitch = clamp(d.pitch + (e.clientY - d.y) * 0.0032, 0.06, 0.85);
  }
});
const endDrag = (e) => {
  const d = pointer.down;
  pointer.down = null;
  if (!d || pointer.dragged) return;
  const item = pick(e.clientX, e.clientY);
  if (item) {
    hideHint();
    if (item.onClick) item.onClick(item);
    else if (item.focus) focusOn(item);
  } else if (focused) unfocus();
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', () => { pointer.down = null; });
canvas.addEventListener('pointerleave', () => { pointer.inside = false; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (focused) unfocus();
  goal.dist = clamp(goal.dist * (1 + e.deltaY * 0.0012), home.dist * 0.5, home.dist * 1.35);
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!$('#credits').hidden) closeCredits();
    else if (focused) unfocus();
  }
});

// ------------------------------------------------------------------ UI
const card = $('#card');
function showCard(item) {
  const isPhoto = item.kind === 'photo';
  const data = isPhoto ? PHOTOS[item.key] : ALBUMS[item.key];
  card.querySelector('img').src = isPhoto ? data.src : data.cover;
  card.querySelector('img').alt = isPhoto ? `Olivia Rodrigo — ${data.caption}` : `${data.title} 封面`;
  card.querySelector('.eyebrow').textContent = isPhoto ? '墙上的照片 · PHOTO' : data.kind;
  card.querySelector('h2').textContent = isPhoto ? 'Olivia Rodrigo' : data.title;
  card.querySelector('.meta').textContent = isPhoto ? data.caption : `${data.date} · ${data.label} Records · ${data.tracks.length} 首`;
  const ol = card.querySelector('.tracks');
  ol.replaceChildren(...(isPhoto ? [] : data.tracks.map((t) => Object.assign(document.createElement('li'), { textContent: t }))));
  ol.hidden = isPhoto;
  const credit = card.querySelector('.credit');
  credit.replaceChildren();
  const a = document.createElement('a');
  a.target = '_blank';
  a.rel = 'noopener';
  if (isPhoto) {
    credit.append(`摄影 ${data.author} · ${data.license} · `);
    a.href = data.page;
    a.textContent = 'Wikimedia Commons ↗';
  } else {
    credit.append('封面 © Geffen Records · ');
    a.href = data.page;
    a.textContent = 'Wikipedia ↗';
  }
  credit.append(a);
  card.hidden = false;
  requestAnimationFrame(() => card.classList.add('open'));
}
function hideCard() {
  card.classList.remove('open');
  setTimeout(() => { if (!card.classList.contains('open')) card.hidden = true; }, 260);
}
card.querySelector('.close').addEventListener('click', unfocus);

const tip = $('#tip');
function updateTip(item) {
  if (!item || pointer.down || !pointer.inside) { tip.classList.remove('show'); return; }
  tip.textContent = item.label;
  tip.style.transform = `translate(${pointer.x + 16}px, ${pointer.y + 18}px)`;
  tip.classList.add('show');
}

let night = false;
const nightBtn = $('#night');
nightBtn.addEventListener('click', () => {
  night = !night;
  document.documentElement.classList.toggle('night', night);
  nightBtn.setAttribute('aria-pressed', String(night));
  nightBtn.querySelector('span').textContent = night ? '白天' : '夜晚';
});
$('#reset').addEventListener('click', () => { if (focused) unfocus(); else setGoal(home); });

const credits = $('#credits');
function openCredits() {
  const list = credits.querySelector('ul');
  if (!list.childElementCount) {
    const used = new Set(items.filter((i) => i.kind === 'photo').map((i) => i.key));
    for (const k of used) {
      const p = PHOTOS[k];
      const li = document.createElement('li');
      const a = Object.assign(document.createElement('a'), { href: p.page, target: '_blank', rel: 'noopener', textContent: p.caption });
      li.append(a, ` — ${p.author} · ${p.license}`);
      list.append(li);
    }
  }
  credits.hidden = false;
}
function closeCredits() { credits.hidden = true; }
$('#creditsBtn').addEventListener('click', openCredits);
credits.querySelector('.close').addEventListener('click', closeCredits);
credits.addEventListener('click', (e) => { if (e.target === credits) closeCredits(); });

const hint = $('#hint');
function hideHint() { hint.classList.add('gone'); }

const loader = $('#loader');
const loaderText = loader.querySelector('.count');
let loaderDone = false;
const finishLoading = () => {
  if (loaderDone) return;
  loaderDone = true;
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 700);
};
imageProgress.subscribe((s) => {
  loaderText.textContent = `${s.done} / ${s.total}`;
  if (s.total && s.done >= s.total) setTimeout(finishLoading, 250);
});
setTimeout(finishLoading, 9000);

// ------------------------------------------------------------------ audio
let audio = null;
function pluck(freq) {
  audio ??= new AudioContext();
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  const sub = audio.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = freq;
  const lp = audio.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1600, t);
  lp.frequency.exponentialRampToValueAtTime(180, t + 0.7);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.3, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  osc.connect(lp);
  sub.connect(lp);
  lp.connect(gain).connect(audio.destination);
  osc.start(t);
  sub.start(t);
  osc.stop(t + 1.7);
  sub.stop(t + 1.7);
}

// ------------------------------------------------------------------ frame loop
const clock = new THREE.Clock();
let nightT = 0, hovered = null, phoneTick = 0;
const flags = buntings.flatMap((b) => b.userData.flags);
const tmpColor = new THREE.Color();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const k = 1 - Math.exp(-dt * 4.5);

  // camera
  const wantPx = focused || pointer.down || !pointer.inside ? 0 : -pointer.nx * 0.035;
  const wantPy = focused || pointer.down || !pointer.inside ? 0 : pointer.ny * 0.02;
  parallax.x += (wantPx - parallax.x) * k;
  parallax.y += (wantPy - parallax.y) * k;
  view.yaw += (goal.yaw - view.yaw) * k;
  view.pitch += (goal.pitch - view.pitch) * k;
  view.dist += (goal.dist - view.dist) * k;
  view.target.lerp(goal.target, k);
  placeCamera();

  // hover
  if (pointer.moved || pointer.down) {
    pointer.moved = false;
    const next = pointer.inside && !pointer.down ? pick(pointer.x, pointer.y) : null;
    if (next !== hovered) {
      if (hovered) hovered.hovered = false;
      hovered = next;
      if (hovered) hovered.hovered = true;
      canvas.style.cursor = hovered ? 'pointer' : pointer.down ? 'grabbing' : 'grab';
    }
    updateTip(hovered);
  }
  for (const it of items) {
    const target = it.hovered || it === focused ? 1 : 0;
    it.hover += (target - it.hover) * (1 - Math.exp(-dt * 10));
    if (it.pop) {
      it.group.position.copy(it.basePos).addScaledVector(it.normal, it.hover * it.pop);
      it.group.scale.copy(it.baseScale).multiplyScalar(1 + it.hover * 0.025);
    }
    if (it.materials) {
      const on = it.hover > 0.5;
      if (it.outlineOn !== on) {
        it.outlineOn = on;
        it.materials.forEach((m) => setOutline(m, on ? PINK : INK, on ? 0.007 : 0.0035));
      }
    }
    if (it.hop !== undefined && it.hop > 0) {
      it.hop = Math.max(0, it.hop - dt * 2.2);
      it.group.position.y = it.basePos.y + Math.sin((1 - it.hop) * Math.PI) * 0.14;
      it.group.rotation.z = Math.sin((1 - it.hop) * Math.PI * 2) * 0.12;
    }
    if (it.wobble) {
      it.wobble = Math.max(0, it.wobble - dt * 1.4);
      guitar.rotation.z = Math.sin(t * 38) * it.wobble * 0.03;
    }
  }

  // ambient animation
  flags.forEach((f) => { f.rotation.x = Math.sin(t * 1.3 + f.userData.phase) * 0.07; });
  mug.userData.puffs.forEach((s) => {
    const p = (t * 0.35 + s.userData.phase) % 1;
    s.position.set(Math.sin(p * 6 + s.userData.phase * 9) * 0.02, 0.1 + p * 0.28, 0);
    s.scale.setScalar(0.05 + p * 0.12);
    s.material.opacity = Math.sin(p * Math.PI) * 0.45;
  });
  const dp = dust.geometry.attributes.position;
  for (let i = 0; i < dp.count; i++) {
    let y = dp.getY(i) + dt * 0.03;
    if (y > 2.8) y = 0.3;
    dp.setY(i, y);
    dp.setX(i, dp.getX(i) + Math.sin(t * 0.4 + i) * dt * 0.01);
  }
  dp.needsUpdate = true;
  deck.spin.rotation.y -= dt * (spinning ? 3.5 : 0);
  deck.arm.rotation.y += ((spinning ? 0.32 : -0.25) - deck.arm.rotation.y) * k;
  if (phoneOn) {
    phoneT = (phoneT + dt / 224) % 1;
    phoneTick += dt;
    if (phoneTick > 0.5) {
      phoneTick = 0;
      phone.art.spec.progress = phoneT;
      phone.art.redraw();
    }
  }

  // day / night
  nightT += ((night ? 1 : 0) - nightT) * (1 - Math.exp(-dt * 3));
  const n = nightT;
  hemi.intensity = lerp(1.25, 0.32, n);
  hemi.color.lerpColors(DAY.hemi, NIGHT.hemi, n);
  amb.intensity = lerp(0.55, 0.16, n);
  sun.intensity = lerp(1.45, 0.22, n);
  sun.color.lerpColors(DAY.sun, NIGHT.sun, n);
  const lampK = lampOn ? 1 : 0;
  lamp.light.intensity = lampK * lerp(1.1, 3.8, n);
  lamp.shadeMat.emissiveIntensity = lampK * lerp(0.18, 0.75, n);
  lamp.halo.material.opacity = lampK * lerp(0.16, 0.9, n);
  lamp.bulbMat.color.set(lampOn ? '#fff3c4' : '#d8cfc6');
  fairy.userData.bulbs.forEach((b) => {
    const tw = 0.75 + 0.25 * Math.sin(t * 2.2 + b.phase);
    b.mat.emissiveIntensity = lerp(0.35, 1.7, n) * tw;
    b.halo.material.opacity = lerp(0.12, 0.95, n) * tw;
  });
  dust.material.opacity = lerp(0.22, 0.75, n) * (lampOn ? 1 : 0.5);
  for (const m of unlitMaterials) {
    let f = 1;
    if (n > 0.001) {
      const d2 = m.userData.pos ? m.userData.pos.distanceToSquared(lampWorld) : 9;
      const lit = lampOn ? 0.42 * Math.exp(-d2 / 2.2) : 0;
      f = lerp(1, 0.4 + lit, n);
    }
    tmpColor.copy(m.userData.baseColor).multiplyScalar(f);
    if (!m.color.equals(tmpColor)) m.color.copy(tmpColor);
  }

  effect.render(scene, camera);
  requestAnimationFrame(frame);
}
canvas.style.cursor = 'grab';
requestAnimationFrame(frame);
