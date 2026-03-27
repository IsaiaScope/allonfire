import {
  requireAdmin as requireAdminBase,
  requireAuth as requireAuthBase,
  requireUser as requireUserBase,
} from "@allonfire/auth/server";
import { auth } from "@/lib/auth";

export function requireAuth() {
  return requireAuthBase(auth);
}

export function requireUser() {
  return requireUserBase(auth);
}

export function requireAdmin() {
  return requireAdminBase(auth);
}
