// CHEM 225 · reaction-coordinate diagrams. Adds ORGO.energy and the token handler "energy".
// Spec: "R=0,TS1=22,I=12,TS2=15,P=-6|I=carbocation,TS1=rate-determining". Names starting TS are peaks, the first and
// last points are the ends, anything else is an intermediate. After a bar: labels (NAME=text) and the words ea, dh.
(() => {
  "use strict";
  const ORGO = window.ORGO = window.ORGO || {};
  const E = ORGO.energy = {};
  const el = (...a) => ORGO.el(...a);
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const f1 = x => Math.round(x * 10) / 10, minus = x => String(Math.round(x * 10) / 10).replace("-", "−");
  const isTS = n => /^TS/i.test(n);

  function parse(spec) {
    const parts = String(spec || "").split("|"), labels = {}, flags = {};
    const pts = parts[0].split(",").map(s => { const m = /^\s*([^=]+?)\s*=\s*([-−+]?\d+(?:\.\d+)?)\s*$/.exec(s); return m ? { name: m[1], e: parseFloat(m[2].replace("−", "-")) } : null }).filter(Boolean);
    parts.slice(1).join(",").split(",").forEach(s => { s = s.trim(); if (!s) return; const k = s.indexOf("="); if (k > 0) labels[s.slice(0, k).trim()] = s.slice(k + 1).trim(); else flags[s.toLowerCase()] = true });
    return { pts, labels, flags };
  }
  E.parse = parse;
  const toSpec = pts => pts.map(p => p.name + "=" + p.e).join(",");
  // Ea: reactants to the highest transition state. ΔH: products minus reactants.
  function facts(pts) {
    if (!pts.length) return { ea: 0, dh: 0, steps: 0, top: -1 };
    let top = -1; pts.forEach((p, i) => { if (isTS(p.name) && (top < 0 || p.e > pts[top].e)) top = i });
    return { ea: top < 0 ? 0 : pts[top].e - pts[0].e, dh: pts[pts.length - 1].e - pts[0].e, steps: pts.filter(p => isTS(p.name)).length, top };
  }
  E.facts = spec => facts(parse(spec).pts);

  E.svg = (spec, opt) => {
    const { pts, labels, flags } = parse(spec), o = Object.assign({}, opt), ea = !!(o.ea || flags.ea), dh = !!(o.dh || flags.dh);
    const other = o.compare ? parse(o.compare).pts : null, W = 340, H = 212, L = 46, T = 34, B = 162, n = pts.length;
    const all = pts.concat(other || []).map(p => p.e), lo = Math.min.apply(null, all.concat([0])), hi0 = Math.max.apply(null, all.concat([1])), hi = hi0 === lo ? lo + 1 : hi0;
    const Y = e => B - (e - lo) / (hi - lo) * (B - T), X = (i, m) => m < 2 ? 170 : L + 30 + i * (212 / (m - 1));
    const path = P => { let d = `M${f1(X(0, P.length) - 20)} ${f1(Y(P[0].e))}H${f1(X(0, P.length))}`;
      for (let i = 1; i < P.length; i++) { const x0 = X(i - 1, P.length), x1 = X(i, P.length), k = (x1 - x0) / 2; d += `C${f1(x0 + k)} ${f1(Y(P[i - 1].e))} ${f1(x1 - k)} ${f1(Y(P[i].e))} ${f1(x1)} ${f1(Y(P[i].e))}` }
      return d + `H${f1(X(P.length - 1, P.length) + 20)}` };
    const tx = (x, y, t, a, extra) => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${a || "middle"}" font-size="11" fill="currentColor"${extra || ""}>${esc(t)}</text>`;
    const arrow = (x, y0, y1, col) => { const s = y1 < y0 ? 1 : -1; return `<line x1="${f1(x)}" y1="${f1(y0)}" x2="${f1(x)}" y2="${f1(y1 + s * 2)}" stroke="${col}" stroke-width="1.4"/><polygon points="${f1(x)},${f1(y1)} ${f1(x - 3.6)},${f1(y1 + s * 7)} ${f1(x + 3.6)},${f1(y1 + s * 7)}" fill="${col}"/>` };
    let h = `<line x1="${L}" y1="182" x2="${L}" y2="16" stroke="currentColor" stroke-width="1.2"/><polygon points="${L},10 ${L - 3.5},18 ${L + 3.5},18" fill="currentColor"/>` +
      `<line x1="${L}" y1="182" x2="322" y2="182" stroke="currentColor" stroke-width="1.2"/><polygon points="328,182 320,178.5 320,185.5" fill="currentColor"/>` +
      tx(187, 202, "reaction coordinate") + `<text x="26" y="98" text-anchor="middle" font-size="11" fill="currentColor" transform="rotate(-90 26 98)">energy</text>`;
    if (!n) { h += tx(187, 100, "no points given") }
    else {
      const F = facts(pts), yR = Y(pts[0].e), xN = X(n - 1, n);
      if (ea || dh) h += `<line x1="${f1(X(0, n))}" y1="${f1(yR)}" x2="${f1(xN + 34)}" y2="${f1(yR)}" stroke="currentColor" stroke-opacity=".5" stroke-dasharray="3 3"/>`;
      if (other && other.length) h += `<path class="en-2" d="${path(other)}" fill="none" stroke="var(--accent, #0071e3)" stroke-width="1.8" stroke-dasharray="6 4"/>`;
      h += `<path class="en-1" d="${path(pts)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
      pts.forEach((p, i) => {
        const x = X(i, n), y = Y(p.e), custom = labels[p.name];
        if (isTS(p.name)) { h += tx(x, y - 7, p.name + "‡"); if (custom) h += tx(x, y - 19, custom, "middle", ' font-style="italic"') }
        else if (i === 0) h += tx(x - 20, y + 14, custom || (/^R/i.test(p.name) ? "reactants" : p.name), "start");
        else if (i === n - 1) h += tx(x + 20, y + 14, custom || (/^P/i.test(p.name) ? "products" : p.name), "end");
        else h += tx(x, y + 14, custom || (/^I\d*$/i.test(p.name) ? "intermediate" : p.name));
      });
      if (ea && F.top >= 0) { const x = X(F.top, n), y = Y(pts[F.top].e); h += arrow(x, yR, y + 3, "var(--arrow, #c2410c)") + tx(x - 5, (yR + y) / 2 + 8, "Ea", "end", ' font-style="italic" font-weight="600"') }
      if (dh && Math.abs(F.dh) > 0) { const y = Y(pts[n - 1].e); h += `<line x1="${f1(xN + 20)}" y1="${f1(y)}" x2="${f1(xN + 34)}" y2="${f1(y)}" stroke="currentColor" stroke-opacity=".5" stroke-dasharray="3 3"/>` + arrow(xN + 28, yR, y, "var(--arrow, #c2410c)") + tx(xN + 33, (yR + y) / 2 + 4, "ΔH", "start", ' font-weight="600"') }
    }
    const F = facts(pts), s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "energy-svg"); s.setAttribute("viewBox", `0 0 ${W} ${H}`); s.setAttribute("width", W); s.setAttribute("height", H); s.setAttribute("role", "img");
    s.setAttribute("data-nolookup", "");      // Eureka's dictionary leaves the drawing alone: its labels are not words
    s.setAttribute("aria-label", "Energy diagram: " + pts.map(p => `${labels[p.name] || p.name} at ${minus(p.e)}`).join(", ") + ` kcal/mol. ${F.steps === 1 ? "One step" : F.steps + " steps"}, ${F.dh < 0 ? "downhill overall (exothermic)" : F.dh > 0 ? "uphill overall (endothermic)" : "level overall"}.`);
    s.innerHTML = h; return s;
  };
  ORGO.tokens = ORGO.tokens || {};
  ORGO.tokens.energy = (arg, inline) => { const s = E.svg(arg); if (inline) s.classList.add("inline"); return s };

  // ------------------------------------------------------------------ the lab: move the levels, compare two curves
  E.lab = (host, preset) => {
    const p = typeof preset === "string" ? { spec: preset } : (preset || {}), first = parse(p.spec || "R=0,TS1=22,I=12,TS2=15,P=-6|I=carbocation");
    let a = first.pts.map(x => ({ name: x.name, e: x.e })), b = p.compare ? parse(p.compare).pts : null;
    const start = a.map(x => x.e), names = p.names || ["Curve 1 (solid line)", "Curve 2 (dashed line)"];
    const lab = Object.keys(first.labels).map(k => k + "=" + first.labels[k]).join(",");
    const fig = el("div", { class: "energy-fig" }), ctl = el("div", { class: "energy-ctl stack" }), out = el("div", { class: "energy-out stack", "aria-live": "polite" });
    const clamp = (P, i) => {      // a peak stays above its neighbours, a valley below them
      const nb = [P[i - 1], P[i + 1]].filter(Boolean).map(x => x.e);
      if (isTS(P[i].name)) P[i].e = Math.max(P[i].e, Math.max.apply(null, nb) + 1); else { const tsn = [P[i - 1], P[i + 1]].filter(x => x && isTS(x.name)).map(x => x.e); if (tsn.length) P[i].e = Math.min(P[i].e, Math.min.apply(null, tsn) - 1) }
    };
    const word = d => d < 0 ? "downhill, exothermic" : d > 0 ? "uphill, endothermic" : "level";
    function draw() {
      fig.textContent = ""; fig.appendChild(E.svg(toSpec(a) + (lab ? "|" + lab : ""), { ea: true, dh: true, compare: b ? toSpec(b) : null }));
      out.textContent = ""; const fa = facts(a);
      out.appendChild(el("p", {}, el("b", {}, names[0] + ": "), `Ea about ${minus(fa.ea)} kcal/mol (from the reactants to the highest transition state), ΔH about ${minus(fa.dh)} kcal/mol (${word(fa.dh)}).`));
      if (b) { const fb = facts(b);
        out.appendChild(el("p", {}, el("b", {}, names[1] + ": "), `Ea about ${minus(fb.ea)} kcal/mol, ΔH about ${minus(fb.dh)} kcal/mol (${word(fb.dh)}).`));
        out.appendChild(el("p", {}, fb.ea < fa.ea ? "The dashed curve has the lower barrier, so it is the faster reaction." : fb.ea > fa.ea ? "The dashed curve has the higher barrier, so it is the slower reaction." : "The two barriers are equal, so the two reactions go at the same rate.")) }
    }
    function sliders() {
      ctl.textContent = "";
      const block = (P, title, k) => { const box = el("fieldset", { class: "energy-set" }, el("legend", {}, title));
        P.forEach((pt, i) => { const id = "en" + k + i + Math.floor(performance.now() % 100000), val = el("b", {}, minus(pt.e));
          const r = el("input", { type: "range", min: "-20", max: "40", step: "1", value: String(pt.e), id });
          r.addEventListener("input", () => { pt.e = +r.value; clamp(P, i); if (pt.e !== +r.value) r.value = String(pt.e); val.textContent = minus(pt.e); draw() });
          box.appendChild(el("div", { class: "energy-row" }, el("label", { for: id }, (first.labels[pt.name] || pt.name) + ": ", val), r)) });
        ctl.appendChild(box) };
      block(a, names[0], "a"); if (b) block(b, names[1], "b");
    }
    // the second curve: the same reaction with the starting materials moved by dR and every point on the way (transition states, intermediates) by dMid
    const copy = (dMid, dR) => a.map((x, i) => ({ name: x.name, e: x.e + (i === 0 ? dR : i === a.length - 1 ? 0 : dMid) }));
    const btn = (text, fn) => el("button", { class: "btn small", type: "button", on: { click: () => { fn(); sliders(); draw() } } }, text);
    host.textContent = "";
    host.appendChild(el("div", { class: "energy-lab stack" },
      p.title ? el("p", {}, el("b", {}, p.title)) : null,
      el("p", { class: "small muted" }, p.note || "Move the levels and watch Ea and ΔH. Add a second curve to compare two conditions, for example the same reaction in two solvents."),
      el("div", { class: "energy-main" }, fig, ctl),
      el("div", { class: "btn-row" },
        btn("A solvent that stabilizes the transition state more", () => { b = copy(-6, -1) }),
        btn("A solvent that stabilizes the starting materials more", () => { b = copy(-1, -6) }),
        btn("Remove the second curve", () => { b = null }),
        btn("Start again", () => { a.forEach((x, i) => { x.e = start[i] }); b = p.compare ? parse(p.compare).pts : null })),
      out));
    sliders(); draw();
    return { get spec() { return toSpec(a) }, get compare() { return b ? toSpec(b) : null } };
  };

  // ------------------------------------------------------------------ a fresh multiple-choice question
  function rng(seed) {
    let h = 2166136261; const s = String(seed); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    let a = h >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
  }
  E.make = seed => {
    const rnd = rng("energy:" + seed), int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
    const mech = ["SN1", "SN2", "E1", "E2"][int(0, 3)], exo = rnd() < 0.5, two = mech === "SN1" || mech === "E1";
    const one = down => { const ts = int(18, 26); return `R=0,TS=${ts},P=${down ? -int(6, 13) : int(6, 11)}` };
    const twoStep = (down, firstHigh) => { const i = int(9, 13), hiTS = int(21, 27), loTS = i + int(3, 6); return `R=0,TS1=${firstHigh ? hiTS : loTS},I=${i},TS2=${firstHigh ? loTS : hiTS},P=${down ? -int(5, 12) : int(3, 7)}` };
    const dir = d => d ? "exothermic" : "endothermic", ends = d => d ? "lower than" : "higher than", M = `{{${mech}}}`;
    const slow = mech === "SN1" || mech === "E1" ? "the leaving group leaves to make the carbocation" : "";
    const partner = mech === "SN2" ? "the nucleophile attacks as the leaving group leaves" : "the base takes the hydrogen as the double bond forms and the leaving group leaves";
    let choices;
    if (two) choices = [
      { h: `[[energy:${twoStep(exo, true)}]]`, ok: true, why: `Two humps with a valley between them: two steps and a carbocation intermediate. The first hump is the higher one, because the first step, where ${slow}, is the slow step. The products end ${ends(exo)} the reactants, so the reaction is ${dir(exo)}.` },
      { h: `[[energy:${twoStep(!exo, true)}]]`, ok: false, why: `The shape is right for ${M}, but the products end ${ends(!exo)} the reactants. That is ${dir(!exo)}, not ${dir(exo)}.` },
      { h: `[[energy:${one(exo)}]]`, ok: false, why: `One hump means one step and no intermediate. That is a concerted reaction such as {{SN2}} or {{E2}}. ${M} goes through a carbocation, so it needs two humps.` },
      { h: `[[energy:${twoStep(exo, false)}]]`, ok: false, why: `There are two steps, but here the second hump is the higher one. In ${M} the first step, where ${slow}, is the slow one, so the first hump must be the higher one.` }];
    else choices = [
      { h: `[[energy:${one(exo)}]]`, ok: true, why: `One hump: one step, one transition state and no intermediate, which is what a concerted ${M} looks like (${partner}). The products end ${ends(exo)} the reactants, so the reaction is ${dir(exo)}.` },
      { h: `[[energy:${one(!exo)}]]`, ok: false, why: `One step is right for ${M}, but the products end ${ends(!exo)} the reactants. That is ${dir(!exo)}, not ${dir(exo)}.` },
      { h: `[[energy:${twoStep(exo, true)}]]`, ok: false, why: `Two humps mean two steps and an intermediate in the valley between them. ${M} happens in one step with no intermediate. This is the shape of {{SN1}} or {{E1}}.` },
      { h: `[[energy:${twoStep(!exo, false)}]]`, ok: false, why: `Wrong twice: it shows two steps with an intermediate, and its products end ${ends(!exo)} the reactants, which is ${dir(!exo)}.` }];
    for (let i = choices.length - 1; i > 0; i--) { const j = int(0, i), t = choices[i]; choices[i] = choices[j]; choices[j] = t }
    return { id: "gen:energy-diagrams:" + seed, type: "energy-diagrams", kind: "mcq", role: "practice", diff: 2, skills: [], src: "site",
      stem: `Which diagram shows an ${dir(exo)} ${M} reaction?`, choices,
      solution: { steps: [
        { t: "Count the steps", h: two ? `${M} has two steps: first ${slow}, then the carbocation reacts. Two steps means two humps (two transition states) with a valley (the carbocation) between them.` : `${M} is concerted: ${partner}, all in one step. One step means one hump and no valley.` },
        two ? { t: "Find the slow step", h: "Making the carbocation is the slow, rate-determining step, so the first hump is the higher one." } : { t: "Look at the top", h: "The top of the single hump is the transition state. It is not an intermediate: nothing can be isolated there." },
        { t: "Compare the two ends", h: `${cap(dir(exo))} means the products end ${ends(exo)} the reactants.` }],
        answer: two ? `The diagram with two humps, the first one higher, whose products end ${ends(exo)} its reactants.` : `The diagram with a single hump whose products end ${ends(exo)} its reactants.`,
        rule: "Humps are transition states and valleys are intermediates. Count the humps to count the steps. Compare the two ends to tell exothermic from endothermic." } };
  };
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1) }
})();
