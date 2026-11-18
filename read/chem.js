// CHEM 225 · the class's part of Eureka's reader (read/index.html is a copy of ECON 101's reader page).
// The reader shows text. This class's text has {{formulas}} and [[figures]] in it (docs/dev/CONTENT-SPEC.md). They stay as
// written in read/chapters.js and read/bank.js, in the answers the reader saves and in the reading-level files, and this
// file draws them once the reader has put the text in the page.
//   ReadChem.draw(root)    draws every formula and figure in the text under root. Safe to call again: what is drawn stays.
//                          Under a passage shown at another reading level it also puts the links the passage has under it.
//   ReadChem.text(range)   the words in a range, without the letters inside drawings and on controls   } for read/notes.js,
//   ReadChem.quote(range)  the same words as the notebook shows them                                   } which files notes
//   ReadChem.skip(node)    is this text node inside a drawing, on a control, or only space between blocks? } by place
// It also turns a save of the class's own reader into the shape Eureka's reader keeps, before the reader reads it, and
// opens the pictures of the professor's pages in the reader's own viewer.
// Loaded after chapters.js, notes.js, the class engine (assets/core.js, mol.js and the others) and figures.js, and before the
// page's own script. docs/dev/ARCHITECTURE.md, "The readings inside Eureka", has the whole map.
(() => {
  const O = window.ORGO, READ = window.READ || [];

  // ------------------------------------------------------------------ a save of the class's own reader
  // read/page.js (the reader outside Eureka) keeps orgo-read-v1 as {chapter: {sectionId: time, done, finished, _day}}.
  // Eureka's reader keeps {chapter: {at, a, w, done, finished, gem}} under the same name, and stops on the other shape.
  // A chapter in the old shape is turned over once: the place is the number of sections read, the count of finished
  // readings is kept (the badge depends on it), and there are no answers yet. A chapter already in the new shape is left alone.
  (function older() {
    const KEY = "orgo-read-v1"; let raw = null, st = null, changed = false;
    try { raw = localStorage.getItem(KEY); st = JSON.parse(raw || "null") } catch (e) { }
    if (raw == null) return;
    if (!st || typeof st !== "object" || Array.isArray(st)) { st = {}; changed = true }
    for (const id of Object.keys(st)) {
      const o = st[id], c = READ.find(x => x.id === id), last = c ? c.sections.length - 1 : 0;
      if (!o || typeof o !== "object" || Array.isArray(o)) { delete st[id]; changed = true; continue }
      if (o.a && typeof o.a === "object" && !Array.isArray(o.a)) {      // the reader's own shape: only a place that cannot be is put right
        const at = Math.max(0, Math.min(last, Math.floor(+o.at) || 0)); if (o.at !== at) { o.at = at; changed = true }
        continue;
      }
      const read = Object.keys(o).filter(k => !/^(done|finished|_day|at|a|w|wOld|gem|gemLast|gemUp)$/.test(k) && typeof o[k] === "number" && o[k] > 0).length;
      const n = { at: Math.min(read, last), a: {} }; if (o.done > 0) n.done = Math.floor(o.done); if (o.finished) n.finished = true;
      st[id] = n; changed = true;
    }
    if (changed) try { localStorage.setItem(KEY, JSON.stringify(st)) } catch (e) { }
  })();

  // ------------------------------------------------------------------ drawing
  const TOKEN = /\[\[([a-z0-9]+):(.*?)\]\](?!\])/g, FORMULA = /\{\{(.*?)\}\}/g, HAS = /\[\[[a-z0-9]+:|\{\{/;      // as in assets/core.js
  const DRAWN = "svg, script, style, textarea, .fig, .fig-inline, .chem";      // never look for tokens in here
  const missing = (kind, arg) => { const s = document.createElement("span"); s.className = "fig-missing"; s.textContent = kind === "mol" ? arg.split("|")[0] : "[" + kind + "]"; return s };
  // Eureka's dictionary is told two things: a drawing is not text (data-nolookup), and a formula is one word (data-lk)
  const mark = el => { el.querySelectorAll("svg:not([data-nolookup])").forEach(s => s.setAttribute("data-nolookup", "")); el.querySelectorAll(".chem:not([data-lk])").forEach(c => { if (!c.closest("svg")) c.setAttribute("data-lk", "") }) };
  function formula(f) { const s = document.createElement("span"); s.className = "chem"; s.setAttribute("data-lk", ""); s.innerHTML = O.formula(f); return s }
  function figure(kind, arg, alone) {
    let node; try { node = O.tokens[kind] ? O.tokens[kind](arg, !alone) : missing(kind, arg) } catch (e) { node = missing(kind, arg) }
    const w = document.createElement("span"); w.className = (alone ? "fig" : "fig-inline") + " fig-" + kind; w.appendChild(node); mark(w);
    if (w.querySelector(".fig-missing")) console.error("CHEM 225 reader: a figure could not be drawn: [[" + kind + ":" + arg + "]]");
    return w;
  }
  // Is a figure alone on its line (drawn as a figure of its own), or inside a sentence (drawn small, in line)? This is the
  // rule of ORGO.html in assets/core.js, read from the page instead of from the source. A line starts at the start of the
  // text, of a paragraph, a list item or a table cell, after a line break, and after a new line in the source. It ends
  // in the same ways, or where the next figure starts. A figure that follows another one also counts, at the end of a paragraph.
  const whole = p => /^(DIV|BUTTON)$/.test(p.nodeName) || (p.nodeName === "SPAN" && p.matches(".opt > span, .pl-flip > span, .pl-card, .rc-s"));      // one whole text is put in each of these (rc-s: by tools/build.js)
  const line = p => /^(P|LI|TD)$/.test(p.nodeName) || whole(p);
  function alone(node, pre, post) {
    const p = node.parentNode, before = node.previousSibling, after = node.nextSibling, blank = s => /^\s*$/.test(s);
    const starts = /\n\s*$/.test(pre) || (blank(pre) && (before ? before.nodeName === "BR" : line(p)));
    const ends = /^\s*(\n|\[\[)/.test(post) || (blank(post) && (after ? after.nodeName === "BR" : line(p)));
    return (starts && ends) || (/\]\]\s*$/.test(pre) && (/^\s*\n/.test(post) || (blank(post) && !after && (p.nodeName === "P" || whole(p)))));
  }
  function expand(node) {
    const t = node.nodeValue, out = document.createDocumentFragment();
    const words = s => { let a = 0; for (const f of s.matchAll(FORMULA)) { if (f.index > a) out.appendChild(document.createTextNode(s.slice(a, f.index))); out.appendChild(formula(f[1])); a = f.index + f[0].length } if (a < s.length) out.appendChild(document.createTextNode(s.slice(a))) };
    let at = 0;
    for (const m of t.matchAll(TOKEN)) { const end = m.index + m[0].length; if (m.index > at) words(t.slice(at, m.index)); out.appendChild(figure(m[1], m[2], alone(node, t.slice(0, m.index), t.slice(end)))); at = end }
    if (at < t.length) words(t.slice(at));
    node.replaceWith(out);
  }
  function draw(root) {
    if (!root || !O || !O.formula || !O.tokens) return 0;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => HAS.test(n.nodeValue) && !n.parentNode.closest(DRAWN) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(expand);
    if (root.querySelectorAll) root.querySelectorAll(".fig, .fig-inline").forEach(mark);      // a figure that filled itself later (a mechanism still loading)
    under(root);
    return nodes.length;
  }
  // A passage at another reading level is a level text that shared/readlevels.js puts beside the passage, which it hides.
  // A level text is words only (Eureka's tools/check-levels.js refuses links). So what hangs under the passage as written
  // is copied under its level text: the links to the professor's pages, and to a mechanism or a chair to draw in the
  // class's own tools. The copies go at the end, so the places of the words above them, by which notes are filed, stay.
  const UNDER = ":scope > .rc-src, :scope > .rc-go";
  function under(root) {
    const copies = root.matches && root.matches(".rd-prose[data-alt]") ? [root] : root.querySelectorAll ? root.querySelectorAll(".rd-prose[data-alt]") : [];
    copies.forEach(alt => {
      const orig = alt.parentNode && alt.parentNode.querySelector(".rd-prose:not([data-alt])");
      if (!orig || alt.querySelector(UNDER)) return;
      orig.querySelectorAll(UNDER).forEach(p => { const c = p.cloneNode(true); c.querySelectorAll("mark").forEach(m => m.replaceWith(...m.childNodes)); c.normalize(); alt.appendChild(c) });      // without the highlights made on the passage as written
    });
  }

  // ------------------------------------------------------------------ for the notes (read/notes.js)
  // Highlights are filed by where their words are in the passage. The letters inside a drawing, the line that opens a
  // folded block and the words of a link are not counted and never marked. Neither is the white space between two blocks
  // (two paragraphs, a paragraph and a figure): a mark there would show as a coloured sliver on a line of its own.
  const BLOCK = /^(P|DIV|UL|OL|LI|TABLE|THEAD|TBODY|TR|TD|TH|DETAILS|BLOCKQUOTE)$/;
  const block = e => !e || (e.nodeType === 1 && (BLOCK.test(e.nodeName) || e.classList.contains("fig")));
  const skip = n => { const p = n && n.parentNode; if (!p || !p.closest) return false; return !!p.closest("svg, summary, a") || (!/\S/.test(n.data) && BLOCK.test(p.nodeName) && block(n.previousSibling) && block(n.nextSibling)) };
  function read(range, gaps) {
    const top = range.commonAncestorContainer, root = top.nodeType === 3 ? top.parentNode : top, w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let out = "", n;
    while ((n = w.nextNode())) {
      if (!range.intersectsNode(n)) continue;
      if (skip(n)) { if (gaps && !/\S/.test(n.data)) out += " "; continue }
      out += n.data.slice(n === range.startContainer ? range.startOffset : 0, n === range.endContainer ? range.endOffset : n.length);
    }
    return out;
  }
  const text = range => read(range, false);                                // what is counted
  const quote = range => read(range, true).replace(/\s+/g, " ");          // what the notebook shows: the same words, with a space where one block ends and the next begins

  // ------------------------------------------------------------------ keeping up with the page
  // The page calls draw() when it has drawn a chapter and when it has redrawn a passage's questions. Other scripts put text
  // in the page as well: shared/readlevels.js swaps a passage for another level and then asks the notes to repaint, and
  // read/play.js redraws an activity when it is finished or played again. So the notes always draw first, and whatever
  // else arrives in the reader's view is drawn as it arrives (before the browser paints, so no token is ever seen).
  const view = document.getElementById("view"), N = window.ReadNotes;
  let repaint = null;
  if (N) for (const k of ["apply", "repaint"]) { const was = N[k]; if (typeof was !== "function") continue; N[k] = function () { draw(view); return was.apply(this, arguments) }; if (k === "repaint") repaint = was }
  if (view && window.MutationObserver) new MutationObserver(list => {
    const seen = new Set(); let prose = false;
    for (const m of list) for (const n of m.addedNodes) { const el = n.nodeType === 1 ? n : n.parentNode; if (el && el.nodeType === 1 && el.isConnected && !el.closest(DRAWN)) seen.add(el) }
    seen.forEach(el => { if (draw(el) && (el.closest(".rd-prose") || el.querySelector(".rd-prose"))) prose = true });
    under(view);      // a level text that arrived without the notes being asked to repaint
    if (prose && repaint) repaint();      // text was drawn in a passage after its notes were painted: paint them again, in the right places
  }).observe(view, { childList: true, subtree: true });

  // ------------------------------------------------------------------ the professor's pages
  // "Original notes: 10/20 page 1" under a passage opens the picture in the reader's own viewer (the one its figures use)
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a.rc-page"), box = document.getElementById("lightbox"), img = document.getElementById("lbImg");
    if (!a || !box || !img || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); img.src = a.href; img.alt = "The professor's handwritten notes, " + a.textContent; box.hidden = false;
  });

  window.ReadChem = { draw, text, quote, skip };
})();
