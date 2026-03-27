<h1 align="center">@allonfire/hooks</h1>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
</p>

<p align="center">Shared React hooks for responsive breakpoints and mount detection.</p>

## 📦 API Reference

| Export | Type | Description |
|--------|------|-------------|
| `useBreakpoint(breakpoint)` | Hook | Returns `true` when viewport matches or exceeds the given breakpoint |
| `useMounted()` | Hook | Returns `true` after first client render (SSR hydration safe) |
| `BREAKPOINTS` | Constant | Tailwind default breakpoints: `{ sm: 640, md: 768, lg: 1024, xl: 1280, 2xl: 1536 }` |

## 📁 Structure

```
hooks/
  src/
    breakpoints.ts       Breakpoint constants and types
    use-breakpoint.ts    Viewport matching hook (matchMedia)
    use-mounted.ts       Client mount detection hook
```

## 🔧 Usage

```ts
import { useBreakpoint } from "@allonfire/hooks/use-breakpoint";
import { useMounted } from "@allonfire/hooks/use-mounted";

// Responsive behavior
const isDesktop = useBreakpoint("lg"); // true when >= 1024px

// SSR-safe rendering
const mounted = useMounted();
if (!mounted) return null;
```
