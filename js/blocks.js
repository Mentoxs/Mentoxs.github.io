// Block World: a small voxel building game. Original textures and skins, drawn in code.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { sb } from "./sb.js";
import { isTouch, touchControls } from "./touch.js";

/* ---------------- helpers ---------------- */
const $ = (s) => document.querySelector(s);
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }

/* ---------------- texture atlas (16px tiles) ---------------- */
const TS = 16, ACOLS = 8, AROWS = 3;
const atlas = document.createElement("canvas");
atlas.width = TS * ACOLS; atlas.height = TS * AROWS;
const actx = atlas.getContext("2d");
const tileRand = rng(1337);
function tile(i, draw) {
  const ox = (i % ACOLS) * TS, oy = Math.floor(i / ACOLS) * TS;
  const px = (x, y, c) => { actx.fillStyle = c; actx.fillRect(ox + x, oy + y, 1, 1); };
  actx.clearRect(ox, oy, TS, TS);
  draw(px, tileRand);
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
function noiseTile(i, cols) { tile(i, (px, r) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(x, y, pick(r, cols)); }); }
const GRASS = ["#5dc23a", "#55b334", "#68cc45", "#4fa82f"], DIRT = ["#8a5a2b", "#7a4e25", "#966534", "#6e4420"], STONE = ["#8b8b8b", "#7d7d7d", "#969696", "#737373"];
noiseTile(0, GRASS);                                                   // 0 grass top
tile(1, (px, r) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(x, y, y < 3 + (r() < .5 ? 1 : 0) ? pick(r, GRASS) : pick(r, DIRT)); }); // 1 grass side
noiseTile(2, DIRT);                                                    // 2 dirt
tile(3, (px, r) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(x, y, r() < .06 ? "#5e5e5e" : pick(r, STONE)); }); // 3 stone
tile(4, (px, r) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(x, y, x % 4 === 0 ? "#4f3418" : pick(r, ["#6b4a26", "#73502a", "#634322"])); }); // 4 log side
tile(5, (px, r) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); px(x, y, d > 6.5 ? "#4f3418" : Math.floor(d) % 2 ? "#b88b52" : "#a07443"); } }); // 5 log top
tile(6, (px, r) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) if (r() > .18) px(x, y, pick(r, ["#2f8f2a", "#3aa233", "#287a24", "#45b23c"])); }); // 6 leaves (holes = see-through)
noiseTile(7, ["#e8d58f", "#dfca80", "#efdc9a", "#d8c278"]);           // 7 sand
noiseTile(8, ["#2f6fe0", "#3a7ef0", "#2a64cc", "#4688f5"]);           // 8 water
tile(9, (px, r) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(x, y, y % 4 === 3 || (x === (y < 4 || (y >= 8 && y < 12) ? 5 : 12)) ? "#7a5530" : pick(r, ["#b8894f", "#c0915a", "#ad7f47"])); }); // 9 planks
tile(10, (px) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { if (x === 0 || y === 0 || x === 15 || y === 15) px(x, y, "#d8f3ff"); else if ((x - y === 3 || x - y === 4) && x < 10) px(x, y, "rgba(255,255,255,.85)"); } }); // 10 glass
tile(11, (px, r) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const row = Math.floor(y / 4), off = row % 2 ? 4 : 0; px(x, y, y % 4 === 3 || (x + off) % 8 === 7 ? "#c9bfb2" : pick(r, ["#a8432f", "#b54b35", "#9a3c2a"])); } }); // 11 brick
tile(12, (px, r) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const v = r(); px(x, y, v < .07 ? "#ffffff" : v < .14 ? "#ff9cf0" : pick(r, ["#7c3aed", "#8b4bff", "#6d2fd6", "#9d4dff"])); } }); // 12 glitter
tile(13, (px, r) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(x, y, x % 5 === 0 || y % 5 === 0 ? "#3fae00" : pick(r, ["#8dff3a", "#a4ff5c", "#7cf02a"])); }); // 13 toxic
tile(14, (px) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(x, y, (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? "#111111" : "#f2f2f2"); }); // 14 checker
tile(15, (px, r) => { const H = ["..........", ".XX..XX...", "XXXXXXXX..", "XXXXXXXX..", ".XXXXXX...", "..XXXX....", "...XX....."];
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(x, y, pick(r, ["#ff5ad9", "#ff6be0", "#f24fce"]));
  H.forEach((row, y) => [...row].forEach((c, x) => { if (c === "X") px(x + 4, y + 4, "#ffd1f6"); })); }); // 15 neon pink heart
tile(16, (px) => { const C = ["#ff9aa2", "#ffd59a", "#fff59a", "#a2ffb0", "#9ae6ff", "#c39aff"]; for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(x, y, C[Math.floor((x + y) / 5.4) % C.length]); }); // 16 chrome cd
noiseTile(17, ["#2a2a2a", "#3a3a3a", "#1e1e1e", "#454545"]);          // 17 bedrock

const texture = new THREE.CanvasTexture(atlas);
texture.magFilter = texture.minFilter = THREE.NearestFilter;
texture.colorSpace = THREE.SRGBColorSpace;

/* ---------------- blocks ---------------- */
// t = [top, side, bottom] atlas tiles
const BLOCKS = [
  null,
  { name: "Grass", t: [0, 1, 2] }, { name: "Dirt", t: [2, 2, 2] }, { name: "Stone", t: [3, 3, 3] },
  { name: "Log", t: [5, 4, 5] }, { name: "Leaves", t: [6, 6, 6], see: true }, { name: "Sand", t: [7, 7, 7] },
  { name: "Water", t: [8, 8, 8], liquid: true }, { name: "Planks", t: [9, 9, 9] }, { name: "Glass", t: [10, 10, 10], see: true },
  { name: "Brick", t: [11, 11, 11] }, { name: "Glitter", t: [12, 12, 12] }, { name: "Toxic", t: [13, 13, 13] },
  { name: "Scene Checker", t: [14, 14, 14] }, { name: "Neon Heart", t: [15, 15, 15] }, { name: "Chrome CD", t: [16, 16, 16] },
  { name: "Bedrock", t: [17, 17, 17] }
];
const AIR = 0, GRASSB = 1, DIRTB = 2, STONEB = 3, LOG = 4, LEAVES = 5, SAND = 6, WATER = 7, BEDROCK = 16;
const PLACEABLE = BLOCKS.map((b, i) => i).filter((i) => i && i !== BEDROCK);
const solid = (id) => id !== AIR && id !== WATER;
const clearFor = (id) => id === AIR || id === WATER || (BLOCKS[id] && BLOCKS[id].see);

function tileIcon(t) {
  const c = document.createElement("canvas"); c.width = c.height = TS;
  c.getContext("2d").drawImage(atlas, (t % ACOLS) * TS, Math.floor(t / ACOLS) * TS, TS, TS, 0, 0, TS, TS);
  return c.toDataURL();
}

