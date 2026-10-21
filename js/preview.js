// Browser preview of "mentosove scripting miesto": a small Roblox-style world with 8 zones rebuilt from the game's scripts.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { isTouch, touchControls } from "./touch.js";

const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
let audio = null;
function blip(f1, f2, len, type, vol) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.type = type || "square"; o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t + len);
    g.gain.setValueAtTime(vol || .05, t); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + len + .02);
  } catch (e) {}
}

/* ---------------- renderer / scene ---------------- */
const canvas = $("#view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd3ff);
scene.fog = new THREE.Fog(0xbfe3ff, 160, 420);
const camera = new THREE.PerspectiveCamera(70, 1, .1, 1000);
const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8a9a, 1.05);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 300 });
scene.add(hemi, sun, sun.target);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

/* ---------------- helpers: textures, boxes, text ---------------- */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  t.userData.canvas = c;
  return t;
}
const studs = canvasTex(64, 64, (g) => {
  g.fillStyle = "#a9a9b0"; g.fillRect(0, 0, 64, 64);
  g.fillStyle = "rgba(255,255,255,.22)"; g.beginPath(); g.arc(32, 30, 12, 0, 7); g.fill();
  g.fillStyle = "rgba(0,0,0,.12)"; g.beginPath(); g.arc(32, 35, 12, 0, 7); g.fill();
  g.fillStyle = "#a9a9b0"; g.beginPath(); g.arc(32, 32, 11, 0, 7); g.fill();
  g.strokeStyle = "rgba(0,0,0,.08)"; g.strokeRect(0, 0, 64, 64);
}, 160);
const colliders = []; // { min, max, on }
function addBox(w, h, d, x, y, z, color, opt) {
  opt = opt || {};
  const mat = opt.mat || new THREE.MeshLambertMaterial({ color });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = opt.cast !== false; m.receiveShadow = true;
  scene.add(m);
  if (opt.solid !== false) { const c = { min: new THREE.Vector3(x - w / 2, y, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h, z + d / 2), on: true }; colliders.push(c); m.userData.col = c; }
  return m;
}
function textCanvas(lines, opt) {
  opt = opt || {};
  const fs = opt.size || 48, pad = 18;
  const c = document.createElement("canvas"), g = c.getContext("2d");
  g.font = "bold " + fs + "px Trebuchet MS, Verdana, sans-serif";
  const w = Math.max(...lines.map((l) => g.measureText(l).width)) + pad * 2, h = lines.length * fs * 1.2 + pad * 2;
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  if (opt.bg) { g.fillStyle = opt.bg; g.fillRect(0, 0, c.width, c.height); }
  if (opt.border) { g.strokeStyle = opt.border; g.lineWidth = 8; g.strokeRect(4, 4, c.width - 8, c.height - 8); }
  g.font = "bold " + fs + "px Trebuchet MS, Verdana, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((l, i) => {
    g.lineWidth = 8; g.strokeStyle = "rgba(0,0,0,.85)"; g.strokeText(l, c.width / 2, pad + fs * .6 + i * fs * 1.2);
    g.fillStyle = (opt.colors && opt.colors[i]) || opt.color || "#fff"; g.fillText(l, c.width / 2, pad + fs * .6 + i * fs * 1.2);
  });
  return c;
}
function textSprite(lines, opt, height) {
  const c = textCanvas(lines, opt), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true }));
  const h = height || 1; s.scale.set(h * c.width / c.height, h, 1);
  return s;
}
function setSpriteText(s, lines, opt, height) {
  const c = textCanvas(lines, opt); s.material.map.dispose();
  s.material.map = new THREE.CanvasTexture(c); s.material.map.colorSpace = THREE.SRGBColorSpace; s.material.needsUpdate = true;
  const h = height || s.scale.y; s.scale.set(h * c.width / c.height, h, 1);
}
function toast(text, color) {
  const t = document.createElement("div"); t.className = "toastz k"; t.textContent = text;
  if (color) t.style.color = color;
  $("#toasts").appendChild(t); setTimeout(() => t.remove(), 2500);
}
function flashScreen(color) { const f = document.createElement("div"); f.className = "flashy"; f.style.background = color; document.body.appendChild(f); setTimeout(() => f.remove(), 460); }

// short-lived effects: each returns false when done
const effects = [];
function addEffect(obj, update) { if (obj) scene.add(obj); effects.push({ obj, update }); }
function burst(pos, color) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .12, 8, 40), new THREE.MeshBasicMaterial({ color, transparent: true }));
  ring.rotation.x = Math.PI / 2; ring.position.copy(pos).y += .2;
  let t = 0;
  addEffect(ring, (dt) => { t += dt; const s = 1 + t * 26; ring.scale.set(s, s, s); ring.material.opacity = 1 - t / .6; return t < .6; });
}
function floatText(text, pos, color) {
  const s = textSprite([text], { color, size: 56 }, 1.4); s.position.copy(pos);
  let t = 0;
  addEffect(s, (dt) => { t += dt; s.position.y += dt * 3; s.material.opacity = 1 - t; return t < 1; });
}

/* ---------------- world: baseplate, spawn, paths ---------------- */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(640, 640), new THREE.MeshLambertMaterial({ map: studs, color: 0x7dbb5a }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
// clouds
for (let i = 0; i < 26; i++) {
  const cl = new THREE.Group(), cx = rand(-300, 300), cz = rand(-300, 300), cy = rand(70, 110);
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(rand(10, 22), rand(3, 6), rand(8, 16)), new THREE.MeshLambertMaterial({ color: 0xffffff })); b.position.set(rand(-8, 8), rand(-1, 1), rand(-5, 5)); cl.add(b); }
  cl.position.set(cx, cy, cz); scene.add(cl);
}
// spawn pad
const spawnPad = addBox(12, .5, 12, 0, 0, 0, 0x9a9aa4);
const logo = canvasTex(256, 256, (g) => { g.fillStyle = "#9a9aa4"; g.fillRect(0, 0, 256, 256); g.save(); g.translate(128, 128); g.rotate(.26); g.fillStyle = "#3a3a44"; g.fillRect(-70, -70, 140, 140); g.fillStyle = "#9a9aa4"; g.fillRect(-22, -22, 44, 44); g.restore(); });
const padTop = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 11.6), new THREE.MeshLambertMaterial({ map: logo }));
padTop.rotation.x = -Math.PI / 2; padTop.position.y = .52; padTop.receiveShadow = true; scene.add(padTop);
const welcome = textSprite(["MENTOSOVE SCRIPTING MIESTO", "browser preview • press T to teleport"], { colors: ["#ffd500", "#fff"], size: 54 }, 4.2);
welcome.position.set(0, 14, -14); scene.add(welcome);

