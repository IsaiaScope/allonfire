import { z } from "zod";
import { errorCodeSchema } from "./error-codes";

export const errorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});

/**
 * RFC 9457 Problem Details, the IETF standard for HTTP error bodies.
 *
 * Replaces a bespoke `{ error: { code, message } }` envelope. The shape is
 * one clients may already understand — Spring and ASP.NET emit it natively —
 * rather than one they have to learn from our docs.
 *
 * - `type`     stable identifier for the problem class, from `ERROR_TYPE`
 * - `title`    invariant summary; the registered reason phrase for the status
 * - `status`   duplicated from the response line, per the RFC, so a logged or
 *              forwarded body is still self-describing
 * - `detail`   what went wrong *this time*, and the only localised member —
 *              `title` stays stable across occurrences by definition
 * - `instance` the path this occurred on
 *
 * `requestId` and `errors` are extension members, which §3.2 allows. `errors`
 * rather than `details` because `detail` singular is already a standard member
 * and the two would read as the same thing.
 */
export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  instance: z.string(),
  requestId: z.string(),
  code: errorCodeSchema,
  errors: z.array(errorDetailSchema).optional(),
});

export type ErrorDetail = z.infer<typeof errorDetailSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
