import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { QUERY } from "@/shared/constants/query";

/**
 * Asks again for every Service on screen: after an action changed one (or
 * sent mail), so the rings and the forms show the API's answer, not a copy.
 */
export const useRefreshServices = () => {
  const client = useQueryClient();
  return useCallback(
    () => client.invalidateQueries({ queryKey: QUERY.SERVICES.ALL }),
    [client]
  );
};
