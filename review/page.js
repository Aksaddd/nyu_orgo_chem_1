// CHEM 225 · the review list: everything missed or flagged, grouped by question type.
(() => {
  const { el } = ORGO, L = ORGO.learn;
  const app = document.getElementById("app");
  const lastScore = id => { const s = L.state(id), h = s && s.hist && s.hist[s.hist.length - 1]; return h ? h[1] : null };
  const typeOf = id => (ORGO.data.index[id] || [])[0];
  const session = el("div");

  function words(id) {
    const it = ORGO.data.items[id]; if (!it) return id;
    const t = ORGO.text(it.stem || it.q || it.text || it.prompt || it.title || ""); const w = t.split(" ");
    return w.length > 14 ? w.slice(0, 14).join(" ") + "..." : t || id;
  }
  function render(ids) {
    app.textContent = "";
    const missed = L.missed(), flagged = L.flagged();
    const head = el("div", {}, el("p", { class: "eyebrow" }, "Review list"), el("h1", { class: "page-title" }, "Missed and flagged"));
    if (!ids.length) { app.append(el("div", { class: "stack" }, head, el("div", { class: "empty" }, el("p", {}, "Nothing to review. Questions you miss or flag will collect here."), el("a", { class: "btn primary", href: ORGO.base + "drill/index.html" }, "Go to Practice")))); return }
    const groups = {}; ids.forEach(id => (groups[typeOf(id)] = groups[typeOf(id)] || []).push(id));
    app.append(el("div", { class: "stack" }, head,
      el("p", { class: "lead" }, missed.length + " missed, " + flagged.length + " flagged."),
      el("div", { class: "btn-row" }, el("button", { class: "btn primary", on: { click: () => practise(ids) } }, "Practise these now")),
      session,
      Object.keys(groups).map(ty => {
        const t = ORGO.type(ty);
        return el("section", { class: "card stack" },
          el("h2", { style: { margin: 0, fontSize: "1.15rem" } }, t ? (t.short || t.title) : ty),
          el("ul", { class: "stack", style: { listStyle: "none", padding: 0, margin: 0 } }, groups[ty].map(id => {
            const sc = lastScore(id), fl = L.flagged().includes(id);
            return el("li", { class: "row" }, el("span", {}, words(id)),
              sc == null ? null : el("span", { class: sc >= 0.8 ? "mark-ok" : "mark-no" }, sc >= 0.8 ? "Right last time" : "Missed last time"),
              fl ? el("span", { class: "badge" }, "Flagged") : null);
          })),
          el("div", { class: "btn-row" }, el("a", { class: "btn small", href: ORGO.base + "exam/index.html#" + ty }, "Open the trainer")));
      })));
  }
  function practise(ids) {
    ORGO.need(ids.map(id => "t/" + typeOf(id)).filter((v, i, a) => a.indexOf(v) === i)).then(() => {
      session.textContent = "";
      if (!ORGO.quiz || !ORGO.quiz.session) { session.append(el("p", { class: "muted" }, "The question engine did not load.")); return }
      ORGO.quiz.session(session, ids, { title: "Review", onEnd: () => ORGO.ui.toast("Review finished") });
      session.scrollIntoView && session.scrollIntoView({ block: "start" });
    }).catch(() => session.append(el("p", { class: "muted" }, "The questions could not be loaded.")));
  }
  function load() {
    const ids = [...new Set([...L.missed(), ...L.flagged()])];
    ORGO.need(ids.map(id => "t/" + typeOf(id)).filter((v, i, a) => a.indexOf(v) === i)).catch(() => 0).then(() => render(ids));
  }
  ORGO.ready(load);
})();
