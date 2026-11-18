// CHEM 225 · the Practice page. ?mode=review|mixed|learn&n=12&type=<id>; with no query, three ways to start.
(() => {
  const ORGO = window.ORGO, el = ORGO.el, L = ORGO.learn;
  const here = q => "?" + new URLSearchParams(q).toString();
  const typeOf = id => ORGO.type(id);

  ORGO.ready(() => {
    const app = document.getElementById("app"), q = ORGO.ui.query();
    if (!ORGO.quiz || !ORGO.quiz.session) { app.appendChild(el("p", { class: "callout warn" }, "The question engine did not load. Reload the page.")); return }
    if (q.mode || q.type) run(app, q); else landing(app);
  });

  function empty(app, text, label, href) {
    app.appendChild(el("div", { class: "empty" }, el("p", {}, text), el("a", { class: "btn primary", href }, label)));
  }

  function run(app, q) {
    const mode = q.type && !q.mode ? "type" : ["review", "mixed", "learn"].includes(q.mode) ? q.mode : "mixed";
    const dflt = { review: 20, mixed: 12, learn: 10, type: 10 }[mode], n = Math.max(1, Math.min(40, parseInt(q.n, 10) || dflt));
    const t = q.type ? typeOf(q.type) : null, tName = t ? (t.short || t.title) : q.type;
    let ids, title;
    if (mode === "review") { ids = L.pick({ mode: "review", n }); title = "Review" }
    else if (q.type) { ids = mode === "learn" ? L.pick({ types: [q.type], n, mode: "learn" }) : []; if (!ids.length) ids = L.pick({ types: [q.type], n }); title = tName }
    else { ids = L.pick({ mode: mode === "learn" ? "learn" : "mixed", n }); title = mode === "learn" ? "New questions" : "Mixed practice" }
    app.appendChild(el("p", {}, el("a", { class: "btn ghost small", href: ORGO.base + "drill/index.html" }, "All practice")));
    if (!ids.length) {
      if (mode === "review") empty(app, "Nothing is due right now. A question comes back here a day or more after you answer it.", "Start mixed practice", here({ mode: "mixed", n: 12 }));
      else if (q.type) empty(app, "There are no practice questions of this type yet.", "Choose another way to practise", ORGO.base + "drill/index.html");
      else empty(app, "There are no practice questions yet.", "Go to the home page", ORGO.base + "index.html");
      return;
    }
    const host = el("div", {}); app.appendChild(host);
    ORGO.quiz.session(host, ids, { title, kind: mode === "type" ? "learn" : mode });
  }

  function landing(app) {
    const due = L.due().length;
    const types = ORGO.data.blueprint.filter(t => t.count && ((t.count.practice || 0) + (t.count.exam || 0)) > 0);
    const any = types.length > 0;
    app.append(el("h1", { class: "page-title" }, "Practice"),
      el("p", { class: "lead" }, "Answer first, then read the reason. Questions you miss come back, and so do the ones you got right, a little later each time."));

    const review = el("section", { class: "card drill-card" }, el("h2", {}, "Review what is due"),
      el("p", { class: "drill-count" }, el("b", {}, String(due)), due === 1 ? " question is due" : " questions are due"),
      el("p", { class: "muted" }, "Recalling an answer just as it starts to fade is what makes it stay until the exam."),
      due ? el("div", { class: "btn-row" }, el("a", { class: "btn primary", href: here({ mode: "review" }) }, "Start the review"))
        : el("p", { class: "small muted" }, "Nothing is due yet. Questions arrive here a day or more after you first answer them."));

    const mixed = el("section", { class: "card drill-card" }, el("h2", {}, "Mixed practice"),
      el("p", { class: "muted" }, "Questions of different types in one run, weakest first, so that you practise choosing the method as well as using it."),
      any ? el("div", { class: "btn-row", role: "group", "aria-label": "How many questions" }, [8, 12, 20].map(k => el("a", { class: "btn" + (k === 12 ? " primary" : ""), href: here({ mode: "mixed", n: k }) }, k + " questions")))
        : el("p", { class: "small muted" }, "There are no practice questions yet."));

    const one = el("section", { class: "card drill-card drill-types" }, el("h2", {}, "One question type"),
      el("p", { class: "muted" }, "Ten questions of a single type, for when a type is new or keeps going wrong."),
      any ? el("ul", { class: "type-list" }, types.map(t => {
        const m = L.mastery(t.id);
        return el("li", {}, el("a", { class: "type-row", href: here({ type: t.id }) },
          el("span", { class: "type-name" }, t.short || t.title), ORGO.ui.levelDots(m.level),
          el("span", { class: "small muted" }, `${m.label}, ${m.seen} of ${m.total} seen`)));
      })) : el("p", { class: "small muted" }, "No question type has practice questions yet."));

    app.appendChild(el("div", { class: "grid drill-grid" }, review, mixed, one));
  }
})();
