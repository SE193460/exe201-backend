import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import passport from "./config/passport";
import { env } from "./config/env";
import authRouter from "./routers/authRouter";
import userRouter from "./routers/userRouter";
import adminRouter from "./routers/adminRouter.ts";
import listingRouter from "./routers/listingRouter";
import amenityRouter from "./routers/amenityRouter.ts";
import paymentRouter from "./routers/paymentRouter";
import { health } from "./controllers/healthController";
import { ensureAdminAccount } from "./services/adminBootstrap";
import lifestyleRouter from "./routers/lifestyleRouter";
import reportRouter from "./routers/reportRouter.ts";
import notificationRouter from "./routers/notificationRouter";
import feedbackRouter from "./routers/feedbackRouter";

dotenv.config();

const app = express();

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Middleware to track active status of logged-in users on any request
app.use((req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token) {
    try {
      const jwt = require("jsonwebtoken");
      const { env } = require("./config/env");
      const { updateLastActive } = require("./repositories/userRepository");
      const payload = jwt.verify(token, env.jwtSecret) as { sub: string; email: string; roleId: string | null };
      if (payload && payload.sub) {
        req.user = { id: payload.sub, email: payload.email, role_id: payload.roleId };
        updateLastActive(payload.sub).catch((err: unknown) =>
          console.error("Failed to update user last active:", err)
        );
      }
    } catch {
      // ignore invalid tokens in this middleware
    }
  }
  next();
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", health);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/listings", listingRouter);
app.use("/api/amenities", amenityRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api", lifestyleRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/reports", reportRouter);
app.use("/api/notifications", notificationRouter);

ensureAdminAccount()
  .catch((error) => {
    console.error("Admin bootstrap failed", error);
  })
  .finally(() => {
    app.listen(env.port, () => {
      console.log(`Backend listening on port ${env.port}`);
    });
  });
