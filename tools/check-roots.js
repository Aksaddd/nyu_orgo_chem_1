#!/usr/bin/env node
// Checks the Word Roots list (roots/roots.js) and what it does in Eureka's dictionary. Run after any change to it, to the
// class dictionary (content/glossary.json) or to the course text.
//   node tools/check-roots.js            every check, then the words the roots give a card to
//   node tools/check-roots.js --quiet    only the problems (tools/test/run.js runs it so, through tools/test/roots.test.js)
//   node tools/check-roots.js --list     also every guessed card and the roots each question kind is linked to
// 1. The list: its shape (roots.js's header), unique roots, question kinds that exist (data/index.js), example terms that
//    occur whole in the course text and are not ordinary words, and the house style: no Greek letters, no dash used as
//    punctuation, no exclamation marks, "practise" as the verb.
// 2. The pages: every exam line names a root, by the rule both roots/index.html and tools/wordroots.js apply (and the two
//    agree), alone/roots/index.html is up to date, the front page counts the roots right.
// 3. The dictionary: assets/glossary.js gives Eureka's lookup the list (it no longer sets ROOTS) and every entry the word
//    parts tools/build.js fills in. Then Eureka's lookup (shared/lookup.js, copied below) is run over every word of the
//    course text and a list of ordinary words, with and without the roots: no card may come to an ordinary word through
//    the roots, and every { "auto": false } root must stay out of the words it was switched off for.
const fs = require("fs"), path = require("path"), vm = require("vm"), cp = require("child_process");
const WR = require("./wordroots.js");
const ROOT = path.join(__dirname, ".."), C = path.join(ROOT, "content");
const argv = process.argv.slice(2), quiet = argv.includes("--quiet"), listAll = argv.includes("--list");
const fails = [], notes = [], fail = m => fails.push(m), note = m => notes.push(m);
const say = (...a) => { if (!quiet) console.log(...a) };
const wrap = (list, w = 116) => list.reduce((lines, x) => { const l = lines[lines.length - 1]; if (l.length + x.length + 2 > w) lines.push("    " + x); else lines[lines.length - 1] = l + (l.trim() ? ", " : "") + x; return lines }, ["    "]).join("\n");

