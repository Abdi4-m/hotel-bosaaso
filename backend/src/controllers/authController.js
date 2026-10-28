const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

function publicUser(user) {
  const { password, adminSessionVersion, ...safeUser } = user;
  return safeUser;
}

function createToken(user) {
  const payload = {
    role: user.role,
    ...(user.role === "ADMIN" ? { adminSessionVersion: user.adminSessionVersion } : {}),
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: "7d",
  });
}

function validPasswordLength(password, role) {
  return role === "ADMIN"
    ? password.length >= 10
    : role === "USER" && password.length >= 8 && password.length <= 12;
}

async function signup(req, res) {
  const { name, email, password } = req.body;
  if (![name, email, password].every((value) => typeof value === "string" && value.trim())) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (!validPasswordLength(password, "USER")) {
    return res.status(400).json({ error: "Password must be between 8 and 12 characters" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });
  if (existingUser) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: "USER",
    },
  });

  return res.status(201).json({ user: publicUser(user), token: createToken(user) });
}

async function signin(req, res) {
  const { email, password } = req.body;
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });
  const passwordMatches = user ? await bcrypt.compare(password, user.password) : false;
  if (!passwordMatches || !validPasswordLength(password, user.role)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const authenticatedUser = user.role === "ADMIN"
    ? await prisma.user.update({
      where: { id: user.id },
      data: { adminSessionVersion: { increment: 1 } },
    })
    : user;

  return res.json({ user: publicUser(authenticatedUser), token: createToken(authenticatedUser) });
}

function getCurrentUser(req, res) {
  return res.json({ user: publicUser(req.user) });
}

async function logout(req, res) {
  if (req.user.role === "ADMIN") {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { adminSessionVersion: { increment: 1 } },
    });
  }
  return res.json({ message: "Logged out. Discard the bearer token on the client." });
}

module.exports = { getCurrentUser, logout, signin, signup };