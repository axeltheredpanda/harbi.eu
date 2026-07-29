"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/backend/supabase/server";
import type { Database } from "@/backend/supabase/types";

export type CvMilestone = Database["public"]["Tables"]["cv_milestones"]["Row"];

export type CvMilestoneInput = {
  period: string;
  titleFr: string;
  titleEn: string;
  placeFr: string;
  placeEn: string;
  summaryFr: string;
  summaryEn: string;
  published?: boolean;
};

const BUCKET = "cv-milestones";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

function revalidateCv() {
  revalidatePath("/");
  revalidatePath("/settings");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

function normalizeInput(input: CvMilestoneInput) {
  const period = input.period.trim();
  const titleFr = input.titleFr.trim();
  const titleEn = input.titleEn.trim();
  const summaryFr = input.summaryFr.trim();
  const summaryEn = input.summaryEn.trim();
  if (!period || !titleFr || !titleEn || !summaryFr || !summaryEn) {
    throw new Error("Period, titles, and summaries are required in FR and EN");
  }
  return {
    period,
    title_fr: titleFr,
    title_en: titleEn,
    place_fr: input.placeFr.trim(),
    place_en: input.placeEn.trim(),
    summary_fr: summaryFr,
    summary_en: summaryEn,
    published: Boolean(input.published),
  };
}

export function milestoneImageUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function listPublishedMilestones(): Promise<CvMilestone[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cv_milestones")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listAllMilestones(): Promise<CvMilestone[]> {
  const supabase = await requireUser();
  const { data, error } = await supabase
    .from("cv_milestones")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createMilestone(
  input: CvMilestoneInput,
): Promise<CvMilestone> {
  const supabase = await requireUser();
  const row = normalizeInput(input);

  const { data: last } = await supabase
    .from("cv_milestones")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (last?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("cv_milestones")
    .insert({ ...row, sort_order })
    .select("*")
    .single();

  if (error) throw error;
  revalidateCv();
  return data;
}

export async function updateMilestone(
  id: string,
  input: CvMilestoneInput,
): Promise<CvMilestone> {
  const supabase = await requireUser();
  const row = normalizeInput(input);

  const { data, error } = await supabase
    .from("cv_milestones")
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  revalidateCv();
  return data;
}

export async function setMilestonePublished(
  id: string,
  published: boolean,
): Promise<void> {
  const supabase = await requireUser();
  const { error } = await supabase
    .from("cv_milestones")
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidateCv();
}

export async function deleteMilestone(id: string): Promise<void> {
  const supabase = await requireUser();

  const { data: existing } = await supabase
    .from("cv_milestones")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  if (existing?.image_path) {
    await supabase.storage.from(BUCKET).remove([existing.image_path]);
  }

  const { error } = await supabase.from("cv_milestones").delete().eq("id", id);
  if (error) throw error;
  revalidateCv();
}

export async function reorderMilestones(ids: string[]): Promise<void> {
  const supabase = await requireUser();
  if (ids.length === 0) return;

  const updates = ids.map((id, index) =>
    supabase
      .from("cv_milestones")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  revalidateCv();
}

export async function uploadMilestoneImage(
  id: string,
  formData: FormData,
): Promise<CvMilestone> {
  const supabase = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Image file is required");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image too large (max 2 MB)");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use JPEG, PNG, WebP, or SVG");
  }

  const { data: existing, error: loadError } = await supabase
    .from("cv_milestones")
    .select("image_path")
    .eq("id", id)
    .single();
  if (loadError) throw loadError;

  const ext =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "svg";
  const path = `${id}/${crypto.randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  if (existing.image_path) {
    await supabase.storage.from(BUCKET).remove([existing.image_path]);
  }

  const { data, error } = await supabase
    .from("cv_milestones")
    .update({ image_path: path, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  revalidateCv();
  return data;
}

export async function clearMilestoneImage(id: string): Promise<CvMilestone> {
  const supabase = await requireUser();
  const { data: existing, error: loadError } = await supabase
    .from("cv_milestones")
    .select("image_path")
    .eq("id", id)
    .single();
  if (loadError) throw loadError;

  if (existing.image_path) {
    await supabase.storage.from(BUCKET).remove([existing.image_path]);
  }

  const { data, error } = await supabase
    .from("cv_milestones")
    .update({ image_path: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  revalidateCv();
  return data;
}
