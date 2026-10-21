// Escape Tomas: top-down dark maze. grab 3 souls, reach the door, don't let tomas catch u.
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var cv = $("#view"), g = cv.getContext("2d");
  var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; };
  var actx = null;
  function blip(f1, f2, len, type, vol) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), gg = actx.createGain(), t = actx.currentTime;
      o.type = type || "square"; o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t + len);
      gg.gain.setValueAtTime(vol || .05, t); gg.gain.exponentialRampToValueAtTime(.0001, t + len);
      o.connect(gg); gg.connect(actx.destination); o.start(t); o.stop(t + len + .02);
    } catch (e) {}
  }
  function toast(t) { var d = document.createElement("div"); d.className = "toastz k"; d.textContent = t; $("#toasts").appendChild(d); setTimeout(function () { d.remove(); }, 2500); }

  var head = new Image(); head.src = "images/tomas-head.png";
  var CW = 15, CH = 11, TW = CW * 2 + 1, TH = CH * 2 + 1; // cells -> tiles (walls between)
  var T = 44; // tile px
  var map, souls, exit, player, tom, state = "menu", t0 = 0, last = 0, flareT = 0, flareCool = 0, beat = 0, pathT = 0, tomPath = [];
  var keys = {};

  function gen() {
    map = []; for (var y = 0; y < TH; y++) { map.push([]); for (var x = 0; x < TW; x++) map[y].push(1); }
    var stack = [[0, 0]], seen = {}; seen["0,0"] = 1; map[1][1] = 0;
    while (stack.length) {
      var c = stack[stack.length - 1], cx = c[0], cy = c[1];
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (d) { return [cx + d[0], cy + d[1], d]; })
        .filter(function (n) { return n[0] >= 0 && n[1] >= 0 && n[0] < CW && n[1] < CH && !seen[n[0] + "," + n[1]]; });
      if (!nb.length) { stack.pop(); continue; }
      var n = nb[(Math.random() * nb.length) | 0];
      seen[n[0] + "," + n[1]] = 1;
      map[cy * 2 + 1 + n[2][1]][cx * 2 + 1 + n[2][0]] = 0; map[n[1] * 2 + 1][n[0] * 2 + 1] = 0;
      stack.push([n[0], n[1]]);
    }
    // knock out some extra walls so there are loops 2 dodge him
    for (var i = 0; i < 26; i++) {
      var wx = 1 + ((Math.random() * (TW - 2)) | 0), wy = 1 + ((Math.random() * (TH - 2)) | 0);
      if (map[wy][wx] === 1 && ((map[wy][wx - 1] === 0 && map[wy][wx + 1] === 0) || (map[wy - 1][wx] === 0 && map[wy + 1][wx] === 0))) map[wy][wx] = 0;
    }
    var cellPos = function (cx2, cy2) { return { x: cx2 * 2 + 1.5, y: cy2 * 2 + 1.5 }; };
    player = Object.assign(cellPos(0, 0), { stam: 1, face: 1, walk: 0 });
    exit = Object.assign(cellPos(CW - 1, CH - 1), { open: false });
    tom = Object.assign(cellPos(Math.floor(CW / 2), Math.floor(CH / 2)), { awake: 0, walk: 0, spd: 2.9 });
    souls = [cellPos(CW - 1, 0), cellPos(0, CH - 1), cellPos((Math.random() * CW) | 0, 2 + ((Math.random() * (CH - 4)) | 0))].map(function (s) { s.got = false; return s; });
  }
  var wall = function (x, y) { var tx = Math.floor(x), ty = Math.floor(y); return ty < 0 || tx < 0 || ty >= TH || tx >= TW || map[ty][tx] === 1; };
  function move(o, dx, dy, r) {
    if (dx) { o.x += dx; if (wall(o.x + Math.sign(dx) * r, o.y - r * .8) || wall(o.x + Math.sign(dx) * r, o.y + r * .8)) o.x = dx > 0 ? Math.floor(o.x + r) - r - .001 : Math.floor(o.x - r) + 1 + r + .001; }
    if (dy) { o.y += dy; if (wall(o.x - r * .8, o.y + Math.sign(dy) * r) || wall(o.x + r * .8, o.y + Math.sign(dy) * r)) o.y = dy > 0 ? Math.floor(o.y + r) - r - .001 : Math.floor(o.y - r) + 1 + r + .001; }
  }
  function bfs(fx, fy, tx, ty) {
    var q = [[fx, fy]], prev = {}, k = function (x, y) { return x + "," + y; };
    prev[k(fx, fy)] = null;
    while (q.length) {
      var c = q.shift();
      if (c[0] === tx && c[1] === ty) break;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c[0] + d[0], ny = c[1] + d[1];
        if (map[ny] && map[ny][nx] === 0 && !(k(nx, ny) in prev)) { prev[k(nx, ny)] = c; q.push([nx, ny]); }
      });
    }
    var path = [], cur = [tx, ty];
    if (!(k(tx, ty) in prev)) return [];
    while (cur && !(cur[0] === fx && cur[1] === fy)) { path.unshift(cur); cur = prev[k(cur[0], cur[1])]; }
    return path;
  }

  function start() {
    gen(); state = "play"; t0 = performance.now(); flareT = 0; flareCool = 0;
    $("#start").hidden = true; $("#caught").hidden = true;
    toast("grab 3 souls... tomas wakes up in 3s"); blip(200, 120, .6, "sawtooth", .05);
  }
  function lose() {
    state = "caught"; $("#caught").hidden = false; blip(1100, 1900, .9, "sawtooth", .1); blip(300, 80, .9, "square", .08);
    if (navigator.vibrate) navigator.vibrate(300);
  }
  function win(now) {
    state = "won";
    var ms = Math.round(now - t0), best = +ls("mentosEscapeBest") || 0;
    if (!best || ms < best) ls("mentosEscapeBest", String(ms));
    // secret badge for the site's secrets counter + profile card
    try { var l = JSON.parse(ls("mentosSecrets") || "[]"); if (l.indexOf("escape") < 0) { l.push("escape"); ls("mentosSecrets", JSON.stringify(l)); toast("SECRET FOUND: escaped from tomas"); } } catch (e) {}
    blip(523, 1046, .6, "triangle", .08);
    $("#start").hidden = false; $("#play").textContent = "▶ Play again";
    $("#best").textContent = "U ESCAPED in " + (ms / 1000).toFixed(1) + "s" + (best && ms >= best ? " (best " + (best / 1000).toFixed(1) + "s)" : " ★ NEW BEST");
  }
  $("#play").addEventListener("click", start);
  $("#again").addEventListener("click", start);
  var b0 = +ls("mentosEscapeBest") || 0; if (b0) $("#best").textContent = "ur best: " + (b0 / 1000).toFixed(1) + "s";

  addEventListener("keydown", function (e) {
    keys[e.code] = true;
    if (e.code.indexOf("Arrow") === 0 || e.code === "Space") e.preventDefault();
    if (e.code === "KeyH") location.href = "fun.html";
    if (e.code === "KeyR" && state !== "menu") start();
    if (e.code === "Space" && state === "play") flare();
  });
  addEventListener("keyup", function (e) { keys[e.code] = false; });
  function flare() { if (flareCool > 0) return; flareT = 1.6; flareCool = 8; blip(300, 1500, .4, "triangle", .06); }

  // phone: joystick + buttons
  var touchV = { x: 0, y: 0 };
  if (matchMedia("(hover: none)").matches || "ontouchstart" in window) {
    $("#touch").hidden = false;
    var st = $("#stick"), knob = st.querySelector("i"), sid = null;
    var upd = function (e) { var r = st.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2, m = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), a = Math.atan2(dy, dx); touchV.x = Math.cos(a) * m; touchV.y = Math.sin(a) * m; knob.style.transform = "translate(" + touchV.x * 36 + "px," + touchV.y * 36 + "px)"; };
    st.addEventListener("pointerdown", function (e) { sid = e.pointerId; try { st.setPointerCapture(sid); } catch (e2) {} upd(e); });
    st.addEventListener("pointermove", function (e) { if (e.pointerId === sid) upd(e); });
    var endS = function () { sid = null; touchV.x = touchV.y = 0; knob.style.transform = ""; };
    st.addEventListener("pointerup", endS); st.addEventListener("pointercancel", endS);
    document.querySelectorAll("#touch [data-k]").forEach(function (b) {
      var k = b.getAttribute("data-k");
      b.addEventListener("pointerdown", function (e) { e.preventDefault(); keys[k] = true; b.classList.add("on"); if (k === "Space" && state === "play") flare(); });
      var off = function () { keys[k] = false; b.classList.remove("on"); };
      b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("pointerleave", off);
    });
  }

  function resize() { cv.width = innerWidth; cv.height = innerHeight; T = Math.max(34, Math.min(56, Math.round(Math.min(innerWidth, innerHeight) / 11))); }
  addEventListener("resize", resize); resize();

  function drawChibiMentos(x, y, walk) {
    var b = Math.sin(walk * 12) * 2;
    g.fillStyle = "#141414"; g.fillRect(x - 7, y + 2 + b, 14, 14);                       // body
    g.fillStyle = "#d8b48c"; g.beginPath(); g.arc(x, y - 8 + b, 12, 0, 7); g.fill();       // big head
    g.fillStyle = "#45e01f"; for (var i = 0; i < 7; i++) { var a = Math.PI + i / 6 * Math.PI; g.beginPath(); g.moveTo(x + Math.cos(a) * 9, y - 8 + b + Math.sin(a) * 9); g.lineTo(x + Math.cos(a) * 20, y - 8 + b + Math.sin(a) * 20); g.lineTo(x + Math.cos(a + .35) * 9, y - 8 + b + Math.sin(a + .35) * 9); g.fill(); }
    g.fillStyle = "#0b0b0b"; g.fillRect(x - 10, y - 11 + b, 20, 5);                      // goggles
  }
  function drawTomas(x, y, walk) {
    var b = Math.sin(walk * 10) * 2.5, s = T * 1.05;
    g.fillStyle = "#1b2335"; g.fillRect(x - s * .2, y + s * .05 + b, s * .4, s * .38);       // tiny hoodie body
    g.fillStyle = "#e3b89a"; g.fillRect(x - s * .28, y + s * .12 + b, s * .1, s * .2); g.fillRect(x + s * .18, y + s * .12 + b, s * .1, s * .2);
    if (head.complete) g.drawImage(head, x - s * .45, y - s * .75 + b, s * .9, s * .9);   // chibi: head is way too big
  }

  function frame(now, manual) {
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    g.fillStyle = "#000"; g.fillRect(0, 0, cv.width, cv.height);
    if (!map) { if (!manual) requestAnimationFrame(frame); return; }
    if (state === "play") {
      var mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + touchV.x;
      var my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + touchV.y;
      var m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
      var sprint = (keys.ShiftLeft || keys.ShiftRight) && player.stam > .05 && m > .1;
      player.stam = Math.max(0, Math.min(1, player.stam + (sprint ? -.45 : .18) * dt));
      var sp = (sprint ? 6.2 : 4.1) * dt;
      move(player, mx * sp, 0, .3); move(player, 0, my * sp, .3);
      if (m > .1) { player.walk += dt; if (mx) player.face = Math.sign(mx); }
      // souls + exit
      souls.forEach(function (s) { if (!s.got && Math.hypot(s.x - player.x, s.y - player.y) < .6) { s.got = true; blip(800, 1600, .25, "sine", .07); toast("soul " + souls.filter(function (q) { return q.got; }).length + "/3"); } });
      if (!exit.open && souls.every(function (s) { return s.got; })) { exit.open = true; toast("the exit is OPEN!! run"); blip(400, 1200, .5, "triangle", .08); }
      if (exit.open && Math.hypot(exit.x - player.x, exit.y - player.y) < .6) win(now);
      // tomas
      var el = (now - t0) / 1000;
      if (el > 3) {
        if (!tom.awake) { tom.awake = 1; toast("tomas woke up..."); blip(120, 60, 1, "sawtooth", .08); }
        tom.spd = 2.9 + el * .025;
        pathT -= dt;
        if (pathT <= 0) { pathT = .25; tomPath = bfs(Math.floor(tom.x), Math.floor(tom.y), Math.floor(player.x), Math.floor(player.y)); }
        var tgt = tomPath[0] ? { x: tomPath[0][0] + .5, y: tomPath[0][1] + .5 } : player;
        if (tomPath[0] && Math.hypot(tgt.x - tom.x, tgt.y - tom.y) < .1) tomPath.shift();
        var dx = tgt.x - tom.x, dy = tgt.y - tom.y, dl = Math.hypot(dx, dy) || 1, ts = tom.spd * dt;
        tom.x += dx / dl * Math.min(ts, dl); tom.y += dy / dl * Math.min(ts, dl); tom.walk += dt;
        var dist = Math.hypot(tom.x - player.x, tom.y - player.y);
        beat -= dt; if (dist < 6 && beat <= 0) { beat = .25 + dist * .12; blip(70, 50, .12, "sine", .2); }
        if (dist < .55) lose();
      }
      flareT = Math.max(0, flareT - dt); flareCool = Math.max(0, flareCool - dt);
      $("#hud").innerHTML = "souls <b>" + souls.filter(function (s) { return s.got; }).length + "/3</b> &bull; " + (el).toFixed(1) + "s" + (flareCool > 0 ? " &bull; flare " + Math.ceil(flareCool) + "s" : " &bull; flare ready") +
        '<div class="stam"><i style="width:' + (player.stam * 100) + '%"></i></div>';
    }
    // camera on the player
    var ox = cv.width / 2 - player.x * T, oy = cv.height / 2 - player.y * T;
    g.save(); g.translate(Math.round(ox), Math.round(oy));
    for (var y = 0; y < TH; y++) for (var x = 0; x < TW; x++) {
      if (map[y][x]) { g.fillStyle = (x + y) % 2 ? "#2a2438" : "#241f30"; g.fillRect(x * T, y * T, T, T); g.fillStyle = "#3a3350"; g.fillRect(x * T, y * T, T, 3); }
      else { g.fillStyle = (x * 7 + y * 3) % 5 ? "#120f18" : "#16121e"; g.fillRect(x * T, y * T, T, T); }
    }
    // exit door
    g.fillStyle = exit.open ? "#8dff3a" : "#4a1010"; g.fillRect((exit.x - .4) * T, (exit.y - .45) * T, .8 * T, .9 * T);
    g.fillStyle = "#000"; g.fillRect((exit.x - .3) * T, (exit.y - .35) * T, .6 * T, .8 * T);
    if (exit.open) { g.fillStyle = "rgba(141,255,58,.35)"; g.fillRect((exit.x - .3) * T, (exit.y - .35) * T, .6 * T, .8 * T); }
    // souls
    souls.forEach(function (s) { if (s.got) return; var p = 1 + Math.sin(now / 200 + s.x) * .15; g.fillStyle = "rgba(141,216,255,.25)"; g.beginPath(); g.arc(s.x * T, s.y * T, T * .45 * p, 0, 7); g.fill(); g.fillStyle = "#cfefff"; g.beginPath(); g.arc(s.x * T, s.y * T, T * .16 * p, 0, 7); g.fill(); });
    drawTomas(tom.x * T, tom.y * T, tom.walk);
    drawChibiMentos(player.x * T, player.y * T, player.walk);
    g.restore();
    // darkness with a lantern hole
    var lr = T * (2.6 + (flareT > 0 ? 3.2 * Math.min(1, flareT) : 0)) * (1 + Math.sin(now / 90) * .03);
    var grd = g.createRadialGradient(cv.width / 2, cv.height / 2, lr * .35, cv.width / 2, cv.height / 2, lr);
    grd.addColorStop(0, "rgba(0,0,0,0)"); grd.addColorStop(1, "rgba(0,0,0,.97)");
    g.fillStyle = grd; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = "rgba(255,170,60,.07)"; g.beginPath(); g.arc(cv.width / 2, cv.height / 2, lr * .6, 0, 7); g.fill();
    if (state === "play" && tom.awake) { var d2 = Math.hypot(tom.x - player.x, tom.y - player.y); if (d2 < 5) { g.fillStyle = "rgba(160,0,0," + (.35 * (1 - d2 / 5)) + ")"; g.fillRect(0, 0, cv.width, cv.height); } }
    if (!manual) requestAnimationFrame(frame);
  }
  gen(); requestAnimationFrame(function (n) { last = n; frame(n); });
  if (/[?&]debug\b/.test(location.search)) window.__esc = { get s() { return { state: state, player: player, tom: tom, souls: souls, exit: exit }; }, start: start, keys: keys, step: function (n, ms) { for (var i = 0; i < (n || 1); i++) { if (last < t0) last = t0; frame(last + (ms || 16), true); }; } };
})();