/* ---------------- world ---------------- */
const W = 96, H = 48, D = 96, CS = 16, WATER_LEVEL = 17;
let world = new Uint8Array(W * H * D);
const idx = (x, y, z) => (y * D + z) * W + x;
const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D;
const get = (x, y, z) => (inside(x, y, z) ? world[idx(x, y, z)] : AIR);

const SAVE_KEY = "mentosBlocks_v1";
let save = { seed: 0, edits: {} };
try { save = JSON.parse(store(SAVE_KEY)) || save; } catch (e) {}
if (!save.seed) save.seed = Math.floor(Math.random() * 1e9);

function valueNoise(seed) {
  const r = rng(seed), P = new Float32Array(256 * 256);
  for (let i = 0; i < P.length; i++) P[i] = r();
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const g = (a, b) => P[((a & 255) << 8) | (b & 255)];
    const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
    const u = s(xf), v = s(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function generate(seed) {
  world = new Uint8Array(W * H * D);
  const n1 = valueNoise(seed), n2 = valueNoise(seed + 7), r = rng(seed + 99);
  const heights = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    let h = 18 + (n1(x / 32, z / 32) - .5) * 16 + (n2(x / 10, z / 10) - .5) * 5;
    const dc = Math.hypot(x - W / 2, z - D / 2);
    if (dc < 7) h = h * (dc / 7) + 21 * (1 - dc / 7); // flatten spawn a bit
    h = Math.max(4, Math.min(H - 12, Math.round(h)));
    heights[z * W + x] = h;
    for (let y = 0; y <= h; y++) {
      let id = y === 0 ? BEDROCK : y < h - 3 ? STONEB : y < h ? DIRTB : h <= WATER_LEVEL + 1 ? SAND : GRASSB;
      if (id === STONEB && r() < .012) id = 11; // glitter ore
      world[idx(x, y, z)] = id;
    }
    for (let y = h + 1; y <= WATER_LEVEL; y++) world[idx(x, y, z)] = WATER;
  }
  // trees
  for (let i = 0; i < 160; i++) {
    const x = 3 + Math.floor(r() * (W - 6)), z = 3 + Math.floor(r() * (D - 6)), h = heights[z * W + x];
    if (get(x, h, z) !== GRASSB || Math.hypot(x - W / 2, z - D / 2) < 6) continue;
    const th = 4 + Math.floor(r() * 2);
    for (let y = 1; y <= th; y++) world[idx(x, h + y, z)] = LOG;
    for (let dy = th - 2; dy <= th + 1; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      const rr = dy > th ? 1 : 2;
      if (Math.abs(dx) > rr || Math.abs(dz) > rr || (Math.abs(dx) === 2 && Math.abs(dz) === 2 && r() < .6)) continue;
      if (get(x + dx, h + dy, z + dz) === AIR) world[idx(x + dx, h + dy, z + dz)] = LEAVES;
    }
  }
  // y2k spawn platform: scene checker floor with neon heart + toxic corners
  const sx = W / 2, sz = D / 2, sy = heights[sz * W + sx];
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    world[idx(sx + dx, sy, sz + dz)] = 13;
    for (let y = sy + 1; y < sy + 6; y++) if (get(sx + dx, y, sz + dz) !== AIR) world[idx(sx + dx, y, sz + dz)] = AIR;
  }
  [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(([dx, dz], k) => { for (let y = 1; y <= 3; y++) world[idx(sx + dx, sy + y, sz + dz)] = y === 3 ? 12 : k % 2 ? 14 : 15; });
  return { x: sx + .5, y: sy + 1.01, z: sz + .5 };
}
let spawn = generate(save.seed);
for (const k in save.edits) world[+k] = save.edits[k];

let saveT = 0;
let visiting = null; // a build from the gallery: edits there are not saved over ur own world
function setBlock(x, y, z, id) {
  if (!inside(x, y, z)) return;
  const i = idx(x, y, z);
  world[i] = id;
  if (!visiting) { save.edits[i] = id; clearTimeout(saveT); saveT = setTimeout(() => store(SAVE_KEY, JSON.stringify(save)), 800); }
  const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
  remesh(cx, cz);
  if (x % CS === 0) remesh(cx - 1, cz); if (x % CS === CS - 1) remesh(cx + 1, cz);
  if (z % CS === 0) remesh(cx, cz - 1); if (z % CS === CS - 1) remesh(cx, cz + 1);
}

/* ---------------- meshing ---------------- */
const FACES = [
  { d: [-1, 0, 0], s: .8, c: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 1, 1, 0]] },
  { d: [1, 0, 0], s: .8, c: [[1, 1, 1, 0, 1], [1, 0, 1, 0, 0], [1, 1, 0, 1, 1], [1, 0, 0, 1, 0]] },
  { d: [0, -1, 0], s: .55, c: [[1, 0, 1, 1, 0], [0, 0, 1, 0, 0], [1, 0, 0, 1, 1], [0, 0, 0, 0, 1]] },
  { d: [0, 1, 0], s: 1, c: [[0, 1, 1, 1, 1], [1, 1, 1, 0, 1], [0, 1, 0, 1, 0], [1, 1, 0, 0, 0]] },
  { d: [0, 0, -1], s: .7, c: [[1, 0, 0, 0, 0], [0, 0, 0, 1, 0], [1, 1, 0, 0, 1], [0, 1, 0, 1, 1]] },
  { d: [0, 0, 1], s: .7, c: [[0, 0, 1, 0, 0], [1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 1, 1, 1]] }
];
const scene = new THREE.Scene();
const matSolid = new THREE.MeshLambertMaterial({ map: texture, vertexColors: true, alphaTest: .5 });
const matWater = new THREE.MeshLambertMaterial({ map: texture, vertexColors: true, transparent: true, opacity: .72, depthWrite: false, side: THREE.DoubleSide });
const chunks = new Map();
function buildGeo(cx, cz, wantWater) {
  const pos = [], nor = [], uv = [], col = [], ind = [];
  const eps = .0008;
  for (let y = 0; y < H; y++) for (let z = cz * CS; z < cz * CS + CS; z++) for (let x = cx * CS; x < cx * CS + CS; x++) {
    const id = world[idx(x, y, z)];
    if (!id || (id === WATER) !== wantWater) continue;
    const b = BLOCKS[id];
    FACES.forEach((f, fi) => {
      const n = get(x + f.d[0], y + f.d[1], z + f.d[2]);
      if (id === WATER) { if (n !== AIR) return; }
      else if (!clearFor(n) || n === id && b.see && id !== LEAVES) return;
      const t = b.t[fi === 3 ? 0 : fi === 2 ? 2 : 1];
      const u0 = (t % ACOLS) / ACOLS + eps, u1 = (t % ACOLS + 1) / ACOLS - eps;
      const v1 = 1 - Math.floor(t / ACOLS) / AROWS - eps, v0 = 1 - (Math.floor(t / ACOLS) + 1) / AROWS + eps;
      const base = pos.length / 3;
      f.c.forEach(([px, py, pz, cu, cv]) => {
        pos.push(x + px, y + (id === WATER && py === 1 ? .88 : py), z + pz);
        nor.push(...f.d);
        uv.push(cu ? u1 : u0, cv ? v1 : v0);
        const s = f.s * (id === 12 || id === 13 || id === 15 ? 1.15 : 1); // bright y2k blocks pop a bit
        col.push(s, s, s);
      });
      ind.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(ind);
  return g;
}
function remesh(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= W / CS || cz >= D / CS) return;
  const key = cx + "," + cz;
  let c = chunks.get(key);
  if (!c) {
    c = { solid: new THREE.Mesh(new THREE.BufferGeometry(), matSolid), water: new THREE.Mesh(new THREE.BufferGeometry(), matWater) };
    c.water.renderOrder = 1;
    scene.add(c.solid, c.water); chunks.set(key, c);
  }
  c.solid.geometry.dispose(); c.solid.geometry = buildGeo(cx, cz, false);
  c.water.geometry.dispose(); c.water.geometry = buildGeo(cx, cz, true);
}
function remeshAll() { for (let cz = 0; cz < D / CS; cz++) for (let cx = 0; cx < W / CS; cx++) remesh(cx, cz); }
remeshAll();

/* ---------------- renderer, sky, light ---------------- */
const canvas = $("#view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const camera = new THREE.PerspectiveCamera(75, 1, .05, 400);
const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.1);
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
scene.add(hemi, sun);
scene.fog = new THREE.Fog(0x87ceeb, 40, 110);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();
const DAY = new THREE.Color(0x87ceeb), DUSK = new THREE.Color(0xff8a5c), NIGHT = new THREE.Color(0x0b0420);
let clock = 0.25; // 0..1, .25 = morning

// stars for the night sky
const starGeo = new THREE.BufferGeometry(), sp = [];
for (let i = 0; i < 600; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI / 2.2, r = 180; sp.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r); }
starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false }));
scene.add(stars);

