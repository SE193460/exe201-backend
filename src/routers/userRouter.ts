import fs from "fs";
import path from "path";
import multer from "multer";
import { Router } from "express";
import { getMe, updateMe, uploadAvatar } from "../controllers/userController";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: uploadDir,
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname) || ".jpg";
		const safeId = req.user?.id || "user";
		cb(null, `${safeId}-${Date.now()}${ext}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 2 * 1024 * 1024 },
});

router.get("/me", requireAuth, getMe);
router.put("/me", requireAuth, updateMe);
router.post("/me/avatar", requireAuth, upload.single("avatar"), uploadAvatar);

export default router;
