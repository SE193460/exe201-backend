import fs from "fs";
import path from "path";
import multer from "multer";
import { Router } from "express";
import {
	createMyListingDraft,
	getMyListingDetail,
	listMyListings,
	updateMyListing,
	uploadMyListingImages,
	submitMyListing,
	deleteMyListingImage,
	deleteMyListing,
	addListingImageUrls,
} from "../controllers/listingController";
import { changeMyPassword, getMe, updateMe, uploadAvatar } from "../controllers/userController";
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

const listingUploadDir = path.join(process.cwd(), "uploads", "listings");
if (!fs.existsSync(listingUploadDir)) {
	fs.mkdirSync(listingUploadDir, { recursive: true });
}

const listingStorage = multer.diskStorage({
	destination: listingUploadDir,
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname) || ".jpg";
		const listingId = req.params.id || "listing";
		cb(null, `${listingId}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
	},
});

const listingUpload = multer({
	storage: listingStorage,
	limits: { fileSize: 3 * 1024 * 1024 },
});

router.get("/me", requireAuth, getMe);
router.put("/me", requireAuth, updateMe);
router.put("/me/password", requireAuth, changeMyPassword);
router.post("/me/avatar", requireAuth, upload.single("avatar"), uploadAvatar);
router.post("/me/listings", requireAuth, createMyListingDraft);
router.get("/me/listings", requireAuth, listMyListings);
router.get("/me/listings/:id", requireAuth, getMyListingDetail);
router.put("/me/listings/:id", requireAuth, updateMyListing);
router.delete("/me/listings/:id", requireAuth, deleteMyListing);
router.post("/me/listings/:id/images", requireAuth, listingUpload.array("images", 20), uploadMyListingImages);
router.put("/me/listings/:id/submit", requireAuth, submitMyListing);
router.delete("/me/listings/:id/images/:imageId", requireAuth, deleteMyListingImage);
router.post("/me/listings/:id/images/urls", requireAuth, addListingImageUrls);

export default router;
