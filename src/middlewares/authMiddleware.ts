import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { findUserWithRoleById } from "../repositories/userRepository";

type TokenPayload = {
  sub: string;
  email: string;
  roleId: string | null;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    req.user = { id: payload.sub, email: payload.email, role_id: payload.roleId };
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await findUserWithRoleById(userId);
  if (!user || user.role_name !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
}
