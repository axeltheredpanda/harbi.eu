import { type NextRequest } from "next/server";
import { updateSession } from "@/backend/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run auth session refresh on app routes, but skip SEO endpoints and
     * static assets so Googlebot can fetch sitemap/robots without Supabase.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
