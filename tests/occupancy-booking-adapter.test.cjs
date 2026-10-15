const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
const filename = path.resolve(__dirname, "../lib/occupancy-booking-adapter.ts");
const js = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(js.outputText, filename);
const { toVerifiedBookingIntervals } = mod.exports;
const booking = { checkIn: new Date("2026-10-15T00:00:00Z"), checkOut: new Date("2026-10-17T00:00:00Z"), status: "CONFIRMED", guests: 2 };
const policy = { CONFIRMED: "RESERVATION", CANCELLED: "IGNORE" };

test("private booking consumes one unit; shared room consumes guest count", () => {
  assert.equal(toVerifiedBookingIntervals([booking], policy, false).intervals[0].units, 1);
  assert.equal(toVerifiedBookingIntervals([booking], policy, true).intervals[0].units, 2);
});
test("unknown status fails closed instead of pretending availability", () => {
  const result = toVerifiedBookingIntervals([{ ...booking, status: "PENDING" }], policy, false);
  assert.equal(result.verified, false);
  assert.equal(result.intervals.length, 0);
});
test("explicitly cancelled reservation consumes no inventory", () => {
  const result = toVerifiedBookingIntervals([{ ...booking, status: "CANCELLED" }], policy, false);
  assert.equal(result.verified, true);
  assert.equal(result.intervals.length, 0);
});
test("missing dates and invalid guest count fail closed", () => {
  assert.equal(toVerifiedBookingIntervals([{ ...booking, checkOut: null }], policy, true).verified, false);
  assert.equal(toVerifiedBookingIntervals([{ ...booking, guests: 0 }], policy, true).verified, false);
});

test("prototype properties and invalid policy values cannot verify inventory", () => {
  assert.equal(toVerifiedBookingIntervals([{ ...booking, status: "toString" }], {}, false).verified, false);
  assert.equal(toVerifiedBookingIntervals([booking], { CONFIRMED: "AVAILABLE" }, false).verified, false);
});
