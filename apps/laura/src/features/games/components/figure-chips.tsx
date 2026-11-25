import { formatTime } from "@allonfire/core/shared/utils/format-time";
import { IconClick, IconClock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { StatValue } from "./board-stat";

type ChipProps = Omit<ComponentProps<typeof StatValue>, "children">;

/** A game's moves on a chip, its label heard by a screen reader: for a `dl`. */
export const MovesChip = ({
  moves,
  ...props
}: ChipProps & { moves: number }) => {
  const t = useTranslations("Games");
  return (
    <>
      <dt className="sr-only">{t("moves")}</dt>
      <StatValue {...props}>
        <IconClick aria-hidden />
        {moves}
      </StatValue>
    </>
  );
};

/** A game's time on a chip (`m:ss.cc`), its label heard by a screen reader: for a `dl`. */
export const TimeChip = ({
  timeMs,
  ...props
}: ChipProps & { timeMs: number }) => {
  const t = useTranslations("Games");
  return (
    <>
      <dt className="sr-only">{t("time")}</dt>
      <StatValue {...props}>
        <IconClock aria-hidden />
        {formatTime(timeMs)}
      </StatValue>
    </>
  );
};