/* ---------------- avatar (R6, like the real one: green spiky hair + spiked goggles) ---------------- */
function faceTex(eyes) {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = "#d8b48c"; g.fillRect(0, 0, 128, 128);
    g.fillStyle = "#111"; g.fillRect(14, 40, 100, 24); g.fillRect(24, 64, 30, 10); g.fillRect(74, 64, 30, 10); // shades
    if (eyes) { g.fillStyle = eyes; g.fillRect(30, 46, 20, 10); g.fillRect(78, 46, 20, 10); }
    g.fillStyle = "#cfcfcf"; g.font = "bold 9px Verdana"; g.fillText("clockwork", 70, 60);
    g.strokeStyle = "#2a1a10"; g.lineWidth = 3; g.beginPath(); g.moveTo(48, 96); g.lineTo(84, 94); g.stroke();
  });
}
const jacketTex = canvasTex(128, 128, (g) => {
  g.fillStyle = "#121212"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#cfcfcf"; g.fillRect(56, 0, 16, 40); g.fillStyle = "#3a3a3a"; g.fillRect(40, 30, 48, 70);
  g.fillStyle = "#8a8a8a"; for (let i = 0; i < 40; i++) g.fillRect(44 + Math.random() * 40, 34 + Math.random() * 62, 3, 3);
  g.strokeStyle = "#2a2a2a"; g.lineWidth = 4; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.stroke();
});
function makeAvatar() {
  const A = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const part = (w, h, d, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = true; return x; };
  const skin = mat(0xd8b48c), black = mat(0x141414);
  const torso = part(2, 2, 1, [black, black, black, black, black, new THREE.MeshLambertMaterial({ map: jacketTex })]);
  torso.position.y = 3; A.add(torso);
  const headG = new THREE.Group(); headG.position.y = 4.6; A.add(headG);
  const faceMat = new THREE.MeshLambertMaterial({ map: faceTex() });
  const head = part(1.25, 1.25, 1.25, [skin, skin, skin, skin, skin, faceMat]); headG.add(head);
  // spiky green hair
  const green = mat(0x45e01f);
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(.28, 1.1, 4), green); c.castShadow = true;
    const a = (i / 14) * Math.PI * 2, up = i % 3 === 0;
    c.position.set(Math.sin(a) * .5, up ? .85 : .55, Math.cos(a) * .5 + .08);
    c.rotation.set(Math.cos(a) * (up ? .4 : 1.1), 0, -Math.sin(a) * (up ? .4 : 1.1));
    headG.add(c);
  }
  const topSpike = new THREE.Mesh(new THREE.ConeGeometry(.3, 1, 4), green); topSpike.position.y = 1.05; headG.add(topSpike);
  // spiked goggles on the forehead
  const gogM = mat(0x0b0b0b);
  [-.32, .32].forEach((x) => {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .2, 16), gogM); lens.rotation.x = Math.PI / 2; lens.position.set(x, .38, -.68); headG.add(lens);
    for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(.05, .3, 4), gogM); const a = k / 6 * Math.PI * 2; sp.position.set(x + Math.cos(a) * .36, .38 + Math.sin(a) * .36, -.68); sp.rotation.z = a - Math.PI / 2; headG.add(sp); }
  });
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.32, .16, 1.32), gogM); band.position.y = .38; headG.add(band);
  const limb = (m, x, y) => { const p = new THREE.Group(); const b = part(1, 2, 1, m); b.position.y = -1; p.add(b); p.position.set(x, y, 0); A.add(p); return p; };
  const armL = limb(black, -1.5, 4), armR = limb(black, 1.5, 4), legL = limb(mat(0x1d1d22), -.5, 2), legR = limb(mat(0x1d1d22), .5, 2);
  // vampire cape (hidden until you touch the stone)
  const cape = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshLambertMaterial({ color: 0x5a0000, side: THREE.DoubleSide }));
  cape.position.set(0, 2.6, .62); cape.rotation.x = .12; cape.visible = false; A.add(cape);
  const tag = textSprite(["Mentos"], { size: 44 }, .8); tag.position.y = 6.6; A.add(tag);
  A.userData = { armL, armR, legL, legR, headG, faceMat, cape, tag };
  return A;
}
const avatar = makeAvatar(); scene.add(avatar);
// bat form
const bat = new THREE.Group();
{
  const m = new THREE.MeshLambertMaterial({ color: 0x1b0b22 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(.9, .9, 1.2), m); bat.add(body);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  [-.22, .22].forEach((x) => { const e = new THREE.Mesh(new THREE.BoxGeometry(.18, .14, .05), eyeM); e.position.set(x, .15, -.62); bat.add(e); });
  const wing = (s) => { const w = new THREE.Mesh(new THREE.BoxGeometry(2.4, .08, 1.1), m); w.position.x = s * 1.5; const p = new THREE.Group(); p.add(w); bat.add(p); return p; };
  bat.userData = { l: wing(-1), r: wing(1) };
  bat.visible = false; bat.position.y = 2.5;
}
avatar.add(bat);

/* ---------------- dummies + villagers ---------------- */
const targets = []; // anything that can be hit: { g, hp, max, home, fallen, kind }
function makeDummy(x, z, kind) {
  const g = new THREE.Group();
  const col = kind === "villager" ? [0x8a5a2b, 0x2f6b2a, 0xe8c39e] : [0x9a9a9a, 0x7a7a7a, 0xb5b5b5];
  const m = (c) => new THREE.MeshLambertMaterial({ color: c });
  const add = (w, h, d, y, c, x0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); b.position.set(x0 || 0, y, 0); b.castShadow = true; g.add(b); return b; };
  add(2, 2, 1, 3, col[1]); add(1.25, 1.25, 1.25, 4.6, col[2]); add(1, 2, 1, 1, col[0], -.5); add(1, 2, 1, 1, col[0], .5); add(1, 2, 1, 3, col[2], -1.5); add(1, 2, 1, 3, col[2], 1.5);
  g.position.set(x, 0, z); scene.add(g);
  const t = { g, hp: 100, max: 100, home: new THREE.Vector3(x, 0, z), fallen: 0, kind: kind || "dummy", vel: new THREE.Vector3(), wander: Math.random() * 6, dir: rand(0, Math.PI * 2) };
  const lbl = textSprite([kind === "villager" ? "Villager" : "Dummy"], { size: 40, color: kind === "villager" ? "#ffd1a8" : "#ddd" }, .7); lbl.position.y = 6.2; g.add(lbl);
  targets.push(t);
  return t;
}
function hitTarget(t, dmg, dir, color) {
  if (t.fallen > 0) return;
  t.hp -= dmg;
  floatText("-" + Math.round(dmg), t.g.position.clone().add(new THREE.Vector3(0, 6.5, 0)), color || "#ff5050");
  t.vel.add(dir.clone().setY(0).normalize().multiplyScalar(14)); t.vel.y = 8;
  t.g.children.forEach((c) => { if (c.material && c.material.emissive) { c.material.emissive.setHex(0xff0000); setTimeout(() => c.material.emissive.setHex(0), 120); } });
  blip(220, 90, .15, "sawtooth", .05);
  if (t.hp <= 0) { t.fallen = 3; t.g.rotation.z = Math.PI / 2; }
}
function updateTargets(dt) {
  targets.forEach((t) => {
    if (t.fallen > 0) {
      t.fallen -= dt;
      if (t.fallen <= 0) { t.hp = t.max; t.g.rotation.z = 0; t.g.position.copy(t.home); t.vel.set(0, 0, 0); burst(t.home, 0xffffff); }
      return;
    }
    t.g.position.addScaledVector(t.vel, dt);
    t.vel.y -= 60 * dt; if (t.g.position.y <= 0) { t.g.position.y = 0; t.vel.y = 0; }
    t.vel.x *= Math.pow(.02, dt); t.vel.z *= Math.pow(.02, dt);
    if (t.kind === "villager") {
      t.wander -= dt;
      if (t.wander <= 0) { t.wander = rand(2, 5); t.dir = rand(0, Math.PI * 2); }
      const sp = 4, nx = t.g.position.x + Math.sin(t.dir) * sp * dt, nz = t.g.position.z + Math.cos(t.dir) * sp * dt;
      if (Math.abs(nx - t.home.x) < 12 && Math.abs(nz - t.home.z) < 12) { t.g.position.x = nx; t.g.position.z = nz; t.g.rotation.y = t.dir + Math.PI; }
      else t.dir += Math.PI;
    } else if (t.g.position.distanceTo(t.home) > .05) t.g.position.lerp(t.home, dt * .8);
  });
}

