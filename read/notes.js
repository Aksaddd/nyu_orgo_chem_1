// Read & Learn highlights and notes. Select text in a passage to highlight it in one of four colors and/or attach a
// note; tap a highlight to edit or delete it. On phones, press and hold to select (double-tap is the word lookup in
// assets/lookup.js). Saved per device as orgo-notes-v1:
//   { "chapterId:passageIndex": [{ id, s, e, text, color, note, t }] }  where s/e are character offsets in the passage text.
(() => {
  const KEY = "orgo-notes-v1", COLORS = ["yellow", "green", "blue", "pink"];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let db = {}; try { db = JSON.parse(localStorage.getItem(KEY) || "{}") || {} } catch (e) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch (e) { } };
  const list = k => db[k] || (db[k] = []);
  const find = id => { for (const k in db) { const i = (db[k] || []).findIndex(x => x.id === id); if (i >= 0) return { k, i, x: db[k][i] } } return null };
  let ctx = null;   // { chapter, onChange }

  // CHEM 225: a passage here has drawings and a few controls in it (the lines that open a folded block, links). Their letters
  // are not words of the passage: they are not counted, not marked and not quoted (read/chem.js: ReadChem.text, skip, quote),
  // so a highlight keeps its place whatever a drawing is made of, and never lands inside one (a <mark> in an <svg> is not drawn).
  // (read/chem.js loads after this file, so window.ReadChem is looked up when it is needed, not now)
  const RC = () => window.ReadChem, words = r => RC() ? RC().text(r) : r.toString(), quote = r => RC() ? RC().quote(r) : r.toString(), skip = n => !!(RC() && RC().skip(n));
  // character offset of (node, off) inside a passage
  const offsetIn = (root, node, off) => { const r = document.createRange(); r.setStart(root, 0); r.setEnd(node, off); return words(r).length };   // CHEM 225: words(r), was r.toString()
  // wrap [s, e) of the passage's text in <mark> elements (one per text node it crosses)
  function wrap(root, s, e, cls, id) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n, pos = 0; const cut = [];
    while ((n = w.nextNode())) { if (skip(n)) continue; const a = pos, b = pos + n.length; pos = b; if (b <= s || a >= e) continue; cut.push([n, Math.max(s, a) - a, Math.min(e, b) - a]) }   // CHEM 225: skip(n)
    cut.forEach(([n, a, b], i) => {
      if (b <= a) return;
      let t = n; if (a > 0) t = t.splitText(a); if (b - a < t.length) t.splitText(b - a);
      const m = document.createElement("mark"); m.className = cls + (i === cut.length - 1 ? " an-last" : ""); m.dataset.an = id; t.parentNode.insertBefore(m, t); m.appendChild(t);
    });
  }
  function paint(root, key) {
    fit(root, key);   // CHEM 225
    for (const x of list(key).slice().sort((a, b) => a.s - b.s)) wrap(root, x.s, x.e, `an an-${x.color}${x.note ? " has-note" : ""}`, x.id);
  }
  // CHEM 225: when the wording of a passage is corrected, the words after the change move, and a highlight filed by place
  // would mark other words. A highlight whose own words (its text, white space aside) are no longer at its place is put on
  // the nearest place where they are, and saved there. One whose words are nowhere in the passage stays where it was.
  function fit(root, key) {
    const L = db[key]; if (!L || !L.length) return;
    const r = document.createRange(); r.selectNodeContents(root); const T = words(r), at = []; let flat = "";
    for (let i = 0; i < T.length; i++) if (!/\s/.test(T[i])) { at.push(i); flat += T[i] }
    const sq = s => String(s).replace(/\s+/g, ""); let moved = false;
    for (const x of L) {
      const want = sq(x.text), cut = String(x.text).length >= 400, here = sq(T.slice(x.s, x.e));   // a long highlight keeps only its first 400 letters
      if (!want || (cut ? here.startsWith(want) : here === want)) continue;
      let best = -1; for (let i = flat.indexOf(want); i >= 0; i = flat.indexOf(want, i + 1)) if (best < 0 || Math.abs(at[i] - x.s) < Math.abs(at[best] - x.s)) best = i;
      if (best < 0) continue;
      const s = at[best], e = cut ? Math.min(T.length, s + (x.e - x.s)) : at[best + want.length - 1] + 1;
      if (s !== x.s || e !== x.e) { x.s = s; x.e = e; moved = true }
    }
    if (moved) save();
  }
  function apply(c) {
    ctx = ctx || {}; ctx.chapter = c;
    // a passage may be on screen at another reading level (shared/readlevels.js); each level keeps its own highlights,
    // under the passage's key followed by "@level.density"
    document.querySelectorAll(".rd-sec[id^=sec]").forEach(sec => sec.querySelectorAll(".rd-prose").forEach(p => paint(p, c.id + ":" + sec.id.slice(3) + (p.dataset.alt ? "@" + p.dataset.lv : ""))));
    countBadge();
  }
  const countIn = id => Object.keys(db).filter(k => k.startsWith(id + ":")).reduce((n, k) => n + db[k].length, 0);
  const countAll = () => Object.values(db).reduce((n, l) => n + l.length, 0);
  function countBadge() { const b = document.getElementById("anCount"); if (b && ctx && ctx.chapter) b.textContent = countIn(ctx.chapter.id) || "" }

  // ----- selection → toolbar
  let bar = null, pop = null;
  const closeBar = () => { if (bar) { bar.remove(); bar = null } };
  const closePop = () => { if (pop) { pop.remove(); pop = null } };
  function selInfo() {
    const sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed) return null;
    const r = sel.getRangeAt(0), p1 = (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement).closest(".rd-prose"), p2 = (r.endContainer.nodeType === 1 ? r.endContainer : r.endContainer.parentElement).closest(".rd-prose");
    if (!p1 || p1 !== p2) return null;
    const s = offsetIn(p1, r.startContainer, r.startOffset), e = offsetIn(p1, r.endContainer, r.endOffset), text = quote(r).trim();   // CHEM 225: quote(r), was r.toString()
    if (e - s < 2 || !text) return null;
    const lv = p1.dataset.alt ? p1.dataset.lv || "" : "";   // "" = the exam version, the passage as written
    return { prose: p1, key: ctx.chapter.id + ":" + p1.closest(".rd-sec").id.slice(3) + (lv ? "@" + lv : ""), lv, s, e, text, rect: r.getBoundingClientRect() };
  }
  function showBar() {
    closeBar(); if (!ctx || !ctx.chapter) return;
    const info = selInfo(); if (!info) return;
    bar = document.createElement("div"); bar.className = "an-bar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Highlight");
    bar.innerHTML = COLORS.map(c => `<button type="button" class="an-dot an-${c}" data-c="${c}" aria-label="Highlight ${c}"></button>`).join("") + `<button type="button" class="an-note" aria-label="Highlight and add a note">✎ Note</button>`;
    document.body.appendChild(bar);
    const W = bar.offsetWidth, H = bar.offsetHeight, rc = info.rect;
    bar.style.left = Math.min(Math.max(8, rc.left + rc.width / 2 - W / 2), innerWidth - W - 8) + "px";
    bar.style.top = (rc.top - H - 10 > 60 ? rc.top - H - 10 : rc.bottom + 10) + "px";
    const make = (color, withNote) => {
      const x = { id: "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), s: info.s, e: info.e, text: info.text.slice(0, 400), color, note: "", t: Date.now(), lv: info.lv || "" };   // lv: the reading level the words were taken from
      list(info.key).push(x); save(); getSelection().removeAllRanges(); closeBar(); rerender();
      if (withNote) setTimeout(() => openPop(x.id, true), 30);
    };
    bar.querySelectorAll(".an-dot").forEach(b => b.onpointerdown = e => { e.preventDefault(); make(b.dataset.c, false) });
    bar.querySelector(".an-note").onpointerdown = e => { e.preventDefault(); make("yellow", true) };
  }
  function rerender() {   // redraw the marks in every passage on screen without re-rendering the chapter
    document.querySelectorAll("mark.an").forEach(m => { const p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); m.remove(); p.normalize() });
    if (ctx && ctx.chapter) apply(ctx.chapter);
    if (ctx && ctx.onChange) ctx.onChange();
  }
  let selT = 0;
  document.addEventListener("selectionchange", () => { clearTimeout(selT); selT = setTimeout(() => { if (selInfo()) showBar(); else closeBar() }, 250) });

  // ----- tap a highlight → edit the note, change color, delete
  function openPop(id, focus) {
    closePop(); const f = find(id); if (!f) return; const x = f.x;
    const m = document.querySelector(`mark[data-an="${id}"]`); const rc = m ? m.getBoundingClientRect() : { left: innerWidth / 2, top: 100, bottom: 100, width: 0 };
    pop = document.createElement("div"); pop.className = "an-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Highlight and note");
    pop.innerHTML = `<div class="an-q an-${x.color}">“${esc(x.text.length > 160 ? x.text.slice(0, 160) + "…" : x.text)}”</div>
      <span class="an-lv" style="display:inline-block;margin:0 0 8px">${esc(levelName(f.k.split("@")[1] || ""))}</span>
      <textarea class="an-ta" rows="3" placeholder="Write a note…" aria-label="Note">${esc(x.note)}</textarea>
      <div class="an-row">${COLORS.map(c => `<button type="button" class="an-dot an-${c}${c === x.color ? " on" : ""}" data-c="${c}" aria-label="${c}"></button>`).join("")}<span style="flex:1"></span><button type="button" class="an-del">Delete</button><button type="button" class="an-ok">Done</button></div>`;
    document.body.appendChild(pop);
    const W = Math.min(340, innerWidth - 20), H = pop.offsetHeight; pop.style.width = W + "px";
    pop.style.left = Math.min(Math.max(10, rc.left + rc.width / 2 - W / 2), innerWidth - W - 10) + "px";
    pop.style.top = (rc.bottom + 10 + H < innerHeight ? rc.bottom + 10 : Math.max(10, rc.top - H - 10)) + "px";
    const ta = pop.querySelector("textarea");
    ta.oninput = () => { x.note = ta.value.slice(0, 2000); save() };
    pop.querySelectorAll(".an-dot").forEach(b => b.onclick = () => { x.color = b.dataset.c; save(); pop.querySelectorAll(".an-dot").forEach(d => d.classList.toggle("on", d === b)); pop.querySelector(".an-q").className = "an-q an-" + x.color; rerender() });
    pop.querySelector(".an-del").onclick = () => { db[f.k].splice(db[f.k].indexOf(x), 1); if (!db[f.k].length) delete db[f.k]; save(); closePop(); rerender() };
    pop.querySelector(".an-ok").onclick = () => { closePop(); rerender() };
    if (focus) ta.focus();
  }
  let tapT = 0;
  document.addEventListener("click", e => {
    const m = e.target.closest && e.target.closest("mark.an");
    if (m && !getSelection().toString()) {   // wait a beat: a second tap means "look the word up", not "edit"
      e.preventDefault(); clearTimeout(tapT); const id = m.dataset.an;
      tapT = setTimeout(() => { if (!document.querySelector(".lk-card")) openPop(id) }, 400); return;
    }
    if (pop && !pop.contains(e.target)) { closePop(); rerender() }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closePop(); closeBar() } });
  addEventListener("scroll", closeBar, { passive: true });

  // ----- notebook: every highlight and note (this chapter, or all chapters)
  function notebook(onlyChapter) {
    closePop(); const R = window.READ, sheet = document.createElement("div"); sheet.className = "an-veil";
    const chs = R.filter(c => !onlyChapter || c.id === onlyChapter);
    const rows = chs.map(c => {
      const items = c.sections.flatMap((s, i) => Object.keys(db).filter(k => k === c.id + ":" + i || k.startsWith(c.id + ":" + i + "@")).sort().flatMap(k => db[k].slice().sort((a, b) => a.s - b.s).map(x => ({ x, i, s, lv: k.split("@")[1] || "" }))));
      return items.length ? `<h4>${esc(c.title)}</h4>${items.map(({ x, i, s, lv }) => `<button type="button" class="an-item" data-ch="${c.id}" data-id="${x.id}" data-lv="${lv}"><span class="an-q an-${x.color}">“${esc(x.text.length > 220 ? x.text.slice(0, 220) + "…" : x.text)}”</span><span class="an-lv">${esc(levelName(lv))}</span>${x.note ? `<span class="an-n">✎ ${esc(x.note)}</span>` : `<span class="an-n an-none">No note yet. Open it to add one.</span>`}<small>Passage ${i + 1}: ${esc(s.h)}</small></button>`).join("")}` : "";
    }).join("");
    sheet.innerHTML = `<div class="an-sheet" role="dialog" aria-modal="true" aria-label="My notebook"><div class="an-head"><b>🗒 ${onlyChapter ? "Notes in this chapter" : "My notebook"}</b><button type="button" class="an-x">Done</button></div>
      <div class="an-body">${rows || `<p class="an-empty">No highlights yet. Press and hold (or drag across) any text in a passage to highlight it or add a note.</p>`}</div></div>`;
    document.body.appendChild(sheet);
    const shut = () => sheet.remove();
    sheet.onclick = e => { if (e.target === sheet) shut() };
    sheet.querySelector(".an-x").onclick = shut;
    sheet.querySelectorAll(".an-item").forEach(b => b.onclick = () => { shut(); jump(b.dataset.ch, b.dataset.id, b.dataset.lv) });
    // delete a note or highlight right here in the list (with a moment to undo), or clear them all at once
    const find = id => { for (const k in db) { const x = db[k].find(y => String(y.id) === String(id)); if (x) return { k, x } } return null };
    sheet.querySelectorAll(".an-item").forEach(b => {
      const d = document.createElement("button"); d.type = "button"; d.className = "an-rm"; d.setAttribute("aria-label", "Delete this note"); d.title = "Delete"; d.textContent = "Delete";
      const row = document.createElement("div"); row.className = "an-line"; b.parentNode.insertBefore(row, b); row.appendChild(b); row.appendChild(d);
      d.onclick = () => {
        const f = find(b.dataset.id); if (!f) return; const at = db[f.k].indexOf(f.x); db[f.k].splice(at, 1); if (!db[f.k].length) delete db[f.k]; save(); rerender(); countBadge();
        row.innerHTML = `<span class="an-gone">Deleted. <button type="button" class="an-undo">Undo</button></span>`;
        row.querySelector(".an-undo").onclick = () => { (db[f.k] = db[f.k] || []).splice(Math.min(at, (db[f.k] || []).length), 0, f.x); save(); rerender(); countBadge(); shut(); notebook(onlyChapter) };
      };
    });
    if (sheet.querySelector(".an-item")) {
      const all = document.createElement("button"); all.type = "button"; all.className = "an-clear"; all.textContent = onlyChapter ? "Delete all notes in this chapter" : "Delete all notes";
      sheet.querySelector(".an-body").appendChild(all);
      all.onclick = () => { if (all.dataset.sure !== "1") { all.dataset.sure = "1"; all.textContent = "Tap again to delete them all"; return } for (const k of Object.keys(db)) if (!onlyChapter || k.split(":")[0] === onlyChapter) delete db[k]; save(); rerender(); countBadge(); shut(); notebook(onlyChapter) };
    }
  }
  // which telling of the passage a highlight came from, in words ("Plain terms · Standard"); the exam version is starred
  function levelName(lv) { const R = window.ReadLevels; if (!R) return lv ? "Another reading level" : "Exam level"; return R.label(lv) }
  function jump(ch, id, lv) {
    // show the passage at the level the highlight was made on, so the highlighted words are there to go to
    const R = window.ReadLevels; if (R) { try { R.show(lv || "") } catch (e) { } }
    const go = () => { const m = document.querySelector(`mark[data-an="${id}"]`); if (m) { m.scrollIntoView({ block: "center", behavior: "smooth" }); m.classList.add("an-flash"); setTimeout(() => document.querySelectorAll(`mark[data-an="${id}"]`).forEach(x => x.classList.remove("an-flash")), 1800) } };
    if (location.hash.slice(1) !== ch) { location.hash = ch; setTimeout(go, 600) } else setTimeout(go, R ? 220 : 0);
  }
  // Highlight mode: on touch screens press-and-hold selects text instead of looking words up
  function setMode(on) { document.body.classList.toggle("an-mode", on); const b = document.getElementById("anMode"); if (b) { b.classList.toggle("on", on); b.setAttribute("aria-pressed", on) } }

  window.ReadNotes = { repaint: rerender, apply, notebook, setMode, countIn, countAll, init: o => { ctx = Object.assign(ctx || {}, o) } };
})();
