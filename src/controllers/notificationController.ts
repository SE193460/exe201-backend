import { Request, Response } from "express";
import {
  listNotificationsByUser,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications,
} from "../repositories/notificationRepository";

export async function getMyNotifications(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const notifications = await listNotificationsByUser(userId);
  return res.json(notifications);
}

export async function getUnreadCount(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const count = await countUnreadNotifications(userId);
  return res.json({ count });
}

export async function readNotification(req: Request, res: Response) {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  await markNotificationRead(id);
  return res.json({ message: "Marked as read" });
}

export async function readAllNotifications(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  await markAllNotificationsRead(userId);
  return res.json({ message: "All marked as read" });
}
