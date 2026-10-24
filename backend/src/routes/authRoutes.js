const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { authMiddleware } = require("../middleware/authMiddleware");
const { getCurrentUser, logout, signin, signup } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", asyncHandler(signup));
router.post("/login", asyncHandler(signin));
router.post("/signin", asyncHandler(signin));
router.get("/me", authMiddleware, getCurrentUser);
router.post("/logout", logout);

module.exports = router;