/* ---------------- skins ---------------- */
const SKINS = [
  { id: "scene", name: "Scene Queen", hair: "#ff3fb4", streak: "#111", style: "long", skin: "#f3cfb3", eye: "#2b1a4a", shirt: ["#111", "#111"], art: "heart", artC: "#ff3fb4", sleeves: "#111", pants: "check", shoes: "#ff3fb4", acc: "clips" },
  { id: "emo", name: "Emo Kid", hair: "#0d0d0d", style: "fringe", skin: "#efd2bf", eye: "#3b6bd6", shirt: ["#111", "#c41a1a"], art: "stripes", sleeves: "stripes", pants: "#151515", shoes: "check", acc: "" },
  { id: "mentos", name: "Mentos", hair: "#3a2416", style: "curly", skin: "#e8b99a", eye: "#2a1a10", shirt: ["#0f0f0f", "#0f0f0f"], art: "star", artC: "#d8d8d8", sleeves: "#0f0f0f", pants: "#141414", shoes: "#222", acc: "glasses", hood: true },
  { id: "kiko", name: "Kiko", hair: "#d9873a", style: "fringe", skin: "#f2c9a8", eye: "#3a5f8a", shirt: ["#5a1426", "#5a1426"], art: "plain", sleeves: "skin", pants: "#2a3550", shoes: "#eee", acc: "clearglasses" },
  { id: "gastly", name: "Cyber Gastly", hair: "#7a3fbf", style: "none", skin: "#7a3fbf", eye: "#fff", shirt: ["#120a1e", "#9d4dff"], art: "stripes", sleeves: "#120a1e", pants: "#2b0f4a", shoes: "#9d4dff", acc: "fangs" },
  { id: "angel", name: "Glitter Angel", hair: "#f4f1e6", style: "long", skin: "#f5d6c6", eye: "#5aa0e8", shirt: ["#ffffff", "#c9c9c9"], art: "glitter", sleeves: "skin", pants: "#9fd3ff", shoes: "#fff", acc: "clips" },
  { id: "raver", name: "Toxic Raver", hair: "#8dff3a", style: "spiky", skin: "#e9c09e", eye: "#111", shirt: ["#0b0b0b", "#8dff3a"], art: "star", artC: "#8dff3a", sleeves: "#0b0b0b", pants: "chains", shoes: "#8dff3a", acc: "goggles" },
  { id: "butterfly", name: "Butterfly Y2K", hair: "#6b4226", style: "pigtails", skin: "#f0c8a6", eye: "#4a2a12", shirt: ["#ffb7d9", "#ffb7d9"], art: "butterfly", sleeves: "skin", pants: "#c8a8ff", shoes: "#fff", acc: "clips" }
];
let skin = SKINS.find((s) => s.id === store("mentosSkin")) || SKINS[0];

