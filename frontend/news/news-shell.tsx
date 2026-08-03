"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { NewsProvider } from "@/frontend/news/news-provider";
import { SoftNavRefresh } from "@/frontend/navigation/soft-nav-refresh";

/** Heavy drawer UI — only load when first opened (keeps public landing lean). */
const NewsDrawer = dynamic(
  () =>
    import("@/frontend/news/news-drawer").then((m) => ({
      default: m.NewsDrawer,
    })),
  { ssr: false, loading: () => null },
);

export function NewsShell({ children }: { children: React.ReactNode }) {
  return (
    <NewsProvider>
      <Suspense fallback={null}>
        <SoftNavRefresh />
      </Suspense>
      {children}
      <NewsDrawer />
    </NewsProvider>
  );
}
