const prisma = require("../lib/prisma");

const RANGE_TYPES = new Set(["day", "week", "month", "year"]);
const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/menu",
  "/rooms",
  "/cart",
  "/checkout",
  "/account",
  "/contact",
]);

function isRelevantPagePath(pagePath) {
  return PUBLIC_PAGE_PATHS.has(pagePath);
}

function isAdministrator(user) {
  if (typeof user?.role === "string" && user.role.toUpperCase() === "ADMIN") return true;
  const administratorEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(
    administratorEmail &&
    typeof user?.email === "string" &&
    user.email.trim().toLowerCase() === administratorEmail
  );
}

function getPageViewWhere(createdAt) {
  const administratorEmail = process.env.ADMIN_EMAIL?.trim();
  const where = {
    pagePath: { in: [...PUBLIC_PAGE_PATHS] },
    OR: [
      { user: { is: null } },
      {
        user: {
          is: {
            role: { not: "ADMIN", mode: "insensitive" },
            ...(administratorEmail
              ? { email: { not: administratorEmail, mode: "insensitive" } }
              : {}),
          },
        },
      },
    ],
  };
  if (createdAt) where.createdAt = createdAt;
  if (administratorEmail) {
    where.AND = [{
      OR: [
        { visitorEmail: null },
        { visitorEmail: { not: administratorEmail, mode: "insensitive" } },
      ],
    }];
  }
  return where;
}

function getDateRange(range, anchorValue) {
  if (!RANGE_TYPES.has(range)) {
    return { error: "range must be day, week, month, or year" };
  }
  const anchorText = anchorValue ?? new Date().toISOString().slice(0, 10);
  if (typeof anchorText !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(anchorText)) {
    return { error: "date must use YYYY-MM-DD format" };
  }
  const anchor = new Date(`${anchorText}T00:00:00.000Z`);
  if (Number.isNaN(anchor.getTime()) || anchor.toISOString().slice(0, 10) !== anchorText) {
    return { error: "date must be a valid calendar date" };
  }

  let start;
  let end;
  if (range === "day") {
    start = anchor;
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
  } else if (range === "week") {
    start = new Date(anchor);
    const weekday = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - weekday);
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
  } else if (range === "month") {
    start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
  } else {
    start = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1));
    end = new Date(Date.UTC(anchor.getUTCFullYear() + 1, 0, 1));
  }
  return { start, end, anchorDate: anchorText };
}

function createBuckets(range, start, end) {
  const buckets = [];
  for (let cursor = new Date(start); cursor < end;) {
    const next = new Date(cursor);
    if (range === "day") next.setUTCHours(next.getUTCHours() + 1);
    else if (range === "year") next.setUTCMonth(next.getUTCMonth() + 1);
    else next.setUTCDate(next.getUTCDate() + 1);
    buckets.push({
      key: range === "day"
        ? cursor.toISOString().slice(0, 13)
        : range === "year"
          ? cursor.toISOString().slice(0, 7)
          : cursor.toISOString().slice(0, 10),
      label: range === "day"
        ? `${String(cursor.getUTCHours()).padStart(2, "0")}:00`
        : range === "year"
          ? new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(cursor)
          : String(cursor.getUTCDate()),
      revenue: 0,
      pageViews: 0,
    });
    cursor = next;
  }
  return buckets;
}

function getBucketKey(date, range) {
  const value = new Date(date);
  return range === "day"
    ? value.toISOString().slice(0, 13)
    : range === "year"
      ? value.toISOString().slice(0, 7)
      : value.toISOString().slice(0, 10);
}