/* ---------------- zones ---------------- */
const ZONE_R = 78, HALF = 17;
const ZDEF = [
  [1, "Serpent Dojo", "#4fc3ff"], [3, "Rift Portals", "#ff9a2e"], [4, "Title Gacha", "#c77dff"], [5, "Praise Strapko", "#ffd500"],
  [6, "Laser Gun", "#ff3b3b"], [9, "Arm Grappling Hook", "#d9b98a"], [10, "Launch Ground", "#7fe0ff"], [21, "Vampire Stone", "#ff2a2a"]
];
const zones = ZDEF.map(([n, name, color], i) => {
  const a = i / ZDEF.length * Math.PI * 2, c = new THREE.Vector3(Math.sin(a) * ZONE_R, 0, Math.cos(a) * ZONE_R);
  const toC = c.clone().negate().normalize();
  // floor + path to spawn
  addBox(HALF * 2, .3, HALF * 2, c.x, -.28, c.z, 0x626a80, { solid: false, cast: false });
  const len = ZONE_R - HALF - 6, mid = c.clone().multiplyScalar((6 + len / 2) / ZONE_R);
  const path = new THREE.Mesh(new THREE.BoxGeometry(5, .2, len), new THREE.MeshLambertMaterial({ color: 0xc9c9cf }));
  path.position.set(mid.x, 0, mid.z); path.rotation.y = a; path.receiveShadow = true; scene.add(path);
  // sign facing spawn
  // beside the path entrance, so it never sits between the camera and you
  const sp = c.clone().addScaledVector(toC, HALF + 1).add(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(10));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.2), new THREE.MeshBasicMaterial({ map: (() => { const t = new THREE.CanvasTexture(textCanvas(["Zone " + n, name], { bg: "#0f0f0f", border: color, colors: [color, "#fff"], size: 60 })); t.colorSpace = THREE.SRGBColorSpace; return t; })() }));
  board.position.set(sp.x, 5.4, sp.z); board.rotation.y = a + Math.PI; scene.add(board);
  [-4, 4].forEach((o) => { const px = sp.x + Math.cos(a) * o, pz = sp.z - Math.sin(a) * o; addBox(.5, 3.3, .5, px, 0, pz, 0x2a2a2a); });
  const arrival = c.clone().addScaledVector(toC, HALF - 4);
  return { n, name, color, c, a, arrival, hint: "", setup: null, update: null, key: null, down: null, up: null };
});
const Z = (n) => zones.find((z) => z.n === n);
const local = (z, x, zz) => new THREE.Vector3(z.c.x + x, 0, z.c.z + zz);

/* ---------------- player ---------------- */
const P = {
  p: zones[0].c.clone().multiplyScalar(0).add(new THREE.Vector3(0, .6, 6)), v: new THREE.Vector3(), yaw: Math.PI, pitch: -.25, dist: 15,
  face: Math.PI, ground: false, coins: 0, praise: 0, title: null, vamp: false, blood: 100, batForm: false,
  dashT: 0, hook: null, zone: null, lockMove: 0
};
const HW = .9, PHH = 5.2;
function hits(p) {
  for (const c of colliders) {
    if (!c.on) continue;
    if (p.x + HW > c.min.x && p.x - HW < c.max.x && p.z + HW > c.min.z && p.z - HW < c.max.z && p.y + PHH > c.min.y && p.y < c.max.y) return c;
  }
  return null;
}
function moveAxis(axis, d) {
  if (!d) return;
  P.p[axis] += d;
  const c = hits(P.p);
  if (!c) return;
  if (axis === "y") {
    if (d < 0) { P.p.y = c.max.y; P.ground = true; } else P.p.y = c.min.y - PHH - .001;
  } else {
    // step up onto low ledges (like roblox auto-climb of small parts)
    if (c.max.y - P.p.y <= 1.2 && P.ground) { const old = P.p.y; P.p.y = c.max.y + .01; if (!hits(P.p)) return; P.p.y = old; }
    P.p[axis] = d > 0 ? c.min[axis] - HW - .001 : c.max[axis] + HW + .001;
  }
  P.v[axis] = 0;
}

