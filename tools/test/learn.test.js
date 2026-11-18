#!/usr/bin/env node
// The record rules of ORGO.learn (assets/core.js): node tools/test/learn.test.js
// core.js runs in a vm with small stand-ins for the page and localStorage, and with a clock the test sets.
process.env.TZ = "America/New_York";      // calendar days are local days: fix the zone so the test means the same everywhere
const vm = require("vm"), fs = require("fs"), path = require("path"), assert = require("assert");
const root = path.join(__dirname, "..", "..");
const DAY = 864e5, H = 36e5, at = s => Date.parse(s);

function load(kept = {}) {
  let clock = at("2026-11-18T10:00:00-05:00");
  class Clock extends Date { constructor(...a) { if (a.length) super(...a); else super(clock) } static now() { return clock } }
  const noop = () => { }, node = () => ({ classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, dataset: {}, style: {}, setAttribute: noop, appendChild: noop, addEventListener: noop });
  const win = {
    console, EventTarget, CustomEvent, setTimeout, Date: Clock, COURSE: { base: "" },
    document: { currentScript: null, documentElement: node(), head: node(), body: node(), readyState: "loading", addEventListener: noop, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: node },
    localStorage: { getItem: k => (k in kept ? kept[k] : null), setItem: (k, v) => { kept[k] = String(v) }, removeItem: k => { delete kept[k] } },
    location: { pathname: "/", search: "", hash: "", href: "" }, addEventListener: noop, dispatchEvent: noop
  };
  win.window = win;
  vm.runInContext(fs.readFileSync(path.join(root, "assets/core.js"), "utf8"), vm.createContext(win), { filename: "assets/core.js" });
  const O = win.ORGO, events = [];
  O.reg({ index: { q1: ["t1", "mcq", "practice", 1], q2: ["t1", "mcq", "practice", 2], q3: ["t1", "rank", "practice", 3], w1: ["t1", "mcq", "worked", 1] }, blueprint: [{ id: "t1", group: "exam", count: { practice: 3 } }] });
  O.eureka.right = id => events.push("right:" + id); O.eureka.wrong = id => events.push("wrong:" + id);
  return { O, L: O.learn, kept, events, set: s => { clock = typeof s === "number" ? s : at(s) }, now: () => clock };
}
let ran = 0;
const test = (name, fn) => { try { fn(); ran++ } catch (e) { console.error("FAIL  " + name + "\n      " + String(e.stack || e.message).split("\n").slice(0, 4).join("\n      ")); process.exitCode = 1 } };
const days = r => Math.round((r.due - r.last) / DAY * 100) / 100, plain = x => JSON.parse(JSON.stringify(x));      // arrays made in the vm have its own prototypes

test("a right answer: one event, box 1, due in a day", () => {
  const t = load(), r = t.L.record("q1", { score: 1 });
  assert.deepStrictEqual([r.n, r.ok, r.box, days(r)], [1, 1, 1, 1]); assert.deepStrictEqual(t.events, ["right:q1"]);
});

test("quiet: the record and the schedule change, and no event", () => {
  const t = load(), r = t.L.record("q1", { score: 1, quiet: true });
  assert.deepStrictEqual([r.n, r.ok, r.box], [1, 1, 1]); assert.deepStrictEqual(t.events, []); assert.strictEqual(t.L.stats().answered, 1);
});

test("a mechanism inside a question: one event and one answer, through the question", () => {
  const t = load();
  t.L.record("mech:m1", { score: 1, inner: true }); t.L.record("q1", { score: 1 });
  const m = t.L.state("mech:m1");
  assert.deepStrictEqual(t.events, ["right:q1"]); assert.deepStrictEqual([m.n, m.ok, m.qn, m.hist[0][5]], [1, 1, 1, 1]);
  assert.deepStrictEqual([t.L.stats().answered, t.L.stats().items], [1, 1]);
  t.L.record("mech:m1", { score: 1 });       // the same mechanism in the Studio: an answer of its own
  assert.deepStrictEqual(t.events, ["right:q1", "right:mech:m1"]); assert.deepStrictEqual([t.L.stats().answered, t.L.stats().items], [2, 2]);
});

