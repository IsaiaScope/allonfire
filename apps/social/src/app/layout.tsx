import { Wrapper } from "@allonfire/ui/components/wrapper";
import type { Metadata, Viewport } from "next";
import { Poppins, Roboto_Mono } from "next/font/google";
import { AppleSplashLinks } from "@/components/apple-splash-links";
import { Providers } from "@/components/providers";
import "./globals.css";

const fontSans = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3100"),
  title: {
    default: "Social — Content Dashboard",
    template: "%s | Social",
  },
  description: "Automated social media content creation and publishing",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Social",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon-180x180.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Social",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#151515",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <AppleSplashLinks />
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} flex h-dvh flex-col overflow-hidden bg-background font-sans antialiased`}
      >
        <Providers>
          <Wrapper className="flex flex-1 flex-col" tag="div">
            {children}
          </Wrapper>
        </Providers>
      </body>
    </html>
  );
}
