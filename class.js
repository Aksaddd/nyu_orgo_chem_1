// CHEM 225 · what Eureka needs to know to list this class (see Eureka's docs/adding-a-class.md).
// After changing it, run  node tools/build-classes.js  from the Eureka folder.
// The class code students type is CHEM225 (only its fingerprint is stored here). Change it before sharing widely:
//     node tools/class-code.js "NEW-CODE"
(window.EUREKA_CLASS = window.EUREKA_CLASS || []).push({
  id: "orgo",
  order: 5,
  name: "CHEM 225",
  title: "Organic Chemistry I",
  school: "New York University",
  professor: "",
  blurb: "Rings and chair conformations, acids and bases, organometallics, SN2, SN1, E1 and E2: the lectures rebuilt as readings, the past exam worked step by step, a trainer for every exam question type, mechanisms you draw yourself, and mock exams.",
  stats: "560 questions · 11 reading chapters · 45 mechanisms · 3 mock exams",
  color: "#5e5ce6",
  cover: ["#3b3a9e", "#17163f"],
  code: "5192f344100426d7f1cd0438219fae75cbe180a69dbae837e804b47c40f62737",
  // the questions that are marked: the practice bank and the past exam (tools/build.js says when this number is out of date)
  progress: [["orgo-drill-v1", 453]],
  portals: {"main":[["Readings","read/","read"],["Practice","drill/","drill"],["Exam 2 Lab","exam/","exam"],["Mechanisms","mechanisms/","mechanisms"],["Mock Exam","mock/","mock"],["Syllabus","syllabus/","syllabus"]],"more":[["Review List","review/","review"],["Molecule Lab","lab/","lab"],["Foundations","foundations/","foundations"],["Archive","archive/","archive"]]},
  art: `<g fill="none" stroke="#f3ead2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M28 118 L62 96 L104 112 L172 84 L138 106 L96 90 Z"/></g>
    <g stroke="#ffd166" stroke-width="4" stroke-linecap="round"><path d="M62 96V62M138 106V140M172 84V50M28 118V152"/></g>
    <g fill="#ffd166"><circle cx="62" cy="56" r="7"/><circle cx="138" cy="146" r="7"/></g>
    <path d="M40 44 Q84 12 128 40" fill="none" stroke="#8fd3ff" stroke-width="4" stroke-linecap="round"/><path d="M116 28 L130 41 L112 46" fill="none" stroke="#8fd3ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="150" y="176" font-size="24" font-weight="700" text-anchor="middle" fill="#f3ead2" font-family="ui-serif,'New York',Georgia,serif">S<tspan baseline-shift="sub" font-size="15">N</tspan>2</text>`
});
