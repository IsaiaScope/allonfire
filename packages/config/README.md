<h1 align="center">@allonfire/config</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">Shared TypeScript configuration presets for the monorepo.</p>

## 📁 Structure

```
config/
  typescript/
    base.json              Base config (strict mode, paths, target)
    nextjs.json            Next.js app config (extends base + JSX, plugins)
    library.json           Library/package config (extends base + declaration emit)
```

## 🔧 Usage

Each app or package extends the appropriate preset:

```json
// Next.js apps (apps/social, apps/laura)
{
  "extends": "@allonfire/config/typescript/nextjs.json"
}

// Library packages
{
  "extends": "@allonfire/config/typescript/library.json"
}

// Custom (extend base directly)
{
  "extends": "@allonfire/config/typescript/base.json"
}
```
