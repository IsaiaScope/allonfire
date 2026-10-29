# Edit a User (Back Office `users/[id]`)

## Intent

The Users list already links every row to `users/[id]`, which is a
placeholder ("a User's Memberships and details arrive in a later version").
An Admin needs to fix a User after adding them: rename them, change what they
may do in each App, give them a picture, and set a new password when one was
lost or leaked. This page is that edit, built from the same pieces as Add a
User so the two forms read as one.

## Goals

- `users/[id]` opens straight on an edit form (no read-only view first):
  headed by the User's email (it never changes; the name is a field), the
  email shown in a field nobody can reach, then the same blocks as Add a
  User.
- Editable: the name, the Avatar, the password (typed twice, the same live
  rules as Add a User), and the Role in each App.
- Never editable, by anyone: the email.
- You can edit yourself, except your own Role in the Back Office (the App
  that manages Users): that row is locked with a note. This keeps at least
  one Back Office Admin, the one editing.
- Save goes back to the list with a "Saved" toast; a refusal keeps the form
  with its `FormAlert`.

## Non-goals

- No current-password field, for yourself or anyone (asked and dropped: the
  caller is an Admin read fresh). A real "change my password" belongs to a
  future account page.
- No Delete on this page: Delete stays in the list.
- No conflict check between two Admins saving the same User: the last save
  wins.
- No change to Registration, Sign in or the list's filters.

## Anti-goals

- A second, diverging form: the edit form shares Add a User's fields, Role
  rows, password rules and avatar field.
- An empty password field that silently wipes or resets a password.
- A Role change that signs people out (too much); a new password that does
  not (the point of setting one is often a leak).

## Decided behaviour

| Case | Behaviour |
|---|---|
| Both password fields empty | Password kept; the rules and the match check apply only once either field holds text |
| New password for another User | Saved; every Session of theirs is deleted |
| New password for yourself | Saved; your other Sessions are deleted, the one you are using is kept |
| New password for a User with no `credential` Account (Google) | The `credential` Account is created; they can then sign in either way |
| A Role changed or removed | Saved; no Session is touched (writes already read Roles fresh; a page lags at most the 5-minute cookie cache) |
| Your own Back Office Role | Locked in the form; the API answers 403 `CANNOT_CHANGE_OWN_ROLE` to a change of it |
| Your own row in the list | Links like every row (only its Delete checkbox stays off) |
| Unknown or deleted id on open | 404 (`notFound()`) |
| User deleted by another Admin before Save | The API answers 404; the form's alert says they no longer exist |
| Avatar | Saved with the rest on Save: the update first, then `PUT` (a new picture) or `DELETE` (removed) on the Avatar; a picture the API refuses leaves the rest saved, toasts a warning and opens the list, as Add a User does |
| Two Admins saving the same User | Last write wins |

A deleted Session can still pass a page's check for up to the 5-minute cookie
cache (`AUTH.SESSION.COOKIE_CACHE_MAX_AGE_S`); every API write reads fresh.
Same lag as a Role taken away; accepted for reads. Writes do not lag:
`canManageUsers` checks the caller's Session row still exists as well as
their Role, so a Session ended by a new password stops changing Users at
once.

## API (the User module, `packages/auth/src/features/users`)

- `GET /users/:id`: one User, the same body as a list row (`userBodySchema`,
  Avatar signed for now). 404 for an unknown id. Guard: `canManageUsers`
  (read fresh), since only the edit page reads it.
- `PATCH /users/:id`: `{ name?, memberships?, password? }`. `memberships` is
  the full set (one per App) and replaces the User's. Guard:
  `canManageUsers`. 404 for an unknown id. Refuses a change to the caller's
  own Membership in the Host's `manageApp` with 403
  `USER.ERROR_CODE.CANNOT_CHANGE_OWN_ROLE`, changing nothing.
- The module never names an App: the Host passes `manageApp` in `UserDeps`
  (the API: `App.BACK_OFFICE`, the same App `isBackOfficeAdmin` checks).
- The database service gets `readUser(id)` and `updateUser(id, change,
  { keepSessionId })`: one transaction for the name, the Memberships
  replaced, the password (hashed by the module as `createUser`'s is; the
  `credential` Account updated or created) and, when a password was set,
  the Sessions deleted except `keepSessionId`. Null for an unknown id.
- The API's error catalogue, problem docs and translations gain the new code.

## Back Office

- `readUser(sessionCookie, id)` under `"use cache"` with `USERS.CACHE.TAG`
  and `USERS.CACHE.LIFE` (it carries signed Avatar links, like `readUsers`).
  The update's action calls `updateTag(USERS.CACHE.TAG)`, dropping the list
  and the page together.
- The page (`users/[id]`) stays `signedInPage`, `SectionPage width="form"`,
  the form in `AOFFreshOnReturn` (no typed password kept in a hidden page),
  its request-time read behind its own `<Suspense>`; `generateMetadata`
  unchanged.
- `EditUser`, a client form like `AddUser` (an AOF form, ADR 0017,
  `useActionState` over the `editUser` server action), reusing Add a User's
  pieces: the Role rows, `PasswordRules`, the avatar field, the action row
  (Cancel, Save with its own kanji). What both forms share moves out of
  `add-user.tsx` rather than being copied.
- The schema: the edit form's own zod (name required, password optional
  but, once typed, the same rules and match as Add a User; Roles per App);
  the action repeats it, and the action's copy counts.
- `AOFAvatarField` learns to show the picture a User already holds and to
  post that it was removed, so the action knows "unchanged", "new" and
  "removed" apart.

## Left to the builder

- Translation keys and copy under `Users.edit` (en and it), the Save
  button's kanji, the locked row's note.
- How `AOFAvatarField` encodes "removed" in the posted form.
- Whether the shared form pieces live in one file or several under
  `features/users/components/`.
