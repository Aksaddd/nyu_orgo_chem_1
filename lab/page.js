// CHEM 225 · Molecule Lab: nine tools on one page. Tab id is kept in the URL hash.
(() => {
  "use strict";
  const ORGO = window.ORGO, el = ORGO.el, T = () => (ORGO.data.tables || {});
  const app = document.getElementById("app");
  const minus = x => String(x).replace("-", "−");
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  const plain = f => String(f).replace(/([A-Za-z)\]])(\d+)/g, (m, a, d) => a + [...d].map(x => SUB[x]).join("")).replace(/[-−]$/, "−").replace(/\+$/, "⁺");
  // a formula drawn as the class draws it everywhere (ORGO.fmt): one word for Eureka's dictionary (data-lk), not "NH" and "4"
  const chemHTML = f => ORGO.fmt("{{" + f + "}}"), chem = f => ORGO.html("{{" + f + "}}");
  const KIT = "Build this one with your model kit: it is allowed on the exam.";
  const missing = what => el("p", { class: "callout warn" }, el("b", {}, "Not available. "), what + " could not be loaded on this page. Reload it, and tell your tutor if it keeps happening.");
  const intro = (text, kit) => el("div", {}, el("p", { class: "lab-intro" }, text), kit ? el("p", { class: "lab-kit" }, KIT) : null);
  const more = (rows, head) => el("details", { class: "more" }, el("summary", {}, "Show the numbers"),
    el("table", {}, el("thead", {}, el("tr", {}, head.map(h => el("th", { scope: "col" }, h)))), el("tbody", {}, rows.map(r => el("tr", {}, r.map(c => el("td", {}, c)))))));

  // ---------------------------------------------------------------- chart helper (SVG as a string, then parsed)
  // rows: [{label, text, v}], v null means "no bar". px(v) maps a value to 0..plotW from the axis start.
  function barChart(o) {
    const L = 196, PW = o.plotW || 360, RH = 30, top = o.legend ? 40 : 14, H = top + o.rows.length * RH + 34, ax = o.zero == null ? L : L + o.zero * PW;
    let s = `<svg viewBox="0 0 650 ${H}" role="img" data-nolookup aria-label="${esc(o.aria)}">`;
    if (o.legend) s += o.legend;
    (o.ticks || []).forEach(t => { const x = L + t.f * PW; s += `<line class="grid" x1="${x}" y1="${top - 6}" x2="${x}" y2="${top + o.rows.length * RH}"/><text class="muted" x="${x}" y="${top + o.rows.length * RH + 16}" text-anchor="middle">${esc(t.label)}</text>` });
    if (o.ref) { const x = L + o.ref.f * PW; s += `<line class="ref" x1="${x}" y1="${top - 8}" x2="${x}" y2="${top + o.rows.length * RH}"/><text x="${x}" y="${top + o.rows.length * RH + 30}" text-anchor="middle">${esc(o.ref.label)}</text>` }
    o.rows.forEach((r, i) => {
      const y = top + i * RH, mid = y + RH / 2;
      s += `<text x="${L - 10}" y="${mid + 4}" text-anchor="end">${esc(r.label)}</text>`;
      if (r.v == null) { s += `<text class="muted" x="${ax + 8}" y="${mid + 4}">${esc(r.text)}</text>`; return }
      const x1 = L + r.v * PW, x0 = Math.min(ax, x1), w = Math.max(3, Math.abs(x1 - ax));
      s += `<rect class="bar" x="${x0}" y="${y + 4}" width="${w}" height="${RH - 8}" rx="3"/>`;
      s += x1 < ax ? `<text x="${x0 - 6}" y="${mid + 4}" text-anchor="end" font-weight="700">${esc(r.text)}</text>` : `<text x="${x0 + w + 6}" y="${mid + 4}" font-weight="700">${esc(r.text)}</text>`;
    });
    s += `<line class="ax" x1="${ax}" y1="${top - 6}" x2="${ax}" y2="${top + o.rows.length * RH}"/></svg>`;
    return s;
  }
  const chart = (title, svg, details) => { const d = el("div", { class: "lab-chart card" }, el("h3", {}, title)); const w = el("div"); w.innerHTML = svg; d.append(w, details); return d };

  // ---------------------------------------------------------------- 1 chair lab
  function chairTab(p) {
    p.appendChild(intro("Add groups to the ring, then flip it. Notice which chair puts the larger groups equatorial, and what that does to the energy.", true));
    const host = el("div"); p.appendChild(host);
    if (ORGO.chair && ORGO.chair.lab) ORGO.chair.lab(host, { subs: ORGO.chair.parse ? ORGO.chair.parse("1u:CH3,3u:CH3") : [] }); else host.appendChild(missing("The chair lab"));
  }
  // ---------------------------------------------------------------- 2 ring flip
  function flipTab(p) {
    p.appendChild(intro("Drag the slider from one chair to the other, or press Play once. Notice that every axial hydrogen becomes equatorial, and that the ring passes through a twist-boat on the way.", true));
    const host = el("div"); p.appendChild(host);
    if (ORGO.view3d && ORGO.view3d.flip) ORGO.view3d.flip(host); else host.appendChild(missing("The 3D viewer"));
  }
  // ---------------------------------------------------------------- 3 rings and strain
  const RING_MODEL = { cyclopropane: "cyclopropane", cyclobutane: "cyclobutane", cyclopentane: "cyclopentane", cyclohexane: "cyclohexane-chair" };
  function ringsTab(p) {
    const S = T().rates && T().rates.strain; if (!S) { p.appendChild(missing("The ring data")); return }
    p.appendChild(intro("Turn each ring and compare the numbers. Notice that the heat of formation per CH2 only reaches the strain-free value of −4.9 kcal/mol for the chair of cyclohexane.", true));
    const grid = el("div", { class: "lab-grid" }); p.appendChild(grid);
    S.rows.forEach(r => {
      const slot = el("div"), card = el("div", { class: "card lab-card" }, el("h3", {}, r.name), slot,
        el("dl", { class: "lab-facts" },
          el("dt", {}, "Flat-ring angle"), el("dd", {}, r.flatAngle + "°"),
          el("dt", {}, "Eclipsing C-H pairs if flat"), el("dd", {}, String(r.eclipsed)),
          el("dt", {}, "Heat of formation"), el("dd", {}, minus(r.hf) + " kcal/mol"),
          el("dt", {}, "Per CH2"), el("dd", {}, minus(r.perCH2) + " kcal/mol")),
        r.note ? el("p", { class: "small" }, r.note) : null);
      grid.appendChild(card);
      const m = RING_MODEL[r.name];
      if (m && ORGO.view3d && ORGO.view3d.mount) ORGO.view3d.mount(slot, m, { height: 190 }); else slot.appendChild(el("p", { class: "small muted" }, m ? "The 3D viewer is not available." : "No 3D model of this ring is included. Use your model kit."));
    });
    const free = S.strainFree == null ? -4.9 : S.strainFree, vals = S.rows.map(r => r.perCH2), lo = -7, hi = 6, f = v => (v - lo) / (hi - lo);
    const rows = S.rows.map(r => ({ label: r.name, text: minus(r.perCH2), v: f(r.perCH2) }));
    const svg = barChart({ aria: "Heat of formation per CH2 in kcal/mol: " + S.rows.map(r => r.name + " " + minus(r.perCH2)).join(", ") + ". Strain-free line at " + minus(free) + ".", rows, zero: f(0), plotW: 380,
      ticks: [-6, -4, -2, 0, 2, 4].map(v => ({ f: f(v), label: minus(v) })), ref: { f: f(free), label: "strain-free " + minus(free) } });
    p.appendChild(chart("Only cyclohexane sits on the strain-free line of " + minus(free) + " kcal/mol per CH2", svg, more(S.rows.map(r => [r.name, minus(r.hf), minus(r.perCH2)]), ["Ring", "Heat of formation (kcal/mol)", "Per CH2 (kcal/mol)"])));
    void vals;
  }
  // ---------------------------------------------------------------- 4 Newman
  function newmanTab(p) {
    p.appendChild(intro("Turn the back carbon of butane and watch the energy curve. Notice that staggered shapes are low, eclipsed shapes are high, and the highest point has the two methyl groups on top of each other.", true));
    const host = el("div"); p.appendChild(host);
    if (ORGO.newman && ORGO.newman.lab) ORGO.newman.lab(host); else host.appendChild(missing("The Newman projection lab"));
  }
  // ---------------------------------------------------------------- 5 pKa ladder
  function pkaTab(p) {
    const D = T().pka; if (!D) { p.appendChild(missing("The pKa table")); return }
    const rows = D.rows.map((r, i) => Object.assign({ i }, r)).sort((a, b) => a.pka - b.pka || a.i - b.i);
    p.appendChild(intro("Press a rung to see its conjugate base and why it sits where it does. Notice that a stable conjugate base (big atom, resonance, or a charge shared over several atoms) makes a stronger acid. The lecture values are the ones the exam expects.", false));
    const hideBox = el("input", { type: "checkbox", id: "pkaHide" }), bar = el("div", { class: "row" }, hideBox, el("label", { for: "pkaHide" }, "Hide the numbers (self-test)"));
    const list = el("ul", { class: "rungs" }), eq = el("div", { class: "card stack" });
    p.append(bar, el("p", { class: "small muted" }, "Strongest acid at the top. The tag says where the value comes from: the lecture, the exam, or the usual literature."), list);
    let open = -1, hide = false; const checked = {};
    const lo = Math.min(...rows.map(r => r.pka)), hi = Math.max(...rows.map(r => r.pka));
    function draw() {
      list.textContent = "";
      rows.forEach((r, k) => {
        const showNum = !hide || checked[k], isOpen = open === k;
        const btn = el("button", { class: "rung-btn", type: "button", "aria-expanded": String(isOpen), on: { click: () => { open = isOpen ? -1 : k; draw(); const b = list.children[k].querySelector(".rung-btn"); if (b) b.focus() } } },
          el("span", {}, chem(r.f)), el("span", { class: "rung-pka" }, showNum ? "pKa " + minus(r.pka) : "pKa ?"), el("span", { class: "badge" }, r.src),
          showNum ? el("span", { class: "rung-track", "aria-hidden": "true" }, el("i", { style: { left: ((r.pka - lo) / (hi - lo) * 100) + "%" } })) : el("span"));
        btn.setAttribute("aria-label", r.name + ", " + (showNum ? "pKa " + r.pka : "pKa hidden") + ", source " + r.src);
        const li = el("li", { class: "rung" }, btn);
        if (hide) {
          const inp = el("input", { type: "text", inputmode: "decimal", id: "pk" + k, "aria-label": "Your pKa for " + r.name, autocomplete: "off" }), res = el("span", { "aria-live": "polite" });
          const go = () => { const v = parseFloat(inp.value.replace("−", "-").replace(",", ".")); res.textContent = ""; res.className = "";
            if (isNaN(v)) { res.textContent = "Type a number first."; return }
            const ok = v >= r.lo && v <= r.hi; checked[k] = true;
            res.className = ok ? "mark-ok" : "mark-no"; res.textContent = (ok ? "Right. " : "Not quite. ") + "Accepted range: " + minus(r.lo) + " to " + minus(r.hi) + ". The lecture value is " + minus(r.pka) + "." };
          inp.addEventListener("keydown", e => { if (e.key === "Enter") go() });
          li.appendChild(el("div", { class: "rung-test" }, el("label", { for: "pk" + k }, "Your value for " + r.name), inp, el("button", { class: "btn small", type: "button", on: { click: go } }, "Check"), res));
        }
        if (isOpen) {
          const d = el("div", { class: "panel rung-detail stack" }, el("p", {}, el("b", {}, r.name + ". "), "Conjugate base: ", chem(r.base), "."), el("p", {}, r.why));
          if (r.lit && showNum) d.appendChild(el("p", { class: "small muted" }, "Other tables: " + r.lit + "."));
          d.appendChild(el("p", { class: "small muted" }, "Source: " + r.src + (showNum ? ". Accepted range " + minus(r.lo) + " to " + minus(r.hi) + "." : ".")));
          li.appendChild(d);
        }
        list.appendChild(li);
      });
    }
    hideBox.addEventListener("change", () => { hide = hideBox.checked; for (const k in checked) delete checked[k]; draw() });
    draw();
    // equilibrium checker
    const sa = el("select", { class: "lab-select", id: "eqA" }), sb = el("select", { class: "lab-select", id: "eqB" }), out = el("p", { class: "eq-out", "aria-live": "polite" });
    rows.forEach((r, k) => { sa.appendChild(el("option", { value: k }, plain(r.f) + " (" + r.name + ")")); sb.appendChild(el("option", { value: k }, plain(r.base) + " (conjugate base of " + r.name + ")")) });
    sa.value = String(rows.findIndex(r => r.name === "water")); sb.value = String(rows.findIndex(r => r.name === "ammonium ion"));
    const pw = n => { const v = Math.abs(n) % 1 ? n.toFixed(1) : String(Math.round(n)); return "10<sup>" + minus(v) + "</sup>" };
    function run() {
      const a = rows[+sa.value], b = rows[+sb.value], diff = b.pka - a.pka, h = chemHTML;
      let verdict;
      if (Math.abs(diff) < 0.5) verdict = `The two acids are about equally strong, so neither side is clearly favoured. K is about 1.`;
      else if (diff > 0) verdict = `The acid on the right (${h(b.f)}, pKa ${minus(b.pka)}) is weaker than the acid on the left (pKa ${minus(a.pka)}), so the equilibrium lies to the right: the products are favoured. K is about ${pw(diff)}${diff >= 3 ? ", very strongly favoured" : ""}.`;
      else verdict = `The acid on the right (${h(b.f)}, pKa ${minus(b.pka)}) is stronger than the acid on the left (pKa ${minus(a.pka)}), so the equilibrium lies to the left: the starting materials are favoured. K is about ${pw(diff)}${diff <= -3 ? ", very strongly favoured" : ""}.`;
      out.innerHTML = `${h(a.f)} + ${h(b.base)} ⇌ ${h(a.base)} + ${h(b.f)}<br>${verdict}`;
    }
    sa.addEventListener("change", run); sb.addEventListener("change", run);
    eq.append(el("h3", {}, "Equilibrium checker"), el("p", { class: "small muted" }, "Choose an acid and a base. The reaction goes toward the weaker acid and the weaker base. K = 10 to the power (pKa of the acid formed minus pKa of the acid you start with)."),
      el("div", { class: "lab-grid" }, el("label", { class: "lab-field", for: "eqA" }, "Acid", sa), el("label", { class: "lab-field", for: "eqB" }, "Base", sb)), out);
    p.appendChild(eq); run();
  }
  // ---------------------------------------------------------------- 6 energy diagrams
  const PRESETS = [
    { id: "sn2", label: "SN2", title: "SN2: one step", spec: "R=0,TS=22,P=-10", note: "One hump and no valley: bond making and bond breaking happen together. Notice there is no intermediate." },
    { id: "sn1", label: "SN1", title: "SN1: three steps with water", spec: "R=0,TS1=24,I1=14,TS2=17,I2=6,TS3=9,P=-5|I1=carbocation,I2=oxonium ion", note: "Step 1, the leaving group leaves: the highest hump, so the slow step. Step 2, water attacks the carbocation. Step 3, water loses a proton." },
    { id: "e2", label: "E2", title: "E2: one step", spec: "R=0,TS=23,P=-4", note: "The base removes the hydrogen while the leaving group leaves and the double bond forms, all in one step." },
    { id: "e1", label: "E1", title: "E1: two steps", spec: "R=0,TS1=25,I=14,TS2=17,P=-4|I=carbocation", note: "The same slow first step as SN1, then a base removes a hydrogen from the carbocation." },
    { id: "s1", label: "Solvent A", title: "A more polar solvent lowers the transition state more", spec: "R=0,TS=22,P=-8", compare: "R=-1,TS=16,P=-9", names: ["Less polar solvent (solid line)", "More polar solvent (dashed line)"], note: "From 11/05: the transition state has partial charges, so a polar solvent stabilizes it more than the neutral starting materials. The barrier falls and the reaction is faster." },
    { id: "s2", label: "Solvent B", title: "A more polar solvent lowers the starting materials more", spec: "R=0,TS=22,P=-8", compare: "R=-7,TS=21,P=-8", names: ["Less polar solvent (solid line)", "More polar solvent (dashed line)"], note: "From 11/05: here the charge is concentrated in the starting materials, so a polar solvent lowers them more than the transition state. The barrier rises and the reaction is slower." }
  ];
  function energyTab(p) {
    p.appendChild(intro("Pick a reaction, then drag the levels. Notice how the barrier, Ea, is measured from the reactants to the highest transition state, and that ΔH is products minus reactants.", false));
    if (!(ORGO.energy && ORGO.energy.lab)) { p.appendChild(missing("The energy diagram lab")); return }
    const host = el("div"), seg = el("div", { class: "seg", role: "group", "aria-label": "Reaction" }); p.append(seg, host);
    const show = id => { [...seg.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === id))); const pr = PRESETS.find(x => x.id === id); ORGO.energy.lab(host, pr) };
    PRESETS.forEach(pr => seg.appendChild(el("button", { type: "button", "aria-pressed": "false", data: { id: pr.id }, on: { click: () => show(pr.id) } }, pr.label)));
    show("sn2");
  }
  // ---------------------------------------------------------------- 7 which mechanism
  const CARBON = [["methyl", "Methyl"], ["primary", "Primary"], ["secondary", "Secondary"], ["tertiary", "Tertiary"]];
  const REAGENT = [["bulky", "Strong, bulky base (tert-butoxide)"], ["strong", "Strong base, not bulky (hydroxide, methoxide)"], ["nuc", "Weak base, good nucleophile (iodide, azide)"], ["weak", "Weak base, poor nucleophile (the solvent: water, an alcohol)"]];
  const SOLV = [["protic", "Polar protic"], ["aprotic", "Polar aprotic"]], TEMP = [["low", "Lower"], ["high", "Higher"]];
  function decide(s) {
    const path = [], why = []; let res; const hot = s.t === "high", strongBase = s.r === "bulky" || s.r === "strong";
    const rname = REAGENT.find(x => x[0] === s.r)[1].toLowerCase();
    if (s.c === "methyl") {
      path.push(["Carbon", "Methyl: SN2 only."]); res = "SN2";
      why.push("A methyl carbocation is too unstable, so there is no SN1 or E1. A methyl carbon has no β-hydrogen, so there is no E2. That leaves SN2.", "Nothing blocks the back side, so methyl is the fastest SN2 substrate. A chiral centre would be inverted, but methyl has none.");
      if (s.r === "weak") why.push("A poor nucleophile makes it slow, but SN2 is still the only path.");
    } else if (s.c === "primary") {
      path.push(["Carbon", "Primary: only SN2 and E2 are possible, because a primary carbocation is too unstable (unless it is allylic or benzylic)."]);
      if (s.r === "nuc") { path.push(["Reagent", "A good nucleophile that is a weak base: SN2."]); res = "SN2"; why.push("A good nucleophile and a weak base attacks the carbon rather than pulling off a hydrogen. The back side of a primary carbon is open enough.") }
      else if (s.r === "bulky") { path.push(["Reagent", "A strong, bulky base: E2."]); res = "E2"; why.push("A bulky base cannot get to the carbon, so it takes a β-hydrogen from the edge instead. Increased branching on the α and β carbons favours E2 over SN2.") }
      else if (s.r === "strong") { path.push(["Reagent", "A strong base that is not bulky: SN2."]); res = "SN2"; why.push("It is small enough to reach the back side of a primary carbon, so substitution wins. A better nucleophile favours SN2, a better base favours E2.") }
      else { path.push(["Reagent", "A weak base and poor nucleophile: nothing pushes the reaction."]); res = "Very slow SN2, practically no reaction"; why.push("The solvent is a poor nucleophile and a poor base, and a primary carbon will not form a carbocation. The reaction is very slow.") }
      path.push(["Solvent", "Not the deciding step for a primary carbon on this chart."]);
    } else if (s.c === "secondary") {
      path.push(["Carbon", "Secondary: all four are possible, so the solvent and the reagent decide."]);
      path.push(["Solvent", s.s === "protic" ? "Polar protic: it solvates negative ions and helps a carbocation form." : "Polar aprotic: it leaves negative ions bare and reactive."]);
      if (s.s === "protic") {
        if (s.r === "weak") { path.push(["Reagent", "A weak base and poor nucleophile: SN1 and E1."]); res = "SN1 and E1 (a mixture)"; why.push("A polar protic solvent stabilizes the carbocation and its leaving group, and there is no strong base or nucleophile to force another path.", "SN1 racemizes a chiral centre because the carbocation is planar. Carbocations can rearrange.") }
        else if (strongBase) { path.push(["Reagent", "A strong base: E2."]); res = "E2"; why.push("A strong base pulls off a β-hydrogen before a carbocation can form. A secondary carbon is hindered enough that E2 beats SN2.") }
        else { path.push(["Reagent", "A good nucleophile that is a weak base: SN2 (the chart does not spell this case out)."]); res = "SN2"; why.push("The chart lists only a poor nucleophile (SN1 and E1) or a strong base (E2) for a protic solvent. A good nucleophile that is a weak base is not a strong base, so SN2 is the best answer, although a protic solvent slows it down.") }
      } else {
        if (s.r === "nuc") { path.push(["Reagent", "A weak base and fair or good nucleophile: SN2."]); res = "SN2"; why.push("A polar aprotic solvent does not hold the nucleophile back, so it is at its most reactive. An SN2 inverts a chiral centre.") }
        else if (strongBase) { path.push(["Reagent", "A strong base: E2."]); res = "E2"; why.push("A strong base on a secondary carbon gives E2, with some SN2 as a minor competitor. A better base favours E2 over SN2.") }
        else { path.push(["Reagent", "A weak base and poor nucleophile in a solvent that does not help ionization."]); res = "Very slow, practically no reaction"; why.push("An aprotic solvent does not stabilize a carbocation, and the reagent is too weak to do SN2 or E2 quickly.") }
      }
    } else {
      path.push(["Carbon", "Tertiary: too crowded for SN2."]);
      if (strongBase) { path.push(["Reagent", "A strong base: E2."]); res = "E2"; why.push("SN2 is blocked by three groups on the back side, so the strong base takes a β-hydrogen instead.") }
      else { path.push(["Reagent", "Not a strong base: SN1 and E1."]); res = "SN1 and E1 (a mixture)"; why.push("A tertiary carbocation is stable enough to form. Then the solvent or nucleophile can attack it (SN1) or a hydrogen can leave (E1).", "SN1 racemizes a chiral centre because the carbocation is planar. Carbocations can rearrange.") }
      path.push(["Solvent", "Polar protic solvents help the carbocation steps; they do not change the choice here."]);
    }
    path.push(["Temperature", hot ? "Higher: heat favours elimination." : "Lower: substitution is less penalized."]);
    if (res === "E2") why.push("E2 needs the hydrogen anti-periplanar to the leaving group. A small base gives the more substituted alkene (Saytzeff), a bulky base more of the less substituted one (Hofmann)." + (hot ? " Heat favours it further." : ""));
    else if (res === "SN2" && s.c !== "methyl") { if (hot) { res = "SN2, with more E2 at higher temperature"; why.push("High temperature favours elimination, so expect some alkene alongside the substitution product.") } else why.push("A lower temperature keeps elimination in check.") }
    else if (/^SN1 and E1/.test(res)) { res = hot ? "SN1 and E1, leaning toward E1" : "SN1 and E1, leaning toward SN1"; why.push(hot ? "High temperature favours elimination, so more of the alkene forms." : "At lower temperature substitution keeps more of the product.") }
    void rname;
    return { path, res, why };
  }
  function mechTab(p) {
    p.appendChild(intro("Choose the carbon, the reagent, the solvent and the temperature. Notice which question settles the answer for each carbon: methyl needs none, tertiary needs only the reagent, secondary needs the solvent too.", false));
    const st = { c: "secondary", r: "strong", s: "protic", t: "low" }, out = el("div", { class: "stack", "aria-live": "polite" }), pick = el("div", { class: "mech-pick card" });
    const group = (key, legend, opts) => { const seg = el("div", { class: "seg", role: "group", "aria-label": legend }), fs = el("fieldset", {}, el("legend", {}, legend), seg);
      const paint = () => [...seg.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === st[key])));
      opts.forEach(o => seg.appendChild(el("button", { type: "button", data: { v: o[0] }, on: { click: () => { st[key] = o[0]; paint(); render() } } }, o[1]))); paint(); return fs };
    pick.append(group("c", "Carbon bearing the leaving group", CARBON), group("r", "Reagent", REAGENT), group("s", "Solvent", SOLV), group("t", "Temperature", TEMP));
    function render() {
      const d = decide(st); out.textContent = "";
      out.append(el("h3", {}, "The path through the chart"), el("ol", { class: "mech-path" }, d.path.map(x => el("li", {}, el("b", {}, x[0]), el("span", {}, x[1])))),
        el("p", { class: "eyebrow" }, "Prediction"), el("p", { class: "mech-result" }, d.res), el("ul", {}, d.why.map(w => el("li", {}, w))),
        el("div", { class: "callout info" }, el("b", {}, "Caution. "), "This flow chart is meant as a guide. There will be exceptions to what is written."));
    }
    p.append(pick, out); render();
  }
  // ---------------------------------------------------------------- 8 rates
  function ratesTab(p) {
    const R = T().rates; if (!R) { p.appendChild(missing("The rate data")); return }
    p.appendChild(intro("Read each title, then check it against the bars. Notice how many powers of ten separate the best and worst cases, and that fluoride flips the E2 product.", false));
    const nuc = R.nucleophiles.rows, lmin = -0.5, lmax = 5.5, lf = v => (Math.log10(v) - lmin) / (lmax - lmin), fmt = n => n >= 1000 ? n.toLocaleString("en-US") : String(n);
    p.appendChild(chart("Acetylide and HS⁻ react more than 100,000 times faster than water or methanol",
      barChart({ aria: "Relative SN2 rate on a log scale: " + nuc.map(r => plain(r.f) + " " + fmt(r.rate)).join(", ") + ".", plotW: 340, rows: nuc.map(r => ({ label: plain(r.f), text: fmt(r.rate), v: lf(r.rate) })), ticks: [0, 1, 2, 3, 4, 5].map(k => ({ f: (k - lmin) / (lmax - lmin), label: fmt(Math.pow(10, k)) })) }),
      more(nuc.map(r => [plain(r.f), fmt(r.rate)]), ["Nucleophile", "Relative rate"])));
    const sub = R.substrates.rows, smin = -3.5, smax = 0.5, sf = v => (Math.log10(v) - smin) / (smax - smin), sfmt = n => String(n);
    p.appendChild(chart("SN2 slows as the carbon gets more crowded: methyl is fast, tertiary does not react",
      barChart({ aria: "Relative SN2 rate by substrate on a log scale: " + sub.map(r => r.name + " " + (r.rate ? sfmt(r.rate) : "no reaction")).join(", ") + ".", plotW: 340, rows: sub.map(r => ({ label: r.name.replace(/ \(.*$/, ""), text: r.rate ? sfmt(r.rate) : "no reaction", v: r.rate ? sf(r.rate) : null })), ticks: [-3, -2, -1, 0].map(k => ({ f: (k - smin) / (smax - smin), label: String(Math.pow(10, k)) })) }),
      more(sub.map(r => [r.name, r.rate ? sfmt(r.rate) : "no reaction", r.note || ""]), ["Substrate", "Relative rate", "Note"])));
    const e2 = R.e2regio.rows, X0 = 196, PW = 360, RH = 30, top = 44, H = top + e2.length * RH + 14;
    let s = `<svg viewBox="0 0 650 ${H}" role="img" data-nolookup aria-label="${esc("E2 products of 2-hexyl halides, percent Saytzeff and Hofmann: " + e2.map(r => "leaving group " + r.lg + " " + r.saytzeff + " and " + r.hofmann).join("; "))}">` +
      `<defs><pattern id="labHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="hatch" x1="0" y1="0" x2="0" y2="7" opacity=".3"/></pattern></defs>` +
      `<rect class="bar" x="${X0}" y="8" width="16" height="16" rx="3"/><text x="${X0 + 22}" y="21">Saytzeff (more substituted alkene)</text>` +
      `<rect class="bar2" x="${X0 + 250}" y="8" width="16" height="16" rx="3"/><text x="${X0 + 272}" y="21">Hofmann (less substituted)</text>`;
    e2.forEach((r, i) => { const y = top + i * RH, a = r.saytzeff / 100 * PW, h = r.hofmann / 100 * PW;
      s += `<text x="${X0 - 10}" y="${y + 19}" text-anchor="end">leaving group ${esc(r.lg)}</text><rect class="bar" x="${X0}" y="${y + 3}" width="${a}" height="${RH - 6}" rx="3"/><rect class="bar2" x="${X0 + a}" y="${y + 3}" width="${h}" height="${RH - 6}" rx="3"/>` +
        `<text class="onbar" x="${X0 + a / 2}" y="${y + 19}" text-anchor="middle">${r.saytzeff}%</text><text x="${X0 + a + h / 2}" y="${y + 19}" text-anchor="middle" font-weight="700">${r.hofmann}%</text>` });
    s += "</svg>";
    p.appendChild(chart("Saytzeff wins for I, Br and Cl, but with fluoride the Hofmann product is the major one", s, more(e2.map(r => [r.lg, r.saytzeff + "%", r.hofmann + "%"]), ["Leaving group", "Saytzeff (%)", "Hofmann (%)"])));
    p.appendChild(el("p", { class: "small muted" }, R.e2regio.title + ". " + (R.e2regio.from || "")));
  }
  // ---------------------------------------------------------------- 9 models
  function modelsTab(p) {
    p.appendChild(intro("Open any model and turn it. Notice the shape of each ring, and how crowded the back side of the carbon is in tert-butyl bromide compared with iodomethane.", true));
    const list = ORGO.data.confList || []; if (!list.length) { p.appendChild(missing("The model list")); return }
    const grid = el("div", { class: "lab-grid" }); p.appendChild(grid);
    list.forEach(m => grid.appendChild(el("button", { class: "card tap lab-model", type: "button", on: { click: () => {
      const body = el("div", { class: "stack" }), slot = el("div"); body.appendChild(slot); if (m.note) body.appendChild(el("p", {}, m.note));
      ORGO.ui.sheet({ title: m.title || m.name, body, wide: true });
      if (ORGO.view3d && ORGO.view3d.mount) ORGO.view3d.mount(slot, m.name, { height: 340, labels: true }); else slot.appendChild(missing("The 3D viewer"));
    } } }, el("b", {}, m.title || m.name), el("span", { class: "small muted" }, m.note || "Open the 3D model"))));
  }

  // ---------------------------------------------------------------- page
  const TABS = [["chair", "Chair lab", chairTab], ["flip", "Ring flip in 3D", flipTab], ["rings", "Rings and strain", ringsTab], ["newman", "Newman projections", newmanTab], ["pka", "pKa ladder", pkaTab], ["energy", "Energy diagrams", energyTab], ["mechanism", "Which mechanism", mechTab], ["rates", "Rates at a glance", ratesTab], ["models", "Models", modelsTab]];
  function setHash(id) { try { history.replaceState(null, "", "#" + id) } catch (e) { location.hash = id } }
  app.appendChild(el("h1", { class: "page-title" }, "Molecule Lab"));
  app.appendChild(el("p", { class: "lead" }, "Turn molecules, flip rings, and test yourself on the numbers behind substitution and elimination."));
  const host = el("div"); app.appendChild(host);
  const tabs = ORGO.ui.tabs(host, TABS.map(([id, label, fn]) => ({ id, label, render: panel => { setHash(id); const box = el("div", { class: "lab-tool" }); panel.appendChild(box); try { fn(box) } catch (e) { console.error(e); box.appendChild(missing("This tool")) } } })), (location.hash || "").slice(1));
  window.addEventListener("hashchange", () => { const id = location.hash.slice(1); if (id !== tabs.current && TABS.some(t => t[0] === id)) tabs.show(id) });
})();
