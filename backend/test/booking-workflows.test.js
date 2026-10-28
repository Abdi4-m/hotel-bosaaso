const assert = require("node:assert/strict");
const test = require("node:test");
const prisma = require("../src/lib/prisma");
const { createBooking, updateBookingStatus } = require("../src/controllers/bookingController");

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
  assert.equal(createdData.totalPrice, 200);
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
