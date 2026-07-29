import { CV_MILESTONES_BUCKET } from "@/backend/cv/types";

/** Public Storage URL for a milestone logo (safe on client + server). */
export function milestoneImageUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${CV_MILESTONES_BUCKET}/${path}`;
}
