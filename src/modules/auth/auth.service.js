const {
  randomBytes,
  randomUUID,
} = require('node:crypto');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../config/email');
const AuthAudit = require('./auth-audit.model');
const AuthRateLimit = require('./auth-rate-limit.model');
const OtpChallenge = require('./otp-challenge.model');
const RefreshToken = require('./refresh-token.model');
const User = require('./user.model');
const writeAuthAudit = require('./audit');
const { hashPassword, verifyPassword } = require('./password');
const { createOtp, hashOtp, matchesOtp } = require('./otp');
const {
  accessTokenLifetimeSeconds,
  createAccessToken,
  createRefreshToken,
  hashToken,
} = require('./token');

const dayMs = 24 * 60 * 60 * 1000;
const otpLifetimeMs = 10 * 60 * 1000;
const otpResendDelayMs = 60 * 1000;
const maxOtpAttempts = 5;
const invalidCredentials = () =>
  new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
const invalidOtp = () => new ApiError(400, 'Invalid or expired OTP code', 'INVALID_OTP');
const invalidRefreshToken = () =>
  new ApiError(401, 'Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');

let dummyPasswordHashPromise;

function getDummyPasswordHash() {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = hashPassword(randomBytes(32).toString('hex'));
  }
  return dummyPasswordHashPromise;
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    student_id: user.studentId,
    email: user.email,
    full_name: user.fullName,
    school_name: user.schoolName,
    grade_class: user.gradeClass,
    stream: user.stream,
    phone_number: user.phoneNumber,
    is_email_verified: user.isEmailVerified,
    profile_image_url: user.profileImageUrl,
    created_at: user.createdAt,
    last_login_at: user.lastLoginAt,
  };
}

async function createSession(user, device, rememberMe) {
  const now = new Date();
  const sessionExpiresAt = new Date(now.getTime() + (rememberMe ? 30 : 7) * dayMs);
  const sessionId = randomUUID();
  const refreshToken = createRefreshToken();

  await RefreshToken.create({
    userId: user._id,
    sessionId,
    currentTokenHash: hashToken(refreshToken),
    previousTokenHashes: [],
    deviceId: device.device_id,
    deviceName: device.device_name,
    expiresAt: sessionExpiresAt,
    revokedAt: null,
  });

  return {
    access_token: createAccessToken(user._id, sessionId),
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: accessTokenLifetimeSeconds,
  };
}

async function createOtpChallenge(email, purpose, registration) {
  emailService.assertConfigured();

  const now = new Date();
  const code = createOtp();
  const codeHash = hashOtp(email, purpose, code);
  const update = {
    $set: {
      codeHash,
      codeExpiresAt: new Date(now.getTime() + otpLifetimeMs),
      attempts: 0,
      resendAfter: new Date(now.getTime() + otpResendDelayMs),
      verifiedAt: null,
      consumedAt: null,
    },
    $setOnInsert: { email, purpose, createdAt: now },
  };

  if (registration) {
    update.$set.registration = registration;
  } else {
    update.$unset = { registration: 1 };
  }

  let challenge;
  try {
    challenge = await OtpChallenge.findOneAndUpdate(
      {
        email,
        purpose,
        $or: [{ resendAfter: { $lte: now } }, { resendAfter: { $exists: false } }],
      },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(429, 'Please wait before requesting another code', 'OTP_RATE_LIMITED');
    }
    throw error;
  }

  try {
    await emailService.sendOtp(email, code, purpose);
  } catch (error) {
    await OtpChallenge.updateOne(
      { _id: challenge._id, codeHash },
      { $set: { resendAfter: new Date(0) } },
    );
    throw error;
  }

  return challenge;
}

async function getVerifiedOtpChallenge(req, email, purpose, code) {
  const now = new Date();
  const challenge = await OtpChallenge.findOne({ email, purpose }).select(
    '+codeHash +registration.passwordHash',
  );

  if (
    !challenge ||
    !challenge.codeHash ||
    !challenge.codeExpiresAt ||
    challenge.codeExpiresAt <= now ||
    challenge.attempts >= maxOtpAttempts ||
    challenge.consumedAt
  ) {
    await writeAuthAudit(req, 'otp_verified', false);
    throw invalidOtp();
  }

  if (!matchesOtp(email, purpose, code, challenge.codeHash)) {
    await OtpChallenge.updateOne(
      {
        _id: challenge._id,
        codeHash: challenge.codeHash,
        codeExpiresAt: { $gt: now },
        attempts: { $lt: maxOtpAttempts },
      },
      { $inc: { attempts: 1 } },
    );
    await writeAuthAudit(req, 'otp_verified', false);
    throw invalidOtp();
  }

  return challenge;
}