// draw a w x h pixel face for a body part; returns a texture
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  draw((x, y, col) => { if (!col) return; g.fillStyle = col; g.fillRect(x, y, 1, 1); }, g);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  t.userData.canvas = c;
  return t;
}
function shirtPx(s, x, y, w) {
  if (s.art === "stripes") return y % 2 ? s.shirt[1] : s.shirt[0];
  if (s.art === "glitter") return (x * 7 + y * 13) % 9 === 0 ? "#b8b8ff" : (x * 5 + y * 3) % 11 === 0 ? "#ffd1f6" : s.shirt[0];
  return s.shirt[0];
}
function shirtArt(s, put, ox) {
  const P = {
    heart: [".X.X.", "XXXXX", ".XXX.", "..X.."], star: ["..X..", "XXXXX", ".XXX.", "X...X"],
    butterfly: ["X...X", "XX.XX", ".XXX.", "XX.XX"]
  }[s.art];
  if (!P) return;
  const c = s.artC || (s.art === "butterfly" ? "#9d4dff" : "#fff");
  P.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "X") put(ox + x, 4 + y, c); }));
}
function pantsPx(s, x, y) {
  if (s.pants === "check") return (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? "#111" : "#eee";
  if (s.pants === "chains") return y === 3 && x % 2 ? "#cfcfcf" : "#151515";
  return s.pants;
}
function shoesPx(s, x, y) { return s.shoes === "check" ? ((x + y) % 2 ? "#111" : "#eee") : s.shoes; }
function makeSkinMaterials(s) {
  const M = (t) => new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: .5 });
  const hairRows = { long: 8, fringe: 3, curly: 3, spiky: 2, pigtails: 2, none: 0 }[s.style];
  // head faces (8x8): order +x,-x,+y,-y,+z(back),-z(front)
  const headSide = (flip) => canvasTex(8, 8, (p) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      let c = s.skin;
      if (s.style !== "none" && (y < 3 || (s.style === "long" && x > (flip ? 0 : 3)) || (s.style === "curly" && y < 4) || (s.style === "pigtails" && y > 3 && x === (flip ? 0 : 7)))) c = s.hair;
      if (s.hood && (y < 2 || x > 5)) c = "#141414";
      p(x, y, c);
    }
    if (s.acc === "glasses" || s.acc === "clearglasses") p(flip ? 7 : 0, 3, s.acc === "glasses" ? "#111" : "#bfc7cf");
    if (s.acc === "goggles") for (let x = 0; x < 8; x++) p(x, 2, "#111");
  });
  const headTop = canvasTex(8, 8, (p) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) p(x, y, s.hood ? "#141414" : s.style === "none" ? s.skin : s.hair); if (s.style === "spiky") for (let x = 0; x < 8; x += 2) p(x, (x * 3) % 8, "#5fd41f"); });
  const headBottom = canvasTex(8, 8, (p) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) p(x, y, s.skin); });
  const headBack = canvasTex(8, 8, (p) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) p(x, y, s.hood ? "#141414" : s.style === "none" ? s.skin : (y < (s.style === "long" ? 8 : s.style === "fringe" || s.style === "curly" ? 6 : 4) ? s.hair : s.skin)); });
  const headFront = canvasTex(8, 8, (p) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) p(x, y, s.skin);
    // eyes + mouth
    p(1, 4, "#fff"); p(2, 4, s.eye); p(5, 4, s.eye); p(6, 4, "#fff");
    if (s.id === "gastly") { p(1, 3, "#fff"); p(2, 3, "#fff"); p(5, 3, "#fff"); p(6, 3, "#fff"); for (let x = 2; x < 6; x++) p(x, 6, "#2a0f3a"); p(2, 7, "#fff"); p(5, 7, "#fff"); }
    else { p(3, 6, "#9a5a4a"); p(4, 6, "#9a5a4a"); }
    // hair fringe
    if (s.style !== "none") for (let y = 0; y < hairRows && y < 3; y++) for (let x = 0; x < 8; x++) p(x, y, s.hair);
    if (s.style === "fringe") { for (let y = 3; y < 5; y++) for (let x = 0; x < 3; x++) p(x, y, s.hair); }   // emo fringe over one eye
    if (s.style === "long") { for (let y = 3; y < 8; y++) { p(0, y, s.hair); p(7, y, s.hair); } if (s.streak) { p(2, 0, s.streak); p(2, 1, s.streak); p(3, 1, s.streak); } }
    if (s.style === "curly") { p(1, 3, s.hair); p(6, 3, s.hair); }
    if (s.style === "spiky") { p(0, 2, s.hair); p(7, 2, s.hair); }
    if (s.hood) for (let y = 0; y < 8; y++) { p(0, y, "#141414"); p(7, y, "#141414"); }
    if (s.acc === "glasses") { for (let x = 1; x < 7; x++) p(x, 3, "#111"); [0, 3, 4, 7].forEach((x) => p(x, 4, "#111")); }
    if (s.acc === "clearglasses") { for (let x = 1; x < 7; x++) p(x, 3, "#c8d0d8"); [0, 3, 4, 7].forEach((x) => p(x, 4, "#c8d0d8")); }
    if (s.acc === "goggles") { for (let x = 0; x < 8; x++) p(x, 3, "#111"); p(1, 4, "#111"); p(2, 4, "#8dff3a"); p(5, 4, "#8dff3a"); p(6, 4, "#111"); p(0, 2, "#666"); p(7, 2, "#666"); }
    if (s.acc === "clips") { p(1, 1, "#8dff3a"); p(6, 1, "#59d0ff"); }
    if (s.acc === "fangs") { p(2, 7, "#fff"); p(5, 7, "#fff"); }
  });
  const head = [M(headSide(false)), M(headSide(true)), M(headTop), M(headBottom), M(headBack), M(headFront)];
  const bodyFace = (w, front) => canvasTex(w, 12, (p) => {
    for (let y = 0; y < 12; y++) for (let x = 0; x < w; x++) p(x, y, shirtPx(s, x, y, w));
    if (front) shirtArt(s, p, 1);
    if (front && s.hood) { p(3, 1, "#ddd"); p(4, 1, "#ddd"); p(3, 2, "#999"); p(3, 3, "#999"); }
  });
  const body = [M(bodyFace(4)), M(bodyFace(4)), M(bodyFace(8)), M(bodyFace(8)), M(bodyFace(8)), M(bodyFace(8, true))];
  const sleeve = (y, x) => s.sleeves === "skin" ? (y < 4 ? shirtPx(s, x, y, 4) : s.skin) : s.sleeves === "stripes" ? (y % 2 ? s.shirt[1] : s.shirt[0]) : (y < 11 ? s.sleeves : s.skin);
  const armFace = canvasTex(4, 12, (p) => { for (let y = 0; y < 12; y++) for (let x = 0; x < 4; x++) p(x, y, sleeve(y, x)); });
  const armEnd = (top) => canvasTex(4, 4, (p) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) p(x, y, top ? sleeve(0, x) : s.skin); });
  const arm = [M(armFace), M(armFace), M(armEnd(true)), M(armEnd(false)), M(armFace), M(armFace)];
  const legFace = canvasTex(4, 12, (p) => { for (let y = 0; y < 12; y++) for (let x = 0; x < 4; x++) p(x, y, y >= 10 ? shoesPx(s, x, y) : pantsPx(s, x, y)); });
  const legEnd = (top) => canvasTex(4, 4, (p) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) p(x, y, top ? pantsPx(s, x, y) : shoesPx(s, x, y)); });
  const leg = [M(legFace), M(legFace), M(legEnd(true)), M(legEnd(false)), M(legFace), M(legFace)];
  return { head, body, arm, leg, headFront };
}
// character model (1 px = 1.8/32 blocks), front faces -z
const U = 1.8 / 32;
function makeCharacter(s) {
  const m = makeSkinMaterials(s), g = new THREE.Group();
  const box = (w, h, d, mats) => new THREE.Mesh(new THREE.BoxGeometry(w * U, h * U, d * U), mats);
  const limb = (mats, x, y) => { const p = new THREE.Group(); const b = box(4, 12, 4, mats); b.position.y = -6 * U; p.add(b); p.position.set(x * U, y * U, 0); g.add(p); return p; };
  const head = box(8, 8, 8, m.head); head.position.y = 28 * U; g.add(head);
  const body = box(8, 12, 4, m.body); body.position.y = 18 * U; g.add(body);
  g.userData = { head, armL: limb(m.arm, -6, 24), armR: limb(m.arm, 6, 24), legL: limb(m.leg, -2, 12), legR: limb(m.leg, 2, 12), mats: m };
  return g;
}
function animateCharacter(g, t, moving) {
  const a = moving ? Math.sin(t * 10) * .7 : Math.sin(t * 2) * .05;
  g.userData.armL.rotation.x = a; g.userData.armR.rotation.x = -a;
  g.userData.legL.rotation.x = -a; g.userData.legR.rotation.x = a;
}

