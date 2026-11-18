# CHEM 225 · Organic Chemistry I, Exam 2 study guide

A study guide for the second exam of NYU's Organic Chemistry I (CHEM-UA 225), Fall 2026: rings and chair
conformations, an introduction to NMR, acids and bases, organometallic reagents, SN2, SN1, E1 and E2. It is built from
the professor's lecture notes (10/20 to 11/12), the Fall 2024 Exam 2, and the substitution and elimination flow-chart
handout. It is also a class folder for [Eureka](https://github.com/Aksaddd/Eureka): it follows Eureka's class protocol
and drops into it with one command.

It is plain HTML, CSS and JavaScript: no server, no library, no network request. It works offline and straight from the
folder. Progress is kept in the student's own browser (local storage, keys starting with `orgo-`).

## Opening it

Open `index.html`, or serve the folder with any static server and visit http://localhost:8000/:

```bash
python3 -m http.server 8000
```

It can also be published as it is with GitHub Pages (Settings, Pages, deploy from this branch, root folder).

## What is inside

| Part | Folder | What it is |
|---|---|---|
| Readings | `read/` | The eight lectures rebuilt as eleven chapters: redrawn figures, a "closer look" and a "bigger picture" under most sections, a why-question to answer before moving on, and the professor's homework worked step by step. Each section links to the original page of the notes |
| Exam 2 Lab | `exam/` | The Fall 2024 exam worked part by part, and a trainer for each of 30 question types: what you need to know, the method, worked examples that ask before they tell, and a practice bank |
| Practice | `drill/` | Mixed practice across types, a review of what is due, or one type at a time |
| Mechanisms | `mechanisms/` | 45 mechanisms to watch, complete, or draw arrow by arrow, with feedback on the kind of mistake |
| Mock Exam | `mock/` | Three mock exams and the original, in the real format: nine questions, choose seven, 110 minutes, on paper, then marked against rubrics |
| Molecule Lab | `lab/` | Build and flip chairs, watch the ring flip in 3D, turn a Newman projection, compare energy diagrams, climb the pKa ladder, walk the SN1/SN2/E1/E2 flow chart |
| Foundations | `foundations/` | The thirteen ideas the unit is built on, with a 26-question check that says which to revisit |
| Review List | `review/` | Everything missed or flagged |
| Archive | `archive/` | The original files (`archive/files/`) and a picture of every page |
| Syllabus | `syllabus/` | What the unit covers and the format of the past exam |

560 questions in all: 107 worked examples, 408 practice questions and the 45 parts of the original exam.

## Why it works the way it does

`docs/learning-science.md` gives the research and says, technique by technique, what the guide does about it. In short:
answer before you reread; come back on later days (the review schedule shrinks its gaps to fit the exam date); mix the
question types, because choosing the approach is the skill the exam tests; study worked examples that fade into your own
work; write mechanisms and chairs by hand and take a timed mock, because that is the form of the exam. The number the
dashboard puts first is accuracy after a day or more, not today's score.

`docs/prerequisites.md` sets out what a student needs before this unit. `docs/backporting.md` lists what this class adds
beyond Eureka's shared engine and how to bring each piece to the other classes.

## How the content is built

Everything a student reads is JSON under `content/` (see `docs/dev/CONTENT-SPEC.md`). Nobody edits `data/` by hand. `content/glossary.json` is the class dictionary;
the build writes it to `assets/glossary.js` in the shapes Eureka's double-tap lookup and Word Bank read.

```bash
node tools/build.js
```

checks every file, draws every structure with RDKit (`tools/chem.py`; needs `pip install rdkit`), proves every
mechanism by moving its electrons and comparing the result with the next step, and writes `data/`.

| Command | What it does |
|---|---|
| `node tools/build.js --check [files]` | The same checks without writing |
| `node tools/test/run.js` | Unit tests: chair logic (symmetry, energies, E2 geometry), arrow rules, scoring |
| `node tools/test/smoke.js` | Opens every page in a real browser and mounts every question, reading and mechanism (needs Playwright) |
| `node tools/mocks.js` | Reassembles the mock exams from the practice bank |
| `node tools/audit.js` | Exports the questions without their keys for an independent solver, then lists the disagreements |
| `node tools/shells.js` | Rewrites the thin `index.html` of every part from one template |

The design is in `docs/dev/ARCHITECTURE.md`; `docs/dev/LECTURES.md` is a page-by-page digest of the handwritten notes and
`docs/dev/EXAM-KEY.md` the worked key of the past exam.

## In Eureka

The guide is in Eureka as the folder `chem225/`, brought in with `git subtree`. It opens from Eureka's library with the
class code `CHEM225` (change it before sharing: see `class.js`). Inside Eureka, the class bar, appearance settings,
account sync, companions and XP replace this folder's own top bar; double-tapping a term opens the class dictionary
(`content/glossary.json`), which also feeds the Word Bank; and each finished reading chapter earns a badge.

To bring a change made here into Eureka, run from Eureka's root (`BRANCH` is the branch that holds the guide):

```bash
git subtree pull --prefix=chem225 https://github.com/Aksaddd/nyu_orgo_chem_1 BRANCH --squash
```

```bash
node tools/build-classes.js
```

Eureka keeps four things on its side for this class, all described in its `docs/adding-a-class.md`: the storage prefix
`orgo-` in `shared/account.js` (sync) and `shared/prefs.js` (download and reset), the class-bar drawings for the kinds
`exam`, `mechanisms`, `lab` and `foundations` in `shared/icons.js`, and the eleven reading badges in
`shared/wardrobe.js`. Eureka's Study Plan card is not used, because the dashboard here has its own plan.

## A note on the material

The lecture notes and the past exam are the professor's. Lecture values are used throughout even where the usual tables
differ (for example the pKa of hydrogen sulfide), and the guide says so where they do. The past exam shows what kinds of
question to expect; it does not say what will be on this year's exam.
