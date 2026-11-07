/* CHATA - secrets.js
   Thirteen tapes are hidden on this page. Reading the source is cheating, Thomas.
   ...but he reads it too. */
(function () {
  "use strict";

  var html = document.documentElement;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var main = $("#main");
  if (!main) return;

  var FIGURE = '<svg viewBox="0 0 60 180" xmlns="http://www.w3.org/2000/svg"><ellipse cx="30" cy="19" rx="10" ry="12.5" fill="#030304"/>' +
    '<path fill="#030304" d="M25 30h10l1 6c7 1 11 3 13 7l3 52c0 4-4 5-5 1l-4-40-1 34 3 87h-9l-4-70h-4l-4 70h-9l3-87-1-34-4 40c-1 4-5 3-5-1l3-52c2-4 6-6 13-7z"/>' +
    '<circle cx="26" cy="19" r="1.3" fill="#e8e2d6" opacity=".75"/><circle cx="34" cy="19" r="1.3" fill="#e8e2d6" opacity=".75"/></svg>';
  var FOOT = '<svg viewBox="0 0 26 58" xmlns="http://www.w3.org/2000/svg"><path d="M13 1C6.5 1 3 8 3 16c0 6 2.5 10.5 3.5 15 .8 3.5 1.2 6 6.5 6s5.7-2.5 6.5-6c1-4.5 3.5-9 3.5-15C23 8 19.5 1 13 1z"/><ellipse cx="13" cy="49" rx="7" ry="7.5"/></svg>';

  // ================= the tapes =================
  var TAPES = [
    { id: "flashlight", name: "the flashlight", hint: "It's too dark in here. You had a key for that.", done: "You turned the light on. The walls had something to say." },
    { id: "knock", name: "knock knock", hint: "Knock on the name. Three times.", done: "You knocked three times. Something knocked back." },
    { id: "borovicka", name: "one more", hint: "Igor's drink. Say its name.", done: "Na zdravie. Igor's on his sixth. Or his seventh." },
    { id: "thomas", name: "your name", hint: "Something keeps saying your name. Say it back.", done: "The radio said your name. You answered." },
    { id: "leave", name: "don't leave", hint: "Leave. Then come back.", done: "You left. It didn't." },
    { id: "polaroid", name: "the back of the photo", hint: "Every photo has a back side.", done: "Five of them at that table. Six in the photo." },
    { id: "fog", name: "the mirror", hint: "The mirror is all steamed up. Wipe it.", done: "Someone wrote on it. From the other side." },
    { id: "seventh", name: "the seventh", hint: "Count the friends. Then keep looking.", done: "Six friends. Seven cards. Nobody invited him." },
    { id: "pause", name: "pause the tape", hint: "Stop the tape. Look at the road.", done: "He was standing on the road the whole time." },
    { id: "idle", name: "footprints", hint: "Don't move. Don't touch anything. Just wait.", done: "Footprints leading up to you. None leading away." },
    { id: "console", name: "behind you", hint: "Look where developers look.", done: "You typed look(). You shouldn't have." },
    { id: "konami", name: "dev build", hint: "↑ ↑ ↓ ↓ ← → ← → B A", done: "noclip on. figure_01 was 0.00 m behind you." },
    { id: "phone", name: "Thomas's phone", hint: "Your phone is somewhere in the controls.", done: "Unknown number: where are you going?" }
  ];
  var KEY = "chata_tapes_v1", found = {};
  try { found = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { found = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(found)); } catch (e) { /* private mode: progress lasts this visit */ } }
  function count() { return TAPES.filter(function (t) { return found[t.id]; }).length; }
  function tapeIndex(id) { for (var i = 0; i < TAPES.length; i++) if (TAPES[i].id === id) return i; return -1; }

  function unlock(id) {
    if (found[id]) return false;
    var i = tapeIndex(id);
    found[id] = Date.now(); save();
    if (i < 0) return true;
    var n = count();
    note("TAPE " + pad(i + 1) + " RECOVERED", "“" + TAPES[i].name + "”  ·  " + n + "/" + TAPES.length);
    sfx.tape();
    updateCounter(true);
    if (n === TAPES.length) setTimeout(finale, 3600);
    return true;
  }

  var counter = $("#tapes");
  function updateCounter(bump) {
    var n = count();
    $("#tapeN").textContent = n;
    counter.classList.toggle("all", n === TAPES.length);
    if (bump) { counter.classList.remove("bump"); void counter.offsetWidth; counter.classList.add("bump"); }
  }
  updateCounter(false);
  setTimeout(function () { counter.classList.add("on"); }, 1800);

  // ================= sound (all made on the fly, nothing to download) =================
  var AC = null, master = null, gestured = false, noiseBuf = null;
  function audio() {
    if (!gestured) return null;
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { AC = new C(); } catch (e) { return null; }
      master = AC.createGain(); master.gain.value = 0.8; master.connect(AC.destination);
    }
    if (AC.state === "suspended") AC.resume();
    return AC;
  }
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    addEventListener(ev, function () { gestured = true; audio(); }, { capture: true, passive: true });
  });
  function noise() {
    if (!noiseBuf) {
      var len = AC.sampleRate * 2, d;
      noiseBuf = AC.createBuffer(1, len, AC.sampleRate); d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = AC.createBufferSource(); s.buffer = noiseBuf; return s;
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(type, f0, f1, t, a, peak, d) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    env(g, t, a, peak, d); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + d + 0.05);
    return o;
  }
  function hiss(type, freq, q, t, a, peak, d) {
    var n = noise(), f = AC.createBiquadFilter(), g = AC.createGain();
    f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    env(g, t, a, peak, d); n.connect(f); f.connect(g); g.connect(master);
    n.start(t, Math.random() * 1.5); n.stop(t + a + d + 0.05);
  }
  var sfx = {
    knock: function (when, vol) {
      if (!audio()) return; var t = AC.currentTime + (when || 0); vol = vol || 1;
      tone("sine", 150, 46, t, 0.004, 0.9 * vol, 0.22);
      hiss("lowpass", 900, 0, t, 0.002, 0.55 * vol, 0.07);
    },
    knocks: function (n, gap, delay, vol) { for (var i = 0; i < n; i++) sfx.knock((delay || 0) + i * gap, vol); },
    click: function () {
      if (!audio()) return; var t = AC.currentTime;
      hiss("highpass", 2600, 0, t, 0.001, 0.4, 0.02);
      tone("square", 1800, 900, t, 0.001, 0.05, 0.03);
    },
    tape: function () {
      if (!audio()) return; var t = AC.currentTime;
      hiss("bandpass", 2200, 1, t, 0.001, 0.6, 0.03);
      hiss("bandpass", 1400, 1, t + 0.11, 0.001, 0.5, 0.05);
      tone("sine", 60, 60, t + 0.1, 0.03, 0.08, 0.35);
      tone("triangle", 880, 880, t + 0.14, 0.01, 0.05, 0.5);
    },
    paper: function () { if (!audio()) return; hiss("bandpass", 3000, 0.8, AC.currentTime, 0.06, 0.18, 0.2); },
    step: function () {
      if (!audio()) return; var t = AC.currentTime;
      hiss("lowpass", 520 + Math.random() * 200, 0, t, 0.01, 0.28, 0.14);
      hiss("bandpass", 1800, 2, t + 0.02, 0.005, 0.05, 0.08);
    },
    clink: function () {
      if (!audio()) return; var t = AC.currentTime;
      tone("sine", 2637, 2637, t, 0.002, 0.18, 0.9); tone("sine", 3951, 3951, t, 0.002, 0.07, 0.6);
      tone("sine", 3136, 3136, t + 0.13, 0.002, 0.14, 0.8);
    },
    sting: function () {
      if (!audio()) return; var t = AC.currentTime, f = AC.createBiquadFilter(), g = AC.createGain();
      f.type = "lowpass"; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.25);
      env(g, t, 0.03, 0.32, 1.6); f.connect(g); g.connect(master);
      [55, 58.27, 82.4].forEach(function (fr) { var o = AC.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.connect(f); o.start(t); o.stop(t + 1.8); });
      tone("sine", 1760, 1650, t, 0.05, 0.035, 1.4);
    },
    buzz: function (rings) {
      if (!audio()) return; var t = AC.currentTime;
      for (var r = 0; r < (rings || 1); r++) for (var p = 0; p < 2; p++) {
        var s = t + r * 1.1 + p * 0.42, o = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
        o.type = "square"; o.frequency.value = 148; f.type = "lowpass"; f.frequency.value = 320;
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.22, s + 0.02);
        g.gain.setValueAtTime(0.22, s + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.33);
        o.connect(f); f.connect(g); g.connect(master); o.start(s); o.stop(s + 0.36);
      }
    },
    stat: function (dur, vol) {
      if (!audio()) return; var t = AC.currentTime, n = noise(), f = AC.createBiquadFilter(), g = AC.createGain();
      dur = dur || 1; vol = vol || 0.2; n.loop = true;
      f.type = "bandpass"; f.frequency.value = 1700; f.Q.value = 0.7;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
      g.gain.setValueAtTime(vol, t + Math.max(0.05, dur - 0.15)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + dur + 0.05);
    }
  };
  function whisper(text) {
    if (!gestured || !("speechSynthesis" in window)) return;
    try {
      var u = new SpeechSynthesisUtterance(text), vs = speechSynthesis.getVoices() || [];
      var v = vs.filter(function (x) { return /^en/i.test(x.lang); })[0];
      if (v) u.voice = v;
      u.pitch = 0.1; u.rate = 0.55; u.volume = 0.9;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* no voice, no problem */ }
  }

  // ================= subtitles + notes =================
  var subs = $("#subs"), subT = [];
  function say(lines) {
    subT.forEach(clearTimeout); subT = [];
    var t = 0;
    lines.forEach(function (l) {
      subT.push(setTimeout(function () {
        subs.innerHTML = "";
        var p = document.createElement("p");
        if (l[0]) { var b = document.createElement("b"); b.textContent = l[0] + ": "; p.appendChild(b); }
        p.appendChild(document.createTextNode(l[1]));
        subs.appendChild(p); subs.classList.add("on");
      }, t));
      t += l[2] || 2800;
    });
    subT.push(setTimeout(function () { subs.classList.remove("on"); }, t));
  }
  var noteEl = $("#tapeNote"), noteT = 0;
  function note(a, b) {
    noteEl.innerHTML = "<b></b><span></span>";
    noteEl.firstChild.textContent = a; noteEl.lastChild.textContent = b;
    noteEl.classList.remove("on"); void noteEl.offsetWidth; noteEl.classList.add("on");
    clearTimeout(noteT); noteT = setTimeout(function () { noteEl.classList.remove("on"); }, 4300);
  }
  var pulseT = {};
  function pulse(cls, ms) {
    html.classList.remove(cls); void html.offsetWidth; html.classList.add(cls);
    clearTimeout(pulseT[cls]); pulseT[cls] = setTimeout(function () { html.classList.remove(cls); }, ms);
  }

  // ================= overlays =================
  var lastFocus = null;
  function openOv(sel) {
    var o = $(sel); if (!o) return;
    if (!$(".ov.on")) lastFocus = document.activeElement;
    o.classList.add("on");
    var x = $(".ov-x", o); if (x) try { x.focus({ preventScroll: true }); } catch (e) { x.focus(); }
  }
  function closeOv(o) {
    o.classList.remove("on");
    if (o.id === "phone") phoneClosed();
    if (!$(".ov.on") && lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* gone */ }
  }
  $$(".ov").forEach(function (o) {
    o.addEventListener("click", function (e) { if (e.target === o || e.target.closest(".ov-x")) closeOv(o); });
  });
  function closeTop() {
    var open = $$(".ov.on");
    if (open.length) { closeOv(open[open.length - 1]); return; }
    if (html.classList.contains("debug")) { debugOff(); return; }
    if (flashOn) setFlash(false);
  }
  // Enter / Space on the fake buttons
  $$('[role="button"]').forEach(function (el) {
    if (el.tagName === "BUTTON") return;
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } });
  });
  $$(".scrawl").forEach(function (s) { s.setAttribute("aria-hidden", "true"); });

  // ================= the tape log =================
  counter.addEventListener("click", function () {
    var ol = $("#tapeList"); ol.innerHTML = "";
    TAPES.forEach(function (t, i) {
      var li = document.createElement("li");
      li.className = found[t.id] ? "got" : "";
      li.innerHTML = '<span class="no"></span><span class="nm"></span><span class="ht"></span>';
      li.children[0].textContent = pad(i + 1);
      li.children[1].textContent = found[t.id] ? t.name : "? ? ? ? ? ?";
      li.children[2].textContent = found[t.id] ? t.done : t.hint;
      ol.appendChild(li);
    });
    if (found.witching) {
      var li = document.createElement("li"); li.className = "got bonus";
      li.innerHTML = '<span class="no">00</span><span class="nm">03:01</span><span class="ht">You were awake at three in the morning. So was he.</span>';
      ol.appendChild(li);
    }
    var n = count();
    $("#tapeSum").textContent = n + " / " + TAPES.length + " recovered" + (n === TAPES.length ? "  ·  all of them" : n ? "" : "  ·  they're hidden on this page");
    resetBtn.textContent = "erase all tapes";
    openOv("#tapeLog");
  });
  var resetBtn = $("#tapeReset"), resetArm = 0;
  resetBtn.addEventListener("click", function () {
    if (Date.now() - resetArm > 3000) { resetArm = Date.now(); resetBtn.textContent = "sure? click again to erase everything"; return; }
    found = {}; save(); updateCounter(false); closeOv($("#tapeLog"));
    say([["", "The tapes are blank again.", 2600]]);
  });

  // ================= 01 - flashlight (F) =================
  var dark = $("#dark"), man = $("#shadowman"), flashOn = false;
  var fx = innerWidth / 2, fy = innerHeight / 2, manX = 0, manY = 0, manT = 0, manSpot = 0, manSeen = false, flashHinted = false;
  man.innerHTML = FIGURE;
  function moveLight(x, y) { fx = x; fy = y; dark.style.setProperty("--fx", x + "px"); dark.style.setProperty("--fy", y + "px"); checkMan(); }
  // he only lets you look at him for a moment
  function checkMan() {
    if (!flashOn || man.className !== "on") return;
    var near = Math.hypot(manX - fx, manY - fy) < 150;
    if (near && !manSpot) manSpot = setTimeout(goneMan, 300);
    else if (!near && manSpot) { clearTimeout(manSpot); manSpot = 0; }
  }
  addEventListener("pointermove", function (e) { if (flashOn) moveLight(e.clientX, e.clientY); }, { passive: true });
  addEventListener("pointerdown", function (e) { if (flashOn) moveLight(e.clientX, e.clientY); }, { passive: true });
  addEventListener("dblclick", function () { if (flashOn) setFlash(false); });
  function setFlash(on) {
    if (on === flashOn) return;
    flashOn = on; html.classList.toggle("flash", on); sfx.click();
    clearTimeout(manT); hideMan();
    if (on) {
      moveLight(fx, fy); unlock("flashlight");
      if (!flashHinted) { flashHinted = true; say([["", "[F] Phone flashlight", 2600]]); }
      manT = setTimeout(spawnMan, 2500 + Math.random() * 3000);
    }
  }
  function spawnMan() {
    if (!flashOn) return;
    var w = innerWidth, h = innerHeight, x, y, tries = 0;
    do { x = w * (0.12 + Math.random() * 0.76); y = h * (0.32 + Math.random() * 0.42); tries++; }
    while (Math.hypot(x - fx, y - fy) < Math.min(w, h) * 0.35 && tries < 25);
    manX = x; manY = y; clearTimeout(manSpot); manSpot = 0;
    man.style.left = x + "px"; man.style.top = y + "px"; man.className = "on";
    checkMan();
  }
  function goneMan() {
    manSpot = 0;
    if (!flashOn || man.className !== "on") return;
    man.className = "on gone"; sfx.sting(); pulse("flick", 360);
    if (!manSeen) { manSeen = true; say([["", "...was someone standing there?", 2800]]); }
    setTimeout(function () { if (man.className === "on gone") man.className = ""; }, 420);
    manT = setTimeout(spawnMan, 7000 + Math.random() * 7000);
  }
  function hideMan() { clearTimeout(manSpot); manSpot = 0; man.className = ""; }

  // ================= 02 - knock on the name =================
  var title = $("#title"), knocks = [], knockBusy = false;
  title.addEventListener("click", function () {
    var now = Date.now();
    knocks = knocks.filter(function (k) { return now - k < 1800; }); knocks.push(now);
    sfx.knock(0, 0.5);
    title.classList.remove("knocked"); void title.offsetWidth; title.classList.add("knocked");
    if (knocks.length < 3 || knockBusy) return;
    knocks = []; knockBusy = true;
    setTimeout(function () {
      sfx.knocks(3, 0.45, 0, 1.2);
      [0, 450, 900].forEach(function (d) { setTimeout(function () { pulse("jolt", 260); }, d); });
    }, 1400);
    setTimeout(function () {
      say([["", "...someone knocked back.", 2600], ["", "From the inside.", 2600]]);
      unlock("knock"); knockBusy = false;
    }, 2900);
  });

  // ================= 03 - borovička =================
  var drunkT = 0;
  function setOrigin() { main.style.transformOrigin = "50% " + Math.round(scrollY + innerHeight / 2) + "px"; }
  function drunk() {
    if (html.classList.contains("drunk")) return;
    sfx.clink(); setOrigin();
    html.classList.add("drunk"); addEventListener("scroll", setOrigin, { passive: true });
    say([["Igor", "Na zdravie! One more. ONE more.", 3000], ["Ema", "Igor, slow down. That's your fifth.", 3200], ["", "Igor's on his sixth. Or his seventh.", 3400]]);
    unlock("borovicka");
    clearTimeout(drunkT);
    drunkT = setTimeout(function () { html.classList.remove("drunk"); removeEventListener("scroll", setOrigin); main.style.transformOrigin = ""; }, 11000);
  }
  $$(".w-boro").forEach(function (el) { el.addEventListener("click", drunk); });

  // ================= 04 - say his name =================
  var thomasBusy = false, rec = $("#osdRec");
  function thomas() {
    if (thomasBusy) return; thomasBusy = true;
    var old = rec.textContent;
    sfx.stat(1.6, 0.2); pulse("glitch", 1100); rec.textContent = "THOMAS?";
    setTimeout(function () { whisper("Thomas..."); }, 500);
    say([["", "[radio]  ...Thomas...", 2600], ["", "...Did someone just say your name?", 2800]]);
    setTimeout(function () { rec.textContent = old; thomasBusy = false; }, 2600);
    unlock("thomas");
  }
  var tw = $(".w-thomas"); if (tw) tw.addEventListener("click", thomas);

  // ================= 05 - leave the tab =================
  var origTitle = document.title, leftAt = 0, awayT = 0, fav = $("#fav"), origFav = fav ? fav.getAttribute("href") : "";
  var AWAY = ["come back to the cabin", "Thomas?", "he's still at the table", "don't let Igor drive", "where are you going?", "03:01"];
  var EYES = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#000"/><circle cx="11" cy="15" r="2.2" fill="#e5242f"/><circle cx="21" cy="15" r="2.2" fill="#e5242f"/></svg>');
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      leftAt = Date.now(); var i = 0;
      if (fav) fav.setAttribute("href", EYES);
      document.title = AWAY[0];
      clearInterval(awayT); awayT = setInterval(function () { i = (i + 1) % AWAY.length; document.title = AWAY[i]; }, 2000);
    } else {
      clearInterval(awayT); document.title = origTitle; if (fav) fav.setAttribute("href", origFav);
      if (leftAt && Date.now() - leftAt > 1500) setTimeout(function () { say([["", "...you came back.", 2400], ["", "It never left.", 2600]]); unlock("leave"); }, 700);
      leftAt = 0;
    }
  });

  // ================= 06 - the back of the photo =================
  var pol = $("#polaroid");
  if (pol) pol.addEventListener("click", function () {
    var flipped = pol.classList.toggle("flipped"); sfx.paper();
    if (flipped) setTimeout(function () { unlock("polaroid"); }, 1000);
  });

  // ================= 07 - the steamed-up mirror =================
  (function () {
    var glass = $("#fogglass"), cv = $("#fog");
    if (!glass || !cv || !cv.getContext) return;
    var ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 1.5), W = 0, H = 0, last = null, cleared = false, checkT = 0, seen = false, base = null;
    function hand(cx, cy, s, a) {
      ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0," + a + ")";
      ctx.translate(cx, cy); ctx.rotate(-0.18); ctx.scale(s, s);
      ctx.beginPath(); ctx.ellipse(0, 20, 34, 40, 0, 0, 7); ctx.fill();
      [[-30, -30, -0.35, 26], [-12, -48, -0.1, 32], [8, -52, 0.05, 34], [26, -44, 0.2, 30], [44, 6, 0.9, 22]].forEach(function (f) {
        ctx.save(); ctx.translate(f[0], f[1]); ctx.rotate(f[2]); ctx.beginPath(); ctx.ellipse(0, 0, 8.5, f[3], 0, 0, 7); ctx.fill(); ctx.restore();
      });
      ctx.restore();
    }
    function paint() {
      var r = glass.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width - 20)); H = Math.max(1, Math.round(r.height - 20));
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // a clean copy of the steam, used to fog the glass back up
      base = document.createElement("canvas"); base.width = cv.width; base.height = cv.height;
      var bx = base.getContext("2d"); bx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var g = bx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(198,206,214,.95)"); g.addColorStop(1, "rgba(168,178,188,.97)");
      bx.fillStyle = g; bx.fillRect(0, 0, W, H);
      for (var i = 0; i < W * H / 80; i++) { bx.fillStyle = "rgba(255,255,255," + (Math.random() * 0.14).toFixed(3) + ")"; bx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      ctx.drawImage(base, 0, 0, W, H);
      ctx.globalCompositeOperation = "destination-out";
      for (var d = 0; d < 16; d++) { // drips
        var x = Math.random() * W, y0 = Math.random() * H * 0.5, len = 30 + Math.random() * H * 0.5, lw = 1.5 + Math.random() * 2;
        ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + (Math.random() - 0.5) * 4, y0 + len); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y0 + len, lw * 1.3, 0, 7); ctx.fill();
      }
      hand(W * 0.82, H * 0.45, Math.min(W, H) / 260, 0.5); // someone else was here first
      ctx.globalCompositeOperation = "source-over";
    }
    function wipe(x, y) {
      ctx.globalCompositeOperation = "destination-out";
      var r = 30, from = last || { x: x, y: y }, n = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / 8));
      for (var i = 1; i <= n; i++) {
        var px = from.x + (x - from.x) * i / n, py = from.y + (y - from.y) * i / n, g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over"; last = { x: x, y: y };
      if (!checkT && !cleared) checkT = setTimeout(check, 450);
    }
    function check() {
      checkT = 0; if (cleared) return;
      var x0 = Math.floor(cv.width * 0.15), y0 = Math.floor(cv.height * 0.22), w = Math.floor(cv.width * 0.7), h = Math.floor(cv.height * 0.56);
      if (w < 1 || h < 1) return;
      var data = ctx.getImageData(x0, y0, w, h).data, step = 10, tot = 0, clr = 0;
      for (var y = 0; y < h; y += step) for (var x = 0; x < w; x += step) { tot++; if (data[(y * w + x) * 4 + 3] < 120) clr++; }
      if (tot && clr / tot > 0.4) {
        cleared = true; glass.classList.add("clear"); sfx.sting();
        say([["", "Someone wrote on it.", 2200], ["", "From the other side.", 2600]]);
        unlock("fog");
      }
    }
    function at(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse" || e.buttons) { var p = at(e); wipe(p.x, p.y); } });
    cv.addEventListener("pointerdown", function (e) { last = null; var p = at(e); wipe(p.x, p.y); });
    cv.addEventListener("pointerleave", function () { last = null; });
    cv.addEventListener("pointerup", function () { last = null; });
    paint();
    // it slowly steams up again while you look at it
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; }).observe(glass);
    setInterval(function () {
      if (!seen || document.hidden || !base) return;
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.015; ctx.drawImage(base, 0, 0, W, H); ctx.globalAlpha = 1;
    }, 600);
    var lastW = innerWidth;
    addEventListener("resize", function () { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; paint(); } });
  })();

  // ================= 08 - the seventh friend =================
  (function () {
    var cast = $(".cast"), sev = $("#seventh"), kick = $("#sixKick");
    if (!cast || !sev || !kick || !("IntersectionObserver" in window)) return;
    var t = 0, shown = false, done = false, th = [];
    for (var i = 0; i <= 20; i++) th.push(i / 20);
    new IntersectionObserver(function (es) {
      var e = es[0], need = Math.min(e.boundingClientRect.height, innerHeight) * 0.6, enough = e.intersectionRect.height >= need;
      if (enough) { if (!t && !shown && !done) t = setTimeout(show, 6000); }
      else { clearTimeout(t); t = 0; if (shown && e.intersectionRect.height < innerHeight * 0.1) hide(); }
    }, { threshold: th }).observe(cast);
    function show() {
      t = 0; shown = true;
      sev.classList.remove("off"); sev.classList.add("on");
      kick.textContent = "// the seven"; kick.classList.add("seven");
      sfx.stat(0.5, 0.1); unlock("seventh");
    }
    function hide() {
      shown = false; done = true;
      sev.classList.add("off"); kick.textContent = "// the six"; kick.classList.remove("seven");
      setTimeout(function () { sev.classList.remove("on", "off"); }, 520);
    }
  })();

  // ================= 09 - pause the tape =================
  var vcr = $("#vcr"), hero = $(".hero"), ghost = $(".hero-ghost");
  if (ghost) ghost.innerHTML = FIGURE;
  if (vcr && hero) vcr.addEventListener("click", function () {
    var p = hero.classList.toggle("paused");
    vcr.innerHTML = p ? "&#10074;&#10074; PAUSE" : "&#9654; PLAY &nbsp;SP";
    sfx.click();
    if (p) setTimeout(function () { if (hero.classList.contains("paused")) unlock("pause"); }, 1400);
  });

  // ================= 10 - don't move =================
  var lastAct = Date.now(), idleDone = false, idleRun = false, stepsBox = $("#steps"), stepT = [];
  ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"].forEach(function (ev) {
    addEventListener(ev, function () { lastAct = Date.now(); if (idleRun) stopSteps(); }, { passive: true, capture: true });
  });
  function stopSteps() {
    stepT.forEach(clearTimeout); stepT = []; idleRun = false;
    stepsBox.classList.add("fade");
    setTimeout(function () { if (!idleRun) { stepsBox.innerHTML = ""; stepsBox.classList.remove("fade"); } }, 1500);
  }
  setInterval(function () {
    if (idleDone || idleRun || document.hidden || $(".ov.on") || flashOn) return;
    if (Date.now() - lastAct > 40000) walk();
  }, 1000);
  function walk() {
    idleRun = true; stepsBox.classList.remove("fade"); stepsBox.innerHTML = "";
    var w = innerWidth, h = innerHeight, n = 12, x0 = w * (0.35 + Math.random() * 0.3), y0 = h + 40, x1 = w * 0.5, y1 = h * 0.45;
    var ang = Math.atan2(y1 - y0, x1 - x0), deg = ang * 180 / Math.PI + 90, nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
    for (var i = 0; i < n; i++) (function (i) {
      stepT.push(setTimeout(function () {
        var f = i / (n - 1), side = i % 2 ? 1 : -1, el = document.createElement("div");
        el.className = "fp"; el.innerHTML = FOOT;
        el.style.left = Math.round(x0 + (x1 - x0) * f + nx * 13 * side - 13) + "px";
        el.style.top = Math.round(y0 + (y1 - y0) * f + ny * 13 * side - 29) + "px";
        el.style.setProperty("--t", "rotate(" + deg.toFixed(1) + "deg)" + (side > 0 ? " scaleX(-1)" : ""));
        stepsBox.appendChild(el); sfx.step();
      }, i * 620));
    })(i);
    stepT.push(setTimeout(function () {
      idleDone = true;
      sfx.knocks(3, 0.45, 0.6, 1.1);
      [600, 1050, 1500].forEach(function (d) { setTimeout(function () { pulse("jolt", 260); }, d); });
      say([["", "Three knocks.", 2000], ["", "Footprints leading up to you. None leading away.", 3800]]);
      unlock("idle");
      stepT.push(setTimeout(stopSteps, 7000));
    }, n * 620 + 500));
  }

  // ================= 11 - the console =================
  try {
    console.log("%c CHATA ", "background:#d4202c;color:#fff;font:700 28px monospace;padding:4px 12px");
    console.log("%cYou're looking in the wrong place, Thomas.\nHe isn't in the code. He's behind you.\n\nType  look()  if you're sure.",
      "color:#e8e2d6;background:#07080a;font:15px monospace;padding:10px;line-height:1.6");
  } catch (e) { /* no console */ }
  window.look = function () {
    var j = $("#jump");
    j.innerHTML = FIGURE; j.classList.remove("on"); void j.offsetWidth; j.classList.add("on");
    sfx.sting(); setTimeout(function () { j.classList.remove("on"); }, 1000);
    say([["", "You shouldn't have looked.", 3000]]);
    unlock("console");
    return "He was behind you the whole time.";
  };

  // ================= 12 - dev build (Konami code) =================
  var dbg = $("#dbg"), dbgT = 0, dbgDist = 0, fps = 60, frames = 0, fpsT = 0, dbgRaf = 0;
  function gameVer() { var a = $("#dlLatest a.btn"), m = a && a.textContent.match(/v\d+/); return m ? m[0] : "v?"; }
  function fpsLoop(t) {
    frames++;
    if (!fpsT) fpsT = t;
    if (t - fpsT >= 1000) { fps = Math.round(frames * 1000 / (t - fpsT)); frames = 0; fpsT = t; }
    if (html.classList.contains("debug")) dbgRaf = requestAnimationFrame(fpsLoop);
  }
  function debugOn() {
    html.classList.add("debug"); dbg.classList.remove("alarm"); dbgDist = 4.8; frames = 0; fpsT = 0;
    sfx.click(); unlock("konami");
    clearInterval(dbgT); dbgT = setInterval(dbgTick, 250); dbgTick();
    cancelAnimationFrame(dbgRaf); dbgRaf = requestAnimationFrame(fpsLoop);
  }
  function dbgTick() {
    dbgDist = Math.max(0, dbgDist - 0.06);
    dbg.textContent = [
      "CHATA dev build " + gameVer() + "      [~] console",
      "noclip ......... ON",
      "godmode ........ OFF",
      "fps ............ " + fps,
      "player ......... Thomas   pos (12.40, 1.71, " + (scrollY / 100).toFixed(2) + ")",
      "igor.bac ....... " + (1.9 + (4.8 - dbgDist) * 0.09).toFixed(2) + " ‰  (rising)",
      "tapes .......... " + count() + "/" + TAPES.length,
      "figure_01 ...... " + (dbgDist > 0 ? dbgDist.toFixed(2) + " m behind player" : "0.00 m"),
      "figure_01.state  " + (dbgDist > 3 ? "WATCHING" : dbgDist > 1.2 ? "FOLLOWING" : dbgDist > 0 ? "CLOSE" : "DON'T TURN AROUND")
    ].join("\n");
    if (dbgDist <= 0 && !dbg.classList.contains("alarm")) {
      dbg.classList.add("alarm"); clearInterval(dbgT); sfx.sting(); pulse("glitch", 700);
      setTimeout(function () { dbg.textContent += "\n\nconnection lost."; }, 900);
      setTimeout(debugOff, 2800);
    }
  }
  function debugOff() { html.classList.remove("debug"); clearInterval(dbgT); dbg.classList.remove("alarm"); cancelAnimationFrame(dbgRaf); }

  // ================= 13 - Thomas's phone =================
  var THREADS = [
    { name: "Unknown number", av: "?", time: "03:01", unk: true, unread: true, msgs: [["in", "where are you going?"], ["sys", "Missed call · 03:01"]] },
    { name: "Mom", av: "M", time: "22:40", msgs: [["in", "Did you get there okay? Text me. And wear a hat!"], ["out", "yes mom we're here"], ["in", "Did you eat something? Proper food, not chips."], ["out", "halušky"], ["in", "Don't drink too much. Love you."]] },
    { name: "CHATA crew", av: "C", time: "20:12", msgs: [["in", "Igor: BOROVIČKA AT 18:00. NOT 18:01."], ["in", "Veronica: who took my charger??"], ["out", "not me"]] }
  ];
  var ph = $("#phone .ph"), phBody = $("#phBody"), phTitle = $("#phTitle"), phT = [], unkReplied = false;
  function clearPh() { phT.forEach(clearTimeout); phT = []; }
  function phoneClosed() { clearPh(); }
  function addMsg(box, m, unk) {
    var d = document.createElement("div");
    d.className = "msg " + m[0] + (unk && m[0] === "in" ? " unk" : "");
    if (m[0] === "typing") d.innerHTML = "<i></i><i></i><i></i>"; else d.textContent = m[1];
    box.appendChild(d); phBody.scrollTop = phBody.scrollHeight;
    return d;
  }
  function renderList() {
    clearPh(); ph.classList.remove("thread"); phTitle.textContent = "Messages"; phBody.innerHTML = "";
    THREADS.forEach(function (th) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "th" + (th.unk ? " unk" : "") + (th.unread ? " new" : "");
      b.innerHTML = '<span class="av"></span><b></b><small></small><p></p>';
      b.children[0].textContent = th.av; b.children[1].textContent = th.name; b.children[2].textContent = th.time;
      b.children[3].textContent = th.msgs[th.msgs.length - 1][1];
      b.addEventListener("click", function () { renderThread(th); });
      phBody.appendChild(b);
    });
  }
  function renderThread(th) {
    clearPh(); th.unread = false; ph.classList.add("thread"); phTitle.textContent = th.name; phBody.innerHTML = "";
    var box = document.createElement("div"); box.className = "msgs"; phBody.appendChild(box);
    th.msgs.forEach(function (m) { addMsg(box, m, th.unk); });
    if (th.unk && !unkReplied) {
      phT.push(setTimeout(function () {
        var typing = addMsg(box, ["typing", ""], true);
        phT.push(setTimeout(function () {
          typing.remove(); unkReplied = true;
          var m = ["in", "don't turn around"]; th.msgs.push(m); addMsg(box, m, true); sfx.buzz(1);
        }, 2600));
      }, 1400));
    }
  }
  $("#phBack").addEventListener("click", renderList);
  function phoneOpen() { renderList(); openOv("#phone"); sfx.buzz(1); unlock("phone"); }

  // clickable keys in the controls list
  $$("kbd[data-egg]").forEach(function (k) {
    k.addEventListener("click", function () { if (k.getAttribute("data-egg") === "flash") setFlash(!flashOn); else phoneOpen(); });
  });

  // ================= keyboard =================
  var typed = "", kPos = 0, KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  function plain(s) { return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s; }
  addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tg = e.target;
    if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    var k = (e.key || "").toLowerCase();
    if (k === KONAMI[kPos]) { kPos++; if (kPos === KONAMI.length) { kPos = 0; if (html.classList.contains("debug")) debugOff(); else debugOn(); } }
    else kPos = k === KONAMI[0] ? 1 : 0;
    if (k === "escape") { closeTop(); return; }
    if (k.length !== 1) return;
    typed = (typed + plain(k)).replace(/[^a-z]/g, "").slice(-20);
    if (/(borovicka|nazdravie)$/.test(typed)) { typed = ""; drunk(); return; }
    if (/(thomas|tomas)$/.test(typed)) { typed = ""; thomas(); return; }
    if (k === "f" && !$(".ov.on")) setFlash(!flashOn);
  });

  // ================= all 13 =================
  function finale() {
    var a = $("#dlLatest a.btn"), f = $("#finDl");
    if (a) { f.href = a.href; f.textContent = a.textContent; }
    $$(".ov.on").forEach(function (o) { o.classList.remove("on"); });
    openOv("#finale"); sfx.buzz(2);
    setTimeout(function () { say([["", "Missed call · Unknown number · 03:01", 3800]]); }, 2400);
  }
  $("#finDl").addEventListener("click", function () { closeOv($("#finale")); });

  // ================= bonus: it's actually 3 AM =================
  var DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  function witching() {
    var d = new Date();
    if (d.getHours() !== 3 || d.getMinutes() > 10 || html.classList.contains("witching")) return;
    html.classList.add("witching");
    rec.textContent = "LIVE";
    $("#osdTime").innerHTML = DAYS[d.getDay()] + " " + pad(d.getDate()) + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() + "<br>" + pad(d.getHours()) + ":" + pad(d.getMinutes());
    var tag = $("#heroTag"); if (tag) tag.textContent = "You shouldn't be awake right now, Thomas. Nobody else is.";
    setTimeout(function () { say([["", "It's " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ". Who's still awake at three in the morning?", 3800]]); }, 2500);
    if (!found.witching) { found.witching = Date.now(); save(); note("TAPE 00 RECOVERED", "“03:01”  ·  bonus"); sfx.tape(); }
  }
  witching(); setInterval(witching, 30000);

  // ================= little things =================
  var mirrorOpens = 0;
  $$(".shot").forEach(function (s) {
    var cap = $("figcaption", s), img = $("img", s);
    if (!cap) return;
    var orig = cap.innerHTML;
    s.addEventListener("mouseenter", function () {
      if (Math.random() > 0.07) return;
      cap.textContent = "03:01 — he's here"; cap.classList.add("ghosted");
      setTimeout(function () { cap.innerHTML = orig; cap.classList.remove("ghosted"); }, 900);
    });
    if (img && /mirror\.jpg$/.test(img.getAttribute("src"))) s.addEventListener("click", function () {
      if (++mirrorOpens === 3) setTimeout(function () { $("#lbCap").textContent = "Stop looking at him. He's started looking back."; }, 0);
    });
  });
})();
