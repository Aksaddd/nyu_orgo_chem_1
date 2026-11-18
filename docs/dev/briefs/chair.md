# Brief: cyclohexane chairs, Newman projections, energy diagrams

OWN: assets/chair.js, assets/chair.css, assets/newman.js, assets/energy.js, tools/test/chair.test.js
READ: docs/dev/ARCHITECTURE.md (sections "The global", "chair.js", "view3d.js, energy.js, newman.js", "The UI kit");
docs/dev/CONTENT-SPEC.md (the token table, "Cyclohexane substituents", "Newman", "Energy diagram", and the `chair`
item kind); assets/core.js; content/tables/avalues.json.

## The model (get this exactly right)
Substituents are `{c: 1..6, face: "u" | "d", g}`. Up and down never change. In **form A** the axial bond of carbons
1, 3, 5 points up and of carbons 2, 4, 6 points down; so in form A an up group on an odd carbon is axial, an up group
on an even carbon is equatorial, a down group on an odd carbon is equatorial, a down group on an even carbon is axial.
**Form B** (the ring flip) is the reverse.
- `cisTrans` for exactly two substituents on different carbons: same face = cis, else trans; otherwise null.
- Cost of a form (kcal/mol, approximate, say so in the UI) = sum of the A-values of its axial groups (table
  `ORGO.data.tables.avalues.rows`, by `g`; unknown group: 1.7) + 0.9 for each pair of groups on neighbouring carbons
  that are gauche (both equatorial, or one axial and one equatorial; two axial neighbours are anti: 0) + 3.7 for each
  pair of axial groups on carbons i and i+2 (same side, 1,3-diaxial). `stable` is the cheaper form, or "equal" when
  the costs differ by less than 0.005.
- `relation` of the two chairs, by symmetry. Use carbon index i = c − 1 (0..5) and twelve slots `ax[i]`, `eq[i]` holding
  a group or "H". The symmetry operations of a chair all keep axial as axial and equatorial as equatorial and permute
  carbons: six rotations (i → i + 2k for k = 0, 1, 2; and i → c − i for c = 1, 3, 5) and six reflection-type
  operations (i → i + 2k + 1 for k = 0, 1, 2; and i → c − i for c = 0, 2, 4), all mod 6. To compare, first bring form B
  into form A's frame by renumbering i → i + 1 (a 60° turn about the ring axis; slots keep their axial/equatorial
  kind). Then: if some rotation maps A's twelve slots onto B's → "same"; else if some reflection-type operation does →
  "enantiomers"; else "diastereomers".
- `chiral`: the flat molecule (faces on a hexagon) is achiral exactly when some operation maps the set of
  (carbon, face, group) to itself among: i → c − i with faces kept (c = 0..5), or i → i + k with faces swapped
  (k = 0..5). Otherwise chiral.
- `e2(subs, lgCarbon)`: the leaving group must be axial: `reactiveForm` is the form where it is. A neighbouring carbon
  (lg ± 1) has an anti-periplanar hydrogen exactly when its axial position (in that form) holds H, that is, no
  substituent sits on that carbon's axial face. `antiH` lists those carbons. `products` lists, for each, the alkene
  (`{between: [lg, n], zaitsev: bool}`: Zaitsev means the more substituted double bond: the neighbour carries a
  substituent) with the major one first (Zaitsev when it is available, otherwise the only one). `steps` explains in
  sentences. If the reactive form is the expensive one say that the reaction is slow because it must go through a
  scarcely populated chair; if there is no anti hydrogen in either form say E2 cannot happen in a chair.
- `analyze(subs).steps`: sentences a tutor would say, in order: faces → cis/trans; where each group sits in form A and
  form B; cost of each with the numbers; which is more stable and why; the relationship and why.

Required unit tests (tools/test/chair.test.js, plain node, loading core.js and chair.js in a vm with stubs and the
A-value table registered):
| subs | cisTrans | stable | relation | chiral |
|---|---|---|---|---|
| `1u:CH3,2u:CH3` | cis | equal | enantiomers | false |
| `1u:CH3,2d:CH3` | trans | B (both equatorial) | diastereomers | true |
| `1u:CH3,3u:CH3` | cis | B (both equatorial) | diastereomers | false |
| `1u:CH3,3d:CH3` | trans | equal | same | true |
| `1u:CH3,4u:CH3` | cis | equal | same | false |
| `1u:CH3,4d:CH3` | trans | B | diastereomers | false |
| `1u:CH3` | null | B | diastereomers | false |
| `1u:CH3,2u:CH2CH3` | cis | A (ethyl equatorial) | diastereomers | true |
| `1d:CH3,4u:CH(CH3)2` | trans | A (both equatorial) | diastereomers | false |
| (none) | null | equal | same | false |
| `1u:CH3,1d:CH3` | null | equal | same | false |
E2 tests: `e2("1u:Cl,2d:CH3", 1)`: reactiveForm A, antiH [6] only, one product between 1 and 6, not Zaitsev.
`e2("1u:Cl,2u:CH3", 1)`: reactiveForm A, antiH [2, 6], major product between 1 and 2 (Zaitsev).
`e2("1u:Cl,2d:Cl,3u:Cl,4d:Cl,5u:Cl,6d:Cl", 1)`: no anti hydrogen in either form.
`e2("1u:Br,4u:C(CH3)3", 1)` (cis): reactive form has Br axial and tert-butyl equatorial (the cheap form): fast.
`e2("1u:Br,4d:C(CH3)3", 1)` (trans): Br axial forces tert-butyl axial: the expensive form: slow.

