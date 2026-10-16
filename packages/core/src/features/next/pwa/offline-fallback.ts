/**
 * The worker's answer to a page load the network failed: the precached
 * Offline page of the URL's language (its first segment), else the default
 * language's. Workbox copies this function's source into `sw.js` without
 * its module, so it reads only `globalThis.AOF_PWA`, `caches` and `URL`.
 * `ignoreSearch`: the precache keys carry Workbox's revision parameter.
 */
export const offlineFallback = async ({ request }: { request: Request }) => {
  const settings = globalThis.AOF_PWA;
  if (!settings) {
    return;
  }
  const [, first] = new URL(request.url).pathname.split("/");
  const own = await caches.match(`/${first}${settings.offline}`, {
    ignoreSearch: true,
  });
  return (
    own ??
    caches.match(`/${settings.defaultLanguage}${settings.offline}`, {
      ignoreSearch: true,
    })
  );
};
