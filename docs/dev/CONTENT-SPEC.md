# Writing content for CHEM 225

Everything a student reads or answers is written as JSON under `content/`. Nobody edits the files under `data/`, or
the four generated files in `read/` (`chapters.js`, `bank.js`, `figures.js`, `positions.json`: the readings as Eureka's
reader shows them): `node tools/build.js` checks the JSON, draws every structure with RDKit, proves every mechanism by
moving its electrons, and writes them. If the build prints a problem, the content is wrong, not the build.

```bash
node tools/build.js            # check everything and write data/ and the reader's files in read/
node tools/build.js --check    # check only
node tools/build.js --check content/items/nuc-pairs.json    # check some files only
python3 tools/chem.py smiles 'C[C@H](Cl)CC'                  # formula, stereocentres, canonical form of a structure
python3 tools/chem.py mech content/mechanisms/sn2.json       # prove the mechanisms in one file
```

## Ground rules

1. **Correct first.** A wrong structure, number or arrow costs a student exam points. If you are not sure, check
   (RDKit, the lecture transcription, the reference tables in `content/tables/`), and if it cannot be checked, leave it out.
2. **The lecture's values are the exam's values.** Where the professor's number differs from the literature (for example
   H<sub>2</sub>S p*K*<sub>a</sub> 10 in lecture, about 7 in most tables), the answer key uses the lecture value and a
   short note gives the literature value.
3. **Plain, direct sentences.** Write the way a good tutor talks. No dash characters used as punctuation (— or –): use a
   comma, a colon, or "to" for ranges. No exclamation marks. Do not address the reader as "students".
4. **Every question has a worked solution**: numbered steps from "what do I notice" to the answer, each step with its
   reason. A student who got it wrong should be able to see exactly where their thinking left the path.
5. **Wrong answers are real mistakes.** Each wrong choice is something a student would actually think, and says why it
   is wrong. Tag it with an error id from `content/errors.json` when one fits.
6. **JSON only.** Double quotes, no comments, no trailing commas. A backslash in a SMILES string is written `\\`
   (the build rejects a lone backslash, so E/Z stereo cannot be lost silently).

## Formulas in text: `{{ }}`

Write formulas plainly inside double braces and they are typeset: `{{CH3O-}}` gives CH₃O⁻, `{{(CH3)3COH}}`,
`{{H3O+}}`, `{{-OH}}`. Digits after a letter or a closing bracket become subscripts; a plus or minus at the very end (or the very start) becomes
a superscript charge. For a charge with a number write a caret: `{{Mg^2+}}`, `{{SO4^2-}}`. A few names are known: `{{SN1}}`, `{{SN2}}`, `{{E1}}`, `{{E2}}`, `{{E1cb}}`, `{{pKa}}`, `{{Ka}}`,
`{{Keq}}`, `{{dG}}` (ΔG), `{{dH}}` (ΔH), `{{Ea}}`, `{{sp3}}`, `{{sp2}}`, `{{sp}}`, `{{1H}}`, `{{13C}}`, `{{B0}}`.
Outside braces use ordinary HTML: `<b>` for key terms, `<i>`, `<sub>`, `<sup>`, `<br>`, `<ul>`/`<ol>`/`<li>`, `<p>`,
`<table>`. No inline styles, no headings, no links.

## Pictures in text: `[[ ]]`

A token on its own line is a figure; inside a sentence it is drawn small, in line.

