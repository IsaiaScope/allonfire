# n8n Topic Discovery Workflow

> **Status: parked.** The Social app was retired on 2026-07-29. This workflow is
> present but inactive: Phase 4 posts to `/api/classify-topics`, an endpoint the
> deleted social app served and no surviving app provides. The n8n instance, its
> `n8n-data` volume, and these workflow definitions are deliberately kept — the
> 57 nodes of collection and ranking logic stay valuable if content automation
> returns. Reactivating it requires repointing the classification call first.
>
> Everything below that describes app-side integration is historical: the
> endpoints (`/api/classify-topics`, `/api/rerank-and-prune`, `/api/webhooks/*`),
> the `/discover` and `/admin/providers` pages, and the `WebhookLog` model no
> longer exist. Treat this document as a reference for the workflow shape, not as
> a working integration guide.

Automated daily scraping of 9 high-signal tech/AI sources, classified by AI and ingested into AllOnFire.

## Architecture

```
Schedule (6 AM UTC daily)
  ├── Hacker News API (top 30 stories)
  ├── Dev.to API (top articles by tag: general, ai, webdev)
  ├── RSS Feeds (HN 100+pts, TechCrunch AI, The Verge AI, OpenAI Blog, Ars Technica)
  ├── GitHub Trending (daily, top 10 repos)
  ├── Product Hunt RSS (top 10 posts)
  ├── AI Company Blogs (DeepMind, Google AI, Hugging Face, Cohere RSS)
  ├── Reddit (r/LocalLLaMA, r/MachineLearning, r/ProgrammerHumor JSON API)
  ├── YouTube (Fireship, Two Minute Papers RSS)
  └── Additional News (VentureBeat AI, Techmeme, Lobsters AI RSS)
       │
       ▼
  Collector → Deduplicate by URL → Classify (batches of 50) → Rerank & Prune (top 5-10) → POST to webhook
```

Each source branch uses `continueOnFail: true` — a single failing API won't block others.

## Setup

n8n is already deployed at `https://n8n.isaiariva.com` via Dokploy on the Hetzner VPS (see Notion: "n8n Workflow Automation Deployment" for full server setup).

### 1. Import the Workflow

**Via n8n UI:**

1. Open `https://n8n.isaiariva.com` → **Workflows** → **Import from File**
2. Select `n8n/workflows/topic-discovery.json`
3. Save the workflow

**Via CLI (on the VPS):**

```bash
# Find the n8n container
docker ps --format '{{.Names}}' | grep n8n

# Copy workflow file and import
docker cp topic-discovery.json <CONTAINER>:/tmp/
docker exec <CONTAINER> n8n import:workflow --input=/tmp/topic-discovery.json
```

### 2. Configure Environment Variables

Add these to the n8n service environment in Dokploy (alongside existing vars):

| Variable | Description | Example |
|----------|-------------|---------|
| `N8N_WEBHOOK_BASE_URL` | Base URL of the AllOnFire social app — **dead**, the social app that served this base URL was removed | `https://social.allonfire.com` |
| `N8N_API_KEY` | Bearer token for n8n → app auth. Still used by the notification webhook; the social-app auth flow it also served is gone | `your-secret-key` |

After adding env vars, redeploy the n8n service in Dokploy for them to take effect.

### 3. Test the Workflow

1. Open the workflow in n8n
2. Click **Test Workflow** (manual trigger)
3. Check the execution log — each source branch should return items
4. Verify AI classification output has `category`, `summary`, `relevance` per item
5. Confirm the webhook POST succeeds — the `/discover` page that displayed this was deleted with the social app, so check the n8n execution log instead

### Expected Output

- **5-10 topics per day** — the pipeline collects ~150 raw items, classifies ~30-50 above the 0.85 relevance threshold, then the global reranker picks the top 5-10
- Each topic has: `title`, `summary` (AI-generated), `sourceUrl`, `sourceName`, `category`, `rawData`
- Categories: `NEWS`, `MEME_WORTHY`, `LEARNING`, `TOOL_RELEASE`, `AI_UPDATE`

### Cost

- **Classification + Reranking**: Handled server-side by the social app's `/api/classify-topics` and `/api/rerank-and-prune` endpoints. The AI provider API key is stored encrypted in the database (not in n8n) — configure it via the admin panel at `/admin/providers` **Both endpoints were deleted with the social app; no surviving app serves them.**
- **All data sources**: Free, no API keys required

## Authentication Architecture

The system uses two separate tokens — n8n only needs one of them:

| Token | Where Stored | Purpose | Used By |
|-------|-------------|---------|---------|
| `N8N_API_KEY` | Env var (n8n + social app) | Bearer token for n8n → app auth | All 6 n8n-facing API routes — **app side deleted** |
| AI Provider API Key | Database (AES-256-GCM encrypted) | AI model calls (Anthropic/OpenRouter/Gemini) | `/api/classify-topics`, `/api/rerank-and-prune` only |

n8n sends `Authorization: Bearer <N8N_API_KEY>` on every request. The social app validated this via `validateBearerToken()` in `apps/social/src/lib/api-auth.ts` (deleted with the social app). The proxy middleware (`apps/social/src/proxy.ts`, also deleted with the social app) bypassed session auth for these Bearer-protected routes:

- `POST /api/classify-topics` — AI classification (Bearer + AI provider key from DB)
- `POST /api/rerank-and-prune` — Global reranking + pruning (Bearer + AI provider key from DB)
- `POST /api/webhooks/topics` — Topic ingestion (Bearer only, no AI)
- `POST /api/webhooks/generate` — Triggers post generation (Bearer only)
- `GET /api/webhooks/notify` — Daily stats for notifications (Bearer only)
- `GET+PATCH /api/webhooks/publish` — Gets due posts & marks as published (Bearer only)

The AI provider API key is managed through the admin panel at `/admin/providers` and never exposed to n8n.

## Existing Deployment Details

| Property | Value |
|----------|-------|
| Image | `docker.n8n.io/n8nio/n8n:2.26.3` |
| Domain | `n8n.isaiariva.com` (HTTPS via Let's Encrypt) |
| Port | 5678 |
| Database | PostgreSQL on shared `dokploy-postgres` |
| Volume | `n8n-data` → `/home/node/.n8n` |
| Autodeploy | Off (pinned version) |

For full server setup, security, and backup details, see the Notion page: **"n8n Workflow Automation Deployment"** under Dokploy Setup.

## Local Development

The `docker/docker-compose.dev.yml` includes an n8n service for local testing:

```bash
cd docker
docker compose -f docker-compose.dev.yml up -d
```

n8n will be available at `http://localhost:5678` (admin/admin).

Set environment variables in n8n Settings → Variables:
- `N8N_WEBHOOK_BASE_URL` → `http://host.docker.internal:3100` (port 3100 was the social app; no surviving app listens there)
- `N8N_API_KEY` → same as your local app's `N8N_API_KEY`

## Monitoring

- **n8n execution history**: Shows each run's success/failure per node
- **AllOnFire WebhookLog**: the `WebhookLog` model was deleted with the social app; POST delivery status is now only in the n8n execution log
- **Beszel** (`monitor.isaiariva.com`): System-level metrics
- **Backups**: n8n data is included in the daily encrypted S3 backup pipeline
