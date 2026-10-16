import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";
import { getAnalyticsSummary, trackEvent } from "../controllers/analyticsController";

const router = Router();

router.post("/events", requireAuth, trackEvent);
router.get("/summary", requireAuth, requireAdmin, getAnalyticsSummary);

export default router;
