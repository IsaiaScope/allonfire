// @module-tag unit
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFLocaleDocument } from "../components/aof-locale-document";

// The providers read the request and the browser: this file checks what the
// document puts together, so each one only passes its children through.
vi.mock("next-intl", () => ({
  NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock(
  "@allonfire/core/features/next/providers/components/aof-nuqs-adapter",
  () => ({
    AOFNuqsAdapter: ({ children }: { children: ReactNode }) => children,
  })
);
vi.mock(
  "@allonfire/core/features/next/providers/components/aof-theme-provider",
  () => ({
    AOFThemeProvider: ({ children }: { children: ReactNode }) => children,
  })
);
vi.mock("../../query/components/aof-query-provider", () => ({
  AOFQueryProvider: ({ children }: { children: ReactNode }) => children,
}));
/** The PWA wraps the page and holds the App's hint and banner beside it. */
vi.mock("@allonfire/core/features/next/pwa/components/aof-pwa", () => ({
  AOFPwa: ({
    banner,
    children,
    enabled,
    hint,
  }: {
    banner: ReactNode;
    children: ReactNode;
    enabled: boolean;
    hint: ReactNode;
  }) => (
    <section data-pwa={String(enabled)}>
      {children}
      {hint}
      {banner}
    </section>
  ),
}));

const PAGE_IN_PWA = /<section data-pwa="false"><p>PAGE<\/p>/;
const ARIA_HIDDEN = /aria-hidden="true"/g;
const document = (pwaEnabled?: boolean) =>
  renderToStaticMarkup(
    <AOFLocaleDocument
      banner={<i>BANNER</i>}
      hint={<u>HINT</u>}
      locale="it"
      {...(pwaEnabled === undefined ? {} : { pwaEnabled })}
      toaster={<s>TOASTER</s>}
    >
      <p>PAGE</p>
    </AOFLocaleDocument>
  );

describe("AOFLocaleDocument", () => {
  it("is the page's document in the visitor's language, left untranslated by the browser", () => {
    const html = document();
    expect(html).toContain('<html lang="it"');
    expect(html).toContain('translate="no"');
  });

  it("draws the App's toaster, hint and banner", () => {
    const html = document();
    for (const part of ["TOASTER", "HINT", "BANNER"]) {
      expect(html).toContain(part);
    }
  });

  it("keeps the page inside the PWA, which is told whether it is on", () => {
    expect(document()).toMatch(PAGE_IN_PWA);
    expect(document(true)).toContain('data-pwa="true"');
  });

  it("turns the PWA on in a production build and off elsewhere when the App does not say", async () => {
    expect(document()).toContain('data-pwa="false"');
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    try {
      const { AOFLocaleDocument: Production } = await import(
        "../components/aof-locale-document"
      );
      expect(
        renderToStaticMarkup(
          <Production
            banner={<i>BANNER</i>}
            hint={<u>HINT</u>}
            locale="it"
            toaster={<s>TOASTER</s>}
          >
            <p>PAGE</p>
          </Production>
        )
      ).toContain('data-pwa="true"');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("mounts the edge tint once itself, so no App adds its own", () => {
    expect(document().match(ARIA_HIDDEN)).toHaveLength(1);
  });
});
