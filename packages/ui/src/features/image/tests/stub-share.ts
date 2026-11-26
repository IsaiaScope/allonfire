type Share = (data: ShareData) => Promise<void>;

/**
 * What the browser says about sharing files. An own property on `navigator`
 * hides the native method (Chromium and WebKit have one, Firefox on desktop
 * has none); `canShare: undefined` is a browser without it. Returns the spy on
 * `share`. Undo it with `restoreShare` after each test.
 */
export const stubShare = ({
  canShare,
  share = () => Promise.resolve(),
}: {
  canShare: ((data: ShareData) => boolean) | undefined;
  share?: Share;
}) => {
  const shared = vi.fn(share);
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: canShare,
  });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: shared,
  });
  return shared;
};

export const restoreShare = () => {
  Reflect.deleteProperty(navigator, "canShare");
  Reflect.deleteProperty(navigator, "share");
};

/** Every file a Download asks the browser to save, as the link it clicks says. */
export const watchSaves = () => {
  const saved: { href: string; name: string }[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    saved.push({ href: this.href, name: this.download });
  });
  return saved;
};
