const prisma = require("../lib/prisma");
const { parseDateRange } = require("../utils/dateRange");
const { parseId } = require("../utils/parseId");

function bookingError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function createBooking(req, res) {
  const { roomId, checkIn: checkInValue, checkOut: checkOutValue } = req.body;
  const guests = req.body.guests === undefined ? 1 : req.body.guests;
  const parsedRoomId = parseId(roomId);
  if (parsedRoomId === null) return res.status(400).json({ error: "roomId must be a positive integer" });
  if (!Number.isSafeInteger(guests) || guests < 1 || guests > 99) {
    return res.status(400).json({ error: "Guests must be a whole number between 1 and 99" });
  }
  const range = parseDateRange(checkInValue, checkOutValue);
  if (range.error) return res.status(400).json({ error: range.error });

  const nights = Math.round((range.checkOut - range.checkIn) / 86400000);
  try {
    const booking = await prisma.$transaction(async (transaction) => {
      const room = await transaction.room.findUnique({ where: { id: parsedRoomId } });
      if (!room) throw bookingError("Room not found", 404);
      if (room.isBooked) throw bookingError("This room is not accepting bookings", 409);

      const conflict = await transaction.booking.findFirst({
        where: {
          roomId: parsedRoomId,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          checkIn: { lt: range.checkOut },
          checkOut: { gt: range.checkIn },
        },
      });
      if (conflict) throw bookingError("This room is already booked for those dates", 409);

      return transaction.booking.create({
        data: {
          userId: req.user.id,
          roomId: parsedRoomId,
          checkIn: range.checkIn,
          checkOut: range.checkOut,
          guests,
          totalPrice: Number((room.pricePerNight * nights).toFixed(2)),
          status: "CONFIRMED",
          paymentStatus: "UNPAID",
        },
        include: {
          room: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
    });
    return res.status(201).json(booking);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }
}

async function listMyBookings(req, res) {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user.id },
    include: {
      room: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(bookings);
}

async function listBookings(req, res) {
  const bookings = await prisma.booking.findMany({
    include: {
      room: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(bookings);
}

async function updateBookingStatus(req, res) {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "id must be a positive integer" });
  const { status } = req.body;
  if (!new Set(["CONFIRMED", "CHECKED_IN", "CANCELLED"]).has(status)) {
    return res.status(400).json({ error: "Status must be CONFIRMED, CHECKED_IN, or CANCELLED" });
  }
  if (req.user.role !== "ADMIN" && !["CONFIRMED", "CANCELLED"].includes(status)) {
    return res.status(403).json({ error: "Customers may only confirm or cancel their own bookings" });
  }

  const current = await prisma.booking.findUnique({ where: { id } });
  if (!current) return res.status(404).json({ error: "Booking not found" });
  if (req.user.role !== "ADMIN" && current.userId !== req.user.id) {
    return res.status(403).json({ error: "You can only update your own bookings" });
  }
  if (req.user.role !== "ADMIN" && status === "CONFIRMED" && current.status !== "CANCELLED") {
    return res.status(409).json({ error: "Only cancelled bookings can be confirmed" });
  }

  const booking = await prisma.$transaction(async (transaction) => {
    if (status === "CONFIRMED" || status === "CHECKED_IN") {
      const conflict = await transaction.booking.findFirst({
        where: {
          id: { not: current.id },
          roomId: current.roomId,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          checkIn: { lt: current.checkOut },
          checkOut: { gt: current.checkIn },
        },
      });
      if (conflict) throw bookingError("This room is already booked for those dates", 409);
    }
    return transaction.booking.update({
      where: { id: current.id },
      data: { status },
      include: { room: true, user: { select: { id: true, name: true, email: true } } },
    });
  });
  return res.json(booking);
}

module.exports = { createBooking, listBookings, listMyBookings, updateBookingStatus };