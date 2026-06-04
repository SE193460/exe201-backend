import { Router } from "express";
import {
  getUsers,
  getUserDetail,
  updateUserStatus,
  getAdminListings,
  approveListing,
  rejectListing,
} from "../controllers/adminController";
import {
  listAdminAmenities,
  createAdminAmenity,
  updateAdminAmenity,
  deleteAdminAmenity,
} from "../controllers/amenityController";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

router.get("/users", requireAuth, requireAdmin, getUsers);
router.get("/users/:id", requireAuth, requireAdmin, getUserDetail);
router.patch("/users/:id/status", requireAuth, requireAdmin, updateUserStatus);

router.get("/listings", requireAuth, requireAdmin, getAdminListings);
router.patch("/listings/:id/approve", requireAuth, requireAdmin, approveListing);
router.patch("/listings/:id/reject", requireAuth, requireAdmin, rejectListing);

router.get("/amenities", requireAuth, requireAdmin, listAdminAmenities);
router.post("/amenities", requireAuth, requireAdmin, createAdminAmenity);
router.patch("/amenities/:id", requireAuth, requireAdmin, updateAdminAmenity);
router.delete("/amenities/:id", requireAuth, requireAdmin, deleteAdminAmenity);

export default router;
