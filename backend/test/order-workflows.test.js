const assert = require("node:assert/strict");
const test = require("node:test");
const prisma = require("../src/lib/prisma");
const { createOrder, deleteOrder } = require("../src/controllers/orderController");

function response() {
  return {
    statusCode: 200,
    body: undefined,
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

function mockOrder(t, order) {
  const originalFindUnique = prisma.order.findUnique;
  const originalDeleteMany = prisma.order.deleteMany;
  let deleteCalls = 0;
  prisma.order.findUnique = async () => order;
  prisma.order.deleteMany = async () => {
    deleteCalls += 1;
    return { count: 1 };
  };
  t.after(() => {
    prisma.order.findUnique = originalFindUnique;
    prisma.order.deleteMany = originalDeleteMany;
  });
  return () => deleteCalls;
}

test("order creation persists the unified address field", async (t) => {
  const originalFindMany = prisma.food.findMany;
  const originalCreate = prisma.order.create;
  let createdData;
  prisma.food.findMany = async () => [{ id: "food-1", title: "Soup", image: "soup.jpg", price: 8 }];
  prisma.order.create = async ({ data }) => {
    createdData = data;
    return { id: "order-1", ...data };
  };
  t.after(() => {
    prisma.food.findMany = originalFindMany;
    prisma.order.create = originalCreate;
  });
  const res = response();

  await createOrder({
    body: {
      items: [{ foodId: "food-1", quantity: 1 }],
      deliveryType: "HOME_DELIVERY",
      customerName: "Guest",
      phone: "0907878147",
      city: "Bosaso",
      neighborhood: "Area 1",
      address: "Main Street",
    },
    user: { id: "user-1" },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.address, "Main Street");
  assert.equal(Object.hasOwn(createdData, "streetAddress"), false);
});

test("an order owner can delete their pending order", async (t) => {
  const deleteCalls = mockOrder(t, { id: "order-1", userId: "user-1", status: "PENDING" });
  const res = response();

  await deleteOrder({ params: { id: "order-1" }, user: { id: "user-1", role: "USER" } }, res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.equal(deleteCalls(), 1);
});

test("a non-owner cannot delete another user's order", async (t) => {
  const deleteCalls = mockOrder(t, { id: "order-1", userId: "owner-1", status: "PENDING" });
  const res = response();

  await deleteOrder({ params: { id: "order-1" }, user: { id: "user-2", role: "USER" } }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "You are not authorized to delete this order");
  assert.equal(deleteCalls(), 0);
});

test("an administrator can delete another user's order", async (t) => {
  const deleteCalls = mockOrder(t, { id: "order-1", userId: "owner-1", status: "PENDING" });
  const res = response();

  await deleteOrder({ params: { id: "order-1" }, user: { id: "admin-1", role: "ADMIN" } }, res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.equal(deleteCalls(), 1);
});

test("deleting an unknown order returns not found", async (t) => {
  const deleteCalls = mockOrder(t, null);
  const res = response();

  await deleteOrder({ params: { id: "missing-order" }, user: { id: "admin-1", role: "ADMIN" } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, "Order not found");
  assert.equal(deleteCalls(), 0);
});

for (const status of ["OUT_FOR_DELIVERY", "DELIVERED", "PROCESSING", "CONFIRMED", "CANCELLED"]) {
  test(`a ${status} order cannot be deleted`, async (t) => {
    const deleteCalls = mockOrder(t, { id: "order-1", userId: "user-1", status });
    const res = response();

    await deleteOrder({ params: { id: "order-1" }, user: { id: "user-1", role: "USER" } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "Only pending orders can be deleted");
    assert.equal(deleteCalls(), 0);
  });
}

test("an administrator cannot delete a delivered order", async (t) => {
  const deleteCalls = mockOrder(t, { id: "order-1", userId: "user-1", status: "DELIVERED" });
  const res = response();

  await deleteOrder({ params: { id: "order-1" }, user: { id: "admin-1", role: "ADMIN" } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Only pending orders can be deleted");
  assert.equal(deleteCalls(), 0);
});

test("room delivery rejects a room number that does not exist", async (t) => {
  const originalRoomFindUnique = prisma.room.findUnique;
  const originalFoodFindMany = prisma.food.findMany;
  let foodLookupCalled = false;
  prisma.room.findUnique = async () => null;
  prisma.food.findMany = async () => {
    foodLookupCalled = true;
    return [];
  };
  t.after(() => {
    prisma.room.findUnique = originalRoomFindUnique;
    prisma.food.findMany = originalFoodFindMany;
  });
  const res = response();

  await createOrder({
    body: {
      items: [{ foodId: "food-1", quantity: 1 }],
      deliveryType: "ROOM_DELIVERY",
      customerName: "Guest",
      phone: "0907878147",
      roomNumber: "055566",
    },
    user: { id: "user-1" },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Select a room number that exists in the hotel");
  assert.equal(foodLookupCalled, false);
});

test("room delivery accepts a room number found in the database", async (t) => {
  const originalRoomFindUnique = prisma.room.findUnique;
  const originalFoodFindMany = prisma.food.findMany;
  const originalOrderCreate = prisma.order.create;
  let createdData;
  prisma.room.findUnique = async ({ where }) => {
    assert.deepEqual(where, { roomNumber: "201" });
    return { id: "room-1" };
  };
  prisma.food.findMany = async () => [{ id: "food-1", title: "Soup", image: "soup.jpg", price: 8 }];
  prisma.order.create = async ({ data }) => {
    createdData = data;
    return { id: "order-1", ...data };
  };
  t.after(() => {
    prisma.room.findUnique = originalRoomFindUnique;
    prisma.food.findMany = originalFoodFindMany;
    prisma.order.create = originalOrderCreate;
  });
  const res = response();

  await createOrder({
    body: {
      items: [{ foodId: "food-1", quantity: 1 }],
      deliveryType: "ROOM_DELIVERY",
      customerName: "Guest",
      phone: "0907878147",
      roomNumber: " 201 ",
    },
    user: { id: "user-1" },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.roomNumber, "201");
});
