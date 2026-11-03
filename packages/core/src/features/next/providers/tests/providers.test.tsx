// @module-tag unit
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ENV } from "../../../../shared/constants/env";
import { HTTP } from "../../../http/constants/http";
import { AOFNuqsAdapter } from "../components/aof-nuqs-adapter";
import { AOFQueryClientProvider } from "../components/aof-query-client-provider";
import { AOFReactQueryDevtools } from "../components/aof-react-query-devtools";
import { AOFThemeProvider } from "../components/aof-theme-provider";

/** Where the Devtools tell an App what to pass as `enabled`. */
const DEVTOOLS_DOCS = [
  new URL("../components/aof-react-query-devtools.tsx", import.meta.url),
  join(REPO.PACKAGES, "core", "README.md"),
];

/** The constant a doc compares `env.NODE_ENV` with. */
const NODE_ENV_COMPARED = /env\.NODE_ENV === ([\w.]+)/g;

/** The value a dotted name such as `ENV.NODE.DEVELOPMENT` reads from core's constants. */
const lookup = (name: string): unknown =>
  name
    .split(".")
    .reduce<unknown>(
      (owner, key) =>
        typeof owner === "object" && owner !== null && key in owner
          ? Reflect.get(owner, key)
          : undefined,
      { ENV }
    );

const StaleTime = () => (
  <span>{String(useQueryClient().getDefaultOptions().queries?.staleTime)}</span>
);

describe("AOFQueryClientProvider", () => {
  it("gives its children a client with the default staleTime", () => {
    expect(
      renderToStaticMarkup(
        <AOFQueryClientProvider>
          <StaleTime />
        </AOFQueryClientProvider>
      )
    ).toBe("<span>60000</span>");
  });

  it("passes the App's staleTime on", () => {
    expect(
      renderToStaticMarkup(
        <AOFQueryClientProvider staleTime={5000}>
          <StaleTime />
        </AOFQueryClientProvider>
      )
    ).toBe("<span>5000</span>");
  });
});

describe("AOFReactQueryDevtools", () => {
  it("renders nothing when the App leaves it off", () => {
    expect(AOFReactQueryDevtools({ enabled: false })).toBeNull();
  });

  it("renders the lazy Devtools when the App turns it on", () => {
    expect(AOFReactQueryDevtools({ enabled: true })).not.toBeNull();
  });

  it.each(DEVTOOLS_DOCS)(
    "tells the App to compare NODE_ENV with a constant core has (%s)",
    async (doc) => {
      const named = [
        ...(await readFile(doc, "utf8")).matchAll(NODE_ENV_COMPARED),
      ];
      expect(named).not.toHaveLength(0);
      for (const [, name = ""] of named) {
        expect(lookup(name), name).toBe(ENV.NODE.DEVELOPMENT);
      }
    }
  );
});

describe("AOFThemeProvider", () => {
  it("follows the OS through a class by default", () => {
    const element = AOFThemeProvider({ children: "x" });
    expect(isValidElement(element) && element.type).toBe(ThemeProvider);
    expect(isValidElement(element) && element.props).toMatchObject({
      attribute: "class",
      children: "x",
      defaultTheme: "system",
      disableTransitionOnChange: true,
      enableSystem: true,
    });
  });

  it("lets every prop override the default", () => {
    const element = AOFThemeProvider({
      attribute: "data-theme",
      children: "x",
      defaultTheme: "dark",
    });
    expect(isValidElement(element) && element.props).toMatchObject({
      attribute: "data-theme",
      defaultTheme: "dark",
    });
  });

  it("keeps the theme script executable in the server's HTML", () => {
    const element = AOFThemeProvider({ children: "x" });
    expect(isValidElement(element) && element.props).not.toHaveProperty(
      "scriptProps"
    );
  });

  it("renders the theme script inert in the browser, where React refuses to run one", () => {
    vi.stubGlobal("window", {});
    const element = AOFThemeProvider({ children: "x" });
    vi.unstubAllGlobals();
    expect(isValidElement(element) && element.props).toMatchObject({
      scriptProps: { type: HTTP.CONTENT_TYPE.JSON },
    });
  });

  it("keeps the browser's script inert beside the App's own scriptProps", () => {
    vi.stubGlobal("window", {});
    const element = AOFThemeProvider({
      children: "x",
      scriptProps: { "data-cfasync": "false" },
    });
    vi.unstubAllGlobals();
    expect(isValidElement(element) && element.props).toMatchObject({
      scriptProps: { "data-cfasync": "false", type: HTTP.CONTENT_TYPE.JSON },
    });
  });
});

describe("AOFNuqsAdapter", () => {
  it("wraps its children in nuqs' App Router adapter", () => {
    const element = AOFNuqsAdapter({ children: "x" });
    expect(isValidElement(element) && element.type).toBe(NuqsAdapter);
    expect(isValidElement(element) && element.props).toMatchObject({
      children: "x",
    });
  });
});
