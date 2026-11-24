// @module-tag unit
import {
  type DehydratedState,
  dehydrate,
  type InfiniteData,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFHydrateMissing } from "../components/aof-hydrate-missing";
import { AOFHydratedBoundary } from "../components/aof-hydrated-boundary";

// Static markup never runs the effect that hydrates a query the cache already
// holds, so the state each boundary hands TanStack is captured instead.
const handed: (DehydratedState | undefined)[] = [];
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  HydrationBoundary: ({
    children,
    state,
  }: {
    children: React.ReactNode;
    state?: DehydratedState;
  }) => {
    handed.push(state);
    return children;
  },
}));

const keysHanded = () => handed.at(-1)?.queries.map(({ queryKey }) => queryKey);

beforeEach(() => {
  handed.length = 0;
});

const KEPT = ["feed"] as const;
const NEW = ["other"] as const;

type Feed = InfiniteData<string, string | null>;

const feedOf = (...pages: string[]): Feed => ({
  pageParams: pages.map((_, index) => (index === 0 ? null : `c${index}`)),
  pages,
});

/** A state the server would hand over: the first page of each key. */
const stateOf = (client: QueryClient): DehydratedState => dehydrate(client);

const serverState = () => {
  const server = new QueryClient();
  server.setQueryData(KEPT, feedOf("first, newer"));
  server.setQueryData(NEW, feedOf("other first"));
  return stateOf(server);
};

/** Renders the boundary inside the browser's client and answers what it holds after. */
const renderIn = (browser: QueryClient, element: React.ReactElement) =>
  renderToStaticMarkup(
    <QueryClientProvider client={browser}>{element}</QueryClientProvider>
  );

describe("AOFHydrateMissing", () => {
  it("hands over only the feed the browser does not hold yet", () => {
    const browser = new QueryClient();
    browser.setQueryData(KEPT, feedOf("first", "second"));
    renderIn(
      browser,
      <AOFHydrateMissing state={serverState()}>
        <p>view</p>
      </AOFHydrateMissing>
    );
    expect(keysHanded()).toEqual([NEW]);
  });

  it("hands over everything to an empty cache", () => {
    const browser = new QueryClient();
    renderIn(
      browser,
      <AOFHydrateMissing state={serverState()}>
        <p>view</p>
      </AOFHydrateMissing>
    );
    expect(keysHanded()).toEqual([KEPT, NEW]);
  });

  it("renders its children when the read was refused (no state)", () => {
    expect(
      renderIn(
        new QueryClient(),
        <AOFHydrateMissing state={undefined}>
          <p>view</p>
        </AOFHydrateMissing>
      )
    ).toBe("<p>view</p>");
    expect(handed.at(-1)).toBeUndefined();
  });
});

describe("AOFHydratedBoundary onlyMissing", () => {
  it("renders the client component", async () => {
    const element = await AOFHydratedBoundary({
      children: <p>view</p>,
      hydration: () => Promise.resolve(serverState()),
      onlyMissing: true,
    });
    expect(element.type).toBe(AOFHydrateMissing);
  });

  it("still leaves a refused read to the view", async () => {
    const element = await AOFHydratedBoundary({
      children: <p>view</p>,
      hydration: () => Promise.reject(new Error("403")),
      onlyMissing: true,
    });
    expect(element.props.state).toBeUndefined();
  });
});
