# Brief: independent audit of the answer keys

You are a second chemist checking another chemist's answer keys before students rely on them. A wrong key teaches a
wrong answer, so your job is to find every item where the key is wrong, the question is ambiguous, or the explanation
says something false. You change nothing: you report.

OWN: one report file, named in your task line, under
/tmp/claude-0/-home-user/8af09f87-d240-5d08-9b77-410ef91eef2c/scratchpad/audit/ (create the folder if needed).
READ: docs/dev/LECTURES.md (all: the course's own facts and numbers, which the keys must follow even where the usual
tables differ; see its last table) and docs/dev/EXAM-KEY.md (skim). The token syntax in stems: `[[mol:SMILES]]` is a
structure, `[[rxn:LEFT>ABOVE;BELOW>RIGHT]]` a reaction with conditions on the arrow, `[[ring:1u:CH3,2d:Cl]]` a flat
cyclohexane (carbon, u = up/wedge, d = down/dash, group), `[[chair:…|A]]` a chair (form A: carbon 1's axial bond points
up), `[[energy:R=0,TS=20,P=-8]]` an energy diagram, `{{CH3O-}}` a typeset formula.

## Method (for a blind audit: your task line gives K and N)
1. `node tools/audit.js export K N > <your folder>/blind.json` and read it. It holds questions with the keys removed.
2. Answer every question yourself, from chemistry and the lecture digest, without looking at any file under content/.
   Write `<your folder>/answers.json` as `{"<id>": answer}` (mcq: 0-based index of your choice in the exported order;
   multi: list of indexes; numeric: a number; rank: the exported indexes in the correct order; classify: a list of bin
   names, one per item). Use `python3 tools/chem.py smiles '…'` when a structure's identity or stereochemistry matters.
3. `node tools/audit.js grade <your folder>/answers.json` prints only the disagreements.
4. For each disagreement run `node tools/audit.js show <id>` and decide, honestly: the key is wrong; or the question
   is ambiguous or has two defensible answers; or the question depends on a fact that is not in the lecture digest and
   is doubtful; or you were wrong (then drop it). While you have an item open, also read its `why` lines and solution
   steps for false statements.
5. Then spot-check 15 items you got "right": `show` them and read the explanations for anything false or misleading.

## Method (for a review of written answers: your task line says so and gives K and N)
`node tools/audit.js list written K N` prints the written questions with their model answers and rubrics. For each:
is the model answer chemically right and complete; does it follow the lecture's values; would a grader accept it; does
the rubric add up and reward the right things; is anything stated that is false? For mechanisms referenced as
`[[mech:id]]`, read them in content/mechanisms/*.json (grep the id) and check that each step is the accepted mechanism,
not merely a legal movement of electrons.

## Report
Write the report file as JSON: `{"checked": n, "issues": [{"id", "severity": "wrong-key" | "ambiguous" | "false-statement" | "minor", "problem": "one or two sentences", "fix": "exactly what to change"}]}`.
Report only what you are confident is a real problem; do not pad. Reply with the structured summary (status, files,
checks = how many items you answered and how many disagreements and confirmed issues, notes = the confirmed issues in
one sentence each, most serious first, at most 8).

Budget: aim for under 30 tool calls. Do not read files under content/ except through tools/audit.js, apart from
mechanisms you are asked to check.
