// CHEM 225 · cyclohexanes: the model (axial and equatorial, cost, symmetry, E2), the drawings, the lab and the questions.
// Contract: docs/dev/ARCHITECTURE.md, "chair.js". Adds ORGO.chair and the token handlers "ring" and "chair".
// Substituents are {c: 1..6, face: "u" | "d", g}. Up and down never change. In form A the axial bond of carbons 1, 3, 5
// points up and of carbons 2, 4, 6 points down. Form B is the ring flip.
(() => {
  "use strict";
  const ORGO = window.ORGO = window.ORGO || {};
  const C = ORGO.chair = {};
  const el = (...a) => ORGO.el(...a);
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const r2 = x => Math.round(x * 100) / 100;
  const f1 = x => Math.round(x * 10) / 10;
  const mod6 = n => ((n % 6) + 6) % 6;

  // ------------------------------------------------------------------ A-values
  const BUILTIN = { CH3: [1.74, "lecture"], CH2CH3: [1.79, "lecture"], CH2CH2CH3: [2.21, "lecture"], "CH(CH3)2": [2.61, "lecture"], "C(CH3)3": [5.5, "lecture"],
    D: [0, "literature"], CN: [0.2, "literature"], F: [0.3, "literature"], I: [0.47, "literature"], Br: [0.5, "literature"], Cl: [0.53, "literature"], OCH3: [0.6, "literature"],
    OH: [0.9, "literature"], OTs: [0.5, "literature"], SH: [1.2, "literature"], COOH: [1.4, "literature"], NH2: [1.4, "literature"], OCH2CH3: [0.9, "literature"],
    "N(CH3)2": [2.1, "literature"], Ph: [2.8, "literature"] };
  const NOUN = { CH3: "methyl group", CH2CH3: "ethyl group", CH2CH2CH3: "propyl group", "CH(CH3)2": "isopropyl group", "C(CH3)3": "tert-butyl group", D: "deuterium",
    CN: "cyano group", F: "fluorine", I: "iodine", Br: "bromine", Cl: "chlorine", OCH3: "methoxy group", OH: "hydroxyl group", OTs: "tosylate group", SH: "thiol group",
    COOH: "carboxylic acid group", NH2: "amino group", OCH2CH3: "ethoxy group", "N(CH3)2": "dimethylamino group", Ph: "phenyl group" };
  let aMap = null, aFromTable = false, GAUCHE = 0.9;
  const DIAX = 3.7, UNKNOWN = 1.7;
  function Atable() {
    const t = ORGO.data && ORGO.data.tables && ORGO.data.tables.avalues;
    if (!aMap || (t && t.rows && !aFromTable)) {
      aMap = {}; for (const g in BUILTIN) aMap[g] = { a: BUILTIN[g][0], src: BUILTIN[g][1] };
      if (t && t.rows) { t.rows.forEach(r => { aMap[r.g] = { a: r.a, src: r.src, name: r.name } }); if (typeof t.gauche === "number") GAUCHE = t.gauche; aFromTable = true }
    }
    return aMap;
  }
  Object.defineProperty(C, "A", { get: Atable, enumerable: true });
  const aval = g => { const r = Atable()[g]; return r ? r.a : UNKNOWN };

  // ------------------------------------------------------------------ words
  const SUBD = "₀₁₂₃₄₅₆₇₈₉";
  const uni = g => String(g).replace(/\d/g, d => SUBD[d]);
  const noun = g => NOUN[g] || uni(g) + " group";
  const the = s => `the ${noun(s.g)} on carbon ${s.c}`;
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const list = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const nstr = x => String(r2(x)).replace("-", "−");
  const FACE = { u: "up", d: "down" }, POS = { ax: "axial", eq: "equatorial" };

  // ------------------------------------------------------------------ the model
  C.parse = s => {
    if (Array.isArray(s)) return s.map(x => ({ c: +x.c, face: x.face, g: x.g }));
    const out = [];
    String(s || "").split(",").forEach(part => {
      const m = /^\s*([1-6])\s*([ud])\s*:\s*(.+?)\s*$/.exec(part); if (!m) return;
      const sub = { c: +m[1], face: m[2], g: m[3] }, at = out.findIndex(o => o.c === sub.c && o.face === sub.face);
      if (at >= 0) out[at] = sub; else out.push(sub);
    });
    return out;
  };
  C.str = subs => C.parse(subs).map(s => s.c + s.face + ":" + s.g).join(",");
  const axUp = (c, form) => (c % 2 === 1) === (form !== "B");          // does this carbon's axial bond point up in this form?
  C.pos = (sub, form) => (sub.face === "u") === axUp(sub.c, form) ? "ax" : "eq";

  function formInfo(subs, form) {
    const axial = subs.filter(s => C.pos(s, form) === "ax"), equatorial = subs.filter(s => C.pos(s, form) === "eq");
    let gauche = 0, diaxial = 0;
    for (let i = 0; i < subs.length; i++) for (let j = i + 1; j < subs.length; j++) {
      const d = mod6(subs[i].c - subs[j].c), bothAx = C.pos(subs[i], form) === "ax" && C.pos(subs[j], form) === "ax";
      if ((d === 1 || d === 5) && !bothAx) gauche++;                   // neighbours: gauche unless both axial (anti)
      if ((d === 2 || d === 4) && bothAx) diaxial++;                   // 1,3-diaxial: two axial groups on the same side
    }
    const a = axial.reduce((t, s) => t + aval(s.g), 0);
    return { axial, equatorial, a: r2(a), gauche, diaxial, cost: r2(a + GAUCHE * gauche + DIAX * diaxial) };
  }

  // the two chairs compared by the symmetry of a chair (D3d): rotations give "same", reflections give "enantiomers"
  function relation(subs) {
    const slots = f => { const ax = Array(6).fill("H"), eq = Array(6).fill("H"); subs.forEach(s => { (C.pos(s, f) === "ax" ? ax : eq)[s.c - 1] = s.g }); return { ax, eq } };
    const a = slots("A"), b0 = slots("B"), b = { ax: [], eq: [] };
    for (let i = 0; i < 6; i++) { b.ax[mod6(i + 1)] = b0.ax[i]; b.eq[mod6(i + 1)] = b0.eq[i] }      // a 60° turn brings B into A's frame
    const hit = fn => [0, 1, 2, 3, 4, 5].every(i => a.ax[i] === b.ax[fn(i)] && a.eq[i] === b.eq[fn(i)]);
    for (const k of [0, 2, 4]) if (hit(i => mod6(i + k))) return "same";
    for (const c of [1, 3, 5]) if (hit(i => mod6(c - i))) return "same";
    for (const k of [1, 3, 5]) if (hit(i => mod6(i + k))) return "enantiomers";
    for (const c of [0, 2, 4]) if (hit(i => mod6(c - i))) return "enantiomers";
    return "diastereomers";
  }

  // the flat molecule: achiral exactly when a mirror plane or another improper operation maps it onto itself
  function chirality(subs) {
    const set = new Set(subs.map(s => (s.c - 1) + s.face + s.g)), other = f => f === "u" ? "d" : "u";
    const ok = fn => subs.every(s => set.has(fn(s.c - 1, s.face) + s.g));
    for (let c = 0; c < 6; c++) if (ok((i, f) => mod6(c - i) + f)) {
      if (c % 2 === 0) return { chiral: false, why: `a mirror plane that passes through carbons ${c / 2 + 1} and ${c / 2 + 4}` };
      const a = (c - 1) / 2 + 1, b = a + 3;
      return { chiral: false, why: `a mirror plane that cuts the bond between carbons ${a} and ${a + 1} and the bond between carbons ${b} and ${b % 6 + 1}` };
    }
    for (let k = 0; k < 6; k++) if (ok((i, f) => mod6(i + k) + other(f)))
      return { chiral: false, why: k === 0 ? "a mirror plane in the plane of the ring" : k === 3 ? "a centre of symmetry in the middle of the ring" : "a rotation-reflection axis through the middle of the ring" };
    return { chiral: true, why: "" };
  }

  function costLine(form, F) {
    const terms = F.axial.map(s => `${nstr(aval(s.g))} for the axial ${noun(s.g)}`);
    if (F.gauche) terms.push(`${nstr(GAUCHE * F.gauche)} for ${F.gauche === 1 ? "one gauche pair" : F.gauche + " gauche pairs"} of neighbouring groups`);
    if (F.diaxial) terms.push(`${nstr(DIAX * F.diaxial)} for ${F.diaxial === 1 ? "one 1,3-diaxial pair" : F.diaxial + " 1,3-diaxial pairs"} of groups`);
    if (!terms.length) return `Chair ${form}: nothing is axial and no two groups are gauche, so it costs about 0 kcal/mol.`;
    return terms.length === 1 ? `Chair ${form}: ${terms[0]}, so about ${nstr(F.cost)} kcal/mol.` : `Chair ${form}: ${terms.join(" + ")} = about ${nstr(F.cost)} kcal/mol.`;
  }

  C.analyze = input => {
    const subs = C.parse(input), A = formInfo(subs, "A"), B = formInfo(subs, "B");
    const two = subs.length === 2 && subs[0].c !== subs[1].c;
    const cisTrans = two ? (subs[0].face === subs[1].face ? "cis" : "trans") : null;
    const diff = r2(Math.abs(A.cost - B.cost)), stable = diff < 0.005 ? "equal" : A.cost < B.cost ? "A" : "B";
    const rel = relation(subs), ch = chirality(subs), ex = [];
    // 1. faces
    if (two) {
      const [s, t] = subs;
      ex.push({ k: "faces", t: "Read the faces", h: s.face === t.face
        ? `${cap(the(s))} points ${FACE[s.face]} and ${the(t)} points ${FACE[t.face]} too. Both are on the same face of the ring, so this is the cis isomer.`
        : `${cap(the(s))} points ${FACE[s.face]} and ${the(t)} points ${FACE[t.face]}. They are on opposite faces of the ring, so this is the trans isomer.` });
    } else if (!subs.length) ex.push({ k: "faces", t: "Read the faces", h: "The ring has no substituents, so cis and trans do not apply." });
    else ex.push({ k: "faces", t: "Read the faces", h: subs.map(s => `${cap(the(s))} points ${FACE[s.face]}.`).join(" ") + " Cis and trans describe exactly two substituents on different carbons, so those words do not apply here." });
    // 2, 3. where each group sits
    if (subs.length) {
      ex.push({ k: "chairA", t: "Chair A", h: "In chair A the axial bonds on carbons 1, 3 and 5 point up, and those on carbons 2, 4 and 6 point down. " +
        subs.map(s => `${cap(the(s))} points ${FACE[s.face]}, so it is ${POS[C.pos(s, "A")]}.`).join(" ") });
      ex.push({ k: "chairB", t: "Chair B, the ring flip", h: "Flip the ring to get chair B. Up stays up and down stays down, but every axial position becomes equatorial and every equatorial position becomes axial. Now " +
        list(subs.map(s => `${the(s)} is ${POS[C.pos(s, "B")]}`)) + "." });
    } else ex.push({ k: "chairA", t: "The two chairs", h: "Every position holds a hydrogen in both chairs." });
    // 4. cost
    ex.push({ k: "cost", t: "Cost of each chair", h: `These numbers are approximate. ${costLine("A", A)} ${costLine("B", B)}` });
    // 5. stability
    let st;
    if (stable === "equal") st = "The two chairs cost the same, so they are equal in energy and the ring spends equal time in each.";
    else {
      const win = stable === "A" ? A : B, lose = stable === "A" ? B : A, big = lose.axial.filter(s => win.equatorial.includes(s)).sort((x, y) => aval(y.g) - aval(x.g))[0];
      const why = !win.axial.length ? (subs.length === 1 ? `because ${the(subs[0])} is equatorial there` : "because it puts every group equatorial")
        : big && win.axial.every(s => aval(s.g) < aval(big.g)) ? `because it keeps the larger group, ${the(big)}, equatorial` : "because its total cost is lower";
      st = `Chair ${stable} is more stable, by about ${nstr(diff)} kcal/mol, ${why}.`;
    }
    ex.push({ k: "stable", t: "Which chair is more stable", h: st });
    // 6. relationship
    const relText = rel === "same"
      ? (subs.length ? "Turn chair B by 60° about the ring axis, then rotate it: it lands exactly on chair A, group for group. The two chairs are the same conformation, identical in shape and in energy."
        : "With no substituents the two chairs are identical.")
      : rel === "enantiomers" ? "The two chairs have the same pattern of axial and equatorial groups, but no rotation lays one on the other. Only a mirror reflection does. They are mirror images that do not superimpose: enantiomers (conformational enantiomers), equal in energy. The ring flip turns one into the other quickly."
        : "The two chairs have different groups in the axial positions, so no rotation and no reflection lays one on the other. They are stereoisomers that are not mirror images: diastereomers (conformational diastereomers), and diastereomers generally differ in energy.";
    ex.push({ k: "relation", t: "How the two chairs are related", h: relText });
    // 7. chirality of the molecule
    ex.push({ k: "chiral", t: "Chiral or not", h: ch.chiral ? "The flat drawing has no mirror plane and no centre of symmetry, so the molecule is chiral." : `The flat drawing has ${ch.why}, so the molecule is achiral.` });
    const why = {}; ex.forEach(p => { why[p.k] = p.h });
    return { subs, cisTrans, forms: { A, B }, stable, relation: rel, chiral: ch.chiral, steps: ex.map(p => p.h), explain: ex, why };
  };

  C.e2 = (input, lgCarbon) => {
    const subs = C.parse(input), lgc = +lgCarbon, on = subs.filter(s => s.c === lgc);
    const lg = on.find(s => /^(Cl|Br|I|F|OTs|OMs|OTf)$/.test(s.g)) || on[0];
    if (!lg) return { reactiveForm: null, antiH: [], products: [], steps: [`There is no leaving group on carbon ${lgc}.`], explain: [], possible: false, slow: false, fast: false };
    const form = C.pos(lg, "A") === "ax" ? "A" : "B", otherForm = form === "A" ? "B" : "A", an = C.analyze(subs), ex = [];
    ex.push({ k: "rule", t: "What E2 needs", h: "E2 needs the leaving group and the hydrogen anti-periplanar. On a cyclohexane that means both are axial, on neighbouring carbons, one pointing up and one pointing down." });
    ex.push({ k: "form", t: "The chair that reacts", h: `${cap(the(lg))} points ${FACE[lg.face]}. It is axial in chair ${form} and equatorial in chair ${otherForm}, so only chair ${form} can react.` });
    const antiH = [], notes = [];
    [lgc % 6 + 1, mod6(lgc - 2) + 1].forEach(n => {
      const face = axUp(n, form) ? "u" : "d", blocker = subs.find(s => s.c === n && s.face === face);
      if (blocker) notes.push(`Carbon ${n}: its axial position holds the ${noun(blocker.g)}, so it has no axial hydrogen and nothing can leave from there.`);
      else { antiH.push(n); notes.push(`Carbon ${n}: its axial position holds a hydrogen, anti to the ${noun(lg.g)}. This hydrogen can leave.`) }
    });
    ex.push({ k: "anti", t: "Look for axial hydrogens next door", h: notes.join(" ") });
    const products = antiH.map(n => ({ between: [lgc, n], zaitsev: subs.some(s => s.c === n) })).sort((x, y) => (y.zaitsev ? 1 : 0) - (x.zaitsev ? 1 : 0));
    const possible = products.length > 0, rf = an.forms[form].cost, of = an.forms[otherForm].cost;
    const slow = possible && an.stable !== "equal" && an.stable !== form, fast = possible && !slow;
    if (!possible) ex.push({ k: "product", t: "The result", h: `With the ${noun(lg.g)} axial, both neighbouring axial positions are taken by other groups, so there is no anti-periplanar hydrogen. In the other chair the ${noun(lg.g)} is equatorial and no hydrogen is anti to it either. E2 cannot happen in a chair.` });
    else {
      const p = products[0], bond = q => `between carbons ${q.between[0]} and ${q.between[1]}`;
      let t;
      if (products.length === 1) t = `Removing the hydrogen on carbon ${p.between[1]} gives the double bond ${bond(p)}. It is the only alkene that can form` + (p.zaitsev ? ", and it is also the more substituted one (Zaitsev)." : subs.some(s => s.c !== lgc && (mod6(s.c - lgc) === 1 || mod6(s.c - lgc) === 5)) ? ", even though it is the less substituted one. The geometry wins over the Zaitsev rule." : ".");
      else if (p.zaitsev && !products[1].zaitsev) t = `Two alkenes can form. The major product has the double bond ${bond(p)}: carbon ${p.between[1]} carries a substituent, so this is the more substituted alkene (Zaitsev). The minor product has the double bond ${bond(products[1])}.`;
      else t = `Both hydrogens can leave, giving double bonds ${bond(p)} and ${bond(products[1])}. The two alkenes are equally substituted, so neither is favoured by the Zaitsev rule.`;
      ex.push({ k: "product", t: "The alkene", h: t });
      ex.push({ k: "rate", t: "How fast", h: slow
        ? `Chair ${form} is the less stable chair (about ${nstr(rf)} against about ${nstr(of)} kcal/mol), so very few molecules are in the reactive shape at any moment. The reaction is slow because it must go through a scarcely populated chair.`
        : an.stable === "equal" ? `The two chairs are equal in energy, so half of the molecules are in the reactive chair ${form} at any moment. The reaction goes at a normal rate.`
          : `Chair ${form} is also the more stable chair (about ${nstr(rf)} against about ${nstr(of)} kcal/mol), so most molecules are already in the reactive shape. The reaction is fast.` });
    }
    const why = {}; ex.forEach(p => { why[p.k] = p.h });
    return { reactiveForm: form, antiH, products, steps: ex.map(p => p.h), explain: ex, why, lg, possible, slow, fast, stable: an.stable };
  };

  // ------------------------------------------------------------------ drawing helpers
  const REV = { CH3: "H3C", CH2CH3: "CH3CH2", CH2CH2CH3: "CH3CH2CH2", "CH(CH3)2": "(CH3)2CH", "C(CH3)3": "(CH3)3C", OH: "HO", OCH3: "CH3O", NH2: "H2N", COOH: "HOOC", CN: "NC",
    OTs: "TsO", SH: "HS", OCH2CH3: "CH3CH2O", "N(CH3)2": "(CH3)2N" };
  const textW = (t, fs) => [...t].reduce((w, ch) => w + (/\d/.test(ch) ? 0.42 : /[()]/.test(ch) ? 0.36 : /[a-z]/.test(ch) ? 0.52 : 0.7), 0) * fs;
  // a group label with subscripts; written backwards (H3C) when the bond arrives from the right
  function label(g, x, y, anchor, cls, fs, extra) {
    const t = anchor === "end" && REV[g] ? REV[g] : String(g); let out = "", down = false;
    t.split(/(\d+)/).forEach(run => {
      if (!run) return;
      if (/^\d+$/.test(run)) { out += `<tspan dy="${down ? 0 : 3}" font-size="${f1(fs * 0.72)}">${run}</tspan>`; down = true }
      else { out += `<tspan dy="${down ? -3 : 0}">${esc(run)}</tspan>`; down = false }
    });
    const w = textW(t, fs), x0 = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    return { html: `<text class="${cls}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${fs}" fill="currentColor"${extra || ""}>${out}</text>`, box: [x0, y - fs * 0.85, x0 + w, y + fs * 0.35] };
  }
  C.label = label;
  const grow = (b, a) => { b[0] = Math.min(b[0], a[0]); b[1] = Math.min(b[1], a[1]); b[2] = Math.max(b[2], a[2]); b[3] = Math.max(b[3], a[3]); return b };
  function mk(cls, box, aria, inner, role) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"), p = 6, w = box[2] - box[0] + 2 * p, h = box[3] - box[1] + 2 * p;
    s.setAttribute("class", cls); s.setAttribute("viewBox", `${f1(box[0] - p)} ${f1(box[1] - p)} ${f1(w)} ${f1(h)}`);
    s.setAttribute("width", Math.round(w)); s.setAttribute("height", Math.round(h)); s.setAttribute("role", role || "img"); s.setAttribute("aria-label", aria);
    s.innerHTML = inner; return s;
  }
  C.mk = mk;
  const unit = (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d] };
  const AXC = "var(--ax, #b4530a)", EQC = "var(--eq, #1d5fd1)", HLC = "var(--hl, #ffd60a)";

  // ------------------------------------------------------------------ the chair drawing
  // Two fixed sets of ring points. Opposite ring bonds are parallel, and x0 − x1 + x2 = 0, which makes "vertical" the true
  // axial direction of this projection. Form A is the mirror image of form B, with carbon 1 kept at the left tip.
  const SC = 1.5, LB = 30;
  const PB = [[-60, 17], [-34, -17], [26, -3], [60, -17], [34, 17], [-26, 3]].map(p => [p[0] * SC, p[1] * SC]);
  const PA = PB.map((_, j) => { const p = PB[mod6(3 - j)]; return [-p[0], p[1]] });
  function norm(o) {
    o = o || {}; const hl = new Set(), hc = new Set();
    [].concat(o.highlight || []).forEach(x => { if (/^[1-6][ud]$/.test(String(x))) hl.add(String(x)); else if (+x >= 1 && +x <= 6) hc.add(+x) });
    return { num: !!o.num, H: !!o.H, labels: !!o.labels, hl, hc };
  }
  function geo(subs, form, o) {
    const P = form === "B" ? PB : PA, items = [], nums = [];
    for (let i = 0; i < 6; i++) {
      const c = i + 1, here = subs.filter(s => s.c === c), p = P[i];
      const q1 = P[mod6(i + 1)], q2 = P[mod6(i + 2)], e = unit(q1[0] - q2[0], q1[1] - q2[1]);     // equatorial: parallel to the ring bond one bond away, pointing out
      const upC = axUp(c, form);
      nums.push([p[0] - e[0] * 10, p[1] - e[1] * 10 + 3]);
      for (const f of ["u", "d"]) {
        const sub = here.find(s => s.face === f), key = c + f, lit = o.hl.has(key);
        const mode = sub ? "g" : (o.H || lit) ? "h" : here.length ? "stub" : null; if (!mode) continue;
        const ax = (f === "u") === upC, d = ax ? [0, f === "u" ? -1 : 1] : e;
        const len = mode === "g" ? LB : mode === "h" ? 22 : 15, fs = mode === "g" ? 12 : 10;
        const x2 = p[0] + d[0] * len, y2 = p[1] + d[1] * len, side = Math.abs(d[0]) > 0.8;
        // the letter a or e sits beside the bond, on the side away from this carbon's other bond
        let n = [d[1], -d[0]]; if (ax) n = [1, 0]; else if ((n[1] > 0) !== upC) n = [-n[0], -n[1]];
        items.push({ key, c, f, g: sub ? sub.g : "H", mode, ax, lit, fs, x1: p[0], y1: p[1], x2, y2, anchor: side ? (d[0] < 0 ? "end" : "start") : "middle",
          lx: side ? x2 + d[0] * 4 : x2, ly: side ? y2 + fs * 0.33 + d[1] * 4 : d[1] < 0 ? y2 - fs * 0.4 : y2 + fs * 1.05,
          ex: (p[0] + x2) / 2 + n[0] * 7, ey: (p[1] + y2) / 2 + n[1] * 7 + 3 });
      }
    }
    return { P, items, nums };
  }
  function mix(a, b, t) {
    const L = (x, y) => x + (y - x) * t, src = t < 0.5 ? a : b;
    return { P: a.P.map((p, i) => [L(p[0], b.P[i][0]), L(p[1], b.P[i][1])]), nums: a.nums.map((p, i) => [L(p[0], b.nums[i][0]), L(p[1], b.nums[i][1])]),
      items: a.items.map((x, k) => { const y = b.items[k], s = src.items[k]; return Object.assign({}, s, { x1: L(x.x1, y.x1), y1: L(x.y1, y.y1), x2: L(x.x2, y.x2), y2: L(x.y2, y.y2), lx: L(x.lx, y.lx), ly: L(x.ly, y.ly), ex: L(x.ex, y.ex), ey: L(x.ey, y.ey) }) }) };
  }
  function paint(G, o) {
    const box = [-92, -28, 92, 28];
    let h = `<polygon points="${G.P.map(p => f1(p[0]) + "," + f1(p[1])).join(" ")}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`;
    o.hc.forEach(c => { const p = G.P[c - 1]; h += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="6.5" fill="${HLC}" fill-opacity=".55"/>` });
    G.items.forEach(it => {
      const col = it.ax ? AXC : EQC;
      h += `<line class="ch-b ${it.ax ? "ch-ax" : "ch-eq"}" x1="${f1(it.x1)}" y1="${f1(it.y1)}" x2="${f1(it.x2)}" y2="${f1(it.y2)}" stroke="${col}" stroke-width="${it.lit ? 2.8 : 1.7}" stroke-linecap="round"/>`;
      const lb = label(it.g, it.lx, it.ly, it.anchor, it.mode === "g" ? "ch-lab" : "ch-lab ch-h", it.fs, it.mode === "g" ? "" : ' fill-opacity=".72"');
      if (it.lit) h += `<circle cx="${f1((lb.box[0] + lb.box[2]) / 2)}" cy="${f1(it.ly - it.fs * 0.33)}" r="${f1(Math.max(8.5, (lb.box[2] - lb.box[0]) / 2 + 3))}" fill="${HLC}" fill-opacity=".55"/>`;
      h += lb.html; grow(box, lb.box); grow(box, [it.x2 - 2, it.y2 - 2, it.x2 + 2, it.y2 + 2]);
      if (o.labels && it.mode !== "stub") { h += `<text class="ch-ae" x="${f1(it.ex)}" y="${f1(it.ey)}" text-anchor="middle" font-size="9.5" font-style="italic" font-weight="600" fill="${col}">${it.ax ? "a" : "e"}</text>`; grow(box, [it.ex - 4, it.ey - 8, it.ex + 4, it.ey + 2]) }
    });
    if (o.num) G.nums.forEach((p, i) => { h += `<text class="ch-num" x="${f1(p[0])}" y="${f1(p[1])}" text-anchor="middle" font-size="9" fill="currentColor" fill-opacity=".62">${i + 1}</text>`; grow(box, [p[0] - 4, p[1] - 8, p[0] + 4, p[1] + 2]) });
    return { html: h, box };
  }
  const chairAria = (subs, form) => `Chair ${form}: ` + (subs.length ? list(subs.map(s => `${noun(s.g)} on carbon ${s.c}, ${FACE[s.face]}, ${POS[C.pos(s, form)]}`)) : "cyclohexane with no substituents") + ".";
  C.svg = (input, form, opt) => {
    const o = norm(opt), subs = C.parse(input), F = form === "B" ? "B" : "A", p = paint(geo(subs, F, o), o);
    return mk("chair-svg", p.box, chairAria(subs, F), p.html);
  };
  // one frame of the ring flip: form `from` at t = 0, form `to` at t = 1, in a box that fits both
  function stage(subs, from, to, t, o, box) {
    if (!o || !o.hl) o = norm(o);
    const a = geo(subs, from, o), b = geo(subs, to, o);
    if (!box) box = grow(paint(a, o).box, paint(b, o).box);
    const G = t <= 0 ? a : t >= 1 ? b : mix(a, b, t);
    return { svg: mk("chair-svg", box, chairAria(subs, t < 0.5 ? from : to), paint(G, o).html), box };
  }

  // ------------------------------------------------------------------ the flat ring
  function ringSvg(input, o) {
    o = o || {}; const subs = C.parse(input), pick = !!o.pick, R = pick ? 46 : 30, L = pick ? 30 : 22, FAN = (pick ? 30 : 28) * Math.PI / 180, fs = 12;
    const ang = i => (-90 + 60 * i) * Math.PI / 180, pt = i => [R * Math.cos(ang(i)), R * Math.sin(ang(i))];
    const box = [-R - 2, -R - 2, R + 2, R + 2], P = [0, 1, 2, 3, 4, 5].map(pt), xy = p => f1(p[0]) + "," + f1(p[1]);
    let h = `<polygon points="${P.map(xy).join(" ")}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`;
    if (o.dbl) {
      const a = P[o.dbl[0] - 1], b = P[o.dbl[1] - 1], m = unit(-(a[0] + b[0]), -(a[1] + b[1]));
      const a2 = [a[0] + (b[0] - a[0]) * 0.15 + m[0] * 5, a[1] + (b[1] - a[1]) * 0.15 + m[1] * 5], b2 = [b[0] + (a[0] - b[0]) * 0.15 + m[0] * 5, b[1] + (a[1] - b[1]) * 0.15 + m[1] * 5];
      h += `<line x1="${f1(a2[0])}" y1="${f1(a2[1])}" x2="${f1(b2[0])}" y2="${f1(b2[1])}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`;
    }
    if (o.num) P.forEach((p, i) => { const q = unit(p[0], p[1]), k = R - (pick ? 12 : o.dbl ? 11 : 9); h += `<text class="ch-num" x="${f1(q[0] * k)}" y="${f1(q[1] * k + 3)}" text-anchor="middle" font-size="9" fill="currentColor" fill-opacity=".62">${i + 1}</text>` });
    for (let i = 0; i < 6; i++) {
      const c = i + 1, here = subs.filter(s => s.c === c), faces = ["u", "d"].filter(f => pick || here.some(s => s.face === f)), p = P[i], plain = o.plain && o.plain.includes(c);
      faces.forEach(f => {
        const sub = here.find(s => s.face === f), a = ang(i) + (faces.length === 2 ? (f === "u" ? -FAN : FAN) : 0), d = [Math.cos(a), Math.sin(a)];
        const e = [p[0] + d[0] * L, p[1] + d[1] * L], n = [-d[1], d[0]], dim = sub ? "" : ' stroke-opacity=".4"';
        let g = "";
        if (sub && plain) g += `<line x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(e[0])}" y2="${f1(e[1])}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`;
        else if (f === "u") g += `<polygon class="rg-wedge" points="${xy(p)} ${xy([e[0] + n[0] * 3.4, e[1] + n[1] * 3.4])} ${xy([e[0] - n[0] * 3.4, e[1] - n[1] * 3.4])}" ${sub ? 'fill="currentColor" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"' : 'fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2.5 2" stroke-opacity=".5"'}/>`;
        else for (let k = 1; k <= 6; k++) { const t = k / 6.2, w = 0.6 + 3 * t, m = [p[0] + d[0] * L * t, p[1] + d[1] * L * t]; g += `<line class="rg-hash" x1="${f1(m[0] + n[0] * w)}" y1="${f1(m[1] + n[1] * w)}" x2="${f1(m[0] - n[0] * w)}" y2="${f1(m[1] - n[1] * w)}" stroke="currentColor" stroke-width="1.3"${dim}/>` }
        const side = Math.abs(d[0]) > 0.3, anchor = side ? (d[0] < 0 ? "end" : "start") : "middle";
        const lx = e[0] + d[0] * 5, ly = side ? e[1] + 4 + d[1] * 7 : d[1] < 0 ? e[1] - 5 : e[1] + 14;
        if (sub) { const lb = label(sub.g, lx, ly, anchor, "rg-lab", fs); g += lb.html; grow(box, lb.box) }
        grow(box, [e[0] - 4, e[1] - 4, e[0] + 4, e[1] + 4]);
        if (pick) {
          const hc = [e[0] + d[0] * 9, e[1] + d[1] * 9];
          if (!sub) g += `<text x="${f1(hc[0])}" y="${f1(hc[1] + 4)}" text-anchor="middle" font-size="12" fill="currentColor" fill-opacity=".55">+</text>`;
          g = `<g class="rp${sub ? " on" : ""}" data-pos="${c}${f}" role="button" tabindex="0" aria-pressed="${sub ? "true" : "false"}" aria-label="Carbon ${c}, ${FACE[f]}: ${sub ? noun(sub.g) + ". Press to remove it" : "empty. Press to add the chosen group"}"><circle class="rp-hit" cx="${f1(hc[0])}" cy="${f1(hc[1])}" r="13" fill="transparent" stroke="transparent"/>${g}</g>`;
          grow(box, [hc[0] - 14, hc[1] - 14, hc[0] + 14, hc[1] + 14]);
        }
        h += g;
      });
    }
    const said = subs.length ? list(subs.map(s => `${noun(s.g)} on carbon ${s.c}, ${plain(o, s.c) ? "on the double bond" : s.face === "u" ? "up (wedge)" : "down (hashed)"}`)) : "no substituents";
    const aria = o.dbl ? `Cyclohexene ring with the double bond between carbons ${o.dbl[0]} and ${o.dbl[1]}: ${said}.` : `Flat cyclohexane ring, carbon 1 at the top, numbered clockwise: ${said}.`;
    return mk("ring-svg" + (pick ? " ring-pick" : ""), box, aria, h, pick ? "group" : "img");
  }
  function plain(o, c) { return !!(o.plain && o.plain.includes(c)) }
  C.ring = (input, opt) => ringSvg(input, { num: !!(opt && opt.num) });
  // the alkene an E2 gives: the leaving group gone, a double bond between its carbon and carbon n
  C.alkene = (input, lgCarbon, n) => {
    const subs = C.parse(input), on = subs.filter(s => s.c === +lgCarbon), lg = on.find(s => /^(Cl|Br|I|F|OTs|OMs|OTf)$/.test(s.g)) || on[0];
    return ringSvg(subs.filter(s => s !== lg), { num: true, dbl: [+lgCarbon, +n], plain: [+lgCarbon, +n] });
  };

  // ------------------------------------------------------------------ tokens: [[ring:SUBS|num]] and [[chair:SUBS|A|num|H|labels]]
  ORGO.tokens = ORGO.tokens || {};
  ORGO.tokens.ring = (arg, inline) => { const p = String(arg).split("|"), s = C.ring(p[0], { num: p.slice(1).includes("num") }); if (inline) s.classList.add("inline"); return s };
  ORGO.tokens.chair = (arg, inline) => {
    const p = String(arg).split("|"), f = p.slice(1), s = C.svg(p[0], f.includes("B") ? "B" : "A", { num: f.includes("num"), H: f.includes("H"), labels: f.includes("labels") });
    if (inline) s.classList.add("inline"); return s;
  };

  // ------------------------------------------------------------------ small UI pieces
  const put = (host, node) => { host.textContent = ""; host.appendChild(node); return host };
  const stepsList = texts => el("div", { class: "steps" }, texts.map((t, i) => el("div", { class: "step" }, el("span", { class: "step-n" }, String(i + 1)), el("div", {}, t))));
  const KIT = "Your model kit is allowed on the exam. Build this ring and flip it in your hands: it is the surest way to check a chair.";
  const where = (subs, form) => subs.length ? subs.map(s => `${cap(noun(s.g))} on carbon ${s.c}: ${POS[C.pos(s, form)]}.`).join(" ") : "Every position holds a hydrogen.";
  function chairCard(subs, form, an, o) {
    return el("figure", { class: "chair-fig" }, el("div", { class: "chair-stage" }, C.svg(subs, form, o)),
      el("figcaption", {}, el("b", {}, "Chair " + form), an.stable === form ? el("span", { class: "badge" }, "more stable") : null, el("br"), where(subs, form), el("br"), `Cost: about ${nstr(an.forms[form].cost)} kcal/mol.`));
  }

  // ------------------------------------------------------------------ the lab
  C.lab = (host, opt) => {
    let subs = C.parse(opt && opt.subs != null ? opt.subs : "1u:CH3,2d:CH3"), group = "CH3", showH = false, showNum = true, flipped = false, busy = false;
    const PAL = ["CH3", "CH2CH3", "CH(CH3)2", "C(CH3)3", "F", "Cl", "Br", "I", "OH", "OCH3", "NH2", "Ph", "OTs"];
    host.textContent = "";
    const palette = el("div", { class: "row chair-palette", role: "group", "aria-label": "Group to add" });
    const pickBox = el("div", { class: "chair-pick" }), figL = el("figure", { class: "chair-fig" }), figR = el("figure", { class: "chair-fig" });
    const stL = el("div", { class: "chair-stage" }), stR = el("div", { class: "chair-stage" }), capL = el("figcaption", {}), capR = el("figcaption", {});
    figL.append(stL, capL); figR.append(stR, capR);
    const verdict = el("div", { class: "chair-verdict stack", "aria-live": "polite" });
    const flipBtn = el("button", { class: "btn primary", type: "button", on: { click: flip } }, "Flip the ring");
    const tog = (text, get, set) => { const b = el("button", { class: "btn small", type: "button", "aria-pressed": String(get()), on: { click: () => { set(!get()); b.setAttribute("aria-pressed", String(get())); drawChairs() } } }, text); return b };
    const opts = () => ({ H: showH, num: showNum, labels: true });
    PAL.forEach(g => palette.appendChild(el("button", { class: "chip" + (g === group ? " on" : ""), type: "button", "aria-pressed": String(g === group), "aria-label": noun(g), data: { g }, html: `{{${g}}}`,
      on: { click: () => { group = g; [...palette.children].forEach(b => { const on = b.dataset.g === g; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)) }) } } })));
    function drawPick(focusKey) {
      const s = ringSvg(subs, { num: true, pick: true }); put(pickBox, s);
      s.querySelectorAll("[data-pos]").forEach(g => {
        const act = () => { const key = g.dataset.pos, c = +key[0], f = key[1], at = subs.findIndex(x => x.c === c && x.face === f); if (at >= 0) subs.splice(at, 1); else subs.push({ c, face: f, g: group }); drawPick(key); drawChairs() };
        g.addEventListener("click", act); g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act() } });
      });
      if (focusKey) { const f = s.querySelector(`[data-pos="${focusKey}"]`); if (f && f.focus) f.focus() }
    }
    function caption(cap1, form, an) {
      cap1.textContent = ""; const F = an.forms[form];
      cap1.append(el("b", {}, "Chair " + form), " ", an.stable === form ? el("span", { class: "badge" }, "more stable") : an.stable === "equal" ? el("span", { class: "badge" }, "equal in energy") : "",
        el("br"), "Axial: " + (F.axial.length ? list(F.axial.map(s => `${noun(s.g)} on carbon ${s.c}`)) : "nothing") + ".", el("br"), `Cost: about ${nstr(F.cost)} kcal/mol.`);
    }
    function drawChairs() {
      const an = C.analyze(subs), l = flipped ? "B" : "A", r = flipped ? "A" : "B", o = opts(), box = stage(subs, "A", "B", 0, o).box;
      put(stL, stage(subs, l, r, 0, o, box).svg); put(stR, stage(subs, r, l, 0, o, box).svg); caption(capL, l, an); caption(capR, r, an);
      verdict.textContent = "";
      const b = t => el("span", { class: "badge" }, t);
      verdict.append(el("div", { class: "row" }, an.cisTrans ? b(an.cisTrans) : null, b(an.stable === "equal" ? "the chairs are equal in energy" : "chair " + an.stable + " is more stable"),
        b(an.relation === "same" ? "the two chairs are the same" : "the two chairs are " + an.relation), b(an.chiral ? "chiral molecule" : "achiral molecule")),
        el("p", { class: "small muted" }, `Costs are approximate: the A-value of each axial group, ${nstr(GAUCHE)} for each gauche pair of neighbouring groups, ${nstr(DIAX)} for each 1,3-diaxial pair of groups. Axial bonds are marked a, equatorial bonds e.`),
        stepsList(an.steps), el("div", { class: "callout info" }, KIT));
    }
    function flip() {
      if (busy) return;
      const from = flipped ? "B" : "A", to = flipped ? "A" : "B", o = opts();
      const done = () => { flipped = !flipped; busy = false; drawChairs() };
      if (ORGO.reduced || !window.requestAnimationFrame) return done();
      busy = true; const box = stage(subs, "A", "B", 0, o).box; let t0 = null;
      const tick = now => {
        if (t0 == null) t0 = now; const t = Math.min(1, (now - t0) / 900), e = 0.5 - 0.5 * Math.cos(Math.PI * t);
        put(stL, stage(subs, from, to, e, o, box).svg); put(stR, stage(subs, to, from, e, o, box).svg);
        if (t < 1) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    }
    host.appendChild(el("div", { class: "chair-lab stack" },
      el("p", { class: "small muted" }, "Choose a group, then press a position on the flat ring to add it. Press a filled position to remove it. A solid wedge points up, toward you. A hashed wedge points down, away from you."),
      palette,
      el("div", { class: "chair-lab-main" },
        el("div", { class: "panel chair-picker" }, pickBox, el("button", { class: "btn small ghost", type: "button", on: { click: () => { subs = []; drawPick(); drawChairs() } } }, "Clear the ring")),
        el("div", { class: "stack" }, el("div", { class: "chair-pair" }, figL, figR),
          el("div", { class: "btn-row" }, flipBtn, tog("All hydrogens", () => showH, v => { showH = v }), tog("Numbers", () => showNum, v => { showNum = v })))),
      verdict));
    drawPick(); drawChairs();
    return { get subs() { return C.str(subs) }, flip };
  };

  // ------------------------------------------------------------------ questions
  C.ask = (host, item, onDone) => {
    const subs = C.parse(item.subs), an = C.analyze(subs), want = item.ask || ["stable"], given = item.given || "ring";
    const gForm = given === "chairB" ? "B" : given === "chairA" ? "A" : null, tForm = gForm === "A" ? "B" : "A";      // tForm: the chair the student builds
    const ex = want.includes("e2") ? C.e2(subs, item.lg == null ? 1 : item.lg) : null;
    const tasks = [], draw = { num: true, labels: true };
    const choice = (prompt, options, okKeys, why, extra) => ({ render(box, done) {
      box.appendChild(el("p", { class: "chair-q" }, prompt));
      const opts = el("div", { class: "opts" + (options.some(o => o[2]) ? " chair-opts-fig" : "") }); box.appendChild(opts);
      options.forEach(([key, text, fig]) => {
        const b = el("button", { class: "opt", type: "button", data: { key } }, fig || null, el("span", {}, text)); opts.appendChild(b);
        b.addEventListener("click", () => {
          const ok = okKeys.includes(key);
          [...opts.children].forEach(x => {
            x.disabled = true; const good = okKeys.includes(x.dataset.key);
            if (good) { x.classList.add("right"); x.dataset.c = "true" }
            if (x === b) { x.classList.add("picked"); if (!good) x.classList.add("wrong") }
            const tag = x === b ? (good ? "your answer, and it is right" : "your answer") : good ? "the right answer" : "";
            if (tag) x.appendChild(el("span", { class: "small chair-tag" }, " (" + tag + ")"));
          });
          done(ok, why, extra && extra());
        });
      });
    } });
    if (want.includes("cis-trans") && an.cisTrans) tasks.push(choice("Is this the cis isomer or the trans isomer?", [["cis", "cis"], ["trans", "trans"]], [an.cisTrans], an.why.faces));
    if ((want.includes("flip") || want.includes("stable")) && subs.length) tasks.push({ render(box, done) {
      box.appendChild(el("p", { class: "chair-q" }, gForm ? `Now flip the ring. In the other chair, chair ${tForm}, where does each group sit?` : "Draw chair A on paper: the chair in which the axial bond on carbon 1 points up. Where does each group sit?"));
      box.appendChild(el("div", { class: "chair-template" }, C.svg([], tForm, { num: true, H: true, labels: true }), el("p", { class: "small muted" }, `Chair ${tForm} with every position shown: a is axial, e is equatorial.`)));
      const picks = subs.map(() => null), rows = [], check = el("button", { class: "btn primary", type: "button", disabled: true }, "Check");
      subs.forEach((s, i) => {
        const seg = el("span", { class: "seg", role: "group", "aria-label": `${noun(s.g)} on carbon ${s.c}` }), mark = el("span", { class: "chair-rowmark" });
        ["ax", "eq"].forEach(p => seg.appendChild(el("button", { type: "button", class: "btn small", "aria-pressed": "false", data: { p }, on: { click: e => { picks[i] = p; [...seg.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === p))); check.disabled = picks.some(x => !x); e.preventDefault() } } }, POS[p])));
        rows.push({ seg, mark }); box.appendChild(el("div", { class: "chair-row" }, el("span", {}, `${cap(noun(s.g))} on carbon ${s.c} (${FACE[s.face]})`), seg, mark));
      });
      check.addEventListener("click", () => {
        let all = true;
        subs.forEach((s, i) => { const good = picks[i] === C.pos(s, tForm); if (!good) all = false; [...rows[i].seg.children].forEach(b => { b.disabled = true });
          rows[i].mark.appendChild(el("span", { class: good ? "mark-ok" : "mark-no" }, good ? "Right" : "Not quite: it is " + POS[C.pos(s, tForm)])) });
        check.remove(); done(all, an.why[tForm === "A" ? "chairA" : "chairB"] || an.why.chairA, el("div", { class: "chair-pair" }, chairCard(subs, "A", an, draw), chairCard(subs, "B", an, draw)));
      });
      box.appendChild(check);
    } });
    if (want.includes("stable")) tasks.push(gForm
      ? choice(`Is chair ${gForm}, the one you were given, the more stable chair?`, [["given", `Yes, chair ${gForm} is more stable`], ["other", `No, the flipped chair ${tForm} is more stable`], ["equal", "Neither: the two chairs are equal in energy"]],
        [an.stable === "equal" ? "equal" : an.stable === gForm ? "given" : "other"], an.why.cost + " " + an.why.stable)
      : choice("Which chair is more stable: chair A, or chair B, its ring flip?", [["A", "Chair A"], ["B", "Chair B"], ["equal", "They are equal in energy"]], [an.stable], an.why.cost + " " + an.why.stable));
    if (want.includes("relationship")) tasks.push(choice("How are the two chairs related to each other?",
      [["same", "The same: one can be laid exactly on the other"], ["enantiomers", "Enantiomers: mirror images that cannot be laid on each other"], ["diastereomers", "Diastereomers: different shapes that are not mirror images"]], [an.relation], an.why.relation));
    if (ex && ex.reactiveForm) {
      const lgc = ex.lg.c, cs = [1, 2, 3, 4, 5, 6].filter(c => c !== lgc);
      tasks.push({ render(box, done) {
        box.appendChild(el("p", { class: "chair-q" }, `A strong base removes a hydrogen that is anti-periplanar to the ${noun(ex.lg.g)} on carbon ${lgc}. Press every carbon that has such a hydrogen, or press None.`));
        const row = el("div", { class: "chair-row", role: "group", "aria-label": "Carbons whose hydrogen can leave" }), sel = new Set(), check = el("button", { class: "btn primary", type: "button", disabled: true }, "Check");
        const btn = (key, text) => { const b = el("button", { class: "chip", type: "button", "aria-pressed": "false", data: { key: String(key) } }, text); b.addEventListener("click", () => {
          if (key === "none") { sel.clear(); sel.add("none") } else { sel.delete("none"); sel.has(key) ? sel.delete(key) : sel.add(key) }
          [...row.children].forEach(x => { const on = sel.has(x.dataset.key === "none" ? "none" : +x.dataset.key); x.setAttribute("aria-pressed", String(on)); x.classList.toggle("on", on) }); check.disabled = !sel.size }); row.appendChild(b) };
        cs.forEach(c => btn(c, "Carbon " + c)); btn("none", "None");
        check.addEventListener("click", () => {
          const mine = [...sel].filter(x => x !== "none").sort(), good = mine.length === ex.antiH.length && ex.antiH.slice().sort().every((c, i) => c === mine[i]);
          [...row.children].forEach(x => { x.disabled = true }); check.remove();
          const o = { num: true, labels: true, highlight: [lgc + ex.lg.face].concat(ex.antiH.map(c => c + (axUp(c, ex.reactiveForm) ? "u" : "d"))) };
          done(good, [ex.why.rule, ex.why.form, ex.why.anti].join(" "), el("div", { class: "chair-template" }, C.svg(subs, ex.reactiveForm, o), el("p", { class: "small muted" }, `Chair ${ex.reactiveForm}, the chair that reacts. The leaving group and each hydrogen that can leave are marked.`)));
        });
        box.append(row, check);
      } });
      const near = [lgc % 6 + 1, mod6(lgc - 2) + 1], top = ex.products[0];
      tasks.push(choice("Which alkene is the major product of the E2 reaction?",
        near.map(n => ["" + n, `Double bond between carbons ${lgc} and ${n}`, C.alkene(subs, lgc, n)]).concat([["none", "No alkene: E2 cannot happen here"]]),
        top ? ex.products.filter(p => p.zaitsev === top.zaitsev).map(p => "" + p.between[1]) : ["none"], [ex.why.product, ex.why.rate].filter(Boolean).join(" ")));
    }
    // run the tasks one at a time, keeping the earlier ones on the page
    host.textContent = "";
    const givenFig = gForm ? C.svg(subs, gForm, { num: true, labels: true }) : C.ring(subs, { num: true });
    const body = el("div", { class: "stack chair-tasks" });
    host.appendChild(el("div", { class: "chair-ask stack" }, el("div", { class: "chair-given" }, givenFig,
      el("p", { class: "small muted" }, gForm ? `Chair ${gForm}. Axial bonds are marked a, equatorial bonds e.` : "A solid wedge points up, toward you. A hashed wedge points down, away from you.")), body));
    let i = 0, right = 0, ended = false;
    function finish() {
      if (ended) return; ended = true;
      const score = tasks.length ? right / tasks.length : 1;
      body.appendChild(el("div", { class: "panel stack chair-summary" },
        el("p", {}, el("b", {}, tasks.length ? `You got ${right} of ${tasks.length} right on the first try.` : "Here is the full answer.")),
        el("div", { class: "chair-pair" }, chairCard(subs, "A", an, draw), chairCard(subs, "B", an, draw)),
        stepsList(an.steps.concat(ex && ex.reactiveForm ? ex.steps : [])), el("div", { class: "callout info" }, KIT)));
      if (onDone) onDone({ score, right, total: tasks.length });
    }
    function next() {
      if (i >= tasks.length) return finish();
      const box = el("div", { class: "panel stack chair-task" }, el("p", { class: "eyebrow" }, `Part ${i + 1} of ${tasks.length}`)); body.appendChild(box);
      tasks[i].render(box, (ok, why, extra) => {
        if (ok) right++;
        box.appendChild(el("div", { class: "explain", role: "status" }, el("span", { class: ok ? "mark-ok" : "mark-no" }, ok ? "Right" : "Not quite"), " ", el("span", {}, why || ""), extra || null));
        i++;
        if (i < tasks.length) { const b = el("button", { class: "btn primary", type: "button", on: { click: () => { b.remove(); next() } } }, "Next part"); box.appendChild(b); if (b.focus) b.focus() }
        else finish();
      });
    }
    next();
  };

  // ------------------------------------------------------------------ fresh questions
  function rng(seed) {
    let h = 2166136261; const s = String(seed); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    let a = h >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
  }
  C.rng = rng;
  C.kinds = ["chair-read", "chair-both", "e2-ring-product"];
  C.make = (kind, seed) => {
    const rnd = rng(kind + ":" + seed), pick = a => a[Math.floor(rnd() * a.length)], face = () => rnd() < 0.5 ? "u" : "d";
    const ALK = ["CH3", "CH2CH3", "CH(CH3)2", "C(CH3)3"], ANY = ALK.concat(["CH3", "C(CH3)3", "Cl", "Br", "OH", "OCH3", "NH2", "Ph", "F", "I", "CN", "COOH"]);
    const e2 = kind === "e2-ring-product";
    let subs, an;
    for (let n = 0; n < 80; n++) {
      subs = e2 ? [{ c: 1, face: face(), g: pick(["Cl", "Br", "OTs"]) }, { c: pick([2, 2, 3, 4]), face: face(), g: pick(ALK) }]
        : [{ c: 1, face: face(), g: pick(ANY) }, { c: pick([2, 3, 4]), face: face(), g: pick(rnd() < 0.5 ? ALK : ANY) }];
      an = C.analyze(subs);
      if (an.stable === "equal" || Math.abs(an.forms.A.cost - an.forms.B.cost) >= 0.3) break;       // no near ties
    }
    const item = { id: "gen:" + kind + ":" + seed, type: kind, kind: "chair", role: "practice", diff: 2, skills: [], src: "site", subs: C.str(subs) };
    const st = an.stable === "equal" ? "The two chairs are equal in energy" : `Chair ${an.stable} is the more stable chair`;
    if (e2) {
      const x = C.e2(subs, 1), p = x.products[0];
      Object.assign(item, { given: "ring", ask: ["e2"], lg: 1,
        stem: "This compound is heated with a strong base, {{NaOCH2CH3}} in {{CH3CH2OH}}. Decide which ring hydrogens can leave in an {{E2}} elimination, then choose the major alkene.",
        solution: { steps: x.explain.map(q => ({ t: q.t, h: q.h })),
          answer: p ? `The hydrogen on carbon ${list(x.antiH.map(String))} can leave. The major alkene has its double bond between carbons ${p.between[0]} and ${p.between[1]}. The reaction is ${x.slow ? "slow" : "not held back by the ring"}.` : "No hydrogen is anti-periplanar to the leaving group, so E2 cannot happen.",
          rule: "E2 on a ring needs the leaving group axial and an axial hydrogen on the next carbon. Draw the chair with the leaving group axial first." } });
    } else if (kind === "chair-both") {
      Object.assign(item, { given: "ring", ask: ["stable", "relationship"],
        stem: "Draw both chairs of this compound on paper. Then say which chair is more stable and how the two chairs are related.",
        solution: { steps: an.explain.filter(q => q.k !== "chiral").map(q => ({ t: q.t, h: q.h })), answer: `${st}. The two chairs are ${an.relation === "same" ? "the same" : an.relation}.`,
          rule: "Up stays up when the ring flips, axial and equatorial trade places. The chair with the bigger group equatorial is the more stable one." } });
    } else {
      const form = pick(["A", "B"]);
      Object.assign(item, { given: "chair" + form, ask: ["cis-trans", "stable"],
        stem: "One chair of a disubstituted cyclohexane is drawn. Decide whether the compound is cis or trans, then flip the ring and say which chair is more stable.",
        solution: { steps: an.explain.filter(q => q.k !== "chiral" && q.k !== "relation").map(q => ({ t: q.t, h: q.h })), answer: `This is the ${an.cisTrans} isomer. ${st}.`,
          rule: "Read up and down from the chair, not axial and equatorial: same face is cis, opposite faces is trans. The bigger group wants to be equatorial." } });
    }
    return item;
  };
})();
