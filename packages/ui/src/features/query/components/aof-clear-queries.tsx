"use client";

import { AOFGetQueryClient } from "@allonfire/core/features/next/query/utils/aof-get-query-client";
import { useEffect } from "react";

/**
 * Empties the browser's query cache each time it shows. Sign in is where a
 * Session has just ended (a sign out, an expiry): the cache is the browser's
 * one copy of private pages, kept across a soft navigation, and the next
 * visitor to sign in on this page must start from none of it. With Cache
 * Components the page can stay mounted but hidden, and its effect runs again
 * each time it shows. Draws nothing.
 */
export const AOFClearQueries = () => {
  useEffect(() => {
    AOFGetQueryClient().clear();
  }, []);
  return null;
};
