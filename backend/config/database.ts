import mongoose from "mongoose";

/**
 * Connects the backend to MongoDB Atlas.
 *
 * The connection URI is read only from the environment so credentials
 * never need to be committed to the repository.
 */
export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined. Create a local .env file from .env.example and add your MongoDB Atlas URI.",
    );
  }

  if (process.env.RUN_MONGODB_INTEGRATION === "true") {
    const databaseName = uri.split("://")[1]?.split("/")[1]?.split("?")[0];
    if (databaseName !== "rudin_store_integration_test") {
      throw new Error(
        "MongoDB integration tests are restricted to the isolated rudin_store_integration_test database.",
      );
    }
  }

  await mongoose.connect(uri);

  console.log("MongoDB connected successfully.");
}

/**
 * Closes the shared Mongoose connection during graceful shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
