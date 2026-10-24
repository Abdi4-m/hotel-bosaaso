const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { getDashboardStats } = require("../controllers/adminController");
const { deleteUser } = require("../controllers/userController");
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireAdmin);
router.get("/stats", asyncHandler(getDashboardStats));
router.delete("/users/:id", asyncHandler(deleteUser));

module.exports = router;
