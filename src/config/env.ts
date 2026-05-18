import dotenv from "dotenv";

dotenv.config();

type Env = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  frontendUrl: string;
  resendApiKey: string;
  backendUrl: string;
  nodeEnv: string;
  adminEmail: string | null;
  adminPassword: string | null;
  adminName: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env: Env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
  googleClientId: requireEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
  frontendUrl: requireEnv("FRONTEND_URL"),
  resendApiKey: requireEnv("RESEND_API_KEY"),
  backendUrl: process.env.BACKEND_URL || `http://localhost:${Number(process.env.PORT) || 3000}`,
  nodeEnv: process.env.NODE_ENV || "development",
  adminEmail: process.env.ADMIN_EMAIL || null,
  adminPassword: process.env.ADMIN_PASSWORD || null,
  adminName: process.env.ADMIN_NAME || null,
};
