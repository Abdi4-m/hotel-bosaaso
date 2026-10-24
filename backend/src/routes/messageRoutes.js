const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { createMessage, deleteMessage, listMessages } = require("../controllers/messageController");
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", asyncHandler(createMessage));
router.get("/", authMiddleware, requireAdmin, asyncHandler(listMessages));
router.delete("/:id", authMiddleware, requireAdmin, asyncHandler(deleteMessage));

module.exports = router;