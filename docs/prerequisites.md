# What this unit assumes: thirteen ideas

The unit (rings, NMR, acids and bases, organometallics, substitution and elimination) reasons from thirteen ideas taught in general chemistry and in the first third of Organic I. A student who holds them can work most of the unit out. A student who lacks one will be memorizing that part. The Foundations page (`foundations/`) states each idea, gives a refresher that reteaches it from nothing, and checks it with two short questions. The source is `content/foundations.json`, and the questions are in `content/items/foundations.json`.

## The thirteen

| | Idea | Stated precisely |
|---|---|---|
| A1 | Skeletal structures | Every corner and line end is a carbon with enough hydrogens to make four bonds. Lone pairs are usually not drawn. Formal charge = valence electrons − lone pair electrons − bonds. |
| A2 | Electronegativity | The more electronegative atom of a bond takes the larger share of the electrons and is δ−. Its partner is δ+. Electronegativity rises to the right in a row and up a column. |
| A3 | Electron flow and curved arrows | A nucleophile (Lewis base) gives an electron pair to an electrophile (Lewis acid). An arrow starts at a lone pair or a bond and ends at an atom or a bond. |
| A4 | Stability of charge | A charge is lower in energy when it is shared by resonance, pulled on by induction, on a larger atom, on a more electronegative atom, in an orbital with more s character, or part of an aromatic ring. The more stable the conjugate base, the stronger the acid. |
| A5 | Acid-base equilibria | A proton transfer favours the weaker acid and the weaker base. pKa is logarithmic, and K = 10^(pKa of product acid − pKa of reactant acid). |
| A6 | Free energy and position | ΔG° = −RT ln K. At 25 °C each factor of ten in K is about 1.36 kcal/mol. |
| A7 | Barriers and rate | Intermediates are valleys and transition states are peaks. The highest peak sets the rate, not ΔG. The rate law lists what takes part in the rate-determining step. |
| A8 | Hammond's postulate | A transition state resembles the species nearest to it in energy: product-like in an uphill step, reactant-like in a downhill step. |
| A9 | Shape and strain | sp3 carbon wants 109.5°. Staggered beats eclipsed. A gauche pair of methyl groups costs 0.9 kcal/mol. Crowding costs energy. |
| A10 | Stereochemistry | Wedge toward the viewer, dash away. Four different groups make a chirality centre. Mirror-image stereoisomers are enantiomers, and the others are diastereomers. |
| A11 | Orbital alignment | Bonds form where a filled orbital overlaps an empty one: attack from the back of a C-LG bond, H and LG anti-periplanar for a one-step elimination, and a flat sp2 carbocation open on both faces. |
| A12 | Carbocations | Tertiary is more stable than secondary, then primary, then methyl. Allylic and benzylic cations are stabilized by resonance. A cation rearranges by a 1,2 shift if that gives a more stable cation. |
| A13 | Solvation | Polar protic solvents (O-H or N-H) stabilize ions by hydrogen bonding, anions most. Polar aprotic solvents leave anions bare. |

## Which topic leans on which idea

● means the topic cannot be done without the idea. ○ means it is used in passing.

| Topic (lecture) | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | A9 | A10 | A11 | A12 | A13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Rings and strain (10/20, 10/27) | ● | | | | | ● | | | ● | | | | |
| Chairs (10/20, 10/27) | ● | | | | | ● | | | ● | ● | | | |
| NMR (10/22) | ● | ● | | | | | | | | ○ | | | |
| Acids and bases (10/29) | ● | ● | ● | ● | ● | ○ | | | | | | | ○ |
| Organometallics (10/29, 11/03) | ○ | ● | ● | ● | ● | | | | | | | | |
| SN2 (11/03, 11/05, 11/10) | ● | ● | ● | ● | | | ● | | ● | ● | ● | | ● |
| SN1 (11/10) | ● | | ● | ● | | | ● | ● | | ● | ● | ● | ● |
| E1 (11/10) | ● | | ● | ○ | | | ● | ● | | | ● | ● | ● |
| E2 (11/12) | ● | | ● | | ● | | ● | ○ | ● | ● | ● | | ○ |
| Choosing a mechanism (flowchart) | ○ | ● | ● | ● | ● | | ● | ● | ● | | ● | ● | ● |
| Rearrangements (11/10) | ● | | ● | ● | | | | ● | | | | ● | |

Reading the table by column shows what a gap costs. A student missing A1 or A3 is exposed in nearly every topic. A student missing A12 loses SN1, E1, rearrangements and half of the flowchart, but can still do the first half of the unit.

The table is a judgement made from the lecture transcription. It has not been tested against student results.

## The diagnostic

Twenty-six questions, two per idea, each answerable in under a minute. They test the prerequisite itself and not this unit's new material. All are marked by the page (circle one, a number, a ranking, or sorting into bins). None needs drawing.

