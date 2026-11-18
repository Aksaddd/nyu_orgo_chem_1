// CHEM 225 · loaded on every page of the class, before assets/core.js.
// Inside Eureka (../shared/platform.js loaded) it checks the class code and adds the class bar.
// On its own, the pages work without it: assets/core.js draws a simple top bar from orgoPortals.
window.COURSE = {
  // today's study plan on the front page (Eureka's shared/plan.js): where each part of the class keeps its progress.
  // The plan reads orgo-read-v1 ({chapterId: {at, a, finished, done}}), the drill record orgo-drill-v1 (written by assets/core.js),
  // and orgo-mock-history-v1 (a list of {at, right, total, pct, secs}, added by mock/page.js). There is no equations part.
  plan: { read: { key: "orgo-read-v1", chapters: ["rings-1", "nmr", "rings-2", "acids", "organometallics", "sn2-1", "sn2-2", "sn1-e1", "e2", "choose", "beyond"], href: "read/index.html" }, drill: { key: "orgo-drill-v1", total: 453, href: "drill/index.html?mode=mixed&n=15" }, mock: { key: "orgo-mock-history-v1", href: "mock/index.html" }, review: { href: "review/index.html" } },
  id: "orgo", prefix: "orgo-", name: "CHEM 225", title: "Organic Chemistry I",
  base: (document.currentScript && document.currentScript.src || "").replace(/course\.js.*$/, ""),   // this class's folder
  badges: "orgo",
  sourceHint: "for example just chairs, or just SN2 and E2",
  terms: ["anti-periplanar", "pKa"],
  // the keyboard shortcuts Eureka lists under Accessibility (shared/prefs.js): this class has no "previous question" key
  keys: [["1 – 5", "Choose an answer in a practice session (the question says which keys)"], ["Enter or →", "Next question, once you have answered"], ["Tab", "Move to the next control"], ["Esc", "Close a panel or dialog"], ["?", "Show this list"]],
  // XP (Eureka's shared/xp.js): every answer arrives with its question's level as "orgo1" to "orgo3" (assets/eureka.js), and the
  // level sets the tier: 1 Easy (10 XP), 2 Medium (20), 3 Hard (35), before the streak multiplier. The bank then averages
  // about 21 XP an answer, near Bi 239's 19 (ANTH 104 and ECON 101, mostly recall, about 11).
  deckBonus: d => (d === "orgo3" ? [4, "A hard question"] : d === "orgo2" ? [2, "A medium question"] : null),
  orgoPortals: [["Readings", "read/"], ["Practice", "drill/"], ["Exam 2 Lab", "exam/"], ["Mechanisms", "mechanisms/"], ["Mock Exam", "mock/"], ["Syllabus", "syllabus/"], ["Review", "review/"], ["Molecule Lab", "lab/"], ["Foundations", "foundations/"], ["Word Roots", "roots/"], ["Archive", "archive/"]],
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
