const prisma = require("../lib/prisma");

const { parseDateRange } = require("../utils/dateRange");
const ROOM_TYPES = new Set(["FAMILY", "STANDARD", "DELUXE"]);

function validateRoom(body, partial = false) {
  for (const field of ["roomNumber", "name", "image", "description"]) {
    if ((!partial || body[field] !== undefined) && (typeof body[field] !== "string" || !body[field].trim())) {
      return `${field} must be a non-empty string`;
    }
  }
  if ((!partial || body.type !== undefined) && !ROOM_TYPES.has(body.type)) {
    return "type must be FAMILY, STANDARD, or DELUXE";
  }
  if ((!partial || body.pricePerNight !== undefined) && (!Number.isFinite(Number(body.pricePerNight)) || Number(body.pricePerNight) < 0)) {
    return "pricePerNight must be a non-negative number";
  }
  for (const field of ["hasEnsuiteBathroom", "isBooked"]) {
    if (body[field] !== undefined && typeof body[field] !== "boolean") {
      return `${field} must be a boolean`;
    }
  }
  return null;
}

function roomData(body) {
  const data = {};
  for (const field of ["roomNumber", "name", "type", "image", "description", "hasEnsuiteBathroom", "isBooked"]) {
    if (body[field] !== undefined) data[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
  }
  if (body.pricePerNight !== undefined) data.pricePerNight = Number(body.pricePerNight);
  return data;
}

async function listRooms(req, res) {
  const hasDates = req.query.checkIn !== undefined || req.query.checkOut !== undefined;
  const range = hasDates ? parseDateRange(req.query.checkIn, req.query.checkOut) : null;
  if (range?.error) return res.status(400).json({ error: range.error });

  const rooms = await prisma.room.findMany({ orderBy: { roomNumber: "asc" } });
  const roomIds = rooms.map((room) => room.id);
  const now = new Date();
  const activeBookings = await prisma.booking.findMany({
    where: { roomId: { in: roomIds }, status: { in: ["CONFIRMED", "CHECKED_IN"] }, checkIn: { lte: now }, checkOut: { gt: now } },
    select: { roomId: true },
  });
  const activeRoomIds = new Set(activeBookings.map((booking) => booking.roomId));
  let overlappingRoomIds = new Set();

  if (range) {
    const overlappingBookings = await prisma.booking.findMany({
      where: { roomId: { in: roomIds }, status: { in: ["CONFIRMED", "CHECKED_IN"] }, checkIn: { lt: range.checkOut }, checkOut: { gt: range.checkIn } },
      select: { roomId: true },
    });
    overlappingRoomIds = new Set(overlappingBookings.map((booking) => booking.roomId));
  }

  return res.json(rooms.map((room) => ({
    ...room,
    isBooked: room.isBooked || activeRoomIds.has(room.id),
    ...(range ? { isAvailableForDates: !room.isBooked && !overlappingRoomIds.has(room.id) } : {}),
  })));
}

async function getRoom(req, res) {
  const room = await prisma.room.findUnique({ where: { id: req.params.id } });
  if (!room) return res.status(404).json({ error: "Room not found" });
  return res.json(room);
}

async function createRoom(req, res) {
  const validationError = validateRoom(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  const data = roomData(req.body);
  const room = await prisma.room.create({ data });
  return res.status(201).json(room);
}

async function updateRoom(req, res) {
  const validationError = validateRoom(req.body, true);
  if (validationError) return res.status(400).json({ error: validationError });
  const room = await prisma.room.update({ where: { id: req.params.id }, data: roomData(req.body) });
  return res.json(room);
}

async function deleteRoom(req, res) {
  const booking = await prisma.booking.findFirst({ where: { roomId: req.params.id } });
  if (booking) return res.status(409).json({ error: "A room with booking history cannot be deleted" });
  await prisma.room.delete({ where: { id: req.params.id } });
  return res.status(204).end();
}

module.exports = { createRoom, deleteRoom, getRoom, listRooms, updateRoom };