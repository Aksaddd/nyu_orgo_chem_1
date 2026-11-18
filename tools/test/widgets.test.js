#!/usr/bin/env node
// The answer controls of assets/quiz.js (ORGO.quiz._widget): marking a ranking, get() and set(state) of every kind, and
// the order of the choices. core.js and quiz.js run in a vm on a small stand-in for the DOM: elements with children,
// classes, attributes, dataset, a click, and querySelectorAll for one class or one tag. Text with markup is kept as text.
const vm = require("vm"), fs = require("fs"), path = require("path"), assert = require("assert");
const root = path.join(__dirname, "..", "..");

class Text { constructor(s) { this.nodeType = 3; this.data = String(s); this.parentNode = null } get textContent() { return this.data } }
class Elem {
  constructor(tag) {
    this.nodeType = 1; this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.attrs = {}; this.style = {};
    this.dataset = new Proxy({}, { set: (o, k, v) => { o[k] = String(v); return true } });      // a browser keeps strings there
    this.on = {}; this.hidden = false; this.disabled = false; this.checked = false; this.value = ""; this.readOnly = false; this.tabIndex = -1;
    const set = this.cls = new Set();
    this.classList = { add: (...c) => c.forEach(x => set.add(x)), remove: (...c) => c.forEach(x => set.delete(x)), contains: c => set.has(c), toggle: (c, on) => { if (on === undefined) on = !set.has(c); if (on) set.add(c); else set.delete(c); return on } };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === "class") { this.cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => this.cls.add(c)) } }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null }
  get className() { return [...this.cls].join(" ") }
  appendChild(c) { if (c.nodeType === 11) { c.children.slice().forEach(x => this.appendChild(x)); return c } if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c }
  append(...k) { k.forEach(x => this.appendChild(x && x.nodeType ? x : new Text(x))) }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c }
  remove() { if (this.parentNode) this.parentNode.removeChild(this) }
  replaceWith(n) { const p = this.parentNode; if (!p) return; const i = p.children.indexOf(this); if (n.parentNode) n.parentNode.removeChild(n); p.children[i] = n; n.parentNode = p; this.parentNode = null }
  addEventListener(t, f) { (this.on[t] = this.on[t] || []).push(f) }
  click() { if (this.disabled) return; if (this.tagName === "INPUT" && this.attrs.type === "checkbox") { this.checked = !this.checked; (this.on.change || []).forEach(f => f({ target: this, currentTarget: this })) } (this.on.click || []).forEach(f => f({ target: this, currentTarget: this, preventDefault() { } })) }
  focus() { }
  get textContent() { return this.children.map(c => c.textContent).join("") }
  set textContent(v) { this.children.forEach(c => { c.parentNode = null }); this.children = []; if (v) this.appendChild(new Text(v)) }
  querySelectorAll(sel) { const out = [], hit = e => (sel[0] === "." ? e.cls.has(sel.slice(1)) : e.tagName === sel.toUpperCase()), walk = e => e.children.forEach(c => { if (c.nodeType === 1) { if (hit(c)) out.push(c); walk(c) } }); walk(this); return out }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null }
}
const noop = () => { }, kept = {};
const document = { currentScript: null, documentElement: new Elem("html"), head: new Elem("head"), body: new Elem("body"), readyState: "loading", addEventListener: noop, removeEventListener: noop, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  createElement: t => new Elem(t), createElementNS: (ns, t) => new Elem(t), createTextNode: s => new Text(s) };
const win = { console, EventTarget, CustomEvent, setTimeout, COURSE: { base: "" }, document, localStorage: { getItem: k => (k in kept ? kept[k] : null), setItem: (k, v) => { kept[k] = String(v) }, removeItem: k => { delete kept[k] } }, location: { pathname: "/", search: "", hash: "" }, addEventListener: noop, dispatchEvent: noop };
win.window = win;
const ctx = vm.createContext(win);
for (const f of ["assets/core.js", "assets/quiz.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
const O = win.ORGO; O.html = s => new Text(String(s == null ? "" : s).replace(/<[^>]*>/g, ""));      // text only: no figures here
const W = (item, o) => O.quiz._widget(item, o || {}), plain = x => JSON.parse(JSON.stringify(x));
const opts = w => w.el.querySelectorAll(".opt");

let ran = 0;
const test = (name, fn) => { try { fn(); ran++ } catch (e) { console.error("FAIL  " + name + "\n      " + String(e.stack || e.message).split("\n").slice(0, 4).join("\n      ")); process.exitCode = 1 } };

const MCQ = { id: "t-mcq-1", kind: "mcq", stem: "Which?", choices: [{ h: "right", ok: true }, { h: "two" }, { h: "three" }, { h: "four" }] };
const MULTI = { id: "t-multi-1", kind: "multi", stem: "Which apply?", choices: [{ h: "a", ok: true }, { h: "b" }, { h: "c", ok: true }, { h: "d" }] };
const NUM = { id: "t-num-1", kind: "numeric", stem: "pKa?", answer: 10, lo: 9, hi: 11 };
const RANK = { id: "t-rank-1", kind: "rank", stem: "Order", order: "most acidic first", items: [{ h: "first" }, { h: "second" }, { h: "third" }, { h: "fourth" }] };
const CLS = { id: "t-cls-1", kind: "classify", stem: "Sort", bins: ["SN1", "SN2", "E2"], items: [{ h: "x", bin: "SN2" }, { h: "y", bin: "E2" }, { h: "z", bin: "SN1" }] };

test("rank: right only when the whole order is right, partial credit capped under 0.8", () => {
  const mk = order => { const w = W(RANK); w.set(order); return w.mark() };
  assert.strictEqual(mk([0, 1, 2, 3]), 1);
  assert.strictEqual(mk([1, 0, 2, 3]), 0.75, "one neighbouring pair exchanged: 5 of 6 pairs, capped at 0.75");
  assert.strictEqual(mk([0, 1, 3, 2]), 0.75);
  assert.strictEqual(mk([3, 0, 1, 2]), 0.5);
  assert.strictEqual(mk([3, 2, 1, 0]), 0);
  for (let i = 0; i < 20; i++) assert.notDeepStrictEqual(W(RANK).el.querySelectorAll(".rank-row").map(r => r.textContent.replace(/\d|↑|↓/g, "")), ["first", "second", "third", "fourth"], "never shown already in order");
});

test("rank: get and set", () => {
  const w = W(RANK); assert.strictEqual(w.get(), null); assert.strictEqual(w.touched(), false);
  w.set([2, 0, 3, 1]); assert.deepStrictEqual(plain(w.get()), [2, 0, 3, 1]); assert.ok(w.touched());
  assert.deepStrictEqual(w.el.querySelectorAll(".rank-h").map(e => e.textContent), ["third", "first", "fourth", "second"], "shown in that order, top first");
  for (const bad of [[0, 1, 2], [0, 0, 1, 2], [0, 1, 2, 7], "0123", null]) { const v = W(RANK); v.set(bad); assert.strictEqual(v.get(), null, JSON.stringify(bad)) }
  w.mark(); w.set([0, 1, 2, 3]); assert.deepStrictEqual(plain(w.get()), [2, 0, 3, 1], "once marked, set does nothing");
});

test("mcq: get and set by place in the item, whatever the order on screen", () => {
  let picks = 0;
  for (let i = 0; i < 10; i++) {
    const w = W(MCQ, { onPick: () => picks++ }); assert.strictEqual(w.get(), null); assert.strictEqual(w.ready(), false);
    w.set(2); assert.strictEqual(w.get(), 2); assert.ok(w.ready());
    const on = opts(w).filter(b => b.cls.has("picked")); assert.deepStrictEqual(on.map(b => b.dataset.i), ["2"]); assert.strictEqual(on[0].getAttribute("aria-pressed"), "true");
    assert.strictEqual(w.mark(), 0, "choice 2 is wrong"); w.set(0); assert.strictEqual(w.get(), 2, "once marked, set does nothing");
    const v = W(MCQ); v.set(0); assert.strictEqual(v.mark(), 1); const u = W(MCQ); u.set(1); u.set(null); assert.strictEqual(u.get(), null);
  }
  assert.strictEqual(picks, 0, "set never calls onPick");
  const w = W(MCQ, { onPick: () => picks++ }); opts(w).find(b => b.dataset.i === "3").click(); assert.deepStrictEqual([w.get(), picks], [3, 1], "a press is what get() reports");
});

test("multi: get and set", () => {
  const w = W(MULTI); assert.strictEqual(w.get(), null);
  w.set([2, 0]); assert.deepStrictEqual(plain(w.get()), [0, 2]); assert.ok(w.touched());
  assert.deepStrictEqual(opts(w).filter(l => l.querySelector("input").checked).map(l => l.dataset.i).sort(), ["0", "2"]);
  assert.strictEqual(w.mark(), 1); w.set([1]); assert.deepStrictEqual(plain(w.get()), [0, 2], "once marked, set does nothing");
  const v = W(MULTI); v.set([]); assert.deepStrictEqual([plain(v.get()), v.touched()], [[], true], "touched with nothing ticked stays so");
  const u = W(MULTI); u.set([0]); assert.strictEqual(u.mark(), 0.5 * 3 / 4);
});

test("numeric: get and set, without submitting", () => {
  let sent = 0; const w = W(NUM, { onSubmit: () => sent++ });
  assert.strictEqual(w.get(), null); w.set("−10,5"); assert.strictEqual(w.get(), "−10,5"); assert.ok(w.ready()); assert.strictEqual(sent, 0);
  w.set("10.2"); assert.strictEqual(w.mark(), 1); w.set("3"); assert.strictEqual(w.get(), "10.2", "once marked, set does nothing");
  const v = W(NUM); v.set("x"); assert.ok(!v.ready()); v.set(null); assert.strictEqual(v.get(), null);
});

test("numeric: the mark and the expected answer are never inside .explain", () => {
  const w = W(Object.assign({ note: "Phenol." }, NUM)); w.set("50"); w.mark();
  const ex = w.el.querySelectorAll(".explain"); assert.strictEqual(ex.length, 1); assert.strictEqual(ex[0].textContent, "Phenol.");
  assert.ok(/Expected: about 10/.test(w.el.querySelector(".num-result").textContent)); assert.ok(w.el.querySelector(".num-result").querySelector(".mark-no"));
});

test("classify: get and set; the mark stays out of .explain", () => {
  const w = W(CLS); assert.strictEqual(w.get(), null);
  w.set(["SN2", null, "SN1"]); assert.deepStrictEqual(plain(w.get()), ["SN2", null, "SN1"]); assert.ok(!w.ready());
  w.set(["SN2", "SN1", "SN1"]); assert.ok(w.ready());
  assert.deepStrictEqual(w.el.querySelectorAll(".seg").map(s => s.children.filter(b => b.getAttribute("aria-pressed") === "true").map(b => b.dataset.bin).join()), ["SN2", "SN1", "SN1"]);
  const s = w.mark(); assert.ok(Math.abs(s - 2 / 3) < 1e-9);
  assert.strictEqual(w.el.querySelectorAll(".explain").filter(e => e.querySelector(".mark-ok") || e.querySelector(".mark-no")).length, 0);
  assert.strictEqual(w.el.querySelectorAll(".cls-mark").length, 3);
  const v = W(CLS); v.set(["E1", "nonsense"]); assert.strictEqual(v.get(), null, "bins not in the item are not kept");
});

test("choices: written order when fixed; with 'keep the same order', the same order every time, and not the written one", () => {
  for (let i = 0; i < 5; i++) assert.deepStrictEqual(opts(W(Object.assign({ fixed: true }, MCQ))).map(b => b.dataset.i), ["0", "1", "2", "3"]);
  O.inEureka = true; kept["eureka-prefs"] = JSON.stringify({ fixedOrder: true });
  const ids = []; for (let k = 0; k < 40; k++) ids.push("t-q-" + k);
  const order = id => opts(W(Object.assign({}, MCQ, { id }))).map(b => b.dataset.i).join("");
  ids.forEach(id => assert.strictEqual(order(id), order(id), id));
  assert.ok(ids.filter(id => order(id) === "0123").length < 8, "an order made from the id, not the written order");
  assert.ok(new Set(ids.map(order)).size > 8, "and not one order for every question");
  O.inEureka = false; delete kept["eureka-prefs"];
});

test("fewer choices: the right one and one other, and every choice after 'Show all'", () => {
  let more = 0;
  for (let i = 0; i < 20; i++) {
    const w = W(MCQ, { fewer: true, onMore: () => more++ }), shown = opts(w).filter(b => !b.hidden);
    assert.strictEqual(shown.length, 2); assert.ok(shown.some(b => b.dataset.i === "0"), "the right choice is shown");
    const btn = w.el.querySelector(".q-more"); assert.strictEqual(btn.textContent, "Show all 4 choices");
    if (i % 2) { btn.click(); assert.strictEqual(opts(w).filter(b => !b.hidden).length, 4); assert.strictEqual(w.el.querySelector(".q-more"), null) }
    else { const hid = opts(w).find(b => b.hidden); w.set(+hid.dataset.i); assert.ok(!hid.hidden, "restoring a hidden choice shows them all") }
  }
  assert.strictEqual(more, 20);
  assert.strictEqual(opts(W(MCQ)).filter(b => !b.hidden).length, 4, "not asked for: every choice");
  assert.strictEqual(opts(W(Object.assign({}, MCQ, { choices: MCQ.choices.slice(0, 3) }), { fewer: true })).filter(b => !b.hidden).length, 3, "three choices: all of them");
});

console.log(`widgets: ${ran} groups of checks passed`);
