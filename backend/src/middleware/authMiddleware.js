const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authorization = req.get("authorization");
  const [scheme, token] = authorization ? authorization.split(" ") : [];

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user || user.role !== payload.role) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = user;
  return next();
});

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }

  return next();
};

module.exports = { authMiddleware, requireAdmin };