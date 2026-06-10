import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";
import { getReports, submitReport } from "../controllers/reportController";

const router = Router();
router.post("/", submitReport);

router.get(
    "/admin",
    requireAdmin,
    getReports
);

export default router;