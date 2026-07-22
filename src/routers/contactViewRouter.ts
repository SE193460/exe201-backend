import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import * as ctrl from "../controllers/contactViewController";

const router = Router();

router.get("/credits", requireAuth, ctrl.getMyCredits);
router.post("/view/:listingId", requireAuth, ctrl.viewContact);
router.post("/lifestyle/:listingId", requireAuth, ctrl.viewLifestyleProfile);
router.get("/lifestyle/:listingId", requireAuth, ctrl.getLifestyleProfileAccess);
router.post("/purchase", requireAuth, ctrl.purchaseContactViews);
router.post("/confirm-purchase", requireAuth, ctrl.confirmContactViewPurchase);
router.post("/admin/add-credits", requireAuth, ctrl.adminAddContactViewCredits);

export default router;
