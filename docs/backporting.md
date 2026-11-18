# What CHEM 225 adds to Eureka, and how to bring it to the other classes

This class runs its own engine (`assets/*.js`, global `ORGO`) beside Eureka's shared one. This note lists each thing it does that the shared engine does not, where it lives here, which shared file it would extend, what data would have to change, and a rough size. Small is a day or less, medium is a few days, large is a week or more including content.

Two cautions. This note was written from this class's `docs/dev/ARCHITECTURE.md` and `docs/dev/CONTENT-SPEC.md`. The shared files named below (`shared/drill.js`, `shared/plan.js`) were not read line by line, so each "would extend" is a proposal to check against the code. And the research behind these features is summarized in `docs/learning-science.md`, which says plainly that most of its citations are unverified. Check the source behind a feature before spending a week on it.

## 1. A review schedule sized to the exam date, with mastery measured after a delay

- **What it is.** One record per question (attempts, streak, box, due date, last twelve results with confidence and time). A missed question returns in the same session after up to three others, at most twice, and only while another question is left to stand between the tries; once right it stops coming back, and one still missed is due again at once. After a correct answer the gap grows through 1, 2, 4, 7 and 14 days, but is cut so that at least two more reviews fit before the exam date; a right answer within 12 hours of a miss of the same question keeps its box instead. Mastery per question type has five levels, and the top one ("retained") needs a correct answer a day or more after the last one: on a later calendar day, and at least six hours later. The number shown first is delayed accuracy. An answer finished with help counts as a miss and earns no XP.
- **Files here.** `assets/core.js` (`ORGO.learn`: `record`, `due`, `pick`, `mastery`, `examDate`, `plan`). Storage keys `orgo-items-v1` and `orgo-prefs-v1`.
- **Would extend.** `shared/plan.js` (an exam date per class, and today's session built from what is due) and `shared/drill.js` (the in-session return of misses, and reporting each result).
- **Data change.** None to question content. Each class needs an exam date, and each question needs a stable id and a type or topic tag, so that mastery can be shown per type. A new per-class storage key for the records.
- **Size.** Medium. The logic is about 150 lines. Most of the work is deciding how it sits beside the existing progress and XP records.

## 2. Question kinds beyond single-answer multiple choice

- **What it is.** Eight kinds behind one call (`ORGO.quiz.mount`): circle one, circle all that apply, a number with an accepted range, ranking, sorting into bins, written answers marked against a rubric, drawn mechanisms, and chair questions. Every wrong choice carries its own reason. Every question has a worked solution in steps and a one-line rule.
- **Files here.** `assets/quiz.js`, `assets/quiz.css`; the schema is in `docs/dev/CONTENT-SPEC.md` under "Questions".
- **Would extend.** `shared/drill.js`.
- **Data change.** A `kind` field on each question, with the fields that kind needs (`choices` with `ok` and `why`; `answer`, `lo`, `hi`; `items` in the correct order; `bins`; `model` and `rubric`). Existing multiple-choice banks stay valid as `kind: "mcq"`, but gain the most if a `why` is written for every wrong choice.
- **Size.** Circle all, numeric, ranking and sorting: small each, medium together. They are general and need nothing from chemistry. Written answers with a rubric: small in code, large in content, because every question needs a model answer and rubric lines. Scoring is between 0 and 1, so anything that assumes right or wrong needs a look. Drawn mechanisms and chairs: see section 6, and they only make sense in chemistry.

## 3. Worked examples with a question before each step

- **What it is.** A worked example is an ordinary question with `"role": "worked"`. Its solution steps are revealed one at a time, and two to four steps carry an `ask`: a short question to answer before reading on, with its answer.
- **Files here.** `ORGO.quiz.worked` in `assets/quiz.js`; items with `"role": "worked"` in `content/items/*.json`.
- **Would extend.** `shared/drill.js`, or a class's read page where worked examples already appear inline.
- **Data change.** Solutions written as `steps: [{t, h, ask: {q, a}}]` in place of one block of text.
- **Size.** Small in code. Medium in content per class: rewriting solutions as steps is the real work.

## 4. A page per exam question type

- **What it is.** The past exam was broken into question types (30 here). Each has a page with four parts: what to know, the method, worked examples, practice. The practice bank, the mastery display and the mock exams are all organized by the same type ids.
- **Files here.** `content/blueprint.json` (the list of types), `content/types/<id>.json`, the `exam/` page.
- **Would extend.** Nothing shared today. It would be a new shared page template that a class opts into, fed by a class's own type files.
- **Data change.** A blueprint per class, made from at least one real past exam, and every question tagged with a type id. This is the expensive part, and it cannot be done for a class with no past exam.
- **Size.** Medium for the template. Large per class for the content.

## 5. Pen-and-paper mock exams marked against rubrics

- **What it is.** A mock exam in the real exam's format: the same number of questions, the same choice rule, a time limit. The student writes on paper, then sees each model answer beside its rubric and ticks each line full, half or none. The score is points earned over points possible, and each part reports to the schedule in section 1.
- **Files here.** `mock/`, `content/mock/<id>.json`, `content/exam.json` for the original exam; history in `orgo-mock-v1`.
- **Would extend.** Nothing shared today: a new shared page. It depends on written questions from section 2.
- **Data change.** Mock files that list questions, parts, points and question ids. Points per question must add up, and the build checks that.
- **Size.** Medium for the page, after section 2 exists. Large per class for writing mocks that are honest copies of the exam's format.

## 6. Mechanisms and chairs

- **What it is.** A mechanism trainer with four modes (watch, complete the missing arrows, draw every arrow, draw on paper then check), where each step is checked before the next shows and a hint comes only after an attempt. A cyclohexane model that works out axial and equatorial positions, the more stable chair and the relationship between two chairs from one line of text such as `1u:CH3,2u:CH3`.
- **Files here.** `assets/mech.js`, `assets/mol.js`, `assets/chair.js`, `content/mechanisms/*.json`, `tools/chem.py` (RDKit checks at build time).
- **Would extend.** Nothing. These stay in this class, or move to a shared chemistry folder if a second chemistry class is added.
- **Size.** Not a backport. Listed so that nobody plans one.

## 7. Readings with branches and a why question

- **What it is.** Each section of a reading has a main text, an optional "closer look" (the finer detail that explains how), an optional "bigger picture" (the link to the rest of chemistry, to the exam, and to medicine or biology), and one why question the reader answers in their head before moving on. Sections can list check questions from the bank.
- **Files here.** `read/`, `content/read/<id>.json` (schema under "Readings" in `docs/dev/CONTENT-SPEC.md`); sections read are kept in `orgo-read-v1`.
- **Would extend.** A class's read page, and possibly `shared/readlevels.js` if the branches are to follow the reading level a student has chosen.
- **Data change.** Readings split into sections with ids, with `micro`, `macro` and `why` added per section.
- **Size.** Small in code for a class whose readings are already in sections. Medium to large in content.

## 8. Content written as JSON that a build checks

- **What it is.** All content is JSON in `content/`. `node tools/build.js` reads it, checks it and writes `data/`. `--check` checks without writing. It rejects, with the file and the place: unknown question types and kinds, a circle-one question without exactly one right choice, a choice with no reason, a solution with too few steps, a numeric answer outside its own range, references to questions or mechanisms that do not exist, rubric points that do not add up, unbalanced HTML, disallowed tags, dash characters used as punctuation, and structures that RDKit cannot parse.
- **Files here.** `tools/build.js`, `tools/chem.py`, `docs/dev/CONTENT-SPEC.md`.
- **Would extend.** `tools/` in Eureka, beside `build-classes.js` and the existing `check-*.js` scripts.
- **Data change.** None if the checks are pointed at the banks as they are. The value comes from writing down each class's schema and failing the build when a file breaks it.
- **Size.** Small for a first set of checks per class (ids unique, one right answer, references resolve). It pays for itself the first time several people or agents write content at once, which is how this class was built.

## 9. Pictures written as tokens

- **What it is.** Text carries `{{CH3O-}}` for formulas and `[[kind:spec]]` for figures: a structure from SMILES, a reaction, a chair, a Newman projection, an energy diagram, a mechanism, a 3D model. The page draws them as SVG. Nothing is an image file, so a figure can be corrected by editing a line of text, and the build can check it.
- **Files here.** `ORGO.tokens` and the text renderer in `assets/core.js`; the drawing code in `assets/mol.js`, `chair.js`, `newman.js`, `energy.js`, `view3d.js`.
- **Would extend.** A small shared renderer with a registry of token kinds, which each class fills with its own. The energy diagram is the one kind likely to be useful outside chemistry as it stands. An economics class would register its own kinds (a supply and demand graph, say).
- **Data change.** Tokens in place of image references, for figures that can be described in a line.
- **Size.** Small for the shared registry. Each new kind of figure is its own job.

## 10. An end-to-end browser test

- **What it is.** A Playwright script that opens every page from `file://`, draws every reading, and mounts every question, worked example and mechanism. It fails if anything throws, logs an error, or leaves a figure undrawn. Separate unit tests cover the chair model, structure parsing and scoring.
- **Files here.** `tools/test/smoke.js` (the browser test, run on its own), `tools/test/run.js` with `tools/test/*.test.js` (the unit tests).
- **Would extend.** `tools/` in Eureka: one smoke script that takes a class folder.
- **Data change.** None.
- **Size.** Small. "Every page opens with no console error" is an afternoon's work and catches most breakage. The description above is taken from the header of `smoke.js`. The tests were not run while writing this note.

## Suggested order

1. Build checks (8) and the browser test (10): small, and they protect everything after.
2. The four general question kinds (2) and stepwise solutions (3).
3. The schedule and delayed mastery (1).
4. Written questions with rubrics (2), then mock exams (5), for classes with a written exam.
5. Type pages (4), one class at a time, where a past exam exists.
6. Reading branches (7) and tokens (9) as each class has a use for them.
