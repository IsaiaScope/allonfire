<h1 align="center">Publish</h1>

<p align="center">
  <img src="https://img.shields.io/badge/dnd--kit-sortable-blue?style=flat" alt="dnd-kit" />
  <img src="https://img.shields.io/badge/embla--carousel-preview-purple?style=flat" alt="embla-carousel" />
  <img src="https://img.shields.io/badge/Zod-validation-orange?style=flat" alt="Zod" />
  <img src="https://img.shields.io/badge/Twitter_API-v2_PKCE-1DA1F2?style=flat" alt="Twitter API" />
  <img src="https://img.shields.io/badge/LinkedIn_API-OAuth_2.0-0A66C2?style=flat" alt="LinkedIn API" />
</p>

<p align="center">
  Five-step wizard for composing, adapting, and publishing social media posts to multiple platforms simultaneously. AI-powered content elaboration and per-platform adaptation with OAuth account linking.
</p>

---

## 📸 Screenshots

<p align="center">
  <img src="../../../../../docs/screenshots/publish-compose.png" width="600" alt="Publish compose step — desktop" />
  &nbsp;&nbsp;
  <img src="../../../../../docs/screenshots/mobile-publish.png" width="200" alt="Publish wizard — mobile" />
</p>

---

## 📂 Directory Structure

```
publish/
  actions/
    publish.ts              Server actions: elaborate, adapt, publish
    social-accounts.ts      Server actions: get/disconnect accounts
  components/
    compose-step.tsx        Step 1 — content + image input
    platforms-step.tsx      Step 2 — platform selection + OAuth connect
    preview-step.tsx        Step 3 — per-platform preview + inline edit
    confirm-step.tsx        Step 4 — final confirmation before publish
    results-step.tsx        Step 5 — publish results (success/failure per platform)
    publish-client.tsx      Main wizard orchestrator (client component)
    content-editor.tsx      Text editor with .md file upload + AI elaborate
    image-upload.tsx        Drag-drop image upload with reorder (dnd-kit)
    platform-connect.tsx    OAuth popup flow for Twitter/LinkedIn
    wizard-stepper.tsx      Step indicator (responsive: top on desktop, bottom on mobile)
  constants/
    platforms.ts            Platform metadata (labels, icons, char limits), Zod enum
  hooks/
    use-publish-wizard.ts   useReducer state machine with loadingPhase
  types/
    publish-types.ts        WizardStep, PlatformContent, ConnectedAccount, PublishResultItem
```

---

## 🧩 Component Hierarchy

```
PublishPage (server)
  └ PublishClient
      ├ WizardStepper              desktop: top / mobile: bottom
      ├ ComposeStep                step = "compose"
      │   ├ ContentEditor
      │   │   └ .md file upload + elaborate button
      │   └ ImageUpload
      │       └ dnd-kit sortable grid
      ├ PlatformsStep              step = "platforms"
      │   └ PlatformConnect        per-platform OAuth popup
      ├ PreviewStep                step = "preview"
      │   └ per-platform content cards (editable)
      ├ ConfirmStep                step = "confirm"
      │   └ summary + publish button
      └ ResultsStep                step = "results"
          └ per-platform success/error cards
```

---

## 🔄 Wizard Flow

```
compose → platforms → preview → confirm → results
   │          │          │         │          │
   │          │          │         │          └ Show per-platform success/failure
   │          │          │         └ Trigger publishAction (parallel publish)
   │          │          └ AI adapt content per platform + inline edit
   │          └ Select platforms, connect via OAuth popup
   └ Write content, upload .md, AI elaborate, drag-reorder images
```

---

## ⚙️ State Management

The `usePublishWizard` hook drives all wizard state via `useReducer`:

```
WizardState
  step:               "compose" | "platforms" | "preview" | "confirm" | "results"
  originalContent:    string
  imageFiles:         File[]
  imagePreviewUrls:   string[]
  selectedPlatforms:  Platform[]
  platformContents:   PlatformContent[]
  results:            PublishResultItem[]
  loadingPhase:       "idle" | "elaborating" | "adapting" | "publishing"
```

**Actions dispatched:** `SET_STEP`, `SET_CONTENT`, `ADD_IMAGES`, `REMOVE_IMAGE`, `REORDER_IMAGES`, `TOGGLE_PLATFORM`, `SET_PLATFORM_CONTENTS`, `SET_RESULTS`, `SET_LOADING_PHASE`, `RESET`

---

## 🌐 Data Flow

**Elaborate:** user clicks elaborate → `elaborateAction` (server) → AI rewrites content → update `originalContent`

**Adapt:** entering preview step → `adaptContentAction` (server) → AI generates per-platform versions (parallel) → `SET_PLATFORM_CONTENTS` with char counts and limit checks

**Publish:** user confirms → `publishAction` (server) → `FormData` with adaptations JSON + image blobs → parallel `publishToPlatform` per platform → creates `Post` records in DB → `SET_RESULTS`

**OAuth:** click connect → `PlatformConnect` opens popup → `/api/publish/oauth/[platform]` handles OAuth flow → popup closes → `refreshAccounts` re-fetches connected accounts

---

## 📋 Key Files

| Emoji | File | Purpose |
|-------|------|---------|
| 🎯 | `publish-client.tsx` | Wizard orchestrator — renders current step, handles adapt/publish callbacks |
| 🧠 | `use-publish-wizard.ts` | `useReducer` state machine with typed actions and loading phases |
| 🤖 | `actions/publish.ts` | Server actions: `elaborateAction`, `adaptContentAction`, `publishAction` |
| 🔗 | `actions/social-accounts.ts` | Server actions: `getConnectedAccountsAction`, `disconnectAccountAction` |
| ✍️ | `content-editor.tsx` | Textarea with .md file upload and AI elaborate button |
| 🖼️ | `image-upload.tsx` | Drag-drop zone with dnd-kit sortable image grid |
| 🔑 | `platform-connect.tsx` | OAuth popup flow (Twitter PKCE, LinkedIn authorization code) |
| 📊 | `constants/platforms.ts` | `PLATFORM_CONFIG` map (labels, icons, char limits) + Zod `platformEnum` |
| 📝 | `types/publish-types.ts` | `WizardStep`, `PlatformContent`, `ConnectedAccount`, `PublishResultItem` |

---

## 🔌 Dependencies

| Package | Why |
|---------|-----|
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag-to-reorder images in upload grid |
| `embla-carousel-react` | Platform preview carousel on mobile |
| `zod` | Input validation in server actions and platform enum |
| `sonner` | Toast notifications for errors and success |
| `lucide-react` | Icons throughout the wizard |
| `@allonfire/content-generator` | AI elaboration and platform-specific adaptation |
| `@allonfire/social-publisher` | Platform adapters (Twitter, LinkedIn) and image resizing |
| `@allonfire/database` | `Post` creation, `SocialAccount` CRUD, `Platform` enum |
| `@allonfire/ui` | Card, Button, Textarea, Badge, Carousel, and other primitives |

---

## 🔐 Auth & Security

- All server actions call `requireAuth()` before executing
- OAuth tokens stored encrypted in `SocialAccount` model
- Platform enum validated with Zod on every action call
- Image files sent via `FormData` to avoid base64 bloat
- `revalidatePath` called after publish to refresh dashboard stats

---

## 📱 Responsive Behavior

| Viewport | Stepper Position | Image Grid | Preview Layout |
|----------|-----------------|------------|----------------|
| **Mobile** (`< 768px`) | Bottom of wizard | Single column | Stacked cards |
| **Desktop** (`>= 768px`) | Top of wizard | Multi-column grid | Side-by-side cards |
