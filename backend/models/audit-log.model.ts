import { model, Schema } from 'mongoose';

// Durable record of security-relevant administrative actions. Written by the
// audit helper (backend/lib/audit.ts) either inside the same MongoDB
// transaction as the mutation it describes (reliable tier) or as a surfaced
// best-effort diagnostic record (diagnostic tier). Never stores credentials
// or raw invitation tokens.
const auditLogSchema = new Schema(
  {
    _id: { type: String, required: true },
    actorId: { type: String, required: true },
    actorRole: {
      type: String,
      enum: ['CUSTOMER', 'VENDOR', 'ADMIN', 'MANAGER'],
      required: true,
    },
    action: { type: String, required: true },
    // Logical target type, for example "user", "invitation", or "product".
    targetType: { type: String, required: true },
    targetId: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

// Explicit, idempotent index declarations with createIndex semantics: they
// only create missing indexes and never drop or modify pre-existing ones.
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLogModel = model('AuditLog', auditLogSchema);
