import { Router } from "express";
import mongoose from "mongoose";

const healthRouter = Router();

/**
 * Checks the live MongoDB connection rather than only checking that
 * the HTTP process is running.
 */
healthRouter.get("/", async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      res.status(503).json({
        status: "error",
        service: "Rudin-Store API",
        database: "disconnected",
      });
      return;
    }

    await mongoose.connection.db.admin().ping();

    res.status(200).json({
      status: "ok",
      service: "Rudin-Store API",
      database: "connected",
    });
  } catch {
    res.status(503).json({
      status: "error",
      service: "Rudin-Store API",
      database: "unavailable",
    });
  }
});

export default healthRouter;
