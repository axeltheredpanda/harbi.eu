import { getPublicSiteSettings } from "@/backend/settings";
import { getClaudetteSettings } from "@/backend/claudette/settings";
import { listAllMilestones } from "@/backend/cv/milestones";
import { SettingsForm } from "./settings-form";
import { ClaudetteSettingsSection } from "./claudette-settings";
import { CvMilestonesSection } from "./cv-milestones-section";

export default async function SettingsPage() {
  const [site, claudette, milestones] = await Promise.all([
    getPublicSiteSettings(),
    getClaudetteSettings(),
    listAllMilestones().catch(() => []),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-2 pb-16">
      <SettingsForm initial={site} />
      <CvMilestonesSection initial={milestones} />
      <ClaudetteSettingsSection initial={claudette} />
    </div>
  );
}
