# FA24 Exam 2, answer key

Midterm #2, UA 225 Organic I, 11-22-24. Nine questions of 100 points; students choose seven (questions 1 to 7 are
graded if none is crossed out); 110 minutes; pen only; no notes; the chemistry model set is allowed. Structures were
read from the PDF at high zoom and are given as SMILES. This key was worked independently more than once and the
results agree; computed checks (formulas, E2 geometry) are noted. Authors expand each part into a full worked solution.

## Question 1 (100)

**A (15). Approximate pKa.** Phenol `Oc1ccccc1`: **10**. Pentane `CCCCC`: **about 50** (lecture: alkane 50 to 60).
Ethanol `CCO`: **16**. Propyne `CC#C`: **25** (the H on the triple-bond carbon). Diethylamine `CCNCC`: **38** (the
N-H; lecture RNH₂ 38; literature about 36).
- The trap: diethylamine's *conjugate acid* (the ammonium ion) is about 11. The question shows the neutral amine, so
  the acid is the N-H: about 38. Likewise for propyne the acidic H is the alkyne C-H, not the CH₃ hydrogens.
- Reasoning to show: phenol is far below an alcohol (16) because the phenoxide charge is delocalized into the ring
  (resonance). Alkyne C-H 25: sp carbon, 50% s character. Alkane 50 to 60: sp³ carbon, no stabilization.

**B (15). t-Butyl chloride in water gives t-butyl alcohol (major) and 2-methylpropene (minor). How does the alkene
form?** **D: E1 mechanism with H₂O acting as the base.** Tertiary halide in a polar protic solvent ionizes to the
carbocation (shared with the SN1 product); there is no hydroxide in the flask (water is the only base present), so A
and C are out; E2 needs a strong base, so B is out.

**C (15). Stronger nucleophile.** (i) I⁻ or Cl⁻: **I⁻** (same column: nucleophilicity increases down; lecture table
80,000 vs 1,000). (ii) HS⁻ or HO⁻: **HS⁻** (same column, lower; 126,000 vs 16,000). (iii) (CH₃)₃CO⁻ or CH₃O⁻:
**CH₃O⁻** (same atom and charge: the bulky one is the poorer nucleophile, although it is the stronger base).

**D (55). PhMgBr, 1) CO₂, 2) H⁺/H₂O → benzoic acid: mechanism.**
1. Nucleophilic attack: the electrons of the C-Mg bond (the Grignard behaves as Ph:⁻ ⁺MgBr) attack the carbon of
   O=C=O (electron-poor: two electronegative oxygens); the electrons of one C=O π bond move onto that oxygen.
   Intermediate: benzoate, PhCO₂⁻ ⁺MgBr.
2. Proton transfer in the acid workup: a lone pair on O⁻ takes H from H₃O⁺; the H-O electrons stay on water's oxygen.
   Product: benzoic acid `OC(=O)c1ccccc1` + H₂O.
- Four arrows in total. Rubric: correct nucleophile/electrophile and first arrow (20), π electrons to O (10),
  carboxylate intermediate with charges (10), protonation arrows (10), product (5).
- Mistakes: attacking oxygen of CO₂; arrow starting from Mg or from carbon's "minus sign" drawn on the wrong atom;
  adding acid in step 1 (it would destroy the Grignard: R:⁻ + H⁺ → R-H); forgetting the workup.

## Question 2 (100)

**A (30). Circle the faster reaction of each pair (10 each).**
1. 1-Bromobutane `CCCCBr` + CH₃ONa in CH₃OH, 25 °C, versus 1-bromobutane in CH₃OH alone, 25 °C (both → butyl methyl
   ether `CCCCOC`). **Faster: with CH₃O⁻.** Primary halide → SN2, rate = k[RBr][Nu]; methoxide is a far better
   nucleophile than neutral methanol (anion versus its conjugate acid).
2. (S)-2-Chloropentane `CCC[C@H](C)Cl` + sodium acetate, DMSO, 40 °C, versus the same carbon skeleton with OTs
   `CCC[C@H](C)OS(=O)(=O)c1ccc(C)cc1` + sodium acetate, DMSO, 40 °C (both → inverted 2-pentyl acetate).
   **Faster: the tosylate.** Same nucleophile, substrate carbon and solvent; the leaving group differs, and tosylate
   (resonance-stabilized sulfonate) is the better leaving group.
3. 1-Iodocyclohexene `IC1=CCCCC1` + NaSH, DMF, versus chlorocyclohexane `ClC1CCCCC1` + NaSH, DMF.
   **Faster: chlorocyclohexane.** The iodide is on an sp² (vinyl) carbon: no SN2 (and no SN1) at a vinyl carbon, so a
   better leaving group does not help (lecture: vinyl-LG rate 0).

