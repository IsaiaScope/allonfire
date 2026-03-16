# Topic Discovery Workflow — How It Works

Visual map of every node in `workflows/topic-discovery.json`, what it does, and why.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               Daily 6 AM UTC (cron trigger)                             │
└──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──────────────────┘
   │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │
   │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  23 source nodes
   ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  fire in parallel
   │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │
   │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │
   ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼
 ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ...
 │ HN API    │ │ Dev.to   │ │ RSS Core │ │ AI Blogs │ │ Reddit   │ │ YouTube  │
 │ (4 nodes) │ │ (3+map)  │ │ (5+map)  │ │ (4+map)  │ │ (3+map)  │ │ (2+map)  │
 └─────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
       │             │            │             │            │             │
       ▼             ▼            ▼             ▼            ▼             ▼
 ┌──────────────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐
 │  Collect API Items   │  │ Collect RSS  │  │ Collect  │  │ Collect Social   │
 │  (HN + Dev.to)       │  │  Items       │  │ Scraped  │  │ Items (PH +      │
 │                      │  │ (RSS + AI    │  │ Items    │  │ Reddit + YouTube)│
 │                      │  │ Blogs + News)│  │ (GitHub) │  │                  │
 └──────────┬───────────┘  └──────┬───────┘  └────┬─────┘  └────────┬─────────┘
            │                     │                │                 │
            └──────────┬──────────┴────────┬───────┘                 │
                       │                   │                         │
                       ▼                   ▼                         │
                 ┌─────────────────────────────────────┐             │
                 │        Merge All Collections        │◄────────────┘
                 │     (filters _empty sentinels)      │
                 └─────────────────┬───────────────────┘
                                   ▼
                          ┌──────────────┐
                          │   Remove     │
                          │  Duplicates  │
                          │ (by URL)     │
                          └──────┬───────┘
                                 ▼
                          ┌──────────────┐
                          │ Batch for AI │
                          │(groups of 10)│
                          └──────┬───────┘
                                 ▼
                          ┌──────────────┐
                          │ AI Classify  │
                          │(Claude Haiku)│
                          └──────┬───────┘
                                 ▼
                          ┌──────────────┐
                          │Parse AI &    │
                          │Filter <0.5   │
                          └──────┬───────┘
                                 ▼
                          ┌──────────────┐
                          │Filter Empty  │
                          └──────┬───────┘
                                 ▼
                          ┌──────────────┐
                          │Build Webhook │
                          │Payload (x20) │
                          └──────┬───────┘
                                 ▼
                          ┌──────────────┐
                          │POST to       │
                          │AllOnFire     │
                          │Webhook       │
                          └──────┬───────┘
                                 ▼
                          ┌──────────────┐
                          │  Execution   │
                          │  Summary     │
                          └──────────────┘
```

---

## Phase 1: Data Collection (9 parallel branches)

All 23 source nodes fire simultaneously from the schedule trigger. Each has `continueOnFail: true` — if one source goes down, the rest still deliver topics. Multiple source nodes connect directly to the same mapper Code node; n8n automatically merges items arriving on the same input.

### Branch 1: Hacker News (4 nodes)

| Node | Type | What it does |
|------|------|-------------|
| **HN Top Story IDs** | HTTP Request | Calls `https://hacker-news.firebaseio.com/v0/topstories.json` — returns an array of ~500 story IDs, sorted by ranking |
| **HN Take Top 30** | Code | Slices the first 30 IDs. We don't need 500 stories — the top 30 are the highest-signal items |
| **HN Fetch Item** | HTTP Request | For each of the 30 IDs, calls `/v0/item/{id}.json` to get the full story object (title, URL, score, author, comment count). n8n automatically runs this once per item |
| **HN Map to Topic** | Code | Transforms HN's format into our standard topic shape. Filters out "Ask HN" and "Show HN" posts that have no external URL. Stores HN-specific metadata (score, author, comment count, HN discussion link) in `rawData` |