async function getAnalyticsReport(req, res) {
  const range = typeof req.query.range === "string" ? req.query.range : "month";
  const dateRange = getDateRange(range, req.query.date);
  if (dateRange.error) return res.status(400).json({ error: dateRange.error });

  const { start, end } = dateRange;
  const dateFilter = { gte: start, lt: end };
  const [orders, bookings, views] = await Promise.all([
    prisma.order.findMany({
      where: { orderDate: dateFilter, status: { not: "CANCELLED" } },
      select: {
        id: true,
        orderDate: true,
        totalAmount: true,
        customerName: true,
        status: true,
        paymentStatus: true,
        items: { select: { title: true, quantity: true, priceAtPurchase: true } },
      },
    }),
    prisma.booking.findMany({
      where: { createdAt: dateFilter, status: { not: "CANCELLED" } },
      select: {
        id: true,
        createdAt: true,
        totalPrice: true,
        status: true,
        paymentStatus: true,
        user: { select: { name: true } },
        room: { select: { id: true, name: true, roomNumber: true } },
      },
    }),
    prisma.pageView.findMany({
      where: getPageViewWhere(dateFilter),
      select: { createdAt: true, userId: true, visitorName: true, visitorEmail: true, pagePath: true },
    }),
  ]);

  const foodSales = new Map();
  const roomSales = new Map();
  const visitorCounts = new Map();
  const pageCounts = new Map();
  const buckets = createBuckets(range, start, end);
  const bucketsByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const salesDays = new Map();
  let revenue = 0;
  let foodOrders = 0;

  for (const order of orders) {
    const orderRevenue = Number(order.totalAmount) || 0;
    revenue += orderRevenue;
    foodOrders += 1;
    const bucket = bucketsByKey.get(getBucketKey(order.orderDate, range));
    if (bucket) bucket.revenue += orderRevenue;
    const day = new Date(order.orderDate).toISOString().slice(0, 10);
    salesDays.set(day, (salesDays.get(day) || 0) + orderRevenue);
    for (const item of order.items) {
      const current = foodSales.get(item.title) || { name: item.title, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += Number(item.priceAtPurchase) * item.quantity;
      foodSales.set(item.title, current);
    }
  }

  for (const booking of bookings) {
    const bookingRevenue = Number(booking.totalPrice) || 0;
    revenue += bookingRevenue;
    const bucket = bucketsByKey.get(getBucketKey(booking.createdAt, range));
    if (bucket) bucket.revenue += bookingRevenue;
    const day = new Date(booking.createdAt).toISOString().slice(0, 10);
    salesDays.set(day, (salesDays.get(day) || 0) + bookingRevenue);
    const key = String(booking.room.id);
    const current = roomSales.get(key) || {
      id: booking.room.id,
      name: booking.room.name,
      roomNumber: booking.room.roomNumber,
      bookings: 0,
      revenue: 0,
    };
    current.bookings += 1;
    current.revenue += bookingRevenue;
    roomSales.set(key, current);
  }

  for (const view of views) {
    const bucket = bucketsByKey.get(getBucketKey(view.createdAt, range));
    if (bucket) bucket.pageViews += 1;
    const visitorKey = view.userId === null
      ? `guest:${view.visitorName}`
      : `user:${view.userId}`;
    const visitor = visitorCounts.get(visitorKey) || {
      name: view.visitorName || "No client",
      email: view.visitorEmail,
      views: 0,
      client: view.userId !== null,
    };
    visitor.views += 1;
    visitorCounts.set(visitorKey, visitor);
    pageCounts.set(view.pagePath, (pageCounts.get(view.pagePath) || 0) + 1);
  }

  const bestSellingFoods = [...foodSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  const bestSellingRooms = [...roomSales.values()].sort((a, b) => b.bookings - a.bookings).slice(0, 10);
  const topFood = bestSellingFoods[0];
  const topSellingItem = topFood ? { type: "food", name: topFood.name, sales: topFood.quantity } : null;
  const bestSellingDay = [...salesDays.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([day, dayRevenue]) => ({ date: day, revenue: dayRevenue }))[0] || null;
  const transactions = [
    ...orders.map((order) => ({
      id: `order-${order.id}`,
      type: "Food order",
      customer: order.customerName || "Customer",
      description: order.items.map((item) => `${item.quantity} × ${item.title}`).join(", ") || "Food order",
      amount: Number(order.totalAmount) || 0,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.orderDate,
    })),
    ...bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      type: "Room booking",
      customer: booking.user.name || "Customer",
      description: `Room ${booking.room.roomNumber} · ${booking.room.name}`,
      amount: Number(booking.totalPrice) || 0,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);

  return res.json({
    range,
    anchorDate: dateRange.anchorDate,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    summary: {
      foodOrders,
      roomBookings: bookings.length,
      revenue,
      pageViews: views.length,
      registeredVisitors: new Set(views.filter((view) => view.userId !== null).map((view) => view.userId)).size,
      guestPageViews: views.filter((view) => view.userId === null).length,
      transactionCount: orders.length + bookings.length,
    },
    bestSellingFoods,
    bestSellingRooms,
    topSellingItem,
    bestSellingDay,
    visitors: [...visitorCounts.values()].sort((a, b) => b.views - a.views).slice(0, 10),
    topPages: [...pageCounts.entries()].map(([page, pageViews]) => ({ page, pageViews })).sort((a, b) => b.pageViews - a.pageViews).slice(0, 10),
    transactions,
    trend: buckets.map((bucket) => ({ ...bucket, revenue: Number(bucket.revenue.toFixed(2)) })),
  });
}

async function recordPageView(req, res) {
  const { pagePath } = req.body || {};
  if (typeof pagePath !== "string" || !pagePath.startsWith("/") || pagePath.length > 200) {
    return res.status(400).json({ error: "pagePath must be a path of 200 characters or fewer" });
  }
  if (isAdministrator(req.user) || !isRelevantPagePath(pagePath)) {
    return res.status(204).end();
  }
  const view = await prisma.pageView.create({
    data: {
      userId: req.user?.id ?? null,
      visitorName: req.user?.name ?? "No client",
      visitorEmail: req.user?.email ?? null,
      pagePath,
    },
    select: { id: true },
  });
  return res.status(201).json(view);
}

async function listPageViews(req, res) {
  const offsetValue = req.query?.offset;
  const parsedOffset = typeof offsetValue === "string" && offsetValue.trim() !== ""
    ? Number(offsetValue)
    : 0;
  const offset = Number.isSafeInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  const where = getPageViewWhere();
  const [total, pageViews] = await Promise.all([
    prisma.pageView.count({ where }),
    prisma.pageView.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: 100,
      select: { id: true, visitorName: true, visitorEmail: true, pagePath: true, createdAt: true },
    }),
  ]);
  return res.json({ total, pageViews });
}

async function listActivity(req, res) {
  const afterValue = req.query.after;
  const after = afterValue === undefined ? null : Number(afterValue);
  if (after !== null && (!Number.isSafeInteger(after) || after < 0)) {
    return res.status(400).json({ error: "after must be a non-negative integer" });
  }
  const activities = await prisma.activity.findMany({
    ...(after === null ? {} : { where: { id: { gt: after } } }),
    orderBy: { id: after === null ? "desc" : "asc" },
    take: 50,
  });
  if (after === null) activities.reverse();
  return res.json({ activities });
}

module.exports = { getAnalyticsReport, listActivity, listPageViews, recordPageView };
