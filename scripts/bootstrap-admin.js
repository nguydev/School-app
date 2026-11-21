const { randomBytes } = require('node:crypto');
const { z } = require('zod');
const env = require('../src/config/env');
const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const OtpChallenge = require('../src/modules/auth/otp-challenge.model');
const RefreshToken = require('../src/modules/auth/refresh-token.model');
const User = require('../src/modules/auth/user.model');
const { hashPassword } = require('../src/modules/auth/password');

const adminInput = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

async function bootstrapAdmin() {
  const parsed = adminInput.safeParse({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });

  if (!parsed.success) {
    throw new Error('Set a valid ADMIN_EMAIL and strong ADMIN_PASSWORD in the local .env file.');
  }

  await connectDatabase();
  const { email, password } = parsed.data;
  const now = new Date();
  const passwordHash = await hashPassword(password);
  const existingUser = await User.findOne({ email }).select('_id termsAcceptedAt');
  let user;

  if (existingUser) {
    await User.updateOne(
      { _id: existingUser._id },
      {
        $set: {
          role: 'admin',
          passwordHash,
          isEmailVerified: true,
          isActive: true,
          passwordChangedAt: now,
        },
      },
    );
    user = existingUser;
    await RefreshToken.updateMany(
      { userId: existingUser._id, revokedAt: null },
      { $set: { revokedAt: now } },
    );
  } else {
    user = await User.create({
      studentId: `ADM-${randomBytes(8).toString('hex').toUpperCase()}`,
      email,
      passwordHash,
      role: 'admin',
      fullName: 'School App Administrator',
      schoolName: 'School App',
      isEmailVerified: true,
      isActive: true,
      termsAcceptedAt: now,
    });
  }

  await OtpChallenge.deleteMany({ email });
  console.log(`Administrator account ready for ${email}.`);
}

bootstrapAdmin()
  .catch((error) => {
    console.error(`Administrator bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => {});
  });
