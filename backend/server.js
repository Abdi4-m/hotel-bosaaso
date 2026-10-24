require("dotenv").config();

const app = require("./src/app");
const prisma = require("./src/lib/prisma");

const port = Number(process.env.PORT) || 4000;

async function startServer() {
  await prisma.$connect();

  const server = app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });

  server.on("error", async (error) => {
    console.error("API server failed to listen:", error);
    process.exitCode = 1;
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("Failed to disconnect Prisma after listen error:", disconnectError);
    }
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; closing API server`);
    server.close(async (error) => {
      if (error) {
        console.error("Failed to close API server cleanly:", error);
        process.exitCode = 1;
      }

      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error("Failed to disconnect from PostgreSQL cleanly:", disconnectError);
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch(async (error) => {
  console.error("Failed to connect to PostgreSQL; API server was not started:", error);
  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error("Failed to disconnect Prisma after startup error:", disconnectError);
  }
  process.exitCode = 1;
});