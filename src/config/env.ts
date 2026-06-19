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
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getBackendUrl(): string {
  let url = process.env.BACKEND_URL;
  
  if (url) {
    // Remove trailing slash to avoid double slashes in callback URL
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }
  
  // For production, BACKEND_URL must be explicitly set
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing required env var: BACKEND_URL (must be set for production)");
  }
  
  // For development only
  return `http://localhost:${Number(process.env.PORT) || 3000}`;
}

export const env: Env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
  googleClientId: requireEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
  frontendUrl: requireEnv("FRONTEND_URL"),
  resendApiKey: requireEnv("RESEND_API_KEY"),
  backendUrl: getBackendUrl(),
  nodeEnv: process.env.NODE_ENV || "development",
  adminEmail: process.env.ADMIN_EMAIL || null,
  adminPassword: process.env.ADMIN_PASSWORD || null,
  adminName: process.env.ADMIN_NAME || null,
  cloudinaryCloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: requireEnv("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: requireEnv("CLOUDINARY_API_SECRET"),
};
