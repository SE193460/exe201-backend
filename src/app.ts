import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import path from "path";
import passport from "./config/passport";
import { env } from "./config/env";
import { updateLastActive } from "./repositories/userRepository";
import { startScheduledJobs } from "./jobs/scheduler";
import { isEmailVerificationRequired } from "./services/authService";
import { isMailConfigured } from "./services/mailer";
import authRouter from "./routers/authRouter";
import userRouter from "./routers/userRouter";
import adminRouter from "./routers/adminRouter";
import listingRouter from "./routers/listingRouter";
import amenityRouter from "./routers/amenityRouter";
import paymentRouter from "./routers/paymentRouter";
import { health } from "./controllers/healthController";
import { ensureAdminAccount } from "./services/adminBootstrap";
import lifestyleRouter from "./routers/lifestyleRouter";
import reportRouter from "./routers/reportRouter";
import notificationRouter from "./routers/notificationRouter";
import feedbackRouter from "./routers/feedbackRouter";
import contactViewRouter from "./routers/contactViewRouter";
import analyticsRouter from "./routers/analyticsRouter";
import assistantRouter from "./routers/assistantRouter";
import { proxyImage } from "./controllers/imageProxyController";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { apiLimiter, authLimiter } from "./middlewares/rateLimiter";

const app = express();

// Behind a reverse proxy (Render/Vercel), trust the proxy so limiters see the
// real client IP instead of the proxy's.
if (env.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

// Security headers. Images are served to a different origin, so allow cross-origin reads.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// Cho phép nhiều frontend
const allowedOrigins = [
  "http://localhost:5173",
  "https://exe201-frontend-inky.vercel.app",
  "https://exe201-frontend-al15qkuhn-phamthikimhuong11a1-5782s-projects.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(passport.initialize());

// Optional auth: attach the user when a valid token is present, for public routes
// that personalise their response (e.g. is_saved). Activity is recorded at most
// once every 5 minutes per user (throttled inside updateLastActive).
app.use((req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token) {
    try {
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
app.use("/api/auth", authLimiter, authRouter);
app.use("/api", apiLimiter);
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/listings", listingRouter);
app.use("/api/amenities", amenityRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api", lifestyleRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/reports", reportRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/assistant", assistantRouter);
app.use("/api/contact-views", contactViewRouter);
app.get("/api/images/proxy", proxyImage);

// 404 handler must come after all routes, and the error handler last of all.
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.port;

ensureAdminAccount()
  .catch((error) => {
    console.error("Admin bootstrap failed", error);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
      if (isEmailVerificationRequired() && !isMailConfigured()) {
        console.warn(
          "[warn] Email verification is required but no mail channel is configured. " +
            "Set SMTP_* (recommended) or RESEND_API_KEY, or set REQUIRE_EMAIL_VERIFICATION=false."
        );
      }
      startScheduledJobs();
    });
  });
