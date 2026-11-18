#!/usr/bin/env node
// Writes the thin index.html of the class's own pages, all from one template, so they never drift apart.
//   node tools/shells.js
// Each page's own code is the page.js it names.
// Three pages are not written here, because inside Eureka they are the platform's own pages, kept by hand:
//   index.html         the class's front page (a copy of ECON 101's)
//   read/index.html    the reader (a copy of ECON 101's reader page; see docs/dev/ARCHITECTURE.md)
//   roots/index.html   Word Roots (a copy of Eureka's shared Word Roots page, as Bi 239 and ANTH 104 have it)
// Outside Eureka those three cannot work (they are made of Eureka's shared files), so each sends the browser to the class's
// own page for the same job, which is written here: alone/index.html (the dashboard, page.js), alone/read/index.html
// (the class's own reader, read/page.js) and alone/roots/index.html (Word Roots: roots/index.html's own style, body and
// code in the class's look; see the end of this file). Inside Eureka nothing links to alone/, and a visit there is sent back.
//   node tools/shells.js --check     says whether alone/roots/index.html is the one this file would write, and writes nothing
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "..");
// [folder, title, description, the page's code (from the folder), the page it stands in for inside Eureka (from the folder), the name of the part]
const PAGES = [
  ["alone", "CHEM 225 · Organic Chemistry I", "Exam 2 study guide: readings, the past exam worked, a trainer for every question type, mechanisms and mock exams.", "../page.js", "../index.html", "home"],
  ["alone/read", "CHEM 225 · Readings", "The lectures rebuilt as readings with drawings, closer looks and questions.", "../../read/page.js", "../../read/index.html", "read"],
  ["exam", "CHEM 225 · Exam 2 Lab", "The past exam worked step by step, and a trainer for every question type."],
  ["drill", "CHEM 225 · Practice", "Mixed, spaced practice across every question type."],
  ["mechanisms", "CHEM 225 · Mechanisms", "Draw the curved arrows yourself, one step at a time."],
  ["mock", "CHEM 225 · Mock Exam", "Timed mock exams in the format of the real one."],
  ["lab", "CHEM 225 · Molecule Lab", "Chairs, Newman projections, 3D models, energy diagrams and the pKa ladder."],
  ["foundations", "CHEM 225 · Foundations", "What you need to know before this unit, and a check of whether you do."],
  ["review", "CHEM 225 · Review List", "Everything you missed or flagged."],
  ["archive", "CHEM 225 · Archive", "The original course files."],
  ["syllabus", "CHEM 225 · Syllabus", "What the unit covers and how the exam is set."],
];
const CSS = ["orgo", "mol", "chair", "quiz", "pages", "study", "lab"], JS = ["mol", "chair", "energy", "newman", "view3d", "quiz", "mech"];
const check = process.argv.includes("--check");
if (!check) for (const [dir, title, desc, code = "page.js", inEureka, part = dir] of PAGES) {
  const up = "../".repeat(dir.split("/").length), eu = up + "../";
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#f5f5f7">
${CSS.map(c => `<link rel="stylesheet" href="${up}assets/${c}.css">`).join("\n")}
${inEureka ? `<script src="${eu}shared/platform.js"></script><!-- Eureka itself. On its own the file is simply absent. -->
<script>if(window.Platform)location.replace("${inEureka}"+location.search+location.hash)</script><!-- inside Eureka this part of the class is Eureka's own page -->`
    : `<link rel="stylesheet" href="${eu}shared/maison.css"><!-- Eureka's look, when this folder sits inside it: linked here, not added later, so its class bar is never drawn unstyled. On its own the file is simply absent. -->
<script src="${eu}shared/platform.js"></script><!-- Eureka itself. On its own the file is simply absent. -->`}
<script src="${up}course.js"></script>
<script src="${up}assets/core.js"></script>
<script src="${up}data/index.js"></script>
${JS.map(j => `<script src="${up}assets/${j}.js"></script>`).join("\n")}
</head><body data-page="${part}">
<main id="app" class="wrap" aria-live="off"></main>
<noscript><p style="padding:24px">This study guide needs JavaScript.</p></noscript>
<script src="${code}"></script>
</body></html>
`;
  fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
  fs.writeFileSync(path.join(ROOT, dir, "index.html"), html);
}

// Word Roots on its own: roots/index.html needs nothing of Eureka's but its stylesheet (shared/drill.css), so its own style,
// body and code are copied whole under the class's head. The names drill.css gives its colours, type and parts are filled in
// from the class's own (assets/orgo.css), the class's top bar replaces the "All drills" link, and the two script paths move
// one folder down. The page's links start from the class's folder (COURSE.base), so they need no change.
function aloneRoots() {
  const src = fs.readFileSync(path.join(ROOT, "roots", "index.html"), "utf8");
  const style = (src.match(/<style>[\s\S]*?<\/style>/) || [])[0], body = (src.match(/<body>([\s\S]*)<\/body>/) || [])[1];
  if (!style || !body) throw new Error("roots/index.html has no <style> or no <body> to copy");
  const moved = body.replace(/<script src="roots\.js">/, '<script src="../../roots/roots.js">').replace(/<script src="\.\.\/data\/index\.js">/, '<script src="../../data/index.js">');
  if (moved === body || /src="(?!\.\.\/\.\.\/)[^"]*"/.test(moved)) throw new Error("roots/index.html loads a script this file does not know how to move: update aloneRoots() in tools/shells.js");
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>CHEM 225 · Word Roots</title>
<meta name="description" content="The Greek and Latin word parts behind CHEM 225 terms, sorted by what they describe in chemistry, with the kinds of Exam 2 question each set of roots helps with and a quick quiz.">
<meta name="theme-color" content="#f5f5f7">
<!-- Written by tools/shells.js from roots/index.html. Do not edit by hand: edit roots/index.html and run node tools/shells.js -->
<link rel="stylesheet" href="../../assets/orgo.css">
<script src="../../../shared/platform.js"></script><!-- Eureka itself. On its own the file is simply absent. -->
<script>if(window.Platform)location.replace("../../roots/index.html"+location.search+location.hash)</script><!-- inside Eureka this part of the class is Eureka's own page -->
<script src="../../course.js"></script>
<script src="../../assets/core.js"></script>
<style>
/* the names Eureka's shared stylesheet gives its colours, type and parts, from the class's own (assets/orgo.css sets the dark ones) */
:root{--paper:var(--surface);--sunk:var(--surface-2);--fill:var(--surface-2);--accent-soft:#e8f1fc;--display:var(--font);--body:var(--font);--read:var(--font);--mono:var(--font);--rs:1}
:root,html[data-theme="dark"]{--good-soft:var(--good-bg);--bad-soft:var(--bad-bg);--gold:var(--warn);--gold-soft:var(--warn-bg)}
.wrap{max-width:720px;display:flex;flex-direction:column;gap:14px}
a.back{display:none}
h1{font:800 clamp(26px,6vw,34px)/1.08 var(--display);letter-spacing:-.02em;margin:0}
.sub{font-size:calc(15px * var(--rs));line-height:1.47;color:var(--muted);margin:0}
.foot{font-size:12.5px;color:var(--muted);margin:4px 0 0}
.card{display:flex;flex-direction:column;gap:16px}
.opts{margin:0;gap:8px}
.bub{flex:none;width:26px;height:26px;border-radius:50%;border:1.5px solid var(--line);display:grid;place-items:center;font:600 12px var(--font);color:var(--muted)}
.opt.right .bub{background:var(--good);border-color:var(--good);color:var(--surface)}
.opt.wrong .bub{background:var(--bad);border-color:var(--bad);color:var(--surface)}
</style>
${style}
</head><body data-page="roots">${moved}</body></html>
`;
}
const ROOTS_PAGE = path.join(ROOT, "alone", "roots", "index.html"), rootsHtml = aloneRoots();
if (check) {
  const now = fs.existsSync(ROOTS_PAGE) ? fs.readFileSync(ROOTS_PAGE, "utf8") : "";
  if (now !== rootsHtml) { console.error("alone/roots/index.html is not the page roots/index.html makes: run node tools/shells.js"); process.exit(1) }
  console.log("ok: alone/roots/index.html is up to date");
} else {
  fs.mkdirSync(path.dirname(ROOTS_PAGE), { recursive: true }); fs.writeFileSync(ROOTS_PAGE, rootsHtml);
  console.log("wrote", PAGES.length + 1, "pages");
}