**B (70). 2-Iodo-2-phenylpropane `CC(C)(I)c1ccccc1`: with NaH → Product A; with H₂O → Product A (same major product).
Mechanisms, and what does a small septet in the crude ¹H NMR of the NaH reaction mean?**
- Product A = 2-phenylpropene (α-methylstyrene) `C=C(C)c1ccccc1`.
- **NaH: E2, one step.** Hydride (a strong base, H:⁻) takes a hydrogen from one CH₃; the C-H electrons form the C=C
  π bond; iodide leaves. Three arrows. Products: A + H₂ + Na⁺ I⁻. (Tertiary: SN2 impossible; strong base: E2.)
- **H₂O: E1, two steps.** (1) The C-I bond ionizes: tertiary and benzylic carbocation (stabilized by three alkyl/aryl
  groups and by resonance with the ring) + I⁻; rate-determining. (2) Water (a weak base) takes a hydrogen from a CH₃;
  the C-H electrons form the C=C. Products: A + H₃O⁺ + I⁻. (The SN1 alcohol, 2-phenylpropan-2-ol, is the competing
  product; the question says the alkene is major: it is conjugated with the ring.)
- **The septet.** Seven lines = a hydrogen with six equivalent neighbours (n + 1 = 7): the CH of an isopropyl group,
  (CH₃)₂CH-. So the crude NaH product contains a little isopropylbenzene (cumene) `CC(C)c1ccccc1`: some hydride acted
  as a nucleophile and replaced iodide with H (substitution) instead of acting as a base. Water has no hydride, so
  that by-product cannot form there.
- Rubric: E2 mechanism with three correct arrows (25); E1 with carbocation intermediate and both steps (25);
  product A (5); septet = isopropyl CH with six neighbours (8); inference: H⁻ as nucleophile → cumene, minor (7).

## Question 3 (100)

**A (25). Which are NOT characteristics of SN1? Circle all that apply.** **A, C and D.**
A (inversion): false for SN1, which racemizes through a planar carbocation (inversion is SN2). B (rate proportional
to [substrate]): true, rate = k[substrate]. C (rate proportional to [nucleophile]): false, the nucleophile enters
after the rate-determining step. D (rate independent of solvent): false, more polar protic solvents speed ionization.

**B (25). Which diagram is an exothermic SN1?** **Diagram 1**: two humps with a valley between (the carbocation), the
first hump the higher one (ionization is rate-determining), products below reactants. Diagram 2 is two-step but ends
higher than it starts (endothermic). Diagrams 3 and 4 have one hump (concerted: SN2 or E2), exothermic and endothermic.

**C (25). Fastest SN2 with NaCN?** **A, methyl iodide.** Least hindered: methyl > primary > secondary >>> tertiary.

**D (25). trans-1-Chloro-2-methylcyclohexane (Cl wedge, CH₃ dash) + NaOMe/MeOH: major elimination product?**
**Product 2: 3-methylcyclohexene with the CH₃ still on a dash.** As a chair question: `1u:Cl,2d:CH3`, leaving group on
C1. E2 needs Cl axial with an axial H on a neighbouring carbon (trans-diaxial). In the chair with Cl axial, the trans
CH₃ is also axial, so the H on C2 is equatorial and cannot leave; only C6 has an axial H anti to Cl. The double bond
forms C1=C6, away from the methyl: the less substituted alkene, not Zaitsev's 1-methylcyclohexene (choice 1). The
methyl-bearing carbon is untouched, so its dash stays (choice 3 has it inverted). Choice 4 is substitution.

## Question 4 (100)

**A (50). Five chairs: cis or trans; most stable conformation?; if not, draw it (10 each).**

| # | Groups (as read) | `subs`, drawn form | cis/trans | Most stable as drawn? | If not |
|---|---|---|---|---|---|
| 1 | NH₂ equatorial, OCH₃ equatorial, neighbours | `1u:NH2,2d:OCH3`, form B | **trans** | **yes** (both equatorial) | |
| 2 | OH equatorial, CH(CH₃)₂ axial, neighbours | `1d:OH,2d:CH(CH3)2`, form A | **cis** | **no** | flip: isopropyl equatorial, OH axial |
| 3 | I axial, CH₂CH₃ equatorial, 1,4 | `1u:I,4u:CH2CH3`, form A | **cis** | **yes** (the larger group, ethyl, is equatorial) | |
| 4 | NH₂ equatorial, Br equatorial, neighbours | `1d:NH2,2u:Br`, form A | **trans** | **yes** | |
| 5 | COOH axial, Br equatorial, neighbours | `1u:COOH,2u:Br`, form A | **cis** | **no** | flip: COOH equatorial, Br axial |

