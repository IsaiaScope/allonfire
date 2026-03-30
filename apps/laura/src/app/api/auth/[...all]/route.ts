import { createAuthHandler } from "@allonfire/auth/route";
import { auth } from "@/lib/auth";

export const { POST, GET } = createAuthHandler(auth);
