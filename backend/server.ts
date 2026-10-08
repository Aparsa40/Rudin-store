import "dotenv/config";
import express from "express";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const webUrl = process.env.WEB_URL ?? "http://localhost:3000";

app.use(express.json());

// Minimal CORS configuration without adding another runtime dependency.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", webUrl);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Rudin-Store API",
    database: "mongodb",
  });
});

async function startServer(): Promise<void> {
  await connectDatabase();

  const server = app.listen(port, () => {
    console.log(`Rudin-Store API listening on http://localhost:${port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await disconnectDatabase();
        console.log("MongoDB connection closed.");
        process.exit(0);
      } catch (error) {
        console.error("Failed to close MongoDB connection cleanly:", error);
        process.exit(1);
      }
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("Failed to start Rudin-Store API:", error);
  process.exit(1);
});
