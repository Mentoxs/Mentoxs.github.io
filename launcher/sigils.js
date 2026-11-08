// Cyber sigils: spiky, symmetric, chrome "neo-tribal" marks drawn as SVG.
// Each sigil is made of tapered curved thorns (with little barbs), mirrored left/right,
// from a seeded random generator - the same seed always gives the same sigil.
(function (root) {
  'use strict';

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }
  const f = n => Math.round(n * 10) / 10;

  // a tapered curved spike from (x0,y0) to the tip (x1,y1); bend = sideways bulge, w = base width
  function thorn(x0, y0, x1, y1, bend, w) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const mx = (x0 + x1) / 2 + nx * bend, my = (y0 + y1) / 2 + ny * bend;
    const lx = x0 + nx * w / 2, ly = y0 + ny * w / 2, rx = x0 - nx * w / 2, ry = y0 - ny * w / 2;
    return `M${f(lx)} ${f(ly)}Q${f(mx + nx * w * .32)} ${f(my + ny * w * .32)} ${f(x1)} ${f(y1)}Q${f(mx - nx * w * .32)} ${f(my - ny * w * .32)} ${f(rx)} ${f(ry)}Z`;
  }
  // point at t along the curved centre line of a thorn
  function along(x0, y0, x1, y1, bend, t) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const mx = (x0 + x1) / 2 + nx * bend, my = (y0 + y1) / 2 + ny * bend;
    const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    return [a * x0 + b * mx + c * x1, a * y0 + b * my + c * y1, dx / L, dy / L];
  }

  /// Builds the path data for one sigil (viewBox -100 -100 200 200).
  function build(seed, style) {
    const R = rng(seed * 7919 + 13);
    const parts = [];
    const add = (x0, y0, x1, y1, bend, w, barbs, mirror) => {
      const one = (sx) => {
        parts.push(thorn(x0 * sx, y0, x1 * sx, y1, bend * sx, w * 1.6));
        for (let i = 0; i < barbs; i++) {
          const t = .25 + R() * .6;
          const [px, py, ux, uy] = along(x0 * sx, y0, x1 * sx, y1, bend * sx, t);
          const side = R() < .5 ? 1 : -1;
          const len = (8 + R() * 16) * (1 - t * .5);
          const ang = Math.atan2(uy, ux) + side * (.6 + R() * .7);
          parts.push(thorn(px, py, px + Math.cos(ang) * len * 1.2, py + Math.sin(ang) * len * 1.2, side * len * .3, w * .8));
        }
      };
      one(1); if (mirror && Math.abs(x0) + Math.abs(x1) > .5) one(-1);
    };
    // spine: long up and down spikes
    add(0, 4, 0, -92 + R() * 10, 0, 7, 2, false);
    add(0, -4, 0, 96 - R() * 12, 0, 6, 2, false);
    // a small diamond core
    parts.push(`M0 -14L7 0L0 14L-7 0Z`);
    const horns = style % 3;
    if (horns === 0) {
      // cross arms + big curved horns sweeping up (bat/crown)
      add(4, 0, 62 + R() * 18, -4 + R() * 8, -6, 6, 2, true);
      add(6, -6, 70 + R() * 15, -70 - R() * 15, 20 + R() * 14, 6, 3, true);
      add(8, 8, 46 + R() * 12, 70 + R() * 14, -12, 5, 2, true);
    } else if (horns === 1) {
      // star: four short diagonal blades + long thin arms
      add(4, 0, 88, 0, 0, 5, 2, true);
      for (const a of [-.75, .75]) add(4, a * 6, 46, a * 46, a * 8, 5, 1, true);
      add(6, -10, 30 + R() * 10, -78, 18, 4, 2, true);
    } else {
      // horned crown: arcs that hook back in, with hanging spikes
      add(6, -4, 74 + R() * 12, -40 - R() * 20, 36 + R() * 10, 6, 3, true);
      add(70, -36, 56, 40 + R() * 25, 14, 4, 1, true);
      add(8, 10, 30 + R() * 10, 86, -10, 4, 2, true);
      add(4, 0, 50, 6, -8, 5, 1, true);
    }
    // a few extra loose thorns for an organic, hand-inked look
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (R() - .5) * 2.6, r0 = 10 + R() * 14, r1 = 40 + R() * 35;
      add(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1, (R() - .5) * 20, 3.5, 1, true);
    }
    // ink drops
    const dots = [];
    for (let i = 0; i < 6; i++) {
      const x = (R() - .5) * 150, y = (R() - .5) * 170, r = .8 + R() * 1.8;
      dots.push(`M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0Z`, `M${f(-x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0Z`);
    }
    return { d: parts.join(''), dots: dots.join('') };
  }

  let uid = 0;
  /// An SVG string. opts: { seed, style, chrome: true|false, glow: true|false, cls }
  function svg(opts) {
    opts = opts || {};
    const seed = opts.seed || 1, style = opts.style == null ? seed : opts.style;
    const { d, dots } = build(seed, style);
    const id = 'sg' + (++uid);
    const fill = opts.chrome === false ? (opts.color || '#fff') : `url(#${id}c)`;
    return `<svg class="sigil ${opts.cls || ''}" viewBox="-100 -100 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<defs><linearGradient id="${id}c" x1="0" y1="-1" x2=".35" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".28" stop-color="#bfc3cc"/><stop offset=".45" stop-color="#fff"/><stop offset=".55" stop-color="#5d6068"/><stop offset=".72" stop-color="#e8eaf0"/><stop offset="1" stop-color="#8b8f99"/></linearGradient>` +
      (opts.glow ? `<filter id="${id}g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : '') +
      `</defs><g ${opts.glow ? `filter="url(#${id}g)"` : ''}><path class="sg-body" d="${d}" fill="${fill}"/><path class="sg-dots" d="${dots}" fill="${fill}"/></g></svg>`;
  }

  root.Sigils = { svg, build, count: 6 };
})(typeof window !== 'undefined' ? window : globalThis);
