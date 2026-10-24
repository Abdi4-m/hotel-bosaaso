const assert = require("node:assert/strict");
const test = require("node:test");
const prisma = require("../src/lib/prisma");
const { updateBookingStatus } = require("../src/controllers/bookingController");

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

test("a customer can reconfirm their cancelled booking", async (t) => {
  const originalFindUnique = prisma.booking.findUnique;
  const originalTransaction = prisma.$transaction;
  const currentBooking = {
    id: "booking-1",
    userId: "user-1",
    roomId: "room-1",
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
