import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";
import * as ctrl from "../controllers/contactViewController";

const router = Router();

router.get("/credits", requireAuth, ctrl.getMyCredits);
router.post("/view/:listingId", requireAuth, ctrl.viewContact);
router.post("/lifestyle/:listingId", requireAuth, ctrl.viewLifestyleProfile);
router.get("/lifestyle/:listingId", requireAuth, ctrl.getLifestyleProfileAccess);
router.post("/purchase", requireAuth, ctrl.purchaseContactViews);
router.post("/confirm-purchase", requireAuth, ctrl.confirmContactViewPurchase);
router.post("/admin/add-credits", requireAuth, requireAdmin, ctrl.adminAddContactViewCredits);

export default router;
