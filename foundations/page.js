// CHEM 225 · foundations: the axioms the unit rests on, a diagnostic, and a refresher for each.
(() => {
  const { el } = ORGO;
  const app = document.getElementById("app");
  const last = id => { const s = ORGO.learn.state(id); const h = s && s.hist && s.hist[s.hist.length - 1]; return h ? h[1] : null };
  const typesFor = ids => [...new Set(ids.map(id => (ORGO.data.index[id] || [])[0]).filter(Boolean))].map(t => "t/" + t);
  // The check is a diagnostic: the first answer counts. A miss put right on the second try, just after its worked solution,
  // is still a gap. The saved check keeps its first-try misses (diag-v1.missed); a right answer within 12 hours of a miss
  // is a gap too (relearning, as core.js counts it), for a check saved before that list and for a retry in a later review.
  const gap = id => {
    const d = ORGO.store.get("diag-v1", null);
    if (d && Array.isArray(d.missed) && d.missed.includes(id)) return true;
    const s = ORGO.learn.state(id), h = (s && s.hist) || [], a = h[h.length - 2], b = h[h.length - 1];
    return !!(a && b && a[1] < 0.8 && b[0] - a[0] < 432e5);
  };
  const right = id => last(id) >= 0.8 && !gap(id);
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);

  function empty(msg) {
    app.append(el("div", { class: "stack" }, el("p", { class: "eyebrow" }, "Foundations"), el("h1", { class: "page-title" }, "What you need first"),
      el("div", { class: "empty" }, el("p", {}, msg), el("a", { class: "btn", href: ORGO.base + "read/index.html" }, "Go to the readings"))));
  }

  function draw(F) {
    const axioms = F.axioms || [], diag = (F.diagnostic || []).filter(id => ORGO.data.index[id]);
    const host = el("div", { class: "stack" }), result = el("div", { class: "stack", "aria-live": "polite" }), session = el("div");
    const cards = el("div", { class: "stack" }, axioms.map((a, i) => el("article", { class: "card stack", id: a.id },
      el("p", { class: "eyebrow" }, "Idea " + (i + 1)),
      el("h3", {}, a.title),
      el("p", { class: "prose", html: a.statement }),
      a.why ? el("p", {}, el("b", {}, "Why it matters. "), ORGO.html(a.why)) : null,
      a.explains && a.explains.length ? el("div", {}, el("b", {}, "What it explains"), el("ul", {}, a.explains.map(x => el("li", { html: x })))) : null,
      a.refresher ? el("details", { class: "more" }, el("summary", {}, "Refresher"), el("div", { class: "prose", html: a.refresher })) : null)));

    function report() {
      result.textContent = "";
      const rows = axioms.filter(a => (a.check || []).length).map(a => {
        const ids = a.check.filter(id => ORGO.data.index[id]), seen = ids.filter(id => last(id) != null), ok = seen.filter(right).length;
        return { a, ids, seen: seen.length, ok };
      }).filter(r => r.seen);
      if (!rows.length) return;
      result.append(el("h3", {}, "Your result, idea by idea"), el("p", { class: "muted small" }, "A question counts as right only when your first answer to it was right."),
        el("ul", { class: "stack", style: { listStyle: "none", padding: 0 } }, rows.map(r => {
        const weak = r.ok < r.seen;
        return el("li", { class: "card row" }, el("b", {}, r.a.title), el("span", { class: weak ? "mark-no" : "mark-ok" }, r.ok + " of " + r.seen + " right"),
          weak ? el("a", { class: "btn small", href: "#" + r.a.id }, "Read this first") : null);
      })));
    }
    const start = () => {
      if (!diag.length) { ORGO.ui.toast("There are no check questions yet."); return }
      ORGO.need(typesFor(diag)).then(() => {
        session.textContent = ""; result.textContent = "";
        if (!ORGO.quiz || !ORGO.quiz.session) { session.append(el("p", { class: "muted" }, "The question engine did not load.")); return }
        // no kind: the check ticks no step of the study plan. A check with nothing answered keeps the last one; a question
        // skipped this time keeps its miss from the last check
        ORGO.quiz.session(session, diag, { title: "Check yourself", onEnd: r => {
          if (r && r.total) { const was = (ORGO.store.get("diag-v1", null) || {}).missed || [], skipped = r.skipped || [];
            ORGO.store.set("diag-v1", { at: Date.now(), ids: diag, missed: [...new Set([...(r.missed || []), ...was.filter(id => skipped.includes(id))])] }) }
          report();
        } });
      }).catch(() => session.append(el("p", { class: "muted" }, "The check questions could not be loaded.")));
    };
    host.append(
      el("div", {}, el("p", { class: "eyebrow" }, "Foundations"), el("h1", { class: "page-title" }, "What you need first"), el("p", { class: "lead", html: F.intro || "" })),
      el("section", { class: "card stack" }, el("h2", { style: { marginTop: 0 } }, "Check yourself"),
        el("p", { class: "muted" }, diag.length ? plural(diag.length, "short question. It shows", "short questions. They show") + " which of the ideas below to read first." : "No check questions are available yet."),
        el("div", { class: "btn-row" }, el("button", { class: "btn primary", disabled: diag.length ? null : true, on: { click: start } }, "Start the check")), session, result),
      el("h2", {}, "The ideas"), cards);
    app.append(host); report();
  }

  ORGO.ready(() => ORGO.need("foundations").then(() => {
    const F = ORGO.data.foundations;
    if (!F || !(F.axioms || []).length) empty("The foundations have not been written yet. The readings start from the beginning of the unit."); else draw(F);
  }).catch(() => empty("The foundations are not available yet. The readings start from the beginning of the unit.")));
})();
