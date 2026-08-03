import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/backend/supabase/server";
import { createServiceClient } from "@/backend/supabase/service";

/**
 * Jarvis tables may not yet be in generated Database types.
 * Narrow cast keeps call sites typed enough without blocking the build.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JarvisClient = SupabaseClient<any>;

export async function createJarvisClient(): Promise<JarvisClient> {
  return (await createClient()) as unknown as JarvisClient;
}

export function createJarvisServiceClient(): JarvisClient {
  return createServiceClient() as unknown as JarvisClient;
}
