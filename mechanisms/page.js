// CHEM 225 · Mechanisms: the catalogue, and the trainer opened in place (the URL hash names the mechanism).
//   #                      the catalogue
//   #<mechanism id>        the trainer (watch first if it is new to you, otherwise draw every arrow)
//   #<mechanism id>/<mode> the trainer in one mode: watch, complete, solo, paper
(() => {
  const ORGO = window.ORGO, el = ORGO.el, app = document.getElementById("app");
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // SN1 and SN2 drawn as the class draws formulas (ORGO.fmt): one word for Eureka's dictionary (data-lk), not "S", "N" and "1"
  const nice = s => ORGO.fmt(esc(s).replace(/\b(SN1|SN2)\b/g, "{{$1}}"));
  const withHtml = (node, html) => { node.innerHTML = html; return node };
  const list = () => ORGO.data.mechList || [];
  const state = id => (ORGO.learn && ORGO.learn.state ? ORGO.learn.state("mech:" + id) : null);
  let trainer = null;

  // a state mark in words, with a tick when the last attempt was right
  function mark(id) {
    const r = state(id);
    if (!r || !r.n) return el("span", { class: "badge mech-state" }, "New");
    const last = r.hist && r.hist.length ? r.hist[r.hist.length - 1][1] : 0, due = r.due != null && r.due <= Date.now();
    if (last >= 0.8 && r.streak > 0) return el("span", { class: "badge mech-state" }, "✓ Drawn right" + (due ? ", due again" : ""));
    return el("span", { class: "badge mech-state" }, "Practising");
  }
  const open = (id, mode) => { location.hash = "#" + id + (mode ? "/" + mode : "") };
  const firstMode = id => { const r = state(id); return r && r.n ? "solo" : "watch" };

  function catalogue() {
    const all = list(), groups = [];
    all.forEach(m => { let g = groups.find(x => x.name === m.class); if (!g) groups.push(g = { name: m.class || "Other", items: [] }); g.items.push(m) });
    const surprise = () => {
      const fresh = all.filter(m => { const r = state(m.id); return !r || !r.n || (r.due != null && r.due <= Date.now()) }), pool = fresh.length ? fresh : all;
      const m = pool[Math.floor(Math.random() * pool.length)]; if (m) open(m.id, "solo");
    };
    const title = el("h1", { class: "page-title", tabindex: "-1" }, "Mechanisms");
    app.append(title,
      el("p", { class: "lead" }, "Every curved arrow starts at electrons, a lone pair or a bond, and ends where those electrons go. Watch a mechanism once, then draw its arrows yourself until you can do it with nothing in front of you."),
      all.length ? el("div", { class: "btn-row" }, el("button", { type: "button", class: "btn primary", id: "surprise", on: { click: surprise } }, "Surprise me")) : el("p", { class: "empty" }, "No mechanisms have been added yet."));
    groups.forEach(g => {
      app.append(withHtml(el("h2", { class: "mech-group" }), nice(g.name)),
        el("ul", { class: "mech-list" }, g.items.map(m => el("li", {}, el("a", { class: "card tap mech-row", href: "#" + m.id },
          withHtml(el("span", { class: "mech-row-title" }), nice(m.title)),
          el("span", { class: "small muted mech-row-steps" }, m.steps + (m.steps === 1 ? " step" : " steps")), mark(m.id))))));
    });
    return title;
  }

  function train(id, mode) {
    const all = list(), at = all.findIndex(m => m.id === id), box = el("div", { class: "mech-host" });
    const back = el("a", { class: "btn ghost small", href: "#" }, "All mechanisms");
    const other = all.length > 1 ? el("button", { type: "button", class: "btn small", on: { click: () => { const m = all[(at + 1 + all.length) % all.length]; open(m.id) } } }, "Next mechanism") : null;
    app.append(el("div", { class: "btn-row mech-nav" }, back, other), box);
    if (!ORGO.mech || !ORGO.mech.mount) { box.appendChild(el("p", { class: "empty" }, "The mechanism trainer did not load.")); return back }
    trainer = ORGO.mech.mount(box, id, { mode: mode || firstMode(id) });
    return back;
  }

  function route(first) {
    if (trainer) { trainer.destroy(); trainer = null }
    app.textContent = "";
    const [id, mode] = decodeURIComponent(location.hash.replace(/^#/, "")).split("/");
    const focus = id && list().some(m => m.id === id) ? train(id, mode) : catalogue();
    if (!first && focus && focus.focus) focus.focus();
    window.scrollTo(0, 0);
  }

  ORGO.ready(() => {
    app.appendChild(el("p", { class: "muted" }, "Loading the mechanisms."));
    ORGO.need("mech").then(() => { route(true); window.addEventListener("hashchange", () => route(false)) },
      () => { app.textContent = ""; app.appendChild(el("p", { class: "empty" }, "The mechanisms could not be loaded. Reload the page to try again.")) });
  });
})();
