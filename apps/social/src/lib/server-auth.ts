import {
  requireAdmin as requireAdminBase,
  requireAuth as requireAuthBase,
} from "@allonfire/auth/server";
import { auth } from "@/lib/auth";

export function requireAuth() {
  return requireAuthBase(auth);
}

export function requireAdmin() {
  return requireAdminBase(auth);
}
