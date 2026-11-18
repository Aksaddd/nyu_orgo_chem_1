# Brief: the Readings page and the Exam 2 Lab page

OWN: read/page.js, exam/page.js, assets/study.css
READ: docs/dev/ARCHITECTURE.md (sections "The global", "Scheduling and mastery", "quiz.js", "The UI kit");
docs/dev/CONTENT-SPEC.md (sections "Question types", "Readings", "Mock exams"); assets/core.js;
content/read/rings-1.json, content/types/nuc-pairs.json, content/exam.json, content/blueprint.json (first 40 lines),
archive/files.js.

## read/page.js
- No hash: the list of chapters from `ORGO.data.chapterList` (number, title, lecture date, a progress bar from
  `ORGO.store.get("read-v1", {})[chapterId]`), in order, with "Continue" on the first unfinished one.
- `#chapterId` (optionally `#chapterId/sectionId`): `ORGO.need("read/" + id)` then the reader, in `.prose`:
  title, "From the lecture of …", a "See the original notes" button for each page in the sections' `pages`
  (`"L1020:1"` → image `archive/pages/L1020-1.png` in a sheet, `ORGO.ui.sheet`), the goals; then each section: its
  title; `html` through `ORGO.html`; each `micro` entry as `<details class="more micro">` titled "Closer look: …";
  each `macro` entry as `<details class="more macro">` titled "Bigger picture: …"; the `why` question as a small card:
  the question, "Think, then show", the answer, and "Got it" / "Not yet" (stored); the `check` items one after another
  with `ORGO.quiz.mount` (load `ORGO.need("t/" + type)` using `ORGO.data.index[id][0]`); a section is marked read (time
  stamp in `read-v1[chapter][section]`) when its bottom has been on screen and its why card answered, or by a "Mark as
  read" button. After the sections: `homework` (the professor's prompt, "Try it first", then the worked steps and
  answer), the `summary` as a list, and a link to the next chapter. A sticky mini table of contents on wide screens.
- Reading comfort: text size control (three sizes, stored in `prefs`), nothing else.

## exam/page.js (Exam 2 Lab)
- No hash: two parts. (1) "The Fall 2024 exam, worked": after `ORGO.need("exam")`, a card per question of
  `ORGO.data.exam.questions` (number, title, points of each part). (2) "Every question type": the blueprint
  (`ORGO.data.blueprint`) in two groups, "On the past exam" (`group: "exam"`) and "From the lectures"
  (`group: "lecture"`); each card: the exam reference, the title, points, mastery dots (`ORGO.learn.mastery(id)`),
  and how many worked examples and practice questions it has (`count`).
- `#q3`: one original question. For each part: label, points, the type it trains (link), a "See it on the exam paper"
  button (image `archive/pages/EX-07.png` for PDF page 7, zero padded, in a sheet), then the part's items
  (`part.items` or `[part.item]`) with `ORGO.quiz.mount` in order. Above: "Work it on paper first. The steps appear
  after you answer."
- `#<typeId>`: `ORGO.need("t/" + id)` then: the title, `asks`, exam reference and points, mastery line (level label,
  delayed accuracy when there is any). Tabs (`ORGO.ui.tabs`): "What you need to know" (the `know` list, each with its
  `from` in muted text); "Method" (the `method` steps numbered, then `pitfalls`); "Worked examples" (each worked item
  with `ORGO.quiz.worked`, the first open); "Practice" (a session over this type's practice and exam items:
  `ORGO.quiz.session(el, ORGO.learn.pick({types: [id], n: 10, mode: "mixed"}))`, and, when a generator exists for the
  type (`ORGO.chair.make` for chair-read, chair-both, e2-ring-product; `ORGO.energy.make` for energy-diagrams), an
  "Endless practice" button that mounts fresh generated items one after another with `ORGO.quiz.mount`). If the type
  has no content yet show the `asks` line and an empty state.
- `?paper=1`: pick one written or mech item and one chair item the student has not done recently and run them as a
  two-item session titled "On paper"; call `ORGO.learn.did("paper", 2)` at the end.

## assets/study.css
Styles for both pages (tokens and UI-kit classes only): the reader column, expanders, why card, chapter list, type
tabs, original-page viewer.

CHECK: one Playwright script, failing on any console error or pageerror: open
file:///home/user/nyu_orgo_chem_1/read/index.html, open the first chapter, expand an expander, press through a why
card; open exam/index.html, open #q1 and #nuc-pairs, visit each tab. Save ONE screenshot of the reader at 1100x900 and
look at it once.
