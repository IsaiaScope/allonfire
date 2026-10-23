import { objectFromEntries } from "../../../shared/utils/object";

/**
 * The OpenAPI response a module's route points an error at, one per status.
 * A host publishing docs registers each under this name, listing only the
 * codes it sends with that status, so the Image module and the API agree on
 * the name without either knowing the other.
 */
export const problemResponseName = <S extends number>(status: S) =>
  `Problem${status}` as const;

export const problemResponseRef = <S extends number>(status: S) =>
  `#/components/responses/${problemResponseName(status)}` as const;

/**
 * A route's error responses, one `$ref` per status, so its docs list only
 * the codes each status carries: `...problemResponses(401, 403)`.
 */
export const problemResponses = <S extends number>(...statuses: S[]) =>
  objectFromEntries(
    statuses.map(
      (status) => [status, { $ref: problemResponseRef(status) }] as const
    )
  );
