# Japan fonts

Self-hosted, all SIL Open Font License (the `OFL-*.txt` beside each face).

| File | Face | Use |
|---|---|---|
| `atkinson-hyperlegible-next-latin.woff2` | Atkinson Hyperlegible Next, 200 to 800 | Every Latin word (`font-sans`) |
| `dotgothic16-subset.woff2` | DotGothic16 | LED departure boards (`font-led`) |

DotGothic16 is a subset from the Google Fonts `text=` API:
printable ASCII, Latin-1, all hiragana and katakana, `、。「」・…←→·“”’` and
these kanji: `管理者専用番線発車次駅乗換到着新規登録終了出口改札本日`. A page that
prints a kanji outside that list falls back to the system font for it, so
re-download with the new character added:

```sh
curl -s -A "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/126 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=DotGothic16&text=<url-encoded characters>"
```

then fetch the `woff2` URL the CSS names.
