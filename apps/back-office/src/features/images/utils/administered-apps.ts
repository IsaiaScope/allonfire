import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import {
  accessUserFrom,
  canManageImage,
} from "@allonfire/database/features/auth/access/access";

/**
 * The Apps this user is an Admin of: the only ones they may put an Image in
 * (the API refuses any other). Offered by the Add Images form, so it never
 * offers a choice that cannot succeed; the API is still the judge.
 */
export const administeredApps = (user: {
  memberships: readonly { app: string; role: string }[];
}): App[] => {
  const access = accessUserFrom(user);
  return objectValues(App).filter((app) => canManageImage(access, app));
};

/**
 * The Apps the Edit Image form offers: the ones the visitor administers and
 * the ones the Image is in already (an App they cannot manage stays visible,
 * and can be kept).
 */
export const offeredApps = (
  administered: readonly App[],
  inApps: readonly App[]
): App[] => [...new Set([...administered, ...inApps])];
