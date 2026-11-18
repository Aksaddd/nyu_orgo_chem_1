// CHEM 225 · Exam 2 Lab. The past exam worked question by question, and a trainer for every question type.
// exam/index.html             the two lists
// exam/index.html#q3          one question of the original exam
// exam/index.html#nuc-pairs   one question type: what to know, method, worked examples, practice
// exam/index.html?paper=1     today's "On paper" pair: one written or mechanism item and one chair item
(() => {
  const O = window.ORGO; if (!O) return;
  const el = O.el, L = O.learn;
  const app = document.getElementById("app");
  const frag = h => { try { return O.html(h) } catch (e) { const d = document.createElement("div"); d.innerHTML = String(h || ""); return d } };
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  const pts = n => n == null ? "" : plural(n, "point", "points");
  const hasQuiz = fn => !!(O.quiz && O.quiz[fn]);
  const noQuiz = () => el("p", { class: "muted" }, "The questions cannot be shown right now.");
  const start = title => { app.className = "wrap"; app.textContent = ""; document.title = "CHEM 225 · " + title; window.scrollTo(0, 0) };
  const back = () => el("a", { class: "small back", href: "#" }, "← Exam 2 Lab");
  const empty = (text, label, href) => el("div", { class: "empty" }, el("p", {}, text), el("a", { class: "btn", href: href || "#" }, label || "Back to the Exam 2 Lab"));
  const dots = level => O.ui.levelDots ? O.ui.levelDots(level) : el("span", { class: "dots", "aria-hidden": "true" }, [1, 2, 3, 4].map(i => el("i", { class: i <= level ? "on" : "" })));
  const mastery = id => { try { return L.mastery(id) } catch (e) { return { level: 0, label: "New", delayed: null, delayedN: 0 } } };
  const loadFor = ids => O.need([...new Set(ids.map(id => (O.data.index[id] || [])[0]).filter(Boolean))].map(t => "t/" + t)).catch(() => null);

  // ------------------------------------------------------------------ home
  function typeCard(t) {
    const m = mastery(t.id), c = t.count || {}, w = c.worked || 0, p = (c.practice || 0) + (c.exam || 0);
    return el("a", { class: "card tap type-card", href: "#" + t.id },
      el("span", { class: "row type-top" }, el("span", { class: "badge" }, t.exam || ""), t.points ? el("span", { class: "muted small" }, pts(t.points)) : null),
      el("span", { class: "type-title" }, t.title),
      el("span", { class: "row small" }, dots(m.level), el("span", {}, m.label)),
      el("span", { class: "muted small" }, w || p ? plural(w, "worked example", "worked examples") + ", " + plural(p, "practice question", "practice questions") : "Nothing to practise yet"));
  }
  function home() {
    start("Exam 2 Lab");
    app.append(el("p", { class: "eyebrow" }, "Exam 2 Lab"), el("h1", { class: "page-title" }, "Train for the exam you will sit"),
      el("p", { class: "lead" }, "First the Fall 2024 exam, worked step by step. Then every kind of question it asks, each with what you need to know, a method, worked examples and practice."));
    const past = el("section", { class: "stack lab-part", "aria-labelledby": "h-past" }, el("h2", { id: "h-past" }, "The Fall 2024 exam, worked"));
    const types = el("section", { class: "stack lab-part", "aria-labelledby": "h-types" }, el("h2", { id: "h-types" }, "Every question type"));
    app.append(past, types);

    const bp = O.data.blueprint || [];
    [["exam", "On the past exam"], ["lecture", "From the lectures"]].forEach(([g, name]) => {
      const set = bp.filter(t => t.group === g); if (!set.length) return;
      types.append(el("h3", {}, name), el("div", { class: "grid" }, set.map(typeCard)));
    });
    if (!bp.length) types.append(el("p", { class: "muted" }, "The list of question types is not here yet."));

    const my = turn;
    O.need("exam").catch(() => null).then(() => {
      if (my !== turn) return;
      const ex = O.data.exam, qs = (ex && ex.questions) || [];
      if (!qs.length) { past.append(el("p", { class: "muted" }, "The worked exam is not here yet.")); return }
      if (ex.rules && ex.rules.length) past.append(el("ul", { class: "muted small exam-rules" }, ex.rules.map(r => el("li", {}, frag(r)))));
      past.append(el("div", { class: "grid" }, qs.map(q => el("a", { class: "card tap q-card", href: "#q" + q.n },
        el("span", { class: "eyebrow" }, "Question " + q.n),
        el("span", { class: "type-title" }, q.title || ""),
        el("span", { class: "muted small" }, (q.parts || []).map(p => p.label ? "Part " + p.label + ": " + pts(p.pts) : pts(p.pts)).join(" · "))))));      // a question in one part has no letter
    });
  }

  // ------------------------------------------------------------------ one original question
  function paperButton(pages, n) {
    return el("button", { class: "btn small", type: "button", on: { click: () => {
      const body = el("div", { class: "orig-view" }, pages.map(p => {
        const img = el("img", { class: "orig-page", src: O.base + "archive/pages/EX-" + String(p).padStart(2, "0") + ".png", alt: "Fall 2024 Exam 2, page " + p });
        const wrap = el("figure", {}, img, el("figcaption", { class: "muted small" }, "Page " + p));
        img.addEventListener("error", () => { wrap.textContent = ""; wrap.append(el("p", { class: "muted" }, "The picture of page " + p + " is not here.")) });
        return wrap;
      }));
      O.ui.sheet({ title: "Question " + n + " on the exam paper", body, wide: true });
    } } }, "See it on the exam paper");
  }
  function question(n) {
    const my = turn;
    O.need("exam").catch(() => null).then(() => {
      if (my !== turn) return;
      const ex = O.data.exam, q = ex && (ex.questions || []).find(x => String(x.n) === String(n));
      start("Question " + n);
      if (!q) { app.append(back(), empty("Question " + n + " is not worked here yet.")); return }
      app.append(back(), el("p", { class: "eyebrow" }, (ex.title || "The past exam") + " · Question " + q.n), el("h1", { class: "page-title" }, q.title || "Question " + q.n),
        el("div", { class: "callout info" }, el("b", {}, "How to use this. "), "Work it on paper first. The steps appear after you answer."));
      const parts = q.parts || [], slots = [], all = [];
      parts.forEach(p => {
        const ids = p.items || (p.item ? [p.item] : []), t = O.type(p.type), pages = p.pages || (p.page ? [p.page] : q.pages) || [];
        const sec = el("section", { class: "card q-part stack", "aria-labelledby": "h-part-" + p.label },
          el("div", { class: "row q-part-head" }, el("h2", { id: "h-part-" + p.label }, p.label ? "Part " + p.label : "The whole question"), el("span", { class: "badge" }, pts(p.pts))),
          el("p", { class: "small" }, t ? ["This trains: ", el("a", { href: "#" + t.id }, t.title)] : null),
          pages.length ? el("div", { class: "btn-row" }, paperButton(pages, q.n)) : null);
        ids.forEach(id => { const d = el("div", { class: "q-item" }); sec.append(d); slots.push([id, d]); all.push(id) });
        if (!ids.length) sec.append(el("p", { class: "muted" }, "This part is not worked here yet."));
        app.append(sec);
      });
      const qs = (ex.questions || []), at = qs.indexOf(q), nx = qs[at + 1];
      app.append(el("div", { class: "btn-row" }, nx ? el("a", { class: "btn primary", href: "#q" + nx.n }, "Next: Question " + nx.n) : null, el("a", { class: "btn", href: "#" }, "Back to the Exam 2 Lab")));
      loadFor(all).then(() => { if (my !== turn) return; slots.forEach(([id, d]) => {
        const item = (O.data.items || {})[id];
        if (!item) { d.append(el("p", { class: "muted small" }, "This part's question is missing.")); return }
        if (!hasQuiz("mount")) { d.append(noQuiz()); return }
        try { O.quiz.mount(d, item, {}) } catch (e) { console.error("exam item", id, e); d.append(el("p", { class: "muted small" }, "This question could not be shown.")) }
      }) });
    });
  }

  // ------------------------------------------------------------------ one question type
  const GEN = { "chair-read": "chair", "chair-both": "chair", "e2-ring-product": "chair", "energy-diagrams": "energy" };
  function generate(id, seed) {
    const mod = O[GEN[id]]; if (!mod || !mod.make) return null;
    try { return GEN[id] === "chair" || mod.make.length >= 2 ? mod.make(id, seed) : mod.make(seed) } catch (e) { console.error("generator", id, e); return null }
  }
  function type(id) {
    const my = turn, bp = O.type(id);
    O.need("t/" + id).catch(() => null).then(() => {
      if (my !== turn) return;
      const t = (O.data.types || {})[id], info = t || bp || {}, title = info.title || (bp && bp.title) || id;
      const worked = O.itemsOf(id, "worked").filter(x => (O.data.items || {})[x]);
      const practice = O.itemsOf(id).filter(x => O.data.index[x][2] !== "worked");
      const canGen = !!(GEN[id] && O[GEN[id]] && O[GEN[id]].make);
      start(title);
      app.append(back(), el("p", { class: "eyebrow" }, [(bp && bp.exam) || info.exam || "", (info.points || (bp && bp.points)) ? pts(info.points || bp.points) : ""].filter(Boolean).join(" · ")),
        el("h1", { class: "page-title" }, title), el("p", { class: "lead" }, frag(info.asks || (bp && bp.asks) || "")));
      if (!t && !worked.length && !practice.length && !canGen) { app.append(empty("Nothing has been written for this question type yet.", "See all question types")); return }

      const m = mastery(id);
      app.append(el("p", { class: "row mastery-line" }, dots(m.level), el("b", {}, m.label),
        m.delayed != null ? el("span", { class: "muted" }, "Delayed accuracy " + Math.round(m.delayed * 100) + "% (" + plural(m.delayedN || 0, "answer", "answers") + " given on a later day than the answer before)") : el("span", { class: "muted" }, "Come back tomorrow: answers given a day later are what count.")));

      const tabs = [];
      if (t && (t.know || []).length) tabs.push({ id: "know", label: "What you need to know", render: p => {
        p.append(el("ul", { class: "know" }, t.know.map(k => el("li", {}, el("div", {}, frag(k.h)), k.from ? el("div", { class: "muted small" }, "From: " + k.from) : null))));
      } });
      if (t && ((t.method || []).length || (t.pitfalls || []).length)) tabs.push({ id: "method", label: "Method", render: p => {
        if ((t.method || []).length) p.append(el("h2", {}, "The method, in order"), el("ol", { class: "steps" }, t.method.map(s => el("li", { class: "step" }, el("div", {}, frag(s))))));
        if ((t.pitfalls || []).length) p.append(el("div", { class: "callout warn" }, el("b", {}, "Common mistakes"), el("ul", {}, t.pitfalls.map(x => el("li", {}, frag(x.h || x))))));
      } });
      tabs.push({ id: "worked", label: "Worked examples", render: p => {
        if (!worked.length) { p.append(el("p", { class: "muted" }, "No worked example for this type yet. Try the practice questions.")); return }
        if (!hasQuiz("worked")) { p.append(noQuiz()); return }
        worked.forEach((wid, i) => {
          const item = O.data.items[wid], host = el("div", { class: "more-body" }); let drawn = false;
          const draw = () => { if (drawn) return; drawn = true; try { O.quiz.worked(host, item) } catch (e) { console.error("worked", wid, e); host.append(el("p", { class: "muted small" }, "This example could not be shown.")) } };
          let label = ""; try { label = O.text(item.stem || "") } catch (e) { }
          if (label.length > 80) label = label.slice(0, 77).replace(/\s+\S*$/, "") + "…";
          const d = el("details", { class: "more worked-ex" }, el("summary", {}, "Worked example " + (i + 1) + (label ? ": " + label : "")), host);
          d.addEventListener("toggle", () => { if (d.open) draw() });
          if (i === 0) { d.open = true; draw() }
          p.append(d);
        });
      } });
      tabs.push({ id: "practice", label: "Practice", render: p => {
        const host = el("div", { class: "practice-host" }); p.append(host);
        let ids = [], running = false, warn = null;      // running: the session has a question on screen that is not finished yet
        try { ids = L.pick({ types: [id], n: 10, mode: "mixed" }) } catch (e) { console.error(e) }
        if (!ids.length) host.append(el("p", { class: "muted" }, canGen ? "No written practice questions for this type yet. Use endless practice below." : "No practice questions for this type yet."));
        else if (!hasQuiz("session")) host.append(noQuiz());
        // no kind: practice of one type ticks no step of the study plan (not "Practise, mixed")
        else { try { running = true; O.quiz.session(host, ids, { title: (bp && bp.short) || title, onEnd: () => { running = false; if (warn) warn.remove() } }) } catch (e) { console.error("session", e); running = false; host.append(noQuiz()) } }
        if (canGen && hasQuiz("mount")) {
          const box = el("div", { class: "endless stack" }), count = el("p", { class: "muted small", role: "status" }); let n = 0;
          const next = () => {
            const item = generate(id, Date.now() + n); box.textContent = "";
            if (!item) { box.append(el("p", { class: "muted" }, "A new question could not be made right now.")); return }
            n++; count.textContent = "Endless practice, question " + n;
            const slot = el("div", {}), more = el("button", { class: "btn primary", type: "button", hidden: true, on: { click: next } }, "Another one");
            box.append(count, slot, el("div", { class: "btn-row" }, more));
            // the number keys may answer it: it is the one open question on the page (see begin)
            try { O.quiz.mount(slot, item, { keys: true, onDone: () => { more.hidden = false } }) } catch (e) { console.error("endless", e); more.hidden = false }
            setTimeout(() => { more.hidden = false }, 60000);       // never leave the reader stuck if a question does not report back
          };
          // One open question at a time, so that a number key answers the question in front of the student and never one
          // further up: endless practice started while the session still runs closes the session (its answers are saved).
          const begin = e => {
            e.currentTarget.hidden = true;
            if (running) { running = false; if (warn) warn.remove(); host.replaceWith(el("div", { class: "practice-host" }, el("p", { class: "muted" }, "The practice session is closed. The answers you gave in it are saved."),
              el("div", { class: "btn-row" }, el("button", { class: "btn small", type: "button", on: { click: () => tabsCtl.show("practice") } }, "Start a new practice session")))) }
            next();
          };
          if (running) warn = el("span", {}, " Starting them closes the practice session above.");
          p.append(el("div", { class: "panel endless-wrap stack" }, el("h2", {}, "Endless practice"), el("p", { class: "muted small" }, "Fresh questions made on the spot, one after another. They do not run out.", warn),
            el("div", { class: "btn-row" }, el("button", { class: "btn", type: "button", on: { click: begin } }, "Endless practice")), box));
        }
      } });
      const host = el("div", { class: "type-tabs" }); app.append(host);
      const first = (t && (t.know || []).length) ? "know" : worked.length ? "worked" : "practice";
      const tabsCtl = O.ui.tabs(host, tabs, mastery(id).level >= 1 && practice.length ? "practice" : first);
    });
  }

  // ------------------------------------------------------------------ on paper: one written or mechanism item, one chair item
  function paper() {
    start("On paper");
    const all = L.all ? L.all() : {}, idx = O.data.index || {};
    const last = id => (all[id] && all[id].last) || 0;
    const oldest = kinds => Object.keys(idx).filter(id => kinds.includes(idx[id][1]) && idx[id][2] !== "worked").sort((a, b) => last(a) - last(b) || idx[b][3] - idx[a][3] || a.localeCompare(b))[0];
    const ids = [oldest(["written", "mech"]), oldest(["chair"])].filter(Boolean);
    app.append(el("a", { class: "small back", href: O.base + "index.html" }, "← Today's plan"), el("p", { class: "eyebrow" }, "Apply"), el("h1", { class: "page-title" }, "On paper"),
      el("p", { class: "lead" }, "Draw each answer by hand, the way you will in the exam room. Then check it against the model answer and the rubric."));
    if (!ids.length) { app.append(empty("There is nothing to do on paper yet.", "Open the Exam 2 Lab", location.pathname)); return }
    if (!hasQuiz("session")) { app.append(noQuiz()); return }
    const host = el("div", { class: "paper-host" }); app.append(host);
    let ended = false;
    loadFor(ids).then(() => {
      // "On paper" is done when every question of the pair was answered and marked, none skipped. The session gets no kind,
      // so it ticks nothing itself; the fixed 2 lets the step be done when only one paper question exists.
      try { O.quiz.session(host, ids, { title: "On paper", onEnd: r => { if (ended) return; ended = true; if (r && r.total && !(r.skipped || []).length) { L.did("paper", 2); O.emit("progress", {}) } } }) }
      catch (e) { console.error("paper", e); host.append(noQuiz()) }
    });
  }

  // ------------------------------------------------------------------ routing
  let turn = 0;
  function route() {
    turn++;
    const h = decodeURIComponent(location.hash.replace(/^#/, "")).split("/")[0];
    if (!h && new URLSearchParams(location.search).get("paper")) { paper(); return }
    if (!h) { home(); return }
    const q = /^q(\d+)$/i.exec(h);
    if (q) { question(q[1]); return }
    if (/^[a-z0-9-]+$/i.test(h) && (O.type(h) || (O.data.types || {})[h])) { type(h); return }
    start("Exam 2 Lab"); app.append(back(), empty("That page is not in the Exam 2 Lab."));
  }
  window.addEventListener("hashchange", route);
  O.ready(route);
})();
