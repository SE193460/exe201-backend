import { Router } from "express";
import { listPublicAmenities } from "../controllers/amenityController";

const router = Router();

router.get("/", listPublicAmenities);

export default router;
