import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { env } from "../config/env";
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
  markEmailVerified,
  updatePasswordHash,
  UserRecord,
} from "../repositories/userRepository";

const resend = new Resend(env.resendApiKey);

const refreshDays = 30;

function signAccessToken(user: UserRecord) {
  return jwt.sign(
    { sub: user.id, email: user.email, roleId: user.role_id },
    env.jwtSecret,
    { expiresIn: "30m" }
  );
}

function signRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
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

    const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;
    const { error } = await resend.emails.send({
      from: "RoomMate <onboarding@resend.dev>",
      to: params.email,
      subject: "Xac nhan email RoomMate",
      html: `<p>Nhap vao lien ket de xac nhan email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });

    if (error) {
      console.error("Resend email failed", error);
      throw new Error("EMAIL_SEND_FAILED");
    }

    return { userId: existing.id, resent: true };
  }

  const passwordHash = await bcrypt.hash(params.password, 10);
  const user = await createLocalUser({
    email: params.email,
    passwordHash,
    fullName: params.fullName,
    username: params.username || null,
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await createEmailVerificationToken(user.id, token, expiresAt);

  const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;
  const { error } = await resend.emails.send({
    from: "RoomMate <onboarding@resend.dev>",
    to: params.email,
    subject: "Xac nhan email RoomMate",
    html: `<p>Nhap vao lien ket de xac nhan email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  if (error) {
    console.error("Resend email failed", error);
    throw new Error("EMAIL_SEND_FAILED");
  }

  return { userId: user.id, resent: false };
}

export async function verifyEmail(token: string) {
  const record = await getEmailVerificationToken(token);
  if (!record) {
    throw new Error("TOKEN_INVALID");
  }
  const user = await findUserById(record.user_id);
  if (user?.is_email_verified) {
    return { status: "ALREADY_VERIFIED" as const };
  }
  if (new Date(record.expires_at) < new Date()) {
    throw new Error("TOKEN_EXPIRED");
  }
  await markEmailVerified(record.user_id);
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
    throw new Error("EMAIL_NOT_VERIFIED");
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

  const accessToken = signAccessToken(user);
  return { accessToken };
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
