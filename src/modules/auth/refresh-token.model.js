const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String, required: true, unique: true },
    currentTokenHash: { type: String, required: true, unique: true, select: false },
    previousTokenHashes: { type: [String], default: [], select: false },
    deviceId: { type: String, trim: true, maxlength: 128 },
    deviceName: { type: String, trim: true, maxlength: 128 },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ previousTokenHashes: 1 });
refreshTokenSchema.index({ userId: 1, revokedAt: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
