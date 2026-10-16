import dotenv from "dotenv";

dotenv.config();

type Env = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  frontendUrl: string;
  resendApiKey: string | null;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPass: string | null;
  mailFrom: string;
  backendUrl: string;
  nodeEnv: string;
  adminEmail: string | null;
  adminPassword: string | null;
  adminName: string | null;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  imageProxyAllowedHosts: string | null;
  assistantApiKey: string | null;
  assistantApiBaseUrl: string;
  assistantModel: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const WEAK_JWT_SECRETS = ["replace_me", "secret", "changeme", "change_me", "jwt_secret", "test", "password"];

function requireJwtSecret(): string {
  const value = requireEnv("JWT_SECRET");
  const normalized = value.trim().toLowerCase();

  // Always reject placeholder values, in every environment.
  if (WEAK_JWT_SECRETS.includes(normalized)) {
    throw new Error(
      `JWT_SECRET is set to a known placeholder value. Generate a strong secret, e.g.: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
    );
  }

  // In production, also require a minimum length.
  if (process.env.NODE_ENV === "production" && value.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long in production.");
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
  jwtSecret: requireJwtSecret(),
  googleClientId: requireEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
  frontendUrl: requireEnv("FRONTEND_URL"),
  resendApiKey: process.env.RESEND_API_KEY || null,
  smtpHost: process.env.SMTP_HOST || null,
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: (process.env.SMTP_SECURE || "").toLowerCase() === "true",
  smtpUser: process.env.SMTP_USER || null,
  smtpPass: process.env.SMTP_PASS || null,
  mailFrom: process.env.MAIL_FROM || "RoomMate <no-reply@roommate.local>",
  backendUrl: getBackendUrl(),
  nodeEnv: process.env.NODE_ENV || "development",
  adminEmail: process.env.ADMIN_EMAIL || null,
  adminPassword: process.env.ADMIN_PASSWORD || null,
  adminName: process.env.ADMIN_NAME || null,
  cloudinaryCloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: requireEnv("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: requireEnv("CLOUDINARY_API_SECRET"),
  imageProxyAllowedHosts: process.env.IMAGE_PROXY_ALLOWED_HOSTS || null,
  assistantApiKey: process.env.ASSISTANT_API_KEY || process.env.OPENAI_API_KEY || null,
  assistantApiBaseUrl: (process.env.ASSISTANT_API_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
  assistantModel: process.env.ASSISTANT_MODEL || "gpt-4o-mini",
};
