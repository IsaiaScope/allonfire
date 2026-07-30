<h1 align="center">@allonfire/ui</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Radix_UI-1.4-6E56CF?style=flat&logo=radixui&logoColor=white" alt="Radix UI" />
  <img src="https://img.shields.io/badge/shadcn%2Fui-based-000000?style=flat" alt="shadcn/ui" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind 4" />
  <img src="https://img.shields.io/badge/Embla_Carousel-8.6-F5A623?style=flat" alt="Embla Carousel" />
</p>

<p align="center">Shared component library for AllOnFire apps. Built on shadcn/ui conventions with Radix UI primitives, styled via Tailwind CSS 4, and exported as direct file imports -- no barrel files.</p>

## Component Inventory

| Component     | Source         | Description                                      |
| ------------- | -------------- | ------------------------------------------------ |
| Alert Dialog  | Radix UI       | Modal confirmation dialogs with accessible focus management |
| Avatar        | Radix UI       | User avatar with image fallback                  |
| Badge         | CVA            | Status labels and tags with variant support       |
| Button        | CVA            | Primary action element with size/variant props    |
| Card          | Custom         | Content container with header, body, and footer   |
| Carousel      | Embla          | Touch-friendly carousel with prev/next controls   |
| Checkbox      | Radix UI       | Accessible checkbox with indeterminate state      |
| Collapsible   | Radix UI       | Expandable/collapsible content sections           |
| Combobox      | cmdk           | Searchable command-palette-style select           |
| Dropdown Menu | Radix UI       | Context and action menus with keyboard navigation |
| Input         | Custom         | Text input with consistent styling                |
| Label         | Radix UI       | Accessible form labels                            |
| Navigation Menu | Radix UI     | Accessible navigation with submenus and viewport support |
| Popover       | Radix UI       | Floating content panel triggered by a control     |
| Progress      | Radix UI       | Horizontal progress bar with animated indicator   |
| Scroll Area   | Radix UI       | Custom scrollbar overlay for scrollable regions   |
| Select        | Radix UI       | Native-like select dropdown with custom styling   |
| Separator     | Radix UI       | Visual divider between content sections           |
| Sheet         | Custom/Radix   | Slide-out panel (drawer) from screen edges        |
| Skeleton      | Custom         | Loading placeholder with pulse animation          |
| Sonner        | sonner         | Theme-aware toast notifications with status icons |
| Switch        | Radix UI       | Toggle switch for boolean settings                |
| Tabs          | Radix UI       | Tabbed content navigation                         |
| Theme Provider | next-themes   | Dark/light/system theme provider with class strategy |
| Theme Toggle  | Custom         | Button to switch between dark and light themes    |
| Tooltip       | Radix UI       | Hover/focus hint with accessible positioning      |
| Wrapper       | Custom         | Layout wrapper with responsive max-width          |

## Usage

Components are imported directly by file path -- there are no barrel `index.ts` files.

```tsx
// From a feature component in apps/laura
import { Button } from "@allonfire/ui/components/button";
import { Card, CardHeader, CardContent } from "@allonfire/ui/components/card";
import { Badge } from "@allonfire/ui/components/badge";
import { cn } from "@allonfire/ui/lib/utils";

export function TopicCard({ title, status }: { title: string; status: string }) {
  return (
    <Card>
      <CardHeader>
        <Badge variant="outline">{status}</Badge>
      </CardHeader>
      <CardContent>
        <h3 className={cn("text-lg font-semibold")}>{title}</h3>
        <Button size="sm">View Details</Button>
      </CardContent>
    </Card>
  );
}
```

## Utilities

### `cn(...inputs)`

Merges Tailwind classes using `clsx` + `tailwind-merge`. Handles conditional classes, deduplication, and conflict resolution.

```ts
import { cn } from "@allonfire/ui/lib/utils";

cn("px-4 py-2", isActive && "bg-primary text-white", className);
```

### `Slot`

Composition utility in `lib/slot.ts` for polymorphic component rendering.

## Directory Structure

```
src/
  components/
    alert-dialog.tsx        Modal confirmation dialogs
    avatar.tsx              User avatar with fallback
    badge.tsx               Status labels and tags
    button.tsx              Primary action element
    card.tsx                Content container
    carousel.tsx            Touch carousel (Embla)
    checkbox.tsx            Accessible checkbox
    collapsible.tsx         Expandable sections
    combobox.tsx            Searchable select (cmdk)
    dropdown-menu.tsx       Action menus
    input.tsx               Text input
    label.tsx               Form labels
    navigation-menu.tsx     Accessible navigation menus
    popover.tsx             Floating panels
    progress.tsx            Progress bar
    scroll-area.tsx         Custom scrollbars
    select.tsx              Select dropdown
    separator.tsx           Visual divider
    sheet.tsx               Slide-out drawer
    skeleton.tsx            Loading placeholder
    sonner.tsx              Toast notifications
    switch.tsx              Toggle switch
    tabs.tsx                Tabbed navigation
    theme-provider.tsx      Dark/light/system theme provider
    theme-toggle.tsx        Theme toggle button
    tooltip.tsx             Hover hints
    wrapper.tsx             Layout wrapper
  lib/
    utils.ts                cn() class merge utility
    slot.ts                 Composition slot utility
  styles/
    globals.css             Global styles and CSS variables
```

## Dependencies

| Package                  | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `radix-ui`               | Accessible UI primitives (dialog, menu, tabs, etc.) |
| `@base-ui/react`         | Base UI React components                  |
| `class-variance-authority` | Variant-driven component styling        |
| `clsx`                   | Conditional class string builder          |
| `tailwind-merge`         | Tailwind class deduplication and merging   |
| `cmdk`                   | Command palette / searchable list         |
| `embla-carousel`         | Carousel engine                           |
| `embla-carousel-react`   | React bindings for Embla                  |
| `lucide-react`           | Icon library                              |
| `next-themes`            | Dark/light/system theme management         |
| `sonner`                 | Toast notifications                       |

### Peer Dependencies

| Package     | Version  |
| ----------- | -------- |
| `react`     | ^19.0.0  |
| `react-dom` | ^19.0.0  |
