import type { AOFNoticeFrame } from "@allonfire/ui/features/feedback/types/notice";
import { ERROR_SIGNAGE } from "@/features/errors/constants/error-signage";
import { PWA_SIGNAGE } from "@/features/pwa/constants/pwa-signage";
import { StationNotice } from "@/shared/components/station-notice";

/** The Japan Design's signage for each kind of notice. */
const SIGNAGE = {
  error: ERROR_SIGNAGE.ERROR,
  notFound: ERROR_SIGNAGE.NOT_FOUND,
  offline: PWA_SIGNAGE.OFFLINE,
} as const;

/**
 * The shared notices drawn as a station's notice: the eki stamp, the kanji
 * brushed across the wall, then the words and the action; a reference (an
 * error's digest) goes on a small LED board. The kind picks the signage.
 */
export const StationNoticeFrame: AOFNoticeFrame = ({
  children,
  kind,
  reference,
  ...props
}) => (
  <StationNotice {...props} signage={SIGNAGE[kind]}>
    {children}
    {reference ? (
      <p className="led-board px-3 py-1 text-sm">{reference}</p>
    ) : null}
  </StationNotice>
);