/* ---------------- zone 1: serpent dojo (katana) ---------------- */
{
  const z = Z(1);
  [[-6, -4], [0, -8], [6, -4]].forEach(([x, q]) => makeDummy(...local(z, x, q).toArray().filter((v, i) => i !== 1)));
  const pad = addBox(5, .35, 5, z.c.x - 11, 0, z.c.z + 11, 0xd42a2a, { solid: false });
  const katana = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 3.4), new THREE.MeshLambertMaterial({ color: 0xdff6ff, emissive: 0x2a6f8f }));
  blade.position.z = -1.9; katana.add(blade);
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .8), new THREE.MeshLambertMaterial({ color: 0x1d2a5a })); katana.add(hilt);
  katana.position.set(0, -2, -.3); katana.visible = false; avatar.userData.armR.add(katana);
  z.hint = "<b>Click</b> water slash &bull; <b>Q</b> serpent dash &bull; <b>E</b> coiling spin";
  const slashFx = (full) => {
    const g = full ? new THREE.TorusGeometry(5, .35, 6, 40) : new THREE.TorusGeometry(4, .3, 6, 24, Math.PI);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x6fd8ff, transparent: true, blending: THREE.AdditiveBlending }));
    m.position.copy(P.p).y += 3; m.rotation.x = Math.PI / 2; m.rotation.z = -P.face + (full ? 0 : Math.PI);
    let t = 0;
    addEffect(m, (dt) => { t += dt; m.scale.setScalar(1 + t * 2); m.material.opacity = 1 - t / .3; m.rotation.z += dt * (full ? 14 : 6); return t < .3; });
  };
  const hitCone = (range, full, dmg) => {
    const f = new THREE.Vector3(-Math.sin(P.face), 0, -Math.cos(P.face));
    targets.forEach((t) => {
      const d = t.g.position.clone().sub(P.p); d.y = 0;
      if (d.length() < range && (full || d.normalize().dot(f) > .35)) hitTarget(t, dmg, d.lengthSq() ? d : f, "#6fd8ff");
    });
  };
  z.down = () => { P.face = P.yaw; avatar.userData.armR.rotation.x = -2.2; slashFx(false); hitCone(8, false, 25); blip(900, 300, .12, "triangle", .06); };
  z.key = (k) => {
    if (k === "KeyQ") { P.face = P.yaw; P.dashT = .2; blip(300, 1200, .2, "sawtooth", .04); }
    if (k === "KeyE") { slashFx(true); hitCone(7.5, true, 35); blip(500, 1500, .25, "triangle", .06); }
  };
  z.update = (dt, inside) => {
    katana.visible = inside;
    if (inside && Math.abs(P.p.x - pad.position.x) < 2.5 && Math.abs(P.p.z - pad.position.z) < 2.5 && P.ground && !z.pvpShown) { z.pvpShown = true; toast("PvP ON (u got nobody 2 fight tho)", "#ff5050"); setTimeout(() => { z.pvpShown = false; }, 4000); }
  };
}

/* ---------------- zone 3: rift portals ---------------- */
{
  const z = Z(3);
  addBox(8, 10, 2, z.c.x - 8, 0, z.c.z - 10, 0xd8dbe6); addBox(2, 10, 8, z.c.x + 12, 0, z.c.z, 0xd8dbe6);
  addBox(4, 1, 4, z.c.x + 4, 6, z.c.z - 10, 0xd8dbe6); addBox(4, 1, 4, z.c.x + 10, 11, z.c.z - 8, 0xd8dbe6);
  const portals = {};
  const make = (key, color) => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, .28, 10, 40), new THREE.MeshBasicMaterial({ color }));
    const inner = new THREE.Mesh(new THREE.CircleGeometry(2, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .45, side: THREE.DoubleSide }));
    g.add(ring, inner); g.scale.set(1, 1.45, 1); scene.add(g); return g;
  };
  let cool = 0;
  z.hint = "<b>E</b> blue portal &bull; <b>Q</b> orange portal &bull; <b>C</b> clear &bull; walk through 2 teleport";
  z.key = (k) => {
    const put = (key, color, f1) => {
      if (!portals[key]) portals[key] = make(key, color);
      const f = new THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
      portals[key].position.copy(P.p).addScaledVector(f, 8); portals[key].position.y = 3.2;
      portals[key].rotation.y = P.yaw; portals[key].userData.f = f.clone().negate();
      blip(f1, f1 * 2, .2, "sine", .07); burst(portals[key].position.clone().setY(0), color);
    };
    if (k === "KeyE") put("blue", 0x4fc3ff, 500);
    if (k === "KeyQ") put("orange", 0xff9a2e, 350);
    if (k === "KeyC") { Object.values(portals).forEach((p) => scene.remove(p)); delete portals.blue; delete portals.orange; }
  };
  z.always = (dt) => {
    cool -= dt;
    Object.values(portals).forEach((p, i) => { p.children[0].rotation.z += dt * (i ? -3 : 3); });
    if (cool > 0 || !portals.blue || !portals.orange) return;
    const me = P.p.clone().setY(P.p.y + 2.5);
    [["blue", "orange"], ["orange", "blue"]].forEach(([a, b]) => {
      if (cool > 0 || me.distanceTo(portals[a].position) > 2.4) return;
      const out = portals[b], spd = Math.max(20, Math.hypot(P.v.x, P.v.z));
      P.p.copy(out.position).addScaledVector(out.userData.f, 3).setY(Math.max(0, out.position.y - 2.5));
      P.v.copy(out.userData.f).multiplyScalar(spd).setY(8); // fling out the other side
      cool = .8; flashScreen(a === "blue" ? "#ff9a2e" : "#4fc3ff"); blip(1200, 300, .25, "sine", .07);
    });
  };
}

/* ---------------- zone 4: title gacha ---------------- */
const TITLES = [["Noob", "#cfcfcf", 30], ["Baller", "#cfcfcf", 25], ["Kiko's Opp", "#8dff3a", 18], ["Scene Kid", "#4fc3ff", 12], ["Rawr Lord", "#4fc3ff", 8], ["Mentos Enjoyer", "#c77dff", 4], ["Strapko's Chosen", "#c77dff", 2], ["GOD", "#ffd500", .7], ["Certified Goober", "#ff5ad9", .3]];
let titleSprite = null, aura = null;
{
  const z = Z(4);
  const m = local(z, 0, -6);
  addBox(6, 7, 4, m.x, 0, m.z, 0x5b2a8a);
  const screen = textSprite(["SPIN 4 A TITLE"], { bg: "#111", border: "#c77dff", color: "#c77dff", size: 50 }, 1.6);
  screen.position.set(m.x, 9, m.z); scene.add(screen);
  const keeper = makeDummy(z.c.x + 9, z.c.z - 6, "dummy"); keeper.g.children.at(-1).visible = false;
  const kl = textSprite(["Title Keeper"], { size: 40, color: "#c77dff" }, .8); kl.position.y = 6.2; keeper.g.add(kl); targets.splice(targets.indexOf(keeper), 1);
  let spinning = 0;
  z.hint = "walk up 2 the machine and press <b>E</b> 2 spin";
  z.key = (k) => {
    if (k !== "KeyE" || spinning > 0) return;
    if (P.p.distanceTo(m) > 9) { toast("get closer 2 the machine"); return; }
    spinning = 1.6;
  };
  let tick = 0;
  z.always = (dt) => {
    if (spinning <= 0) return;
    spinning -= dt; tick -= dt;
    if (tick <= 0 && spinning > 0) { tick = .08; const r = TITLES[(Math.random() * TITLES.length) | 0]; setSpriteText(screen, [r[0]], { bg: "#111", border: r[1], color: r[1], size: 50 }, 1.6); blip(1500, 1500, .03, "square", .03); }
    if (spinning <= 0) {
      let roll = Math.random() * TITLES.reduce((s, t) => s + t[2], 0), pickT = TITLES[0];
      for (const t of TITLES) { roll -= t[2]; if (roll <= 0) { pickT = t; break; } }
      setSpriteText(screen, ["★ " + pickT[0] + " ★"], { bg: "#111", border: pickT[1], color: pickT[1], size: 50 }, 1.6);
      P.title = pickT;
      if (titleSprite) avatar.remove(titleSprite);
      titleSprite = textSprite([pickT[0]], { color: pickT[1], size: 46 }, .75); titleSprite.position.y = 7.4; avatar.add(titleSprite);
      if (aura) avatar.remove(aura);
      const pts = []; for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2, r = rand(1.6, 2.4); pts.push(Math.cos(a) * r, rand(0, 6), Math.sin(a) * r); }
      const ag = new THREE.BufferGeometry(); ag.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      aura = new THREE.Points(ag, new THREE.PointsMaterial({ color: pickT[1], size: .25, transparent: true, opacity: .85, blending: THREE.AdditiveBlending })); avatar.add(aura);
      toast("u got: " + pickT[0], pickT[1]); burst(P.p, new THREE.Color(pickT[1]).getHex()); blip(600, 1800, .4, "triangle", .07);
      $("#ttl").textContent = "title: " + pickT[0];
    }
  };
}

