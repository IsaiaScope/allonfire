"use client";

import type { App } from "@allonfire/database/enums";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/features/api/utils/api";
import { ResourceView } from "@/shared/components/resource-view";
import { offeredApps } from "../utils/administered-apps";
import { imageQuery } from "../utils/images-queries";
import { EditImage } from "./edit-image";
import { EditImageSkeleton } from "./edit-image-skeleton";

/**
 * One Image's edit page, read under the key the page hydrated it with (so it
 * opens filled), then the form on it (`ResourceView` draws the 404, the
 * error and the wait). `administered` are the Apps the visitor is an Admin
 * of; the form offers those and the ones the Image is in.
 */
export const ImageEditor = ({
  administered,
  id,
}: {
  administered: readonly App[];
  id: string;
}) => {
  const query = useQuery(imageQuery(api, id));
  return (
    <ResourceView loading={<EditImageSkeleton />} query={query}>
      {(image) => (
        <EditImage
          image={image}
          offered={offeredApps(administered, image.apps)}
        />
      )}
    </ResourceView>
  );
};
