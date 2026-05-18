import { Router } from "express";
import { getUsers, getUserDetail, updateUserStatus } from "../controllers/adminController";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

router.get("/users", requireAuth, requireAdmin, getUsers);
router.get("/users/:id", requireAuth, requireAdmin, getUserDetail);
router.patch("/users/:id/status", requireAuth, requireAdmin, updateUserStatus);

export default router;
