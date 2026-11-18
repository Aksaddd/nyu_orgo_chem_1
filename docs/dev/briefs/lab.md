# Brief: the Molecule Lab and the 3D viewer

OWN: assets/view3d.js, assets/lab.css, lab/page.js
READ: docs/dev/ARCHITECTURE.md (sections "The global", "view3d.js, energy.js, newman.js", "chair.js", "The UI kit");
assets/core.js; content/conf.json; content/tables/pka.json, avalues.json, rates.json; docs/dev/LECTURES.md (only the
sections "The decision flowchart" and "L1020"). The chair, Newman and energy modules already exist: call
`ORGO.chair.lab(el, {subs})`, `ORGO.newman.lab(el)`, `ORGO.energy.lab(el, preset)`, `ORGO.energy.svg(spec)`,
`ORGO.chair.svg`, `ORGO.mol.svg(key)`; do not read their source, feature-detect them.

## assets/view3d.js → ORGO.view3d
- `mount(el, name | {a, b}, {spin, labels})`: a ball-and-stick model drawn on a canvas. Data: after
  `ORGO.need("conf")`, `ORGO.data.conf[name]` = `{a: [[element, x, y, z]], b: [[i, j, order]], title}` (ångströms,
  centred). Perspective projection, atoms and bonds sorted by depth, simple shading. Element colours with dark
  outlines so they read on light and dark pages: C charcoal, H near white, O red, N blue, S yellow, F and Cl green,
  Br brown, I purple, Li and Mg gray-violet; radii by element. Drag to turn (pointer events, touch included), wheel or
  pinch to zoom, arrow keys turn it and plus and minus zoom when the canvas has focus (it is focusable, role "img",
  with an aria-label naming the molecule and one line of help under it). A Reset button; a "Labels" toggle that prints
  element letters on the heavy atoms; `spin` turns it slowly, never when `ORGO.reduced`. Handles device pixel ratio
  and resizes with its container.
- Token handler `view3d` (`[[view3d:name]]`) → a mounted viewer of a sensible fixed height.
- `flip(el)`: cyclohexane's ring flip, computed, not stored. Put the six carbons at angles 60°·i on a circle of radius
  1.45 Å with heights z_i(t) = h·[(−1)^i·cos(πt) + 0.9·sin(πt)·cos(2πi/3 + π/6)], h = 0.25 Å, for t from 0 (one
  chair) through the half-chair and twist-boat (t = 0.5) to 1 (the other chair). Give every carbon two hydrogens from
  its two ring neighbours: with unit vectors u1, u2 toward the neighbours, b = −unit(u1 + u2) and n = unit(u1 × u2),
  the hydrogens sit at c + 1.09·(cos 54.75°·b ± sin 54.75°·n). Colour the six hydrogens that are axial at t = 0 one
  colour and the other six another (plus the letters a and e that swap at the end), so the student watches axial
  become equatorial. A slider (keyboard operable) scrubs t; a Play button runs it once (not when `ORGO.reduced`);
  a caption names the stage (chair, half-chair, twist-boat, chair) and says the barrier is about 10 to 11 kcal/mol.

## lab/page.js
One page with a row of tools (`ORGO.ui.tabs`, the tab id kept in the URL hash). Each tool starts with one or two
sentences saying what to try and what to notice, and, where it fits, the line "Build this one with your model kit:
it is allowed on the exam."
1. **Chair lab**: `ORGO.chair.lab`.
2. **Ring flip in 3D**: `ORGO.view3d.flip`.
3. **Rings and strain**: for the five cycloalkanes in `tables.rates.strain.rows`: a 3D model (names cyclopropane,
   cyclobutane, cyclopentane, cyclohexane-chair from conf), the flat-ring angle, the number of eclipsing C-H pairs,
   the heat of formation and the heat of formation per CH2, with a bar chart of the per-CH2 values against the
   strain-free line at −4.9 kcal/mol, and the note for each ring.
4. **Newman projections**: `ORGO.newman.lab`.
5. **pKa ladder**: `tables.pka.rows` as a vertical ladder, strongest acid at the top; each rung shows the formula
   (`ORGO.formula`), the pKa, and a small tag (lecture, exam, literature). Pressing a rung shows the conjugate base,
   the `why`, and the `lit` note when there is one. Below it an equilibrium checker: choose an acid and a base (the
   conjugate base of any rung); it says which side is favoured and K as a power of ten, in a sentence. A "hide the
   numbers" switch turns the ladder into a self-test: type a value, press Check, see the accepted range.
6. **Energy diagrams**: `ORGO.energy.lab` with a preset chooser: SN2 (one step), SN1 (three steps with water), E2,
   E1, and the two solvent cases from the 11/05 lecture (a more polar solvent lowering the transition state more than
   the starting materials, and lowering the starting materials more than the transition state).
7. **Which mechanism**: the handout's flow chart as a guided chooser. The student picks the carbon (methyl, primary,
   secondary, tertiary), the reagent (strong bulky base; strong base that is not bulky; weak base that is a good
   nucleophile; weak base and poor nucleophile such as the solvent), the solvent (polar protic, polar aprotic) and the
   temperature (lower, higher). Show the path taken through the chart, the predicted mechanism or mixture, and the
   reasons in sentences, with the handout's caution that the chart is a guide with exceptions.
8. **Rates at a glance**: three small charts from `tables.rates`: nucleophilicity (log scale), SN2 rate by substrate
   (log scale, zero shown as "no reaction"), and Saytzeff against Hofmann for the four leaving groups (stacked bars).
9. **Models**: every entry of `ORGO.data.confList` as a card that opens its 3D model with its note.

Charts: plain SVG or HTML bars, every bar labelled with its value directly, one accent colour, a short title that
states the point, and a `<table>` of the same numbers under a "Show the numbers" expander. No colour-only meaning.

## assets/lab.css
Styles for the lab and the viewer (tokens and UI-kit classes only).

CHECK: one Playwright script, failing on any console error or pageerror (ignore the missing ../../shared/platform.js):
open file:///home/user/nyu_orgo_chem_1/lab/index.html, visit every tool, drag the 3D model, move the flip slider end to
end, press two rungs of the ladder and run the equilibrium checker, walk two paths of the mechanism chooser. Save TWO
screenshots (the ring flip at t = 0.5, and the pKa ladder) at 1100x850, look at each once, and fix what is wrong.
