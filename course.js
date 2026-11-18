// CHEM 225 · loaded on every page of the class, before assets/core.js.
// Inside Eureka (../shared/platform.js loaded) it checks the class code and adds the class bar.
// On its own, the pages work without it: assets/core.js draws a simple top bar from orgoPortals.
window.COURSE = {
  id: "orgo", prefix: "orgo-", name: "CHEM 225", title: "Organic Chemistry I",
  base: (document.currentScript && document.currentScript.src || "").replace(/course\.js.*$/, ""),   // this class's folder
  badges: "orgo",
  sourceHint: "for example just chairs, or just SN2 and E2",
  terms: ["anti-periplanar", "pKa"],
  deckBonus: () => null,
  orgoPortals: [["Readings", "read/"], ["Exam 2 Lab", "exam/"], ["Practice", "drill/"], ["Mechanisms", "mechanisms/"], ["Mock Exam", "mock/"], ["Molecule Lab", "lab/"], ["Foundations", "foundations/"], ["Review", "review/"], ["Archive", "archive/"], ["Syllabus", "syllabus/"]],
  // the companion's fact for each of its six forms
  facts: [
    "A cat curled in a chair is the most relaxed cat. Cyclohexane agrees: the chair has no angle strain and no torsional strain.",
    "Big groups sit equatorial, like a cat choosing the wide cushion. An axial tert-butyl costs 5.5 kcal/mol.",
    "An SN2 nucleophile comes in from the back, the way a cat approaches a closed door: opposite the handle.",
    "A good leaving group is a weak base. It leaves without making a fuss.",
    "E2 needs the hydrogen and the leaving group anti-periplanar: one straight line through the bond, tail to nose.",
    "The big lecture: electrons go from where they are rich to where they are poor. Every arrow starts at a lone pair or a bond."
  ]
};
window.Platform && window.Platform.guard("orgo");
