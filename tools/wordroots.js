// The Word Roots list (roots/roots.js) as the tools read it. Used by tools/build.js (the class dictionary's word parts)
// and tools/check-roots.js. The page (roots/index.html) has its own copy of named(); check-roots.js checks the two agree.
const fs = require("fs"), path = require("path"), vm = require("vm");
const FILE = path.join(__dirname, "..", "roots", "roots.js");

// window.ROOTS from the file, or null when there is none
function load(file = FILE) {
  if (!fs.existsSync(file)) return null;
  const w = {}; vm.runInNewContext(fs.readFileSync(file, "utf8"), { window: w }, { filename: file }); return w.ROOTS || null;
}
const rows = R => Object.values(R || {}).flatMap(u => (u.groups || []).flatMap(g => g[1] || []));

// Eureka's lookup (shared/lookup.js): the word a spelling stands for, and its singulars
const GREEK = { "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "π": "pi", "σ": "sigma" };
const norm = s => String(s).toLowerCase().replace(/[αβγδπσ]/g, c => GREEK[c]).replace(/[’']/g, "").replace(/[^a-z0-9+\- ]/g, " ").replace(/\s+/g, " ").trim();
const forms = w => { const f = [w]; if (/ia$/.test(w)) f.push(w.replace(/ia$/, "ium")); if (/ae$/.test(w)) f.push(w.slice(0, -1)); if (/i$/.test(w)) f.push(w.replace(/i$/, "us")); if (/ata$/.test(w)) f.push(w.slice(0, -2)); if (/ies$/.test(w)) f.push(w.replace(/ies$/, "y")); if (/(s|x|ch|sh)es$/.test(w)) f.push(w.slice(0, -2)); if (/s$/.test(w) && !/ss$/.test(w)) f.push(w.slice(0, -1)); if (/ed$/.test(w)) f.push(w.slice(0, -1), w.slice(0, -2)); return f };
const same = (a, b) => a === b || forms(a).includes(b) || forms(b).includes(a);

// Where a root shows in a word: its letters, then without a last vowel (chromo- in chromatid), then without its last
// letter (syn- in symmetry). -1 when it does not show. "R / S", "E / Z" and "p" are too short to show anywhere.
const keys = root => root.split(/[/ ]/).map(s => s.replace(/[^a-zA-Z]/g, "").toLowerCase()).filter(s => s.length > 1).sort((a, b) => b.length - a.length);
function at(root, word) {
  for (const k of keys(root)) for (const t of [k, k.replace(/[aeiouy]$/, ""), k.slice(0, -1)]) { const i = t.length > 1 ? word.indexOf(t) : -1; if (i >= 0) return i }
  return -1;
}
// Where a root sits in a word, to put a card's parts in the word's order: at(), then its letters shorter and shorter down to
// three (-angium in angiosperm), and a one-letter prefix at the start of a word (a- in achiral). Infinity when it does not
// show: it goes last. Only for the order: whether a root belongs to a word is at()'s question.
function place(root, word) {
  const i = at(root, word); if (i >= 0) return i;
  for (const k of keys(root)) for (let n = k.length - 2; n >= 3; n--) { const j = word.indexOf(k.slice(0, n)); if (j >= 0) return j }
  const one = root.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (one.length === 1 && /-$/.test(root.trim())) { const j = (" " + word).search(new RegExp("[ -]" + one)); if (j >= 0) return j }
  return Infinity;
}

// The word parts of a dictionary entry that has none of its own: the roots whose example terms are the entry's term
// (or its plural); and, when the root shows in the term itself, the roots whose example terms are one of its other
// spellings ("eclipsed conformation" gives eclips- to "eclipsed"; "doublet" would give nothing to "splitting") or a
// phrase built on the term ("primary carbon" gives prim- to "primary", "carbocation intermediate" gives inter- to
// "intermediate", but "conjugate base" gives nothing to "base"). In the order they sit in the word, as [root exactly as
// roots.js writes it, meaning].
function fill(entry, R) {
  const term = norm(entry.term), also = (entry.also || []).map(norm), out = [], T = term.split(" ");
  const builtOn = e => { const W = e.split(" "); return W.length > T.length && W.some((_, i) => T.every((w, j) => W[i + j] === w)) };
  for (const [root, mean, , terms] of rows(R)) {
    if (out.some(p => p[0] === root)) continue;
    const ex = (terms || []).map(t => norm(t[0]));
    if (ex.some(e => same(e, term)) || ((ex.some(e => also.some(a => same(e, a))) || ex.some(builtOn)) && at(root, term) >= 0)) out.push([root, mean]);
  }
  return out.map((p, i) => [p, i]).sort((a, b) => (place(a[0][0], term) - place(b[0][0], term)) || a[1] - b[1]).map(x => x[0]);
}

// The roots an exam line names (the rule at the top of roots/roots.js): a hyphenated root as written, a bare-word root
// next to a bracket or a "+", R / S and E / Z by their Latin and German words, p as "p means". Case does not matter.
const escR = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function named(line, roots) {
  return roots.filter(r => r === "R / S" ? /\b(rectus|sinister)\b/i.test(line) : r === "E / Z" ? /\b(entgegen|zusammen)\b/i.test(line) : r === "p" ? /\bp means\b/i.test(line)
    : /-/.test(r) ? new RegExp("(^|[^A-Za-z])" + escR(r) + "(?![A-Za-z])", "i").test(line)
    : new RegExp("\\(\\s*" + escR(r) + "\\b|\\b" + escR(r) + "\\s*\\(|\\+\\s*" + escR(r) + "\\b|\\b" + escR(r) + "\\s*\\+", "i").test(line));
}

module.exports = { FILE, load, rows, norm, forms, at, place, fill, named };
