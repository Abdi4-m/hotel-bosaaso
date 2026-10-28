const prisma = require("../lib/prisma");
const { parseId } = require("../utils/parseId");

async function createMessage(req, res) {
  const { senderName, email, subject, message } = req.body;
  const values = { senderName, email, subject, message };
  for (const [field, value] of Object.entries(values)) {
    if (typeof value !== "string" || !value.trim()) {
      return res.status(400).json({ error: `${field} is required` });
    }
  }

  const savedMessage = await prisma.message.create({
    data: {
      senderName: senderName.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
    },
  });
  return res.status(201).json({ message: "Message received", data: savedMessage });
}

async function listMessages(req, res) {
  const messages = await prisma.message.findMany({ orderBy: { createdAt: "desc" } });
  return res.json(messages);
}

async function deleteMessage(req, res) {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "id must be a positive integer" });
  await prisma.message.delete({ where: { id } });
  return res.status(204).end();
}

module.exports = { createMessage, deleteMessage, listMessages };