| Token | Draws | Example |
|---|---|---|
| `[[mol:SMILES]]` | a structure (skeletal, wedges from the SMILES stereo) | `[[mol:C[C@H](Cl)CC]]` |
| `[[mol:SMILES\|abbr]]` | the same with tosylate / mesylate written OTs / OMs | `[[mol:CC(C)OS(=O)(=O)c1ccc(C)cc1\|abbr]]` |
| `[[mol:SMILES\|me]]` | the same with CH₃ written out on end carbons | `[[mol:CC(C)(C)Br\|me]]` |
| `[[rxn:LEFT>ABOVE;BELOW>RIGHT]]` | a reaction with a forward arrow | `[[rxn:CCCCBr + C[O-].[Na+]>CH3OH;25 °C>CCCCOC + [Na+].[Br-]]]` |
| `[[eq:…]]` `[[eqr:…]]` `[[eql:…]]` | the same with an equilibrium arrow (even, favouring the right, favouring the left) | `[[eqr:O + [NH2-]>>[OH-] + N]]` |
| `[[nr:…]]` | the same with a crossed-out arrow (no reaction) | `[[nr:CCO + [SH-]>>CCS + [OH-]]]` |
| `[[ring:SUBS]]` | a flat cyclohexane with wedges and dashes | `[[ring:1u:CH3,2u:CH2CH3]]` |
| `[[chair:SUBS\|A]]` | chair form A of that molecule (`B` is the ring-flipped form) | `[[chair:1u:CH3,2u:CH3\|A]]` |
| `[[newman:FRONT\|BACK\|ANGLE]]` | a Newman projection | `[[newman:CH3,H,H\|CH3,H,H\|60]]` |
| `[[energy:SPEC]]` | a reaction-coordinate diagram | `[[energy:R=0,TS=20,P=-8]]` |
| `[[mech:ID]]` | a mechanism from `content/mechanisms/`, with its arrows, step by step | `[[mech:sn2-meI-hydrosulfide]]` |
| `[[view3d:NAME]]` | a 3D model the student can turn | `[[view3d:cyclohexane-chair]]` |
| `[[fig:NAME]]` | a drawing from `assets/figs/NAME.svg` | `[[fig:sn2-transition-state]]` |
| `[[lec:L1105:2]]` | a link to page 2 of the 11/05 lecture notes | |

In a reaction, species are separated by ` + ` (space, plus, space). A species is a SMILES (several ions of one salt are
joined with a dot, as in `C[O-].[Na+]`) or a label in double quotes (`\"Product A\"`). `ABOVE;BELOW` is the text on the
arrow, written as formulas without braces (`NaOCH3;CH3OH`), and either or both may be empty (`>>`).

**Cyclohexane substituents (`SUBS`).** One entry per substituent: ring carbon 1 to 6, then `u` (up, a wedge) or `d`
(down, a dash), then the group: `1u:CH3,3d:OH`. Up and down do not change when the ring flips; axial and equatorial do,
and the page works those out, so you never write "axial" or "equatorial" in a token. Form `A` is the chair in which
carbon 1's axial bond points up (so in form A an up group on carbons 1, 3, 5 is axial and an up group on carbons 2, 4, 6
is equatorial). Groups the page knows the size of: `CH3`, `CH2CH3`, `CH2CH2CH3`, `CH(CH3)2`, `C(CH3)3`, `F`, `Cl`,
`Br`, `I`, `OH`, `OCH3`, `NH2`, `COOH`, `CN`, `Ph`, `D`. Options after a bar: `num` numbers the carbons, `H` draws every
hydrogen.

**Newman.** Front groups clockwise from the top, bar, back groups clockwise from the top when the back carbon is turned
by `ANGLE` degrees (60 is staggered, 0 is eclipsed).

**Energy diagram.** Points in order as `NAME=ENERGY` (kcal/mol, relative). Names starting `TS` are peaks, `R` and `P`
are the ends, anything else is an intermediate (a valley). Add labels after a bar: `[[energy:R=0,TS1=22,I=12,TS2=15,P=-6|I=carbocation,TS1=rate-determining]]`.

## Mechanisms: `content/mechanisms/*.json`

A file holds a list of mechanisms. Each step gives the structures present and the arrows of that step. The build moves
the electrons and insists that what the arrows produce is exactly the next step's structures, with every atom keeping
an allowed number of bonds.

```json
{
  "id": "e2-tertbutyl-bromide-hydroxide",
  "title": "E2: tert-butyl bromide and hydroxide",
  "class": "E2",
  "types": ["mech-dual-elim"],
  "overall": "[[rxn:CC(C)(C)Br + [OH-]>>CC(C)=C + O + [Br-]]]",
  "steps": [
    {
      "name": "One concerted step",
      "species": "[OH-:1].[H:2][CH2:3][C:4]([CH3:6])([CH3:7])[Br:5]",
      "arrows": [
        {"from": {"lp": 1}, "to": {"bond": [1, 2]}},
        {"from": {"bond": [2, 3]}, "to": {"bond": [3, 4]}},
        {"from": {"bond": [4, 5]}, "to": {"atom": 5}}
      ],
      "say": "Hydroxide takes the hydrogen that is anti to the bromine. The C-H electrons become the new pi bond as bromide leaves.",
      "why": "Hydroxide is a strong base and the carbon is tertiary: SN2 is blocked, so the base removes a beta hydrogen instead. All three arrows happen at once: rate = k[RBr][HO-].",
      "hints": ["Which atom has electrons to give?", "A base takes a proton. Which proton sits next to the carbon carrying the leaving group?", "Three arrows: base to H, C-H bond to C-C, C-Br bond to Br."]
    }
  ],
  "product": "[H:2][OH:1].[CH2:3]=[C:4]([CH3:6])[CH3:7].[Br-:5]",
  "takeaway": "E2 is one step: base, hydrogen and leaving group all move together, with H and LG anti-periplanar."
}
```

