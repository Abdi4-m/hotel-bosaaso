const assert = require("node:assert/strict");
const test = require("node:test");
const prisma = require("../src/lib/prisma");
const { createRoom } = require("../src/controllers/roomController");
const { deleteUser } = require("../src/controllers/userController");

function response() {
  return {
    statusCode: 200,
    body: undefined,
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test("room creation only sends fields present in the Prisma Room model", async (t) => {
  const originalCreate = prisma.room.create;
  let receivedData;
  prisma.room.create = async ({ data }) => {
    receivedData = data;
    return { id: 1, ...data };
  };
  t.after(() => {
    prisma.room.create = originalCreate;
  });

  const res = response();
  await createRoom({
    body: {
      roomNumber: "101",
      name: "Standard Room 101",
      type: "STANDARD",
      pricePerNight: "95",
      image: "room.jpg",
      description: "A quiet room",
      hasEnsuiteBathroom: true,
      isBooked: false,
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(receivedData.pricePerNight, 95);
  assert.equal(Object.hasOwn(receivedData, "status"), false);
});

test("user deletion removes bookings and orders before the user", async (t) => {
  const originalTransaction = prisma.$transaction;
  const operations = [];
  prisma.$transaction = async (callback) => callback({
    user: {
      findUnique: async () => ({ id: 2, role: "USER" }),
      delete: async () => operations.push("user"),
    },
    booking: {
      deleteMany: async ({ where }) => {
        assert.deepEqual(where, { userId: 2 });
        operations.push("bookings");
      },
    },
    order: {
      deleteMany: async ({ where }) => {
        assert.deepEqual(where, { userId: 2 });
        operations.push("orders");
      },
    },
  });
  t.after(() => {
    prisma.$transaction = originalTransaction;
  });

  const res = response();
  await deleteUser({ params: { id: "2" }, user: { id: 1 } }, res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.deepEqual(operations, ["bookings", "orders", "user"]);
});

test("user deletion protects the final administrator", async (t) => {
  const originalTransaction = prisma.$transaction;
  let deletionAttempted = false;
  prisma.$transaction = async (callback) => callback({
    user: {
      findUnique: async () => ({ id: 2, role: "ADMIN" }),
      count: async () => 1,
      delete: async () => {
        deletionAttempted = true;
      },
    },
    booking: { deleteMany: async () => assert.fail("Bookings must not be deleted") },
    order: { deleteMany: async () => assert.fail("Orders must not be deleted") },
  });
  t.after(() => {
    prisma.$transaction = originalTransaction;
  });

  const res = response();
  await deleteUser({ params: { id: "2" }, user: { id: 1 } }, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, "The last administrator cannot be deleted");
  assert.equal(deletionAttempted, false);
});
