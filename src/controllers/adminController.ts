import { Request, Response } from "express";
import { listUsers, findUserWithRoleById, toggleUserActive } from "../repositories/userRepository";

export async function getUsers(req: Request, res: Response) {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const users = await listUsers({
    query: query || undefined,
    status: status === "active" || status === "inactive" ? status : "all",
  });

  return res.json(
    users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      username: user.username,
      roleName: user.role_name || "user",
      isEmailVerified: user.is_email_verified,
      isActive: user.is_active,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
    }))
  );
}

export async function getUserDetail(req: Request, res: Response) {
  const rawId = req.params.id;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;
  const user = await findUserWithRoleById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    username: user.username,
    roleName: user.role_name || "user",
    isEmailVerified: user.is_email_verified,
    isActive: user.is_active,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
  });
}

export async function updateUserStatus(req: Request, res: Response) {
  const rawId = req.params.id;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ message: "Missing isActive" });
  }

  const updated = await toggleUserActive(userId, isActive);
  if (!updated) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: updated.id,
    isActive: updated.is_active,
  });
}
