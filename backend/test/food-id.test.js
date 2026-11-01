const assert = require("node:assert/strict");
const test = require("node:test");
const prisma = require("../src/lib/prisma");
const { createFood, deleteFood, getFood, listFoods, updateFood } = require("../src/controllers/foodController");

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

test("food routes convert string route IDs to integers before Prisma queries", async (t) => {
  const originalFindUnique = prisma.food.findUnique;
  const originalUpdate = prisma.food.update;
  const originalDelete = prisma.food.delete;
  const receivedIds = [];
  prisma.food.findUnique = async ({ where }) => {
    receivedIds.push(where.id);
    return { id: where.id };
  };
  prisma.food.update = async ({ where, data }) => {
    receivedIds.push(where.id);
    return { id: where.id, ...data };
  };
  prisma.food.delete = async ({ where }) => {
    receivedIds.push(where.id);
  };
  t.after(() => {
    prisma.food.findUnique = originalFindUnique;
    prisma.food.update = originalUpdate;
    prisma.food.delete = originalDelete;
  });

  const getResponse = response();
  await getFood({ params: { id: "3" } }, getResponse);
  const updateResponse = response();
  await updateFood({ params: { id: "3" }, body: { title: "Updated" } }, updateResponse);
  const deleteResponse = response();
  await deleteFood({ params: { id: "3" } }, deleteResponse);

  assert.deepEqual(receivedIds, [3, 3, 3]);
  assert.equal(getResponse.statusCode, 200);
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(deleteResponse.statusCode, 204);
  assert.equal(deleteResponse.ended, true);
});

test("food routes reject invalid IDs before querying Prisma", async (t) => {
  const originalFindUnique = prisma.food.findUnique;
  let queried = false;
  prisma.food.findUnique = async () => {
    queried = true;
  };
  t.after(() => {
    prisma.food.findUnique = originalFindUnique;
  });

  const res = response();
  await getFood({ params: { id: "3abc" } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(queried, false);
});

test("food categories accept only the three supported exact values", async (t) => {
  const originalCreate = prisma.food.create;
  let createdData;
  prisma.food.create = async ({ data }) => {
    createdData = data;
    return data;
  };
  t.after(() => {
    prisma.food.create = originalCreate;
  });

  const invalidResponse = response();
  await createFood({
    body: { title: "Lunch special", description: "Dish", image: "dish.jpg", price: 10, category: "Lunch special" },
  }, invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(createdData, undefined);

  const validResponse = response();
  await createFood({
    body: { title: "Soup", description: "Dish", image: "dish.jpg", price: 10, category: " lunch " },
  }, validResponse);
  assert.equal(validResponse.statusCode, 201);
  assert.equal(createdData.category, "LUNCH");
});

test("food list category queries match the exact category or exact title", async (t) => {
  const originalFindMany = prisma.food.findMany;
  let receivedQuery;
  prisma.food.findMany = async (query) => {
    receivedQuery = query;
    return [];
  };
  t.after(() => {
    prisma.food.findMany = originalFindMany;
  });

  const res = response();
  await listFoods({ query: { category: "Breakfast" } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(receivedQuery.where, {
    OR: [
      { category: { equals: "BREAKFAST" } },
      { title: { equals: "Breakfast", mode: "insensitive" } },
    ],
  });
});
