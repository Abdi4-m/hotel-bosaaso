const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { createRoom, deleteRoom, getRoom, listRooms, updateRoom } = require("../controllers/roomController");
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();
const adminOnly = [authMiddleware, requireAdmin];

router.get("/", asyncHandler(listRooms));
router.get("/:id", asyncHandler(getRoom));
router.post("/", ...adminOnly, asyncHandler(createRoom));
router.put("/:id", ...adminOnly, asyncHandler(updateRoom));
router.delete("/:id", ...adminOnly, asyncHandler(deleteRoom));

module.exports = router;