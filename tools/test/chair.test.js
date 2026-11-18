#!/usr/bin/env node
// Unit tests for assets/chair.js (the model), with newman.js and energy.js loaded beside it. Plain node, no DOM:
// core.js and the engine files run in a vm with a few stubs, and the A-value table is registered from content/.
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..", "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

const classList = { add() { }, remove() { }, toggle() { }, contains() { return false } };
const ctx = { console, EventTarget, CustomEvent: global.CustomEvent || class { constructor(n, o) { this.type = n; this.detail = o && o.detail } }, setTimeout, performance,
  document: { currentScript: { src: "file:///class/assets/core.js" }, documentElement: { dataset: {}, classList }, readyState: "loading", addEventListener() { }, getElementById() { return null }, querySelector() { return null } },
  location: { pathname: "/class/index.html", search: "" } };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["assets/core.js", "assets/chair.js", "assets/newman.js", "assets/energy.js"]) vm.runInContext(read(f), ctx, { filename: f });
const ORGO = ctx.ORGO, C = ORGO.chair;
ORGO.reg({ tables: { avalues: JSON.parse(read("content/tables/avalues.json")) } });

let bad = 0, n = 0;
const eq = (got, want, what) => { n++; const g = JSON.stringify(got), w = JSON.stringify(want); if (g !== w) { bad++; console.log(`FAIL ${what}: got ${g}, wanted ${w}`) } };
const ok = (cond, what) => { n++; if (!cond) { bad++; console.log(`FAIL ${what}`) } };

// ---- the table in the brief: subs, cisTrans, stable, relation, chiral
const rows = [
  ["1u:CH3,2u:CH3", "cis", "equal", "enantiomers", false],
  ["1u:CH3,2d:CH3", "trans", "B", "diastereomers", true],
  ["1u:CH3,3u:CH3", "cis", "B", "diastereomers", false],
  ["1u:CH3,3d:CH3", "trans", "equal", "same", true],
  ["1u:CH3,4u:CH3", "cis", "equal", "same", false],
  ["1u:CH3,4d:CH3", "trans", "B", "diastereomers", false],
  ["1u:CH3", null, "B", "diastereomers", false],
  ["1u:CH3,2u:CH2CH3", "cis", "A", "diastereomers", true],
  ["1d:CH3,4u:CH(CH3)2", "trans", "A", "diastereomers", false],
  ["", null, "equal", "same", false],
  ["1u:CH3,1d:CH3", null, "equal", "same", false],
];
for (const [subs, ct, stable, rel, chiral] of rows) {
  const a = C.analyze(subs), tag = subs || "(none)";
  eq(a.cisTrans, ct, tag + " cisTrans"); eq(a.stable, stable, tag + " stable"); eq(a.relation, rel, tag + " relation"); eq(a.chiral, chiral, tag + " chiral");
  ok(Array.isArray(a.steps) && a.steps.length >= 4 && a.steps.every(s => typeof s === "string" && s.length > 10), tag + " steps are sentences");
  ok(a.steps.every(s => !/[—–!]/.test(s)), tag + " steps have no dashes or exclamation marks");
}

