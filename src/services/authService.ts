import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { sendMail } from "./mailer";
import {
  createEmailVerificationToken,
  createRefreshToken,
  deleteEmailVerificationToken,
  deleteEmailVerificationTokensForUser,
  getEmailVerificationToken,
  getRefreshToken,
  revokeRefreshToken,
} from "../repositories/tokenRepository";
import {
  createLocalUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  markEmailVerified,
  updatePasswordHash,
  UserRecord,
} from "../repositories/userRepository";

const refreshDays = 30;

/**
 * Whether users must confirm their email before they can log in.
 * Controlled by REQUIRE_EMAIL_VERIFICATION; defaults to true in production.
 * Locally you can set it to "false" to skip verification while testing.
 */
export function isEmailVerificationRequired(): boolean {
  const explicit = process.env.REQUIRE_EMAIL_VERIFICATION;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return env.nodeEnv === "production";
}

function shouldAutoVerify(): boolean {
  return !isEmailVerificationRequired();
}

async function sendVerificationEmail(email: string, verifyUrl: string): Promise<void> {
  try {
    await sendMail({
      to: email,
      subject: "Xác nhận email RoomMate",
      html: `<p>Nhấn vào liên kết để xác nhận email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
  } catch (error) {
    console.error("Verification email failed (non-fatal):", error);
  }
}

function signAccessToken(user: UserRecord) {
  return jwt.sign(
    { sub: user.id, email: user.email, roleId: user.role_id },
    env.jwtSecret,
    { expiresIn: "120m" }
  );
}

function signRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function isStrongPassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

export async function registerLocal(params: {
  email: string;
  password: string;
  fullName: string;
  username?: string | null;
}) {
  const existing = await findUserByEmail(params.email);
  if (existing) {
    if (existing.is_email_verified) {
      throw new Error("EMAIL_EXISTS");
    }

    await deleteEmailVerificationTokensForUser(existing.id);
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await createEmailVerificationToken(existing.id, token, expiresAt);

    if (shouldAutoVerify()) {
      await markEmailVerified(existing.id);
    }

    const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;
    await sendVerificationEmail(params.email, verifyUrl);

    return { userId: existing.id, resent: true };
  }

  const passwordHash = await bcrypt.hash(params.password, 10);

  if (params.username) {
    const existingUsername = await findUserByUsername(params.username);
    if (existingUsername) {
      throw new Error("USERNAME_EXISTS");
    }
  }

  const user = await createLocalUser({
    email: params.email,
    passwordHash,
    fullName: params.fullName,
    username: params.username || null,
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await createEmailVerificationToken(user.id, token, expiresAt);

  // Auto-verify only when email verification is not required.
  if (shouldAutoVerify()) {
    await markEmailVerified(user.id);
  }

  const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;
  await sendVerificationEmail(params.email, verifyUrl);

  return { userId: user.id, resent: false };
}

export async function verifyEmail(token: string) {
  const record = await getEmailVerificationToken(token);
  if (!record) {
    throw new Error("TOKEN_INVALID");
  }
  const user = await findUserById(record.user_id);
  if (user?.is_email_verified) {
    await deleteEmailVerificationToken(token);
    return { status: "ALREADY_VERIFIED" as const };
  }
  if (new Date(record.expires_at) < new Date()) {
    await deleteEmailVerificationToken(token);
    throw new Error("TOKEN_EXPIRED");
  }
  await markEmailVerified(record.user_id);
  // Consume the token so it cannot be reused.
  await deleteEmailVerificationToken(token);
  return { status: "VERIFIED" as const };
}

export async function loginLocal(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.is_active) {
    throw new Error("ACCOUNT_INACTIVE");
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.is_email_verified) {
    if (shouldAutoVerify()) {
      await markEmailVerified(user.id);
    } else {
      throw new Error("EMAIL_NOT_VERIFIED");
    }
  }

  return issueTokens(user);
}

export async function issueTokens(user: UserRecord) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * refreshDays);

  await createRefreshToken(user.id, refreshToken, expiresAt);

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  const stored = await getRefreshToken(refreshToken);
  if (!stored) {
    throw new Error("REFRESH_INVALID");
  }

  const user = await findUserById(stored.user_id);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }
  if (!user.is_active) {
    // A revoked/inactive account should not be able to mint new access tokens.
    await revokeRefreshToken(refreshToken);
    throw new Error("ACCOUNT_INACTIVE");
  }

  // Rotate the refresh token: issue a fresh one and invalidate the old one.
  const newRefreshToken = signRefreshToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * refreshDays);
  await createRefreshToken(user.id, newRefreshToken, expiresAt);
  await revokeRefreshToken(refreshToken);

  const accessToken = signAccessToken(user);
  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string) {
  if (!refreshToken) {
    return;
  }
  await revokeRefreshToken(refreshToken);
}

export async function resetPassword(userId: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updatePasswordHash(userId, passwordHash);
}

export async function changePasswordForUser(userId: string, currentPassword: string, newPassword: string) {
  if (!isStrongPassword(newPassword)) {
    throw new Error("WEAK_PASSWORD");
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.password_hash) {
    throw new Error("LOCAL_PASSWORD_NOT_SET");
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    throw new Error("INVALID_CURRENT_PASSWORD");
  }

  const isSameAsCurrent = await bcrypt.compare(newPassword, user.password_hash);
  if (isSameAsCurrent) {
    throw new Error("NEW_PASSWORD_SAME_AS_OLD");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updatePasswordHash(userId, passwordHash);
}
