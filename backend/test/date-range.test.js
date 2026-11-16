const assert = require("node:assert/strict");
const test = require("node:test");
const { getMaxCheckOutDate, parseDateRange } = require("../src/utils/dateRange");

test("the maximum checkout date is six calendar months after check-in", () => {
  const checkIn = new Date("2026-11-16T00:00:00.000Z");
  assert.equal(getMaxCheckOutDate(checkIn).toISOString(), "2027-05-16T00:00:00.000Z");
});

test("the maximum checkout date clamps to the last day of a shorter month", () => {
  const checkIn = new Date("2026-08-31T00:00:00.000Z");
  assert.equal(getMaxCheckOutDate(checkIn).toISOString(), "2027-02-28T00:00:00.000Z");
});

test("booking ranges accept six months and reject longer stays", () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const checkIn = new Date(today);
  checkIn.setUTCDate(checkIn.getUTCDate() + 1);
  const maxCheckOut = getMaxCheckOutDate(checkIn);
  const beyondMax = new Date(maxCheckOut);
  beyondMax.setUTCDate(beyondMax.getUTCDate() + 1);

  assert.equal(parseDateRange(checkIn.toISOString().slice(0, 10), maxCheckOut.toISOString().slice(0, 10)).error, undefined);
  assert.equal(parseDateRange(checkIn.toISOString().slice(0, 10), beyondMax.toISOString().slice(0, 10)).error, "Check-out cannot be more than 6 months after check-in");
});
