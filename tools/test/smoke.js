#!/usr/bin/env node
// End-to-end check in a real browser, from file:// (no server): opens every page, draws every reading, mounts every
// question, worked example and mechanism, and fails if anything throws, logs an error, or leaves a figure undrawn.
//   node tools/test/smoke.js            (needs Playwright; not part of tools/test/run.js)
// From file:// the class is on its own, outside Eureka. Its front page and its reader are then alone/index.html and
// alone/read/index.html: index.html and read/index.html are Eureka's pages and only send the browser there (step 0).
// Eureka's reader itself (read/index.html with read/chapters.js) needs Eureka around it and is not opened here: the build
// checks its data (node tools/build.js --check), and it is tried in a browser inside a Eureka site.
const { chromium } = require("playwright"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), url = p => "file://" + path.join(ROOT, p);
const quiet = u => /shared\/(platform\.js|maison\.css)|_vercel/.test(u);
(async () => {
  const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage(), problems = []; let where = "";
  const note = (w, t) => problems.push(`${w}: ${String(t).replace(/\s+/g, " ").slice(0, 260)}`);
  let leaving = false;      // true while a page of Eureka's is on its way to the class's own page: what it logs before it leaves is not a fault
  page.on("console", m => { if (!leaving && m.type() === "error" && !quiet(m.text() + " " + ((m.location() || {}).url || ""))) note(where, "console: " + m.text()) });
  page.on("pageerror", e => { if (!leaving) note(where, "error: " + e.message) });
  page.on("requestfailed", r => { if (!leaving && !quiet(r.url())) note(where, "missing file: " + r.url().replace(/.*nyu_orgo_chem_1\//, "")) });
  const open = async (p, wait = 350) => { where = p; await page.goto(url(p)); await page.waitForTimeout(wait) };
  const missing = async () => page.evaluate(() => [...document.querySelectorAll(".fig-missing")].map(e => e.textContent.slice(0, 60)));
  const counts = {};

  // 0. outside Eureka, Eureka's two pages lead to the class's own: the reader always, the front page once it is Eureka's
  for (const [p, to, must] of [["read/index.html#rings-1", "alone/read/index.html#rings-1", true], ["index.html", "alone/index.html", false]]) {
    leaving = true; where = p; await page.goto(url(p)); await page.waitForTimeout(900); leaving = false;
    const at = page.url(), n = await page.evaluate(() => (document.getElementById("app") || document.body).textContent.trim().length);
    if (must ? !at.endsWith(to) : !(at.endsWith(to) || at.endsWith(p))) note(p, "does not lead to " + to + " (it is at " + at.replace(/.*\//, "") + ")");
    if (n < 40) note(p, "leads to an empty page");
  }
  // 1. every page opens and draws something
  for (const p of ["alone/index.html", "alone/read/index.html", "exam/index.html", "drill/index.html", "mechanisms/index.html", "mock/index.html", "lab/index.html", "foundations/index.html", "review/index.html", "archive/index.html", "syllabus/index.html"]) {
    await open(p); const n = await page.evaluate(() => document.getElementById("app").textContent.trim().length); if (n < 40) note(p, "the page is empty");
  }
  // 2. every reading, with its expanders open
  await open("alone/read/index.html"); const chapters = await page.evaluate(() => (ORGO.data.chapterList || []).map(c => c.id)); counts.readings = chapters.length;
  for (const id of chapters) {
    await open("alone/read/index.html#" + id, 700); await page.evaluate(() => document.querySelectorAll("details").forEach(d => d.open = true)); await page.waitForTimeout(150);
    for (const m of await missing()) note("reading " + id, "figure not drawn: " + m);
    const secs = await page.evaluate(() => document.querySelectorAll("h2, h3").length); if (secs < 3) note("reading " + id, "no sections drawn");
  }
  // 3. every item, worked example, type sheet and mechanism, mounted directly
  await open("drill/index.html");
  const res = await page.evaluate(async () => {
    const out = { items: 0, worked: 0, types: 0, mechs: 0, bad: [] }, types = ORGO.data.blueprint.map(t => t.id);
    await ORGO.need(types.map(t => "t/" + t), "mech").catch(e => out.bad.push("data: " + e.message));
    const host = document.createElement("div"); document.body.appendChild(host);
    const figs = (el, id) => el.querySelectorAll(".fig-missing").forEach(f => out.bad.push(id + ": figure not drawn: " + f.textContent.slice(0, 60)));
    for (const id of Object.keys(ORGO.data.items)) {
      const it = ORGO.data.items[id], el = document.createElement("div"); host.appendChild(el);
      try {
        if (it.role === "worked") { ORGO.quiz.worked(el, it); out.worked++ } else { ORGO.quiz.mount(el, it, { review: true }); out.items++ }
        el.appendChild(ORGO.quiz.solution(it)); if (it.model) el.appendChild(ORGO.html(it.model));
        if (el.textContent.trim().length < 20) out.bad.push(id + ": drew nothing"); figs(el, id);
      } catch (e) { out.bad.push(id + ": " + e.message) }
      host.removeChild(el);
    }
    for (const t of types) {
      const ty = ORGO.data.types[t]; if (!ty) continue; out.types++; const el = document.createElement("div"); host.appendChild(el);
      try { [...(ty.know || []).map(k => k.h), ...(ty.method || []), ...(ty.pitfalls || []).map(p => p.h)].forEach(h => el.appendChild(ORGO.html(h))); figs(el, "type " + t) } catch (e) { out.bad.push("type " + t + ": " + e.message) }
      host.removeChild(el);
    }
    for (const id of Object.keys(ORGO.data.mechs)) {
      for (const mode of ["watch", "solo", "paper"]) {
        const el = document.createElement("div"); host.appendChild(el);
        try { ORGO.mech.mount(el, id, { mode }); figs(el, "mechanism " + id) } catch (e) { out.bad.push("mechanism " + id + " (" + mode + "): " + e.message) }
        host.removeChild(el);
      }
      try { const c = ORGO.mech.card(id); if (!c || !c.querySelector("svg")) out.bad.push("mechanism " + id + ": card has no drawing") } catch (e) { out.bad.push("mechanism card " + id + ": " + e.message) }
      out.mechs++;
    }
    out.kinds = {}; Object.values(ORGO.data.items).forEach(i => out.kinds[i.kind] = (out.kinds[i.kind] || 0) + 1);
    return out;
  });
  res.bad.forEach(b => note("bank", b)); Object.assign(counts, { items: res.items, worked: res.worked, types: res.types, mechanisms: res.mechs, kinds: res.kinds });
  // 4. the original exam, each question; each type page with its tabs
  for (let n = 1; n <= 9; n++) { await open("exam/index.html#q" + n, 600); for (const m of await missing()) note("exam q" + n, "figure not drawn: " + m) }
  const typeIds = await page.evaluate(() => ORGO.data.blueprint.filter(t => t.has).map(t => t.id));
  for (const t of typeIds) {
    await open("exam/index.html#" + t, 500); const tabs = await page.$$('[role="tab"]');
    for (const tab of tabs) { await tab.click().catch(() => { }); await page.waitForTimeout(120) }
    for (const m of await missing()) note("type page " + t, "figure not drawn: " + m);
  }
  // 5. a practice session answered at random to the end
  await open("drill/index.html?mode=mixed&n=10", 900);
  for (let i = 0; i < 160; i++) {
    const did = await page.evaluate(() => {
      const pick = s => [...document.querySelectorAll(s)].filter(e => e.offsetParent && !e.disabled), t = e => (e.textContent || "").trim().toLowerCase();
      const btns = pick("#app button"), go = btns.find(b => /^(next|continue|finish|see the summary|done)/.test(t(b))); if (go) { go.click(); return "next" }
      const inp = pick("#app input[type=number], #app input[type=text]")[0]; if (inp && !inp.value) { inp.value = "10"; inp.dispatchEvent(new Event("input", { bubbles: true })) }
      const opt = pick("#app .opt:not(.picked):not(.right):not(.wrong)")[0]; if (opt) { opt.click(); return "opt" }
      const act = btns.find(b => /^(check|i have written it|show|sure|unsure|guessing|full|reveal|show me|next step)/.test(t(b))); if (act) { act.click(); return "act" }
      const any = btns.find(b => !/flag|print|pause/.test(t(b)) && !b.closest("nav")); if (any) { any.click(); return "any" } return "stuck";
    });
    await page.waitForTimeout(60); if (did === "stuck") break;
  }
  await browser.close();
  console.log(JSON.stringify(counts));
  if (problems.length) { const seen = new Set(), uniq = problems.filter(p => !seen.has(p) && seen.add(p)); console.log(`${uniq.length} problem(s):\n  ` + uniq.slice(0, +process.env.MAX || 60).join("\n  ")); process.exit(1) }
  console.log("ok");
})().catch(e => { console.error("smoke test crashed: " + e.message); process.exit(2) });
