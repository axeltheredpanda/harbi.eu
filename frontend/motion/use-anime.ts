import anime from "animejs";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";

export type AnimeParams = Parameters<typeof anime>[0];
export type AnimeInstance = ReturnType<typeof anime>;

/** Run anime.js only when motion is allowed; callers handle the instant state. */
export function animate(params: AnimeParams): AnimeInstance | null {
  if (prefersReducedMotion()) return null;
  return anime(params);
}

export { anime };
