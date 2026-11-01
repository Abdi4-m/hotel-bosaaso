const cors = require("cors");
const express = require("express");

const adminRoutes = require("./routes/adminRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const foodRoutes = require("./routes/foodRoutes");
const messageRoutes = require("./routes/messageRoutes");
const orderRoutes = require("./routes/orderRoutes");
const roomRoutes = require("./routes/roomRoutes");
const userRoutes = require("./routes/userRoutes");
const { getOrderTaxRate } = require("./utils/orderTaxRate");
const prisma = require("./lib/prisma");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

const app = express();

const configuredOrigins = [
  ...(process.env.CORS_ORIGINS || "").split(","),
  process.env.FRONTEND_URL || "",
].map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = new Set(configuredOrigins.map((origin) => {
  try {
    return new URL(origin).origin;
  } catch {
    throw new Error(`Invalid CORS origin configured: ${origin}`);
  }
}));
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://127.0.0.1:5173");
}
if (process.env.NODE_ENV === "production" && allowedOrigins.size === 0) {
  throw new Error("Set FRONTEND_URL or CORS_ORIGINS before starting the production API");
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || req.path === "/api/analytics/page-views") {
    return next();
  }
  res.once("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    const actor = req.user ? `${req.user.name} (${req.user.email})` : "No client";
    prisma.activity.create({
      data: { actor: actor.slice(0, 200), action: `${req.method} ${req.path}`.slice(0, 300) },
    }).catch((error) => console.error("Failed to record website activity", error));
  });
  return next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/config", (req, res) => {
  res.json({ orderTaxRate: getOrderTaxRate() });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;