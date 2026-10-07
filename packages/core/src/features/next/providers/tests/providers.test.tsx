// @module-tag unit
import { useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFNuqsAdapter } from "../aof-nuqs-adapter";
import { AOFQueryClientProvider } from "../aof-query-client-provider";
import { AOFReactQueryDevtools } from "../aof-react-query-devtools";
import { AOFThemeProvider } from "../aof-theme-provider";

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