Rules for `species`:

- **Atom-mapped SMILES**, molecules separated by dots, drawn left to right in the order written: put the nucleophile or
  base first and the molecule it attacks next to it.
- Every atom an arrow touches carries a map number (`[CH3:2]`), and an atom keeps its number through the whole mechanism.
- A hydrogen that moves is written as an atom: `[H:2][CH2:3]…`. Other hydrogens stay implicit (`[CH2:3]`, `[OH-:1]`).
- A step may bring in a new molecule (a second water, the acid of the workup): list its plain SMILES in that step's
  `"adds": ["O"]` and include it in that step's `species`. By-products may simply be left out of later steps.
- Write the structures of a step as they are **before** its arrows act. The last structures go in `product`.

Rules for `arrows` (one arrow moves one electron pair):

- `from`: `{"lp": n}` a lone pair (or negative charge) on atom *n*; or `{"bond": [a, b]}` the bond between *a* and *b*.
- `to`: `{"bond": [a, b]}` the pair becomes the bond between *a* and *b* (a new bond, or a second or third bond); or
  `{"atom": n}` the pair becomes a lone pair on *n*, which must be one end of the bond it came from.
- A nucleophile's lone pair on atom 1 attacking carbon 2 is `{"from": {"lp": 1}, "to": {"bond": [1, 2]}}`.
  A leaving group 5 departing from carbon 4 is `{"from": {"bond": [4, 5]}, "to": {"atom": 5}}`.
  A 1,2-hydride shift of H 4 from carbon 3 to cationic carbon 2 is `{"from": {"bond": [3, 4]}, "to": {"bond": [4, 2]}}`.
- `say` is the one or two sentences a tutor says while drawing the step. `why` is the reason the step happens (which
  site is electron rich, which is electron poor, p*K*<sub>a</sub>, sterics, stability). `hints` go from gentle to explicit.

## Questions: `content/items/*.json`

A file holds a list of items for one question type. Common fields:

| Field | Meaning |
|---|---|
| `id` | unique, `<type>-NNN` |
| `type` | the question type id from `content/blueprint.json` |
| `role` | `"worked"` (a worked example shown step by step), `"practice"`, or `"exam"` (a part of the original exam) |
| `kind` | `mcq`, `multi`, `numeric`, `rank`, `classify`, `written`, `mech`, `chair` |
| `diff` | 1 (direct), 2 (one twist), 3 (exam-hard or beyond) |
| `skills` | skill ids from `content/skills.json` |
| `src` | `"site"`, or where it comes from: `"FA24 Exam 2, Q3D"`, `"Lecture 11/10, homework"` |
| `stem` | the question (HTML with `{{ }}` and `[[ ]]`) |
| `solution` | `{"steps": [{"t": "short title", "h": "the step, with its reason"}], "answer": "the final answer as it should be written", "rule": "the one-line rule to remember"}` |

In a worked example a step may add `"ask": {"q": "a question to answer before reading on", "a": "its short answer"}`.
Use two to four of these per worked example, on the steps that carry the reasoning.

Fields by kind:

- **`mcq`** (circle one) and **`multi`** (circle all that apply): `"choices": [{"h": "...", "ok": true, "why": "why it
  is right"}, {"h": "...", "ok": false, "why": "why it is wrong", "err": "SN1-03"}]`. `mcq` has exactly one `ok`.
  Add `"layout": "pair"` for two side-by-side structures or reactions ("circle the faster"), `"fixed": true` to keep the
  written order (for A, B, C, D options that refer to each other or to numbered pictures).
- **`numeric`**: `"answer": 10, "lo": 9, "hi": 11` (the accepted range), optional `"unit"`, and
  `"note": "Lecture value 10. Tables give 9.95 to 10.0."`.
