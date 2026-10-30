/**
 * What the build prepends to `sw.js` (`self.AOF_PWA = {...}`): the worker's
 * plugins read it here, since Workbox copies their source without their
 * imports.
 */
declare global {
  var AOF_PWA:
    | {
        /** The language whose Offline page answers a URL with no language. */
        defaultLanguage: string;
        /** `PWA.PATH.OFFLINE`. */
        offline: string;
      }
    | undefined;
}

export {};
