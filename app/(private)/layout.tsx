import { redirect } from "next/navigation";
import { createClient } from "@/backend/supabase/server";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

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
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4 sm:px-10">
        <div className="flex items-center gap-8">
          <span className="font-mono text-sm text-ink-muted">
            <span className="text-accent">~/</span>harbi.eu
          </span>
          <NavLinks />
        </div>
        <SignOutButton />
      </header>
      <main className="mx-auto flex min-h-0 w-full flex-1 flex-col px-6 py-10 sm:px-10">
        {children}
      </main>
    </div>
  );
}
