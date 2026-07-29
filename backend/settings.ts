"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/backend/supabase/server";
import type {
  RelationshipStatus,
  SiteSettings,
} from "@/backend/supabase/types";

const DEFAULTS: Pick<
  SiteSettings,
  "id" | "relationship_status" | "single_since" | "louis_joke_mode"
> = {
  id: "default",
  relationship_status: "single",
  single_since: "2026-02-01",
  louis_joke_mode: false,
};

export type PublicSiteSettings = {
  relationshipStatus: RelationshipStatus;
  singleSince: string;
  louisJokeMode: boolean;
};

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("relationship_status, single_since, louis_joke_mode")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return {
      relationshipStatus: DEFAULTS.relationship_status,
      singleSince: DEFAULTS.single_since,
      louisJokeMode: DEFAULTS.louis_joke_mode,
    };
  }

  return {
    relationshipStatus: data.relationship_status,
    singleSince: data.single_since,
    louisJokeMode: Boolean(data.louis_joke_mode),
  };
}

export async function updateRelationshipSettings(input: {
  relationshipStatus: RelationshipStatus;
  singleSince: string;
}): Promise<PublicSiteSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (
    input.relationshipStatus !== "single" &&
    input.relationshipStatus !== "dating"
  ) {
    throw new Error("Invalid relationship status");
  }

  const singleSince =
    /^\d{4}-\d{2}-\d{2}$/.test(input.singleSince.trim())
      ? input.singleSince.trim()
      : DEFAULTS.single_since;

  const payload = {
    id: "default" as const,
    relationship_status: input.relationshipStatus,
    single_since: singleSince,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("site_settings")
    .upsert(payload, { onConflict: "id" })
    .select("relationship_status, single_since, louis_joke_mode")
    .single();

  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/login");

  return {
    relationshipStatus: data.relationship_status,
    singleSince: data.single_since,
    louisJokeMode: Boolean(data.louis_joke_mode),
  };
}

export async function updateLouisJokeMode(
  enabled: boolean,
): Promise<PublicSiteSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("site_settings")
    .update({
      louis_joke_mode: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default")
    .select("relationship_status, single_since, louis_joke_mode")
    .single();

  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/login");
  revalidatePath("/chat");

  return {
    relationshipStatus: data.relationship_status,
    singleSince: data.single_since,
    louisJokeMode: Boolean(data.louis_joke_mode),
  };
}
