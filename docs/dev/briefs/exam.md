# Brief: the Fall 2024 exam, fully worked

OWN: content/exam.json, content/items/exam.json, content/mechanisms/exam.json
READ: docs/dev/CONTENT-SPEC.md (all); docs/dev/EXAM-KEY.md (all: the verified answers); docs/dev/LECTURES.md (all:
the course's own facts and numbers); content/mechanisms/core.json and content/items/seed.json (as models of style and
shape; do not edit them; the Grignard mechanism for Q1D already exists as `grignard-co2-benzoic-acid`).

Turn the answer key into content a student learns from. For every part of every question write the item or items that
ask it and a full worked solution, in the words of a patient tutor: what to notice first, each step with its reason,
the answer as it should be written on the paper, the rule to keep. Use the lecture's own numbers and vocabulary.

- `content/exam.json`: `{title, date, minutes: 110, choose: 7, rules: [...], questions: [{n, title, pages: [pdf pages],
  parts: [{label, pts, type, items: [ids], note}]}]}` for all nine questions; parts of a question add up to 100 (a
  question with no lettered parts has one part of 100). `type` is the blueprint id the part trains (see the "exam"
  column of EXAM-KEY.md headings and content/blueprint.json ids: pka-values, mech-id, nuc-pairs, mech-organometallic,
  rate-pairs, mech-two-paths, traits, energy-diagrams, fastest-substrate, e2-ring-product, chair-read,
  mech-intramolecular, williamson-why, e2-stereo-explain, route-choice, products-from-formula, sub-vs-elim,
  all-elim-products, chair-both, mech-rearrangement). PDF pages: Q1 2-3, Q2 4-5, Q3 6-7, Q4 8-9, Q5 10-11, Q6 12-13,
  Q7 14-15, Q8 16, Q9 17.
- `content/items/exam.json`: every item has `"role": "exam"`, an id like `exam-q1a-phenol`, and `src` like
  `"FA24 Exam 2, Q1A"`. Kinds: Q1A five `numeric` items; Q1B `mcq` (`fixed`); Q1C three `mcq` with `layout: "pair"`;
  Q1D a `written` item (model answer uses `[[mech:grignard-co2-benzoic-acid]]`, rubric from the key) and a `mech` item;
  Q2A three `mcq` pairs whose two choices are `[[rxn:…]]` reactions; Q2B a `written` item (55 for the two mechanisms,
  15 for the NMR inference; model uses your two mechanisms) plus two `mech` items; Q3A `multi` (`fixed`); Q3B `mcq`
  with four `[[energy:…]]` choices matching the four diagrams described in the key (`fixed`); Q3C `mcq` (`fixed`); Q3D
  `mcq` with the four structures as choices (`fixed`) and a `chair` item (`subs` `1u:Cl,2d:CH3`, `given: "ring"`,
  `ask: ["e2"]`, `lg: 1`); Q4A five `chair` items (given chairA or chairB as in the key's table; ask cis-trans and
  stable); Q4B `written` plus `mech`; Q5A `written` (80) plus two `mech`; Q5B `written` (20; the model shows
  `[[chair:1u:Cl,2d:Cl,3u:Cl,4d:Cl,5u:Cl,6d:Cl|B]]` and the flipped form); Q6A `mcq` pair plus a short `written`
  explanation; Q6B `written` (two structures) or two `mcq` with structure choices; Q7A `written`; Q7B `written` (model
  shows the three structures and the two-step reasoning); Q8 three `chair` items (given ring; ask stable and
  relationship); Q9 `written` (100) plus two `mech` items.
  Written items carry `pts`, `time`, `model` and a `rubric` that adds up to `pts`; use the rubrics in the key.
  Every wrong choice of every mcq has a `why` that names the mistake.
- `content/mechanisms/exam.json`: `e2-cumyl-iodide-hydride` and `e1-cumyl-iodide-water` (Q2B),
  `epoxide-migration-methoxide` (Q4B, two steps), `sn2-tertbutoxide-iodomethane` and `e2-tertbutyl-iodide-methoxide`
  (Q5A), `dithiane-double-sn2` (Q6B, two steps, optional if it proves awkward), `ring-expansion-diazonium-ch2` and
  `ring-expansion-diazonium-fusion` (Q9: loss of N2; the 1,2-shift; the oxygen lone pair forming C=O+ -H; water
  removing the proton). Atom-mapped SMILES exactly as the spec says; each must pass the checker.

Chemistry discipline: validate every SMILES and compare products with
`python3 tools/chem.py smiles '<smiles>' …` (formula, stereocentres, canonical form). For Q9 confirm that your two
mapped products are the two ketones in the key by comparing canonical SMILES. For Q3D and Q2A keep the stereo
descriptors of the key's SMILES.

CHECK (one command, repeat until clean): `python3 tools/chem.py mech content/mechanisms/exam.json && node
tools/build.js --check content/exam.json content/items/exam.json content/mechanisms/exam.json`
