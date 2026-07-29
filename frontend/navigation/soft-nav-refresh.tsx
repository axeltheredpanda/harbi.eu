"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Session memory of routes we've already rendered. Returning to one paints
 * from the Next.js client router cache (see experimental.staleTimes), then
 * this triggers a background RSC refresh so data catches up without a blank wait.
 */
const seenRoutes = new Set<string>();

export function SoftNavRefresh() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    if (seenRoutes.has(routeKey)) {
      router.refresh();
      return;
    }
    seenRoutes.add(routeKey);
  }, [routeKey, router]);

  return null;
}
