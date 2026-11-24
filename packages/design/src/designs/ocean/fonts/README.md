# Ocean fonts

Self-hosted, all SIL Open Font License (the `OFL-*.txt` beside each face).
Downloaded from Fontsource through jsDelivr (`cdn.jsdelivr.net/fontsource/fonts/`).

| File | Face | Use |
|---|---|---|
| `nunito-latin.woff2` | Nunito, variable weight 200 to 1000, Latin | Every Latin word (`font-sans`) |
| `fraunces-latin.woff2` | Fraunces, variable weight 100 to 900, Latin | Headings (`font-heading`) |
| `nunito-{400,700}.woff` | Nunito, static 400 and 700 | Generated images (`loadOceanImageFonts`): Satori cannot read WOFF2 or variable fonts |

Latin covers English and Italian. If Satori rejects a `.woff` in an `ImageResponse`,
convert it to a bare TrueType with `fonttools` (`TTFont(path).flavor = None`, save)
and rename the files: `image-fonts.test.ts` accepts TrueType, OpenType and WOFF.
