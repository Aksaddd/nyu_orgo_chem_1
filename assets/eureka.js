// CHEM 225 · the bridge to Eureka. core.js loads this only when the class sits inside Eureka (window.Platform exists).
// It brings in Eureka's shared look, settings and companions, and tells them about right and wrong answers.
(() => {
  const B = window.Platform && window.Platform.BASE; if (!B || !window.ORGO) return;
  const add = (tag, attrs) => new Promise(done => { const e = document.createElement(tag); Object.assign(e, attrs); e.onload = e.onerror = done; document.head.appendChild(e) });
  // the same order Eureka's own class pages use: settings (appearance, account, preferences), then XP and companions, then the shared look last
  (async () => {
    await add("script", { src: B + "shared/settings.js" });
    await add("script", { src: B + "shared/xp.js" }); await add("script", { src: B + "shared/wardrobe.js" }); await add("script", { src: B + "shared/buddy.js" });
    add("script", { src: B + "shared/lookup.js" });
    add("link", { rel: "stylesheet", href: B + "shared/maison.css" });
  })();
  // Eureka's companions and XP listen for these two events (see Eureka's shared/drill.js)
  const tell = (name, id) => { const x = ORGO.data.index[id] || [], st = ORGO.learn.state(id) || {}; window.dispatchEvent(new CustomEvent(name, { detail: { kind: "drill", id, q: { d: x[0] || "orgo", q: "", ok: "", wrong: [], tag: x[0] || "" }, prev: [Math.max(0, (st.n || 1) - 1), Math.max(0, (st.ok || 0) - (name === "bio:correct" ? 1 : 0))] } })) };
  ORGO.eureka.right = id => tell("bio:correct", id);
  ORGO.eureka.wrong = id => tell("bio:wrong", id);
})();
