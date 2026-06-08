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
import { health } from "./controllers/healthController";
import { ensureAdminAccount } from "./services/adminBootstrap";
import lifestyleRouter from "./routers/lifestyleRouter";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", health);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/listings", listingRouter);
app.use("/api/amenities", amenityRouter);
app.use("/api", lifestyleRouter);

ensureAdminAccount()
  .catch((error) => {
    console.error("Admin bootstrap failed", error);
  })
  .finally(() => {
    app.listen(env.port, () => {
      console.log(`Backend listening on port ${env.port}`);
    });
  });