**Why two API calls?** The HN Firebase API is intentionally minimal — `/topstories.json` returns only IDs for efficiency. You fetch details per item. This is by design to keep the endpoint fast for all consumers.

### Branch 2: Dev.to (4 nodes)

| Node | Type | What it does |
|------|------|-------------|
| **Dev.to Top Articles** | HTTP Request | `GET /api/articles?top=1&per_page=15` — top 15 articles of the day, all tags |
| **Dev.to AI Tag** | HTTP Request | `GET /api/articles?tag=ai&top=1&per_page=10` — top 10 AI-tagged articles |
| **Dev.to WebDev Tag** | HTTP Request | `GET /api/articles?tag=webdev&top=1&per_page=10` — top 10 webdev-tagged articles |
| **Dev.to Map to Topic** | Code | All 3 source nodes connect directly to this mapper. n8n merges items arriving on the same input automatically. Transforms to topic shape. Uses `description` as summary. Stores tags, reaction count, reading time, and author in `rawData` |

**Why 3 separate requests?** Dev.to's API doesn't support multi-tag queries. Fetching by tag ensures we catch AI and webdev articles that might not rank in the overall top 15.

**Why no Merge nodes?** The old workflow used a binary merge tree (2 Merge nodes) to combine the 3 Dev.to responses. In this version, all 3 source nodes connect directly to the same Code node input — n8n concatenates items arriving on the same input port, eliminating the need for explicit Merge nodes.

### Branch 3: RSS Feeds (6 nodes)

| Node | Type | What it does |
|------|------|-------------|
| **RSS HN 100+ Points** | RSS Feed Read | `hnrss.org/newest?points=100` — HN stories with 100+ upvotes. Catches items that the top-30 API list might miss (e.g., stories that peaked overnight) |
| **RSS TechCrunch AI** | RSS Feed Read | TechCrunch's AI category feed |
| **RSS The Verge AI** | RSS Feed Read | The Verge's AI section feed |
| **RSS OpenAI Blog** | RSS Feed Read | OpenAI's official blog — catches model releases and research papers |
| **RSS Ars Technica** | RSS Feed Read | Ars Technica technology lab feed |
| **RSS Map to Topic** | Code | All 5 RSS nodes connect directly to this mapper. Auto-detects `sourceName` from the URL domain (e.g., `techcrunch.com` -> "TechCrunch"). Extracts `pubDate`, `creator`, and `categories` into `rawData` |

### Branch 4: AI Company Blogs (5 nodes) — NEW

| Node | Type | What it does |
|------|------|-------------|
| **AI Blog DeepMind** | RSS Feed Read | `deepmind.google/blog/rss.xml` — Google DeepMind research blog |
| **AI Blog Google AI** | RSS Feed Read | `blog.google/technology/ai/rss/` — Google AI product blog |
| **AI Blog Hugging Face** | RSS Feed Read | `huggingface.co/blog/feed.xml` — Hugging Face releases and tutorials |
| **AI Blog Cohere** | RSS Feed Read | `cohere.com/blog/rss.xml` — Cohere enterprise AI blog |
| **AI Blogs Map to Topic** | Code | All 4 blog nodes connect directly to this mapper. Auto-detects `sourceName` from the URL domain. Extracts `pubDate`, `creator`, and `categories` into `rawData` |

**Why dedicated AI blogs?** These companies publish model releases, benchmarks, and research papers that are high-signal for an AI audience but rarely appear on general tech news sites within the first 24 hours.

### Branch 5: GitHub Trending (3 nodes)

