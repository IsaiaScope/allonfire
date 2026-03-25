<h1 align="center">@allonfire/config</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">Shared TypeScript configuration presets for the monorepo.</p>

## 📁 Structure

```
config/
  typescript/
    tsconfig.base.json     Base config (strict mode, paths, target)
```

## 🔧 Usage

Each package extends the shared base config:

```json
{
  "extends": "@allonfire/config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  }
}
```
