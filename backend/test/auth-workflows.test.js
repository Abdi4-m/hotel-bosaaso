const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const test = require("node:test");
const prisma = require("../src/lib/prisma");
const { signin, signup } = require("../src/controllers/authController");
const { authMiddleware } = require("../src/middleware/authMiddleware");

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("signup enforces the 8-12 character standard-user password range", async (t) => {
  const originalFindFirst = prisma.user.findFirst;
  const originalCreate = prisma.user.create;
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret-for-auth-workflows";
  let createdUser;
  prisma.user.findFirst = async () => null;
  prisma.user.create = async ({ data }) => {
    createdUser = { id: 2, ...data };
    return createdUser;
  };
  t.after(() => {
    prisma.user.findFirst = originalFindFirst;
    prisma.user.create = originalCreate;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  for (const password of ["short7!", "thirteen-char"]) {
    const res = response();
    await signup({ body: { name: "User", email: `${password}@example.com`, password } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(createdUser, undefined);
  }

  for (const password of ["pass1234", "pass12345678"]) {
    const res = response();
    await signup({ body: { name: "User", email: `${password}@example.com`, password } }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(await bcrypt.compare(password, createdUser.password), true);
  }
});

test("a successful admin login invalidates the previous admin token", async (t) => {
  const originalFindFirst = prisma.user.findFirst;
  const originalUpdate = prisma.user.update;
  const originalFindUnique = prisma.user.findUnique;
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret-for-auth-workflows";
  const adminPassword = "long-admin-password";
  let adminSessionVersion = 0;
  const admin = {
    id: 1,
    name: "Admin",
    email: "abdi1@gmail.com",
    password: await bcrypt.hash(adminPassword, 4),
    role: "ADMIN",
  };
  prisma.user.findFirst = async () => admin;
  prisma.user.update = async ({ data }) => {
    adminSessionVersion += data.adminSessionVersion.increment;
    return { ...admin, adminSessionVersion };
  };
  prisma.user.findUnique = async () => ({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    adminSessionVersion,
    createdAt: new Date(),
  });
  t.after(() => {
    prisma.user.findFirst = originalFindFirst;
    prisma.user.update = originalUpdate;
    prisma.user.findUnique = originalFindUnique;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const firstLogin = response();
  await signin({ body: { email: admin.email, password: adminPassword } }, firstLogin);
  const firstPayload = jwt.verify(firstLogin.body.token, process.env.JWT_SECRET);
  assert.equal(firstPayload.adminSessionVersion, 1);
  assert.equal(Object.hasOwn(firstLogin.body.user, "adminSessionVersion"), false);

  const secondLogin = response();
  await signin({ body: { email: admin.email, password: adminPassword } }, secondLogin);
  const secondPayload = jwt.verify(secondLogin.body.token, process.env.JWT_SECRET);
  assert.equal(secondPayload.adminSessionVersion, 2);

  const staleResponse = response();
  let nextCalled = false;
  authMiddleware({
    get: () => `Bearer ${firstLogin.body.token}`,
  }, staleResponse, () => {
    nextCalled = true;
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(staleResponse.statusCode, 401);
  assert.equal(nextCalled, false);

  const currentResponse = response();
  authMiddleware({
    get: () => `Bearer ${secondLogin.body.token}`,
  }, currentResponse, () => {
    nextCalled = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(nextCalled, true);
});

test("admin login rejects passwords shorter than ten characters", async (t) => {
  const originalFindFirst = prisma.user.findFirst;
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret-for-auth-workflows";
  const password = "shortpass";
  prisma.user.findFirst = async () => ({
    id: 1,
    password: await bcrypt.hash(password, 4),
    role: "ADMIN",
  });
  t.after(() => {
    prisma.user.findFirst = originalFindFirst;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const res = response();
  await signin({ body: { email: "abdi1@gmail.com", password } }, res);

  assert.equal(res.statusCode, 401);
});
