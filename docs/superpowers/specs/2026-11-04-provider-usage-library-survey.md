# Provider usage block: library survey

The provider card on the Back Office's Services → Mail page lists its usage
as five plain lines: today's sends against the daily limit, the last 31 days
against the monthly one, a note on the rolling window, the last acceptance
and the last refused login. The survey looks for an existing piece that
shows quota and recent events better. Free options only.

| Library | Block | Base | Installs | Fit | Verdict |
|---|---|---|---|---|---|
| shadcn (base-nova) | [Progress](https://ui.shadcn.com/docs/components/base/progress) | Base UI | already in `packages/shadcn` | A quota bar per window: label, `used / limit`, a thin track. Server-renderable value, no chart library. | use |
| shadcn (base-nova) | [Item](https://ui.shadcn.com/docs/components/base/item) | none (markup) | already in `packages/shadcn` | A row with an icon tile, a title and a description: fits "last accepted" and "last refused login", the tile like the fields' pictogram tiles. | use |
| shadcn (base-nova) | [Hover card / Tooltip](https://ui.shadcn.com/docs/components/base/hover-card) | Base UI | `AOFTooltip` exists | The rolling-window note behind an info icon instead of a paragraph. | use (`AOFTooltip`) |
| shadcn charts | [Radial](https://ui.shadcn.com/charts/radial) | Recharts | `chart` installed, Recharts client-side | A ring per window. Heavy for two numbers, client only, reads as a dashboard. | idea only |
| Shadcn Studio | [Statistics](https://shadcnstudio.com/blocks/dashboard-and-application/statistics-component) | Radix | copy, migrate to Base UI | Big-number stat tiles. Too loud for a settings card. | skip |

Recommendation: Progress meters for the two windows, the rolling note as a
tooltip on their heading, and two Item rows for the last events. Both are
already installed; they get wrapped as `AOFProgress` and `AOFItem` in
`packages/ui`.
