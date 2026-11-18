// CHEM 225 · the archive: the original course files, each with a PDF link and page pictures.
(() => {
  const { el } = ORGO;
  const app = document.getElementById("app");
  const here = ORGO.base + "archive/";
  const pad = (key, n) => key === "EX" ? String(n).padStart(2, "0") : String(n);
  const pic = (f, n) => here + "pages/" + f.key + "-" + pad(f.key, n) + ".png";

  function pagesOf(f) {
    // the exam's pictures exist only for pages 2 to 17
    const first = f.key === "EX" ? 2 : 1, last = f.key === "EX" ? Math.min(17, f.pages) : f.pages, out = [];
    for (let n = first; n <= last; n++) out.push(n);
    return out;
  }
  function look(f) {
    const list = pagesOf(f); let i = 0;
    const img = el("img", { alt: "", style: { width: "100%", height: "auto", background: "#fff", borderRadius: "8px" } });
    const label = el("span", { "aria-live": "polite" });
    const show = k => { i = (k + list.length) % list.length; img.src = pic(f, list[i]); img.alt = f.title + ", page " + list[i]; label.textContent = "Page " + list[i] + " of " + f.pages };
    const prev = el("button", { class: "btn small", on: { click: () => show(i - 1) } }, "Previous page");
    const next = el("button", { class: "btn small", on: { click: () => show(i + 1) } }, "Next page");
    show(0);
    ORGO.ui.sheet({ title: f.title, wide: true, body: el("div", { class: "stack" }, el("div", { class: "row" }, prev, label, next), img) });
  }
  function fileRow(f) {
    return el("div", { class: "card archive-file" },
      el("div", {}, el("h3", {}, f.title), el("p", { class: "muted small" }, f.pages + (f.pages === 1 ? " page" : " pages"))),
      el("div", { class: "btn-row" },
        el("a", { class: "btn small primary", href: here + f.file.split("/").map(encodeURIComponent).join("/") }, "Open the PDF"),
        el("button", { class: "btn small", on: { click: () => look(f) } }, "Look at the pages"),
        f.read ? el("a", { class: "btn small", href: ORGO.base + "read/index.html#" + f.read }, "Open the reading") : null));
  }
  function render() {
    const groups = (window.ARCHIVE && window.ARCHIVE.groups) || [];
    app.append(el("div", { class: "stack" },
      el("p", { class: "eyebrow" }, "Archive"),
      el("h1", { class: "page-title" }, "The original course files"),
      el("p", { class: "lead" }, "Everything here is exactly as it was handed out. The readings and questions elsewhere in this guide were rebuilt from these files."),
      groups.length ? groups.map(g => el("section", { class: "stack" }, el("h2", {}, g.name), g.note ? el("p", { class: "muted" }, g.note) : null, g.files.map(fileRow)))
        : el("div", { class: "empty" }, el("p", {}, "The list of files could not be loaded."))));
  }
  const s = document.createElement("script");
  s.src = here + "files.js"; s.onload = () => ORGO.ready(render); s.onerror = () => ORGO.ready(render);
  document.head.appendChild(s);
})();
