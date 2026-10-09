import type { AppSeed } from "../seed/seed-user";
import { lauraSeed } from "./laura/seed/laura-seed";

/** Every App's part of the seed; a new App adds its own here. */
export const APP_SEEDS = [lauraSeed] as const satisfies readonly AppSeed[];