/* ---------------- skin picker ---------------- */
const pv = new THREE.WebGLRenderer({ canvas: $("#skinpv"), antialias: true, alpha: true });
pv.setPixelRatio(Math.min(devicePixelRatio, 2));
const pvScene = new THREE.Scene(), pvCam = new THREE.PerspectiveCamera(35, 220 / 280, .1, 20);
pvCam.position.set(0, 1.05, 3.6); pvCam.lookAt(0, .95, 0);
pvScene.add(new THREE.HemisphereLight(0xffffff, 0x553377, 1.4), new THREE.DirectionalLight(0xffffff, 1));
let pvModel = null;
function showSkin(s) {
  if (pvModel) pvScene.remove(pvModel);
  pvModel = makeCharacter(s); pvScene.add(pvModel);
  $$skins().forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === s.id)));
}
const $$skins = () => [...document.querySelectorAll(".skin")];
SKINS.forEach((s) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "skin"; b.dataset.id = s.id;
  // 2D front view thumbnail
  const c = document.createElement("canvas"); c.width = c.height = 16;
  const g = c.getContext("2d"), m = makeSkinMaterials(s);
  g.drawImage(m.headFront.userData.canvas, 4, 0);
  const tmp = m.body[5].map.userData.canvas; g.drawImage(tmp, 0, 0, 8, 8, 4, 8, 8, 8);
  g.drawImage(m.arm[0].map.userData.canvas, 0, 0, 4, 8, 0, 8, 4, 8); g.drawImage(m.arm[0].map.userData.canvas, 0, 0, 4, 8, 12, 8, 4, 8);
  b.appendChild(c); b.appendChild(document.createTextNode(s.name));
  b.addEventListener("click", () => { skin = s; store("mentosSkin", s.id); showSkin(s); setPlayerSkin(); });
  $("#skins").appendChild(b);
});
showSkin(skin);

/* ---------------- player ---------------- */
const player = { p: new THREE.Vector3(spawn.x, spawn.y, spawn.z), v: new THREE.Vector3(), yaw: Math.PI, pitch: -.2, ground: false, fly: false, view: 0 };
let model = null;
function setPlayerSkin() { if (model) scene.remove(model); model = makeCharacter(skin); scene.add(model); model.visible = player.view !== 0; }
setPlayerSkin();
const HW = .3, PH = 1.8, EYE = 1.62;
function collides(p) {
  for (let x = Math.floor(p.x - HW); x <= Math.floor(p.x + HW); x++)
    for (let y = Math.floor(p.y); y <= Math.floor(p.y + PH - .01); y++)
      for (let z = Math.floor(p.z - HW); z <= Math.floor(p.z + HW); z++)
        if (solid(get(x, y, z)) || x < 0 || z < 0 || x >= W || z >= D) return true;
  return false;
}
function moveAxis(axis, d) {
  if (!d) return;
  const steps = Math.ceil(Math.abs(d) / .4), s = d / steps;
  for (let i = 0; i < steps; i++) {
    player.p[axis] += s;
    if (collides(player.p)) {
      player.p[axis] -= s;
      // slide flush against the block
      let lo = 0, hi = s;
      for (let k = 0; k < 6; k++) { const mid = (lo + hi) / 2; player.p[axis] += mid; if (collides(player.p)) hi = mid; else lo = mid; player.p[axis] -= mid; }
      player.p[axis] += lo;
      if (axis === "y" && d < 0) player.ground = true;
      player.v[axis] = 0;
      return;
    }
  }
}

/* ---------------- input ---------------- */
const keys = {};
let locked = false, menuOpen = false, slot = 0;
const hot = (store("mentosHotbar") || "1,2,3,8,4,9,10,11,15").split(",").map(Number);
addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest("input, textarea")) return;
  keys[e.code] = true;
  if (!locked) return;
  if (/^Digit[1-9]$/.test(e.code)) setSlot(+e.code.slice(5) - 1);
  if (e.code === "KeyF") { player.fly = !player.fly; player.v.y = 0; toast(player.fly ? "fly: ON" : "fly: off"); }
  if (e.code === "KeyV") { player.view = (player.view + 1) % 3; model.visible = player.view !== 0; }
  if (e.code === "KeyB") openPicker();
  // L = leave parkour / a gallery build, H = leave the game (back 2 the fun page)
  if (e.code === "KeyL") { if (parkour) leaveParkour(); else if (visiting) leaveVisit(); }
  if (e.code === "KeyH") { document.exitPointerLock(); location.href = "fun.html"; }
  if (e.code === "Space") e.preventDefault();
});
addEventListener("keyup", (e) => { keys[e.code] = false; });
addEventListener("keydown", (e) => { if (e.code === "Escape" && !$("#picker").hidden) { $("#picker").hidden = true; menuOpen = false; $("#start").hidden = false; } });
addEventListener("mousemove", (e) => {
  if (!locked) return;
  player.yaw -= e.movementX * .0025;
  player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch - e.movementY * .0025));
});
addEventListener("wheel", (e) => { if (locked) setSlot((slot + (e.deltaY > 0 ? 1 : 8)) % 9); }, { passive: true });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
let mouseDown = -1, nextAct = 0;
addEventListener("mousedown", (e) => { if (!locked) return; mouseDown = e.button; nextAct = 0; });
addEventListener("mouseup", () => { mouseDown = -1; });
document.addEventListener("pointerlockchange", () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && !menuOpen) { $("#start").hidden = false; $("#play").textContent = "▶ Resume"; }
});
// phones have no mouse lock: the on-screen controls stand in for it
const tc = touchControls({
  keys, look: (dx, dy) => { player.yaw -= dx * .006; player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch - dy * .006)); },
  buttons: [{ label: "jump", code: "Space", hold: true }, { label: "break", mouse: 0 }, { label: "place", mouse: 2 }, { label: "fly", code: "KeyF" }, { label: "view", code: "KeyV" }, { label: "blocks", code: "KeyB" }],
  pause: () => { locked = false; tc.show(false); $("#start").hidden = false; $("#play").textContent = "25B6 Resume"; }
});
function lock() {
  ["#start", "#picker", "#gallery", "#share"].forEach((s) => { $(s).hidden = true; }); menuOpen = false;
  if (isTouch) { locked = true; tc.show(true); return; }
  canvas.requestPointerLock();
}
$("#play").addEventListener("click", lock);
canvas.addEventListener("click", () => { if (!locked && $("#start").hidden && $("#picker").hidden) lock(); });
$("#newworld").addEventListener("click", () => {
  if (!confirm("Start a new world? Ur builds in this one will be gone.")) return;
  save = { seed: Math.floor(Math.random() * 1e9), edits: {} }; store(SAVE_KEY, JSON.stringify(save));
  spawn = generate(save.seed); remeshAll(); player.p.set(spawn.x, spawn.y, spawn.z); player.v.set(0, 0, 0);
  toast("new world!");
});
$("#saveinfo").textContent = Object.keys(save.edits).length ? "ur world is saved in this browser" : "";

