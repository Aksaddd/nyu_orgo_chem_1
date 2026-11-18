// CHEM 225 · view3d: ball-and-stick models on a canvas, and the computed ring flip of cyclohexane.
// Adds ORGO.view3d and the token handler "view3d" ([[view3d:cyclohexane-chair]]).
// Models come from ORGO.data.conf[name] = {a: [[element, x, y, z]], b: [[i, j, order]], title}, in angstroms.
(() => {
  "use strict";
  const ORGO = window.ORGO = window.ORGO || {};
  const V = ORGO.view3d = {};
  const el = (...a) => ORGO.el(...a);

  const COLOR = { C: "#3b3b40", H: "#f2f2f2", O: "#e03131", N: "#2f6fe0", S: "#e8c21a", F: "#5fbf5f", Cl: "#2f9e44", Br: "#8b5a2b", I: "#7b3fa0", Li: "#8f86ad", Mg: "#8f86ad" };
  const RAD = { H: 0.28, C: 0.42, N: 0.4, O: 0.4, F: 0.36, Cl: 0.55, Br: 0.62, I: 0.72, S: 0.55, Li: 0.5, Mg: 0.6 };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (h, to, k) => { const c = hex(h); return "rgb(" + c.map(v => Math.round(v + (to - v) * k)).join(",") + ")" };
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const START = { yaw: 0.55, pitch: 0.35 };

  // ------------------------------------------------------------------ the viewer
  // src: {title, atoms: [{e, x, y, z, col, tag}], bonds: [[i, j, order]], ext}
  function viewer(host, opts) {
    opts = opts || {};
    const height = opts.height || 300, id = "v3d" + Math.floor(Math.random() * 1e9);
    const canvas = el("canvas", { class: "v3d-canvas", tabindex: "0", role: "img", "aria-describedby": id, style: { height: height + "px" } });
    const help = el("p", { class: "small muted v3d-help", id }, "Drag to turn it, wheel or pinch to zoom. With the model selected, the arrow keys turn it and the plus and minus keys zoom.");
    const labelBtn = el("button", { class: "btn small", type: "button", "aria-pressed": "false" }, "Labels");
    const resetBtn = el("button", { class: "btn small", type: "button" }, "Reset");
    const wrap = el("div", { class: "v3d" }, canvas, el("div", { class: "btn-row v3d-bar" }, resetBtn, labelBtn), help);
    host.appendChild(wrap);
    const ctx = canvas.getContext("2d");
    let src = null, yaw = opts.yaw != null ? opts.yaw : START.yaw, pitch = opts.pitch != null ? opts.pitch : START.pitch, zoom = 1, labels = !!opts.labels, spin = !!opts.spin && !ORGO.reduced;
    let W = 0, H = 0, dpr = 1, down = false, ext = 2, raf = 0, last = 0;
    labelBtn.setAttribute("aria-pressed", String(labels));
    const startYaw = yaw, startPitch = pitch;

    function size() {
      const w = canvas.clientWidth, h = canvas.clientHeight; dpr = window.devicePixelRatio || 1;
      if (!w || !h) return false;
      if (w !== W || h !== H || canvas.width !== Math.round(w * dpr)) { W = w; H = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr) }
      return true;
    }
    function draw() {
      if (!size()) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      if (!src) return;
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), D = ext * 5, S = Math.min(W, H) / 2 * 0.86 / (ext * 1.25) * zoom;
      const P = src.atoms.map(a => { const x1 = a.x * cy + a.z * sy, z1 = -a.x * sy + a.z * cy, y2 = a.y * cp - z1 * sp, z2 = a.y * sp + z1 * cp, f = D / Math.max(D - z2, 0.2);
        return { a, z: z2, f, x: W / 2 + S * x1 * f, y: H / 2 - S * y2 * f, r: (RAD[a.e] || 0.4) * S * f } });
      const items = P.map(p => ({ z: p.z, atom: p }));
      src.bonds.forEach(b => { const p = P[b[0]], q = P[b[1]]; if (p && q) items.push({ z: (p.z + q.z) / 2 - 0.001, bond: [p, q, b[2] || 1] }) });
      items.sort((u, v) => u.z - v.z);
      ctx.lineCap = "round"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const it of items) {
        if (it.bond) {
          const [p, q, o] = it.bond, f = (p.f + q.f) / 2, w = 0.2 * S * f, dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
          const offs = o >= 3 ? [-1.6, 0, 1.6] : o === 2 ? [-0.9, 0.9] : [0];
          offs.forEach(k => { const ox = nx * k * w, oy = ny * k * w; ctx.beginPath(); ctx.moveTo(p.x + ox, p.y + oy); ctx.lineTo(q.x + ox, q.y + oy); ctx.strokeStyle = "#1c1c1e"; ctx.lineWidth = w + 2; ctx.stroke();
            ctx.strokeStyle = "#a8a8ae"; ctx.lineWidth = w; ctx.stroke() });
        } else {
          const p = it.atom, base = p.a.col || COLOR[p.a.e] || "#888888", g = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.1, p.x, p.y, p.r);
          g.addColorStop(0, mix(base, 255, 0.55)); g.addColorStop(0.6, base); g.addColorStop(1, mix(base, 0, 0.3));
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "#1c1c1e"; ctx.lineWidth = 1.5; ctx.stroke();
          if (labels && p.a.e !== "H") text(p.a.e, p.x, p.y, Math.max(10, p.r * 1.1), p.a.e === "S" || p.a.e === "F" ? "#111" : "#fff", p.a.e === "S" || p.a.e === "F" ? "rgba(255,255,255,.85)" : "rgba(0,0,0,.85)");
          if (p.a.tag) text(p.a.tag, p.x + p.r + 7, p.y - p.r * 0.7, 14, "#fff", "rgba(0,0,0,.9)");
        }
      }
    }
    function text(t, x, y, px, fill, halo) { ctx.font = "700 " + Math.round(px) + "px system-ui, sans-serif"; ctx.lineJoin = "round"; ctx.lineWidth = 3.5; ctx.strokeStyle = halo; ctx.strokeText(t, x, y); ctx.fillStyle = fill; ctx.fillText(t, x, y) }

    function set(s) {
      src = s; let m = 1; (s.atoms || []).forEach(a => { m = Math.max(m, Math.hypot(a.x, a.y, a.z) + 0.5) }); ext = s.ext || m;
      canvas.setAttribute("aria-label", (s.title || "Molecule") + ", a 3D model you can turn. " + s.atoms.length + " atoms."); draw();
    }
    function reset() { yaw = startYaw; pitch = startPitch; zoom = 1; draw() }
    function loop(ts) {
      raf = 0; if (!canvas.isConnected) return;
      if (spin && !down && !document.hidden) { yaw += (ts - last) * 0.0006; draw() } last = ts; raf = requestAnimationFrame(loop);
    }
    resetBtn.addEventListener("click", reset);
    labelBtn.addEventListener("click", () => { labels = !labels; labelBtn.setAttribute("aria-pressed", String(labels)); draw() });
    // pointers: one turns, two pinch
    const ptr = new Map(); let pinch = 0;
    const dist = () => { const p = [...ptr.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) };
    canvas.addEventListener("pointerdown", e => { canvas.focus({ preventScroll: true }); try { canvas.setPointerCapture(e.pointerId) } catch (x) { } ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = true; if (ptr.size === 2) pinch = dist(); e.preventDefault() });
    canvas.addEventListener("pointermove", e => {
      const p = ptr.get(e.pointerId); if (!p) return;
      if (ptr.size === 1) { yaw += (e.clientX - p.x) * 0.01; pitch += (e.clientY - p.y) * 0.01; p.x = e.clientX; p.y = e.clientY }
      else { p.x = e.clientX; p.y = e.clientY; const d = dist(); if (pinch) zoom = clamp(zoom * d / pinch, 0.4, 4); pinch = d }
      draw();
    });
    const up = e => { ptr.delete(e.pointerId); pinch = 0; if (!ptr.size) down = false };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", e => { e.preventDefault(); zoom = clamp(zoom * Math.exp(-e.deltaY * 0.0015), 0.4, 4); draw() }, { passive: false });
    canvas.addEventListener("keydown", e => {
      const k = e.key; let used = true;
      if (k === "ArrowLeft") yaw -= 0.12; else if (k === "ArrowRight") yaw += 0.12; else if (k === "ArrowUp") pitch -= 0.12; else if (k === "ArrowDown") pitch += 0.12;
      else if (k === "+" || k === "=") zoom = clamp(zoom * 1.15, 0.4, 4); else if (k === "-" || k === "_") zoom = clamp(zoom / 1.15, 0.4, 4); else used = false;
      if (used) { e.preventDefault(); draw() }
    });
    if (window.ResizeObserver) new ResizeObserver(draw).observe(canvas); else window.addEventListener("resize", draw);
    if (spin) raf = requestAnimationFrame(t => { last = t; loop(t) });
    return { el: wrap, canvas, set, redraw: draw, reset, get yaw() { return yaw }, get pitch() { return pitch }, get zoom() { return zoom } };
  }

  // ------------------------------------------------------------------ mount: a stored model
  V.mount = (host, model, opts) => {
    opts = opts || {}; host.textContent = "";
    const v = viewer(host, opts), name = typeof model === "string" ? model : null;
    const build = m => ({ title: m.title || name || "Molecule", atoms: m.a.map(r => ({ e: r[0], x: r[1], y: r[2], z: r[3] })), bonds: m.b });
    if (model && typeof model === "object") v.set(build(model));
    else {
      const note = el("p", { class: "small muted" }, "Loading the model.");
      host.insertBefore(note, host.firstChild);
      Promise.resolve(ORGO.need ? ORGO.need("conf") : null).then(() => {
        const m = ORGO.data.conf && ORGO.data.conf[name];
        if (!m) { note.textContent = "There is no 3D model called " + name + " in this class."; return }
        note.remove(); v.set(build(m));
      }).catch(() => { note.textContent = "The 3D models could not be loaded." });
    }
    return v;
  };
  ORGO.tokens = ORGO.tokens || {};
  ORGO.tokens.view3d = arg => { const d = el("div", { class: "v3d-token" }); V.mount(d, String(arg).trim(), { height: 280 }); return d };

  // ------------------------------------------------------------------ the ring flip, computed
  const R = 1.45, HH = 0.25, CH = 1.09, ANG = 54.75 * Math.PI / 180;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = a => Math.hypot(a[0], a[1], a[2]), unit = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l] };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  function ring(t) {
    const C = []; for (let i = 0; i < 6; i++) { const th = Math.PI / 3 * i; C.push([R * Math.cos(th), R * Math.sin(th), HH * ((i % 2 ? -1 : 1) * Math.cos(Math.PI * t) + 0.9 * Math.sin(Math.PI * t) * Math.cos(2 * Math.PI * i / 3 + Math.PI / 6))]) }
    const Hs = [];
    for (let i = 0; i < 6; i++) {
      const c = C[i], u1 = unit(sub(C[(i + 5) % 6], c)), u2 = unit(sub(C[(i + 1) % 6], c)), s = [u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]], b = unit(s).map(v => -v), n = unit(cross(u1, u2));
      [1, -1].forEach(sg => Hs.push([c[0] + CH * (Math.cos(ANG) * b[0] + sg * Math.sin(ANG) * n[0]), c[1] + CH * (Math.cos(ANG) * b[1] + sg * Math.sin(ANG) * n[1]), c[2] + CH * (Math.cos(ANG) * b[2] + sg * Math.sin(ANG) * n[2])]));
    }
    return { C, Hs };
  }
  const f0 = ring(0), AX0 = f0.Hs.map((h, k) => { const i = k >> 1, dz = h[2] - f0.C[i][2], carbonUp = f0.C[i][2] > 0; return carbonUp ? dz > 0 : dz < 0 });   // axial at t = 0
  const BONDS = []; for (let i = 0; i < 6; i++) { BONDS.push([i, (i + 1) % 6, 1], [i, 6 + 2 * i, 1], [i, 7 + 2 * i, 1]) }
  const stage = t => t < 0.08 ? "chair" : t < 0.38 ? "half-chair" : t < 0.62 ? "twist-boat" : t < 0.92 ? "half-chair" : "chair";
  const ORANGE = "#e8590c", BLUE = "#1c7ed6";

  V.flip = host => {
    host.textContent = "";
    const box = el("div", { class: "v3d-flip stack" }); host.appendChild(box);
    const slot = el("div"), id = "flip" + Math.floor(Math.random() * 1e9);
    const slider = el("input", { type: "range", min: "0", max: "100", step: "1", value: "0", id, class: "v3d-slider" });
    const play = el("button", { class: "btn small primary", type: "button" }, "Play once");
    const cap = el("p", { class: "v3d-caption", "aria-live": "polite" });
    box.append(slot, el("div", { class: "v3d-flip-ctl" }, el("label", { for: id }, "Chair to chair"), slider, play), cap,
      el("p", { class: "small muted" }, "Orange hydrogens start axial and blue ones start equatorial. The letters a and e name the position when the ring is a chair. Watch every orange hydrogen end up equatorial and every blue one axial."));
    const v = viewer(slot, { height: 320, yaw: 0.35, pitch: 1.15 });
    let t = 0, timer = 0;
    function show() {
      const { C, Hs } = ring(t), atoms = C.map(c => ({ e: "C", x: c[0], y: c[1], z: c[2] }));
      const chairEnd = t < 0.2 || t > 0.8, swapped = t >= 0.5;
      Hs.forEach((h, k) => { const ax = AX0[k]; atoms.push({ e: "H", x: h[0], y: h[1], z: h[2], col: ax ? ORANGE : BLUE, tag: chairEnd ? ((ax !== swapped) ? "a" : "e") : "" }) });
      v.set({ title: "Cyclohexane ring flip, " + stage(t), atoms, bonds: BONDS, ext: 3.1 });
      const s = stage(t), second = t >= 0.5;
      cap.textContent = s === "chair" ? (second ? "Chair (the other one). The orange hydrogens are now equatorial and the blue ones axial." : "Chair. The orange hydrogens are axial and the blue ones equatorial.")
        : s === "half-chair" ? "Half-chair: the highest point on the way, about 10 to 11 kcal/mol above the chair."
        : "Twist-boat: a small valley between the two half-chairs. Bonds here are neither axial nor equatorial.";
      cap.textContent += " The barrier from chair to chair is about 10 to 11 kcal/mol.";
    }
    const stop = () => { if (timer) cancelAnimationFrame(timer); timer = 0; play.textContent = "Play once" };
    slider.addEventListener("input", () => { stop(); t = +slider.value / 100; show() });
    if (ORGO.reduced) { play.disabled = true; play.title = "Playing is off because you asked for less motion. Use the slider." }
    else play.addEventListener("click", () => {
      if (timer) { stop(); return }
      if (t >= 0.995) t = 0; let from = performance.now(), t0 = t; play.textContent = "Stop";
      const step = now => { t = Math.min(1, t0 + (now - from) / 4500 * (1 - t0 > 0 ? 1 : 1)); slider.value = String(Math.round(t * 100)); show(); if (t < 1 && slot.isConnected) timer = requestAnimationFrame(step); else stop() };
      timer = requestAnimationFrame(step);
    });
    show();
    return { el: box, viewer: v, setT: x => { stop(); t = clamp(x, 0, 1); slider.value = String(Math.round(t * 100)); show() } };
  };
})();
