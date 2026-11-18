# Brief: questions, practice sessions, mock exams

OWN: assets/quiz.js, assets/quiz.css, drill/page.js, mock/page.js, tools/test/quiz.test.js
READ: docs/dev/ARCHITECTURE.md (sections "The global", "Scheduling and mastery", "quiz.js", "The UI kit");
docs/dev/CONTENT-SPEC.md (sections "Questions" and "Mock exams"); assets/core.js; content/items/seed.json (one real
item of every kind); content/exam.json.

## assets/quiz.js → ORGO.quiz
- `mount(el, item, {onDone, review})`: draws one item and runs the whole exchange. All text goes through `ORGO.html`
  (formulas and figures). Header: the type's short title (`ORGO.type(item.type)`), source (`item.src`), a flag toggle
  (`ORGO.learn.flag`). Then by kind:
  - `mcq`: choices are buttons with class `opt` inside `.opts` (shuffled unless `item.fixed`; `layout: "pair"` puts two
    side by side). On a pick: mark it right or wrong with a tick or cross and a word, show that choice's `why`, reveal
    the right one (set `data-c="true"` on it) with its `why`. Keys 1 to 6 pick.
  - `multi`: checkboxes styled as `opt`, then Check. Each choice is then marked with its `why`. Score 1 only if every
    choice is right, otherwise half of the fraction of correct decisions.
  - `numeric`: a number field (accepts a leading minus sign, including the typographic one) and Check. Right when
    lo ≤ x ≤ hi. Show the expected value and `note`.
  - `rank`: the items shuffled; the student orders them (tap an item then a position, or use up/down buttons; fully
    keyboard operable). Score 1 when exact, otherwise the fraction of pairs in the right relative order.
  - `classify`: each item with a segmented control of the bins; Check; per-item `why`. Score = fraction right.
  - `written`: the stem, the suggested time, "Write your answer on paper, as you would on the exam", a button "I have
    written it", then a confidence choice (guessing, unsure, sure), then the model answer beside the rubric; each
    rubric line gets full, half or none; score = points earned over points possible. If the student was "sure" and
    scored under half, say plainly that a confident miss is the most useful kind to find before the exam.
  - `mech`: `ORGO.mech.mount(host, item.mech, {mode: "solo", onDone})` when available.
  - `chair`: `ORGO.chair.ask(host, item, onDone)` when available.
  After the answer: the worked solution (`solution(item)`) is shown: numbered `.steps`, the `answer`, the `rule` as a
  callout. Then `ORGO.learn.record(item.id, {score, conf, secs})` (skip recording when `review` is true or the id
  starts with "gen:") and `onDone({score})`. A "Next" button is the caller's job.
- `worked(el, item)`: a worked example: the stem, then steps revealed one at a time with "Next step". A step with
  `ask` shows the question first; the student answers it in their head and presses "Show"; then the step. At the end
  the answer, the rule, and for mcq/multi the choices with their reasons. Nothing is recorded.
- `session(el, ids, {title, onEnd, kind})`: loads what it needs (`ORGO.need("t/" + type)` for each item's type, and
  "mech" when a mech item is present), shows a progress strip, one item at a time with Next, puts a missed item
  (score under 0.8) back in the queue after at least three others (once per item), and ends with a summary: how many
  right first time, which to look at again, when the next review is due, and one line on why mixed and spaced practice
  works. Calls `ORGO.learn.did(kind || "mixed", n)` and `onEnd`.
- `solution(item)` returns the solution element.

## drill/page.js (the Practice page)
Query `?mode=review|mixed|learn&n=12&type=<id>`. With no query show three cards: "Review what is due" (count from
`ORGO.learn.due()`), "Mixed practice" (choose 8, 12 or 20 questions; uses `ORGO.learn.pick({mode: "mixed", n})`), and
"One question type" (a list of the blueprint types with their mastery dots; pick one → `pick({types: [id], n: 10})`).
Then run `ORGO.quiz.session`. Explain in one sentence under each card what it is for. Empty states when there is
nothing due or no items yet.

## mock/page.js
- Landing: the exams in `ORGO.data.mockList` plus "The Fall 2024 exam itself" (from `ORGO.need("exam")` →
  `ORGO.data.exam`), past attempts from `ORGO.store.get("mock-v1", [])`, and the rules (110 minutes, choose 7 of 9,
  pen only, model kit allowed).
- Exam room: a countdown timer (pause allowed, shown), all nine questions listed with their parts and points; the
  student crosses out two questions; every part is answered on paper (stems shown, no feedback during the exam; mcq,
  multi, numeric, rank and classify parts may be answered on screen). A "Print this exam" button (`window.print()`;
  the print layout shows stems only).
- Marking: after "Finish" each counted part is shown with its model answer and rubric for self-marking (or marked
  automatically when it was answered on screen); total out of 700; per-question scores; the three weakest question
  types with links to their trainers (`exam/index.html#<type>`). Save `{id, at, score, max, parts}` to `mock-v1`,
  record each item with `ORGO.learn.record`, call `ORGO.learn.did("mock")`.
- Each part's items come from `part.items` or `[part.item]`.

## assets/quiz.css
Everything above, with tokens and UI-kit classes only. Print rules for the mock exam.

CHECK: one Playwright script: open file:///home/user/nyu_orgo_chem_1/drill/index.html?mode=mixed&n=9 and answer every
question it shows through the DOM (any answer), failing on any console error or pageerror, until the summary appears;
then open mock/index.html, start the Fall 2024 exam, finish at once and mark; no errors. Save ONE screenshot of an mcq
after answering (1100x800), look at it once, fix what is wrong. tools/test/quiz.test.js may hold the pure scoring
functions' tests (rank pairs, multi scoring) if you expose them as `ORGO.quiz._score`.
