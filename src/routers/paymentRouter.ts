import { Router } from "express";
import { generateQR, confirmTransfer, adminConfirmPayment, getMyHistory, getAllHistory, getPendingPayments } from "../controllers/paymentController";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

router.post("/generate-qr", requireAuth, generateQR);
router.post("/confirm-transfer", requireAuth, confirmTransfer);
router.get("/history", requireAuth, getMyHistory);
router.get("/admin/history", requireAuth, requireAdmin, getAllHistory);
router.get("/admin/pending", requireAuth, requireAdmin, getPendingPayments);
router.patch("/admin/:id/confirm", requireAuth, requireAdmin, adminConfirmPayment);

export default router;