async function startRegistration(req, input) {
  emailService.assertConfigured();
  const expiresAt = new Date(Date.now() + otpLifetimeMs);
  const existingUser = await User.exists({ email: input.email });

  if (!existingUser) {
    const passwordHash = await hashPassword(input.password);
    const challenge = await createOtpChallenge(input.email, 'registration', {
      fullName: input.full_name,
      schoolName: input.school_name,
      passwordHash,
      subject: input.subject,
      phoneNumber: input.number,
      deviceId: input.device_id,
      deviceName: input.device_name,
    });
    await writeAuthAudit(req, 'registration_started', true);
    return { email: input.email, otp_expires_at: challenge.codeExpiresAt };
  }

  await writeAuthAudit(req, 'registration_started', false);
  return { email: input.email, otp_expires_at: expiresAt };
}

async function verifyRegistrationOtp(req, input) {
  const challenge = await getVerifiedOtpChallenge(
    req,
    input.email,
    'registration',
    input.otp_code,
  );
  const registration = challenge.registration;
  if (
    !registration?.fullName ||
    !registration.schoolName ||
    !registration.passwordHash ||
    !registration.subject ||
    !registration.phoneNumber
  ) {
    await writeAuthAudit(req, 'otp_verified', false);
    throw invalidOtp();
  }

  const now = new Date();
  const claimed = await OtpChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      codeHash: challenge.codeHash,
      codeExpiresAt: { $gt: now },
      attempts: { $lt: maxOtpAttempts },
      consumedAt: null,
    },
    {
      $set: {
        consumedAt: now,
        verifiedAt: now,
      },
      $unset: { codeHash: 1 },
    },
    { new: true },
  );

  if (!claimed) {
    await writeAuthAudit(req, 'otp_verified', false);
    throw invalidOtp();
  }

  let user;
  try {
    user = await User.create({
      studentId: `STU-${randomBytes(6).toString('hex').toUpperCase()}`,
      email: claimed.email,
      passwordHash: registration.passwordHash,
      fullName: registration.fullName,
      schoolName: registration.schoolName,
      stream: registration.subject,
      phoneNumber: registration.phoneNumber,
      isEmailVerified: true,
      isActive: true,
      termsAcceptedAt: now,
      lastLoginAt: now,
    });
  } catch (error) {
    if (error.code !== 11000) {
      await OtpChallenge.updateOne(
        { _id: claimed._id, consumedAt: now },
        {
          $set: {
            consumedAt: null,
            codeHash: hashOtp(input.email, 'registration', input.otp_code),
          },
        },
      );
    }
    throw error;
  }

  const tokens = await createSession(
    user,
    { device_id: registration.deviceId, device_name: registration.deviceName },
    false,
  );
  await OtpChallenge.deleteOne({ _id: claimed._id });
  await writeAuthAudit(req, 'otp_verified', true, user._id);
  await writeAuthAudit(req, 'registration_completed', true, user._id);

  return { user: publicUser(user), tokens };
}

async function login(req, input) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  const passwordHash = user?.passwordHash || (await getDummyPasswordHash());
  const passwordMatches = await verifyPassword(input.password, passwordHash);

  if (!user || !passwordMatches || !user.isEmailVerified || !user.isActive) {
    await writeAuthAudit(req, 'login_failed', false, user?._id);
    throw invalidCredentials();
  }

  const now = new Date();
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: now } });
  user.lastLoginAt = now;
  const tokens = await createSession(user, input, input.remember_me);
  await writeAuthAudit(req, 'login_succeeded', true, user._id);

  return { user: publicUser(user), tokens };
}

async function refreshSession(req, rawToken) {
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const session = await RefreshToken.findOne({
    currentTokenHash: tokenHash,
    revokedAt: null,
    expiresAt: { $gt: now },
  }).select('+currentTokenHash');

  if (!session) {
    const reusedSession = await RefreshToken.findOne({
      previousTokenHashes: tokenHash,
      revokedAt: null,
    });

    if (reusedSession) {
      await RefreshToken.updateOne(
        { _id: reusedSession._id, revokedAt: null },
        { $set: { revokedAt: now } },
      );
      await writeAuthAudit(req, 'refresh_reuse_detected', false, reusedSession.userId);
    }

    throw invalidRefreshToken();
  }

  const user = await User.findById(session.userId);
  if (!user || !user.isActive || !user.isEmailVerified) {
    await RefreshToken.updateOne({ _id: session._id }, { $set: { revokedAt: now } });
    throw invalidRefreshToken();
  }

  const nextToken = createRefreshToken();
  const nextTokenHash = hashToken(nextToken);
  const rotated = await RefreshToken.findOneAndUpdate(
    {
      _id: session._id,
      currentTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: { currentTokenHash: nextTokenHash },
      $push: { previousTokenHashes: tokenHash },
    },
    { new: true },
  );

  if (!rotated) {
    const reusedSession = await RefreshToken.findOneAndUpdate(
      { _id: session._id, previousTokenHashes: tokenHash, revokedAt: null },
      { $set: { revokedAt: now } },
      { new: true },
    );
    if (reusedSession) {
      await writeAuthAudit(req, 'refresh_reuse_detected', false, reusedSession.userId);
    }
    throw invalidRefreshToken();
  }

  await writeAuthAudit(req, 'token_refreshed', true, user._id);
  return {
    access_token: createAccessToken(user._id, rotated.sessionId),
    refresh_token: nextToken,
    token_type: 'Bearer',
    expires_in: accessTokenLifetimeSeconds,
  };
}

