const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { deleteUser, listUsers } = require("../controllers/userController");
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, requireAdmin, asyncHandler(listUsers));
router.delete("/:id", authMiddleware, requireAdmin, asyncHandler(deleteUser));

module.exports = router;