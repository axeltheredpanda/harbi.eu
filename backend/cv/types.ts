import type { Database } from "@/backend/supabase/types";

export type CvMilestone = Database["public"]["Tables"]["cv_milestones"]["Row"];

/** English-only editor shape — FR DB columns are mirrored on write. */
export type CvMilestoneInput = {
  period: string;
  title: string;
  place: string;
  summary: string;
  published?: boolean;
};

export const CV_MILESTONES_BUCKET = "cv-milestones";