/* ---------------- zone 5: praise strapko ---------------- */
const coins = [];
{
  const z = Z(5);
  const s = local(z, 0, -4);
  addBox(7, 2, 7, s.x, 0, s.z, 0xbdbdbd); addBox(7.6, .4, 7.6, s.x, 0, s.z, 0xd4a017, { solid: false });
  const statue = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.TextureLoader().load("images/strapko.png?v=2", (t) => { t.colorSpace = THREE.SRGBColorSpace; }) }));
  statue.scale.set(11 * 290 / 420, 11, 1); statue.position.set(s.x, 2 + 5.5, s.z); scene.add(statue);
  const board = textSprite(["PRAISES: 0"], { bg: "#111", border: "#ffd500", color: "#ffd500", size: 46 }, 1.3);
  board.position.set(s.x + 9, 4, s.z); scene.add(board);
  const plaque = textSprite(["press U 2 praise"], { color: "#ffd500", size: 40 }, .9); plaque.position.set(s.x, 1.2, s.z + 4); scene.add(plaque);
  z.hint = "<b>U</b> praise Strapko &bull; walk over coins 2 grab them";
  z.key = (k) => {
    if (k !== "KeyU") return;
    P.praise++; setSpriteText(board, ["PRAISES: " + P.praise], { bg: "#111", border: "#ffd500", color: "#ffd500", size: 46 }, 1.3);
    toast("u praised Strapko ✨", "#ffd500"); blip(523, 1046, .35, "triangle", .07);
    statue.scale.multiplyScalar(1.06); setTimeout(() => statue.scale.set(11 * 290 / 420, 11, 1), 150);
    for (let i = 0; i < 26; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .15, 14), new THREE.MeshLambertMaterial({ color: 0xffd500, emissive: 0x553300 }));
      c.position.set(z.c.x + rand(-HALF + 2, HALF - 2), rand(18, 32), z.c.z + rand(-HALF + 2, HALF - 2)); c.rotation.x = Math.PI / 2;
      c.castShadow = true; scene.add(c); coins.push({ m: c, vy: 0, life: 9 });
    }
    $("#praise").textContent = "praises: " + P.praise;
  };
}
function updateCoins(dt) {
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.life -= dt; c.vy -= 40 * dt; c.m.position.y += c.vy * dt; c.m.rotation.z += dt * 5;
    if (c.m.position.y < .6) { c.m.position.y = .6; c.vy = Math.abs(c.vy) > 4 ? -c.vy * .35 : 0; }
    const d = Math.hypot(c.m.position.x - P.p.x, c.m.position.z - P.p.z);
    if (d < 2.2 && Math.abs(c.m.position.y - P.p.y - 1) < 3) { P.coins++; $("#coins").textContent = P.coins + " coins"; blip(1300, 1900, .08, "square", .03); c.life = 0; }
    if (c.life <= 0) { scene.remove(c.m); coins.splice(i, 1); }
  }
}

/* ---------------- zone 6: laser gun (cuts through walls) ---------------- */
const breakables = [];
{
  const z = Z(6);
  const wallM = (c) => new THREE.MeshLambertMaterial({ color: c });
  const wall = (x0, zz, w, h, c) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { const b = addBox(2, 2, 2, z.c.x + x0 + i * 2, j * 2, z.c.z + zz, 0, { mat: wallM(c) }); breakables.push({ m: b, hp: .45, regen: 0 }); } };
  wall(-9, -8, 5, 4, 0x6c7286); wall(1, -12, 4, 5, 0x8a8f9f); wall(-11, 4, 3, 3, 0x6c7286);
  for (let k = 0; k < 2; k++) for (let j = 0; j < 6; j++) { const b = addBox(2, 2, 2, z.c.x + 10, j * 2, z.c.z - 4 + k * 8, 0, { mat: wallM(0x585d6e) }); breakables.push({ m: b, hp: .45, regen: 0 }); }
  makeDummy(z.c.x + 2, z.c.z + 6);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: .95, blending: THREE.AdditiveBlending }));
  const core = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  beam.add(core); beam.visible = false; scene.add(beam);
  const glow = textSprite(["✦"], { color: "#ff5050", size: 90 }, 2.2); glow.visible = false; scene.add(glow);
  let firing = false;
  const ray = new THREE.Raycaster();
  z.hint = "hold <b>click</b> 2 fire the Laser Gun &bull; it cuts through walls";
  z.down = () => { firing = true; };
  z.up = () => { firing = false; };
  z.update = (dt, inside) => {
    if (!inside) firing = false;
    beam.visible = glow.visible = firing;
    breakables.forEach((b) => { if (b.regen > 0) { b.regen -= dt; if (b.regen <= 0 && b.m.position.distanceTo(P.p.clone().setY(b.m.position.y)) > 3) { b.m.visible = true; b.m.userData.col.on = true; b.hp = .45; } } });
    if (!firing) return;
    P.face = P.yaw;
    const from = P.p.clone().add(new THREE.Vector3(0, 3.6, 0)).addScaledVector(new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)), 1.6);
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    ray.set(from, dir); ray.far = 90;
    const live = breakables.filter((b) => b.m.visible).map((b) => b.m);
    const hit = ray.intersectObjects(live, false)[0];
    const end = hit ? hit.point : from.clone().addScaledVector(dir, 90);
    const len = from.distanceTo(end);
    beam.position.copy(from).lerp(end, .5); beam.scale.set(1 + Math.random() * .4, len, 1 + Math.random() * .4);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    glow.position.copy(end);
    if (hit) {
      const b = breakables.find((x) => x.m === hit.object);
      b.hp -= dt;
      if (b.hp <= 0) {
        b.m.visible = false; b.m.userData.col.on = false; b.regen = 10;
        for (let i = 0; i < 6; i++) {
          const d = new THREE.Mesh(new THREE.BoxGeometry(.6, .6, .6), b.m.material); d.position.copy(b.m.position);
          const v = new THREE.Vector3(rand(-8, 8), rand(4, 12), rand(-8, 8)); let t = 0;
          addEffect(d, (dt2) => { t += dt2; v.y -= 40 * dt2; d.position.addScaledVector(v, dt2); d.rotation.x += dt2 * 5; if (d.position.y < .3) { d.position.y = .3; v.set(0, 0, 0); } return t < 1.6; });
        }
        blip(180, 60, .25, "sawtooth", .06);
      }
    }
    targets.forEach((t) => { if (t.fallen <= 0 && t.g.position.distanceTo(end) < 2.5) hitTarget(t, 60 * dt, dir, "#ff3b3b"); });
    if (Math.random() < .3) blip(900 + Math.random() * 300, 700, .05, "sawtooth", .015);
  };
}

