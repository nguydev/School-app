const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, immutable: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      immutable: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    schoolName: { type: String, required: true, trim: true, maxlength: 160 },
    gradeClass: { type: String, trim: true, maxlength: 80 },
    stream: { type: String, trim: true, maxlength: 120 },
    phoneNumber: { type: String, trim: true, maxlength: 24 },
    profileImageUrl: { type: String, trim: true, maxlength: 2048 },
    isEmailVerified: { type: Boolean, required: true, default: false },
    isActive: { type: Boolean, required: true, default: true },
    termsAcceptedAt: { type: Date, required: true },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model('User', userSchema);