async function logout(req, rawToken) {
  const tokenHash = hashToken(rawToken);
  const session = await RefreshToken.findOne({
    $or: [{ currentTokenHash: tokenHash }, { previousTokenHashes: tokenHash }],
  });

  if (session && !session.revokedAt) {
    await RefreshToken.updateOne(
      { _id: session._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    await writeAuthAudit(req, 'logout', true, session.userId);
  }
}

async function requestPasswordReset(req, email) {
  emailService.assertConfigured();
  const expiresAt = new Date(Date.now() + otpLifetimeMs);
  const user = await User.findOne({ email }).select('_id');

  if (user) {
    const challenge = await createOtpChallenge(email, 'password_reset');
    await writeAuthAudit(req, 'password_reset_requested', true, user._id);
    return { email, expires_at: challenge.codeExpiresAt };
  }

  await writeAuthAudit(req, 'password_reset_requested', false);
  return { email, expires_at: expiresAt };
}

async function resendOtp(req, input) {
  emailService.assertConfigured();
  const purpose = input.purpose === 'email_verification' ? 'registration' : 'password_reset';
  const user = await User.findOne({ email: input.email }).select('_id');
  const challenge = await OtpChallenge.findOne({ email: input.email, purpose }).select(
    '+registration.passwordHash',
  );
  const pendingRegistration = Boolean(
    challenge?.registration?.fullName &&
      challenge.registration.schoolName &&
      challenge.registration.passwordHash &&
      challenge.registration.subject &&
      challenge.registration.phoneNumber,
  );

  if (
    purpose === 'registration'
      ? !user && pendingRegistration
      : Boolean(user)
  ) {
    const nextChallenge = await createOtpChallenge(
      input.email,
      purpose,
      pendingRegistration ? challenge.registration : undefined,
    );
    await writeAuthAudit(
      req,
      purpose === 'registration' ? 'registration_started' : 'password_reset_requested',
      true,
      user?._id,
    );
    return {
      expires_at: nextChallenge.codeExpiresAt,
      can_resend_at: nextChallenge.resendAfter,
    };
  }

  const now = new Date();
  await writeAuthAudit(
    req,
    purpose === 'registration' ? 'registration_started' : 'password_reset_requested',
    false,
    user?._id,
  );
  return {
    expires_at: new Date(now.getTime() + otpLifetimeMs),
    can_resend_at: new Date(now.getTime() + otpResendDelayMs),
  };
}

async function resetPassword(req, input) {
  const challenge = await getVerifiedOtpChallenge(
    req,
    input.email,
    'password_reset',
    input.otp_code,
  );
  const passwordHash = await hashPassword(input.new_password);
  const now = new Date();
  const claimed = await OtpChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      codeHash: challenge.codeHash,
      codeExpiresAt: { $gt: now },
      attempts: { $lt: maxOtpAttempts },
      consumedAt: null,
    },
    {
      $set: { consumedAt: now },
      $unset: { codeHash: 1 },
    },
    { new: true },
  );

  if (!claimed) {
    throw invalidOtp();
  }

  const user = await User.findOneAndUpdate(
    { email: input.email, isActive: true },
    { $set: { passwordHash, passwordChangedAt: now } },
    { new: true },
  ).select('_id email');

  if (!user) {
    throw invalidOtp();
  }

  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: now } },
  );
  await OtpChallenge.deleteOne({ _id: claimed._id });
  await writeAuthAudit(req, 'password_reset', true, user._id);

  return { id: user._id.toString(), email: user.email };
}

async function ensureAuthIndexes() {
  await Promise.all([
    getDummyPasswordHash(),
    User.createIndexes(),
    OtpChallenge.createIndexes(),
    RefreshToken.createIndexes(),
    AuthAudit.createIndexes(),
    AuthRateLimit.createIndexes(),
  ]);
}

module.exports = {
  startRegistration,
  verifyRegistrationOtp,
  login,
  refreshSession,
  logout,
  requestPasswordReset,
  resendOtp,
  resetPassword,
  publicUser,
  ensureAuthIndexes,
};