| Question | Idea | What it asks | What a wrong answer reveals |
|---|---|---|---|
| 001 | A1 | Count the hydrogens of cyclohexene from its skeletal drawing | 12: every carbon treated as CH2, the double bond not counted |
| 002 | A1 | Formal charge of an oxygen with three bonds and one lone pair | 0 or −1: the charge is recalled from familiar cases, not counted. +2: bonds counted twice |
| 003 | A2 | Most polar of C-F, C-Br, C-H, C-N | C-Br: polarity confused with leaving group ability |
| 004 | A2 | Sort five carbons as δ+ or δ− | Carbon bonded to Li or Mg sorted as δ+: metals not seen as less electronegative than carbon |
| 005 | A3 | Describe the arrow for hydroxide attacking bromomethane | Arrow from carbon: arrows read as atoms moving. Arrow from the minus sign: charge read as the electrons |
| 006 | A3 | Sort five species as nucleophile or electrophile | NH3 or CH3Br misplaced: a full charge believed necessary |
| 007 | A4 | Why acetic acid is stronger than ethanol | "Weaker O-H bond": looking at the acid, not the conjugate base. "Larger ion": size rule misapplied |
| 008 | A4 | Rank the halide ions by stability | Fluoride first: electronegativity used down a column |
| 009 | A5 | Exponent of K for ethyne plus amide | −13: subtraction reversed. 25 or 38: no method |
| 010 | A5 | Direction and size of acetic acid plus methoxide | "Left, the stronger acid is favoured": rule reversed. "K about 11.5": the log scale missed |
| 011 | A6 | Energy gap for K = 100 at 25 °C | 136 or 1.36: the relation treated as linear, or one factor of ten counted |
| 012 | A6 | Mixture when ΔG° = +1.36 kcal/mol | "No B at all": positive ΔG read as no reaction. "10 to 1 B": sign error |
| 013 | A7 | Rate-determining step from a two-step diagram | "Step 2, it forms the product", or "fast because downhill": rate confused with ΔG |
| 014 | A7 | Effect of doubling a reagent that enters after the slow step | "Doubles": rate law read from the overall equation |
| 015 | A8 | What the transition state of an uphill step looks like | "Halfway" or "like the reactant": Hammond's postulate not known |
| 016 | A8 | Which of two intermediates forms faster | "The less stable one, it is more reactive": forming and reacting onward confused |
| 017 | A9 | Lowest-energy butane conformation from three Newman projections | Gauche chosen: staggered known, steric strain not. Eclipsed chosen: Newman projections not readable |
| 018 | A9 | Cost of two gauche interactions | Not 1.8: the 0.9 value not known, or costs not added |
| 019 | A10 | Relationship of (2R,3R) and (2R,3S) | "Enantiomers": any pair of stereoisomers called enantiomers |
| 020 | A10 | Sort four compounds as chiral or achiral | 3-chloropentane called chiral: only the first atom of each group compared |
| 021 | A11 | Shape of a carbocation carbon | "sp3": geometry not tied to the number of groups. "Lone pair in the p orbital": cation and anion confused |
| 022 | A11 | Which back group is anti-periplanar to Br in a Newman projection | CH3 or H: anti and gauche confused. Front hydrogens: the term not known |
| 023 | A12 | Rank four carbocations | Reversed: crowding argument used where the issue is electrons |
| 024 | A12 | Allyl against propyl cation | "Equal, both primary": resonance not considered |
| 025 | A13 | Sort five solvents as protic or aprotic | Acetone or DMSO called protic: "has O and has H" used in place of "H on O or N" |
| 026 | A13 | Which ion methanol hydrogen bonds to most tightly | Iodide: bigger assumed better solvated. Sodium: hydrogen bonds thought to go to cations |

Question ids are `foundations-001` to `foundations-026`. Each carries an extra field, `"axiom"`, and each idea lists its two questions under `"check"`.

## How to use the result

- Two right on an idea: move on.
- One right: read the refresher, then try the missed question again on another day. The guide brings it back.
- None right: read the refresher before the readings that lean on that idea (the filled circles in its column above). Starting those readings without it means memorizing them.

Two questions per idea is a screen, not a measurement. A lucky guess passes and a slip fails. The cost of a false alarm is five minutes with a refresher, so the check leans toward sending people to read.

## Limits

- The choice of these thirteen is a judgement made from the lecture notes and the one past exam. It was not derived from student errors.
- Values follow the lecture where the lecture differs from the usual tables (see "Lecture values that differ" in `docs/dev/LECTURES.md`). The diagnostic avoids those cases, except that it uses the lecture's pKa for HF (4) in one worked solution.
- The electronegativity values quoted (F 4.0, O 3.5, N 3.0, Cl 3.0, Br 2.8, C 2.5, H 2.1, Mg 1.2, Li 1.0) are the rounded Pauling values common in textbooks. The course textbook's own table was not checked.
- The aromaticity part of A4 is stated but has no diagnostic question, and the lecture notes for this unit do not use it.
