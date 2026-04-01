"use server";

import { createCheckAppAccessAction } from "@allonfire/auth/actions/check-access";
import { auth } from "@/lib/auth";

export const checkAppAccessAction = createCheckAppAccessAction(auth);
