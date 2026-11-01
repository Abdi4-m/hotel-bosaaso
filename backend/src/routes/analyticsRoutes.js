const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { recordPageView } = require("../controllers/analyticsController");
const { optionalAuthMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/page-views", optionalAuthMiddleware, asyncHandler(recordPageView));

module.exports = router;
