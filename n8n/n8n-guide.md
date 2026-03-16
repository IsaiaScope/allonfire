# n8n Guide — Concepts & Source Catalog

Two parts: first, how n8n works (the concepts behind the workflow). Second, a curated catalog of every source worth scraping for AI news, dev culture, and learning content.

---

# Part 1: n8n Concepts

## What is n8n?

n8n is a workflow automation tool — think Zapier or Make.com but self-hosted and free. You connect **nodes** together to build data pipelines that run on a schedule or in response to events.

Our instance runs at `https://n8n.isaiariva.com` on the Hetzner VPS, managed by Dokploy.

## Core Concepts

### Nodes

A node is a single step in a workflow. Each node does one thing:

```
[HTTP Request] → [Code] → [Merge] → [Filter] → [HTTP Request]
```

There are ~400 built-in node types. The ones we use:

| Node Type | Icon | What it does | Our usage |
|-----------|------|-------------|-----------|
| **Schedule Trigger** | Clock | Starts the workflow on a cron schedule | Daily at 6 AM UTC |
| **HTTP Request** | Globe | Makes an API call (GET, POST, etc.) | Fetching HN, Dev.to, GitHub, calling Claude API, POSTing to webhook |
| **RSS Feed Read** | RSS icon | Reads an RSS/Atom feed and returns items | TechCrunch, The Verge, OpenAI Blog, Ars Technica, Product Hunt |
| **Code** | `</>` | Runs custom JavaScript | Transforming data, batching, parsing AI responses |
| **Merge** | Arrows joining | Combines items from 2 inputs into 1 stream | Merging source branches together |
| **Remove Duplicates** | Filter icon | Drops items with duplicate field values | Dedup by `sourceUrl` |
| **Filter** | Funnel | Keeps/drops items based on conditions | Dropping empty results |

### Items

n8n's fundamental data unit. Every node receives items and outputs items. An item is just a JSON object wrapped in `{ json: { ... } }`:

```javascript
// One item flowing through the pipeline
{
  json: {
    title: "GPT-5 Released",
    sourceUrl: "https://openai.com/gpt-5",
    sourceName: "OpenAI Blog"
  }
}
```

When a node receives 30 items, it processes all 30. Most nodes run once per item automatically (like HTTP Request — it makes one API call per item). Code nodes can access all items at once via `$input.all()`.

### Connections

Lines between nodes that define data flow. A connection carries items from one node's output to another node's input.

```
[Node A] ──items──▶ [Node B]
```

