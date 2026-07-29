import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Public_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteMotion } from "@/frontend/motion/site-motion";
import { NewsShell } from "@/frontend/news/news-shell";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
  adjustFontFallback: true,
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://harbi.eu"),
  title: {
    default: "Arthur Reichard - harbi.eu",
    template: "%s · Arthur Reichard",
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
        <NewsShell>{children}</NewsShell>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
