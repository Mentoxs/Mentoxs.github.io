// extras for index.html: mentochi (shared pet), profile card, winamp player, webring, photo booth.
// Uses the small api index.html puts on window.MENTOS.
(function () {
  "use strict";
  var M = window.MENTOS;
  if (!M) return;
  var $ = M.$, el = M.el, store = M.store, blip = M.blip;
  var ls = function (k, v) { return store("localStorage", k, v); };
  var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  function ago(t) {
    var s = Math.max(0, (Date.now() - t) / 1000);
    return s < 60 ? "just now" : s < 3600 ? Math.floor(s / 60) + "m ago" : s < 86400 ? Math.floor(s / 3600) + "h ago" : Math.floor(s / 86400) + "d ago";
  }

  /* =====================================================================
     MENTOCHI: one pet for the whole internet (supabase table pet_events)
     ===================================================================== */
  var PET = { events: null, anim: null, animT: 0, frame: 0 };
  var LCD_BG = "#a9b88f", LCD_PX = "#263020";
  // 12x10 ghost body, X = body, e/m are drawn on top
  var BODY = ["...XXXXXX...", "..XXXXXXXX..", ".XXXXXXXXXX.", "XXXXXXXXXXXX", "XXXXXXXXXXXX", "XXXXXXXXXXXX", "XXXXXXXXXXXX", "XXXXXXXXXXXX", "XX.XXX.XXX.X", "X...X...X..."];
  function petMood() {
    var ev = PET.events || [], now = Date.now(), H = 3600e3;
    var lastFeed = ev.filter(function (e) { return e.kind === "feed"; }).map(function (e) { return e.t; })[0] || 0;
    var hunger = lastFeed ? Math.max(0, Math.min(100, 100 - (now - lastFeed) / H * 12)) : 10;
    var fun = 0;
    ev.forEach(function (e) { if ((e.kind === "play" || e.kind === "pet") && now - e.t < 12 * H) fun += 25 * (1 - (now - e.t) / (12 * H)); });
    fun = Math.min(100, fun);
    var today = ev.filter(function (e) { return now - e.t < 24 * H; });
    var visitors = {}; today.forEach(function (e) { visitors[e.name || "?"] = 1; });
    var hr = new Date().getHours(), recent = ev[0] && now - ev[0].t < 20 * 60e3;
    var mood = !today.length ? "lonely" : hr < 6 && !recent ? "sleep" : hunger < 25 ? "hungry" : fun < 20 ? "sad" : hunger > 60 && fun > 50 ? "happy" : "ok";
    return { hunger: hunger, fun: fun, visitors: Object.keys(visitors).length, mood: mood };
  }
  var MOOD_TXT = { happy: "mentochi is SO happy rn <3", ok: "mentochi is chillin", hungry: "mentochi is starving... feed it!!", sad: "mentochi is bored. play with it pls", lonely: "nobody visited 2day... mentochi is lonely :(", sleep: "zzz... mentochi is sleeping", egg: "mentochi is still hatching..." };
  function drawPet() {
    var c = $("#petcv"); if (!c) return;
    var g = c.getContext("2d"), W = c.width, Hh = c.height;
    g.fillStyle = LCD_BG; g.fillRect(0, 0, W, Hh);
    var px = function (x, y) { g.fillStyle = LCD_PX; g.fillRect(x, y, 1, 1); };
    var m = PET.events ? petMood().mood : "egg";
    var bob = PET.frame % 2, ox = 10, oy = 7 + bob;
    if (PET.anim === "play") { oy -= Math.round(Math.abs(Math.sin(PET.animT * 8)) * 5); }
    if (m === "egg") {
      for (var y = 0; y < 12; y++) for (var x = 0; x < 10; x++) { var dx = (x - 4.5) / 4.6, dy = (y - 6.5) / 6; if (dx * dx + dy * dy < 1) px(x + 11, y + 6 + bob); }
      g.fillStyle = LCD_BG; [[13, 10], [16, 12], [14, 14], [18, 9]].forEach(function (p) { g.fillRect(p[0], p[1], 1, 1); });
      return;
    }
    BODY.forEach(function (row, y) { for (var x = 0; x < 12; x++) if (row[x] === "X") px(ox + x, oy + y); });
    // face (cut out of the body)
    g.fillStyle = LCD_BG;
    var eye = function (x, y, w, h) { g.fillRect(ox + x, oy + y, w, h); };
    if (m === "sleep") { eye(3, 4, 2, 1); eye(7, 4, 2, 1); }
    else if (m === "happy" || PET.anim === "pet") { eye(3, 3, 2, 1); eye(2, 4, 1, 1); eye(5, 4, 1, 1); eye(7, 3, 2, 1); eye(6, 4, 1, 1); eye(9, 4, 1, 1); }
    else { eye(3, 3, 2, 2); eye(7, 3, 2, 2); }
    if (PET.anim === "feed" && PET.animT > .5) eye(5, 6, 2, 2);
    else if (m === "happy" || PET.anim) { eye(4, 6, 4, 1); eye(3, 5, 1, 1); eye(8, 5, 1, 1); }
    else if (m === "sad" || m === "lonely" || m === "hungry") { eye(4, 6, 4, 1); eye(3, 7, 1, 1); eye(8, 7, 1, 1); }
    else eye(5, 6, 2, 1);
    if ((m === "sad" || m === "lonely") && bob) { g.fillStyle = LCD_PX; g.fillRect(ox + 2, oy + 6, 1, 2); }
    g.fillStyle = LCD_PX;
    if (m === "sleep") { [[25, 4], [26, 4], [27, 4], [26, 5], [25, 6], [26, 6], [27, 6]].forEach(function (p) { g.fillRect(p[0], p[1] - bob, 1, 1); }); }
    if (m === "hungry") { g.fillRect(25, 6, 1, 3); g.fillRect(25, 10, 1, 1); }
    // action animations
    if (PET.anim === "feed") { var fy = Math.min(13, Math.floor(PET.animT * 20)); if (PET.animT < .6) { g.fillRect(25, fy, 3, 3); g.fillStyle = LCD_BG; g.fillRect(26, fy + 1, 1, 1); } }
    if (PET.anim === "pet" || PET.anim === "play") { var hy = 3 - Math.floor(PET.animT * 4); [".X.X.", "XXXXX", ".XXX.", "..X.."].forEach(function (row, y) { for (var x = 0; x < 5; x++) if (row[x] === "X") g.fillRect(24 + x, hy + y + 4, 1, 1); }); }
    if (PET.anim === "play") { var bx = 3 + Math.round(Math.abs(Math.sin(PET.animT * 6)) * 3); g.fillRect(bx, 18, 2, 2); }
  }
  function renderPetInfo() {
    var box = $("#petinfo"); if (!box) return;
    if (!PET.events) { box.innerHTML = ""; $("#petmood").textContent = MOOD_TXT.egg; return; }
    var s = petMood();
    $("#petmood").textContent = MOOD_TXT[s.mood];
    box.innerHTML = '<div class="meter"><span>hunger</span><i><b style="width:' + s.hunger.toFixed(0) + '%"></b></i></div>' +
      '<div class="meter"><span>fun</span><i><b style="width:' + s.fun.toFixed(0) + '%"></b></i></div>' +
      "<div>visitors 2day: " + s.visitors + "</div><ul></ul>";
    var ul = box.querySelector("ul");
    PET.events.filter(function (e) { return e.kind !== "visit"; }).slice(0, 4).forEach(function (e) {
      var li = el("li"); li.textContent = (e.name || "someone") + { feed: " fed mentochi", play: " played with mentochi", pet: " petted mentochi" }[e.kind] + " · " + ago(e.t); ul.appendChild(li);
    });
    if (!ul.children.length) ul.appendChild(el("li", null, "nobody has fed mentochi yet..."));
  }
  function loadPet() {
    return M.api("pet_events?select=name,kind,created_at&order=created_at.desc&limit=300&created_at=gte." + new Date(Date.now() - 48 * 3600e3).toISOString())
      .then(function (rows) { PET.events = rows.map(function (r) { return { name: r.name, kind: r.kind, t: Date.parse(r.created_at) }; }); })
      .catch(function () { PET.events = null; })
      .then(function () { renderPetInfo(); drawPet(); $$petBtns().forEach(function (b) { b.disabled = !PET.events; }); });
  }
  function $$petBtns() { return Array.prototype.slice.call(document.querySelectorAll("#pet .btns button")); }
  function petAct(kind) {
    if (!PET.events) { blip("error"); return; }
    var last = +ls("mentosPetAct") || 0, wait = Math.ceil((last + 20000 - Date.now()) / 1000);
    if (wait > 0) { $("#petmood").textContent = "mentochi needs a sec... (" + wait + "s)"; return; }
    ls("mentosPetAct", String(Date.now()));
    PET.anim = kind; PET.animT = 0; blip(kind === "feed" ? "pop" : "on");
    var name = ls("mentosName") || "a visitor";
    PET.events.unshift({ name: name, kind: kind, t: Date.now() }); renderPetInfo();
    M.api("pet_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ name: name, kind: kind }) }).catch(function () { $("#petmood").textContent = "error: mentochi didn't get that. try again?"; });
  }
  function buildPet() {
    var box = $("#pet"); if (!box) return;
    box.innerHTML = '<div class="tama"><div class="brand">MENTOCHI</div><div class="lcd"><canvas id="petcv" width="32" height="24" aria-label="Mentochi the shared pet"></canvas><div class="mood" id="petmood" aria-live="polite"></div></div>' +
      '<div class="btns"><button type="button" data-k="feed">feed</button><button type="button" data-k="play">play</button><button type="button" data-k="pet">pet</button></div></div>' +
      '<div class="petinfo" id="petinfo"></div><p class="petinfo" style="margin-top:6px">1 pet 4 every1 who visits. if nobody feeds it, it gets sad.</p>';
    $$petBtns().forEach(function (b) { b.disabled = true; b.addEventListener("click", function () { petAct(b.getAttribute("data-k")); }); });
    drawPet();
    loadPet().then(function () {
      // count this visit (once every 6 hours per browser) so mentochi knows people still come by
      if (PET.events && Date.now() - (+ls("mentosPetVisit") || 0) > 6 * 3600e3) {
        ls("mentosPetVisit", String(Date.now()));
        M.api("pet_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ name: ls("mentosName") || "a visitor", kind: "visit" }) }).then(loadPet).catch(function () {});
      }
    });
    setInterval(function () { PET.frame++; drawPet(); }, 500);
    setInterval(loadPet, 60000);
    var last = performance.now();
    (function tick(now) {
      if (PET.anim) { PET.animT += (now - last) / 1000; if (PET.animT > 1.6) { PET.anim = null; renderPetInfo(); } drawPet(); }
      last = now; requestAnimationFrame(tick);
    })(last);
  }

  /* =====================================================================
     PROFILE CARD (everything lives in this browser)
     ===================================================================== */
  var SKIN_NAMES = { scene: "Scene Queen", emo: "Emo Kid", mentos: "Mentos", kiko: "Kiko", gastly: "Cyber Gastly", angel: "Glitter Angel", raver: "Toxic Raver", butterfly: "Butterfly Y2K" };
  var BADGE_ICONS = { // 8x8 pixel icons, one per secret
    rawr: ["..XXXX..", ".XXXXXX.", "XX.XX.XX", "XXXXXXXX", "XX....XX", "XXXXXXXX", "X.XX.XX.", "........"],
    mentos: ["..XXXX..", ".X....X.", "X.XXXX.X", "X.X..X.X", "X.X..X.X", "X.XXXX.X", ".X....X.", "..XXXX.."],
    konami: ["..X.....", ".XXX....", "XXXXX...", "..X..XX.", "..X..XX.", ".....XX.", "XXXXXXXX", "........"],
    kiko: [".XXXXXX.", "X......X", "X.XX.XX.", "XXXXXXXX", "X......X", "X..XX..X", ".X....X.", "..XXXX.."],
    gastly: ["..XXXX..", ".X....X.", "X......X", "XXXXXXXX", "X......X", "X......X", ".X....X.", "..XXXX.."],
    honda: ["........", "..XXXX..", ".X.XX.X.", "XXXXXXXX", "XXXXXXXX", ".XX..XX.", ".XX..XX.", "........"],
    scared: [".XXXXXX.", "XXXXXXXX", "X..XX..X", "X..XX..X", "XXXXXXXX", ".XX..XX.", ".X.XX.X.", "........"],
    splat: ["...X....", "..XXX..X", ".XXXXXX.", "XXXXXXXX", ".XXXXXX.", "X.XXXX..", "..X..X..", "........"],
    crack: ["X...X...", ".X..X..X", "..X.X.X.", "XXXXXXXX", "..X.X.X.", ".X..X..X", "X...X...", "........"]
  };
  function iconSvg(rows) {
    var r = ""; rows.forEach(function (row, y) { for (var x = 0; x < 8; x++) if (row[x] === "X") r += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>'; });
    return '<svg viewBox="0 0 8 8" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">' + r + "</svg>";
  }
  var profileSig = "";
  function renderProfile() {
    var box = $("#profile"); if (!box) return;
    var name = ls("mentosName");
    if (!ls("mentosFirst")) ls("mentosFirst", String(Date.now()));
    var found = M.foundList(), skin = ls("mentosSkin"), sticker = null;
    try { sticker = JSON.parse(ls("mentosSticker") || "null"); } catch (e) {}
    var best = +ls("mentosParkourBest") || 0;
    var sig = [name, found.join(), skin, ls("mentosSticker"), ls("mentosCaught"), ls("mentosRay"), ls("mentosVisits"), best, ls("mentosSharedCount")].join("|");
    if (sig === profileSig && box.childElementCount) return;
    profileSig = sig;
    if (!name) {
      box.innerHTML = '<p class="petinfo" style="font-size:1.3rem;text-align:center">sign the <a href="#guestbook">guestbook</a> 2 get ur own Y2K profile card <3</p>';
      return;
    }
    var since = new Date(+ls("mentosFirst"));
    box.innerHTML = '<div class="card-y2k"><div class="top"><img class="skin" alt=""><div><p class="nm k"></p><div class="since"></div>' +
      '<label class="status">mood: <input maxlength="40" id="pstatus"></label></div></div>' +
      '<h3>~ stats ~</h3><div class="stats"><div><b id="pvisits"></b>visits</div><div><b>' + found.length + "/" + M.SECRETS.length + '</b>secrets</div><div><b id="pbest"></b>parkour best</div></div>' +
      '<h3>~ badges ~</h3><div class="badges" id="pbadges"></div>' +
      '<h3>~ my wall sticker ~</h3><div class="petinfo" id="psticker" style="margin:0"></div></div>';
    box.querySelector(".nm").textContent = name;
    box.querySelector(".since").textContent = "member since " + since.toLocaleDateString() + " • skin: " + (SKIN_NAMES[skin] || "none yet");
    var img = box.querySelector(".skin");
    if (SKIN_NAMES[skin]) { img.src = "images/skins/" + skin + ".png"; img.alt = SKIN_NAMES[skin] + " skin"; }
    else { img.src = "images/gastly.webp"; img.style.imageRendering = "auto"; img.title = "pick a skin in Block World"; }
    var st = box.querySelector("#pstatus"); st.value = ls("mentosStatus") || "rawr xD"; st.addEventListener("input", function () { ls("mentosStatus", st.value); });
    box.querySelector("#pvisits").textContent = ls("mentosVisits") || "1";
    box.querySelector("#pbest").textContent = best ? (best / 1000).toFixed(1) + "s" : "--";
    var bw = box.querySelector("#pbadges");
    M.SECRETS.forEach(function (s) {
      var on = found.indexOf(s[0]) > -1, b = el("div", "badge" + (on ? " on" : ""), (on ? iconSvg(BADGE_ICONS[s[0]] || BADGE_ICONS.rawr) : "") + (on ? s[0] : "?"));
      b.title = on ? s[1] : "secret not found yet"; bw.appendChild(b);
    });
    if (ls("mentosRay") === "1") { var r = el("div", "badge on", iconSvg(BADGE_ICONS.konami) + "rayquaza"); r.title = "unlocked RAYQUAZA"; bw.appendChild(r); }
    var ps = box.querySelector("#psticker");
    if (sticker) { var sp = el("span", "mysticker", M.stickerHtml(sticker)); sp.style.color = sticker.color; ps.appendChild(sp); ps.appendChild(document.createTextNode("on the visitor wall 4 ever")); }
    else { ps.innerHTML = 'none yet → <a href="#wall">leave 1 on the wall</a>'; }
  }

  /* =====================================================================
     WINAMP: the original mp3 + 3 original 8-bit songs written in code
     ===================================================================== */
  var NOTE = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
  var CH = { // chord tones (semitones from root)
    m: [0, 3, 7], M: [0, 4, 7]
  };
  // each chip song: bpm, progression of [root, quality] per bar, a melody (scale steps per 8th, null = rest) and a style
  var SONGS = [
    { title: "megalomaniac.mp3", mp3: true },
    { title: "STARSTRUKK - 3OH!3 feat. Katy Perry", yt: "dvf--10EYXw" },
    { title: "I FINK U FREEKY - Die Antwoord", yt: "8Uee_mcxvrw" },
    { title: "gastly gang (8-bit) - mentos", bpm: 132, key: 57, prog: [["A", "m"], ["F", "M"], ["C", "M"], ["G", "M"]], style: "arp",
      mel: [12, null, 15, 14, 12, null, 10, null, 12, 15, 17, 15, 14, null, 12, null, 8, null, 10, 12, 15, null, 14, 12, 10, null, 7, null, 10, 12, 14, null] },
    { title: "kiko dungeon crawl - mentos", bpm: 96, key: 50, prog: [["D", "m"], ["A#", "M"], ["G", "m"], ["A", "M"]], style: "dark",
      mel: [12, null, null, 15, 14, null, 12, null, 10, null, null, 12, 9, null, null, null, 10, null, null, 12, 14, null, 15, null, 16, null, 14, null, 13, null, null, null] },
    { title: "block world chill - mentos", bpm: 88, key: 60, prog: [["C", "M"], ["A", "m"], ["F", "M"], ["G", "M"]], style: "chill",
      mel: [16, null, 14, null, 12, null, null, null, 12, null, 14, 16, 19, null, null, null, 17, null, 16, null, 14, null, 12, null, 14, null, null, 12, 11, null, null, null] }
  ];
  var WA = { ctx: null, master: null, an: null, cur: +ls("mentosTrack") || 0, playing: false, step: 0, nextT: 0, timer: 0, chipStart: 0, srcHooked: false, vol: ls("mentosVol") ? +ls("mentosVol") : .6 };
  if (!SONGS[WA.cur]) WA.cur = 0;
  function waCtx() {
    if (WA.ctx) { if (WA.ctx.state === "suspended") WA.ctx.resume(); return WA.ctx; }
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    WA.ctx = new C(); WA.master = WA.ctx.createGain(); WA.master.gain.value = WA.vol;
    WA.an = WA.ctx.createAnalyser(); WA.an.fftSize = 64;
    WA.master.connect(WA.an); WA.an.connect(WA.ctx.destination);
    return WA.ctx;
  }
  function hookMp3() {
    if (WA.srcHooked || !waCtx()) return;
    try { WA.ctx.createMediaElementSource(M.audio).connect(WA.master); WA.srcHooked = true; M.audio.volume = 1; } catch (e) {}
  }
  var SCALE = { m: [0, 2, 3, 5, 7, 8, 10], M: [0, 2, 4, 5, 7, 9, 11] };
  function midiHz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function tone(t, freq, len, type, vol, slide) {
    var o = WA.ctx.createOscillator(), g = WA.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    o.connect(g); g.connect(WA.master); o.start(t); o.stop(t + len + .02);
  }
  var noiseBuf = null;
  function noise(t, len, vol, hp) {
    if (!noiseBuf) { noiseBuf = WA.ctx.createBuffer(1, WA.ctx.sampleRate * .3, WA.ctx.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var s = WA.ctx.createBufferSource(), g = WA.ctx.createGain(), f = WA.ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    s.connect(f); f.connect(g); g.connect(WA.master); s.start(t); s.stop(t + len);
  }
  // plays one 16th-note step of the current chip song at time t
  function chipStep(song, step, t) {
    var bar = Math.floor(step / 16) % song.prog.length, s16 = step % 16, sp = 60 / song.bpm / 4;
    var ch = song.prog[bar], root = song.key - 12 + ((NOTE[ch[0]] - (song.key % 12) + 12) % 12), tones = CH[ch[1]];
    var dark = song.style === "dark", chill = song.style === "chill";
    // bass
    if (s16 % (dark ? 8 : 4) === 0) tone(t, midiHz(root - 12), sp * (dark ? 6 : 3), dark ? "sawtooth" : "triangle", dark ? .09 : .14);
    if (!dark && s16 % 4 === 2) tone(t, midiHz(root), sp * 1.5, "triangle", .07);
    // arpeggio
    if (song.style === "arp" || (chill && s16 % 2 === 0)) tone(t, midiHz(root + 12 + tones[(s16 / (chill ? 2 : 1) | 0) % 3] + (s16 >= 8 && !chill ? 12 : 0)), sp * (chill ? 1.8 : .9), chill ? "triangle" : "square", chill ? .03 : .025);
    // melody on 8ths
    if (s16 % 2 === 0) {
      var mi = ((Math.floor(step / 2)) % song.mel.length), deg = song.mel[mi];
      if (deg != null) {
        var sc = SCALE[song.prog[0][1]], n = song.key + 12 * Math.floor(deg / 7) + sc[((deg % 7) + 7) % 7] - 12 + 12;
        tone(t, midiHz(n), sp * (chill ? 3 : 1.8), chill ? "sine" : "square", chill ? .07 : .045);
      }
    }
    // drums
    if (s16 % 8 === 0) tone(t, 150, .12, "sine", .3, 40);
    if (s16 % 8 === 4) noise(t, dark ? .2 : .12, dark ? .1 : .14, 1500);
    if (!dark && s16 % 2 === 1) noise(t, .03, chill ? .02 : .04, 7000);
  }
  function chipScheduler() {
    var song = SONGS[WA.cur], sp = 60 / song.bpm / 4;
    while (WA.nextT < WA.ctx.currentTime + .12) { chipStep(song, WA.step, WA.nextT); WA.step++; WA.nextT += sp; }
  }
  /* youtube tracks: the songs stream from their official videos via the youtube player
     (youtube's rules: the player has to stay visible and at least 200x200, so the video shows inside winamp) */
  var YT_P = null, ytReady = false, ytWant = null;
  function ytLoad(cb) {
    if (ytReady) { cb(); return; }
    ytWant = cb;
    if (window.YT && window.YT.Player) { ytMake(); return; }
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prev) prev(); ytMake(); };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) { var s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s); }
  }
  function ytMake() {
    if (YT_P) return;
    YT_P = new window.YT.Player(waEl.querySelector(".wa-yt div"), {
      width: 288, height: 200, playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: function () { ytReady = true; YT_P.setVolume(Math.round(WA.vol * 100)); if (ytWant) { var f = ytWant; ytWant = null; f(); } },
        onStateChange: function (e) { if (e.data === 0 && SONGS[WA.cur].yt) waPlay(WA.cur + 1); }, // ended -> next track
        onError: function () { if (SONGS[WA.cur].yt) { waEl.querySelector(".wa-marq span").textContent = "this video can't play here right now... skipping *** "; setTimeout(function () { waPlay(WA.cur + 1); }, 1500); } }
      }
    });
  }
  function ytShow(on) { if (waEl) waEl.querySelector(".wa-yt").hidden = !on; }
  function waPlay(i) {
    if (i != null && i !== WA.cur) { waStop(); WA.cur = (i + SONGS.length) % SONGS.length; ls("mentosTrack", String(WA.cur)); }
    var song = SONGS[WA.cur];
    if (!waCtx()) return;
    WA.playing = true;
    ytShow(!!song.yt);
    if (song.yt) {
      M.audio.pause(); clearInterval(WA.timer);
      ytLoad(function () {
        var d = YT_P.getVideoData && YT_P.getVideoData();
        if (!d || d.video_id !== song.yt) YT_P.loadVideoById(song.yt); else YT_P.playVideo();
      });
    } else if (song.mp3) { if (YT_P && ytReady) YT_P.pauseVideo(); hookMp3(); var p = M.audio.play(); if (p && p.catch) p.catch(function () {}); }
    else { if (YT_P && ytReady) YT_P.pauseVideo(); M.audio.pause(); WA.step = 0; WA.nextT = WA.ctx.currentTime + .05; WA.chipStart = WA.ctx.currentTime; clearInterval(WA.timer); WA.timer = setInterval(chipScheduler, 25); }
    M.showPlay(true); waDraw();
  }
  function waPause() {
    WA.playing = false; clearInterval(WA.timer); if (!M.audio.paused) M.audio.pause();
    if (YT_P && ytReady && SONGS[WA.cur].yt) YT_P.pauseVideo();
    M.showPlay(false); waDraw();
  }
  function waStop() { waPause(); if (SONGS[WA.cur].mp3) M.audio.currentTime = 0; if (SONGS[WA.cur].yt && YT_P && ytReady) YT_P.seekTo(0, true); WA.step = 0; }
  // if the intro's "ENTER with music" starts the mp3, the player follows along
  M.audio.addEventListener("play", function () { if (!SONGS[WA.cur].mp3) { clearInterval(WA.timer); if (YT_P && ytReady) YT_P.pauseVideo(); ytShow(false); WA.cur = 0; } WA.playing = true; hookMp3(); waDraw(); });
  M.audio.addEventListener("pause", function () {
    if (SONGS[WA.cur].mp3) { WA.playing = false; waDraw(); }
    else if (WA.playing) M.showPlay(true); // the mp3 was paused because an 8-bit song took over
  });
  var waEl = null;
  function waBuild() {
    waEl = el("div", "wamp"); waEl.hidden = true; waEl.setAttribute("role", "region"); waEl.setAttribute("aria-label", "Music player");
    waEl.setAttribute("data-skin", ls("mentosWaSkin") || "classic");
    waEl.innerHTML = '<div class="wa-title"><button type="button" class="wa-min" aria-label="Minimize">_</button><span>WINAMP</span><button type="button" class="wa-x" aria-label="Close player">×</button></div>' +
      '<div class="wa-disp"><div><div class="wa-time" aria-hidden="true">00:00</div><canvas class="wa-vis" width="38" height="15" aria-hidden="true"></canvas></div>' +
      '<div class="wa-right"><div class="wa-marq"><span></span></div><div class="wa-info"><span>128 kbps</span><span>44 khz</span><span>stereo</span></div></div></div>' +
      '<input class="wa-seek" type="range" min="0" max="1000" value="0" aria-label="Seek">' +
      '<div class="wa-ctrl"><button type="button" data-a="prev" aria-label="Previous">|&lt;</button><button type="button" data-a="play" aria-label="Play">&#9654;</button><button type="button" data-a="pause" aria-label="Pause">||</button><button type="button" data-a="stop" aria-label="Stop">&#9632;</button><button type="button" data-a="next" aria-label="Next">&gt;|</button>' +
      '<input type="range" class="wa-vol" min="0" max="100" aria-label="Volume"><select class="wa-skin" aria-label="Player skin"><option value="classic">classic</option><option value="mentos">mentos</option><option value="toxic">toxic</option></select></div>' +
      '<div class="wa-yt" hidden><div></div></div><div class="wa-pl" role="list"></div>';
    document.body.appendChild(waEl);
    var q = function (s) { return waEl.querySelector(s); };
    q(".wa-x").addEventListener("click", function () { waEl.hidden = true; });
    q(".wa-min").addEventListener("click", function () { waEl.classList.toggle("mini"); });
    waEl.querySelectorAll(".wa-ctrl button").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-a");
        if (a === "play") waPlay(); if (a === "pause") waPause(); if (a === "stop") waStop();
        if (a === "next") waPlay(WA.cur + 1); if (a === "prev") waPlay(WA.cur - 1);
      });
    });
    var vol = q(".wa-vol"); vol.value = Math.round(WA.vol * 100);
    vol.addEventListener("input", function () { WA.vol = vol.value / 100; ls("mentosVol", String(WA.vol)); if (YT_P && ytReady) YT_P.setVolume(Math.round(WA.vol * 100)); if (WA.master) WA.master.gain.value = WA.vol; else M.audio.volume = WA.vol; });
    var sk = q(".wa-skin"); sk.value = waEl.getAttribute("data-skin");
    sk.addEventListener("change", function () { waEl.setAttribute("data-skin", sk.value); ls("mentosWaSkin", sk.value); });
    q(".wa-seek").addEventListener("input", function (e) {
      var s = SONGS[WA.cur];
      if (s.mp3 && M.audio.duration) M.audio.currentTime = e.target.value / 1000 * M.audio.duration;
      if (s.yt && YT_P && ytReady && YT_P.getDuration()) YT_P.seekTo(e.target.value / 1000 * YT_P.getDuration(), true);
    });
    SONGS.forEach(function (s, i) {
      var b = el("button"); b.type = "button"; b.setAttribute("role", "listitem"); b.textContent = (i + 1) + ". " + s.title;
      b.addEventListener("click", function () { waPlay(i); }); q(".wa-pl").appendChild(b);
    });
    // drag by the title bar
    var t = q(".wa-title");
    t.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button")) return;
      var r = waEl.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
      try { t.setPointerCapture(e.pointerId); } catch (er) {}
      function mv(ev) { waEl.style.left = Math.max(0, Math.min(innerWidth - 60, ev.clientX - ox)) + "px"; waEl.style.top = Math.max(0, Math.min(innerHeight - 30, ev.clientY - oy)) + "px"; waEl.style.right = waEl.style.bottom = "auto"; }
      function up() { t.removeEventListener("pointermove", mv); t.removeEventListener("pointerup", up); }
      t.addEventListener("pointermove", mv); t.addEventListener("pointerup", up);
    });
    waDraw(); waLoop();
  }
  function waDraw() {
    if (!waEl) return;
    var s = SONGS[WA.cur];
    waEl.querySelector(".wa-marq span").textContent = (WA.cur + 1) + ". " + s.title + " *** " + (WA.playing ? "now playing" : "paused") + " *** ";
    waEl.querySelectorAll(".wa-pl button").forEach(function (b, i) { b.setAttribute("aria-current", String(i === WA.cur)); });
  }
  function waLoop() {
    var cv = waEl.querySelector(".wa-vis"), g = cv.getContext("2d"), data = new Uint8Array(32), tm = waEl.querySelector(".wa-time"), seek = waEl.querySelector(".wa-seek");
    (function f() {
      requestAnimationFrame(f);
      if (waEl.hidden) return;
      var s = SONGS[WA.cur], yt = s.yt && YT_P && ytReady;
      var sec = s.mp3 ? M.audio.currentTime : s.yt ? (yt ? YT_P.getCurrentTime() || 0 : 0) : WA.playing && WA.ctx ? WA.ctx.currentTime - WA.chipStart : 0;
      tm.textContent = String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(Math.floor(sec % 60)).padStart(2, "0");
      if (s.mp3 && M.audio.duration && document.activeElement !== seek) seek.value = Math.round(M.audio.currentTime / M.audio.duration * 1000);
      if (s.yt) { if (yt && YT_P.getDuration() && document.activeElement !== seek) seek.value = Math.round(sec / YT_P.getDuration() * 1000); }
      else if (!s.mp3) seek.value = Math.round((WA.step % (s.prog.length * 16 * 2)) / (s.prog.length * 16 * 2) * 1000);
      g.clearRect(0, 0, cv.width, cv.height);
      if (s.yt && WA.playing) { for (var k = 0; k < data.length; k++) data[k] = 90 + Math.random() * 150 * (1 - k / 32); } // youtube audio can't be read, so the bars just dance
      else if (WA.an && WA.playing) WA.an.getByteFrequencyData(data); else data.fill(0);
      for (var i = 0; i < 19; i++) {
        var h = Math.round(data[i + 1] / 255 * cv.height);
        for (var y = 0; y < h; y++) { g.fillStyle = y > cv.height * .75 ? "#ff3b3b" : y > cv.height * .45 ? "#ffd500" : "#00e000"; g.fillRect(i * 2, cv.height - 1 - y, 1, 1); }
      }
    })();
  }
  window.MENTOS_WINAMP = {
    toggle: function () {
      if (!waEl) waBuild();
      if (waEl.hidden) { waEl.hidden = false; if (!WA.playing) waPlay(); return; }
      if (WA.playing) waPause(); else waPlay();
    }
  };

  /* =====================================================================
     WEBRING: add a friend by giving them a url
     ===================================================================== */
  var RING = [
    { name: "Mentos", url: "https://mentoxs.github.io/", me: true },
    { name: "Kiko", url: "" },
    { name: "Strapko", url: "" },
    { name: "Samo", url: "" }
  ];
  function buildRing() {
    var r = $("#webring"); if (!r) return;
    r.innerHTML = '<button type="button" data-g="-1">&#9664; prev</button><span class="rt">&#10022; <b>y2k friends</b> webring &#10022;</span><button type="button" data-g="r">random</button><button type="button" data-g="1">next &#9654;</button><div class="members"></div>';
    var mem = r.querySelector(".members");
    RING.forEach(function (m, i) {
      if (i) mem.appendChild(document.createTextNode(" • "));
      var a = el(m.url && !m.me ? "a" : "span", m.url ? "" : "soon"); a.textContent = m.name + (m.me ? " (u are here)" : m.url ? "" : " (soon)");
      if (m.url && !m.me) a.href = m.url;
      mem.appendChild(a);
    });
    mem.appendChild(document.createTextNode(" • "));
    var join = el("a"); join.textContent = "join the ring?"; join.href = "#discord"; mem.appendChild(join);
    r.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        var live = RING.filter(function (m) { return m.url && !m.me; });
        if (!live.length) { M.popup({ type: "info", title: "webring.exe", html: "nobody else in the ring has a site yet... tell <b>Kiko</b> and <b>Strapko</b> 2 make one!!", center: true, focus: true }); blip("error"); return; }
        var g = b.getAttribute("data-g"), me = RING.findIndex(function (m) { return m.me; }), pick;
        if (g === "r") pick = live[(Math.random() * live.length) | 0];
        else { var k = me; do { k = (k + +g + RING.length) % RING.length; } while (!RING[k].url || RING[k].me); pick = RING[k]; }
        location.href = pick.url;
      });
    });
  }

  /* =====================================================================
     PHOTO BOOTH: webcam -> 16x16 pixel glitch sticker (camera only after u click)
     ===================================================================== */
  var booth = null, stream = null, frozen = null, liveT = 0;
  function stopCam() { cancelAnimationFrame(liveT); if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
  function pixelize(video, out) {
    var s = document.createElement("canvas"); s.width = s.height = 16;
    var g = s.getContext("2d"), vw = video.videoWidth, vh = video.videoHeight, side = Math.min(vw, vh);
    g.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, 16, 16);
    var img = g.getImageData(0, 0, 16, 16), d = img.data, copy = new Uint8ClampedArray(d);
    for (var i = 0; i < d.length; i += 4) {
      for (var k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 64) * 64 + 20; // posterize
      d[i] = copy[Math.max(0, i - 4)]; // red channel shifted 1px = rgb glitch
    }
    var row = (Math.random() * 16) | 0; // one glitchy scanline
    for (var x = 15; x > 0; x--) for (var k2 = 0; k2 < 3; k2++) d[(row * 16 + x) * 4 + k2] = d[(row * 16 + x - 1) * 4 + k2];
    g.putImageData(img, 0, 0);
    if (out) { var o = out.getContext("2d"); o.imageSmoothingEnabled = false; o.clearRect(0, 0, out.width, out.height); o.drawImage(s, 0, 0, out.width, out.height); }
    return s;
  }
  function openBooth() {
    if (!ls("mentosName")) { M.popup({ type: "info", title: "photo_booth.exe", html: "sign the guestbook first, then u can make a photo sticker", center: true, focus: true }); return; }
    if (ls("mentosStuck") === "1") { M.popup({ type: "info", title: "photo_booth.exe", html: "u already left ur 1 sticker on the wall <3", center: true, focus: true }); return; }
    if (!booth) {
      booth = el("div", "booth");
      booth.innerHTML = '<div class="win" role="dialog" aria-label="Photo booth"><div class="bar"><span>photo_booth.exe</span><button type="button" class="xpbtn" data-b="close">close</button></div><div class="bd">' +
        '<p>ur webcam pic gets squished into a tiny <b>16x16 glitch sticker</b> that goes on the <b>public</b> visitor wall. the camera only turns on when u click below, and nothing is saved until u place the sticker.</p>' +
        '<canvas width="160" height="160" aria-label="Sticker preview"></canvas><video playsinline muted hidden></video>' +
        '<div class="row"><button type="button" class="btn" data-b="cam">turn on camera</button><button type="button" class="btn" data-b="snap" hidden>snap!</button><button type="button" class="btn white" data-b="retake" hidden>retake</button><button type="button" class="btn yellow" data-b="use" hidden>use as sticker</button></div>' +
        '<p class="note" role="status"></p></div></div>';
      document.body.appendChild(booth);
      var q = function (s) { return booth.querySelector(s); }, video = q("video"), cv = q("canvas"), note = q(".note");
      var show = function (names) { ["cam", "snap", "retake", "use"].forEach(function (n) { q('[data-b="' + n + '"]').hidden = names.indexOf(n) < 0; }); };
      function live() { if (video.readyState >= 2) pixelize(video, cv); liveT = requestAnimationFrame(live); }
      booth.addEventListener("click", function (e) {
        var b = e.target.closest("[data-b]"); if (!b) return;
        var k = b.getAttribute("data-b");
        if (k === "close") { stopCam(); booth.hidden = true; }
        if (k === "cam") {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { note.textContent = "ur browser doesn't do webcams, sorry"; return; }
          note.textContent = "ur browser will ask 4 permission...";
          navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320 }, audio: false }).then(function (st) {
            stream = st; video.srcObject = st; video.play(); note.textContent = "smile!! (or make a scary face)"; show(["snap"]); live();
          }).catch(function () { note.textContent = "no camera access, so no photo sticker. u can still use the pixel stickers!"; });
        }
        if (k === "snap") { cancelAnimationFrame(liveT); frozen = pixelize(video, cv); blip("stamp"); show(["retake", "use"]); note.textContent = "looking good. use it?"; }
        if (k === "retake") { show(["snap"]); live(); note.textContent = ""; }
        if (k === "use" && frozen) { var url = frozen.toDataURL("image/png"); stopCam(); booth.hidden = true; M.setPhotoSticker(url); }
      });
    }
    booth.hidden = false; frozen = null;
    booth.querySelectorAll("[data-b]").forEach(function (b) { var k = b.getAttribute("data-b"); if (k !== "close") b.hidden = k !== "cam"; });
    var cv2 = booth.querySelector("canvas"); cv2.getContext("2d").clearRect(0, 0, cv2.width, cv2.height);
    booth.querySelector(".note").textContent = "";
  }
  window.MENTOS_BOOTH = { open: openBooth };

  /* ---------------- start ---------------- */
  buildPet();
  renderProfile(); setInterval(renderProfile, 3000);
  buildRing();
})();
