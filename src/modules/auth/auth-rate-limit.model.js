const mongoose = require('mongoose');

const authRateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

authRateLimitSchema.index({ key: 1, windowStart: 1 }, { unique: true });
authRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AuthRateLimit', authRateLimitSchema);
