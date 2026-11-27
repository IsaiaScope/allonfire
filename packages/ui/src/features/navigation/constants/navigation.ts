import { SCREEN } from "@allonfire/core/shared/constants/screens";

/** The frame's own values: its forms and its state in the address. */
export const NAVIGATION = {
  /** The App itself, before its first Section: the line's start. */
  APP_POSITION: "00",
  FORM: {
    /** The account menu's Sign out submits this form, outside its popup. */
    SIGN_OUT: "sign-out",
  },
  MEDIA: {
    /** Narrower than `md`, where the sidebar is a drawer (shadcn's own break). */
    PHONE: `(max-width: ${SCREEN.BREAKPOINT.MD - 1}px)`,
  },
  /** The only values the address can hold for the sidebar, each as the state it means. */
  OPEN: { false: false, true: true } as const satisfies Record<string, boolean>,
  PARAM: {
    /** `false` when the desktop sidebar is collapsed to its icons. */
    SIDEBAR: "sidebar",
  },
} as const;
