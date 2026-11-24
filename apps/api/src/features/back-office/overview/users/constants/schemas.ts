import { appSchema } from "@allonfire/database/features/auth/access/constants/schemas";
import { z } from "zod";

const countSchema = z.number().int().nonnegative();

export const overviewBodySchema = z
  .object({
    /** Per App that has a member; a User in two Apps is in both rows. */
    byApp: z.array(
      z.object({
        /** How many of its members are Admins there. */
        admins: countSchema,
        app: appSchema,
        count: countSchema,
      })
    ),
    /** Every User once. */
    total: countSchema,
  })
  .meta({ ref: "UserOverview" });
export type OverviewBody = z.infer<typeof overviewBodySchema>;
