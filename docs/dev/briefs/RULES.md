# Rules for every build agent

You are one of several agents building an Organic Chemistry I study guide (a static site) in
/home/user/nyu_orgo_chem_1. Pre-med students will study for an exam from it within days. Correct beats polished.

1. **Own files only.** Create or overwrite only the files listed under OWN in your brief. Other agents are editing other
   files right now. If something outside your files is wrong, say so in your notes; do not fix it.
2. **Tight token budget.** Read only what your brief lists under READ (use offset/limit or grep for the parts named).
   Do not explore the repository or Eureka beyond that. Write each file whole, in one Write call. Run your checks as
   ONE combined Bash command. Fix and re-run at most a few times. Aim for under 25 tool calls in total.
3. **Stack.** Plain HTML/CSS/JS: classic scripts and globals, no modules, no libraries, no network. Everything must
   work from file:// and offline. Node 22 and Python 3 with RDKit are installed. Playwright is installed for node
   (`require('playwright')`, `chromium.launch()`); open pages by file:// URL; never run "playwright install". Take
   screenshots only if your brief asks, at deviceScaleFactor 1.
4. **Contracts.** docs/dev/ARCHITECTURE.md fixes every global name, signature, storage key and CSS class. Follow it
   exactly: other agents are coding against it now. Feature-detect other modules (`ORGO.chair && ORGO.chair.ask`) and
   show a short plain message when one is missing. If you must deviate, keep the documented name working and say so.
5. Do not run git. Leave no server or background process running.
6. **Words students read:** plain, direct sentences, the way a good tutor talks. No dash characters as punctuation
   (— or –): use commas, colons, or "to". No exclamation marks. Never show right or wrong by colour alone.
7. Reply with the structured summary only.
