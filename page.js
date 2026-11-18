// CHEM 225 · the dashboard. Everything is drawn into #app and redrawn whenever progress changes.
(() => {
  const { el } = ORGO, L = ORGO.learn;
  const app = document.getElementById("app");
  const link = href => ORGO.base + href;
  const PHASE = {
    build: ["Build", "Learn the ideas and begin recalling them. Short sessions on many days beat one long one."],
    strengthen: ["Strengthen", "The exam is close. Mixed practice and a timed mock exam matter most now."],
    rehearse: ["Rehearse", "Final days. Rehearse the whole exam and fix the question types that still slip."],
    exam: ["Exam day", "Today is the exam. Keep it light: one short recall round, then rest."]
  };
  const PARTS = [
    ["Readings", "read/", "The lectures rebuilt as short chapters with checks after each part."],
    ["Exam 2 Lab", "exam/", "The Fall 2024 exam worked step by step, with a trainer for every question type."],
    ["Practice", "drill/", "Mixed questions across all types, scheduled so that you see them again at the right time."],
    ["Mechanisms", "mechanisms/", "Watch, complete and draw the curved arrows yourself."],
    ["Mock Exam", "mock/", "Nine questions, choose seven, 110 minutes, like the real one."],
    ["Molecule Lab", "lab/", "Chairs, Newman projections, 3D models, energy diagrams and the pKa ladder."],
    ["Foundations", "foundations/", "The few ideas everything else rests on, and a short check of them."],
    ["Review List", "review/", "Every question you missed or flagged, ready to practise again."],
    ["Archive", "archive/", "The original lecture notes, the old exam and the flow chart."],
    ["Syllabus", "syllabus/", "What the unit covers and how the exam is set."]
  ];
  const HOW = [
    ["Recall before rereading.", "Trying to remember an answer strengthens memory far more than reading it again."],
    ["Come back on later days.", "Answers that you can still give after a day or more are the ones you will have in the exam room."],
    ["Mix the question types.", "The exam does not say which mechanism to use, so practise choosing as well as doing."],
    ["Write mechanisms and chairs by hand.", "The exam is pen and paper, and drawing is a skill that only drawing builds."],
    ["Take a timed mock exam.", "It shows how you manage 110 minutes and which questions to leave out."]
  ];

  function header() {
    const d = L.examDate(), left = L.daysLeft();
    let msg = "Set the exam date and the plan will pace itself to it.";
    if (d) { const n = Math.ceil(left); msg = left < 0 ? "The exam date has passed. Pick a new date if there is another exam." : n === 0 ? "The exam is today." : n === 1 ? "1 day left" : n + " days left" }
    const input = el("input", { type: "date", id: "examDate", value: d ? iso(d) : "", on: { change: e => L.setExamDate(e.target.value || null) } });
    return el("header", { class: "stack" },
      el("div", {},
        el("p", { class: "eyebrow" }, "CHEM 225 · Organic Chemistry I"),
        el("h1", { class: "page-title" }, "Exam 2 study guide"),
        el("p", { class: "lead" }, "New York University")),
      el("p", { class: "muted small", "data-credit": "orgo" }),
      el("div", { class: "card row" },
        el("label", { for: "examDate" }, el("b", {}, "Exam date")), input,
        el("span", { class: d && left >= 0 ? "badge" : "muted", "aria-live": "polite" }, msg)));
  }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") }

  function today() {
    const p = L.plan(), ph = PHASE[p.phase] || PHASE.build;
    return el("section", { class: "stack", "aria-labelledby": "h-today" },
      el("h2", { id: "h-today" }, "Today's session"),
      el("p", { class: "muted" }, el("b", {}, ph[0] + ". "), ph[1]),
      el("ol", { class: "steps" }, p.steps.map(s => el("li", { class: "step" },
        el("div", {},
          el("div", { class: "row" }, el("span", { class: "step-n" }, s.title), s.done ? el("span", { class: "mark-ok" }, "Done") : null),
          el("div", { class: "muted" }, s.detail),
          el("div", { class: "btn-row" }, el("a", { class: "btn small" + (s.done ? "" : " primary"), href: link(s.href) }, s.done ? "Open again" : "Start")))))));
  }

  function numbers() {
    const s = L.stats(), pct = s.delayed == null ? "not yet" : Math.round(s.delayed * 100) + "%";
    const box = (n, label) => el("div", { class: "card" }, el("div", { style: { fontSize: "2rem", fontWeight: 700 } }, String(n)), el("div", { class: "muted" }, label));
    return el("section", { class: "stack", "aria-labelledby": "h-nums" },
      el("h2", { id: "h-nums" }, "Where you stand"),
      el("div", { class: "grid" }, box(s.answered, "questions answered"), box(s.due, "due now"), box(pct, "right after a day or more")),
      el("p", { class: "muted" }, "The last number, not today's score, is the one that predicts the exam, because the exam asks what you can still do days later."));
  }

  function typeCard(t) {
    const c = t.count || {}, m = L.mastery(t.id);
    const counts = [c.practice ? c.practice + " practice" : "", c.exam ? c.exam + " exam" : "", c.worked ? c.worked + " worked" : ""].filter(Boolean).join(" · ") || "No questions yet";
    return el("a", { class: "card tap", href: link("exam/index.html#" + t.id) },
      el("div", { class: "row", style: { justifyContent: "space-between" } },
        el("span", { class: "badge" }, t.exam || ""), t.points ? el("span", { class: "muted small" }, t.points + " points") : null),
      el("h3", { style: { margin: ".4em 0 .3em" } }, t.short || t.title),
      el("div", { class: "row" }, ORGO.ui.levelDots(m.level), el("span", { class: "small muted" }, m.label)),
      el("div", { class: "small muted" }, counts));
  }
  function blueprint() {
    const bp = ORGO.data.blueprint || [];
    const group = (name, g) => { const list = bp.filter(t => t.group === g); return list.length ? el("div", { class: "stack" }, el("h3", {}, name), el("div", { class: "grid" }, list.map(typeCard))) : null };
    return el("section", { class: "stack", "aria-labelledby": "h-bp" }, el("h2", { id: "h-bp" }, "The exam, by question type"),
      bp.length ? [group("On the past exam", "exam"), group("From the lectures", "lecture")] : el("div", { class: "empty" }, el("p", {}, "The question types have not been built yet. Run node tools/build.js.")));
  }

  function parts() {
    return el("section", { class: "stack", "aria-labelledby": "h-parts" }, el("h2", { id: "h-parts" }, "The parts of the class"),
      el("div", { class: "grid" }, PARTS.map(([name, dir, line]) => el("a", { class: "card tap", href: link(dir + "index.html") }, el("h3", {}, name), el("div", { class: "muted small" }, line)))));
  }
  function how() {
    return el("section", { class: "stack", "aria-labelledby": "h-how" }, el("h2", { id: "h-how" }, "How to use this guide"),
      el("ol", { class: "how" }, HOW.map(([a, b]) => el("li", {}, el("b", {}, a + " "), b))));
  }
  function source() {
    return el("section", { class: "stack", "aria-labelledby": "h-src" }, el("h2", { id: "h-src" }, "Where this comes from"),
      el("p", { class: "prose" }, "Three things went in: the professor's Fall 2026 lecture notes, the Fall 2024 Exam 2, and the flow-chart handout on substitution and elimination. Every reading, question and worked solution here was rebuilt from them. The original files are kept untouched."),
      el("div", { class: "btn-row" }, el("a", { class: "btn", href: link("archive/index.html") }, "Open the archive")));
  }

  function render() {
    const keep = document.activeElement && document.activeElement.id === "examDate";
    app.textContent = "";
    try { app.append(el("div", { class: "stack home" }, header(), today(), numbers(), blueprint(), parts(), how(), source())) }
    catch (e) { console.error(e); app.append(el("div", { class: "empty" }, el("p", {}, "The dashboard could not be drawn. Reload the page."))) }
    if (keep) { const i = document.getElementById("examDate"); i && i.focus() }
  }
  ORGO.ready(render);
  ORGO.on("progress", render);
})();
