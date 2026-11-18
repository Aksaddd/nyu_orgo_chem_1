#!/usr/bin/env node
// Assembles mock exams in the shape of the Fall 2024 paper (nine questions of 100 points) from the practice bank.
//   node tools/mocks.js        writes content/mock/mock-1.json … then run  node tools/build.js
// Form 1 follows the past exam part for part. Forms 2 and 3 keep its shape and swap in the question types that the
// Fall 2026 lectures add (NMR, acid-base equilibria, synthesis with organometallics, solvent effects, SN1 products…).
// No practice question appears in two mock exams, and worked examples and the original exam's own parts are never used.
const fs = require("fs"), path = require("path"), C = path.join(__dirname, "..", "content");
const items = fs.readdirSync(path.join(C, "items")).filter(f => f.endsWith(".json")).sort().flatMap(f => JSON.parse(fs.readFileSync(path.join(C, "items", f), "utf8"))).filter(i => i.role === "practice");
const W = ["written", "mech"], A = ["mcq", "multi", "numeric", "rank", "classify"];
// [label, points, type, how many, kinds to prefer]
const FORMS = [
  [[["A", 15, "pka-values", 5, ["numeric"]], ["B", 15, "mech-id", 1, ["mcq"]], ["C", 15, "nuc-pairs", 3, ["mcq"]], ["D", 55, "mech-organometallic", 1, W]],
   [["A", 30, "rate-pairs", 3, ["mcq"]], ["B", 70, "mech-two-paths", 1, ["written"]]],
   [["A", 25, "traits", 1, ["multi"]], ["B", 25, "energy-diagrams", 1, ["mcq"]], ["C", 25, "fastest-substrate", 1, A], ["D", 25, "e2-ring-product", 1, ["mcq", "chair"]]],
   [["A", 50, "chair-read", 5, ["chair"]], ["B", 50, "mech-intramolecular", 1, ["written"]]],
   [["A", 80, "williamson-why", 1, ["written"]], ["B", 20, "e2-stereo-explain", 1, ["written"]]],
   [["A", 50, "route-choice", 1, ["written", "mcq"]], ["B", 50, "products-from-formula", 1, ["written"]]],
   [["A", 50, "sub-vs-elim", 1, ["written"]], ["B", 50, "all-elim-products", 1, ["written"]]],
   [["", 100, "chair-both", 3, ["chair"]]],
   [["", 100, "mech-rearrangement", 1, ["written"]]]],
  [[["A", 15, "pka-values", 5, ["numeric"]], ["B", 15, "acid-base-eq", 1, A], ["C", 15, "nuc-pairs", 3, ["mcq"]], ["D", 55, "organometallic-synthesis", 1, ["written"]]],
   [["A", 30, "rate-pairs", 3, ["mcq"]], ["B", 70, "mech-two-paths", 1, ["written"]]],
   [["A", 25, "traits", 1, ["multi"]], ["B", 25, "energy-diagrams", 1, ["mcq"]], ["C", 25, "zaitsev-hofmann", 1, A], ["D", 25, "e2-ring-product", 1, ["mcq", "chair"]]],
   [["A", 50, "chair-read", 5, ["chair"]], ["B", 50, "mech-intramolecular", 1, ["written"]]],
   [["A", 80, "williamson-why", 1, ["written"]], ["B", 20, "solvent-effects", 1, ["written", "mcq"]]],
   [["A", 50, "route-choice", 1, ["written", "mcq"]], ["B", 50, "sn1-products", 1, ["written"]]],
   [["A", 50, "sub-vs-elim", 1, ["written"]], ["B", 50, "all-elim-products", 1, ["written"]]],
   [["", 100, "chair-both", 3, ["chair"]]],
   [["", 100, "mech-rearrangement", 1, ["written"]]]],
  [[["A", 15, "pka-values", 5, ["numeric"]], ["B", 15, "acid-rank", 1, A], ["C", 15, "nuc-pairs", 3, ["mcq"]], ["D", 55, "mech-organometallic", 1, W]],
   [["A", 30, "rate-pairs", 3, ["mcq"]], ["B", 70, "mech-two-paths", 1, ["written"]]],
   [["A", 25, "nmr-signals", 1, A], ["B", 25, "ring-strain", 1, A], ["C", 25, "fastest-substrate", 1, A], ["D", 25, "e2-ring-product", 1, ["mcq", "chair"]]],
   [["A", 50, "chair-read", 5, ["chair"]], ["B", 50, "mech-intramolecular", 1, ["written"]]],
   [["A", 80, "williamson-why", 1, ["written"]], ["B", 20, "e2-stereo-explain", 1, ["written"]]],
   [["A", 50, "sn2-stereo", 1, ["written", "mcq"]], ["B", 50, "products-from-formula", 1, ["written"]]],
   [["A", 50, "sub-vs-elim", 1, ["written"]], ["B", 50, "all-elim-products", 1, ["written"]]],
   [["", 100, "chair-both", 3, ["chair"]]],
   [["", 100, "mech-rearrangement", 1, ["written"]]]],
];
const used = new Set(), notes = [];
function take(type, n, kinds, form) {
  const pool = items.filter(i => i.type === type && !used.has(i.id));
  const rank = i => (kinds.includes(i.kind) ? 0 : 10) + (kinds.indexOf(i.kind) >= 0 ? kinds.indexOf(i.kind) : 0) + (3 - (i.diff || 2)) * 0.1;      // preferred kind first, harder first
  pool.sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  const got = pool.slice(0, n); got.forEach(i => used.add(i.id));
  if (got.length < n) { const again = items.filter(i => i.type === type && !got.includes(i)).sort((a, b) => rank(a) - rank(b) || b.id.localeCompare(a.id)).slice(0, n - got.length); got.push(...again); if (got.length < n) notes.push(`mock ${form}: only ${got.length} of ${n} questions for ${type}`) }
  return got.map(i => i.id);
}
fs.mkdirSync(path.join(C, "mock"), { recursive: true });
FORMS.forEach((form, f) => {
  const questions = form.map((parts, q) => ({ n: q + 1, parts: parts.map(([label, pts, type, n, kinds]) => ({ label, pts, type, items: take(type, n, kinds, f + 1) })).filter(p => p.items.length) }));
  questions.forEach(q => { const sum = q.parts.reduce((a, p) => a + p.pts, 0); if (sum !== 100 && q.parts.length) q.parts[q.parts.length - 1].pts += 100 - sum });      // a missing part's points go to the last part
  const mock = { id: "mock-" + (f + 1), title: "Mock Exam " + (f + 1), minutes: 110, choose: 7, note: f === 0 ? "The same kinds of question as the Fall 2024 paper, part for part." : "The shape of the Fall 2024 paper, with question types from this term's lectures swapped in.", questions: questions.filter(q => q.parts.length) };
  fs.writeFileSync(path.join(C, "mock", mock.id + ".json"), JSON.stringify(mock, null, 1) + "\n");
});
console.log(`wrote ${FORMS.length} mock exams using ${used.size} practice questions` + (notes.length ? "\n  " + notes.join("\n  ") : ""));
