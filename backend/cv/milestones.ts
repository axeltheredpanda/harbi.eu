"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/backend/supabase/server";
import {
  CV_MILESTONES_BUCKET,
  type CvMilestone,
  type CvMilestoneInput,
} from "@/backend/cv/types";

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

function normalizeInput(input: CvMilestoneInput, mode: "draft" | "strict") {
  const period = input.period.trim() || (mode === "draft" ? "-" : "");
  const title = input.title.trim() || (mode === "draft" ? "New milestone" : "");
  const summary = input.summary.trim() || (mode === "draft" ? "…" : "");
  const place = input.place.trim();

  if (mode === "strict") {
    if (!period || period === "-") throw new Error("Add a period before publishing");
    if (!title || title === "New milestone") {
      throw new Error("A title is required to publish");
    }
    if (!summary || summary === "…") {
      throw new Error("A summary is required to publish");
    }
  }

  // Mirror into FR columns so existing NOT NULL / dual schema stays valid.
  return {
    period,
    title_fr: title,
    title_en: title,
    place_fr: place,
    place_en: place,
    summary_fr: summary,
    summary_en: summary,
  };
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
  input?: Partial<CvMilestoneInput>,
): Promise<CvMilestone> {
  const supabase = await requireUser();
  const row = normalizeInput(
    {
      period: input?.period ?? "",
      title: input?.title ?? "",
      place: input?.place ?? "",
      summary: input?.summary ?? "",
    },
    "draft",
  );

  const { data: last } = await supabase
    .from("cv_milestones")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (last?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("cv_milestones")
    .insert({ ...row, sort_order, published: false })
    .select("*")
    .single();

  if (error) throw error;
  revalidateCv();
  return data;
}

/** Autosave content without changing publish state. */
export async function saveMilestoneDraft(
  id: string,
  input: CvMilestoneInput,
): Promise<CvMilestone> {
  const supabase = await requireUser();
  const row = normalizeInput(input, "draft");

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

export async function updateMilestone(
  id: string,
  input: CvMilestoneInput,
): Promise<CvMilestone> {
  return saveMilestoneDraft(id, input);
}

export async function setMilestonePublished(
  id: string,
  published: boolean,
): Promise<CvMilestone> {
  const supabase = await requireUser();

  if (published) {
    const { data: existing, error: loadError } = await supabase
      .from("cv_milestones")
      .select("*")
      .eq("id", id)
      .single();
    if (loadError) throw loadError;
    normalizeInput(
      {
        period: existing.period,
        title: existing.title_en || existing.title_fr,
        place: existing.place_en || existing.place_fr,
        summary: existing.summary_en || existing.summary_fr,
      },
      "strict",
    );
  }

  const { data, error } = await supabase
    .from("cv_milestones")
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  revalidateCv();
  return data;
}

export async function deleteMilestone(id: string): Promise<void> {
  const supabase = await requireUser();

  const { data: existing } = await supabase
    .from("cv_milestones")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  if (existing?.image_path) {
    await supabase.storage
      .from(CV_MILESTONES_BUCKET)
      .remove([existing.image_path]);
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
    .from(CV_MILESTONES_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  if (existing.image_path) {
    await supabase.storage
      .from(CV_MILESTONES_BUCKET)
      .remove([existing.image_path]);
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
    await supabase.storage
      .from(CV_MILESTONES_BUCKET)
      .remove([existing.image_path]);
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
