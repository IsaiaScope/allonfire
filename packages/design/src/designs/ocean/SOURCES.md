# Where Ocean's art comes from

Laura's mascot is a pool of emoji art, not a drawing (`mascot-art.ts`,
`OCEAN_ART`): full-colour emoji from open sets and a few one-colour icons, each
taken through Iconify and kept as the SVG document it came as. The sea line
(`sea-wave.ts`) is drawn for Ocean. The one-colour icons of `sea-icons.ts` are
single paths from open icon sets, kept as path data and shared with
`mascot-art.ts`.

## Laura's logo

`li-mark.ts` holds the "Li" monogram, the owner's own mark (the old Laura's
`laura-logo.png` and Memory card back), as a small PNG. It is the owner's, not
taken from a set: no licence applies.

## The pool and the details

Each row is a key of `OCEAN_ART`. The first six are the pool the pages show
(`OCEAN_MASCOT_POOL`); the rest are details, or stand where a page already shows
one of the six.

| Key | Picture | Set | Licence |
|---|---|---|---|
| `OCTOPUS_NOTO` | octopus | Noto Emoji (Google), `noto/octopus` | Apache 2.0 |
| `OCTOPUS_FIREFOX` | octopus | Firefox emoji (Mozilla, fxemoji), `fxemoji/octopus` | Apache 2.0 |
| `OCTOPUS_CLASSIC` | octopus | Noto Emoji classic (Google, Noto v1), `noto-v1/octopus` | Apache 2.0 |
| `SQUID_NOTO` | squid | Noto Emoji, `noto/squid` | Apache 2.0 |
| `JELLYFISH_NOTO` | jellyfish | Noto Emoji, `noto/jellyfish` | Apache 2.0 |
| `OCTOPUS_MONO` | octopus, one colour | game-icons.net, "octopus" | CC BY 3.0, credit: Lorc, https://game-icons.net/1x1/lorc/octopus.html |
| `JELLYFISH_MONO` | jellyfish, one colour | Material Design Icons, "jellyfish" | Apache 2.0 |
| `LIGHTHOUSE_MONO` | lighthouse, one colour | Material Design Icons, "lighthouse" | Apache 2.0 |
| `CRAB_MONO` | crab, one colour | game-icons.net, "crab" | CC BY 3.0, credit: Lorc, https://game-icons.net/1x1/lorc/crab.html |
| `JELLYFISH_FLUENT` | jellyfish | Fluent Emoji Flat (Microsoft), `fluent-emoji-flat/jellyfish` | MIT |
| `SQUID_FLUENT` | squid | Fluent Emoji Flat, `fluent-emoji-flat/squid` | MIT |
| `WAVE_FLUENT` | water wave | Fluent Emoji Flat, `fluent-emoji-flat/water-wave` | MIT |
| `SHARK_NOTO` | shark | Noto Emoji, `noto/shark` | Apache 2.0 |
| `LIGHTHOUSE_NOTO` | lighthouse | Noto Emoji, `noto/lighthouse` | Apache 2.0 |
| `WHALE_NOTO` | whale | Noto Emoji, `noto/whale` | Apache 2.0 |
| `TROPHY_NOTO` | trophy | Noto Emoji, `noto/trophy` | Apache 2.0 |
| `TROPHY_SILVER_NOTO` | trophy, silver | Noto Emoji, `noto/trophy` with its golds recoloured silver | Apache 2.0 |
| `TROPHY_BRONZE_NOTO` | trophy, bronze | Noto Emoji, `noto/trophy` with its golds recoloured bronze | Apache 2.0 |
| `MEDAL_NOTO` | first place medal | Noto Emoji, `noto/1st-place-medal` | Apache 2.0 |
| `MEDAL_SILVER_NOTO` | second place medal | Noto Emoji, `noto/2nd-place-medal` | Apache 2.0 |
| `MEDAL_BRONZE_NOTO` | third place medal | Noto Emoji, `noto/3rd-place-medal` | Apache 2.0 |
| `STAR_NOTO` | star | Noto Emoji, `noto/star` | Apache 2.0 |
| `BUST_NOTO` | bust in silhouette | Noto Emoji, `noto/bust-in-silhouette` | Apache 2.0 |
| `BUSTS_NOTO` | busts in silhouette | Noto Emoji, `noto/busts-in-silhouette` | Apache 2.0 |

The two CC BY 3.0 pictures (the game-icons.net octopus and crab) ask for
credit: keep this file shipped with the Design, and show it wherever the App
lists its credits (Laura's README, "Credits").

A full-colour picture keeps its own colours, and most of them fall under 3:1
against the light ground (they reach it on the dark one), so each is drawn with
`filter: var(--emoji-shadow)`: a tight, tinted shadow per scheme. A one-colour
picture is painted in the theme's primary through a mask, so it needs none.

## Emoji by Iconify name

`sea-emoji.ts` names the emoji Laura shows elsewhere, in two sets by their
Iconify prefix. Both are Apache 2.0, so no credit is required, and both stay
named here:

| Set | Prefix | Licence |
|---|---|---|
| Noto Emoji (Google), rounded and detailed | `noto` | Apache 2.0 |
| Firefox emoji (Mozilla, "fxemoji"), flatter and bolder | `fxemoji` | Apache 2.0 |
