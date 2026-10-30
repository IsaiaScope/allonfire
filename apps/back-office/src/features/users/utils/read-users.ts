import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { USERS } from "../constants/users";
import type { UsersParams } from "../constants/users-params";
import { fetchUsers } from "./users-queries";
import type { UsersVisitor } from "./users-visitor";

/**
 * One page of Users as the visitor (the API checks them; each Session, at
 * each Back Office Role, keeps an entry of its own), kept on this server under `USERS.CACHE.TAG`: every change to
 * Users calls `updateTag` on it. A refusal is thrown, never kept.
 */
export const readUsers = async (
  { sessionCookie }: UsersVisitor,
  params: UsersParams
) => {
  "use cache";
  cacheTag(USERS.CACHE.TAG);
  cacheLife(USERS.CACHE.LIFE);
  return await fetchUsers(sessionApi(sessionCookie), params);
};
