import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/backend/supabase/server";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";
import { CommandPaletteLazy } from "./command-palette-lazy";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 py-4 sm:px-10">
        <div className="flex min-w-0 items-center gap-8">
          <Link
            href="/"
            className="font-display text-sm tracking-tight text-ink-muted transition-colors hover:text-ink"
          >
            harbi.eu
          </Link>
          <NavLinks />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[11px] text-ink-faint sm:inline">
            Ctrl+K
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto flex min-h-0 w-full flex-1 flex-col px-6 py-10 sm:px-10">
        {children}
      </main>
      <CommandPaletteLazy />
    </div>
  );
}
