import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { getAnalyticsSummary, trackEvent } from "../controllers/analyticsController";

const router = Router();

router.post("/events", requireAuth, trackEvent);
router.get("/summary", requireAuth, getAnalyticsSummary);

export default router;
