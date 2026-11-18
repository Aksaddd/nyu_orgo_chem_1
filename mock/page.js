// CHEM 225 · mock exams: the list, the exam room, and marking. History is kept in orgo-mock-v1.
// The sitting on screen is kept in orgo-mock-run-v1 from Start until its result is saved, so a reload, a closed tab or a
// phone that drops the page loses nothing. It belongs to this device (Eureka's account sync leaves it out). Plain JSON:
//   {v, id: the exam, at: when it was started, timed, endAt (a time stamp, while the clock runs) or left (seconds, while it
//    does not), crossed: question numbers, answers: {item id: the control's get()}, and once finished: done, used, marks}
(() => {
  const ORGO = window.ORGO, el = ORGO.el, L = ORGO.learn, D = ORGO.data, KEY = "mock-v1", HIST = "mock-history-v1", RUN = "mock-run-v1", V = 1, DAY = 864e5;
  const ONSCREEN = ["mcq", "multi", "numeric", "rank", "classify"];
  let app, tick = null, live = null, unkept = false;      // live: what keeps the sitting on screen, until its result is saved; unkept: this browser refused the last save
  const r1 = x => Math.round(x * 10) / 10;
  const btn = (label, cls, click, act) => el("button", { type: "button", class: "btn" + (cls ? " " + cls : ""), data: act ? { act } : null, on: { click } }, label);
  const typeName = id => { const t = ORGO.type(id); return t ? (t.short || t.title) : id };
  const stopClock = () => { if (tick) { clearInterval(tick); tick = null } };
  const clock = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}` };
  const focus = e => { try { e.focus({ preventScroll: true }) } catch (x) { } };
  // the sitting kept, or null. One that is damaged, or was started more than a day ago, is removed without a question.
  const forget = () => ORGO.store.setRaw(RUN, null);
  function sitting() {
    if (ORGO.store.raw(RUN) == null) return null;
    const s = ORGO.store.get(RUN, null);
    if (s && typeof s === "object" && s.v === V && typeof s.id === "string" && typeof s.at === "number" && Date.now() - s.at < DAY) return s;
    forget(); return null;
  }
  // quiz.js shuffles the choices with Math.random. Seeded from the sitting's start and the question while each control is
  // built, the order is the same when the sitting is opened again: the letters are the ones the student saw and wrote down.
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0 };
  const seeded = a => () => { let t = a = a + 0x6D2B79F5 | 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 };
  function widget(item, at) { const r = Math.random; Math.random = seeded(hash(at + "#" + item.id)); try { return ORGO.quiz._widget(item, { defer: true }) } finally { Math.random = r } }

  ORGO.ready(() => {
    app = document.getElementById("app");
    // Eureka's front page and study plan read orgo-mock-history-v1 ({at, right, total, pct, secs}, newest last, 50 at most).
    // Once: build it from the attempts this page saved before it existed.
    try { const old = ORGO.store.get(KEY, []); if (ORGO.store.raw(HIST) == null && Array.isArray(old) && old.length) ORGO.store.set(HIST, old.filter(a => a && a.max).map(a => ({ at: a.at, right: a.score, total: a.max, pct: Math.round(a.score / a.max * 100), secs: a.secs })).slice(-50)) } catch (e) { }
    if (!ORGO.quiz || !ORGO.quiz._widget) { app.appendChild(el("p", { class: "callout warn" }, "The question engine did not load. Reload the page.")); return }
    Promise.all(["exam", "mock"].map(n => ORGO.need(n).catch(() => null))).then(() => landing());
    // a sitting open and not yet saved is written before the page goes. It comes back when the page is opened again, so the
    // browser asks before leaving only when this browser could not keep it (Eureka also reloads the page after another device saves)
    window.addEventListener("beforeunload", e => { if (!live) return; live(); if (unkept) { e.preventDefault(); e.returnValue = true } });      // returnValue: browsers before the standard
    window.addEventListener("pagehide", () => { if (live) live() });
    document.addEventListener("visibilitychange", () => { if (live && document.visibilityState === "hidden") live() });
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
  // back: drawn again from the exam room, so the keyboard focus goes to its heading
  function landing(back) {
    stopClock(); live = null; app.textContent = ""; document.body.classList.remove("mock-room", "mock-marking");
    const list = exams(), past = ORGO.store.get(KEY, []) || [];
    let run = sitting(); if (run && !list.some(x => x.id === run.id && x.exam)) { forget(); run = null }
    const head = el("h1", { class: "page-title", tabindex: "-1" }, "Mock exams"), says = [];
    app.append(head, el("p", { class: "lead" }, "Sit a full exam under exam conditions, then mark it against the model answers. The score matters less than finding what to study next."));
    const cards = list.map(x => {
      const nq = x.exam ? x.exam.questions.length : 0, mins = (x.exam && x.exam.minutes) || 110, mine = !!run && run.id === x.id;
      const say = mine ? el("p", { class: "panel mock-saved" }) : null; if (say) says.push(() => { const [a, b] = progress(run); say.textContent = ""; say.append(el("b", {}, a), " " + b) });
      return el("section", { class: "card mock-card", data: { exam: x.id } }, el("h2", {}, x.title), x.sub ? el("p", { class: "muted" }, x.sub) : null,
        x.exam ? el("p", {}, `${nq} question${nq === 1 ? "" : "s"}, ${mins} minutes.`) : el("p", { class: "muted" }, "This exam is not written yet."),
        x.exam && nq < 9 ? el("p", { class: "small muted" }, `Not complete yet: ${nq} of 9 questions are here, so the total is lower than 700.`) : null, say,
        x.exam && nq ? el("div", { class: "btn-row" }, mine ? btn(run.done ? "Continue marking" : "Continue the exam", "primary", () => start(x, run), "continue") : null,
          btn(mine ? "Start again" : "Start", mine ? "" : "primary", () => anew(x, true, run), "start"),
          btn(mine ? "Start again without the timer" : "Start without the timer", "", () => anew(x, false, run), "untimed")) : null);
    });
    app.appendChild(cards.length ? el("div", { class: "grid" }, cards) : el("div", { class: "empty" }, el("p", {}, "No mock exams are written yet."), el("a", { class: "btn primary", href: ORGO.base + "drill/index.html" }, "Practise instead")));
    app.appendChild(el("section", { class: "panel mock-rules" }, el("h2", {}, "The rules"), el("ul", {},
      el("li", {}, "110 minutes."),
      el("li", {}, "Nine questions of 100 points each. Choose seven and cross out two: 700 points. If you cross none out, questions 1 to 7 are graded."),
      el("li", {}, "Pen only. No notes and no paper of your own."),
      el("li", {}, "The model kit is allowed."),
      el("li", {}, "Write every answer on paper. You get no feedback until you finish, as in the real exam.")),
      el("p", { class: "small muted" }, "Without the timer you take the time you need. Sit at least one exam with the timer before the real one: it shows how you use the 110 minutes.")));
    app.appendChild(el("section", { class: "mock-past" }, el("h2", {}, "Your attempts"),
      past.length ? el("ul", { class: "mock-hist" }, past.slice().reverse().map(a => {
        const x = list.find(e => e.id === a.id), pct = a.max ? Math.round(a.score / a.max * 100) : 0;
        return el("li", {}, el("b", {}, `${r1(a.score)} of ${r1(a.max)}`), ` (${pct} percent), `, (x ? x.title : a.id) + (a.timed === false ? ", without the timer, " : ", "), new Date(a.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }));
      })) : el("p", { class: "muted" }, "None yet. Your scores will be listed here.")));
    says.forEach(f => f()); if (run && run.endAt && !run.done) tick = setInterval(() => says.forEach(f => f()), 1000);      // its clock runs on
    if (back) focus(head);
  }
  // what a card says of the sitting kept for its exam: its state, as the exam room names it, then the rest
  function progress(s) {
    if (s.done) return ["Finished.", "Your marks are not saved yet."];
    if (s.timed === false) return ["In progress.", "Without the timer."];
    const left = s.endAt ? (s.endAt - Date.now()) / 1000 : +s.left || 0;
    return left <= 0 ? ["Time is up.", "Finish and mark this exam when you are ready."] : s.endAt ? ["In progress.", `${clock(left)} left. The clock runs while the page is closed, as in the exam.`] : ["Paused.", `${clock(left)} left.`];
  }
  // a new sitting. One sitting is kept at a time, and the one kept is discarded only once the student says so.
  function anew(x, timed, run) {
    if (!run) return start(x, null, timed);
    const same = run.id === x.id, y = exams().find(e => e.id === run.id);
    ORGO.ui.sheet({ title: same ? "Start again?" : "Discard your exam in progress?", body: (same ? "The exam you started" : `Your ${y ? y.title : "exam"} in progress`) + " will be discarded. Nothing from it will be saved.",
      actions: [{ label: "Keep it" }, { label: same ? "Start again" : "Discard it and start", primary: true, run: () => { forget(); start(x, null, timed) } }] });
  }

  // ------------------------------------------------------------------ the exam room
  // run: the sitting kept, to open again · timed: with the 110-minute clock (the exam condition)
  function start(x, run, timed) {
    stopClock();
    const exam = x.exam, ids = [];
    exam.questions.forEach(q => (q.parts || []).forEach(p => (p.items || (p.item ? [p.item] : [])).forEach(id => ids.push(id))));
    const names = [...new Set(ids.filter(id => !D.items[id] && D.index[id]).map(id => "t/" + D.index[id][0]))];
    if (ids.some(id => D.index[id] && D.index[id][1] === "mech")) names.push("mech");
    app.textContent = ""; app.appendChild(el("p", { class: "muted" }, "Setting the exam."));
    Promise.all(names.map(n => ORGO.need(n).catch(() => null))).then(() => room(x, run, run ? run.timed !== false : timed !== false));
  }

  function room(x, run, timed) {
    const exam = x.exam, qs = exam.questions, choose = exam.choose || 7, drop = Math.max(0, qs.length - choose), crossed = new Set(), crossers = {};
    const total = (exam.minutes || 110) * 60, at = run ? run.at : Date.now();
    let left = total, endAt = 0, running = false, over = false, done = false, used = null, last = "", checked = 0, warned = false, rest = null, hide = [];
    stopClock(); app.textContent = ""; document.body.classList.add("mock-room"); window.scrollTo(0, 0);

    // timer: none in a sitting without the timer
    const time = timed ? el("span", { class: "mock-time", role: "timer", "aria-label": "Time left" }, clock(left)) : null, state = timed ? el("span", { class: "badge mock-state" }, "Running") : null;
    const pause = timed ? btn("Pause", "small", () => (running ? halt() : go()), "pause") : null;
    const paint = () => { if (!timed) return; time.textContent = clock(left); state.textContent = over ? "Time is up" : running ? "Running" : "Paused"; pause.textContent = running ? "Pause" : "Resume"; pause.disabled = over; cover() };
    // while a timed sitting is paused its questions are hidden, so the clock keeps showing the time the student used
    function cover() { if (!rest) return; const off = timed && !running && !over && !done; rest.hidden = !off; hide.forEach(n => n.hidden = off); printBtn.disabled = off; printBtn.title = off ? "Resume the clock to print the exam" : "" }
    function go(end) { if (over || !timed) return; running = true; endAt = end || Date.now() + left * 1000; paint(); keep() }
    function halt() { if (!running) return; left = Math.max(0, (endAt - Date.now()) / 1000); running = false; paint(); keep() }
    function beat() {
      if (running) { left = (endAt - Date.now()) / 1000; if (left <= 0) { left = 0; over = true; running = false; ORGO.ui.toast("Time is up. Finish and mark when you are ready."); keep() } paint() }
      if (Date.now() - checked >= 15000) keep();      // what no event reported is written within 15 seconds
    }
    // the sitting as it stands, written when it has changed
    function keep() {
      checked = Date.now(); if (live !== keep) return;      // saved, or left: nothing to keep
      const answers = {}, marks = {};
      parts.forEach(rec => rec.entries.forEach(e => { const a = e.w ? e.w.get() : null; if (a != null) answers[e.id] = a; if (e.rb) marks[e.id] = e.rb.marks.slice() }));
      const s = { v: V, id: x.id, at, timed, crossed: [...crossed], answers };
      if (done) Object.assign(s, { done: 1, used: used == null ? null : r1(used), marks }); else if (timed && running) s.endAt = endAt; else if (timed) s.left = r1(left);
      const str = JSON.stringify(s); if (str === last) return;
      unkept = !ORGO.store.set(RUN, s); if (!unkept) last = str; else if (!warned) { warned = true; ORGO.ui.toast("This browser cannot keep your exam as you go. A reload would lose it.", 6000) }
    }

    const title = el("h1", { class: "mock-title", tabindex: "-1" }, x.title), printBtn = btn("Print this exam", "small", () => window.print(), "print");
    const barBox = el("section", { class: "card mock-bar" },
      el("div", { class: "mock-bar-main" }, title, timed ? el("span", { class: "mock-clock" }, time, " ", state) : null),
      el("div", { class: "btn-row" }, pause, printBtn, btn("Finish and mark", "primary small", askFinish, "finish"), btn("Leave", "ghost small", () => ORGO.ui.sheet({ title: "Leave this exam?", body: "Nothing from this attempt will be saved.", actions: [{ label: "Stay" }, { label: "Leave", primary: true, run: () => { forget(); landing(true) } }] }), "leave")));
    const printHead = el("div", { class: "print-only" }, el("h1", {}, x.title + (x.sub ? ": " + x.sub : "")),
      el("p", {}, `${exam.minutes || 110} minutes. ` + (drop ? `Choose ${choose} of ${qs.length} questions and cross out the other ${drop}. ` : "") + "Pen only. The model kit is allowed."), el("p", {}, "Name: ______________________________"));
    const note = el("p", { class: "muted mock-note" }, timed ? null : `No timer in this sitting. The real exam gives ${exam.minutes || 110} minutes. `,
      drop ? `Cross out ${drop} question${drop > 1 ? "s" : ""}. If you cross none out, questions 1 to ${choose} are graded. ` : `This exam has ${qs.length} question${qs.length === 1 ? "" : "s"} so far, so every one is graded. `,
      "Write your answers on paper. Parts with choices or a number may be answered on screen. Nothing is marked until you finish.");
    app.append(barBox, printHead, note);

    // questions
    const parts = [];   // {q, part, entries: [{id, item, w, host, rb}]}
    const blocks = qs.map(q => {
      const pts = (q.parts || []).reduce((a, p) => a + (+p.pts || 0), 0);
      const cross = drop ? el("button", { type: "button", class: "btn ghost small mock-cross", "aria-pressed": "false", data: { act: "cross" }, on: { click: () => {
        if (!crossed.has(q.n) && crossed.size >= drop) { ORGO.ui.toast(`You can cross out only ${drop} question${drop > 1 ? "s" : ""}. Put one back first.`); return }
        setCross(!crossed.has(q.n)); keep();
      } } }, "Cross out this question") : null;
      const setCross = on => { on ? crossed.add(q.n) : crossed.delete(q.n); cross.setAttribute("aria-pressed", String(on)); cross.textContent = on ? "✗ Crossed out. Put it back" : "Cross out this question"; sec.classList.toggle("crossed", on); gone.hidden = !on };
      if (cross) crossers[q.n] = setCross;
      const gone = el("p", { class: "callout warn mock-gone", hidden: true }, "Crossed out. This question will not be graded.");
      const body = el("div", { class: "mock-q-body" }, (q.parts || []).map(p => {
        const ids = p.items || (p.item ? [p.item] : []), rec = { q, part: p, entries: [] }; parts.push(rec);
        return el("div", { class: "mock-part" }, el("h3", {}, p.label ? `Part ${p.label}` : "The whole question", el("span", { class: "badge" }, `${p.pts} points`)), ids.length ? ids.map(id => {
          const item = D.items[id];
          if (!item) return el("p", { class: "muted" }, "This part is not written yet. It is left out of the total.");
          const w = ONSCREEN.includes(item.kind) ? widget(item, at) : null;
          if (w && run && run.answers && run.answers[id] != null) w.set(run.answers[id]);      // as it was, unmarked
          // any change to an answer on screen is kept at once
          const host = el("div", { class: "mock-item", data: { id, kind: item.kind } }, el("div", { class: "q-stem", html: item.stem || "" }),
            w ? el("div", { class: "mock-ans", on: { click: keep, change: keep, input: keep } }, w.el) : null,
            el("p", { class: "small muted mock-how" }, w ? "Answer on paper, or here on screen." : "Answer on paper." + (item.time ? ` About ${item.time} minutes.` : "")));
          rec.entries.push({ id, item, w, host }); return host;
        }) : el("p", { class: "muted" }, "This part is not written yet. It is left out of the total."));
      }));
      const sec = el("section", { class: "card mock-q", data: { n: q.n } }, el("header", { class: "mock-q-head" }, el("h2", {}, `Question ${q.n}`), el("span", { class: "badge" }, `${pts} points` + (q.partial ? " so far" : "")), cross), gone, body);
      return sec;
    });
    app.append(...blocks);
    const end = el("div", { class: "btn-row mock-end" }, btn("Finish and mark", "primary", askFinish, "finish")); app.appendChild(end);
    rest = el("section", { class: "card mock-paused", role: "status" }, el("h2", {}, "Paused"), el("p", { class: "muted" }, "The questions are hidden while the clock is stopped, so the time on the clock stays the time you used. Resume when you are ready to go on; the exam prints once the clock runs again."), el("div", { class: "btn-row" }, btn("Resume", "primary", () => go(), "resume")));
    rest.hidden = true; app.insertBefore(rest, blocks[0] || end); hide = blocks.concat([end]);
    // a sitting opened again: its crossed-out questions, then its clock, which ran on while the page was closed unless paused
    if (run) (run.crossed || []).forEach(n => { if (crossers[n] && !crossed.has(n) && crossed.size < drop) crossers[n](true) });
    live = keep; tick = setInterval(beat, 500);
    if (run && run.done) { used = run.used == null ? null : +run.used; return marking(run.marks || {}) }
    if (run && timed) {
      left = Math.min(total, Math.max(0, run.endAt ? (run.endAt - Date.now()) / 1000 : +run.left || 0));      // never more than the exam's time (a clock put back)
      if (left <= 0) { over = true; paint(); ORGO.ui.toast("Time is up. Finish and mark when you are ready.") } else if (run.endAt) go(Math.min(run.endAt, Date.now() + total * 1000)); else paint();
    } else if (timed) go();
    keep(); focus(title);

    function askFinish() {
      if (timed && (over || left <= 0)) return marking();
      ORGO.ui.sheet({ title: "Finish and mark now?", body: (timed ? `You still have ${clock(left)} left. ` : "") + "You cannot return to the exam after this.", actions: [{ label: "Keep working" }, { label: "Finish and mark", primary: true, run: () => { marking() } }] });
    }

    // ---------------------------------------------------------------- marking
    // back: the marks given before the page was closed, when a finished sitting is opened again
    function marking(back) {
      halt(); done = true; cover(); if (!back) used = timed ? total - left : null;
      document.body.classList.remove("mock-room"); document.body.classList.add("mock-marking");
      const open = qs.filter(q => !crossed.has(q.n)), graded = new Set(open.slice(0, choose).map(q => q.n));
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
            const rb = e.rb = ORGO.quiz._rubric(lines, () => { score = rb.done() ? rb.score() : null; update(); keep() });
            ((back || {})[e.id] || []).forEach((v, i) => { const li = v == null ? null : rb.el.querySelectorAll(".rubric-line")[i], b = li && li.querySelector(`.seg button[data-v="${v}"]`); if (b) b.click() });
            box.append(el("p", { class: "small muted" }, "Mark what is on your page: full, half or no credit for each line."), rb.el);
          }
          box.appendChild(el("details", { class: "more", open: e.w || item.kind === "written" ? null : true }, el("summary", {}, "Worked solution"), ORGO.quiz.solution(item)));
          e.host.appendChild(box);
          marks.push({ q: rec.q.n, label: rec.part.label, type: rec.part.type || item.type, id: e.id, pts: share, auto, score: () => score });
        });
      });
      const head = el("h1", { class: "mock-title", tabindex: "-1" }, "Mark your exam");
      barBox.textContent = "";
      barBox.append(head, el("p", { class: "muted" }, `${x.title}. ` + (used == null ? "Without the timer. " : `Time used: ${clock(used)}. `) + "Read each model answer, then mark your own page honestly."), sumLine, el("div", { class: "btn-row" }, save));
      update(); keep(); window.scrollTo(0, 0); focus(head);

      function trySave() {
        const s = update();
        if (s.todo) ORGO.ui.sheet({ title: "Some parts are not marked", body: `${s.todo} part${s.todo > 1 ? "s are" : " is"} not marked and will count as zero.`, actions: [{ label: "Go back and mark" }, { label: "Save anyway", primary: true, run: () => { doSave() } }] });
        else doSave();
      }
      function doSave() {
        const s = update(), byPart = {}, byQ = {}, byType = {}, secs = used == null ? null : Math.round(used);
        marks.forEach(m => {
          const got = (m.score() || 0) * m.pts, k = m.q + m.label;
          (byPart[k] = byPart[k] || { q: m.q, label: m.label, type: m.type, pts: 0, got: 0 }); byPart[k].pts += m.pts; byPart[k].got += got;
          (byQ[m.q] = byQ[m.q] || { pts: 0, got: 0 }); byQ[m.q].pts += m.pts; byQ[m.q].got += got;
          (byType[m.type] = byType[m.type] || { pts: 0, got: 0 }); byType[m.type].pts += m.pts; byType[m.type].got += got;
          // into the schedule and the summary Eureka reads, quietly: one save is not thirty answers for Eureka's XP and streak
          if (m.id && !/^gen:/.test(m.id)) L.record(m.id, { score: m.score() || 0, quiet: true });
        });
        const partsOut = Object.values(byPart).map(p => ({ q: p.q, label: p.label, type: p.type, pts: r1(p.pts), got: r1(p.got) }));
        ORGO.store.update(KEY, a => (Array.isArray(a) ? a : []).concat([{ id: x.id, at: Date.now(), timed, score: r1(s.got), max: r1(s.max), secs, parts: partsOut }]), []);
        L.did("mock"); try { ORGO.eureka.done("mock") } catch (e) { }
        const pct = s.max ? Math.round(s.got / s.max * 100) : 0;
        ORGO.store.update(HIST, h => (Array.isArray(h) ? h : []).concat([{ at: Date.now(), right: r1(s.got), total: r1(s.max), pct, secs }]).slice(-50), []);
        live = null; stopClock(); forget();      // saved: the sitting is over
        const weak = Object.keys(byType).map(t => ({ t, f: byType[t].pts ? byType[t].got / byType[t].pts : 1, ...byType[t] })).filter(w => w.f < 0.999).sort((a, b) => a.f - b.f || b.pts - a.pts).slice(0, 3);
        const result = el("h1", { class: "mock-title", tabindex: "-1" }, "Your result");
        barBox.textContent = ""; barBox.dataset.saved = "1";
        barBox.append(result,
          el("p", { class: "mock-score" }, el("b", {}, `${r1(s.got)} of ${r1(s.max)}`), ` points, ${pct} percent.`),
          s.max < 700 ? el("p", { class: "small muted" }, "A full exam is out of 700. This one has fewer points because not every part was available or counted.") : "",      // not null: append() would write "null"
          el("h2", {}, "By question"),
          el("ul", { class: "mock-byq" }, Object.keys(byQ).map(n => el("li", {}, `Question ${n}: `, el("b", {}, `${r1(byQ[n].got)} of ${r1(byQ[n].pts)}`)))),
          el("h2", {}, "Study these next"),
          weak.length ? el("ul", { class: "mock-weak" }, weak.map(w => el("li", {}, el("a", { href: ORGO.base + "exam/index.html#" + w.t }, typeName(w.t)), `: ${r1(w.got)} of ${r1(w.pts)} points`)))
            : el("p", {}, "You earned full marks on every question type in this attempt."),
          el("p", { class: "small muted" }, "Your marked exam is below. The result is saved, and each question is now in your review schedule."),
          el("div", { class: "btn-row" }, btn("Back to the mock exams", "primary", () => { landing(true); window.scrollTo(0, 0) }, "back"), el("a", { class: "btn", href: ORGO.base + "index.html" }, "Home")));
        window.scrollTo(0, 0); focus(result);
      }
    }
  }
})();
