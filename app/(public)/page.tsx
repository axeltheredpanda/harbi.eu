import type { Metadata } from "next";
import { listNotes } from "@/backend/notes";
import { getLatestGithubActivity } from "@/backend/github";
import { getNationalE10Price } from "@/backend/fuel";
import { listPublishedMilestones } from "@/backend/cv/milestones";
import { getPublicSiteSettings } from "@/backend/settings";
import { personJsonLd } from "@/frontend/seo/person-json-ld";
import { LandingPage } from "./landing-page";

export const metadata: Metadata = {
  title: {
    absolute: "harbi.eu",
  },
  description:
    "Arthur Reichard - Digital Web & E-Commerce Officer (intern) at Rémy Cointreau. ESSEC. Builder of Axel Project and harbi.eu.",
  alternates: { canonical: "/" },
};

function shortCommitSha(): string | null {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (!sha) return null;
  return sha.slice(0, 7);
}

function buildDateLabel(): string {
  const raw = process.env.BUILD_TIME ?? new Date().toISOString();
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) {
    return new Date().toISOString().slice(0, 10);
  }
  return new Date(parsed).toISOString().slice(0, 10);
}

export default async function HomePage() {
  const [notes, github, settings, fuel, milestones] = await Promise.all([
    listNotes(),
    getLatestGithubActivity(),
    getPublicSiteSettings(),
    getNationalE10Price(),
    listPublishedMilestones().catch(() => []),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd()),
        }}
      />
      <LandingPage
        notes={notes.slice(0, 3)}
        github={github}
        relationshipStatus={settings.relationshipStatus}
        singleSince={settings.singleSince}
        fuel={fuel}
        milestones={milestones}
        nowPlaying={settings.nowPlaying}
        commitSha={shortCommitSha()}
        buildDate={buildDateLabel()}
      />
    </>
  );
}
