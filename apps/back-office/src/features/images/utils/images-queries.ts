import { API } from "@allonfire/api/shared/constants/api";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { queryOptions } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import type { ApiClient } from "@/features/api/utils/api";
import { QUERY } from "@/shared/constants/query";
import { retryUnlessRefused } from "@/shared/utils/retry";
import { IMAGES } from "../constants/images";
import type { ImagesParams } from "../constants/images-params";

/**
 * Asks once more after a server or network failure; never after the API
 * refused (a 401, 403 or 400), so the error shows at once.
 */
const retryImages = retryUnlessRefused(IMAGES.RETRIES);

/** One numbered page of Images from the API; an error throws `DetailedError`. */
export const fetchImages = (client: ApiClient, params: ImagesParams) =>
  parseResponse(
    client[API.VERSION.CURRENT].images.$get({
      query: {
        [IMAGES.PARAM.PAGE]: String(params[IMAGES.PARAM.PAGE]),
        [IMAGES.PARAM.PER_PAGE]: String(params[IMAGES.PARAM.PER_PAGE]),
        [IMAGES.PARAM.SEARCH]: params[IMAGES.PARAM.SEARCH],
      },
    })
  );

/** One Image from the API; an error throws `DetailedError`. */
export const fetchImage = (client: ApiClient, id: string) =>
  parseResponse(
    client[API.VERSION.CURRENT].images[":id"].$get({ param: { id } })
  );

/**
 * One page's key, tagged with the body it holds: the page hydrates under it,
 * so a wrong body or wrong params fail to compile, never a skipped hydration.
 */
export const imagesListKey = (params: ImagesParams) =>
  queryOptions<Awaited<ReturnType<typeof fetchImages>>>({
    queryKey: QUERY.IMAGES.LIST(params),
  }).queryKey;

/**
 * One page of Images. The page reads it on the server (`imagesHydration`) and
 * the table reads it back under the same key, fresh as long as the browser
 * keeps the page's copy (`IMAGES.CACHE.LIFE.stale`): a shorter clock would
 * read a kept copy again the moment a link brings it back.
 */
export const imagesQuery = (client: ApiClient, params: ImagesParams) =>
  queryOptions({
    queryFn: () => fetchImages(client, params),
    queryKey: imagesListKey(params),
    retry: retryImages,
    staleTime: IMAGES.CACHE.LIFE.stale * UNIT.MS_PER_SECOND,
  });