/* ---------------- shared gallery (supabase table "builds") ---------------- */
const MAX_EDITS = 40000;
function loadWorld(seed, edits) {
  spawn = generate(seed);
  for (const k in edits) world[+k] = edits[k];
  remeshAll(); player.p.set(spawn.x, spawn.y, spawn.z); player.v.set(0, 0, 0);
}
function snapshot() {
  renderer.render(scene, camera); // read the canvas right after drawing, before the browser clears it
  const c = document.createElement("canvas"); c.width = 320; c.height = 180;
  const g = c.getContext("2d"), s = canvas;
  const r = Math.max(320 / s.width, 180 / s.height), w = s.width * r, h = s.height * r;
  g.drawImage(s, (320 - w) / 2, (180 - h) / 2, w, h);
  return c.toDataURL("image/jpeg", .72);
}
function leaveVisit() { visiting = null; loadWorld(save.seed, save.edits); showVisit(); history.replaceState(null, "", location.pathname); toast("welcome home"); }
function showVisit() {
  const v = $("#visit");
  if (!visiting) { v.hidden = true; return; }
  v.hidden = false; v.textContent = "";
  v.append("visiting: " + visiting.title + " by " + visiting.name);
  const link = document.createElement("button"); link.type = "button"; link.textContent = "copy link";
  link.addEventListener("click", () => { navigator.clipboard && navigator.clipboard.writeText(location.origin + location.pathname + "?build=" + visiting.id); toast("link copied"); });
  const back = document.createElement("button"); back.type = "button"; back.textContent = "back 2 my world [L]";
  back.addEventListener("click", leaveVisit);
  v.append(link, back);
}
async function visit(id) {
  $("#galstatus").textContent = "loading build...";
  try {
    const rows = await sb("builds?id=eq." + encodeURIComponent(id) + "&select=id,name,title,seed,edits");
    if (!rows.length) { toast("that build doesn't exist anymore"); return false; }
    const b = rows[0], edits = {};
    (b.edits || []).forEach(([i, id2]) => { if (i >= 0 && i < world.length && id2 >= 0 && id2 < BLOCKS.length) edits[i] = id2; });
    parkour = null; visiting = b; loadWorld(b.seed, edits); showVisit();
    history.replaceState(null, "", location.pathname + "?build=" + b.id);
    toast(b.title + " by " + b.name);
    return true;
  } catch (e) { $("#galstatus").textContent = "gallery.exe is not responding... try again later"; toast("couldn't load that build"); return false; }
}
async function openGallery() {
  menuOpen = true; document.exitPointerLock();
  $("#start").hidden = true; $("#gallery").hidden = false;
  const gal = $("#gal"); gal.innerHTML = ""; $("#galstatus").textContent = "loading...";
  try {
    const rows = await sb("builds?select=id,name,title,created_at,thumb&order=created_at.desc&limit=40");
    $("#galstatus").textContent = rows.length ? "click a build 2 walk around in it (ur own world stays saved)" : "no builds yet... be the first 2 share one!";
    rows.forEach((b) => {
      const btn = document.createElement("button"); btn.type = "button";
      const img = document.createElement("img"); img.alt = ""; if (b.thumb && b.thumb.startsWith("data:image/jpeg")) img.src = b.thumb;
      const s = document.createElement("span"); s.textContent = b.title; const by = document.createElement("small"); by.textContent = " by " + b.name; s.append(by);
      btn.append(img, s);
      btn.addEventListener("click", async () => { if (await visit(b.id)) lock(); });
      gal.appendChild(btn);
    });
  } catch (e) { $("#galstatus").textContent = "the gallery isn't set up yet, come back soon"; }
}
function openShare() {
  if (visiting) { toast("go back 2 ur own world first"); return; }
  if (!Object.keys(save.edits).length) { toast("build something first!"); return; }
  menuOpen = true; document.exitPointerLock();
  $("#start").hidden = true; $("#share").hidden = false;
  $("#sharethumb").src = snapshot();
  const f = $("#shareform"); f.author.value = f.author.value || store("mentosName") || ""; $("#sharestatus").textContent = "";
}
$("#galbtn").addEventListener("click", openGallery);
$("#sharebtn").addEventListener("click", openShare);
$("#galclose").addEventListener("click", () => { $("#gallery").hidden = true; menuOpen = false; $("#start").hidden = false; });
$("#shareclose").addEventListener("click", () => { $("#share").hidden = true; menuOpen = false; $("#start").hidden = false; });
$("#shareform").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, st = $("#sharestatus");
  const title = f.btitle.value.trim().slice(0, 40), name = f.author.value.trim().slice(0, 30);
  if (!title || !name) { st.textContent = "give it a name + ur name"; return; }
  const last = +store("mentosShared") || 0;
  if (Date.now() - last < 120000) { st.textContent = "chill... u can share again in a couple minutes"; return; }
  const pairs = Object.entries(save.edits).map(([i, id]) => [+i, id]);
  if (pairs.length > MAX_EDITS) { st.textContent = "this build is 2 big 2 share, sorry"; return; }
  st.textContent = "uploading...";
  try {
    await sb("builds", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ name, title, seed: save.seed, edits: pairs, thumb: $("#sharethumb").src }) });
    store("mentosShared", String(Date.now())); store("mentosName", store("mentosName") || name);
    st.textContent = "posted!! it's in the gallery now"; toast("build shared!");
  } catch (err) { st.textContent = "error 404: build got lost in the internet. try again?"; }
});
addEventListener("keydown", (e) => {
  if (e.code !== "Escape") return;
  ["#gallery", "#share"].forEach((s) => { if (!$(s).hidden) { $(s).hidden = true; menuOpen = false; $("#start").hidden = false; } });
});
// share links: blocks.html?build=12
const wantBuild = (location.search.match(/[?&]build=(\d+)/) || [])[1];
if (wantBuild) visit(wantBuild);

