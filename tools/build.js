#!/usr/bin/env node
// Builds data/ from content/. See docs/dev/CONTENT-SPEC.md.
//
//   node tools/build.js                    check everything, draw the structures, prove the mechanisms, write data/
//   node tools/build.js --check            the same checks, nothing written
//   node tools/build.js --check FILE...    report only the problems in these content files
//
// The chemistry (drawing, formulas, moving electrons) is done by tools/chem.py, which needs RDKit: pip install rdkit
const fs = require("fs"), path = require("path"), cp = require("child_process");
const ROOT = path.join(__dirname, ".."), C = path.join(ROOT, "content"), D = path.join(ROOT, "data");
const argv = process.argv.slice(2), checkOnly = argv.includes("--check"), quiet = argv.includes("--quiet");
const only = argv.filter(a => !a.startsWith("--")).map(f => path.resolve(f));
const problems = [], warnings = [];
const rel = f => path.relative(ROOT, f);
const bad = (file, where, msg) => problems.push({ file, text: `${rel(file)}${where ? " · " + where : ""}: ${msg}` });
const warn = (file, where, msg) => warnings.push({ file, text: `${rel(file)}${where ? " · " + where : ""}: ${msg}` });

// ------------------------------------------------------------------ reading
function readJSON(file) {
  let text; try { text = fs.readFileSync(file, "utf8") } catch (e) { return undefined }
  try { return JSON.parse(text) } catch (e) {
    const m = /position (\d+)/.exec(e.message); let at = "";
    if (m) { const pos = +m[1], line = text.slice(0, pos).split("\n").length; at = ` (line ${line}: …${text.slice(Math.max(0, pos - 40), pos + 20).replace(/\n/g, " ")}…)` }
    bad(file, "", `not valid JSON: ${e.message}${at}. A backslash inside a SMILES string must be written twice.`); return undefined;
  }
}
const list = dir => fs.existsSync(path.join(C, dir)) ? fs.readdirSync(path.join(C, dir)).filter(f => f.endsWith(".json")).sort().map(f => path.join(C, dir, f)) : [];
const arr = (x, file) => Array.isArray(x) ? x : x && Array.isArray(x.items) ? x.items : x && Array.isArray(x.mechanisms) ? x.mechanisms : x ? [x] : [];

// ------------------------------------------------------------------ text checks
const TOKEN = /\[\[([a-z0-9]+):(.*?)\]\](?!\])/g;
const MOLFLAGS = ["abbr", "me"];
const GROUPS = ["CH3", "CH2CH3", "CH2CH2CH3", "CH(CH3)2", "C(CH3)3", "F", "Cl", "Br", "I", "OH", "OCH3", "NH2", "COOH", "CN", "Ph", "D", "OTs", "SH", "N(CH3)2", "OCH2CH3"];
const KINDS = ["mcq", "multi", "numeric", "rank", "classify", "written", "mech", "chair"];
const ROLES = ["worked", "practice", "exam"];
const ASKS = ["cis-trans", "stable", "flip", "relationship", "e2"];
const TAGS = ["b", "i", "em", "strong", "sub", "sup", "br", "p", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "span", "u", "code", "blockquote"];

