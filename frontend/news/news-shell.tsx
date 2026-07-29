"use client";

import { NewsProvider } from "@/frontend/news/news-provider";
import { NewsDrawer } from "@/frontend/news/news-drawer";

export function NewsShell({ children }: { children: React.ReactNode }) {
  return (
    <NewsProvider>
      {children}
      <NewsDrawer />
    </NewsProvider>
  );
}
