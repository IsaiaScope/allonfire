import { setupWorker } from "msw/browser";
import { afterAll, afterEach, beforeAll } from "vitest";

/**
 * The one MSW worker of a browser test run. A test overrides an answer with
 * `worker.use(...)`; the next test starts from the App's own handlers again.
 * Its service worker script, `/mockServiceWorker.js`, is served by Vitest's
 * browser mode from the installed `msw`: no App keeps a copy in `public/`,
 * where it would ship to production.
 */
export const worker = setupWorker();

type Handlers = Parameters<typeof setupWorker>;

const unhandled: string[] = [];

/** The unhandled requests since the last call, cleared as they are read. */
export const takeUnhandled = () => unhandled.splice(0);

/**
 * Starts MSW around every browser test, answering with the App's handlers:
 * each App fakes its own API, a package never does. Call it once, from the
 * App's browser setup file.
 *
 * A request to another origin that no handler answers never reaches a
 * network: `print.error()` throws, so the fetch fails. It is also recorded,
 * and the test that sent it fails, since code that catches the failure would
 * otherwise let it pass. The test page's own origin goes through: it is Vite
 * serving the test's modules.
 */
export const startMsw = (...handlers: Handlers) => {
  beforeAll(async () => {
    worker.resetHandlers(...handlers);
    await worker.start({
      onUnhandledRequest: (request, print) => {
        if (new URL(request.url).origin === location.origin) {
          return;
        }
        unhandled.push(`${request.method} ${request.url}`);
        print.error();
      },
      quiet: true,
    });
  });
  afterEach(() => {
    worker.resetHandlers();
    const requests = takeUnhandled();
    if (requests.length > 0) {
      throw new Error(`No MSW handler answered: ${requests.join(", ")}`);
    }
  });
  afterAll(() => worker.stop());
};
