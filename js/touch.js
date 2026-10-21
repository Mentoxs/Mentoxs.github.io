// On-screen phone controls for the 3D games: joystick (WASD), drag the right side 2 look, buttons for actions.
// Buttons: { label, code } = tap key, { label, code, hold: true } = held key, { label, mouse: 0 | 2 } = held mouse button.
export const isTouch = matchMedia("(hover: none)").matches || "ontouchstart" in window;

export function touchControls({ keys, look, buttons, pause }) {
  if (!isTouch) return null;
  const root = document.createElement("div");
  root.className = "touch"; root.hidden = true;
  root.innerHTML = '<div class="lookpad"></div><div class="stick"><i></i></div><div class="tbtns"></div><div class="touch-top"><button type="button">pause</button></div>';
  document.body.appendChild(root);
  const pad = root.querySelector(".lookpad"), stick = root.querySelector(".stick"), knob = stick.querySelector("i");

  // joystick -> WASD
  let sid = null;
  const setDir = (x, y) => {
    keys.KeyW = y < -.35; keys.KeyS = y > .35; keys.KeyA = x < -.35; keys.KeyD = x > .35;
    keys.ShiftLeft = Math.hypot(x, y) > .95; // push all the way = sprint
  };
  const move = (e) => {
    const r = stick.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
    const m = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), a = Math.atan2(dy, dx), x = Math.cos(a) * m, y = Math.sin(a) * m;
    knob.style.transform = `translate(${x * 36}px,${y * 36}px)`; setDir(x, y);
  };
  // preventDefault stops the browser sending fake mouse clicks (which would break blocks / fire lasers)
  stick.addEventListener("pointerdown", (e) => { e.preventDefault(); sid = e.pointerId; try { stick.setPointerCapture(sid); } catch (_) {} move(e); });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === sid) move(e); });
  const stop = () => { sid = null; knob.style.transform = ""; setDir(0, 0); };
  stick.addEventListener("pointerup", stop); stick.addEventListener("pointercancel", stop);

  // drag anywhere on the right side to look around
  let lid = null, lx = 0, ly = 0;
  pad.addEventListener("pointerdown", (e) => { e.preventDefault(); lid = e.pointerId; try { pad.setPointerCapture(lid); } catch (_) {} lx = e.clientX; ly = e.clientY; });
  pad.addEventListener("pointermove", (e) => { if (e.pointerId !== lid) return; look(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY; });
  const lend = () => { lid = null; };
  pad.addEventListener("pointerup", lend); pad.addEventListener("pointercancel", lend);

  const box = root.querySelector(".tbtns");
  buttons.forEach((b) => {
    const el = document.createElement("button"); el.type = "button"; el.textContent = b.label;
    const down = (e) => {
      e.preventDefault(); el.classList.add("on");
      if (b.mouse != null) dispatchEvent(new MouseEvent("mousedown", { button: b.mouse }));
      else if (b.hold) keys[b.code] = true;
      else dispatchEvent(new KeyboardEvent("keydown", { code: b.code, key: b.code.replace("Key", "").toLowerCase() }));
    };
    const up = () => {
      el.classList.remove("on");
      if (b.mouse != null) dispatchEvent(new MouseEvent("mouseup", { button: b.mouse }));
      else if (b.hold) keys[b.code] = false;
    };
    el.addEventListener("pointerdown", down); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("pointerleave", up);
    box.appendChild(el);
  });
  root.querySelector(".touch-top button").addEventListener("click", () => { pause(); });
  return { show: (on) => { root.hidden = !on; } };
}
