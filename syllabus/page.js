// CHEM 225 · the syllabus: what is known about the unit and the exam.
(() => {
  const { el } = ORGO;
  const LECTURES = [
    ["10/20", "Rings and ring strain", "rings-1"], ["10/22", "Introduction to NMR", "nmr"], ["10/27", "Chairs, axial and equatorial, substituents", "rings-2"],
    ["10/29", "Acids, bases, pKa, organometallic reagents", "acids"], ["11/03", "Organometallics, the SN2 reaction", "sn2-1"],
    ["11/05", "SN2: substrate, leaving group, nucleophile, solvent", "sn2-2"], ["11/10", "SN1 and E1", "sn1-e1"], ["11/12", "E2", "e2"]
  ];
  const FORMAT = ["Nine questions, each worth 100 points. You choose seven.", "110 minutes.", "Pen only. No notes.", "The model set is allowed."];
  function render() {
    document.getElementById("app").append(el("div", { class: "stack" },
      el("p", { class: "eyebrow" }, "Syllabus"),
      el("h1", { class: "page-title" }, "What the unit covers"),
      el("p", { class: "lead" }, "No syllabus file was provided, so this page lists only what the lecture notes and the old exam show."),
      el("section", { class: "stack" }, el("h2", {}, "The unit, lecture by lecture"),
        el("div", { class: "stack" }, LECTURES.map(([d, t, id]) => el("a", { class: "card tap row", href: ORGO.base + "read/index.html#" + id },
          el("span", { class: "badge" }, d), el("b", {}, t), el("span", { class: "muted small", style: { marginLeft: "auto" } }, "Open the reading"))))),
      el("section", { class: "stack" }, el("h2", {}, "The textbook"),
        el("p", {}, "The notes cite Jones and Fleming, Organic Chemistry, chapters 5 to 8.")),
      el("section", { class: "stack" }, el("h2", {}, "The exam format"),
        el("p", { class: "muted" }, "This is the format of the Fall 2024 Exam 2:"),
        el("ul", {}, FORMAT.map(x => el("li", {}, x))),
        el("div", { class: "callout warn" }, "This year's rules are the professor's to set. Check them with your professor before you rely on this list."))));
  }
  ORGO.ready(render);
})();
