import { Router } from "express";
import {
  getUsers,
  getUserDetail,
  updateUserStatus,
  getAdminListings,
  approveListing,
  rejectListing,
  getAdminImportedListings,
  getAdminImportedListingById,
  createAdminImportedListingHandler,
  updateAdminImportedListingHandler,
  publishAdminImportedListingHandler,
  unpublishAdminImportedListingHandler,
  addAdminImportedListingImageUrls,
  getReports,
  resolveReportHandler,
} from "../controllers/adminController";
import { getAdminFeedbacks } from "../controllers/feedbackController";
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

router.get("/imported-listings", requireAuth, requireAdmin, getAdminImportedListings);
router.get("/imported-listings/:id", requireAuth, requireAdmin, getAdminImportedListingById);
router.post("/imported-listings", requireAuth, requireAdmin, createAdminImportedListingHandler);
router.put("/imported-listings/:id", requireAuth, requireAdmin, updateAdminImportedListingHandler);
router.patch("/imported-listings/:id/publish", requireAuth, requireAdmin, publishAdminImportedListingHandler);
router.patch("/imported-listings/:id/unpublish", requireAuth, requireAdmin, unpublishAdminImportedListingHandler);
router.post("/imported-listings/:id/images/urls", requireAuth, requireAdmin, addAdminImportedListingImageUrls);

router.get("/amenities", requireAuth, requireAdmin, listAdminAmenities);
router.post("/amenities", requireAuth, requireAdmin, createAdminAmenity);
router.patch("/amenities/:id", requireAuth, requireAdmin, updateAdminAmenity);
router.delete("/amenities/:id", requireAuth, requireAdmin, deleteAdminAmenity);

router.get("/reports", requireAuth, requireAdmin, getReports);
router.patch("/reports/:id/resolve", requireAuth, requireAdmin, resolveReportHandler);

router.get("/feedbacks", requireAuth, requireAdmin, getAdminFeedbacks);

export default router;
