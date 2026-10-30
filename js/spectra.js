// SPECTRA page effects: rainbow dust particles, typed tagline, security-cam clock, parallax, scroll reveals,
// tilt cards, look switcher, lightbox, cursor sparkles and a little easter egg (type "dash").
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var RAIN = ["#ee4136", "#f38433", "#fdec58", "#67ba4f", "#2896dc", "#9646c8", "#ff8fc8"];

  // ---- floating rainbow dust
  var cv = document.getElementById("fx"), ctx = cv.getContext("2d"), W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  var dots = [];
  function size() { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size(); addEventListener("resize", size);
  var N = reduce ? 0 : Math.round(Math.min(90, W / 14));
  for (var i = 0; i < N; i++) dots.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.2 + .6, v: Math.random() * .35 + .1, w: Math.random() * 6.28, c: RAIN[i % RAIN.length], a: Math.random() * .5 + .25 });
  var mx = W / 2, my = H / 2;
  addEventListener("pointermove", function (e) { mx = e.clientX; my = e.clientY; });
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      d.y -= d.v; d.x += Math.sin(t / 1400 + d.w) * .3;
      var dx = d.x - mx, dy = d.y - my, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 110) { d.x += dx / dist * 1.4; d.y += dy / dist * 1.4; }
      if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; }
      ctx.globalAlpha = d.a * (.6 + .4 * Math.sin(t / 500 + d.w));
      ctx.fillStyle = d.c; ctx.shadowColor = d.c; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    if (N) requestAnimationFrame(draw);
  }
  if (N) requestAnimationFrame(draw);

  // ---- typed tagline
  var ty = document.querySelector(".type");
  if (ty) {
    var full = ty.getAttribute("data-text"), k = 0;
    if (reduce) ty.textContent = full;
    else setTimeout(function step() { ty.textContent = full.slice(0, ++k); if (k < full.length) setTimeout(step, 45 + Math.random() * 70); }, 900);
  }

  // ---- security-cam clock (time keeps ticking from 03:47:12, the cam label cycles)
  var clock = document.getElementById("camClock"), camL = document.getElementById("camLabel");
  var secs = 3 * 3600 + 47 * 60 + 12, cams = ["CAM 04 &bull; RAINBOW FACILITY", "CAM 02 &bull; UPPER CORRIDOR", "CAM 07 &bull; SPECTRA ROOM", "CAM 05 &bull; CATWALKS"], ci = 0;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  setInterval(function () {
    secs++;
    if (clock) clock.innerHTML = "OCT 28 1010 &nbsp; " + pad(Math.floor(secs / 3600) % 24) + ":" + pad(Math.floor(secs / 60) % 60) + ":" + pad(secs % 60);
    if (camL && secs % 6 === 0) { ci = (ci + 1) % cams.length; camL.innerHTML = "CWC SECURITY &bull; " + cams[ci]; }
  }, 1000);

  // ---- the pony peeking in at the corner of the hero
  var peek = document.querySelector(".peek");
  if (peek) setTimeout(function () { peek.classList.add("in"); }, 1800);

  // ---- parallax
  var par = [].slice.call(document.querySelectorAll("[data-par]"));
  function onScroll() {
    var y = scrollY;
    for (var i = 0; i < par.length; i++) {
      var el = par[i], f = parseFloat(el.getAttribute("data-par"));
      var r = el.getBoundingClientRect(), mid = r.top + r.height / 2 - innerHeight / 2;
      el.style.transform = "translateY(" + (el.classList.contains("hero-img") ? y * f : mid * f) + "px)";
    }
  }
  if (!reduce) { addEventListener("scroll", onScroll, { passive: true }); onScroll(); }

  // ---- reveal on scroll
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: .12 }) : null;
  [].forEach.call(document.querySelectorAll(".reveal"), function (el) { io ? io.observe(el) : el.classList.add("in"); });

  // the flyover only plays while it's on screen
  var fly = document.getElementById("fly");
  if (fly && "IntersectionObserver" in window) new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting && !reduce) fly.play().catch(function () {}); else fly.pause(); });
  }, { threshold: .3 }).observe(fly);

  // ---- 3D tilt on shop cards
  [].forEach.call(document.querySelectorAll(".tilt"), function (c) {
    if (reduce) return;
    c.addEventListener("pointermove", function (e) {
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = "rotateY(" + x * 16 + "deg) rotateX(" + -y * 16 + "deg) translateZ(10px)";
    });
    c.addEventListener("pointerleave", function () { c.style.transform = ""; });
  });

  // ---- pony creator look switcher
  var big = document.getElementById("crPony");
  [].forEach.call(document.querySelectorAll(".swatches button"), function (b) {
    b.addEventListener("click", function () {
      if (b.classList.contains("on")) return;
      [].forEach.call(document.querySelectorAll(".swatches button"), function (o) { o.classList.remove("on"); });
      b.classList.add("on");
      big.classList.add("swap");
      setTimeout(function () {
        big.src = b.getAttribute("data-img"); big.alt = b.getAttribute("data-alt");
        big.onload = function () { big.classList.remove("swap"); };
      }, 220);
      burst(b.getBoundingClientRect().left + 20, b.getBoundingClientRect().top + 20, 18);
    });
  });

  // ---- lightbox for the tapes
  var lb = document.getElementById("lb"), lbImg = lb.querySelector("img");
  [].forEach.call(document.querySelectorAll(".tape"), function (t) {
    t.addEventListener("click", function () { lbImg.src = t.getAttribute("data-full"); lbImg.alt = t.querySelector("img").alt; lb.hidden = false; });
  });
  function closeLb() { lb.hidden = true; }
  lb.addEventListener("click", closeLb);
  addEventListener("keydown", function (e) { if (e.key === "Escape") closeLb(); });

  // ---- cursor sparkles
  function burst(x, y, n) {
    if (reduce) return;
    for (var i = 0; i < n; i++) {
      var s = document.createElement("i"); s.className = "spark";
      var a = Math.random() * 6.283, d = 20 + Math.random() * 50;
      s.style.left = x + "px"; s.style.top = y + "px"; s.style.background = RAIN[i % RAIN.length];
      s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d + "px");
      document.body.appendChild(s); setTimeout(function (el) { el.remove(); }.bind(null, s), 800);
    }
  }
  var last = 0;
  addEventListener("pointermove", function (e) { var t = performance.now(); if (t - last > 60) { last = t; burst(e.clientX, e.clientY, 1); } });
  addEventListener("click", function (e) { burst(e.clientX, e.clientY, 10); });

  // ---- easter egg: type "dash"
  var typed = "", jump = document.getElementById("jump");
  addEventListener("keydown", function (e) {
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-4);
    if (typed === "dash" && !reduce) {
      jump.hidden = false;
      setTimeout(function () { jump.hidden = true; }, 900);
    }
  });
})();
