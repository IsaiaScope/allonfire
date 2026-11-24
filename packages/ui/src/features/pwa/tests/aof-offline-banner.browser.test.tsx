// @module-tag integration

import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { useCallback, useState } from "react";
import { renderInUi } from "../../../shared/tests/render-in-ui";
import {
  nextFrames,
  toastWouldHaveArrived,
} from "../../../shared/tests/toast-timing";
import { AOFOfflineBanner } from "../components/aof-offline-banner";

const offline = vi.hoisted(() => ({ value: false }));
vi.mock("next/offline", () => ({ useOffline: () => offline.value }));

const TEXT = SHARED_TRANSLATIONS.en.Common.Offline;

/** The App's own card, as far as the banner is concerned. */
const Card = ({
  description,
  title,
}: {
  description: string;
  title: string;
}) => (
  <aside>
    <b>{title}</b>
    <p>{description}</p>
  </aside>
);

/** Sonner sends a dismissal a frame later: let the last test's land. */
afterEach(nextFrames);

/** The banner with a button that renders it again: what a network change does. */
const Probe = () => {
  const [, setRenders] = useState(0);
  const again = useCallback(() => setRenders((renders) => renders + 1), []);
  return (
    <>
      <button onClick={again} type="button">
        again
      </button>
      <AOFOfflineBanner Card={Card} />
    </>
  );
};

const banner = () => renderInUi({ children: <Probe />, messages: {} });

describe("AOFOfflineBanner", () => {
  it("toasts the lost connection in the App's card, and leaves when it is back", async () => {
    offline.value = true;
    const screen = await banner();
    await expect.element(screen.getByText(TEXT.banner.title)).toBeVisible();
    await expect
      .element(screen.getByText(TEXT.banner.description))
      .toBeVisible();
    offline.value = false;
    // The toast sits over the page: a DOM click, not a pointer one.
    screen
      .getByText("again")
      .element()
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect
      .element(screen.getByText(TEXT.banner.title))
      .not.toBeInTheDocument();
    screen.unmount();
  });

  it("toasts nothing while online", async () => {
    offline.value = false;
    const screen = await banner();
    await toastWouldHaveArrived();
    await expect
      .element(screen.getByText(TEXT.banner.title))
      .not.toBeInTheDocument();
  });
});
