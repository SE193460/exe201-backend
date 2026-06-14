import { Request, Response } from "express";
import { findUserById, findUserWithRoleById, updateAvatarUrl, updateUserProfile } from "../repositories/userRepository";
import { uploadImage } from "../services/cloudinaryService";
import { changePasswordForUser } from "../services/authService";

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
    phoneNumber: user.phone_number,
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

  const { fullName, username, avatarUrl, phoneNumber } = req.body;
  if (!fullName) {
    return res.status(400).json({ message: "Missing fullName" });
  }

  const updated = await updateUserProfile(userId, {
    fullName,
    username: username ?? null,
    avatarUrl: avatarUrl ?? null,
    phoneNumber: typeof phoneNumber === "string" ? phoneNumber : null,
  });

  return res.json({
    id: updated.id,
    email: updated.email,
    fullName: updated.full_name,
    phoneNumber: updated.phone_number,
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

  try {
    const avatarUrl = await uploadImage(file.path, "avatars");
    const updated = await updateAvatarUrl(userId, avatarUrl);

    return res.json({
      avatarUrl: updated.avatar_url,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return res.status(500).json({ message: "Failed to upload avatar" });
  }
}

export async function changeMyPassword(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Mật khẩu mới không khớp" });
  }

  try {
    await changePasswordForUser(userId, currentPassword, newPassword);
    return res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    const message = (error as Error).message;

    if (message === "INVALID_CURRENT_PASSWORD") {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    if (message === "WEAK_PASSWORD") {
      return res.status(400).json({
        message: "Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
      });
    }

    if (message === "NEW_PASSWORD_SAME_AS_OLD") {
      return res.status(400).json({ message: "Mật khẩu mới phải khác mật khẩu hiện tại" });
    }

    if (message === "LOCAL_PASSWORD_NOT_SET") {
      return res.status(400).json({ message: "Tài khoản chưa có mật khẩu nội bộ" });
    }

    if (message === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(500).json({ message: "Không thể đổi mật khẩu" });
  }
}