/* ---------------- parkour course ---------------- */
// floating y2k blocks over the sea: checkpoints are toxic, the finish is glitter. same course for every1, so times compare
let parkour = null;
const CHECK = 12, FINISH = 11;
function generateParkour() {
  world = new Uint8Array(W * H * D);
  const r = rng(777), put = (x, y, z, id) => { if (inside(x, y, z)) world[idx(x, y, z)] = id; };
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { put(x, 0, z, BEDROCK); put(x, 1, z, SAND); for (let y = 2; y <= 5; y++) put(x, y, z, WATER); }
  const plat = (x, y, z, s, id) => { for (let dx = 0; dx < s; dx++) for (let dz = 0; dz < s; dz++) put(x + dx, y, z + dz, id); };
  const cps = [];
  let x = 6, y = 9, z = 8, dir = 1;
  plat(x - 2, y, z - 2, 5, 1); cps.push({ x: x + .5, y: y + 1.01, z: z + .5 });
  const KINDS = [14, 15, 16, 9, 10, 8];
  let edge = x + 2, prevSize = 5;
  for (let i = 1; i <= 46; i++) {
    let gap = [2, 2, 3, 1, 2, 3][i % 6], dy = r() < .45 ? 1 : r() < .55 ? 0 : -1;
    if (gap === 3 && dy > 0) dy = 0;          // no long jump uphill, it's not humanly possible
    if (y + dy < 8 || y + dy > H - 8) dy = 0;
    const cp = i % 9 === 0, size = cp ? 3 : i % 5 === 0 ? 2 : 1;
    let nx = dir > 0 ? edge + gap + 1 : edge - gap - size;
    if (nx < 3 || nx + size > W - 3) { // turn around: 2-block hop sideways in the same column, then go back the other way
      dir = -dir; z += prevSize + 2; nx = Math.max(3, Math.min(W - 3 - size, x)); dy = Math.min(dy, 0);
    }
    y += dy;
    plat(nx, y, z, size, cp ? CHECK : KINDS[i % KINDS.length]);
    if (cp) cps.push({ x: nx + 1.5, y: y + 1.01, z: z + 1.5 });
    edge = dir > 0 ? nx + size - 1 : nx;
    x = nx; prevSize = size;
  }
  const fx = dir > 0 ? edge + 3 : edge - 6;
  plat(fx, y, z - 1, 4, FINISH);
  [[0, 0], [3, 0], [0, 3], [3, 3]].forEach(([a, b]) => { for (let k = 1; k <= 3; k++) put(fx + a, y + k, z - 1 + b, 16); });
  return { cps, cp: 0, start: 0, done: false, finish: { y } };
}
function parkourHud() {
  const v = $("#visit");
  if (!parkour) { showVisit(); return; }
  v.hidden = false; v.textContent = "";
  const t = parkour.start ? ((parkour.done || performance.now()) - parkour.start) / 1000 : 0, best = +store("mentosParkourBest") || 0;
  v.append("parkour • " + t.toFixed(1) + "s • checkpoint " + (parkour.cp + 1) + "/" + parkour.cps.length + (best ? " • best " + (best / 1000).toFixed(1) + "s" : ""));
  const back = document.createElement("button"); back.type = "button"; back.textContent = "leave [L]";
  back.addEventListener("click", leaveParkour); v.append(back);
}
function startParkour() {
  visiting = null;
  parkour = generateParkour(); remeshAll();
  const c = parkour.cps[0]; player.p.set(c.x, c.y, c.z); player.v.set(0, 0, 0); player.fly = false; player.yaw = -Math.PI / 2;
  history.replaceState(null, "", location.pathname + (/[?&]debug\b/.test(location.search) ? "?debug&parkour" : "?parkour"));
  toast("parkour! reach the glitter"); parkourHud();
}
function leaveParkour() { parkour = null; loadWorld(save.seed, save.edits); history.replaceState(null, "", location.pathname); showVisit(); toast("back home"); }
let lastHud = 0;
function parkourTick(now) {
  const P = parkour, c = P.cps[P.cp];
  if (player.fly) { player.fly = false; toast("no flying in parkour >:("); }
  if (!P.start && Math.hypot(player.p.x - P.cps[0].x, player.p.z - P.cps[0].z) > 2.6) P.start = now;
  if (player.p.y < 6) { player.p.set(c.x, c.y, c.z); player.v.set(0, 0, 0); toast("splash! back 2 checkpoint " + (P.cp + 1)); }
  const under = get(Math.floor(player.p.x), Math.floor(player.p.y - .05), Math.floor(player.p.z));
  if (player.ground && under === CHECK) {
    const i = P.cps.findIndex((q) => Math.abs(q.x - player.p.x) < 2 && Math.abs(q.z - player.p.z) < 2 && Math.abs(q.y - player.p.y) < 1.2);
    if (i > P.cp) { P.cp = i; toast("checkpoint " + (i + 1) + "!"); }
  }
  if (player.ground && under === FINISH && P.start && !P.done) {
    P.done = now;
    const ms = Math.round(P.done - P.start), best = +store("mentosParkourBest") || 0;
    if (!best || ms < best) { store("mentosParkourBest", String(ms)); toast("NEW BEST: " + (ms / 1000).toFixed(1) + "s!!"); }
    else toast("finished in " + (ms / 1000).toFixed(1) + "s");
  }
  if (now - lastHud > 100) { lastHud = now; parkourHud(); }
}
$("#parkbtn").addEventListener("click", () => { startParkour(); lock(); });
if (/[?&]parkour\b/.test(location.search)) startParkour();

/* ---------------- hotbar + block picker ---------------- */
const icons = BLOCKS.map((b) => (b ? tileIcon(b.t[1] === 1 ? 1 : b.t[1]) : null));
function drawHotbar() {
  const hb = $("#hotbar"); hb.innerHTML = "";
  hot.forEach((id, i) => {
    const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-pressed", String(i === slot));
    b.innerHTML = '<img alt=""><span>' + (i + 1) + "</span>"; b.querySelector("img").src = icons[id];
    b.title = BLOCKS[id].name; b.addEventListener("click", () => setSlot(i)); hb.appendChild(b);
  });
}
function setSlot(i) { slot = i; drawHotbar(); const n = $("#bname"); n.textContent = BLOCKS[hot[slot]].name; n.style.animation = "none"; void n.offsetWidth; n.style.animation = "toastz 1.6s ease-out forwards"; }
function openPicker() {
  menuOpen = true; document.exitPointerLock();
  $("#slotn").textContent = slot + 1;
  const g = $("#pickgrid"); g.innerHTML = "";
  PLACEABLE.forEach((id) => {
    const b = document.createElement("button"); b.type = "button";
    b.innerHTML = '<img alt="">' + BLOCKS[id].name; b.querySelector("img").src = icons[id];
    b.addEventListener("click", () => { hot[slot] = id; store("mentosHotbar", hot.join(",")); drawHotbar(); lock(); });
    g.appendChild(b);
  });
  $("#picker").hidden = false;
}
drawHotbar();

