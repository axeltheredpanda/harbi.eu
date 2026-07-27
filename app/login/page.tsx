"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/frontend/supabase/client";
import { buttonClass } from "@/frontend/components/button-variants";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    window.location.href = "/todo";
  }

  async function handleMagicLink() {
    if (!email) {
      setStatus("Enter your email first.");
      return;
    }
    setLoading(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    setStatus(error ? error.message : "Check your email for the magic link.");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className="font-display text-sm tracking-tight text-ink-muted transition-colors hover:text-ink"
        >
          ← harbi.eu
        </Link>
        <p className="mt-6 text-sm tracking-wide text-ink-faint">Sign in</p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
          Welcome back
        </h1>
      </div>

      <form onSubmit={handlePasswordLogin} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
        <button type="submit" disabled={loading} className={buttonClass("primary")}>
          Sign in
        </button>
      </form>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={loading}
        className="self-start font-mono text-sm text-ink-muted underline underline-offset-4 hover:text-ink disabled:pointer-events-none disabled:opacity-50"
      >
        Send magic link instead
      </button>

      {status && <p className="font-mono text-sm text-ink-muted">{status}</p>}
    </main>
  );
}
