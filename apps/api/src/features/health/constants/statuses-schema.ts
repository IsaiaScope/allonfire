import { z } from "zod";
import { HEALTH } from "./statuses";

export const checkStatusSchema = z.enum(HEALTH.CHECK.STATUS);

/** How one dependency answered its check. */
export type CheckStatus = z.infer<typeof checkStatusSchema>;
