const prisma = require("../lib/prisma");

async function getDashboardStats(req, res) {
  const [totalUsers, totalOrders, totalBookings, orderRevenue, bookingRevenue] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.booking.count(),
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
    }),
    prisma.booking.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalPrice: true },
    }),
  ]);

  return res.json({
    totalUsers,
    totalOrders,
    totalBookings,
    totalRevenue: (orderRevenue._sum.totalAmount ?? 0) + (bookingRevenue._sum.totalPrice ?? 0),
  });
}

module.exports = { getDashboardStats };