function toast(text) { const t = document.createElement("div"); t.className = "toastz"; t.textContent = text; $("#toasts").appendChild(t); setTimeout(() => t.remove(), 2500); }

/* ---------------- block targeting (voxel raycast) ---------------- */
const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x000000 }));
scene.add(outline);
function raycast(o, d, max) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
  const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
  let tx = (sx > 0 ? x + 1 - o.x : o.x - x) * tdx, ty = (sy > 0 ? y + 1 - o.y : o.y - y) * tdy, tz = (sz > 0 ? z + 1 - o.z : o.z - z) * tdz;
  let px = x, py = y, pz = z, t = 0;
  while (t <= max) {
    const id = get(x, y, z);
    if (id && id !== WATER) return { x, y, z, px, py, pz };
    px = x; py = y; pz = z;
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; } else if (ty < tz) { y += sy; t = ty; ty += tdy; } else { z += sz; t = tz; tz += tdz; }
  }
  return null;
}

/* ---------------- loop ---------------- */
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), look = new THREE.Vector3();
let last = performance.now(), walkT = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  // day / night (one full day = 6 minutes)
  clock = (clock + dt / 360) % 1;
  const sunUp = Math.sin(clock * Math.PI * 2);
  const sky = sunUp > .2 ? DAY.clone() : sunUp > -.15 ? DUSK.clone().lerp(DAY, (sunUp + .15) / .35) : NIGHT.clone().lerp(DUSK, Math.max(0, (sunUp + .4) / .25));
  renderer.setClearColor(sky); scene.fog.color.copy(sky);
  const light = Math.max(.18, Math.min(1, sunUp * 1.4 + .35));
  hemi.intensity = 1.1 * light; sun.intensity = 1.2 * Math.max(0, sunUp);
  sun.position.set(Math.cos(clock * Math.PI * 2) * 100, sunUp * 100, 30);
  stars.material.opacity = Math.max(0, -sunUp * 2);

  // movement
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); right.set(-fwd.z, 0, fwd.x);
  const inWater = get(Math.floor(player.p.x), Math.floor(player.p.y + .4), Math.floor(player.p.z)) === WATER;
  let speed = player.fly ? 10 : keys.ShiftLeft || keys.ShiftRight ? 6.6 : 4.4;
  if (inWater && !player.fly) speed *= .55;
  const want = new THREE.Vector3();
  if (locked) {
    if (keys.KeyW) want.add(fwd); if (keys.KeyS) want.sub(fwd);
    if (keys.KeyD) want.add(right); if (keys.KeyA) want.sub(right);
  }
  if (want.lengthSq()) want.normalize().multiplyScalar(speed);
  const accel = player.ground || player.fly ? 14 : 4;
  player.v.x += (want.x - player.v.x) * Math.min(1, accel * dt);
  player.v.z += (want.z - player.v.z) * Math.min(1, accel * dt);
  if (player.fly) {
    const up = locked && keys.Space ? 1 : locked && (keys.ShiftLeft || keys.ShiftRight) ? -1 : 0;
    player.v.y += (up * 8 - player.v.y) * Math.min(1, 10 * dt);
  } else if (inWater) {
    player.v.y = Math.max(-2.5, player.v.y - 10 * dt);
    if (locked && keys.Space) player.v.y = 3.2;
  } else {
    player.v.y = Math.max(-40, player.v.y - 28 * dt);
    if (locked && keys.Space && player.ground) player.v.y = 8.6;
  }
  player.ground = false;
  moveAxis("x", player.v.x * dt); moveAxis("z", player.v.z * dt); moveAxis("y", player.v.y * dt);
  if (parkour) parkourTick(now);
  if (player.p.y < -10) { player.p.set(spawn.x, spawn.y + 2, spawn.z); player.v.set(0, 0, 0); toast("u fell out of the world lol"); }

  // camera
  const eye = new THREE.Vector3(player.p.x, player.p.y + EYE, player.p.z);
  look.set(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch));
  if (player.view === 0) { camera.position.copy(eye); camera.lookAt(eye.clone().add(look)); }
  else {
    const back = player.view === 1 ? -1 : 1;
    let dist = 4;
    const hit = raycast(eye, look.clone().multiplyScalar(back).normalize(), 4);
    if (hit) dist = Math.max(.6, eye.distanceTo(new THREE.Vector3(hit.x + .5, hit.y + .5, hit.z + .5)) - .9);
    camera.position.copy(eye).addScaledVector(look, back * dist);
    camera.lookAt(eye);
  }
  if (model) {
    model.position.copy(player.p); model.rotation.y = player.yaw;
    model.userData.head.rotation.x = player.pitch * .6;
    const moving = Math.hypot(player.v.x, player.v.z) > .5;
    walkT += dt * (moving ? 1 : .4);
    animateCharacter(model, walkT, moving);
  }

  // targeting + break/place
  const hit = locked ? raycast(eye, look, 6) : null;
  outline.visible = !!hit;
  if (hit) outline.position.set(hit.x + .5, hit.y + .5, hit.z + .5);
  if (hit && mouseDown >= 0 && now >= nextAct && !parkour) {
    nextAct = now + 220;
    if (mouseDown === 0 && get(hit.x, hit.y, hit.z) !== BEDROCK) setBlock(hit.x, hit.y, hit.z, AIR);
    if (mouseDown === 2) {
      const { px, py, pz } = hit;
      const pmin = [player.p.x - HW, player.p.y, player.p.z - HW], pmax = [player.p.x + HW, player.p.y + PH, player.p.z + HW];
      const overlap = px + 1 > pmin[0] && px < pmax[0] && py + 1 > pmin[1] && py < pmax[1] && pz + 1 > pmin[2] && pz < pmax[2];
      if (!overlap && inside(px, py, pz)) setBlock(px, py, pz, hot[slot]);
    }
  }

  $("#info").textContent = "x " + player.p.x.toFixed(0) + "  y " + player.p.y.toFixed(0) + "  z " + player.p.z.toFixed(0) + (player.fly ? "  • flying" : "") + "  • " + (sunUp > 0 ? "day" : "night");
  renderer.render(scene, camera);
  if (!$("#start").hidden && pvModel) { pvModel.rotation.y = now / 1200; animateCharacter(pvModel, now / 1000, true); pv.render(pvScene, pvCam); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// test hook (only with ?debug in the url): lets automated tests drive the player without mouse lock
if (/[?&]debug\b/.test(location.search)) window.__bw = { player, keys, get: get, setLocked: (v) => { locked = v; }, press: (b) => { mouseDown = b; nextAct = 0; }, release: () => { mouseDown = -1; }, park: () => parkour };

// first frame is on screen -> close the fake installer
requestAnimationFrame(() => window.XPLOAD && window.XPLOAD.done());
setTimeout(() => window.XPLOAD && window.XPLOAD.done(), 600); // backup if frames are paused (background tab)
