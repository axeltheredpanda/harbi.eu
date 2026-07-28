import { headers } from "next/headers";
import { listNotes } from "@/backend/notes";
import { getLatestGithubActivity } from "@/backend/github";
import { getPublicSiteSettings } from "@/backend/settings";
import { detectLocale } from "@/frontend/i18n/landing";
import { LandingPage } from "./landing-page";

export default async function HomePage() {
  const headerList = await headers();
  const notes = await listNotes();
  const github = await getLatestGithubActivity();
  const settings = await getPublicSiteSettings();

  return (
    <LandingPage
      initialLocale={detectLocale(headerList.get("accept-language"))}
      notes={notes.slice(0, 3)}
      github={github}
      relationshipStatus={settings.relationshipStatus}
      singleSince={settings.singleSince}
    />
  );
}
