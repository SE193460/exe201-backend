import { Router } from "express";
import { checkout, getMyHistory, getAllHistory } from "../controllers/paymentController";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

router.post("/checkout", requireAuth, checkout);
router.get("/history", requireAuth, getMyHistory);
router.get("/admin/history", requireAuth, requireAdmin, getAllHistory);

export default router;
