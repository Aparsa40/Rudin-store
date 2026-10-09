import "dotenv/config";
import express from "express";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import healthRouter from "./routes/health.routes.js";
import productsRouter from "./routes/products.routes.js";
import authRouter from "./routes/auth.routes.js";
import adminRouter from "./routes/admin.routes.js";
import { createRateLimiter } from "./middleware/rate-limit.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const webUrl = process.env.WEB_URL ?? "http://localhost:3000";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}
if (process.env.NODE_ENV === "production" && (!process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET.length < 32)) {
  throw new Error("AUTH_TOKEN_SECRET must be set to a random secret of at least 32 characters in production.");
}

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", webUrl);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Bootstrap-Secret");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use("/api/health", healthRouter);
app.use("/api/auth/login", createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: "Too many login attempts. Please try again in 15 minutes." }));
app.use("/api/auth/register", createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 8, message: "Too many registration attempts. Please try again later." }));
app.use("/api/auth/bootstrap-admin", createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5, message: "Too many bootstrap attempts. Please try again later." }));
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/products", productsRouter);
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer(): Promise<void> {
  await connectDatabase();
  const server = app.listen(port, () => console.log(`Rudin-Store API listening on http://localhost:${port}`));
  let isShuttingDown = false;
  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      void disconnectDatabase().then(() => {
        console.log("MongoDB connection closed.");
        process.exit(0);
      }).catch((error: unknown) => {
        console.error("Failed to close MongoDB connection cleanly:", error);
        process.exit(1);
      });
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error: unknown) => {
  console.error("Failed to start Rudin-Store API:", error);
  process.exit(1);
});
