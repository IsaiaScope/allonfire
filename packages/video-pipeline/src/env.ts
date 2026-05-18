import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const booleanEnv = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return value;
}, z.boolean());

export const env = createEnv({
  server: {
    VIDEO_WORK_DIR: z.string().min(1).default("/Volumes/Crucial-4T/video"),
    VIDEO_MUSIC_DIR: z
      .string()
      .min(1)
      .default("/Volumes/Crucial-4T/video/sound"),
    WHISPER_MODELS_DIR: z
      .string()
      .min(1)
      .default("/Volumes/Crucial-4T/repo/allonfire/models"),
    WHISPER_MODEL: z.string().min(1).default("large-v3"),
    LOCAL_ASR_ENGINE: z.enum(["auto", "whisper-cpp"]).default("auto"),
    VIDEO_AGENT: z.enum(["auto", "claude", "codex"]).default("auto"),
    TRANSLATE_AGENT: z.enum(["auto", "claude", "codex"]).optional(),
    TRANSCRIPT_REPAIR_AGENT: z
      .enum(["off", "auto", "claude", "codex"])
      .optional(),
    TRANSCRIPT_REPAIR_ALWAYS: booleanEnv.default(false),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
