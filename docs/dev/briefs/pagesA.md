# Brief: the look, the dashboard, and the quiet pages

OWN: assets/orgo.css, assets/pages.css, page.js (the dashboard, at the repository root), archive/page.js,
syllabus/page.js, foundations/page.js, review/page.js, README.md
READ: docs/dev/ARCHITECTURE.md (all of it: you implement "The UI kit" table and tokens exactly); assets/core.js;
archive/files.js; content/blueprint.json (first 40 lines); /home/user/eureka/shared/maison.css (lines 1 to 120 only,
for the look to match); /home/user/eureka/econ101/index.html (lines 1 to 60 only).

## assets/orgo.css
The whole standalone look, in Eureka's style: system font stack, white and very light gray surfaces, one blue accent
for anything pressable (#0071e3 on light, #0a84ff on dark), rounded cards, pill buttons, generous spacing, no
decoration. Tokens for light (default), `html[data-theme="dark"]` and `html[data-night]` (dark with a deep blue-black
page). Every class in the UI-kit table. Focus rings on everything focusable; targets at least 44px tall on touch;
`prefers-reduced-motion` respected; readable at 200% zoom; `@media print` hides bars and buttons and prints black on
white. Chemistry tokens: `--arrow` (a blue that reads on both themes), `--ax` and `--eq` (two hues that stay apart
for colour-blind readers, for example a blue and an orange). `.prose` uses a serif stack at 19px, line height 1.6,
at most about 66 characters a line. Keep it under 500 lines.

## page.js (dashboard), in this order
1. Header: "CHEM 225 · Organic Chemistry I", New York University, "Exam 2 study guide", and `<p data-credit="orgo">`.
2. Exam date: a date field bound to `ORGO.learn.examDate()` / `setExamDate(iso)`, and "N days left" (or a prompt to set it).
3. "Today's session" from `ORGO.learn.plan()`: the phase in words (build, strengthen, rehearse, exam day), the steps
   as a numbered list with title, detail, a link button, and a tick when done.
4. Three numbers from `ORGO.learn.stats()`: questions answered, due now, and "right after a day or more" (delayed
   accuracy as a percent, or "not yet" before any spaced answers), with one sentence: this last number, not today's
   score, is the one that predicts the exam.
5. "The exam, by question type": the blueprint in two groups ("On the past exam", "From the lectures"). Each card
   (`.card.tap`, links to `exam/index.html#<id>`): exam reference, short title, points, mastery dots
   (`ORGO.ui.levelDots(ORGO.learn.mastery(id).level)`), and counts from `count`.
6. The parts of the class as cards with one line each: Readings, Exam 2 Lab, Practice, Mechanisms, Mock Exam,
   Molecule Lab, Foundations, Review List, Archive, Syllabus.
7. "How to use this guide": five short lines: recall before rereading; come back on later days; mix the question
   types; write mechanisms and chairs by hand; take a timed mock exam. One sentence each on why.
8. "Where this comes from": the professor's Fall 2026 lecture notes, the Fall 2024 Exam 2, and the flow-chart handout,
   with a link to the Archive.
Re-render on `ORGO.on("progress", …)`.

## archive/page.js
Load `archive/files.js` with a script tag, then for each group of `window.ARCHIVE.groups`: its name and note, and a row
per file: title, pages, "Open the PDF" (link to the file, relative to the archive folder, URL-encoded), "Look at the
pages" (a sheet that pages through `archive/pages/<key>-<n>.png`; the exam's pictures exist only for pages 2 to 17
and are zero padded: `EX-02.png`), and, when `read` is set, "Open the reading" (`read/index.html#<read>`).

## syllabus/page.js
No syllabus file was provided, so say that in one sentence, then give what is known: the unit, lecture by lecture
(10/20 Rings and ring strain; 10/22 Introduction to NMR; 10/27 Chairs, axial and equatorial, substituents; 10/29
Acids, bases, pKa, organometallic reagents; 11/03 Organometallics, the SN2 reaction; 11/05 SN2: substrate, leaving
group, nucleophile, solvent; 11/10 SN1 and E1; 11/12 E2), each linking to its reading (ids rings-1, nmr, rings-2,
acids, sn2-1, sn2-2, sn1-e1, e2); the textbook the notes cite (Jones and Fleming, Organic Chemistry, chapters 5 to 8);
and the format of the Fall 2024 exam (nine questions of 100 points, choose seven, 110 minutes, pen only, no notes,
the model set allowed), with the caution that this year's rules are the professor's to set.

## foundations/page.js
`ORGO.need("foundations")` then `ORGO.data.foundations` = `{intro, axioms: [{id, title, statement, why, explains: [text],
refresher: html, check: [item ids]}], diagnostic: [item ids]}`. Show the intro; "Check yourself" (a session over
`diagnostic` with `ORGO.quiz.session`; afterwards, per axiom, how many of its `check` items were right, and "read this
first" for the weak ones); then each axiom as a card: statement, why, what it explains, the refresher in a
`details.more`. If the data file is missing show an empty state, not an error.

## review/page.js
From `ORGO.learn.missed()` and `ORGO.learn.flagged()`: counts, the items grouped by question type (type title, each
item's first words via `ORGO.text`, last result), "Practise these now" (`ORGO.quiz.session`), and per type a link to
its trainer. Item text needs `ORGO.need("t/" + type)`. Empty state when there is nothing.

## assets/pages.css
Styles for these pages only (tokens and UI-kit classes).

## README.md
What this is; how to open it (any static server, for example `python3 -m http.server 8000`, or straight from the file);
the parts; how content is built (`node tools/build.js`, which needs `pip install rdkit`; see docs/dev/); how to bring
it into Eureka (`git subtree add --prefix=chem225 <this repo> <branch>`, then `node tools/build-classes.js`; the class
code is CHEM225 and should be changed before sharing; Eureka's account sync lists key prefixes by hand, so add
`orgo-` there); that the original PDFs now live in `archive/files/`. Keep it under 80 lines. Eureka's README style:
plain sentences, no marketing.

CHECK: one Playwright script, failing on any console error or pageerror (ignore the one failed request for
../shared/platform.js, which exists only inside Eureka): open index.html, archive/, syllabus/, foundations/, review/
by file:// URL. Save TWO screenshots of the dashboard (1280 wide and 390 wide), look at each once, fix what is wrong.
