# Laura admits no Viewer; Viewer stays a Role

ADR 0019 gave a Membership one of three Roles: Admin, User or Viewer. Only
Laura ever let Viewers in (its `minRole` floor was Viewer), and the rebuilt
Laura has nothing a Viewer would do differently from a User: both browse the
Gallery, read the Favorites and play the Memory game, and every change an
Admin alone makes (adding Images, setting Favorites) is already behind the
Admin Role. A Viewer branch in Laura's guards, forms and tests would be a
distinction no page uses.

The Viewer Role itself stays: the `Role` enum, `ACCESS.ROLE_RANK`, the
glossary and the translations keep it, for an App that one day wants a
read-only Role. What goes is everything Laura does about it. Laura's floor in
`ACCESS.APP_SETTINGS` becomes User, so no Viewer enters Laura and its Role
picker offers Admin and User; a changeset turns every existing Laura Viewer
Membership into a User one. No App admits a Viewer today (the Back Office's
floor is Admin), so the Role is dormant until an App's floor is lowered to it.

A Section can ask for a higher Role than its App's floor (Laura's Upload
Section is Admin only), which the Section tuple states and the API enforces
again on its routes: `canEnterApp(user, app, min?)` and `requireApp(app, min?)`
take the higher of the two, and never lower the floor.

## Considered Options

- **Drop the Viewer value from the enum**: one Role fewer to handle everywhere,
  but it removes a Role other Apps might want and costs an enum rebuild that
  cannot give its data back.
- **Make Viewer a flag on a User Membership** (`readOnly`): keeps the
  distinction without a Role, but nothing needs it and every write would check
  two things.
- **Leave Laura's floor at Viewer**: no data move, but Laura keeps a door for a
  Role none of its pages treats differently.

## Consequences

- Amends ADR 0019: Laura's floor is User; the Role set is unchanged.
- A Laura Viewer's Membership becomes a User one, so they gain what a User does
  in Laura (submit a score); nothing they could do is taken away. The move
  does not roll back: a rollback never knows which Memberships were Viewers.
- `CONTEXT.md` keeps the Viewer entry, now saying no App admits it today.
