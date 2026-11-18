// CHEM 225 · questions. Adds ORGO.quiz: one item (mount), a worked example (worked), a run of items with
// misses coming back (session), and the solution block (solution). Contracts: docs/dev/ARCHITECTURE.md, "quiz.js".
// Also used by mock/page.js: ORGO.quiz._widget (an answer control that can be marked later) and ORGO.quiz._rubric.
(() => {
  const ORGO = window.ORGO = window.ORGO || {};
  const el = (...a) => ORGO.el(...a);
  const DAY = 864e5;

  // ------------------------------------------------------------------ scoring (pure, tested in tools/test/quiz.test.js)
  const S = {
    // "−3.5", "-3,5", "1,000" -> number; anything else -> null
    num(str) {
      const s = String(str == null ? "" : str).trim().replace(/[−‒–—]/g, "-").replace(/\s+/g, "").replace(/,(?=\d{3}(\D|$))/g, "").replace(",", ".");
      if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
      const x = Number(s); return isFinite(x) ? x : null;
    },
    numeric: (x, lo, hi) => (x != null && x >= lo && x <= hi ? 1 : 0),
    // 1 only when every choice is decided correctly, otherwise half of the fraction of correct decisions
    multi(picked, ok) { const n = ok.length; if (!n) return 0; let c = 0; for (let i = 0; i < n; i++) if (!!picked[i] === !!ok[i]) c++; return c === n ? 1 : 0.5 * c / n },
    // order: the correct index of each item, in the student's order. 1 when exact, else the fraction of pairs in the right relative order
    rank(order) { const n = order.length; let good = 0, all = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { all++; if (order[i] < order[j]) good++ } return all ? good / all : 1 },
    classify(picked, bins) { const n = bins.length; if (!n) return 0; let c = 0; for (let i = 0; i < n; i++) if (picked[i] === bins[i]) c++; return c / n },
    // marks: 1, 0.5, 0 or null per rubric line
    rubric(marks, pts) { let got = 0, all = 0; for (let i = 0; i < pts.length; i++) { all += pts[i]; got += (marks[i] || 0) * pts[i] } return all ? got / all : 0 }
  };

  // ------------------------------------------------------------------ small pieces
  const shuffled = n => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a };
  const mark = (ok, word) => el("span", { class: ok ? "mark-ok" : "mark-no" }, word || (ok ? "Right" : "Not quite"));   // the kit adds the tick or the cross
  const num = x => String(Math.round(x * 100) / 100).replace("-", "−");
  const binLabel = b => (/^(SN1|SN2|E1|E2|E1cb)$/.test(b) ? ORGO.html("{{" + b + "}}") : ORGO.html(b));
  const typeName = id => { const t = ORGO.type && ORGO.type(id); return t ? (t.short || t.title || id) : (id || "Question") };
  const btn = (label, cls, click, act) => el("button", { type: "button", class: "btn" + (cls ? " " + cls : ""), data: act ? { act } : null, on: { click } }, label);
  let uid = 0;
  // Eureka's preferences (none outside Eureka)
  const prefs = () => (ORGO.prefs ? ORGO.prefs() : {});
  // FNV-1a and a final mix (murmur3's), so that ids which differ only in their last digit still give unrelated numbers
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); h = Math.imul(h ^ h >>> 16, 0x85ebca6b); h = Math.imul(h ^ h >>> 13, 0xc2b2ae35); return (h ^ h >>> 16) >>> 0 };
  // a key press that is the page's to use: no other handler took it, not held down, no modifier, no sheet (ours or Eureka's) over the page
  const free = e => !(e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || (ORGO.ui && ORGO.ui.covered ? ORGO.ui.covered() : document.querySelector(".veil")));
  const typing = t => !!(t && t.closest && t.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
  // a control of its own, on which Enter already does something
  const control = t => !!(t && t.closest && t.closest('input, textarea, select, button, a[href], summary, canvas, [role="button"], [contenteditable]:not([contenteditable="false"])'));
  // The order of the choices. As written when the item says so (its text names the choices by place). Shuffled otherwise,
  // except when the student asked Eureka to "keep answers in the same order": then an order made from the question's id,
  // the same on every visit, and not the written one, in which the right choice comes first in most questions.
  const steady = () => !!prefs().fixedOrder, seedOf = item => String(item.id || item.stem || "");
  const orderOf = item => {
    const n = item.choices.length; if (item.fixed) return [...Array(n).keys()]; if (!steady()) return shuffled(n);
    const at = k => hash(seedOf(item) + "#" + k); return [...Array(n).keys()].sort((a, b) => at(a) - at(b) || a - b);
  };

  // ------------------------------------------------------------------ answer controls
  // Each returns {el, ready(), touched(), need, mark(), get(), set(state)}.
  //   mark()      locks the control, shows the feedback and returns the score
  //   get()       what the student has entered so far, as plain JSON, or null while the control is untouched:
  //               mcq the place of the chosen choice in item.choices · multi the places of the ticked choices, in order ·
  //               numeric the text typed · rank the order shown, as places in item.items, top first ·
  //               classify the bin chosen on each line, in the order of item.items (null on a line not yet chosen)
  //   set(state)  puts back what get() gave (null clears it), without marking and without calling onPick or onSubmit.
  //               After it, ready(), touched() and mark() answer as if the student had entered it. Once marked it does nothing.
  // Places are places in the item as written, never on screen (the choices may be shuffled), so a saved state fits any later drawing.
  // choices are lettered as on the exam; numbered when the question's own text numbers them ("diagram 2", "product 3")
  const tagsOf = item => /\b(diagram|choice|option|structure|product|compound|reaction|statement|chair|alkene)s? [1-6]\b/i.test(JSON.stringify([item.stem, item.solution, (item.choices || []).map(c => c.why)])) ? "123456" : "ABCDEF";
  const W = {
    // o: {defer (a second press takes the choice back: the mock exam), onPick, fewer (Eureka's "Fewer choices at once"), onMore}
    mcq(item, o) {
      const idx = orderOf(item), n = idx.length;
      const root = el("div", { class: "opts" + (item.layout === "pair" ? " pair" : ""), role: "group", "aria-label": "Choices" });
      let picked = -1, locked = false;
      const btns = idx.map((ci, k) => {
        const b = el("button", { type: "button", class: "opt", "aria-pressed": "false", data: { i: ci }, on: { click: () => pick(k) } },
          el("span", { class: "opt-k", "aria-hidden": "true" }, tagsOf(item)[k] || String(k + 1)), el("span", { class: "opt-h", html: item.choices[ci].h }));
        root.appendChild(b); return b;
      });
      const paint = () => btns.forEach((b, j) => { b.classList.toggle("picked", j === picked); b.setAttribute("aria-pressed", String(j === picked)) });
      function pick(k) {
        if (locked || !btns[k] || btns[k].hidden) return;
        picked = picked === k && o.defer ? -1 : k; paint();
        if (o.onPick) o.onPick();
      }
      // "Fewer choices at once", as Eureka's shared/prefs.js does it in the other classes: with four choices or more, the
      // right one and one other, each in its own place under its own letter, and a button that shows all of them
      let more = null;
      const showAll = () => { if (!more) return; btns.forEach(b => { b.hidden = false }); more.remove(); more = null; if (o.onMore) o.onMore() };
      if (o.fewer && n >= 4) {
        const wrong = idx.map((ci, k) => k).filter(k => !item.choices[idx[k]].ok);
        if (wrong.length > 1 && wrong.length < n) {
          const keep = wrong[steady() ? hash(seedOf(item) + "#keep") % wrong.length : Math.floor(Math.random() * wrong.length)];
          wrong.forEach(k => { btns[k].hidden = k !== keep });
          more = el("button", { type: "button", class: "px-more q-more", on: { click: showAll } }, `Show all ${n} choices`); root.appendChild(more);
        }
      }
      return {
        el: root, n, pick, need: "Choose one answer.", ready: () => picked >= 0, touched: () => picked >= 0,
        get: () => (picked < 0 ? null : idx[picked]),
        set(ci) { if (locked) return; picked = ci == null ? -1 : idx.indexOf(ci); if (picked >= 0 && btns[picked].hidden) showAll(); paint() },
        mark() {
          locked = true; let score = 0;
          btns.forEach((b, j) => {
            const c = item.choices[idx[j]]; b.disabled = true;
            if (c.ok) b.dataset.c = "true";
            if (j === picked) { b.classList.add(c.ok ? "right" : "wrong"); b.appendChild(el("span", { class: "opt-mark" }, mark(!!c.ok))); if (c.ok) score = 1 }
            else if (c.ok) { b.classList.add("right"); b.appendChild(el("span", { class: "opt-mark" }, mark(true, "The right answer"))) }
            if ((j === picked || c.ok) && c.why) b.appendChild(el("span", { class: "explain", html: c.why }));
          });
          return score;
        }
      };
    },
    multi(item, o) {
      const idx = orderOf(item);
      const root = el("div", { class: "opts multi", role: "group", "aria-label": "Choices. Tick all that apply." });
      let touched = false, locked = false;
      const rows = idx.map((ci, k) => {
        const box = el("input", { type: "checkbox", on: { change: () => { touched = true; lab.classList.toggle("picked", box.checked) } } });
        const lab = el("label", { class: "opt", data: { i: ci } }, box, el("b", { class: "opt-letter", "aria-hidden": "true" }, (tagsOf(item)[k] || String(k + 1)) + ". "), el("span", { class: "opt-h", html: item.choices[ci].h }));
        root.appendChild(lab); return { box, lab, ci, c: item.choices[ci] };
      });
      return {
        el: root, need: "", ready: () => true, touched: () => touched,
        get: () => (touched ? rows.filter(r => r.box.checked).map(r => r.ci).sort((a, b) => a - b) : null),
        set(list) { if (locked) return; touched = Array.isArray(list); rows.forEach(r => { r.box.checked = touched && list.includes(r.ci); r.lab.classList.toggle("picked", r.box.checked) }) },
        mark() {
          locked = true;
          rows.forEach(r => {
            const on = r.box.checked, ok = on === !!r.c.ok; r.box.disabled = true;
            if (r.c.ok) r.lab.dataset.c = "true";
            r.lab.classList.add(ok ? "right" : "wrong");
            const word = r.c.ok ? (on ? "Right, this one applies" : "Missed, this one applies") : (on ? "Not quite, this one does not apply" : "Right to leave it out");
            r.lab.appendChild(el("span", { class: "opt-mark" }, mark(ok, word)));
            if (r.c.why) r.lab.appendChild(el("span", { class: "explain", html: r.c.why }));
          });
          return S.multi(rows.map(r => r.box.checked), rows.map(r => r.c.ok));
        }
      };
    },
    numeric(item, o) {
      const id = "qn" + (++uid);
      const inp = el("input", { id, class: "num-in", type: "text", inputmode: "decimal", autocomplete: "off", size: "8", "aria-describedby": id + "h",
        on: { keydown: e => { if (e.key === "Enter" && o.onSubmit) { e.preventDefault(); o.onSubmit() } } } });
      const root = el("div", { class: "num" },
        el("label", { for: id }, "Your answer"), el("span", { class: "num-row" }, inp, item.unit ? el("span", { class: "num-unit", html: item.unit }) : null),
        el("span", { id: id + "h", class: "small muted" }, "A number. A minus sign in front is fine."));
      return {
        el: root, need: "Type a number first.", ready: () => S.num(inp.value) != null, touched: () => inp.value.trim() !== "",
        get: () => (inp.value.trim() === "" ? null : inp.value),
        set(text) { if (!inp.readOnly) inp.value = text == null ? "" : String(text) },
        mark() {
          const x = S.num(inp.value), score = S.numeric(x, item.lo, item.hi); inp.readOnly = true;
          const unit = item.unit ? " " + item.unit : "";
          // the mark and the expected answer are never held back: Eureka's "Explanations" preference hides what has the class
          // "explain", which here is the note alone
          root.appendChild(el("div", { class: "panel num-result" }, x == null ? null : mark(!!score), x == null ? null : " ",
            el("span", { html: `Expected: about <b>${num(item.answer)}</b>${unit}. Accepted: ${num(item.lo)} to ${num(item.hi)}.` })));
          if (item.note) root.appendChild(el("div", { class: "explain num-note", html: item.note }));
          return score;
        }
      };
    },
    rank(item, o) {
      const n = item.items.length; let ord = shuffled(n), sel = -1, locked = false, touched = false;
      for (let t = 0; n > 1 && t < 20 && ord.every((v, i) => v === i); t++) ord = shuffled(n);
      const list = el("ol", { class: "rank" }), say = el("p", { class: "small muted rank-say", role: "status" });
      const rows = item.items.map((it, ci) => {
        const grab = el("button", { type: "button", class: "rank-item", "aria-pressed": "false", title: "Pick this up, then choose the place it goes", on: { click: () => tap(ci) } }, el("span", { class: "rank-h", html: it.h }));
        const up = el("button", { type: "button", class: "icon-btn", "aria-label": "Move up", on: { click: () => move(ci, -1) } }, "↑");
        const down = el("button", { type: "button", class: "icon-btn", "aria-label": "Move down", on: { click: () => move(ci, 1) } }, "↓");
        const place = el("span", { class: "rank-n" });
        return { li: el("li", { class: "rank-row" }, place, grab, el("span", { class: "rank-ctl" }, up, down)), grab, up, down, place };
      });
      function draw() {
        ord.forEach((ci, p) => {
          const r = rows[ci]; list.appendChild(r.li); r.place.textContent = String(p + 1);
          r.up.disabled = locked || p === 0; r.down.disabled = locked || p === n - 1; r.grab.disabled = locked;
          r.grab.setAttribute("aria-pressed", String(ci === sel)); r.li.classList.toggle("held", ci === sel);
        });
      }
      function tap(ci) {
        if (locked) return;
        if (sel < 0) { sel = ci; say.textContent = `Picked up the item in place ${ord.indexOf(ci) + 1}. Now choose the place it should go.` }
        else if (sel === ci) { sel = -1; say.textContent = "Put back." }
        else { const from = ord.indexOf(sel), to = ord.indexOf(ci), m = sel; ord.splice(from, 1); ord.splice(to, 0, m); sel = -1; touched = true; say.textContent = `Moved to place ${to + 1}.`; draw(); rows[m].grab.focus(); return }
        draw(); rows[ci].grab.focus();
      }
      function move(ci, d) {
        const p = ord.indexOf(ci), q = p + d; if (locked || q < 0 || q >= n) return;
        [ord[p], ord[q]] = [ord[q], ord[p]]; sel = -1; touched = true; draw(); say.textContent = `Moved to place ${q + 1}.`;
        const r = rows[ci], want = d < 0 ? r.up : r.down; (want.disabled ? (d < 0 ? r.down : r.up) : want).focus();
      }
      draw();
      const root = el("div", { class: "rank-box" },
        el("p", { class: "rank-order" }, el("b", {}, "Order: "), el("span", { html: item.order || "in order" }), ". Place 1 is at the top."),
        el("p", { class: "small muted" }, "Use the arrows, or tap an item and then tap the place it should go."), list, say);
      return {
        el: root, need: "", ready: () => true, touched: () => touched,
        get: () => (touched ? ord.slice() : null),
        set(order) {
          if (locked) return; sel = -1; say.textContent = "";
          const all = Array.isArray(order) && order.length === n && order.slice().sort((a, b) => a - b).every((v, i) => v === i);     // every item, once each
          touched = all; if (all) ord = order.slice(); draw();
        },
        mark() {
          locked = true; sel = -1; draw(); say.textContent = "";
          ord.forEach((ci, p) => { const ok = ci === p, r = rows[ci]; r.li.classList.add(ok ? "right" : "wrong"); r.li.appendChild(el("span", { class: "rank-mark" }, mark(ok, ok ? "Right place" : "Belongs in place " + (ci + 1)))) });
          const s = S.rank(ord); return s >= 0.999 ? 1 : Math.min(0.75, s);      // right only when the whole order is right: an order with an error stays under the 0.8 line, with its partial credit
        }
      };
    },
    classify(item, o) {
      const picked = item.items.map(() => null); let locked = false;
      const paint = i => [...rows[i].seg.children].forEach(x => x.setAttribute("aria-pressed", String(x.dataset.bin === picked[i])));
      const rows = item.items.map((it, i) => {
        const seg = el("div", { class: "seg", role: "group", "aria-label": "Choose one" }, item.bins.map(b => el("button", { type: "button", "aria-pressed": "false", data: { bin: b }, on: { click: () => {
          if (locked) return; picked[i] = b; paint(i);
        } } }, binLabel(b))));
        return { seg, row: el("div", { class: "cls-row" }, el("div", { class: "cls-h", html: it.h }), seg) };
      });
      return {
        el: el("div", { class: "cls" }, rows.map(r => r.row)), need: "Choose one for every line first.",
        ready: () => picked.every(p => p != null), touched: () => picked.some(p => p != null),
        get: () => (picked.some(p => p != null) ? picked.slice() : null),
        set(bins) { if (locked) return; rows.forEach((r, i) => { const b = Array.isArray(bins) ? bins[i] : null; picked[i] = item.bins.includes(b) ? b : null; paint(i) }) },
        mark() {
          locked = true;
          rows.forEach((r, i) => {
            const it = item.items[i], ok = picked[i] === it.bin;[...r.seg.children].forEach(b => { b.disabled = true; if (b.dataset.bin === it.bin) b.dataset.c = "true" });
            r.row.classList.add(ok ? "right" : "wrong");
            // the mark and the right bin on a line of their own, always shown; the reason alone has the class "explain"
            r.row.appendChild(el("div", { class: "cls-mark" }, mark(ok), ok ? null : el("span", {}, " It is ", el("b", {}, binLabel(it.bin)), ".")));
            if (it.why) r.row.appendChild(el("div", { class: "explain", html: it.why }));
          });
          return S.classify(picked, item.items.map(it => it.bin));
        }
      };
    }
  };

  // rubric lines, each given full, half or no credit
  function rubric(lines, onChange) {
    const pts = lines.map(l => +l.pts || 0), marks = lines.map(() => null), all = pts.reduce((a, b) => a + b, 0);
    const total = el("p", { class: "rubric-total", role: "status" });
    const upd = quiet => { const got = marks.reduce((a, m, i) => a + (m || 0) * pts[i], 0), left = marks.filter(m => m == null).length; total.textContent = `${num(got)} of ${num(all)} points` + (left ? `. ${left} line${left > 1 ? "s" : ""} still to mark.` : "."); if (onChange && !quiet) onChange() };
    const list = el("ol", { class: "rubric" }, lines.map((l, i) => {
      const seg = el("div", { class: "seg", role: "group", "aria-label": "Credit for this line" }, [["Full", 1], ["Half", 0.5], ["None", 0]].map(([t, v]) => el("button", { type: "button", "aria-pressed": "false", data: { v: String(v) }, on: { click: e => {
        marks[i] = v; const me = e.currentTarget;[...seg.children].forEach(b => b.setAttribute("aria-pressed", String(b === me))); upd();
      } } }, t)));
      return el("li", { class: "rubric-line" }, el("span", { class: "badge" }, num(pts[i]) + (pts[i] === 1 ? " pt" : " pts")), el("span", { class: "rubric-h", html: l.h }), seg);
    }));
    const box = { el: el("div", { class: "rubric-box" }, list, total), done: () => marks.every(m => m != null), score: () => S.rubric(marks, pts), marks };
    upd(true); return box;
  }

  // ------------------------------------------------------------------ the solution block
  function solution(item) {
    const s = (item && item.solution) || {}, root = el("div", { class: "q-solution" }, el("h3", {}, "Worked solution"));
    if (s.steps && s.steps.length) root.appendChild(el("ol", { class: "steps" }, s.steps.map((st, i) => stepLi(st, i))));
    if (item && item.kind === "mech" && ORGO.mech && ORGO.mech.card) { try { const c = ORGO.mech.card(item.mech); if (c) root.appendChild(c) } catch (e) { } }
    if (s.answer) root.appendChild(el("p", { class: "q-answer" }, el("b", {}, "Answer: "), el("span", { html: s.answer })));
    if (s.rule) root.appendChild(el("div", { class: "callout info q-rule" }, el("b", {}, "Rule to remember: "), el("span", { html: s.rule })));
    return root;
  }
  const stepLi = (st, i, asked) => el("li", { class: "step" },   // the kit numbers the steps
    el("div", { class: "step-b" }, asked || null, st.t ? el("div", { class: "step-n", html: st.t }) : null, el("div", { html: st.h || "" })));

  // ------------------------------------------------------------------ one item
  function head(item, label) {
    const st = item.id && ORGO.learn ? ORGO.learn.state(item.id) : null; let on = !!(st && st.flag);
    const flag = item.id && !/^gen:/.test(item.id) ? el("button", { type: "button", class: "btn ghost small q-flag", "aria-pressed": String(on), title: "Flag this question to find it again", on: { click: () => { on = !on; ORGO.learn.flag(item.id, on); flag.setAttribute("aria-pressed", String(on)); flag.textContent = on ? "⚑ Flagged" : "⚐ Flag" } } }, on ? "⚑ Flagged" : "⚐ Flag") : null;
    return el("header", { class: "q-head" }, el("span", { class: "eyebrow" }, (label ? label + " · " : "") + typeName(item.type)),
      item.src && item.src !== "site" ? el("span", { class: "small muted q-src" }, item.src) : null, flag);
  }

  function mount(host, item, opts) {
    opts = opts || {}; host.textContent = "";
    const t0 = Date.now(); let finished = false, key = null;
    const stem = el("div", { class: "q-stem", html: stemOf(item) }), body = el("div", { class: "q-body" }), after = el("div", { class: "q-after" });
    const box = el("section", { class: "q q-" + item.kind, "aria-label": "Question", data: { id: item.id || "", kind: item.kind } }, head(item), stem, body, after);
    host.appendChild(box);

    // helped: finished with help (the mechanism trainer's last hint, or "Show me"). It is kept as a miss and says so.
    function finish(score, conf, extra, shown, helped) {
      if (finished) return; finished = true; if (key) document.removeEventListener("keydown", key);
      score = Math.max(0, Math.min(1, +score || 0)); if (helped) score = Math.min(score, (ORGO.learn && ORGO.learn.HELPED) || 0.75);
      const pct = Math.round(score * 100), word = score >= 0.999 ? "Right" : score <= 0 ? "Not quite" : `Partly right: ${pct} percent`;
      const verdict = el("p", { class: "q-verdict", tabindex: "-1", role: "status" }, helped ? [el("b", { class: "q-helped" }, "Done with help."), " It does not count as right yet, and it will come back for another try."] : mark(score >= 0.8, word));
      after.appendChild(verdict); if (extra) after.appendChild(extra);
      // Eureka's "Explanations" preference: "When I ask" keeps the worked solution behind a button, and so does "When I miss"
      // after a right answer. The marks and the reasons of the choices are Eureka's to show or hold back (shared/prefs.js).
      if (!shown) {
        const sol = solution(item), ex = prefs().explain;
        if (ex === "ask" || (ex === "wrong" && score >= 0.8)) {
          const open = el("button", { type: "button", class: "px-more q-show", on: { click: () => { open.replaceWith(sol); sol.tabIndex = -1; try { sol.focus({ preventScroll: true }) } catch (e) { } } } }, "Show the worked solution");
          after.appendChild(open);
        } else after.appendChild(sol);
      }
      box.dataset.done = "1"; box.dataset.score = String(score);
      if (!opts.review && item.id && !/^gen:/.test(item.id) && ORGO.learn) ORGO.learn.record(item.id, { score, conf: conf == null ? null : conf, secs: (Date.now() - t0) / 1000, hinted: !!helped });
      try { verdict.focus({ preventScroll: true }) } catch (e) { }
      if (opts.onDone) opts.onDone({ score, helped: !!helped });
    }

    // on paper, then marked by the student: used when a drawing module is not on the page
    function paper(why) {
      body.textContent = "";
      const show = btn("Show the solution", "primary", () => {
        row.remove(); body.appendChild(solution(item));
        body.appendChild(el("p", {}, "How did your answer compare?"));
        body.appendChild(el("div", { class: "btn-row" }, [["I had it", 1], ["Partly", 0.5], ["Not yet", 0]].map(([t, v]) => btn(t, "", () => { body.querySelectorAll(".btn-row .btn").forEach(b => b.disabled = true); finish(v, null, null, true) }, "self"))));
      }, "show");
      const row = el("div", { class: "btn-row" }, show);
      body.append(el("p", { class: "callout info" }, why + " Work this one out on paper, then check it against the solution."), row);
    }

    const k = item.kind;
    if (k === "mcq") {
      // "Fewer choices at once" only here, where one question is answered on its own (never in the mock exam room)
      const w = W.mcq(item, { onPick: () => finish(w.mark()), fewer: !!prefs().fewer, onMore: () => hint && say() }); body.appendChild(w.el);
      // number keys answer only where the caller says one question is on screen (a session): on a page with several
      // questions one key press would answer them all. Key 3 is the choice tagged C (or 3), and only while it is shown.
      const opt = d => { const b = d >= 1 && d <= 6 && d <= w.n ? w.el.querySelectorAll(".opt")[d - 1] : null; return b && !b.hidden ? b : null };
      const hint = opts.keys ? el("p", { class: "small muted q-keys" }) : null;
      const say = () => { const ks = [1, 2, 3, 4, 5, 6].filter(opt); hint.textContent = ks.length === Math.min(6, w.n) ? `Keys 1 to ${ks.length} also choose.` : `Keys ${ks.slice(0, -1).join(", ")} and ${ks[ks.length - 1]} also choose.` };
      if (hint) {
        key = e => {
          if (!box.isConnected || finished) { document.removeEventListener("keydown", key); return }
          if (!free(e) || typing(e.target)) return;
          const b = opt(+e.key);
          if (b) { e.preventDefault(); b.click() }      // through the button, so Eureka's "confirm before answering" sees it
        };
        document.addEventListener("keydown", key);
        say(); body.appendChild(hint);
      }
    } else if (W[k]) {
      const msg = el("p", { class: "small q-msg", role: "status" });
      const check = () => { if (finished) return; if (!w.ready()) { msg.textContent = w.need; return } row.remove(); msg.remove(); finish(w.mark()) };
      const w = W[k](item, { onSubmit: check }), row = el("div", { class: "btn-row" }, btn("Check", "primary", check, "check"));
      body.append(w.el, msg, row);
    } else if (k === "written") {
      const mins = +item.time || 0;
      const go = btn("I have written it", "primary", () => {
        row.remove();
        const seg = el("div", { class: "seg", role: "group", "aria-label": "How sure are you" }, [["Guessing", 0], ["Unsure", 1], ["Sure", 2]].map(([t, v]) => el("button", { type: "button", "aria-pressed": "false", data: { conf: String(v) }, on: { click: e => {
          const me = e.currentTarget;[...seg.children].forEach(b => { b.setAttribute("aria-pressed", String(b === me)); b.disabled = true }); compare(v);
        } } }, t)));
        body.append(el("p", { class: "q-conf" }, "Before you look: how sure are you of what you wrote?"), seg);
      }, "written");
      const row = el("div", { class: "btn-row" }, go);
      body.append(el("p", { class: "muted" }, (mins ? `Suggested time: ${mins} minute${mins === 1 ? "" : "s"}. ` : "") + (item.pts ? `Worth ${item.pts} points.` : "")),
        el("p", {}, "Write your answer on paper, as you would on the exam."), row);
      const compare = conf => {
        const lines = item.rubric && item.rubric.length ? item.rubric : [{ pts: 1, h: "My answer says what the model answer says" }];
        const done = btn("Record my score", "primary", () => {
          done.disabled = true; const score = rb.score();
          const extra = conf === 2 && score < 0.5 ? el("p", { class: "callout warn" }, "You were sure, and the page earned under half the points. A confident miss is the most useful kind to find before the exam. Study this one next.") : null;
          finish(score, conf, extra);
        }, "record");
        const rb = rubric(lines, () => { done.disabled = !rb.done() });
        done.disabled = true;
        body.append(el("div", { class: "split q-compare" },
          el("div", { class: "panel q-model" }, el("h3", {}, "Model answer"), el("div", { html: item.model || (item.solution && item.solution.answer) || "" })),
          el("div", { class: "q-rubric" }, el("h3", {}, "Mark your page"), el("p", { class: "small muted" }, "Give each line full, half or no credit. Mark what is on your page, not what you meant."), rb.el)),
          el("div", { class: "btn-row" }, done));
      };
    } else if (k === "mech" || k === "chair") {
      const got = r => {
        if (k === "mech" && r && typeof r === "object" && r.score == null) return;      // watched, not drawn: the question stays open
        finish(typeof r === "number" ? r : r && typeof r.score === "number" ? r.score : r === false ? 0 : 1, r && r.conf != null ? r.conf : null, null, false, !!(r && r.helped));
      };
      try {
        // inside a question the trainer offers only the modes that ask for the arrows, and records its run as part of this answer
        if (k === "mech" && ORGO.mech && ORGO.mech.mount) ORGO.mech.mount(body, item.mech, { mode: "solo", inQuestion: true, onDone: got });
        else if (k === "chair" && ORGO.chair && ORGO.chair.ask) { ORGO.chair.ask(body, item, got); if (body.querySelector("[class*=stem]")) stem.remove() }
        else paper(k === "mech" ? "The mechanism trainer is not loaded on this page." : "The chair tool is not loaded on this page.");
      } catch (e) { console.warn("quiz: " + k + " module failed", e); paper("This drawing tool could not start.") }
    } else paper("This kind of question cannot be answered on screen.");
    return box;
  }

  // ------------------------------------------------------------------ a worked example
  // a chair question's drawing is made by the chair tool itself, so the same drawing in the stem is left out
  const stemOf = item => item.kind === "chair" ? String(item.stem || "").replace(/\[\[(ring|chair):.*?\]\](?!\])/g, "") : item.stem || "";
  // what a worked example is choosing between, shown before the steps (unmarked)
  function asked(item) {
    const k = item.kind;
    if ((k === "mcq" || k === "multi") && item.choices) return el("ul", { class: "q-key q-asked" + (item.layout === "pair" ? " pair" : "") }, item.choices.map((c, i) => el("li", {}, item.layout === "pair" ? null : el("b", { class: "q-letter" }, "ABCDEF"[i] + ". "), el("div", { class: "q-key-h", html: c.h }))));
    if (k === "rank" && item.items) return el("div", { class: "q-asked" }, el("p", { class: "small muted" }, "To put in order (" + (item.order || "") + "), shown here in no particular order:"), el("ul", { class: "q-key" }, item.items.slice().sort((a, b) => ORGO.text(a.h).length - ORGO.text(b.h).length || (a.h < b.h ? -1 : 1)).map(it => el("li", { html: it.h }))));
    if (k === "classify" && item.items) return el("div", { class: "q-asked" }, el("p", { class: "small muted" }, "To sort into: " + (item.bins || []).join(", ")), el("ul", { class: "q-key" }, item.items.map(it => el("li", { html: it.h }))));
    if (k === "chair" && ORGO.chair) { try { const subs = ORGO.chair.parse(item.subs); return el("div", { class: "q-asked" }, item.given === "ring" ? ORGO.chair.ring(subs, { num: true }) : ORGO.chair.svg(subs, item.given === "chairB" ? "B" : "A", { num: true })) } catch (e) { } }
    return null;
  }
  function worked(host, item) {
    host.textContent = "";
    const s = item.solution || {}, steps = s.steps || []; let i = 0;
    const list = el("ol", { class: "steps" }), ctl = el("div", { class: "q-ctl" }), end = el("div", { class: "q-after" });
    const box = el("section", { class: "q q-worked", "aria-label": "Worked example", data: { id: item.id || "" } }, head(item, "Worked example"), el("div", { class: "q-stem", html: stemOf(item) }), asked(item), list, ctl, end);
    host.appendChild(box);
    const put = (node, focus) => { ctl.textContent = ""; if (node) ctl.appendChild(node); if (focus) try { focus.focus({ preventScroll: true }) } catch (e) { } };
    function reveal(asked) { list.appendChild(stepLi(steps[i], i, asked)); i++; offer(true) }
    function offer(focus) {
      const last = i >= steps.length, b = btn(last ? "Show the answer" : i === 0 ? "Show the first step" : "Next step", "primary", () => (last ? finish() : next()), "step");
      put(el("div", { class: "btn-row" }, b, steps.length ? el("span", { class: "small muted" }, `${i} of ${steps.length} steps shown`) : null), focus ? b : null);
    }
    function next() {
      const st = steps[i];
      if (!st.ask) return reveal();
      const show = btn("Show", "primary", () => reveal(el("p", { class: "small muted step-asked" }, el("span", { html: st.ask.q }), " ", el("b", { html: st.ask.a }))), "show");
      put(el("div", { class: "panel q-ask" }, el("p", {}, el("b", {}, "Before you read on: "), el("span", { html: st.ask.q })),
        el("p", { class: "small muted" }, "Answer it in your head, then press Show."), el("div", { class: "btn-row" }, show)), show);
    }
    function finish() {
      put(null);
      if (s.answer) end.appendChild(el("p", { class: "q-answer", tabindex: "-1" }, el("b", {}, "Answer: "), el("span", { html: s.answer })));
      if (s.rule) end.appendChild(el("div", { class: "callout info q-rule" }, el("b", {}, "Rule to remember: "), el("span", { html: s.rule })));
      const k = item.kind;
      if ((k === "mcq" || k === "multi") && item.choices) end.appendChild(el("ul", { class: "q-key" + (item.layout === "pair" ? " pair" : "") }, item.choices.map(c => el("li", { class: c.ok ? "right" : "wrong", data: c.ok ? { c: "true" } : null },
        el("div", { class: "q-key-h", html: c.h }), mark(!!c.ok, c.ok ? (k === "multi" ? "Circle it" : "The answer") : (k === "multi" ? "Leave it" : "Not the answer")), c.why ? el("div", { class: "explain", html: c.why }) : null))));
      else if (k === "numeric") end.appendChild(el("p", { class: "explain", html: `Accepted: ${num(item.lo)} to ${num(item.hi)}${item.unit ? " " + item.unit : ""}. ${item.note || ""}` }));
      else if (k === "rank" && item.items) end.appendChild(el("ol", { class: "q-key rank-key" }, item.items.map(it => el("li", { html: it.h }))));
      else if (k === "classify" && item.items) end.appendChild(el("ul", { class: "q-key" }, item.items.map(it => el("li", {}, el("div", { class: "q-key-h", html: it.h }), el("b", {}, binLabel(it.bin)), it.why ? el("div", { class: "explain", html: it.why }) : null))));
      else if (k === "written" && item.model) end.appendChild(el("div", { class: "panel q-model" }, el("h3", {}, "Model answer"), el("div", { html: item.model })));
      else if (k === "mech" && ORGO.mech && ORGO.mech.card) { try { const c = ORGO.mech.card(item.mech); if (c) end.appendChild(c) } catch (e) { } }
      box.dataset.done = "1"; const a = end.querySelector(".q-answer"); if (a) try { a.focus({ preventScroll: true }) } catch (e) { }
    }
    offer(false);
    return box;
  }

  // ------------------------------------------------------------------ a run of items
  function when(due) {
    const d = due - Date.now(); if (d <= 0) return "now";
    const a = new Date(), b = new Date(due), days = Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / DAY);
    return days <= 0 ? "later today" : days === 1 ? "tomorrow" : `in ${days} days`;
  }

  function session(host, ids, opts) {
    opts = opts || {}; host.textContent = "";
    const D = ORGO.data, known = [...new Set(ids || [])].filter(id => (D.index && D.index[id]) || (D.items && D.items[id]));
    const names = [...new Set(known.filter(id => !D.items[id]).map(id => "t/" + D.index[id][0]))];
    if (known.some(id => (D.items[id] ? D.items[id].kind : D.index[id][1]) === "mech")) names.push("mech");
    host.appendChild(el("p", { class: "muted" }, "Loading the questions."));
    return Promise.all(names.map(n => ORGO.need(n).catch(() => null))).then(() => run(known.filter(id => D.items[id])));

    function run(list) {
      host.textContent = "";
      if (!list.length) {
        host.appendChild(el("div", { class: "empty" }, el("p", {}, "There are no questions ready for this session yet."), el("a", { class: "btn primary", href: ORGO.base + "drill/index.html" }, "Go to Practice")));
        if (opts.onEnd) opts.onEnd({ right: 0, total: 0, missed: [] }); return;
      }
      // A missed question comes back after up to three other questions, at most twice, and only while another question is
      // left to stand between the tries (straight after its worked solution a try would test nothing). Once right it stops
      // coming back. Still missed, it is due again at once (core.js), and the summary lists it.
      const queue = list.slice(), first = {}, tries = {}, skipped = []; let done = 0, nextBtn = null;
      const count = el("span", { class: "sess-count" }), fill = el("i"), bar = el("div", { class: "bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": "Progress through this session" }, fill);
      const stage = el("div", { class: "sess-stage", tabindex: "-1" }), foot = el("div", { class: "sess-foot" });
      const root = el("div", { class: "sess" }, el("header", { class: "sess-head" }, el("h2", { class: "sess-title" }, opts.title || "Practice"), count, bar), stage, foot);
      host.appendChild(root);
      const strip = shownNow => { const all = done + queue.length + (shownNow ? 1 : 0), pct = all ? Math.round(done / all * 100) : 100; fill.style.width = pct + "%"; bar.setAttribute("aria-valuenow", String(pct)); count.textContent = shownNow ? `Question ${done + 1} of ${all}` : `${done} of ${all} done` };
      // once the question on screen is finished, Enter and the right arrow press "Next question" (or "See the summary"),
      // as Eureka's list of keys says, unless the key is for a control of its own or a sheet is open. Focus is not moved.
      const onKey = e => {
        if (!root.isConnected) return document.removeEventListener("keydown", onKey);
        if ((e.key === "Enter" || e.key === "ArrowRight") && nextBtn && nextBtn.isConnected && free(e) && !control(e.target)) { e.preventDefault(); nextBtn.click() }
      };
      document.addEventListener("keydown", onKey);
      function show(started) {
        nextBtn = null;
        if (!queue.length) return summary();
        const id = queue.shift(), item = D.items[id], n = tries[id] || 0;
        strip(true); foot.textContent = ""; stage.textContent = "";
        const slot = el("div", {}); if (n) stage.appendChild(el("p", {}, el("span", { class: "badge" }, n === 1 ? "Second try" : "Third try"), " You missed this one earlier in the session."));
        stage.appendChild(slot);
        foot.appendChild(el("div", { class: "btn-row" }, btn("Skip this question", "ghost small", () => { if (!n) skipped.push(id); show(true) }, "skip")));
        mount(slot, item, { keys: true, onDone: r => {
          done++; let note = null; tries[id] = n + 1;
          if (!n) first[id] = r.score;
          if (r.score < 0.8 && n < 2 && queue.length) { queue.splice(Math.min(3, queue.length), 0, id); note = "This one will come back later in the session." }
          strip(false); foot.textContent = "";
          nextBtn = btn(queue.length ? "Next question" : "See the summary", "primary", () => show(true), "next");
          foot.appendChild(el("div", { class: "btn-row" }, nextBtn, note ? el("span", { class: "small muted" }, note) : null));
        } });
        if (started) { try { root.scrollIntoView({ block: "start", behavior: ORGO.reduced ? "auto" : "smooth" }); stage.focus({ preventScroll: true }) } catch (e) { } }
      }
      function summary() {
        document.removeEventListener("keydown", onKey);
        const answered = Object.keys(first), right = answered.filter(id => first[id] >= 0.8), missed = answered.filter(id => first[id] < 0.8);
        // a step of the study plan counts only work of its own kind: a session started without a kind ticks none of them
        if (answered.length) { if (opts.kind) ORGO.learn.did(opts.kind, answered.length); try { ORGO.eureka.done("session") } catch (e) { } }
        const dues = answered.map(id => (ORGO.learn.state(id) || {}).due).filter(Boolean), next = dues.length ? Math.min(...dues) : null;
        const sum = el("section", { class: "card sess-summary", tabindex: "-1", "aria-label": "Session summary" },
          el("h2", {}, "Session done"),
          el("p", { class: "lead" }, answered.length ? `${right.length} of ${answered.length} right the first time.` : "No questions were answered."),
          skipped.length ? el("p", { class: "muted" }, `You skipped ${skipped.length}.`) : null,
          missed.length ? el("h3", {}, "Look at these again") : answered.length ? el("p", {}, "Nothing from this session needs a second look today.") : null,
          missed.length ? el("ul", { class: "sess-missed" }, missed.map(id => { const it = D.items[id], txt = ORGO.text(it.stem || ""); return el("li", {}, el("a", { href: ORGO.base + "exam/index.html#" + it.type }, typeName(it.type)), el("span", { class: "muted" }, ": " + (txt.length > 110 ? txt.slice(0, 107) + "..." : txt))) })) : null,
          next ? el("p", {}, el("b", {}, "Next review: "), next <= Date.now() ? "now. The ones still missed are due again at once. After a short break, choose Review what is due." : when(next) + ". Come back then and choose Review what is due.") : null,
          el("p", { class: "callout info" }, "Mixing the question types makes you choose the method each time, and coming back after a gap makes the memory last. Both feel harder than repeating one type, and both work better."),
          el("div", { class: "btn-row" }, el("a", { class: "btn primary", href: ORGO.base + "drill/index.html" }, "More practice"), el("a", { class: "btn", href: ORGO.base + "index.html" }, "Home")));
        root.textContent = ""; root.appendChild(sum); root.dataset.done = "1";
        try { sum.focus({ preventScroll: true }) } catch (e) { }
        if (opts.onEnd) opts.onEnd({ right: right.length, total: answered.length, missed, skipped, el: sum });
      }
      show(false);
    }
  }

  ORGO.quiz = { mount, worked, session, solution, _score: S, _widget: (item, o) => (W[item.kind] ? W[item.kind](item, o || {}) : null), _rubric: rubric, _mark: mark };
})();
