// CHEM 225 · structures, reaction schemes and curved arrows: ORGO.mol.
// Drawings come from ORGO.data.mols[key] (made by tools/chem.py):
//   {w, h, p: [[bond | -1, path d, kind]], t: [[atom, x, y, size, text]], a: [[x, y, el, charge, lone pairs, nH, map]], b: [[i, j, order]]}
// Atoms are addressed by map number. An atom with no map number gets the address -(index + 1).
// An arrow is {from: {lp: n} | {bond: [a, b]}, to: {atom: n} | {bond: [a, b]}} and moves one electron pair.
// Nothing here touches the DOM when the file loads, so node can load it for tests.
(() => {
  const W = typeof window !== "undefined" ? window : globalThis;
  const ORGO = W.ORGO = W.ORGO || {};
  ORGO.tokens = ORGO.tokens || {};
  const el = (...a) => ORGO.el(...a);
  const mols = () => (ORGO.data && ORGO.data.mols) || {};
  const getD = d => typeof d === "string" ? mols()[d] : d;

  const UNIT = 1.5;       // drawing units -> px for a figure (a bond is about 27 units, a label about 10)
  const INLINE = 0.62;    // drawings inside a sentence
  const STAGE = 2;        // a mechanism step: big enough for 28 px pick targets that do not overlap
  const PAD = 24;         // room around a step for arrows, in drawing units
  const FONT = "Arial, Helvetica, sans-serif";

  const NAMES = { H: "hydrogen", D: "deuterium", C: "carbon", N: "nitrogen", O: "oxygen", S: "sulfur", P: "phosphorus", F: "fluorine", Cl: "chlorine", Br: "bromine", I: "iodine", B: "boron", Li: "lithium", Na: "sodium", K: "potassium", Mg: "magnesium", Si: "silicon", Al: "aluminium", Zn: "zinc", Cu: "copper" };
  const EN = { H: 2.2, C: 2.55, N: 3.04, O: 3.44, F: 3.98, Cl: 3.16, Br: 2.96, I: 2.66, S: 2.58, P: 2.19, B: 2.04, Li: 0.98, Na: 0.93, K: 0.82, Mg: 1.31 };
  // allowed total bond counts (sum of bond orders, hydrogens included) for element + formal charge: the table in tools/chem.py
  const ALLOWED = {
    H0: [1], H1: [0], "H-1": [0], C0: [4], C1: [3], "C-1": [3], N0: [3], N1: [4], "N-1": [2], O0: [2], O1: [3], "O-1": [1],
    S0: [2, 4, 6], S1: [3, 5], "S-1": [1], P0: [3, 5], P1: [4], F0: [1], "F-1": [0],
    Cl0: [1], "Cl-1": [0], Cl1: [2], Br0: [1], "Br-1": [0], Br1: [2], I0: [1], "I-1": [0], I1: [2], B0: [3], "B-1": [4],
    Li0: [1], Li1: [0], Na0: [1], Na1: [0], K0: [1], K1: [0], Mg0: [2], Mg1: [1], Mg2: [0]
  };
  const MOST = {}; for (const k in ALLOWED) { const e = k.replace(/-?\d+$/, ""); MOST[e] = Math.max(MOST[e] || 0, ...ALLOWED[k]) }

  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const r1 = n => Math.round(n * 10) / 10;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
  const chargeWord = q => (q < 0 ? "minus " : "plus ") + Math.abs(q);
  const isCharge = s => /^\d*[+\-−]$/.test(s);
  const bk = (a, b) => a < b ? a + "_" + b : b + "_" + a;

  // ------------------------------------------------------------------ drawing
  function ink(d) {
    const g = el("g", { class: "mol-ink", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" });
    for (const [, path, kind] of d.p) g.appendChild(el("path", kind === 2 ? { d: path, fill: "currentColor", "stroke-width": 0.6 } : { d: path, "stroke-width": kind === 1 ? 0.8 : 1.6 }));
    for (const [, x, y, size, text] of d.t) {
      const c = isCharge(text);     // charges: a little larger, bold, with a true minus sign
      g.appendChild(el("text", { x: c ? r1(x - size * 0.05) : x, y: c ? r1(y + size * 0.1) : y, "font-size": c ? r1(size * 1.35) : size, "font-weight": c ? 700 : null, class: c ? "mol-charge" : null, fill: "currentColor", stroke: "none" }, c ? text.replace(/-/g, "−") : text));
    }
    return g;
  }
  function formulaOf(d) {
    const n = {}; let q = 0;
    for (const a of d.a) { n[a[2]] = (n[a[2]] || 0) + 1; if (a[5]) n.H = (n.H || 0) + a[5]; q += a[3] }
    const rank = e => e === "C" ? 0 : e === "H" ? 1 : 2;
    return Object.keys(n).sort((x, y) => rank(x) - rank(y) || x.localeCompare(y)).map(e => e + (n[e] > 1 ? n[e] : "")).join("") + (q ? ", charge " + chargeWord(q) : "");
  }
  const label = d => "Structure, formula " + formulaOf(d);

  // one drawing as an <svg>. opts: scale (1 is the normal figure size), inline, label
  function svg(key, o = {}) {
    const d = getD(key);
    if (!d) return el("span", { class: "fig-missing" }, typeof key === "string" ? key.split("|")[0] : "structure");
    const s = UNIT * (o.scale || 1) * (o.inline ? INLINE : 1), m = 2.5;
    // data-nolookup: Eureka's dictionary leaves a drawing alone (a double-tap on an atom label is not a question about a word)
    return el("svg", { class: "mol" + (o.inline ? " mol-inline" : ""), viewBox: `${-m} ${-m} ${r1(d.w + 2 * m)} ${r1(d.h + 2 * m)}`, width: Math.round((d.w + 2 * m) * s), height: Math.round((d.h + 2 * m) * s), role: "img", "aria-label": o.label || label(d), "font-family": FONT, "data-nolookup": "" }, ink(d));
  }

  // "SMILES" or "SMILES|abbr", "SMILES|me", "SMILES|abbr,me", with an optional display scale "s=0.8"
  function molArg(arg) {
    const parts = String(arg).split("|"), smiles = parts[0].trim(), flags = [];
    let scale = 1;
    for (const x of parts.slice(1).join(",").split(",").map(s => s.trim())) { const m = /^s=([\d.]+)$/.exec(x); if (m) scale = +m[1] || 1; else if ((x === "abbr" || x === "me") && !flags.includes(x)) flags.push(x) }
    const key = smiles + (flags.length ? "|" + flags.sort().join(",") : "");
    return { smiles, key: mols()[key] ? key : smiles, scale };
  }
  const molToken = (arg, inline) => { const a = molArg(arg); return svg(a.key, { scale: a.scale, inline }) };

  // ------------------------------------------------------------------ reaction schemes
  const ARROW_WORDS = { rxn: "gives", eq: "is in equilibrium with", eqr: "is in equilibrium with, and the right side is favoured,", eql: "is in equilibrium with, and the left side is favoured,", nr: "does not react to give" };
  const CHEMWORD = /^[-−+]?(?:[(\[]*[A-Z][a-z]?\d*[)\]]*\d*)+(?:\^\d*[-−+]|[-−+])?$/;
  // text on an arrow: chemical words are typeset, "1)", "25 °C" and "heat" stay as they are. A formula is one word for
  // Eureka's dictionary (data-lk), as ORGO.fmt marks the formulas in the text: D<sub>2</sub>O is looked up whole, not as "D"
  function cond(text) {
    return String(text).trim().split(/\s+/).filter(Boolean).map(w => {
      const m = /^(.*?)([,.;:]?)$/.exec(w);
      return (CHEMWORD.test(m[1]) && ORGO.formula ? '<span class="chem" data-lk>' + ORGO.formula(m[1]) + "</span>" : esc(m[1])) + m[2];
    }).join(" ");
  }
  function arrowSvg(kind, w) {
    const h = 16, y = 8, line = { fill: "none", stroke: "currentColor", "stroke-width": 1.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, kids = [];
    if (kind === "rxn" || kind === "nr") {
      kids.push(el("path", Object.assign({ d: `M1 ${y}H${w - 6}` }, line)), el("path", { d: `M${w - 1} ${y}l-9 -4.2v8.4z`, fill: "currentColor", stroke: "currentColor", "stroke-width": 1, "stroke-linejoin": "round" }));
      if (kind === "nr") kids.push(el("path", Object.assign({ d: `M${w / 2 - 5} ${y - 5}l10 10M${w / 2 + 5} ${y - 5}l-10 10` }, line)));
    } else {      // two half arrows: the upper one points right, the lower one left. The longer one shows the favoured side.
      const long = w - 2, short = Math.round(w * 0.5), top = kind === "eql" ? short : long, bot = kind === "eqr" ? short : long, a = (w - top) / 2, b = (w - bot) / 2;
      kids.push(el("path", Object.assign({ d: `M${a} ${y - 2.5}H${a + top}l-7 -4` }, line)), el("path", Object.assign({ d: `M${b + bot} ${y + 2.5}H${b}l7 4` }, line)));
    }
    return el("svg", { class: "scheme-line", viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: "img", "aria-label": ARROW_WORDS[kind] || ARROW_WORDS.rxn, "data-nolookup": "" }, kids);
  }
  // [[rxn:LEFT>ABOVE;BELOW>RIGHT]] and its relatives eq, eqr, eql, nr
  function scheme(arg, kind, inline) {
    kind = ARROW_WORDS[kind] ? kind : "rxn";
    const parts = String(arg).split(">"), left = parts[0], right = parts.length > 1 ? parts[parts.length - 1] : "", mid = parts.slice(1, -1).join(">");
    const semi = mid.indexOf(";"), above = (semi < 0 ? mid : mid.slice(0, semi)).trim(), below = semi < 0 ? "" : mid.slice(semi + 1).trim();
    const species = sp => {
      const q = /^\\?"(.*?)\\?"$/.exec(sp);
      if (q) { const s = el("span", { class: "scheme-label" }); s.innerHTML = ORGO.fmt ? ORGO.fmt(esc(q[1])) : esc(q[1]); return s }
      return el("span", { class: "scheme-species" }, molToken(sp, inline));
    };
    const side = s => { const out = []; s.split(" + ").map(x => x.trim()).filter(Boolean).forEach((sp, i) => { if (i) out.push(el("span", { class: "scheme-plus" }, "+")); out.push(species(sp)) }); return out };
    const words = t => { const s = el("span", { class: "scheme-text" }); s.innerHTML = t ? cond(t) : ""; return s };
    const longest = Math.max(above.length, below.length), w = Math.max(inline ? 36 : 56, Math.min(240, Math.round(longest * (inline ? 6 : 7.5) + 20)));
    const arrow = el("span", { class: "scheme-arrow" }, words(above), arrowSvg(kind, w), words(below));
    return el("span", { class: "scheme scheme-" + kind + (inline ? " scheme-inline" : "") }, side(left), arrow, side(right));
  }

  // ------------------------------------------------------------------ the chemistry of arrows
  function geom(d) {
    const by = {}, id = i => d.a[i][6] || -(i + 1), bonds = {}, boxes = d.a.map(() => []);
    d.a.forEach((a, i) => { by[id(i)] = i });
    d.b.forEach(([i, j, o]) => { bonds[bk(id(i), id(j))] = [id(i), id(j), o] });
    d.t.forEach(([i, x, y, size, text]) => {      // rough boxes around the printed characters, for where arrows may start and end
      const sz = isCharge(text) ? size * 1.35 : size; let w = 0;
      for (const ch of text) w += (/[A-Z]/.test(ch) ? 0.72 : /[a-z]/.test(ch) ? 0.5 : 0.62) * sz;
      if (boxes[i]) boxes[i].push([x, y - sz * 0.76, x + w, y + sz * 0.04]);
    });
    let cx = 0, cy = 0; d.a.forEach(a => { cx += a[0]; cy += a[1] });
    return { d, by, id, bonds, boxes, c: [cx / (d.a.length || 1), cy / (d.a.length || 1)] };
  }
  const elementOf = (G, n) => { const i = G.by[n]; return i == null ? "?" : G.d.a[i][2] };
  // "carbon 4": the element and its map number
  const atomLabel = (G, n) => { const e = elementOf(G, n); return (NAMES[e] || e) + " " + (n > 0 ? n : "x" + -n) };
  // "oxygen 1, 3 lone pairs, charge minus 1, 1 hydrogen"
  function atomName(G, n) {
    const a = G.d.a[G.by[n]];
    return atomLabel(G, n) + ", " + (a[4] ? plural(a[4], "lone pair") : "no lone pair") + (a[3] ? ", charge " + chargeWord(a[3]) : "") + (a[5] ? ", " + plural(a[5], "hydrogen") : "");
  }
  const bondName = (G, a, b) => { const o = (G.bonds[bk(a, b)] || [])[2]; return (o === 2 ? "double bond " : o === 3 ? "triple bond " : "bond ") + atomLabel(G, a) + " to " + atomLabel(G, b) };

  // a tidy copy of an arrow. A lone pair that is sent to another atom makes a bond to it.
  function clean(ar) {
    const f = (ar && ar.from) || {}, t = (ar && ar.to) || {};
    const from = f.lp != null ? { lp: +f.lp } : f.bond ? { bond: [+f.bond[0], +f.bond[1]] } : f.atom != null ? { lp: +f.atom } : null;
    let to = t.bond ? { bond: [+t.bond[0], +t.bond[1]] } : t.atom != null ? { atom: +t.atom } : null;
    if (!from || !to) throw new Error("an arrow needs a start and an end");
    if (from.lp != null && to.atom != null && to.atom !== from.lp) to = { bond: [from.lp, to.atom] };
    return { from, to };
  }
  const tidy = ar => { try { return clean(ar) } catch (e) { return null } };
  const sameBond = (p, q) => bk(p[0], p[1]) === bk(q[0], q[1]);
  // a bond's pair sent to an atom outside that bond: "that pair makes a bond to m"
  const loose = (x, y) => !!(x.from.bond && x.to.atom != null && !x.from.bond.includes(x.to.atom) && y.to.bond && y.to.bond.includes(x.to.atom) && y.to.bond.some(v => v !== x.to.atom && x.from.bond.includes(v)));
  // are two arrows the same movement of electrons, however they were clicked or written?
  function same(a, b) {
    const x = tidy(a), y = tidy(b); if (!x || !y) return false;
    if (x.from.lp != null ? x.from.lp !== y.from.lp : !(y.from.bond && sameBond(x.from.bond, y.from.bond))) return false;
    if (x.to.atom != null && y.to.atom != null) return x.to.atom === y.to.atom;
    if (x.to.bond && y.to.bond) return sameBond(x.to.bond, y.to.bond);
    return loose(x, y) || loose(y, x);
  }
  // write a clicked arrow "bond {a, b} to outside atom m" as a bond to m from a or from b
  function resolve(G, ar) {
    if (!(ar.from.bond && ar.to.atom != null) || ar.from.bond.includes(ar.to.atom)) return ar;
    const [a, b] = ar.from.bond, m = ar.to.atom, na = !!G.bonds[bk(a, m)], nb = !!G.bonds[bk(b, m)];
    const x = na !== nb ? (na ? a : b) : (EN[elementOf(G, a)] || 0) >= (EN[elementOf(G, b)] || 0) ? a : b;
    return { from: ar.from, to: { bond: [x, m] } };
  }

  // move the electrons: the rules of apply_arrows in tools/chem.py
  function apply(drawing, arrows) {
    const d = getD(drawing), problems = [], issues = [];
    if (!d) return { problems: ["There is no drawing to work on."], issues, charges: {} };
    const G = geom(d), A = d.a, lp = A.map(a => a[4]), dq = A.map(() => 0), order = {};
    for (const k in G.bonds) order[k] = G.bonds[k].slice();
    const nm = n => atomLabel(G, n);
    const bad = (k, code, text, atom) => { problems.push("Arrow " + (k + 1) + ": " + text); issues.push({ arrow: k, code, text, atom }) };
    (arrows || []).forEach((raw, k) => {
      let ar = tidy(raw); if (!ar) return bad(k, "ref", "it needs a start and an end.");
      const ends = (ar.from.lp != null ? [ar.from.lp] : ar.from.bond).concat(ar.to.atom != null ? [ar.to.atom] : ar.to.bond), lost = ends.find(n => G.by[n] == null);
      if (lost != null) return bad(k, "ref", "no atom carries the number " + lost + ".");
      ar = resolve(G, ar);
      const f = ar.from, t = ar.to;
      if ((f.bond && f.bond[0] === f.bond[1]) || (t.bond && t.bond[0] === t.bond[1])) return bad(k, "ref", "a bond needs two different atoms.");
      // take the pair from its source
      let holders, undo;
      if (f.lp != null) {
        const i = G.by[f.lp];
        if (lp[i] < 1) return bad(k, "nolp", nm(f.lp) + " has no lone pair to give.", f.lp);
        lp[i]--; holders = { [f.lp]: 2 }; undo = () => { lp[i]++ };
      } else {
        const key = bk(f.bond[0], f.bond[1]), b = order[key];
        if (!b || !b[2]) return bad(k, "nobond", "there is no bond between " + nm(f.bond[0]) + " and " + nm(f.bond[1]) + ".");
        b[2]--; holders = { [f.bond[0]]: 1, [f.bond[1]]: 1 }; undo = () => { b[2]++ };
      }
      // put it where the arrow points
      let after;
      if (t.atom != null) {
        if (!(t.atom in holders)) { undo(); return bad(k, "land", "the pair cannot land on " + nm(t.atom) + ", which is not where it started.", t.atom) }
        lp[G.by[t.atom]]++; after = { [t.atom]: 2 };
      } else {
        const [p, q] = t.bond, key = bk(p, q);
        if (!(p in holders) && !(q in holders)) { undo(); return bad(k, "newbond", "the new bond between " + nm(p) + " and " + nm(q) + " must include an atom the pair started on.") }
        const b = order[key] || (order[key] = [p, q, 0]);
        if (b[2] >= 3) { undo(); return bad(k, "triple", nm(p) + " and " + nm(q) + " already share a triple bond.") }
        b[2]++; after = { [p]: 1, [q]: 1 };
      }
      // formal charges by the sharing rule
      for (const n in holders) dq[G.by[n]] += holders[n];
      for (const n in after) dq[G.by[n]] -= after[n];
    });
    // every atom must end with a sensible number of bonds for its charge
    const tot = A.map(a => a[5]), charges = {};
    for (const k in order) { const [p, q, o] = order[k]; tot[G.by[p]] += o; tot[G.by[q]] += o }
    A.forEach((a, i) => {
      const e = a[2] === "D" ? "H" : a[2], q = a[3] + dq[i], ok = ALLOWED[e + q], over = MOST[e] != null && tot[i] > MOST[e];
      charges[G.id(i)] = q;
      if (ok ? ok.includes(tot[i]) : !over) return;
      const text = "After the arrows " + nm(G.id(i)) + " has " + plural(tot[i], "bond") + (q ? " and charge " + chargeWord(q) : " and no charge") + ", which is not allowed.";
      problems.push(text); issues.push({ arrow: null, code: "valence", text, atom: G.id(i), bonds: tot[i], charge: q, over });
    });
    return { problems, issues, charges, lonePairs: Object.fromEntries(A.map((a, i) => [G.id(i), lp[i]])) };
  }

  // an arrow in words: "from a lone pair on sulfur 1 to carbon 2, making a new bond"
  function describe(arrow, drawing) {
    const d = getD(drawing), ar = tidy(arrow); if (!d || !ar) return "an arrow";
    const G = geom(d), f = ar.from, t = ar.to, src = f.lp != null ? [f.lp] : f.bond;
    const from = f.lp != null ? "a lone pair on " + atomLabel(G, f.lp) : "the " + bondName(G, f.bond[0], f.bond[1]);
    let to;
    if (t.atom != null) to = src.includes(t.atom) ? "onto " + atomLabel(G, t.atom) + ", as a lone pair" : "to " + atomLabel(G, t.atom) + ", making a new bond";
    else if (G.bonds[bk(t.bond[0], t.bond[1])]) to = "into the " + bondName(G, t.bond[0], t.bond[1]) + ", making it a multiple bond";
    else { const m = t.bond.find(n => !src.includes(n)); to = "to " + atomLabel(G, m == null ? t.bond[1] : m) + ", making a new bond" }
    return "from " + from + " " + to;
  }

  // where an arrow may start and where it may end, as sites ("a4" an atom, "b3_4" a bond): used to spot a backwards arrow
  const fromSites = ar => ar.from.lp != null ? ["a" + ar.from.lp] : ["b" + bk(ar.from.bond[0], ar.from.bond[1])];
  const fromLoose = ar => ar.from.lp != null ? ["a" + ar.from.lp] : ["b" + bk(ar.from.bond[0], ar.from.bond[1]), "a" + ar.from.bond[0], "a" + ar.from.bond[1]];
  const toSites = ar => { const src = ar.from.lp != null ? [ar.from.lp] : ar.from.bond; return ar.to.atom != null ? ["a" + ar.to.atom] : ["b" + bk(ar.to.bond[0], ar.to.bond[1])].concat(ar.to.bond.filter(n => !src.includes(n)).map(n => "a" + n)) };
  const hit = (x, y) => x.some(v => y.includes(v));
  const backwards = (a, e) => hit(fromSites(a), toSites(e)) && hit(toSites(a), fromLoose(e));

  // compare the arrows a student drew with the expected ones and explain what is wrong
  function check(drawing, drawnRaw, expectedRaw, opts = {}) {
    const d = getD(drawing), G = geom(d || { a: [], b: [], t: [], p: [] });
    const drawn = (drawnRaw || []).map(tidy).filter(Boolean), expected = (expectedRaw || []).map(tidy).filter(Boolean);
    const mE = expected.map(() => -1), mD = drawn.map(() => -1);
    drawn.forEach((a, i) => { const j = expected.findIndex((e, j) => mE[j] < 0 && same(a, e)); if (j >= 0) { mE[j] = i; mD[i] = j } });
    const right = mD.filter(j => j >= 0).length, most = Math.max(expected.length, drawn.length), notes = [];
    const out = { ok: right === expected.length && drawn.length === expected.length, score: most ? right / most : 1, notes, matched: mD };
    if (out.ok) return out;
    const missing = expected.filter((e, j) => mE[j] < 0), flagged = new Set(), nm = n => atomLabel(G, n);
    // 1. an arrow that starts where there are no electrons
    drawn.forEach((a, i) => {
      if (mD[i] >= 0) return;
      let why = null;
      if (a.from.lp != null) { const k = G.by[a.from.lp]; if (k == null || G.d.a[k][4] < 1) why = nm(a.from.lp) + " has no lone pair" }
      else if (!G.bonds[bk(a.from.bond[0], a.from.bond[1])]) why = "there is no bond between " + nm(a.from.bond[0]) + " and " + nm(a.from.bond[1]);
      if (!why) return;
      flagged.add(i);
      notes.push({ arrow: i, kind: "no-electrons", atom: a.from.lp != null ? a.from.lp : undefined, text: "Arrow " + (i + 1) + " starts where there are no electrons: " + why + ". Every arrow starts at a lone pair or at a bond." + (missing.some(e => backwards(a, e)) ? " It looks backwards, so try it the other way round." : "") });
    });
    // 2. an arrow drawn backwards
    drawn.forEach((a, i) => {
      if (mD[i] >= 0 || flagged.has(i) || !missing.some(e => backwards(a, e))) return;
      flagged.add(i);
      notes.push({ arrow: i, kind: "backwards", text: "Arrow " + (i + 1) + " is drawn backwards. An arrow starts at the electrons and points to where they go, so turn it around." });
    });
    // 3. the arrows that are right so far leave an atom with too many bonds: one is missing
    if (missing.length && d) apply(d, expected.filter((e, j) => mE[j] >= 0)).issues.filter(x => x.code === "valence" && x.over).forEach(x =>
      notes.push({ arrow: null, kind: "too-many-bonds", atom: x.atom, text: cap(nm(x.atom)) + " (ringed in the drawing) would end up with " + plural(x.bonds, "bond") + ", more than it can hold. An arrow is missing: as the new bond forms, another bond to " + nm(x.atom) + " has to break." }));
    // 4. arrows that are not needed, and arrows that are simply not part of the step
    const rest = drawn.map((a, i) => i).filter(i => mD[i] < 0 && !flagged.has(i)), room = Math.max(0, missing.length - flagged.size);
    rest.forEach((i, k) => notes.push(k < room
      ? { arrow: i, kind: "wrong", text: "Arrow " + (i + 1) + " is not part of this step. Ask where those electrons would end up, and whether that atom can take them." }
      : { arrow: i, kind: "extra", text: "Arrow " + (i + 1) + " is not needed. This step uses " + plural(expected.length, "arrow") + "." }));
    notes.sort((x, y) => (x.kind === "wrong") - (y.kind === "wrong"));
    // 5. otherwise a nudge toward the electron-rich site
    if (missing.length && notes.every(n => n.kind === "wrong")) {
      const e = missing[0], so = right ? plural(right, "arrow") + (right === 1 ? " is" : " are") + " right so far, and at least one more is needed. " : "";
      notes.push({ arrow: null, kind: "nudge", text: so + (opts.hint || (e.from.lp != null ? "Look for the electron-rich site: an atom with a lone pair or a negative charge. Start an arrow there and point it at an atom that is short of electrons." : "Look for the electron-rich site. Here it is a bond: start an arrow at the middle of a bond whose electrons can move.")) });
    }
    return out;
  }

  // ------------------------------------------------------------------ arrow geometry (drawing units)
  // how far from atom i's centre its printed label reaches along the direction (ux, uy)
  function reach(G, i, ux, uy) {
    const x = G.d.a[i][0], y = G.d.a[i][1]; let r = 0;
    for (const [x0, y0, x1, y1] of G.boxes[i]) {
      let t0 = -Infinity, t1 = Infinity;
      for (const [p, u, lo, hi] of [[x, ux, x0 - 1, x1 + 1], [y, uy, y0 - 1, y1 + 1]]) {
        if (Math.abs(u) < 1e-9) { if (p < lo || p > hi) { t0 = Infinity; break } continue }
        let a = (lo - p) / u, b = (hi - p) / u; if (a > b) { const s = a; a = b; b = s }
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      }
      if (t0 <= t1 && t1 > 0 && t0 < 10) r = Math.max(r, t1);
    }
    return G.boxes[i].length ? Math.max(r, 3) : 3.5;      // an unlabelled carbon: 7 px at the stage's scale
  }
  const unit = (p, q) => { const x = q[0] - p[0], y = q[1] - p[1], l = Math.hypot(x, y) || 1; return [x / l, y / l] };
  const along = (p, u, r) => [p[0] + u[0] * r, p[1] + u[1] * r];
  const quad = (s, c, e, t) => [(1 - t) * (1 - t) * s[0] + 2 * t * (1 - t) * c[0] + t * t * e[0], (1 - t) * (1 - t) * s[1] + 2 * t * (1 - t) * c[1] + t * t * e[1]];
  // one arrow -> {d, head, dots, c, mid, pts}, or null when it cannot be placed
  function shape(G, ar, used) {
    const A = G.d.a, P = n => { const i = G.by[n]; return i == null ? null : [A[i][0], A[i][1]] };
    const mid = (a, b) => { const p = P(a), q = P(b); return p && q ? [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] : null };
    const f = ar.from, t = ar.to, src = f.lp != null ? [f.lp] : f.bond;
    let sAtom = null, eAtom = null, s0, e0;
    if (f.lp != null) { sAtom = f.lp; s0 = P(f.lp) } else s0 = mid(f.bond[0], f.bond[1]);
    if (t.atom != null) { eAtom = t.atom; e0 = P(t.atom) }
    else if (G.bonds[bk(t.bond[0], t.bond[1])]) e0 = mid(t.bond[0], t.bond[1]);      // an existing bond: its middle
    else { const m = t.bond.find(n => !src.includes(n)); eAtom = m == null ? t.bond[1] : m; e0 = P(eAtom) }      // a new bond: the atom the pair reaches
    if (!s0 || !e0) return null;
    const L = Math.hypot(e0[0] - s0[0], e0[1] - s0[1]); if (L < 0.5) return null;
    const u = unit(s0, e0), n = [-u[1], u[0]], m0 = [(s0[0] + e0[0]) / 2, (s0[1] + e0[1]) / 2], off = Math.max(10, Math.min(40, L * 0.42));
    // which side to bulge to: the side that crosses fewer atoms, then away from the drawing's centroid, then up
    const skip = new Set(src.concat(eAtom != null ? [eAtom] : t.bond).map(x => G.by[x]));
    const cost = sign => {
      const c = along(m0, n, sign * off); let k = 0;
      for (let q = 0.15; q < 0.9; q += 0.1) { const p = quad(s0, c, e0, q); A.forEach((a, i) => { if (!skip.has(i) && Math.hypot(a[0] - p[0], a[1] - p[1]) < (G.boxes[i].length ? 9 : 5)) k++ }) }
      (used || []).forEach(v => { if (Math.hypot(v[0] - c[0], v[1] - c[1]) < 8) k += 2 });
      return k;
    };
    const lean = (m0[0] - G.c[0]) * n[0] + (m0[1] - G.c[1]) * n[1];
    const away = Math.abs(lean) > 1 ? Math.sign(lean) : n[1] < -1e-6 || (Math.abs(n[1]) < 1e-6 && n[0] > 0) ? 1 : -1;
    const sign = cost(-away) < cost(away) ? -away : away, c = along(m0, n, sign * off);
    let s, e, dots = null;
    if (sAtom != null) {      // a lone pair: two dots just outside the label, and the arrow starts beyond them
      const v = unit(s0, c), r = reach(G, G.by[sAtom], v[0], v[1]), b = along(s0, v, r + 2), w = [-v[1], v[0]];
      dots = [along(b, w, 1.9), along(b, w, -1.9)]; s = along(s0, v, r + 4.6);
    } else s = along(s0, unit(s0, c), 1.2);
    if (eAtom != null) { const v = unit(e0, c); e = along(e0, v, reach(G, G.by[eAtom], v[0], v[1]) + 1.6) } else e = along(e0, unit(e0, c), 1);
    const h = unit(c, e), base = along(e, h, -5.2), w = [-h[1], h[0]], stop = along(e, h, -4.2);
    const fx = p => r1(p[0]) + " " + r1(p[1]), pts = [];
    for (let q = 0; q <= 1.001; q += 0.125) pts.push(quad(s, c, e, q));
    return { d: "M" + fx(s) + "Q" + fx(c) + " " + fx(stop), head: [e, along(base, w, 2.4), along(base, w, -2.4)].map(p => fx(p).replace(" ", ",")).join(" "), dots, c, mid: along(quad(s, c, e, 0.5), n, sign * 5), pts: dots ? pts.concat(dots) : pts };
  }

  // ------------------------------------------------------------------ the stage: one mechanism step
  const START = "Press where the electrons start: an atom (its lone pair) or a bond.";
  function stage(host, o = {}) {
    const d = getD(o.species), mode = o.mode || "show", input = mode === "input", S = o.scale || STAGE;
    host.textContent = "";
    if (!d) {
      host.appendChild(el("p", { class: "fig-missing" }, "This drawing is missing."));
      return { arrows: () => [], set() { }, clear() { }, undo() { }, check: () => ({ ok: false, score: 0, notes: [], matched: [] }), destroy() { host.textContent = "" } };
    }
    const G = geom(d);
    let list = (o.arrows || []).map(tidy).filter(Boolean), given = input ? list.length : 0, src = null, last = null;
    const arrowG = el("g", { class: "mol-arrows" }), pickG = el("g", { class: "mol-picks" });
    const svgEl = el("svg", { class: "stage-svg", "font-family": FONT, role: input ? "group" : "img", "data-nolookup": "" }, ink(d), arrowG, pickG);
    const status = input ? el("p", { class: "stage-status small", role: "status", "aria-live": "polite" }, START) : null;
    host.appendChild(el("div", { class: "stage stage-" + mode }, el("div", { class: "stage-scroll" }, svgEl), status));
    const say = text => { if (status) status.textContent = text };
    const changed = () => { if (o.onChange) o.onChange(api.arrows()) };
    const frame = (x0, y0, x1, y1) => { svgEl.setAttribute("viewBox", `${r1(x0)} ${r1(y0)} ${r1(x1 - x0)} ${r1(y1 - y0)}`); svgEl.setAttribute("width", Math.round((x1 - x0) * S)); svgEl.setAttribute("height", Math.round((y1 - y0) * S)) };

    function redraw() {
      arrowG.textContent = "";
      const used = [], play = mode === "play" && !ORGO.reduced; let x0 = -4, y0 = -4, x1 = d.w + 4, y1 = d.h + 4;
      list.forEach((ar, k) => {
        const sh = shape(G, ar, used); if (!sh) return;
        used.push(sh.c);
        const note = last && last.notes.some(n => n.arrow === k), fine = last && last.matched[k] >= 0;
        arrowG.appendChild(el("g", { class: "mol-arrow" + (play ? " play" : "") + (k < given ? " given" : "") + (note ? " bad" : fine ? " ok" : ""), style: play ? "--i:" + k : null },
          sh.dots && sh.dots.map(p => el("circle", { class: "lp-dot", cx: r1(p[0]), cy: r1(p[1]), r: 1, fill: "currentColor" })),
          el("path", { class: "shaft", d: sh.d, pathLength: play ? 1 : null, fill: "none", stroke: "currentColor", "stroke-width": 1.3, "stroke-linecap": "round" }),
          el("polygon", { class: "head", points: sh.head, fill: "currentColor" }),
          input && el("g", { class: "mol-num" }, el("circle", { cx: r1(sh.mid[0]), cy: r1(sh.mid[1]), r: 3.4 }), el("text", { x: r1(sh.mid[0]), y: r1(sh.mid[1]), "font-size": 5, "text-anchor": "middle", "dominant-baseline": "central" }, String(k + 1)))));
        sh.pts.forEach(p => { x0 = Math.min(x0, p[0] - 5); y0 = Math.min(y0, p[1] - 5); x1 = Math.max(x1, p[0] + 5); y1 = Math.max(y1, p[1] + 5) });
      });
      if (last) last.notes.forEach(n => { const i = n.atom != null ? G.by[n.atom] : null; if (i != null) arrowG.appendChild(el("circle", { class: "mol-ring", cx: d.a[i][0], cy: d.a[i][1], r: 9.5, fill: "none", stroke: "currentColor", "stroke-width": 1, "stroke-dasharray": "2.5 2" })) });
      if (input) { frame(-PAD, -PAD, d.w + PAD, d.h + PAD); svgEl.setAttribute("aria-label", "Draw curved arrows. " + plural(list.length, "arrow") + " so far.") }
      else { frame(x0, y0, x1, y1); svgEl.setAttribute("aria-label", label(d) + ". " + (list.length ? plural(list.length, "curved arrow") + ": " + list.map(a => describe(a, d)).join("; ") + "." : "No arrows.")) }
    }

    // picking: the first press is the source, the second is the target
    const site = t => t.atom != null ? atomLabel(G, t.atom) : "the " + bondName(G, t.bond[0], t.bond[1]);
    const sameSite = (p, q) => p.atom != null ? p.atom === q.atom : !!q.bond && sameBond(p.bond, q.bond);
    const drop = () => { if (src) { src.node.classList.remove("on"); src.node.setAttribute("aria-pressed", "false"); src = null } };
    function pick(t, node) {
      if (!src) { src = { t, node }; node.classList.add("on"); node.setAttribute("aria-pressed", "true"); say("Start: " + site(t) + ". Now press where those electrons go: an atom or a bond. Escape cancels."); return }
      if (sameSite(src.t, t)) { drop(); say("Cancelled. " + START); return }
      const ar = tidy({ from: src.t.atom != null ? { lp: src.t.atom } : { bond: src.t.bond.slice() }, to: t.atom != null ? { atom: t.atom } : { bond: t.bond.slice() } });
      drop(); list.push(ar); last = null; redraw();
      say("Arrow " + list.length + ": " + describe(ar, d) + ". Press a new start for another arrow.");
      changed();
    }
    const onKey = e => { if (e.key === "Escape" && src) { drop(); say("Cancelled. " + START); e.stopPropagation() } };
    if (input) {
      const r = r1(14 / S);      // 28 px across
      const target = (t, x, y, name) => {
        const node = el("circle", { class: "pick " + (t.atom != null ? "pick-atom" : "pick-bond"), cx: r1(x), cy: r1(y), r, tabindex: "0", role: "button", "aria-label": name, "aria-pressed": "false", fill: "transparent", "pointer-events": "all" });
        node.addEventListener("click", () => pick(t, node));
        node.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(t, node) } });
        return node;
      };
      d.b.forEach(([i, j]) => pickG.appendChild(target({ bond: [G.id(i), G.id(j)] }, (d.a[i][0] + d.a[j][0]) / 2, (d.a[i][1] + d.a[j][1]) / 2, bondName(G, G.id(i), G.id(j)))));
      d.a.forEach((a, i) => pickG.appendChild(target({ atom: G.id(i) }, a[0], a[1], atomName(G, G.id(i)))));
      svgEl.addEventListener("keydown", onKey);
    }

    const api = {
      arrows: () => list.map(a => JSON.parse(JSON.stringify(a))),
      set(arrows) { drop(); list = (arrows || []).map(tidy).filter(Boolean); given = 0; last = null; redraw(); if (input) say(plural(list.length, "arrow") + " drawn."); changed() },
      clear() { drop(); list = list.slice(0, given); last = null; redraw(); say("Cleared. " + START); changed() },
      undo() { if (src) { drop(); say("Cancelled. " + START); return } if (list.length > given) { list.pop(); last = null; redraw(); say("Removed the last arrow. " + plural(list.length, "arrow") + " left."); changed() } },
      check(expected, opts) { drop(); last = check(d, list, expected, opts); redraw(); return last },
      destroy() { svgEl.removeEventListener("keydown", onKey); host.textContent = "" }
    };
    redraw();
    return api;
  }

  ORGO.mol = { svg, scheme, stage, apply, same, check, describe, key: arg => molArg(arg).key, UNIT, STAGE };
  ORGO.tokens.mol = molToken;
  for (const kind of ["rxn", "eq", "eqr", "eql", "nr"]) ORGO.tokens[kind] = (arg, inline) => scheme(arg, kind, inline);
})();
