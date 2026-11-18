// CHEM 225 · the engine's core. Loaded on every page after course.js and before everything else in assets/.
// It creates window.ORGO: the data registry, formula and figure markup, storage, the learning schedule, small UI
// pieces, and the bridge to Eureka (class bar, companions, settings) when this folder sits inside Eureka.
// On its own (no ../shared/), it draws its own top bar and keeps its own appearance setting.
// The contracts are written down in docs/dev/ARCHITECTURE.md.
(() => {
  const me = document.currentScript, src = (me && me.src) || "";
  const C = window.COURSE || {};
  const ORGO = window.ORGO = window.ORGO || {};
  ORGO.base = C.base || src.replace(/assets\/core\.js.*$/, "");
  ORGO.inEureka = !!window.Platform;
  const root = document.documentElement;

  // ---------------------------------------------------------------- data
  const data = ORGO.data = { blueprint: [], index: {}, types: {}, items: {}, mechs: {}, mols: {}, chapters: {}, mocks: {}, conf: {}, tables: {}, errors: {}, glossary: [] };
  ORGO.reg = part => { for (const k in part) { const v = part[k]; if (v && typeof v === "object" && !Array.isArray(v) && data[k] && typeof data[k] === "object" && !Array.isArray(data[k])) Object.assign(data[k], v); else data[k] = v } };
  const loading = {};
  // load generated data files once: ORGO.need("t/nuc-pairs", "mech").then(…)
  ORGO.need = (...names) => Promise.all(names.flat().map(n => loading[n] || (loading[n] = new Promise((ok, no) => {
    const s = document.createElement("script"); s.src = ORGO.base + "data/" + n + ".js"; s.onload = () => ok(n); s.onerror = () => { delete loading[n]; no(new Error("could not load data/" + n + ".js")) }; document.head.appendChild(s);
  }))));
  ORGO.type = id => data.blueprint.find(t => t.id === id) || null;
  ORGO.itemsOf = (typeId, role) => Object.keys(data.index).filter(id => data.index[id][0] === typeId && (!role || data.index[id][2] === role));

  // ---------------------------------------------------------------- formulas: {{CH3O-}}
  const NAMED = { SN1: "S<sub>N</sub>1", SN2: "S<sub>N</sub>2", E1: "E1", E2: "E2", E1cb: "E1cb", pKa: "p<i>K</i><sub>a</sub>", pKas: "p<i>K</i><sub>a</sub>s", Ka: "<i>K</i><sub>a</sub>", Keq: "<i>K</i><sub>eq</sub>", K: "<i>K</i>", dG: "Δ<i>G</i>", dH: "Δ<i>H</i>", "dG‡": "Δ<i>G</i><sup>‡</sup>", Ea: "<i>E</i><sub>a</sub>", sp3: "sp<sup>3</sup>", sp2: "sp<sup>2</sup>", sp: "sp", "1H": "<sup>1</sup>H", "13C": "<sup>13</sup>C", B0: "<i>B</i><sub>0</sub>", "d+": "δ<sup>+</sup>", "d-": "δ<sup>−</sup>", "1o": "1°", "2o": "2°", "3o": "3°" };
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function formula(s) {
    s = s.trim(); if (NAMED[s]) return NAMED[s];
    let lead = "", tail = "";
    let m = /^([-−+])(?=[A-Za-z(\[])/.exec(s); if (m) { lead = `<sup>${m[1] === "+" ? "+" : "−"}</sup>`; s = s.slice(1) }
    m = /\^(\d*[-−+])$/.exec(s) || /([-−+])$/.exec(s); if (m) { tail = `<sup>${m[1].replace(/-/g, "−")}</sup>`; s = s.slice(0, m.index) }
    return lead + esc(s).replace(/([A-Za-z)\]])(\d+)/g, "$1<sub>$2</sub>") + tail;
  }
  ORGO.formula = formula;
  // data-lk: the whole formula is one word for Eureka's dictionary, however many tags draw it (S<sub>N</sub>2, pKa)
  ORGO.fmt = str => String(str == null ? "" : str).replace(/\{\{(.*?)\}\}/g, (_, f) => `<span class="chem" data-lk>${formula(f)}</span>`);

  // ---------------------------------------------------------------- figures: [[mol:CCO]]
  const TOKEN = /\[\[([a-z0-9]+):(.*?)\]\](?!\])/g;
  ORGO.TOKEN = TOKEN;
  ORGO.tokens = ORGO.tokens || {};
  const missingFig = (kind, arg) => { const s = document.createElement("span"); s.className = "fig-missing"; s.textContent = kind === "mol" ? arg.split("|")[0] : `[${kind}]`; return s };
  // text with {{formulas}} and [[figures]] -> DocumentFragment
  ORGO.html = str => {
    str = String(str == null ? "" : str);
    const toks = [];
    // a token alone on its line is a figure; inside a sentence it is drawn in line
    let h = str.replace(TOKEN, (all, kind, arg, at) => {
      const before = str.slice(0, at), after = str.slice(at + all.length);
      const alone = /(^|\n|<p>|<br\s*\/?>|<li>|<td>)\s*$/.test(before) && /^\s*($|\n|<\/p>|<br\s*\/?>|<\/li>|<\/td>|\[\[)/.test(after) || /\]\]\s*$/.test(before) && /^\s*($|\n|<\/p>)/.test(after);
      toks.push([kind, arg, alone]); return `<span data-tok="${toks.length - 1}"></span>`;
    });
    h = ORGO.fmt(h).replace(/\n\s*\n/g, "<br>").replace(/\n/g, " ");
    const t = document.createElement("template"); t.innerHTML = h;
    t.content.querySelectorAll("span[data-tok]").forEach(ph => {
      const [kind, arg, alone] = toks[+ph.dataset.tok]; let node;
      try { node = ORGO.tokens[kind] ? ORGO.tokens[kind](arg, !alone) : missingFig(kind, arg) } catch (e) { console.error("figure", kind, arg, e); node = missingFig(kind, arg) }
      const wrap = document.createElement("span"); wrap.className = (alone ? "fig" : "fig-inline") + " fig-" + kind; wrap.appendChild(node); ph.replaceWith(wrap);
    });
    return t.content;
  };
  ORGO.put = (el, str) => { el.textContent = ""; el.appendChild(ORGO.html(str)); return el };
  ORGO.text = str => { const d = document.createElement("div"); d.appendChild(ORGO.html(String(str || "").replace(TOKEN, " "))); return d.textContent.replace(/\s+/g, " ").trim() };

  // ---------------------------------------------------------------- DOM
  ORGO.el = (tag, attrs, ...kids) => {
    const e = /^(svg|path|circle|line|g|text|rect|polygon|polyline|ellipse|defs|marker|tspan|title|use)$/.test(tag) ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
    for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue;
      if (k === "class") e.setAttribute("class", v); else if (k === "html") e.appendChild(ORGO.html(v)); else if (k === "text") e.textContent = v;
      else if (k === "on") for (const ev in v) e.addEventListener(ev, v[ev]); else if (k === "data") for (const d in v) e.dataset[d] = v[d];
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v); else e.setAttribute(k, v === true ? "" : v) }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) e.appendChild(kid.nodeType ? kid : document.createTextNode(kid));
    return e;
  };
  const el = ORGO.el;

  // ---------------------------------------------------------------- storage and events
  const P = C.prefix || "orgo-";
  ORGO.store = {
    get(key, fallback) { try { const v = localStorage.getItem(P + key); return v == null ? fallback : JSON.parse(v) } catch (e) { return fallback } },
    set(key, value) { try { localStorage.setItem(P + key, JSON.stringify(value)); return true } catch (e) { return false } },
    update(key, fn, fallback) { const v = fn(this.get(key, fallback)); this.set(key, v); return v },
    raw(key) { try { return localStorage.getItem(P + key) } catch (e) { return null } },
    setRaw(key, v) { try { v == null ? localStorage.removeItem(P + key) : localStorage.setItem(P + key, v) } catch (e) { } }
  };
  const store = ORGO.store, bus = new EventTarget();
  ORGO.on = (name, fn) => { const h = e => fn(e.detail); bus.addEventListener(name, h); return () => bus.removeEventListener(name, h) };
  ORGO.emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));
  // Eureka's preferences (shared/prefs.js keeps them in "eureka-prefs"), read fresh each time. Outside Eureka there are none.
  const prefs = ORGO.prefs = () => { if (!ORGO.inEureka) return {}; try { const p = JSON.parse(localStorage.getItem("eureka-prefs") || "{}"); return p && typeof p === "object" && !Array.isArray(p) ? p : {} } catch (e) { return {} } };
  Object.defineProperty(ORGO, "reduced", { get: () => !!prefs().calm || root.classList.contains("px-calm") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) });

  // ---------------------------------------------------------------- learning: schedule and mastery
  const DAY = 864e5, GAPS = [0, 1, 2, 4, 7, 14], ITEMS = "items-v1", BARE = /^\d{4}-\d{2}-\d{2}$/;
  const now = () => Date.now();
  // the saved records as the code below expects them, whatever is in storage (an older version, a merge between devices,
  // a hand edit): a record without its history list, or with a count that is not a number, must not stop a page drawing
  const count = x => (typeof x === "number" && isFinite(x) && x > 0 ? x : 0);
  function sane(all) {
    if (!all || typeof all !== "object" || Array.isArray(all)) return {};
    for (const id in all) { const r = all[id];
      if (!r || typeof r !== "object" || Array.isArray(r)) { delete all[id]; continue }
      r.n = count(r.n); r.ok = count(r.ok); r.streak = count(r.streak); r.box = Math.min(5, Math.round(count(r.box))); if (r.qn != null) r.qn = Math.min(count(r.qn), r.n);
      ["due", "last", "first"].forEach(k => { if (r[k] != null && !(typeof r[k] === "number" && isFinite(r[k]))) delete r[k] });
      r.hist = Array.isArray(r.hist) ? r.hist.filter(h => Array.isArray(h) && typeof h[0] === "number" && typeof h[1] === "number") : [] }
    return all;
  }
  const L = ORGO.learn = {
    HELPED: 0.75,      // the most an attempt finished with help can count for: under the 0.8 that counts as right
    all: () => sane(store.get(ITEMS, {})),
    state: id => L.all()[id] || null,
    examDate() { const raw = store.raw("exam-date"); const d = raw ? new Date(BARE.test(raw) ? raw + "T09:00:00" : raw) : null; return d && !isNaN(d) ? d : null },
    setExamDate(iso) {
      // a bare date is saved as Eureka's Settings saves it (date and local time), or Settings reads it as midnight UTC: the evening before
      if (BARE.test(iso || "")) { const t = /T\d\d:\d\d/.exec(store.raw("exam-date") || ""); iso += t ? t[0] : "T09:00" }
      store.setRaw("exam-date", iso || null); ORGO.emit("progress", {}); window.dispatchEvent(new CustomEvent("bio:exam", { detail: L.examDate() })) },
    daysLeft() { const d = L.examDate(); return d ? (d - now()) / DAY : null },
    // whole calendar days from today to the day of the exam, as Eureka's Settings counts "in N days": 0 on the day itself
    // (daysLeft() says whether its hour has passed), 1 the day before, negative after it, null without a date
    calendarDays() { const d = L.examDate(); return d ? Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now()).setHours(0, 0, 0, 0)) / DAY) : null },
    // score 0..1 (1 right, 0 wrong, between for rubric-graded work); conf 0 guess, 1 unsure, 2 sure
    // hinted: finished with help (the last hint, or "Show me"): kept as a miss, at most HELPED, and Eureka hears nothing of it
    // quiet: the record, the schedule and the summary change as usual, but no event goes to Eureka (the caller sends its own, or none)
    // inner: part of an answer that its caller records (a mechanism drawn inside a question): quiet, and not counted again
    //        in stats() as an answer or in delayed accuracy
    record(id, { score = 0, conf = null, secs = null, hinted = false, quiet = false, inner = false } = {}) {
      const t = now(), left = L.daysLeft();
      score = Math.max(0, Math.min(1, +score || 0)); if (hinted) score = Math.min(score, L.HELPED);
      const rec = store.update(ITEMS, all => {
        all = sane(all);
        const r = all[id] || { n: 0, ok: 0, streak: 0, box: 0, first: t, hist: [] }, was = r.hist[r.hist.length - 1];
        // "after a day or more": on a later calendar day than the last answer to this question, and at least six hours after it
        const spaced = !!r.last && t - r.last >= DAY / 4 && new Date(r.last).toDateString() !== new Date(t).toDateString();
        // right within 12 hours of the last answer to the same question does not grow the gap: after a miss its solution was
        // just read, and after a right answer it is the same retrieval again (three runs of a mechanism in a row are not spacing)
        const relearn = !!was && t - was[0] < DAY / 2;
        r.n++; r.last = t; if (inner) r.qn = (r.qn || 0) + 1;
        if (score >= 0.8) { r.ok++; r.streak++; r.box = relearn ? Math.max(1, r.box) : Math.min(5, r.box + 1) } else if (score >= 0.4) { r.streak = 0; r.box = Math.max(1, Math.min(r.box, 2)) } else { r.streak = 0; r.box = 0 }
        let gap = score >= 0.8 ? GAPS[r.box] : 0;      // a miss is due again at once
        if (left != null && left > 0) gap = Math.min(gap, Math.max(0.3, left / 3));    // leave room for two more reviews before the exam
        r.due = t + gap * DAY; if (conf != null) r.conf = conf;
        // [time, score, confidence, seconds, 1 when "after a day or more", 1 when part of an answer recorded by its caller]
        const h = [t, Math.round(score * 100) / 100, conf, secs == null ? null : Math.round(secs), spaced ? 1 : 0]; if (inner) h.push(1);
        r.hist.push(h); if (r.hist.length > 12) r.hist.shift();
        all[id] = r; return all;
      }, {})[id];
      summary(); ORGO.emit("answer", { id, score, conf, rec }); ORGO.emit("progress", {});
      if (!quiet && !inner && !hinted) { if (score >= 0.8) ORGO.eureka.right(id); else ORGO.eureka.wrong(id) }
      return rec;
    },
    flag(id, on) { store.update(ITEMS, all => { all = sane(all); const r = all[id] || (all[id] = { n: 0, ok: 0, streak: 0, box: 0, hist: [] }); r.flag = !!on; return all }, {}); summary(); ORGO.emit("progress", {}) },      // the summary Eureka reads carries the flags, so it is rebuilt at once
    due(t = now()) { const all = L.all(); return Object.keys(all).filter(id => all[id].n && all[id].due != null && all[id].due <= t && data.index[id]).sort((a, b) => all[a].due - all[b].due) },
    missed() { const all = L.all(); return Object.keys(all).filter(id => { const h = all[id].hist; return data.index[id] && all[id].n && h.length && h[h.length - 1][1] < 0.8 }) },
    flagged() { const all = L.all(); return Object.keys(all).filter(id => data.index[id] && all[id].flag) },
    // level: 0 new, 1 seen, 2 practising, 3 solid (three right in a row on different questions), 4 retained (right again on a later day)
    mastery(typeId) {
      const all = L.all(), ids = ORGO.itemsOf(typeId).filter(id => data.index[id][2] !== "worked"), seen = ids.filter(id => all[id] && all[id].n);
      const last = seen.filter(id => all[id].hist.length).map(id => { const h = all[id].hist; return [h[h.length - 1][0], h[h.length - 1][1], id] }).sort((a, b) => b[0] - a[0]);
      const recent = last.length ? last.slice(0, 8).reduce((a, x) => a + (x[1] >= 0.8 ? 1 : 0), 0) / Math.min(8, last.length) : null;
      let dN = 0, dOk = 0; const dIds = new Set(); seen.forEach(id => all[id].hist.forEach(h => { if (h[4]) { dN++; if (h[1] >= 0.8) { dOk++; dIds.add(id) } } }));
      const run = last.slice(0, 3).length === 3 && last.slice(0, 3).every(x => x[1] >= 0.8);
      let level = !seen.length ? 0 : seen.length < 3 ? 1 : 2; if (run) level = 3; if (dIds.size >= 2 && dOk / dN >= 0.75 && (run || recent >= 0.75)) level = 4;
      return { level, label: ["New", "Seen", "Practising", "Solid", "Retained"][level], seen: seen.length, total: ids.length, recent, delayed: dN ? dOk / dN : null, delayedN: dN };
    },
    // ids for a session. mode "review": due only · "learn": new ones of the given types, easiest first · "mixed": due, then the weakest types, never two of a type in a row
    pick({ types = null, n = 10, mode = "mixed", kinds = null, roles = ["practice", "exam"] } = {}) {
      const all = L.all(), side = new Set(data.blueprint.filter(t => t.group === "foundation").map(t => t.id)), want = id => { const x = data.index[id]; return x && roles.includes(x[2]) && (types ? types.includes(x[0]) : mode === "review" || !side.has(x[0])) && (!kinds || kinds.includes(x[1])) };
      const pool = Object.keys(data.index).filter(want), t = now();
      const due = pool.filter(id => all[id] && all[id].n && all[id].due <= t).sort((a, b) => all[a].due - all[b].due);
      if (mode === "review") return spread(due.slice(0, n));
      const fresh = pool.filter(id => !all[id] || !all[id].n);
      const level = {}; const lv = ty => level[ty] != null ? level[ty] : (level[ty] = L.mastery(ty).level);
      if (mode === "learn") return fresh.sort((a, b) => data.index[a][3] - data.index[b][3] || a.localeCompare(b)).slice(0, n);
      const out = due.slice(0, Math.ceil(n * 0.6));
      const rest = fresh.sort((a, b) => lv(data.index[a][0]) - lv(data.index[b][0]) || data.index[a][3] - data.index[b][3] || hash(a + day()) - hash(b + day()));
      const perType = {}; for (const id of rest) { if (out.length >= n) break; const ty = data.index[id][0]; perType[ty] = (perType[ty] || 0) + 1; if (perType[ty] <= Math.max(2, Math.ceil(n / 4))) out.push(id) }
      if (out.length < n) for (const id of pool.filter(id => !out.includes(id)).sort((a, b) => ((all[a] || {}).box || 0) - ((all[b] || {}).box || 0))) { if (out.length >= n) break; out.push(id) }
      return spread(out);
    },
    // answered: one for each marked answer. A mechanism drawn inside a question is counted once, through the question.
    stats() { const all = L.all(), own = id => all[id].n - (all[id].qn || 0), ids = Object.keys(all).filter(id => own(id) > 0); let dN = 0, dOk = 0, n = 0; ids.forEach(id => { n += own(id); all[id].hist.forEach(h => { if (h[4] && !h[5]) { dN++; if (h[1] >= 0.8) dOk++ } }) }); return { answered: n, items: ids.length, delayed: dN ? dOk / dN : null, delayedN: dN, due: L.due().length } },
    // today's session, in the order that learning research supports: recall, learn, practise mixed, apply on paper, test
    plan() {
      const left = L.daysLeft(), phase = left == null ? "build" : left < 1 ? "exam" : left <= 2 ? "rehearse" : left <= 6 ? "strengthen" : "build";
      const due = L.due().length, read = store.get("read-v1", {}), chapters = data.chapterList || [];
      const nextCh = chapters.find(c => c.sections.some(s => !(read[c.id] || {})[s.id]));
      const types = data.blueprint.filter(t => t.count && ((t.count.practice || 0) + (t.count.exam || 0)));
      const weakest = types.map(t => [L.mastery(t.id).level, t]).sort((a, b) => a[0] - b[0] || (a[1].group === "exam" ? -1 : 1))[0];
      const mocks = store.get("mock-v1", []), today = new Date().toDateString(), did = k => (store.get("today-v1", {})[today] || {})[k] || 0;
      const size = { build: 12, strengthen: 16, rehearse: 12, exam: 6 }[phase];
      const steps = [
        { step: "recall", title: "Recall", detail: due ? `${due} question${due > 1 ? "s" : ""} you answered before are due again` : "Nothing is due yet. It will be after your first session", href: "drill/index.html?mode=review", count: due, done: !due && did("review") > 0 },
        phase !== "exam" && { step: "learn", title: "Learn", detail: nextCh ? `Reading ${nextCh.n}: ${nextCh.title}` : weakest && weakest[0] < 2 ? `New question type: ${weakest[1].short || weakest[1].title}` : "Every reading is done", href: nextCh ? `read/index.html#${nextCh.id}` : weakest ? `exam/index.html#${weakest[1].id}` : "read/index.html", done: !nextCh && !(weakest && weakest[0] < 2) },
        { step: "practice", title: "Practise, mixed", detail: `${size} questions across types, weakest first`, href: `drill/index.html?mode=mixed&n=${size}`, count: size, done: did("mixed") >= size },
        phase !== "exam" && { step: "apply", title: "On paper", detail: "One mechanism and one chair problem, drawn by hand, then checked against the rubric", href: "exam/index.html?paper=1", done: did("paper") >= 2 },
        (phase === "strengthen" || phase === "rehearse") && { step: "test", title: "Test", detail: mocks.length ? `Mock exam ${mocks.length + 1}: 110 minutes, choose 7 of 9` : "Your first mock exam: 110 minutes, choose 7 of 9", href: "mock/index.html", done: mocks.some(m => new Date(m.at).toDateString() === today) },
      ].filter(Boolean);
      return { phase, left, steps };
    },
    did(kind, n = 1) { const today = new Date().toDateString(); store.update("today-v1", t => { const d = t[today] || {}; d[kind] = (d[kind] || 0) + n; return { [today]: d } }, {}) }
  };
  // a date an older version saved bare is put once in the form Settings writes, which Settings reads as local time
  // (it reads a bare date as midnight UTC: the evening before). No event: for this class it is the same moment as before.
  { const raw = store.raw("exam-date"); if (raw && BARE.test(raw)) store.setRaw("exam-date", raw + "T09:00") }
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0 };
  const day = () => new Date().toDateString();
  // no two neighbours of the same type, where that is possible
  function spread(ids) { const out = [], left = ids.slice(); while (left.length) { const prev = out.length ? data.index[out[out.length - 1]][0] : null; let i = left.findIndex(id => data.index[id][0] !== prev); if (i < 0) i = 0; out.push(left.splice(i, 1)[0]) } return out }
  // Eureka's library, dashboard and study plan read a class's progress from a drill record of this shape
  // ({v: 2, stats: {id: [attempts, right]}, hist: {id: 1 | 0}, missed, mark, days}): keep one, truthfully, beside our own.
  function summary() {
    if (!Object.keys(data.index).length) return;      // the question list is not on this page: leave the saved summary as it is
    const all = L.all(), stats = {}, hist = {}, missed = [], mark = {}, days = {};
    for (const id in all) { const r = all[id], x = data.index[id]; if (!x || x[2] === "worked") continue;      // only what class.js "progress" counts: not mechanisms, not worked examples
      if (r.flag) mark[id] = { m: "review", t: r.last || now() }; if (!r.n) continue;
      stats[id] = [r.n, r.ok]; const last = r.hist[r.hist.length - 1]; hist[id] = last && last[1] >= 0.8 ? 1 : 0; if (last && !hist[id]) missed.push(id);
      r.hist.forEach(h => { const d = new Date(h[0]), k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); days[k] = (days[k] || 0) + 1 }) }
    store.set("drill-v1", { v: 2, updatedAt: now(), stats, hist, missed, mark, days });
  }

  // ---------------------------------------------------------------- Eureka bridge
  ORGO.eureka = {
    // companions and XP, when Eureka's scripts are on the page. Filled in by assets/eureka.js (loaded only inside Eureka).
    right() { }, wrong() { }, done() { }, chapter() { }
  };

  // ---------------------------------------------------------------- UI pieces
  const ui = ORGO.ui = {};
  ui.toast = (text, ms = 2600) => { let host = document.getElementById("orgoToasts"); if (!host) { host = el("div", { id: "orgoToasts", class: "toasts", "aria-live": "polite" }); document.body.appendChild(host) } const t = el("div", { class: "toast" }, text); host.appendChild(t); setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300) }, ms) };
  // every sheet that can cover the page: ours, Eureka's (named "…-veil"), and any other modal dialog, such as the companion's
  // evolution. Each is in the page only while it is open.
  const VEILS = '.veil, [class$="-veil"], [class*="-veil "], [aria-modal="true"]';
  ui.covered = () => !!document.querySelector(VEILS);
  ui.sheet = ({ title, body, actions = [], wide = false, onClose }) => {
    const prev = document.activeElement, veil = el("div", { class: "veil", role: "presentation" });
    const close = () => { veil.remove(); document.removeEventListener("keydown", key); if (prev && prev.focus) prev.focus(); onClose && onClose() };
    const key = e => {
      const open = document.querySelectorAll(VEILS), top = open[open.length - 1]; if (top !== veil && !veil.contains(top)) return;      // another sheet lies over this one: the key is for it
      if (e.key === "Escape") return close();
      if (e.key !== "Tab") return;
      // Tab and Shift+Tab go round inside the sheet, as aria-modal says. Focus that has gone behind the sheet (to the page,
      // or to nothing) is brought back; a popup opened from the sheet, such as a dictionary card, comes after it and keeps it.
      const stops = [...sheet.querySelectorAll("a[href], button, input, select, textarea, summary, [tabindex]")].filter(x => x.tabIndex >= 0 && !x.disabled && x.getClientRects().length);
      const first = stops[0] || sheet, last = stops[stops.length - 1] || sheet, at = document.activeElement;
      const leaving = sheet.contains(at) ? at === (e.shiftKey ? first : last) || (e.shiftKey && at === sheet) : !at || at === document.body || !!(veil.compareDocumentPosition(at) & Node.DOCUMENT_POSITION_PRECEDING);
      if (leaving) { e.preventDefault(); (e.shiftKey ? last : first).focus() }
    };
    const sheet = el("div", { class: "sheet" + (wide ? " wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": title || "Dialog", tabindex: "-1" },
      el("div", { class: "sheet-head" }, el("h2", {}, title || ""), el("button", { class: "icon-btn", "aria-label": "Close", on: { click: close } }, "✕")),
      el("div", { class: "sheet-body" }, typeof body === "string" ? ORGO.html(body) : body),
      actions.length ? el("div", { class: "sheet-foot" }, actions.map(a => el("button", { class: "btn" + (a.primary ? " primary" : ""), on: { click: () => { if (a.run && a.run() === false) return; close() } } }, a.label))) : null);
    veil.appendChild(sheet); veil.addEventListener("mousedown", e => { if (e.target === veil) close() }); document.addEventListener("keydown", key); document.body.appendChild(veil); sheet.focus();
    return { close, el: sheet };
  };
  ui.tabs = (host, tabs, start) => {
    const list = el("div", { class: "tabs", role: "tablist" }), panel = el("div", { class: "tabpanel", role: "tabpanel", tabindex: "0" }); let cur = null;
    const show = id => { cur = id; [...list.children].forEach(b => { const on = b.dataset.id === id; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1 }); panel.textContent = ""; const t = tabs.find(t => t.id === id); const out = t.render(panel); if (out && out.nodeType) panel.appendChild(out) };
    tabs.forEach(t => list.appendChild(el("button", { class: "tab", role: "tab", data: { id: t.id }, on: { click: () => show(t.id) } }, t.label)));
    list.addEventListener("keydown", e => { const i = tabs.findIndex(t => t.id === cur), d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return; const n = tabs[(i + d + tabs.length) % tabs.length]; show(n.id); list.querySelector(`[data-id="${n.id}"]`).focus(); e.preventDefault() });
    host.append(list, panel); show(start && tabs.some(t => t.id === start) ? start : tabs[0].id); return { show, get current() { return cur } };
  };
  ui.ring = (frac, label, size = 44) => { const r = size / 2 - 4, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
    return el("svg", { class: "ring", viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: "img", "aria-label": label || `${Math.round(f * 100)} percent` },
      el("circle", { cx: size / 2, cy: size / 2, r, class: "ring-bg" }), el("circle", { cx: size / 2, cy: size / 2, r, class: "ring-fg", "stroke-dasharray": `${c * f} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})` })) };
  ui.levelDots = level => el("span", { class: "dots lvl" + level, role: "img", "aria-label": ["New", "Seen", "Practising", "Solid", "Retained"][level] }, [1, 2, 3, 4].map(i => el("i", { class: i <= level ? "on" : "" })));
  ui.query = () => Object.fromEntries(new URLSearchParams(location.search));
  ui.go = href => { location.href = ORGO.base + href };

  // the class's parts, for our own top bar (inside Eureka the class bar does this job)
  ORGO.portals = C.orgoPortals || [];
  function appearance() {     // only used when Eureka's settings.js is not on the page
    const t = store.raw("theme") || "auto", dark = t === "dark" || (t === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "dark" : "light";
  }
  ui.bar = () => {
    if (ORGO.inEureka || window.ORGO_EMBED || document.getElementById("orgoBar")) return;
    const here = location.pathname.replace(/index\.html$/, ""), at = p => here.endsWith("/" + p) ;
    const bar = el("nav", { id: "orgoBar", class: "obar", "aria-label": "CHEM 225" },
      el("a", { class: "obar-home", href: ORGO.base + "index.html" }, el("b", {}, C.name || "CHEM 225"), el("span", {}, C.title || "Organic Chemistry I")),
      el("div", { class: "obar-links" }, ORGO.portals.map(([label, folder]) => el("a", { href: ORGO.base + folder + "index.html", class: at(folder) ? "on" : "", "aria-current": at(folder) ? "page" : null }, label))),
      el("button", { class: "btn small ghost", "aria-label": "Appearance: light, dark or automatic", title: "Appearance", on: { click: () => { const order = ["auto", "light", "dark"], t = store.raw("theme") || "auto", n = order[(order.indexOf(t) + 1) % 3]; store.setRaw("theme", n); appearance(); ui.toast("Appearance: " + ({ auto: "automatic", light: "light", dark: "dark" })[n]) } } }, "Light / Dark"));
    document.body.insertBefore(bar, document.body.firstChild);
  };
  if (!ORGO.inEureka) { appearance(); if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", appearance) }
  // A page that sets window.ORGO_EMBED = true before this file loads Eureka's scripts itself, as Eureka's own class pages do
  // (read/index.html, the platform's reader): no bridge is loaded for it, or those scripts would load twice, and no bar is drawn.
  else if (!window.ORGO_EMBED) {
    // The appearance is Eureka's. Its settings.js comes through eureka.js, after the page can first paint, so a Dark page was
    // painted light first. Set it now, from Eureka's key and by its rule (applyTheme in shared/settings.js); settings.js
    // then sets the same values again.
    let t = null; try { t = localStorage.getItem("a104-theme") } catch (e) { }
    const dark = t === "dark" || t === "night" || (t === "auto" && !!window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "dark" : "light"; if (t === "night") root.dataset.night = "1"; else delete root.dataset.night;
    root.style.colorScheme = dark ? "dark" : "light";
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === "night" ? "#05070d" : dark ? "#000000" : "#f5f5f7";
    if (!document.querySelector('script[src*="assets/eureka.js"]')) { const s = document.createElement("script"); s.src = ORGO.base + "assets/eureka.js"; document.head.appendChild(s) }
  }
  const ready = fn => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn();
  ORGO.ready = ready;
  ready(() => { root.classList.add("orgo"); ui.bar() });
})();