// ------------------------------------------------------------------ the course text
// Every string a student reads: the dictionary, the readings and their level texts, the question kinds, the questions,
// the mechanisms, the mock exams, the past exam, the foundations check, the blueprint, and the lecture notes.
const SKIP = new Set(["id", "type", "src", "kind", "role", "diff", "n", "from", "exam", "class", "types", "lecture", "step", "level"]);
const strs = (o, out) => { if (typeof o === "string") out.push(o); else if (Array.isArray(o)) o.forEach(x => strs(x, out)); else if (o && typeof o === "object") for (const k in o) { if (SKIP.has(k) && typeof o[k] !== "object") continue; strs(o[k], out) } return out };
const clean = s => s.replace(/\[\[[a-z0-9]+:[^\]]*\]\]/g, " ").replace(/\{\{([^}]*)\}\}/g, " $1 ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
const json = f => JSON.parse(fs.readFileSync(f, "utf8"));
const dir = (d, ext = ".json") => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith(ext)).sort().map(f => path.join(d, f)) : [];
const GLOSSARY = json(path.join(C, "glossary.json"));
const TEXT = [].concat(
  GLOSSARY.map(e => [e.term, ...(e.also || []), e.def, e.lit || ""].join(" . ")),
  ...[path.join(C, "read"), path.join(C, "types"), path.join(C, "items"), path.join(C, "mechanisms"), path.join(C, "mock")].map(d => dir(d).flatMap(f => strs(json(f), []))),
  ...["exam.json", "foundations.json", "blueprint.json"].map(f => path.join(C, f)).filter(fs.existsSync).map(f => strs(json(f), [])),
  ...dir(path.join(ROOT, "read", "levels"), ".js").map(f => [...fs.readFileSync(f, "utf8").matchAll(/`([^`]*)`|"((?:[^"\\]|\\.)*)"/g)].map(m => m[1] !== undefined ? m[1] : m[2]).filter(s => s.length > 3)),
  fs.existsSync(path.join(ROOT, "docs", "dev", "LECTURES.md")) ? fs.readFileSync(path.join(ROOT, "docs", "dev", "LECTURES.md"), "utf8").split(/\n+/) : []
).map(clean);
const CORPUS = TEXT.join("\n").toLowerCase();
const WORDS = new Map(); for (const t of TEXT) for (const w of t.toLowerCase().match(/[a-zα-ω]+(?:['’-][a-zα-ω]+)*/g) || []) WORDS.set(w, (WORDS.get(w) || 0) + 1);
const inCourse = t => new RegExp("(^|[^a-z0-9])" + t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![a-z0-9])").test(CORPUS);

// Ordinary words. The dictionary's own list (tools/build.js: never a card, except the entry that is the word), the single
// words that are ordinary English in the readings (no example term may be one), and for each root switched off with
// { "auto": false }, the ordinary words it would be guessed in (why it is switched off: they must stay without a card).
const ORDINARY = ["bond", "bonds", "hydrogen", "hydrogens", "value", "values", "carbon", "group", "base", "acid"];
const PLAIN = ["signal", "ring", "anti", "steric", "shift", "inversion", "retention", "integration", "splitting", "induction", "equilibrium", "envelope", "chair", "boat", "wedge", "dash", "resonance", "intermediate", "concerted", "primary", "secondary", "tertiary", "elimination", "substitution", "configuration", "protic", "solvent", "ion", "water", "oxygen", "nitrogen", "sulfur", "metal", "temperature", "concentration", "reagent", "substrate", "product", "mechanism"];
const TRAPS = {
  "hal-": "half halves hall shall halt chalk", "-ide": "side decide inside idea beside guide wide hide", "-ate": "water rate state later rotate donate late heated",
  "meth-": "method methods", "eth-": "method ethic teeth ether", "prop-": "property proposed proper propose prophet", "but-": "but butter button debut",
  "alk-": "walk talk chalk stalk", "-mer": "calmer former summer hammer timer", "vers-": "covers delivers oversee overseas", "tors-": "factors torso",
  "duc-": "reduce deduce adduct duck", "hydro-": "hydrogen hydrogens", "con-": "second cone icon bacon", "inter-": "internal winter printer painter",
  "exo-": "hexose", "-lysis": "analysis", "sulf-": "sulfur sulfurs", "anti-": "quantity substantial antique mantis", "peri-": "period periodic peril perish superior",
  "-ene": "opened scene gene serene", "-ane": "plane lane crane", "tri-": "trial tries trick string strict trip trim strip", "carbo-": "carbon carbons",
  "cation": "complication simplification classification applications multiplication education location", "ion": "motion option action subtraction lion union onion nation",
  "-one": "one lone alone none gone done anyone honest phone stone", "equi-": "require requires required equip equine", "-onium": "harmonium pandemonium",
  "uni-": "punish tunic junior", "intra-": "intractable", "pent-": "spent repent", "hex-": "hex", "sec-": "secret secure insect", "iso-": "poison prison bison",
  "dia-": "media dial diary radial", "chir-": "chirp", "axis": "taxis", "cis": "excise incise", "-hedral": "cathedral", "epi-": "epic", "jug-": "jug juggle",
  "phen-": "phenom", "acet-": "facet facets", "endo-": "endorse endow tendon", "anion": "companion", "metr-": "metro", "quart-": "quartz", "sept-": "septic septum",
  "therm-": "furthermore weatherman", "regio-": "egregious", "mono-": "kimono", "sub-": "subtle", "racem-": "raceman", "thio-": "ethiopia", "-yne": "wayne",
  "beta": "tibetan", "syn-": "syne", "prim-": "prim", "R / S": "red"
};

// ------------------------------------------------------------------ 1. the list
let R = null; try { R = WR.load() } catch (e) { fail("roots/roots.js cannot be read: " + e.message) }
const E = R && R.exam2, groups = E && Array.isArray(E.groups) ? E.groups : [];
if (R && (Object.keys(R).join() !== "exam2" || !E || E.name !== "Exam 2" || typeof E.sub !== "string" || !E.sub.trim() || !groups.length)) fail('roots/roots.js: window.ROOTS must be { exam2: { name: "Exam 2", sub, groups } } (one exam)');
let BP = []; try { const s = { ORGO: { reg: d => { BP = d.blueprint || [] } } }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, "data", "index.js"), "utf8"), s) } catch (e) { fail("data/index.js cannot be read (run node tools/build.js): " + e.message) }
const KIND = new Map(BP.filter(t => t.has !== false).map(t => [t.id, t]));
const strings = [];   // [where, text] of every string a student reads
const seen = new Map(), rows = [], lines = [];
if (E) strings.push(["the page's note (exam2.sub)", E.sub]);
if (E && typeof E.sub === "string" && (E.sub.match(/[.?](\s|$)/g) || []).length > 1) fail("the page's note (exam2.sub) is one sentence: the page's header already says what the page holds");
const words = s => s.split(/\s+/).filter(Boolean).length;   // a phone shows about eight words a line: a note or an exam line of 50 words is six lines
groups.forEach((g, gi) => {
  const at = `section ${gi + 1}`;
  if (!Array.isArray(g) || g.length !== 3 || typeof g[0] !== "string" || !g[0].trim() || !Array.isArray(g[1]) || !g[1].length) return fail(`${at}: a section is [name, rows, { "sub", "exam" }] with at least one row`);
  const [name, rs, meta] = g; strings.push([`${name}: its name`, name]);
  if (!meta || typeof meta !== "object" || typeof meta.sub !== "string" || !meta.sub.trim() || !Array.isArray(meta.exam) || Object.keys(meta).some(k => k !== "sub" && k !== "exam")) return fail(`${name}: the third element is { "sub": why these roots matter, "exam": [[kind id, how], ...] } and nothing else`);
  strings.push([`${name}: its note`, meta.sub]);
  if ((meta.sub.match(/[.?](\s|$)/g) || []).length > 2 || words(meta.sub) > 50) fail(`${name}: the note has more than two sentences or 50 words`);
  rs.forEach((r, ri) => {
    const w = `${name}, row ${ri + 1}`;
    if (!Array.isArray(r) || (r.length !== 4 && r.length !== 5) || r.slice(0, 3).some(x => typeof x !== "string" || !x.trim()) || !Array.isArray(r[3]) || !r[3].length) return fail(`${w}: a row is [root, meaning, origin, [[term, meaning], ...]] with at least one term, and may end with { "auto": false }`);
    const [root, mean, origin, terms, opt] = r;
    if (r.length === 5 && !(opt && opt.auto === false && Object.keys(opt).length === 1)) fail(`${w} (${root}): the fifth element can only be { "auto": false }`);
    const key = root.toLowerCase().replace(/-/g, "").replace(/\s+/g, " ").trim();
    if (seen.has(key)) fail(`${root} is listed twice (also in ${seen.get(key)}): every root appears once, and the marks are stored by its text`); else seen.set(key, name);
    strings.push([`${root}: the root`, root], [`${root}: its meaning`, mean], [`${root}: its origin`, origin]);
    terms.forEach((t, ti) => {
      if (!Array.isArray(t) || t.length !== 2 || t.some(x => typeof x !== "string" || !x.trim())) return fail(`${root}, example ${ti + 1}: an example is [term, what it means]`);
      strings.push([`${root}: "${t[0]}"`, t[0]], [`${root}: what "${t[0]}" means`, t[1]]);
      if (/[()]/.test(t[0])) fail(`${root}: "${t[0]}" has a bracket, and the lookup splits a term at "("`);
      if (/\.\s*$/.test(t[1])) fail(`${root}: what "${t[0]}" means ends with a full stop, and the card adds one`);
    });
    rows.push({ g: name, root, mean, origin, terms, auto: !(opt && opt.auto === false) });
  });
  const ids = new Set();
  meta.exam.forEach((x, xi) => {
    if (!Array.isArray(x) || x.length !== 2 || x.some(s => typeof s !== "string" || !s.trim())) return fail(`${name}, exam line ${xi + 1}: a line is [question kind id, how the roots help]`);
    const [id, how] = x; strings.push([`${name}, the ${id} line`, how]);
    if (!KIND.has(id)) fail(`${name}: "${id}" is not a question kind of the blueprint (data/index.js)`);
    if (ids.has(id)) fail(`${name}: "${id}" has two lines in this section`); ids.add(id);
    if ((how.match(/[.?](\s|$)/g) || []).length > 2 || how.length > 340 || words(how) > 50) fail(`${name}, the ${id} line: one point, at most two sentences, 50 words and 340 characters`);
    lines.push({ g: name, id, how });
  });
});
const ROOTS = rows.map(r => r.root), EXAMPLES = new Map();
for (const r of rows) for (const [t] of r.terms) { const k = t.toLowerCase(); if (!EXAMPLES.has(k)) EXAMPLES.set(k, { t, roots: [] }); EXAMPLES.get(k).roots.push(r.root) }
for (const { t } of EXAMPLES.values()) {
  if (!inCourse(t)) fail(`the example term "${t}" does not occur in the course text`);
  const k = t.toLowerCase(); if (!/\s/.test(k) && (ORDINARY.includes(k) || PLAIN.includes(k))) fail(`the example term "${t}" is an ordinary word: the dictionary would open a card with a root's meaning for it everywhere. Use the course's phrase`);
}
for (const [w, s] of strings) {
  if (/[Ͱ-Ͽἀ-῿]/.test(s)) fail(`${w}: a Greek letter (write it out, as "pi bond", "alpha carbon")`);
  if (/[‒–—―−]/.test(s) || /\s-\s|--/.test(s)) fail(`${w}: a dash (use a full stop, a comma or a colon; a hyphen only inside a word or a charge)`);
  if (/!/.test(s)) fail(`${w}: an exclamation mark`);
  if (/\b(to|and|then|you|can|we)\s+practice\b/i.test(s)) fail(`${w}: "practice" as a verb (the class writes "practise")`);
}

// ------------------------------------------------------------------ 2. the pages
const rev = new Map();   // question kind -> roots its lines name
for (const l of lines) { l.roots = WR.named(l.how, ROOTS); if (!l.roots.length) fail(`${l.g}, the ${l.id} line names no root the way roots.js's header says (so the page cannot link it)`); for (const r of l.roots) { if (!rev.has(l.id)) rev.set(l.id, new Set()); rev.get(l.id).add(r) } }
const PAGE = fs.readFileSync(path.join(ROOT, "roots", "index.html"), "utf8");
const pageNamed = (PAGE.match(/^\s*const named = (\(line, roots\) => \{.*\});$/m) || [])[1];
if (!pageNamed) fail("roots/index.html: its named() (the roots an exam line names) is not where this check looks for it");
else { const f = vm.runInNewContext("(" + pageNamed + ")"); for (const l of lines) if (f(l.how, ROOTS).join() !== l.roots.join()) fail(`roots/index.html and tools/wordroots.js find different roots in the ${l.id} line of ${l.g}`) }
const kindsLinked = new Set(lines.map(l => l.id)), missing = [...KIND.keys()].filter(id => !kindsLinked.has(id));
if (missing.length) note(`question kinds no section helps with: ${missing.join(", ")}`);
const unlinked = ROOTS.filter(r => ![...rev.values()].some(s => s.has(r)));
const shells = cp.spawnSync("node", [path.join(__dirname, "shells.js"), "--check"], { encoding: "utf8" });
if (shells.status !== 0) fail((shells.stderr || shells.stdout).trim());
const FRONT = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
for (const m of FRONT.matchAll(/(\d+) Greek and Latin roots|of (\d+) mastered/g)) if (+(m[1] || m[2]) !== rows.length) fail(`index.html says ${m[1] || m[2]} roots in "${m[0]}"; roots/roots.js has ${rows.length}`);

// ------------------------------------------------------------------ 3. the dictionary
const DICT = path.join(ROOT, "assets", "glossary.js"), dictSrc = fs.readFileSync(DICT, "utf8");
if (/window\.ROOTS\s*=/.test(dictSrc)) fail("assets/glossary.js sets window.ROOTS, so Eureka's lookup never loads roots/roots.js: run node tools/build.js");
const lexOf = () => { const w = {}; vm.runInNewContext(dictSrc, { window: w }); return w };
{ const L = lexOf().LEXICON || {};
  for (const g of GLOSSARY) { const want = g.parts && g.parts.length ? g.parts : WR.fill(g, R), have = (L[g.term] || [])[1];
    if (!L[g.term] || JSON.stringify(have) !== JSON.stringify(want)) { fail(`assets/glossary.js is out of date with content/glossary.json and roots/roots.js (first: "${g.term}"): run node tools/build.js`); break } }
  // a word part of the class dictionary that is a root of the list under another spelling has no origin on its card
  const spelled = new Map(ROOTS.map(r => [r.toLowerCase().replace(/[^a-z]/g, ""), r]));
  for (const g of GLOSSARY) for (const [p] of g.parts || []) { const k = p.toLowerCase().replace(/[^a-z]/g, ""), like = [...spelled].filter(([s]) => k.length > 2 && s.length > 2 && (s.startsWith(k) || k.startsWith(s)) && Math.abs(s.length - k.length) <= 2).map(x => x[1]);
    if (!ROOTS.includes(p) && like.length) note(`content/glossary.json, "${g.term}": the part "${p}" looks like ${like.join(" or ")} spelled another way, so its card shows no origin`) } }

// Eureka's lookup: norm, forms, build, autoRoots and find, as shared/lookup.js has them (with { "auto": false } and Greek letters
// spelled out). Only the plumbing differs: one lookup per window, and find() says which way it found its card.
function makeLookup(withRoots) {
  const window = lexOf(); if (withRoots) window.ROOTS = R || {};
  const GREEK = { "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "π": "pi", "σ": "sigma" };
  const norm = s => String(s).toLowerCase().replace(/[αβγδπσ]/g, c => GREEK[c]).replace(/[’']/g, "").replace(/[^a-z0-9+\- ]/g, " ").replace(/\s+/g, " ").trim();
  const lex = new Map(), roots = new Map(), stems = [], ex = new Map();
  for (const [k, v] of Object.entries(window.LEXICON || {})) {
    const e = { term: k, def: v[0], parts: v[1] || [], lit: v[2] || "" };
    lex.set(norm(k), e); (v[3] || "").split(",").map(norm).filter(Boolean).forEach(f => { if (!lex.has(f)) lex.set(f, e) });
  }
  for (const u of Object.values(window.ROOTS || {})) for (const g of u.groups || []) for (const [root, mean, origin, terms, opt] of g[1]) {
    const r = { root, mean, origin }; roots.set(root.toLowerCase(), r);
    const st = root.toLowerCase().replace(/^-|-$/g, ""); if (st.length >= 3 && !(opt && opt.auto === false)) stems.push({ st, r, suf: root.startsWith("-"), pre: root.endsWith("-") });
    for (const [t, m] of terms || []) {
      const mm = t.toLowerCase().match(/^([^(]+?)\s*(?:\(([^)]+)\))?$/) || [t];
      for (const n of [mm[1], mm[2]].filter(Boolean)) { const k = norm(n); if (!ex.has(k)) ex.set(k, { term: n.trim(), def: m, roots: [] }); ex.get(k).roots.push(r) }
    }
  }
  stems.sort((a, b) => b.st.length - a.st.length);
  const forms = WR.forms;
  function autoRoots(w) {
    const found = [], used = new Array(w.length).fill(false);
    for (const s of stems) {
      let i = s.suf ? w.lastIndexOf(s.st) : w.indexOf(s.st);
      if (i < 0) continue;
      if (s.suf && i + s.st.length < w.length - 2) continue;
      let clash = false; for (let k = i; k < i + s.st.length; k++) if (used[k]) clash = true;
      if (clash) continue;
      for (let k = i; k < i + s.st.length; k++) used[k] = true;
      found.push({ i, end: i + s.st.length, r: s.r });
    }
    const cover = used.filter(Boolean).length;
    return cover >= Math.min(5, w.length * .5) ? found.sort((a, b) => a.i - b.i).map(x => x.r) : [];
  }
  const partsFrom = list => list.map(([p, m]) => { const r = roots.get(p.toLowerCase()); return { root: p, mean: m, origin: r ? r.origin : "" } });
  const capital = s => s.charAt(0).toUpperCase() + s.slice(1);
  return function find(text) {
    const w = norm(text); if (!w || w.length < 2) return null;
    for (const f of forms(w)) { const e = lex.get(f); if (e) return { term: e.term, def: e.def, parts: partsFrom(e.parts), via: "dictionary" } }
    for (const f of forms(w)) { const e = ex.get(f); if (e) { const g = window.GLOSS && window.GLOSS.look(f); return { term: e.term, def: g || capital(e.def) + ".", parts: e.roots.map(r => ({ root: r.root, mean: r.mean, origin: r.origin })), via: "example term" } } }
    const g = window.GLOSS && w.length > 3 ? window.GLOSS.look(w) : null, ar = w.includes(" ") ? [] : autoRoots(w);
    if (g || ar.length) return { term: text.trim(), def: g || "", parts: ar.map(r => ({ root: r.root, mean: r.mean, origin: r.origin })), via: ar.length ? "guessed" : "dictionary" };
    return null;
  };
}
const withRoots = makeLookup(true), without = makeLookup(false);
// Every example term opens a card that shows its root. Where the class dictionary has the term, the card is that entry's,
// with the entry's parts: its own, or those tools/build.js fills in for the entry's word. A term that is another spelling
// of an entry ("quartet" of "splitting") opens the entry's card, which shows the roots of the entry's word: a note, not a fault.
const ownParts = new Set(GLOSSARY.filter(g => g.parts && g.parts.length).map(g => g.term));
for (const { t, roots } of EXAMPLES.values()) {
  const c = withRoots(t); if (!c) { fail(`the example term "${t}" opens no card`); continue }
  const lost = roots.filter(r => !c.parts.some(p => p.root === r)); if (!lost.length) continue;
  const other = c.via === "dictionary" && WR.norm(c.term) !== WR.norm(t) && !WR.forms(WR.norm(t)).includes(WR.norm(c.term));
  if (c.via === "dictionary" && (ownParts.has(c.term) || other)) note(`"${t}" opens the dictionary's "${c.term}", without ${lost.join(", ")}: ${ownParts.has(c.term) ? "that entry has word parts of its own" : `"${t}" is another spelling of it`}`);
  else fail(`the card for "${t}" (${c.via === "dictionary" ? `the dictionary's "${c.term}"` : c.via}) does not show ${lost.join(", ")}`);
}
// A card reads its parts as the word built left to right. The dictionary's entries get theirs in the word's order (fill()),
// but Eureka's lookup gives an example term's roots in the order of the rows in roots.js, so a term whose roots sit in
// different sections ("hydroxide": -ide in the first, hydro- and ox- in Acids and bases) shows them out of order until
// shared/lookup.js sorts them the same way. Listed, so the day it does, this note is empty.
{ const unsorted = [];
  for (const { t } of EXAMPLES.values()) {
    const c = withRoots(t); if (!c || c.via !== "example term" || c.parts.length < 2) continue;
    const w = WR.norm(c.term), pos = p => WR.place(p.root, w);
    const have = c.parts.map(p => p.root).join(" + "), want = c.parts.map((p, i) => [p, i]).sort((a, b) => (pos(a[0]) - pos(b[0])) || a[1] - b[1]).map(x => x[0].root).join(" + ");
    if (have !== want) unsorted.push(`${c.term} (${have})`);
  }
  if (unsorted.length) note(`${unsorted.length} cards of example terms list their roots out of the word's order, until Eureka's shared/lookup.js sorts them: ${unsorted.join(", ")}`) }
// the course's words, and the ordinary words: which cards the roots give, and none to an ordinary word
const byRoots = { example: [], guessed: [], changed: [] }, misfire = [];
const ordinary = new Set([...ORDINARY, ...PLAIN]);
for (const [w, n] of [...WORDS].sort((a, b) => b[1] - a[1])) {
  if (!/[a-z]/.test(w) && !GLOSSARY.some(g => [g.term, ...(g.also || [])].some(s => WR.norm(s) === WR.norm(w)))) continue;   // a Greek letter alone opens a card only where it is a course term (lookup.js)
  const a = without(w), b = withRoots(w); if (!b || !b.parts.length) continue;
  if (!a) (b.via === "guessed" ? byRoots.guessed : byRoots.example).push(`${w} (${b.parts.map(p => p.root).join(" + ")})`);
  else if (JSON.stringify(a.parts) !== JSON.stringify(b.parts)) byRoots.changed.push(w);
  if (ordinary.has(w) && b.via !== "dictionary") misfire.push(`"${w}" gets a card through the roots (${b.via}: ${b.parts.map(p => p.root).join(" + ")})`);
}
for (const [root, ws] of Object.entries(TRAPS)) {
  const r = rows.find(x => x.root === root); if (!r) continue;
  for (const w of ws.split(" ")) { const c = withRoots(w); if (c && c.parts.length && c.via !== "dictionary") misfire.push(`"${w}" gets a card through the roots (${c.via}: ${c.parts.map(p => p.root).join(" + ")})${r.auto ? `: ${root} needs { "auto": false }` : ""}`) }
}
misfire.forEach(m => fail("misfire: " + m));

// ------------------------------------------------------------------ report
const groupsN = groups.length, kindsN = kindsLinked.size;
say(`roots/roots.js: ${rows.length} roots in ${groupsN} sections, ${EXAMPLES.size} example terms, ${lines.length} exam lines for ${kindsN} of the ${KIND.size} question kinds; ${rows.filter(r => !r.auto).length} roots kept out of the dictionary's guesses`);
if (unlinked.length) say(`roots no exam line names (they explain words the lines use): ${unlinked.join(", ")}`);
say(`the dictionary, over the ${WORDS.size} words of the course text: the roots give a card to ${byRoots.example.length + byRoots.guessed.length} words that had none, and word parts to ${byRoots.changed.length} cards that had none or other ones`);
say(`  as example terms (${byRoots.example.length}):\n${wrap(byRoots.example)}`);
say(`  guessed inside the word (${byRoots.guessed.length})${listAll ? "" : ", the most frequent; --list prints them all"}:\n${wrap(listAll ? byRoots.guessed : byRoots.guessed.slice(0, 40))}`);
if (listAll) { say("the roots each question kind is linked to:"); for (const [id, s] of rev) say(`  ${id}: ${[...s].join(", ")}`) }
say(`ordinary words checked: ${ordinary.size} from the lists, ${Object.values(TRAPS).join(" ").split(" ").length} that a root switched off would be guessed in`);
if (notes.length && !quiet) console.log("Notes:\n  " + notes.join("\n  "));
if (fails.length) { console.error(`\n${fails.length} problem${fails.length > 1 ? "s" : ""}:\n  ` + fails.join("\n  ")); process.exit(1) }
say("ok");
