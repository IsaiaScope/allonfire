import { USER } from "@allonfire/auth/features/users/constants/users";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { BACK_OFFICE } from "../../back-office/constants/back-office";
import { LAURA } from "../../laura/constants/laura";
import { SERVICES } from "../../services/constants/services";

const INFRASTRUCTURE = "Infrastructure";

/** What the API's own OpenAPI document says about itself. */
export const OPENAPI = {
  DOC: {
    DESCRIPTION: "Backend for AllOnFire apps.",
    PROBLEM_DESCRIPTION: "RFC 9457 problem document",
    TITLE: "AllOnFire API",
  },
  TAG: {
    INFRASTRUCTURE,
  },
  /**
   * How the docs nest the tags (`x-tagGroups`): an App's routes under the App's
   * name, what every App shares under Platform. Every tag an operation uses is
   * in exactly one group, or the docs would hide it (`spec.test.ts` checks).
   */
  TAG_GROUPS: [
    {
      name: "Platform",
      tags: [
        AUTH.OPENAPI_TAG,
        IMAGE.OPENAPI_TAG,
        SERVICES.OPENAPI_TAG,
        INFRASTRUCTURE,
      ],
    },
    {
      name: BACK_OFFICE.OPENAPI_GROUP,
      tags: [USER.OPENAPI_TAG, BACK_OFFICE.OVERVIEW.OPENAPI_TAG],
    },
    {
      name: LAURA.OPENAPI_GROUP,
      tags: [LAURA.GALLERY.OPENAPI_TAG, LAURA.FAVORITES.OPENAPI_TAG],
    },
  ],
} as const;
