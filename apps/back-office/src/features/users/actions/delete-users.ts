"use server";

import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { updateTag } from "next/cache";
import { serverApi } from "@/features/api/utils/server-api";
import { USERS } from "../constants/users";

/**
 * Deletes the Users named through the API as the visitor (an Admin, never
 * themselves: checked there), then drops every kept Users list in the same
 * request, so none can still show them. Answers how many went, or `null`
 * when the API refused: a thrown error reaches the browser without its
 * message in production.
 */
export const deleteUsers = async (ids: string[]): Promise<number | null> => {
  const client = await serverApi();
  const res = await client[API.VERSION.CURRENT].users.$delete({
    json: { ids },
  });
  if (res.status !== HTTP.STATUS.OK) {
    return null;
  }
  updateTag(USERS.CACHE.TAG);
  const { deleted } = await res.json();
  return deleted;
};
