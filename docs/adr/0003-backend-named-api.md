# The backend is named `api`, not `server`

`apps/api` / `@allonfire/api`. "Server" was the working name and is the more
obvious one, but it is already taken twice in this repo: `packages/auth/src/server.ts`
is the Better Auth instance, and Next's Server Components are called servers
throughout `CLAUDE.md`. `api` collides with nothing, reads correctly at call
sites (`@allonfire/api/client`), and matches the eventual `api.isaiariva.com`.

Recorded because the rename becomes a sweep across every consumer once Laura and
the React Native client import the typed client, and because "server" will look
like the natural name to anyone arriving later.
