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

export const CV_MILESTONES_BUCKET = "cv-milestones";