Method: decide axial or equatorial for each group, then up or down (at a carbon whose axial bond points up, the
equatorial bond is the "down" one, and the reverse). Same face = cis, opposite faces = trans. Two equatorial groups on
neighbouring carbons are trans (the classic trap: they both point "sideways"). A cis-1,2 or cis-1,4 pair always has one
axial and one equatorial group: put the larger one equatorial.

**B (50). 2-(1-Chloroethyl)oxirane `CC(Cl)C1CO1` + CH₃O⁻ in CH₃OH → `CC1OC1COC`. Mechanism.**
Analyze the product first: OCH₃ is on the end CH₂ (the old epoxide CH₂); the new epoxide joins the old C-Cl carbon
and the old epoxide CH; chlorine is gone. So methoxide did not displace chloride directly.
1. SN2 on the epoxide: methoxide attacks the less hindered ring carbon (CH₂); the C-O ring bond breaks onto oxygen
   (ring strain makes the alkoxide leave). Intermediate alkoxide `CC(Cl)C([O-])COC`.
2. Intramolecular SN2: the alkoxide oxygen attacks the neighbouring carbon that carries Cl from the back; chloride
   leaves; a new three-membered ring closes. Product + Cl⁻.
- Rubric: product analysis / correct site of first attack (15), step 1 arrows (10), alkoxide intermediate (5), step 2
  arrows (15), product and Cl⁻ (5). Wrong path: direct SN2 at C-Cl gives the isomer `CC(OC)C1CO1`, not the product.

## Question 5 (100)

**A (80). (CH₃)₃CO⁻ + CH₃I gives tert-butyl methyl ether; CH₃O⁻ + (CH₃)₃C-I gives no ether. Why?**
- Works: SN2. tert-Butoxide attacks the methyl carbon of CH₃-I from the back; iodide leaves. A methyl carbon is
  unhindered and has no β hydrogen, so elimination is impossible. Product `CC(C)(C)OC`.
- Fails: the electrophile is tertiary. Backside attack is blocked by three methyl groups: no SN2. Methoxide is a strong
  base, so it removes a β hydrogen instead: E2 (three arrows: O lone pair to H, C-H to C=C, C-I to I).
  Products: 2-methylpropene `CC(C)=C` + CH₃OH + I⁻. No ether.
- Lesson (Williamson ether synthesis): choose the pair in which the halide is methyl or primary; put the bulky group
  in the alkoxide.
- Rubric: SN2 mechanism for the good route (20); tertiary cannot do SN2, sterics (15); methoxide is a strong base (10);
  E2 mechanism (25); alkene, methanol, iodide as the actual products (10).

**B (20). The drawn isomer of 1,2,3,4,5,6-hexachlorocyclohexane (every Cl equatorial, all trans:
`1u:Cl,2d:Cl,3u:Cl,4d:Cl,5u:Cl,6d:Cl`, form B) undergoes E2 7000 times more slowly than any stereoisomer. Why?**
E2 needs an H and the leaving group anti-periplanar: on a cyclohexane, trans-diaxial on neighbouring carbons. Here
every Cl is equatorial and every H is axial: no Cl has an anti H. Flipping the ring makes all six Cl axial (very
strained, hardly populated), and then every H is equatorial, so there is still no H anti to a Cl: each Cl's neighbours
carry their Cl trans to it, which puts their H cis to it. Every other stereoisomer has at least one pair of
neighbouring Cl that are cis, which gives a chair with an axial Cl next to an axial H, and E2 is fast.

## Question 6 (100)

**A (50). Cyclohexyl methyl ether `COC1CCCCC1`: from bromocyclohexane + CH₃O⁻ Na⁺ in CH₃OH (left), or from sodium
cyclohexanolate `[O-]C1CCCCC1` + CH₃Br in DMSO (right)?** **Circle the right-hand reactant.** CH₃Br can only undergo
SN2 (unhindered, no β hydrogen: elimination impossible), and DMSO, polar aprotic, leaves the alkoxide unsolvated and
very nucleophilic: clean, 99%. On the left a secondary halide meets a strong base: E2 to cyclohexene competes with SN2
(and wins), so a mixture results.

