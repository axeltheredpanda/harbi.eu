"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";

function sameOriginPath(href: string): string | null {
  try {
    if (href.startsWith("#")) return null;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return null;
    if (href.startsWith("http://") || href.startsWith("https://")) {
      const url = new URL(href);
      if (url.origin !== window.location.origin) return null;
      return `${url.pathname}${url.search}${url.hash}`;
    }
    if (href.startsWith("/")) return href;
    return null;
  } catch {
    return null;
  }
}

/**
 * Site-wide page-turn: intercepts same-origin <Link>/<a> clicks and wraps
 * the soft navigation in the browser View Transitions API when available.
 */
export function ViewTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (prefersReducedMotion()) return;
      if (typeof document.startViewTransition !== "function") return;

      const target = (event.target as Element | null)?.closest("a[href]");
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.target && target.target !== "_self") return;
      if (target.hasAttribute("download")) return;
      if (target.dataset.noVt === "1") return;

      const path = sameOriginPath(target.getAttribute("href") ?? "");
      if (!path) return;

      const nextUrl = new URL(path, window.location.origin);
      const current = new URL(window.location.href);
      if (
        nextUrl.pathname === current.pathname &&
        nextUrl.search === current.search
      ) {
        return; // hash-only or same page
      }

      event.preventDefault();
      event.stopPropagation();

      const goingDeeper =
        nextUrl.pathname.split("/").filter(Boolean).length >=
        current.pathname.split("/").filter(Boolean).length;
      document.documentElement.dataset.navDir = goingDeeper
        ? "forward"
        : "back";

      document.startViewTransition(() => {
        router.push(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      });
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return <>{children}</>;
}
