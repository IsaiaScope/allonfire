import { AOFUserIdentity } from "@allonfire/ui/features/image/components/aof-user-identity";
import { AOFBadge } from "@allonfire/ui/shared/components/aof-badge";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { useTranslations } from "next-intl";
import type { LeaderboardEntry } from "../utils/leaderboard-queries";

/**
 * Who played: their Avatar, their name (marked when it is the caller) over
 * their email, in the dimensions of the Back Office's Users
 * (`AOFUserIdentity`): a large face on a card, a smaller one in a table row.
 */
export const LeaderboardPlayer = ({
  entry,
  large,
}: {
  entry: LeaderboardEntry;
  /** As on a card; otherwise as in a table row. */
  large?: boolean;
}) => {
  const t = useTranslations("Games");
  const name = entry.name ?? t("anonymous");
  return (
    <AOFUserIdentity
      aria-current={entry.isMe ? "true" : undefined}
      avatarProps={{
        blurDataUrl: entry.imageBlurDataUrl,
        image: entry.image,
        name,
      }}
      size={large ? "card" : "row"}
      subtitle={entry.email}
      title={
        <>
          <span
            className={cn("truncate", entry.isMe ? "font-bold" : "font-medium")}
          >
            {name}
          </span>
          {entry.isMe ? (
            <AOFBadge variant="secondary">{t("you")}</AOFBadge>
          ) : null}
        </>
      }
    />
  );
};
