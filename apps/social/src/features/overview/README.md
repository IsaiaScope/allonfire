<h1 align="center">Overview</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Framer_Motion-12-FF0055?logo=framer&logoColor=white" alt="Framer Motion" />
</p>

<p align="center">
  Pipeline dashboard showing content lifecycle stats at a glance.
</p>

---

<p align="center">
  <img src="../../../../../docs/screenshots/dashboard.png" width="600" alt="Dashboard" />
  &nbsp;&nbsp;
  <img src="../../../../../docs/screenshots/mobile-dashboard.png" width="200" alt="Mobile Dashboard" />
</p>

## 📁 Structure

```
overview/
  components/
    pipeline-stats.tsx     Dashboard stats with animated cards
```

## ✨ What it Does

A single component (`PipelineStats`) that renders 5 animated cards showing the content pipeline:

| Card | Data | Links to |
|------|------|----------|
| 📊 Topics Discovered | Raw topics from sources | — |
| 🔍 Topics AI Picked | Curated by AI for review | `/discover` |
| ✨ Topics Selected | Queued for generation | `/generate` |
| 📝 Prompts | Content prompts generated | `/generate` |
| 💬 Prompt Feedback | Positive / negative / notes counts | — |

Each card has a gradient background, Framer Motion hover animation, and Lucide icon. Clickable cards navigate to their respective pages.

## 📦 Dependencies

| Package | Why |
|---------|-----|
| `framer-motion` | Card hover animations |
| `lucide-react` | Stage icons |
| `@allonfire/ui` | Card component |
