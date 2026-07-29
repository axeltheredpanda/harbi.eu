"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/backend/supabase/server";
import { nowPlaying as nowPlayingDefaults } from "@/content/now-playing";
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

const SETTINGS_SELECT =
  "relationship_status, single_since, louis_joke_mode, now_playing_title, now_playing_artist, now_playing_url";

export type NowPlayingSettings = {
  title: string;
  artist: string;
  url: string;
};

export type PublicSiteSettings = {
  relationshipStatus: RelationshipStatus;
  singleSince: string;
  louisJokeMode: boolean;
  nowPlaying: NowPlayingSettings;
};

function mapNowPlaying(row: {
  now_playing_title?: string | null;
  now_playing_artist?: string | null;
  now_playing_url?: string | null;
} | null): NowPlayingSettings {
  const title = row?.now_playing_title?.trim();
  const artist = row?.now_playing_artist?.trim();
  const url = row?.now_playing_url?.trim();
  return {
    title: title || nowPlayingDefaults.title,
    artist: artist || nowPlayingDefaults.artist,
    url: url || nowPlayingDefaults.url,
  };
}

function mapSettings(row: {
  relationship_status: RelationshipStatus;
  single_since: string;
  louis_joke_mode?: boolean | null;
  now_playing_title?: string | null;
  now_playing_artist?: string | null;
  now_playing_url?: string | null;
}): PublicSiteSettings {
  return {
    relationshipStatus: row.relationship_status,
    singleSince: row.single_since,
    louisJokeMode: Boolean(row.louis_joke_mode),
    nowPlaying: mapNowPlaying(row),
  };
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select(SETTINGS_SELECT)
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return {
      relationshipStatus: DEFAULTS.relationship_status,
      singleSince: DEFAULTS.single_since,
      louisJokeMode: DEFAULTS.louis_joke_mode,
      nowPlaying: mapNowPlaying(null),
    };
  }

  return mapSettings(data);
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
    .select(SETTINGS_SELECT)
    .single();

  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/login");

  return mapSettings(data);
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
    .select(SETTINGS_SELECT)
    .single();

  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/login");
  revalidatePath("/chat");

  return mapSettings(data);
}

export async function updateNowPlayingSettings(input: {
  title: string;
  artist: string;
  url: string;
}): Promise<PublicSiteSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const title = input.title.trim().slice(0, 120);
  const artist = input.artist.trim().slice(0, 120);
  let url = input.url.trim().slice(0, 500);
  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .update({
      now_playing_title: title || null,
      now_playing_artist: artist || null,
      now_playing_url: url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default")
    .select(SETTINGS_SELECT)
    .single();

  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/settings");

  return mapSettings(data);
}
