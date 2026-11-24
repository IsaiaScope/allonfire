/**
 * An address's host, none when the text is not an address. `new URL` in a
 * `try`, never `URL.parse`: code that runs in the browser (ui, an App's
 * pages) cannot rely on `URL.parse`, which is Chrome 126 and Safari 18 or
 * later; on an older phone it threw and took the whole signed-in frame down
 * with the account menu.
 */
export const hostOf = (address: string): string | undefined => {
  try {
    return new URL(address).hostname;
  } catch {
    return undefined;
  }
};
