#!/usr/bin/env node
// Tests for the arrow chemistry in assets/mol.js: node tools/test/mol.test.js
// core.js and mol.js are loaded in a vm with small stand-ins for window, document and localStorage,
// then data/mech.js is loaded through ORGO.reg, exactly as a page would load it.
const vm = require("vm"), fs = require("fs"), path = require("path"), assert = require("assert");
const root = path.join(__dirname, "..", "..");

const noop = () => { };
const node = () => ({ classList: { add: noop, remove: noop, contains: () => false }, dataset: {}, style: {}, setAttribute: noop, appendChild: noop, addEventListener: noop, insertBefore: noop });
const kept = {};
const win = {
  console, EventTarget, CustomEvent, setTimeout, COURSE: { base: "" },
  document: { currentScript: null, documentElement: node(), head: node(), body: node(), readyState: "loading", addEventListener: noop, getElementById: () => null, querySelector: () => null, createElement: node, createElementNS: node },
  localStorage: { getItem: k => (k in kept ? kept[k] : null), setItem: (k, v) => { kept[k] = String(v) }, removeItem: k => { delete kept[k] } },
  location: { pathname: "/", search: "", hash: "", href: "" }, addEventListener: noop, dispatchEvent: noop
};
win.window = win;
const ctx = vm.createContext(win);
for (const f of ["assets/core.js", "assets/mol.js", "data/mech.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });

const ORGO = win.ORGO, mol = ORGO.mol, mechs = ORGO.data.mechs, mols = ORGO.data.mols;
let ran = 0;
const test = (name, fn) => { try { fn(); ran++ } catch (e) { console.error("FAIL  " + name + "\n      " + String(e.message).split("\n").join("\n      ")); process.exitCode = 1 } };
const A = (from, to) => ({ from, to });

test("the namespace follows the contract", () => {
  for (const k of ["svg", "scheme", "stage", "apply", "same"]) assert.strictEqual(typeof mol[k], "function", "ORGO.mol." + k);
  for (const k of ["mol", "rxn", "eq", "eqr", "eql", "nr"]) assert.strictEqual(typeof ORGO.tokens[k], "function", "ORGO.tokens." + k);
  assert.ok(Object.keys(mechs).length >= 6, "six mechanisms are loaded");
});

test("every step of every mechanism moves its electrons without a problem", () => {
  for (const id in mechs) {
    const m = mechs[id];
    m.steps.forEach((s, k) => {
      assert.ok(mols[s.species], id + " step " + (k + 1) + ": its drawing is in the data");
      const out = mol.apply(s.species, s.arrows);
      assert.strictEqual(out.problems.join("; "), "", id + " step " + (k + 1));
      // what the arrows produce agrees with the next drawing: charge and lone pairs of every atom that is still there
      const after = mols[k + 1 < m.steps.length ? m.steps[k + 1].species : m.product];
      assert.ok(after, id + ": the drawing after step " + (k + 1) + " is in the data");
      for (const a of after.a) {
        if (!a[6] || !(a[6] in out.charges)) continue;
        assert.strictEqual(out.charges[a[6]], a[3], id + " step " + (k + 1) + ": charge of atom " + a[6]);
        assert.strictEqual(out.lonePairs[a[6]], a[4], id + " step " + (k + 1) + ": lone pairs of atom " + a[6]);
      }
      // the expected arrows check as right against themselves, and a step with no arrows drawn does not
      assert.strictEqual(mol.check(s.species, s.arrows, s.arrows).ok, true, id + " step " + (k + 1) + " checks as right");
      assert.strictEqual(mol.check(s.species, [], s.arrows).ok, false, id + " step " + (k + 1) + " with nothing drawn");
    });
  }
});

test("same() treats the clicked form and the written form as equal", () => {
  // a lone pair pressed, then the atom it attacks
  assert.ok(mol.same(A({ lp: 1 }, { atom: 2 }), A({ lp: 1 }, { bond: [1, 2] })));
  assert.ok(mol.same(A({ atom: 1 }, { atom: 2 }), A({ lp: 1 }, { bond: [2, 1] })));
  // a bond pressed, then an atom outside it: that pair makes a bond to the atom
  assert.ok(mol.same(A({ bond: [3, 2] }, { atom: 4 }), A({ bond: [2, 3] }, { bond: [3, 4] })));
  assert.ok(mol.same(A({ bond: [3, 4] }, { atom: 2 }), A({ bond: [3, 4] }, { bond: [4, 2] })));
  assert.ok(mol.same(A({ bond: [2, 3] }, { bond: [3, 4] }), A({ bond: [3, 2] }, { atom: 4 })), "in either order");
  // bonds are unordered
  assert.ok(mol.same(A({ bond: [5, 4] }, { atom: 5 }), A({ bond: [4, 5] }, { atom: 5 })));
  // and different movements stay different
  assert.ok(!mol.same(A({ bond: [4, 5] }, { atom: 5 }), A({ bond: [4, 5] }, { atom: 4 })));
  assert.ok(!mol.same(A({ lp: 1 }, { bond: [1, 2] }), A({ bond: [2, 3] }, { atom: 3 })));
  assert.ok(!mol.same(A({ lp: 1 }, { atom: 2 }), A({ lp: 2 }, { atom: 1 })));
  assert.ok(!mol.same(A({ bond: [2, 3] }, { atom: 5 }), A({ bond: [2, 3] }, { bond: [3, 4] })));
});

const sn2 = mechs["sn2-iodomethane-hydrosulfide"].steps[0];

test("SN2 with only its first arrow: carbon is left with five bonds", () => {
  const out = mol.apply(sn2.species, [sn2.arrows[0]]);
  assert.ok(out.problems.some(p => /carbon 2 has 5 bonds/.test(p)), "apply reports it: " + JSON.stringify(out.problems));
  const res = mol.check(sn2.species, [A({ lp: 1 }, { atom: 2 })], sn2.arrows);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.score, 0.5);
  const note = res.notes.find(n => n.kind === "too-many-bonds");
  assert.ok(note && note.atom === 2 && /5 bonds/.test(note.text), "check explains it: " + JSON.stringify(res.notes));
});

test("a reversed arrow is reported as backwards", () => {
  // iodine's lone pair sent back into the C to I bond is the leaving-group arrow turned around
  const res = mol.check(sn2.species, [sn2.arrows[0], A({ lp: 3 }, { bond: [2, 3] })], sn2.arrows);
  assert.strictEqual(res.ok, false);
  assert.ok(res.notes.some(n => n.kind === "backwards" && n.arrow === 1), JSON.stringify(res.notes));
  // carbon to sulfur starts where there are no electrons, which is said first, and it is also called backwards
  const cs = mol.check(sn2.species, [A({ atom: 2 }, { atom: 1 })], sn2.arrows);
  assert.strictEqual(cs.notes[0].kind, "no-electrons");
  assert.ok(/backwards/.test(cs.notes[0].text), cs.notes[0].text);
});

test("an extra arrow is named, and the clicked form of a whole step checks as right", () => {
  const extra = mol.check(sn2.species, sn2.arrows.concat([A({ lp: 3 }, { atom: 1 })]), sn2.arrows);
  assert.ok(!extra.ok && extra.notes.some(n => n.kind === "extra" && n.arrow === 2), JSON.stringify(extra.notes));
  const e2 = mechs["e2-tertbutyl-bromide-hydroxide"].steps[0];
  const clicked = [A({ atom: 1 }, { atom: 2 }), A({ bond: [3, 2] }, { atom: 4 }), A({ bond: [5, 4] }, { atom: 5 })];
  assert.strictEqual(mol.check(e2.species, clicked, e2.arrows).ok, true);
  assert.strictEqual(mol.apply(e2.species, clicked).problems.join("; "), "", "apply reads the clicked form too");
});

test("apply refuses electrons that are not there", () => {
  assert.ok(mol.apply(sn2.species, [A({ lp: 2 }, { bond: [2, 1] })]).problems.some(p => /no lone pair/.test(p)));
  assert.ok(mol.apply(sn2.species, [A({ bond: [1, 3] }, { atom: 3 })]).problems.some(p => /no bond between/.test(p)));
  assert.ok(mol.apply(sn2.species, [A({ lp: 3 }, { bond: [1, 2] })]).problems.some(p => /must include an atom the pair started on/.test(p)));
});

if (!process.exitCode) console.log("mol.test.js: " + ran + " tests passed");
