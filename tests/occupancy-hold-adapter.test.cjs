const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");

const filename = path.resolve(__dirname, "../lib/occupancy-hold-adapter.ts");
const js = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal((js.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(js.outputText, filename);
const { toVerifiedHoldIntervals } = mod.exports;
const asOf = new Date("2026-10-15T12:00:00Z");
const hold = {
  checkIn: new Date("2026-10-15T00:00:00Z"),
  checkOut: new Date("2026-10-17T00:00:00Z"),
  expiresAt: new Date("2026-10-15T12:05:00Z"),
  units: 2,
};

test("active hold consumes its exact number of beds", () => {
  const result = toVerifiedHoldIntervals([hold], asOf);
  assert.equal(result.verified, true);
  assert.deepEqual(result.intervals, [{
    start: "2026-10-15", end: "2026-10-17", units: 2, kind: "HOLD",
  }]);
});
test("expired hold does not consume inventory", () => {
  const result = toVerifiedHoldIntervals([{ ...hold, expiresAt: asOf }], asOf);
  assert.equal(result.verified, true);
  assert.equal(result.intervals.length, 0);
});
test("invalid hold does not silently become available", () => {
  const result = toVerifiedHoldIntervals([{ ...hold, checkOut: new Date("invalid") }], asOf);
  assert.equal(result.verified, false);
  assert.equal(result.intervals.length, 0);
});
test("invalid reference clock fails closed", () => {
  const result = toVerifiedHoldIntervals([hold], new Date("invalid"));
  assert.equal(result.verified, false);
});
test("reversed dates fail closed", () => {
  const result = toVerifiedHoldIntervals([{ ...hold, checkOut: hold.checkIn }], asOf);
  assert.equal(result.verified, false);
});
