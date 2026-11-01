const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { createBooking, listBookings, listMyBookings, updateBookingConfirmation, updateBookingStatus } = require("../controllers/bookingController");
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, asyncHandler(createBooking));
router.get("/my", authMiddleware, asyncHandler(listMyBookings));
router.get("/my-bookings", authMiddleware, asyncHandler(listMyBookings));
router.get("/", authMiddleware, requireAdmin, asyncHandler(listBookings));
router.patch("/:id/status", authMiddleware, asyncHandler(updateBookingStatus));
router.patch("/:id/confirmation", authMiddleware, asyncHandler(updateBookingConfirmation));

module.exports = router;