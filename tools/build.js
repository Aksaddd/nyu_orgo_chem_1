#!/usr/bin/env node
// Builds data/ from content/, and the readings as Eureka's reader shows them (read/chapters.js, read/bank.js,
// read/figures.js). See docs/dev/CONTENT-SPEC.md.
//
//   node tools/build.js                    check everything, draw the structures, prove the mechanisms, write data/ and read/
//   node tools/build.js --check            the same checks, nothing written
//   node tools/build.js --check FILE...    report only the problems in these content files
//   node tools/build.js --accept-moves     write even though a passage, question or activity of a reading changes position
//                                          (students lose their place in that reading: see "the readings for Eureka's reader" below)
//
// The chemistry (drawing, formulas, moving electrons) is done by tools/chem.py, which needs RDKit: pip install rdkit
const fs = require("fs"), path = require("path"), cp = require("child_process"), vm = require("vm");
const ROOT = path.join(__dirname, ".."), C = path.join(ROOT, "content"), D = path.join(ROOT, "data");
const argv = process.argv.slice(2), checkOnly = argv.includes("--check"), quiet = argv.includes("--quiet"), acceptMoves = argv.includes("--accept-moves");
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
    // an explanation that names its choices by letter or number ("A, C and D", "choice 2") only makes sense in the written order.
    // Not read as letters: the article in an answer ("A triplet") and the ends of bonds ("C=C, C-Br"). "fixed": false in an
    // item says its order may change whatever its explanation says.
    if (it.fixed == null && Array.isArray(ch) && /\b(choice|option|answer|structure|diagram|reaction|statement|compound|product)s? [A-F1-6]\b|\([A-F]\)|"answer":"[A-F](,|\.|"|:)|(?<![-=·])\b[A-F], [A-F]\b(?![-=·])|\b[A-F] and [A-F]\b|(^|[.;:] )[A-F] (is|are|was)\b/.test(JSON.stringify(it.solution || {}) + " " + ch.map(c => c.why).join(" "))) it.fixed = true; if (!Array.isArray(ch) || ch.length < 2 || ch.length > 6) bad(file, where, "needs 2 to 6 choices");
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
// A worked step of a homework that ends with a drawing after its last sentence ("…gives 3-methyl-2-pentene. [[mol:…]]")
// shows that drawing on a line of its own, at full size: the space before it becomes a new line. (A figure after a space
// is inside a sentence and drawn small: CONTENT-SPEC.md.) Done here, so the class's own pages and Eureka's reader agree.
const ENDFIG = /([.:!?]["”’)]*)[ \t]+((?:\[\[[a-z0-9]+:.*?\]\](?!\])[ \t]*)+)$/;
for (const c of Object.values(chapters)) for (const h of c.homework || []) for (const st of h.steps || []) if (st && typeof st.h === "string") st.h = st.h.replace(ENDFIG, "$1\n$2");
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
  // Eureka's lookup (shared/lookup.js) opens a card for the word a spelling normalises to: its norm(), with the Greek
  // letters spelled out, and forms(), its singulars. These rules are about that word, so they use the same two.
  const GREEK = { "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "π": "pi", "σ": "sigma" };
  const lkNorm = s => String(s).toLowerCase().replace(/[αβγδπσ]/g, c => GREEK[c]).replace(/[’']/g, "").replace(/[^a-z0-9+\- ]/g, " ").replace(/\s+/g, " ").trim();
  const lkForms = w => { const f = [w]; if (/ia$/.test(w)) f.push(w.replace(/ia$/, "ium")); if (/ae$/.test(w)) f.push(w.slice(0, -1)); if (/i$/.test(w)) f.push(w.replace(/i$/, "us")); if (/ata$/.test(w)) f.push(w.slice(0, -2)); if (/ies$/.test(w)) f.push(w.replace(/ies$/, "y")); if (/(s|x|ch|sh)es$/.test(w)) f.push(w.slice(0, -2)); if (/s$/.test(w) && !/ss$/.test(w)) f.push(w.slice(0, -1)); if (/ed$/.test(w)) f.push(w.slice(0, -1), w.slice(0, -2)); return f };
  const ORDINARY = ["bond", "bonds", "hydrogen", "hydrogens", "value", "values", "carbon", "group", "base", "acid"];      // words that must never open a card, except the entry that is that word
  const claimed = new Map();
  arr(single.glossary).forEach((g, i) => {
    if (!g || typeof g.term !== "string" || !g.term.trim() || typeof g.def !== "string" || !g.def.trim()) return bad(gf, "#" + (i + 1), "each entry needs a term and a def");
    const k = g.term.toLowerCase(); if (seen.has(k)) bad(gf, g.term, "listed twice"); seen.add(k);
    if (g.also && !(Array.isArray(g.also) && g.also.every(a => typeof a === "string"))) bad(gf, g.term, "also must be a list of other spellings");
    if (g.parts && !(Array.isArray(g.parts) && g.parts.every(p => Array.isArray(p) && p.length === 2))) bad(gf, g.term, "parts must be a list of [word part, meaning]");
    const own = lkNorm(g.term);
    for (const s of [g.term].concat(Array.isArray(g.also) ? g.also.filter(a => typeof a === "string") : [])) {
      const w = lkNorm(s);
      if (/[Ͱ-Ͽἀ-῿]/.test(s)) bad(gf, g.term, `"${s}" has a Greek letter: spell it out ("pi bond", "beta hydrogen"), as the lookup reads it`);
      else if (!/[a-z]/i.test(s)) bad(gf, g.term, `"${s}" has no letter, and the lookup reads only words with letters: a tap on "1S" would land on it`);
      if (/^(a|an|the)\s/i.test(s.trim())) bad(gf, g.term, `"${s}" begins with "a", "an" or "the": write it without`);
      if (ORDINARY.includes(w) && !(lkForms(w).includes(own) || lkForms(own).includes(w))) bad(gf, g.term, `"${s}" is read as "${w}", an ordinary word that must never open this card`);
      if (w && claimed.has(w) && claimed.get(w) !== g.term) bad(gf, g.term, `"${s}" is read as "${w}", which "${claimed.get(w)}" already claims`); else if (w) claimed.set(w, g.term);
    }
  }) }
if (single.foundations) (single.foundations.diagnostic || []).forEach(id => { if (typeof id === "string" && !items[id]) bad(path.join(C, "foundations.json"), "diagnostic", `item "${id}" does not exist`) });
// The questions of the readings (check): practice questions of a kind the reader marks (not written), each asked in one
// place only (not in a mock exam, the past exam or the foundations check, not in two readings), at most 2 in a passage.
{ const elsewhere = new Map(), mark = (id, w) => { if (typeof id === "string" && !elsewhere.has(id)) elsewhere.set(id, w) }, ids = p => p.items || (p.item ? [p.item] : []);
  for (const m of Object.values(mocks)) (m.questions || []).forEach(q => (q.parts || []).forEach(p => ids(p).forEach(id => mark(id, `mock exam "${m.id}"`))));
  if (single.exam) (single.exam.questions || []).forEach(q => (q.parts || []).forEach(p => ids(p).forEach(id => mark(id, "the past exam (content/exam.json)"))));
  if (single.foundations) (single.foundations.diagnostic || []).forEach(id => mark(id, "the foundations check (content/foundations.json)"));
  const asked = new Map();
  for (const c of Object.values(chapters)) (c.sections || []).forEach(s => {
    const file = path.join(C, "read", c.id + ".json"), where = `${c.id} section ${s.id}`, list = s.check || [];
    if (list.length > 2) bad(file, where, `asks ${list.length} questions (${list.join(", ")}): a passage asks at most 2`);
    for (const id of list) { const it = items[id]; if (!it) continue;
      if (it.role !== "practice") bad(file, where, `"${id}" is ${it.role === "exam" ? "an exam" : "a worked"} item: a reading asks practice questions only`);
      if (it.kind === "written") bad(file, where, `"${id}" is a written question, which the reader cannot mark`);
      if (elsewhere.has(id)) bad(file, where, `"${id}" is also used by ${elsewhere.get(id)}`);
      if (asked.has(id)) bad(file, where, `"${id}" is also asked in ${asked.get(id)}`); else asked.set(id, where) }
  }) }
// The readings at other levels (read/levels/*.js: written for Eureka's level dial and checked there by Eureka's own
// tools) may carry {{formulas}} and [[figures]] like any text. Their figures are checked and drawn with the rest.
const levelText = [];
{ const dir = path.join(ROOT, "read", "levels");
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(".js")).sort() : []) {
    const file = path.join(dir, f), w = { READ_LEVELS: { text: {}, qs: {}, play: {} } };
    try { vm.runInNewContext(fs.readFileSync(file, "utf8"), { window: w }) } catch (e) { bad(file, "", "does not run: " + e.message); continue }
    deep(w.READ_LEVELS, (str, where) => { levelText.push(str); scan(str, file, where, refsFor("read/levels")) });
  } }
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

// ------------------------------------------------------------------ the readings for Eureka's reader
// Inside Eureka the readings are shown by the platform's reader (read/index.html, a copy of ECON 101's page). It reads
//   read/chapters.js   window.READ: every reading as passages, with the questions and the activities under each passage
//   read/bank.js       window.BANK: the circle-one questions those passages name
//   read/figures.js    the drawings' data (structures, the mechanisms shown in a reading): nothing is fetched while reading
// All three are made here from content/read and content/items, never by hand. {{formulas}} and [[figures]] stay as they
// are in the strings: read/chem.js draws them in the page.
// The reader files a student's place, the notes and the reading-level texts by position (passage 3, its activity 2), so
// read/positions.json remembers where everything sits, and the build stops when a position would move. New passages,
// questions and activities may only be added after the ones that are there. docs/dev/ARCHITECTURE.md has the whole map.
const READER = path.join(ROOT, "read"), POSITIONS = path.join(READER, "positions.json");
const KEPT = "The reader keeps a student's place, the notes and the reading-level texts by position. Add after what is there, or run the build with --accept-moves if the move is meant";
// the structures and mechanisms a string of content needs for its [[figures]] (the same reading of tokens as scan(), without the checks)
function figRefs(str, refs) {
  for (const m of String(str).matchAll(TOKEN)) { const kind = m[1], arg = m[2];
    if (kind === "mol") refs.mols.add(molKey(arg));
    else if (["rxn", "eq", "eqr", "eql", "nr"].includes(kind)) { const p = arg.split(">"); if (p.length === 3) for (const side of [p[0], p[2]]) for (const s of species(side)) if (!/^".*"$/.test(s)) refs.mols.add(molKey(s)) }
    else if (kind === "mech") refs.mechs.add(arg.split("|")[0].trim()) }
}
const DRAWN = ["mol", "rxn", "eq", "eqr", "eql", "nr", "ring", "chair", "newman", "energy", "mech"];      // the kinds of figure the reader's page can draw (read/index.html loads their code)
const reader = problems.length ? null : (() => {      // not on top of content that is already known to be wrong
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const br = s => String(s == null ? "" : s).replace(/\n\s*\n/g, "<br>");      // a blank line is a line break, as ORGO.html reads it
  const stop = s => /[.!?:]["”’)]*\s*$/.test(String(s).replace(/<[^>]+>/g, "")) ? s : s + ".";
  const num = x => String(Math.round(x * 100) / 100).replace("-", "−"), unit = u => !u ? "" : /^[%°]/.test(u) ? u : " " + u;
  // the choices carry numbers, not letters, when the question's own words number them: the rule of tagsOf in assets/quiz.js
  const numbered = it => /\b(diagram|choice|option|structure|product|compound|reaction|statement|chair|alkene)s? [1-6]\b/i.test(JSON.stringify([it.stem, it.solution, (it.choices || []).map(c => c.why)]));
  // a question's stem as the title of an activity. The reader prints a title as plain text, so the tags go (formulas stay)
  const title = (it, drop) => {
    if (/\[\[|<(table|ul|ol|p|br)\b/i.test(it.stem)) bad(itemSrc.get(it.id), it.id, "is used under a reading as an activity, and its stem has a figure, a list or a table. The title of an activity can only show words: use another question there");
    const t = String(it.stem).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(); return drop ? t.replace(drop, "").trim() : t;
  };
  // a circle-all-that-apply question becomes two boxes to sort its statements into, named for what its stem asks:
  // [the wording, the box for the statements to circle, the box for the others]
  const BOXES = [
    [/\bis <b>NOT<\/b> a characteristic of (.+?) reactions\?/, m => ["Not a characteristic of " + m[1], "A characteristic of " + m[1]]],
    [/<b>is<\/b> a characteristic of (.+?) reactions\?/, m => ["A characteristic of " + m[1], "Not a characteristic of " + m[1]]],
    [/\bfit\?/, () => ["Fits", "Does not fit"]],
    [/\bare correct\?/, () => ["Correct", "Not correct"]],
    [/\b(is|are) true\?/, () => ["True", "Not true"]],
  ];
  // the pictures of the professor's pages that a passage was written from: opened in the reader's own viewer (read/chem.js)
  const page = (spec, file, where) => {
    const m = /^([A-Za-z0-9]+):(\d+)$/.exec(spec || ""); if (!m) return "";
    const png = `archive/pages/${m[1]}-${m[1] === "EX" ? m[2].padStart(2, "0") : m[2]}.png`, d = /^L(\d\d)(\d\d)$/.exec(m[1]);
    if (!fs.existsSync(path.join(ROOT, png))) { warn(file, where, `the picture of the original page "${spec}" is not in archive/pages/`); return "" }
    return `<a class="rc-page" href="../${png}">${d ? d[1] + "/" + d[2] + " " : ""}page ${m[2]}</a>`;
  };
  const source = (pages, file, where) => { const a = [...new Set(pages || [])].map(p => page(p, file, where)).filter(Boolean); return a.length ? `\n<p class="rc-src">Original notes: ${a.join(", ")}.</p>` : "" };
  const more = (cls, label, m) => `\n<details class="rc-more ${cls}"><summary>${label}${m.t ? ": " + esc(m.t) : ""}</summary><div class="rc-body">${br(m.h)}</div></details>`;
  const lecture = c => { const d = String(c.lecture || "").split(",").map(s => /\d{4}-(\d{2})-(\d{2})/.exec(s)).filter(Boolean).map(m => m[1] + "/" + m[2]); return d.length > 1 ? "Lectures " + d.slice(0, -1).join(", ") + " and " + d[d.length - 1] : d.length ? "Lecture " + d[0] : "Review" };
  const intro = c => (c.from ? "Source: " + stop(esc(c.from)) : "") + ((c.goals || []).length ? (c.from ? "<br>" : "") + "After this reading you can:" + c.goals.map(g => "<br>• " + br(g)).join("") : "");

  const READ = [], Q = {}, pos = {}, went = { mcq: 0, numeric: 0, rank: 0, classify: 0, multi: 0, mech: 0, chair: 0, why: 0 };
  for (const c of Object.values(chapters).sort((a, b) => a.n - b.n)) {
    const file = path.join(C, "read", c.id + ".json"), sections = [], P = pos[c.id] = [];
    if (/[<>&{}\[\]]/.test(c.title)) bad(file, c.id, "the title of a reading must be plain words: the reader also shows it in the browser tab and in dialogs");
    (c.sections || []).forEach(s => {
      const where = `${c.id} section ${s.id}`, qs = [], play = [], keys = [], links = [], checks = (s.check || []).map(id => items[id]).filter(Boolean);
      if (/[<>&{}\[\]]/.test(s.title)) bad(file, where, "the title of a section must be plain words");
      // activities, in this order: the why question, then rankings, sortings, circle-all-that-apply, numbers
      if (s.why && s.why.q) { play.push({ t: "flip", title: "Before you move on", cards: [[br(s.why.q), br(s.why.a)]] }); keys.push("why"); went.why++ }
      // a ranking is played as Eureka's "Put it in order", whose own line under the chips is about steps: tip says what to tap
      for (const it of checks) if (it.kind === "rank") { play.push({ t: "order", title: title(it), how: stop(it.order.charAt(0).toUpperCase() + it.order.slice(1)), tip: "Tap them in that order, first to last.", items: it.items.map(x => br(x.h)) }); keys.push("rank:" + it.id); went.rank++ }
      for (const it of checks) if (it.kind === "classify") { play.push({ t: "sort", title: title(it), bins: it.bins.map(br), items: it.items.map(x => [br(x.h), it.bins.indexOf(x.bin)]) }); keys.push("classify:" + it.id); went.classify++ }
      for (const it of checks) if (it.kind === "multi") {
        const rule = BOXES.find(r => r[0].test(it.stem));
        if (!rule) { bad(itemSrc.get(it.id), it.id, `is used under a reading, where a circle-all-that-apply question is shown as two boxes, and tools/build.js (BOXES) has no names for the boxes of a stem worded like this one`); continue }
        play.push({ t: "sort", title: title(it, /\s*Circle all that apply\.?$/i), bins: rule[1](rule[0].exec(it.stem)), items: it.choices.map(ch => [br(ch.h), ch.ok ? 0 : 1]) }); keys.push("multi:" + it.id); went.multi++;
      }
      for (const it of checks) if (it.kind === "numeric") {
        const back = `<b>${it.lo === it.hi ? "" : "About "}${num(it.answer)}${unit(it.unit)}</b>. ` + [it.solution && it.solution.rule, it.note].filter(Boolean).map(x => stop(br(x))).join(" ");
        play.push({ t: "flip", title: "Work it out, then flip the card", cards: [[br(it.stem), back.trim()]] }); keys.push("numeric:" + it.id); went.numeric++;
      }
      // circle-one questions: asked under the passage, from read/bank.js
      for (const it of checks) if (it.kind === "mcq") {
        const ok = it.choices.find(ch => ch.ok), wrong = it.choices.filter(ch => !ch.ok);
        if (it.choices.length > 5) bad(itemSrc.get(it.id), it.id, "is used under a reading, where a question can show at most 5 choices");
        const e = Q[it.id] = { d: it.type, tag: it.type, q: br(it.stem), ok: br(ok.h), wrong: wrong.map(ch => br(ch.h)),
          ex: [ok.why, it.solution && it.solution.answer ? "<b>Answer:</b> " + it.solution.answer : "", it.note].filter(Boolean).map(x => stop(br(x))).join(" "),
          why: Object.fromEntries(wrong.map(ch => [br(ch.h), br(ch.why)])) };
        if (it.fixed) e.keep = it.choices.indexOf(ok);      // the written order is kept: the explanation names the choices by their place
        if (numbered(it)) e.tags = "12345";
        qs.push(it.id); went.mcq++;
      }
      // a mechanism to draw and a chair to draw cannot be shown by the reader: the passage ends with the way to the class's own tool
      for (const it of checks) {
        if (it.kind === "mech") { const m = mechs[it.mech]; links.push(`\n<p class="rc-go">This part has a mechanism to draw: <a href="../mechanisms/index.html#${it.mech}/solo">open “${esc(m ? m.title : it.mech).replace(/\b(SN1|SN2)\b/g, "{{$1}}")}” in the Mechanism Studio</a>.</p>`); went.mech++ }
        else if (it.kind === "chair") { const t = blueprint.find(x => x.id === it.type) || {}; links.push(`\n<p class="rc-go">This part has a chair question to draw: <a href="../drill/index.html?type=${it.type}">open “${esc(t.short || t.title || it.type)}” in Practice</a>.</p>`); went.chair++ }
        else if (!["mcq", "rank", "classify", "multi", "numeric"].includes(it.kind)) bad(file, where, `check item "${it.id}" is a ${it.kind} question, which cannot be shown under a reading`);
      }
      const html = br(s.html) + (s.micro || []).map(m => more("rc-micro", "Closer look", m)).join("") + (s.macro || []).map(m => more("rc-macro", "Bigger picture", m)).join("") + source(s.pages, file, where) + links.join("");
      sections.push(play.length ? { h: esc(s.title), html, qs, play } : { h: esc(s.title), html, qs }); P.push([s.id, qs, keys]);
    });
    // after the lecture's own sections: its homework with the worked steps, and the summary. Neither has questions.
    // (<strong> for the labels: in the reader <b> marks a key term, which is underlined and looked up as one. rc-s holds one
    // whole string of content, so that read/chem.js sees where it starts and ends, as ORGO.html does on the class's own pages)
    if ((c.homework || []).length) {
      const many = c.homework.length > 1;
      sections.push({ h: "Homework from the lecture", qs: [], html: c.homework.map((h, k) => `<div class="rc-hw"><strong>The professor's prompt${many ? " " + (k + 1) : ""}.</strong> <span class="rc-s">${br(h.q)}</span></div>` + source(h.from ? [h.from] : [], file, c.id + " homework")
        + `\n<details class="rc-more rc-steps"><summary>Try it on paper first. Then open the worked steps</summary><div class="rc-body">`
        + ((h.steps || []).length ? `<ol>${h.steps.map(st => `<li>${st.t ? `<strong>${esc(st.t)}</strong>` : ""}<div class="rc-s">${br(st.h)}</div></li>`).join("")}</ol>` : "") + (h.answer ? `<p><strong>Answer.</strong> <span class="rc-s">${br(h.answer)}</span></p>` : "") + `</div></details>`).join("\n") });
      P.push(["@homework", [], []]);
    }
    if ((c.summary || []).length) { sections.push({ h: "In short", qs: [], html: `<ul>${c.summary.map(x => `<li>${br(x)}</li>`).join("")}</ul>` }); P.push(["@summary", [], []]) }
    READ.push({ id: c.id, topic: c.title, title: c.title, ch: lecture(c), intro: intro(c), sections });
  }
  // every drawing those strings ask for, and what the mechanisms among them need
  const refs = { mols: new Set(), mechs: new Set() }, figures = { mols: {}, mechs: {} };
  deep([READ, Q, levelText], s => figRefs(s, refs));
  { const not = new Set(); deep([READ, Q, levelText], s => { for (const m of String(s).matchAll(TOKEN)) if (!DRAWN.includes(m[1])) not.add(m[1]) });
    not.forEach(k => problems.push({ file: "", text: `read/chapters.js: a reading, a question under a reading or a level text has [[${k}:…]], a kind of figure Eureka's reader page cannot draw (it draws ${DRAWN.join(", ")})` })) }
  for (const id of refs.mechs) { const m = mechs[id]; if (!m) continue; figures.mechs[id] = m; (m.steps || []).forEach(s => s.species && refs.mols.add(s.species)); if (m.product) refs.mols.add(m.product); deep({ ...m, steps: (m.steps || []).map(s => ({ ...s, species: "" })), product: "" }, s => figRefs(s, refs)) }
  for (const k of [...refs.mols].sort()) { if (chem.mols[k]) figures.mols[k] = chem.mols[k]; else problems.push({ file: "", text: `read/figures.js: the structure "${k}" has no drawing` }) }
  // nothing that is there may move
  let old = null; try { old = JSON.parse(fs.readFileSync(POSITIONS, "utf8")).chapters } catch (e) { }
  const moves = [], prefix = (a, b) => a.every((x, i) => b[i] === x);
  for (const id in old || {}) {
    if (!pos[id]) { moves.push(`the reading "${id}" is gone`); continue }
    old[id].forEach(([sid, qs, keys], i) => {
      const now = pos[id][i], at = `${id}, passage ${i + 1} (${sid})`;
      if (!now || now[0] !== sid) return moves.push(`${at}: ${now ? `"${now[0]}" is in its place` : "it is gone"}`);
      if (!prefix(qs, now[1])) moves.push(`${at}: its questions were ${qs.join(", ") || "none"} and are now ${now[1].join(", ") || "none"}`);
      if (!prefix(keys, now[2])) moves.push(`${at}: its activities were ${keys.join(", ") || "none"} and are now ${now[2].join(", ") || "none"}`);
    });
  }
  if (moves.length && !acceptMoves) problems.push({ file: "", text: `read/chapters.js: ${moves.length} position${moves.length > 1 ? "s" : ""} would move.\n      ${moves.join("\n      ")}\n    ${KEPT}.` });
  const head = what => `// Generated by tools/build.js from content/read and content/items. Do not edit by hand.\n// CHEM 225 · ${what}\n`;
  return { READ, Q, figures, pos, went, moves, files: {
    "chapters.js": head("the readings as Eureka's reader shows them: passages, the questions under them (ids of read/bank.js) and the activities.") + "window.READ = " + JSON.stringify(READ, null, 1) + ";\n",
    "bank.js": head("the circle-one questions under the readings. ok is the right choice, wrong the others, why says why each wrong one is wrong;\n// keep (when present) is the place of the right choice in the written order, which is then kept; tags numbers the choices.") + "window.BANK = " + JSON.stringify({ title: "CHEM 225 Read & Learn", storageKey: "orgo-drill-v1", q: Q }, null, 1) + ";\n",
    "figures.js": head("the data of every drawing in read/chapters.js and read/bank.js (structures, and the mechanisms shown inside a reading).") + "ORGO.reg({\"mols\":{\n" + Object.keys(figures.mols).map(k => JSON.stringify(k) + ":" + JSON.stringify(figures.mols[k])).join(",\n") + "\n},\"mechs\":{\n" + Object.keys(figures.mechs).map(k => JSON.stringify(k) + ":" + JSON.stringify(figures.mechs[k])).join(",\n") + "\n}});\n",
    "positions.json": "{\n \"note\": \"Written by tools/build.js. Where each passage, question and activity of a reading sits in read/chapters.js: [section, [questions], [activities]]. " + KEPT.replace(/"/g, "'") + ".\",\n \"chapters\": {\n" + Object.keys(pos).map(id => "  " + JSON.stringify(id) + ": [\n" + pos[id].map(p => "   " + JSON.stringify(p)).join(",\n") + "\n  ]").join(",\n") + "\n }\n}\n",
  } };
})();
// The three files as they are on disk, read the way the page reads them: every question a passage names is in the bank,
// every drawing has its data, no question has more choices than the reader can letter, and positions.json agrees.
function readerFiles() {
  const out = [], src = n => fs.readFileSync(path.join(READER, n), "utf8"), say = t => out.push(t);
  let R, B, F, P;
  try { const w = {}; vm.runInNewContext(src("chapters.js") + src("bank.js"), { window: w }); R = w.READ; B = w.BANK; vm.runInNewContext(src("figures.js"), { ORGO: { reg: x => { F = x } } }); P = JSON.parse(src("positions.json")).chapters } catch (e) { return ["read/: the reader's files cannot be read: " + e.message] }
  if (!Array.isArray(R) || !B || !B.q || !F || !F.mols || !P) return ["read/: chapters.js, bank.js, figures.js or positions.json does not hold what the reader expects"];
  const need = { mols: new Set(), mechs: new Set() }; deep([R, B.q, levelText], s => { figRefs(s, need); for (const m of String(s).matchAll(TOKEN)) if (!DRAWN.includes(m[1])) say(`read/: a text for the reader has [[${m[1]}:…]], a kind of figure the reader's page cannot draw`) });
  for (const id of need.mechs) { const m = (F.mechs || {})[id]; if (!m) { say(`read/figures.js: the mechanism "${id}" is missing`); continue } (m.steps || []).forEach(s => s.species && need.mols.add(s.species)); if (m.product) need.mols.add(m.product); deep({ ...m, steps: (m.steps || []).map(s => ({ ...s, species: "" })), product: "" }, s => figRefs(s, need)) }
  for (const k of need.mols) if (!F.mols[k]) say(`read/figures.js: the structure "${k}" is missing`);
  const ids = new Set();
  R.forEach(c => { if (ids.has(c.id)) say(`read/chapters.js: two chapters share the id "${c.id}"`); ids.add(c.id);
    if (JSON.stringify((c.sections || []).map(s => [s.qs || [], (s.play || []).length])) !== JSON.stringify((P[c.id] || []).map(p => [p[1], p[2].length]))) say(`read/positions.json does not describe "${c.id}" as read/chapters.js has it`);
    (c.sections || []).forEach((s, i) => { if (typeof s.h !== "string" || typeof s.html !== "string" || !Array.isArray(s.qs)) say(`read/chapters.js: ${c.id}, passage ${i + 1} needs h, html and qs`);
      (s.qs || []).forEach(id => { if (!B.q[id]) say(`read/chapters.js: ${c.id}, passage ${i + 1} asks question "${id}", which is not in read/bank.js`) });
      (s.play || []).forEach((b, j) => { if (!["flip", "order", "sort", "match"].includes(b.t)) say(`read/chapters.js: ${c.id}, passage ${i + 1}, activity ${j + 1} is of a kind the reader cannot play ("${b.t}")`) }) }) });
  for (const id in B.q) { const q = B.q[id], all = [q.ok].concat(q.wrong || []);
    if (typeof q.q !== "string" || typeof q.ok !== "string" || !Array.isArray(q.wrong) || !q.wrong.length) { say(`read/bank.js: "${id}" needs q, ok and wrong`); continue }
    if (all.length > 5) say(`read/bank.js: "${id}" has ${all.length} choices and the reader letters five`);
    if (new Set(all).size !== all.length) say(`read/bank.js: two choices of "${id}" read the same`);
    if (q.keep != null && !(q.keep >= 0 && q.keep <= q.wrong.length)) say(`read/bank.js: "${id}" keeps its written order, and the place of its right choice is not in it`) }
  return out;
}
if (reader && !only.length) {
  if (checkOnly && fs.existsSync(path.join(READER, "chapters.js"))) {
    for (const t of readerFiles()) problems.push({ file: "", text: t });
    const stale = Object.keys(reader.files).filter(n => { try { return fs.readFileSync(path.join(READER, n), "utf8") !== reader.files[n] } catch (e) { return true } });
    if (stale.length) warn(READER, "", `the content has changed since ${stale.map(n => "read/" + n).join(", ")} ${stale.length > 1 ? "were" : "was"} written: run node tools/build.js`);
  }
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
  const lex = {}; for (const g of arr(single.glossary)) lex[g.term] = [g.def, g.parts || [], g.lit || "", (g.also || []).map(a => a.replace(/,/g, " ")).join(",")];      // a comma inside a spelling (1,3-diaxial) would cut it in two: the lookup reads it as a space anyway
  const tail = String.raw`
  const GREEK = { "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "π": "pi", "σ": "sigma" };      // spelled out, as Eureka's lookup does: "π bond" is "pi bond"
  const norm = s => String(s).toLowerCase().replace(/[αβγδπσ]/g, c => GREEK[c]).replace(/,/g, " ").replace(/[“”"().:;!?]/g, "").replace(/[–—]/g, "-").replace(/^(a|an|the) /, "").replace(/\s+/g, " ").trim();
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
// the readings for Eureka's reader, then the same files read back from disk and checked as the page will read them
for (const n in reader.files) fs.writeFileSync(path.join(READER, n), reader.files[n]);
{ const wrong = readerFiles(); if (wrong.length) { console.error(`\nThe reader's files were written, and ${wrong.length} thing${wrong.length > 1 ? "s are" : " is"} wrong in them:\n  ` + wrong.join("\n  ")); process.exit(1) } }
if (reader.moves.length) console.log(`Note: ${reader.moves.length} position${reader.moves.length > 1 ? "s" : ""} in the readings moved, as --accept-moves allows:\n  ${reader.moves.join("\n  ")}`);
if (!quiet) { const w = reader.went, n = reader.READ.reduce((a, c) => a + c.sections.length, 0), kb = Object.values(reader.files).reduce((a, t) => a + Buffer.byteLength(t), 0) / 1024;
  console.log(`wrote read/chapters.js, bank.js, figures.js, positions.json (${kb.toFixed(0)} KB): ${reader.READ.length} readings, ${n} passages, ${Object.keys(reader.figures.mols).length} structures, ${Object.keys(reader.figures.mechs).length} mechanisms\n  the questions under the passages: ${w.mcq} circle-one asked in the reader; as activities: ${w.why} why cards and ${w.numeric} numbers (flip), ${w.rank} rankings (order), ${w.classify} sortings and ${w.multi} circle-all-that-apply (sort); as links to the class's own tools: ${w.mech} mechanisms, ${w.chair} chairs`) }
