# RAMO.AI

AI-powered mock interview MVP (text + voice transcript) with real-time evaluation and a final report.

## Monorepo
- `apps/web` — Next.js web app (Vercel)
- `apps/api` — Fastify API (Railway)
- `supabase/` — Postgres schema + RLS policies

## Prereqs
- Node.js 20+ (you have Node installed)
- A Supabase project (Auth + Postgres + Storage)
- A Gemini API key

## Supabase setup
1) Create a Supabase project.
2) In Supabase Dashboard:
   - **Auth**: enable Email/Password
   - **Storage**: create private buckets:
     - `resumes`
     - `audio`
3) Run the SQL migration:
   - Copy/paste `supabase/migrations/0001_init.sql` into the Supabase SQL editor and run it.

Notes:
- Audio is **opt-in** at session creation.
- Audio retention is enforced by the API cleanup job, based on **upload time**, auto-deleting after **30 days**.

## Local development
1) Install dependencies (root):
- `npm install`

2) Configure environment variables:
- Web: copy `apps/web/.env.example` → `apps/web/.env.local`
- API: copy `apps/api/.env.example` → `apps/api/.env`

3) Run both apps:
- `npm run dev`

Defaults:
- Web: `http://localhost:3000`
- API: `http://localhost:3001`

## Deployment
### Recommended order
1) Deploy **API** first (so you have the public API URL)
2) Deploy **Web** and set `NEXT_PUBLIC_API_BASE_URL` to the API URL
3) Update **Supabase Auth** URLs to include your deployed web URL

### Where to get Supabase values
In Supabase Dashboard:
- `SUPABASE_URL`: **Project Settings → API → Project URL**
- `SUPABASE_ANON_KEY`: **Project Settings → API → Project API keys → anon public**
- `SUPABASE_SERVICE_ROLE_KEY`: **Project Settings → API → Project API keys → service_role**
- `SUPABASE_JWT_SECRET`: **Project Settings → API → JWT Settings → JWT Secret**

### Supabase Auth URLs (required)
In Supabase Dashboard → **Auth → URL Configuration**:
- **Site URL**: your deployed web URL (e.g. `https://your-app.vercel.app`)
- **Redirect URLs**: include both local + deployed:
   - `http://localhost:3000/*`
   - `https://your-app.vercel.app/*`

### Web (Vercel)
- Import the GitHub repo into Vercel
- Project settings:
   - **Root Directory**: `apps/web`
   - Framework preset: **Next.js** (auto-detected)
- Environment variables: set values from `apps/web/.env.example`

Minimum required env vars:
- `NEXT_PUBLIC_API_BASE_URL` = your deployed API base URL
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

After first deploy, you will get a URL like `https://<project>.vercel.app`.

### API (Railway)
- Create a new Railway project → **New Service → GitHub Repo**
- Service settings:
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
- Environment variables: set values from `apps/api/.env.example`

Important env vars:
- `CORS_ALLOWED_ORIGINS` must include your deployed web origin (and optionally localhost)
- `SUPABASE_SERVICE_ROLE_KEY` is required for storage cleanup + privileged operations

Suggested `CORS_ALLOWED_ORIGINS` for MVP:
- `http://localhost:3000,https://<your-vercel-domain>`

Verify API after deploy:
- `GET https://<your-railway-domain>/health` should return `{ ok: true }`

### API (Docker) — optional
If you prefer deploying the API via Docker (Render/Fly/any VPS), you can use the included Dockerfile:
- Build: `docker build -t ramo-api -f apps/api/Dockerfile apps/api`
- Run: `docker run --rm -p 3001:3001 --env-file apps/api/.env ramo-api`

### Audio cleanup (30-day retention)
Two supported ways:
- **Script**: run in the API service environment: `npm run audio:cleanup -w @ramo-ai/api`
- **HTTP endpoint**: call `POST /internal/cron/audio-cleanup` (set `CRON_SECRET` and send `x-cron-secret`)

Recommended for MVP: use an external scheduler (or Railway cron if available in your plan) to call the endpoint daily.
