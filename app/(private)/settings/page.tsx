import { getPublicSiteSettings } from "@/backend/settings";
import { getClaudetteSettings } from "@/backend/claudette/settings";
import { listAllMilestones } from "@/backend/cv/milestones";
import { SettingsForm } from "./settings-form";
import { ClaudetteSettingsSection } from "./claudette-settings";
import { CvSettingsPanel } from "./cv-settings-panel";
import { SettingsShell } from "./settings-shell";

export default async function SettingsPage() {
  const [site, claudette, milestones] = await Promise.all([
    getPublicSiteSettings(),
    getClaudetteSettings(),
    listAllMilestones().catch(() => []),
  ]);

  return (
    <SettingsShell
      site={<SettingsForm initial={site} />}
      cv={<CvSettingsPanel initial={milestones} />}
      claudette={<ClaudetteSettingsSection initial={claudette} />}
    />
  );
}
