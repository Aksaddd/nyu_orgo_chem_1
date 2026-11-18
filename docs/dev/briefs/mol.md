# Brief: structures, reactions, curved arrows, mechanism trainer

OWN: assets/mol.js, assets/mol.css, assets/mech.js, mechanisms/page.js, tools/test/mol.test.js
READ: docs/dev/ARCHITECTURE.md (sections "The global", "mol.js", "mech.js", "The UI kit"); docs/dev/CONTENT-SPEC.md
(sections "Pictures in text" and "Mechanisms"); assets/core.js; tools/chem.py (apply_arrows, lone_pairs, ALLOWED:
port these rules to JavaScript); content/mechanisms/core.json (six real mechanisms). Compiled data: data/mech.js,
data/index.js (inspect shapes with a one-line node command; do not read them whole).

## A. assets/mol.js → ORGO.mol
- `svg(key, {scale, inline, label})` from `ORGO.data.mols[key]` = `{w, h, p: [[bond|-1, d, kind]], t: [[atom, x, y, size, text]],
  a: [[x, y, el, charge, lonePairs, nH, map]], b: [[i, j, order]]}`. kind 0: stroke 1.6. kind 1: stroke 0.8 (hash lines).
  kind 2: filled wedge. Ink is currentColor. Draw the charge characters a little larger and bold, with a true minus.
  Inline drawings are scaled (about 0.62) and vertically centred in the text line. role="img" and an aria-label.
- Token handlers on `ORGO.tokens`: `mol` (arg `SMILES` or `SMILES|flags`; the data key is the SMILES plus `|abbr`, `|me` or
  `|abbr,me` when those flags are present; `s=0.8` is a display scale), and `rxn`, `eq`, `eqr`, `eql`, `nr` with arg
  `LEFT>ABOVE;BELOW>RIGHT`: species separated by " + "; a species is a SMILES (key as for mol) or a label in double
  quotes; ABOVE and BELOW are formula text (typeset each chemical word with `ORGO.formula`; leave "1)", "25 °C", "heat"
  as plain text). Lay out as a wrapping flex row: species, plus signs, and an arrow with text above and below
  (eq: two half arrows; eqr/eql: one of them longer; nr: a crossed arrow).
- `stage(el, {species, arrows, mode, onChange})`. `species` is the data key of the step's drawing (the mapped SMILES
  string itself). Atoms are addressed by map number (`a[i][6]`). Arrow geometry: a quadratic curve from source to
  target, bulging away from the drawing's centroid, with a filled head. A lone-pair source starts just outside the
  atom's label (measure the label from that atom's text items; 7px radius for an unlabelled carbon) and shows two small
  dots there. A bond source starts at the bond's midpoint. A target bond that does not exist yet ends at the edge of the
  atom that is not part of the source; one that exists ends at that bond's midpoint. A target atom ends at that atom's
  edge. Mode "show": static. Mode "play": arrows drawn one after another (no animation when `ORGO.reduced`).
  Mode "input": every atom and bond is a pick target of at least 28px, reachable with Tab, activated with Enter or
  Space, named for screen readers ("oxygen 1, 3 lone pairs, charge minus 1"; "bond carbon 4 to bromine 5"). First pick
  is the source (an atom means its lone pair; an atom with no lone pair may be picked, it is a mistake to explain),
  second pick is the target; Escape cancels. Controller: `{arrows(), set(arrows), clear(), undo(), check(expected), destroy()}`.
- `same(a, b)`: arrows are equal as electron movements. From: lone pair on n, or bond {a, b} (unordered). To: atom n, or
  bond {a, b} (unordered). A drawn arrow "bond {a, b} to atom m" with m not in the bond means "that pair makes a bond to
  m" and equals an expected arrow from bond [a, b] to bond [x, m] where x is a or b.
- `apply(drawing, arrows)` → `{problems: [text]}` with the same rules as tools/chem.py (a lone pair must exist, a bond
  must exist, formal charges by the sharing rule, allowed bond counts per element and charge).
- `check(expected)` → `{ok, score, notes: [{arrow, kind, text}]}`; score = matched / max(expected, drawn). Explain
  mistakes in this order: "starts where there are no electrons"; "drawn backwards" (its reverse is expected); an atom
  left with too many bonds because an arrow is missing; an extra arrow; otherwise a nudge toward the electron-rich site.
- mol.js must load in plain node (no DOM access at load time) so the tests can run it.

## B. assets/mech.js → ORGO.mech
- `mount(el, mechId, {mode, onDone})`: title, overall reaction (`ORGO.html`), a step strip, the stage for the current
  step, the step's `say` and `why`. A segmented control switches mode. "watch": Next and Back, arrows play, say and why
  shown. "complete": all but one arrow of each step are drawn and the student adds the missing one. "solo": the student
  draws every arrow, then Check; hints come one at a time and only after a first attempt; after two failed checks offer
  "Show me", which marks the step as helped. "paper": only the overall reaction and "Draw the whole mechanism on paper
  first", then reveal step by step with a tick per step. After the last step show the product and the takeaway, call
  `onDone({score, helped})` and `ORGO.learn.record("mech:" + id, {score, hinted: helped})`.
- `card(mechId)`: a compact static element: overall reaction, then each step drawn with its arrows and its `say` line.
  Register the token handler `mech` → `card`.

## C. mechanisms/page.js
After `ORGO.need("mech")`: a catalogue from `ORGO.data.mechList` grouped by `class`, each row with title, number of
steps, and a state mark from `ORGO.learn.state("mech:" + id)`. Pressing one opens the trainer in place (URL hash).
A "Surprise me" button. A two-sentence intro: every arrow starts at electrons (a lone pair or a bond) and ends where
they go.

## D. assets/mol.css
Drawings, schemes, stage, arrows (`var(--arrow)`), pick targets, focus rings, trainer. Tokens and UI-kit classes only.

## E. tools/test/mol.test.js (node)
Load assets/core.js and assets/mol.js in a vm with small stubs (window, document, localStorage), load data/mech.js
through `ORGO.reg`, and assert: for every step of every mechanism `apply(drawing, arrows)` reports no problems;
`same()` treats the clicked form and the written form as equal; the SN2 step with only its first arrow reports the
five-bond problem; a reversed arrow is reported as backwards.

CHECK: `node tools/test/mol.test.js`, then one Playwright script: open
file:///home/user/nyu_orgo_chem_1/mechanisms/index.html, fail on any console error or pageerror, open each mechanism
in watch mode and step through it, and in solo mode on sn2-iodomethane-hydrosulfide drive the controller (set the
expected arrows, check) and assert ok. Save ONE screenshot of the E2 mechanism in watch mode at 1100x800, look at it
once, and fix what looks wrong: arrow starts and ends must be chemically readable.
