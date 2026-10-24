const assert = require("node:assert/strict");
const test = require("node:test");
const { getAdminCredentials } = require("../prisma/seedConfig");

test("seed config requires an admin email and a strong explicit password", () => {
  assert.throws(
    () => getAdminCredentials({}),
    /Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters/,
  );
  assert.throws(
    () => getAdminCredentials({ ADMIN_EMAIL: "admin@example.com", ADMIN_PASSWORD: "short" }),
    /Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters/,
  );
});

test("seed config normalizes the admin email and keeps the supplied password", () => {
  assert.deepEqual(
    getAdminCredentials({ ADMIN_EMAIL: " Admin@Example.com ", ADMIN_PASSWORD: "uniquely-secure-pass" }),
    { adminEmail: "admin@example.com", adminPassword: "uniquely-secure-pass" },
  );
});
