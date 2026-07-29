"use client";

import { Suspense } from "react";
import { NewsProvider } from "@/frontend/news/news-provider";
import { NewsDrawer } from "@/frontend/news/news-drawer";
import { SoftNavRefresh } from "@/frontend/navigation/soft-nav-refresh";

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