| Node | Type | What it does |
|------|------|-------------|
| **GitHub Trending HTML** | HTTP Request | Fetches `https://github.com/trending?since=daily` as raw HTML text. GitHub has no official trending API |
| **GitHub Extract Repos** | Code | Parses the HTML with regex to extract repo name, description, language, and today's star count. Takes top 10. Has a fallback regex if GitHub changes their HTML structure — tries a simpler pattern that just grabs repo paths |
| **GitHub Filter Empty** | Filter | If parsing found zero repos (HTML structure changed entirely), drops the `_skip` sentinel item so empty results don't pollute downstream |

**Why HTML scraping?** GitHub deliberately has no trending API. The HTML structure changes occasionally, which is why the code has a primary regex and a fallback. If both fail, the branch gracefully produces zero items instead of crashing.

### Branch 6: Product Hunt (2 nodes)

| Node | Type | What it does |
|------|------|-------------|
| **Product Hunt RSS** | RSS Feed Read | `producthunt.com/feed` — daily product launches |
| **PH Map to Topic** | Code | Takes first 10 items, maps to topic shape. Stores tagline and publish date in `rawData` |

**Why RSS instead of the API?** Product Hunt's GraphQL API requires OAuth and restricts commercial use. The RSS feed is free and public.

### Branch 7: Reddit (4 nodes) — NEW

