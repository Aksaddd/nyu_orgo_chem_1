#!/usr/bin/env node
// Writes the thin index.html of every part of the class, all from one template, so they never drift apart.
//   node tools/shells.js
// Each page's own code is the page.js beside its index.html.
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "..");
const PAGES = [
  ["", "CHEM 225 · Organic Chemistry I", "Exam 2 study guide: readings, the past exam worked, a trainer for every question type, mechanisms and mock exams."],
  ["read", "CHEM 225 · Readings", "The lectures rebuilt as readings with drawings, closer looks and questions."],
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
for (const [dir, title, desc] of PAGES) {
  const up = dir ? "../" : "", eu = dir ? "../../" : "../";
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#f5f5f7">
${CSS.map(c => `<link rel="stylesheet" href="${up}assets/${c}.css">`).join("\n")}
<script src="${eu}shared/platform.js"></script><!-- Eureka, when this folder sits inside it. On its own the file is simply absent. -->
<script src="${up}course.js"></script>
<script src="${up}assets/core.js"></script>
<script src="${up}data/index.js"></script>
${JS.map(j => `<script src="${up}assets/${j}.js"></script>`).join("\n")}
</head><body data-page="${dir || "home"}">
<main id="app" class="wrap" aria-live="off"></main>
<noscript><p style="padding:24px">This study guide needs JavaScript.</p></noscript>
<script src="page.js"></script>
</body></html>
`;
  fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
  fs.writeFileSync(path.join(ROOT, dir, "index.html"), html);
}
console.log("wrote", PAGES.length, "pages");
