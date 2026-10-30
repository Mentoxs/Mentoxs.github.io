// MENTOXS s.r.o. — boot screen, scroll reveals, sparks, tilt, and the live 3D PC (three.js + Blender GLB).
// three.js is only downloaded on desktop (phones get a pre-rendered video of the same PC).
let THREE, GLTFLoader, RoomEnvironment;

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = matchMedia('(max-width: 760px)').matches;
if (phone) document.documentElement.classList.add('phone');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
document.getElementById('year').textContent = new Date().getFullYear();

/* ---------------------------------------------------------------- boot screen (once per visit, short) */
const boot = $('#boot');
function bootScreen() {
  let seen = false;
  try { seen = sessionStorage.getItem('mx-boot') === '1'; sessionStorage.setItem('mx-boot', '1'); } catch (e) {}
  if (seen || reduce || phone) { boot.classList.add('done'); return Promise.resolve(); }
  document.body.classList.add('booting');
  const lines = [
    ['MENTOXS BIOS v2.6 · PC servis Trnava', ''],
    ['CPU ........................', 'OK'],
    ['RAM 32 GB ..................', 'OK'],
    ['GPU ........................', 'OK'],
    ['Ventilátory ................', 'OK'],
    ['Prach ......................', '0 %'],
    ['Načítavam web...', ''],
  ];
  const log = $('#bootLog'), bar = $('#bootBar');
  return new Promise(res => {
    let i = 0;
    const step = () => {
      if (i >= lines.length) { setTimeout(() => { boot.classList.add('done'); document.body.classList.remove('booting'); res(); }, 260); return; }
      const [t, ok] = lines[i];
      log.innerHTML += t + (ok ? ' <span class="ok">' + ok + '</span>' : '') + '\n';
      bar.style.width = ((i + 1) / lines.length * 100) + '%';
      i++; setTimeout(step, i === 1 ? 260 : 120);
    };
    step();
  });
}
bootScreen().then(() => startReveals());

/* ---------------------------------------------------------------- nav */
const nav = $('#nav'), burger = $('#burger'), links = $('#links');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 30), { passive: true });
burger.addEventListener('click', () => {
  const open = !links.classList.contains('open');
  links.classList.toggle('open', open); burger.setAttribute('aria-expanded', open);
});
$$('#links a').forEach(a => a.addEventListener('click', () => { links.classList.remove('open'); burger.setAttribute('aria-expanded', false); }));

/* ---------------------------------------------------------------- reveals (staggered per parent) */
function startReveals() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const sibs = [...e.target.parentElement.children].filter(c => c.classList.contains('reveal'));
    e.target.style.setProperty('--d', (Math.max(0, sibs.indexOf(e.target)) * 0.08) + 's');
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));
}

/* ---------------------------------------------------------------- hero word swap */
const words = ['Opravujem', 'Čistím', 'Staviam', 'Zrýchľujem', 'Oživujem'];
const swap = $('#swap'); let wi = 0;
if (!reduce) setInterval(() => {
  swap.classList.remove('in2'); swap.classList.add('out');
  setTimeout(() => {
    wi = (wi + 1) % words.length; swap.textContent = words[wi];
    swap.classList.remove('out'); void swap.offsetWidth; swap.classList.add('in2');
  }, 340);
}, 2600);

/* ---------------------------------------------------------------- sparks: drifting embers that dodge the cursor */
const sc = $('#sparks'), sx = sc.getContext('2d');
let SW = 0, SH = 0, dpr = Math.min(2, devicePixelRatio || 1), mx = -999, my = -999;
const sparks = [];
function sizeSparks() { SW = innerWidth; SH = innerHeight; sc.width = SW * dpr; sc.height = SH * dpr; sx.setTransform(dpr, 0, 0, dpr, 0, 0); }
sizeSparks(); addEventListener('resize', sizeSparks);
addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
const N = reduce ? 0 : phone ? 14 : Math.round(Math.min(70, SW / 18));
for (let i = 0; i < N; i++) sparks.push({ x: Math.random() * SW, y: Math.random() * SH, v: .15 + Math.random() * .5, r: .5 + Math.random() * 1.8, a: Math.random() * 6.28, h: Math.random() < .8 ? 350 : 18 });
function drawSparks(t) {
  if (document.hidden) { requestAnimationFrame(drawSparks); return; }
  sx.clearRect(0, 0, SW, SH);
  for (const p of sparks) {
    p.y -= p.v; p.x += Math.sin(t / 1600 + p.a) * .35;
    const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
    if (d < 120) { p.x += dx / d * 1.6; p.y += dy / d * 1.6; }
    if (p.y < -10) { p.y = SH + 10; p.x = Math.random() * SW; }
    sx.globalAlpha = .35 + .35 * Math.sin(t / 500 + p.a);
    sx.fillStyle = `hsl(${p.h} 100% 62%)`; sx.shadowColor = sx.fillStyle; sx.shadowBlur = 10;
    sx.beginPath(); sx.arc(p.x, p.y, p.r, 0, 6.283); sx.fill();
  }
  if (N) requestAnimationFrame(drawSparks);
}
if (N) requestAnimationFrame(drawSparks);

