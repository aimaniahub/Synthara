# Synthara · AI-Powered Web Data Generation Platform

Synthara turns natural-language ideas into trustworthy, structured datasets by blending intelligent search, resilient scraping, AI structuring, and Supabase-backed persistence. This README captures how the full system works today, the moving parts involved, and how to run it end-to-end.

## Table of Contents
1. [Product Overview](#product-overview)
2. [Key Capabilities](#key-capabilities)
3. [Architecture](#architecture)
4. [Data Generation Workflow](#data-generation-workflow)
5. [Services & Core Modules](#services--core-modules)
6. [Project Layout](#project-layout)
7. [Local Development Setup](#local-development-setup)
8. [Environment Variables](#environment-variables)
9. [Database & Supabase Configuration](#database--supabase-configuration)
10. [Crawl4AI Python Service](#crawl4ai-python-service)
11. [Developer Tooling & Scripts](#developer-tooling--scripts)
12. [Deployment Checklist](#deployment-checklist)
13. [Troubleshooting](#troubleshooting)

---

## Product Overview

Synthara is a Next.js 15 + TypeScript platform that lets users describe the dataset they need (“Top EV charging operators in India with station counts by city”) and generates a real CSV grounded in the public web. The app:

- Enhances the prompt into search-ready queries.
- Collects up to 15 high-quality URLs (overfetching + ranking ensures coverage).
- Scrapes every page through a dedicated Python microservice (Crawl4AI) with retries/backfill logic.
- Chunks the combined corpus, prioritizes the most relevant slices, and streams them into an AI structuring flow (OpenRouter DeepSeek via `SimpleAI`).
- Stores generated datasets, logs, and user actions in Supabase with RLS, exposing history and download flows in the dashboard UI.

## Key Capabilities

- **AI Orchestration Pipeline** – modular flows for query enhancement, URL ranking, scraping, chunking, AI structuring, and chunk file emission.
- **Real-Time Progress UX** – server-sent events surface each pipeline phase, scrape counts, backfill attempts, and AI progress to the dashboard.
- **High-Recall Scraping** – search flow over-fetches up to 3× the requested `maxUrls`, deduplicates, and backfills failed scrapes in 5-URL batches until targets are met.
- **AI Structuring with Safety Nets** – raw responses are persisted (`temp/ai-raw-response-*.json`), post-processed with multi-strategy JSON salvage, and attached to sessions for auditability.
- **Multi-Provider AI** – `SimpleAI` uses OpenRouter/DeepSeek for long-form JSON outputs, while `GeminiService` supports key rotation, retry logic, and strict schema validation for other flows.
- **Supabase-Backed Auth & Storage** – email/password auth, dataset history, activity logging, and secure file storage buckets.

## Architecture

| Layer | Details |
| --- | --- |
| **Frontend** | Next.js 15 App Router, React 18, Tailwind + shadcn/ui, Radix primitives, streaming route handlers, responsive dashboard UI. |
| **Backend (Node)** | Next.js server actions + API routes orchestrate flows, emit SSE updates, and secure Supabase writes. |
| **AI & Search** | Google Gemini (multi-key rotation), OpenRouter DeepSeek (structured outputs), SerpAPI search, heuristics for query planning. |
| **Scraping** | External Crawl4AI Python service (Chrome-enabled) with markdown + table extraction; Node orchestrator waits for all scrapes and reruns batches when under target. |
| **Data Layer** | Supabase PostgreSQL with Row-Level Security, buckets for generated CSV/JSON, activity logs, and dataset metadata. |
| **Python Services** | `server/crawl4ai_service` (scraping) plus optional trainer service (port 8001) for ML preview scripts. |

## Data Generation Workflow

1. **Input validation** – `IntelligentWebScrapingInputSchema` (`src/ai/flows/intelligent-web-scraping-flow.ts`) constrains rows/URLs and toggles AI usage.
2. **Query enhancement & URL harvest** – `generateSearchUrls` expands the prompt, filters social/SERP pages, and tracks both initial batches and a backfill queue.
3. **Crawl orchestration** – Node calls the Crawl4AI microservice for every URL, waits for completion, and keeps retrying/backfilling until enough clean documents exist.
4. **Chunking & retrieval prep** – scraped markdown is chunked (~1.5k chars with overlap), scored against query terms, and trimmed to the model’s 170k-char budget. A temp snapshot of the combined corpus is also written for traceability.
5. **AI structuring** – `SimpleAI.structureRelevantChunksToDataset` prompts DeepSeek to design schema + rows, saving raw responses and mirroring them to `temp/analyzed/{sessionId}-ai-analysis.json` for downstream reuse.
6. **Post-processing & export** – parsed rows are chunked into `/temp/chunks` for resumable streaming, Supabase records are updated, and CSV/JSON downloads become available in the UI.

## Services & Core Modules

| Module | Purpose |
| --- | --- |
| `src/ai/flows/intelligent-web-scraping-flow.ts` | Primary orchestrator covering search, scraping, chunking, AI structuring, and chunk file emission. |
| `src/ai/simple-ai.ts` | OpenRouter client with schema-constrained prompting, raw response persistence, and aggressive JSON recovery heuristics. |
| `src/services/gemini-service.ts` | Gemini Flash client supporting multiple API keys, per-call rotation on 429/401/403 errors, and structured parsing helpers. |
| `src/services/serpapi-service.ts` | Ranked URL discovery, deduplication, and source scoring. |
| `src/app/api/crawl4ai/route.ts` | Bridge between Next.js and the Python scraper (batch requests, retries, and health checks). |
| `scripts/setup-database.js` | Applies Supabase schema and seed data locally. |
| `scripts/test-gemini-integration.ts` | Smoke test for Gemini credentials and parsing logic. |

## Project Layout

```
src/
├── app/                  # Next.js routes, layouts, and server actions
├── ai/                   # Prompt flows, retrieval logic, SimpleAI wrapper
├── components/           # UI primitives (auth, dashboard, dataviz, layout)
├── hooks/                # Client utilities (toast, responsive helpers)
├── services/             # External integrations (Gemini, SerpAPI, Supabase)
├── lib/                  # Config/helpers (Supabase client, constants)
└── server/               # Python microservices and utilities
```

The repo also includes `scripts/` for database + AI validation tasks, `output/` for generated CSVs, and `temp/` (gitignored) for AI artifacts.

## Local Development Setup

### 1. Prerequisites
- Node.js 18+
- npm 8+ (or pnpm/yarn if preferred)
- Python 3.10+ with venv support (for Crawl4AI service)
- Supabase project (free tier works)

### 2. Install dependencies
```bash
git clone <repository-url>
cd Synthara
npm install
```

### 3. Create environment files
Copy `.env.example` to `.env.local` (Next.js) and fill in the values covered in [Environment Variables](#environment-variables). For Python services, mirror the relevant keys into `server/crawl4ai_service/.env` and/or your venv activation.

### 4. Start backing services
```bash
# optional: Supabase CLI or hosted project already running
# start Crawl4AI python microservice (see below)

# run Next.js dev server
npm run dev

# Windows shortcut
start.bat
```

Visit `http://localhost:3000` and sign up with Supabase Auth. The dashboard will stream logs as soon as you trigger a dataset generation job.

### 5. Helpful npm scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server with hot reload. |
| `npm run build` | Production build (includes lint & type checks in CI). |
| `npm run lint` | ESLint via Next.js config. |
| `npm run typecheck` | `tsc --noEmit` for schema drift detection. |
| `npm run setup:db` | Executes `scripts/setup-database.js`. |

## Environment Variables

Create `.env.local` for the Next.js runtime:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...(server-side usage)

# AI & search
GOOGLE_GEMINI_API_KEYS=key1,key2,key3   # GeminiService rotates on errors
SERPAPI_KEY=...
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=tngtech/deepseek-r1t2-chimera:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Scraping + ancillary services
CRAWL4AI_SERVICE_URL=http://localhost:8000
PY_TRAINER_API_KEY=...
PY_TRAINER_BASE_URL=http://localhost:8001

# App config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Notes**
- `GOOGLE_GEMINI_API_KEYS` accepts comma/space/semicolon-separated keys; the service auto-rotates when it encounters 429/401/403 or quota issues.
- Keep Supabase service-role keys on the server only (never expose in the browser bundle).
- When using optional providers (OpenAI, additional SERP vendors), extend this list accordingly.

## Database & Supabase Configuration

1. **Create a project** – choose nearest region, capture the database password.
2. **Apply schema** – run the statements in `supabase-complete-schema.sql` through the SQL editor or `npm run setup:db` locally.
3. **Auth settings** – set `Site URL` to `http://localhost:3000` for dev and add `/auth/callback` to Redirect URLs.
4. **Storage** – ensure the `datasets` bucket exists (private). The schema script creates it automatically; otherwise create it manually.
5. **RLS** – policies shipped in the SQL file enforce per-user dataset access. Confirm they are enabled before onboarding real users.

## Crawl4AI Python Service

Located in `server/crawl4ai_service/`. For local dev:

```bash
cd server/crawl4ai_service
python -m venv .venv
source .venv/Scripts/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py  # listens on PORT (default 8000)
```

Expose the URL through `CRAWL4AI_SERVICE_URL`. Production deployments have run successfully on Railway, Render, AWS EC2, or Docker. Whatever platform you choose, ensure Chrome/Playwright dependencies, port forwarding, and health checks are configured; the Next.js route expects JSON responses and will retry failed batches automatically.

## Developer Tooling & Scripts

- `scripts/debug-save.js` – persist AI responses or scraped payloads for offline inspection.
- `scripts/test-gemini-integration.ts` – verifies Gemini key rotation + JSON parsing before running full jobs.
- `scripts/setup-database.js` – seeds Supabase tables/ buckets and prints helpful credentials.
- `scripts/test-database.js` – quick connectivity smoke test.

These scripts assume Node 18+ and the env vars documented above.

## Deployment Checklist

### Pre-deploy
1. `npm run build` (ensures lint, typecheck, Next build success).
2. Confirm Supabase schema and storage buckets exist in target env.
3. Configure env vars on Vercel (or your host) + Python services.
4. Validate Crawl4AI endpoint accessibility from the deployed Next.js runtime.

### Post-deploy
1. Hit `/api/health` (if exposed) or run a sample dataset job to ensure SSE + pipeline.
2. Verify authentication + protected routes.
3. Confirm Supabase rows/files are created when saving datasets.
4. Review logs for Gemini/SerpAPI quota warnings.

## Troubleshooting

| Issue | Checks |
| --- | --- |
| **“Database tables not set up”** | Ensure `supabase-complete-schema.sql` ran; check Table Editor for `generated_datasets` and row-level policies. |
| **Authentication failures** | Double-check `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, redirect URLs, and Supabase email templates. |
| **Scrape count stays at 0** | Verify Crawl4AI service port, inspect its logs, ensure URLs aren’t blocked (Google SERP/social). |
| **AI JSON parsing errors** | Confirm OpenRouter key, inspect `temp/ai-raw-response-*.json`, and rerun job; SimpleAI fallback parsers usually recover malformed responses. |
| **429 or quota errors** | Add more Gemini keys or lower concurrency; rotation happens automatically once keys are provided. |

### Debug Tips
- Watch terminal output from `npm run dev` for pipeline phase logs.
- Inspect `/temp/chunks` and `/temp/analyzed` to confirm AI outputs are being saved.
- Use `scripts/test-gemini-integration.ts` before production deploys to catch invalid keys early.

---

Synthara keeps AI-driven dataset generation transparent: every phase is logged, cached, and auditable so you can trace which sources informed each row. Happy scraping!