const prisma = require("../lib/prisma");

function userError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(users);
}

async function deleteUser(req, res) {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(409).json({ error: "You cannot delete your own account" });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id },
        select: { id: true, role: true },
      });
      if (!user) throw userError("User not found", 404);

      if (user.role === "ADMIN") {
        const adminCount = await transaction.user.count({ where: { role: "ADMIN" } });
        if (adminCount <= 1) throw userError("The last administrator cannot be deleted", 409);
      }

      await transaction.booking.deleteMany({ where: { userId: id } });
      await transaction.order.deleteMany({ where: { userId: id } });
      await transaction.user.delete({ where: { id } });
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }

  return res.status(204).end();
}

module.exports = { deleteUser, listUsers };