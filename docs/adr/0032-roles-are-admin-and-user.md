# Roles are Admin and User; the Viewer Role is gone

ADR 0019 gave a Membership one of three Roles: Admin, User or Viewer. Only
Laura ever let Viewers in (its `minRole` floor was Viewer), and the rebuilt
Laura has nothing a Viewer would do differently from a User: both browse the
Gallery, read the Favorites and play the Memory game, and every change an
Admin alone makes (adding Images, setting Favorites) is already behind the
Admin Role. A third Role meant a branch in every guard, form and test for a
distinction no page used.

The `Role` enum keeps Admin and User. A changeset turns every Viewer
Membership into a User one, then drops the value; the Laura floor in
`ACCESS.APP_SETTINGS` becomes User. A Section can ask for a higher Role than
its App's floor (Laura's Upload Section is Admin only), which the Section
tuple states and the API enforces again on its routes.

## Considered Options

- **Keep Viewer for later**: no migration, but an unused Role that every guard
  and the Role picker must keep handling.
- **Make Viewer a flag on a User Membership** (`readOnly`): keeps the
  distinction without a Role, but nothing needs it and every write would check
  two things.

## Consequences

- Amends ADR 0019: Memberships hold Admin or User.
- A Viewer's Membership becomes a User one, so they gain what a User may do in
  Laura (submit a score); nothing they could do is taken away.
- `CONTEXT.md` loses the Viewer entry; the Back Office's Users form offers two
  Roles.
