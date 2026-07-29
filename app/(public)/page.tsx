import { headers } from "next/headers";
import { listNotes } from "@/backend/notes";
import { getLatestGithubActivity } from "@/backend/github";
import { getNationalE10Price } from "@/backend/fuel";
import { listPublishedMilestones } from "@/backend/cv/milestones";
import { getPublicSiteSettings } from "@/backend/settings";
import { detectLocale } from "@/frontend/i18n/landing";
import { LandingPage } from "./landing-page";

export default async function HomePage() {
  const headerList = await headers();
  const [notes, github, settings, fuel, milestones] = await Promise.all([
    listNotes(),
    getLatestGithubActivity(),
    getPublicSiteSettings(),
    getNationalE10Price(),
    listPublishedMilestones().catch(() => []),
  ]);

  return (
    <LandingPage
      initialLocale={detectLocale(headerList.get("accept-language"))}
      notes={notes.slice(0, 3)}
      github={github}
      relationshipStatus={settings.relationshipStatus}
      singleSince={settings.singleSince}
      fuel={fuel}
      milestones={milestones}
    />
  );
}