test("finished with help: a miss of at most 0.75, no event, due at once", () => {
  const t = load(), r = t.L.record("q1", { score: 1, hinted: true });
  assert.deepStrictEqual([r.ok, r.streak, r.hist[0][1], days(r)], [0, 0, 0.75, 0]); assert.deepStrictEqual(t.events, []);
  assert.deepStrictEqual(plain(t.L.missed()), ["q1"]); assert.strictEqual(t.L.HELPED, 0.75);
  const s = t.L.record("q2", { score: 0, hinted: true });       // every step shown
  assert.deepStrictEqual([s.box, s.hist[0][1], t.events.length], [0, 0, 0]);
});

test("a miss is due again at once, also when the exam is near", () => {
  const t = load({ "orgo-exam-date": "2026-11-21T09:00" });
  for (const score of [0, 0.5, 0.75]) assert.strictEqual(days(t.L.record("q1", { score })), 0, "score " + score);
  assert.ok(days(t.L.record("q2", { score: 1 })) >= 0.3, "a right answer keeps a gap");
});

test("right on the retry within 12 hours of a miss keeps the box", () => {
  const t = load();
  t.L.record("q1", { score: 1 });                                   // right the first time: box 1, a day
  t.L.record("q2", { score: 0.67 }); t.set(t.now() + 5 * 60e3);
  const r = t.L.record("q2", { score: 1 });                         // partly right, then right five minutes later
  assert.deepStrictEqual([r.box, days(r)], [1, 1], "no further away than right the first time");
  t.L.record("q3", { score: 0 }); t.set(t.now() + 11 * H); assert.strictEqual(t.L.record("q3", { score: 1 }).box, 1);
  // an older question: box 3, then a partial answer, then right within 12 hours: it keeps box 2, not 3
  const u = load(); u.L.record("q1", { score: 1 }); for (let d = 1; d <= 2; d++) { u.set(u.now() + 2 * DAY); u.L.record("q1", { score: 1 }) }
  assert.strictEqual(u.L.state("q1").box, 3); u.set(u.now() + 3 * DAY); u.L.record("q1", { score: 0.5 }); u.set(u.now() + H);
  assert.strictEqual(u.L.record("q1", { score: 1 }).box, 2);
  // right 13 hours after a miss: the gap grows as usual
  const v = load(); v.L.record("q1", { score: 0 }); v.set(v.now() + 13 * H); v.L.record("q1", { score: 1 }); v.set(v.now() + 13 * H);
  assert.strictEqual(v.L.record("q1", { score: 1 }).box, 2);
});

test("'after a day or more' means a later calendar day and at least six hours", () => {
  const flag = (a, b) => { const t = load(); t.set(a); t.L.record("q1", { score: 1 }); t.set(b); return t.L.record("q1", { score: 1 }).hist[1][4] };
  assert.strictEqual(flag("2026-11-18T08:00:00-05:00", "2026-11-18T20:30:00-05:00"), 0, "12.5 hours, the same day");
  assert.strictEqual(flag("2026-11-18T22:30:00-05:00", "2026-11-19T09:00:00-05:00"), 1, "the next morning, a night between");
  assert.strictEqual(flag("2026-11-18T23:30:00-05:00", "2026-11-19T00:30:00-05:00"), 0, "one hour, over midnight");
  assert.strictEqual(flag("2026-11-18T10:00:00-05:00", "2026-11-19T10:30:00-05:00"), 1, "a day later");
  const t = load(); t.L.record("mech:m1", { score: 1, inner: true }); t.set(t.now() + 2 * DAY); t.L.record("mech:m1", { score: 1, inner: true });
  assert.strictEqual(t.L.stats().delayedN, 0, "a part of another answer is not counted in delayed accuracy");
});

