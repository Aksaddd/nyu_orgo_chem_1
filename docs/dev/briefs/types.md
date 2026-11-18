# Brief: question types (what to know, worked examples, practice)

OWN: for each type id in your task line: content/types/<id>.json and content/items/<id>.json; plus the one mechanisms
file named in your task line, if any. Nothing else.
READ: docs/dev/CONTENT-SPEC.md (all); docs/dev/LECTURES.md (all: the course's facts, numbers and words);
docs/dev/EXAM-KEY.md (the questions your types come from); content/blueprint.json (your types' entries);
content/types/nuc-pairs.json and content/items/seed.json (models of shape and tone; do not edit seed.json);
content/tables/pka.json, avalues.json, rates.json (the numbers to use). If your task line names mechanisms, also
content/mechanisms/core.json (the model) and, if it exists, content/mechanisms/exam.json (do not duplicate its ids).

A question type is one kind of question the exam asks. For each of your types, a student should be able to open it
knowing nothing and leave able to answer any version the professor writes.

## content/types/<id>.json
`know`: everything needed to answer this kind of question, 8 to 14 entries, each one or two self-contained sentences
with its source in `from` (a lecture and page, a table, or "standard"). Include the facts, the rules, the numbers to
have memorized, and the skills (for example "be able to draw the conjugate base"). `method`: the 4 to 7 steps to
follow, in the order a student should think, each a full sentence. `pitfalls`: the 3 to 6 mistakes that cost points
here. `links.read`: reading ids that teach it (rings-1, nmr, rings-2, acids, organometallics, sn2-1, sn2-2, sn1-e1, e2,
choose, beyond). Keep `id`, `title`, `exam`, `points`, `asks` consistent with content/blueprint.json.

## content/items/<id>.json
The task line gives, per type, the number of worked examples and practice questions and the kinds to use.
- First list for yourself the ways this question can vary (substrate class, reagent, leaving group, solvent,
  stereochemistry, ring position, charge, what is asked for, a trap the professor could set). Cover each way at least
  twice. No two items may differ only trivially. Ids `<type>-001` onward; worked examples first.
- **Worked examples** (`"role": "worked"`): the first follows the logic of the original exam question on a new
  example; each later one takes a different variation. 4 to 7 solution steps, each a title and a step that gives its
  reason; 2 to 4 steps carry an `ask` (a question the student answers before reading on, with its short answer). For
  mcq and multi, every choice has a `why`.
- **Practice** (`"role": "practice"`): spread over `diff` 1, 2 and 3 (about a third each; 3 means exam-hard or with a
  trap). At least 3 solution steps each, plus `answer` and `rule`. Wrong choices are real student mistakes, each with
  a `why` that names the mistake.
- `written` items (explain, draw the mechanism, draw the products) carry `pts`, `time`, a `model` answer exactly as it
  should appear on the exam page (structures, mechanisms and chairs as tokens), and a `rubric` that adds up to `pts`.
- Chair items (`kind: "chair"`) need no answer key (the page computes it) but do need `solution` steps in words.
- Use the lecture's numbers. Where a literature value differs, the lecture's is the answer and a `note` says so.
- Draw, do not describe: structures as `[[mol:…]]`, reactions as `[[rxn:…]]`, chairs and rings as tokens, energy
  diagrams as `[[energy:…]]`. Keep stems short.

## Mechanisms (only if your task line names a mechanisms file)
Atom-mapped SMILES and arrows exactly as CONTENT-SPEC.md says. Every mechanism must pass the checker, which moves the
electrons and compares with the next structures. Reference them from items with `"kind": "mech"` or inside a model
answer with `[[mech:id]]`.

## Chemistry discipline
Only facts from the digest, the key, the tables, or first-semester organic chemistry you are certain of. Check every
structure: `python3 tools/chem.py smiles '<smiles>' '<smiles>' …` prints formula, stereocentres and canonical form;
use it to confirm stereochemistry (R or S, inversion products), molecular formulas, and that two drawings you call the
same are the same. When a question's answer depends on a number, the number must be in LECTURES.md or the tables.
Do not write an item whose answer you would not stake a grade on.

CHECK (one command; repeat until clean): `python3 tools/chem.py mech <your mechanisms file, if any> ; node
tools/build.js --check <all your files>`
