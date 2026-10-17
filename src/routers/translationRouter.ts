import { Router } from "express";
import { getListingTranslations } from "../controllers/translationController";

const router = Router();

// Public: listing pages fetch localised free-text content on demand.
router.get("/listings", getListingTranslations);

export default router;
