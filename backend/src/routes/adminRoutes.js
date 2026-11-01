const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { getDashboardStats } = require("../controllers/adminController");
const { getAnalyticsReport, listActivity, listPageViews } = require("../controllers/analyticsController");
const { deleteBooking } = require("../controllers/bookingController");
const { deleteOrder } = require("../controllers/orderController");
const { deleteUser } = require("../controllers/userController");
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireAdmin);
router.get("/stats", asyncHandler(getDashboardStats));
router.get("/activity", asyncHandler(listActivity));
router.get("/analytics", asyncHandler(getAnalyticsReport));
router.get("/page-views", asyncHandler(listPageViews));
router.delete("/bookings/:id", asyncHandler(deleteBooking));
router.delete("/orders/:id", asyncHandler(deleteOrder));
router.delete("/users/:id", asyncHandler(deleteUser));

module.exports = router;
