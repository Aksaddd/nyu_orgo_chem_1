// CHEM 225 · the mechanism trainer: ORGO.mech.
// A mechanism is ORGO.data.mechs[id] (data/mech.js, loaded with ORGO.need("mech")):
//   {id, title, class, from, overall, steps: [{name, species, arrows, say, why, hints, adds}], product, takeaway}
// The drawing and the checking of arrows live in mol.js (ORGO.mol.stage); this file is the teaching around them.
(() => {
  const ORGO = window.ORGO = window.ORGO || {};
  ORGO.tokens = ORGO.tokens || {};
  const el = (...a) => ORGO.el(...a);
  const MODES = [["watch", "Watch"], ["complete", "Add the missing arrow"], ["solo", "Draw every arrow"], ["paper", "On paper first"]];
  const HARDER = { watch: ["complete", "Now add the missing arrows"], complete: ["solo", "Now draw every arrow"], solo: ["paper", "Now try it on paper"] };
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const nice = s => esc(s).replace(/\b(SN1|SN2)\b/g, x => ORGO.formula ? ORGO.formula(x) : x);
  const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
  const get = id => ((ORGO.data || {}).mechs || {})[id] || null;
  const ready = () => !!(ORGO.mol && ORGO.mol.stage);
  const titled = (tag, cls, text) => { const e = el(tag, { class: cls }); e.innerHTML = nice(text); return e };
  const talk = s => [el("p", { class: "mech-say" }, ORGO.html(s.say || "")), s.why ? el("div", { class: "panel mech-why" }, el("b", {}, "Why. "), ORGO.html(s.why)) : null];
  const joins = s => s.adds && s.adds.length ? el("p", { class: "small muted mech-adds" }, ORGO.html("Joins in this step: " + s.adds.map(x => "[[mol:" + x + "]]").join(" and "))) : null;

  function mount(host, id, o = {}) {
    let dead = false, ctls = [];
    const api = { destroy() { dead = true; ctls.forEach(c => c.destroy()); ctls = []; host.textContent = "" }, setMode() { }, mode: () => o.mode || "watch" };
    host.textContent = "";
    if (!ready()) { host.appendChild(el("p", { class: "empty" }, "The drawing tool did not load, so this mechanism cannot be shown.")); return api }
    const m = get(id);
    if (!m) {
      const miss = () => { if (dead) return; host.textContent = ""; host.appendChild(el("p", { class: "empty" }, "This mechanism is not in the guide.")) };
      if (o.loaded || !ORGO.need) { miss(); return api }
      host.appendChild(el("p", { class: "muted" }, "Loading the mechanism."));
      ORGO.need("mech").then(() => { if (dead) return; const inner = mount(host, id, Object.assign({}, o, { loaded: true })); api.destroy = inner.destroy; api.setMode = inner.setMode; api.mode = inner.mode }, miss);
      return api;
    }

    const n = m.steps.length;
    let mode = MODES.some(x => x[0] === o.mode) ? o.mode : "watch", i = 0, finished = false, res = [], result = null;
    const reset = () => { i = 0; finished = false; result = null; res = m.steps.map(() => ({ done: false, helped: false, score: 0, fails: 0, hints: 0, last: false, miss: null, shown: false, tick: false })) };
    reset();

    const seg = el("div", { class: "seg mech-modes", role: "group", "aria-label": "How to practise" }, MODES.map(([k, text]) => el("button", { type: "button", "aria-pressed": String(k === mode), data: { mode: k }, on: { click: () => setMode(k) } }, text)));
    const strip = el("ol", { class: "mech-strip", "aria-label": "Steps" }), body = el("div", { class: "mech-body" });
    host.appendChild(el("section", { class: "mech", "aria-label": m.title },
      titled("h2", "mech-title", m.title), m.from ? el("p", { class: "small muted mech-from" }, m.from) : null,
      el("div", { class: "mech-overall" }, ORGO.html(m.overall || "")), seg, strip, body));

    const put = (box, opts) => { const c = ORGO.mol.stage(box, opts); ctls.push(c); return c };
    const button = (text, run, cls) => el("button", { type: "button", class: "btn" + (cls ? " " + cls : ""), on: { click: run } }, text);
    function setMode(k) { if (!MODES.some(x => x[0] === k)) return; mode = k; [...seg.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === k))); reset(); render() }
    const go = k => { i = k; finished = false; render("step") };
    const named = k => mode === "watch" || mode === "complete" || res[k].done || res[k].shown;

    function drawStrip() {
      strip.textContent = "";
      m.steps.forEach((s, k) => {
        const r = res[k], here = !finished && mode !== "paper" && k === i, open = mode === "watch" || (mode !== "paper" && (r.done || k === i));
        strip.appendChild(el("li", {}, el("button", { type: "button", class: "chip" + (here ? " on" : ""), "aria-current": here ? "step" : null, disabled: !open, on: { click: () => go(k) } },
          (k + 1) + ". " + (named(k) ? s.name : "Step " + (k + 1)), r.done ? el("span", { class: "mech-tick" }, r.helped ? " (shown)" : " ✓") : r.tick ? el("span", { class: "mech-tick" }, " ✓") : null)));
      });
      strip.appendChild(el("li", {}, el("span", { class: "chip" + (finished ? " on" : "") }, "Product")));
    }

    function render(focus) {
      ctls.forEach(c => c.destroy()); ctls = []; body.textContent = "";
      drawStrip();
      const first = finished ? drawEnd() : mode === "paper" ? drawPaper() : drawStep();
      if (focus && first && first.focus) first.focus();
    }

    // one step: watched, or drawn by the student
    function drawStep() {
      const s = m.steps[i], r = res[i], drawing = mode !== "watch" && !r.done, expected = s.arrows || [];
      const head = el("h3", { class: "mech-step-title", tabindex: "-1" }, "Step " + (i + 1) + " of " + n + (named(i) ? ": " + s.name : ""));
      const box = el("div", { class: "panel mech-stage" }), row = el("div", { class: "btn-row" });
      const next = () => { if (i < n - 1) { i++; render("step") } else finish() }, nextText = i < n - 1 ? "Next step" : "See the product";
      if (!drawing) {
        const ctl = put(box, { species: s.species, arrows: expected, mode: mode === "watch" ? "play" : "show" });
        const fb = mode === "watch" ? null : el("p", { class: "mech-feedback" }, r.score ? el("span", { class: "mark-ok" }, "Right") : el("b", {}, "Shown for you."),
          r.score ? (r.last ? " The last hint gave the answer away, so this step does not count yet." : r.fails ? "" : " First try.") : " Follow each arrow from the electrons to where they go. This step does not count yet.");
        const nextBtn = button(nextText, next, "primary");
        if (mode === "watch") row.append(button("Back", () => go(i - 1)), button("Play again", () => ctl.set(expected)), nextBtn); else row.append(nextBtn);
        if (mode === "watch" && !i) row.firstChild.disabled = true;
        body.append(head, joins(s) || "", box, fb || "", ...talk(s).filter(Boolean), row);
        return r.done ? nextBtn : head;
      }
      const lone = expected.length < 2;
      if (mode === "complete" && !lone && r.miss == null) r.miss = Math.floor(Math.random() * expected.length);
      const givenArrows = mode === "complete" && !lone ? expected.filter((a, k) => k !== r.miss) : [];
      const how = " Press where the electrons start (an atom for its lone pair, or a bond), then press where they go.";
      const task = el("p", { class: "mech-task" }, mode === "complete" ? (lone ? "This step has one arrow. Draw it." : "One arrow of this step is missing. Add it.") + how : "Draw every arrow of this step, then press Check." + how);
      const ctl = put(box, { species: s.species, arrows: givenArrows, mode: "input" });
      const fb = el("div", { class: "mech-feedback", role: "status", "aria-live": "polite" }), hintBox = el("div", { class: "mech-hints", "aria-live": "polite" }), hints = s.hints || [];
      const drawHints = () => { hintBox.textContent = ""; hints.slice(0, r.hints).forEach((h, k) => hintBox.appendChild(el("p", { class: "panel mech-hint" }, el("b", {}, "Hint " + (k + 1) + " of " + hints.length + ". "), ORGO.html(h)))) };
      const hintBtn = button("Hint", () => { if (r.hints < hints.length) { r.hints++; if (r.hints === hints.length) r.last = true; drawHints() } hintBtn.disabled = r.hints >= hints.length });
      const showBtn = button("Show me", () => { r.done = true; r.helped = true; r.score = 0; render("step") }, "ghost");
      const offer = () => { hintBtn.hidden = !(r.fails >= 1 && hints.length); hintBtn.disabled = r.hints >= hints.length; showBtn.hidden = r.fails < 2 };
      const checkBtn = button("Check", () => {
        if (ctl.arrows().length <= givenArrows.length) { fb.textContent = ""; fb.appendChild(el("p", {}, "Draw an arrow first. Start at electrons: a lone pair or a bond.")); return }
        const out = ctl.check(expected);
        if (out.ok) { r.done = true; r.score = r.fails === 0 ? 1 : r.fails === 1 ? 0.8 : 0.6; r.helped = r.last; return render("step") }
        r.fails++; fb.textContent = "";
        fb.append(el("p", {}, el("span", { class: "mark-no" }, "Not quite"), " Look at the notes, change your arrows, and check again."), el("ul", { class: "mech-notes" }, out.notes.map(x => el("li", {}, x.text))));
        offer();
      }, "primary");
      row.append(checkBtn, button("Undo", () => ctl.undo()), button("Clear", () => ctl.clear()), hintBtn, showBtn);
      offer(); drawHints();
      body.append(head, task, joins(s) || "", box, fb, hintBox, row);
      return head;
    }

    // paper first: only the overall reaction, then one step at a time to compare with
    function drawPaper() {
      const seen = res.filter(r => r.shown).length;
      const head = el("h3", { class: "mech-step-title", tabindex: "-1" }, "On paper first");
      body.append(head, el("p", { class: "mech-task" }, "Draw the whole mechanism on paper first: every step, every arrow, every charge. Then show one step at a time and compare it with yours."));
      let lastShown = null;
      m.steps.forEach((s, k) => {
        const r = res[k]; if (!r.shown) return;
        const box = el("div", { class: "panel mech-stage" }), tick = el("input", { type: "checkbox", on: { change: () => { r.tick = tick.checked; drawStrip() } } });
        tick.checked = r.tick;
        put(box, { species: s.species, arrows: s.arrows, mode: "show", scale: 1.6 });
        lastShown = el("h4", { class: "mech-step-title", tabindex: "-1" }, "Step " + (k + 1) + ": " + s.name);
        body.append(lastShown, box, el("p", { class: "mech-say" }, ORGO.html(s.say || "")), el("label", { class: "mech-tickline" }, tick, " My step " + (k + 1) + " matches: the same arrows and the same charges"));
      });
      const more = seen < n ? button(seen ? "Show step " + (seen + 1) : "I have drawn it. Show step 1", () => { res[seen].shown = true; render("step") }, "primary") : button("See the product", finish, "primary");
      body.append(el("div", { class: "btn-row" }, more));
      return lastShown || head;
    }

    function finish() {
      if (result) { finished = true; render("step"); return }      // looking back at a step of a finished run records nothing again
      let score = null, helped = true;
      if (mode === "paper") { score = res.filter(r => r.tick).length / n; helped = false }
      else if (mode !== "watch") { score = res.reduce((a, r) => a + r.score, 0) / n; helped = res.some(r => r.helped) }
      result = { score, helped, mode }; finished = true;
      // watching is not practice, so it is not recorded as an answer
      if (score != null && ORGO.learn && ORGO.learn.record) ORGO.learn.record("mech:" + id, { score, hinted: helped });
      render("step");
      if (o.onDone) o.onDone(result);
    }

    function drawEnd() {
      const head = el("h3", { class: "mech-step-title", tabindex: "-1" }, "Product"), box = el("div", { class: "panel mech-stage" });
      put(box, { species: m.product, arrows: [], mode: "show", scale: 1.6 });
      const own = res.filter(r => r.done && !r.helped).length, ticks = res.filter(r => r.tick).length;
      const sum = mode === "watch" ? "You have seen every step. The next move is to draw the arrows yourself."
        : mode === "paper" ? "You ticked " + ticks + " of " + plural(n, "step") + "." + (ticks < n ? " Redraw the steps you missed before you move on." : "")
        : "You drew " + own + " of " + plural(n, "step") + " on your own." + (own < n ? " Steps that were shown do not count yet, so come back to this one." : "");
      const row = el("div", { class: "btn-row" }, button("Again", () => { reset(); render("step") }), HARDER[mode] ? button(HARDER[mode][1], () => setMode(HARDER[mode][0]), "primary") : null);
      body.append(head, box, m.takeaway ? el("div", { class: "panel mech-takeaway" }, el("b", {}, "Takeaway. "), ORGO.html(m.takeaway)) : "", el("p", { class: "mech-sum", role: "status" }, sum), row);
      return head;
    }

    api.setMode = setMode; api.mode = () => mode;
    render();
    return api;
  }

  // a compact static view: the overall reaction, then every step with its arrows and what the tutor says
  function card(id) {
    const box = el("div", { class: "mech-card" });
    const fill = () => {
      const m = get(id); box.textContent = "";
      if (!ready()) return box.appendChild(el("p", { class: "fig-missing" }, "The drawing tool did not load."));
      if (!m) return box.appendChild(el("p", { class: "fig-missing" }, "This mechanism is not in the guide."));
      box.append(titled("p", "mech-card-title", m.title), el("div", { class: "mech-overall" }, ORGO.html(m.overall || "")));
      const list = el("ol", { class: "mech-card-steps" });
      m.steps.forEach((s, k) => { const st = el("div", { class: "mech-card-stage" }); ORGO.mol.stage(st, { species: s.species, arrows: s.arrows, mode: "show", scale: 1.45 }); list.appendChild(el("li", {}, el("b", {}, "Step " + (k + 1) + ": " + s.name), st, el("p", { class: "mech-say" }, ORGO.html(s.say || "")))) });
      const end = el("div", { class: "mech-card-stage" }); ORGO.mol.stage(end, { species: m.product, arrows: [], mode: "show", scale: 1.45 });
      box.append(list, el("p", {}, el("b", {}, "Product")), end, m.takeaway ? el("p", { class: "mech-say" }, ORGO.html(m.takeaway)) : "");
    };
    if (get(id) || !ORGO.need) fill(); else { box.appendChild(el("p", { class: "muted" }, "Loading the mechanism.")); ORGO.need("mech").then(fill, fill) }
    return box;
  }

  ORGO.mech = { mount, card, modes: MODES.map(x => x[0]) };
  ORGO.tokens.mech = arg => card(String(arg).trim());
})();
