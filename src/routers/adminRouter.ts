import { Router } from "express";
import {
  getUsers,
  getUserDetail,
  updateUserStatus,
  getAdminListings,
  approveListing,
  rejectListing,
} from "../controllers/adminController";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

router.get("/users", requireAuth, requireAdmin, getUsers);
router.get("/users/:id", requireAuth, requireAdmin, getUserDetail);
router.patch("/users/:id/status", requireAuth, requireAdmin, updateUserStatus);

router.get("/listings", requireAuth, requireAdmin, getAdminListings);
router.patch("/listings/:id/approve", requireAuth, requireAdmin, approveListing);
router.patch("/listings/:id/reject", requireAuth, requireAdmin, rejectListing);

export default router;
