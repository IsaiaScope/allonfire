import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { z } from "zod";

const apiErrorCodeSchema = z.enum(API.ERROR.CODE);
const apiErrorStatusSchema = z.literal(API.ERROR.STATUS);

/** What a refusal is told by: a code the API answers with, or a status it answers with a problem. */
export type ApiRefusalKey =
  | z.infer<typeof apiErrorCodeSchema>
  | z.infer<typeof apiErrorStatusSchema>;

/** A posted field's text; none when missing or a file. */
export const textOf = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

const problemSchema = z.object({ code: z.string() }).catch({ code: "" });

/**
 * Why the API refused a form's write, as the form says it: the answer
 * `known` gives for the problem's code, else for the status. Past those, a
 * 401 or a 403 means the Session is gone or no longer lets the visitor
 * make the change (a new password ended it, a Role was taken away): trying
 * again never works, signing in again might (`REFUSED`); anything else is
 * `FAILED`. A Map, so a code that names something every object has
 * (`constructor`) finds nothing; keyed by the API's own codes and statuses,
 * so one it never answers with does not compile.
 */
export const refusalOf = async <E extends string>(
  res: Response,
  { FAILED, REFUSED }: { FAILED: E; REFUSED: E },
  known: ReadonlyMap<ApiRefusalKey, E>
): Promise<E> => {
  const { code } = problemSchema.parse(await res.json().catch(() => null));
  const byCode = apiErrorCodeSchema.safeParse(code);
  const byStatus = apiErrorStatusSchema.safeParse(res.status);
  const answer =
    (byCode.success ? known.get(byCode.data) : undefined) ??
    (byStatus.success ? known.get(byStatus.data) : undefined);
  if (answer) {
    return answer;
  }
  return res.status === HTTP.STATUS.UNAUTHORIZED ||
    res.status === HTTP.STATUS.FORBIDDEN
    ? REFUSED
    : FAILED;
};
