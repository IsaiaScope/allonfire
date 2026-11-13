import { formatSize } from "@allonfire/core/shared/utils/format-size";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess } from "@allonfire/database/enums";
import { AOFBarChart } from "@allonfire/ui/features/chart/components/aof-bar-chart";
import { useTranslations } from "next-intl";
import { APP_ENTRY } from "@/shared/constants/apps";
import { STORAGE } from "../constants/storage";
import type {
  StorageAvatars,
  StorageImages,
} from "../utils/storage-overview-queries";

/** The access names as the legend says them. */
const SERIES_LABEL = {
  [ImageAccess.PRIVATE]: "private",
  [ImageAccess.PUBLIC]: "public",
} as const satisfies Record<ImageAccess, "private" | "public">;

/**
 * Bytes per App, three lines for each: its public Images, its private Images
 * and its Avatars (its Users' pictures). A file counts in every App it is in;
 * an App is added when it has an Image or an Avatar, so the chart grows down
 * the page with them.
 */
export const StorageChart = ({
  avatars,
  images,
}: {
  avatars: StorageAvatars["byApp"];
  images: StorageImages["byApp"];
}) => {
  const t = useTranslations("Storage.chart");
  const rows = objectValues(App).flatMap((app) => {
    const image = images.find((row) => row.app === app);
    const avatar = avatars.find((row) => row.app === app);
    return image || avatar
      ? [
          {
            app: APP_ENTRY[app].name,
            [ImageAccess.PRIVATE]: image?.privateBytes ?? 0,
            [ImageAccess.PUBLIC]: image?.publicBytes ?? 0,
            [STORAGE.AVATARS_KEY]: avatar?.bytes ?? 0,
          },
        ]
      : [];
  });
  return (
    <AOFBarChart
      aria-label={t("label")}
      category="app"
      data={rows}
      emptyLabel={t("empty")}
      series={[
        ...objectValues(ImageAccess).map((access) => ({
          color: STORAGE.CHART_COLOR[access],
          key: access,
          label: t(SERIES_LABEL[access]),
        })),
        {
          color: STORAGE.CHART_COLOR.AVATARS,
          key: STORAGE.AVATARS_KEY,
          label: t("avatars"),
        },
      ]}
      valueFormat={formatSize}
    />
  );
};