// ---- positions and costs
eq(C.parse("1u:CH3, 2d:C(CH3)3"), [{ c: 1, face: "u", g: "CH3" }, { c: 2, face: "d", g: "C(CH3)3" }], "parse");
eq([C.pos({ c: 1, face: "u" }, "A"), C.pos({ c: 2, face: "u" }, "A"), C.pos({ c: 1, face: "d" }, "A"), C.pos({ c: 2, face: "d" }, "A")], ["ax", "eq", "eq", "ax"], "pos in form A");
eq([C.pos({ c: 1, face: "u" }, "B"), C.pos({ c: 2, face: "u" }, "B"), C.pos({ c: 1, face: "d" }, "B"), C.pos({ c: 2, face: "d" }, "B")], ["eq", "ax", "ax", "eq"], "pos in form B");
const cost = s => { const a = C.analyze(s); return [a.forms.A.cost, a.forms.B.cost] };
eq(cost("1u:CH3,2u:CH3"), [2.64, 2.64], "cis-1,2 costs");             // one axial methyl + one gauche pair, both chairs
eq(cost("1u:CH3,2d:CH3"), [3.48, 0.9], "trans-1,2 costs");            // diaxial (anti): 2 x 1.74; diequatorial: one gauche pair
eq(cost("1u:CH3,3u:CH3"), [7.18, 0], "cis-1,3 costs");                // diaxial: 2 x 1.74 + 3.7
eq(cost("1u:CH3,4d:C(CH3)3"), [7.24, 0], "trans-1,4 costs");
eq(cost("1u:XYZ"), [1.7, 0], "unknown group costs 1.7");
eq(C.analyze("1u:CH3,2d:CH3").forms.A.axial.map(s => s.c), [1, 2], "axial list");
eq(C.A.CH3.a, 1.74, "A-value table: methyl"); eq(C.A["C(CH3)3"].src, "lecture", "A-value table: source"); ok(C.A.OTs && C.A.Ph, "A-value table has the table's groups");

// ---- E2
let e = C.e2("1u:Cl,2d:CH3", 1);
eq(e.reactiveForm, "A", "e2 trans-2-methyl: reactive form"); eq(e.antiH, [6], "e2 trans-2-methyl: antiH"); eq(e.products, [{ between: [1, 6], zaitsev: false }], "e2 trans-2-methyl: products");
e = C.e2("1u:Cl,2u:CH3", 1);
eq(e.reactiveForm, "A", "e2 cis-2-methyl: reactive form"); eq(e.antiH, [2, 6], "e2 cis-2-methyl: antiH"); eq(e.products[0], { between: [1, 2], zaitsev: true }, "e2 cis-2-methyl: major product"); eq(e.products.length, 2, "e2 cis-2-methyl: two products");
e = C.e2("1u:Cl,2d:Cl,3u:Cl,4d:Cl,5u:Cl,6d:Cl", 1);
eq([e.antiH, e.products, e.possible], [[], [], false], "e2 hexachloride: no anti hydrogen"); ok(/cannot happen in a chair/.test(e.steps.join(" ")), "e2 hexachloride: says E2 cannot happen in a chair");
e = C.e2("1u:Br,4u:C(CH3)3", 1);
eq([e.reactiveForm, e.slow, e.fast], ["A", false, true], "e2 cis-4-tert-butyl: fast"); eq(C.pos({ c: 4, face: "u" }, e.reactiveForm), "eq", "e2 cis: tert-butyl equatorial in the reactive form");
eq(C.analyze("1u:Br,4u:C(CH3)3").stable, "A", "e2 cis: the reactive form is the cheap form"); ok(/fast/.test(e.steps.join(" ")), "e2 cis: says fast");
e = C.e2("1u:Br,4d:C(CH3)3", 1);
eq([e.reactiveForm, e.slow, e.fast], ["A", true, false], "e2 trans-4-tert-butyl: slow"); eq(C.pos({ c: 4, face: "d" }, e.reactiveForm), "ax", "e2 trans: tert-butyl axial in the reactive form");
ok(/slow because it must go through a scarcely populated chair/.test(e.steps.join(" ")), "e2 trans: says why it is slow");
eq(C.e2("1d:Br,2d:CH3", 1).reactiveForm, "B", "e2: a down leaving group on carbon 1 is axial in form B");
eq(C.e2("3u:Cl", 3).antiH, [4, 2], "e2: neighbours of carbon 3");
eq(C.e2("1u:CH3", 2).reactiveForm, null, "e2: no leaving group");

