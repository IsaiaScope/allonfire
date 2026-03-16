# n8n Topic Discovery Workflow

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
  Collector → Deduplicate by URL → AI Classification (Claude Haiku) → Filter (relevance ≥ 0.5) → POST to webhook
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
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude Haiku classification | `sk-ant-...` |
| `ALLONFIRE_WEBHOOK_URL` | Base URL of the AllOnFire social app | `https://social.allonfire.com` |
| `ALLONFIRE_API_KEY` | API key matching `ALLONFIRE_API_KEY` env var in the social app | `your-secret-key` |

After adding env vars, redeploy the n8n service in Dokploy for them to take effect.

### 3. Test the Workflow

1. Open the workflow in n8n
2. Click **Test Workflow** (manual trigger)
3. Check the execution log — each source branch should return items
4. Verify AI classification output has `category`, `summary`, `relevance` per item
5. Confirm the webhook POST succeeds (check AllOnFire's `/discover` page)

### Expected Output

- **80-150 topics per day** depending on source activity (54 nodes)
- Each topic has: `title`, `summary` (AI-generated), `sourceUrl`, `sourceName`, `category`, `rawData`
- Categories: `NEWS`, `MEME_WORTHY`, `LEARNING`, `TOOL_RELEASE`, `AI_UPDATE`
- Items with relevance < 0.5 are filtered out

### Cost

- **Claude Haiku 4.5**: ~200-400 items/day × ~200 tokens each ≈ $0.03-0.06/day (~$1.50/month)
- **All data sources**: Free, no API keys required

## Existing Deployment Details

| Property | Value |
|----------|-------|
| Image | `docker.n8n.io/n8nio/n8n:2.10.2` |
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
- `ALLONFIRE_WEBHOOK_URL` → `http://host.docker.internal:3100`
- `ALLONFIRE_API_KEY` → same as your local app's `ALLONFIRE_API_KEY`
- `ANTHROPIC_API_KEY` → your Anthropic key

## Monitoring

- **n8n execution history**: Shows each run's success/failure per node
- **AllOnFire WebhookLog**: Check via Adminer (`db.isaiariva.com`) for POST delivery status
- **Beszel** (`monitor.isaiariva.com`): System-level metrics
- **Backups**: n8n data is included in the daily encrypted S3 backup pipeline
