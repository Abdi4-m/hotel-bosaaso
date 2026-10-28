const prisma = require("../lib/prisma");
const { parseId } = require("../utils/parseId");

function validateFood(body, partial = false) {
  const fields = ["title", "description", "image"];
  for (const field of fields) {
    if ((!partial || body[field] !== undefined) && (typeof body[field] !== "string" || !body[field].trim())) {
      return `${field} must be a non-empty string`;
    }
  }
  if ((!partial || body.price !== undefined) && (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)) {
    return "price must be a non-negative number";
  }
  if (body.isAvailable !== undefined && typeof body.isAvailable !== "boolean") {
    return "isAvailable must be a boolean";
  }
  return null;
}

function foodData(body, partial = false) {
  const data = {};
  for (const field of ["title", "description", "image"]) {
    if (body[field] !== undefined) data[field] = body[field].trim();
  }
  if (body.price !== undefined) data.price = Number(body.price);
  if (body.isAvailable !== undefined) data.isAvailable = body.isAvailable;
  if (!partial && data.isAvailable === undefined) data.isAvailable = true;
  return data;
}

async function listFoods(req, res) {
  const foods = await prisma.food.findMany({ orderBy: { createdAt: "desc" } });
  return res.json(foods);
}

async function getFood(req, res) {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "id must be a positive integer" });
  const food = await prisma.food.findUnique({ where: { id } });
  if (!food) return res.status(404).json({ error: "Food not found" });
  return res.json(food);
}

async function createFood(req, res) {
  const validationError = validateFood(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  const food = await prisma.food.create({ data: foodData(req.body) });
  return res.status(201).json(food);
}

async function updateFood(req, res) {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "id must be a positive integer" });
  const validationError = validateFood(req.body, true);
  if (validationError) return res.status(400).json({ error: validationError });
  const food = await prisma.food.update({ where: { id }, data: foodData(req.body, true) });
  return res.json(food);
}

async function deleteFood(req, res) {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "id must be a positive integer" });
  await prisma.food.delete({ where: { id } });
  return res.status(204).end();
}

module.exports = { createFood, deleteFood, getFood, listFoods, updateFood };