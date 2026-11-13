"use client";

import { AOFBarChart } from "@allonfire/ui/features/chart/components/aof-bar-chart";
import { AOFBadge } from "@allonfire/ui/shared/components/aof-badge";
import {
  AOFCardAction,
  AOFCardContent,
  AOFCardHeader,
} from "@allonfire/ui/shared/components/aof-card";
import { IconUsers } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/features/api/utils/api";
import { CardFrame } from "@/shared/components/card-frame";
import { OverviewTitle } from "@/shared/components/overview-card-state";
import { OverviewQueryView } from "@/shared/components/overview-query-view";
import { APP_ENTRY } from "@/shared/constants/apps";
import { cardBadge } from "@/shared/utils/card-badge";
import { USERS } from "../constants/users";
import { usersOverviewQuery } from "../utils/users-overview-queries";
import { UsersOverviewSkeleton } from "./users-overview-skeleton";

/**
 * The Users overview on Home, read back from the page's hydration under the
 * same key and asked again only when a User change refreshed it. One card: the
 * total as a badge and a Users bar and an Admins bar per App. Its states are a
 * `OverviewQueryView`'s, each a card of the same size.
 */
export const UsersOverview = () => {
  const t = useTranslations("Users.overview");
  const overview = useQuery(usersOverviewQuery(api));
  const card = {
    height: USERS.OVERVIEW.CHART_HEIGHT_PX,
    kanji: USERS.CARD_KANJI,
    title: (
      <OverviewTitle
        icon={<IconUsers aria-hidden className="size-5" />}
        text={t("title")}
      />
    ),
  };
  return (
    <OverviewQueryView
      card={card}
      query={overview}
      skeleton={<UsersOverviewSkeleton />}
      words={{
        failed: t("error.view"),
        forbidden: t("error.forbidden"),
        retry: t("error.retry"),
      }}
    >
      {({ byApp, total }) => (
        <CardFrame kanji={USERS.CARD_KANJI}>
          <AOFCardHeader>
            <OverviewTitle
              icon={<IconUsers aria-hidden className="size-5" />}
              text={t("title")}
            />
            <AOFCardAction className="self-center">
              <AOFBadge className={cardBadge({ tone: "chart1" })}>
                {t("total", { count: total })}
              </AOFBadge>
            </AOFCardAction>
          </AOFCardHeader>
          <AOFCardContent>
            <AOFBarChart
              aria-label={t("chart.label")}
              category="app"
              data={byApp.map(({ admins, app, count }) => ({
                app: APP_ENTRY[app].name,
                [USERS.OVERVIEW.ADMINS_KEY]: admins,
                [USERS.OVERVIEW.USERS_KEY]: count,
              }))}
              emptyLabel={t("chart.empty")}
              series={[
                {
                  color: USERS.OVERVIEW.CHART_COLOR,
                  key: USERS.OVERVIEW.USERS_KEY,
                  label: t("chart.users"),
                },
                {
                  color: USERS.OVERVIEW.ADMINS_COLOR,
                  key: USERS.OVERVIEW.ADMINS_KEY,
                  label: t("chart.admins"),
                },
              ]}
              wholeValues
            />
          </AOFCardContent>
        </CardFrame>
      )}
    </OverviewQueryView>
  );
};
