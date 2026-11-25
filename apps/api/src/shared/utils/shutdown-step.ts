import { z } from "zod";
import { API } from "../constants/api";

const shutdownStepSchema = z.enum(API.SHUTDOWN.STEP);

/** A name in the shutdown log line: a step added to `API.SHUTDOWN.STEP` without a matching close call fails to compile. */
export type ShutdownStep = z.infer<typeof shutdownStepSchema>;
