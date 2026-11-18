// CHEM 225 · Readings, as the class shows them on its own: the list of chapters, and the reader for one chapter.
// Inside Eureka the readings are shown by Eureka's reader instead (read/index.html, with read/chapters.js); this page is
// then reached only outside Eureka, through alone/read/index.html.
// alone/read/index.html            the chapter list
// alone/read/index.html#rings-1    one chapter (add /sectionId to land on a section)
// Sections read are kept in orgo-read-v1 as {chapterId: {sectionId: time stamp, done, finished}}; the answers to the "why" cards
// in orgo-read-why-v1 as {chapterId: {sectionId: "got" | "not"}}; the text size in orgo-prefs-v1 as textSize.
// Eureka's reader keeps orgo-read-v1 too, in its own shape: {chapterId: {at, a, w, done, finished}}, where at is the number of
// passages read. Such a save is read here as "the first `at` sections are read" (all of them when finished), and whatever
// else is found under the key that is not a save at all counts as nothing read: this page never stops on it.
(() => {
  const O = window.ORGO; if (!O) return;
  const el = O.el, store = O.store;
  const app = document.getElementById("app");
  const READ = "read-v1", WHY = "read-why-v1", PREFS = "prefs-v1";
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let watcher = null, timers = [];

  const niceDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? MONTHS[+m[2] - 1] + " " + (+m[3]) : (iso || "") };
  const chapters = () => (O.data.chapterList || []).slice().sort((a, b) => (a.n || 0) - (b.n || 0));
  const obj = x => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
  const readOf = id => obj(obj(store.get(READ, {}))[id]);
  const readIn = (r, s, i) => !!r[s.id] || (!!r.a && typeof r.a === "object" && (!!r.finished || i < (r.at | 0)));      // the second half: a save of Eureka's reader
  const doneCount = ch => { const r = readOf(ch.id); return (ch.sections || []).filter((s, i) => readIn(r, s, i)).length };
  const frag = h => { try { return O.html(h) } catch (e) { const d = document.createElement("div"); d.innerHTML = String(h || ""); return d } };
  const clean = () => { if (watcher) { watcher.disconnect(); watcher = null } timers.forEach(clearTimeout); timers = [] };

  // ------------------------------------------------------------------ the chapter list
  function list() {
    clean(); app.className = "wrap"; app.textContent = ""; document.title = "CHEM 225 · Readings";
    const chs = chapters();
    app.append(el("p", { class: "eyebrow" }, "Readings"), el("h1", { class: "page-title" }, "The lectures, rebuilt"),
      el("p", { class: "lead" }, "Each lecture is a short chapter. Read a section, answer its question, then try the practice under it."));
    if (!chs.length) { app.append(el("div", { class: "empty" }, el("p", {}, "No readings are here yet."), el("a", { class: "btn", href: O.base + "index.html" }, "Back to the class"))); return }
    const next = chs.find(c => doneCount(c) < (c.sections || []).length);
    const ol = el("ol", { class: "ch-list" });
    chs.forEach(c => {
      const total = (c.sections || []).length, done = doneCount(c), all = total > 0 && done === total;
      ol.append(el("li", {}, el("a", { class: "card tap ch-card", href: "#" + c.id },
        el("span", { class: "ch-n", "aria-hidden": "true" }, String(c.n == null ? "" : c.n)),
        el("span", { class: "ch-main" },
          el("span", { class: "ch-title" }, "Reading " + c.n + ": " + c.title),
          el("span", { class: "muted small" }, "Lecture of " + niceDate(c.lecture)),
          el("span", { class: "bar", role: "img", "aria-label": done + " of " + total + " sections read" }, el("i", { style: { width: (total ? Math.round(100 * done / total) : 0) + "%" } })),
          el("span", { class: "muted small" }, all ? "✓ All " + total + " sections read" : done + " of " + total + " sections read")),
        c === next ? el("span", { class: "btn primary small ch-go" }, "Continue") : null)));
    });
    app.append(ol);
  }

  // ------------------------------------------------------------------ the original page, in a sheet
  function pageButton(spec) {
    const m = /^([A-Za-z0-9]+):(\d+)$/.exec(spec); if (!m) return null;
    const src = O.base + "archive/pages/" + m[1] + "-" + m[2] + ".png", title = "Original notes, page " + m[2];
    return el("button", { class: "btn small", type: "button", on: { click: () => {
      const img = el("img", { class: "orig-page", src, alt: "The professor's handwritten notes, page " + m[2] });
      const body = el("div", { class: "orig-view" }, img);
      img.addEventListener("error", () => { body.textContent = ""; body.append(el("p", { class: "muted" }, "The picture of this page is not here.")) });
      O.ui.sheet({ title, body, wide: true });
    } } }, "See the original notes, page " + m[2]);
  }

  // ------------------------------------------------------------------ the reader
  function reader(ch, sectionId) {
    clean(); app.className = "wrap reader-wrap"; app.textContent = ""; document.title = "CHEM 225 · " + ch.title;
    const sections = ch.sections || [], chs = chapters();
    const seen = {};                                  // sections whose bottom has been on screen
    const marks = {};                                 // sectionId -> function that redraws its "read" line
    const tocLinks = {};

    const isRead = sid => { const i = sections.findIndex(s => s.id === sid); return i >= 0 && readIn(readOf(ch.id), sections[i], i) };
    const whyOf = sid => obj(obj(store.get(WHY, {}))[ch.id])[sid];
    function markRead(sid, on) {
      let finished = 0;
      store.update(READ, all => {
        all = obj(all); const c = all[ch.id] = obj(all[ch.id]); if (on) c[sid] = c[sid] || Date.now(); else delete c[sid];
        // a chapter with every section read is also marked the way Eureka's reading badges look for it (done, finished):
        // it counts once for each day it is completed, so coming back to a chapter on a later day polishes its badge
        if (on && (ch.sections || []).every(s => c[s.id])) { const day = new Date().toDateString(); if (c._day !== day) { c.done = (c.done | 0) + 1; c._day = day; finished = c.done } c.finished = true }
        return all }, {});
      if (finished) O.eureka.chapter(ch.id, finished);
      if (marks[sid]) marks[sid]();
      progress(); O.emit("progress", {});
      if (on && sections.every(s => isRead(s.id)) && O.eureka && O.eureka.done) O.eureka.done("read:" + ch.id);
    }
    function maybeRead(s) { if (!isRead(s.id) && seen[s.id] && (!s.why || whyOf(s.id))) markRead(s.id, true) }

    // text size
    const SIZES = [["s", "Small"], ["m", "Medium"], ["l", "Large"]];
    const col = el("div", { class: "reader" });
    const seg = el("div", { class: "seg", role: "group", "aria-label": "Text size" });
    function setSize(v, save) { col.dataset.size = v; [...seg.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === v))); if (save) store.update(PREFS, p => { p = p || {}; p.textSize = v; return p }, {}) }
    SIZES.forEach(([v, name], i) => seg.append(el("button", { type: "button", class: "size-" + v, data: { v }, "aria-label": "Text size: " + name.toLowerCase(), on: { click: () => setSize(v, true) } }, "A")));

    // the table of contents
    const bar = el("div", { class: "bar", role: "img" }, el("i", {})), barText = el("p", { class: "muted small" });
    function progress() {
      const done = sections.filter(s => isRead(s.id)).length;
      bar.firstChild.style.width = (sections.length ? Math.round(100 * done / sections.length) : 0) + "%";
      bar.setAttribute("aria-label", done + " of " + sections.length + " sections read"); barText.textContent = done + " of " + sections.length + " sections read";
      sections.forEach(s => { const a = tocLinks[s.id]; if (a) { const r = isRead(s.id); a.querySelector(".toc-tick").textContent = r ? "✓" : ""; a.setAttribute("aria-label", s.title + (r ? ", read" : "")) } });
    }
    const jump = sid => e => { e.preventDefault(); const t = document.getElementById("s-" + sid); if (t) { t.scrollIntoView({ behavior: O.reduced ? "auto" : "smooth", block: "start" }); t.focus({ preventScroll: true }) } };
    const toc = el("nav", { class: "toc", "aria-label": "In this reading" },
      el("a", { class: "small", href: "#" }, "← All readings"),
      el("p", { class: "eyebrow" }, "In this reading"),
      el("ol", {}, sections.map(s => el("li", {}, tocLinks[s.id] = el("a", { href: "#" + ch.id + "/" + s.id, on: { click: jump(s.id) } }, el("span", { class: "toc-tick", "aria-hidden": "true" }), el("span", {}, s.title))))),
      bar, barText);

    // the head
    const prose = el("article", { class: "prose" });
    const pages = []; sections.forEach(s => (s.pages || []).forEach(p => { if (!pages.includes(p)) pages.push(p) }));
    prose.append(
      el("p", { class: "eyebrow" }, "Reading " + ch.n),
      el("h1", { class: "page-title" }, ch.title),
      el("p", { class: "muted" }, "From the lecture of " + niceDate(ch.lecture) + (ch.from ? " (" + ch.from + ")" : "")),
      el("div", { class: "row reader-tools" }, el("span", { class: "muted small", "aria-hidden": "true" }, "Text size"), seg),
      pages.length ? el("div", { class: "btn-row orig-row" }, pages.map(pageButton)) : null);
    if ((ch.goals || []).length) prose.append(el("div", { class: "panel goals" }, el("h2", {}, "After this reading you can"), el("ul", {}, ch.goals.map(g => el("li", {}, frag(g))))));

    // the sections
    sections.forEach((s, i) => {
      const sec = el("section", { class: "rsec", id: "s-" + s.id, tabindex: "-1", "aria-labelledby": "h-" + s.id });
      sec.append(el("h2", { id: "h-" + s.id }, s.title), el("div", { class: "rsec-body" }, frag(s.html)));
      (s.micro || []).forEach(m => sec.append(el("details", { class: "more micro" }, el("summary", {}, "Closer look: " + (m.t || "")), el("div", { class: "more-body" }, frag(m.h)))));
      (s.macro || []).forEach(m => sec.append(el("details", { class: "more macro" }, el("summary", {}, "Bigger picture: " + (m.t || "")), el("div", { class: "more-body" }, frag(m.h)))));
      if (s.why && s.why.q) sec.append(whyCard(s));
      if ((s.check || []).length) sec.append(checks(s));

      // the "read" line
      const line = el("div", { class: "row read-line" });
      marks[s.id] = () => {
        line.textContent = "";
        if (isRead(s.id)) line.append(el("span", { class: "badge read-badge" }, "✓ Read"), el("button", { class: "btn ghost small", type: "button", on: { click: () => { seen[s.id] = false; markRead(s.id, false) } } }, "Mark as not read"));
        else line.append(el("button", { class: "btn small", type: "button", on: { click: () => markRead(s.id, true) } }, "Mark as read"));
      };
      marks[s.id]();
      const end = el("div", { class: "rsec-end", "aria-hidden": "true", data: { sid: s.id } });
      sec.append(line, end);
      prose.append(sec);
    });

    function whyCard(s) {
      const card = el("div", { class: "card why" }), ans = el("div", { class: "why-a", hidden: true }), status = el("p", { class: "small why-status", role: "status" });
      const say = v => { status.textContent = v === "got" ? "✓ You marked this: got it." : v === "not" ? "↻ You marked this: not yet. Read the passage once more, then try again." : "" };
      const answer = v => { store.update(WHY, all => { all = obj(all); (all[ch.id] = obj(all[ch.id]))[s.id] = v; return all }, {}); say(v); press(v); maybeRead(s) };
      const got = el("button", { class: "btn small", type: "button", "aria-pressed": "false", on: { click: () => answer("got") } }, "Got it");
      const not = el("button", { class: "btn small", type: "button", "aria-pressed": "false", on: { click: () => answer("not") } }, "Not yet");
      const press = v => { got.setAttribute("aria-pressed", String(v === "got")); not.setAttribute("aria-pressed", String(v === "not")) };
      const show = el("button", { class: "btn primary small", type: "button", on: { click: () => { ans.hidden = false; show.hidden = true; ans.focus() } } }, "Think, then show");
      ans.tabIndex = -1;
      ans.append(el("p", { class: "eyebrow" }, "Answer"), el("div", {}, frag(s.why.a)), el("div", { class: "btn-row" }, got, not));
      card.append(el("p", { class: "eyebrow" }, "Before you move on"), el("p", { class: "why-q" }, frag(s.why.q)), show, ans, status);
      const before = whyOf(s.id); if (before) { say(before); press(before) }
      return card;
    }

    function checks(s) {
      const box = el("div", { class: "checks stack" }, el("h3", {}, "Check yourself"));
      if (!(O.quiz && O.quiz.mount)) { box.append(el("p", { class: "muted" }, "The practice questions cannot be shown right now.")); return box }
      const slots = s.check.map(id => { const d = el("div", { class: "check-item" }); box.append(d); return [id, d] });
      const types = [...new Set(s.check.map(id => (O.data.index[id] || [])[0]).filter(Boolean))];
      O.need(types.map(t => "t/" + t)).catch(() => null).then(() => slots.forEach(([id, d]) => {
        const item = (O.data.items || {})[id];
        if (!item) { d.append(el("p", { class: "muted small" }, "A practice question is missing here.")); return }
        try { O.quiz.mount(d, item, {}) } catch (e) { console.error("check", id, e); d.append(el("p", { class: "muted small" }, "This question could not be shown.")) }
      }));
      return box;
    }

    // after the sections: homework, summary, next chapter
    if ((ch.homework || []).length) {
      const hw = el("section", { class: "rsec homework", "aria-labelledby": "h-homework" }, el("h2", { id: "h-homework" }, "Homework from the lecture"));
      ch.homework.forEach((h, i) => {
        const sol = el("div", { class: "hw-sol", hidden: true, tabindex: "-1" });
        if ((h.steps || []).length) sol.append(el("ol", { class: "steps" }, h.steps.map(st => el("li", { class: "step" }, el("div", {}, st.t ? el("div", { class: "step-n" }, frag(st.t)) : null, el("div", {}, frag(st.h)))))));
        if (h.answer) sol.append(el("div", { class: "callout good" }, el("b", {}, "Answer. "), frag(h.answer)));
        const show = el("button", { class: "btn primary small", type: "button", on: { click: () => { sol.hidden = false; show.hidden = true; sol.focus() } } }, "Show the worked steps");
        const pb = h.from ? pageButton(h.from) : null;
        hw.append(el("div", { class: "card hw" },
          el("p", { class: "eyebrow" }, "The professor's prompt" + (ch.homework.length > 1 ? " " + (i + 1) : "")),
          el("div", { class: "hw-q" }, frag(h.q)),
          el("p", { class: "muted small" }, "Try it first, on paper. Then compare."),
          el("div", { class: "btn-row" }, show, pb), sol));
      });
      prose.append(hw);
    }
    if ((ch.summary || []).length) prose.append(el("section", { class: "rsec", "aria-labelledby": "h-summary" }, el("h2", { id: "h-summary" }, "Summary"), el("ul", { class: "summary" }, ch.summary.map(x => el("li", {}, frag(x))))));
    const at = chs.findIndex(c => c.id === ch.id), nextCh = at >= 0 ? chs[at + 1] : null;
    prose.append(el("div", { class: "btn-row reader-next" },
      nextCh ? el("a", { class: "btn primary", href: "#" + nextCh.id }, "Next: Reading " + nextCh.n + ", " + nextCh.title) : null,
      el("a", { class: "btn", href: "#" }, "All readings")));

    col.append(prose); app.append(toc, col);
    setSize((store.get(PREFS, {}) || {}).textSize || "m", false); progress();

    // a section counts as read once its end has stayed on screen for a moment and its question is answered
    if ("IntersectionObserver" in window) {
      const wait = {};
      watcher = new IntersectionObserver(entries => entries.forEach(en => {
        const sid = en.target.dataset.sid, s = sections.find(x => x.id === sid); if (!s) return;
        if (en.isIntersecting) { if (!wait[sid]) { wait[sid] = setTimeout(() => { wait[sid] = 0; seen[sid] = true; maybeRead(s) }, 1500); timers.push(wait[sid]) } }
        else if (wait[sid]) { clearTimeout(wait[sid]); wait[sid] = 0 }
      }), { threshold: 0 });
      prose.querySelectorAll(".rsec-end").forEach(n => watcher.observe(n));
    }
    if (sectionId) { const t = document.getElementById("s-" + sectionId); if (t) requestAnimationFrame(() => t.scrollIntoView({ block: "start" })) } else window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------ routing
  let turn = 0;
  function route() {
    const h = decodeURIComponent(location.hash.replace(/^#/, "")), my = ++turn;
    if (!h) { list(); window.scrollTo(0, 0); return }
    const [id, sectionId] = h.split("/");
    const missing = () => { clean(); app.className = "wrap"; app.textContent = ""; app.append(el("div", { class: "empty" }, el("p", {}, "This reading is not here yet."), el("a", { class: "btn", href: "#" }, "All readings"))) };
    if (!/^[a-z0-9-]+$/i.test(id)) { missing(); return }
    if (O.data.chapters[id]) { reader(O.data.chapters[id], sectionId); return }
    O.need("read/" + id).then(() => { if (my !== turn) return; const ch = O.data.chapters[id]; ch ? reader(ch, sectionId) : missing() }, () => { if (my === turn) missing() });
  }
  window.addEventListener("hashchange", route);
  O.ready(route);
})();
