import bcrypt from "bcrypt";
import { env } from "../config/env";
import { findUserByEmail, createAdminUser } from "../repositories/userRepository";

export async function ensureAdminAccount() {
  if (!env.adminEmail || !env.adminPassword) {
    console.warn("ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin bootstrap.");
    return;
  }

  const existing = await findUserByEmail(env.adminEmail);
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  await createAdminUser({
    email: env.adminEmail,
    passwordHash,
    fullName: env.adminName || "Admin",
  });

  console.log("Admin account created.");
}
