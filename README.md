# CHEM 225 · Organic Chemistry I, Exam 2 study guide

A static study guide for the second exam of NYU's Organic Chemistry I, Fall 2026. It covers rings and chairs, NMR, acids
and bases, organometallic reagents, SN2, SN1, E1 and E2. It is built from the professor's lecture notes, the Fall 2024
Exam 2 and the substitution and elimination flow-chart handout.

It is plain HTML, CSS and JavaScript. There is no server code, no library and no network request, so it works offline.
Your progress is kept in your own browser (local storage, keys starting with `orgo-`).

## Opening it

Open `index.html` straight from the folder, or serve the folder with any static server:

```
python3 -m http.server 8000
```

then visit http://localhost:8000/.

## The parts

- Readings (`read/`): the lectures rebuilt as chapters with checks.
- Exam 2 Lab (`exam/`): the past exam worked step by step, and a trainer for every question type.
- Practice (`drill/`): mixed, spaced practice across all types.
- Mechanisms (`mechanisms/`): watch, complete or draw the curved arrows.
- Mock Exam (`mock/`): the format of the real exam, timed.
- Molecule Lab (`lab/`): chairs, Newman projections, 3D models, energy diagrams, the pKa ladder.
- Foundations (`foundations/`): the ideas everything rests on, with a short check.
- Review List (`review/`): everything missed or flagged.
- Archive (`archive/`): the original files. The PDFs now live in `archive/files/`.
- Syllabus (`syllabus/`): what the unit covers and how the exam is set.

## How the content is built

People write JSON in `content/` (see `docs/dev/CONTENT-SPEC.md`). `node tools/build.js` turns it into the files in
`data/`, drawing the structures with RDKit through `tools/chem.py`. It needs Node 22 and `pip install rdkit`. Never edit
`data/` by hand. The design is described in `docs/dev/ARCHITECTURE.md`, and tests run with `node tools/test/run.js`.

## Bringing it into Eureka

```
git subtree add --prefix=chem225 <this repo> <branch>
node tools/build-classes.js
```

Run the second command in Eureka's root. The class code in `course.js` and `class.js` is CHEM225. Change it before you
share the class. Eureka's account sync lists key prefixes by hand, so add `orgo-` there. Inside Eureka the class bar,
companions and settings replace our own top bar.

## Using it well

Recall before rereading, come back on later days, mix the question types, write mechanisms and chairs by hand, and take
a timed mock exam. The dashboard plans each day around the exam date you set.
