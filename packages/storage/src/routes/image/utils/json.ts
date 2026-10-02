import { z } from "zod";

/** Text parsed as JSON; text that is not JSON is the client's 400 `message`. */
export const jsonFrom = (message: string) =>
  z.string().transform((text, context) => {
    try {
      return JSON.parse(text);
    } catch {
      context.addIssue({ code: "custom", message });
      return z.NEVER;
    }
  });
