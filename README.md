# Roomie — Backend API

REST API for **Roomie**, a roommate / rental-listing platform. Built with Express 5, TypeScript and raw PostgreSQL (no ORM).

## Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 20+ |
| Language | TypeScript 5.9 |
| Framework | Express 5 |
| Database | PostgreSQL (raw SQL via `pg`) |
| Auth | JWT (access + refresh) + Passport Google OAuth 2.0 |
| Uploads | Multer + Cloudinary |
| Email | Nodemailer (SMTP) with Resend fallback |
| Security | Helmet, express-rate-limit |

## Prerequisites

- Node.js 20 or newer
- PostgreSQL 16 (local Docker or a hosted instance such as Supabase)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and fill in the values
cp .env.example .env

# 3. (Optional) start a local Postgres with Docker
docker compose up -d

# 4. Create the schema + seed data (only runs on an empty database)
npm run db:setup

# 5. Start in watch mode
npm run dev
```

The API is then available at `http://localhost:3000` — check `GET /health`.

## Environment variables

All variables live in `.env` (see `.env.example` for the full annotated list).

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | no | `production` enables secure cookies + `trust proxy`. |
| `PORT` | no | Defaults to `3000`. |
| `DATABASE_URL` | **yes** | PostgreSQL connection string. |
| `JWT_SECRET` | **yes** | Must be strong; placeholders like `replace_me` are rejected at boot. |
| `BACKEND_URL` | prod | Public URL of this API. |
| `FRONTEND_URL` | yes | Used for CORS + OAuth redirects. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for OAuth | Google sign-in. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | for email | Preferred mail channel. |
| `MAIL_FROM` | for email | e.g. `Roomie <no-reply@yourdomain.com>`. |
| `RESEND_API_KEY` | fallback | Used only when SMTP is not configured. |
| `CLOUDINARY_*` | **yes** | Image uploads. |
| `REQUIRE_EMAIL_VERIFICATION` | no | Defaults to `true` in production, `false` otherwise. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | no | Bootstrap an admin account on startup. |
| `IMAGE_PROXY_ALLOWED_HOSTS` | no | Comma-separated hosts the image proxy may fetch. Defaults to `fbcdn.net,facebook.com,cloudinary.com`. |
| `ASSISTANT_API_KEY` | no | Enables the AI assistant's LLM answers. Without it the assistant uses built-in offline FAQ answers. |
| `ASSISTANT_API_BASE_URL` | no | OpenAI-compatible base URL. Defaults to `https://api.openai.com/v1`. |
| `ASSISTANT_MODEL` | no | Model used by the assistant. Defaults to `gpt-4o-mini`. |

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **Email verification:** when `REQUIRE_EMAIL_VERIFICATION` is on and no mail channel is
> configured, the server logs a warning at boot. Set the `SMTP_*` values (works with Gmail
> app passwords, Brevo, Mailtrap, …) before enabling it in production.

## Database

- `database/schema.sql` — tables, constraints, triggers.
- `database/indexes.sql` + `database/alter_*.sql` — performance indexes (idempotent).
- `database/seed.sql` — demo data.
- `database/setup.ts` — runs everything in order **only when the database is empty**.
- `database/run_migration.ts` — applies a single migration file.

```bash
npm run db:setup     # full setup on an empty DB
npm run db:migrate   # run a migration file
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Watch mode via `ts-node-dev`. |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm start` | Run the compiled server. |
| `npm run db:setup` | Create schema + indexes + seed (empty DB only). |
| `npm run db:migrate` | Apply a migration file. |

## API overview

All endpoints are prefixed with `/api` except `GET /health`.

| Base path | Purpose |
| --- | --- |
| `/api/auth` | Register, login, refresh, logout, Google OAuth, email verification. |
| `/api/users` | Current user profile, password, avatar, and own listings (`/me/...`). |
| `/api/listings` | Public listing feed + detail, save/unsave, report. |
| `/api/admin` | Admin-only: users, listings, imported listings, amenities, reports, feedback. |
| `/api/amenities` | Public amenities list. |
| `/api/feedback` | Submit product feedback. |
| `/api` | Lifestyle profile, roommate preferences, soft-filter (`lifestyleRouter`). |
| `/api/payments` | QR generation, transfer confirmation, history. |
| `/api/reports` | Report submission and admin resolution. |
| `/api/notifications` | In-app notifications. |
| `/api/analytics` | Event tracking + admin summary. |
| `/api/contact-views` | Paid contact-view credits and lifestyle-profile access. |
| `/api/images/proxy` | Allow-listed image proxy (SSRF-safe). |
| `/api/assistant` | Roomie AI assistant chat (`POST /api/assistant/chat`). LLM when `ASSISTANT_API_KEY` is set, offline FAQ otherwise. Public. |

Authentication uses a `Bearer` access token plus an httpOnly refresh-token cookie.

## Security notes

- **Rate limiting:** `apiLimiter` on `/api`, stricter `authLimiter` on `/api/auth`.
- **Security headers:** `helmet` (CSP disabled so the API can be consumed by any frontend).
- **CORS:** explicit allow-list with credentials enabled.
- **Image proxy:** host allow-list + IP-literal blocking to prevent SSRF.
- **Errors:** centralized `errorHandler`; internal messages are not leaked to clients.
- **Refresh tokens:** rotated on use, scoped to active accounts, expired rows are pruned by a background job.

## Project structure

```
src/
  config/        # env + passport
  controllers/   # request handlers
  jobs/          # background scheduler (expire listings, prune tokens)
  middlewares/   # auth, error handler, rate limiter
  repositories/  # SQL data access
  routers/       # route definitions
  services/      # auth, mailer, email, admin bootstrap
  types/         # shared types
database/        # schema, migrations, seeds, setup scripts
```
