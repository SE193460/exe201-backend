import { Request, Response } from "express";
import { findUserById, findUserWithRoleById, updateAvatarUrl, updateUserProfile } from "../repositories/userRepository";

export async function getMe(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await findUserWithRoleById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    username: user.username,
    avatarUrl: user.avatar_url,
    isEmailVerified: user.is_email_verified,
    roleName: user.role_name || "user",
  });
}

export async function updateMe(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { fullName, username, avatarUrl } = req.body;
  if (!fullName) {
    return res.status(400).json({ message: "Missing fullName" });
  }

  const updated = await updateUserProfile(userId, {
    fullName,
    username: username ?? null,
    avatarUrl: avatarUrl ?? null,
  });

  return res.json({
    id: updated.id,
    email: updated.email,
    fullName: updated.full_name,
    username: updated.username,
    avatarUrl: updated.avatar_url,
    isEmailVerified: updated.is_email_verified,
  });
}

export async function uploadAvatar(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "Missing avatar file" });
  }

  const avatarUrl = `/uploads/${file.filename}`;
  const updated = await updateAvatarUrl(userId, avatarUrl);

  return res.json({
    avatarUrl: updated.avatar_url,
  });
}