| Node | Type | What it does |
|------|------|-------------|
| **Reddit r/LocalLLaMA** | HTTP Request | `reddit.com/r/LocalLLaMA/top.json?t=day&limit=10` — top 10 daily posts from the local AI community. Sends `User-Agent: AllOnFire/1.0` header (required by Reddit's API) |
| **Reddit r/MachineLearning** | HTTP Request | `reddit.com/r/MachineLearning/top.json?t=day&limit=10` — top 10 daily posts from the academic ML community |
| **Reddit r/ProgrammerHumor** | HTTP Request | `reddit.com/r/ProgrammerHumor/top.json?t=day&limit=5` — top 5 daily memes for the MEME_WORTHY category |
| **Reddit Map to Topic** | Code | All 3 subreddit nodes connect directly to this mapper. Extracts posts from Reddit's JSON API `data.children` array. Uses `selftext` (truncated to 280 chars) as summary. Falls back to permalink if `url` is a relative Reddit link. Stores score, comment count, subreddit, and permalink in `rawData` |

**Why the public JSON API?** Reddit's JSON endpoints (`/top.json`) require no authentication — just a User-Agent header. This avoids OAuth complexity while staying within rate limits for a once-daily workflow.

### Branch 8: YouTube (3 nodes) — NEW

| Node | Type | What it does |
|------|------|-------------|
| **YouTube Fireship** | RSS Feed Read | YouTube RSS feed for Fireship (channel `UCsBjURrPoezykLs9EqgamOA`) — short-form tech explainers |
| **YouTube Two Minute Papers** | RSS Feed Read | YouTube RSS feed for Two Minute Papers (channel `UCbfYPyITQ-7l4upoX8nvctg`) — AI research summaries |
| **YouTube Map to Topic** | Code | Both channels connect directly to this mapper. Takes first 10 items. Extracts `pubDate` and `author` into `rawData` |

**Why YouTube RSS?** YouTube provides public Atom feeds per channel at `youtube.com/feeds/videos.xml?channel_id=...`. No API key needed, no quota limits for read-only RSS.

### Branch 9: Additional News (4 nodes) — NEW

| Node | Type | What it does |
|------|------|-------------|
| **VentureBeat AI RSS** | RSS Feed Read | `venturebeat.com/category/ai/feed/` — enterprise AI news |
| **Techmeme RSS** | RSS Feed Read | `techmeme.com/feed.xml` — tech news aggregator (curated, high signal) |
| **Lobsters AI RSS** | RSS Feed Read | `lobste.rs/t/ai.rss` — community-curated AI links (similar to HN but smaller, more technical) |
| **News Map to Topic** | Code | All 3 news nodes connect directly to this mapper. Auto-detects `sourceName` from the URL domain. Extracts `pubDate`, `creator`, and `categories` into `rawData` |

---

## Phase 2: Collect & Merge (5 nodes)

```
HN Map to Topic ──────────┐
Dev.to Map to Topic ──────┤
                          ▼
                   Collect API Items ──────────┐
                                               │
RSS Map to Topic ─────────┐                    │
AI Blogs Map to Topic ────┤                    │
News Map to Topic ────────┤                    │
                          ▼                    │
                   Collect RSS Items ──────────┤
                                               ├──▶ Merge All Collections
GitHub Filter Empty ──────┐                    │
                          ▼                    │
                   Collect Scraped Items ──────┤
                                               │
PH Map to Topic ──────────┐                   │
Reddit Map to Topic ──────┤                    │
YouTube Map to Topic ─────┤                    │
                          ▼                    │
                   Collect Social Items ───────┘
```

The old workflow used a binary merge tree of 10 Merge nodes to combine sources. This version replaces that with **4 Code "Collector" nodes** grouped by source type, plus **1 "Merge All Collections" Code node**.

| Node | Type | Inputs | What it does |
|------|------|--------|-------------|
| **Collect API Items** | Code | HN Map, Dev.to Map | Filters out error/skip/empty items, validates `title` and `sourceUrl` exist. Returns `[{ _empty: true }]` sentinel if all inputs are empty |
| **Collect RSS Items** | Code | RSS Map, AI Blogs Map, News Map | Same filtering logic for all RSS-sourced items |
| **Collect Scraped Items** | Code | GitHub Filter Empty | Same filtering logic for HTML-scraped items |
| **Collect Social Items** | Code | PH Map, Reddit Map, YouTube Map | Same filtering logic for social platform items |
| **Merge All Collections** | Code | All 4 collectors | Combines all collector outputs into a single stream. Filters out `_empty` sentinels from collectors that produced zero items |

**Why Collector nodes instead of Merge nodes?** n8n's built-in Merge node only accepts 2 inputs and requires careful configuration. The Collector pattern uses Code nodes that accept multiple connections on the same input — n8n concatenates items automatically. Each Collector validates and filters its inputs, and the final Merge All node simply strips empty sentinels. This reduces 10 Merge nodes to 5 Code nodes and is easier to extend when adding new sources.

At this point we have ~80-150 raw items.

---

## Phase 3: Deduplication (1 node)

| Node | Type | What it does |
|------|------|-------------|
| **Remove Duplicates** | Remove Duplicates | Deduplicates by `sourceUrl`. The same article often appears in multiple sources — e.g., a viral HN post also shows up in the HN RSS feed, or a TechCrunch article gets posted to Dev.to |

This is layer 1 of 2 deduplication. Layer 2 happens at the database level — the `ingestTopics()` service checks `sourceUrl` uniqueness before inserting.

---

## Phase 4: AI Classification (3 nodes)

| Node | Type | What it does |
|------|------|-------------|
| **Batch for AI (groups of 10)** | Code | Groups items into batches of 10. Serializes each batch as a JSON string of `{index, title, summary, source, url}` objects. Also carries `originalItems` forward so we can reconstruct the full topic shape after classification |
| **AI Classify (Claude Haiku)** | HTTP Request | POST to `https://api.anthropic.com/v1/messages` with Claude Haiku 4.5. Sends all 10 articles in a single prompt. Asks for: `category` (one of 5 enums), `summary` (max 280 chars), `relevance` (0.0-1.0). Uses `$env.ANTHROPIC_API_KEY` from n8n's environment. 30-second timeout per request |
| **Parse AI & Filter Low Relevance** | Code | Parses Claude's JSON response. Prepends `[` to the response (since the assistant prefill already started the array). Appends `]` if needed. Validates categories against the 5 allowed values (defaults to NEWS if invalid). **Drops items with relevance < 0.5** — this is the quality gate that filters noise. If AI parsing fails entirely, falls back to assigning NEWS category with 0.6 relevance |

**Why batch by 10?** Sending all 100+ items in one prompt would exceed context limits and produce unreliable JSON. Groups of 10 keep each prompt focused and the response parseable. With ~8-15 batches, this means ~8-15 API calls per run.

**Why raw HTTP instead of n8n's AI nodes?** The workflow uses a direct HTTP POST to the Anthropic API instead of n8n's built-in LangChain nodes. This means the `ANTHROPIC_API_KEY` lives in n8n's environment variables (set in Dokploy), making the workflow fully portable — import the JSON file and set 3 env vars, done. No credential configuration in n8n's UI required.

**Cost**: ~80-150 items/day, ~200 tokens per item = ~30K-50K tokens/day. Claude Haiku 4.5 pricing: $0.80/1M input + $4/1M output = **~$0.03-0.05/day (~$1.50/month)**.

### The AI Prompt

The prompt uses a **system + user + assistant prefill** pattern for reliable JSON output.

**System message:**

```
You are a content curator for AllOnFire, a tech/AI social media platform.
You classify articles into exactly one category and score relevance.

Categories:
- NEWS:         Industry news, acquisitions, regulations, market moves
- MEME_WORTHY:  Dev humor, relatable content, viral-potential programming culture
- LEARNING:     Tutorials, best practices, educational deep-dives
- TOOL_RELEASE: New tools, frameworks, libraries, major version releases
- AI_UPDATE:    AI model releases, research breakthroughs, AI product updates

Scoring guide:
- 0.9-1.0: Breaking news, major releases, viral content
- 0.7-0.8: Interesting to most developers or AI practitioners
- 0.5-0.6: Niche but valuable to some audience segment
- Below 0.5: Off-topic, low-quality, or duplicate content
```

**User message:**

```
Classify these articles as JSON array. Each object needs "index", "category",
"summary" (max 280 chars, engaging), "relevance" (0.0-1.0).

{{ $json.articles }}
```

**Assistant prefill:**

```
[
```

The assistant prefill `[` forces Claude to immediately start outputting a JSON array, preventing preamble text or markdown fencing. The Parse node prepends `[` back to reconstruct valid JSON.

These categories match the `TopicCategory` enum in the Prisma schema exactly.

---

## Phase 5: Delivery (3 nodes)

| Node | Type | What it does |
|------|------|-------------|
| **Filter Empty Results** | Filter | Safety net — drops the `_empty` sentinel if AI classification produced zero results |
| **Build Webhook Payload (groups of 20)** | Code | Groups classified topics into batches of 20 for the webhook payload. The webhook expects `{ topics: [...] }` |
| **POST to AllOnFire Webhook** | HTTP Request | `POST {{ $env.ALLONFIRE_WEBHOOK_URL }}/api/webhooks/topics` with `X-API-Key` header. 15-second timeout. The social app's endpoint validates the key, runs Zod schema validation, deduplicates against existing database records, and creates new Topic rows |

**Webhook response:**
```json
{
  "ingested": 15,
  "duplicatesSkipped": 5
}
```

---

## Phase 6: Execution Summary (1 node) — NEW

| Node | Type | What it does |
|------|------|-------------|
| **Execution Summary** | Code | Aggregates results from all webhook POST responses. Logs total `ingested`, total `duplicatesSkipped`, any errors, a timestamp, and the number of webhook batches sent. This output appears in the n8n execution log for monitoring |

**Sample output:**
```json
{
  "timestamp": "2026-03-14T06:05:23.000Z",
  "webhookBatches": 3,
  "totalIngested": 42,
  "totalDuplicatesSkipped": 18,
  "errors": []
}
```

---

## Error Handling Strategy

| Layer | Mechanism |
|-------|-----------|
| **Per source** | `continueOnFail: true` on every source node — one failing API doesn't block others |
| **Collector validation** | Each Collector Code node filters out items with `error`, `_skip`, or missing `title`/`sourceUrl` fields |
| **Empty sentinels** | Collectors that receive zero valid items return `[{ _empty: true }]` — the Merge All node strips these so empty branches don't crash downstream |
| **AI fallback** | If Claude's response can't be parsed as JSON, items get default category NEWS with relevance 0.6 (still delivered) |
| **Category validation** | If Claude returns an invalid category, defaults to NEWS |
| **Relevance filter** | Items scoring < 0.5 are dropped — prevents low-quality content from entering the system |
| **Database dedup** | `ingestTopics()` checks `sourceUrl` uniqueness — same URL won't create duplicate Topic rows across runs |
| **Webhook logging** | Every POST is logged to the `WebhookLog` table with status, payload size, and response |
| **Execution Summary** | Aggregates errors across all webhook batches for easy monitoring in the n8n execution log |

---

## Data Shape Through the Pipeline

### After source nodes (raw)
```json
{
  "title": "Show HN: I built a GPU-accelerated terminal",
  "summary": "Show HN: I built a GPU-accelerated terminal",
  "sourceUrl": "https://github.com/user/repo",
  "sourceName": "Hacker News",
  "rawData": {
    "score": 342,
    "by": "username",
    "commentCount": 89,
    "hnUrl": "https://news.ycombinator.com/item?id=12345"
  }
}
```

### After AI classification (enriched)
```json
{
  "title": "Show HN: I built a GPU-accelerated terminal",
  "summary": "A new GPU-rendered terminal emulator achieves 120fps scrolling with WebGPU, making traditional terminals feel sluggish by comparison.",
  "sourceUrl": "https://github.com/user/repo",
  "sourceName": "Hacker News",
  "category": "TOOL_RELEASE",
  "rawData": {
    "score": 342,
    "by": "username",
    "commentCount": 89,
    "hnUrl": "https://news.ycombinator.com/item?id=12345",
    "aiRelevance": 0.9
  }
}
```

The AI replaces the raw `summary` (which was just the title) with an engaging 280-char summary, assigns a category, and the relevance score is stored in `rawData.aiRelevance` for later analysis.

---

## Canvas Organization

The workflow includes 5 Sticky Note nodes for visual grouping in the n8n editor:

| Sticky Note | Color | What it covers |
|-------------|-------|----------------|
| **Data Sources** | Blue | All 9 source branches (23 source nodes + 9 mapper nodes) |
| **Merge & Dedup** | Green | 4 Collector nodes + Merge All + Remove Duplicates |
| **AI Classification** | Purple | Batch + Classify + Parse nodes |
| **Delivery** | Yellow | Filter + Payload + POST nodes |
| **Execution Summary** | Orange | Summary node |

---

## Environment Variables

Set these in the n8n service environment (Dokploy panel):

| Variable | Used by | Purpose |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | AI Classify node | Authenticates with Claude API |
| `ALLONFIRE_WEBHOOK_URL` | POST node | Base URL of the social app (e.g., `https://social.allonfire.com`) |
| `ALLONFIRE_API_KEY` | POST node | Matches the `ALLONFIRE_API_KEY` env var in the social app |

---

## Node Count Summary

| Phase | Nodes | Purpose |
|-------|-------|---------|
| Trigger | 1 | Daily schedule |
| Hacker News | 4 | API fetch + slice + per-item fetch + transform |
| Dev.to | 4 | 3 API calls + transform (no merge nodes needed) |
| RSS Feeds | 6 | 5 feeds + transform |
| AI Company Blogs | 5 | 4 feeds + transform |
| GitHub Trending | 3 | Fetch HTML + parse + filter |
| Product Hunt | 2 | RSS + transform |
| Reddit | 4 | 3 subreddits + transform |
| YouTube | 3 | 2 channels + transform |
| Additional News | 4 | 3 feeds + transform |
| Collection & merging | 5 | 4 Collectors + Merge All |
| Deduplication | 1 | By sourceUrl |
| AI classification | 3 | Batch + classify + parse |
| Delivery | 3 | Filter + batch + POST |
| Summary | 1 | Execution logging |
| Sticky Notes | 5 | Canvas organization |
| **Total** | **54** | |

---

## Local Development

### Prerequisites

- Docker running
- The AllOnFire social app running locally on port 3100 (`pnpm dev --filter @allonfire/social`)
- `ALLONFIRE_API_KEY` set in the social app's `.env` file

### 1. Start n8n locally

```bash
cd docker
docker compose -f docker-compose.dev.yml up n8n -d
```

This starts n8n at `http://localhost:5678` backed by the same local PostgreSQL used by the social app.

On first visit, n8n will ask you to create an owner account — use any email/password for local dev.

### 2. Set your Anthropic key

The `ANTHROPIC_API_KEY` is read from your shell environment via `${ANTHROPIC_API_KEY:-}` in docker-compose. Either:

- Export it before starting: `export ANTHROPIC_API_KEY=sk-ant-... && docker compose -f docker-compose.dev.yml up n8n -d`
- Or add it to a `.env` file in the `docker/` directory

### 3. Import the workflow

1. Open `http://localhost:5678`
2. Go to **Workflows** -> **Import from File**
3. Select `n8n/workflows/topic-discovery.json`
4. Save

### 4. Set the ALLONFIRE_API_KEY

The local n8n defaults to `dev-api-key` for `ALLONFIRE_API_KEY`. Make sure your social app's `.env` has the same value:

```
ALLONFIRE_API_KEY=dev-api-key
```

### 5. Test the workflow

Click **Test Workflow** in the n8n UI. Watch the execution — each node shows its input/output.

**What to check:**
- Source branches return items (click each "Map to Topic" node to see transformed data)
- Collector nodes show the correct item counts per source group
- AI classification returns valid JSON with categories and relevance scores
- The webhook POST returns `{ "ingested": N, "duplicatesSkipped": M }`
- Execution Summary shows aggregated totals
- New topics appear at `http://localhost:3100/discover`

### How local networking works

```
┌──────────────────────────────┐
│ Docker network               │
│                              │
│  n8n (:5678)                 │
│    │                         │
│    │ DB_POSTGRESDB_HOST=     │
│    │ "postgres"              │
│    ▼                         │
│  postgres (:5432)            │
│                              │
│    │ ALLONFIRE_WEBHOOK_URL=  │
│    │ "host.docker.internal"  │
│    ▼                         │
└────┼─────────────────────────┘
     │
     ▼
  Your Mac (:3100)
  └── Next.js social app
```

- **n8n -> PostgreSQL**: Uses Docker's internal DNS (`postgres` hostname resolves to the postgres container)
- **n8n -> Social app**: Uses `host.docker.internal:3100` — Docker's special DNS that resolves to your Mac's localhost, where the Next.js dev server runs
- **Browser -> n8n**: `localhost:5678` via port mapping

### Troubleshooting

| Problem | Fix |
|---------|-----|
| n8n can't reach the social app | Make sure the social app is running on port 3100. On Linux, `host.docker.internal` may not work — use `172.17.0.1` instead |
| AI classification returns errors | Check that `ANTHROPIC_API_KEY` is set. Click the "AI Classify" node to see the raw API response |
| Webhook returns 401 | `ALLONFIRE_API_KEY` mismatch between n8n env and social app `.env` |
| Webhook returns 500 "API key not configured" | Add `ALLONFIRE_API_KEY=dev-api-key` to `apps/social/.env` |
| Reddit returns 429 | Reddit rate-limits unauthenticated requests. The workflow runs once daily so this is rare — if testing repeatedly, wait 60 seconds between runs |
| n8n won't start | Check `docker logs allonfire-n8n-1` — usually a PostgreSQL connection issue. Make sure postgres is healthy first |
