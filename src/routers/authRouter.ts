import { Router } from "express";
import passport from "../config/passport";
import { env } from "../config/env";
import {
  login,
  register,
  verifyEmailHandler,
  refresh,
  logoutHandler,
  googleCallback,
} from "../controllers/authController";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmailHandler);
router.post("/refresh", refresh);
router.post("/logout", logoutHandler);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    prompt: "select_account",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${env.frontendUrl}/?error=google`,
  }),
  googleCallback
);

router.get("/google/failure", (_req, res) => {
  res.status(401).json({ message: "Google authentication failed" });
});

export default router;