- **`rank`**: `"order": "fastest SN2 first"`, `"items": [{"h": "..."}, …]` written in the correct order (the page shuffles).
- **`classify`**: `"bins": ["SN1", "SN2", "E1", "E2"]`, `"items": [{"h": "...", "bin": "SN2", "why": "..."}]`.
- **`written`** (pen and paper: explain, draw the mechanism, draw the products): `"time": 8` (minutes),
  `"model": "the full-credit answer as it would appear on the exam page, with [[mech:…]], [[chair:…]], [[mol:…]] as needed"`,
  `"rubric": [{"pts": 20, "h": "what must be on the page to earn these points"}]`. The rubric points add up to the
  question's points. The student writes on paper, then compares and ticks the rubric lines.
- **`mech`** (draw the arrows on screen): `"mech": "the mechanism id"`.
- **`chair`**: `"subs": "1u:CH3,2u:CH2CH3"`, `"given": "ring"` (a flat wedge/dash drawing), `"chairA"` or `"chairB"`
  (a chair drawing), and `"ask"`: any of `"cis-trans"`, `"stable"` (is the drawn chair the more stable one, and which is),
  `"flip"` (build the other chair), `"relationship"` (are the two chairs the same, enantiomers or diastereomers),
  `"e2"` with `"lg": 1` (which hydrogens can leave in an E2 and what alkene forms). The page computes the answers, so a
  chair item needs no answer key: write only the `solution` steps that explain it.

## Question types: `content/types/<id>.json`

One file per question type on the exam blueprint. This is what a student reads before practising that kind of question.

```json
{
  "id": "nuc-pairs",
  "title": "Circle the stronger nucleophile",
  "exam": "Q1C",
  "points": 15,
  "asks": "Two species are shown. Circle the one that attacks carbon faster.",
  "know": [
    {"h": "<b>Nucleophilicity</b> is a rate: how fast a species attacks carbon in an {{SN2}} reaction. It is measured, not looked up from {{pKa}}.", "from": "Lecture 11/05, p. 2"},
    {"h": "…"}
  ],
  "method": ["Find the attacking atoms.", "Same atom? Then …", "Same row? Then …", "Same column? Then …"],
  "pitfalls": [{"h": "Ranking by basicity alone when the atoms are in different rows.", "err": "NUC-01"}],
  "links": {"read": ["sn2-factors#nucleophile"], "axioms": ["A3", "A9"], "lab": ["nucleophile-chart"]}
}
```

`know` is the complete list of facts, rules and skills needed to answer this kind of question, each a self-contained
sentence or two with where it comes from. `method` is the procedure, in the order a student should think.

## Readings: `content/read/<id>.json`

```json
{
  "id": "rings-1",
  "n": 1,
  "title": "Rings and ring strain",
  "lecture": "2026-10-20",
  "from": "Lecture notes 10/20, pages 1 to 3",
  "goals": ["Say where ring strain comes from", "…"],
  "sections": [
    {
      "id": "angle-strain",
      "title": "Angle strain: bonds bent away from 109.5°",
      "pages": ["L1020:1"],
      "html": "<p>…the passage, at exam level, with <b>key terms</b>…</p>\n[[mol:C1CC1]]",
      "micro": [{"t": "Why a bent bond is a weak bond", "h": "<p>…closer look…</p>"}],
      "macro": [{"t": "Why this matters beyond the exam", "h": "<p>…bigger picture…</p>"}],
      "why": {"q": "Why is cyclopropane's C-C bond weaker than propane's?", "a": "…"},
      "check": ["ring-strain-003", "ring-strain-007"]
    }
  ],
  "homework": [{"q": "the professor's homework prompt, as written", "from": "L1020:2", "steps": [{"t": "…", "h": "…"}], "answer": "…"}],
  "summary": ["…", "…"]
}
```

`html` is the main passage. `micro` (zoom in) holds the finer detail that explains *how*; `macro` (zoom out) holds the
connection to the rest of chemistry, to the exam, and to medicine or biology. `why` is one question the reader answers
in their head before moving on. `check` lists practice items shown under the section.

### Where a reading is shown

A reading is shown in two places, from the same file.

Inside Eureka it is shown by Eureka's own reader (the page ECON 101 uses). The build turns every reading into the
shape that reader takes and writes `read/chapters.js`, `read/bank.js` and `read/figures.js` (never edited by hand;
`docs/dev/ARCHITECTURE.md`, "The readings inside Eureka", has the map). What becomes of each part:

