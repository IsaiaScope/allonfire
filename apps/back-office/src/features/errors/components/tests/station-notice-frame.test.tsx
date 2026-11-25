// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { PWA_SIGNAGE } from "@/features/pwa/constants/pwa-signage";
import { ERROR_SIGNAGE } from "../../constants/error-signage";
import { StationNoticeFrame } from "../station-notice-frame";

const wallOf = (kind: "error" | "notFound" | "offline") =>
  renderToStaticMarkup(<StationNoticeFrame heading="Heading" kind={kind} />);

describe("StationNoticeFrame", () => {
  it.each([
    ["error", ERROR_SIGNAGE.ERROR],
    ["notFound", ERROR_SIGNAGE.NOT_FOUND],
    ["offline", PWA_SIGNAGE.OFFLINE],
  ] as const)("draws a %s notice with its own wall kanji", (kind, signage) => {
    expect(wallOf(kind)).toContain(`>${signage.KANJI}<`);
  });
});
