"use client";

import { createClient } from "@/frontend/supabase/client";
import { buttonClass } from "@/frontend/components/button-variants";

export function SignOutButton() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button type="button" onClick={handleSignOut} className={buttonClass("ghost")}>
      Sign out
    </button>
  );
}
