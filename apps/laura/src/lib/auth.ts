import { createAuth } from "@allonfire/auth/server";
import { env } from "@/env";

export const auth = createAuth(env);
