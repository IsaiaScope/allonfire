import { problemResponseName } from "@allonfire/core/features/errors/constants/openapi";
import { z } from "zod";
import type { ErrorStatus } from "../../../shared/constants/http";
import { codesFor, errorCodeSchema } from "./error-codes";

export const errorDetailSchema = z.object({
  message: z.string(),
  path: z.string(),
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
  code: errorCodeSchema,
  detail: z.string(),
  errors: z.array(errorDetailSchema).optional(),
  instance: z.string(),
  requestId: z.string(),
  status: z.number(),
  title: z.string(),
  type: z.string(),
});

/**
 * The problem document for one status, as the docs show it: `status` fixed
 * and `code` only the codes sent with it. One named schema per status.
 */
export const problemDetailsSchemaFor = (status: ErrorStatus) =>
  problemDetailsSchema
    .extend({ code: z.enum(codesFor(status)), status: z.literal(status) })
    .meta({ ref: problemResponseName(status) });

export type ErrorDetail = z.infer<typeof errorDetailSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
