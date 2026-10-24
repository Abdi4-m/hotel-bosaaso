const prisma = require("../lib/prisma");
const { getOrderTaxRate } = require("../utils/orderTaxRate");

const DELIVERY_TYPES = new Set(["HOME_DELIVERY", "ROOM_DELIVERY"]);
const ORDER_STATUSES = new Set(["PENDING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]);

async function createOrder(req, res) {
  const body = req.body || {};
  const { items, notes, deliveryType, customerName, city, neighborhood, address, roomNumber, phone } = body;
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    return res.status(400).json({ error: "Add between 1 and 100 menu items" });
  }
  if (notes !== undefined && (typeof notes !== "string" || notes.length > 500)) {
    return res.status(400).json({ error: "Order notes must be 500 characters or fewer" });
  }
  if (!DELIVERY_TYPES.has(deliveryType)) {
    return res.status(400).json({ error: "Choose home delivery or room delivery" });
  }
  for (const [field, value] of Object.entries({ customerName, phone })) {
    if (typeof value !== "string" || !value.trim()) return res.status(400).json({ error: `${field} is required` });
  }
  const fieldLimits = { customerName: 120, phone: 40, city: 120, neighborhood: 120, address: 250, roomNumber: 32 };
  for (const [field, limit] of Object.entries(fieldLimits)) {
    const value = body[field];
    if (value !== undefined && (typeof value !== "string" || value.trim().length > limit)) {
      return res.status(400).json({ error: `${field} must be a text value of ${limit} characters or fewer` });
    }
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 20) {
    return res.status(400).json({ error: "Enter a valid phone number" });
  }
  if (deliveryType === "HOME_DELIVERY") {
    for (const [field, value] of Object.entries({ city, neighborhood, address })) {
      if (typeof value !== "string" || !value.trim()) return res.status(400).json({ error: `${field} is required for home delivery` });
    }
  } else if (typeof roomNumber !== "string" || !roomNumber.trim()) {
    return res.status(400).json({ error: "roomNumber is required for room delivery" });
  }
  if (deliveryType === "ROOM_DELIVERY") {
    const room = await prisma.room.findUnique({
      where: { roomNumber: roomNumber.trim() },
      select: { id: true },
    });
    if (!room) return res.status(400).json({ error: "Select a room number that exists in the hotel" });
  }

  const quantities = new Map();
  for (const item of items) {
    if (!item || typeof item.foodId !== "string" || !item.foodId.trim() || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      return res.status(400).json({ error: "Each item needs a foodId and a whole-number quantity between 1 and 99" });
    }
    const quantity = (quantities.get(item.foodId) || 0) + item.quantity;
    if (!Number.isSafeInteger(quantity) || quantity > 99) {
      return res.status(400).json({ error: "An item's combined quantity cannot exceed 99" });
    }
    quantities.set(item.foodId, quantity);
  }

  const foods = await prisma.food.findMany({
    where: { id: { in: [...quantities.keys()] }, isAvailable: true },
  });
  if (foods.length !== quantities.size) {
    return res.status(400).json({ error: "One or more menu items are unavailable. Refresh the menu and try again." });
  }

  const foodById = new Map(foods.map((food) => [food.id, food]));
  const orderItems = [...quantities].map(([foodId, quantity]) => {
    const food = foodById.get(foodId);
    return {
      foodId,
      title: food.title,
      image: food.image,
      priceAtPurchase: food.price,
      quantity,
    };
  });
  const subtotal = Number(orderItems.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0).toFixed(2));
  const taxRate = getOrderTaxRate();
  const taxAmount = Number((subtotal * taxRate).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));

  const order = await prisma.order.create({
    data: {
      userId: req.user.id,
      deliveryType,
      customerName: customerName.trim(),
      city: deliveryType === "HOME_DELIVERY" ? city.trim() : null,
      neighborhood: deliveryType === "HOME_DELIVERY" ? neighborhood.trim() : null,
      address: deliveryType === "HOME_DELIVERY" ? address.trim() : null,
      roomNumber: deliveryType === "ROOM_DELIVERY" ? roomNumber.trim() : null,
      phone: phone.trim(),
      subtotal,
      taxAmount,
      totalAmount,
      notes: notes?.trim() || null,
      status: "PENDING",
      paymentStatus: "UNPAID",
      items: { create: orderItems },
    },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return res.status(201).json(order);
}

async function listMyOrders(req, res) {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { orderDate: "desc" },
  });
  return res.json(orders);
}

async function listOrders(req, res) {
  const orders = await prisma.order.findMany({
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { orderDate: "desc" },
  });
  return res.json(orders);
}

async function updateOrderStatus(req, res) {
  const { status } = req.body || {};
  if (!ORDER_STATUSES.has(status)) {
    return res.status(400).json({ error: "Status must be PENDING, OUT_FOR_DELIVERY, DELIVERED, or CANCELLED" });
  }
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
    include: { items: true, user: { select: { id: true, name: true, email: true } } },
  });
  return res.json(order);
}

async function deleteOrder(req, res) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    select: { id: true, userId: true, status: true },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.userId !== req.user?.id && req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "You are not authorized to delete this order" });
  }
  if (order.status !== "PENDING") {
    return res.status(400).json({ error: "Only pending orders can be deleted" });
  }

  const { count } = await prisma.order.deleteMany({
    where: { id: order.id, status: "PENDING" },
  });
  if (!count) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: { id: true },
    });
    if (!existingOrder) return res.status(404).json({ error: "Order not found" });
    return res.status(400).json({ error: "Only pending orders can be deleted" });
  }
  return res.status(204).end();
}

module.exports = { createOrder, listMyOrders, listOrders, updateOrderStatus, deleteOrder };