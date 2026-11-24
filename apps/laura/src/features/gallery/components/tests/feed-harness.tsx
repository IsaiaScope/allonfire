import type { GalleryPageBody } from "@allonfire/api/features/laura/constants/schemas";
import { worker } from "@allonfire/config/tests/browser/msw";
import { AOFHydrateMissing } from "@allonfire/core/features/next/query/components/aof-hydrate-missing";
import { dehydrate, QueryClient, useQueryClient } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { useCallback, useState } from "react";
import { page } from "vitest/browser";
import { QUERY } from "@/shared/constants/query";
import { GALLERY_PAGE, GALLERY_URL } from "@/shared/tests/msw/handlers";
import { enT } from "@/shared/tests/translators";
import { GALLERY, type GallerySource } from "../../constants/gallery";
import { GalleryFeed } from "../gallery-feed";

export const ONLY_PAGE = { ...GALLERY_PAGE, nextCursor: null };
export const NOTHING = {
  items: [],
  nextCursor: null,
} satisfies GalleryPageBody;

/** A first page as the page's hydration hands it to the browser. */
const firstPage = (body: GalleryPageBody, source: GallerySource) => {
  const client = new QueryClient();
  client.setQueryData(
    source === GALLERY.SOURCE.FAVORITES
      ? QUERY.FAVORITES.FEED
      : QUERY.GALLERY.FEED,
    {
      pageParams: [GALLERY.FIRST_PAGE],
      pages: [body],
    }
  );
  return dehydrate(client);
};

/** Every request the Gallery gets, as its `cursor`, while it answers `bodies` in turn. */
export const answer = (...bodies: GalleryPageBody[]) => {
  const asked: (string | null)[] = [];
  worker.use(
    http.get(GALLERY_URL, ({ request }) => {
      asked.push(new URL(request.url).searchParams.get("cursor"));
      return HttpResponse.json(bodies.at(asked.length - 1) ?? NOTHING);
    })
  );
  return asked;
};

/** The query client the feed reads, for a test that changes it from outside. */
let queryClient: QueryClient | undefined;
/** The query client the feed reads, once it rendered. */
export const feedClient = () => queryClient as QueryClient;
const Capture = () => {
  queryClient = useQueryClient();
  return null;
};

export const Feed = ({
  body = GALLERY_PAGE,
  canMark = false,
  source = GALLERY.SOURCE.GALLERY,
}: {
  body?: GalleryPageBody;
  canMark?: boolean;
  source?: GallerySource;
}) => {
  const [state, setState] = useState(firstPage(body, source));
  const renderAgain = useCallback(
    () => setState(firstPage(body, source)),
    [body, source]
  );
  return (
    <div className="@container" style={{ width: 900 }}>
      <button onClick={renderAgain} type="button">
        Render again
      </button>
      <Capture />
      <AOFHydrateMissing state={state}>
        <GalleryFeed canMark={canMark} source={source} />
      </AOFHydrateMissing>
    </div>
  );
};

/** The photos only: a toast is a list item too. */
export const tiles = () =>
  page.getByRole("list", { name: enT("Gallery.list") }).getByRole("listitem");
