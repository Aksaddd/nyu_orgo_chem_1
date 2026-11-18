#!/usr/bin/env node
// Runs every *.test.js in this folder. Each test file exits non-zero on failure.
const fs = require("fs"), path = require("path"), cp = require("child_process");
let bad = 0;
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith(".test.js")).sort()) {
  const r = cp.spawnSync("node", [path.join(__dirname, f)], { encoding: "utf8" });
  console.log((r.status === 0 ? "ok    " : "FAIL  ") + f + (r.status === 0 ? "" : "\n" + (r.stdout + r.stderr).split("\n").map(l => "      " + l).join("\n")));
  bad += r.status === 0 ? 0 : 1;
}
process.exit(bad ? 1 : 0);
