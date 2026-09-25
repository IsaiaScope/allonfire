import {
  type ProblemDetails,
  problemDetailsSchema,
} from "../constants/problem-details";

/**
 * The response's problem document, parsed rather than cast: a body missing a
 * required member fails the test instead of passing as `undefined`.
 */
export const problemOf = async (res: Response): Promise<ProblemDetails> =>
  problemDetailsSchema.parse(await res.json());
