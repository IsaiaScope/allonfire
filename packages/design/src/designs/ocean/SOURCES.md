# Where Ocean's art comes from

The octopus (`ocean-mark.ts`) and the sea line (`sea-wave.ts`) are drawn for
Ocean. The sea icons (`sea-icons.ts`) are single paths from open icon sets,
fetched through Iconify and kept as path data:

| Icon | Set | Licence |
|---|---|---|
| Crab | game-icons.net, "crab" | CC BY 3.0, credit: game-icons.net contributors, https://game-icons.net |
| Jellyfish | Material Design Icons, "jellyfish" | Apache 2.0 |
| Lighthouse | Material Design Icons, "lighthouse" | Apache 2.0 |

The crab's licence asks for credit: keep this file shipped with the Design,
and show it wherever the App lists its credits.

## Emoji

`sea-emoji.ts` names the emoji Laura shows, in two sets by their Iconify
prefix. Both are Apache 2.0, so no credit is required, and both stay named
here:

| Set | Prefix | Licence |
|---|---|---|
| Noto Emoji (Google), rounded and detailed | `noto` | Apache 2.0 |
| Firefox emoji (Mozilla, "fxemoji"), flatter and bolder | `fxemoji` | Apache 2.0 |

A full-colour emoji keeps its own colours, and most of them fall under 3:1
against the light ground (they reach it on the dark one), so each is drawn
with `filter: var(--emoji-shadow)`: a tight, tinted shadow per scheme.
