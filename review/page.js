// CHEM 225 · the review list: everything missed or flagged, grouped by question type.
(() => {
  const { el } = ORGO, L = ORGO.learn;
  const app = document.getElementById("app");
  const lastScore = id => { const s = L.state(id), h = s && s.hist && s.hist[s.hist.length - 1]; return h ? h[1] : null };
  const typeOf = id => (ORGO.data.index[id] || [])[0];
  const now = () => [...new Set([...L.missed(), ...L.flagged()])];
  // the session stays where it is; the count line, the button and the rows around it follow the records (redrawn on every
  // answer and flag), and the rows keep the questions the page opened with, so a question put right shows "Right last time"
  const session = el("div"), count = el("p", { class: "lead" }), groups = el("div", { class: "stack" });
  const go = el("button", { class: "btn primary", on: { click: () => practise(now()) } }, "Practise these now"), act = el("div", { class: "btn-row" }, go);
  let shown = [];

  function words(id) {
    const it = ORGO.data.items[id]; if (!it) return id;
    const t = ORGO.text(it.stem || it.q || it.text || it.prompt || it.title || ""); const w = t.split(" ");
    return w.length > 14 ? w.slice(0, 14).join(" ") + "..." : t || id;
  }
  function render(ids) {
    app.textContent = ""; shown = ids;
    const head = el("div", {}, el("p", { class: "eyebrow" }, "Review list"), el("h1", { class: "page-title" }, "Missed and flagged"));
    if (!ids.length) { app.append(el("div", { class: "stack" }, head, el("div", { class: "empty" }, el("p", {}, "Nothing to review. Questions you miss or flag will collect here."), el("a", { class: "btn primary", href: ORGO.base + "drill/index.html" }, "Go to Practice")))); return }
    app.append(el("div", { class: "stack" }, head, count, act, session, groups));
    rows();
  }
  function rows() {
    if (!shown.length) return;
    const flagged = L.flagged(), left = now(), by = {};
    count.textContent = L.missed().length + " missed, " + flagged.length + " flagged.";
    act.hidden = !left.length;      // nothing missed or flagged any more: nothing to practise
    shown.forEach(id => (by[typeOf(id)] = by[typeOf(id)] || []).push(id));
    groups.textContent = "";
    groups.append(...Object.keys(by).map(ty => {
      const t = ORGO.type(ty);
      return el("section", { class: "card stack" },
        el("h2", { style: { margin: 0, fontSize: "1.15rem" } }, t ? (t.short || t.title) : ty),
        el("ul", { class: "stack", style: { listStyle: "none", padding: 0, margin: 0 } }, by[ty].map(id => {
          const sc = lastScore(id), fl = flagged.includes(id);
          return el("li", { class: "row" }, el("span", {}, words(id)),
            sc == null ? null : el("span", { class: sc >= 0.8 ? "mark-ok" : "mark-no" }, sc >= 0.8 ? "Right last time" : "Missed last time"),
            fl ? el("span", { class: "badge" }, "Flagged") : null);
        })),
        el("div", { class: "btn-row" }, el("a", { class: "btn small", href: ORGO.base + "exam/index.html#" + ty }, "Open the trainer")));
    }));
  }
  function practise(ids) {
    ORGO.need(ids.map(id => "t/" + typeOf(id)).filter((v, i, a) => a.indexOf(v) === i)).then(() => {
      session.textContent = "";
      if (!ORGO.quiz || !ORGO.quiz.session) { session.append(el("p", { class: "muted" }, "The question engine did not load.")); return }
      // no kind: practice from this list ticks no step of the study plan
      ORGO.quiz.session(session, ids, { title: "Review", onEnd: () => ORGO.ui.toast("Review finished") });
      session.scrollIntoView && session.scrollIntoView({ block: "start" });
    }).catch(() => session.append(el("p", { class: "muted" }, "The questions could not be loaded.")));
  }
  function load() {
    const ids = now();
    ORGO.need(ids.map(id => "t/" + typeOf(id)).filter((v, i, a) => a.indexOf(v) === i)).catch(() => 0).then(() => render(ids));
  }
  ORGO.ready(load);
  ORGO.on("progress", rows);
})();
