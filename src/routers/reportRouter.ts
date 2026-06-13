import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";
import { getReports, submitReport, resolveReport } from "../controllers/reportController";

const router = Router();
router.post("/", requireAuth, submitReport);

router.get(
    "/admin",
    requireAuth,
    requireAdmin,
    getReports
);

router.patch(
    "/admin/:id/status",
    requireAuth,
    requireAdmin,
    resolveReport
);

export default router;
