const mongoose = require('mongoose');

const otpChallengeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: {
      type: String,
      required: true,
      enum: ['registration', 'password_reset'],
    },
    codeHash: { type: String, select: false },
    codeExpiresAt: { type: Date },
    attempts: { type: Number, required: true, default: 0 },
    resendAfter: { type: Date },
    verifiedAt: { type: Date },
    consumedAt: { type: Date },
    registration: {
      fullName: { type: String, trim: true, maxlength: 120 },
      schoolName: { type: String, trim: true, maxlength: 160 },
      passwordHash: { type: String, select: false },
      subject: { type: String, trim: true, maxlength: 120 },
      phoneNumber: { type: String, trim: true, maxlength: 24 },
      deviceId: { type: String, trim: true, maxlength: 128 },
      deviceName: { type: String, trim: true, maxlength: 128 },
    },
  },
  { timestamps: true, versionKey: false },
);

otpChallengeSchema.index({ email: 1, purpose: 1 }, { unique: true });
otpChallengeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('OtpChallenge', otpChallengeSchema);
