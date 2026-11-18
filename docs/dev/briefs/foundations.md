# Brief: foundations (what to know beforehand) and the research write-ups

OWN: content/foundations.json, content/items/foundations.json, docs/learning-science.md, docs/prerequisites.md,
docs/backporting.md
READ: docs/dev/CONTENT-SPEC.md (sections "Ground rules", "Formulas", "Pictures in text", "Questions");
docs/dev/LECTURES.md (headings and summaries only, to know what the unit covers); docs/dev/ARCHITECTURE.md (sections
"Scheduling and mastery", "quiz.js", "mech.js", "chair.js": so that you describe truthfully what the guide does);
/home/user/eureka/docs/equations-learning.md (the platform's existing research brief: match its tone and honesty);
/tmp/claude-0/-home-user-nyu-orgo-chem-1/8af09f87-d240-5d08-9b77-410ef91eef2c/scratchpad/research/R1-learning-science.draft.md
(a long research draft with citations: read it in three chunks; it has NOT been fact-checked).

## 1. content/foundations.json
`{"intro": html, "axioms": [{"id": "A1", "title", "statement", "why", "explains": [text], "refresher": html, "check": [item ids]}], "diagnostic": [item ids]}`.
The axioms are the few ideas from general chemistry and the first third of Organic I that this unit reasons from. A
student who holds them can work most of the unit out; a student who lacks one will be memorizing. Write these
thirteen, in this order, each with a precise one or two sentence `statement`, a one-sentence `why`, `explains` (three
to five things in this unit that follow from it, each naming the lecture topic or exam question), and a `refresher`
(150 to 250 words that reteach it from nothing, with at least one figure token):
A1 a skeletal structure carries hidden hydrogens, lone pairs and formal charges; A2 electronegativity makes bonds
polar and atoms electron rich or poor; A3 electrons flow from rich to poor, and a curved arrow starts at a lone pair
or a bond and ends at an atom or a bond (nucleophile = Lewis base, electrophile = Lewis acid); A4 charge that is
spread out, or sits on an atom that can bear it, is lower in energy (resonance, induction, size, hybridization,
electronegativity, aromaticity); A5 acid-base equilibria run toward the weaker acid and the weaker base, pKa is a
logarithmic scale, and K is ten to the difference in pKa; A6 free energy sets position: ΔG = −RT ln K, about 1.36
kcal/mol for each factor of ten at 25 °C; A7 the rate is set by the highest barrier, not by ΔG: intermediates are
valleys, transition states are peaks, and the rate law lists what is in the rate-determining step; A8 a transition
state resembles the species nearest to it in energy (Hammond's postulate); A9 tetrahedral carbon wants 109.5°,
staggered beats eclipsed, gauche costs 0.9 kcal/mol, and crowding costs energy; A10 wedges and dashes, chirality,
enantiomers and diastereomers; A11 orbitals must line up: backside attack, anti-periplanar elimination, a planar
carbocation open on both faces; A12 carbocation stability (tertiary over secondary over primary over methyl;
allylic and benzylic by resonance) and rearrangement to a more stable cation; A13 solvation: polar protic solvents
stabilize ions by hydrogen bonding, anions most of all, and polar aprotic solvents leave anions bare.
`intro`: three or four sentences on why checking these first saves time. `diagnostic`: all the item ids below.

## 2. content/items/foundations.json
Two diagnostic questions per axiom (26 items): `"type": "foundations"`, `"role": "practice"`, an extra field
`"axiom": "A3"`, ids `foundations-001` onward, kinds mcq, numeric, rank or classify (no written, mech or chair), each
answerable in under a minute, each wrong choice a real misconception with a `why`. Solutions of two or three steps.
List each axiom's two ids in its `check`. These test the prerequisite itself, not this unit's new material.

## 3. docs/learning-science.md (at most 300 lines)
The research behind the guide, written like Eureka's equations-learning.md: a first paragraph that states the
conclusion, then sections. Cover: retrieval practice; spacing and successive relearning, and what changes when the
exam is days away; mixing question types so that choosing the approach is practised; worked examples that fade;
self-explanation; attempting before being shown; explanatory feedback; practising in the exam's own form (by hand,
timed, closed book); drawing and building models for spatial ideas; knowing what you know (confidence, delayed
checks); sleep and cramming; what does not help (rereading, highlighting, points and leaderboards). For each: what the
evidence says, with the size of the effect and where it was measured, its limits, and a link. Then a table:
technique, what this guide does about it, where (the page or feature, described truthfully from ARCHITECTURE.md).
Then "How to use the guide": a plan for seven days before the exam, for three days, and for the last 48 hours.
Then "Limits": what was not checked, and that almost none of the trials are in organic chemistry.
Citations: take them from the draft and from equations-learning.md. If you have web search (load it with ToolSearch,
query "select:WebSearch"), confirm the twelve most load-bearing ones (author, year, the number) and mark them
"checked"; mark every other one "from the research draft, not re-checked". If you cannot search, mark them all that
way. Never invent a citation, a number or a URL; leave out what you cannot source.

## 4. docs/prerequisites.md (at most 150 lines)
The thirteen axioms as a document: each stated, then a table mapping every topic of the unit (rings and strain,
chairs, NMR, acids and bases, organometallics, SN2, SN1, E1, E2, choosing a mechanism, rearrangements) to the axioms
it leans on, and the diagnostic blueprint (which question tests which axiom and what a wrong answer reveals).

## 5. docs/backporting.md (at most 150 lines)
For Eureka's maintainers: what this class adds beyond Eureka's shared engine, and how to bring each piece to the
other classes. One short section per piece: a review schedule sized to the exam date with mastery measured after a
delay; question kinds beyond single-answer multiple choice (circle all that apply, numeric with an accepted range,
ranking, sorting into bins, written answers marked against a rubric, drawn mechanisms, chairs); worked examples with
questions to answer before each step; a page per exam question type (what to know, method, worked, practice);
pen-and-paper mock exams marked against rubrics; readings with closer-look and bigger-picture branches and a why
question per section; content written as JSON that a build checks; pictures written as tokens; an end-to-end browser
test. For each: what it is, the files here, which shared Eureka file it would extend (shared/drill.js, shared/plan.js,
a class's read page, tools/), what data would have to change, and a size (small, medium, large). Be concrete and
plain; no selling.

CHECK: `node tools/build.js --check content/foundations.json content/items/foundations.json`