## Drawings
- `svg(subs, form, {num, H, highlight, labels})`: a textbook chair. Use two fixed sets of six ring points (form A, and
  form B as its mirror image), e.g. for A: (20,62) (60,82) (116,66) (170,86) (130,66)... choose points so that opposite
  ring bonds are parallel and it looks like the chairs in a textbook; check it by eye. Axial bonds are vertical,
  alternating up and down. Each equatorial bond is parallel to the ring bond one bond away and points outward,
  slightly up or down opposite to that carbon's axial bond. Substituent labels sit at the bond ends, with subscripts
  (tspans). Hydrogens are drawn only with `H`, or as a short stub when the other position on that carbon is
  substituted. Axial and equatorial bonds use `var(--ax)` and `var(--eq)`; with `labels` add small letters a and e.
  `num` numbers the carbons. role="img" with an aria-label that says where each group is.
- `ring(subs, {num})`: a flat hexagon, carbon 1 at the top, numbered clockwise; an up group on a solid wedge, a down
  group on a hashed wedge, pointing outward; two groups on one carbon fan apart.
- Register token handlers: `ring` (arg `SUBS` or `SUBS|num`), `chair` (arg `SUBS|A` or `SUBS|B`, plus `num`, `H`, `labels`).

## Interactive
- `lab(el, {subs})`: pick a group from a palette, press a position on the flat ring (carbon and face) to add or remove
  it; the two chairs are shown side by side with "Flip the ring" (animated morph between the two drawings; no animation
  when `ORGO.reduced`); under them: which groups are axial, the cost of each form, the verdict (cis/trans, more stable,
  relationship, chiral or not) and the `steps`. Toggles: all hydrogens, numbers. A line reminding the student that the
  model kit is allowed on the exam and to build this one.
- `ask(el, item, onDone)` for chair items (`{subs, given: "ring" | "chairA" | "chairB", ask: [...], lg}`). Show the given
  drawing, then one task at a time: "cis-trans" (cis or trans); "flip" and "stable": the student first places each
  group on the other chair (for each substituent choose axial or equatorial), then picks the more stable chair or
  "equal in energy" (when `given` is a chair, also "Is the chair shown the more stable one?"); "relationship" (same,
  enantiomers, diastereomers); "e2" (press the carbons whose hydrogen can leave, or "none", then pick the major alkene
  from small drawings). Each task: answer, then right or not quite with the reason from `steps`. At the end show both
  chairs and all the steps. `onDone({score})`: the fraction of tasks right on the first try.
- `make(kind, seed)`: a fresh random item object (same shape as a content chair item, with `id` "gen:" + kind + ":" +
  seed, `type`, `stem`, `solution` built from `steps`) for kind "chair-read" (given a chair; ask cis-trans and stable),
  "chair-both" (given the ring; ask stable and relationship), "e2-ring-product" (ring with Cl, Br or OTs on carbon 1 and
  one other group on carbon 2, 3 or 4; ask e2). Seeded pseudo-random numbers, no Math.random. Use the groups in the
  A-value table; avoid pairs whose costs differ by less than 0.3 unless they are exactly equal.

## newman.js → ORGO.newman
`svg("F1,F2,F3|B1,B2,B3|angle")`: front groups clockwise from the top; the back carbon as a circle with its groups
turned by `angle` degrees (0 eclipsed, drawn with a small offset so both bonds are visible; 60 staggered). Token
handler `newman`. `lab(el)`: butane looking down C2-C3 with a slider for the dihedral angle and an energy curve
(anti 0, gauche 0.9, H/CH3 eclipsed about 3.4, CH3/CH3 eclipsed about 5 kcal/mol), the current point marked, the
conformation named. Keyboard operable.

## energy.js → ORGO.energy
`svg(spec)` for `R=0,TS1=22,I=12,TS2=15,P=-6|I=carbocation,TS1=rate-determining`: a smooth curve through the points,
peaks at names starting TS, labelled points, axes "energy" and "reaction coordinate"; options `{ea: true, dh: true}`
draw Ea and ΔH arrows. Token handler `energy`. `lab(el, preset)`: sliders for the levels, a second curve to compare
(used to show a solvent stabilizing the transition state more or less than the starting materials), Ea and ΔH read out.
`make(seed)`: a fresh mcq item (type "energy-diagrams") of the form "Which diagram shows an exothermic SN1 reaction?"
with four `[[energy:…]]` choices that differ in the number of steps, which barrier is highest, and uphill or downhill,
each with a `why`, plus `solution` steps. Cover SN1, SN2, E1, E2, exothermic and endothermic.

CHECK: `node tools/test/chair.test.js` (every row above), then one Playwright script that writes a small HTML test page
into /tmp, loads assets/orgo.css, chair.css, core.js, data/index.js, chair.js, newman.js, energy.js by file:// URL,
renders six chairs (both forms), three rings, two Newman projections, two energy diagrams and one `lab`, fails on any
console error, and saves ONE screenshot at 1200x900. Look at it once and fix what is wrong. The chair must look like a
textbook chair and labels must not collide.
