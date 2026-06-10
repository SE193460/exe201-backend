import { Router } from "express";
import {
  getPublicListings,
  getPublicListingDetail,
  toggleMySavedListing,
  listMySavedListings,
  reportListing,
} from "../controllers/listingController";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", getPublicListings);
router.get("/saved", requireAuth, listMySavedListings);
router.get("/:id", getPublicListingDetail);
router.post("/:id/save", requireAuth, toggleMySavedListing);
router.post("/:id/report", reportListing);

export default router;
