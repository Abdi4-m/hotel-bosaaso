const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { createFood, deleteFood, getFood, listFoods, updateFood } = require("../controllers/foodController");
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();
const adminOnly = [authMiddleware, requireAdmin];

router.get("/", asyncHandler(listFoods));
router.get("/:id", asyncHandler(getFood));
router.post("/", ...adminOnly, asyncHandler(createFood));
router.put("/:id", ...adminOnly, asyncHandler(updateFood));
router.delete("/:id", ...adminOnly, asyncHandler(deleteFood));

module.exports = router;