/* ---------------------------------------------------------------- service cards: cursor glow + tilt */
$$('.card').forEach(c => {
  c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    c.style.setProperty('--x', x + 'px'); c.style.setProperty('--y', y + 'px');
    if (!reduce) c.style.transform = `perspective(700px) rotateX(${(.5 - y / r.height) * 8}deg) rotateY(${(x / r.width - .5) * 10}deg) translateY(-4px)`;
  });
  c.addEventListener('pointerleave', () => { c.style.transform = ''; });
});

/* ---------------------------------------------------------------- magnetic buttons */
$$('.btn').forEach(b => {
  if (reduce) return;
  b.addEventListener('pointermove', e => {
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5) * 10 + 'px');
    b.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5) * 8 + 'px');
  });
  b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
});

/* ---------------------------------------------------------------- scroll-linked: photo parallax, step line, photo stack */
const tilts = $$('.tilt'), steps = $('#steps'), stepItems = $$('#steps li'), stack = $('#stack');
function onScroll() {
  const vh = innerHeight;
  if (!reduce) for (const el of tilts) {
    const r = el.getBoundingClientRect(), k = (r.top + r.height / 2 - vh / 2) / vh;
    el.style.transform = `translateY(${k * -(+el.dataset.depth || 20)}px)`;
  }
  const sr = steps.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, (vh * .75 - sr.top) / (sr.height + vh * .2)));
  steps.style.setProperty('--p', p.toFixed(3));
  stepItems.forEach((li, i) => li.classList.toggle('lit', p >= (i / stepItems.length) + .02 || (p > .98)));
  const st = stack.getBoundingClientRect();
  stack.classList.toggle('fan', st.top < vh * .55 && st.bottom > vh * .3);
}
addEventListener('scroll', onScroll, { passive: true }); onScroll();
// tap a photo in the stack to bring it to the front
let zTop = 4;
$$('.ph').forEach(ph => ph.addEventListener('click', () => { ph.style.zIndex = ++zTop; }));

/* ---------------------------------------------------------------- lightbox */
const lb = $('#lb'), lbImg = $('#lb img');
$$('.zoom').forEach(f => f.addEventListener('click', () => { lbImg.src = f.dataset.full; lbImg.alt = $('img', f).alt; lb.hidden = false; }));
lb.addEventListener('click', () => { lb.hidden = true; });
addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });

/* ---------------------------------------------------------------- videos: only load + play while on screen */
function playWhenVisible(v) {
  if (!v) return;
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) {
      if (!v.src) { v.src = v.dataset.src; v.preload = 'auto'; }
      if (!reduce) v.play().catch(() => {});
    } else v.pause();
  }), { threshold: 0.25 }).observe(v);
}
$$('.lazy-video').forEach(playWhenVisible);

/* ---------------------------------------------------------------- the 3D PC (desktop) / spinning video (phones) */
const stage = $('#stage'), canvas = $('#pc3d');
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (phone) { stage.classList.add('use-video'); playWhenVisible($('#pcVideo')); }
else if (!webglOK()) stage.classList.add('no3d');
else {
  // load three.js after the page has painted
  const go = () => Promise.all([
    import('three'), import('./vendor/jsm/loaders/GLTFLoader.js'), import('./vendor/jsm/environments/RoomEnvironment.js'),
  ]).then(([t, g, r]) => { THREE = t; GLTFLoader = g.GLTFLoader; RoomEnvironment = r.RoomEnvironment; init3D(); })
    .catch(() => stage.classList.add('no3d'));
  ('requestIdleCallback' in window) ? requestIdleCallback(go, { timeout: 1200 }) : setTimeout(go, 300);
}

