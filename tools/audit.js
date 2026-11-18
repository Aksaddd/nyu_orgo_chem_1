#!/usr/bin/env node
// An independent check of the answer keys: someone answers the questions without seeing the keys, and this compares.
//
//   node tools/audit.js export K N > blind.json     slice K of N (1-based) of every auto-marked question, keys removed
//   node tools/audit.js grade answers.json           answers.json is {"<id>": <answer>}; prints only the disagreements
//   node tools/audit.js show ID [ID ...]             the full item (key, reasons, solution) for the ids named
//   node tools/audit.js list written K N             slice K of N of the written items, with model answers and rubrics
//
// Answer formats: mcq → the 0-based index of the choice in the exported order; multi → a list of indexes; numeric → a
// number; rank → the exported indexes in the correct order; classify → a list of bin names, one per exported item.
const fs = require("fs"), path = require("path"), C = path.join(__dirname, "..", "content", "items");
const AUTO = ["mcq", "multi", "numeric", "rank", "classify"];
const all = fs.readdirSync(C).filter(f => f.endsWith(".json")).sort().flatMap(f => { const v = JSON.parse(fs.readFileSync(path.join(C, f), "utf8")); return Array.isArray(v) ? v : v.items || [v] });
const byId = Object.fromEntries(all.map(i => [i.id, i]));
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0 };
const mixed = (id, n) => [...Array(n).keys()].sort((a, b) => hash(id + ":" + a) - hash(id + ":" + b));      // a fixed shuffle per item
const slice = (list, k, n) => list.filter((_, i) => i % n === k - 1);
const [cmd, a1, a2, a3] = process.argv.slice(2);
if (cmd === "export") {
  const items = slice(all.filter(i => AUTO.includes(i.kind)), +a1 || 1, +a2 || 1).map(i => {
    const o = { id: i.id, type: i.type, kind: i.kind, stem: i.stem };
    if (i.kind === "mcq" || i.kind === "multi") o.choices = mixed(i.id, i.choices.length).map(j => i.choices[j].h);
    if (i.kind === "numeric") o.unit = i.unit || "";
    if (i.kind === "rank") { o.order = i.order; o.items = mixed(i.id, i.items.length).map(j => i.items[j].h) }
    if (i.kind === "classify") { o.bins = i.bins; o.items = i.items.map(x => x.h) }
    return o;
  });
  console.log(JSON.stringify(items, null, 1));
} else if (cmd === "grade") {
  const ans = JSON.parse(fs.readFileSync(a1, "utf8")); let n = 0, bad = 0;
  for (const id of Object.keys(ans)) {
    const i = byId[id], a = ans[id]; if (!i) { console.log(`${id}: no such item`); continue } n++;
    let ok, key;
    if (i.kind === "mcq") { const m = mixed(id, i.choices.length); key = m.findIndex(j => i.choices[j].ok); ok = a === key }
    else if (i.kind === "multi") { const m = mixed(id, i.choices.length); key = m.map((j, k) => i.choices[j].ok ? k : -1).filter(k => k >= 0); ok = Array.isArray(a) && a.slice().sort().join() === key.join() }
    else if (i.kind === "numeric") { key = `${i.answer} (accepted ${i.lo} to ${i.hi})`; ok = typeof a === "number" && a >= i.lo && a <= i.hi }
    else if (i.kind === "rank") { const m = mixed(id, i.items.length); key = [...Array(i.items.length).keys()].map(pos => m.indexOf(pos)); ok = Array.isArray(a) && a.join() === key.join() }
    else if (i.kind === "classify") { key = i.items.map(x => x.bin); ok = Array.isArray(a) && a.join("|") === key.join("|") }
    if (!ok) { bad++; console.log(`${id} [${i.kind}] you: ${JSON.stringify(a)}  key: ${JSON.stringify(key)}`) }
  }
  console.log(`${n} answered, ${bad} disagreement${bad === 1 ? "" : "s"}`);
} else if (cmd === "show") {
  for (const id of process.argv.slice(3)) console.log(JSON.stringify(byId[id] || { id, error: "no such item" }, null, 1));
} else if (cmd === "list" && a1 === "written") {
  console.log(JSON.stringify(slice(all.filter(i => i.kind === "written"), +a2 || 1, +a3 || 1).map(i => ({ id: i.id, type: i.type, stem: i.stem, model: i.model, rubric: i.rubric, answer: (i.solution || {}).answer })), null, 1));
} else { console.log("usage: node tools/audit.js export K N | grade answers.json | show ID… | list written K N"); process.exit(2) }
