// The Word Roots list and what it does in Eureka's dictionary (tools/check-roots.js, which says what is wrong and why).
const r = require("child_process").spawnSync("node", [require("path").join(__dirname, "..", "check-roots.js"), "--quiet"], { encoding: "utf8" });
process.stdout.write(r.stdout || ""); process.stderr.write(r.stderr || ""); process.exit(r.status === null ? 1 : r.status);
