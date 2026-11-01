const assert = require("node:assert/strict");
const test = require("node:test");
const prisma = require("../src/lib/prisma");
const { getAnalyticsReport } = require("../src/controllers/analyticsController");

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

test("analytics report isolates the selected month and calculates database metrics", async (t) => {
  const originalOrderFindMany = prisma.order.findMany;
  const originalBookingFindMany = prisma.booking.findMany;
  const originalPageViewFindMany = prisma.pageView.findMany;
  const queries = {};
  prisma.order.findMany = async (query) => {
    queries.orders = query;
    return [{
      id: 21,
      orderDate: new Date("2026-02-28T23:00:00.000Z"),
      totalAmount: 40,
      customerName: "Ada Guest",
      status: "CONFIRMED",
      paymentStatus: "PAID",
      items: [{ title: "Soup", quantity: 4, priceAtPurchase: 10 }],
    }];
  };
  prisma.booking.findMany = async (query) => {
    queries.bookings = query;
    return [{
      id: 31,
      createdAt: new Date("2026-02-02T10:00:00.000Z"),
      totalPrice: 125,
      status: "CONFIRMED",
      paymentStatus: "UNPAID",
      user: { name: "Grace Client" },
      room: { id: 8, name: "Suite", roomNumber: "201" },
    }];
  };
  prisma.pageView.findMany = async (query) => {
    queries.views = query;
    return [
      { createdAt: new Date("2026-02-01T10:00:00.000Z"), userId: 5, visitorName: "Client", visitorEmail: "client@example.test", pagePath: "/" },
      { createdAt: new Date("2026-02-01T11:00:00.000Z"), userId: null, visitorName: "No client", visitorEmail: null, pagePath: "/" },
    ];
  };
  t.after(() => {
    prisma.order.findMany = originalOrderFindMany;
    prisma.booking.findMany = originalBookingFindMany;
    prisma.pageView.findMany = originalPageViewFindMany;
  });

  const res = response();
  await getAnalyticsReport({ query: { range: "month", date: "2026-02-18" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(queries.orders.where.orderDate.gte.toISOString(), "2026-02-01T00:00:00.000Z");
  assert.equal(queries.orders.where.orderDate.lt.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.deepEqual(queries.orders.where.status, { not: "CANCELLED" });
  assert.equal(queries.bookings.where.createdAt.gte.toISOString(), "2026-02-01T00:00:00.000Z");
  assert.equal(queries.views.where.createdAt.lt.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.equal(res.body.trend.length, 28);
  assert.equal(res.body.summary.revenue, 165);
  assert.equal(res.body.summary.foodOrders, 1);
  assert.equal(res.body.summary.roomBookings, 1);
  assert.equal(res.body.summary.transactionCount, 2);
  assert.equal(res.body.summary.registeredVisitors, 1);
  assert.equal(res.body.summary.guestPageViews, 1);
  assert.deepEqual(res.body.topSellingItem, { type: "food", name: "Soup", sales: 4 });
  assert.deepEqual(res.body.bestSellingDay, { date: "2026-02-02", revenue: 125 });
  assert.deepEqual(res.body.transactions[0], {
    id: "order-21",
    type: "Food order",
    customer: "Ada Guest",
    description: "4 × Soup",
    amount: 40,
    status: "CONFIRMED",
    paymentStatus: "PAID",
    createdAt: new Date("2026-02-28T23:00:00.000Z"),
  });
  assert.deepEqual(res.body.transactions[1], {
    id: "booking-31",
    type: "Room booking",
    customer: "Grace Client",
    description: "Room 201 · Suite",
    amount: 125,
    status: "CONFIRMED",
    paymentStatus: "UNPAID",
    createdAt: new Date("2026-02-02T10:00:00.000Z"),
  });
});

test("analytics report rejects unsupported ranges before querying Prisma", async (t) => {
  const originalOrderFindMany = prisma.order.findMany;
  let queried = false;
  prisma.order.findMany = async () => {
    queried = true;
    return [];
  };
  t.after(() => {
    prisma.order.findMany = originalOrderFindMany;
  });

  const res = response();
  await getAnalyticsReport({ query: { range: "quarter" } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "range must be day, week, month, or year");
  assert.equal(queried, false);
});

test("analytics report creates bounded buckets for day, week, and year ranges", async (t) => {
  const originalOrderFindMany = prisma.order.findMany;
  const originalBookingFindMany = prisma.booking.findMany;
  const originalPageViewFindMany = prisma.pageView.findMany;
  const filters = [];
  prisma.order.findMany = async ({ where }) => {
    filters.push(where.orderDate);
    return [];
  };
  prisma.booking.findMany = async () => [];
  prisma.pageView.findMany = async () => [];
  t.after(() => {
    prisma.order.findMany = originalOrderFindMany;
    prisma.booking.findMany = originalBookingFindMany;
    prisma.pageView.findMany = originalPageViewFindMany;
  });

  for (const [range, date, start, end, buckets] of [
    ["day", "2026-03-04", "2026-03-04T00:00:00.000Z", "2026-03-05T00:00:00.000Z", 24],
    ["week", "2026-03-04", "2026-03-02T00:00:00.000Z", "2026-03-09T00:00:00.000Z", 7],
    ["year", "2026-03-04", "2026-01-01T00:00:00.000Z", "2027-01-01T00:00:00.000Z", 12],
  ]) {
    const res = response();
    await getAnalyticsReport({ query: { range, date } }, res);
    assert.equal(res.body.trend.length, buckets);
    assert.equal(res.body.startDate, start);
    assert.equal(res.body.endDate, end);
  }
  assert.equal(filters.length, 3);
});
