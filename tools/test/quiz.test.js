// Scoring rules of assets/quiz.js (ORGO.quiz._score). Pure functions: no DOM needed.
const assert = require("assert"), path = require("path");
global.window = global; global.ORGO = {};
require(path.join(__dirname, "../../assets/quiz.js"));
const S = global.ORGO.quiz._score, near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

// numbers: plain, typographic minus, decimal comma, thousands, junk
assert.strictEqual(S.num("10"), 10);
assert.strictEqual(S.num(" -3.5 "), -3.5);
assert.strictEqual(S.num("−3.5"), -3.5);
assert.strictEqual(S.num("–38"), -38);
assert.strictEqual(S.num("9,95"), 9.95);
assert.strictEqual(S.num("80,000"), 80000);
assert.strictEqual(S.num("1,000,000"), 1000000);
assert.strictEqual(S.num(".5"), 0.5);
assert.strictEqual(S.num("1e3"), 1000);
assert.strictEqual(S.num(""), null);
assert.strictEqual(S.num("about 10"), null);
assert.strictEqual(S.num("--3"), null);

// numeric: inclusive range
assert.strictEqual(S.numeric(9, 9, 11), 1);
assert.strictEqual(S.numeric(11, 9, 11), 1);
assert.strictEqual(S.numeric(11.01, 9, 11), 0);
assert.strictEqual(S.numeric(null, 9, 11), 0);
assert.strictEqual(S.numeric(-38, -40, -36), 1);

// multi: 1 only when every decision is right, otherwise half of the fraction of right decisions
const ok = [true, false, true, true];
assert.strictEqual(S.multi([true, false, true, true], ok), 1);
near(S.multi([true, false, true, false], ok), 0.5 * 3 / 4);
near(S.multi([false, false, false, false], ok), 0.5 * 1 / 4);
assert.strictEqual(S.multi([false, true, false, false], ok), 0);
near(S.multi([true, true, true, true], ok), 0.375);
assert.ok(S.multi([true, false, true, false], ok) < 0.8, "a near miss on a multi must still count as a miss");

// rank: fraction of pairs in the right relative order
assert.strictEqual(S.rank([0, 1, 2, 3]), 1);
assert.strictEqual(S.rank([3, 2, 1, 0]), 0);
near(S.rank([1, 0, 2, 3]), 5 / 6);
near(S.rank([0, 1, 3, 2]), 5 / 6);
near(S.rank([3, 0, 1, 2]), 3 / 6);
near(S.rank([1, 0]), 0);
assert.strictEqual(S.rank([0]), 1);

// classify: fraction right
near(S.classify(["SN2", "SN1", "E1", "E1"], ["SN2", "SN1", "E2", "E1"]), 0.75);
assert.strictEqual(S.classify([null, null], ["SN2", "SN1"]), 0);

// rubric: points earned over points possible
near(S.rubric([1, 0.5, 0, 1], [10, 15, 15, 10]), 27.5 / 50);
assert.strictEqual(S.rubric([1, 1], [20, 30]), 1);
assert.strictEqual(S.rubric([null, null], [20, 30]), 0);
assert.strictEqual(S.rubric([], []), 0);

console.log("quiz scoring: all checks passed");
