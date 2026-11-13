// @module-tag unit
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFHydratedBoundary } from "../components/aof-hydrated-boundary";

const STATE = { mutations: [], queries: [] };

const markup = (element: ReactElement) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      {element}
    </QueryClientProvider>
  );

describe("AOFHydratedBoundary", () => {
  it("hands its children the state the read kept", async () => {
    const element = await AOFHydratedBoundary({
      children: <p>the view</p>,
      hydration: () => Promise.resolve(STATE),
    });
    expect(element.type).toBe(HydrationBoundary);
    expect(element.props.state).toBe(STATE);
    expect(markup(element)).toBe("<p>the view</p>");
  });

  it("leaves a refused read to the view: no state, and no throw", async () => {
    const element = await AOFHydratedBoundary({
      children: <p>the view</p>,
      hydration: () => Promise.reject(new Error("403")),
    });
    expect(element.props.state).toBeUndefined();
    expect(markup(element)).toBe("<p>the view</p>");
  });
});
