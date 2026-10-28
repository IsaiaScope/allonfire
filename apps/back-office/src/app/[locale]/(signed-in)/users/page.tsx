import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { AOFGetQueryClient } from "@allonfire/core/features/next/query/aof-get-query-client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { SectionPage } from "@/features/navigation/components/section-page";
import { SECTION } from "@/features/navigation/constants/sections";
import { sectionMetadata } from "@/features/navigation/utils/section-metadata";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { UsersListSkeleton } from "@/features/users/components/users-list-skeleton";
import { UsersTable } from "@/features/users/components/users-table";
import { loadUsersParams } from "@/features/users/constants/users-params";
import { readUsers } from "@/features/users/utils/read-users";
import { usersListKey } from "@/features/users/utils/users-queries";

export const generateMetadata = () => sectionMetadata(SECTION.USERS);

const leaveToTable = () => undefined;

type UsersPageProps = { searchParams: Promise<SearchParams> };

/**
 * The list's rows, read on the server from the address (cleaned, never
 * refused) through `readUsers`, kept on this server until a change to Users,
 * and handed to the table already filled: it reads the query back under the
 * same key. A query the API refused is left to the table, which asks again
 * and shows the error.
 */
const UsersList = async ({ searchParams }: UsersPageProps) => {
  const [params, sessionCookie] = await Promise.all([
    loadUsersParams(searchParams),
    readSessionCookie(),
  ]);
  // The Session is the page check's own read (one per request): whose row
  // has no checkbox.
  const [session, users] = await Promise.all([
    requireAppSession(),
    readUsers(sessionCookie, params).catch(leaveToTable),
  ]);
  const queryClient = AOFGetQueryClient();
  queryClient.setQueryData(usersListKey(params), users);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UsersTable selfId={session.user.id} />
    </HydrationBoundary>
  );
};

/**
 * The Users list: the page itself is in the static shell, so a visit paints
 * at once; only the rows, which hang on the address and the API, wait
 * behind the list's own skeleton (Next's instant navigation: the boundary
 * at the data it guards, never the page's loading screen).
 */
const UsersPage = ({ searchParams }: UsersPageProps) => {
  const t = useTranslations("Navigation");
  return (
    <SectionPage className="gap-6">
      {/* The header's breadcrumb already names the Section on screen; the
          page keeps its h1 for screen readers. */}
      <h1 className="sr-only">{t(SECTION.USERS.label)}</h1>
      <Suspense fallback={<UsersListSkeleton />}>
        <UsersList searchParams={searchParams} />
      </Suspense>
    </SectionPage>
  );
};

export default signedInPage(UsersPage);
