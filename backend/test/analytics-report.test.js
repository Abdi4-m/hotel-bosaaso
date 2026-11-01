const assert = require("node:assert/strict");
const test = require("node:test");
const prisma = require("../src/lib/prisma");
const { getAnalyticsReport, listPageViews } = require("../src/controllers/analyticsController");

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
      return this;
    },
  };
}

test("page views defaults invalid offsets to zero", async (t) => {
  const originalCount = prisma.pageView.count;
  const originalFindMany = prisma.pageView.findMany;
  const originalAdminEmail = process.env.ADMIN_EMAIL;
  const offsets = [];
  const queries = [];
  process.env.ADMIN_EMAIL = "admin@example.test";
  prisma.pageView.count = async ({ where }) => {
    queries.push(where);
    return 0;
  };
  prisma.pageView.findMany = async ({ skip, where }) => {
    offsets.push(skip);
    queries.push(where);
    return [];
  };
  t.after(() => {
    prisma.pageView.count = originalCount;
    prisma.pageView.findMany = originalFindMany;
    if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = originalAdminEmail;
  });

  for (const query of [
    {},
    { offset: "NaN" },
    { offset: "-10" },
    { offset: "25oops" },
    { offset: "1.5" },
    { offset: "9007199254740992" },
    { offset: "25" },
  ]) {
    const res = response();
    await listPageViews({ query }, res);
    assert.equal(res.statusCode, 200);
  }

  assert.deepEqual(offsets, [0, 0, 0, 0, 0, 0, 25]);
  assert.equal(queries.length, 14);
  assert.deepEqual(queries[0].pagePath.in, ["/", "/menu", "/rooms", "/cart", "/checkout", "/account", "/contact"]);
  assert.deepEqual(queries[0].OR[0], { user: { is: null } });
  assert.deepEqual(queries[0].OR[1].user.is.role, { not: "ADMIN", mode: "insensitive" });
  assert.deepEqual(queries[0].OR[1].user.is.email, { not: "admin@example.test", mode: "insensitive" });
  assert.deepEqual(queries[0].AND[0].OR, [
    { visitorEmail: null },
    { visitorEmail: { not: "admin@example.test", mode: "insensitive" } },
  ]);
  assert.deepEqual(queries[0], queries[1]);
});

test("analytics report isolates the selected month and calculates database metrics", async (t) => {
  const originalOrderFindMany = prisma.order.findMany;
  const originalBookingFindMany = prisma.booking.findMany;
  const originalPageViewFindMany = prisma.pageView.findMany;
  const originalAdminEmail = process.env.ADMIN_EMAIL;
  const queries = {};
  process.env.ADMIN_EMAIL = "admin@example.test";
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
    if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = originalAdminEmail;
  });

  const res = response();
  await getAnalyticsReport({ query: { range: "month", date: "2026-02-18" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(queries.orders.where.orderDate.gte.toISOString(), "2026-02-01T00:00:00.000Z");
  assert.equal(queries.orders.where.orderDate.lt.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.deepEqual(queries.orders.where.status, { not: "CANCELLED" });
  assert.equal(queries.bookings.where.createdAt.gte.toISOString(), "2026-02-01T00:00:00.000Z");
  assert.equal(queries.views.where.createdAt.lt.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.deepEqual(queries.views.where.pagePath.in, ["/", "/menu", "/rooms", "/cart", "/checkout", "/account", "/contact"]);
  assert.deepEqual(queries.views.where.OR[1].user.is.role, { not: "ADMIN", mode: "insensitive" });
  assert.deepEqual(queries.views.where.AND[0].OR[1].visitorEmail, {
    not: "admin@example.test",
    mode: "insensitive",
  });
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

test("page view recording ignores admin identities and irrelevant routes", async (t) => {
  const { recordPageView } = require("../src/controllers/analyticsController");
  const originalCreate = prisma.pageView.create;
  const originalAdminEmail = process.env.ADMIN_EMAIL;
  const created = [];
  process.env.ADMIN_EMAIL = "admin@example.test";
  prisma.pageView.create = async ({ data }) => {
    created.push(data);
    return { id: 1 };
  };
  t.after(() => {
    prisma.pageView.create = originalCreate;
    if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = originalAdminEmail;
  });

  for (const req of [
    { user: { id: 1, role: "ADMIN", email: "other@example.test" }, body: { pagePath: "/" } },
    { user: { id: 2, role: "USER", email: "ADMIN@example.test" }, body: { pagePath: "/" } },
    { user: { id: 3, role: "USER", email: "client@example.test" }, body: { pagePath: "/admin" } },
    { user: { id: 4, role: "USER", email: "client@example.test" }, body: { pagePath: "/signin" } },
  ]) {
    const res = response();
    await recordPageView(req, res);
    assert.equal(res.statusCode, 204);
  }

  const res = response();
  await recordPageView({
    user: { id: 5, role: "USER", email: "client@example.test", name: "Client" },
    body: { pagePath: "/rooms" },
  }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(created.length, 1);
  assert.equal(created[0].pagePath, "/rooms");
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
