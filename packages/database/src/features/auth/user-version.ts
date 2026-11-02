import { versionOf } from "@allonfire/core/features/version/utils/version-of";
import type { AccessMembership } from "./access/access";

/** What a User's Version covers: what an edit could overwrite. */
export type VersionedUser = {
  updatedAt: Date;
  memberships: readonly AccessMembership[];
};

/**
 * A User's Version: their row's last change and every (App, Role) they hold.
 * A Membership has no timestamp of its own, and one removed elsewhere leaves
 * no row, so the pairs themselves are hashed; sorted, so their order never
 * counts.
 */
export const userVersion = ({ updatedAt, memberships }: VersionedUser) =>
  versionOf(
    updatedAt.toISOString(),
    ...memberships.map(({ app, role }) => `${app}:${role}`).sort()
  );
