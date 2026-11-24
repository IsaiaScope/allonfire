import { z } from "zod";
import { HTTP } from "../../../http/constants/http";

/** A posted field's text; none when missing or a file. */
export const textOf = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

const problemSchema = z.object({ code: z.string() }).catch({ code: "" });

/**
 * Reads why the API refused a form's write, for an App that knows the API's
 * `codes` (its `API.ERROR.CODE`) and the one `status` it answers with a
 * problem (`API.ERROR.STATUS`): core never imports the API, the App hands
 * them over. `refusalOf` gives the answer `known` holds for the problem's
 * code, else for the status. Past those, a 401 or a 403 means the Session is
 * gone or no longer lets the visitor make the change (a new password ended
 * it, a Role was taken away): trying again never works, signing in again
 * might (`REFUSED`); anything else is `FAILED`. A Map, so a code that names
 * something every object has (`constructor`) finds nothing; keyed by the
 * API's own codes and statuses, so one it never answers with does not compile.
 */
export const aofRefusal = <
  const Codes extends Record<string, string>,
  const Statuses extends readonly number[],
>({
  codes,
  status,
}: {
  codes: Codes;
  status: Statuses;
}) => {
  const codeSchema = z.enum(codes);
  const statusSchema = z.literal(status);
  return {
    refusalOf: async <E extends string>(
      res: Response,
      { FAILED, REFUSED }: { FAILED: E; REFUSED: E },
      known: ReadonlyMap<Codes[keyof Codes] | Statuses[number], E>
    ): Promise<E> => {
      const { code } = problemSchema.parse(await res.json().catch(() => null));
      const byCode = codeSchema.safeParse(code);
      const byStatus = statusSchema.safeParse(res.status);
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
    },
  };
};
