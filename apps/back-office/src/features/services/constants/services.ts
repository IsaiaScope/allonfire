import { UNIT } from "@allonfire/core/shared/constants/units";
import { ServiceType } from "@allonfire/database/enums";

/** How long a kept copy is fresh, read again in the background, and kept, in seconds. */
type CacheLife = { expire: number; revalidate: number; stale: number };

/** What the Services Section fixes: its form's choices, errors and kanji. */
export const SERVICES = {
  /**
   * Each Service type's providers (`servicesHydration(type)`), kept in the visitor's
   * browser (ADR 0028) under `TAG` (every type's) and its own `serviceTag`,
   * until a Services action drops this browser's copies with `updateTag`: a
   * type's own action drops that type's, one that cannot say its type (a
   * provider's) drops them all. Each type has its own lifetime, but none under
   * five minutes: below that Next takes the read for uncached data outside
   * any boundary and a navigation to the page blocks. A copy is read again
   * after five minutes (`revalidate`) and gone after an hour (`expire`).
   */
  CACHE: {
    LIFE: {
      [ServiceType.MAIL]: {
        expire: UNIT.SECONDS_PER_HOUR,
        revalidate: 5 * UNIT.SECONDS_PER_MINUTE,
        stale: 5 * UNIT.SECONDS_PER_MINUTE,
      },
    } as const satisfies Record<ServiceType, CacheLife>,
    TAG: "services",
  },
  /** Brushed large and faint behind a provider's card: 郵, the post. */
  CARD_KANJI: "郵",
  /** A switch's two choices, as a Gooey Nav posts them. */
  CHOICE: { OFF: "off", ON: "on" },
  /** Why saving a provider failed, as the form says it. */
  SAVE_ERROR: {
    CHANGED: "changed",
    FAILED: "failed",
    INCOMPLETE: "incomplete",
    INVALID: "invalid",
    REFUSED: "refused",
    /** Another Admin deleted the provider. */
    REMOVED: "removed",
  },
  /** 保, keep: set large behind Save. */
  SAVE_KANJI: "保",
  /** Why a test could not be asked for. */
  TEST_ERROR: {
    FAILED: "failed",
    RATE_LIMITED: "rateLimited",
    REMOVED: "removed",
  },
  /** 試, test: brushed in Send test email. */
  TEST_KANJI: "試",
} as const;

/** One Service type's own cache tag, under the one every type's copy also has. */
export const serviceTag = (type: ServiceType) =>
  `${SERVICES.CACHE.TAG}:${type}`;