/* ---------------- zone 9: arm grappling hook ---------------- */
const hooks = [];
{
  const z = Z(9);
  [[-10, -10, 16], [8, -12, 22], [12, 6, 14], [-12, 8, 20], [0, -2, 28], [-2, 12, 12]].forEach(([x, q, h]) => {
    addBox(.8, h, .8, z.c.x + x, 0, z.c.z + q, 0x3a3f50);
    const t = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd500 }));
    t.position.set(z.c.x + x, h + 1.2, z.c.z + q); scene.add(t); hooks.push(t);
  });
  addBox(3, 14, 3, z.c.x - 4, 0, z.c.z - 4, 0x4b5065); addBox(10, 8, 2, z.c.x + 5, 0, z.c.z + 2, 0x4b5065);
  const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xd9b98a }));
  rope.visible = false; scene.add(rope);
  z.hint = "<b>click</b> while aiming at a yellow ball 2 fire ur arm &bull; click again 2 let go";
  z.down = () => {
    if (P.hook) { P.hook = null; return; }
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    let best = null, bestA = .28;
    hooks.forEach((h) => { const v = h.position.clone().sub(camera.position); if (v.length() > 110) return; const ang = v.normalize().angleTo(dir); if (ang < bestA) { bestA = ang; best = h; } });
    if (!best) { toast("aim at a yellow ball"); return; }
    P.hook = best; blip(300, 1400, .2, "sawtooth", .05);
  };
  z.always = () => {
    rope.visible = !!P.hook;
    if (!P.hook) return;
    const hand = P.p.clone().add(new THREE.Vector3(0, 4, 0));
    rope.geometry.setFromPoints([hand, P.hook.position]);
    const to = P.hook.position.clone().sub(hand);
    if (to.length() < 3.5) { P.v.multiplyScalar(.6); P.v.y += 18; P.hook = null; return; }
    P.v.copy(to.normalize().multiplyScalar(62));
    avatar.userData.armR.rotation.x = -2.6;
  };
}