// ---- generated questions
for (const kind of ["chair-read", "chair-both", "e2-ring-product"]) for (let s = 0; s < 60; s++) {
  const it = C.make(kind, s), again = C.make(kind, s), a = C.analyze(it.subs), d = Math.abs(a.forms.A.cost - a.forms.B.cost);
  eq(it, again, `make ${kind} ${s} is repeatable`);
  ok(it.id === `gen:${kind}:${s}` && it.kind === "chair" && it.type === kind && it.stem && it.solution.steps.length >= 3 && it.solution.answer && it.solution.rule, `make ${kind} ${s} shape`);
  ok(a.stable === "equal" || d >= 0.3, `make ${kind} ${s}: no near tie (${it.subs}, ${d})`);
  ok(C.parse(it.subs).every(x => C.A[x.g]), `make ${kind} ${s}: groups are in the A-value table`);
  if (kind === "chair-read") ok(/^chair[AB]$/.test(it.given) && it.ask.join() === "cis-trans,stable" && a.cisTrans, `make chair-read ${s} asks`);
  if (kind === "chair-both") ok(it.given === "ring" && it.ask.join() === "stable,relationship", `make chair-both ${s} asks`);
  if (kind === "e2-ring-product") { const p = C.parse(it.subs); ok(it.given === "ring" && it.ask.join() === "e2" && it.lg === 1 && p[0].c === 1 && /^(Cl|Br|OTs)$/.test(p[0].g) && [2, 3, 4].includes(p[1].c), `make e2 ${s} shape`) }
  ok(!/[—–!]/.test(JSON.stringify(it)), `make ${kind} ${s}: no dashes or exclamation marks`);
}
ok(JSON.stringify(C.make("chair-read", 1)) !== JSON.stringify(C.make("chair-read", 2)) || JSON.stringify(C.make("chair-read", 2)) !== JSON.stringify(C.make("chair-read", 3)), "make varies with the seed");

// ---- energy diagrams and Newman energies
const E = ORGO.energy, seen = new Set();
for (let s = 0; s < 80; s++) {
  const it = E.make(s), right = it.choices.filter(c => c.ok), m = /(exothermic|endothermic) \{\{(SN1|SN2|E1|E2)\}\}/.exec(it.stem);
  ok(it.type === "energy-diagrams" && it.kind === "mcq" && it.choices.length === 4 && right.length === 1 && it.choices.every(c => /^\[\[energy:[^\]]+\]\]$/.test(c.h) && c.why) && m, `energy make ${s} shape`);
  if (!m) continue; seen.add(m[1] + m[2]);
  const f = E.facts(right[0].h.slice(9, -2)), pts = E.parse(right[0].h.slice(9, -2)).pts;
  eq(f.steps, /1$/.test(m[2]) ? 2 : 1, `energy make ${s}: number of steps for ${m[2]}`); ok(m[1] === "exothermic" ? f.dh < 0 : f.dh > 0, `energy make ${s}: ${m[1]}`);
  if (f.steps === 2) ok(pts[1].e > pts[3].e, `energy make ${s}: the first barrier is the higher one`);
  ok(new Set(it.choices.map(c => c.h)).size === 4, `energy make ${s}: four different diagrams`);
  ok(!/[—–!]/.test(JSON.stringify(it)), `energy make ${s}: no dashes or exclamation marks`);
  eq(E.make(s), it, `energy make ${s} is repeatable`);
}
eq(seen.size, 8, "energy make covers SN1, SN2, E1, E2, exothermic and endothermic");
eq(E.facts("R=0,TS1=22,I=12,TS2=15,P=-6"), { ea: 22, dh: -6, steps: 2, top: 1 }, "energy facts");
const ne = d => Math.round(ORGO.newman.energy(d) * 100) / 100;
eq([ne(180), ne(60), ne(300), ne(120), ne(0)], [0, 0.9, 0.9, 3.4, 5], "butane energies: anti, gauche, eclipsed");

console.log(bad ? `${bad} of ${n} checks failed` : `chair.test.js: all ${n} checks passed`);
process.exit(bad ? 1 : 0);