function molKey(arg) {
  const [smi, ...rest] = arg.split("|"); const flags = rest.join(",").split(",").map(s => s.trim()).filter(f => MOLFLAGS.includes(f)).sort();
  return smi.trim() + (flags.length ? "|" + flags.join(",") : "");
}
function species(side) { return side.split(" + ").map(s => s.trim()).filter(Boolean) }
// what a string of content refers to: structures to draw, mechanisms, figures …
function scan(str, file, where, refs) {
  if (typeof str !== "string") return;
  if (/[—–]/.test(str)) bad(file, where, `uses a dash character (— or –): write a comma, a colon, or "to". Text: "${str.slice(Math.max(0, str.search(/[—–]/) - 30), str.search(/[—–]/) + 20)}"`);
  if (/<script|style\s*=|<h[1-6]|<a\s/i.test(str)) bad(file, where, "contains a script, an inline style, a heading or a link, none of which are allowed in content");
  const stripped = str.replace(TOKEN, "").replace(/\{\{.*?\}\}/g, "");
  const open = {}; for (const m of stripped.matchAll(/<(\/?)([a-zA-Z0-9]+)[^>]*>/g)) { const t = m[2].toLowerCase(); if (!TAGS.includes(t)) { bad(file, where, `uses the tag <${t}>, which is not allowed`); continue } if (t === "br") continue; open[t] = (open[t] || 0) + (m[1] ? -1 : 1) }
  for (const t in open) if (open[t]) bad(file, where, `has an unbalanced <${t}> tag`);
  if ((str.match(/\{\{/g) || []).length !== (str.match(/\}\}/g) || []).length) bad(file, where, "has unbalanced {{ }} braces");
  if (/\[\[[a-z0-9]+:/.test(str.replace(TOKEN, ""))) bad(file, where, "has a [[token]] that is not closed with ]]");
  for (const m of str.matchAll(TOKEN)) {
    const kind = m[1], arg = m[2];
    if (kind === "mol") refs.mols.add(molKey(arg));
    else if (["rxn", "eq", "eqr", "eql", "nr"].includes(kind)) {
      const parts = arg.split(">"); if (parts.length !== 3) { bad(file, where, `[[${kind}:…]] needs the form LEFT>ABOVE;BELOW>RIGHT (found ${parts.length - 1} ">" in "${arg}")`); continue }
      for (const side of [parts[0], parts[2]]) for (const s of species(side)) { if (/^".*"$/.test(s)) continue; if (/\s/.test(s)) bad(file, where, `in [[${kind}:…]] the species "${s}" contains a space (separate species with " + ", put labels in double quotes)`); else refs.mols.add(molKey(s)) }
    }
    else if (kind === "ring" || kind === "chair") { const subs = arg.split("|")[0]; checkSubs(subs, file, where); if (kind === "chair" && !/\|(A|B)(\||,|$)/.test(arg)) bad(file, where, `[[chair:${arg}]] must say which form: add |A or |B`) }
    else if (kind === "newman") { const p = arg.split("|"); if (p.length < 2 || p[0].split(",").length !== 3 || p[1].split(",").length !== 3) bad(file, where, `[[newman:${arg}]] needs three front groups, a bar, three back groups, and optionally a bar and an angle`) }
    else if (kind === "energy") { const pts = arg.split("|")[0].split(","); if (pts.length < 3 || pts.some(p => !/^[A-Za-z][A-Za-z0-9‡']*=-?\d+(\.\d+)?$/.test(p.trim()))) bad(file, where, `[[energy:${arg}]] needs points like R=0,TS=20,P=-8`) }
    else if (kind === "mech") refs.mechs.add(arg.split("|")[0].trim());
    else if (kind === "view3d") refs.conf.add(arg.split("|")[0].trim());
    else if (kind === "fig") refs.figs.add(arg.split("|")[0].trim());
    else if (kind === "lec") { if (!/^L\d{4}:\d+$/.test(arg.trim())) bad(file, where, `[[lec:${arg}]] should look like [[lec:L1105:2]]`) }
    else bad(file, where, `unknown token [[${kind}:…]]`);
  }
}
function checkSubs(subs, file, where) {
  if (subs.trim() === "") return [];
  const out = [];
  for (const s of subs.split(",")) {
    const m = /^([1-6])([ud]):(.+)$/.exec(s.trim());
    if (!m) { bad(file, where, `cyclohexane substituent "${s}" should look like 1u:CH3 (carbon, u or d, group)`); continue }
    if (!GROUPS.includes(m[3])) warn(file, where, `cyclohexane group "${m[3]}" has no size (A-value) on record; known groups: ${GROUPS.join(", ")}`);
    if (out.some(o => o.c === m[1] && o.f === m[2])) bad(file, where, `two groups on the same face of carbon ${m[1]}`);
    out.push({ c: m[1], f: m[2], g: m[3] });
  }
  return out;
}
const deep = (o, f, pathStr = "") => { if (typeof o === "string") f(o, pathStr); else if (Array.isArray(o)) o.forEach((x, i) => deep(x, f, `${pathStr}[${i}]`)); else if (o && typeof o === "object") for (const k in o) deep(o[k], f, pathStr ? `${pathStr}.${k}` : k) };
const newRefs = () => ({ mols: new Set(), mechs: new Set(), conf: new Set(), figs: new Set() });
const need = (o, keys, file, where) => keys.filter(k => o[k] === undefined || o[k] === "" || o[k] === null).forEach(k => bad(file, where, `"${k}" is missing`));

// ------------------------------------------------------------------ load everything
const blueprintFile = path.join(C, "blueprint.json"), blueprint = readJSON(blueprintFile) || [];
const typeIds = new Set(blueprint.map(t => t.id));
blueprint.forEach((t, i) => { need(t, ["id", "title", "group"], blueprintFile, t.id || `entry ${i + 1}`) });
if (typeIds.size !== blueprint.length) bad(blueprintFile, "", "two question types share an id");

const errorsFile = path.join(C, "errors.json"), errors = readJSON(errorsFile) || [];
const errIds = new Set(arr(errors).map(e => e.id));

const fileRefs = new Map();           // output file -> refs
const refsFor = out => { if (!fileRefs.has(out)) fileRefs.set(out, newRefs()); return fileRefs.get(out) };
const itemSrc = new Map(), items = {}, mechs = {}, mechSrc = new Map(), types = {}, chapters = {}, mocks = {};

// mechanisms
for (const file of list("mechanisms")) {
  for (const m of arr(readJSON(file))) {
    const where = m.id || "a mechanism with no id"; need(m, ["id", "title", "steps", "product"], file, where);
    if (!m.id) continue; if (mechs[m.id]) bad(file, where, `the id is already used in ${rel(mechSrc.get(m.id))}`);
    mechs[m.id] = m; mechSrc.set(m.id, file); const refs = refsFor("mech");
    (m.steps || []).forEach((s, i) => { const w = `${where} step ${i + 1}`; need(s, ["species", "arrows", "say"], file, w); if (s.species) refs.mols.add(s.species);
      (s.arrows || []).forEach((a, j) => { if (!a.from || !a.to || !(("lp" in a.from) || ("bond" in a.from)) || !(("bond" in a.to) || ("atom" in a.to))) bad(file, w, `arrow ${j + 1} needs "from" ({"lp": n} or {"bond": [a, b]}) and "to" ({"bond": [a, b]} or {"atom": n})`) }) });
    if (m.product) refs.mols.add(m.product);
    deep({ ...m, steps: (m.steps || []).map(s => ({ ...s, species: "" })), product: "" }, (s, p) => scan(s, file, `${where} ${p}`, refs));
  }
}
// items
function checkItem(it, file) {
  const where = it.id || "an item with no id"; need(it, ["id", "type", "kind", "stem", "solution"], file, where);
  if (!it.id) return; if (items[it.id]) bad(file, where, `the id is already used in ${rel(itemSrc.get(it.id))}`);
  if (it.type && !typeIds.has(it.type)) bad(file, where, `type "${it.type}" is not in content/blueprint.json`);
  if (!KINDS.includes(it.kind)) bad(file, where, `kind "${it.kind}" is not one of ${KINDS.join(", ")}`);
  it.role = it.role || "practice"; if (!ROLES.includes(it.role)) bad(file, where, `role "${it.role}" is not one of ${ROLES.join(", ")}`);
  it.diff = it.diff || 2; if (![1, 2, 3].includes(it.diff)) bad(file, where, `"diff" should be 1, 2 or 3`);
  const sol = it.solution || {}; if (!Array.isArray(sol.steps) || sol.steps.length < (it.role === "worked" ? 3 : 2)) bad(file, where, `the solution needs at least ${it.role === "worked" ? 3 : 2} steps`);
  (sol.steps || []).forEach((s, i) => { if (!s || !s.t || !s.h) bad(file, where, `solution step ${i + 1} needs "t" (a short title) and "h" (the step)`); if (s && s.ask && (!s.ask.q || !s.ask.a)) bad(file, where, `solution step ${i + 1}: "ask" needs "q" and "a"`) });
  if (!sol.answer) bad(file, where, `the solution needs an "answer" (the final answer as it should be written)`);
  if (it.kind === "mcq" || it.kind === "multi") {
    const ch = it.choices;
    // an explanation that names its choices by letter or number ("A, C and D", "choice 2") only makes sense in the written order
    if (!it.fixed && Array.isArray(ch) && /\b(choice|option|answer|structure|diagram|reaction|statement|compound|product)s? [A-F1-6]\b|\([A-F]\)|"answer":"[A-F]( |,|\.|"|:)|\b[A-F], [A-F]\b|\b[A-F] and [A-F]\b|(^|[.;:] )[A-F] (is|are|was)\b/.test(JSON.stringify(it.solution || {}) + " " + ch.map(c => c.why).join(" "))) it.fixed = true; if (!Array.isArray(ch) || ch.length < 2 || ch.length > 6) bad(file, where, "needs 2 to 6 choices");
    else { const n = ch.filter(c => c.ok === true).length; if (it.kind === "mcq" && n !== 1) bad(file, where, `a circle-one question needs exactly one right choice (found ${n})`); if (it.kind === "multi" && n < 1) bad(file, where, "a circle-all-that-apply question needs at least one right choice");
      ch.forEach((c, i) => { if (!c.h) bad(file, where, `choice ${i + 1} has no text`); if (typeof c.ok !== "boolean") bad(file, where, `choice ${i + 1} needs "ok": true or false`); if (!c.why) bad(file, where, `choice ${i + 1} needs "why" (why it is right or wrong)`); if (c.err && errIds.size && !errIds.has(c.err)) warn(file, where, `choice ${i + 1}: error id "${c.err}" is not in content/errors.json`) });
      const seen = new Set(); ch.forEach(c => { if (seen.has(c.h)) bad(file, where, `two choices read the same: ${c.h}`); seen.add(c.h) }) }
  } else if (it.kind === "numeric") { if (![it.answer, it.lo, it.hi].every(n => typeof n === "number")) bad(file, where, `a numeric question needs numbers for "answer", "lo" and "hi"`); else if (!(it.lo <= it.answer && it.answer <= it.hi)) bad(file, where, `"answer" should lie between "lo" and "hi"`) }
  else if (it.kind === "rank") { if (!Array.isArray(it.items) || it.items.length < 3 || it.items.length > 6 || it.items.some(x => !x || !x.h)) bad(file, where, `a ranking needs 3 to 6 "items", each with "h", written in the correct order`); if (!it.order) bad(file, where, `a ranking needs "order" (for example "fastest first")`) }
  else if (it.kind === "classify") { if (!Array.isArray(it.bins) || it.bins.length < 2) bad(file, where, `needs at least two "bins"`); if (!Array.isArray(it.items) || it.items.length < 3) bad(file, where, `needs at least three "items"`); else it.items.forEach((x, i) => { if (!x.h || !x.why) bad(file, where, `item ${i + 1} needs "h" and "why"`); if (!(it.bins || []).includes(x.bin)) bad(file, where, `item ${i + 1}: bin "${x.bin}" is not one of the bins`) }) }
  else if (it.kind === "written") { if (!it.model) bad(file, where, `a written question needs "model" (the full-credit answer)`); if (!Array.isArray(it.rubric) || !it.rubric.length || it.rubric.some(r => !r || typeof r.pts !== "number" || !r.h)) bad(file, where, `a written question needs "rubric": [{"pts": number, "h": "what earns them"}]`); if (it.pts && Array.isArray(it.rubric) && it.rubric.reduce((a, r) => a + (r.pts || 0), 0) !== it.pts) bad(file, where, `the rubric adds up to ${it.rubric.reduce((a, r) => a + (r.pts || 0), 0)} but "pts" is ${it.pts}`) }
  else if (it.kind === "mech") { if (!it.mech) bad(file, where, `needs "mech" (a mechanism id)`); else if (!mechs[it.mech]) bad(file, where, `mechanism "${it.mech}" does not exist in content/mechanisms/`) }
  else if (it.kind === "chair") { if (typeof it.subs !== "string") bad(file, where, `a chair question needs "subs" such as "1u:CH3,2u:CH3"`); else checkSubs(it.subs, file, where); if (!["ring", "chairA", "chairB"].includes(it.given)) bad(file, where, `"given" should be "ring", "chairA" or "chairB"`); if (!Array.isArray(it.ask) || !it.ask.length || it.ask.some(a => !ASKS.includes(a))) bad(file, where, `"ask" should list one or more of ${ASKS.join(", ")}`); if ((it.ask || []).includes("e2") && !(it.lg >= 1 && it.lg <= 6)) bad(file, where, `an "e2" chair question needs "lg" (the carbon, 1 to 6, that carries the leaving group)`) }
  items[it.id] = it; itemSrc.set(it.id, file);
  deep(it, (s, p) => { if (!/^(id|type|kind|role|src|given|mech|subs|err|bin)$/.test(p.split(".").pop().replace(/\[\d+\]$/, "")) || p === "stem") scan(s, file, `${where} ${p}`, refsFor("t/" + it.type)) });
}
for (const file of list("items")) for (const it of arr(readJSON(file))) checkItem(it, file);
// question types
for (const file of list("types")) {
  const t = readJSON(file); if (!t) continue; const where = t.id || "";
  need(t, ["id", "title", "asks", "know", "method"], file, where); if (!t.id) continue;
  if (!typeIds.has(t.id)) bad(file, where, `"${t.id}" is not in content/blueprint.json`);
  if (path.basename(file, ".json") !== t.id) bad(file, where, `the file should be named ${t.id}.json`);
  if (Array.isArray(t.know) && t.know.length < 4) warn(file, where, `"know" lists only ${t.know.length} things: is that really everything needed?`);
  types[t.id] = t; deep(t, (s, p) => scan(s, file, `${where} ${p}`, refsFor("t/" + t.id)));
}
// readings
for (const file of list("read")) {
  const ch = readJSON(file); if (!ch) continue; const where = ch.id || "";
  need(ch, ["id", "n", "title", "sections"], file, where); if (!ch.id) continue;
  if (path.basename(file, ".json") !== ch.id) bad(file, where, `the file should be named ${ch.id}.json`);
  const ids = new Set(); (ch.sections || []).forEach((s, i) => { need(s, ["id", "title", "html"], file, `${where} section ${i + 1}`); if (ids.has(s.id)) bad(file, where, `two sections share the id "${s.id}"`); ids.add(s.id);
    (s.check || []).forEach(id => { if (!items[id]) bad(file, `${where} section ${s.id}`, `check item "${id}" does not exist`) }) });
  chapters[ch.id] = ch; deep(ch, (s, p) => scan(s, file, `${where} ${p}`, refsFor("read/" + ch.id)));
}
// mock exams
for (const file of list("mock")) {
  const m = readJSON(file); if (!m) continue; const where = m.id || ""; need(m, ["id", "title", "minutes", "choose", "questions"], file, where); if (!m.id) continue;
  (m.questions || []).forEach(q => { let sum = 0; (q.parts || []).forEach(p => { sum += p.pts || 0; const ids = p.items || (p.item ? [p.item] : []); if (!ids.length) bad(file, `${where} question ${q.n}${p.label || ""}`, `needs "items": [item ids]`); ids.forEach(id => { if (!items[id]) bad(file, `${where} question ${q.n}${p.label || ""}`, `item "${id}" does not exist`) }) }); if (sum !== 100) bad(file, `${where} question ${q.n}`, `the parts add up to ${sum} points, not 100`) });
  mocks[m.id] = m; deep(m, (s, p) => scan(s, file, `${where} ${p}`, refsFor("mock")));
}
// single files
const single = {};
for (const name of ["exam", "foundations", "glossary", "conf", "skills", "study"]) { const f = path.join(C, name + ".json"), v = readJSON(f); if (v !== undefined) { single[name] = v; deep(v, (s, p) => scan(s, f, p, refsFor(name === "exam" || name === "foundations" ? name : "index"))) } }
const tables = {}; for (const file of list("tables")) { const v = readJSON(file); if (v !== undefined) { tables[path.basename(file, ".json")] = v; deep(v, (s, p) => scan(s, file, p, refsFor("index"))) } }
for (const f of [blueprintFile, errorsFile]) { const v = f === blueprintFile ? blueprint : errors; deep(v, (s, p) => scan(s, f, p, refsFor("index"))) }
if (single.exam) (single.exam.questions || []).forEach(q => { let sum = 0; (q.parts || []).forEach(p => { sum += p.pts || 0; const ids = p.items || (p.item ? [p.item] : []); if (!ids.length) bad(path.join(C, "exam.json"), `question ${q.n}${p.label || ""}`, `needs "items": [item ids]`); ids.forEach(id => { if (!items[id]) bad(path.join(C, "exam.json"), `question ${q.n}${p.label || ""}`, `item "${id}" does not exist`) }) }); if ((q.parts || []).length && sum !== 100 && !q.partial) bad(path.join(C, "exam.json"), `question ${q.n}`, `the parts add up to ${sum} points, not 100`) });
{ const seen = new Set(), gf = path.join(C, "glossary.json");
  arr(single.glossary).forEach((g, i) => {
    if (!g || typeof g.term !== "string" || !g.term.trim() || typeof g.def !== "string" || !g.def.trim()) return bad(gf, "#" + (i + 1), "each entry needs a term and a def");
    const k = g.term.toLowerCase(); if (seen.has(k)) bad(gf, g.term, "listed twice"); seen.add(k);
    if (g.also && !(Array.isArray(g.also) && g.also.every(a => typeof a === "string"))) bad(gf, g.term, "also must be a list of other spellings");
    if (g.parts && !(Array.isArray(g.parts) && g.parts.every(p => Array.isArray(p) && p.length === 2))) bad(gf, g.term, "parts must be a list of [word part, meaning]");
  }) }
if (single.foundations) (single.foundations.diagnostic || []).forEach(id => { if (typeof id === "string" && !items[id]) bad(path.join(C, "foundations.json"), "diagnostic", `item "${id}" does not exist`) });
// references between things
const allRefs = newRefs(); for (const r of fileRefs.values()) for (const k in r) r[k].forEach(x => allRefs[k].add(x));
const confNames = new Set(arr(single.conf).map(c => c.name));
for (const [out, r] of fileRefs) { r.mechs.forEach(id => { if (!mechs[id]) problems.push({ file: "", text: `${out}: [[mech:${id}]] refers to a mechanism that does not exist` }) });
  r.conf.forEach(n => { if (!confNames.has(n)) problems.push({ file: "", text: `${out}: [[view3d:${n}]] is not listed in content/conf.json` }) });
  r.figs.forEach(n => { if (!fs.existsSync(path.join(ROOT, "assets", "figs", n + ".svg"))) problems.push({ file: "", text: `${out}: [[fig:${n}]] has no file assets/figs/${n}.svg` }) }) }
for (const t of blueprint) if (!types[t.id] && !only.length) warn(blueprintFile, t.id, "has no content/types file yet");

// ------------------------------------------------------------------ chemistry
let chem = { mols: {}, mech: {}, conf: {}, errors: [] };
{ const steps = []; Object.values(mechs).forEach(m => (m.steps || []).forEach(s => { if (s.species) steps.push({ key: s.species, arrows: s.arrows || [] }) }));
  const job = { mols: [...allRefs.mols], steps, mechanisms: Object.values(mechs), conf: arr(single.conf).map(c => c.smiles).filter(Boolean) };
  const r = cp.spawnSync("python3", [path.join(__dirname, "chem.py"), "compile"], { input: JSON.stringify(job), maxBuffer: 1 << 30, encoding: "utf8" });
  if (r.status !== 0 || !r.stdout) { console.error("tools/chem.py could not run. It needs RDKit:  pip install rdkit\n" + (r.stderr || "").slice(0, 2000)); process.exit(2) }
  chem = JSON.parse(r.stdout);
  const whoUses = key => { for (const [out, refs] of fileRefs) if (refs.mols.has(key)) return out; return "?" };
  for (const e of chem.errors) problems.push({ file: "", text: `${/^structure (.*?): /.test(e) ? whoUses(/^structure (.*?): /.exec(e)[1]) + ": " : ""}${e}` });
  for (const id in chem.mech) for (const p of chem.mech[id]) bad(mechSrc.get(id), id, p);
}

// ------------------------------------------------------------------ report
const mine = p => !only.length || only.includes(p.file) || (!p.file && !only.length);
const shownP = problems.filter(mine), shownW = warnings.filter(mine);
if (shownW.length && !quiet) console.log("Notes:\n  " + shownW.map(w => w.text).join("\n  "));
if (shownP.length) { console.error(`\n${shownP.length} problem${shownP.length > 1 ? "s" : ""}:\n  ` + shownP.map(p => p.text).join("\n  ")); process.exit(1) }
const count = (o, f) => Object.values(o).reduce((a, x) => { const k = f(x); a[k] = (a[k] || 0) + 1; return a }, {});
if (!quiet) console.log(`ok: ${Object.keys(items).length} items (${Object.entries(count(items, i => i.role)).map(([k, v]) => `${v} ${k}`).join(", ")}), ${Object.keys(mechs).length} mechanisms, ${Object.keys(chapters).length} readings, ${Object.keys(types).length}/${blueprint.length} question types, ${allRefs.mols.size} structures`);
if (checkOnly || only.length) process.exit(0);

// ------------------------------------------------------------------ write data/
// class.js tells Eureka's library how many questions count toward progress: say so when the bank has outgrown it
{ const m = /"orgo-drill-v1",\s*(\d+)/.exec(fs.readFileSync(path.join(__dirname, "..", "class.js"), "utf8")), n = Object.values(items).filter(i => i.role !== "worked").length;
  if (m && +m[1] !== n) console.log(`Note: class.js counts ${m[1]} questions toward progress and the bank has ${n}. Change "progress" in class.js, then run tools/build-classes.js in Eureka.`) }
const write = (name, part) => { const f = path.join(D, name + ".js"); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, "// Generated by tools/build.js from content/. Do not edit by hand.\nORGO.reg(" + JSON.stringify(part) + ");\n") };
const molsOf = out => { const o = {}; (fileRefs.get(out) || newRefs()).mols.forEach(k => { if (chem.mols[k]) o[k] = chem.mols[k] }); return o };
fs.rmSync(D, { recursive: true, force: true });
const perType = {}; for (const it of Object.values(items)) (perType[it.type] = perType[it.type] || []).push(it);
write("index", {
  blueprint: blueprint.map(t => ({ ...t, has: !!types[t.id], count: count(Object.fromEntries((perType[t.id] || []).map(i => [i.id, i])), i => i.role) })),
  index: Object.fromEntries(Object.values(items).map(i => [i.id, [i.type, i.kind, i.role, i.diff]])),
  chapterList: Object.values(chapters).sort((a, b) => a.n - b.n).map(c => ({ id: c.id, n: c.n, title: c.title, lecture: c.lecture || "", from: c.from || "", sections: c.sections.map(s => ({ id: s.id, title: s.title })) })),
  mechList: Object.values(mechs).map(m => ({ id: m.id, title: m.title, class: m.class || "", types: m.types || [], steps: m.steps.length })),
  mockList: Object.values(mocks).map(m => ({ id: m.id, title: m.title, minutes: m.minutes, choose: m.choose })),
  tables, errors: Object.fromEntries(arr(errors).map(e => [e.id, e])), skills: single.skills || [], study: single.study || null,
  confList: arr(single.conf).map(c => ({ name: c.name, title: c.title || c.name, note: c.note || "" })), mols: molsOf("index"),
});
for (const t of blueprint) write("t/" + t.id, { types: types[t.id] ? { [t.id]: types[t.id] } : {}, items: Object.fromEntries((perType[t.id] || []).map(i => [i.id, i])), mols: molsOf("t/" + t.id) });
for (const c of Object.values(chapters)) write("read/" + c.id, { chapters: { [c.id]: c }, mols: molsOf("read/" + c.id) });
write("mech", { mechs, mols: molsOf("mech") });
write("mock", { mocks, mols: molsOf("mock") });
if (single.exam) write("exam", { exam: single.exam, mols: molsOf("exam") });
if (single.foundations) write("foundations", { foundations: single.foundations, mols: molsOf("foundations") });
// The class dictionary, in the shapes Eureka reads (its docs/adding-a-class.md): LEXICON for the double-tap lookup, TERMS for the
// Word Bank, GLOSS.look for both. It is written to assets/, where Eureka looks, and assets/eureka.js loads it first.
if (arr(single.glossary).length) {
  const lex = {}; for (const g of arr(single.glossary)) lex[g.term] = [g.def, g.parts || [], g.lit || "", (g.also || []).join(",")];
  const tail = String.raw`
  const norm = s => String(s).toLowerCase().replace(/[“”"().,:;!?]/g, "").replace(/[–—]/g, "-").replace(/^(a|an|the) /, "").replace(/\s+/g, " ").trim();
  const G = {}, TERMS = {};
  for (const [term, v] of Object.entries(LEX)) { const names = [term].concat(v[3] ? v[3].split(",") : []); TERMS[names.join("|")] = v[0]; names.forEach(n => { const k = norm(n); if (k && !G[k]) G[k] = v[0] }) }
  const look = raw => { const k = norm(raw); return !k ? null : G[k] || (k.endsWith("s") && G[k.slice(0, -1)]) || G[k + "s"] || null };
  window.LEXICON = window.LEXICON || LEX; window.TERMS = window.TERMS || TERMS; window.GLOSS = window.GLOSS || { look };
  window.ROOTS = window.ROOTS || {};      // this class has no Word Roots page: an empty list stops the lookup from asking for one
})();
`;
  fs.writeFileSync(path.join(__dirname, "..", "assets", "glossary.js"), "// Generated by tools/build.js from content/glossary.json. Do not edit by hand.\n"
    + "// CHEM 225's dictionary for Eureka: \"term\": [definition, [[word part, meaning] ...], literal meaning, other forms].\n"
    + "(() => {\n  const LEX = " + JSON.stringify(lex, null, 0).replace(/\],"/g, "],\n    \"") + ";" + tail);
}
write("conf", { conf: Object.fromEntries(arr(single.conf).filter(c => chem.conf[c.smiles]).map(c => [c.name, { ...chem.conf[c.smiles], title: c.title || c.name }])) });
const size = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
if (!quiet) console.log(`wrote data/ (${(size(D) / 1024).toFixed(0)} KB)`);
