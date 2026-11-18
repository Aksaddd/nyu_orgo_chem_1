# Brief: the lectures rebuilt as readings

OWN: the files content/read/<id>.json named in your task line, and nothing else.
READ: docs/dev/CONTENT-SPEC.md (all; the "Readings" section is your schema); docs/dev/LECTURES.md (all: the faithful
digest of the handwritten notes; your chapters must contain everything it says for your lectures, with its numbers and
its vocabulary); docs/dev/EXAM-KEY.md (skim: so that you can point at what the exam asks); content/read/rings-1.json
(the shape only: it is a stub that the rings-1 author replaces).

Each chapter turns one lecture (or one topic) into a reading that a student who missed the lecture could learn from,
and that a student who attended would find clearer than the notes. For every chapter:

- 5 to 9 sections in the order the professor taught. Each section: a specific title; `pages` (the lecture pages it
  covers, like `"L1105:2"`); `html`: the passage at exam level, 120 to 260 words, key terms in `<b>`, every number
  and table from the digest (tables as `<table>`), and figures as tokens on their own lines: structures and reactions
  drawn with `[[mol:…]]` and `[[rxn:…]]`, chairs with `[[chair:…|A]]` and `[[ring:…]]`, Newman projections, energy
  diagrams with `[[energy:…]]`, and mechanisms that already exist with `[[mech:id]]` (ids available now:
  sn2-iodomethane-hydrosulfide, e2-tertbutyl-bromide-hydroxide, sn1-tertbutyl-bromide-water,
  e1-tertbutyl-bromide-water, grignard-co2-benzoic-acid, methyllithium-water). Prefer a picture to a sentence wherever
  the notes drew something. Do not use `[[fig:…]]` or `[[view3d:…]]`.
- `micro`: one or two "closer look" entries per section (60 to 150 words each): the mechanism underneath, where a
  number comes from, a calculation (for example K from ΔG = −RT ln K with RT = 0.592 kcal/mol at 25 °C), the orbital
  picture, a common mistake and how to avoid it.
- `macro`: one "bigger picture" entry for most sections (60 to 150 words): how this idea connects to other parts of
  the unit, where it shows up on the past exam (name the question), and one honest link to biology or medicine where a
  well-known one exists (strained rings in penicillin, chairs in glucose and steroids, pKa and drug ionization, SN2
  methyl transfer by S-adenosylmethionine, and the like). Only well-established facts.
- `why`: one question whose answer needs the reason, not the fact, with a two or three sentence answer.
- `check`: leave as an empty list.
- `goals` (3 to 5, each starting with a verb), `summary` (5 to 8 one-sentence takeaways), and `homework`: every "HW"
  in the digest for your lectures, quoted, with worked `steps` and an `answer`.
- Facts: only what is in the digest, the exam key, or standard first-semester organic chemistry that you are certain
  of. Where the lecture's value differs from the usual tables, give the lecture's value and say so once. Validate
  SMILES with `python3 tools/chem.py smiles '…'`.

CHECK (repeat until clean): `node tools/build.js --check content/read/<each of your files>`
