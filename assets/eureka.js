// CHEM 225 · the bridge to Eureka. core.js loads this only when the class sits inside Eureka (window.Platform exists).
// It brings in Eureka's shared look, settings and companions, and tells them about right and wrong answers.
(() => {
  const B = window.Platform && window.Platform.BASE; if (!B || !window.ORGO) return;
  const add = (tag, attrs) => new Promise(done => { const e = document.createElement(tag); Object.assign(e, attrs); e.onload = e.onerror = done; document.head.appendChild(e) });
  // Eureka's stylesheet (shared/maison.css) is linked in the head of every page (tools/shells.js). It used to be added here, after these
  // scripts had loaded one by one, and until then Eureka's class bar, which is on the page from the start, was drawn without any styles:
  // seconds on a phone. The scripts keep the order Eureka's own class pages use: settings, then XP and companions, then the dictionary.
  (async () => {
    await add("script", { src: B + "shared/settings.js" });
    await add("script", { src: B + "shared/xp.js" }); await add("script", { src: B + "shared/wardrobe.js" }); await add("script", { src: B + "shared/buddy.js" });
    await add("script", { src: ((window.COURSE && window.COURSE.base) || "") + "assets/glossary.js" });   // the class dictionary: LEXICON, TERMS and GLOSS
    add("script", { src: B + "shared/lookup.js" });
    if (!document.querySelector('link[rel="stylesheet"][href*="shared/maison.css"]')) add("link", { rel: "stylesheet", href: B + "shared/maison.css" });   // only for a page built before the link was in the head
  })();
  // Eureka's companions and XP listen for these two events (see Eureka's shared/drill.js). q.d names the question's level,
  // "orgo1" to "orgo3" (from the index; 1 when it has none, as a mechanism of the studio): shared/xp.js reads only q.d,
  // and COURSE.deckBonus (course.js) turns it into the points that set the XP tier
  const tell = (name, id) => { const x = ORGO.data.index[id] || [], st = ORGO.learn.state(id) || {}, lv = [1, 2, 3].includes(+x[3]) ? +x[3] : 1; window.dispatchEvent(new CustomEvent(name, { detail: { kind: "drill", id, q: { d: "orgo" + lv, q: "", ok: "", wrong: [], tag: x[0] || "" }, prev: [Math.max(0, (st.n || 1) - 1), Math.max(0, (st.ok || 0) - (name === "bio:correct" ? 1 : 0))] } })) };
  ORGO.eureka.right = id => tell("bio:correct", id);
  ORGO.eureka.wrong = id => tell("bio:wrong", id);
  // a reading chapter was finished (for the nth time): Eureka's companions hand out its badge, or polish it, on this event
  ORGO.eureka.chapter = (id, times) => { const W = window.BioWardrobe, up = !!(W && times > 1 && W.tier(times).lv > W.tier(times - 1).lv); if (times === 1 || up) setTimeout(() => window.dispatchEvent(new CustomEvent("bio:badge", { detail: { chapter: id, up } })), 700) };
})();
