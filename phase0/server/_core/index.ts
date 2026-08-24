import { startApp } from "./app";
import { ENV } from "./env";

async function startServer() {
  const port = ENV.port;

  const server = await startApp((await import("express")).default());

  server.listen(port, () => {
    console.log(`[Phase 0] Server running on http://localhost:${port}/`);
  });

  const shutdown = () => {
    console.log("Shutting down gracefully...");
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => {
      console.error("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch(console.error);