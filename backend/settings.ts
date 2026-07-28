"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/backend/supabase/server";
import type {
  RelationshipStatus,
  SiteSettings,
} from "@/backend/supabase/types";

const DEFAULTS: Pick<
  SiteSettings,
  "id" | "relationship_status" | "single_since"
> = {
  id: "default",
  relationship_status: "single",
  single_since: "2026-02-01",
};

export type PublicSiteSettings = {
  relationshipStatus: RelationshipStatus;
  singleSince: string;
};

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("relationship_status, single_since")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return {
      relationshipStatus: DEFAULTS.relationship_status,
      singleSince: DEFAULTS.single_since,
    };
  }

  return {
    relationshipStatus: data.relationship_status,
    singleSince: data.single_since,
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
    .select("relationship_status, single_since")
    .single();

  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/settings");

  return {
    relationshipStatus: data.relationship_status,
    singleSince: data.single_since,
  };
}
