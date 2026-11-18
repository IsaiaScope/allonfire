import { z } from "zod";

/** The actions a shared piece draws that mean the same in every App. */
const AOF_ACTION = {
  BACK: "back",
  ENTER: "enter",
  RETRY: "retry",
  SAVE: "save",
  SEND: "send",
} as const;

const aofActionSchema = z.enum(AOF_ACTION);

export type AOFAction = z.infer<typeof aofActionSchema>;