Key rules:
- One output can connect to many inputs (fan-out — our trigger connects to 11 source nodes)
- Merge nodes accept exactly 2 inputs (that's why we need merge trees)
- If a node outputs zero items, downstream nodes don't execute

### Expressions

Dynamic values inside node parameters, written as `{{ expression }}`:

```
{{ $json.title }}              → Current item's title field
{{ $json.id }}                 → Current item's id field
{{ $env.ANTHROPIC_API_KEY }}   → Environment variable
{{ $input.first().json }}      → First item from input
```

Used in our workflow for:
- Dynamic URLs: `https://hacker-news.firebaseio.com/v0/item/{{ $json.id }}.json`
- Environment vars: `{{ $env.ALLONFIRE_API_KEY }}`
- Template strings in the AI prompt: `{{ $json.articles }}`

### `continueOnFail`

When a node has `continueOnFail: true`, errors don't stop the workflow. The node outputs an error item instead and execution continues.

**Why this matters**: If GitHub changes their HTML and our scraper breaks, we still get topics from the other 4 sources. Without this flag, one broken source would kill the entire daily run.

```
Source 1 ✅ ──▶ ┐
Source 2 ❌ ──▶ ├──▶ Merge ──▶ continues with items from 1, 3, 4, 5
Source 3 ✅ ──▶ ┤
Source 4 ✅ ──▶ ┤
Source 5 ✅ ──▶ ┘
```

### Merge Nodes (why so many?)

The Merge node combines items from exactly **2 inputs**. It can't take 3+. So to merge 5 sources, we build a binary tree:

```
HN ──────┐
          ├──▶ Merge 1 ──┐
Dev.to ──┘                ├──▶ Merge 3 ──┐
                          │               ├──▶ Merge All
RSS ─────┐                │               │
          ├──▶ Merge 2 ──┘    PH ────────┘
GitHub ──┘
```

The `mode: "append"` setting means "concatenate all items from both inputs into one list" (not join/match).

### Code Nodes

Run custom JavaScript. Have access to:

```javascript
$input.all()         // Array of all input items
$input.first()       // First input item
$json                // Shortcut for current item's json (in single-item mode)

// Must return array of { json: { ... } } objects
return items.map(item => ({
  json: {
    title: item.json.title,
    transformed: true
  }
}));
```

We use Code nodes for:
- **Slicing** (take first 30 HN stories)
- **Transforming** (reshape API responses into our topic format)
- **Batching** (group 100 items into batches of 10 for AI processing)
- **Parsing** (extract JSON from Claude's response text)

### Environment Variables vs Credentials

Two ways to store secrets in n8n:

| | Environment Variables | Credentials |
|-|----------------------|-------------|
| **Set in** | Dokploy service config (server-level) | n8n UI (per-workflow) |
| **Access via** | `{{ $env.VAR_NAME }}` | Selected in node config dropdown |
| **Portable** | Yes — workflow JSON uses `$env` references | No — credential IDs are instance-specific |
| **Our choice** | This one | Not used |

We use env vars so the workflow JSON is fully portable — import it anywhere, set 3 env vars, done.

### Triggers vs Regular Nodes

- **Trigger nodes** start a workflow (schedule, webhook, event). Every workflow needs exactly one.
- **Regular nodes** process data. They only run when items flow into them.

Our trigger is `scheduleTrigger` set to `triggerAtHour: 6` (6 AM UTC daily). You can also click "Test Workflow" to trigger it manually.

### Execution Model

When the trigger fires:

1. n8n starts at the trigger node
2. Follows all connections simultaneously (parallel fan-out to all 11 source nodes)
3. Each branch runs independently until it hits a Merge node
4. Merge nodes wait for **both** inputs before proceeding
5. After the merge tree, execution is sequential: dedup → AI → filter → POST

Items flow through one node at a time. If a node outputs 30 items and the next node is HTTP Request, n8n makes 30 HTTP requests (one per item, with built-in concurrency).

---

# Part 2: Source Catalog

Every source worth scraping, organized by what kind of content it provides. Marked with what we already scrape vs what we could add.

## Currently Active Sources (in the workflow)

| Source | Type | Items/day | Categories it feeds |
|--------|------|-----------|-------------------|
| Hacker News API | API (free) | ~30 | NEWS, TOOL_RELEASE, LEARNING |
| Dev.to (3 tags) | API (free) | ~35 | LEARNING, TOOL_RELEASE |
| HN RSS 100+ pts | RSS | ~10-20 | NEWS, TOOL_RELEASE |
| TechCrunch AI | RSS | ~5-10 | NEWS, AI_UPDATE |
| The Verge AI | RSS | ~5-10 | NEWS, AI_UPDATE |
| OpenAI Blog | RSS | ~1-2 | AI_UPDATE |
| Ars Technica | RSS | ~5-10 | NEWS, LEARNING |
| GitHub Trending | Scrape | 10 | TOOL_RELEASE |
| Product Hunt | RSS | 10 | TOOL_RELEASE |

**Total: ~110-140 items/day → ~40-80 after dedup + relevance filter**

---

## AI Company Blogs (official announcements, model releases)

These are the primary sources for AI_UPDATE category. When a company drops a new model or feature, this is where it appears first — often hours before news sites pick it up.

| Source | Feed URL | Auth | Status | Content |
|--------|----------|------|--------|---------|
| **OpenAI Blog** | `https://blog.openai.com/rss/` | None | Verified | Model releases, research, product updates |
| **Anthropic Blog** | No official RSS — use community feed: `https://raw.githubusercontent.com/taobojlen/anthropic-rss-feed/main/anthropic_news_rss.xml` | None | Community | Claude updates, safety research |
| **Google DeepMind** | `https://deepmind.google/blog/rss.xml` | None | Verified | Research papers, model announcements |
| **Google AI (blog.google)** | `https://blog.google/technology/ai/rss/` | None | Verified | Product-level AI (Gemini etc.) |
| **Meta AI Blog** | No official RSS — would need RSSHub or scraping of `https://ai.meta.com/blog/` | N/A | No feed | Llama releases, FAIR research |
| **Microsoft Research** | `https://www.microsoft.com/en-us/research/blog/feed/` | None | Verified | Azure AI, Copilot, research papers |
| **Microsoft AI (Tech Community)** | `https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=AIPlatformBlog` | None | Verified | AI Platform updates |
| **Hugging Face Blog** | `https://huggingface.co/blog/feed.xml` | None | Verified | Open-source models, library updates |
| **Mistral Blog** | No confirmed official RSS — blog at `https://mistral.ai/news` | N/A | No feed | Mistral/Mixtral releases |
| **Cohere Blog** | `https://txt.cohere.ai/rss/` | None | Verified | Enterprise AI, embeddings, RAG |
| **Vercel Blog** | `https://vercel.com/blog/rss.xml` | None | Likely | AI SDK, Next.js AI integrations |
| **Supabase Blog** | `https://supabase.com/blog/rss.xml` | None | Likely | Vector embeddings, pg_vector |

**Why these matter**: If you want to know about a new Claude model or Llama release *the day it drops*, these RSS feeds are the fastest source — faster than news sites, faster than social media aggregators. The OpenAI blog is already in our workflow; the others are gaps.

**Note on missing feeds**: Anthropic, Meta AI, and Mistral don't publish official RSS. For Anthropic, a community-maintained GitHub feed scrapes the site daily. For Meta and Mistral, we'd need to either use [RSSHub](https://docs.rsshub.app/) (a community RSS generator for sites that don't have feeds) or build a simple scraper node.

**Priority additions**: Anthropic (community feed), Google DeepMind, Google AI, Hugging Face — these 4 cover 90% of major model releases.

---

## AI News Publications

Dedicated tech/AI journalism. Deeper coverage than company blogs — they analyze impact, compare models, and cover industry dynamics.

| Source | Feed URL | Auth | Content | Speed |
|--------|----------|------|---------|-------|
| **TechCrunch AI** | `https://techcrunch.com/category/artificial-intelligence/feed/` | None | Funding, launches, industry | Same-day |
| **The Verge AI** | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` | None | Consumer AI, policy, reviews | Same-day |
| **Ars Technica** | `https://feeds.arstechnica.com/arstechnica/technology-lab` | None | Deep tech analysis | Same-day |
| **VentureBeat AI** | `https://venturebeat.com/category/ai/feed/` | None | Enterprise AI, funding, analysis | Same-day |
| **MIT Tech Review** | `https://www.technologyreview.com/topic/artificial-intelligence/feed` | None | Research, ethics, long-form | Weekly |
| **Wired AI** | `https://www.wired.com/feed/tag/ai/latest/rss` | None | Culture, policy, features | Weekly |
| **IEEE Spectrum** | `https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss` | None | Technical deep-dives, robotics | Weekly |
| **Techmeme** | `https://www.techmeme.com/feed.xml` | None | Aggregator — top tech stories curated by editors | Real-time |
| **The Information** | Paywalled | Paid | Exclusive scoops, deals | Breaking |

**Priority additions**: VentureBeat (high volume, AI-focused), Techmeme (curated aggregator — like a human-filtered HN for tech news).

---

## AI Newsletters (via RSS)

Newsletters that curate and summarize the day's AI news. Great for catching things the raw feeds miss.

| Source | Feed URL | Auth | Status | Frequency | Content |
|--------|----------|------|--------|-----------|---------|
| **TLDR AI** | No official RSS — community feed: `https://bullrich.dev/tldr-rss/` | None | Community | Daily | Top 3-5 AI stories, concise summaries |
| **Import AI** | `https://importai.substack.com/feed` | None | Verified | Weekly | Research papers, policy, industry |
| **The Batch** (Andrew Ng) | No confirmed RSS — newsletter at `deeplearning.ai/the-batch/` | N/A | No feed | Weekly | AI research, industry analysis |
| **Ben's Bites** | On Beehiiv — exact RSS feed ID unconfirmed | N/A | Unverified | Daily | AI tools, launches, news |
| **The Rundown AI** | On Beehiiv — exact RSS feed ID unconfirmed | N/A | Unverified | Daily | Breaking AI news, tools |
| **AI Breakfast** | `https://aibreakfast.beehiiv.com/feed` | None | Likely | Daily | AI industry news digest |
| **Superhuman AI** | `https://www.joinsuperhuman.ai/feed` | None | Daily | AI productivity tips, tools |

**Why newsletters?** They act as a second filter. If a story appears in both a raw RSS feed AND a curated newsletter, it's almost certainly high-relevance. Could be used to boost relevance scores.

**Priority additions**: TLDR AI (daily, concise, high signal-to-noise), Ben's Bites (catches AI tools that other sources miss).

---

## YouTube Channels

YouTube RSS feeds work without any API key. Format: `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`

Each feed returns the latest ~15 videos with title, description, publish date, and thumbnail URL.

### AI News & Analysis

| Channel | Channel ID | Verified | Content | Frequency |
|---------|-----------|----------|---------|-----------|
| **Two Minute Papers** | `UCbfYPyITQ-7l4upoX8nvctg` | Yes | AI research explained visually | 2-3x/week |
| **AI Explained** | `UCNJ1Ymd5yFuUPtn21xtRbbw` | Yes | Deep analysis of AI developments | 2-3x/week |
| **Matthew Berman** | `UCMeV4Hb0Y8OGBnVTG2fJfTw` | Likely | AI model reviews, news | Daily |
| **Yannic Kilcher** | `UCZHmQk67mSJgfCCTn7xBfew` | Yes | ML paper reviews, industry analysis | 2-3x/week |
| **Wes Roth** | `UC9-y-6csu5WGm29I7JiwpnA` | Likely | AI news roundups, commentary | Daily |

### Developer Education

| Channel | Channel ID | Verified | Content | Frequency |
|---------|-----------|----------|---------|-----------|
| **Fireship** | `UCsBjURrPoezykLs9EqgamOA` | Yes | Fast-paced dev news, "100 seconds" series | 2-3x/week |
| **Theo (t3.gg)** | `UCbRP3c757lWg9M-U7TyEkXA` | Yes | Web dev opinions, React/Next.js, AI tools | Daily |
| **Matt Pocock** | `UCswG6FSbgZjbWtdf_hMLaow` | Yes | TypeScript deep-dives | 1-2x/week |
| **Traversy Media** | `UC29ju8bIPH5as8OGnQzRzAg` | Likely | Web dev tutorials, crash courses | 1-2x/week |
| **3Blue1Brown** | `UCYO_jab_esuFRV4b17AJtAw` | Yes | Math/ML visual explanations | Monthly |
| **Andrej Karpathy** | `UCXUPKJO5MZQN11PqgIvyuvQ` | Yes | Neural networks from scratch, LLM internals | Monthly |
| **sentdex** | `UCfzlCWGWYyIQ0aLC5w48gBQ` | Yes | Python ML tutorials, trading bots | 1-2x/week |
| **NetworkChuck** | `UC9x0AN7BWHpCDHSm9NiJFJQ` | Yes | Networking, Linux, AI for beginners | 1-2x/week |

### Meme-Worthy / Culture

| Channel | Channel ID | Content | Frequency |
|---------|-----------|---------|-----------|
| **Fireship** | `UCsBjURrPoezykLs9EqgamOA` | "X in 100 seconds", hot takes | (also in Education) |
| **ThePrimeagen** | `UC8ENHE5xdFSwx71u3fDH5Xw` | Dev rants, memes, live reactions | Daily |
| **Programmers are also human** | `UCmj1ggeCsf0d9TMvwBQ1loQ` | Programming comedy, sketches | Weekly |

**RSS feed URL pattern:**
```
https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA
```

**n8n integration**: Use the RSS Feed Read node with each channel URL. The feed returns `title`, `link` (YouTube URL), `published`, and `media:description`. Map `sourceName` to the channel name.

**Priority additions**: Fireship (covers AI + dev news fast, meme-worthy format), Two Minute Papers (AI research made accessible), Theo (web dev + AI tooling daily).

---

## Reddit (JSON API, no auth needed for read-only)

Reddit's public JSON API works without OAuth for read-only access. Rate limited to ~10 req/min per IP.

**URL pattern**: `https://www.reddit.com/r/{subreddit}/top.json?t=day&limit=10`

| Subreddit | Content | Category it feeds |
|-----------|---------|------------------|
| **r/MachineLearning** | Research papers, industry news, career | AI_UPDATE, LEARNING |
| **r/LocalLLaMA** | Self-hosted LLMs, quantization, benchmarks | AI_UPDATE, TOOL_RELEASE |
| **r/artificial** | General AI news, ethics, speculation | NEWS, AI_UPDATE |
| **r/singularity** | AI breakthroughs, AGI speculation, hype | NEWS, AI_UPDATE, MEME_WORTHY |
| **r/ProgrammerHumor** | Dev memes, relatable content | MEME_WORTHY |
| **r/webdev** | Web development news, tools, tutorials | LEARNING, TOOL_RELEASE |
| **r/ExperiencedDevs** | Senior dev discussions, architecture | LEARNING |
| **r/ChatGPT** | ChatGPT tips, prompt engineering, news | AI_UPDATE, LEARNING |
| **r/StableDiffusion** | Image generation, ComfyUI, workflows | AI_UPDATE, TOOL_RELEASE |
| **r/ollama** | Local LLM running, Ollama tips | TOOL_RELEASE, LEARNING |

**n8n integration**: HTTP Request node → Code node to transform. The JSON response has `data.children[].data` with `title`, `url`, `score`, `subreddit`, `num_comments`, `permalink`.

```javascript
// Example transform in Code node
const posts = $input.first().json.data.children;
return posts.map(post => ({
  json: {
    title: post.data.title,
    summary: post.data.selftext?.substring(0, 280) || post.data.title,
    sourceUrl: post.data.url.startsWith('http')
      ? post.data.url
      : `https://reddit.com${post.data.permalink}`,
    sourceName: `Reddit r/${post.data.subreddit}`,
    rawData: {
      score: post.data.score,
      comments: post.data.num_comments,
      subreddit: post.data.subreddit
    }
  }
}));
```

**Priority additions**: r/LocalLLaMA (hottest AI community right now), r/MachineLearning (research-grade content), r/ProgrammerHumor (meme goldmine).

**Rate limit warning**: Unauthenticated Reddit JSON API allows ~10 requests/minute. Since our workflow runs once daily, this is fine — but always set a descriptive `User-Agent` header (e.g., `AllOnFire/1.0 (topic-discovery)`) or Reddit may throttle/block requests. Reddit also supports RSS natively at `https://www.reddit.com/r/{subreddit}/top.rss?t=day&limit=10` as an alternative to JSON.

