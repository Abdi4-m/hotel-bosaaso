const assert = require("node:assert/strict");
const test = require("node:test");
const prisma = require("../src/lib/prisma");
const { listRooms } = require("../src/controllers/roomController");

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

test("room availability expires exactly at checkout midnight", async (t) => {
  const originalDate = global.Date;
  const originalRoomFindMany = prisma.room.findMany;
  const originalBookingFindMany = prisma.booking.findMany;
  const now = new originalDate("2026-11-02T00:00:00.000Z");
  global.Date = class extends originalDate {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }

    static now() {
      return now.getTime();
    }
  };
  prisma.room.findMany = async () => [
    { id: 1, roomNumber: "101", isBooked: false },
    { id: 2, roomNumber: "102", isBooked: false },
  ];
  const bookingQueries = [];
  prisma.booking.findMany = async ({ where }) => {
    bookingQueries.push(where);
    if (where.checkIn?.lte) return [{ roomId: 2 }];
    return [{ roomId: 2 }];
  };
  t.after(() => {
    global.Date = originalDate;
    prisma.room.findMany = originalRoomFindMany;
    prisma.booking.findMany = originalBookingFindMany;
  });

  const res = response();
  await listRooms({ query: { checkIn: "2026-11-02", checkOut: "2026-11-03" } }, res);

  assert.equal(bookingQueries[0].checkOut.gt.toISOString(), now.toISOString());
  assert.equal(bookingQueries[1].checkOut.gt.toISOString(), "2026-11-02T00:00:00.000Z");
  assert.equal(bookingQueries[1].checkIn.lt.toISOString(), "2026-11-03T00:00:00.000Z");
  assert.equal(res.body.find((room) => room.id === 1).isBooked, false);
  assert.equal(res.body.find((room) => room.id === 2).isBooked, true);
  assert.equal(res.body.find((room) => room.id === 1).isAvailableForDates, true);
  assert.equal(res.body.find((room) => room.id === 2).isAvailableForDates, false);
});
