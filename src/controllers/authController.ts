import { Request, Response } from "express";
import {
  loginLocal,
  registerLocal,
  verifyEmail,
  refreshAccessToken,
  logout,
  issueTokens,
} from "../services/authService";
import { env } from "../config/env";
import type { UserRecord } from "../repositories/userRepository";

function setRefreshCookie(res: Response, token: string) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, fullName, username } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await registerLocal({ email, password, fullName, username });
    if (result.resent) {
      return res.status(200).json({ message: "Verification email resent" });
    }
    return res.status(201).json({ message: "Verification email sent" });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    if ((error as Error).message === "EMAIL_EXISTS") {
      return res.status(409).json({ message: "Email already exists" });
    }

    if ((error as Error).message === "EMAIL_SEND_FAILED") {
      return res.status(502).json({ message: "Email send failed" });
    }

    return res.status(500).json({
      message: "Registration failed",
      error: (error as Error).message,
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    const { accessToken, refreshToken } = await loginLocal(email, password);
    setRefreshCookie(res, refreshToken);
    return res.json({ accessToken });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (message === "ACCOUNT_INACTIVE") {
      return res.status(403).json({ message: "Account is inactive" });
    }
    if (message === "EMAIL_NOT_VERIFIED") {
      return res.status(403).json({ message: "Email not verified" });
    }
    return res.status(500).json({ message: "Login failed" });
  }
}

export async function verifyEmailHandler(req: Request, res: Response) {
  try {
    const token = String(req.query.token || "");
    if (!token) {
      return res.status(400).json({ message: "Missing token" });
    }
    const result = await verifyEmail(token);
    if (result.status === "ALREADY_VERIFIED") {
      return res.json({ message: "Email already verified" });
    }
    return res.json({ message: "Email verified" });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "TOKEN_INVALID" || message === "TOKEN_EXPIRED") {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: "Verification failed" });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken) {
      return res.status(401).json({ message: "Missing refresh token" });
    }
    const { accessToken } = await refreshAccessToken(refreshToken);
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  const refreshToken = req.cookies?.refresh_token as string | undefined;
  await logout(refreshToken || "");
  res.clearCookie("refresh_token");
  return res.json({ message: "Logged out" });
}

export async function googleCallback(req: Request, res: Response) {
  const user = req.user as UserRecord | undefined;
  if (!user) {
    return res.redirect(`${env.frontendUrl}/?error=google`);
  }

  if (!user.is_active) {
    return res.redirect(`${env.frontendUrl}/?error=inactive`);
  }

  const { accessToken, refreshToken } = await issueTokens(user);
  setRefreshCookie(res, refreshToken);
  return res.redirect(`${env.frontendUrl}/?success=google&accessToken=${accessToken}`);
}
