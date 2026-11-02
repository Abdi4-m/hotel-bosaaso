const assert = require("node:assert/strict");
const test = require("node:test");
const prisma = require("../src/lib/prisma");
const { createBooking, deleteBooking, updateBookingConfirmation, updateBookingStatus } = require("../src/controllers/bookingController");

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
    end() {
      this.ended = true;
      return this;
    },
  };
}

test("an administrator can delete a booking by its integer ID", async (t) => {
  const originalDeleteMany = prisma.booking.deleteMany;
  let where;
  prisma.booking.deleteMany = async (args) => {
    where = args.where;
    return { count: 1 };
  };
  t.after(() => {
    prisma.booking.deleteMany = originalDeleteMany;
  });

  const res = response();
  await deleteBooking({ params: { id: "8" } }, res);

  assert.deepEqual(where, { id: 8 });
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
});

test("deleting an unknown booking returns not found", async (t) => {
  const originalDeleteMany = prisma.booking.deleteMany;
  prisma.booking.deleteMany = async () => ({ count: 0 });
  t.after(() => {
    prisma.booking.deleteMany = originalDeleteMany;
  });

  const res = response();
  await deleteBooking({ params: { id: "999" } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, "Booking not found");
});

test("booking deletion rejects invalid IDs without querying Prisma", async (t) => {
  const originalDeleteMany = prisma.booking.deleteMany;
  prisma.booking.deleteMany = async () => assert.fail("Invalid IDs must not reach Prisma");
  t.after(() => {
    prisma.booking.deleteMany = originalDeleteMany;
  });

  const res = response();
  await deleteBooking({ params: { id: "0" } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "id must be a positive integer");
});

test("booking creation accepts and persists integer room IDs", async (t) => {
  const originalTransaction = prisma.$transaction;
  let createdData;
  prisma.$transaction = async (callback) => callback({
    room: {
      findUnique: async ({ where }) => {
        assert.deepEqual(where, { id: 5 });
        return { id: 5, isBooked: false, pricePerNight: 100 };
      },
    },
    booking: {
      findFirst: async ({ where }) => {
        assert.equal(where.roomId, 5);
        return null;
      },
      create: async ({ data }) => {
        createdData = data;
        return { id: 7, ...data };
      },
    },
  });
  t.after(() => {
    prisma.$transaction = originalTransaction;
  });

  const res = response();
  await createBooking({
    body: { roomId: 5, checkIn: "2030-11-01", checkOut: "2030-11-03" },
    user: { id: 3 },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.userId, 3);
  assert.equal(createdData.roomId, 5);
  assert.equal(createdData.taxAmount, 0.5);
  assert.equal(createdData.totalPrice, 200.5);
});

test("booking creation rejects past check-in dates before querying Prisma", async (t) => {
  const originalTransaction = prisma.$transaction;
  prisma.$transaction = async () => assert.fail("Past dates must be rejected before querying Prisma");
  t.after(() => {
    prisma.$transaction = originalTransaction;
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const res = response();
  await createBooking({
    body: {
      roomId: 5,
      checkIn: yesterday.toISOString().slice(0, 10),
      checkOut: today.toISOString().slice(0, 10),
    },
    user: { id: 3 },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Check-in must be today or later");
});

test("a customer can reconfirm their cancelled booking", async (t) => {
  const originalFindUnique = prisma.booking.findUnique;
  const originalTransaction = prisma.$transaction;
  const currentBooking = {
    id: 10,
    userId: 1,
    roomId: 2,
    checkIn: new Date("2026-11-01"),
    checkOut: new Date("2026-11-03"),
    status: "CANCELLED",
  };
  let updatedBooking;
  prisma.booking.findUnique = async () => currentBooking;
  prisma.$transaction = async (callback) => callback({
    booking: {
      findFirst: async () => null,
      update: async ({ data }) => {
        updatedBooking = { ...currentBooking, ...data, room: {}, user: {} };
        return updatedBooking;
      },
    },
  });
  t.after(() => {
    prisma.booking.findUnique = originalFindUnique;
    prisma.$transaction = originalTransaction;
  });

  const res = response();
  await updateBookingStatus({
    body: { status: "CONFIRMED" },
    params: { id: currentBooking.id },
    user: { id: currentBooking.userId, role: "USER" },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updatedBooking.status, "CONFIRMED");
  assert.equal(res.body.id, currentBooking.id);
});

test("a customer can confirm receipt for their own booking", async (t) => {
  const originalFindUnique = prisma.booking.findUnique;
  const originalUpdate = prisma.booking.update;
  prisma.booking.findUnique = async () => ({ id: 8, userId: 3 });
  prisma.booking.update = async ({ data }) => ({ id: 8, ...data });
  t.after(() => {
    prisma.booking.findUnique = originalFindUnique;
    prisma.booking.update = originalUpdate;
  });

  const res = response();
  await updateBookingConfirmation({
    params: { id: "8" },
    body: { confirmation: "RECEIVED" },
    user: { id: 3 },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.deliveryConfirmation, "RECEIVED");
});
