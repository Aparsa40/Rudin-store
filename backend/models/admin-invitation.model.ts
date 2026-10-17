
import { model, Schema } from 'mongoose';

export const ADMIN_INVITATION_STATUSES = [
  'INVITED',
  'EMAIL_VERIFIED',
  'PENDING_APPROVAL',
  'ACTIVE',
  'REJECTED',
  'DISABLED',
] as const;

const adminInvitationSchema = new Schema(
  {
    _id: { type: String, required: true },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // Prevent duplicate in-progress invitations for the same normalized email.
    // This field must be unset when an invitation is approved or rejected.
    activeEmail: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    lastName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },

    // Resolved by the backend; never accept an effective permission list
    // from the invitee.
    adminPermissions: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ADMIN_INVITATION_STATUSES,
      required: true,
      default: 'INVITED',
      index: true,
    },

    // Only the SHA-256 digest of the raw invitation token is stored.
    tokenHash: {
      type: String,
      select: false,
      index: true,
    },

    tokenExpiresAt: {
      type: Date,
      select: false,
    },

    // The invitee chooses this password. Store only its password hash.
    // A User account is not created until Manager approval.
    passwordHash: {
      type: String,
      select: false,
    },

    createdBy: {
      type: String,
      required: true,
    },

    verifiedAt: {
      type: Date,
    },

    acceptedAt: {
      type: Date,
    },

    reviewedBy: {
      type: String,
    },

    reviewedAt: {
      type: Date,
    },

    rejectedReason: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

adminInvitationSchema.index({ status: 1, createdAt: -1 });

adminInvitationSchema.index(
  { tokenExpiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export const AdminInvitationModel = model(
  'AdminInvitation',
  adminInvitationSchema,
);
