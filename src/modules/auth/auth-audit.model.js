const mongoose = require('mongoose');

const authAuditSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: {
      type: String,
      required: true,
      enum: [
        'registration_started',
        'registration_completed',
        'password_reset_requested',
        'login_succeeded',
        'login_failed',
        'otp_verified',
        'password_reset',
        'token_refreshed',
        'refresh_reuse_detected',
        'logout',
      ],
    },
    ipHash: { type: String, maxlength: 64 },
    userAgent: { type: String, maxlength: 512 },
    requestId: { type: String, maxlength: 64 },
    success: { type: Boolean, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

authAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
authAuditSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AuthAudit', authAuditSchema);
