import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Public_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteMotion } from "@/frontend/motion/site-motion";
import { ViewTransitionProvider } from "@/frontend/motion/view-transition-provider";
import { NewsShell } from "@/frontend/news/news-shell";
import "./globals.css";

/* Variable fonts (single file per family) — next/font preloads + font-display: swap */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  // Omit weight → variable font covering 100–900
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://harbi.eu"),
  title: {
    default: "harbi.eu",
    template: "%s · harbi.eu",
  },
  description:
    "Arthur Reichard - software from schema to screen. Portfolio, notes, and personal workspace at harbi.eu. Intern @ Rémy Cointreau (Digital Web & E-Commerce), ESSEC.",
  applicationName: "harbi.eu",
  authors: [{ name: "Arthur Reichard", url: "https://harbi.eu" }],
  creator: "Arthur Reichard",
  publisher: "Arthur Reichard",
  keywords: [
    "Arthur Reichard",
    "Arthur Reichard ESSEC",
    "Arthur Reichard portfolio",
    "harbi.eu",
    "Axel Project",
    "Rémy Cointreau",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    siteName: "harbi.eu",
    title: "Arthur Reichard - harbi.eu",
    description:
      "Portfolio and personal site of Arthur Reichard - software, notes, and Axel Project.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arthur Reichard - harbi.eu",
    description:
      "Portfolio and personal site of Arthur Reichard - software, notes, and Axel Project.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${publicSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-body antialiased">
        <SiteMotion />
        <ViewTransitionProvider>
          <NewsShell>{children}</NewsShell>
        </ViewTransitionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
