import { Router } from "express";
import { getPublicListings, getPublicListingDetail } from "../controllers/listingController";

const router = Router();

router.get("/", getPublicListings);
router.get("/:id", getPublicListingDetail);

export default router;
