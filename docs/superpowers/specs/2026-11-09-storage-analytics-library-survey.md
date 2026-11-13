# Storage analytics page: library survey

The Back Office's Storage page (`/storage`) will show each bucket as a card
with its size and object count, and the owner asked whether a graph fits. The
survey looks for an existing chart piece. Free options only.

| Library | Block | Base | Installs | Fit | Verdict |
|---|---|---|---|---|---|
| shadcn charts | [Radial](https://ui.shadcn.com/charts/radial) | Recharts | `chart` installed; `AOFRadialMeter` already wraps it (Services) | A ring per bucket: used space against a limit. Same look as the Services rings. | use |
| shadcn charts | [Bar](https://ui.shadcn.com/charts/bar) | Recharts | `chart` installed | Bytes per bucket, or Images vs Avatars inside `image`, side by side. | use |
| shadcn charts | [Area](https://ui.shadcn.com/charts/area) | Recharts | `chart` installed | Size over time. Needs daily snapshots stored first (no history exists today). | idea only |
| shadcn (base-nova) | [Chart docs](https://ui.shadcn.com/docs/components/base/chart) | Recharts | already in `packages/shadcn` | The `ChartContainer`, tooltip and legend the three above share. | use |
| Shadcn UI Kit | [Dashboard](https://shadcnuikit.com/dashboard/default) | Radix | copy, migrate to Base UI | A full admin dashboard; shows how stat cards and charts sit together. Too loud for this page. | idea only |
| Shadcnblocks | [Dashboard blocks](https://www.shadcnblocks.com/blocks/dashboard) | Radix | mixed free and paid | Mostly paid; one line only. | skip |
| Shadcn UI Blocks | [Home](https://www.shadcnui-blocks.com/) | Radix | copy | No storage-specific block found. | skip |

Recommendation: bucket cards with a radial ring (used against a limit, if
one is known) or a plain bar, drawn with the installed `chart` and the
existing `AOFRadialMeter`. A trend (area) waits for stored snapshots.
