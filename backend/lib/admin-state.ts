import mongoose, { model, Schema, type ClientSession } from "mongoose";

const adminStateSchema = new Schema(
  {
    _id: { type: String, required: true },
    revision: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

const AdminStateModel = model("AdminState", adminStateSchema);

/**
 * Serialize admin-critical operations through a shared write inside a MongoDB transaction.
 * Concurrent transactions conflict on this singleton document and MongoDB retries transient
 * transaction failures, so checks such as "last active admin" run against a serialized state.
 * Requires a MongoDB replica set or sharded cluster (Atlas supports transactions).
 */
export async function withAdminStateLock<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  let result: T;
  try {
    await session.withTransaction(async () => {
      await AdminStateModel.updateOne(
        { _id: "global-admin-state" },
        { $inc: { revision: 1 } },
        { upsert: true, session },
      );
      result = await operation(session);
    });
    return result!;
  } finally {
    await session.endSession();
  }
}
