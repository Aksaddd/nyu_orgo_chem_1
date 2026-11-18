// CHEM 225 · Newman projections. Adds ORGO.newman and the token handler "newman".
// Spec: "F1,F2,F3|B1,B2,B3|angle". Front groups clockwise from the top. The back carbon is turned by `angle` degrees
// (0 eclipsed, 60 staggered), so the angle is the dihedral angle between F1 and B1.
(() => {
  "use strict";
  const ORGO = window.ORGO = window.ORGO || {};
  const N = ORGO.newman = {};
  const el = (...a) => ORGO.el(...a);
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const f1 = x => Math.round(x * 10) / 10, rad = d => d * Math.PI / 180, norm = d => ((d % 360) + 360) % 360;
  const REV = { CH3: "H3C", CH2CH3: "CH3CH2", "CH(CH3)2": "(CH3)2CH", "C(CH3)3": "(CH3)3C", OH: "HO", OCH3: "CH3O", NH2: "H2N", COOH: "HOOC", CN: "NC", OTs: "TsO", SH: "HS" };
  const textW = (t, fs) => [...t].reduce((w, ch) => w + (/\d/.test(ch) ? 0.42 : /[()]/.test(ch) ? 0.36 : /[a-z]/.test(ch) ? 0.52 : 0.7), 0) * fs;
  function label(g, x, y, anchor, fs, op) {
    const t = anchor === "end" && REV[g] ? REV[g] : String(g); let out = "", down = false;
    t.split(/(\d+)/).forEach(run => {
      if (!run) return;
      if (/^\d+$/.test(run)) { out += `<tspan dy="${down ? 0 : 3}" font-size="${f1(fs * 0.72)}">${run}</tspan>`; down = true }
      else { out += `<tspan dy="${down ? -3 : 0}">${esc(run)}</tspan>`; down = false }
    });
    const w = textW(t, fs), x0 = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    return { html: `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${fs}" fill="currentColor"${op ? ` fill-opacity="${op}"` : ""}>${out}</text>`, box: [x0, y - fs * 0.85, x0 + w, y + fs * 0.35] };
  }
  const parse = spec => { const p = String(spec || "").split("|"), g = s => (s || "H,H,H").split(",").map(x => x.trim() || "H").slice(0, 3), a = parseFloat(p[2]); const F = g(p[0]), B = g(p[1]); while (F.length < 3) F.push("H"); while (B.length < 3) B.push("H"); return { F, B, angle: isFinite(a) ? a : 60 } };

  N.svg = spec => {
    const { F, B, angle } = parse(spec), R = 24, OUT = 46, LAB = 55, fs = 12, box = [-OUT, -OUT, OUT, OUT];
    const xy = (deg, r) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];
    const front = F.map((g, j) => ({ g, a: 120 * j, la: 120 * j })), back = B.map((g, j) => ({ g, a: norm(angle + 120 * j), la: 0 }));
    let eclipsed = false;
    // an eclipsed back bond is drawn a little to one side so both bonds show
    back.forEach(b => {
      b.la = b.a;
      front.forEach(f => { let d = norm(b.a - f.a); if (d > 180) d -= 360; if (Math.abs(d) < 13) { const s = d < 0 ? -1 : 1; eclipsed = true; b.a = f.a + 13 * s; b.la = f.a + 24 * s; f.la = f.a - 9 * s } });
    });
    let h = "";
    const put = (o, r0, isBack) => {
      const p0 = xy(o.a, r0), p1 = xy(o.a, OUT), p2 = xy(o.la, LAB), sx = Math.sin(rad(o.la));
      h += `<line x1="${f1(p0[0])}" y1="${f1(p0[1])}" x2="${f1(p1[0])}" y2="${f1(p1[1])}" stroke="currentColor" stroke-width="${isBack ? 1.5 : 1.9}" stroke-linecap="round"/>`;
      const lb = label(o.g, p2[0], p2[1] + 4, sx > 0.35 ? "start" : sx < -0.35 ? "end" : "middle", fs);
      h += lb.html; box[0] = Math.min(box[0], lb.box[0]); box[1] = Math.min(box[1], lb.box[1]); box[2] = Math.max(box[2], lb.box[2]); box[3] = Math.max(box[3], lb.box[3]);
    };
    back.forEach(b => put(b, R, true));
    h += `<circle cx="0" cy="0" r="${R}" fill="none" stroke="currentColor" stroke-width="1.7"/>`;
    front.forEach(f => put(f, 0, false));
    h += `<circle cx="0" cy="0" r="2.2" fill="currentColor"/>`;
    const a = norm(angle), kind = eclipsed ? "eclipsed" : Math.abs(((a % 120) + 120) % 120 - 60) < 13 ? "staggered" : "between staggered and eclipsed";
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"), p = 6, w = box[2] - box[0] + 2 * p, ht = box[3] - box[1] + 2 * p;
    s.setAttribute("class", "newman-svg"); s.setAttribute("viewBox", `${f1(box[0] - p)} ${f1(box[1] - p)} ${f1(w)} ${f1(ht)}`); s.setAttribute("width", Math.round(w)); s.setAttribute("height", Math.round(ht));
    s.setAttribute("role", "img"); s.setAttribute("aria-label", `Newman projection, ${kind}. Front carbon, clockwise from the top: ${F.join(", ")}. Back carbon, turned ${Math.round(a)} degrees: ${B.join(", ")}.`);
    s.innerHTML = h; return s;
  };
  ORGO.tokens = ORGO.tokens || {};
  ORGO.tokens.newman = (arg, inline) => { const s = N.svg(arg); if (inline) s.classList.add("inline"); return s };

  // butane, looking down the C2 to C3 bond: anti 0, gauche 0.9, CH3 over H about 3.4, CH3 over CH3 about 5 kcal/mol
  N.energy = deg => { const t = rad(deg); return 2.2667 + 0.8333 * Math.cos(t) + 0.2333 * Math.cos(2 * t) + 1.6667 * Math.cos(3 * t) };
  const named = deg => {
    const a = norm(deg), near = x => Math.abs(a - x) <= 7;
    if (near(0) || near(360)) return "Eclipsed, with the two methyl groups lined up (syn). This is the highest point: about 5 kcal/mol.";
    if (near(60) || near(300)) return "Gauche: staggered, with the two methyl groups 60° apart. About 0.9 kcal/mol.";
    if (near(120) || near(240)) return "Eclipsed, with each methyl group lined up with a hydrogen. About 3.4 kcal/mol.";
    if (near(180)) return "Anti: staggered, with the two methyl groups 180° apart. This is the lowest point: 0 kcal/mol.";
    return `Between two named conformations. About ${(Math.round(Math.max(0, N.energy(a)) * 10) / 10)} kcal/mol.`;
  };
  N.lab = host => {
    let angle = 180;
    const X = d => 44 + d * (280 / 360), Y = e => 150 - e * (120 / 5.5);
    const fig = el("div", { class: "newman-fig" }), plot = el("div", { class: "newman-plot" }), say = el("p", { class: "newman-say", "aria-live": "polite" });
    const range = el("input", { type: "range", min: "0", max: "360", step: "5", value: String(angle), id: "newmanAngle" + Math.floor(performance.now()), class: "newman-range" });
    const lab = el("label", { for: range.id }, "Dihedral angle between the two methyl groups: ", el("b", {}, "180°"));
    function curve() {
      let d = ""; for (let a = 0; a <= 360; a += 3) d += (a ? "L" : "M") + f1(X(a)) + " " + f1(Y(N.energy(a)));
      let h = `<line x1="44" y1="150" x2="330" y2="150" stroke="currentColor" stroke-width="1"/><line x1="44" y1="150" x2="44" y2="18" stroke="currentColor" stroke-width="1"/>`;
      [0, 60, 120, 180, 240, 300, 360].forEach(a => { h += `<line x1="${X(a)}" y1="150" x2="${X(a)}" y2="154" stroke="currentColor"/><text x="${X(a)}" y="166" text-anchor="middle" font-size="10" fill="currentColor">${a}°</text>` });
      [0, 0.9, 3.4, 5].forEach(e => { h += `<line x1="40" y1="${f1(Y(e))}" x2="44" y2="${f1(Y(e))}" stroke="currentColor"/><text x="37" y="${f1(Y(e) + 3.5)}" text-anchor="end" font-size="10" fill="currentColor">${e}</text>` });
      h += `<text x="187" y="182" text-anchor="middle" font-size="11" fill="currentColor">dihedral angle</text><text x="12" y="84" text-anchor="middle" font-size="11" fill="currentColor" transform="rotate(-90 12 84)">energy, kcal/mol</text>`;
      h += `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8"/>`;
      const px = X(angle), py = Y(N.energy(angle));
      h += `<line x1="${f1(px)}" y1="150" x2="${f1(px)}" y2="${f1(py)}" stroke="var(--accent, #0071e3)" stroke-dasharray="3 3"/><circle cx="${f1(px)}" cy="${f1(py)}" r="5.5" fill="var(--accent, #0071e3)" stroke="var(--surface, #fff)" stroke-width="1.5"/>`;
      const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("class", "energy-svg newman-curve"); s.setAttribute("viewBox", "0 0 340 190"); s.setAttribute("width", "340"); s.setAttribute("height", "190");
      s.setAttribute("role", "img"); s.setAttribute("aria-label", `Energy of butane against dihedral angle. Now at ${angle} degrees, about ${Math.round(Math.max(0, N.energy(angle)) * 10) / 10} kcal/mol.`); s.innerHTML = h; return s;
    }
    function draw() {
      fig.textContent = ""; fig.appendChild(N.svg("CH3,H,H|CH3,H,H|" + angle)); plot.textContent = ""; plot.appendChild(curve());
      lab.lastChild.textContent = angle + "°"; say.textContent = named(angle); range.setAttribute("aria-valuetext", angle + " degrees. " + named(angle));
    }
    const set = a => { angle = Math.max(0, Math.min(360, Math.round(a))); range.value = String(angle); draw() };
    range.addEventListener("input", () => set(+range.value));
    const jump = (text, a) => el("button", { class: "btn small", type: "button", on: { click: () => set(a) } }, text);
    host.textContent = "";
    host.appendChild(el("div", { class: "newman-lab stack" },
      el("p", { class: "small muted" }, "Butane, looking down the bond from carbon 2 to carbon 3. The front carbon stays still. Turn the back carbon with the slider or the arrow keys."),
      el("div", { class: "newman-main" }, fig, plot),
      el("div", { class: "stack" }, lab, range),
      el("div", { class: "btn-row" }, jump("Anti, 180°", 180), jump("Gauche, 60°", 60), jump("Eclipsed, 120°", 120), jump("Methyls eclipsed, 0°", 0)),
      say));
    draw();
    return { set, get angle() { return angle } };
  };
})();