/* ---------------- zone 10: launch ground ---------------- */
{
  const z = Z(10);
  const qTex = canvasTex(128, 128, (g) => { g.fillStyle = "#2a6f8f"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#7fe0ff"; g.font = "bold 80px Verdana"; g.textAlign = "center"; g.fillText("?", 64, 96); });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(14, .5, 14), new THREE.MeshLambertMaterial({ map: qTex }));
  pad.position.set(z.c.x, .25, z.c.z); pad.receiveShadow = true; scene.add(pad);
  const lbl = textSprite(['"What is this ground?"'], { color: "#7fe0ff", size: 50 }, 1.4); lbl.position.set(z.c.x, 4, z.c.z - 9); scene.add(lbl);
  let cool = 0;
  z.hint = "step on the <b>?</b> floor... if u dare";
  z.always = (dt) => {
    cool -= dt;
    if (cool > 0 || !P.ground) return;
    if (Math.abs(P.p.x - z.c.x) < 7 && Math.abs(P.p.z - z.c.z) < 7) {
      P.v.y = 175; P.ground = false; cool = 1.5; P.shake = .5;
      toast("WHAT IS THIS GROUND?!", "#7fe0ff"); blip(150, 1600, .6, "sawtooth", .07); burst(P.p.clone(), 0x7fe0ff);
    }
  };
}

/* ---------------- zone 21: vampire stone ---------------- */
const bolts = [];
{
  const z = Z(21);
  const st = local(z, 0, -4);
  addBox(3, 3, 3, st.x, 0, st.z, 0x1a1a1f); addBox(2.4, 3, 2.4, st.x + .2, 3, st.z, 0x222228); addBox(1.6, 2, 1.6, st.x - .1, 6, st.z, 0x1a1a1f);
  const ruby = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshBasicMaterial({ color: 0xff1a1a })); ruby.position.set(st.x, 9.3, st.z); scene.add(ruby);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, .2, 8, 40), new THREE.MeshBasicMaterial({ color: 0xff1a1a })); ring.rotation.x = Math.PI / 2; ring.position.set(st.x, .35, st.z); scene.add(ring);
  const sl = textSprite(["VAMPIRE STONE", "touch 2 become a vampire"], { colors: ["#ff3b3b", "#ffc8c8"], size: 44 }, 1.8); sl.position.set(st.x, 12, st.z); scene.add(sl);
  const table = local(z, 9, 4); addBox(4, 2, 2, table.x, 0, table.z, 0x4a1f1f);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .9, 10), new THREE.MeshLambertMaterial({ color: 0xaa0000, transparent: true, opacity: .85 })); b.position.set(table.x - 1 + i, 2.45, table.z); scene.add(b); }
  const tl = textSprite(["GLASS BOTTLES"], { color: "#ffb0b0", size: 38 }, .8); tl.position.set(table.x, 4.4, table.z); scene.add(tl);
  makeDummy(z.c.x - 8, z.c.z + 6, "villager"); makeDummy(z.c.x + 4, z.c.z + 10, "villager");
  const redEyes = faceTex("#ff1a1a"), normalFace = avatar.userData.faceMat.map;
  const setVamp = (on) => {
    P.vamp = on; avatar.userData.cape.visible = on;
    avatar.userData.faceMat.map = on ? redEyes : normalFace; avatar.userData.faceMat.needsUpdate = true;
    $("#blood").classList.toggle("on", on);
  };
  const setBat = (on) => {
    P.batForm = on; bat.visible = on;
    avatar.children.forEach((c) => { if (c !== bat && c !== titleSprite && c !== aura && c !== avatar.userData.tag) c.visible = !on && (c !== avatar.userData.cape || P.vamp); });
    if (!on) avatar.userData.cape.visible = P.vamp;
    blip(on ? 1400 : 400, on ? 400 : 1400, .3, "triangle", .06);
  };
  z.hint = "touch the stone 2 become a vampire";
  const vampHint = "<b>F</b> blood bolt &bull; <b>R</b> bat form (space/shift fly) &bull; <b>E</b> bite a villager / drink bottles";
  z.always = (dt) => {
    ruby.rotation.y += dt * 1.5; ruby.position.y = 9.3 + Math.sin(performance.now() / 400) * .3;
    if (!P.vamp && P.p.distanceTo(st) < 4.5) { setVamp(true); P.blood = 100; flashScreen("#a00000"); toast("u became a VAMPIRE", "#ff3b3b"); blip(200, 60, .8, "sawtooth", .08); }
    if (P.vamp) {
      P.blood = Math.max(0, P.blood - dt * (P.batForm ? 6 : .8));
      $("#blood i").style.width = P.blood + "%";
      if (P.batForm && P.blood <= 0) { setBat(false); toast("2 thirsty 2 fly...", "#ff3b3b"); }
      const bwing = Math.sin(performance.now() / 70) * .7; bat.userData.l.rotation.z = bwing; bat.userData.r.rotation.z = -bwing;
    }
    z.hint = P.vamp ? vampHint : "touch the stone 2 become a vampire";
  };
  // vampire powers work everywhere once u are one
  z.globalKey = (k) => {
    if (!P.vamp) return;
    if (k === "KeyR") setBat(!P.batForm);
    if (k === "KeyF") {
      P.face = P.yaw;
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
      const b = new THREE.Mesh(new THREE.SphereGeometry(.5, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff1a1a }));
      b.position.copy(P.p).y += 3.5; scene.add(b); bolts.push({ m: b, v: dir.multiplyScalar(80), life: 1.5 });
      blip(700, 200, .2, "sawtooth", .05);
    }
    if (k === "KeyE") {
      if (P.p.distanceTo(table) < 6) { P.blood = Math.min(100, P.blood + 50); toast("glug glug +50 blood", "#ff8080"); return; }
      const v = targets.find((t) => t.kind === "villager" && t.fallen <= 0 && t.g.position.distanceTo(P.p) < 5);
      if (v) { hitTarget(v, 999, v.g.position.clone().sub(P.p), "#ff1a1a"); P.blood = Math.min(100, P.blood + 35); toast("*bite* +35 blood", "#ff3b3b"); }
    }
  };
}
function updateBolts(dt) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i]; b.life -= dt; b.m.position.addScaledVector(b.v, dt);
    const t = targets.find((x) => x.fallen <= 0 && x.g.position.clone().setY(3).distanceTo(b.m.position) < 2.4);
    if (t) { hitTarget(t, 40, b.v, "#ff1a1a"); b.life = 0; }
    if (b.life <= 0) { scene.remove(b.m); bolts.splice(i, 1); }
  }
}

/* ---------------- teleport menu ---------------- */
function teleport(z) {
  const to = z ? z.arrival : new THREE.Vector3(0, .6, 6);
  P.p.copy(to).setY(.6); P.v.set(0, 0, 0); P.hook = null;
  if (z) P.yaw = Math.atan2(-(z.c.x - to.x), -(z.c.z - to.z)) + 0; // face into the zone
  P.face = P.yaw;
  burst(P.p.clone(), z ? new THREE.Color(z.color).getHex() : 0xffffff); flashScreen(z ? z.color : "#fff"); blip(400, 1600, .3, "sine", .07);
}
const tpList = $("#tplist");
[null, ...zones].forEach((z) => {
  const b = document.createElement("button"); b.type = "button";
  b.innerHTML = z ? "<b>" + z.n + "</b>" + z.name : "<b>⌂</b>Spawn";
  b.addEventListener("click", () => { $("#tp").hidden = true; teleport(z); lock(); });
  tpList.appendChild(b);
});
function openTp() { $("#tp").hidden = false; menu = true; document.exitPointerLock(); }
$("#tpbtn").addEventListener("click", openTp);
$("#tpclose").addEventListener("click", () => { $("#tp").hidden = true; lock(); });

/* ---------------- input ---------------- */
const keys = {};
let locked = false, menu = false;
// phones have no mouse lock: the on-screen controls stand in for it
const tc = touchControls({
  keys, look: (dx, dy) => { P.yaw -= dx * .006; P.pitch = Math.max(-1.25, Math.min(.85, P.pitch - dy * .006)); },
  buttons: [{ label: "jump", code: "Space", hold: true }, { label: "use", mouse: 0 }, { label: "E", code: "KeyE" }, { label: "Q", code: "KeyQ" }, { label: "F", code: "KeyF" }, { label: "R", code: "KeyR" }, { label: "U", code: "KeyU" }, { label: "T", code: "KeyT" }, { label: "C", code: "KeyC" }],
  pause: () => { locked = false; tc.show(false); $("#start").hidden = false; $("#play").textContent = "25B6 Resume"; }
});
function lock() {
  $("#start").hidden = true; menu = false;
  if (isTouch) { locked = true; tc.show(true); return; }
  canvas.requestPointerLock();
}
$("#play").addEventListener("click", lock);
canvas.addEventListener("click", () => { if (!locked && $("#start").hidden && $("#tp").hidden) lock(); });
document.addEventListener("pointerlockchange", () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && !menu) { $("#start").hidden = false; $("#play").textContent = "▶ Resume"; }
});
addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "Space") e.preventDefault();
  if (e.code === "Escape" && !$("#tp").hidden) { $("#tp").hidden = true; $("#start").hidden = false; menu = false; return; }
  if (!locked || e.repeat) return;
  if (e.code === "KeyH") { document.exitPointerLock(); location.href = "fun.html"; return; } // H = leave the game
  if (e.code === "KeyT") { openTp(); return; }
  Z(21).globalKey(e.code);
  if (P.zone && P.zone.key && !(P.vamp && (e.code === "KeyE" || e.code === "KeyF" || e.code === "KeyR") && P.zone.n !== 4 && P.zone.n !== 3 && P.zone.n !== 1)) P.zone.key(e.code);
});
addEventListener("keyup", (e) => { keys[e.code] = false; });
addEventListener("mousemove", (e) => {
  if (!locked) return;
  P.yaw -= e.movementX * .0028;
  P.pitch = Math.max(-1.25, Math.min(.85, P.pitch - e.movementY * .0028));
});
addEventListener("wheel", (e) => { if (locked) P.dist = Math.max(5, Math.min(40, P.dist + Math.sign(e.deltaY) * 2)); }, { passive: true });
addEventListener("mousedown", (e) => { if (locked && e.button === 0 && P.zone && P.zone.down) P.zone.down(); });
addEventListener("mouseup", (e) => { if (e.button === 0) zones.forEach((z) => z.up && z.up()); });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

