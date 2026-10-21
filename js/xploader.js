// fake windows xp "installing..." screen while a 3D game loads. the game calls XPLOAD.done() when it's ready.
(function () {
  "use strict";
  var box = document.getElementById("xpload"); if (!box) return;
  var bar = box.querySelector(".xp-bar i"), msg = box.querySelector(".xp-msg"), pct = 0, t0 = Date.now(), finished = false;
  var MSGS = (box.getAttribute("data-msgs") || "").split("|").filter(Boolean);
  if (!MSGS.length) MSGS = ["Copying files...", "Please wait..."];
  var i = 0;
  var tick = setInterval(function () {
    if (!finished) pct = Math.min(92, pct + Math.random() * 9);
    bar.style.width = pct + "%";
    if (Math.random() < .5) { msg.textContent = MSGS[i % MSGS.length]; i++; }
    if (!finished && Date.now() - t0 > 15000) msg.textContent = "this is taking 4ever... (ur browser needs WebGL 4 3D games)";
  }, 260);
  window.XPLOAD = {
    done: function () {
      if (finished) return; finished = true;
      var wait = Math.max(0, 1400 - (Date.now() - t0)); // show it at least a moment, it's part of the fun
      setTimeout(function () {
        pct = 100; bar.style.width = "100%"; msg.textContent = "Installation complete!";
        setTimeout(function () { clearInterval(tick); box.classList.add("gone"); setTimeout(function () { box.remove(); }, 400); }, 450);
      }, wait);
    }
  };
})();