test("a damaged record never makes a call throw", () => {
  const bad = { q1: { n: 2, ok: 1, box: 1, due: 0 }, q2: { n: 1, ok: 1, box: 1, hist: null }, q3: { n: "x", ok: null, box: 9, hist: [null, [1, "a"], "z"] }, "mech:m1": { n: 1, ok: 0 }, w1: 7, q9: [1, 2] };
  const t = load({ "orgo-items-v1": JSON.stringify(bad) }), L = t.L;
  for (const f of ["stats", "missed", "flagged", "due", "plan", "all"]) assert.doesNotThrow(() => L[f](), f);
  assert.doesNotThrow(() => L.mastery("t1")); assert.doesNotThrow(() => L.pick({ mode: "mixed", n: 4 })); assert.doesNotThrow(() => L.pick({ mode: "review" }));
  assert.doesNotThrow(() => L.flag("q2", true));
  const r = L.record("q2", { score: 1 }); assert.deepStrictEqual([r.n, r.ok, r.hist.length], [2, 2, 1]);
  const q3 = L.state("q3"); assert.deepStrictEqual([q3.n, q3.ok, q3.box, q3.hist.length], [0, 0, 5, 0]);
  assert.strictEqual(L.state("w1"), null, "a record that is not an object is left out");
  assert.doesNotThrow(() => JSON.parse(t.kept["orgo-drill-v1"]), "the summary for Eureka is still written");
});

test("calendarDays: whole days as Eureka's Settings counts them", () => {
  const t = load({ "orgo-exam-date": "2026-12-01T09:00" }), L = t.L;
  const cal = now => { t.set(now); return L.calendarDays() };
  assert.strictEqual(cal("2026-11-18T10:00:00-05:00"), 13);
  assert.strictEqual(cal("2026-11-30T23:00:00-05:00"), 1);
  assert.strictEqual(cal("2026-12-01T07:30:00-05:00"), 0);
  assert.strictEqual(cal("2026-12-01T12:00:00-05:00"), 0, "the day of the exam, after its hour");
  assert.strictEqual(cal("2026-12-03T12:00:00-05:00"), -2);
  const s = load({ "orgo-exam-date": "2027-03-09T08:00" }); s.set("2027-03-07T23:30:00-05:00"); assert.strictEqual(s.L.calendarDays(), 2, "over the change of the clocks");
  assert.strictEqual(load().L.calendarDays(), null);
});

test("a bare exam date from an older version is put once in the form Settings reads", () => {
  const t = load({ "orgo-exam-date": "2026-12-10" });
  assert.strictEqual(t.kept["orgo-exam-date"], "2026-12-10T09:00"); assert.strictEqual(t.L.examDate().getHours(), 9);
  assert.strictEqual(load({ "orgo-exam-date": "2026-12-14T14:30" }).kept["orgo-exam-date"], "2026-12-14T14:30", "a date with its time is left alone");
});

test("preferences are Eureka's, and there are none outside it", () => {
  const t = load({ "eureka-prefs": JSON.stringify({ fixedOrder: true, explain: "ask" }) });
  assert.deepStrictEqual(plain(t.O.prefs()), {}, "outside Eureka");
  t.O.inEureka = true; assert.strictEqual(t.O.prefs().explain, "ask");
  t.kept["eureka-prefs"] = "[1]"; assert.deepStrictEqual(plain(t.O.prefs()), {}); t.kept["eureka-prefs"] = "{oops"; assert.deepStrictEqual(plain(t.O.prefs()), {});
});

test("formulas are one word for the dictionary", () => {
  const t = load();
  assert.strictEqual(t.O.fmt("{{SN2}} and {{pKa}}"), '<span class="chem" data-lk>S<sub>N</sub>2</span> and <span class="chem" data-lk>p<i>K</i><sub>a</sub></span>');
});

console.log(`learn: ${ran} groups of checks passed`);
