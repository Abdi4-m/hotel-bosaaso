const cors = require("cors");
const express = require("express");

const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const foodRoutes = require("./routes/foodRoutes");
const messageRoutes = require("./routes/messageRoutes");
const orderRoutes = require("./routes/orderRoutes");
const roomRoutes = require("./routes/roomRoutes");
const userRoutes = require("./routes/userRoutes");
const { getOrderTaxRate } = require("./utils/orderTaxRate");
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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/config", (req, res) => {
  res.json({ orderTaxRate: getOrderTaxRate() });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;