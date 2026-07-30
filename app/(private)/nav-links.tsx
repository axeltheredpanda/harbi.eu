"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { openNewsDrawer } from "@/frontend/news/news-provider";

const links = [
  { href: "/chat", label: "/chat" },
  { href: "/cutout", label: "/cutout" },
  { href: "/convert", label: "/convert" },
  { href: "/analytics", label: "/analytics" },
  { href: "/settings", label: "/settings" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-5 font-mono text-sm">
      <button
        type="button"
        onClick={() => openNewsDrawer()}
        className="text-ink-muted hover:text-ink"
      >
        /news
      </button>
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive ? "text-accent" : "text-ink-muted hover:text-ink"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