| In the file | In Eureka's reader |
|---|---|
| a section: `title`, `html` | one passage: its heading and its text, at the exam level |
| `micro`, `macro` | folded blocks under the passage: "Closer look: title" and "Bigger picture: title" |
| `pages` | a line under the passage, "Original notes: 10/20 page 1", that opens the picture of the page |
| `why` | a card to flip, "Before you move on": the question on the front, the answer on the back |
| `check`, kind `mcq` | a question under the passage. After a wrong answer the reader shows the `why` of the choice that was picked |
| `check`, kind `rank` | "Put it in order": the `items`, with `order` as the instruction |
| `check`, kind `classify` | "Sort it": the `items` into the `bins` |
| `check`, kind `multi` | "Sort it": every statement into one of two boxes named for what the stem asks |
| `check`, kind `numeric` | a card to flip: the stem, then the answer with its unit, the solution's `rule` and the `note` |
| `check`, kind `mech` or `chair` | a sentence at the end of the passage, with a link to the mechanism in the Mechanism Studio or to the question type in Practice |
| `homework` | one more passage, "Homework from the lecture": each prompt, with its steps and answer in a folded block |
| `summary` | the last passage, "In short" |
| `from`, `goals` | the lines under the chapter's title |
| `lecture` | the label "Lecture 10/20" (a reading without a date is labelled "Review") |

Outside Eureka the class's own reader (`read/page.js`) shows the same file as it always did.

Rules that follow from this. The build checks each one and says what to change:

- **Add at the end.** Eureka's reader keeps a student's place, the notes and the reading-level texts by position
  (passage 3, its activity 2). A new section goes after the sections of its reading, and a new id after the ids of its
  `check` list. Do not reorder or remove what is there. The build stops when a position would move
  (`read/positions.json` remembers them); `node tools/build.js --accept-moves` is for the rare move that is meant.
- **Titles are plain words.** The title of a reading and of a section has no markup, no `{{ }}` and no `[[ ]]`: the
  reader also shows it in the browser tab and in dialogs.
- **A question under a reading** is of kind `mcq`, `rank`, `classify`, `multi`, `numeric`, `mech` or `chair` (not
  `written`). An `mcq` there has at most five choices. The stem of a `rank`, `classify` or `multi` item used there is
  words only (formulas are fine): it becomes the title of an activity, which cannot show a figure, a list or a table.
- **A `multi` item used under a reading** needs names for its two boxes. They come from the wording of the stem:
  "…<b>is</b> a characteristic of X reactions?", "…is <b>NOT</b> a characteristic of X reactions?", "…fit?",
  "…are correct?" and "…is true?" are known. For another wording, add a line to `BOXES` in `tools/build.js`.
- **An explanation that names a choice by its place** ("A and C", "diagram 2") keeps the written order of the choices
  in both readers. The build sets `fixed` for the usual wordings; set `"fixed": true` yourself for any other, such as
  "the left one".
- **`pages`** names pictures that exist in `archive/pages/` (`L1020:1` is `archive/pages/L1020-1.png`).

## Mock exams and the original exam: `content/mock/<id>.json`, `content/exam.json`

`{"id": "mock-1", "title": "Mock Exam 1", "minutes": 110, "choose": 7, "questions": [{"n": 1, "parts": [{"label": "A", "pts": 15, "item": "pka-values-021"}]}]}`.
Nine questions of 100 points, in the shape of the original: the parts of each question add up to 100.

A part may list one item (`"item": "id"`) or several (`"items": ["id1", "id2"]`, shown one after another: for example
the five compounds of a pKa question). `content/exam.json` has the same shape for the original exam, plus `"pages"`
(the PDF pages of each question) and `"title"`.

## Glossary (`content/glossary.json`)

A list of entries, one per term:

```json
{ "term": "nucleophile", "also": ["nucleophiles", "nucleophilic"], "def": "An electron-rich species that ...",
  "parts": [["nucleo-", "nucleus (the positive centre)"], ["-phile", "loving"]], "lit": "nucleus-loving" }
```

Only `term` and `def` are required. `also` lists plurals, abbreviations and other spellings that should find the same
entry; `parts` breaks the word into pieces with their meanings, and `lit` gives the literal meaning, for the terms where
that helps memory. Plain text only: no tokens, since the text is shown by Eureka's lookup card and Word Bank, which do
not draw structures. Definitions use the lecture's values where a number appears.

The build writes the list to `assets/glossary.js` as `LEXICON`, `TERMS` and `GLOSS`, the three shapes Eureka reads
(its `docs/adding-a-class.md`). `assets/eureka.js` loads that file before Eureka's lookup, so nothing is asked for twice.
