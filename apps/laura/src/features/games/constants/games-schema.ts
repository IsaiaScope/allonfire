import { z } from "zod";
import { GAMES } from "./games";

const submitErrorSchema = z.enum(GAMES.SUBMIT_ERROR);

/** Why a score was not saved: what the action tells the dialog. */
export type SubmitError = z.infer<typeof submitErrorSchema>;
