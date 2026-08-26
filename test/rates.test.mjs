import assert from "node:assert/strict";
import test from "node:test";
import rates from "@src/data/rates.json" with { type: "json" };

test("keeps ten sorted rate entries for every rate type", () => {
  assert.equal(rates.version, 1);
  assert.match(rates.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(rates.fetchedAt, null);

  for (const type of ["variable", "fixed", "full"]) {
    const entries = rates[type];
    assert.equal(entries.length, 10, `${type} should contain ten entries`);
    assert.ok(
      entries.every((entry) => typeof entry.bank === "string" && entry.bank.length > 0),
      `${type} entries need a bank name`,
    );
    assert.ok(
      entries.every((entry) => typeof entry.rate === "number"),
      `${type} entries need a numeric rate`,
    );
    assert.ok(
      entries.every(
        (entry) =>
          typeof entry.productZh === "string" &&
          entry.productZh.length > 0 &&
          typeof entry.termZh === "string" &&
          entry.termZh.length > 0 &&
          typeof entry.noteZh === "string",
      ),
      `${type} entries need Chinese product, term, and note fields`,
    );
    assert.deepEqual(
      entries.map((entry) => entry.rate),
      [...entries].sort((a, b) => a.rate - b.rate).map((entry) => entry.rate),
      `${type} entries should be ordered from low to high`,
    );
    assert.ok(
      entries.every(
        (entry) =>
          !entry.productZh.toLowerCase().includes("risona") &&
          !entry.noteZh.toLowerCase().includes("risona"),
      ),
      `${type} Chinese copy should use りそな instead of latin risona`,
    );
  }
});
