import { Router } from "express";
import { chat } from "../controllers/assistantController";

const router = Router();

// Public: the assistant helps visitors learn the site without an account.
router.post("/chat", chat);

export default router;