/* ---------------- loop ---------------- */
let last = performance.now(), lastHint = "";
const fwd = new THREE.Vector3(), right = new THREE.Vector3();
function tick(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;

  // which zone am i in
  const zNow = zones.find((z) => Math.abs(P.p.x - z.c.x) < HALF && Math.abs(P.p.z - z.c.z) < HALF) || null;
  if (zNow !== P.zone) { P.zone = zNow; if (zNow) toast("Zone " + zNow.n + ": " + zNow.name, zNow.color); }
  const hint = P.zone ? P.zone.hint : "press <b>T</b> 2 teleport 2 a zone, or walk down a path";
  if (hint !== lastHint) { lastHint = hint; $("#hint").innerHTML = hint; }

  // movement
  fwd.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); right.set(-fwd.z, 0, fwd.x);
  const want = new THREE.Vector3();
  if (locked) { if (keys.KeyW) want.add(fwd); if (keys.KeyS) want.sub(fwd); if (keys.KeyD) want.add(right); if (keys.KeyA) want.sub(right); }
  const flying = P.batForm;
  const speed = flying ? 34 : keys.ShiftLeft || keys.ShiftRight ? 26 : 16;
  if (want.lengthSq()) { want.normalize(); P.face = Math.atan2(-want.x, -want.z); want.multiplyScalar(speed); }
  if (P.dashT > 0) { P.dashT -= dt; const f = new THREE.Vector3(-Math.sin(P.face), 0, -Math.cos(P.face)); P.v.x = f.x * 95; P.v.z = f.z * 95;
    const tr = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4, 1.6), new THREE.MeshBasicMaterial({ color: 0x6fd8ff, transparent: true, opacity: .5 })); tr.position.copy(P.p).y += 2.6; let t = 0;
    addEffect(tr, (d) => { t += d; tr.material.opacity = .5 - t; return t < .5; });
    targets.forEach((tg) => { if (tg.g.position.distanceTo(P.p) < 3.5) hitTarget(tg, 30, f, "#6fd8ff"); });
  } else if (!P.hook) {
    const acc = P.ground || flying ? 12 : 3;
    P.v.x += (want.x - P.v.x) * Math.min(1, acc * dt); P.v.z += (want.z - P.v.z) * Math.min(1, acc * dt);
  }
  if (flying) { const up = locked && keys.Space ? 1 : locked && (keys.ShiftLeft || keys.ShiftRight) ? -1 : 0; P.v.y += (up * 22 - P.v.y) * Math.min(1, 8 * dt); }
  else if (!P.hook) { P.v.y -= 110 * dt; if (locked && keys.Space && P.ground) { P.v.y = 38; blip(400, 700, .08, "square", .02); } }
  P.ground = false;
  moveAxis("x", P.v.x * dt); moveAxis("z", P.v.z * dt); moveAxis("y", P.v.y * dt);
  if (P.p.y <= 0) { P.p.y = 0; if (P.v.y < 0) P.v.y = 0; P.ground = true; }
  P.p.x = Math.max(-300, Math.min(300, P.p.x)); P.p.z = Math.max(-300, Math.min(300, P.p.z));

  // zones
  zones.forEach((z) => { if (z.update) z.update(dt, z === P.zone); if (z.always) z.always(dt); });
  updateTargets(dt); updateCoins(dt); updateBolts(dt);
  for (let i = effects.length - 1; i >= 0; i--) if (!effects[i].update(dt)) { scene.remove(effects[i].obj); effects.splice(i, 1); }

  // avatar
  avatar.position.copy(P.p);
  let dy = P.face - avatar.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  avatar.rotation.y += dy * Math.min(1, 14 * dt);
  const moving = Math.hypot(P.v.x, P.v.z) > 1 && P.ground;
  const sw = moving ? Math.sin(now / 90) * .8 : 0, U = avatar.userData;
  U.legL.rotation.x = sw; U.legR.rotation.x = -sw; U.armL.rotation.x = -sw;
  U.armR.rotation.x += ((P.hook ? -2.6 : -sw * (P.zone && P.zone.n === 1 ? .3 : 1)) - U.armR.rotation.x) * Math.min(1, 10 * dt);
  if (!P.ground && !flying) { U.legL.rotation.x = U.legR.rotation.x = .3; U.armL.rotation.x = -2.6; }
  if (aura) aura.rotation.y += dt * 1.5;
  U.cape.rotation.x = .12 + Math.min(.9, Math.hypot(P.v.x, P.v.z) / 30);

  // camera orbit
  const tgt = P.p.clone().add(new THREE.Vector3(0, 4.6, 0));
  const off = new THREE.Vector3(Math.sin(P.yaw) * Math.cos(P.pitch), -Math.sin(P.pitch), Math.cos(P.yaw) * Math.cos(P.pitch)).multiplyScalar(P.dist);
  camera.position.copy(tgt).add(off);
  if (camera.position.y < .5) camera.position.y = .5;
  if (P.shake > 0) { P.shake -= dt; camera.position.x += rand(-.5, .5); camera.position.y += rand(-.5, .5); }
  camera.lookAt(tgt);
  sun.position.copy(P.p).add(new THREE.Vector3(60, 100, 40)); sun.target.position.copy(P.p);

  renderer.render(scene, camera);
}
function frame(now) { tick(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

// test hook (only with ?debug): drive the game without mouse lock
if (/[?&]debug\b/.test(location.search)) window.__pv = { P, keys, zones, teleport, setLocked: (v) => { locked = v; }, key: (c) => { Z(21).globalKey(c); if (P.zone && P.zone.key) P.zone.key(c); }, down: () => P.zone && P.zone.down && P.zone.down(), up: () => zones.forEach((z) => z.up && z.up()), targets, breakables, scene, camera, step: (n, ms) => { for (let i = 0; i < (n || 1); i++) tick(last + (ms || 16)); } };

// first frame is on screen -> close the fake installer
requestAnimationFrame(() => window.XPLOAD && window.XPLOAD.done());
setTimeout(() => window.XPLOAD && window.XPLOAD.done(), 600); // backup if frames are paused (background tab)
