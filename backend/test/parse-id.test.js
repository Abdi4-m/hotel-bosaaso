const assert = require("node:assert/strict");
const test = require("node:test");
const { parseId } = require("../src/utils/parseId");

test("parseId accepts positive integer IDs from JSON and URL parameters", () => {
  assert.equal(parseId(42), 42);
  assert.equal(parseId("42"), 42);
});

test("parseId rejects values that cannot be Prisma Int IDs", () => {
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "", "0", "-1", "1.5", "abc", null, undefined]) {
    assert.equal(parseId(value), null);
  }
});
