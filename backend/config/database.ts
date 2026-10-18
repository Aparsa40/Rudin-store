import mongoose from 'mongoose';

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
      'MONGODB_URI is not defined. Create a local .env file from .env.example and add your MongoDB Atlas URI.',
    );
  }

  if (process.env.RUN_MONGODB_INTEGRATION === 'true') {
    const databaseName = uri.split('://')[1]?.split('/')[1]?.split('?')[0];
    // Integration suites may use the shared database or a dedicated derivation of it
    // (for example rudin_store_integration_test_orders) so parallel suites cannot wipe
    // each other's data. Any other database remains forbidden in integration mode.
    const isIntegrationDatabase =
      databaseName === 'rudin_store_integration_test' ||
      (databaseName ?? '').startsWith('rudin_store_integration_test_');
    if (!isIntegrationDatabase) {
      throw new Error(
        'MongoDB integration tests are restricted to the isolated rudin_store_integration_test database (or a dedicated derivation of it).',
      );
    }
  }

  await mongoose.connect(uri);

  console.log('MongoDB connected successfully.');
}

/**
 * Closes the shared Mongoose connection during graceful shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
