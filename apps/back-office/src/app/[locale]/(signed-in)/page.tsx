import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFHydratedBoundary } from "@allonfire/core/features/next/query/components/aof-hydrated-boundary";
import { Suspense } from "react";
import { HomeSection } from "@/features/home/components/home-section";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";
import { SectionPage } from "@/features/navigation/components/section-page";
import { SECTION } from "@/features/navigation/constants/sections";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { StorageOverview } from "@/features/storage/components/storage-overview";
import { StorageOverviewSkeleton } from "@/features/storage/components/storage-overview-skeleton";
import { storageOverviewHydration } from "@/features/storage/utils/storage-overview-hydration";
import { UsersOverview } from "@/features/users/components/users-overview";
import { UsersOverviewSkeleton } from "@/features/users/components/users-overview-skeleton";
import { usersOverviewHydration } from "@/features/users/utils/users-overview-hydration";
import { BACK_OFFICE } from "@/shared/constants/back-office";

// The layout's default title; only the address differs.
export const generateMetadata = () => pageMetadata(AUTH.PAGE.HOME);

// Sign out lives in the frame's account menu. Home is in the static shell and
// paints at once, each Section's name with its icon included: whoever the
// page check lets in is an Admin of the Back Office (its floor, pinned in the
// access tests), so a Section's heading is for everyone here, and only its
// cards wait on the API behind their own skeleton. Each Section that has
// something to show is a `HomeSection`: its name with its icon, then its
// cards. The header's breadcrumb names the page on screen; the page keeps its
// h1 for screen readers.
const HomePage = () => (
  <SectionPage className="gap-6" width="form">
    <h1 className="sr-only">{BACK_OFFICE.NAME}</h1>
    <HomeSection section={SECTION.USERS}>
      <Suspense fallback={<UsersOverviewSkeleton />}>
        <AOFHydratedBoundary hydration={usersOverviewHydration}>
          <UsersOverview />
        </AOFHydratedBoundary>
      </Suspense>
    </HomeSection>
    <HomeSection section={SECTION.STORAGE}>
      <Suspense fallback={<StorageOverviewSkeleton />}>
        <AOFHydratedBoundary hydration={storageOverviewHydration}>
          <StorageOverview />
        </AOFHydratedBoundary>
      </Suspense>
    </HomeSection>
  </SectionPage>
);

export default signedInPage(HomePage);