function init3D() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(-9.5, 3.6, 11.5); camera.lookAt(0, -0.2, 0);

  scene.add(new THREE.HemisphereLight(0xffe9ee, 0x1a0508, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-6, 9, 7); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3355, 2.2); rim.position.set(6, 3, -6); scene.add(rim);
  const inner = new THREE.PointLight(0xff2a4a, 18, 7, 1.6); inner.position.set(0, 0.4, 0); scene.add(inner);

  // floor: soft shadow catcher
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.ShadowMaterial({ opacity: .45 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.42; floor.receiveShadow = true; scene.add(floor);

  const rig = new THREE.Group(); scene.add(rig);
  const fans = [], rgbMats = [];
  let ready = false;
  new GLTFLoader().load('assets/pc.glb', gltf => {
    const pc = gltf.scene;
    pc.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true;
      const m = o.material;
      if (m.name === 'Glass') {
        o.material = new THREE.MeshPhysicalMaterial({ color: 0x0b0a10, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16, envMapIntensity: 1.4, clearcoat: 1, depthWrite: false });
        o.castShadow = false; o.renderOrder = 2;
      } else if (m.name === 'RGB') {
        m.emissive = new THREE.Color(0xff2a4a); m.emissiveIntensity = 3; m.toneMapped = false; rgbMats.push(m);
      } else if (m.name === 'CaseWhite' || m.name === 'CaseWhiteMatte') {
        m.envMapIntensity = 0.9;
      }
      if (o.name.startsWith('FanSpin')) fans.push(o);
    });
    // make every RGB part share materials so one colour change hits them all
    rig.add(pc);
    ready = true;
    stage.classList.add('loaded');
  }, undefined, () => stage.classList.add('no3d'));

  // RGB modes
  let mode = 'red';
  $$('.rgb button').forEach(b => b.addEventListener('click', () => {
    $$('.rgb button').forEach(x => x.classList.remove('on')); b.classList.add('on'); mode = b.dataset.rgb;
  }));

  // drag to spin with inertia; idle sway that keeps the glass side in view
  const BASE = 0.95; // resting angle: glass side towards the viewer
  let yaw = BASE, vel = 0, dragging = false, lastX = 0, idle = 0, tiltX = 0, tiltY = 0, hover = false;
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    tiltX = (e.clientY - r.top) / r.height - .5; tiltY = (e.clientX - r.left) / r.width - .5;
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX; vel = dx * 0.006; yaw += vel; idle = 0;
  });
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerenter', () => { hover = true; });
  canvas.addEventListener('pointerleave', () => { hover = false; tiltX = tiltY = 0; });

  const temp = $('#temp'), rpmEl = $('#rpm');
  let fanSpeed = 9, visible = true, last = performance.now(), t = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.setLength(w < 600 ? 16 : 13.8);
    camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  const col = new THREE.Color();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible) return;
    t += dt; idle += dt;
    if (!dragging) {
      vel *= 0.94; yaw += vel;
      if (idle > 1.5 && !reduce) yaw += (Math.sin(t * 0.35) * 0.45 + BASE - yaw) * 0.01;
    }
    rig.rotation.y = yaw;
    rig.rotation.x += ((reduce ? 0 : tiltX * 0.12) - rig.rotation.x) * 0.06;
    rig.position.y = reduce ? 0 : Math.sin(t * 1.1) * 0.06;
    // fans: faster when you hover the PC
    fanSpeed += ((hover ? 26 : 9) - fanSpeed) * 0.04;
    for (const f of fans) f.rotateY(-fanSpeed * dt);
    if (rpmEl && Math.round(t * 4) % 2 === 0) rpmEl.textContent = Math.round(fanSpeed * 135 + Math.sin(t * 7) * 20) + ' RPM';
    if (temp) temp.textContent = Math.round(44 - fanSpeed * 0.3 + Math.sin(t) * 1) + ' °C';
    // RGB
    if (mode === 'red') col.setHSL(0.97 + Math.sin(t * 1.4) * 0.015, 1, 0.5);
    else if (mode === 'rainbow') col.setHSL((t * 0.12) % 1, 1, 0.55);
    else if (mode === 'ice') col.setHSL(0.55, 0.9, 0.62 + Math.sin(t * 1.4) * 0.05);
    else col.setRGB(0.02, 0.02, 0.02);
    const pulse = mode === 'off' ? 0.2 : 2.6 + Math.sin(t * 2.2) * 0.6;
    for (const m of rgbMats) { m.emissive.copy(col); m.emissiveIntensity = pulse; }
    inner.color.copy(col); inner.intensity = mode === 'off' ? 0 : 14 + Math.sin(t * 2.2) * 3;
    rim.color.copy(col).lerp(new THREE.Color(0xffffff), 0.35);
    stage.style.setProperty('--glowc', '#' + col.getHexString());
    if (ready) renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