**B (50). 1,2-Diiodoethane `ICCI` + ethane-1,2-dithiolate `[S-]CC[S-]` → C₄H₈S₂ + C₆H₁₂S₂I₂.**
C₄H₈S₂ = **1,4-dithiane** `C1CSCCS1`: one dithiolate and one diiodide, two SN2 reactions, the second intramolecular,
closing a six-membered ring. C₆H₁₂S₂I₂ = **I-CH₂CH₂-S-CH₂CH₂-S-CH₂CH₂-I** `ICCSCCSCCI`: each sulfur of one dithiolate
attacks a different diiodoethane. (Formulas confirmed by computation.) Thiolates are excellent nucleophiles and
primary iodides excellent SN2 substrates.

## Question 7 (100)

**A (50). 2-Bromopropane: why different amounts of substitution and elimination with acetate versus ethoxide?**
Secondary halide: SN2 and E2 compete, and the reagent decides. Acetate is a weak base (its conjugate acid has pKa 4)
but a fair nucleophile: it attacks carbon: mostly **SN2** (isopropyl acetate), almost no elimination. Ethoxide is a
strong base (conjugate acid pKa 16): it removes a β hydrogen faster than it can reach the hindered secondary carbon:
mostly **E2** (propene), with a little **SN2** (ethyl isopropyl ether). Stronger base → more elimination. (Not SN1/E1:
both reagents are anionic nucleophiles that react before the secondary halide can ionize.)
Rubric: secondary → both possible (10); acetate weak base, SN2 named (15); ethoxide strong base, E2 named (15);
basicity tied to pKa of the conjugate acids (10).

**B (50). 2,3-Dibromobutane `CC(Br)C(Br)C` + 2 equivalents of base → three products.**
Two E2 eliminations give three C₄H₆ isomers: **2-butyne** `CC#CC`, **1,3-butadiene** `C=CC=C`, **1,2-butadiene**
`C=C=CC`. First E2 gives 2-bromo-2-butene (H from C3) or 3-bromo-1-butene (H from C1); the second E2 removes H-Br
again: 2-bromo-2-butene → 2-butyne (H from C2) or 1,2-butadiene (H from the CH₃ next to C-Br); 3-bromo-1-butene →
1,3-butadiene (H from C4) or 1,2-butadiene.

## Question 8 (100)

For each: draw both chairs, circle the more stable (or say equal), and give the relationship of the two chairs.

| | Molecule | `subs` | Chairs | More stable | Relationship |
|---|---|---|---|---|---|
| i | cis-1-ethyl-2-methylcyclohexane (both wedges) | `1u:CH3,2u:CH2CH3` | CH₃ axial + ethyl equatorial ⇌ CH₃ equatorial + ethyl axial | ethyl equatorial (the larger group; 1.79 vs 1.74 kcal/mol, so only slightly) | **diastereomers** |
| ii | trans-1-isopropyl-4-methylcyclohexane (CH₃ dash, isopropyl wedge) | `1d:CH3,4u:CH(CH3)2` | both equatorial ⇌ both axial | both equatorial | **diastereomers** |
| iii | cis-1,2-dimethylcyclohexane (both wedges) | `1u:CH3,2u:CH3` | one axial, one equatorial in each | **equal in energy** | **enantiomers** (non-superimposable mirror images, as in lecture) |

## Question 9 (100)

**`CC(N)C1(O)CC2C=CCC12` + HONO → `CC1CC2C=CCC2C1=O` (top) + `CC1C(=O)CC2C=CCC12` (bottom). Mechanisms.**
HONO turns the NH₂ into N₂⁺ (given). Both products come from one carbocation:
1. N₂ leaves (arrow from the C-N bond to N): a secondary carbocation next to the carbon that carries OH, which is part
   of a strained four-membered ring.
2. 1,2-alkyl shift with ring expansion: one of the two ring bonds of the C-OH carbon moves to the cationic carbon
   (arrow from that C-C bond to the cation). The four-membered ring becomes five-membered (relief of ring strain), and
   the positive charge lands on the carbon bearing OH, where an oxygen lone pair shares it (C⁺-OH ↔ C=O⁺-H).
   - Migration of the ring CH₂ → after step 3, the top product.
   - Migration of the ring-fusion CH → after step 3, the bottom product.
3. Water removes the O-H proton: the ketone.
- Rubric: diazonium leaves, cation drawn (20); ring-expanding shift with a correct arrow, for each product (25 + 25);
  oxocarbenium/resonance (10); deprotonation to the ketone (20).
- This is the same idea as the 11/10 homework ((1-bromoethyl)cyclobutane in ethanol): a cation next to a strained ring
  expands the ring.
