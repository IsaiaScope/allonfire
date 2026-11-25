# Laura leaderboard: library survey

Date: 2026-11-25. For the Memory leaderboard page (`/memory/leaderboard`): the top 10, a podium, the caller's place, coloured icons. Free options only; the owner does not buy blocks.

| Source | Matching blocks | Radix or Base UI, install | Fit | Verdict |
|---|---|---|---|---|
| Trophy UI (`https://ui.trophy.so`, `github.com/trophyso/ui`, MIT) | `leaderboard-podium` (top three, crowns, avatars), `leaderboard-rankings` (avatars, scores, crown highlight), `leaderboard-card` (both) | shadcn registry JSON, free with no key (`https://ui.trophy.so/r/<name>.json`, all three answer 200); needs `class-variance-authority` and `lucide-react` (Laura uses Tabler); Radix or Base UI not stated | podium and rows match the need; icons and colours must be rewired to the Ocean tokens and emoji art | `use`: free checked 2026-11-25 (registry JSON with the full source answers 200, no key; `LICENSE.md` is MIT) |
| 21st.dev klyv-ui `leaderboard` (MIT) | ranked list, ties, movement arrows, current user pinned | needs a 21st API key, a daily install limit on the free plan | pinned caller row is the idea we want | `idea only` |
| shadcn.io `features-leaderboard-medal-podium`, `awards-podium` | podium of three heights, table of eight rows | Base UI, "Part of Pro": code locked | the layout reads well | `skip` (paid) |
| Shadcnblocks `leaderboard1..3` | progress bars, avatars, trends | `npx shadcn add @shadcnblocks/leaderboard1`; price not stated, a Pro site | | `skip` (paid at most) |
| 8bitcn `leaderboard` (`https://8bitcn.com/docs/blocks/gaming/leaderboard`) | retro 8-bit top-5 table with a highlighted "YOU" row | `pnpm dlx shadcn@latest add @8bitcn/leaderboard`, registry JSON answers 200 with no key; Radix or Base UI not stated; GitHub reports MIT | pixel look clashes with Ocean | `idea only` (the highlighted own row); free checked (MIT, no key) |
| Shadcnblocks `leaderboard1` (free) | ranked list, name and value, a bar scaled to the leader | `npx shadcn add @shadcnblocks/leaderboard1`, JSON with source served with no key, but its free blocks fall under Shadcnblocks' Terms & Conditions, which were not read | the bars suit moves and time | `idea only`: copy nothing until the terms are read |
| shadcn.io `tables-leaderboard`, `stats-leaderboard-ranked-list` | Top 5 / Top 10 / Around me toggle, tied places, pinned You row; Week/Month switch | Base UI, Pro | the toggle and the pinned row are the owner's idea exactly | `skip` (paid), copy the idea |
| Official shadcn blocks, Shadcn Studio, React Bits, Ui-Layouts, Aceternity | no leaderboard or podium found | | | `skip` |

What Laura already holds and should reuse: `BoardStat` badges (the game's own), the colour emoji art (`OceanArt`, `MASCOT.GAMES`), `AOFUserAvatar`, `AOFDataTable`, `AOFBadge`.
