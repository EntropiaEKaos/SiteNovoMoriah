// Run: node --test tests/occupancy-calendar-projection.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");

const filename = path.resolve(__dirname, "../lib/occupancy-calendar-projection.ts");
const source = fs.readFileSync(filename, "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal((js.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(js.outputText, filename);
const { projectOccupancyDays } = mod.exports;
const dates = ["2026-10-15", "2026-10-16", "2026-10-17"];

test("checkout is exclusive, and back-to-back reservations do not overlap", () => {
  const result = projectOccupancyDays({
    dates, capacity: 1, verified: true,
    intervals: [
      { start: dates[0], end: dates[1], units: 1, kind: "RESERVATION" },
      { start: dates[1], end: dates[2], units: 1, kind: "RESERVATION" },
    ],
  });
  assert.deepEqual(result.map((x) => x.state), ["RESERVED", "RESERVED", "AVAILABLE"]);
});

test("two bookings over capacity show conflict", () => {
  const result = projectOccupancyDays({
    dates: [dates[0]], capacity: 1, verified: true,
    intervals: [
      { start: dates[0], end: dates[2], units: 1, kind: "RESERVATION" },
      { start: dates[0], end: dates[2], units: 1, kind: "RESERVATION" },
    ],
  });
  assert.equal(result[0].state, "CONFLICT");
  assert.equal(result[0].used, 2);
});

test("shared room capacity three allows three occupied beds but not four", () => {
  const mk = (n) => projectOccupancyDays({
    dates: [dates[0]], capacity: 3, verified: true,
    intervals: Array.from({ length: n }, () => ({
      start: dates[0], end: dates[1], units: 1, kind: "CHECKED_IN",
    })),
  })[0].state;
  assert.equal(mk(3), "OCCUPIED");
  assert.equal(mk(4), "CONFLICT");
});

test("manual block overlapping a booking is a conflict", () => {
  const result = projectOccupancyDays({
    dates: [dates[0]], capacity: 2, verified: true,
    intervals: [
      { start: dates[0], end: dates[1], units: 1, kind: "BLOCK" },
      { start: dates[0], end: dates[1], units: 1, kind: "RESERVATION" },
    ],
  });
  assert.equal(result[0].state, "CONFLICT");
  assert.equal(result[0].used, 1);
});

test("unverified inventory is never presented as available", () => {
  assert.equal(projectOccupancyDays({
    dates: [dates[0]], capacity: 1, verified: false, intervals: [],
  })[0].state, "UNVERIFIED");
});

test("invalid dates, intervals and capacity fail closed", () => {
  assert.throws(() => projectOccupancyDays({ dates: ["2026-02-30"], capacity: 1, verified: true, intervals: [] }));
  assert.throws(() => projectOccupancyDays({ dates, capacity: 0, verified: true, intervals: [] }));
  assert.throws(() => projectOccupancyDays({
    dates, capacity: 1, verified: true,
    intervals: [{ start: dates[1], end: dates[0], units: 1, kind: "RESERVATION" }],
  }));
});

test("isolated block remains blocked and occupied night is occupied", () => {
  const result = projectOccupancyDays({
    dates: [dates[0], dates[1]], capacity: 2, verified: true,
    intervals: [
      { start: dates[0], end: dates[1], units: 1, kind: "BLOCK" },
      { start: dates[1], end: dates[2], units: 1, kind: "CHECKED_IN" },
    ],
  });
  assert.deepEqual(result.map((x) => x.state), ["BLOCKED", "OCCUPIED"]);
});

test("unrecognized inventory kind is rejected", () => {
  assert.throws(() => projectOccupancyDays({
    dates: [dates[0]], capacity: 1, verified: true,
    intervals: [{ start: dates[0], end: dates[1], units: 1, kind: "UNKNOWN" }],
  }));
});

test("year transition and leap day use local calendar days", () => {
  const result = projectOccupancyDays({
    dates: ["2028-02-28", "2028-02-29", "2028-03-01"], capacity: 1, verified: true,
    intervals: [{ start: "2028-02-29", end: "2028-03-01", units: 1, kind: "RESERVATION" }],
  });
  assert.deepEqual(result.map((x) => x.state), ["AVAILABLE", "RESERVED", "AVAILABLE"]);
});

test("hard block closes entire shared room even with empty beds", () => {
  const result = projectOccupancyDays({
    dates: [dates[0]], capacity: 5, verified: true, intervals: [],
    hardBlockDates: [dates[0]],
  });
  assert.equal(result[0].state, "BLOCKED");
});
test("hard block and overlapping confirmed reservation show conflict", () => {
  const result = projectOccupancyDays({
    dates: [dates[0]], capacity: 5, verified: true,
    intervals: [{ start: dates[0], end: dates[1], units: 1, kind: "RESERVATION" }],
    hardBlockDates: [dates[0]],
  });
  assert.equal(result[0].state, "CONFLICT");
});
test("hard block dates must be valid calendar days", () => {
  assert.throws(() => projectOccupancyDays({
    dates: [dates[0]], capacity: 1, verified: true, intervals: [],
    hardBlockDates: ["2026-02-30"],
  }));
});

test("active inventory hold consumes a shared bed", () => {
  const result = projectOccupancyDays({
    dates: [dates[0]], capacity: 2, verified: true,
    intervals: [
      { start: dates[0], end: dates[1], units: 1, kind: "HOLD" },
      { start: dates[0], end: dates[1], units: 1, kind: "RESERVATION" },
    ],
  });
  assert.equal(result[0].used, 2);
  assert.equal(result[0].state, "RESERVED");
});
test("holds count toward overbooking conflict", () => {
  const result = projectOccupancyDays({
    dates: [dates[0]], capacity: 1, verified: true,
    intervals: [
      { start: dates[0], end: dates[1], units: 1, kind: "HOLD" },
      { start: dates[0], end: dates[1], units: 1, kind: "RESERVATION" },
    ],
  });
  assert.equal(result[0].state, "CONFLICT");
});

test("hard block is not counted as occupied bed capacity", () => {
  const result = projectOccupancyDays({
    dates: [dates[0]], capacity: 4, verified: true,
    intervals: [{ start: dates[0], end: dates[1], units: 1, kind: "BLOCK" }],
  });
  assert.equal(result[0].state, "BLOCKED");
  assert.equal(result[0].used, 0);
});


test("duplicate and out-of-order dates fail closed", () => {
  for (const invalidDates of [[dates[0], dates[0]], [dates[1], dates[0]]]) {
    assert.throws(() => projectOccupancyDays({
      dates: invalidDates, capacity: 1, verified: false, intervals: [],
    }));
  }
});

test("unsafe sum of individually safe occupancy units fails closed", () => {
  assert.throws(() => projectOccupancyDays({
    dates: [dates[0]], capacity: 1, verified: false,
    intervals: [
      { start: dates[0], end: dates[1], units: Number.MAX_SAFE_INTEGER, kind: "RESERVATION" },
      { start: dates[0], end: dates[1], units: 1, kind: "HOLD" },
    ],
  }), /overflow/);
});


test("shared-room hard block conflicts with a hold even when beds remain", () => {
  const result = projectOccupancyDays({
    dates: [dates[0]], capacity: 5, verified: true,
    intervals: [{ start: dates[0], end: dates[1], units: 1, kind: "HOLD" }],
    hardBlockDates: [dates[0]],
  });
  assert.equal(result[0].state, "CONFLICT");
  assert.equal(result[0].used, 1);
});

test("a hard block alone never consumes beds", () => {
  const result = projectOccupancyDays({
    dates: [dates[0]], capacity: 5, verified: false, intervals: [],
    hardBlockDates: [dates[0]],
  });
  assert.equal(result[0].state, "UNVERIFIED");
  assert.equal(result[0].used, 0);
});
