import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  getMyNotifications,
  getUnreadCount,
  readNotification,
  readAllNotifications,
} from "../controllers/notificationController";

const router = Router();

router.get("/", requireAuth, getMyNotifications);
router.get("/unread-count", requireAuth, getUnreadCount);
router.patch("/:id/read", requireAuth, readNotification);
router.post("/read-all", requireAuth, readAllNotifications);

export default router;
