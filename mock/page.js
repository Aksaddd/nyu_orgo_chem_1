// CHEM 225 · mock exams: the list, the timed exam room, and marking. History is kept in orgo-mock-v1.
(() => {
  const ORGO = window.ORGO, el = ORGO.el, L = ORGO.learn, D = ORGO.data, KEY = "mock-v1", HIST = "mock-history-v1";
  const ONSCREEN = ["mcq", "multi", "numeric", "rank", "classify"];
  let app, tick = null;
  const r1 = x => Math.round(x * 10) / 10;
  const btn = (label, cls, click, act) => el("button", { type: "button", class: "btn" + (cls ? " " + cls : ""), data: act ? { act } : null, on: { click } }, label);
  const typeName = id => { const t = ORGO.type(id); return t ? (t.short || t.title) : id };
  const stopClock = () => { if (tick) { clearInterval(tick); tick = null } };
  const clock = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}` };

  ORGO.ready(() => {
    app = document.getElementById("app");
    // Eureka's front page and study plan read orgo-mock-history-v1 ({at, right, total, pct, secs}, newest last, 50 at most).
    // Once: build it from the attempts this page saved before it existed.
    try { const old = ORGO.store.get(KEY, []); if (ORGO.store.raw(HIST) == null && Array.isArray(old) && old.length) ORGO.store.set(HIST, old.filter(a => a && a.max).map(a => ({ at: a.at, right: a.score, total: a.max, pct: Math.round(a.score / a.max * 100), secs: a.secs })).slice(-50)) } catch (e) { }
    if (!ORGO.quiz || !ORGO.quiz._widget) { app.appendChild(el("p", { class: "callout warn" }, "The question engine did not load. Reload the page.")); return }
    Promise.all(["exam", "mock"].map(n => ORGO.need(n).catch(() => null))).then(landing);
    window.addEventListener("pagehide", stopClock);
  });

  function exams() {
    const list = [];
    (D.mockList || []).forEach(m => {
      const id = typeof m === "string" ? m : m.id, x = (D.mocks || {})[id] || (m && m.questions ? m : null);
      list.push({ id, title: (x && x.title) || (m && m.title) || id, exam: x });
    });
    if (D.exam && D.exam.questions) list.push({ id: "fa24-exam-2", title: "The Fall 2024 exam itself", sub: D.exam.title, exam: D.exam });
    return list;
  }

  // ------------------------------------------------------------------ landing
  function landing() {
    stopClock(); app.textContent = ""; document.body.classList.remove("mock-room");
    const list = exams(), past = ORGO.store.get(KEY, []) || [];
    app.append(el("h1", { class: "page-title" }, "Mock exams"),
      el("p", { class: "lead" }, "Sit a full exam under exam conditions, then mark it against the model answers. The score matters less than finding what to study next."));
    const cards = list.map(x => {
      const nq = x.exam ? x.exam.questions.length : 0, mins = (x.exam && x.exam.minutes) || 110;
      return el("section", { class: "card mock-card", data: { exam: x.id } }, el("h2", {}, x.title), x.sub ? el("p", { class: "muted" }, x.sub) : null,
        x.exam ? el("p", {}, `${nq} question${nq === 1 ? "" : "s"}, ${mins} minutes.`) : el("p", { class: "muted" }, "This exam is not written yet."),
        x.exam && nq < 9 ? el("p", { class: "small muted" }, `Not complete yet: ${nq} of 9 questions are here, so the total is lower than 700.`) : null,
        x.exam && nq ? el("div", { class: "btn-row" }, btn("Start", "primary", () => start(x), "start")) : null);
    });
    app.appendChild(cards.length ? el("div", { class: "grid" }, cards) : el("div", { class: "empty" }, el("p", {}, "No mock exams are written yet."), el("a", { class: "btn primary", href: ORGO.base + "drill/index.html" }, "Practise instead")));
    app.appendChild(el("section", { class: "panel mock-rules" }, el("h2", {}, "The rules"), el("ul", {},
      el("li", {}, "110 minutes."),
      el("li", {}, "Nine questions of 100 points each. Choose seven and cross out two: 700 points. If you cross none out, questions 1 to 7 are graded."),
      el("li", {}, "Pen only. No notes and no paper of your own."),
      el("li", {}, "The model kit is allowed."),
      el("li", {}, "Write every answer on paper. You get no feedback until you finish, as in the real exam."))));
    app.appendChild(el("section", { class: "mock-past" }, el("h2", {}, "Your attempts"),
      past.length ? el("ul", { class: "mock-hist" }, past.slice().reverse().map(a => {
        const x = list.find(e => e.id === a.id), pct = a.max ? Math.round(a.score / a.max * 100) : 0;
        return el("li", {}, el("b", {}, `${r1(a.score)} of ${r1(a.max)}`), ` (${pct} percent), `, (x ? x.title : a.id) + ", ", new Date(a.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }));
      })) : el("p", { class: "muted" }, "None yet. Your scores will be listed here.")));
  }

  // ------------------------------------------------------------------ the exam room
  function start(x) {
    const exam = x.exam, ids = [];
    exam.questions.forEach(q => (q.parts || []).forEach(p => (p.items || (p.item ? [p.item] : [])).forEach(id => ids.push(id))));
    const names = [...new Set(ids.filter(id => !D.items[id] && D.index[id]).map(id => "t/" + D.index[id][0]))];
    if (ids.some(id => D.index[id] && D.index[id][1] === "mech")) names.push("mech");
    app.textContent = ""; app.appendChild(el("p", { class: "muted" }, "Setting the exam."));
    Promise.all(names.map(n => ORGO.need(n).catch(() => null))).then(() => room(x));
  }

  function room(x) {
    const exam = x.exam, qs = exam.questions, choose = exam.choose || 7, drop = Math.max(0, qs.length - choose), crossed = new Set();
    const total = (exam.minutes || 110) * 60; let left = total, endAt = 0, running = false, over = false;
    app.textContent = ""; document.body.classList.add("mock-room"); window.scrollTo(0, 0);

    // timer
    const time = el("span", { class: "mock-time", role: "timer", "aria-label": "Time left" }, clock(left)), state = el("span", { class: "badge mock-state" }, "Running");
    const pause = btn("Pause", "small", () => (running ? halt() : go()), "pause");
    const paint = () => { time.textContent = clock(left); state.textContent = over ? "Time is up" : running ? "Running" : "Paused"; pause.textContent = running ? "Pause" : "Resume"; pause.disabled = over };
    function go() { if (over) return; running = true; endAt = Date.now() + left * 1000; stopClock(); tick = setInterval(() => { left = (endAt - Date.now()) / 1000; if (left <= 0) { left = 0; over = true; running = false; stopClock(); ORGO.ui.toast("Time is up. Finish and mark when you are ready.") } paint() }, 500); paint() }
    function halt() { if (!running) return; left = Math.max(0, (endAt - Date.now()) / 1000); running = false; stopClock(); paint() }

    const barBox = el("section", { class: "card mock-bar" },
      el("div", { class: "mock-bar-main" }, el("h1", { class: "mock-title" }, x.title), el("span", { class: "mock-clock" }, time, " ", state)),
      el("div", { class: "btn-row" }, pause, btn("Print this exam", "small", () => window.print(), "print"), btn("Finish and mark", "primary small", askFinish, "finish"), btn("Leave", "ghost small", () => ORGO.ui.sheet({ title: "Leave this exam?", body: "Nothing from this attempt will be saved.", actions: [{ label: "Stay" }, { label: "Leave", primary: true, run: landing }] }), "leave")));
    const printHead = el("div", { class: "print-only" }, el("h1", {}, x.title + (x.sub ? ": " + x.sub : "")),
      el("p", {}, `${exam.minutes || 110} minutes. ` + (drop ? `Choose ${choose} of ${qs.length} questions and cross out the other ${drop}. ` : "") + "Pen only. The model kit is allowed."), el("p", {}, "Name: ______________________________"));
    const note = el("p", { class: "muted mock-note" }, drop ? `Cross out ${drop} question${drop > 1 ? "s" : ""}. If you cross none out, questions 1 to ${choose} are graded. ` : `This exam has ${qs.length} question${qs.length === 1 ? "" : "s"} so far, so every one is graded. `,
      "Write your answers on paper. Parts with choices or a number may be answered on screen. Nothing is marked until you finish.");
    app.append(barBox, printHead, note);

    // questions
    const parts = [];   // {q, part, entries: [{id, item, w, host}]}
    const blocks = qs.map(q => {
      const pts = (q.parts || []).reduce((a, p) => a + (+p.pts || 0), 0);
      const cross = drop ? el("button", { type: "button", class: "btn ghost small mock-cross", "aria-pressed": "false", data: { act: "cross" }, on: { click: () => {
        if (!crossed.has(q.n) && crossed.size >= drop) { ORGO.ui.toast(`You can cross out only ${drop} question${drop > 1 ? "s" : ""}. Put one back first.`); return }
        crossed.has(q.n) ? crossed.delete(q.n) : crossed.add(q.n); const on = crossed.has(q.n);
        cross.setAttribute("aria-pressed", String(on)); cross.textContent = on ? "✗ Crossed out. Put it back" : "Cross out this question"; sec.classList.toggle("crossed", on); gone.hidden = !on;
      } } }, "Cross out this question") : null;
      const gone = el("p", { class: "callout warn mock-gone", hidden: true }, "Crossed out. This question will not be graded.");
      const body = el("div", { class: "mock-q-body" }, (q.parts || []).map(p => {
        const ids = p.items || (p.item ? [p.item] : []), rec = { q, part: p, entries: [] }; parts.push(rec);
        return el("div", { class: "mock-part" }, el("h3", {}, `Part ${p.label}`, el("span", { class: "badge" }, `${p.pts} points`)), ids.length ? ids.map(id => {
          const item = D.items[id];
          if (!item) return el("p", { class: "muted" }, "This part is not written yet. It is left out of the total.");
          const w = ONSCREEN.includes(item.kind) ? ORGO.quiz._widget(item, { defer: true }) : null;
          const host = el("div", { class: "mock-item", data: { id, kind: item.kind } }, el("div", { class: "q-stem", html: item.stem || "" }),
            w ? el("div", { class: "mock-ans" }, w.el) : null,
            el("p", { class: "small muted mock-how" }, w ? "Answer on paper, or here on screen." : "Answer on paper." + (item.time ? ` About ${item.time} minutes.` : "")));
          rec.entries.push({ id, item, w, host }); return host;
        }) : el("p", { class: "muted" }, "This part is not written yet. It is left out of the total."));
      }));
      const sec = el("section", { class: "card mock-q", data: { n: q.n } }, el("header", { class: "mock-q-head" }, el("h2", {}, `Question ${q.n}`), el("span", { class: "badge" }, `${pts} points` + (q.partial ? " so far" : "")), cross), gone, body);
      return sec;
    });
    app.append(...blocks);
    app.appendChild(el("div", { class: "btn-row mock-end" }, btn("Finish and mark", "primary", askFinish, "finish")));
    go();

    function askFinish() {
      if (over || left <= 0) return marking();
      ORGO.ui.sheet({ title: "Finish and mark now?", body: `You still have ${clock(left)} left. You cannot return to the exam after this.`, actions: [{ label: "Keep working" }, { label: "Finish and mark", primary: true, run: () => { marking() } }] });
    }

    // ---------------------------------------------------------------- marking
    function marking() {
      halt(); stopClock(); document.body.classList.remove("mock-room"); document.body.classList.add("mock-marking");
      const used = total - left, open = qs.filter(q => !crossed.has(q.n)), graded = new Set(open.slice(0, choose).map(q => q.n));
      note.remove(); app.querySelectorAll(".mock-end, .mock-cross, .mock-how").forEach(n => n.remove());
      const marks = [];   // {q, label, type, id, pts, score(): number|null, auto}
      const sumLine = el("p", { class: "mock-sum", role: "status" }), save = btn("Save my result", "primary", trySave, "save");
      const update = () => {
        const got = marks.reduce((a, m) => a + (m.score() || 0) * m.pts, 0), max = marks.reduce((a, m) => a + m.pts, 0), todo = marks.filter(m => m.score() == null).length;
        sumLine.textContent = `Score so far: ${r1(got)} of ${r1(max)}. ` + (todo ? `${todo} part${todo > 1 ? "s" : ""} still to mark.` : "Everything is marked.");
        return { got, max, todo };
      };
      blocks.forEach((sec, i) => {
        const q = qs[i];
        if (!graded.has(q.n)) { sec.classList.add("crossed"); const g = sec.querySelector(".mock-gone"); if (g) { g.hidden = false; g.textContent = crossed.has(q.n) ? "Crossed out. Not graded." : `Not graded: only the first ${choose} questions that are not crossed out count.` } }
      });
      parts.forEach(rec => {
        if (!graded.has(rec.q.n) || !rec.entries.length) return;
        const share = (+rec.part.pts || 0) / rec.entries.length;
        rec.entries.forEach(e => {
          const item = e.item, box = el("div", { class: "mock-mark" }); let score = null, auto = false;
          if (e.w && e.w.touched() && e.w.ready()) { auto = true; score = e.w.mark(); box.appendChild(el("p", {}, el("b", {}, "Marked from your answer on screen: "), ORGO.quiz._mark(score >= 0.8, score >= 0.999 ? "Right" : score <= 0 ? "Not quite" : `Partly right: ${Math.round(score * 100)} percent`), `. ${r1(score * share)} of ${r1(share)} points.`)) }
          else {
            if (e.w) e.w.mark();
            if (item.kind === "written" && item.model) box.appendChild(el("div", { class: "panel q-model" }, el("h4", {}, "Model answer"), el("div", { html: item.model })));
            const lines = item.kind === "written" && item.rubric && item.rubric.length ? item.rubric : [{ pts: r1(share), h: "What is on your page matches the answer shown" }];
            const rb = ORGO.quiz._rubric(lines, () => { score = rb.done() ? rb.score() : null; update() });
            box.append(el("p", { class: "small muted" }, "Mark what is on your page: full, half or no credit for each line."), rb.el);
          }
          box.appendChild(el("details", { class: "more", open: e.w || item.kind === "written" ? null : true }, el("summary", {}, "Worked solution"), ORGO.quiz.solution(item)));
          e.host.appendChild(box);
          marks.push({ q: rec.q.n, label: rec.part.label, type: rec.part.type || item.type, id: e.id, pts: share, auto, score: () => score });
        });
      });
      barBox.textContent = "";
      barBox.append(el("h1", { class: "mock-title" }, "Mark your exam"), el("p", { class: "muted" }, `${x.title}. Time used: ${clock(used)}. Read each model answer, then mark your own page honestly.`), sumLine, el("div", { class: "btn-row" }, save));
      update(); window.scrollTo(0, 0);

      function trySave() {
        const s = update();
        if (s.todo) ORGO.ui.sheet({ title: "Some parts are not marked", body: `${s.todo} part${s.todo > 1 ? "s are" : " is"} not marked and will count as zero.`, actions: [{ label: "Go back and mark" }, { label: "Save anyway", primary: true, run: () => { doSave() } }] });
        else doSave();
      }
      function doSave() {
        const s = update(), byPart = {}, byQ = {}, byType = {};
        marks.forEach(m => {
          const got = (m.score() || 0) * m.pts, k = m.q + m.label;
          (byPart[k] = byPart[k] || { q: m.q, label: m.label, type: m.type, pts: 0, got: 0 }); byPart[k].pts += m.pts; byPart[k].got += got;
          (byQ[m.q] = byQ[m.q] || { pts: 0, got: 0 }); byQ[m.q].pts += m.pts; byQ[m.q].got += got;
          (byType[m.type] = byType[m.type] || { pts: 0, got: 0 }); byType[m.type].pts += m.pts; byType[m.type].got += got;
          if (m.id && !/^gen:/.test(m.id)) L.record(m.id, { score: m.score() || 0 });
        });
        const partsOut = Object.values(byPart).map(p => ({ q: p.q, label: p.label, type: p.type, pts: r1(p.pts), got: r1(p.got) }));
        ORGO.store.update(KEY, a => (Array.isArray(a) ? a : []).concat([{ id: x.id, at: Date.now(), score: r1(s.got), max: r1(s.max), secs: Math.round(used), parts: partsOut }]), []);
        L.did("mock"); try { ORGO.eureka.done("mock") } catch (e) { }
        const pct = s.max ? Math.round(s.got / s.max * 100) : 0;
        ORGO.store.update(HIST, h => (Array.isArray(h) ? h : []).concat([{ at: Date.now(), right: r1(s.got), total: r1(s.max), pct, secs: Math.round(used) }]).slice(-50), []);
        const weak = Object.keys(byType).map(t => ({ t, f: byType[t].pts ? byType[t].got / byType[t].pts : 1, ...byType[t] })).filter(w => w.f < 0.999).sort((a, b) => a.f - b.f || b.pts - a.pts).slice(0, 3);
        barBox.textContent = ""; barBox.dataset.saved = "1";
        barBox.append(el("h1", { class: "mock-title" }, "Your result"),
          el("p", { class: "mock-score" }, el("b", {}, `${r1(s.got)} of ${r1(s.max)}`), ` points, ${pct} percent.`),
          s.max < 700 ? el("p", { class: "small muted" }, "A full exam is out of 700. This one has fewer points because not every part was available or counted.") : null,
          el("h2", {}, "By question"),
          el("ul", { class: "mock-byq" }, Object.keys(byQ).map(n => el("li", {}, `Question ${n}: `, el("b", {}, `${r1(byQ[n].got)} of ${r1(byQ[n].pts)}`)))),
          el("h2", {}, "Study these next"),
          weak.length ? el("ul", { class: "mock-weak" }, weak.map(w => el("li", {}, el("a", { href: ORGO.base + "exam/index.html#" + w.t }, typeName(w.t)), `: ${r1(w.got)} of ${r1(w.pts)} points`)))
            : el("p", {}, "You earned full marks on every question type in this attempt."),
          el("p", { class: "small muted" }, "Your marked exam is below. The result is saved, and each question is now in your review schedule."),
          el("div", { class: "btn-row" }, btn("Back to the mock exams", "primary", () => { document.body.classList.remove("mock-marking"); landing(); window.scrollTo(0, 0) }, "back"), el("a", { class: "btn", href: ORGO.base + "index.html" }, "Home")));
        window.scrollTo(0, 0);
      }
    }
  }
})();
