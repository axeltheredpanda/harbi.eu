"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/backend/supabase/server";
import {
  EMPTY_PROFILE,
  normalizeProfile,
  type ClaudetteProfile,
  type ClaudetteSettings,
} from "@/backend/claudette/profile";

const DEFAULTS: ClaudetteSettings = {
  webSearchEnabled: true,
  profile: EMPTY_PROFILE,
};

export async function getClaudetteSettings(): Promise<ClaudetteSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULTS;

  const { data, error } = await supabase
    .from("claudette_settings")
    .select("web_search_enabled, profile")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return DEFAULTS;

  return {
    webSearchEnabled: data.web_search_enabled ?? true,
    profile: normalizeProfile(data.profile),
  };
}

export async function updateClaudetteSettings(input: {
  webSearchEnabled: boolean;
  profile: ClaudetteProfile;
}): Promise<ClaudetteSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const profile = normalizeProfile(input.profile);
  const payload = {
    user_id: user.id,
    web_search_enabled: Boolean(input.webSearchEnabled),
    profile,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("claudette_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("web_search_enabled, profile")
    .single();

  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/chat");

  return {
    webSearchEnabled: data.web_search_enabled,
    profile: normalizeProfile(data.profile),
  };
}
