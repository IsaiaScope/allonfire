import { Providers } from "@allonfire/auth/components/providers";
import { Wrapper } from "@allonfire/ui/components/wrapper";
import type { Metadata, Viewport } from "next";
import { Fira_Code, Oxanium } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MotionProvider } from "@/components/motion-provider";
import { routing } from "@/i18n/routing";
import "../globals.css";

const fontSans = Oxanium({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("title"),
    description: t("description"),
    appleWebApp: {
      capable: true,
      title: "Laura",
      statusBarStyle: "black-translucent",
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#37302a",
  colorScheme: "dark",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning translate="no">
      <body
        className={`${fontSans.variable} ${fontMono.variable} flex h-dvh flex-col overflow-hidden bg-background font-sans antialiased`}
      >
        <NextIntlClientProvider>
          <Providers>
            <MotionProvider>
              <Wrapper className="flex min-h-0 flex-1 flex-col" tag="div">
                {children}
              </Wrapper>
            </MotionProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