---

## Forums & Communities

| Source | URL / Feed | Auth | Status | Content |
|--------|-----------|------|--------|---------|
| **Lobsters** | `https://lobste.rs/rss` | None | Verified | HN-like but smaller, higher signal, dev-focused |
| **Lobsters AI tag** | `https://lobste.rs/t/ai.rss` (multi-tag: `https://lobste.rs/t/ai,ml.rss`) | None | Verified | AI-tagged posts only |
| **Hacker News** | Already in workflow | None | Active | Broadest tech community |
| **Lemmy (programming)** | `https://programming.dev/feeds/local.xml?sort=TopDay` | None | Likely | Reddit alternative, dev-focused |
| **Papers With Code** | No official RSS — community feeds: [ml-feeds/pwc-feeds](https://github.com/ml-feeds/pwc-feeds) | None | Community | ML papers with code implementations |
| **Hugging Face Daily Papers** | No official RSS — community feeds: `https://papers.takara.ai/api/feed` or [GitHub feed](https://raw.githubusercontent.com/huangboming/huggingface-daily-paper-feed/refs/heads/main/feed.xml) | None | Community | Curated ML papers daily |
| **freeCodeCamp** | `https://www.freecodecamp.org/news/rss/` | None | Verified | Tutorials, career advice |
| **Towards Data Science** | `https://towardsdatascience.com/feed` | None | Verified | Data science, ML tutorials (some articles paywalled on Medium) |

**Priority additions**: Lobsters (very high signal-to-noise, complements HN), Hugging Face Papers (daily curated ML research).

---

## Research / Academic

For AI_UPDATE and LEARNING categories. Academic sources catch breakthroughs days before mainstream media.

| Source | Feed URL | Status | Content |
|--------|----------|--------|---------|
| **ArXiv CS.AI** | `https://rss.arxiv.org/rss/cs.AI` | Verified | Latest AI research papers |
| **ArXiv CS.CL** | `https://rss.arxiv.org/rss/cs.CL` | Verified | Computational linguistics (LLMs live here) |
| **ArXiv CS.LG** | `https://rss.arxiv.org/rss/cs.LG` | Verified | Machine learning papers |
| **ArXiv Multi-category** | `https://rss.arxiv.org/rss/cs.AI+cs.LG` | Verified | AI + ML combined |
| **Hugging Face Papers** | Community: `https://papers.takara.ai/api/feed` | Community | Curated daily, easier to digest than raw ArXiv |
| **Papers With Code** | Community: [ml-feeds/pwc-feeds](https://github.com/ml-feeds/pwc-feeds) | Community | Papers + working implementations |
| **Google Scholar Alerts** | Email only | N/A | Track specific topics |

**Note on ArXiv**: Raw ArXiv feeds are high-volume (~50-100 papers/day per category) and very academic. The AI classification step will naturally filter most of them out (low relevance score for non-breakthrough papers). Hugging Face Papers is a better entry point — it's already curated to ~5-10 significant papers/day.

---

## AI Tool Directories & Aggregators

These catch new tool launches that don't make it to HN or Product Hunt.

| Source | URL | Auth | Status | Content |
|--------|-----|------|--------|---------|
| **Product Hunt** | Already in workflow | None | Active | Daily product launches |
| **There's an AI for That** | No confirmed RSS — directory at `https://theresanaiforthat.com/` | N/A | No feed | AI tool directory, new launches daily |
| **daily.dev** | No RSS or API — browser extension only | N/A | No feed | Dev content aggregator |
| **GitHub Trending** | Already in workflow | None | Active | Trending repositories |
| **GitHub Changelog** | `https://github.blog/changelog/feed/` | None | Verified | GitHub platform updates |
| **npm trends** | No RSS (scrape `https://npmtrends.com`) | None | No feed | Trending npm packages |

**Priority additions**: "There's an AI for That" (dedicated AI tool tracker), GitHub Changelog (platform updates relevant to developers).

---

## Recommended Expansion Plan

What to add to the workflow, in priority order:

### Tier 1 — Add Now (highest value, easiest)

These are RSS feeds, plug directly into the existing workflow with zero auth:

| Source | Why | Expected items/day |
|--------|-----|-------------------|
| **Anthropic Blog** | We use Claude — know about updates first | 0-1 |
| **Google AI Blog** | Gemini releases, DeepMind research | 1-2 |
| **Meta AI Blog** | Llama releases, open-source models | 1-2 |
| **Hugging Face Blog** | Open-source AI ecosystem center | 1-2 |
| **VentureBeat AI** | High-volume AI news | 5-10 |
| **Lobsters** | High-signal dev community | 5-10 |
| **TLDR AI Newsletter** | Curated daily AI digest | 3-5 |
| **Fireship (YouTube)** | Dev news + meme-worthy format | 0-1 |
| **Two Minute Papers (YouTube)** | AI research made fun | 0-1 |
| **r/LocalLLaMA** | Hottest AI community | 10 |
| **r/ProgrammerHumor** | Meme content source | 10 |

**Impact**: +35-55 items/day raw → +15-25 after dedup + filtering. Fills the AI_UPDATE gap (company blogs) and MEME_WORTHY gap (Reddit + Fireship).

### Tier 2 — Add Next (good value, slightly more setup)

| Source | Why | Notes |
|--------|-----|-------|
| **Reddit r/MachineLearning** | Research-grade content | JSON API, same pattern as Tier 1 |
| **Reddit r/singularity** | Hype + real breakthroughs | Good for MEME_WORTHY too |
| **Hugging Face Daily Papers** | Curated ML papers | Better than raw ArXiv |
| **Techmeme** | Editor-curated aggregator | RSS feed |
| **MIT Tech Review** | Deep analysis | Weekly, high quality |
| **Theo (YouTube)** | Daily web dev + AI takes | RSS feed |
| **Ben's Bites Newsletter** | AI tools + news | RSS feed |
| **GitHub Changelog** | Platform updates | RSS feed |

### Tier 3 — Nice to Have (specialized)

| Source | Why | Notes |
|--------|-----|-------|
| **ArXiv CS.AI / CS.CL** | Raw research | High volume, needs aggressive filtering |
| **Reddit r/StableDiffusion** | Image gen community | Niche but active |
| **Reddit r/ollama** | Local AI movement | Growing fast |
| **Stability AI / Mistral / Cohere blogs** | Model releases | Low volume, high signal |
| **freeCodeCamp** | Tutorials | LEARNING category |
| **ThePrimeagen (YouTube)** | Dev culture, reactions | MEME_WORTHY |

---

## Staying Current: The "Breaking AI News" Problem

You asked about having the best AI news every day. Here's the reality:

### Speed Ranking (how fast sources pick up breaking news)

```
Minutes:  X/Twitter → but $100+/month API, not worth it
          Company blogs → RSS poll every hour catches this

Hours:    Hacker News → community submits within 1-2 hours
          Reddit r/LocalLLaMA → for open-source model drops
          Techmeme → editors curate within hours

Same day: TechCrunch, The Verge, VentureBeat → journalist articles
          TLDR AI, Ben's Bites → newsletter roundups
          YouTube (Fireship, Matt Berman) → video takes

Next day: MIT Tech Review → deeper analysis
          The Batch → weekly roundup
```

### Strategy for "always the best today's news"

1. **Company blogs (Tier 1)** catch announcements at the source
2. **HN + Reddit** catch community reactions within hours
3. **News sites** (TC, Verge, VB) provide journalist context same-day
4. **Newsletters** (TLDR AI) act as a safety net — if something important happened and we missed it, the newsletter catches it
5. **AI classification** with Claude ensures only relevant items surface

The current workflow runs once daily at 6 AM. For more real-time coverage, you could:
- Run it **twice daily** (6 AM + 6 PM) to catch afternoon announcements
- Add a **separate "breaking news" workflow** that polls only company blogs + HN every 2 hours

### What We Can't Easily Scrape

| Source | Why | Alternative |
|--------|-----|-------------|
| **X/Twitter** | API costs $100+/month | Use Nitter RSS (unreliable) or skip |
| **LinkedIn** | No API for feed content | Skip — content appears elsewhere first |
| **Discord servers** | No scraping API | Skip — news surfaces on Reddit/HN |
| **Paywalled sites** (The Information, WSJ) | Legal/ethical | Read titles from RSS, that's enough for topic discovery |
| **Medium/Towards Data Science** | Metered paywall | RSS gives titles + first paragraph, enough for classification |
