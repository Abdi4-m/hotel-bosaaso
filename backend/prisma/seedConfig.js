function getAdminCredentials(env = process.env) {
  const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = env.ADMIN_PASSWORD;

  if (!adminEmail || typeof adminPassword !== "string" || adminPassword.length < 12) {
    throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters before running the seed");
  }

  return { adminEmail, adminPassword };
}

module.exports = { getAdminCredentials };
