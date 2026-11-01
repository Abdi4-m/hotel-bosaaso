const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { createOrder, deleteOrder, listMyOrders, listOrders, updateOrderConfirmation, updateOrderStatus } = require("../controllers/orderController");
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, asyncHandler(createOrder));
router.get("/my", authMiddleware, asyncHandler(listMyOrders));
router.get("/", authMiddleware, requireAdmin, asyncHandler(listOrders));
router.delete("/:id", authMiddleware, asyncHandler(deleteOrder));
router.patch("/:id/status", authMiddleware, requireAdmin, asyncHandler(updateOrderStatus));
router.patch("/:id/confirmation", authMiddleware, asyncHandler(updateOrderConfirmation));

module.exports = router;