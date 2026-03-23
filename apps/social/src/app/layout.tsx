import { Wrapper } from "@allonfire/ui/components/wrapper";
import type { Metadata, Viewport } from "next";
import { Poppins, Roboto_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const fontSans = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const fontMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AllOnFire — Social Content Dashboard",
  description: "Automated social media content creation and publishing",
  appleWebApp: {
    capable: true,
    title: "AllOnFire",
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
  viewportFit: "cover",
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
