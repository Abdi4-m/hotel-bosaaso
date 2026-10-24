const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

function publicUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function createToken(user) {
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: user.id,
    expiresIn: "7d",
  });
}

async function signup(req, res) {
  const { name, email, password } = req.body;
  if (![name, email, password].every((value) => typeof value === "string" && value.trim())) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
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
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  return res.json({ user: publicUser(user), token: createToken(user) });
}

function getCurrentUser(req, res) {
  return res.json({ user: req.user });
}

function logout(req, res) {
  return res.json({ message: "Logged out. Discard the bearer token on the client." });
}

module.exports = { getCurrentUser, logout, signin, signup };